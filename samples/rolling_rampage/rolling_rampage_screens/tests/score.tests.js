QUnit.module("levelScore", () => {
  QUnit.test("a finished level is worth the bonus, and a hundred for every whole second left", (assert) => {
    assert.strictEqual(levelScore(0), LEVEL_BONUS);
    assert.strictEqual(levelScore(10), LEVEL_BONUS + 10 * SECOND_POINTS);
    assert.strictEqual(levelScore(23), 500 + 2300);
  });

  QUnit.test("part of a second isn't counted", (assert) => {
    assert.strictEqual(levelScore(10.99), levelScore(10));
    assert.strictEqual(levelScore(0.9), LEVEL_BONUS);
  });

  QUnit.test("time can't be worth less than nothing", (assert) => {
    assert.strictEqual(levelScore(-5), LEVEL_BONUS);
  });

  QUnit.test("more time left is always worth more", (assert) => {
    for (let seconds = 0; seconds < 60; seconds++) assert.true(levelScore(seconds + 1) > levelScore(seconds), `${seconds}`);
  });
});

QUnit.module("formatScore", () => {
  QUnit.test("puts a comma between thousands", (assert) => {
    assert.strictEqual(formatScore(0), "0");
    assert.strictEqual(formatScore(999), "999");
    assert.strictEqual(formatScore(1000), "1,000");
    assert.strictEqual(formatScore(12345), "12,345");
    assert.strictEqual(formatScore(1234567), "1,234,567");
  });

  QUnit.test("shows a whole number", (assert) => {
    assert.strictEqual(formatScore(1500.7), "1,500");
  });
});

QUnit.module("Tally", () => {
  QUnit.test("starts with nothing finished and a score of 0", (assert) => {
    const tally = new Tally();

    assert.strictEqual(tally.completed, 0);
    assert.strictEqual(tally.total, 0);
  });

  QUnit.test("adding a level says what it was worth, and counts it", (assert) => {
    const tally = new Tally();

    assert.strictEqual(tally.add(20), levelScore(20));

    assert.strictEqual(tally.completed, 1);
    assert.strictEqual(tally.total, levelScore(20));
  });

  QUnit.test("the total is the sum of the levels", (assert) => {
    const tally = new Tally();
    tally.add(20);
    tally.add(5.5);
    tally.add(0);

    assert.strictEqual(tally.total, levelScore(20) + levelScore(5) + levelScore(0));
    assert.strictEqual(tally.completed, 3);
  });

  QUnit.test("it keeps what each level was worth, in order, with the seconds that were left", (assert) => {
    const tally = new Tally();
    tally.add(12.7);
    tally.add(3);

    assert.deepEqual(tally.levels, [{ remaining: 12, points: levelScore(12) }, { remaining: 3, points: levelScore(3) }]);
  });

  QUnit.test("reset starts again", (assert) => {
    const tally = new Tally();
    tally.add(20);

    tally.reset();

    assert.strictEqual(tally.total, 0);
    assert.strictEqual(tally.completed, 0);
  });
});
