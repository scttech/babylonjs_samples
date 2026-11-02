// The scenery: props that stand on the board and make it a place. A prop is a model that doesn't do anything: it
// stands in a cell of grass, says what it is, and is in the way of a tower. The map's text says where each is (see maps.js);
// this file says what each looks like and puts them there. See ../tests/scenery.tests.js.

// The props, one row each. `name` is what the game calls it in a sentence, `file` is the model, and `width` is how wide
// it is made in the world, where a cell is two across: a tall thin thing is made narrower than a low wide one, so
// that none is bigger than its cell and none is lost in it.
const PROPS = {
  cabbage_cart: { name: "a cabbage cart", file: "scenery/cabbage_cart.glb", width: 1.85 },
  koi_pond: { name: "a koi pond", file: "scenery/koi_pond.glb", width: 1.9 },
  shrine: { name: "a spirit shrine", file: "scenery/shrine.glb", width: 1.55 },
  lemur_perch: { name: "a lemur perch", file: "scenery/lemur_perch.glb", width: 1.1 },
  bison_camp: { name: "a sky bison camp", file: "scenery/bison_camp.glb", width: 1.9 },
};

// Which way to turn a prop, in quarter turns, so that two of one kind aren't a copy of each other. Like the grass,
// it depends only on the cell, so that it is the same every time.
function propTurn(col, row) {
  let hash = Math.imul(row + 3, 374761393) ^ Math.imul(col + 5, 668265263);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822519);
  return (hash >>> 13) & 3;
}

// Loads every prop, and works out how each is scaled, lifted and centered to stand in the middle of a cell.
async function loadProps(scene, props = PROPS) {
  const kinds = Object.keys(props);
  const containers = await Promise.all(kinds.map((kind) => loadModel(scene, props[kind].file)));
  const loaded = {};
  kinds.forEach((kind, i) => {
    const bounds = measure(containers[i].rootNodes[0]);
    const scale = fitScale(sizeOf(bounds), props[kind].width);
    loaded[kind] = { container: containers[i], scale, lift: bottomOffset(bounds, scale), shift: centerOffset(bounds, scale) };
  });
  return loaded;
}

// Puts one prop in a cell. Two nodes, as a tile has: the outer one is in the middle of the cell and turns, the inner one
// scales the model, stands it on the ground and centers it. The prop is an instance, so a map with a lot of the same
// kind of prop costs no more to draw than one.
function placeProp(scene, model, name, col, row, turn = 0, board = BOARD) {
  const { x, z } = cellCenter(col, row, board);
  const outer = new BABYLON.TransformNode(name, scene);
  outer.position.set(x, 0, z);
  outer.rotation.y = (turn * Math.PI) / 2;

  const inner = new BABYLON.TransformNode(`${name} model`, scene);
  inner.parent = outer;
  inner.position.set(model.shift.x, model.lift, model.shift.z);
  inner.scaling.setAll(model.scale);

  const copy = model.container.instantiateModelsToScene((original) => `${name} ${original}`, false, { doNotInstantiate: false });
  copy.rootNodes[0].parent = inner;
  return outer;
}

// Puts every prop of a map on the board: [{ kind, col, row, node }].
function buildProps(scene, loaded, grid, board = BOARD) {
  return grid.props.map(({ kind, col, row }) => ({
    kind,
    col,
    row,
    node: placeProp(scene, loaded[kind], `${kind} ${col},${row}`, col, row, propTurn(col, row), board),
  }));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PROPS, propTurn, loadProps, placeProp, buildProps };
} else {
  Object.assign(window, { PROPS, propTurn, loadProps, placeProp, buildProps });
}
