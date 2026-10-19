const closeEnough = (assert, actual, expected, message) =>
  assert.true(Math.abs(actual - expected) < 1e-9, message || `expected ${actual} to be close to ${expected}`);

QUnit.module("chaseView", () => {
  const OPTIONS = { distance: 6, height: 3, lookAhead: 4 };

  QUnit.test("a ship pointing up: the camera is below it on the screen, and above the plane", (assert) => {
    const view = chaseView({ x: 0, y: 0, angle: 0 }, OPTIONS);

    closeEnough(assert, view.position.x, 0);
    closeEnough(assert, view.position.y, -6, "6 behind");
    closeEnough(assert, view.position.z, -3, "3 above the plane, toward the viewer");
  });

  QUnit.test("the camera looks at a point ahead of the ship, on the plane", (assert) => {
    const view = chaseView({ x: 0, y: 0, angle: 0 }, OPTIONS);

    closeEnough(assert, view.target.x, 0);
    closeEnough(assert, view.target.y, 4, "4 ahead");
    closeEnough(assert, view.target.z, 0);
  });

  QUnit.test("it follows the ship's position", (assert) => {
    const view = chaseView({ x: 5, y: -2, angle: 0 }, OPTIONS);

    closeEnough(assert, view.position.x, 5);
    closeEnough(assert, view.position.y, -8);
    closeEnough(assert, view.target.x, 5);
    closeEnough(assert, view.target.y, 2);
  });

  QUnit.test("it swings around behind the ship as the ship turns", (assert) => {
    // Turned a quarter turn counter-clockwise, the ship points left (-x), so
    // "behind" is to the right (+x).
    const view = chaseView({ x: 0, y: 0, angle: Math.PI / 2 }, OPTIONS);

    closeEnough(assert, view.position.x, 6);
    closeEnough(assert, view.position.y, 0);
    closeEnough(assert, view.target.x, -4);
    closeEnough(assert, view.target.y, 0);
  });

  QUnit.test("the camera is always the same distance from the ship along the ground", (assert) => {
    for (const angle of [0, 0.7, 2, 3.5, -1.2]) {
      const view = chaseView({ x: 3, y: 4, angle }, OPTIONS);
      closeEnough(assert, Math.hypot(view.position.x - 3, view.position.y - 4), 6);
    }
  });

  QUnit.test("the camera, the ship, and the target all lie on one line from above", (assert) => {
    const ship = { x: 1, y: 2, angle: 1.1 };
    const view = chaseView(ship, OPTIONS);
    const behind = [ship.x - view.position.x, ship.y - view.position.y];
    const ahead = [view.target.x - ship.x, view.target.y - ship.y];

    // Parallel vectors have a zero cross product.
    closeEnough(assert, behind[0] * ahead[1] - behind[1] * ahead[0], 0);
  });
});

QUnit.module("approach", () => {
  QUnit.test("no time passing means no movement", (assert) => {
    closeEnough(assert, approach(2, 10, 0), 2);
  });

  QUnit.test("it moves toward the target without overshooting it", (assert) => {
    const next = approach(0, 10, 0.1, 5);

    assert.true(next > 0 && next < 10);
  });

  QUnit.test("a long time lands (almost) exactly on the target", (assert) => {
    assert.true(Math.abs(approach(0, 10, 100, 5) - 10) < 1e-9);
  });

  QUnit.test("it works the same in either direction", (assert) => {
    closeEnough(assert, approach(10, 0, 0.1, 5), 10 - approach(0, 10, 0.1, 5));
  });

  QUnit.test("two half-steps equal one whole step, so it looks the same at any frame rate", (assert) => {
    const whole = approach(0, 10, 0.2, 5);
    const twoHalves = approach(approach(0, 10, 0.1, 5), 10, 0.1, 5);

    closeEnough(assert, twoHalves, whole);
  });

  QUnit.test("a higher rate gets there faster", (assert) => {
    assert.true(approach(0, 10, 0.1, 10) > approach(0, 10, 0.1, 2));
  });
});

QUnit.module("ChaseCamera", () => {
  const SHIP = { x: 0, y: 0, angle: 0 };

  QUnit.test("starts behind and above a ship at the origin", (assert) => {
    const camera = new ChaseCamera({ distance: 7, height: 3.5, lookAhead: 5 });

    assert.deepEqual(camera.position, { x: 0, y: -7, z: -3.5 });
    assert.deepEqual(camera.target, { x: 0, y: 5, z: 0 });
  });

  QUnit.test("snapTo() jumps straight to the ideal view", (assert) => {
    const camera = new ChaseCamera({ distance: 6, height: 3, lookAhead: 4 });

    camera.snapTo({ x: 10, y: 5, angle: 0 });

    assert.deepEqual(camera.position, { x: 10, y: -1, z: -3 });
    assert.deepEqual(camera.target, { x: 10, y: 9, z: 0 });
  });

  QUnit.test("update() eases part of the way toward the ideal view", (assert) => {
    const camera = new ChaseCamera({ distance: 6, height: 3, lookAhead: 4, rate: 5 });
    camera.snapTo(SHIP);

    camera.update({ x: 10, y: 0, angle: 0 }, 0.1);

    assert.true(camera.position.x > 0 && camera.position.x < 10, "on its way, not there yet");
    assert.true(camera.target.x > 0 && camera.target.x < 10);
  });

  QUnit.test("update() keeps going until it catches up", (assert) => {
    const camera = new ChaseCamera({ distance: 6, height: 3, lookAhead: 4, rate: 5 });
    camera.snapTo(SHIP);

    for (let i = 0; i < 200; i++) camera.update({ x: 10, y: 0, angle: 0 }, 1 / 60);

    assert.true(Math.abs(camera.position.x - 10) < 1e-3);
    assert.true(Math.abs(camera.target.y - 4) < 1e-3);
  });

  QUnit.test("update() for a ship that hasn't moved changes nothing", (assert) => {
    const camera = new ChaseCamera({ distance: 6, height: 3, lookAhead: 4 });
    camera.snapTo(SHIP);
    const before = JSON.stringify({ p: camera.position, t: camera.target });

    camera.update(SHIP, 0.5);

    assert.strictEqual(JSON.stringify({ p: camera.position, t: camera.target }), before);
  });

  QUnit.test("snapTo() after a wrap doesn't leave the camera easing across the arena", (assert) => {
    const camera = new ChaseCamera({ distance: 6, height: 3, lookAhead: 4 });
    camera.snapTo({ x: 12, y: 0, angle: 0 });

    // The ship wraps from the right edge to the left.
    camera.snapTo({ x: -12, y: 0, angle: 0 });

    assert.strictEqual(camera.position.x, -12);
  });
});
