QUnit.module("remainingSplashTime", () => {
  QUnit.test("a splash that has only just appeared has the whole minimum left", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 1000, 3000), 3000);
  });

  QUnit.test("counts down as time passes", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 2200, 3000), 1800);
  });

  QUnit.test("is zero once exactly the minimum has passed", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 4000, 3000), 0);
  });

  QUnit.test("never goes below zero, however long loading took", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 90000, 3000), 0);
  });

  QUnit.test("a minimum of zero never waits", (assert) => {
    assert.strictEqual(remainingSplashTime(0, 0, 0), 0);
  });
});
