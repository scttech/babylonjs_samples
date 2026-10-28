// Score: what a game is worth. A level that is finished is worth a fixed bonus, and more for every
// whole second left on the clock, so a quick, clean run beats a slow one, and a bump or a fall (which cost
// seconds) cost points. The score of a game is the sum of its levels. It is plain numbers, with no Babylon.js
// and no page, so the rules are easy to test. See ../tests/score.tests.js.

const LEVEL_BONUS = 500; // for finishing a level at all
const SECOND_POINTS = 100; // for every whole second left on the clock when it is finished

// What a level is worth, finished with `remaining` seconds left. Part of a second isn't counted.
function levelScore(remaining) {
  return LEVEL_BONUS + Math.floor(Math.max(0, remaining)) * SECOND_POINTS;
}

// A score as it is shown, with a comma between thousands: 12345 is "12,345".
function formatScore(points) {
  return String(Math.floor(points)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// The levels finished in a game so far, and what each was worth.
class Tally {
  constructor() {
    this.levels = []; // { remaining, points } for each, in order
  }

  // Back to the start of a game.
  reset() {
    this.levels = [];
  }

  // A level has been finished with `remaining` seconds left. Says what it was worth.
  add(remaining) {
    const points = levelScore(remaining);
    this.levels.push({ remaining: Math.floor(Math.max(0, remaining)), points });
    return points;
  }

  // How many levels have been finished.
  get completed() {
    return this.levels.length;
  }

  // The score of the game so far.
  get total() {
    return this.levels.reduce((sum, level) => sum + level.points, 0);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVEL_BONUS, SECOND_POINTS, levelScore, formatScore, Tally };
} else {
  Object.assign(window, { LEVEL_BONUS, SECOND_POINTS, levelScore, formatScore, Tally });
}
