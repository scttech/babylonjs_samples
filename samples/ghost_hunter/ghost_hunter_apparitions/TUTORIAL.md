# Tutorial: Ghost Hunter Apparitions -- A Ghost Made in Code

This is the third tutorial of the Ghost Hunter series. The game can find the floor and mark it; this sample puts something there. **A ghost, made entirely in code**: no model, no picture, no animation file. A body turned on a lathe, a shader that makes it a glow and not a solid thing, two eyes that burn, a trail of cold wisps behind it, and a low mist over every place you mark. And, as in every sample of the series, what it *does* (when it appears, how it flickers, how it turns to look at you) is **plain arithmetic of the time**, tested without a screen.

By the end you'll have:

- **A ghost's numbers**: a flicker that never repeats and never goes right out, a fade in and a fade out that do not pop, a bob, a wander about the place it haunts, and a turn to face you at a rate and not at once
- **A haunting**: the ghosts there are, made and aged and told of when they come and go, with a limit
- **Effects made in code**: a soft round puff drawn on a canvas, and from it **mist** on the floor and **a trail** behind a ghost, with particle systems
- **A shader**: a vertex shader that sways the body and makes its hem ragged, and a fragment shader that makes the middle see-through, the edge bright, the hem faded, and a band of light that climbs it
- **A ghost to look at**: the body, the eyes, the trail, brought up to date from the numbers every frame
- The ghosts in the **game**: mark the floor, and mist rises at once and a ghost appears a moment later; take the mark up and it goes
- More in the **developer panel**: sliders for how a ghost looks and behaves, and a button to summon one
- Unit tests for all of it: **168 passing tests**

**What you'll learn:** how to write a shader for Babylon.js (and what the two halves must agree on), why a see-through glowing thing is brighter at its edge, how to make something that flickers without a random number, how to make a particle system from one soft drawn puff, and how to keep *what a thing does* apart from *how it looks* so that the first can be tested.

**Before you start:** do the [AR tutorial](../ghost_hunter_ar/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished AR sample, plus placeholders for the new files and their tests:

```
ghost_hunter_apparitions/
├── index.html, tests.html   (already list the new scripts)
├── css/                     (as in the AR sample)
├── js/
│   ├── ghost.js             (placeholder -- Step 1)
│   ├── effects.js           (placeholder -- Step 2)
│   ├── ghostmesh.js         (placeholder -- Step 3)
│   ├── main.js              (changes -- Step 4)
│   └── everything else, from the AR sample
└── tests/
    ├── ghost.tests.js, ghostmesh.tests.js   (placeholders)
    └── everything else, from the AR sample
```

**Nothing that already exists is changed, except `main.js`.** The ghosts are new files that read what the game already says (`player`, the placements) and add themselves to the game's list of systems.

Open `tests.html` before you change anything. You should see **133 passing tests**: the ones of the AR sample.

### Serving the page

As before: `npx serve` in the repo root and open the sample through `http://localhost`, with **`?dev`** for the developer panel. **Mark the floor** (a tap, or a click that does not move) and wait: the ghost comes after a couple of seconds.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **The numbers of a ghost**: what it does, with no picture.
2. **Effects**: a puff, mist, and a trail.
3. **The look of a ghost**: a body, a shader, eyes.
4. **The game**: ghosts where the marks are.
5. **Try it**.

## Step 1: The numbers of a ghost

A ghost needs to do five things over time: **appear** (and not pop in), **flicker** (so that it looks like it is made of something unsteady), **bob** (it floats), **wander** about the place it haunts, and **turn to face you**. None of them needs a picture. Each is a function of the time that has passed (or of the angle it is at and the angle it should be at), so each can be tested on its own, and the shader and the particle systems only have to *read* the answer.

All the numbers are in one table, `GHOST`, as in every part of this series: how tall it is, how bright it can be, how long it takes to appear and to go, how fast it flickers, how far it wanders. The developer panel will have a slider for most of them.

### The functions

Open `js/ghost.js` (the placeholder) and **replace the TODO line** with:

```js
// A ghost, as numbers. How it flickers, bobs, drifts, turns to look at the player, and fades in and out is plain arithmetic of the time,
// with no Babylon.js in it, so that the tests can say what a ghost does at any moment. How it looks is in ghostmesh.js, which only
// reads what is worked out here. See ../tests/ghost.tests.js.

const GHOST = {
  height: 1.8, // metres: a ghost is a little taller than a person
  hover: 0.25, // how far above the floor the hem of it floats
  opacity: 0.8, // the most it can show (1 would be a solid thing)
  fadeIn: 1.6, // seconds to appear
  fadeOut: 2.2, // seconds to vanish
  life: 28, // seconds before it fades away of itself
  summonDelay: 2.5, // seconds from a place being marked to the ghost beginning to appear
  flickerHz: 6, // how fast the light of it wavers
  flickerDepth: 0.4, // how far it dims at its dimmest (0 never, 1 right out)
  bobHz: 0.45, // how often it rises and falls
  bobHeight: 0.14,
  driftRadius: 0.9, // metres: how far it wanders about the place it haunts
  driftHz: 0.1,
  turnRate: 2.2, // radians a second: how fast it turns to face you
  max: 4, // how many at once
};

const TAU = Math.PI * 2;

// A number from 0 up to 1 that is the same for the same input and looks random: a ghost's own phase comes from its seed.
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// How much of its light a ghost has at a moment, from 1 down to 1 - depth. Three waves that do not fit together, so it never repeats
// in any way that can be seen: it wavers, and now and then it nearly goes out.
function flicker(time, seed = 0, table = GHOST) {
  const t = time * table.flickerHz * TAU + hash(seed) * TAU;
  const wave = 0.5 + 0.5 * (0.5 * Math.sin(t) + 0.3 * Math.sin(t * 2.31 + 1.7) + 0.2 * Math.sin(t * 0.37 + 4.1));
  const dip = Math.pow(Math.max(0, Math.sin(time * 0.9 + hash(seed + 1) * TAU)), 24); // a rare, sharp dip
  return 1 - table.flickerDepth * Math.max(0, Math.min(1, 1 - wave * (1 - dip) - dip * 0.6));
}

// How much of a ghost is there: 0 before it begins, up to 1 as it appears, 1 while it is there, and down to 0 as it fades (from
// `fadeStart`, the time it began to go, or never). Smooth at both ends: it does not pop.
function envelope(age, fadeStart, table = GHOST) {
  if (age <= 0) return 0;
  const smooth = (x) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
  const rising = smooth(age / table.fadeIn);
  if (fadeStart === null || age < fadeStart) return rising;
  if (age >= fadeStart + table.fadeOut) return 0;
  return rising * smooth(1 - (age - fadeStart) / table.fadeOut);
}

// How high the ghost is above where it hovers: it rises and falls.
function bob(time, seed = 0, table = GHOST) {
  return Math.sin(time * table.bobHz * TAU + hash(seed + 2) * TAU) * table.bobHeight;
}

// Where it has drifted to from the place it haunts, [x, z]: a slow loop that does not close, so that it wanders and does not circle.
function drift(time, seed = 0, table = GHOST) {
  const a = time * table.driftHz * TAU + hash(seed + 3) * TAU;
  return [Math.sin(a) * table.driftRadius, Math.sin(a * 0.73 + 1.3) * table.driftRadius * 0.8];
}

// The yaw (a turn about the vertical, from straight ahead towards the right) that faces from one point to another.
function facingYaw(from, to) {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}

// From one angle towards another by at most `step` radians, the short way round.
function turnToward(current, target, step) {
  let difference = (target - current) % TAU;
  if (difference > Math.PI) difference -= TAU;
  if (difference < -Math.PI) difference += TAU;
  return Math.abs(difference) <= step ? target : current + Math.sign(difference) * step;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST, hash, flicker, envelope, bob, drift, facingYaw, turnToward };
} else {
  Object.assign(window, { GHOST, hash, flicker, envelope, bob, drift, facingYaw, turnToward });
}
```

Things to notice:

- **`hash` makes a number that looks random and is not.** The same input always gives the same output (`sin` of a large number, with the whole part thrown away). A ghost's **seed** goes through it to give it its own phase, so that two ghosts do not flicker, bob and wander in step, and a test can still say exactly what a ghost does.
- **`flicker` adds three waves that do not fit together** (their speeds are not whole-number multiples of each other, so the pattern does not repeat in any way you can see), and a rare, sharp **dip**, from `sin` raised to a high power, when the light nearly goes out. It always lies between `1 - flickerDepth` and 1. A test runs it for two minutes and says so.
- **`envelope` is how much of the ghost is there**: 0 before it begins, a smooth rise (`smooth` is the S-curve `3x² − 2x³`: slow, fast, slow, so it neither pops nor lurches) over `fadeIn` seconds, and, from the moment it starts to go, a smooth fall over `fadeOut` seconds to nothing, **exactly** nothing (the last line before the return makes sure of it: arithmetic alone left a number a hair above zero).
- **`drift` is two sines that do not fit together**, so the ghost wanders about its place and does not circle it.
- **`turnToward` turns the short way round** and **arrives** when it is closer than a step: it does not overshoot, and does not wobble about the target.
- **`facingYaw`** is the angle that faces from one point to another, with 0 straight ahead along z and a quarter turn to the right along x: the same convention as the rest of the game.

### The ghost itself

An `Apparition` is one ghost: where it haunts (`home`), a seed, how long until it begins (`delay`), and the mark it belongs to (`placement`). Its **age starts negative** by the delay, so "waiting" is just "age is below zero", and every function of the time uses `max(0, age)`.

In `js/ghost.js`, find the export block (lines 75 to 82) and **delete it**. Add this in its place, and the export block under it:

```js
class Apparition {
  // `home` is the place it haunts, [x, y, z] (y is the floor). `delay` is the seconds until it begins to appear.
  constructor({ id, home, seed = id, delay = 0, placement = null, table = GHOST }) {
    this.id = id;
    this.home = home.slice();
    this.seed = seed;
    this.placement = placement; // the mark it haunts, if any
    this.table = table;
    this.age = -delay; // negative: it has not begun
    this.fadeStart = null; // the age at which it began to go
    this.yaw = 0;
    this.done = false;
  }

  // The stage it is at: "waiting", "appearing", "present", "fading", "gone".
  get stage() {
    if (this.done) return "gone";
    if (this.age <= 0) return "waiting";
    if (this.fadeStart !== null && this.age >= this.fadeStart) return "fading";
    return this.age < this.table.fadeIn ? "appearing" : "present";
  }

  // Where it is now.
  position() {
    const [dx, dz] = drift(Math.max(0, this.age), this.seed, this.table);
    return [this.home[0] + dx, this.home[1] + this.table.hover + bob(Math.max(0, this.age), this.seed, this.table), this.home[2] + dz];
  }

  // How much it shows, from 0 to the table's opacity: there, and flickering.
  opacity() {
    return this.table.opacity * envelope(this.age, this.fadeStart, this.table) * flicker(Math.max(0, this.age), this.seed, this.table);
  }

  // Starts it going, now (if it has not begun, it never will).
  vanish() {
    if (this.age <= 0) {
      this.done = true; // it never showed itself: it is simply not coming
      return;
    }
    if (this.fadeStart === null) this.fadeStart = Math.max(this.age, this.table.fadeIn);
  }

  // Time going by: it ages, turns towards the player, and goes when it has faded (or has lived its life).
  update(seconds, playerPosition) {
    if (this.done) return;
    this.age += seconds;
    if (this.fadeStart === null && this.age >= this.table.life) this.vanish();
    if (this.age > 0) this.yaw = turnToward(this.yaw, facingYaw(this.position(), playerPosition), this.table.turnRate * seconds);
    if (this.fadeStart !== null && this.age >= this.fadeStart + this.table.fadeOut) this.done = true;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST, hash, flicker, envelope, bob, drift, facingYaw, turnToward, Apparition };
} else {
  Object.assign(window, { GHOST, hash, flicker, envelope, bob, drift, facingYaw, turnToward, Apparition });
}
```

Things to notice:

- **`stage` is derived, not stored**: waiting, appearing, present, fading, gone are what the age and `fadeStart` say. Nothing can get out of step.
- **`vanish` fades it from where it is.** If it is still appearing it finishes appearing first (a ghost that turned round half-formed would look like a mistake), and if it had not begun, it simply never comes.
- **`update` does four things in order**: age; fade at the end of its life; turn towards the player; finish. The turn uses the position the ghost is at *now*, so it faces the player as it wanders.
- **It needs only the player's position**, a plain array. It does not know about cameras, phones or Babylon.js.

### The haunting

The ghosts there are. `summon` makes one, and if there are more than the table allows, the oldest begins to go (it fades, it is not cut). Like the placements of the last sample, the haunting **tells of every change** and knows nothing about how a ghost looks.

In `js/ghost.js`, find the export block (lines 127 to 134) and **delete it**. Add this in its place, and the export block under it:

```js
// The ghosts there are. It makes them, ages them, and tells of every one that comes and goes, and knows nothing of how they look.
class Haunting {
  constructor(table = GHOST) {
    this.table = table;
    this.items = [];
    this.nextId = 1;
    this.listeners = [];
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  _tell(type, item) {
    for (const callback of this.listeners) callback({ type, item });
  }

  // A ghost to haunt a place. When there are too many the oldest is sent away, and there is a new one anyway.
  summon(home, { placement = null, delay = this.table.summonDelay } = {}) {
    const ghost = new Apparition({ id: this.nextId++, home, placement, delay, table: this.table });
    this.items.push(ghost);
    const present = this.items.filter((item) => !item.done && item.fadeStart === null);
    if (present.length > this.table.max) present[0].vanish();
    this._tell("added", ghost);
    return ghost;
  }

  // Sends away the ghosts of a mark (it was taken up), or all of them.
  banish(placement) {
    for (const item of this.items) if (placement === undefined || item.placement === placement) item.vanish();
  }

  update(seconds, player) {
    for (const item of this.items) item.update(seconds, player.position);
    for (const item of this.items.filter((other) => other.done)) this._tell("removed", item);
    this.items = this.items.filter((item) => !item.done);
  }

  // The nearest ghost to a point that has shown itself, with how far.
  nearest(point) {
    let best = null;
    for (const item of this.items) {
      if (item.stage === "waiting" || item.stage === "gone") continue;
      const position = item.position();
      const distance = Math.hypot(position[0] - point[0], position[1] - point[1], position[2] - point[2]);
      if (!best || distance < best.distance) best = { item, distance };
    }
    return best;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST, hash, flicker, envelope, bob, drift, facingYaw, turnToward, Apparition, Haunting };
} else {
  Object.assign(window, { GHOST, hash, flicker, envelope, bob, drift, facingYaw, turnToward, Apparition, Haunting });
}
```

Things to notice:

- **`banish(placement)`** sends away the ghosts of one mark (the player took it up), or with no argument, all of them.
- **A ghost that is waiting does not count** as the nearest ghost: you cannot be told that something is close that has not shown itself.
- **`update` tells of the ones that have gone before it forgets them**, so whoever is listening can dispose of the picture.

### Tests

Open `tests/ghost.tests.js` and **replace the TODO line** with:

```js
QUnit.module("hash, flicker and envelope", () => {
  QUnit.test("a hash is the same for the same input, and between 0 and 1", (assert) => {
    assert.strictEqual(hash(5), hash(5));
    assert.notStrictEqual(hash(5), hash(6));
    for (let i = 0; i < 200; i++) assert.true(hash(i) >= 0 && hash(i) < 1);
  });

  QUnit.test("a flicker is never brighter than 1 or dimmer than the table says, however long it goes on", (assert) => {
    let lowest = 1, highest = 0;
    for (let t = 0; t < 120; t += 0.013) {
      const value = flicker(t, 3);
      lowest = Math.min(lowest, value);
      highest = Math.max(highest, value);
    }
    assert.true(highest <= 1 + 1e-9);
    assert.true(lowest >= 1 - GHOST.flickerDepth - 1e-9);
    assert.true(highest - lowest > 0.2, "it does flicker");
  });

  QUnit.test("a flicker with a depth of 0 does not", (assert) => {
    const still = { ...GHOST, flickerDepth: 0 };
    for (let t = 0; t < 10; t += 0.1) assert.strictEqual(flicker(t, 1, still), 1);
  });

  QUnit.test("two ghosts do not flicker together", (assert) => {
    let same = 0;
    for (let t = 0; t < 10; t += 0.1) if (Math.abs(flicker(t, 1) - flicker(t, 2)) < 1e-6) same += 1;
    assert.true(same < 5);
  });

  QUnit.test("a ghost is not there before it begins, appears smoothly, stays, and goes smoothly", (assert) => {
    assert.strictEqual(envelope(-1, null), 0);
    assert.strictEqual(envelope(0, null), 0);
    const half = envelope(GHOST.fadeIn / 2, null);
    assert.true(Math.abs(half - 0.5) < 1e-9, "halfway is half");
    assert.strictEqual(envelope(GHOST.fadeIn, null), 1);
    assert.strictEqual(envelope(100, null), 1);
    assert.strictEqual(envelope(10, 10), 1, "at the moment it starts to go it is all there");
    assert.true(Math.abs(envelope(10 + GHOST.fadeOut / 2, 10) - 0.5) < 1e-9);
    assert.strictEqual(envelope(10 + GHOST.fadeOut, 10), 0);
    assert.strictEqual(envelope(50, 10), 0);
  });

  QUnit.test("it never goes up when it should be going down", (assert) => {
    let last = 1;
    for (let age = 10; age < 10 + GHOST.fadeOut; age += 0.05) {
      const value = envelope(age, 10);
      assert.true(value <= last + 1e-12);
      last = value;
    }
  });
});

QUnit.module("bob, drift and turning", () => {
  QUnit.test("it bobs by no more than the table's height", (assert) => {
    for (let t = 0; t < 30; t += 0.1) assert.true(Math.abs(bob(t, 4)) <= GHOST.bobHeight + 1e-9);
  });

  QUnit.test("it drifts about its place, and no further than the radius", (assert) => {
    let wandered = 0;
    for (let t = 0; t < 120; t += 0.5) {
      const [x, z] = drift(t, 7);
      assert.true(Math.hypot(x, z) <= GHOST.driftRadius * 1.5);
      wandered = Math.max(wandered, Math.hypot(x, z));
    }
    assert.true(wandered > GHOST.driftRadius / 2);
  });

  QUnit.test("facingYaw is 0 straight ahead (z) and a quarter turn to the right (x)", (assert) => {
    assert.strictEqual(facingYaw([0, 0, 0], [0, 0, 5]), 0);
    assert.true(Math.abs(facingYaw([0, 0, 0], [5, 0, 0]) - Math.PI / 2) < 1e-9);
    assert.true(Math.abs(Math.abs(facingYaw([0, 0, 0], [0, 0, -5])) - Math.PI) < 1e-9);
  });

  QUnit.test("it turns towards a direction by a step, and arrives", (assert) => {
    assert.strictEqual(turnToward(0, 1, 0.25), 0.25);
    assert.strictEqual(turnToward(0, 0.1, 0.25), 0.1);
    assert.strictEqual(turnToward(0, -1, 0.25), -0.25);
  });

  QUnit.test("it turns the short way round the back", (assert) => {
    const result = turnToward(3, -3, 0.1); // the short way from 3 to -3 passes through pi
    assert.true(result > 3, "it goes up, through pi, and not back down through 0");
    assert.strictEqual(turnToward(3, -3, 0.5), -3, "and a step that is far enough arrives");
  });
});

QUnit.module("Apparition", () => {
  const home = [2, 0, 3];

  QUnit.test("waits for its delay, then appears, is there, and goes", (assert) => {
    const ghost = new Apparition({ id: 1, home, delay: 2 });
    assert.strictEqual(ghost.stage, "waiting");
    assert.strictEqual(ghost.opacity(), 0);
    ghost.update(2.1, [0, 1.4, 0]);
    assert.strictEqual(ghost.stage, "appearing");
    ghost.update(GHOST.fadeIn, [0, 1.4, 0]);
    assert.strictEqual(ghost.stage, "present");
    assert.true(ghost.opacity() > 0);
    ghost.vanish();
    ghost.update(0.01, [0, 1.4, 0]);
    assert.strictEqual(ghost.stage, "fading");
    ghost.update(GHOST.fadeOut + 0.1, [0, 1.4, 0]);
    assert.strictEqual(ghost.stage, "gone");
    assert.true(ghost.done);
  });

  QUnit.test("it fades of itself at the end of its life", (assert) => {
    const ghost = new Apparition({ id: 1, home, delay: 0, table: { ...GHOST, life: 5 } });
    ghost.update(0.1, [0, 0, 0]);
    for (let i = 0; i < 100; i++) ghost.update(0.1, [0, 0, 0]);
    assert.true(ghost.fadeStart !== null);
    for (let i = 0; i < 40; i++) ghost.update(0.1, [0, 0, 0]);
    assert.true(ghost.done);
  });

  QUnit.test("it is never more than the table's opacity", (assert) => {
    const ghost = new Apparition({ id: 2, home, delay: 0 });
    for (let i = 0; i < 400; i++) {
      ghost.update(0.05, [0, 0, 0]);
      assert.true(ghost.opacity() <= GHOST.opacity + 1e-9);
      assert.true(ghost.opacity() >= 0);
    }
  });

  QUnit.test("it floats above its place, and stays near it", (assert) => {
    const ghost = new Apparition({ id: 3, home, delay: 0 });
    for (let i = 0; i < 200; i++) {
      ghost.update(0.1, [0, 0, 0]);
      const [x, y, z] = ghost.position();
      assert.true(y >= GHOST.hover - GHOST.bobHeight - 1e-9);
      assert.true(Math.hypot(x - home[0], z - home[2]) < GHOST.driftRadius * 1.5);
    }
  });

  QUnit.test("it turns to face the player, and does not snap", (assert) => {
    const ghost = new Apparition({ id: 4, home: [0, 0, 5], delay: 0 });
    ghost.update(0.1, [5, 1.4, 5]); // the player is far to one side
    const first = ghost.yaw;
    assert.true(Math.abs(first) <= GHOST.turnRate * 0.1 + 1e-9, "one step only");
    for (let i = 0; i < 100; i++) ghost.update(0.1, [5, 1.4, 5]);
    assert.true(Math.abs(ghost.yaw - facingYaw(ghost.position(), [5, 1.4, 5])) < 0.05, "and in the end it faces the player");
  });

  QUnit.test("a ghost that has not shown itself is simply not coming when it is sent away", (assert) => {
    const ghost = new Apparition({ id: 5, home, delay: 3 });
    ghost.vanish();
    assert.true(ghost.done);
  });

  QUnit.test("sent away once it is there, it fades and does not pop", (assert) => {
    const ghost = new Apparition({ id: 6, home, delay: 0 });
    ghost.update(5, [0, 0, 0]);
    ghost.vanish();
    ghost.update(GHOST.fadeOut / 2, [0, 0, 0]);
    assert.false(ghost.done);
    assert.true(ghost.opacity() > 0 && ghost.opacity() < GHOST.opacity);
  });
});

QUnit.module("Haunting", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("summons a ghost to haunt a place, and tells of it", (assert) => {
    const haunting = new Haunting();
    const told = [];
    haunting.onChange(({ type, item }) => told.push(`${type} ${item.id}`));
    const ghost = haunting.summon([1, 0, 2], { placement: 7 });
    assert.strictEqual(ghost.placement, 7);
    assert.strictEqual(ghost.age, -GHOST.summonDelay);
    assert.deepEqual(told, ["added 1"]);
  });

  QUnit.test("tells of a ghost that has gone, and forgets it", (assert) => {
    const haunting = new Haunting();
    const told = [];
    haunting.onChange(({ type }) => told.push(type));
    haunting.summon([0, 0, 3], { delay: 0 }).vanish();
    haunting.update(0.1, player);
    haunting.update(10, player);
    assert.deepEqual(told, ["added", "removed"]);
    assert.strictEqual(haunting.items.length, 0);
  });

  QUnit.test("sends away the ghosts of a mark that was taken up, and only those", (assert) => {
    const haunting = new Haunting();
    const a = haunting.summon([0, 0, 3], { placement: 1, delay: 0 });
    const b = haunting.summon([3, 0, 3], { placement: 2, delay: 0 });
    haunting.update(5, player);
    haunting.banish(1);
    assert.true(a.fadeStart !== null);
    assert.strictEqual(b.fadeStart, null);
    haunting.banish();
    assert.true(b.fadeStart !== null);
  });

  QUnit.test("when there are too many, the oldest begins to go", (assert) => {
    const haunting = new Haunting({ ...GHOST, max: 2 });
    const first = haunting.summon([0, 0, 3], { delay: 0 });
    haunting.update(3, player);
    haunting.summon([1, 0, 3], { delay: 0 });
    haunting.summon([2, 0, 3], { delay: 0 });
    assert.true(first.fadeStart !== null);
  });

  QUnit.test("finds the nearest ghost that has shown itself", (assert) => {
    const haunting = new Haunting();
    assert.strictEqual(haunting.nearest([0, 0, 0]), null);
    const waiting = haunting.summon([0, 0, 1], { delay: 100 });
    const shown = haunting.summon([0, 0, 6], { delay: 0 });
    haunting.update(3, player);
    const near = haunting.nearest([0, 0, 0]);
    assert.strictEqual(near.item, shown, "a ghost that has not shown itself does not count");
    assert.true(near.distance > 5);
    assert.true(waiting.stage === "waiting");
  });

  QUnit.test("the table of the game is sensible", (assert) => {
    assert.true(GHOST.fadeIn > 0 && GHOST.fadeOut > 0);
    assert.true(GHOST.opacity > 0 && GHOST.opacity <= 1);
    assert.true(GHOST.flickerDepth >= 0 && GHOST.flickerDepth <= 1);
    assert.true(GHOST.life > GHOST.fadeIn);
    assert.true(GHOST.max >= 1);
  });
});
```

Things to notice:

- **Properties, not samples.** The flicker test does not ask for a value at one moment: it runs two minutes of time and says that the value never leaves its range. The envelope test says that it never goes *up* while a ghost is going down.
- **Two ghosts do not flicker together** is a test too: it is the thing the seed is for.
- **The last module reads the table**: a ghost must take longer to live than to appear, and no more may be summoned than the table allows.

Open `tests.html`. You should see **157 passing tests**: 24 more.

## Step 2: Effects

No picture files. A soft round puff is **drawn on a canvas** (a white middle fading to nothing at the edge, which is a radial gradient) and used as the texture of every bit of mist and every wisp of the trail. A particle system makes many copies, each a different size and age.

Open `js/effects.js` (the placeholder) and **replace the TODO line** with:

```js
// Effects made in code: no pictures to load. A soft round puff is drawn on a canvas once, and every bit of mist and every wisp of a
// ghost's trail is that puff, made large or small, light or faint, by a particle system. The numbers are in a table, so that they can be
// tuned in the developer panel and read by the tests. See ../tests/effects.tests.js.

const EFFECTS = {
  mist: {
    rate: 9, // puffs a second
    life: [3.5, 6], // seconds a puff lasts: the shortest and the longest
    size: [0.8, 1.6], // metres across
    alpha: 0.11, // how thick a puff is at its thickest (mist is mostly nothing)
    radius: 0.9, // how far from the place it spreads
    height: 0.2, // how deep a layer it is
    rise: 0.04, // metres a second it creeps upwards
    color: [0.55, 0.8, 0.9],
  },
  trail: {
    rate: 26,
    life: [0.7, 1.5],
    size: [0.1, 0.26],
    alpha: 0.55,
    color: [0.3, 0.9, 1],
  },
};

// A soft round puff, white in the middle and clear at the edge, as a texture drawn on a canvas.
function softTexture(scene, size = 64) {
  const texture = new BABYLON.DynamicTexture("soft-puff", { width: size, height: size }, scene, false);
  texture.hasAlpha = true;
  const context = texture.getContext();
  const middle = size / 2;
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.update();
  return texture;
}

const color4 = (rgb, alpha) => new BABYLON.Color4(rgb[0], rgb[1], rgb[2], alpha);

// A low layer of mist on the floor at a point, creeping up and spreading, thickest in the middle of its life.
function createMist(scene, point, texture, table = EFFECTS.mist) {
  const system = new BABYLON.ParticleSystem("mist", 120, scene);
  system.particleTexture = texture;
  system.emitter = new BABYLON.Vector3(point[0], point[1], point[2]);
  system.minEmitBox = new BABYLON.Vector3(-table.radius, 0, -table.radius);
  system.maxEmitBox = new BABYLON.Vector3(table.radius, table.height, table.radius);
  system.direction1 = new BABYLON.Vector3(-0.05, table.rise, -0.05);
  system.direction2 = new BABYLON.Vector3(0.05, table.rise * 1.5, 0.05);
  system.minLifeTime = table.life[0];
  system.maxLifeTime = table.life[1];
  system.minSize = table.size[0];
  system.maxSize = table.size[1];
  system.emitRate = table.rate;
  system.color1 = color4(table.color, table.alpha);
  system.color2 = color4(table.color, table.alpha * 0.6);
  system.colorDead = color4(table.color, 0);
  system.minAngularSpeed = -0.2;
  system.maxAngularSpeed = 0.2;
  system.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;
  system.start();
  return system;
}

// A trail of cold wisps behind a mesh (the body of a ghost). The puffs are left where they are made, so a ghost that moves draws a trail.
function createTrail(scene, mesh, texture, table = EFFECTS.trail) {
  const system = new BABYLON.ParticleSystem("trail", 200, scene);
  system.particleTexture = texture;
  system.emitter = mesh;
  system.minEmitBox = new BABYLON.Vector3(-0.22, 0.1, -0.22);
  system.maxEmitBox = new BABYLON.Vector3(0.22, 1.1, 0.22);
  system.direction1 = new BABYLON.Vector3(-0.05, -0.1, -0.05);
  system.direction2 = new BABYLON.Vector3(0.05, 0.05, 0.05);
  system.minLifeTime = table.life[0];
  system.maxLifeTime = table.life[1];
  system.minSize = table.size[0];
  system.maxSize = table.size[1];
  system.emitRate = table.rate;
  system.color1 = color4(table.color, table.alpha);
  system.color2 = color4(table.color, table.alpha * 0.5);
  system.colorDead = color4(table.color, 0);
  system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  system.start();
  return system;
}

// Lets an effect go: it stops making puffs, and is taken away when the last of them has faded.
function releaseEffect(system) {
  system.stop();
  system.disposeOnStop = true;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EFFECTS, softTexture, createMist, createTrail, releaseEffect };
} else {
  Object.assign(window, { EFFECTS, softTexture, createMist, createTrail, releaseEffect });
}
```

Things to notice:

- **The numbers are in a table** (`EFFECTS`), one section for the mist and one for the trail: how many puffs a second, how long each lasts (a shortest and a longest), how big, how thick, what colour.
- **Mist is mostly nothing**: its puffs are at most 11% opaque. Stacked, they make a haze; any more and the floor of the room vanishes under a white sheet.
- **Mist is emitted from a box** at a point, on the floor, and creeps upwards. A `ParticleSystem` whose emitter is a `Vector3` emits there. The trail's emitter is a **mesh** (the ghost's body), and the box is in the mesh's own space, so it follows the ghost; and since puffs are left where they are made, a ghost that moves draws a trail.
- **`colorDead` has an alpha of 0**: a puff fades out to nothing as it ages, which is what makes it a puff and not a dot.
- **`releaseEffect` stops, it does not dispose.** A system that is stopped makes no new puffs, and with `disposeOnStop` is taken away when the last one has faded, so taking a mark up does not make the mist vanish in a frame.

No tests of their own yet: the tests of this step come with the look of the ghost, since they need the scene.

## Step 3: The look of a ghost

A ghost is not a solid thing. It is **see-through in the middle and bright at the edge**. The edge is where you are looking *along* the surface (the angle between the line of sight and the surface is small), and that is where a thin shell of glowing stuff has the most of it in front of your eye. In a shader that is `1 - |dot(normal, toEye)|`, raised to a power to tighten it. The rest of the look is adding things to that: the hem fades to nothing, the body sways, and a faint band of light climbs it.

The file is built in four pieces: the table of its look, the two halves of the shader, the material, and the class.

### The table

Open `js/ghostmesh.js` (the placeholder) and **replace the TODO line** with:

```js
// How a ghost looks, made in code: a body turned on a lathe from a profile, and a shader that makes it a glow and not a solid thing. It
// is see-through in the middle and bright at its edges (the edge is where you look along the surface), it fades towards its hem, its
// hem is ragged and sways, and a faint band of light runs up it. Two eyes burn in the head, and a trail of wisps follows it. All of it is
// driven by what ghost.js works out, and nothing here decides anything. See ../tests/ghostmesh.tests.js.

const GHOST_LOOK = {
  profile: [[0.02, 0], [0.34, 0.04], [0.46, 0.28], [0.42, 0.62], [0.33, 1.0], [0.24, 1.3], [0.2, 1.42], [0.25, 1.52], [0.23, 1.64], [0.12, 1.76], [0.01, 1.8]], // [radius, height] from the hem up
  tessellation: 28,
  smoothing: 5, // points between each pair of corners of the profile
  eyeHeight: 1.54,
  eyeApart: 0.085,
  eyeForward: 0.19,
  eyeSize: 0.07,
  color: [0.35, 0.85, 1], // the cold glow
  eyeColor: [0.85, 1, 1],
};

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST_LOOK };
} else {
  Object.assign(window, { GHOST_LOOK });
}
```

Things to notice:

- **The shape is a profile**: pairs of `[radius, height]` from the hem up to the top of the head, the outline of half of the ghost. Turned round the vertical axis (a lathe) it makes the body. A row of corners is easy to read and to change; it is smoothed in a moment.
- **The eyes, the colours and the size are numbers too**: `eyeHeight` and `eyeApart` place them in the head; `color` is the cold glow, and the eyes are nearly white.

### The shader

A shader is a small program that runs on the graphics card, **twice for every body**: a **vertex shader** for every point of the mesh (where does this point go?) and a **fragment shader** for every pixel it covers (what colour is it, and how see-through?). They are written in GLSL, as text. The vertex shader hands things to the fragment shader through **varyings**, and **both halves must declare the same ones**, with the same types: a test says so.

In `js/ghostmesh.js`, find the export block (lines 18 to 25) and **delete it**. Add this in its place, and the export block under it:

```js
const GHOST_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform float time;
uniform float phase;
uniform float height;
varying vec3 vNormalW;
varying vec3 vPositionW;
varying float vHeight;
void main() {
  vec3 p = position;
  float h = clamp(p.y / height, 0.0, 1.0);
  float sway = 1.0 - h;
  float around = atan(p.z, p.x);
  p.x += sin(time * 1.6 + p.y * 3.0 + phase) * 0.07 * sway;
  p.z += cos(time * 1.3 + p.y * 2.5 + phase) * 0.07 * sway;
  float hem = smoothstep(0.3, 0.0, h);
  p.xz *= 1.0 + sin(around * 7.0 + time * 2.0 + phase) * 0.2 * hem;
  p.y -= hem * (0.5 + 0.5 * sin(around * 5.0 + time * 1.2 + phase)) * 0.28;
  vec4 worldPosition = world * vec4(p, 1.0);
  vPositionW = worldPosition.xyz;
  vNormalW = normalize(mat3(world[0].xyz, world[1].xyz, world[2].xyz) * normal);
  vHeight = h;
  gl_Position = worldViewProjection * vec4(p, 1.0);
}
`;

const GHOST_FRAGMENT = `
precision highp float;
varying vec3 vNormalW;
varying vec3 vPositionW;
varying float vHeight;
uniform vec3 cameraPosition;
uniform vec3 color;
uniform float opacity;
uniform float time;
void main() {
  vec3 toEye = normalize(cameraPosition - vPositionW);
  float edge = 1.0 - abs(dot(normalize(vNormalW), toEye));
  float rim = pow(edge, 1.7);
  float fade = smoothstep(0.0, 0.4, vHeight);
  float band = 0.85 + 0.15 * sin(vHeight * 55.0 - time * 3.0);
  float strength = (0.16 + 0.84 * rim) * fade * band * opacity;
  vec3 glow = mix(color * 0.45, vec3(0.85, 1.0, 1.0), rim);
  gl_FragColor = vec4(glow, strength);
}
`;

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST_LOOK, GHOST_VERTEX, GHOST_FRAGMENT };
} else {
  Object.assign(window, { GHOST_LOOK, GHOST_VERTEX, GHOST_FRAGMENT });
}
```

Things to notice:

- **The vertex shader moves the points**, which is why the ghost is alive without an animation: the **sway** is a sine of the time and the height, in x and z, bigger towards the hem (`sway = 1 - h`); the **hem** is ragged because the points near the bottom are pushed in and out by a sine of their *angle round the body* (`atan(z, x)`), and dropped a little by another one, so the bottom is a ragged skirt and not a ring.
- **`mat3(world[0].xyz, world[1].xyz, world[2].xyz)`** and not `mat3(world)`: the shader language of WebGL 1 does not let a 3x3 matrix be made from a 4x4. (It works on some computers and fails on others, which is the worst way for a shader to fail.)
- **The fragment shader's alpha is the look.** `rim` is the edge, `fade` takes the hem to nothing, `band` is the faint band climbing the body (a sine of the height and the time), and `opacity` is the number from `ghost.js`: the flicker and the fade in and out arrive here as one uniform.
- **`gl_FragColor.a` is a strength, not an opacity**: the material adds its light to the picture (see below), so it can only make things brighter.

### The material

In `js/ghostmesh.js`, find the export block (lines 69 to 76) and **delete it**. Add this in its place, and the export block under it:

```js
// The shader is put where Babylon.js looks for them, once.
function registerGhostShader() {
  BABYLON.Effect.ShadersStore.ghostVertexShader = GHOST_VERTEX;
  BABYLON.Effect.ShadersStore.ghostFragmentShader = GHOST_FRAGMENT;
}

function ghostMaterial(scene, phase, look = GHOST_LOOK, height = GHOST.height) {
  const material = new BABYLON.ShaderMaterial("ghost", scene, "ghost", {
    attributes: ["position", "normal"],
    uniforms: ["world", "worldViewProjection", "time", "phase", "height", "cameraPosition", "color", "opacity"],
    needAlphaBlending: true,
  });
  material.backFaceCulling = false; // see the inside of the back of it through the front
  material.alphaMode = BABYLON.Engine.ALPHA_ADD;
  material.setFloat("phase", phase);
  material.setFloat("height", height);
  material.setFloat("time", 0);
  material.setFloat("opacity", 0);
  material.setColor3("color", new BABYLON.Color3(...look.color));
  material.setVector3("cameraPosition", BABYLON.Vector3.Zero());
  return material;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST_LOOK, GHOST_VERTEX, GHOST_FRAGMENT, registerGhostShader, ghostMaterial };
} else {
  Object.assign(window, { GHOST_LOOK, GHOST_VERTEX, GHOST_FRAGMENT, registerGhostShader, ghostMaterial });
}
```

Things to notice:

- **Babylon.js finds a shader by name** in `Effect.ShadersStore`: `ghostVertexShader` and `ghostFragmentShader` are the shaders called `"ghost"`. `registerGhostShader` puts them there, once.
- **`backFaceCulling = false`**: both sides of the shell are drawn, so you see the inside of the back of it through the front, which is what makes it look like a thing with a volume and not a sheet.
- **`ALPHA_ADD`** adds the ghost's light to what is behind it, whatever that is: the camera's picture, or the dark. A ghost is never darker than what it is in front of, which is right, and it works on any background.
- **A uniform is set on the material** (`setFloat`, `setColor3`, `setVector3`), and the ones that change every frame (`time`, `opacity`, `cameraPosition`) are set again by the body.

### The body

In `js/ghostmesh.js`, find the export block (lines 92 to 99) and **delete it**. Add this in its place, and the export block under it:

```js
// A ghost to look at: a root that is moved and turned, with a body, two eyes and a trail of wisps. `apparition` is the numbers of it
// (ghost.js), and `texture` the soft puff the trail is made of.
class GhostBody {
  constructor(scene, apparition, texture, look = GHOST_LOOK) {
    this.scene = scene;
    this.apparition = apparition;
    this.look = look;
    this.root = new BABYLON.TransformNode(`ghost-${apparition.id}`, scene);
    this.root.rotationQuaternion = null;

    const corners = look.profile.map(([radius, y]) => new BABYLON.Vector3(radius, y, 0));
    const shape = BABYLON.Curve3.CreateCatmullRomSpline(corners, look.smoothing, false).getPoints(); // the corners made into a smooth curve
    this.body = BABYLON.MeshBuilder.CreateLathe(`ghost-body-${apparition.id}`, { shape, tessellation: look.tessellation, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    this.body.parent = this.root;
    this.body.isPickable = false;
    this.material = ghostMaterial(scene, apparition.seed * 1.7, look, apparition.table.height);
    this.body.material = this.material;

    this.eyeMaterial = new BABYLON.StandardMaterial(`ghost-eyes-${apparition.id}`, scene);
    this.eyeMaterial.disableLighting = true;
    this.eyeMaterial.emissiveColor = new BABYLON.Color3(...look.eyeColor);
    this.eyes = [-1, 1].map((side) => {
      const eye = BABYLON.MeshBuilder.CreateSphere(`ghost-eye-${apparition.id}-${side}`, { diameter: look.eyeSize, segments: 8 }, scene);
      eye.parent = this.root;
      eye.position.set(side * look.eyeApart, look.eyeHeight, look.eyeForward);
      eye.material = this.eyeMaterial;
      eye.isPickable = false;
      return eye;
    });

    this.trail = createTrail(scene, this.body, texture);
    this.trailRate = this.trail.emitRate;
  }

  // Brings the look up to date with the numbers: where it is, which way it faces, and how much of it shows.
  update(time) {
    const ghost = this.apparition;
    const shown = ghost.stage !== "waiting" && ghost.stage !== "gone";
    this.root.setEnabled(shown);
    const opacity = ghost.opacity();
    const position = ghost.position();
    this.root.position.set(position[0], position[1], position[2]);
    this.root.rotation.y = ghost.yaw;
    this.material.setFloat("time", time);
    this.material.setFloat("opacity", opacity);
    const camera = this.scene.activeCamera;
    if (camera) this.material.setVector3("cameraPosition", camera.globalPosition);
    this.eyeMaterial.alpha = Math.min(1, opacity * 1.5);
    this.trail.emitRate = shown ? this.trailRate * Math.min(1, opacity / ghost.table.opacity) : 0;
  }

  dispose() {
    releaseEffect(this.trail);
    this.eyes.forEach((eye) => eye.dispose());
    this.body.dispose();
    this.material.dispose();
    this.eyeMaterial.dispose();
    this.root.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST_LOOK, GHOST_VERTEX, GHOST_FRAGMENT, registerGhostShader, ghostMaterial, GhostBody };
} else {
  Object.assign(window, { GHOST_LOOK, GHOST_VERTEX, GHOST_FRAGMENT, registerGhostShader, ghostMaterial, GhostBody });
}
```

Things to notice:

- **`Curve3.CreateCatmullRomSpline`** turns the corners of the profile into a smooth curve (a few points between each pair), so the lathe makes a smooth body and not a faceted one.
- **A root and its children.** The root is moved and turned; the body, the eyes and (through the body) the trail go with it. The root faces +z, which is where the eyes are, so turning the root to `yaw` turns the ghost to face the player.
- **`update` reads the numbers and writes the look**: position, turn, the shader's time and opacity, the camera's position (for the edge), the brightness of the eyes (a little more than the body's, so the eyes stay when the rest of it has faded), and how much trail it makes.
- **Waiting is not drawn at all** (`setEnabled(false)`), and does not make a trail.
- **`dispose` takes everything away**, and lets the trail finish before it goes.

### Tests

Open `tests/ghostmesh.tests.js` and **replace the TODO line** with:

```js
QUnit.module("effects", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    return { engine, scene };
  };

  QUnit.test("the tables make sense", (assert) => {
    for (const table of [EFFECTS.mist, EFFECTS.trail]) {
      assert.true(table.life[0] > 0 && table.life[0] <= table.life[1]);
      assert.true(table.size[0] > 0 && table.size[0] <= table.size[1]);
      assert.true(table.alpha > 0 && table.alpha <= 1);
      assert.true(table.rate > 0);
    }
    assert.true(EFFECTS.mist.alpha < EFFECTS.trail.alpha, "mist is fainter than a ghost's wisps");
  });

  QUnit.test("the puff is a texture with an alpha channel, drawn in code", (assert) => {
    const { scene, engine } = make();
    const texture = softTexture(scene);
    assert.true(texture.hasAlpha);
    assert.strictEqual(texture.getSize().width, 64);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("mist is a system at a point, as the table says", (assert) => {
    const { scene, engine } = make();
    const mist = createMist(scene, [2, 0, 3], softTexture(scene));
    assert.deepEqual([mist.emitter.x, mist.emitter.y, mist.emitter.z], [2, 0, 3]);
    assert.strictEqual(mist.emitRate, EFFECTS.mist.rate);
    assert.strictEqual(mist.minLifeTime, EFFECTS.mist.life[0]);
    assert.strictEqual(mist.maxEmitBox.x, EFFECTS.mist.radius);
    assert.strictEqual(mist.color1.a, EFFECTS.mist.alpha);
    assert.strictEqual(mist.colorDead.a, 0, "it fades to nothing");
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a trail is made on a mesh, and can be let go", (assert) => {
    const { scene, engine } = make();
    const mesh = BABYLON.MeshBuilder.CreateBox("body", {}, scene);
    const trail = createTrail(scene, mesh, softTexture(scene));
    assert.strictEqual(trail.emitter, mesh);
    assert.strictEqual(trail.blendMode, BABYLON.ParticleSystem.BLENDMODE_ADD);
    releaseEffect(trail);
    assert.true(trail.disposeOnStop);
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("the look of a ghost", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    new BABYLON.FreeCamera("eye", new BABYLON.Vector3(0, 1.4, 0), scene);
    registerGhostShader();
    return { engine, scene, texture: softTexture(scene) };
  };

  QUnit.test("the profile is as tall as the ghost of the table, and goes from the hem up", (assert) => {
    const heights = GHOST_LOOK.profile.map(([, y]) => y);
    assert.strictEqual(Math.max(...heights), GHOST.height);
    assert.deepEqual(heights, [...heights].sort((a, b) => a - b));
    assert.true(GHOST_LOOK.profile.every(([radius]) => radius > 0));
  });

  QUnit.test("the shader is where Babylon.js looks for it, and the two halves agree", (assert) => {
    registerGhostShader();
    assert.strictEqual(BABYLON.Effect.ShadersStore.ghostVertexShader, GHOST_VERTEX);
    assert.strictEqual(BABYLON.Effect.ShadersStore.ghostFragmentShader, GHOST_FRAGMENT);
    for (const name of ["vNormalW", "vPositionW", "vHeight"]) {
      assert.true(GHOST_VERTEX.includes(`varying ${name === "vHeight" ? "float" : "vec3"} ${name}`), `${name} is sent`);
      assert.true(GHOST_FRAGMENT.includes(`varying ${name === "vHeight" ? "float" : "vec3"} ${name}`), `${name} is received`);
    }
    for (const name of ["opacity", "color", "cameraPosition", "time"]) assert.true(GHOST_FRAGMENT.includes(`uniform`) && GHOST_FRAGMENT.includes(name));
  });

  QUnit.test("the material is see-through, shows both sides, and adds its light", (assert) => {
    const { scene, engine } = make();
    const material = ghostMaterial(scene, 1);
    assert.false(material.backFaceCulling);
    assert.true(material.needAlphaBlending());
    assert.strictEqual(material.alphaMode, BABYLON.Engine.ALPHA_ADD);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a body has a root, a lathe, two eyes, and a trail", (assert) => {
    const { scene, engine, texture } = make();
    const ghost = new Apparition({ id: 9, home: [1, 0, 4], delay: 0 });
    const body = new GhostBody(scene, ghost, texture);
    assert.strictEqual(body.body.parent, body.root);
    assert.true(body.body.getTotalVertices() > GHOST_LOOK.profile.length * GHOST_LOOK.tessellation, "the profile is smoothed into more points than it has corners");
    assert.strictEqual(body.eyes.length, 2);
    assert.true(body.eyes[0].position.x < 0 && body.eyes[1].position.x > 0, "one on each side");
    assert.true(body.eyes.every((eye) => eye.position.z > 0), "they look out of the front, which is the way it faces");
    assert.strictEqual(body.trail.emitter, body.body);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("update puts it where the numbers say, turned, and as bright as they say", (assert) => {
    const { scene, engine, texture } = make();
    const ghost = new Apparition({ id: 10, home: [1, 0, 4], delay: 0 });
    const body = new GhostBody(scene, ghost, texture);
    ghost.update(3, [8, 1.4, 4]);
    body.update(3);
    const position = ghost.position();
    assert.strictEqual(body.root.position.x, position[0]);
    assert.strictEqual(body.root.position.y, position[1]);
    assert.strictEqual(body.root.rotation.y, ghost.yaw);
    assert.true(body.root.isEnabled());
    assert.strictEqual(body.eyeMaterial.alpha, Math.min(1, ghost.opacity() * 1.5));
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a ghost that has not begun is not there at all, and its trail makes nothing", (assert) => {
    const { scene, engine, texture } = make();
    const ghost = new Apparition({ id: 11, home: [0, 0, 4], delay: 10 });
    const body = new GhostBody(scene, ghost, texture);
    body.update(0);
    assert.false(body.root.isEnabled());
    assert.strictEqual(body.trail.emitRate, 0);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("disposing takes everything away", (assert) => {
    const { scene, engine, texture } = make();
    const before = scene.meshes.length;
    const body = new GhostBody(scene, new Apparition({ id: 12, home: [0, 0, 4], delay: 0 }), texture);
    assert.strictEqual(scene.meshes.length, before + 3, "a body and two eyes");
    body.dispose();
    assert.strictEqual(scene.meshes.length, before);
    scene.dispose();
    engine.dispose();
  });
});
```

Things to notice:

- **`NullEngine`** is a Babylon.js engine that draws nothing. A scene made with it has real meshes, materials and particle systems that can be asked questions, which is what these tests do. (It does not *run* a shader: the check that it compiles is looking at it, in Step 5.)
- **The tests check that the halves of the shader agree**: the varyings one declares are the ones the other declares.
- **`dispose` is tested by counting meshes**: before, after the body is made (three more: the body and two eyes), after (the same as before).

Open `tests.html`. You should see **168 passing tests**: 11 more.

## Step 4: The game

In `js/main.js`, four small changes and a new section.

### The ghosts

The new section makes the shader, the puff, the haunting, and a **system** that runs every frame (the list of systems was made in the last sample for exactly this): the haunting is updated, and every body is brought up to date.

In `js/main.js`, after line 51, add:

```js
// The ghosts. `haunting` keeps their numbers (see ghost.js) and a GhostBody gives each one a look; mist (the same soft puff, large and
// faint) hangs over every place that has been marked. None of it is a placeholder: the ghosts and the mist are the real thing, made in code.
registerGhostShader();
const puff = softTexture(scene);
const haunting = new Haunting();
const bodies = new Map(); // apparition id -> its GhostBody
const mists = new Map(); // placement id -> the mist over it
let clock = 0; // seconds since the game began: the shader moves with it

haunting.onChange(({ type, item }) => {
  if (type === "added") {
    bodies.set(item.id, new GhostBody(scene, item, puff));
    return;
  }
  const body = bodies.get(item.id);
  if (body) body.dispose();
  bodies.delete(item.id);
});

systems.push((seconds, player) => {
  clock += seconds;
  haunting.update(seconds, player);
  for (const body of bodies.values()) body.update(clock);
});

// A ghost three metres ahead of the player, on the floor, at once.
function summonAhead() {
  const ahead = player.forward;
  const flat = Math.hypot(ahead[0], ahead[2]) || 1;
  haunting.summon([player.position[0] + (ahead[0] / flat) * 3, 0, player.position[2] + (ahead[2] / flat) * 3], { delay: 0.2 });
}

```

Things to notice:

- **The haunting and its look are joined by listening.** When the haunting says `added`, a body is made for the ghost; when it says `removed`, the body is disposed of. Neither of them knows about the other.
- **`clock` is the game's own time**, and what the shader moves with. It is *seconds of play*, not the time of day, so it starts at 0 and a ghost's sway is the same on every computer.
- **`summonAhead`** is for trying a ghost without marking the floor: a point three metres ahead of the player, on the floor.

### A mark has mist, and a ghost

When a mark is made, mist begins at once and the ghost comes after the table's `summonDelay`. When it is taken up, the ghost is sent away and the mist is released.

In `js/main.js`, after line 186, add:

```js
    haunting.banish(item.id); // a place that is taken up has nothing to haunt
    if (mists.has(item.id)) releaseEffect(mists.get(item.id));
    mists.delete(item.id);
```

In `js/main.js`, after line 203, add:

```js
  mists.set(item.id, createMist(scene, item.point, puff)); // the mist comes at once, and the ghost a moment later
  haunting.summon(item.point, { placement: item.id });
```

### The key, and developer mode

**G** summons a ghost ahead of you.

In `js/main.js`, after line 298, add:

```js
  if (event.code === "KeyG") summonAhead();
```

And a group of rows in the panel: a count, the nearest ghost, sliders for how bright it is, how it flickers, how long it takes to come and go, how long it lives, how high it bobs, how far it wanders and how fast it turns, one for the mist (it affects the mist made *after* you move it), and two buttons.

In `js/main.js`, after line 389, add:

```js
        title: "Ghosts",
        rows: [
          readout("ghosts", () => `${haunting.items.length} (${haunting.items.filter((ghost) => ghost.stage === "present").length} showing)`),
          readout("nearest", () => { const near = haunting.nearest(player.position); return near ? `${near.distance.toFixed(1)} m, ${near.item.stage}` : "none"; }),
          slider("brightness", GHOST, "opacity", 0.1, 1, 0.05),
          slider("flicker depth", GHOST, "flickerDepth", 0, 1, 0.05),
          slider("flicker speed (Hz)", GHOST, "flickerHz", 0, 20, 0.5),
          slider("fade in (s)", GHOST, "fadeIn", 0.2, 6, 0.1),
          slider("fade out (s)", GHOST, "fadeOut", 0.2, 6, 0.1),
          slider("life (s)", GHOST, "life", 5, 90, 1),
          slider("bob height (m)", GHOST, "bobHeight", 0, 0.5, 0.01),
          slider("drift radius (m)", GHOST, "driftRadius", 0, 3, 0.1),
          slider("turn rate", GHOST, "turnRate", 0, 8, 0.1),
          slider("mist thickness (new mist)", EFFECTS.mist, "alpha", 0, 0.4, 0.01),
          action("Summon a ghost ahead (G)", summonAhead),
          action("Send the ghosts away", () => haunting.banish()),
        ],
      },
      {
```

In `js/main.js`, **replace** line 429:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr }; // for poking at from the console
```

with:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting }; // for poking at from the console
```

## Step 5: Try it

Open the page with `?dev`, press the button, look at the floor, and **click to mark it**.

- **Mist** rises where you marked, at once: a pale haze spreading over the floor. Look at it from the side.
- **A ghost** begins to appear after a couple of seconds: first its eyes and edges, then the body, as the fade-in goes on. It floats above the mark, **turns to face you**, wanders about, bobs, and **flickers**. Walk (drag to turn) and it follows you with its eyes, and a trail of wisps drifts behind it as it wanders.
- Look at the **edge** of it: bright. Look at the middle: see-through, and you can see the posts through it (hide them with **P**). The hem is ragged and sways.
- **Press G**: a second ghost, three metres ahead. Press it five times: when the fifth is summoned, the oldest begins to fade.
- **Take the mark up** (press **Clear the marks** in the panel): the ghost fades away, and the mist thins out.
- In the panel's **Ghosts** group, drag **brightness** down and **flicker depth** up. Set **fade in** to 6 seconds and mark the floor again. Set **turn rate** to 0: it stares in one direction for ever.
- With **P** the posts are hidden, and the ghost is still there: a ghost is not a placeholder.

On a **phone**, this is the first time the game looks like itself: a ghost in your room, in front of the camera's picture. If the ghost looks too faint against a bright room, raise **brightness** (and tell me the value you like); if it looks too much like a cutout, raise **flicker depth**.

## Step 6: Tests, all together

Open `tests.html`. You should see **168 passing tests**. What a ghost *does* is tested as arithmetic, with no scene; what it *looks like* is tested with a scene that draws nothing; and that it looks like anything at all is Step 5.

## Recap: what you built

| What | Where |
|------|-------|
| How a ghost flickers, fades, bobs, wanders and turns | `flicker`, `envelope`, `bob`, `drift`, `turnToward` in `ghost.js` |
| One ghost, and the ghosts there are | `Apparition`, `Haunting` in `ghost.js` |
| A soft puff, mist, and a trail | `softTexture`, `createMist`, `createTrail`, `releaseEffect` in `effects.js` |
| The shader, the material, and a ghost to look at | `GHOST_VERTEX`, `GHOST_FRAGMENT`, `ghostMaterial`, `GhostBody` in `ghostmesh.js` |
| Ghosts at the marks | `main.js` |

## Challenges

- **Reaching arms.** Add two long, thin arms to the body (another lathe, or a tapering cylinder each), that reach out when the ghost is close to the player, and drop when it is not. The distance is already in the numbers: where would the reach go in `ghost.js`, so that a test can say it?
- **A moaning face.** Add a mouth: a dark ellipse under the eyes that opens and closes with a sine of the time. Make it open wider when the ghost is nearer.
- **A hot-and-cold ghost.** Give the shader a second colour and make the ghost turn from cold cyan to a sick green as its age passes half its life, through a uniform. Which function of `ghost.js` should say how far along it is, so that it can be tested?
- **A better mist.** The mist is the same puff at every size. Make a second texture, with a swirl in it (draw a few arcs on the canvas) for the larger puffs, and see whether the haze looks less like smoke.
