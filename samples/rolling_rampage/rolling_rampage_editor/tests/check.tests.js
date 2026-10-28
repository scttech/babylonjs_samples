QUnit.module("checkLevel on the levels of the game", () => {
  QUnit.test("none of the ten levels has a problem", (assert) => {
    for (const level of LEVELS) assert.deepEqual(checkLevel(level), [], level.name);
  });

  QUnit.test("a blank level has none either", (assert) => {
    assert.deepEqual(checkLevel(blankLevel()), []);
  });
});

QUnit.module("checkLevel: the shape of a level", () => {
  const L = EDITOR_LIMITS;
  const messages = (level, limits = L) => checkLevel(level, limits).map((found) => found.message);
  const errors = (level, limits = L) => checkLevel(level, limits).filter((found) => found.severity === "error");

  QUnit.test("a level with no rows, or rows that are not text, is an error", (assert) => {
    assert.strictEqual(errors({}).length, 1);
    assert.strictEqual(errors(null).length, 1);
    assert.strictEqual(errors({ ...blankLevel(), rows: [] }).length, 1);
    assert.strictEqual(errors({ ...blankLevel(), rows: [1, 2] }).length, 1);
  });

  QUnit.test("rows of different lengths are an error", (assert) => {
    const level = blankLevel();
    level.rows[3] = level.rows[3].slice(1);
    assert.true(messages(level).some((text) => text.includes("same length")));
  });

  QUnit.test("a level wider or narrower than the limits is an error, and so is one too deep or too shallow", (assert) => {
    const wide = { ...blankLevel(), rows: Array(L.defaultRows).fill("2".repeat(L.maxCols + 1)) };
    const narrow = { ...blankLevel(), rows: Array(L.defaultRows).fill("2".repeat(L.minCols - 1)) };
    const deep = { ...blankLevel(), rows: Array(L.maxRows + 1).fill("2".repeat(L.defaultCols)) };
    const shallow = { ...blankLevel(), rows: Array(L.minRows - 1).fill("2".repeat(L.defaultCols)) };
    for (const level of [wide, narrow, deep, shallow]) assert.true(errors(level).some((found) => found.message.includes("corners")));
  });

  QUnit.test("the limits are the ones given, not fixed ones", (assert) => {
    const small = { ...L, maxCols: 10, maxRows: 8 };
    assert.deepEqual(errors(blankLevel(), small).length > 0, true);
    assert.deepEqual(checkLevel(blankLevel(), { ...L, maxCols: 100, maxRows: 100 }), []);
  });

  QUnit.test("a height must be a dot or a digit up to the highest", (assert) => {
    const level = blankLevel();
    level.rows[0] = "x" + level.rows[0].slice(1);
    assert.true(messages(level).some((text) => text.includes("height")));
    const tall = blankLevel();
    tall.rows[0] = "9" + tall.rows[0].slice(1);
    assert.strictEqual(errors(tall, { ...L, maxHeight: 5 }).length > 0, true);
  });

  QUnit.test("a level needs a start, a goal and a time within the limits", (assert) => {
    assert.true(messages({ ...blankLevel(), start: null }).includes("The level has no start"));
    assert.true(messages({ ...blankLevel(), goal: { col: "x", row: 1 } }).includes("The level has no goal"));
    assert.true(messages({ ...blankLevel(), time: L.minTime - 1 }).some((text) => text.includes("seconds")));
    assert.true(messages({ ...blankLevel(), time: L.maxTime + 1 }).some((text) => text.includes("seconds")));
  });

  QUnit.test("no more of a thing than the limit", (assert) => {
    const level = blankLevel();
    level.enemies = Array.from({ length: L.maxObjects + 1 }, () => ({ col: 10, row: 3 }));
    assert.true(messages(level).some((text) => text.includes("at most")));
  });

  QUnit.test("a thing with no place, or a puddle with no size, is an error", (assert) => {
    assert.strictEqual(errors({ ...blankLevel(), enemies: [{ col: 1 }] }).length, 1);
    assert.strictEqual(errors({ ...blankLevel(), slime: [{ col: 5, row: 5, radius: 0 }] }).length, 1);
  });

  QUnit.test("a mover with numbers that don't work is an error", (assert) => {
    const piston = { kind: "piston", at: { col: 10, row: 6 }, height: 2, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 3 };
    const platform = { kind: "platform", from: { col: 5, row: 5 }, to: { col: 8, row: 5 }, height: 2, size: { x: 5, z: 6 }, period: 12 };
    assert.strictEqual(errors({ ...blankLevel(), movers: [piston, platform] }).length, 0);
    for (const broken of [{ ...piston, period: 0 }, { ...piston, size: { x: 0, z: 1 } }, { ...piston, kind: "fan" }, { ...platform, to: platform.from }, { ...piston, phase: 1 }]) {
      assert.strictEqual(errors({ ...blankLevel(), movers: [broken] }).length, 1);
    }
  });

  QUnit.test("when the shape is wrong, nothing else is said", (assert) => {
    const level = { ...blankLevel(), rows: [] };
    assert.strictEqual(checkLevel(level).length, 1);
  });
});

QUnit.module("checkLevel: is it fair", () => {
  const warnings = (level) => checkLevel(level).filter((found) => found.severity === "warning").map((found) => found.message);
  const withRow = (level, row, text) => {
    level.rows[row] = text;
    return level;
  };

  QUnit.test("a start or a goal over a hole is an error, and says where", (assert) => {
    const level = blankLevel();
    level.rows = level.rows.map((row, i) => (i === level.start.row ? "." + row.slice(1) : row));
    level.start = { col: 0, row: level.start.row };
    const found = checkLevel(level);

    assert.strictEqual(found[0].severity, "error");
    assert.true(found[0].message.includes("start"));
    assert.deepEqual([found[0].col, found[0].row], [0, level.start.row]);
    assert.false(canPlay(found));
  });

  QUnit.test("a goal on a slope needs flat floor", (assert) => {
    const level = blankLevel();
    level.rows = level.rows.map((row, i) => (i === level.goal.row ? row.slice(0, level.goal.col) + "5" + row.slice(level.goal.col + 1) : row));
    const found = warnings(level);

    assert.true(found.includes("the goal needs flat floor all round it"));
    assert.true(canPlay(checkLevel(level)));
  });

  QUnit.test("a checkpoint and a puddle are checked the same way, and named", (assert) => {
    const level = blankLevel();
    level.checkpoints = [{ col: 9, row: 6, bonus: 10 }];
    level.slime = [{ col: 12, row: 6, radius: 1.6 }];
    level.rows = level.rows.map((row, i) => (i === 6 ? row.slice(0, 9) + "5" + row.slice(10, 12) + "5" + row.slice(13) : row));
    const found = warnings(level);

    assert.true(found.includes("checkpoint 1 needs flat floor all round it"));
    assert.true(found.includes("slime puddle 1 needs flat floor all round it"));
  });

  QUnit.test("a checkpoint over a hole is not on the floor", (assert) => {
    const level = blankLevel();
    level.checkpoints = [{ col: 9, row: 6, bonus: 10 }];
    level.rows = level.rows.map((row) => row.slice(0, 8) + "...." + row.slice(12));
    assert.true(warnings(level).includes("checkpoint 1 is not on the floor"));
  });

  QUnit.test("a zone too close to the start, or to another, is a warning", (assert) => {
    const near = blankLevel();
    near.checkpoints = [{ col: near.start.col + 1, row: near.start.row, bonus: 10 }];
    assert.true(warnings(near).includes("checkpoint 1 is too close to the start"));

    const twins = blankLevel();
    twins.checkpoints = [{ col: 8, row: 6, bonus: 10 }, { col: 8.5, row: 6, bonus: 10 }];
    assert.true(warnings(twins).includes("checkpoint 1 and checkpoint 2 overlap"));
  });

  QUnit.test("a goal that nothing can reach is a warning, and the level can still be tried", (assert) => {
    const level = blankLevel();
    for (let row = 0; row < level.rows.length; row++) withRow(level, row, level.rows[row].slice(0, 10) + ".." + level.rows[row].slice(12));
    const found = checkLevel(level);

    assert.true(found.some((one) => one.message === "Nothing can reach the goal from the start"));
    assert.true(canPlay(found));
  });

  QUnit.test("a step of more than two digits can't be climbed, so it cuts the level in two", (assert) => {
    const level = blankLevel();
    for (let row = 0; row < level.rows.length; row++) withRow(level, row, level.rows[row].slice(0, 10) + "7".repeat(10));
    assert.true(warnings(level).includes("Nothing can reach the goal from the start"));
  });

  QUnit.test("a platform is a bridge across a gap", (assert) => {
    const level = blankLevel();
    for (let row = 0; row < level.rows.length; row++) withRow(level, row, level.rows[row].slice(0, 9) + "....." + level.rows[row].slice(14));
    level.movers = [{ kind: "platform", from: { col: 9.25, row: 6 }, to: { col: 12.75, row: 6 }, height: 2, size: { x: 5, z: 6 }, period: 12 }];

    assert.deepEqual(checkLevel(level), []);
  });

  QUnit.test("a piston has to stand on flat floor at its height", (assert) => {
    const level = blankLevel();
    level.movers = [{ kind: "piston", at: { col: 10, row: 6 }, height: 2, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 3 }];
    assert.deepEqual(checkLevel(level), []);

    level.movers[0].height = 3;
    assert.true(warnings(level).includes("Piston 1 needs flat floor under all of it, at its height"));
  });

  QUnit.test("a platform needs floor past each end, and none in its way", (assert) => {
    const level = blankLevel();
    level.movers = [{ kind: "platform", from: { col: 9.25, row: 6 }, to: { col: 12.75, row: 6 }, height: 2, size: { x: 5, z: 6 }, period: 12 }];
    assert.true(warnings(level).includes("Platform 1 has floor in its way"));

    level.movers[0].height = 5;
    assert.true(warnings(level).includes("Platform 1 needs floor at its height past each end"));
  });

  QUnit.test("an enemy has to be on the floor, and not close to the start", (assert) => {
    const level = blankLevel();
    level.enemies = [{ col: level.start.col + 2, row: level.start.row }, { col: 40, row: 3 }];
    const found = warnings(level);

    assert.true(found.includes("Enemy 1 is too close to the start"));
    assert.true(found.includes("Enemy 2 is not on the floor"));
  });

  QUnit.test("the clock has to be long enough for the way to the goal", (assert) => {
    const far = Math.ceil((EDITOR_LIMITS.minTime * SPEED_FOR_TIME) / CELL) + 5; // a way that takes more than the shortest time
    const level = { ...blankLevel(), rows: Array(EDITOR_LIMITS.defaultRows).fill("2".repeat(far + 5)), time: EDITOR_LIMITS.minTime, start: { col: 1, row: 6 }, goal: { col: far, row: 6 } };
    assert.true(warnings(level).some((text) => text.includes("too little")));
  });

  QUnit.test("a checkpoint is not worth more than a quarter of the time", (assert) => {
    const level = blankLevel();
    level.checkpoints = [{ col: 9, row: 6, bonus: level.time }];
    assert.true(warnings(level).includes("Checkpoint 1 gives more than a quarter of the time"));
  });

  QUnit.test("errors come before warnings", (assert) => {
    const level = blankLevel();
    level.start = { col: 40, row: 3 };
    level.enemies = [{ col: 30, row: 3 }];
    const severities = checkLevel(level).map((found) => found.severity);

    assert.strictEqual(severities[0], "error");
    assert.deepEqual(severities, [...severities].sort((a, b) => (a === "error" ? -1 : 1) - (b === "error" ? -1 : 1)));
  });
});

QUnit.module("reachableCorners and canPlay", () => {
  QUnit.test("reachableCorners finds the corners joined to the start by floor", (assert) => {
    const grid = parseLevel({ ...blankLevel(), rows: ["2222.222", "2222.222", "2222.222", "2222.222", "2222.222", "2222.222"], start: { col: 0, row: 0 } });
    const seen = reachableCorners(grid);

    assert.true(seen.has("3,5"));
    assert.false(seen.has("5,0"));
    assert.strictEqual(seen.size, 24);
  });

  QUnit.test("a step of two digits can be climbed, and of three can't", (assert) => {
    const base = { ...blankLevel(), start: { col: 0, row: 0 } };
    const two = reachableCorners(parseLevel({ ...base, rows: Array(6).fill("22224444") }));
    const three = reachableCorners(parseLevel({ ...base, rows: Array(6).fill("22225555") }));

    assert.true(two.has("7,0"));
    assert.false(three.has("7,0"));
  });

  QUnit.test("canPlay is false only for errors", (assert) => {
    assert.true(canPlay([]));
    assert.true(canPlay([{ severity: "warning", message: "x" }]));
    assert.false(canPlay([{ severity: "warning", message: "x" }, { severity: "error", message: "y" }]));
  });
});
