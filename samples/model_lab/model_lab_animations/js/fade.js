// The numbers of playing a clip: how far its controls go, and how a **cross-fade** works. A cross-fade is how one clip hands over to the next
// without a jump: for a short time both are playing, the old one's **weight** (how much it counts) falls from 1 to 0 while the new one's rises
// from 0 to 1, and the pose is a mix of the two. Weights always add up to 1, so the model is never pulled out of shape. See ../tests/fade.tests.js.

// The limits of the controls, in one table that the player, the panel and the tests all read.
const PLAYER_LIMITS = {
  speed: { min: 0.1, max: 2, step: 0.1, start: 1 }, // 1 is the speed the clip was made at, 2 is twice as fast
  fade: { min: 0, max: 1, step: 0.05, start: 0.25 }, // seconds that a cross-fade takes; 0 is a cut
};

// A number held between the ends of a limit.
function clampTo(limit, value) {
  if (!Number.isFinite(value)) return limit.start;
  return Math.min(Math.max(value, limit.min), limit.max);
}

// How far through a fade it is, from 0 (not started) to 1 (done), given how long it has been going and how long it lasts. It is not a straight line: it
// eases in and out (smoothstep, 3t² - 2t³), so the hand-over has no sudden start or stop. A fade that takes no time is done at once.
function fadeAmount(elapsed, duration) {
  if (!(duration > 0)) return 1;
  const t = Math.min(Math.max(elapsed / duration, 0), 1);
  return t * t * (3 - 2 * t);
}

// The weights of the clip that is coming in and the one that is going out, which always add up to 1.
function fadeWeights(elapsed, duration) {
  const incoming = fadeAmount(elapsed, duration);
  return { incoming, outgoing: 1 - incoming };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PLAYER_LIMITS, clampTo, fadeAmount, fadeWeights };
} else {
  Object.assign(window, { PLAYER_LIMITS, clampTo, fadeAmount, fadeWeights });
}
