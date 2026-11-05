const boxOf = (min, max) => ({ min: new BABYLON.Vector3(...min), max: new BABYLON.Vector3(...max) });

QUnit.module("framingFor", () => {
  const fov = 0.8;

  QUnit.test("looks at the middle of the box", (assert) => {
    const framing = framingFor(boxOf([-1, 0, -1], [1, 2, 1]), fov, 1.6);
    assert.deepEqual([framing.target.x, framing.target.y, framing.target.z], [0, 1, 0]);
  });

  QUnit.test("stands further back from a bigger model, in the same proportion", (assert) => {
    const small = framingFor(boxOf([0, 0, 0], [1, 1, 1]), fov, 1.6);
    const big = framingFor(boxOf([0, 0, 0], [10, 10, 10]), fov, 1.6);
    assert.ok(Math.abs(big.radius / small.radius - 10) < 1e-9);
  });

  QUnit.test("the whole box fits: the distance is more than the sphere that holds it", (assert) => {
    const framing = framingFor(boxOf([0, 0, 0], [2, 2, 2]), fov, 1.6);
    const sphere = Math.sqrt(12) / 2;
    assert.ok(framing.radius > sphere);
  });

  QUnit.test("a picture that is taller than wide needs more distance", (assert) => {
    const wide = framingFor(boxOf([0, 0, 0], [1, 2, 1]), fov, 1.6);
    const tall = framingFor(boxOf([0, 0, 0], [1, 2, 1]), fov, 0.5);
    assert.ok(tall.radius > wide.radius);
  });

  QUnit.test("sees from a small part of the distance to a great many times it", (assert) => {
    const framing = framingFor(boxOf([0, 0, 0], [180, 180, 180]), fov, 1.6);
    assert.ok(framing.near < framing.radius / 10);
    assert.ok(framing.far > framing.radius * 10);
  });

  QUnit.test("a box with no size (a single point) still gives a distance that works", (assert) => {
    const framing = framingFor(boxOf([1, 1, 1], [1, 1, 1]), fov, 1.6);
    assert.ok(framing.radius > 0 && Number.isFinite(framing.radius));
  });
});
