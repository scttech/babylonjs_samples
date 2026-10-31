QUnit.module("LoadProgress", () => {
  QUnit.test("with nothing to load, everything is loaded", (assert) => {
    const progress = new LoadProgress();
    assert.strictEqual(progress.fraction, 1);
    assert.true(progress.done);
  });

  QUnit.test("nothing has loaded until something says so, and then it is the share of the weight", (assert) => {
    const progress = new LoadProgress();
    progress.add("big", 3);
    progress.add("small", 1);
    assert.strictEqual(progress.fraction, 0);
    assert.false(progress.done);

    progress.complete("small");
    assert.strictEqual(progress.fraction, 0.25);

    progress.update("big", 0.5);
    assert.strictEqual(progress.fraction, (1 + 1.5) / 4);
  });

  QUnit.test("it never goes backwards", (assert) => {
    const progress = new LoadProgress();
    progress.add("a", 1);
    progress.update("a", 0.8);
    progress.update("a", 0.3);
    assert.strictEqual(progress.fraction, 0.8);
  });

  QUnit.test("a number that is not a share is held to 0 to 1, and a number that isn't one is 0", (assert) => {
    const progress = new LoadProgress();
    progress.add("a", 1);
    progress.update("a", 7);
    assert.strictEqual(progress.fraction, 1);
    const other = new LoadProgress();
    other.add("a", 1);
    other.update("a", NaN);
    other.update("a", undefined);
    assert.strictEqual(other.fraction, 0);
  });

  QUnit.test("something that was never added is added, with a weight of 1", (assert) => {
    const progress = new LoadProgress();
    progress.add("a", 1);
    progress.update("b", 1);
    assert.strictEqual(progress.fraction, 0.5);
  });

  QUnit.test("adding something again changes its weight and keeps how far it had got", (assert) => {
    const progress = new LoadProgress();
    progress.add("a", 1);
    progress.add("b", 1);
    progress.complete("a");
    progress.add("a", 3);
    assert.strictEqual(progress.fraction, 3 / 4);
  });

  QUnit.test("a weight that isn't a number above 0 counts as 1", (assert) => {
    const progress = new LoadProgress();
    progress.add("a", 0);
    progress.add("b", -4);
    progress.complete("a");
    assert.strictEqual(progress.fraction, 0.5);
  });

  QUnit.test("the percent is a whole number, and is 100 only when everything is done", (assert) => {
    const progress = new LoadProgress();
    progress.add("a", 1000);
    progress.update("a", 0.426);
    assert.strictEqual(progress.percent, 42);
    progress.update("a", 0.9999);
    assert.strictEqual(progress.percent, 99);
    progress.complete("a");
    assert.strictEqual(progress.percent, 100);
  });

  QUnit.test("busy is the heaviest thing still loading, and null when all is done", (assert) => {
    const progress = new LoadProgress();
    progress.add("small", 1);
    progress.add("big", 9);
    progress.add("middle", 5);
    assert.strictEqual(progress.busy, "big");
    progress.complete("big");
    assert.strictEqual(progress.busy, "middle");
    progress.complete("middle");
    progress.complete("small");
    assert.strictEqual(progress.busy, null);
  });

  QUnit.test("listeners are told about every change", (assert) => {
    const progress = new LoadProgress();
    const seen = [];
    progress.onChange((p) => seen.push(p.fraction));
    progress.add("a", 1);
    progress.update("a", 0.5);
    progress.complete("a");
    assert.deepEqual(seen, [0, 0.5, 1]);
  });
});

QUnit.module("easeToward and formatPercent", () => {
  QUnit.test("easeToward moves toward the target, a share of the way each second, and never past it", (assert) => {
    const once = easeToward(0, 1, 0.1, 6);
    assert.true(once > 0 && once < 1);
    assert.true(easeToward(0, 1, 10, 6) <= 1);
    assert.true(easeToward(0.9, 1, 0.1, 6) > 0.9);
  });

  QUnit.test("easeToward never goes backwards, and a longer wait goes further", (assert) => {
    assert.strictEqual(easeToward(0.8, 0.5, 1), 0.8);
    assert.strictEqual(easeToward(0.5, 0.5, 1), 0.5);
    assert.true(easeToward(0, 1, 0.5) > easeToward(0, 1, 0.1));
  });

  QUnit.test("with no time passed, it stays where it is", (assert) => {
    assert.strictEqual(easeToward(0.3, 1, 0), 0.3);
  });

  QUnit.test("formatPercent writes a share as whole percent, and 100% only for all", (assert) => {
    assert.strictEqual(formatPercent(0), "0%");
    assert.strictEqual(formatPercent(0.426), "42%");
    assert.strictEqual(formatPercent(0.9999), "99%");
    assert.strictEqual(formatPercent(1), "100%");
    assert.strictEqual(formatPercent(3), "100%");
    assert.strictEqual(formatPercent(-1), "0%");
  });
});
