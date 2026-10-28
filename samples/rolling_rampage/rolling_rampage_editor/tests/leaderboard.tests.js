// A stand-in for localStorage: a Map with the two methods the game uses.
const boardMemory = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
};

// One that refuses to save, as a private window can.
const boardBroken = () => ({
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("full");
  },
});

QUnit.module("Leaderboard", () => {
  // A leaderboard on its own storage, so each test starts with nothing.
  const makeBoard = (storage = boardMemory()) => new Leaderboard({ storage });

  QUnit.test("starts empty, with a best of 0", (assert) => {
    const board = makeBoard();

    assert.deepEqual(board.entries, []);
    assert.strictEqual(board.best, 0);
  });

  QUnit.test("add() puts a score on the board and returns its place, 1 for first", (assert) => {
    const board = makeBoard();

    assert.strictEqual(board.add("Ana", 500), 1);

    assert.deepEqual(board.entries, [{ name: "Ana", score: 500 }]);
  });

  QUnit.test("the best score is first", (assert) => {
    const board = makeBoard();
    board.add("Ana", 500);
    board.add("Ben", 900);
    board.add("Cy", 700);

    assert.deepEqual(board.entries.map((e) => e.name), ["Ben", "Cy", "Ana"]);
    assert.strictEqual(board.best, 900);
  });

  QUnit.test("add() says where each score came", (assert) => {
    const board = makeBoard();
    board.add("Ana", 500);
    board.add("Ben", 900);

    assert.strictEqual(board.add("Cy", 700), 2);
    assert.strictEqual(board.add("Di", 100), 4);
  });

  QUnit.test("a score that ties another goes below it: first come, first served", (assert) => {
    const board = makeBoard();
    board.add("Ana", 500);

    assert.strictEqual(board.add("Ben", 500), 2);

    assert.deepEqual(board.entries.map((e) => e.name), ["Ana", "Ben"]);
  });

  QUnit.test("keeps only the best LEADERBOARD_SIZE", (assert) => {
    const board = makeBoard();
    for (let i = 1; i <= LEADERBOARD_SIZE + 5; i++) board.add("P" + i, i * 10);

    assert.strictEqual(board.entries.length, LEADERBOARD_SIZE);
    assert.strictEqual(board.entries[0].score, (LEADERBOARD_SIZE + 5) * 10);
    assert.strictEqual(board.entries[LEADERBOARD_SIZE - 1].score, 60);
  });

  QUnit.test("a score too low for a full board doesn't get on, and add() returns 0", (assert) => {
    const board = makeBoard();
    for (let i = 1; i <= LEADERBOARD_SIZE; i++) board.add("P" + i, i * 100);

    assert.strictEqual(board.add("Low", 50), 0);
    assert.strictEqual(board.add("Tie", 100), 0, "a tie with the lowest doesn't push it off");

    assert.false(board.entries.some((e) => e.name === "Low" || e.name === "Tie"));
  });

  QUnit.test("a score of nothing never gets on, even on an empty board", (assert) => {
    const board = makeBoard();

    assert.strictEqual(board.add("Ana", 0), 0);
    assert.strictEqual(board.add("Ana", -5), 0);
    assert.strictEqual(board.add("Ana", NaN), 0);

    assert.deepEqual(board.entries, []);
  });

  QUnit.test("scores are whole numbers", (assert) => {
    const board = makeBoard();

    board.add("Ana", 123.9);

    assert.strictEqual(board.entries[0].score, 123);
  });

  QUnit.test("names are cleaned", (assert) => {
    const board = makeBoard();

    board.add("   ", 100);
    board.add("a very long name indeed", 90);

    assert.deepEqual(board.entries.map((e) => e.name), [DEFAULT_NAME, "a very long"]);
  });

  QUnit.test("qualifies() says whether a score would get on", (assert) => {
    const board = makeBoard();
    assert.true(board.qualifies(1));
    assert.false(board.qualifies(0));

    for (let i = 1; i <= LEADERBOARD_SIZE; i++) board.add("P" + i, i * 100);
    assert.true(board.qualifies(101));
    assert.false(board.qualifies(100));
  });

  QUnit.test("isBest() is true only for a score above every score on the board", (assert) => {
    const board = makeBoard();
    assert.true(board.isBest(1), "the first score is the best");
    assert.false(board.isBest(0));

    board.add("Ana", 500);
    assert.true(board.isBest(501));
    assert.false(board.isBest(500));
    assert.false(board.isBest(300));
  });

  QUnit.test("what is added is saved, and a new leaderboard on the same storage has it", (assert) => {
    const storage = boardMemory();
    makeBoard(storage).add("Ana", 500);

    const again = makeBoard(storage);

    assert.deepEqual(again.entries, [{ name: "Ana", score: 500 }]);
  });

  QUnit.test("uses its own key", (assert) => {
    const storage = boardMemory();

    makeBoard(storage).add("Ana", 500);

    assert.deepEqual([...storage.data.keys()], [LEADERBOARD_KEY]);
  });

  QUnit.test("a damaged save is ignored", (assert) => {
    for (const text of ["{oops", "42", "null", '{"a":1}']) {
      const storage = boardMemory();
      storage.setItem(LEADERBOARD_KEY, text);

      assert.deepEqual(makeBoard(storage).entries, [], text);
    }
  });

  QUnit.test("entries in a save that aren't a name with a score are dropped, and the rest are put in order", (assert) => {
    const storage = boardMemory();
    storage.setItem(
      LEADERBOARD_KEY,
      JSON.stringify([{ name: "Low", score: 10 }, null, { name: 5, score: 99 }, { name: "NoScore" }, { name: "Neg", score: -4 }, { name: "High", score: 900.7 }, "text"])
    );

    assert.deepEqual(makeBoard(storage).entries, [
      { name: "High", score: 900 },
      { name: "Low", score: 10 },
    ]);
  });

  QUnit.test("a save with too many entries is cut to the best LEADERBOARD_SIZE", (assert) => {
    const storage = boardMemory();
    const many = Array.from({ length: LEADERBOARD_SIZE + 4 }, (_, i) => ({ name: "P" + i, score: i + 1 }));
    storage.setItem(LEADERBOARD_KEY, JSON.stringify(many));

    const board = makeBoard(storage);

    assert.strictEqual(board.entries.length, LEADERBOARD_SIZE);
    assert.strictEqual(board.best, LEADERBOARD_SIZE + 4);
  });

  QUnit.test("works without storage, for as long as the page is open", (assert) => {
    const board = new Leaderboard({ storage: null });

    assert.strictEqual(board.add("Ana", 500), 1);

    assert.strictEqual(board.best, 500);
  });

  QUnit.test("storage that throws doesn't stop a score being added", (assert) => {
    const board = new Leaderboard({ storage: boardBroken() });

    assert.strictEqual(board.add("Ana", 500), 1);
    assert.false(board.save());
  });

  QUnit.test("clear() forgets every score, and saves that", (assert) => {
    const storage = boardMemory();
    const board = makeBoard(storage);
    board.add("Ana", 500);

    board.clear();

    assert.deepEqual(board.entries, []);
    assert.deepEqual(makeBoard(storage).entries, []);
  });
});
