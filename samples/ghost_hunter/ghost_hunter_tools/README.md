# Ghost Hunter Tools

Step 9 of the Ghost Hunter series. Builds on [Ghost Hunter Music](../ghost_hunter_music/README.md). The player can do more than look. A **flashlight** (LIGHT, or **F**) shows what the dark hides (a ghost is only about a third there until the light is on it) and hurts and **stuns** what hates the light. A **capture beam** (BEAM, or **B**, held) takes hold of the nearest thing under the aim and, if it is held long enough, **captures** it. Each has a limit (the light's battery, the beam's heat: it overheats) and each kind of creature has a **weakness**, in a table: a spider hates light and is nearly helpless in it, a ghoul hardly minds it and is easily held by the beam, a floater is easily held, a horde needs both and patience, and a ghost is shown by the light and held by the beam.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Music sample. Run `node reset-tutorial.js` to return this folder to the Music sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel.

**Aiming is arithmetic.** A person is a vertical stick with a radius; a ray hits it if it passes within the radius (plus an aim assist for a thumb) in front of the player and within range; a cone is an angle and a length. All of it is dot products.

**Resources make a player choose.** A battery that drains while the light is on, recharges while it is off, dims when low, goes out at 0 and will not come back until it has 15%; a beam that heats, overheats, and has to cool before it fires again; a hold that is lost a little at a time.

**The tools do not know what a creature is.** They are given plain targets (a key, a kind, where its feet are, how thick and tall) and give back plain results; the game turns creatures and ghosts into targets and does what comes back.

**A held button on a phone has four ways to end**: release, cancel, leave, and being taken away. Handling only the release would leave the beam on when a finger slid off.

## Key code

**Is a point in the cone?**

```js
return dotOf(to, direction) / distance >= Math.cos((halfAngle * Math.PI) / 180);
```

**What each kind is weak to.**

```js
spider: { light: 3, stun: 1.5, beam: 0.6 },
ghoul: { light: 0.4, stun: 0, beam: 1.4 },
ghost: { light: 0, stun: 0, beam: 1.2 },
```

**A ghost half there until it is lit.**

```js
const shown = this.table.unlit + (1 - this.table.unlit) * this.reveal;
```

## Babylon.js features demonstrated

- Everything from Ghost Hunter Music
- A `SpotLight` from the player's eye, lighting what the light is on
- A glowing cylinder stretched between two points as a beam
- Pointer events for a held button (`pointerdown`, `pointerup`, `pointercancel`, `pointerleave`)
- (The tools' rules need no Babylon.js: they are plain arithmetic, tested without it.)

## Controls

- Everything from the Music sample
- **F** (or the LIGHT button) switches the flashlight; **B** held (or the BEAM button held) fires the beam
- With **`?dev`**: the light and the beam's state, how many have been captured, the holds, sliders for the width and reach of the light, the beam's speed and cooling, and how much of a ghost is there unlit, and buttons to fill the battery and to capture the nearest

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check aiming (hits, misses, heights, ranges, the aim assist, cones), the light (its battery, dimming, going flat, what it shows and does by weakness), the beam (the nearest, the hold, capture in the time the table says, letting go, overheating and cooling), stun and capture of real creatures, the reveal and capture of ghosts, and the buttons, the meters, the beam's shape and the hand.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The tenth sample is **Detectors**: an EMF meter, a radar, a spirit box you tune, and thermal vision, to find what you cannot see.
