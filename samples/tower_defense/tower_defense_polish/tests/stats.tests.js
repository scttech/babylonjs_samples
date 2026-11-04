QUnit.module("Stats", () => {
  QUnit.test("begin at nothing", (assert) => {
    const stats = new Stats();

    for (const name of ["time", "defeated", "leaked", "built", "upgraded", "sold"]) assert.strictEqual(stats[name], 0, name);
  });

  QUnit.test("count adds one to what it is told", (assert) => {
    const stats = new Stats();
    stats.count("built");
    stats.count("built");
    stats.count("sold");

    assert.strictEqual(stats.built, 2);
    assert.strictEqual(stats.sold, 1);
    assert.strictEqual(stats.defeated, 0);
  });
});

QUnit.module("starsFor", () => {
  QUnit.test("a game that was lost is worth nothing, however much is left", (assert) => {
    assert.strictEqual(starsFor("lost", 15, 20), 0);
    assert.strictEqual(starsFor("running", 20, 20), 0);
  });

  QUnit.test("one star for winning, two for half the lives left, and three for nearly all", (assert) => {
    assert.strictEqual(starsFor("won", 1, 20), 1);
    assert.strictEqual(starsFor("won", 9, 20), 1);
    assert.strictEqual(starsFor("won", 10, 20), 2);
    assert.strictEqual(starsFor("won", 17, 20), 2);
    assert.strictEqual(starsFor("won", 18, 20), 3);
    assert.strictEqual(starsFor("won", 20, 20), 3);
  });

  QUnit.test("the numbers that decide it are in the table", (assert) => {
    assert.true(RATING.threeStars > RATING.twoStars && RATING.twoStars > 0 && RATING.threeStars <= 1);
  });

  QUnit.test("a game with no lives to lose is not a division by nothing", (assert) => {
    assert.strictEqual(starsFor("won", 0, 0), 1);
  });
});

QUnit.module("clock", () => {
  QUnit.test("is minutes and seconds, with the seconds in two figures", (assert) => {
    assert.strictEqual(clock(0), "0:00");
    assert.strictEqual(clock(75), "1:15");
    assert.strictEqual(clock(600), "10:00");
    assert.strictEqual(clock(61.9), "1:01");
  });

  QUnit.test("is never below nothing", (assert) => {
    assert.strictEqual(clock(-5), "0:00");
  });
});

QUnit.module("summarize", () => {
  QUnit.test("says what the game came to, line by line", (assert) => {
    const stats = new Stats();
    stats.defeated = 42;
    stats.built = 7;
    stats.upgraded = 3;
    stats.time = 400;
    const rows = summarize(stats, { wave: 10, total: 10, lives: 17, gold: 1234.9 });

    assert.deepEqual(rows, [
      ["Waves", "10 of 10"],
      ["Lives left", "17"],
      ["Enemies defeated", "42"],
      ["Gold earned", "1234"],
      ["Towers built", "7"],
      ["Upgrades", "3"],
      ["Time", "6:40"],
    ]);
  });
});

QUnit.module("RESULTS", () => {
  QUnit.test("a win says something different from a loss", (assert) => {
    assert.notStrictEqual(RESULTS.won.title, RESULTS.lost.title);
    for (const result of Object.values(RESULTS)) assert.true(result.title.length > 0 && result.text.length > 0);
  });
});

QUnit.module("Records", () => {
  // Storage like the page's, in an object.
  const memory = () => {
    const data = {};
    return { getItem: (key) => (key in data ? data[key] : null), setItem: (key, value) => (data[key] = value), data };
  };

  QUnit.test("a map that has not been played has nothing on record", (assert) => {
    assert.deepEqual(new Records(memory()).get("The Winding Road"), { stars: 0, wave: 0 });
  });

  QUnit.test("a game is put on the record, and says it was a best", (assert) => {
    const records = new Records(memory());

    assert.true(records.update("A", { stars: 2, wave: 10 }));
    assert.deepEqual(records.get("A"), { stars: 2, wave: 10 });
  });

  QUnit.test("a worse game does not take the place of a better one, and does not say it was a best", (assert) => {
    const records = new Records(memory());
    records.update("A", { stars: 3, wave: 10 });

    assert.false(records.update("A", { stars: 1, wave: 10 }));
    assert.false(records.update("A", { stars: 0, wave: 4 }));
    assert.deepEqual(records.get("A"), { stars: 3, wave: 10 });
  });

  QUnit.test("getting further is a best, even without a star, and each is kept on its own", (assert) => {
    const records = new Records(memory());
    records.update("A", { stars: 0, wave: 4 });

    assert.true(records.update("A", { stars: 0, wave: 6 }));
    assert.deepEqual(records.get("A"), { stars: 0, wave: 6 });
    assert.deepEqual(records.get("B"), { stars: 0, wave: 0 });
  });

  QUnit.test("they are kept: a new Records on the same storage has them", (assert) => {
    const storage = memory();
    new Records(storage).update("A", { stars: 3, wave: 10 });

    assert.deepEqual(new Records(storage).get("A"), { stars: 3, wave: 10 });
  });

  QUnit.test("storage that has something that isn't records, or isn't there, is no records and no error", (assert) => {
    const broken = { getItem: () => "{not json", setItem: () => {} };
    const empty = { getItem: () => null, setItem: () => {} };
    const text = { getItem: () => '"hello"', setItem: () => {} };

    for (const storage of [broken, empty, text]) assert.deepEqual(new Records(storage).get("A"), { stars: 0, wave: 0 });
  });

  QUnit.test("storage that can't be written to loses nothing for the game that is going, and does not throw", (assert) => {
    const full = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const records = new Records(full);

    assert.true(records.update("A", { stars: 2, wave: 5 }));
    assert.deepEqual(records.get("A"), { stars: 2, wave: 5 });
  });
});

QUnit.module("safeStorage", () => {
  QUnit.test("is the page's storage if it works", (assert) => {
    const storage = { getItem: () => null, setItem: () => {} };

    assert.strictEqual(safeStorage({ localStorage: storage }), storage);
  });

  QUnit.test("is one that keeps nothing if it can't be had, even if just asking for it throws", (assert) => {
    const blocked = {
      get localStorage() {
        throw new Error("blocked");
      },
    };
    const storage = safeStorage(blocked);

    assert.strictEqual(storage.getItem("x"), null);
    storage.setItem("x", "y");
    assert.strictEqual(storage.getItem("x"), null);
  });

  QUnit.test("is one that keeps nothing if it is there and throws when it is used", (assert) => {
    const storage = safeStorage({ localStorage: { getItem: () => { throw new Error("denied"); } } });

    assert.strictEqual(storage.getItem("x"), null);
  });
});
