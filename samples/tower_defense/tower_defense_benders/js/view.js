// The view: a fixed camera that looks down at the board from the front, tipped over, with no
// perspective, so a tower at the back is the same size as one at the front. An orthographic
// camera is given the edges of what it shows, and this works them out so that the whole board
// fits whatever shape the screen is: a wide window, or a phone held upright. See ../tests/view.tests.js.

const CAMERA = {
  alpha: -Math.PI / 2, // which side it looks from: -90 degrees is the front, with the far row at the top of the screen
  beta: 0.72, // how far it is tipped from straight up, in radians (41 degrees)
  distance: 120, // how far back it is. With no perspective this changes nothing but what is cut off
  margin: 1.06, // a little room round the board, as a multiplier
};

// Which way the screen's right and up point in the world, and which way the camera looks, for
// the two angles an ArcRotateCamera is given. (Babylon.js is left-handed: right is up crossed with forward.)
function viewAxes(alpha = CAMERA.alpha, beta = CAMERA.beta) {
  const forward = [-Math.cos(alpha) * Math.sin(beta), -Math.cos(beta), -Math.sin(alpha) * Math.sin(beta)];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const length = (v) => Math.hypot(v[0], v[1], v[2]);
  const unit = (v) => v.map((n) => n / length(v));
  const right = unit(cross([0, 1, 0], forward));
  const up = cross(forward, right);
  return { right, up, forward };
}

// The eight corners of what the view must always show: the island's rim, as much of the rock under
// it as there is room for, and the headroom above it for what stands on it.
function boardPoints(board = BOARD) {
  const x = (board.cols * board.cell) / 2 + board.rim;
  const z = (board.rows * board.cell) / 2 + board.rim;
  const points = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const y of [-board.peek, board.headroom]) points.push([sx * x, y, sz * z]);
    }
  }
  return points;
}

// What the view must show to hold some points: where the middle of them is on the screen, and
// half their width and half their height. `aspect` is the screen's width divided by its height.
// The view has the screen's shape, so one of the two is bigger than the points need.
function viewExtents(points, aspect, angles = CAMERA, margin = CAMERA.margin) {
  const { right, up } = viewAxes(angles.alpha, angles.beta);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const xs = points.map((p) => dot(p, right));
  const ys = points.map((p) => dot(p, up));
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  let halfWidth = ((Math.max(...xs) - Math.min(...xs)) / 2) * margin;
  let halfHeight = ((Math.max(...ys) - Math.min(...ys)) / 2) * margin;
  if (halfWidth / halfHeight < aspect) halfWidth = halfHeight * aspect;
  else halfHeight = halfWidth / aspect;
  return { centerX, centerY, halfWidth, halfHeight };
}

// Gives an orthographic camera the edges of its view.
function applyExtents(camera, extents) {
  camera.orthoLeft = extents.centerX - extents.halfWidth;
  camera.orthoRight = extents.centerX + extents.halfWidth;
  camera.orthoBottom = extents.centerY - extents.halfHeight;
  camera.orthoTop = extents.centerY + extents.halfHeight;
}

// Makes the camera. It is an ArcRotateCamera, which sits on a sphere round a target, so "from the
// front, tipped over" is two angles. It isn't attached to the mouse or touch: the player doesn't move the view.
function buildCamera(scene) {
  const camera = new BABYLON.ArcRotateCamera("camera", CAMERA.alpha, CAMERA.beta, CAMERA.distance, BABYLON.Vector3.Zero(), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 1;
  camera.maxZ = CAMERA.distance * 2;
  scene.activeCamera = camera;
  return camera;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CAMERA, viewAxes, boardPoints, viewExtents, applyExtents, buildCamera };
} else {
  Object.assign(window, { CAMERA, viewAxes, boardPoints, viewExtents, applyExtents, buildCamera });
}
