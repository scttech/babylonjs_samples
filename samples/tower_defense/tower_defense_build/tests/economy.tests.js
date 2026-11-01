QUnit.module("the ECONOMY table and the prices", () => {
  QUnit.test("every bender has a price, in whole gold", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(Number.isInteger(spec.cost) && spec.cost > 0, kind);
  });

  QUnit.test("there is gold to start with, for a few towers, and not for all of them", (assert) => {
    const prices = Object.values(BENDERS).map((spec) => spec.cost);
    const all = prices.reduce((a, b) => a + b, 0);

    assert.true(ECONOMY.startGold >= Math.min(...prices) * 2, "at least two of the cheapest");
    assert.true(ECONOMY.startGold < all, "not one of each kind and more");
  });
});

QUnit.module("Wallet", () => {
  QUnit.test("begins with the starting gold, or what it is given", (assert) => {
    assert.strictEqual(new Wallet().gold, ECONOMY.startGold);
    assert.strictEqual(new Wallet(30).gold, 30);
  });

  QUnit.test("can afford what it has, and no more", (assert) => {
    const wallet = new Wallet(100);

    assert.true(wallet.canAfford(100));
    assert.true(wallet.canAfford(1));
    assert.false(wallet.canAfford(100.5));
  });

  QUnit.test("spending takes the gold, and says so", (assert) => {
    const wallet = new Wallet(100);

    assert.true(wallet.spend(30));
    assert.strictEqual(wallet.gold, 70);
  });

  QUnit.test("spending more than there is takes nothing, and says no", (assert) => {
    const wallet = new Wallet(20);

    assert.false(wallet.spend(21));
    assert.strictEqual(wallet.gold, 20);
  });

  QUnit.test("spending exactly what there is leaves none", (assert) => {
    const wallet = new Wallet(50);

    assert.true(wallet.spend(50));
    assert.strictEqual(wallet.gold, 0);
  });

  QUnit.test("earning adds, and a little at a time adds up", (assert) => {
    const wallet = new Wallet(0);
    for (let i = 0; i < 100; i++) wallet.earn(ECONOMY.trickle / 100);

    assert.true(Math.abs(wallet.gold - ECONOMY.trickle) < 1e-9);
  });

  QUnit.test("what is shown is whole gold, rounded down", (assert) => {
    assert.strictEqual(new Wallet(99.99).shown, 99);
    assert.strictEqual(new Wallet(100).shown, 100);
    assert.strictEqual(new Wallet(0.4).shown, 0);
  });

  QUnit.test("it never goes below nothing", (assert) => {
    const wallet = new Wallet(10);
    wallet.spend(5);
    wallet.spend(5);
    wallet.spend(1);

    assert.strictEqual(wallet.gold, 0);
  });
});
