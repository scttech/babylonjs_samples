# Ghost Hunter Creatures

Step 4 of the Ghost Hunter series. Builds on [Ghost Hunter Apparitions](../ghost_hunter_apparitions/README.md). The ghost drifts and watches; these **come for you**. A spider scuttles on eight legs and pounces, a ghoul lurches with its arms reaching, a skeleton rattles. The real models are still to be found, so each creature is **built out of simple shapes** (sticks and balls) registered as **placeholders** that the **P** key can hide. The shapes are not a model of a spider: they are whatever list of bones the creature's *pose* gives that frame, so the same code will draw a real model, and **a slot for the models is already in place** (`CREATURE_MODELS`, a loader that tolerates a bad file, and a body that plays the clip for what the creature is doing).

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Apparitions sample. Run `node reset-tutorial.js` to return this folder to the Apparitions sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel.

**A leg is the meeting of two circles.** Given a hip and a foot, `solveLeg` finds the knee that is `upper` from the hip and `lower` from the foot, on the side the knee bends to. Every leg of every creature (a spider's, a ghoul's arm, a skeleton's leg) is that one solver with different bones. A foot that is out of reach is reached for in a straight line.

**A walk is a planted foot and a swinging foot.** `footOffset` keeps a foot on the ground for 60% of a step, sliding back at a steady pace, and swings it forward and up for the rest. The spider's legs take turns in two sets of four.

**A pose is a list, not an animation.** `spiderPose`, `ghoulPose` and `skeletonPose` work out bones and blobs from the steps taken, the clock, how much it is moving, how far it reaches and how low it crouches. Nothing is keyed.

**A creature is a state machine**: lurk, stalk, lunge, recover, dying. It turns before it walks, a lunge is aimed once at where you were (so it can be dodged), it stops short of you, and what it does is told as events.

## Key code

**The knee of a leg.**

```js
const a = (upper * upper - lower * lower + distance * distance) / (2 * distance);
const h = Math.sqrt(Math.max(0, upper * upper - a * a));
```

**A stick lying along a bone.**

```js
stick.scaling.set(bone.r * 2, length, bone.r * 2);
BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.Up(), direction, FROM_UP);
```

**A creature that has a model, and one that has not.**

```js
return loaded ? new ModelBody(scene, creature, loaded) : new CreatureBody(scene, creature, materials, placeholders);
```

## Babylon.js features demonstrated

- Everything from Ghost Hunter Apparitions
- A pool of cylinders and spheres set from a list every frame (`Quaternion.FromUnitVectorsToRef`)
- Loading a model into an asset container, instancing it into the scene, and playing animation groups (wired, and tested with stand-ins, for when the models arrive)
- (The legs, the steps, the poses and the behaviour need no Babylon.js: they are plain arithmetic, tested without it.)

## Controls

- Everything from the Apparitions sample
- **1**, **2**, **3** spawn a spider, a ghoul and a skeleton six metres ahead; **0** clears them
- **P** hides the placeholders, and with them the shapes of the creatures (which carry on coming)
- With **`?dev`**: how many creatures and the nearest (kind, state, distance), the last thing one did, whether models are loaded, a switch that freezes them, sliders for their speeds and lunge, and buttons to spawn each, hurt the nearest and clear them

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the leg solver (lengths kept, out-of-reach feet, bend direction, degenerate cases), the step, the three poses (finite, the right bones, planted feet, crouching, reaching, rattle), every state of a creature (with a made-up random so that they do not depend on luck), the menagerie, the bodies of shapes (a stick per bone, lying along it, the pool, hiding as placeholders, disposal) and the model code with stand-ins.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md). The creatures are made in code until models are added, and are listed there when they are.

## Next up

The fifth sample is **The Hunt**: a director that decides what appears, where and when: behind you, at the edge of the view, out of a wall.
