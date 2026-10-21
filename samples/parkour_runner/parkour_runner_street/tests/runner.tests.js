const assertNear = (assert, actual, expected, tolerance, message) =>
  assert.true(Math.abs(actual - expected) <= tolerance, message || `expected ${actual} to be within ${tolerance} of ${expected}`);

QUnit.module("laneX", () => {
  QUnit.test("the middle lane is in the middle of the street", (assert) => {
    assert.strictEqual(laneX(0), 0);
  });

  QUnit.test("the lanes are one LANE_WIDTH apart, left negative and right positive", (assert) => {
    assert.strictEqual(laneX(-1), -LANE_WIDTH);
    assert.strictEqual(laneX(1), LANE_WIDTH);
  });
});

QUnit.module("approach", () => {
  QUnit.test("stays where it is when there is no time, or it has arrived", (assert) => {
    assert.strictEqual(approach(3, 10, 5, 0), 3);
    assert.strictEqual(approach(10, 10, 5, 1), 10);
  });

  QUnit.test("moves toward the target, from either side", (assert) => {
    assert.true(approach(0, 10, 5, 0.1) > 0);
    assert.true(approach(0, 10, 5, 0.1) < 10);
    assert.true(approach(20, 10, 5, 0.1) < 20);
    assert.true(approach(20, 10, 5, 0.1) > 10);
  });

  QUnit.test("never overshoots, however long the step", (assert) => {
    assert.true(approach(0, 10, 5, 100) <= 10);
    assert.true(approach(0, -10, 5, 100) >= -10);
  });

  QUnit.test("a bigger rate gets there faster", (assert) => {
    assert.true(approach(0, 10, 20, 0.1) > approach(0, 10, 5, 0.1));
  });

  QUnit.test("two half steps land where one whole step does, so frame rate doesn't matter", (assert) => {
    const half = approach(approach(0, 10, 7, 0.1), 10, 7, 0.1);
    const whole = approach(0, 10, 7, 0.2);

    assertNear(assert, half, whole, 1e-9);
  });

  QUnit.test("closes about 63% of the gap in 1 / rate seconds", (assert) => {
    assertNear(assert, approach(0, 10, 4, 0.25), 10 * (1 - Math.exp(-1)), 1e-9);
  });
});

QUnit.module("Runner", () => {
  QUnit.test("starts in the middle lane at the start of the street, running", (assert) => {
    const runner = new Runner();

    assert.strictEqual(runner.lane, 0);
    assert.strictEqual(runner.x, 0);
    assert.strictEqual(runner.z, 0);
    assert.true(runner.running);
  });

  QUnit.test("can start in another lane or further along", (assert) => {
    const runner = new Runner({ lane: -1, z: 50 });

    assert.strictEqual(runner.x, -LANE_WIDTH);
    assert.strictEqual(runner.z, 50);
  });

  QUnit.test("moveLane(1) heads for the lane on the right, and moveLane(-1) for the left", (assert) => {
    const runner = new Runner();

    runner.moveLane(1);
    assert.strictEqual(runner.lane, 1);

    runner.moveLane(-1);
    runner.moveLane(-1);
    assert.strictEqual(runner.lane, -1);
  });

  QUnit.test("there is no lane past the edge of the street", (assert) => {
    const runner = new Runner({ lane: 1 });

    runner.moveLane(1);

    assert.strictEqual(runner.lane, 1);

    const other = new Runner({ lane: -1 });
    other.moveLane(-1);
    assert.strictEqual(other.lane, -1);
  });

  QUnit.test("moveLane() doesn't move the runner by itself, it only chooses the lane", (assert) => {
    const runner = new Runner();

    runner.moveLane(1);

    assert.strictEqual(runner.x, 0);
  });

  QUnit.test("update() slides toward the chosen lane without jumping there", (assert) => {
    const runner = new Runner();
    runner.moveLane(1);

    runner.update(0.05);

    assert.true(runner.x > 0, "it has started to move");
    assert.true(runner.x < LANE_WIDTH, "but hasn't arrived");
  });

  QUnit.test("update() gets to the lane in the end, and stays there", (assert) => {
    const runner = new Runner();
    runner.moveLane(-1);

    for (let i = 0; i < 120; i++) runner.update(1 / 60);

    assertNear(assert, runner.x, -LANE_WIDTH, 1e-3);
  });

  QUnit.test("sliding takes the same time at any frame rate", (assert) => {
    const slow = new Runner();
    const fast = new Runner();
    slow.moveLane(1);
    fast.moveLane(1);

    for (let i = 0; i < 10; i++) slow.update(0.05);
    for (let i = 0; i < 50; i++) fast.update(0.01);

    assertNear(assert, slow.x, fast.x, 1e-9);
  });

  QUnit.test("update() runs forward at the run speed", (assert) => {
    const runner = new Runner({ speed: 10 });

    runner.update(0.5);

    assert.strictEqual(runner.z, 5);
  });

  QUnit.test("changing lanes doesn't slow the runner down", (assert) => {
    const runner = new Runner({ speed: 10 });
    runner.moveLane(1);

    runner.update(0.5);

    assert.strictEqual(runner.z, 5);
  });

  QUnit.test("stops at the end of the street", (assert) => {
    const runner = new Runner({ speed: 10, endZ: 20 });

    runner.update(1);
    assert.true(runner.running, "still going at z = 10");

    runner.update(5);
    assert.strictEqual(runner.z, 20);
    assert.false(runner.running);
  });

  QUnit.test("a runner that has stopped stays where it is, but can still change lanes", (assert) => {
    const runner = new Runner({ speed: 10, endZ: 20 });
    runner.update(5);
    runner.moveLane(1);

    runner.update(0.5);

    assert.strictEqual(runner.z, 20);
    assert.true(runner.x > 0);
  });

  QUnit.test("heading is zero when running straight", (assert) => {
    const runner = new Runner();

    runner.update(0.1);

    assert.strictEqual(runner.heading, 0);
  });

  QUnit.test("heading turns toward the side the runner is sliding to", (assert) => {
    const right = new Runner();
    right.moveLane(1);
    right.update(0.05);
    const left = new Runner();
    left.moveLane(-1);
    left.update(0.05);

    assert.true(right.heading > 0, "right is positive");
    assert.true(left.heading < 0, "left is negative");
    assertNear(assert, right.heading, -left.heading, 1e-9, "the same amount either way");
  });

  QUnit.test("heading is a lean, never a full turn sideways", (assert) => {
    const runner = new Runner();
    runner.moveLane(1);

    runner.update(0.02);

    assert.true(runner.heading < Math.PI / 2);
  });

  QUnit.test("heading goes back to zero once the runner has settled into its lane", (assert) => {
    const runner = new Runner();
    runner.moveLane(1);

    for (let i = 0; i < 300; i++) runner.update(1 / 60);

    assertNear(assert, runner.heading, 0, 1e-3);
  });

  QUnit.test("reset() goes back to the start, in the starting lane, running again", (assert) => {
    const runner = new Runner({ lane: 0, z: 5, speed: 10, endZ: 20 });
    runner.moveLane(1);
    runner.update(5);

    runner.reset();

    assert.strictEqual(runner.lane, 0);
    assert.strictEqual(runner.x, 0);
    assert.strictEqual(runner.vx, 0);
    assert.strictEqual(runner.z, 5);
    assert.true(runner.running);
  });
});
