QUnit.module("wrapCoordinate", () => {
  QUnit.test("leaves a value inside the range alone", (assert) => {
    assert.strictEqual(wrapCoordinate(3, 10), 3);
    assert.strictEqual(wrapCoordinate(-3, 10), -3);
    assert.strictEqual(wrapCoordinate(0, 10), 0);
  });

  QUnit.test("a value exactly on the limit does not wrap", (assert) => {
    assert.strictEqual(wrapCoordinate(10, 10), 10);
    assert.strictEqual(wrapCoordinate(-10, 10), -10);
  });

  QUnit.test("wraps past the positive limit to the negative one", (assert) => {
    assert.strictEqual(wrapCoordinate(10.5, 10), -10);
  });

  QUnit.test("wraps past the negative limit to the positive one", (assert) => {
    assert.strictEqual(wrapCoordinate(-10.5, 10), 10);
  });
});
