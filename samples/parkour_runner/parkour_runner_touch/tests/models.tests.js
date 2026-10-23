QUnit.module("centerOnGround", () => {
  const near = (assert, actual, expected, message) =>
    assert.true(Math.abs(actual - expected) < 1e-9, message || `expected ${actual} to be close to ${expected}`);

  QUnit.test("moves the middle of the footprint to the origin", (assert) => {
    // A box running 2..4 in x and 10..14 in z: the middle is (3, 12).
    const offset = centerOnGround({ x: 2, y: 0, z: 10 }, { x: 4, y: 5, z: 14 }, 1);

    near(assert, offset.x, -3);
    near(assert, offset.z, -12);
  });

  QUnit.test("rests the bottom of the piece on the ground, whatever its height", (assert) => {
    const offset = centerOnGround({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 2, z: 1 }, 1);

    near(assert, offset.y, -0.5);
  });

  QUnit.test("a piece that is already centered on the ground isn't moved", (assert) => {
    const offset = centerOnGround({ x: -1, y: 0, z: -2 }, { x: 1, y: 3, z: 2 }, 1);

    near(assert, offset.x, 0);
    near(assert, offset.y, 0);
    near(assert, offset.z, 0);
  });

  QUnit.test("the offset is in scaled units, so it works after the piece is scaled", (assert) => {
    // Middle at (3, 12) and bottom at y = 0.5, scaled by 2: the piece is moved by double.
    const offset = centerOnGround({ x: 2, y: 0.5, z: 10 }, { x: 4, y: 5, z: 14 }, 2);

    near(assert, offset.x, -6);
    near(assert, offset.y, -1);
    near(assert, offset.z, -24);
  });

  QUnit.test("a piece that sinks below the ground is lifted onto it", (assert) => {
    const offset = centerOnGround({ x: 0, y: -0.25, z: 0 }, { x: 1, y: 1, z: 1 }, 1);

    near(assert, offset.y, 0.25);
  });
});

QUnit.module("PieceLibrary", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeVector3 {
    constructor(x = 0, y = 0, z = 0) {
      Object.assign(this, { x, y, z });
    }
    scaleInPlace(k) {
      this.x *= k;
      this.y *= k;
      this.z *= k;
    }
  }

  class FakeTransformNode {
    position = new FakeVector3();
    rotation = new FakeVector3();
    scaling = new FakeVector3(1, 1, 1);
    enabled = true;
    copiedFrom = null;

    constructor(name, scene) {
      Object.assign(this, { name, scene });
    }
    setEnabled(value) {
      this.enabled = value;
    }
    instantiateHierarchy(parent) {
      const copy = new FakeTransformNode(this.name + " copy", this.scene);
      copy.copiedFrom = this;
      copy.parent = parent;
      return copy;
    }
  }

  let imports; // what the fake loader was asked for, in order
  let roots; // the fake root mesh handed back for each file name

  hooks.beforeEach(() => {
    imports = [];
    roots = {};
    globalScope.BABYLON = {
      TransformNode: FakeTransformNode,
      SceneLoader: {
        ImportMeshAsync: async (names, rootUrl, filename, scene) => {
          imports.push({ names, rootUrl, filename, scene });
          const root = {
            scaling: new FakeVector3(1, 1, -1), // the real loader mirrors its root, for glTF's handedness
            position: new FakeVector3(),
            parent: null,
            // A box from (0, 1, 10) to (2, 3, 14): its middle is (1, ?, 12) and its bottom is at y = 1.
            getHierarchyBoundingVectors: () => ({ min: { x: 0, y: 1, z: 10 }, max: { x: 2, y: 3, z: 14 } }),
          };
          roots[filename] = root;
          return { meshes: [root, {}] };
        },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("splits a piece name into a folder and a file for the loader", async (assert) => {
    const library = new PieceLibrary({}, { baseUrl: "../assets/" });

    await library.load(["commercial/building-a"]);

    assert.strictEqual(imports[0].rootUrl, "../assets/commercial/");
    assert.strictEqual(imports[0].filename, "building-a.glb");
  });

  QUnit.test("loads into the scene it is given", async (assert) => {
    const scene = { id: "the scene" };

    await new PieceLibrary(scene).load(["roads/road_straight"]);

    assert.strictEqual(imports[0].scene, scene);
  });

  QUnit.test("loads every piece it is asked for", async (assert) => {
    const library = new PieceLibrary({});

    await library.load(["a/one", "a/two", "b/three"]);

    assert.strictEqual(imports.length, 3);
    assert.true(library.templates.has("a/one") && library.templates.has("a/two") && library.templates.has("b/three"));
  });

  QUnit.test("loads a piece only once, however many times it is asked for", async (assert) => {
    const library = new PieceLibrary({});

    await library.load(["a/one", "a/one"]);
    await library.load(["a/one"]);

    assert.strictEqual(imports.length, 1);
  });

  QUnit.test("scales the loaded root by the library's scale, keeping its mirroring", async (assert) => {
    await new PieceLibrary({}, { scale: 7 }).load(["a/one"]);

    assert.strictEqual(roots["one.glb"].scaling.x, 7);
    assert.strictEqual(roots["one.glb"].scaling.y, 7);
    assert.strictEqual(roots["one.glb"].scaling.z, -7, "still flipped in z");
  });

  QUnit.test("moves the loaded root so the piece is centered on the ground at its origin", async (assert) => {
    await new PieceLibrary({}, { scale: 2 }).load(["a/one"]);

    // Middle (1, 12), bottom y = 1, scale 2.
    assert.strictEqual(roots["one.glb"].position.x, -2);
    assert.strictEqual(roots["one.glb"].position.y, -2);
    assert.strictEqual(roots["one.glb"].position.z, -24);
  });

  QUnit.test("hangs the loaded root from a hidden template", async (assert) => {
    const library = new PieceLibrary({});

    await library.load(["a/one"]);
    const template = library.templates.get("a/one");

    assert.ok(template instanceof FakeTransformNode);
    assert.strictEqual(roots["one.glb"].parent, template);
    assert.false(template.enabled, "the template is never drawn");
  });

  QUnit.test("place() makes a copy of the template, not the template itself", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one");

    assert.strictEqual(copy.copiedFrom, library.templates.get("a/one"));
    assert.true(copy.enabled, "the copy is drawn");
  });

  QUnit.test("place() puts the copy where it is told, and turns it", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one", { x: 3, y: 0.5, z: -8, rotationY: 1.5 });

    assert.strictEqual(copy.position.x, 3);
    assert.strictEqual(copy.position.y, 0.5);
    assert.strictEqual(copy.position.z, -8);
    assert.strictEqual(copy.rotation.y, 1.5);
  });

  QUnit.test("place() defaults to the origin, facing the way the piece was made", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one");

    assert.strictEqual(copy.position.x, 0);
    assert.strictEqual(copy.position.y, 0);
    assert.strictEqual(copy.position.z, 0);
    assert.strictEqual(copy.rotation.y, 0);
  });

  QUnit.test("place() accepts a whole placement from the layout, extra fields and all", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one", { piece: "a/one", x: 1, z: 2, rotationY: 0.5 });

    assert.strictEqual(copy.position.x, 1);
    assert.strictEqual(copy.position.z, 2);
  });

  QUnit.test("each copy is its own node", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const first = library.place("a/one", { x: 1 });
    const second = library.place("a/one", { x: 2 });

    assert.notStrictEqual(first, second);
    assert.strictEqual(first.position.x, 1, "moving the second didn't move the first");
  });

  QUnit.test("moveTo() moves and turns a piece that is already in the world", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, scaling: { x: 1, y: 1, z: 1 } };

    library.moveTo(piece, { x: 3, y: 0.5, z: -8, rotationY: 1.5 });

    assert.strictEqual(piece.position.x, 3);
    assert.strictEqual(piece.position.y, 0.5);
    assert.strictEqual(piece.position.z, -8);
    assert.strictEqual(piece.rotation.y, 1.5);
  });

  QUnit.test("moveTo() with nothing given puts the piece back at the origin", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 3, y: 1, z: 9 }, rotation: { y: 2 }, scaling: { x: 2, y: 2, z: 2 } };

    library.moveTo(piece);

    assert.deepEqual(piece.position, { x: 0, y: 0, z: 0 });
    assert.strictEqual(piece.rotation.y, 0);
    assert.deepEqual(piece.scaling, { x: 1, y: 1, z: 1 }, "and its normal size");
  });

  QUnit.test("moveTo() sizes the piece by the scale it is given", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, scaling: { x: 1, y: 1, z: 1 } };

    library.moveTo(piece, { scale: { x: 0.4, y: 0.5, z: 1.5 } });

    assert.deepEqual(piece.scaling, { x: 0.4, y: 0.5, z: 1.5 });
  });

  QUnit.test("a piece that was stretched goes back to its normal size when it is moved without a scale", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, scaling: { x: 1, y: 1, z: 1 } };
    library.moveTo(piece, { scale: { x: 3, y: 3, z: 3 } });

    library.moveTo(piece, { x: 5 });

    assert.deepEqual(piece.scaling, { x: 1, y: 1, z: 1 });
  });

  QUnit.test("place() sizes the new copy too", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one", { scale: { x: 2, y: 3, z: 4 } });

    assert.strictEqual(copy.scaling.x, 2);
    assert.strictEqual(copy.scaling.y, 3);
    assert.strictEqual(copy.scaling.z, 4);
  });

  QUnit.test("place() refuses a piece that hasn't been loaded", (assert) => {
    const library = new PieceLibrary({});

    assert.throws(() => library.place("a/missing"), /hasn't been loaded/);
  });

  QUnit.test("a failed load is passed on to the caller", async (assert) => {
    globalScope.BABYLON.SceneLoader.ImportMeshAsync = async () => {
      throw new Error("404 not found");
    };

    try {
      await new PieceLibrary({}).load(["a/missing"]);
      assert.true(false, "should have thrown");
    } catch (error) {
      assert.strictEqual(error.message, "404 not found");
    }
  });
});

QUnit.module("loadCharacter", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeTransformNode {
    constructor(name, scene) {
      Object.assign(this, { name, scene });
    }
  }

  // A stand-in for an animation group: the loader starts the first one by itself.
  class FakeGroup {
    constructor(name) {
      this.name = name;
      this.playing = true;
      this.enableBlending = false;
      this.blendingSpeed = 0;
    }
    stop() {
      this.playing = false;
    }
  }

  let imported; // what the fake loader was asked for
  let root; // the fake root mesh the loader hands back
  let groups;

  hooks.beforeEach(() => {
    imported = null;
    root = { parent: null };
    groups = [new FakeGroup("Idle_Loop"), new FakeGroup("Sprint_Loop")];
    globalScope.BABYLON = {
      TransformNode: FakeTransformNode,
      SceneLoader: {
        ImportMeshAsync: async (names, rootUrl, filename, scene) => {
          imported = { names, rootUrl, filename, scene };
          return { meshes: [root, {}], animationGroups: groups };
        },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("splits the url into a folder and a file name for the loader", async (assert) => {
    await loadCharacter({}, "../assets/character/runner.glb");

    assert.strictEqual(imported.rootUrl, "../assets/character/");
    assert.strictEqual(imported.filename, "runner.glb");
  });

  QUnit.test("loads into the scene it is given", async (assert) => {
    const scene = { id: "the scene" };

    await loadCharacter(scene, "runner.glb");

    assert.strictEqual(imported.scene, scene);
  });

  QUnit.test("returns a node that wraps the loaded character", async (assert) => {
    const character = await loadCharacter({}, "runner.glb", { name: "runner" });

    assert.ok(character.root instanceof FakeTransformNode);
    assert.strictEqual(character.root.name, "runner");
    assert.strictEqual(root.parent, character.root, "the loaded root hangs from the wrapper");
  });

  QUnit.test("returns the clips by name", async (assert) => {
    const character = await loadCharacter({}, "runner.glb");

    assert.strictEqual(character.clips.size, 2);
    assert.strictEqual(character.clips.get("Idle_Loop"), groups[0]);
    assert.strictEqual(character.clips.get("Sprint_Loop"), groups[1]);
  });

  QUnit.test("stops every clip, because the loader starts one by itself", async (assert) => {
    await loadCharacter({}, "runner.glb");

    for (const group of groups) assert.false(group.playing, group.name);
  });

  QUnit.test("switches on blending for every clip, so changing clips fades", async (assert) => {
    await loadCharacter({}, "runner.glb");

    for (const group of groups) {
      assert.true(group.enableBlending, group.name);
      assert.strictEqual(group.blendingSpeed, CLIP_BLEND_SPEED, group.name);
    }
  });

  QUnit.test("a file with no clips gives an empty map", async (assert) => {
    groups = [];

    const character = await loadCharacter({}, "still.glb");

    assert.strictEqual(character.clips.size, 0);
  });

  QUnit.test("a failed load is passed on to the caller", async (assert) => {
    globalScope.BABYLON.SceneLoader.ImportMeshAsync = async () => {
      throw new Error("404 not found");
    };

    try {
      await loadCharacter({}, "missing.glb");
      assert.true(false, "should have thrown");
    } catch (error) {
      assert.strictEqual(error.message, "404 not found");
    }
  });
});
