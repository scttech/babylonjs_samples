// How a game went: the numbers kept while it is played (`Stats`), what they are worth in stars (`starsFor`), and the best a
// player has done on each map (`Records`, kept in the browser's storage, which can fail). None of it knows about the page, so
// a test can play a game in a moment and say what its results page would say. See ../tests/stats.tests.js.

const RATING = {
  threeStars: 0.9, // the share of the lives left that wins three stars
  twoStars: 0.5, // and two
};

// What the result screen says as its title and its line, for a game that is won or lost.
const RESULTS = {
  won: { title: "The island is safe!", text: "Every wave has been beaten." },
  lost: { title: "The island has fallen", text: "Too many got through." },
};

class Stats {
  constructor() {
    this.time = 0; // seconds that the game has been played (not the time that it was paused)
    this.defeated = 0; // enemies that were defeated
    this.leaked = 0; // enemies that got to the end
    this.built = 0; // towers that were built
    this.upgraded = 0; // upgrades that were bought
    this.sold = 0; // towers that were sold
  }

  // Adds one to a count.
  count(name) {
    this[name]++;
  }
}

// How many stars a game is worth: none for a game that was lost, one for winning, two for winning with half the lives left,
// and three for nearly all of them.
function starsFor(result, lives, total) {
  if (result !== "won") return 0;
  const share = total > 0 ? lives / total : 0;
  if (share >= RATING.threeStars) return 3;
  if (share >= RATING.twoStars) return 2;
  return 1;
}

// Seconds as minutes and seconds: 75 is "1:15".
function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

// The lines of the result screen, as [label, value] pairs, for a game that has ended.
function summarize(stats, { wave, total, lives, gold }) {
  return [
    ["Waves", `${wave} of ${total}`],
    ["Lives left", String(lives)],
    ["Enemies defeated", String(stats.defeated)],
    ["Gold earned", String(Math.floor(gold))],
    ["Towers built", String(stats.built)],
    ["Upgrades", String(stats.upgraded)],
    ["Time", clock(stats.time)],
  ];
}

// The best a player has done on each map. `storage` is anything with `getItem` and `setItem` (the page's `localStorage`),
// and it is allowed to fail: a private window, full or blocked storage. Then there are no records, and the game goes on.
class Records {
  constructor(storage, key = "tower_defense_records") {
    this.storage = storage;
    this.key = key;
    this.data = this.load();
  }

  load() {
    try {
      const data = JSON.parse(this.storage.getItem(this.key));
      return data && typeof data === "object" ? data : {};
    } catch (error) {
      return {};
    }
  }

  // The best for a map, by its name: { stars, wave } (nothing at all is no stars and wave 0).
  get(map) {
    return { stars: 0, wave: 0, ...this.data[map] };
  }

  // Puts a game on the record: { stars, wave }. It says whether it was a best, in stars or in how far it got.
  update(map, { stars, wave }) {
    const best = this.get(map);
    const improved = stars > best.stars || wave > best.wave;
    this.data[map] = { stars: Math.max(stars, best.stars), wave: Math.max(wave, best.wave) };
    try {
      this.storage.setItem(this.key, JSON.stringify(this.data));
    } catch (error) {
      // Not saved; it is still kept until the page is closed.
    }
    return improved;
  }
}

// The page's local storage, or a stand-in that keeps nothing when it can't be had (a private window, or storage that is blocked: even
// asking for it can throw).
function safeStorage(page) {
  try {
    const storage = page.localStorage;
    storage.getItem("tower_defense_probe");
    return storage;
  } catch (error) {
    return { getItem: () => null, setItem: () => {} };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RATING, RESULTS, Stats, starsFor, clock, summarize, Records, safeStorage };
} else {
  Object.assign(window, { RATING, RESULTS, Stats, starsFor, clock, summarize, Records, safeStorage });
}
