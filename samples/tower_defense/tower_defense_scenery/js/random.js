// Random numbers that can be repeated. Math.random() gives something different every time,
// which is no good for a rock that must look the same on every visit, or for a test that must
// give the same answer every time. This gives a function that is used like Math.random(), a
// number from 0 up to (not including) 1, but that makes the same list of numbers for the same
// seed. (It is the one called mulberry32.) See ../tests/random.tests.js.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { seededRandom };
} else {
  window.seededRandom = seededRandom;
}
