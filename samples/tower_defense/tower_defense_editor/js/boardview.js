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
