// Screen wrap for a single axis. Ship, bullets, and rocks all leave one edge
// of the screen and reappear on the opposite one, so the rule lives here once
// instead of being copied into each of them.
//
// `limit` is how far from the center something may travel before it wraps:
// pass the half-extent of the screen plus the thing's own radius, so it slides
// completely out of view before reappearing on the other side.
function wrapCoordinate(value, limit) {
  if (value > limit) return -limit;
  if (value < -limit) return limit;
  return value;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = wrapCoordinate;
} else {
  window.wrapCoordinate = wrapCoordinate;
}
