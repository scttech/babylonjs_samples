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

QUnit.module("Runner moves", () => {
  // Runs the runner for `seconds`, in small steps like frames.
  const run = (runner, seconds) => {
    for (let t = 0; t < seconds - 1e-9; t += 1 / 60) runner.update(1 / 60);
  };

  QUnit.test("starts on the ground, running", (assert) => {
    const runner = new Runner();

    assert.strictEqual(runner.move, MOVES.run);
    assert.strictEqual(runner.y, 0);
    assert.strictEqual(runner.vy, 0);
    assert.strictEqual(runner.bodyHeight, STANDING_HEIGHT);
  });

  QUnit.test("jump() leaves the ground and goes up", (assert) => {
    const runner = new Runner();

    runner.jump();
    runner.update(1 / 60);

    assert.strictEqual(runner.move, MOVES.jump);
    assert.true(runner.y > 0);
    assert.true(runner.vy > 0, "still rising");
  });

  QUnit.test("a jump goes up and comes down again, in about 0.6 seconds", (assert) => {
    const runner = new Runner();
    runner.jump();
    let peak = 0;
    let airTime = 0;

    while (runner.move === MOVES.jump && airTime < 5) {
      runner.update(1 / 60);
      peak = Math.max(peak, runner.y);
      airTime += 1 / 60;
    }

    assertNear(assert, peak, (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY), 0.05, "the height physics gives");
    assertNear(assert, airTime, (2 * JUMP_SPEED) / GRAVITY, 0.05, "the time physics gives");
    assert.strictEqual(runner.y, 0, "back on the ground");
    assert.strictEqual(runner.move, MOVES.run, "and running again");
  });

  QUnit.test("a jump takes the same time at any frame rate", (assert) => {
    const fast = new Runner();
    const slow = new Runner();
    fast.jump();
    slow.jump();

    for (let i = 0; i < 20; i++) fast.update(0.01);
    for (let i = 0; i < 4; i++) slow.update(0.05);

    assertNear(assert, fast.y, slow.y, 0.02);
  });

  QUnit.test("there is no jumping in the air", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.2);
    const vy = runner.vy;

    runner.jump();

    assert.strictEqual(runner.vy, vy, "the second jump did nothing");
  });

  QUnit.test("jump() while sliding jumps out of the slide", (assert) => {
    const runner = new Runner();
    runner.slide();
    run(runner, 0.2);

    runner.jump();

    assert.strictEqual(runner.move, MOVES.jump);
  });

  QUnit.test("jump() while rolling does nothing", (assert) => {
    const runner = new Runner();
    runner.jump();
    runner.slide();
    while (runner.move === MOVES.jump) runner.update(1 / 60);
    assert.strictEqual(runner.move, MOVES.roll);

    runner.jump();

    assert.strictEqual(runner.move, MOVES.roll);
  });

  QUnit.test("slide() on the ground starts a slide, and the runner is low", (assert) => {
    const runner = new Runner();

    runner.slide();

    assert.strictEqual(runner.move, MOVES.slide);
    assert.strictEqual(runner.bodyHeight, LOW_HEIGHT);
    assert.true(runner.bodyHeight < STANDING_HEIGHT);
  });

  QUnit.test("a slide ends by itself after SLIDE_TIME, and the runner stands up", (assert) => {
    const runner = new Runner();
    runner.slide();

    run(runner, SLIDE_TIME - 0.1);
    assert.strictEqual(runner.move, MOVES.slide, "still sliding just before the end");

    run(runner, 0.2);
    assert.strictEqual(runner.move, MOVES.run);
    assert.strictEqual(runner.bodyHeight, STANDING_HEIGHT);
  });

  QUnit.test("slide() while already sliding doesn't start it over", (assert) => {
    const runner = new Runner();
    runner.slide();
    run(runner, 0.5);

    runner.slide();

    assertNear(assert, runner.moveTime, 0.5, 0.05);
  });

  QUnit.test("slide() in the air is a dive: the runner is pushed down hard", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.1);

    runner.slide();

    assert.strictEqual(runner.vy, -DIVE_SPEED);
    assert.true(runner.diving);
    assert.strictEqual(runner.move, MOVES.jump, "it is still in the air until it lands");
  });

  QUnit.test("a dive gets to the ground much sooner than a plain jump", (assert) => {
    const plain = new Runner();
    const diver = new Runner();
    plain.jump();
    diver.jump();
    run(plain, 0.15);
    run(diver, 0.15);
    diver.slide();
    let plainTime = 0;
    let diveTime = 0;

    while (plain.move === MOVES.jump) {
      plain.update(1 / 60);
      plainTime += 1 / 60;
    }
    while (diver.move === MOVES.jump) {
      diver.update(1 / 60);
      diveTime += 1 / 60;
    }

    assert.true(diveTime < plainTime / 2, `${diveTime} against ${plainTime}`);
  });

  QUnit.test("a runner that dived rolls when it lands", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.1);
    runner.slide();

    while (runner.move === MOVES.jump) runner.update(1 / 60);

    assert.strictEqual(runner.move, MOVES.roll);
    assert.strictEqual(runner.y, 0);
    assert.false(runner.diving, "the dive is over");
    assert.strictEqual(runner.bodyHeight, LOW_HEIGHT, "low while rolling");
  });

  QUnit.test("a runner that didn't dive just runs on when it lands", (assert) => {
    const runner = new Runner();
    runner.jump();

    while (runner.move === MOVES.jump) runner.update(1 / 60);

    assert.strictEqual(runner.move, MOVES.run);
  });

  QUnit.test("a roll ends by itself after ROLL_TIME", (assert) => {
    const runner = new Runner();
    runner.jump();
    runner.slide();
    while (runner.move === MOVES.jump) runner.update(1 / 60);

    run(runner, ROLL_TIME + 0.1);

    assert.strictEqual(runner.move, MOVES.run);
  });

  QUnit.test("a second dive in the same jump does nothing", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.1);
    runner.slide();
    run(runner, 0.02);
    const vy = runner.vy;

    runner.slide();

    assert.strictEqual(runner.vy, vy);
  });

  QUnit.test("slide() while rolling does nothing", (assert) => {
    const runner = new Runner();
    runner.jump();
    runner.slide();
    while (runner.move === MOVES.jump) runner.update(1 / 60);

    runner.slide();

    assert.strictEqual(runner.move, MOVES.roll);
  });

  QUnit.test("timeLeft counts down a slide, and is 0 when not sliding or rolling", (assert) => {
    const runner = new Runner();
    assert.strictEqual(runner.timeLeft, 0, "running");

    runner.slide();
    assertNear(assert, runner.timeLeft, SLIDE_TIME, 1e-9);
    run(runner, 0.3);
    assertNear(assert, runner.timeLeft, SLIDE_TIME - 0.3, 0.05);

    runner.jump();
    assert.strictEqual(runner.timeLeft, 0, "jumping");
  });

  QUnit.test("sliding doesn't change the speed along the street", (assert) => {
    const runner = new Runner({ speed: 10 });
    runner.slide();

    runner.update(0.5);

    assert.strictEqual(runner.z, 5);
  });

  QUnit.test("the runner can still change lanes in the air", (assert) => {
    const runner = new Runner();
    runner.jump();
    runner.moveLane(1);

    run(runner, 0.3);

    assert.true(runner.x > 0.5);
  });

  QUnit.test("reset() puts the runner back on the ground, running", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.2);
    runner.slide();

    runner.reset();

    assert.strictEqual(runner.y, 0);
    assert.strictEqual(runner.vy, 0);
    assert.strictEqual(runner.move, MOVES.run);
    assert.false(runner.diving);
    assert.strictEqual(runner.moveTime, 0);
  });
});
