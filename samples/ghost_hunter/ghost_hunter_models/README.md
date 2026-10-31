# Ghost Hunter Models

Step 7 of the Ghost Hunter series, and the first with art that someone made. Builds on [Ghost Hunter Jump Scares](../ghost_hunter_scares/README.md). Eight models arrived: a **zombie**, a **doll**, two floating heads, a heap of screaming faces, two **ghosts**, and a **rigged skeleton with animations**. Seven were made with up to a million triangles (the biggest file is 70 MB) and have no skeleton or animation. So the models are **made phone-sized** (about 10 MB for all eight, by `../assets/optimize-models.js`) and the seven are **brought to life from outside, in code**: a walk is a rock from side to side with a bob at each step, a lunge is a lean forward with a stretch, a death is a topple and a fade. The game gets three new kinds of creature from them (a **doll**, a **floater** and a **horde**), its ghoul becomes the zombie, and half of its ghosts are models. The **skeleton** plays its own clips (a slow shamble while it waits, a walk, a run for the lunge, a scream after a strike) and, with no death clip, topples when it dies. The spider has no model yet and is still shapes.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Scares sample. Run `node reset-tutorial.js` to return this folder to the Scares sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel.

**A model is fitted.** `measureModel` finds the box round it; `FittedModel` scales it to the height its row in `STATIC_MODELS` says and puts the middle of its feet at its pivot. After that, a creature is put somewhere by putting the pivot there.

**Motion for a thing with no bones.** `staticMotion` gives a tip, a roll, a lift and a stretch from the creature's state, steps and clock: a walk rocks once a step and bobs twice, a lunge leans well forward, a death topples it backwards and fades it. It is a stand-in for animation and it shows: it is meant to be replaced.

**A kind is a row.** A doll, a floater and a horde are rows of the table of creatures with a few fields (`models`, `pose`, `voice`, `hover`), and none of the code names them. With no model (hidden, or a file that failed) they are drawn as shapes, using the ghoul's pose.

**The tests load the real files.** `NullEngine` draws nothing but loads a `.glb`: every model in the table loads (and the skeleton loads with its three clips and its bones), fits to its height to two centimetres with its feet on the floor, and moves with its creature.

## Key code

**A walk for a thing with no legs.**

```js
const walk = Math.sin(s.gait * TAU) * s.moving;
let roll = walk * motion.sway + idle * motion.sway * 0.4;
```

**A model scaled to a height, with its feet on the floor.**

```js
this.scale = this.entry.height / this.size.height;
this.inner.position.set(-this.size.feet[0] * this.scale, -this.size.feet[1] * this.scale, -this.size.feet[2] * this.scale);
```

**Which model a creature has.**

```js
const names = creature.table.models || [creature.kind];
return names[creature.id % names.length];
```

## Babylon.js features demonstrated

- Everything from Ghost Hunter Jump Scares
- Loading `.glb` files into asset containers and instancing them (`instantiateModelsToScene`), with the glTF loader
- `getHierarchyBoundingVectors` to measure a model, and a pivot to fit it
- `mesh.visibility` to fade a model
- (The motion, the choice of model and the kinds need no Babylon.js: they are plain arithmetic and plain data, tested without it.)

## Controls

- Everything from the Scares sample
- **1** to **6** spawn a spider (shapes), a ghoul (the zombie), a skeleton (the rigged one), a doll, a floater and a horde; **0** clears them
- With **`?dev`**: how many models have loaded, a slider for the zombie's height, how many ghosts are models, and buttons to spawn each kind

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the motion of a model (standing, walking, lunging, dying, and every number finite for every state of every model), the table of models, the choice of model by number, the new kinds (a floater floats; a doll, floater and horde lunge and touch; their borrowed poses; the director's intensities), and the real models: all seven load, a model is fitted to its height with its feet on the floor and in the middle, a body follows its creature and fades when it dies, and a ghost model comes and goes with its ghost.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the models were made with [Meshy](https://www.meshy.ai) and are shared under a Creative Commons licence that allows use, sharing and modification.

## Next up

The eighth sample is **Music**: two tracks of recorded ambient horror, mixed by the dread so that it swells as something comes near and goes out for the silence before a strike.
