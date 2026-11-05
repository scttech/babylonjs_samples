// A road along the top of the board, from a start to a goal: the smallest map that can be played.
const STRAIGHT = { name: "Straight", rows: ["S" + "#".repeat(12) + "G", ...Array(8).fill(".".repeat(14))] };

QUnit.module("the BRUSHES table", () => {
  QUnit.test("every brush has an id, a name, a color, and the character of the map's legend that it writes", (assert) => {
    for (const brush of BRUSHES) {
      assert.true(brush.id.length > 0 && brush.name.length > 0, brush.id);
      assert.true(/^#[0-9a-f]{6}$/i.test(brush.color), brush.id);
      assert.true(Object.hasOwn(LEGEND, brush.char), `${brush.id}: "${brush.char}" is in the legend`);
    }
  });

  QUnit.test("no two have the same id or write the same character", (assert) => {
    assert.strictEqual(new Set(BRUSHES.map((brush) => brush.id)).size, BRUSHES.length);
    assert.strictEqual(new Set(BRUSHES.map((brush) => brush.char)).size, BRUSHES.length);
  });

  QUnit.test("there is a brush for every character of the legend: nothing that a map can say can't be drawn", (assert) => {
    for (const char of Object.keys(LEGEND)) assert.true(BRUSHES.some((brush) => brush.char === char), char);
  });

  QUnit.test("the scenery brushes are the props of the scenery table, by name", (assert) => {
    for (const brush of BRUSHES.filter((candidate) => candidate.kind === "prop")) assert.true(brush.id in PROPS, brush.id);
    assert.strictEqual(BRUSHES.filter((brush) => brush.kind === "prop").length, Object.keys(PROPS).length);
  });

  QUnit.test("brushFor finds a brush, and says nothing for what isn't one", (assert) => {
    assert.strictEqual(brushFor("road").char, "#");
    assert.strictEqual(brushFor("lava"), null);
    assert.strictEqual(brushFor("toString"), null);
  });

  QUnit.test("kindOfChar says what a character is, and an empty cell is grass", (assert) => {
    assert.strictEqual(kindOfChar("#"), "road");
    assert.strictEqual(kindOfChar("S"), "end");
    assert.strictEqual(kindOfChar("c"), "prop");
    assert.strictEqual(kindOfChar("."), "grass");
    assert.strictEqual(kindOfChar("?"), "grass");
  });
});

QUnit.module("cellsBetween", () => {
  QUnit.test("one cell is one cell", (assert) => {
    assert.deepEqual(cellsBetween({ col: 3, row: 4 }, { col: 3, row: 4 }), [{ col: 3, row: 4 }]);
  });

  QUnit.test("a straight line has every cell in it, ends included, in order", (assert) => {
    assert.deepEqual(cellsBetween({ col: 1, row: 2 }, { col: 4, row: 2 }), [{ col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }]);
    assert.deepEqual(cellsBetween({ col: 4, row: 2 }, { col: 1, row: 2 }).map((c) => c.col), [4, 3, 2, 1]);
  });

  QUnit.test("a line that goes across and down has as many cells as the longer way, and each is next to the one before (corners count)", (assert) => {
    const cells = cellsBetween({ col: 0, row: 0 }, { col: 6, row: 3 });

    assert.strictEqual(cells.length, 7);
    cells.slice(1).forEach((cell, i) => {
      assert.true(Math.abs(cell.col - cells[i].col) <= 1 && Math.abs(cell.row - cells[i].row) <= 1, `${cell.col},${cell.row}`);
    });
    assert.deepEqual(cells[cells.length - 1], { col: 6, row: 3 });
  });

  QUnit.test("a line one way and the same line the other way are the same cells", (assert) => {
    const a = cellsBetween({ col: 0, row: 0 }, { col: 7, row: 5 }).map((c) => `${c.col},${c.row}`).sort();
    const b = cellsBetween({ col: 7, row: 5 }, { col: 0, row: 0 }).map((c) => `${c.col},${c.row}`).sort();

    assert.deepEqual(a, b);
  });
});

QUnit.module("a MapEditor: the board", () => {
  QUnit.test("begins as grass, the size of the board, with a name", (assert) => {
    const editor = new MapEditor();

    assert.strictEqual(editor.cols, BOARD.cols);
    assert.strictEqual(editor.rows, BOARD.rows);
    assert.true(editor.toMap().rows.every((row) => row === ".".repeat(BOARD.cols)));
    assert.true(editor.name.length > 0);
  });

  QUnit.test("can begin with a map, which it gives back as it was", (assert) => {
    for (const map of MAPS) assert.deepEqual(new MapEditor(map).toMap(), map);
  });

  QUnit.test("a map that is too small or too big is made the size of the board, with grass, or cut", (assert) => {
    const small = new MapEditor({ name: "small", rows: ["S#G"] }).toMap();
    const big = new MapEditor({ name: "big", rows: Array(20).fill("#".repeat(30)) }).toMap();

    assert.strictEqual(small.rows.length, BOARD.rows);
    assert.true(small.rows.every((row) => row.length === BOARD.cols));
    assert.strictEqual(small.rows[0].slice(0, 3), "S#G");
    assert.strictEqual(big.rows.length, BOARD.rows);
    assert.true(big.rows.every((row) => row.length === BOARD.cols));
  });

  QUnit.test("get is the character of a cell, and nothing off the board", (assert) => {
    const editor = new MapEditor(STRAIGHT);

    assert.strictEqual(editor.get(0, 0), "S");
    assert.strictEqual(editor.get(13, 0), "G");
    assert.strictEqual(editor.get(-1, 0), null);
    assert.strictEqual(editor.get(14, 0), null);
    assert.strictEqual(editor.get(0, 9), null);
    assert.strictEqual(editor.get(1.5, 0), null);
  });

  QUnit.test("it does not change the map that it was given", (assert) => {
    const map = { name: "x", rows: [...STRAIGHT.rows] };
    const editor = new MapEditor(map);
    editor.paint(5, 5, "road");

    assert.deepEqual(map.rows, STRAIGHT.rows);
  });
});

QUnit.module("a MapEditor: painting", () => {
  QUnit.test("a brush writes its character, and says which cell changed", (assert) => {
    const editor = new MapEditor();
    const changed = editor.paint(3, 2, "road");

    assert.deepEqual(changed, [{ col: 3, row: 2 }]);
    assert.strictEqual(editor.get(3, 2), "#");
  });

  QUnit.test("a cell that already says what the brush says is not changed, and is not a step to undo", (assert) => {
    const editor = new MapEditor();
    editor.paint(3, 2, "road");

    assert.deepEqual(editor.paint(3, 2, "road"), []);
    assert.strictEqual(editor.undoStack.length, 1);
  });

  QUnit.test("off the board, or with a brush that isn't one, nothing happens", (assert) => {
    const editor = new MapEditor();

    assert.deepEqual(editor.paint(-1, 0, "road"), []);
    assert.deepEqual(editor.paint(0, 99, "road"), []);
    assert.deepEqual(editor.paint(1, 1, "lava"), []);
    assert.false(editor.canUndo);
  });

  QUnit.test("there is one start: a second takes the place of the first, which becomes grass", (assert) => {
    const editor = new MapEditor();
    editor.paint(0, 0, "start");
    const changed = editor.paint(0, 5, "start");

    assert.strictEqual(editor.get(0, 5), "S");
    assert.strictEqual(editor.get(0, 0), ".");
    assert.deepEqual(changed.map((c) => `${c.col},${c.row}`).sort(), ["0,0", "0,5"], "and both cells are said to have changed");
    assert.strictEqual(editor.toMap().rows.join("").split("S").length - 1, 1);
  });

  QUnit.test("and one goal, in the same way", (assert) => {
    const editor = new MapEditor();
    editor.paint(13, 0, "goal");
    editor.paint(13, 8, "goal");

    assert.strictEqual(editor.get(13, 0), ".");
    assert.strictEqual(editor.get(13, 8), "G");
  });

  QUnit.test("a goal put on the start is the goal, and there is no start", (assert) => {
    const editor = new MapEditor();
    editor.paint(0, 0, "start");
    editor.paint(0, 0, "goal");

    assert.strictEqual(editor.get(0, 0), "G");
    assert.false(editor.toMap().rows.join("").includes("S"));
  });

  QUnit.test("scenery goes on grass, and not on road or on the ends", (assert) => {
    const editor = new MapEditor(STRAIGHT);

    assert.deepEqual(editor.paint(5, 0, "shrine"), [], "not on the road");
    assert.deepEqual(editor.paint(0, 0, "shrine"), [], "not on the start");
    assert.strictEqual(editor.get(5, 0), "#");
    assert.deepEqual(editor.paint(5, 3, "shrine"), [{ col: 5, row: 3 }]);
  });

  QUnit.test("scenery goes in the place of other scenery", (assert) => {
    const editor = new MapEditor();
    editor.paint(5, 3, "shrine");
    editor.paint(5, 3, "koi_pond");

    assert.strictEqual(editor.get(5, 3), "k");
  });

  QUnit.test("road goes over scenery, and the eraser takes anything away", (assert) => {
    const editor = new MapEditor();
    editor.paint(5, 3, "shrine");
    editor.paint(5, 3, "road");
    assert.strictEqual(editor.get(5, 3), "#");
    editor.paint(5, 3, "erase");

    assert.strictEqual(editor.get(5, 3), ".");
  });

  QUnit.test("the eraser on grass does nothing", (assert) => {
    assert.deepEqual(new MapEditor().paint(2, 2, "erase"), []);
  });
});

QUnit.module("a MapEditor: strokes and undo", () => {
  QUnit.test("a stroke is painted along a line, with no cell missing, and says which cells changed", (assert) => {
    const editor = new MapEditor();
    const changed = editor.stroke({ col: 1, row: 4 }, { col: 8, row: 4 }, "road");

    assert.strictEqual(changed.length, 8);
    for (let col = 1; col <= 8; col++) assert.strictEqual(editor.get(col, 4), "#", `column ${col}`);
  });

  QUnit.test("a whole drag is one step to undo, however many lines it was painted in", (assert) => {
    const editor = new MapEditor();
    editor.begin();
    editor.strokeTo({ col: 1, row: 1 }, { col: 5, row: 1 }, "road");
    editor.strokeTo({ col: 5, row: 1 }, { col: 5, row: 5 }, "road");
    editor.end();

    assert.strictEqual(editor.undoStack.length, 1);
    editor.undo();
    assert.true(editor.toMap().rows.every((row) => row === ".".repeat(BOARD.cols)));
  });

  QUnit.test("a drag that changed nothing is not a step", (assert) => {
    const editor = new MapEditor();
    editor.begin();
    editor.strokeTo({ col: 1, row: 1 }, { col: 5, row: 1 }, "erase");

    assert.false(editor.end());
    assert.false(editor.canUndo);
  });

  QUnit.test("undo goes back a step and says which cells changed; redo goes forward again", (assert) => {
    const editor = new MapEditor();
    editor.paint(2, 2, "road");
    editor.paint(3, 2, "road");
    const undone = editor.undo();

    assert.deepEqual(undone, [{ col: 3, row: 2 }]);
    assert.strictEqual(editor.get(3, 2), ".");
    assert.strictEqual(editor.get(2, 2), "#");
    assert.true(editor.canRedo);
    const redone = editor.redo();
    assert.deepEqual(redone, [{ col: 3, row: 2 }]);
    assert.strictEqual(editor.get(3, 2), "#");
  });

  QUnit.test("undo with nothing to undo, and redo with nothing to redo, do nothing", (assert) => {
    const editor = new MapEditor();

    assert.deepEqual(editor.undo(), []);
    assert.deepEqual(editor.redo(), []);
  });

  QUnit.test("painting after an undo drops what could have been redone", (assert) => {
    const editor = new MapEditor();
    editor.paint(2, 2, "road");
    editor.undo();
    editor.paint(4, 4, "road");

    assert.false(editor.canRedo);
  });

  QUnit.test("undoing all the way gets back to where it began, and redoing all the way to where it was", (assert) => {
    const editor = new MapEditor(STRAIGHT);
    for (let i = 0; i < 6; i++) editor.paint(i + 2, 4, "road");
    const after = editor.toMap().rows;
    while (editor.canUndo) editor.undo();
    assert.deepEqual(editor.toMap().rows, STRAIGHT.rows);
    while (editor.canRedo) editor.redo();

    assert.deepEqual(editor.toMap().rows, after);
  });

  QUnit.test("only so many steps can be undone: the oldest are forgotten", (assert) => {
    const editor = new MapEditor();
    for (let i = 0; i < EDITOR.history + 20; i++) editor.paint(i % BOARD.cols, Math.floor(i / BOARD.cols) % BOARD.rows, i % 2 === 0 ? "road" : "erase");

    assert.true(editor.undoStack.length <= EDITOR.history);
  });

  QUnit.test("clear makes the board grass, as a step that can be undone, and does nothing to a board that is grass", (assert) => {
    const editor = new MapEditor(STRAIGHT);
    const changed = editor.clear();

    assert.strictEqual(changed.length, 14);
    assert.true(editor.toMap().rows.every((row) => row === ".".repeat(BOARD.cols)));
    editor.undo();
    assert.deepEqual(editor.toMap().rows, STRAIGHT.rows);
    editor.clear();
    assert.deepEqual(editor.clear(), []);
  });
});

QUnit.module("a MapEditor: the name", () => {
  QUnit.test("is tidied: spaces are one, the ends are trimmed, and it is only so long", (assert) => {
    const editor = new MapEditor();
    editor.setName("  A   long   road  ");
    assert.strictEqual(editor.name, "A long road");
    editor.setName("x".repeat(100));

    assert.strictEqual(editor.name.length, EDITOR.nameLength);
  });

  QUnit.test("is never nothing", (assert) => {
    const editor = new MapEditor();
    editor.setName("   ");

    assert.true(editor.name.length > 0);
  });

  QUnit.test("goes into the map that it gives", (assert) => {
    const editor = new MapEditor();
    editor.setName("Mine");

    assert.strictEqual(editor.toMap().name, "Mine");
  });
});

QUnit.module("a MapEditor: what is wrong with the map", () => {
  QUnit.test("a board of grass has no start and no goal, and says so", (assert) => {
    const problems = new MapEditor().problems();

    assert.true(problems.some((p) => /one start/.test(p)));
    assert.true(problems.some((p) => /one goal/.test(p)));
    assert.false(new MapEditor().ready);
  });

  QUnit.test("a road that doesn't join up is said to be wrong, in the words of the game's own checks", (assert) => {
    const editor = new MapEditor(STRAIGHT);
    editor.paint(6, 0, "erase");

    assert.true(editor.problems().length > 0);
    assert.false(editor.ready);
  });

  QUnit.test("the straight road is ready to play", (assert) => {
    assert.deepEqual(new MapEditor(STRAIGHT).problems(), []);
    assert.true(new MapEditor(STRAIGHT).ready);
  });

  QUnit.test("both of the game's maps are ready to play", (assert) => {
    for (const map of MAPS) assert.deepEqual(new MapEditor(map).problems(), [], map.name);
  });

  QUnit.test("a road that is too short is not worth playing", (assert) => {
    const editor = new MapEditor();
    editor.stroke({ col: 0, row: 0 }, { col: 4, row: 0 }, "road");
    editor.paint(0, 0, "start");
    editor.paint(4, 0, "goal");

    assert.true(editor.problems().some((p) => /only \d+ pieces long/.test(p)), editor.problems().join("; "));
  });

  QUnit.test("a board with no room to build is not worth playing, and says how much room there is", (assert) => {
    const rows = ["S" + "#".repeat(12) + "G", ...Array(8).fill("c".repeat(14))];
    const problems = new MapEditor({ name: "full", rows }).problems();

    assert.true(problems.some((p) => /room for 0 towers/.test(p)), problems.join("; "));
  });

  QUnit.test("each thing that is wrong is a sentence", (assert) => {
    for (const problem of new MapEditor().problems()) assert.true(typeof problem === "string" && problem.length > 10);
  });

  QUnit.test("the game's checks and the editor's are the same list: the editor never calls ready a map that the game would refuse", (assert) => {
    const editor = new MapEditor(STRAIGHT);
    for (let i = 0; i < 40; i++) {
      editor.paint((i * 5) % BOARD.cols, (i * 3) % BOARD.rows, BRUSHES[i % BRUSHES.length].id);
      const map = editor.toMap();
      const game = [...mapProblems(map), ...pathProblems(parseMap(map))];
      if (editor.ready) assert.strictEqual(game.length, 0, `step ${i}`);
    }
    assert.true(true);
  });

  QUnit.test("the limits are in a table", (assert) => {
    assert.true(EDITOR.minRoad > 0 && EDITOR.minBuildable > 0 && EDITOR.history > 0 && EDITOR.nameLength > 0);
  });
});
