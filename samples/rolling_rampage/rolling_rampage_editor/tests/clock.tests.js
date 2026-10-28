QUnit.module("formatTime", () => {
  QUnit.test("shows minutes and seconds, with the seconds always two digits", (assert) => {
    assert.strictEqual(formatTime(42), "0:42");
    assert.strictEqual(formatTime(5), "0:05");
    assert.strictEqual(formatTime(60), "1:00");
    assert.strictEqual(formatTime(125), "2:05");
  });

  QUnit.test("rounds up, so it only says 0:00 when the time is really out", (assert) => {
    assert.strictEqual(formatTime(41.2), "0:42");
    assert.strictEqual(formatTime(0.01), "0:01");
    assert.strictEqual(formatTime(0), "0:00");
  });

  QUnit.test("never shows a negative time", (assert) => {
    assert.strictEqual(formatTime(-3), "0:00");
  });
});

QUnit.module("Run", () => {
  const level = { time: 40, checkpoints: [{ bonus: 10 }, { bonus: 5 }] };
  const running = () => {
    const run = new Run(level);
    run.start();
    return run;
  };

  QUnit.test("starts ready, with all its time, and doesn't count down until it is started", (assert) => {
    const run = new Run(level);

    run.tick(5);

    assert.strictEqual(run.status, "ready");
    assert.strictEqual(run.remaining, 40);
  });

  QUnit.test("starting makes it running, and it counts down", (assert) => {
    const run = running();

    run.tick(1.5);

    assert.strictEqual(run.status, "running");
    assert.strictEqual(run.remaining, 38.5);
  });

  QUnit.test("it stops at zero, and the time is up", (assert) => {
    const run = running();

    run.tick(39.9);
    assert.strictEqual(run.status, "running");

    run.tick(5);
    assert.strictEqual(run.remaining, 0, "not below zero");
    assert.strictEqual(run.status, "timeup");
  });

  QUnit.test("when the time is up it stays up, and can't be started again", (assert) => {
    const run = running();
    run.tick(100);

    run.start();
    run.tick(10);

    assert.strictEqual(run.status, "timeup");
    assert.strictEqual(run.remaining, 0);
  });

  QUnit.test("reaching a checkpoint adds its bonus, and says how much", (assert) => {
    const run = running();
    run.tick(5);

    assert.strictEqual(run.reachCheckpoint(0), 10);

    assert.strictEqual(run.remaining, 45);
  });

  QUnit.test("each checkpoint's bonus is paid once, and the others are separate", (assert) => {
    const run = running();

    assert.strictEqual(run.reachCheckpoint(0), 10);
    assert.strictEqual(run.reachCheckpoint(0), 0, "again");
    assert.strictEqual(run.reachCheckpoint(1), 5, "another one");
    assert.strictEqual(run.remaining, 55);
  });

  QUnit.test("a checkpoint before the run starts, or after it is over, gives nothing", (assert) => {
    const ready = new Run(level);
    assert.strictEqual(ready.reachCheckpoint(0), 0);
    assert.strictEqual(ready.remaining, 40);

    const over = running();
    over.tick(100);
    assert.strictEqual(over.reachCheckpoint(0), 0);
    assert.strictEqual(over.remaining, 0);

    const won = running();
    won.finish();
    assert.strictEqual(won.reachCheckpoint(0), 0);
  });

  QUnit.test("a bonus that arrives just in time saves the run", (assert) => {
    const run = running();
    run.tick(39.5);

    run.reachCheckpoint(0);

    assert.strictEqual(run.status, "running");
    assert.true(Math.abs(run.remaining - 10.5) < 1e-9);
  });

  QUnit.test("reaching the goal wins a running run, and keeps the time that was left", (assert) => {
    const run = running();
    run.tick(12);

    assert.true(run.finish());

    assert.strictEqual(run.status, "won");
    assert.strictEqual(run.remaining, 28);
  });

  QUnit.test("a won run stops counting down", (assert) => {
    const run = running();
    run.finish();

    run.tick(10);

    assert.strictEqual(run.remaining, 40);
  });

  QUnit.test("the goal doesn't win a run that hasn't started, one that is over, or one already won", (assert) => {
    const ready = new Run(level);
    assert.false(ready.finish());
    assert.strictEqual(ready.status, "ready");

    const over = running();
    over.tick(100);
    assert.false(over.finish());
    assert.strictEqual(over.status, "timeup");

    const won = running();
    won.finish();
    assert.false(won.finish());
  });

  QUnit.test("it warns when the time is nearly out, and only while it is running", (assert) => {
    const run = new Run(level);
    assert.false(run.low, "not before it starts");

    run.start();
    assert.false(run.low, "plenty of time");

    run.tick(40 - TIME_LOW);
    assert.true(run.low, "at the warning time");

    run.reachCheckpoint(0);
    assert.false(run.low, "a bonus lifts it clear again");

    run.tick(100);
    assert.false(run.low, "and not once it is over");
  });
});

QUnit.module("Run.hit", () => {
  const level = { time: 40, checkpoints: [{ bonus: 10 }] };
  const running = () => {
    const run = new Run(level);
    run.start();
    return run;
  };

  QUnit.test("a hit takes the penalty off the clock, and says how much", (assert) => {
    const run = running();

    assert.strictEqual(run.hit(), HIT_PENALTY);

    assert.strictEqual(run.remaining, 40 - HIT_PENALTY);
  });

  QUnit.test("a second hit straight away is the same collision, and costs nothing", (assert) => {
    const run = running();
    run.hit();

    assert.strictEqual(run.hit(), 0);
    run.tick(HIT_COOLDOWN / 2);
    assert.strictEqual(run.hit(), 0, "and half the cooldown later");

    assert.strictEqual(run.remaining, 40 - HIT_PENALTY - HIT_COOLDOWN / 2);
  });

  QUnit.test("after the cooldown, a new hit counts again", (assert) => {
    const run = running();
    run.hit();
    run.tick(HIT_COOLDOWN + 0.01);

    assert.strictEqual(run.hit(), HIT_PENALTY);
  });

  QUnit.test("a hit before the run starts, or after it is over, costs nothing", (assert) => {
    const ready = new Run(level);
    assert.strictEqual(ready.hit(), 0);
    assert.strictEqual(ready.remaining, 40);

    const won = running();
    won.finish();
    assert.strictEqual(won.hit(), 0);
    assert.strictEqual(won.remaining, 40);

    const over = running();
    over.tick(100);
    assert.strictEqual(over.hit(), 0);
  });

  QUnit.test("a hit can only take the time there is, and that ends the run", (assert) => {
    const run = running();
    run.tick(40 - 1);

    assert.strictEqual(run.hit(), 1, "it takes the one second that is left");

    assert.strictEqual(run.remaining, 0);
    assert.strictEqual(run.status, "timeup");
  });

  QUnit.test("the cooldown only runs while the run does", (assert) => {
    const run = running();
    run.hit();
    run.finish();

    run.tick(100);

    assert.strictEqual(run.cooldown, HIT_COOLDOWN);
  });
});
