QUnit.module("PLAYER_LIMITS", () => {
  QUnit.test("every limit has a start that is between its ends, and a step that fits", (assert) => {
    for (const [name, limit] of Object.entries(PLAYER_LIMITS)) {
      assert.ok(limit.min <= limit.start && limit.start <= limit.max, name);
      assert.ok(limit.step > 0 && limit.step <= limit.max - limit.min, name);
    }
  });

  QUnit.test("speed never reaches nothing, because a clip at no speed is a picture", (assert) => {
    assert.ok(PLAYER_LIMITS.speed.min > 0);
  });
});

QUnit.module("clampTo", () => {
  const limit = { min: 0.5, max: 2, start: 1 };

  QUnit.test("holds a number between the ends", (assert) => {
    assert.strictEqual(clampTo(limit, 1.5), 1.5);
    assert.strictEqual(clampTo(limit, 0), 0.5);
    assert.strictEqual(clampTo(limit, 10), 2);
  });

  QUnit.test("a number that is not a number becomes the start", (assert) => {
    assert.strictEqual(clampTo(limit, NaN), 1);
    assert.strictEqual(clampTo(limit, undefined), 1);
    assert.strictEqual(clampTo(limit, Infinity), 1);
  });
});

QUnit.module("fadeAmount", () => {
  QUnit.test("is 0 at the start and 1 at the end", (assert) => {
    assert.strictEqual(fadeAmount(0, 1), 0);
    assert.strictEqual(fadeAmount(1, 1), 1);
  });

  QUnit.test("is halfway at half the time", (assert) => {
    assert.ok(Math.abs(fadeAmount(0.5, 1) - 0.5) < 1e-9);
  });

  QUnit.test("eases: it is slower than a straight line at the start, and faster in the middle", (assert) => {
    assert.ok(fadeAmount(0.1, 1) < 0.1);
    assert.ok(fadeAmount(0.9, 1) > 0.9);
  });

  QUnit.test("only ever goes up", (assert) => {
    let last = -1;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const now = fadeAmount(t, 1);
      assert.ok(now >= last, `at ${t}`);
      last = now;
    }
  });

  QUnit.test("stays between 0 and 1 whatever the time", (assert) => {
    assert.strictEqual(fadeAmount(-3, 1), 0);
    assert.strictEqual(fadeAmount(30, 1), 1);
  });

  QUnit.test("a fade that takes no time is over at once", (assert) => {
    assert.strictEqual(fadeAmount(0, 0), 1);
    assert.strictEqual(fadeAmount(0, -1), 1);
  });
});

QUnit.module("fadeWeights", () => {
  QUnit.test("always add up to 1, so the model is never pulled out of shape", (assert) => {
    for (let t = 0; t <= 1.0001; t += 0.07) {
      const { incoming, outgoing } = fadeWeights(t, 1);
      assert.ok(Math.abs(incoming + outgoing - 1) < 1e-12, `at ${t}`);
    }
  });

  QUnit.test("begin with all the weight on the clip going out, and end with all of it on the one coming in", (assert) => {
    assert.deepEqual(fadeWeights(0, 0.5), { incoming: 0, outgoing: 1 });
    assert.deepEqual(fadeWeights(0.5, 0.5), { incoming: 1, outgoing: 0 });
  });
});
