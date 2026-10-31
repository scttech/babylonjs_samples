// Records: what the game remembers between visits: the best time of the trial, the best score and the longest chain, which runner was chosen, and how loud
// the sound is and how fast the mouse looks. They are kept in the browser (localStorage), and a browser can refuse (a private window, a full disk, a policy),
// so every use of storage is allowed to fail and the game goes on without it. The storage is given to Records, so a test can give it a stand-in.
// See ../tests/records.tests.js.

// The key the records are kept under, what a new player starts with, and the limits of what is believed when it is read back (a person can edit what a
// browser keeps, and an old version of the game may have written something else).
const RECORDS = {
  key: "rooftop-parkour",
  runners: ["male", "female"],
  defaults: { runner: "male", volume: 0.7, lookSpeed: 0.003, trialBest: null, scoreBest: 0, chainBest: 0, tokensBest: 0, runs: 0 },
  limits: { volume: [0, 1], lookSpeed: [0.0005, 0.008] },
};

// The storage of the page, or a stand-in that keeps things until the page is closed, if the page has none that works.
function pageStorage(win = typeof window !== "undefined" ? window : null) {
  try {
    const storage = win && win.localStorage;
    if (storage) {
      storage.setItem("rooftop-parkour-test", "1");
      storage.removeItem("rooftop-parkour-test");
      return storage;
    }
  } catch (error) {
    // refused: use the stand-in
  }
  const kept = new Map();
  return { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => kept.set(k, String(v)), removeItem: (k) => kept.delete(k) };
}

const clampTo = (value, [low, high]) => Math.min(high, Math.max(low, value));

// What was read back, made safe: a value of the wrong kind, or outside its limits, is replaced by the default (or held to the limit).
function cleanRecords(raw, table = RECORDS) {
  const d = table.defaults;
  const source = raw && typeof raw === "object" ? raw : {};
  const number = (value, fallback) => (typeof value === "number" && Number.isFinite(value) ? value : fallback);
  const time = (value) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null);
  return {
    runner: table.runners.includes(source.runner) ? source.runner : d.runner,
    volume: clampTo(number(source.volume, d.volume), table.limits.volume),
    lookSpeed: clampTo(number(source.lookSpeed, d.lookSpeed), table.limits.lookSpeed),
    trialBest: time(source.trialBest),
    scoreBest: Math.max(0, Math.floor(number(source.scoreBest, d.scoreBest))),
    chainBest: Math.max(0, Math.floor(number(source.chainBest, d.chainBest))),
    tokensBest: Math.max(0, Math.floor(number(source.tokensBest, d.tokensBest))),
    runs: Math.max(0, Math.floor(number(source.runs, d.runs))),
  };
}

class Records {
  // `storage` is anything with getItem, setItem and removeItem (a page's localStorage, or pageStorage's stand-in).
  constructor(storage = pageStorage(), table = RECORDS) {
    this.storage = storage;
    this.table = table;
    let raw = null;
    try {
      raw = JSON.parse(storage.getItem(table.key));
    } catch (error) {
      raw = null; // nothing kept, unreadable, or storage that throws
    }
    Object.assign(this, cleanRecords(raw, table));
  }

  // The numbers as they are kept.
  toJSON() {
    const { runner, volume, lookSpeed, trialBest, scoreBest, chainBest, tokensBest, runs } = this;
    return { runner, volume, lookSpeed, trialBest, scoreBest, chainBest, tokensBest, runs };
  }

  save() {
    try {
      this.storage.setItem(this.table.key, JSON.stringify(this));
      return true;
    } catch (error) {
      return false; // the records are only good for this visit
    }
  }

  // Changes a setting (one of runner, volume, lookSpeed) and keeps it. A value that is not allowed is held to what is, or ignored.
  set(name, value) {
    if (!["runner", "volume", "lookSpeed"].includes(name)) return undefined;
    const clean = cleanRecords({ ...this.toJSON(), [name]: value }, this.table);
    this[name] = clean[name];
    this.save();
    return this[name];
  }

  // A trial has been finished in `seconds`. Gives whether it is a new best (the first time is one), and keeps it if it is.
  noteTrial(seconds) {
    if (!(seconds > 0)) return false;
    const better = this.trialBest === null || seconds < this.trialBest;
    if (better) {
      this.trialBest = seconds;
      this.save();
    }
    return better;
  }

  // A run is over (the player paused and left, or closed the page): { score, chain, tokens }. Gives which of them are new bests, as a list of names.
  noteRun({ score = 0, chain = 0, tokens = 0 }) {
    const beaten = [];
    if (score > this.scoreBest) beaten.push("score");
    if (chain > this.chainBest) beaten.push("chain");
    if (tokens > this.tokensBest) beaten.push("tokens");
    this.scoreBest = Math.max(this.scoreBest, Math.floor(score));
    this.chainBest = Math.max(this.chainBest, Math.floor(chain));
    this.tokensBest = Math.max(this.tokensBest, Math.floor(tokens));
    this.runs++;
    this.save();
    return beaten;
  }

  // Forgets everything but the settings.
  clearBests() {
    this.trialBest = null;
    this.scoreBest = 0;
    this.chainBest = 0;
    this.tokensBest = 0;
    this.runs = 0;
    this.save();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RECORDS, pageStorage, cleanRecords, Records };
} else {
  Object.assign(window, { RECORDS, pageStorage, cleanRecords, Records });
}
