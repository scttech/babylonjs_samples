// Pointing: turning a place on the screen (where a finger or a mouse is) into a place on the board. The
// camera has no perspective, so this is simple arithmetic and needs no scene: the screen shows a box of
// the world (the extents that view.js works out), a place on the screen is a share of the way across that
// box and up it, and the ground is the one place on the line of sight that is at the height you ask for.
// See ../tests/pointing.tests.js.

const POINTER = {
  touchLift: 72, // how many pixels above a finger a dragged podium is held, so that the finger doesn't hide it
  tapDistance: 10, // how far a finger can move and still be a tap, in pixels
};

// A place on the page, as a share of the way across and up the canvas, from -1 to 1 each way, with
// up and to the right the bigger numbers (as a camera sees it). `rect` is the canvas's box on the page.
function toScreenShare(rect, clientX, clientY) {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: 1 - ((clientY - rect.top) / rect.height) * 2,
  };
}

// How far above the pointer to hold something that is dragged: a finger covers what is under it and
// a mouse pointer does not.
function liftFor(pointerType) {
  return pointerType === "touch" ? POINTER.touchLift : 0;
}

// The place on the ground that a place on the screen is looking at, as { x, z }. `share` is { x, y } from
// -1 to 1, `extents` is what viewExtents gave for the screen, and `height` is how high the ground is.
// A place on the screen is a place in the world that is that far to the right of the camera and that far up
// from it: dot(p, right) = px and dot(p, up) = py. With the height known, that is two equations for x and z.
function groundAt(extents, share, angles = CAMERA, height = 0) {
  const { right, up } = viewAxes(angles.alpha, angles.beta);
  const px = extents.centerX + share.x * extents.halfWidth - right[1] * height;
  const py = extents.centerY + share.y * extents.halfHeight - up[1] * height;
  // right[0] x + right[2] z = px, and up[0] x + up[2] z = py
  const determinant = right[0] * up[2] - right[2] * up[0];
  return {
    x: (px * up[2] - right[2] * py) / determinant,
    z: (right[0] * py - up[0] * px) / determinant,
  };
}

// The cell that a place on the page is over, or null when it is off the board. This is the three steps in
// order: where on the canvas, where on the ground, which cell.
function cellAtPoint(rect, extents, clientX, clientY, lift = 0, board = BOARD) {
  const ground = groundAt(extents, toScreenShare(rect, clientX, clientY - lift));
  return cellAt(ground.x, ground.z, board);
}

// Whether a place on the page is inside a box (a canvas, a tray).
function isInside(rect, clientX, clientY) {
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { POINTER, toScreenShare, liftFor, groundAt, cellAtPoint, isInside };
} else {
  Object.assign(window, { POINTER, toScreenShare, liftFor, groundAt, cellAtPoint, isInside });
}
