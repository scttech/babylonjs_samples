# Ghost Hunter Company

Step 12 of the Ghost Hunter series. Builds on [Ghost Hunter Unease](../ghost_hunter_unease/README.md). The last sample ended with a game that is creepy on purpose and settled; then it was played on a phone for a while and changed in place, and this sample is **what the game became**, written down as a step you can follow: a bigger cast with models that have skeletons, a creature that **peeks** at the edge of the screen, a **pop** that is a jump scare, and a **door scan** that finds doorways in the camera's picture to peek from.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Unease sample. Run `node reset-tutorial.js` to return this folder to the Unease sample, to work through the changes yourself.

A phone only lets a page use its camera and motion sensors over HTTPS: see the [series README](../README.md). Add **`?dev`** to the address for the developer panel.

**The cast.**
- The **mummy** and the **skeleton** do not creep: they stagger towards you for a few seconds, so that you see it coming and wonder, and then they **run**.
- The **ghoul girl** rises (her model has an animation for it), walks straight at you, and falls dead a few metres short of you, with the model's own death.
- The **doll** shakes towards you (its model has a shaky walk), loiters, and rushes once.
- **Personal space:** nothing is ever nearer the player than a part of its touch range, so a creature never clips through the screen.
- The models that had no skeleton were **taken out**: a model is always one with clips of its own, played by role (idle, walk, run, lunge, recover, die, arise) with a fallback for a role it lacks.

**Peeks and pops.** A creature leans out from the edge of the screen (the edge is the corner), or from a doorway the player has marked, for a second or two, and goes back. A **pop** is the same thing in an instant, nearer, with a strike. `peeks.js` works out where a peek goes and when one comes, with the random numbers given in, so a test can play a whole game of them.

**The door scan.** A small segmentation model (SegFormer-B0, trained on ADE20K, 4 MB, run with onnxruntime-web) labels the pixels of the camera's picture; the doors and stairs are found as blobs, the foot of each (where the floor begins below it) is turned into a point on the floor by a ray from the eye, and it becomes a place to peek from. It is an enhancement, never a dependency: where it finds nothing, the edge of the screen and the player's own **MARK** are used. `scan.html` is the whole thing on a photograph. The model's licence is "other" (NVIDIA's research terms), so a game that is sold would swap it for another.

## Key code

**A peek is a state that goes out, holds, and goes back.**

```js
if (peek.age < inTime) out = smooth(peek.age / inTime);
else if (peek.age < inTime + hold) out = 1;
else out = 1 - smooth(Math.min(1, (peek.age - inTime - hold) / outTime));
```

**The foot of a door is where the floor begins below it.**

```js
if (table.floors.includes(labels[y * width + x])) { feet.push(y); break; }
```

## Controls

- Everything from the Unease sample
- **1** to **5** and **8** spawn a spider, a ghoul, a skeleton, a mummy, a ghoul girl and a doll; **6** a peek, **7** a pop, **J** a jump scare, **M** (or **MARK**) marks the floor as a place to peek from, **K** (or **SCAN**) scans the camera's picture for doors

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The player has a flashlight and a beam, and nothing to find a ghost *with*. The next sample is **detectors**.
