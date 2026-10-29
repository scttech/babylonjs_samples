# Tutorial: Parkour Runner Effects -- Sound, Sparkles, Dust and Shake

This is the eighth tutorial in the Parkour Runner series, and the second of the three that finish the game. The game looks right and has its screens, but it is silent and still: coins vanish, a crash is just a stop. In this step it gets **feel**. **Sounds** for every move, coin and crash, made with code and no sound files. **Sparkles** where a coin was picked up, **dust** where the runner crashed, a **camera shake** when he does, and a **Sick Combo banner** each time the combo reaches a multiple of five. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Sounds** made with the Web Audio API: a coin, a jump, a vault, a slide, a roll, a crash, a combo and a new best, with a **Sound: on/off** button and the **M** key, remembered between visits
- **Sparkles** and **dust**, as Babylon.js particle systems that are made once and fired by hand
- A **camera shake** that dies away, and holds still in a pause
- A **Sick Combo banner** that pops in and fades by itself, every time the combo hits 5, 10, 15 and so on
- Unit tests for all of it

**What you'll learn:** how the Web Audio API makes sound from oscillators and gain nodes (and why a browser makes you wait for a click first), describing sounds as data, particle systems (emitters, lifetimes, gravity, blending, firing a burst by hand), a decaying random shake, restarting a CSS animation from code, and how to test code that makes sound or particles without making any.

## Where you're starting

This folder is a copy of the finished Screens sample, plus empty placeholder files for the new code and its tests:

```
parkour_runner_effects/
├── index.html, tests.html
├── css/
│   └── game.css            (changes -- Step 4)
├── js/
│   ├── sounds.js           (placeholder -- Step 1)
│   ├── effects.js          (placeholder -- Step 2)
│   ├── particles.js        (placeholder -- Step 3)
│   ├── profile.js          (changes -- Step 4)
│   ├── screens.js          (changes -- Step 4)
│   ├── main.js             (changes -- Step 5)
│   └── game.js, colors.js, leaderboard.js, hud.js, and the rest    (from the Screens sample)
└── tests/
    ├── sounds / effects / particles .tests.js   (placeholders)
    └── profile / screens .tests.js grow, and the rest    (from the Screens sample)
```

### The picture

The banner uses `assets/images/sick_combo_small.png`, which is already in the shared `assets/` folder. It is a copy of the Sick Combo picture, 640 pixels wide, with its black background turned into transparency so the glow lies over the street.

### You need a web server for this one

As before, the models can't be loaded from a page opened from a file. Run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/parkour_runner/parkour_runner_effects/` (the command prints the exact address), or use the *Live Server* extension in VS Code. (`tests.html` loads no models and works from a file.)

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Screens sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**404**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: Sound, with no sound files

The Web Audio API makes sound the way a synthesizer does. An **oscillator** makes a steady wave (a sine, a square, a triangle or a sawtooth) at a pitch. A **gain** node sets its volume. You connect them in a chain to `context.destination`, which is the speakers, and start and stop them at times. Noise (a jumble of random samples) played through a **filter** makes a whoosh. Everything in this game's sound is those few pieces.

Two rules shape the code:

- **The browser stays silent until the player has done something on the page.** A click or a key press counts. Before that, a new audio context starts "suspended", and a page that makes noise by itself is a nuisance. So the context is made, and woken up, by `unlock()`, which the game calls from a click or a key.
- **A sound is data, not code.** Each is a short list of parts: a pitch gliding from one note to another, or a burst of filtered noise, each with a start, a length and a volume. One small player turns any list into sound, and the tests can read the list.

Open the placeholder `js/sounds.js` and replace its contents with:

```js
// The game's sounds, made with the Web Audio API instead of sound files: each one is a
// few beeps and bursts of noise described as data, and played by wiring up
// oscillators for as long as they last. There is nothing to download and nothing to
// license. The browser won't make a sound until the player has done something on the
// page (a click, a key), so the sounds are "unlocked" by the first one. The audio is
// reached through a function that makes the `AudioContext`, so the tests can give it a
// stand-in. See ../tests/sounds.tests.js.

// Each sound is a list of parts, played together, each starting `start` seconds in:
//   a tone:  { wave, from, to, start, length, volume }  a pitch that glides from `from` to `to` Hz
//   a noise: { noise: true, filter, start, length, volume }  a rush of noise, with its highs cut off above `filter` Hz
const SOUNDS = {
  coin: [
    { wave: "square", from: 988, to: 988, start: 0, length: 0.07, volume: 0.18 }, // B
    { wave: "square", from: 1319, to: 1319, start: 0.07, length: 0.2, volume: 0.18 }, // and the E above it
  ],
  jump: [{ wave: "square", from: 260, to: 620, start: 0, length: 0.16, volume: 0.16 }],
  vault: [
    { wave: "triangle", from: 200, to: 520, start: 0, length: 0.2, volume: 0.24 },
    { noise: true, filter: 2500, start: 0, length: 0.12, volume: 0.08 },
  ],
  slide: [{ noise: true, filter: 1800, start: 0, length: 0.35, volume: 0.18 }],
  roll: [
    { noise: true, filter: 900, start: 0, length: 0.3, volume: 0.2 },
    { wave: "sine", from: 180, to: 90, start: 0, length: 0.3, volume: 0.15 },
  ],
  crash: [
    { noise: true, filter: 1200, start: 0, length: 0.5, volume: 0.4 },
    { wave: "sawtooth", from: 160, to: 40, start: 0, length: 0.45, volume: 0.3 },
  ],
  combo: [
    { wave: "square", from: 523, to: 523, start: 0, length: 0.09, volume: 0.15 }, // C, E, G, and C an octave up
    { wave: "square", from: 659, to: 659, start: 0.08, length: 0.09, volume: 0.15 },
    { wave: "square", from: 784, to: 784, start: 0.16, length: 0.09, volume: 0.15 },
    { wave: "square", from: 1047, to: 1047, start: 0.24, length: 0.25, volume: 0.15 },
  ],
  best: [
    { wave: "triangle", from: 523, to: 523, start: 0, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 659, to: 659, start: 0.13, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 784, to: 784, start: 0.26, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 1047, to: 1047, start: 0.39, length: 0.14, volume: 0.25 },
    { wave: "triangle", from: 1319, to: 1319, start: 0.52, length: 0.45, volume: 0.25 },
  ],
};
const MASTER_VOLUME = 0.6; // every volume above is multiplied by this
const SILENCE = 0.0001; // an exponential fade can't reach 0, so it fades to this

// Makes the browser's audio context. (Some older browsers call it by another name.)
function createAudioContext() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) throw new Error("This browser has no Web Audio");
  return new Context();
}

class Sounds {
  constructor({ createContext = createAudioContext, muted = false } = {}) {
    this.createContext = createContext;
    this.muted = muted;
    this.context = null; // made by unlock(), once the player has done something
    this.noise = null; // a second of random samples, made once, that the noise parts play
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SOUNDS, MASTER_VOLUME, SILENCE, createAudioContext, Sounds };
} else {
  Object.assign(window, { SOUNDS, MASTER_VOLUME, SILENCE, createAudioContext, Sounds });
}
```

Things to notice:

- **A tone glides.** `from` and `to` are in hertz (cycles a second): 440 is the A above middle C, and doubling a pitch goes up an octave. A jump that glides from 260 to 620 sounds like a hop upward. The **coin** is two notes, a B and the E above it, the same two notes arcade games have used for decades. The **combo** climbs C, E, G and C an octave up.
- **Noise parts have a `filter`.** Noise is every pitch at once, so it sounds like a hiss. A *lowpass* filter cuts off everything above its frequency, so a low filter (900) is a rumble and a high one (2500) a rush of air. A **slide** is noise alone; a **roll** is low noise and a low thump; a **crash** is the loudest, noise plus a falling sawtooth.
- **Volumes are small,** and multiplied by `MASTER_VOLUME`. Several sounds can play at once (a coin as you jump), and they add up. Quiet parts leave room.
- **`SILENCE` is not 0.** A fade that follows an exponential curve can't reach exactly 0 (it would have to divide by it), so it fades to a number so small it can't be heard.
- **`createAudioContext`** finds the browser's `AudioContext`, with the old Safari name as a fallback. It's a function that is *passed in* to the class, so tests can pass in something else.
- The class is closed already. It doesn't make a context in its constructor, because the browser won't let it work yet.

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Makes the audio context, or wakes it if the browser started it asleep. Call it from
  // a click or a key press. Safe to call as often as you like. Says whether there is
  // sound to be had: it can't if the browser has no Web Audio.
  unlock() {
    if (!this.context) {
      try {
        this.context = this.createContext();
      } catch (error) {
        this.context = null;
        return false;
      }
    }
    if (this.context.state === "suspended") this.context.resume();
    return true;
  }

  setMuted(muted) {
    this.muted = muted;
  }

  // The noise: a buffer of random samples, made the first time one is needed.
  _noiseBuffer() {
    if (!this.noise) {
      const { sampleRate } = this.context;
      this.noise = this.context.createBuffer(1, sampleRate, sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  // Makes a gain node that starts at `volume` and fades away over `length` seconds from `at`,
  // and joins it to the speakers. Everything a part makes goes through one.
  _fade(at, length, volume) {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(volume * MASTER_VOLUME, at);
    gain.gain.exponentialRampToValueAtTime(SILENCE, at + length);
    gain.connect(this.context.destination);
    return gain;
  }

  // Plays the named sound. `rate` multiplies every pitch: 1 is as written, 1.5 is a fifth
  // higher. Says whether anything was played: not when muted, or before unlock().
  play(name, { rate = 1 } = {}) {
    const parts = SOUNDS[name];
    if (!parts) throw new Error(`There is no sound called "${name}"`);
    if (this.muted || !this.context) return false;

    const now = this.context.currentTime;
    for (const part of parts) {
      const at = now + part.start;
      const gain = this._fade(at, part.length, part.volume);
      if (part.noise) {
        const source = this.context.createBufferSource();
        source.buffer = this._noiseBuffer();
        const filter = this.context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(part.filter * rate, at);
        source.connect(filter);
        filter.connect(gain);
        source.start(at);
        source.stop(at + part.length);
      } else {
        const oscillator = this.context.createOscillator();
        oscillator.type = part.wave;
        oscillator.frequency.setValueAtTime(part.from * rate, at);
        oscillator.frequency.exponentialRampToValueAtTime(part.to * rate, at + part.length);
        oscillator.connect(gain);
        oscillator.start(at);
        oscillator.stop(at + part.length);
      }
    }
    return true;
  }
```

Things to notice:

- **`unlock` can be called as often as you like.** The first call makes the context; every call wakes it if the browser started it "suspended". It says whether sound is possible: without Web Audio it returns `false`, and the game goes on without it.
- **`_fade` is the volume envelope of every part.** The gain starts at the part's volume and falls away over its length, so a sound doesn't stop with a click. `setValueAtTime` and `exponentialRampToValueAtTime` schedule changes in *audio time* (`context.currentTime`, in seconds), which the audio system keeps far more accurately than a JavaScript timer.
- **`play` schedules everything up front.** It doesn't loop or wait: it tells the audio system "start this at 10.00, this at 10.08, stop this at 10.17" and returns. The parts of a sound with a `start` (the combo's four notes) are all scheduled in the same call.
- **`rate` multiplies every pitch,** so one coin sound can be a little higher each time. The game uses it to make coins rise in pitch with the multiplier.
- **The noise is made once** (`_noiseBuffer`): a second of random samples, kept and played by every noise part. Making it again for every slide would be wasted work.
- **A muted game doesn't touch the audio at all.** `play` returns `false` before making a single node.
- **An unknown name throws,** and says which. A typo in a sound's name should be loud, not silent.

### 1a. Tests

The tests give the sounds a stand-in for the audio context. It makes the same kinds of nodes, but only remembers how it was used. Replace the placeholder `tests/sounds.tests.js` with:

```js
QUnit.module("SOUNDS", () => {
  const parts = (name) => SOUNDS[name];

  QUnit.test("every sound the game plays is there", (assert) => {
    for (const name of ["coin", "jump", "vault", "slide", "roll", "crash", "combo", "best"]) {
      assert.true(Array.isArray(SOUNDS[name]) && SOUNDS[name].length > 0, name);
    }
  });

  QUnit.test("every part starts at or after 0, lasts a little while, and is not too loud", (assert) => {
    const problems = [];
    for (const [name, list] of Object.entries(SOUNDS)) {
      for (const part of list) {
        if (!(part.start >= 0)) problems.push(`${name}: start`);
        if (!(part.length > 0 && part.length < 1)) problems.push(`${name}: length`);
        if (!(part.volume > 0 && part.volume <= 0.5)) problems.push(`${name}: volume`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a tone has a wave and two pitches above 0 (a fade can't pass through 0)", (assert) => {
    const problems = [];
    for (const [name, list] of Object.entries(SOUNDS)) {
      for (const part of list.filter((p) => !p.noise)) {
        if (!["sine", "square", "triangle", "sawtooth"].includes(part.wave)) problems.push(`${name}: wave`);
        if (!(part.from > 0 && part.to > 0)) problems.push(`${name}: pitch`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a noise has a filter, and a noise is never a tone", (assert) => {
    for (const list of Object.values(SOUNDS)) {
      for (const part of list.filter((p) => p.noise)) {
        assert.true(part.filter > 0);
        assert.strictEqual(part.wave, undefined);
      }
    }
  });

  QUnit.test("a crash is the loudest of the moves, and a slide is only noise", (assert) => {
    const loudest = (name) => Math.max(...parts(name).map((p) => p.volume));

    assert.true(loudest("crash") > loudest("jump"));
    assert.true(parts("slide").every((p) => p.noise));
  });

  QUnit.test("the combo is a rising run of notes, one after another", (assert) => {
    const notes = parts("combo");

    for (let i = 1; i < notes.length; i++) {
      assert.true(notes[i].from > notes[i - 1].from, "each note is higher");
      assert.true(notes[i].start > notes[i - 1].start, "and starts later");
    }
  });
});

// The sounds need an audio context. These tests give them a stand-in that remembers
// everything made on it, so they can check what was played without making a sound.
QUnit.module("Sounds", () => {
  class FakeParam {
    constructor() {
      this.calls = [];
    }
    setValueAtTime(value, time) {
      this.calls.push(["set", value, time]);
    }
    exponentialRampToValueAtTime(value, time) {
      this.calls.push(["ramp", value, time]);
    }
  }

  class FakeNode {
    constructor(kind) {
      this.kind = kind;
      this.connected = [];
      this.started = null;
      this.stopped = null;
      this.frequency = new FakeParam();
      this.gain = new FakeParam();
    }
    connect(to) {
      this.connected.push(to);
    }
    start(time) {
      this.started = time;
    }
    stop(time) {
      this.stopped = time;
    }
  }

  class FakeContext {
    constructor() {
      this.currentTime = 10;
      this.state = "running";
      this.sampleRate = 100;
      this.destination = { kind: "speakers" };
      this.nodes = [];
      this.buffers = 0;
      this.resumed = 0;
    }
    _node(kind) {
      const node = new FakeNode(kind);
      this.nodes.push(node);
      return node;
    }
    createOscillator() {
      return this._node("oscillator");
    }
    createGain() {
      return this._node("gain");
    }
    createBufferSource() {
      return this._node("source");
    }
    createBiquadFilter() {
      return this._node("filter");
    }
    createBuffer(channels, length) {
      this.buffers++;
      const data = new Float32Array(length);
      return { getChannelData: () => data, length };
    }
    resume() {
      this.resumed++;
      this.state = "running";
    }
    ofKind(kind) {
      return this.nodes.filter((n) => n.kind === kind);
    }
  }

  // Sounds that are already unlocked, with the context they made.
  const unlocked = (options = {}) => {
    const context = new FakeContext();
    const sounds = new Sounds({ createContext: () => context, ...options });
    sounds.unlock();
    return { sounds, context };
  };

  QUnit.test("makes no audio context until unlock(), because the browser wouldn't let it make a sound anyway", (assert) => {
    let made = 0;
    const sounds = new Sounds({ createContext: () => (made++, new FakeContext()) });

    assert.strictEqual(made, 0);
    assert.strictEqual(sounds.context, null);

    assert.true(sounds.unlock());
    assert.strictEqual(made, 1);
  });

  QUnit.test("unlock() again doesn't make another context", (assert) => {
    let made = 0;
    const sounds = new Sounds({ createContext: () => (made++, new FakeContext()) });

    sounds.unlock();
    sounds.unlock();

    assert.strictEqual(made, 1);
  });

  QUnit.test("unlock() wakes a context the browser started asleep", (assert) => {
    const context = new FakeContext();
    context.state = "suspended";
    const sounds = new Sounds({ createContext: () => context });

    sounds.unlock();

    assert.strictEqual(context.resumed, 1);
  });

  QUnit.test("with no Web Audio, unlock() says so and the game carries on without sound", (assert) => {
    const sounds = new Sounds({
      createContext: () => {
        throw new Error("no audio");
      },
    });

    assert.false(sounds.unlock());
    assert.false(sounds.play("coin"));
  });

  QUnit.test("play() does nothing before unlock()", (assert) => {
    const sounds = new Sounds({ createContext: () => new FakeContext() });

    assert.false(sounds.play("coin"));
  });

  QUnit.test("an unknown sound is a mistake, and says which", (assert) => {
    const { sounds } = unlocked();

    assert.throws(() => sounds.play("moo"), /no sound called "moo"/);
  });

  QUnit.test("a tone makes an oscillator and a gain, wired to the speakers", (assert) => {
    const { sounds, context } = unlocked();

    assert.true(sounds.play("jump"));

    const [oscillator] = context.ofKind("oscillator");
    const [gain] = context.ofKind("gain");
    assert.strictEqual(oscillator.type, "square");
    assert.deepEqual(oscillator.connected, [gain]);
    assert.deepEqual(gain.connected, [context.destination]);
  });

  QUnit.test("it starts now and stops after its length", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("jump");

    const [oscillator] = context.ofKind("oscillator");
    assert.strictEqual(oscillator.started, 10);
    assert.true(Math.abs(oscillator.stopped - (10 + SOUNDS.jump[0].length)) < 1e-9);
  });

  QUnit.test("the pitch glides from one note to the other", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("jump");

    const [oscillator] = context.ofKind("oscillator");
    const [set, ramp] = oscillator.frequency.calls;
    assert.deepEqual(set.slice(0, 2), ["set", SOUNDS.jump[0].from]);
    assert.deepEqual(ramp.slice(0, 2), ["ramp", SOUNDS.jump[0].to]);
  });

  QUnit.test("the volume starts at the part's volume, times the master volume, and fades away", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("jump");

    const [gain] = context.ofKind("gain");
    const [set, ramp] = gain.gain.calls;
    assert.true(Math.abs(set[1] - SOUNDS.jump[0].volume * MASTER_VOLUME) < 1e-9);
    assert.strictEqual(ramp[1], SILENCE);
  });

  QUnit.test("rate multiplies every pitch: 2 is an octave higher", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("jump", { rate: 2 });

    const [oscillator] = context.ofKind("oscillator");
    const [set, ramp] = oscillator.frequency.calls;
    assert.strictEqual(set[1], SOUNDS.jump[0].from * 2);
    assert.strictEqual(ramp[1], SOUNDS.jump[0].to * 2);
  });

  QUnit.test("a sound with several parts makes one of each, and starts them when they say", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("combo");

    const oscillators = context.ofKind("oscillator");
    assert.strictEqual(oscillators.length, SOUNDS.combo.length);
    oscillators.forEach((oscillator, i) => assert.true(Math.abs(oscillator.started - (10 + SOUNDS.combo[i].start)) < 1e-9));
  });

  QUnit.test("a noise part plays the noise through a lowpass filter, then the gain", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("slide");

    const [source] = context.ofKind("source");
    const [filter] = context.ofKind("filter");
    const [gain] = context.ofKind("gain");
    assert.strictEqual(filter.type, "lowpass");
    assert.strictEqual(filter.frequency.calls[0][1], SOUNDS.slide[0].filter);
    assert.deepEqual(source.connected, [filter]);
    assert.deepEqual(filter.connected, [gain]);
    assert.strictEqual(source.started, 10);
  });

  QUnit.test("the noise is made once, and shared, because it is the same for every sound", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("slide");
    sounds.play("roll");
    sounds.play("crash");

    assert.strictEqual(context.buffers, 1);
    const sources = context.ofKind("source");
    assert.true(sources.every((s) => s.buffer === sources[0].buffer));
  });

  QUnit.test("the noise is random samples between -1 and 1", (assert) => {
    const { sounds, context } = unlocked();
    sounds.play("slide");

    const samples = context.ofKind("source")[0].buffer.getChannelData(0);

    assert.true(samples.every((v) => v >= -1 && v <= 1));
    assert.true(new Set(samples).size > samples.length / 2, "not all the same");
  });

  QUnit.test("a muted game makes no sound, and doesn't even touch the audio", (assert) => {
    const { sounds, context } = unlocked({ muted: true });

    assert.false(sounds.play("coin"));

    assert.strictEqual(context.nodes.length, 0);
  });

  QUnit.test("setMuted() turns the sound off and on again", (assert) => {
    const { sounds, context } = unlocked();

    sounds.setMuted(true);
    assert.false(sounds.play("coin"));

    sounds.setMuted(false);
    assert.true(sounds.play("coin"));
    assert.true(context.nodes.length > 0);
  });

  QUnit.test("sounds can be played over each other", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("coin");
    sounds.play("coin");

    assert.strictEqual(context.ofKind("oscillator").length, SOUNDS.coin.length * 2);
  });
});
```

Add the script and its tests to `tests.html`: `sounds.js` after `screens.js`, and `sounds.tests.js` after `screens.tests.js`:

```html
  <script src="js/sounds.js"></script>
```
```html
  <script src="tests/sounds.tests.js"></script>
```

Reload `tests.html`. You should see **428 passing tests** (the 404, plus 24). Look at how the stand-in is used: *"a tone makes an oscillator and a gain, wired to the speakers"* checks the chain without hearing it, and *"makes no audio context until unlock()"* checks the browser rule. A sound is something you can test, just not by listening.

---

## Step 2: Rules for the effects

Some of the effects are decisions, not drawing, so they are plain numbers and functions, and can be tested: which move makes which sound, when a combo has earned a banner, and the shake of the camera. Open the placeholder `js/effects.js` and replace its contents with:

```js
// The small rules behind the effects, as plain numbers and functions with no Babylon.js
// in them, so they can be tested: which move makes which sound, when a combo has earned a
// banner, and the shake of the camera when the runner crashes. The effects you can see
// (sparkles and dust) are in particles.js. See ../tests/effects.tests.js.

// The sound for the start of each move. A crash is left out: it has more to it than a
// sound (a shake, and dust), so the game does all of it when the runner crashes.
const MOVE_SOUNDS = {
  [MOVES.jump]: "jump",
  [MOVES.vault]: "vault",
  [MOVES.slide]: "slide",
  [MOVES.roll]: "roll",
};

// The sound for a move, or null if it has none (running has none).
function soundForMove(move) {
  return MOVE_SOUNDS[move] || null;
}

// A combo earns a banner every this many clean moves in a row.
const COMBO_MILESTONE = 5;

// Whether going from combo `before` to combo `after` crosses a multiple of COMBO_MILESTONE:
// 4 to 5 does, 5 to 6 doesn't, and a combo that has gone back to 0 doesn't.
function comboMilestone(before, after) {
  return after > before && Math.floor(after / COMBO_MILESTONE) > Math.floor(before / COMBO_MILESTONE);
}

const SHAKE_TIME = 0.5; // how long a shake lasts, in seconds
const SHAKE_STRENGTH = 0.45; // how far, in world units, the camera is thrown at the start

// Shakes the camera: a random offset that starts as big as `strength` and dies away to
// nothing over SHAKE_TIME. The game asks for the offset every frame and adds it to the
// camera's position. `random` can be replaced, so a test can decide what "random" gives.
class CameraShake {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.strength = 0;
    this.timeLeft = 0;
    this.x = 0;
    this.y = 0;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MOVE_SOUNDS, COMBO_MILESTONE, SHAKE_TIME, SHAKE_STRENGTH, soundForMove, comboMilestone, CameraShake };
} else {
  Object.assign(window, { MOVE_SOUNDS, COMBO_MILESTONE, SHAKE_TIME, SHAKE_STRENGTH, soundForMove, comboMilestone, CameraShake });
}
```

Things to notice:

- **`soundForMove` is a lookup, with a default of `null`.** Running has no sound, and neither does a crash: a crash has a sound, dust and a shake, so the game does all three itself when it happens, rather than a lookup doing one of them.
- **`comboMilestone(before, after)` compares *buckets*.** `Math.floor(combo / 5)` is 0 for 0 to 4, 1 for 5 to 9, and so on. A milestone is a step into a higher bucket. That handles 4 to 5, 9 to 10, and it doesn't fire for 5 to 6, or for a combo that was lost and went back to 0 (`after > before` rules that out).
- The class is closed already. `random` is a parameter so tests can make it return what they like.

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Begins a shake. Starting another while one is going begins it afresh.
  start(strength = SHAKE_STRENGTH) {
    this.strength = strength;
    this.timeLeft = SHAKE_TIME;
  }

  // Ends a shake at once, and puts the camera back.
  stop() {
    this.timeLeft = 0;
    this.x = 0;
    this.y = 0;
  }

  get active() {
    return this.timeLeft > 0;
  }

  // Moves time on by dt seconds, and returns the offset { x, y } for this frame. With no
  // time passing (a pause) the offset stays as it was.
  update(dt) {
    if (dt <= 0 || !this.active) return { x: this.x, y: this.y };
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const left = this.timeLeft / SHAKE_TIME; // 1 at the start, 0 at the end
    const size = this.strength * left * left; // it dies away quickly at first, then gently
    this.x = (this.random() * 2 - 1) * size;
    this.y = (this.random() * 2 - 1) * size;
    return { x: this.x, y: this.y };
  }
```

Things to notice:

- **The shake dies away as a curve.** `left` goes from 1 to 0 over the shake, and the size is the strength times `left * left`. Squared, it drops quickly at first and gently at the end, like something settling, where a straight line would feel mechanical.
- **Each frame gets a new random offset** in x and y, from -size to +size. That is what makes it shake and not sway.
- **With no time passing, nothing changes.** In a pause `dt` is 0, so `update` returns the offset it had, and doesn't use any of the shake up. Pause in the middle of a shake and it carries on from where it was.
- **`stop` ends it at once,** so the shake of a crash doesn't carry on into a run that was restarted.

Replace the placeholder `tests/effects.tests.js` with:

```js
QUnit.module("soundForMove", () => {
  QUnit.test("a jump, a vault, a slide and a roll each have a sound, and they are all different", (assert) => {
    const names = [MOVES.jump, MOVES.vault, MOVES.slide, MOVES.roll].map(soundForMove);

    assert.true(names.every((name) => typeof name === "string"));
    assert.strictEqual(new Set(names).size, 4);
  });

  QUnit.test("every sound a move names is one that exists", (assert) => {
    for (const name of Object.values(MOVE_SOUNDS)) assert.true(name in SOUNDS, name);
  });

  QUnit.test("running has no sound of its own, and neither does a crash (the game does all of that itself)", (assert) => {
    assert.strictEqual(soundForMove(MOVES.run), null);
    assert.strictEqual(soundForMove(MOVES.crash), null);
  });

  QUnit.test("a move that isn't one has none", (assert) => {
    assert.strictEqual(soundForMove("dance"), null);
    assert.strictEqual(soundForMove(undefined), null);
  });
});

QUnit.module("comboMilestone", () => {
  QUnit.test("reaching a multiple of COMBO_MILESTONE is a milestone", (assert) => {
    assert.true(comboMilestone(COMBO_MILESTONE - 1, COMBO_MILESTONE));
    assert.true(comboMilestone(2 * COMBO_MILESTONE - 1, 2 * COMBO_MILESTONE));
    assert.true(comboMilestone(3 * COMBO_MILESTONE - 1, 3 * COMBO_MILESTONE));
  });

  QUnit.test("the step after a milestone isn't one", (assert) => {
    assert.false(comboMilestone(COMBO_MILESTONE, COMBO_MILESTONE + 1));
  });

  QUnit.test("nor is anything on the way", (assert) => {
    for (let before = 0; before < COMBO_MILESTONE - 1; before++) assert.false(comboMilestone(before, before + 1), `${before}`);
  });

  QUnit.test("a combo that is lost (it goes back to 0) is not a milestone", (assert) => {
    assert.false(comboMilestone(COMBO_MILESTONE + 2, 0));
    assert.false(comboMilestone(COMBO_MILESTONE, 0));
  });

  QUnit.test("it works however the combo gets there, even if it jumps over a milestone", (assert) => {
    assert.true(comboMilestone(COMBO_MILESTONE - 2, COMBO_MILESTONE + 1));
  });

  QUnit.test("staying where it is isn't a milestone, even on one", (assert) => {
    assert.false(comboMilestone(COMBO_MILESTONE, COMBO_MILESTONE));
  });

  QUnit.test("a combo of 5 is the first, as the game says", (assert) => {
    assert.strictEqual(COMBO_MILESTONE, 5);
  });
});

QUnit.module("CameraShake", () => {
  // A shake whose "random" is a fixed series of numbers, so what it does can be checked.
  const shakeWith = (...values) => {
    let i = 0;
    return new CameraShake({ random: () => values[i++ % values.length] });
  };

  QUnit.test("isn't shaking to begin with, and the offset is nothing", (assert) => {
    const shake = new CameraShake();

    assert.false(shake.active);
    assert.deepEqual(shake.update(0.016), { x: 0, y: 0 });
  });

  QUnit.test("start() begins a shake", (assert) => {
    const shake = new CameraShake();

    shake.start();

    assert.true(shake.active);
  });

  QUnit.test("it is thrown about by the strength it was started with, at most", (assert) => {
    const shake = shakeWith(1, 0); // the biggest throw in x, the biggest the other way in y
    shake.start(0.4);

    const offset = shake.update(0.001);

    assert.true(offset.x > 0.39 && offset.x <= 0.4, `${offset.x}`);
    assert.true(offset.y < -0.39 && offset.y >= -0.4, `${offset.y}`);
  });

  QUnit.test("it dies away: the offset gets smaller as time passes", (assert) => {
    const early = shakeWith(1);
    early.start(0.4);
    const late = shakeWith(1);
    late.start(0.4);
    late.update(SHAKE_TIME * 0.6);

    assert.true(late.update(0.001).x < early.update(0.001).x);
  });

  QUnit.test("after SHAKE_TIME it has stopped, and the offset is nothing again", (assert) => {
    const shake = shakeWith(1);
    shake.start();

    shake.update(SHAKE_TIME + 0.1);

    assert.false(shake.active);
    assert.deepEqual(shake.update(0.016), { x: 0, y: 0 });
  });

  QUnit.test("with no time passing (a pause) the offset stays as it was, and the shake doesn't run down", (assert) => {
    const shake = shakeWith(1, 1);
    shake.start();
    const first = shake.update(0.05);
    const left = shake.timeLeft;

    const paused = shake.update(0);

    assert.deepEqual(paused, first);
    assert.strictEqual(shake.timeLeft, left);
  });

  QUnit.test("starting again begins it afresh", (assert) => {
    const shake = shakeWith(1);
    shake.start();
    shake.update(SHAKE_TIME - 0.01);

    shake.start();

    assert.strictEqual(shake.timeLeft, SHAKE_TIME);
  });

  QUnit.test("stop() ends it at once, and the offset is nothing", (assert) => {
    const shake = shakeWith(1);
    shake.start();
    shake.update(0.05);

    shake.stop();

    assert.false(shake.active);
    assert.deepEqual(shake.update(0.016), { x: 0, y: 0 });
  });

  QUnit.test("a bigger strength throws further", (assert) => {
    const small = shakeWith(1);
    small.start(0.1);
    const big = shakeWith(1);
    big.start(0.8);

    assert.true(big.update(0.01).x > small.update(0.01).x);
  });

  QUnit.test("the offset is always within the strength, whatever the random numbers are", (assert) => {
    const shake = new CameraShake();
    shake.start(0.45);
    let worst = 0;

    for (let t = 0; t < 40; t++) {
      const { x, y } = shake.update(0.02);
      worst = Math.max(worst, Math.abs(x), Math.abs(y));
    }

    assert.true(worst <= 0.45);
  });
});
```

Add the script and its tests to `tests.html`, after `sounds.js` and `sounds.tests.js`:

```html
  <script src="js/effects.js"></script>
```
```html
  <script src="tests/effects.tests.js"></script>
```

Reload `tests.html`: **21 more** tests (**449** in all). The shake tests give it a "random" that always returns 1, so the offset is exactly the size, and they can say it gets smaller as time passes.

---

## Step 3: Sparkles and dust

A **particle system** makes lots of small, short-lived pictures (particles), each with a position, a speed, a size and a color that changes as it ages. It is how games make sparks, smoke, rain and fire. Babylon.js has a `ParticleSystem` that does the work on the graphics card. You describe the particles, and it moves them.

You'll make **one system of each kind, once**, and fire it by hand each time it's needed, so that nothing is made while the game runs. Open the placeholder `js/particles.js` and replace its contents with:

```js
// Bursts of particles: sparkles where a coin was picked up, and dust where the runner
// crashed. Each kind is a Babylon.js ParticleSystem that is made once and fired by hand
// whenever it is needed, so nothing is made while the game runs. What each kind looks like
// is plain data in PARTICLE_PRESETS. See ../tests/particles.tests.js.

// How each kind looks. Sizes are in world units (the runner is 1.83 high), times in
// seconds, `power` is the speed particles are thrown out at, and `gravity` pulls them
// up (+) or down (-). `additive` makes overlapping particles add their light, which
// suits sparkles; dust is drawn as it is.
const PARTICLE_PRESETS = {
  sparkle: {
    capacity: 150,
    count: 8, // how many in one burst
    colors: ["#fff6a8", "#ffd23a"],
    size: [0.05, 0.13],
    life: [0.25, 0.45],
    power: [1.5, 3.5],
    gravity: -7,
    spread: [-1, 1, -1, 1, 2, 1], // the directions they go in, from (x, y, z) to (x, y, z)
    additive: true,
  },
  dust: {
    capacity: 150,
    count: 32,
    colors: ["#b8a58a", "#8a7a68"],
    size: [0.5, 1.2],
    life: [0.5, 1.1],
    power: [1, 3],
    gravity: 1.5,
    spread: [-1, 0.2, -1, 1, 1, 1],
    additive: false,
  },
};

// A soft round dot, drawn into a texture: white in the middle, fading to nothing at the
// edge. The particles are tinted by their colors, so one picture does for both kinds.
function makeSoftTexture(scene, size = 64) {
  const texture = new BABYLON.DynamicTexture("particle", size, scene, false);
  texture.hasAlpha = true;
  const context = texture.getContext();
  const middle = size / 2;
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.update();
  return texture;
}

class ParticleBursts {
  constructor(scene) {
    this.scene = scene;
    this.texture = makeSoftTexture(scene);
    this.systems = {};
    this.speeds = {}; // the normal updateSpeed of each, to go back to after a pause
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) this.systems[name] = this._make(name, preset);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PARTICLE_PRESETS, makeSoftTexture, ParticleBursts };
} else {
  Object.assign(window, { PARTICLE_PRESETS, makeSoftTexture, ParticleBursts });
}
```

Things to notice:

- **What each kind looks like is data,** in `PARTICLE_PRESETS`. Sizes are in world units (the runner is 1.83 tall, so a 0.1 sparkle is tiny), lifetimes are in seconds, and `power` is how fast they are thrown out. Sparkles fall (`gravity` is negative) and are small and short-lived; dust rises a little and is big and slow.
- **`additive` blending adds light.** Two overlapping sparkles are brighter than one, which suits something that glows. Dust is drawn normally, so it looks like something solid and soft.
- **`makeSoftTexture` draws the particle's picture in code:** a white dot that fades to nothing at the edge, on a canvas. A particle is a flat square with a texture on it, so a soft dot makes soft, round particles. The system tints it with a color. There's no image file to load.
- **`spread` is two directions,** and each particle goes off in a random direction between them. Sparkles go up and out (`y` from 1 to 2); dust goes out and a little up.
- The class is closed already. Its constructor makes the texture and one system for each preset.

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Makes one kind: a particle system that makes nothing by itself (emitRate 0) and is
  // started once, then told how many to make each time there is a burst.
  _make(name, preset) {
    const system = new BABYLON.ParticleSystem(name, preset.capacity, this.scene);
    system.particleTexture = this.texture;
    system.emitter = new BABYLON.Vector3(0, 0, 0);
    system.color1 = BABYLON.Color4.FromHexString(`${preset.colors[0]}FF`);
    system.color2 = BABYLON.Color4.FromHexString(`${preset.colors[1]}FF`);
    system.colorDead = BABYLON.Color4.FromHexString(`${preset.colors[1]}00`); // fades out as it dies
    [system.minSize, system.maxSize] = preset.size;
    [system.minLifeTime, system.maxLifeTime] = preset.life;
    [system.minEmitPower, system.maxEmitPower] = preset.power;
    system.gravity = new BABYLON.Vector3(0, preset.gravity, 0);
    const [x1, y1, z1, x2, y2, z2] = preset.spread;
    system.direction1 = new BABYLON.Vector3(x1, y1, z1);
    system.direction2 = new BABYLON.Vector3(x2, y2, z2);
    system.blendMode = preset.additive ? BABYLON.ParticleSystem.BLENDMODE_ONEONE : BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    system.emitRate = 0;
    system.manualEmitCount = 0;
    this.speeds[name] = system.updateSpeed;
    system.start();
    return system;
  }

  // Fires one burst of the named kind at a point in the world.
  burst(name, x, y, z) {
    const system = this.systems[name];
    if (!system) throw new Error(`There is no kind of burst called "${name}"`);
    system.emitter.x = x;
    system.emitter.y = y;
    system.emitter.z = z;
    system.manualEmitCount = PARTICLE_PRESETS[name].count;
  }

  // Holds every particle where it is (a pause), or lets them go on.
  setFrozen(frozen) {
    for (const [name, system] of Object.entries(this.systems)) system.updateSpeed = frozen ? 0 : this.speeds[name];
  }

  dispose() {
    for (const system of Object.values(this.systems)) system.dispose();
    this.texture.dispose();
    this.systems = {};
  }
```

Things to notice:

- **`emitRate = 0` and `manualEmitCount = 0` make a system that makes nothing by itself.** A normal system emits a stream of particles; this one waits to be told. It is started once and left running.
- **A burst sets `manualEmitCount`.** Set it to 8, and the system makes 8 particles on its next update, then counts itself back to 0. Move the `emitter` to where you want them first. That is the whole of "fire a burst here".
- **`colorDead` has no alpha,** so a particle fades out as it dies instead of vanishing.
- **`setFrozen` sets `updateSpeed` to 0,** which holds every particle where it is: the particle part of a pause. It remembers each system's normal speed so it can put it back.

Replace the placeholder `tests/particles.tests.js` with:

```js
QUnit.module("PARTICLE_PRESETS", () => {
  QUnit.test("there is a sparkle and a dust", (assert) => {
    assert.deepEqual(Object.keys(PARTICLE_PRESETS).sort(), ["dust", "sparkle"]);
  });

  QUnit.test("a burst fits in the system: it never makes more than the capacity", (assert) => {
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) {
      assert.true(preset.count > 0 && preset.count <= preset.capacity, name);
    }
  });

  QUnit.test("each range goes from small to big", (assert) => {
    const problems = [];
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) {
      for (const key of ["size", "life", "power"]) {
        const [low, high] = preset[key];
        if (!(low > 0 && high >= low)) problems.push(`${name}.${key}`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("two hex colors for each, and a spread of two directions", (assert) => {
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) {
      assert.true(preset.colors.length === 2 && preset.colors.every((c) => /^#[0-9a-f]{6}$/.test(c)), `${name} colors`);
      assert.strictEqual(preset.spread.length, 6, `${name} spread`);
    }
  });

  QUnit.test("sparkles fall and dust rises, and only the sparkles are drawn as light", (assert) => {
    assert.true(PARTICLE_PRESETS.sparkle.gravity < 0);
    assert.true(PARTICLE_PRESETS.dust.gravity > 0);
    assert.true(PARTICLE_PRESETS.sparkle.additive);
    assert.false(PARTICLE_PRESETS.dust.additive);
  });

  QUnit.test("dust is bigger and lasts longer than a sparkle", (assert) => {
    assert.true(PARTICLE_PRESETS.dust.size[1] > PARTICLE_PRESETS.sparkle.size[1]);
    assert.true(PARTICLE_PRESETS.dust.life[1] > PARTICLE_PRESETS.sparkle.life[1]);
  });
});

// Making particles needs a lot of Babylon.js. These tests stand in for just the parts
// that are used, and check what the code sets on them.
QUnit.module("ParticleBursts", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeVector3 {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
  }

  class FakeColor4 {
    static FromHexString(hex) {
      return { hex };
    }
  }

  class FakeParticleSystem {
    static BLENDMODE_ONEONE = "one-one";
    static BLENDMODE_STANDARD = "standard";

    constructor(name, capacity, scene) {
      Object.assign(this, { name, capacity, scene, started: false, disposed: false, updateSpeed: 0.01, manualEmitCount: -1 });
    }
    start() {
      this.started = true;
    }
    dispose() {
      this.disposed = true;
    }
  }

  class FakeTexture {
    constructor(name, size, scene) {
      Object.assign(this, { name, size, scene, updated: false, disposed: false, calls: [] });
    }
    getContext() {
      return {
        createRadialGradient: () => ({ addColorStop: (at, color) => this.calls.push(["stop", at, color]) }),
        fillRect: () => this.calls.push(["fill"]),
      };
    }
    update() {
      this.updated = true;
    }
    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = { Vector3: FakeVector3, Color4: FakeColor4, ParticleSystem: FakeParticleSystem, DynamicTexture: FakeTexture };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  const scene = { name: "scene" };

  QUnit.test("makes a soft round texture: white in the middle, fading to nothing", (assert) => {
    const texture = makeSoftTexture(scene);

    assert.true(texture.hasAlpha);
    assert.true(texture.updated);
    assert.deepEqual(texture.calls.filter((c) => c[0] === "stop").map((c) => c[2]), ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0)"]);
  });

  QUnit.test("makes one system for each kind, all started, with the capacity the preset says", (assert) => {
    const bursts = new ParticleBursts(scene);

    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) {
      const system = bursts.systems[name];
      assert.true(system.started, name);
      assert.strictEqual(system.capacity, preset.capacity, name);
      assert.strictEqual(system.scene, scene, name);
    }
  });

  QUnit.test("the systems make nothing until they are told to", (assert) => {
    const bursts = new ParticleBursts(scene);

    for (const system of Object.values(bursts.systems)) {
      assert.strictEqual(system.emitRate, 0);
      assert.strictEqual(system.manualEmitCount, 0);
    }
  });

  QUnit.test("they share one texture", (assert) => {
    const bursts = new ParticleBursts(scene);

    assert.true(Object.values(bursts.systems).every((s) => s.particleTexture === bursts.texture));
  });

  QUnit.test("the settings of a kind come from its preset", (assert) => {
    const { sparkle } = PARTICLE_PRESETS;
    const system = new ParticleBursts(scene).systems.sparkle;

    assert.deepEqual([system.minSize, system.maxSize], sparkle.size);
    assert.deepEqual([system.minLifeTime, system.maxLifeTime], sparkle.life);
    assert.deepEqual([system.minEmitPower, system.maxEmitPower], sparkle.power);
    assert.strictEqual(system.gravity.y, sparkle.gravity);
    assert.deepEqual([system.direction1.x, system.direction1.y, system.direction1.z], sparkle.spread.slice(0, 3));
    assert.deepEqual([system.direction2.x, system.direction2.y, system.direction2.z], sparkle.spread.slice(3));
    assert.strictEqual(system.color1.hex, `${sparkle.colors[0]}FF`);
  });

  QUnit.test("the particles fade out as they die: the dead color is see-through", (assert) => {
    const system = new ParticleBursts(scene).systems.dust;

    assert.strictEqual(system.colorDead.hex, `${PARTICLE_PRESETS.dust.colors[1]}00`);
  });

  QUnit.test("sparkles are added light, and dust is drawn as it is", (assert) => {
    const { systems } = new ParticleBursts(scene);

    assert.strictEqual(systems.sparkle.blendMode, FakeParticleSystem.BLENDMODE_ONEONE);
    assert.strictEqual(systems.dust.blendMode, FakeParticleSystem.BLENDMODE_STANDARD);
  });

  QUnit.test("burst() puts the emitter at the point and asks for the preset's count", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.burst("sparkle", 1.5, 2, 30);

    const system = bursts.systems.sparkle;
    assert.deepEqual([system.emitter.x, system.emitter.y, system.emitter.z], [1.5, 2, 30]);
    assert.strictEqual(system.manualEmitCount, PARTICLE_PRESETS.sparkle.count);
  });

  QUnit.test("a burst of one kind leaves the other alone", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.burst("dust", 0, 0, 5);

    assert.strictEqual(bursts.systems.sparkle.manualEmitCount, 0);
  });

  QUnit.test("burst() can be called again for another burst", (assert) => {
    const bursts = new ParticleBursts(scene);
    bursts.burst("sparkle", 0, 0, 1);
    bursts.systems.sparkle.manualEmitCount = 0; // the system has made them, and counted back to 0

    bursts.burst("sparkle", 2, 0, 9);

    assert.strictEqual(bursts.systems.sparkle.manualEmitCount, PARTICLE_PRESETS.sparkle.count);
    assert.strictEqual(bursts.systems.sparkle.emitter.z, 9);
  });

  QUnit.test("a kind that doesn't exist is a mistake, and says which", (assert) => {
    const bursts = new ParticleBursts(scene);

    assert.throws(() => bursts.burst("confetti", 0, 0, 0), /no kind of burst called "confetti"/);
  });

  QUnit.test("setFrozen(true) holds every system still, and setFrozen(false) lets them go on at their own speed", (assert) => {
    const bursts = new ParticleBursts(scene);
    bursts.systems.dust.updateSpeed = 0.01;

    bursts.setFrozen(true);
    assert.true(Object.values(bursts.systems).every((s) => s.updateSpeed === 0));

    bursts.setFrozen(false);
    assert.true(Object.values(bursts.systems).every((s) => s.updateSpeed === 0.01));
  });

  QUnit.test("dispose() gets rid of everything it made", (assert) => {
    const bursts = new ParticleBursts(scene);
    const systems = Object.values(bursts.systems);

    bursts.dispose();

    assert.true(systems.every((s) => s.disposed));
    assert.true(bursts.texture.disposed);
    assert.deepEqual(bursts.systems, {});
  });
});
```

Add the script and its tests to `tests.html`, after `effects.js` and `effects.tests.js`:

```html
  <script src="js/particles.js"></script>
```
```html
  <script src="tests/particles.tests.js"></script>
```

Reload `tests.html`: **19 more** tests (**468** in all). The first group checks the presets as data (a burst fits in the system, each range goes from small to big). The second stands in for the few Babylon.js pieces the code uses, and checks what it sets on them: that a burst moves the emitter and asks for the right count, and that a pause freezes everything.

> **What these tests can't tell you** is whether the sparkles look good. They check that the settings come from the presets, not what a 0.22 size and a -7 gravity look like. That is Step 6, with your eyes, and the presets are easy to change.

---

## Step 4: The sound button, and the banner

Two more things need somewhere to live: whether the sound is off (it should be remembered), and the banner for a combo. The first is a small change to the profile; the second goes on the screens.

### 4a. The profile remembers the sound

Open `js/profile.js`. Update the comment above the constants:

```js
// Who is playing: a name, a runner color and whether the sound is off, remembered in the
// browser between visits.
// It is kept with `localStorage`, which can be missing or refuse to save (a private
// window, blocked site data), so every use of it is guarded and the game works without
// it. The same storage is used by the leaderboard. See ../tests/profile.tests.js.
```

Replace the constructor, `load` and `save` of `Profile` with:

```js
  constructor({ storage = browserStorage(), key = PROFILE_KEY } = {}) {
    this.storage = storage;
    this.key = key;
    this.name = DEFAULT_NAME;
    this.color = DEFAULT_COLOR;
    this.muted = false; // whether the sound is off
    this.load();
  }

  // Takes the saved name, color and sound setting, if there are any, and if they are usable.
  load() {
    const saved = readJson(this.storage, this.key);
    if (!saved || typeof saved !== "object") return;
    this.name = cleanName(saved.name);
    this.color = colorById(saved.color).id;
    this.muted = saved.muted === true; // anything but a yes means sound
  }

  // Remembers the name, color and sound setting. Says whether it could.
  save() {
    return writeJson(this.storage, this.key, { name: this.name, color: this.color, muted: this.muted });
  }
```

Things to notice:

- **`saved.muted === true`.** Only a real `true` turns the sound off. A save from before this step has no `muted`, and a damaged one might have `"true"` or `1`. All of those mean "sound on", the harmless default.
- **The save always writes all three,** so a profile written by this version has everything.

In `tests/profile.tests.js`, add these four tests to the `Profile` module, directly above *"uses its own key, so it doesn't mix with other saves"*:

```js
  QUnit.test("the sound is on to begin with", (assert) => {
    assert.false(new Profile({ storage: profileMemory() }).muted);
  });

  QUnit.test("turning the sound off is remembered", (assert) => {
    const storage = profileMemory();
    const first = new Profile({ storage });
    first.muted = true;
    first.save();

    assert.true(new Profile({ storage }).muted);
  });

  QUnit.test("a saved profile from before there was a sound setting has the sound on", (assert) => {
    const storage = profileMemory();
    storage.setItem(PROFILE_KEY, JSON.stringify({ name: "Ana", color: "ocean" }));

    assert.false(new Profile({ storage }).muted);
  });

  QUnit.test("only a real true turns the sound off, so a damaged save can't", (assert) => {
    for (const value of ["true", 1, "yes", null, {}]) {
      const storage = profileMemory();
      storage.setItem(PROFILE_KEY, JSON.stringify({ name: "Ana", color: "ocean", muted: value }));

      assert.false(new Profile({ storage }).muted, JSON.stringify(value));
    }
  });
```

Reload `tests.html`: **4 more** tests (**472** in all).

### 4b. The screens get the banner and the button

Open `js/screens.js`. Replace the constructor with this one, which finds the banner and the sound button too:

```js
  constructor(doc = document) {
    this.doc = doc;
    const get = (id) => doc.getElementById(id);

    // The three screens, by the game state that shows each.
    this.screens = { [STATES.title]: get("title"), [STATES.paused]: get("pause"), [STATES.over]: get("over") };

    this.nameInput = get("name");
    this.swatches = get("swatches");
    this.titleBest = get("title-best");
    this.overScore = get("over-score");
    this.overBest = get("over-best");
    this.highScore = get("high-score");
    this.comboBanner = get("combo-banner");
    this.comboText = get("combo-text");
    this.board = get("board");
    this.buttons = {
      play: get("play"),
      resume: get("resume"),
      again: get("again"),
      pauseTitle: get("pause-title"),
      overTitle: get("over-title"),
      sound: get("sound"),
    };
  }
```

Replace `bind` so it connects the sound button too:

```js
  // Makes the buttons do something. Each lets go of the keyboard focus when it is clicked:
  // a button that keeps focus is pressed again by the space bar, which is the jump key.
  bind({ play, resume, again, toTitle, sound }) {
    const wire = (button, callback) =>
      button.addEventListener("click", () => {
        button.blur();
        callback();
      });
    wire(this.buttons.play, play);
    wire(this.buttons.resume, resume);
    wire(this.buttons.again, again);
    wire(this.buttons.pauseTitle, toTitle);
    wire(this.buttons.overTitle, toTitle);
    wire(this.buttons.sound, sound);
  }
```

and add these two methods **inside the class**, directly above the comment that begins `// Fills in and shows the game over screen`:

```js
  // The banner for a combo that has reached a milestone. It plays its animation once,
  // fading in and out by itself. Taking the class off and putting it back on starts the
  // animation again if it is already showing: the page has to notice the class has gone
  // (reading `offsetWidth` makes it) before it is added again.
  showCombo(combo) {
    this.comboText.textContent = `${combo} in a row`;
    this.comboBanner.classList.remove("show");
    void this.comboBanner.offsetWidth;
    this.comboBanner.classList.add("show");
  }

  // Says on the sound button whether the sound is on.
  setSound(on) {
    this.buttons.sound.textContent = on ? "Sound: on" : "Sound: off";
    this.buttons.sound.classList.toggle("off", !on);
  }
```

Things to notice:

- **A CSS animation plays when its class is added,** and not again if the class is already there. To play it *again* (a second milestone while the first banner is still on screen), the class has to come off and go back on. But if you remove and add it in the same breath, the browser never sees it gone, and the animation carries on. **Reading `offsetWidth` forces the page to work out its layout,** which makes it notice the class has gone. It's an odd line, `void this.comboBanner.offsetWidth;`, and the comment says why it's there.
- **`setSound` only writes a label and toggles a class.** It doesn't know anything about sound; the game tells it.

In `tests/screens.tests.js`, add the three new element ids to the `IDS` list:

```js
    "combo-banner", "combo-text", "sound",
```

(add them as a new line, after the line that ends with `"over-title",`), and replace the test *"bind() makes each button do its job"* with these five tests (it now has a sound button too):

```js
  QUnit.test("bind() makes each button do its job", (assert) => {
    const { screens, els } = makeScreens();
    const calls = [];
    screens.bind({
      play: () => calls.push("play"),
      resume: () => calls.push("resume"),
      again: () => calls.push("again"),
      toTitle: () => calls.push("title"),
      sound: () => calls.push("sound"),
    });

    for (const id of ["play", "resume", "again", "pause-title", "over-title", "sound"]) els[id].click();

    assert.deepEqual(calls, ["play", "resume", "again", "title", "title", "sound"]);
  });

  QUnit.test("showCombo() says how long the combo is, and shows the banner", (assert) => {
    const { screens, els } = makeScreens();

    screens.showCombo(10);

    assert.strictEqual(els["combo-text"].textContent, "10 in a row");
    assert.true(els["combo-banner"].classes.has("show"));
  });

  QUnit.test("showing the banner again starts it again: the class is taken off and put back", (assert) => {
    const { screens, els } = makeScreens();
    const log = [];
    const banner = els["combo-banner"];
    const { add, remove } = banner.classList;
    banner.classList.add = (name) => (log.push("add " + name), add(name));
    banner.classList.remove = (name) => (log.push("remove " + name), remove(name));

    screens.showCombo(5);
    screens.showCombo(10);

    assert.deepEqual(log, ["remove show", "add show", "remove show", "add show"]);
    assert.strictEqual(els["combo-text"].textContent, "10 in a row");
  });

  QUnit.test("setSound() says on the button whether the sound is on", (assert) => {
    const { screens, els } = makeScreens();

    screens.setSound(true);
    assert.strictEqual(els.sound.textContent, "Sound: on");
    assert.false(els.sound.classes.has("off"));

    screens.setSound(false);
    assert.strictEqual(els.sound.textContent, "Sound: off");
    assert.true(els.sound.classes.has("off"));
  });

  QUnit.test("the sound button lets go of the keyboard when clicked, like the others", (assert) => {
    const { screens, els } = makeScreens();
    screens.bind({ play() {}, resume() {}, again() {}, toTitle() {}, sound() {} });

    els.sound.click();

    assert.strictEqual(els.sound.blurred, 1);
  });
```

Reload `tests.html`: **4 more** tests (**476** in all).

### 4c. The look: banner and button

In `css/game.css`, add these rules at the **end** of the file:

```css
/* The banner for a combo that has reached a milestone: it pops in, stays a moment and
   fades out, once, each time the class "show" is put on it. */
#combo-banner {
  position: fixed;
  left: 50%;
  top: 16%;
  z-index: 22;
  width: min(60vw, 360px);
  text-align: center;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-50%);
}
#combo-banner img {
  width: 100%;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6));
}
#combo-text {
  margin: -8px 0 0;
  font: 400 40px/1 var(--title-font);
  color: #fff;
  -webkit-text-stroke: 5px var(--ink);
  paint-order: stroke fill;
}
#combo-banner.show {
  animation: combo-pop 1.8s ease-out forwards;
}
@keyframes combo-pop {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.5);
  }
  12% {
    opacity: 1;
    transform: translateX(-50%) scale(1.12);
  }
  22% {
    transform: translateX(-50%) scale(1);
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) scale(1);
  }
}

/* The sound button, always in the corner. */
#sound {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 25;
  padding: 4px 14px;
  font-size: 20px;
}
#sound.off {
  opacity: 0.7;
  border-color: #888;
}
```

Things to notice:

- **`@keyframes` is a list of what the banner looks like at moments in the animation.** It starts see-through and small (0%), pops to 112% and full opacity by 12% of the time, settles to 100% by 22%, stays until 75%, and fades out by the end. `forwards` keeps it at the last frame (hidden) when it's done, so it doesn't snap back.
- **`pointer-events: none`** on the banner, because it covers the middle of the screen and must never take a click.
- **`transform` in every keyframe repeats `translateX(-50%)`.** `left: 50%` puts the banner's left edge in the middle, and `translateX(-50%)` slides it back half its own width, which centers it. When an animation changes `transform`, it replaces the whole property, so the centering has to be in every step.

Now the markup, in `index.html`. Directly above the `<canvas>`, add the banner and the button:

```html
  <div id="combo-banner">
    <img src="../assets/images/sick_combo_small.png" alt="Sick combo">
    <p id="combo-text"></p>
  </div>
  <button id="sound" class="quiet" type="button">Sound: on</button>
```

and change the hint line, so it mentions the sound key:

```html
  <div class="hint">&larr;/&rarr; (A/D) lanes &middot; &uarr; (W/Space) jump or vault &middot; &darr; (S) slide &middot; P pause &middot; M sound &middot; R restart &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Also change the `<title>` to `Parkour Runner Effects - Babylon.js`.

---

## Step 5: Wiring it up

Add the three new scripts to the list at the **bottom of `<body>`**, after `screens.js` and before `splash.js`:

```html
  <script src="js/sounds.js"></script>
  <script src="js/effects.js"></script>
  <script src="js/particles.js"></script>
```

Now `js/main.js`.

### 5a. The objects

In `createScene`, directly below the line `const screens = new Screens(document);`, add:

```js
  // The sounds (not made until the player does something: the browser insists), the
  // bursts of particles, and the shake of the camera.
  const sounds = new Sounds({ muted: profile.muted });
  const bursts = new ParticleBursts(scene);
  const shake = new CameraShake();
```

Things to notice:

- **`new Sounds(...)` makes no sound yet.** It only remembers whether to be muted. The audio context is made on the first click or key press.
- **`ParticleBursts` needs the `scene`,** which is why it's made here and not at the top of the file.

Directly below `let spin = 0;`, add:

```js
  let lastMove = runner.move; // what the runner was doing last frame, to hear when it changes
```

and in the setup, directly below the `screens.setName(profile.name);` that follows `tintRunner(...)` (not the one in `playFromTitle`), show the state of the sound button:

```js
  screens.setSound(!sounds.muted);
```

In `resetRun`, directly below `runner.reset();`, add two lines. A restart forgets what the runner was doing, and puts the camera still:

```js
    lastMove = runner.move;
    shake.stop();
```

### 5b. What happens when he crashes

Replace `endRun` with this version. It adds the sound, the shake, the dust and, if it's a new best, a fanfare when the game over screen comes up:

```js
  // The runner has crashed: record the score, and once he has had a moment to fall,
  // show how it went.
  const endRun = () => {
    runner.crash();
    game.end();
    sounds.play("crash");
    shake.start();
    bursts.burst("dust", runner.x, 0.2, runner.z);
    const total = score.total;
    const newBest = leaderboard.isBest(total);
    const rank = leaderboard.add(profile.name, total);
    overTimer = setTimeout(() => {
      screens.showResult({ score: total, best: leaderboard.best, newBest, rank, entries: leaderboard.entries });
      if (newBest) sounds.play("best");
    }, CRASH_PAUSE_MS);
  };
```

### 5c. The sound button, and unlocking the sound

Directly below `endRun`, and above the `LEFT_KEYS` constants, add the function that turns the sound off and on, and the connection for the button. Replace the `screens.bind` line with:

```js
  // Turns the sound off or on, and remembers which.
  const toggleSound = () => {
    sounds.unlock();
    sounds.setMuted(!sounds.muted);
    profile.muted = sounds.muted;
    profile.save();
    screens.setSound(!sounds.muted);
  };

  screens.bind({ play: playFromTitle, resume: togglePause, again: startRun, toTitle: goToTitle, sound: toggleSound });

  // The browser only allows sound after the player has clicked or pressed a key.
  window.addEventListener("pointerdown", () => sounds.unlock());
```

Things to notice:

- **`pointerdown` is a click or a touch,** the moment the player first does something. `unlock()` is safe to call again and again, so there's no need to track whether it's done.
- **Toggling the sound unlocks it too,** because pressing the button is itself something the player did.
- **The choice is saved** in the profile, so it's still off next time.

### 5d. The keys

At the very start of the `keydown` handler, a key press (even a letter of the name) unlocks the sound:

```js
    sounds.unlock(); // a key press counts too, even a letter of the name
```

and below the `KeyT` line at the end of the handler, add the sound key:

```js
    else if (event.code === "KeyM") toggleSound();
```

Things to notice:

- **M is below the check for the name field,** so typing "Mia" doesn't turn the sound off.

### 5e. The frame loop

In the frame loop, directly below the line that sets `scene.animationsEnabled`, freeze the particles in a pause too:

```js
    bursts.setFrozen(game.state === STATES.paused); // and the particles
```

Directly below `runner.update(dt);`, add the sound for the start of a move:

```js
    // A move has just started: its sound.
    if (game.playing && runner.move !== lastMove) {
      const sound = soundForMove(runner.move);
      if (sound) sounds.play(sound);
    }
    lastMove = runner.move;
```

In the scoring block, replace the loop that collects the coins with this one, which adds a sound that rises with the multiplier, and a burst of sparkles where the coin was:

```js
      for (const coin of field.collect(runner)) {
        score.collectCoin();
        sounds.play("coin", { rate: 1 + 0.1 * (score.multiplier - 1) }); // higher with the multiplier
        bursts.burst("sparkle", coin.x, (coin.bottom + coin.top) / 2, coin.z);
        releaseCoin(coin);
      }
```

and the loop that counts clean moves with this one, which shows the banner at each milestone:

```js
      for (const _ of field.passed(runner)) {
        const before = score.combo;
        score.cleanMove();
        if (comboMilestone(before, score.combo)) {
          sounds.play("combo");
          screens.showCombo(score.combo);
        }
      }
```

Finally, at the end of the frame loop, where the camera is placed, add the shake:

```js
    const view = followPosition(runner);
    const jolt = shake.update(dt);
    camera.position.set(view.x + jolt.x, view.y + jolt.y, view.z);
```

Things to notice:

- **Moves make sounds by *changing*.** `lastMove` is last frame's move. When this frame's differs and the game is playing, a move has *started*, and `soundForMove` says which sound (or none). That way the vault queued from an early press sounds when the vault happens, not when the key was pressed, and nothing in the runner has to know sounds exist.
- **The coin's pitch rises with the multiplier:** `rate` is 1 at x1, 1.1 at x2, and up to 1.4 at x5. A player on a streak hears it.
- **The sparkles start at the middle of the coin** (halfway between its bottom and top), not at its feet.
- **`before` is the combo before the clean move.** Comparing it with the combo after is what `comboMilestone` needs.
- **The camera's offset is added to where the camera would have been,** not stored in it. The follow position is worked out fresh every frame, so the shake can never drift the camera away.

---

## Step 6: Try it

Serve the page and open it. Press Play (the first click or key press turns the sound on).

- [ ] A **coin** pings, a pair of notes, and a burst of **gold sparkles** shows where it was. Pick up several in a row and the pings get higher
- [ ] A **jump**, a **vault**, a **slide** and a **roll** each make their own sound as they start
- [ ] A **crash** makes a thump and a rumble, shakes the camera for half a second, and throws up a cloud of **dust** at the runner
- [ ] A new **best score** plays a rising fanfare as the game over screen shows
- [ ] **Five** clean moves in a row (jump or vault over barriers, slide under bars) shows the **Sick Combo** banner with *5 in a row*, and a rising run of notes. **Ten** does it again
- [ ] The **Sound: on** button in the bottom corner, and the **M** key, turn the sound off and on, and the label changes. Reload: the choice is remembered
- [ ] Typing **M** in the name field types an M
- [ ] **Pausing** holds the sparkles and dust where they are, and the shake if one was going
- [ ] After a **crash**, pressing **R** straight away starts a run with the camera still

**If something's wrong**

- **`Sounds is not defined` and so on:** the script tags are missing from `index.html`, or come after `main.js`.
- **No sound at all:** the page has to have been clicked or had a key pressed first. Look at the console: *"The AudioContext was not allowed to start"* is the browser's rule, and it goes away after the first interaction. Also check the **Sound** button says *on*, and the tab isn't muted.
- **A sound is missing:** `soundForMove` is how a move finds its sound. Check `MOVE_SOUNDS`, and that `lastMove` is updated every frame.
- **Sounds play twice:** `lastMove = runner.move` is missing from the frame loop (or is inside the `if`), so the same change is heard every frame.
- **No sparkles or dust:** check the console for `no kind of burst called ...` (a name mismatch). Check `new ParticleBursts(scene)` is called after the scene is made, and that `bursts.burst` gets world coordinates.
- **Sparkles appear in the wrong place:** they are fired at the coin's position. The coin's `bottom` and `top` are heights, so the middle is their average.
- **The particles are huge, or invisible:** the sizes in the presets are in world units. A size of 5 is bigger than the runner.
- **The banner shows once, and never again:** the class isn't being taken off before it's put back, or the `void this.comboBanner.offsetWidth;` line is missing.
- **The banner shows off-center:** `transform` in each keyframe must include `translateX(-50%)`.
- **The camera drifts after a shake:** the offset is being added to the camera's *stored* position instead of to the freshly worked-out follow position.
- **Pausing doesn't stop the particles:** `bursts.setFrozen` isn't called each frame.
- **The sound button always says "on":** `screens.setSound` isn't called at the start, or after the toggle.

**Experiments** (change one, reload, then change it back):

- `MASTER_VOLUME` of `0.2`: quiet. Of `1`: loud, and some sounds crackle where they add up
- A coin in `SOUNDS` with `wave: "sawtooth"`: a harsher ping. With `"sine"`: a soft one
- `SHAKE_STRENGTH` of `1.2` and `SHAKE_TIME` of `1`: an earthquake
- `COMBO_MILESTONE` of `2`: a banner every other clean move
- `PARTICLE_PRESETS.sparkle.gravity` of `+3`: the sparkles float up instead of falling
- `PARTICLE_PRESETS.dust.additive` of `true`: the dust glows, and stops looking like dust
- In the console, `new Sounds().unlock()` shows what happens on a page with no sound: nothing, and no error

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/score.js"></script>
  <script src="js/obstacles.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/colors.js"></script>
  <script src="js/profile.js"></script>
  <script src="js/leaderboard.js"></script>
  <script src="js/game.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/sounds.js"></script>
  <script src="js/effects.js"></script>
  <script src="js/particles.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/world.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/pool.tests.js"></script>
  <script src="tests/stream.tests.js"></script>
  <script src="tests/runner.tests.js"></script>
  <script src="tests/score.tests.js"></script>
  <script src="tests/obstacles.tests.js"></script>
  <script src="tests/clips.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/hud.tests.js"></script>
  <script src="tests/colors.tests.js"></script>
  <script src="tests/profile.tests.js"></script>
  <script src="tests/leaderboard.tests.js"></script>
  <script src="tests/game.tests.js"></script>
  <script src="tests/screens.tests.js"></script>
  <script src="tests/sounds.tests.js"></script>
  <script src="tests/effects.tests.js"></script>
  <script src="tests/particles.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **476 passing tests**: the 404 you started with, plus 24 for the sounds, 21 for the effects' rules, 19 for the particles, 4 for the profile and 4 for the screens.

> **What these tests don't cover.** They check the data, the rules and the calls made, with stand-ins for the audio system, Babylon.js and the page. They can't tell you a coin sounds like a coin, that dust looks like dust, or that the shake is the right size. That check is Step 6, with your ears and your eyes.

> **Try breaking something.** In `comboMilestone`, change `>` in `after > before` to `>=`. A test notices that standing on a milestone is now one. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Sound from oscillators, gain and filtered noise | `Sounds`, `SOUNDS` |
| Sounds as data, with one small player | `SOUNDS`, `play` |
| The browser's rule that sound waits for the player | `unlock` |
| Scheduling in audio time | `setValueAtTime`, `exponentialRampToValueAtTime` |
| Hearing a *change*, not a state | `lastMove`, `soundForMove` |
| Particle systems made once and fired by hand | `ParticleBursts`, `manualEmitCount` |
| A texture drawn in code | `makeSoftTexture` |
| A decaying random shake that a pause can hold | `CameraShake` |
| Detecting a step into a higher bucket | `comboMilestone` |
| Restarting a CSS animation from code | `showCombo`, `offsetWidth` |
| Testing code that makes sound or particles | the stand-ins in the tests |

## Challenges

1. **Footsteps.** A soft tick for each step, faster as the runner speeds up. (Hint: it could be a sound with a very short noise part, played every `1 / (speed * 0.3)` seconds, driven by `dt`, only while he is running and on the ground.)
2. **Music.** A looping bass line that gets faster as the run does. (Hint: a function that schedules the next bar a little ahead of time, using `context.currentTime`, called from the frame loop. Don't loop with `setInterval`: its timing is far too loose for music.)
3. **A landing puff.** A small burst of dust when he lands from a jump. (Hint: `runner.y` going from above 0 to 0 is a landing, as `lastMove` going from `jump` to `run` is a change.)
4. **Trails.** Make the sparkles follow the runner while the combo is x5. (Hint: a system that does emit continuously, with `emitter` set to the runner's mesh, and `start` and `stop` by the multiplier.)
5. **A shake for a vault.** A tiny shake when he vaults over a barrier. (Hint: `shake.start(0.08)`, with a smaller strength than the crash.)

---
