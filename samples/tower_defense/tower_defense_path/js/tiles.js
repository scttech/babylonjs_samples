// The tiles the board is made of: grass for building on, and the pieces of road that enemies
// walk. Each kind is a model, loaded once, and every cell of that kind is a copy that shares the
// one set of triangles and pictures. See ../tests/tiles.tests.js.

// The models, and what each one looks like when it is not turned. The road pieces are drawn
// with their road running up the screen: a straight piece runs from the front to the back,
// a corner joins the back to the right, a junction is a road across with a branch to the back,
// and a crossroads joins all four.
const TILES = {
  grass: { file: "tiles/grass.glb" },
  straight: { file: "tiles/straight.glb" },
  corner: { file: "tiles/corner.glb" },
  junction: { file: "tiles/junction.glb" },
  crossroads: { file: "tiles/crossroads.glb" },
};

// A tile is made a little wider than its cell, so the ragged edges of one hide the crack
// between it and the next.
const TILE_FIT = 1.02;

// Which way to turn a tile of grass. Every grass tile is the same picture, and a board of them looks like
// wallpaper, so each is turned a quarter at a time, in a way that looks random but is the
// same every time: it depends only on the cell.
function grassTurn(col, row) {
  let hash = Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return (hash >>> 16) & 3;
}

// Loads every kind of tile, and works out how each is scaled and lifted to fit a cell.
async function loadTiles(scene, board = BOARD, tiles = TILES) {
  const kinds = Object.keys(tiles);
  const containers = await Promise.all(kinds.map((kind) => loadModel(scene, tiles[kind].file)));
  const loaded = {};
  kinds.forEach((kind, i) => {
    const bounds = measure(containers[i].rootNodes[0]);
    const scale = fitScale(sizeOf(bounds), board.cell * TILE_FIT);
    loaded[kind] = {
      container: containers[i],
      scale,
      lift: topOffset(bounds, scale),
      shift: centerOffset(bounds, scale),
    };
  });
  return loaded;
}

// Puts one tile in a cell. `turn` is how many quarter turns it is given, clockwise seen from
// above. Two nodes hold it: the outer one is at the middle of the cell and does the turning, and the
// inner one scales the model and moves it so that its top is at the ground and its middle at the cell's.
function placeTile(scene, tile, name, col, row, turn = 0, board = BOARD) {
  const { x, z } = cellCenter(col, row, board);
  const outer = new BABYLON.TransformNode(name, scene);
  outer.position.set(x, 0, z);
  outer.rotation.y = (turn * Math.PI) / 2;

  const inner = new BABYLON.TransformNode(`${name} model`, scene);
  inner.parent = outer;
  inner.position.set(tile.shift.x, tile.lift, tile.shift.z);
  inner.scaling.setAll(tile.scale);

  // Instances, not clones: Babylon.js draws every instance of a mesh in one go, which is what makes a
  // board of a hundred and twenty tiles cheap. (By default it makes clones, which are drawn one at a time.)
  const copy = tile.container.instantiateModelsToScene((original) => `${name} ${original}`, false, { doNotInstantiate: false });
  copy.rootNodes[0].parent = inner;
  return outer;
}

// Fills the board. `kindAt(col, row)` says what goes in a cell: { kind, turn }.
function buildTiles(scene, tiles, kindAt, board = BOARD) {
  return boardCells(board).map(({ col, row }) => {
    const { kind, turn } = kindAt(col, row);
    const node = placeTile(scene, tiles[kind], `tile ${col},${row}`, col, row, turn, board);
    return { col, row, kind, turn, node };
  });
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TILES, TILE_FIT, grassTurn, loadTiles, placeTile, buildTiles };
} else {
  Object.assign(window, { TILES, TILE_FIT, grassTurn, loadTiles, placeTile, buildTiles });
}
