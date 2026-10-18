// Directions are floating-point, so compare within a small tolerance.
const closeTo = (assert, actual, expected, message) =>
  assert.true(Math.abs(actual - expected) < 1e-9, message || `expected ${actual} to be close to ${expected}`);

QUnit.module("directionTo", () => {
  QUnit.test("points along an axis", (assert) => {
    const right = directionTo(0, 0, 5, 0);
    closeTo(assert, right.x, 1);
    closeTo(assert, right.y, 0);

    const down = directionTo(0, 0, 0, -3);
    closeTo(assert, down.x, 0);
    closeTo(assert, down.y, -1);
  });

  QUnit.test("points along a diagonal", (assert) => {
    const d = directionTo(1, 1, 4, 5); // a 3-4-5 triangle
    closeTo(assert, d.x, 0.6);
    closeTo(assert, d.y, 0.8);
  });

  QUnit.test("always returns a unit vector, however far away the target is", (assert) => {
    for (const [tx, ty] of [[1, 0], [100, 37], [-0.001, 0.002], [-50, -50]]) {
      const d = directionTo(0, 0, tx, ty);
      closeTo(assert, Math.hypot(d.x, d.y), 1);
    }
  });

  QUnit.test("two identical points have no direction, so it falls back to straight up", (assert) => {
    assert.deepEqual(directionTo(2, 2, 2, 2), { x: 0, y: 1 });
  });
});

QUnit.module("interceptDirection", () => {
  QUnit.test("a target standing still is aimed at directly", (assert) => {
    const lead = interceptDirection(0, 0, 3, 4, 0, 0, 10);
    const direct = directionTo(0, 0, 3, 4);

    closeTo(assert, lead.x, direct.x);
    closeTo(assert, lead.y, direct.y);
  });

  QUnit.test("a target crossing the line of fire is led", (assert) => {
    // Shooter at the origin, bullets at speed 5. The target is 10 to the right
    // and moving up at 3. They meet after 2.5 s, when the target is at (10, 7.5)
    // and the bullet has flown 5 * 2.5 = 12.5 units: a 10-7.5-12.5 triangle.
    const d = interceptDirection(0, 0, 10, 0, 0, 3, 5);

    closeTo(assert, d.x, 0.8);
    closeTo(assert, d.y, 0.6);
  });

  QUnit.test("the bullet really does meet the target", (assert) => {
    const [fx, fy, tx, ty, tvx, tvy, speed] = [-2, 1, 6, -4, -1.5, 2, 7];
    const d = interceptDirection(fx, fy, tx, ty, tvx, tvy, speed);

    // The bullet is at fx + d.x * speed * t and the target at tx + tvx * t, so
    // they share an x when t = (tx - fx) / (d.x * speed - tvx). If the aim is
    // right, they must share a y at that same moment.
    const t = (tx - fx) / (d.x * speed - tvx);
    assert.true(t > 0, "the meeting is in the future");
    closeTo(assert, fy + d.y * speed * t, ty + tvy * t, "same y at the same time");
  });

  QUnit.test("a target moving straight away more slowly than the bullet is caught", (assert) => {
    // 10 away and receding at 2; the bullet does 5, so they meet after 10/3 s.
    const d = interceptDirection(0, 0, 10, 0, 2, 0, 5);

    closeTo(assert, d.x, 1);
    closeTo(assert, d.y, 0);
  });

  QUnit.test("a target outrunning the bullet falls back to aiming straight at it", (assert) => {
    const d = interceptDirection(0, 0, 10, 0, 8, 0, 5); // receding at 8, bullet does 5

    closeTo(assert, d.x, 1);
    closeTo(assert, d.y, 0);
  });

  QUnit.test("a target moving at exactly the bullet's speed is handled", (assert) => {
    // Straight toward the shooter at the bullet's speed: they meet halfway.
    const d = interceptDirection(0, 0, 10, 0, -5, 0, 5);

    closeTo(assert, d.x, 1);
    closeTo(assert, d.y, 0);
  });

  QUnit.test("always returns a unit vector", (assert) => {
    const d = interceptDirection(1, 2, -7, 5, 3, -4, 6);

    closeTo(assert, Math.hypot(d.x, d.y), 1);
  });
});

QUnit.module("rotateDirection", () => {
  QUnit.test("an angle of zero changes nothing", (assert) => {
    const d = rotateDirection({ x: 0.6, y: 0.8 }, 0);

    closeTo(assert, d.x, 0.6);
    closeTo(assert, d.y, 0.8);
  });

  QUnit.test("a quarter turn counter-clockwise takes right to up", (assert) => {
    const d = rotateDirection({ x: 1, y: 0 }, Math.PI / 2);

    closeTo(assert, d.x, 0);
    closeTo(assert, d.y, 1);
  });

  QUnit.test("a negative angle turns clockwise", (assert) => {
    const d = rotateDirection({ x: 1, y: 0 }, -Math.PI / 2);

    closeTo(assert, d.x, 0);
    closeTo(assert, d.y, -1);
  });

  QUnit.test("rotating never changes the length", (assert) => {
    const d = rotateDirection({ x: 0.6, y: 0.8 }, 1.234);

    closeTo(assert, Math.hypot(d.x, d.y), 1);
  });
});
