QUnit.module("checkBuild", () => {
  const grid = parseMap({ name: "test", rows: ["S##..", "..#..", "..#.G"] });

  QUnit.test("grass, with enough gold, is fine", (assert) => {
    assert.deepEqual(checkBuild(grid, 0, 1, [], 100, 100), { ok: true, reason: "" });
  });

  QUnit.test("the rules of placement come first, and give their own reasons", (assert) => {
    assert.deepEqual(checkBuild(grid, 2, 1, [], 1000, 100), canBuild(grid, 2, 1, []));
    assert.deepEqual(checkBuild(grid, 9, 9, [], 1000, 100), canBuild(grid, 9, 9, []));
    assert.deepEqual(checkBuild(grid, 0, 1, [{ col: 0, row: 1 }], 1000, 100), canBuild(grid, 0, 1, [{ col: 0, row: 1 }]));
  });

  QUnit.test("too little gold is a reason, and says what it costs and what there is", (assert) => {
    const check = checkBuild(grid, 0, 1, [], 60, 100);

    assert.false(check.ok);
    assert.true(check.reason.includes("100") && check.reason.includes("60"), check.reason);
  });

  QUnit.test("exactly enough is enough", (assert) => {
    assert.true(checkBuild(grid, 0, 1, [], 100, 100).ok);
  });

  QUnit.test("the gold shown in the reason is whole gold, like the screen", (assert) => {
    assert.true(checkBuild(grid, 0, 1, [], 59.9, 100).reason.endsWith("there is 59"));
  });

  QUnit.test("on a road, with no gold, the road is the reason, since it is the one that cannot be put right", (assert) => {
    assert.strictEqual(checkBuild(grid, 2, 1, [], 0, 100).reason, "that is road");
  });
});

QUnit.module("tryBuild", () => {
  const make = (kind, col, row) => ({ kind, col, row });
  const fresh = (gold = 400) => ({ grid: parseMap({ name: "test", rows: ["S##..", "..#..", "..#.G"] }), towers: [], wallet: new Wallet(gold) });

  QUnit.test("builds the tower: pays, makes it and keeps it", (assert) => {
    const state = fresh();
    const result = tryBuild(state, "air", 0, 1, make);

    assert.true(result.ok);
    assert.deepEqual(result.tower, { kind: "air", col: 0, row: 1 });
    assert.deepEqual(state.towers, [result.tower]);
    assert.strictEqual(state.wallet.gold, 400 - BENDERS.air.cost);
  });

  QUnit.test("on a road it does not build, or pay, and says why", (assert) => {
    const state = fresh();
    const result = tryBuild(state, "air", 2, 1, make);

    assert.false(result.ok);
    assert.strictEqual(result.tower, null);
    assert.strictEqual(result.reason, "that is road");
    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
  });

  QUnit.test("with too little gold it does not build, or pay", (assert) => {
    const state = fresh(BENDERS.fire.cost - 1);
    const result = tryBuild(state, "fire", 0, 1, make);

    assert.false(result.ok);
    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, BENDERS.fire.cost - 1);
  });

  QUnit.test("it does not make a tower it is not going to keep", (assert) => {
    let made = 0;
    tryBuild(fresh(0), "air", 0, 1, () => made++);
    tryBuild(fresh(), "air", 2, 1, () => made++);

    assert.strictEqual(made, 0);
  });

  QUnit.test("a second tower in the same cell is refused, and the first is kept", (assert) => {
    const state = fresh();
    tryBuild(state, "air", 0, 1, make);
    const second = tryBuild(state, "water", 0, 1, make);

    assert.false(second.ok);
    assert.strictEqual(state.towers.length, 1);
    assert.strictEqual(state.towers[0].kind, "air");
    assert.strictEqual(state.wallet.gold, 400 - BENDERS.air.cost);
  });

  QUnit.test("gold runs out: with 400, the first towers are built and then there is not enough", (assert) => {
    const state = fresh(400);
    const results = [];
    for (const [kind, col, row] of [["fire", 0, 1], ["fire", 1, 1], ["fire", 3, 0]]) results.push(tryBuild(state, kind, col, row, make).ok);

    assert.deepEqual(results, [true, true, false]);
    assert.strictEqual(state.wallet.gold, 400 - 2 * BENDERS.fire.cost);
  });
});

QUnit.module("Builder", () => {
  QUnit.test("begins idle, holding nothing", (assert) => {
    const builder = new Builder();

    assert.strictEqual(builder.state, "idle");
    assert.strictEqual(builder.holding, null);
  });

  QUnit.test("pressing a button is not yet holding anything: it might be a tap", (assert) => {
    const builder = new Builder();
    builder.press("air", 100, 100);

    assert.strictEqual(builder.state, "pressing");
    assert.strictEqual(builder.kind, "air");
    assert.strictEqual(builder.holding, null);
  });

  QUnit.test("moving a little is still pressing; moving a good way is dragging, and holds the podium", (assert) => {
    const builder = new Builder(10);
    builder.press("air", 100, 100);
    builder.move(104, 103);
    assert.strictEqual(builder.state, "pressing");
    builder.move(100, 120);

    assert.strictEqual(builder.state, "dragging");
    assert.strictEqual(builder.holding, "air");
  });

  QUnit.test("it is how far from where it began that counts, and not how far in one move", (assert) => {
    const builder = new Builder(10);
    builder.press("air", 0, 0);
    for (let x = 1; x <= 12; x++) builder.move(x, 0);

    assert.strictEqual(builder.state, "dragging");
  });

  QUnit.test("letting go after a drag, over a cell where a tower can go, places it", (assert) => {
    const builder = new Builder(10);
    builder.press("fire", 0, 0);
    builder.move(50, 50);

    assert.strictEqual(builder.release({ col: 3, row: 3 }, true), "place");
    assert.strictEqual(builder.state, "idle");
    assert.strictEqual(builder.kind, null);
  });

  QUnit.test("letting go after a drag over a cell where one can't go, or over no cell, cancels", (assert) => {
    for (const [cell, ok] of [[{ col: 1, row: 1 }, false], [null, false], [null, true]]) {
      const builder = new Builder(10);
      builder.press("fire", 0, 0);
      builder.move(50, 50);

      assert.strictEqual(builder.release(cell, ok), "cancel", JSON.stringify([cell, ok]));
      assert.strictEqual(builder.state, "idle");
    }
  });

  QUnit.test("letting go without moving far is a tap, and arms the podium", (assert) => {
    const builder = new Builder(10);
    builder.press("water", 5, 5);
    builder.move(7, 6);

    assert.strictEqual(builder.release(null, false), "arm");
    assert.strictEqual(builder.state, "armed");
    assert.strictEqual(builder.holding, "water");
  });

  QUnit.test("a tap on the board puts an armed podium down where it can go", (assert) => {
    const builder = new Builder();
    builder.press("water", 5, 5);
    builder.release(null, false);

    assert.strictEqual(builder.tap({ col: 2, row: 2 }, true), "place");
    assert.strictEqual(builder.state, "idle");
  });

  QUnit.test("a tap where it can't go is refused, and the podium stays armed to try again", (assert) => {
    const builder = new Builder();
    builder.press("water", 5, 5);
    builder.release(null, false);

    assert.strictEqual(builder.tap({ col: 2, row: 2 }, false), "refuse");
    assert.strictEqual(builder.state, "armed");
    assert.strictEqual(builder.tap({ col: 4, row: 4 }, true), "place");
  });

  QUnit.test("a tap off the board is ignored", (assert) => {
    const builder = new Builder();
    builder.press("water", 5, 5);
    builder.release(null, false);

    assert.strictEqual(builder.tap(null, false), "ignore");
    assert.strictEqual(builder.state, "armed");
  });

  QUnit.test("a tap with nothing armed is ignored", (assert) => {
    assert.strictEqual(new Builder().tap({ col: 1, row: 1 }, true), "ignore");
  });

  QUnit.test("cancel puts the podium down from any state", (assert) => {
    for (const setup of [(b) => b.press("air", 0, 0), (b) => { b.press("air", 0, 0); b.move(99, 99); }, (b) => { b.press("air", 0, 0); b.release(null, false); }]) {
      const builder = new Builder();
      setup(builder);
      builder.cancel();

      assert.strictEqual(builder.state, "idle");
      assert.strictEqual(builder.holding, null);
    }
  });

  QUnit.test("a release with nothing held cancels, and does no harm", (assert) => {
    const builder = new Builder();

    assert.strictEqual(builder.release({ col: 1, row: 1 }, true), "cancel");
    assert.strictEqual(builder.state, "idle");
  });

  QUnit.test("the distance for a tap is in the POINTER table, and is used if none is given", (assert) => {
    assert.strictEqual(new Builder().tapDistance, POINTER.tapDistance);
  });
});
