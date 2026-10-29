# Tutorial: Parkour Runner Obstacles -- Things in the Way

This is the fifth tutorial in the Parkour Runner series. The runner can run, jump, slide and roll, but nothing is in his way yet. In this step the street fights back: **barriers** to jump or vault, **overhead bars** to slide under, and **containers** that only a lane change gets around. Hit one and the run is over. You write the code; this document tells you what to write and why.

By the end you'll have:

- Three **kinds of obstacle**, each beaten by a different move, in groups that always have a way through
- A **collision test** that uses the runner's height, so a slide goes under a bar and a jump goes over a barrier
- A **vault**: a quick, low hop that is **forgiving**, which is why you'd choose it over a jump
- A **crash**: the runner falls over and stops, with a message, until you restart
- Obstacles made ahead of the runner and recycled from behind, from the same pool as the street
- Unit tests for all of it

**What you'll learn:** box collisions on three axes, designing moves and obstacles so each needs a different answer, context-sensitive controls (one key, a different move by situation), generating a repeatable course of challenges, scaling pieces unevenly to make new shapes from old models, and why a pool must reset a piece completely before it reuses it.

## Where you're starting

This folder is a copy of the finished Moves sample, plus one empty placeholder file for the new code and its tests:

```
parkour_runner_obstacles/
├── index.html, tests.html
├── js/
│   ├── obstacles.js        (placeholder -- Steps 2 and 3)
│   ├── runner.js           (grows -- Step 1)
│   ├── clips.js            (grows -- Step 4)
│   ├── models.js           (changes -- Step 5)
│   ├── main.js             (changes -- Step 6)
│   └── world.js, camera.js, stream.js, pool.js, splash.js   (from the Moves sample)
└── tests/
    ├── obstacles.tests.js  (placeholder -- Steps 2 and 3)
    └── runner / clips / models .tests.js grow, and the rest    (from the Moves sample)
```

### The obstacles

Three kinds, all made from models that are already in `assets/`, reshaped:

| Kind | Made from | Beaten by |
|---|---|---|
| **Barrier**, 0.9 high | The construction barrier, turned across the lane and stretched | A **jump** or a **vault** |
| **Overhead bar**, from 1.0 to 1.5 high | The awning from the commercial kit, made narrower and lower | A **slide** (or a roll) |
| **Container**, 2.45 high and 5.7 long | A shipping container, as it is | A **lane change** |

### You need a web server for this one

As before, the models can't be loaded from a page opened from a file. Run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/parkour_runner/parkour_runner_obstacles/` (the command prints the exact address), or use the *Live Server* extension in VS Code. (`tests.html` loads no models and works from a file.)

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Moves sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**166**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: Vaulting and crashing

Two new things the runner can do. Both are plain state, so they go in `js/runner.js`. Open it.

### 1a. Constants

Replace the `MOVES` line with:

```js
const MOVES = { run: "run", jump: "jump", vault: "vault", slide: "slide", roll: "roll", crash: "crash" };
```

Add a vault speed below `DIVE_SPEED`:

```js
const VAULT_SPEED = 8.5; // a vault is a lower, quicker hop than a jump: about 1.1 units high and 0.5 seconds
```

and two heights below `LOW_HEIGHT`:

```js
const VAULT_HEIGHT = 1.1; // tucked up over an obstacle
const CRASHED_HEIGHT = 0.5; // lying on the ground
```

### 1b. Vaulting and crashing

Add these two methods **inside the class**, directly above `slide`:

```js
  // Vaults, if it is running: a quick, low hop over something at knee height. It
  // is a jump with its own, lower, speed, so it takes less time and doesn't dive.
  vault() {
    if (this.move !== MOVES.run) return;
    this.vy = VAULT_SPEED;
    this._begin(MOVES.vault);
  }

  // Hits something and falls over. He stops running, and nothing but reset() gets
  // him going again.
  crash() {
    this.running = false;
    this.y = 0;
    this.vy = 0;
    this.diving = false;
    this._begin(MOVES.crash);
  }
```

Things to notice:

- **A vault is a jump with its own numbers.** It is lower (1.1 units against 1.5) and quicker (half a second against 0.6), and it only starts from running, so there's no vaulting out of a slide and no diving out of a vault.
- **A crash is a move too.** `crash` stops the runner, puts him flat on the ground, and starts the `crash` move. Nothing but `reset()` gets him going again, because every other move checks that the runner is running or sliding first.

### 1c. Moving in new ways

Change the `if` in `update` that handles being in the air so that a vault counts too:

```js
    if (this.move === MOVES.jump || this.move === MOVES.vault) {
```

A crashed runner shouldn't change lanes. At the top of `moveLane`, add a line:

```js
    if (this.move === MOVES.crash) return;
```

Replace the `bodyHeight` getter, and add `crashed`, with:

```js
  // How tall the runner is right now, for hitting things: low while sliding or
  // rolling, tucked up while vaulting, flat when crashed, and standing the rest of
  // the time.
  get bodyHeight() {
    switch (this.move) {
      case MOVES.slide:
      case MOVES.roll:
        return LOW_HEIGHT;
      case MOVES.vault:
        return VAULT_HEIGHT;
      case MOVES.crash:
        return CRASHED_HEIGHT;
      default:
        return STANDING_HEIGHT;
    }
  }

  // Whether the runner has hit something and fallen over.
  get crashed() {
    return this.move === MOVES.crash;
  }
```

Things to notice:

- **`bodyHeight` is now a `switch`** with a case for each move that changes it: low for a slide or roll, tucked up for a vault, flat for a crash, and standing for the rest. Obstacles will ask for it.
- **`crashed` is a getter** so the game can ask `runner.crashed` instead of comparing the move itself.

Update the export block at the bottom to add the new names:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, MOVES, GRAVITY, JUMP_SPEED, DIVE_SPEED, VAULT_SPEED, SLIDE_TIME, ROLL_TIME, STANDING_HEIGHT, LOW_HEIGHT, VAULT_HEIGHT, CRASHED_HEIGHT, laneX, approach, Runner };
} else {
  Object.assign(window, { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, MOVES, GRAVITY, JUMP_SPEED, DIVE_SPEED, VAULT_SPEED, SLIDE_TIME, ROLL_TIME, STANDING_HEIGHT, LOW_HEIGHT, VAULT_HEIGHT, CRASHED_HEIGHT, laneX, approach, Runner });
}
```

### 1d. Tests

Add these to the **end** of `tests/runner.tests.js`:

```js
QUnit.module("Runner vault and crash", () => {
  const run = (runner, seconds) => {
    for (let t = 0; t < seconds - 1e-9; t += 1 / 60) runner.update(1 / 60);
  };

  QUnit.test("vault() from running leaves the ground, lower than a jump", (assert) => {
    const runner = new Runner();

    runner.vault();
    runner.update(1 / 60);

    assert.strictEqual(runner.move, MOVES.vault);
    assert.true(runner.y > 0);
    assert.true(VAULT_SPEED < JUMP_SPEED);
  });

  QUnit.test("a vault is lower and shorter than a jump, and ends running", (assert) => {
    const runner = new Runner();
    runner.vault();
    let peak = 0;
    let airTime = 0;

    while (runner.move === MOVES.vault && airTime < 5) {
      runner.update(1 / 60);
      peak = Math.max(peak, runner.y);
      airTime += 1 / 60;
    }

    assertNear(assert, peak, (VAULT_SPEED * VAULT_SPEED) / (2 * GRAVITY), 0.05);
    assertNear(assert, airTime, (2 * VAULT_SPEED) / GRAVITY, 0.05);
    assert.true(peak < (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY), "lower than a jump");
    assert.strictEqual(runner.move, MOVES.run);
    assert.strictEqual(runner.y, 0);
  });

  QUnit.test("vault() only works from running", (assert) => {
    for (const start of ["jump", "slide", "roll"]) {
      const runner = new Runner();
      if (start === "jump") runner.jump();
      else if (start === "slide") runner.slide();
      else {
        runner.jump();
        runner.slide();
        while (runner.move === MOVES.jump) runner.update(1 / 60);
      }
      const move = runner.move;

      runner.vault();

      assert.strictEqual(runner.move, move, `not from ${start}`);
    }
  });

  QUnit.test("slide() in a vault does nothing: there is no diving out of a vault", (assert) => {
    const runner = new Runner();
    runner.vault();
    run(runner, 0.1);

    runner.slide();

    assert.false(runner.diving);
    assert.true(runner.vy > -DIVE_SPEED);
  });

  QUnit.test("a vault is tucked up: his body height is between low and standing", (assert) => {
    const runner = new Runner();

    runner.vault();

    assert.strictEqual(runner.bodyHeight, VAULT_HEIGHT);
    assert.true(VAULT_HEIGHT > LOW_HEIGHT && VAULT_HEIGHT < STANDING_HEIGHT);
  });

  QUnit.test("crash() stops the runner, flat on the ground", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.2);

    runner.crash();

    assert.true(runner.crashed);
    assert.false(runner.running);
    assert.strictEqual(runner.y, 0);
    assert.strictEqual(runner.vy, 0);
    assert.strictEqual(runner.bodyHeight, CRASHED_HEIGHT);
  });

  QUnit.test("a crashed runner doesn't go anywhere, and update() leaves him crashed", (assert) => {
    const runner = new Runner({ speed: 10 });
    runner.update(0.5);
    runner.crash();
    const z = runner.z;

    run(runner, 3);

    assert.strictEqual(runner.z, z);
    assert.true(runner.crashed);
  });

  QUnit.test("a crashed runner can't jump, vault, slide or change lanes", (assert) => {
    const runner = new Runner();
    runner.crash();

    runner.jump();
    runner.vault();
    runner.slide();
    runner.moveLane(1);

    assert.true(runner.crashed);
    assert.strictEqual(runner.lane, 0);
  });

  QUnit.test("a runner that hasn't crashed isn't crashed", (assert) => {
    assert.false(new Runner().crashed);
  });

  QUnit.test("reset() gets a crashed runner running again", (assert) => {
    const runner = new Runner();
    runner.crash();

    runner.reset();

    assert.false(runner.crashed);
    assert.true(runner.running);
    assert.strictEqual(runner.move, MOVES.run);
    assert.strictEqual(runner.bodyHeight, STANDING_HEIGHT);
  });
});
```

Reload `tests.html`: **10 more** tests (**176** in all), all green.

---

## Step 2: Obstacles, and hitting them

Now the obstacles themselves. Everything about them (what they are, how big, and whether the runner is touching one) is plain numbers, so it goes in its own file. Open `js/obstacles.js` (a placeholder). You'll build it in four pieces.

### 2a. The kinds of obstacle

```js
// Obstacles: the things in the runner's way, where they are, and whether the runner
// hit one. Like the street, this is plain data (no Babylon.js), so it is easy to
// test; main.js makes and hides the pieces, and runs the collision check every
// frame. See ../tests/obstacles.tests.js.
//
// Each kind of obstacle is beaten by a different move:
//   barrier   low, about knee height: jump it, or vault it (a vault is the more
//             forgiving: his hands are on it, so it can't catch him)
//   overhead  a bar at head height: slide (or roll) underneath it
//   container a wall: no move gets over it, so change lanes
// The numbers that matter for hitting things are in world units: how wide the
// obstacle is across the street, how long along it, and the range of heights it
// fills (bottom and top). The runner has a size too, from runner.js.

const RUNNER_HALF_WIDTH = 0.35; // half the runner's width, across the street
const RUNNER_HALF_DEPTH = 0.3; // half his length, along it
const VAULT_RANGE = 2.5; // a barrier this close ahead (in units) turns a jump into a vault
const VAULT_QUEUE_RANGE = 14; // press jump this far from a barrier (about a second and a half), and the vault waits until it is VAULT_RANGE away

const OBSTACLE_TYPES = {
  barrier: {
    // The construction barrier comes lying along z. Turned a quarter turn it lies
    // across the lane, and stretched along its length to fill one lane.
    pieces: ["roads/construction_barrier"],
    vaultable: true,
    rotationY: Math.PI / 2,
    scale: { x: 1, y: 1.1, z: 1.3 },
    halfWidth: 1,
    depth: 0.7,
    bottom: 0,
    top: 0.9,
  },
  overhead: {
    // The awning is a canopy on posts, made narrower and lower, so the canopy is a
    // bar across the lane at about head height.
    pieces: ["commercial/detail-awning-wide"],
    rotationY: 0,
    scale: { x: 0.36, y: 0.5, z: 1 },
    halfWidth: 1,
    depth: 1,
    bottom: 1,
    top: 1.5,
  },
  container: {
    pieces: ["industrial/shipping-container-a", "industrial/shipping-container-b", "industrial/shipping-container-c"],
    rotationY: 0,
    scale: { x: 0.8, y: 1, z: 1 }, // 2.6 wide as modeled, narrowed to fit a lane
    halfWidth: 1.04,
    depth: 5.7,
    bottom: 0,
    top: 2.45,
  },
};

// Every piece an obstacle can be made from, each once, so each file is loaded once.
const OBSTACLE_PIECES = [...new Set(Object.values(OBSTACLE_TYPES).flatMap((type) => type.pieces))];

// The ways obstacles come: a group is a pattern, with what is in each of the three
// lanes (left, middle, right), or null for an empty lane. Every pattern can be
// beaten: there is always an empty lane, or one that a jump or a slide gets past.
const PATTERNS = [
  ["container", null, null],
  [null, "container", null],
  [null, null, "container"],
  ["barrier", "barrier", "barrier"],
  ["overhead", "overhead", "overhead"],
  ["container", "barrier", "container"],
  ["container", "overhead", "container"],
  ["barrier", null, "barrier"],
  ["overhead", "container", null],
  [null, "container", "container"],
];

const FIRST_GROUP_Z = 50; // the first obstacles are this far from the start
const MIN_GAP = 22; // the shortest and longest distance between one group and the next
const MAX_GAP = 36;
const OBSTACLES_AHEAD = 150; // built this far in front of the runner, as the street is
const OBSTACLES_BEHIND = 20;

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, OBSTACLE_PIECES, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP };
} else {
  Object.assign(window, { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, OBSTACLE_PIECES, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP });
}
```

Things to notice:

- **Each kind is a table of numbers.** What to draw (`pieces`, `rotationY`, `scale`) and what it hits (`halfWidth`, `depth`, `bottom`, `top`). The drawing and the hitting are separate on purpose: the awning that is drawn as a canopy on posts *hits* as a bar from 1.0 to 1.5 high.
- **The numbers decide which move beats which.** A jump peaks at 1.5 and a vault at 1.1, so a barrier whose top is 0.9 is under both. The overhead bar starts at 1.0, above the low runner (0.7) and below the standing one (1.8). The container is 2.45 high, higher than any jump.
- **Widths have to fit the lanes.** Lanes are 2.2 apart, so the half widths of two neighbors must add up to no more than that, or an obstacle would poke into the one beside it (a barrier between two containers was being clipped by them when the containers were 2.6 wide). The containers are narrowed to 2.08 with `scale.x`, and a test checks every pair of kinds side by side.
- **Models are reshaped with `scale`.** The construction barrier comes lying along z, so it's turned a quarter turn and stretched along its length to fill a lane. The awning is made 40% as wide and half as high. One model can make a different obstacle.
- **`vaultable`** marks the kind that a vault can't be caught by.
- **A pattern is a group of three lanes.** `["container", null, null]` is a wall on the left with the other two lanes empty. Every pattern is beatable: it always has a lane that is empty or isn't a wall, and the tests check it, so a run can never be impossible.
- **The runner has a size too.** `RUNNER_HALF_WIDTH` and `RUNNER_HALF_DEPTH` are half his width across the street and half his length along it.

Create the tests. Put this at the top of `tests/obstacles.tests.js`, followed by the first two modules:

```js
// A runner, as far as hitting things goes: where he is and how tall he is.
const runnerAt = (x, y, z, bodyHeight = STANDING_HEIGHT, move = MOVES.run) => ({ x, y, z, bodyHeight, move });

QUnit.module("OBSTACLE_TYPES", () => {
  QUnit.test("every kind has a piece to draw, a size, and a range of heights that makes sense", (assert) => {
    for (const [kind, type] of Object.entries(OBSTACLE_TYPES)) {
      assert.true(type.pieces.length > 0, `${kind}: has a piece`);
      assert.true(type.halfWidth > 0 && type.depth > 0, `${kind}: has a size`);
      assert.true(type.top > type.bottom, `${kind}: its top is above its bottom`);
      assert.true(type.bottom >= 0, `${kind}: doesn't start underground`);
    }
  });

  QUnit.test("a barrier is low and sits on the ground, so a jump or vault gets over it", (assert) => {
    const { bottom, top } = OBSTACLE_TYPES.barrier;

    assert.strictEqual(bottom, 0);
    assert.true(top < STANDING_HEIGHT);
    assert.true(top < (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY), "lower than the top of a jump");
    assert.true(top < (VAULT_SPEED * VAULT_SPEED) / (2 * GRAVITY), "and lower than the top of a vault");
  });

  QUnit.test("an overhead bar is above the low runner and below the standing one, so only a slide goes under it", (assert) => {
    const { bottom } = OBSTACLE_TYPES.overhead;

    assert.true(bottom >= LOW_HEIGHT, "a slide or roll fits under it");
    assert.true(bottom < STANDING_HEIGHT, "standing doesn't");
    assert.true(bottom < VAULT_HEIGHT, "and neither does a vault");
  });

  QUnit.test("a container is taller than any jump gets, so only a lane change avoids it", (assert) => {
    const { top } = OBSTACLE_TYPES.container;

    assert.true(top > (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY));
  });

  QUnit.test("each obstacle fits in a lane, with room to change lanes beside it", (assert) => {
    for (const [kind, type] of Object.entries(OBSTACLE_TYPES)) assert.true(type.halfWidth * 2 <= LANE_WIDTH, kind);
  });

  QUnit.test("obstacles in neighboring lanes don't overlap, whatever the two kinds are", (assert) => {
    // Lanes are LANE_WIDTH apart, so two neighbors' half widths must add up to no more than that.
    for (const [a, typeA] of Object.entries(OBSTACLE_TYPES)) {
      for (const [b, typeB] of Object.entries(OBSTACLE_TYPES)) {
        assert.true(typeA.halfWidth + typeB.halfWidth <= LANE_WIDTH, `${a} next to ${b}`);
      }
    }
  });

  QUnit.test("OBSTACLE_PIECES lists every piece an obstacle can use, once each", (assert) => {
    for (const type of Object.values(OBSTACLE_TYPES)) {
      for (const piece of type.pieces) assert.true(OBSTACLE_PIECES.includes(piece), piece);
    }
    assert.strictEqual(new Set(OBSTACLE_PIECES).size, OBSTACLE_PIECES.length);
  });
});

QUnit.module("PATTERNS", () => {
  QUnit.test("every pattern has an obstacle for each of the three lanes, or an empty lane", (assert) => {
    for (const pattern of PATTERNS) {
      assert.strictEqual(pattern.length, 3);
      for (const kind of pattern) assert.true(kind === null || kind in OBSTACLE_TYPES, String(kind));
    }
  });

  QUnit.test("every pattern can be beaten: there is a lane that isn't a wall", (assert) => {
    for (const pattern of PATTERNS) assert.true(pattern.some((kind) => kind !== "container"), pattern.join(", "));
  });

  QUnit.test("no pattern is all empty", (assert) => {
    for (const pattern of PATTERNS) assert.true(pattern.some((kind) => kind !== null), pattern.join(", "));
  });

  QUnit.test("patterns use every kind of obstacle", (assert) => {
    const used = new Set(PATTERNS.flat());

    for (const kind of Object.keys(OBSTACLE_TYPES)) assert.true(used.has(kind), kind);
  });
});
```

Add the script and its tests to `tests.html`, after `runner.js` and `runner.tests.js`:

```html
  <script src="js/obstacles.js"></script>
```
```html
  <script src="tests/obstacles.tests.js"></script>
```

Reload `tests.html`: **11 more** tests (**187** in all). The *OBSTACLE_TYPES* tests check the design: that a barrier is lower than the top of both a jump and a vault, that the bar is in the gap between the low runner and the standing one, and that a container is taller than any jump.

### 2b. Making one

Add this function below the constants:

```js
// One obstacle of the given kind in the given lane (-1, 0 or 1), at distance `z`
// along the street. `random` picks which piece, for kinds that have several.
// The placement says what to draw (`piece`, `rotationY`, `scale`) and what it
// hits (the size and height numbers), and `endZ` is where it ends along the street.
function obstacleAt(kind, lane, z, random) {
  const type = OBSTACLE_TYPES[kind];
  return {
    type: kind,
    piece: type.pieces[Math.floor(random() * type.pieces.length)],
    vaultable: Boolean(type.vaultable),
    x: laneX(lane),
    z,
    rotationY: type.rotationY,
    scale: type.scale,
    halfWidth: type.halfWidth,
    depth: type.depth,
    bottom: type.bottom,
    top: type.top,
    endZ: z + type.depth / 2,
  };
}
```

and add `obstacleAt` to the export block:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, OBSTACLE_PIECES, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, obstacleAt };
} else {
  Object.assign(window, { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, OBSTACLE_PIECES, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, obstacleAt });
}
```

It copies what the kind says into a placement, picks a piece when a kind has several (the three containers are different colors), and says where the obstacle ends, `endZ`, so that the field will know when it's far behind. The random number is passed in, as with the buildings.

Add its tests to `tests/obstacles.tests.js`, after the two modules already there:

```js
QUnit.module("obstacleAt", () => {
  QUnit.test("puts the obstacle in the middle of its lane, at the distance it is given", (assert) => {
    const obstacle = obstacleAt("barrier", 1, 80, () => 0);

    assert.strictEqual(obstacle.x, laneX(1));
    assert.strictEqual(obstacle.z, 80);
  });

  QUnit.test("takes the size, heights, turn and scale from its kind", (assert) => {
    for (const [kind, type] of Object.entries(OBSTACLE_TYPES)) {
      const obstacle = obstacleAt(kind, 0, 0, () => 0);

      assert.strictEqual(obstacle.type, kind);
      assert.strictEqual(obstacle.halfWidth, type.halfWidth);
      assert.strictEqual(obstacle.depth, type.depth);
      assert.strictEqual(obstacle.bottom, type.bottom);
      assert.strictEqual(obstacle.top, type.top);
      assert.strictEqual(obstacle.rotationY, type.rotationY);
      assert.deepEqual(obstacle.scale, type.scale);
    }
  });

  QUnit.test("says where it ends along the street", (assert) => {
    const obstacle = obstacleAt("container", 0, 100, () => 0);

    assert.strictEqual(obstacle.endZ, 100 + OBSTACLE_TYPES.container.depth / 2);
  });

  QUnit.test("the random number picks which piece, for a kind with several", (assert) => {
    const pieces = OBSTACLE_TYPES.container.pieces;

    assert.strictEqual(obstacleAt("container", 0, 0, () => 0).piece, pieces[0]);
    assert.strictEqual(obstacleAt("container", 0, 0, () => 0.9999).piece, pieces[pieces.length - 1]);
  });

  QUnit.test("the lanes are on the left, in the middle and on the right", (assert) => {
    assert.true(obstacleAt("barrier", -1, 0, () => 0).x < 0);
    assert.strictEqual(obstacleAt("barrier", 0, 0, () => 0).x, 0);
    assert.true(obstacleAt("barrier", 1, 0, () => 0).x > 0);
  });
});
```

Reload `tests.html`: **5 more** tests (**192** in all).

### 2c. Hitting

```js
// Whether the runner is touching an obstacle. Three tests, and all three must
// pass: they overlap across the street, along the street, and in height. The
// runner's height is the part that changes with what he is doing, so a slide
// goes under an overhead bar and a jump goes over a barrier. A vault is the one
// move that ignores part of the test: with his hands on a vaultable obstacle, he
// can't be caught by it.
function hits(runner, obstacle) {
  if (obstacle.vaultable && runner.move === MOVES.vault) return false;
  const across = Math.abs(runner.x - obstacle.x) < obstacle.halfWidth + RUNNER_HALF_WIDTH;
  const along = Math.abs(runner.z - obstacle.z) < obstacle.depth / 2 + RUNNER_HALF_DEPTH;
  const high = runner.y < obstacle.top && runner.y + runner.bodyHeight > obstacle.bottom;
  return across && along && high;
}

// How far ahead the next barrier in the runner's lane is: from the front of the
// runner to the front of the barrier, in units, or Infinity if there isn't one (in
// his lane, and not yet passed). The game uses it to turn a jump into a vault: close
// enough (VAULT_RANGE) and he vaults now; a little further (VAULT_QUEUE_RANGE) and he
// vaults when he gets there. `obstacles` is any list of placements.
function barrierGap(runner, obstacles) {
  let nearest = Infinity;
  for (const obstacle of obstacles) {
    if (obstacle.type !== "barrier") continue;
    if (Math.abs(runner.x - obstacle.x) >= obstacle.halfWidth + RUNNER_HALF_WIDTH) continue;
    const gap = obstacle.z - obstacle.depth / 2 - (runner.z + RUNNER_HALF_DEPTH);
    if (gap >= 0 && gap < nearest) nearest = gap;
  }
  return nearest;
}
```

Things to notice:

- **A collision is three overlaps at once.** The runner and the obstacle overlap *across* the street, *along* it, and in *height*. All three must be true, which is the standard way to test two boxes. If any one is false, they miss.
- **Height is what makes the moves matter.** `runner.y` is how high his feet are and `bodyHeight` how tall he is, so he fills `y` up to `y + bodyHeight`. A slide makes him 0.7 tall: he fits under a bar that begins at 1.0. A jump lifts his feet above a barrier's top.
- **A vault is the one move that cheats.** With his hands on a vaultable obstacle, it can't catch him. Why? Try the numbers: a vault has to be at the top of its arc at exactly the right moment to clear a barrier, and a jump has a window about 0.24 seconds wide. A vault that doesn't beat that isn't worth having. So a vault is forgiving: start it anywhere in the 2.5 units before a barrier and you're over.
- **`barrierGap`** says how far away the next barrier is in the runner's lane, from the front of the runner to the front of the barrier, or `Infinity` if there isn't one. The game uses it to turn a jump into a vault, and only barriers count.
- **A vault has two ranges.** Close enough (`VAULT_RANGE`, 2.5 units) and a jump press vaults at once. A little further back (`VAULT_QUEUE_RANGE`, 14 units, about a second and a half of running) and the press is *remembered*, and the vault happens when the barrier gets close enough. Without the second range a player would have to press jump in the last third of a second before a barrier, and nearly every ordinary early press would be a plain jump.

Update the export block:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, OBSTACLE_PIECES, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, obstacleAt, hits, barrierGap };
} else {
  Object.assign(window, { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, OBSTACLE_PIECES, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, obstacleAt, hits, barrierGap });
}
```

Add the tests to `tests/obstacles.tests.js`, before the `ObstacleField` ones (or at the end, for now):

```js
QUnit.module("hits", () => {
  const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 50 };
  const overhead = { ...OBSTACLE_TYPES.overhead, x: 0, z: 50 };
  const container = { ...OBSTACLE_TYPES.container, x: 0, z: 50 };

  QUnit.test("a standing runner running into a barrier hits it", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50), barrier));
  });

  QUnit.test("but not before he gets there, or after he is past it", (assert) => {
    assert.false(hits(runnerAt(0, 0, 40), barrier));
    assert.false(hits(runnerAt(0, 0, 60), barrier));
  });

  QUnit.test("a runner in another lane doesn't hit it", (assert) => {
    assert.false(hits(runnerAt(laneX(1), 0, 50), barrier));
    assert.false(hits(runnerAt(laneX(-1), 0, 50), barrier));
  });

  QUnit.test("half way between lanes, he still hits what is in the lane he is part way into", (assert) => {
    assert.true(hits(runnerAt(laneX(1) / 2, 0, 50), barrier));
  });

  QUnit.test("a jump high enough goes over a barrier, and one too low doesn't", (assert) => {
    assert.false(hits(runnerAt(0, barrier.top + 0.01, 50), barrier), "above the top");
    assert.true(hits(runnerAt(0, barrier.top - 0.1, 50), barrier), "just below the top");
  });

  QUnit.test("a runner is touching an overhead bar if his head would be in it", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50, STANDING_HEIGHT), overhead), "standing");
    assert.true(hits(runnerAt(0, 0, 50, VAULT_HEIGHT), overhead), "vaulting");
  });

  QUnit.test("a slide or a roll goes under an overhead bar", (assert) => {
    assert.false(hits(runnerAt(0, 0, 50, LOW_HEIGHT), overhead));
  });

  QUnit.test("a jump doesn't go over an overhead bar, because his head is in it on the way up", (assert) => {
    assert.true(hits(runnerAt(0, 0.8, 50, STANDING_HEIGHT), overhead));
  });

  QUnit.test("a container is hit by anything on the ground, and by a jump at its best", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50), container));
    assert.true(hits(runnerAt(0, 0, 50, LOW_HEIGHT), container));
    const bestJump = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
    assert.true(hits(runnerAt(0, bestJump, 50), container));
  });

  QUnit.test("a container is long: he is hit all the way along it", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50 - container.depth / 2), container));
    assert.true(hits(runnerAt(0, 0, 50 + container.depth / 2), container));
    assert.false(hits(runnerAt(0, 0, 50 + container.depth / 2 + 1), container));
  });

  QUnit.test("a vault can't be caught by a barrier, even low down", (assert) => {
    assert.false(hits(runnerAt(0, 0, 50, VAULT_HEIGHT, MOVES.vault), barrier));
  });

  QUnit.test("but a vault is no help against an overhead bar or a container", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50, VAULT_HEIGHT, MOVES.vault), overhead));
    assert.true(hits(runnerAt(0, 0, 50, VAULT_HEIGHT, MOVES.vault), container));
  });

  QUnit.test("only the barrier can be vaulted", (assert) => {
    assert.true(OBSTACLE_TYPES.barrier.vaultable);
    assert.false(Boolean(OBSTACLE_TYPES.overhead.vaultable));
    assert.false(Boolean(OBSTACLE_TYPES.container.vaultable));
  });

  QUnit.test("a real Runner works as well as the stand-in", (assert) => {
    const runner = new Runner({ z: 50 });

    assert.true(hits(runner, barrier));
    runner.slide();
    assert.true(hits(runner, barrier), "sliding doesn't help against a barrier");
    assert.false(hits(runner, overhead), "but it does against an overhead bar");
  });
});

QUnit.module("vaulting over barriers", () => {
  QUnit.test("a vault gets over a barrier from anywhere in the vault range", (assert) => {
    for (const gap of [0.1, 1, 2, VAULT_RANGE - 0.1]) {
      const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 0 };
      // The gap is from the front of the runner to the front of the barrier.
      const runner = new Runner({ z: -(barrier.depth / 2) - gap - RUNNER_HALF_DEPTH });
      runner.vault();
      let hit = false;

      for (let i = 0; i < 120; i++) {
        runner.update(1 / 60);
        if (hits(runner, barrier)) hit = true;
      }

      assert.false(hit, `from ${gap} away`);
    }
  });

  QUnit.test("a vault is already over by the time the barrier is behind him", (assert) => {
    const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 0 };
    const gap = VAULT_RANGE;
    const runner = new Runner({ z: -(barrier.depth / 2) - gap - RUNNER_HALF_DEPTH });
    runner.vault();
    while (runner.move === MOVES.vault) runner.update(1 / 60);

    assert.true(runner.z > barrier.z + barrier.depth / 2 + RUNNER_HALF_DEPTH, "he has landed beyond it");
  });

  QUnit.test("a jump clears a barrier too", (assert) => {
    const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 0 };
    const runner = new Runner({ z: -2.15 }); // about 1.5 units from the barrier, a good time to jump
    runner.jump();
    let hit = false;

    for (let i = 0; i < 120; i++) {
      runner.update(1 / 60);
      if (hits(runner, barrier)) hit = true;
    }

    assert.false(hit);
  });

  QUnit.test("a jump that is too late, or too early, doesn't", (assert) => {
    const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 0 };
    for (const z of [-0.8, -5]) {
      const runner = new Runner({ z });
      runner.jump();
      let hit = false;

      for (let i = 0; i < 120; i++) {
        runner.update(1 / 60);
        if (hits(runner, barrier)) hit = true;
      }

      assert.true(hit, `jumping from z = ${z}`);
    }
  });

  QUnit.test("running straight into a barrier crashes", (assert) => {
    const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 10 };
    const runner = new Runner();
    let hit = false;

    for (let i = 0; i < 300 && !hit; i++) {
      runner.update(1 / 60);
      hit = hits(runner, barrier);
    }

    assert.true(hit);
  });

  QUnit.test("a slide goes under an overhead bar and out the other side", (assert) => {
    const overhead = { ...OBSTACLE_TYPES.overhead, x: 0, z: 6 };
    const runner = new Runner();
    runner.slide();
    let hit = false;

    for (let i = 0; i < 60; i++) {
      runner.update(1 / 60);
      if (hits(runner, overhead)) hit = true;
    }

    assert.false(hit);
    assert.true(runner.z > overhead.z + 1, "he went right through");
  });
});

QUnit.module("barrierGap", () => {
  const barrier = { ...OBSTACLE_TYPES.barrier, type: "barrier", x: 0, z: 20 };

  QUnit.test("is the distance from the front of the runner to the front of the barrier", (assert) => {
    // The barrier's near face is at 20 - 0.35 = 19.65 and the runner's front at 10 + 0.3.
    const gap = barrierGap(runnerAt(0, 0, 10), [barrier]);

    assert.true(Math.abs(gap - (20 - barrier.depth / 2 - (10 + RUNNER_HALF_DEPTH))) < 1e-9);
  });

  QUnit.test("gets smaller as the runner gets closer", (assert) => {
    assert.true(barrierGap(runnerAt(0, 0, 15), [barrier]) < barrierGap(runnerAt(0, 0, 5), [barrier]));
  });

  QUnit.test("is zero when the runner's front is just at the barrier", (assert) => {
    const z = barrier.z - barrier.depth / 2 - RUNNER_HALF_DEPTH;

    assert.true(Math.abs(barrierGap(runnerAt(0, 0, z), [barrier])) < 1e-9);
  });

  QUnit.test("is Infinity once the barrier has been passed", (assert) => {
    assert.strictEqual(barrierGap(runnerAt(0, 0, 30), [barrier]), Infinity);
  });

  QUnit.test("is Infinity when the barrier is in another lane", (assert) => {
    assert.strictEqual(barrierGap(runnerAt(laneX(1), 0, 10), [barrier]), Infinity);
  });

  QUnit.test("only barriers count: an overhead bar or a container isn't something to vault", (assert) => {
    for (const kind of ["overhead", "container"]) {
      const other = { ...OBSTACLE_TYPES[kind], type: kind, x: 0, z: 20 };

      assert.strictEqual(barrierGap(runnerAt(0, 0, 10), [other]), Infinity, kind);
    }
  });

  QUnit.test("with several barriers, it is the nearest one ahead", (assert) => {
    const near = { ...barrier, z: 20 };
    const far = { ...barrier, z: 50 };

    const gap = barrierGap(runnerAt(0, 0, 10), [far, near]);

    assert.true(gap < 10);
  });

  QUnit.test("no obstacles, no gap", (assert) => {
    assert.strictEqual(barrierGap(runnerAt(0, 0, 0), []), Infinity);
  });

  QUnit.test("the vault range is inside the queue range, so there is a wait", (assert) => {
    assert.true(VAULT_RANGE < VAULT_QUEUE_RANGE);
  });

  QUnit.test("a vault started at the end of the queue range's wait still gets over a barrier", (assert) => {
    // The queued vault starts when the gap has shrunk to VAULT_RANGE.
    const barrier2 = { ...OBSTACLE_TYPES.barrier, type: "barrier", x: 0, z: 0 };
    const runner = new Runner({ z: -(barrier2.depth / 2) - VAULT_RANGE - RUNNER_HALF_DEPTH });
    assert.true(Math.abs(barrierGap(runner, [barrier2]) - VAULT_RANGE) < 1e-9);
    runner.vault();
    let hit = false;

    for (let i = 0; i < 120; i++) {
      runner.update(1 / 60);
      if (hits(runner, barrier2)) hit = true;
    }

    assert.false(hit);
  });
});
```

Reload `tests.html`: **30 more** tests (**222** in all). Several of these run a real `Runner` through a jump, vault or slide past an obstacle and check whether he hits it, so they test Step 1 and this step together: *"a jump that is too late, or too early, doesn't"* clears a barrier only inside its window.

---

## Step 3: The obstacle field

Obstacles come in groups, spaced down the street, made ahead of the runner and dropped behind him, the way the street is. Put the class at the **end** of `js/obstacles.js`, below `lowObstacleAhead`, **complete and closed**, with a constructor and one helper:

```js
class ObstacleField {
  constructor({ seed = 1, firstZ = FIRST_GROUP_Z, ahead = OBSTACLES_AHEAD, behind = OBSTACLES_BEHIND } = {}) {
    this.seed = seed;
    this.firstZ = firstZ;
    this.ahead = ahead;
    this.behind = behind;
    this.active = new Map(); // id -> obstacle, for every obstacle that exists right now
    this._start();
  }

  // Puts the field back to before anything was made.
  _start() {
    this.random = seededRandom(this.seed);
    this.nextId = 0;
    this.nextGroupZ = this.firstZ;
  }
}
```

Update the export block to add `ObstacleField`:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, OBSTACLE_PIECES, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, obstacleAt, hits, barrierGap, ObstacleField };
} else {
  Object.assign(window, { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, OBSTACLE_PIECES, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, obstacleAt, hits, barrierGap, ObstacleField });
}
```

Things to notice:

- **The same shape as `StreetStream`:** `ahead` and `behind`, an `active` map from id to obstacle, a seeded random generator, and an `update(z)` that returns `{ added, removed }`.
- **`firstZ` is 50.** The first obstacles are well down the street, so the runner has time to settle into running.

The next methods go **inside the class**, below the constructor and above its closing `}`.

### 3a. Making groups

```js
  // Remembers a new obstacle, giving it an id so it can be found again to remove.
  _add(obstacle) {
    const placed = { ...obstacle, id: this.nextId++ };
    this.active.set(placed.id, placed);
    return placed;
  }

  // Makes a group of obstacles at `z`: one of the patterns, with an obstacle in
  // each lane the pattern says.
  _makeGroup(z) {
    const pattern = PATTERNS[Math.floor(this.random() * PATTERNS.length)];
    const group = [];
    pattern.forEach((kind, i) => {
      if (kind) group.push(this._add(obstacleAt(kind, i - MAX_LANE, z, this.random)));
    });
    return group;
  }
```

A group is one of the patterns, picked at random; each lane with something in it gets an obstacle. `i - MAX_LANE` turns the lane's place in the pattern (0, 1, 2) into a lane (-1, 0, 1).

### 3b. Keeping up

```js
  // Brings the obstacles up to date for a runner at `z`: makes the groups now
  // within `ahead` of him, with a random gap between one group and the next, and
  // drops the ones that are behind him. Returns what changed, { added, removed }, as
  // the street does. Calling it again for the same `z` changes nothing.
  update(z) {
    const added = [];
    const removed = [];

    while (this.nextGroupZ < z + this.ahead) {
      added.push(...this._makeGroup(this.nextGroupZ));
      this.nextGroupZ += MIN_GAP + this.random() * (MAX_GAP - MIN_GAP);
    }

    const back = z - this.behind;
    for (const [id, obstacle] of this.active) {
      if (obstacle.endZ < back) {
        this.active.delete(id);
        removed.push(obstacle);
      }
    }
    return { added, removed };
  }
```

Things to notice:

- **Groups are made until there are enough ahead,** and between one group and the next is a random gap of 22 to 36 units, so the rhythm isn't predictable. That gap is the only thing that makes them feel different from each other.
- **Everything comes from one generator,** used in order, so the same seed gives the same course however the updates are spaced. A test builds it with updates 1 unit apart and 40 apart and compares.

### 3c. Asking and starting again

```js
  // The obstacle the runner is touching, or null.
  hit(runner) {
    for (const obstacle of this.active.values()) {
      if (hits(runner, obstacle)) return obstacle;
    }
    return null;
  }

  // How far ahead the next barrier in the runner's lane is (see barrierGap).
  barrierGap(runner) {
    return barrierGap(runner, this.active.values());
  }

  // Takes every obstacle away and starts again, so the next update makes the same
  // obstacles as the first. Returns the ones that were taken away.
  reset() {
    const removed = [...this.active.values()];
    this.active.clear();
    this._start();
    return removed;
  }
```

`hit` and `barrierGap` are the two questions the game asks each frame. `reset` takes everything away and starts the generator again, so a restart is the same course.

### 3d. Tests

Add the rest of the tests to the **end** of `tests/obstacles.tests.js`:

```js
QUnit.module("ObstacleField", () => {
  const withoutId = ({ id, ...rest }) => rest;
  const byPosition = (a, b) => a.z - b.z || a.x - b.x;

  // Runs a runner from z = 0 to `to`, `step` at a time, and returns every obstacle ever made.
  const runTo = (field, to, step) => {
    const everything = [];
    for (let z = 0; z <= to; z += step) everything.push(...field.update(z).added);
    return everything;
  };

  QUnit.test("nothing exists before the first update", (assert) => {
    assert.strictEqual(new ObstacleField().active.size, 0);
  });

  QUnit.test("the first obstacles are a good way from the start, so the runner has time to get going", (assert) => {
    const { added } = new ObstacleField().update(0);

    assert.true(added.length > 0);
    assert.true(Math.min(...added.map((o) => o.z)) >= FIRST_GROUP_Z);
  });

  QUnit.test("makes obstacles as far ahead as it is asked to", (assert) => {
    const { added } = new ObstacleField({ ahead: 200 }).update(0);

    assert.true(Math.max(...added.map((o) => o.z)) > 150);
    assert.true(Math.max(...added.map((o) => o.z)) < 200 + MAX_GAP);
  });

  QUnit.test("gives every obstacle its own id", (assert) => {
    const { added } = new ObstacleField().update(0);

    assert.strictEqual(new Set(added.map((o) => o.id)).size, added.length);
  });

  QUnit.test("a group is one pattern: everything in it is at the same distance", (assert) => {
    const { added } = new ObstacleField().update(0);
    const first = added.filter((o) => o.z === added[0].z);

    const kinds = [-1, 0, 1].map((lane) => {
      const found = first.find((o) => o.x === laneX(lane));
      return found ? found.type : null;
    });
    assert.true(PATTERNS.some((p) => p.join() === kinds.join()), kinds.join(", "));
  });

  QUnit.test("groups are spaced between MIN_GAP and MAX_GAP apart", (assert) => {
    const everything = runTo(new ObstacleField(), 600, 5);
    const starts = [...new Set(everything.map((o) => o.z))].sort((a, b) => a - b);

    assert.true(starts.length > 10);
    for (let i = 1; i < starts.length; i++) {
      const gap = starts[i] - starts[i - 1];
      assert.true(gap >= MIN_GAP - 1e-9 && gap <= MAX_GAP + 1e-9, `${gap}`);
    }
  });

  QUnit.test("updating again at the same place changes nothing", (assert) => {
    const field = new ObstacleField();
    field.update(50);

    const { added, removed } = field.update(50);

    assert.strictEqual(added.length, 0);
    assert.strictEqual(removed.length, 0);
  });

  QUnit.test("obstacles that are behind the runner are dropped, and only those", (assert) => {
    const field = new ObstacleField({ behind: 20 });
    field.update(0);

    const { removed } = field.update(400);

    assert.true(removed.length > 0);
    for (const o of removed) assert.true(o.endZ < 380, `${o.endZ}`);
    for (const o of field.active.values()) assert.true(o.endZ >= 380);
  });

  QUnit.test("the same seed gives the same obstacles, however the updates are spaced out", (assert) => {
    const fine = runTo(new ObstacleField({ seed: 5 }), 400, 1).map(withoutId).sort(byPosition);
    const coarse = runTo(new ObstacleField({ seed: 5 }), 400, 40).map(withoutId).sort(byPosition);

    assert.deepEqual(fine, coarse);
  });

  QUnit.test("a different seed gives different obstacles", (assert) => {
    const a = runTo(new ObstacleField({ seed: 1 }), 300, 10).map((o) => o.type + o.x);
    const b = runTo(new ObstacleField({ seed: 2 }), 300, 10).map((o) => o.type + o.x);

    assert.notDeepEqual(a, b);
  });

  QUnit.test("only a bounded number exist at once, however far the runner goes", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    let most = 0;

    for (let z = 0; z <= 20000; z += 5) {
      field.update(z);
      most = Math.max(most, field.active.size);
    }

    assert.true(most < 40, `${most} at most`);
  });

  QUnit.test("hit() finds the obstacle the runner is touching, or null", (assert) => {
    const field = new ObstacleField();
    const { added } = field.update(0);
    const target = added[0];

    assert.strictEqual(field.hit(runnerAt(target.x, 0, target.z)), field.active.get(target.id), "on it");
    assert.strictEqual(field.hit(runnerAt(target.x, 0, 0)), null, "back at the start, nothing near");
  });

  QUnit.test("barrierGap() sees a barrier made by the field", (assert) => {
    const field = new ObstacleField({ ahead: 1000 });
    field.update(0);
    const barrier = [...field.active.values()].find((o) => o.type === "barrier");

    assert.true(field.barrierGap(runnerAt(barrier.x, 0, barrier.z - 2.5)) < VAULT_RANGE + 0.5);
    assert.true(field.barrierGap(runnerAt(barrier.x, 0, 0)) > VAULT_QUEUE_RANGE);
  });

  QUnit.test("reset() takes every obstacle away and returns them", (assert) => {
    const field = new ObstacleField();
    const { added } = field.update(0);

    const removed = field.reset();

    assert.strictEqual(removed.length, added.length);
    assert.strictEqual(field.active.size, 0);
  });

  QUnit.test("after reset() the next update makes the very same obstacles again", (assert) => {
    const field = new ObstacleField({ seed: 9 });
    const first = field.update(0).added;
    field.update(300);

    field.reset();

    assert.deepEqual(field.update(0).added, first, "same obstacles, same ids");
  });

  QUnit.test("every obstacle in a long run can be beaten: no group is a solid wall", (assert) => {
    const everything = runTo(new ObstacleField({ seed: 3 }), 3000, 10);
    const groups = new Map();
    for (const o of everything) groups.set(o.z, [...(groups.get(o.z) || []), o]);

    for (const [z, group] of groups) {
      const walls = group.filter((o) => o.type === "container").length;
      assert.true(walls < 3, `the group at ${z.toFixed(0)}`);
    }
  });
});
```

Reload `tests.html`: **16 more** tests (**238** in all). One of them is the most important in the file: *"every obstacle in a long run can be beaten: no group is a solid wall"*. It builds three thousand units of course and checks that no group has a container in all three lanes.

---

## Step 4: Clips for the new moves

### 4a. Clips for the new moves

The vault and the crash need clips, and the tuck-and-fly of `NinjaJump_Start` suits a vault. In `js/clips.js`, add two entries to the `CLIPS` table:

```js
  vault: "NinjaJump_Start",
  crash: "Death01",
```

Add two speeds below `SLIDE_EXIT_TIME`, or anywhere in that block of constants:

```js
const VAULT_CLIP_SPEED = 1.8; // the vault clip is 0.97 seconds; the vault is about 0.5
const CRASH_CLIP_SPEED = 1.5; // the crash clip is 2.4 seconds: a fall, then lying still
```

and add two cases to the `switch` in `clipFor`, before the `default`:

```js
    case MOVES.vault:
      return { name: CLIPS.vault, loop: false, speed: VAULT_CLIP_SPEED };
    case MOVES.crash:
      return { name: CLIPS.crash, loop: false, speed: CRASH_CLIP_SPEED };
```

Things to notice:

- **A crash plays once and holds.** `Death01` falls over backwards and then stays lying down: with `loop: false` the last pose is kept until the runner is reset.
- **The vault clip is a crouch and a tuck:** the knees come up to the chest, which looks like going over something.
- **A vault leans.** A vault and a jump are close to the same animation, so a lean forward makes the difference easy to see. `pitchFor` says how far to pitch the whole model for the move, 0.5 radians (about 30 degrees) for a vault, and `main.js` eases toward it as it does for the slide's lift. Add this above `liftFor` in `js/clips.js`:

```js
// A vault is a jump with a lean: he pitches forward over the barrier with his hands
// out, which is what makes it look different from a jump. This is how far, in
// radians, and main.js eases toward it like the lift.
const VAULT_PITCH = 0.5;

function pitchFor(runner) {
  return runner.move === MOVES.vault ? VAULT_PITCH : 0;
}
```

and add `VAULT_PITCH` and `pitchFor` to the export block:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLIPS, SLIDE_EXIT_TIME, SLIDE_LIFT, CRASH_LIFT, VAULT_PITCH, clipFor, liftFor, pitchFor, ClipPlayer };
} else {
  Object.assign(window, { CLIPS, SLIDE_EXIT_TIME, SLIDE_LIFT, CRASH_LIFT, VAULT_PITCH, clipFor, liftFor, pitchFor, ClipPlayer });
}
```

Add tests for the clips inside the `clipFor` module, above the one called *"every clip it can choose is one the character file has"*:

```js
  QUnit.test("a vault plays the vault clip once, sped up to fit", (assert) => {
    const clip = clipFor(doing(MOVES.vault));

    assert.strictEqual(clip.name, CLIPS.vault);
    assert.false(clip.loop);
    assert.true(clip.speed > 1);
  });

  QUnit.test("a crash plays the falling clip once, and holds the last pose", (assert) => {
    const clip = clipFor(doing(MOVES.crash, { running: false }));

    assert.strictEqual(clip.name, CLIPS.crash);
    assert.false(clip.loop);
  });
```

and, in that last test, add the two new names to the list of clips in the file:

```js
    const inFile = ["Idle_Loop", "Sprint_Loop", "Jump_Start", "Slide_Start", "Slide_Exit", "Roll", "NinjaJump_Start", "Death01"];
```

Add tests for the lean at the end of the file, above the *liftFor* ones:

```js
QUnit.module("pitchFor", () => {
  QUnit.test("a vault leans forward over the barrier", (assert) => {
    assert.strictEqual(pitchFor({ move: MOVES.vault }), VAULT_PITCH);
    assert.true(VAULT_PITCH > 0, "forward is a positive turn about x");
  });

  QUnit.test("but not too far: he doesn't go over on his head", (assert) => {
    assert.true(VAULT_PITCH < Math.PI / 3);
  });

  QUnit.test("every other move stays upright", (assert) => {
    for (const move of [MOVES.run, MOVES.jump, MOVES.slide, MOVES.roll, MOVES.crash]) assert.strictEqual(pitchFor({ move }), 0, move);
  });
});
```

Reload `tests.html`: **5 more** tests (**243** in all).

### 4b. Lifting the crashed runner

Crash into something and look at the runner lying on the street: his arm and part of his head dip a few centimeters *into* it (about 3, and 4 on the way down). It's the same thing the slide's lift fixed in the last tutorial: a clip that lays the body flat doesn't quite meet a flat floor. (The street's top is at y = 0, because the road tiles are drawn sunk by their thickness, so the lift only has to cover what the pose dips.) The crash needs its own lift. In `js/clips.js`, add a constant below `SLIDE_LIFT`:

```js
// The crash clip lays him on his back, and his arm and head dip a few centimeters
// (about 3, and 4 on the way down) below the street the same way.
const CRASH_LIFT = 0.04;
```

and make `liftFor` handle the crash too:

```js
function liftFor(runner) {
  if (runner.move === MOVES.slide) return SLIDE_LIFT;
  if (runner.move === MOVES.crash) return CRASH_LIFT;
  return 0;
}
```

Add `CRASH_LIFT` to the export block (it is in the block shown above), and replace the `liftFor` tests, at the end of `tests/clips.tests.js`, with:

```js
QUnit.module("liftFor", () => {
  QUnit.test("a runner that is sliding is lifted a little, so his hand stays out of the ground", (assert) => {
    assert.strictEqual(liftFor({ move: MOVES.slide }), SLIDE_LIFT);
    assert.true(SLIDE_LIFT > 0);
  });

  QUnit.test("the lift is small: the model doesn't float", (assert) => {
    assert.true(SLIDE_LIFT < 0.2);
  });

  QUnit.test("a crashed runner is lifted a little too, so his arm and head stay out of the street", (assert) => {
    assert.strictEqual(liftFor({ move: MOVES.crash }), CRASH_LIFT);
    assert.true(CRASH_LIFT > 0 && CRASH_LIFT < 0.2);
  });

  QUnit.test("every other move has no lift", (assert) => {
    for (const move of [MOVES.run, MOVES.jump, MOVES.vault, MOVES.roll]) assert.strictEqual(liftFor({ move }), 0, move);
  });
});
```

Reload `tests.html`: **1 more** test (**244** in all).

---

## Step 5: Reshaping pieces

The obstacles reuse the street's pool, but unlike the street's pieces they are reshaped: a barrier is a construction barrier made longer, an overhead bar an awning made narrower and lower. So a placement now says a *size* as well as a place and a turn, and the library has to apply it. `moveTo` already sets the position and the turn every time a piece is placed or reused; now it sets the size too, so a pooled piece is always exactly what its placement says, whatever it looked like the last time it was used.

In `js/models.js`, replace the `place` and `moveTo` methods of `PieceLibrary` with these:

```js
  // Puts a copy of a loaded piece in the world, and returns it: at (x, y, z),
  // turned by rotationY radians about the vertical axis, and sized by scale (see
  // moveTo). A placement from the street or the obstacles can be passed straight in.
  place(name, placement = {}) {
    const template = this.templates.get(name);
    if (!template) throw new Error(`The piece "${name}" hasn't been loaded`);

    const copy = template.instantiateHierarchy(null);
    this.moveTo(copy, placement);
    return copy;
  }

  // Moves a piece that is already in the world to (x, y, z), turns it by rotationY,
  // and sizes it by `scale` ({ x, y, z }, each 1 for the size it was loaded at),
  // the same way place() does for a new one. Setting the size every time matters
  // for a pool, where a piece that was stretched for one job may be used for another.
  moveTo(piece, { x = 0, y = 0, z = 0, rotationY = 0, scale = { x: 1, y: 1, z: 1 } } = {}) {
    piece.position.x = x;
    piece.position.y = y;
    piece.position.z = z;
    piece.rotation.y = rotationY;
    piece.scaling.x = scale.x;
    piece.scaling.y = scale.y;
    piece.scaling.z = scale.z;
  }
```

Things to notice:

- **`scale` is `{ x, y, z }`,** each 1 for "the size it was loaded at". It is set *every* time, defaulting to 1, so a placement without a scale always gets the normal size, and a reused piece never keeps a size from a past life.
- **`place` passes the whole placement on.** The obstacles' placements carry `scale`, `rotationY` and the sizes they hit with; `moveTo` only looks at what it needs.

The tests for these use fake pieces, which now need a size. In the `FakeTransformNode` class of the `PieceLibrary` tests, add a line below `rotation`:

```js
    scaling = new FakeVector3(1, 1, 1);
```

Replace the two `moveTo` tests (and add the new ones) with these, inside the `PieceLibrary` module, above the test *"place() refuses a piece that hasn't been loaded"*:

```js
  QUnit.test("moveTo() moves and turns a piece that is already in the world", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, scaling: { x: 1, y: 1, z: 1 } };

    library.moveTo(piece, { x: 3, y: 0.5, z: -8, rotationY: 1.5 });

    assert.strictEqual(piece.position.x, 3);
    assert.strictEqual(piece.position.y, 0.5);
    assert.strictEqual(piece.position.z, -8);
    assert.strictEqual(piece.rotation.y, 1.5);
  });

  QUnit.test("moveTo() with nothing given puts the piece back at the origin", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 3, y: 1, z: 9 }, rotation: { y: 2 }, scaling: { x: 2, y: 2, z: 2 } };

    library.moveTo(piece);

    assert.deepEqual(piece.position, { x: 0, y: 0, z: 0 });
    assert.strictEqual(piece.rotation.y, 0);
    assert.deepEqual(piece.scaling, { x: 1, y: 1, z: 1 }, "and its normal size");
  });

  QUnit.test("moveTo() sizes the piece by the scale it is given", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, scaling: { x: 1, y: 1, z: 1 } };

    library.moveTo(piece, { scale: { x: 0.4, y: 0.5, z: 1.5 } });

    assert.deepEqual(piece.scaling, { x: 0.4, y: 0.5, z: 1.5 });
  });

  QUnit.test("a piece that was stretched goes back to its normal size when it is moved without a scale", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 }, scaling: { x: 1, y: 1, z: 1 } };
    library.moveTo(piece, { scale: { x: 3, y: 3, z: 3 } });

    library.moveTo(piece, { x: 5 });

    assert.deepEqual(piece.scaling, { x: 1, y: 1, z: 1 });
  });

  QUnit.test("place() sizes the new copy too", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one", { scale: { x: 2, y: 3, z: 4 } });

    assert.strictEqual(copy.scaling.x, 2);
    assert.strictEqual(copy.scaling.y, 3);
    assert.strictEqual(copy.scaling.z, 4);
  });
```

Reload `tests.html`: **3 more** tests (**247** in all), all green.

---

## Step 6: Wire it together

Everything is built. Now the page and `main.js` have to use it.

### 6a. `index.html`

Add the script after `runner.js` (it needs `laneX` from there), **above `main.js`**. `main.js` has to be last, or it runs before the code it uses is loaded. The scripts at the bottom of the page should now be, in this order:

```html
  <script src="../../../js/screenshot.js"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/obstacles.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="js/main.js"></script>
```

Add some styles for a message to the `<style>` block, above the `#splash p` rule:

```html
    /* The message over the picture when the runner crashes. */
    #message {
      position: fixed;
      left: 0;
      right: 0;
      top: 38%;
      z-index: 20;
      text-align: center;
      color: #fff;
      font: bold 44px/1.3 system-ui, sans-serif;
      text-shadow: 0 3px 10px #000;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    #message.hidden {
      opacity: 0;
    }
    #message small {
      display: block;
      font-size: 22px;
      font-weight: normal;
    }
```

Add the message to the body, directly above the `<canvas>` line:

```html
  <div id="message" class="hidden">Crashed!<small>Press R to run again</small></div>
```

and replace the `.hint` line with one that mentions vaulting:

```html
  <div class="hint">&larr;/&rarr; (A/D) lanes &middot; &uarr; (W/Space) jump or vault &middot; &darr; (S) slide, or dive in the air &middot; R restart &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

### 6b. `js/main.js`

**1. Load the obstacle pieces too.** Change the line that loads the street's pieces:

```js
  await library.load([...STREET_PIECES, ...OBSTACLE_PIECES]);
```

**2. The field.** Directly below the `release` function, and above the comment about the runner, add:

```js
  // The obstacles are made the same way as the street, from the same pool, but they
  // have their own ids, so they are remembered in a separate map.
  const field = new ObstacleField({ seed: SEED });
  const obstacleNodes = new Map();

  const buildObstacles = (z) => {
    const { added, removed } = field.update(z);
    for (const obstacle of removed) releaseObstacle(obstacle);
    for (const obstacle of added) obstacleNodes.set(obstacle.id, pool.acquire(obstacle.piece, obstacle));
  };
  const releaseObstacle = (obstacle) => {
    pool.release(obstacle.piece, obstacleNodes.get(obstacle.id));
    obstacleNodes.delete(obstacle.id);
  };

  // A message over the picture, for when the runner crashes.
  const message = document.getElementById("message");
```

Things to notice:

- **The pool is shared.** The obstacles ask the same `pool` for pieces and give them back to it, so a barrier and a road tile are both just pieces. Each has its own map of nodes, because the ids come from two different counters and would clash.
- **`message` is the page's own element,** shown and hidden by adding and taking away the `hidden` class. It's an HTML overlay and not a Babylon.js GUI, which is how the splash works too.

**3. A vault waiting its turn, and the first obstacles.** Directly below the `let lift = 0;` line, add a variable:

```js
  let vaultQueued = false; // a jump pressed a little early for a barrier: it vaults when it is close enough
```

and directly below the `buildStreet(runner.z);` line near the runner, add:

```js
  buildObstacles(runner.z);
```

**3b. The lean.** Add a constant below `LIFT_RATE` at the top of the file, and a variable below `let lift = 0;`:

```js
const PITCH_RATE = 14; // and how quickly it leans forward for a vault
```

```js
  let pitch = 0; // and how far it is leaning forward
```

then, in the frame loop, directly above the line `character.root.rotation.y = runner.heading;`, add:

```js
    pitch = approach(pitch, pitchFor(runner), PITCH_RATE, dt);
    character.root.rotation.x = pitch;
```

**4. Restarting.** Change the `KeyR` branch of the `keydown` handler to the following. It also forgets a queued vault:

```js
    if (event.code === "KeyR") {
      runner.reset();
      for (const piece of stream.reset()) release(piece); // the street starts again too
      for (const obstacle of field.reset()) releaseObstacle(obstacle); // and the obstacles
      message.classList.add("hidden");
      vaultQueued = false;
      return;
    }
```

**5. Vault or jump.** In the same handler, replace the `JUMP_KEYS` branch and the `else` after it, so the end of the handler is:

```js
    else if (JUMP_KEYS.has(event.code)) {
      // Next to a barrier, a jump is a vault: a quick, low hop over it. A little
      // further back, the vault waits until the barrier is close enough.
      const gap = field.barrierGap(runner);
      if (gap <= VAULT_RANGE) runner.vault();
      else if (gap <= VAULT_QUEUE_RANGE) vaultQueued = true;
      else runner.jump();
    } else runner.slide();
```

This is the context-sensitive part: **one key, a different move by situation.** Look at how far away the next barrier is. Close (within 2.5 units): the jump key vaults now. A little further (within 14): it queues a vault for when the barrier is close enough. Nothing near: it jumps. The player doesn't have to choose; the game does, and an early press isn't wasted.

**6. The frame loop.** In the frame loop, below `buildStreet(runner.z);`, add the code that fires a queued vault, and the crash check:

```js
    buildObstacles(runner.z);

    // A vault that was waiting for the barrier to come close enough. It stops
    // waiting if the barrier is gone: he changed lanes, or he is past it.
    if (vaultQueued) {
      const gap = field.barrierGap(runner);
      if (gap <= VAULT_RANGE) {
        runner.vault();
        vaultQueued = false;
      } else if (gap === Infinity) {
        vaultQueued = false;
      }
    }

    // Running into something ends the run.
    if (!runner.crashed && field.hit(runner)) {
      runner.crash();
      message.classList.remove("hidden");
    }
```

Things to notice:

- **Every frame: update the numbers, keep the world up, check for a crash, then move the picture.** The crash check comes after the update and before the drawing, so the frame he hits something is the frame he falls.
- **A queued vault gives up if there's nothing to vault.** If the player changes lanes after pressing jump, or the barrier is passed, `barrierGap` is `Infinity` and the queue is cleared, so the vault doesn't fire at some later barrier.
- **`!runner.crashed` stops it crashing again** every frame while he lies there.

---

## Step 7: Try it

Serve the page and open it. The first obstacles are about 50 units from the start, a few seconds in.

- [ ] **Containers** (red, blue, green boxes) stand in one or two lanes. **Change lanes** to go round them
- [ ] **Barriers** (low grey slabs) stretch across a lane. **Jump** over one, or press jump just before it to **vault**
- [ ] **Overhead bars** (a green canopy on posts) are at head height. **Slide** under one
- [ ] Running into anything makes the runner **fall over**, shows **Crashed!**, and stops the run
- [ ] **R** brings him back, and the course starts again exactly as before
- [ ] A vault looks different from a jump: lower, quicker, tucked, and **leaning forward** over the barrier
- [ ] Pressing jump a second and a half or less before a barrier **vaults** (it waits until the right moment); pressing it much earlier jumps
- [ ] There is always a way through: no group blocks all three lanes with walls
- [ ] **Sliding under a barrier crashes,** and so does **jumping at an overhead bar**
- [ ] Lane changes, the camera, and the rest still work

**If something's wrong**

- **`ObstacleField is not defined` or `OBSTACLE_PIECES is not defined`:** the `obstacles.js` script tag is missing from `index.html`, or comes after `main.js`.
- **`laneX is not defined` in `obstacles.js`:** it has to come after `runner.js`.
- **No obstacles appear:** check `buildObstacles(runner.z)` is called in the frame loop, and that `library.load` loads `OBSTACLE_PIECES`. The console will show a red error for a missing piece.
- **Obstacles are the wrong shape, or all the same size:** the `scale` isn't being used. Check `moveTo` sets `scaling`, and that `pool.acquire` passes the whole obstacle.
- **A reused piece has the wrong size:** `moveTo` isn't setting the scale every time, or `acquire` isn't passing the whole placement.
- **Nothing hurts:** the crash check isn't in the frame loop, or `hits` is wrong. The tests cover `hits` thoroughly, so run them first.
- **He crashes into things he's clearly over:** the numbers in `OBSTACLE_TYPES` don't match what's drawn. Draw the hit boxes to see them (Challenge 1).
- **Jump never vaults:** `field.barrierGap(runner)` isn't being asked, or `VAULT_RANGE` and `VAULT_QUEUE_RANGE` are too small. A press more than 14 units from a barrier is a plain jump.
- **After R there are no obstacles at the start, or old ones are left:** `main.js` isn't resetting the field and releasing what it returns.
- **The runner can change lanes while lying down:** the guard at the top of `moveLane` is missing.

**Experiments** (change one, reload, then change it back):

- `VAULT_QUEUE_RANGE` of `3`: an early press jumps again. Of `30`: nearly every press near a barrier becomes a vault
- `VAULT_RANGE` of `0.5`: the vault leaves it very late. Be careful: more than about 3 and a vault can land before the barrier
- `MIN_GAP` and `MAX_GAP` of `12` and `18`: a much harder course
- A pattern that is all containers: `["container", "container", "container"]`. The tests for *"every pattern can be beaten"* catch it
- `OBSTACLE_TYPES.barrier.top` of `1.4`: a jump can only just clear it. Of `0.4`: it's nearly flat
- `OBSTACLE_TYPES.overhead.bottom` of `1.7`: standing is now fine, and nothing but a tall jump hits it
- `FIRST_GROUP_Z` of `15`: obstacles right at the start

---

## Step 8: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/obstacles.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/world.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/pool.tests.js"></script>
  <script src="tests/stream.tests.js"></script>
  <script src="tests/runner.tests.js"></script>
  <script src="tests/obstacles.tests.js"></script>
  <script src="tests/clips.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **247 passing tests**: the 166 you started with, plus 10 for the vault and the crash, 62 for the obstacles (the kinds, the patterns, hitting, vaulting, the field), 6 for the clips and 3 for the piece library.

> **What these tests don't cover.** They check the logic and the calls the code makes, using stand-ins for Babylon.js. They can't tell you a course is *fun*, that a barrier looks like one, or that a jump feels fair. That check is Step 7, with your own eyes (and your own reflexes).

> **Try breaking something.** In `hits`, delete the `high` test, so the line reads `return across && along;`, and reload `tests.html`. Several tests notice. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Box collisions: overlap across, along and up | `hits` |
| A size that depends on what the runner is doing | `bodyHeight` |
| Each kind of obstacle needs a different move | `OBSTACLE_TYPES` |
| A forgiving move as an assist | the vault and `vaultable` |
| One key, a different move by situation | `lowAhead`, the jump key |
| Courses that can always be beaten | `PATTERNS` and its test |
| A repeatable course, made ahead and dropped behind | `ObstacleField` |
| New shapes from old models | `scale` in `moveTo` |
| A pool that resets pieces fully before reusing them | `moveTo` sets scale every time |
| A crash as a move, not a flag | `crash`, `crashed` |

## Challenges

1. **Draw the hit boxes.** Show each obstacle's box as a wireframe so you can see what is hit and what isn't. (Hint: `MeshBuilder.CreateBox` with `material.wireframe = true`, sized from `halfWidth`, `depth`, `bottom` and `top`.)
2. **A sliding barrier.** Make an obstacle that moves across the street. (Hint: give it an `x` that changes over time, and have the field update the ones that move before the hit test.)
3. **Near misses.** Count how many obstacles the runner passed within half a unit. (Hint: `field.update` knows when an obstacle leaves the hit range.)
4. **More kinds.** Add a low ceiling that you must roll under, or a fence that needs a vault but isn't a barrier. (Hint: the table and the patterns are all you change.)
5. **A harder course as you go.** Make the gaps shrink the farther the runner has gone. (Hint: `MIN_GAP` and `MAX_GAP` could be functions of `z`; the next step adds a speed ramp that fits with this.)

---
