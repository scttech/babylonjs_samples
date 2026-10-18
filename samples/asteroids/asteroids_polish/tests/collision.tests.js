QUnit.module("circlesOverlap", () => {
  QUnit.test("circles on top of each other overlap", (assert) => {
    assert.true(circlesOverlap(0, 0, 1, 0, 0, 1));
  });

  QUnit.test("circles far apart do not overlap", (assert) => {
    assert.false(circlesOverlap(0, 0, 1, 10, 0, 1));
  });

  QUnit.test("circles that partly overlap do", (assert) => {
    assert.true(circlesOverlap(0, 0, 1, 1.5, 0, 1)); // centers 1.5 apart, radii sum to 2
  });

  QUnit.test("circles that exactly touch do not count as overlapping", (assert) => {
    assert.false(circlesOverlap(0, 0, 1, 2, 0, 1));
  });

  QUnit.test("works along the diagonal, not just the axes", (assert) => {
    // Centers are sqrt(2) ~ 1.414 apart.
    assert.true(circlesOverlap(0, 0, 1, 1, 1, 0.5), "radii sum to 1.5, so they overlap");
    assert.false(circlesOverlap(0, 0, 0.5, 1, 1, 0.5), "radii sum to 1.0, so they don't");
  });

  QUnit.test("is symmetric", (assert) => {
    assert.strictEqual(circlesOverlap(0, 0, 1, 1.5, 0.5, 0.7), circlesOverlap(1.5, 0.5, 0.7, 0, 0, 1));
  });

  QUnit.test("a small circle inside a big one overlaps", (assert) => {
    assert.true(circlesOverlap(0, 0, 5, 1, 1, 0.1));
  });
});
