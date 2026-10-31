# Tutorial: Ghost Hunter Tools -- Light and a Beam

This is the ninth tutorial of the Ghost Hunter series. Until now the player could only look. This sample gives them two tools. A **flashlight** that shows what the dark hides (a ghost is only half there until the light is on it) and hurts what hates the light. And a **capture beam** that takes hold of something and, held on it for long enough, captures it. Each has a **limit** (the light's battery, the beam's heat) and each kind of creature has a **weakness**: how it takes the light, how it takes the beam, and how long the light stops it. So the player has a choice to make about every creature, which is what makes a hunt a game. All the rules are plain arithmetic of rays, cones and time, tested without a screen.

By the end you'll have:

- **Aiming as arithmetic**: where a ray meets a person (a vertical stick with a radius), whether a point is in a cone, with a little help for a thumb
- **A flashlight**: a cone with a width and a reach, a battery that runs down while it is on, up while it is off, dims when it is low, goes out when it is flat, and will not come on again until it has some back
- **A capture beam**: held on the nearest thing under the aim, it builds a hold that is lost when it moves away, captures when full, and heats up and **overheats**
- **Weaknesses**: a table with a row for each kind: a spider hates light, a ghoul hardly minds it, a floater is easily held by the beam, a horde hardly at all, and a ghost is not hurt by light but is *shown* by it
- **Stun, capture and reveal**: a creature that can be stopped and one that can be taken, and a ghost that is faint until it is lit
- **Buttons and a beam**: LIGHT (switched) and BEAM (held), with meters, a bar for the hold, a glow for the light, a real light in the scene, and the beam as a glowing line from the hand
- Tools in the **game** and the **developer panel**
- Unit tests for all of it: **361 passing tests**

**What you'll learn:** how to aim at things with a ray and a cone, how to model a resource (a battery, a heat) with limits that make a player choose, how to give each enemy a weakness as a table, how to keep a tool's rules apart from what it looks like, and how to make a held button that survives a finger sliding off it.

**Before you start:** do the [Music tutorial](../ghost_hunter_music/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Music sample, plus placeholders for the new files and their tests. `index.html` and `tests.html` already list them and have the buttons.

```
ghost_hunter_tools/
├── index.html, tests.html   (already list the new scripts; index.html has the buttons and the glow)
├── css/tools.css            (placeholder -- Step 3)
├── js/
│   ├── tools.js             (placeholder -- Step 1)
│   ├── toolsui.js           (placeholder -- Step 3)
│   ├── creatures.js, ghost.js, main.js   (change -- Steps 2 and 4)
│   └── everything else, from the Music sample
└── tests/
    ├── tools.tests.js, toolsui.tests.js  (placeholders)
    └── everything else, from the Music sample
```

Open `tests.html` before you change anything. You should see **318 passing tests**: the ones of the Music sample.

### Serving the page

As before: `npx serve` in the repo root, with **`?dev`**. On a desktop **F** switches the light and **B** (held) fires the beam; on a phone use the buttons.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first).

## The shape of the step

1. **The tools as numbers**: aiming, the light, the beam, the weaknesses.
2. **Creatures and ghosts take them**: stun, capture, reveal.
3. **What is seen and touched**: buttons, a beam, a glow.
4. **The game**.
5. **Try it**.

## Step 1: The tools as numbers

### Aiming

A **ray** is a point and a direction. To ask "is this person under the aim?" the person is a **vertical stick** (a segment from the lowest point their middle can be to the highest) with a **radius**. `rayToSegment` finds the closest points of the ray and the segment (two lines in space: the answer is a few dot products) and says how far along the ray that is and how far off it. `hitTarget` says yes if that is within the radius plus the **aim assist** (a thumb is wider than a pixel), within the range, and in front. `inCone` is the flashlight's question: is the angle between where the light points and where the thing is less than the half-width of the cone, and is it near enough?

### The tables

`TOOLS` has the light (range, width, how fast the battery drains and recharges, where it dims, where it will start again, how much it hurts, the longest a creature can be stunned) and the beam (range, aim assist, heating and cooling, where it overheats and where it will fire again, how fast it builds a hold and loses it). `WEAKNESS` is a row for each kind: **`light`**, how much the light hurts (a multiple of the table's damage); **`stun`**, seconds stopped for each second of light; **`beam`**, how fast the beam gets hold.

Open `js/tools.js` (the placeholder) and **replace the TODO line** with:

```js
// The tools of the hunter: a **flashlight** and a **capture beam**. The flashlight shows what the dark hides (a ghost is only half there until
// the light is on it) and hurts what hates the light. The beam holds on to something and, if it is held for long enough, captures it. Each
// has a limit (the light's battery, the beam's heat), and each kind of creature has a **weakness**: how it takes the light, how it takes
// the beam, and how long the light stuns it. Everything here is plain arithmetic of rays, cones and time, with no Babylon.js, so that the
// tests can aim a tool at anything. See ../tests/tools.tests.js.

const TOOLS = {
  light: {
    range: 7, // metres
    halfAngle: 16, // degrees: the half-width of the cone
    drain: 1 / 80, // charge (0 to 1) a second while it is on: it lasts 80 seconds
    recharge: 1 / 30, // a second while it is off
    dimBelow: 0.2, // below this charge the light dims, and goes out at 0
    restartAt: 0.15, // a flat battery has to get this far before the light will come on again
    damage: 1, // health a second at a weakness of 1
    stunMax: 2.5, // seconds: a creature cannot be stunned for longer than this at once
  },
  beam: {
    range: 8,
    aimAssist: 0.3, // metres: the beam is held on what is nearly under it
    heat: 0.35, // a second while it is fired
    cool: 0.3, // a second while it is not
    overheatAt: 1,
    resumeAt: 0.4, // an overheated beam has to cool this far before it can be fired
    grip: 0.5, // how much of a hold it gets a second at a weakness of 1 (so two seconds to capture)
    letGo: 0.8, // how much of a hold is lost a second when the beam is not on it
  },
};

// How each kind of thing takes the tools. `light` is how much the light hurts it (a multiple of the table's damage), `stun` how long it is
// stopped by it (seconds for each second of light), and `beam` how fast the beam gets a hold of it. A ghost is not hurt by light, and is
// only shown by it.
const WEAKNESS = {
  spider: { light: 3, stun: 1.5, beam: 0.6 },
  ghoul: { light: 0.4, stun: 0, beam: 1.4 },
  skeleton: { light: 1, stun: 0.6, beam: 1 },
  doll: { light: 2, stun: 1, beam: 0.8 },
  floater: { light: 0.8, stun: 0, beam: 2 },
  horde: { light: 0.3, stun: 0, beam: 0.5 },
  ghost: { light: 0, stun: 0, beam: 1.2 },
};

const dotOf = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// How far along a ray (a point and a direction of length one) a thing is, and how far it is off the ray, where a thing is a vertical
// stick (a person is one, with a radius): the closest points of a ray and a segment. Nothing if it is behind the ray.
function rayToSegment(origin, direction, a, b) {
  const e = minus(b, a), w = minus(origin, a);
  const along = dotOf(direction, e), length2 = dotOf(e, e), d0 = dotOf(direction, w), e0 = dotOf(e, w);
  const denominator = length2 - along * along; // the direction is of length one
  let s = Math.abs(denominator) > 1e-9 ? (e0 - along * d0) / denominator : 0; // how far along the segment is nearest the ray
  s = length2 === 0 ? 0 : Math.max(0, Math.min(1, s));
  const t = Math.max(0, s * along - d0); // and how far along the ray is nearest that point
  const onSegment = [a[0] + e[0] * s, a[1] + e[1] * s, a[2] + e[2] * s];
  const onRay = [origin[0] + direction[0] * t, origin[1] + direction[1] * t, origin[2] + direction[2] * t];
  return { t, distance: Math.hypot(...minus(onRay, onSegment)) };
}

// A thing is { base, radius, height }: its feet, and how thick and how tall it is. Gives how far along the ray it is hit (a ray `assist`
// metres wide, for the sake of a thumb), or null if it is missed or too far.
function hitTarget(origin, direction, target, range, assist = 0) {
  const lower = [target.base[0], target.base[1] + target.radius, target.base[2]];
  const upper = [target.base[0], target.base[1] + Math.max(target.radius, target.height - target.radius), target.base[2]];
  const { t, distance } = rayToSegment(origin, direction, lower, upper);
  if (t <= 0 || t > range || distance > target.radius + assist) return null;
  return t;
}

// Is a point inside a cone from a point, along a direction of length one, of a half angle (degrees) and a range?
function inCone(origin, direction, point, halfAngle, range) {
  const to = minus(point, origin);
  const distance = Math.hypot(...to);
  if (distance > range) return false;
  if (distance < 1e-6) return true;
  return dotOf(to, direction) / distance >= Math.cos((halfAngle * Math.PI) / 180);
}

// How strong a light is for a charge: full above the dimming point, and dying away below it.
function lightPower(charge, table = TOOLS.light) {
  if (charge >= table.dimBelow) return 1;
  return Math.max(0, charge / table.dimBelow);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOOLS, WEAKNESS, rayToSegment, hitTarget, inCone, lightPower };
} else {
  Object.assign(window, { TOOLS, WEAKNESS, rayToSegment, hitTarget, inCone, lightPower });
}
```

Things to notice:

- **The weakness is the design.** A spider dies in a second of light (3 times the damage) and is stopped while it is lit. A ghoul takes 0.4 and is not stopped: the light is a poor weapon against it, and the beam (1.4) is the thing. A floater is held at twice the rate. A horde needs both and patience. A ghost cannot be hurt by light at all. Change a number and the game changes.
- **The beam range is a little more than the light's**: the light is for seeing and for what hates it, and the beam can reach a little further than the light shows.
- **`lightPower` dims a low battery** from 1 down to 0 under a fifth: a dying light is weaker (and does less), not just shorter.
- **`rayToSegment` clamps** the position along the segment to 0 to 1 (the ends), so a person is a stick and not an endless pole.

### The tools

`Tools` keeps the state of both: whether the light is on, its charge, whether it is **flat** (the battery has run out and has not got back to the restart point: it will not come on at once, or it would flicker on and off as it recharged a little), the beam's heat and whether it is **overheated**, the **holds** it has on things, and how many things have been captured.

`update(seconds, input, world)` does one frame. `input` is `{ beam }`: is the beam held. `world` is the player's position and the way they face, and a **list of targets** (`{ key, kind, base, radius, height }`): every creature and ghost that can be aimed at, in the shape the tools want. It gives back what happened: what is **lit**, the **hits** of the light (damage and stun for each), what the beam is **aimed** at and how far away, how much **hold** it has, and what was **captured**.

In `js/tools.js`, find the export block (lines 85 to 92) and **delete it**. Add this in its place, and the export block under it:

```js
class Tools {
  constructor(table = TOOLS, weakness = WEAKNESS) {
    this.table = table;
    this.weakness = weakness;
    this.lightOn = false;
    this.charge = 1;
    this.flat = false; // the battery has run out, and has not got back to the restart point
    this.heat = 0;
    this.overheated = false;
    this.grips = new Map(); // key -> how much of a hold the beam has (0 to 1)
    this.captures = {}; // kind -> how many
  }

  // The light is switched on or off. (A flat battery will not come on.)
  toggleLight() {
    if (this.lightOn) this.lightOn = false;
    else if (!this.flat && this.charge > 0) this.lightOn = true;
    return this.lightOn;
  }

  // How much of a hold the beam has on a thing now.
  gripOn(key) {
    return this.grips.get(key) || 0;
  }

  // Time going by, and the tools in use. `input` is { beam }: is the beam held. `world` is { player: { position, forward }, targets }
  // where a target is { key, kind, base, radius, height }. Gives what happened this frame.
  update(seconds, input, world) {
    const light = this.table.light, beam = this.table.beam;
    const origin = world.player.position, direction = world.player.forward;

    // the light: its battery, and what it shows and hurts
    if (this.lightOn) {
      this.charge = Math.max(0, this.charge - light.drain * seconds);
      if (this.charge === 0) {
        this.lightOn = false;
        this.flat = true;
      }
    } else {
      this.charge = Math.min(1, this.charge + light.recharge * seconds);
      if (this.flat && this.charge >= light.restartAt) this.flat = false;
    }
    const power = this.lightOn ? lightPower(this.charge, light) : 0;
    const lit = [];
    const hits = [];
    if (power > 0) {
      for (const target of world.targets) {
        const middle = [target.base[0], target.base[1] + target.height / 2, target.base[2]];
        if (!inCone(origin, direction, middle, light.halfAngle, light.range)) continue;
        lit.push(target.key);
        const weak = this.weakness[target.kind] || { light: 0, stun: 0, beam: 1 };
        hits.push({ key: target.key, damage: light.damage * weak.light * power * seconds, stun: weak.stun * power * seconds });
      }
    }

    // the beam: its heat, what it is on, and how much of a hold it has
    let aimed = null;
    let aimDistance = 0;
    const firing = Boolean(input.beam) && !this.overheated;
    if (firing) {
      this.heat = Math.min(beam.overheatAt, this.heat + beam.heat * seconds);
      if (this.heat >= beam.overheatAt) this.overheated = true;
      for (const target of world.targets) {
        const t = hitTarget(origin, direction, target, beam.range, beam.aimAssist);
        if (t !== null && (aimed === null || t < aimDistance)) {
          aimed = target;
          aimDistance = t;
        }
      }
    } else {
      this.heat = Math.max(0, this.heat - beam.cool * seconds);
      if (this.overheated && this.heat <= beam.resumeAt) this.overheated = false;
    }
    const captured = [];
    for (const key of [...this.grips.keys()]) {
      if (aimed && aimed.key === key) continue;
      const left = this.gripOn(key) - beam.letGo * seconds;
      if (left <= 0) this.grips.delete(key);
      else this.grips.set(key, left);
    }
    if (aimed) {
      const weak = this.weakness[aimed.kind] || { beam: 1 };
      const grip = this.gripOn(aimed.key) + beam.grip * weak.beam * seconds;
      if (grip >= 1) {
        this.grips.delete(aimed.key);
        this.captures[aimed.kind] = (this.captures[aimed.kind] || 0) + 1;
        captured.push(aimed);
      } else {
        this.grips.set(aimed.key, grip);
      }
    }
    return {
      lit, hits, captured,
      aimed: aimed ? aimed.key : null,
      aimDistance,
      firing,
      grip: aimed ? this.gripOn(aimed.key) : 0,
      lightOn: this.lightOn, power, charge: this.charge, heat: this.heat, overheated: this.overheated,
    };
  }

  // How many things have been captured, of a kind or in all.
  total(kind) {
    return kind === undefined ? Object.values(this.captures).reduce((a, b) => a + b, 0) : this.captures[kind] || 0;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOOLS, WEAKNESS, rayToSegment, hitTarget, inCone, lightPower, Tools };
} else {
  Object.assign(window, { TOOLS, WEAKNESS, rayToSegment, hitTarget, inCone, lightPower, Tools });
}
```

Things to notice:

- **The tools do not know what a creature is.** They are given plain targets and give back plain results, and the game does what they say. A test aims them at made-up targets, and so could a different game.
- **A hold is lost a little at a time**, not at once: the beam can slip off a creature for an instant (a hand shakes) and get it back, but not for long. A hold on one thing is lost as the beam goes to another.
- **Overheating is a choice.** The beam can be fired for about three seconds before it overheats and is out until it has cooled to 0.4: a skeleton takes two seconds, so one is easy, and a horde (0.5 of the rate) takes four, so it cannot be done in one go. The player has to let go and come back, with the horde coming.
- **A flat battery** stays flat until it has 15%, so the light cannot be flicked on and off for free at 1%.
- **The aimed thing is the nearest** the beam is on (several can be under it), and it is the one that gets the hold.

## Step 2: Creatures and ghosts take the tools

Three small changes to what already exists.

**A creature can be stunned and captured.** `stun` adds seconds (no more than the table's most), and a stunned creature **does nothing at all**: it does not walk, does not lunge, stands where it is, and goes on afterwards. A creature that is dying cannot be stunned. `capture` is a death of its own: it goes the way of a dead one, and says `captured`.

In `js/creatures.js`, after line 208, add:

```js
    this.stunned = 0; // seconds it is stopped for (a light on it does that)
    this.captured = false;
```

In `js/creatures.js`, after line 228, add:

```js
  // Stops it for `seconds` more (and no more than the table says at once), unless it is dying.
  stun(seconds) {
    if (!this.alive) return;
    this.stunned = Math.min(TOOLS.light.stunMax, this.stunned + seconds);
  }

  // Caught by the beam: it is not killed but taken, and goes the way of a dead one. Gives whether it was.
  capture() {
    if (!this.alive) return false;
    this.captured = true;
    this.state = "dying";
    this.timer = this.table.deathTime;
    this.events.push("captured");
    return true;
  }

```

In `js/creatures.js`, after line 272, add:

```js
    if (this.stunned > 0 && this.state !== "dying" && this.state !== "fall") {
      this.stunned = Math.max(0, this.stunned - seconds); // stopped: it does nothing at all
      this.moving = vlerp(this.moving, 0, Math.min(1, seconds * 8));
      return;
    }
```

**A ghost can be shown and captured.** A ghost has a `reveal`, from 0 to 1, and how much of it is there is `unlit + (1 - unlit) × reveal`: with no light on it, 30% of it. The game brings `reveal` up when the flashlight is on it and down when it is not. A ghost is *shown by default* (`reveal` starts at 1), so nothing that does not use the tools is changed. `capture` on the haunting sends one away (one that has not shown itself cannot be captured).

In `js/ghost.js`, after line 19, add:

```js
  unlit: 0.3, // how much of a ghost is there when no light is on it (1 would be all of it): the flashlight shows the rest
```

In `js/ghost.js`, after line 88, add:

```js
    this.reveal = 1; // how much a light is on it, 0 to 1: the game brings it down when no light is on it
    this.captured = false;
```

In `js/ghost.js`, **replace** line 109:

```js
    return this.table.opacity * envelope(this.age, this.fadeStart, this.table) * flicker(Math.max(0, this.age), this.seed, this.table);
```

with:

```js
    const shown = this.table.unlit + (1 - this.table.unlit) * this.reveal;
    return this.table.opacity * shown * envelope(this.age, this.fadeStart, this.table) * flicker(Math.max(0, this.age), this.seed, this.table);
```

In `js/ghost.js`, after line 158, add:

```js
  // Captures a ghost that has shown itself: it goes, and is counted as captured. Gives whether it was.
  capture(id) {
    const ghost = this.items.find((item) => item.id === id);
    if (!ghost || ghost.stage === "waiting" || ghost.stage === "gone" || ghost.captured) return false;
    ghost.captured = true;
    ghost.vanish();
    return true;
  }

```

### Tests

Open `tests/tools.tests.js` and **replace the TODO line** with:

```js
QUnit.module("rays, cones and aiming", () => {
  const ahead = [0, 0, 1];
  const eye = [0, 1.4, 0];
  const person = (x, z, extra = {}) => ({ key: `p${x},${z}`, kind: "ghoul", base: [x, 0, z], radius: 0.4, height: 1.7, ...extra });

  QUnit.test("a ray straight at a person hits it, at the distance of its middle", (assert) => {
    const t = hitTarget(eye, ahead, person(0, 5), 8);
    assert.true(Math.abs(t - 5) < 1e-9, `${t}`);
  });

  QUnit.test("a ray that passes beside it misses, and one that passes within its radius hits", (assert) => {
    assert.strictEqual(hitTarget(eye, ahead, person(1.5, 5), 8), null);
    assert.true(hitTarget(eye, ahead, person(0.3, 5), 8) !== null);
  });

  QUnit.test("it is hit at any height of it, and missed above and below", (assert) => {
    const target = person(0, 5);
    assert.true(hitTarget([0, 0.3, 0], ahead, target, 8) !== null, "low");
    assert.true(hitTarget([0, 1.6, 0], ahead, target, 8) !== null, "high");
    assert.strictEqual(hitTarget([0, 3, 0], ahead, target, 8), null, "over its head");
  });

  QUnit.test("aiming up and down hits what the line passes through", (assert) => {
    const slope = [0, -0.2, 1].map((n, _, v) => n / Math.hypot(...v));
    assert.true(hitTarget([0, 1.7, 0], slope, person(0, 5), 8) !== null);
    assert.strictEqual(hitTarget([0, 1.7, 0], [0, 0.2, 1].map((n, _, v) => n / Math.hypot(...v)), person(0, 5), 8), null);
  });

  QUnit.test("behind the player, or beyond the range, is a miss", (assert) => {
    assert.strictEqual(hitTarget(eye, ahead, person(0, -5), 8), null);
    assert.strictEqual(hitTarget(eye, ahead, person(0, 12), 8), null);
    assert.true(hitTarget(eye, ahead, person(0, 7), 8) !== null);
  });

  QUnit.test("the aim assist makes a thumb's width of difference", (assert) => {
    const target = person(0.55, 5);
    assert.strictEqual(hitTarget(eye, ahead, target, 8, 0), null);
    assert.true(hitTarget(eye, ahead, target, 8, 0.3) !== null);
  });

  QUnit.test("a small thing on the floor can be hit by a ray at the floor", (assert) => {
    const spider = { key: "s", kind: "spider", base: [0, 0, 4], radius: 0.35, height: 0.35 };
    const down = [0, -1.4, 4].map((n, _, v) => n / Math.hypot(...v));
    assert.true(hitTarget(eye, down, spider, 8) !== null);
    assert.strictEqual(hitTarget(eye, ahead, spider, 8), null, "not along the room at eye height");
  });

  QUnit.test("a cone has a width, a length, and a middle", (assert) => {
    assert.true(inCone(eye, ahead, [0, 1.4, 5], 16, 7));
    assert.true(inCone(eye, ahead, [1, 1.4, 5], 16, 7), "11 degrees off");
    assert.false(inCone(eye, ahead, [3, 1.4, 5], 16, 7), "31 degrees off");
    assert.false(inCone(eye, ahead, [0, 1.4, 9], 16, 7), "too far");
    assert.false(inCone(eye, ahead, [0, 1.4, -3], 16, 7), "behind");
    assert.true(inCone(eye, ahead, eye, 16, 7), "at the eye");
  });

  QUnit.test("a light is full until the battery is low, and then dims to nothing", (assert) => {
    assert.strictEqual(lightPower(1), 1);
    assert.strictEqual(lightPower(TOOLS.light.dimBelow), 1);
    assert.true(Math.abs(lightPower(TOOLS.light.dimBelow / 2) - 0.5) < 1e-9);
    assert.strictEqual(lightPower(0), 0);
  });
});

QUnit.module("Tools", () => {
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1] };
  const target = (key, kind, x, z) => ({ key, kind, base: [x, 0, z], radius: 0.4, height: 1.7 });
  const world = (...targets) => ({ player, targets });
  const none = { beam: false };

  QUnit.test("the light is off at first, and does nothing off", (assert) => {
    const tools = new Tools();
    const frame = tools.update(1, none, world(target("a", "spider", 0, 3)));
    assert.false(frame.lightOn);
    assert.deepEqual(frame.lit, []);
    assert.deepEqual(frame.hits, []);
  });

  QUnit.test("a light on shows what is in the cone and not what is out of it", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    const frame = tools.update(0.1, none, world(target("in", "ghoul", 0, 5), target("out", "ghoul", 4, 5), target("far", "ghoul", 0, 12)));
    assert.deepEqual(frame.lit, ["in"]);
  });

  QUnit.test("light hurts by each kind's weakness: a spider a lot, a ghoul a little, a ghost not at all", (assert) => {
    const hurt = (kind) => {
      const tools = new Tools();
      tools.toggleLight();
      return tools.update(1, none, world(target("a", kind, 0, 4))).hits[0].damage;
    };
    assert.true(Math.abs(hurt("spider") - 3 * TOOLS.light.damage * lightPower(1)) < 1e-9);
    assert.true(hurt("spider") > hurt("doll") && hurt("doll") > hurt("skeleton") && hurt("skeleton") > hurt("ghoul"));
    assert.strictEqual(hurt("ghost"), 0);
  });

  QUnit.test("light stuns what is stunned by it, for as long as it is on it", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    const frame = tools.update(0.5, none, world(target("a", "spider", 0, 4), target("b", "ghoul", 0, 5)));
    assert.true(Math.abs(frame.hits[0].stun - 0.75) < 1e-9);
    assert.strictEqual(frame.hits[1].stun, 0);
  });

  QUnit.test("the battery runs down while the light is on, and up while it is off", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    tools.update(20, none, world());
    assert.true(Math.abs(tools.charge - (1 - 20 * TOOLS.light.drain)) < 1e-9);
    tools.toggleLight();
    tools.update(3, none, world());
    assert.true(Math.abs(tools.charge - (1 - 20 * TOOLS.light.drain + 3 * TOOLS.light.recharge)) < 1e-9);
    tools.update(1000, none, world());
    assert.strictEqual(tools.charge, 1, "never more than full");
  });

  QUnit.test("a flat battery puts the light out, and it will not come on until it has got some back", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    const frame = tools.update(1000, none, world());
    assert.false(frame.lightOn);
    assert.strictEqual(tools.charge, 0);
    assert.false(tools.toggleLight(), "it will not come on");
    tools.update(TOOLS.light.restartAt / TOOLS.light.recharge + 0.1, none, world());
    assert.true(tools.toggleLight(), "and now it will");
  });

  QUnit.test("a low battery gives a weaker light, and so does less", (assert) => {
    const hurt = (charge) => {
      const tools = new Tools();
      tools.charge = charge;
      tools.toggleLight();
      return tools.update(0.001, none, world(target("a", "spider", 0, 4))).hits[0].damage;
    };
    assert.true(hurt(0.05) < hurt(1) * 0.5);
  });

  QUnit.test("the beam does nothing until it is fired, and then it finds the nearest thing it is on", (assert) => {
    const tools = new Tools();
    const targets = world(target("near", "ghoul", 0, 3), target("far", "ghoul", 0, 6));
    assert.strictEqual(tools.update(0.1, none, targets).aimed, null);
    const frame = tools.update(0.1, { beam: true }, targets);
    assert.strictEqual(frame.aimed, "near");
    assert.true(Math.abs(frame.aimDistance - 3) < 0.1);
    assert.true(frame.firing);
  });

  QUnit.test("it builds a hold, and captures when the hold is full, and says so once", (assert) => {
    const tools = new Tools();
    const targets = world(target("g", "skeleton", 0, 4));
    let captured = [];
    let seconds = 0;
    while (captured.length === 0 && seconds < 10) {
      captured = tools.update(0.1, { beam: true }, targets).captured;
      seconds += 0.1;
    }
    assert.true(Math.abs(seconds - 2) < 0.15, `${seconds.toFixed(1)} s`);
    assert.strictEqual(captured[0].key, "g");
    assert.strictEqual(tools.total("skeleton"), 1);
    assert.strictEqual(tools.gripOn("g"), 0);
  });

  QUnit.test("a thing the beam likes is captured sooner than one it does not", (assert) => {
    const timeFor = (kind) => {
      const tools = new Tools();
      let seconds = 0;
      while (tools.update(0.05, { beam: true }, world(target("a", kind, 0, 4))).captured.length === 0 && seconds < 30) seconds += 0.05;
      return seconds;
    };
    assert.true(timeFor("floater") < timeFor("ghoul") && timeFor("ghoul") < timeFor("horde"));
  });

  QUnit.test("the hold is lost when the beam is taken off, a little at a time", (assert) => {
    const tools = new Tools();
    const targets = world(target("g", "ghoul", 0, 4));
    tools.update(0.5, { beam: true }, targets);
    const held = tools.gripOn("g");
    assert.true(held > 0.2);
    tools.update(0.1, none, targets);
    assert.true(tools.gripOn("g") < held && tools.gripOn("g") > 0);
    tools.update(5, none, targets);
    assert.strictEqual(tools.gripOn("g"), 0);
  });

  QUnit.test("moving the beam to another thing starts again with it, and lets go of the first", (assert) => {
    const tools = new Tools();
    tools.update(0.5, { beam: true }, world(target("a", "ghoul", 0, 4)));
    tools.update(0.1, { beam: true }, world(target("a", "ghoul", 4, 4), target("b", "ghoul", 0, 4)));
    assert.true(tools.gripOn("b") > 0);
    assert.true(tools.gripOn("a") < 0.7 * 0.5 + 0.05);
  });

  QUnit.test("the beam heats up as it is fired, overheats, and will not fire until it has cooled", (assert) => {
    const tools = new Tools();
    const targets = world(target("g", "horde", 0, 4));
    let seconds = 0;
    while (!tools.overheated && seconds < 10) { tools.update(0.1, { beam: true }, targets); seconds += 0.1; }
    assert.true(Math.abs(seconds - TOOLS.beam.overheatAt / TOOLS.beam.heat) < 0.2, `${seconds.toFixed(1)} s`);
    assert.false(tools.update(0.1, { beam: true }, targets).firing, "it will not fire");
    tools.update((TOOLS.beam.overheatAt - TOOLS.beam.resumeAt) / TOOLS.beam.cool + 0.2, none, targets);
    assert.false(tools.overheated);
    assert.true(tools.update(0.1, { beam: true }, targets).firing);
  });

  QUnit.test("an unknown kind is hurt by nothing and held at the ordinary rate", (assert) => {
    const tools = new Tools();
    tools.toggleLight();
    const frame = tools.update(1, { beam: true }, world(target("x", "dragon", 0, 4)));
    assert.strictEqual(frame.hits[0].damage, 0);
    assert.true(frame.grip > 0);
  });

  QUnit.test("every kind there is has a weakness, and the table makes sense", (assert) => {
    for (const kind of [...Object.keys(CREATURES), "ghost"]) {
      const w = WEAKNESS[kind];
      assert.true(w && w.light >= 0 && w.stun >= 0 && w.beam > 0, kind);
    }
    assert.strictEqual(WEAKNESS.ghost.light, 0);
    assert.true(TOOLS.light.restartAt < 1 && TOOLS.beam.resumeAt < TOOLS.beam.overheatAt);
    assert.true(TOOLS.light.range < TOOLS.beam.range + 2 && TOOLS.light.halfAngle < 45);
  });

  QUnit.test("the numbers are the table's: a stronger beam is quicker", (assert) => {
    const quick = new Tools({ ...TOOLS, beam: { ...TOOLS.beam, grip: 2 } });
    let seconds = 0;
    while (quick.update(0.05, { beam: true }, world(target("a", "skeleton", 0, 4))).captured.length === 0 && seconds < 10) seconds += 0.05;
    assert.true(seconds < 0.7);
  });
});

QUnit.module("what the tools do to creatures and ghosts", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("a stunned creature stands where it is and does nothing, and then goes on", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 0, 6], random: () => 0 });
    creature.state = "stalk";
    creature.yaw = Math.PI;
    creature.stun(1);
    const start = creature.position.slice();
    for (let i = 0; i < 18; i++) creature.update(0.05, player);
    assert.deepEqual(creature.position, start, "it has not moved");
    for (let i = 0; i < 40; i++) creature.update(0.05, player);
    assert.true(creature.position[2] < start[2], "and then it comes");
  });

  QUnit.test("a stun does not last longer than the table allows, and adds up", (assert) => {
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 0, 6] });
    creature.stun(1);
    creature.stun(1);
    assert.strictEqual(creature.stunned, 2);
    creature.stun(100);
    assert.strictEqual(creature.stunned, TOOLS.light.stunMax);
  });

  QUnit.test("a stunned creature does not lunge, even when it is close", (assert) => {
    const creature = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 1], random: () => 0 });
    creature.state = "stalk";
    creature.stun(2);
    creature.update(0.5, player);
    assert.strictEqual(creature.state, "stalk");
    assert.deepEqual(creature.events, []);
  });

  QUnit.test("a creature that is dying is not stunned, and does not stop dying", (assert) => {
    const creature = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 6] });
    creature.hit(100);
    creature.stun(2);
    for (let i = 0; i < 80; i++) creature.update(0.05, player);
    assert.true(creature.done);
  });

  QUnit.test("a creature is captured: it goes the way of a dead one, and says so", (assert) => {
    const creature = new Creature({ id: 1, kind: "skeleton", position: [0, 0, 6] });
    assert.true(creature.capture());
    assert.strictEqual(creature.state, "dying");
    assert.true(creature.captured);
    assert.deepEqual(creature.events, ["captured"]);
    assert.false(creature.capture(), "only once");
  });

  QUnit.test("a ghost is half there until it is shown, and all there when it is", (assert) => {
    const ghost = new Apparition({ id: 1, home: [0, 0, 5], delay: 0 });
    ghost.update(6, [0, 1.4, 0]);
    ghost.reveal = 1;
    const shown = ghost.opacity();
    ghost.reveal = 0;
    const hidden = ghost.opacity();
    assert.true(Math.abs(hidden / shown - GHOST.unlit) < 1e-9, `${(hidden / shown).toFixed(2)}`);
    assert.true(hidden > 0, "it is still a little there");
    ghost.reveal = 0.5;
    assert.true(ghost.opacity() > hidden && ghost.opacity() < shown);
  });

  QUnit.test("a ghost is shown by default, so nothing that does not use the light is changed", (assert) => {
    const ghost = new Apparition({ id: 1, home: [0, 0, 5], delay: 0 });
    assert.strictEqual(ghost.reveal, 1);
  });

  QUnit.test("a ghost is captured: it fades, and is counted, and one that has not shown itself is not captured", (assert) => {
    const haunting = new Haunting();
    const ghost = haunting.summon([0, 0, 5], { delay: 0 });
    const waiting = haunting.summon([2, 0, 5], { delay: 50 });
    haunting.update(5, { position: [0, 1.4, 0] });
    assert.true(haunting.capture(ghost.id));
    assert.true(ghost.captured);
    assert.true(ghost.fadeStart !== null);
    assert.false(haunting.capture(waiting.id), "it has not begun");
    assert.false(haunting.capture(999));
  });
});
```

Things to notice:

- **Aiming is tested with geometry you can check by eye**: straight at a person hits at the distance of their middle; beside them misses; over their head misses; behind or too far misses; and a ray that passes within the aim assist hits.
- **The numbers of the table are tested against what the tests do**: a spider is hurt three times what the light's damage says, a ghost not at all; a skeleton is captured in two seconds, within a tenth; the beam overheats at the time the table says.
- **A whole tool is run**: a battery drained and recharged, put out and refused until it has some back; a hold built, lost a little at a time, moved from one thing to another.
- **A stunned creature is tested to stand still, and then come**, and one that is dying is tested not to be kept alive by it.

Open `tests.html`. You should see **351 passing tests**: 33 more.

## Step 3: What is seen and touched

The **buttons** are LIGHT (pressed to switch) and BEAM (**held**: on from the press to the release). A touch that leaves the button, or that the phone takes away (a call, a swipe from the edge), is a release too: a beam that cannot be let go of would be on for ever. Each button shows what its tool is doing (on, low, too hot); under each is a **meter** (the battery, the heat); under the aim is a **bar** of how much of a hold the beam has; and when the light is on the picture has a soft **glow**, as bright as the light is.

The **beam** is a thin glowing cylinder from the hand to what it is on, or as far as it reaches. A cylinder of length 1 is **stretched** to the length of the beam, **turned** from straight up to its direction, and put halfway: the same trick as the sticks of the creatures. The hand is a little to the right of, below and in front of the eye (`handPosition`), so the beam seems to come from a hand and not from the middle of the screen.

Open `css/tools.css` (the placeholder) and **replace the TODO line** with:

```css
/* The tools: two buttons and what they have left, a bar for the hold of the beam, and a glow when the light is on (see toolsui.js). */
#tools {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 40px;
  z-index: 7;
  display: flex;
  justify-content: center;
  gap: 28px;
  pointer-events: none; /* only the buttons take a touch */
}
#tools .tool {
  width: 92px;
  text-align: center;
}
#tools button {
  width: 100%;
  padding: 10px 0;
  border: 2px solid var(--bone);
  background: rgba(5, 8, 13, 0.6);
  color: var(--bone);
  font: 18px var(--small-font);
  letter-spacing: 0.1em;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
#tools button.on {
  border-color: var(--ghost);
  color: var(--ghost);
  background: rgba(57, 255, 20, 0.16);
  box-shadow: 0 0 12px rgba(57, 255, 20, 0.5);
}
#tools button.low {
  border-color: var(--blood);
  color: var(--blood);
}
#tools #tool-beam.on {
  border-color: var(--ecto);
  color: var(--ecto);
  background: rgba(60, 230, 255, 0.16);
  box-shadow: 0 0 12px rgba(60, 230, 255, 0.5);
}
#tools #tool-beam.hot {
  border-color: var(--blood);
  color: var(--blood);
  background: rgba(196, 22, 31, 0.2);
}
#tools .meter {
  height: 5px;
  margin-top: 4px;
  background: rgba(242, 243, 238, 0.2);
}
#tools .meter i {
  display: block;
  height: 100%;
  width: 100%;
  background: var(--ghost);
}
#tools .meter.heat i {
  width: 0;
  background: var(--ecto);
}
#grip-bar {
  position: fixed;
  left: 50%;
  top: calc(50% + 34px);
  z-index: 7;
  width: 90px;
  height: 6px;
  margin-left: -45px;
  background: rgba(242, 243, 238, 0.2);
  pointer-events: none;
}
#grip {
  height: 100%;
  width: 0;
  background: var(--ecto);
  box-shadow: 0 0 8px var(--ecto);
  opacity: 0;
}
#torch {
  position: fixed;
  inset: 0;
  z-index: 7;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(circle at 50% 50%, rgba(255, 246, 214, 0.9), rgba(255, 246, 214, 0.35) 22%, rgba(255, 246, 214, 0) 48%);
  mix-blend-mode: screen;
}
```

Open `js/toolsui.js` (the placeholder) and **replace the TODO line** with:

```js
// What the player sees and touches of the tools: two buttons (LIGHT, which is switched on and off, and BEAM, which is held), a meter under
// each (the light's battery, the beam's heat), a bar of how much of a hold the beam has on what it is on, a glow over the picture when the
// light is on, and the beam itself in the scene. The buttons and the bars are built from the page's own elements, given the `document` (so
// the tests can give them stand-ins), and the beam is a stretched, glowing cylinder from the hand to what it is on.
// See ../tests/toolsui.tests.js.

class ToolsUi {
  constructor(doc, { onLight = () => {}, onBeam = () => {} } = {}) {
    const get = (id) => doc.getElementById(id);
    this.light = get("tool-light");
    this.beam = get("tool-beam");
    this.lightMeter = get("meter-light");
    this.beamMeter = get("meter-beam");
    this.grip = get("grip");
    this.torch = get("torch");
    this.onLight = onLight;
    this.onBeam = onBeam;
    this.light.addEventListener("click", () => onLight());
    // The beam is held: it is on from the press to the release, and a touch that leaves the button is a release too.
    const press = (event) => { if (event && event.preventDefault) event.preventDefault(); onBeam(true); };
    const release = () => onBeam(false);
    this.beam.addEventListener("pointerdown", press);
    for (const name of ["pointerup", "pointercancel", "pointerleave"]) this.beam.addEventListener(name, release);
  }

  // Shows what the tools are doing: `frame` is what `Tools.update` gave.
  apply(frame) {
    this._mark(this.light, "on", frame.lightOn);
    this._mark(this.light, "low", frame.charge < TOOLS.light.dimBelow);
    this._mark(this.beam, "on", frame.firing);
    this._mark(this.beam, "hot", frame.overheated);
    this.lightMeter.style.width = `${Math.round(frame.charge * 100)}%`;
    this.beamMeter.style.width = `${Math.round(Math.min(1, frame.heat) * 100)}%`;
    this.grip.style.width = `${Math.round(frame.grip * 100)}%`;
    this.grip.style.opacity = frame.grip > 0 ? "1" : "0";
    this.torch.style.opacity = String((frame.lightOn ? 0.22 * frame.power : 0).toFixed(3));
  }

  _mark(element, name, on) {
    if (on) element.classList.add(name);
    else element.classList.remove(name);
  }
}

// The beam in the scene: a bright thin cylinder from the hand to what it is on (or as far as it reaches), that shakes a little. It is
// only there while the beam is firing.
class BeamBody {
  constructor(scene) {
    this.mesh = BABYLON.MeshBuilder.CreateCylinder("beam", { height: 1, diameter: 1, tessellation: 8 }, scene);
    this.mesh.rotationQuaternion = new BABYLON.Quaternion();
    this.mesh.isPickable = false;
    const material = new BABYLON.StandardMaterial("beam", scene);
    material.disableLighting = true;
    material.emissiveColor = new BABYLON.Color3(0.3, 0.9, 1);
    material.alpha = 0.7;
    this.mesh.material = material;
    this.mesh.setEnabled(false);
    this.up = new BABYLON.Quaternion();
  }

  // `from` and `to` are points; `on` is whether the beam is firing; `time` is the clock, for the shake.
  update(from, to, on, time) {
    this.mesh.setEnabled(on);
    if (!on) return;
    const along = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
    const length = Math.hypot(...along) || 1e-6;
    this.mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
    const width = 0.03 + Math.sin(time * 60) * 0.008;
    this.mesh.scaling.set(width, length, width);
    BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.Up(), new BABYLON.Vector3(along[0] / length, along[1] / length, along[2] / length), this.up);
    this.mesh.rotationQuaternion.copyFrom(this.up);
  }

  dispose() {
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}

// Where the hand is, from the player: a little to the right, below the eye and in front. `player` is { position, forward, up }.
function handPosition(player) {
  const f = player.forward, u = player.up;
  const right = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]]; // left handed: up crossed with forward
  const length = Math.hypot(...right) || 1;
  return [0, 1, 2].map((i) => player.position[i] + (right[i] / length) * 0.16 - u[i] * 0.22 + f[i] * 0.25);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ToolsUi, BeamBody, handPosition };
} else {
  Object.assign(window, { ToolsUi, BeamBody, handPosition });
}
```

Open `tests/toolsui.tests.js` and **replace the TODO line** with:

```js
QUnit.module("ToolsUi", () => {
  class FakeElement {
    constructor() {
      this.listeners = {};
      this.classes = new Set();
      this.style = {};
      this.classList = { add: (n) => this.classes.add(n), remove: (n) => this.classes.delete(n), contains: (n) => this.classes.has(n) };
    }
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const make = () => {
    const ids = ["tool-light", "tool-beam", "meter-light", "meter-beam", "grip", "torch"];
    const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
    const log = [];
    const ui = new ToolsUi({ getElementById: (id) => elements[id] }, { onLight: () => log.push("light"), onBeam: (on) => log.push(on ? "beam on" : "beam off") });
    return { ui, elements, log };
  };
  const frame = (extra = {}) => ({ lightOn: false, power: 0, charge: 1, heat: 0, overheated: false, firing: false, grip: 0, ...extra });

  QUnit.test("the light button switches the light, and the beam button is held", (assert) => {
    const { elements, log } = make();
    elements["tool-light"].listeners.click();
    elements["tool-beam"].listeners.pointerdown({ preventDefault() {} });
    elements["tool-beam"].listeners.pointerup();
    assert.deepEqual(log, ["light", "beam on", "beam off"]);
  });

  QUnit.test("a touch that leaves the beam button, or is taken away, lets the beam go", (assert) => {
    const { elements, log } = make();
    elements["tool-beam"].listeners.pointerdown({});
    elements["tool-beam"].listeners.pointerleave();
    elements["tool-beam"].listeners.pointerdown({});
    elements["tool-beam"].listeners.pointercancel();
    assert.deepEqual(log, ["beam on", "beam off", "beam on", "beam off"]);
  });

  QUnit.test("the buttons show what is on, what is low, and what is too hot", (assert) => {
    const { ui, elements } = make();
    ui.apply(frame({ lightOn: true, power: 1, charge: 0.1, firing: true, overheated: true, heat: 1 }));
    assert.true(elements["tool-light"].classes.has("on") && elements["tool-light"].classes.has("low"));
    assert.true(elements["tool-beam"].classes.has("on") && elements["tool-beam"].classes.has("hot"));
    ui.apply(frame());
    assert.false(elements["tool-light"].classes.has("on") || elements["tool-light"].classes.has("low") || elements["tool-beam"].classes.has("hot"));
  });

  QUnit.test("the meters are as full as the battery is and as hot as the beam is, never more than all", (assert) => {
    const { ui, elements } = make();
    ui.apply(frame({ charge: 0.42, heat: 3 }));
    assert.strictEqual(elements["meter-light"].style.width, "42%");
    assert.strictEqual(elements["meter-beam"].style.width, "100%");
  });

  QUnit.test("the bar of the hold shows only while there is a hold, and the glow only while the light is on", (assert) => {
    const { ui, elements } = make();
    ui.apply(frame({ grip: 0.5 }));
    assert.strictEqual(elements.grip.style.width, "50%");
    assert.strictEqual(elements.grip.style.opacity, "1");
    assert.strictEqual(elements.torch.style.opacity, "0.000");
    ui.apply(frame({ lightOn: true, power: 1 }));
    assert.strictEqual(elements.grip.style.opacity, "0");
    assert.true(Number(elements.torch.style.opacity) > 0.1);
    ui.apply(frame({ lightOn: true, power: 0.5 }));
    assert.true(Number(elements.torch.style.opacity) < 0.15, "a weak light glows less");
  });
});

QUnit.module("BeamBody and the hand", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    return { engine, scene: new BABYLON.Scene(engine) };
  };

  QUnit.test("the beam is only there when it is firing", (assert) => {
    const { engine, scene } = make();
    const beam = new BeamBody(scene);
    assert.false(beam.mesh.isEnabled());
    beam.update([0, 1, 0], [0, 1, 5], true, 0);
    assert.true(beam.mesh.isEnabled());
    beam.update([0, 1, 0], [0, 1, 5], false, 0);
    assert.false(beam.mesh.isEnabled());
    beam.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("it runs from one point to the other: as long as the way between, halfway, pointing along it", (assert) => {
    const { engine, scene } = make();
    const beam = new BeamBody(scene);
    beam.update([1, 1, 0], [1, 1, 6], true, 0);
    assert.true(Math.abs(beam.mesh.scaling.y - 6) < 1e-6);
    assert.true(Math.abs(beam.mesh.position.z - 3) < 1e-6 && Math.abs(beam.mesh.position.x - 1) < 1e-6);
    const along = new BABYLON.Vector3(0, 1, 0).applyRotationQuaternion(beam.mesh.rotationQuaternion);
    assert.true(Math.abs(along.z - 1) < 1e-5);
    beam.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the beam is thin, and shakes a little", (assert) => {
    const { engine, scene } = make();
    const beam = new BeamBody(scene);
    const widths = new Set();
    for (let t = 0; t < 1; t += 0.013) {
      beam.update([0, 1, 0], [0, 1, 4], true, t);
      widths.add(beam.mesh.scaling.x.toFixed(4));
      assert.true(beam.mesh.scaling.x > 0.015 && beam.mesh.scaling.x < 0.05);
    }
    assert.true(widths.size > 5);
    beam.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the hand is to the right of, below and in front of the eye", (assert) => {
    const hand = handPosition({ position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] });
    assert.true(hand[0] > 0.1, "right");
    assert.true(hand[1] < 1.4 && hand[1] > 1, "below");
    assert.true(hand[2] > 0.1, "in front");
  });

  QUnit.test("the hand goes round with the player", (assert) => {
    const hand = handPosition({ position: [0, 1.4, 0], forward: [1, 0, 0], up: [0, 1, 0] }); // facing to the right
    assert.true(hand[0] > 0.1, "in front, which is now x");
    assert.true(hand[2] < -0.1, "and the right hand is now towards -z");
  });
});
```

Things to notice:

- **`pointerdown`, `pointerup`, `pointercancel` and `pointerleave`**: a held button on a phone has four ways to end, and handling only the release would leave the beam on when a finger slid off. The test presses it and lets each of them go.
- **`touch-action: none` and `user-select: none`** on the buttons: a long press on a phone otherwise selects text or opens a menu.
- **The strip of buttons takes no touch** (`pointer-events: none`), and the buttons turn it back on: the gaps between them do not stop a person marking the floor.
- **The glow uses `mix-blend-mode: screen`**, so it only ever makes the picture brighter.

Open `tests.html`. You should see **361 passing tests**: 10 more.

## Step 4: The game

In `js/main.js`: ghosts that start half there, a section for the tools, the keys, and a panel.

A ghost starts with no light on it:

In `js/main.js`, after line 71, add:

```js
    item.reveal = 0; // a ghost is half there until the light is on it
```

The section: the tools, a real **spotlight** from the eye (a light in the scene, so that what it is on can be seen), the beam, the buttons; the **targets** (every creature that is alive and every ghost that has shown itself, as the tools want them); and the system that gives the tools the player and the targets and does what comes back. Light **hurts and stuns** creatures by the numbers it gave; ghosts that are lit are **shown** (`reveal` is eased up, not set: the light comes on a ghost over about half a second); what the beam **captured** is captured, with a notice and a sound; the spotlight and the beam and the buttons follow.

In `js/main.js`, after line 186, add:

```js
// The tools. `tools` is the flashlight and the beam as numbers (tools.js): what is in the cone, what it does to it, what is left in the
// battery, how hot the beam is, and how much of a hold it has. The game gives it everything that can be aimed at, as a list of targets, and
// does what it says: a light shows a ghost (it is half there until then) and hurts and stops what hates it; a beam that has held on long
// enough captures. The light is a real light in the scene, so that what it is on can be seen; the beam is a glowing line from the hand.
const tools = new Tools();
let beamHeld = false;
const torchLight = new BABYLON.SpotLight("torch", BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, 1), toRadians(TOOLS.light.halfAngle * 2.2), 2, scene);
torchLight.intensity = 0;
torchLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8);
const beamBody = new BeamBody(scene);
const toolsUi = new ToolsUi(document, { onLight: () => tools.toggleLight(), onBeam: (on) => { beamHeld = on; } });
let lastCapture = "none";

// Everything that can be aimed at, as the tools want it: a thing with a key, a kind, where its feet are, and how thick and tall it is.
function aimTargets() {
  const targets = [];
  for (const creature of creatures.items) {
    if (!creature.alive) continue;
    targets.push({ key: `c${creature.id}`, kind: creature.kind, base: creature.position, radius: creature.table.radius, height: creature.table.height, creature });
  }
  for (const ghost of haunting.items) {
    if (ghost.stage === "waiting" || ghost.stage === "gone" || ghost.captured) continue;
    targets.push({ key: `g${ghost.id}`, kind: "ghost", base: ghost.position(), radius: 0.45, height: GHOST.height, ghost });
  }
  return targets;
}

systems.push((seconds, player) => {
  const targets = playing ? aimTargets() : [];
  const frame = tools.update(seconds, { beam: beamHeld && playing }, { player, targets });
  const byKey = new Map(targets.map((target) => [target.key, target]));
  for (const hit of frame.hits) {
    const target = byKey.get(hit.key);
    if (!target || !target.creature) continue;
    if (hit.damage > 0) target.creature.hit(hit.damage);
    if (hit.stun > 0) target.creature.stun(hit.stun);
  }
  const lit = new Set(frame.lit);
  for (const ghost of haunting.items) ghost.reveal = approach(ghost.reveal, lit.has(`g${ghost.id}`) ? 1 : 0, seconds, 0.4);
  for (const target of frame.captured) {
    const done = target.creature ? target.creature.capture() : haunting.capture(target.ghost.id);
    if (done) {
      lastCapture = target.kind;
      notice.textContent = `Captured: ${target.kind}`;
      audio.cue("thud", target.base, 0.6);
    }
  }
  torchLight.position.set(player.position[0], player.position[1], player.position[2]);
  torchLight.direction.set(player.forward[0], player.forward[1], player.forward[2]);
  torchLight.intensity = frame.lightOn ? 3.5 * frame.power : 0;
  const from = handPosition(player);
  const reach = frame.aimed ? frame.aimDistance : TOOLS.beam.range;
  beamBody.update(from, [0, 1, 2].map((i) => player.position[i] + player.forward[i] * reach), frame.firing, clock);
  toolsUi.apply(frame);
});

```

**F** switches the light, **B** held is the beam.

In `js/main.js`, after line 475, add:

```js
  if (event.code === "KeyF" && !event.repeat) tools.toggleLight();
  if (event.code === "KeyB") beamHeld = true;
});

window.addEventListener("keyup", (event) => {
  if (event.code === "KeyB") beamHeld = false;
```

In `js/main.js`, after line 597, add:

```js
        title: "Tools",
        rows: [
          readout("light", () => (tools.lightOn ? `on, ${Math.round(tools.charge * 100)}%` : `off, ${Math.round(tools.charge * 100)}%${tools.flat ? " (flat)" : ""}`)),
          readout("beam heat", () => `${Math.round(tools.heat * 100)}%${tools.overheated ? " (too hot)" : ""}`),
          readout("captured", () => `${tools.total()} (last: ${lastCapture})`),
          readout("holds", () => ([...tools.grips].map(([key, grip]) => `${key} ${Math.round(grip * 100)}%`).join(", ") || "none")),
          slider("how wide the light is (degrees)", TOOLS.light, "halfAngle", 5, 40, 1),
          slider("how far the light reaches (m)", TOOLS.light, "range", 2, 14, 0.5),
          slider("how fast the beam holds", TOOLS.beam, "grip", 0.1, 2, 0.05),
          slider("how fast the beam cools", TOOLS.beam, "cool", 0.05, 1, 0.05),
          slider("how much of a ghost is there unlit", GHOST, "unlit", 0, 1, 0.05),
          action("Light on or off (F)", () => tools.toggleLight()),
          action("Fill the battery, cool the beam", () => { tools.charge = 1; tools.flat = false; tools.heat = 0; tools.overheated = false; }),
          action("Capture the nearest", () => { const near = creatures.nearest(player.position); if (near) near.creature.capture(); }),
        ],
      },
      {
```

In `js/main.js`, **replace** line 746:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music }; // for poking at from the console
```

with:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music, tools }; // for poking at from the console
```

Things to notice:

- **The game is the only place that knows what a creature is.** `aimTargets` turns creatures and ghosts into plain targets, and the system turns the tools' answers into damage, stun, reveal and capture. The tools are never given a creature.
- **A ghost's position** for aiming is where its numbers say it is *now* (it drifts and bobs).
- **`approach` is the easing from the music**: the same function that moves the mix moves a ghost into the light.

## Step 5: Try it

Open the page with `?dev`, press the button, and press **1** for a ghoul, and mark the floor for a ghost.

- With the light **off**, a ghost is **faint**: a ghost-shaped haze. Press **F** (or LIGHT): a glow comes over the picture, and **as the light reaches a ghost it fills in**. Look away: it goes faint again.
- Hold **B** (or BEAM) on a ghoul: a **bar** fills under the aim, and in about a second and a half (a ghoul is held at 1.4 times the ordinary rate) **Captured: ghoul**, and it falls away. Look away half-way and the bar **drains**.
- Press **3** for a skeleton, **5** for a floater (the beam holds it in a second), **6** for a horde: fire the beam and watch the **heat** meter: **it overheats before the horde is held**. Let go, wait for it to cool, and go back: the hold has been lost a little, so you have to be quick.
- Press **4** for a doll, or hunt a spider (**spider** at 1 in the table). Switch on the light: **a spider is stunned in the cone** and dies in about a second of it. A ghoul takes the light and keeps coming.
- Leave the light on: the **battery** meter drains. At 20% it **dims**. At 0 it goes out and the button will not come on for a few seconds.
- In the panel's **Tools** group: widen the light, make the beam faster, set **how much of a ghost is there unlit** to 1 (the light then shows nothing new) and to 0.

On a **phone**, the question is whether the buttons are where your thumbs are. Hold the beam with one thumb and aim with the phone; tell me if they are in the wrong place, or too small.

## Step 6: Tests, all together

Open `tests.html`. You should see **361 passing tests**. The rules are tested with plain targets, the changes to creatures and ghosts with the real classes, and the buttons and the beam with stand-ins and a scene that draws nothing.

## Recap: what you built

| What | Where |
|------|-------|
| Aiming a ray or a cone at things | `rayToSegment`, `hitTarget`, `inCone` in `tools.js` |
| The light, the beam, their limits | `TOOLS`, `lightPower`, `Tools` in `tools.js` |
| What each kind is weak to | `WEAKNESS` in `tools.js` |
| A creature that can be stunned and captured | `stun`, `capture` in `creatures.js` |
| A ghost that is shown by light, and captured | `reveal`, `unlit`, `Haunting.capture` in `ghost.js` |
| The buttons, the glow and the beam | `ToolsUi`, `BeamBody`, `handPosition` in `toolsui.js`, `css/tools.css` |
| The tools in the game | `main.js` |

## Challenges

- **A third tool.** Salt: thrown, it makes a line on the floor that a skeleton will not cross. What is the *table* for it, what is the *rule* (a segment on the floor that a creature's walk must not cross), and what is the test?
- **The light flickers when it is low.** `lightPower` only dims. Make it flicker below the dimming point (a function of the charge and the clock), and say in a test that it does not go outside 0 to 1.
- **A better aim.** The beam is held on the *nearest* thing under the aim. Make it prefer a thing that is already held, so that a close thing walking across the aim does not steal it. Where does that go?
- **Weakness by state.** A ghoul that is lunging is open to the beam, one that is lurking is not (it is "asleep"). What would `WEAKNESS` look like, and what would `Tools` need to be told?
