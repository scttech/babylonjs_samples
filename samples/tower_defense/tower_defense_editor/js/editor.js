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
