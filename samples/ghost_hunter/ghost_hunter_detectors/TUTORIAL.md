# Tutorial: Ghost Hunter Detectors -- Finding Them With Something Other Than Luck

This is the thirteenth tutorial of the Ghost Hunter series. The player has a flashlight and a beam, and no way to find a ghost except to turn round and hope. This sample gives them four **gadgets**, each of which says where the dead are in a different way, from the same numbers about where things are: an **EMF meter**, a **radar**, a **spirit box** and **thermal vision**.

By the end you'll have:

- An **EMF meter**: five lights that say how near something is, and a tick that gets faster the more are lit
- A **radar**: an arm that sweeps round, lighting a blip where something is; the blip fades until the arm comes again, so you see where it *was*
- A **spirit box**: a dial that is tuned to a ghost's own frequency; when it is near enough, something is said
- **Thermal vision**: the temperature of the air round you (the dead are cold), a cold tint over the whole picture, and the cold of a near ghost showing it where the light is not on it
- A row of **four buttons** and a small **screen** for the one in your hand
- The gadgets in the **game**: **E** takes the next one, **Y** hides a ghost in the room to find, and sounds for the meter and the box
- A **Gadgets** read-out in the developer panel
- Unit tests for all of it: **469 passing tests**

**What you'll learn:** how to make several instruments out of the same data (a list of sources and the player), how a sweep that wraps round at 360 degrees is tested, how to make a "tuned to" game from a hash, how to give a gadget its own random numbers so that a test can play it, and how a gadget can change what the rest of the game does (thermal vision reveals).

**Before you start:** do the [Company tutorial](../ghost_hunter_company/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Company sample, plus placeholders for the new files and their tests:

```
ghost_hunter_detectors/
├── index.html, tests.html   (already list the new scripts and the new stylesheet)
├── css/
│   ├── detectors.css       (placeholder -- Step 6)
│   └── everything else, from the Company sample
├── js/
│   ├── detectors.js        (placeholder -- Steps 1 to 5)
│   ├── detectorsui.js      (placeholder -- Step 6)
│   ├── main.js, audio.js   (changes -- Step 7)
│   └── everything else, from the Company sample
└── tests/
    ├── emf.tests.js, radar.tests.js, box.tests.js, thermal.tests.js, detectors.tests.js, detectorsui.tests.js   (placeholders)
    └── everything else, from the Company sample
```

Open `tests.html` before you change anything. You should see **433 passing tests**.

### Serving the page

A phone only lets a page use its camera and motion sensors over HTTPS: see the [series README](../README.md). Add **`?dev`** to the address for the developer panel.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **The EMF meter**: how near, in five lights.
2. **The radar**: a sweep, and blips that fade.
3. **The spirit box**: tuned to a ghost.
4. **Thermal vision**: how cold the air is.
5. **The gadgets in the hand**: one at a time.
6. **What is drawn.**
7. **The game.**

## Step 1: The EMF meter

Every gadget is given the same two things: a list of **sources** (everything there is to be found: each is `{ key, kind, position }`, a creature or a ghost) and the **player** (where they are, and which way they face). Nothing in the file draws anything or knows about Babylon.js: a gadget is a function from those two things to a reading.

The meter's reading is **how much the strongest source stirs it**. Each kind of thing stirs it by a weight (a ghost most of all, a spider least), times how near it is. How near is a number from 0 (out of reach) to 1 (on top of you) that falls off with distance by a power (`nearness`): the power is what makes close much more than far, so that the lights tell you when you are *getting warm*. The strength is turned into lights (five), and into how often the meter ticks.

Everything that can be tuned is in a table (`DETECT`), as everywhere else.

Open `js/detectors.js` (the placeholder) and **replace the TODO line** with:

```js
// Detectors: four gadgets that say where the dead are, from the same numbers about where things are. An **EMF meter** says how near something is, in five lights;
// a **radar** sweeps round and lights a blip where something is, which fades until it is swept again; a **spirit box** is a dial that is tuned to a ghost's own
// frequency, and when it is near enough something is said; and **thermal vision** shows how cold the air round you is (the dead are cold). Nothing here is drawn, and
// no Babylon.js is in it: every gadget is plain arithmetic of the player and a list of **sources**, so a test can say what the meter reads at three metres and when the
// radar sees something behind it. A source is { key, kind, position: [x, y, z], ghost? }. (It uses bearingTo from director.js, and hash from ghost.js.) See ../tests/detectors.tests.js.

const DETECT = {
  // How strongly each kind stirs the EMF meter (a ghost most of all), how much colder the air is within reach of each kind, in degrees, and how far a gadget reaches.
  weight: { ghost: 1, spider: 0.35, ghoul: 0.6, skeleton: 0.5, mummy: 0.6, ghoul_girl: 0.8, doll: 0.7 },
  cold: { ghost: 15, spider: 3, ghoul: 5, skeleton: 8, mummy: 6, ghoul_girl: 10, doll: 9 },
  emf: { range: 9, lights: 5, curve: 1.6 }, // the strength falls with distance by this power: close is much more than far
  radar: { range: 11, period: 3.2, fade: 2.4 }, // seconds for the sweep to go round, and for a blip to fade after it was lit
  box: { range: 8, tolerance: 0.07, wordsPerSecond: 0.9, lowest: 0.1, highest: 0.9, hiss: 0.35 }, // the dial is 0 to 1; a ghost is tuned to somewhere between `lowest` and `highest`
  thermal: { room: 21, coldest: 3, range: 7, curve: 1.4 }, // degrees: the air of the room, and the least it ever reads
  words: {
    far: ["HERE", "COLD", "LISTEN", "WAIT", "WHO"],
    near: ["BEHIND YOU", "LOOK", "LEAVE", "HELP ME", "CLOSE", "TURN AROUND", "I SEE YOU"],
  },
  names: ["emf", "radar", "box", "thermal"],
};

// How far a point is from the player, on the floor.
function distanceFrom(player, position) {
  return Math.hypot(position[0] - player.position[0], position[2] - player.position[2]);
}

// How near something is as a number from 0 (out of reach) to 1 (right on you), falling off by a power of how far it is.
function nearness(distance, range, curve = 1) {
  if (distance >= range) return 0;
  return Math.pow(1 - distance / range, curve);
}

// ---- the EMF meter ----

// What the meter reads: { strength, level, nearest } where `strength` is 0 to 1 (the strongest of the sources: a ghost behind a wall is as strong as one in front),
// `level` is how many of its lights are lit, 0 to 5, and `nearest` is the key of what is making it.
function emfReading(sources, player, table = DETECT) {
  let strength = 0;
  let nearest = null;
  for (const source of sources) {
    const s = (table.weight[source.kind] ?? 0.3) * nearness(distanceFrom(player, source.position), table.emf.range, table.emf.curve);
    if (s > strength) {
      strength = s;
      nearest = source.key;
    }
  }
  strength = Math.min(1, strength);
  return { strength, level: Math.round(strength * table.emf.lights), nearest };
}

// How often the meter ticks, in times a second, for a reading: it is silent with no light, and ticks faster with each one.
function emfTickRate(level) {
  return level <= 0 ? 0 : 1.5 + level * 2.5;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DETECT, distanceFrom, nearness, emfReading, emfTickRate };
} else {
  Object.assign(window, { DETECT, distanceFrom, nearness, emfReading, emfTickRate });
}
```

Things to notice:

- **It names what is making the reading** (`nearest`): later the game can say where to point.
- **A kind that is not in the table still counts a little** (`?? 0.3`): a new creature does not make the meter go quiet.
- **A ghost behind a wall is as strong as one in front.** The meter has no direction. That is the difference between it and the radar.

### Tests

The tests share two helpers (a player and a way to make a source): they are made here, in the first test file, and used by the others.

Open `tests/emf.tests.js` (the placeholder) and **replace the TODO line** with:

```js
const dPlayer = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
const src = (kind, x, z, key = `${kind}-${x}-${z}`) => ({ key, kind, position: [x, 0, z] });

QUnit.module("nearness and the EMF meter", () => {
  QUnit.test("nearness is 1 on the spot, 0 at the range and beyond, and falls off by a power", (assert) => {
    assert.strictEqual(nearness(0, 10), 1);
    assert.strictEqual(nearness(10, 10), 0);
    assert.strictEqual(nearness(25, 10), 0);
    assert.true(nearness(2, 10, 2) > nearness(8, 10, 2));
    assert.true(nearness(5, 10, 2) < nearness(5, 10, 1), "a higher power is a steeper fall");
  });

  QUnit.test("with nothing about, the meter reads nothing", (assert) => {
    const reading = emfReading([], dPlayer);
    assert.deepEqual([reading.strength, reading.level, reading.nearest], [0, 0, null]);
  });

  QUnit.test("a ghost close by lights the meter, further away less, and out of reach not at all", (assert) => {
    const at = (distance) => emfReading([src("ghost", 0, distance)], dPlayer).level;
    assert.strictEqual(at(0.5), 5);
    assert.true(at(3) > at(6), `${at(3)} lights at 3 m and ${at(6)} at 6`);
    assert.strictEqual(at(DETECT.emf.range + 1), 0);
  });

  QUnit.test("a ghost stirs it more than a spider at the same distance, and it names what stirs it", (assert) => {
    const ghost = emfReading([src("ghost", 0, 3, "g1")], dPlayer);
    const spider = emfReading([src("spider", 0, 3, "s1")], dPlayer);
    assert.true(ghost.strength > spider.strength);
    const both = emfReading([src("spider", 0, 1, "s1"), src("ghost", 0, 5, "g1")], dPlayer);
    assert.strictEqual(both.nearest, both.strength === emfReading([src("spider", 0, 1, "s1")], dPlayer).strength ? "s1" : "g1");
  });

  QUnit.test("a kind with no weight in the table still counts a little, and the meter never reads over 1", (assert) => {
    assert.true(emfReading([src("thing", 0, 1)], dPlayer).strength > 0);
    assert.true(emfReading([src("ghost", 0, 0)], dPlayer).strength <= 1);
  });

  QUnit.test("the meter ticks faster with each light, and not at all with none", (assert) => {
    assert.strictEqual(emfTickRate(0), 0);
    for (let level = 1; level < 5; level++) assert.true(emfTickRate(level + 1) > emfTickRate(level));
  });
});
```

Open `tests.html`. You should see **439 passing tests**: 6 more.

## Step 2: The radar

The meter says how near; the radar says **which way**. A round screen has the player in the middle and straight ahead at the top; an arm sweeps round once every few seconds, and where it goes over something, a **blip** is lit there, at the bearing and at a radius that is how far away it is. The blip then **fades** until the arm comes round again, and a blip that has faded is forgotten.

The things worth noticing:

- **A sweep is an angle that wraps.** The arm goes from 350° to 20° in one frame: it went over 355° and 5°, and not over 300°. `sweepCrossed` does the arithmetic of "did it go over this bearing", with the wrap, and the case of a long frame (a whole turn or more went over everything).
- **The bearing is the player's own** (`bearingTo` from the director: degrees from straight ahead, going round to the right), so the radar turns as the player does, and straight ahead is always the top of the screen.
- **A blip remembers where the thing was, not where it is.** It is a *sweep*, so something that moves is drawn at the place it was when the arm went over it. That is what a real radar does, and it is what makes the screen feel like an instrument and not a map.

In `js/detectors.js`, find the export block (lines 56 to 63) and **delete it**. Add this in its place, and the export block under it:

```js
// ---- the radar ----

// Whether a sweep that went from `before` to `now` (degrees, going round to the right) went over `target`. It can cross 360, and a sweep of a whole turn or more (a
// long frame) went over everything. Nothing moved is nothing crossed.
function sweepCrossed(before, now, target) {
  if (now === before) return false;
  if (now - before >= 360) return true;
  const wrap = (a) => ((a % 360) + 360) % 360;
  const gone = wrap(now - before);
  const to = wrap(target - before);
  return to > 0 && to <= gone;
}

class Radar {
  constructor(table = DETECT) {
    this.table = table;
    this.sweep = 0; // degrees: where the arm is
    this.blips = new Map(); // key -> { key, kind, angle, radius, light } (angle is from straight ahead going round to the right; radius is 0 at you and 1 at the edge)
  }

  // `seconds` go by. `sources` and `player` are as for the other gadgets. A source in range that the arm goes over is lit, and every blip fades.
  update(seconds, sources, player) {
    const { range, period, fade } = this.table.radar;
    const before = this.sweep;
    const after = before + (seconds / period) * 360; // not wrapped, so that a turn of more than one is known to be
    this.sweep = after % 360;
    for (const blip of this.blips.values()) blip.light = Math.max(0, blip.light - seconds / fade);
    for (const [key, blip] of this.blips) if (blip.light === 0) this.blips.delete(key);
    for (const source of sources) {
      const distance = distanceFrom(player, source.position);
      if (distance > range) continue;
      const angle = (bearingTo(player, source.position) + 360) % 360;
      // the arm is drawn with straight ahead at the top, so it is compared with the bearing from the player's own heading
      if (sweepCrossed(before, after, angle)) this.blips.set(source.key, { key: source.key, kind: source.kind, angle, radius: distance / range, light: 1 });
    }
    return [...this.blips.values()];
  }

  clear() {
    this.blips.clear();
    this.sweep = 0;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar };
} else {
  Object.assign(window, { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar });
}
```

### Tests

Open `tests/radar.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the radar", () => {
  QUnit.test("a sweep that crosses a bearing, with the wrap at 360 taken into account", (assert) => {
    assert.true(sweepCrossed(10, 40, 30));
    assert.false(sweepCrossed(10, 40, 50));
    assert.false(sweepCrossed(10, 40, 5));
    assert.true(sweepCrossed(350, 20, 5), "over the top");
    assert.true(sweepCrossed(350, 20, 355));
    assert.false(sweepCrossed(350, 20, 300));
    assert.false(sweepCrossed(10, 10, 10), "no time, no crossing");
  });

  QUnit.test("something is lit when the arm goes over it, at the radius of how far it is, and not before", (assert) => {
    const radar = new Radar();
    const ghost = src("ghost", 0, 5.5, "g"); // straight ahead (bearing 0), half the range away
    radar.sweep = 340;
    assert.deepEqual(radar.update(0.1, [ghost], dPlayer), [], "the arm has not got there");
    const seen = radar.update((20 / 360) * DETECT.radar.period, [ghost], dPlayer);
    assert.strictEqual(seen.length, 1);
    assert.true(Math.abs(seen[0].radius - 0.5) < 1e-9);
    assert.true(seen[0].angle < 1 || seen[0].angle > 359);
    assert.strictEqual(seen[0].light, 1);
  });

  QUnit.test("something to the right is on the right of the screen of the radar, and something behind is at the bottom", (assert) => {
    const radar = new Radar();
    const right = radar.update(DETECT.radar.period, [src("ghost", 5, 0, "r"), src("ghost", 0, -5, "b")], dPlayer);
    const angleOf = (key) => right.find((b) => b.key === key).angle;
    assert.true(Math.abs(angleOf("r") - 90) < 1e-6);
    assert.true(Math.abs(angleOf("b") - 180) < 1e-6);
  });

  QUnit.test("a blip fades after it was lit, and goes", (assert) => {
    const radar = new Radar();
    const ghost = src("ghost", 0, 4, "g");
    radar.update(DETECT.radar.period, [ghost], dPlayer);
    assert.strictEqual(radar.blips.size, 1);
    radar.update(0.001, [], dPlayer);
    const light = radar.blips.get("g").light;
    radar.update(DETECT.radar.fade / 2, [], dPlayer);
    assert.true(radar.blips.get("g").light < light);
    radar.update(DETECT.radar.fade, [], dPlayer);
    assert.strictEqual(radar.blips.size, 0);
  });

  QUnit.test("what is out of the radar's range is not shown", (assert) => {
    const radar = new Radar();
    assert.deepEqual(radar.update(DETECT.radar.period, [src("ghost", 0, DETECT.radar.range + 2)], dPlayer), []);
  });

  QUnit.test("the arm turns once in a period, and the radar can be cleared", (assert) => {
    const radar = new Radar();
    radar.update(DETECT.radar.period / 4, [], dPlayer);
    assert.true(Math.abs(radar.sweep - 90) < 1e-9);
    radar.clear();
    assert.strictEqual(radar.sweep, 0);
  });
});
```

Open `tests.html`. You should see **445 passing tests**: 6 more.

## Step 3: The spirit box

The spirit box is a **game of tuning**. There is a dial from 0 to 1, and every ghost is tuned to a frequency of its own, somewhere on it. Turn the dial until it is near the frequency of a ghost that is in reach, and something is said.

- **A ghost's frequency comes from its key.** `ghostFrequency` makes a number from the ghost's name by a hash, always the same for the same ghost, and always between the least and the most that the dial can be set to, so that every ghost *can* be found.
- **The lock is how well it is tuned**, from 1 (exactly) to 0 (more than `tolerance` away). The **static** is full when there is no lock and falls as there is one: what you hear while you turn the dial.
- **A word comes by chance**, more often the better the lock and the nearer the ghost, and a ghost that is near says the harder things (`BEHIND YOU`, `I SEE YOU`) and one that is far the gentler ones (`HERE`, `COLD`).
- **Only ghosts are heard.** A mummy has nothing to say.

In `js/detectors.js`, find the export block (lines 100 to 107) and **delete it**. Add this in its place, and the export block under it:

```js
// ---- the spirit box ----

// The frequency a ghost is tuned to, 0 to 1: its own, from its key, and always between the least and the most the dial can be set to, so that every one can be found.
function ghostFrequency(key, table = DETECT) {
  const text = String(key);
  let n = 0;
  for (let i = 0; i < text.length; i++) n = (n * 31 + text.charCodeAt(i)) % 9973;
  return table.box.lowest + hash(n) * (table.box.highest - table.box.lowest);
}

// What a dial setting hears: { lock, hiss, nearest, word? }. `lock` is how well it is tuned to the nearest ghost in reach (1 is exactly, 0 is not at all) and counts
// for nothing if it is out of reach; `hiss` is the loudness of the static, which is full when it is not tuned and falls as it is. A word is said now and then, more
// often the better the lock and the nearer the ghost, and the nearer ones say harder things. `random` gives numbers from 0 up to 1, and `seconds` is how long it has been.
function boxHears(dial, sources, player, seconds, random, table = DETECT) {
  let best = null;
  for (const source of sources) {
    if (source.kind !== "ghost") continue;
    const distance = distanceFrom(player, source.position);
    if (distance > table.box.range) continue;
    const lock = Math.max(0, 1 - Math.abs(dial - ghostFrequency(source.key, table)) / table.box.tolerance);
    const near = nearness(distance, table.box.range);
    if (!best || lock * near > best.lock * best.near) best = { source, lock, near };
  }
  if (!best) return { lock: 0, hiss: 1, nearest: null };
  const chance = best.lock * best.near * table.box.wordsPerSecond * seconds;
  const hiss = 1 - best.lock * (1 - table.box.hiss);
  const result = { lock: best.lock, hiss, nearest: best.source.key };
  if (best.lock > 0 && random() < chance) {
    const list = best.near > 0.5 ? table.words.near : table.words.far;
    result.word = list[Math.floor(random() * list.length)];
  }
  return result;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar, ghostFrequency, boxHears };
} else {
  Object.assign(window, { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar, ghostFrequency, boxHears });
}
```

Things to notice:

- **The random numbers are given.** `boxHears` takes a `random` function, so a test can say what happens when the chance comes up (`() => 0`) and when it does not (`() => 0.999`), and can count how often it speaks over four hundred tries with a numbered stand-in.
- **The nearest ghost that is best tuned wins,** not simply the nearest: a ghost that is tuned to and a bit further is what you hear.

### Tests

Open `tests/box.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the spirit box", () => {
  QUnit.test("a ghost has a frequency of its own, always on the dial, the same each time", (assert) => {
    for (const key of ["g1", "g2", "g3", "g17", "g400"]) {
      const f = ghostFrequency(key);
      assert.true(f >= DETECT.box.lowest && f <= DETECT.box.highest, `${key}: ${f}`);
      assert.strictEqual(f, ghostFrequency(key));
    }
    assert.notStrictEqual(ghostFrequency("g1"), ghostFrequency("g2"));
  });

  QUnit.test("with no ghost in reach it is all static", (assert) => {
    const heard = boxHears(0.5, [src("ghost", 0, 20, "g")], dPlayer, 1, () => 0);
    assert.deepEqual([heard.lock, heard.hiss, heard.nearest], [0, 1, null]);
  });

  QUnit.test("creatures are not heard, only ghosts", (assert) => {
    assert.strictEqual(boxHears(0.5, [src("mummy", 0, 2, "m")], dPlayer, 1, () => 0).nearest, null);
  });

  QUnit.test("tuned exactly, the lock is full and the static is quiet; tuned away, there is no lock and the static is full", (assert) => {
    const ghost = src("ghost", 0, 2, "g1");
    const f = ghostFrequency("g1");
    const on = boxHears(f, [ghost], dPlayer, 0.1, () => 0.99);
    assert.strictEqual(on.lock, 1);
    assert.strictEqual(on.hiss, DETECT.box.hiss);
    const off = boxHears(f + DETECT.box.tolerance * 2, [ghost], dPlayer, 0.1, () => 0);
    assert.strictEqual(off.lock, 0);
    assert.strictEqual(off.hiss, 1);
    assert.strictEqual(off.word, undefined, "a word needs a lock");
  });

  QUnit.test("a word is said when the chance comes up, and not when it does not", (assert) => {
    const ghost = src("ghost", 0, 1, "g1");
    const f = ghostFrequency("g1");
    assert.strictEqual(typeof boxHears(f, [ghost], dPlayer, 1, () => 0).word, "string");
    assert.strictEqual(boxHears(f, [ghost], dPlayer, 1, () => 0.999).word, undefined);
  });

  QUnit.test("a ghost that is near says the harder words, and one that is far the gentler", (assert) => {
    const f = ghostFrequency("g1");
    const near = boxHears(f, [src("ghost", 0, 1, "g1")], dPlayer, 100, () => 0).word;
    const far = boxHears(f, [src("ghost", 0, 7, "g1")], dPlayer, 100, () => 0).word;
    assert.true(DETECT.words.near.includes(near), near);
    assert.true(DETECT.words.far.includes(far), far);
  });

  QUnit.test("the better the lock and the nearer the ghost, the more often it speaks", (assert) => {
    const f = ghostFrequency("g1");
    const rate = (dial, distance) => {
      let said = 0;
      let n = 0;
      const random = () => (n++ % 100) / 100 + 0.004;
      for (let i = 0; i < 400; i++) if (boxHears(dial, [src("ghost", 0, distance, "g1")], dPlayer, 0.1, random).word) said++;
      return said;
    };
    assert.true(rate(f, 1) > rate(f, 6), "nearer is more");
    assert.true(rate(f, 2) > rate(f + DETECT.box.tolerance * 0.7, 2), "tuned is more");
  });
});
```

Open `tests.html`. You should see **452 passing tests**: 7 more.

## Step 4: Thermal vision

The dead are cold. Each kind has a number of degrees by which it chills the air within reach of it (a ghost 15, a spider 3). Thermal vision reads **the air where the player stands**: the room's temperature, less the biggest chill that is near (the coldest counts, they do not add up: a room of ghosts is not colder than the coldest, and nothing is colder than `coldest`).

Two things are made of that: **the chill**, from 0 to 1, which tints the whole picture cold, and the **reveal**: the cold of a ghost that is near shows it, **even where the light is not on it**. The flashlight has been the only way to see a ghost properly; thermal vision is another, with a different price (you look at a screen's tint instead of the room).

In `js/detectors.js`, find the export block (lines 134 to 141) and **delete it**. Add this in its place, and the export block under it:

```js
// ---- thermal vision ----

// How warm the air is where the player stands, in degrees: the room's, less how cold each source makes it (the coldest one counts, they do not add up: a room of
// ghosts is not colder than the coldest).
function airTemperature(sources, player, table = DETECT) {
  let drop = 0;
  for (const source of sources) drop = Math.max(drop, (table.cold[source.kind] ?? 2) * nearness(distanceFrom(player, source.position), table.thermal.range, table.thermal.curve));
  return Math.max(table.thermal.coldest, table.thermal.room - drop);
}

// How strong the cold tint over the picture is, 0 (the room's own temperature) to 1 (the coldest it reads).
function chillOf(temperature, table = DETECT) {
  return Math.max(0, Math.min(1, (table.thermal.room - temperature) / (table.thermal.room - table.thermal.coldest)));
}

// How much of a ghost thermal vision shows: the cold of a ghost in reach is seen even where the light is not on it. 0 when the gadget is not in use, or it is too far.
function thermalReveal(source, player, table = DETECT) {
  return nearness(distanceFrom(player, source.position), table.thermal.range * 1.2, 0.5);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar, ghostFrequency, boxHears, airTemperature, chillOf, thermalReveal };
} else {
  Object.assign(window, { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar, ghostFrequency, boxHears, airTemperature, chillOf, thermalReveal });
}
```

### Tests

Open `tests/thermal.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("thermal vision", () => {
  QUnit.test("the room is its own temperature with nothing about, and colder next to a ghost", (assert) => {
    assert.strictEqual(airTemperature([], dPlayer), DETECT.thermal.room);
    const cold = airTemperature([src("ghost", 0, 0.1)], dPlayer);
    assert.true(cold < DETECT.thermal.room - 10, `${cold}`);
    assert.true(airTemperature([src("ghost", 0, 4)], dPlayer) > cold);
    assert.strictEqual(airTemperature([src("ghost", 0, 30)], dPlayer), DETECT.thermal.room);
  });

  QUnit.test("it never reads below the least, and several ghosts are not colder than the coldest", (assert) => {
    const many = Array.from({ length: 6 }, (_, i) => src("ghost", 0, 0.1, `g${i}`));
    assert.strictEqual(airTemperature(many, dPlayer), airTemperature([many[0]], dPlayer));
    const table = { ...DETECT, cold: { ...DETECT.cold, ghost: 99 } };
    assert.strictEqual(airTemperature([src("ghost", 0, 0)], dPlayer, table), DETECT.thermal.coldest);
  });

  QUnit.test("the chill goes from nothing at the room's temperature to one at the coldest", (assert) => {
    assert.strictEqual(chillOf(DETECT.thermal.room), 0);
    assert.strictEqual(chillOf(DETECT.thermal.coldest), 1);
    assert.strictEqual(chillOf(100), 0);
    assert.strictEqual(chillOf(-50), 1);
    assert.true(Math.abs(chillOf((DETECT.thermal.room + DETECT.thermal.coldest) / 2) - 0.5) < 1e-9);
  });

  QUnit.test("the cold of a ghost shows it where the light is not on it, more the nearer", (assert) => {
    assert.true(thermalReveal(src("ghost", 0, 2), dPlayer) > thermalReveal(src("ghost", 0, 6), dPlayer));
    assert.strictEqual(thermalReveal(src("ghost", 0, 30), dPlayer), 0);
  });
});
```

Open `tests.html`. You should see **456 passing tests**: 4 more.

## Step 5: The gadgets in the hand

A person can hold one at a time. `Detectors` is what holds them: which is in the hand (or none), the dial of the box, the radar (it has a memory, so it is kept), the last word the box said and how long ago, and **events** (`tick`, `word`) that whoever is listening empties out, as the creatures' events are.

- **Selecting the one in the hand puts it away**, and **cycling** goes through all four and then none.
- **Only the gadget in the hand does any work:** the others are not asked, which is why the radar is cleared when it is put away (a radar that is picked up again does not show what it saw a minute ago).
- **The ticks are paced by the reading:** a timer counts down by `1 / rate`, and each time it goes off, a `tick` is added to the events.

In `js/detectors.js`, find the export block (lines 154 to 161) and **delete it**. Add this in its place, and the export block under it:

```js
// ---- all of them ----

// The gadgets, as the game holds them: one in the hand at a time (or none), its dial, and what it says. `random` is given, so a test can play it.
class Detectors {
  constructor(table = DETECT, random = Math.random) {
    this.table = table;
    this.random = random;
    this.selected = null;
    this.dial = 0.5;
    this.radar = new Radar(table);
    this.frame = { selected: null, emf: null, radar: null, box: null, thermal: null };
    this.lastWord = null;
    this.wordAge = 99; // seconds since a word was said
    this.tickWait = 0;
    this.events = []; // what has happened and has not been told of: "tick", "static", "word"
  }

  select(name) {
    if (name !== null && !this.table.names.includes(name)) return false;
    this.selected = this.selected === name ? null : name; // the same one again puts it away
    if (this.selected !== "radar") this.radar.clear();
    return true;
  }

  // The next gadget, in order, and then none.
  cycle() {
    const at = this.selected === null ? -1 : this.table.names.indexOf(this.selected);
    const next = at + 1 >= this.table.names.length ? null : this.table.names[at + 1];
    this.selected = next;
    if (next !== "radar") this.radar.clear();
    return next;
  }

  tune(value) {
    this.dial = Math.max(0, Math.min(1, value));
  }

  // `seconds` go by. `sources` are what there is to be found, and `player` is { position, forward }. Gives the frame: what each gadget in hand reads.
  update(seconds, sources, player) {
    const t = this.table;
    this.wordAge += seconds;
    const frame = { selected: this.selected, emf: null, radar: null, box: null, thermal: null };
    if (this.selected === "emf") {
      frame.emf = emfReading(sources, player, t);
      const rate = emfTickRate(frame.emf.level);
      this.tickWait -= seconds;
      if (rate > 0 && this.tickWait <= 0) {
        this.tickWait = 1 / rate;
        this.events.push("tick");
      }
    } else if (this.selected === "radar") {
      frame.radar = { sweep: this.radar.sweep, blips: this.radar.update(seconds, sources, player) };
    } else if (this.selected === "box") {
      const heard = boxHears(this.dial, sources, player, seconds, this.random, t);
      frame.box = { dial: this.dial, ...heard };
      if (heard.word) {
        this.lastWord = heard.word;
        this.wordAge = 0;
        this.events.push("word");
      }
    } else if (this.selected === "thermal") {
      const temperature = airTemperature(sources, player, t);
      frame.thermal = { temperature, chill: chillOf(temperature, t) };
    }
    this.frame = frame;
    return frame;
  }

  // The events since last asked, and forgets them.
  take() {
    const events = this.events;
    this.events = [];
    return events;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar, ghostFrequency, boxHears, airTemperature, chillOf, thermalReveal, Detectors };
} else {
  Object.assign(window, { DETECT, distanceFrom, nearness, emfReading, emfTickRate, sweepCrossed, Radar, ghostFrequency, boxHears, airTemperature, chillOf, thermalReveal, Detectors });
}
```

### Tests

Open `tests/detectors.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the gadgets in the hand", () => {
  const ghosts = [src("ghost", 0, 2, "g1")];

  QUnit.test("none is in the hand to begin with, selecting one picks it up and again puts it away", (assert) => {
    const d = new Detectors();
    assert.strictEqual(d.selected, null);
    assert.true(d.select("emf"));
    assert.strictEqual(d.selected, "emf");
    d.select("emf");
    assert.strictEqual(d.selected, null);
    assert.false(d.select("camera"), "there is no such gadget");
  });

  QUnit.test("cycling goes through all four and then none", (assert) => {
    const d = new Detectors();
    const seen = [d.cycle(), d.cycle(), d.cycle(), d.cycle(), d.cycle()];
    assert.deepEqual(seen, ["emf", "radar", "box", "thermal", null]);
  });

  QUnit.test("only the gadget in the hand has a reading", (assert) => {
    const d = new Detectors();
    d.select("emf");
    const frame = d.update(0.1, ghosts, dPlayer);
    assert.true(frame.emf.level > 0);
    assert.strictEqual(frame.radar, null);
    assert.strictEqual(frame.box, null);
    assert.strictEqual(frame.thermal, null);
    assert.strictEqual(d.update(0.1, ghosts, dPlayer).selected, "emf");
  });

  QUnit.test("the meter ticks while it reads something, faster when it reads more, and is quiet when it reads nothing", (assert) => {
    const count = (sources) => {
      const d = new Detectors();
      d.select("emf");
      let ticks = 0;
      for (let t = 0; t < 5; t += 0.05) {
        d.update(0.05, sources, dPlayer);
        ticks += d.take().filter((e) => e === "tick").length;
      }
      return ticks;
    };
    assert.strictEqual(count([]), 0);
    assert.true(count([src("ghost", 0, 1)]) > count([src("ghost", 0, 6)]));
  });

  QUnit.test("the dial is held between nothing and one, and the box says a word when tuned (once, with its age)", (assert) => {
    const d = new Detectors(DETECT, () => 0);
    d.select("box");
    d.tune(7);
    assert.strictEqual(d.dial, 1);
    d.tune(ghostFrequency("g1"));
    d.update(1, ghosts, dPlayer);
    assert.deepEqual(d.take(), ["word"]);
    assert.strictEqual(typeof d.lastWord, "string");
    assert.strictEqual(d.wordAge, 0);
    assert.deepEqual(d.take(), [], "told once");
    d.update(2, [], dPlayer);
    assert.true(d.wordAge >= 2);
  });

  QUnit.test("thermal has a temperature and a chill, and the radar a sweep and blips; putting the radar away clears it", (assert) => {
    const d = new Detectors();
    d.select("thermal");
    assert.true(d.update(0.1, ghosts, dPlayer).thermal.chill > 0);
    d.select("radar");
    const frame = d.update(DETECT.radar.period, ghosts, dPlayer);
    assert.strictEqual(frame.radar.blips.length, 1);
    d.select("radar");
    assert.strictEqual(d.radar.blips.size, 0);
  });
});
```

Open `tests.html`. You should see **462 passing tests**: 6 more.

## Step 6: What is drawn

`DetectorsUi` builds a row of four buttons and a small screen from the page's own elements, given the `document` (so a test can look at them), and `apply` is told what the gadgets read. The meter is five round lights (the last two red); the radar is a canvas with three rings, the arm, and a blip for each (blue for a ghost, red for the others, as bright as it is lit); the box has a bar of static, the last word (which fades) and the dial, which tells whoever is listening when it is turned; and the thermal screen is a temperature, with a cold tint over the whole page and a class on the body that turns the colours of the picture.

Open `js/detectorsui.js` (the placeholder) and **replace the TODO line** with:

```js
// What the player sees of the gadgets: a row of four buttons (EMF, RADAR, BOX, HEAT) of which one is in the hand, and a small screen under them that shows that gadget: five
// lights for the meter, a round screen with a sweeping arm and blips for the radar, a dial and the static and the words it hears for the box, and a temperature for the
// thermal vision, which also tints the whole picture cold. It is built from the page's own elements, given the `document` (so a test can look at it), and `apply` is told what
// the gadgets read (the `frame` of Detectors.update). See ../tests/detectorsui.tests.js and ../css/detectors.css.

const GADGET_LABELS = { emf: "EMF", radar: "RADAR", box: "BOX", thermal: "HEAT" };

class DetectorsUi {
  // `doc` is the page. `handlers` is { onSelect(name), onTune(value) }.
  constructor(doc, { onSelect = () => {}, onTune = () => {} } = {}) {
    this.doc = doc;
    const make = (tag, className, parent, text = "") => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };
    this.root = make("div", "gadgets", doc.body);
    this.root.id = "gadgets";
    const row = make("div", "gadget-row", this.root);
    this.buttons = {};
    for (const name of DETECT.names) {
      const button = make("button", "gadget-button", row, GADGET_LABELS[name]);
      button.type = "button";
      button.addEventListener("click", () => onSelect(name));
      this.buttons[name] = button;
    }
    this.screen = make("div", "gadget-screen hidden", this.root);

    this.emf = make("div", "gadget-emf hidden", this.screen);
    this.lights = Array.from({ length: DETECT.emf.lights }, () => make("i", "gadget-light", this.emf));

    this.radar = make("div", "gadget-radar hidden", this.screen);
    this.canvas = make("canvas", "gadget-canvas", this.radar);
    this.canvas.width = 120;
    this.canvas.height = 120;

    this.box = make("div", "gadget-box hidden", this.screen);
    this.hiss = make("div", "gadget-hiss", this.box);
    this.hissFill = make("i", "gadget-hiss-fill", this.hiss);
    this.word = make("div", "gadget-word", this.box, "...");
    this.dial = doc.createElement("input");
    this.dial.type = "range";
    this.dial.min = "0";
    this.dial.max = "1";
    this.dial.step = "0.005";
    this.dial.value = "0.5";
    this.dial.className = "gadget-dial";
    this.dial.setAttribute("aria-label", "Tune the spirit box");
    this.dial.addEventListener("input", () => onTune(Number(this.dial.value)));
    this.box.appendChild(this.dial);

    this.thermal = make("div", "gadget-thermal hidden", this.screen);
    this.temperature = make("div", "gadget-temperature", this.thermal, "21.0°C");

    this.chill = make("div", "chill", doc.body);
    this.chill.id = "chill";
  }

  // Shows what the gadget in the hand reads. `frame` is what Detectors.update gave, and `detectors` is the Detectors itself (for the word it last heard, and how long ago).
  apply(frame, detectors = null) {
    for (const [name, button] of Object.entries(this.buttons)) button.classList.toggle("on", frame.selected === name);
    this.screen.classList.toggle("hidden", frame.selected === null);
    this.emf.classList.toggle("hidden", frame.selected !== "emf");
    this.radar.classList.toggle("hidden", frame.selected !== "radar");
    this.box.classList.toggle("hidden", frame.selected !== "box");
    this.thermal.classList.toggle("hidden", frame.selected !== "thermal");
    this.doc.body.classList.toggle("thermal", frame.selected === "thermal"); // thermal vision turns the colours of the picture
    this.chill.style.opacity = frame.thermal ? (frame.thermal.chill * 0.55).toFixed(3) : "0";
    if (frame.emf) this.lights.forEach((light, i) => light.classList.toggle("on", i < frame.emf.level));
    if (frame.radar) this._drawRadar(frame.radar);
    if (frame.box) {
      this.hissFill.style.width = `${Math.round(frame.box.hiss * 100)}%`;
      if (detectors && detectors.lastWord) {
        this.word.textContent = detectors.lastWord;
        this.word.style.opacity = String(Math.max(0.15, 1 - detectors.wordAge / 3).toFixed(2));
      }
    }
    if (frame.thermal) this.temperature.textContent = `${frame.thermal.temperature.toFixed(1)}°C`;
  }

  _drawRadar({ sweep, blips }) {
    const context = this.canvas.getContext("2d");
    const size = this.canvas.width;
    const middle = size / 2;
    context.clearRect(0, 0, size, size);
    context.strokeStyle = "rgba(57, 255, 20, 0.5)";
    context.lineWidth = 1;
    for (const r of [0.33, 0.66, 1]) {
      context.beginPath();
      context.arc(middle, middle, (middle - 2) * r, 0, Math.PI * 2);
      context.stroke();
    }
    const point = (angle, radius) => [middle + Math.sin((angle * Math.PI) / 180) * (middle - 2) * radius, middle - Math.cos((angle * Math.PI) / 180) * (middle - 2) * radius];
    context.strokeStyle = "rgba(57, 255, 20, 0.9)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(middle, middle);
    context.lineTo(...point(sweep, 1));
    context.stroke();
    for (const blip of blips) {
      const [x, y] = point(blip.angle, blip.radius);
      context.fillStyle = blip.kind === "ghost" ? `rgba(60, 230, 255, ${blip.light.toFixed(2)})` : `rgba(255, 90, 90, ${blip.light.toFixed(2)})`;
      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GADGET_LABELS, DetectorsUi };
} else {
  Object.assign(window, { GADGET_LABELS, DetectorsUi });
}
```

And the stylesheet. Open `css/detectors.css` (the placeholder) and **replace the TODO line** with:

```css
/* The gadgets (see detectorsui.js): four buttons at the top right, one in the hand, and its small screen under them. The cold tint over the whole picture is for thermal vision. */
#gadgets {
  position: fixed;
  top: 52px;
  right: 10px;
  z-index: 8;
  width: 190px;
  pointer-events: none; /* only the buttons and the dial take a touch */
}
body:has(#start:not(.hidden)) #gadgets,
body:has(#start:not(.hidden)) #chill {
  visibility: hidden;
}
.gadget-row {
  display: flex;
  gap: 4px;
}
.gadget-button {
  flex: 1;
  padding: 7px 0;
  border: 2px solid var(--bone);
  background: rgba(5, 8, 13, 0.6);
  color: var(--bone);
  font: 13px var(--small-font);
  letter-spacing: 0.06em;
  pointer-events: auto;
  touch-action: manipulation;
}
.gadget-button.on {
  border-color: var(--ecto);
  color: var(--ecto);
  background: rgba(60, 230, 255, 0.16);
  box-shadow: 0 0 10px rgba(60, 230, 255, 0.45);
}
.gadget-screen {
  margin-top: 6px;
  padding: 8px;
  border: 2px solid var(--ghost);
  background: rgba(5, 8, 13, 0.72);
  color: var(--ghost);
  font-family: var(--small-font);
}
.gadget-screen.hidden,
.gadget-emf.hidden,
.gadget-radar.hidden,
.gadget-box.hidden,
.gadget-thermal.hidden {
  display: none;
}
.gadget-emf {
  display: flex;
  gap: 6px;
  justify-content: center;
}
.gadget-light {
  width: 26px;
  height: 26px;
  border: 2px solid rgba(242, 243, 238, 0.35);
  border-radius: 50%;
  background: rgba(242, 243, 238, 0.06);
}
.gadget-light.on {
  background: var(--ghost);
  border-color: var(--ghost);
  box-shadow: 0 0 10px var(--ghost);
}
.gadget-light.on:nth-child(4),
.gadget-light.on:nth-child(5) {
  background: var(--blood);
  border-color: var(--blood);
  box-shadow: 0 0 10px var(--blood);
}
.gadget-radar {
  display: flex;
  justify-content: center;
}
.gadget-canvas {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(0, 20, 0, 0.55);
}
.gadget-hiss {
  height: 8px;
  background: rgba(242, 243, 238, 0.15);
}
.gadget-hiss-fill {
  display: block;
  height: 100%;
  width: 100%;
  background: var(--ecto);
}
.gadget-word {
  min-height: 24px;
  margin: 6px 0;
  font-size: 22px;
  letter-spacing: 0.12em;
  text-align: center;
  color: var(--bone);
}
.gadget-dial {
  width: 100%;
  accent-color: var(--ecto);
  pointer-events: auto;
  touch-action: pan-y;
}
.gadget-temperature {
  font-size: 34px;
  text-align: center;
  color: var(--ecto);
}
.chill {
  position: fixed;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle at 50% 50%, rgba(20, 60, 160, 0.15), rgba(10, 40, 200, 0.7));
  mix-blend-mode: screen;
}
body.thermal #stage,
body.thermal #renderCanvas {
  filter: saturate(0.6) hue-rotate(185deg) contrast(1.15);
}
/* On a narrow screen the hint above takes several lines, and the gadgets come down under it. */
@media (max-width: 640px) {
  #gadgets {
    top: 150px;
  }
}
```

Things to notice:

- **The gadgets are hidden while the start screen is up,** by the same `:has(#start:not(.hidden))` rule that hides the tools, so that the warning has the whole screen.
- **Only the buttons and the dial take a touch;** the layer they sit in lets everything else through to the picture.
- **On a narrow screen the gadgets come down under the hint** (`@media (max-width: 640px)`).

### Tests

Open `tests/detectorsui.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("DetectorsUi", () => {
  const make = (handlers = {}) => {
    const ui = new DetectorsUi(document, handlers);
    return { ui, gone: () => { ui.root.remove(); ui.chill.remove(); document.body.classList.remove("thermal"); } };
  };
  const blank = (selected, extra = {}) => ({ selected, emf: null, radar: null, box: null, thermal: null, ...extra });

  QUnit.test("a button for each gadget, and pressing one says which", (assert) => {
    const pressed = [];
    const { ui, gone } = make({ onSelect: (name) => pressed.push(name) });
    assert.deepEqual(Object.keys(ui.buttons), DETECT.names);
    ui.buttons.radar.click();
    ui.buttons.thermal.click();
    assert.deepEqual(pressed, ["radar", "thermal"]);
    gone();
  });

  QUnit.test("with nothing in the hand there is no screen, and the one in the hand is marked", (assert) => {
    const { ui, gone } = make();
    ui.apply(blank(null));
    assert.true(ui.screen.classList.contains("hidden"));
    ui.apply(blank("emf", { emf: { level: 2, strength: 0.4, nearest: "g" } }));
    assert.false(ui.screen.classList.contains("hidden"));
    assert.true(ui.buttons.emf.classList.contains("on"));
    assert.false(ui.buttons.radar.classList.contains("on"));
    assert.false(ui.emf.classList.contains("hidden"));
    assert.true(ui.radar.classList.contains("hidden"));
    gone();
  });

  QUnit.test("the meter lights as many lights as it reads", (assert) => {
    const { ui, gone } = make();
    ui.apply(blank("emf", { emf: { level: 3, strength: 0.6, nearest: "g" } }));
    assert.strictEqual(ui.lights.length, DETECT.emf.lights);
    assert.deepEqual(ui.lights.map((l) => l.classList.contains("on")), [true, true, true, false, false]);
    ui.apply(blank("emf", { emf: { level: 0, strength: 0, nearest: null } }));
    assert.true(ui.lights.every((l) => !l.classList.contains("on")));
    gone();
  });

  QUnit.test("the radar is drawn without trouble, with blips and without", (assert) => {
    const { ui, gone } = make();
    ui.apply(blank("radar", { radar: { sweep: 45, blips: [] } }));
    ui.apply(blank("radar", { radar: { sweep: 200, blips: [{ key: "g", kind: "ghost", angle: 90, radius: 0.5, light: 0.7 }, { key: "c", kind: "mummy", angle: 270, radius: 1, light: 0.2 }] } }));
    const pixels = ui.canvas.getContext("2d").getImageData(0, 0, 120, 120).data;
    assert.true(pixels.some((v, i) => i % 4 === 3 && v > 0), "something was drawn");
    gone();
  });

  QUnit.test("the box shows its static, says the dial, and shows the last word, fading", (assert) => {
    const tuned = [];
    const { ui, gone } = make({ onTune: (v) => tuned.push(v) });
    ui.dial.value = "0.62";
    ui.dial.dispatchEvent(new Event("input"));
    assert.deepEqual(tuned, [0.62]);
    ui.apply(blank("box", { box: { dial: 0.62, lock: 0, hiss: 0.5, nearest: null } }), { lastWord: "LEAVE", wordAge: 0 });
    assert.strictEqual(ui.hissFill.style.width, "50%");
    assert.strictEqual(ui.word.textContent, "LEAVE");
    const fresh = Number(ui.word.style.opacity);
    ui.apply(blank("box", { box: { dial: 0.62, lock: 0, hiss: 0.5, nearest: null } }), { lastWord: "LEAVE", wordAge: 2.5 });
    assert.true(Number(ui.word.style.opacity) < fresh);
    gone();
  });

  QUnit.test("thermal vision shows the temperature, tints the picture by the chill, and marks the page", (assert) => {
    const { ui, gone } = make();
    ui.apply(blank("thermal", { thermal: { temperature: 7.25, chill: 0.8 } }));
    assert.strictEqual(ui.temperature.textContent, "7.3\u00b0C");
    assert.true(Number(ui.chill.style.opacity) > 0.3);
    assert.true(document.body.classList.contains("thermal"));
    ui.apply(blank("emf", { emf: { level: 0, strength: 0, nearest: null } }));
    assert.strictEqual(ui.chill.style.opacity, "0");
    assert.false(document.body.classList.contains("thermal"));
    gone();
  });
});
```

Open `tests.html`. You should see **468 passing tests**: 6 more.

## Step 7: The game

`main.js` makes the gadgets and the display, and tells the gadgets where everything is: every creature that is alive and every ghost that is there (a ghost that is still waiting to appear, or has gone, or was captured, is not a source). What the gadgets say has two effects on the game: the meter ticks and the box crackles (two new sounds, made in code), and **thermal vision reveals ghosts**: the line that makes a ghost clearer when the light is on it now takes the larger of that and the cold.

**Thermal vision reveals a ghost:**

In `js/main.js`, **replace** line 336:

```js
  for (const ghost of haunting.items) ghost.reveal = approach(ghost.reveal, lit.has(`g${ghost.id}`) ? 1 : 0, seconds, 0.4);
```

with:

```js
  const cold = detectors.selected === "thermal"; // thermal vision shows the cold of a ghost that is near, where the light is not on it
  for (const ghost of haunting.items) {
    const seen = cold ? thermalReveal({ position: ghost.position() }, player) : 0;
    ghost.reveal = approach(ghost.reveal, Math.max(lit.has(`g${ghost.id}`) ? 1 : 0, seen), seconds, 0.4);
  }
```

**The gadgets are made, given the sources, and their sounds played:**

In `js/main.js`, after line 357, add:

```js
// The gadgets (see detectors.js): an EMF meter, a radar, a spirit box and thermal vision, one in the hand at a time. They are told where everything is as a list of sources:
// every creature that is alive, and every ghost that is there (a ghost that is still waiting to appear, or has gone, or was captured, is not).
const detectors = new Detectors();
const detectorsUi = new DetectorsUi(document, { onSelect: (name) => detectors.select(name), onTune: (value) => detectors.tune(value) });

function detectorSources() {
  const found = [];
  for (const creature of creatures.items) if (creature.alive) found.push({ key: `c${creature.id}`, kind: creature.kind, position: creature.position });
  for (const ghost of haunting.items) {
    if (ghost.stage === "waiting" || ghost.stage === "gone" || ghost.captured) continue;
    found.push({ key: `g${ghost.id}`, kind: "ghost", position: ghost.position() });
  }
  return found;
}

systems.push((seconds, player) => {
  const frame = detectors.update(seconds, playing ? detectorSources() : [], player);
  detectorsUi.apply(frame, detectors);
  for (const event of detectors.take()) {
    if (event === "tick") audio.cue("tick", null, 0.6);
    if (event === "word") audio.cue("static", null, 0.7);
  }
});

// A ghost hidden in the room, behind and to the sides, for a gadget to find (the rounds of a later step do this by themselves).
function hideGhost() {
  const bearing = 100 + Math.random() * 160;
  haunting.summon(pointAt(player, bearing, 4 + Math.random() * 3), { delay: 0.2 });
}

```

**The key for the next gadget:**

In `js/main.js`, after line 631, add:

```js
  if (event.code === "KeyE") detectors.cycle();
  if (event.code === "KeyY") hideGhost();
```

**The developer panel** reads what the gadgets say, and has a button to hide a ghost in the room to find:

In `js/main.js`, after line 790, add:

```js
          readout("gadget", () => detectors.selected || "none"),
          readout("EMF lights", () => (detectors.frame.emf ? String(detectors.frame.emf.level) : "-")),
          readout("air", () => (detectors.frame.thermal ? `${detectors.frame.thermal.temperature.toFixed(1)} C` : "-")),
          readout("box lock", () => (detectors.frame.box ? detectors.frame.box.lock.toFixed(2) : "-")),
          control("box dial", () => detectors.dial, (value) => { detectors.tune(value); detectorsUi.dial.value = String(value); }, 0, 1, 0.005),
          action("Hide a ghost in the room (Y)", () => hideGhost()),
          action("Next gadget (E)", () => detectors.cycle()),
```

In `js/main.js`, **replace** line 929:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music, tools }; // for poking at from the console
```

with:

```js
  window.dev = { detectors, scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music, tools }; // for poking at from the console
```

**The sounds.** A tick, and the box's burst of static:

In `js/audio.js`, after line 215, add:

```js
    } else if (name === "tick") {
      // the meter's tick: a short high beep
      const beep = context.createOscillator();
      beep.type = "square";
      beep.frequency.setValueAtTime(1400, start);
      beep.connect(gain);
      beep.start(start);
      beep.stop(start + 0.05);
      gain.gain.setValueAtTime(0.12 * strength, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.05);
    } else if (name === "static") {
      // the spirit box finds a word: a burst of static with a hollow voice-like swell in it
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 2;
      filter.frequency.setValueAtTime(900, start);
      filter.frequency.linearRampToValueAtTime(1500, start + 0.5);
      filter.connect(gain);
      this._noiseSource(filter, start, 0.7);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35 * strength, start + 0.1);
      gain.gain.linearRampToValueAtTime(0, start + 0.7);
```

In `tests/audio.tests.js`, after line 108, add:

```js
  QUnit.test("the meter's tick and the box's static make sound too, in the head and not from a place", async (assert) => {
    const tick = await heard((audio) => audio.cue("tick", null, 1));
    const word = await heard((audio) => audio.cue("static", null, 1));
    assert.true(Math.max(tick.left, tick.right) > 0.001, "tick");
    assert.true(Math.max(word.left, word.right) > 0.001, "static");
  });

```

### Try it

Open `index.html?dev`. You should see:

- press **Y** to hide a ghost somewhere behind you; then **E**: the **EMF meter**, and its lights, and its tick. Turn until it is brighter
- **E** again: the **radar**: the arm sweeps and a blue blip lights where the ghost is, and fades
- **E** again: the **spirit box**: drag the dial and listen to the static: near a ghost's own frequency (the developer panel says the lock) it says a word
- **E** again: **thermal vision**: the temperature falls as you near the ghost, the picture goes cold, and the ghost shows
- **E** once more puts the gadget away

### Tests

Open `tests.html`. You should see **469 passing tests**: 1 more (the one that renders the new sounds: the game is not what the tests are about).

## Stretch goals

- **A battery** for the gadgets, like the flashlight's, so that holding them has a cost.
- **A radar that shows the walls,** from the floor and the marks the player has made.
- **A box that answers questions:** a word that depends on what the ghost wants.
- **A thermal camera** that shows each creature's own temperature, and not only the air.

## What you've learned

- How several instruments are made from the same data, each as a plain function of a list of sources and the player
- How to test a sweep that wraps at 360 degrees, and a game of tuning with random numbers that are given
- How a hash makes something that is different for each thing and the same each time
- How a gadget can change the rest of the game (what shows a ghost)

The next step makes it a game with a beginning and an end: **rounds**.
