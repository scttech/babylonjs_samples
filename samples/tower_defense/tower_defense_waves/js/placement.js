// Placement: where a tower may be put. The rule is one function, and says *why* when the answer is no,
// so that whatever asks (the next tutorial asks as a finger drags a podium over the board) can show
// the reason. See ../tests/placement.tests.js.

// Whether a tower can stand in a cell: on the board, on grass, and with nothing in it already. `taken`
// is a list of the cells that have a tower. The answer is { ok, reason }, and reason is a sentence.
function canBuild(grid, col, row, taken = []) {
  if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) {
    return { ok: false, reason: "that is not on the board" };
  }
  if (isRoad(grid, col, row)) return { ok: false, reason: "that is road" };
  if (taken.some((cell) => cell.col === col && cell.row === row)) return { ok: false, reason: "there is a tower there already" };
  return { ok: true, reason: "" };
}

// Every cell where a tower could be built, row by row.
function buildableCells(grid, taken = []) {
  const cells = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (canBuild(grid, col, row, taken).ok) cells.push({ col, row });
    }
  }
  return cells;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { canBuild, buildableCells };
} else {
  Object.assign(window, { canBuild, buildableCells });
}
