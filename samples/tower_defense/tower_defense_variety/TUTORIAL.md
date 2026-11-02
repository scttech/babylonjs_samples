# Tutorial: Tower Defense Variety -- Upgrades, and a Combo That Hits Six Times

This is the seventh tutorial in the Tower Defense series. Every tower so far is one podium and one throw: the fire nation's bender punches six times in a row, and one bolt comes out. This tutorial makes the towers **different from each other, and better over time**. An attack becomes a list of **hits**, so that every punch of the fire nation's combo throws a flame of its own, and a tower gets **levels**: tap a tower, and a panel comes up to **upgrade** it (more harm, more reach, faster) or **sell** it. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Attacks with several hits**: a table that says *when* in the clip each hit is and *where* the hand is, a brain that fires every one of them, and a tower that throws each from the right hand
- **Levels**: a table of three, the numbers worked out from it for any bender at any level, and the price of each, as a share of the podium's
- **A tower that has a level**: rings on the ground round the podium, an attack that is played faster, and an upgrade that never cuts off an attack that has begun
- **Paying**: two small rules, one to upgrade and one to sell, that say *why not* in a sentence
- **A panel**: tap a tower and its range ring and a card come up; the card has an upgrade button and a sell button
- A simulation that plays the whole game with upgrades, and says that **an upgrade is worth its gold**
- Unit tests for all of it: **665 passing tests**, 74 of them new, including tests that **load the real models and measure them**

**What you'll learn:** how to change what a table row *means* (one hit, to a list of them) and carry the change through the code that reads it, how to **measure** several moments in an animation, how a level can be a *row of numbers multiplied into another row* so that nothing that reads the row has to know about levels, how to change something that is in the middle of an attack without cutting it off, how to pick a standing character on a screen when it is taller than its cell, and how to keep a simulation honest as the rules grow.

**Before you start:** do the [Scenery tutorial](../tower_defense_scenery/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Scenery sample, plus placeholders for the new files:

```
tower_defense_variety/
├── index.html, tests.html   (already list the new scripts, and the page has the panel in it)
├── css/
│   └── panel.css             (placeholder -- Step 5)
├── js/
│   ├── upgrades.js           (placeholder -- Steps 2 and 4)
│   ├── panel.js              (placeholder -- Step 5)
│   ├── benders.js, brain.js  (change -- Step 1)
│   ├── tower.js              (changes -- Steps 1 and 3)
│   ├── economy.js            (a change -- Step 2)
│   ├── hand.js, main.js      (change -- Step 5)
│   └── everything else, from the Scenery sample
└── tests/
    ├── upgrades.tests.js     (placeholder -- Step 2)
    ├── paying.tests.js       (placeholder -- Step 4)
    ├── panel.tests.js        (placeholder -- Step 5)
    ├── benders, brain, tower, hand and balance tests   (additions and changes)
    └── everything else, from the Scenery sample
```

Open `tests.html` before you change anything, through the web server. You should see **591 passing tests**, the Scenery sample's.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_variety/` (the command prints the exact address), or use the *Live Server* extension in VS Code. `?map=1` is the second map.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Hits**: an attack that throws more than once.
2. **Levels**: a table, and the numbers worked out from it.
3. **A tower with a level**: rings, and a faster attack.
4. **Paying**: upgrading and selling.
5. **Choosing a tower**: the panel.
6. **Is it still a game?** The simulation with upgrades.

---

## Step 1: Hits

The fire nation's bender throws one flame for a combo of six punches. The attack in the `BENDERS` table has one moment in it: `hitAt`, how far through the clip the hand is out, and `muzzle`, where. Six punches need six of each, so an attack becomes a **list of hits**, and an air bender's attack is a list with one.

That is a change to what a row of a table *means*, and the way to make one is to change the table, then everything that reads it, and let the tests say what you missed. Start with the table. The comment on the table says what the numbers are, so it changes first:

In `js/benders.js`, **replace** line 13:

```js
// throw. `cost` is what a podium for them costs, in gold, and `damage` is how much harm one of their attacks does. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
```

with:

```js
// throw. `cost` is what a podium for them costs, in gold, and `damage` is how much harm one hit does. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
```

In `js/benders.js`, **replace** lines 18 to 20:

```js
// than that it is played, `hitAt` how far through it (from 0 to 1) the hand is out furthest, `aim` which
// way the attack points (in radians, 0 is straight ahead), and `muzzle` where the hand is at that moment, in
// meters from the bender's feet, for a bender that is not scaled.
```

with:

```js
// than that it is played, `aim` which way the attack points (in radians, 0 is straight ahead), and `hits`
// the moments in it that something is thrown. An attack has one hit, or, for a combo of punches, one for
// each punch. A hit is `at`, how far through the clip (from 0 to 1) the hand is out furthest, and `muzzle`,
// where the hand is at that moment, in meters from the bender's feet, for a bender that is not scaled.
```

Then the three attacks that have one hit each. Each loses its `hitAt` and its `muzzle` (they are inside `hits` now) and keeps the same numbers:

In `js/benders.js`, **replace** line 33:

```js
    attack: { clip: "mage_soell_cast_3", seconds: 3.333, speed: 2.2, hitAt: 0.3, aim: -0.06, muzzle: { x: -0.04, y: 1.03, z: 0.61 } },
```

with:

```js
    attack: { clip: "mage_soell_cast_3", seconds: 3.333, speed: 2.2, aim: -0.06, hits: [{ at: 0.3, muzzle: { x: -0.04, y: 1.03, z: 0.61 } }] },
```

In `js/benders.js`, **replace** line 45:

```js
    attack: { clip: "mage_soell_cast_4", seconds: 2.2, speed: 1.6, hitAt: 0.108, aim: -0.07, muzzle: { x: -0.04, y: 1.16, z: 0.55 } },
```

with:

```js
    attack: { clip: "mage_soell_cast_4", seconds: 2.2, speed: 1.6, aim: -0.07, hits: [{ at: 0.108, muzzle: { x: -0.04, y: 1.16, z: 0.55 } }] },
```

In `js/benders.js`, **replace** line 57:

```js
    attack: { clip: "Left_Jab_from_Guard", seconds: 1.733, speed: 1.3, hitAt: 0.308, aim: 0.27, muzzle: { x: 0.17, y: 1.31, z: 0.85 } },
```

with:

```js
    attack: { clip: "Left_Jab_from_Guard", seconds: 1.733, speed: 1.3, aim: 0.27, hits: [{ at: 0.308, muzzle: { x: 0.17, y: 1.31, z: 0.85 } }] },
```

And the fire nation, which is the point of it. Its damage was 17 for one throw; it is **3.2 a hit** now, since there are six hits, which makes a combo 19.2 (a little more than before):

In `js/benders.js`, **replace** line 65:

```js
    damage: 17,
```

with:

```js
    damage: 3.2,
```

In `js/benders.js`, **replace** line 69:

```js
    attack: { clip: "Punch_Combo_5", seconds: 3.833, speed: 2.6, hitAt: 0.208, aim: -0.11, muzzle: { x: -0.08, y: 1.26, z: 0.67 } },
```

with:

```js
    // A combo of six punches, and a flame thrown with each one.
    attack: {
      clip: "Punch_Combo_5",
      seconds: 3.833,
      speed: 2.6,
      aim: 0.25,
      hits: [
        { at: 0.208, muzzle: { x: -0.08, y: 1.27, z: 0.67 } },
        { at: 0.367, muzzle: { x: 0.16, y: 1.43, z: 0.65 } },
        { at: 0.458, muzzle: { x: 0.2, y: 1.41, z: 0.6 } },
        { at: 0.525, muzzle: { x: 0.18, y: 1.25, z: 0.68 } },
        { at: 0.6, muzzle: { x: 0.19, y: 1.29, z: 0.63 } },
        { at: 0.663, muzzle: { x: 0.18, y: 0.93, z: 0.66 } },
      ],
    },
```

- **Where six numbers like these come from: the clip, measured.** The same test that measured `hitAt` and `muzzle` plays the clip a frame at a time and watches the hands. Each punch is a moment at which one hand is as far out as it goes, and the table's numbers are those moments (as a share of the clip), and where that hand was. They alternate: left, right, left, right, left, right. You will see the test say so in a moment, for every hit.
- **`aim` is for the whole attack, and it is the average of the hits.** The first punch points a little left of the target and the rest a little right, so the body turns to the middle of them: 0.25 radians. A bender whose attack has one hit has the same `aim` as before.
- **A hit is small, and an attack is as much harm as it was.** That is what the new tests say about the fire nation: a hit is less than an air bender's, and six of them are more than an air bender's one and less than the earth's.

Now the brain. It said an attack had *a* moment when the hand was out, and a `fired` that was true or false. It has a list of moments now, and a `fired` that is **how many have fired**:

In `js/brain.js`, **replace** lines 2 to 3:

```js
// waits for its cooldown, and starts an attack; some way into the attack (when the hand is out
// furthest) it *fires*; and when the attack is over it goes back to waiting. It says what happens as
```

with:

```js
// waits for its cooldown, and starts an attack; at each moment of the attack when the hand is out
// furthest (one, or one for each punch of a combo) it *fires*; and when the attack is over it goes back to waiting. It says what happens as
```

In `js/brain.js`, **replace** line 39:

```js
// How long an attack lasts, in seconds, once it is played at its speed, and how long after it starts the hand is out.
```

with:

```js
// How long an attack lasts, in seconds, once it is played at its speed, and how long after it starts the hand is out for
// its hits, the first, and the others by their number.
```

In `js/brain.js`, **replace** lines 44 to 45:

```js
function hitTime(attack) {
  return attack.hitAt * attackDuration(attack);
```

with:

```js
function hitTime(attack, index = 0) {
  return attack.hits[index].at * attackDuration(attack);
```

In `js/brain.js`, **replace** line 61:

```js
    this.fired = false; // whether this attack has fired yet
```

with:

```js
    this.fired = 0; // how many of this attack's hits have fired
```

In `js/brain.js`, **replace** line 74:

```js
  // { type: "start", enemy }, { type: "fire", enemy, x, z } and { type: "end" }.
```

with:

```js
  // { type: "start", enemy }, { type: "fire", enemy, x, z, hit, damage } and { type: "end" }. `hit` is which of the
  // attack's hits it is, counting from 0, and `damage` is the harm that hit does.
```

In `js/brain.js`, **replace** lines 88 to 90:

```js
      if (!this.fired && this.attackTime >= hitTime(this.spec.attack)) {
        this.fired = true;
        events.push({ type: "fire", enemy: this.lock.enemy, x: this.lock.x, z: this.lock.z });
```

with:

```js
      // Every hit whose time has come fires, in order (a long step can bring more than one).
      while (this.fired < this.spec.attack.hits.length && this.attackTime >= hitTime(this.spec.attack, this.fired)) {
        events.push({ type: "fire", enemy: this.lock.enemy, x: this.lock.x, z: this.lock.z, hit: this.fired, damage: this.spec.damage });
        this.fired++;
```

In `js/brain.js`, **replace** line 109:

```js
        this.fired = false;
```

with:

```js
        this.fired = 0;
```

- **`hitTime(attack, index)`** is how long after the attack starts the hand is out for hit number `index`. The first, if it isn't said, so that every caller that asked for *the* hit time asks for the first.
- **A `while`, not an `if`.** Every hit whose time has come fires, in order. In the game a frame is a fiftieth of a second, and the punches of a combo are about a tenth of a second apart, so an `if` would do; but the brain doesn't know that. It is told how long a step was, and a step could be anything, and an `if` would lose the hits that a long step went past. The tests say so with a step of five seconds.
- **A fire says which hit it is, and how much harm it does.** `hit` is the index (the tower needs it to find the hand), and `damage` is what *this* hit does. Putting the damage in the event, and not leaving the tower to read it from the table, is what lets the next step make the damage depend on a level without the tower (or the simulation, which also listens to the events) knowing.

Now the tower. It asks for a muzzle by hit, and a shot is the damage the event says:

In `js/tower.js`, **replace** lines 93 to 95:

```js
  // Where the hand is now, if it fired now.
  muzzle() {
    return muzzleAt(this.at, this.top, this.brain.yaw, this.spec.attack.muzzle, this.scale);
```

with:

```js
  // Where the hand is now, if it fired now with one of the attack's hits (the first, unless it is said).
  muzzle(hit = 0) {
    return muzzleAt(this.at, this.top, this.brain.yaw, this.spec.attack.hits[hit].muzzle, this.scale);
```

In `js/tower.js`, **replace** line 99:

```js
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color, damage }.
```

with:

```js
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color, damage }. A hit of an attack is a shot.
```

In `js/tower.js`, **replace** line 106:

```js
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(), color: this.spec.color, damage: this.spec.damage });
```

with:

```js
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(event.hit), color: this.spec.color, damage: event.damage });
```

The tests. First the table's: an attack has hits, they are inside the clip and in order, the fire nation has six and the others one, and the clip is measured for every hit, not only the first:

In `tests/benders.tests.js`, **replace** line 15:

```js
      assert.true(spec.attack.hitAt > 0 && spec.attack.hitAt < 1, kind);
```

with:

```js
      assert.true(spec.attack.hits.length >= 1, kind);
```

In `tests/benders.tests.js`, after line 18, add:

```js
  QUnit.test("every hit is at a moment inside the attack, in order, with a place for the hand", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      spec.attack.hits.forEach((hit, i) => {
        assert.true(hit.at > 0 && hit.at < 1, `${kind} hit ${i}`);
        assert.true(i === 0 || hit.at > spec.attack.hits[i - 1].at, `${kind} hit ${i} is after the one before`);
        assert.true(["x", "y", "z"].every((axis) => Number.isFinite(hit.muzzle[axis])), `${kind} hit ${i}`);
      });
    }
  });

  QUnit.test("the fire nation's combo is a punch for every hit: it has more hits than any other attack", (assert) => {
    assert.strictEqual(BENDERS.fire.attack.hits.length, 6);
    for (const kind of ["air", "water", "earth"]) assert.strictEqual(BENDERS[kind].attack.hits.length, 1, kind);
  });

  QUnit.test("so that a hit of the fire nation is small, and a combo is about as much harm as the others do in one go", (assert) => {
    const harm = (kind) => BENDERS[kind].damage * BENDERS[kind].attack.hits.length;

    assert.true(BENDERS.fire.damage < BENDERS.air.damage);
    assert.true(harm("fire") > BENDERS.air.damage && harm("fire") < BENDERS.earth.damage);
  });

```

In `tests/benders.tests.js`, **replace** line 265:

```js
  QUnit.test("at hitAt the hand is out nearly as far as it ever goes in the clip", (assert) => {
```

with:

```js
  QUnit.test("at each hit the hand is out nearly as far as it ever goes in the clip", (assert) => {
```

In `tests/benders.tests.js`, **replace** lines 269 to 271:

```js
      const atHit = rows[Math.round(spec.attack.hitAt * 120)];

      assert.true(atHit.reach >= 0.9 * best, `${kind}: ${atHit.reach.toFixed(2)} of ${best.toFixed(2)}`);
```

with:

```js
      spec.attack.hits.forEach((hit, i) => {
        const atHit = rows[Math.round(hit.at * 120)];

        assert.true(atHit.reach >= 0.9 * best, `${kind} hit ${i}: ${atHit.reach.toFixed(2)} of ${best.toFixed(2)}`);
      });
```

In `tests/benders.tests.js`, **replace** lines 277 to 281:

```js
  QUnit.test("and the clip points the way the table says it does", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const atHit = sample(kind)[Math.round(spec.attack.hitAt * 120)];

      assert.true(Math.abs(Math.atan2(atHit.dx, atHit.dz) - spec.attack.aim) < 0.06, `${kind}: ${Math.atan2(atHit.dx, atHit.dz).toFixed(2)} against ${spec.attack.aim}`);
```

with:

```js
  QUnit.test("and the clip points, on average, the way the table says it does", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const rows = sample(kind);
      const aims = spec.attack.hits.map((hit) => Math.atan2(rows[Math.round(hit.at * 120)].dx, rows[Math.round(hit.at * 120)].dz));
      const mean = aims.reduce((sum, aim) => sum + aim, 0) / aims.length;

      assert.true(Math.abs(mean - spec.attack.aim) < 0.06, `${kind}: ${mean.toFixed(2)} against ${spec.attack.aim}`);
```

In `tests/benders.tests.js`, **replace** lines 287 to 292:

```js
  QUnit.test("and the hand is where the table says the muzzle is", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const atHit = sample(kind)[Math.round(spec.attack.hitAt * 120)];
      const m = spec.attack.muzzle;

      assert.true(Math.hypot(atHit.x - m.x, atHit.y - m.y, atHit.z - m.z) < 0.1, `${kind}: ${atHit.x.toFixed(2)}, ${atHit.y.toFixed(2)}, ${atHit.z.toFixed(2)}`);
```

with:

```js
  QUnit.test("and the hand is where the table says the muzzle is, at every hit", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const rows = sample(kind);
      spec.attack.hits.forEach((hit, i) => {
        const atHit = rows[Math.round(hit.at * 120)];
        const m = hit.muzzle;

        assert.true(Math.hypot(atHit.x - m.x, atHit.y - m.y, atHit.z - m.z) < 0.1, `${kind} hit ${i}: ${atHit.x.toFixed(2)}, ${atHit.y.toFixed(2)}, ${atHit.z.toFixed(2)}`);
      });
```

- **"At each hit the hand is out nearly as far as it ever goes"** and **"the hand is where the table says the muzzle is, at every hit"** are the tests that check your numbers against the animation. If you mistype one by a little, they say which hit and how far off.

Then the brain's:

In `tests/brain.tests.js`, **replace** lines 69 to 76:

```js
    const attack = { seconds: 3, speed: 2, hitAt: 0.4 };

    assert.strictEqual(attackDuration(attack), 1.5);
    assert.true(Math.abs(hitTime(attack) - 0.6) < 1e-12);
  });

  QUnit.test("for every bender, the hand is out before the attack is over", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(hitTime(spec.attack) < attackDuration(spec.attack), kind);
```

with:

```js
    const attack = { seconds: 3, speed: 2, hits: [{ at: 0.4 }, { at: 0.8 }] };

    assert.strictEqual(attackDuration(attack), 1.5);
    assert.true(Math.abs(hitTime(attack) - 0.6) < 1e-12, "the first, unless it is said");
    assert.true(Math.abs(hitTime(attack, 0) - 0.6) < 1e-12);
    assert.true(Math.abs(hitTime(attack, 1) - 1.2) < 1e-12);
  });

  QUnit.test("for every bender, the hand is out for every hit before the attack is over", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      spec.attack.hits.forEach((hit, i) => assert.true(hitTime(spec.attack, i) < attackDuration(spec.attack), `${kind} hit ${i}`));
    }
```

In `tests/brain.tests.js`, **replace** line 95:

```js
  const spec = { range: 5, cooldown: 2, attack: { seconds: 1, speed: 1, hitAt: 0.5, aim: 0 } };
```

with:

```js
  const spec = { range: 5, cooldown: 2, damage: 4, attack: { seconds: 1, speed: 1, aim: 0, hits: [{ at: 0.5 }] } };
```

and a new module at the end of the file, with an attack of three hits that is easy to work out:

In `tests/brain.tests.js`, after line 331, add:

```js

QUnit.module("an attack with several hits", () => {
  // Three punches in a second: the hand is out at a fifth, a half and four fifths of the way through.
  const combo = { range: 5, cooldown: 2, damage: 3, attack: { seconds: 1, speed: 1, aim: 0, hits: [{ at: 0.2 }, { at: 0.5 }, { at: 0.8 }] } };
  const enemy = { x: 0, z: 3, progress: 0.5, done: false };

  const run = (brain, seconds, enemies, step = 0.02) => {
    const events = [];
    for (let t = 0; t < seconds - 1e-9; t += step) for (const event of brain.update(step, enemies)) events.push({ ...event, time: Math.round((t + step) * 100) / 100 });
    return events;
  };

  QUnit.test("an attack is a start, a fire for each hit, in order, and an end", (assert) => {
    const brain = new TowerBrain(combo, { x: 0, z: 0 });
    brain.yaw = 0;
    const events = run(brain, 1.5, [enemy]);

    assert.deepEqual(events.map((event) => event.type), ["start", "fire", "fire", "fire", "end"]);
    assert.deepEqual(events.filter((event) => event.type === "fire").map((event) => event.hit), [0, 1, 2]);
  });

  QUnit.test("each fires when its moment comes", (assert) => {
    const brain = new TowerBrain(combo, { x: 0, z: 0 });
    brain.yaw = 0;
    const events = run(brain, 1.5, [enemy]);
    const start = events[0].time;

    events.filter((event) => event.type === "fire").forEach((event, i) => {
      assert.true(Math.abs(event.time - start - combo.attack.hits[i].at) <= 0.021, `hit ${i} at ${(event.time - start).toFixed(2)}`);
    });
  });

  QUnit.test("and each says how much harm it does, which is the bender's damage for one hit", (assert) => {
    const brain = new TowerBrain(combo, { x: 0, z: 0 });
    brain.yaw = 0;

    assert.deepEqual(run(brain, 1.5, [enemy]).filter((event) => event.type === "fire").map((event) => event.damage), [3, 3, 3]);
  });

  QUnit.test("every hit is at the enemy that the attack began with", (assert) => {
    const brain = new TowerBrain(combo, { x: 0, z: 0 });
    brain.yaw = 0;
    const other = { x: 1, z: 3, progress: 0.9, done: false };
    brain.update(0.02, [enemy]);
    const events = [];
    for (let i = 0; i < 60; i++) events.push(...brain.update(0.02, [enemy, other]));

    assert.true(events.filter((event) => event.type === "fire").every((event) => event.enemy === enemy));
  });

  QUnit.test("a very long step does not lose a hit: they all fire, in order, and the attack ends", (assert) => {
    const brain = new TowerBrain(combo, { x: 0, z: 0 });
    brain.yaw = 0;
    const events = [...brain.update(0.02, [enemy]), ...brain.update(5, [enemy])];

    assert.deepEqual(events.map((event) => event.type), ["start", "fire", "fire", "fire", "end"]);
    assert.deepEqual(events.filter((event) => event.type === "fire").map((event) => event.hit), [0, 1, 2]);
  });

  QUnit.test("the next attack starts all its hits again", (assert) => {
    const brain = new TowerBrain(combo, { x: 0, z: 0 });
    brain.yaw = 0;
    const fires = run(brain, 6, [enemy]).filter((event) => event.type === "fire");

    assert.true(fires.length >= 6, `${fires.length} fires`);
    assert.deepEqual(fires.slice(0, 6).map((event) => event.hit), [0, 1, 2, 0, 1, 2]);
  });
});
```

And the tower's. An attack fires a shot for each hit, each from the muzzle of its own hit, and the muzzle is where a hand really is, for every hit:

In `tests/tower.tests.js`, **replace** line 201:

```js
  QUnit.test("and the muzzle is where the hand really is when it fires", (assert) => {
```

with:

```js
  QUnit.test("an attack fires a shot for each of its hits, and the fire nation's is six", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `hits ${kind}`);
      const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
      const shots = [];
      let ended = false;
      for (let i = 0; i < 400 && !ended; i++) {
        shots.push(...tower.update(0.02, [enemy]));
        ended = shots.length > 0 && tower.brain.state === "idle";
      }

      assert.strictEqual(shots.length, spec.attack.hits.length, kind);
      tower.dispose();
    }
  });

  QUnit.test("each shot of a combo has the muzzle of its own hit", (assert) => {
    const tower = new Tower(scene, loaded, "fire", 3, 2, "combo");
    const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
    const shots = [];
    for (let i = 0; i < 400 && shots.length < 6; i++) shots.push(...tower.update(0.02, [enemy]));
    const yaw = tower.brain.yaw;
    const want = BENDERS.fire.attack.hits.map((hit) => muzzleAt(tower.at, tower.top, yaw, hit.muzzle, tower.scale));

    assert.strictEqual(shots.length, 6);
    shots.forEach((shot, i) => assert.true(Math.hypot(shot.muzzle.x - want[i].x, shot.muzzle.y - want[i].y, shot.muzzle.z - want[i].z) < 0.05, `shot ${i}`));
    assert.true(new Set(shots.map((shot) => shot.muzzle.y.toFixed(2))).size > 1, "the punches are not all from one place");
    tower.dispose();
  });

  QUnit.test("and the muzzle is where the hand really is when it fires, for every hit", (assert) => {
```

In `tests/tower.tests.js`, **replace** lines 236 to 237:

```js
      let shot = null;
      for (let i = 0; i < 200 && !shot; i++) shot = tower.update(0.02, [enemy])[0];
```

with:

```js
      for (let i = 0; i < 200 && tower.brain.state === "idle"; i++) tower.update(0.02, [enemy]);
```

In `tests/tower.tests.js`, **replace** lines 246 to 256:

```js
      clip.goToFrame(clip.from + (clip.to - clip.from) * spec.attack.hitAt);
      tower.node.computeWorldMatrix(true);
      tower.copy.rootNodes[0].computeWorldMatrix(true);
      const hands = ["LeftHand", "RightHand"].map((hand) => {
        const node = scene.getTransformNodeByName(`${name} bender mixamorig:${hand}`);
        node.computeWorldMatrix(true);
        return node.getAbsolutePosition();
      });
      const nearest = Math.min(...hands.map((p) => Math.hypot(p.x - shot.muzzle.x, p.y - shot.muzzle.y, p.z - shot.muzzle.z)));

      assert.true(nearest < 0.15, `${kind}: ${nearest.toFixed(3)} from a hand`);
```

with:

```js
      spec.attack.hits.forEach((hit, i) => {
        clip.goToFrame(clip.from + (clip.to - clip.from) * hit.at);
        tower.node.computeWorldMatrix(true);
        tower.copy.rootNodes[0].computeWorldMatrix(true);
        const hands = ["LeftHand", "RightHand"].map((name2) => {
          const node = scene.getTransformNodeByName(`${name} bender mixamorig:${name2}`);
          node.computeWorldMatrix(true);
          return node.getAbsolutePosition();
        });
        const muzzle = tower.muzzle(i);
        const nearest = Math.min(...hands.map((p) => Math.hypot(p.x - muzzle.x, p.y - muzzle.y, p.z - muzzle.z)));

        assert.true(nearest < 0.15, `${kind} hit ${i}: ${nearest.toFixed(3)} from a hand`);
      });
```

**Check:** open `tests.html`. 602 tests pass. Then open `index.html`, build a fire podium, and start a wave. A combo is six flames, one from each punch, and where it was a puff, the fire nation now *looks* like it is attacking.

---

## Step 2: Levels

A tower can be made better, twice. A level is **a row of a table**, and what the row says is *how much better*: more harm in a hit, a longer reach, and faster.

The whole idea of this step is in one function. What a bender can do at a level is **the bender's own row of the `BENDERS` table with the level worked into it**: the same keys (`damage`, `range`, `cooldown`, `attack`), and the numbers a little bigger. So a brain that is given it (a brain is given a row of the table) does not need to know about levels at all; it is given a better row.

Open `js/upgrades.js` (the placeholder) and **replace the TODO line** with:

```js
// Levels: a tower can be made better for gold, twice. A level is a row of a table, and what it says is *how much
// better*: more harm in a hit, a longer reach, and faster (the attack is played faster, and the wait for the next is
// shorter, by the same amount). What a tower can do at a level is the bender's own row of the BENDERS table with those
// numbers worked into it (`statsFor`), so that a brain that is given it needs to know nothing of levels. This file
// is the numbers and the rules for paying; the tower that shows it is in tower.js. See ../tests/upgrades.tests.js.

// One row for each level, the first (which is the bender as it is) to the last. `cost` is what it costs to get to
// the level from the one before, as a share of what the podium cost, and the others say how many times as much of
// each thing there is at the level as at the first.
const LEVELS = [
  { name: "Novice", cost: 0, damage: 1, range: 1, tempo: 1 },
  { name: "Adept", cost: 0.6, damage: 1.4, range: 1.1, tempo: 1.2 },
  { name: "Master", cost: 0.9, damage: 2, range: 1.2, tempo: 1.45 },
];
const MAX_LEVEL = LEVELS.length;

// A price in whole gold that ends in a five or a nought, since that is what a price looks like.
const tidy = (gold) => Math.round(gold / 5) * 5;

// What a bender can do at a level, as a row like its own in the BENDERS table (and so, for the first level, the same
// numbers): its damage and its range are more, its cooldown is shorter, and its attack is played faster.
function statsFor(spec, level) {
  const row = LEVELS[level - 1];
  return {
    ...spec,
    damage: spec.damage * row.damage,
    range: spec.range * row.range,
    cooldown: spec.cooldown / row.tempo,
    attack: { ...spec.attack, speed: spec.attack.speed * row.tempo },
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVELS, MAX_LEVEL, statsFor };
} else {
  Object.assign(window, { LEVELS, MAX_LEVEL, statsFor });
}
```

Things to notice:

- **The first level is a row too, and it changes nothing:** every number is 1 and its cost is nothing. That is why `statsFor(spec, 1)` is the bender's own numbers, and why no code has to treat the first level as a special case.
- **`tempo` is how much faster, and it is divided into the cooldown and multiplied into the speed of the clip.** A tower with a tempo of 1.45 plays its attack 1.45 times as fast, and waits 1.45 times less for the next. Doing both by the same amount is why the attack still fits in the cooldown, whatever the level (a test checks it for every bender at every level).
- **`statsFor` makes a new row every time, and does not change the table.** `{ ...spec, ... }` copies it, and `attack` is copied too, since it is the thing whose `speed` changes. (A test says that the table is as it was after all the levels have been worked out.)
- **`tidy` makes a price look like a price:** whole gold, in fives.

Now what it costs. The numbers about money that aren't a price are in `ECONOMY`, so the share that selling gives back goes there:

In `js/economy.js`, after line 6, add:

```js
  refund: 0.7, // the share of what a tower is worth (its podium and its upgrades) that selling it gives back
```

In `js/upgrades.js`, find the export block (lines 33 to 40) and **delete it**. Add this in its place, and the export block under it:

```js
// What it costs to take a bender from a level to the next, or null at the last level, where there is no next.
function upgradeCost(spec, level) {
  if (level >= MAX_LEVEL) return null;
  return tidy(spec.cost * LEVELS[level].cost);
}

// What a tower has cost in all: the podium, and every upgrade it has had.
function worthOf(spec, level) {
  let gold = spec.cost;
  for (let from = 1; from < level; from++) gold += upgradeCost(spec, from);
  return gold;
}

// What selling a tower of a level gives back: a share of what it is worth.
function refundFor(spec, level) {
  return Math.floor(worthOf(spec, level) * ECONOMY.refund);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVELS, MAX_LEVEL, statsFor, upgradeCost, worthOf, refundFor };
} else {
  Object.assign(window, { LEVELS, MAX_LEVEL, statsFor, upgradeCost, worthOf, refundFor });
}
```

- **A level costs a share of the podium, not a number of gold.** The first upgrade of an air bender is 60 (0.6 of 100), and of a fire bender 105 (0.6 of 175). So the cost of an upgrade goes up with how good the bender is, and one table says it for all four.
- **A tower is worth its podium and what has been spent on it,** and selling gives back 70 percent of *that*. A tower that has been upgraded sells for more, and no way of building, upgrading and selling makes gold (a test does exactly that for all four benders).

Open `tests/upgrades.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("the LEVELS table", () => {
  QUnit.test("there are three levels, and the last is the number of them", (assert) => {
    assert.strictEqual(LEVELS.length, 3);
    assert.strictEqual(MAX_LEVEL, 3);
  });

  QUnit.test("the first level is a bender as it is: it costs nothing, and changes nothing", (assert) => {
    assert.deepEqual(LEVELS[0], { name: "Novice", cost: 0, damage: 1, range: 1, tempo: 1 });
  });

  QUnit.test("every level is better than the one before: more harm, more reach, faster, and a higher price", (assert) => {
    for (let i = 1; i < LEVELS.length; i++) {
      for (const key of ["cost", "damage", "range", "tempo"]) assert.true(LEVELS[i][key] > LEVELS[i - 1][key], `${LEVELS[i].name} ${key}`);
    }
  });

  QUnit.test("and each has a name of its own", (assert) => {
    assert.strictEqual(new Set(LEVELS.map((level) => level.name)).size, LEVELS.length);
  });
});

QUnit.module("statsFor", () => {
  QUnit.test("at the first level it is the bender's own numbers", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const stats = statsFor(spec, 1);

      assert.strictEqual(stats.damage, spec.damage, kind);
      assert.strictEqual(stats.range, spec.range, kind);
      assert.strictEqual(stats.cooldown, spec.cooldown, kind);
      assert.strictEqual(stats.attack.speed, spec.attack.speed, kind);
    }
  });

  QUnit.test("at a higher level the damage and the range are multiplied, and the cooldown is divided, by the row of the table", (assert) => {
    const spec = BENDERS.water;
    const row = LEVELS[2];
    const stats = statsFor(spec, 3);

    assert.true(Math.abs(stats.damage - spec.damage * row.damage) < 1e-9);
    assert.true(Math.abs(stats.range - spec.range * row.range) < 1e-9);
    assert.true(Math.abs(stats.cooldown - spec.cooldown / row.tempo) < 1e-9);
  });

  QUnit.test("and the attack is played faster by the same amount, which is why it is no longer than the cooldown", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        const stats = statsFor(spec, level);

        assert.true(Math.abs(stats.attack.speed - spec.attack.speed * LEVELS[level - 1].tempo) < 1e-9, `${kind} ${level}`);
        assert.true(attackDuration(stats.attack) <= stats.cooldown, `${kind} ${level}: ${attackDuration(stats.attack).toFixed(2)} in ${stats.cooldown.toFixed(2)}`);
      }
    }
  });

  QUnit.test("everything else about the bender is kept: it is still the same attack, in the same colors", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const stats = statsFor(spec, 3);

      assert.strictEqual(stats.color, spec.color, kind);
      assert.strictEqual(stats.cost, spec.cost, kind);
      assert.deepEqual(stats.idles, spec.idles, kind);
      assert.strictEqual(stats.attack.clip, spec.attack.clip, kind);
      assert.strictEqual(stats.attack.aim, spec.attack.aim, kind);
      assert.deepEqual(stats.attack.hits, spec.attack.hits, kind);
    }
  });

  QUnit.test("the table is not changed by working out a level from it", (assert) => {
    const before = JSON.stringify(BENDERS);
    for (let level = 1; level <= MAX_LEVEL; level++) for (const spec of Object.values(BENDERS)) statsFor(spec, level);

    assert.strictEqual(JSON.stringify(BENDERS), before);
  });

  QUnit.test("even the longest reach, at the last level, is less than half the board, and every reach is more than a cell", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const range = statsFor(spec, MAX_LEVEL).range;

      assert.true(range < (BOARD.cols * BOARD.cell) / 2 && statsFor(spec, 1).range > BOARD.cell, `${kind}: ${range.toFixed(2)}`);
    }
  });

  QUnit.test("and what it gives a brain is a row that a brain can use: a master fires faster, and harder", (assert) => {
    const slow = new TowerBrain(statsFor(BENDERS.earth, 1), { x: 0, z: 0 });
    const quick = new TowerBrain(statsFor(BENDERS.earth, 3), { x: 0, z: 0 });
    const enemy = { x: 0, z: 3, progress: 0.5, done: false };
    const fires = (brain) => {
      brain.yaw = 0;
      let harm = 0;
      for (let t = 0; t < 20; t += 0.02) for (const event of brain.update(0.02, [enemy])) if (event.type === "fire") harm += event.damage;
      return harm;
    };

    assert.true(fires(quick) > fires(slow) * 2, "in twenty seconds it does more than twice the harm");
  });
});

QUnit.module("what a level costs", () => {
  QUnit.test("a price is in whole gold, in fives", (assert) => {
    for (const spec of Object.values(BENDERS)) {
      for (let level = 1; level < MAX_LEVEL; level++) assert.strictEqual(upgradeCost(spec, level) % 5, 0, `${spec.name} ${level}`);
    }
  });

  QUnit.test("it is a share of the podium's price, which the table says", (assert) => {
    assert.strictEqual(upgradeCost(BENDERS.air, 1), 60);
    assert.strictEqual(upgradeCost(BENDERS.air, 2), 90);
    assert.strictEqual(upgradeCost(BENDERS.fire, 1), 105);
  });

  QUnit.test("there is no price for more than the last level", (assert) => {
    for (const spec of Object.values(BENDERS)) assert.strictEqual(upgradeCost(spec, MAX_LEVEL), null);
  });

  QUnit.test("a tower is worth what its podium cost, and every upgrade", (assert) => {
    const spec = BENDERS.earth;

    assert.strictEqual(worthOf(spec, 1), 150);
    assert.strictEqual(worthOf(spec, 2), 150 + upgradeCost(spec, 1));
    assert.strictEqual(worthOf(spec, 3), 150 + upgradeCost(spec, 1) + upgradeCost(spec, 2));
  });

  QUnit.test("selling gives back a share of that, in whole gold, and less than it was worth", (assert) => {
    for (const spec of Object.values(BENDERS)) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        const refund = refundFor(spec, level);

        assert.true(Number.isInteger(refund) && refund < worthOf(spec, level) && refund > 0, `${spec.name} ${level}: ${refund} of ${worthOf(spec, level)}`);
      }
    }
    assert.strictEqual(refundFor(BENDERS.air, 1), 70);
  });

  QUnit.test("each upgrade gives more for its gold than another podium would, which is why a player upgrades", (assert) => {
    for (const spec of Object.values(BENDERS)) {
      const power = (level) => LEVELS[level - 1].damage * LEVELS[level - 1].tempo;
      for (let level = 1; level < MAX_LEVEL; level++) {
        const gain = (power(level + 1) - power(level)) / upgradeCost(spec, level);

        assert.true(gain > 1 / spec.cost, `${spec.name} ${level} to ${level + 1}`);
      }
    }
  });
});
```

- **"Every level is better than the one before"** is the test to look at when you change a number of the table: it says that no level is a step back.
- **"Each upgrade gives more for its gold than another podium would"** is the reason a player upgrades at all. An upgrade does not make a tower *twice* as good for the price of one: it is a better buy than a new podium, and no more than that.
- **"A brain that is given it fires faster and harder"** gives a brain a level 3 row and counts the harm in twenty seconds. It is the proof of the idea of this step: nothing in the brain knows about levels.

**Check:** open `tests.html`. 619 tests pass.

---

## Step 3: A tower with a level

The tower is the model and the animation, and it has to do two things with a level: *show* it, and *use* it.

To use it, it keeps two rows. `base` is the bender's row in the table, which never changes. `spec` is what the tower can do **now**: the table's row at first, and a row from `statsFor` when it has a level. Everything in the tower that already reads `this.spec` (the speed of the attack clip, the color, the damage, the idles) goes on working, and now gets the numbers of the level:

In `js/tower.js`, **replace** line 35:

```js
    this.spec = spec;
```

with:

```js
    this.spec = spec; // what the tower can do now: the bender's row of the table, with its level worked into it
    this.base = spec; // the bender's row as it is in the table
    this.level = 1;
```

To show it, a ring on the ground for every level above the first, in the color of the nation, made now and out of sight. First the numbers, in the table at the top:

In `js/tower.js`, after line 8, add:

```js
  ring: 1.62, // how wide the ring of the first upgrade is, on the ground round the podium (which is 1.5 wide, in a cell of 2)
  ringStep: 0.22, // how much wider each ring after the first is
  ringThickness: 0.07, // how thick the tube of a ring is
  ringHeight: 0.06, // how high above the ground the rings are
```

then the function that makes them. It goes **above `class Tower {`**, on a line of its own after the end of `muzzleAt`, and **not inside the class** (the line you add it after is the closing brace of `muzzleAt`, and `class Tower {` comes after the new function):

In `js/tower.js`, after line 32, add:

```js
// The rings that say a tower has been upgraded: one for every level above the first, flat on the ground round the
// podium, in the color of the nation. They are all made now, out of sight, and shown as the tower gets its levels.
function buildRings(scene, parent, name, color) {
  const material = new BABYLON.StandardMaterial(`${name} ring`, scene);
  material.emissiveColor = BABYLON.Color3.FromHexString(color);
  material.disableLighting = true;
  const rings = [];
  for (let level = 2; level <= MAX_LEVEL; level++) {
    const diameter = TOWER_VIEW.ring + (level - 2) * TOWER_VIEW.ringStep;
    const ring = BABYLON.MeshBuilder.CreateTorus(`${name} ring ${level}`, { diameter, thickness: TOWER_VIEW.ringThickness, tessellation: 40 }, scene);
    ring.material = material;
    ring.parent = parent;
    ring.position.y = TOWER_VIEW.ringHeight;
    ring.isPickable = false;
    ring.setEnabled(false);
    rings.push(ring);
  }
  return rings;
}

```

and the tower makes them with the rest of itself:

In `js/tower.js`, after line 98, add:

```js
    // A ring on the ground for every level above the first.
    this.rings = buildRings(scene, this.node, name, spec.color);

```

Now the method the rest of the game calls:

In `js/tower.js`, after line 109, add:

```js
  // Makes the tower the level it is told, which says what it can do (and shows a ring for each level above the first). A
  // tower that is in the middle of an attack finishes it as it was, and attacks the new way from the next.
  setLevel(level) {
    this.level = level;
    this.spec = statsFor(this.base, level);
    this.rings.forEach((ring, i) => ring.setEnabled(i < level - 1));
  }

```

- **`setLevel` shows a ring for every level above the first.** Level 1 shows none, level 2 shows the inner ring and level 3 both. Going *down* in level takes them away, which a sale doesn't need but a test does.
- **The rings are made once and shown or hidden,** and not made when a level is reached. A ring is a mesh and a material, and a tower with its rings out of sight costs a few triangles; a tower that makes a ring when it is upgraded has one more thing to dispose of, and a frame in which it hitches.
- **They are on the ground and just wider than the podium,** which is 1.5 across in a cell of 2: 1.62, and 1.84 for the second, so that they are two rings and not a thick one, and so that neither is wider than the cell.

Now the *use*. The brain has its own idea of what row it is attacking with, and the tower decides when it changes it. **Not in the middle of an attack.** The attack clip is already playing at the old speed, and the brain's idea of how long it lasts and when each hit is would change under it, so a tower that is upgraded in the middle of a combo would lose hits, or fire them at the wrong moment. So it waits until the brain is idle:

In `js/tower.js`, after line 139, add:

```js
    if (this.brain.state === "idle") this.brain.spec = this.spec;
```

and a tower that is taken away takes its rings' material with it (the meshes go with the tower's node; a material doesn't):

In `js/tower.js`, after line 153, add:

```js
    this.rings[0].material.dispose();
```

The new tests are a module of their own at the end of `tests/tower.tests.js`:

In `tests/tower.tests.js`, after line 324, add:

```js

QUnit.module("a Tower's level", (hooks) => {
  let engine, scene, loaded;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadBenders(scene);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const foe = (x, z, progress = 0.5) => ({ x, z, progress, done: false });
  const shown = (tower) => tower.rings.filter((ring) => ring.isEnabled()).length;

  QUnit.test("a new tower is the first level, can do what its bender's row says, and shows no ring", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `new ${kind}`);

      assert.strictEqual(tower.level, 1, kind);
      assert.strictEqual(tower.spec, spec, kind);
      assert.strictEqual(shown(tower), 0, kind);
      tower.dispose();
    }
  });

  QUnit.test("a ring for every level above the first, and no more", (assert) => {
    const tower = new Tower(scene, loaded, "air", 3, 2, "rings");

    assert.strictEqual(tower.rings.length, MAX_LEVEL - 1);
    tower.setLevel(2);
    assert.strictEqual(shown(tower), 1);
    tower.setLevel(3);
    assert.strictEqual(shown(tower), 2);
    tower.setLevel(1);
    assert.strictEqual(shown(tower), 0, "and they go if the level does");
    tower.dispose();
  });

  QUnit.test("each ring is wider than the one before and the podium, and every one fits in the cell, on the ground, in the nation's color", (assert) => {
    const tower = new Tower(scene, loaded, "earth", 3, 2, "wide");
    const widths = tower.rings.map((ring) => ring.getBoundingInfo().boundingBox.extendSize.x * 2);

    widths.forEach((width, i) => {
      assert.true(width > TOWER.podiumWidth && width < BOARD.cell, `ring ${i}: ${width.toFixed(2)}`);
      assert.true(i === 0 || width > widths[i - 1], `ring ${i} is wider than the one before`);
    });
    assert.true(tower.rings.every((ring) => ring.position.y > 0 && ring.position.y < 0.2));
    assert.strictEqual(tower.rings[0].material.emissiveColor.toHexString().toLowerCase(), BENDERS.earth.color);
    tower.dispose();
  });

  QUnit.test("the tower can do what its level says: more harm, more reach", (assert) => {
    const tower = new Tower(scene, loaded, "water", 3, 2, "stronger");
    tower.setLevel(3);

    assert.strictEqual(tower.level, 3);
    assert.true(tower.spec.damage > BENDERS.water.damage);
    assert.true(tower.spec.range > BENDERS.water.range);
    assert.strictEqual(tower.base, BENDERS.water, "and the table's row is kept, for the next level");
    tower.dispose();
  });

  QUnit.test("a tower can be taken up and down in levels, and is never worse than its bender's row says at the first", (assert) => {
    const tower = new Tower(scene, loaded, "fire", 3, 2, "updown");
    tower.setLevel(3);
    tower.setLevel(1);

    assert.strictEqual(tower.spec.damage, BENDERS.fire.damage);
    assert.strictEqual(tower.spec.cooldown, BENDERS.fire.cooldown);
    tower.dispose();
  });

  QUnit.test("an upgraded tower attacks faster: the clip is played at the speed of its level", (assert) => {
    const tower = new Tower(scene, loaded, "earth", 3, 2, "faster");
    tower.setLevel(3);
    const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
    for (let i = 0; i < 100 && tower.brain.state !== "attacking"; i++) tower.update(0.05, [enemy]);

    assert.strictEqual(tower.brain.state, "attacking");
    assert.true(Math.abs(tower.attackClip.speedRatio - BENDERS.earth.attack.speed * LEVELS[2].tempo) < 1e-9);
    tower.dispose();
  });

  QUnit.test("and it shoots harder, and its shots say so", (assert) => {
    const tower = new Tower(scene, loaded, "earth", 3, 2, "harder");
    tower.setLevel(2);
    const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
    const shots = [];
    for (let i = 0; i < 200 && shots.length === 0; i++) shots.push(...tower.update(0.02, [enemy]));

    assert.true(Math.abs(shots[0].damage - BENDERS.earth.damage * LEVELS[1].damage) < 1e-9);
    tower.dispose();
  });

  QUnit.test("a tower in the middle of an attack finishes it as it was, and attacks the new way from the next", (assert) => {
    const tower = new Tower(scene, loaded, "earth", 3, 2, "midway");
    const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
    for (let i = 0; i < 100 && tower.brain.state !== "attacking"; i++) tower.update(0.02, [enemy]);
    tower.setLevel(3);
    tower.update(0.02, [enemy]);

    assert.strictEqual(tower.brain.spec, BENDERS.earth, "still attacking the old way");
    const shots = [];
    for (let i = 0; i < 200; i++) shots.push(...tower.update(0.02, [enemy]));

    assert.strictEqual(shots[0].damage, BENDERS.earth.damage, "the shot of the attack that was begun");
    assert.true(shots.some((shot) => shot.damage > BENDERS.earth.damage), "and a later attack is stronger");
    tower.dispose();
  });

  QUnit.test("a tower that is taken away takes its rings, and their material, with it", (assert) => {
    const meshes = scene.meshes.length;
    const materials = scene.materials.length;
    const tower = new Tower(scene, loaded, "air", 5, 5, "ringed");
    tower.setLevel(3);
    tower.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.materials.length, materials);
  });
});
```

- **"A tower in the middle of an attack finishes it as it was"** is the test of the rule above: it upgrades a tower after an attack has begun, checks that the brain is still attacking with the old row, and that the shot of that attack has the old damage, and a later attack is stronger.
- **"A tower that is taken away takes its rings, and their material, with it"** counts the scene's meshes and materials before and after, as the test of an ordinary tower counts its skeletons.

**Check:** open `tests.html`. 628 tests pass.

---

## Step 4: Paying

Two small rules, in the same file as the numbers, and in the same style as `tryBuild`: they say `{ ok, reason }`, and when they don't do it, nothing has been paid.

In `js/upgrades.js`, find the export block (lines 51 to 58) and **delete it**. Add this in its place, and the export block under it:

```js
// Makes a tower one level better, if it can be and there is the gold. `state` is { towers, wallet }, and a tower is
// anything with a `kind`, a `level` and a `setLevel(level)`. It says { ok, reason }, and if it did not upgrade, nothing has been paid.
function tryUpgrade(state, tower, benders = BENDERS) {
  const cost = upgradeCost(benders[tower.kind], tower.level);
  if (cost === null) return { ok: false, reason: "that is as good as it gets" };
  if (!state.wallet.canAfford(cost)) return { ok: false, reason: `that costs ${cost}, and there is ${state.wallet.shown}` };
  state.wallet.spend(cost);
  tower.setLevel(tower.level + 1);
  return { ok: true, reason: "" };
}

// Takes a tower out of `state.towers` and pays for it. It says { ok, refund }; a tower that is not there is not sold.
// (It is the same list, with one fewer in it, because the game goes on using it.)
function trySell(state, tower, benders = BENDERS) {
  const at = state.towers.indexOf(tower);
  if (at < 0) return { ok: false, refund: 0 };
  const refund = refundFor(benders[tower.kind], tower.level);
  state.towers.splice(at, 1);
  state.wallet.earn(refund);
  return { ok: true, refund };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEVELS, MAX_LEVEL, statsFor, upgradeCost, worthOf, refundFor, tryUpgrade, trySell };
} else {
  Object.assign(window, { LEVELS, MAX_LEVEL, statsFor, upgradeCost, worthOf, refundFor, tryUpgrade, trySell });
}
```

- **A tower is anything with a `kind`, a `level` and a `setLevel`.** The rule doesn't know what a Tower is, so a test can try it with an object of three lines, and the game uses it with the real one.
- **The reasons are sentences,** like the ones `canBuild` gives: *that costs 105, and there is 100*, and *that is as good as it gets*. They are what the player reads.
- **`trySell` takes the tower out of the same list** (`splice`), and doesn't make a new list. The game has *one* list of towers, and the frame of the game, the hand and the rules all hold it. A function that made a new one would leave the others looking at the old.
- **It doesn't take the tower out of the scene.** That is the hand's job (it has the model), and the rule only has the accounts. A tower that is not in the list isn't sold, and pays nothing, so that a button pressed twice doesn't pay twice.

Open `tests/paying.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("paying for an upgrade, and selling", () => {
  // A tower that is only what the rules ask of one.
  const tower = (kind, level = 1) => ({
    kind,
    level,
    setLevel(next) {
      this.level = next;
    },
  });

  QUnit.test("an upgrade takes the gold and raises the level by one", (assert) => {
    const state = { towers: [], wallet: new Wallet(100) };
    const air = tower("air");

    const result = tryUpgrade(state, air);

    assert.deepEqual(result, { ok: true, reason: "" });
    assert.strictEqual(air.level, 2);
    assert.strictEqual(state.wallet.gold, 100 - upgradeCost(BENDERS.air, 1));
  });

  QUnit.test("exactly enough gold is enough", (assert) => {
    const state = { towers: [], wallet: new Wallet(60) };

    assert.true(tryUpgrade(state, tower("air")).ok);
    assert.strictEqual(state.wallet.gold, 0);
  });

  QUnit.test("too little gold says how much it costs and how much there is, and nothing is paid or changed", (assert) => {
    const state = { towers: [], wallet: new Wallet(59.9) };
    const air = tower("air");

    const result = tryUpgrade(state, air);

    assert.false(result.ok);
    assert.strictEqual(result.reason, "that costs 60, and there is 59");
    assert.strictEqual(air.level, 1);
    assert.strictEqual(state.wallet.gold, 59.9);
  });

  QUnit.test("a tower at the last level can't be upgraded, however rich", (assert) => {
    const state = { towers: [], wallet: new Wallet(5000) };
    const master = tower("fire", MAX_LEVEL);

    const result = tryUpgrade(state, master);

    assert.false(result.ok);
    assert.strictEqual(result.reason, "that is as good as it gets");
    assert.strictEqual(master.level, MAX_LEVEL);
    assert.strictEqual(state.wallet.gold, 5000);
  });

  QUnit.test("upgrading to the top costs the worth of the top, less the podium", (assert) => {
    const state = { towers: [], wallet: new Wallet(1000) };
    const earth = tower("earth");
    tryUpgrade(state, earth);
    tryUpgrade(state, earth);

    assert.strictEqual(earth.level, MAX_LEVEL);
    assert.strictEqual(1000 - state.wallet.gold, worthOf(BENDERS.earth, MAX_LEVEL) - BENDERS.earth.cost);
  });

  QUnit.test("selling takes the tower out of the list it is in, and pays", (assert) => {
    const water = tower("water");
    const state = { towers: [tower("air"), water, tower("fire")], wallet: new Wallet(0) };
    const list = state.towers;

    const result = trySell(state, water);

    assert.deepEqual(result, { ok: true, refund: refundFor(BENDERS.water, 1) });
    assert.strictEqual(state.towers, list, "it is the same list, since the game goes on using it");
    assert.deepEqual(state.towers.map((t) => t.kind), ["air", "fire"]);
    assert.strictEqual(state.wallet.gold, refundFor(BENDERS.water, 1));
  });

  QUnit.test("a tower that has been upgraded sells for more", (assert) => {
    const a = { towers: [tower("earth")], wallet: new Wallet(0) };
    const b = { towers: [tower("earth", 3)], wallet: new Wallet(0) };
    trySell(a, a.towers[0]);
    trySell(b, b.towers[0]);

    assert.true(b.wallet.gold > a.wallet.gold);
  });

  QUnit.test("a tower that is not in the list is not sold, and pays nothing", (assert) => {
    const state = { towers: [tower("air")], wallet: new Wallet(10) };

    assert.deepEqual(trySell(state, tower("air")), { ok: false, refund: 0 });
    assert.strictEqual(state.towers.length, 1);
    assert.strictEqual(state.wallet.gold, 10);
  });

  QUnit.test("it is not a way to make gold: build, upgrade and sell again, and there is less than there was", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const state = { towers: [], wallet: new Wallet(1000) };
      const t = tower(kind);
      state.wallet.spend(BENDERS[kind].cost);
      state.towers.push(t);
      tryUpgrade(state, t);
      tryUpgrade(state, t);
      trySell(state, t);

      assert.true(state.wallet.gold < 1000, kind);
    }
  });
});
```

- **"It is not a way to make gold"** builds, upgrades twice and sells, for every bender, and checks there is less gold at the end than at the start. It is the test that stops the numbers `0.7` and the shares of `LEVELS` from being changed to something that is a way to make money.

**Check:** open `tests.html`. 637 tests pass.

---

## Step 5: Choosing a tower

Everything is there but a way to ask for it. A tap on a tower **chooses** it: its range shows as a ring, its cell is outlined, and a panel comes up with two buttons. This is the `Hand`'s work, since it is the part of the game that listens to the pointer, and a `Panel` that shows it.

### The panel

The panel is made from the page, as the tray and the readouts are: it has no game in it, it says when a button is pressed, and it is told what to show. Open `js/panel.js` (the placeholder) and replace its contents with:

```js
// The panel of a tower: a small card that comes up when a tower is chosen, with its name and level, a button to make
// it better (and what that costs), and a button to sell it (and what that gives back). Like the tray and the readouts, it is
// made from a page, has no game in it, and is told what to show: it says when a button is pressed. See ../tests/panel.tests.js.

// What the line under the name says: which level it is, of how many, and what the level is called.
function levelText(level, total, levelName) {
  return `Level ${level} of ${total}, ${levelName}`;
}

// What the upgrade button says: where the upgrade goes, and what it costs.
function upgradeText(nextName, cost) {
  return `Make ${nextName} for ${cost}`;
}

// What the sell button says: what it gives back.
function sellText(refund) {
  return `Sell for ${refund}`;
}

class Panel {
  // `parts` is { panel, title, level, upgrade, sell }: the elements of the page that this fills in.
  constructor(parts) {
    this.parts = parts;
    this.upgraded = [];
    this.sold = [];
    // A press on one of these buttons is for the button, and is not for the board behind it: the game listens for
    // a pointer let go anywhere, and would take it for a tap on a cell (and put the panel away).
    for (const part of [parts.panel, parts.upgrade, parts.sell]) part.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.upgrade.addEventListener("click", () => this.upgraded.forEach((listener) => listener()));
    parts.sell.addEventListener("click", () => this.sold.forEach((listener) => listener()));
  }

  // Asks to be told when the upgrade button is pressed, and when the sell button is.
  onUpgrade(listener) {
    this.upgraded.push(listener);
  }

  onSell(listener) {
    this.sold.push(listener);
  }

  get visible() {
    return !this.parts.panel.hidden;
  }

  // Shows a tower: { name, color, level, total, levelName, nextName, cost, refund, gold }. `nextName` and `cost` are null for a
  // tower that is as good as it gets, and then there is no button to upgrade it. An upgrade that costs more than there is
  // looks greyed out (it still works, and says why not when it is tried).
  show({ name, color, level, total, levelName, nextName, cost, refund, gold }) {
    const { panel, title, level: levelLine, upgrade, sell } = this.parts;
    panel.hidden = false;
    panel.style.setProperty("--nation", color);
    this.write(title, name);
    this.write(levelLine, levelText(level, total, levelName));
    upgrade.hidden = cost === null;
    if (cost !== null) {
      this.write(upgrade, upgradeText(nextName, cost));
      upgrade.classList.toggle("poor", gold < cost);
    }
    this.write(sell, sellText(refund));
  }

  hide() {
    this.parts.panel.hidden = true;
  }

  // Writes some text, if it is not what is there: the panel is shown every frame, and almost always says the same.
  write(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { levelText, upgradeText, sellText, Panel };
} else {
  Object.assign(window, { levelText, upgradeText, sellText, Panel });
}
```

- **`show` is called every frame, and almost always says the same.** `write` only changes text that is different, so a card that is shown sixty times a second does not rebuild its text sixty times a second.
- **A tower that is as good as it gets has `cost: null`, and the upgrade button is hidden.** It still has a sell button. The card is the same card, with one button less.
- **An upgrade that costs more than there is is faded, and still works.** It says why not when it is pressed, as a podium in the tray does.
- **The buttons stop `pointerup`.** The game listens for a pointer let go *anywhere*, and a press on a button of the panel would be taken for a tap on the board behind it, which would put the panel away.

Open `css/panel.css` (the placeholder) and replace its contents with:

```css
/* The panel of a tower that has been chosen: a card at the bottom on the left, just above the tray, with the color of the
   nation along its top. It is there only while a tower is chosen, and the board is not covered by it. */
#panel {
  position: fixed;
  left: 12px;
  bottom: calc(var(--tray-height) + 12px);
  z-index: 13;
  width: 220px;
  box-sizing: border-box;
  padding: 0 12px 12px;
  overflow: hidden;
  display: grid;
  gap: 8px;
  background: var(--parchment);
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 12px;
  box-shadow: 0 8px 22px rgba(20, 40, 70, 0.4);
}
#panel::before {
  content: "";
  height: 10px;
  margin: 0 -12px 2px;
  background: var(--nation);
}
#panel-title {
  font: 700 20px / 1.1 var(--title-font);
}
#panel-level {
  font: 700 14px / 1.2 var(--small-font);
}
#panel button {
  padding: 9px 10px;
  background: #fff7e0;
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 9px;
  font: 700 15px / 1.1 var(--small-font);
  cursor: pointer;
  touch-action: manipulation;
}
#panel button:hover {
  background: #fffbe9;
}
#panel-upgrade {
  background: var(--gold);
}
#panel-upgrade:hover {
  background: #f1bb3e;
}

/* Too little gold: the button is faded. It can still be pressed, and says why not. */
#panel-upgrade.poor {
  opacity: 0.55;
}

/* A small screen: a phone, or a window made small. */
@media (max-width: 640px), (max-height: 520px) {
  #panel {
    width: 180px;
    gap: 6px;
    padding: 0 8px 8px;
  }
  #panel::before {
    margin: 0 -8px 2px;
  }
  #panel-title {
    font-size: 16px;
  }
  #panel button {
    padding: 7px 8px;
    font-size: 13px;
  }
}
```

`index.html` already has the `panel` in it and the style sheet and script that go with it.

Open `tests/panel.tests.js` (the placeholder) and replace its contents with:

```js
QUnit.module("what the panel says", () => {
  QUnit.test("the level: which, of how many, and what it is called", (assert) => {
    assert.strictEqual(levelText(2, 3, "Adept"), "Level 2 of 3, Adept");
  });

  QUnit.test("the upgrade: where it goes and what it costs", (assert) => {
    assert.strictEqual(upgradeText("Master", 90), "Make Master for 90");
  });

  QUnit.test("the sale: what it gives back", (assert) => {
    assert.strictEqual(sellText(105), "Sell for 105");
  });
});

QUnit.module("the Panel", (hooks) => {
  let parts, panel;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    parts = {
      panel: document.createElement("div"),
      title: document.createElement("div"),
      level: document.createElement("div"),
      upgrade: document.createElement("button"),
      sell: document.createElement("button"),
    };
    parts.panel.hidden = true;
    parts.panel.append(parts.title, parts.level, parts.upgrade, parts.sell);
    fixture.append(parts.panel);
    panel = new Panel(parts);
  });

  const earth = { name: "Earth Kingdom", color: "#b08a4a", level: 1, total: 3, levelName: "Novice", nextName: "Adept", cost: 90, refund: 105, gold: 400 };

  QUnit.test("it is out of sight until a tower is shown, and out of sight again when it is hidden", (assert) => {
    assert.false(panel.visible);
    panel.show(earth);
    assert.true(panel.visible);
    panel.hide();
    assert.false(panel.visible);
  });

  QUnit.test("it shows the name, the level, and what each button does", (assert) => {
    panel.show(earth);

    assert.strictEqual(parts.title.textContent, "Earth Kingdom");
    assert.strictEqual(parts.level.textContent, "Level 1 of 3, Novice");
    assert.strictEqual(parts.upgrade.textContent, "Make Adept for 90");
    assert.strictEqual(parts.sell.textContent, "Sell for 105");
  });

  QUnit.test("it has the color of the nation", (assert) => {
    panel.show(earth);

    assert.strictEqual(parts.panel.style.getPropertyValue("--nation"), "#b08a4a");
  });

  QUnit.test("an upgrade that costs more than there is looks poor, and one that does not, does not", (assert) => {
    panel.show({ ...earth, gold: 89 });
    assert.true(parts.upgrade.classList.contains("poor"));
    panel.show({ ...earth, gold: 90 });
    assert.false(parts.upgrade.classList.contains("poor"));
  });

  QUnit.test("a tower that is as good as it gets has no upgrade button, and can still be sold", (assert) => {
    panel.show({ ...earth, level: 3, levelName: "Master", nextName: null, cost: null, refund: 250 });

    assert.true(parts.upgrade.hidden);
    assert.false(parts.sell.hidden);
    assert.strictEqual(parts.sell.textContent, "Sell for 250");
  });

  QUnit.test("and the button comes back for the next tower that can be upgraded", (assert) => {
    panel.show({ ...earth, level: 3, nextName: null, cost: null });
    panel.show(earth);

    assert.false(parts.upgrade.hidden);
  });

  QUnit.test("it only writes text that has changed, so that it can be shown every frame", (assert) => {
    panel.show(earth);
    const node = parts.title.firstChild;
    panel.show(earth);

    assert.strictEqual(parts.title.firstChild, node);
  });

  QUnit.test("a click on a button is told to whoever asked", (assert) => {
    const heard = [];
    panel.onUpgrade(() => heard.push("upgrade"));
    panel.onSell(() => heard.push("sell"));
    parts.upgrade.click();
    parts.sell.click();

    assert.deepEqual(heard, ["upgrade", "sell"]);
  });

  QUnit.test("a press on the panel is not passed on to the board behind it", (assert) => {
    let reached = false;
    document.getElementById("qunit-fixture").addEventListener("pointerup", () => (reached = true));
    for (const part of [parts.panel, parts.upgrade, parts.sell]) part.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    assert.false(reached);
  });
});
```

### The hand

The hand's description of what it does changes first:

In `js/hand.js`, **replace** line 5:

```js
// tower. It is given everything it uses, and it is given plain events (`{ clientX, clientY, pointerType }`), not
```

with:

```js
// tower. It also chooses a tower that is tapped, and shows its panel, and upgrades it or sells it when the panel
// says so. It is given everything it uses, and it is given plain events (`{ clientX, clientY, pointerType }`), not
```

then a table, at the top, for how high to look for a tower (more on that in a moment):

In `js/hand.js`, after line 11, add:

```js
  pickHeights: [2, 1, 0], // how high above the ground to look for a tower that is tapped (its bender is taller than the cell is wide)
```

and the description of what it is given (it is given a `panel`):

In `js/hand.js`, **replace** lines 16 to 17:

```js
  // `parts`: { canvas, tray, state, outline, ring, previews, extents, make }. `canvas` has a `getBoundingClientRect()`,
  // `tray` is a Tray, `state` is { grid, towers, wallet }, `outline` and `ring` are what shows the cell and the
```

with:

```js
  // `parts`: { canvas, tray, panel, state, outline, ring, previews, extents, make }. `canvas` has a `getBoundingClientRect()`,
  // `tray` is a Tray, `panel` is a Panel, `state` is { grid, towers, wallet }, `outline` and `ring` are what shows the cell and the
```

and it remembers which tower is chosen, if one is:

In `js/hand.js`, after line 24, add:

```js
    this.selected = null; // the tower that has been chosen, if one has
```

Then the work. The start of `press` is where the new methods go, in front of it. The start of `press` itself is in the code below too, with one new line in it: pressing a podium puts the chosen tower away, since the hand is for a podium now.

In `js/hand.js`, **replace** lines 69 to 70:

```js
  // The pointer goes down on a button of the tray. Pressing the button of a podium that is armed puts it down again.
  press(kind, point) {
```

with:

```js
  // The tower that a place on the page is over, or null. A bender stands up out of its cell, so a tap on one is on the
  // screen above where its cell is: look for the cell at a few heights, the highest first, since what is highest is in front.
  towerUnder(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!isInside(rect, event.clientX, event.clientY)) return null;
    const share = toScreenShare(rect, event.clientX, event.clientY);
    for (const height of HAND.pickHeights) {
      const ground = groundAt(this.extents(), share, CAMERA, height);
      const cell = cellAt(ground.x, ground.z);
      const tower = cell && this.state.towers.find((t) => t.col === cell.col && t.row === cell.row);
      if (tower) return tower;
    }
    return null;
  }

  // Chooses a tower (or none): its range shows as a ring and its cell is outlined, and the panel comes up from the next frame.
  select(tower) {
    this.selected = tower;
    this.clear();
    if (!tower) return this.panel.hide();
    const { x, z } = cellCenter(tower.col, tower.row);
    this.outline.show(tower.col, tower.row, true);
    this.ring.show(x, z, tower.spec.range, tower.spec.color);
    this.showPanel();
  }

  // Shows the chosen tower in the panel, as it is now.
  showPanel() {
    const tower = this.selected;
    const base = this.benders[tower.kind];
    const next = LEVELS[tower.level];
    this.panel.show({
      name: base.name,
      color: base.color,
      level: tower.level,
      total: MAX_LEVEL,
      levelName: LEVELS[tower.level - 1].name,
      nextName: next ? next.name : null,
      cost: upgradeCost(base, tower.level),
      refund: refundFor(base, tower.level),
      gold: this.state.wallet.gold,
    });
  }

  // The panel's button: makes the chosen tower better, if there is the gold, and says why not if there isn't.
  upgrade() {
    if (!this.selected) return null;
    const result = tryUpgrade(this.state, this.selected, this.benders);
    if (result.ok) this.select(this.selected);
    else this.say(result.reason, HAND.refusal);
    return result;
  }

  // The panel's other button: sells the chosen tower, and takes it away.
  sell() {
    if (!this.selected) return null;
    const tower = this.selected;
    const result = trySell(this.state, tower, this.benders);
    this.select(null);
    if (result.ok) {
      tower.dispose();
      this.tray.update(this.state.wallet.gold);
      this.say(`sold for ${result.refund}`, HAND.refusal);
    }
    return result;
  }

  // The pointer goes down on a button of the tray. Pressing the button of a podium that is armed puts it down again.
  // Whatever tower was chosen is put away: a podium is what the hand is for now.
  press(kind, point) {
    if (this.selected) this.select(null);
```

- **`towerUnder` looks at three heights.** A bender stands up out of its cell: tap its *head* and the place on the ground that your finger seems to point at is the cell *behind* the tower. So the hand asks which cell a place on the screen is over **at the height of the head, at the height of the middle, and at the ground**, highest first (what is highest is in front), and takes the first that has a tower in it. `groundAt`, from the pointing code of the Build tutorial, always had a height to give.
- **A finger is not held above itself here.** A dragged podium is held 72 pixels above a finger so that the finger doesn't hide it; a tap on a tower is a tap on what the finger is on.
- **`select` shows the chosen tower** (the ring at its *current* range, so a master's is bigger, and the outline), and `showPanel` says what the card says. Each frame the hand shows it again, so that a card that says *too dear* turns to *ready* when the gold comes in.
- **`upgrade` and `sell` are the rules, and what shows them.** Upgrading chooses the tower again (the ring is bigger, the card says the next level); selling takes the tower away from the scene (`dispose`), puts the card away and says what it got.

Now the tap. A pointer that is let go with nothing in the hand either chooses a tower or puts the chosen one away:

In `js/hand.js`, **replace** line 175:

```js
    }
```

with:

```js
      return;
    }
    // With nothing in the hand, a tap on a tower chooses it, and a tap on anything else puts it down.
    this.select(this.towerUnder(event));
```

And Escape puts away whichever is in the hand, the podium and the tower:

In `js/hand.js`, **replace** lines 191 to 193:

```js
  // Puts the podium down, unused (the Escape key does this).
  cancel() {
    this.builder.cancel();
```

with:

```js
  // Puts the podium down, unused, and the tower that was chosen, if one was (the Escape key does this).
  cancel() {
    this.builder.cancel();
    this.select(null);
```

and the panel is shown every frame, for the reason above:

In `js/hand.js`, **replace** line 200:

```js
  // Every frame: the outline fades towards its color, the gold is shown, and a message that has been there long enough goes.
```

with:

```js
  // Every frame: the outline fades towards its color, the gold is shown (and the chosen tower with it, which can be one that the gold
  // has just paid for), and a message that has been there long enough goes.
```

In `js/hand.js`, after line 204, add:

```js
    if (this.selected) this.showPanel();
```

### The game

In `main.js`, the panel is made from the page, given to the hand, and its buttons are wired to the hand's methods:

In `js/main.js`, after line 73, add:

```js
  const panel = new Panel({
    panel: document.getElementById("panel"),
    title: document.getElementById("panel-title"),
    level: document.getElementById("panel-level"),
    upgrade: document.getElementById("panel-upgrade"),
    sell: document.getElementById("panel-sell"),
  });
```

In `js/main.js`, after line 83, add:

```js
    panel,
```

In `js/main.js`, after line 92, add:

```js
  panel.onUpgrade(() => hand.upgrade());
  panel.onSell(() => hand.sell());
```

### The tests of the hand

The tests of the hand are given a panel, and a tower that is only what the hand asks of one:

In `tests/hand.tests.js`, **replace** lines 12 to 13:

```js
    fixture.append(els.tray, els.gold, els.message);
    parts = els;
```

with:

```js
    const card = {
      panel: document.createElement("div"),
      title: document.createElement("div"),
      level: document.createElement("div"),
      upgrade: document.createElement("button"),
      sell: document.createElement("button"),
    };
    card.panel.hidden = true;
    card.panel.append(card.title, card.level, card.upgrade, card.sell);
    fixture.append(els.tray, els.gold, els.message, card.panel);
    parts = { ...els, card };
```

In `tests/hand.tests.js`, after line 33, add:

```js
      panel: new Panel(card),
```

In `tests/hand.tests.js`, **replace** line 42:

```js
        return { kind, col, row };
```

with:

```js
        return fakeTower(kind, col, row);
```

In `tests/hand.tests.js`, after line 50, add:

```js
  // A tower that is only what the hand asks of one: where it is, what it can do, its level, and that it can be taken away.
  const fakeTower = (kind, col, row) => ({
    kind,
    col,
    row,
    level: 1,
    spec: BENDERS[kind],
    disposed: false,
    setLevel(level) {
      this.level = level;
      this.spec = statsFor(BENDERS[kind], level);
    },
    dispose() {
      this.disposed = true;
    },
  });

```

and the new tests. They go **inside** the module: after the last test, and before the `});` that closes `QUnit.module("the Hand"`, so that they can see `hand`, `at`, `drag` and the others. (If you put them after that closing line, they die with `GRASS is not defined`.)

In `tests/hand.tests.js`, after line 333, add:

```js

  // Where on the page a point of the world is, at any height.
  const pageOfPoint = (x, y, z) => {
    const { right, up } = viewAxes();
    const sx = (x * right[0] + y * right[1] + z * right[2] - extents.centerX) / extents.halfWidth;
    const sy = (x * up[0] + y * up[1] + z * up[2] - extents.centerY) / extents.halfHeight;
    return { clientX: page.left + ((sx + 1) / 2) * page.width, clientY: page.top + ((1 - sy) / 2) * page.height, pointerType: "mouse" };
  };
  // Builds a tower of a kind in a cell with the hand, and lets go of everything.
  const build = (kind, [col, row]) => {
    drag(kind, at([col, row]));
    hand.release(at([col, row]));
    return state.towers[state.towers.length - 1];
  };
  const tap = (event) => {
    hand.move(event);
    hand.release(event);
  };
  const OTHER = [6, 3]; // another cell of grass

  QUnit.test("a tap on a tower chooses it: its panel comes up, its cell is outlined, and a ring shows how far it reaches", (assert) => {
    const tower = build("earth", GRASS);
    tap(at(GRASS));

    assert.strictEqual(hand.selected, tower);
    assert.true(hand.panel.visible);
    assert.strictEqual(parts.card.title.textContent, "Earth Kingdom");
    assert.strictEqual(parts.card.level.textContent, "Level 1 of 3, Novice");
    assert.true(hand.outline.visible);
    assert.true(hand.ring.visible);
    assert.strictEqual(hand.ring.mesh.scaling.x, BENDERS.earth.range);
  });

  QUnit.test("a tap on the bender, which is up above its cell, chooses it too", (assert) => {
    const tower = build("fire", GRASS);
    const { x, z } = cellCenter(...GRASS);
    tap(pageOfPoint(x, 2.2, z));

    assert.strictEqual(hand.selected, tower);
  });

  QUnit.test("and a tap on the cell in front of or behind it does not", (assert) => {
    build("fire", GRASS);
    tap(at([GRASS[0], GRASS[1] + 1]));
    assert.strictEqual(hand.selected, null);
    tap(at([GRASS[0] + 1, GRASS[1]]));
    assert.strictEqual(hand.selected, null);
  });

  QUnit.test("a finger is not held above itself when it taps a tower, as it is when it drags a podium", (assert) => {
    const tower = build("water", GRASS);
    tap({ ...at(GRASS), pointerType: "touch" });

    assert.strictEqual(hand.selected, tower);
  });

  QUnit.test("a tap on anything else puts the panel away: bare grass, road, or the tray", (assert) => {
    build("water", GRASS);
    for (const away of [at(OTHER), at(ROAD), onTray]) {
      tap(at(GRASS));
      assert.true(hand.panel.visible);
      tap(away);

      assert.strictEqual(hand.selected, null);
      assert.false(hand.panel.visible);
      assert.false(hand.ring.visible);
      assert.false(hand.outline.visible);
    }
  });

  QUnit.test("a tap on another tower changes the choice", (assert) => {
    const a = build("water", GRASS);
    const b = build("air", OTHER);
    tap(at(GRASS));
    tap(at(OTHER));

    assert.notStrictEqual(a, b);
    assert.strictEqual(hand.selected, b);
    assert.strictEqual(parts.card.title.textContent, "Air Nomad");
  });

  QUnit.test("the tap that builds a tower does not also choose it", (assert) => {
    build("water", GRASS);

    assert.strictEqual(hand.selected, null);
    assert.false(hand.panel.visible);
  });

  QUnit.test("pressing a podium puts the chosen tower away, and Escape does too", (assert) => {
    build("water", GRASS);
    tap(at(GRASS));
    hand.press("fire", { x: 500, y: 500 });
    assert.strictEqual(hand.selected, null);

    hand.cancel();
    tap(at(GRASS));
    assert.strictEqual(hand.selected !== null, true);
    hand.cancel();
    assert.strictEqual(hand.selected, null);
    assert.false(hand.panel.visible);
  });

  QUnit.test("an upgrade takes the gold, makes the tower the next level, and shows it: a bigger ring, and the next price", (assert) => {
    const tower = build("earth", GRASS);
    tap(at(GRASS));
    const gold = state.wallet.gold;
    const result = hand.upgrade();

    assert.true(result.ok);
    assert.strictEqual(tower.level, 2);
    assert.strictEqual(state.wallet.gold, gold - upgradeCost(BENDERS.earth, 1));
    assert.strictEqual(hand.selected, tower, "it is still chosen");
    assert.strictEqual(parts.card.level.textContent, "Level 2 of 3, Adept");
    assert.true(Math.abs(hand.ring.mesh.scaling.x - BENDERS.earth.range * LEVELS[1].range) < 1e-9);
    assert.strictEqual(parts.card.upgrade.textContent, `Make Master for ${upgradeCost(BENDERS.earth, 2)}`);
  });

  QUnit.test("with too little gold it says what the upgrade costs, and changes nothing", (assert) => {
    const tower = build("fire", GRASS);
    state.wallet.gold = 100;
    tap(at(GRASS));
    const result = hand.upgrade();

    assert.false(result.ok);
    assert.strictEqual(tower.level, 1);
    assert.strictEqual(state.wallet.gold, 100);
    assert.strictEqual(parts.message.textContent, "that costs 105, and there is 100");
    assert.true(parts.card.upgrade.classList.contains("poor"));
  });

  QUnit.test("gold that comes in turns the upgrade from poor to ready, as the frames go by", (assert) => {
    build("fire", GRASS);
    state.wallet.gold = 100;
    tap(at(GRASS));
    assert.true(parts.card.upgrade.classList.contains("poor"));
    state.wallet.earn(10);
    hand.update(0.016);

    assert.false(parts.card.upgrade.classList.contains("poor"));
  });

  QUnit.test("a tower at the top has nothing to upgrade, and says so if it is tried", (assert) => {
    const tower = build("air", GRASS);
    tower.setLevel(MAX_LEVEL);
    tap(at(GRASS));
    const result = hand.upgrade();

    assert.true(parts.card.upgrade.hidden);
    assert.false(result.ok);
    assert.strictEqual(parts.message.textContent, "that is as good as it gets");
  });

  QUnit.test("selling takes the tower away, gives back its share, puts the panel away, and frees the cell", (assert) => {
    const tower = build("earth", GRASS);
    tap(at(GRASS));
    const gold = state.wallet.gold;
    const result = hand.sell();

    assert.true(result.ok);
    assert.true(tower.disposed);
    assert.deepEqual(state.towers, []);
    assert.strictEqual(state.wallet.gold, gold + refundFor(BENDERS.earth, 1));
    assert.strictEqual(hand.selected, null);
    assert.false(hand.panel.visible);
    assert.false(hand.ring.visible);
    assert.strictEqual(parts.message.textContent, `sold for ${refundFor(BENDERS.earth, 1)}`);
    assert.true(hand.check("earth", { col: GRASS[0], row: GRASS[1] }).ok, "and a tower can be built there again");
  });

  QUnit.test("the buttons do nothing when no tower is chosen", (assert) => {
    build("earth", GRASS);
    const gold = state.wallet.gold;

    assert.strictEqual(hand.upgrade(), null);
    assert.strictEqual(hand.sell(), null);
    assert.strictEqual(state.wallet.gold, gold);
    assert.strictEqual(state.towers.length, 1);
  });

  QUnit.test("the panel's buttons are wired to the hand: a click upgrades and a click sells", (assert) => {
    const tower = build("water", GRASS);
    hand.panel.onUpgrade(() => hand.upgrade());
    hand.panel.onSell(() => hand.sell());
    tap(at(GRASS));
    parts.card.upgrade.click();
    assert.strictEqual(tower.level, 2);
    parts.card.sell.click();

    assert.deepEqual(state.towers, []);
  });
```

- **"A tap on the bender, which is up above its cell, chooses it too"** taps where the tower's *head* is on the screen, and **"a tap on the cell in front of or behind it does not"** says it is not a larger target than it should be.
- **"A finger is not held above itself when it taps a tower"** is the one that would have caught a tap on a phone choosing the cell above.
- **"Selling ... frees the cell"** builds again where the tower was: the rule that said *there is a tower there already* knows there isn't, because the tower is out of the list.

**Check:** open `tests.html`. 664 tests pass. Then open `index.html`, build a tower and tap it: the range ring comes up, and the card. Press the upgrade button: a ring appears on the ground, the card says the next level, and the range ring is wider. Sell it: it is gone, and so is the gold you spent, less 30 percent.

---

## Step 6: Is it still a game?

You have given the player a way to spend gold that the fairness tests know nothing of. The simulation plays the game with a plan that only buys podiums, so it has to be taught the other way too, or it is testing a game that isn't the one that is played.

First, a tower in the simulation has a level, and the brain is given the row for it:

In `tests/balance.tests.js`, **replace** lines 56 to 59:

```js
  // Fights one wave: `defense` is a list of { kind, col, row }. It gives back the lives lost and the gold earned.
  const fight = (route, defense, waveIndex) => {
    const dt = 0.05;
    const brains = defense.map(({ kind, col, row }) => new TowerBrain(BENDERS[kind], cellCenter(col, row)));
```

with:

```js
  // Fights one wave: `defense` is a list of { kind, col, row, level }, and a tower with no level is at the first. It gives back
  // the lives lost and the gold earned.
  const fight = (route, defense, waveIndex) => {
    const dt = 0.05;
    const brains = defense.map(({ kind, col, row, level = 1 }) => new TowerBrain(statsFor(BENDERS[kind], level), cellCenter(col, row)));
```

Then what a tower is *worth*. The score that the plan used (how much harm for the gold) becomes a function of the level, `power`, and counts the number of hits of an attack, which is what the fire nation needed:

In `tests/balance.tests.js`, **replace** lines 101 to 103:

```js
  // What a sensible player buys with `budget` gold, of the kinds of podium in `kinds`: again and again the podium and the
  // cell that give the most harm for the gold.
  const buy = (grid, route, budget, kinds = Object.keys(BENDERS)) => {
```

with:

```js
  // How much harm a tower does in a second to what walks along the road, if every bit of the road in its reach is walked
  // past: a measure of how good it is where it is, at a level.
  const power = (route, kind, at, level = 1) => {
    const stats = statsFor(BENDERS[kind], level);
    return (coverage(route, at, stats.range) * stats.damage * stats.attack.hits.length) / stats.cooldown;
  };

  // What a sensible player buys with `budget` gold, of the kinds of podium in `kinds`: again and again the podium and the
  // cell that give the most harm for the gold, or, if `upgrades` is true, the upgrade of a tower they have that does.
  const buy = (grid, route, budget, kinds = Object.keys(BENDERS), upgrades = false) => {
```

In `tests/balance.tests.js`, **replace** line 120:

```js
          const score = (coverage(route, at, spec.range) * spec.damage) / spec.cooldown / spec.cost;
```

with:

```js
          const score = power(route, kind, at) / spec.cost;
```

The plan buys again and again the best thing for the gold, and the best thing can now be an upgrade of a tower it has, scored as the harm it adds for what it costs:

In `tests/balance.tests.js`, **replace** lines 124 to 126:

```js
      if (!best) return defense;
      defense.push({ kind: best.kind, col: best.col, row: best.row });
      gold -= BENDERS[best.kind].cost;
```

with:

```js
      for (const tower of upgrades ? defense : []) {
        const cost = upgradeCost(BENDERS[tower.kind], tower.level);
        if (cost === null || cost > gold) continue;
        const at = cellCenter(tower.col, tower.row);
        const score = (power(route, tower.kind, at, tower.level + 1) - power(route, tower.kind, at, tower.level)) / cost;
        if (!best || score > best.score) best = { upgrade: tower, cost, score };
      }
      if (!best) return defense;
      if (best.upgrade) {
        best.upgrade.level++;
        gold -= best.cost;
      } else {
        defense.push({ kind: best.kind, col: best.col, row: best.row, level: 1 });
        gold -= BENDERS[best.kind].cost;
      }
```

And the best of the plans tries each with and without upgrades:

In `tests/balance.tests.js`, **replace** line 143:

```js
  // podium, and the one that loses fewest lives is the one that counts, since a player will find one that works.
```

with:

```js
  // podium, with upgrades or without, and the one that loses fewest lives is the one that counts, since a player will find one
  // that works.
```

In `tests/balance.tests.js`, **replace** lines 149 to 151:

```js
      const defense = buy(grid, route, budget, kinds);
      const lost = fight(route, defense, index).lost;
      if (!best || lost < best.lost) best = { lost, defense, kinds };
```

with:

```js
      for (const upgrades of [false, true]) {
        const defense = buy(grid, route, budget, kinds, upgrades);
        const lost = fight(route, defense, index).lost;
        if (!best || lost < best.lost) best = { lost, defense, kinds };
      }
```

And the test that says the new thing is worth having:

In `tests/balance.tests.js`, after line 157, add:

```js
  // The lives lost over a whole game by a player who spends the gold of each wave as one plan says, with every kind of podium.
  const livesLostWith = (grid, route, upgrades) => {
    let total = 0;
    for (let index = 0; index < WAVES.length; index++) total += fight(route, buy(grid, route, goldBefore(index), Object.keys(BENDERS), upgrades), index).lost;
    return total;
  };

```

In `tests/balance.tests.js`, after line 223, add:

```js
  QUnit.test("an upgrade is worth its gold: over all the waves, on both maps, a player who upgrades loses fewer lives than one who only buys podiums", (assert) => {
    let plain = 0;
    let upgraded = 0;
    for (const map of MAPS) {
      const grid = parseMap(map);
      const route = routeFor(grid);
      plain += livesLostWith(grid, route, false);
      upgraded += livesLostWith(grid, route, true);
    }

    assert.true(upgraded < plain, `${upgraded} lives lost with upgrades, and ${plain} without`);
  });

```

- **The game must still be a fight.** The test that says *the defense that holds the first wave cannot hold the last* is still there, and still passes with upgrades. A player who only upgrades the first towers they bought is not safe, and a game in which one tower made master could win it all would have to be fixed in the table of levels.
- **An upgrade is worth its gold,** and a test says it with the whole game: over every wave of both maps, a player who upgrades loses fewer lives than one who only buys podiums. If you make an upgrade cost a lot more, or give a lot less, this is the test that says that nobody would buy one.

**Check:** open `tests.html`. 665 tests pass.

---

## Step 7: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **Watch a combo.** Build a fire podium and watch its hands: six flames, left and right, one for each punch.
- **A level for every nation.** Upgrade one of each kind. The rings are the color of the nation, and an earth master reaches a fifth further, as the table says.
- **Sell for the whole price.** Change `refund` in `ECONOMY` to `1`. The test that says that building, upgrading and selling is not a way to make gold now fails, and says which kind of bender.
- **A fourth level.** Add a row to `LEVELS`: `{ name: "Grand Master", cost: 1.2, damage: 2.8, range: 1.3, tempo: 1.7 }`. A third ring appears, the panel shows the new name, and the tests that said *three* say so. (The ring is 2.06 across: wider than the cell. The test that says no ring is wider than the cell says so, and you can make `ringStep` smaller.)
- **A cheap fire nation.** Change the fire nation's `damage` from `3.2` to `6`: the table's test that says *a combo is about as much harm as the others do in one go* fails.
- **A tower that never forgets.** In `Tower.update`, remove the `if (this.brain.state === "idle")` around the line that gives the brain its row, and upgrade a tower in the middle of a combo. The test of a tower in the middle of an attack says that the brain changed its row under the attack.

---

## Troubleshooting

- **The splash never goes and the console says `statsFor is not defined`, `LEVELS is not defined` or `Panel is not defined`:** the new file is missing from `index.html`, or has no export block, or the name is missing from it.
- **A fire tower throws one flame:** the table's `hits` has one entry, or `Tower.update` uses `this.muzzle()` and not `this.muzzle(event.hit)`, or the brain uses `if` for the hits and not `while`.
- **`Cannot read properties of undefined (reading 'at')`:** a row of the table still has `hitAt` and no `hits`.
- **The upgrade button is gone:** `upgradeCost` gives `null` for a tower at the top, and `showPanel` passes it on; check the level.
- **Tapping a tower chooses the cell behind it:** `towerUnder` is looking at the ground only, or the heights are in the wrong order. The highest comes first.
- **Selling a tower leaves it standing:** `sell` in the hand doesn't call `tower.dispose()`, or the tower was removed from a *copy* of the list.
- **An upgraded tower stays at its old speed:** `setLevel` doesn't replace `this.spec`, or the brain is given the new row only while it is attacking.
- **`GRASS is not defined` (or `hand`, `at`, `drag`) in the new tests of the hand:** they are outside the module. Move the `});` that closes `QUnit.module("the Hand"` to the end of the file, after the last new test.
- **`TOWER_VIEW.ring` is `undefined`, or the rings are the wrong size, or `buildRings` is in the middle of the constructor:** the four ring numbers are missing from `TOWER_VIEW`, or `buildRings` was added inside `class Tower`. It goes above the class.
- **The panel puts itself away when you press a button on it:** the panel's `pointerup` handlers don't stop the event.

---

## What you have

Towers that are not the same, and that get better: attacks that are lists of hits (a combo of six, a bolt for each), levels that are rows of a table and come out as the same kind of row a brain already reads, rings on the ground that show them, paying and selling as small rules, and a panel that comes up when a tower is tapped, behind a test suite of 665 tests and a simulation that plays the game with and without upgrades.

**Next up:** elements. The next tutorial gives each nation **an effect** of its own: water slows what it hits, fire burns it, earth stuns it, and air pushes it back along the road.
