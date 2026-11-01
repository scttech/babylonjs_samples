# Ghost Hunter Detectors

Step 13 of the Ghost Hunter series. Builds on [Ghost Hunter Company](../ghost_hunter_company/README.md). The player has a flashlight and a beam, and no way to find a ghost except to turn round and hope. This sample gives them four **gadgets**, each of which says where the dead are in a different way, from the same numbers about where things are: an **EMF meter**, a **radar**, a **spirit box** and **thermal vision**.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Company sample. Run `node reset-tutorial.js` to return this folder to the Company sample, to work through the changes yourself.

A phone only lets a page use its camera and motion sensors over HTTPS: see the [series README](../README.md). Add **`?dev`** to the address for the developer panel.

**One list, four instruments.** Every gadget is given the same two things: a list of **sources** (every creature that is alive and every ghost that is there, each `{ key, kind, position }`) and the player. Each is a plain function of those, in a table of numbers (`DETECT`), with nothing drawn and no Babylon.js, so a test can say what the meter reads at three metres.

- **EMF meter:** five lights for how near the strongest thing is (a ghost most of all, a spider least), falling off by a power of the distance so that close is much more than far, and a tick that gets faster the more are lit. It has no direction.
- **Radar:** an arm sweeps round once every few seconds, and where it goes over something a blip is lit at its bearing and distance; the blip fades until the arm comes again, so it shows where the thing *was*. The sweep wraps at 360 degrees, and `sweepCrossed` does that arithmetic (and a long frame that goes round more than once).
- **Spirit box:** a dial from 0 to 1. Every ghost is tuned to a frequency of its own, made from its key by a hash; tune near it, with the ghost in reach, and the static falls and a word is said (more often the better the lock and the nearer the ghost; the near ones say harder things). The random numbers are given, so a test can say when it speaks.
- **Thermal vision:** the dead are cold. It reads the temperature of the air round the player (the room's, less the coldest chill that is near), tints the whole picture cold by that, and **shows a near ghost where the light is not on it**.

One is in the hand at a time (`Detectors`): selecting it again puts it away, and **E** goes through all four and then none.

## Key code

**How near something is, falling off by a power.**

```js
return Math.pow(1 - distance / range, curve);
```

**Did the arm go over a bearing?**

```js
const gone = wrap(now - before);
const to = wrap(target - before);
return to > 0 && to <= gone;
```

## Controls

- Everything from the Company sample
- **E** takes the next gadget (EMF, radar, box, thermal, none); the four buttons at the top right do the same; the box has a dial
- **Y** hides a ghost somewhere behind you, to find (the rounds of the next sample do this by themselves)
- With **`?dev`**: a **Gadgets** section that reads what the gadgets say (the lights, the air, the box's lock), a dial for the box, and a button to hide a ghost

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The hunt has no end. The next sample is **rounds**.
