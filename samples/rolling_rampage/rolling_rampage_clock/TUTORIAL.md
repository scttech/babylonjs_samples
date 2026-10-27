# Tutorial: Rolling Rampage Clock -- A Goal, Checkpoints and a Countdown

This is the fifth tutorial in the Rolling Rampage series. Until now you could roll around a level for as long as you liked, and there was nothing to roll *to*. In this step the level becomes a game. There is a **clock** counting down, a **goal** to roll into, and **checkpoints** on the way that add bonus seconds and are where you start again if you fall off. Reach the goal and the next level comes up; run out of time and you try again. The goal and the checkpoints are **zones**, round patches of floor that do something when the marble rolls into them, and they are made with Havok **triggers**: bodies that report an overlap without ever getting in the marble's way. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **`Run`**: one attempt at a level, as plain numbers: the time left, whether it is ready, running, won or lost, and the bonuses already paid
- **Zones as level data**: a goal and checkpoints for each level, each with a place, and a bonus and a time limit
- **Trigger zones** in the physics world: a glowing disc to see and an invisible trigger to feel, that tell the game when the marble rolls in, and nothing else
- A **clock and a banner** on the page: the time, a warning when it is nearly out, and big words for a checkpoint, the goal and the time running out
- **Starting again from a checkpoint** when the marble falls off, instead of from the very start
- A marble that **rolls to the middle of the goal and rests there**, and a goal that changes colour like a checkpoint does, so a win is something you can see
- Unit tests for all of it, **including a real marble** rolling into, through and out of the zones

**What you'll learn:** a state machine for a game's rules kept apart from the screen, why a clock counts in seconds and not frames, physics **trigger** shapes (`isTriggerShape`) and `onTriggerCollisionObservable`, telling what entered a trigger, a visible thing and an invisible one that go together, taking zones away and building them again with each level, and a timer that must not act on a level that has gone.

## Where you're starting

This folder is a copy of the finished Levels sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_clock/
├── index.html, tests.html   (change -- Steps 1, 2 and 4)
├── css/
│   ├── theme.css, page.css, splash.css, buttons.css, responsive.css,
│   │   stick.css, tilt.css, levels.css     (the Levels sample's stylesheet, split up)
│   └── hud.css             (new -- Step 4)
├── js/
│   ├── clock.js            (placeholder -- Step 1)
│   ├── zones.js            (placeholder -- Steps 2 and 3)
│   ├── level.js            (changes -- Step 2)
│   ├── marble.js           (changes -- Step 5)
│   ├── main.js             (changes -- Step 5)
│   └── physics.js, course.js, steering.js, controls.js, tilt.js, camera.js, splash.js   (from the Levels sample)
└── tests/
    ├── clock.tests.js      (placeholder)
    ├── zones.tests.js      (placeholder)
    └── marble.tests.js grows (Step 5), and the rest   (from the Levels sample)
```

### The stylesheet is split up

The Levels sample had one `css/game.css`, and by now it had grown past 300 lines, with a comment above each part saying what it styled. From here on **each part has a file of its own**, named for what it styles, and `index.html` links them one after another:

| File | What it styles |
|---|---|
| `theme.css` | the fonts, and the colours and font names every other file uses |
| `page.css` | the hint and the back button, and a page that must not scroll or zoom |
| `splash.css` | the loading screen |
| `buttons.css` | the hazard-striped buttons, and *Drop again* |
| `responsive.css` | changes for a small screen |
| `stick.css` | the thumb's ring and knob, and the touch hint |
| `tilt.css` | the tilt buttons, words and gauge |
| `levels.css` | the name of the level, and *Next level* |
| `hud.css` | the clock and the banner (**you write this one, in Step 4**) |

The order of the `<link>` lines is the order the rules are read in, and so the order that decides which of two rules wins. It is the order of the table. `reset-tutorial.js` makes the split for you (it cuts `game.css` at the comment above each part), and it changes nothing about how the page looks.

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_clock/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Levels sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**264**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step. Where a step adds a long function, paste it **whole**, below the closing `}` of the one above it.

---

## Step 1: The clock

The rules of a run don't need a screen or a physics engine, so they go in a file with neither. A **run** is one attempt at a level, and it is always in one of four states:

| State | Meaning |
|---|---|
| `ready` | made, but the clock hasn't started (the splash is still up) |
| `running` | the clock is counting down, and the player can steer |
| `won` | the goal was reached, with some time to spare |
| `timeup` | the clock ran out |

Keeping the state as one word, with a few methods that change it, means every rule has one place to live, and the rest of the game just asks `run.status`. Open the placeholder `js/clock.js` and replace its contents with:

```js
// The clock: how a run of a level is going. How much time is left, whether the player has won or
// run out, and the bonus seconds for reaching a checkpoint. It is all plain numbers and words, with
// no Babylon.js and no page, so every rule is easy to test. See ../tests/clock.tests.js.

const TIME_LOW = 10; // when this many seconds are left, the clock warns the player

// Seconds as a clock shows them: "0:42". It rounds up, so the clock only says "0:00" when the
// time is truly out, and a player with 0.2 seconds left isn't told they have none.
function formatTime(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

// One attempt at a level. It is always in one of these states:
//   ready    made, but not started (the splash is still up)
//   running  the clock is counting down, and the player can steer
//   won      the goal was reached, with `remaining` seconds to spare
//   timeup   the clock ran out
// `level` is the grid of a level (or anything with a `time` and a list of `checkpoints`, each with
// a `bonus` in seconds).
class Run {
  constructor(level) {
    this.remaining = level.time;
    this.bonuses = level.checkpoints.map((checkpoint) => checkpoint.bonus);
    this.reached = new Set(); // the checkpoints already reached
    this.status = "ready";
  }

  // Start the clock. Does nothing unless the run is ready.
  start() {
    if (this.status === "ready") this.status = "running";
  }

  // Let `dt` seconds go by. Only a running clock counts down, and it stops at zero, and the run is over.
  tick(dt) {
    if (this.status !== "running") return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining === 0) this.status = "timeup";
  }

  // The marble has reached a checkpoint. The first time, it adds that checkpoint's bonus seconds to
  // the clock and says how many; after that, or when the run isn't running, it does nothing and says 0.
  reachCheckpoint(index) {
    if (this.status !== "running" || this.reached.has(index)) return 0;
    this.reached.add(index);
    this.remaining += this.bonuses[index];
    return this.bonuses[index];
  }

  // The marble has reached the goal. Says whether that won the run: only a running one can be won.
  finish() {
    if (this.status !== "running") return false;
    this.status = "won";
    return true;
  }

  // Whether to warn the player that the time is nearly out.
  get low() {
    return this.status === "running" && this.remaining <= TIME_LOW;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TIME_LOW, formatTime, Run };
} else {
  Object.assign(window, { TIME_LOW, formatTime, Run });
}
```

Things to notice:

- **The clock counts in seconds, from `dt`.** `tick` is given how long the last frame took, as the camera's easing is, so a phone drawing 30 frames a second and a monitor drawing 144 both lose one second a second.
- **`formatTime` rounds up.** A clock that said `0:00` with a fifth of a second left would tell a player they were out of time while they could still win. It says `0:00` only when the time really is out.
- **A run only counts while it is `running`.** Before the splash has gone it is `ready`, and after a win or a loss it is frozen, so none of the methods have to be careful about *when* they are called.
- **A bonus is paid once.** `reached` remembers which checkpoints have been reached, so a marble that rolls back over one doesn't get the seconds twice.
- **The bonus can save a run.** `reachCheckpoint` adds the seconds to `remaining` and doesn't touch the status, so a checkpoint reached in the last half second keeps the run going.
- **`finish` says whether it worked.** Only a running run can be won, so a marble that rolls into the goal after the time has run out doesn't turn a lost run into a won one.
- **`low` is a getter**, so the page can ask "should the clock be warning?" without knowing the number.

### Tests

Add the new script and its tests to `tests.html`, after `level.js` and `level.tests.js`:

```html
  <script src="js/clock.js"></script>
  <script src="tests/clock.tests.js"></script>
```

(The first goes in the list of game scripts, the second in the list of tests.) Now open the placeholder `tests/clock.tests.js` and replace its contents with:

```js
QUnit.module("formatTime", () => {
  QUnit.test("shows minutes and seconds, with the seconds always two digits", (assert) => {
    assert.strictEqual(formatTime(42), "0:42");
    assert.strictEqual(formatTime(5), "0:05");
    assert.strictEqual(formatTime(60), "1:00");
    assert.strictEqual(formatTime(125), "2:05");
  });

  QUnit.test("rounds up, so it only says 0:00 when the time is really out", (assert) => {
    assert.strictEqual(formatTime(41.2), "0:42");
    assert.strictEqual(formatTime(0.01), "0:01");
    assert.strictEqual(formatTime(0), "0:00");
  });

  QUnit.test("never shows a negative time", (assert) => {
    assert.strictEqual(formatTime(-3), "0:00");
  });
});

QUnit.module("Run", () => {
  const level = { time: 40, checkpoints: [{ bonus: 10 }, { bonus: 5 }] };
  const running = () => {
    const run = new Run(level);
    run.start();
    return run;
  };

  QUnit.test("starts ready, with all its time, and doesn't count down until it is started", (assert) => {
    const run = new Run(level);

    run.tick(5);

    assert.strictEqual(run.status, "ready");
    assert.strictEqual(run.remaining, 40);
  });

  QUnit.test("starting makes it running, and it counts down", (assert) => {
    const run = running();

    run.tick(1.5);

    assert.strictEqual(run.status, "running");
    assert.strictEqual(run.remaining, 38.5);
  });

  QUnit.test("it stops at zero, and the time is up", (assert) => {
    const run = running();

    run.tick(39.9);
    assert.strictEqual(run.status, "running");

    run.tick(5);
    assert.strictEqual(run.remaining, 0, "not below zero");
    assert.strictEqual(run.status, "timeup");
  });

  QUnit.test("when the time is up it stays up, and can't be started again", (assert) => {
    const run = running();
    run.tick(100);

    run.start();
    run.tick(10);

    assert.strictEqual(run.status, "timeup");
    assert.strictEqual(run.remaining, 0);
  });

  QUnit.test("reaching a checkpoint adds its bonus, and says how much", (assert) => {
    const run = running();
    run.tick(5);

    assert.strictEqual(run.reachCheckpoint(0), 10);

    assert.strictEqual(run.remaining, 45);
  });

  QUnit.test("each checkpoint's bonus is paid once, and the others are separate", (assert) => {
    const run = running();

    assert.strictEqual(run.reachCheckpoint(0), 10);
    assert.strictEqual(run.reachCheckpoint(0), 0, "again");
    assert.strictEqual(run.reachCheckpoint(1), 5, "another one");
    assert.strictEqual(run.remaining, 55);
  });

  QUnit.test("a checkpoint before the run starts, or after it is over, gives nothing", (assert) => {
    const ready = new Run(level);
    assert.strictEqual(ready.reachCheckpoint(0), 0);
    assert.strictEqual(ready.remaining, 40);

    const over = running();
    over.tick(100);
    assert.strictEqual(over.reachCheckpoint(0), 0);
    assert.strictEqual(over.remaining, 0);

    const won = running();
    won.finish();
    assert.strictEqual(won.reachCheckpoint(0), 0);
  });

  QUnit.test("a bonus that arrives just in time saves the run", (assert) => {
    const run = running();
    run.tick(39.5);

    run.reachCheckpoint(0);

    assert.strictEqual(run.status, "running");
    assert.true(Math.abs(run.remaining - 10.5) < 1e-9);
  });

  QUnit.test("reaching the goal wins a running run, and keeps the time that was left", (assert) => {
    const run = running();
    run.tick(12);

    assert.true(run.finish());

    assert.strictEqual(run.status, "won");
    assert.strictEqual(run.remaining, 28);
  });

  QUnit.test("a won run stops counting down", (assert) => {
    const run = running();
    run.finish();

    run.tick(10);

    assert.strictEqual(run.remaining, 40);
  });

  QUnit.test("the goal doesn't win a run that hasn't started, one that is over, or one already won", (assert) => {
    const ready = new Run(level);
    assert.false(ready.finish());
    assert.strictEqual(ready.status, "ready");

    const over = running();
    over.tick(100);
    assert.false(over.finish());
    assert.strictEqual(over.status, "timeup");

    const won = running();
    won.finish();
    assert.false(won.finish());
  });

  QUnit.test("it warns when the time is nearly out, and only while it is running", (assert) => {
    const run = new Run(level);
    assert.false(run.low, "not before it starts");

    run.start();
    assert.false(run.low, "plenty of time");

    run.tick(40 - TIME_LOW);
    assert.true(run.low, "at the warning time");

    run.reachCheckpoint(0);
    assert.false(run.low, "a bonus lifts it clear again");

    run.tick(100);
    assert.false(run.low, "and not once it is over");
  });
});
```

Things to notice:

- **The tests for `Run` read like the rules.** *Starts ready, with all its time. It stops at zero. A bonus is paid once. A bonus that arrives just in time saves the run. The goal doesn't win a run that is over.* If a rule is ever argued about, the test is the answer.
- **`running()` is a small helper** that makes a started run, so each test only has to say what is special about it.

Open `tests.html`. You should see **279 passing tests**: the 264 you started with and 15 new ones.

---

## Step 2: Zones are level data

Each level needs to say how long the player has, where the goal is, and where the checkpoints are and what they are worth. That is level data, so it goes in `LEVELS`, in the same grid units as the start. Open `js/level.js`.

Replace the comment above `LEVELS` with:

```js
// The levels. In the grid, rows go along z and columns along x, so on the screen the first
// column is the corner at the left, and the rows climb away to the right. `start` is a
// { col, row } in the grid, between corners if it likes. So are the goal and the checkpoints, which
// are zones a marble rolls into: the goal wins the level, and a checkpoint is where a marble that
// falls is put back, and gives `bonus` seconds more. `time` is how many seconds the player has.
// A zone sits on flat floor, so its disc lies flat on it.
```

In **Practice Run**, directly below its `start:` line, add:

```js
    time: 40,
    goal: { col: 11, row: 10 },
    checkpoints: [{ col: 11, row: 2, bonus: 10 }],
```

In **The Bridge**, directly below its `start:` line, add:

```js
    time: 50,
    goal: { col: 15, row: 4 },
    checkpoints: [{ col: 8, row: 4, bonus: 12 }],
```

`parseLevel` has to carry the new fields over, since everything else works with the parsed grid. Replace it with:

```js
// A level's grid as numbers: `heights[row][col]` is the height of a corner in world units, or
// null where the grid has a dot.
function parseLevel(level) {
  return {
    name: level.name,
    cols: level.rows[0].length,
    rows: level.rows.length,
    heights: level.rows.map((row) => [...row].map((ch) => (ch === "." ? null : Number(ch) * HEIGHT_STEP))),
    start: level.start,
    time: level.time,
    goal: level.goal,
    checkpoints: level.checkpoints,
  };
}
```

And `levelStart` is given the choice of where to start, since a marble that falls will start again from a checkpoint. Replace it with:

```js
// Where a marble starts: above the floor at the level's start, so it drops on to it. Give a
// `point` ({ col, row }, such as a checkpoint) to start there instead.
function levelStart(grid, point = grid.start) {
  const x = point.col * CELL;
  const z = point.row * CELL;
  return { x, y: heightAt(grid, x, z) + MARBLE_RADIUS + DROP_HEIGHT, z };
}
```

Things to notice:

- **Zones sit on flat floor.** A zone is drawn as a disc lying on the floor, so the floor under it has to be level or the disc would sink into a slope. The tests below check every zone of every level, all the way round its edge.
- **`levelStart(grid, point = grid.start)`** has a default, so everything that calls it with no `point` still works, and a checkpoint can be passed instead.
- **Where to put them is a design choice.** The goal goes where the level ends, and a checkpoint where a fall would cost the most: after the long ramp in the first level, in the middle of the bridge in the second.

Now the zones themselves. Open the placeholder `js/zones.js` and replace its contents with:

```js
// Zones: the goal and the checkpoints of a level. Each is a round patch of floor that does
// something when the marble rolls into it. The marble isn't stopped by one: a zone is a physics
// body that is a "trigger", which Havok only reports an overlap with. Whether there is a zone, and
// where, is level data, and is plain numbers; the rest builds them in a scene. See ../tests/zones.tests.js.

const ZONE_RADIUS = 1.5; // how far a zone reaches from its centre, in world units
const ZONE_BORDER = 0.3; // the width of the hazard-striped border round the disc, outside the trigger
const ZONE_HEIGHT = 3; // how tall the invisible trigger is, so a marble on a slope, or falling in, still touches it
const ZONE_COLORS = { goal: "#f6bf0e", checkpoint: "#248de3", taken: "#757d8e" }; // the logo's yellow and blue, and steel

// The zones of a level, goal first and then the checkpoints, as { kind, index, col, row }. A
// checkpoint also has its `bonus`. The index of a checkpoint is its place in the level's list.
function levelZones(grid) {
  return [
    { kind: "goal", index: 0, col: grid.goal.col, row: grid.goal.row },
    ...grid.checkpoints.map((checkpoint, index) => ({ kind: "checkpoint", index, ...checkpoint })),
  ];
}

// Where a zone is in the world: the middle of it, on the floor.
function zonePosition(grid, zone) {
  const x = zone.col * CELL;
  const z = zone.row * CELL;
  return { x, y: heightAt(grid, x, z), z };
}

// Diagonal black and yellow stripes, drawn in code on a canvas: the hazard stripes of the buttons and of the
// logo. The stripes are at 45 degrees and as wide as a quarter of the picture, so the picture can repeat
// across a border without a seam.
function makeStripeTexture(scene, size = 128) {
  const texture = new BABYLON.DynamicTexture("zone-stripes", size, scene, true);
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  const context = texture.getContext();
  const stripe = size / 4;
  context.fillStyle = "#0b0909"; // the logo's black outline
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#f6bf0e"; // and its hazard yellow
  for (let x = -size; x < size * 2; x += stripe * 2) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + stripe, 0);
    context.lineTo(x + stripe + size, size);
    context.lineTo(x + size, size);
    context.closePath();
    context.fill();
  }
  texture.update();
  return texture;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ZONE_RADIUS, ZONE_BORDER, ZONE_HEIGHT, ZONE_COLORS, levelZones, zonePosition, makeStripeTexture };
} else {
  Object.assign(window, { ZONE_RADIUS, ZONE_BORDER, ZONE_HEIGHT, ZONE_COLORS, levelZones, zonePosition, makeStripeTexture });
}
```

Things to notice:

- **`levelZones` puts the goal and the checkpoints in one list**, each as `{ kind, index, col, row }`, so the code that builds them has one thing to loop over. A checkpoint's `index` is its place in the level's own list, which is also what `Run` uses for its bonuses.
- **The colours are the logo's.** Yellow for the goal, blue (the one cool colour, for good things) for a checkpoint, and steel grey for one that has been used.
- **Every zone sits in a hazard-striped border**, black and yellow like the buttons and the logo, `ZONE_BORDER` wide and outside the disc. The stripes are drawn in code on a canvas, in `makeStripeTexture`, the same way the floor's checkers are: diagonal at 45 degrees, each stripe a quarter of the picture wide, so the picture can repeat round the border (`WRAP_ADDRESSMODE`) without a seam. The border is part of what has to lie flat, so the floor test (below) checks it too.

### Tests

Add the new script and its tests to `tests.html`, after `clock.js` and `clock.tests.js`:

```html
  <script src="js/zones.js"></script>
  <script src="tests/zones.tests.js"></script>
```

Open the placeholder `tests/zones.tests.js` and replace its contents with:

```js
QUnit.module("the clock and zones of a level", () => {
  QUnit.test("every level has some time, a goal and checkpoints worth having", (assert) => {
    for (const level of LEVELS) {
      assert.true(level.time > 0, `${level.name} has time`);
      assert.strictEqual(typeof level.goal.col, "number");
      assert.strictEqual(typeof level.goal.row, "number");
      for (const checkpoint of level.checkpoints) assert.true(checkpoint.bonus > 0, `${level.name}: a checkpoint pays a bonus`);
    }
  });

  QUnit.test("parseLevel keeps the time, the goal and the checkpoints", (assert) => {
    const level = { name: "T", start: { col: 0, row: 0 }, rows: ["00", "00"], time: 33, goal: { col: 1, row: 1 }, checkpoints: [{ col: 0, row: 1, bonus: 7 }] };

    const grid = parseLevel(level);

    assert.strictEqual(grid.time, 33);
    assert.deepEqual(grid.goal, { col: 1, row: 1 });
    assert.deepEqual(grid.checkpoints, [{ col: 0, row: 1, bonus: 7 }]);
  });

  QUnit.test("levelStart can start somewhere other than the start, such as a checkpoint", (assert) => {
    const grid = parseLevel(LEVELS[0]);
    const checkpoint = grid.checkpoints[0];

    const start = levelStart(grid, checkpoint);

    assert.strictEqual(start.x, checkpoint.col * CELL);
    assert.strictEqual(start.z, checkpoint.row * CELL);
    assert.true(Math.abs(start.y - (heightAt(grid, start.x, start.z) + MARBLE_RADIUS + DROP_HEIGHT)) < 1e-9);
  });

  QUnit.test("every zone of every level is on flat floor, all the way round", (assert) => {
    const problems = [];
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      for (const zone of levelZones(grid)) {
        const at = zonePosition(grid, zone);
        const reach = ZONE_RADIUS + ZONE_BORDER; // the border has to lie flat too
        const edges = [[reach, 0], [-reach, 0], [0, reach], [0, -reach]];
        for (const [dx, dz] of edges) {
          const height = heightAt(grid, at.x + dx, at.z + dz);
          if (height === null || Math.abs(height - at.y) > 1e-9) problems.push(`${level.name}: ${zone.kind} ${zone.index} at ${dx}, ${dz}: ${height} not ${at.y}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("no zone is on the start, and no two zones overlap", (assert) => {
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      const zones = levelZones(grid);
      const start = levelStart(grid);
      for (const zone of zones) {
        const at = zonePosition(grid, zone);
        assert.true(Math.hypot(at.x - start.x, at.z - start.z) > (ZONE_RADIUS + ZONE_BORDER) * 2, `${level.name}: ${zone.kind} ${zone.index} is clear of the start`);
      }
      for (let i = 0; i < zones.length; i++) {
        for (let j = i + 1; j < zones.length; j++) {
          const a = zonePosition(grid, zones[i]);
          const b = zonePosition(grid, zones[j]);
          assert.true(Math.hypot(a.x - b.x, a.z - b.z) > (ZONE_RADIUS + ZONE_BORDER) * 2, `${level.name}: zones ${i} and ${j} apart`);
        }
      }
    }
  });
});

QUnit.module("makeStripeTexture", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("is a square of the size it is asked for, that repeats", (assert) => {
    const texture = makeStripeTexture(scene, 64);
    const size = texture.getSize();

    assert.deepEqual([size.width, size.height], [64, 64]);
    assert.strictEqual(texture.wrapU, BABYLON.Texture.WRAP_ADDRESSMODE);
    assert.strictEqual(texture.wrapV, BABYLON.Texture.WRAP_ADDRESSMODE);
  });
});

QUnit.module("levelZones and zonePosition", () => {
  const grid = parseLevel({
    name: "T",
    start: { col: 0, row: 0 },
    rows: ["4444", "4444", "4444"],
    time: 30,
    goal: { col: 2, row: 1 },
    checkpoints: [{ col: 0.5, row: 0.5, bonus: 8 }, { col: 1, row: 1, bonus: 9 }],
  });

  QUnit.test("the goal comes first, and then the checkpoints in order, with their place and bonus", (assert) => {
    const zones = levelZones(grid);

    assert.deepEqual(zones.map((z) => [z.kind, z.index]), [["goal", 0], ["checkpoint", 0], ["checkpoint", 1]]);
    assert.strictEqual(zones[1].bonus, 8);
    assert.strictEqual(zones[2].bonus, 9);
  });

  QUnit.test("a zone is in the middle of its square, on the floor", (assert) => {
    const at = zonePosition(grid, { col: 2, row: 1 });

    assert.deepEqual(at, { x: 2 * CELL, y: 4 * HEIGHT_STEP, z: 1 * CELL });
  });
});
```

Things to notice:

- **The first module checks the data of every level you will ever write**: some time, a goal, bonuses worth having, every zone on flat floor, none on the start, none overlapping.
- **`makeStripeTexture` is tested for its size and for repeating**, since a texture that doesn't repeat would stretch its edge pixels over the whole border, as the floor's did in the first tutorial.
- **Zones on flat floor** is tested by looking at the height of the floor at the centre and at the four points a radius away, border included, and they must all be the same. A level with a goal on a slope fails the test instead of looking wrong.

Open `tests.html`. You should see **287 passing tests**: eight more.

---

## Step 3: Trigger zones

Now the zones in the world. A zone needs two things that are different from each other:

- something to **see**: a disc lying on the floor, glowing so the player can find it, and
- something to **feel**: a body the marble can enter, which must **not** stop it.

That second one is a **trigger**. Havok can mark a shape as a trigger (`isTriggerShape: true`): other bodies pass through it as if it weren't there, and Havok reports when one enters or leaves. The report comes from `onTriggerCollisionObservable` on the physics plugin, with an event whose `type` is `"TRIGGER_ENTERED"` or `"TRIGGER_EXITED"`, and the two things involved.

The invisible trigger is taller than the disc, and reaches below the floor, so a marble that is on a slope, or falling in from above, still touches it.

Add this to `js/zones.js`, **below** `zonePosition` and above the export block. It is one long function: paste it whole, to its closing `}` after the `return { ... };`:

```js
// Builds every zone of a level in a scene: a glowing disc laid on the floor, inside a hazard-striped
// border, to see, and an invisible
// trigger standing on it, to feel. `onEnter(zone, node)` is called when something rolls into a
// zone's trigger, with the zone and what it was (the marble's mesh, for example). Returns `markTaken(zone)`,
// which greys out a zone that has been used (a checkpoint reached, or the goal won), and `dispose()`, which takes it all away again.
function buildZones(scene, grid, onEnter) {
  const plugin = scene.getPhysicsEngine().getPhysicsPlugin();
  const materials = {};
  const colorFor = (name) => {
    if (!materials[name]) {
      const material = new BABYLON.StandardMaterial(`zone-${name}`, scene);
      material.emissiveColor = BABYLON.Color3.FromHexString(ZONE_COLORS[name]);
      material.disableLighting = true; // it glows, so it is the same in the dark corner as in the light
      materials[name] = material;
    }
    return materials[name];
  };

  // The border is the same for every zone: stripes that glow, like the discs.
  const stripes = makeStripeTexture(scene);
  stripes.uScale = 2;
  stripes.vScale = 2;
  const borderMaterial = new BABYLON.StandardMaterial("zone-border", scene);
  borderMaterial.emissiveTexture = stripes;
  borderMaterial.disableLighting = true;

  const built = levelZones(grid).map((zone) => {
    const at = zonePosition(grid, zone);
    const name = `${zone.kind}-${zone.index}`;

    const border = BABYLON.MeshBuilder.CreateCylinder(`${name}-border`, { diameter: (ZONE_RADIUS + ZONE_BORDER) * 2, height: 0.06 }, scene);
    border.position.set(at.x, at.y + 0.03, at.z);
    border.material = borderMaterial;

    const disc = BABYLON.MeshBuilder.CreateCylinder(`${name}-disc`, { diameter: ZONE_RADIUS * 2, height: 0.08 }, scene);
    disc.position.set(at.x, at.y + 0.04, at.z);
    disc.material = colorFor(zone.kind);

    const trigger = BABYLON.MeshBuilder.CreateCylinder(name, { diameter: ZONE_RADIUS * 2, height: ZONE_HEIGHT }, scene);
    trigger.position.set(at.x, at.y + ZONE_HEIGHT / 2 - 1, at.z); // from a unit under the floor to above it
    trigger.isVisible = false;
    const aggregate = new BABYLON.PhysicsAggregate(trigger, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0, isTriggerShape: true }, scene);

    return { zone, border, disc, trigger, aggregate };
  });

  // Havok says when anything enters or leaves any trigger in the world. Find out which zone it was.
  const byNode = new Map(built.map((entry) => [entry.trigger, entry.zone]));
  const observer = plugin.onTriggerCollisionObservable.add((event) => {
    if (event.type !== "TRIGGER_ENTERED") return;
    const triggerNode = [event.collider.transformNode, event.collidedAgainst.transformNode].find((node) => byNode.has(node));
    if (!triggerNode) return;
    const other = triggerNode === event.collider.transformNode ? event.collidedAgainst.transformNode : event.collider.transformNode;
    onEnter(byNode.get(triggerNode), other);
  });

  return {
    zones: built.map((entry) => entry.zone),
    markTaken(zone) {
      const entry = built.find((e) => e.zone.kind === zone.kind && e.zone.index === zone.index);
      if (entry) entry.disc.material = colorFor("taken");
    },
    dispose() {
      plugin.onTriggerCollisionObservable.remove(observer);
      for (const { border, disc, trigger, aggregate } of built) {
        aggregate.dispose();
        trigger.dispose();
        disc.dispose();
        border.dispose();
      }
      stripes.dispose();
      borderMaterial.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
```

and the export block is now complete:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ZONE_RADIUS, ZONE_BORDER, ZONE_HEIGHT, ZONE_COLORS, levelZones, zonePosition, makeStripeTexture, buildZones };
} else {
  Object.assign(window, { ZONE_RADIUS, ZONE_BORDER, ZONE_HEIGHT, ZONE_COLORS, levelZones, zonePosition, makeStripeTexture, buildZones });
}
```

Things to notice:

- **`isTriggerShape: true`** is the whole difference between a zone and a wall. The shape is a cylinder, the same as the disc, but taller.
- **The border is a flat cylinder, a little wider than the disc and a little lower**, so the disc sits inside it. Its material uses the stripe texture as `emissiveTexture`, so it glows like the discs. There is one texture and one material for the whole level, shared by every border, and `dispose` takes them away.
- **The glowing disc has `disableLighting`** and an `emissiveColor`, so it is the same colour in the dark corner as in the sun. It has no physics at all.
- **One observer serves every zone.** Havok reports every trigger in the world to the same place, so the code finds which of *its* triggers it was (`byNode` is a `Map` from a trigger's mesh to its zone), and ignores the rest.
- **`onEnter(zone, node)` is told what rolled in**, not just that something did. Right now only the marble is a moving body, but later there will be enemies, and a zone that a *chasing marble* rolls into mustn't win the level. The game checks it was the marble.
- **Only `TRIGGER_ENTERED` is used.** A zone is reported on the way in, once, not every frame while the marble is in it, and not on the way out.
- **`dispose` takes everything away**, and takes the observer off the plugin too. A zone from the last level that stayed listening would call the game about a zone that is no longer there.

### Tests

Add these to the bottom of `tests/zones.tests.js`:

```js
// Zones need a scene and physics, and a marble to roll into them. These use a NullEngine, which draws
// nothing, and let time go by with stepPhysics.
QUnit.module("buildZones", (hooks) => {
  let engine;
  let scene;
  let level;
  let entered;
  let zones;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    level = buildLevel(scene, LEVELS[0]);
    entered = [];
    zones = buildZones(scene, level.grid, (zone, node) => entered.push({ zone, node }));
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // A marble dropped at a zone of the level.
  const dropAt = (zone) => new Marble(scene, { start: levelStart(level.grid, zone) });

  QUnit.test("makes a glowing disc in a striped border, and an invisible trigger, for every zone", (assert) => {
    for (const zone of levelZones(level.grid)) {
      const name = `${zone.kind}-${zone.index}`;
      const disc = scene.getMeshByName(`${name}-disc`);
      const trigger = scene.getMeshByName(name);
      const border = scene.getMeshByName(`${name}-border`);
      const at = zonePosition(level.grid, zone);

      assert.true(disc.isVisible, `${name} disc is seen`);
      assert.true(border.isVisible, `${name} border is seen`);
      assert.true(Math.abs(border.getBoundingInfo().boundingBox.extendSize.x - (ZONE_RADIUS + ZONE_BORDER)) < 1e-6, `${name} border reaches out past the disc`);
      assert.true(Math.abs(border.position.y - (at.y + 0.03)) < 1e-6, `${name} border is on the floor`);
      assert.false(trigger.isVisible, `${name} trigger is not`);
      assert.true(Math.abs(disc.position.y - at.y) < 0.1, `${name} disc is on the floor`);
      assert.true(Boolean(trigger.physicsBody), `${name} trigger has a body`);
    }
    assert.strictEqual(zones.zones.length, 1 + level.grid.checkpoints.length);
  });

  QUnit.test("a marble that lands in the goal is reported, with the zone and the marble", (assert) => {
    const marble = dropAt(level.grid.goal);

    stepPhysics(scene, 1);

    assert.strictEqual(entered.length, 1);
    assert.strictEqual(entered[0].zone.kind, "goal");
    assert.strictEqual(entered[0].node, marble.mesh);
  });

  QUnit.test("a marble that lands in a checkpoint is reported as that checkpoint", (assert) => {
    const marble = dropAt(level.grid.checkpoints[0]);

    stepPhysics(scene, 1);

    assert.strictEqual(entered.length, 1);
    assert.strictEqual(entered[0].zone.kind, "checkpoint");
    assert.strictEqual(entered[0].zone.index, 0);
    assert.strictEqual(entered[0].zone.bonus, level.grid.checkpoints[0].bonus);
    assert.strictEqual(entered[0].node, marble.mesh);
  });

  QUnit.test("a zone doesn't stop the marble: it rolls through, at speed", (assert) => {
    const checkpoint = zonePosition(level.grid, level.grid.checkpoints[0]);
    const marble = new Marble(scene, { start: { x: checkpoint.x - 2.5, y: checkpoint.y + MARBLE_RADIUS + 0.02, z: checkpoint.z } });
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(6, 0, 0));

    stepPhysics(scene, 0.4);

    assert.strictEqual(entered.length, 1, "it went in");
    assert.true(marble.position.x > checkpoint.x - 1, `and is on its way, past the edge of the zone: ${marble.position.x}`);
    assert.true(marble.speed > 3, `at speed: ${marble.speed}`);
  });

  QUnit.test("it is reported on the way in only, not while inside, and not on the way out", (assert) => {
    const checkpoint = zonePosition(level.grid, level.grid.checkpoints[0]);
    const marble = new Marble(scene, { start: { x: checkpoint.x - 2.5, y: checkpoint.y + MARBLE_RADIUS + 0.02, z: checkpoint.z } });
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(6, 0, 0));

    stepPhysics(scene, 1); // in the middle, and out the other side

    assert.true(marble.position.x > checkpoint.x + ZONE_RADIUS, `it has come out: ${marble.position.x}`);
    assert.strictEqual(entered.length, 1);
  });

  QUnit.test("something that isn't the marble is reported as what it is, so the game can ignore it", (assert) => {
    const ball = BABYLON.MeshBuilder.CreateSphere("other", { diameter: 1 }, scene);
    const at = zonePosition(level.grid, level.grid.goal);
    ball.position.set(at.x, at.y + 1, at.z);
    new BABYLON.PhysicsAggregate(ball, BABYLON.PhysicsShapeType.SPHERE, { mass: 1 }, scene);

    stepPhysics(scene, 1);

    assert.strictEqual(entered.length, 1);
    assert.strictEqual(entered[0].node, ball);
    assert.strictEqual(entered[0].node.name, "other");
  });

  QUnit.test("a marble that rolls over the plain floor sets nothing off", (assert) => {
    new Marble(scene, { start: levelStart(level.grid) });

    stepPhysics(scene, 1.5);

    assert.deepEqual(entered, []);
  });

  QUnit.test("markTaken greys out that checkpoint's disc, and no other", (assert) => {
    const taken = BABYLON.Color3.FromHexString(ZONE_COLORS.taken);
    const goalDisc = scene.getMeshByName("goal-0-disc");
    const checkpointDisc = scene.getMeshByName("checkpoint-0-disc");
    const before = checkpointDisc.material.emissiveColor.clone();

    zones.markTaken(zones.zones[1]);

    assert.false(before.equals(taken), "it was not grey before");
    assert.true(checkpointDisc.material.emissiveColor.equals(taken), "and is now");
    assert.false(goalDisc.material.emissiveColor.equals(taken), "the goal is untouched");
  });

  QUnit.test("markTaken greys out the goal too, and leaves the checkpoints", (assert) => {
    const taken = BABYLON.Color3.FromHexString(ZONE_COLORS.taken);
    const goalDisc = scene.getMeshByName("goal-0-disc");
    const checkpointDisc = scene.getMeshByName("checkpoint-0-disc");

    zones.markTaken(zones.zones[0]);

    assert.true(goalDisc.material.emissiveColor.equals(taken));
    assert.false(checkpointDisc.material.emissiveColor.equals(taken));
  });

  QUnit.test("disposing takes the zones away: no meshes, and no more reports", (assert) => {
    zones.dispose();

    assert.strictEqual(scene.getMeshByName("goal-0"), null);
    assert.strictEqual(scene.getMeshByName("goal-0-disc"), null);
    assert.strictEqual(scene.getMeshByName("goal-0-border"), null);
    assert.strictEqual(scene.getMeshByName("checkpoint-0"), null);

    dropAt(level.grid.goal);
    stepPhysics(scene, 1);
    assert.deepEqual(entered, []);
  });

  QUnit.test("the zones of another level can be built in their place", (assert) => {
    zones.dispose();
    level.dispose();
    level = buildLevel(scene, LEVELS[1]);
    zones = buildZones(scene, level.grid, (zone, node) => entered.push({ zone, node }));

    dropAt(level.grid.goal);
    stepPhysics(scene, 1);

    assert.strictEqual(entered.length, 1);
    assert.strictEqual(entered[0].zone.kind, "goal");
  });
});
```

Things to notice:

- **They run the real physics**, as the level tests do: `NullEngine`, `stepPhysics`, a real marble on a real level.
- **A marble is dropped *into* a zone** to see it reported, with the right kind, index and bonus, and with the marble as the thing that entered.
- **"A zone doesn't stop the marble"** fires a marble through a checkpoint and checks it comes out the far side with its speed. That is what makes it a trigger and not a wall.
- **"Reported on the way in only"** rolls the marble all the way through, and counts one report, not one for every step inside.
- **"Something that isn't the marble is reported as what it is"** drops a different sphere in, and checks the game is told which one it was.
- **`markTaken` and `dispose`** are tested too: only the disc of the zone it is given changes colour (a checkpoint, or the goal), and after `dispose` the meshes are gone and a marble rolling into where the goal was sets nothing off.

Open `tests.html`. You should see **298 passing tests**: eleven more.

---

## Step 4: The page

Three things for the player to see: the **time**, a **banner** for what has just happened, and the **zones** (which are already in the world). Add this to `index.html`, directly below the `<p id="level-name"></p>` line:

```html
  <p id="clock"></p>
  <div id="banner" class="hidden">
    <h2 id="banner-title"></h2>
    <p id="banner-detail"></p>
  </div>
```

and the two new scripts go in the list at the **bottom of `<body>`**, below `level.js`:

```html
  <script src="js/clock.js"></script>
  <script src="js/zones.js"></script>
```

Now the style. The clock and the banner are a part of the page of their own, so they get a file of their own. Create `css/hud.css` with:

```css
/* The clock, under the name of the level, and a banner in the middle of the screen for what happens:
   a checkpoint, the goal, the time running out. Neither takes a touch, so touches reach the canvas. */
#clock {
  position: fixed;
  right: 12px;
  top: 88px;
  z-index: 20;
  margin: 0;
  color: var(--chrome-light);
  font: 400 clamp(34px, 8vw, 52px) / 1 var(--title-font);
  letter-spacing: 0.04em;
  text-shadow: 0 3px 6px var(--ink);
  pointer-events: none;
}
#clock.low {
  color: var(--orange);
}
#banner {
  position: fixed;
  left: 50%;
  top: 18%;
  z-index: 25;
  padding: 14px 34px;
  transform: translateX(-50%);
  border: 6px solid;
  border-image: repeating-linear-gradient(45deg, var(--yellow) 0 8px, var(--ink) 8px 16px) 6;
  background: rgba(33, 30, 33, 0.92);
  text-align: center;
  white-space: nowrap;
  pointer-events: none;
}
#banner.hidden {
  display: none;
}
#banner h2 {
  margin: 0;
  color: var(--yellow);
  font: 400 clamp(30px, 7vw, 56px) / 1.1 var(--title-font);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
#banner p {
  margin: 6px 0 0;
  color: var(--chrome);
  font: 600 clamp(20px, 4vw, 28px) / 1.1 var(--small-font);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
#banner p:empty {
  display: none;
}
```

and link it in `index.html`, **after** the other stylesheets (directly below the `levels.css` line):

```html
  <link rel="stylesheet" href="css/hud.css">
```

Things to notice:

- **A new part of the page is a new file**, and a new `<link>`. Nothing else in the stylesheet had to change.
- **The clock is under the name of the level**, top right, in Russo One, and turns orange (`.low`) when the time is nearly out.
- **The banner is hidden by default** (`class="hidden"`), and shows a title and a line of detail. It has the hazard-stripe border of the buttons.
- **Neither takes a touch** (`pointer-events: none`), so a thumb on the banner still steers.
- **The banner's detail line hides itself when it is empty** (`p:empty`), so *Time's up* is one line and *Goal!* is two.

---

## Step 5: The game

`js/main.js` has four jobs: make a run for each level, build the zones, say what happens, and keep the clock going.

First, one new constant. Add this directly below `SPLASH_MIN_MS` near the top:

```js
const END_PAUSE_MS = 2500; // how long the banner for a won or lost level stays before the game goes on
```

### 5a. Stopping at the goal

A marble that has reached the goal should **stay there**. Steering is already switched off once a run is won, but a marble keeps its momentum, and one that arrives at speed would roll straight over the edge of the landing and fall. So the marble needs a way to be stopped.

There is a catch. A trigger reports the moment the marble first **touches** a zone, and that is when its *edge* meets the rim of the disc. A marble stopped there rests on the very edge of the goal, which looks like it never got there. So the marble is stopped at once, and then **rolled to the middle** and held there. Open `js/marble.js`.

Add these constants directly below `MARBLE_DAMPING`:

```js
const STOP_DAMPING = 8; // how hard a marble that has been stopped is held still
const GLIDE_RATE = 4; // how quickly a gliding marble closes on its target: a share of the distance, every second
const GLIDE_MAX_SPEED = 4; // and the fastest it glides, in units a second
```

Then a plain function, directly below `hasFallen` and above `makeSteel`. It is the rule for gliding, with no Babylon.js in it, so it is easy to test:

```js
// How fast, and which way, a marble should be going to glide to a point: toward it, at a speed that
// is a share of how far away it is (so it eases in and arrives gently), but never above `maxSpeed`.
// Flat: x and z only. At the point, or very near it, it is still.
function glideVelocity(from, to, rate = GLIDE_RATE, maxSpeed = GLIDE_MAX_SPEED) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.02) return { x: 0, z: 0 };
  const speed = Math.min(maxSpeed, distance * rate);
  return { x: (dx / distance) * speed, z: (dz / distance) * speed };
}
```

and **replace the `reset` method**, adding `stop` and `glideTo` above it (all inside the `Marble` class, as before):

```js
  // Brings the marble to a halt, and keeps it there: its speed and spin are taken away at once, and
  // it is damped so hard that a slope under it couldn't get it going again. `reset` lets it roll.
  stop() {
    this.aggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
    this.aggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
    this.aggregate.body.setLinearDamping(STOP_DAMPING);
    this.aggregate.body.setAngularDamping(STOP_DAMPING);
  }

  // Rolls the marble toward a point on the floor, { x, z }, easing in, whatever else it was doing. Call it every
  // frame. It only sets the speed along the floor, and leaves the speed up and down alone, so the
  // marble still falls and still stays on the floor.
  glideTo(point) {
    const speed = this.aggregate.body.getLinearVelocity();
    const glide = glideVelocity(this.mesh.position, point);
    this.aggregate.body.setLinearVelocity(new BABYLON.Vector3(glide.x, speed.y, glide.z));
  }

  // Puts the marble back at its start, still, and free to roll.
  reset() {
    this.aggregate.body.setLinearDamping(MARBLE_DAMPING.linear);
    this.aggregate.body.setAngularDamping(MARBLE_DAMPING.angular);
    this.mesh.position.set(this.start.x, this.start.y, this.start.z);
    this.mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    this.aggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
    this.aggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
  }
```

The export block has new names (`STOP_DAMPING`, `GLIDE_RATE`, `GLIDE_MAX_SPEED` and `glideVelocity`):

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, STOP_DAMPING, GLIDE_RATE, GLIDE_MAX_SPEED, GROUND_REACH, FALL_LIMIT, hasFallen, glideVelocity, makeSteel, Marble };
} else {
  Object.assign(window, { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, STOP_DAMPING, GLIDE_RATE, GLIDE_MAX_SPEED, GROUND_REACH, FALL_LIMIT, hasFallen, glideVelocity, makeSteel, Marble });
}
```

Things to notice:

- **Stopping is taking the speed away, then holding it.** `setLinearVelocity` and `setAngularVelocity` to zero stop it at once, and a very high damping (`STOP_DAMPING`) means that if the floor has even a little slope the marble creeps, and doesn't roll away. (Goals are on flat floor, so it doesn't move at all.)
- **`glideVelocity` is a share of the distance.** The speed is `rate` times how far away the marble is, so it sets off briskly, slows as it nears the middle, and arrives gently, with no overshoot. It is capped at `maxSpeed` so a marble a long way off doesn't shoot across. The camera's easing and the tilt stick use the same idea.
- **`glideTo` only sets the speed along the floor.** It leaves the up-and-down speed as the physics has it, so the marble still falls and still rests on the floor. It is called every frame, so any push the physics gives it (the floor's friction, a slope) is taken out again.
- **`reset` gives the normal damping back.** Without that a marble that had been stopped would be sluggish for the rest of the game. Every way of putting the marble back (the next level, a restart, falling off) goes through `reset`.

#### Tests

Add these to the **bottom** of `tests/marble.tests.js`, below everything that is there. They are a module of their own:

```js
// A marble that has arrived somewhere has to stay there. These put it on the test course and let time go by.
QUnit.module("stopping a marble", (hooks) => {
  let engine;
  let scene;
  let marble;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene);
    marble = new Marble(scene);
    stepPhysics(scene, 1); // let it land on the start deck
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("stopping takes all its speed away at once", (assert) => {
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    marble.aggregate.body.setAngularVelocity(new BABYLON.Vector3(0, 0, -10));

    marble.stop();

    assert.strictEqual(marble.speed, 0);
    assert.strictEqual(marble.aggregate.body.getAngularVelocity().length(), 0);
  });

  QUnit.test("and it stays where it is, on the flat", (assert) => {
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    const x = marble.position.x;

    marble.stop();
    stepPhysics(scene, 1);

    assert.true(Math.abs(marble.position.x - x) < 0.05, `it moved ${marble.position.x - x}`);
    assert.true(marble.speed < 0.05);
  });

  QUnit.test("on a slope it is held back to a creep, where a free marble would roll away", (assert) => {
    marble.start = { x: -2, y: 3.3, z: 0 }; // on the ramp
    marble.reset();
    stepPhysics(scene, 0.3);
    const x = marble.position.x;

    marble.stop();
    stepPhysics(scene, 1);

    assert.true(Math.abs(marble.position.x - x) < 1, `it only crept ${marble.position.x - x}`);
  });

  QUnit.test("resetting lets it roll again", (assert) => {
    marble.stop();
    marble.start = { x: -2, y: 3.3, z: 0 }; // on the ramp
    marble.reset();

    stepPhysics(scene, 1);

    assert.true(marble.speed > 1, `speed ${marble.speed}`);
  });
});

QUnit.module("glideVelocity", () => {
  QUnit.test("is still at the point, and very near it", (assert) => {
    assert.deepEqual(glideVelocity({ x: 3, z: 4 }, { x: 3, z: 4 }), { x: 0, z: 0 });
    assert.deepEqual(glideVelocity({ x: 3, z: 4 }, { x: 3.01, z: 4 }), { x: 0, z: 0 });
  });

  QUnit.test("heads toward the point, whichever way it is", (assert) => {
    const east = glideVelocity({ x: 0, z: 0 }, { x: 1, z: 0 });
    const southWest = glideVelocity({ x: 0, z: 0 }, { x: -1, z: -1 });

    assert.true(east.x > 0 && Math.abs(east.z) < 1e-9);
    assert.true(southWest.x < 0 && southWest.z < 0);
    assert.true(Math.abs(southWest.x - southWest.z) < 1e-9, "straight at it");
  });

  QUnit.test("goes slower the nearer it is, so it eases in", (assert) => {
    const far = Math.hypot(...Object.values(glideVelocity({ x: 0, z: 0 }, { x: 0.8, z: 0 })));
    const near = Math.hypot(...Object.values(glideVelocity({ x: 0, z: 0 }, { x: 0.2, z: 0 })));

    assert.true(near < far);
    assert.true(Math.abs(near - 0.2 * GLIDE_RATE) < 1e-9, "in proportion to the distance");
  });

  QUnit.test("never goes faster than the top speed, however far", (assert) => {
    const v = glideVelocity({ x: 0, z: 0 }, { x: 300, z: 400 });

    assert.true(Math.abs(Math.hypot(v.x, v.z) - GLIDE_MAX_SPEED) < 1e-9);
  });
});

QUnit.module("gliding a marble", (hooks) => {
  let engine;
  let scene;
  let marble;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene);
    marble = new Marble(scene);
    stepPhysics(scene, 1); // let it land on the start deck
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a stopped marble glides to a point on the floor, and stays there", (assert) => {
    marble.stop();
    const target = { x: marble.position.x + 1.4, z: marble.position.z + 0.6 };

    for (let i = 0; i < 120; i++) {
      marble.glideTo(target);
      stepPhysics(scene, 1 / 60);
    }

    assert.true(Math.hypot(marble.position.x - target.x, marble.position.z - target.z) < 0.05, `it is at ${marble.position.x}, ${marble.position.z}`);
    assert.true(marble.speed < 0.1, `and is still: ${marble.speed}`);
    assert.true(marble.grounded, "on the floor");
  });
});
```

They check that stopping takes all the speed and the spin at once, that the marble stays where it is on the flat, that on a slope it only creeps where a free marble would roll away, and that `reset` lets it roll again. Then that `glideVelocity` is still at the point, heads toward it whichever way it is, eases in, and never goes above its top speed, and that a real stopped marble glides to a point on the floor, is still when it gets there, and is still on the floor.

Open `tests.html`. You should see **307 passing tests**: nine more.

In the last tutorial you wrote the **next level** section: from the comment `// The next level: take this one away` to the end of the `nextButton` click handler. **Replace the whole of that section** with the five pieces below, one after another, directly above the comment `// Each frame`.

### 5b. The banner, the run and the zones

```js
  // The banner: a few big words in the middle of the screen for what has just happened.
  const banner = document.getElementById("banner");
  const bannerTitle = document.getElementById("banner-title");
  const bannerDetail = document.getElementById("banner-detail");
  let bannerTimer = null;
  const say = (title, detail = "", ms = 1500) => {
    bannerTitle.textContent = title;
    bannerDetail.textContent = detail;
    banner.classList.remove("hidden");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.add("hidden"), ms);
  };

  // A run is one attempt at the level: the clock, and which checkpoints have been reached. The zones
  // of the level (its goal and checkpoints) tell the game when the marble rolls into one.
  let run = new Run(level.grid);
  const reachZone = (zone, node) => {
    if (node !== marble.mesh) return; // something else rolled in, and zones are only for the marble
    if (zone.kind === "goal") {
      if (run.finish()) {
        marble.stop(); // it has arrived, and mustn't roll on over the edge
        zones.markTaken(zone);
      }
      return;
    }
    const bonus = run.reachCheckpoint(zone.index);
    if (bonus === 0) return; // one already reached, or the run isn't running
    marble.start = levelStart(level.grid, zone); // a marble that falls now starts again from here
    zones.markTaken(zone);
    say("Checkpoint", `+${bonus} seconds`);
  };
  let zones = buildZones(scene, level.grid, reachZone);
```

Things to notice:

- **`say` shows the banner and sets a timer to hide it**, and clears the timer of the last one, so two messages close together don't hide each other early.
- **`reachZone` is what happens when the marble rolls into a zone.** The first thing it does is check *what* rolled in. The goal finishes the run, and if that won it (only a running run can be won), **stops the marble and greys the goal's disc**, so the win is something you can see. The frame loop (5f) then rolls it to the middle. A checkpoint adds its bonus, and if it paid anything (the first time only), moves the marble's start there, greys the disc, and says so.
- **A marble put back at a checkpoint is dropped *inside* its zone**, which is reported again. It does no harm, since a checkpoint pays once and `reachCheckpoint` says 0 the second time, and it is a good reason for it to be written that way.
- **`marble.start` is where `reset` goes.** The `R` key, the *Drop again* button and falling off the level all call the same `dropAgain`, so all of them now put the marble back at the last checkpoint, with no more code.

### 5c. Playing a level

```js
  // Playing a level: take the one that is there away (and its zones), build this one, begin a new run
  // and start the marble at its start. The camera is put at the marble too, or it would glide across
  // from the old level.
  let focus = { ...marble.start };
  const levelName = document.getElementById("level-name");
  levelName.textContent = level.grid.name;
  const loadLevel = (index) => {
    zones.dispose();
    level.dispose();
    levelIndex = index;
    level = buildLevel(scene, LEVELS[levelIndex]);
    zones = buildZones(scene, level.grid, reachZone);
    run = new Run(level.grid);
    marble.start = levelStart(level.grid);
    marble.reset();
    focus = { ...marble.start };
    levelName.textContent = level.grid.name;
  };
  const nextLevel = () => loadLevel((levelIndex + 1) % LEVELS.length); // after the last, the first
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyN" && !event.repeat) nextLevel();
  });
  const nextButton = document.getElementById("next-level");
  nextButton.addEventListener("click", () => {
    nextButton.blur();
    nextLevel();
  });
```

Things to notice:

- **`loadLevel` is the next-level code from last time, grown up.** It takes the zones away as well as the level, builds both for the new one, and makes a **new run**: a fresh clock, and no checkpoints reached. It is also how the game tries a level again (`loadLevel(levelIndex)`).
- **The zones are disposed of first**, before the level, so there is never a trigger in the physics world that belongs to a level that has gone.

### 5d. The clock on the screen

```js
  // The clock on the screen. It is written to only when the words change, once a second.
  const clock = document.getElementById("clock");
  let shownTime = "";
  const showClock = () => {
    const text = formatTime(run.remaining);
    if (text !== shownTime) {
      shownTime = text;
      clock.textContent = text;
    }
    clock.classList.toggle("low", run.low);
  };
```

It is written to only when the words change, as the tilt text is, because writing to the page is slower than comparing two strings, and the frame loop runs 60 times a second to show something that changes once.

### 5e. The end of a run

```js
  // When a run is won or lost, say so, wait a moment, then go on: to the next level, or to try this one
  // again. The wait is a timer, and the player might press N in the meantime, which starts a new run;
  // so the timer only goes on if the run it was set for is still the one being played.
  let announced = null;
  const announceEnd = () => {
    if (run === announced || (run.status !== "won" && run.status !== "timeup")) return;
    announced = run;
    const thisRun = run;
    if (run.status === "won") {
      say("Goal!", `${formatTime(run.remaining)} left`, END_PAUSE_MS);
      setTimeout(() => run === thisRun && nextLevel(), END_PAUSE_MS);
    } else {
      say("Time's up", "", END_PAUSE_MS);
      setTimeout(() => run === thisRun && loadLevel(levelIndex), END_PAUSE_MS);
    }
  };
```

Things to notice:

- **`announceEnd` runs every frame but does its work once.** It remembers which run it has announced (`announced`), so a run that stays `won` for the whole pause doesn't say *Goal!* sixty times a second.
- **The timer checks it is still the right run.** The game waits a moment after a win, and in that moment the player might press **N**, which starts a *new* run. When the old timer fires it finds the run it was set for is no longer the one being played (`run === thisRun` is false), and does nothing. Without that check the player would be taken *two* levels on.
- **Winning goes on to the next level, and losing tries this one again.**

### 5f. Every frame

Replace the comment above the frame loop with:

```js
  // Each frame: run the clock, read the tilt, steer the marble, put it back if it fell off the
  // level, keep the sun over it, and ease the camera after it.
```

Directly below the `dt` line, **above** the comment about the tilt, add:

```js
    // The clock starts when the splash has gone (the physics is held until then), and counts down
    // until the run is won or lost.
    if (scene.physicsEnabled && run.status === "ready") run.start();
    run.tick(dt);
    showClock();
    announceEnd();

    // A marble that has won was stopped where it touched the goal, which is its edge. It rolls
    // on to the middle, and rests there.
    if (run.status === "won") marble.glideTo(zonePosition(level.grid, level.grid.goal));
```

and change the rest of the comment above the push, and **replace the whole `if (scene.physicsEnabled) { ... }` block**, so the marble can only be steered while the clock is running (the first line of that comment stays as it is). Don't keep the old `if` inside the new one:

```js
    // camera's own angle) and into a push. Only while the clock is running: not before the splash
    // has gone (a push is a change of speed that happens at once, so it would load the marble up
    // while the world is held still), and not once the run is won or lost.
    if (run.status === "running") {
      const stick = combineSticks(combineSticks(keyboard.stick, thumb.value), tilt.stick);
      marble.push(worldDirection(stick, camera.alpha));
    }
```

Things to notice:

- **The clock starts when the physics does.** The splash holds the physics until it has gone (`scene.physicsEnabled`), and the run starts the first frame after, so a player isn't penalised for a splash screen.
- **A push is only given to a *running* run.** That is one condition for three things: not before the start, not after the goal, not after the time is up. (It replaces the `scene.physicsEnabled` check there, because a run is only running once the physics is.)
- **After a win, the marble is rolled to the middle of the goal** (`glideTo`, every frame, while the run is `won`) and rests there. It can't be steered. `zonePosition` gives the middle of the goal on the floor.

---

## Step 6: Try it

Serve the page and open it. The clock starts when the splash has gone: **Practice Run, 0:40**.

- [ ] The **clock counts down** a second a second, top right, under the name of the level
- [ ] **Two discs** on the floor: a **blue** one on the landing at the foot of the ramp, and a **yellow** one at the far end, each inside a **black and yellow striped border**, like the buttons
- [ ] **Roll into the blue disc**: the banner says *Checkpoint, +10 seconds*, the clock jumps up by 10, and the disc goes **grey**
- [ ] **Roll off the edge** after the checkpoint: the marble starts again at the **checkpoint**, not at the top, and the clock keeps running
- [ ] Rolling back over the grey disc does **nothing**: no more seconds
- [ ] **Roll into the yellow disc**: the banner says *Goal!* with the time left, the disc goes **grey**, the marble **rolls to the middle of the disc and rests there**, it can no longer be steered, and after a moment **The Bridge** begins
- [ ] Roll into the goal **fast**: the marble still ends up in the middle, and doesn't carry on over the edge
- [ ] When the clock reaches **10 seconds** it turns **orange**
- [ ] **Let the time run out** (stand still): *Time's up*, and a moment later the same level starts again from the top, with a fresh clock and a blue checkpoint
- [ ] **N** during the pause after a win goes to the next level **once**, and the game doesn't skip another
- [ ] **R**, the **Drop again** button, tilt and touch steering all still work

**If something's wrong**

- **`ReferenceError: Run is not defined`, or `buildZones is not defined`:** `index.html` is missing a script tag. `clock.js` and `zones.js` go in the list at the bottom of `<body>`, below `level.js`. (The tests can still pass, since `tests.html` has its own list.)
- **`Cannot read properties of undefined (reading 'col')` from `zones.js`, or `levelZones`:** the level has no `goal`, or `parseLevel` doesn't carry `goal`, `time` and `checkpoints` over.
- **The clock says `NaN`, or `undefined:undefined`:** `time` isn't in the level, or `parseLevel` doesn't copy it.
- **The clock doesn't start:** `run.start()`. Check it is called when `scene.physicsEnabled` is true, and that `tick` is called every frame.
- **The marble can't be steered at all:** the `if` above the push must say `run.status === "running"`, and the run must have started.
- **No discs:** the zones aren't built (`buildZones` is called when the level is built, and in `loadLevel`). Check the console.
- **The disc is there but nothing happens when the marble rolls in:** the trigger. Check `isTriggerShape: true`, and that `onEnter` checks `node !== marble.mesh` the right way round.
- **The marble bounces off the zone as if it were a wall:** `isTriggerShape: true` is missing from the `PhysicsAggregate`.
- **The marble rolls on past the goal, and over the edge:** `marble.stop()` isn't called in `reachZone` (it is only called when `run.finish()` is true), or `stop` isn't zeroing the velocity.
- **The marble stops at the edge of the goal, and goes no further:** `marble.glideTo(...)` isn't being called every frame while the run is `won`. Check the `if (run.status === "won")` line in the frame loop.
- **The marble is sluggish after the goal, on the next level:** `reset` isn't putting the normal damping back.
- **The goal doesn't change colour:** `markTaken` has to be given the *zone* (`zones.markTaken(zone)`), and not an index.
- **No stripes, or the border is plain black or yellow:** the texture isn't repeating (`wrapU` and `wrapV`), or `uScale` and `vScale` are missing, or the canvas stripes aren't drawn. The border has to use `emissiveTexture`, not a colour.
- **A checkpoint pays out again and again:** `reachCheckpoint` isn't remembering (`reached`).
- **After a fall, the marble starts at the very beginning again:** `marble.start` isn't set in `reachZone`, or `loadLevel` is being called.
- **The zones of the last level are still there:** `zones.dispose()` isn't called in `loadLevel`.
- **After a win, the game skips a level:** the timer isn't checking `run === thisRun`.
- **The banner stays up:** `say`'s timer, or the `hidden` class and its CSS.
- **The clock text jumps about or flickers:** it should be written only when it changes.

**Experiments** (change one, reload, then change it back):

- `time: 15` in the first level: a tense dash, and *Time's up* to see
- A checkpoint `bonus` of `30`: the clock jumps, and the level is nearly easy
- `TIME_LOW` of `30`: the warning comes early
- `ZONE_RADIUS` of `3`: a zone is easy to hit, and the flat-floor test fails (the disc would cross a slope)
- `ZONE_BORDER` of `0.8`: a fat border. Of `0`: no border, and the stripes are gone
- `ZONE_HEIGHT` of `0.1`: a marble that falls into a zone, or rolls across it on a slope, may miss it
- Remove `isTriggerShape: true`: the zone is a solid, and the marble bounces off it. This is what a trigger is for
- Move the goal to a place with a dot next to it: the test for flat floor says what is wrong

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/level.js"></script>
  <script src="js/clock.js"></script>
  <script src="js/zones.js"></script>
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/tilt.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/level.tests.js"></script>
  <script src="tests/clock.tests.js"></script>
  <script src="tests/zones.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/tilt.tests.js"></script>  
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **307 passing tests**: the 264 you started with, plus 15 for the clock, 8 for the level data, the zones' places and the stripes, 11 for the zones in the physics world, and 9 for stopping and gliding the marble.

> **What these tests don't cover.** They check every rule of the clock, that every zone of every level is on flat floor, and that a real marble sets zones off, rolls through them and is not stopped. They can't tell you that 40 seconds is the right time for a level, that a bonus is generous enough, or that the banner is easy to read in a hurry. That check is Step 6. A level that is too hard is fixed with `time`, not with code.

> **Try breaking something.** In `reachCheckpoint`, delete the `this.reached.has(index)` check so it reads `if (this.status !== "running") return 0;`. The test *"each checkpoint's bonus is paid once"* fails, and on the page the marble earns more seconds every time it rolls over the disc. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| The rules of a game as a state machine | `Run`, and its `status` |
| A clock in seconds, whatever the frame rate | `tick(dt)` |
| A bonus that is paid once | `reached`, `reachCheckpoint` |
| Time as words | `formatTime` |
| Goals and checkpoints as level data | `time`, `goal`, `checkpoints` in `LEVELS` |
| A physics body that only reports an overlap | `isTriggerShape` |
| Hearing it | `onTriggerCollisionObservable`, `TRIGGER_ENTERED` |
| Knowing *what* entered a zone | `onEnter(zone, node)` |
| Something to see and something to feel | the disc and the trigger |
| Starting again from a checkpoint | `marble.start` |
| A timer that must not act on a level that has gone | `run === thisRun` |
| Freeing a level's zones with it | `zones.dispose()` in `loadLevel` |

## Challenges

1. **A score.** Keep the time left from each win and show a running total. (Hint: `run.remaining` at the moment of the win.)
2. **A bonus zone.** A third kind of zone that gives seconds *and* disappears when reached. (Hint: another `kind` in `levelZones`, and `Run` already knows how to add time.)
3. **Penalty for falling.** Take 3 seconds off the clock each time the marble falls. (Hint: where does the game notice it has fallen?)
4. **A countdown to start.** Show *3, 2, 1* before the clock starts, with the marble held. (Hint: a state before `running`, in `Run`.)
5. **Pause.** A key that stops the clock and the marble. (Hint: a `paused` state, which `tick` ignores, and a banner.)

---
