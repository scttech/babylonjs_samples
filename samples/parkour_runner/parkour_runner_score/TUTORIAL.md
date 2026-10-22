# Tutorial: Parkour Runner Score -- Coins, Distance and a Combo

This is the sixth tutorial in the Parkour Runner series. The runner can run, jump, slide, roll and vault, and the street fights back with obstacles, but there is no reason to keep going. In this step the run gets a point. **Coins** to collect, a **distance** that counts up, a **speed** that rises the longer you survive, and a **combo** for getting past obstacles with the right move. All of it is shown on screen with Babylon.js **GUI**. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **score** made of plain numbers: distance, coins, points and a combo with a multiplier, with the rules in one small class
- A **speed ramp**: the runner runs faster as he goes, up to a limit, and his legs keep up
- **Coins** in trails between the groups of obstacles, picked up by touching them
- A **combo** that counts the obstacles you get past with the *right* move (a jump or vault over a barrier, a slide or roll under a bar), and loses it if you are too slow
- A **heads-up display** drawn with Babylon.js GUI: the score, the distance, the coins and the combo
- The score shown when you crash
- Unit tests for all of it

**What you'll learn:** keeping game rules in plain classes so they are testable, scaling difficulty with a ramp that has a cap, how a thing can be in the world without being an obstacle (a coin), recording what the player does while over something so you can judge it afterwards, Babylon.js GUI (`AdvancedDynamicTexture` and `TextBlock`), and driving an animation's speed from game state.

## Where you're starting

This folder is a copy of the finished Obstacles sample, plus empty placeholder files for the new code and its tests:

```
parkour_runner_score/
├── index.html, tests.html
├── js/
│   ├── score.js            (placeholder -- Step 1)
│   ├── hud.js              (placeholder -- Step 4)
│   ├── obstacles.js        (grows -- Step 2)
│   ├── clips.js            (grows -- Step 3)
│   ├── main.js             (changes -- Step 5)
│   └── world.js, runner.js, models.js, camera.js, stream.js, pool.js, splash.js   (from the Obstacles sample)
└── tests/
    ├── score.tests.js      (placeholder -- Step 1)
    ├── hud.tests.js        (placeholder -- Step 4)
    └── obstacles / clips .tests.js grow, and the rest    (from the Obstacles sample)
```

### How the score works

| What | Worth |
|---|---|
| **Distance** | 1 point for every unit run |
| **A coin** | 10 points |
| **A clean move** (the right move for an obstacle) | 25 points |
| **The combo** | Every 3 clean moves in a row raises a **multiplier** by 1, up to **x5**. Coins and clean moves are worth the multiplier. Take more than **5 seconds** to make the next clean move and the combo is lost |

And the speed starts at the runner's normal speed and rises by a little for every unit run, up to a maximum of 30, which it reaches after about 1600 units. From 22 (after 1000) the obstacles come a little closer together too, down to four fifths of the gap at top speed.

### You need a web server for this one

As before, the models can't be loaded from a page opened from a file. Run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/parkour_runner/parkour_runner_score/` (the command prints the exact address), or use the *Live Server* extension in VS Code. (`tests.html` loads no models and works from a file.)

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Obstacles sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**247**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: The score

The rules of scoring are just numbers, so they go in a file of their own with no Babylon.js in it: `js/score.js`. Open the placeholder and replace its contents with:

```js
// How far the runner has gone, how fast he runs because of it, and how many points he
// has: plain numbers (no Babylon.js), so the rules of scoring are easy to test. The
// hud draws them; main.js tells this what has happened. See ../tests/score.tests.js.

// The longer the run, the faster. Speed starts at RUN_SPEED (from runner.js) and
// rises with the distance run, up to MAX_SPEED, where the obstacles come close to
// too fast to beat.
const MAX_SPEED = 30;
const SPEED_RAMP = 0.014; // how much faster for every unit of distance run

// How fast the runner should run, for how far he has gone.
function speedFor(distance) {
  return Math.min(MAX_SPEED, RUN_SPEED + Math.max(0, distance) * SPEED_RAMP);
}

const COIN_POINTS = 10; // for each coin, before the multiplier
const CLEAN_MOVE_POINTS = 25; // for each obstacle got past with the right move, before the multiplier
const COMBO_STEP = 3; // every this many clean moves in a row raises the multiplier by one
const MAX_MULTIPLIER = 5;
const COMBO_TIME = 5; // seconds to make the next clean move before the combo is lost

class Score {
  constructor() {
    this.reset();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MAX_SPEED, SPEED_RAMP, COIN_POINTS, CLEAN_MOVE_POINTS, COMBO_STEP, MAX_MULTIPLIER, COMBO_TIME, speedFor, Score };
} else {
  Object.assign(window, { MAX_SPEED, SPEED_RAMP, COIN_POINTS, CLEAN_MOVE_POINTS, COMBO_STEP, MAX_MULTIPLIER, COMBO_TIME, speedFor, Score });
}
```

Things to notice:

- **`speedFor` is the speed ramp.** It starts at `RUN_SPEED` (from `runner.js`) and adds `SPEED_RAMP` for every unit of distance, but never goes past `MAX_SPEED`. A cap matters: the vault and jump windows you tuned last time get tighter as the street goes by faster, and beyond about 30 they stop being fair.
- **`Math.max(0, distance)`** means a negative distance can't make him slower than he starts.
- **`Score` doesn't know about the screen or the runner.** The game tells it what happened (`collectCoin()`, `cleanMove()`) and asks what the score is. That's what lets the tests cover every rule.
- The class is closed already, and its constructor calls `reset()`, which you add next.

### 1a. Counting

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Back to the start of a run.
  reset() {
    this.distance = 0; // how far he has run, in units
    this.coins = 0; // how many coins he has picked up
    this.points = 0; // points from coins and clean moves (the distance counts too, see total)
    this.combo = 0; // clean moves in a row
    this.comboTimer = 0; // seconds left to make the next one
  }

  // What the points from coins and clean moves are multiplied by: 1 to begin with, one
  // more for every COMBO_STEP clean moves in a row, and never more than MAX_MULTIPLIER.
  get multiplier() {
    return Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.combo / COMBO_STEP));
  }

  // The score: one point for every unit of distance, plus the points he has won.
  get total() {
    return Math.floor(this.distance) + this.points;
  }

  // Records how far he has run. The distance never goes backwards.
  setDistance(distance) {
    this.distance = Math.max(this.distance, distance);
  }
```

Things to notice:

- **`total` is a getter**, worked out from the distance and the points whenever it is asked for, so it can never be out of step with them.
- **`Math.floor`** on the distance: only whole units count, so the score goes up in steps and not in a blur of decimals.
- **`setDistance` never goes backwards.** The game passes in `runner.z - RUNNER_START_Z` each frame, and the score keeps the furthest.
- **`multiplier` is worked out from the combo.** 1 to begin with, one more for every `COMBO_STEP` clean moves in a row, never more than `MAX_MULTIPLIER`.

### 1b. Coins, clean moves and time

Add these three methods **inside the class**, directly above its closing `}`:

```js
  // He has picked up a coin: it counts, and it is worth more with a bigger multiplier.
  collectCoin() {
    this.coins++;
    this.points += COIN_POINTS * this.multiplier;
  }

  // He has got past an obstacle with the right move. The points are worth the
  // multiplier he had *before* this move, and then the combo grows and its timer starts again.
  cleanMove() {
    this.points += CLEAN_MOVE_POINTS * this.multiplier;
    this.combo++;
    this.comboTimer = COMBO_TIME;
  }

  // Moves time on by dt seconds: the combo runs out if he is too slow to make the next move.
  update(dt) {
    if (this.combo === 0) return;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.comboTimer = 0;
    }
  }
```

Things to notice:

- **A clean move is worth the multiplier he had *before* it.** `cleanMove` adds its points first, and only then grows the combo. The move that takes him from x1 to x2 is worth x1; the next is worth x2. It would feel odd, and be harder to explain, for a move to pay out for a multiplier it hadn't earned yet.
- **The timer starts again with every clean move.** `comboTimer` is set to `COMBO_TIME`, and `update(dt)` counts it down. Run out of time and the combo goes, but the **points stay**: only the multiplier is lost.
- **`update` does nothing when there is no combo,** so the timer never counts below zero for nothing.

### 1c. Tests

Replace the placeholder `tests/score.tests.js` with:

```js
QUnit.module("speedFor", () => {
  QUnit.test("starts at the normal running speed", (assert) => {
    assert.strictEqual(speedFor(0), RUN_SPEED);
  });

  QUnit.test("gets faster the further he has run", (assert) => {
    assert.true(speedFor(500) > speedFor(100));
    assert.true(speedFor(100) > speedFor(0));
  });

  QUnit.test("rises by SPEED_RAMP for every unit of distance", (assert) => {
    assert.true(Math.abs(speedFor(100) - (RUN_SPEED + 100 * SPEED_RAMP)) < 1e-9);
  });

  QUnit.test("never goes past MAX_SPEED", (assert) => {
    assert.strictEqual(speedFor(1e6), MAX_SPEED);
  });

  QUnit.test("MAX_SPEED is faster than the start, or there would be no ramp", (assert) => {
    assert.true(MAX_SPEED > RUN_SPEED);
  });

  QUnit.test("a negative distance counts as none", (assert) => {
    assert.strictEqual(speedFor(-50), RUN_SPEED);
  });
});

QUnit.module("Score", () => {
  QUnit.test("starts with nothing", (assert) => {
    const score = new Score();

    assert.strictEqual(score.distance, 0);
    assert.strictEqual(score.coins, 0);
    assert.strictEqual(score.points, 0);
    assert.strictEqual(score.combo, 0);
    assert.strictEqual(score.total, 0);
    assert.strictEqual(score.multiplier, 1);
  });

  QUnit.test("every unit of distance is a point, and only whole units count", (assert) => {
    const score = new Score();

    score.setDistance(12.9);

    assert.strictEqual(score.total, 12);
  });

  QUnit.test("the distance never goes backwards", (assert) => {
    const score = new Score();
    score.setDistance(40);

    score.setDistance(10);

    assert.strictEqual(score.distance, 40);
  });

  QUnit.test("a coin is worth COIN_POINTS and is counted", (assert) => {
    const score = new Score();

    score.collectCoin();

    assert.strictEqual(score.coins, 1);
    assert.strictEqual(score.points, COIN_POINTS);
    assert.strictEqual(score.total, COIN_POINTS);
  });

  QUnit.test("the total adds the distance to the points", (assert) => {
    const score = new Score();
    score.setDistance(100);
    score.collectCoin();

    assert.strictEqual(score.total, 100 + COIN_POINTS);
  });

  QUnit.test("a clean move is worth CLEAN_MOVE_POINTS and starts a combo", (assert) => {
    const score = new Score();

    score.cleanMove();

    assert.strictEqual(score.points, CLEAN_MOVE_POINTS);
    assert.strictEqual(score.combo, 1);
    assert.strictEqual(score.comboTimer, COMBO_TIME);
  });

  QUnit.test("the multiplier rises by one for every COMBO_STEP clean moves", (assert) => {
    const score = new Score();

    for (let i = 0; i < COMBO_STEP - 1; i++) score.cleanMove();
    assert.strictEqual(score.multiplier, 1);

    score.cleanMove();
    assert.strictEqual(score.multiplier, 2);

    for (let i = 0; i < COMBO_STEP; i++) score.cleanMove();
    assert.strictEqual(score.multiplier, 3);
  });

  QUnit.test("the multiplier stops at MAX_MULTIPLIER", (assert) => {
    const score = new Score();

    for (let i = 0; i < COMBO_STEP * MAX_MULTIPLIER * 3; i++) score.cleanMove();

    assert.strictEqual(score.multiplier, MAX_MULTIPLIER);
  });

  QUnit.test("coins are worth more with a multiplier", (assert) => {
    const score = new Score();
    for (let i = 0; i < COMBO_STEP; i++) score.cleanMove();
    const before = score.points;

    score.collectCoin();

    assert.strictEqual(score.points - before, COIN_POINTS * 2);
  });

  QUnit.test("a clean move is worth the multiplier he had before it, not the one it earns", (assert) => {
    const score = new Score();
    for (let i = 0; i < COMBO_STEP - 1; i++) score.cleanMove();
    const before = score.points;

    score.cleanMove(); // the move that raises the multiplier to 2

    assert.strictEqual(score.points - before, CLEAN_MOVE_POINTS);
  });

  QUnit.test("the combo runs out if he is too slow to make the next clean move", (assert) => {
    const score = new Score();
    score.cleanMove();

    score.update(COMBO_TIME - 0.1);
    assert.strictEqual(score.combo, 1, "still going");

    score.update(0.2);
    assert.strictEqual(score.combo, 0, "lost");
    assert.strictEqual(score.multiplier, 1);
  });

  QUnit.test("another clean move starts the timer again", (assert) => {
    const score = new Score();
    score.cleanMove();
    score.update(COMBO_TIME - 0.5);

    score.cleanMove();
    score.update(COMBO_TIME - 0.5);

    assert.strictEqual(score.combo, 2);
  });

  QUnit.test("losing the combo keeps the points already won", (assert) => {
    const score = new Score();
    score.cleanMove();
    score.update(COMBO_TIME + 1);

    assert.strictEqual(score.points, CLEAN_MOVE_POINTS);
  });

  QUnit.test("update() with no combo does nothing", (assert) => {
    const score = new Score();

    score.update(10);

    assert.strictEqual(score.combo, 0);
    assert.strictEqual(score.comboTimer, 0);
  });

  QUnit.test("reset() puts everything back to the start", (assert) => {
    const score = new Score();
    score.setDistance(80);
    score.collectCoin();
    score.cleanMove();

    score.reset();

    assert.strictEqual(score.total, 0);
    assert.strictEqual(score.coins, 0);
    assert.strictEqual(score.combo, 0);
    assert.strictEqual(score.comboTimer, 0);
  });
});
```

Add the script and its tests to `tests.html`: `score.js` after `runner.js`, and `score.tests.js` after `runner.tests.js`:

```html
  <script src="js/score.js"></script>
```
```html
  <script src="tests/score.tests.js"></script>
```

Reload `tests.html`. You should see **268 passing tests** (the 247, plus 21). Note how the tests read like the table in "How the score works": that's the point of keeping the rules in a small class.

---

## Step 2: Coins, and the obstacles you got past

Coins are made the way obstacles are: by the `ObstacleField`, in the same groups of data, from the same pool, drawn by the same code in `main.js`. A coin is just a placement with a size, so the same collision test finds out whether the runner is touching one. What's different is what happens next: a coin is *collected*, not crashed into. The field also learns to say when the runner has got past an obstacle with the right move, for the combo. All of this is in `js/obstacles.js`. Open it.

### 2a. Constants

Replace the comment and the `OBSTACLE_PIECES` line (directly above `PATTERNS`) with:

```js
// Which moves get past each kind of obstacle cleanly, for the combo. A container has
// none: the only way past it is another lane.
const CLEAN_MOVES = {
  barrier: ["jump", "vault"],
  overhead: ["slide", "roll"],
  container: [],
};

// Coins are made with the obstacles, in the gaps between the groups. The coin model
// is about 13 units across at the world's scale, so it is shrunk to half a unit.
const COIN_PIECE = "pickups/coin";
const COIN_SCALE = 0.04;
const COIN_SIZE = 0.54; // how big that makes it
const COIN_HEIGHT = 0.9; // the bottom of a coin is this far above the street: head and chest height
const COIN_SPACING = 2.5; // between one coin of a trail and the next
const COIN_MARGIN = 8; // a trail stays this far from the obstacles at either end of its gap
const MAX_TRAIL = 8; // the most coins in a trail

// Every piece an obstacle or a coin can be made from, each once, so each file is loaded once.
const OBSTACLE_PIECES = [...new Set([...Object.values(OBSTACLE_TYPES).flatMap((type) => type.pieces), COIN_PIECE])];
```

Things to notice:

- **`CLEAN_MOVES` is a table.** For each kind of obstacle, the moves that get past it *cleanly*. A barrier is cleaned by a jump or a vault, an overhead bar by a slide or a roll. A container has none: nothing but a lane change gets round it, and running round it isn't a trick.
- **`COIN_SCALE` is tiny.** The coin model is about 13 units across at the world's scale (everything was scaled up by `WORLD_SCALE`), so it is shrunk to about half a unit, `COIN_SIZE`.
- **`COIN_HEIGHT` is 0.9**: head-and-chest height, so a coin in the runner's lane is touched by a standing or jumping runner but a *sliding* one goes under it. A coin is another reason to choose a move.
- **The coin joins `OBSTACLE_PIECES`**, so `main.js` loads its model with everything else.

Directly below `MAX_GAP`, add a rule that makes the course harder once the runner is fast:

```js
// Once the runner is fast enough, the groups come closer together. From DENSE_SPEED
// the gaps shrink as he speeds up, down to DENSE_GAP_SCALE of what they were at MAX_SPEED.
const DENSE_SPEED = 22;
const DENSE_GAP_SCALE = 0.8;

// What the gaps are multiplied by for a group at distance `z` along the street: 1
// until the runner (who has run that far) reaches DENSE_SPEED, then less and less.
function gapScale(z) {
  const speed = speedFor(z);
  if (speed <= DENSE_SPEED) return 1;
  return 1 - ((1 - DENSE_GAP_SCALE) * (speed - DENSE_SPEED)) / (MAX_SPEED - DENSE_SPEED);
}
```

- **The groups come closer together.** Until the runner reaches `DENSE_SPEED` (22) the gaps are what they were. After that they shrink as he speeds up, until at `MAX_SPEED` they are four fifths of the size. At 30 units a second that's about a second between groups, instead of a second and a half.
- **`gapScale` is worked out from where the group is, not from the runner.** A group's distance says how fast he will be by then (`speedFor` is a function of distance), so the field needn't know anything about the runner, and a seed still gives the same course however the updates are spaced.

### 2b. Making a coin

Add this function **directly above** the comment that begins `// Whether the runner is touching an obstacle`:

```js
// One coin, in the given lane (-1, 0 or 1), at distance `z` along the street. It has
// the same kind of placement as an obstacle, with a size to be touched by, so the same
// collision test works. Its `type` is "coin", which is how the field tells it apart.
function coinAt(lane, z) {
  return {
    type: "coin",
    piece: COIN_PIECE,
    x: laneX(lane),
    y: COIN_HEIGHT,
    z,
    rotationY: 0,
    scale: { x: COIN_SCALE, y: COIN_SCALE, z: COIN_SCALE },
    halfWidth: COIN_SIZE / 2,
    depth: COIN_SIZE,
    bottom: COIN_HEIGHT,
    top: COIN_HEIGHT + COIN_SIZE,
    endZ: z + COIN_SIZE / 2,
  };
}
```

Things to notice:

- **A coin has the same shape as an obstacle:** `halfWidth`, `depth`, `bottom`, `top`, `endZ`. That is why `hits` works on it unchanged.
- **`type: "coin"`** is how the field tells it from an obstacle.

### 2c. Remembering things

In the `_start` method, add three lines below `this.nextGroupZ = this.firstZ;`:

```js
    this.lastGroupZ = 0; // where the group before the next one was: the start of the street, to begin with
    this.touched = new Map(); // obstacle id -> the moves the runner was doing while he was over it
    this.counted = new Set(); // ids of the obstacles already counted as passed
```

- `lastGroupZ` is where the last group was, so a trail can be put in the gap after it.
- `touched` records, for each obstacle, **every move the runner did while he was over it**. That's how a clean move is recognised afterwards.
- `counted` remembers which obstacles have been counted already, so one barrier can't score twice.

### 2d. A trail of coins

Add this method **inside the class**, directly above the comment that begins `// Brings the obstacles up to date`:

```js
  // A trail of coins in one lane, in the gap between the group at `fromZ` and the one
  // at `toZ`, well clear of both. The lane is random, and a trail never has more than
  // MAX_TRAIL coins, or fewer than the gap has room for.
  _makeTrail(fromZ, toZ) {
    const lane = Math.floor(this.random() * (2 * MAX_LANE + 1)) - MAX_LANE;
    const trail = [];
    const start = fromZ + COIN_MARGIN;
    const end = toZ - COIN_MARGIN;
    for (let z = start; z <= end && trail.length < MAX_TRAIL; z += COIN_SPACING) {
      trail.push(this._add(coinAt(lane, z)));
    }
    return trail;
  }
```

Things to notice:

- **A trail is a line of coins in one random lane,** `COIN_SPACING` apart. It only uses the **gap** between two groups, staying `COIN_MARGIN` away from both ends, so a coin is never inside an obstacle and the runner has time to get into the lane.
- **It is capped at `MAX_TRAIL`** coins however long the gap is.
- **It uses the field's own random generator.** That keeps the course repeatable: the same seed still gives the same obstacles *and* the same coins, however the updates are spaced.

### 2e. Making them, and forgetting them

Replace the `update` method with this version. It makes a trail before each group, and forgets what it tracked for anything it drops:

```js
  // Brings the obstacles up to date for a runner at `z`: makes the groups now
  // within `ahead` of him, with a random gap between one group and the next, and
  // drops the ones that are behind him. Returns what changed, { added, removed }, as
  // the street does. Calling it again for the same `z` changes nothing.
  update(z) {
    const added = [];
    const removed = [];

    while (this.nextGroupZ < z + this.ahead) {
      added.push(...this._makeTrail(this.lastGroupZ, this.nextGroupZ));
      added.push(...this._makeGroup(this.nextGroupZ));
      this.lastGroupZ = this.nextGroupZ;
      this.nextGroupZ += (MIN_GAP + this.random() * (MAX_GAP - MIN_GAP)) * gapScale(this.nextGroupZ);
    }

    const back = z - this.behind;
    for (const [id, obstacle] of this.active) {
      if (obstacle.endZ < back) {
        this.active.delete(id);
        this.touched.delete(id);
        this.counted.delete(id);
        removed.push(obstacle);
      }
    }
    return { added, removed };
  }
```

And replace `hit` with this one, which leaves coins alone (touching a coin must never crash him):

```js
  // The obstacle the runner is touching, or null. Coins are not obstacles.
  hit(runner) {
    for (const obstacle of this.active.values()) {
      if (obstacle.type !== "coin" && hits(runner, obstacle)) return obstacle;
    }
    return null;
  }
```

### 2f. Collecting, tracking, passing

Add these three methods **inside the class**, directly above the comment that begins `// How far ahead the next barrier`:

```js
  // The coins the runner is touching. They are picked up: taken out of the field, and
  // returned so the game can hide them.
  collect(runner) {
    const collected = [];
    for (const [id, obstacle] of this.active) {
      if (obstacle.type === "coin" && hits(runner, obstacle)) {
        this.active.delete(id);
        collected.push(obstacle);
      }
    }
    return collected;
  }

  // Remembers what the runner is doing while he is over an obstacle (in its lane and
  // along its length, whatever his height). Call it every frame.
  track(runner) {
    for (const [id, obstacle] of this.active) {
      if (obstacle.type === "coin") continue;
      const across = Math.abs(runner.x - obstacle.x) < obstacle.halfWidth + RUNNER_HALF_WIDTH;
      const along = Math.abs(runner.z - obstacle.z) < obstacle.depth / 2 + RUNNER_HALF_DEPTH;
      if (across && along) {
        if (!this.touched.has(id)) this.touched.set(id, new Set());
        this.touched.get(id).add(runner.move);
      }
    }
  }

  // The obstacles the runner has just got past with the right move: ones he went over,
  // under or through (never just ran by in another lane), that are now behind him. Each is
  // returned once. This is what the combo counts.
  passed(runner) {
    const clean = [];
    for (const [id, obstacle] of this.active) {
      if (obstacle.type === "coin" || this.counted.has(id)) continue;
      if (obstacle.endZ + RUNNER_HALF_DEPTH >= runner.z) continue; // not behind him yet
      this.counted.add(id);
      const moves = this.touched.get(id);
      if (moves && CLEAN_MOVES[obstacle.type].some((move) => moves.has(move))) clean.push(obstacle);
    }
    return clean;
  }
```

Things to notice:

- **`collect` picks up** the coins he is touching, takes them out of the field and returns them, so the game can score them and hide them.
- **`track` is called every frame.** For each obstacle, if the runner is in its lane and along its length (*whatever his height*), it adds his current move to `touched`. That is the difference from `hit`: it doesn't ask whether he was *hit*, only whether he was *over* it, and what he was doing.
- **`passed` judges after the fact.** Once an obstacle is behind him, it checks whether any move he made while over it is in `CLEAN_MOVES` for that kind. If one is, the obstacle is returned (once only, thanks to `counted`). If he was never over it (another lane), it isn't a clean move, and neither is running straight through a barrier... which would have crashed him anyway.
- **A vault counts as clean** even though `hits` ignores a vaulting runner on a barrier: `track` looks at his move, not at whether he was hit.

### 2g. Exports

Replace the export block at the bottom of `obstacles.js` with this one, which adds the new names:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, CLEAN_MOVES, OBSTACLE_PIECES, COIN_PIECE, COIN_HEIGHT, COIN_SPACING, COIN_MARGIN, MAX_TRAIL, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, DENSE_SPEED, DENSE_GAP_SCALE, gapScale, obstacleAt, coinAt, hits, barrierGap, ObstacleField };
} else {
  Object.assign(window, { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, CLEAN_MOVES, OBSTACLE_PIECES, COIN_PIECE, COIN_HEIGHT, COIN_SPACING, COIN_MARGIN, MAX_TRAIL, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, DENSE_SPEED, DENSE_GAP_SCALE, gapScale, obstacleAt, coinAt, hits, barrierGap, ObstacleField });
}
```

### 2h. Tests

Coins are in the field now, and the existing field tests count everything the field makes. Five of them have to look at obstacles only. At the top of the `ObstacleField` module, in `tests/obstacles.tests.js`, below the line `const byPosition = (a, b) => a.z - b.z || a.x - b.x;`, add a helper:

```js
  // The obstacles in a list of things the field made: everything but the coins.
  const solid = (list) => list.filter((o) => o.type !== "coin");
```

Then change these tests to use it:

- *"the first obstacles are a good way from the start, so the runner has time to get going"*: the two lines that use `added` become

```js
    assert.true(solid(added).length > 0);
    assert.true(Math.min(...solid(added).map((o) => o.z)) >= FIRST_GROUP_Z);
```

- *"a group is one pattern: everything in it is at the same distance"*: the first line becomes

```js
    const added = solid(new ObstacleField().update(0).added);
```

- *"groups are spaced between MIN_GAP and MAX_GAP apart"*: the first line becomes

```js
    const everything = solid(runTo(new ObstacleField(), 600, 5));
```

- *"only a bounded number exist at once, however far the runner goes"*: coins add to the count, so raise the limit in the last assertion to

```js
    assert.true(most < 90, `${most} at most`);
```

- *"hit() finds the obstacle the runner is touching, or null"*: the target becomes

```js
    const target = solid(added)[0];
```

Now add the new tests to the **end** of the file:

```js
QUnit.module("coinAt", () => {
  QUnit.test("puts a coin in the middle of its lane, at the distance it is given, at chest height", (assert) => {
    const coin = coinAt(-1, 70);

    assert.strictEqual(coin.type, "coin");
    assert.strictEqual(coin.x, laneX(-1));
    assert.strictEqual(coin.z, 70);
    assert.strictEqual(coin.y, COIN_HEIGHT);
  });

  QUnit.test("is made from the coin model, shrunk to fit", (assert) => {
    const coin = coinAt(0, 0);

    assert.strictEqual(coin.piece, COIN_PIECE);
    assert.true(coin.scale.x < 0.1, "the model is huge at the world's scale");
    assert.strictEqual(coin.scale.x, coin.scale.y);
    assert.strictEqual(coin.scale.x, coin.scale.z);
  });

  QUnit.test("has a box the runner can touch, with a bottom below its top", (assert) => {
    const coin = coinAt(0, 0);

    assert.true(coin.halfWidth > 0 && coin.depth > 0);
    assert.true(coin.top > coin.bottom);
    assert.strictEqual(coin.bottom, COIN_HEIGHT);
  });

  QUnit.test("says where it ends along the street", (assert) => {
    const coin = coinAt(0, 40);

    assert.true(coin.endZ > 40 && coin.endZ < 41);
  });

  QUnit.test("a standing or jumping runner touches it, a sliding or rolling one goes under it", (assert) => {
    const coin = coinAt(0, 30);

    assert.true(hits(runnerAt(0, 0, 30, STANDING_HEIGHT), coin), "standing");
    assert.true(hits(runnerAt(0, 0.5, 30, STANDING_HEIGHT), coin), "jumping");
    assert.false(hits(runnerAt(0, 0, 30, LOW_HEIGHT), coin), "sliding goes under");
  });

  QUnit.test("a runner in another lane doesn't touch it", (assert) => {
    assert.false(hits(runnerAt(laneX(1), 0, 30), coinAt(-1, 30)));
  });

  QUnit.test("OBSTACLE_PIECES includes the coin, so it is loaded with the rest", (assert) => {
    assert.true(OBSTACLE_PIECES.includes(COIN_PIECE));
    assert.strictEqual(new Set(OBSTACLE_PIECES).size, OBSTACLE_PIECES.length);
  });
});

QUnit.module("coins in the field", () => {
  const coinsOf = (field, to = 600, step = 5) => {
    const everything = [];
    for (let z = 0; z <= to; z += step) everything.push(...field.update(z).added);
    return everything.filter((o) => o.type === "coin");
  };

  QUnit.test("the field makes coins as well as obstacles", (assert) => {
    assert.true(coinsOf(new ObstacleField()).length > 20);
  });

  QUnit.test("coins come in trails: a line of them in one lane, COIN_SPACING apart", (assert) => {
    const coins = coinsOf(new ObstacleField(), 100, 5);
    const first = coins.filter((c) => c.x === coins[0].x && c.z < 50);

    assert.true(first.length >= 3);
    for (let i = 1; i < first.length; i++) assert.true(Math.abs(first[i].z - first[i - 1].z - COIN_SPACING) < 1e-9);
  });

  QUnit.test("a trail is never longer than MAX_TRAIL", (assert) => {
    const field = new ObstacleField({ firstZ: 400 }); // a long, empty gap at the start
    const coins = coinsOf(field, 450, 5).filter((c) => c.z < 400);

    assert.strictEqual(coins.length, MAX_TRAIL);
  });

  QUnit.test("coins are well clear of the obstacles: nothing on the street is both", (assert) => {
    const everything = [];
    const field = new ObstacleField({ seed: 4 });
    for (let z = 0; z <= 1500; z += 10) everything.push(...field.update(z).added);
    const coins = everything.filter((o) => o.type === "coin");
    const solids = everything.filter((o) => o.type !== "coin");

    // One assertion for the whole street: checking every pair with its own would be
    // thousands of assertions, and a page of them is slow to draw.
    const tooClose = [];
    for (const coin of coins) {
      for (const solid of solids) {
        const apart = Math.abs(coin.z - solid.z) - solid.depth / 2;
        if (apart <= COIN_MARGIN - 4) tooClose.push(`a coin at ${coin.z} and a ${solid.type} at ${solid.z}`);
      }
    }

    assert.true(coins.length > 50);
    assert.deepEqual(tooClose, []);
  });

  QUnit.test("coins have ids of their own, like everything the field makes", (assert) => {
    const field = new ObstacleField();
    const added = field.update(0).added;

    assert.strictEqual(new Set(added.map((o) => o.id)).size, added.length);
  });

  QUnit.test("the same seed gives the same coins", (assert) => {
    const a = coinsOf(new ObstacleField({ seed: 6 })).map(({ id, ...rest }) => rest);
    const b = coinsOf(new ObstacleField({ seed: 6 })).map(({ id, ...rest }) => rest);

    assert.deepEqual(a, b);
  });

  QUnit.test("coins aren't obstacles: hit() ignores them", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const coin = [...field.active.values()].find((o) => o.type === "coin");

    assert.strictEqual(field.hit(runnerAt(coin.x, 0, coin.z)), null);
  });

  QUnit.test("collect() picks up the coins the runner is touching, and takes them out of the field", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const coin = [...field.active.values()].find((o) => o.type === "coin");

    const collected = field.collect(runnerAt(coin.x, 0, coin.z));

    assert.true(collected.some((c) => c.id === coin.id));
    assert.false(field.active.has(coin.id), "gone from the field");
  });

  QUnit.test("collect() with the runner nowhere near picks up nothing", (assert) => {
    const field = new ObstacleField();
    field.update(0);

    assert.deepEqual(field.collect(runnerAt(laneX(1), 0, -20)), []);
  });

  QUnit.test("a coin can only be picked up once", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const coin = [...field.active.values()].find((o) => o.type === "coin");
    const runner = runnerAt(coin.x, 0, coin.z);

    field.collect(runner);

    assert.deepEqual(field.collect(runner).filter((c) => c.id === coin.id), []);
  });

  QUnit.test("collect() doesn't pick up obstacles", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const barrier = [...field.active.values()].find((o) => o.type !== "coin");

    assert.deepEqual(field.collect(runnerAt(barrier.x, 0, barrier.z)).filter((c) => c.type !== "coin"), []);
  });

  QUnit.test("a coin the runner didn't pick up is dropped once it is far behind", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const ids = [...field.active.values()].filter((o) => o.type === "coin").map((o) => o.id);

    const { removed } = field.update(400);

    for (const id of ids) assert.true(removed.some((o) => o.id === id), "coin " + id);
  });
});

QUnit.module("track and passed", () => {
  // A field with one group of obstacles at a known place: a barrier, an overhead bar and a container.
  const makeField = () => {
    const field = new ObstacleField();
    const barrier = field._add({ ...obstacleAt("barrier", -1, 40, () => 0) });
    const overhead = field._add({ ...obstacleAt("overhead", 0, 40, () => 0) });
    const container = field._add({ ...obstacleAt("container", 1, 40, () => 0) });
    return { field, barrier, overhead, container };
  };

  // Runs a runner along the street past z = 40 doing `move` while he is over the obstacles.
  const pass = (field, x, move) => {
    const cleaned = [];
    for (let z = 30; z <= 55; z += 0.25) {
      const over = z > 36 && z < 44;
      field.track(runnerAt(x, 0, z, STANDING_HEIGHT, over ? move : MOVES.run));
      cleaned.push(...field.passed(runnerAt(x, 0, z)));
    }
    return cleaned;
  };

  QUnit.test("a jump over a barrier is a clean move", (assert) => {
    const { field, barrier } = makeField();

    assert.deepEqual(pass(field, laneX(-1), MOVES.jump).map((o) => o.id), [barrier.id]);
  });

  QUnit.test("so is a vault", (assert) => {
    const { field, barrier } = makeField();

    assert.deepEqual(pass(field, laneX(-1), MOVES.vault).map((o) => o.id), [barrier.id]);
  });

  QUnit.test("a slide under an overhead bar is a clean move, and so is a roll", (assert) => {
    for (const move of [MOVES.slide, MOVES.roll]) {
      const { field, overhead } = makeField();

      assert.deepEqual(pass(field, laneX(0), move).map((o) => o.id), [overhead.id], move);
    }
  });

  QUnit.test("a slide under a barrier isn't the right move for it, so it isn't clean", (assert) => {
    const { field } = makeField();

    assert.deepEqual(pass(field, laneX(-1), MOVES.slide), []);
  });

  QUnit.test("just running through the place isn't clean either", (assert) => {
    const { field } = makeField();

    assert.deepEqual(pass(field, laneX(-1), MOVES.run), []);
  });

  QUnit.test("nothing is clean for a runner who was never in its lane", (assert) => {
    const { field } = makeField();

    // Running down a lane with nothing in it, while pressing every move, earns nothing.
    assert.deepEqual(pass(field, laneX(-1) - 3.5, MOVES.jump), []);
  });

  QUnit.test("a container is never a clean move: the only way past it is another lane", (assert) => {
    const { field } = makeField();

    assert.deepEqual(pass(field, laneX(1), MOVES.jump), []);
  });

  QUnit.test("an obstacle is counted once, even if passed() is asked again", (assert) => {
    const { field } = makeField();
    pass(field, laneX(-1), MOVES.jump);

    assert.deepEqual(field.passed(runnerAt(laneX(-1), 0, 200)), []);
  });

  QUnit.test("passed() says nothing until the obstacle is behind the runner", (assert) => {
    const { field } = makeField();
    for (let z = 36; z <= 40; z += 0.25) field.track(runnerAt(laneX(-1), 0, z, STANDING_HEIGHT, MOVES.jump));

    assert.deepEqual(field.passed(runnerAt(laneX(-1), 0, 40)), [], "still over it");
  });

  QUnit.test("reset() forgets what was tracked and counted", (assert) => {
    const field = new ObstacleField();
    field.touched.set(1, new Set(["jump"]));
    field.counted.add(1);

    field.reset();

    assert.strictEqual(field.touched.size, 0);
    assert.strictEqual(field.counted.size, 0);
  });

  QUnit.test("the tracking of an obstacle that is dropped is dropped too, so the maps stay small", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    for (const o of field.active.values()) field.touched.set(o.id, new Set(["jump"]));
    for (const o of field.active.values()) field.counted.add(o.id);

    field.update(1000);

    assert.true(field.touched.size <= field.active.size);
    assert.true(field.counted.size <= field.active.size);
  });
});

QUnit.module("gapScale", () => {
  // The distance at which the runner first reaches a given speed.
  const distanceAt = (speed) => (speed - RUN_SPEED) / SPEED_RAMP;

  QUnit.test("the gaps are as they were until the runner reaches DENSE_SPEED", (assert) => {
    assert.strictEqual(gapScale(0), 1);
    assert.strictEqual(gapScale(distanceAt(DENSE_SPEED) - 1), 1);
  });

  QUnit.test("then they shrink as he speeds up", (assert) => {
    assert.true(gapScale(distanceAt(DENSE_SPEED) + 100) < 1);
    assert.true(gapScale(distanceAt(DENSE_SPEED) + 200) < gapScale(distanceAt(DENSE_SPEED) + 100));
  });

  QUnit.test("and at top speed they are DENSE_GAP_SCALE of what they were, and no less", (assert) => {
    assert.true(Math.abs(gapScale(distanceAt(MAX_SPEED)) - DENSE_GAP_SCALE) < 1e-9);
    assert.strictEqual(gapScale(1e6), DENSE_GAP_SCALE);
  });

  QUnit.test("a field makes its groups closer together far down the street", (assert) => {
    const firstZ = distanceAt(MAX_SPEED) + 50;
    const field = new ObstacleField({ firstZ });
    const starts = new Set();
    for (let z = firstZ; z <= firstZ + 600; z += 5) {
      for (const o of field.update(z).added) if (o.type !== "coin") starts.add(o.z);
    }
    const sorted = [...starts].sort((a, b) => a - b);

    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      assert.true(gap >= MIN_GAP * DENSE_GAP_SCALE - 1e-9 && gap <= MAX_GAP * DENSE_GAP_SCALE + 1e-9, `${gap}`);
    }
  });
});
```

Reload `tests.html`. You should see **302 passing tests** (268 plus 34).

> **Why test `passed` with a real course?** The helper `pass` runs a runner past a known group at every quarter unit, doing one move while he is over the obstacles. That's the closest a test gets to the game, and it checks the awkward cases: the wrong move, no move, another lane, and counting twice.

---

## Step 3: Legs that keep up

The runner runs faster as the score rises, but the sprint clip plays at the same speed, so his feet would slide across the street like skates. Make the clip's speed follow the runner's. This is in `js/clips.js`. Open it.

### 3a. `clipFor`

In `clipFor`, in the `default` case at the end of the `switch`, replace the `return` with:

```js
      // Running plays faster as the runner does, so his feet keep up with the street.
      return { name: runner.running ? CLIPS.run : CLIPS.idle, loop: true, speed: runner.running ? runner.speed / RUN_SPEED : 1 };
```

`runner.speed / RUN_SPEED` is **1 at the normal speed**, 1.5 at one and a half times as fast, and so on. When he isn't running it is 1, however fast he was going.

### 3b. `ClipPlayer`

So far, asking for the clip that is already playing did nothing, which is what makes it safe to call every frame. But now the *same* clip is asked for at a *different speed* every frame, and it must follow without starting over. Replace the `constructor` and `play` of `ClipPlayer` with:

```js
  // `clips` is a Map from a clip's name to its animation group.
  constructor(clips) {
    this.clips = clips;
    this.current = null; // the name of the clip playing now, if any
    this.speed = 1; // and how fast it is playing
  }

  // Plays the named clip and stops whichever was playing. `loop` says whether it
  // repeats or plays once and holds its last pose, and `speed` how fast (1 is as
  // recorded). Asking for the clip that is already playing does nothing, except
  // follow a change of speed (a runner who is speeding up): it doesn't start again,
  // it just plays faster. So it is safe to call every frame.
  play(name, { loop = true, speed = 1 } = {}) {
    if (name === this.current) {
      if (speed !== this.speed) {
        this.clips.get(name).speedRatio = speed;
        this.speed = speed;
      }
      return;
    }
    const next = this.clips.get(name);
    if (!next) throw new Error(`The character has no clip called "${name}"`);

    if (this.current) this.clips.get(this.current).stop();
    next.start(loop, speed);
    this.current = name;
    this.speed = speed;
  }
```

Things to notice:

- **`speedRatio`** on a Babylon.js `AnimationGroup` changes how fast a clip that is already playing goes, without restarting it. Calling `start` again would snap it back to the first frame every time the speed changed.
- **The player remembers the speed** (`this.speed`), so asking again at the same speed still does nothing.

### 3c. Tests

In `tests/clips.tests.js`, the `clipFor` tests describe a runner with a helper called `doing`. A runner now has a speed, so add it to the helper (the `speed: RUN_SPEED,` is new):

```js
  const doing = (move, extra = {}) => ({ running: true, move, timeLeft: 0, speed: RUN_SPEED, ...extra });
```

Then add these two tests to the `clipFor` module, directly above *"a runner that has stopped stands, looping"*:

```js
  QUnit.test("a runner who is running faster plays the run faster, in step with the street", (assert) => {
    assert.strictEqual(clipFor(doing(MOVES.run, { speed: RUN_SPEED * 1.5 })).speed, 1.5);
    assert.strictEqual(clipFor(doing(MOVES.run, { speed: RUN_SPEED * 2 })).speed, 2);
  });

  QUnit.test("a runner who has stopped stands at normal speed, however fast he was running", (assert) => {
    assert.strictEqual(clipFor(doing(MOVES.run, { running: false, speed: RUN_SPEED * 2 })).speed, 1);
  });
```

and these three to the `ClipPlayer` module, directly above *"can switch back and forth, and a clip starts from the beginning each time"*:

```js
  QUnit.test("asking for the clip that is playing, but faster, speeds it up without starting it again", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop", { speed: 1 });

    player.play("Sprint_Loop", { speed: 1.4 });

    assert.strictEqual(clips.get("Sprint_Loop").starts, 1, "not restarted");
    assert.strictEqual(clips.get("Sprint_Loop").speedRatio, 1.4);
  });

  QUnit.test("it keeps following the speed as it changes", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop", { speed: 1 });

    player.play("Sprint_Loop", { speed: 1.2 });
    player.play("Sprint_Loop", { speed: 1.3 });

    assert.strictEqual(clips.get("Sprint_Loop").speedRatio, 1.3);
    assert.strictEqual(player.speed, 1.3);
  });

  QUnit.test("asking again at the same speed does nothing", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop", { speed: 1.2 });
    clips.get("Sprint_Loop").speedRatio = 99; // would be overwritten if it were set again

    player.play("Sprint_Loop", { speed: 1.2 });

    assert.strictEqual(clips.get("Sprint_Loop").speedRatio, 99);
  });
```

Reload `tests.html`. You should see **307 passing tests** (302 plus 5).

---

## Step 4: The heads-up display

The score has to be seen. This is the first time in the series we draw text over the picture with Babylon.js **GUI** (the Asteroids series did the same). The page's own HTML overlays (the splash, the crash message) are fine for something shown once, but a score that changes every frame belongs to the scene. Open the placeholder `js/hud.js` and replace its contents with:

```js
// The heads-up display: the score, the distance, the coins and the combo, as text drawn
// over the picture with Babylon.js GUI. It only draws what a Score says, and it does
// nothing without a GUI to draw on (so the rest of the game, and the tests, can
// create one without Babylon.js). See ../tests/hud.tests.js.

const HUD_COLOR = "white";
const HUD_OUTLINE = "#050508"; // a dark edge round the letters, so they show against the sky too

class Hud {
  constructor({ ui = null } = {}) {
    this.ui = null;
    this.scoreLabel = null;
    this.distanceLabel = null;
    this.coinsLabel = null;
    this.comboLabel = null;
    if (ui) this.attachTo(ui);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Hud };
} else {
  window.Hud = Hud;
}
```

Things to notice:

- **`Hud` draws what a `Score` says and nothing more.** It doesn't own the score, and doesn't change it.
- **It does nothing without a GUI to draw on.** `ui` is optional, so the rest of the game, and the tests, can make one without Babylon.js. `HUD_OUTLINE` is a dark edge round the letters so they show against the bright sky as well as the street.
- The class is closed already. Its constructor calls `attachTo`, which you add next.

### 4a. The labels

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Makes the labels and adds them to `ui`, an AdvancedDynamicTexture.
  attachTo(ui) {
    this.ui = ui;

    // The top-left corner holds three lines. The page's back button sits on top of the
    // canvas from y = 12 to about y = 46, so they start below it.
    this.scoreLabel = this._label({ top: "56px", fontSize: 32 });
    this.distanceLabel = this._label({ top: "96px", fontSize: 22 });
    this.coinsLabel = this._label({ top: "124px", fontSize: 22 });

    // The combo is in the middle, near the top, so it is hard to miss.
    this.comboLabel = this._label({ top: "56px", fontSize: 40, centered: true });
    this.comboLabel.isVisible = false;

    this.update({ total: 0, distance: 0, coins: 0, combo: 0, multiplier: 1 });
    return this;
  }

  // One piece of text, set up the way they all are. `centered` puts it in the middle of
  // the screen's width instead of the left edge.
  _label({ top, fontSize, centered = false }) {
    const label = new BABYLON.GUI.TextBlock();
    label.color = HUD_COLOR;
    label.fontSize = fontSize;
    label.outlineWidth = 4;
    label.outlineColor = HUD_OUTLINE;
    label.top = top;
    label.height = fontSize + 12 + "px";
    label.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    if (!centered) {
      label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      label.paddingLeft = "20px";
    }
    // These labels span the width of the screen, so don't let them swallow pointer
    // events meant for the canvas underneath.
    label.isHitTestVisible = false;
    this.ui.addControl(label);
    return label;
  }

  // Shows what a Score says. The combo is only on screen while there is one.
  update(score) {
    if (!this.scoreLabel) return;
    this.scoreLabel.text = `Score ${score.total}`;
    this.distanceLabel.text = `${Math.floor(score.distance)} m`;
    this.coinsLabel.text = `Coins ${score.coins}`;
    this.comboLabel.isVisible = score.combo > 0;
    this.comboLabel.text = `COMBO ${score.combo}  x${score.multiplier}`;
  }

  // Removes and disposes the labels, if attached.
  dispose() {
    if (!this.ui) return;
    for (const label of [this.scoreLabel, this.distanceLabel, this.coinsLabel, this.comboLabel]) {
      this.ui.removeControl(label);
      label.dispose();
    }
    this.ui = null;
    this.scoreLabel = null;
    this.distanceLabel = null;
    this.coinsLabel = null;
    this.comboLabel = null;
  }
```

Things to notice:

- **A `TextBlock` is one piece of text.** `_label` makes one the same way every time, so the four labels differ only in what they say and where they are.
- **`top: "56px"`**: the page's *Samples* button sits over the top-left of the canvas down to about y = 46, so the score starts below it. The three lines are 40 and 28 pixels apart.
- **`isHitTestVisible = false`.** A text block spans the whole width of the screen, and would otherwise swallow pointer events meant for the page underneath.
- **The combo is only on screen while there is one:** `isVisible` follows `score.combo > 0`, and its text says the combo and its multiplier.
- **`dispose` takes the labels off the GUI and disposes them,** so an old `Hud` doesn't leave text behind.

### 4b. Tests

Babylon.js isn't loaded for the tests, so they provide stand-ins for just the few GUI pieces the `Hud` uses: a fake text block and a fake GUI that collects the controls added to it. Replace the placeholder `tests/hud.tests.js` with:

```js
// Drawing only needs a few `BABYLON.GUI` pieces to exist, so these tests stub them
// out instead of loading the real engine.
QUnit.module("Hud", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeTextBlock {
    text = "";
    isVisible = true;
    disposed = false;

    dispose() {
      this.disposed = true;
    }
  }

  class FakeUi {
    controls = [];

    addControl(control) {
      this.controls.push(control);
    }
    removeControl(control) {
      this.controls = this.controls.filter((c) => c !== control);
    }
  }

  const scoreOf = (extra = {}) => ({ total: 0, distance: 0, coins: 0, combo: 0, multiplier: 1, ...extra });

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      GUI: {
        TextBlock: FakeTextBlock,
        Control: {
          VERTICAL_ALIGNMENT_TOP: 0,
          HORIZONTAL_ALIGNMENT_LEFT: 0,
        },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("does nothing without a GUI to draw on", (assert) => {
    const hud = new Hud();

    hud.update(scoreOf({ total: 50 }));
    hud.dispose();

    assert.strictEqual(hud.scoreLabel, null);
  });

  QUnit.test("makes four labels on the GUI it is given", (assert) => {
    const ui = new FakeUi();

    new Hud({ ui });

    assert.strictEqual(ui.controls.length, 4);
  });

  QUnit.test("attachTo() works after the fact too", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud();

    hud.attachTo(ui);

    assert.strictEqual(ui.controls.length, 4);
    assert.strictEqual(hud.ui, ui);
  });

  QUnit.test("starts at zero, with no combo on show", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.strictEqual(hud.scoreLabel.text, "Score 0");
    assert.strictEqual(hud.distanceLabel.text, "0 m");
    assert.strictEqual(hud.coinsLabel.text, "Coins 0");
    assert.false(hud.comboLabel.isVisible);
  });

  QUnit.test("none of the labels intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    for (const label of [hud.scoreLabel, hud.distanceLabel, hud.coinsLabel, hud.comboLabel]) {
      assert.false(label.isHitTestVisible);
    }
  });

  QUnit.test("update() shows what the score says", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.update(scoreOf({ total: 345, distance: 120.8, coins: 7 }));

    assert.strictEqual(hud.scoreLabel.text, "Score 345");
    assert.strictEqual(hud.distanceLabel.text, "120 m");
    assert.strictEqual(hud.coinsLabel.text, "Coins 7");
  });

  QUnit.test("the combo shows while there is one, with its multiplier", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.update(scoreOf({ combo: 4, multiplier: 2 }));

    assert.true(hud.comboLabel.isVisible);
    assert.strictEqual(hud.comboLabel.text, "COMBO 4  x2");
  });

  QUnit.test("the combo goes away when it is lost", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    hud.update(scoreOf({ combo: 4, multiplier: 2 }));

    hud.update(scoreOf({ combo: 0 }));

    assert.false(hud.comboLabel.isVisible);
  });

  QUnit.test("dispose() removes and disposes every label", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    const labels = [...ui.controls];

    hud.dispose();

    assert.strictEqual(ui.controls.length, 0);
    assert.true(labels.every((label) => label.disposed));
    assert.strictEqual(hud.ui, null);
  });

  QUnit.test("dispose() twice is harmless", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.dispose();
    hud.dispose();

    assert.strictEqual(hud.scoreLabel, null);
  });
});
```

Add the script and its tests to `tests.html`: `hud.js` after `camera.js`, and `hud.tests.js` after `camera.tests.js`:

```html
  <script src="js/hud.js"></script>
```
```html
  <script src="tests/hud.tests.js"></script>
```

Reload `tests.html`. You should see **317 passing tests** (307 plus 10).

---

## Step 5: Wiring it up

Every piece works on its own. Now `main.js` brings them together.

### 5a. `index.html`

Babylon.js GUI is a separate script. Add it directly below the line that loads the loaders:

```html
  <script src="https://cdn.babylonjs.com/gui/babylon.gui.min.js"></script>
```

Add the two new files to the list of your own scripts. `score.js` goes after `runner.js` and `hud.js` after `camera.js`, so the scripts now read:

```html
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
  <script src="https://cdn.babylonjs.com/gui/babylon.gui.min.js"></script>
  <script src="../../../js/screenshot.js"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/score.js"></script>
  <script src="js/obstacles.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/splash.js"></script>
  <script src="js/main.js"></script>
```

and replace the `.hint` line with one that mentions the score:

```html
  <div class="hint">&larr;/&rarr; (A/D) lanes &middot; &uarr; (W/Space) jump or vault &middot; &darr; (S) slide, or dive in the air &middot; R restart &middot; coins and clean moves score &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Also change the `<title>` to `Parkour Runner Score - Babylon.js`.

### 5b. `js/main.js`

**1. Coins are pieces.** Directly below the `releaseObstacle` function, add:

```js
  // A coin is a piece too, and is given back to the pool the same way once it is picked up.
  const releaseCoin = (coin) => {
    pool.release(coin.piece, obstacleNodes.get(coin.id));
    obstacleNodes.delete(coin.id);
  };
```

**2. The score and the hud.** Directly below the line `const message = document.getElementById("message");`, add the `messageDetail` line, and the score and the hud:

```js
  const messageDetail = message.querySelector("small");

  // The score, and the heads-up display that shows it: text drawn over the picture by
  // Babylon.js GUI.
  const score = new Score();
  const hud = new Hud({ ui: BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("hud", true, scene) });
```

Things to notice:

- **`messageDetail` is the `<small>` inside the crash message,** so the message can say the score as well as "Press R".
- **`CreateFullscreenUI("hud", true, scene)`** makes a GUI the size of the screen, drawn over the scene. `true` means "foreground": drawn on top of everything.

**3. Restarting.** Change the `KeyR` branch of the `keydown` handler so the score starts again too:

```js
    if (event.code === "KeyR") {
      runner.reset();
      for (const piece of stream.reset()) release(piece); // the street starts again too
      for (const obstacle of field.reset()) releaseObstacle(obstacle); // and the obstacles
      message.classList.add("hidden");
      vaultQueued = false;
      score.reset();
      hud.update(score);
      return;
    }
```

**4. The frame loop.** Directly above the line `runner.update(dt);`, add the speed ramp:

```js
    // The longer the run, the faster. (A crashed runner isn't running, so it doesn't matter.)
    runner.speed = speedFor(score.distance);
```

and below `buildObstacles(runner.z);`, add the scoring and the coin spin:

```js
    if (!runner.crashed) {
      // The score: the distance run, any coins he has touched, and any obstacle he has
      // just got past with the right move.
      score.setDistance(runner.z - RUNNER_START_Z);
      score.update(dt);
      for (const coin of field.collect(runner)) {
        score.collectCoin();
        releaseCoin(coin);
      }
      field.track(runner);
      for (const _ of field.passed(runner)) score.cleanMove();
      hud.update(score);
    }

    // Coins spin, all together, so the trail glints as he runs.
    const spin = performance.now() / 400;
    for (const obstacle of field.active.values()) {
      if (obstacle.type === "coin") obstacleNodes.get(obstacle.id).rotation.y = spin;
    }
```

**5. The crash message.** In the crash check, add a line that puts the score in the message, so it reads:

```js
    // Running into something ends the run.
    if (!runner.crashed && field.hit(runner)) {
      runner.crash();
      messageDetail.textContent = `Score ${score.total} \u00b7 Press R to run again`;
      message.classList.remove("hidden");
    }
```

Things to notice:

- **The ramp is set *before* the runner updates,** so the speed he moves at this frame is the one the distance says.
- **Scoring only happens while he is alive.** A crashed runner isn't running, so the distance doesn't grow and no coins or moves count.
- **Each frame: speed, move, build, score, check for a crash, then draw.** The score for the frame he crashes is already counted when the message shows it.
- **`collect` returns the coins, and `releaseCoin` hands them back to the pool.** The same thing the street and obstacles do for pieces that are no longer needed, so a collected coin can be the next coin made ahead.
- **Coins spin** with one shared angle, `performance.now() / 400`, so the whole trail glints together.

---

## Step 6: Try it

Serve the page and open it. The first coins are a few seconds in, in the gap before the first group of obstacles.

- [ ] The **score, distance and coins** show at the top-left, below the *Samples* button, and the score counts up as you run
- [ ] **Coins** (gold discs) come in trails in one lane, and spin. Running through one adds **10** and the coin count goes up by one, and the coin vanishes
- [ ] A **sliding** runner goes under a coin without picking it up; a standing or jumping runner takes it
- [ ] Getting past a **barrier** with a jump or vault, or an **overhead bar** with a slide or roll, starts a **COMBO** in the middle of the screen, and adds 25
- [ ] Going round a container (or in a lane with nothing) isn't a clean move: it adds nothing to the combo
- [ ] Every **3 clean moves in a row** raises the multiplier (x2, x3 ...) and coins are worth more
- [ ] Taking more than about **5 seconds** to make the next clean move loses the combo
- [ ] After a minute, the runner is clearly **faster**, and his legs keep up
- [ ] Crashing shows **Crashed!** and **Score N**, and **R** starts again from zero
- [ ] Lane changes, the camera, and everything else still work

**If something's wrong**

- **`Score is not defined` or `Hud is not defined`:** the `score.js` or `hud.js` script tag is missing from `index.html`, or comes after `main.js`.
- **`BABYLON.GUI is undefined`:** the `babylon.gui.min.js` script isn't loaded.
- **No text on screen:** check `hud.update(score)` is called every frame, and that the GUI is made with the `scene` as its third argument.
- **The text is under the *Samples* button:** the `top` values are too small.
- **No coins:** check `OBSTACLE_PIECES` contains `COIN_PIECE`, and the console for a red error about a missing file.
- **Coins are huge or tiny:** the `scale` in `coinAt`; the model is about 13 units across.
- **Coins can't be picked up:** `field.collect(runner)` isn't called in the frame loop.
- **Coins crash him:** `hit` isn't skipping `type === "coin"`.
- **The combo never starts:** `field.track(runner)` isn't called every frame, or `passed` is, but the loop that calls `score.cleanMove()` isn't.
- **A combo for running round a container:** `CLEAN_MOVES.container` isn't empty.
- **His feet slide at higher speeds:** `clipFor` isn't dividing by `RUN_SPEED`, or `ClipPlayer.play` still returns early for a different speed.
- **Score keeps counting after a crash:** the scoring isn't inside `if (!runner.crashed)`.

**Experiments** (change one, reload, then change it back):

- `SPEED_RAMP` of `0.02`: the street is at top speed in a few seconds. Of `0`: no ramp
- `DENSE_GAP_SCALE` of `0.5`: groups at top speed are only half as far apart. Of `1`: the groups never get closer
- `MAX_SPEED` of `40`: it gets very hard. Notice that vaults and jumps stop being fair
- `COMBO_TIME` of `1.5`: you must be quick or lose it. Of `30`: it never runs out
- `COMBO_STEP` of `1`: every clean move raises the multiplier
- `COIN_HEIGHT` of `0.1`: coins are at your feet, so a slide picks them up too
- `COIN_SPACING` of `1`: dense trails. Of `5`: sparse
- `MAX_TRAIL` of `3`: only short trails

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/score.js"></script>
  <script src="js/obstacles.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/world.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/pool.tests.js"></script>
  <script src="tests/stream.tests.js"></script>
  <script src="tests/runner.tests.js"></script>
  <script src="tests/score.tests.js"></script>
  <script src="tests/obstacles.tests.js"></script>
  <script src="tests/clips.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/hud.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **317 passing tests**: the 247 you started with, plus 21 for the score and the speed ramp, 34 for the coins, tracking, passing and the closer groups, 5 for the faster clip and 10 for the hud.

> **What these tests don't cover.** They check the rules and the calls the code makes, using stand-ins for Babylon.js. They can't tell you the coins *look* right, that the text is readable, or that the speed ramp feels fair. That check is Step 6, with your own eyes.

> **Try breaking something.** In `cleanMove`, swap the two lines so the combo grows *before* the points are added. A test notices, because the points are now worth the multiplier the move earned and not the one he had. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Game rules in a plain, testable class | `Score` |
| A difficulty ramp with a cap | `speedFor` |
| Something in the world that isn't an obstacle | `coinAt`, `type: "coin"` |
| Items made in the gaps between others | `_makeTrail` |
| Collecting: removing from the world and telling the game | `collect` |
| Judging the player after the fact, from what they did while over something | `track`, `passed`, `CLEAN_MOVES` |
| A combo with a multiplier that expires | `cleanMove`, `update` |
| Driving an animation's speed from game state | `clipFor`, `speedRatio` |
| Text over the picture | `Hud`, Babylon.js GUI `TextBlock` |

## Challenges

1. **A coin sound.** Play a short sound when a coin is picked up. (Hint: the Asteroids series makes sounds from the Web Audio API; the polish step of this series will too.)
2. **A best score.** Remember the highest score across runs and show it with the crash message. (Hint: `localStorage`, in a `try`/`catch` for browsers that don't allow it.)
3. **Magnet coins.** Make coins within two units of the runner slide towards him. (Hint: move them in `main.js` before `collect`, or ask the field to move the nearby ones.)
4. **A different ramp.** Make the speed rise quickly at first and then level off. (Hint: replace the straight line in `speedFor` with a curve, such as `MAX_SPEED - (MAX_SPEED - RUN_SPEED) * Math.exp(-distance / 400)`. The tests for the ramp's start and cap should still pass.)
5. **Near misses.** Give a small bonus for passing an obstacle without touching its edge. (Hint: `track` could also record the smallest gap he was from the obstacle's side.)

---
