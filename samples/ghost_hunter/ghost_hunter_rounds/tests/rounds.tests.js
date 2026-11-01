QUnit.module("levelFor and roundScore", () => {
  QUnit.test("the first round is gentle, each is harder, and after the last it stays as hard as the last", (assert) => {
    assert.strictEqual(levelFor(1).ghosts, 1);
    for (let n = 2; n <= ROUNDS.levels.length; n++) assert.true(levelFor(n).intensity >= levelFor(n - 1).intensity && levelFor(n).ghosts >= levelFor(n - 1).ghosts, `round ${n}`);
    assert.deepEqual(levelFor(99), levelFor(ROUNDS.levels.length));
    assert.deepEqual(levelFor(0), levelFor(1), "a round before the first is the first");
  });

  QUnit.test("a score is the captures, what is left, and a bonus for being quick, and never less for a better round", (assert) => {
    const slow = roundScore({ captured: 1, health: 50, sanity: 40, time: 400 });
    assert.strictEqual(slow, ROUNDS.score.capture + 50 * ROUNDS.score.perHealth + 40 * ROUNDS.score.perSanity, "slower than par has no bonus, and no penalty");
    const quick = roundScore({ captured: 1, health: 50, sanity: 40, time: ROUNDS.score.parSeconds - 60 });
    assert.strictEqual(quick - slow, Math.round(60 * ROUNDS.score.perSecond));
    assert.true(roundScore({ captured: 2, health: 80, sanity: 80, time: 100 }) > roundScore({ captured: 2, health: 30, sanity: 80, time: 100 }));
    assert.true(roundScore({ captured: 1, health: -20, sanity: 10, time: 10 }) > 0, "health under nothing is nothing");
  });

  QUnit.test("the screen is right above the sanity where tricks begin, and gets worse as it falls", (assert) => {
    const calm = sanityLook(ROUNDS.trick.below + 1);
    assert.deepEqual(calm, { vignette: 0, jitter: 0, tilt: 0, hue: 0 });
    const half = sanityLook(ROUNDS.trick.below / 2);
    const none = sanityLook(0);
    assert.true(half.vignette > 0 && none.vignette > half.vignette && none.jitter > half.jitter);
    assert.strictEqual(none.vignette, 1);
  });
});
