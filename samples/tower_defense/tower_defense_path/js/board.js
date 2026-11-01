// The board: a grid of square cells on a flat island in the sky. Everything else in the game
// refers to a cell by its column and row (the row 0 is the far edge, at the top of the screen),
// and this file is the one place that knows where a cell is in the world, and which cell a place
// in the world belongs to. Every size is a number in the BOARD table, and nothing else repeats
// them. See ../tests/board.tests.js.

const BOARD = {
  cols: 14, // cells across
  rows: 9, // cells deep
  cell: 2, // the width of a cell, in world units
  rim: 0.8, // how far the island sticks out past the cells
  depth: 9, // how far the rock hangs under the board
  peek: 3.5, // how much of the rock the view makes room for: the rest runs off the bottom of the screen
  headroom: 4, // how high the tallest thing that stands on the board reaches
};

// The middle of a cell, on the ground. The board is centered on the origin, column 0 is on the
// left and row 0 is the far edge: world z grows away from the camera, so the far row has the biggest z.
function cellCenter(col, row, board = BOARD) {
  return {
    x: (col - (board.cols - 1) / 2) * board.cell,
    z: ((board.rows - 1) / 2 - row) * board.cell,
  };
}

// Whether a column and a row are on the board.
function inBoard(col, row, board = BOARD) {
  return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && col < board.cols && row >= 0 && row < board.rows;
}

// The cell that a place in the world is over, or null when it is off the board.
function cellAt(x, z, board = BOARD) {
  const col = Math.floor(x / board.cell + board.cols / 2);
  const row = Math.floor(board.rows / 2 - z / board.cell);
  return inBoard(col, row, board) ? { col, row } : null;
}

// Every cell, row by row.
function boardCells(board = BOARD) {
  const cells = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) cells.push({ col, row });
  }
  return cells;
}

// The edges of the cells, in world units.
function boardBounds(board = BOARD) {
  const halfWidth = (board.cols * board.cell) / 2;
  const halfDepth = (board.rows * board.cell) / 2;
  return { minX: -halfWidth, maxX: halfWidth, minZ: -halfDepth, maxZ: halfDepth };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOARD, cellCenter, inBoard, cellAt, boardCells, boardBounds };
} else {
  Object.assign(window, { BOARD, cellCenter, inBoard, cellAt, boardCells, boardBounds });
}
