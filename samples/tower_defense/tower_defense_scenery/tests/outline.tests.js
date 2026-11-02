QUnit.module("colors", () => {
  QUnit.test("parseColor turns a hex color into three numbers from 0 to 1", (assert) => {
    assert.deepEqual(parseColor("#000000"), [0, 0, 0]);
    assert.deepEqual(parseColor("#ffffff"), [1, 1, 1]);
    assert.deepEqual(parseColor("#ff0000"), [1, 0, 0]);
    assert.true(Math.abs(parseColor("#336699")[1] - 0x66 / 255) < 1e-12);
  });

  QUnit.test("the outline is green where a tower can go and red where it can't, and they are not alike", (assert) => {
    const [r1, g1] = outlineTarget(true);
    const [r2, g2] = outlineTarget(false);

    assert.true(g1 > r1, "green is mostly green");
    assert.true(r2 > g2, "red is mostly red");
  });

  QUnit.test("fadeColor goes the share of the way asked, on each of the three", (assert) => {
    assert.deepEqual(fadeColor([0, 0, 0], [1, 0.5, 0.2], 0.5), [0.5, 0.25, 0.1]);
  });

  QUnit.test("a step of none stays, and a step of one arrives", (assert) => {
    assert.deepEqual(fadeColor([0.2, 0.3, 0.4], [1, 1, 1], 0), [0.2, 0.3, 0.4]);
    assert.deepEqual(fadeColor([0.2, 0.3, 0.4], [1, 0, 1], 1), [1, 0, 1]);
  });

  QUnit.test("a step bigger than one, or less than none, cannot go past", (assert) => {
    assert.deepEqual(fadeColor([0, 0, 0], [1, 1, 1], 5), [1, 1, 1]);
    assert.deepEqual(fadeColor([0.5, 0.5, 0.5], [1, 1, 1], -3), [0.5, 0.5, 0.5]);
  });

  QUnit.test("it does not change the color it is given", (assert) => {
    const from = [0, 0, 0];
    fadeColor(from, [1, 1, 1], 0.5);

    assert.deepEqual(from, [0, 0, 0]);
  });

  QUnit.test("again and again, it gets as near as you like, and never past", (assert) => {
    let color = outlineTarget(false);
    const target = outlineTarget(true);
    for (let i = 0; i < 40; i++) {
      color = fadeColor(color, target, 0.3);

      assert.true(color.every((value, j) => Math.abs(value - target[j]) <= Math.abs(outlineTarget(false)[j] - target[j]) + 1e-12));
    }
    assert.true(color.every((value, j) => Math.abs(value - target[j]) < 1e-5));
  });
});

QUnit.module("Outline and RangeRing", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  const colorOf = (outline) => outline.mesh.material.emissiveColor.asArray();

  QUnit.test("an outline is hidden to begin with, and flat", (assert) => {
    const outline = new Outline(scene);

    assert.false(outline.visible);
    assert.true(outline.mesh.getBoundingInfo().boundingBox.extendSize.y < 1e-6);
  });

  QUnit.test("show puts it round a cell, a hair above the ground, and makes it visible", (assert) => {
    const outline = new Outline(scene);
    outline.show(4, 3, true);
    const { x, z } = cellCenter(4, 3);

    assert.true(outline.visible);
    assert.strictEqual(outline.mesh.position.x, x);
    assert.strictEqual(outline.mesh.position.z, z);
    assert.strictEqual(outline.mesh.position.y, OUTLINE.height);
  });

  QUnit.test("it is a little smaller than a cell, so that two side by side don't touch", (assert) => {
    const outline = new Outline(scene);
    const { extendSize } = outline.mesh.getBoundingInfo().boundingBox;

    assert.true(Math.abs(extendSize.x * 2 - BOARD.cell * OUTLINE.size) < 1e-9);
    assert.true(OUTLINE.size < 1);
  });

  QUnit.test("hide takes it away", (assert) => {
    const outline = new Outline(scene);
    outline.show(1, 1, true);
    outline.hide();

    assert.false(outline.visible);
  });

  QUnit.test("it begins red, and when shown over a cell that is fine it fades to green, not at once", (assert) => {
    const outline = new Outline(scene);
    outline.show(1, 1, true);
    const before = colorOf(outline);
    outline.update(0.05);
    const during = colorOf(outline);

    assert.true(during[1] > before[1], "greener");
    assert.true(during[0] < before[0], "less red");
    assert.true(during[1] < outlineTarget(true)[1] - 0.01, "and not green yet");
  });

  QUnit.test("given long enough it is the green, and then if the cell is not fine it fades back to the red", (assert) => {
    const outline = new Outline(scene);
    outline.show(1, 1, true);
    for (let i = 0; i < 60; i++) outline.update(0.05);
    assert.true(colorOf(outline).every((v, i) => Math.abs(v - outlineTarget(true)[i]) < 1e-3), "green");
    outline.show(1, 1, false);
    for (let i = 0; i < 60; i++) outline.update(0.05);

    assert.true(colorOf(outline).every((v, i) => Math.abs(v - outlineTarget(false)[i]) < 1e-3), "red");
  });

  QUnit.test("it fades at the same pace on a slow computer and a fast one", (assert) => {
    const slow = new Outline(scene);
    const fast = new Outline(scene);
    slow.show(0, 0, true);
    fast.show(0, 0, true);
    for (let i = 0; i < 6; i++) slow.update(1 / 60);
    for (let i = 0; i < 12; i++) fast.update(1 / 120);

    assert.true(colorOf(slow).every((v, i) => Math.abs(v - colorOf(fast)[i]) < 1e-9));
  });

  QUnit.test("a ring is hidden, then shown on the ground, as wide as twice the range", (assert) => {
    const ring = new RangeRing(scene);
    assert.false(ring.visible);
    ring.show(3, -2, 5, "#38b6ff");
    const { extendSize } = ring.mesh.getBoundingInfo().boundingBox;

    assert.true(ring.visible);
    assert.strictEqual(ring.mesh.position.x, 3);
    assert.strictEqual(ring.mesh.position.z, -2);
    assert.true(Math.abs(extendSize.x * ring.mesh.scaling.x * 2 - 10) < 1e-9, "ten across for a range of five");
    assert.strictEqual(ring.mesh.material.emissiveColor.toHexString().toLowerCase(), "#38b6ff");
    ring.hide();
    assert.false(ring.visible);
  });

  QUnit.test("neither can be picked, so neither catches a click meant for the board", (assert) => {
    assert.false(new Outline(scene).mesh.isPickable);
    assert.false(new RangeRing(scene).mesh.isPickable);
  });
});
