// A box, given as its two corners.
const box = (min, max) => ({ min: { x: min[0], y: min[1], z: min[2] }, max: { x: max[0], y: max[1], z: max[2] } });

QUnit.module("sizeOf", () => {
  QUnit.test("is how far apart the corners are, along each axis", (assert) => {
    assert.deepEqual(sizeOf(box([-1, 2, 0], [3, 3, 5])), { x: 4, y: 1, z: 5 });
  });
});

QUnit.module("fitScale", () => {
  QUnit.test("makes the longer side of the ground the width asked for", (assert) => {
    assert.strictEqual(fitScale({ x: 4, y: 9, z: 2 }, 2), 0.5);
    assert.strictEqual(fitScale({ x: 2, y: 9, z: 4 }, 2), 0.5);
  });

  QUnit.test("does not look at the height, which can be anything", (assert) => {
    assert.strictEqual(fitScale({ x: 2, y: 100, z: 2 }, 4), 2);
  });

  QUnit.test("a model that is already the right width keeps its size", (assert) => {
    assert.strictEqual(fitScale({ x: 1.9, y: 0.2, z: 1.9 }, 1.9), 1);
  });
});

QUnit.module("topOffset and centerOffset", () => {
  QUnit.test("a model drawn around its middle is lifted by half its height, scaled", (assert) => {
    const bounds = box([-1, -0.1, -1], [1, 0.1, 1]);

    assert.strictEqual(topOffset(bounds, 1), -0.1);
    assert.strictEqual(topOffset(bounds, 10), -1);
  });

  QUnit.test("a model that stands on the ground, with its top high up, is moved down", (assert) => {
    assert.strictEqual(topOffset(box([-1, 0, -1], [1, 1.8, 1]), 1), -1.8);
  });

  QUnit.test("after the offset, the top is exactly at zero", (assert) => {
    const bounds = box([-1, -0.3, -1], [1, 0.7, 1]);
    const scale = 2.5;

    assert.true(Math.abs(bounds.max.y * scale + topOffset(bounds, scale)) < 1e-12);
  });

  QUnit.test("a model drawn off to one side is moved back to the middle, after it is scaled", (assert) => {
    const bounds = box([0, 0, -1], [4, 1, 1]);

    assert.deepEqual(centerOffset(bounds, 0.5), { x: -1, z: -0 });
  });

  QUnit.test("a model that is already in the middle is not moved", (assert) => {
    const offset = centerOffset(box([-2, 0, -3], [2, 1, 3]), 1);

    assert.strictEqual(offset.x + 0, 0);
    assert.strictEqual(offset.z + 0, 0);
  });
});

QUnit.module("real models", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a model loads into a container, and nothing is in the scene until it is asked for", async (assert) => {
    const container = await loadModel(scene, "tiles/grass.glb");

    assert.true(container.meshes.length > 0);
    assert.strictEqual(scene.meshes.length, 0);
  });

  QUnit.test("measure gives the box that holds a model: a tile is about two wide, and thin", async (assert) => {
    const container = await loadModel(scene, "tiles/straight.glb");
    const size = sizeOf(measure(container.rootNodes[0]));

    assert.true(size.x > 1.5 && size.x < 2.5, `width ${size.x}`);
    assert.true(size.z > 1.5 && size.z < 2.5, `depth ${size.z}`);
    assert.true(size.y > 0 && size.y < 0.5, `height ${size.y}`);
  });

  QUnit.test("the five tiles are all the same size on the ground, so that they fit together", async (assert) => {
    const sizes = [];
    for (const kind of ["grass", "straight", "corner", "junction", "crossroads"]) {
      const container = await loadModel(scene, `tiles/${kind}.glb`);
      sizes.push(sizeOf(measure(container.rootNodes[0])));
    }
    const widths = sizes.map((s) => s.x);
    const depths = sizes.map((s) => s.z);

    assert.true(Math.max(...widths) / Math.min(...widths) < 1.05, widths.join(", "));
    assert.true(Math.max(...depths) / Math.min(...depths) < 1.05, depths.join(", "));
  });
});

QUnit.module("heightScale and bottomOffset", () => {
  QUnit.test("heightScale makes a model the height asked for, whatever its width", (assert) => {
    assert.strictEqual(heightScale({ x: 5, y: 2, z: 9 }, 1), 0.5);
    assert.strictEqual(heightScale({ x: 0.1, y: 1.8, z: 0.1 }, 0.9), 0.5);
  });

  QUnit.test("bottomOffset lifts a model drawn with its feet below zero, and lowers one that floats", (assert) => {
    assert.strictEqual(bottomOffset(box([-1, -0.5, -1], [1, 1.5, 1]), 2), 1);
    assert.strictEqual(bottomOffset(box([-1, 2, -1], [1, 3, 1]), 1), -2);
  });

  QUnit.test("a model that stands on zero is not moved", (assert) => {
    assert.strictEqual(bottomOffset(box([-1, 0, -1], [1, 1.8, 1]), 0.5) + 0, 0);
  });

  QUnit.test("after the offset, the bottom is exactly at zero", (assert) => {
    const bounds = box([-1, -0.3, -1], [1, 1.7, 1]);
    const scale = heightScale(sizeOf(bounds), 1.2);

    assert.true(Math.abs(bounds.min.y * scale + bottomOffset(bounds, scale)) < 1e-12);
  });
});
