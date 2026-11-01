QUnit.module("a round", () => {
  const hunting = (number = 1, random = () => 0.99) => {
    const round = new Round(number, random);
    round.start();
    return round;
  };

  QUnit.test("it is ready, and begins when it is started, once", (assert) => {
    const round = new Round(1);
    assert.strictEqual(round.state, "ready");
    assert.false(round.running);
    assert.true(round.start());
    assert.true(round.running);
    assert.false(round.start());
  });

  QUnit.test("nothing happens to a round that is not running", (assert) => {
    const round = new Round(1);
    round.update(10, { dread: 1 });
    assert.strictEqual(round.sanity, ROUNDS.sanity);
    assert.strictEqual(round.hurt("ghoul"), 0);
    assert.false(round.capture());
  });

  QUnit.test("each kind takes its own from health and some of it from sanity", (assert) => {
    const round = hunting();
    assert.strictEqual(round.hurt("mummy"), ROUNDS.damage.mummy);
    assert.strictEqual(round.health, ROUNDS.health - ROUNDS.damage.mummy);
    assert.strictEqual(round.sanity, ROUNDS.sanity - ROUNDS.damage.mummy * ROUNDS.fright);
    assert.true(ROUNDS.damage.mummy > ROUNDS.damage.spider, "a mummy is worse than a spider");
    assert.strictEqual(round.hurt("a thing nobody thought of"), 10, "an unknown kind takes a ten");
  });

  QUnit.test("health at nothing loses the round, once, with the reason", (assert) => {
    const round = hunting();
    for (let i = 0; i < 6; i++) round.hurt("mummy");
    assert.strictEqual(round.state, "lost");
    assert.strictEqual(round.reason, "health");
    const lost = round.take().filter((e) => e.kind === "lost");
    assert.strictEqual(lost.length, 1);
    round.hurt("mummy");
    assert.strictEqual(round.take().length, 0, "a lost round hears of nothing more");
  });

  QUnit.test("the dark takes sanity, dread takes more, light in a quiet moment gives it back", (assert) => {
    const after = (situation, from = 60) => {
      const round = hunting();
      round.sanity = from;
      round.update(2, situation);
      return round.sanity;
    };
    assert.true(after({ lightOn: false }) < 60);
    assert.true(after({ lightOn: false, dread: 1 }) < after({ lightOn: false, dread: 0 }));
    assert.true(after({ lightOn: true, dread: 0 }) > 60, "light and quiet restore it");
    assert.true(after({ lightOn: true, dread: 0.8 }) < 60, "light is no comfort with something right there");
    assert.true(after({ lightOn: false, watched: 2 }) < after({ lightOn: false, watched: 0 }));
    assert.true(after({ lightOn: true, dread: 0 }, 99.5) <= ROUNDS.sanity, "never over the most");
  });

  QUnit.test("sanity at nothing loses the round too", (assert) => {
    const round = hunting();
    round.sanity = 0.2;
    round.update(1, { lightOn: false, dread: 1 });
    assert.strictEqual(round.state, "lost");
    assert.strictEqual(round.reason, "sanity");
  });

  QUnit.test("a capture gives sanity back, and the last ghost wins the round, with a score, once", (assert) => {
    const round = hunting(3); // two ghosts
    assert.strictEqual(round.ghosts, 2);
    round.sanity = 40;
    assert.true(round.capture());
    assert.strictEqual(round.sanity, 40 + ROUNDS.restore.capture);
    assert.strictEqual(round.state, "hunting");
    round.update(30, { lightOn: true });
    round.capture();
    assert.strictEqual(round.state, "won");
    assert.true(round.score > 2 * ROUNDS.score.capture);
    assert.strictEqual(round.take().filter((e) => e.kind === "won").length, 1);
    assert.false(round.capture(), "a won round takes no more");
  });

  QUnit.test("tricks come when sanity is low and not when it is high, and more often the lower it is", (assert) => {
    const tricks = (sanity) => {
      let n = 0;
      const round = hunting(1, () => (n++ % 100) / 100 + 0.005);
      for (let i = 0; i < 600; i++) {
        round.sanity = sanity;
        round.update(1 / 30, { lightOn: true, dread: 0 });
      }
      return round.take().filter((e) => e.kind === "trick").length;
    };
    assert.strictEqual(tricks(90), 0);
    assert.true(tricks(10) > tricks(45), `${tricks(10)} at 10 and ${tricks(45)} at 45`);
    assert.true(ROUNDS.trick.kinds.length > 0);
  });

  QUnit.test("the result says how it went", (assert) => {
    const round = hunting();
    round.update(20, { lightOn: true });
    round.capture();
    const result = round.result();
    assert.strictEqual(result.outcome, "won");
    assert.strictEqual(result.captured, 1);
    assert.strictEqual(result.number, 1);
    assert.true(Math.abs(result.time - 20) < 1e-9);
    assert.true(result.score > 0);
  });
});
