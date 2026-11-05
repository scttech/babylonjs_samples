# Tutorial: Tower Defense Editor -- Make Your Own Map

This is the last tutorial in the Tower Defense series, and the one that all the others were for. A map has been **text** since the second tutorial: one character for each cell, parsed, checked, drawn and played. That was for this. In this tutorial the player **draws** a map: paints road and scenery on the board with brushes, with the game's own checks telling them what is wrong as they go; undoes and redoes; gives it a name; **saves** it in the browser so that it is on the title screen with the others; and **shares** it as a link that anyone can open and play. You write the code; this document tells you what to write and why.

By the end you'll have:

- **A map editor with no screen in it**: brushes, rules that make a mistake hard to make (one start, one goal, scenery only on grass), strokes and undo, and a list of what is wrong with the map in sentences, from the game's own checks
- **Sharing and keeping**: a map squeezed into a short code for a link, a decoder that believes nothing that it is given, and a store of the player's maps in storage that can fail
- **The board, as it is edited**: the same tiles, props and markers as the game, and only the cells that changed drawn again
- **The tools**: a palette, buttons that are there only when they can be pressed, a name, and the list of problems
- **An editor page** that puts them together with the pointer that paints
- **Custom maps in the game**: cards on the title for maps that were made or sent, with Edit and Delete, and a button to make one
- Unit tests for all of it: **1023 passing tests**, 116 of them new

**What you'll learn:** how to build an editor for a data format you already have (the format is the editor's output, and its checks are the editor's rules), how to make *drawing* undoable (a drag is one step, and a step is a snapshot), how to redraw only what changed, why everything that comes from a link or from storage has to be checked as if someone wanted to break the game with it, and how to hand a map from one page to another in an address.

**Before you start:** do the [Polish tutorial](../tower_defense_polish/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Polish sample, plus placeholders for the new files:

```
tower_defense_editor/
├── index.html, tests.html   (already list the new scripts)
├── editor.html              (the new page, already written: the board, the tools, and the scripts)
├── css/
│   ├── editor.css            (placeholder -- Step 5)
│   └── screens.css           (changes -- Step 6)
├── js/
│   ├── editor.js             (placeholder -- Step 1)
│   ├── share.js              (placeholder -- Step 2)
│   ├── boardview.js          (placeholder -- Step 3)
│   ├── toolbar.js            (placeholder -- Step 4)
│   ├── editormain.js         (placeholder -- Step 5)
│   ├── screens.js, main.js   (changes -- Step 6)
│   └── everything else, from the Polish sample
└── tests/
    ├── editor.tests.js, share.tests.js, boardview.tests.js, toolbar.tests.js   (placeholders -- Steps 1 to 4)
    ├── screens.tests.js      (changes -- Step 6)
    └── everything else, from the Polish sample
```

Open `tests.html` before you change anything, through the web server. You should see **907 passing tests**, the Polish sample's.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_editor/` (the command prints the exact address), or use the *Live Server* extension in VS Code. The editor is `editor.html` beside it (and there is a *Make a map* button on the title screen once Step 6 is done).

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **The editor**: a board of characters, and what a brush does.
2. **Sharing and keeping**: a map in a link and in storage, and what is not believed.
3. **The board**: the map, drawn as the game draws it, a cell at a time.
4. **The tools**: palette, actions, name and problems.
5. **The page**: the pointer that paints.
6. **In the game**: custom maps on the title.

---

## Step 1: The editor

A map is rows of characters, so an editor is a board of characters that you change. Everything else is rules. The editor knows nothing of the screen, of Babylon.js or of a pointer: it is told a cell and a brush, and says what changed. That is what lets it be tested to the last corner, and what lets a different front (a keyboard, a touch screen, a script) use it.

Open `js/editor.js` (the placeholder) and **replace the TODO line** with:

```js
// The map editor, without a screen: a board of characters that a player paints with brushes. It is the same map as the game's own,
// as text, so what it makes can be played at once; it keeps a few rules that make a mistake hard to make (one start and one goal, scenery only
// on grass); it can undo; and it can say, in sentences, what is wrong with the map as it is now, and so when it is ready to play. A map that
// is drawn is a map that the game's own checks (`mapProblems`, `pathProblems`) must pass, so that the editor can never make a map that the game
// can't play. See ../tests/editor.tests.js.

// The brushes, in the order of the palette. `color` is the color of its button. `char` is what the brush writes into the map (the letters of the map's legend); `kind` is what
// it does: "road", an "end" of the road (the start and the goal, of which there is one), "prop" (scenery, which goes on grass only), or
// "erase" (which makes grass).
const BRUSHES = [
  { id: "road", char: "#", name: "Road", kind: "road", color: "#d3b078" },
  { id: "start", char: "S", name: "Start", kind: "end", color: "#e0482b" },
  { id: "goal", char: "G", name: "Goal", kind: "end", color: "#f2c230" },
  { id: "cabbage_cart", char: "c", name: "Cabbage cart", kind: "prop", color: "#9a6b3a" },
  { id: "koi_pond", char: "k", name: "Koi pond", kind: "prop", color: "#38b6ff" },
  { id: "shrine", char: "s", name: "Spirit shrine", kind: "prop", color: "#c9c2b0" },
  { id: "lemur_perch", char: "l", name: "Lemur perch", kind: "prop", color: "#7a8f5a" },
  { id: "bison_camp", char: "b", name: "Sky bison camp", kind: "prop", color: "#e8e0d0" },
  { id: "erase", char: ".", name: "Eraser", kind: "erase", color: "#5e9c3b" },
];

const EDITOR = {
  history: 100, // how many steps can be undone
  minRoad: 12, // the fewest pieces of road in a map that is worth playing
  minBuildable: 24, // the fewest cells that a tower can be built in
  nameLength: 28, // the longest name that a map can have
};

// The brush with an id, or null.
function brushFor(id) {
  return BRUSHES.find((brush) => brush.id === id) || null;
}

// What kind of thing a character of a map is: the kind of the brush that writes it, or "grass" for a cell with nothing in it (the eraser makes grass).
function kindOfChar(char) {
  const brush = BRUSHES.find((candidate) => candidate.char === char);
  return brush && brush.kind !== "erase" ? brush.kind : "grass";
}

// The cells on a straight line from one cell to another, both included (Bresenham's line). A pointer that moves fast jumps over cells, and
// a stroke that is painted along this line has none missing.
function cellsBetween(from, to) {
  const cells = [];
  let col = from.col;
  let row = from.row;
  const dx = Math.abs(to.col - col);
  const dy = Math.abs(to.row - row);
  const stepX = col < to.col ? 1 : -1;
  const stepY = row < to.row ? 1 : -1;
  let error = dx - dy;
  for (;;) {
    cells.push({ col, row });
    if (col === to.col && row === to.row) return cells;
    const doubled = 2 * error;
    if (doubled > -dy) {
      error -= dy;
      col += stepX;
    }
    if (doubled < dx) {
      error += dx;
      row += stepY;
    }
  }
}

class MapEditor {
  // `map` is { name, rows } to begin with; without one the board is grass. `board` is the board it has to fit.
  constructor(map = null, board = BOARD) {
    this.board = board;
    this.name = map ? map.name : "My map";
    this.cells = map ? map.rows.map((text) => [...text.padEnd(board.cols, ".").slice(0, board.cols)]) : this.blank();
    while (this.cells.length < board.rows) this.cells.push(Array(board.cols).fill("."));
    this.cells.length = board.rows;
    this.undoStack = [];
    this.redoStack = [];
  }

  blank() {
    return Array.from({ length: this.board.rows }, () => Array(this.board.cols).fill("."));
  }

  get cols() {
    return this.board.cols;
  }

  get rows() {
    return this.board.rows;
  }

  // The character in a cell, or null off the board.
  get(col, row) {
    return this.inside(col, row) ? this.cells[row][col] : null;
  }

  inside(col, row) {
    return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && row >= 0 && col < this.cols && row < this.rows;
  }

  // The map as it is: { name, rows }, rows as strings.
  toMap() {
    return { name: this.name, rows: this.cells.map((line) => line.join("")) };
  }

  snapshot() {
    return this.cells.map((line) => line.join(""));
  }

  restore(rows) {
    this.cells = rows.map((text) => [...text]);
  }

  // What a brush would do to a cell: the character that the cell would have, and which cells change ({ col, row } for each, the one
  // that is painted and, for a start or a goal, the one that it takes the place of). Nothing at all if it can't be done: a prop
  // is put on grass or in place of other scenery, and a cell that already says what the brush says is not changed.
  plan(col, row, id) {
    const brush = brushFor(id);
    const now = this.get(col, row);
    if (!brush || now === null) return [];
    if (now === brush.char) return [];
    if (brush.kind === "prop" && kindOfChar(now) !== "grass" && kindOfChar(now) !== "prop") return []; // scenery goes on grass, or in place of other scenery
    const changes = [{ col, row, char: brush.char }];
    if (brush.kind === "end") {
      // There is one start and one goal: a second takes the place of the first, which becomes grass.
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) if (this.cells[r][c] === brush.char) changes.push({ col: c, row: r, char: "." });
    }
    return changes;
  }

  // Paints a cell with a brush. It says which cells changed (so that the view can change only those), and an empty list if nothing did.
  paint(col, row, id) {
    const changes = this.plan(col, row, id);
    if (changes.length === 0) return [];
    this.remember();
    for (const change of changes) this.cells[change.row][change.col] = change.char;
    return changes.map(({ col: c, row: r }) => ({ col: c, row: r }));
  }

  // A stroke is a drag of the pointer: it begins, it is painted along lines, and it ends, and the whole of it is one step that can be undone.
  begin() {
    this.pending = this.snapshot();
  }

  // Paints every cell on a line, as part of the stroke. It says which cells changed, so that the view can change only those.
  strokeTo(from, to, id) {
    if (!this.pending) this.begin();
    const changed = [];
    for (const cell of cellsBetween(from, to)) {
      for (const change of this.plan(cell.col, cell.row, id)) {
        this.cells[change.row][change.col] = change.char;
        changed.push({ col: change.col, row: change.row });
      }
    }
    return changed;
  }

  // The stroke is over: if it changed anything, that is a step.
  end() {
    if (!this.pending) return false;
    const before = this.pending;
    this.pending = null;
    if (before.every((text, i) => text === this.cells[i].join(""))) return false;
    this.push(before);
    return true;
  }

  // A stroke from one cell to another, in one go.
  stroke(from, to, id) {
    this.begin();
    const changed = this.strokeTo(from, to, id);
    this.end();
    return changed;
  }

  // Puts the rows as they were on the stack of what can be undone.
  push(rows) {
    this.undoStack.push(rows);
    if (this.undoStack.length > EDITOR.history) this.undoStack.shift();
    this.redoStack = [];
  }

  remember() {
    this.push(this.snapshot());
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  // Goes back a step, and says which cells changed. Nothing if there is nothing to undo.
  undo() {
    if (!this.canUndo) return [];
    const now = this.snapshot();
    const before = this.undoStack.pop();
    this.redoStack.push(now);
    return this.change(before);
  }

  redo() {
    if (!this.canRedo) return [];
    const now = this.snapshot();
    const after = this.redoStack.pop();
    this.undoStack.push(now);
    return this.change(after);
  }

  // Makes the board these rows, and says which cells are not what they were.
  change(rows) {
    const old = this.snapshot();
    this.restore(rows);
    const changed = [];
    for (let row = 0; row < this.rows; row++) for (let col = 0; col < this.cols; col++) if (old[row][col] !== rows[row][col]) changed.push({ col, row });
    return changed;
  }

  // Clears the board to grass, as a step that can be undone.
  clear() {
    const before = this.snapshot();
    const blank = this.blank().map((line) => line.join(""));
    if (before.every((text, i) => text === blank[i])) return [];
    this.push(before);
    return this.change(blank);
  }

  setName(name) {
    this.name = String(name).replace(/\s+/g, " ").trim().slice(0, EDITOR.nameLength) || "My map";
  }

  // Everything wrong with the map as it is, as sentences: the game's own checks, and the editor's (enough road, and room to build). A
  // map with nothing in the list can be played. While the road is still being drawn the list is long, and is the editor's way of saying what
  // is next.
  problems() {
    const map = this.toMap();
    const grid = parseMap(map);
    const problems = [...mapProblems(map, this.board)];
    if (problems.length === 0) problems.push(...pathProblems(grid));
    if (problems.length === 0) {
      const roads = grid.cells.flat().filter((cell) => cell === "road").length;
      if (roads < EDITOR.minRoad) problems.push(`the road is only ${roads} pieces long, and it needs at least ${EDITOR.minRoad}`);
      const room = buildableCells(grid).length;
      if (room < EDITOR.minBuildable) problems.push(`there is room for ${room} towers, and there should be room for at least ${EDITOR.minBuildable}`);
    }
    return problems;
  }

  get ready() {
    return this.problems().length === 0;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BRUSHES, EDITOR, brushFor, kindOfChar, cellsBetween, MapEditor };
} else {
  Object.assign(window, { BRUSHES, EDITOR, brushFor, kindOfChar, cellsBetween, MapEditor });
}
```

Things to notice:

- **The brushes are a table,** `BRUSHES`, and each writes one character of the map's legend (`#`, `S`, `G`, the five props, and the eraser's `.`). A test says there is a brush for *every* character of the legend, so that nothing a map can say can't be drawn, and that the scenery brushes are the props of the scenery table, by name. A sixth prop is a row in `PROPS`, a letter in the legend, and a row here.
- **A `kind` says what a brush does.** `road` replaces whatever is there; an `end` (the start and the goal) is the only one of its kind, so painting a second takes the place of the first, which becomes grass; a `prop` goes on grass, or in place of other scenery, and not on the road; the `erase` brush makes grass.
- **`plan` says what a brush would do, and `paint` and strokes do it.** Working out the change first (which cells, and what each becomes) is what lets the view be told *exactly* which cells changed, and lets a brush that would change nothing change nothing, and not be a step to undo.
- **A drag is a stroke, and a stroke is one step.** The pointer reports where it is thirty times a second, and a fast one jumps over cells; `cellsBetween` is Bresenham's line algorithm, which gives the cells on a straight line from where the pointer was to where it is, so there is no gap in a road. `begin`, `strokeTo` and `end` bracket it, and `end` puts the whole stroke on the stack as a single step. Undo has to undo what the player did (*a road*), and not what the pointer did (*forty small movements*).
- **A step is a snapshot.** The board is nine short strings, and a step that can be undone is the nine strings from before it. That is more memory than remembering what changed, and it is so much simpler that there is nothing to go wrong: `undo` puts the strings back, and says which cells are different, by comparing. `history` in the table says how many are kept.
- **`problems()` is the game's own checks.** `mapProblems` (rows, widths, one start, one goal, the ends on the edge, each piece of road with two neighbors) and `pathProblems` (the road gets from the start to the goal, and there is no road that isn't on the way) are what the game runs on a map before it plays it, and the editor *calls them*. It adds two of its own (a road that is long enough, and room for towers), and, because it only adds checks, **a map that the editor calls ready is a map that the game plays**. A test checks that with a hundred random maps.
- **While the road is being drawn, the list is long, and that is how the editor says what to do next:** *the road at column 1, row 2 has 1 neighbor, and should have 2*. The checks were written to explain a mistake to a person who typed a map by hand, and they explain it to a person who is painting one.

Open `tests/editor.tests.js` (the placeholder) and **replace the TODO line** with:

```js
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
```

- **"Both of the game's maps are ready to play"** is the test that the rules and the maps agree: the maps of the second tutorial pass the editor's checks (including the room for towers, which the editor was given the numbers for after looking at them).
- **"Undoing all the way gets back to where it began"** and **"a whole drag is one step to undo"** are the two tests of undo that matter.

**Check:** open `tests.html`. 953 tests pass.

---

## Step 2: Sharing and keeping

A map is a few hundred characters, so it can go in a link. And a map that someone has made should still be there tomorrow, so it can go in the browser's storage. Both are things that come from *outside* the game: a link can say anything, and so can storage that another page wrote. Everything in this step is about **not believing what comes in**.

Open `js/share.js` (the placeholder) and **replace the TODO line** with:

```js
// Sharing and keeping maps. A map is a few rows of text, so it can be squeezed into a short code that goes in a link (`?data=...`) and be sent to
// someone, and a list of the maps that a player has made is kept in the browser's storage. Both are things that come from *outside* the game: a link
// can say anything, and so can storage that someone else's page wrote, so everything that comes in is checked before it is believed, and a map
// that the game can't play is never let in. See ../tests/share.tests.js.

const SHARE = {
  maxCode: 1200, // the longest code that is looked at at all (a real map is a few hundred)
  maxMaps: 12, // how many maps a player can keep
  storageKey: "tower_defense_maps",
};

// A row of a map with its runs squeezed: "....##" is ".4#2". A run of one is the character alone.
function squeezeRow(text) {
  let out = "";
  for (let i = 0; i < text.length; ) {
    let j = i;
    while (j < text.length && text[j] === text[i]) j++;
    out += text[i] + (j - i > 1 ? String(j - i) : "");
    i = j;
  }
  return out;
}

// A row, as it was. It says nothing (null) for something that is not a squeezed row that fits the board: a character that is not in the legend, a
// run that is too long, or a row that is not the width of the board.
function stretchRow(text, width) {
  let out = "";
  const pattern = /([^0-9])(\d*)/g;
  let match;
  let consumed = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match[0].length === 0) break;
    consumed += match[0].length;
    if (!Object.hasOwn(LEGEND, match[1])) return null;
    const run = match[2] === "" ? 1 : Number(match[2]);
    if (run < 1 || run > width) return null;
    out += match[1].repeat(run);
    if (out.length > width) return null;
  }
  return consumed === text.length && out.length === width ? out : null;
}

// Text as a string that is safe in an address: the bytes of its UTF-8, in base64, with the characters that mean something in an address
// changed (`-` and `_`) and no padding.
function toCode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The text that a code stands for, or null if it isn't one.
function fromCode(code) {
  try {
    const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (letter) => letter.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    return null;
  }
}

// A map as a code: its name and its squeezed rows.
function encodeMap(map) {
  return toCode(JSON.stringify({ n: map.name, r: map.rows.map(squeezeRow).join("/") }));
}

// Whether a map can be played: it fits the board, and everything that the editor checks passes.
function playable(map, board = BOARD) {
  return new MapEditor(map, board).problems().length === 0;
}

// A map from a code, or why not: { ok: true, map } or { ok: false, problems }. Nothing in a code is believed: its size is limited, it is
// parsed without throwing, its name is made safe, each of its rows is checked against the legend and the board, and the map must be one that
// the game can play.
function decodeMap(code, board = BOARD) {
  if (typeof code !== "string" || code.length === 0) return { ok: false, problems: ["there is no map in the link"] };
  if (code.length > SHARE.maxCode) return { ok: false, problems: ["the link is too long to be a map"] };
  const text = fromCode(code);
  if (text === null) return { ok: false, problems: ["the link is not a map"] };
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { ok: false, problems: ["the link is not a map"] };
  }
  if (!data || typeof data.n !== "string" || typeof data.r !== "string") return { ok: false, problems: ["the link is not a map"] };
  const squeezed = data.r.split("/");
  if (squeezed.length !== board.rows) return { ok: false, problems: [`the map has ${squeezed.length} rows, and the board has ${board.rows}`] };
  const rows = squeezed.map((row) => stretchRow(row, board.cols));
  if (rows.includes(null)) return { ok: false, problems: ["a row of the map is not a row of a map"] };
  const editor = new MapEditor({ name: "x", rows }, board);
  editor.setName(data.n);
  const map = editor.toMap();
  const problems = editor.problems();
  return problems.length === 0 ? { ok: true, map } : { ok: false, problems };
}

// The address of the game for a map that comes in a link: the address now, with the code in it (and the map, and the go, of an address that
// was there, taken out so that the code is what says which map).
function shareUrl(href, map, page = "index.html") {
  const url = new URL(href);
  url.pathname = url.pathname.replace(/[^/]*$/, page);
  url.search = "";
  url.hash = "";
  url.searchParams.set("data", encodeMap(map));
  return url.toString();
}

// The maps that a player has made, kept in the browser's storage (which is allowed to fail: then there are none, and none are kept).
class MapStore {
  constructor(storage, key = SHARE.storageKey) {
    this.storage = storage;
    this.key = key;
    this.maps = this.load();
  }

  // What is in storage, and fit to be believed: a list of { id, name, rows } of maps that can be played, and no more than the most that are kept.
  load() {
    try {
      const data = JSON.parse(this.storage.getItem(this.key));
      if (!Array.isArray(data)) return [];
      return data
        .filter((entry) => entry && typeof entry.id === "string" && typeof entry.name === "string" && Array.isArray(entry.rows) && entry.rows.every((row) => typeof row === "string"))
        .filter((entry) => playable(entry))
        .slice(0, SHARE.maxMaps)
        .map(({ id, name, rows }) => ({ id, name, rows }));
    } catch (error) {
      return [];
    }
  }

  save() {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.maps));
    } catch (error) {
      // Not saved; the maps are kept until the page is closed.
    }
  }

  list() {
    return this.maps.map((entry) => ({ ...entry }));
  }

  get(id) {
    const entry = this.maps.find((candidate) => candidate.id === id);
    return entry ? { ...entry } : null;
  }

  // Keeps a map ({ name, rows }). With the id of one that is kept, it is made that map; without, it is a new one. It says the id, or null if the
  // map can't be played or if there is no room for another.
  put(map, id = null) {
    if (!playable(map)) return null;
    const entry = { id: id || `m${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, name: map.name, rows: [...map.rows] };
    const at = this.maps.findIndex((candidate) => candidate.id === entry.id);
    if (at >= 0) this.maps[at] = entry;
    else if (this.maps.length >= SHARE.maxMaps) return null;
    else this.maps.push(entry);
    this.save();
    return entry.id;
  }

  remove(id) {
    const before = this.maps.length;
    this.maps = this.maps.filter((entry) => entry.id !== id);
    if (this.maps.length !== before) this.save();
    return this.maps.length !== before;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SHARE, squeezeRow, stretchRow, toCode, fromCode, encodeMap, decodeMap, playable, shareUrl, MapStore };
} else {
  Object.assign(window, { SHARE, squeezeRow, stretchRow, toCode, fromCode, encodeMap, decodeMap, playable, shareUrl, MapStore });
}
```

Things to notice:

- **Squeezing is run-length encoding.** `....##` is `.4#2`; a run of one is the character alone. A map of a hundred and twenty-six cells is about eighty characters, then a name, then base64 for the address (`toCode`: the bytes of the text's UTF-8, with `-` and `_` for the two characters of base64 that mean something in an address). The result is well under the limit that `decodeMap` allows.
- **`stretchRow` is strict.** It says nothing (`null`) for a character that is not in the legend, a run of none, a run that is bigger than the row, a number with no character, a row that is cut off, and a row that is not the width of the board. A name that every object has (`constructor`) is not a character of the legend: `Object.hasOwn`, as in the tables of the Polish tutorial.
- **`decodeMap` believes nothing.** The code has a limit on its length; the text may not be a code, the JSON may not be JSON, and the JSON may not be of the right shape; every row is stretched with the checks above; the name is tidied and cut to length (and is only ever put on the page as text, never as HTML); and, last, **the map must be one that the game can play**, by the editor's own `problems()`. A link that says anything else gets `{ ok: false, problems }`, and the game says no such map came. A test feeds it every kind of nonsense, including a code that is cut off at every seventh character, and says that it never throws.
- **`shareUrl` makes the address of a page for a map:** the address that the page has now, with the page's name replaced (`index.html` or `editor.html`) and the query and the hash taken out, so that the code is the only thing that says which map.
- **`MapStore` keeps the player's maps** in the browser's storage, as a list of `{ id, name, rows }`. It is given its storage (as `Records` and `Preferences` were), and what it reads back is **checked again**: an entry that is not an object, or has the wrong types, or is a map that can't be played, is dropped, and the rest are kept. Storage that is blocked, or full, or has nonsense in it, is no maps and no error.
- **A list that it gives out is a copy,** so that a page that changes the list changes nothing that is kept. A map is put with `put(map, id)`: with the id of one that is kept, it replaces that map; without, it is a new one with an id of its own; and when there are `maxMaps` (twelve), a new one is refused (`null`) and an old one can still be changed.

Open `tests/share.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("squeezing a row", () => {
  QUnit.test("a run of the same character is the character and how many", (assert) => {
    assert.strictEqual(squeezeRow("....##"), ".4#2");
    assert.strictEqual(squeezeRow("S###G"), "S#3G");
  });

  QUnit.test("a run of one is the character alone", (assert) => {
    assert.strictEqual(squeezeRow(".#.#"), ".#.#");
  });

  QUnit.test("a row that is squeezed and stretched is the row that it was, for every row of both maps", (assert) => {
    for (const map of MAPS) for (const row of map.rows) assert.strictEqual(stretchRow(squeezeRow(row), row.length), row, row);
  });

  QUnit.test("every row of a map is as short as it can be, and a map is under the limit of a code", (assert) => {
    for (const map of MAPS) assert.true(encodeMap(map).length < SHARE.maxCode / 2, `${map.name}: ${encodeMap(map).length} characters`);
  });
});

QUnit.module("stretching a row", () => {
  QUnit.test("is the row, if it is a row of the width", (assert) => {
    assert.strictEqual(stretchRow(".4#2", 6), "....##");
  });

  QUnit.test("is nothing for a row of the wrong width, too short or too long", (assert) => {
    assert.strictEqual(stretchRow(".4#2", 7), null);
    assert.strictEqual(stretchRow(".4#2", 5), null);
  });

  QUnit.test("is nothing for a character that is not in the legend", (assert) => {
    assert.strictEqual(stretchRow(".3X2", 6), null);
    assert.strictEqual(stretchRow("<script>", 8), null);
  });

  QUnit.test("is nothing for a run of none, or a run bigger than the row, or a number with no character, or one that is cut off", (assert) => {
    assert.strictEqual(stretchRow(".0#5", 5), null);
    assert.strictEqual(stretchRow(".99999999999", 6), null);
    assert.strictEqual(stretchRow("12", 12), null);
    assert.strictEqual(stretchRow("", 0), "");
  });

  QUnit.test("a name that every object has is not a character of the legend", (assert) => {
    assert.strictEqual(stretchRow("constructor", 11), null);
  });
});

QUnit.module("codes", () => {
  QUnit.test("text goes into a code and comes out as it was, with characters that are not plain", (assert) => {
    for (const text of ["hello", "", "naïve — 日本語 ☆", "{\"n\":\"x\"}"]) assert.strictEqual(fromCode(toCode(text)), text, text);
  });

  QUnit.test("a code is safe in an address: no plus, no slash, no equals", (assert) => {
    const code = toCode("???>>>~~~ ÿÿÿ".repeat(10));

    assert.true(/^[A-Za-z0-9_-]*$/.test(code), code);
  });

  QUnit.test("what isn't a code is nothing, and not an error", (assert) => {
    assert.strictEqual(fromCode("!!!not base 64!!!"), null);
    assert.strictEqual(fromCode("_____"), null, "bytes that are not text");
  });
});

QUnit.module("encodeMap and decodeMap", () => {
  QUnit.test("a map goes into a code and comes out the same map, for each of the game's own", (assert) => {
    for (const map of MAPS) {
      const result = decodeMap(encodeMap(map));

      assert.true(result.ok, map.name);
      assert.deepEqual(result.map, map);
    }
  });

  QUnit.test("a map that was drawn comes out the same, with its name", (assert) => {
    const editor = new MapEditor(MAPS[0]);
    editor.setName("Mine, with 日本語");
    const result = decodeMap(encodeMap(editor.toMap()));

    assert.true(result.ok);
    assert.strictEqual(result.map.name, "Mine, with 日本語");
  });

  QUnit.test("nothing, or not text, or too long, is no map", (assert) => {
    for (const code of [undefined, null, "", 42, {}, "x".repeat(SHARE.maxCode + 1)]) assert.false(decodeMap(code).ok, String(code).slice(0, 20));
  });

  QUnit.test("something that is not a map is no map: not JSON, or JSON of another shape", (assert) => {
    for (const text of ["not json", "[]", "null", JSON.stringify({ n: 3, r: "x" }), JSON.stringify({ n: "x" }), JSON.stringify({ r: "x" })]) {
      assert.false(decodeMap(toCode(text)).ok, text);
    }
  });

  QUnit.test("a map with the wrong number of rows, or a bad row, is no map, and says what is wrong", (assert) => {
    const rows = encodeMap(MAPS[0]);
    const data = JSON.parse(fromCode(rows));
    const short = decodeMap(toCode(JSON.stringify({ n: "x", r: data.r.split("/").slice(1).join("/") })));
    const bad = decodeMap(toCode(JSON.stringify({ n: "x", r: data.r.replace(".", "Z") })));

    assert.false(short.ok);
    assert.true(short.problems[0].includes("rows"));
    assert.false(bad.ok);
  });

  QUnit.test("a map that can't be played is no map, however well it is made: the game's checks apply to what comes in a link", (assert) => {
    const blank = new MapEditor().toMap();
    const result = decodeMap(encodeMap(blank));

    assert.false(result.ok);
    assert.true(result.problems.length > 0);
  });

  QUnit.test("a name is made safe: it is tidied and cut, and it is only ever put on the page as text", (assert) => {
    const data = JSON.parse(fromCode(encodeMap(MAPS[0])));
    data.n = "  <img src=x onerror=alert(1)>  " + "y".repeat(100);
    const result = decodeMap(toCode(JSON.stringify(data)));

    assert.true(result.ok);
    assert.true(result.map.name.length <= EDITOR.nameLength);
    assert.false(/^\s|\s$/.test(result.map.name));
  });

  QUnit.test("a code that is only part of a code is no map, and no code throws", (assert) => {
    const code = encodeMap(MAPS[1]);
    for (let cut = 1; cut < code.length; cut += 7) assert.strictEqual(typeof decodeMap(code.slice(0, cut)).ok, "boolean");
    for (const part of [code.slice(0, 5), code.slice(0, code.length - 3), code + "!!"]) assert.strictEqual(typeof decodeMap(part).ok, "boolean");
  });
});

QUnit.module("shareUrl", () => {
  QUnit.test("is the address of a page with the map in it, and nothing else of the address that was", (assert) => {
    const url = new URL(shareUrl("http://localhost:3000/samples/x/index.html?map=1&go=1&dev=1#top", MAPS[0]));

    assert.strictEqual(url.origin, "http://localhost:3000");
    assert.strictEqual(url.pathname, "/samples/x/index.html");
    assert.deepEqual([...url.searchParams.keys()], ["data"]);
    assert.strictEqual(url.hash, "");
  });

  QUnit.test("can be the address of another page beside it", (assert) => {
    const url = new URL(shareUrl("http://localhost/samples/x/index.html", MAPS[0], "editor.html"));

    assert.strictEqual(url.pathname, "/samples/x/editor.html");
  });

  QUnit.test("the map is in it, and comes out", (assert) => {
    const url = new URL(shareUrl("http://localhost/a/index.html", MAPS[1]));

    assert.deepEqual(decodeMap(url.searchParams.get("data")).map, MAPS[1]);
  });
});

QUnit.module("a MapStore", () => {
  const memory = () => {
    const data = {};
    return { data, getItem: (key) => (key in data ? data[key] : null), setItem: (key, value) => (data[key] = value) };
  };

  QUnit.test("begins with no maps", (assert) => {
    assert.deepEqual(new MapStore(memory()).list(), []);
  });

  QUnit.test("keeps a map that can be played, and says its id; and gives it back", (assert) => {
    const store = new MapStore(memory());
    const id = store.put(MAPS[0]);

    assert.true(typeof id === "string" && id.length > 0);
    assert.deepEqual(store.get(id), { id, name: MAPS[0].name, rows: MAPS[0].rows });
    assert.strictEqual(store.list().length, 1);
  });

  QUnit.test("does not keep a map that can't be played", (assert) => {
    const store = new MapStore(memory());

    assert.strictEqual(store.put(new MapEditor().toMap()), null);
    assert.strictEqual(store.list().length, 0);
  });

  QUnit.test("a map that is put again with its id replaces the old one, and does not add another", (assert) => {
    const store = new MapStore(memory());
    const id = store.put(MAPS[0]);
    store.put({ ...MAPS[1], name: "Changed" }, id);

    assert.strictEqual(store.list().length, 1);
    assert.strictEqual(store.get(id).name, "Changed");
  });

  QUnit.test("each map has an id of its own", (assert) => {
    const store = new MapStore(memory());
    const ids = [store.put(MAPS[0]), store.put(MAPS[0]), store.put(MAPS[1])];

    assert.strictEqual(new Set(ids).size, 3);
  });

  QUnit.test("only so many are kept, and a full store says so (null), and still saves an old one that is changed", (assert) => {
    const store = new MapStore(memory());
    const ids = [];
    for (let i = 0; i < SHARE.maxMaps; i++) ids.push(store.put({ ...MAPS[0], name: `map ${i}` }));

    assert.strictEqual(store.put(MAPS[1]), null);
    assert.strictEqual(store.list().length, SHARE.maxMaps);
    assert.strictEqual(store.put({ ...MAPS[1], name: "again" }, ids[0]), ids[0]);
  });

  QUnit.test("remove takes a map away, and says whether there was one", (assert) => {
    const store = new MapStore(memory());
    const id = store.put(MAPS[0]);

    assert.true(store.remove(id));
    assert.deepEqual(store.list(), []);
    assert.false(store.remove(id));
  });

  QUnit.test("the maps are kept: a new store on the same storage has them", (assert) => {
    const storage = memory();
    const id = new MapStore(storage).put(MAPS[1]);

    assert.deepEqual(new MapStore(storage).get(id).rows, MAPS[1].rows);
  });

  QUnit.test("what is in storage is not believed: entries that are not maps, or that can't be played, are dropped, and the rest are kept", (assert) => {
    const storage = memory();
    storage.setItem(SHARE.storageKey, JSON.stringify([{ id: "a", name: "ok", rows: MAPS[0].rows }, { id: "b", name: "bad", rows: ["S#G"] }, { id: 3, name: "x", rows: [] }, null, "text", { id: "c", name: "x", rows: [1, 2] }]));

    assert.deepEqual(new MapStore(storage).list().map((m) => m.id), ["a"]);
  });

  QUnit.test("storage with nonsense, or that isn't a list, is no maps and no error", (assert) => {
    for (const value of ["{nope", "{}", "42", "null", ""]) {
      const storage = memory();
      storage.setItem(SHARE.storageKey, value);

      assert.deepEqual(new MapStore(storage).list(), [], value);
    }
  });

  QUnit.test("storage that can't be written to loses nothing for the page that is open, and does not throw", (assert) => {
    const full = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const store = new MapStore(full);
    const id = store.put(MAPS[0]);

    assert.true(typeof id === "string");
    assert.strictEqual(store.list().length, 1);
  });

  QUnit.test("a list that is given out is a copy: changing it changes nothing kept", (assert) => {
    const store = new MapStore(memory());
    store.put(MAPS[0]);
    store.list()[0].name = "changed";
    store.list().push({});

    assert.strictEqual(store.list().length, 1);
    assert.strictEqual(store.list()[0].name, MAPS[0].name);
  });
});
```

- **"A map that can't be played is no map, however well it is made"** encodes an empty board, which is a perfectly well-formed map, and says that it does not come out. It is the test of the last line of `decodeMap`.
- **"What is in storage is not believed"** writes six entries, five of them wrong in different ways, and says that the one that is right is the one that is kept.

**Check:** open `tests.html`. 988 tests pass.

---

## Step 3: The board

The map has to be *seen*, as it will be played: the same tiles, the same scenery, the same markers, drawn with the very functions that the game draws with (`pieceAt`, `placeTile`, `placeProp`, `buildMarker`), so that nothing about a map is a surprise when it is played.

The thing to get right is **what to redraw**. A board is a hundred and twenty-six tiles, and painting a road moves the pointer over perhaps forty cells in a drag. If every cell that the pointer touched rebuilt the whole board, the drag would stutter. So a change redraws **only the cell that changed and the four beside it** (a piece of road is the piece that it is by its neighbors: a straight piece becomes a corner when the road beside it turns), and the scenery of the cell that changed, and the two markers.

Open `js/boardview.js` (the placeholder) and **replace the TODO line** with:

```js
// The board that is edited, as the game shows it: the tiles, the scenery, and the two markers, drawn from the editor's map with the same functions
// as the game (`pieceAt`, `placeTile`, `placeProp`, `buildMarker`), so that what a player sees as they paint is what they will play on. A change
// of a cell changes that cell, and the cells beside it (a piece of road is the piece that it is by its neighbors), and nothing else: a whole board
// is a hundred and twenty tiles, and painting must not rebuild them all for every cell that a finger passes. See ../tests/boardview.tests.js.

// The cells that have to be drawn again when these cells change: each of them, and the four beside each, that are on the board.
function affectedCells(changed, board = BOARD) {
  const seen = new Map();
  for (const { col, row } of changed) {
    for (const [c, r] of [[col, row], [col, row - 1], [col + 1, row], [col, row + 1], [col - 1, row]]) {
      if (c >= 0 && r >= 0 && c < board.cols && r < board.rows) seen.set(`${c},${r}`, { col: c, row: r });
    }
  }
  return [...seen.values()];
}

class EditorBoard {
  // `tiles` and `props` are what loadTiles and loadProps made.
  constructor(scene, tiles, props, board = BOARD) {
    this.scene = scene;
    this.tiles = tiles;
    this.props = props;
    this.board = board;
    this.tileNodes = new Map(); // "col,row" -> the node of the tile
    this.propNodes = new Map();
    this.markers = [];
  }

  // Draws the whole of the map.
  show(editor) {
    const grid = parseMap(editor.toMap());
    for (const { col, row } of boardCells(this.board)) {
      this.placeTileAt(grid, col, row);
      this.placePropAt(grid, col, row);
    }
    this.placeMarkers(grid);
  }

  placeTileAt(grid, col, row) {
    const key = `${col},${row}`;
    if (this.tileNodes.has(key)) this.tileNodes.get(key).dispose();
    const { kind, turn } = pieceAt(grid, col, row);
    this.tileNodes.set(key, placeTile(this.scene, this.tiles[kind], `tile ${key}`, col, row, turn, this.board));
  }

  placePropAt(grid, col, row) {
    const key = `${col},${row}`;
    if (this.propNodes.has(key)) {
      this.propNodes.get(key).dispose();
      this.propNodes.delete(key);
    }
    const prop = propAt(grid, col, row);
    if (prop) this.propNodes.set(key, placeProp(this.scene, this.props[prop.kind], `${prop.kind} ${key}`, col, row, propTurn(col, row), this.board));
  }

  // The markers go where the start and the goal are now (it is two small things, and they are made again).
  placeMarkers(grid) {
    for (const marker of this.markers) {
      marker.ring.material.dispose();
      marker.disc.material.dispose();
      marker.node.dispose();
    }
    this.markers = [];
    if (grid.start) this.markers.push(buildMarker(this.scene, "start", grid.start.col, grid.start.row, this.board));
    if (grid.goal) this.markers.push(buildMarker(this.scene, "goal", grid.goal.col, grid.goal.row, this.board));
  }

  // Draws what changed: the cells that were painted and the ones beside them. It says how many tiles it drew.
  update(editor, changed) {
    if (changed.length === 0) return 0;
    const grid = parseMap(editor.toMap());
    const cells = affectedCells(changed, this.board);
    for (const { col, row } of cells) this.placeTileAt(grid, col, row);
    for (const { col, row } of changed) this.placePropAt(grid, col, row);
    this.placeMarkers(grid);
    return cells.length;
  }

  // Every frame: the markers breathe.
  tick(time) {
    this.markers.forEach((marker) => marker.update(time));
  }

  dispose() {
    this.tileNodes.forEach((node) => node.dispose());
    this.propNodes.forEach((node) => node.dispose());
    this.tileNodes.clear();
    this.propNodes.clear();
    this.placeMarkers({ start: null, goal: null });
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { affectedCells, EditorBoard };
} else {
  Object.assign(window, { affectedCells, EditorBoard });
}
```

Things to notice:

- **`affectedCells` is the arithmetic, apart from the scene.** A cell in the middle is five cells, one in a corner is three, cells that are beside each other share their neighbors (a stroke of eight cells is twenty-six cells, and not forty), nothing is off the board, and nothing is in the list twice. It is a function of the changed cells, so a test needs no scene.
- **A tile that is redrawn is disposed first,** so that nothing is left in the scene: the old node and the instance of the model under it. The models themselves are shared (every tile of a kind is an instance of one loaded mesh, as in the first tutorial), so drawing a tile is cheap and disposing one frees only the instance.
- **The markers are made again** whenever anything changes, since a start or a goal may have moved, and they are two small things. The materials of the old ones are disposed (they are not shared), or each change would leave two more.
- **`dispose` leaves nothing in the scene:** the test counts the scene's meshes before and after.

Open `tests/boardview.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("affectedCells", () => {
  const keys = (cells) => cells.map((c) => `${c.col},${c.row}`).sort();

  QUnit.test("a cell in the middle is five cells: itself and the four beside it", (assert) => {
    assert.deepEqual(keys(affectedCells([{ col: 5, row: 4 }])), ["4,4", "5,3", "5,4", "5,5", "6,4"]);
  });

  QUnit.test("a cell in the corner is three, and one on the edge four: nothing off the board", (assert) => {
    assert.strictEqual(affectedCells([{ col: 0, row: 0 }]).length, 3);
    assert.strictEqual(affectedCells([{ col: 0, row: 4 }]).length, 4);
    assert.strictEqual(affectedCells([{ col: BOARD.cols - 1, row: BOARD.rows - 1 }]).length, 3);
  });

  QUnit.test("cells that are beside each other share their neighbors, and none is in the list twice", (assert) => {
    const cells = affectedCells([{ col: 5, row: 4 }, { col: 6, row: 4 }]);

    assert.strictEqual(cells.length, 8);
    assert.strictEqual(new Set(keys(cells)).size, cells.length);
  });

  QUnit.test("nothing changed is nothing to draw, and a cell that is off the board is not drawn", (assert) => {
    assert.deepEqual(affectedCells([]), []);
    assert.deepEqual(affectedCells([{ col: -5, row: -5 }]), []);
  });
});

QUnit.module("the EditorBoard", (hooks) => {
  let engine, scene, tiles, props, baseMeshes;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    tiles = await loadTiles(scene);
    props = await loadProps(scene);
    baseMeshes = scene.meshes.length;
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const STRAIGHT_MAP = { name: "s", rows: ["S" + "#".repeat(12) + "G", ...Array(8).fill(".".repeat(14))] };

  QUnit.test("show draws a tile in every cell, a prop for each prop, and a marker for the start and the goal", (assert) => {
    const editor = new MapEditor({ name: "x", rows: ["S" + "#".repeat(12) + "G", "..c...........", ...Array(7).fill(".".repeat(14))] });
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);

    assert.strictEqual(board.tileNodes.size, BOARD.cols * BOARD.rows);
    assert.strictEqual(board.propNodes.size, 1);
    assert.strictEqual(board.markers.length, 2);
    board.dispose();
  });

  QUnit.test("a tile is the piece of the cell, as the game would have it, and a road piece is turned as the road goes", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    const grid = parseMap(editor.toMap());
    const node = board.tileNodes.get("5,0");
    const want = pieceAt(grid, 5, 0);

    assert.strictEqual(node.rotation.y, (want.turn * Math.PI) / 2);
    assert.notStrictEqual(want.kind, "grass");
    board.dispose();
  });

  QUnit.test("a change draws only the cells that it changes and the ones beside them: the other tiles are the very same tiles", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    const before = new Map(board.tileNodes);
    const changed = editor.paint(5, 4, "road");
    const drawn = board.update(editor, changed);
    let replaced = 0;
    for (const [key, node] of board.tileNodes) if (before.get(key) !== node) replaced++;

    assert.strictEqual(drawn, 5);
    assert.strictEqual(replaced, 5);
    assert.true(before.get("5,4").isDisposed(), "and the old tile is gone from the scene");
    assert.false(before.get("9,7").isDisposed(), "a tile far away is left alone");
    board.dispose();
  });

  QUnit.test("a piece of road changes when the road beside it does: it is a corner where the road turns", (assert) => {
    const editor = new MapEditor({ name: "x", rows: ["S" + "#".repeat(12) + "G", "#" + ".".repeat(13), ...Array(7).fill(".".repeat(14))] });
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    const turnBefore = board.tileNodes.get("1,0").rotation.y;
    const changed = editor.paint(1, 1, "road");
    board.update(editor, changed);
    const grid = parseMap(editor.toMap());

    assert.strictEqual(board.tileNodes.get("1,0").rotation.y, (pieceAt(grid, 1, 0).turn * Math.PI) / 2);
    assert.true(turnBefore !== undefined);
    board.dispose();
  });

  QUnit.test("painting scenery draws it, and erasing it takes it away", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.update(editor, editor.paint(4, 4, "shrine"));
    assert.true(board.propNodes.has("4,4"));
    const node = board.propNodes.get("4,4");
    board.update(editor, editor.paint(4, 4, "erase"));

    assert.false(board.propNodes.has("4,4"));
    assert.true(node.isDisposed());
    board.dispose();
  });

  QUnit.test("scenery changed for other scenery is drawn as the new kind, and there is one prop in the cell", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.update(editor, editor.paint(4, 4, "shrine"));
    board.update(editor, editor.paint(4, 4, "koi_pond"));

    assert.strictEqual(board.propNodes.size, 1);
    assert.true(board.propNodes.get("4,4").name.startsWith("koi_pond"));
    board.dispose();
  });

  QUnit.test("the markers go where the start and the goal go, and there is one of each however many times they are moved", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    for (let i = 0; i < 4; i++) board.update(editor, editor.paint(0, i + 3, "start"));

    assert.strictEqual(board.markers.length, 2);
    const meshes = scene.meshes.filter((mesh) => mesh.name.startsWith("marker")).length;
    assert.strictEqual(meshes, 4, "two rings and two discs, and the old ones are gone");
    board.dispose();
  });

  QUnit.test("a map with no start has no marker for it", (assert) => {
    const editor = new MapEditor();
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);

    assert.strictEqual(board.markers.length, 0);
    board.dispose();
  });

  QUnit.test("nothing changed draws nothing", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);

    assert.strictEqual(board.update(editor, []), 0);
    board.dispose();
  });

  QUnit.test("undo is drawn too: the cells that it changes are the cells that are drawn again", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.update(editor, editor.paint(4, 4, "shrine"));
    board.update(editor, editor.undo());

    assert.false(board.propNodes.has("4,4"));
    board.dispose();
  });

  QUnit.test("taking the board away leaves nothing in the scene: no tile, no prop, no marker", (assert) => {
    const editor = new MapEditor({ name: "x", rows: ["S" + "#".repeat(12) + "G", "..c...........", ...Array(7).fill(".".repeat(14))] });
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.dispose();

    assert.strictEqual(scene.meshes.filter((mesh) => !mesh.isDisposed()).length, baseMeshes);
    assert.strictEqual(board.tileNodes.size, 0);
  });

  QUnit.test("the markers breathe: tick gives them the time", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.tick(1.3);

    assert.true(Math.abs(board.markers[0].node.scaling.x - markerPulse(1.3)) < 1e-9);
    board.dispose();
  });
});
```

- **"A change draws only the cells that it changes and the ones beside them: the other tiles are the very same tiles"** keeps the nodes of the tiles before a change, makes a change, and says that exactly five are different (and the old five disposed) and a tile far away is the same object. That is the whole idea of the step, as a test.
- **"A piece of road changes when the road beside it does"** extends a road down a column and says that the piece beside it is now turned as the game would turn it.

**Check:** open `tests.html`. 1004 tests pass.

---

## Step 4: The tools

The palette, the actions, the name and the list of problems are made from empty elements of the page, like the tray and the panel and the screens: no editor in them, told what to show, saying what was pressed.

Open `js/toolbar.js` (the placeholder) and **replace the TODO line** with:

```js
// The tools of the editor: a palette of brushes, the actions (undo, redo, clear, save, share, play), a name for the map, and the list of what is
// wrong with it. Like the tray and the panel, it is made from empty elements of the page, has no editor in it, and is told what to show: it says
// when a brush is chosen, an action is pressed or the name is changed. An action that can't be done yet (a map that can't be played can't be
// saved, shared or played) is not a button that is there to press. See ../tests/toolbar.tests.js.

// The actions, in order, with what is on their buttons and whether they need a map that can be played.
const ACTIONS = [
  { id: "undo", text: "Undo", needsMap: false },
  { id: "redo", text: "Redo", needsMap: false },
  { id: "clear", text: "Clear", needsMap: false },
  { id: "save", text: "Save", needsMap: true },
  { id: "share", text: "Share link", needsMap: true },
  { id: "play", text: "Play", needsMap: true },
];

class Toolbar {
  // `parts` is { palette, actions, name, problems, status }: the elements of the page that this fills in.
  constructor(parts, document, brushes = BRUSHES, actions = ACTIONS) {
    this.parts = parts;
    this.brushes = brushes;
    this.actions = actions;
    this.brushListeners = [];
    this.actionListeners = [];
    this.nameListeners = [];
    this.buttons = {};
    this.swatches = {};
    // A press on the tools is for the tools, and is not for the board behind it (which would paint).
    for (const part of [parts.palette, parts.actions, parts.name, parts.problems]) {
      for (const type of ["pointerdown", "pointerup"]) part.addEventListener(type, (event) => event.stopPropagation());
    }

    brushes.forEach((brush, i) => {
      const button = element(document, "button", "brush");
      button.type = "button";
      button.dataset.brush = brush.id;
      button.title = `${brush.name} (${i + 1})`;
      button.setAttribute("aria-label", brush.name);
      const swatch = element(document, "span", "swatch");
      swatch.style.background = brush.color;
      button.append(swatch, element(document, "span", "label", brush.name));
      button.addEventListener("click", () => {
        this.select(brush.id);
        this.brushListeners.forEach((listener) => listener(brush.id));
      });
      parts.palette.append(button);
      this.buttons[brush.id] = button;
    });

    actions.forEach((action) => {
      const button = element(document, "button", "action", action.text);
      button.type = "button";
      button.dataset.action = action.id;
      button.addEventListener("click", () => {
        if (!button.disabled) this.actionListeners.forEach((listener) => listener(action.id));
      });
      parts.actions.append(button);
      this.buttons[action.id] = button;
    });

    parts.name.addEventListener("input", () => this.nameListeners.forEach((listener) => listener(parts.name.value)));
    this.select(brushes[0].id);
    this.showProblems(["nothing is drawn yet"]);
    this.setHistory(false, false);
  }

  onBrush(listener) {
    this.brushListeners.push(listener);
  }

  onAction(listener) {
    this.actionListeners.push(listener);
  }

  onName(listener) {
    this.nameListeners.push(listener);
  }

  // Marks the brush that is chosen.
  select(id) {
    this.selected = id;
    for (const brush of this.brushes) this.buttons[brush.id].classList.toggle("selected", brush.id === id);
  }

  // Shows what is wrong with the map, as a list, or says that it is ready. The buttons that need a map that can be played are there only when it is.
  showProblems(problems) {
    const ready = problems.length === 0;
    this.ready = ready;
    this.parts.problems.classList.toggle("ready", ready);
    this.parts.problems.replaceChildren(...(ready ? [element(this.parts.problems.ownerDocument, "li", "", "Ready to play!")] : problems.slice(0, 4).map((text) => element(this.parts.problems.ownerDocument, "li", "", text))));
    for (const action of this.actions) if (action.needsMap) this.buttons[action.id].disabled = !ready;
  }

  // Undo and redo are there only if there is something to undo or redo.
  setHistory(canUndo, canRedo) {
    this.buttons.undo.disabled = !canUndo;
    this.buttons.redo.disabled = !canRedo;
  }

  setName(name) {
    if (this.parts.name.value !== name) this.parts.name.value = name;
  }

  // Says something on the line under the tools ("Saved"), and nothing if it is told nothing.
  say(sentence) {
    this.parts.status.textContent = sentence;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ACTIONS, Toolbar };
} else {
  Object.assign(window, { ACTIONS, Toolbar });
}
```

Things to notice:

- **The actions are a table,** and say which of them **need a map that can be played** (`save`, `share` and `play`). The buttons that need one are *disabled* until the list of problems is empty; a button that can't do anything is not a button to press, and the player is never told off for pressing it. Undo and redo are there only when there is something to undo or to redo.
- **The list of problems is the most helpful thing on the screen, and it is not more than four.** The first problems are what to do next (put a start, put a goal, join up the road); the rest are the same mistake said again. When there are none, it turns green and says *Ready to play!*
- **`select` and the click are different things.** Pressing a brush chooses it *and says so*; `select` (the number keys of the next step) only marks it, since the page that is calling it already knows.
- **A press on the tools stops there,** as it does for the screens (`pointerdown` as well as `pointerup`: here it is the *press* that paints, so it is the press that must not get through).
- **The name is a box,** and `setName` doesn't send an event, and doesn't touch the box if it already says that, so that the cursor of someone who is typing is not moved.

Open `tests/toolbar.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("a Toolbar", (hooks) => {
  let parts, toolbar, brushes, actions, names;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    const make = (tag) => fixture.appendChild(document.createElement(tag));
    parts = { palette: make("div"), actions: make("div"), name: make("input"), problems: make("ul"), status: make("div") };
    toolbar = new Toolbar(parts, document);
    brushes = [];
    actions = [];
    names = [];
    toolbar.onBrush((id) => brushes.push(id));
    toolbar.onAction((id) => actions.push(id));
    toolbar.onName((text) => names.push(text));
  });

  const brushButtons = () => [...parts.palette.querySelectorAll(".brush")];
  const button = (id) => parts.actions.querySelector(`[data-action="${id}"]`);
  const READY = [];

  QUnit.test("the palette has a button for each brush, in order, with its color and its name", (assert) => {
    const buttons = brushButtons();

    assert.strictEqual(buttons.length, BRUSHES.length);
    buttons.forEach((b, i) => {
      assert.strictEqual(b.dataset.brush, BRUSHES[i].id);
      assert.strictEqual(b.querySelector(".label").textContent, BRUSHES[i].name);
      assert.true(b.querySelector(".swatch").style.background.length > 0, BRUSHES[i].id);
    });
  });

  QUnit.test("the first brush is chosen, and pressing another chooses it, says so, and marks only that one", (assert) => {
    assert.strictEqual(toolbar.selected, BRUSHES[0].id);
    assert.true(brushButtons()[0].classList.contains("selected"));
    brushButtons()[3].click();

    assert.deepEqual(brushes, [BRUSHES[3].id]);
    assert.deepEqual(brushButtons().map((b) => b.classList.contains("selected")), BRUSHES.map((_, i) => i === 3));
  });

  QUnit.test("select (the keys 1 to 9) marks a brush without saying that it was pressed", (assert) => {
    toolbar.select("goal");

    assert.true(parts.palette.querySelector('[data-brush="goal"]').classList.contains("selected"));
    assert.deepEqual(brushes, []);
  });

  QUnit.test("each button has its name for a screen reader and its number as a hint", (assert) => {
    assert.strictEqual(brushButtons()[0].getAttribute("aria-label"), BRUSHES[0].name);
    assert.true(brushButtons()[0].title.includes("(1)"));
  });

  QUnit.test("there is a button for each action, and they say what was pressed", (assert) => {
    toolbar.showProblems(READY);
    toolbar.setHistory(true, true);
    for (const action of ACTIONS) button(action.id).click();

    assert.deepEqual(actions, ACTIONS.map((a) => a.id));
  });

  QUnit.test("with a map that can't be played, the buttons that need one are not there to press, and the others are", (assert) => {
    toolbar.showProblems(["the road is broken"]);

    for (const id of ["save", "share", "play"]) assert.true(button(id).disabled, id);
    for (const id of ["clear"]) assert.false(button(id).disabled, id);
    button("play").click();
    assert.deepEqual(actions, [], "and a press on one does nothing");
  });

  QUnit.test("with a map that can, they are", (assert) => {
    toolbar.showProblems(["no"]);
    toolbar.showProblems(READY);

    for (const id of ["save", "share", "play"]) assert.false(button(id).disabled, id);
    assert.true(toolbar.ready);
  });

  QUnit.test("what is wrong is a list, and not more than four things at once (the first are what to do next)", (assert) => {
    toolbar.showProblems(["a", "b", "c", "d", "e", "f"]);
    const items = [...parts.problems.querySelectorAll("li")].map((li) => li.textContent);

    assert.deepEqual(items, ["a", "b", "c", "d"]);
    assert.false(parts.problems.classList.contains("ready"));
  });

  QUnit.test("when nothing is wrong it says so, and is marked as ready", (assert) => {
    toolbar.showProblems(READY);

    assert.deepEqual([...parts.problems.querySelectorAll("li")].map((li) => li.textContent), ["Ready to play!"]);
    assert.true(parts.problems.classList.contains("ready"));
  });

  QUnit.test("undo and redo are there only when there is something to undo or redo", (assert) => {
    assert.true(button("undo").disabled && button("redo").disabled, "at the start");
    toolbar.setHistory(true, false);
    assert.false(button("undo").disabled);
    assert.true(button("redo").disabled);
    toolbar.setHistory(true, true);

    assert.false(button("redo").disabled);
  });

  QUnit.test("typing in the name says what was typed", (assert) => {
    parts.name.value = "Long road";
    parts.name.dispatchEvent(new Event("input"));

    assert.deepEqual(names, ["Long road"]);
  });

  QUnit.test("setName puts a name in the box, and does not say that it was typed, and does not move the cursor of what is already there", (assert) => {
    toolbar.setName("Mine");

    assert.strictEqual(parts.name.value, "Mine");
    assert.deepEqual(names, []);
  });

  QUnit.test("say puts a sentence on the line under the tools, and nothing clears it", (assert) => {
    toolbar.say("Saved.");
    assert.strictEqual(parts.status.textContent, "Saved.");
    toolbar.say("");

    assert.strictEqual(parts.status.textContent, "");
  });

  QUnit.test("a press on the tools does not go on to the board behind them, where it would paint", (assert) => {
    let reached = 0;
    document.getElementById("qunit-fixture").addEventListener("pointerdown", () => reached++);
    document.getElementById("qunit-fixture").addEventListener("pointerup", () => reached++);
    for (const part of [parts.palette, parts.actions, parts.name, parts.problems]) {
      for (const type of ["pointerdown", "pointerup"]) part.dispatchEvent(new PointerEvent(type, { bubbles: true }));
    }

    assert.strictEqual(reached, 0);
  });

  QUnit.test("the actions are in a table, and undo and redo come first and need no map", (assert) => {
    assert.strictEqual(ACTIONS[0].id, "undo");
    assert.false(ACTIONS.find((a) => a.id === "undo").needsMap);
    assert.true(ACTIONS.find((a) => a.id === "play").needsMap);
  });
});
```

**Check:** open `tests.html`. 1019 tests pass.

---

## Step 5: The page

`editor.html` is already written: the canvas, the name, the list of problems, the toolbar, and the scripts. It is the page of the game with the parts of the game that aren't needed taken out (no enemies, no towers, no sound) and a toolbar in the place of the tray. Open it and read it; there is nothing in it that you haven't seen.

Open `css/editor.css` (the placeholder) and replace its contents with:

```css
/* The editor page: the board fills the screen above a toolbar, which has a palette of brushes and a row of actions; the name of the map is
   at the top in the middle, and what is wrong with the map (or that it is ready) is at the top on the left, small, over the corner of the sky. */
:root {
  --toolbar-height: 150px;
}
#renderCanvas {
  height: calc(100% - var(--toolbar-height));
  touch-action: none; /* a finger that paints must not scroll the page */
}

#map-name {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 12;
  width: min(300px, 46vw);
  padding: 6px 14px;
  box-sizing: border-box;
  background: var(--parchment);
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 999px;
  font: 700 20px / 1 var(--title-font);
  text-align: center;
}

#problems {
  position: fixed;
  top: 52px;
  left: 12px;
  z-index: 12;
  width: min(300px, 70vw);
  margin: 0;
  padding: 8px 12px 8px 28px;
  box-sizing: border-box;
  background: rgba(141, 31, 20, 0.92);
  color: #fff;
  border: 3px solid var(--ink);
  border-radius: 10px;
  font: 700 13px / 1.25 var(--small-font);
  pointer-events: none;
}
#problems.ready {
  background: rgba(30, 110, 48, 0.92);
  list-style: none;
  padding-left: 12px;
}
#problems li + li {
  margin-top: 3px;
}

#toolbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
  height: var(--toolbar-height);
  box-sizing: border-box;
  padding: 8px 12px;
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: 8px;
  background: linear-gradient(to bottom, var(--parchment), var(--parchment-dark));
  border-top: 4px solid var(--ink);
  box-shadow: 0 -6px 18px rgba(20, 40, 70, 0.3);
}
#palette,
#actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  overflow-x: auto;
}
#palette .brush {
  flex: 0 0 auto;
  display: grid;
  grid-template-rows: auto auto;
  justify-items: center;
  gap: 4px;
  padding: 6px 8px;
  min-width: 74px;
  background: #fff7e0;
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 10px;
  font: 700 12px / 1.1 var(--small-font);
  cursor: pointer;
  touch-action: manipulation;
}
#palette .brush .swatch {
  width: 34px;
  height: 22px;
  border: 2px solid var(--ink);
  border-radius: 5px;
}
#palette .brush.selected {
  box-shadow: 0 0 0 4px var(--gold);
  transform: translateY(-3px);
}
#actions .action {
  padding: 8px 16px;
  background: var(--banner);
  color: #fff;
  border: 3px solid var(--ink);
  border-radius: 10px;
  font: 700 16px / 1 var(--title-font);
  cursor: pointer;
  touch-action: manipulation;
}
#actions .action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
#actions .action[data-action="undo"],
#actions .action[data-action="redo"],
#actions .action[data-action="clear"] {
  background: var(--parchment);
  color: var(--ink);
}
#editor-status {
  min-height: 1.1em;
  text-align: center;
  font: 700 13px / 1.1 var(--small-font);
  color: var(--ink);
}

@media (max-width: 640px), (max-height: 520px) {
  :root {
    --toolbar-height: 128px;
  }
  #problems {
    top: 48px;
    font-size: 12px;
  }
  #palette .brush {
    min-width: 58px;
    padding: 4px 6px;
    font-size: 10px;
  }
  #palette .brush .swatch {
    width: 26px;
    height: 16px;
  }
  #actions .action {
    padding: 6px 10px;
    font-size: 14px;
  }
}
```

- **The canvas is shorter by the height of the toolbar** (`--toolbar-height`), as it was for the tray, and the camera fits the board into what is left, so that the toolbar never covers part of the board.
- **`touch-action: none` on the canvas** is what lets a finger *paint*. Without it a finger that moves is a scroll of the page, and the page takes the gesture.

Open `js/editormain.js` (the placeholder) and **replace the TODO line** with:

```js
// The editor page: it puts the editor (editor.js), the board that shows it (boardview.js), the tools (toolbar.js) and the keeping and sharing of
// maps (share.js) together, with the pointer that paints. The map being edited comes from the address: `?edit=id` is one of the maps that the player
// has kept, `?data=code` is one that came in a link, and with neither the board is empty.
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { alpha: true });
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

const SPLASH_MIN_MS = 1500;
const params = new URLSearchParams(window.location.search);
const store = new MapStore(safeStorage(window));

// The map to begin with, and, if it is one that is kept, its id.
function startingMap() {
  const kept = params.get("edit") ? store.get(params.get("edit")) : null;
  if (kept) return { map: kept, id: kept.id };
  const shared = params.get("data") ? decodeMap(params.get("data")) : null;
  if (shared && shared.ok) return { map: shared.map, id: null };
  return { map: null, id: null };
}

const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
  const camera = buildCamera(scene);
  let extents;
  const fitView = () => {
    extents = viewExtents(boardPoints(), engine.getAspectRatio(camera));
    applyExtents(camera, extents);
  };
  fitView();
  engine.onResizeObservable.add(fitView);

  const skyLight = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  skyLight.intensity = 0.65;
  skyLight.diffuse = new BABYLON.Color3(0.85, 0.92, 1);
  skyLight.groundColor = new BABYLON.Color3(0.45, 0.4, 0.35);
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.5, -1, 0.6), scene);
  sun.intensity = 0.85;
  sun.diffuse = new BABYLON.Color3(1, 0.95, 0.85);

  const tiles = await loadTiles(scene);
  const scenery = await loadProps(scene);
  buildIsland(scene);

  const start = startingMap();
  let currentId = start.id;
  const editor = new MapEditor(start.map);
  const board = new EditorBoard(scene, tiles, scenery);
  board.show(editor);
  const outline = new Outline(scene);
  const toolbar = new Toolbar(
    {
      palette: document.getElementById("palette"),
      actions: document.getElementById("actions"),
      name: document.getElementById("map-name"),
      problems: document.getElementById("problems"),
      status: document.getElementById("editor-status"),
    },
    document
  );
  toolbar.setName(editor.name);

  // What is wrong with the map, and what can be undone, as it is now.
  const refresh = () => {
    toolbar.showProblems(editor.problems());
    toolbar.setHistory(editor.canUndo, editor.canRedo);
  };
  const apply = (changed) => {
    board.update(editor, changed);
    refresh();
  };
  refresh();

  // Painting. A press begins a stroke, the pointer paints along a line from where it was to where it is, and letting go ends it: one step to undo.
  let brush = toolbar.selected;
  let last = null;
  const cellOf = (event) => {
    const rect = canvas.getBoundingClientRect();
    return isInside(rect, event.clientX, event.clientY) ? cellAtPoint(rect, extents, event.clientX, event.clientY) : null;
  };
  toolbar.onBrush((id) => (brush = id));
  canvas.addEventListener("pointerdown", (event) => {
    const cell = cellOf(event);
    if (!cell) return;
    canvas.setPointerCapture(event.pointerId);
    editor.begin();
    last = cell;
    apply(editor.strokeTo(cell, cell, brush));
  });
  canvas.addEventListener("pointermove", (event) => {
    const cell = cellOf(event);
    if (cell) outline.show(cell.col, cell.row, true);
    else outline.hide();
    if (last && cell) {
      apply(editor.strokeTo(last, cell, brush));
      last = cell;
    }
  });
  const finish = () => {
    if (!last) return;
    last = null;
    editor.end();
    refresh();
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);
  canvas.addEventListener("pointerleave", () => outline.hide());

  toolbar.onName((text) => editor.setName(text));

  // Copies a link to the clipboard, which a page may not be allowed to do: then the link is shown, to be copied by hand.
  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      window.prompt("Copy this link:", text);
      return false;
    }
  };

  toolbar.onAction(async (action) => {
    if (action === "undo") apply(editor.undo());
    if (action === "redo") apply(editor.redo());
    if (action === "clear") apply(editor.clear());
    if (action === "save") {
      const id = store.put(editor.toMap(), currentId);
      if (id === null) return toolbar.say(`You can keep up to ${SHARE.maxMaps} maps. Delete one on the title screen to make room.`);
      currentId = id;
      window.history.replaceState(null, "", `?edit=${id}`);
      toolbar.say("Saved. It is on the title screen of the game now.");
    }
    if (action === "share") toolbar.say((await copy(shareUrl(window.location.href, editor.toMap()))) ? "The link is copied: send it to someone." : "");
    if (action === "play") window.location.href = shareUrl(window.location.href, editor.toMap()) + "&go=1";
  });

  window.addEventListener("keydown", (event) => {
    if (event.target.tagName === "INPUT") return;
    const control = event.ctrlKey || event.metaKey;
    if (control && event.key.toLowerCase() === "z") {
      event.preventDefault();
      apply(event.shiftKey ? editor.redo() : editor.undo());
    }
    if (control && event.key.toLowerCase() === "y") {
      event.preventDefault();
      apply(editor.redo());
    }
    const number = Number(event.key);
    if (!control && number >= 1 && number <= BRUSHES.length) {
      brush = BRUSHES[number - 1].id;
      toolbar.select(brush);
    }
  });

  let clock = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    clock += dt;
    outline.update(dt);
    board.tick(clock);
  });
  return { scene };
};

const splash = document.getElementById("splash");
const splashStatus = document.getElementById("splash-status");
const shownAt = performance.now();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

createScene()
  .then(async ({ scene }) => {
    engine.runRenderLoop(() => scene.render());
    window.addEventListener("resize", () => engine.resize());
    await delay(Math.max(0, SPLASH_MIN_MS - (performance.now() - shownAt)));
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 700);
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent = "Something went wrong starting the editor. The models are loaded from files, so the page has to be opened through a web server. The console has the details.";
  });
```

Things to notice:

- **Where the map comes from is the address:** `?edit=id` is a map that the player has kept, `?data=code` is one that came in a link (it is *decoded*, which checks it), and with neither the board is empty. A link that is not a map, or an id that is not kept, is an empty board, and not an error.
- **Painting is three events.** A press begins a stroke and paints the cell; a move paints a line from the cell where the pointer was to the cell where it is (`last`), and the pointer is *captured* by the canvas (`setPointerCapture`), so that a drag that leaves the board still ends; and the pointer up ends the stroke, which is the one step to undo. Hovering draws the outline of the cell under the pointer, from the Build tutorial.
- **`apply` is one function that every change goes through:** tell the board what changed, then ask the editor what is wrong and what can be undone, and tell the toolbar. Undo, redo, clear and every stroke use it, so the list of problems and the buttons can't be out of date.
- **Save** puts the map in the store (with its id if it has one, so that saving again changes the map and doesn't add another), and changes the address to `?edit=id` without loading a page (`history.replaceState`), so that a reload is the same map. **Share** copies a link, and a page that is not allowed to use the clipboard shows the link to be copied by hand. **Play** goes to the game with the map in the address, and `go=1`.
- **The keys:** Ctrl+Z and Ctrl+Y (and Shift+Ctrl+Z) undo and redo, and the numbers choose a brush. A key that is typed *into the name* is the name's, and is left alone.

**Check:** open `tests.html`. 1019 tests pass. Then open `editor.html` through the web server. Press the *Road* brush and drag across the board: the road is drawn as you go, and the list at the top says what the road needs (*the road at column 1, row 2 has 1 neighbor*). Press Ctrl+Z and it is gone. Choose *Start* and tap a cell on the edge, then *Goal*, then join them with a road, and the list turns green: *Ready to play!* Add a cabbage cart. Press *Play*.

---

## Step 6: In the game

The game has to know that there are maps beyond its own: the ones that the player made and kept, and one that came in a link. The title screen has a card for each, with *Edit* (and *Delete*, for the ones that were kept), and a button to make a new one.

First the screens. A map's card is a *button*, and a button can't have buttons in it, so a card becomes a box with the button to pick the map in it, and the small buttons beside. The screens are told where each map is from (`kinds`), and say what to do, as they do for every other button:

In `js/screens.js`, **replace** lines 22 to 23:

```js
  // hides. `logo` is the address of the picture on the title. `records` says the best for each map.
  constructor(parts, document, maps, records, logo) {
```

with:

```js
  // hides. `logo` is the address of the picture on the title. `records` says the best for each map, and `kinds` says where each map is from:
  // "built-in" (the game's own), "kept" (made by the player, and kept in the browser) or "shared" (from a link).
  constructor(parts, document, maps, records, logo, kinds = maps.map(() => "built-in")) {
```

In `js/screens.js`, **replace** lines 29 to 30:

```js
    this.selected = 0;
    this.listeners = { play: [], resume: [], restart: [], menu: [], pause: [], speed: [], detail: [], mute: [] };
```

with:

```js
    this.kinds = kinds;
    this.selected = 0;
    this.listeners = { play: [], resume: [], restart: [], menu: [], pause: [], speed: [], detail: [], mute: [], make: [], edit: [], delete: [] };
```

In `js/screens.js`, **replace** line 41:

```js
  // Asks to be told when a button is pressed: on("play", (map) => ...), and "resume", "restart", "menu" and "pause".
```

with:

```js
  // Asks to be told when a button is pressed: on("play", (map) => ...), and "resume", "restart", "menu" and "pause", and "make" (a map of your own),
  // "edit" and "delete" (which are told which map).
```

In `js/screens.js`, **replace** lines 65 to 66:

```js
      const card = element(this.document, "button", "map-card");
      card.type = "button";
```

with:

```js
      // A card is a box with the map to pick in it and, for a map that the player made or was sent, small buttons for what can be done to it.
      const card = element(this.document, "div", "map-card");
      const pick = element(this.document, "button", "map-pick");
      pick.type = "button";
```

In `js/screens.js`, **replace** lines 74 to 75:

```js
      card.append(canvas, element(this.document, "span", "map-name", map.name), stars);
      card.addEventListener("click", () => this.selectMap(index));
```

with:

```js
      pick.append(canvas, element(this.document, "span", "map-name", map.name), stars);
      pick.addEventListener("click", () => this.selectMap(index));
      card.append(pick);
      if (this.kinds[index] !== "built-in") {
        const tools = element(this.document, "div", "map-tools");
        tools.append(this.button("Edit", "small", () => this.say("edit", index)));
        if (this.kinds[index] === "kept") tools.append(this.button("Delete", "small", () => this.say("delete", index)));
        card.append(tools);
      }
```

In `js/screens.js`, after line 85, add:

```js
    this.makeButton = this.button("Make a map", "plain", () => this.say("make"));
```

In `js/screens.js`, after line 93, add:

```js
      this.makeButton,
```

and the style of the card, which is now two things:

In `css/screens.css`, after line 56, add:

```css
  gap: 6px;
  justify-items: center;
}
.map-pick {
  display: grid;
```

In `css/screens.css`, **replace** lines 74 to 77:

```css
.map-card:hover {
  transform: translateY(-3px);
}
.map-card.selected {
```

with:

```css
.map-pick:hover {
  transform: translateY(-3px);
}
.map-card.selected .map-pick {
```

In `css/screens.css`, after line 207, add:

```css
.map-tools {
  display: flex;
  gap: 6px;
}
.screen button.small {
  padding: 4px 10px;
  background: var(--parchment);
  color: var(--ink);
  border: 2px solid var(--ink);
  border-radius: 8px;
  font: 700 12px / 1 var(--small-font);
  cursor: pointer;
}

```

and the tests: the new events, a card that is picked by its button, and the new buttons:

In `tests/screens.tests.js`, **replace** line 48:

```js
    for (const name of ["play", "resume", "restart", "menu", "pause", "speed", "detail", "mute"]) screens.on(name, (...args) => heard.push([name, ...args]));
```

with:

```js
    for (const name of ["play", "resume", "restart", "menu", "pause", "speed", "detail", "mute", "make", "edit", "delete"]) screens.on(name, (...args) => heard.push([name, ...args]));
```

In `tests/screens.tests.js`, **replace** line 66:

```js
    cards[1].click();
```

with:

```js
    cards[1].querySelector(".map-pick").click();
```

In `tests/screens.tests.js`, **replace** line 74:

```js
    parts.title.querySelectorAll(".map-card")[1].click();
```

with:

```js
    parts.title.querySelectorAll(".map-pick")[1].click();
```

In `tests/screens.tests.js`, after line 141, add:

```js
  QUnit.test("the title has a button to make a map of your own, which says so", (assert) => {
    buttons(parts.title, "Make a map").click();

    assert.deepEqual(heard, [["make"]]);
  });

  QUnit.test("the game's own maps have no buttons on their cards", (assert) => {
    for (const card of parts.title.querySelectorAll(".map-card")) assert.strictEqual(card.querySelectorAll(".map-tools button").length, 0);
  });

  QUnit.test("a map that was made has Edit and Delete, and one that was sent has only Edit, and each says which map", (assert) => {
    const fixture = document.getElementById("qunit-fixture");
    const make = (hidden) => {
      const node = fixture.appendChild(document.createElement("div"));
      node.hidden = hidden;
      return node;
    };
    const more = [{ name: "First", rows: ["S##G"] }, { name: "Mine", rows: ["S.#G"] }, { name: "Sent", rows: ["S.#G"] }];
    const own = { title: make(false), pause: make(true), result: make(true), pauseButton: fixture.appendChild(document.createElement("button")), speedButton: fixture.appendChild(document.createElement("button")) };
    const custom = new Screens(own, document, more, records, "logo.webp", ["built-in", "kept", "shared"]);
    const said = [];
    for (const name of ["edit", "delete"]) custom.on(name, (index) => said.push([name, index]));
    const cards = [...own.title.querySelectorAll(".map-card")];
    const tools = (i) => [...cards[i].querySelectorAll(".map-tools button")].map((b) => b.textContent);

    assert.deepEqual(tools(0), []);
    assert.deepEqual(tools(1), ["Edit", "Delete"]);
    assert.deepEqual(tools(2), ["Edit"]);
    cards[1].querySelectorAll(".map-tools button")[0].click();
    cards[1].querySelectorAll(".map-tools button")[1].click();
    cards[2].querySelectorAll(".map-tools button")[0].click();
    assert.deepEqual(said, [["edit", 1], ["delete", 1], ["edit", 2]]);
  });

  QUnit.test("a press on a button of a card does not choose the map, and choosing is by the picture and the name", (assert) => {
    const fixture = document.getElementById("qunit-fixture");
    const node = (tag) => fixture.appendChild(document.createElement(tag));
    const own = { title: node("div"), pause: node("div"), result: node("div"), pauseButton: node("button"), speedButton: node("button") };
    const custom = new Screens(own, document, [maps[0], maps[1]], records, "logo.webp", ["built-in", "kept"]);
    own.title.querySelectorAll(".map-tools button")[0].click();

    assert.strictEqual(custom.selected, 0);
  });

```

- **"A press on a button of a card does not choose the map"** is what a box with a button in it is for.
- **"The game's own maps have no buttons on their cards"** says that the built-in maps can't be edited or deleted (they are the game's), and *Edit* on a map that was sent makes a **copy**.

Then `main.js`. The list of maps is not `MAPS` any more:

In `js/main.js`, **replace** lines 15 to 16:

```js
const mapNumber = (Number(params.get("map")) || 0) % MAPS.length;
const map = MAPS[mapNumber];
```

with:

```js

// The maps: the game's own, the ones that the player has made and kept, and one that came in a link (`?data=`, which is checked: a link can say
// anything). A map that came in a link is the one that is chosen.
const store = new MapStore(safeStorage(window));
const shared = params.get("data") ? decodeMap(params.get("data")) : null;
const kept = store.list();
const maps = [...MAPS, ...kept, ...(shared && shared.ok ? [{ ...shared.map, name: `${shared.map.name} (sent)` }] : [])];
const kinds = [...MAPS.map(() => "built-in"), ...kept.map(() => "kept"), ...(shared && shared.ok ? ["shared"] : [])];
const mapNumber = shared && shared.ok ? maps.length - 1 : (Number(params.get("map")) || 0) % maps.length;
const map = maps[mapNumber];
```

- **A map that came in a link is the one that is chosen, and is named (sent).** It is *decoded* here, which is where it is checked: a link that is no map is no map, and the game is as if it had none (the tests of Step 2 say that it never throws). The map that is chosen, if the address doesn't say, is the first, as it was.
- **A map is chosen by its number in the list.** The built-in maps are first, so their numbers are as they always were, then the player's, then the one that was sent. `?map=N` is still how a game is started again.

The screens are given the list, and the kind of each:

In `js/main.js`, **replace** lines 145 to 147:

```js
    MAPS,
    records,
    "../assets/images/tower_defense_logo_small.webp"
```

with:

```js
    maps,
    records,
    "../assets/images/tower_defense_logo_small.webp",
    kinds
```

and what the new buttons do:

In `js/main.js`, after line 174, add:

```js
  // Making a map, and changing or deleting one that was made. A map that was kept is edited by its id; one that was sent is edited as a copy.
  screens.on("make", () => window.location.assign("editor.html"));
  screens.on("edit", (number) => {
    const target = kinds[number] === "kept" ? `editor.html?edit=${kept[number - MAPS.length].id}` : shareUrl(window.location.href, maps[number], "editor.html");
    window.location.assign(target);
  });
  screens.on("delete", (number) => {
    if (!window.confirm(`Delete "${maps[number].name}"?`)) return;
    store.remove(kept[number - MAPS.length].id);
    goTo(0, false);
  });

```

- **Making a map is a page,** and so is editing one: a map that was kept is edited by its *id* (`editor.html?edit=id`), and one that was sent is edited as a copy, by its *code*, so that changing it doesn't change the one that was sent.
- **Deleting asks first** (`confirm`), takes the map out of the store, and goes to the first map: the numbers of the maps after it have all changed.

**Check:** open `tests.html`. 1023 tests pass. Then open `index.html`. The title has a *Make a map* button; press it, draw a map, press *Save*, and go back: your map is on the title with *Edit* and *Delete*. Press *Share link* in the editor, and paste the link in a new tab: the game starts with that map chosen and called *(sent)*. Try a link with some of the letters changed: it is ignored.

---

## Step 7: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **Draw the longest road you can.** The board is fourteen by nine: the road can snake across it. Build on the places that it leaves, and see what the simulation of the balance tests would say (play the map, and watch the waves).
- **Break the rules and read the list.** Make a fork. Put two starts. Put the goal in the middle of the board. Each is a sentence, and each is the game's own.
- **A map for the second map's name.** Name a map *Switchback*: it is a different map with the same name, and its stars are the same record. (The records are by name: a map that was renamed is a map that starts again.)
- **A sixth prop.** Add a prop to `PROPS`, a letter to `LEGEND`, and a brush to `BRUSHES`: the test that says that every letter of the legend has a brush tells you if you forget the brush.
- **A bigger board.** The board is a table (`BOARD`); the editor, the share code and the checks all use it. Change `cols` and `rows`, and every map of the game stops being the size of the board, and says so. (The maps that were saved are dropped, by the check that dropped bad entries: that is what that check is for.)
- **Hand-written links.** In the console: `shareUrl(location.href, { name: "x", rows: MAPS[0].rows })`, and paste the result in the address bar.
- **A tampered link.** Take a link and change a letter in the middle: it is a bad link, or a map with a different road (and the game's checks decide which).
- **More than twelve.** Save maps until the editor says that you can keep twelve.

---

## Troubleshooting

- **The splash never goes on `editor.html` and the console says `MapEditor is not defined`, `Toolbar is not defined` or `EditorBoard is not defined`:** the file is missing from `editor.html`, or has no export block, or the name is missing from it.
- **The road can't be painted:** `touch-action: none` is missing from the canvas (a finger scrolls the page), or the pointer isn't captured, or the toolbar's `pointerdown` handler does not stop the event.
- **Save is grayed out and the list says *Ready to play!*:** `showProblems` wasn't called after the last change (`apply` is where it is).
- **A painted tile is the wrong piece:** `affectedCells` doesn't include the four beside a changed cell, so a straight piece is left where the road has turned.
- **The board gets slower as you paint:** the markers' materials are not disposed (each change leaves two more), or `update` redraws every tile and not the affected ones.
- **`JSON.parse` or `atob` throws on a bad link:** the decoder is not inside a `try`. `decodeMap` must give `{ ok: false }` for anything, and never throw.
- **A shared map plays with a wrong road, or breaks the game:** `decodeMap` doesn't finish with the editor's `problems()`. The last check is the one that matters most.
- **The title has no cards for your maps:** the store is empty (storage is blocked or full), or `kept` is not in the list of maps that the screens are given, in the order that the numbers use.
- **The cards on the title are in a pile, or the small buttons are in the wrong place:** `.map-card` has no `display: grid`, or the new rules (`.map-tools`, `.screen button.small`) went *inside* the `@media` block at the end of `screens.css` (they go above it, and the `@media` line is the one that starts the small-screen rules).
- **Edit goes to an empty board:** the id of the kept map is not the one in the address (`kept[number - MAPS.length]`), or the map was deleted.

---

## What you have

A game that makes games: a board of characters with brushes and rules, strokes that undo as the player means, the game's own checks as the editor's, a map that goes into a link and comes out as a map or as nothing, a store that doesn't believe what it reads, a board that is redrawn a cell at a time, and a title screen with the player's maps on it, behind a test suite of 1023 tests.

That is the end of the series. You have built a 3D tower defense game in the world of *Avatar: The Last Airbender* from an empty page: a board and a camera, a map as text, benders on podiums, building by dragging, waves and lives, scenery, upgrades, elements, screens, polish with sound, and now an editor for all of it.
