// Targeting: which enemy a tower shoots at. A tower is given the enemies that there are and the way it
// likes to choose, and it says which one. Nothing here knows about models or the scene: an enemy is
// anything with an `x`, a `z`, a `progress` (how far along the road it is, from 0 to 1) and a `done`
// (whether it has got to the end), so that a test can make them with a line each. See ../tests/targeting.tests.js.

// How far apart two places are on the ground.
function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Whether `to` is as near as `range` to `from`.
function inRange(from, to, range) {
  return distanceBetween(from, to) <= range;
}

// The ways to choose. Each is a score, and the enemy with the highest score is the one that is shot.
// `first` is the one furthest along the road (the one that has nearly got there), `last` the one least
// far along, and `closest` the one nearest to the tower.
const TARGET_MODES = {
  first: (enemy) => enemy.progress,
  last: (enemy) => -enemy.progress,
  closest: (enemy, from) => -distanceBetween(from, enemy),
};

// The enemy in range with the highest score, or null if there is none. An enemy that has got to the
// end is not a target. If two have the same score, the one that comes first in the list is.
function pickTarget(from, range, enemies, mode = "first") {
  const score = TARGET_MODES[mode];
  let best = null;
  let bestScore = -Infinity;
  for (const enemy of enemies) {
    if (enemy.done || !inRange(from, enemy, range)) continue;
    const s = score(enemy, from);
    if (s > bestScore) {
      best = enemy;
      bestScore = s;
    }
  }
  return best;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { distanceBetween, inRange, TARGET_MODES, pickTarget };
} else {
  Object.assign(window, { distanceBetween, inRange, TARGET_MODES, pickTarget });
}
