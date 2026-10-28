// The best scores on this device: a name and a score each, the best LEADERBOARD_SIZE,
// highest first, kept in the browser. It is local: it only knows about the scores
// set in this browser. See ../tests/leaderboard.tests.js.
const LEADERBOARD_KEY = "rollingRampage.leaderboard";
const LEADERBOARD_SIZE = 10;

class Leaderboard {
  constructor({ storage = browserStorage(), key = LEADERBOARD_KEY } = {}) {
    this.storage = storage;
    this.key = key;
    this.entries = []; // { name, score }, best first
    this.load();
  }

  // Takes what was saved. Anything in it that isn't a name with a score is dropped, so a
  // damaged or hand-edited save can't break the game, and what is kept is put in order.
  load() {
    const saved = readJson(this.storage, this.key);
    const list = Array.isArray(saved) ? saved : [];
    this.entries = list
      .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score) && entry.score > 0)
      .map((entry) => ({ name: cleanName(entry.name), score: Math.floor(entry.score) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, LEADERBOARD_SIZE);
  }

  // Remembers the entries. Says whether it could.
  save() {
    return writeJson(this.storage, this.key, this.entries);
  }

  // The best score so far, or 0 if there are none.
  get best() {
    return this.entries.length ? this.entries[0].score : 0;
  }

  // Whether `score` would get on the board: it must be more than nothing, and either there
  // is room or it beats the lowest.
  qualifies(score) {
    if (!(score > 0)) return false;
    return this.entries.length < LEADERBOARD_SIZE || score > this.entries[this.entries.length - 1].score;
  }

  // Whether `score` beats every score on the board. The first score is always the best.
  isBest(score) {
    return score > 0 && score > this.best;
  }

  // Adds a score, if it qualifies, and saves. Returns where it came, 1 for first, or 0 if it
  // didn't make the board. A score that ties another goes below it: first come, first served.
  add(name, score) {
    const points = Math.floor(score);
    if (!this.qualifies(points)) return 0;
    let rank = this.entries.findIndex((entry) => entry.score < points);
    if (rank === -1) rank = this.entries.length;
    this.entries.splice(rank, 0, { name: cleanName(name), score: points });
    this.entries.length = Math.min(this.entries.length, LEADERBOARD_SIZE);
    this.save();
    return rank + 1;
  }

  // Forgets every score.
  clear() {
    this.entries = [];
    this.save();
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEADERBOARD_KEY, LEADERBOARD_SIZE, Leaderboard };
} else {
  Object.assign(window, { LEADERBOARD_KEY, LEADERBOARD_SIZE, Leaderboard });
}
