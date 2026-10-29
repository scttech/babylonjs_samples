# Tutorial: Parkour Runner Runner -- An Animated Runner in Three Lanes

This is the second tutorial in the Parkour Runner series. The street from the last step is still empty; now someone runs down it. In this step you load an **animated character**, make it **run down the street by itself**, let the player **steer it between three lanes**, and make the camera **follow** it from behind. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **character loader** that brings in a model with its skeleton and its animation clips, and stops the loader's own autoplay so the game chooses what plays
- A **runner**: plain numbers for which lane it is in, how far along the street it is, and how fast it is going, with lane changes that **ease** instead of jumping
- A **clip player** that plays the standing clip or the sprinting clip, and **blends** between them
- A **follow camera** that stays behind and above the runner
- Controls: **←/→** (or **A/D**) to change lanes, **R** to start again
- Unit tests for all of it

**What you'll learn:** loading a skinned, animated `.glb` with `SceneLoader`, animation groups (the loader's name for a clip) and how to start, stop and blend them, easing that doesn't depend on frame rate, driving a character from plain game state, and a camera that follows a moving target.

## Where you're starting

This folder is a copy of the finished World sample, plus six empty placeholder files for the new code:

```
parkour_runner_runner/
├── index.html, tests.html
├── js/
│   ├── world.js, models.js, scout.js, splash.js, main.js   (from the World sample)
│   ├── runner.js                                            (placeholder -- Step 2)
│   ├── camera.js                                            (placeholder -- Step 3)
│   └── clips.js                                             (placeholder -- Step 4)
└── tests/
    ├── world / models / scout / splash .tests.js            (from the World sample)
    ├── runner.tests.js                                      (placeholder -- Step 2)
    ├── camera.tests.js                                      (placeholder -- Step 3)
    └── clips.tests.js                                       (placeholder -- Step 4)
```

### The runner

The character is in `../assets/character/runner.glb`. It is a plain mannequin (a figure with no face, hair or clothes) from the Quaternius Universal Animation Library, which you can recolor later. The file holds the model, its **skeleton** (65 bones that move the model's skin) and a **clip** for each movement. A clip is a recording of how every bone moves over time. This step uses two of the seventeen:

| Clip | What it looks like | Used when |
|---|---|---|
| `Idle_Loop` | Standing, breathing | The runner has stopped |
| `Sprint_Loop` | A fast run, 0.67 seconds for a full stride | The runner is running |

The others (`Jump_Start`, `Roll`, `Slide_Loop`, and so on) are for the next steps. See [the assets README](../assets/README.md) for the whole list.

### You need a web server for this one

As in the last step, the models can't be loaded from a page opened from a file. Run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/parkour_runner/parkour_runner_runner/` (the command prints the exact address), or use the *Live Server* extension in VS Code. (`tests.html` loads no models and works from a file.)

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the World sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works: you can still walk down the empty street with **W** and **S**. Open `tests.html` too and note how many tests pass (**57**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds a name to it. That way every file is valid JavaScript after every step.

---

## Step 1: Load the runner

A character is more than a model. It has a **skeleton**, and **clips** that move the skeleton. Babylon.js's glTF loader gives each clip back as an **animation group**: an object you can `start()`, `stop()` and ask for by name.

There's a catch: **the loader starts the first clip by itself,** as soon as the file is loaded. A game wants to decide what plays, so the loader function you write here stops every clip. It also switches on **blending** for each clip, which makes a clip fade in from whatever pose the character is in when it starts, instead of snapping to its first frame.

### 1a. `loadCharacter`

Open `js/models.js`. Add this below the `PieceLibrary` class and above the export block at the bottom:

```js
// How quickly one animation clip fades into the next when the character
// changes what it is doing. Bigger is quicker; 1 would be an instant cut.
const CLIP_BLEND_SPEED = 0.08;

// Loads an animated character from a .glb file. Returns the character wrapped
// in a node you can move and turn, and its animation clips by name.
//
// A character file holds the model, its skeleton, and a clip for each movement
// (the loader calls each clip an animation group). The loader starts the first
// clip by itself, so every clip is stopped here: the game decides what plays.
// Blending is switched on for each, so changing clips fades smoothly from the
// pose the character is in instead of snapping.
async function loadCharacter(scene, url, { name = "character" } = {}) {
  const slash = url.lastIndexOf("/") + 1;
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", url.slice(0, slash), url.slice(slash), scene);

  const clips = new Map();
  for (const group of result.animationGroups) {
    group.stop();
    group.enableBlending = true;
    group.blendingSpeed = CLIP_BLEND_SPEED;
    clips.set(group.name, group);
  }

  // The first mesh is the loader's root node; everything else hangs off it.
  const root = new BABYLON.TransformNode(name, scene);
  result.meshes[0].parent = root;
  return { root, clips };
}
```

and replace the export block with:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { centerOnGround, PieceLibrary, CLIP_BLEND_SPEED, loadCharacter };
} else {
  window.centerOnGround = centerOnGround;
  window.PieceLibrary = PieceLibrary;
  window.CLIP_BLEND_SPEED = CLIP_BLEND_SPEED;
  window.loadCharacter = loadCharacter;
}
```

Things to notice:

- **It returns two things:** `root`, a wrapper node you can move and turn, and `clips`, a `Map` from each clip's name to its animation group. Callers then write `clips.get("Idle_Loop")`.
- **The wrapper is the same idea as for the street pieces.** The loader's root node (`meshes[0]`) hangs from an empty `TransformNode`, so the game moves and turns *the wrapper* and never has to touch the loader's own mirrored root.
- **`group.stop()` for every clip** switches the loader's autoplay off. Without it, whichever clip happens to be first (for this file, a dying animation) would be playing when you load the page.
- **`blendingSpeed`** is how fast a clip fades in: the share of the way to its pose it covers each frame, from 0 to 1. `0.08` takes about a fifth of a second. A value of 1 would be an instant cut, and a tiny value a slow melt.

### 1b. Tests

The tests use a *fake* `BABYLON`, so they check the calls the code makes without loading a real file. Add them to the end of `tests/models.tests.js`:

```js
QUnit.module("loadCharacter", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeTransformNode {
    constructor(name, scene) {
      Object.assign(this, { name, scene });
    }
  }

  // A stand-in for an animation group: the loader starts the first one by itself.
  class FakeGroup {
    constructor(name) {
      this.name = name;
      this.playing = true;
      this.enableBlending = false;
      this.blendingSpeed = 0;
    }
    stop() {
      this.playing = false;
    }
  }

  let imported; // what the fake loader was asked for
  let root; // the fake root mesh the loader hands back
  let groups;

  hooks.beforeEach(() => {
    imported = null;
    root = { parent: null };
    groups = [new FakeGroup("Idle_Loop"), new FakeGroup("Sprint_Loop")];
    globalScope.BABYLON = {
      TransformNode: FakeTransformNode,
      SceneLoader: {
        ImportMeshAsync: async (names, rootUrl, filename, scene) => {
          imported = { names, rootUrl, filename, scene };
          return { meshes: [root, {}], animationGroups: groups };
        },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("splits the url into a folder and a file name for the loader", async (assert) => {
    await loadCharacter({}, "../assets/character/runner.glb");

    assert.strictEqual(imported.rootUrl, "../assets/character/");
    assert.strictEqual(imported.filename, "runner.glb");
  });

  QUnit.test("loads into the scene it is given", async (assert) => {
    const scene = { id: "the scene" };

    await loadCharacter(scene, "runner.glb");

    assert.strictEqual(imported.scene, scene);
  });

  QUnit.test("returns a node that wraps the loaded character", async (assert) => {
    const character = await loadCharacter({}, "runner.glb", { name: "runner" });

    assert.ok(character.root instanceof FakeTransformNode);
    assert.strictEqual(character.root.name, "runner");
    assert.strictEqual(root.parent, character.root, "the loaded root hangs from the wrapper");
  });

  QUnit.test("returns the clips by name", async (assert) => {
    const character = await loadCharacter({}, "runner.glb");

    assert.strictEqual(character.clips.size, 2);
    assert.strictEqual(character.clips.get("Idle_Loop"), groups[0]);
    assert.strictEqual(character.clips.get("Sprint_Loop"), groups[1]);
  });

  QUnit.test("stops every clip, because the loader starts one by itself", async (assert) => {
    await loadCharacter({}, "runner.glb");

    for (const group of groups) assert.false(group.playing, group.name);
  });

  QUnit.test("switches on blending for every clip, so changing clips fades", async (assert) => {
    await loadCharacter({}, "runner.glb");

    for (const group of groups) {
      assert.true(group.enableBlending, group.name);
      assert.strictEqual(group.blendingSpeed, CLIP_BLEND_SPEED, group.name);
    }
  });

  QUnit.test("a file with no clips gives an empty map", async (assert) => {
    groups = [];

    const character = await loadCharacter({}, "still.glb");

    assert.strictEqual(character.clips.size, 0);
  });

  QUnit.test("a failed load is passed on to the caller", async (assert) => {
    globalScope.BABYLON.SceneLoader.ImportMeshAsync = async () => {
      throw new Error("404 not found");
    };

    try {
      await loadCharacter({}, "missing.glb");
      assert.true(false, "should have thrown");
    } catch (error) {
      assert.strictEqual(error.message, "404 not found");
    }
  });
});
```

Reload `tests.html`: **8 more** tests (**65** in all), all green.

### 1c. Put the runner in the street

First the constants. In `js/main.js`, add these below `SCOUT_SPEED`:

```js
// The runner, who is made from the character file that holds its animation clips.
// The model comes out of the file already facing down the street (+z).
const RUNNER_FILE = "character/runner.glb";
const RUNNER_START_Z = 0;
```

Then, in `createScene`, after the loop that places the pieces and before the comment about the last road tile, add:

```js
  // The runner: loaded once, and standing at the start of the street.
  const character = await loadCharacter(scene, `${ASSETS}${RUNNER_FILE}`, { name: "runner" });
  character.root.position.set(0, 0, RUNNER_START_Z);
  character.clips.get("Idle_Loop").start(true);
```

Things to notice:

- **Which way does the model face?** It's worth checking, because artists differ, and so do file formats. This one comes out of its file already facing **down the street (+z)**, away from the camera, so it needs no turn. If a model ever comes out facing the camera, turning its wrapper by half a turn (`Math.PI` radians, about the vertical axis) fixes it, and that's the first thing to try if a character runs backwards.
- **`clips.get("Idle_Loop").start(true)`** starts the standing clip, **looping** (the `true`). This is a stand-in: Step 5 replaces it with something that chooses the clip for you.

Serve the page and open it. After the splash, you should see a **mannequin standing in the middle of the road**, a short way ahead, gently breathing. Walk toward it with **W**.

---

## Step 2: How the runner moves

What the runner *does* (which lane it is in, how far it has run) is plain arithmetic, so it goes in its own file that doesn't touch Babylon.js and is easy to test. `main.js` will move the character to wherever this says.

Open `js/runner.js` (it's a placeholder).

### 2a. Lanes and easing

```js
// The runner: which of three lanes it is in, how far along the street it is, and
// how fast it runs. Everything here is plain numbers (no Babylon.js), so the
// movement can be tested on its own; main.js moves the character to wherever
// this says. See ../tests/runner.tests.js.
//
// A lane is -1 (left), 0 (middle) or 1 (right), and x is the runner's sideways
// position in the street. The street runs along +z, as in world.js.

const LANE_WIDTH = 2.2; // world units between the middle of one lane and the next
const MAX_LANE = 1; // lanes go from -MAX_LANE to MAX_LANE
const LANE_CHANGE_RATE = 9; // how quickly the runner slides into a new lane; bigger is snappier
const RUN_SPEED = 8; // world units per second

// The sideways position of the middle of a lane.
function laneX(lane) {
  return lane * LANE_WIDTH;
}

// Moves `current` toward `target`: each second it closes a share of what's left
// that depends on `rate`. Unlike adding a fixed fraction every frame, the result
// after one second is the same at any frame rate, because 1 - e^(-rate * dt)
// depends on elapsed *time*. It never overshoots, and it slows as it arrives.
function approach(current, target, rate, dt) {
  return target + (current - target) * Math.exp(-rate * dt);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, laneX, approach };
} else {
  Object.assign(window, { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, laneX, approach });
}
```

Things to notice:

- **A lane is -1, 0 or 1** (left, middle, right), and `laneX` turns that into a sideways position. The three lanes are 2.2 units apart, which just fits the 7-unit road tile from the last step.
- **Easing.** When the player changes lanes, the runner shouldn't teleport. `approach` moves a value toward a target, a bit more slowly the nearer it gets: it covers a share of the remaining distance that depends on `rate`. The step to remember is `1 - e^(-rate × dt)`: a fixed fraction per *frame* would ease faster on a 144 Hz monitor than on a 60 Hz one, but a share that depends on elapsed *time* gives the same movement at any frame rate. Two half-steps land exactly where one whole step does. (The chase camera in the Asteroids series used this too.)
- **It never overshoots,** and it slows as it arrives, so a lane change starts quickly and settles gently.

Test these two. Put this in `tests/runner.tests.js`:

```js
const assertNear = (assert, actual, expected, tolerance, message) =>
  assert.true(Math.abs(actual - expected) <= tolerance, message || `expected ${actual} to be within ${tolerance} of ${expected}`);

QUnit.module("laneX", () => {
  QUnit.test("the middle lane is in the middle of the street", (assert) => {
    assert.strictEqual(laneX(0), 0);
  });

  QUnit.test("the lanes are one LANE_WIDTH apart, left negative and right positive", (assert) => {
    assert.strictEqual(laneX(-1), -LANE_WIDTH);
    assert.strictEqual(laneX(1), LANE_WIDTH);
  });
});

QUnit.module("approach", () => {
  QUnit.test("stays where it is when there is no time, or it has arrived", (assert) => {
    assert.strictEqual(approach(3, 10, 5, 0), 3);
    assert.strictEqual(approach(10, 10, 5, 1), 10);
  });

  QUnit.test("moves toward the target, from either side", (assert) => {
    assert.true(approach(0, 10, 5, 0.1) > 0);
    assert.true(approach(0, 10, 5, 0.1) < 10);
    assert.true(approach(20, 10, 5, 0.1) < 20);
    assert.true(approach(20, 10, 5, 0.1) > 10);
  });

  QUnit.test("never overshoots, however long the step", (assert) => {
    assert.true(approach(0, 10, 5, 100) <= 10);
    assert.true(approach(0, -10, 5, 100) >= -10);
  });

  QUnit.test("a bigger rate gets there faster", (assert) => {
    assert.true(approach(0, 10, 20, 0.1) > approach(0, 10, 5, 0.1));
  });

  QUnit.test("two half steps land where one whole step does, so frame rate doesn't matter", (assert) => {
    const half = approach(approach(0, 10, 7, 0.1), 10, 7, 0.1);
    const whole = approach(0, 10, 7, 0.2);

    assertNear(assert, half, whole, 1e-9);
  });

  QUnit.test("closes about 63% of the gap in 1 / rate seconds", (assert) => {
    assertNear(assert, approach(0, 10, 4, 0.25), 10 * (1 - Math.exp(-1)), 1e-9);
  });
});
```

Add the script and its tests to `tests.html`, next to the others:

```html
  <script src="js/runner.js"></script>
```
```html
  <script src="tests/runner.tests.js"></script>
```

Reload `tests.html`: **8 more** tests (**73** in all).

### 2b. The runner, closed

Add the class below `approach`. It's complete and closed, with just a constructor:

```js
class Runner {
  constructor({ lane = 0, z = 0, speed = RUN_SPEED, laneRate = LANE_CHANGE_RATE, endZ = Infinity } = {}) {
    this.startLane = lane; // where reset() puts it back
    this.startZ = z;
    this.lane = lane; // the lane it is heading for
    this.x = laneX(lane); // where it is across the street; eases toward its lane
    this.vx = 0; // how fast it is sliding sideways, in units per second
    this.z = z; // how far along the street it is
    this.speed = speed;
    this.laneRate = laneRate;
    this.endZ = endZ; // it stops here
    this.running = true;
  }
}
```

and replace the export block:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, laneX, approach, Runner };
} else {
  Object.assign(window, { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, laneX, approach, Runner });
}
```

Things to notice:

- **`lane` and `x` are different things.** `lane` is the lane the runner is *heading for*, and changes at once when the player presses a key. `x` is where the runner actually *is*, and eases toward the lane over the next few frames.
- **`vx`** is how fast it is sliding sideways. It's what makes the runner lean into a lane change below.
- **`startLane` and `startZ`** remember where to go back to when the game restarts.
- **`endZ`** is where the street stops. It defaults to `Infinity` (never). The next tutorial makes the street endless; for now the runner stops at the end of the pieces you built.

The next methods go **inside the class**, below the constructor and above its closing `}`.

### 2c. Choosing a lane, and leaning

```js
  // Heads for the lane next door: direction -1 is left and 1 is right. There is
  // no lane past the edge of the street, so asking for one does nothing.
  moveLane(direction) {
    this.lane = Math.max(-MAX_LANE, Math.min(MAX_LANE, this.lane + direction));
  }

  // How far the runner is turned toward where it is sliding, in radians: 0 when
  // running straight, and leaning into the move while it changes lanes. It is
  // the angle between "forward" and where the runner is actually going.
  get heading() {
    return Math.atan2(this.vx, this.speed);
  }
```

Things to notice:

- **`moveLane` clamps** with `Math.max(-MAX_LANE, Math.min(MAX_LANE, ...))`, so asking for a lane past the edge of the street does nothing.
- **`heading` is a *getter*:** a property computed each time you read it (`runner.heading`, with no parentheses). It's the angle between "straight ahead" and the direction the runner is really moving: forward at `speed`, sideways at `vx`. `Math.atan2(vx, speed)` gives exactly that angle: 0 when running straight, and a small lean toward the side the runner is sliding to while it changes lanes. It never reaches a quarter turn, because `speed` is never 0.

### 2d. Moving

```js
  // Moves for dt seconds: slides toward the chosen lane and, while running,
  // forward. The runner stops at the end of the street.
  update(dt) {
    const before = this.x;
    this.x = approach(this.x, laneX(this.lane), this.laneRate, dt);
    this.vx = dt > 0 ? (this.x - before) / dt : 0;

    if (!this.running) return;
    this.z = Math.min(this.endZ, this.z + this.speed * dt);
    if (this.z >= this.endZ) this.running = false;
  }

  // Back to the start: the starting lane and place, running again.
  reset() {
    this.lane = this.startLane;
    this.x = laneX(this.startLane);
    this.vx = 0;
    this.z = this.startZ;
    this.running = true;
  }
```

Things to notice:

- **`vx` comes from how far `x` moved this frame,** divided by `dt`. It's the *speed* the runner slid at, so it can be used for the lean.
- **Forward and sideways are separate.** Changing lanes doesn't slow the runner down, and a runner that has stopped can still change lanes.
- **`Math.min(this.endZ, ...)`** stops the runner exactly at the end, never past it, and `running` becomes false. The clip player will use that to stand it still.

Now the tests for the class. Add them to the end of `tests/runner.tests.js`:

```js
QUnit.module("Runner", () => {
  QUnit.test("starts in the middle lane at the start of the street, running", (assert) => {
    const runner = new Runner();

    assert.strictEqual(runner.lane, 0);
    assert.strictEqual(runner.x, 0);
    assert.strictEqual(runner.z, 0);
    assert.true(runner.running);
  });

  QUnit.test("can start in another lane or further along", (assert) => {
    const runner = new Runner({ lane: -1, z: 50 });

    assert.strictEqual(runner.x, -LANE_WIDTH);
    assert.strictEqual(runner.z, 50);
  });

  QUnit.test("moveLane(1) heads for the lane on the right, and moveLane(-1) for the left", (assert) => {
    const runner = new Runner();

    runner.moveLane(1);
    assert.strictEqual(runner.lane, 1);

    runner.moveLane(-1);
    runner.moveLane(-1);
    assert.strictEqual(runner.lane, -1);
  });

  QUnit.test("there is no lane past the edge of the street", (assert) => {
    const runner = new Runner({ lane: 1 });

    runner.moveLane(1);

    assert.strictEqual(runner.lane, 1);

    const other = new Runner({ lane: -1 });
    other.moveLane(-1);
    assert.strictEqual(other.lane, -1);
  });

  QUnit.test("moveLane() doesn't move the runner by itself, it only chooses the lane", (assert) => {
    const runner = new Runner();

    runner.moveLane(1);

    assert.strictEqual(runner.x, 0);
  });

  QUnit.test("update() slides toward the chosen lane without jumping there", (assert) => {
    const runner = new Runner();
    runner.moveLane(1);

    runner.update(0.05);

    assert.true(runner.x > 0, "it has started to move");
    assert.true(runner.x < LANE_WIDTH, "but hasn't arrived");
  });

  QUnit.test("update() gets to the lane in the end, and stays there", (assert) => {
    const runner = new Runner();
    runner.moveLane(-1);

    for (let i = 0; i < 120; i++) runner.update(1 / 60);

    assertNear(assert, runner.x, -LANE_WIDTH, 1e-3);
  });

  QUnit.test("sliding takes the same time at any frame rate", (assert) => {
    const slow = new Runner();
    const fast = new Runner();
    slow.moveLane(1);
    fast.moveLane(1);

    for (let i = 0; i < 10; i++) slow.update(0.05);
    for (let i = 0; i < 50; i++) fast.update(0.01);

    assertNear(assert, slow.x, fast.x, 1e-9);
  });

  QUnit.test("update() runs forward at the run speed", (assert) => {
    const runner = new Runner({ speed: 10 });

    runner.update(0.5);

    assert.strictEqual(runner.z, 5);
  });

  QUnit.test("changing lanes doesn't slow the runner down", (assert) => {
    const runner = new Runner({ speed: 10 });
    runner.moveLane(1);

    runner.update(0.5);

    assert.strictEqual(runner.z, 5);
  });

  QUnit.test("stops at the end of the street", (assert) => {
    const runner = new Runner({ speed: 10, endZ: 20 });

    runner.update(1);
    assert.true(runner.running, "still going at z = 10");

    runner.update(5);
    assert.strictEqual(runner.z, 20);
    assert.false(runner.running);
  });

  QUnit.test("a runner that has stopped stays where it is, but can still change lanes", (assert) => {
    const runner = new Runner({ speed: 10, endZ: 20 });
    runner.update(5);
    runner.moveLane(1);

    runner.update(0.5);

    assert.strictEqual(runner.z, 20);
    assert.true(runner.x > 0);
  });

  QUnit.test("heading is zero when running straight", (assert) => {
    const runner = new Runner();

    runner.update(0.1);

    assert.strictEqual(runner.heading, 0);
  });

  QUnit.test("heading turns toward the side the runner is sliding to", (assert) => {
    const right = new Runner();
    right.moveLane(1);
    right.update(0.05);
    const left = new Runner();
    left.moveLane(-1);
    left.update(0.05);

    assert.true(right.heading > 0, "right is positive");
    assert.true(left.heading < 0, "left is negative");
    assertNear(assert, right.heading, -left.heading, 1e-9, "the same amount either way");
  });

  QUnit.test("heading is a lean, never a full turn sideways", (assert) => {
    const runner = new Runner();
    runner.moveLane(1);

    runner.update(0.02);

    assert.true(runner.heading < Math.PI / 2);
  });

  QUnit.test("heading goes back to zero once the runner has settled into its lane", (assert) => {
    const runner = new Runner();
    runner.moveLane(1);

    for (let i = 0; i < 300; i++) runner.update(1 / 60);

    assertNear(assert, runner.heading, 0, 1e-3);
  });

  QUnit.test("reset() goes back to the start, in the starting lane, running again", (assert) => {
    const runner = new Runner({ lane: 0, z: 5, speed: 10, endZ: 20 });
    runner.moveLane(1);
    runner.update(5);

    runner.reset();

    assert.strictEqual(runner.lane, 0);
    assert.strictEqual(runner.x, 0);
    assert.strictEqual(runner.vx, 0);
    assert.strictEqual(runner.z, 5);
    assert.true(runner.running);
  });
});
```

Reload `tests.html`: **17 more** tests (**90** in all).

---

## Step 3: A camera that follows

The camera should stay behind and above the runner, looking down the street. The position it should be at is plain arithmetic, so it gets its own small file. Put this in `js/camera.js`:

```js
// Where the camera goes to follow the runner: behind it and a little above,
// looking down the street. Plain numbers (no Babylon.js), so it is easy to
// test; main.js moves the camera there each frame. See ../tests/camera.tests.js.

const CAMERA_DISTANCE = 6.5; // how far behind the runner the camera is
const CAMERA_HEIGHT = 2.8; // how high above the ground
const CAMERA_FOLLOW_X = 0.6; // how much of the runner's sideways move the camera copies

// The camera's position for a runner at (x, z) in the street. The camera copies
// only part of the runner's sideways movement, so changing lanes moves the
// runner across the picture instead of dragging the whole street along with it.
function followPosition(runner, { distance = CAMERA_DISTANCE, height = CAMERA_HEIGHT, followX = CAMERA_FOLLOW_X } = {}) {
  return { x: runner.x * followX, y: height, z: runner.z - distance };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_FOLLOW_X, followPosition };
} else {
  Object.assign(window, { CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_FOLLOW_X, followPosition });
}
```

Things to notice:

- **It copies only part of the sideways movement** (`followX`, 0.6). A camera that copies the runner exactly makes the runner appear stuck in the middle of the screen while the whole street slides sideways. With a part of it, the runner visibly moves across the picture when it changes lanes, but the camera drifts the same way, so the runner never goes off the edge.
- **Distance, height and follow are all options with defaults,** so a test can pass its own numbers, and the game uses the defaults.
- **No `dt` and no easing here.** The *runner's* `x` already eases, and the camera's position is a fixed function of it, so the camera is smooth without any extra work.

Put the tests in `tests/camera.tests.js`:

```js
QUnit.module("followPosition", () => {
  QUnit.test("is behind the runner by the camera distance, so it looks down the street at it", (assert) => {
    const view = followPosition({ x: 0, z: 50 }, { distance: 6, height: 3 });

    assert.strictEqual(view.z, 44);
  });

  QUnit.test("is above the ground by the camera height", (assert) => {
    const view = followPosition({ x: 0, z: 0 }, { distance: 6, height: 3 });

    assert.strictEqual(view.y, 3);
  });

  QUnit.test("follows the runner along the street", (assert) => {
    const near = followPosition({ x: 0, z: 10 });
    const far = followPosition({ x: 0, z: 110 });

    assert.strictEqual(far.z - near.z, 100);
  });

  QUnit.test("copies only part of the runner's sideways position", (assert) => {
    const view = followPosition({ x: 2, z: 0 }, { followX: 0.5 });

    assert.strictEqual(view.x, 1);
  });

  QUnit.test("with a follow of 0 the camera stays in the middle, and with 1 it goes where the runner goes", (assert) => {
    assert.strictEqual(followPosition({ x: 3, z: 0 }, { followX: 0 }).x, 0);
    assert.strictEqual(followPosition({ x: 3, z: 0 }, { followX: 1 }).x, 3);
  });

  QUnit.test("goes the same way as the runner, left or right", (assert) => {
    assert.true(followPosition({ x: -2, z: 0 }).x < 0);
    assert.true(followPosition({ x: 2, z: 0 }).x > 0);
  });

  QUnit.test("uses the standard distance, height and follow when none are given", (assert) => {
    const view = followPosition({ x: 1, z: 20 });

    assert.strictEqual(view.x, CAMERA_FOLLOW_X);
    assert.strictEqual(view.y, CAMERA_HEIGHT);
    assert.strictEqual(view.z, 20 - CAMERA_DISTANCE);
  });
});
```

Add the script and its tests to `tests.html`:

```html
  <script src="js/camera.js"></script>
```
```html
  <script src="tests/camera.tests.js"></script>
```

Reload `tests.html`: **7 more** tests (**97** in all).

---

## Step 4: Choosing the clip

The runner stands when it has stopped and sprints while it is running. Choosing the clip is a decision, and *playing* it is a call to the animation group, so they're separated: `clipFor` makes the decision from plain state, and a small `ClipPlayer` does the playing. The player only needs objects with `start()` and `stop()`, so it can be tested with stand-ins.

### 4a. Which clip

Put this in `js/clips.js`:

```js
// The runner's animation clips: which one plays now, and the choice of clip for
// what the runner is doing. The character file holds one named clip per
// movement ("Idle_Loop", "Sprint_Loop", ...), and this plays one at a time. It
// only needs objects that can start() and stop(), so it is easy to test; main.js
// gives it the real animation groups. See ../tests/clips.tests.js.

// The clips this sample uses, by what the runner is doing.
const CLIPS = {
  idle: "Idle_Loop",
  run: "Sprint_Loop",
};

// The clip for a runner: sprinting while it is running, standing otherwise.
function clipFor(runner) {
  return runner.running ? CLIPS.run : CLIPS.idle;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLIPS, clipFor };
} else {
  Object.assign(window, { CLIPS, clipFor });
}
```

The names are the ones inside the character file, which is why `CLIPS` is a table: when a later step gives the runner a jump or a slide, you add a name and a rule here.

### 4b. The player, closed

Add the class below `clipFor`. It's complete and closed, with just a constructor:

```js
class ClipPlayer {
  // `clips` is a Map from a clip's name to its animation group.
  constructor(clips) {
    this.clips = clips;
    this.current = null; // the name of the clip playing now, if any
  }
}
```

and replace the export block:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLIPS, clipFor, ClipPlayer };
} else {
  Object.assign(window, { CLIPS, clipFor, ClipPlayer });
}
```

### 4c. Playing

Add these two methods **inside the class**, below the constructor and above its closing `}`:

```js
  // Plays the named clip, looping, and stops whichever was playing. Asking for
  // the clip that is already playing does nothing, so it is safe to call every
  // frame.
  play(name) {
    if (name === this.current) return;
    const next = this.clips.get(name);
    if (!next) throw new Error(`The character has no clip called "${name}"`);

    if (this.current) this.clips.get(this.current).stop();
    next.start(true);
    this.current = name;
  }

  // Stops whichever clip is playing.
  stop() {
    if (this.current) this.clips.get(this.current).stop();
    this.current = null;
  }
```

Things to notice:

- **`play` ignores a request for the clip that is already playing.** That's what makes it safe to call every frame: `clips.play(clipFor(runner))` just works, and the clip isn't restarted 60 times a second.
- **It checks the clip exists before it touches anything.** Asking for a name the character doesn't have throws a clear error *and leaves the current clip playing*.
- **`start(true)` loops.** Stopping the old clip and starting the new one, with blending switched on in `loadCharacter`, is what fades between them.

Put the tests in `tests/clips.tests.js`:

```js
QUnit.module("clipFor", () => {
  QUnit.test("a runner that is running sprints", (assert) => {
    assert.strictEqual(clipFor({ running: true }), CLIPS.run);
  });

  QUnit.test("a runner that has stopped stands", (assert) => {
    assert.strictEqual(clipFor({ running: false }), CLIPS.idle);
  });

  QUnit.test("the clips are the names the character file uses", (assert) => {
    assert.strictEqual(CLIPS.idle, "Idle_Loop");
    assert.strictEqual(CLIPS.run, "Sprint_Loop");
  });
});

QUnit.module("ClipPlayer", () => {
  // A stand-in for an animation group: it only remembers what it was told.
  class FakeClip {
    constructor() {
      this.playing = false;
      this.looping = null;
      this.starts = 0;
      this.stops = 0;
    }
    start(loop) {
      this.playing = true;
      this.looping = loop;
      this.starts++;
    }
    stop() {
      this.playing = false;
      this.stops++;
    }
  }

  const makePlayer = () => {
    const clips = new Map([
      ["Idle_Loop", new FakeClip()],
      ["Sprint_Loop", new FakeClip()],
    ]);
    return { clips, player: new ClipPlayer(clips) };
  };

  QUnit.test("nothing is playing to begin with", (assert) => {
    const { clips, player } = makePlayer();

    assert.strictEqual(player.current, null);
    assert.false(clips.get("Idle_Loop").playing);
  });

  QUnit.test("play() starts the named clip, looping", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Idle_Loop");

    assert.true(clips.get("Idle_Loop").playing);
    assert.true(clips.get("Idle_Loop").looping);
    assert.strictEqual(player.current, "Idle_Loop");
  });

  QUnit.test("play() stops the clip that was playing", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Idle_Loop");

    player.play("Sprint_Loop");

    assert.false(clips.get("Idle_Loop").playing);
    assert.true(clips.get("Sprint_Loop").playing);
    assert.strictEqual(player.current, "Sprint_Loop");
  });

  QUnit.test("asking for the clip that is already playing does nothing", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop");

    player.play("Sprint_Loop");
    player.play("Sprint_Loop");

    assert.strictEqual(clips.get("Sprint_Loop").starts, 1, "started once, not restarted every frame");
    assert.strictEqual(clips.get("Sprint_Loop").stops, 0);
  });

  QUnit.test("can switch back and forth", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Idle_Loop");
    player.play("Sprint_Loop");
    player.play("Idle_Loop");

    assert.true(clips.get("Idle_Loop").playing);
    assert.false(clips.get("Sprint_Loop").playing);
    assert.strictEqual(clips.get("Idle_Loop").starts, 2);
  });

  QUnit.test("play() refuses a clip the character doesn't have, and leaves the current one alone", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Idle_Loop");

    assert.throws(() => player.play("Backflip"), /no clip called "Backflip"/);

    assert.true(clips.get("Idle_Loop").playing);
    assert.strictEqual(player.current, "Idle_Loop");
  });

  QUnit.test("stop() stops whatever is playing, and the next play() starts it again", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop");

    player.stop();

    assert.false(clips.get("Sprint_Loop").playing);
    assert.strictEqual(player.current, null);

    player.play("Sprint_Loop");
    assert.true(clips.get("Sprint_Loop").playing);
  });

  QUnit.test("stop() with nothing playing is harmless", (assert) => {
    const { player } = makePlayer();

    player.stop();

    assert.strictEqual(player.current, null);
  });
});
```

Add the script and its tests to `tests.html`:

```html
  <script src="js/clips.js"></script>
```
```html
  <script src="tests/clips.tests.js"></script>
```

Reload `tests.html`: **11 more** tests (**108** in all).

---

## Step 5: Wire it together

Everything is built. Now `main.js` has to use it, and the scout from the last step goes, because the camera follows the runner now.

### 5a. Retire the scout

Delete `js/scout.js` and `tests/scout.tests.js`, and take their lines out of `tests.html`:

```html
  <script src="js/scout.js"></script>
```
```html
  <script src="tests/scout.tests.js"></script>
```

That takes away its 7 tests, so `tests.html` now shows **101**.

### 5b. `index.html`

Replace the `scout.js` script tag with the three new ones. They go after `models.js`, before `splash.js`:

```html
  <script src="js/runner.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
```

and replace the `.hint` line (don't delete it) with one that mentions the new keys:

```html
  <div class="hint">&larr;/&rarr; (A/D) to change lanes &middot; R to restart &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

### 5c. `js/main.js`

Make these changes.

**1. Constants.** Replace everything from the comment `// The camera looks down the street` down to and including `const RUNNER_START_Z = 0;` with:

```js
// The camera follows the runner, a little above and behind, looking down the street.
const CAMERA_PITCH = 0.12; // radians of tilt down
const CAMERA_FOV = 0.9;

// The runner, who is made from the character file that holds its animation clips.
// The model comes out of the file already facing down the street (+z).
const RUNNER_FILE = "character/runner.glb";
const RUNNER_START_Z = 0;
const STREET_END_MARGIN = 30; // the runner stops this far short of the last road tile
```

(`CAMERA_HEIGHT` is gone because it lives in `camera.js` now, along with the distance behind the runner. `SCOUT_SPEED` and `CAMERA_START_Z` are gone with the scout.)

**2. The camera's first position.** In `createScene`, find the line that creates the camera:

```js
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, CAMERA_HEIGHT, CAMERA_START_Z), scene);
```

and change `CAMERA_START_Z` to `RUNNER_START_Z - CAMERA_DISTANCE`:

```js
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, CAMERA_HEIGHT, RUNNER_START_Z - CAMERA_DISTANCE), scene);
```

**3. The runner.** In `createScene`, the scout is the code from the comment `// The last road tile is centered on` down to, but not including, `return { scene };`: the scout itself, the key handling, and the frame loop. **Delete all of it**, and put this in its place, directly after the loop that places the pieces:

(If you put the stand-in runner in the street in Step 1c, its four lines, from `// The runner: loaded once, and standing at the start of the street.` through `character.clips.get("Idle_Loop").start(true);`, go too. The new code below loads the runner properly, so keep only one copy.)

```js
  // The runner: loaded once, and standing at the start of the street.
  const character = await loadCharacter(scene, `${ASSETS}${RUNNER_FILE}`, { name: "runner" });
  const clips = new ClipPlayer(character.clips);

  // The last road tile is centered on firstZ + (STREET_ROWS - 1) * TILE; the
  // runner stops short of the far end so the street never runs out in view.
  const lastRoadZ = -TILE + (STREET_ROWS - 1) * TILE;
  const runner = new Runner({ z: RUNNER_START_Z, endZ: lastRoadZ - STREET_END_MARGIN });

  const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
  const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") {
      runner.reset();
      return;
    }
    const isLane = LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code);
    if (!isLane) return;
    event.preventDefault(); // arrow keys otherwise scroll the page
    if (event.repeat) return; // one lane per press; holding the key doesn't skate across
    runner.moveLane(LEFT_KEYS.has(event.code) ? -1 : 1);
  });

  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't throw the runner down the street.
    const dt = started ? Math.min(engine.getDeltaTime() / 1000, 0.05) : 0;
    runner.update(dt);

    // Put the character where the runner is, turned a little into a lane change.
    character.root.position.set(runner.x, 0, runner.z);
    character.root.rotation.y = runner.heading;
    clips.play(clipFor(runner));

    // And the camera behind it.
    const view = followPosition(runner);
    camera.position.set(view.x, view.y, view.z);
  });
```

Things to notice:

- **Plan, then play.** The frame loop does the same three things every frame: **update the numbers** (`runner.update(dt)`), **put the picture where the numbers say** (the character's position and heading, the clip, the camera), and nothing else. The game logic never touches Babylon.js, and the Babylon.js code never decides anything.
- **`runner.heading` turns the character into a lane change.** The wrapper's turn about the vertical axis is exactly the heading: 0 while running straight, a small lean into the move while changing lanes.
- **`clips.play(clipFor(runner))`** is the whole animation system. When `runner.running` turns false at the end of the street, the clip switches to `Idle_Loop` by itself.
- **One lane per key press.** `event.repeat` is true for the repeated events you get when a key is held down; ignoring them means holding the key doesn't skate across the street.
- **`dt` is clamped** to 0.05 seconds so a backgrounded tab doesn't throw the runner down the street when you come back.
- **The runner stops short of the last road tile** (`STREET_END_MARGIN`) so the end of the street is never in view.

---

## Step 6: Try it

Serve the page and open it.

- [ ] The **controls hint** shows **←/→** and **R**
- [ ] After the splash, the runner is **running away from you down the street**, in the middle lane, with the camera behind and above
- [ ] The run looks like a run: arms and legs swinging, not sliding
- [ ] **←** (or **A**) moves one lane left, **→** (or **D**) one lane right; the runner **slides** there and **leans into the move**
- [ ] The runner can't leave the street: pressing → in the right lane does nothing
- [ ] **Holding** a key moves only one lane
- [ ] The **camera follows** sideways a little, so the runner moves across the picture but never leaves it
- [ ] At the end of the street the runner **stops and stands**, breathing
- [ ] **R** puts the runner back at the start, running again
- [ ] **C** saves a screenshot
- [ ] Reloading shows the same street, and the splash still stays for three seconds

**If something's wrong**

- **`Runner is not defined`, `ClipPlayer is not defined`, `followPosition is not defined` or `loadCharacter is not defined`:** a script tag is missing from **`index.html`**, or `main.js` isn't last.
- **The runner isn't there:** open the console (F12). A red error about a `.glb` means the file wasn't found: check you're using a server and that `assets/character/runner.glb` exists.
- **The runner runs toward you, or backwards:** something is turning the wrapper by half a turn. `character.root.rotation.y` should be just `runner.heading`.
- **The runner is stuck in a T-shape, or doesn't move its limbs:** no clip is playing. Check `clips.play(clipFor(runner))` is in the frame loop, and that the clip names in `CLIPS` match the file's (`Idle_Loop`, `Sprint_Loop`).
- **The runner stays standing and slides down the street:** the clip is `Idle_Loop` while `runner.running` is true. Check `clipFor`.
- **The runner jumps to the next lane instead of sliding:** `runner.update(dt)` isn't called every frame, or `LANE_CHANGE_RATE` is huge.
- **The runner never comes to a stop at the end:** `endZ` isn't being passed to the `Runner`.
- **The camera doesn't follow:** the `camera.position.set(...)` line is missing from the frame loop.
- **Pressing a key moves two lanes:** the `event.repeat` check is missing.

**Experiments** (change one, reload, then change it back):

- `RUN_SPEED` of `14`: faster, and now the feet slide, because the animation plays at one speed whatever the runner's speed is. (A later step ties them together.)
- `LANE_CHANGE_RATE` of `4` for a lazy lane change, or `30` for an almost instant one
- `CAMERA_FOLLOW_X` of `0` (the camera never moves sideways) or `1` (it copies the runner exactly)
- `CAMERA_DISTANCE` of `4` and `CAMERA_HEIGHT` of `1.8` for a closer, lower camera
- `CLIPS.run` of `"Jog_Fwd_Loop"`: a relaxed jog instead of a sprint
- `CLIP_BLEND_SPEED` of `0.02` for a slow, dreamy change between clips, or `1` for none
- `character.root.rotation.y = Math.PI + runner.heading` in the frame loop: the runner turns to face you, and runs backwards

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/world.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/runner.tests.js"></script>
  <script src="tests/clips.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **101 passing tests**: the 50 that the World sample still has (26 for the street plan, 19 for the piece library, 5 for the splash timing), plus 8 for the character loader, 25 for the runner, 7 for the camera, and 11 for the clip player.

> **What these tests don't cover.** They check the logic and the calls the code makes, using stand-ins for Babylon.js. They can't tell you a run *looks* like a run, or that the runner faces the right way. That check is Step 6, with your own eyes. It's a good example of why a test suite and a play-through are different things.

> **Try breaking something.** In `Runner.update`, change `this.vx = dt > 0 ? (this.x - before) / dt : 0;` to `this.vx = 0;`, reload `tests.html`, and see which test notices. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Loading a skinned, animated model, and taking over its animation | `loadCharacter` |
| Clips as animation groups, with blending | `CLIP_BLEND_SPEED`, `ClipPlayer` |
| Frame-rate independent easing | `approach` |
| Game state as plain numbers | `Runner` |
| A lean computed from sideways speed | `Runner.heading` |
| A camera positioned from the runner's position | `followPosition` |
| Deciding an animation from state | `clipFor` |
| The frame loop: update the numbers, then move the picture | `scene.onBeforeRenderObservable` |

## Challenges

1. **Speed up.** Make the runner run a little faster every second, up to a limit. (Hint: add `speed += acceleration * dt` to `Runner.update`, capped with `Math.min`. Then try setting the clip's playback speed to match: `group.speedRatio`.)
2. **A turn animation.** Play a different clip while the runner changes lanes. (Hint: `Runner` doesn't know when it is changing lanes, but `Math.abs(runner.x - laneX(runner.lane))` does.)
3. **Swipe controls.** Change lanes by swiping on a touch screen. (Hint: listen for `pointerdown` and `pointerup` on the canvas, and compare the two x positions.)
4. **A different runner color.** Give the mannequin a hoodie color. (Hint: its material is shared, so change `material.albedoColor` on the loaded meshes, or clone the material first.)
5. **Dust.** Puff a small particle burst from the runner's feet each stride. (Hint: reuse what you learned about `ParticleSystem` in the Asteroids series.)

---
