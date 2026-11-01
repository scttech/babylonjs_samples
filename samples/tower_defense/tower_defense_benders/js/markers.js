// The markers of the road: a glowing ring where enemies come on to the board, and another where
// they are trying to get to. They are made in code, from a ring and a disc, because the road has no
// piece for an end. They breathe a little, so that they are noticed. See ../tests/markers.tests.js.

const MARKERS = {
  start: { color: "#e0482b", radius: 0.78 }, // the red of the fire nation
  goal: { color: "#f2c230", radius: 0.78 }, // the gold of the banner
};

const MARKER_BREATH = { size: 0.08, rate: 3 }; // how much the ring grows and shrinks (a share of its size), and how fast, in radians a second

// How big the ring is, as a multiple of its size, after `time` seconds: a slow swell and shrink.
function markerPulse(time) {
  return 1 + MARKER_BREATH.size * Math.sin(time * MARKER_BREATH.rate);
}

// Makes a marker in the cell, standing on the ground. `update(time)` makes it breathe.
function buildMarker(scene, kind, col, row, board = BOARD) {
  const { color, radius } = MARKERS[kind];
  const { x, z } = cellCenter(col, row, board);
  const node = new BABYLON.TransformNode(`marker ${kind}`, scene);
  node.position.set(x, 0.04, z);

  const glow = BABYLON.Color3.FromHexString(color);
  const material = new BABYLON.StandardMaterial(`marker ${kind}`, scene);
  material.emissiveColor = glow;
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.alpha = 0.9;

  const ring = BABYLON.MeshBuilder.CreateTorus(`marker ${kind} ring`, { diameter: radius * 2, thickness: 0.14, tessellation: 40 }, scene);
  ring.parent = node;
  ring.material = material;
  ring.isPickable = false;

  const disc = BABYLON.MeshBuilder.CreateDisc(`marker ${kind} disc`, { radius: radius * 0.92, tessellation: 40 }, scene);
  disc.parent = node;
  disc.rotation.x = Math.PI / 2; // a disc is made standing up, facing along z: lay it flat
  disc.position.y = -0.02;
  disc.material = material.clone(`marker ${kind} disc`);
  disc.material.alpha = 0.3;
  disc.isPickable = false;

  const update = (time) => node.scaling.setAll(markerPulse(time));
  return { node, ring, disc, update };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARKERS, MARKER_BREATH, markerPulse, buildMarker };
} else {
  Object.assign(window, { MARKERS, MARKER_BREATH, markerPulse, buildMarker });
}
