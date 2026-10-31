# Tutorial: Ghost Hunter Models -- Real Things in the Dark

This is the seventh tutorial of the Ghost Hunter series, and the first with art that someone made. Eight models arrived: a zombie, a doll, two floating heads, a heap of screaming faces, two ghosts, and a **skeleton with a rig and three animations**. They are good, and they are **not ready**: seven were made with up to a million triangles (the biggest file is 70 MB), and seven of the eight have no skeleton or animation at all. This sample does two things about that. First, the models are **made phone-sized** (about 10 MB for all eight). Second, the code that was written for shapes is made to take a model in its place, and to **bring a model to life from outside**, in code, with a rock, a bob, a lean and a topple. Nothing that was written before is thrown away: the spider has no model yet and is still shapes, and the **skeleton**, the one model with bones, is played through the code that was written for exactly that in the Creatures sample, and made to fit.

By the end you'll have:

- **A table of models** (`STATIC_MODELS`): where each file is, how tall it should be in the room, and how it moves
- **Motion for a model that does not move**: a rocking walk with a bob at each step, a lean and a stretch for a lunge, a topple and a fade for a death, all as plain arithmetic
- **Fitting**: a model is measured, scaled to its height, and its feet put on the floor in the middle, whatever size and where it was made
- **Bodies** for creatures and for ghosts that are models
- **A model that moves itself**: the skeleton's three clips (walk, run, scream) played for what the creature is doing, at their own speeds, with the clips it does not have (an idle, a death) made up for
- **Three new kinds** of creature that came with models: a **doll** (small, fast), a **floater** (a head that hovers) and a **horde** (large, slow), and a ghoul that is now a zombie
- **Ghosts that are models**: half of them, by their own number, with the rest still made in code
- **The tool** that made the models phone-sized, as a script
- Unit tests for all of it, **including tests that load the real models**: **301 passing tests**

**What you'll learn:** what a game does with art that is the wrong size and has no animation, how to measure and fit a model, how to move a thing that has no bones (and where that stops working), how to keep a slot for what has not arrived yet, and how to test code against real files.

**Before you start:** do the [Scares tutorial](../ghost_hunter_scares/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Scares sample, plus a placeholder for the new file and its tests. **The models are already in the shared assets folder** (`../assets/creatures/`), made by `../assets/optimize-models.js` from the originals, which are in `source_assets/ghost_hunter/`. The page already loads the loaders for `.glb` files.

```
ghost_hunter_models/
├── index.html, tests.html   (already list the new script and load the model loader)
├── js/
│   ├── staticbody.js        (placeholder -- Step 1)
│   ├── creatures.js, creaturemesh.js, ghost.js, director.js, main.js   (change -- Steps 2 to 4)
│   └── everything else, from the Scares sample
└── tests/
    ├── staticbody.tests.js  (placeholder)
    └── everything else, from the Scares sample (three of the files change a little)
```

Open `tests.html` before you change anything. You should see **281 passing tests**: the ones of the Scares sample.

### The models

A model that is made for a film is not a model that is made for a phone. The tool, `assets/optimize-models.js`, does four things to each, with [glTF Transform](https://gltf-transform.dev) (the instructions to install it are in the script):

1. **weld**: points that are in the same place become one point
2. **simplify** to a budget of triangles (10,000 to 20,000), keeping the shape that can be seen
3. **resize** the pictures to 1024 pixels across
4. **webp**: the pictures are stored as webp, which is much smaller than png

The 210 MB of originals are about 10 MB. (The skeleton is not simplified: it has bones, whose weights would have to be moved with the points, and at ten thousand triangles it is small enough already; only its pictures are made smaller.) Nobody needs to run the tool to do this tutorial: it has been run. But when another model comes (and the skeleton that is being made will be one), it is how it is made ready.

### Serving the page

As before: `npx serve` in the repo root, and open the sample through `http://localhost`, with **`?dev`**. Press **1** to **6** for a spider, a ghoul, a skeleton, a doll, a floater and a horde.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **Models that do not move**: a table, motion, fitting, bodies.
2. **The kinds that came with models**.
3. **The loader and the choice of body**.
4. **The game**.
5. **Try it**.

## Step 1: Models that do not move

### The models

`STATIC_MODELS` is the table. A row says where the file is, **how tall** the model should be in the room (a model may be made at any size, and is scaled to this: a doll is a metre, a zombie nearly two), which way it must be turned (all these face forward already), and how it moves. Two of the rows are marked `ghost`.

Open `js/staticbody.js` (the placeholder) and **replace the TODO line** with:

```js
// Models that do not move. The models that have arrived are single meshes with no skeleton and no animation: a figure, as it was made.
// They are brought to life from outside, in code: a walk is a rock from side to side with a bob; a lunge is a lean forward with a squash and
// a stretch; a death is a topple. All of that is worked out here as plain arithmetic (`staticMotion`), and `StaticBody` puts it on the
// model. A model with a skeleton and animations is a `ModelBody` (creaturemesh.js), and the day a skeleton arrives it goes in the same table.
// (This file uses TAU from ghost.js.) See ../tests/staticbody.tests.js.

// Where each model is, and what it is for. `height` is how tall it should be in the room, in metres (a model is made at any size, and is
// scaled to this); `yaw` is how far it must be turned to face forward; `motion` is how it moves, and a number of it is how much.
const STATIC_MODELS = {
  zombie: { url: "../assets/creatures/zombie.glb", height: 1.8, yaw: 0, motion: { sway: 0.07, lean: 0.12, bob: 0.025, squash: 0.08 } },
  doll: { url: "../assets/creatures/doll.glb", height: 1.05, yaw: 0, motion: { sway: 0.12, lean: 0.05, bob: 0.05, squash: 0.1 } },
  abomination: { url: "../assets/creatures/abomination.glb", height: 1.5, yaw: 0, motion: { sway: 0.05, lean: 0.1, bob: 0.07, squash: 0.15 } },
  terror: { url: "../assets/creatures/terror.glb", height: 0.9, yaw: 0, motion: { sway: 0.1, lean: 0.15, bob: 0.1, squash: 0.18 } },
  horde: { url: "../assets/creatures/horde.glb", height: 2.1, yaw: 0, motion: { sway: 0.03, lean: 0.06, bob: 0.03, squash: 0.06 } },
  ghost_enraged: { url: "../assets/creatures/ghost_enraged.glb", height: 1.9, yaw: 0, motion: { sway: 0.02, lean: 0.04, bob: 0.02, squash: 0.03 }, ghost: true },
  silhouette: { url: "../assets/creatures/silhouette.glb", height: 1.9, yaw: 0, motion: { sway: 0.02, lean: 0.03, bob: 0.02, squash: 0.03 }, ghost: true },
};

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STATIC_MODELS };
} else {
  Object.assign(window, { STATIC_MODELS });
}
```

### Motion

How do you make a walk out of a thing with no legs that move? You **rock it**. `staticMotion` takes what a creature is doing (its state, the steps it has taken, the clock, how much it is moving, how far it reaches, how far through dying) and gives how far to **tip it forward** and **sideways**, how far to **raise it**, and how much to **stretch** it. A walk rocks it from side to side once for each step and bobs it twice (up at each foot); a lunge leans it well forward, stretches it a little and narrows it; a dying one **topples backwards** to lie flat and fades away for the last of it.

In `js/staticbody.js`, find the export block (lines 19 to 26) and **delete it**. Add this in its place, and the export block under it:

```js
// The motion of a model that does not move itself, at a moment. `s` is { state, gait, time, moving, reach, dying }: what the creature is doing,
// its steps, the clock, how much it is walking and reaching (0 to 1), and how far through dying it is (0 to 1). Gives how far to tip it
// forward (pitch) and sideways (roll) in radians, how far to raise it, and how much to stretch it up and sideways.
function staticMotion(s, motion) {
  const walk = Math.sin(s.gait * TAU) * s.moving;
  const step = Math.abs(Math.sin(s.gait * TAU)) * s.moving;
  const idle = Math.sin(s.time * 1.1) * (1 - s.moving);
  let pitch = motion.lean * s.moving + motion.lean * 2.5 * s.reach;
  let roll = walk * motion.sway + idle * motion.sway * 0.4;
  let lift = step * motion.bob + Math.sin(s.time * 0.8) * motion.bob * 0.3;
  let stretch = 1 + s.reach * motion.squash * 0.5 - (s.state === "lurk" ? motion.squash * 0.15 : 0);
  let wide = 1 - s.reach * motion.squash * 0.3;
  let opacity = 1;
  if (s.dying > 0) {
    pitch = -(Math.PI / 2) * Math.min(1, s.dying * 1.6);
    roll *= 1 - s.dying;
    lift = 0;
    stretch = 1 - 0.1 * s.dying;
    opacity = 1 - Math.max(0, (s.dying - 0.6) / 0.4);
  }
  return { pitch, roll, lift, stretch, wide, opacity };
}

// How big a model is, and where it stands: the box round it in the world as it was loaded, at the origin. Gives how tall it is, and where the
// middle of its feet are.
function measureModel(root) {
  const { min, max } = root.getHierarchyBoundingVectors(true);
  return { height: max.y - min.y, feet: [(min.x + max.x) / 2, min.y, (min.z + max.z) / 2] };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STATIC_MODELS, staticMotion, measureModel };
} else {
  Object.assign(window, { STATIC_MODELS, staticMotion, measureModel });
}
```

Things to notice:

- **It is the steps that rock it**, not the seconds (`gait`, the same number that moves the legs of the shapes), so a creature that goes faster rocks faster, and one that stops stops.
- **A model standing still is never perfectly still**: a slow sway on the clock, and a smaller bob. A thing that does not move at all looks like a statue, and these are meant to be wrong.
- **It has limits, and the limits are the lesson.** A zombie that is rocked looks like a zombie that is walking; a doll that is rocked looks like a doll on a plate. It is a stand-in for animation, and the day the models have skeletons this file's job shrinks.
- **A death** is `pitch = -π/2 × (how far through, quicker)`: a topple. Most of what looks like dying is a model that goes down, and the last 40% of the time it fades.

### Fitting

A model is made where its maker made it: any size, with its middle where its maker liked. `measureModel` finds the box round it, and `FittedModel` puts it in a pivot: **scaled** so that it is as tall as the table says, and moved so that the middle of its **feet** is at the pivot. After that, to put a creature somewhere is to put the pivot there.

In `js/staticbody.js`, find the export block (lines 49 to 56) and **delete it**. Add this in its place, and the export block under it:

```js
// An instance of a loaded model, stood at the origin, scaled to the height the table says, with its feet on the floor and in the middle.
class FittedModel {
  constructor(scene, loaded, name, cloneMaterials = false) {
    this.entry = loaded.entry;
    this.instance = loaded.container.instantiateModelsToScene((meshName) => `${meshName}-${name}`, cloneMaterials);
    this.inner = new BABYLON.TransformNode(`fit-${name}`, scene);
    for (const node of this.instance.rootNodes) node.parent = this.inner;
    this.pivot = new BABYLON.TransformNode(`pivot-${name}`, scene);
    this.inner.parent = this.pivot;
    this.inner.computeWorldMatrix(true);
    this.size = measureModel(this.inner);
    this.scale = this.entry.height / this.size.height;
    this.inner.scaling.setAll(this.scale);
    this.inner.position.set(-this.size.feet[0] * this.scale, -this.size.feet[1] * this.scale, -this.size.feet[2] * this.scale);
    this.meshes = this.inner.getChildMeshes();
  }

  setVisibility(amount) {
    for (const mesh of this.meshes) mesh.visibility = amount;
  }

  dispose() {
    this.instance.dispose();
    this.inner.dispose();
    this.pivot.dispose();
  }
}

// A creature drawn as a model that does not move: put where the creature is, turned the way it faces, and moved by `staticMotion`.
class StaticBody {
  constructor(scene, creature, loaded, name = loaded.entry.url) {
    this.creature = creature;
    this.fitted = new FittedModel(scene, loaded, `${creature.id}`);
    this.motion = loaded.entry.motion;
    this.yaw = loaded.entry.yaw || 0;
    this.root = this.fitted.pivot;
  }

  update() {
    const creature = this.creature;
    const state = creature.state;
    const dying = state === "dying" ? 1 - creature.timer / creature.table.deathTime : 0;
    const reach = state === "lunge" ? 1 : state === "recover" ? 0.3 : 0;
    const motion = staticMotion({ state, gait: creature.gait, time: creature.clock, moving: creature.moving, reach, dying: Math.max(0, Math.min(1, dying)) }, this.motion);
    const pivot = this.fitted.pivot;
    pivot.position.set(creature.position[0], creature.position[1] + motion.lift, creature.position[2]);
    pivot.rotation.set(motion.pitch, creature.yaw + this.yaw, motion.roll);
    pivot.scaling.set(motion.wide, motion.stretch, motion.wide);
    this.fitted.setVisibility(motion.opacity);
  }

  dispose() {
    this.fitted.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STATIC_MODELS, staticMotion, measureModel, FittedModel, StaticBody };
} else {
  Object.assign(window, { STATIC_MODELS, staticMotion, measureModel, FittedModel, StaticBody });
}
```

Things to notice:

- **A loaded model is a container**, which is instanced into the scene each time it is wanted. Ten zombies share one set of triangles and one picture.
- **`StaticBody` reads the creature and writes the pivot**: where it is, which way it faces, the motion's tip and roll, how high, and how stretched. The creature does not know it is a model.
- **A dying model fades by `visibility`**, which every mesh has, and which turns on blending by itself when it is less than 1.

### Ghosts that are models

A ghost that is a model floats where the numbers of the ghost say, turns to face the player, and is as faint as they say, so that it comes and goes like the ghost made in code. Which ghosts are models is decided by **the ghost's own number** (a hash of it), so it is the same ghost every time, and `modelChance` in the table of ghosts says how many.

In `js/staticbody.js`, find the export block (lines 105 to 112) and **delete it**. Add this in its place, and the export block under it:

```js
// A ghost drawn as a model: it floats where the numbers of the ghost say, faces the player, and is as see-through as they say.
class GhostModelBody {
  constructor(scene, apparition, loaded) {
    this.apparition = apparition;
    this.fitted = new FittedModel(scene, loaded, `ghost-${apparition.id}`);
    this.root = this.fitted.pivot;
  }

  update() {
    const ghost = this.apparition;
    const shown = ghost.stage !== "waiting" && ghost.stage !== "gone";
    this.fitted.pivot.setEnabled(shown);
    const position = ghost.position();
    this.fitted.pivot.position.set(position[0], position[1], position[2]);
    this.fitted.pivot.rotation.y = ghost.yaw + (this.fitted.entry.yaw || 0);
    this.fitted.setVisibility(Math.min(1, ghost.opacity() / ghost.table.opacity) * 0.85);
  }

  dispose() {
    this.fitted.dispose();
  }
}

// Does this ghost have a model? Some do and some do not, decided by the ghost's own number (so it is the same every time), among the models
// there are. Gives the name of the model, or null.
function ghostModelFor(id, names, chance) {
  if (!names.length || hash(id + 40) >= chance) return null;
  return names[id % names.length];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STATIC_MODELS, staticMotion, measureModel, FittedModel, StaticBody, GhostModelBody, ghostModelFor };
} else {
  Object.assign(window, { STATIC_MODELS, staticMotion, measureModel, FittedModel, StaticBody, GhostModelBody, ghostModelFor });
}
```

## Step 2: The kinds that came with models

Three kinds that did not exist before, and a ghoul that is now a zombie. They are rows of the same table of creatures, and a few fields say what they have no shape of: `models` is the models a kind may have; `pose` is the pose to use when there is **no model** (they borrow the ghoul's); `voice` is the voice (they borrow); and `hover` is how high a thing floats (a floater does not fall, and is put at that height).

In `js/creatures.js`, after line 12, add:

```js
    models: ["zombie"],
```

And the skeleton, which has a model of its own:

In `js/creatures.js`, after line 17, add:

```js
    models: ["skeleton"],
```

In `js/creatures.js`, after line 21, add:

```js
  // The kinds that came with models. They borrow what they have no pose or voice of their own for from a kind that has: `pose` and `voice`.
  // `models` is the models a creature of the kind may have; `hover` is how high above the floor one floats.
  doll: {
    name: "doll", health: 4, speed: 1.9, lungeSpeed: 6.5, lungeRange: 1.8, lungeTime: 0.4, recoverTime: 1.3, notice: 8,
    touchRange: 0.5, turnRate: 7, strideLength: 0.45, radius: 0.3, height: 1.05, lurkTime: [1, 3], deathTime: 1.4,
    pose: "ghoul", voice: "spider", models: ["doll"],
  },
  floater: {
    name: "floater", health: 5, speed: 1.1, lungeSpeed: 5.5, lungeRange: 2.2, lungeTime: 0.5, recoverTime: 1.8, notice: 9,
    touchRange: 0.7, turnRate: 3, strideLength: 1, radius: 0.45, height: 0.9, lurkTime: [1.5, 3.5], deathTime: 1.6,
    pose: "ghoul", voice: "ghoul", models: ["abomination", "terror"], hover: 1.3,
  },
  horde: {
    name: "horde", health: 10, speed: 0.6, lungeSpeed: 2.8, lungeRange: 2.4, lungeTime: 0.8, recoverTime: 2.4, notice: 10,
    touchRange: 0.95, turnRate: 1.6, strideLength: 0.8, radius: 0.65, height: 2.1, lurkTime: [2, 4], deathTime: 2.4,
    pose: "ghoul", voice: "ghoul", models: ["horde"],
  },
```

In `js/creatures.js`, **replace** line 210:

```js
    if (this.position[1] > 0.01) this.state = "fall";
```

with:

```js
    if (table.hover) this.position[1] = table.hover; // a floater floats, and does not fall
    else if (this.position[1] > 0.01) this.state = "fall";
```

In `js/creatures.js`, **replace** line 315:

```js
    const made = POSES[this.kind]({ gait: this.gait, time: this.clock, moving: this.moving, reach, crouch });
```

with:

```js
    const made = POSES[this.table.pose || this.kind]({ gait: this.gait, time: this.clock, moving: this.moving, reach, crouch });
```

The director may send them, **from an intensity of their own**: dolls from 0.8, floaters from 1.2, a horde from 1.8. Harder games get stranger things.

In `js/director.js`, after line 28, add:

```js
    { kind: "doll", weight: [0, 2], from: 0.8 },
    { kind: "floater", weight: [0, 2], from: 1.2 },
    { kind: "horde", weight: [0, 1], from: 1.8 },
```

And a ghost has a chance of being a model:

In `js/ghost.js`, after line 20, add:

```js
  modelChance: 0.5, // how many of them are a model, when there are models (the rest are made in code)
```

Two tests that listed the kinds by name now ask the table:

In `tests/creatures.tests.js`, **replace** lines 127 to 128:

```js
      assert.strictEqual(typeof POSES[kind], "function", kind);
      const table = CREATURES[kind];
```

with:

```js
      const table = CREATURES[kind];
      assert.strictEqual(typeof POSES[table.pose || kind], "function", kind);
```

In `tests/director.tests.js`, **replace** line 156:

```js
    assert.true(["spider", "skeleton", "ghoul"].includes(orders[0].kind));
```

with:

```js
    assert.true(Object.keys(CREATURES).includes(orders[0].kind));
```

Things to notice:

- **A kind is a row, not a branch.** A new kind of creature was three rows of a table and four small changes to the code, and none of the changes names the kind. (The challenge at the end asks you to count.)
- **The shapes still work.** With no model loaded (or with the models hidden by P, or a file that fails to load) a doll is a small ghoul made of shapes. The game does not need the art.

## Step 3: The loader and the choice of body

The table of models in `creaturemesh.js` is now the table of this step (and still has the spider and the skeleton, as `null`: they are waiting for models). The loader is told to give the loader of Babylon.js **the folder and the file apart**, which is how it wants them. And there is a rule for which model a creature has: a kind may list several, and each creature has one **by its number**, so a floater is sometimes a bust and sometimes a head and always the same one.

`makeCreatureBody` now has three answers: a model that moves itself (it has clips: a `ModelBody`), a model that does not (it has a `motion`: a `StaticBody`), and none (shapes).

In `js/creaturemesh.js`, **replace** line 22:

```js
const CREATURE_MODELS = { spider: null, ghoul: null, skeleton: null };
```

with:

```js
// The models there are: the skeleton has a skeleton and clips of its own; the rest are in staticbody.js (they do not move by themselves).
// The spider has no model yet, and is shapes.
const CREATURE_MODELS = {
  spider: null,
  skeleton: {
    url: "../assets/creatures/skeleton.glb",
    height: 1.75,
    yaw: 0,
    // The model has three clips: a walk, a run, and a scream (2.8 seconds). It has no idle: a creature that lurks walks very slowly, and
    // one that is getting its breath back after a strike screams. It has no death: a dying skeleton is stopped and toppled.
    clips: { idle: "Walking", walk: "Walking", lunge: "Running", recover: "Zombie_Scream" },
    speeds: { idle: 0.2, walk: 1, lunge: 1.1, recover: 1 },
  },
  ...STATIC_MODELS,
};
```

The table has an entry for the skeleton with a `clips` field, and that field is what says "this one moves itself". The model has three animations: **Walking** (about a second a cycle), **Running** and **Zombie_Scream** (nearly three seconds). It has no idle and no death. So the entry says what to play instead: a creature that **lurks** plays the walk at a fifth of its speed (a slow shamble, which is a very good idle for a thing that is waiting), one that **stalks** plays it at full speed, one that **lunges** plays the run a little faster, and one that is **recovering** after a strike plays the scream.

In `js/creaturemesh.js`, **replace** line 45:

```js
      loaded.set(kind, { entry, container: await loader.LoadAssetContainerAsync(entry.url, undefined, scene) });
```

with:

```js
      const slash = entry.url.lastIndexOf("/"); // the loader wants the folder and the file apart
      loaded.set(kind, { entry, container: await loader.LoadAssetContainerAsync(entry.url.slice(0, slash + 1), entry.url.slice(slash + 1), scene) });
```

### A body for a model with bones

`ModelBody` was written in the Creatures sample, before there was a model to try it on, and tested with stand-ins. Now there is a real one, and it needs three things that the stand-ins did not: to be **fitted** (the same fitting as the other models: the skeleton is made at 1.66 metres and the table says 1.75), to change clip **only when the creature's *role* changes** (not its state: the walk and the idle are the same clip at different speeds, and starting it again would make it jump), and to cope with a creature **dying** when the model has no death clip.

In `js/creaturemesh.js`, **replace** lines 138 to 139:

```js
// A creature drawn as a model that was loaded: the model is instanced, put where the creature is, and plays the clip for what the
// creature is doing. (Nothing in the game uses it until a model is given in CREATURE_MODELS.)
```

with:

```js
// A creature drawn as a model with a skeleton and animations: the model is instanced, fitted to its height, put where the creature is,
// and plays the clip for what the creature is doing, as fast as its entry in the table says. A model has no clip for everything (this
// one has no idle, and no death): the table says which clip to use in its place, and a creature that is dying with no clip of its own
// stops where it is and topples, as the models that do not move do.
```

In `js/creaturemesh.js`, **replace** lines 146 to 156:

```js
    this.instance = loaded.container.instantiateModelsToScene((name) => `${name}-${creature.id}`, false);
    this.root = this.instance.rootNodes[0];
    const scale = this.entry.scale || 1;
    this.root.scaling.setAll(scale);
    this.clip = null;
  }

  // The name of the clip for what a creature is doing.
  static clipFor(state, clips) {
    const wanted = { lurk: "idle", stalk: "walk", lunge: "lunge", recover: "idle", dying: "die" }[state] || "idle";
    return clips[wanted] || clips.idle || null;
```

with:

```js
    this.fitted = new FittedModel(scene, loaded, `${creature.id}`);
    this.root = this.fitted.pivot;
    this.groups = this.fitted.instance.animationGroups;
    for (const group of this.groups) group.stop(); // the model arrives playing something
    this.role = null;
    this.current = null;
  }

  // What a creature is doing, as the part a clip plays: "idle", "walk", "lunge", "recover" or "die".
  static roleFor(state) {
    return { lurk: "idle", stalk: "walk", lunge: "lunge", recover: "recover", dying: "die" }[state] || "idle";
  }

  // The name of the clip for what a creature is doing: its own, or the idle one if it has none (and none at all for a death).
  static clipFor(state, clips) {
    const role = ModelBody.roleFor(state);
    return clips[role] || (role === "die" ? null : clips.idle) || null;
```

In `js/creaturemesh.js`, **replace** lines 167 to 174:

```js
    this.root.position.set(creature.position[0], creature.position[1], creature.position[2]);
    this.root.rotation.y = creature.yaw + (this.entry.yaw || 0);
    const wanted = ModelBody.clipFor(creature.state, this.entry.clips || {});
    if (wanted !== this.clip) {
      for (const group of this.instance.animationGroups) group.stop();
      const next = this.instance.animationGroups.find((group) => group.name.startsWith(wanted));
      if (next) next.start(wanted !== (this.entry.clips || {}).die);
      this.clip = wanted;
```

with:

```js
    const pivot = this.fitted.pivot;
    const dying = creature.state === "dying" ? Math.max(0, Math.min(1, 1 - creature.timer / creature.table.deathTime)) : 0;
    const fall = staticMotion({ state: creature.state, gait: 0, time: 0, moving: 0, reach: 0, dying }, { sway: 0, lean: 0, bob: 0, squash: 0 });
    pivot.position.set(creature.position[0], creature.position[1], creature.position[2]);
    pivot.rotation.set(fall.pitch, creature.yaw + (this.entry.yaw || 0), 0);
    this.fitted.setVisibility(fall.opacity);

    const role = ModelBody.roleFor(creature.state);
    if (role === this.role) return;
    this.role = role;
    const name = ModelBody.clipFor(creature.state, this.entry.clips || {});
    const next = name ? this.groups.find((group) => group.name.startsWith(name)) : null;
    const speed = (this.entry.speeds && this.entry.speeds[role]) || 1;
    if (next && next === this.current) {
      next.speedRatio = speed; // the same clip at another pace: a walk and an idle that is a slow walk
    } else {
      if (this.current) (next || role !== "die" ? this.current.stop() : this.current.pause());
      this.current = next || this.current;
      if (next) next.start(role !== "die", speed);
```

In `js/creaturemesh.js`, **replace** line 190:

```js
    this.instance.dispose();
```

with:

```js
    this.fitted.dispose();
```

Things to notice:

- **A role is not a state.** `roleFor` turns a creature's state into the part a clip plays (idle, walk, lunge, recover, die), and the clip changes when the *role* does. The slow walk of a lurk and the walk of a stalk are the same animation group at 0.2 and 1, so the second only changes the group's `speedRatio`.
- **A clip that is missing is a fallback, not an error.** `clipFor` gives the role's clip, or the idle one, or (for a death) nothing.
- **A death with no clip** pauses whatever was playing and uses the topple and fade of the models that do not move (`staticMotion` with a death). One creature of any kind dies the same way.
- **Animation groups are instanced with the model**: each skeleton has its own copy of the bones and the clips, so ten of them can each be at a different point in a walk.

In `js/creaturemesh.js`, **replace** lines 194 to 197:

```js
// Whichever body a creature should have: its model if there is one loaded, and shapes if not.
function makeCreatureBody(scene, creature, materials, placeholders, models = new Map()) {
  const loaded = models.get(creature.kind);
  return loaded ? new ModelBody(scene, creature, loaded) : new CreatureBody(scene, creature, materials, placeholders);
```

with:

```js
// Which model a creature has: a creature's kind can have several (the table lists them), and each creature has one, by its number, so
// that the same creature is always the same one.
function modelNameFor(creature) {
  const names = creature.table.models || [creature.kind];
  return names[creature.id % names.length];
}

// Whichever body a creature should have: its model if there is one loaded (one that moves itself, or one that is moved from outside),
// and shapes if not.
function makeCreatureBody(scene, creature, materials, placeholders, models = new Map()) {
  const loaded = models.get(modelNameFor(creature));
  if (!loaded) return new CreatureBody(scene, creature, materials, placeholders);
  return loaded.entry.clips ? new ModelBody(scene, creature, loaded) : new StaticBody(scene, creature, loaded);
```

In `js/creaturemesh.js`, **replace** lines 213 to 215:

```js
  module.exports = { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, makeCreatureBody };
} else {
  Object.assign(window, { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, makeCreatureBody });
```

with:

```js
  module.exports = { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, modelNameFor, makeCreatureBody };
} else {
  Object.assign(window, { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, modelNameFor, makeCreatureBody });
```

The tests of the loader and the table change with them:

In `tests/creaturemesh.tests.js`, **replace** lines 102 to 111:

```js
  const entry = { url: "x.glb", scale: 2, yaw: 3, clips: { idle: "Idle", walk: "Walk", lunge: "Attack", die: "Death" } };
  const fakeGroup = (name) => ({ name, started: null, stopped: 0, start(loop) { this.started = loop; }, stop() { this.stopped += 1; } });
  const fakeContainer = () => {
    const groups = ["Idle", "Walk", "Attack", "Death"].map(fakeGroup);
    const root = { scaling: new BABYLON.Vector3(1, 1, 1), position: new BABYLON.Vector3(), rotation: new BABYLON.Vector3() };
    return { groups, root, instantiateModelsToScene: () => ({ rootNodes: [root], animationGroups: groups, dispose() { this.disposed = true; } }) };
  };

  QUnit.test("no kind has a model yet, so every kind is drawn as shapes", (assert) => {
    assert.deepEqual(Object.values(CREATURE_MODELS), [null, null, null]);
```

with:

```js
  QUnit.test("the spider has no model yet, and is shapes; the skeleton has one with clips of its own; the others are moved from outside", (assert) => {
    assert.strictEqual(CREATURE_MODELS.spider, null);
    assert.true(CREATURE_MODELS.skeleton.url.endsWith("skeleton.glb"));
    assert.deepEqual(Object.keys(CREATURE_MODELS.skeleton.clips).sort(), ["idle", "lunge", "recover", "walk"]);
    for (const name of ["zombie", "doll", "abomination", "terror", "horde"]) assert.true(CREATURE_MODELS[name].url.endsWith(`${name}.glb`), name);
```

In `tests/creaturemesh.tests.js`, **replace** line 111:

```js
    const loader = { LoadAssetContainerAsync: async (url) => { asked.push(url); if (url === "bad.glb") throw new Error("no"); return { url }; } };
```

with:

```js
    const loader = { LoadAssetContainerAsync: async (folder, file) => { const url = folder + file; asked.push(url); if (url === "bad.glb") throw new Error("no"); return { url }; } };
```

The tests of the model with a skeleton, which had been written with stand-ins, are now written with the real one:

In `tests/creaturemesh.tests.js`, **replace** lines 120 to 157 (from `QUnit.test("a model is scaled, put where the creature is, an` to `assert.true(without instanceof CreatureBody);`) with:

```js
  QUnit.test("the clip follows what the creature is doing, and a model with no clip for something uses its idle one", (assert) => {
    const clips = CREATURE_MODELS.skeleton.clips;
    assert.strictEqual(ModelBody.clipFor("lurk", clips), "Walking", "this model has no idle: a very slow walk");
    assert.strictEqual(ModelBody.clipFor("stalk", clips), "Walking");
    assert.strictEqual(ModelBody.clipFor("lunge", clips), "Running");
    assert.strictEqual(ModelBody.clipFor("recover", clips), "Zombie_Scream");
    assert.strictEqual(ModelBody.clipFor("dying", clips), null, "and no death: it is stopped and toppled");
    assert.strictEqual(ModelBody.clipFor("stalk", { idle: "Idle" }), "Idle", "a model with no walk stands");
    assert.strictEqual(ModelBody.clipFor("recover", { idle: "Idle", walk: "Walk" }), "Idle");
    assert.strictEqual(ModelBody.clipFor("dying", { die: "Death" }), "Death");
  });

  const loadSkeleton = async (scene) => (await loadCreatureModels(scene, { skeleton: CREATURE_MODELS.skeleton })).get("skeleton");

  QUnit.test("the real skeleton loads, with the three clips and a skeleton of bones", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = await loadSkeleton(scene);
    assert.deepEqual(loaded.container.animationGroups.map((g) => g.name).sort(), ["Running", "Walking", "Zombie_Scream"]);
    assert.strictEqual(loaded.container.skeletons.length, 1);
    for (const clip of Object.values(CREATURE_MODELS.skeleton.clips)) assert.true(loaded.container.animationGroups.some((g) => g.name === clip), clip);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a skeleton is fitted, put where the creature is, turned the way it faces, and plays the clip of its state at the table's speed", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = await loadSkeleton(scene);
    const creature = new Creature({ id: 1, kind: "skeleton", position: [2, 0, 5], random: () => 0 });
    creature.yaw = 1;
    const body = makeCreatureBody(scene, creature, null, null, new Map([["skeleton", loaded]]));
    assert.true(body instanceof ModelBody);
    body.update();
    assert.deepEqual([body.root.position.x, body.root.position.z], [2, 5]);
    assert.strictEqual(body.root.rotation.y, 1);
    const { min, max } = body.root.getHierarchyBoundingVectors(true);
    assert.true(Math.abs(max.y - min.y - CREATURE_MODELS.skeleton.height) < 0.03, "as tall as the table says");
    assert.strictEqual(body.current.name.split("-")[0], "Walking");
    assert.strictEqual(body.current.speedRatio, CREATURE_MODELS.skeleton.speeds.idle, "a lurk is a slow walk");
    const walking = body.current;
    creature.state = "stalk";
    body.update();
    assert.strictEqual(body.current, walking, "the same clip, at its own pace now");
    assert.strictEqual(walking.speedRatio, 1);
    creature.state = "lunge";
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Running");
    assert.false(walking.isPlaying);
    creature.state = "recover";
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Zombie_Scream");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a dying skeleton stops, and topples, and fades", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = await loadSkeleton(scene);
    const creature = new Creature({ id: 1, kind: "skeleton", position: [0, 0, 5], random: () => 0 });
    const body = new ModelBody(scene, creature, loaded);
    body.update();
    creature.hit(100);
    creature.update(CREATURES.skeleton.deathTime * 0.95, { position: [0, 1.4, 0] });
    body.update();
    assert.true(body.root.rotation.x < -1, "toppled");
    assert.true(body.fitted.meshes.every((m) => m.visibility < 0.5), "and mostly gone");
    assert.false(body.current.isPlaying && !body.current.isPaused, "and not still walking");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a kind with a model is drawn as it, and one without as shapes", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = await loadSkeleton(scene);
    const skeleton = new Creature({ id: 1, kind: "skeleton", position: [0, 0, 5], random: () => 0 });
    assert.true(makeCreatureBody(scene, skeleton, creatureMaterials(scene), null, new Map([["skeleton", loaded]])) instanceof ModelBody);
    assert.true(makeCreatureBody(scene, skeleton, creatureMaterials(scene), null, new Map()) instanceof CreatureBody);
```

### Tests

Open `tests/staticbody.tests.js` and **replace the TODO line** with:

```js
QUnit.module("staticMotion", () => {
  const motion = STATIC_MODELS.zombie.motion;
  const base = { state: "stalk", gait: 0, time: 0, moving: 0, reach: 0, dying: 0 };

  QUnit.test("a model that stands still sways a little, and does not lean or bob much", (assert) => {
    for (let t = 0; t < 10; t += 0.2) {
      const m = staticMotion({ ...base, state: "lurk", time: t }, motion);
      assert.true(Math.abs(m.roll) <= motion.sway * 0.4 + 1e-9);
      assert.strictEqual(m.pitch, 0);
      assert.true(m.lift <= motion.bob * 0.3 + 1e-9);
    }
  });

  QUnit.test("a walk rocks from side to side with each step, and bobs twice a step", (assert) => {
    const a = staticMotion({ ...base, moving: 1, gait: 0.25 }, motion);
    const b = staticMotion({ ...base, moving: 1, gait: 0.75 }, motion);
    assert.true(a.roll > 0.9 * motion.sway && b.roll < -0.9 * motion.sway, "one way, then the other");
    assert.true(Math.abs(a.lift - b.lift) < 1e-9, "the bob is up at both");
    assert.true(a.pitch > 0, "leaning forward as it goes");
  });

  QUnit.test("a lunge leans well forward, stretches and narrows", (assert) => {
    const walk = staticMotion({ ...base, moving: 1 }, motion);
    const lunge = staticMotion({ ...base, state: "lunge", moving: 1, reach: 1 }, motion);
    assert.true(lunge.pitch > walk.pitch * 2);
    assert.true(lunge.stretch > 1 && lunge.wide < 1);
  });

  QUnit.test("a death topples it backwards, flat, and fades the last of it", (assert) => {
    const early = staticMotion({ ...base, state: "dying", dying: 0.2 }, motion);
    const late = staticMotion({ ...base, state: "dying", dying: 1 }, motion);
    assert.true(early.pitch < 0 && late.pitch === -Math.PI / 2);
    assert.strictEqual(early.opacity, 1);
    assert.strictEqual(late.opacity, 0);
    assert.strictEqual(late.lift, 0);
  });

  QUnit.test("every number is finite for every state, and every model has a motion", (assert) => {
    for (const [name, entry] of Object.entries(STATIC_MODELS)) {
      for (const state of ["lurk", "stalk", "lunge", "recover", "dying"]) for (const moving of [0, 1]) for (const dying of [0, 0.5, 1]) {
        const m = staticMotion({ state, gait: 3.3, time: 7.1, moving, reach: state === "lunge" ? 1 : 0, dying }, entry.motion);
        assert.true(Object.values(m).every(Number.isFinite), `${name} ${state}`);
        assert.true(m.stretch > 0 && m.wide > 0);
      }
    }
  });
});

QUnit.module("the models", () => {
  QUnit.test("every model is in the folder of the assets, has a height in metres, and says how it moves", (assert) => {
    for (const [name, entry] of Object.entries(STATIC_MODELS)) {
      assert.strictEqual(entry.url, `../assets/creatures/${name}.glb`);
      assert.true(entry.height > 0.5 && entry.height < 3, name);
      for (const key of ["sway", "lean", "bob", "squash"]) assert.true(entry.motion[key] >= 0, `${name} ${key}`);
    }
  });

  QUnit.test("two of them are ghosts, and every kind of creature that has models names ones that there are", (assert) => {
    assert.deepEqual(Object.keys(STATIC_MODELS).filter((name) => STATIC_MODELS[name].ghost), ["ghost_enraged", "silhouette"]);
    for (const [kind, table] of Object.entries(CREATURES)) {
      if (!table.models) continue;
      for (const name of table.models) assert.true(name in CREATURE_MODELS && !(STATIC_MODELS[name] || {}).ghost, `${kind}: ${name}`);
    }
  });

  QUnit.test("every kind has a pose and a voice, its own or borrowed", (assert) => {
    for (const [kind, table] of Object.entries(CREATURES)) {
      assert.true(Boolean(table.pose || POSES[kind]), kind);
      assert.strictEqual(typeof POSES[table.pose || kind], "function", kind);
      assert.true(["spider", "ghoul", "skeleton"].includes(table.voice || kind), kind);
    }
  });

  QUnit.test("a creature has the model its number says, always the same one", (assert) => {
    const floater = (id) => new Creature({ id, kind: "floater", position: [0, 0, 5], random: () => 0 });
    assert.strictEqual(modelNameFor(floater(1)), "terror");
    assert.strictEqual(modelNameFor(floater(2)), "abomination");
    assert.strictEqual(modelNameFor(floater(2)), modelNameFor(floater(2)));
    assert.strictEqual(modelNameFor(new Creature({ id: 9, kind: "spider", position: [0, 0, 5] })), "spider", "a kind with no list is its own name");
  });

  QUnit.test("a ghost has a model or not by its own number, and never when there are none or the chance is none", (assert) => {
    const names = ["ghost_enraged", "silhouette"];
    let some = 0;
    for (let id = 1; id <= 200; id++) {
      const name = ghostModelFor(id, names, 0.5);
      if (name) { some += 1; assert.true(names.includes(name)); }
      assert.strictEqual(ghostModelFor(id, names, 0.5), name, "the same every time");
      assert.strictEqual(ghostModelFor(id, [], 1), null);
      assert.strictEqual(ghostModelFor(id, names, 0), null);
      assert.true(ghostModelFor(id, names, 1) !== null);
    }
    assert.true(some > 60 && some < 140, `${some} of 200`);
  });
});

QUnit.module("the new kinds", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("a floater floats where it is put, and does not fall", (assert) => {
    const floater = new Creature({ id: 1, kind: "floater", position: [0, 0, 6], random: () => 0 });
    assert.strictEqual(floater.state, "lurk");
    assert.strictEqual(floater.position[1], CREATURES.floater.hover);
    for (let i = 0; i < 100; i++) floater.update(0.05, player);
    assert.strictEqual(floater.position[1], CREATURES.floater.hover);
  });

  QUnit.test("a doll, a floater and a horde come at the player, lunge and touch, like the others", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) {
      const creature = new Creature({ id: 1, kind, position: [0, 0, 5], random: () => 0 });
      creature.state = "stalk";
      creature.yaw = Math.PI;
      const told = [];
      for (let t = 0; t < 10; t += 0.05) {
        creature.update(0.05, player);
        told.push(...creature.events);
        creature.events = [];
      }
      assert.true(told.includes("lunge") && told.includes("touch"), kind);
    }
  });

  QUnit.test("they have a pose even with no model, borrowed from the ghoul", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) {
      const creature = new Creature({ id: 1, kind, position: [0, 0, 5] });
      assert.true(creature.pose().bones.length > 5, kind);
    }
  });

  QUnit.test("the director may send them, from the intensity the table says", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) assert.true(HUNT.kinds.some((k) => k.kind === kind), kind);
    const random = () => 0.5;
    assert.true(chooseKind(1, 0.5, HUNT, random).kind === "spider");
    const high = new Set();
    let n = 0;
    const spread = () => ((n++ * 0.137) % 1);
    for (let i = 0; i < 400; i++) high.add(chooseKind(1, 2.5, HUNT, spread).kind);
    assert.true(high.has("floater") && high.has("horde") && high.has("doll"));
  });
});

QUnit.module("real models", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    return { engine, scene: new BABYLON.Scene(engine) };
  };

  QUnit.test("every model in the table loads from the assets folder, and has a mesh in it", async (assert) => {
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, STATIC_MODELS);
    assert.deepEqual([...loaded.keys()].sort(), Object.keys(STATIC_MODELS).sort(), "none was left out");
    for (const [name, model] of loaded) assert.true(model.container.meshes.length > 0, name);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a model is fitted: as tall as the table says, with its feet on the floor, in the middle", async (assert) => {
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { zombie: STATIC_MODELS.zombie, doll: STATIC_MODELS.doll });
    for (const [name, model] of loaded) {
      const fitted = new FittedModel(scene, model, name);
      const { min, max } = fitted.pivot.getHierarchyBoundingVectors(true);
      assert.true(Math.abs(max.y - min.y - model.entry.height) < 0.02, `${name}: ${(max.y - min.y).toFixed(3)} m`);
      assert.true(Math.abs(min.y) < 0.02, `${name}: feet at ${min.y.toFixed(3)}`);
      assert.true(Math.abs((min.x + max.x) / 2) < 0.02 && Math.abs((min.z + max.z) / 2) < 0.02, `${name}: in the middle`);
      fitted.dispose();
    }
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a static body is put where the creature is, turned, and moved by its motion; and a dead one fades", async (assert) => {
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { zombie: STATIC_MODELS.zombie });
    const creature = new Creature({ id: 1, kind: "ghoul", position: [2, 0, 5], random: () => 0 });
    creature.yaw = 0.8;
    const body = makeCreatureBody(scene, creature, null, null, loaded);
    assert.true(body instanceof StaticBody);
    body.update();
    assert.deepEqual([body.root.position.x, body.root.position.z], [2, 5]);
    assert.strictEqual(body.root.rotation.y, 0.8);
    creature.hit(100);
    creature.update(CREATURES.ghoul.deathTime * 0.95, { position: [0, 1.4, 0] });
    body.update();
    assert.true(body.root.rotation.x < -1, "toppled");
    assert.true(body.fitted.meshes.every((mesh) => mesh.visibility < 0.5), "and mostly gone");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a ghost model floats where the ghost is, turned, and as faint as it is", async (assert) => {
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { silhouette: STATIC_MODELS.silhouette });
    const ghost = new Apparition({ id: 3, home: [1, 0, 4], delay: 0 });
    const body = new GhostModelBody(scene, ghost, loaded.get("silhouette"));
    ghost.update(0.1, [8, 1.4, 4]);
    body.update();
    assert.true(body.root.isEnabled());
    assert.strictEqual(body.root.position.x, ghost.position()[0]);
    assert.true(body.fitted.meshes[0].visibility < 0.5, "it is only just there");
    ghost.update(6, [8, 1.4, 4]);
    body.update();
    assert.true(body.fitted.meshes[0].visibility > 0.2, "and there");
    const waiting = new GhostModelBody(scene, new Apparition({ id: 4, home: [0, 0, 4], delay: 9 }), loaded.get("silhouette"));
    waiting.update();
    assert.false(waiting.root.isEnabled(), "a ghost that has not begun is not there");
    body.dispose();
    waiting.dispose();
    scene.dispose();
    engine.dispose();
  });
});
```

Things to notice:

- **The skeleton is tested for real**: it loads with its three clips and its 24 bones, it is fitted to 1.75 metres, it plays the walk (at a fifth of the speed) for a lurk, the same clip at full speed for a stalk, the run for a lunge, the scream for a recovery, and a dying one stops and topples and fades.
- **The last module loads the real files.** `NullEngine` draws nothing, but it can load a `.glb`, and so the tests say that *every model in the table loads* and has a mesh, that a fitted model is as tall as its row says (to two centimetres), with its feet on the floor (to two centimetres) and in the middle, that a static body goes where the creature goes, and that a ghost model fades with the ghost. If a model file is moved, renamed or broken, this is where you hear of it.
- **The motion is tested as a family**: every number is finite for every state of every model.
- **The names agree**: every model a kind lists is in the table, and the two ghosts are the only ones marked as ghosts.

Open `tests.html`. You should see **301 passing tests**: 20 more.

## Step 4: The game

In `js/main.js`: ghosts that are models, voices that are borrowed, keys for the new kinds, and rows in the panel.

In `js/main.js`, **replace** line 68:

```js
    bodies.set(item.id, new GhostBody(scene, item, puff));
```

with:

```js
    // A ghost is made in code, or (if there are models of ghosts, and its own number says so) it is a model.
    const ghostModels = [...creatureModels.keys()].filter((name) => STATIC_MODELS[name] && STATIC_MODELS[name].ghost);
    const chosen = ghostModelFor(item.id, ghostModels, GHOST.modelChance);
    bodies.set(item.id, chosen ? new GhostModelBody(scene, item, creatureModels.get(chosen)) : new GhostBody(scene, item, puff));
```

In `js/main.js`, **replace** line 94:

```js
// Until models are given in CREATURE_MODELS the bodies are made of simple shapes, which are placeholders of the kind "creature": hide
```

with:

```js
// A kind that has a model is drawn as it (staticbody.js moves it); one that has none (the spider and the skeleton, so far) is drawn as
// simple shapes, which are placeholders of the kind "creature": hide
```

In `js/main.js`, **replace** line 180:

```js
  for (const creature of creatures.items) audio.voice(creature.id, creature.kind, creature.state, creature.position, creature.distanceTo(player.position), seconds);
```

with:

```js
  for (const creature of creatures.items) audio.voice(creature.id, creature.table.voice || creature.kind, creature.state, creature.position, creature.distanceTo(player.position), seconds);
```

In `js/main.js`, after line 411, add:

```js
  if (event.code === "Digit4") spawnCreature("doll");
  if (event.code === "Digit5") spawnCreature("floater");
  if (event.code === "Digit6") spawnCreature("horde");
```

In `js/main.js`, after line 513, add:

```js
          slider("how many are models", GHOST, "modelChance", 0, 1, 0.1),
```

In `js/main.js`, **replace** line 574:

```js
          readout("models", () => (creatureModels.size ? [...creatureModels.keys()].join(", ") : "none: shapes")),
```

with:

```js
          readout("models loaded", () => (creatureModels.size ? `${creatureModels.size} of ${Object.values(CREATURE_MODELS).filter(Boolean).length}` : "none: shapes")),
          slider("zombie height (m)", STATIC_MODELS.zombie, "height", 1, 3, 0.05),
```

In `js/main.js`, after line 584, add:

```js
          action("Doll (4)", () => spawnCreature("doll")),
          action("Floater (5)", () => spawnCreature("floater")),
          action("Horde (6)", () => spawnCreature("horde")),
```

Things to notice:

- **A ghost's look is decided when it is made**, from what has loaded by then. A ghost that comes before the models have arrived is made in code, which is why the first ghost of a session may be, and the later ones are a mixture.
- **A creature's voice** is the table's `voice` if it has one, so a doll ticks like a spider and a horde groans like a ghoul.
- **`zombie height`** in the panel is the table's number, so you can see what a taller zombie is like (new ones, not the ones already there).

## Step 5: Try it

Open the page with `?dev` and press the button. (The models load in the background: about ten megabytes. The panel says **models loaded: 8 of 8** when they have.)

- Press **1** for a ghoul: it is the **zombie**. It rocks as it comes, bobs, leans in as it lunges, stretches, and when it dies (the panel's **Hurt the nearest**) it topples backwards and fades.
- Press **4**: the **doll**: small, fast, with a tick. **5**: a **floater**: a head that hangs at the height of your face and lunges at you. **6**: the **horde**: large and slow.
- Press **3**: the **skeleton**, with a real rig. Watch it: a slow shamble while it waits, a walk as it comes, a run as it lunges, and a scream when it has struck. Hurt it until it dies: it stops, and topples.
- Press **2**: the spider is still shapes: a placeholder for a model that has not been found.
- **Marks make ghosts**: mark the floor a few times, and some of the ghosts are the ghost in the cloak and the pale figure, fading in and out like the others, and some are made in code. Set **how many are models** to 1, and to 0.
- Press **P**: the placeholders go, and the **models are still there**. They are not placeholders: they are the art.
- Put the **hunt** on (**H**) and set the intensity to 2.5: everything is sent, in a mixture.

On a **phone** the thing to look for is **speed**. About 100,000 triangles in the room is plenty for a phone (and a skeleton costs more than the others, because its points are moved by its bones on every frame). If it is slow, hide the placeholders (**P**), turn **the hunt** down, and tell me what the frame rate was and which phone it is.

## Step 6: Tests, all together

Open `tests.html`. You should see **301 passing tests**. The motion is tested as arithmetic, the fitting and the bodies against the real models, and the kinds against the table.

## Recap: what you built

| What | Where |
|------|-------|
| The table of models | `STATIC_MODELS` in `staticbody.js` |
| The motion of a model that does not move | `staticMotion` in `staticbody.js` |
| A model fitted to the room | `measureModel`, `FittedModel` in `staticbody.js` |
| Creatures and ghosts that are models | `StaticBody`, `GhostModelBody`, `ghostModelFor` in `staticbody.js` |
| A model with bones and clips | `ModelBody`, the skeleton's entry in `CREATURE_MODELS` in `creaturemesh.js` |
| A model for a kind, by number | `modelNameFor`, `makeCreatureBody` in `creaturemesh.js` |
| A doll, a floater, a horde | rows of `CREATURES` in `creatures.js`, `HUNT.kinds` in `director.js` |
| The tool that makes the models phone-sized | `assets/optimize-models.js` |

## Challenges

- **The spider.** The spider is the one kind with no model. When a rigged one arrives: what does its row in `CREATURE_MODELS` need, and what in `main.js` changes? (Count the lines.)
- **A death clip.** The skeleton topples when it dies because it has no death animation. Add a `die` clip to its entry and see what changes in `ModelBody`: what happens to the topple, and to the test of it?
- **Count the places.** How many places in the code name a *kind* of creature (`"doll"`, say)? Which of them could be a row of a table instead?
- **A better rock.** Walking is rocking. Make the zombie *drag* one foot: tip it a little more on one side of each step than the other. Where does that go: the table (`motion`), `staticMotion`, or both?
- **Level of detail.** The doll is 42,000 triangles and a horde is 26,000. Write `budgetFor(kind)` that says how many triangles a creature may have, from the number of them in the room, and a test that says that six dolls are too many. (What would you do with the answer?)
