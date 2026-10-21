QUnit.module("followPosition", () => {
  QUnit.test("is behind the runner by the camera distance, so it looks down the street at it", (assert) => {
    const view = followPosition({ x: 0, z: 50 }, { distance: 6, height: 3 });

    assert.strictEqual(view.z, 44);
  });

  QUnit.test("is above the ground by the camera height", (assert) => {
    const view = followPosition({ x: 0, z: 0 }, { distance: 6, height: 3 });

    assert.strictEqual(view.y, 3);
  });

  QUnit.test("follows the runner along the street", (assert) => {
    const near = followPosition({ x: 0, z: 10 });
    const far = followPosition({ x: 0, z: 110 });

    assert.strictEqual(far.z - near.z, 100);
  });

  QUnit.test("copies only part of the runner's sideways position", (assert) => {
    const view = followPosition({ x: 2, z: 0 }, { followX: 0.5 });

    assert.strictEqual(view.x, 1);
  });

  QUnit.test("with a follow of 0 the camera stays in the middle, and with 1 it goes where the runner goes", (assert) => {
    assert.strictEqual(followPosition({ x: 3, z: 0 }, { followX: 0 }).x, 0);
    assert.strictEqual(followPosition({ x: 3, z: 0 }, { followX: 1 }).x, 3);
  });

  QUnit.test("goes the same way as the runner, left or right", (assert) => {
    assert.true(followPosition({ x: -2, z: 0 }).x < 0);
    assert.true(followPosition({ x: 2, z: 0 }).x > 0);
  });

  QUnit.test("uses the standard distance, height and follow when none are given", (assert) => {
    const view = followPosition({ x: 1, z: 20 });

    assert.strictEqual(view.x, CAMERA_FOLLOW_X);
    assert.strictEqual(view.y, CAMERA_HEIGHT);
    assert.strictEqual(view.z, 20 - CAMERA_DISTANCE);
  });
});
