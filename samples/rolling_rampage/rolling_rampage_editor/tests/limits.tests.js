QUnit.module("EDITOR_LIMITS", () => {
  const L = EDITOR_LIMITS;

  QUnit.test("every limit is a whole number", (assert) => {
    for (const [name, value] of Object.entries(L)) assert.true(Number.isInteger(value), name);
  });

  QUnit.test("each smallest is at most its biggest, and a new level is between them", (assert) => {
    assert.true(L.minCols <= L.defaultCols && L.defaultCols <= L.maxCols);
    assert.true(L.minRows <= L.defaultRows && L.defaultRows <= L.maxRows);
    assert.true(L.minTime <= L.defaultTime && L.defaultTime <= L.maxTime);
  });

  QUnit.test("a height is one digit, so the highest is 1 to 9", (assert) => {
    assert.true(L.maxHeight >= 1 && L.maxHeight <= 9);
  });

  QUnit.test("there is room for at least one level, one of each thing, and a step back", (assert) => {
    assert.true(L.maxLevels >= 1 && L.maxObjects >= 1 && L.undoDepth >= 1 && L.maxName >= 1);
  });

  QUnit.test("the ten levels of the game fit inside the limits", (assert) => {
    for (const level of LEVELS) {
      assert.true(level.rows[0].length <= L.maxCols && level.rows.length <= L.maxRows, level.name);
      assert.true(level.time >= L.minTime && level.time <= L.maxTime, level.name);
    }
  });
});

QUnit.module("clampInt and clampStep", () => {
  QUnit.test("clampInt rounds, and holds a number to its range", (assert) => {
    assert.strictEqual(clampInt(4.6, 0, 10), 5);
    assert.strictEqual(clampInt(-3, 0, 10), 0);
    assert.strictEqual(clampInt(99, 0, 10), 10);
  });

  QUnit.test("clampInt gives the low end for anything that is not a number", (assert) => {
    assert.strictEqual(clampInt("abc", 2, 10), 2);
    assert.strictEqual(clampInt(undefined, 2, 10), 2);
    assert.strictEqual(clampInt(NaN, 2, 10), 2);
    assert.strictEqual(clampInt("7", 2, 10), 7);
  });

  QUnit.test("clampStep goes to the nearest step, and holds a number to its range", (assert) => {
    assert.strictEqual(clampStep(1.3, 0, 10, 0.5), 1.5);
    assert.strictEqual(clampStep(0.1 + 0.2, 0, 1, 0.1), 0.3);
    assert.strictEqual(clampStep(50, 0, 10, 0.5), 10);
    assert.strictEqual(clampStep(-1, 0, 10, 0.5), 0);
    assert.strictEqual(clampStep("x", 3, 10, 0.5), 3);
  });
});

QUnit.module("cleanLevelName", () => {
  QUnit.test("trims and squeezes spaces", (assert) => {
    assert.strictEqual(cleanLevelName("  Big   Hill  "), "Big Hill");
  });

  QUnit.test("is no longer than the limit", (assert) => {
    const long = "x".repeat(EDITOR_LIMITS.maxName + 10);
    assert.strictEqual(cleanLevelName(long).length, EDITOR_LIMITS.maxName);
    assert.strictEqual(cleanLevelName("abcdef", { ...EDITOR_LIMITS, maxName: 3 }), "abc");
  });

  QUnit.test("is a plain name when nothing is left", (assert) => {
    assert.strictEqual(cleanLevelName("   "), DEFAULT_LEVEL_NAME);
    assert.strictEqual(cleanLevelName(null), DEFAULT_LEVEL_NAME);
    assert.strictEqual(cleanLevelName(undefined), DEFAULT_LEVEL_NAME);
  });
});

QUnit.module("cloneLevel and blankLevel", () => {
  QUnit.test("a clone shares nothing with the original", (assert) => {
    const level = blankLevel();
    const copy = cloneLevel(level);

    copy.rows[0] = "x";
    copy.start.col = 99;

    assert.notStrictEqual(level.rows[0], "x");
    assert.strictEqual(level.start.col, 2);
  });

  QUnit.test("a blank level is the default size, on flat floor, with a start and a goal", (assert) => {
    const level = blankLevel();

    assert.strictEqual(level.rows.length, EDITOR_LIMITS.defaultRows);
    assert.true(level.rows.every((row) => row.length === EDITOR_LIMITS.defaultCols));
    assert.strictEqual(new Set(level.rows.join("")).size, 1);
    assert.strictEqual(level.time, EDITOR_LIMITS.defaultTime);
    assert.true(level.goal.col > level.start.col);
  });

  QUnit.test("a blank level follows the limits it is given", (assert) => {
    const level = blankLevel({ ...EDITOR_LIMITS, defaultCols: 10, defaultRows: 8, defaultTime: 30, maxHeight: 1 });

    assert.deepEqual([level.rows[0].length, level.rows.length, level.time], [10, 8, 30]);
    assert.strictEqual(level.rows[0][0], "1");
  });
});
