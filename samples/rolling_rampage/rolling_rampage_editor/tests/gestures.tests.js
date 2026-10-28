QUnit.module("the tools and the geometry of the editor", () => {
  QUnit.test("every tool has an id, a group, a label and a hint, and the ids are different", (assert) => {
    for (const tool of EDITOR_TOOLS) assert.true([tool.id, tool.group, tool.label, tool.hint].every((text) => typeof text === "string" && text.length > 0), tool.id);
    assert.strictEqual(new Set(EDITOR_TOOLS.map((tool) => tool.id)).size, EDITOR_TOOLS.length);
  });

  QUnit.test("each placing tool is a tool, and one that makes a thing the draft knows how to place", (assert) => {
    const ids = EDITOR_TOOLS.map((tool) => tool.id);
    for (const tool of PLACING_TOOLS) {
      assert.true(ids.includes(tool), tool);
      assert.ok(new LevelDraft().place(tool, { col: 8, row: 3 }), tool);
    }
  });

  QUnit.test("cellSizeFor is as big as the space allows, between the least and the most", (assert) => {
    assert.strictEqual(cellSizeFor(20, 10, 400, 400), 20);
    assert.strictEqual(cellSizeFor(10, 10, 5000, 5000), CELL_PIXELS.max);
    assert.strictEqual(cellSizeFor(60, 30, 100, 100), CELL_PIXELS.min);
  });

  QUnit.test("the biggest level the limits allow still fits a screen at the smallest size", (assert) => {
    const width = EDITOR_LIMITS.maxCols * CELL_PIXELS.min;
    const height = EDITOR_LIMITS.maxRows * CELL_PIXELS.min;
    assert.true(width <= 1920 && height <= 1080, `${width} x ${height}`);
  });

  QUnit.test("cornerAt is the square a pixel is in", (assert) => {
    assert.deepEqual(cornerAt(0, 0, 20), { col: 0, row: 0 });
    assert.deepEqual(cornerAt(19, 39, 20), { col: 0, row: 1 });
    assert.deepEqual(cornerAt(20, 40, 20), { col: 1, row: 2 });
  });

  QUnit.test("placeAt is a place in the units of the level, where the middle of a square is the corner", (assert) => {
    assert.deepEqual(placeAt(10, 10, 20), { col: 0, row: 0 });
    assert.deepEqual(placeAt(30, 50, 20), { col: 1, row: 2 });
    assert.deepEqual(placeAt(20, 20, 20), { col: 0.5, row: 0.5 });
  });

  QUnit.test("lineCorners fills in the squares between two", (assert) => {
    assert.deepEqual(lineCorners({ col: 0, row: 0 }, { col: 4, row: 0 }).map((c) => c.col), [0, 1, 2, 3, 4]);
    assert.deepEqual(lineCorners({ col: 2, row: 2 }, { col: 2, row: 2 }), [{ col: 2, row: 2 }]);
    assert.deepEqual(lineCorners({ col: 0, row: 0 }, { col: 3, row: 3 }).map((c) => [c.col, c.row]), [[0, 0], [1, 1], [2, 2], [3, 3]]);
    const back = lineCorners({ col: 4, row: 0 }, { col: 0, row: 0 });
    assert.deepEqual(back.map((c) => c.col), [4, 3, 2, 1, 0]);
  });

  QUnit.test("heightColor is lighter the higher the corner, and a hole has its own colour", (assert) => {
    const lightness = (color) => Number(color.match(/(\d+)%\)$/)[1]);
    assert.true(lightness(heightColor(9, 9)) > lightness(heightColor(0, 9)));
    assert.notStrictEqual(heightColor(null, 9), heightColor(0, 9));
    assert.notStrictEqual(heightColor(3, 9), heightColor(4, 9));
  });
});

QUnit.module("applyGesture", () => {
  const at = (col, row) => ({ corner: { col, row }, place: { col, row } });
  const settings = (tool, height = 6, rampTo = null) => ({ tool, height, rampTo });

  // Presses, drags through some squares, and lets go, as the screen does.
  const drag = (draft, config, points) => {
    let held = { origin: at(...points[0]), last: at(...points[0]), picked: false, began: false };
    Object.assign(held, applyGesture(draft, config, "down", at(...points[0])));
    for (const point of points.slice(1)) {
      Object.assign(held, applyGesture(draft, config, "move", at(...point), held));
      held.last = at(...point);
    }
    applyGesture(draft, config, "up", at(...points[points.length - 1]), held);
    return held;
  };

  QUnit.test("paint sets the corner pressed, and every square dragged over, even those a fast mouse skipped", (assert) => {
    const draft = new LevelDraft();

    drag(draft, settings("paint", 6), [[2, 2], [8, 2]]);

    for (let col = 2; col <= 8; col++) assert.strictEqual(draft.digitAt(col, 2), 6);
    assert.strictEqual(draft.digitAt(9, 2), 2);
  });

  QUnit.test("a whole drag is one step of undo", (assert) => {
    const draft = new LevelDraft();
    drag(draft, settings("paint", 6), [[2, 2], [5, 2], [5, 5]]);

    draft.undo();

    assert.strictEqual(draft.digitAt(5, 5), 2);
    assert.false(draft.canUndo);
  });

  QUnit.test("erase makes holes", (assert) => {
    const draft = new LevelDraft();
    drag(draft, settings("erase"), [[3, 3], [5, 3]]);
    assert.deepEqual([3, 4, 5].map((col) => draft.digitAt(col, 3)), [null, null, null]);
  });

  QUnit.test("fill fills the box from where it began to where it ended, when the pointer is let go", (assert) => {
    const draft = new LevelDraft();
    drag(draft, settings("fill", 8), [[2, 2], [4, 3], [5, 4]]);

    assert.strictEqual(draft.digitAt(2, 2), 8);
    assert.strictEqual(draft.digitAt(5, 4), 8);
    assert.strictEqual(draft.digitAt(6, 4), 2);
  });

  QUnit.test("fill with a ramp-to slopes from the corner it began at", (assert) => {
    const draft = new LevelDraft();
    drag(draft, settings("fill", 0, 6), [[0, 0], [6, 1]]);
    assert.deepEqual([0, 3, 6].map((col) => draft.digitAt(col, 0)), [0, 3, 6]);
  });

  QUnit.test("fill changes nothing until it is let go", (assert) => {
    const draft = new LevelDraft();
    const config = settings("fill", 8);
    const held = { origin: at(2, 2), last: at(2, 2) };
    applyGesture(draft, config, "down", at(2, 2));
    applyGesture(draft, config, "move", at(5, 5), held);
    assert.strictEqual(draft.digitAt(3, 3), 2);
  });

  QUnit.test("select picks the thing pressed on, or nothing", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });
    draft.select(null);

    const hit = applyGesture(draft, settings("select"), "down", at(12, 3));
    assert.true(hit.picked);
    assert.deepEqual(draft.selected, { kind: "enemy", index: 0 });

    const miss = applyGesture(draft, settings("select"), "down", at(18, 10));
    assert.false(miss.picked);
    assert.strictEqual(draft.selected, null);
  });

  QUnit.test("selecting makes no undo step, and dragging a thing makes one", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });

    const held = drag(draft, settings("select"), [[12, 3], [13, 4], [14, 5]]);

    assert.true(held.picked);
    assert.deepEqual(draft.level.enemies[0], { col: 14, row: 5 });
    draft.undo();
    assert.deepEqual(draft.level.enemies[0], { col: 12, row: 3 });
    assert.false(draft.canUndo);
  });

  QUnit.test("dragging from empty floor with select moves nothing", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });
    drag(draft, settings("select"), [[18, 10], [14, 5]]);
    assert.deepEqual(draft.level.enemies[0], { col: 12, row: 3 });
  });

  QUnit.test("a placing tool puts the thing there and says to go to the select tool", (assert) => {
    const draft = new LevelDraft();

    const outcome = applyGesture(draft, settings("checkpoint"), "down", at(8, 3));

    assert.deepEqual(outcome, { switchTo: "select" });
    assert.strictEqual(draft.level.checkpoints.length, 1);
    assert.deepEqual(draft.selected, { kind: "checkpoint", index: 0 });
    draft.undo();
    assert.strictEqual((draft.level.checkpoints || []).length, 0);
  });

  QUnit.test("a placing tool says when there is no room, and changes nothing", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, maxObjects: 1 });
    draft.place("enemy", { col: 12, row: 3 });
    draft.markSaved();

    const outcome = applyGesture(draft, settings("enemy"), "down", at(14, 3));

    assert.deepEqual(outcome, { full: true });
    assert.false(draft.changed);
    assert.false(draft.canUndo);
  });
});
