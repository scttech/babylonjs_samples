# Tutorial: Ghost Hunter Rounds -- A Room to Clear

This is the fourteenth tutorial of the Ghost Hunter series. The player can find things and capture them, and nothing is ever won or lost: the hunt goes on until the player puts the phone down. This sample makes it a game with a beginning and an end. A **round** is a room to clear: some ghosts are hidden in it; the player has to find them with the gadgets and capture them with the beam, while what else is in the room tries to get at them. Two things run down: **health**, which what touches you takes, and **sanity**, which the dark and the dread take, and which light and a capture give back. Lose either and the round is lost; capture every ghost and it is won, with a score; and the next round is harder.

By the end you'll have:

- **The rules of a round** as plain numbers and arithmetic: what each round is like, how a score is made, how the screen goes wrong as sanity falls
- **A round** that keeps health and sanity, is hurt by what touches it, drained by the dark and by dread, restored by light and by a capture, plays tricks on a mind that is low, and is won or lost once
- **A journal**, kept between visits: what has been met and dealt with of each kind, how many rounds were played and won, and the five best scores
- **What is drawn**: two bars and the number of the round, a screen at the end of a round (what happened, the score, the journal, the best scores, and what to do next), and a picture that goes wrong
- The **game**: the first round begins with the game; ghosts are hidden in the room and stay until they are found; each round is harder; and what is heard in the dark when sanity is low is not there
- A **Rounds** section in the developer panel, with buttons to hurt yourself, lose your mind, win and go on
- Unit tests for all of it: **499 passing tests**

**What you'll learn:** how to make a game out of rules that are numbers in a table (and how to test a game of dread by running a round for a minute in a loop), how two meters that pull against each other make a player choose, how a state machine for a round is won or lost exactly once, how to keep a journal in a browser that may refuse it, and how a score can reward the way a round was played.

**Before you start:** do the [Detectors tutorial](../ghost_hunter_detectors/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Detectors sample, plus placeholders for the new files and their tests:

```
ghost_hunter_rounds/
├── index.html, tests.html   (already list the new scripts and the new stylesheet)
├── css/
│   ├── rounds.css          (placeholder -- Step 4)
│   └── everything else, from the Detectors sample
├── js/
│   ├── rounds.js           (placeholder -- Steps 1 and 2)
│   ├── journal.js          (placeholder -- Step 3)
│   ├── roundsui.js         (placeholder -- Step 4)
│   ├── main.js, ghost.js   (changes -- Step 5)
│   └── everything else, from the Detectors sample
└── tests/
    ├── rounds.tests.js, round.tests.js, journal.tests.js, roundsui.tests.js   (placeholders)
    └── everything else, from the Detectors sample
```

Open `tests.html` before you change anything. You should see **469 passing tests**.

### Serving the page

A phone only lets a page use its camera and motion sensors over HTTPS: see the [series README](../README.md). Add **`?dev`** to the address for the developer panel.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **Levels, scores and a look**: the numbers of a round, and what a score is made of.
2. **A round**: health, sanity, and a state machine that is won or lost once.
3. **The journal**: what the hunter has met and done.
4. **What is drawn.**
5. **The game.**

## Step 1: Levels, scores and a look

The numbers of the rounds are one table (`ROUNDS`): the health and sanity a round begins with; **what each kind takes** from your health when it gets to you, and how much of that is also fright (a mummy takes more than a spider, and a thing that jumps out at the edge of the screen a little); **what happens to sanity every second** (the dark takes it, dread takes more, a ghost that is near and watched takes a little more; light in a quiet moment gives some back; a capture gives a lot); **how a round is scored**; and **what each round is like** (`levels`).

Three plain functions come out of it:

- `levelFor(number)`: how many ghosts to find, and how hard the hunt is (the director's intensity). The first is gentle, each is harder, and after the last of the table it stays as hard as that: a table of five is not a game of five rounds.
- `roundScore`: the captures, what is left of health and of sanity, and a bonus for being quick (a second under the par is worth something, and a slower round has no bonus and no penalty).
- `sanityLook`: how wrong the picture should look at a sanity, from nothing above the level where tricks begin, to worse and worse as it falls. It gives numbers, not pixels; the page decides what a vignette is.

Open `js/rounds.js` (the placeholder) and **replace the TODO line** with:

```js
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

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ROUNDS, levelFor, roundScore, sanityLook };
} else {
  Object.assign(window, { ROUNDS, levelFor, roundScore, sanityLook });
}
```

Things to notice:

- **Every number is in the table** and the tests read them from it (`ROUNDS.damage.mummy`, `ROUNDS.score.perSecond`), so a change of balance is a change of a number, and the tests still say what they meant.
- **A score is a set of choices**: a score that rewards health left rewards playing carefully; one that rewards time rewards rushing. Both are in it, so neither is the whole of the strategy.

### Tests

Open `tests/rounds.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("levelFor and roundScore", () => {
  QUnit.test("the first round is gentle, each is harder, and after the last it stays as hard as the last", (assert) => {
    assert.strictEqual(levelFor(1).ghosts, 1);
    for (let n = 2; n <= ROUNDS.levels.length; n++) assert.true(levelFor(n).intensity >= levelFor(n - 1).intensity && levelFor(n).ghosts >= levelFor(n - 1).ghosts, `round ${n}`);
    assert.deepEqual(levelFor(99), levelFor(ROUNDS.levels.length));
    assert.deepEqual(levelFor(0), levelFor(1), "a round before the first is the first");
  });

  QUnit.test("a score is the captures, what is left, and a bonus for being quick, and never less for a better round", (assert) => {
    const slow = roundScore({ captured: 1, health: 50, sanity: 40, time: 400 });
    assert.strictEqual(slow, ROUNDS.score.capture + 50 * ROUNDS.score.perHealth + 40 * ROUNDS.score.perSanity, "slower than par has no bonus, and no penalty");
    const quick = roundScore({ captured: 1, health: 50, sanity: 40, time: ROUNDS.score.parSeconds - 60 });
    assert.strictEqual(quick - slow, Math.round(60 * ROUNDS.score.perSecond));
    assert.true(roundScore({ captured: 2, health: 80, sanity: 80, time: 100 }) > roundScore({ captured: 2, health: 30, sanity: 80, time: 100 }));
    assert.true(roundScore({ captured: 1, health: -20, sanity: 10, time: 10 }) > 0, "health under nothing is nothing");
  });

  QUnit.test("the screen is right above the sanity where tricks begin, and gets worse as it falls", (assert) => {
    const calm = sanityLook(ROUNDS.trick.below + 1);
    assert.deepEqual(calm, { vignette: 0, jitter: 0, tilt: 0, hue: 0 });
    const half = sanityLook(ROUNDS.trick.below / 2);
    const none = sanityLook(0);
    assert.true(half.vignette > 0 && none.vignette > half.vignette && none.jitter > half.jitter);
    assert.strictEqual(none.vignette, 1);
  });
});
```

Open `tests.html`. You should see **472 passing tests**: 3 more.

## Step 2: A round

A round is a **state machine**: `ready`, `hunting`, then `won` or `lost`. It keeps health, sanity, time and what has been captured, and says what happens as **events** that whoever is listening empties out (`hurt`, `trick`, `won`, `lost`): the same shape as the creatures' events.

- **`hurt(kind)`** takes the kind's damage from health, and some of it (`fright`) from sanity. A kind that is not in the table takes ten.
- **`update(seconds, situation)`** is where the two meters pull against each other. The situation is whether the light is on, how near the nearest creature is (the dread), and how many ghosts that are near are being looked at. The dark takes sanity; dread takes more; light restores it only if it is *quiet* (a light does not help with something right there); and a ghost that is watched takes a little. So a player who keeps the light on is safe from the dark and spends the battery, and one who keeps it off keeps the battery and loses their mind.
- **Tricks.** Below a level of sanity the round plays tricks: it says a thing is heard that is not there, more often the lower sanity is. The random numbers are *given* to the round, so a test can run six hundred frames at ten sanity and at forty-five and say that there are more at ten.
- **`capture()`** gives sanity back, and the last ghost wins the round and makes the score, **once**.
- **Won or lost exactly once.** `_check` runs after anything that can lose the round; the first loss sets the state and the reason, and a round that is not hunting hears of nothing more.

In `js/rounds.js`, find the export block (lines 51 to 58) and **delete it**. Add this in its place, and the export block under it:

```js
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
```

### Tests

Open `tests/round.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("a round", () => {
  const hunting = (number = 1, random = () => 0.99) => {
    const round = new Round(number, random);
    round.start();
    return round;
  };

  QUnit.test("it is ready, and begins when it is started, once", (assert) => {
    const round = new Round(1);
    assert.strictEqual(round.state, "ready");
    assert.false(round.running);
    assert.true(round.start());
    assert.true(round.running);
    assert.false(round.start());
  });

  QUnit.test("nothing happens to a round that is not running", (assert) => {
    const round = new Round(1);
    round.update(10, { dread: 1 });
    assert.strictEqual(round.sanity, ROUNDS.sanity);
    assert.strictEqual(round.hurt("ghoul"), 0);
    assert.false(round.capture());
  });

  QUnit.test("each kind takes its own from health and some of it from sanity", (assert) => {
    const round = hunting();
    assert.strictEqual(round.hurt("mummy"), ROUNDS.damage.mummy);
    assert.strictEqual(round.health, ROUNDS.health - ROUNDS.damage.mummy);
    assert.strictEqual(round.sanity, ROUNDS.sanity - ROUNDS.damage.mummy * ROUNDS.fright);
    assert.true(ROUNDS.damage.mummy > ROUNDS.damage.spider, "a mummy is worse than a spider");
    assert.strictEqual(round.hurt("a thing nobody thought of"), 10, "an unknown kind takes a ten");
  });

  QUnit.test("health at nothing loses the round, once, with the reason", (assert) => {
    const round = hunting();
    for (let i = 0; i < 6; i++) round.hurt("mummy");
    assert.strictEqual(round.state, "lost");
    assert.strictEqual(round.reason, "health");
    const lost = round.take().filter((e) => e.kind === "lost");
    assert.strictEqual(lost.length, 1);
    round.hurt("mummy");
    assert.strictEqual(round.take().length, 0, "a lost round hears of nothing more");
  });

  QUnit.test("the dark takes sanity, dread takes more, light in a quiet moment gives it back", (assert) => {
    const after = (situation, from = 60) => {
      const round = hunting();
      round.sanity = from;
      round.update(2, situation);
      return round.sanity;
    };
    assert.true(after({ lightOn: false }) < 60);
    assert.true(after({ lightOn: false, dread: 1 }) < after({ lightOn: false, dread: 0 }));
    assert.true(after({ lightOn: true, dread: 0 }) > 60, "light and quiet restore it");
    assert.true(after({ lightOn: true, dread: 0.8 }) < 60, "light is no comfort with something right there");
    assert.true(after({ lightOn: false, watched: 2 }) < after({ lightOn: false, watched: 0 }));
    assert.true(after({ lightOn: true, dread: 0 }, 99.5) <= ROUNDS.sanity, "never over the most");
  });

  QUnit.test("sanity at nothing loses the round too", (assert) => {
    const round = hunting();
    round.sanity = 0.2;
    round.update(1, { lightOn: false, dread: 1 });
    assert.strictEqual(round.state, "lost");
    assert.strictEqual(round.reason, "sanity");
  });

  QUnit.test("a capture gives sanity back, and the last ghost wins the round, with a score, once", (assert) => {
    const round = hunting(3); // two ghosts
    assert.strictEqual(round.ghosts, 2);
    round.sanity = 40;
    assert.true(round.capture());
    assert.strictEqual(round.sanity, 40 + ROUNDS.restore.capture);
    assert.strictEqual(round.state, "hunting");
    round.update(30, { lightOn: true });
    round.capture();
    assert.strictEqual(round.state, "won");
    assert.true(round.score > 2 * ROUNDS.score.capture);
    assert.strictEqual(round.take().filter((e) => e.kind === "won").length, 1);
    assert.false(round.capture(), "a won round takes no more");
  });

  QUnit.test("tricks come when sanity is low and not when it is high, and more often the lower it is", (assert) => {
    const tricks = (sanity) => {
      let n = 0;
      const round = hunting(1, () => (n++ % 100) / 100 + 0.005);
      for (let i = 0; i < 600; i++) {
        round.sanity = sanity;
        round.update(1 / 30, { lightOn: true, dread: 0 });
      }
      return round.take().filter((e) => e.kind === "trick").length;
    };
    assert.strictEqual(tricks(90), 0);
    assert.true(tricks(10) > tricks(45), `${tricks(10)} at 10 and ${tricks(45)} at 45`);
    assert.true(ROUNDS.trick.kinds.length > 0);
  });

  QUnit.test("the result says how it went", (assert) => {
    const round = hunting();
    round.update(20, { lightOn: true });
    round.capture();
    const result = round.result();
    assert.strictEqual(result.outcome, "won");
    assert.strictEqual(result.captured, 1);
    assert.strictEqual(result.number, 1);
    assert.true(Math.abs(result.time - 20) < 1e-9);
    assert.true(result.score > 0);
  });
});
```

Open `tests.html`. You should see **481 passing tests**: 9 more.

## Step 3: The journal

A journal is what the hunter has done, and it is kept between visits: for each kind of thing (the ghosts, and every creature) how many have been **met** and how many **dealt with**; how many rounds were played and won; the best round reached; and the five best scores.

It is kept in the browser (`localStorage`), and a browser may refuse it (a private window, a full disk) and a person may edit what it keeps. So, as in every part of this series that keeps something:

- **Every use of storage is allowed to fail,** and the game goes on with a journal for this visit.
- **What is read back is checked** (`cleanJournal`): only the kinds there are, whole numbers from nothing up, none dealt with that were not met, a list of at most five scores with the best first.
- **The storage is given to the journal,** so a test can give it one that throws.

`noteMet` says whether it was the first of its kind ever met (the game says so: "A new page in the journal"), and `noteRound` says whether a score is a new best.

Open `js/journal.js` (the placeholder) and **replace the TODO line** with:

```js
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
```

### Tests

Open `tests/journal.tests.js` (the placeholder) and **replace the TODO line** with:

```js
const journalStore = (start = {}, { refuse = false } = {}) => {
  const kept = { ...start };
  return {
    kept,
    getItem(key) {
      if (refuse) throw new Error("no storage");
      return key in kept ? kept[key] : null;
    },
    setItem(key, value) {
      if (refuse) throw new Error("no storage");
      kept[key] = String(value);
    },
    removeItem(key) {
      delete kept[key];
    },
  };
};

QUnit.module("cleanJournal", () => {
  QUnit.test("nothing kept is an empty journal with every kind in it", (assert) => {
    const clean = cleanJournal(null);
    assert.deepEqual(Object.keys(clean.entries), JOURNAL.kinds);
    assert.deepEqual([clean.played, clean.won, clean.best, clean.scores.length], [0, 0, 0, 0]);
  });

  QUnit.test("only whole numbers from nothing up are believed, none can have been dealt with that were not met, and kinds that are not there are dropped", (assert) => {
    const clean = cleanJournal({ entries: { ghost: { met: 3.7, dealt: -2 }, mummy: { met: 1, dealt: 5 }, dragon: { met: 9, dealt: 9 }, doll: { met: "many" } }, played: "x", won: 2, best: 4 });
    assert.deepEqual(clean.entries.ghost, { met: 3, dealt: 0 });
    assert.deepEqual(clean.entries.mummy, { met: 5, dealt: 5 });
    assert.strictEqual(clean.entries.dragon, undefined);
    assert.deepEqual(clean.entries.doll, { met: 0, dealt: 0 });
    assert.deepEqual([clean.played, clean.won, clean.best], [0, 2, 4]);
  });

  QUnit.test("the scores are numbers over nothing, the best first, and no more than are kept", (assert) => {
    const clean = cleanJournal({ scores: [50, "x", 900, -4, 300, 20, 10, 700, 5] });
    assert.deepEqual(clean.scores, [900, 700, 300, 50, 20]);
    assert.strictEqual(clean.scores.length, JOURNAL.top);
  });
});

QUnit.module("Journal", () => {
  QUnit.test("what was kept is what is read back, and the first of a kind is told", (assert) => {
    const store = journalStore();
    const first = new Journal(store);
    assert.true(first.noteMet("ghost"), "the first ghost ever");
    assert.false(first.noteMet("ghost"));
    first.noteDealt("ghost");
    first.noteMet("spider");
    const second = new Journal(store);
    assert.deepEqual(second.entries.ghost, { met: 2, dealt: 1 });
    assert.strictEqual(second.entries.spider.met, 1);
  });

  QUnit.test("a kind that is not in the journal is ignored", (assert) => {
    const journal = new Journal(journalStore());
    assert.false(journal.noteMet("dragon"));
    journal.noteDealt("dragon");
    assert.strictEqual(journal.entries.dragon, undefined);
  });

  QUnit.test("storage that refuses is allowed to, and nonsense is not believed", (assert) => {
    const journal = new Journal(journalStore({}, { refuse: true }));
    assert.false(journal.save());
    journal.noteMet("ghost");
    assert.strictEqual(journal.entries.ghost.met, 1, "it still counts, for this visit");
    assert.strictEqual(new Journal(journalStore({ [JOURNAL.key]: "{no json" })).played, 0);
  });

  QUnit.test("a won round makes the scores, a new best says so, and the best round reached is kept", (assert) => {
    const journal = new Journal(journalStore());
    assert.true(journal.noteRound({ number: 1, outcome: "won", score: 300 }), "the first is the best");
    assert.false(journal.noteRound({ number: 2, outcome: "won", score: 200 }));
    assert.true(journal.noteRound({ number: 3, outcome: "won", score: 450 }));
    assert.deepEqual(journal.scores, [450, 300, 200]);
    assert.strictEqual(journal.best, 3);
    assert.deepEqual([journal.played, journal.won], [3, 3]);
  });

  QUnit.test("a lost round counts as played, makes no score, and the best reached is the round before it", (assert) => {
    const journal = new Journal(journalStore());
    journal.noteRound({ number: 1, outcome: "won", score: 100 });
    journal.noteRound({ number: 2, outcome: "lost", reason: "health", score: 0 });
    journal.noteRound({ number: 4, outcome: "lost", reason: "sanity", score: 0 });
    assert.deepEqual([journal.played, journal.won, journal.best], [3, 1, 3]);
    assert.deepEqual(journal.scores, [100]);
  });

  QUnit.test("the pages are the kinds that have been met, in order, and clearing empties them", (assert) => {
    const journal = new Journal(journalStore());
    journal.noteMet("mummy");
    journal.noteMet("ghost");
    journal.noteDealt("ghost");
    assert.deepEqual(journal.pages().map((p) => p.kind), ["ghost", "mummy"]);
    assert.deepEqual(journal.pages()[0], { kind: "ghost", met: 1, dealt: 1 });
    journal.clear();
    assert.deepEqual(journal.pages(), []);
    assert.strictEqual(journal.played, 0);
  });

  QUnit.test("the page's storage is used when it works, and a stand-in when it does not", (assert) => {
    const real = journalStore();
    assert.strictEqual(journalStorage({ localStorage: real }), real);
    const stand = journalStorage({ localStorage: { setItem() { throw new Error("full"); }, removeItem() {}, getItem() { return null; } } });
    stand.setItem("a", "1");
    assert.strictEqual(stand.getItem("a"), "1");
    assert.strictEqual(journalStorage(null).getItem("none"), null);
  });
});
```

Open `tests.html`. You should see **491 passing tests**: 10 more.

## Step 4: What is drawn

`RoundsUi` is two bars (health in red, sanity in blue-green, each pulsing when it is low) with the number of the round and how many ghosts have been captured, a screen for the end of a round, and a layer for the picture going wrong. The words are made by plain functions, so a test can say what a round lost to the dark says (`endText`, `journalLines`, `formatClock`).

What the loss of sanity does to the picture is a few numbers from `sanityLook`: a dark red edge that closes in, the colours turned a little, a slight tilt. They are put on the page as style variables, and a class on the body (`unwell`) is what lets the stylesheet apply them, so a player who is fine has no filter on the picture at all (a filter costs a phone something).

Open `js/roundsui.js` (the placeholder) and **replace the TODO line** with:

```js
// What the player sees of the rounds: two bars (health and sanity) with the number of the round and how many ghosts are left to find, a screen at the end of a round (what
// happened, the score, the pages of the journal, the best scores, and what to do next), and what the loss of sanity does to the picture. The words are made by plain
// functions (so a test can say what a round that was lost to the dark says), and the screens are built from the page's own elements, given the `document`. See ../tests/roundsui.tests.js
// and ../css/rounds.css. (It uses sanityLook from rounds.js.)

// Seconds as minutes and seconds: 125 is "2:05".
function formatClock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const rest = whole % 60;
  return `${Math.floor(whole / 60)}:${rest < 10 ? "0" : ""}${rest}`;
}

const KIND_NAMES = { ghost: "Ghost", spider: "Spider", ghoul: "Ghoul", skeleton: "Skeleton", mummy: "Mummy", ghoul_girl: "Ghoul girl", doll: "Doll" };

// What a round that is over says: { title, lines }.
function endText(result, record = false) {
  const clock = formatClock(result.time);
  if (result.outcome === "won") {
    return { title: `Round ${result.number} clear`, lines: [`${result.captured} of ${result.ghosts} captured in ${clock}`, `Score ${result.score}${record ? " (a new best!)" : ""}`, `Health ${Math.round(result.health)}, sanity ${result.sanity}`] };
  }
  const why = result.reason === "sanity" ? "The dark got to you." : "Something got to you.";
  return { title: result.reason === "sanity" ? "You lost your mind" : "You did not get out", lines: [why, `${result.captured} of ${result.ghosts} captured, ${clock} in`, "The room is still full."] };
}

// The pages of the journal as lines: "Ghost: met 3, dealt with 2".
function journalLines(journal) {
  const pages = journal.pages();
  if (pages.length === 0) return ["Nothing in the journal yet."];
  return pages.map((page) => `${KIND_NAMES[page.kind] || page.kind}: met ${page.met}, dealt with ${page.dealt}`);
}

class RoundsUi {
  // `doc` is the page; `handlers` is { onNext(), onAgain(), onQuit() }.
  constructor(doc, { onNext = () => {}, onAgain = () => {}, onQuit = () => {} } = {}) {
    this.doc = doc;
    const make = (tag, className, parent, text = "") => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };
    this.root = make("div", "round-hud", doc.body);
    this.label = make("div", "round-label", this.root, "Round 1");
    const bars = make("div", "round-bars", this.root);
    this.healthBar = make("div", "round-bar health", bars);
    this.healthFill = make("i", "round-fill", this.healthBar);
    this.sanityBar = make("div", "round-bar sanity", bars);
    this.sanityFill = make("i", "round-fill", this.sanityBar);

    this.screen = make("div", "round-screen hidden", doc.body);
    this.title = make("h2", "round-title", this.screen);
    this.lines = make("div", "round-lines", this.screen);
    this.journal = make("div", "round-journal", this.screen);
    this.scores = make("div", "round-scores", this.screen);
    const buttons = make("div", "round-buttons", this.screen);
    this.next = make("button", "round-button primary", buttons, "Next round");
    this.again = make("button", "round-button", buttons, "Try this round again");
    this.quit = make("button", "round-button", buttons, "Leave");
    for (const button of [this.next, this.again, this.quit]) button.type = "button";
    this.next.addEventListener("click", () => onNext());
    this.again.addEventListener("click", () => onAgain());
    this.quit.addEventListener("click", () => onQuit());

    this.insane = make("div", "insane", doc.body); // the picture going wrong
  }

  // Shows how the round is going: the bars and the words over them. `round` is a Round.
  apply(round) {
    this.label.textContent = `Round ${round.number} · ${round.captured} of ${round.ghosts} ghosts`;
    this.healthFill.style.width = `${Math.round((round.health / ROUNDS.health) * 100)}%`;
    this.sanityFill.style.width = `${Math.round((round.sanity / ROUNDS.sanity) * 100)}%`;
    this.healthBar.classList.toggle("low", round.health < ROUNDS.health * 0.3);
    this.sanityBar.classList.toggle("low", round.sanity < ROUNDS.trick.below * 0.6);
    const look = sanityLook(round.sanity);
    const root = this.doc.documentElement.style;
    root.setProperty("--insane", look.vignette.toFixed(3));
    root.setProperty("--insane-hue", `${look.hue.toFixed(1)}deg`);
    root.setProperty("--insane-tilt", `${look.tilt.toFixed(2)}deg`);
    this.insane.style.opacity = (look.vignette * 0.85).toFixed(3);
    this.doc.body.classList.toggle("unwell", look.vignette > 0);
  }

  // The screen at the end of a round: `journal` is a Journal, `record` says whether the score is a new best, and `canContinue` whether there is a next round (only after a win).
  showEnd(result, journal, record = false, canContinue = result.outcome === "won") {
    const text = endText(result, record);
    this.title.textContent = text.title;
    this.screen.classList.toggle("won", result.outcome === "won");
    this.lines.textContent = "";
    for (const line of text.lines) this._line(this.lines, line);
    this.journal.textContent = "";
    this._line(this.journal, "The journal", "round-heading");
    for (const line of journalLines(journal)) this._line(this.journal, line);
    this.scores.textContent = "";
    this._line(this.scores, "The best scores", "round-heading");
    if (journal.scores.length === 0) this._line(this.scores, "None yet.");
    journal.scores.forEach((score, i) => this._line(this.scores, `${i + 1}. ${score}`));
    this.next.classList.toggle("hidden", !canContinue);
    this.screen.classList.remove("hidden");
  }

  _line(parent, text, className = "round-line") {
    const line = this.doc.createElement("p");
    line.className = className;
    line.textContent = text;
    parent.appendChild(line);
  }

  hideEnd() {
    this.screen.classList.add("hidden");
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatClock, KIND_NAMES, endText, journalLines, RoundsUi };
} else {
  Object.assign(window, { formatClock, KIND_NAMES, endText, journalLines, RoundsUi });
}
```

And the stylesheet. Open `css/rounds.css` (the placeholder) and **replace the TODO line** with:

```css
/* The rounds (see roundsui.js): the bars of health and sanity at the top left, the screen at the end of a round, and the picture going wrong as sanity goes. */
.round-hud {
  position: fixed;
  top: 52px;
  left: 10px;
  z-index: 8;
  width: 170px;
  pointer-events: none;
  color: var(--bone);
  font-family: var(--small-font);
}
body:has(#start:not(.hidden)) .round-hud {
  visibility: hidden;
}
.round-label {
  margin-bottom: 4px;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.8);
}
.round-bar {
  height: 9px;
  margin-bottom: 4px;
  border: 1px solid rgba(242, 243, 238, 0.5);
  background: rgba(5, 8, 13, 0.6);
}
.round-fill {
  display: block;
  height: 100%;
  width: 100%;
}
.round-bar.health .round-fill {
  background: var(--blood);
}
.round-bar.sanity .round-fill {
  background: var(--ecto);
}
.round-bar.low {
  animation: round-pulse 0.9s ease-in-out infinite;
}
@keyframes round-pulse {
  50% {
    border-color: var(--blood);
    box-shadow: 0 0 8px var(--blood);
  }
}
.round-screen {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  background: rgba(5, 8, 13, 0.9);
  color: var(--bone);
  font-family: var(--small-font);
  text-align: center;
}
.round-screen.hidden,
.round-button.hidden {
  display: none;
}
.round-title {
  margin: 0;
  font: 44px / 1.1 var(--title-font);
  color: var(--blood);
}
.round-screen.won .round-title {
  color: var(--ghost);
}
.round-line {
  margin: 2px 0;
  font-size: 17px;
}
.round-heading {
  margin: 10px 0 2px;
  font-size: 15px;
  letter-spacing: 0.14em;
  color: var(--ecto);
}
.round-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 12px;
}
.round-button {
  padding: 10px 20px;
  border: 2px solid var(--bone);
  background: rgba(5, 8, 13, 0.7);
  color: var(--bone);
  font: 17px var(--small-font);
  letter-spacing: 0.08em;
}
.round-button.primary {
  border-color: var(--ghost);
  color: var(--ghost);
}
/* What losing sanity does: a dark red edge, the picture a little off its colours and its level, and a slow sway of it. */
.insane {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0) 35%, rgba(60, 0, 8, 0.85));
}
body.unwell #stage,
body.unwell #renderCanvas {
  filter: hue-rotate(var(--insane-hue, 0deg));
  transform: rotate(var(--insane-tilt, 0deg));
}
@media (max-width: 640px) {
  .round-hud {
    top: 150px;
  }
}
```

### Tests

Open `tests/roundsui.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the words of the rounds", () => {
  QUnit.test("a time is minutes and seconds", (assert) => {
    assert.strictEqual(formatClock(0), "0:00");
    assert.strictEqual(formatClock(125.9), "2:05");
    assert.strictEqual(formatClock(-3), "0:00");
  });

  QUnit.test("a round that was won says how it went, and a new best says so", (assert) => {
    const result = { number: 2, outcome: "won", captured: 2, ghosts: 2, health: 71, sanity: 40, time: 98, score: 555 };
    const text = endText(result, true);
    assert.strictEqual(text.title, "Round 2 clear");
    assert.true(text.lines[0].includes("2 of 2") && text.lines[0].includes("1:38"));
    assert.true(text.lines[1].includes("555") && text.lines[1].includes("new best"));
    assert.false(endText(result, false).lines[1].includes("new best"));
  });

  QUnit.test("a round lost to health and one lost to sanity say different things", (assert) => {
    const base = { number: 1, outcome: "lost", captured: 0, ghosts: 1, health: 0, sanity: 30, time: 50, score: 0 };
    const hurt = endText({ ...base, reason: "health" });
    const mad = endText({ ...base, reason: "sanity" });
    assert.notStrictEqual(hurt.title, mad.title);
    assert.true(mad.lines[0].includes("dark"));
  });

  QUnit.test("the journal's pages are lines, and an empty journal says so", (assert) => {
    const journal = new Journal(journalStore());
    assert.deepEqual(journalLines(journal), ["Nothing in the journal yet."]);
    journal.noteMet("ghoul_girl");
    journal.noteDealt("ghoul_girl");
    assert.deepEqual(journalLines(journal), ["Ghoul girl: met 1, dealt with 1"]);
  });
});

QUnit.module("RoundsUi", () => {
  const make = (handlers = {}) => {
    const ui = new RoundsUi(document, handlers);
    return { ui, gone: () => { ui.root.remove(); ui.screen.remove(); ui.insane.remove(); document.body.classList.remove("unwell"); document.documentElement.style.removeProperty("--insane"); } };
  };

  QUnit.test("the bars show health and sanity as parts of the most, with the round and its ghosts", (assert) => {
    const { ui, gone } = make();
    const round = new Round(3);
    round.start();
    round.health = 40;
    round.sanity = 80;
    ui.apply(round);
    assert.strictEqual(ui.healthFill.style.width, "40%");
    assert.strictEqual(ui.sanityFill.style.width, "80%");
    assert.true(ui.label.textContent.includes("Round 3") && ui.label.textContent.includes("0 of 2"));
    assert.false(ui.healthBar.classList.contains("low"));
    round.health = 20;
    ui.apply(round);
    assert.true(ui.healthBar.classList.contains("low"));
    gone();
  });

  QUnit.test("the picture goes wrong only when sanity is low", (assert) => {
    const { ui, gone } = make();
    const round = new Round(1);
    round.start();
    ui.apply(round);
    assert.false(document.body.classList.contains("unwell"));
    assert.strictEqual(Number(ui.insane.style.opacity), 0);
    round.sanity = 5;
    ui.apply(round);
    assert.true(document.body.classList.contains("unwell"));
    assert.true(Number(ui.insane.style.opacity) > 0.5);
    gone();
  });

  QUnit.test("the end screen has the words, the journal and the scores, and the buttons say what was pressed", (assert) => {
    const pressed = [];
    const { ui, gone } = make({ onNext: () => pressed.push("next"), onAgain: () => pressed.push("again"), onQuit: () => pressed.push("quit") });
    const journal = new Journal(journalStore());
    journal.noteRound({ number: 1, outcome: "won", score: 300 });
    ui.showEnd({ number: 1, outcome: "won", captured: 1, ghosts: 1, health: 90, sanity: 70, time: 80, score: 300 }, journal, true);
    assert.false(ui.screen.classList.contains("hidden"));
    assert.true(ui.screen.classList.contains("won"));
    assert.strictEqual(ui.title.textContent, "Round 1 clear");
    assert.true(ui.scores.textContent.includes("1. 300"));
    assert.false(ui.next.classList.contains("hidden"));
    ui.next.click();
    ui.again.click();
    ui.quit.click();
    assert.deepEqual(pressed, ["next", "again", "quit"]);
    ui.showEnd({ number: 1, outcome: "lost", reason: "health", captured: 0, ghosts: 1, health: 0, sanity: 50, time: 20, score: 0 }, journal);
    assert.true(ui.next.classList.contains("hidden"), "there is no next round after a loss");
    assert.false(ui.screen.classList.contains("won"));
    ui.hideEnd();
    assert.true(ui.screen.classList.contains("hidden"));
    gone();
  });
});
```

Open `tests.html`. You should see **498 passing tests**: 7 more.

## Step 5: The game

`main.js` makes a round of the hunt, in these parts:

- **A ghost can be given a life.** The ghosts the player has called by tapping the floor go of themselves after a while; the ghosts a round hides must stay until they are found. `summon` takes a `life` (and a test says that the ordinary one goes and the other stays).
- **What touches you is the round's business**: a creature that gets to the player, or a pop at the edge of the screen, hurts it; a ghost or creature dealt with is a line in the journal; and the first of a kind ever met is a page.
- **A round begins** when the game does (and when the player says so on the screen at the end): the creatures are cleared, the director is told how hard this round is and given a rest, the ghosts are hidden round the room (spread out, so that they are not all behind you), and the round is started.
- **A round is won by the ghosts it hid:** one the player called by tapping does not count.
- **A round ends** when it is won or lost: the room goes still, the screen comes up, and the journal is told.

**Ghosts can stay:**

In `js/ghost.js`, **replace** lines 175 to 177:

```js
  // A ghost to haunt a place. When there are too many the oldest is sent away, and there is a new one anyway.
  summon(home, { placement = null, delay = this.table.summonDelay } = {}) {
    const ghost = new Apparition({ id: this.nextId++, home, placement, delay, table: this.table });
```

with:

```js
  // A ghost to haunt a place. When there are too many the oldest is sent away, and there is a new one anyway. `life` is how many seconds it stays (the table's, if it is left
  // out): the ghosts that a round hides stay until they are found.
  summon(home, { placement = null, delay = this.table.summonDelay, life = null } = {}) {
    const ghost = new Apparition({ id: this.nextId++, home, placement, delay, table: life === null ? this.table : { ...this.table, life } });
```

In `tests/ghost.tests.js`, after line 329, add:

```js

QUnit.module("a ghost that stays", () => {
  QUnit.test("a ghost of the table's life goes of itself, and one that was given a long life stays", (assert) => {
    const haunting = new Haunting();
    const goes = haunting.summon([0, 0, 5], { delay: 0 });
    const stays = haunting.summon([0, 0, -5], { delay: 0, life: 1e9 });
    for (let t = 0; t < GHOST.life + GHOST.fadeOut + 5; t += 0.5) haunting.update(0.5, { position: [0, 1.4, 0], forward: [0, 0, 1] }, 30);
    assert.true(goes.done, "the ordinary one has gone");
    assert.false(stays.done, "the other is still there");
    assert.strictEqual(stays.stage, "present");
  });
});
```

**The journal hears what the game sees:**

In `js/main.js`, after line 67, add:

```js
    journal.noteMet("ghost");
```

In `js/main.js`, after line 104, add:

```js
    if (journal.noteMet(item.kind)) notice.textContent = `A new page in the journal: ${KIND_NAMES[item.kind] || item.kind}.`;
```

In `js/main.js`, after line 113, add:

```js
    if (type === "touch") round.hurt(item.kind); // what gets to the player takes its share of the round's health and sanity
    if (type === "pop") round.hurt("pop");
    if (type === "died" || type === "captured") journal.noteDealt(item.kind);
```

In `js/main.js`, after line 349, add:

```js
      journal.noteDealt(target.kind);
      if (target.ghost && target.ghost.target) round.capture(); // only the ghosts that the round hid count towards it
```

**The rounds themselves:** the ghost that is hidden (with a life, and for the round), the rounds' state, how one begins, what is heard when sanity is low, how one ends, and what happens each frame:

In `js/main.js`, **replace** lines 389 to 393:

```js
// A ghost hidden in the room, behind and to the sides, for a gadget to find (the rounds of a later step do this by themselves).
function hideGhost() {
  const bearing = 100 + Math.random() * 160;
  haunting.summon(pointAt(player, bearing, 4 + Math.random() * 3), { delay: 0.2 });
}
```

with:

```js
// A ghost hidden in the room, behind and to the sides, for a gadget to find. `life` is how long it stays, `index` and `count` spread the ghosts of a round round the room.
function hideGhost(life = null, index = 0, count = 1) {
  const bearing = 100 + ((index + Math.random()) / count) * 160;
  const ghost = haunting.summon(pointAt(player, bearing, 4 + Math.random() * 3), { delay: 0.2, life });
  ghost.target = life !== null; // a ghost of a round is one that the round is waiting for
  return ghost;
}

// The rounds (see rounds.js): a round is a room to clear. The ghosts are hidden, the gadgets find them, the beam captures them, and health and sanity run down while what
// else is in the room tries to get at you. `journal` is what the hunter has met and done, kept between visits (journal.js).
const journal = new Journal();
let round = new Round(1);
let roundNumber = 1;
const roundsUi = new RoundsUi(document, {
  onNext: () => beginRound(roundNumber + 1),
  onAgain: () => beginRound(roundNumber),
  onQuit: () => location.reload(),
});

function beginRound(number) {
  roundNumber = number;
  roundsUi.hideEnd();
  creatures.clear();
  haunting.banish();
  detectors.radar.clear();
  round = new Round(number);
  HUNT.intensity = round.level.intensity; // each round is harder
  director.tension = 0;
  director.resting = HUNT.cooldown;
  for (let i = 0; i < round.ghosts; i++) hideGhost(ROUNDS.ghostLife, i, round.ghosts);
  playing = true;
  creaturesActive = true;
  round.start();
  notice.textContent = `Round ${number}: ${round.ghosts === 1 ? "a ghost is" : `${round.ghosts} ghosts are`} hidden in the room. Find ${round.ghosts === 1 ? "it" : "them"} with the gadgets (E), and hold the beam on ${round.ghosts === 1 ? "it" : "them"}.`;
}

// What the loss of sanity does that is heard and not seen: a sound from where nothing is.
function trick(kind) {
  const spot = pointAt(player, Math.random() * 360, 3 + Math.random() * 4);
  audio.cue(kind === "step" ? "thud" : kind === "breath" ? "whisper" : kind, spot, 0.6);
}

function endRound() {
  playing = false; // nothing new turns up, and the room is still
  creaturesActive = false;
  const result = round.result();
  const record = journal.noteRound(result);
  roundsUi.showEnd(result, journal, record);
}

systems.push((seconds, player) => {
  const watched = haunting.items.filter((ghost) => ghost.stage === "present" && ghost.watched && ghost.near > 0.2).length;
  if (playing) round.update(seconds, { lightOn: tools.lightOn, dread, watched });
  for (const event of round.take()) {
    if (event.kind === "trick") trick(event.trick);
    if (event.kind === "won" || event.kind === "lost") endRound();
  }
  roundsUi.apply(round);
});
```

**The first round begins with the game:**

In `js/main.js`, after line 763, add:

```js
  beginRound(1); // the first round begins with the game
```

**The developer panel** has a section for the rounds:

In `js/main.js`, **replace** line 839:

```js
        title: "Scares",
```

with:

```js
        title: "Gadgets",
```

In `js/main.js`, after line 858, add:

```js
        ],
      },
      {
        title: "Rounds",
        rows: [
          readout("round", () => `${round.number}, ${round.state}${round.reason ? ` (${round.reason})` : ""}`),
          readout("health", () => String(Math.round(round.health))),
          readout("sanity", () => String(Math.round(round.sanity))),
          readout("captured", () => `${round.captured} of ${round.ghosts}`),
          readout("time", () => formatClock(round.time)),
          readout("journal", () => `${journal.played} rounds, ${journal.won} won, best ${journal.best}`),
          action("Hurt me (a mummy)", () => round.hurt("mummy")),
          action("Drain sanity to 20", () => { round.sanity = 20; }),
          action("Capture the hidden ghosts", () => { for (const ghost of haunting.items) if (ghost.target && haunting.capture(ghost.id)) round.capture(); }),
          action("Next round", () => beginRound(roundNumber + 1)),
          action("This round again", () => beginRound(roundNumber)),
          action("Clear the journal", () => journal.clear()),
        ],
      },
      {
        title: "Scares",
        rows: [
```

In `js/main.js`, **replace** line 1013:

```js
  window.dev = { detectors, scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music, tools }; // for poking at from the console
```

with:

```js
  window.dev = { journal, get round() { return round; }, beginRound, detectors, scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music, tools }; // for poking at from the console
```

### Try it

Open `index.html?dev`. You should see:

- press the button: **Round 1**: the notice says that a ghost is hidden in the room; the bars at the top left are full
- find it with the gadgets (**E**: the meter, the radar, the box and thermal vision) and hold the beam on it: **the round is won**, and the screen says the score, shows the journal and the best scores
- **Next round**: more ghosts, and what comes for you comes more often
- keep the light off, or let something touch you: the bars fall; the picture goes red at the edges and strange, and things are heard that are not there; at nothing, **the round is lost**
- in the developer panel, **Rounds** has buttons to hurt yourself, drain your sanity, win, and go on

### Tests

Open `tests.html`. You should see **499 passing tests**: 1 more (one: a ghost that stays; the rest of the game is not what the tests are about).

## Stretch goals

- **Healing between rounds,** and a shop that spends the score on a better battery or a longer beam.
- **Difficulty settings** that change the table's damage and drain.
- **A ghost with its own kind of behaviour** for each round (one that hides in the dark, one that goes when it is looked at).
- **Daily rounds:** the same hidden ghosts for everyone on a day, from a seed.

## What you've learned

- How to make a game out of rules that are numbers in a table, and test a game of dread without playing it
- How two meters that pull against each other make a choice (the light costs a battery and keeps your mind)
- How a state machine is won or lost exactly once, and says so with events
- How to keep a journal that survives a refusing browser and a person's editing
- How a score rewards the way a round was played

The last step is the polish that makes it a game that can be given to someone: **calm mode, install as an app, and a photograph of the fright**.
