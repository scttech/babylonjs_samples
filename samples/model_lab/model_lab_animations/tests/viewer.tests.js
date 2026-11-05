QUnit.module("gridLines", () => {
  QUnit.test("makes a line each way for every step, from one side to the other", (assert) => {
    const lines = gridLines(2, 1);
    assert.strictEqual(lines.length, 10);
    assert.deepEqual(lines[0].points, [[-2, 0, -2], [-2, 0, 2]]);
  });

  QUnit.test("marks the two lines through the middle as the axes", (assert) => {
    const lines = gridLines(3, 1);
    assert.strictEqual(lines.filter((line) => line.axis).length, 2);
  });

  QUnit.test("every line lies on the floor", (assert) => {
    for (const line of gridLines(4, 0.5)) for (const point of line.points) assert.strictEqual(point[1], 0);
  });
});

QUnit.module("gridFor", () => {
  QUnit.test("reaches further than the model, and is never smaller than a metre", (assert) => {
    assert.ok(gridFor(2).half >= 3);
    assert.strictEqual(gridFor(0.1).half, 1);
  });

  QUnit.test("keeps the number of lines a person can count", (assert) => {
    for (const size of [0.5, 2, 20, 200, 2000]) {
      const { half, step } = gridFor(size);
      assert.ok(half / step <= 12, `size ${size}`);
    }
  });
});

QUnit.module("VIEW_OPTIONS", () => {
  QUnit.test("each has an id, a label and a starting state, and no two ids match", (assert) => {
    const ids = VIEW_OPTIONS.map((option) => option.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    for (const option of VIEW_OPTIONS) {
      assert.strictEqual(typeof option.id, "string");
      assert.strictEqual(typeof option.label, "string");
      assert.strictEqual(typeof option.on, "boolean");
    }
  });
});

QUnit.module("createViewer", (hooks) => {
  let engine, scene, viewer;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    viewer = createViewer(scene, null);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("begins with the options as the table says", (assert) => {
    for (const option of VIEW_OPTIONS) assert.strictEqual(viewer.state[option.id], option.on, option.id);
  });

  QUnit.test("makes the grid when the grid is on, and hides it when it is switched off", (assert) => {
    const grid = scene.getMeshByName("grid");
    assert.ok(grid.isEnabled());
    viewer.set("grid", false);
    assert.notOk(grid.isEnabled());
  });

  QUnit.test("ignores an option that is not in the table", (assert) => {
    viewer.set("toString", true);
    viewer.set("nothing", true);
    assert.notOk(Object.hasOwn(viewer.state, "nothing"));
    assert.notOk(Object.hasOwn(viewer.state, "toString"));
  });

  QUnit.test("framing a box aims the camera at it and stands back from it", (assert) => {
    viewer.frame({ min: new BABYLON.Vector3(-1, 0, -1), max: new BABYLON.Vector3(1, 2, 1) });
    assert.ok(Math.abs(viewer.camera.target.y - 1) < 1e-9);
    assert.ok(viewer.camera.radius > 2);
  });

  QUnit.test("the box around the model is made when it is switched on, and removed when it is switched off", (assert) => {
    viewer.frame({ min: new BABYLON.Vector3(-1, 0, -1), max: new BABYLON.Vector3(1, 2, 1) });
    viewer.set("bounds", true);
    assert.ok(scene.getMeshByName("bounds"));
    viewer.set("bounds", false);
    assert.notOk(scene.getMeshByName("bounds"));
  });
});
