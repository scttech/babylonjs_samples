# Rooftop Parkour Screens

Step 8 of the Rooftop Parkour series. Builds on [Rooftop Parkour Goals](../rooftop_parkour_goals/README.md). The game has everything to play with, and still begins the moment the loading bar ends, forgets everything when the page is closed, and makes no sound. This sample wraps it: a **title screen** (the logo, a choice of **male or female runner**, your best times, Play), a **pause screen** (Esc, P, or leaving the page; resume, run the trial again, back to the title, and sliders for the sound and the mouse), **records** that are kept in the browser, **sound** made in code, and a puff of **dust** where you land hard.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Goals sample. Run `node reset-tutorial.js` to return this folder to the Goals sample, to work through the changes yourself.

The models can't be loaded from a page opened from a file, so run a web server: `npx serve` in the repo root and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

**Records are believed only when they make sense.** The best trial time, the best score, the longest chain, the runner and the sound and mouse settings are kept in `localStorage`. A browser may refuse it (a private window, a full disk), so every use is allowed to fail and the game goes on with records for this visit; and what is read back is checked (a volume of 7 is held to 1, a best time of nothing is no time), because a person can edit it and an old version may have written something else. The storage is given to `Records`, so a test can give it one that throws.

**Which screen is up is a state machine.** `loading`, `title`, `playing`, `paused`, and a table of which may follow which, with nothing drawn in it: a test says that the game cannot be paused from the title, and that the world only moves while `running`. Pausing is not "stop drawing": the district keeps drawing behind the screen, and the world is given no time (and the keys stop being the game's).

**Sound is made, not loaded.** Each sound is a short list of layers in a table: a tone that slides from one pitch to another, or a burst of filtered noise, each with a loudness that dies away. `soundPlan` works out the layers at a strength (a harder landing is louder), and `Sound` plays them through Web Audio. Steps come **by distance**, one every 1.7 metres, so a faster runner has steps closer together and a runner who stands has none. A page can only make sound after a touch, so the Play button is where it begins. The tests render every sound with an `OfflineAudioContext` and measure it.

**Dust is asked for in bursts.** `dustFor` says how much a fall kicks up (nothing for a small one, more and wider as it grows, no more than the most); one particle system with no emit rate of its own draws it, wherever a burst is wanted.

## Key code

**Records believe only what makes sense.**

```js
volume: clampTo(number(source.volume, d.volume), table.limits.volume),
```

**A screen can only follow one that allows it.**

```js
const SCREEN_STATES = { loading: ["title"], title: ["playing"], playing: ["paused", "title"], paused: ["playing", "title"] };
```

**A footstep every stride, not every so often.**

```js
this.travelled += speed * dt;
if (this.travelled < this.table.stride) return false;
```

## Babylon.js features demonstrated

- Everything from Rooftop Parkour Goals
- A `ParticleSystem` with no emit rate, fed by `manualEmitCount`, and a soft texture painted on a `DynamicTexture`
- Web Audio (outside Babylon.js): oscillators, filtered noise, envelopes, and an `OfflineAudioContext` to test sound without a speaker
- The pointer lock as a pause: letting go of the mouse stops the world
- (The rules themselves need no Babylon.js: records, the flow of screens and the plans of sounds are plain arithmetic, tested without it.)

## Controls

- Everything from the Goals sample
- **Play** on the title begins (and takes the mouse); choose the male or the female runner first, and the choice is remembered
- **Esc** (which lets go of the mouse), **P**, or leaving the page pauses; **Resume** takes the mouse back
- With **`?dev`**: a **Screens** section with the screen, the bests, a volume slider, a button to pause, one to clear the best times, and **a button for every sound**

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check that records survive a storage that refuses, nonsense and old versions, which trials are bests, which screens may follow which, the words of the bests, every sound's plan and its rendered sound (not silent, not too loud, quiet by the end), the pace of the footsteps, and how dust grows with the fall.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models and animations are CC0, by [Quaternius](https://quaternius.com).

## Next up

The game needs a keyboard and a mouse. The next sample, [Rooftop Parkour Touch](../rooftop_parkour_touch/README.md), is **touch**: a thumb stick, buttons and a drag-to-look camera, for a phone.
