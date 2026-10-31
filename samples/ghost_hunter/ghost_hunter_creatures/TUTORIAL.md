# Tutorial: Ghost Hunter Creatures -- Things That Crawl

This is the fourth tutorial of the Ghost Hunter series. The ghost of the last sample drifts and watches. These creatures **come for you**: a spider that scuttles on eight legs and pounces, a ghoul that lurches and reaches, a skeleton that rattles. The real models are still to be found, so every creature is **built out of simple shapes** (sticks and balls) that are **placeholders** the game can hide. The shapes are not a model of a spider: they are whatever list of bones the creature's *pose* gives this frame, so the code that draws them will draw a model's skeleton just as well, and **a slot for the models is already there**.

By the end you'll have:

- **A two-bone leg solver** (inverse kinematics): give it a hip and a foot, and it says where the knee goes. Every leg of every creature uses it
- **A step**: a foot that is planted for most of a stride, sliding back as the body goes over it, and then swings forward and up
- **Three poses**, as lists of bones and blobs worked out from the time: a spider that crouches before it pounces, a ghoul that is hunched and reaches, a skeleton that rattles more as it goes faster
- **A creature**: a state machine (lurk, stalk, lunge, recover, dying) with health, a walk that turns before it goes, a lunge that is a fast dash, a touch, and a collapse
- **A menagerie**: the creatures there are, limited, and told of when they come and go and what they do
- **A body of shapes**: sticks and balls from a pool, drawn from a pose, and registered as placeholders (kind `creature`)
- **A slot for models**: a table, a loader that tolerates failure, and a body that plays the clip for what the creature is doing
- The creatures in the **game**: keys 1, 2, 3 and developer buttons to spawn them, and a panel to tune their speed and their lunge
- Unit tests for all of it: **211 passing tests**

**What you'll learn:** two-bone inverse kinematics from the meeting of two circles, how a walk cycle is made of a planted foot and a swinging foot, how to keep a character's *pose* (a plain list) apart from how it is *drawn* (so that shapes and models share everything else), how to write a state machine that tests can walk through, and how to leave a clean place for assets that are not ready.

**Before you start:** do the [Apparitions tutorial](../ghost_hunter_apparitions/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Apparitions sample, plus placeholders for the new files and their tests:

```
ghost_hunter_creatures/
├── index.html, tests.html   (already list the new scripts)
├── css/                     (as in the Apparitions sample)
├── js/
│   ├── creatures.js         (placeholder -- Step 1)
│   ├── creaturemesh.js      (placeholder -- Step 2)
│   ├── main.js              (changes -- Step 3)
│   └── everything else, from the Apparitions sample
└── tests/
    ├── creatures.tests.js, creaturemesh.tests.js   (placeholders)
    └── everything else, from the Apparitions sample
```

**Nothing that already exists is changed, except `main.js`.** `creatures.js` borrows two things from `ghost.js` (`TAU` and `turnToward`), which is why that script comes first in the page.

Open `tests.html` before you change anything. You should see **168 passing tests**: the ones of the Apparitions sample.

### Serving the page

As before: `npx serve` in the repo root, and open the sample through `http://localhost`, with **`?dev`** for the developer panel. Press **1**, **2** or **3** to spawn a spider, a ghoul or a skeleton six metres ahead.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **The numbers of a creature**: limbs, poses, a state machine.
2. **The look of a creature**: shapes now, models later.
3. **The game**: keys, buttons, and a panel.
4. **Try it**.

## Step 1: The numbers of a creature

### The table and the limbs

Each creature is a row of a table, `CREATURES`: how much health, how fast it walks, how fast and how far it **lunges**, how long it **recovers**, how far away it **notices** you, how close it has to get to **touch** you, how fast it turns, and how long a stride is. Nothing about a creature is a number in the code.

Then two things every creature needs, however it is built. The first is **a leg**. A leg has two bones and a knee. Given where the hip is and where the foot should be, where does the knee go? The knee is a point that is `upper` away from the hip and `lower` away from the foot, which is **where two circles meet** (two spheres, in 3D, which meet in a circle of places, and the `bend` direction chooses the one on the side the knee bends to). `solveLeg` works it out with the law of cosines. A foot that is too far away is reached for in a straight line, and a leg that is asked for the impossible does not break.

The second is **a step**. A walking foot spends most of its time (`planted`, 60%) on the ground, sliding backwards under the body as it goes over it, at a steady pace; then it swings forward and up, and comes down. `footOffset` takes how far through the step it is (a number that goes round and round) and says how far forward of the middle of the stride the foot is, and how high.

Open `js/creatures.js` (the placeholder) and **replace the TODO line** with:

```js
// Creatures: what a spider, a ghoul and a skeleton are and do, as numbers. Each one is a table of what it is (how fast, how far it
// lunges), a small state machine of what it is doing (lurking, stalking, lunging, recovering, dying), and a pose: the creature as a list
// of bones and blobs, worked out from the time, in its own space, with +z forward and y up. How the bones are drawn is in
// creaturemesh.js, which draws whatever list it is given, so the same code will draw a model's skeleton later. No Babylon.js is in this
// file. (It uses TAU and turnToward from ghost.js, which comes first.) See ../tests/creatures.tests.js.

const CREATURES = {
  spider: {
    name: "spider", health: 3, speed: 1.5, lungeSpeed: 5.5, lungeRange: 1.6, lungeTime: 0.45, recoverTime: 1.4, notice: 7,
    touchRange: 0.55, turnRate: 6, strideLength: 0.5, radius: 0.35, height: 0.35, lurkTime: [0.6, 1.8], deathTime: 1.2,
  },
  ghoul: {
    name: "ghoul", health: 6, speed: 0.85, lungeSpeed: 3.2, lungeRange: 1.9, lungeTime: 0.6, recoverTime: 1.8, notice: 9,
    touchRange: 0.7, turnRate: 2.4, strideLength: 0.65, radius: 0.4, height: 1.7, lurkTime: [1.5, 3.5], deathTime: 2,
  },
  skeleton: {
    name: "skeleton", health: 4, speed: 1.25, lungeSpeed: 4.2, lungeRange: 1.7, lungeTime: 0.5, recoverTime: 1.5, notice: 8,
    touchRange: 0.65, turnRate: 3.6, strideLength: 0.7, radius: 0.35, height: 1.75, lurkTime: [1, 2.5], deathTime: 1.6,
  },
};

const CREATURE_MAX = 6; // how many at once

const vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vscale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlength = (a) => Math.hypot(a[0], a[1], a[2]);
const vunit = (a) => { const n = vlength(a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const vlerp = (a, b, t) => a + (b - a) * t;
const vlerp3 = (a, b, t) => [vlerp(a[0], b[0], t), vlerp(a[1], b[1], t), vlerp(a[2], b[2], t)];

// ---- limbs ----

// Two bones joined at a knee, from a hip to a foot. The knee is where two circles meet (one round the hip with the radius of the upper
// bone, one round the foot with the radius of the lower), pushed out to the side `bend` says. A foot that is out of reach is reached
// for as far as the leg goes, straight. Gives { knee, foot }.
function solveLeg(hip, foot, upper, lower, bend) {
  const toFoot = vsub(foot, hip);
  const far = vlength(toFoot) || 1e-6;
  const along = vscale(toFoot, 1 / far);
  const reach = Math.min(far, upper + lower - 1e-6);
  const nearest = Math.abs(upper - lower) + 1e-6;
  const distance = Math.max(reach, nearest);
  const a = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const h = Math.sqrt(Math.max(0, upper * upper - a * a));
  const side = vsub(bend, vscale(along, vdot(bend, along))); // the part of the bend direction at right angles to the leg
  const sideUnit = vlength(side) < 1e-6 ? [0, 1, 0] : vunit(side);
  const knee = vadd(vadd(hip, vscale(along, a)), vscale(sideUnit, h));
  return { knee, foot: vadd(hip, vscale(along, distance)) };
}

// Where a foot is in its step, `phase` from 0 to 1 round and round: planted (sliding back as the body goes over it) for the first part,
// then swinging forward and up. Gives [forward, up] from the middle of the step.
function footOffset(phase, stride, lift, planted = 0.6) {
  const p = ((phase % 1) + 1) % 1;
  if (p < planted) return [stride * (0.5 - p / planted), 0];
  const t = (p - planted) / (1 - planted);
  return [stride * (-0.5 + t), Math.sin(t * Math.PI) * lift];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURES, CREATURE_MAX, solveLeg, footOffset };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, solveLeg, footOffset });
}
```

Things to notice:

- **The vector helpers have long names** (`vadd`, `vsub`, `vdot`...). Every script of this page shares one global scope, so a short name like `add` would be a collision waiting for the next file that wants it.
- **The knee is solved, not animated.** `a` is how far along the line from hip to foot the knee's shadow falls; `h` is how far it sticks out. Take `bend`, remove the part of it that runs along the leg (it can't bend the leg *along* itself), and what is left says which way out.
- **A foot at the hip, or a bend along the leg, must not break it**: the first is clamped to the least the bones allow, and the second falls back to "up". Both are tests.
- **`footOffset` goes round** (`% 1`, with the `+ 1` that makes a negative phase work too): it is the same at the end of a step as at the start of the next, and a test says so.

### The poses

A **pose** is the creature as a list: **bones** (`{ a, b, r, color }`: a rounded stick from `a` to `b`) and **blobs** (`{ p, r, color }`: a ball). They are in the creature's own space (+z forward, y up), worked out from the time and from a few numbers: how many **steps** it has taken (`gait`), the clock (`time`, for twitches), how much it is **moving** (0 to 1), how far it **reaches** (a ghoul's arms go up), and how low it **crouches** (a spider's body goes down).

The spider's eight legs are in two sets of four that take turns, as a real spider's do (the first leg on the left steps with the second on the right). It crouches before it pounces. Standing still it **twitches**. The ghoul is hunched, sways as it goes, drags its long arms, and when `reach` is up its hands come up in front of it. The skeleton has a spine of small balls, ribs, a skull with dark sockets, arms that swing against its legs, and a **rattle**: a fast, tiny shake that grows with its speed.

In `js/creatures.js`, find the export block (lines 62 to 69) and **delete it**. Add this in its place, and the export block under it:

```js
// ---- poses: a creature as bones and blobs ----
// A bone is { a, b, r, color } (a rounded stick from a to b), and a blob is { p, r, color }. The colours are names: "flesh", "bone",
// "dark", "claw", "eye".

const makeBone = (a, b, r, color) => ({ a, b, r, color });
const makeBlob = (p, r, color) => ({ p, r, color });

// A leg of two bones from a hip to a foot, as two bones and a joint.
function buildLeg(hip, foot, upper, lower, bend, r, color, bones, blobs) {
  const solved = solveLeg(hip, foot, upper, lower, bend);
  bones.push(makeBone(hip, solved.knee, r, color), makeBone(solved.knee, solved.foot, r * 0.75, color));
  blobs.push(makeBlob(solved.knee, r * 1.15, color));
  return solved;
}

// The spider. `gait` counts steps (it goes up as the spider goes along), `time` is the clock (for the idle twitch), and `crouch` is how
// low it is on its legs, 0 to 1 (it crouches before it lunges).
function spiderPose({ gait = 0, time = 0, moving = 0, crouch = 0 } = {}) {
  const bones = [], blobs = [];
  const height = 0.27 - crouch * 0.12;
  const bob = Math.sin(gait * TAU * 2) * 0.012 * moving;
  const body = [0, height + bob, 0];
  blobs.push(makeBlob(vadd(body, [0, 0.02, -0.17]), 0.14, "dark")); // the abdomen
  blobs.push(makeBlob(vadd(body, [0, 0, 0.05]), 0.09, "dark")); // the thorax
  blobs.push(makeBlob(vadd(body, [0, -0.01, 0.17]), 0.06, "flesh")); // the head
  for (const side of [-1, 1]) {
    blobs.push(makeBlob(vadd(body, [side * 0.03, 0.03, 0.22]), 0.014, "eye"));
    blobs.push(makeBlob(vadd(body, [side * 0.015, 0.015, 0.23]), 0.01, "eye"));
    bones.push(makeBone(vadd(body, [side * 0.03, -0.04, 0.2]), vadd(body, [side * 0.035, -0.12, 0.25]), 0.012, "claw")); // the fangs
  }
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const row = i % 4;
    const phase = gait + (((row + (side > 0 ? 1 : 0)) % 2) * 0.5) + (moving > 0 ? 0 : 0);
    const spread = (row - 1.5) * 0.17;
    const hip = vadd(body, [side * 0.07, 0, 0.1 - row * 0.05]);
    const step = footOffset(phase, 0.16 * moving, 0.09 * moving);
    const twitch = (1 - moving) * Math.sin(time * 9 + i * 1.7) * 0.012;
    const rest = [side * (0.42 + crouch * 0.1), 0, spread + (row === 0 ? 0.1 : 0) - 0.05];
    const foot = vadd(rest, [side * twitch, step[1] + Math.abs(twitch), step[0] * 1 + twitch]);
    buildLeg(hip, foot, 0.27, 0.34, [side * 0.3, 1, 0], 0.017, "dark", bones, blobs);
  }
  return { bones, blobs };
}

// The ghoul: hunched, long in the arm, dragging its feet, swaying as it comes, and reaching when it is near. `reach` is 0 to 1.
function ghoulPose({ gait = 0, time = 0, moving = 0, reach = 0 } = {}) {
  const bones = [], blobs = [];
  const sway = Math.sin(gait * TAU) * 0.07 * moving + Math.sin(time * 1.3) * 0.015;
  const lean = 0.3 + 0.12 * moving + 0.15 * reach;
  const pelvis = [sway * 0.5, 0.92, 0];
  const chest = [sway, 1.42, lean];
  const neck = [sway * 1.2, 1.58, lean + 0.2];
  const head = [sway * 1.2 + Math.sin(time * 0.8) * 0.03, 1.55, lean + 0.32];
  bones.push(makeBone(pelvis, chest, 0.14, "flesh"), makeBone(chest, neck, 0.09, "flesh"));
  blobs.push(makeBlob(vadd(pelvis, [0, 0.05, 0]), 0.16, "flesh"), makeBlob(chest, 0.17, "flesh"), makeBlob(head, 0.12, "flesh"));
  blobs.push(makeBlob(vadd(head, [-0.045, 0.02, 0.1]), 0.022, "eye"), makeBlob(vadd(head, [0.045, 0.02, 0.1]), 0.022, "eye"));
  bones.push(makeBone(vadd(head, [0, -0.07, 0.06]), vadd(head, [0, -0.13, 0.1]), 0.045, "dark")); // the open jaw
  for (const side of [-1, 1]) {
    const hip = vadd(pelvis, [side * 0.12, 0, 0]);
    const step = footOffset(gait + (side > 0 ? 0.5 : 0), 0.4 * moving, 0.05 * moving);
    buildLeg(hip, [side * 0.14 + sway, 0.02 + step[1], step[0] + 0.05], 0.46, 0.46, [0, 0.4, 1], 0.07, "flesh", bones, blobs);
    const shoulder = vadd(chest, [side * 0.24, 0.05, 0.02]);
    const swing = Math.sin((gait + (side > 0 ? 0 : 0.5)) * TAU) * 0.3 * moving;
    const hang = [side * 0.28 + sway, 0.4, 0.3 + swing]; // the hand, hanging, near the knee
    const up = [side * 0.16 + sway, 1.45, lean + 0.75]; // the hand, reaching
    const hand = vlerp3(hang, up, reach);
    const arm = buildLeg(shoulder, hand, 0.42, 0.45, [side * 0.5, -0.3, -0.5], 0.05, "flesh", bones, blobs);
    for (const finger of [-1, 0, 1]) bones.push(makeBone(arm.foot, vadd(arm.foot, [finger * 0.03 + side * 0.01, -0.09 + reach * 0.06, 0.1 * reach + 0.02]), 0.012, "claw"));
  }
  return { bones, blobs };
}

// The skeleton: a spine, a skull and a rib cage, arms that swing against its legs, and a rattle that grows with its speed.
function skeletonPose({ gait = 0, time = 0, moving = 0, reach = 0 } = {}) {
  const bones = [], blobs = [];
  const rattle = (i, amount) => Math.sin(time * 47 + i * 5.3) * amount * (0.4 + moving);
  const sway = Math.sin(gait * TAU) * 0.03 * moving;
  const pelvis = [sway, 0.95, 0];
  const chest = [sway * 1.5, 1.45, 0.04 + 0.05 * moving];
  const spineBones = 5;
  for (let i = 0; i < spineBones; i++) blobs.push(makeBlob(vlerp3(pelvis, chest, i / (spineBones - 1)), 0.03, "bone"));
  bones.push(makeBone(pelvis, chest, 0.018, "bone"));
  bones.push(makeBone(vadd(pelvis, [-0.12, 0, 0]), vadd(pelvis, [0.12, 0, 0]), 0.025, "bone"));
  for (let i = 0; i < 4; i++) {
    const y = 1.24 + i * 0.075;
    const width = 0.13 + Math.sin((i / 3) * Math.PI) * 0.04;
    const at = vlerp3(pelvis, chest, (y - 0.95) / 0.5);
    for (const side of [-1, 1]) bones.push(makeBone(vadd(at, [0, 0, 0]), vadd(at, [side * width, -0.02, 0.05 + rattle(i, 0.004)]), 0.01, "bone"));
  }
  const skull = vadd(chest, [rattle(9, 0.006), 0.2, 0.03]);
  blobs.push(makeBlob(skull, 0.11, "bone"), makeBlob(vadd(skull, [0, -0.09, 0.04]), 0.06 + rattle(10, 0.004), "bone"));
  blobs.push(makeBlob(vadd(skull, [-0.04, 0.0, 0.09]), 0.03, "dark"), makeBlob(vadd(skull, [0.04, 0, 0.09]), 0.03, "dark"));
  blobs.push(makeBlob(vadd(skull, [-0.04, 0, 0.1]), 0.012, "eye"), makeBlob(vadd(skull, [0.04, 0, 0.1]), 0.012, "eye"));
  for (const side of [-1, 1]) {
    const hip = vadd(pelvis, [side * 0.12, 0, 0]);
    const step = footOffset(gait + (side > 0 ? 0.5 : 0), 0.5 * moving, 0.12 * moving);
    buildLeg(hip, [side * 0.12 + sway, step[1], step[0]], 0.46, 0.46, [0, 0.5, 1], 0.025, "bone", bones, blobs);
    const shoulder = vadd(chest, [side * 0.2, -0.03, 0]);
    const swing = Math.sin((gait + (side > 0 ? 0 : 0.5)) * TAU) * 0.25 * moving;
    const hang = [side * 0.24 + rattle(side + 3, 0.005), 0.78, swing];
    const up = [side * 0.12, 1.5, 0.7];
    buildLeg(shoulder, vlerp3(hang, up, reach), 0.32, 0.34, [side * 0.5, -0.4, -0.4], 0.02, "bone", bones, blobs);
  }
  return { bones, blobs };
}

const POSES = { spider: spiderPose, ghoul: ghoulPose, skeleton: skeletonPose };

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES });
}
```

Things to notice:

- **`buildLeg` is used by all three creatures**: a spider's leg, a ghoul's arm and a skeleton's leg are the same solver with different lengths and different thicknesses, and a different direction for the knee.
- **A pose is a function, not an animation.** Nothing is keyed; each frame the pose is worked out again from `gait` and `time`. That is also why `gait` counts *steps taken*, not seconds: a creature that stops, stops stepping, and one that runs, steps faster, with no change to the pose code.
- **Colours are names** (`"flesh"`, `"bone"`, `"dark"`, `"claw"`, `"eye"`): this file has no idea what colour is, which is the drawing's business.
- **The tests keep the bones honest**: every leg has the lengths it should, every number is finite for every state, and at least half of a spider's feet are always planted.

### The creature

The behaviour is a small **state machine**:

| State | What it does | Goes on to |
|-------|--------------|------------|
| `lurk` | stands still for a few seconds (a random time from the table) | `stalk`, when the time is up or you are close |
| `stalk` | walks towards you at its speed, turning first | `lunge`, when it is in `lungeRange` |
| `lunge` | dashes in a straight line at where you were, at the lunge speed, for `lungeTime` | `recover`, when it touches you or the time is up |
| `recover` | pauses, for `recoverTime` | `stalk` |
| `dying` | collapses, for `deathTime` | gone |

A few details are what make it feel like something. It **turns before it walks**: a creature that faces away does not slide towards you. A lunge is **aimed once**, at where you were when it began, so a player who steps aside can dodge it (as a real pounce can be). It **never goes through you** (a lunge stops short of the touch range). And what it has done is told as **events** (`lunge`, `touch`, `died`) that whoever is listening empties out, so nothing is told twice and nothing is lost.

In `js/creatures.js`, find the export block (lines 171 to 178) and **delete it**. Add this in its place, and the export block under it:

```js
// ---- the creature ----

class Creature {
  // `position` is where it is on the floor, [x, y, z]; `table` is the creature's own numbers (CREATURES.spider).
  constructor({ id, kind, position, table = CREATURES[kind], random = Math.random }) {
    this.id = id;
    this.kind = kind;
    this.table = table;
    this.position = position.slice();
    this.yaw = 0;
    this.health = table.health;
    this.state = "lurk";
    this.timer = table.lurkTime[0] + random() * (table.lurkTime[1] - table.lurkTime[0]); // seconds left in a state that has a time
    this.gait = 0; // steps taken
    this.clock = 0;
    this.moving = 0; // 0 to 1, smoothly: how much it is walking
    this.lastDistance = Infinity; // how far it was from the player at the last update
    this.lunge = null; // [dx, dz] of the dash it is in
    this.touches = 0; // how many times it has got to the player
    this.done = false;
    this.events = []; // what has happened and has not been told of yet: "lunge", "touch", "died" (whoever tells of them empties it)
  }

  // How far it is from a point, on the floor.
  distanceTo(point) {
    return Math.hypot(point[0] - this.position[0], point[2] - this.position[2]);
  }

  // Is it something a tool can hit: alive, and not yet gone.
  get alive() {
    return this.state !== "dying" && !this.done;
  }

  // A hit that takes `damage` off its health. It is dying when there is none left.
  hit(damage) {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - damage);
    if (this.health === 0) {
      this.state = "dying";
      this.timer = this.table.deathTime;
      this.events.push("died");
    }
    return true;
  }

  // Walks, at `speed`, towards a point (turning first, a little at a time).
  _walk(seconds, target, speed) {
    const wanted = Math.atan2(target[0] - this.position[0], target[2] - this.position[2]);
    this.yaw = turnToward(this.yaw, wanted, this.table.turnRate * seconds);
    const facing = Math.cos(wanted - this.yaw) > 0.5 ? 1 : 0; // it only goes when it faces the way it is going
    const step = speed * seconds * facing;
    this.position[0] += Math.sin(this.yaw) * step;
    this.position[2] += Math.cos(this.yaw) * step;
    this.gait += step / this.table.strideLength;
    return step > 0;
  }

  // Time going by. `player` is where the player is (`player.position`).
  update(seconds, player) {
    if (this.done) return;
    this.clock += seconds;
    const table = this.table;
    const distance = this.distanceTo(player.position);
    this.lastDistance = distance;
    let walking = false;

    if (this.state === "lurk") {
      this.timer -= seconds;
      if (this.timer <= 0 || distance < table.notice * 0.5) this.state = "stalk";
    } else if (this.state === "stalk") {
      walking = this._walk(seconds, player.position, table.speed);
      if (distance <= table.lungeRange) {
        this.state = "lunge";
        this.timer = table.lungeTime;
        this.lunge = [player.position[0] - this.position[0], player.position[2] - this.position[2]];
        this.events.push("lunge");
      }
    } else if (this.state === "lunge") {
      this.timer -= seconds;
      const length = Math.hypot(this.lunge[0], this.lunge[1]) || 1;
      const reachLeft = Math.max(0, distance - table.touchRange * 0.5);
      const step = Math.min(table.lungeSpeed * seconds, reachLeft);
      this.position[0] += (this.lunge[0] / length) * step;
      this.position[2] += (this.lunge[1] / length) * step;
      this.yaw = Math.atan2(this.lunge[0], this.lunge[1]);
      this.gait += step / table.strideLength;
      walking = true;
      if (this.distanceTo(player.position) <= table.touchRange) {
        this.touches += 1;
        this.events.push("touch");
        this.state = "recover";
        this.timer = table.recoverTime;
      } else if (this.timer <= 0) {
        this.state = "recover";
        this.timer = table.recoverTime;
      }
    } else if (this.state === "recover") {
      this.timer -= seconds;
      if (this.timer <= 0) this.state = "stalk";
    } else if (this.state === "dying") {
      this.timer -= seconds;
      if (this.timer <= 0) this.done = true;
    }
    this.moving = vlerp(this.moving, walking ? 1 : 0, Math.min(1, seconds * 8));
  }

  // The bones and blobs of it now, in its own space. The game puts them at `position` and turns them by `yaw`.
  pose() {
    const crouch = this.state === "lunge" ? 0 : this.state === "stalk" && this.lastDistance < 3 ? 0.5 : 0;
    const reach = this.state === "lunge" ? 1 : this.state === "recover" ? 0.4 : 0;
    const flat = this.state === "dying" ? Math.min(1, 1 - this.timer / this.table.deathTime) : 0;
    const made = POSES[this.kind]({ gait: this.gait, time: this.clock, moving: this.moving, reach, crouch });
    return flat > 0 ? collapsePose(made, flat) : made;
  }
}

// A creature that has been killed folds down to the floor: every point comes down towards the floor by `amount`, 0 to 1.
function collapsePose(pose, amount) {
  const down = (p) => [p[0], p[1] * (1 - amount * 0.9), p[2]];
  return { bones: pose.bones.map((b) => ({ ...b, a: down(b.a), b: down(b.b) })), blobs: pose.blobs.map((b) => ({ ...b, p: down(b.p) })) };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature });
}
```

Things to notice:

- **`state` is a string and `update` is an `if` for each**: a state machine does not need a library. Each branch does what the state does, and says which state is next.
- **`pose()` adds to the pose what the state says**: a lunge is a full reach with the spider stretched out; a stalking spider that is near crouches; a dying creature is **collapsed** (every point brought down towards the floor by a fraction that goes from 0 to 1 over the death time).
- **`hit` takes health off** and starts dying when it is gone. A dying creature cannot be hit again, and does not count as alive, so a tool that goes through the creatures later can skip it.

### The menagerie

The creatures there are, like the placements and the haunting before it: it makes them, ages them, tells of every one that comes and goes and of every thing that they do, and has a limit.

In `js/creatures.js`, find the export block (lines 293 to 300) and **delete it**. Add this in its place, and the export block under it:

```js
// The creatures there are: makes them, ages them, tells of every one that comes and goes and every thing they do.
class Menagerie {
  constructor(max = CREATURE_MAX, random = Math.random) {
    this.max = max;
    this.random = random;
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

  // A creature of a kind at a place. Nothing if there are too many already.
  spawn(kind, position) {
    if (!CREATURES[kind] || this.items.length >= this.max) return null;
    const creature = new Creature({ id: this.nextId++, kind, position, random: this.random });
    this.items.push(creature);
    this._tell("added", creature);
    return creature;
  }

  update(seconds, player) {
    for (const creature of this.items) {
      creature.update(seconds, player);
      for (const event of creature.events) this._tell(event, creature);
      creature.events = [];
    }
    for (const creature of this.items.filter((item) => item.done)) this._tell("removed", creature);
    this.items = this.items.filter((item) => !item.done);
  }

  // The nearest creature that is alive to a point, and how far.
  nearest(point) {
    let best = null;
    for (const creature of this.items) {
      if (!creature.alive) continue;
      const distance = creature.distanceTo(point);
      if (!best || distance < best.distance) best = { creature, distance };
    }
    return best;
  }

  // Sends them all away at once.
  clear() {
    for (const creature of this.items) creature.done = true;
    for (const creature of this.items) this._tell("removed", creature);
    this.items = [];
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie });
}
```

### Tests

Open `tests/creatures.tests.js` and **replace the TODO line** with:

```js
const dist3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

QUnit.module("solveLeg and footOffset", () => {
  QUnit.test("the bones keep their lengths, whatever the foot does", (assert) => {
    for (const foot of [[0.3, -0.5, 0.2], [0.1, -0.4, -0.3], [0.5, -0.2, 0.1], [0, -0.7, 0]]) {
      const { knee, foot: reached } = solveLeg([0, 0, 0], foot, 0.4, 0.4, [1, 0.3, 0]);
      assert.true(Math.abs(dist3([0, 0, 0], knee) - 0.4) < 1e-9, "upper");
      assert.true(Math.abs(dist3(knee, reached) - 0.4) < 1e-9, "lower");
      assert.true(dist3(reached, foot) < 1e-5, "it reaches the foot");
    }
  });

  QUnit.test("a foot that is too far is reached for in a straight line", (assert) => {
    const { knee, foot } = solveLeg([0, 0, 0], [3, 0, 0], 0.4, 0.4, [0, 1, 0]);
    assert.true(Math.abs(foot[0] - 0.8) < 1e-4);
    assert.true(Math.abs(knee[1]) < 1e-2, "the leg is straight, so the knee is on the line");
  });

  QUnit.test("the knee bends the way it is told", (assert) => {
    const up = solveLeg([0, 0, 0], [0.4, -0.3, 0], 0.4, 0.4, [0, 1, 0]).knee;
    const down = solveLeg([0, 0, 0], [0.4, -0.3, 0], 0.4, 0.4, [0, -1, 0]).knee;
    assert.true(up[1] > down[1]);
    const out = solveLeg([0, 0, 0], [0, -0.5, 0.2], 0.4, 0.4, [1, 0, 0]).knee;
    assert.true(out[0] > 0);
  });

  QUnit.test("a foot at the hip (or a bend that is along the leg) does not break it", (assert) => {
    const { knee } = solveLeg([0, 0, 0], [0, 0, 0], 0.4, 0.4, [0, 1, 0]);
    assert.true(knee.every(Number.isFinite));
    assert.true(solveLeg([0, 0, 0], [0, -0.5, 0], 0.4, 0.4, [0, -1, 0]).knee.every(Number.isFinite));
  });

  QUnit.test("a foot is planted for most of a step, moving back at a steady pace, and then swings forward and up", (assert) => {
    const a = footOffset(0.1, 1, 0.2), b = footOffset(0.2, 1, 0.2), c = footOffset(0.3, 1, 0.2);
    assert.strictEqual(a[1], 0);
    assert.true(Math.abs((a[0] - b[0]) - (b[0] - c[0])) < 1e-9, "steady");
    assert.true(b[0] < a[0], "back");
    const swing = footOffset(0.8, 1, 0.2);
    assert.true(swing[1] > 0.1, "up in the middle of the swing");
  });

  QUnit.test("a step goes round: the end of one is the start of the next, and the foot never leaves the stride", (assert) => {
    const end = footOffset(0.9999, 1, 0.2), start = footOffset(0, 1, 0.2);
    assert.true(Math.abs(end[0] - start[0]) < 1e-3);
    for (let p = -1.3; p < 2; p += 0.05) {
      const [forward, up] = footOffset(p, 0.4, 0.1);
      assert.true(Math.abs(forward) <= 0.2 + 1e-9);
      assert.true(up >= 0 && up <= 0.1 + 1e-9);
    }
  });
});

QUnit.module("poses", () => {
  const poses = { spider: spiderPose, ghoul: ghoulPose, skeleton: skeletonPose };
  const everyPoint = (pose) => [...pose.bones.flatMap((b) => [b.a, b.b]), ...pose.blobs.map((b) => b.p)];

  QUnit.test("every pose is made of numbers, whatever the state", (assert) => {
    for (const [name, make] of Object.entries(poses)) {
      for (const moving of [0, 0.5, 1]) for (const reach of [0, 1]) for (const gait of [0, 0.3, 7.77]) {
        const pose = make({ gait, time: 3.3, moving, reach, crouch: reach });
        assert.true(everyPoint(pose).every((p) => p.every(Number.isFinite)), `${name} ${moving} ${reach} ${gait}`);
        assert.true(pose.bones.every((b) => b.r > 0) && pose.blobs.every((b) => b.r > 0));
      }
    }
  });

  QUnit.test("every colour a pose uses is one the look has", (assert) => {
    for (const make of Object.values(poses)) {
      const pose = make({ gait: 0.4, time: 1, moving: 1, reach: 1 });
      for (const item of [...pose.bones, ...pose.blobs]) assert.true(item.color in { flesh: 1, bone: 1, dark: 1, claw: 1, eye: 1 }, item.color);
    }
  });

  QUnit.test("a spider has eight legs of two bones each, and they keep their lengths", (assert) => {
    const pose = spiderPose({ gait: 0.2, moving: 1 });
    const legBones = pose.bones.filter((b) => b.color === "dark");
    assert.strictEqual(legBones.length, 16);
    legBones.forEach((b, i) => assert.true(Math.abs(dist3(b.a, b.b) - (i % 2 === 0 ? 0.27 : 0.34)) < 1e-4, `bone ${i}`));
    assert.strictEqual(pose.blobs.filter((b) => b.color === "eye").length, 4);
  });

  QUnit.test("a spider's feet are on the floor, except the ones that are swinging, and some are always on the floor", (assert) => {
    for (let gait = 0; gait < 2; gait += 0.1) {
      const pose = spiderPose({ gait, moving: 1 });
      const feet = pose.bones.filter((b) => b.color === "dark").filter((_, i) => i % 2 === 1).map((b) => b.b[1]);
      assert.true(feet.every((y) => y >= -1e-6));
      assert.true(feet.filter((y) => y < 0.005).length >= 4, "at least half of them are planted");
    }
  });

  QUnit.test("a spider standing still twitches and does not walk", (assert) => {
    const a = spiderPose({ gait: 0, time: 0, moving: 0 });
    const b = spiderPose({ gait: 0, time: 0.5, moving: 0 });
    assert.notDeepEqual(a.bones[5].b, b.bones[5].b);
    assert.true(dist3(a.bones[5].b, b.bones[5].b) < 0.05);
  });

  QUnit.test("a spider crouches, and a ghoul and a skeleton reach", (assert) => {
    const high = Math.max(...spiderPose({ crouch: 0 }).blobs.map((b) => b.p[1]));
    const low = Math.max(...spiderPose({ crouch: 1 }).blobs.map((b) => b.p[1]));
    assert.true(low < high);
    for (const make of [ghoulPose, skeletonPose]) {
      const hands = (pose) => Math.max(...pose.bones.filter((b) => b.a[1] > 1.2).map((b) => b.b[1]));
      assert.true(hands(make({ reach: 1 })) > hands(make({ reach: 0 })) - 1e-9);
    }
  });

  QUnit.test("a ghoul is hunched: its head is in front of its feet, and it is as tall as the table says, near enough", (assert) => {
    const pose = ghoulPose({ gait: 0, moving: 0.5 });
    const top = Math.max(...pose.blobs.map((b) => b.p[1] + b.r));
    assert.true(Math.abs(top - CREATURES.ghoul.height) < 0.25);
    const head = pose.blobs.filter((b) => b.color === "eye")[0].p;
    assert.true(head[2] > 0.3, "leaning forward");
  });

  QUnit.test("a skeleton has a skull and ribs, and rattles more when it moves", (assert) => {
    const still = skeletonPose({ time: 0.3, moving: 0 });
    const running = skeletonPose({ time: 0.3, moving: 1 });
    assert.true(still.bones.filter((b) => b.r === 0.01).length >= 6, "ribs");
    assert.true(still.blobs.some((b) => b.r === 0.11), "a skull");
    const rattle = (pose) => Math.abs(pose.blobs.find((b) => b.r === 0.11).p[0]);
    assert.true(rattle(running) >= rattle(still));
  });

  QUnit.test("every kind has a pose, and a table", (assert) => {
    for (const kind of Object.keys(CREATURES)) {
      assert.strictEqual(typeof POSES[kind], "function", kind);
      const table = CREATURES[kind];
      assert.true(table.health > 0 && table.speed > 0 && table.lungeSpeed > table.speed && table.lungeRange > table.touchRange, kind);
    }
  });
});

QUnit.module("Creature", () => {
  const player = { position: [0, 1.4, 0] };
  const make = (kind = "ghoul", position = [0, 0, 8]) => new Creature({ id: 1, kind, position, random: () => 0 });
  const run = (creature, seconds, step = 0.05) => {
    const events = [];
    for (let t = 0; t < seconds; t += step) {
      creature.update(step, player);
      events.push(...creature.events);
      creature.events = [];
    }
    return events;
  };

  QUnit.test("it lurks, then stalks, and does not move while it lurks", (assert) => {
    const creature = make();
    assert.strictEqual(creature.state, "lurk");
    creature.update(0.5, player);
    assert.deepEqual(creature.position, [0, 0, 8]);
    run(creature, CREATURES.ghoul.lurkTime[0] + 0.2);
    assert.strictEqual(creature.state, "stalk");
  });

  QUnit.test("it stalks at its own speed, towards the player", (assert) => {
    const creature = make("skeleton", [0, 0, 8]);
    creature.state = "stalk";
    creature.yaw = Math.PI; // already facing the player (along -z)
    const before = creature.distanceTo(player.position);
    run(creature, 2);
    const walked = before - creature.distanceTo(player.position);
    assert.true(Math.abs(walked - CREATURES.skeleton.speed * 2) < 0.2, `walked ${walked.toFixed(2)}`);
  });

  QUnit.test("it turns before it walks: one that faces away does not go towards you at first", (assert) => {
    const creature = make("ghoul", [0, 0, 8]);
    creature.state = "stalk";
    creature.yaw = 0; // facing away
    creature.update(0.1, player);
    assert.strictEqual(creature.position[2], 8, "it has not moved yet");
    run(creature, 4);
    assert.true(creature.position[2] < 8);
  });

  QUnit.test("it lunges when it is close, and says so once", (assert) => {
    const creature = make("spider", [0, 0, 2]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 1.5);
    assert.strictEqual(events.filter((e) => e === "lunge").length, 1);
  });

  QUnit.test("a lunge reaches the player: it touches, and recovers, and comes again", (assert) => {
    const creature = make("spider", [0, 0, 3]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 12);
    assert.true(events.includes("touch"));
    assert.true(creature.touches >= 2, `it came again: ${creature.touches}`);
    assert.true(creature.distanceTo(player.position) >= 0, "never through the player");
  });

  QUnit.test("a lunge is faster than a walk", (assert) => {
    const table = CREATURES.ghoul;
    assert.true(table.lungeSpeed > table.speed * 2);
  });

  QUnit.test("a creature recovers for the table's time before it stalks again", (assert) => {
    const creature = make("skeleton", [0, 0, 1]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    while (creature.state !== "recover") creature.update(0.02, player);
    let rested = 0;
    while (creature.state === "recover") { creature.update(0.02, player); rested += 0.02; }
    assert.true(Math.abs(rested - CREATURES.skeleton.recoverTime) < 0.06, `rested ${rested.toFixed(2)} s`);
  });

  QUnit.test("it dies when its health is gone, collapses, and is gone", (assert) => {
    const creature = make("spider");
    assert.true(creature.hit(1));
    assert.strictEqual(creature.health, CREATURES.spider.health - 1);
    assert.true(creature.alive);
    creature.hit(100);
    assert.strictEqual(creature.state, "dying");
    assert.false(creature.alive);
    assert.deepEqual(creature.events, ["died"]);
    assert.false(creature.hit(1), "a dead creature cannot be hit again");
    run(creature, CREATURES.spider.deathTime + 0.2);
    assert.true(creature.done);
  });

  QUnit.test("a dying creature's pose comes down to the floor", (assert) => {
    const creature = make("ghoul");
    creature.hit(100);
    const top = (pose) => Math.max(...pose.blobs.map((b) => b.p[1]));
    const standing = top(make("ghoul").pose());
    creature.update(CREATURES.ghoul.deathTime * 0.9, player);
    assert.true(top(creature.pose()) < standing * 0.4);
  });

  QUnit.test("its legs follow its steps: the gait goes up as it goes along, and not when it stands", (assert) => {
    const creature = make("spider", [0, 0, 8]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    run(creature, 1);
    assert.true(creature.gait > 1, `${creature.gait}`);
    const lurker = make("spider");
    run(lurker, 0.5);
    assert.strictEqual(lurker.gait, 0);
  });

  QUnit.test("a creature with its own table uses it", (assert) => {
    const slow = new Creature({ id: 2, kind: "ghoul", position: [0, 0, 8], table: { ...CREATURES.ghoul, speed: 0.1 }, random: () => 0 });
    slow.state = "stalk";
    slow.yaw = Math.PI;
    run(slow, 2);
    assert.true(8 - slow.position[2] < 0.3);
  });
});

QUnit.module("Menagerie", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("spawns a creature and tells of it, and not of a kind that does not exist", (assert) => {
    const menagerie = new Menagerie(6, () => 0);
    const told = [];
    menagerie.onChange(({ type, item }) => told.push(`${type} ${item.kind}`));
    assert.true(menagerie.spawn("spider", [0, 0, 5]) !== null);
    assert.strictEqual(menagerie.spawn("dragon", [0, 0, 5]), null);
    assert.deepEqual(told, ["added spider"]);
  });

  QUnit.test("no more than the most", (assert) => {
    const menagerie = new Menagerie(2, () => 0);
    menagerie.spawn("spider", [0, 0, 5]);
    menagerie.spawn("ghoul", [1, 0, 5]);
    assert.strictEqual(menagerie.spawn("skeleton", [2, 0, 5]), null);
  });

  QUnit.test("tells of what they do: a lunge, a touch, a death, and when one is gone", (assert) => {
    const menagerie = new Menagerie(6, () => 0);
    const told = [];
    menagerie.onChange(({ type }) => told.push(type));
    const spider = menagerie.spawn("spider", [0, 0, 2.5]);
    spider.state = "stalk";
    spider.yaw = Math.PI;
    for (let i = 0; i < 40; i++) menagerie.update(0.05, player);
    assert.true(told.includes("lunge") && told.includes("touch"));
    spider.hit(100);
    for (let i = 0; i < 40; i++) menagerie.update(0.05, player);
    assert.true(told.includes("died"));
    assert.strictEqual(told[told.length - 1], "removed");
    assert.strictEqual(menagerie.items.length, 0);
  });

  QUnit.test("finds the nearest creature that is alive", (assert) => {
    const menagerie = new Menagerie(6, () => 0);
    assert.strictEqual(menagerie.nearest([0, 0, 0]), null);
    const near = menagerie.spawn("spider", [0, 0, 2]);
    const far = menagerie.spawn("ghoul", [0, 0, 9]);
    assert.strictEqual(menagerie.nearest([0, 0, 0]).creature, near);
    near.hit(100);
    assert.strictEqual(menagerie.nearest([0, 0, 0]).creature, far, "the dying one does not count");
  });

  QUnit.test("clear sends them all away, and tells of each", (assert) => {
    const menagerie = new Menagerie(6, () => 0);
    const told = [];
    menagerie.onChange(({ type }) => told.push(type));
    menagerie.spawn("spider", [0, 0, 2]);
    menagerie.spawn("ghoul", [0, 0, 9]);
    menagerie.clear();
    assert.strictEqual(menagerie.items.length, 0);
    assert.deepEqual(told, ["added", "added", "removed", "removed"]);
  });
});
```

Things to notice:

- **The leg tests are properties**: for any foot, the bones have their lengths and the leg reaches the foot (or goes straight at it).
- **The creature tests walk the state machine** with a made-up `random` that always gives 0, so a creature's lurk time is the least the table allows, and the tests do not depend on luck.
- **The walk is checked against the table**: a skeleton that stalks for two seconds has walked about `speed × 2` metres.
- **A lunge is checked to be a lunge**: it is said once, it touches, the creature recovers for the table's time (measured, not assumed), and comes again.

Open `tests.html`. You should see **199 passing tests**: 31 more.

## Step 2: The look of a creature

### The table, and where the models will go

`CREATURE_LOOK` is the colours and how much of each shows in the dark, and `CREATURE_MODELS` is the **slot**: a table with a row for each kind, now `null` (draw the shapes). When a model is found, a row says where it is, how to scale and turn it so that it stands the right way up and faces forward, and which of its animations to play for what the creature is doing. `loadCreatureModels` loads the ones that have a row, and **a model that will not load is left out and that kind is drawn as shapes**, with a warning, so that a bad file never stops the game.

Open `js/creaturemesh.js` (the placeholder) and **replace the TODO line** with:

```js
// How a creature looks. Until the models arrive, a creature is drawn out of simple shapes, and every one of them is a **placeholder**
// that can be hidden. The shapes are not a model of a spider: they are whatever list of bones and blobs the creature's pose gives this
// frame, drawn as rounded sticks and balls from a pool that grows when it has to. When a model is wanted instead, it goes in the table
// `CREATURE_MODELS`, and a creature that has an entry there is drawn as the model and not as shapes. See ../tests/creaturemesh.tests.js.

const CREATURE_LOOK = {
  colors: {
    flesh: [0.4, 0.5, 0.38], // a sick green-grey
    bone: [0.84, 0.82, 0.7],
    dark: [0.2, 0.17, 0.2],
    claw: [0.6, 0.55, 0.42],
    eye: [1, 0.15, 0.1], // red, and it glows
  },
  glow: 0.5, // how much of its colour a thing shows even in the dark (the rest it takes from the light)
  eyeGlow: 1, // and the eyes show all of it
  sides: 8, // the number of sides of a stick or a ball: it is small, and a phone is slow
};

// Where a model would go for each kind of creature. A kind with `null` is drawn as shapes. An entry is
//   { url: "assets/creatures/spider.glb", scale: 1, yaw: 0, clips: { idle: "Idle", walk: "Walk", lunge: "Attack", die: "Death" } }
// where `scale` and `yaw` put the model right (it may be made big, or face the wrong way), and `clips` names its animations.
const CREATURE_MODELS = { spider: null, ghoul: null, skeleton: null };

// Loads the models in a table that have an entry. Gives a map from kind to what was loaded; a model that will not load is left out (and
// that kind is drawn as shapes), and `loader` is the Babylon.js loader of asset containers, or anything with the same method.
async function loadCreatureModels(scene, models = CREATURE_MODELS, loader = BABYLON.SceneLoader) {
  const loaded = new Map();
  for (const [kind, entry] of Object.entries(models)) {
    if (!entry) continue;
    try {
      loaded.set(kind, { entry, container: await loader.LoadAssetContainerAsync(entry.url, undefined, scene) });
    } catch (error) {
      console.warn(`The model for the ${kind} would not load, so it is drawn as shapes.`, error);
    }
  }
  return loaded;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels };
} else {
  Object.assign(window, { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels });
}
```

### A body of shapes

`CreatureBody` is a root (moved and turned to where the creature is) with a **pool** of sticks and balls. Each frame it takes the pose, makes sure there are enough sticks and balls (it only ever grows), puts each one where a bone or a blob is, and hides the rest. A stick is a cylinder of length 1; to lie along a bone it is **scaled** to the bone's length, **turned** from straight up to the bone's direction (`Quaternion.FromUnitVectorsToRef`), and put halfway between the ends.

The root is registered as a placeholder of the kind `creature`, so hiding the placeholders hides the whole creature, and the creature is still there, still coming.

In `js/creaturemesh.js`, find the export block (lines 39 to 46) and **delete it**. Add this in its place, and the export block under it:

```js
// The materials of the colours, made once for a scene.
function creatureMaterials(scene, look = CREATURE_LOOK) {
  const materials = {};
  for (const [name, color] of Object.entries(look.colors)) {
    const material = new BABYLON.StandardMaterial(`creature-${name}`, scene);
    const glow = name === "eye" ? look.eyeGlow : look.glow;
    material.diffuseColor = new BABYLON.Color3(...color);
    material.emissiveColor = new BABYLON.Color3(...color.map((n) => n * glow));
    material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    materials[name] = material;
  }
  return materials;
}

const FROM_UP = new BABYLON.Quaternion();

// A creature drawn as shapes: a root that is moved and turned, with a pool of sticks and balls that is set from the pose every frame.
class CreatureBody {
  constructor(scene, creature, materials, placeholders, look = CREATURE_LOOK) {
    this.scene = scene;
    this.creature = creature;
    this.materials = materials;
    this.look = look;
    this.root = new BABYLON.TransformNode(`creature-${creature.id}`, scene);
    this.sticks = [];
    this.balls = [];
    if (placeholders) placeholders.add(this.root, "creature");
  }

  _stick(index) {
    if (!this.sticks[index]) {
      const stick = BABYLON.MeshBuilder.CreateCylinder(`stick-${this.creature.id}-${index}`, { height: 1, diameter: 1, tessellation: this.look.sides, cap: BABYLON.Mesh.CAP_ALL }, this.scene);
      stick.parent = this.root;
      stick.rotationQuaternion = new BABYLON.Quaternion();
      stick.isPickable = false;
      this.sticks[index] = stick;
    }
    return this.sticks[index];
  }

  _ball(index) {
    if (!this.balls[index]) {
      const ball = BABYLON.MeshBuilder.CreateSphere(`ball-${this.creature.id}-${index}`, { diameter: 1, segments: this.look.sides }, this.scene);
      ball.parent = this.root;
      ball.isPickable = false;
      this.balls[index] = ball;
    }
    return this.balls[index];
  }

  // Sets everything from what the creature is doing now.
  update() {
    const creature = this.creature;
    this.root.position.set(creature.position[0], creature.position[1], creature.position[2]);
    this.root.rotation.y = creature.yaw;
    const pose = creature.pose();
    pose.bones.forEach((bone, i) => {
      const stick = this._stick(i);
      const along = [bone.b[0] - bone.a[0], bone.b[1] - bone.a[1], bone.b[2] - bone.a[2]];
      const length = Math.hypot(...along) || 1e-6;
      stick.setEnabled(true);
      stick.position.set((bone.a[0] + bone.b[0]) / 2, (bone.a[1] + bone.b[1]) / 2, (bone.a[2] + bone.b[2]) / 2);
      stick.scaling.set(bone.r * 2, length, bone.r * 2);
      BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.Up(), new BABYLON.Vector3(along[0] / length, along[1] / length, along[2] / length), FROM_UP);
      stick.rotationQuaternion.copyFrom(FROM_UP);
      stick.material = this.materials[bone.color];
    });
    for (let i = pose.bones.length; i < this.sticks.length; i++) this.sticks[i].setEnabled(false);
    pose.blobs.forEach((blob, i) => {
      const ball = this._ball(i);
      ball.setEnabled(true);
      ball.position.set(blob.p[0], blob.p[1], blob.p[2]);
      ball.scaling.setAll(blob.r * 2);
      ball.material = this.materials[blob.color];
    });
    for (let i = pose.blobs.length; i < this.balls.length; i++) this.balls[i].setEnabled(false);
  }

  dispose(placeholders) {
    if (placeholders) placeholders.remove(this.root);
    this.root.dispose(false, false);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody };
} else {
  Object.assign(window, { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody });
}
```

Things to notice:

- **A pool, and not a new mesh every frame**: meshes are made once, then moved. A creature has about 60 parts, and a phone cannot make and throw away 60 meshes 60 times a second.
- **Each colour is one shared material**, made once for the scene (`creatureMaterials`), and the eyes show *all* of their colour in the dark: red eyes are the one thing a dark room must not hide.
- **`dispose` takes the placeholder registration away first**, and then the root and everything under it.

### A body of a model

When a model arrives, `ModelBody` draws it instead. The model is *instanced* into the scene, scaled and turned as its row says, put where the creature is, and plays the clip for the creature's state: idle for a lurk and a recovery, walk for a stalk, the attack for a lunge, and the death clip once. It **changes clip only when the state changes**, not every frame. A model that has no walk clip stands (the idle clip) rather than doing nothing.

`makeCreatureBody` is the one place that decides: a kind with a model loaded gets a `ModelBody`, and every other kind gets shapes.

In `js/creaturemesh.js`, find the export block (lines 123 to 130) and **delete it**. Add this in its place, and the export block under it:

```js
// A creature drawn as a model that was loaded: the model is instanced, put where the creature is, and plays the clip for what the
// creature is doing. (Nothing in the game uses it until a model is given in CREATURE_MODELS.)
class ModelBody {
  constructor(scene, creature, loaded) {
    this.creature = creature;
    this.entry = loaded.entry;
    this.instance = loaded.container.instantiateModelsToScene((name) => `${name}-${creature.id}`, false);
    this.root = this.instance.rootNodes[0];
    const scale = this.entry.scale || 1;
    this.root.scaling.setAll(scale);
    this.clip = null;
  }

  // The name of the clip for what a creature is doing.
  static clipFor(state, clips) {
    const wanted = { lurk: "idle", stalk: "walk", lunge: "lunge", recover: "idle", dying: "die" }[state] || "idle";
    return clips[wanted] || clips.idle || null;
  }

  update() {
    const creature = this.creature;
    this.root.position.set(creature.position[0], creature.position[1], creature.position[2]);
    this.root.rotation.y = creature.yaw + (this.entry.yaw || 0);
    const wanted = ModelBody.clipFor(creature.state, this.entry.clips || {});
    if (wanted !== this.clip) {
      for (const group of this.instance.animationGroups) group.stop();
      const next = this.instance.animationGroups.find((group) => group.name.startsWith(wanted));
      if (next) next.start(wanted !== (this.entry.clips || {}).die);
      this.clip = wanted;
    }
  }

  dispose() {
    this.instance.dispose();
  }
}

// Whichever body a creature should have: its model if there is one loaded, and shapes if not.
function makeCreatureBody(scene, creature, materials, placeholders, models = new Map()) {
  const loaded = models.get(creature.kind);
  return loaded ? new ModelBody(scene, creature, loaded) : new CreatureBody(scene, creature, materials, placeholders);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, makeCreatureBody };
} else {
  Object.assign(window, { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, makeCreatureBody });
}
```

### Tests

Open `tests/creaturemesh.tests.js` and **replace the TODO line** with:

```js
QUnit.module("creature bodies", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    return { engine, scene, materials: creatureMaterials(scene), placeholders: new PlaceholderSet({ show: true, kinds: { creature: true } }) };
  };
  const spawn = (kind) => new Creature({ id: 1, kind, position: [1, 0, 4], random: () => 0 });

  QUnit.test("there is a material for every colour a pose can use", (assert) => {
    const { scene, engine, materials } = make();
    for (const name of ["flesh", "bone", "dark", "claw", "eye"]) assert.true(name in materials, name);
    assert.strictEqual(materials.eye.emissiveColor.r, CREATURE_LOOK.colors.eye[0] * CREATURE_LOOK.eyeGlow);
    assert.true(materials.flesh.emissiveColor.r < materials.flesh.diffuseColor.r, "a thing shows only part of its colour in the dark");
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a body draws the pose it is given: a stick for every bone, a ball for every blob", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    for (const kind of ["spider", "ghoul", "skeleton"]) {
      const creature = spawn(kind);
      const body = new CreatureBody(scene, creature, materials, placeholders);
      body.update();
      const pose = creature.pose();
      assert.strictEqual(body.sticks.filter((s) => s.isEnabled()).length, pose.bones.length, kind);
      assert.strictEqual(body.balls.filter((b) => b.isEnabled()).length, pose.blobs.length, kind);
      body.dispose(placeholders);
    }
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a stick runs from one end of its bone to the other", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const body = new CreatureBody(scene, spawn("skeleton"), materials, placeholders);
    body.update();
    const bone = body.creature.pose().bones[0];
    const stick = body.sticks[0];
    const direction = new BABYLON.Vector3(0, 1, 0).applyRotationQuaternion(stick.rotationQuaternion);
    const along = new BABYLON.Vector3(bone.b[0] - bone.a[0], bone.b[1] - bone.a[1], bone.b[2] - bone.a[2]);
    assert.true(Math.abs(stick.scaling.y - along.length()) < 1e-5, "as long as the bone");
    assert.true(Math.abs(BABYLON.Vector3.Dot(direction, along.normalize()) - 1) < 1e-5, "pointing along it");
    assert.true(Math.abs(stick.position.y - (bone.a[1] + bone.b[1]) / 2) < 1e-6, "halfway");
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the root is where the creature is, and turned the way it faces", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const creature = spawn("ghoul");
    creature.yaw = 1.2;
    const body = new CreatureBody(scene, creature, materials, placeholders);
    body.update();
    assert.deepEqual([body.root.position.x, body.root.position.z], [1, 4]);
    assert.strictEqual(body.root.rotation.y, 1.2);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the pool only grows: a pose with fewer parts hides the rest", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const creature = spawn("ghoul");
    const body = new CreatureBody(scene, creature, materials, placeholders);
    body.update();
    const grown = body.sticks.length;
    creature.pose = () => ({ bones: [{ a: [0, 0, 0], b: [0, 1, 0], r: 0.1, color: "bone" }], blobs: [] });
    body.update();
    assert.strictEqual(body.sticks.length, grown);
    assert.strictEqual(body.sticks.filter((s) => s.isEnabled()).length, 1);
    assert.strictEqual(body.balls.filter((b) => b.isEnabled()).length, 0);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a body is a placeholder of its kind, and hiding the placeholders hides it", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const body = new CreatureBody(scene, spawn("spider"), materials, placeholders);
    assert.strictEqual(body.root.metadata.placeholder, "creature");
    assert.true(body.root.isEnabled());
    placeholders.setKind("creature", false);
    assert.false(body.root.isEnabled());
    body.dispose(placeholders);
    assert.strictEqual(placeholders.count("creature"), 0);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("disposing takes the meshes away", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const before = scene.meshes.length;
    const body = new CreatureBody(scene, spawn("spider"), materials, placeholders);
    body.update();
    assert.true(scene.meshes.length > before + 10);
    body.dispose(placeholders);
    assert.strictEqual(scene.meshes.length, before);
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("models", () => {
  const entry = { url: "x.glb", scale: 2, yaw: 3, clips: { idle: "Idle", walk: "Walk", lunge: "Attack", die: "Death" } };
  const fakeGroup = (name) => ({ name, started: null, stopped: 0, start(loop) { this.started = loop; }, stop() { this.stopped += 1; } });
  const fakeContainer = () => {
    const groups = ["Idle", "Walk", "Attack", "Death"].map(fakeGroup);
    const root = { scaling: new BABYLON.Vector3(1, 1, 1), position: new BABYLON.Vector3(), rotation: new BABYLON.Vector3() };
    return { groups, root, instantiateModelsToScene: () => ({ rootNodes: [root], animationGroups: groups, dispose() { this.disposed = true; } }) };
  };

  QUnit.test("no kind has a model yet, so every kind is drawn as shapes", (assert) => {
    assert.deepEqual(Object.values(CREATURE_MODELS), [null, null, null]);
  });

  QUnit.test("only the kinds that have an entry are loaded, and one that fails is left out", async (assert) => {
    const asked = [];
    const loader = { LoadAssetContainerAsync: async (url) => { asked.push(url); if (url === "bad.glb") throw new Error("no"); return { url }; } };
    const warn = console.warn;
    console.warn = () => {};
    const loaded = await loadCreatureModels(null, { spider: { url: "good.glb" }, ghoul: null, skeleton: { url: "bad.glb" } }, loader);
    console.warn = warn;
    assert.deepEqual(asked, ["good.glb", "bad.glb"]);
    assert.deepEqual([...loaded.keys()], ["spider"]);
  });

  QUnit.test("a model is scaled, put where the creature is, and turned the way it faces, plus what the model needs", (assert) => {
    const container = fakeContainer();
    const creature = new Creature({ id: 1, kind: "spider", position: [2, 0, 5], random: () => 0 });
    creature.yaw = 1;
    const body = new ModelBody(null, creature, { entry, container });
    body.update();
    assert.strictEqual(container.root.scaling.x, 2);
    assert.deepEqual([container.root.position.x, container.root.position.z], [2, 5]);
    assert.strictEqual(container.root.rotation.y, 4);
  });

  QUnit.test("the clip follows what the creature is doing, and only changes when that does", (assert) => {
    assert.strictEqual(ModelBody.clipFor("lurk", entry.clips), "Idle");
    assert.strictEqual(ModelBody.clipFor("stalk", entry.clips), "Walk");
    assert.strictEqual(ModelBody.clipFor("lunge", entry.clips), "Attack");
    assert.strictEqual(ModelBody.clipFor("dying", entry.clips), "Death");
    assert.strictEqual(ModelBody.clipFor("stalk", { idle: "Idle" }), "Idle", "a model with no walk stands");
    const container = fakeContainer();
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 0, 5], random: () => 0 });
    const body = new ModelBody(null, creature, { entry, container });
    body.update();
    const idle = container.groups[0];
    assert.strictEqual(idle.started, true, "idle loops");
    body.update();
    assert.strictEqual(idle.stopped, 1, "and is not started again while it goes on");
    creature.state = "dying";
    body.update();
    assert.strictEqual(container.groups[3].started, false, "death plays once");
  });

  QUnit.test("a kind with a model is drawn as it, and one without as shapes", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 0, 5], random: () => 0 });
    const withModel = makeCreatureBody(scene, creature, creatureMaterials(scene), null, new Map([["spider", { entry, container: fakeContainer() }]]));
    assert.true(withModel instanceof ModelBody);
    const without = makeCreatureBody(scene, creature, creatureMaterials(scene), null, new Map());
    assert.true(without instanceof CreatureBody);
    scene.dispose();
    engine.dispose();
  });
});
```

Things to notice:

- **A stick is tested to lie along its bone**: as long as the bone, halfway along it, and pointing the way the bone points.
- **The model code is tested without a model**: a stand-in container with four animation groups checks the scale, the position, the clip names, and that a clip is not restarted every frame.
- **The loader is given in**, so a test can make one that fails, and say that the kind with the bad file is left out.

Open `tests.html`. You should see **211 passing tests**: 12 more.

## Step 3: The game

In `js/main.js`, a new section, a few keys, and a group of rows in the developer panel.

### The creatures

The new section makes the materials, the menagerie, and a **system** that updates the creatures and brings every body up to date. As with the ghosts, the menagerie and the bodies are joined by listening: `added` makes a body, `removed` disposes of it, and anything else (a lunge, a touch, a death) is remembered as the last thing a creature did, for the panel.

In `js/main.js`, after line 83, add:

```js
// The creatures. `creatures` keeps their numbers (see creatures.js), and each has a body that is drawn from its pose (creaturemesh.js).
// Until models are given in CREATURE_MODELS the bodies are made of simple shapes, which are placeholders of the kind "creature": hide
// them with P (or the panel) and the creatures are still there, and still coming.
const looks = creatureMaterials(scene);
const creatures = new Menagerie();
const creatureBodies = new Map(); // creature id -> its body
let creatureModels = new Map(); // the models that have been loaded, by kind (none, so far)
let lastCreatureEvent = "none";
let creaturesActive = true; // developer mode can freeze them where they stand

creatures.onChange(({ type, item }) => {
  if (type === "added") {
    creatureBodies.set(item.id, makeCreatureBody(scene, item, looks, placeholders, creatureModels));
  } else if (type === "removed") {
    const body = creatureBodies.get(item.id);
    if (body) body.dispose(placeholders);
    creatureBodies.delete(item.id);
  } else {
    lastCreatureEvent = `${item.kind} ${type}`; // a lunge, a touch, a death
  }
});

systems.push((seconds, player) => {
  if (creaturesActive) creatures.update(seconds, player);
  for (const body of creatureBodies.values()) body.update();
});

loadCreatureModels(scene).then((loaded) => { creatureModels = loaded; });

// A creature six metres ahead of the player, on the floor.
function spawnCreature(kind) {
  const ahead = player.forward;
  const flat = Math.hypot(ahead[0], ahead[2]) || 1;
  creatures.spawn(kind, [player.position[0] + (ahead[0] / flat) * 6, 0, player.position[2] + (ahead[2] / flat) * 6]);
}

```

Things to notice:

- **`creatureModels` starts empty and is filled when the loader finishes.** A creature spawned before then is made of shapes; there are no models yet, so the loader returns at once.
- **`creaturesActive`** freezes the AI from the panel: the creatures stand where they are, but are still drawn, which is the way to look at one from every side.
- **`spawnCreature`** puts one six metres ahead of the player, on the floor.

### The keys, and developer mode

**1**, **2**, **3** spawn a spider, a ghoul and a skeleton, and **0** clears them.

In `js/main.js`, after line 335, add:

```js
  if (event.code === "Digit1") spawnCreature("spider");
  if (event.code === "Digit2") spawnCreature("ghoul");
  if (event.code === "Digit3") spawnCreature("skeleton");
  if (event.code === "Digit0") creatures.clear();
```

The panel gets a group: how many creatures, the nearest (its kind, its state, how far), the last thing a creature did, which kinds have models, a switch for the AI, sliders for the speeds and the spider's lunge range, buttons to spawn each and to hurt the nearest and to clear them.

In `js/main.js`, after line 448, add:

```js
        title: "Creatures",
        rows: [
          readout("creatures", () => creatures.items.length),
          readout("nearest", () => { const near = creatures.nearest(player.position); return near ? `${near.creature.kind} ${near.creature.state}, ${near.distance.toFixed(1)} m` : "none"; }),
          readout("last thing it did", () => lastCreatureEvent),
          readout("models", () => (creatureModels.size ? [...creatureModels.keys()].join(", ") : "none: shapes")),
          toggle("they move", () => creaturesActive, (value) => { creaturesActive = value; }),
          slider("spider speed", CREATURES.spider, "speed", 0.3, 4, 0.1),
          slider("ghoul speed", CREATURES.ghoul, "speed", 0.3, 4, 0.1),
          slider("skeleton speed", CREATURES.skeleton, "speed", 0.3, 4, 0.1),
          slider("spider lunge range", CREATURES.spider, "lungeRange", 0.5, 4, 0.1),
          slider("lunge pause (ghoul)", CREATURES.ghoul, "recoverTime", 0.2, 6, 0.1),
          action("Spider (1)", () => spawnCreature("spider")),
          action("Ghoul (2)", () => spawnCreature("ghoul")),
          action("Skeleton (3)", () => spawnCreature("skeleton")),
          action("Hurt the nearest", () => { const near = creatures.nearest(player.position); if (near) near.creature.hit(1); }),
          action("Clear them (0)", () => creatures.clear()),
        ],
      },
      {
```

In `js/main.js`, **replace** line 489:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting }; // for poking at from the console
```

with:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures }; // for poking at from the console
```

## Step 4: Try it

Open the page with `?dev`, press the button, and press **1**.

- A **spider** appears six metres ahead, and **waits**, twitching, for a second or two. Then it **scuttles** towards you: watch the legs, in two sets taking turns, each foot planted and then swinging up and forward. At about a metre and a half it **crouches and pounces**, and stops short of you. It **recovers**, and comes again.
- Press **2**: a **ghoul**: hunched, swaying, its long arms dragging, red eyes, slow. When it is near, its arms come up, and it lunges.
- Press **3**: a **skeleton**: ribs, skull, the arms against the legs, a faint rattle that gets worse as it goes faster.
- In the panel, **Creatures**: the **nearest** says what it is doing and how far. Turn off **they move** and walk round one (drag to look) to see its pose from all sides. Raise **spider speed** to 4. Press **Hurt the nearest** three times on a spider: it collapses and is gone.
- Press **P**: the creatures vanish, and the panel still says one is stalking you, and **the last thing it did** goes on changing. They are not drawn, and they are still there.
- Press **0** to clear them.

On a **phone** the first thing is to see how large a spider is at the end of your arm. If the creatures look too small or too far away, change **field of view**.

## Step 5: Tests, all together

Open `tests.html`. You should see **211 passing tests**. The legs, the steps, the poses and the behaviour of every creature are tested with no scene; the bodies are tested with an engine that draws nothing, and the models with stand-ins.

## Recap: what you built

| What | Where |
|------|-------|
| A knee from a hip and a foot, a step | `solveLeg`, `footOffset` in `creatures.js` |
| A spider, a ghoul and a skeleton as bones and blobs | `spiderPose`, `ghoulPose`, `skeletonPose` in `creatures.js` |
| Their behaviour | `Creature`, `Menagerie`, `CREATURES` in `creatures.js` |
| Shapes for a creature, hideable | `CreatureBody`, `creatureMaterials` in `creaturemesh.js` |
| A slot for models | `CREATURE_MODELS`, `loadCreatureModels`, `ModelBody`, `makeCreatureBody` in `creaturemesh.js` |
| The creatures in the game | `main.js` |

## Challenges

- **A web.** A spider that is not stalking can hang from the ceiling on a thread and drop in front of the player. The ceiling is a height (the table could say 2.5 metres); write the pose (legs tucked), and the fall as a function of time that a test can check, before you draw it.
- **Hit boxes.** Each creature has a `radius` and a `height` in its table. Write `creatureHit(creature, origin, direction)` that says whether a ray (the flashlight's) hits the capsule of that size, and how far away. (A later step needs it.)
- **A different gait.** Give the ghoul a drag: one foot never leaves the floor. What changes in `footOffset`'s caller, and which test of the spider's feet must the ghoul *not* have?
- **A fourth creature.** A crawling hand: one blob and five fingers with two bones each, a pose of its own, and a row in the table. How much of `main.js` has to change? (Look at the three places a kind is named.)
