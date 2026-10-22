// Where the camera goes to follow the runner: behind it and a little above,
// looking down the street. Plain numbers (no Babylon.js), so it is easy to
// test; main.js moves the camera there each frame. See ../tests/camera.tests.js.

const CAMERA_DISTANCE = 6.5; // how far behind the runner the camera is
const CAMERA_HEIGHT = 2.8; // how high above the ground
const CAMERA_FOLLOW_X = 0.6; // how much of the runner's sideways move the camera copies
const CAMERA_FOLLOW_Y = 0.4; // how much of a jump the camera copies

// The camera's position for a runner at (x, y, z) in the street. The camera copies
// only part of the runner's sideways movement, so changing lanes moves the
// runner across the picture instead of dragging the whole street along with it,
// and only part of a jump, so the runner rises in the picture but the camera
// doesn't bob up and down with every jump.
function followPosition(runner, { distance = CAMERA_DISTANCE, height = CAMERA_HEIGHT, followX = CAMERA_FOLLOW_X, followY = CAMERA_FOLLOW_Y } = {}) {
  return { x: runner.x * followX, y: height + runner.y * followY, z: runner.z - distance };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_FOLLOW_X, CAMERA_FOLLOW_Y, followPosition };
} else {
  Object.assign(window, { CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_FOLLOW_X, CAMERA_FOLLOW_Y, followPosition });
}
