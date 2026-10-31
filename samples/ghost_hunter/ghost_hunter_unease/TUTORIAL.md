# Tutorial: Ghost Hunter Unease -- From Startling to Frightening

This is the eleventh tutorial of the Ghost Hunter series, and the second made from playtest feedback. The player said three things:

1. *"I don't like the red flash and sound effect. That isn't creepy, it just feels annoying."*
2. *"The skeleton comes up too close and starts clipping, I can only see parts of it."*
3. *"The generated ghosts are cool but not creepy enough."*

All three are the same lesson. **Startling is not frightening.** A bang and a flash make a person jump and then resent it; what stays with them is the unease of something that is *slightly wrong* and *getting closer*. So this sample takes things *out* (the flash of light, the blare) and puts in things that are quieter and worse: **the lights stuttering out**, **a breath and a heartbeat's thump instead of a stinger**, creatures that **keep their distance** (so the player sees the whole thing, and it is scarier for being seen), and a ghost that is **tall, thin, hollow-eyed, with its mouth open and its arms reaching**, that stutters when you look at it, and that **only moves when you are not looking**.

By the end you'll have:

- **A blackout** in place of a flash: a stutter of darkness (out, back for a moment, out again, then slowly back), as if something had got at the power
- **A presence** in place of a stinger: a deep thump you feel more than hear, and a long breath out, close to the ear
- **Creatures that keep their distance**: they stop at arm's length (about a metre and a half for a person), and never inside the player, so they fit in the view
- **A ghost that creeps**: it stands still while it is looked at (and stutters, as if not quite there), and **comes closer a little at a time whenever you look away**, up to a nearest distance of its own
- **A creepier ghost**: taller and thinner, a long head, pinpoint eyes at the bottom of black pits, a mouth that opens wider as it comes near, two long arms that rise to reach, a head on one side, and a colder, paler colour
- Tests that said the old rules **changed**, and new tests for each new rule: **387 passing tests**

**What you'll learn:** the difference between a startle and a dread, how to use *where the player is looking* as game state, how to make an effect out of its absence (a blackout, a breath), and how the numbers of a character (its height, its pace, its nearest approach) are as much its design as its picture.

**Before you start:** do the [Creeping tutorial](../ghost_hunter_creeping/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Creeping sample. Nothing new is added: eleven files change.

Open `tests.html` before you change anything. You should see **371 passing tests**: the ones of the Creeping sample.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first).

## The shape of the step

1. **The lights go out**: no more red flash, no more blare.
2. **Creatures keep their distance**.
3. **A ghost that creeps**: it moves when you do not look.
4. **A creepier ghost**.
5. **Try it**.

## Step 1: The lights go out

### A blackout, not a flash

The old strike was a white-and-red flash that decayed smoothly. A light that comes on is *a camera*: it is sudden, and it is over, and it says nothing. A light that **goes out** is the opposite: it takes away the one thing the player has, which is seeing. `blackout(age)` gives how dark it is at a moment after the strike: **out at once** (1), **back for a moment** (0.1), **out again** (0.85), back (0.05), and then a slow fade to nothing over the aftershock. It is a *stutter*: the eye can never quite settle. It is multiplied by the strike's strength and by the level's number, so the Gentle level still has none.

The flash layer is now black (`#000`) and the levels' numbers for it are a little different (Creepy 0.55, Terrifying 0.85; the shake is lower too).

In `js/scare.js`, **replace** lines 11 to 12:

```js
    creepy: { label: "Creepy", note: "The proper thing: sudden, but not cruel.", volume: 0.8, flash: 0.3, shake: 0.4, vibrate: 1, silence: 1, vignette: 0.75 },
    terrifying: { label: "Terrifying", note: "Loud, sudden and flashing. You asked.", volume: 1, flash: 0.8, shake: 1, vibrate: 1.6, silence: 1.4, vignette: 1 },
```

with:

```js
    creepy: { label: "Creepy", note: "The proper thing: sudden, but not cruel.", volume: 0.8, flash: 0.55, shake: 0.3, vibrate: 1, silence: 1, vignette: 0.75 },
    terrifying: { label: "Terrifying", note: "Loud, sudden and flashing. You asked.", volume: 1, flash: 0.85, shake: 0.8, vibrate: 1.6, silence: 1.4, vignette: 1 },
```

In `js/scare.js`, after line 65, add:

```js
// The lights go out. A strike is not a flash of light (that is a camera, and it is annoying); it is a stutter of darkness, as if something
// had got at the power: out, back for a moment, out again, and then slowly back. `age` is the seconds since the strike. Gives how dark it is,
// 0 to 1.
function blackout(age, table = SCARE) {
  if (age < 0) return 0;
  if (age < 0.14) return 1;
  if (age < 0.26) return 0.1;
  if (age < 0.5) return 0.85;
  if (age < 0.62) return 0.05;
  const left = Math.max(0, 1 - (age - 0.62) / (table.duration.strike + table.duration.aftershock - 0.62));
  return 0.6 * left * left;
}

```

In `js/scare.js`, **replace** line 149:

```js
      flash = this.strength * level.flash * decay;
```

with:

```js
      flash = this.strength * level.flash * blackout(into, this.table);
```

In `js/scare.js`, **replace** lines 161 to 163:

```js
  module.exports = { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, shakeOffset, shakeView, ScareSequence };
} else {
  Object.assign(window, { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, shakeOffset, shakeView, ScareSequence });
```

with:

```js
  module.exports = { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, blackout, shakeOffset, shakeView, ScareSequence };
} else {
  Object.assign(window, { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, blackout, shakeOffset, shakeView, ScareSequence });
```

In `css/scare.css`, **replace** line 34:

```css
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.95), rgba(196, 22, 31, 0.8));
```

with:

```css
  background: #000; /* the lights go out: a stutter of darkness, not a flash of light */
```

### A presence, not a stinger

The old stinger was four notes that rub against each other, falling an octave and a half, with noise on top: a film's blare. It is replaced by something that does not announce itself. A **deep thump** (a sine that falls from 70 to 28 hertz: below most phones' speakers, so it is felt in the chest and the headphones more than heard) and, close to the ear, **a long breath out**: noise through a band-pass filter that slides down while its volume swells and fades, as of something that has been standing very close for a long time. Its volume is a little over half the old stinger's.

In `js/audio.js`, **replace** line 3:

```js
// you, and the stinger of a strike. Every sound that belongs to a place is **positional**: it comes from where the creature is, through
```

with:

```js
// you, and the presence of a strike (a deep thump and a long breath: not a blare). Every sound that belongs to a place is **positional**: it comes from where the creature is, through
```

In `js/audio.js`, **replace** line 14:

```js
  stinger: { volume: 1, seconds: 1.4 },
```

with:

```js
  stinger: { volume: 1, seconds: 1.8 },
```

In `js/audio.js`, **replace** lines 192 to 204:

```js
      const length = this.table.stinger.seconds;
      for (const frequency of [311, 329, 466, 622]) { // notes that rub against each other
        const oscillator = context.createOscillator();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(frequency * 2, start);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, start + length);
        oscillator.connect(gain);
        oscillator.start(start);
        oscillator.stop(start + length);
      }
      this._noiseSource(gain, start, 0.35);
      gain.gain.setValueAtTime(this.table.stinger.volume * strength * 0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + length);
```

with:

```js
      // Not a blare: a presence. A deep thump that you feel more than hear, and close to the ear a long breath out, as of something that has
      // been standing very close for a long time, with a sliver of a whisper in it.
      const length = this.table.stinger.seconds;
      const thump = context.createOscillator();
      thump.type = "sine";
      thump.frequency.setValueAtTime(70, start);
      thump.frequency.exponentialRampToValueAtTime(28, start + 0.5);
      thump.connect(gain);
      thump.start(start);
      thump.stop(start + 0.55);
      const breath = context.createBiquadFilter();
      breath.type = "bandpass";
      breath.Q.value = 1.4;
      breath.frequency.setValueAtTime(700, start + 0.1);
      breath.frequency.exponentialRampToValueAtTime(350, start + length);
      const swell = context.createGain();
      swell.gain.setValueAtTime(0, start);
      swell.gain.linearRampToValueAtTime(0.9, start + 0.35);
      swell.gain.linearRampToValueAtTime(0, start + length);
      breath.connect(swell);
      swell.connect(gain);
      this._noiseSource(breath, start + 0.1, length);
      gain.gain.setValueAtTime(this.table.stinger.volume * strength * 0.55, start);
      gain.gain.linearRampToValueAtTime(0, start + length + 0.05);
```

### Tests

The test that said the flash "never gets brighter than it was" is gone (a stutter does exactly that). In its place: the lights go out at once; there is at least one moment when they come back and go out again; the shake only dies away; and everything ends at nothing. And a new module for `blackout`.

In `tests/scare.tests.js`, **replace** lines 110 to 120:

```js
  QUnit.test("it fades: the flash and the shake die away, and the room comes back", (assert) => {
    const scare = make();
    scare.trigger("touch");
    const first = scare.update(0.016);
    let last = first;
    for (let t = 0; t < SCARE.duration.aftershock + 0.5; t += 0.05) {
      const frame = scare.update(0.05);
      assert.true(frame.flash <= last.flash + 1e-9, "never brighter than it was");
      assert.true(frame.ambient >= last.ambient - 1e-9, "never quieter than it was");
      last = frame;
    }
```

with:

```js
  QUnit.test("it fades: the darkness stutters and then goes, the shake dies away, and the room comes back", (assert) => {
    const scare = make();
    scare.trigger("touch");
    let last = scare.update(0.016);
    assert.true(last.flash > 0.3, "the lights go out at once");
    let dips = 0;
    for (let t = 0; t < SCARE.duration.aftershock + 0.5; t += 0.05) {
      const frame = scare.update(0.05);
      assert.true(frame.flash >= 0 && frame.flash <= 1);
      assert.true(frame.shake <= last.shake + 1e-9, "the shake only dies away");
      assert.true(frame.ambient >= last.ambient - 1e-9, "never quieter than it was");
      if (frame.flash < last.flash - 0.3) dips += 1;
      last = frame;
    }
    assert.true(dips >= 1, "it comes back for a moment, and goes out again");
```

In `tests/scare.tests.js`, after line 176, add:

```js

QUnit.module("blackout", () => {
  QUnit.test("it is out at once, comes back for a moment, goes out again, and then slowly fades to nothing", (assert) => {
    assert.strictEqual(blackout(-1), 0);
    assert.strictEqual(blackout(0), 1);
    assert.true(blackout(0.2) < 0.2, "back for a moment");
    assert.true(blackout(0.4) > 0.7, "out again");
    assert.true(blackout(0.55) < 0.2, "back");
    assert.true(blackout(0.7) > 0 && blackout(0.7) < 0.7, "and fading");
    assert.strictEqual(blackout(SCARE.duration.strike + SCARE.duration.aftershock), 0);
  });

  QUnit.test("it is always between 0 and 1, and a stutter, not a flash: it never goes above what it was at the start", (assert) => {
    for (let age = -0.5; age < 4; age += 0.01) assert.true(blackout(age) >= 0 && blackout(age) <= 1);
  });

  QUnit.test("the lights go out, not up: the gentlest level has none and the others are never more than a full blackout", (assert) => {
    assert.strictEqual(SCARE.levels.gentle.flash, 0);
    assert.true(SCARE.levels.terrifying.flash <= 1 && SCARE.levels.creepy.flash < SCARE.levels.terrifying.flash);
  });
});
```

Open `tests.html`. You should see **374 passing tests**: 3 more.

## Step 2: Creatures keep their distance

A rush used to end when the creature was *half the touch range* from the player. For a skeleton that was 0.3 of a metre: it was inside the player's phone, and the camera, which cannot see anything nearer than five centimetres (and a person-sized model fills the view at a metre), showed only a piece of a rib cage. Two numbers fix it. The **touch range** of every person-sized creature is now about **a metre and a half** (a doll 1.3, a horde 2.1, a spider 0.9), and a rush stops at **nine tenths** of it, so that the creature ends up *in arm's reach and not in the face*. The ranges at which they lunge and loiter go up with it (they must stay outside the touch range, and a test says so).

In `js/creatures.js`, **replace** lines 9 to 11:

```js
    creep: { distance: [2.4, 3.6], patience: [5, 12], sidestep: 0.6 },
    name: "spider", health: 3, speed: 1.5, lungeSpeed: 5.5, lungeRange: 1.6, lungeTime: 0.45, recoverTime: 1.4, notice: 7,
    touchRange: 0.55, turnRate: 6, strideLength: 0.5, radius: 0.35, height: 0.35, lurkTime: [0.6, 1.8], deathTime: 1.2,
```

with:

```js
    creep: { distance: [2.8, 4], patience: [5, 12], sidestep: 0.6 },
    name: "spider", health: 3, speed: 1.5, lungeSpeed: 5.5, lungeRange: 1.8, lungeTime: 0.45, recoverTime: 1.4, notice: 7,
    touchRange: 0.9, turnRate: 6, strideLength: 0.5, radius: 0.35, height: 0.35, lurkTime: [0.6, 1.8], deathTime: 1.2,
```

In `js/creatures.js`, **replace** lines 15 to 16:

```js
    name: "ghoul", health: 6, speed: 0.85, lungeSpeed: 3.2, lungeRange: 1.9, lungeTime: 0.6, recoverTime: 1.8, notice: 9,
    touchRange: 0.7, turnRate: 2.4, strideLength: 0.65, radius: 0.4, height: 1.7, lurkTime: [1.5, 3.5], deathTime: 2,
```

with:

```js
    name: "ghoul", health: 6, speed: 0.85, lungeSpeed: 3.2, lungeRange: 2.4, lungeTime: 0.6, recoverTime: 1.8, notice: 9,
    touchRange: 1.6, turnRate: 2.4, strideLength: 0.65, radius: 0.4, height: 1.7, lurkTime: [1.5, 3.5], deathTime: 2,
```

In `js/creatures.js`, **replace** lines 20 to 21:

```js
    name: "skeleton", health: 4, speed: 1.25, lungeSpeed: 4.2, lungeRange: 1.7, lungeTime: 0.5, recoverTime: 1.5, notice: 8,
    touchRange: 0.65, turnRate: 3.6, strideLength: 0.7, radius: 0.35, height: 1.75, lurkTime: [1, 2.5], deathTime: 1.6,
```

with:

```js
    name: "skeleton", health: 4, speed: 1.25, lungeSpeed: 4.2, lungeRange: 2.4, lungeTime: 0.5, recoverTime: 1.5, notice: 8,
    touchRange: 1.6, turnRate: 3.6, strideLength: 0.7, radius: 0.35, height: 1.75, lurkTime: [1, 2.5], deathTime: 1.6,
```

In `js/creatures.js`, **replace** lines 26 to 27:

```js
    name: "doll", health: 4, speed: 1.9, lungeSpeed: 6.5, lungeRange: 1.8, lungeTime: 0.4, recoverTime: 1.3, notice: 8,
    touchRange: 0.5, turnRate: 7, strideLength: 0.45, radius: 0.3, height: 1.05, lurkTime: [1, 3], deathTime: 1.4,
```

with:

```js
    name: "doll", health: 4, speed: 1.9, lungeSpeed: 6.5, lungeRange: 2.2, lungeTime: 0.4, recoverTime: 1.3, notice: 8,
    touchRange: 1.3, turnRate: 7, strideLength: 0.45, radius: 0.3, height: 1.05, lurkTime: [1, 3], deathTime: 1.4,
```

In `js/creatures.js`, **replace** lines 31 to 32:

```js
    name: "floater", health: 5, speed: 1.1, lungeSpeed: 5.5, lungeRange: 2.2, lungeTime: 0.5, recoverTime: 1.8, notice: 9,
    touchRange: 0.7, turnRate: 3, strideLength: 1, radius: 0.45, height: 0.9, lurkTime: [1.5, 3.5], deathTime: 1.6,
```

with:

```js
    name: "floater", health: 5, speed: 1.1, lungeSpeed: 5.5, lungeRange: 2.4, lungeTime: 0.5, recoverTime: 1.8, notice: 9,
    touchRange: 1.5, turnRate: 3, strideLength: 1, radius: 0.45, height: 0.9, lurkTime: [1.5, 3.5], deathTime: 1.6,
```

In `js/creatures.js`, **replace** lines 36 to 37:

```js
    name: "horde", health: 10, speed: 0.6, lungeSpeed: 2.8, lungeRange: 2.4, lungeTime: 0.8, recoverTime: 2.4, notice: 10,
    touchRange: 0.95, turnRate: 1.6, strideLength: 0.8, radius: 0.65, height: 2.1, lurkTime: [2, 4], deathTime: 2.4,
```

with:

```js
    name: "horde", health: 10, speed: 0.6, lungeSpeed: 2.8, lungeRange: 2.8, lungeTime: 0.8, recoverTime: 2.4, notice: 10,
    touchRange: 2.1, turnRate: 1.6, strideLength: 0.8, radius: 0.65, height: 2.1, lurkTime: [2, 4], deathTime: 2.4,
```

In `js/creatures.js`, **replace** line 47:

```js
  distance: [3, 4.5], // metres from the player at which it stops coming and begins to loiter
```

with:

```js
  distance: [3.4, 5], // metres from the player at which it stops coming and begins to loiter
```

In `js/creatures.js`, **replace** line 369:

```js
      const reachLeft = Math.max(0, distance - table.touchRange * 0.5);
```

with:

```js
      const reachLeft = Math.max(0, distance - table.touchRange * 0.9); // it stops at arm's length, and not inside the player
```

### Tests

A new module, for every kind: a creature that rushes at the player **never comes nearer than 0.8 of a metre and still touches** (within its touch range); a person-sized creature's touch range is at least 1.2 metres; and for every kind the lunge range is outside the touch range, and the loitering distance outside the lunge range.

In `tests/creatures.tests.js`, after line 424, add:

```js

QUnit.module("keeping their distance", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("a creature that rushes stops at arm's length and not inside the player, for every kind", (assert) => {
    for (const kind of Object.keys(CREATURES)) {
      const table = { ...CREATURES[kind], creep: { patience: [0.2, 0.2] } };
      const creature = new Creature({ id: 1, kind, position: [0, 0, 6], table, random: () => 0 });
      creature.state = "stalk";
      creature.yaw = Math.PI;
      let nearest = Infinity;
      for (let t = 0; t < 40; t += 0.02) {
        creature.update(0.02, player);
        creature.events = [];
        nearest = Math.min(nearest, creature.distanceTo(player.position));
      }
      assert.true(nearest > 0.8, `${kind} came to ${nearest.toFixed(2)} m`);
      assert.true(nearest <= table.touchRange + 0.05, `${kind} still touched, at ${nearest.toFixed(2)} m`);
    }
  });

  QUnit.test("a person-sized creature is never nearer than a metre and a quarter, so that it fits in the view", (assert) => {
    for (const kind of ["ghoul", "skeleton", "doll", "floater", "horde"]) assert.true(CREATURES[kind].touchRange >= 1.2, kind);
  });

  QUnit.test("they loiter further away than they touch, and rush from further than that", (assert) => {
    for (const [kind, table] of Object.entries(CREATURES)) {
      assert.true(table.lungeRange > table.touchRange, kind);
      assert.true(CREEP.distance[0] > table.lungeRange, kind);
    }
  });
});
```

Open `tests.html`. You should see **377 passing tests**: 3 more.

## Step 3: A ghost that creeps

Here is the idea that makes a ghost frightening: **it moves when you are not looking**. A ghost that is looked at stays where it is and, as if the world could not quite hold it, **stutters** (its light is unsteady, far more than when it is not watched). Look away, and it **comes closer**, a little at a time, at 35 centimetres a second, until it is as near as it comes (2.3 metres). Look back and it is nearer than it was. The player cannot see it move, and cannot stop it.

It needs one new piece of information: *is the player looking at it?* That is the angle between where the player faces and where the ghost is (the `bearingTo` of the director), compared with half the field of view and a margin: the same arithmetic that keeps the director from placing a creature in view. The haunting works it out for each ghost and tells the ghost, which uses it. A player with no direction (a test) is taken to be looking at everything, so nothing that does not know about it changes.

In `js/ghost.js`, **replace** lines 3 to 6:

```js
// reads what is worked out here. See ../tests/ghost.tests.js.

const GHOST = {
  height: 1.8, // metres: a ghost is a little taller than a person
```

with:

```js
// reads what is worked out here. (A ghost asks bearingTo of director.js whether it is being looked at.) See ../tests/ghost.tests.js.

const GHOST = {
  height: 2.1, // metres: a ghost is taller than a person, and thin
```

In `js/ghost.js`, after line 20, add:

```js
  creepSpeed: 0.35, // metres a second it comes towards you while you are not looking at it
  closest: 2.3, // and the nearest it comes: it stops here, and waits for you to look
  farReach: 7, // metres: it begins to reach for you inside this distance (the mouth and the arms follow `near`)
  watchedDepth: 0.65, // how far it dims when it is looked at: it stutters, as if it were not quite there
  watchedHz: 2.5, // and how fast
```

In `js/ghost.js`, after line 93, add:

```js
    this.offset = [0, 0]; // how far it has come from its place, towards the player, while unwatched
    this.watched = true; // is the player looking at it?
    this.near = 0; // how near it is, as a feeling: 0 far away, 1 as close as it comes
```

In `js/ghost.js`, **replace** line 112:

```js
    return [this.home[0] + dx, this.home[1] + this.table.hover + bob(Math.max(0, this.age), this.seed, this.table), this.home[2] + dz];
```

with:

```js
    return [this.home[0] + dx + this.offset[0], this.home[1] + this.table.hover + bob(Math.max(0, this.age), this.seed, this.table), this.home[2] + dz + this.offset[1]];
```

In `js/ghost.js`, **replace** line 118:

```js
    return this.table.opacity * shown * envelope(this.age, this.fadeStart, this.table) * flicker(Math.max(0, this.age), this.seed, this.table);
```

with:

```js
    // looked at, it stutters: a ghost that is watched is not quite there
    const watchedBlink = this.watched ? flicker(Math.max(0, this.age) * (this.table.watchedHz / this.table.flickerHz), this.seed + 9, { ...this.table, flickerDepth: this.table.watchedDepth }) : 1;
    return this.table.opacity * shown * envelope(this.age, this.fadeStart, this.table) * flicker(Math.max(0, this.age), this.seed, this.table) * watchedBlink;
```

In `js/ghost.js`, **replace** lines 133 to 135:

```js
  update(seconds, playerPosition) {
    if (this.done) return;
    this.age += seconds;
```

with:

```js
  // `watched` says whether the player is looking at it. A ghost that is looked at stays where it is; one that is not creeps towards the player,
  // a little at a time, until it is as close as it comes.
  update(seconds, playerPosition, watched = true) {
    if (this.done) return;
    this.age += seconds;
    this.watched = watched;
    const here = this.position();
    const distance = Math.hypot(playerPosition[0] - here[0], playerPosition[2] - here[2]);
    this.near = Math.max(0, Math.min(1, (this.table.farReach - distance) / (this.table.farReach - this.table.closest)));
    if (!watched && this.stage === "present" && distance > this.table.closest) {
      const step = Math.min(this.table.creepSpeed * seconds, distance - this.table.closest);
      this.offset[0] += ((playerPosition[0] - here[0]) / distance) * step;
      this.offset[1] += ((playerPosition[2] - here[2]) / distance) * step;
    }
```

In `js/ghost.js`, **replace** lines 194 to 195:

```js
  update(seconds, player) {
    for (const item of this.items) item.update(seconds, player.position);
```

with:

```js
  // `halfFov` is how many degrees each side of straight ahead the player sees: a ghost inside it (and a little beyond) is being looked at.
  update(seconds, player, halfFov = 30) {
    for (const item of this.items) {
      const looked = !player.forward || item.stage === "waiting" || Math.abs(bearingTo(player, item.position())) <= halfFov + 8;
      item.update(seconds, player.position, looked);
    }
```

Things to notice:

- **A ghost creeps only when it is `present`**: not while it is appearing, not while it is going, and never before it has begun.
- **`near` is a feeling, 0 to 1**: 0 beyond the far reach (7 metres) and 1 at its nearest. Nothing in the numbers uses it yet; the look of the ghost does (Step 4): its mouth and its arms.
- **The nearest it comes is the table's**, and it stops there. It never reaches the player: a ghost in your face is a different game.
- **A ghost is taller and thinner**: the table's height is 2.1 metres, and the profile that draws it follows it (a test says that the profile is as tall as the table).

In `js/ghostmesh.js`, **replace** lines 7 to 15:

```js
  profile: [[0.02, 0], [0.34, 0.04], [0.46, 0.28], [0.42, 0.62], [0.33, 1.0], [0.24, 1.3], [0.2, 1.42], [0.25, 1.52], [0.23, 1.64], [0.12, 1.76], [0.01, 1.8]], // [radius, height] from the hem up
  tessellation: 28,
  smoothing: 5, // points between each pair of corners of the profile
  eyeHeight: 1.54,
  eyeApart: 0.085,
  eyeForward: 0.19,
  eyeSize: 0.07,
  color: [0.35, 0.85, 1], // the cold glow
  eyeColor: [0.85, 1, 1],
```

with:

```js
  profile: [[0.02, 0], [0.26, 0.05], [0.34, 0.3], [0.3, 0.75], [0.22, 1.2], [0.17, 1.55], [0.13, 1.72], [0.16, 1.84], [0.19, 1.95], [0.18, 2.03], [0.1, 2.08], [0.01, 2.1]], // [radius, height] from the hem up: tall, thin, and a long head
  tessellation: 28,
  smoothing: 5, // points between each pair of corners of the profile
  eyeHeight: 1.9,
  eyeApart: 0.075,
  eyeForward: 0.15,
  eyeSize: 0.03, // a pinpoint: the eyes are small lights at the bottom of two black pits
  socketSize: 0.12,
  mouthHeight: 1.72, // and under them a mouth that gapes as it comes near
  shoulderHeight: 1.5,
  armLength: 1.05,
  color: [0.55, 0.72, 0.78], // a cold, pale grey-blue: not a cheerful cyan
  eyeColor: [1, 0.8, 0.75],
```

### Tests

A new module: a ghost that is looked at stays about where it is and one that is not comes several metres; it comes at the table's pace and stops at the nearest it comes (give or take the wander); one that has not appeared does not creep; when it is looked at it is dimmer on average than when it is not; `near` goes from 0 to above 0.8 as it comes; the haunting says what is looked at (ahead of the player and just outside the view are watched, behind is not, and no direction means everything); and the table is sensible (taller than 1.9, never nearer than 1.5 metres, slow, more unsteady when watched than ever).

In `tests/ghost.tests.js`, after line 225, add:

```js

QUnit.module("a ghost that creeps", () => {
  const player = [0, 1.4, 0];
  const ghost = (extra = {}) => {
    const g = new Apparition({ id: 1, home: [0, 0, 8], delay: 0, ...extra });
    g.update(GHOST.fadeIn + 0.5, player, true);
    return g;
  };
  const distance = (g) => Math.hypot(g.position()[0] - player[0], g.position()[2] - player[2]);

  QUnit.test("a ghost that is looked at stays where it is, and one that is not creeps towards the player", (assert) => {
    const looked = ghost(), unseen = ghost();
    const start = distance(looked);
    for (let i = 0; i < 100; i++) {
      looked.update(0.1, player, true);
      unseen.update(0.1, player, false);
    }
    assert.true(Math.abs(distance(looked) - start) < GHOST.driftRadius * 2, "it stays about where it was");
    assert.true(distance(unseen) < start - 2.5, `it has come ${(start - distance(unseen)).toFixed(1)} m`);
  });

  QUnit.test("it comes at the table's pace, and stops at the nearest it comes, and does not go through the player", (assert) => {
    const g = ghost();
    g.update(1, player, false);
    const one = Math.hypot(...g.offset);
    assert.true(Math.abs(one - GHOST.creepSpeed) < 0.01, `${one.toFixed(2)} m in a second`);
    for (let i = 0; i < 600; i++) g.update(0.1, player, false);
    assert.true(distance(g) >= GHOST.closest - GHOST.driftRadius * 1.5 && distance(g) < GHOST.closest + GHOST.driftRadius * 1.5, `stops at ${distance(g).toFixed(1)} m`);
  });

  QUnit.test("a ghost that has not appeared yet does not creep", (assert) => {
    const g = new Apparition({ id: 2, home: [0, 0, 8], delay: 5 });
    g.update(1, player, false);
    assert.deepEqual(g.offset, [0, 0]);
  });

  QUnit.test("when it is looked at it stutters, dimmer than when it is not", (assert) => {
    const g = ghost();
    let looked = 0, unseen = 0, n = 0;
    for (let i = 0; i < 400; i++) {
      g.update(0.05, player, true);
      looked += g.opacity();
      g.watched = false;
      unseen += g.opacity();
      n += 1;
    }
    assert.true(looked / n < unseen / n * 0.85, `${(looked / n).toFixed(2)} watched, ${(unseen / n).toFixed(2)} not`);
  });

  QUnit.test("the nearer it is the nearer it feels: from 0 far away to 1 as close as it comes", (assert) => {
    const g = ghost();
    assert.strictEqual(g.near, 0);
    for (let i = 0; i < 600; i++) g.update(0.1, player, false);
    assert.true(g.near > 0.8);
  });

  QUnit.test("the haunting says what is looked at: a ghost in the view, or just outside it, is watched, and one behind the player is not", (assert) => {
    const haunting = new Haunting();
    const ahead = haunting.summon([0, 0, 8], { delay: 0 });
    const behind = haunting.summon([0, 0, -8], { delay: 0 });
    const facing = { position: player, forward: [0, 0, 1] };
    haunting.update(5, facing, 30);
    haunting.update(0.1, facing, 30);
    assert.true(ahead.watched);
    assert.false(behind.watched);
    haunting.update(0.1, { position: player }, 30);
    assert.true(behind.watched, "a player with no direction is taken to be looking at everything");
  });

  QUnit.test("a ghost is taller and thinner than a person, and the table says how near and how fast", (assert) => {
    assert.true(GHOST.height > 1.9);
    assert.true(GHOST.closest > 1.5, "it never comes as close as the player's face");
    assert.true(GHOST.creepSpeed > 0 && GHOST.creepSpeed < 1, "slowly");
    assert.true(GHOST.watchedDepth > GHOST.flickerDepth, "more unsteady when it is looked at than ever");
  });
});
```

Open `tests.html`. You should see **384 passing tests**: 7 more.

## Step 4: A creepier ghost

What a ghost looks like is made of a few decisions, and every one is a change of a number or a small shape:

- **Colour**: a cold, pale grey-blue (`0.55, 0.72, 0.78`) and not a cheerful cyan, and dimmer at the edges. Cyan is a video game; pale is a corpse.
- **Eyes**: a pinpoint (3 centimetres across, a warm white) at the bottom of **a black pit** (12 centimetres, flattened, drawn in front of the head). Eyes that glow are cartoons. Eyes that are *there*, small, in the dark of a face, are not.
- **A mouth**: a black oval under the eyes that **opens as the ghost comes near** (the scaling goes from a slit to wide open with `near`): at a distance it is a slit; close, it is a scream.
- **Arms**: two long cylinders that taper to fingers, hanging at the sides and **rising to reach** as it comes near, with a little sway.
- **A head on one side**, as if listening, with a slow roll.
- **Proportions**: tall (2.1 m), narrow, a long head.

In `js/ghostmesh.js`, **replace** line 68:

```js
  vec3 glow = mix(color * 0.45, vec3(0.85, 1.0, 1.0), rim);
```

with:

```js
  vec3 glow = mix(color * 0.35, vec3(0.75, 0.85, 0.88), rim);
```

In `js/ghostmesh.js`, **replace** line 96:

```js
// A ghost to look at: a root that is moved and turned, with a body, two eyes and a trail of wisps. `apparition` is the numbers of it
```

with:

```js
// A ghost to look at: a root that is moved and turned, with a body, two pinpoint eyes in black pits, a mouth, two long arms and a trail of wisps. `apparition` is the numbers of it
```

In `js/ghostmesh.js`, after line 125, add:

```js
    // the black pits the eyes are in, and a mouth, and two long arms that hang and then reach
    this.darkMaterial = new BABYLON.StandardMaterial(`ghost-dark-${apparition.id}`, scene);
    this.darkMaterial.disableLighting = true;
    this.darkMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0);
    this.darkMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    this.sockets = [-1, 1].map((side) => {
      const socket = BABYLON.MeshBuilder.CreateSphere(`ghost-socket-${apparition.id}-${side}`, { diameter: look.socketSize, segments: 8 }, scene);
      socket.parent = this.root;
      socket.position.set(side * look.eyeApart, look.eyeHeight, look.eyeForward - 0.03);
      socket.scaling.set(0.8, 1.25, 0.6);
      socket.material = this.darkMaterial;
      socket.isPickable = false;
      return socket;
    });
    this.mouth = BABYLON.MeshBuilder.CreateSphere(`ghost-mouth-${apparition.id}`, { diameter: 0.1, segments: 8 }, scene);
    this.mouth.parent = this.root;
    this.mouth.position.set(0, look.mouthHeight, look.eyeForward - 0.05);
    this.mouth.material = this.darkMaterial;
    this.mouth.isPickable = false;
    this.armMaterial = new BABYLON.StandardMaterial(`ghost-arm-${apparition.id}`, scene);
    this.armMaterial.disableLighting = true;
    this.armMaterial.emissiveColor = new BABYLON.Color3(...look.color.map((n) => n * 0.5));
    this.shoulders = [-1, 1].map((side) => {
      const shoulder = new BABYLON.TransformNode(`ghost-shoulder-${apparition.id}-${side}`, scene);
      shoulder.parent = this.root;
      shoulder.position.set(side * 0.2, look.shoulderHeight, 0.03);
      const arm = BABYLON.MeshBuilder.CreateCylinder(`ghost-arm-${apparition.id}-${side}`, { height: look.armLength, diameterTop: 0.012, diameterBottom: 0.07, tessellation: 8 }, scene);
      arm.parent = shoulder;
      arm.position.y = -look.armLength / 2;
      arm.rotation.x = Math.PI; // thin end down: it tapers to long fingers
      arm.material = this.armMaterial;
      arm.isPickable = false;
      return shoulder;
    });

```

In `js/ghostmesh.js`, after line 178, add:

```js
    this.darkMaterial.alpha = Math.min(1, opacity * 1.6);
    this.armMaterial.alpha = Math.min(1, opacity * 0.9);
    // as it comes near its mouth opens and its arms rise towards you; and its head is a little on one side, as if listening
    this.mouth.scaling.set(1, 0.25 + ghost.near * 2.4, 0.6);
    this.shoulders.forEach((shoulder, i) => {
      shoulder.rotation.x = -(0.12 + ghost.near * 1.25 + Math.sin(time * 0.9 + i * 2 + ghost.seed) * 0.05);
      shoulder.rotation.z = (i === 0 ? 1 : -1) * 0.1;
    });
    this.root.rotation.z = Math.sin(time * 0.5 + ghost.seed) * 0.06 + 0.07;
```

In `js/ghostmesh.js`, after line 193, add:

```js
    this.sockets.forEach((socket) => socket.dispose());
    this.mouth.dispose();
    this.shoulders.forEach((shoulder) => shoulder.dispose(false, false));
```

In `js/ghostmesh.js`, after line 199, add:

```js
    this.darkMaterial.dispose();
    this.armMaterial.dispose();
```

The game tells the haunting what the camera can see:

In `js/main.js`, **replace** line 83:

```js
  haunting.update(seconds, player);
```

with:

```js
  haunting.update(seconds, player, currentHalfFov()); // a ghost that is looked at stands still, and one that is not creeps closer
```

Things to notice:

- **The new parts are children of the ghost's root**, so they move with it; the arms hang from a **shoulder** (a node of its own) so that turning the shoulder swings the arm about the top.
- **Everything fades with the ghost**: the pits, the mouth and the arms have their own materials, and their alpha follows the ghost's, so a ghost that is going takes all of it.
- **The models of ghosts** (the cloaked one and the pale one) creep and stutter too: the behaviour is in the numbers, not the picture.

### Tests

The count of what a ghost is made of is now eight meshes (a body, two eyes, two pits, a mouth, two arms); and a new module: the pits are bigger than the eyes and the eyes are pinpoints; the mouth opens and the arms rise as it comes near; and the head is on one side.

In `tests/ghostmesh.tests.js`, **replace** line 135:

```js
    assert.strictEqual(scene.meshes.length, before + 3, "a body and two eyes");
```

with:

```js
    assert.strictEqual(scene.meshes.length, before + 8, "a body, two pinpoint eyes, two black pits, a mouth and two arms");
```

In `tests/ghostmesh.tests.js`, after line 141, add:

```js

QUnit.module("a creepier ghost", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    new BABYLON.FreeCamera("eye", new BABYLON.Vector3(0, 1.4, 0), scene);
    registerGhostShader();
    return { engine, scene, texture: softTexture(scene) };
  };

  QUnit.test("the eyes are pinpoints in black pits, and the pits are bigger than the eyes", (assert) => {
    assert.true(GHOST_LOOK.eyeSize < 0.05 && GHOST_LOOK.socketSize > GHOST_LOOK.eyeSize * 3);
  });

  QUnit.test("its mouth opens as it comes near, and its arms rise", (assert) => {
    const { engine, scene, texture } = make();
    const ghost = new Apparition({ id: 5, home: [0, 0, 8], delay: 0 });
    ghost.update(3, [0, 1.4, 0], true);
    const body = new GhostBody(scene, ghost, texture);
    body.update(1);
    const closed = body.mouth.scaling.y, lowered = body.shoulders[0].rotation.x;
    for (let i = 0; i < 600; i++) ghost.update(0.1, [0, 1.4, 0], false);
    body.update(1);
    assert.true(body.mouth.scaling.y > closed * 3, "the mouth");
    assert.true(body.shoulders[0].rotation.x < lowered - 0.8, "the arms reach");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("its head is on one side", (assert) => {
    const { engine, scene, texture } = make();
    const ghost = new Apparition({ id: 6, home: [0, 0, 8], delay: 0 });
    ghost.update(3, [0, 1.4, 0], true);
    const body = new GhostBody(scene, ghost, texture);
    body.update(0);
    assert.true(Math.abs(body.root.rotation.z) > 0.01);
    body.dispose();
    scene.dispose();
    engine.dispose();
  });
});
```

Open `tests.html`. You should see **387 passing tests**: 3 more.

## Step 5: Try it

Open the page with `?dev`, put on headphones (the volume low), press the button, and **mark the floor** to call a ghost.

- The ghost appears, tall and thin, at the mark, with **black pits and tiny lights for eyes** and a slit of a mouth. Look at it: it **stutters**, as if it were being switched on and off.
- **Look away** (turn your back), count to ten, and **look back**: it is nearer. Do it again. Its **mouth is open** now, and its **arms are up**.
- Mark the floor several times and look from one to another: they all creep when unseen. (**Half of them are the two ghost models**, which creep and stutter the same way.)
- Press **2** for a ghoul, **3** for the skeleton, and let one **rush** (set the patience down to a few seconds in the panel). It stops about **a metre and a half** away: you can see all of it, and it is bigger for being seen.
- The strike: the lights **stutter out** (they go out, come back for an instant, go out again, and fade up) and you hear a **deep thump and a long breath** at your ear. No flash. No blare.
- Switch the **Gentle** level on: no darkness at all, a softer breath. **Terrifying**: a deeper, longer blackout.

**The question for you**: is it unease or just dark? If the ghost creeps too fast, lower `creepSpeed`; if it stops too far away, lower `closest`; if the blackout is too much, lower the level's number.

## Step 6: Tests, all together

Open `tests.html`. You should see **387 passing tests**.

## Recap: what changed

| What | Where |
|------|-------|
| The blackout in place of the flash | `blackout` in `scare.js`, `#flash` in `css/scare.css` |
| The presence in place of the stinger | the `stinger` cue in `audio.js` |
| Creatures at arm's length | the touch ranges and the rush in `creatures.js` |
| A ghost that creeps when it is not watched | `watched`, `offset`, `near`, `creepSpeed`, `closest` in `ghost.js` |
| A creepier ghost | `GHOST_LOOK`, `GhostBody` in `ghostmesh.js` |

## Challenges

- **The light stops it.** A ghost creeps whenever the player is not looking *at it*, even with the flashlight in their hand. Make it stand still whenever the flashlight's cone is on it, looking or not. What is the rule, and what is the test?
- **Behind you.** A ghost that has crept to its nearest and is not watched could go round the player (it circles at the nearest distance) until it is behind them, where it cannot be seen at all. Write the rule as arithmetic on the bearing, and test that it never goes through the player.
- **The sound of it.** A ghost that creeps could make a sound only when it is not watched (a floorboard, a sigh). Where does that go: `ghost.js`, `main.js`, or `audio.js`?
- **A different stutter.** The stutter is the flicker of the ghost, deeper. Make a watched ghost *freeze* instead: stand perfectly still and bright for a moment and then blink out. Which function would you write first?
