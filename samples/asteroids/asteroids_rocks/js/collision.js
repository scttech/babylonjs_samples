// Circle-vs-circle overlap test, the collision check Asteroids is built on:
// bullets, rocks, and (in a later step) the ship are all treated as circles.
//
// Two circles overlap when the distance between their centers is less than
// the sum of their radii. Comparing *squared* distances avoids a Math.sqrt()
// call, which matters when this runs for every bullet-rock pair every frame.
// Circles that exactly touch do not count as overlapping.
function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const radii = ar + br;
  return dx * dx + dy * dy < radii * radii;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = circlesOverlap;
} else {
  window.circlesOverlap = circlesOverlap;
}
