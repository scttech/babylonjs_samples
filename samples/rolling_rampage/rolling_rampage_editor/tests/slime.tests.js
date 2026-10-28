QUnit.module("Exposure", () => {
  QUnit.test("a marble starts clean, and out of the slime", (assert) => {
    const exposure = new Exposure();

    assert.strictEqual(exposure.level, 0);
    assert.false(exposure.inSlime);
    assert.false(exposure.dissolved);
  });

  QUnit.test("it is in slime from going in until coming out", (assert) => {
    const exposure = new Exposure();

    exposure.enter();
    assert.true(exposure.inSlime);

    exposure.leave();
    assert.false(exposure.inSlime);
  });

  QUnit.test("in two puddles at once, it is in slime until it has left both", (assert) => {
    const exposure = new Exposure();
    exposure.enter();
    exposure.enter();

    exposure.leave();
    assert.true(exposure.inSlime, "still in one");

    exposure.leave();
    assert.false(exposure.inSlime);
  });

  QUnit.test("leaving a puddle it never entered (a marble put back, say) is harmless", (assert) => {
    const exposure = new Exposure();

    exposure.leave();
    exposure.enter();

    assert.true(exposure.inSlime, "and the count didn't go negative");
  });

  QUnit.test("time in slime eats it, and doesn't change it out of slime if it is already clean", (assert) => {
    const exposure = new Exposure();
    exposure.tick(1);
    assert.strictEqual(exposure.level, 0);

    exposure.enter();
    exposure.tick(DISSOLVE_TIME / 4);

    assert.true(Math.abs(exposure.level - 0.25) < 1e-9);
  });

  QUnit.test("it dissolves after the time it takes, and not before", (assert) => {
    const exposure = new Exposure();
    exposure.enter();

    exposure.tick(DISSOLVE_TIME - 0.01);
    assert.false(exposure.dissolved);

    exposure.tick(0.02);
    assert.true(exposure.dissolved);
  });

  QUnit.test("it never goes past fully dissolved", (assert) => {
    const exposure = new Exposure();
    exposure.enter();

    exposure.tick(100);

    assert.strictEqual(exposure.level, 1);
  });

  QUnit.test("out of the slime it recovers, at its own pace, and never below clean", (assert) => {
    const exposure = new Exposure();
    exposure.enter();
    exposure.tick(DISSOLVE_TIME / 2);
    exposure.leave();

    exposure.tick(RECOVER_TIME / 4);
    assert.true(Math.abs(exposure.level - 0.25) < 1e-9, `${exposure.level}`);

    exposure.tick(100);
    assert.strictEqual(exposure.level, 0);
  });

  QUnit.test("a quick dash through gets out before it is dissolved", (assert) => {
    const exposure = new Exposure();

    exposure.enter();
    for (let i = 0; i < 30; i++) exposure.tick(1 / 60); // half a second
    exposure.leave();
    for (let i = 0; i < 10; i++) exposure.tick(1 / 60);

    assert.false(exposure.dissolved);
    assert.true(exposure.level > 0 && exposure.level < 0.5);
  });

  QUnit.test("reset makes it clean, and out of every puddle", (assert) => {
    const exposure = new Exposure();
    exposure.enter();
    exposure.enter();
    exposure.tick(100);

    exposure.reset();

    assert.strictEqual(exposure.level, 0);
    assert.false(exposure.inSlime);
    assert.false(exposure.dissolved);
  });
});
