QUnit.module("the EFFECTS table", () => {
  QUnit.test("there is an effect for each nation, and each has a name, a color and a time", (assert) => {
    assert.deepEqual(Object.keys(EFFECTS).sort(), ["burn", "push", "slow", "stun"]);
    for (const [kind, effect] of Object.entries(EFFECTS)) {
      assert.true(effect.name.length > 0, kind);
      assert.true(/^#[0-9a-f]{6}$/i.test(effect.color), kind);
      assert.true(effect.seconds > 0, kind);
    }
  });

  QUnit.test("the four colors are different", (assert) => {
    assert.strictEqual(new Set(Object.values(EFFECTS).map((effect) => effect.color)).size, 4);
  });

  QUnit.test("a push slides back over a short time, and not in one frame and not for long", (assert) => {
    assert.true(EFFECTS.push.glide > 0.05 && EFFECTS.push.glide < 1);
  });

  QUnit.test("a slow is a share of the speed, between none and all", (assert) => {
    assert.true(EFFECTS.slow.speed > 0 && EFFECTS.slow.speed < 1);
  });

  QUnit.test("a stun is short, and it has to be waited out before another: or an enemy could be stunned for ever", (assert) => {
    assert.true(EFFECTS.stun.seconds < 1.5);
    assert.true(EFFECTS.stun.immune > 0);
  });

});

QUnit.module("reached", () => {
  const at = (x, z, alive = true) => ({ x, z, alive });

  QUnit.test("an effect with no radius reaches the enemy it hit, and nobody else", (assert) => {
    const hit = at(0, 0);

    assert.deepEqual(reached("stun", hit, [hit, at(0.1, 0)]), [hit]);
  });

  QUnit.test("one with a radius reaches the enemy and every other that is within it", (assert) => {
    const hit = at(0, 0);
    const near = at(1, 0);
    const far = at(EFFECTS.slow.radius + 0.5, 0);
    const result = reached("slow", hit, [far, hit, near]);

    assert.strictEqual(result[0], hit, "the enemy that was hit is first");
    assert.deepEqual(result, [hit, near]);
  });

  QUnit.test("one that is on the edge is reached, and one that has fallen is not", (assert) => {
    const hit = at(0, 0);
    const edge = at(0, EFFECTS.slow.radius);
    const fallen = at(0.2, 0, false);

    assert.deepEqual(reached("slow", hit, [hit, edge, fallen]), [hit, edge]);
  });

  QUnit.test("an enemy is reached even if the crowd that was given leaves it out", (assert) => {
    const hit = at(0, 0);

    assert.deepEqual(reached("slow", hit, []), [hit]);
  });

  QUnit.test("it is the slow that spreads, which is what a crowd needs: a tower that slows one enemy in a stream slows nothing", (assert) => {
    assert.true(EFFECTS.slow.radius > 0);
    for (const kind of ["burn", "stun", "push"]) assert.strictEqual(EFFECTS[kind].radius, 0, kind);
  });
});

QUnit.module("strength", () => {
  QUnit.test("is the potency times how much an enemy is affected", (assert) => {
    assert.strictEqual(strength(1.5, 0.4), 0.6000000000000001);
    assert.strictEqual(strength(2), 2, "an enemy that has nothing said takes it all");
  });

  QUnit.test("is never below nothing", (assert) => {
    assert.strictEqual(strength(-1, 1), 0);
    assert.strictEqual(strength(1, 0), 0);
  });
});

QUnit.module("describe", () => {
  QUnit.test("says what each effect does, for a potency", (assert) => {
    assert.strictEqual(describe("slow"), "Slows the crowd by half for 2.5 seconds");
    assert.strictEqual(describe("burn"), "Burns for 9 over 3 seconds");
    assert.strictEqual(describe("stun"), "Stuns for 1 second");
    assert.strictEqual(describe("push"), "Pushes back 3 along the road");
  });

  QUnit.test("and says more of it for a bigger potency", (assert) => {
    assert.strictEqual(describe("slow", 2), "Slows the crowd by half for 5 seconds");
    assert.strictEqual(describe("push", 2), "Pushes back 6 along the road");
  });

  QUnit.test("it has words for every effect", (assert) => {
    for (const kind of Object.keys(EFFECTS)) assert.true(describe(kind).length > 10, kind);
  });
});
