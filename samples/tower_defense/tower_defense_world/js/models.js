// Models come in their own size, and with their own idea of where the middle is: the tiles of
// this game are 1.9 units wide, the podiums are drawn around their middle, and the next ones
// will be different again. This measures a model and works out how to scale and lift it so that
// it stands on the ground and fits where it is put. See ../tests/models.tests.js.

const ASSETS = "../assets/"; // where the models are, from the page

// The size of a box that holds a model, given as its two corners.
function sizeOf(bounds) {
  return {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
}

// How much to scale a model to make it `width` wide on the ground (its longer side, across or deep).
function fitScale(size, width) {
  return width / Math.max(size.x, size.z);
}

// How far to move a model up (or down) so that its top is at the ground. `scale` is the
// scale it will be given. The tiles are drawn around their middle, and a tower stands on the
// top of one, so it is the top that must be at zero.
function topOffset(bounds, scale) {
  return -bounds.max.y * scale;
}

// How far to move a model along x and z, after it has been scaled, so that its middle is at the middle of its cell.
function centerOffset(bounds, scale) {
  return {
    x: -((bounds.min.x + bounds.max.x) / 2) * scale,
    z: -((bounds.min.z + bounds.max.z) / 2) * scale,
  };
}

// The box that holds a model and everything under it, in the model's own units. The
// model's meshes are not in the scene yet (they are in a container), so the matrices
// that put each mesh in place are worked out first.
function measure(root) {
  root.computeWorldMatrix(true);
  const { min, max } = root.getHierarchyBoundingVectors(true);
  return {
    min: { x: min.x, y: min.y, z: min.z },
    max: { x: max.x, y: max.y, z: max.z },
  };
}

// Loads a .glb into a container: its meshes, materials and animations are made, but nothing is in
// the scene until it is asked for. Many copies can be made from one container, and they share
// the one set of triangles and pictures.
async function loadModel(scene, file) {
  return BABYLON.SceneLoader.LoadAssetContainerAsync(ASSETS, file, scene);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ASSETS, sizeOf, fitScale, topOffset, centerOffset, measure, loadModel };
} else {
  Object.assign(window, { ASSETS, sizeOf, fitScale, topOffset, centerOffset, measure, loadModel });
}
