# Tutorial: Ghost Hunter Jump Scares -- The Strike

This is the sixth tutorial of the Ghost Hunter series. The director sends things; this sample makes you *feel* them. A jump scare is not a loud noise. It is a **build-up** (the room goes quiet as something comes near, and your heart is in your ears), a **strike** (sound, flash, shake and a buzz of the phone, all at once) and an **aftershock** (the ringing that fades and the room that comes back). All of it is **made in code**: no sound files, no pictures. And because a game made to frighten is a game that some people want less of, **how much** is the player's choice, on the start screen, with a level that is remembered.

By the end you'll have:

- **Scare levels** (Gentle, Creepy, Terrifying), each a row of numbers: how loud, how much it flashes, how hard it shakes, how long the silence, how much it buzzes. **Gentle never flashes or shakes at all**
- **A build-up**: the dread as a function of how near the nearest creature is; a hum that goes to **silence** as it comes; a **heart** that beats faster
- **A strike**: a sequence that fires once, with a flash, a shake and a buzz that die away, and a room that comes back; a touch is harder than a lunge, and two in a breath are one scare
- **Sound made in code**: a hum, a heart, a creak, a whisper, a stinger, a thud, and a **voice for each kind of creature** (a spider's ticking, a ghoul's groan, a skeleton's rattle), all through a **positional** panner so that a thing behind you is behind you
- **Tests that listen**: sounds are rendered into a buffer with an offline audio context, and the tests say that a sound on the right is louder in the right ear
- **A camera shake** (applied to what is seen, not to where the phone points), a **flash** and a **dark edge** that closes in, and the **buzz** of the phone
- A **picker** on the start screen, and a **scare** group in the developer panel
- Unit tests for all of it: **281 passing tests**

**What you'll learn:** how to build a scare as a timeline of numbers, how Web Audio works (a graph of nodes, oscillators and noise, filters, gains, panners and a listener), how to make the sounds of a horror film out of noise and a few notes that rub against each other, how to test sound by rendering it, how to scale an effect by a player's choice, and why a horror game should ask first.

**Before you start:** do the [Hunt tutorial](../ghost_hunter_hunt/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Hunt sample, plus placeholders for the new files and their tests:

```
ghost_hunter_scares/
├── index.html, tests.html   (already list the new scripts, the picker and the two layers)
├── css/
│   ├── scare.css            (placeholder -- Step 3)
│   └── everything else, from the Hunt sample
├── js/
│   ├── scare.js             (placeholder -- Step 1)
│   ├── audio.js             (placeholder -- Step 2)
│   ├── scareui.js           (placeholder -- Step 3)
│   ├── main.js              (changes -- Step 4)
│   └── everything else, from the Hunt sample
└── tests/
    ├── scare.tests.js, audio.tests.js, scareui.tests.js   (placeholders)
    └── everything else, from the Hunt sample
```

Open `tests.html` before you change anything. You should see **242 passing tests**: the ones of the Hunt sample.

### Serving the page

As before: `npx serve` in the repo root, and open the sample through `http://localhost`, with **`?dev`** for the developer panel. **Wear headphones** to hear it properly, and turn the volume down first.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **The scare as numbers**: levels, the build-up, the strike.
2. **Sound**: Web Audio, made in code.
3. **What is seen**: the picker and the layers.
4. **The game**.
5. **Try it**.

## Step 1: The scare as numbers

### The table, the build-up, the buzz and the shake

`SCARE` is the table: the **levels** (each a row of multipliers), how far away the room begins to go quiet (`tellDistance`), how hard each kind of strike is (a lunge 0.7, a touch 1), how long each part lasts, and the rate of the heart. The functions on it are small.

- **`dreadAt`** turns the distance of the nearest creature into a feeling from 0 to 1: nothing at the tell distance, everything at the lunge range.
- **`buildUp`** turns the dread into what the room does: the hum's loudness (1, going to nothing: a silence, longer at the higher levels, and never quite complete at the gentlest) and the heart's rate.
- **`vibratePattern`** is the buzz of the phone as milliseconds on and off, longer for a touch than for a lunge, nothing at a level that has none.
- **`shakeOffset`** is how far the view is turned at a moment, from two waves that do not fit together (as the ghost's flicker was), at most the table's angle; and **`shakeView`** puts it on a view.

Open `js/scare.js` (the placeholder) and **replace the TODO line** with:

```js
// The scare, as numbers. A jump scare is not a loud noise: it is a **build-up** (the room goes quiet as something comes near), a
// **strike** (sound, flash, shake and a buzz of the phone, all at once), and an **aftershock** (the ringing that fades and the room that
// comes back). This file works out all three as plain arithmetic of distance and time, with how much of each the player has asked for
// in the **scare level**. How they are heard and seen is in audio.js and scareui.js, which only read what is worked out here.
// See ../tests/scare.tests.js.

const SCARE = {
  level: "creepy", // the level the player has chosen
  levels: {
    gentle: { label: "Gentle", note: "Soft sounds. No flashes, no shaking, a light buzz.", volume: 0.45, flash: 0, shake: 0, vibrate: 0.4, silence: 0.7, vignette: 0.4 },
    creepy: { label: "Creepy", note: "The proper thing: sudden, but not cruel.", volume: 0.8, flash: 0.5, shake: 0.5, vibrate: 1, silence: 1, vignette: 0.75 },
    terrifying: { label: "Terrifying", note: "Loud, sudden and flashing. You asked.", volume: 1, flash: 1, shake: 1, vibrate: 1.6, silence: 1.4, vignette: 1 },
  },
  tellDistance: 7, // metres: the room begins to go quiet when something is this near
  strikes: { lunge: 0.7, touch: 1 }, // how hard each kind of strike is, 0 to 1
  duration: { strike: 0.12, aftershock: 2.2 }, // seconds
  cooldown: 0.8, // seconds after a strike before another can begin (a creature that lunges twice in a breath is one scare)
  shakeHz: [31, 47], // how fast the camera shakes: two numbers that do not fit together
  shakeRadians: 0.04, // the most the view is turned by a shake at full strength
  heartBeats: [58, 150], // beats a minute: calm, and at the edge of a strike
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// The level the player has chosen: the address (?scare=gentle) wins, then what the browser kept, then the table's.
function levelWanted(search, stored, table = SCARE) {
  const asked = new URLSearchParams(search || "").get("scare");
  if (asked && asked in table.levels) return asked;
  if (stored && stored in table.levels) return stored;
  return table.level;
}

// The levels in order, and the next one round (for a button that goes through them).
function levelNames(table = SCARE) {
  return Object.keys(table.levels);
}

// How close the dread is, from 0 (nothing near) to 1 (right on you): the distance of the nearest creature, between the distance at
// which the room begins to go quiet and the distance at which it lunges.
function dreadAt(distance, lungeRange, table = SCARE) {
  return clamp01((table.tellDistance - distance) / Math.max(0.1, table.tellDistance - lungeRange));
}

// A heart rate for a dread: slow when calm, fast at the edge. `dread` is 0 to 1.
function heartRate(dread, table = SCARE) {
  const [calm, panic] = table.heartBeats;
  return calm + (panic - calm) * Math.pow(clamp01(dread), 1.2);
}

// What the room sounds like as something comes near: the loudness of the ambient hum (1 is full; it goes to nothing, a silence, and
// the silence is longer at the higher levels) and the beats of the heart a minute.
function buildUp(dread, level) {
  const quiet = Math.pow(clamp01(dread * level.silence), 1.5);
  return { ambient: 1 - quiet, heart: heartRate(dread), dread };
}

// How the phone should buzz, as a pattern of milliseconds on and off, for a strike of a strength at a level. Nothing at a level that
// does not buzz.
function vibratePattern(strength, level) {
  const scale = level.vibrate * strength;
  if (scale <= 0.05) return [];
  const on = (ms) => Math.round(ms * scale);
  return strength >= 1 ? [on(90), 40, on(60), 40, on(160)] : [on(60), 30, on(40)];
}

// How much the view is turned by a shake at a moment: [yaw, pitch] in radians, from two waves that do not fit together.
function shakeOffset(time, amplitude, table = SCARE) {
  const [a, b] = table.shakeHz;
  const yaw = Math.sin(time * a) * 0.6 + Math.sin(time * b + 1.3) * 0.4;
  const pitch = Math.sin(time * b + 0.4) * 0.6 + Math.sin(time * a * 1.3 + 2.1) * 0.4;
  return [yaw * amplitude * table.shakeRadians, pitch * amplitude * table.shakeRadians * 0.7];
}

// The view with a shake put on it: the forward direction turned by a yaw about the vertical and tipped by a pitch. `view` is
// { forward, up }; the up is turned with it.
function shakeView(view, offset) {
  const [yaw, pitch] = offset;
  const turn = ([x, y, z]) => [x * Math.cos(yaw) + z * Math.sin(yaw), y, -x * Math.sin(yaw) + z * Math.cos(yaw)];
  const forward = turn(view.forward);
  const up = turn(view.up);
  const tipped = [forward[0] + up[0] * pitch, forward[1] + up[1] * pitch, forward[2] + up[2] * pitch];
  const length = Math.hypot(...tipped) || 1;
  return { forward: tipped.map((n) => n / length), up };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, shakeOffset, shakeView };
} else {
  Object.assign(window, { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, shakeOffset, shakeView });
}
```

Things to notice:

- **A level is data, not code.** The gentlest has a flash of 0 and a shake of 0, and nothing in the code knows that: it multiplies by the level's number. A fourth level, or a different gentle one, is a row.
- **The level comes from three places**, in order of strength: the address (`?scare=gentle`), what the browser kept, the table's own. A name that is not a level is not one.
- **The silence is `1 - (dread × level)^1.5`.** Raising to a power makes the room go quiet *late and fast*, which is what a held breath is.
- **The shake is applied to what is seen** and not where the phone points: a shake that changed the real direction would make the player's aim wander. (The next step shows where.)

### The strike

`ScareSequence` is the part with a *time* in it. `trigger("lunge")` or `trigger("touch")` asks for a strike, and the next `update` **fires** it: for that one frame `fired` has the kind and the buzz, and the sound begins. From then the numbers go: the **flash** and the **shake** start at the strike's strength times the level's, and die away as the square of what is left; the **ambient** is 0 for the strike and then comes back over the aftershock.

Two strikes in a breath are one scare: a strike inside the cooldown is refused, **unless it is harder** (a touch on top of a lunge is allowed: it is a different thing happening).

In `js/scare.js`, find the export block (lines 86 to 93) and **delete it**. Add this in its place, and the export block under it:

```js
// The strike and what comes after it. `trigger` starts it (a lunge, or a touch, which is harder); `update` gives, each frame, the numbers
// the screen and the speakers need, already scaled by the level. A strike is `fired` for one frame, which is when the sound begins and
// the phone buzzes.
class ScareSequence {
  constructor(table = SCARE) {
    this.table = table;
    this.level = table.levels[table.level];
    this.age = Infinity; // seconds since the strike (infinity: none yet)
    this.strength = 0;
    this.pending = null; // a strike that has been asked for and not fired
    this.cool = 0;
    this.strikes = 0;
  }

  setLevel(name) {
    this.level = this.table.levels[name] || this.level;
  }

  // Is a strike going on or just over? (A new one cannot start inside the cooldown, unless it is harder.)
  get busy() {
    return this.age < this.table.duration.strike + this.table.duration.aftershock * 0.4 || this.cool > 0;
  }

  // Asks for a strike of a kind ("lunge" or "touch"). Gives whether it will happen.
  trigger(kind) {
    const strength = this.table.strikes[kind] || 0.5;
    if (this.busy && strength <= this.strength) return false;
    this.pending = { kind, strength };
    return true;
  }

  update(seconds) {
    const { strike, aftershock } = this.table.duration;
    let fired = null;
    this.cool = Math.max(0, this.cool - seconds);
    if (this.pending) {
      fired = { kind: this.pending.kind, strength: this.pending.strength, vibrate: vibratePattern(this.pending.strength, this.level) };
      this.strength = this.pending.strength;
      this.age = 0;
      this.cool = this.table.cooldown;
      this.pending = null;
      this.strikes += 1;
    } else if (this.age !== Infinity) {
      this.age += seconds;
    }
    const level = this.level;
    let flash = 0, shake = 0, ambient = 1;
    if (this.age <= strike + aftershock) {
      const into = this.age;
      const decay = into < strike ? 1 : Math.pow(1 - (into - strike) / aftershock, 2);
      flash = this.strength * level.flash * decay;
      shake = this.strength * level.shake * decay;
      ambient = into < strike ? 0 : clamp01((into - strike) / aftershock); // the room comes back
    }
    return { fired, flash, shake, ambient, volume: level.volume, strength: this.strength };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, shakeOffset, shakeView, ScareSequence };
} else {
  Object.assign(window, { SCARE, levelWanted, levelNames, dreadAt, heartRate, buildUp, vibratePattern, shakeOffset, shakeView, ScareSequence });
}
```

### Tests

Open `tests/scare.tests.js` and **replace the TODO line** with:

```js
QUnit.module("level and build-up", () => {
  QUnit.test("the level comes from the address, then the browser, then the table", (assert) => {
    assert.strictEqual(levelWanted("", null), "creepy");
    assert.strictEqual(levelWanted("?scare=gentle", "terrifying"), "gentle");
    assert.strictEqual(levelWanted("", "terrifying"), "terrifying");
    assert.strictEqual(levelWanted("?scare=nonsense", "nonsense"), "creepy", "a level that does not exist is not one");
  });

  QUnit.test("the levels get stronger, in order, in everything", (assert) => {
    const [a, b, c] = levelNames().map((name) => SCARE.levels[name]);
    for (const key of ["volume", "flash", "shake", "vibrate", "silence", "vignette"]) assert.true(a[key] <= b[key] && b[key] <= c[key], key);
    assert.strictEqual(a.flash, 0, "the gentlest level has no flashing at all");
    assert.strictEqual(a.shake, 0);
    assert.deepEqual(levelNames(), ["gentle", "creepy", "terrifying"]);
  });

  QUnit.test("the dread is nothing far away, everything at the lunge, and goes up as it comes", (assert) => {
    assert.strictEqual(dreadAt(20, 1.6), 0);
    assert.strictEqual(dreadAt(1.6, 1.6), 1);
    assert.strictEqual(dreadAt(0.5, 1.6), 1);
    let last = 0;
    for (let d = SCARE.tellDistance; d >= 1.6; d -= 0.2) {
      const dread = dreadAt(d, 1.6);
      assert.true(dread >= last);
      last = dread;
    }
  });

  QUnit.test("the heart is calm when it is quiet and fast at the edge, and never out of the table's range", (assert) => {
    assert.strictEqual(heartRate(0), SCARE.heartBeats[0]);
    assert.strictEqual(heartRate(1), SCARE.heartBeats[1]);
    for (let d = -1; d < 2; d += 0.1) assert.true(heartRate(d) >= SCARE.heartBeats[0] && heartRate(d) <= SCARE.heartBeats[1]);
  });

  QUnit.test("the room goes quiet as it comes near, and to nothing, and more completely at the higher levels", (assert) => {
    const creepy = SCARE.levels.creepy, gentle = SCARE.levels.gentle, terrifying = SCARE.levels.terrifying;
    assert.strictEqual(buildUp(0, creepy).ambient, 1);
    assert.true(buildUp(0.5, creepy).ambient < 1);
    assert.true(buildUp(1, terrifying).ambient < 0.01, "a silence");
    assert.true(buildUp(1, gentle).ambient > 0.1, "the gentlest never goes right out");
    assert.true(buildUp(0.8, terrifying).ambient < buildUp(0.8, gentle).ambient);
  });
});

QUnit.module("buzz and shake", () => {
  QUnit.test("a buzz is a pattern of milliseconds, longer for a touch than for a lunge, and nothing if the level has none", (assert) => {
    const creepy = SCARE.levels.creepy;
    const lunge = vibratePattern(SCARE.strikes.lunge, creepy), touch = vibratePattern(SCARE.strikes.touch, creepy);
    assert.true(touch.reduce((a, b) => a + b, 0) > lunge.reduce((a, b) => a + b, 0));
    assert.true(lunge.every((n) => n > 0 && Number.isInteger(n)));
    assert.deepEqual(vibratePattern(1, { vibrate: 0 }), []);
  });

  QUnit.test("the gentlest level buzzes less than the proper one", (assert) => {
    const total = (level) => vibratePattern(1, level).reduce((a, b) => a + b, 0);
    assert.true(total(SCARE.levels.gentle) < total(SCARE.levels.creepy));
    assert.true(total(SCARE.levels.creepy) < total(SCARE.levels.terrifying));
  });

  QUnit.test("a shake is nothing with no strength, and never more than the table's turn", (assert) => {
    assert.deepEqual(shakeOffset(1.2, 0), [0, 0]);
    for (let t = 0; t < 10; t += 0.01) {
      const [yaw, pitch] = shakeOffset(t, 1);
      assert.true(Math.abs(yaw) <= SCARE.shakeRadians + 1e-12 && Math.abs(pitch) <= SCARE.shakeRadians + 1e-12);
    }
  });

  QUnit.test("a shake moves, and does not go the same way for ever", (assert) => {
    const yaws = [];
    for (let t = 0; t < 2; t += 0.01) yaws.push(shakeOffset(t, 1)[0]);
    assert.true(Math.max(...yaws) > 0.01 && Math.min(...yaws) < -0.01);
  });

  QUnit.test("a shaken view still points about the same way, as a direction of length one, with the up at right angles", (assert) => {
    const view = { forward: [0, 0, 1], up: [0, 1, 0] };
    const shaken = shakeView(view, [0.03, 0.02]);
    assert.true(Math.abs(Math.hypot(...shaken.forward) - 1) < 1e-9);
    assert.true(shaken.forward[2] > 0.99);
    assert.true(Math.abs(shaken.forward[0]) > 0.01, "it has turned");
    assert.deepEqual(shakeView(view, [0, 0]).forward, [0, 0, 1]);
  });
});

QUnit.module("ScareSequence", () => {
  const make = (level = "creepy") => {
    const table = { ...SCARE, level };
    return new ScareSequence(table);
  };

  QUnit.test("nothing happens until there is a strike", (assert) => {
    const scare = make();
    const frame = scare.update(0.1);
    assert.strictEqual(frame.fired, null);
    assert.strictEqual(frame.flash, 0);
    assert.strictEqual(frame.shake, 0);
    assert.strictEqual(frame.ambient, 1);
  });

  QUnit.test("a strike fires once, with its buzz, and is a flash and a shake and a silence for that frame", (assert) => {
    const scare = make();
    assert.true(scare.trigger("lunge"));
    const frame = scare.update(0.016);
    assert.strictEqual(frame.fired.kind, "lunge");
    assert.true(frame.fired.vibrate.length > 0);
    assert.true(frame.flash > 0 && frame.shake > 0);
    assert.strictEqual(frame.ambient, 0);
    assert.strictEqual(scare.update(0.016).fired, null, "and only once");
  });

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
    assert.strictEqual(last.flash, 0);
    assert.strictEqual(last.shake, 0);
    assert.strictEqual(last.ambient, 1);
  });

  QUnit.test("a touch is harder than a lunge", (assert) => {
    const lunge = make(), touch = make();
    lunge.trigger("lunge");
    touch.trigger("touch");
    assert.true(touch.update(0.016).flash > lunge.update(0.016).flash);
  });

  QUnit.test("a second strike in the cooldown is the same scare, unless it is a harder one", (assert) => {
    const scare = make();
    scare.trigger("lunge");
    scare.update(0.016);
    assert.false(scare.trigger("lunge"));
    assert.true(scare.trigger("touch"), "a touch on top of a lunge is allowed");
    scare.update(0.016);
    assert.strictEqual(scare.strikes, 2);
  });

  QUnit.test("another strike is allowed once it is all over", (assert) => {
    const scare = make();
    scare.trigger("lunge");
    scare.update(0.016);
    for (let t = 0; t < 4; t += 0.1) scare.update(0.1);
    assert.true(scare.trigger("lunge"));
  });

  QUnit.test("the level scales everything: the gentlest level never flashes or shakes, and the strongest does most", (assert) => {
    const frameAt = (level) => {
      const scare = make(level);
      scare.trigger("touch");
      return scare.update(0.016);
    };
    const gentle = frameAt("gentle"), creepy = frameAt("creepy"), terrifying = frameAt("terrifying");
    assert.strictEqual(gentle.flash, 0);
    assert.strictEqual(gentle.shake, 0);
    assert.true(creepy.flash < terrifying.flash);
    assert.true(gentle.volume < creepy.volume && creepy.volume < terrifying.volume);
  });

  QUnit.test("the level can be changed while it is played", (assert) => {
    const scare = make("creepy");
    scare.setLevel("gentle");
    scare.trigger("touch");
    assert.strictEqual(scare.update(0.016).flash, 0);
    scare.setLevel("nonsense");
    assert.strictEqual(scare.level, SCARE.levels.gentle, "a level that does not exist changes nothing");
  });
});
```

Things to notice:

- **The levels are tested as a family**: in every number, the gentle level is no more than the creepy, and the creepy no more than the terrifying; and the gentlest has no flash and no shake.
- **The sequence is tested as a timeline**: fires once, never gets brighter as it fades, the room never gets quieter as it comes back, ends at exactly nothing.
- **The cooldown is tested both ways**: a second lunge is refused, a touch is accepted, and after it is all over another may begin.

Open `tests.html`. You should see **260 passing tests**: 18 more.

## Step 2: Sound

### Web Audio in a few lines

Web Audio is a **graph**. Sources (an oscillator makes a note, a buffer of noise makes a hiss) are connected through nodes that change them (a **filter** keeps only some of the notes, a **gain** makes it louder or softer, a **panner** puts it in a place) to the **destination**, which is the speakers. Everything is *scheduled in time*: a gain that goes from 0 to 1 in a tenth of a second is `linearRampToValueAtTime`. And there is a **listener**, the ears, with a position and a direction.

Everything in the game's sound is some of these:

| Sound | What it is |
|-------|-----------|
| the **hum** of the room | two low sine notes, a little out of tune with each other, so they beat slowly |
| the **heart** | two thumps (a low note that falls) close together, then a gap |
| a **creak** | noise through a narrow filter that slides up: wood taking weight |
| a **whisper** | noise through a wider filter at a high pitch, swelling and fading |
| the **stinger** | four notes that rub against each other, each falling an octave and a half, with a burst of noise on top |
| a **thud** | a low note that falls, fast |
| a **spider's feet** | very short bursts of high-pass noise: tick tick tick |
| a **ghoul's groan** | a low sawtooth, gliding down, through a low-pass filter |
| a **skeleton's rattle** | short bursts of higher noise, quicker |

### The pure parts

The sound has things that are just arithmetic and can be tested without a speaker. **`toAudioSpace`**: the game has z ahead (left handed), Web Audio has z behind (right handed), so every position is flipped in z. **`voiceParams`**: what a creature's voice is, from its kind, what it is doing, and how far it is (a voice fades to nothing at 14 metres, is quicker and louder in a lunge, and silent when dying). **`heartbeats`**: the times of the thumps in a stretch of time, at a rate, from where the last beat left off (two a beat, the second closer and softer).

Open `js/audio.js` (the placeholder) and **replace the TODO line** with:

```js
// Sound, made in code: no sound files. A low hum for the room, a heart that beats faster as the dread comes near, a voice for each kind
// of creature (the tick of a spider, the groan of a ghoul, the rattle of a skeleton), a creak to say that something has come in behind
// you, and the stinger of a strike. Every sound that belongs to a place is **positional**: it comes from where the creature is, through
// the Web Audio panner with head-related filtering, so with headphones a thing behind you is behind you. The pure parts (the heart, the
// space, the parameters of a voice) are tested alone; the rest is tested by rendering it into a buffer with an offline audio context and
// listening to the numbers. See ../tests/audio.tests.js.

const AUDIO = {
  master: 0.9,
  hum: { low: 48, high: 71, volume: 0.1 }, // two notes a little out of tune with each other
  heart: { volume: 0.55, pitch: 62 },
  panning: "HRTF", // how a sound is placed in the head: with the filtering of a real ear ("equalpower" is plain left and right)
  voiceDistance: 14, // metres at which a voice has faded out
  stinger: { volume: 1, seconds: 1.4 },
};

// The game has x right, y up and z ahead (left handed); Web Audio has x right, y up and z behind (right handed): a flip of z.
function toAudioSpace(v) {
  return [v[0], v[1], -v[2]];
}

// What a voice is, from the kind of creature and what it is doing: how loud, how often it sounds, and what it sounds like.
function voiceParams(kind, state, distance, table = AUDIO) {
  const near = Math.max(0, 1 - distance / table.voiceDistance);
  const active = state === "stalk" ? 1 : state === "lunge" ? 1.6 : state === "lurk" ? 0.3 : state === "recover" ? 0.4 : 0;
  const base = {
    spider: { every: 0.11, pitch: 3400, wave: "noise", length: 0.03, loud: 0.5 }, // a tick-tick-tick of feet
    ghoul: { every: 1.7, pitch: 70, wave: "sawtooth", length: 0.9, loud: 0.8 }, // a long low groan
    skeleton: { every: 0.16, pitch: 5200, wave: "noise", length: 0.045, loud: 0.45 }, // a dry rattle
  }[kind] || { every: 1, pitch: 400, wave: "sine", length: 0.2, loud: 0.3 };
  return { ...base, gain: base.loud * near * Math.min(1, active), every: base.every / Math.max(0.3, active) };
}

// A heart: two thumps close together, then a gap, at a rate. Gives the times of the thumps in a stretch of time, from where the last
// beat left off. [{ time, strength }] and the time of the next beat.
function heartbeats(from, until, bpm) {
  const gap = 60 / bpm;
  const beats = [];
  let at = from;
  while (at < until) {
    beats.push({ time: at, strength: 1 }, { time: at + gap * 0.28, strength: 0.65 });
    at += gap;
  }
  return { beats, next: at };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AUDIO, toAudioSpace, voiceParams, heartbeats };
} else {
  Object.assign(window, { AUDIO, toAudioSpace, voiceParams, heartbeats });
}
```

### The sound

In `js/audio.js`, find the export block (lines 47 to 54) and **delete it**. Add this in its place, and the export block under it:

```js
class GhostAudio {
  // `makeContext` makes the audio context: a normal one (it can only be made after the player has touched the screen), or an
  // offline one in a test.
  constructor(makeContext = () => new (window.AudioContext || window.webkitAudioContext)(), table = AUDIO) {
    this.makeContext = makeContext;
    this.table = table;
    this.context = null;
    this.level = 1; // the scare level's volume
    this.dreadHum = 1;
    this.nextBeat = 0;
    this.heartBpm = 58;
    this.heartOn = false;
    this.voices = new Map();
  }

  get ready() {
    return this.context !== null;
  }

  // Makes the context and the hum. Call it from the tap.
  async start() {
    if (this.context) return;
    this.context = this.makeContext();
    const context = this.context;
    try {
      if (context.resume) await context.resume(); // a phone starts it asleep until the page has been touched
    } catch (error) {
      // an offline context (a test) cannot be resumed, and does not need it
    }
    this.master = context.createGain();
    this.master.gain.value = this.table.master * this.level;
    this.master.connect(context.destination);
    this.noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.hum = context.createGain();
    this.hum.gain.value = this.table.hum.volume * this.dreadHum;
    this.hum.connect(this.master);
    for (const [frequency, detune] of [[this.table.hum.low, 0], [this.table.hum.high, 7]]) {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = detune;
      oscillator.connect(this.hum);
      oscillator.start();
    }
    this.nextBeat = context.currentTime + 0.5;
  }

  // The player's ears: where they are and which way they face, in the game's world.
  setListener(player) {
    if (!this.context) return;
    const listener = this.context.listener;
    const [px, py, pz] = toAudioSpace(player.position);
    const [fx, fy, fz] = toAudioSpace(player.forward);
    const [ux, uy, uz] = toAudioSpace(player.up);
    if (listener.positionX) {
      listener.positionX.value = px;
      listener.positionY.value = py;
      listener.positionZ.value = pz;
      listener.forwardX.value = fx;
      listener.forwardY.value = fy;
      listener.forwardZ.value = fz;
      listener.upX.value = ux;
      listener.upY.value = uy;
      listener.upZ.value = uz;
    } else {
      listener.setPosition(px, py, pz);
      listener.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  // The scare level's volume (0 to 1), for everything.
  setVolume(volume) {
    this.level = volume;
    if (this.master) this.master.gain.value = this.table.master * volume;
  }

  // How much of the hum there is: the room going quiet as something comes near.
  setHum(amount) {
    this.dreadHum = amount;
    if (this.hum) this.hum.gain.value = this.table.hum.volume * amount;
  }

  _panner(position) {
    const panner = this.context.createPanner();
    panner.panningModel = this.table.panning;
    panner.distanceModel = "inverse";
    panner.refDistance = 1.5;
    panner.rolloffFactor = 1.2;
    const [x, y, z] = toAudioSpace(position);
    if (panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x, y, z);
    }
    panner.connect(this.master);
    return panner;
  }

  _noiseSource(destination, at, seconds) {
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    source.connect(destination);
    source.start(at, Math.random());
    source.stop(at + seconds);
    return source;
  }

  // A short sound of a kind at a place, at a time (now, if none). `strength` is 0 to 1.
  cue(name, position = null, strength = 1, at = null) {
    if (!this.context) return false;
    const context = this.context;
    const start = at === null ? context.currentTime : at;
    const out = position ? this._panner(position) : this.master;
    const gain = context.createGain();
    gain.connect(out);
    if (name === "creak") {
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 12;
      filter.frequency.setValueAtTime(220, start);
      filter.frequency.exponentialRampToValueAtTime(520, start + 0.9);
      filter.connect(gain);
      this._noiseSource(filter, start, 1);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.5 * strength, start + 0.15);
      gain.gain.linearRampToValueAtTime(0, start + 1);
    } else if (name === "whisper") {
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.value = 3;
      filter.frequency.value = 2200;
      filter.connect(gain);
      this._noiseSource(filter, start, 1.6);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25 * strength, start + 0.4);
      gain.gain.linearRampToValueAtTime(0, start + 1.6);
    } else if (name === "stinger") {
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
    } else if (name === "thud") {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(110, start);
      oscillator.frequency.exponentialRampToValueAtTime(35, start + 0.3);
      oscillator.connect(gain);
      oscillator.start(start);
      oscillator.stop(start + 0.35);
      gain.gain.setValueAtTime(0.8 * strength, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
    } else {
      return false;
    }
    return true;
  }

  // The heart, at a rate: the beats up to a little ahead of now are scheduled, as the sound is made a moment before it is heard.
  setHeart(bpm, on = true) {
    this.heartBpm = bpm;
    this.heartOn = on;
  }

  scheduleHeart(until) {
    if (!this.context || !this.heartOn) return 0;
    const { beats, next } = heartbeats(this.nextBeat, until, this.heartBpm);
    this.nextBeat = next;
    for (const beat of beats) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.frequency.setValueAtTime(this.table.heart.pitch, beat.time);
      oscillator.frequency.exponentialRampToValueAtTime(this.table.heart.pitch * 0.55, beat.time + 0.12);
      gain.gain.setValueAtTime(this.table.heart.volume * beat.strength, beat.time);
      gain.gain.exponentialRampToValueAtTime(0.001, beat.time + 0.16);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(beat.time);
      oscillator.stop(beat.time + 0.18);
    }
    return beats.length;
  }

  // The voice of a creature: sounds now and then from where it is, as its kind and state say. `id` is the creature's.
  voice(id, kind, state, position, distance, seconds) {
    if (!this.context) return;
    const params = voiceParams(kind, state, distance, this.table);
    const voice = this.voices.get(id) || { wait: 0 };
    this.voices.set(id, voice);
    voice.wait -= seconds;
    if (voice.wait > 0 || params.gain < 0.01) return;
    voice.wait = params.every * (0.7 + Math.random() * 0.6);
    const context = this.context;
    const now = context.currentTime;
    const panner = this._panner(position);
    const gain = context.createGain();
    gain.connect(panner);
    gain.gain.setValueAtTime(params.gain, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + params.length);
    if (params.wave === "noise") {
      const filter = context.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = params.pitch;
      filter.connect(gain);
      this._noiseSource(filter, now, params.length);
    } else {
      const oscillator = context.createOscillator();
      oscillator.type = params.wave;
      oscillator.frequency.setValueAtTime(params.pitch * 1.3, now);
      oscillator.frequency.exponentialRampToValueAtTime(params.pitch * 0.8, now + params.length);
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      oscillator.connect(filter);
      filter.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + params.length);
    }
  }

  forget(id) {
    this.voices.delete(id);
  }

  // Every frame: where the player is, and the heart.
  update(seconds, player) {
    if (!this.context) return;
    this.setListener(player);
    this.scheduleHeart(this.context.currentTime + 0.4);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { AUDIO, toAudioSpace, voiceParams, heartbeats, GhostAudio };
} else {
  Object.assign(window, { AUDIO, toAudioSpace, voiceParams, heartbeats, GhostAudio });
}
```

Things to notice:

- **Nothing is made until `start`**, and `start` must be called from a tap: a phone will not let a page make sound before the person has touched the screen. A test says that a game that has not started makes no context at all.
- **The context is given in** (`makeContext`): the game makes a normal one, and a test makes an **offline** one that renders into a buffer instead of the speakers.
- **`HRTF`** is how a sound is placed in the head with the filtering of a real ear: it is what makes "behind you" sound behind you in headphones. It is a number of the table, so a test can use plain left-and-right.
- **A cue is scheduled**, not "played": `cue(name, position, strength, at)` can be told to sound a moment from now (the whisper of a ghost comes a second before it does).
- **The heart is scheduled ahead**: the sound for a beat is made a moment *before* it is heard, so `update` schedules the beats of the next 0.4 seconds, and `nextBeat` remembers where it got to.
- **The stinger's notes are chosen to hurt**: 311, 329, 466 and 622 Hz are a minor second (E flat against E), and a tritone: the notes of a film's strings when something has jumped out.

### Tests

Open `tests/audio.tests.js` and **replace the TODO line** with:

```js
QUnit.module("the pure parts of the sound", () => {
  QUnit.test("the game's space is flipped in z for Web Audio", (assert) => {
    assert.deepEqual(toAudioSpace([1, 2, 3]), [1, 2, -3]);
  });

  QUnit.test("something to the right of the player is to the right of the listener", (assert) => {
    // the listener faces (0,0,-1) with up (0,1,0): right = forward x up
    const [fx, fy, fz] = toAudioSpace([0, 0, 1]);
    const [ux, uy, uz] = toAudioSpace([0, 1, 0]);
    const right = [fy * uz - fz * uy, fz * ux - fx * uz, fx * uy - fy * ux];
    const source = toAudioSpace([5, 0, 0]);
    assert.true(right[0] * source[0] + right[1] * source[1] + right[2] * source[2] > 4);
  });

  QUnit.test("a voice fades with distance, and is nothing out of range", (assert) => {
    const near = voiceParams("ghoul", "stalk", 2);
    const far = voiceParams("ghoul", "stalk", 10);
    assert.true(near.gain > far.gain && far.gain > 0);
    assert.strictEqual(voiceParams("ghoul", "stalk", AUDIO.voiceDistance + 1).gain, 0);
  });

  QUnit.test("a voice is louder and quicker when the creature is doing more, and silent when it is dying", (assert) => {
    const stalk = voiceParams("spider", "stalk", 3), lunge = voiceParams("spider", "lunge", 3), lurk = voiceParams("spider", "lurk", 3);
    assert.true(lunge.gain >= stalk.gain && stalk.gain > lurk.gain);
    assert.true(lunge.every < stalk.every && stalk.every < lurk.every);
    assert.strictEqual(voiceParams("spider", "dying", 3).gain, 0);
  });

  QUnit.test("each kind has its own sound: a spider ticks, a ghoul groans, a skeleton rattles", (assert) => {
    const spider = voiceParams("spider", "stalk", 2), ghoul = voiceParams("ghoul", "stalk", 2), skeleton = voiceParams("skeleton", "stalk", 2);
    assert.strictEqual(spider.wave, "noise");
    assert.strictEqual(ghoul.wave, "sawtooth");
    assert.true(ghoul.length > spider.length * 10);
    assert.true(skeleton.pitch > spider.pitch);
    assert.strictEqual(voiceParams("dragon", "stalk", 2).wave, "sine", "a kind that is not known still has a voice");
  });

  QUnit.test("the heart: two thumps a beat, at the rate, from where the last left off", (assert) => {
    const { beats, next } = heartbeats(0, 3, 60);
    assert.strictEqual(beats.length, 6, "three beats in three seconds at 60 a minute");
    assert.strictEqual(beats[0].time, 0);
    assert.true(beats[1].time > 0 && beats[1].time < 0.5 && beats[1].strength < beats[0].strength, "the second thump is close and softer");
    assert.strictEqual(next, 3);
    const more = heartbeats(next, 4, 60);
    assert.strictEqual(more.beats[0].time, 3);
  });

  QUnit.test("a faster heart has more beats in the same time", (assert) => {
    assert.true(heartbeats(0, 10, 140).beats.length > heartbeats(0, 10, 60).beats.length * 2 - 2);
  });
});

QUnit.module("the sound, heard", () => {
  const SECONDS = 2, RATE = 22050;
  const offline = () => new OfflineAudioContext(2, RATE * SECONDS, RATE);
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const rms = (data) => Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length);
  // The tests place sounds with plain left and right (a headless browser may not have the filters of a real ear); the game uses HRTF.
  const heard = async (play, volume = 1) => {
    const context = offline();
    const audio = new GhostAudio(() => context, { ...AUDIO, panning: "equalpower" });
    await audio.start();
    audio.setVolume(volume);
    audio.setHum(0);
    audio.setListener(player);
    play(audio);
    const buffer = await context.startRendering();
    return { left: rms(buffer.getChannelData(0)), right: rms(buffer.getChannelData(1)) };
  };

  QUnit.test("nothing is made before the player has touched the screen", (assert) => {
    const audio = new GhostAudio(() => { throw new Error("made too early"); });
    assert.false(audio.ready);
    assert.false(audio.cue("stinger"));
    audio.update(0.1, player);
    assert.false(audio.ready);
  });

  QUnit.test("with nothing playing and the hum off, there is silence", async (assert) => {
    const { left, right } = await heard(() => {});
    assert.true(left < 1e-6 && right < 1e-6);
  });

  QUnit.test("a stinger is loud", async (assert) => {
    const { left, right } = await heard((audio) => audio.cue("stinger", null, 1));
    assert.true(left > 0.02 && right > 0.02, `${left.toFixed(3)} ${right.toFixed(3)}`);
  });

  QUnit.test("a sound to the right is louder in the right ear, and one to the left in the left", async (assert) => {
    const onRight = await heard((audio) => audio.cue("thud", [4, 1.4, 0], 1));
    const onLeft = await heard((audio) => audio.cue("thud", [-4, 1.4, 0], 1));
    assert.true(onRight.right > onRight.left * 1.2, `right: ${onRight.left.toFixed(4)} ${onRight.right.toFixed(4)}`);
    assert.true(onLeft.left > onLeft.right * 1.2, `left: ${onLeft.left.toFixed(4)} ${onLeft.right.toFixed(4)}`);
  });

  QUnit.test("a sound that is far away is quieter than one that is near", async (assert) => {
    const near = await heard((audio) => audio.cue("thud", [0, 1.4, 2], 1));
    const far = await heard((audio) => audio.cue("thud", [0, 1.4, 12], 1));
    assert.true(near.left + near.right > (far.left + far.right) * 2);
  });

  QUnit.test("the scare level's volume is the volume of everything", async (assert) => {
    const loud = await heard((audio) => audio.cue("stinger", null, 1), 1);
    const soft = await heard((audio) => audio.cue("stinger", null, 1), 0.3);
    assert.true(soft.left < loud.left * 0.5);
    assert.true(soft.left > 0);
  });

  QUnit.test("a creak and a whisper make sound, and a name that is not a sound makes none", async (assert) => {
    const creak = await heard((audio) => audio.cue("creak", [0, 1.4, -3], 1));
    const whisper = await heard((audio) => audio.cue("whisper", [3, 1.4, 0], 1));
    assert.true(Math.max(creak.left, creak.right) > 0.001 && Math.max(whisper.left, whisper.right) > 0.001);
    const audio = new GhostAudio(() => offline());
    await audio.start();
    assert.false(audio.cue("not a sound"));
  });

  QUnit.test("the hum is there when it is on, and goes when the room goes quiet", async (assert) => {
    const context = offline();
    const audio = new GhostAudio(() => context);
    await audio.start();
    audio.setHum(1);
    const on = rms((await context.startRendering()).getChannelData(0));
    const quiet = offline();
    const second = new GhostAudio(() => quiet);
    await second.start();
    second.setHum(0);
    const off = rms((await quiet.startRendering()).getChannelData(0));
    assert.true(on > 0.01 && off < 1e-6, `${on.toFixed(4)} ${off.toFixed(6)}`);
  });

  QUnit.test("the heart beats when it is on and makes the beats of the rate", async (assert) => {
    const context = offline();
    const audio = new GhostAudio(() => context);
    await audio.start();
    audio.setHum(0);
    audio.setHeart(120, true);
    const count = audio.scheduleHeart(SECONDS);
    assert.true(count >= 4, `${count} thumps`);
    assert.true(rms((await context.startRendering()).getChannelData(0)) > 0.005);
    const silent = new GhostAudio(() => offline());
    await silent.start();
    silent.setHeart(120, false);
    assert.strictEqual(silent.scheduleHeart(SECONDS), 0);
  });

  QUnit.test("a creature's voice sounds now and then, and not while it is silent", async (assert) => {
    const context = offline();
    const audio = new GhostAudio(() => context);
    await audio.start();
    audio.setHum(0);
    audio.voice(1, "ghoul", "stalk", [0, 0, 3], 3, 0);
    const first = audio.voices.get(1).wait;
    assert.true(first > 0, "it has set when it sounds next");
    audio.voice(1, "ghoul", "stalk", [0, 0, 3], 3, 0.01);
    assert.true(audio.voices.get(1).wait <= first, "and the wait runs down");
    audio.voice(2, "ghoul", "dying", [0, 0, 3], 3, 0);
    assert.strictEqual(audio.voices.get(2).wait, 0, "a dying creature makes none");
    audio.forget(1);
    assert.false(audio.voices.has(1));
    assert.true(rms((await context.startRendering()).getChannelData(0)) > 0.0005);
  });
});
```

Things to notice:

- **The sound is rendered, and measured.** `OfflineAudioContext` runs the graph for two seconds into a buffer without any speaker, and the test takes the *root mean square* of each channel (a measure of how loud it is). Silence is below a millionth; a stinger is far above.
- **Space is tested by ear**: a sound at the right is louder in the right channel, one at the left in the left, one far away is quieter than one that is near, and the scare level's volume scales everything.
- **Silence is tested too**: with nothing playing and the hum off, the buffer is silent.

Open `tests.html`. You should see **277 passing tests**: 17 more.

## Step 3: What is seen

Two layers over the picture, and a way to choose. **The flash** comes with a strike: white in the middle, red at the edges, and as bright as the strike and the level say. **The dark edge** closes in as something comes near: as thick as the dread and the level say. **The picker** is the row of three buttons on the start screen, with a sentence under them that says what the chosen one does. All three are made from the page's own elements, given the `document`, like the start screen.

Open `css/scare.css` (the placeholder) and **replace the TODO line** with:

```css
/* The scare: the choice of how much of it on the start screen, and the two layers over the picture (see scareui.js): a flash that comes
   with a strike, and a dark edge that closes in as something comes near. Neither takes a touch. */
#start-level {
  display: flex;
  gap: 8px;
}
#start-level button {
  padding: 6px 14px;
  border: 1px solid var(--bone);
  background: transparent;
  color: var(--bone);
  font: 15px var(--small-font);
  cursor: pointer;
}
#start-level button.selected {
  border-color: var(--blood);
  background: var(--blood);
  color: var(--bone);
}
#start-level-note {
  margin: 0;
  min-height: 1.3em;
  font-size: 13px;
  color: var(--bone);
}
#flash, #vignette {
  position: fixed;
  inset: 0;
  z-index: 8;
  pointer-events: none;
  opacity: 0;
}
#flash {
  background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.95), rgba(196, 22, 31, 0.8));
  z-index: 9;
}
#vignette {
  background: radial-gradient(ellipse at 50% 50%, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.85) 100%);
}
```

Open `js/scareui.js` (the placeholder) and **replace the TODO line** with:

```js
// What the player sees of a scare, and the choice of how much of it they want. The picker is the row of three buttons on the start screen
// (Gentle, Creepy, Terrifying) that says in words what each does; the effects are two layers over the picture, a flash that comes with a
// strike and a dark edge that closes in as something comes near. Both are built from the page's own elements and given the `document`,
// so the tests can give them a stand-in. See ../tests/scareui.tests.js.

class LevelPicker {
  constructor(doc, table = SCARE, onChange = () => {}) {
    this.table = table;
    this.onChange = onChange;
    this.root = doc.getElementById("start-level");
    this.note = doc.getElementById("start-level-note");
    this.buttons = {};
    for (const name of levelNames(table)) {
      const button = doc.createElement("button");
      button.type = "button";
      button.textContent = table.levels[name].label;
      button.addEventListener("click", () => this.select(name));
      this.root.appendChild(button);
      this.buttons[name] = button;
    }
    this.select(table.level, false);
  }

  // Chooses a level: the button is marked, the words under the buttons say what it does, and whoever is listening is told.
  select(name, tell = true) {
    if (!(name in this.table.levels)) return;
    this.table.level = name;
    for (const [other, button] of Object.entries(this.buttons)) {
      if (other === name) button.classList.add("selected");
      else button.classList.remove("selected");
    }
    this.note.textContent = this.table.levels[name].note;
    if (tell) this.onChange(name);
  }
}

class ScareFx {
  constructor(doc) {
    this.flash = doc.getElementById("flash");
    this.vignette = doc.getElementById("vignette");
  }

  // `flash` is 0 to 1 (the strike), `dread` is 0 to 1 (how near it is), `level` is the scare level's row.
  apply({ flash, dread, level }) {
    this.flash.style.opacity = String(Math.min(1, flash).toFixed(3));
    this.vignette.style.opacity = String((dread * level.vignette).toFixed(3));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LevelPicker, ScareFx };
} else {
  Object.assign(window, { LevelPicker, ScareFx });
}
```

Open `tests/scareui.tests.js` and **replace the TODO line** with:

```js
QUnit.module("LevelPicker and ScareFx", () => {
  class FakeElement {
    constructor() {
      this.children = [];
      this.listeners = {};
      this.classes = new Set();
      this.style = {};
      this.textContent = "";
      this.classList = { add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name), contains: (name) => this.classes.has(name) };
    }
    appendChild(child) { this.children.push(child); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const page = () => {
    const elements = { "start-level": new FakeElement(), "start-level-note": new FakeElement(), flash: new FakeElement(), vignette: new FakeElement() };
    return { elements, doc: { getElementById: (id) => elements[id], createElement: () => new FakeElement() } };
  };
  const table = () => ({ ...SCARE, level: "creepy" });

  QUnit.test("there is a button for every level, in order, and the chosen one is marked", (assert) => {
    const { doc, elements } = page();
    const picker = new LevelPicker(doc, table());
    assert.deepEqual(elements["start-level"].children.map((b) => b.textContent), ["Gentle", "Creepy", "Terrifying"]);
    assert.true(picker.buttons.creepy.classes.has("selected"));
    assert.false(picker.buttons.gentle.classes.has("selected"));
    assert.strictEqual(elements["start-level-note"].textContent, SCARE.levels.creepy.note);
  });

  QUnit.test("pressing a button chooses it, says what it does, and tells whoever is listening", (assert) => {
    const { doc, elements } = page();
    const told = [];
    const t = table();
    const picker = new LevelPicker(doc, t, (name) => told.push(name));
    picker.buttons.terrifying.listeners.click();
    assert.deepEqual(told, ["terrifying"]);
    assert.strictEqual(t.level, "terrifying");
    assert.true(picker.buttons.terrifying.classes.has("selected"));
    assert.false(picker.buttons.creepy.classes.has("selected"));
    assert.strictEqual(elements["start-level-note"].textContent, SCARE.levels.terrifying.note);
  });

  QUnit.test("a level that does not exist is ignored, and setting the one it starts with tells nobody", (assert) => {
    const { doc } = page();
    const told = [];
    const picker = new LevelPicker(doc, table(), (name) => told.push(name));
    picker.select("nonsense");
    assert.deepEqual(told, []);
    assert.strictEqual(picker.table.level, "creepy");
  });

  QUnit.test("the flash is as bright as the strike says, and the dark edge as thick as the dread and the level", (assert) => {
    const { doc, elements } = page();
    const fx = new ScareFx(doc);
    fx.apply({ flash: 0.5, dread: 0.5, level: SCARE.levels.creepy });
    assert.strictEqual(elements.flash.style.opacity, "0.500");
    assert.strictEqual(Number(elements.vignette.style.opacity), 0.5 * SCARE.levels.creepy.vignette);
    fx.apply({ flash: 7, dread: 0, level: SCARE.levels.gentle });
    assert.strictEqual(elements.flash.style.opacity, "1.000", "never more than all");
    assert.strictEqual(Number(elements.vignette.style.opacity), 0);
  });
});
```

Things to notice:

- **The picker writes the choice to the table** (`table.level`), and tells whoever is listening: the game then changes the scare, the volume and the browser's memory. Setting the level it starts with tells nobody.
- **Both layers have `pointer-events: none`**: nothing is under them that cannot be touched.

Open `tests.html`. You should see **281 passing tests**: 4 more.

## Step 4: The game

In `js/main.js`, small changes in several places and a new section.

### The hooks

A new piece of state for how hard the view is being shaken, and the scare level, read from the address or the browser before anything else:

In `js/main.js`, after line 17, add:

```js
let shakeAmount = 0; // how hard the view is being shaken by a strike, 0 to 1
```

In `js/main.js`, after line 25, add:

```js
const LEVEL_KEY = "ghost-hunter.scare"; // where the scare level is kept in the browser
SCARE.level = levelWanted(location.search, remembered(LEVEL_KEY));

```

Then the places where something happens that should be heard. A ghost's **whisper** comes as it begins to appear (a second or two after the mark); a creature's **creak** comes when it is made, from where it is (that is the tell: *you hear it before you see it*); its voice is forgotten when it goes; a **lunge** and a **touch** are scares; a **landing** is a thud.

In `js/main.js`, after line 68, add:

```js
    if (audio.ready) audio.cue("whisper", item.home, 0.8, audio.context.currentTime + GHOST.summonDelay); // a whisper, as it comes
```

In `js/main.js`, after line 102, add:

```js
    audio.cue("creak", item.position, 1); // the tell: a creak from where it is, before it is anywhere to be seen
```

In `js/main.js`, after line 107, add:

```js
    audio.forget(item.id);
```

In `js/main.js`, after line 111, add:

```js
    if (type === "lunge" || type === "touch") scare.trigger(type); // and it is a scare
    if (type === "landed") audio.cue("thud", item.position, 0.7);
```

### The scare

The section that joins it all: the sound, the sequence, the layers and the picker; and a system that runs every frame. It finds the nearest creature and the dread; asks the sequence for the frame (a strike fires the stinger, and buzzes the phone if it has a buzzer); sets the hum and the heart from the build-up; brings the sound's ears up to date and gives every creature its voice; and sets the two layers.

In `js/main.js`, after line 147, add:

```js
// The scare. `audio` is every sound of the game, made in code (audio.js); `scare` is the build-up, the strike and the aftershock as numbers
// (scare.js); `fx` is the flash and the dark edge over the picture. The choice of how much of it the player wants is on the start screen.
const audio = new GhostAudio();
const scare = new ScareSequence(SCARE);
const fx = new ScareFx(document);
const picker = new LevelPicker(document, SCARE, (name) => {
  scare.setLevel(name);
  audio.setVolume(SCARE.levels[name].volume);
  remember(LEVEL_KEY, name);
});
scare.setLevel(SCARE.level);
audio.setVolume(SCARE.levels[SCARE.level].volume);
let dread = 0; // how near the nearest creature is, as a feeling: 0 to 1

systems.push((seconds, player) => {
  const level = SCARE.levels[SCARE.level];
  const near = playing ? creatures.nearest(player.position) : null;
  dread = near ? dreadAt(near.distance, CREATURES[near.creature.kind].lungeRange) : 0;
  const frame = scare.update(seconds);
  shakeAmount = mode === "xr" ? 0 : frame.shake; // in augmented reality the phone's own view is not ours to shake
  if (frame.fired) {
    audio.cue("stinger", null, frame.fired.strength);
    if (frame.fired.vibrate.length && navigator.vibrate) navigator.vibrate(frame.fired.vibrate);
  }
  const quiet = buildUp(dread, level);
  audio.setHum(quiet.ambient * frame.ambient);
  audio.setHeart(quiet.heart, dread > 0.05);
  audio.update(seconds, player);
  for (const creature of creatures.items) audio.voice(creature.id, creature.kind, creature.state, creature.position, creature.distanceTo(player.position), seconds);
  fx.apply({ flash: frame.flash, dread, level });
});

```

Things to notice:

- **Nothing is scary before the button.** The dread is 0 until the game is `playing`, and the layers are clear.
- **`navigator.vibrate` is only there on some phones** (Android), so it is asked before it is used. An iPhone does not buzz, and it does not need to be told.
- **In augmented reality the view is not ours to shake**: the phone's own camera is the view, so `shakeAmount` is 0. The flash, the dark edge and all the sound still work.

### The shake

The shake is put on what is *drawn*, in `aim`: the view is shaken, and the camera is turned to the shaken view; what the game thinks the player is looking at is the unshaken one.

In `js/main.js`, **replace** line 351:

```js
  const { right, up, forward } = lookAxes(view.forward, view.up);
```

with:

```js
  const shown = shakeAmount > 0 ? shakeView(view, shakeOffset(clock, shakeAmount)) : view; // a strike shakes what is seen, not where the phone points
  const { right, up, forward } = lookAxes(shown.forward, shown.up);
```

### Starting the sound

In `js/main.js`, after line 460, add:

```js
  audio.start(); // the sound can only begin from a touch of the screen (it is not waited for: the other questions are asked at once)
```

### Developer mode

A group of rows: the level, the dread, the heart, whether the sound is running, how many strikes; sliders for when the room goes quiet, how hard the camera shakes, and the master volume; and buttons to strike (a lunge, a touch), to make a creak behind you and a whisper to the right, and to go round the levels. The map is also hidden on the start screen now (it was in the way of the buttons).

In `js/main.js`, after line 520, add:

```js
        title: "Scares",
        rows: [
          readout("level", () => SCARE.level),
          readout("dread", () => dread.toFixed(2)),
          readout("heart (beats a minute)", () => (audio.heartOn ? audio.heartBpm.toFixed(0) : "-")),
          readout("sound", () => (audio.ready ? "running" : "not started")),
          readout("strikes", () => scare.strikes),
          slider("when the room goes quiet (m)", SCARE, "tellDistance", 3, 14, 0.5),
          slider("how hard the camera shakes", SCARE, "shakeRadians", 0, 0.15, 0.005),
          slider("master volume", AUDIO, "master", 0, 1, 0.05),
          action("Strike: a lunge", () => scare.trigger("lunge")),
          action("Strike: a touch", () => scare.trigger("touch")),
          action("A creak behind you", () => audio.cue("creak", [-player.forward[0] * 3, 1, -player.forward[2] * 3], 1)),
          action("A whisper to the right", () => audio.cue("whisper", [player.forward[2] * 3, 1.4, -player.forward[0] * 3], 1)),
          action("Change the level", () => { const names = levelNames(); picker.select(names[(names.indexOf(SCARE.level) + 1) % names.length]); }),
        ],
      },
      {
```

In `js/main.js`, after line 617, add:

```js
    mapCanvas.style.visibility = playing ? "visible" : "hidden"; // not over the start screen
```

In `js/main.js`, **replace** line 644:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director }; // for poking at from the console
```

with:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio }; // for poking at from the console
```

## Step 5: Try it

Open the page with `?dev`, and **look at the start screen**: three buttons, *Gentle*, *Creepy* and *Terrifying*, and a sentence under them for each. Choose, and press the button. (Put on headphones, with the volume low.)

- **Press 2** for a ghoul. A **creak** comes from where it is, before it is anywhere in the view: turn your head towards it (drag), and the sound moves round with you.
- As it comes the **hum** drops and the **dark edges** close in; your **heart** gets faster; and at last the room is **silent**.
- The **strike**: the stinger, the flash, the shake. Then the **aftershock**: it all dies away and the hum comes back.
- Choose **Gentle** and try again: no flash, no shake, softer. Choose **Terrifying**: all of it, harder, and a longer silence.
- In the panel, **Strike: a touch** and **Strike: a lunge** try the strike without a creature. **A creak behind you** and **A whisper to the right** test the space. Move **when the room goes quiet** up to 14 m: it starts to go quiet much sooner.
- Reload: the level you chose is **remembered**. Open the page with `?scare=gentle` to override it for one visit.
- Press **P** to hide the placeholders: you cannot see the creature, and you can still **hear it coming**.

On a **phone** (with the sound up a little, and headphones if you can): the **buzz** comes with a strike, on a phone that has one. If a scare is too much, that is the level's job. If it is not enough, tell me what you would turn up.

## Step 6: Tests, all together

Open `tests.html`. You should see **281 passing tests**. The scare is tested as numbers; the sound is rendered and measured; the picker and the layers are tested with stand-ins for the page.

## Recap: what you built

| What | Where |
|------|-------|
| The levels, the build-up, the buzz, the shake | `SCARE`, `levelWanted`, `dreadAt`, `buildUp`, `vibratePattern`, `shakeOffset`, `shakeView` in `scare.js` |
| The strike and the aftershock | `ScareSequence` in `scare.js` |
| Sound made in code, in space | `GhostAudio`, `voiceParams`, `heartbeats`, `toAudioSpace` in `audio.js` |
| The picker, the flash, the dark edge | `LevelPicker`, `ScareFx` in `scareui.js`, `css/scare.css` |
| The scare in the game | `main.js` |

## Challenges

- **A proper whisper.** Make the whisper say something: three or four noises with different filters, one after the other, like syllables. What would a *test* of "it sounds like a voice" be?
- **Heartbeat on the screen.** The vignette could pulse with the heart. The beat times are known (`heartbeats`): which function would give the pulse, and where would a test of it go?
- **A breath.** In the silence before a strike, add the sound of breathing close behind the player: noise through a low filter, in and out at a rate that goes up with the dread. Make it louder at the Terrifying level only.
- **Left-handed phone.** The buzz pattern is the same for everyone; make the *flash* start at the side the creature is on, so that the first thing you see is where it came from. What does the flash need to be told?
