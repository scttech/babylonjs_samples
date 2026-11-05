QUnit.module("stepsOf", () => {
  QUnit.test("no time is no steps", (assert) => {
    assert.deepEqual(stepsOf(0), []);
    assert.deepEqual(stepsOf(-1), []);
  });

  QUnit.test("a time that is short enough is one step", (assert) => {
    assert.deepEqual(stepsOf(0.03), [0.03]);
    assert.deepEqual(stepsOf(MAX_STEP), [MAX_STEP]);
  });

  QUnit.test("a longer one is cut into steps that are all the same, and none is longer than the longest", (assert) => {
    for (const seconds of [0.06, 0.1, 0.15, 0.2, 1]) {
      const steps = stepsOf(seconds);

      assert.true(steps.every((step) => step <= MAX_STEP + 1e-12), `${seconds}: ${steps.length} steps`);
      assert.true(Math.abs(steps.reduce((a, b) => a + b, 0) - seconds) < 1e-9, `${seconds} adds up`);
      assert.true(steps.every((step) => step === steps[0]), `${seconds} are the same`);
    }
  });

  QUnit.test("it takes as few as will do", (assert) => {
    assert.strictEqual(stepsOf(0.1).length, 2);
    assert.strictEqual(stepsOf(0.15).length, 3);
  });
});

QUnit.module("GameSpeed", () => {
  QUnit.test("begins at the usual speed, and says so", (assert) => {
    const speed = new GameSpeed();

    assert.strictEqual(speed.value, 1);
    assert.strictEqual(speed.label, "×1");
  });

  QUnit.test("cycle goes through the speeds of the table, and round again", (assert) => {
    const speed = new GameSpeed();
    const seen = [speed.value];
    for (let i = 0; i < SPEEDS.length; i++) seen.push(speed.cycle());

    assert.deepEqual(seen, [...SPEEDS, SPEEDS[0]]);
  });

  QUnit.test("the speeds begin with the usual, and each is faster than the one before", (assert) => {
    assert.strictEqual(SPEEDS[0], 1);
    for (let i = 1; i < SPEEDS.length; i++) assert.true(SPEEDS[i] > SPEEDS[i - 1]);
  });

  QUnit.test("a faster game takes as much more time in a frame, in as many steps as it needs", (assert) => {
    const speed = new GameSpeed();
    speed.cycle();
    const steps = speed.steps(0.016);

    assert.true(Math.abs(steps.reduce((a, b) => a + b, 0) - 0.016 * SPEEDS[1]) < 1e-9);
    assert.true(steps.every((step) => step <= MAX_STEP));
  });

  QUnit.test("the biggest frame, at the fastest speed, is steps that are none too long", (assert) => {
    const speed = new GameSpeed();
    for (let i = 0; i < SPEEDS.length - 1; i++) speed.cycle();
    const steps = speed.steps(1);

    assert.true(steps.every((step) => step <= MAX_STEP + 1e-12));
    assert.true(Math.abs(steps.reduce((a, b) => a + b, 0) - MAX_STEP * SPEEDS[SPEEDS.length - 1]) < 1e-9, "a frame is no more than the longest step, as it always was, times the speed");
  });

  QUnit.test("a game at twice the speed gets to the same place in half the frames: the same as a game played twice as long", (assert) => {
    const route = routeFor(parseMap(MAPS[0]));
    const walkers = [new Walker(route, 2), new Walker(route, 2)];
    const fast = new GameSpeed();
    fast.cycle();
    const slow = new GameSpeed();
    for (let frame = 0; frame < 100; frame++) {
      for (const step of slow.steps(0.016)) walkers[0].update(step);
    }
    for (let frame = 0; frame < 50; frame++) {
      for (const step of fast.steps(0.016)) walkers[1].update(step);
    }

    assert.true(Math.abs(walkers[0].distance - walkers[1].distance) < 1e-9);
  });
});
