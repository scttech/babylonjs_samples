QUnit.module("fitToSize", () => {
  const near = (assert, actual, expected, message) =>
    assert.true(Math.abs(actual - expected) < 1e-9, message || `expected ${actual} to be close to ${expected}`);

  QUnit.test("scales so the largest dimension becomes the requested size", (assert) => {
    // A box 2 wide, 6 tall, 4 deep: the 6 is the largest.
    const fit = fitToSize({ x: 0, y: 0, z: 0 }, { x: 2, y: 6, z: 4 }, 3);

    near(assert, fit.scale, 0.5);
  });

  QUnit.test("it scales up a model that is too small, too", (assert) => {
    const fit = fitToSize({ x: 0, y: 0, z: 0 }, { x: 0.1, y: 0.26, z: 0.1 }, 1.3);

    near(assert, fit.scale, 1.3 / 0.26);
  });

  QUnit.test("moves the center of the box to the origin", (assert) => {
    // The box runs 2..4 in x, 0..10 in y, -6..-2 in z: the center is (3, 5, -4).
    const fit = fitToSize({ x: 2, y: 0, z: -6 }, { x: 4, y: 10, z: -2 }, 10); // scale 1

    near(assert, fit.offset.x, -3);
    near(assert, fit.offset.y, -5);
    near(assert, fit.offset.z, 4);
  });

  QUnit.test("the offset is in scaled units, so it works after the model is scaled", (assert) => {
    // Center (0, 5, 0), scale 0.5: after scaling, the center is at (0, 2.5, 0).
    const fit = fitToSize({ x: -1, y: 0, z: -1 }, { x: 1, y: 10, z: 1 }, 5);

    near(assert, fit.scale, 0.5);
    near(assert, fit.offset.y, -2.5);
  });

  QUnit.test("a model that is already centered is only scaled", (assert) => {
    const fit = fitToSize({ x: -1, y: -1, z: -1 }, { x: 1, y: 1, z: 1 }, 4);

    near(assert, fit.scale, 2);
    near(assert, fit.offset.x, 0);
    near(assert, fit.offset.y, 0);
    near(assert, fit.offset.z, 0);
  });

  QUnit.test("an empty box can't be scaled, so it is left alone", (assert) => {
    const fit = fitToSize({ x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, 5);

    assert.strictEqual(fit.scale, 1);
  });
});

QUnit.module("loadModel", (hooks) => {
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
    rotation = { x: 0, y: 0, z: 0 };

    constructor(name, scene) {
      Object.assign(this, { name, scene });
    }
  }

  let imported; // what the fake loader was asked for
  let root; // the fake root mesh the loader hands back
  let materials;

  hooks.beforeEach(() => {
    imported = null;
    materials = [{ name: "shiny", metallic: 1 }, { name: "matte", metallic: 0.1 }, { name: "flat" }];
    root = {
      scaling: new FakeVector3(1, 1, -1), // the real loader mirrors its root, for glTF's handedness
      position: new FakeVector3(),
      parent: null,
      material: null,
      getHierarchyBoundingVectors: () => ({ min: { x: 0, y: 0, z: 0 }, max: { x: 2, y: 4, z: 2 } }),
    };
    globalScope.BABYLON = {
      TransformNode: FakeTransformNode,
      SceneLoader: {
        ImportMeshAsync: async (names, rootUrl, filename, scene) => {
          imported = { names, rootUrl, filename, scene };
          return { meshes: [root, ...materials.map((material) => ({ material }))] };
        },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("splits the url into a folder and a file name for the loader", async (assert) => {
    await loadModel({}, "../assets/ship.glb");

    assert.strictEqual(imported.rootUrl, "../assets/");
    assert.strictEqual(imported.filename, "ship.glb");
  });

  QUnit.test("a url with no folder works too", async (assert) => {
    await loadModel({}, "ship.glb");

    assert.strictEqual(imported.rootUrl, "");
    assert.strictEqual(imported.filename, "ship.glb");
  });

  QUnit.test("loads into the scene it is given", async (assert) => {
    const scene = { id: "the scene" };

    await loadModel(scene, "a.glb");

    assert.strictEqual(imported.scene, scene);
  });

  QUnit.test("returns a node that wraps the loaded model", async (assert) => {
    const wrapper = await loadModel({}, "a.glb", { name: "rocket" });

    assert.ok(wrapper instanceof FakeTransformNode);
    assert.strictEqual(wrapper.name, "rocket");
    assert.strictEqual(root.parent, wrapper, "the loaded root is parented to the wrapper");
  });

  QUnit.test("scales the loaded root to the requested size, keeping its mirroring", async (assert) => {
    await loadModel({}, "a.glb", { size: 8 }); // the box is 2 x 4 x 2, so the scale is 2

    assert.strictEqual(root.scaling.x, 2);
    assert.strictEqual(root.scaling.y, 2);
    assert.strictEqual(root.scaling.z, -2, "still flipped in z");
  });

  QUnit.test("moves the loaded root so the model is centered on the wrapper", async (assert) => {
    await loadModel({}, "a.glb", { size: 8 }); // center (1, 2, 1) times scale 2

    assert.strictEqual(root.position.x, -2);
    assert.strictEqual(root.position.y, -4);
    assert.strictEqual(root.position.z, -2);
  });

  QUnit.test("caps how metallic materials are, and leaves matte ones alone", async (assert) => {
    await loadModel({}, "a.glb", { maxMetallic: 0.3 });

    assert.strictEqual(materials[0].metallic, 0.3, "was fully metallic");
    assert.strictEqual(materials[1].metallic, 0.1, "was already under the cap");
    assert.strictEqual(materials[2].metallic, undefined, "has no metallic value at all");
  });

  QUnit.test("a failed load is passed on to the caller", async (assert) => {
    globalScope.BABYLON.SceneLoader.ImportMeshAsync = async () => {
      throw new Error("404 not found");
    };

    try {
      await loadModel({}, "missing.glb");
      assert.true(false, "should have thrown");
    } catch (error) {
      assert.strictEqual(error.message, "404 not found");
    }
  });

  QUnit.test("turns the wrapper by the rotation it is given", async (assert) => {
    const wrapper = await loadModel({}, "a.glb", { rotation: { x: 0.1, y: 0.2, z: 0.3 } });

    assert.strictEqual(wrapper.rotation.x, 0.1);
    assert.strictEqual(wrapper.rotation.y, 0.2);
    assert.strictEqual(wrapper.rotation.z, 0.3);
  });

  QUnit.test("without a rotation, the wrapper isn't turned", async (assert) => {
    const wrapper = await loadModel({}, "a.glb");

    assert.deepEqual(wrapper.rotation, { x: 0, y: 0, z: 0 });
  });
});
