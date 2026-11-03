QUnit.module("paying for an upgrade, and selling", () => {
  // A tower that is only what the rules ask of one.
  const tower = (kind, level = 1) => ({
    kind,
    level,
    setLevel(next) {
      this.level = next;
    },
  });

  QUnit.test("an upgrade takes the gold and raises the level by one", (assert) => {
    const state = { towers: [], wallet: new Wallet(100) };
    const air = tower("air");

    const result = tryUpgrade(state, air);

    assert.deepEqual(result, { ok: true, reason: "" });
    assert.strictEqual(air.level, 2);
    assert.strictEqual(state.wallet.gold, 100 - upgradeCost(BENDERS.air, 1));
  });

  QUnit.test("exactly enough gold is enough", (assert) => {
    const state = { towers: [], wallet: new Wallet(60) };

    assert.true(tryUpgrade(state, tower("air")).ok);
    assert.strictEqual(state.wallet.gold, 0);
  });

  QUnit.test("too little gold says how much it costs and how much there is, and nothing is paid or changed", (assert) => {
    const state = { towers: [], wallet: new Wallet(59.9) };
    const air = tower("air");

    const result = tryUpgrade(state, air);

    assert.false(result.ok);
    assert.strictEqual(result.reason, "that costs 60, and there is 59");
    assert.strictEqual(air.level, 1);
    assert.strictEqual(state.wallet.gold, 59.9);
  });

  QUnit.test("a tower at the last level can't be upgraded, however rich", (assert) => {
    const state = { towers: [], wallet: new Wallet(5000) };
    const master = tower("fire", MAX_LEVEL);

    const result = tryUpgrade(state, master);

    assert.false(result.ok);
    assert.strictEqual(result.reason, "that is as good as it gets");
    assert.strictEqual(master.level, MAX_LEVEL);
    assert.strictEqual(state.wallet.gold, 5000);
  });

  QUnit.test("upgrading to the top costs the worth of the top, less the podium", (assert) => {
    const state = { towers: [], wallet: new Wallet(1000) };
    const earth = tower("earth");
    tryUpgrade(state, earth);
    tryUpgrade(state, earth);

    assert.strictEqual(earth.level, MAX_LEVEL);
    assert.strictEqual(1000 - state.wallet.gold, worthOf(BENDERS.earth, MAX_LEVEL) - BENDERS.earth.cost);
  });

  QUnit.test("selling takes the tower out of the list it is in, and pays", (assert) => {
    const water = tower("water");
    const state = { towers: [tower("air"), water, tower("fire")], wallet: new Wallet(0) };
    const list = state.towers;

    const result = trySell(state, water);

    assert.deepEqual(result, { ok: true, refund: refundFor(BENDERS.water, 1) });
    assert.strictEqual(state.towers, list, "it is the same list, since the game goes on using it");
    assert.deepEqual(state.towers.map((t) => t.kind), ["air", "fire"]);
    assert.strictEqual(state.wallet.gold, refundFor(BENDERS.water, 1));
  });

  QUnit.test("a tower that has been upgraded sells for more", (assert) => {
    const a = { towers: [tower("earth")], wallet: new Wallet(0) };
    const b = { towers: [tower("earth", 3)], wallet: new Wallet(0) };
    trySell(a, a.towers[0]);
    trySell(b, b.towers[0]);

    assert.true(b.wallet.gold > a.wallet.gold);
  });

  QUnit.test("a tower that is not in the list is not sold, and pays nothing", (assert) => {
    const state = { towers: [tower("air")], wallet: new Wallet(10) };

    assert.deepEqual(trySell(state, tower("air")), { ok: false, refund: 0 });
    assert.strictEqual(state.towers.length, 1);
    assert.strictEqual(state.wallet.gold, 10);
  });

  QUnit.test("it is not a way to make gold: build, upgrade and sell again, and there is less than there was", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const state = { towers: [], wallet: new Wallet(1000) };
      const t = tower(kind);
      state.wallet.spend(BENDERS[kind].cost);
      state.towers.push(t);
      tryUpgrade(state, t);
      tryUpgrade(state, t);
      trySell(state, t);

      assert.true(state.wallet.gold < 1000, kind);
    }
  });
});
