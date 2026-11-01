# Tutorial: Ghost Hunter Company -- More to Meet, and Something at the Corner of Your Eye

This is the twelfth tutorial of the Ghost Hunter series. The last one ended with a game that is creepy on purpose and has settled down: the creatures creep, the lights go out instead of a flash, and a ghost moves only when you are not looking. Then the game was played on a phone for a while, and a lot of small things were changed in place, which is how a game is made. This sample is **what the game became**, written down as a step you can follow: **new creatures with models that have skeletons**, a creature that **peeks** at the edge of the screen, a **pop** that is a jump scare, and a **door scan** that looks at the camera's picture for doorways to peek from.

By the end you'll have:

- **A bigger cast**: a **mummy** that staggers at you and then runs, a **skeleton** that does the same, a **ghoul girl** that rises, walks straight at you and falls dead at your feet, and a **doll** with a shaky walk, each with its own table row, its own animations, its own weakness to the light and the beam, and its own place in the director's rhythm
- **Personal space**: nothing comes within a metre or so of the player, whatever it is doing, so a creature is never "clipping" through the screen
- The models that **do not move themselves** (static) taken **out**: a model is now always one with a skeleton and clips of its own
- **Peeks and pops**: a creature that leans out from the edge of the view for a second or two, and goes back; and a **pop**, the same thing in an instant with a strike
- A **door scan**: a small model (SegFormer, 4 MB, run with onnxruntime-web) that labels the pixels of the camera's picture, finds the doors and the stairs, turns each foot into a point on the floor, and keeps it as a place to peek from
- A **SCAN** and a **MARK** button, a **jump scare** you can ask for, and the compass taken off the screen
- Unit tests for all of it: **433 passing tests**

**What you'll learn:** how to add a creature to a table-driven game with a state machine (and when a new *state* is better than a new table number), how models with skeletons are driven by the clips they have, how a creature can use the edge of the screen as a corner, how a segmentation model is used in a page (and tested without being run), and how to keep a game's rules in tables while the feel of it is changed by playing.

**Before you start:** do the [Unease tutorial](../ghost_hunter_unease/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Unease sample, plus placeholders for the new files and their tests:

```
ghost_hunter_company/
├── index.html, tests.html, scan.html   (already list the new scripts; scan.html is a page of its own)
├── js/
│   ├── peeks.js            (placeholder -- Step 5)
│   ├── doorscan.js         (placeholder -- Step 6)
│   ├── creatures.js, creaturemesh.js, director.js, tools.js, audio.js, ghost.js, staticbody.js, main.js   (changes)
│   └── everything else, from the Unease sample
└── tests/
    ├── peeks.tests.js, doorscan.tests.js   (placeholders)
    └── everything else, from the Unease sample
```

Open `tests.html` before you change anything. You should see **387 passing tests**.

**A note on the assets.** The models of the new creatures (`skeleton.glb`, `mummy.glb`, `ghoul_girl.glb`, `doll.glb`) are in the series' shared [assets folder](../assets/README.md), already made phone-sized by `optimize-models.js`. The models that had no skeleton (and moved by rocking and toppling) were taken out of the series: that is Step 3.

### Serving the page

The models can't be loaded from a page opened straight from a file, so run a web server: `npx serve` in the repo root. Cameras and motion sensors only work over **HTTPS** (a page on `localhost` counts, but only on the same computer): see the [series README](../README.md). Add **`?dev`** to the address for the developer panel.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **The cast**: the creatures' table and their rules (a mummy, a skeleton that charges, a ghoul girl, a doll, personal space, a pop and a peek).
2. **What they are weak to, and when they come.**
3. **Models that are not rigged, taken out.**
4. **Their bodies**: clips for each, and a tilt for a creature that leans.
5. **Peeks**: where a peek goes, and when one comes.
6. **The door scan.**
7. **The game.**

## Step 1: The cast

The creatures are a table (`CREATURES`) of what each is, a state machine of what it is doing, and a pose. This step changes the table and the machine. Read the changes in order: they are one file, and they build on each other.

- **`charge`** (the mummy and the skeleton): they do not creep and loiter. They come towards you slowly for a few seconds, so that you see it coming and wonder, and then they **run**. A new state, `charge`, and three numbers in the row: how fast they stagger, for how long, and how fast they run.
- **`arise`** and **`walker`** (the ghoul girl): she begins in a state of her own, `arise`, that lasts as long as her animation of rising; then she walks straight at you at a steady pace; and at `fallAt` metres (a way short of touching distance) she falls dead, the way her own animation falls. She does not rush and does not lunge.
- **The doll** is a creature of the old kind (it creeps and rushes once) with a small body and a shaky walk (in its model, not in the code).
- **Personal space**: `update` calls `_step` and then moves anything that is nearer the player than `PERSONAL_SPACE` of its touch range straight back out to the edge of it. A creature that was *placed* nearer, or that got there itself, never stays there.
- **A peek** is a state too, and the next step is about it: `PEEK` is its table, and the creature is given the places it hides at and leans out to.

In `js/creatures.js`, **delete** line 14:

```js
    models: ["zombie"],
```

In `js/creatures.js`, after line 16, add:

```js
  // The mummy and the skeleton do not creep: they come towards you, slowly, for a few seconds (so that you see it coming and wonder), and then they run. `charge`
  // is how: the speed of the stagger, how long it staggers for (it picks a time in the range), and the speed of the run.
  mummy: {
    models: ["mummy"],
    name: "mummy", health: 5, speed: 0.8, lungeSpeed: 5, lungeRange: 2.6, lungeTime: 0.5, recoverTime: 1.6, notice: 10,
    touchRange: 1.6, turnRate: 3.2, strideLength: 0.7, radius: 0.4, height: 1.7, lurkTime: [1.5, 3], deathTime: 1.8,
    pose: "ghoul", voice: "ghoul",
    charge: { staggerSpeed: 0.8, staggerTime: [3, 5], runSpeed: 3.6 },
  },
  // The ghoul girl rises (her model has an animation for it), walks straight at you, and when she reaches you she falls dead at your feet (it has an
  // animation for that too). `arise` is how long the rising takes; `walker` is the walk that ends in a death.
  ghoul_girl: {
    models: ["ghoul_girl"],
    name: "ghoul_girl", health: 4, speed: 0.9, lungeSpeed: 3, lungeRange: 2.2, lungeTime: 0.5, recoverTime: 1.5, notice: 10,
    touchRange: 1.6, fallAt: 2.8, turnRate: 3, strideLength: 0.65, radius: 0.35, height: 1.6, lurkTime: [1, 2], deathTime: 3,
    pose: "ghoul", voice: "ghoul",
    arise: 1.9, walker: true,
  },
  // The doll is small, and walks with a shake (an old person's, on a child's legs). It creeps like the ghoul and the spider do: it comes, and loiters,
  // and rushes once (its model has a run for that).
  doll: {
    models: ["doll"],
    name: "doll", health: 3, speed: 0.7, lungeSpeed: 3.8, lungeRange: 2.4, lungeTime: 0.5, recoverTime: 1.5, notice: 9,
    touchRange: 1.3, turnRate: 3, strideLength: 0.5, radius: 0.3, height: 1.1, lurkTime: [1, 3], deathTime: 1.6,
    pose: "ghoul", voice: "ghoul",
  },
  // `models` is the models a kind of creature may have (a creature has one, by its number); `pose` and `voice` borrow what a kind has no
  // pose or voice of its own for; `hover` is how high above the floor one floats (and does not fall).
```

In `js/creatures.js`, **replace** lines 49 to 65 (from `},` to `pose: "ghoul", voice: "ghoul", models: ["horde"],`) with:

```js
    charge: { staggerSpeed: 0.9, staggerTime: [3, 5], runSpeed: 3.4 }, // like the mummy: it walks at you, and then it runs
```

In `js/creatures.js`, after line 66, add:

```js
// How a creature peeks. It is not coming for the player: it leans out from behind something (the edge of the view, or a corner the player has
// marked) for a second or two, watches, and goes back. `lean` is how far it tilts as it does (radians). A **pop** is a peek that is sudden:
// there is no leaning out, the creature is just there, at the edge, with a strike, and it is gone again.
const PEEK = {
  lean: 0.3,
  inTime: 0.7, // seconds to lean out
  hold: [1.2, 2.4], // seconds it stays out
  outTime: 0.6, // seconds to draw back
  popHold: [0.9, 1.5],
  popOut: 0.25,
};

// How near anything may come to the player, as a part of its touch range (a creature that rushes stops at nine tenths of it: this is below that,
// so a rush is not interfered with, and a creature that is somehow nearer is moved out).
const PERSONAL_SPACE = 0.8;

// Where a point on the floor ends up if it must keep at least `minimum` metres from another: where it is, if it is far enough, and moved straight
// away from the other, to `minimum`, if it is not. (Exactly on top of it, it is moved along z.) Gives [x, z].
function keepAway(point, from, minimum) {
  const dx = point[0] - from[0];
  const dz = point[2] - from[2];
  const distance = Math.hypot(dx, dz);
  if (distance >= minimum) return [point[0], point[2]];
  if (distance < 1e-6) return [point[0], point[2] + minimum];
  const scale = minimum / distance;
  return [from[0] + dx * scale, from[2] + dz * scale];
}

```

In `js/creatures.js`, **replace** line 248:

```js
  constructor({ id, kind, position, table = CREATURES[kind], random = Math.random }) {
```

with:

```js
  // `peek` is { from: [x, z], to: [x, z], pop } for a creature that only peeks: where it is hidden, where it leans out to, and whether it pops.
  constructor({ id, kind, position, table = CREATURES[kind], random = Math.random, peek = null }) {
```

In `js/creatures.js`, after line 257, add:

```js
    this.lean = 0; // 0 to 1: how far it is leaning out, for the body to tilt by
    this.peek = null;
    if (peek) {
      const hold = peek.pop ? PEEK.popHold : PEEK.hold;
      const out = peek.pop ? 0 : PEEK.inTime;
      this.peek = { ...peek, inTime: out, hold: hold[0] + random() * (hold[1] - hold[0]), outTime: peek.pop ? PEEK.popOut : PEEK.outTime, age: 0 };
      this.state = "peek";
      this.position[0] = (peek.pop ? peek.to : peek.from)[0];
      this.position[2] = (peek.pop ? peek.to : peek.from)[1];
    } else if (table.arise) {
      this.state = "arise"; // a creature that rises does that first, and cannot do anything else until it has
      this.timer = table.arise;
    }
```

In `js/creatures.js`, after line 281, add:

```js
    this.staggerFor = table.charge ? table.charge.staggerTime[0] + random() * (table.charge.staggerTime[1] - table.charge.staggerTime[0]) : 0; // a creature that charges: how long it staggers first
    this.staggered = 0;
```

In `js/creatures.js`, after line 368, add:

```js
  // Peeking: it leans out from where it is hidden to where it can be seen, stays there, and draws back; then it is gone. It faces the player the
  // whole time. Gives whether it is moving.
  _peek(seconds, player) {
    const peek = this.peek;
    if (peek.age === 0) this.events.push(peek.pop ? "pop" : "peek");
    peek.age += seconds;
    const { inTime, hold, outTime } = peek;
    const smooth = (t) => t * t * (3 - 2 * t);
    let out;
    if (peek.age < inTime) out = smooth(peek.age / inTime);
    else if (peek.age < inTime + hold) out = 1;
    else out = 1 - smooth(Math.min(1, (peek.age - inTime - hold) / outTime));
    const before = [this.position[0], this.position[2]];
    this.position[0] = peek.from[0] + (peek.to[0] - peek.from[0]) * out;
    this.position[2] = peek.from[1] + (peek.to[1] - peek.from[1]) * out;
    this.lean = out;
    this.yaw = Math.atan2(player.position[0] - this.position[0], player.position[2] - this.position[2]);
    if (peek.age >= inTime + hold + outTime) this.done = true;
    return Math.hypot(this.position[0] - before[0], this.position[2] - before[1]) > 1e-5 * seconds;
  }

```

In `js/creatures.js`, **replace** lines 402 to 403:

```js
  // Time going by. `player` is where the player is (`player.position`).
  update(seconds, player) {
```

with:

```js
  // Time going by. `player` is where the player is (`player.position`). Nothing, whatever it is doing, comes inside the player's personal space: a
  // creature that is too near (the player walked up to it, or it got there itself) is moved straight back out to the edge of it.
  update(seconds, player) {
    this._step(seconds, player);
    if (this.done || this.state === "dying" || this.state === "fall") return;
    const minimum = this.table.personalSpace || this.table.touchRange * PERSONAL_SPACE;
    const [x, z] = keepAway(this.position, player.position, minimum);
    this.position[0] = x;
    this.position[2] = z;
  }

  _step(seconds, player) {
```

In `js/creatures.js`, after line 435, add:

```js
    } else if (this.state === "peek") {
      walking = this._peek(seconds, player);
    } else if (this.state === "arise") {
      this.timer -= seconds;
      if (this.timer <= 0) this.state = "stalk";
```

In `js/creatures.js`, **replace** lines 445 to 446:

```js
      if (distance <= table.lungeRange) {
        this._rush(player, 0);
```

with:

```js
      if (table.walker) {
        walking = this._walk(seconds, player.position, table.speed); // she walks, and does not hurry
        if (distance <= table.fallAt) {
          this.touches += 1;
          this.events.push("touch"); // she has got to you: that is the scare
          this.state = "dying"; // and she falls
          this.timer = table.deathTime;
        }
      } else if (distance <= table.lungeRange) {
        this._rush(player, 0);
      } else if (table.charge) {
        this.staggered += seconds; // it staggers towards the player, and then it runs
        if (this.staggered >= this.staggerFor) this.state = "charge";
        else walking = this._walk(seconds, player.position, table.charge.staggerSpeed);
```

In `js/creatures.js`, after line 463, add:

```js
    } else if (this.state === "charge") {
      walking = this._walk(seconds, player.position, table.charge.runSpeed);
      if (distance <= table.lungeRange) this._rush(player, 0);
```

In `js/creatures.js`, **replace** lines 513 to 514:

```js
    const crouch = this.state === "fall" ? -0.5 : this.state === "lunge" ? 0 : (this.state === "stalk" && this.lastDistance < 3) || this.state === "creep" ? 0.5 : 0;
    const reach = this.state === "lunge" ? 1 : this.state === "recover" ? 0.4 : 0;
```

with:

```js
    const crouch = this.state === "fall" ? -0.5 : this.state === "lunge" || this.state === "charge" ? 0 : (this.state === "stalk" && this.lastDistance < 3) || this.state === "creep" ? 0.5 : 0;
    const reach = this.state === "lunge" ? 1 : this.state === "charge" ? 0.3 : this.state === "recover" ? 0.4 : 0;
```

In `js/creatures.js`, **replace** lines 547 to 549:

```js
  spawn(kind, position) {
    if (!CREATURES[kind] || this.items.length >= this.max) return null;
    const creature = new Creature({ id: this.nextId++, kind, position, random: this.random });
```

with:

```js
  spawn(kind, position, peek = null) {
    if (!CREATURES[kind] || this.items.length >= this.max) return null;
    const creature = new Creature({ id: this.nextId++, kind, position, random: this.random, peek });
```

In `js/creatures.js`, **replace** lines 588 to 590:

```js
  module.exports = { CREATURES, CREATURE_MAX, CREEP, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, CREEP, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie });
```

with:

```js
  module.exports = { CREATURES, CREATURE_MAX, CREEP, PEEK, PERSONAL_SPACE, keepAway, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, CREEP, PEEK, PERSONAL_SPACE, keepAway, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie });
```


### Tests

In `tests/creatures.tests.js`, **replace** line 157:

```js
    const creature = make("skeleton", [0, 0, 8]);
```

with:

```js
    const creature = make("ghoul", [0, 0, 8]);
```

In `tests/creatures.tests.js`, **replace** line 163:

```js
    assert.true(Math.abs(walked - CREATURES.skeleton.speed * 2) < 0.2, `walked ${walked.toFixed(2)}`);
```

with:

```js
    assert.true(Math.abs(walked - CREATURES.ghoul.speed * 2) < 0.2, `walked ${walked.toFixed(2)}`);
```

In `tests/creatures.tests.js`, **replace** line 335:

```js
    const creature = quick("skeleton", 1000);
```

with:

```js
    const creature = quick("ghoul", 1000);
```

In `tests/creatures.tests.js`, **replace** line 442:

```js
      assert.true(nearest <= table.touchRange + 0.05, `${kind} still touched, at ${nearest.toFixed(2)} m`);
```

with:

```js
      assert.true(nearest <= (table.fallAt || table.touchRange) + 0.05, `${kind} still touched, at ${nearest.toFixed(2)} m`);
```

In `tests/creatures.tests.js`, **replace** line 447:

```js
    for (const kind of ["ghoul", "skeleton", "doll", "floater", "horde"]) assert.true(CREATURES[kind].touchRange >= 1.2, kind);
```

with:

```js
    for (const kind of ["ghoul", "skeleton"]) assert.true(CREATURES[kind].touchRange >= 1.2, kind);
```

In `tests/creatures.tests.js`, after line 456, add:

```js

QUnit.module("the mummy: it staggers, then it runs", () => {
  const player = { position: [0, 1.4, 0] };
  const make = (position = [0, 0, 14], random = () => 0.5) => {
    const mummy = new Creature({ id: 1, kind: "mummy", position, random });
    mummy.state = "stalk";
    mummy.yaw = Math.PI;
    return mummy;
  };
  const speedOf = (creature, seconds) => {
    const before = creature.distanceTo(player.position);
    for (let t = 0; t < seconds; t += 0.05) creature.update(0.05, player);
    return (before - creature.distanceTo(player.position)) / seconds;
  };

  QUnit.test("it staggers at first, at the slow speed of the table", (assert) => {
    const mummy = make();
    const speed = speedOf(mummy, 1.5);
    assert.true(Math.abs(speed - CREATURES.mummy.charge.staggerSpeed) < 0.12, `${speed.toFixed(2)} m/s`);
    assert.strictEqual(mummy.state, "stalk");
  });

  QUnit.test("after its stagger time it runs, at the fast speed, and does not loiter", (assert) => {
    const mummy = make([0, 0, 40]);
    mummy.staggerFor = 2;
    for (let t = 0; t < 2.2; t += 0.05) mummy.update(0.05, player);
    assert.strictEqual(mummy.state, "charge");
    const speed = speedOf(mummy, 1.5);
    assert.true(Math.abs(speed - CREATURES.mummy.charge.runSpeed) < 0.3, `${speed.toFixed(2)} m/s`);
    assert.true(speed > CREATURES.mummy.charge.staggerSpeed * 3, "much faster than the stagger");
  });

  QUnit.test("it picks how long it staggers from the range, so that two mummies are not alike", (assert) => {
    const [low, high] = CREATURES.mummy.charge.staggerTime;
    const a = make([0, 0, 14], () => 0), b = make([0, 0, 14], () => 0.999);
    assert.true(Math.abs(a.staggerFor - low) < 1e-9 && Math.abs(b.staggerFor - high) < 0.01);
  });

  QUnit.test("a charge ends in a rush, a touch, and a retreat, like the others, at arm's length", (assert) => {
    const mummy = make([0, 0, 9]);
    const events = [];
    let nearest = Infinity;
    for (let t = 0; t < 30; t += 0.02) {
      mummy.update(0.02, player);
      events.push(...mummy.events);
      mummy.events = [];
      nearest = Math.min(nearest, mummy.distanceTo(player.position));
    }
    assert.true(events.includes("lunge") && events.includes("touch"));
    assert.true(nearest > 1.1, `came to ${nearest.toFixed(2)} m`);
    assert.true(mummy.done, "and then it was gone");
  });

  QUnit.test("it has a model of its own, with a clip for the stagger and one for the run", (assert) => {
    assert.deepEqual(CREATURES.mummy.models, ["mummy"]);
    assert.strictEqual(ModelBody.clipFor("stalk", CREATURE_MODELS.mummy.clips), "Mummy_Stagger");
    assert.strictEqual(ModelBody.clipFor("charge", CREATURE_MODELS.mummy.clips), "Running");
    assert.strictEqual(ModelBody.clipFor("lunge", CREATURE_MODELS.mummy.clips), "Running");
  });

  QUnit.test("a model with a lunge clip and no run clip runs with the lunge one", (assert) => {
    assert.strictEqual(ModelBody.clipFor("charge", { lunge: "Attack", idle: "Idle" }), "Attack");
    assert.strictEqual(ModelBody.clipFor("charge", { idle: "Idle" }), "Idle");
  });
});

QUnit.module("personal space", () => {
  QUnit.test("a point that is far enough is where it was, one that is too near is moved straight out, and one on top is moved along", (assert) => {
    assert.deepEqual(keepAway([0, 0, 3], [0, 1.4, 0], 2), [0, 3]);
    const [x, z] = keepAway([0, 0, 1], [0, 1.4, 0], 2);
    assert.true(Math.abs(x) < 1e-9 && Math.abs(z - 2) < 1e-9);
    const [x2, z2] = keepAway([1, 0, 1], [0, 1.4, 0], 2);
    assert.true(Math.abs(Math.hypot(x2, z2) - 2) < 1e-9 && Math.abs(x2 - z2) < 1e-9, "and in the same direction");
    assert.deepEqual(keepAway([0, 0, 0], [0, 1.4, 0], 2), [0, 2]);
  });

  QUnit.test("a creature that the player walks up to is moved out of the way, whatever it was doing", (assert) => {
    for (const state of ["lurk", "stalk", "creep", "recover", "retreat", "charge"]) {
      const kind = state === "charge" ? "mummy" : "ghoul"; // only a creature that charges has a charge
      const creature = new Creature({ id: 1, kind, position: [0, 0, 0.3], random: () => 0.5 });
      creature.state = state;
      creature.update(0.02, { position: [0, 1.4, 0] });
      assert.true(creature.distanceTo([0, 1.4, 0]) >= CREATURES[kind].touchRange * PERSONAL_SPACE - 1e-9, state);
    }
  });

  QUnit.test("a stunned creature is moved out too, and a dying one is left alone", (assert) => {
    const stunned = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 0.3], random: () => 0.5 });
    stunned.stun(1);
    stunned.update(0.02, { position: [0, 1.4, 0] });
    assert.true(stunned.distanceTo([0, 1.4, 0]) >= CREATURES.ghoul.touchRange * PERSONAL_SPACE - 1e-9);
    const dying = new Creature({ id: 2, kind: "ghoul", position: [0, 0, 0.3], random: () => 0.5 });
    dying.hit(100);
    dying.update(0.02, { position: [0, 1.4, 0] });
    assert.true(dying.distanceTo([0, 1.4, 0]) < 0.5);
  });

  QUnit.test("the space is inside the touch range, so that a rush still touches", (assert) => {
    assert.true(PERSONAL_SPACE < 0.9);
    for (const [kind, table] of Object.entries(CREATURES)) assert.true(table.touchRange * PERSONAL_SPACE < table.touchRange * 0.9, kind);
  });
});

QUnit.module("the skeleton behaves like the mummy", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("it walks at the player and then runs, and does not circle", (assert) => {
    const skeleton = new Creature({ id: 1, kind: "skeleton", position: [0, 0, 40], random: () => 0.5 });
    skeleton.state = "stalk";
    skeleton.yaw = Math.PI;
    skeleton.staggerFor = 2;
    const speed = (seconds) => {
      const before = skeleton.distanceTo(player.position);
      for (let t = 0; t < seconds; t += 0.05) skeleton.update(0.05, player);
      return (before - skeleton.distanceTo(player.position)) / seconds;
    };
    assert.true(Math.abs(speed(1.5) - CREATURES.skeleton.charge.staggerSpeed) < 0.15);
    for (let t = 0; t < 0.8; t += 0.05) skeleton.update(0.05, player);
    assert.strictEqual(skeleton.state, "charge");
    assert.true(speed(1.5) > CREATURES.skeleton.charge.staggerSpeed * 3);
  });

  QUnit.test("the creatures that charge are the mummy and the skeleton, and the rest creep", (assert) => {
    assert.deepEqual(Object.keys(CREATURES).filter((kind) => CREATURES[kind].charge).sort(), ["mummy", "skeleton"]);
  });

  QUnit.test("its model has a run clip for the charge", (assert) => {
    assert.strictEqual(ModelBody.clipFor("charge", CREATURE_MODELS.skeleton.clips), "Running");
    assert.strictEqual(ModelBody.clipFor("stalk", CREATURE_MODELS.skeleton.clips), "Walking");
  });
});

QUnit.module("the ghoul girl: she rises, walks at you, and falls", () => {
  const player = { position: [0, 1.4, 0] };
  const make = (position = [0, 0, 9]) => new Creature({ id: 1, kind: "ghoul_girl", position, random: () => 0.5 });
  const run = (creature, seconds, step = 0.05) => {
    const events = [];
    for (let t = 0; t < seconds; t += step) {
      creature.update(step, player);
      events.push(...creature.events);
      creature.events = [];
    }
    return events;
  };

  QUnit.test("she begins by rising, and does nothing else while she does", (assert) => {
    const girl = make();
    assert.strictEqual(girl.state, "arise");
    const start = girl.position.slice();
    run(girl, CREATURES.ghoul_girl.arise - 0.3);
    assert.deepEqual(girl.position, start, "she has not moved");
    assert.strictEqual(girl.state, "arise");
    run(girl, 0.5);
    assert.strictEqual(girl.state, "stalk");
  });

  QUnit.test("then she walks straight at the player at the table's speed, and does not run or loiter", (assert) => {
    const girl = make([0, 0, 30]);
    girl.state = "stalk";
    girl.yaw = Math.PI;
    const before = girl.distanceTo(player.position);
    run(girl, 3);
    const speed = (before - girl.distanceTo(player.position)) / 3;
    assert.true(Math.abs(speed - CREATURES.ghoul_girl.speed) < 0.15, `${speed.toFixed(2)} m/s`);
    assert.strictEqual(girl.state, "stalk");
  });

  QUnit.test("when she gets to arm's length she touches (the scare) and falls, and is gone when she has finished", (assert) => {
    const girl = make([0, 0, 6]);
    const events = run(girl, 30);
    assert.strictEqual(events.filter((e) => e === "touch").length, 1);
    assert.false(events.includes("lunge"), "she does not rush");
    assert.true(girl.done);
  });

  QUnit.test("she falls well short of arm's length, never nearer", (assert) => {
    const girl = make([0, 0, 6]);
    let nearest = Infinity;
    for (let t = 0; t < 30; t += 0.02) {
      girl.update(0.02, player);
      girl.events = [];
      nearest = Math.min(nearest, girl.distanceTo(player.position));
    }
    assert.true(nearest > CREATURES.ghoul_girl.fallAt * 0.9, `${nearest.toFixed(2)} m`);
  });

  QUnit.test("her fall takes as long as the animation of it", (assert) => {
    const girl = make([0, 0, 2.6]);
    girl.state = "stalk";
    girl.update(0.05, player);
    assert.strictEqual(girl.state, "dying");
    assert.strictEqual(girl.timer, CREATURES.ghoul_girl.deathTime);
  });

  QUnit.test("she can be hurt or captured while she rises and walks, and then she falls the same way", (assert) => {
    const girl = make();
    assert.true(girl.alive);
    assert.true(girl.capture());
    assert.strictEqual(girl.state, "dying");
  });
});
```


The tests of this step need the files of the next three steps as well (the models of the creatures, what they are weak to, the ghosts), so they are all run together at the end of Step 4.

## Step 2: What they are weak to, and when they come

Each creature has a weakness (`WEAKNESS`) to the light and to the beam, and the director has a list of kinds it can send, with weights that go from one number to another as the tension rises, and an intensity each kind is allowed from. The new ones are rows in each:

- the **mummy** and the **ghoul girl** are not much hurt by the light, and are held well by the beam;
- the **doll** is hurt more by the light than the mummy is;
- in the director, the skeleton, the mummy and the ghoul girl come when the game is hard enough, and the **doll** from an intensity of 0.6.

In `js/tools.js`, **replace** lines 36 to 39:

```js
  skeleton: { light: 1, stun: 0.6, beam: 1 },
  doll: { light: 2, stun: 1, beam: 0.8 },
  floater: { light: 0.8, stun: 0, beam: 2 },
  horde: { light: 0.3, stun: 0, beam: 0.5 },
```

with:

```js
  mummy: { light: 0.5, stun: 0.4, beam: 1 },
  ghoul_girl: { light: 0.6, stun: 0.5, beam: 1.2 },
  doll: { light: 1.2, stun: 0.8, beam: 1 },
  skeleton: { light: 1, stun: 0.6, beam: 1 },
```


In `js/director.js`, **replace** lines 29 to 31:

```js
    { kind: "doll", weight: [0, 2], from: 0.8 },
    { kind: "floater", weight: [0, 2], from: 1.2 },
    { kind: "horde", weight: [0, 1], from: 1.8 },
```

with:

```js
    { kind: "mummy", weight: [1, 3], from: 1 },
    { kind: "ghoul_girl", weight: [1, 2], from: 0.8 },
    { kind: "doll", weight: [2, 2], from: 0.6 },
```


The voice of a creature depends on what it is doing; the new states are added to the ones that make a creature sound alive:

In `js/audio.js`, **replace** line 25:

```js
  const active = state === "stalk" ? 1 : state === "lunge" ? 1.6 : state === "creep" ? 0.6 : state === "retreat" ? 0.35 : state === "lurk" ? 0.3 : state === "recover" ? 0.4 : 0;
```

with:

```js
  const active = state === "stalk" ? 1 : state === "lunge" || state === "charge" ? 1.6 : state === "creep" ? 0.6 : state === "retreat" ? 0.35 : state === "lurk" ? 0.3 : state === "recover" ? 0.4 : 0;
```


### Tests

In `tests/tools.tests.js`, **replace** line 93:

```js
    assert.true(hurt("spider") > hurt("doll") && hurt("doll") > hurt("skeleton") && hurt("skeleton") > hurt("ghoul"));
```

with:

```js
    assert.true(hurt("spider") > hurt("skeleton") && hurt("skeleton") > hurt("ghoul"));
```

In `tests/tools.tests.js`, **replace** line 170:

```js
    assert.true(timeFor("floater") < timeFor("ghoul") && timeFor("ghoul") < timeFor("horde"));
```

with:

```js
    assert.true(timeFor("spider") > timeFor("ghoul"), "a ghoul is held faster than a spider");
```

In `tests/tools.tests.js`, **replace** line 195:

```js
    const targets = world(target("g", "horde", 0, 4));
```

with:

```js
    const targets = world(target("g", "spider", 0, 4)); // held at 0.6 of the ordinary rate: more than the beam lasts
```


## Step 3: Models that are not rigged, taken out

In the Models step, the models had no skeleton, so they were moved from outside: rocked, leaned and toppled (`staticMotion`). That worked for a ghoul that shuffles, and it never looked alive. A model with a skeleton and clips of its own (the skeleton, and now the mummy, the ghoul girl and the doll) is better in every way, so the models that did not have one were **taken out**: out of the assets, and out of the code that moved them.

What stays is what a model with bones still needs from outside: `staticMotion` (for the fall of a creature that has no dying clip of its own), `measureModel` and `FittedModel` (to put any model at the height the table says, with its feet on the floor). What goes is the `StaticBody`, the `GhostModelBody` and the table of models, and the ghosts' `modelChance` (a ghost is always the made-in-code one; the tall thin one that stutters when watched). The ghost also gets **personal space**, like the creatures.

In `js/staticbody.js`, **replace** lines 1 to 17 (from `// Models that do not move. The models that have arrived are` to `};`) with:

```js
// What a model with bones still needs from outside. `staticMotion` is how a thing with no animation of its own moves (a rock, a lean, a
// topple and a fade): the skeleton has no death clip, and uses it for its death. `FittedModel` measures a loaded model, scales it to the height
// its entry in the table says, and puts its feet on the floor, in the middle. (This file uses TAU from ghost.js.) See ../tests/staticbody.tests.js.
```

In `js/staticbody.js`, **delete** lines 63 to 120:

```js
// A creature drawn as a model that does not move: put where the creature is, turned the way it faces, and moved by `staticMotion`.
class StaticBody {
  constructor(scene, creature, loaded, name = loaded.entry.url) {
    this.creature = creature;
    this.fitted = new FittedModel(scene, loaded, `${creature.id}`);
    this.motion = loaded.entry.motion;
    this.yaw = loaded.entry.yaw || 0;
    this.root = this.fitted.pivot;
  }

  update() {
    const creature = this.creature;
    const state = creature.state;
    const dying = state === "dying" ? 1 - creature.timer / creature.table.deathTime : 0;
    const reach = state === "lunge" ? 1 : state === "recover" ? 0.3 : 0;
    const motion = staticMotion({ state, gait: creature.gait, time: creature.clock, moving: creature.moving, reach, dying: Math.max(0, Math.min(1, dying)) }, this.motion);
    const pivot = this.fitted.pivot;
    pivot.position.set(creature.position[0], creature.position[1] + motion.lift, creature.position[2]);
    pivot.rotation.set(motion.pitch, creature.yaw + this.yaw, motion.roll);
    pivot.scaling.set(motion.wide, motion.stretch, motion.wide);
    this.fitted.setVisibility(motion.opacity * creature.fade);
  }

  dispose() {
    this.fitted.dispose();
  }
}

// A ghost drawn as a model: it floats where the numbers of the ghost say, faces the player, and is as see-through as they say.
class GhostModelBody {
  constructor(scene, apparition, loaded) {
    this.apparition = apparition;
    this.fitted = new FittedModel(scene, loaded, `ghost-${apparition.id}`);
    this.root = this.fitted.pivot;
  }

  update() {
    const ghost = this.apparition;
    const shown = ghost.stage !== "waiting" && ghost.stage !== "gone";
    this.fitted.pivot.setEnabled(shown);
    const position = ghost.position();
    this.fitted.pivot.position.set(position[0], position[1], position[2]);
    this.fitted.pivot.rotation.y = ghost.yaw + (this.fitted.entry.yaw || 0);
    this.fitted.setVisibility(Math.min(1, ghost.opacity() / ghost.table.opacity) * 0.85);
  }

  dispose() {
    this.fitted.dispose();
  }
}

// Does this ghost have a model? Some do and some do not, decided by the ghost's own number (so it is the same every time), among the models
// there are. Gives the name of the model, or null.
function ghostModelFor(id, names, chance) {
  if (!names.length || hash(id + 40) >= chance) return null;
  return names[id % names.length];
}

```

In `js/staticbody.js`, **replace** lines 67 to 69:

```js
  module.exports = { STATIC_MODELS, staticMotion, measureModel, FittedModel, StaticBody, GhostModelBody, ghostModelFor };
} else {
  Object.assign(window, { STATIC_MODELS, staticMotion, measureModel, FittedModel, StaticBody, GhostModelBody, ghostModelFor });
```

with:

```js
  module.exports = { staticMotion, measureModel, FittedModel };
} else {
  Object.assign(window, { staticMotion, measureModel, FittedModel });
```


In `js/ghost.js`, after line 22, add:

```js
  personalSpace: 1.8, // and the nearest it is ever, however it got there (you walked up to it, or it wandered): it is moved straight back out to here
```

In `js/ghost.js`, **delete** line 28:

```js
  modelChance: 0.5, // how many of them are a model, when there are models (the rest are made in code)
```

In `js/ghost.js`, **replace** line 142:

```js
    if (!watched && this.stage === "present" && distance > this.table.closest) {
```

with:

```js
    if (distance < this.table.personalSpace) {
      const push = this.table.personalSpace - distance; // too near, whatever the reason: it is moved straight back out
      const away = distance > 1e-6 ? [(here[0] - playerPosition[0]) / distance, (here[2] - playerPosition[2]) / distance] : [0, 1];
      this.offset[0] += away[0] * push;
      this.offset[1] += away[1] * push;
    } else if (!watched && this.stage === "present" && distance > this.table.closest) {
```


### Tests

In `tests/staticbody.tests.js`, **replace** line 2:

```js
  const motion = STATIC_MODELS.zombie.motion;
```

with:

```js
  const motion = { sway: 0.07, lean: 0.12, bob: 0.025, squash: 0.08 };
```

In `tests/staticbody.tests.js`, **replace** lines 38 to 39:

```js
  QUnit.test("every number is finite for every state, and every model has a motion", (assert) => {
    for (const [name, entry] of Object.entries(STATIC_MODELS)) {
```

with:

```js
  QUnit.test("every number is finite for every state, including the no motion at all that a model with bones uses for its death", (assert) => {
    for (const [name, entry] of Object.entries({ shambling: { motion }, stiff: { motion: { sway: 0, lean: 0, bob: 0, squash: 0 } } })) {
```

In `tests/staticbody.tests.js`, **delete** lines 48 to 225:

```js

QUnit.module("the models", () => {
  QUnit.test("every model is in the folder of the assets, has a height in metres, and says how it moves", (assert) => {
    for (const [name, entry] of Object.entries(STATIC_MODELS)) {
      assert.strictEqual(entry.url, `../assets/creatures/${name}.glb`);
      assert.true(entry.height > 0.5 && entry.height < 3, name);
      for (const key of ["sway", "lean", "bob", "squash"]) assert.true(entry.motion[key] >= 0, `${name} ${key}`);
    }
  });

  QUnit.test("two of them are ghosts, and every kind of creature that has models names ones that there are", (assert) => {
    assert.deepEqual(Object.keys(STATIC_MODELS).filter((name) => STATIC_MODELS[name].ghost), ["ghost_enraged", "silhouette"]);
    for (const [kind, table] of Object.entries(CREATURES)) {
      if (!table.models) continue;
      for (const name of table.models) assert.true(name in CREATURE_MODELS && !(STATIC_MODELS[name] || {}).ghost, `${kind}: ${name}`);
    }
  });

  QUnit.test("every kind has a pose and a voice, its own or borrowed", (assert) => {
    for (const [kind, table] of Object.entries(CREATURES)) {
      assert.true(Boolean(table.pose || POSES[kind]), kind);
      assert.strictEqual(typeof POSES[table.pose || kind], "function", kind);
      assert.true(["spider", "ghoul", "skeleton"].includes(table.voice || kind), kind);
    }
  });

  QUnit.test("a creature has the model its number says, always the same one", (assert) => {
    const floater = (id) => new Creature({ id, kind: "floater", position: [0, 0, 5], random: () => 0 });
    assert.strictEqual(modelNameFor(floater(1)), "terror");
    assert.strictEqual(modelNameFor(floater(2)), "abomination");
    assert.strictEqual(modelNameFor(floater(2)), modelNameFor(floater(2)));
    assert.strictEqual(modelNameFor(new Creature({ id: 9, kind: "spider", position: [0, 0, 5] })), "spider", "a kind with no list is its own name");
  });

  QUnit.test("a ghost has a model or not by its own number, and never when there are none or the chance is none", (assert) => {
    const names = ["ghost_enraged", "silhouette"];
    let some = 0;
    for (let id = 1; id <= 200; id++) {
      const name = ghostModelFor(id, names, 0.5);
      if (name) { some += 1; assert.true(names.includes(name)); }
      assert.strictEqual(ghostModelFor(id, names, 0.5), name, "the same every time");
      assert.strictEqual(ghostModelFor(id, [], 1), null);
      assert.strictEqual(ghostModelFor(id, names, 0), null);
      assert.true(ghostModelFor(id, names, 1) !== null);
    }
    assert.true(some > 60 && some < 140, `${some} of 200`);
  });
});

QUnit.module("the new kinds", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("a floater floats where it is put, and does not fall", (assert) => {
    const floater = new Creature({ id: 1, kind: "floater", position: [0, 0, 6], random: () => 0 });
    assert.strictEqual(floater.state, "lurk");
    assert.strictEqual(floater.position[1], CREATURES.floater.hover);
    for (let i = 0; i < 100; i++) floater.update(0.05, player);
    assert.strictEqual(floater.position[1], CREATURES.floater.hover);
  });

  QUnit.test("a doll, a floater and a horde come at the player, lunge and touch, like the others", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) {
      const creature = new Creature({ id: 1, kind, position: [0, 0, 5], table: { ...CREATURES[kind], creep: { patience: [0.5, 0.5] } }, random: () => 0 });
      creature.state = "stalk";
      creature.yaw = Math.PI;
      const told = [];
      for (let t = 0; t < 20; t += 0.05) {
        creature.update(0.05, player);
        told.push(...creature.events);
        creature.events = [];
      }
      assert.true(told.includes("lunge") && told.includes("touch"), kind);
    }
  });

  QUnit.test("they have a pose even with no model, borrowed from the ghoul", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) {
      const creature = new Creature({ id: 1, kind, position: [0, 0, 5] });
      assert.true(creature.pose().bones.length > 5, kind);
    }
  });

  QUnit.test("the director may send them, from the intensity the table says", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) assert.true(HUNT.kinds.some((k) => k.kind === kind), kind);
    const random = () => 0.5;
    assert.true(chooseKind(1, 0.5, HUNT, random).kind === "spider");
    const high = new Set();
    let n = 0;
    const spread = () => ((n++ * 0.137) % 1);
    for (let i = 0; i < 400; i++) high.add(chooseKind(1, 2.5, HUNT, spread).kind);
    assert.true(high.has("floater") && high.has("horde") && high.has("doll"));
  });
});

QUnit.module("real models", () => {
  // The unrigged models of this step were taken out of the series (the creatures are rigged models now), so these tests only run where the files are still there.
  const staticModelsPresent = async () => {
    try {
      return (await fetch(STATIC_MODELS.zombie.url)).ok;
    } catch (error) {
      return false;
    }
  };
  const make = () => {
    const engine = new BABYLON.NullEngine();
    return { engine, scene: new BABYLON.Scene(engine) };
  };

  QUnit.test("every model in the table loads from the assets folder, and has a mesh in it", async (assert) => {
    if (!(await staticModelsPresent())) return assert.ok(true, "skipped: the unrigged models are not in the series any more");
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, STATIC_MODELS);
    assert.deepEqual([...loaded.keys()].sort(), Object.keys(STATIC_MODELS).sort(), "none was left out");
    for (const [name, model] of loaded) assert.true(model.container.meshes.length > 0, name);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a model is fitted: as tall as the table says, with its feet on the floor, in the middle", async (assert) => {
    if (!(await staticModelsPresent())) return assert.ok(true, "skipped: the unrigged models are not in the series any more");
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { zombie: STATIC_MODELS.zombie, doll: STATIC_MODELS.doll });
    for (const [name, model] of loaded) {
      const fitted = new FittedModel(scene, model, name);
      const { min, max } = fitted.pivot.getHierarchyBoundingVectors(true);
      assert.true(Math.abs(max.y - min.y - model.entry.height) < 0.02, `${name}: ${(max.y - min.y).toFixed(3)} m`);
      assert.true(Math.abs(min.y) < 0.02, `${name}: feet at ${min.y.toFixed(3)}`);
      assert.true(Math.abs((min.x + max.x) / 2) < 0.02 && Math.abs((min.z + max.z) / 2) < 0.02, `${name}: in the middle`);
      fitted.dispose();
    }
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a static body is put where the creature is, turned, and moved by its motion; and a dead one fades", async (assert) => {
    if (!(await staticModelsPresent())) return assert.ok(true, "skipped: the unrigged models are not in the series any more");
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { zombie: STATIC_MODELS.zombie });
    const creature = new Creature({ id: 1, kind: "ghoul", position: [2, 0, 5], random: () => 0 });
    creature.yaw = 0.8;
    const body = makeCreatureBody(scene, creature, null, null, loaded);
    assert.true(body instanceof StaticBody);
    body.update();
    assert.deepEqual([body.root.position.x, body.root.position.z], [2, 5]);
    assert.strictEqual(body.root.rotation.y, 0.8);
    creature.hit(100);
    creature.update(CREATURES.ghoul.deathTime * 0.95, { position: [0, 1.4, 0] });
    body.update();
    assert.true(body.root.rotation.x < -1, "toppled");
    assert.true(body.fitted.meshes.every((mesh) => mesh.visibility < 0.5), "and mostly gone");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a ghost model floats where the ghost is, turned, and as faint as it is", async (assert) => {
    if (!(await staticModelsPresent())) return assert.ok(true, "skipped: the unrigged models are not in the series any more");
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { silhouette: STATIC_MODELS.silhouette });
    const ghost = new Apparition({ id: 3, home: [1, 0, 4], delay: 0 });
    const body = new GhostModelBody(scene, ghost, loaded.get("silhouette"));
    ghost.update(0.1, [8, 1.4, 4]);
    body.update();
    assert.true(body.root.isEnabled());
    assert.strictEqual(body.root.position.x, ghost.position()[0]);
    assert.true(body.fitted.meshes[0].visibility < 0.5, "it is only just there");
    ghost.update(6, [8, 1.4, 4]);
    body.update();
    assert.true(body.fitted.meshes[0].visibility > 0.2, "and there");
    const waiting = new GhostModelBody(scene, new Apparition({ id: 4, home: [0, 0, 4], delay: 9 }), loaded.get("silhouette"));
    waiting.update();
    assert.false(waiting.root.isEnabled(), "a ghost that has not begun is not there");
    body.dispose();
    waiting.dispose();
    scene.dispose();
    engine.dispose();
  });
});
```


In `tests/ghost.tests.js`, after line 301, add:

```js

QUnit.module("a ghost keeps its distance", () => {
  const player = [0, 1.4, 0];

  QUnit.test("a ghost the player walks up to is moved straight back out to the personal space", (assert) => {
    const g = new Apparition({ id: 1, home: [0, 0, 1], delay: 0 });
    g.update(GHOST.fadeIn + 0.5, player, true);
    g.update(0.05, player, true);
    const p = g.position();
    assert.true(Math.hypot(p[0] - player[0], p[2] - player[2]) >= GHOST.personalSpace - 0.05);
  });

  QUnit.test("however it wanders it is never nearer than the space, over a long time", (assert) => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const g = new Apparition({ id: seed, home: [0.5, 0, 3], delay: 0 });
      g.update(GHOST.fadeIn + 0.5, player, true);
      for (let i = 0; i < 1500; i++) {
        g.update(0.1, player, i % 40 < 20);
        const p = g.position();
        assert.true(Math.hypot(p[0] - player[0], p[2] - player[2]) >= GHOST.personalSpace - 0.2, `ghost ${seed} at step ${i}`);
      }
    }
  });

  QUnit.test("the space is less than the nearest it creeps to, and more than a person's reach", (assert) => {
    assert.true(GHOST.personalSpace < GHOST.closest && GHOST.personalSpace > 1.2);
  });
});
```


## Step 4: Their bodies

A model with clips is told which clip to play for what the creature is doing. `CREATURE_MODELS` has a row for each: the file, how tall it is, a map from **roles** (idle, walk, run, lunge, recover, die, arise) to the names of clips in its file, and how fast each plays. A role with no clip falls back to a sensible one (a run falls back to the lunge's clip; a creature with no idle walks very slowly instead).

- the **skeleton** has a walk, a run, and a scream (its recovery); no death, so it is stopped and toppled;
- the **mummy** staggers (a clip of its own) and then runs;
- the **ghoul girl** has *arise* and *dead*: both play once, and she does not topple, because her animation is her fall;
- the **doll** has a shaky walk that it uses for walking and, slowly, for waiting, and a run for its rush.

A creature that peeks **tilts** towards the middle of the view as it leans out: a rotation about the way it faces, `peekTilt`.

In `js/creaturemesh.js`, **replace** lines 22 to 25:

```js
// The models there are: the skeleton has a skeleton and clips of its own; the rest are in staticbody.js (they do not move by themselves).
// The spider has no model yet, and is shapes.
const CREATURE_MODELS = {
  spider: null,
```

with:

```js
// The models there are. Only a model with a skeleton and clips of its own is used: the skeleton. The spider and the ghoul have none, and are
// shapes.
const CREATURE_MODELS = {
  spider: null,
  ghoul: null,
  doll: {
    url: "../assets/creatures/doll.glb",
    height: 1.1,
    yaw: 0,
    // Three clips: Elderly_Shaky_Walk_inplace (a walk that shakes, 2.8 seconds a step cycle: it is the doll's walk, and its idle, slowly), Walking (not used: it
    // is too normal) and Running (its rush). It has no death: a dying doll is stopped and toppled.
    clips: { idle: "Elderly_Shaky_Walk_inplace", walk: "Elderly_Shaky_Walk_inplace", run: "Running", lunge: "Running", recover: "Elderly_Shaky_Walk_inplace" },
    speeds: { idle: 0.3, walk: 1, run: 1, lunge: 1.2, recover: 0.5 },
  },
  ghoul_girl: {
    url: "../assets/creatures/ghoul_girl.glb",
    height: 1.6,
    yaw: 0,
    // Four clips: Arise (she rises from the floor: it plays once), Walking (a walk that she keeps up all the way to you), Running (not used), and
    // Dead (she falls: it plays once, and is her death).
    clips: { arise: "Arise", idle: "Walking", walk: "Walking", lunge: "Running", recover: "Walking", die: "Dead" },
    speeds: { arise: 1, idle: 0.2, walk: 1, lunge: 1, recover: 0.5, die: 1 },
  },
  mummy: {
    url: "../assets/creatures/mummy.glb",
    height: 1.7,
    yaw: 0,
    // Three clips: Walking, Running and Mummy_Stagger. It staggers towards you (the stagger plays while it comes, and slowly while it waits) and
    // then runs (the run plays while it charges and while it rushes).
    clips: { idle: "Mummy_Stagger", walk: "Mummy_Stagger", run: "Running", lunge: "Running", recover: "Mummy_Stagger" },
    speeds: { idle: 0.3, walk: 1, run: 1.1, lunge: 1.2, recover: 0.5 },
  },
```

In `js/creaturemesh.js`, **replace** lines 60 to 63:

```js
    clips: { idle: "Walking", walk: "Walking", lunge: "Running", recover: "Zombie_Scream" },
    speeds: { idle: 0.2, walk: 1, lunge: 1.1, recover: 1 },
  },
  ...STATIC_MODELS,
```

with:

```js
    clips: { idle: "Walking", walk: "Walking", run: "Running", lunge: "Running", recover: "Zombie_Scream" },
    speeds: { idle: 0.2, walk: 1, run: 1.1, lunge: 1.1, recover: 1 },
  },
```

In `js/creaturemesh.js`, after line 96, add:

```js
// How far a creature that is peeking tilts, in radians, about the way it faces: towards the middle of the view, from the side it is hidden on
// (`side` is 1 on the right, -1 on the left; it faces the player, so its own right is the player's left). Nothing for one that is not peeking.
function peekTilt(creature) {
  return creature.peek ? -creature.peek.side * creature.lean * PEEK.lean : 0;
}

```

In `js/creaturemesh.js`, after line 141, add:

```js
    this.root.rotation.z = peekTilt(creature);
```

In `js/creaturemesh.js`, **replace** line 190:

```js
    return { lurk: "idle", stalk: "walk", creep: "idle", lunge: "lunge", recover: "recover", retreat: "walk", dying: "die" }[state] || "idle";
```

with:

```js
    return { peek: "idle", arise: "arise", lurk: "idle", stalk: "walk", creep: "idle", charge: "run", lunge: "lunge", recover: "recover", retreat: "walk", dying: "die" }[state] || "idle";
```

In `js/creaturemesh.js`, **replace** line 196:

```js
    return clips[role] || (role === "die" ? null : clips.idle) || null;
```

with:

```js
    return clips[role] || (role === "run" ? clips.lunge : null) || (role === "die" ? null : clips.idle) || null;
```

In `js/creaturemesh.js`, **replace** line 205:

```js
    pivot.rotation.set(fall.pitch, creature.yaw + (this.entry.yaw || 0), 0);
```

with:

```js
    // a model with a death of its own falls as it was made to; one without is stopped and toppled
    pivot.rotation.set((this.entry.clips || {}).die ? 0 : fall.pitch, creature.yaw + (this.entry.yaw || 0), peekTilt(creature));
```

In `js/creaturemesh.js`, **replace** line 220:

```js
      if (next) next.start(role !== "die", speed);
```

with:

```js
      if (next) next.start(role !== "die" && role !== "arise", speed); // rising and dying play once
```

In `js/creaturemesh.js`, **replace** line 241:

```js
  return loaded.entry.clips ? new ModelBody(scene, creature, loaded) : new StaticBody(scene, creature, loaded);
```

with:

```js
  return new ModelBody(scene, creature, loaded);
```

In `js/creaturemesh.js`, **replace** lines 248 to 250:

```js
  module.exports = { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, modelNameFor, makeCreatureBody };
} else {
  Object.assign(window, { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, modelNameFor, makeCreatureBody });
```

with:

```js
  module.exports = { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, peekTilt, CreatureBody, ModelBody, modelNameFor, makeCreatureBody };
} else {
  Object.assign(window, { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, peekTilt, CreatureBody, ModelBody, modelNameFor, makeCreatureBody });
```


### Tests

These load the **real files** with an engine that draws nothing (`NullEngine`) and say that every clip a table names is in its model, that a creature plays the right one for what it is doing, and that a creature with a death of its own does not topple.

In `tests/creaturemesh.tests.js`, **replace** lines 105 to 106:

```js
    assert.deepEqual(Object.keys(CREATURE_MODELS.skeleton.clips).sort(), ["idle", "lunge", "recover", "walk"]);
    for (const name of ["zombie", "doll", "abomination", "terror", "horde"]) assert.true(CREATURE_MODELS[name].url.endsWith(`${name}.glb`), name);
```

with:

```js
    assert.deepEqual(Object.keys(CREATURE_MODELS.skeleton.clips).sort(), ["idle", "lunge", "recover", "run", "walk"]);
```

In `tests/creaturemesh.tests.js`, after line 204, add:

```js

QUnit.module("the mummy's model", () => {
  QUnit.test("it loads with its three clips and its bones, and every clip the table names is there", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = (await loadCreatureModels(scene, { mummy: CREATURE_MODELS.mummy })).get("mummy");
    assert.deepEqual(loaded.container.animationGroups.map((g) => g.name).sort(), ["Mummy_Stagger", "Running", "Walking"]);
    assert.strictEqual(loaded.container.skeletons.length, 1);
    for (const clip of Object.values(CREATURE_MODELS.mummy.clips)) assert.true(loaded.container.animationGroups.some((g) => g.name === clip), clip);
    const creature = new Creature({ id: 1, kind: "mummy", position: [0, 0, 6], random: () => 0.5 });
    const body = makeCreatureBody(scene, creature, null, null, new Map([["mummy", loaded]]));
    assert.true(body instanceof ModelBody);
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Mummy_Stagger");
    const { min, max } = body.root.getHierarchyBoundingVectors(true);
    assert.true(Math.abs(max.y - min.y - CREATURE_MODELS.mummy.height) < 0.03, "as tall as the table says");
    creature.state = "charge";
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Running");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("the ghoul girl's model", () => {
  QUnit.test("it loads with Arise, Walking, Running and Dead, and every clip the table names is there", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = (await loadCreatureModels(scene, { ghoul_girl: CREATURE_MODELS.ghoul_girl })).get("ghoul_girl");
    assert.deepEqual(loaded.container.animationGroups.map((g) => g.name).sort(), ["Arise", "Dead", "Running", "Walking"]);
    for (const clip of Object.values(CREATURE_MODELS.ghoul_girl.clips)) assert.true(loaded.container.animationGroups.some((g) => g.name === clip), clip);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("she plays Arise once, then Walking, and Dead once, and does not topple, because she has a death of her own", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = (await loadCreatureModels(scene, { ghoul_girl: CREATURE_MODELS.ghoul_girl })).get("ghoul_girl");
    const creature = new Creature({ id: 1, kind: "ghoul_girl", position: [0, 0, 7], random: () => 0.5 });
    const body = makeCreatureBody(scene, creature, null, null, new Map([["ghoul_girl", loaded]]));
    assert.true(body instanceof ModelBody);
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Arise");
    assert.false(body.current.loopAnimation, "it plays once");
    creature.state = "stalk";
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Walking");
    assert.true(body.current.loopAnimation);
    creature.state = "dying";
    creature.timer = CREATURES.ghoul_girl.deathTime * 0.5;
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Dead");
    assert.false(body.current.loopAnimation);
    assert.strictEqual(body.root.rotation.x, 0, "she does not topple: the animation is her fall");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a clip that plays once, and a model with no rising clip, are both fine", (assert) => {
    assert.strictEqual(ModelBody.roleFor("arise"), "arise");
    assert.strictEqual(ModelBody.clipFor("arise", { idle: "Idle" }), "Idle");
    assert.strictEqual(ModelBody.clipFor("arise", { arise: "Rise", idle: "Idle" }), "Rise");
  });
});

QUnit.module("the doll's model", () => {
  QUnit.test("it loads with a shaky walk and a run, and every clip the table names is there", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = (await loadCreatureModels(scene, { doll: CREATURE_MODELS.doll })).get("doll");
    assert.true(!!loaded, "it loads");
    for (const clip of Object.values(CREATURE_MODELS.doll.clips)) assert.true(loaded.container.animationGroups.some((g) => g.name === clip), clip);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("it walks with the shake, runs when it rushes, and is stopped and toppled when it dies", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = (await loadCreatureModels(scene, { doll: CREATURE_MODELS.doll })).get("doll");
    const creature = new Creature({ id: 1, kind: "doll", position: [0, 0, 7], random: () => 0.5 });
    const body = makeCreatureBody(scene, creature, null, null, new Map([["doll", loaded]]));
    assert.true(body instanceof ModelBody);
    creature.state = "stalk";
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Elderly_Shaky_Walk_inplace");
    creature.state = "lunge";
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Running");
    creature.state = "dying";
    creature.timer = CREATURES.doll.deathTime * 0.5;
    body.update();
    assert.true(body.root.rotation.x !== 0, "no death clip of its own, so it topples");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });
});
```


Open `tests.html`. You should see **402 passing tests**: 15 more than before (some tests belonged to code that is gone, and many are new: the mummy, the skeleton that charges, the ghoul girl, the doll, personal space, the weaknesses, the ghosts' distance).

## Step 5: Peeks

A peek is a creature that leans out from behind something for a second or two, and goes back. The game knows very little of the room (a floor, and not even that in the camera's mode), so a peek comes from one of two places: **the edge of the view**, where the creature is just outside the picture, leans in until half of it can be seen, and draws back (the edge of the screen is the corner), or a **spot the player has marked** (the foot of a doorway). A **pop** is a peek with no leaning: the creature is just there, nearer, with a strike, and gone in a second.

`peeks.js` works out where a peek goes (`peekAtEdge`, `peekAtSpot`) and when one comes (`Peeker`): a table of times (the first after 15 to 30 seconds, then 22 to 45, one in four a pop), a weight for each kind that peeks, and the rule that none comes while something else is about.

Open `js/peeks.js` (the placeholder) and **replace the TODO line** with:

```js
// Peeks: a creature that leans out for a second or two and goes back, and the jump scare that is the same thing without the leaning (a **pop**).
// The game knows very little of the room, so a peek comes from one of two places. The first is the edge of the view: the creature is just
// outside the picture, leans in until half of it can be seen, and draws back, so the edge of the screen is the corner. The second is a spot
// the player has marked (the foot of a doorway, the end of a wall): it leans out of that. This file works out where a peek goes and when one
// comes, with the randomness given in, so a test can run a whole game of them. (It uses bearingTo, inView and pickWeighted from director.js.)
// See ../tests/peeks.tests.js.

const PEEKS = {
  enabled: true,
  first: [15, 30], // seconds before the first
  gap: [22, 45], // seconds between one and the next
  popChance: 0.25, // how often it is a pop and not a peek
  popGapFactor: 1.6, // and a pop makes the quiet after it longer
  maxActive: 1, // creatures alive at once, at which no peek comes
  distance: [2.8, 3.8], // metres from the player
  popDistance: [2.2, 3],
  hidden: 10, // degrees past the edge of the view that the middle of the creature is, while it is hidden
  leaned: 1, // degrees inside the edge that it is when it has leaned out
  spotChance: 0.6, // how often it is a marked spot, when there is one in view
  spotRange: [2.5, 9], // how far a marked spot may be
  spotBehind: [0.6, 0.5], // metres: how far to the side and back from a spot it waits
  spotLean: 0.35, // and how far past the spot it leans
  kinds: [
    { kind: "ghoul_girl", weight: 2 },
    { kind: "doll", weight: 3 },
    { kind: "mummy", weight: 1 },
    { kind: "skeleton", weight: 2 },
    { kind: "spider", weight: 2 },
  ],
};

const between = (range, random) => range[0] + random() * (range[1] - range[0]);

// A peek from the edge of the view: { from, to, side, pop }, the points as [x, z]. `side` is 1 for the right edge, -1 for the left.
function peekAtEdge(player, halfFov, table, random, pop = false) {
  const side = random() < 0.5 ? -1 : 1;
  const distance = between(pop ? table.popDistance : table.distance, random);
  const hidden = pointAt(player, side * (halfFov + table.hidden), distance);
  const leaned = pointAt(player, side * (halfFov - table.leaned), distance);
  return { from: [hidden[0], hidden[2]], to: [leaned[0], leaned[2]], side, pop };
}

// A peek from a marked spot (a point on the floor): it waits behind it, to the side and back, and leans out past it towards the middle of the view.
function peekAtSpot(player, spot, table, pop = false) {
  const dx = spot[0] - player.position[0];
  const dz = spot[2] - player.position[2];
  const length = Math.hypot(dx, dz) || 1;
  const along = [dx / length, dz / length];
  let across = [along[1], -along[0]]; // sideways, to one side of the line of sight
  const towardMiddle = (sign) => Math.abs(bearingTo(player, [spot[0] + across[0] * sign * 0.1, 0, spot[2] + across[1] * sign * 0.1]));
  if (towardMiddle(1) < towardMiddle(-1)) across = [-across[0], -across[1]]; // across points away from the middle of the view
  const side = bearingTo(player, spot) >= 0 ? 1 : -1;
  const [aside, back] = table.spotBehind;
  const from = [spot[0] + across[0] * aside + along[0] * back, spot[2] + across[1] * aside + along[1] * back];
  const to = [spot[0] - across[0] * table.spotLean, spot[2] - across[1] * table.spotLean];
  return { from, to, side, pop };
}

// The one that sends peeks. `update` is told how things are and gives an order, { kind, peek }, when one is due, and nothing the rest of the time.
class Peeker {
  constructor(table = PEEKS, random = Math.random) {
    this.table = table;
    this.random = random;
    this.timer = between(table.first, random);
    this.last = "none";
  }

  // `state` is { player, halfFov, spots, active, playing }: `spots` are the marked points, [x, y, z], and `active` is how many creatures are alive.
  update(seconds, state) {
    const table = this.table;
    if (!table.enabled || !state.playing) return null;
    this.timer -= seconds;
    if (this.timer > 0) return null;
    if (state.active >= table.maxActive) {
      this.timer = 2; // not now: soon
      return null;
    }
    const pop = this.random() < table.popChance;
    this.timer = between(table.gap, this.random) * (pop ? table.popGapFactor : 1);
    return this.order(state, pop);
  }

  // An order for a peek (or a pop) now, whether one is due or not.
  order(state, pop) {
    const table = this.table;
    const kind = pickWeighted(table.kinds, (k) => k.weight, this.random).kind;
    const near = (state.spots || []).filter((spot) => {
      const distance = Math.hypot(spot[0] - state.player.position[0], spot[2] - state.player.position[2]);
      return distance >= table.spotRange[0] && distance <= table.spotRange[1] && inView(state.player, spot, state.halfFov, 0);
    });
    const fromSpot = near.length > 0 && this.random() < table.spotChance;
    const peek = fromSpot ? peekAtSpot(state.player, near[Math.floor(this.random() * near.length)], table, pop) : peekAtEdge(state.player, state.halfFov, table, this.random, pop);
    this.last = `${pop ? "pop" : "peek"} ${kind} from ${fromSpot ? "a marked spot" : "the edge"}`;
    return { kind, peek };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PEEKS, peekAtEdge, peekAtSpot, Peeker };
} else {
  Object.assign(window, { PEEKS, peekAtEdge, peekAtSpot, Peeker });
}
```

Things to notice:

- **Everything is given to it**: the player, the half field of view, the marked spots, how many creatures are alive and the random numbers. So a test can play a whole game of peeks.
- **A spot is used only if it is in view, and a good distance away;** otherwise the edge is used, and a peek never fails to come.

### Tests

Open `tests/peeks.tests.js` (the placeholder) and **replace the TODO line** with:

```js
const peekRandom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

QUnit.module("a creature that peeks", () => {
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const plan = { from: [3, 3.5], to: [1.5, 3.5], side: 1, pop: false };
  const make = (peek = plan, kind = "ghoul_girl") => new Creature({ id: 1, kind, position: [0, 0, 0], random: () => 0.5, peek });

  QUnit.test("it begins hidden, leans out, stays, draws back and is gone", (assert) => {
    const creature = make();
    assert.strictEqual(creature.state, "peek");
    assert.deepEqual([creature.position[0], creature.position[2]], plan.from);
    const seen = [];
    for (let t = 0; t < 8 && !creature.done; t += 0.05) {
      creature.update(0.05, player);
      seen.push(creature.lean);
    }
    assert.true(creature.done, "it goes");
    assert.true(Math.max(...seen) > 0.99, "it leans all the way out");
    assert.true(seen[0] < 0.1, "from nothing");
    const length = creature.peek.inTime + creature.peek.hold + creature.peek.outTime;
    assert.true(length > 2.5 && length < 4.5, `${length.toFixed(1)} seconds`);
  });

  QUnit.test("it tells of itself once, and faces the player", (assert) => {
    const creature = make();
    const events = [];
    for (let t = 0; t < 8; t += 0.05) {
      creature.update(0.05, player);
      events.push(...creature.events);
      creature.events = [];
    }
    assert.deepEqual(events, ["peek"]);
    const toward = Math.atan2(player.position[0] - creature.position[0], player.position[2] - creature.position[2]);
    assert.true(Math.abs(creature.yaw - toward) < 1e-6);
  });

  QUnit.test("a pop is there at once, with a strike, and gone in a second or two", (assert) => {
    const creature = make({ ...plan, pop: true });
    assert.deepEqual([creature.position[0], creature.position[2]], plan.to, "it is where it can be seen");
    creature.update(0.02, player);
    assert.deepEqual(creature.events, ["pop"]);
    assert.true(creature.lean > 0.99, "no leaning out");
    let time = 0.02;
    while (!creature.done && time < 10) {
      creature.update(0.02, player);
      time += 0.02;
    }
    assert.true(time > 0.9 && time < 2.2, `${time.toFixed(2)} seconds`);
  });

  QUnit.test("it can be hit while it is out, and falls the way anything does", (assert) => {
    const creature = make();
    for (let t = 0; t < 1.5; t += 0.05) creature.update(0.05, player);
    assert.true(creature.alive);
    creature.capture();
    assert.strictEqual(creature.state, "dying");
  });

  QUnit.test("its body tilts towards the middle of the view, only while it leans", (assert) => {
    const creature = make();
    assert.strictEqual(peekTilt(creature), 0);
    creature.lean = 1;
    assert.true(Math.abs(Math.abs(peekTilt(creature)) - PEEK.lean) < 1e-9);
    const left = make({ ...plan, side: -1 });
    left.lean = 1;
    assert.strictEqual(Math.sign(peekTilt(left)), -Math.sign(peekTilt(creature)), "the other way from the other side");
    assert.strictEqual(peekTilt({ peek: null, lean: 1 }), 0, "a creature that does not peek never tilts");
  });
});

QUnit.module("where a peek goes", () => {
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const halfFov = 30;

  QUnit.test("from the edge: hidden just outside the view, and out just inside it, on one side", (assert) => {
    for (let seed = 1; seed < 40; seed++) {
      const random = peekRandom(seed);
      const peek = peekAtEdge(player, halfFov, PEEKS, random);
      const hidden = bearingTo(player, [peek.from[0], 0, peek.from[1]]);
      const out = bearingTo(player, [peek.to[0], 0, peek.to[1]]);
      assert.true(Math.abs(hidden) > halfFov + PEEKS.hidden - 0.5, `hidden at ${hidden.toFixed(1)}`);
      assert.true(Math.abs(out) < halfFov, `out at ${out.toFixed(1)}`);
      assert.strictEqual(Math.sign(hidden), peek.side);
      assert.strictEqual(Math.sign(out), peek.side);
      const distance = Math.hypot(peek.to[0], peek.to[1]);
      assert.true(distance >= PEEKS.distance[0] - 0.01 && distance <= PEEKS.distance[1] + 0.01);
    }
  });

  QUnit.test("a pop is nearer than a peek", (assert) => {
    for (let seed = 1; seed < 20; seed++) {
      const peek = peekAtEdge(player, halfFov, PEEKS, peekRandom(seed), true);
      assert.true(peek.pop);
      assert.true(Math.hypot(peek.to[0], peek.to[1]) <= PEEKS.popDistance[1] + 0.01);
    }
  });

  QUnit.test("from a marked spot: it waits behind it and leans out past it towards the middle of the view", (assert) => {
    for (const spot of [[3, 0, 5], [-4, 0, 6], [1, 0, 3]]) {
      const peek = peekAtSpot(player, spot, PEEKS);
      const hidden = Math.abs(bearingTo(player, [peek.from[0], 0, peek.from[1]]));
      const out = Math.abs(bearingTo(player, [peek.to[0], 0, peek.to[1]]));
      assert.true(out < hidden, `${out.toFixed(1)} is nearer the middle than ${hidden.toFixed(1)}`);
      assert.true(Math.hypot(peek.to[0] - spot[0], peek.to[1] - spot[2]) <= PEEKS.spotLean + 1e-6, "it only leans a little way");
    }
  });
});

QUnit.module("the one that sends peeks", () => {
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const state = (extra = {}) => ({ player, halfFov: 30, spots: [], active: 0, playing: true, ...extra });

  QUnit.test("nothing comes at first, or when the game is not on", (assert) => {
    const peeker = new Peeker(PEEKS, peekRandom(3));
    for (let t = 0; t < PEEKS.first[0] - 1; t += 0.5) assert.strictEqual(peeker.update(0.5, state()), null);
    const waiting = new Peeker(PEEKS, peekRandom(3));
    for (let t = 0; t < 200; t += 0.5) assert.strictEqual(waiting.update(0.5, state({ playing: false })), null);
  });

  QUnit.test("none comes while something else is about, and it comes soon after", (assert) => {
    const peeker = new Peeker(PEEKS, peekRandom(5));
    for (let t = 0; t < 60; t += 0.5) assert.strictEqual(peeker.update(0.5, state({ active: PEEKS.maxActive })), null);
    let waited = 0;
    while (!peeker.update(0.5, state()) && waited < 10) waited += 0.5;
    assert.true(waited <= 2.5, `${waited} seconds`);
  });

  QUnit.test("over an hour: peeks every half minute or so, a quarter of them pops, never closer together than the table says", (assert) => {
    const peeker = new Peeker(PEEKS, peekRandom(11));
    const times = [];
    let pops = 0;
    for (let t = 0; t < 3600; t += 0.5) {
      const order = peeker.update(0.5, state());
      if (order) {
        times.push(t);
        if (order.peek.pop) pops += 1;
        assert.true(["ghoul_girl", "doll", "mummy", "skeleton", "spider"].includes(order.kind));
      }
    }
    assert.true(times.length > 60 && times.length < 180, `${times.length} peeks`);
    const share = pops / times.length;
    assert.true(share > 0.1 && share < 0.4, `${(share * 100).toFixed(0)}% pops`);
    const gaps = times.slice(1).map((t, i) => t - times[i]);
    assert.true(Math.min(...gaps) >= PEEKS.gap[0] - 0.5, `shortest gap ${Math.min(...gaps)}`);
  });

  QUnit.test("a spot in view is used sometimes; one out of view or too near never is", (assert) => {
    const peeker = new Peeker({ ...PEEKS, spotChance: 1 }, peekRandom(7));
    const inView = peeker.order(state({ spots: [[1, 0, 6]] }), false);
    assert.true(peeker.last.includes("marked spot"));
    assert.true(Math.hypot(inView.peek.to[0] - 1, inView.peek.to[1] - 6) <= PEEKS.spotLean + 1e-6);
    peeker.order(state({ spots: [[0, 0, -6]] }), false);
    assert.true(peeker.last.includes("the edge"), "behind the player");
    peeker.order(state({ spots: [[0, 0, 1]] }), false);
    assert.true(peeker.last.includes("the edge"), "too near");
  });
});
```

Open `tests.html`. You should see **414 passing tests**: 12 more.

## Step 6: The door scan

The edge of the screen is a corner that is always there, and a marked doorway is a better one, but marking takes a person. **A doorway can be found in the camera's picture.** A small segmentation model, **SegFormer-B0** trained on the ADE20K scenes (it labels every pixel as one of 150 things, among them a *door* and *stairs*), does it in about a second on a phone, and is 4 MB. The page runs it with **onnxruntime-web**.

What the code does with a picture:

1. **`modelInput`** stretches the picture to the model's square and turns it into three planes of numbers, taken to the model's mean and spread.
2. **`labelsOf`** turns what the model says (a score for each of 150 kinds at each pixel) into a label for each pixel: the best score.
3. **`blobsOf`** finds the doors and the stairs in the labels, as blobs, by flood fill. The labels are grown by a cell first, because the model's doors have holes (a glass panel is not a door to it). **The foot** of a blob is where the floor begins below it, not the bottom of the blob (the model labels only the top of a glass door).
4. **`floorPointOf`** works out which point of the floor the foot of a door shows: a ray from the eye, through that pixel of the picture, to the floor.
5. **`candidatesFrom`** keeps the points in range, drops two that are the same place, and no more than the table allows; **`newSpots`** drops those already known.

Everything except the model's own run is plain arithmetic, so the tests say what a door in a made-up map of labels is, where its foot is, and what point of the floor a pixel is.

Open `js/doorscan.js` (the placeholder) and **replace the TODO line** with:

```js
// Door scan (a prototype): finding doorways in the camera's picture, to use as places to peek from. A small segmentation model (SegFormer-B0,
// trained on the ADE20K scenes) labels every pixel of a picture as one of 150 things, among them a door; the doors are found in the labels as
// blobs, the bottom middle of each blob is where it meets the floor, and a ray from the eye through that pixel to the floor gives a point in
// the room to mark. The model is run by onnxruntime-web, from a page that has loaded `ort`. The parts that are arithmetic (blobs, the ray to
// the floor, the choice of which to keep) have no model in them, so they are tested with made-up labels. (It uses hitPlane from surface.js
// and lookAxes from look.js.) See ../tests/doorscan.tests.js and ../scan.html.

const SCAN = {
  modelUrl: "https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512/resolve/main/onnx/model_quantized.onnx",
  runtimeUrl: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js", // the library that runs the model
  size: 512, // the model is given a square picture this many pixels across
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
  // The labels (ADE20K numbers) that mean a way through: a door, a screen door, and the stairs, which are a way through too. A kind has the least part of
  // the picture it must fill to count (a speck of door is noise), and the least height it must be, as a part of the picture's height.
  kinds: {
    14: { name: "door", minArea: 0.004, minHeight: 0.1 },
    58: { name: "door", minArea: 0.004, minHeight: 0.1 },
    53: { name: "stairs", minArea: 0.006, minHeight: 0.08 },
    59: { name: "stairs", minArea: 0.006, minHeight: 0.08 },
  },
  grow: 1, // cells: the model's doors have holes (a glass panel is not a door to it), so a blob is the labels grown by this much
  floors: [3, 28, 52], // floor, rug and path: what a door stands on
  reach: 0.3, // how far below a door, as a part of the picture's height, to look for the floor it stands on
  maxCandidates: 4,
  minSeparation: 1.2, // metres: two candidates nearer than this are the same one
  range: [2.5, 9], // metres from the player that a spot may be (the table of the peeks says the same)
};

// The blobs of the wanted labels in a map of labels (`labels` is one number per pixel, `width` across), found by flood fill, as
// [{ kind, area, box: [left, top, right, bottom], bottom: [x, y], onFloor }], the numbers as parts of the picture, 0 to 1. `bottom` is the foot of the
// blob: where the floor begins below its middle (`onFloor` is true), or, when none is found there, the bottom middle of the blob. The blobs that
// are too small are not kept.
function blobsOf(labels, width, height, table = SCAN) {
  const wanted = new Uint8Array(labels.length); // 1 where a label is a way through, grown a little to close its holes
  for (let i = 0; i < labels.length; i++) {
    if (!table.kinds[labels[i]]) continue;
    const x = i % width, y = (i - x) / width;
    for (let dy = -table.grow; dy <= table.grow; dy++) {
      for (let dx = -table.grow; dx <= table.grow; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) wanted[ny * width + nx] = labels[i];
      }
    }
  }
  const seen = new Uint8Array(labels.length);
  const found = [];
  const stack = [];
  for (let start = 0; start < labels.length; start++) {
    if (!wanted[start] || seen[start]) continue;
    const kind = table.kinds[wanted[start]];
    let count = 0, left = width, right = 0, top = height, bottom = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const at = stack.pop();
      const x = at % width, y = (at - x) / width;
      count += 1;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      for (const next of [x > 0 ? at - 1 : -1, x < width - 1 ? at + 1 : -1, y > 0 ? at - width : -1, y < height - 1 ? at + width : -1]) {
        if (next >= 0 && !seen[next] && table.kinds[wanted[next]] && table.kinds[wanted[next]].name === kind.name) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    if (count / labels.length < kind.minArea || (bottom - top + 1) / height < kind.minHeight) continue;
    // the foot: from the bottom of the blob, down the middle third of it, to the first floor in each column; the middle of those
    const feet = [];
    const reach = Math.round(table.reach * height);
    const from = Math.floor(left + (right - left) / 3), to = Math.ceil(right - (right - left) / 3);
    for (let x = from; x <= to; x++) {
      for (let y = bottom; y < Math.min(height, bottom + reach); y++) {
        if (table.floors.includes(labels[y * width + x])) {
          feet.push(y);
          break;
        }
      }
    }
    const middle = (left + right + 1) / 2 / width;
    let foot = bottom + 1, onFloor = false;
    if (feet.length >= Math.max(1, (to - from + 1) / 3)) {
      feet.sort((p, q) => p - q);
      foot = feet[Math.floor(feet.length / 2)];
      onFloor = true;
    }
    found.push({ kind: kind.name, area: count / labels.length, box: [left / width, top / height, (right + 1) / width, (bottom + 1) / height], bottom: [middle, foot / height], onFloor });
  }
  return found.sort((p, q) => q.area - p.area);
}

// The part of a video picture that is on a screen when the picture fills the screen the way CSS `object-fit: cover` does (the picture is cut at
// the edges and not squeezed): { sx, sy, sw, sh } in the picture's pixels, for the screen's width over height.
function coverCrop(videoWidth, videoHeight, screenAspect) {
  const videoAspect = videoWidth / videoHeight;
  if (videoAspect > screenAspect) {
    const sw = videoHeight * screenAspect;
    return { sx: (videoWidth - sw) / 2, sy: 0, sw, sh: videoHeight };
  }
  const sh = videoWidth / screenAspect;
  return { sx: 0, sy: (videoHeight - sh) / 2, sw: videoWidth, sh };
}

// The floor point a pixel of the camera's picture shows: `u` and `v` are the place in the picture, 0 to 1 from the left and from the top, `view` is where the
// camera looks ({ position, forward, up }), `fovDegrees` is the field of view top to bottom, and `aspect` the width over the height. Nothing if it is
// not on the floor (at or above the horizon). Gives [x, y, z].
function floorPointOf(u, v, view, fovDegrees, aspect, floorY = 0) {
  const { right, up, forward } = lookAxes(view.forward, view.up);
  const tanV = Math.tan((fovDegrees * Math.PI) / 360);
  const x = (u * 2 - 1) * tanV * aspect;
  const y = (1 - v * 2) * tanV;
  const direction = [0, 1, 2].map((i) => forward[i] + right[i] * x + up[i] * y);
  const hit = hitPlane(view.position, direction, floorY);
  return hit ? hit.point : null;
}

// The places to peek from that a picture gives: the blobs, each as the floor point of its foot, with those out of range dropped, those that are
// the same place as a larger one dropped, and no more than the table allows. `view` and `aspect` are as for floorPointOf.
function candidatesFrom(blobs, view, fovDegrees, aspect, table = SCAN) {
  const kept = [];
  for (const blob of blobs) {
    const point = floorPointOf(blob.bottom[0], blob.bottom[1], view, fovDegrees, aspect);
    if (!point) continue;
    const distance = Math.hypot(point[0] - view.position[0], point[2] - view.position[2]);
    if (distance < table.range[0] || distance > table.range[1]) continue;
    if (kept.some((other) => Math.hypot(other.point[0] - point[0], other.point[2] - point[2]) < table.minSeparation)) continue;
    kept.push({ ...blob, point, distance });
    if (kept.length >= table.maxCandidates) break;
  }
  return kept;
}

// Whichever candidates are new: ones that are further than `separation` from every spot already known (so scanning twice does not mark the
// same door twice).
function newSpots(candidates, known, separation = SCAN.minSeparation) {
  return candidates.filter((c) => !known.some((k) => Math.hypot(k[0] - c.point[0], k[2] - c.point[2]) < separation));
}

// A picture as the model wants it: `rgba` is the pixels (`width` by `height`, as a canvas gives them), and the answer is the numbers of the
// model's input, in three planes (red, green, blue), each pixel a part of 1 with the mean taken off and divided by the spread. The picture is
// stretched to the model's square.
function modelInput(rgba, width, height, table = SCAN) {
  const size = table.size;
  const out = new Float32Array(3 * size * size);
  for (let y = 0; y < size; y++) {
    const sy = Math.min(height - 1, Math.floor(((y + 0.5) / size) * height));
    for (let x = 0; x < size; x++) {
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) / size) * width));
      const at = (sy * width + sx) * 4;
      for (let c = 0; c < 3; c++) out[c * size * size + y * size + x] = (rgba[at + c] / 255 - table.mean[c]) / table.std[c];
    }
  }
  return out;
}

// The label of every pixel from the model's answer: `logits` is a score for each of `classes` kinds over a `width` by `height` grid
// (plane after plane), and a pixel is the kind with the best score.
function labelsOf(logits, classes, width, height) {
  const labels = new Uint8Array(width * height);
  const plane = width * height;
  for (let i = 0; i < plane; i++) {
    let best = 0, score = -Infinity;
    for (let c = 0; c < classes; c++) {
      const value = logits[c * plane + i];
      if (value > score) {
        score = value;
        best = c;
      }
    }
    labels[i] = best;
  }
  return labels;
}

// The model and what it is run with. `ort` is onnxruntime-web (a page that loads it has it as a global), and `table` is SCAN. `load` fetches and
// prepares the model (about 4 MB, kept by the browser after the first time); `scan` takes a picture (the pixels of a canvas) and gives the blobs.
class DoorScanner {
  constructor(ort, table = SCAN) {
    this.ort = ort;
    this.table = table;
    this.session = null;
    this.lastMilliseconds = 0;
  }

  async load() {
    this.session = await this.ort.InferenceSession.create(this.table.modelUrl, { executionProviders: ["wasm"] });
    return this;
  }

  // `rgba`, `width` and `height` are a picture. Gives { blobs, labels, width, height } where the labels are a grid of the model's size over four.
  async scan(rgba, width, height) {
    const started = performance.now();
    const size = this.table.size;
    const input = new this.ort.Tensor("float32", modelInput(rgba, width, height, this.table), [1, 3, size, size]);
    const output = await this.session.run({ [this.session.inputNames[0]]: input });
    const result = output[this.session.outputNames[0]];
    const [, classes, h, w] = result.dims;
    const labels = labelsOf(result.data, classes, w, h);
    this.lastMilliseconds = performance.now() - started;
    return { blobs: blobsOf(labels, w, h, this.table), labels, width: w, height: h };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCAN, coverCrop, blobsOf, floorPointOf, candidatesFrom, newSpots, modelInput, labelsOf, DoorScanner };
} else {
  Object.assign(window, { SCAN, coverCrop, blobsOf, floorPointOf, candidatesFrom, newSpots, modelInput, labelsOf, DoorScanner });
}
```

Things to notice:

- **The model is run, not tested.** `DoorScanner` is the only part that touches onnxruntime; everything it gives and everything done with it is tested.
- **It is an enhancement, not a dependency.** If the scanner cannot be downloaded, or finds nothing, the game uses the edge of the screen and the player's own marks.
- **The page `scan.html`** is the whole thing on a photograph: it draws the labels over the picture and the foot of each door, and says how far each is. It is how the numbers in the table were tuned.
- **Licence:** the model's licence on Hugging Face is "other" (NVIDIA's research terms for SegFormer). That is fine for a tutorial; a game that is sold would use a model with a licence that allows it.

### Tests

Open `tests/doorscan.tests.js` (the placeholder) and **replace the TODO line** with:

```js
// Made-up label maps: 0 is wall, 3 is floor, 14 is a door.
const labelMap = (width, height, paint) => {
  const labels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) labels[y * width + x] = paint(x, y);
  return labels;
};
const NO_GROW = { ...SCAN, grow: 0 };

QUnit.module("finding doors in labels", () => {
  // a 40 by 40 picture: a door 6 wide and 16 tall at x 10-15, y 8-23, with the floor from row 24 down
  const picture = labelMap(40, 40, (x, y) => (y >= 24 ? 3 : x >= 10 && x <= 15 && y >= 8 ? 14 : 0));

  QUnit.test("a door is a blob, and its foot is where the floor begins below it", (assert) => {
    const blobs = blobsOf(picture, 40, 40, NO_GROW);
    assert.strictEqual(blobs.length, 1);
    assert.strictEqual(blobs[0].kind, "door");
    assert.true(blobs[0].onFloor);
    assert.true(Math.abs(blobs[0].bottom[0] - 13 / 40) < 0.02, "the middle of it");
    assert.strictEqual(blobs[0].bottom[1], 24 / 40, "where the floor begins");
  });

  QUnit.test("a door whose lower part is not labelled still has its foot on the floor", (assert) => {
    const cut = labelMap(40, 40, (x, y) => (y >= 24 ? 3 : x >= 10 && x <= 15 && y >= 8 && y <= 16 ? 14 : 0)); // only the top half is labelled
    const blobs = blobsOf(cut, 40, 40, NO_GROW);
    assert.strictEqual(blobs[0].bottom[1], 24 / 40);
  });

  QUnit.test("with no floor under it, the foot is the bottom of the blob", (assert) => {
    const nofloor = labelMap(40, 40, (x, y) => (x >= 10 && x <= 15 && y >= 8 && y <= 23 ? 14 : 0));
    const blobs = blobsOf(nofloor, 40, 40, NO_GROW);
    assert.false(blobs[0].onFloor);
    assert.strictEqual(blobs[0].bottom[1], 24 / 40);
  });

  QUnit.test("specks, and things that are too short, are left out", (assert) => {
    const speck = labelMap(40, 40, (x, y) => (x === 5 && y === 5 ? 14 : 0));
    assert.strictEqual(blobsOf(speck, 40, 40, NO_GROW).length, 0);
    const wide = labelMap(40, 40, (x, y) => (x >= 2 && x <= 30 && y >= 10 && y <= 11 ? 14 : 0)); // big enough, but flat
    assert.strictEqual(blobsOf(wide, 40, 40, NO_GROW).length, 0);
  });

  QUnit.test("growing closes the holes in a door, so it is one blob and not two", (assert) => {
    const holed = labelMap(40, 40, (x, y) => (y >= 24 ? 3 : x >= 10 && x <= 15 && y >= 8 && y !== 15 && y !== 16 ? 14 : 0)); // a gap two rows high
    assert.strictEqual(blobsOf(holed, 40, 40, NO_GROW).length, 2, "without growing, a door with a gap is two");
    const grown = blobsOf(holed, 40, 40, SCAN);
    assert.strictEqual(grown.length, 1);
    assert.true(grown[0].box[3] - grown[0].box[1] > 0.4, "and with the growing it is the whole door");
  });

  QUnit.test("two doors are two blobs, the larger first; stairs are found too", (assert) => {
    const two = labelMap(60, 40, (x, y) => (y >= 30 ? 3 : x >= 5 && x <= 12 && y >= 6 ? 14 : x >= 30 && x <= 36 && y >= 14 ? 14 : x >= 45 && x <= 55 && y >= 22 ? 53 : 0));
    const blobs = blobsOf(two, 60, 40, NO_GROW);
    assert.deepEqual(blobs.map((b) => b.kind), ["door", "door", "stairs"]);
    assert.true(blobs[0].area > blobs[1].area);
  });
});

QUnit.module("from a pixel to the floor", () => {
  const view = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };

  QUnit.test("the middle of the picture, looking level, is the horizon: no floor", (assert) => {
    assert.strictEqual(floorPointOf(0.5, 0.5, view, 60, 0.5), null);
  });

  QUnit.test("a pixel below the middle is on the floor ahead, further for a pixel nearer the horizon", (assert) => {
    const near = floorPointOf(0.5, 0.95, view, 60, 0.5);
    const far = floorPointOf(0.5, 0.7, view, 60, 0.5);
    assert.ok(near && far);
    assert.true(Math.abs(near[0]) < 1e-9, "straight ahead");
    assert.true(far[2] > near[2] && near[2] > 0, `${near[2].toFixed(2)} and ${far[2].toFixed(2)} metres`);
    // 1.4 m up, 30 degrees below the horizon at the bottom edge of a 60 degree view: 1.4 / tan 30 = 2.42 m
    assert.true(Math.abs(floorPointOf(0.5, 1, view, 60, 0.5)[2] - 1.4 / Math.tan(Math.PI / 6)) < 1e-6);
  });

  QUnit.test("right of the picture is right of the player", (assert) => {
    const right = floorPointOf(0.9, 0.9, view, 60, 0.5);
    const left = floorPointOf(0.1, 0.9, view, 60, 0.5);
    assert.true(right[0] > 0 && left[0] < 0);
    assert.true(Math.abs(right[0] + left[0]) < 1e-9);
  });

  QUnit.test("the way the player faces is taken into account", (assert) => {
    const turned = { position: [0, 1.4, 0], forward: [1, 0, 0], up: [0, 1, 0] };
    const point = floorPointOf(0.5, 0.95, turned, 60, 0.5);
    assert.true(point[0] > 0 && Math.abs(point[2]) < 1e-9);
  });
});

QUnit.module("choosing the places", () => {
  const view = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const blob = (x, y, area = 0.02) => ({ kind: "door", area, box: [x - 0.05, y - 0.3, x + 0.05, y], bottom: [x, y], onFloor: true });

  QUnit.test("each blob becomes a floor point, in range, and the nearer ones that are too near or too far are dropped", (assert) => {
    const candidates = candidatesFrom([blob(0.5, 0.75), blob(0.3, 0.52), blob(0.7, 0.99)], view, 60, 0.5);
    assert.strictEqual(candidates.length, 1, "one is beyond the range and one is too near");
    assert.true(candidates[0].distance >= SCAN.range[0] && candidates[0].distance <= SCAN.range[1]);
  });

  QUnit.test("two blobs at one place are one place", (assert) => {
    const candidates = candidatesFrom([blob(0.5, 0.75, 0.03), blob(0.505, 0.75, 0.02)], view, 60, 0.5);
    assert.strictEqual(candidates.length, 1);
    assert.strictEqual(candidates[0].area, 0.03, "the larger is kept");
  });

  QUnit.test("no more than the table allows", (assert) => {
    const many = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95].map((x) => blob(x, 0.75));
    assert.true(candidatesFrom(many, view, 60, 0.5, { ...SCAN, maxCandidates: 3 }).length <= 3);
  });

  QUnit.test("a spot that is already known is not new", (assert) => {
    const candidates = candidatesFrom([blob(0.5, 0.75)], view, 60, 0.5);
    assert.strictEqual(newSpots(candidates, []).length, 1);
    assert.strictEqual(newSpots(candidates, [[candidates[0].point[0] + 0.3, 0, candidates[0].point[2]]]).length, 0);
  });
});

QUnit.module("what the model is given and what it says", () => {
  QUnit.test("the input is three planes of the picture, taken to the model's mean and spread, at the model's size", (assert) => {
    const small = { ...SCAN, size: 4 };
    const rgba = new Uint8ClampedArray(2 * 2 * 4);
    for (let i = 0; i < 4; i++) rgba.set([255, 0, 128, 255], i * 4);
    const input = modelInput(rgba, 2, 2, small);
    assert.strictEqual(input.length, 3 * 16);
    assert.true(Math.abs(input[0] - (1 - SCAN.mean[0]) / SCAN.std[0]) < 1e-5, "red plane");
    assert.true(Math.abs(input[16] - (0 - SCAN.mean[1]) / SCAN.std[1]) < 1e-5, "green plane");
    assert.true(Math.abs(input[32] - (128 / 255 - SCAN.mean[2]) / SCAN.std[2]) < 1e-5, "blue plane");
  });

  QUnit.test("every pixel is the kind with the best score", (assert) => {
    const logits = new Float32Array([0, 5, 1, 2, /* kind 0 */ 3, 0, 0, 2, /* kind 1 */ 1, 1, 9, 0 /* kind 2 */]);
    assert.deepEqual([...labelsOf(logits, 3, 2, 2)], [1, 0, 2, 0]);
  });
});

QUnit.module("what of the camera's picture is on the screen", () => {
  QUnit.test("a wide picture on a tall screen is cut at the sides, in the middle", (assert) => {
    const crop = coverCrop(1280, 720, 0.5);
    assert.strictEqual(crop.sh, 720);
    assert.strictEqual(crop.sw, 360);
    assert.strictEqual(crop.sx, 460);
    assert.strictEqual(crop.sy, 0);
  });

  QUnit.test("a tall picture on a wide screen is cut at the top and bottom", (assert) => {
    const crop = coverCrop(720, 1280, 2);
    assert.strictEqual(crop.sw, 720);
    assert.strictEqual(crop.sh, 360);
    assert.strictEqual(crop.sy, 460);
  });

  QUnit.test("a picture of the same shape as the screen is all of it", (assert) => {
    assert.deepEqual(coverCrop(800, 400, 2), { sx: 0, sy: 0, sw: 800, sh: 400 });
  });
});
```

Open `tests.html`. You should see **433 passing tests**: 19 more.

## Step 7: The game

`main.js` joins it all: the peeks come on their own (and with **6** and **7** to ask for one, or a pop), **M** or the **MARK** button marks the floor under the reticle as a place to peek from, **K** or the **SCAN** button scans the camera's picture, **8** is a doll, **J** is a jump scare on demand, and the compass is gone. The stylesheets get the two buttons, stacked, and the notice moves up above them.

In `js/main.js`, **delete** line 8:

```js
const compass = document.getElementById("compass");
```

In `js/main.js`, **replace** lines 67 to 70:

```js
    // A ghost is made in code, or (if there are models of ghosts, and its own number says so) it is a model.
    const ghostModels = [...creatureModels.keys()].filter((name) => STATIC_MODELS[name] && STATIC_MODELS[name].ghost);
    const chosen = ghostModelFor(item.id, ghostModels, GHOST.modelChance);
    bodies.set(item.id, chosen ? new GhostModelBody(scene, item, creatureModels.get(chosen)) : new GhostBody(scene, item, puff));
```

with:

```js
    bodies.set(item.id, new GhostBody(scene, item, puff));
```

In `js/main.js`, **replace** line 104:

```js
    audio.cue("creak", item.position, 1); // the tell: a creak from where it is, before it is anywhere to be seen
```

with:

```js
    if (!(item.peek && item.peek.pop)) audio.cue("creak", item.position, 1); // the tell: a creak from where it is, before it is anywhere to be seen (a pop has none: that is the point)
```

In `js/main.js`, **replace** lines 112 to 113:

```js
    if (type === "touch") director.noteScare(); // it got to the player: the dread drops, and there is a rest
    if (type === "lunge" || type === "touch") scare.trigger(type); // and it is a scare
```

with:

```js
    if (type === "touch" || type === "pop") director.noteScare(); // it got to the player (or popped up at the edge): the dread drops, and there is a rest
    if (type === "lunge" || type === "touch") scare.trigger(type); // and it is a scare
    if (type === "pop") scare.trigger("lunge"); // a pop is a strike with no warning
```

In `js/main.js`, after line 141, add:

```js
// The peeks. A creature leans out from the edge of the view, or from a spot the player has marked, for a second or two and goes back; a pop is
// the same thing in an instant, with a strike (see peeks.js). The spots are marked with the PEEK SPOT button, on the floor under the reticle.
const peeker = new Peeker();
const peekSpots = []; // the marked points, [x, y, z]
const peekMarks = []; // and the little rings that show them (placeholders)

systems.push((seconds, player) => {
  const active = creatures.items.filter((creature) => creature.alive).length;
  const order = peeker.update(seconds, { player, halfFov: currentHalfFov(), spots: peekSpots, active, playing });
  if (order) spawnPeek(order);
});

function spawnPeek(order) {
  const start = order.peek.pop ? order.peek.to : order.peek.from;
  const creature = creatures.spawn(order.kind, [start[0], 0, start[1]], order.peek);
  if (creature) lastOrder = peeker.last;
}

// A peek (or a pop) now, whether one is due or not.
function peekNow(pop) {
  spawnPeek(peeker.order({ player, halfFov: currentHalfFov(), spots: peekSpots }, pop));
}

// A place to peek from, at a point on the floor: it is kept, and shown with a ring (a placeholder).
function addPeekSpot(point) {
  peekSpots.push(point.slice());
  const ring = BABYLON.MeshBuilder.CreateTorus(`peek-spot-${peekSpots.length}`, { diameter: 0.5, thickness: 0.015, tessellation: 32 }, scene);
  ring.position.set(point[0], point[1] + 0.01, point[2]);
  ring.material = cyan;
  placeholders.add(ring, "marker");
  peekMarks.push(ring);
}

// Marks the floor under the reticle as a place to peek from. Says so if there is no floor there.
function markPeekSpot() {
  if (!surface || !isFloor(surface)) {
    notice.textContent = "Look at the foot of a doorway or a corner to mark it.";
    return;
  }
  notice.textContent = "Peek spot marked.";
  addPeekSpot(surface.point);
}

// Scanning for doors: the picture the camera shows is given to a model that finds the doors and the stairs in it (doorscan.js), and the foot of each
// one that is new becomes a place to peek from. The model and the library that runs it (about 4 MB and 1 MB) are fetched the first time, and kept by the
// browser after that. It needs the camera's picture, so it is for the camera view and not real augmented reality, where the page is not given one.
let scanner = null;
let scanning = false;
const scanButton = document.getElementById("tool-scan");

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error("The scanner would not download."));
    document.head.appendChild(script);
  });
}

async function scanForDoors() {
  if (scanning) return;
  if (mode === "xr") {
    notice.textContent = "Scanning needs the camera view. Use the camera view instead of real AR.";
    return;
  }
  if (!feed.live || !feedVideo.videoWidth) {
    notice.textContent = "There is no camera picture to scan. Mark the foot of a doorway with MARK instead.";
    return;
  }
  scanning = true;
  scanButton.textContent = "...";
  try {
    if (!scanner) {
      notice.textContent = "Loading the scanner...";
      if (!window.ort) await loadScript(SCAN.runtimeUrl);
      scanner = await new DoorScanner(window.ort).load();
    }
    notice.textContent = "Scanning...";
    const view = { position: player.position.slice(), forward: player.forward.slice(), up: player.up.slice() }; // where the phone was looking when the picture was taken
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const crop = coverCrop(feedVideo.videoWidth, feedVideo.videoHeight, aspect); // the part of the picture that is on the screen
    const work = document.createElement("canvas");
    work.width = Math.min(crop.sw, 640);
    work.height = Math.round(work.width / aspect);
    const context = work.getContext("2d", { willReadFrequently: true });
    context.drawImage(feedVideo, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, work.width, work.height);
    const result = await scanner.scan(context.getImageData(0, 0, work.width, work.height).data, work.width, work.height);
    const found = candidatesFrom(result.blobs, view, LOOK.fovDegrees, aspect);
    const fresh = newSpots(found, peekSpots);
    for (const candidate of fresh) addPeekSpot(candidate.point);
    lastScan = `${result.blobs.length} blobs, ${found.length} in range, ${fresh.length} new, ${scanner.lastMilliseconds.toFixed(0)} ms`;
    notice.textContent = fresh.length ? `Found ${fresh.length} place${fresh.length === 1 ? "" : "s"} to hide.` : found.length ? "Nothing new here." : "No doors found. Try another part of the room.";
  } catch (error) {
    console.warn("The door scan failed.", error);
    notice.textContent = "The scan did not work. Mark doorways with MARK instead.";
    lastScan = String(error && error.message ? error.message : error);
  } finally {
    scanning = false;
    scanButton.textContent = "SCAN";
  }
}
let lastScan = "none";
scanButton.addEventListener("click", () => scanForDoors());

function clearPeekSpots() {
  peekSpots.length = 0;
  for (const ring of peekMarks.splice(0)) {
    placeholders.remove(ring);
    ring.dispose();
  }
}

```

In `js/main.js`, after line 308, add:

```js
document.getElementById("tool-mark").addEventListener("click", () => markPeekSpot());
```

In `js/main.js`, after line 353, add:

```js
// A jump scare on demand, for testing: a creature that charges (the mummy or the skeleton) is made five metres behind the player, and begins to
// run after a second, so the whole of it happens: the creak from behind, the dread and the quiet, the rush, the blackout and the breath.
function jumpScare(kind) {
  const names = ["mummy", "skeleton"];
  const creature = creatures.spawn(kind || names[Math.floor(Math.random() * names.length)], pointAt(player, 180, 5));
  if (!creature) return;
  creature.state = "stalk";
  creature.staggerFor = 1;
}

```

In `js/main.js`, **delete** line 545:

```js
  compass.textContent = bearingText(bearingOf(player.forward), pitchOf(player.forward));
```

In `js/main.js`, **replace** lines 591 to 594:

```js
  if (event.code === "Digit4") spawnCreature("doll");
  if (event.code === "Digit5") spawnCreature("floater");
  if (event.code === "Digit6") spawnCreature("horde");
  if (event.code === "Digit0") creatures.clear();
```

with:

```js
  if (event.code === "Digit4") spawnCreature("mummy");
  if (event.code === "Digit5") spawnCreature("ghoul_girl");
  if (event.code === "Digit8") spawnCreature("doll");
  if (event.code === "Digit6") peekNow(false);
  if (event.code === "Digit7") peekNow(true);
  if (event.code === "KeyM") markPeekSpot();
  if (event.code === "KeyK") scanForDoors();
  if (event.code === "Digit0") creatures.clear();
  if (event.code === "KeyJ") jumpScare();
```

In `js/main.js`, after line 683, add:

```js
          readout("last door scan", () => lastScan),
          readout("peek spots", () => String(peekSpots.length)),
```

In `js/main.js`, **delete** line 710:

```js
          slider("how many are models", GHOST, "modelChance", 0, 1, 0.1),
```

In `js/main.js`, after line 754, add:

```js
          action("Peek now (6)", () => peekNow(false)),
          action("Pop now (7)", () => peekNow(true)),
          action("Mark a peek spot (M)", () => markPeekSpot()),
          action("Scan for doors (K)", () => scanForDoors()),
          action("Clear the peek spots", () => clearPeekSpots()),
          action("Jump scare now (J)", () => jumpScare()),
          action("Jump scare: the mummy", () => jumpScare("mummy")),
          action("Jump scare: the skeleton", () => jumpScare("skeleton")),
```

In `js/main.js`, **replace** line 799:

```js
          slider("zombie height (m)", STATIC_MODELS.zombie, "height", 1, 3, 0.05),
```

with:

```js
          slider("skeleton height (m)", CREATURE_MODELS.skeleton, "height", 1, 3, 0.05),
```

In `js/main.js`, **replace** lines 815 to 817:

```js
          action("Doll (4)", () => spawnCreature("doll")),
          action("Floater (5)", () => spawnCreature("floater")),
          action("Horde (6)", () => spawnCreature("horde")),
```

with:

```js
          action("Mummy (4)", () => spawnCreature("mummy")),
          action("Ghoul girl (5)", () => spawnCreature("ghoul_girl")),
          action("Doll (8)", () => spawnCreature("doll")),
```


In `css/tools.css`, **replace** lines 6 to 11:

```css
  bottom: 40px;
  z-index: 7;
  display: flex;
  justify-content: center;
  gap: 28px;
  pointer-events: none; /* only the buttons take a touch */
```

with:

```css
  bottom: 56px;
  z-index: 7;
  display: flex;
  justify-content: space-between; /* the light under the left thumb, the beam under the right, and the middle of the screen clear */
  padding: 0 14px;
  box-sizing: border-box;
  pointer-events: none; /* only the buttons take a touch */
}
/* Nothing of the tools is there until the game has begun: the start screen has the screen to itself. */
body:has(#start:not(.hidden)) #tools,
body:has(#start:not(.hidden)) #grip-bar,
body:has(#start:not(.hidden)) #torch {
  visibility: hidden;
```

In `css/tools.css`, after line 23, add:

```css
#tools .tool.stack button + button {
  margin-top: 6px;
}
```


In `css/page.css`, **delete** lines 80 to 93:

```css
/* What the phone is looking at, in words, so that a person can see that it works. */
#compass {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 14px;
  z-index: 5;
  text-align: center;
  font-size: 15px;
  letter-spacing: 0.12em;
  color: var(--ghost);
  text-shadow: 0 0 8px var(--ghost);
  pointer-events: none;
}
```

In `css/page.css`, **replace** line 83:

```css
  bottom: 44px;
```

with:

```css
  bottom: 200px; /* above the buttons of the tools (SCAN and MARK are stacked in the middle) */
```


### Try it

Open `index.html?dev`. You should see:

- **1 to 5** and **8** spawn a spider, a ghoul, a skeleton, a mummy, a ghoul girl and a doll: the mummy and the skeleton stagger and then run; the ghoul girl rises, walks and falls; the doll shakes towards you and loiters
- **6** (a peek): something leans in at the edge of the screen and goes back; **7** (a pop): it is just there, with the strike, and gone
- **M** (or **MARK**) at the foot of a doorway, then **6**: sometimes the peek is from the doorway
- on a phone's camera view, **SCAN** (**K**): the scanner downloads once (5 MB), and the doors it finds are marked with rings
- in the developer panel, **Scares** has the jump scare, and **Creatures** has a button for each creature

### Tests

Open `tests.html`. You should see **433 passing tests**: 0 more (none: the game is not what the tests are about).

## Stretch goals

- **A voice for the doll:** a music box, a child's whisper.
- **Peeks from a marked spot that stays:** an anchor in the phone's AR for each mark, so that it is there next time.
- **A model for the spider.**
- **A scan that runs by itself** as you turn, and not on a button.

## What you've learned

- How a table of creatures and a small state machine take new members (and when a state is better than a number)
- How models with skeletons are played by role, with a fallback for a role they do not have
- How a creature can use the edge of the screen as a corner
- How a segmentation model is used in a page, and how everything around it is tested without running it
- How the feel of a game is made by playing it and changing tables

The next step gives the player something to **find them with**: detectors.
