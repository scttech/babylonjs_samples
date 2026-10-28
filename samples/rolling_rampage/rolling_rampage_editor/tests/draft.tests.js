QUnit.module("LevelDraft: the floor", () => {
  QUnit.test("starts as a copy of the level it is given, or as a blank one", (assert) => {
    const level = blankLevel();
    const draft = new LevelDraft(level);

    draft.setDigit(0, 0, 7);

    assert.notStrictEqual(level.rows[0][0], "7");
    assert.strictEqual(new LevelDraft().cols, EDITOR_LIMITS.defaultCols);
    assert.strictEqual(new LevelDraft().rows, EDITOR_LIMITS.defaultRows);
  });

  QUnit.test("digitAt is the height of a corner, null for a hole or for outside the level", (assert) => {
    const draft = new LevelDraft();
    draft.setDigit(1, 1, null);

    assert.strictEqual(draft.digitAt(0, 0), 2);
    assert.strictEqual(draft.digitAt(1, 1), null);
    assert.strictEqual(draft.digitAt(-1, 0), null);
    assert.strictEqual(draft.digitAt(0, 99), null);
    assert.strictEqual(draft.digitAt(99, 0), null);
  });

  QUnit.test("setDigit changes a corner and says whether it changed", (assert) => {
    const draft = new LevelDraft();

    assert.true(draft.setDigit(3, 2, 5));
    assert.strictEqual(draft.digitAt(3, 2), 5);
    assert.false(draft.setDigit(3, 2, 5));
    assert.true(draft.setDigit(3, 2, null));
    assert.strictEqual(draft.level.rows[2][3], ".");
  });

  QUnit.test("setDigit leaves alone anything outside the level, or a height that isn't one", (assert) => {
    const draft = new LevelDraft();
    const before = JSON.stringify(draft.level);

    assert.false(draft.setDigit(-1, 0, 3));
    assert.false(draft.setDigit(0, draft.rows, 3));
    assert.false(draft.setDigit(0, 0, EDITOR_LIMITS.maxHeight + 1));
    assert.false(draft.setDigit(0, 0, -1));
    assert.false(draft.setDigit(0, 0, 1.5));
    assert.strictEqual(JSON.stringify(draft.level), before);
  });

  QUnit.test("the highest height is the limit's", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, maxHeight: 4 });
    assert.true(draft.setDigit(0, 0, 4));
    assert.false(draft.setDigit(0, 0, 5));
  });

  QUnit.test("fill makes a flat rectangle, whichever corner the drag begins at", (assert) => {
    const draft = new LevelDraft();

    draft.fill(5, 4, 2, 2, 7);

    for (let row = 2; row <= 4; row++) for (let col = 2; col <= 5; col++) assert.strictEqual(draft.digitAt(col, row), 7);
    assert.strictEqual(draft.digitAt(6, 3), 2);
    assert.strictEqual(draft.digitAt(1, 3), 2);
  });

  QUnit.test("fill with two heights is a ramp along the longer side, from the corner the drag begins at", (assert) => {
    const draft = new LevelDraft();

    draft.fill(0, 0, 8, 1, 0, 8);

    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => draft.digitAt(col, 0)), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual([0, 4, 8].map((col) => draft.digitAt(col, 1)), [0, 4, 8]);
  });

  QUnit.test("a ramp dragged the other way runs the other way", (assert) => {
    const draft = new LevelDraft();

    draft.fill(8, 0, 0, 1, 0, 8);

    assert.deepEqual([0, 4, 8].map((col) => draft.digitAt(col, 0)), [8, 4, 0]);
  });

  QUnit.test("a ramp down a column goes down the rows", (assert) => {
    const draft = new LevelDraft();

    draft.fill(2, 0, 3, 8, 8, 0);

    assert.deepEqual([0, 4, 8].map((row) => draft.digitAt(2, row)), [8, 4, 0]);
    assert.strictEqual(draft.digitAt(3, 4), 4);
  });

  QUnit.test("a ramp is steady: no step is more than one digit when the heights are as far apart as the corners", (assert) => {
    const draft = new LevelDraft();
    draft.fill(0, 0, 6, 0, 1, 7);
    const row = [0, 1, 2, 3, 4, 5, 6].map((col) => draft.digitAt(col, 0));
    for (let i = 1; i < row.length; i++) assert.true(Math.abs(row[i] - row[i - 1]) <= 1);
  });

  QUnit.test("fill with no height makes holes", (assert) => {
    const draft = new LevelDraft();

    draft.fill(1, 1, 3, 2, null);

    assert.strictEqual(draft.digitAt(2, 1), null);
    assert.strictEqual(draft.digitAt(4, 1), 2);
  });

  QUnit.test("fill stops at the edge of the level", (assert) => {
    const draft = new LevelDraft();
    const size = [draft.cols, draft.rows];

    draft.fill(draft.cols - 2, draft.rows - 2, draft.cols + 5, draft.rows + 5, 6);

    assert.deepEqual([draft.cols, draft.rows], size);
    assert.strictEqual(draft.digitAt(draft.cols - 1, draft.rows - 1), 6);
  });

  QUnit.test("a ramp is held to the highest height the limits allow", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, maxHeight: 5 });
    draft.fill(0, 0, 4, 0, 0, 9);
    assert.true([0, 1, 2, 3, 4].every((col) => draft.digitAt(col, 0) <= 5));
  });
});

QUnit.module("LevelDraft: size, name and time", () => {
  const L = EDITOR_LIMITS;

  QUnit.test("resize makes the level bigger with holes, and smaller by cutting", (assert) => {
    const draft = new LevelDraft();

    assert.true(draft.resize(L.defaultCols + 2, L.defaultRows + 1));
    assert.deepEqual([draft.cols, draft.rows], [L.defaultCols + 2, L.defaultRows + 1]);
    assert.strictEqual(draft.digitAt(L.defaultCols + 1, 0), null);
    assert.strictEqual(draft.digitAt(0, L.defaultRows), null);
    assert.strictEqual(draft.digitAt(0, 0), 2);

    assert.true(draft.resize(L.minCols, L.minRows));
    assert.deepEqual([draft.cols, draft.rows], [L.minCols, L.minRows]);
  });

  QUnit.test("resize holds the size to the limits", (assert) => {
    const draft = new LevelDraft();

    draft.resize(10000, 10000);
    assert.deepEqual([draft.cols, draft.rows], [L.maxCols, L.maxRows]);

    draft.resize(1, 1);
    assert.deepEqual([draft.cols, draft.rows], [L.minCols, L.minRows]);
  });

  QUnit.test("the limits are the ones the draft was given", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...L, maxCols: 25, maxRows: 14 });

    draft.resize(100, 100);

    assert.deepEqual([draft.cols, draft.rows], [25, 14]);
  });

  QUnit.test("resize to the size it is says it did nothing", (assert) => {
    assert.false(new LevelDraft().resize(L.defaultCols, L.defaultRows));
  });

  QUnit.test("every row stays the same length", (assert) => {
    const draft = new LevelDraft();
    draft.resize(30, 20);
    draft.resize(12, 9);
    assert.true(draft.level.rows.every((row) => row.length === 12));
    assert.strictEqual(draft.level.rows.length, 9);
  });

  QUnit.test("setName cleans the name", (assert) => {
    const draft = new LevelDraft();
    draft.setName("   Big   Hill ");
    assert.strictEqual(draft.level.name, "Big Hill");
    draft.setName("");
    assert.strictEqual(draft.level.name, DEFAULT_LEVEL_NAME);
  });

  QUnit.test("setTime holds the time to the limits", (assert) => {
    const draft = new LevelDraft();
    draft.setTime(75.4);
    assert.strictEqual(draft.level.time, 75);
    draft.setTime(1);
    assert.strictEqual(draft.level.time, L.minTime);
    draft.setTime(99999);
    assert.strictEqual(draft.level.time, L.maxTime);
    draft.setTime("soon");
    assert.strictEqual(draft.level.time, L.minTime);
  });
});

QUnit.module("LevelDraft: undo and redo", () => {
  QUnit.test("undo takes back everything since begin(), and redo does it again", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.setDigit(1, 1, 5);
    draft.setDigit(2, 1, 5);

    assert.true(draft.undo());
    assert.strictEqual(draft.digitAt(1, 1), 2);
    assert.strictEqual(draft.digitAt(2, 1), 2);

    assert.true(draft.redo());
    assert.strictEqual(draft.digitAt(1, 1), 5);
    assert.strictEqual(draft.digitAt(2, 1), 5);
  });

  QUnit.test("each begin() is a step of its own", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.setDigit(1, 1, 5);
    draft.begin();
    draft.setDigit(1, 1, 8);

    draft.undo();
    assert.strictEqual(draft.digitAt(1, 1), 5);
    draft.undo();
    assert.strictEqual(draft.digitAt(1, 1), 2);
  });

  QUnit.test("with nothing to undo or redo, they say so", (assert) => {
    const draft = new LevelDraft();
    assert.false(draft.canUndo);
    assert.false(draft.canRedo);
    assert.false(draft.undo());
    assert.false(draft.redo());
  });

  QUnit.test("canUndo and canRedo follow the steps", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    assert.true(draft.canUndo);
    draft.undo();
    assert.true(draft.canRedo);
    assert.false(draft.canUndo);
  });

  QUnit.test("something new after an undo ends the steps that were undone", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.setDigit(1, 1, 5);
    draft.undo();

    draft.begin();

    assert.false(draft.canRedo);
  });

  QUnit.test("it only goes back as far as the limit", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, undoDepth: 3 });
    for (let i = 0; i < 10; i++) {
      draft.begin();
      draft.setDigit(i, 0, 5);
    }

    let steps = 0;
    while (draft.undo()) steps++;

    assert.strictEqual(steps, 3);
  });

  QUnit.test("undo covers things as well as the floor, and size", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.place("enemy", { col: 12, row: 3 });
    draft.begin();
    draft.resize(30, 20);

    draft.undo();
    assert.strictEqual(draft.cols, EDITOR_LIMITS.defaultCols);
    draft.undo();
    assert.strictEqual((draft.level.enemies || []).length, 0);
  });

  QUnit.test("undo lets go of the selection, which may not be there any more", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.place("enemy", { col: 12, row: 3 });

    draft.undo();

    assert.strictEqual(draft.selected, null);
  });
});

QUnit.module("LevelDraft: changes, copies and problems", () => {
  QUnit.test("changed is whether the level is different from when it was made or last saved", (assert) => {
    const draft = new LevelDraft();
    assert.false(draft.changed);

    draft.setDigit(0, 0, 9);
    assert.true(draft.changed);

    draft.markSaved();
    assert.false(draft.changed);

    draft.setDigit(0, 0, 2);
    assert.true(draft.changed);
  });

  QUnit.test("toLevel is a copy", (assert) => {
    const draft = new LevelDraft();
    const level = draft.toLevel();

    level.rows[0] = "x";
    level.start.col = 77;

    assert.notStrictEqual(draft.level.rows[0], "x");
    assert.strictEqual(draft.level.start.col, 2);
  });

  QUnit.test("problems are the checks of the level as it is now", (assert) => {
    const draft = new LevelDraft();
    assert.deepEqual(draft.problems, []);

    draft.setDigit(draft.level.goal.col, draft.level.goal.row, null);

    assert.true(draft.problems.some((found) => found.severity === "error"));
  });

  QUnit.test("a level of the game can be edited, and is the same when it is given back", (assert) => {
    for (const level of LEVELS) assert.deepEqual(new LevelDraft(level).toLevel(), level, level.name);
  });
});

QUnit.module("LevelDraft: things", () => {
  QUnit.test("place puts a thing in, selects it, and returns its ref", (assert) => {
    const draft = new LevelDraft();

    const ref = draft.place("checkpoint", { col: 8, row: 3 });

    assert.deepEqual(ref, { kind: "checkpoint", index: 0 });
    assert.deepEqual(draft.selected, ref);
    assert.strictEqual(draft.selectedThing.bonus, EDITOR_LIMITS.defaultBonus);
  });

  QUnit.test("place keeps to the limit and leaves the selection as it was when there is no room", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, maxObjects: 1 });
    draft.place("enemy", { col: 12, row: 3 });
    draft.select({ kind: "goal", index: 0 });

    assert.strictEqual(draft.place("enemy", { col: 14, row: 3 }), null);
    assert.deepEqual(draft.selected, { kind: "goal", index: 0 });
  });

  QUnit.test("thingAt, select and moveSelected move a thing that was picked", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });
    draft.select(null);

    draft.select(draft.thingAt({ col: 12.2, row: 3.1 }));
    draft.moveSelected({ col: 14, row: 5 });

    assert.deepEqual(draft.level.enemies[0], { col: 14, row: 5 });
  });

  QUnit.test("moveSelected with nothing selected does nothing", (assert) => {
    const draft = new LevelDraft();
    const before = JSON.stringify(draft.level);
    draft.moveSelected({ col: 1, row: 1 });
    assert.strictEqual(JSON.stringify(draft.level), before);
  });

  QUnit.test("removeSelected takes the thing out and clears the selection, except for the start and goal", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });

    assert.true(draft.removeSelected());
    assert.strictEqual(draft.selected, null);
    assert.strictEqual(draft.level.enemies.length, 0);

    draft.select({ kind: "goal", index: 0 });
    assert.false(draft.removeSelected());
    assert.deepEqual(draft.selected, { kind: "goal", index: 0 });
  });

  QUnit.test("fields are the numbers of the selected thing, and setField changes one", (assert) => {
    const draft = new LevelDraft();
    assert.deepEqual(draft.fields, []);
    assert.strictEqual(draft.setField("bonus", 5), null);

    draft.place("checkpoint", { col: 8, row: 3 });

    assert.deepEqual(draft.fields.map((field) => field.path), ["col", "row", "bonus"]);
    assert.strictEqual(draft.setField("bonus", 7), 7);
    assert.strictEqual(draft.selectedThing.bonus, 7);
  });

  QUnit.test("flattenSelected makes the floor flat under the selected thing", (assert) => {
    const draft = new LevelDraft();
    draft.fill(8, 4, 12, 8, 3, 7);
    draft.place("checkpoint", { col: 10, row: 6 });
    assert.true(draft.problems.some((found) => found.message.includes("flat")));

    assert.true(draft.flattenSelected() > 0);
    assert.false(draft.problems.some((found) => found.message.includes("flat")));
    assert.strictEqual(new LevelDraft().flattenSelected(), -1);
  });
});
