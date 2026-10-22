QUnit.module("speedFor", () => {
  QUnit.test("starts at the normal running speed", (assert) => {
    assert.strictEqual(speedFor(0), RUN_SPEED);
  });

  QUnit.test("gets faster the further he has run", (assert) => {
    assert.true(speedFor(500) > speedFor(100));
    assert.true(speedFor(100) > speedFor(0));
  });

  QUnit.test("rises by SPEED_RAMP for every unit of distance", (assert) => {
    assert.true(Math.abs(speedFor(100) - (RUN_SPEED + 100 * SPEED_RAMP)) < 1e-9);
  });

  QUnit.test("never goes past MAX_SPEED", (assert) => {
    assert.strictEqual(speedFor(1e6), MAX_SPEED);
  });

  QUnit.test("MAX_SPEED is faster than the start, or there would be no ramp", (assert) => {
    assert.true(MAX_SPEED > RUN_SPEED);
  });

  QUnit.test("a negative distance counts as none", (assert) => {
    assert.strictEqual(speedFor(-50), RUN_SPEED);
  });
});

QUnit.module("Score", () => {
  QUnit.test("starts with nothing", (assert) => {
    const score = new Score();

    assert.strictEqual(score.distance, 0);
    assert.strictEqual(score.coins, 0);
    assert.strictEqual(score.points, 0);
    assert.strictEqual(score.combo, 0);
    assert.strictEqual(score.total, 0);
    assert.strictEqual(score.multiplier, 1);
  });

  QUnit.test("every unit of distance is a point, and only whole units count", (assert) => {
    const score = new Score();

    score.setDistance(12.9);

    assert.strictEqual(score.total, 12);
  });

  QUnit.test("the distance never goes backwards", (assert) => {
    const score = new Score();
    score.setDistance(40);

    score.setDistance(10);

    assert.strictEqual(score.distance, 40);
  });

  QUnit.test("a coin is worth COIN_POINTS and is counted", (assert) => {
    const score = new Score();

    score.collectCoin();

    assert.strictEqual(score.coins, 1);
    assert.strictEqual(score.points, COIN_POINTS);
    assert.strictEqual(score.total, COIN_POINTS);
  });

  QUnit.test("the total adds the distance to the points", (assert) => {
    const score = new Score();
    score.setDistance(100);
    score.collectCoin();

    assert.strictEqual(score.total, 100 + COIN_POINTS);
  });

  QUnit.test("a clean move is worth CLEAN_MOVE_POINTS and starts a combo", (assert) => {
    const score = new Score();

    score.cleanMove();

    assert.strictEqual(score.points, CLEAN_MOVE_POINTS);
    assert.strictEqual(score.combo, 1);
    assert.strictEqual(score.comboTimer, COMBO_TIME);
  });

  QUnit.test("the multiplier rises by one for every COMBO_STEP clean moves", (assert) => {
    const score = new Score();

    for (let i = 0; i < COMBO_STEP - 1; i++) score.cleanMove();
    assert.strictEqual(score.multiplier, 1);

    score.cleanMove();
    assert.strictEqual(score.multiplier, 2);

    for (let i = 0; i < COMBO_STEP; i++) score.cleanMove();
    assert.strictEqual(score.multiplier, 3);
  });

  QUnit.test("the multiplier stops at MAX_MULTIPLIER", (assert) => {
    const score = new Score();

    for (let i = 0; i < COMBO_STEP * MAX_MULTIPLIER * 3; i++) score.cleanMove();

    assert.strictEqual(score.multiplier, MAX_MULTIPLIER);
  });

  QUnit.test("coins are worth more with a multiplier", (assert) => {
    const score = new Score();
    for (let i = 0; i < COMBO_STEP; i++) score.cleanMove();
    const before = score.points;

    score.collectCoin();

    assert.strictEqual(score.points - before, COIN_POINTS * 2);
  });

  QUnit.test("a clean move is worth the multiplier he had before it, not the one it earns", (assert) => {
    const score = new Score();
    for (let i = 0; i < COMBO_STEP - 1; i++) score.cleanMove();
    const before = score.points;

    score.cleanMove(); // the move that raises the multiplier to 2

    assert.strictEqual(score.points - before, CLEAN_MOVE_POINTS);
  });

  QUnit.test("the combo runs out if he is too slow to make the next clean move", (assert) => {
    const score = new Score();
    score.cleanMove();

    score.update(COMBO_TIME - 0.1);
    assert.strictEqual(score.combo, 1, "still going");

    score.update(0.2);
    assert.strictEqual(score.combo, 0, "lost");
    assert.strictEqual(score.multiplier, 1);
  });

  QUnit.test("another clean move starts the timer again", (assert) => {
    const score = new Score();
    score.cleanMove();
    score.update(COMBO_TIME - 0.5);

    score.cleanMove();
    score.update(COMBO_TIME - 0.5);

    assert.strictEqual(score.combo, 2);
  });

  QUnit.test("losing the combo keeps the points already won", (assert) => {
    const score = new Score();
    score.cleanMove();
    score.update(COMBO_TIME + 1);

    assert.strictEqual(score.points, CLEAN_MOVE_POINTS);
  });

  QUnit.test("update() with no combo does nothing", (assert) => {
    const score = new Score();

    score.update(10);

    assert.strictEqual(score.combo, 0);
    assert.strictEqual(score.comboTimer, 0);
  });

  QUnit.test("reset() puts everything back to the start", (assert) => {
    const score = new Score();
    score.setDistance(80);
    score.collectCoin();
    score.cleanMove();

    score.reset();

    assert.strictEqual(score.total, 0);
    assert.strictEqual(score.coins, 0);
    assert.strictEqual(score.combo, 0);
    assert.strictEqual(score.comboTimer, 0);
  });
});
