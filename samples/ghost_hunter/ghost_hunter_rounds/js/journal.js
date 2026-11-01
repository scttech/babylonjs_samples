// The journal: what the hunter has met and done, kept between visits. For each kind of thing (the ghosts and every creature): how many have been met, and how many have been
// dealt with (a ghost captured; a creature that was killed or held until it went). And the rounds: how many were played and won, the best round reached, and the five best
// scores. They are kept in the browser (localStorage), which a browser may refuse and a person may edit, so every use of storage is allowed to fail and what is read back is
// believed only when it makes sense. The storage is given, so a test can give one that throws. See ../tests/journal.tests.js.

const JOURNAL = {
  key: "ghost-hunter-journal",
  kinds: ["ghost", "spider", "ghoul", "skeleton", "mummy", "ghoul_girl", "doll"],
  top: 5, // how many scores are kept
};

// The browser's storage, or a stand-in that lasts until the page is closed, if there is none that works.
function journalStorage(win = typeof window !== "undefined" ? window : null) {
  try {
    const storage = win && win.localStorage;
    if (storage) {
      storage.setItem("ghost-hunter-test", "1");
      storage.removeItem("ghost-hunter-test");
      return storage;
    }
  } catch (error) {
    // refused: use the stand-in
  }
  const kept = new Map();
  return { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => kept.set(k, String(v)), removeItem: (k) => kept.delete(k) };
}

const wholeNumber = (value) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0);

// What was read back, made safe: only the kinds there are, whole numbers from zero, and a list of at most `top` scores, the best first.
function cleanJournal(raw, table = JOURNAL) {
  const source = raw && typeof raw === "object" ? raw : {};
  const entries = {};
  for (const kind of table.kinds) {
    const entry = (source.entries && source.entries[kind]) || {};
    const dealt = wholeNumber(entry.dealt);
    entries[kind] = { met: Math.max(wholeNumber(entry.met), dealt), dealt }; // none can be dealt with that were not met
  }
  const scores = (Array.isArray(source.scores) ? source.scores : []).map(wholeNumber).filter((n) => n > 0).sort((a, b) => b - a).slice(0, table.top);
  return { entries, played: wholeNumber(source.played), won: wholeNumber(source.won), best: wholeNumber(source.best), scores };
}

class Journal {
  constructor(storage = journalStorage(), table = JOURNAL) {
    this.storage = storage;
    this.table = table;
    let raw = null;
    try {
      raw = JSON.parse(storage.getItem(table.key));
    } catch (error) {
      raw = null;
    }
    Object.assign(this, cleanJournal(raw, table));
  }

  toJSON() {
    return { entries: this.entries, played: this.played, won: this.won, best: this.best, scores: this.scores };
  }

  save() {
    try {
      this.storage.setItem(this.table.key, JSON.stringify(this));
      return true;
    } catch (error) {
      return false; // the journal is only good for this visit
    }
  }

  // A thing of a kind has been met. Says whether it is the first of its kind that was ever met (which is worth a word).
  noteMet(kind) {
    const entry = this.entries[kind];
    if (!entry) return false;
    entry.met += 1;
    this.save();
    return entry.met === 1;
  }

  // A thing of a kind has been dealt with (a ghost captured, a creature killed or held until it went).
  noteDealt(kind) {
    const entry = this.entries[kind];
    if (!entry) return;
    entry.dealt += 1;
    entry.met = Math.max(entry.met, entry.dealt);
    this.save();
  }

  // A round is over: its result (see Round.result). A won round has a score that may make the best five, and the best round reached is kept. Gives whether the score is
  // a new best (the best of all).
  noteRound(result) {
    this.played += 1;
    let record = false;
    if (result.outcome === "won") {
      this.won += 1;
      this.best = Math.max(this.best, result.number);
      record = result.score > (this.scores[0] || 0);
      this.scores = [...this.scores, result.score].sort((a, b) => b - a).slice(0, this.table.top);
    } else {
      this.best = Math.max(this.best, result.number - 1);
    }
    this.save();
    return record;
  }

  // The kinds that have been met, with what was met and dealt with, in the order of the table: for a page of the journal.
  pages() {
    return this.table.kinds.filter((kind) => this.entries[kind].met > 0).map((kind) => ({ kind, ...this.entries[kind] }));
  }

  clear() {
    Object.assign(this, cleanJournal(null, this.table));
    this.save();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { JOURNAL, journalStorage, cleanJournal, Journal };
} else {
  Object.assign(window, { JOURNAL, journalStorage, cleanJournal, Journal });
}
