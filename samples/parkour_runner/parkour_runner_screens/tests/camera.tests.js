QUnit.module("followPosition", () => {
  // A runner, as far as the camera cares: where it is.
  const at = (x, y, z) => ({ x, y, z });

  QUnit.test("is behind the runner by the camera distance, so it looks down the street at it", (assert) => {
    const view = followPosition(at(0, 0, 50), { distance: 6, height: 3 });

    assert.strictEqual(view.z, 44);
  });

  QUnit.test("is above the ground by the camera height", (assert) => {
    const view = followPosition(at(0, 0, 0), { distance: 6, height: 3 });

    assert.strictEqual(view.y, 3);
  });

  QUnit.test("follows the runner along the street", (assert) => {
    const near = followPosition(at(0, 0, 10));
    const far = followPosition(at(0, 0, 110));

    assert.strictEqual(far.z - near.z, 100);
  });

  QUnit.test("copies only part of the runner's sideways position", (assert) => {
    const view = followPosition(at(2, 0, 0), { followX: 0.5 });

    assert.strictEqual(view.x, 1);
  });

  QUnit.test("with a follow of 0 the camera stays in the middle, and with 1 it goes where the runner goes", (assert) => {
    assert.strictEqual(followPosition(at(3, 0, 0), { followX: 0 }).x, 0);
    assert.strictEqual(followPosition(at(3, 0, 0), { followX: 1 }).x, 3);
  });

  QUnit.test("goes the same way as the runner, left or right", (assert) => {
    assert.true(followPosition(at(-2, 0, 0)).x < 0);
    assert.true(followPosition(at(2, 0, 0)).x > 0);
  });

  QUnit.test("rises with the runner when it jumps, but by less", (assert) => {
    const ground = followPosition(at(0, 0, 0), { height: 3, followY: 0.4 });
    const jumping = followPosition(at(0, 1.5, 0), { height: 3, followY: 0.4 });

    assert.true(jumping.y > ground.y, "it goes up");
    assert.true(jumping.y - ground.y < 1.5, "but not as far as the runner");
    assert.true(Math.abs(jumping.y - ground.y - 0.6) < 1e-9, "by the follow share of the jump");
  });

  QUnit.test("with a vertical follow of 0 the camera doesn't bob at all", (assert) => {
    assert.strictEqual(followPosition(at(0, 2, 0), { height: 3, followY: 0 }).y, 3);
  });

  QUnit.test("uses the standard distance, height and follow when none are given", (assert) => {
    const view = followPosition(at(1, 1, 20));

    assert.strictEqual(view.x, CAMERA_FOLLOW_X);
    assert.strictEqual(view.y, CAMERA_HEIGHT + CAMERA_FOLLOW_Y);
    assert.strictEqual(view.z, 20 - CAMERA_DISTANCE);
  });
});
