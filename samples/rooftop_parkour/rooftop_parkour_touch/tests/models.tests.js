QUnit.module("centerOnFootprint and pieceWeight", () => {
  QUnit.test("moves the middle of the footprint to the origin", (assert) => {
    const move = centerOnFootprint({ x: -5, y: 0, z: -12 }, { x: 7, y: 17, z: 2 });
    assert.strictEqual(move.x, -1);
    assert.strictEqual(move.z, 5);
  });

  QUnit.test("a piece that is already centred isn't moved", (assert) => {
    const move = centerOnFootprint({ x: -3, y: -0.15, z: -9 }, { x: 3, y: 0, z: 9 });
    assert.deepEqual([Math.abs(move.x), Math.abs(move.z)], [0, 0]);
  });

  QUnit.test("height is left alone", (assert) => {
    assert.strictEqual(centerOnFootprint({ x: 0, y: -3.3, z: 0 }, { x: 1, y: 3, z: 1 }).y, undefined);
  });

  QUnit.test("a file counts for its size, and a file that isn't in the list counts for 100", (assert) => {
    assert.strictEqual(pieceWeight("Building_Large_1"), PIECE_KB.Building_Large_1);
    assert.strictEqual(pieceWeight("Something_Else"), 100);
  });

  QUnit.test("every building and street of the plan has a weight of its own", (assert) => {
    for (const file of piecesUsed()) assert.true(file in PIECE_KB, file);
  });
});

QUnit.module("tidyMaterial", () => {
  const fake = (name) => {
    const texture = { anisotropicFilteringLevel: 1 };
    return { name, texture, forceDepthWrite: undefined, getActiveTextures: () => [texture] };
  };

  QUnit.test("every texture is filtered for slanting views", (assert) => {
    const material = fake("MI_RedBrick");
    tidyMaterial(material);
    assert.strictEqual(material.texture.anisotropicFilteringLevel, ANISOTROPY);
  });

  QUnit.test("glass is made as see-through as GLASS_ALPHA says, and doesn't write depth; nothing else is changed", (assert) => {
    const glass = fake("MI_Glass");
    const brick = fake("MI_RedBrick");
    tidyMaterial(glass);
    tidyMaterial(brick);
    assert.strictEqual(glass.alpha, GLASS_ALPHA);
    assert.false(glass.forceDepthWrite);
    assert.strictEqual(brick.forceDepthWrite, undefined);
    assert.strictEqual(brick.alpha, undefined);
  });

  QUnit.test("a mesh with no material, or a material that can't list its textures, is left alone", (assert) => {
    tidyMaterial(null);
    tidyMaterial({ name: "MI_Glass" });
    assert.true(true);
  });
});

// PieceLibrary asks Babylon.js to load files, which needs a file to load, so these tests give it a stand-in for the loader and put the
// real one back afterwards, whatever happens.
QUnit.module("PieceLibrary", (hooks) => {
  let engine;
  let scene;
  let realImport;
  let requests;

  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    requests = [];
    realImport = BABYLON.SceneLoader.ImportMeshAsync;
    BABYLON.SceneLoader.ImportMeshAsync = async (names, root, file, sceneArg, onProgress) => {
      requests.push({ root, file });
      if (onProgress) {
        onProgress({ lengthComputable: true, loaded: 50, total: 100 });
        onProgress({ lengthComputable: true, loaded: 100, total: 100 });
      }
      const mesh = BABYLON.MeshBuilder.CreateBox(file, { width: 12, height: 17, depth: 14 }, sceneArg);
      mesh.position.set(1, 8.5, -5); // a piece whose footprint isn't centred on the origin
      return { meshes: [mesh] };
    };
  });

  hooks.afterEach(() => {
    BABYLON.SceneLoader.ImportMeshAsync = realImport;
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("loads each piece once, however many times it is asked for", async (assert) => {
    const library = new PieceLibrary(scene, { baseUrl: "city/" });
    await library.load(["Building_Small_1", "Street_4Lane", "Building_Small_1"]);
    await library.load(["Building_Small_1"]);
    assert.deepEqual(requests.map((r) => r.file).sort(), ["Building_Small_1.glb", "Street_4Lane.glb"]);
    assert.true(requests.every((r) => r.root === "city/"));
  });

  QUnit.test("the template has the middle of its footprint at the origin, and is never drawn", async (assert) => {
    const library = new PieceLibrary(scene);
    await library.load(["Building_Small_1"]);
    const template = library.templates.get("Building_Small_1");
    const bounds = template.getHierarchyBoundingVectors(true);
    assert.true(Math.abs((bounds.min.x + bounds.max.x) / 2) < 1e-6);
    assert.true(Math.abs((bounds.min.z + bounds.max.z) / 2) < 1e-6);
    assert.false(template.isEnabled());
  });

  QUnit.test("place makes a copy where it is asked and turned as it is asked, and the template stays hidden", async (assert) => {
    const library = new PieceLibrary(scene);
    await library.load(["Building_Small_1"]);
    const copy = library.place("Building_Small_1", { x: 10, z: -20, rotationY: Math.PI });
    assert.deepEqual([copy.position.x, copy.position.y, copy.position.z], [10, 0, -20]);
    assert.strictEqual(copy.rotation.y, Math.PI);
    assert.false(library.templates.get("Building_Small_1").isEnabled());
  });

  QUnit.test("place of a piece that was never loaded says so", (assert) => {
    const library = new PieceLibrary(scene);
    assert.throws(() => library.place("Nothing"), /hasn't been loaded/);
  });

  QUnit.test("the loading screen is told about each piece, how far it has got, and when it is done", async (assert) => {
    const progress = new LoadProgress();
    const library = new PieceLibrary(scene, { progress });
    await library.load(["Building_Small_1", "Street_4Lane"]);
    assert.true(progress.done);
    assert.strictEqual(progress.fraction, 1);
    assert.strictEqual(progress.items.get("Building_Small_1").weight, PIECE_KB.Building_Small_1);
  });

  QUnit.test("progress goes up in steps as the file arrives, and a file that can't tell its size adds nothing until it is done", async (assert) => {
    const progress = new LoadProgress();
    const seen = [];
    progress.onChange((p) => seen.push(Number(p.fraction.toFixed(2))));
    BABYLON.SceneLoader.ImportMeshAsync = async (names, root, file, sceneArg, onProgress) => {
      onProgress({ lengthComputable: false, loaded: 10, total: 0 });
      return { meshes: [BABYLON.MeshBuilder.CreateBox(file, {}, sceneArg)] };
    };
    const library = new PieceLibrary(scene, { progress });
    await library.load(["Street_4Lane"]);
    assert.deepEqual(seen, [0, 1]);
  });
});
