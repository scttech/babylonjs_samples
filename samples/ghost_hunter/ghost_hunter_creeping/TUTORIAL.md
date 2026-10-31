# Tutorial: Ghost Hunter Creeping -- Playtest Feedback

This is the tenth tutorial of the Ghost Hunter series, and it is different: it changes no feature, it fixes a **feel**. A player tried the game on a phone and said: *I'm constantly getting attacked. I just want them creeping around and scaring me.* They were right. Creatures walked up, lunged, recovered, and lunged again every couple of seconds, and the director sent them often, so the red flash of a strike was almost always on the screen. A horror game is mostly *waiting*, and the scare means something only because it is rare. This sample makes the creatures **creep**: they come to a distance, loiter and circle, watching, for as long as their patience lasts, rush **once**, and then draw back and go. And it makes the director and the scare **rarer and gentler**.

It is a good tutorial to read for the method as much as for the code: **a complaint becomes a number, a number becomes a rule, a rule becomes a test.**

By the end you'll have:

- **A creep**: a state of loitering at a distance of the creature's own, circling slowly and facing the player, with a patience of its own, after which it rushes
- **One rush, and a retreat**: after a rush (and a moment to recover) the creature draws back for a few seconds, fading, and is gone: it does not come again
- **Differences**: each creature has its own distance, patience and side; the spider is bolder than the ghoul
- **Rarer visits**: the director's dread builds at a third of the rate, with a rest of 25 seconds after a scare, and two at once at most
- **A gentler flash** at the Creepy and Terrifying levels
- **Loitering in the developer panel**: how patient, how near, how fast it circles, and who is loitering and for how long
- Tests that were **changed** to say the new rules, and new tests for the creep: **371 passing tests**

**What you'll learn:** how to turn "it is annoying" into numbers that can be tuned, how to give an enemy a rhythm (approach, loiter, strike, withdraw), why the number a thing waits matters more than the number it hits for, and how to change behaviour that tests depend on without losing the tests.

**Before you start:** do the [Tools tutorial](../ghost_hunter_tools/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Tools sample. Nothing new is added: ten files change a little.

Open `tests.html` before you change anything. You should see **361 passing tests**: the ones of the Tools sample.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first).

## The shape of the step

1. **Creatures creep**: loiter, rush once, retreat.
2. **The director and the scare**: rarer and gentler.
3. **The sound and the bodies follow**.
4. **The panel**.
5. **Try it**.

## Step 1: Creatures creep

The old creature was a state machine of *lurk, stalk, lunge, recover* and round again. The new one is *lurk, stalk, **creep**, lunge, recover, **retreat***, and then it is gone.

| State | What it does | Goes on to |
|-------|--------------|------------|
| `stalk` | walks to the player, until it is at **its own distance** | `creep`, when it gets there (or `lunge` if it is already close) |
| `creep` | **loiters**: faces the player, circles slowly, keeps its distance, changes direction now and then, and waits | `lunge`, when its **patience** runs out; `stalk` if the player goes away |
| `lunge` | rushes, once, at the player | `recover` |
| `recover` | a moment to get its breath (a skeleton screams) | `retreat` |
| `retreat` | draws back from the player, fading | gone |

All the numbers are in a new table, `CREEP`: the distance range, the patience range, how fast it circles, how firmly it keeps its distance, how long it draws back, how long it takes to fade. **A kind can override any of them** with a `creep` of its own in its row of the table of creatures: the spider's patience is 5 to 12 seconds, a little less than the others' 8 to 20, and it circles faster, so it is the bold one.

A few details are what make it feel like something:

- **Each creature picks its own numbers when it is made** (a distance and a patience from the ranges, a side to circle): two ghouls are not alike. The random function is given in, as always, so a test can make a creature with the least patience (`random: () => 0`) or the middle.
- **It loiters outside the distance it rushes from**, and a test says so for every kind: a creature that crept to within its own lunge range would be rushing already.
- **The patience does not run while it is stunned.** A stun gives the player time, and the test says that it really does.
- **It follows if the player moves away** (more than 1.8 times its distance), so a player cannot just walk off.
- **The rush starts from where it is.** It used to start within the lunge range; now it runs the whole way, for as long as it takes (the distance over the speed, and a little more).

In `js/creatures.js`, after line 8, add:

```js
    creep: { distance: [2.4, 3.6], patience: [5, 12], sidestep: 0.6 },
```

In `js/creatures.js`, after line 42, add:

```js
// How a creature creeps. It does not rush at the player: it comes to a distance (a different one for each creature) and loiters there, circling
// slowly and watching, for as long as its patience lasts, and only then does it rush, once. After that it draws back and goes. All the numbers
// are in this table, and a kind can change any of them with a `creep` of its own in its row.
const CREEP = {
  distance: [3, 4.5], // metres from the player at which it stops coming and begins to loiter
  patience: [8, 20], // seconds it loiters before it rushes
  sidestep: 0.45, // metres a second it circles at
  hold: 0.8, // how firmly it keeps its distance while it circles
  retreatSeconds: 5, // how long it draws back for, after a rush
  retreatSpeed: 0.9, // a multiple of its walking speed
  fadeSeconds: 1.5, // and the last of that time, in which it fades
};

```

In `js/creatures.js`, after line 222, add:

```js
    const creep = { ...CREEP, ...(table.creep || {}) };
    this.creep = creep;
    this.random = random;
    this.creepAt = creep.distance[0] + random() * (creep.distance[1] - creep.distance[0]); // how near it comes before it loiters
    this.patience = creep.patience[0] + random() * (creep.patience[1] - creep.patience[0]); // how long it loiters
    this.waited = 0; // seconds it has loitered
    this.side = random() < 0.5 ? -1 : 1; // which way it circles
    this.turnIn = 2 + random() * 4; // seconds to it changing its mind about which way
    this.leaving = 0; // seconds it has been drawing back
    this.fade = 1; // 1 is all there; it fades as it goes
```

In `js/creatures.js`, after line 280, add:

```js
  // The rush: it runs at the player, once. `distance` is how far it has to go (0 if it is close already and has the table's time for it).
  _rush(player, distance) {
    const table = this.table;
    this.state = "lunge";
    this.timer = distance > 0 ? distance / table.lungeSpeed + 0.4 : table.lungeTime;
    this.lunge = [player.position[0] - this.position[0], player.position[2] - this.position[2]];
    this.events.push("lunge");
  }

  // Loitering: facing the player, circling slowly, and keeping to its distance (a little nearer, a little further). Gives whether it moved.
  _loiter(seconds, player, distance) {
    const creep = this.creep;
    const dx = player.position[0] - this.position[0];
    const dz = player.position[2] - this.position[2];
    const length = distance || 1;
    const [ux, uz] = [dx / length, dz / length];
    this.yaw = turnToward(this.yaw, Math.atan2(dx, dz), this.table.turnRate * seconds);
    this.turnIn -= seconds;
    if (this.turnIn <= 0) {
      this.side = -this.side;
      this.turnIn = 2 + this.random() * 4;
    }
    const wanted = this.creepAt + Math.sin(this.clock * 0.7 + this.id) * 0.4;
    const radial = Math.max(-0.5, Math.min(0.5, (distance - wanted) * creep.hold)); // towards the player if it is too far
    const sideways = this.side * creep.sidestep;
    const moveX = uz * sideways + ux * radial;
    const moveZ = -ux * sideways + uz * radial;
    this.position[0] += moveX * seconds;
    this.position[2] += moveZ * seconds;
    this.gait += (Math.hypot(moveX, moveZ) * seconds) / this.table.strideLength;
    return true;
  }

```

In `js/creatures.js`, **replace** lines 354 to 360:

```js
      walking = this._walk(seconds, player.position, table.speed);
      if (distance <= table.lungeRange) {
        this.state = "lunge";
        this.timer = table.lungeTime;
        this.lunge = [player.position[0] - this.position[0], player.position[2] - this.position[2]];
        this.events.push("lunge");
      }
```

with:

```js
      if (distance <= table.lungeRange) {
        this._rush(player, 0);
      } else if (distance <= this.creepAt) {
        this.state = "creep";
      } else {
        walking = this._walk(seconds, player.position, table.speed);
      }
    } else if (this.state === "creep") {
      walking = this._loiter(seconds, player, distance);
      this.waited += seconds;
      if (this.waited >= this.patience) this._rush(player, distance);
      else if (distance > this.creepAt * 1.8) this.state = "stalk"; // the player has gone away: it follows
```

In `js/creatures.js`, **replace** line 387:

```js
      if (this.timer <= 0) this.state = "stalk";
```

with:

```js
      if (this.timer <= 0) {
        this.state = "retreat"; // it has had its rush, and does not come again
        this.leaving = 0;
      }
    } else if (this.state === "retreat") {
      this.leaving += seconds;
      const away = [this.position[0] - player.position[0], 0, this.position[2] - player.position[2]];
      const far = [this.position[0] + away[0] * 10, 0, this.position[2] + away[2] * 10];
      walking = this._walk(seconds, far, table.speed * this.creep.retreatSpeed);
      this.fade = Math.max(0, Math.min(1, (this.creep.retreatSeconds - this.leaving) / this.creep.fadeSeconds));
      if (this.leaving >= this.creep.retreatSeconds) this.done = true;
```

In `js/creatures.js`, **replace** line 407:

```js
    const crouch = this.state === "fall" ? -0.5 : this.state === "lunge" ? 0 : this.state === "stalk" && this.lastDistance < 3 ? 0.5 : 0;
```

with:

```js
    const crouch = this.state === "fall" ? -0.5 : this.state === "lunge" ? 0 : (this.state === "stalk" && this.lastDistance < 3) || this.state === "creep" ? 0.5 : 0;
```

In `js/creatures.js`, **replace** lines 482 to 484:

```js
  module.exports = { CREATURES, CREATURE_MAX, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie });
```

with:

```js
  module.exports = { CREATURES, CREATURE_MAX, CREEP, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie };
} else {
  Object.assign(window, { CREATURES, CREATURE_MAX, CREEP, CREATURE_GRAVITY, solveLeg, footOffset, spiderPose, ghoulPose, skeletonPose, POSES, Creature, Menagerie });
```

Things to notice:

- **`_loiter` is a small piece of geometry.** The direction to the player is a unit vector `(ux, uz)`; the way to circle is at right angles to it, `(uz, -ux)`; and the creature keeps its distance by moving a little towards or away from the player, in proportion to how far it is from the distance it wants (which itself drifts a little, with a sine of the clock, so it does not sit on a ring).
- **`fade`** is 1 until the last of the retreat and then goes to 0, and the bodies read it (Step 3).
- **A retreating creature is still alive**: it can be hurt, stunned and captured. A player who is quick can finish it.

### Tests

The tests that said the old rules are changed to say the new ones. A creature that is already close still lunges at once. A lunge touches *once*, and the creature then **goes**: the test that said "and comes again" now says "and it has gone". The tests of the model kinds give their creatures a short patience (they need to see a rush in twenty seconds). And a **new module** says the creep: it comes to its distance and stops there without rushing; it circles, and keeps its distance as it does; it rushes after about as long as its patience (within a fifth of a second), not before; a stun does not count; a player who goes away is followed; after the rush it draws back and fades and is gone in the table's time; it can still be captured; every kind has a distance outside its lunge range and a patience of its own; and two creatures are not alike.

In `tests/creatures.tests.js`, **replace** lines 176 to 177:

```js
  QUnit.test("it lunges when it is close, and says so once", (assert) => {
    const creature = make("spider", [0, 0, 2]);
```

with:

```js
  QUnit.test("it lunges at once when it is already close, and says so once", (assert) => {
    const creature = make("spider", [0, 0, 1.4]);
```

In `tests/creatures.tests.js`, **replace** lines 184 to 190:

```js
  QUnit.test("a lunge reaches the player: it touches, and recovers, and comes again", (assert) => {
    const creature = make("spider", [0, 0, 3]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 12);
    assert.true(events.includes("touch"));
    assert.true(creature.touches >= 2, `it came again: ${creature.touches}`);
```

with:

```js
  QUnit.test("a lunge reaches the player: it touches, recovers, and then draws back and goes: it does not come again", (assert) => {
    const creature = make("spider", [0, 0, 1.4]);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 30);
    assert.strictEqual(events.filter((e) => e === "touch").length, 1);
    assert.strictEqual(creature.touches, 1, "once");
    assert.true(creature.done, "and it has gone");
```

In `tests/creatures.tests.js`, after line 206, add:

```js
    assert.strictEqual(creature.state, "retreat", "and then it draws back");
```

In `tests/creatures.tests.js`, **replace** line 277:

```js
    const spider = menagerie.spawn("spider", [0, 0, 2.5]);
```

with:

```js
    const spider = menagerie.spawn("spider", [0, 0, 1.4]);
```

In `tests/creatures.tests.js`, after line 309, add:

```js

QUnit.module("creeping", () => {
  const player = { position: [0, 1.4, 0] };
  const quick = (kind, patience) => new Creature({ id: 1, kind, position: [0, 0, 9], table: { ...CREATURES[kind], creep: { patience: [patience, patience] } }, random: () => 0.5 });
  const run = (creature, seconds, step = 0.05) => {
    const events = [];
    for (let t = 0; t < seconds; t += step) {
      creature.update(step, player);
      events.push(...creature.events);
      creature.events = [];
    }
    return events;
  };

  QUnit.test("it comes to its distance and stops there, and does not rush", (assert) => {
    const creature = quick("ghoul", 1000);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 60);
    assert.strictEqual(creature.state, "creep");
    assert.false(events.includes("lunge"));
    assert.true(Math.abs(creature.distanceTo(player.position) - creature.creepAt) < 0.8, `${creature.distanceTo(player.position).toFixed(1)} m, wanting ${creature.creepAt.toFixed(1)}`);
  });

  QUnit.test("it circles while it loiters, and keeps its distance as it does", (assert) => {
    const creature = quick("skeleton", 1000);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    run(creature, 20);
    const bearings = [];
    for (let i = 0; i < 400; i++) {
      run(creature, 0.1, 0.05);
      bearings.push(Math.atan2(creature.position[0], creature.position[2]));
      assert.true(creature.distanceTo(player.position) > 1.8 && creature.distanceTo(player.position) < creature.creepAt + 1.5);
    }
    assert.true(Math.max(...bearings) - Math.min(...bearings) > 0.3, "it has moved round the player");
  });

  QUnit.test("when its patience is out it rushes, once, from where it is, and touches", (assert) => {
    const creature = quick("ghoul", 3);
    creature.state = "stalk";
    creature.yaw = Math.PI;
    const events = run(creature, 40);
    assert.strictEqual(events.filter((e) => e === "lunge").length, 1);
    assert.strictEqual(events.filter((e) => e === "touch").length, 1);
  });

  QUnit.test("it rushes after about as long as its patience, and not before", (assert) => {
    const creature = quick("ghoul", 6);
    creature.state = "creep";
    creature.creepAt = 4;
    creature.position = [0, 0, 4];
    let seconds = 0;
    while (creature.state === "creep" && seconds < 30) { creature.update(0.05, player); seconds += 0.05; }
    assert.true(Math.abs(seconds - 6) < 0.2, `${seconds.toFixed(1)} s`);
    assert.strictEqual(creature.state, "lunge");
  });

  QUnit.test("a stun gives the player time: it does not count while it is stopped", (assert) => {
    const creature = quick("ghoul", 2);
    creature.state = "creep";
    creature.position = [0, 0, 4];
    creature.stun(2);
    run(creature, 1.9);
    assert.strictEqual(creature.waited, 0);
  });

  QUnit.test("a player who goes away is followed", (assert) => {
    const creature = quick("ghoul", 1000);
    creature.state = "creep";
    creature.position = [0, 0, 4];
    creature.update(0.05, { position: [0, 1.4, -30] });
    assert.strictEqual(creature.state, "stalk");
  });

  QUnit.test("after its rush it draws back and fades, and is gone in the table's time", (assert) => {
    const creature = quick("skeleton", 1000);
    creature.state = "retreat";
    creature.position = [0, 0, 3];
    run(creature, creature.creep.retreatSeconds - creature.creep.fadeSeconds - 0.1);
    assert.strictEqual(creature.fade, 1, "all there while it goes");
    assert.true(creature.distanceTo(player.position) > 3.5, "further away");
    run(creature, creature.creep.fadeSeconds / 2 + 0.1);
    assert.true(creature.fade > 0 && creature.fade < 1, "fading");
    run(creature, creature.creep.fadeSeconds);
    assert.true(creature.done);
  });

  QUnit.test("a creature that is retreating can still be hurt and captured", (assert) => {
    const creature = quick("skeleton", 1000);
    creature.state = "retreat";
    assert.true(creature.alive);
    assert.true(creature.capture());
  });

  QUnit.test("every kind creeps: it has a distance and a patience, and the spider is bolder than the ghoul", (assert) => {
    for (const kind of Object.keys(CREATURES)) {
      const creature = new Creature({ id: 1, kind, position: [0, 0, 9], random: () => 0.5 });
      assert.true(creature.creepAt > CREATURES[kind].lungeRange, `${kind}: it loiters outside the distance it rushes from`);
      assert.true(creature.patience > 3, kind);
    }
    const spider = new Creature({ id: 1, kind: "spider", position: [0, 0, 9], random: () => 0.5 });
    const ghoul = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 9], random: () => 0.5 });
    assert.true(spider.patience < ghoul.patience && spider.creepAt < ghoul.creepAt);
  });

  QUnit.test("two creatures are not alike: their distance, patience and side are their own", (assert) => {
    let n = 0;
    const random = () => ((n++ * 0.37) % 1);
    const a = new Creature({ id: 1, kind: "ghoul", position: [0, 0, 9], random });
    const b = new Creature({ id: 2, kind: "ghoul", position: [0, 0, 9], random });
    assert.notStrictEqual(a.creepAt, b.creepAt);
    assert.notStrictEqual(a.patience, b.patience);
  });
});
```

In `tests/staticbody.tests.js`, **replace** line 110:

```js
      const creature = new Creature({ id: 1, kind, position: [0, 0, 5], random: () => 0 });
```

with:

```js
      const creature = new Creature({ id: 1, kind, position: [0, 0, 5], table: { ...CREATURES[kind], creep: { patience: [0.5, 0.5] } }, random: () => 0 });
```

In `tests/staticbody.tests.js`, **replace** line 114:

```js
      for (let t = 0; t < 10; t += 0.05) {
```

with:

```js
      for (let t = 0; t < 20; t += 0.05) {
```

Open `tests.html`. You should see **371 passing tests**: 10 more.

## Step 2: The director and the scare

The creep makes each *visit* longer (a creature is about for fifteen to thirty seconds), so the director can come **less often**: the dread builds at a third of the rate (a strike about every half minute), the rest after a scare is 25 seconds and not 6, and there are two at most at once.

In `js/director.js`, **replace** line 12:

```js
  riseRate: 0.055, // tension a second while it is quiet, at an intensity of 1
```

with:

```js
  riseRate: 0.02, // tension a second while it is quiet, at an intensity of 1: something about every half minute
```

In `js/director.js`, **replace** lines 16 to 17:

```js
  cooldown: 6, // seconds after a scare in which nothing new turns up: the rest
  maxActive: 3, // creatures alive at once, at an intensity of 1 (it rises with the intensity)
```

with:

```js
  cooldown: 25, // seconds after a scare in which nothing new turns up: the rest
  maxActive: 2, // creatures alive at once, at an intensity of 1 (it rises with the intensity)
```

The red flash of a strike is the other half of the complaint. At the Creepy level it is now 30% as bright (it was half), the shake 40%; at Terrifying the flash is 80%. The Gentle level never had one.

In `js/scare.js`, **replace** lines 11 to 12:

```js
    creepy: { label: "Creepy", note: "The proper thing: sudden, but not cruel.", volume: 0.8, flash: 0.5, shake: 0.5, vibrate: 1, silence: 1, vignette: 0.75 },
    terrifying: { label: "Terrifying", note: "Loud, sudden and flashing. You asked.", volume: 1, flash: 1, shake: 1, vibrate: 1.6, silence: 1.4, vignette: 1 },
```

with:

```js
    creepy: { label: "Creepy", note: "The proper thing: sudden, but not cruel.", volume: 0.8, flash: 0.3, shake: 0.4, vibrate: 1, silence: 1, vignette: 0.75 },
    terrifying: { label: "Terrifying", note: "Loud, sudden and flashing. You asked.", volume: 1, flash: 0.8, shake: 1, vibrate: 1.6, silence: 1.4, vignette: 1 },
```

Two director tests ran the director for thirty seconds and three seconds and expected a strike and some dread: they run for ninety and ten.

In `tests/director.tests.js`, **replace** line 148:

```js
    run(director, 3);
```

with:

```js
    run(director, 10);
```

In `tests/director.tests.js`, **replace** line 154:

```js
    const orders = run(director, 30);
```

with:

```js
    const orders = run(director, 90);
```

## Step 3: The sound and the bodies follow

A loitering creature makes a sound (at 60% of a stalking one's), and one that is drawing back makes less. The model with bones plays its idle (a slow walk) when it loiters and its walk when it draws back; the bodies fade with `creature.fade`.

In `js/audio.js`, **replace** line 25:

```js
  const active = state === "stalk" ? 1 : state === "lunge" ? 1.6 : state === "lurk" ? 0.3 : state === "recover" ? 0.4 : 0;
```

with:

```js
  const active = state === "stalk" ? 1 : state === "lunge" ? 1.6 : state === "creep" ? 0.6 : state === "retreat" ? 0.35 : state === "lurk" ? 0.3 : state === "recover" ? 0.4 : 0;
```

In `js/creaturemesh.js`, **replace** line 156:

```js
    return { lurk: "idle", stalk: "walk", lunge: "lunge", recover: "recover", dying: "die" }[state] || "idle";
```

with:

```js
    return { lurk: "idle", stalk: "walk", creep: "idle", lunge: "lunge", recover: "recover", retreat: "walk", dying: "die" }[state] || "idle";
```

In `js/creaturemesh.js`, **replace** line 172:

```js
    this.fitted.setVisibility(fall.opacity);
```

with:

```js
    this.fitted.setVisibility(fall.opacity * creature.fade);
```

In `js/staticbody.js`, **replace** line 97:

```js
    this.fitted.setVisibility(motion.opacity);
```

with:

```js
    this.fitted.setVisibility(motion.opacity * creature.fade);
```

## Step 4: The panel

New rows in the developer panel, so that the numbers can be tuned while it is played: how patient they are (the least and the most), how near they come and how far they stay, how fast they circle, and a read-out of who is loitering and for how long (`ghoul 7/12 s`).

In `js/main.js`, after line 666, add:

```js
          control("loiter: patience, least (s)", () => CREEP.patience[0], (value) => { CREEP.patience[0] = Math.min(value, CREEP.patience[1]); }, 1, 40, 1),
          control("loiter: patience, most (s)", () => CREEP.patience[1], (value) => { CREEP.patience[1] = Math.max(value, CREEP.patience[0]); }, 2, 60, 1),
          control("loiter: nearest it comes (m)", () => CREEP.distance[0], (value) => { CREEP.distance[0] = Math.min(value, CREEP.distance[1]); }, 2, 6, 0.1),
          control("loiter: furthest it stays (m)", () => CREEP.distance[1], (value) => { CREEP.distance[1] = Math.max(value, CREEP.distance[0]); }, 3, 8, 0.1),
          slider("how fast it circles (m/s)", CREEP, "sidestep", 0, 1.5, 0.05),
          readout("loitering", () => creatures.items.filter((creature) => creature.state === "creep").map((creature) => `${creature.kind} ${Math.round(creature.waited)}/${Math.round(creature.patience)} s`).join(", ") || "none"),
```

## Step 5: Try it

Open the page with `?dev`, press the button, and **do nothing for half a minute**.

- Nothing happens, for a long time. Then a creak from behind you: something has come in.
- It **walks up**, and then **stops** a few metres away. It **circles**, facing you, slowly. In the panel, **loitering** says `ghoul 5/14 s`: how long it has waited and how long it will. If you turn to look at it, it is still circling. If you turn away, it is still there.
- When its patience is out, it **rushes**: the sound, the flash (soft at Creepy), the shake. It touches, the scare is over, and it **draws back and fades**.
- Then **nothing**, for at least 25 seconds.
- Switch on the light (**F**) while one loiters: a spider is stunned and the patience stops. Hold the beam (**B**) on a skeleton: it is captured *before* its patience is out.
- In the panel, set **patience** to 2 and 3: they rush almost at once. Set it to 40 and 60: you can walk round the room with one watching you, and it will take a long time to come. Set **how fast it circles** to 0: it stands and stares.

**The question for you**: is it creepy, or is it boring? If it is boring, shorten the patience or the distance, or the director's rest. If it is still too much, lengthen them. Tell me the numbers that feel right and they go in the tables.

## Step 6: Tests, all together

Open `tests.html`. You should see **371 passing tests**.

## Recap: what changed

| What | Where |
|------|-------|
| How a creature creeps | `CREEP`, the `creep` and `retreat` states, `_loiter`, `_rush` in `creatures.js` |
| How often they come | `HUNT.riseRate`, `cooldown`, `maxActive` in `director.js` |
| How hard the flash is | the levels in `scare.js` |
| The sound and the look of it | `audio.js`, `creaturemesh.js`, `staticbody.js` |
| The numbers, while playing | `main.js` |

## Challenges

- **Eyes on you.** A creature that is looked at could be less patient (it is noticed) or more (it is shy). The tools already know where the player is aiming. What is a *rule* for it, and what is the test?
- **A second visit.** A creature that was captured should never come back, but one that retreated might, much later. Where would "it comes back" live: in the creature, the director, or a list of the ones that have gone?
- **The slowest scare.** Write a test that runs the director and the creatures together for twenty simulated minutes with a player who never moves and counts the strikes. What is a sensible number, and which table sets it?
- **Boredom.** A player who has seen nothing for two minutes is bored. Give the director a `bored` timer and make the dread rise faster when it is long. What is the right test?
