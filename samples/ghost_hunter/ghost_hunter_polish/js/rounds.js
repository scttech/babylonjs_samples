// Rounds: what makes the hunt a game with a beginning and an end. A round is **a room to clear**: some ghosts are hidden in it, and the player has to find them (with the
// gadgets) and capture them (with the beam), while what else is in the room tries to get at them. Two things run down: **health**, which what touches you takes
// from you, and **sanity**, which the dark and the dread take from you, and which light and a capture give back. Lose either and the round is lost; capture every
// ghost and it is won, with a score; and the next round is harder. Nothing here is drawn, and no Babylon.js is in it: it is plain numbers and arithmetic of what happened
// each moment, with the random numbers given in, so a test can lose a round to the dark or win one with a minute to spare. See ../tests/rounds.tests.js.

const ROUNDS = {
  health: 100,
  sanity: 100,
  // How much each kind of thing takes from your health when it gets to you ("pop" is one that jumps out at the edge of the screen), and from your sanity as well, as a part of that.
  damage: { spider: 8, ghoul: 20, skeleton: 15, mummy: 25, ghoul_girl: 12, doll: 14, pop: 6 },
  fright: 0.5, // the sanity a touch takes, as a part of the health it takes
  // What happens to sanity every second. The dark takes it, the dread (something near) takes more, a ghost that is near and looked at takes a little more; light, in a
  // quiet moment, gives some back; and a capture gives a lot.
  drain: { dark: 0.5, dread: 2.4, watched: 0.9 },
  restore: { light: 1.1, quietBelow: 0.2, capture: 14 },
  // Sanity below `below` begins to play tricks: things heard that are not there, more often the less there is.
  trick: { below: 55, perSecond: 0.25, kinds: ["creak", "whisper", "creak", "step", "whisper", "breath"] },
  // How a round is scored: a capture, what is left of health and sanity, and how quickly it was done.
  score: { capture: 100, perHealth: 2, perSanity: 1, parSeconds: 150, perSecond: 1.5 },
  // What the rounds are like. The first is gentle; each is harder, up to the last of the table (and after it, as hard as that).
  levels: [
    { ghosts: 1, intensity: 0.7 },
    { ghosts: 1, intensity: 0.9 },
    { ghosts: 2, intensity: 1 },
    { ghosts: 2, intensity: 1.2 },
    { ghosts: 3, intensity: 1.4 },
  ],
  ghostLife: 1e9, // seconds a hidden ghost stays (it does not go of itself: the player has to find it)
};

// What round number `number` (from 1) is like: { ghosts, intensity }.
function levelFor(number, table = ROUNDS) {
  return table.levels[Math.max(0, Math.min(table.levels.length, number) - 1)];
}

// The score of a round that was won, from { captured, health, sanity, time }: the captures, what is left of health and of sanity, and a bonus for a quick one
// (a second under par is worth `perSecond`, and a round that is slower than par has no bonus, and no penalty). Whole points.
function roundScore({ captured, health, sanity, time }, table = ROUNDS) {
  const s = table.score;
  const quick = Math.max(0, s.parSeconds - time) * s.perSecond;
  return Math.round(captured * s.capture + Math.max(0, health) * s.perHealth + Math.max(0, sanity) * s.perSanity + quick);
}

// How wrong the screen looks at a sanity: { vignette, jitter, tilt, hue } from 0 (as it should be) up. Nothing wrong above `below`; then more as it falls.
function sanityLook(sanity, table = ROUNDS) {
  const loss = Math.max(0, Math.min(1, (table.trick.below - sanity) / table.trick.below));
  return { vignette: loss, jitter: loss * loss, tilt: loss * 2.2, hue: loss * 40 };
}

class Round {
  // `number` is which round (from 1). `random` gives numbers from 0 up to 1. `table` is ROUNDS.
  constructor(number = 1, random = Math.random, table = ROUNDS) {
    this.number = number;
    this.random = random;
    this.table = table;
    this.level = levelFor(number, table);
    this.state = "ready"; // "ready", "hunting", "won", "lost"
    this.health = table.health;
    this.sanity = table.sanity;
    this.time = 0;
    this.captured = 0;
    this.reason = null; // why it was lost: "health" or "sanity"
    this.score = 0;
    this.events = []; // what happened and has not been told of: { kind: "hurt" | "trick" | "won" | "lost", ... }
  }

  get ghosts() {
    return this.level.ghosts;
  }

  get running() {
    return this.state === "hunting";
  }

  start() {
    if (this.state !== "ready") return false;
    this.state = "hunting";
    return true;
  }

  // Something has got to the player: `kind` is a key of the table's damage. Gives how much health it took.
  hurt(kind) {
    if (!this.running) return 0;
    const damage = this.table.damage[kind] ?? 10;
    this.health = Math.max(0, this.health - damage);
    this.sanity = Math.max(0, this.sanity - damage * this.table.fright);
    this.events.push({ kind: "hurt", from: kind, damage });
    this._check();
    return damage;
  }

  // A ghost has been captured. The last one wins the round.
  capture() {
    if (!this.running) return false;
    this.captured += 1;
    this.sanity = Math.min(this.table.sanity, this.sanity + this.table.restore.capture);
    if (this.captured >= this.ghosts) {
      this.state = "won";
      this.score = roundScore(this, this.table);
      this.events.push({ kind: "won", score: this.score });
    }
    return true;
  }

  // Time goes by. `situation` is { lightOn, dread (0 to 1: how near what is nearest), watched (how many ghosts that are near are being looked at) }.
  update(seconds, { lightOn = false, dread = 0, watched = 0 } = {}) {
    if (!this.running) return;
    const t = this.table;
    this.time += seconds;
    let change = 0;
    if (!lightOn) change -= t.drain.dark;
    change -= t.drain.dread * dread;
    change -= t.drain.watched * Math.min(2, watched);
    if (lightOn && dread < t.restore.quietBelow) change += t.restore.light;
    this.sanity = Math.max(0, Math.min(t.sanity, this.sanity + change * seconds));
    if (this.sanity < t.trick.below && this.random() < ((t.trick.below - this.sanity) / t.trick.below) * t.trick.perSecond * seconds) {
      this.events.push({ kind: "trick", trick: t.trick.kinds[Math.floor(this.random() * t.trick.kinds.length)] });
    }
    this._check();
  }

  _check() {
    if (!this.running) return;
    if (this.health <= 0) this._lose("health");
    else if (this.sanity <= 0) this._lose("sanity");
  }

  _lose(reason) {
    this.state = "lost";
    this.reason = reason;
    this.events.push({ kind: "lost", reason });
  }

  // What happened since last asked, and forgets it.
  take() {
    const events = this.events;
    this.events = [];
    return events;
  }

  // The result of the round, for the journal and the screen at the end.
  result() {
    return { number: this.number, outcome: this.state, reason: this.reason, captured: this.captured, ghosts: this.ghosts, health: this.health, sanity: Math.round(this.sanity), time: this.time, score: this.score };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ROUNDS, levelFor, roundScore, sanityLook, Round };
} else {
  Object.assign(window, { ROUNDS, levelFor, roundScore, sanityLook, Round });
}
