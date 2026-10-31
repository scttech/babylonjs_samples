# Ghost Hunter Unease

Step 11 of the Ghost Hunter series, and the second made from playtest feedback. The player said that the red flash and the sound effect were annoying and not creepy, that the skeleton came so close that it clipped and only parts of it could be seen, and that the generated ghosts were cool but not creepy enough. **Startling is not frightening.** So this sample takes things out and puts quieter, worse things in. Builds on [Ghost Hunter Creeping](../ghost_hunter_creeping/README.md).

- **The lights go out** instead of a flash of light: a stutter of darkness (out, back for a moment, out again, then slowly back).
- **A presence** instead of a stinger: a deep thump you feel more than hear, and a long breath out close to the ear.
- **Creatures keep their distance**: about a metre and a half for a person-sized one, so that all of it is in the view, and none of it inside the camera.
- **A ghost that only moves when you are not looking.** Looked at, it stands still and stutters, as if it were not quite there. Look away and it comes closer, a little at a time, up to a nearest distance of its own.
- **A creepier ghost**: tall and thin, a long head, a cold pale colour, pinpoint eyes at the bottom of black pits, a mouth that opens wider as it comes near, long arms that rise to reach, and its head on one side. (The two ghost models creep and stutter the same way.)

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Creeping sample. Run `node reset-tutorial.js` to return this folder to the Creeping sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel.

**Where the player is looking is game state.** The angle between where the player faces and where a ghost is, against half the field of view and a margin: the same arithmetic the director uses to keep from placing a creature in view. A player with no direction is taken to be looking at everything, so nothing that does not know about it changes.

**An effect made of its absence.** A blackout is the one thing the player has (seeing) taken away, in a stutter; a breath is the one thing a ghost does not need to do.

**The design is in the numbers.** A ghost's height, its pace (0.35 m/s), its nearest approach (2.3 m), how unsteady it is when watched, and a creature's touch range are as much its design as its picture, and all of them are in tables.

## Key code

**The lights go out.**

```js
if (age < 0.14) return 1;
if (age < 0.26) return 0.1;
if (age < 0.5) return 0.85;
```

**It creeps only when it is not looked at.**

```js
if (!watched && this.stage === "present" && distance > this.table.closest) {
  const step = Math.min(this.table.creepSpeed * seconds, distance - this.table.closest);
```

**A mouth that opens as it comes near.**

```js
this.mouth.scaling.set(1, 0.25 + ghost.near * 2.4, 0.6);
```

## Controls

- Everything from the Creeping sample
- The numbers to tune are in `GHOST` (`ghost.js`: `creepSpeed`, `closest`, `watchedDepth`), `SCARE.levels` (`scare.js`) and the touch ranges in `CREATURES` (`creatures.js`)

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the blackout (out at once, back for a moment, out again, fading to nothing, never outside 0 to 1), the new rules of the scare, creatures at arm's length for every kind, a ghost that creeps (it stays when looked at, comes at the table's pace, stops at its nearest, stutters when watched, and the haunting says what is looked at), and the new look of the ghost (the pits, the mouth, the arms and the head).

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The twelfth sample is **Detectors**: an EMF meter, a radar, a spirit box you tune, and thermal vision, to find what you cannot see.
