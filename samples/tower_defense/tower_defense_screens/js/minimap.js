// A map drawn small, for the card that chooses it: a square of color for each cell (grass, road, the two ends, and scenery)
// on a canvas. It is drawn from the same parsed map that the game is, so it can't disagree with it. See ../tests/minimap.tests.js.

const MINIMAP = {
  grass: "#5e9c3b",
  road: "#d3b078",
  start: "#e0482b",
  goal: "#f2c230",
  prop: "#2f5a22",
  edge: "#1d110b", // the line round the whole of it
};

// What a cell of a map looks like: "start", "goal", "road", "prop" or "grass".
function minimapCell(grid, col, row) {
  if (grid.start && grid.start.col === col && grid.start.row === row) return "start";
  if (grid.goal && grid.goal.col === col && grid.goal.row === row) return "goal";
  if (isRoad(grid, col, row)) return "road";
  if (propAt(grid, col, row)) return "prop";
  return "grass";
}

// Draws a map to fill a canvas context of `width` by `height` pixels, in cells as big as will fit (and square), in the middle.
function drawMinimap(context, grid, width, height) {
  const cell = Math.floor(Math.min(width / grid.cols, height / grid.rows));
  const left = Math.floor((width - cell * grid.cols) / 2);
  const top = Math.floor((height - cell * grid.rows) / 2);
  context.clearRect(0, 0, width, height);
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      context.fillStyle = MINIMAP[minimapCell(grid, col, row)];
      context.fillRect(left + col * cell, top + row * cell, cell, cell);
    }
  }
  context.strokeStyle = MINIMAP.edge;
  context.lineWidth = 2;
  context.strokeRect(left - 1, top - 1, cell * grid.cols + 2, cell * grid.rows + 2);
  return { cell, left, top };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MINIMAP, minimapCell, drawMinimap };
} else {
  Object.assign(window, { MINIMAP, minimapCell, drawMinimap });
}
