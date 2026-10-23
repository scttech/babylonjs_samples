QUnit.module("soundForMove", () => {
  QUnit.test("a jump, a vault, a slide and a roll each have a sound, and they are all different", (assert) => {
    const names = [MOVES.jump, MOVES.vault, MOVES.slide, MOVES.roll].map(soundForMove);

    assert.true(names.every((name) => typeof name === "string"));
    assert.strictEqual(new Set(names).size, 4);
  });

  QUnit.test("every sound a move names is one that exists", (assert) => {
    for (const name of Object.values(MOVE_SOUNDS)) assert.true(name in SOUNDS, name);
  });

  QUnit.test("running has no sound of its own, and neither does a crash (the game does all of that itself)", (assert) => {
    assert.strictEqual(soundForMove(MOVES.run), null);
    assert.strictEqual(soundForMove(MOVES.crash), null);
  });

  QUnit.test("a move that isn't one has none", (assert) => {
    assert.strictEqual(soundForMove("dance"), null);
    assert.strictEqual(soundForMove(undefined), null);
  });
});

QUnit.module("comboMilestone", () => {
  QUnit.test("reaching a multiple of COMBO_MILESTONE is a milestone", (assert) => {
    assert.true(comboMilestone(COMBO_MILESTONE - 1, COMBO_MILESTONE));
    assert.true(comboMilestone(2 * COMBO_MILESTONE - 1, 2 * COMBO_MILESTONE));
    assert.true(comboMilestone(3 * COMBO_MILESTONE - 1, 3 * COMBO_MILESTONE));
  });

  QUnit.test("the step after a milestone isn't one", (assert) => {
    assert.false(comboMilestone(COMBO_MILESTONE, COMBO_MILESTONE + 1));
  });

  QUnit.test("nor is anything on the way", (assert) => {
    for (let before = 0; before < COMBO_MILESTONE - 1; before++) assert.false(comboMilestone(before, before + 1), `${before}`);
  });

  QUnit.test("a combo that is lost (it goes back to 0) is not a milestone", (assert) => {
    assert.false(comboMilestone(COMBO_MILESTONE + 2, 0));
    assert.false(comboMilestone(COMBO_MILESTONE, 0));
  });

  QUnit.test("it works however the combo gets there, even if it jumps over a milestone", (assert) => {
    assert.true(comboMilestone(COMBO_MILESTONE - 2, COMBO_MILESTONE + 1));
  });

  QUnit.test("staying where it is isn't a milestone, even on one", (assert) => {
    assert.false(comboMilestone(COMBO_MILESTONE, COMBO_MILESTONE));
  });

  QUnit.test("a combo of 5 is the first, as the game says", (assert) => {
    assert.strictEqual(COMBO_MILESTONE, 5);
  });
});

QUnit.module("CameraShake", () => {
  // A shake whose "random" is a fixed series of numbers, so what it does can be checked.
  const shakeWith = (...values) => {
    let i = 0;
    return new CameraShake({ random: () => values[i++ % values.length] });
  };

  QUnit.test("isn't shaking to begin with, and the offset is nothing", (assert) => {
    const shake = new CameraShake();

    assert.false(shake.active);
    assert.deepEqual(shake.update(0.016), { x: 0, y: 0 });
  });

  QUnit.test("start() begins a shake", (assert) => {
    const shake = new CameraShake();

    shake.start();

    assert.true(shake.active);
  });

  QUnit.test("it is thrown about by the strength it was started with, at most", (assert) => {
    const shake = shakeWith(1, 0); // the biggest throw in x, the biggest the other way in y
    shake.start(0.4);

    const offset = shake.update(0.001);

    assert.true(offset.x > 0.39 && offset.x <= 0.4, `${offset.x}`);
    assert.true(offset.y < -0.39 && offset.y >= -0.4, `${offset.y}`);
  });

  QUnit.test("it dies away: the offset gets smaller as time passes", (assert) => {
    const early = shakeWith(1);
    early.start(0.4);
    const late = shakeWith(1);
    late.start(0.4);
    late.update(SHAKE_TIME * 0.6);

    assert.true(late.update(0.001).x < early.update(0.001).x);
  });

  QUnit.test("after SHAKE_TIME it has stopped, and the offset is nothing again", (assert) => {
    const shake = shakeWith(1);
    shake.start();

    shake.update(SHAKE_TIME + 0.1);

    assert.false(shake.active);
    assert.deepEqual(shake.update(0.016), { x: 0, y: 0 });
  });

  QUnit.test("with no time passing (a pause) the offset stays as it was, and the shake doesn't run down", (assert) => {
    const shake = shakeWith(1, 1);
    shake.start();
    const first = shake.update(0.05);
    const left = shake.timeLeft;

    const paused = shake.update(0);

    assert.deepEqual(paused, first);
    assert.strictEqual(shake.timeLeft, left);
  });

  QUnit.test("starting again begins it afresh", (assert) => {
    const shake = shakeWith(1);
    shake.start();
    shake.update(SHAKE_TIME - 0.01);

    shake.start();

    assert.strictEqual(shake.timeLeft, SHAKE_TIME);
  });

  QUnit.test("stop() ends it at once, and the offset is nothing", (assert) => {
    const shake = shakeWith(1);
    shake.start();
    shake.update(0.05);

    shake.stop();

    assert.false(shake.active);
    assert.deepEqual(shake.update(0.016), { x: 0, y: 0 });
  });

  QUnit.test("a bigger strength throws further", (assert) => {
    const small = shakeWith(1);
    small.start(0.1);
    const big = shakeWith(1);
    big.start(0.8);

    assert.true(big.update(0.01).x > small.update(0.01).x);
  });

  QUnit.test("the offset is always within the strength, whatever the random numbers are", (assert) => {
    const shake = new CameraShake();
    shake.start(0.45);
    let worst = 0;

    for (let t = 0; t < 40; t++) {
      const { x, y } = shake.update(0.02);
      worst = Math.max(worst, Math.abs(x), Math.abs(y));
    }

    assert.true(worst <= 0.45);
  });
});
