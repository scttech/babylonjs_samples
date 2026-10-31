# Tutorial: Ghost Hunter The Hunt -- A Rhythm of Dread

This is the fifth tutorial of the Ghost Hunter series. Until now you have summoned everything by hand. A horror game is not a pile of monsters you press a key for: it is a **rhythm**. A quiet that goes on a little too long, a dread that builds, a strike, and a rest to get your breath before it starts again. This sample writes the part of the game that keeps that rhythm: **the director**. It decides *what* turns up, *where* and *when*, and it does so with plain arithmetic and a random number that is given to it, so a test can run a whole night of hunting.

By the end you'll have:

- **Tension**: one number that rises while nothing happens and falls when something does, with a threshold that is a little different each time, so that the strike is never on the beat
- **A rest** after a scare, in which nothing new turns up, and a **limit** on how many creatures there are at once, that rises with the intensity
- **Where**: zones round the player (behind, at the edge of the view, to the side) with weights, a point in the zone at a distance from the table, and a rule that **nothing ever turns up in the view**
- **What**: kinds with weights that change with the tension (spiders when it is quiet, ghouls when it is not) and that are only allowed from a certain intensity
- **A spider that drops from the ceiling**: a creature that starts in the air and falls with gravity
- The hunt in the **game**: it begins when the player presses the button, sends what the director orders, and takes the dread down when a creature gets to the player
- A **map in the developer panel** of what the director is doing, and a panel of its numbers
- Unit tests for all of it: **242 passing tests**

**What you'll learn:** how to pace a game with a single number, how to place things where the player is not looking (the angle between where the player faces and where a point is), why randomness should be given to the code and not taken by it, how to test a whole session by running the director for simulated minutes, and how to draw a small debug map of an invisible system.

**Before you start:** do the [Creatures tutorial](../ghost_hunter_creatures/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Creatures sample, plus placeholders for the new files and their tests:

```
ghost_hunter_hunt/
├── index.html, tests.html   (already list the new scripts)
├── css/                     (as in the Creatures sample; devpanel.css changes in Step 3)
├── js/
│   ├── director.js          (placeholder -- Step 2)
│   ├── creatures.js         (changes -- Step 1)
│   ├── main.js              (changes -- Step 3)
│   └── everything else, from the Creatures sample
└── tests/
    ├── director.tests.js    (placeholder)
    └── everything else, from the Creatures sample
```

Open `tests.html` before you change anything. You should see **211 passing tests**: the ones of the Creatures sample.

### Serving the page

As before: `npx serve` in the repo root, and open the sample through `http://localhost`, with **`?dev`** for the developer panel. The hunt begins when you press the button; **H** switches it off and on.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **A creature that falls**: a small change to the creatures.
2. **The director**: where, what, and when.
3. **The game**: orders, scares, and a map.
4. **Try it**.

## Step 1: A creature that falls

The director will sometimes send a spider **down from the ceiling**. A creature needs one more state for that: `fall`. A creature whose position is above the floor starts in it, falls with gravity (a speed that goes up by `CREATURE_GRAVITY` every second, and a height that goes down by the speed), and when it reaches the floor it **lands**: it says so, and lurks for a moment before it comes.

The table of gravity is a number, like everything else, and a fall that takes the time that physics says (the square root of `2 × height / gravity`) is tested.

In `js/creatures.js`, after line 22, add:

```js
const CREATURE_GRAVITY = 9.8; // metres a second, every second: how a spider that starts in the air comes down
```

In `js/creatures.js`, after line 189, add:

```js
    this.fall = 0; // metres a second, downwards, of a creature that starts in the air
    if (this.position[1] > 0.01) this.state = "fall";
```

In `js/creatures.js`, **replace** line 240:

```js
    if (this.state === "lurk") {
```

with:

```js
    if (this.state === "fall") {
      this.fall += CREATURE_GRAVITY * seconds;
      this.position[1] -= this.fall * seconds;
      if (this.position[1] <= 0) {
        this.position[1] = 0;
        this.fall = 0;
        this.state = "lurk";
        this.timer = Math.min(this.timer, 0.4); // it hardly waits: it has landed
        this.events.push("landed");
      }
    } else if (this.state === "lurk") {
```

In `js/creatures.js`, **replace** line 292:

```js
    const crouch = this.state === "lunge" ? 0 : this.state === "stalk" && this.lastDistance < 3 ? 0.5 : 0;
```

with:

```js
    const crouch = this.state === "fall" ? -0.5 : this.state === "lunge" ? 0 : this.state === "stalk" && this.lastDistance < 3 ? 0.5 : 0;
```

In `js/creatures.js`, **replace** lines 367 to 369:

```js
  module.exports = { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie });
```

with:

```js
  module.exports = { CREATURES, CREATURE_MAX, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie });
```

Things to notice:

- **A creature does not walk while it falls**: the new branch is the first of the `if` chain, so nothing else happens to a creature in the air.
- **`landed` is an event**, like `lunge` and `touch`: whoever listens (the game, later a sound) is told once.
- **The pose has the legs spread** while it falls (a negative crouch), which a test only says is *finite*: how it looks is a matter for the eye.
- **It can be hit while it falls.** It is alive, and a later tool that goes through the creatures need not know it is in the air.

## Step 2: The director

The director is `Director`, and a few functions that it uses and that can be tested alone. All the numbers are in a table, `HUNT`.

### The geometry

Where is a point, as the player sees it? The one number that answers is **the bearing**: the angle between the way the player faces and the way to the point, from -180 to 180 degrees, going round to the right. A point is **in view** if its bearing is less than half the field of view (and a margin: a thing at the edge of the screen is a thing you have just *not* looked at). The half field of view is *sideways*, and a phone held upright sees much less sideways than up and down, so it comes from the field of view and the shape of the screen.

`pointAt` is the other way round: a point on the floor at a bearing and a distance. And `mapPoint` puts a point on a small map, for the developer panel, with the player in the middle and facing up.

Open `js/director.js` (the placeholder) and **replace the TODO line** with:

```js
// The director: the part of the game that decides what turns up, where and when. A horror game is not a pile of monsters; it is a
// rhythm: a quiet that goes on a little too long, a dread that builds, a strike, and a rest to get your breath before it starts again. The
// director keeps a number for that, the **tension**, which rises while nothing happens and falls when something does, and when it is high
// enough it sends for a creature. It also decides where: out of sight first (behind you, at the edge of the view, to the side), and
// never in the middle of the screen, where a thing that pops in is only a thing that popped in. Everything is plain arithmetic of
// the player's position and the time, with the randomness given in, so a test can run a whole hunt. (It uses toRadians and toDegrees
// from look.js.) See ../tests/director.tests.js.

const HUNT = {
  enabled: true,
  intensity: 1, // how hard it is: multiplies how fast the dread builds (the rounds of a later step change it)
  riseRate: 0.055, // tension a second while it is quiet, at an intensity of 1
  spawnAt: [0.65, 0.95], // the tension at which it strikes: a number between these, chosen each time, so it is never on the beat
  afterSpawn: 0.35, // the tension left after something turns up
  afterScare: 0.1, // and after the player has been got at
  cooldown: 6, // seconds after a scare in which nothing new turns up: the rest
  maxActive: 3, // creatures alive at once, at an intensity of 1 (it rises with the intensity)
  distance: [4.5, 8], // metres from the player at which something turns up
  edgeMargin: [8, 40], // degrees beyond the edge of the view that the edge zone starts and ends
  zones: [
    { name: "behind", from: 120, to: 240, weight: 3 }, // degrees from straight ahead, going round to the right
    { name: "edge", weight: 2 }, // just outside the view, on either side
    { name: "flank", from: 80, to: 115, weight: 1 }, // and its mirror
  ],
  kinds: [
    { kind: "spider", weight: [4, 2], from: 0 }, // weight at no tension and at full tension; from: the intensity it begins at
    { kind: "skeleton", weight: [1, 3], from: 0.8 },
    { kind: "ghoul", weight: [0, 3], from: 1 },
  ],
  dropHeight: 2.3, // a spider that comes down from the ceiling starts this high
  dropChance: 0.4, // how often a spider does
  viewMargin: 6, // degrees: a point this close to the view's edge counts as in it
};

// The half-angle of what the camera sees from side to side, from the field of view top to bottom and the shape of the screen. (A phone
// held upright sees much less sideways than a laptop.)
function horizontalHalfFov(verticalDegrees, aspect) {
  return toDegrees(Math.atan(Math.tan(toRadians(verticalDegrees) / 2) * aspect));
}

// Which way a point is from the player, in degrees from straight ahead (the way the player faces on the floor) going round to the
// right: -180 to 180.
function bearingTo(player, point) {
  const facing = Math.atan2(player.forward[0], player.forward[2]);
  const toward = Math.atan2(point[0] - player.position[0], point[2] - player.position[2]);
  let difference = toDegrees(toward - facing);
  difference = ((difference + 180) % 360 + 360) % 360 - 180;
  return difference;
}

// Is a point in the view, or close to it?
function inView(player, point, halfFov, margin = HUNT.viewMargin) {
  return Math.abs(bearingTo(player, point)) <= halfFov + margin;
}

// A point on the floor, `distance` metres from the player, `bearing` degrees from straight ahead.
function pointAt(player, bearing, distance) {
  const facing = Math.atan2(player.forward[0], player.forward[2]);
  const angle = facing + toRadians(bearing);
  return [player.position[0] + Math.sin(angle) * distance, 0, player.position[2] + Math.cos(angle) * distance];
}

// Where a point is on a small map with the player in the middle and the way it faces at the top, `scale` pixels to the metre, on a
// square of `size` pixels. Nothing in the game uses it: it is for the developer panel, to see what the director is doing.
function mapPoint(player, point, scale, size) {
  const bearing = toRadians(bearingTo(player, point));
  const distance = Math.hypot(point[0] - player.position[0], point[2] - player.position[2]);
  return [size / 2 + Math.sin(bearing) * distance * scale, size / 2 - Math.cos(bearing) * distance * scale];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HUNT, horizontalHalfFov, bearingTo, inView, pointAt, mapPoint };
} else {
  Object.assign(window, { HUNT, horizontalHalfFov, bearingTo, inView, pointAt, mapPoint });
}
```

Things to notice:

- **The table is the director's character.** How fast the dread builds, how high it must be to strike (a range, not a number), what is left after a strike and after a scare, how long the rest is, how many at once, how far away, which zones, which kinds. Change a number and the game changes; nothing about the rhythm is in the code.
- **`spawnAt` is a range.** A strike at exactly the same dread each time is a metronome, and a player learns a metronome in three goes. The director picks a number between the two, anew, after every strike.
- **`afterSpawn` is lower than `spawnAt`'s lowest**, and a test says so: the dread has to build again before the next one.
- **The edge zone has no angles of its own.** It is a margin beyond the edge of the view (it changes with the field of view and the screen), on a side that is picked when it is used.
- **`bearingTo` is the angle of one direction minus the angle of another**, wrapped into -180 to 180 by `((x + 180) % 360 + 360) % 360 - 180`: the double `%` is what makes it work for a negative number too.

### Choosing

In `js/director.js`, find the export block (lines 71 to 78) and **delete it**. Add this in its place, and the export block under it:

```js
// A pick from a list of { weight }, with `random` giving a number from 0 up to 1.
function pickWeighted(items, weightOf, random) {
  const total = items.reduce((sum, item) => sum + weightOf(item), 0);
  if (total <= 0) return null;
  let at = random() * total;
  for (const item of items) {
    at -= weightOf(item);
    if (at < 0) return item;
  }
  return items[items.length - 1];
}

// The bearing range of a zone: the edge zone depends on the view, and is on a side, which is picked here.
function zoneRange(zone, halfFov, table, random) {
  if (zone.name === "edge") {
    const side = random() < 0.5 ? -1 : 1;
    const [a, b] = table.edgeMargin;
    return [side * (halfFov + a), side * (halfFov + b)].sort((x, y) => x - y);
  }
  if (zone.name === "flank") {
    const side = random() < 0.5 ? -1 : 1;
    return [side * zone.from, side * zone.to].sort((x, y) => x - y);
  }
  return [zone.from, zone.to];
}

// Where something should turn up: a zone, a bearing in it and a distance, and the point. Nothing if the point would be in the view
// (which can happen when the view is very wide, and an edge is behind you).
function chooseSpawn(player, halfFov, table, random) {
  const zone = pickWeighted(table.zones, (z) => z.weight, random);
  const [from, to] = zoneRange(zone, halfFov, table, random);
  const bearing = from + random() * (to - from);
  const distance = table.distance[0] + random() * (table.distance[1] - table.distance[0]);
  const point = pointAt(player, bearing, distance);
  if (inView(player, point, halfFov, table.viewMargin)) return null;
  return { zone: zone.name, bearing, distance, point };
}

// Which kind: the weights go from the first to the second number as the tension goes from 0 to 1, and a kind that is not yet allowed at
// this intensity has none.
function chooseKind(tension, intensity, table, random) {
  return pickWeighted(table.kinds, (k) => (intensity >= k.from ? k.weight[0] + (k.weight[1] - k.weight[0]) * tension : 0), random);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HUNT, horizontalHalfFov, bearingTo, inView, pointAt, mapPoint, pickWeighted, zoneRange, chooseSpawn, chooseKind };
} else {
  Object.assign(window, { HUNT, horizontalHalfFov, bearingTo, inView, pointAt, mapPoint, pickWeighted, zoneRange, chooseSpawn, chooseKind });
}
```

Things to notice:

- **`pickWeighted` is the one random pick** of the whole file: a list, a weight for each, and a `random` function to say where on the line of weights to stop. Weights that add up to nothing pick nothing, and do not divide by zero.
- **The random function is an argument everywhere.** Not `Math.random()` inside: the function that is given. A test gives one that always gives the same numbers, and the same hunt happens twice.
- **`chooseSpawn` can say no.** If the point it picked is in the view (a very wide view, and a zone that is not behind), it gives `null`, and the director tries again next frame. It never moves the point into the dark to make the rule true: it does not break the rule.
- **`chooseKind` interpolates the weights**: each kind has a weight at no tension and a weight at full tension, and the pick uses the tension *now*. A kind that is not allowed at this intensity has none.

### The director

In `js/director.js`, find the export block (lines 115 to 122) and **delete it**. Add this in its place, and the export block under it:

```js
class Director {
  constructor(table = HUNT, random = Math.random) {
    this.table = table;
    this.random = random;
    this.tension = 0;
    this.resting = 0; // seconds of rest left
    this.target = this._nextTarget();
    this.spawned = 0;
    this.scares = 0;
  }

  _nextTarget() {
    const [low, high] = this.table.spawnAt;
    return low + this.random() * (high - low);
  }

  // How many creatures at once the intensity allows.
  get limit() {
    return Math.max(1, Math.round(this.table.maxActive * Math.sqrt(this.table.intensity)));
  }

  // The player has been got at: the strike was a success. The dread drops, and there is a rest.
  noteScare() {
    this.scares += 1;
    this.tension = Math.min(this.tension, this.table.afterScare);
    this.resting = this.table.cooldown;
  }

  // Time going by. `world` is { player, halfFov, active }: where the player is and what it sees, and how many creatures are alive. Gives
  // the orders for this frame (none, most of the time): { kind, point, zone, height }.
  update(seconds, world) {
    const table = this.table;
    const orders = [];
    if (!table.enabled) return orders;
    if (this.resting > 0) {
      this.resting = Math.max(0, this.resting - seconds);
      return orders;
    }
    if (world.active >= this.limit) {
      this.tension = Math.min(this.tension, this.target); // it waits, and does not store it up
      return orders;
    }
    this.tension = Math.min(1, this.tension + table.riseRate * table.intensity * seconds);
    if (this.tension < this.target) return orders;

    const spot = chooseSpawn(world.player, world.halfFov, table, this.random);
    if (!spot) return orders; // not now: it tries again next frame
    const pick = chooseKind(this.tension, table.intensity, table, this.random);
    if (!pick) return orders;
    const height = pick.kind === "spider" && this.random() < table.dropChance ? table.dropHeight : 0;
    orders.push({ kind: pick.kind, point: [spot.point[0], height, spot.point[2]], zone: spot.zone });
    this.tension = table.afterSpawn;
    this.target = this._nextTarget();
    this.spawned += 1;
    return orders;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HUNT, horizontalHalfFov, bearingTo, inView, pointAt, mapPoint, pickWeighted, zoneRange, chooseSpawn, chooseKind, Director };
} else {
  Object.assign(window, { HUNT, horizontalHalfFov, bearingTo, inView, pointAt, mapPoint, pickWeighted, zoneRange, chooseSpawn, chooseKind, Director });
}
```

Things to notice:

- **`update` gives orders, and does nothing.** It does not spawn a creature: it says `{ kind, point, zone }`, and the game does it. So the director can be tested with no creatures at all, and a different game could use it.
- **There are four things it can do in a frame**, in this order: nothing, because it is switched off; nothing, because it is *resting* after a scare; nothing, because there are as many creatures as the limit allows (and the dread does not store up while it waits); or build the dread, and strike if it has reached the target.
- **A strike that cannot be placed is not lost.** The tension stays where it is, and next frame it tries again with other numbers.
- **`noteScare`** takes the dread down to the table's number (never *up*: a dread already lower stays) and starts the rest.
- **A spider sometimes drops**: its order has a height in it (the table's `dropHeight`), which is what the creature of Step 1 starts a fall from.

### Tests

Open `tests/director.tests.js` and **replace the TODO line** with:

```js
// A random number generator that gives the same numbers every time, so a hunt can be run twice and be the same (mulberry32, which is
// small and mixes its seed well: a poor one gives nearly the same first number for seeds that are next to each other).
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const facing = (x, z) => ({ position: [0, 1.4, 0], forward: [x, 0, z] });

QUnit.module("bearings and views", () => {
  QUnit.test("straight ahead is 0, to the right is positive, to the left negative, behind is 180", (assert) => {
    const player = facing(0, 1);
    assert.strictEqual(Math.round(bearingTo(player, [0, 0, 5])), 0);
    assert.strictEqual(Math.round(bearingTo(player, [5, 0, 0])), 90);
    assert.strictEqual(Math.round(bearingTo(player, [-5, 0, 0])), -90);
    assert.strictEqual(Math.round(Math.abs(bearingTo(player, [0, 0, -5]))), 180);
  });

  QUnit.test("it is the same whichever way the player faces", (assert) => {
    const player = facing(1, 0); // facing right
    assert.strictEqual(Math.round(bearingTo(player, [5, 0, 0])), 0);
    assert.strictEqual(Math.round(bearingTo(player, [0, 0, -5])), 90);
  });

  QUnit.test("the bearing is always between -180 and 180", (assert) => {
    const player = facing(0.3, 0.7);
    for (let a = 0; a < 360; a += 7) {
      const b = bearingTo(player, [Math.sin(toRadians(a)) * 4, 0, Math.cos(toRadians(a)) * 4]);
      assert.true(b >= -180 && b <= 180);
    }
  });

  QUnit.test("pointAt and bearingTo agree", (assert) => {
    const player = facing(0.6, 0.8);
    for (const bearing of [-170, -90, -20, 0, 35, 90, 170]) {
      const point = pointAt(player, bearing, 5);
      assert.true(Math.abs(bearingTo(player, point) - bearing) < 1e-6, `${bearing}`);
      assert.true(Math.abs(Math.hypot(point[0], point[2]) - 5) < 1e-9);
      assert.strictEqual(point[1], 0);
    }
  });

  QUnit.test("a phone held upright sees less sideways than a laptop", (assert) => {
    const phone = horizontalHalfFov(60, 9 / 19);
    const laptop = horizontalHalfFov(60, 16 / 9);
    assert.true(phone < 20 && laptop > 40);
    assert.true(Math.abs(horizontalHalfFov(60, 1) - 30) < 1e-9, "a square screen sees as much sideways as up");
  });

  QUnit.test("the view and a margin round it", (assert) => {
    const player = facing(0, 1);
    assert.true(inView(player, pointAt(player, 20, 5), 30));
    assert.false(inView(player, pointAt(player, 50, 5), 30));
    assert.true(inView(player, pointAt(player, 33, 5), 30, 6), "just outside the edge counts as in");
  });

  QUnit.test("a point on the map: the player in the middle, ahead at the top", (assert) => {
    const player = facing(0, 1);
    assert.deepEqual(mapPoint(player, [0, 0, 0], 10, 160).map(Math.round), [80, 80]);
    assert.deepEqual(mapPoint(player, [0, 0, 4], 10, 160).map(Math.round), [80, 40]);
    assert.deepEqual(mapPoint(player, [3, 0, 0], 10, 160).map(Math.round), [110, 80]);
  });
});

QUnit.module("choosing where and what", () => {
  const player = facing(0, 1);
  const half = 30;

  QUnit.test("something turns up out of the view, every time, at the table's distance", (assert) => {
    const random = seeded(7);
    let tried = 0, chosen = 0;
    for (let i = 0; i < 500; i++) {
      tried += 1;
      const spot = chooseSpawn(player, half, HUNT, random);
      if (!spot) continue;
      chosen += 1;
      assert.false(inView(player, spot.point, half, 0), `${spot.zone} at ${spot.bearing.toFixed(0)}`);
      assert.true(spot.distance >= HUNT.distance[0] && spot.distance <= HUNT.distance[1]);
    }
    assert.true(chosen > tried * 0.9, "it rarely has to give up");
  });

  QUnit.test("it uses every zone, behind most of all", (assert) => {
    const random = seeded(11);
    const counts = {};
    for (let i = 0; i < 800; i++) {
      const spot = chooseSpawn(player, half, HUNT, random);
      if (spot) counts[spot.zone] = (counts[spot.zone] || 0) + 1;
    }
    assert.true(counts.behind > counts.edge && counts.edge > counts.flank, JSON.stringify(counts));
    assert.true(counts.flank > 0);
  });

  QUnit.test("the edge is on both sides, and just outside the view", (assert) => {
    const random = seeded(3);
    const sides = new Set();
    for (let i = 0; i < 400; i++) {
      const [from, to] = zoneRange({ name: "edge" }, half, HUNT, random);
      assert.true(Math.min(Math.abs(from), Math.abs(to)) >= half + HUNT.edgeMargin[0] - 1e-9);
      assert.true(Math.max(Math.abs(from), Math.abs(to)) <= half + HUNT.edgeMargin[1] + 1e-9);
      sides.add(Math.sign(from));
    }
    assert.strictEqual(sides.size, 2);
  });

  QUnit.test("a view so wide that there is nowhere out of it to stand is refused, and not forced", (assert) => {
    const wide = { ...HUNT, zones: [{ name: "flank", from: 80, to: 115, weight: 1 }] };
    assert.strictEqual(chooseSpawn(player, 100, wide, seeded(1)), null);
  });

  QUnit.test("the weights are the table's: a spider is most likely when it is quiet, and a ghoul only when it is not", (assert) => {
    const random = seeded(5);
    const count = (tension, intensity) => {
      const counts = {};
      for (let i = 0; i < 600; i++) {
        const pick = chooseKind(tension, intensity, HUNT, random);
        counts[pick.kind] = (counts[pick.kind] || 0) + 1;
      }
      return counts;
    };
    assert.strictEqual(count(0, 1).ghoul, undefined, "none at no tension");
    assert.true(count(1, 1).ghoul > 100);
    assert.true(count(0, 1).spider > count(1, 1).spider);
  });

  QUnit.test("a kind that is not allowed yet at this intensity is never picked", (assert) => {
    const random = seeded(9);
    for (let i = 0; i < 300; i++) assert.strictEqual(chooseKind(1, 0.5, HUNT, random).kind, "spider");
  });

  QUnit.test("weights that add up to nothing pick nothing", (assert) => {
    assert.strictEqual(pickWeighted([{ w: 0 }], (x) => x.w, () => 0.5), null);
  });
});

QUnit.module("Director", () => {
  const world = (active = 0, player = facing(0, 1)) => ({ player, halfFov: 30, active });
  const run = (director, seconds, active = () => 0, step = 0.1) => {
    const orders = [];
    for (let t = 0; t < seconds; t += step) orders.push(...director.update(step, world(active())));
    return orders;
  };

  QUnit.test("nothing happens at first: the dread builds", (assert) => {
    const director = new Director({ ...HUNT }, seeded(1));
    assert.strictEqual(director.update(0.1, world()).length, 0);
    run(director, 3);
    assert.true(director.tension > 0.1 && director.tension < director.target);
  });

  QUnit.test("when it is high enough, something turns up, and the tension drops to the table's number", (assert) => {
    const director = new Director({ ...HUNT }, seeded(2));
    const orders = run(director, 30);
    assert.true(orders.length >= 1);
    assert.true(["spider", "skeleton", "ghoul"].includes(orders[0].kind));
    assert.true(director.tension <= 1);
    assert.strictEqual(director.spawned, orders.length);
  });

  QUnit.test("the rhythm: it takes about as long as the table says, and not exactly", (assert) => {
    const times = [];
    for (let seed = 1; seed <= 12; seed++) {
      const director = new Director({ ...HUNT }, seeded(seed));
      let t = 0;
      while (director.update(0.1, world()).length === 0 && t < 60) t += 0.1;
      times.push(t);
    }
    const slowest = HUNT.spawnAt[1] / HUNT.riseRate, quickest = HUNT.spawnAt[0] / HUNT.riseRate;
    assert.true(times.every((t) => t >= quickest - 0.2 && t <= slowest + 0.2), times.map((t) => t.toFixed(1)).join(", "));
    assert.true(new Set(times.map((t) => t.toFixed(1))).size > 3, "it is not on the beat");
  });

  QUnit.test("a higher intensity makes it come quicker", (assert) => {
    const timeFor = (intensity) => {
      const director = new Director({ ...HUNT, intensity }, seeded(4));
      let t = 0;
      while (director.update(0.1, world()).length === 0 && t < 100) t += 0.1;
      return t;
    };
    assert.true(timeFor(2) < timeFor(1) * 0.6);
  });

  QUnit.test("it does not send more than the player can bear: no more at once than the limit", (assert) => {
    const director = new Director({ ...HUNT }, seeded(3));
    let active = 0;
    for (let t = 0; t < 400; t += 0.1) {
      const orders = director.update(0.1, world(active));
      active += orders.length;
      assert.true(active <= director.limit);
    }
    assert.strictEqual(active, director.limit);
  });

  QUnit.test("the limit goes up with the intensity", (assert) => {
    assert.true(new Director({ ...HUNT, intensity: 4 }).limit > new Director({ ...HUNT, intensity: 1 }).limit);
    assert.true(new Director({ ...HUNT, intensity: 0.01 }).limit >= 1);
  });

  QUnit.test("a scare drops the dread and starts a rest, in which nothing turns up", (assert) => {
    const director = new Director({ ...HUNT }, seeded(5));
    director.tension = 0.9;
    director.noteScare();
    assert.strictEqual(director.tension, HUNT.afterScare);
    assert.strictEqual(director.resting, HUNT.cooldown);
    assert.strictEqual(run(director, HUNT.cooldown - 0.5).length, 0);
    assert.strictEqual(director.tension, HUNT.afterScare, "the tension does not rise in the rest");
    run(director, 1);
    assert.true(director.tension > HUNT.afterScare, "and then it does");
  });

  QUnit.test("a scare does not raise a tension that was lower", (assert) => {
    const director = new Director({ ...HUNT }, seeded(5));
    director.tension = 0.02;
    director.noteScare();
    assert.strictEqual(director.tension, 0.02);
  });

  QUnit.test("when it is switched off, nothing happens", (assert) => {
    const director = new Director({ ...HUNT, enabled: false }, seeded(6));
    assert.strictEqual(run(director, 200).length, 0);
    assert.strictEqual(director.tension, 0);
  });

  QUnit.test("it never turns up in the view, over a whole night of hunting", (assert) => {
    const director = new Director({ ...HUNT, intensity: 3 }, seeded(8));
    const player = facing(0.2, 1);
    for (let t = 0; t < 1200; t += 0.1) {
      for (const order of director.update(0.1, { player, halfFov: 30, active: 0 })) assert.false(inView(player, order.point, 30, 0), order.zone);
    }
    assert.true(director.spawned > 20);
  });

  QUnit.test("a spider sometimes starts in the air, and nothing else does", (assert) => {
    const director = new Director({ ...HUNT, intensity: 3, dropChance: 0.5 }, seeded(10));
    const orders = [];
    for (let t = 0; t < 1200; t += 0.1) orders.push(...director.update(0.1, world()));
    const drops = orders.filter((order) => order.point[1] > 0);
    assert.true(drops.length > 3);
    assert.true(drops.every((order) => order.kind === "spider" && order.point[1] === HUNT.dropHeight));
    assert.true(orders.some((order) => order.kind === "spider" && order.point[1] === 0));
  });

  QUnit.test("the same random gives the same hunt", (assert) => {
    const a = new Director({ ...HUNT }, seeded(21)), b = new Director({ ...HUNT }, seeded(21));
    assert.deepEqual(run(a, 120), run(b, 120));
  });

  QUnit.test("the table is sensible", (assert) => {
    assert.true(HUNT.spawnAt[0] < HUNT.spawnAt[1] && HUNT.spawnAt[1] <= 1);
    assert.true(HUNT.afterSpawn < HUNT.spawnAt[0], "the dread has to build again before the next one");
    assert.true(HUNT.afterScare <= HUNT.afterSpawn);
    assert.true(HUNT.distance[0] > 3, "not so near that it is on top of you when it appears");
    assert.true(HUNT.zones.every((zone) => zone.weight > 0));
  });
});

QUnit.module("a creature that starts in the air", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("falls, as fast as gravity says, and lands, and says so", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 2.3, 6], random: () => 0 });
    assert.strictEqual(creature.state, "fall");
    let time = 0;
    const told = [];
    while (creature.state === "fall" && time < 3) {
      creature.update(0.01, player);
      told.push(...creature.events);
      creature.events = [];
      time += 0.01;
    }
    const expected = Math.sqrt((2 * 2.3) / CREATURE_GRAVITY);
    assert.true(Math.abs(time - expected) < 0.03, `${time.toFixed(2)} s, not ${expected.toFixed(2)} s`);
    assert.strictEqual(creature.position[1], 0);
    assert.strictEqual(creature.state, "lurk");
    assert.deepEqual(told, ["landed"]);
  });

  QUnit.test("it does not walk while it falls, and it goes fast, and then faster", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 2.3, 6], random: () => 0 });
    creature.update(0.1, player);
    const first = 2.3 - creature.position[1];
    creature.update(0.1, player);
    const second = 2.3 - first - creature.position[1];
    assert.true(second > first);
    assert.strictEqual(creature.position[2], 6);
  });

  QUnit.test("a creature that starts on the floor does not fall", (assert) => {
    assert.strictEqual(new Creature({ id: 1, kind: "spider", position: [0, 0, 6] }).state, "lurk");
  });

  QUnit.test("it is a creature that can be hit while it falls, and its pose is finite", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 2.3, 6], random: () => 0 });
    assert.true(creature.hit(1));
    assert.true(creature.pose().bones.every((bone) => bone.a.every(Number.isFinite)));
  });
});
```

Things to notice:

- **The random function is a seeded generator**: a few lines (mulberry32) that give the same numbers every time. A poor one gives nearly the same first number for seeds that are next to each other, which made a test of "the strike is not on the beat" fail until it was replaced: tests of randomness need a good source of it.
- **The tests run sessions.** A "night of hunting" runs the director for twenty simulated minutes and says that nothing it ever sent was in the view, and that it sent more than twenty. "It never sends more than the player can bear" runs for minutes and says the number alive never goes over the limit.
- **The rhythm is tested as a range**: the quickest and slowest times to the first strike are what the table's numbers say, and they are not all the same.
- **The creature that falls has its own tests** at the end: it lands after the time that physics gives, to within a hundredth of a second.

Open `tests.html`. You should see **242 passing tests**: 31 more.

## Step 3: The game

In `js/main.js`, a section for the hunt, and small changes where a creature gets to the player, where the player presses the button, and in the developer panel.

### The hunt

First a flag, `playing`: **nothing is sent before the player has pressed the button.** (The scene runs behind the start screen, and the first thing a player must not see is a monster there.)

In `js/main.js`, after line 16, add:

```js
let playing = false; // has the player pressed the button? (nothing is sent after them before then)
```

When a creature touches the player, the director is told: that is a scare.

In `js/main.js`, after line 103, add:

```js
    if (type === "touch") director.noteScare(); // it got to the player: the dread drops, and there is a rest
```

The section itself: the director, a system that gives it the player and what the camera sees and how many creatures are alive and does what it orders, and `strikeNow`, to send one from a zone when the developer asks.

In `js/main.js`, after line 114, add:

```js
// The hunt. The director decides what turns up, where and when (see director.js), and the game does what it orders. It sends nothing
// until the player has pressed the button, and nothing in the first moments: the dread has to build.
const director = new Director(HUNT);
let lastOrder = "none";

// How far each way the camera sees, from the middle of the screen, in degrees: the director keeps out of it.
const currentHalfFov = () => horizontalHalfFov(LOOK.fovDegrees, engine.getAspectRatio(scene.activeCamera));

systems.push((seconds, player) => {
  if (!playing) return;
  const active = creatures.items.filter((creature) => creature.alive).length;
  for (const order of director.update(seconds, { player, halfFov: currentHalfFov(), active })) {
    if (creatures.spawn(order.kind, order.point)) lastOrder = `${order.kind} from ${order.zone}${order.point[1] > 0 ? ", dropping" : ""}`;
  }
});

// Sends one now, from a zone (or from any of them), as the director would.
function strikeNow(zone) {
  const table = { ...HUNT, zones: zone ? HUNT.zones.filter((candidate) => candidate.name === zone) : HUNT.zones };
  const spot = chooseSpawn(player, currentHalfFov(), table, Math.random);
  const pick = chooseKind(Math.max(director.tension, 0.5), HUNT.intensity, HUNT, Math.random);
  if (spot && pick && creatures.spawn(pick.kind, spot.point)) lastOrder = `${pick.kind} from ${spot.zone}`;
}

```

Things to notice:

- **`currentHalfFov` is asked every frame**, because the player can turn the phone on its side, and the width of what it sees changes.
- **A hunt that has ended** (the player leaves augmented reality and the start screen is back) stops sending, with `playing`.

When the player leaves augmented reality (and the start screen is back), the hunt stops:

In `js/main.js`, after line 292, add:

```js
  playing = false;
```

**H** switches the whole hunt off and on:

In `js/main.js`, after line 366, add:

```js
  if (event.code === "KeyH") HUNT.enabled = !HUNT.enabled;
```

And pressing the button starts it:

In `js/main.js`, after line 421, add:

```js
  playing = true;
```

### Developer mode

A group of rows for the director: the dread, how long the rest has to run, what it has sent and what has got to you, the last thing it sent, and sliders and buttons to change the rhythm and to send one from a zone. And a **map**: a small canvas in the corner that draws the player in the middle, facing up, the edges of the view, every creature (orange spiders, green ghouls, white skeletons; a big dot is a lunge), every ghost (blue), and a bar for the dread with a red mark where it will strike.

In `js/main.js`, after line 477, add:

```js
        title: "The hunt",
        rows: [
          toggle("the hunt (H)", () => HUNT.enabled, (value) => { HUNT.enabled = value; }),
          slider("intensity", HUNT, "intensity", 0.5, 4, 0.1),
          readout("dread", () => `${director.tension.toFixed(2)} (strikes at ${director.target.toFixed(2)})`),
          readout("resting", () => (director.resting > 0 ? `${director.resting.toFixed(1)} s` : "no")),
          readout("sent / got to you", () => `${director.spawned} / ${director.scares}`),
          readout("at most at once", () => director.limit),
          readout("last sent", () => lastOrder),
          slider("how fast the dread builds", HUNT, "riseRate", 0.01, 0.4, 0.005),
          slider("rest after a scare (s)", HUNT, "cooldown", 0, 30, 1),
          slider("most at once", HUNT, "maxActive", 1, 8, 1),
          control("closest it appears (m)", () => HUNT.distance[0], (value) => { HUNT.distance[0] = Math.min(value, HUNT.distance[1] - 0.5); }, 3, 10, 0.5),
          control("furthest it appears (m)", () => HUNT.distance[1], (value) => { HUNT.distance[1] = Math.max(value, HUNT.distance[0] + 0.5); }, 4, 14, 0.5),
          slider("how often a spider drops", HUNT, "dropChance", 0, 1, 0.05),
          action("Send one now", () => strikeNow()),
          action("Send one from behind", () => strikeNow("behind")),
          action("Send one from the edge", () => strikeNow("edge")),
          action("Calm: no dread, a rest", () => { director.tension = 0; director.resting = HUNT.cooldown; }),
        ],
      },
      {
```

In `js/main.js`, **replace** line 540:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures }; // for poking at from the console
```

with:

```js

  // A map of what the director is doing: the player in the middle, facing up, the edges of the view, every creature (orange spiders,
  // green ghouls, white skeletons; a big dot is a lunge) and every ghost (blue), and a bar for the dread with a mark where it strikes.
  const mapCanvas = document.createElement("canvas");
  mapCanvas.id = "hunt-map";
  mapCanvas.width = mapCanvas.height = 160;
  document.body.appendChild(mapCanvas);
  const mapContext = mapCanvas.getContext("2d");
  const MAP_SCALE = 9; // pixels to the metre
  const dot = (point, color, radius) => {
    const [x, y] = mapPoint(player, point, MAP_SCALE, 160);
    mapContext.fillStyle = color;
    mapContext.beginPath();
    mapContext.arc(x, y, radius, 0, Math.PI * 2);
    mapContext.fill();
  };
  systems.push(() => {
    mapContext.clearRect(0, 0, 160, 160);
    mapContext.strokeStyle = "rgba(57, 255, 20, 0.25)";
    for (const metres of [2, 4, 6, 8]) {
      mapContext.beginPath();
      mapContext.arc(80, 80, metres * MAP_SCALE, 0, Math.PI * 2);
      mapContext.stroke();
    }
    mapContext.strokeStyle = "rgba(60, 230, 255, 0.7)";
    for (const side of [-1, 1]) {
      const [x, y] = mapPoint(player, pointAt(player, side * currentHalfFov(), 8), MAP_SCALE, 160);
      mapContext.beginPath();
      mapContext.moveTo(80, 80);
      mapContext.lineTo(x, y);
      mapContext.stroke();
    }
    for (const ghost of haunting.items) if (ghost.stage !== "waiting") dot(ghost.position(), "#3ce6ff", 2.5);
    const colors = { spider: "#ff9a1a", ghoul: "#7fe07f", skeleton: "#f2f3ee" };
    for (const creature of creatures.items) dot(creature.position, colors[creature.kind], creature.state === "lunge" ? 5 : 3);
    mapContext.fillStyle = "#39ff14";
    mapContext.fillRect(76, 76, 8, 8);
    mapContext.fillStyle = "rgba(57, 255, 20, 0.8)";
    mapContext.fillRect(4, 152, 152 * director.tension, 4);
    mapContext.fillStyle = "#c4161f";
    mapContext.fillRect(4 + 152 * director.target, 150, 2, 8);
  });
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director }; // for poking at from the console
```

And the style of the map, in the stylesheet of the panel:

In `css/devpanel.css`, after line 17, add:

```css
/* The map of the hunt (see main.js), in the corner opposite the panel. */
#hunt-map {
  position: fixed;
  right: 8px;
  bottom: 44px;
  z-index: 30;
  width: 160px;
  height: 160px;
  border: 1px solid var(--ghost);
  background: rgba(5, 8, 13, 0.75);
  pointer-events: none;
}
```

## Step 4: Try it

Open the page with `?dev`, press the button, and **do nothing**.

- The **map** (bottom right) shows you in the middle, the edges of your view, and a bar that fills: that is the dread. A red mark on it is where it will strike, and it is not in the same place twice.
- After about fifteen to twenty seconds a **creature turns up, and never in front of you**: look at the map to see where, and turn to look (drag): it is there, coming, and you did not see it arrive. Then it lunges.
- **Watch the dread** in the panel when it reaches you (`touch`): it drops, and **resting** counts down from 6 seconds. Nothing new turns up until then. Then it builds again.
- Some spiders **drop from above**: the panel says "dropping", and if you are looking at the right place, you see one fall to the floor.
- Press **H**: the hunt stops. Press it again: it goes on.
- Set **intensity** to 3: it comes much faster, with more at once, and ghouls appear (they need an intensity of 1) and skeletons come early.
- Press **P**: the creatures are not drawn, and the map still shows them coming. A hunt you cannot see is a hunt you could not see in the dark of a real room, either: a later step gives you ways of finding them.
- Drag the **how fast the dread builds** slider all the way up, and **rest after a scare** all the way to 0: it is a nightmare. Down, and up: a lazy one.

On a **phone** this is the first time the game does things *to* you. Hold the phone steady and wait. If it is too quick or too slow, the sliders are your tool: tell me the numbers you like, and they go in the table.

## Step 5: Tests, all together

Open `tests.html`. You should see **242 passing tests**. The director is tested with no scene and no creatures, running sessions of simulated minutes with a seeded random.

## Recap: what you built

| What | Where |
|------|-------|
| A creature that falls | `CREATURE_GRAVITY`, the `fall` state in `creatures.js` |
| Bearings, views, points, and a map point | `horizontalHalfFov`, `bearingTo`, `inView`, `pointAt`, `mapPoint` in `director.js` |
| Where, and what | `pickWeighted`, `zoneRange`, `chooseSpawn`, `chooseKind` in `director.js` |
| The rhythm | `Director`, `HUNT` in `director.js` |
| The hunt in the game, and the map | `main.js`, `css/devpanel.css` |

## Challenges

- **A pause for breath.** The rest is the same length every time. Make it longer after a scare that got *close* (the creature reached the player with most of its health), and write the test first.
- **Heartbeat.** Tension is a number from 0 to 1. A later step can play a heartbeat that gets faster with it. Write `heartRate(tension)` (60 beats a minute when calm, 140 at the edge of a strike) and its tests now.
- **Places it likes.** Ghosts live at the marks the player made. Make the director more likely to send a creature from the zone nearest to a mark. What does it need to know that it does not know now?
- **A story.** The director has no idea how long the game has been going. Give it a clock and make the first minute very quiet. Where does the number go?
