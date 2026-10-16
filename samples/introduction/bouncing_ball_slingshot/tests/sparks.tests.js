// Returns a random()-compatible function that replays `sequence`, cycling
// once exhausted, so spawn behavior can be pinned down exactly.
function fakeRandom(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

QUnit.module("SparkSystem physics", () => {
  QUnit.test("defaults to Babylon's gravity/drag/color tuning with no sparks", (assert) => {
    const system = new SparkSystem();

    assert.strictEqual(system.gravity, 500);
    assert.strictEqual(system.drag, 0.985);
    assert.deepEqual(system.colors, ["#fff59d", "#ffca28", "#ff7043", "#ffffff"]);
    assert.deepEqual(system.sparks, []);
  });

  QUnit.test("accepts gravity/drag/colors overrides via constructor options", (assert) => {
    const system = new SparkSystem({ gravity: 100, drag: 0.9, colors: ["#000000"] });

    assert.strictEqual(system.gravity, 100);
    assert.strictEqual(system.drag, 0.9);
    assert.deepEqual(system.colors, ["#000000"]);
  });

  QUnit.test("spawn() derives spark count from the first random() call", (assert) => {
    const low = new SparkSystem({ random: fakeRandom([0]) });
    low.spawn(0, 0, 0, -1);
    assert.strictEqual(low.sparks.length, 14, "14 + floor(0 * 8)");

    const high = new SparkSystem({ random: fakeRandom([0.999999]) });
    high.spawn(0, 0, 0, -1);
    assert.strictEqual(high.sparks.length, 21, "14 + floor(0.999999 * 8)");
  });

  QUnit.test("spawn() places every spark at the impact point", (assert) => {
    const system = new SparkSystem({ random: fakeRandom([0.3]) });

    system.spawn(12, -34, 0, -1);

    assert.true(
      system.sparks.every((s) => s.x === 12 && s.y === -34),
      "all sparks start at (x, y)"
    );
  });

  QUnit.test("spawn() with random() = 0 produces the minimum spread, speed, life, and first color", (assert) => {
    const colors = ["#111111", "#222222"];
    const system = new SparkSystem({ colors, random: fakeRandom([0]) });

    system.spawn(0, 0, 0, -1);
    const spark = system.sparks[0];

    const baseAngle = Math.atan2(-1, 0);
    const expectedAngle = baseAngle + (0 - 0.5) * Math.PI * 0.8;
    assert.strictEqual(spark.vx, Math.cos(expectedAngle) * 140, "min speed (140) at min spread");
    assert.strictEqual(spark.vy, Math.sin(expectedAngle) * 140);
    assert.strictEqual(spark.life, 0.25, "min life");
    assert.strictEqual(spark.maxLife, 0.25);
    assert.strictEqual(spark.control, null, "no control without a ui");
  });

  QUnit.test("spawn() with random() near 1 approaches the maximum spread, speed, life, and last color", (assert) => {
    const colors = ["#111111", "#222222"];
    const r = 0.999999;
    const system = new SparkSystem({ colors, random: fakeRandom([r]) });

    system.spawn(0, 0, 0, -1);
    const spark = system.sparks[0];

    const baseAngle = Math.atan2(-1, 0);
    const expectedAngle = baseAngle + (r - 0.5) * Math.PI * 0.8;
    const expectedSpeed = 140 + r * 260;
    assert.strictEqual(spark.vx, Math.cos(expectedAngle) * expectedSpeed);
    assert.strictEqual(spark.vy, Math.sin(expectedAngle) * expectedSpeed);
    assert.strictEqual(spark.life, 0.25 + r * 0.35);
  });

  QUnit.test("update() applies gravity to vy and drag to vx before integrating position", (assert) => {
    const system = new SparkSystem({ gravity: 500, drag: 0.98 });
    system.sparks.push({ x: 0, y: 0, vx: 100, vy: 0, life: 1, maxLife: 1, control: null });

    system.update(0.1);
    const spark = system.sparks[0];

    assert.strictEqual(spark.vy, 50, "vy += gravity * dt");
    assert.strictEqual(spark.vx, 98, "vx *= drag");
    assert.strictEqual(spark.x, 9.8, "x += (post-drag) vx * dt");
    assert.strictEqual(spark.y, 5, "y += (post-gravity) vy * dt");
    assert.strictEqual(spark.life, 0.9, "life -= dt");
  });

  QUnit.test("update() removes a spark once its life reaches zero", (assert) => {
    const system = new SparkSystem();
    system.sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0.05, maxLife: 0.05, control: null });

    system.update(0.1);

    assert.deepEqual(system.sparks, [], "expired spark is removed");
  });

  QUnit.test("update() leaves unrelated sparks untouched when one expires", (assert) => {
    const system = new SparkSystem();
    system.sparks.push(
      { x: 0, y: 0, vx: 0, vy: 0, life: 0.05, maxLife: 0.05, control: null },
      { x: 1, y: 1, vx: 0, vy: 0, life: 1, maxLife: 1, control: null }
    );

    system.update(0.1);

    assert.strictEqual(system.sparks.length, 1, "only the expired spark is removed");
    assert.strictEqual(system.sparks[0].x, 1);
  });
});

// Rendering (control creation/sync/dispose) only needs `BABYLON.GUI.Rectangle`
// to exist, so these tests stub it out instead of loading the real engine.
QUnit.module("SparkSystem rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeRectangle {
    width = null;
    height = null;
    thickness = null;
    background = null;
    left = null;
    top = null;
    alpha = null;
    rotation = null;
    disposed = false;

    dispose() {
      this.disposed = true;
    }
  }

  class FakeUi {
    controls = [];

    addControl(control) {
      this.controls.push(control);
    }
    removeControl(control) {
      this.controls = this.controls.filter((c) => c !== control);
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = { GUI: { Rectangle: FakeRectangle } };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("spawn() creates and adds one control per spark when ui is provided", (assert) => {
    const ui = new FakeUi();
    const system = new SparkSystem({ ui, colors: ["#123456"], random: fakeRandom([0]) });

    system.spawn(3, 4, 0, -1);

    assert.strictEqual(ui.controls.length, system.sparks.length, "one control per spark");
    assert.true(
      system.sparks.every((s) => s.control instanceof FakeRectangle),
      "every spark holds its control"
    );
    assert.strictEqual(system.sparks[0].control.background, "#123456");
    assert.strictEqual(system.sparks[0].control.left, 3, "control starts synced to the spawn point");
    assert.strictEqual(system.sparks[0].control.alpha, 1, "alpha starts at life / maxLife == 1");
  });

  QUnit.test("update() keeps each control synced to position, alpha, and rotation", (assert) => {
    const ui = new FakeUi();
    const system = new SparkSystem({ ui });
    system.sparks.push({ x: 0, y: 0, vx: 100, vy: 0, life: 1, maxLife: 2, control: new FakeRectangle() });

    system.update(0.5);
    const spark = system.sparks[0];

    assert.strictEqual(spark.control.left, spark.x);
    assert.strictEqual(spark.control.top, spark.y);
    assert.strictEqual(spark.control.alpha, spark.life / spark.maxLife);
    assert.strictEqual(spark.control.rotation, Math.atan2(spark.vy, spark.vx));
  });

  QUnit.test("update() removes and disposes the control of an expired spark", (assert) => {
    const ui = new FakeUi();
    const control = new FakeRectangle();
    ui.addControl(control);
    const system = new SparkSystem({ ui });
    system.sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0.01, maxLife: 0.01, control });

    system.update(0.1);

    assert.false(ui.controls.includes(control), "control removed from the ui");
    assert.true(control.disposed, "control.dispose() was called");
  });

  QUnit.test("dispose() removes and disposes every remaining spark's control", (assert) => {
    const ui = new FakeUi();
    const system = new SparkSystem({ ui, random: fakeRandom([0]) });
    system.spawn(0, 0, 0, -1);
    const controls = system.sparks.map((s) => s.control);

    system.dispose();

    assert.deepEqual(system.sparks, [], "no sparks remain");
    assert.strictEqual(ui.controls.length, 0, "every control removed from the ui");
    assert.true(
      controls.every((c) => c.disposed),
      "every control was disposed"
    );
  });
});
