# Ghost Hunter AR

Step 2 of the Ghost Hunter series. Builds on [Ghost Hunter Room](../ghost_hunter_room/README.md). The game now knows something about **the room**: where the floor is. On an Android phone with Chrome it uses **real augmented reality (WebXR)**: the phone finds the floor (and tables, and beds) itself and keeps track of where it is in the room. Everywhere else the game **guesses** from the sensors alone that the floor is flat and a phone's height below the eye. Both answers have the same shape, so the rest of the game does not care which it has. A green **target** sits on the floor where you look, and a **tap** marks the floor there: with real augmented reality the mark has an **anchor** that the phone keeps in the same real place as you walk about.

It also starts a habit for the whole series: everything that is made of simple shapes to **stand in for a model** is registered as a **placeholder**, and all of them (or a kind of them) can be **hidden** with the **P** key, the address `?placeholders=off`, or the developer panel, so that the game can always be seen with and without its scaffolding.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Room sample. Run `node reset-tutorial.js` to return this folder to the Room sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel.

**A surface is one shape from two sources.** `{ point, normal, distance, guessed }`: WebXR gives a pose that becomes one (`surfaceFromPose`), and the camera view makes one by meeting a ray with a flat floor (`findFloor`). Taps, marks and (later) ghosts only ever see the shape.

**The guess has limits, and they are numbers.** The camera must look down at least `minDownDegrees` to be looking at the floor, and a floor further than `maxDistance` metres is not believed. Both are in the `SURFACE` table, with sliders in the developer panel.

**WebXR is asked defensively, and tested with stand-ins.** `xrAvailable` is false for a browser with no `xr`, one that cannot answer, and one that throws. `ArSession` takes the scene and Babylon.js as arguments, so the tests give it plain objects and say what it asks of them and what it does with the answers. Only a real phone can say whether the real thing answers the same.

**A session that will not start is a notice, not a crash.** The game falls back to the camera view and says so.

## Key code

**Where a ray meets a flat floor.**

```js
const t = (planeY - origin[1]) / direction[1];
if (t <= 0) return null;
```

**A surface from a phone's hit.**

```js
matrix.decompose(new BABYLON.Vector3(), rotation, position);
return surfaceFromPose([position.x, position.y, position.z], rotation);
```

**Hiding what stands in for a model.**

```js
node.metadata = { ...(node.metadata || {}), placeholder: kind };
node.setEnabled(this.visible(kind));
```

## Babylon.js features demonstrated

- Everything from Ghost Hunter Room
- WebXR through `createDefaultXRExperienceAsync`: the AR session, hit tests (`WebXRFeatureName.HIT_TEST`) and anchors (`ANCHOR_SYSTEM`)
- `Quaternion.FromUnitVectorsToRef` to lay a ring on a surface of any slope
- Hiding a node and its children with `setEnabled`
- (The surfaces, the placements and the placeholders need no Babylon.js: they are plain arithmetic and plain data, tested without it.)

## Controls

- Everything from the Room sample
- **Tap** (a press that does not move) to mark the floor where the green target is
- **P** hides and shows the placeholders (and remembers); `?placeholders=off` or `?placeholders=on` in the address says it for one visit
- **`?xr=off`** in the address uses the camera view even on a phone that has augmented reality
- With **`?dev`**: the placeholders (all, by kind, how many), the surface (guessed or found, how far), the marks (and how many are anchored), sliders for the limits of the floor guess, and buttons to mark the floor here and to clear the marks

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the placeholders (the three ways to choose, hiding all and by kind, a placeholder made while they are hidden), the surfaces (a ray and a plane, the guess and its limits, a rotation by a quaternion against Babylon.js, floors and walls, taps and drags), the placements (the limit, the minimum distance, the changes told, anchors, the nearest), WebXR with stand-ins (availability, the session's features, hits, select, anchors that work and anchors that do not), and the start screen's second button.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## Next up

The third sample is **Apparitions**: a ghost made in code, with a see-through shader, a wispy trail, flicker, and mist, standing where the marks are.
