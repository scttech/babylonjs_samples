// Roads: which piece goes in a cell, and how it is turned. A map says only which cells are road. The
// piece in a cell is worked out from which of its four neighbors are road too, so that every piece joins
// the ones beside it. This is called *autotiling*, and it means a map is only ever drawn as text.
// See ../tests/roads.tests.js.

// The four sides of a cell, as bits that add up to a number that says which of them are road: the
// back (north, the far edge of the board), the right (east), the front (south) and the left (west).
const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;

// Which sides each piece of road joins when it is not turned, as drawn in the model (see TILES).
const BASE_SIDES = {
  straight: NORTH | SOUTH,
  corner: NORTH | EAST,
  junction: NORTH | EAST | WEST,
  crossroads: NORTH | EAST | SOUTH | WEST,
};

// The sides a piece joins once it has been turned by `turn` quarter turns clockwise, seen from
// above: the back goes to the right, the right to the front, and so on round. Each quarter
// turn moves every bit up one place, and the one that falls off the top comes back at the bottom.
function turnSides(sides, turn) {
  const t = ((turn % 4) + 4) % 4;
  return ((sides << t) | (sides >> (4 - t))) & 15;
}

// The sides a piece joins, given its kind and its turn.
function sidesOf(kind, turn) {
  return kind in BASE_SIDES ? turnSides(BASE_SIDES[kind], turn) : 0;
}

// A lookup from every possible set of road neighbors to the piece to use, made once. A cell with
// two or more road neighbors takes the piece that joins exactly those. A cell with one (the start and the
// goal, where the road comes up to the edge of the board) takes a straight piece pointing along it.
// A cell with none is only a stretch of road with nowhere to go: a straight piece will do.
const PIECE_FOR_SIDES = (() => {
  const table = [];
  for (const kind of Object.keys(BASE_SIDES)) {
    for (let turn = 0; turn < 4; turn++) {
      const sides = sidesOf(kind, turn);
      if (!table[sides]) table[sides] = { kind, turn };
    }
  }
  table[0] = { kind: "straight", turn: 0 };
  for (const side of [NORTH, SOUTH]) table[side] = { kind: "straight", turn: 0 };
  for (const side of [EAST, WEST]) table[side] = { kind: "straight", turn: 1 };
  return table;
})();

// Which of the four sides of a cell have road beside them.
function neighborMask(grid, col, row) {
  return (
    (isRoad(grid, col, row - 1) ? NORTH : 0) |
    (isRoad(grid, col + 1, row) ? EAST : 0) |
    (isRoad(grid, col, row + 1) ? SOUTH : 0) |
    (isRoad(grid, col - 1, row) ? WEST : 0)
  );
}

// The piece for a set of sides: { kind, turn }.
function roadPiece(mask) {
  return PIECE_FOR_SIDES[mask & 15];
}

// What goes in a cell of a map: { kind, turn }. Grass is turned in the way grassTurn says, so
// that it doesn't look like wallpaper.
function pieceAt(grid, col, row) {
  if (!isRoad(grid, col, row)) return { kind: "grass", turn: grassTurn(col, row) };
  return roadPiece(neighborMask(grid, col, row));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NORTH, EAST, SOUTH, WEST, BASE_SIDES, turnSides, sidesOf, neighborMask, roadPiece, pieceAt };
} else {
  Object.assign(window, { NORTH, EAST, SOUTH, WEST, BASE_SIDES, turnSides, sidesOf, neighborMask, roadPiece, pieceAt });
}
