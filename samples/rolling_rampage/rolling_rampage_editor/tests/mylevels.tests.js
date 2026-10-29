QUnit.module("cleanLevel", () => {
  const L = EDITOR_LIMITS;

  QUnit.test("a level of the game comes out exactly as it went in", (assert) => {
    for (const level of LEVELS) assert.deepEqual(cleanLevel(level), level, level.name);
  });

  QUnit.test("a blank level comes out as it went in", (assert) => {
    assert.deepEqual(cleanLevel(blankLevel()), blankLevel());
  });

  QUnit.test("anything that is not a level with rows is null", (assert) => {
    for (const raw of [null, undefined, 5, "level", [], {}, { rows: "22" }, { rows: [] }, { rows: [1, 2] }]) assert.strictEqual(cleanLevel(raw), null);
  });

  QUnit.test("the rows are made the same length, within the limits", (assert) => {
    const level = cleanLevel({ rows: ["22222222", "222", "2222222222222"] });

    assert.true(level.rows.length >= L.minRows);
    assert.true(level.rows.every((row) => row.length === level.rows[0].length));
    assert.true(level.rows[0].length >= L.minCols && level.rows[0].length <= L.maxCols);
    assert.strictEqual(level.rows[1], "222".padEnd(level.rows[0].length, "."));
  });

  QUnit.test("rows too many or too long are cut to the limits", (assert) => {
    const level = cleanLevel({ rows: Array(L.maxRows + 20).fill("2".repeat(L.maxCols + 20)) });

    assert.strictEqual(level.rows.length, L.maxRows);
    assert.strictEqual(level.rows[0].length, L.maxCols);
  });

  QUnit.test("it follows the limits it is given", (assert) => {
    const level = cleanLevel({ rows: Array(30).fill("2".repeat(50)) }, { ...L, maxCols: 12, maxRows: 9 });

    assert.deepEqual([level.rows[0].length, level.rows.length], [12, 9]);
  });

  QUnit.test("anything in the rows but a dot or a digit is a hole, and a digit that is too high is the highest", (assert) => {
    const level = cleanLevel({ rows: Array(L.minRows).fill("2x<b>5 9") }, { ...L, maxHeight: 6 });

    assert.strictEqual(level.rows[0], "2....5.6".padEnd(L.minCols, "."));
  });

  QUnit.test("a name is cleaned, a time is held to the limits, and a missing start and goal are made", (assert) => {
    const level = cleanLevel({ name: "  A   B ", time: 99999, rows: Array(L.minRows).fill("2".repeat(L.minCols)) });

    assert.strictEqual(level.name, "A B");
    assert.strictEqual(level.time, L.maxTime);
    assert.true(isPoint(level.start) && isPoint(level.goal));
    assert.deepEqual(level.checkpoints, []);
  });

  QUnit.test("a place is held inside the level", (assert) => {
    const level = cleanLevel({ ...blankLevel(), start: { col: -5, row: 999 }, enemies: [{ col: 500, row: 2 }] });

    assert.deepEqual(level.start, { col: 0, row: level.rows.length - 1 });
    assert.strictEqual(level.enemies[0].col, level.rows[0].length - 1);
  });

  QUnit.test("each list is cut to the most of a thing, and what is not a thing is left out", (assert) => {
    const many = Array.from({ length: L.maxObjects + 10 }, () => ({ col: 10, row: 3 }));
    const level = cleanLevel({ ...blankLevel(), enemies: [...many, null, "x", {}], checkpoints: "no", slime: [{ col: 1 }] });

    assert.strictEqual(level.enemies.length, L.maxObjects);
    assert.deepEqual(level.checkpoints, []);
    assert.strictEqual(level.slime, undefined);
  });

  QUnit.test("a checkpoint has a bonus, a puddle has a radius, and both are held to a range", (assert) => {
    const level = cleanLevel({ ...blankLevel(), checkpoints: [{ col: 5, row: 5 }, { col: 6, row: 6, bonus: 99999 }], slime: [{ col: 5, row: 5, radius: 99 }, { col: 7, row: 7 }] });

    assert.strictEqual(level.checkpoints[0].bonus, L.defaultBonus);
    assert.strictEqual(level.checkpoints[1].bonus, L.maxTime);
    assert.strictEqual(level.slime[0].radius, 4);
    assert.strictEqual(level.slime[1].radius, THING_DEFAULTS.slimeRadius);
  });

  QUnit.test("a mover that is not a piston or a platform, or has no place, is left out", (assert) => {
    const level = cleanLevel({
      ...blankLevel(),
      movers: [
        { kind: "fan", at: { col: 5, row: 5 } },
        { kind: "piston" },
        { kind: "platform", from: { col: 5, row: 5 }, to: { col: 5, row: 5 } },
        { kind: "piston", at: { col: 5, row: 5 } },
      ],
    });

    assert.strictEqual(level.movers.length, 1);
    assert.strictEqual(level.movers[0].kind, "piston");
  });

  QUnit.test("a mover that has numbers missing, or silly ones, is given sensible ones, so it never divides by nothing", (assert) => {
    const level = cleanLevel({ ...blankLevel(), movers: [{ kind: "piston", at: { col: 5, row: 5 }, period: 0, size: { x: -3 }, rise: "high", phase: 7 }] });
    const piston = level.movers[0];

    assert.true(piston.period > 0 && piston.size.x > 0 && piston.size.z > 0 && Number.isFinite(piston.rise));
    assert.true(piston.phase < 1);
    assert.true(canPlay(checkLevel(level)));
  });

  QUnit.test("whatever it is given, what comes out can be opened by the editor and checked", (assert) => {
    const rubbish = [
      { rows: ["!!!!!!", "######"], start: "here", goal: [], time: "later", checkpoints: [1, 2], movers: [{}, null, 5] },
      { rows: Array(100).fill("9".repeat(200)), name: 12, enemies: { length: 4 } },
      { rows: ["2"], movers: [{ kind: "platform", from: { col: NaN, row: 1 }, to: { col: 2, row: 2 } }] },
    ];
    for (const raw of rubbish) {
      const level = cleanLevel(raw);
      assert.deepEqual(shapeProblems(level, L), []);
      assert.ok(new LevelDraft(level));
    }
  });
});

QUnit.module("levelToText and levelFromText", () => {
  QUnit.test("a level goes to text and comes back the same", (assert) => {
    for (const level of LEVELS) assert.deepEqual(levelFromText(levelToText(level)), level, level.name);
  });

  QUnit.test("the text is the shape of an entry of LEVELS, one row to a line, to be pasted into the game", (assert) => {
    const text = levelToText(blankLevel());

    assert.true(text.includes('"name": "My level"'));
    assert.true(text.includes('"rows": ['));
    assert.strictEqual(text.split("\n").filter((line) => /^ {4}"2+",?$/.test(line)).length, EDITOR_LIMITS.defaultRows);
    assert.deepEqual(new Function(`return ${text}`)(), blankLevel());
  });

  QUnit.test("text that is not a level is null", (assert) => {
    for (const text of ["", "hello", "{", "[]", "{}", '{"rows": 5}', "null", undefined]) assert.strictEqual(levelFromText(text), null);
  });

  QUnit.test("text is cleaned like any other level", (assert) => {
    const level = levelFromText(JSON.stringify({ name: "x".repeat(500), rows: Array(8).fill("2222222222") }));
    assert.strictEqual(level.name.length, EDITOR_LIMITS.maxName);
  });
});

QUnit.module("MyLevels", () => {
  const memoryStorage = (start = {}) => {
    const data = { ...start };
    return {
      data,
      getItem: (key) => (key in data ? data[key] : null),
      setItem: (key, value) => {
        data[key] = value;
      },
    };
  };

  QUnit.test("starts empty", (assert) => {
    assert.deepEqual(new MyLevels({ storage: memoryStorage() }).levels, []);
  });

  QUnit.test("add keeps a level and gives its place; it is saved and comes back in a new MyLevels", (assert) => {
    const storage = memoryStorage();
    const mine = new MyLevels({ storage });

    assert.strictEqual(mine.add(blankLevel()), 0);
    assert.strictEqual(mine.add({ ...blankLevel(), name: "Second" }), 1);

    const again = new MyLevels({ storage });
    assert.deepEqual(again.levels.map((level) => level.name), [DEFAULT_LEVEL_NAME, "Second"]);
  });

  QUnit.test("add cleans the level it is given, and refuses something that is not one", (assert) => {
    const mine = new MyLevels({ storage: memoryStorage() });

    assert.strictEqual(mine.add({ name: "no rows" }), -1);
    assert.strictEqual(mine.add({ ...blankLevel(), name: "   " }), 0);
    assert.strictEqual(mine.levels[0].name, DEFAULT_LEVEL_NAME);
  });

  QUnit.test("it holds as many levels as the limit says, and says it is full", (assert) => {
    const limits = { ...EDITOR_LIMITS, maxLevels: 2 };
    const mine = new MyLevels({ storage: memoryStorage(), limits });

    mine.add(blankLevel());
    assert.false(mine.full);
    mine.add(blankLevel());
    assert.true(mine.full);
    assert.strictEqual(mine.add(blankLevel()), -1);
    assert.strictEqual(mine.levels.length, 2);
  });

  QUnit.test("replace puts a level in the place of another, and remove takes one out", (assert) => {
    const storage = memoryStorage();
    const mine = new MyLevels({ storage });
    mine.add({ ...blankLevel(), name: "A" });
    mine.add({ ...blankLevel(), name: "B" });

    assert.true(mine.replace(0, { ...blankLevel(), name: "A2" }));
    assert.true(mine.remove(1));

    assert.deepEqual(new MyLevels({ storage }).levels.map((level) => level.name), ["A2"]);
    assert.false(mine.replace(5, blankLevel()));
    assert.false(mine.replace(0, { nothing: true }));
    assert.false(mine.remove(5));
  });

  QUnit.test("damaged saves are dropped or cleaned, and too many are cut", (assert) => {
    const limits = { ...EDITOR_LIMITS, maxLevels: 2 };
    const storage = memoryStorage({ [MY_LEVELS_KEY]: JSON.stringify([5, null, { rows: ["22"] }, blankLevel(), blankLevel(), blankLevel()]) });

    const mine = new MyLevels({ storage, limits });

    assert.strictEqual(mine.levels.length, 2);
    assert.true(mine.levels.every((level) => shapeProblems(level, limits).length === 0 || level.rows.length >= limits.minRows));
  });

  QUnit.test("a save that is not a list, or not JSON, is nothing", (assert) => {
    assert.deepEqual(new MyLevels({ storage: memoryStorage({ [MY_LEVELS_KEY]: "[not json" }) }).levels, []);
    assert.deepEqual(new MyLevels({ storage: memoryStorage({ [MY_LEVELS_KEY]: '{"a":1}' }) }).levels, []);
  });

  QUnit.test("with no storage, or storage that refuses, it still works for now", (assert) => {
    const refusing = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const mine = new MyLevels({ storage: refusing });

    assert.strictEqual(mine.add(blankLevel()), 0);
    assert.false(mine.save());
    assert.strictEqual(new MyLevels({ storage: null }).add(blankLevel()), 0);
  });
});
