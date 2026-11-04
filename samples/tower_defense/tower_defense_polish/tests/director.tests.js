QUnit.module("Director", () => {
  // Two small waves, and quick rules, so that a game is a few seconds of play.
  const waves = [
    { groups: [{ kind: "grunt", count: 2, gap: 1 }] },
    { groups: [{ kind: "scout", count: 1, gap: 1 }] },
  ];
  const rules = { lives: 5, firstWait: 10, pause: 4, bonus: 20 };
  const fresh = () => new Director(waves, rules);

  // Runs for `seconds` in steps of a tenth, with `alive` enemies on the board all that time, and says every event.
  const run = (director, seconds, alive = 0) => {
    const events = [];
    for (let t = 0; t < seconds - 1e-9; t += 0.1) events.push(...director.update(0.1, alive));
    return events;
  };

  QUnit.test("begins getting ready, with all its lives, and the countdown to the first wave", (assert) => {
    const director = fresh();

    assert.strictEqual(director.phase, "preparing");
    assert.strictEqual(director.lives, 5);
    assert.strictEqual(director.countdown, 10);
    assert.strictEqual(director.number, 1);
    assert.false(director.over);
  });

  QUnit.test("the real rules are in the RULES table", (assert) => {
    const director = new Director();

    assert.strictEqual(director.lives, RULES.lives);
    assert.strictEqual(director.countdown, RULES.firstWait);
    assert.strictEqual(director.waves, WAVES);
  });

  QUnit.test("while it is getting ready, nothing happens, and the countdown goes down", (assert) => {
    const director = fresh();

    assert.deepEqual(run(director, 5), []);
    assert.true(Math.abs(director.countdown - 5) < 1e-9);
    assert.strictEqual(director.phase, "preparing");
  });

  QUnit.test("when the countdown is over, the wave begins, and the first enemy comes on in the same moment", (assert) => {
    const events = run(fresh(), 10.2);

    assert.deepEqual(events.map((event) => event.type), ["wave", "spawn"]);
    assert.deepEqual(events[0], { type: "wave", number: 1, total: 2 });
    assert.strictEqual(events[1].kind, "grunt");
  });

  QUnit.test("the time that the countdown ran over is not time that the wave has been going", (assert) => {
    const director = fresh();
    run(director, 9.9);
    const events = director.update(5, 0);

    assert.deepEqual(events.map((event) => event.type), ["wave", "spawn"], "one enemy, and not those of five seconds of wave");
  });

  QUnit.test("the enemies come on as the wave says, and each says how much tougher than the table it is", (assert) => {
    const director = fresh();
    const spawns = run(director, 14, 1).filter((event) => event.type === "spawn");

    assert.deepEqual(spawns.map((event) => event.kind), ["grunt", "grunt"]);
    assert.strictEqual(spawns[0].healthScale, healthScaleFor(0));
  });

  QUnit.test("a wave is not beaten while any enemy is on the board, even when every one has come on", (assert) => {
    const director = fresh();
    run(director, 20, 1);

    assert.strictEqual(director.phase, "running");
    assert.strictEqual(director.number, 1);
  });

  QUnit.test("when they are all on and none is left, the wave is beaten, with a bonus, and the next countdown begins", (assert) => {
    const director = fresh();
    run(director, 12, 1);
    const events = director.update(0.1, 0);

    assert.deepEqual(events.map((event) => event.type), ["cleared"]);
    assert.deepEqual(events[0], { type: "cleared", number: 1, bonus: 20 });
    assert.strictEqual(director.phase, "preparing");
    assert.strictEqual(director.number, 2);
    assert.strictEqual(director.countdown, rules.pause, "the countdown for the next wave begins");
  });

  QUnit.test("the bonus is bigger for a later wave", (assert) => {
    const director = fresh();
    run(director, 12, 1);
    director.update(0.1, 0);
    run(director, 4.2, 1);
    run(director, 2, 1);
    const cleared = director.update(0.1, 0).find((event) => event.type === "cleared");

    assert.true(cleared.bonus > 20);
  });

  QUnit.test("beating the last wave wins the game, once, and then nothing more happens", (assert) => {
    const director = fresh();
    const events = [];
    events.push(...run(director, 12, 1), ...director.update(0.1, 0), ...run(director, 4.2, 1), ...run(director, 2, 1), ...director.update(0.1, 0));

    assert.deepEqual(events.filter((event) => event.type === "won").length, 1);
    assert.strictEqual(director.phase, "won");
    assert.true(director.over);
    assert.deepEqual(run(director, 30, 0), []);
  });

  QUnit.test("callNext starts the next wave at once, in the next frame, and only while getting ready", (assert) => {
    const director = fresh();
    director.callNext();
    const events = director.update(0.016, 0);

    assert.deepEqual(events.map((event) => event.type), ["wave", "spawn"]);
    director.callNext();
    assert.strictEqual(director.phase, "running");
    assert.strictEqual(director.countdown <= 0, true);
  });

  QUnit.test("an enemy that gets to the end costs the lives it says", (assert) => {
    const director = fresh();

    assert.deepEqual(director.leak(2), []);
    assert.strictEqual(director.lives, 3);
  });

  QUnit.test("with no lives left the game is lost, once, and nothing more happens", (assert) => {
    const director = fresh();
    director.leak(4);
    const events = director.leak(3);

    assert.deepEqual(events, [{ type: "lost" }]);
    assert.strictEqual(director.lives, 0, "lives never go below nothing");
    assert.strictEqual(director.phase, "lost");
    assert.deepEqual(director.leak(1), []);
    assert.deepEqual(run(director, 30, 0), []);
  });

  QUnit.test("a game that is lost cannot be started with callNext", (assert) => {
    const director = fresh();
    director.leak(99);
    director.callNext();

    assert.deepEqual(director.update(1, 0), []);
  });

  QUnit.test("leaking in the middle of a wave does not change which wave it is", (assert) => {
    const director = fresh();
    run(director, 11, 1);
    director.leak(1);

    assert.strictEqual(director.phase, "running");
    assert.strictEqual(director.number, 1);
  });

  QUnit.test("a whole game of the real waves, with the enemies beaten as they come, is won, with every wave in order", (assert) => {
    const director = new Director();
    const numbers = [];
    let alive = 0;
    for (let t = 0; t < 3000 && !director.over; t += 0.1) {
      for (const event of director.update(0.1, alive)) {
        if (event.type === "wave") numbers.push(event.number);
        if (event.type === "spawn") alive++;
      }
      alive = Math.max(0, alive - 1); // one is beaten every tenth of a second
    }

    assert.strictEqual(director.phase, "won");
    assert.deepEqual(numbers, WAVES.map((_, i) => i + 1));
  });
});
