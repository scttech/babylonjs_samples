# Tutorial: Ghost Hunter Music -- A Score That Listens

This is the eighth tutorial of the Ghost Hunter series. The sound so far is made in code: a hum, a heart, creaks, a stinger. This sample adds **recorded music**: two tracks of ambient horror that go under everything. A film's music is not played; it is **mixed**, and the mix follows the story. So here the music is a **score that listens**: a quiet bed while nothing is happening, a tenser track swelling as something comes near, and **both going out** for the silence before a strike, and coming back in the aftershock. Because the files are minutes long, they are **streamed**, not decoded, and because a phone will not play until it is touched, they are started in the tap.

By the end you'll have:

- **A mix as a function**: how loud each of the two tracks should be, from the dread, the strike and the scare level, as plain arithmetic
- **Easing**: a number that goes towards where it is told, at a pace, never past it, so that a mix does not jump
- **Streaming music through the sound graph**: `<audio>` elements as sources, so that the scare level and the master volume reach the music too
- **Starting from the tap**, and **pausing** when the page is hidden
- Music in the **game** and in the **developer panel**: a switch, a volume, how fast the mix moves, and a read-out of both tracks
- Unit tests for all of it, **including a test that loads the real tracks**: **318 passing tests**

**What you'll learn:** how to make a game's music respond to what is happening, how to stream a long file and still put it through Web Audio, why a phone needs the files told to play inside the tap, and how to test music without hearing it.

**Before you start:** do the [Models tutorial](../ghost_hunter_models/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Models sample, plus a placeholder for the new file and its tests. **The tracks are already in the shared assets folder** (`../assets/music/`).

```
ghost_hunter_music/
├── index.html, tests.html   (already list the new script)
├── js/
│   ├── music.js             (placeholder -- Step 1)
│   ├── audio.js, main.js    (change -- Steps 2 and 3)
│   └── everything else, from the Models sample
└── tests/
    ├── music.tests.js       (placeholder)
    └── everything else, from the Models sample
```

Open `tests.html` before you change anything. You should see **301 passing tests**: the ones of the Models sample.

### The tracks

| File | Length | What it is like |
|------|--------|-----------------|
| `horror-ambience.mp3` | 92 seconds | quiet (about 0.07 loudness) and slowly building to about 0.13: the bed |
| `scary-ambience.mp3` | 125 seconds | much louder and thicker (about 0.18) from the first ten seconds: the tension |

Both fade in at the start and out at the end, so when they loop there is a moment of quiet, which suits ambient music. They are about 7 MB between them, and are free music from [Pixabay](https://pixabay.com), used under its licence and with its credit:

- Music by [Tunetank](https://pixabay.com/users/tunetank-50201703/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437)
- Music by [AtlasAudio](https://pixabay.com/users/atlasaudio-54514918/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255)

### Serving the page

As before: `npx serve` in the repo root, and open the sample through `http://localhost`, with **`?dev`**. Wear headphones, and turn the volume down first.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **The score**: the mix, and the music.
2. **The sound starts once**.
3. **The game**.
4. **Try it**.

## Step 1: The score

### The mix

Which track, how loud, and when? `musicMix` answers with two numbers, from the **dread** (0 when nothing is near, to 1 at the strike), the room's own **ambient** (the number from the scare sequence: 0 at a strike, coming back to 1) and the scare level's **silence**:

- the **calm** track is the whole of it while the dread is low, and goes as the dread passes about a half;
- the **tense** track comes in from a dread of about 0.15 and is full by 0.55;
- **both are multiplied by a "quiet"** that goes to nothing as the dread reaches the silence, so before a strike there is no music at all (and a level with a long silence takes it away sooner);
- and both are multiplied by the **ambient**, so the strike itself is silent and the aftershock brings the music back.

Because music that jumps from one level to another is heard as a mistake, `approach` makes a number go **towards** its target, a little each frame, getting there in about the time it is given and **never going past it** (an exponential: each frame it goes a fixed fraction of what is left).

Open `js/music.js` (the placeholder) and **replace the TODO line** with:

```js
// The score. Two tracks of ambient music go under the game and are mixed by how near the dread is, the way a film's music is: a quiet bed
// while nothing is happening, the tense track swelling as something comes near, and **both going out** for the silence before a strike, and
// coming back in the aftershock. The mixing is plain arithmetic (`musicMix`), and `Music` plays the two files through the same sound
// graph as everything else (audio.js), so that the scare level's volume and the master volume reach the music too.
// See ../tests/music.tests.js.

const MUSIC = {
  enabled: true,
  volume: 0.55, // how loud the music is, before the scare level's volume
  tracks: {
    calm: { url: "../assets/music/horror-ambience.mp3", volume: 0.9 }, // a bed that builds slowly (92 seconds)
    tense: { url: "../assets/music/scary-ambience.mp3", volume: 0.8 }, // louder and thicker (125 seconds)
  },
  fade: 1.4, // seconds the mix takes to follow where it is told to go (a mix that jumps is heard as a mistake)
  quietAt: 0.85, // the dread at which the music is out: the silence
};

const smoothStep = (from, to, x) => {
  const c = Math.max(0, Math.min(1, (x - from) / (to - from)));
  return c * c * (3 - 2 * c);
};

// How loud each track should be: the calm one while it is quiet, the tense one coming in as the dread rises, and both out as the dread
// reaches the silence. `dread` is 0 to 1, `ambient` is the room's own loudness from the strike (0 at the strike, back to 1 after it),
// and `silence` is the scare level's number for how complete the silence is.
function musicMix(dread, ambient, silence = 1, table = MUSIC) {
  const quiet = 1 - smoothStep(table.quietAt * 0.75, table.quietAt, Math.min(1, dread * silence));
  const calm = (1 - smoothStep(0.1, 0.65, dread)) * quiet;
  const tense = smoothStep(0.15, 0.55, dread) * quiet;
  return { calm: calm * ambient, tense: tense * ambient };
}

// A number that goes towards where it is told to go, a little each frame, and gets there in about `time` seconds: it eases, and never
// overshoots.
function approach(current, target, seconds, time) {
  if (time <= 0) return target;
  return current + (target - current) * (1 - Math.exp((-3 * seconds) / time));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MUSIC, smoothStep, musicMix, approach };
} else {
  Object.assign(window, { MUSIC, smoothStep, musicMix, approach });
}
```

Things to notice:

- **`smoothStep` is the S-curve again** (`3x² − 2x³`), as in the fade of a ghost: music that comes in on a straight line is heard starting; one that comes in on an S is heard arriving.
- **All of it is in a table** (`MUSIC`): the files, how loud each is, how loud the music is as a whole, how fast the mix follows, and the dread at which it is out.
- **The tense track goes *before* the strike**, not after: at a dread of 0.7 it is louder than at 0.95. The silence is the point.

### The score

`Music` plays the files. Three things about a phone shape it:

1. **A phone will not play until the person has touched the screen**, and `play()` must be called *in the touch*, before anything is waited for. So `start` makes both elements and tells both to play at once (silent), and only then waits for the sound graph.
2. **The files are streamed.** Two tracks of a couple of minutes, decoded to sound, would be about a hundred megabytes in memory. An `<audio>` element streams it, and `createMediaElementSource` puts the element into the graph, so its volume is the scare level's and the master's like everything else.
3. **An element is heard directly until it is in the graph**, so its volume is 0 until then and 1 after: the element is the *source*, and the gain node is the *volume*.

In `js/music.js`, find the export block (lines 40 to 47) and **delete it**. Add this in its place, and the export block under it:

```js
class Music {
  // `audio` is the sound of the game (audio.js). `makeElement` makes the thing that plays a file: a streaming <audio> element, which
  // is not all decoded into memory at once (two tracks of a couple of minutes would be a hundred megabytes decoded).
  constructor(audio, table = MUSIC, makeElement = (url) => { const element = new Audio(url); element.loop = true; element.preload = "auto"; return element; }) {
    this.audio = audio;
    this.table = table;
    this.makeElement = makeElement;
    this.tracks = {}; // name -> { element, gain, level }
    this.started = false;
    this.starting = null;
    this.paused = false;
  }

  // Starts both tracks, silent. Call it from the tap: a phone only lets a page play after the person has touched the screen, and the
  // files must be told to play *now*, in the tap, before anything is waited for.
  start() {
    if (this.starting) return this.starting;
    const names = Object.keys(this.table.tracks);
    const elements = names.map((name) => {
      const element = this.makeElement(this.table.tracks[name].url);
      element.volume = 0; // until it is in the sound graph it would be heard directly
      const playing = element.play();
      if (playing && playing.catch) playing.catch(() => {}); // refused: the next tap will do
      return element;
    });
    this.starting = this.audio.start().then(() => {
      const context = this.audio.context;
      names.forEach((name, i) => {
        const source = context.createMediaElementSource(elements[i]);
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(this.audio.master);
        elements[i].volume = 1;
        this.tracks[name] = { element: elements[i], gain, level: 0 };
      });
      this.started = true;
    });
    return this.starting;
  }

  // Every frame: the mix, as the dread says, eased. `state` is { dread, ambient, silence }.
  update(seconds, state) {
    if (!this.started) return;
    const table = this.table;
    const mix = table.enabled && !this.paused ? musicMix(state.dread, state.ambient, state.silence, table) : { calm: 0, tense: 0 };
    for (const [name, track] of Object.entries(this.tracks)) {
      const target = mix[name] * table.volume * table.tracks[name].volume;
      track.level = approach(track.level, target, seconds, table.fade);
      track.gain.gain.value = track.level;
    }
  }

  // The page is hidden, or the game is stopped: the files are paused, so that a phone in a pocket is not playing.
  pause() {
    this.paused = true;
    for (const track of Object.values(this.tracks)) track.element.pause();
  }

  resume() {
    this.paused = false;
    for (const track of Object.values(this.tracks)) {
      const playing = track.element.play();
      if (playing && playing.catch) playing.catch(() => {});
    }
  }

  // The loudness of each track now, for the developer panel.
  levels() {
    return Object.fromEntries(Object.entries(this.tracks).map(([name, track]) => [name, track.level]));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MUSIC, smoothStep, musicMix, approach, Music };
} else {
  Object.assign(window, { MUSIC, smoothStep, musicMix, approach, Music });
}
```

Things to notice:

- **`makeElement` is given in**, as the context is: a test gives plain objects with `play` and `pause`, and a game gives a real `Audio`.
- **A refused `play()` is not an error** (`.catch(() => {})`): the next tap will do it.
- **`pause` and `resume`** are for the page being hidden: a phone in a pocket should not be playing music, and the game goes on when the page is back.

### Tests

Open `tests/music.tests.js` and **replace the TODO line** with:

```js
QUnit.module("musicMix and approach", () => {
  QUnit.test("in the quiet it is the calm bed, and nothing of the tense track", (assert) => {
    const mix = musicMix(0, 1);
    assert.strictEqual(mix.calm, 1);
    assert.strictEqual(mix.tense, 0);
  });

  QUnit.test("as the dread rises the tense track comes in and the calm one goes", (assert) => {
    let last = musicMix(0, 1);
    for (let d = 0.05; d <= 0.6; d += 0.05) {
      const mix = musicMix(d, 1);
      assert.true(mix.calm <= last.calm + 1e-9, "the calm goes down");
      assert.true(mix.tense >= last.tense - 1e-9, "the tense comes up");
      last = mix;
    }
    assert.true(last.tense > 0.9 && last.calm < 0.05);
  });

  QUnit.test("at the edge of the strike both are out: the silence", (assert) => {
    const mix = musicMix(1, 1);
    assert.true(mix.calm < 1e-6 && mix.tense < 1e-6);
    assert.true(musicMix(0.7, 1).tense > musicMix(0.95, 1).tense, "the tense track goes before the strike, not after");
  });

  QUnit.test("a level with a long silence has the music out sooner", (assert) => {
    assert.true(musicMix(0.7, 1, 1.4).tense < musicMix(0.7, 1, 0.7).tense);
  });

  QUnit.test("the room's own loudness scales both, so the strike silences the music and the aftershock brings it back", (assert) => {
    const calm = musicMix(0, 0);
    assert.deepEqual([calm.calm, calm.tense], [0, 0]);
    const half = musicMix(0, 0.5);
    assert.strictEqual(half.calm, 0.5);
  });

  QUnit.test("no number is ever outside 0 to 1", (assert) => {
    for (let d = -0.5; d <= 1.5; d += 0.05) for (const a of [0, 0.5, 1]) for (const s of [0.5, 1, 1.4]) {
      const mix = musicMix(d, a, s);
      assert.true(mix.calm >= 0 && mix.calm <= 1 && mix.tense >= 0 && mix.tense <= 1, `${d} ${a} ${s}`);
    }
  });

  QUnit.test("approach goes towards the target and never past it", (assert) => {
    let x = 0;
    for (let i = 0; i < 300; i++) {
      const next = approach(x, 1, 1 / 60, 1.4);
      assert.true(next >= x && next <= 1);
      x = next;
    }
    assert.true(x > 0.95, "and gets there in about the time it was told");
    assert.strictEqual(approach(0.3, 0.9, 0.1, 0), 0.9, "no time is at once");
    assert.true(approach(1, 0, 1 / 60, 1.4) < 1);
  });
});

QUnit.module("Music", () => {
  const fakeAudio = () => {
    const gains = [];
    const context = {
      createMediaElementSource: (element) => ({ element, connect(node) { this.to = node; } }),
      createGain: () => { const node = { gain: { value: 1 }, connect(target) { this.to = target; } }; gains.push(node); return node; },
    };
    return { context, master: { name: "master" }, gains, started: 0, start() { this.started += 1; return Promise.resolve(); } };
  };
  const fakeElement = (url) => ({ url, volume: 1, plays: 0, pauses: 0, play() { this.plays += 1; return Promise.resolve(); }, pause() { this.pauses += 1; } });
  const make = (table = MUSIC) => {
    const audio = fakeAudio();
    const elements = [];
    const music = new Music(audio, table, (url) => { const e = fakeElement(url); elements.push(e); return e; });
    return { music, audio, elements };
  };

  QUnit.test("there are two tracks, in the assets, and each has a volume", (assert) => {
    assert.deepEqual(Object.keys(MUSIC.tracks), ["calm", "tense"]);
    for (const track of Object.values(MUSIC.tracks)) {
      assert.true(track.url.startsWith("../assets/music/") && track.url.endsWith(".mp3"));
      assert.true(track.volume > 0 && track.volume <= 1);
    }
  });

  QUnit.test("starting plays both files at once, from the tap, silent, and then puts them in the sound graph", async (assert) => {
    const { music, audio, elements } = make();
    const starting = music.start();
    assert.strictEqual(elements.length, 2);
    assert.true(elements.every((e) => e.plays === 1 && e.volume === 0), "playing now, and not heard directly");
    assert.false(music.started, "not in the graph yet");
    await starting;
    assert.true(music.started);
    assert.strictEqual(audio.started, 1);
    assert.true(elements.every((e) => e.volume === 1));
    assert.true(audio.gains.every((g) => g.to === audio.master && g.gain.value === 0), "into the master, silent");
  });

  QUnit.test("it is started once, however many times it is asked", async (assert) => {
    const { music, elements } = make();
    await Promise.all([music.start(), music.start()]);
    assert.strictEqual(elements.length, 2);
  });

  QUnit.test("a file the phone will not play yet is not an error", async (assert) => {
    const audio = fakeAudio();
    const music = new Music(audio, MUSIC, (url) => ({ ...fakeElement(url), play: () => Promise.reject(new Error("wants a tap")) }));
    await music.start();
    assert.true(music.started);
  });

  QUnit.test("the mix is eased to where the dread says", async (assert) => {
    const { music } = make();
    await music.start();
    music.update(1 / 60, { dread: 0, ambient: 1, silence: 1 });
    const first = music.levels();
    assert.true(first.calm > 0 && first.calm < MUSIC.volume * MUSIC.tracks.calm.volume, "on its way, and not there at once");
    for (let i = 0; i < 400; i++) music.update(1 / 60, { dread: 0, ambient: 1, silence: 1 });
    assert.true(Math.abs(music.levels().calm - MUSIC.volume * MUSIC.tracks.calm.volume) < 0.01);
    assert.true(music.levels().tense < 0.001);
    for (let i = 0; i < 400; i++) music.update(1 / 60, { dread: 0.6, ambient: 1, silence: 1 });
    assert.true(music.levels().tense > music.levels().calm, "the tense track is the louder now");
  });

  QUnit.test("a strike silences it, and it comes back", async (assert) => {
    const { music } = make();
    await music.start();
    for (let i = 0; i < 400; i++) music.update(1 / 60, { dread: 0.5, ambient: 1, silence: 1 });
    const before = music.levels().tense;
    for (let i = 0; i < 300; i++) music.update(1 / 60, { dread: 0.5, ambient: 0, silence: 1 });
    assert.true(music.levels().tense < before * 0.05);
    for (let i = 0; i < 400; i++) music.update(1 / 60, { dread: 0.5, ambient: 1, silence: 1 });
    assert.true(Math.abs(music.levels().tense - before) < 0.01);
  });

  QUnit.test("switched off, it fades out and stays out", async (assert) => {
    const { music } = make({ ...MUSIC, enabled: false });
    await music.start();
    for (let i = 0; i < 200; i++) music.update(1 / 60, { dread: 0, ambient: 1, silence: 1 });
    assert.true(Object.values(music.levels()).every((level) => level < 1e-6));
  });

  QUnit.test("nothing happens before it has started", (assert) => {
    const { music } = make();
    music.update(1, { dread: 0, ambient: 1, silence: 1 });
    assert.deepEqual(music.levels(), {});
  });

  QUnit.test("it can be paused (a page that is hidden) and resumed", async (assert) => {
    const { music, elements } = make();
    await music.start();
    music.pause();
    assert.true(elements.every((e) => e.pauses === 1));
    for (let i = 0; i < 300; i++) music.update(1 / 60, { dread: 0, ambient: 1, silence: 1 });
    assert.true(Object.values(music.levels()).every((level) => level < 1e-6), "and silent while it is");
    music.resume();
    assert.true(elements.every((e) => e.plays === 2));
  });
});

QUnit.module("the real tracks", () => {
  QUnit.test("each file loads, is a couple of minutes long, and can be looped", async (assert) => {
    for (const [name, track] of Object.entries(MUSIC.tracks)) {
      const element = new Audio(track.url);
      element.preload = "metadata";
      await new Promise((resolve, reject) => {
        element.addEventListener("loadedmetadata", resolve, { once: true });
        element.addEventListener("error", () => reject(new Error(`${name} did not load`)), { once: true });
      });
      assert.true(element.duration > 60 && element.duration < 300, `${name}: ${element.duration.toFixed(0)} s`);
    }
  });
});
```

Things to notice:

- **The mix is tested as a shape**: as the dread rises the calm track only goes down and the tense only up, at the edge of the strike both are out, a longer silence takes the tense track sooner, and **no number is ever outside 0 to 1** for any dread, ambient and silence, even nonsense ones.
- **`approach` is tested to be a curve**: it never goes backwards, never past its target, gets there in about the time given, and a time of 0 is at once.
- **The score is tested with stand-ins** for the elements and the sound graph: both files are told to play from the start (silent), the graph is built after, the mix is eased, a strike silences it and it comes back to *exactly* where it was, a switch fades it out and keeps it out, and a hidden page pauses it.
- **The last test loads the real files** and says that each is between a minute and five long, which is how a file that is moved, renamed or broken is found. (The test server must answer *range* requests, as every real server does: without them a browser cannot tell how long an audio file is.)

Open `tests.html`. You should see **318 passing tests**: 17 more.

## Step 2: The sound starts once

Both the game and the music want to start the sound, and the sound must be made **once**. `start` keeps the promise of the first call and gives it to the second, so that the music, asking a moment after the game, waits for the same thing and finds the master volume ready.

In `js/audio.js`, **replace** lines 67 to 68:

```js
  async start() {
    if (this.context) return;
```

with:

```js
  start() {
    if (!this.starting) this.starting = this._start(); // asked twice (by the game and by the music) it is made once
    return this.starting;
  }

  async _start() {
```

## Step 3: The game

In `js/main.js`: the music, started in the tap, updated every frame from the scare, paused when the page is hidden, and a few rows in the panel.

In `js/main.js`, after line 154, add:

```js
const music = new Music(audio);
```

The system that already runs the scare feeds the music what it knows: the dread, the room's ambient and the level's silence.

In `js/main.js`, after line 179, add:

```js
  music.update(seconds, { dread, ambient: frame.ambient, silence: level.silence }); // the score follows the dread, and goes out for the strike
```

In `js/main.js`, after line 422, add:

```js
// A page that is hidden (the phone is put in a pocket) stops the music, and it goes on when the page is back.
document.addEventListener("visibilitychange", () => (document.hidden ? music.pause() : music.resume()));

```

In `js/main.js`, after line 473, add:

```js
  music.start(); // and so can the music: it is told to play now, in the touch
```

In `js/main.js`, after line 541, add:

```js
          readout("music (calm / tense)", () => { const l = music.levels(); return music.started ? `${(l.calm || 0).toFixed(2)} / ${(l.tense || 0).toFixed(2)}` : "not started"; }),
          toggle("music", () => MUSIC.enabled, (value) => { MUSIC.enabled = value; }),
          slider("music volume", MUSIC, "volume", 0, 1, 0.05),
          slider("how fast the mix moves (s)", MUSIC, "fade", 0.2, 5, 0.1),
```

In `js/main.js`, **replace** line 666:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio }; // for poking at from the console
```

with:

```js
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music }; // for poking at from the console
```

Things to notice:

- **The music is not told anything new.** The scare system already worked out the dread and the ambient for the hum and the heart: the music is one more thing that reads them. That is the pay-off of keeping the scare as numbers.
- **`visibilitychange`** is the browser's way of saying that the page has been hidden (the app was switched, the screen locked).

## Step 4: Try it

Open the page with `?dev`, put on headphones (the volume low), choose a level, and press the button.

- The **calm** track comes in over a second or two: the first of the two files. The panel's **music** read-out shows both tracks' loudness.
- Press **2**: a ghoul. As it comes, the **calm** track gives way to the **tense** one, then both fade, and the room goes silent, and **then** the strike.
- After it, the music **comes back** over a couple of seconds.
- Move **how fast the mix moves** to 0.2 seconds: it jumps, and sounds like a fault. Move it to 5: it hardly moves at all.
- Switch **music** off in the panel: it fades out; on: it fades back. **Music volume** at 0 is silence, at 1 is loud.
- Choose **Gentle**: the music is softer (the level's volume), and the silence before a strike is shorter. Choose **Terrifying**: a long silence.
- Open the page in another tab and come back: it was paused, and goes on.

On a **phone**, the music should start when you press the button, and not before. If it does not start, tell me which phone and browser.

## Step 5: Tests, all together

Open `tests.html`. You should see **318 passing tests**.

## Recap: what you built

| What | Where |
|------|-------|
| The mix of two tracks from the dread | `MUSIC`, `musicMix`, `smoothStep` in `music.js` |
| A number that eases towards a target | `approach` in `music.js` |
| Streaming music through the sound graph | `Music` in `music.js` |
| The sound starting once | `GhostAudio.start` in `audio.js` |
| The music in the game | `main.js` |

## Challenges

- **No gap in the loop.** The tracks fade at their ends, so a loop has a quiet. Make each track play on **two** elements, the second starting when the first has ten seconds left, and crossfade. Write `crossfadeAt(duration, time)` that says how loud each should be, and test it first.
- **A third track.** A moment of safety (the rest after a scare) could have a track of its own. What does the mix need to know that it does not know now? (Look at `director.resting`.)
- **Music that ducks for a voice.** When a creature's voice sounds close, the music could dip by a few decibels for a second. Where is the number that says "a creature is making a sound near"?
- **Save the data.** The files are 7 MB. Re-encode them at 96 kbit/s mono and see whether you can hear the difference; what does `Music` need to change? (Nothing: that is the point of the table.)
