# Tutorial: Tower Defense Elements -- What a Hit Does Besides Harm

This is the eighth tutorial in the Tower Defense series. Every bolt so far does harm and nothing else, and the four nations differ only in how much. This tutorial gives each nation **an effect of its own**: **water slows** the crowd, **fire burns**, **earth stuns** and **air pushes back** along the road. An effect is a row of a table; an enemy has a **status** that says which effects it is under and for how long; a bolt carries its effect to the enemy it hits; and some enemies **resist** an effect and some are weak to it. You write the code; this document tells you what to write and why.

By the end you'll have:

- **A table of effects**: how long each lasts, how hard it is, how far it reaches, and the words that describe it for the player
- **A `Status`**: a small machine, with no model and no scene in it, that is put an effect on and let go by time, and says how fast to walk and how much to burn
- **Enemies that feel it**: they walk slower, stop, burn or are thrown back along the road, with their feet keeping up, and each kind takes more or less of each effect
- **Bolts that carry it**, through the brain, the tower and the upgrades (a master's effect is more potent)
- **Marks** over an enemy's head, a picture for each effect that is on it, and a line on the panel that says what a tower's effect is
- A simulation that says that **each nation's effect earns its keep**, and a harder game to go with it
- Unit tests for all of it: **744 passing tests**, 79 of them new, including tests that **load the real models**, draw the marks, and play whole games

**What you'll learn:** how to put several kinds of temporary change on one thing without a pile of `if`s (an effect is a row of a table and a status is an object of times), how to apply a change to a crowd and not to one, why a game that you have balanced has to be balanced again when you give it a new rule (the simulation will tell you which of your ideas does nothing), how to draw a shape on a canvas and use it as a texture for a mark that always faces the camera, and how to share a texture between a hundred enemies.

**Before you start:** do the [Variety tutorial](../tower_defense_variety/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Variety sample, plus placeholders for the new files:

```
tower_defense_elements/
├── index.html, tests.html   (already list the new scripts, and the panel has a line for the effect)
├── js/
│   ├── effects.js            (placeholder -- Steps 1 and 2)
│   ├── marks.js              (placeholder -- Step 5)
│   ├── walker.js             (a change -- Step 2)
│   ├── enemies.js            (changes -- Steps 3 and 5)
│   ├── bolts.js, benders.js, upgrades.js, brain.js, tower.js   (changes -- Step 4)
│   ├── battle.js, panel.js, hand.js, main.js, css/panel.css    (changes -- Step 5)
│   ├── waves.js              (a number -- Step 6)
│   └── everything else, from the Variety sample
└── tests/
    ├── effects.tests.js      (placeholder -- Step 1)
    ├── status.tests.js       (placeholder -- Step 2)
    ├── marks.tests.js        (placeholder -- Step 5)
    ├── most of the others    (additions and changes)
    └── everything else, from the Variety sample
```

Open `tests.html` before you change anything, through the web server. You should see **665 passing tests**, the Variety sample's.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_elements/` (the command prints the exact address), or use the *Live Server* extension in VS Code. `?map=1` is the second map.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Effects**: a table, who is reached, and how it is described.
2. **Status**: what an enemy is under, and for how long.
3. **Enemies feel them**: walking, stopping, burning and being pushed.
4. **Bolts carry them**: from the table of benders, through the brain and the tower, to the enemy.
5. **Seeing them**: marks over the head, and a line on the panel.
6. **A harder game**: the simulation, and a number.

---

## Step 1: Effects

An effect is a row of a table. What the row says depends on the effect, but they have a shape in common: a `name` and a `color` for the player, and a `seconds` for how long it lasts. Open `js/effects.js` (the placeholder) and **replace the TODO line** with:

```js
// Effects: what a bolt does to an enemy besides harm it. Water slows it, fire burns it, earth stuns it and air pushes it
// back along the road. An effect is a row of a table, and an enemy has a `Status`: which effects it is under now, and for
// how long. A status knows nothing of models or of the scene, only of effects and time, and it says what the enemy is
// to do about it this moment (how fast to walk, how much to burn). See ../tests/effects.tests.js.

// One row for each effect. `name` and `color` are what the player sees. What the rest means depends on the effect:
//   slow  walks at `speed` (a share of its usual) for `seconds`.
//   burn  takes `damage` a second for `seconds`.
//   stun  stands still for `seconds`, and then can't be stunned again for `immune` more (or it would never move).
//   push  is thrown back `distance` along the road, sliding back over `glide` seconds. `seconds` is only how long the mark stays on the enemy.
// `radius` is how far from the enemy that is hit that the effect reaches: the others within it get it too. (A tower that
// slows one enemy at a time slows nothing, since the tower goes on to the one that gets past it. A wave of water slows the crowd.)
const EFFECTS = {
  slow: { name: "Slows", color: "#38b6ff", seconds: 2.5, speed: 0.5, radius: 1.6 },
  burn: { name: "Burns", color: "#f0701a", seconds: 3, damage: 3, radius: 0 },
  stun: { name: "Stuns", color: "#e8c33a", seconds: 1, immune: 1.6, radius: 0 },
  push: { name: "Pushes back", color: "#d8e6f2", seconds: 0.5, distance: 3, glide: 0.3, radius: 0 },
};

// The enemies that an effect reaches when it hits `enemy`: the enemy itself, and (for an effect with a radius) every other
// that is on its feet and within the radius of it.
function reached(kind, enemy, enemies) {
  const radius = EFFECTS[kind].radius;
  if (!radius) return [enemy];
  return [enemy, ...enemies.filter((other) => other !== enemy && other.alive && Math.hypot(other.x - enemy.x, other.z - enemy.z) <= radius)];
}

// The effect of a bender is as strong as its *potency* (a tower that has been upgraded is more potent), and an enemy
// takes as much of it as it is *affected* (a heavy trooper is hard to push, and burns hardly at all). Potency is
// multiplied into how long an effect lasts, and how far a push goes. A potency of nothing is no effect at all.
function strength(potency, affected = 1) {
  return Math.max(0, potency * affected);
}

// What an effect says it does, in words, for the panel: "Slows for 2.5 seconds", and so on, for a potency.
function describe(kind, potency = 1) {
  const effect = EFFECTS[kind];
  const seconds = Math.round(effect.seconds * potency * 10) / 10;
  const time = `${seconds} second${seconds === 1 ? "" : "s"}`;
  if (kind === "slow") return `Slows the crowd by half for ${time}`;
  if (kind === "burn") return `Burns for ${Math.round(effect.damage * effect.seconds * potency)} over ${time}`;
  if (kind === "stun") return `Stuns for ${time}`;
  return `Pushes back ${Math.round(effect.distance * potency * 10) / 10} along the road`;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EFFECTS, reached, strength, describe };
} else {
  Object.assign(window, { EFFECTS, reached, strength, describe });
}
```

Things to notice:

- **Four effects, four different kinds of change.** A *slow* and a *stun* change how fast it walks; a *burn* is harm over time; a *push* is a slide back along the road. The table has the numbers of each (`speed`, `damage`, `distance`), and the code that uses them says which.
- **A stun can't be repeated at once.** After a stun an enemy is *immune* for `immune` seconds, so that a tower that stuns every time it fires doesn't keep an enemy where it is for ever. (A test plays a minute of it, and says an enemy is still moving most of the time.)
- **`radius` is how far from the enemy that is hit that the effect reaches.** Only the slow has one: it is a wave of water, and slows the crowd. This is the most important number of the step, and there is a reason for it: a tower that slows *one* enemy slows nothing. The tower goes on to the enemy that gets past it (it shoots the one that is furthest along), and the slowed one is left behind. The simulation of Step 6 says so, with numbers.
- **`reached` says who an effect reaches:** the enemy that was hit (always first, and even if the list that it is given leaves it out), and every other that is on its feet and within the radius. An effect with no radius reaches one. It takes the list of enemies as an argument, and so has no game in it.
- **`strength` is the potency times how much an enemy is affected.** *Potency* is how strong the tower's effect is (a master's is 1.7 times a novice's), and *affected* is how much of it this kind of enemy takes. They are multiplied into how long a timed effect lasts and how far a push goes. An enemy that isn't affected at all takes none of it.
- **`describe` is what the panel says,** in words, for a potency: *Slows the crowd by half for 2.5 seconds*. It is in this file so that the words and the numbers are next to each other, and a test says that they agree.

Open `tests/effects.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the EFFECTS table", () => {
  QUnit.test("there is an effect for each nation, and each has a name, a color and a time", (assert) => {
    assert.deepEqual(Object.keys(EFFECTS).sort(), ["burn", "push", "slow", "stun"]);
    for (const [kind, effect] of Object.entries(EFFECTS)) {
      assert.true(effect.name.length > 0, kind);
      assert.true(/^#[0-9a-f]{6}$/i.test(effect.color), kind);
      assert.true(effect.seconds > 0, kind);
    }
  });

  QUnit.test("the four colors are different", (assert) => {
    assert.strictEqual(new Set(Object.values(EFFECTS).map((effect) => effect.color)).size, 4);
  });

  QUnit.test("a push slides back over a short time, and not in one frame and not for long", (assert) => {
    assert.true(EFFECTS.push.glide > 0.05 && EFFECTS.push.glide < 1);
  });

  QUnit.test("a slow is a share of the speed, between none and all", (assert) => {
    assert.true(EFFECTS.slow.speed > 0 && EFFECTS.slow.speed < 1);
  });

  QUnit.test("a stun is short, and it has to be waited out before another: or an enemy could be stunned for ever", (assert) => {
    assert.true(EFFECTS.stun.seconds < 1.5);
    assert.true(EFFECTS.stun.immune > 0);
  });

});

QUnit.module("reached", () => {
  const at = (x, z, alive = true) => ({ x, z, alive });

  QUnit.test("an effect with no radius reaches the enemy it hit, and nobody else", (assert) => {
    const hit = at(0, 0);

    assert.deepEqual(reached("stun", hit, [hit, at(0.1, 0)]), [hit]);
  });

  QUnit.test("one with a radius reaches the enemy and every other that is within it", (assert) => {
    const hit = at(0, 0);
    const near = at(1, 0);
    const far = at(EFFECTS.slow.radius + 0.5, 0);
    const result = reached("slow", hit, [far, hit, near]);

    assert.strictEqual(result[0], hit, "the enemy that was hit is first");
    assert.deepEqual(result, [hit, near]);
  });

  QUnit.test("one that is on the edge is reached, and one that has fallen is not", (assert) => {
    const hit = at(0, 0);
    const edge = at(0, EFFECTS.slow.radius);
    const fallen = at(0.2, 0, false);

    assert.deepEqual(reached("slow", hit, [hit, edge, fallen]), [hit, edge]);
  });

  QUnit.test("an enemy is reached even if the crowd that was given leaves it out", (assert) => {
    const hit = at(0, 0);

    assert.deepEqual(reached("slow", hit, []), [hit]);
  });

  QUnit.test("it is the slow that spreads, which is what a crowd needs: a tower that slows one enemy in a stream slows nothing", (assert) => {
    assert.true(EFFECTS.slow.radius > 0);
    for (const kind of ["burn", "stun", "push"]) assert.strictEqual(EFFECTS[kind].radius, 0, kind);
  });
});

QUnit.module("strength", () => {
  QUnit.test("is the potency times how much an enemy is affected", (assert) => {
    assert.strictEqual(strength(1.5, 0.4), 0.6000000000000001);
    assert.strictEqual(strength(2), 2, "an enemy that has nothing said takes it all");
  });

  QUnit.test("is never below nothing", (assert) => {
    assert.strictEqual(strength(-1, 1), 0);
    assert.strictEqual(strength(1, 0), 0);
  });
});

QUnit.module("describe", () => {
  QUnit.test("says what each effect does, for a potency", (assert) => {
    assert.strictEqual(describe("slow"), "Slows the crowd by half for 2.5 seconds");
    assert.strictEqual(describe("burn"), "Burns for 9 over 3 seconds");
    assert.strictEqual(describe("stun"), "Stuns for 1 second");
    assert.strictEqual(describe("push"), "Pushes back 3 along the road");
  });

  QUnit.test("and says more of it for a bigger potency", (assert) => {
    assert.strictEqual(describe("slow", 2), "Slows the crowd by half for 5 seconds");
    assert.strictEqual(describe("push", 2), "Pushes back 6 along the road");
  });

  QUnit.test("it has words for every effect", (assert) => {
    for (const kind of Object.keys(EFFECTS)) assert.true(describe(kind).length > 10, kind);
  });
});
```

- **"The four colors are different"** is the test to remember when you add a fifth effect: the player tells them apart by color and by shape.
- **"It is the slow that spreads, which is what a crowd needs"** is the test of the reason above. Change `radius` of the slow to `0` and it fails, and so does the one in Step 6 that plays the game.

**Check:** open `tests.html`. 680 tests pass.

---

## Step 2: Status

A status is what an enemy is under now: a list of effects, and how long each has to go. It knows nothing of the enemy, or of models or of the scene. It is put an effect on (`apply`), and let go by time (`update`), and it says what to do about it.

In `js/effects.js`, find the export block (lines 46 to 53) and **delete it**. Add this in its place, and the export block under it:

```js
class Status {
  constructor() {
    this.active = {}; // effect name -> { left: seconds to go }
    this.shield = 0; // seconds that it can't be stunned for
  }

  // Puts an effect on it, as strong as `amount` (the potency, with how much it is affected). It says what to do at once about
  // it: { applied, push }. `applied` is whether it took (a stun that is too soon after another, and an effect of no strength,
  // do not), and `push` is how far to throw it back, if it is a push.
  apply(kind, amount = 1) {
    const effect = EFFECTS[kind];
    if (amount <= 0 || !effect) return { applied: false, push: 0 };
    if (kind === "stun" && this.shield > 0) return { applied: false, push: 0 };
    const left = effect.seconds * amount;
    const now = this.active[kind];
    // A second of the same effect while it is on does not add to it: it makes it last as long as the longer.
    this.active[kind] = { left: now ? Math.max(now.left, left) : left };
    if (kind === "stun") this.shield = left + effect.immune;
    return { applied: true, push: kind === "push" ? effect.distance * amount : 0 };
  }

  // Which effects it is under now.
  get kinds() {
    return Object.keys(this.active);
  }

  has(kind) {
    return kind in this.active;
  }

  // Lets `dt` seconds go by. It says how to walk and how much it burned: { speed, burn }. `speed` is a share of its usual: nothing
  // while stunned, and a stun beats a slow. An effect is on for the whole of the step that it ends in (a step is a frame, and short). `burn` is the harm done in this time, and only for the time that was left to burn.
  update(dt) {
    this.shield = Math.max(0, this.shield - dt);
    let speed = 1;
    let burn = 0;
    for (const kind of this.kinds) {
      const { left } = this.active[kind];
      const used = Math.min(dt, left);
      if (kind === "slow") speed = Math.min(speed, EFFECTS.slow.speed);
      if (kind === "stun") speed = 0;
      if (kind === "burn") burn += EFFECTS.burn.damage * used;
      if (left - dt <= 0) delete this.active[kind];
      else this.active[kind].left = left - dt;
    }
    return { speed, burn };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EFFECTS, reached, strength, describe, Status };
} else {
  Object.assign(window, { EFFECTS, reached, strength, describe, Status });
}
```

Things to notice:

- **`apply` says what to do at once:** `{ applied, push }`. A push is the one effect that is an *act*, and not a time, so it says how far to go and the enemy does it. A stun that is too soon after another, an effect of no strength and an effect that isn't in the table say `applied: false`.
- **The same effect again does not add to itself.** It makes the one that is on last as long as the longer of the two. A tower that slows every second does not make an enemy walk at a quarter of its speed; it keeps it at a half.
- **`update` says how to walk and how much it burned:** `{ speed, burn }`. A stun is a speed of nothing, and beats a slow that is on at the same time. A burn is the damage a second times the time that was left, *and no more*: a burn that has a tenth of a second to go does a tenth of a second of harm in a step of a whole second.
- **An effect is on for the whole of the step it ends in.** A step is a frame, a fiftieth of a second, and so this is not worth being clever about; and the comment says so, so that nobody tries to test it with a step of ten seconds and is surprised.
- **A push is in the status only for its mark.** It does nothing in `update`; it is there so that the enemy can show that it was pushed, for half a second, in Step 5.

Then the walker, which already has a `speedScale` for exactly this (it was put there in the second tutorial, with a comment that a slowing spell would use it). A push needs one more thing, a way to throw it back, sliding, over a short time. The comment at the top says what the walker is for now:

In `js/walker.js`, **replace** lines 2 to 3:

```js
// scene, only of distance, speed and time, and that is what makes it easy to test. An enemy has one,
// and later a slowing spell will change its `speedScale`. See ../tests/walker.tests.js.
```

with:

```js
// scene, only of distance, speed and time, and that is what makes it easy to test. An enemy has one, and an
// effect changes its `speedScale` (a slow, a stun) or throws it back along the route. See ../tests/walker.tests.js.
```

It remembers how much of a push is left to slide, and how fast:

In `js/walker.js`, after line 10, add:

```js
    this.slide = 0; // how much further it is still to be thrown back: a push is a slide, and not a jump
    this.slideRate = 0; // how fast, in world units a second
```

and each step it walks on and slides back what it should (in `update`), and the method that a push calls (below it):

In `js/walker.js`, after line 17, add:

```js
    if (this.slide > 0) {
      const back = Math.min(this.slide, this.slideRate * dt);
      this.slide -= back;
      this.distance = Math.max(0, this.distance - back);
    }
  }

  // Throws it back along the route, by `distance`, sliding back over `seconds` (at once, if there are none). A second push while it is
  // sliding adds its distance to what is left, and the whole of it is slid in `seconds` from then. It can't be thrown back past the start.
  pushBack(distance, seconds = 0) {
    if (seconds <= 0) {
      this.distance = Math.max(0, this.distance - distance);
      return;
    }
    this.slide += distance;
    this.slideRate = this.slide / seconds;
```

- **A push is a slide, and not a jump.** The walker is told how far and over how long (`glide`, a third of a second), and each step it takes back its share of what is left, as well as walking on. An enemy that is hit by a push is seen to be knocked back, and the same push in one step or in a hundred gives the same distance. A second push while it is sliding adds to what is left.
- **It can't be pushed back past the start,** since there is nothing there. An enemy at the start of the road that is pushed stays at the start.

Open `tests/status.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("Status", () => {
  // Lets a status go by in steps of a fiftieth of a second, and adds up what it says.
  const run = (status, seconds) => {
    let burn = 0;
    let last = { speed: 1 };
    for (let t = 0; t < seconds - 1e-9; t += 0.02) {
      last = status.update(0.02);
      burn += last.burn;
    }
    return { burn, speed: last.speed };
  };

  QUnit.test("a status with nothing on it walks at the usual speed and burns nothing", (assert) => {
    const status = new Status();

    assert.deepEqual(status.update(1), { speed: 1, burn: 0 });
    assert.deepEqual(status.kinds, []);
  });

  QUnit.test("a slow makes it walk at the share the table says, for as long as the table says, and then it is over", (assert) => {
    const status = new Status();
    assert.true(status.apply("slow").applied);

    assert.strictEqual(status.update(0.02).speed, EFFECTS.slow.speed);
    assert.true(status.has("slow"));
    run(status, EFFECTS.slow.seconds + 0.1);
    assert.strictEqual(status.update(0.02).speed, 1);
    assert.false(status.has("slow"));
  });

  QUnit.test("a stun stops it, and beats a slow that is on it at the same time", (assert) => {
    const status = new Status();
    status.apply("slow");
    status.apply("stun");

    assert.strictEqual(status.update(0.02).speed, 0);
  });

  QUnit.test("a burn does its damage a second, for its time, and not a moment more", (assert) => {
    const status = new Status();
    status.apply("burn");
    const total = run(status, EFFECTS.burn.seconds + 1).burn;

    assert.true(Math.abs(total - EFFECTS.burn.damage * EFFECTS.burn.seconds) < 1e-6, `${total}`);
  });

  QUnit.test("a burn that runs out part of the way through a step only burns for what was left", (assert) => {
    const status = new Status();
    status.apply("burn");
    const burned = status.update(100).burn;

    assert.true(Math.abs(burned - EFFECTS.burn.damage * EFFECTS.burn.seconds) < 1e-9);
    assert.deepEqual(status.kinds, []);
  });

  QUnit.test("the same step in many parts or in one gives the same damage", (assert) => {
    const a = new Status();
    const b = new Status();
    a.apply("burn");
    b.apply("burn");

    assert.true(Math.abs(run(a, 2).burn - b.update(2).burn) < 1e-9);
  });

  QUnit.test("a stronger effect lasts longer, which is how a tower that is upgraded is better", (assert) => {
    const weak = new Status();
    const strong = new Status();
    weak.apply("slow", 1);
    strong.apply("slow", 2);
    run(weak, 3);
    run(strong, 3);

    assert.false(weak.has("slow"));
    assert.true(strong.has("slow"));
  });

  QUnit.test("the same effect again does not add to it: it lasts as long as the longer", (assert) => {
    const status = new Status();
    status.apply("slow", 1);
    run(status, 2);
    status.apply("slow", 1);
    run(status, 2);

    assert.true(status.has("slow"), "refreshed to its whole time, and not to double it");
    run(status, 1);
    assert.false(status.has("slow"));
  });

  QUnit.test("a shorter one does not make a longer one shorter", (assert) => {
    const status = new Status();
    status.apply("slow", 2);
    status.apply("slow", 0.5);
    run(status, 4);

    assert.true(status.has("slow"));
  });

  QUnit.test("a push is at once: it says how far, and leaves a mark for a moment and no more", (assert) => {
    const status = new Status();
    const result = status.apply("push");

    assert.deepEqual(result, { applied: true, push: EFFECTS.push.distance });
    assert.true(status.has("push"));
    assert.strictEqual(status.update(0.02).speed, 1, "it does not slow it");
    run(status, EFFECTS.push.seconds + 0.1);
    assert.false(status.has("push"));
  });

  QUnit.test("a push is as far as the strength says", (assert) => {
    assert.strictEqual(new Status().apply("push", 0.5).push, EFFECTS.push.distance * 0.5);
  });

  QUnit.test("an effect of no strength does nothing, and nothing is said to have taken", (assert) => {
    const status = new Status();

    assert.deepEqual(status.apply("slow", 0), { applied: false, push: 0 });
    assert.deepEqual(status.apply("stun", -1), { applied: false, push: 0 });
    assert.deepEqual(status.kinds, []);
  });

  QUnit.test("a name that isn't an effect does nothing", (assert) => {
    assert.false(new Status().apply("rust").applied);
  });

  QUnit.test("an enemy that has been stunned can't be again straight away, and can once it has had its time", (assert) => {
    const status = new Status();
    assert.true(status.apply("stun").applied);
    run(status, EFFECTS.stun.seconds + 0.1);
    assert.false(status.has("stun"), "it is up again");

    assert.false(status.apply("stun").applied, "but not stunned again");
    run(status, EFFECTS.stun.immune + 0.1);
    assert.true(status.apply("stun").applied, "until it has had its time");
  });

  QUnit.test("so a tower that stuns all the time still leaves an enemy most of its time moving", (assert) => {
    const status = new Status();
    let moving = 0;
    let total = 0;
    for (let t = 0; t < 60; t += 0.02) {
      status.apply("stun");
      if (status.update(0.02).speed > 0) moving++;
      total++;
    }

    assert.true(moving / total > 0.6, `${(moving / total).toFixed(2)} of the time`);
  });

  QUnit.test("the kinds it is under are in the order they were put on", (assert) => {
    const status = new Status();
    status.apply("burn");
    status.apply("slow");

    assert.deepEqual(status.kinds, ["burn", "slow"]);
  });
});
```

and the walker's tests:

In `tests/walker.tests.js`, after line 76, add:

```js
  QUnit.test("it can be thrown back along the route", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1, 5);
    walker.pushBack(2);

    assert.strictEqual(walker.distance, 3);
    walker.update(1);
    assert.strictEqual(walker.distance, 4, "and goes on from there");
  });

  QUnit.test("it can be thrown back over a time, and slides: it is not back at once, and is back when the time is up", (assert) => {
    const walker = new Walker(makeWalkRoute(), 0, 5);
    walker.pushBack(2, 0.5);

    assert.strictEqual(walker.distance, 5, "not at once");
    walker.update(0.25);
    assert.true(Math.abs(walker.distance - 4) < 1e-9, "half way after half the time");
    walker.update(0.25);
    assert.true(Math.abs(walker.distance - 3) < 1e-9);
    walker.update(1);
    assert.true(Math.abs(walker.distance - 3) < 1e-9, "and it stops there");
    assert.strictEqual(walker.slide, 0);
  });

  QUnit.test("a long step slides it the whole way and no further, and many short ones give the same", (assert) => {
    const a = new Walker(makeWalkRoute(), 0, 5);
    const b = new Walker(makeWalkRoute(), 0, 5);
    a.pushBack(2, 0.5);
    b.pushBack(2, 0.5);
    a.update(10);
    for (let i = 0; i < 100; i++) b.update(0.02);

    assert.true(Math.abs(a.distance - 3) < 1e-9 && Math.abs(b.distance - 3) < 1e-9);
  });

  QUnit.test("it walks on while it slides, and a push while sliding adds to the slide", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1, 5);
    walker.pushBack(1, 1);
    walker.update(0.5);
    assert.true(Math.abs(walker.distance - (5 + 0.5 - 0.5)) < 1e-9, "walking forward and sliding back");
    walker.pushBack(1, 1);
    assert.true(Math.abs(walker.slide - 1.5) < 1e-9);
    walker.update(1);
    assert.true(Math.abs(walker.distance - (5 + 1 - 1.5)) < 1e-9, "walking on, and sliding the rest of it back");
  });

  QUnit.test("a slide that would go past the start stops at the start", (assert) => {
    const walker = new Walker(makeWalkRoute(), 0, 1);
    walker.pushBack(10, 0.5);
    walker.update(1);

    assert.strictEqual(walker.distance, 0);
  });

  QUnit.test("but not back past the start", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1, 1);
    walker.pushBack(10);

    assert.strictEqual(walker.distance, 0);
    assert.false(walker.done);
  });

```

- **"A burn that runs out part of the way through a step only burns for what was left"** and **"the same step in many parts or in one gives the same damage"** are what make a burn something that a game can rely on, whatever its frame rate is.
- **"A stun ... still leaves an enemy most of its time moving"** is the reason for `immune`.

**Check:** open `tests.html`. 702 tests pass.

---

## Step 3: Enemies feel them

An enemy has a `Status`, and every frame it asks the status how to walk. A slowed enemy walks slower, and so its **feet have to keep up**: the clip is played slower by the same share, or the enemy skates. A stunned one stops where it is, and so does the clip. A burning one is hurt a little every frame, and can be defeated by it. A pushed one is thrown back along the road and put where it has got to *in that frame*.

First the table of enemies. It says how much of each effect a kind takes (`affected`), and an effect that isn't in it is taken in full:

In `js/enemies.js`, **replace** lines 9 to 15:

```js
// lives are lost if it gets to the end of the road.
const ENEMIES = {
  grunt: { name: "Masked Grunt", file: "enemies/grunt.glb", height: 1.5, speed: 1.6, clip: "Walking", health: 40, reward: 6, leak: 1 },
  scout: { name: "Scout Raider", file: "enemies/scout.glb", height: 1.35, speed: 3.0, clip: "Running", health: 26, reward: 6, leak: 1 },
  heavy: { name: "Heavy Trooper", file: "enemies/heavy.glb", height: 1.9, speed: 1.1, clip: "Walking", health: 140, reward: 14, leak: 2 },
  dai_li: { name: "Dai Li Agent", file: "enemies/dai_li.glb", height: 1.55, speed: 1.9, clip: "Walking", health: 70, reward: 9, leak: 1 },
  spirit: { name: "Corrupted Spirit", file: "enemies/spirit.glb", height: 1.8, speed: 1.3, clip: "Unsteady_Walk", health: 120, reward: 20, leak: 3 },
```

with:

```js
// lives are lost if it gets to the end of the road. `affected` is how much of each effect it takes (see effects.js):
// an effect that is not in it is taken in full, a number below one is an enemy that resists it, and a number above one is
// an enemy that it is hard on.
const ENEMIES = {
  grunt: { name: "Masked Grunt", file: "enemies/grunt.glb", height: 1.5, speed: 1.6, clip: "Walking", health: 40, reward: 6, leak: 1, affected: {} },
  scout: { name: "Scout Raider", file: "enemies/scout.glb", height: 1.35, speed: 3.0, clip: "Running", health: 26, reward: 6, leak: 1, affected: { slow: 0.6 } },
  heavy: { name: "Heavy Trooper", file: "enemies/heavy.glb", height: 1.9, speed: 1.1, clip: "Walking", health: 140, reward: 14, leak: 2, affected: { burn: 0.4, push: 0.3 } },
  dai_li: { name: "Dai Li Agent", file: "enemies/dai_li.glb", height: 1.55, speed: 1.9, clip: "Walking", health: 70, reward: 9, leak: 1, affected: { stun: 0.4, push: 0.6 } },
  spirit: { name: "Corrupted Spirit", file: "enemies/spirit.glb", height: 1.8, speed: 1.3, clip: "Unsteady_Walk", health: 120, reward: 20, leak: 3, affected: { burn: 1.5, push: 0.25 } },
```

- **They are not the same.** The heavy trooper is in armor, and takes 40 percent of a burn and 30 percent of a push. The Dai Li agent is trained in earthbending, and takes 40 percent of a stun. The scout is a fast runner and is hard to slow. And the corrupted spirit is *weak* to fire: it takes 150 percent of a burn, which is the one number above one in the table. A number above one is an enemy that an effect is hard on.

Then the enemy itself. It has a status, and works out how fast its clip plays when it walks at its own speed, once, since the clip speed will be changed every frame now:

In `js/enemies.js`, after line 74, add:

```js
    this.affected = spec.affected;
    this.status = new Status(); // which effects it is under
    this.clipSpeed = clipRatio(spec.speed, model.scale, spec.clip); // how fast its clip plays when it walks at its own speed
```

In `js/enemies.js`, **replace** line 93:

```js
    this.clip.start(true, clipRatio(spec.speed, model.scale, spec.clip));
```

with:

```js
    this.clip.start(true, this.clipSpeed);
```

and the frame:

In `js/enemies.js`, **replace** lines 97 to 98:

```js
  // Walks for `dt` seconds, and puts the enemy where it has got to. An enemy that is falling doesn't walk: it lies where
  // it fell, and then sinks into the ground.
```

with:

```js
  // Walks for `dt` seconds, as fast as the effects on it let it, and puts the enemy where it has got to. Its feet keep up (a slowed
  // enemy plays its clip slower, and a stunned one is stopped in its pose), and a burn hurts it. An enemy that is falling doesn't
  // walk: it lies where it fell, and then sinks into the ground.
```

In `js/enemies.js`, after line 106, add:

```js
    const { speed, burn } = this.status.update(dt);
    this.walker.speedScale = speed;
    this.clip.speedRatio = this.clipSpeed * speed;
```

In `js/enemies.js`, after line 113, add:

```js
    if (burn > 0) this.hurt(burn);
```

- **The status says what to do, and the enemy does it.** `speed` goes to the walker (its distance) and to the clip (its feet) by the same amount, and a speed of nothing is a clip that is stopped in its pose.
- **The burn is applied after the walking,** and `hurt` is the same `hurt` that a bolt uses. So an enemy that is burned to nothing falls, plays its death, is paid for by `settle` as any other, and the burn needs no special case anywhere else.

Then the way in, for a bolt (or for anything else) to put an effect on:

In `js/enemies.js`, after line 144, add:

```js
  // Puts an effect on it, as strong as `potency` says and as much as this kind of enemy takes of it. A push throws it back
  // along the road (it slides back, quickly). An enemy that has fallen takes nothing. It says whether the effect took.
  afflict(kind, potency = 1) {
    if (!this.alive) return false;
    const result = this.status.apply(kind, strength(potency, this.affected[kind] ?? 1));
    if (result.push > 0) this.walker.pushBack(result.push, EFFECTS.push.glide);
    return result.applied;
  }

```

- **`afflict` says whether it took,** and an enemy that has fallen takes nothing: a bolt that arrives after the enemy has fallen puts nothing on a body.
- **A push tells the walker to slide back,** over `glide` seconds, and the walker does it in the steps of the next few frames. The enemy is not moved here at all: it is seen to be knocked back, along the road, round corners and all, because the road is what the walker walks along.

The tests of the enemies are a block at the end, with real models:

In `tests/enemies.tests.js`, after line 315, add:

```js

  QUnit.test("every enemy says how much of each effect it takes, and an effect it doesn't mention it takes in full", (assert) => {
    for (const [kind, spec] of Object.entries(ENEMIES)) {
      assert.true(typeof spec.affected === "object", kind);
      for (const [effect, share] of Object.entries(spec.affected)) assert.true(effect in EFFECTS && share >= 0, `${kind} ${effect}`);
    }
  });

  QUnit.test("some resist, and some are weak: the heavy trooper is hard to burn and to push, and the spirit burns easily", (assert) => {
    assert.true(ENEMIES.heavy.affected.burn < 1 && ENEMIES.heavy.affected.push < 1);
    assert.true(ENEMIES.spirit.affected.burn > 1);
    assert.deepEqual(ENEMIES.grunt.affected, {}, "and the grunt is the plain one");
  });

  QUnit.test("an enemy begins under no effect, and walks at its own speed", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "plain");

    assert.deepEqual(enemy.status.kinds, []);
    enemy.update(1);
    assert.true(Math.abs(enemy.walker.distance - ENEMIES.grunt.speed) < 1e-9);
    enemy.dispose();
  });

  QUnit.test("a slow makes it walk slower, and its feet keep up: the clip is played slower by the same share", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "slowed");
    const clipAtFullSpeed = enemy.clip.speedRatio;
    enemy.afflict("slow");
    enemy.update(1);

    assert.true(Math.abs(enemy.walker.distance - ENEMIES.grunt.speed * EFFECTS.slow.speed) < 1e-9);
    assert.true(Math.abs(enemy.clip.speedRatio - clipAtFullSpeed * EFFECTS.slow.speed) < 1e-9);
    enemy.dispose();
  });

  QUnit.test("when the slow is over it goes at its own speed again, and its clip too", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "recovers");
    const clipAtFullSpeed = enemy.clip.speedRatio;
    enemy.afflict("slow");
    enemy.update(EFFECTS.slow.seconds + 0.5);
    const before = enemy.walker.distance;
    enemy.update(1);

    assert.true(Math.abs(enemy.walker.distance - before - ENEMIES.grunt.speed) < 1e-9);
    assert.strictEqual(enemy.clip.speedRatio, clipAtFullSpeed);
    enemy.dispose();
  });

  QUnit.test("a stun stops it where it is, and the clip with it", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "stunned");
    enemy.update(1);
    const before = enemy.walker.distance;
    enemy.afflict("stun");
    enemy.update(0.3);

    assert.strictEqual(enemy.walker.distance, before);
    assert.strictEqual(enemy.clip.speedRatio, 0);
    enemy.update(1);
    enemy.update(1);
    assert.true(enemy.walker.distance > before, "and it goes on afterwards");
    enemy.dispose();
  });

  QUnit.test("a burn hurts it a little every moment, and it can be defeated by it, and is paid for as it is by a bolt", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "burning");
    enemy.afflict("burn");
    enemy.update(1);

    assert.true(Math.abs(enemy.health - (enemy.maxHealth - EFFECTS.burn.damage)) < 1e-9);
    for (let i = 0; i < 30 && enemy.alive; i++) {
      enemy.afflict("burn");
      enemy.update(1);
    }
    assert.true(enemy.dead, "burned to nothing");
    assert.strictEqual(enemy.health, 0);
    enemy.dispose();
  });

  QUnit.test("a push throws it back along the road: it slides, and does not jump, and is back by the time the glide is over", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "pushed");
    for (let i = 0; i < 20; i++) enemy.update(0.5);
    enemy.status.apply("stun", 100); // so that it does not walk while it is pushed, and the slide is all that there is to see
    enemy.update(0.01);
    const before = { distance: enemy.walker.distance, x: enemy.x, z: enemy.z };
    enemy.afflict("push");

    assert.strictEqual(enemy.walker.distance, before.distance, "not at once");
    enemy.update(EFFECTS.push.glide / 2);
    const half = enemy.walker.distance;
    assert.true(half < before.distance && half > before.distance - EFFECTS.push.distance, "half way back after half the time");
    enemy.update(EFFECTS.push.glide);
    assert.true(Math.abs(enemy.walker.distance - (before.distance - EFFECTS.push.distance)) < 1e-9);
    assert.true(Math.hypot(enemy.x - before.x, enemy.z - before.z) > 0.5, "and it has moved on the board");
    enemy.dispose();
  });

  QUnit.test("it takes as much of an effect as the table says: a push moves a heavy trooper less than a grunt", (assert) => {
    const grunt = new Enemy(scene, loaded, "grunt", route, "push grunt");
    const heavy = new Enemy(scene, loaded, "heavy", route, "push heavy");
    grunt.walker.distance = 10;
    heavy.walker.distance = 10;
    grunt.afflict("push");
    heavy.afflict("push");

    assert.true(Math.abs(grunt.walker.slide - EFFECTS.push.distance) < 1e-9);
    assert.true(Math.abs(heavy.walker.slide - EFFECTS.push.distance * ENEMIES.heavy.affected.push) < 1e-9);
    grunt.dispose();
    heavy.dispose();
  });

  QUnit.test("a bigger potency is a bigger effect", (assert) => {
    const a = new Enemy(scene, loaded, "grunt", route, "potent a");
    const b = new Enemy(scene, loaded, "grunt", route, "potent b");
    a.walker.distance = 10;
    b.walker.distance = 10;
    a.afflict("push", 1);
    b.afflict("push", 2);

    assert.true(Math.abs(b.walker.slide - a.walker.slide - EFFECTS.push.distance) < 1e-9);
    a.dispose();
    b.dispose();
  });

  QUnit.test("afflict says whether it took: an enemy that is immune takes nothing, and an enemy that has fallen takes nothing", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "takes");

    assert.true(enemy.afflict("slow"));
    enemy.affected = { slow: 0 };
    assert.false(enemy.afflict("slow"), "affected not at all");
    enemy.hurt(1000);
    assert.false(enemy.afflict("burn"), "fallen");
    assert.false(enemy.status.has("burn"));
    enemy.dispose();
  });

  QUnit.test("an enemy that is stunned is not walking: a fallen one is not stunned and does not move in its death", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "falls");
    enemy.afflict("burn");
    enemy.hurt(1000);
    const at = enemy.walker.distance;
    enemy.update(1);

    assert.strictEqual(enemy.walker.distance, at);
    enemy.dispose();
  });
```

- **"A slow makes it walk slower, and its feet keep up"** tests both numbers: the distance, and the speed of the clip.
- **"A stun stops it where it is, and the clip with it"** also says it goes on afterwards.
- **"A push ... slides, and does not jump"** stuns the enemy first, so that all there is to see is the slide: not back at once, part of the way back after half the glide, and all of the way back when it is over.
- **"A burn ... can be defeated by it"** burns a scout every second until it has fallen, and checks that its health is nothing and not below nothing.
- **"It takes as much of an effect as the table says"** pushes a grunt and a heavy trooper from the same place and measures how far each went.

**Check:** open `tests.html`. 714 tests pass.

---

## Step 4: Bolts carry them

An effect gets from a bender to an enemy the way that harm does: the table says it, the brain says it when it fires, the tower puts it in the shot, and the bolt does it when it arrives. Every one of those is a line.

The benders. Each has an effect, named in the comment on the table and in its row:

In `js/benders.js`, **replace** line 13:

```js
// throw. `cost` is what a podium for them costs, in gold, and `damage` is how much harm one hit does. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
```

with:

```js
// throw. `effect` is what a hit does besides harm (see effects.js). `cost` is what a podium for them costs, in gold, and `damage` is how much harm one hit does. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
```

In `js/benders.js`, after line 27, add:

```js
    effect: "push",
```

In `js/benders.js`, after line 40, add:

```js
    effect: "slow",
```

In `js/benders.js`, after line 53, add:

```js
    effect: "stun",
```

In `js/benders.js`, after line 66, add:

```js
    effect: "burn",
```

The levels. A tower that has been upgraded has a more potent effect (a master slows for 1.7 times as long, and throws an enemy back 1.7 times as far), and `statsFor` puts it in the row it makes. Nothing else of levels changes:

In `js/upgrades.js`, **replace** lines 9 to 13:

```js
// each thing there is at the level as at the first.
const LEVELS = [
  { name: "Novice", cost: 0, damage: 1, range: 1, tempo: 1 },
  { name: "Adept", cost: 0.6, damage: 1.4, range: 1.1, tempo: 1.2 },
  { name: "Master", cost: 0.9, damage: 2, range: 1.2, tempo: 1.45 },
```

with:

```js
// each thing there is at the level as at the first. `potency` is how much stronger its effect is (see effects.js).
const LEVELS = [
  { name: "Novice", cost: 0, damage: 1, range: 1, tempo: 1, potency: 1 },
  { name: "Adept", cost: 0.6, damage: 1.4, range: 1.1, tempo: 1.2, potency: 1.3 },
  { name: "Master", cost: 0.9, damage: 2, range: 1.2, tempo: 1.45, potency: 1.7 },
```

In `js/upgrades.js`, after line 29, add:

```js
    potency: row.potency,
```

The brain says what a hit does when it fires, and the tower puts it in the shot:

In `js/brain.js`, **replace** lines 75 to 76:

```js
  // { type: "start", enemy }, { type: "fire", enemy, x, z, hit, damage } and { type: "end" }. `hit` is which of the
  // attack's hits it is, counting from 0, and `damage` is the harm that hit does.
```

with:

```js
  // { type: "start", enemy }, { type: "fire", enemy, x, z, hit, damage, effect, potency } and { type: "end" }. `hit` is which of the
  // attack's hits it is, counting from 0, `damage` is the harm that hit does, and `effect` and `potency` what else it does and how strongly.
```

In `js/brain.js`, **replace** line 91:

```js
        events.push({ type: "fire", enemy: this.lock.enemy, x: this.lock.x, z: this.lock.z, hit: this.fired, damage: this.spec.damage });
```

with:

```js
        events.push({ type: "fire", enemy: this.lock.enemy, x: this.lock.x, z: this.lock.z, hit: this.fired, damage: this.spec.damage, effect: this.spec.effect || null, potency: this.spec.potency || 1 });
```

In `js/tower.js`, **replace** line 136:

```js
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color, damage }. A hit of an attack is a shot.
```

with:

```js
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color, damage, effect, potency }. A hit of an attack is a shot.
```

In `js/tower.js`, **replace** line 144:

```js
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(event.hit), color: this.spec.color, damage: event.damage });
```

with:

```js
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(event.hit), color: this.spec.color, damage: event.damage, effect: event.effect, potency: event.potency });
```

- **`effect` is `null` for a bender that has none,** and `potency` is 1. A brain that is given a plain row (the brain's own tests give it one) does not need to have an effect.

And the bolt, which does the effect when it arrives, in the moment that it does its harm:

In `js/bolts.js`, **replace** lines 2 to 3:

```js
// following it as it walks, and is gone when it gets there, and when it gets there it does its damage. (The
// effect of each nation comes in a later tutorial.) See ../tests/bolts.tests.js.
```

with:

```js
// following it as it walks, and is gone when it gets there, and when it gets there it does its damage and puts its
// effect on it (a slow, a burn, a stun or a push). See ../tests/bolts.tests.js.
```

In `js/bolts.js`, **replace** lines 24 to 27:

```js
  // `from` is where it is thrown from, `enemy` who it is thrown at, `color` its color, and `damage` the harm it does.
  constructor(scene, from, enemy, color, damage = 0) {
    this.enemy = enemy;
    this.damage = damage;
```

with:

```js
  // `from` is where it is thrown from, `enemy` who it is thrown at, `color` its color, and `damage` the harm it does. `effect` is
  // the name of what else it does (or null) and `potency` how strong that is. `crowd()` gives the enemies there are, for an effect that
  // reaches more than the one that is hit.
  constructor(scene, from, enemy, color, damage = 0, effect = null, potency = 1, crowd = () => []) {
    this.enemy = enemy;
    this.damage = damage;
    this.effect = effect;
    this.potency = potency;
    this.crowd = crowd;
```

In `js/bolts.js`, **replace** lines 57 to 58:

```js
    // It does its damage once, when it gets there, to an enemy that is still on its feet.
    if (arrivedNow && !this.arrived) this.killed = this.enemy.hurt ? this.enemy.hurt(this.damage) : false;
```

with:

```js
    // It does its damage once, when it gets there, to an enemy that is still on its feet, and puts its effect on it.
    if (arrivedNow && !this.arrived) {
      this.killed = this.enemy.hurt ? this.enemy.hurt(this.damage) : false;
      if (this.effect && this.enemy.afflict) for (const other of reached(this.effect, this.enemy, this.crowd())) other.afflict(this.effect, this.potency);
    }
```

- **`crowd` is a function, and not a list.** The bolt is made when a tower fires and lives for half a second, and the enemies come and go in that time. A function that is asked *when the bolt arrives* gets the enemies that there are then. The default says there are none, and `reached` always includes the enemy that was hit.
- **The harm comes before the effect,** and an enemy that the bolt defeated takes none (it has fallen).

And the game gives the bolt its crowd:

In `js/main.js`, **replace** line 129:

```js
    shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage),
```

with:

```js
    shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage, shot.effect, shot.potency, () => world.enemies),
```

The tests. The table: every nation has an effect, and none of them have the same:

In `tests/benders.tests.js`, after line 40, add:

```js
  QUnit.test("every bender has an effect, from the table of effects, and no two have the same", (assert) => {
    const kinds = Object.values(BENDERS).map((spec) => spec.effect);

    assert.true(kinds.every((kind) => kind in EFFECTS));
    assert.strictEqual(new Set(kinds).size, 4);
  });

```

The levels:

In `tests/upgrades.tests.js`, **replace** line 8:

```js
    assert.deepEqual(LEVELS[0], { name: "Novice", cost: 0, damage: 1, range: 1, tempo: 1 });
```

with:

```js
    assert.deepEqual(LEVELS[0], { name: "Novice", cost: 0, damage: 1, range: 1, tempo: 1, potency: 1 });
```

In `tests/upgrades.tests.js`, **replace** line 13:

```js
      for (const key of ["cost", "damage", "range", "tempo"]) assert.true(LEVELS[i][key] > LEVELS[i - 1][key], `${LEVELS[i].name} ${key}`);
```

with:

```js
      for (const key of ["cost", "damage", "range", "tempo", "potency"]) assert.true(LEVELS[i][key] > LEVELS[i - 1][key], `${LEVELS[i].name} ${key}`);
```

In `tests/upgrades.tests.js`, after line 30, add:

```js
      assert.strictEqual(stats.potency, 1, kind);
```

In `tests/upgrades.tests.js`, after line 34, add:

```js
  QUnit.test("at a higher level its effect is more potent, by the row of the table", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      assert.strictEqual(statsFor(spec, 2).potency, LEVELS[1].potency, kind);
      assert.strictEqual(statsFor(spec, 3).potency, LEVELS[2].potency, kind);
      assert.strictEqual(statsFor(spec, 3).effect, spec.effect, `${kind}: and it is the same effect`);
    }
  });

```

The brain, with a module of its own at the end:

In `tests/brain.tests.js`, after line 400, add:

```js

QUnit.module("what an attack does besides harm", () => {
  const enemy = { x: 0, z: 3, progress: 0.5, done: false };
  const fires = (spec) => {
    const brain = new TowerBrain(spec, { x: 0, z: 0 });
    brain.yaw = 0;
    const events = [];
    for (let i = 0; i < 100; i++) events.push(...brain.update(0.02, [enemy]));
    return events.filter((event) => event.type === "fire");
  };
  const base = { range: 5, cooldown: 2, damage: 4, attack: { seconds: 1, speed: 1, aim: 0, hits: [{ at: 0.5 }] } };

  QUnit.test("a fire says what effect it has, and how potent", (assert) => {
    const [fire] = fires({ ...base, effect: "slow", potency: 1.3 });

    assert.strictEqual(fire.effect, "slow");
    assert.strictEqual(fire.potency, 1.3);
  });

  QUnit.test("a bender with none says none, and a potency of one", (assert) => {
    const [fire] = fires(base);

    assert.strictEqual(fire.effect, null);
    assert.strictEqual(fire.potency, 1);
  });

  QUnit.test("every bender of the table has one, and every hit of an attack has it", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const hits = fires(spec);

      assert.true(hits.length >= 1, kind);
      assert.true(hits.every((fire) => fire.effect === spec.effect), kind);
    }
  });
});
```

The tower, at the end of the tests of its level:

In `tests/tower.tests.js`, after line 447, add:

```js

  QUnit.test("a shot says what effect it has, and how potent: for every nation, and more for a tower that has been upgraded", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `effect ${kind}`);
      const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
      const first = [];
      for (let i = 0; i < 200 && first.length === 0; i++) first.push(...tower.update(0.02, [enemy]));
      assert.strictEqual(first[0].effect, spec.effect, kind);
      assert.strictEqual(first[0].potency, 1, kind);
      for (let i = 0; i < 400; i++) tower.update(0.02, []);

      tower.setLevel(3);
      const later = [];
      for (let i = 0; i < 400 && later.length === 0; i++) later.push(...tower.update(0.02, [enemy]));
      assert.strictEqual(later[0].effect, spec.effect, kind);
      assert.strictEqual(later[0].potency, LEVELS[2].potency, `${kind}: a master is more potent`);
      tower.dispose();
    }
  });
```

The bolt, with a stand-in enemy that says what was put on it:

In `tests/bolts.tests.js`, after line 184, add:

```js

  // An enemy that says what was put on it.
  const afflicted = (x = 3) => ({
    x,
    z: 0,
    aimHeight: 1,
    put: [],
    hurt() {
      return false;
    },
    afflict(kind, potency) {
      this.put.push([kind, potency]);
    },
  });

  QUnit.test("it puts its effect on the enemy when it gets there, once, as strong as it was thrown", (assert) => {
    const enemy = afflicted();
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#38b6ff", 5, "slow", 1.3);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.put, [["slow", 1.3]]);
  });

  QUnit.test("and not on the way", (assert) => {
    const enemy = afflicted(30);
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#38b6ff", 5, "slow");
    for (let i = 0; i < 20; i++) bolt.update(0.02);

    assert.false(bolt.arrived);
    assert.deepEqual(enemy.put, []);
  });

  QUnit.test("a bolt with no effect puts none on, and a potency of one is the usual", (assert) => {
    const enemy = afflicted();
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff", 5);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.put, []);
    assert.strictEqual(bolt.potency, 1);
    assert.strictEqual(bolt.effect, null);
  });

  QUnit.test("an enemy that can't be afflicted (a stand-in with only a position) is still hit, and nothing breaks", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, { x: 3, z: 0, aimHeight: 1 }, "#ffffff", 5, "burn");
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.true(bolt.done);
  });

  QUnit.test("an effect with a radius reaches the others near the enemy it hit, and not the ones that are far", (assert) => {
    const near = afflicted(3.5);
    const far = afflicted(30);
    near.alive = true;
    far.alive = true;
    const enemy = afflicted(3);
    enemy.alive = true;
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#38b6ff", 5, "slow", 1, () => [enemy, near, far]);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.put, [["slow", 1]]);
    assert.deepEqual(near.put, [["slow", 1]]);
    assert.deepEqual(far.put, []);
  });

  QUnit.test("an effect with none reaches only the one it hit, whoever is near", (assert) => {
    const near = afflicted(3.1);
    near.alive = true;
    const enemy = afflicted(3);
    enemy.alive = true;
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#e8c33a", 5, "stun", 1, () => [enemy, near]);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.put, [["stun", 1]]);
    assert.deepEqual(near.put, []);
  });
```

And the whole of it, in the tests of a game, with real towers, enemies and bolts. The game's own bolt is given its crowd, and every nation's effect is seen on an enemy at some time in two minutes of play:

In `tests/battle.tests.js`, **replace** line 126:

```js
      shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage),
```

with:

```js
      shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage, shot.effect, shot.potency, () => world.enemies),
```

In `tests/battle.tests.js`, after line 208, add:

```js

  QUnit.test("every nation's effect gets to the enemies, through the whole of a game: the tower, the bolt, and the enemy", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const { world } = makeWorld([{ kind, col: 6, row: 2 }, { kind, col: 8, row: 2 }], 1000);
      const seen = new Set();
      for (let t = 0; t < 120 && !world.director.over; t += 0.05) {
        advance(world, 0.05);
        world.enemies.forEach((enemy) => enemy.status.kinds.forEach((effect) => seen.add(effect)));
      }

      assert.true(seen.has(spec.effect), `${kind}: ${[...seen].join(", ") || "no effect"}`);
      world.towers.forEach((tower) => tower.dispose());
      world.enemies.forEach((enemy) => enemy.dispose());
      world.bolts.forEach((bolt) => bolt.dispose());
    }
  });

  QUnit.test("a slow gets to a crowd: more than the enemy that was hit is slowed", (assert) => {
    const { world } = makeWorld([{ kind: "water", col: 6, row: 2 }], 1000);
    let most = 0;
    for (let t = 0; t < 120 && !world.director.over; t += 0.05) {
      advance(world, 0.05);
      most = Math.max(most, world.enemies.filter((enemy) => enemy.status.has("slow")).length);
    }

    assert.true(most >= 2, `at most ${most} slowed at once`);
    world.towers.forEach((tower) => tower.dispose());
    world.enemies.forEach((enemy) => enemy.dispose());
    world.bolts.forEach((bolt) => bolt.dispose());
  });
```

- **"A slow gets to a crowd: more than the enemy that was hit is slowed"** counts the enemies that are slowed at once, and says it is two or more.

**Check:** open `tests.html`. 728 tests pass.

---

## Step 5: Seeing them

A player has to be able to see what a tower did. Two things say it: a **mark** over the head of an enemy for each effect that is on it, and a line on the **panel** that says what the tower's effect is.

### The marks

A mark is a flat square over the head, that always faces the camera, with a shape on it in the color of the effect. The shapes are drawn, not loaded: on a canvas, in white, and the white is the *see-through-ness* of the mark, and the color is the material's (the same idea as the outline and the range ring of the Build tutorial). Open `js/marks.js` (the placeholder) and replace its contents with:

```js
// The marks of an enemy: a small picture over its head for every effect that is on it (the sign of the nation that does it: waves for a slow, a flame for a
// burn, a diamond for a stun, a swirl of wind for a push), in the color of the effect, so that a player can see what a tower did.
// Each is a flat square that always faces the camera. The pictures are made once for the whole scene, and shared by every
// enemy; an enemy only has a square for each, shown or hidden. See ../tests/marks.tests.js.

const MARKS = {
  size: 0.5, // how big a mark is, in world units
  gap: 0.06, // the space between two
  above: 0.3, // how far over the top of the head the middle of a mark is
  texture: 128, // how many pixels across a picture is
};

// Draws the shape of an effect on a canvas, in white, in a square of `size` pixels: it is the see-through-ness of a mark, and its
// color is the material's.
function drawMark(context, kind, size) {
  const c = size / 2;
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = size * 0.09;
  context.beginPath();
  if (kind === "slow") {
    // Water: three wavy lines, one under another.
    for (let row = 0; row < 3; row++) {
      const y = size * (0.26 + row * 0.24);
      for (let i = 0; i <= 30; i++) {
        const x = size * (0.1 + 0.8 * (i / 30));
        const wave = y + Math.sin((i / 30) * Math.PI * 4 + row) * size * 0.07;
        if (i === 0) context.moveTo(x, wave);
        else context.lineTo(x, wave);
      }
    }
    context.stroke();
  } else if (kind === "burn") {
    // Fire: a flame with a tail that curls over at the top, and a smaller flame cut out of the middle.
    const flame = (scale, lift) => {
      const x = (v) => c + (v - 0.5) * size * scale;
      const y = (v) => size * (0.5 + (v - 0.5) * scale + lift);
      context.beginPath();
      context.moveTo(x(0.5), y(0.95));
      context.bezierCurveTo(x(0.18), y(0.95), x(0.12), y(0.62), x(0.3), y(0.42));
      context.bezierCurveTo(x(0.3), y(0.56), x(0.4), y(0.6), x(0.44), y(0.56));
      context.bezierCurveTo(x(0.4), y(0.34), x(0.5), y(0.18), x(0.72), y(0.06));
      context.bezierCurveTo(x(0.66), y(0.2), x(0.78), y(0.26), x(0.8), y(0.4));
      context.bezierCurveTo(x(0.92), y(0.62), x(0.82), y(0.95), x(0.5), y(0.95));
      context.closePath();
    };
    flame(1, 0);
    context.fill();
    context.globalCompositeOperation = "destination-out";
    flame(0.45, 0.2);
    context.fill();
    context.globalCompositeOperation = "source-over";
  } else if (kind === "stun") {
    // Earth: a diamond (a square stood on its corner), with a smaller diamond cut out of it and a solid one in the middle.
    const diamond = (radius) => {
      context.beginPath();
      context.moveTo(c, c - radius);
      context.lineTo(c + radius, c);
      context.lineTo(c, c + radius);
      context.lineTo(c - radius, c);
      context.closePath();
    };
    diamond(size * 0.46);
    context.fill();
    context.globalCompositeOperation = "destination-out";
    diamond(size * 0.3);
    context.fill();
    context.globalCompositeOperation = "source-over";
    diamond(size * 0.14);
    context.fill();
  } else {
    // A swirl of wind: a spiral that winds in from the outside, and flicks out at the end like a gust.
    const turns = 2.5;
    for (let i = 0; i <= 60; i++) {
      const angle = (i / 60) * turns * 2 * Math.PI;
      const radius = size * (0.06 + 0.3 * (1 - i / 60));
      const x = c + Math.cos(angle) * radius * 1.1 - size * 0.04;
      const y = c + Math.sin(angle) * radius * 1.1;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    // The tail: from where the spiral starts on the outside, out to the side.
    context.beginPath();
    const startX = c + Math.cos(0) * size * 0.36 * 1.1 - size * 0.04;
    context.moveTo(startX, c);
    context.bezierCurveTo(startX + size * 0.08, c + size * 0.12, startX + size * 0.12, c + size * 0.26, startX - size * 0.04, c + size * 0.34);
    context.stroke();
  }
}

// Where each of `count` marks goes along a row, as a distance to the right of the middle of the row: the row is centered.
function marksLayout(count, size = MARKS.size, gap = MARKS.gap) {
  const step = size + gap;
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * step);
}

// The materials of the marks, one for each effect, made the first time a scene needs them and kept for every enemy in it.
const kits = new WeakMap();
function marksKit(scene) {
  if (kits.has(scene)) return kits.get(scene);
  const kit = {};
  for (const [kind, effect] of Object.entries(EFFECTS)) {
    const texture = new BABYLON.DynamicTexture(`mark ${kind}`, { width: MARKS.texture, height: MARKS.texture }, scene, true);
    texture.hasAlpha = true;
    drawMark(texture.getContext(), kind, MARKS.texture);
    texture.update();
    const material = new BABYLON.StandardMaterial(`mark ${kind}`, scene);
    material.disableLighting = true;
    material.diffuseColor = BABYLON.Color3.Black();
    material.emissiveColor = BABYLON.Color3.FromHexString(effect.color);
    material.opacityTexture = texture;
    material.backFaceCulling = false;
    kit[kind] = material;
  }
  kits.set(scene, kit);
  return kit;
}

class StatusMarks {
  // `parent` is the node of the enemy, and `height` how tall the enemy is.
  constructor(scene, parent, height, name = "marks") {
    const kit = marksKit(scene);
    this.node = new BABYLON.TransformNode(`${name} marks`, scene);
    this.node.parent = parent;
    this.node.position.y = height + MARKS.above;
    this.squares = {};
    for (const kind of Object.keys(EFFECTS)) {
      const square = BABYLON.MeshBuilder.CreatePlane(`${name} mark ${kind}`, { size: MARKS.size }, scene);
      square.parent = this.node;
      square.material = kit[kind];
      square.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      square.isPickable = false;
      square.setEnabled(false);
      this.squares[kind] = square;
    }
  }

  // Shows a square for each of the effects in the list, in a row, and hides the rest.
  show(kinds) {
    const places = marksLayout(kinds.length);
    for (const [kind, square] of Object.entries(this.squares)) {
      const at = kinds.indexOf(kind);
      square.setEnabled(at >= 0);
      if (at >= 0) square.position.x = places[at];
    }
  }

  get shown() {
    return Object.keys(this.squares).filter((kind) => this.squares[kind].isEnabled());
  }

  // The squares go with the enemy's node; the materials are shared, and stay.
  dispose() {
    this.node.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARKS, drawMark, marksLayout, marksKit, StatusMarks };
} else {
  Object.assign(window, { MARKS, drawMark, marksLayout, marksKit, StatusMarks });
}
```

Things to notice:

- **`drawMark` is a function of a canvas,** so that a test can give it a real one, and see what it drew.
- **The pictures and their materials are made once for the whole scene** (`marksKit`, which is kept in a `WeakMap` with the scene as its key), and every enemy's squares share them. A hundred enemies make four materials and four textures, and not four hundred. A test counts the scene's materials.
- **An enemy has a square for every effect,** and only shows the ones that are on it. The squares are made when the enemy is; making a mesh when an effect is put on would be a hitch in a frame, in the middle of a fight.
- **`marksLayout` is the row they stand in:** side by side, centered over the head, with a gap. Four of them are less than a cell and a bit wide.
- **The materials are shared, and so they are not disposed with an enemy:** the squares go with its node, and the materials stay for the next.

Open `tests/marks.tests.js` (the placeholder) and replace its contents with:

```js
QUnit.module("drawMark", () => {
  const SIZE = 64;
  // What a mark of an effect draws: the alpha of every pixel of a canvas.
  const alphas = (kind) => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    drawMark(context, kind, SIZE);
    const data = context.getImageData(0, 0, SIZE, SIZE).data;
    return Array.from({ length: SIZE * SIZE }, (_, i) => data[i * 4 + 3]);
  };

  QUnit.test("each effect draws something, and not all of the square", (assert) => {
    for (const kind of Object.keys(EFFECTS)) {
      const covered = alphas(kind).filter((a) => a > 128).length / (SIZE * SIZE);

      assert.true(covered > 0.05 && covered < 0.7, `${kind}: ${covered.toFixed(2)}`);
    }
  });

  QUnit.test("each is a different shape", (assert) => {
    const shapes = Object.keys(EFFECTS).map((kind) => alphas(kind).join());

    assert.strictEqual(new Set(shapes).size, 4);
  });

  QUnit.test("each stays inside its square: the edge is clear", (assert) => {
    for (const kind of Object.keys(EFFECTS)) {
      const a = alphas(kind);
      let edge = 0;
      for (let i = 0; i < SIZE; i++) edge += a[i] + a[(SIZE - 1) * SIZE + i] + a[i * SIZE] + a[i * SIZE + SIZE - 1];

      assert.strictEqual(edge, 0, kind);
    }
  });

  QUnit.test("it is drawn white, so that the material can make it any color", (assert) => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    drawMark(context, "stun", SIZE);
    const pixel = context.getImageData(SIZE / 2, SIZE / 2, 1, 1).data;

    assert.deepEqual([pixel[0], pixel[1], pixel[2]], [255, 255, 255]);
  });
});

QUnit.module("marksLayout", () => {
  QUnit.test("none is none, and one is in the middle", (assert) => {
    assert.deepEqual(marksLayout(0), []);
    assert.deepEqual(marksLayout(1), [0]);
  });

  QUnit.test("they are in a row, a mark and a gap apart, with the row centered", (assert) => {
    const places = marksLayout(3, 1, 0.5);

    assert.deepEqual(places, [-1.5, 0, 1.5]);
    assert.true(Math.abs(marksLayout(4).reduce((sum, x) => sum + x, 0)) < 1e-9);
  });

  QUnit.test("four of them, which is all there are, fit over an enemy that is a cell wide", (assert) => {
    const places = marksLayout(Object.keys(EFFECTS).length);
    const width = places[places.length - 1] - places[0] + MARKS.size;

    assert.true(width < BOARD.cell * 1.2, `${width.toFixed(2)}`);
  });
});

QUnit.module("StatusMarks", (hooks) => {
  let engine, scene, node;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    node = new BABYLON.TransformNode("enemy", scene);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("there is a square for each effect, and none is shown to begin with", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);

    assert.strictEqual(Object.keys(marks.squares).length, 4);
    assert.deepEqual(marks.shown, []);
  });

  QUnit.test("they hang over the head: the height of the enemy and a little more", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);

    assert.strictEqual(marks.node.parent, node);
    assert.strictEqual(marks.node.position.y, 1.5 + MARKS.above);
  });

  QUnit.test("show shows the ones in the list, side by side, and hides the rest", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);
    marks.show(["burn", "stun"]);

    assert.deepEqual(marks.shown.sort(), ["burn", "stun"]);
    assert.true(marks.squares.burn.position.x < marks.squares.stun.position.x, "in the order of the list");
    marks.show(["stun"]);
    assert.deepEqual(marks.shown, ["stun"]);
    assert.strictEqual(marks.squares.stun.position.x, 0);
  });

  QUnit.test("a square always faces the camera, and is the color of its effect", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);

    for (const [kind, square] of Object.entries(marks.squares)) {
      assert.strictEqual(square.billboardMode, BABYLON.Mesh.BILLBOARDMODE_ALL, kind);
      assert.strictEqual(square.material.emissiveColor.toHexString().toLowerCase(), EFFECTS[kind].color, kind);
    }
  });

  QUnit.test("every enemy shares the same four materials, so another enemy makes no more", (assert) => {
    new StatusMarks(scene, node, 1.5, "a");
    const materials = scene.materials.length;
    new StatusMarks(scene, new BABYLON.TransformNode("other", scene), 1.5, "b");

    assert.strictEqual(scene.materials.length, materials);
    assert.strictEqual(materials, 4);
  });

  QUnit.test("taking the marks away takes the squares and leaves the materials for the next", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);
    const meshes = scene.meshes.length;
    marks.dispose();

    assert.strictEqual(scene.meshes.length, meshes - 4);
    assert.strictEqual(scene.materials.length, 4);
  });
});
```

- **"Each stays inside its square: the edge is clear"** is a pixel test: it draws the mark on a real canvas and says that nothing touches the edge, so that a mark can't be cut off by the edge of its picture.

### The enemy shows them

The enemy shows its marks, and shows none when it has fallen. It makes them with its node:

In `js/enemies.js`, after line 85, add:

```js
    this.marks = new StatusMarks(scene, this.node, spec.height, name); // a picture over its head for each effect on it
```

and has a method to show them:

In `js/enemies.js`, after line 183, add:

```js
  // Shows a mark over its head for every effect that is on it, and none for an enemy that has fallen.
  showMarks() {
    this.marks.show(this.alive ? this.status.kinds : []);
  }

```

The frame of the game asks every enemy to show its marks, after it has walked:

In `js/battle.js`, **replace** line 44:

```js
  world.enemies.forEach((enemy) => enemy.update(dt));
```

with:

```js
  world.enemies.forEach((enemy) => {
    enemy.update(dt);
    enemy.showMarks();
  });
```

- **It is the frame of the game that shows them, and not the enemy's own `update`,** so that the enemy's `update` (the part that is the same in every test of walking, and in the simulation) does not change. This is the same split as the one between the brain and the tower.

And the tests: the height of an enemy is measured without the marks that hang over it, and the new tests that say that a mark shows, and goes:

In `tests/enemies.tests.js`, **replace** line 61:

```js
  // The box that holds everything a node holds, in the world.
```

with:

```js
  // The box that holds everything a node holds, in the world, but not the marks that hang over its head (which are not the enemy).
```

In `tests/enemies.tests.js`, **replace** line 65:

```js
    return node.getHierarchyBoundingVectors(true);
```

with:

```js
    return node.getHierarchyBoundingVectors(true, (mesh) => !mesh.name.includes(" mark "));
```

In `tests/enemies.tests.js`, after line 185, add:

```js
  QUnit.test("an effect shows as a mark over its head, and goes when the effect does", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "marked");
    assert.deepEqual(enemy.marks.shown, []);
    enemy.afflict("slow");
    enemy.afflict("burn");
    enemy.update(0.1);
    enemy.showMarks();

    assert.deepEqual(enemy.marks.shown.sort(), ["burn", "slow"]);
    enemy.update(EFFECTS.slow.seconds + 1);
    enemy.showMarks();
    assert.deepEqual(enemy.marks.shown, [], "both are over");
    enemy.dispose();
  });

  QUnit.test("a fallen enemy shows no marks, and the marks go with it", (assert) => {
    const meshes = scene.meshes.length;
    const enemy = new Enemy(scene, loaded, "grunt", route, "marks gone");
    enemy.afflict("stun");
    enemy.update(0.1);
    enemy.showMarks();
    assert.deepEqual(enemy.marks.shown, ["stun"]);
    enemy.hurt(1000);
    enemy.showMarks();

    assert.deepEqual(enemy.marks.shown, []);
    enemy.dispose();
    assert.strictEqual(scene.meshes.length, meshes);
  });

```

### The panel says what it is

The panel has a line for the effect, and the hand fills it in from the table of effects (`describe`), with the potency of the tower, so that a tower that has been upgraded says more:

In `js/panel.js`, **replace** line 21:

```js
  // `parts` is { panel, title, level, upgrade, sell }: the elements of the page that this fills in.
```

with:

```js
  // `parts` is { panel, title, level, effect, upgrade, sell }: the elements of the page that this fills in.
```

In `js/panel.js`, **replace** lines 46 to 50:

```js
  // Shows a tower: { name, color, level, total, levelName, nextName, cost, refund, gold }. `nextName` and `cost` are null for a
  // tower that is as good as it gets, and then there is no button to upgrade it. An upgrade that costs more than there is
  // looks greyed out (it still works, and says why not when it is tried).
  show({ name, color, level, total, levelName, nextName, cost, refund, gold }) {
    const { panel, title, level: levelLine, upgrade, sell } = this.parts;
```

with:

```js
  // Shows a tower: { name, color, level, total, levelName, effect, nextName, cost, refund, gold }. `effect` is what its hits do besides harm, in words. `nextName` and `cost` are null for a
  // tower that is as good as it gets, and then there is no button to upgrade it. An upgrade that costs more than there is
  // looks greyed out (it still works, and says why not when it is tried).
  show({ name, color, level, total, levelName, effect, nextName, cost, refund, gold }) {
    const { panel, title, level: levelLine, effect: effectLine, upgrade, sell } = this.parts;
```

In `js/panel.js`, after line 54, add:

```js
    this.write(effectLine, effect);
```

In `js/hand.js`, after line 105, add:

```js
      effect: describe(base.effect, tower.spec.potency || 1),
```

In `js/main.js`, after line 77, add:

```js
    effect: document.getElementById("panel-effect"),
```

and its style:

In `css/panel.css`, after line 31, add:

```css
#panel-effect {
  font: 700 14px / 1.2 var(--small-font);
  color: var(--banner-dark);
}
```

In `css/panel.css`, after line 73, add:

```css
  #panel-level,
  #panel-effect {
    font-size: 12px;
  }
```

And the tests of the panel and of the hand, which are given the line:

In `tests/panel.tests.js`, after line 22, add:

```js
      effect: document.createElement("div"),
```

In `tests/panel.tests.js`, **replace** line 28:

```js
    parts.panel.append(parts.title, parts.level, parts.upgrade, parts.sell);
```

with:

```js
    parts.panel.append(parts.title, parts.level, parts.effect, parts.upgrade, parts.sell);
```

In `tests/panel.tests.js`, **replace** line 33:

```js
  const earth = { name: "Earth Kingdom", color: "#b08a4a", level: 1, total: 3, levelName: "Novice", nextName: "Adept", cost: 90, refund: 105, gold: 400 };
```

with:

```js
  const earth = { name: "Earth Kingdom", color: "#b08a4a", level: 1, total: 3, levelName: "Novice", effect: "Stuns for 1 second", nextName: "Adept", cost: 90, refund: 105, gold: 400 };
```

In `tests/panel.tests.js`, after line 47, add:

```js
    assert.strictEqual(parts.effect.textContent, "Stuns for 1 second");
```

In `tests/hand.tests.js`, after line 15, add:

```js
      effect: document.createElement("div"),
```

In `tests/hand.tests.js`, **replace** line 21:

```js
    card.panel.append(card.title, card.level, card.upgrade, card.sell);
```

with:

```js
    card.panel.append(card.title, card.level, card.effect, card.upgrade, card.sell);
```

In `tests/hand.tests.js`, after line 363, add:

```js
    assert.strictEqual(parts.card.effect.textContent, "Stuns for 1 second");
```

In `tests/hand.tests.js`, after line 449, add:

```js
    assert.strictEqual(parts.card.effect.textContent, describe("stun", LEVELS[1].potency), "and the effect is more potent");
```

**Check:** open `tests.html`. 743 tests pass. Then open `index.html`, build a podium of each nation along the road, and start a wave. A tower of water puts blue waves over a crowd, a tower of fire an orange flame, earth a yellow diamond for a moment, and air a swirl of wind as an enemy is thrown back. Tap a tower: the panel says what it does.

---

## Step 6: A harder game

The effects made the game easier, and the simulation says so. Teach it about them, and see.

Its enemy needs a status and what it is affected by, and to be burned, slowed and pushed by what a tower does, exactly as the enemy of the game is:

In `tests/balance.tests.js`, **replace** line 15:

```js
      this.walker = new Walker(route, spec.speed);
```

with:

```js
      this.paid = false;
      this.walker = new Walker(route, spec.speed);
      this.affected = spec.affected;
      this.status = new Status();
```

In `tests/balance.tests.js`, **replace** lines 30 to 31:

```js
      this.walker.update(dt);
      this.sync();
```

with:

```js
      const { speed, burn } = this.status.update(dt);
      this.walker.speedScale = speed;
      this.walker.update(dt);
      this.sync();
      if (burn > 0) this.hurt(burn);
    }

    afflict(kind, potency) {
      if (!this.alive) return;
      const result = this.status.apply(kind, strength(potency, this.affected[kind] ?? 1));
      if (result.push > 0) this.walker.pushBack(result.push, EFFECTS.push.glide);
```

and a shot in the air says what it does besides harm, and does it when it arrives, to the crowd that it reaches:

In `tests/balance.tests.js`, **replace** line 76:

```js
    let shots = []; // bolts in the air: when they arrive, at whom, and how hard
```

with:

```js
    let shots = []; // bolts in the air: when they arrive, at whom, how hard, and what else they do
```

In `tests/balance.tests.js`, **replace** line 85:

```js
          if (event.type === "fire") shots.push({ at: time + distanceBetween(brain, event) / BOLT.speed, foe: event.enemy, damage: brain.spec.damage });
```

with:

```js
          if (event.type === "fire") shots.push({ at: time + distanceBetween(brain, event) / BOLT.speed, foe: event.enemy, damage: event.damage, effect: event.effect, potency: event.potency });
```

In `tests/balance.tests.js`, **replace** line 90:

```js
        if (shot.foe.hurt(shot.damage)) gold += shot.foe.reward;
```

with:

```js
        shot.foe.hurt(shot.damage);
        if (shot.effect) for (const other of reached(shot.effect, shot.foe, foes)) other.afflict(shot.effect, shot.potency);
```

In `tests/balance.tests.js`, after line 94, add:

```js
        if (foe.dead && !foe.paid) {
          foe.paid = true;
          gold += foe.reward;
        }
      }
      for (const foe of foes) {
```

Now the test that says each effect is worth having. For every nation, a defense of that kind only is played against the same waves with its effect and then without it (the effect is taken off the table for a moment), and the lives lost are added up over a game, on both maps:

In `tests/balance.tests.js`, after line 255, add:

```js
  QUnit.test("each nation's effect earns its keep: a defense of its kind loses fewer lives with it than the same defense without, over a game", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const effect = BENDERS[kind].effect;
      let withEffect = 0;
      let without = 0;
      for (const map of MAPS) {
        const grid = parseMap(map);
        const route = routeFor(grid);
        for (const index of [1, 3, 5, 7, 9]) {
          const defense = buy(grid, route, goldBefore(index) * 0.7, [kind]);
          withEffect += fight(route, defense, index).lost;
          BENDERS[kind].effect = null;
          without += fight(route, defense, index).lost;
          BENDERS[kind].effect = effect;
        }
      }

      assert.true(withEffect < without, `${kind}: ${without} lives lost without ${effect}, and ${withEffect} with it`);
    }
  });

```

- **This is the test that told us about the radius of the slow.** With a slow that touched one enemy, the water nation lost *more* lives with its effect than without it, and the test failed: a slowed enemy was passed by the one behind it, and the tower turned to the new leader. With a radius, the crowd is slowed and the tower has time. Numbers like these are what a simulation is *for*: nobody could have said it by looking at the table.
- **And the numbers of the table were chosen with it:** a push of three (it began at 1.4, and was no use), a stun of a second.

With the effects in, a player that is a good one loses no lives at all, and the test that says *an upgrade is worth its gold* has nothing to count. The game is too easy. Each wave is tougher than the one before by a share of what the table says, and that share goes from 12 percent to 20:

In `js/waves.js`, **replace** line 20:

```js
const WAVE_TOUGHER = 0.12; // each wave is this much tougher (as a share of what the table says) than the one before it
```

with:

```js
const WAVE_TOUGHER = 0.2; // each wave is this much tougher (as a share of what the table says) than the one before it
```

- **It is one number, and the simulation says what it should be.** At 12 percent a perfect player lost nothing, and at 28 percent even the best defense lost eleven of the twenty lives on the second map; 20 percent is the one at which a defense that only buys podiums loses lives, one that upgrades loses fewer, and the best defense loses none.

**Check:** open `tests.html`. 744 tests pass.

---

## Step 7: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **Watch a crowd slowed.** Build a podium of water where the road bends, and watch a stream of enemies bunch up inside its ring.
- **A burn that kills.** Build fire, and watch an enemy that has been hit by it fall without being hit again.
- **A spirit and a fire nation.** The corrupted spirit takes half as much again of a burn. Change `spirit.affected.burn` to `0` in `ENEMIES`: nothing burns it, and the game's tests don't mind.
- **A slow with no radius.** Change `radius` of the slow to `0`. The test in Step 1 and the one in Step 6 fail, and say why.
- **A long push.** Change `distance` of the push to `10` and build air near the start: enemies that are hit walk the same stretch of road again and again.
- **A stun for ever.** Change `immune` of the stun to `0`. An enemy that is stunned every time is never allowed to move, and the test that says it is moving most of the time fails.
- **A new effect.** Add a row to `EFFECTS` (a `fear`, an enemy that turns round), a bender that has it, and a `case` in `Status`. The marks need a shape in `drawMark`.

---

## Troubleshooting

- **The splash never goes and the console says `Status is not defined`, `reached is not defined` or `StatusMarks is not defined`:** the new file is missing from `index.html`, or has no export block, or the name is missing from it.
- **`Cannot read properties of undefined (reading 'kinds')`:** an enemy has no status: `this.status = new Status()` is not in the constructor of `Enemy`, or a stand-in enemy of a test does not have one.
- **An enemy that is slowed skates:** the clip is not played slower by the same share. `this.clip.speedRatio` has to be `this.clipSpeed * speed`, every frame.
- **A slow only slows one enemy:** `radius` is `0` in the table, or the bolt is not given `crowd`, so that `reached` has no list.
- **A push does nothing:** `afflict` does not call `pushBack`, or `strength` is nothing for that kind of enemy (check `affected`).
- **A mark is always on, or never:** `showMarks` is not called each frame, or `advance` does not call it. The marks follow `status.kinds`.
- **The panel says `undefined` where the effect should be:** the page has no `panel-effect` element, or `main.js` does not give it to the panel.
- **The game is too easy to lose:** `WAVE_TOUGHER` is still `0.12`.

---

## What you have

Towers that do something: four effects in a table, a status that is put on an enemy and runs out, enemies that feel it in their feet, bolts that carry it, marks that show it, and a panel that says it, behind a test suite of 744 tests and a simulation that says that every nation's effect is worth having.

**Next up:** screens. The next tutorial gives the game a **start screen** with a choice of map, a **pause**, and a **win and lose screen** that says how you did.
