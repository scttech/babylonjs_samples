# Ghost Hunter Jump Scares

Step 6 of the Ghost Hunter series. Builds on [Ghost Hunter The Hunt](../ghost_hunter_hunt/README.md). The director sends things; this sample makes you **feel** them. As a creature comes near, the room goes **quiet** (a hum that drops to a silence), the edges of the picture close in, and your **heart** gets louder and faster. A creak from where it is tells you that something has come in behind you, before you can see it. Then the **strike**: a stinger, a flash, a shake of the view and a buzz of the phone; and the **aftershock**, in which it all dies away and the hum comes back. Every sound is **made in code** (no sound files) and **positional**: with headphones a thing behind you is behind you. How much of it you get is your choice, on the start screen: **Gentle** (no flashes, no shaking), **Creepy**, or **Terrifying**, and the choice is remembered.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Hunt sample. Run `node reset-tutorial.js` to return this folder to the Hunt sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel, and **`?scare=gentle`** (or `creepy`, `terrifying`) to choose the level for one visit.

**A scare is a timeline of numbers.** `dreadAt` turns a distance into a feeling from 0 to 1; `buildUp` turns that into the hum's loudness and the heart's rate; `ScareSequence` fires a strike once and fades the flash, the shake and the silence away. A level is just a row of multipliers, so the gentlest level having no flash and no shake is data, not code.

**Web Audio, with nothing to load.** Oscillators and a buffer of noise, through filters, gains and panners, scheduled in time: a hum from two notes a little out of tune, a heart of two falling thumps, a creak and a whisper from filtered noise, a stinger from four notes that rub against each other, and a voice for each creature (a spider's ticking, a ghoul's groan, a skeleton's rattle).

**Tests that listen.** An `OfflineAudioContext` renders the graph into a buffer, and the tests measure how loud each channel is: a sound on the right is louder in the right ear, a far one is quieter than a near one, the level's volume scales it all, and silence is silent.

**A game that makes sound waits to be asked.** Nothing is made until the player touches the screen, because a phone will not allow it.

## Key code

**The room goes quiet, late and fast.**

```js
const quiet = Math.pow(clamp01(dread * level.silence), 1.5);
return { ambient: 1 - quiet, heart: heartRate(dread), dread };
```

**A sound to the right of the player.**

```js
const [x, y, z] = toAudioSpace(position); // the game's z is ahead, Web Audio's is behind
panner.positionX.value = x;
```

**A strike fires once.**

```js
fired = { kind: this.pending.kind, strength: this.pending.strength, vibrate: vibratePattern(this.pending.strength, this.level) };
```

## Babylon.js features demonstrated

- Everything from Ghost Hunter The Hunt
- Web Audio (not Babylon.js): oscillators, noise buffers, filters, gains, panners with HRTF, the listener, scheduling, and an offline context for tests
- The Vibration API (`navigator.vibrate`), where there is one
- A shake put on the view before it is turned into the camera's rotation
- (The scare and the sound's decisions need no Babylon.js: they are plain arithmetic, tested without it.)

## Controls

- Everything from the Hunt sample
- On the start screen: **Gentle**, **Creepy** or **Terrifying** (the sentence under the buttons says what each does)
- **`?scare=gentle`** (or `creepy`, `terrifying`) in the address chooses for one visit
- With **`?dev`**: the level, the dread, the heart, whether the sound is running, sliders for when the room goes quiet, the shake and the master volume, and buttons to strike (a lunge, a touch), to play a creak behind you and a whisper to the right, and to go round the levels

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the levels (as a family, and the gentlest never flashing or shaking), the dread, the heart, the silence, the buzz, the shake, the strike's whole timeline and its cooldown; the sound's geometry, the voices, the heartbeats, and the sound itself rendered and measured (loud, left and right, near and far, volume, silence, the hum, the heart, a voice); and the picker and the two layers.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md). All the sound is made in code.

## Next up

The seventh sample is **Models**: the first art that someone made, made phone-sized and brought to life in code, with a doll, a floater, a horde, and ghosts that are models.
