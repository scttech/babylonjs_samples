# Tutorial: Rolling Rampage Editor -- Make Your Own Levels

This is the tenth tutorial in the Rolling Rampage series. The game has ten levels, and they are all *data*: a grid of heights, a start, a goal, and some things. That means a person could make an eleventh without writing any code, if only they had something to make it *with*. In this step you build that: a **level editor**, inside the game. You draw the floor with a mouse, ramp it up and down, put the start, the goal, checkpoints, enemies, slime, pistons and platforms where you like, and the editor tells you **while you draw** what is wrong with it: a goal on a slope, a checkpoint nobody can reach, a clock that is too short. Then you press **Test** and play it, **Save** it to **My levels** on the title screen, and **share** it as text. You write the code; this document tells you what to write and why.

By the end you'll have:

- **One place for every limit** (a level is at most 60 corners across and 30 down, and the rest), that every part of the editor reads, so changing a limit is changing one number
- **A level checker**: the rules the tests of the earlier tutorials checked for the ten levels, now real code that checks *any* level, and says what is wrong and where
- **Things** (checkpoints, enemies, slime, pistons, platforms) as plain functions: add, find, move, change, remove, flatten the floor under one
- **A draft**: the level being edited, with painting, ramps, resizing, and **undo and redo**
- **My levels**: levels kept in the browser, turned into text and back, built to **never trust** what comes in
- **Gestures**: what a press, a drag and a release do for each tool, as plain functions
- **The editor screen**: a canvas you draw on, tools, a palette of heights, a form for the picked thing, and a list of problems
- **The My levels screen**: play, edit, share and delete, and add a level from text
- A game that **plays your own level** and goes **back to where you came from**, without touching the leaderboard
- Unit tests for all of it, including a stand-in for the page

**What you'll learn:** keeping every limit in one place, rules as code that tests, an editor and an importer can share, a model with no page in it and a thin screen on top of it, undo as a list of snapshots, gestures as functions, a form built from a table, why data from outside is never trusted (and how to build a clean copy of it), testing a screen with a fake page, and adding a mode to a game's flow without breaking it.

## Where you're starting

This folder is a copy of the finished Polish sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_editor/
├── index.html, tests.html   (change -- Steps 1 to 9)
├── css/
│   ├── theme.css, page.css, splash.css, buttons.css, responsive.css, stick.css, tilt.css, levels.css, hud.css,
│   │   panel.css, title.css, pause.css, result.css, leaderboard.css, controls.css, devpanel.css   (from the Polish sample)
│   ├── editor.css          (new -- Step 7)
│   └── mylevels.css        (new -- Step 8)
├── js/
│   ├── limits.js           (placeholder -- Step 1)
│   ├── check.js            (placeholder -- Step 2)
│   ├── things.js           (placeholder -- Step 3)
│   ├── draft.js            (placeholder -- Step 4)
│   ├── mylevels.js         (placeholder -- Step 5)
│   ├── gestures.js         (placeholder -- Step 6)
│   ├── editor.js           (placeholder -- Step 7)
│   ├── myscreen.js         (placeholder -- Step 8)
│   ├── screens.js, main.js   (change -- Step 9)
│   └── physics.js, course.js, level.js, clock.js, zones.js, movers.js, slime.js, enemies.js, steering.js, marble.js, score.js, profile.js, leaderboard.js, game.js, sounds.js, particles.js, shake.js, devpanel.js, controls.js, tilt.js, camera.js, splash.js   (from the Polish sample)
└── tests/
    ├── limits, check, things, draft, mylevels, gestures and myscreen tests, and fakedom.js   (placeholders)
    ├── level and screens tests change   (Steps 2 and 9)
    └── the rest   (from the Polish sample)
```

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_editor/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Polish sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**592**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away (or, for a long one, as a skeleton that is closed, to which you add methods). Files that other files depend on end with a short block that exports their names. That way every file is valid JavaScript after every step. Where a step adds a long function, paste it **whole**. Where it **replaces** something, **delete the old one**: a file with two functions of the same name runs the last.

> **A note on scripts.** The scripts you add in this tutorial can go in the list in any order, as long as they are **above `main.js`** in `index.html`. Nothing in them is used until the game is running. In `tests.html`, put each script in the list of game scripts and each test file in the list of tests.

> **Put new files in this sample's folder.** The new files go in `rolling_rampage_editor/js/`, `tests/` and `css/`, **not** in the Polish sample next door.

---

## Step 1: Every limit in one place

You asked for levels of at most 60 by 30 corners, and for that to be *easy to change*. So the first file holds **every limit**, and nothing else in the editor has a number of its own for how big a level may be, how tall a height may be, how many things a level may hold, or how many levels can be kept. Open the placeholder `js/limits.js` and replace its contents with:

```js
// The limits of the level editor, all in one place. Every part of the editor (the checks, the drawing, the saving)
// reads them from here and none has a number of its own, so changing a limit is changing one line. The tests read
// them from here too, so they still pass. See ../tests/limits.tests.js.
const EDITOR_LIMITS = {
  maxCols: 60, // the widest a level can be, in corners
  maxRows: 30, // and the deepest
  minCols: 6, // and the smallest
  minRows: 6,
  defaultCols: 20, // the size of a new level
  defaultRows: 12,
  maxHeight: 9, // the highest digit of a height. A height is one character of a row, so this can't be more than 9
  maxObjects: 20, // the most of each kind of thing in a level: checkpoints, enemies, puddles of slime, movers
  maxLevels: 20, // the most levels kept in My levels
  maxName: 24, // the longest name of a level, in characters
  minTime: 10, // the shortest and longest a level's clock can be, in seconds
  maxTime: 600,
  defaultTime: 90,
  defaultBonus: 10, // the seconds a new checkpoint gives
  undoDepth: 60, // how many steps back Undo can go
};

const DEFAULT_LEVEL_NAME = "My level";

// A whole number between `low` and `high`: `value` rounded, and then held to the range. Something that isn't a
// number at all is `low`.
function clampInt(value, low, high) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return low;
  return Math.min(high, Math.max(low, number));
}

// A number between `low` and `high`, to the nearest `step` (a step of 0.5 gives 1, 1.5, 2...). Not a number: `low`.
function clampStep(value, low, high, step) {
  const number = Number(value);
  if (!Number.isFinite(number)) return low;
  const snapped = Math.round(number / step) * step;
  return Math.min(high, Math.max(low, Number(snapped.toFixed(6))));
}

// Makes a name fit to show: spaces trimmed and squeezed to one, no longer than the limit, and a plain name if
// nothing is left. (Like cleanName, but the name of a level is longer than the name of a player.)
function cleanLevelName(name, limits = EDITOR_LIMITS) {
  const text = String(name == null ? "" : name).replace(/\s+/g, " ").trim().slice(0, limits.maxName).trim();
  return text || DEFAULT_LEVEL_NAME;
}

// A copy of a level that shares nothing with it, so changing one never changes the other.
function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

// A new level to start from: flat floor all over, the start on the left and the goal on the right.
function blankLevel(limits = EDITOR_LIMITS) {
  const height = Math.min(2, limits.maxHeight);
  const middle = Math.floor(limits.defaultRows / 2);
  return {
    name: DEFAULT_LEVEL_NAME,
    start: { col: 2, row: middle },
    time: limits.defaultTime,
    goal: { col: limits.defaultCols - 3, row: middle },
    checkpoints: [],
    rows: Array.from({ length: limits.defaultRows }, () => String(height).repeat(limits.defaultCols)),
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EDITOR_LIMITS, DEFAULT_LEVEL_NAME, clampInt, clampStep, cleanLevelName, cloneLevel, blankLevel };
} else {
  Object.assign(window, { EDITOR_LIMITS, DEFAULT_LEVEL_NAME, clampInt, clampStep, cleanLevelName, cloneLevel, blankLevel });
}
```

Things to notice:

- **`EDITOR_LIMITS` is a table of numbers**, each with a comment saying what it is. The size is `maxCols` and `maxRows`; the rest are the smallest size, the size of a new level, the highest height, how many of each thing, how many saved levels, the longest name, the shortest and longest clock, and how far back Undo goes.
- **`maxHeight` can't be more than 9.** A height is one character of a row (`"4"`), so a tenth height would need a different way of writing the grid. It can be *lower*: set it to 5 and the palette, the checks and the saving all follow.
- **Everything takes the limits as an argument, with `EDITOR_LIMITS` as the default.** `blankLevel(limits)`, `cleanLevelName(name, limits)`, and later `checkLevel(level, limits)`, `LevelDraft(level, limits)` and `MyLevels({ limits })`. That is how the tests can try a tiny limit (`maxObjects: 2`) without changing the real ones.
- **`clampInt` and `clampStep` hold a number to a range.** Anything that isn't a number (`"abc"`, `undefined`, `NaN`) becomes the low end, so a box of text can't put `NaN` in a level.
- **`cleanLevelName`** is like the player's `cleanName`: spaces trimmed and squeezed, cut to the limit, and a plain name if nothing is left.
- **`cloneLevel` is a copy that shares nothing.** A level is plain data, so a JSON round trip is a deep copy. The editor works on a copy, so *Exit without saving* really does lose the changes.
- **`blankLevel` is flat floor, a start on the left and a goal on the right**, the size of `defaultCols` by `defaultRows`. It passes every check you will write in Step 2, which a test will prove.

### Tests

In `tests.html`, add the script below `devpanel.js`, and the tests below `devpanel.tests.js`:

```html
  <script src="js/limits.js"></script>
  <script src="tests/limits.tests.js"></script>
```

Open the placeholder `tests/limits.tests.js` and replace its contents with:

```js
QUnit.module("EDITOR_LIMITS", () => {
  const L = EDITOR_LIMITS;

  QUnit.test("every limit is a whole number", (assert) => {
    for (const [name, value] of Object.entries(L)) assert.true(Number.isInteger(value), name);
  });

  QUnit.test("each smallest is at most its biggest, and a new level is between them", (assert) => {
    assert.true(L.minCols <= L.defaultCols && L.defaultCols <= L.maxCols);
    assert.true(L.minRows <= L.defaultRows && L.defaultRows <= L.maxRows);
    assert.true(L.minTime <= L.defaultTime && L.defaultTime <= L.maxTime);
  });

  QUnit.test("a height is one digit, so the highest is 1 to 9", (assert) => {
    assert.true(L.maxHeight >= 1 && L.maxHeight <= 9);
  });

  QUnit.test("there is room for at least one level, one of each thing, and a step back", (assert) => {
    assert.true(L.maxLevels >= 1 && L.maxObjects >= 1 && L.undoDepth >= 1 && L.maxName >= 1);
  });

  QUnit.test("the ten levels of the game fit inside the limits", (assert) => {
    for (const level of LEVELS) {
      assert.true(level.rows[0].length <= L.maxCols && level.rows.length <= L.maxRows, level.name);
      assert.true(level.time >= L.minTime && level.time <= L.maxTime, level.name);
    }
  });
});

QUnit.module("clampInt and clampStep", () => {
  QUnit.test("clampInt rounds, and holds a number to its range", (assert) => {
    assert.strictEqual(clampInt(4.6, 0, 10), 5);
    assert.strictEqual(clampInt(-3, 0, 10), 0);
    assert.strictEqual(clampInt(99, 0, 10), 10);
  });

  QUnit.test("clampInt gives the low end for anything that is not a number", (assert) => {
    assert.strictEqual(clampInt("abc", 2, 10), 2);
    assert.strictEqual(clampInt(undefined, 2, 10), 2);
    assert.strictEqual(clampInt(NaN, 2, 10), 2);
    assert.strictEqual(clampInt("7", 2, 10), 7);
  });

  QUnit.test("clampStep goes to the nearest step, and holds a number to its range", (assert) => {
    assert.strictEqual(clampStep(1.3, 0, 10, 0.5), 1.5);
    assert.strictEqual(clampStep(0.1 + 0.2, 0, 1, 0.1), 0.3);
    assert.strictEqual(clampStep(50, 0, 10, 0.5), 10);
    assert.strictEqual(clampStep(-1, 0, 10, 0.5), 0);
    assert.strictEqual(clampStep("x", 3, 10, 0.5), 3);
  });
});

QUnit.module("cleanLevelName", () => {
  QUnit.test("trims and squeezes spaces", (assert) => {
    assert.strictEqual(cleanLevelName("  Big   Hill  "), "Big Hill");
  });

  QUnit.test("is no longer than the limit", (assert) => {
    const long = "x".repeat(EDITOR_LIMITS.maxName + 10);
    assert.strictEqual(cleanLevelName(long).length, EDITOR_LIMITS.maxName);
    assert.strictEqual(cleanLevelName("abcdef", { ...EDITOR_LIMITS, maxName: 3 }), "abc");
  });

  QUnit.test("is a plain name when nothing is left", (assert) => {
    assert.strictEqual(cleanLevelName("   "), DEFAULT_LEVEL_NAME);
    assert.strictEqual(cleanLevelName(null), DEFAULT_LEVEL_NAME);
    assert.strictEqual(cleanLevelName(undefined), DEFAULT_LEVEL_NAME);
  });
});

QUnit.module("cloneLevel and blankLevel", () => {
  QUnit.test("a clone shares nothing with the original", (assert) => {
    const level = blankLevel();
    const copy = cloneLevel(level);

    copy.rows[0] = "x";
    copy.start.col = 99;

    assert.notStrictEqual(level.rows[0], "x");
    assert.strictEqual(level.start.col, 2);
  });

  QUnit.test("a blank level is the default size, on flat floor, with a start and a goal", (assert) => {
    const level = blankLevel();

    assert.strictEqual(level.rows.length, EDITOR_LIMITS.defaultRows);
    assert.true(level.rows.every((row) => row.length === EDITOR_LIMITS.defaultCols));
    assert.strictEqual(new Set(level.rows.join("")).size, 1);
    assert.strictEqual(level.time, EDITOR_LIMITS.defaultTime);
    assert.true(level.goal.col > level.start.col);
  });

  QUnit.test("a blank level follows the limits it is given", (assert) => {
    const level = blankLevel({ ...EDITOR_LIMITS, defaultCols: 10, defaultRows: 8, defaultTime: 30, maxHeight: 1 });

    assert.deepEqual([level.rows[0].length, level.rows.length, level.time], [10, 8, 30]);
    assert.strictEqual(level.rows[0][0], "1");
  });
});
```

Things to notice:

- **No test says `60`.** They say `EDITOR_LIMITS.maxCols`. Change the 60 to 80 and every test still passes, which is what "easy to change" has to mean.
- **The limits are tested as data**: all whole numbers, each smallest at most its biggest, a new level between them, and `maxHeight` between 1 and 9.
- **The ten levels of the game have to fit.** If someone lowers `maxCols` to 20, this test fails and names the level that no longer fits, which is better than finding out in the editor.

Open `tests.html`. You should see **606 passing tests**: 14 more.

---

## Step 2: Checking a level

In Tutorial 9 you wrote tests that check the ten levels: every zone is on flat floor, every piston stands on flat floor, a platform meets the floor at each end, every goal can be reached, the clock is long enough. A person drawing a level needs the **same rules**, but *while they draw*, and for a level that **isn't in the list**. So the rules move out of the tests and into code. Open the placeholder `js/check.js` and replace its contents with:

```js
// Checking a level: is it a level at all, and is it a fair one? The rules are the ones the tests of the earlier tutorials
// check for the ten levels of the game (zones on flat floor, pistons on flat floor, platforms that meet the floor, a goal
// that can be reached, a clock that is long enough), now as real code, so the editor can check a level while it is drawn.
// A problem is { severity, message, col, row }. An *error* is something that stops a level from being played at all, and a
// *warning* is something that makes it unfair or odd, but it can still be tried. See ../tests/check.tests.js.

const REACH_STEP = 2 * HEIGHT_STEP; // the highest step a marble can be counted on to climb: two digits
const SPEED_FOR_TIME = 6; // the slowest a marble can be expected to cover the way to the goal, in units a second
const ENEMY_DISTANCE = 8; // how far from the start an enemy has to be, so the first thing isn't a collision

function problem(severity, message, point) {
  return point ? { severity, message, col: point.col, row: point.row } : { severity, message };
}

function isPoint(point) {
  return Boolean(point) && Number.isFinite(point.col) && Number.isFinite(point.row);
}

function isPositive(number) {
  return Number.isFinite(number) && number > 0;
}

// Whether a mover has all the numbers it needs, and sensible ones. A platform with the same two ends, or a period of 0,
// would divide by nothing.
function isMover(mover, limits) {
  if (!mover || !isPositive(mover.size && mover.size.x) || !isPositive(mover.size && mover.size.z)) return false;
  if (!isPositive(mover.period) || !(mover.height >= 0 && mover.height <= limits.maxHeight)) return false;
  if (mover.phase !== undefined && !(mover.phase >= 0 && mover.phase < 1)) return false;
  if (mover.kind === "piston") return isPoint(mover.at) && Number.isFinite(mover.rise) && mover.rise >= 0;
  if (mover.kind === "platform") return isPoint(mover.from) && isPoint(mover.to) && (mover.from.col !== mover.to.col || mover.from.row !== mover.to.row);
  return false;
}

// The problems with the *shape* of a level, which are all errors: the rows, the start and goal, the clock, and every thing
// in the level having the numbers it needs. If there are any, nothing else can be checked.
function shapeProblems(level, limits) {
  const rows = level && level.rows;
  if (!Array.isArray(rows) || rows.length === 0 || !rows.every((row) => typeof row === "string")) {
    return [problem("error", "The level has no rows of floor")];
  }
  const found = [];
  const error = (message) => found.push(problem("error", message));
  const cols = rows[0].length;
  if (!rows.every((row) => row.length === cols)) error("The rows are not all the same length");
  if (cols < limits.minCols || cols > limits.maxCols) error(`A level is ${limits.minCols} to ${limits.maxCols} corners across, not ${cols}`);
  if (rows.length < limits.minRows || rows.length > limits.maxRows) error(`A level is ${limits.minRows} to ${limits.maxRows} corners down, not ${rows.length}`);
  if (!rows.every((row) => new RegExp(`^[.0-${limits.maxHeight}]*$`).test(row))) error(`A height is a dot, or a digit up to ${limits.maxHeight}`);
  if (!isPoint(level.start)) error("The level has no start");
  if (!isPoint(level.goal)) error("The level has no goal");
  if (!(level.time >= limits.minTime && level.time <= limits.maxTime)) error(`The time is ${limits.minTime} to ${limits.maxTime} seconds`);
  const lists = ["checkpoints", "enemies", "slime", "movers"];
  if (!lists.every((name) => level[name] === undefined || (Array.isArray(level[name]) && level[name].length <= limits.maxObjects))) {
    error(`A level has at most ${limits.maxObjects} of each thing`);
  }
  const list = (name) => (Array.isArray(level[name]) ? level[name] : []);
  if (![...list("checkpoints"), ...list("enemies"), ...list("slime")].every(isPoint)) error("A checkpoint, enemy or puddle has no place");
  if (!list("slime").every((puddle) => isPositive(puddle.radius))) error("A puddle of slime has no size");
  if (!list("movers").every((mover) => isMover(mover, limits))) error("A piston or platform has numbers that don't work");
  return found;
}

// Every corner a marble can get to from the start: from a corner to the next one along a row or a column, if both have
// floor and the step between them is at most two digits (a marble can climb a step of one, and roll down more). A moving
// platform joins the floor at one end of its way to the floor at the other. Returns the set of "col,row" keys.
function reachableCorners(grid) {
  const key = (col, row) => `${col},${row}`;
  const bridges = new Map();
  for (const mover of grid.movers.filter((m) => m.kind === "platform")) {
    const row = Math.round(mover.from.row);
    const left = key(Math.floor(Math.min(mover.from.col, mover.to.col) - 1), row);
    const right = key(Math.ceil(Math.max(mover.from.col, mover.to.col) + 1), row);
    bridges.set(left, right);
    bridges.set(right, left);
  }
  const seen = new Set();
  const todo = [[Math.round(grid.start.col), Math.round(grid.start.row)]];
  while (todo.length) {
    const [col, row] = todo.pop();
    if (seen.has(key(col, row))) continue;
    seen.add(key(col, row));
    const here = cornerHeight(grid, col, row);
    const next = [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]];
    const across = bridges.get(key(col, row));
    if (across) next.push(across.split(",").map(Number));
    for (const [c, r] of next) {
      const there = cornerHeight(grid, c, r);
      if (there === null || seen.has(key(c, r))) continue;
      if ((across && key(c, r) === across) || Math.abs(there - here) <= REACH_STEP + 1e-9) todo.push([c, r]);
    }
  }
  return seen;
}

// What a zone is called in a message: "the goal", "checkpoint 2", "slime puddle 1".
function zoneName(zone) {
  if (zone.kind === "goal") return "the goal";
  return `${zone.kind === "slime" ? "slime puddle" : "checkpoint"} ${zone.index + 1}`;
}

// The floor under the start and the goal. A marble can't start in the air, and a goal in the air can't be won.
function floorProblems(grid) {
  const found = [];
  for (const [name, point] of [["start", grid.start], ["goal", grid.goal]]) {
    if (heightAt(grid, point.col * CELL, point.row * CELL) === null) found.push(problem("error", `The ${name} is not on the floor`, point));
  }
  return found;
}

// Zones (the goal, the checkpoints, the slime) have to be on flat floor all the way round, clear of the start, and not
// on one another.
function zoneProblems(grid) {
  const found = [];
  const zones = levelZones(grid);
  for (const zone of zones) {
    const at = zonePosition(grid, zone);
    if (at.y === null) {
      if (zone.kind !== "goal") found.push(problem("warning", `${zoneName(zone)} is not on the floor`, zone));
      continue;
    }
    const reach = zoneRadius(zone) + ZONE_BORDER; // the border has to lie flat too
    const edges = [[reach, 0], [-reach, 0], [0, reach], [0, -reach]];
    const flat = edges.every(([dx, dz]) => {
      const height = heightAt(grid, at.x + dx, at.z + dz);
      return height !== null && Math.abs(height - at.y) < 1e-9;
    });
    if (!flat) found.push(problem("warning", `${zoneName(zone)} needs flat floor all round it`, zone));
  }
  const start = { x: grid.start.col * CELL, z: grid.start.row * CELL };
  const centre = (zone) => ({ x: zone.col * CELL, z: zone.row * CELL });
  for (const zone of zones) {
    const at = centre(zone);
    if (Math.hypot(at.x - start.x, at.z - start.z) <= (zoneRadius(zone) + ZONE_BORDER) * 2) found.push(problem("warning", `${zoneName(zone)} is too close to the start`, zone));
  }
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = centre(zones[i]);
      const b = centre(zones[j]);
      if (Math.hypot(a.x - b.x, a.z - b.z) <= zoneRadius(zones[i]) + zoneRadius(zones[j]) + ZONE_BORDER * 2) {
        found.push(problem("warning", `${zoneName(zones[i])} and ${zoneName(zones[j])} overlap`, zones[j]));
      }
    }
  }
  return found;
}

// The goal and every checkpoint have to be somewhere a marble can get to.
function reachProblems(grid) {
  const seen = reachableCorners(grid);
  const found = [];
  const zones = [{ kind: "goal", index: 0, ...grid.goal }, ...grid.checkpoints.map((checkpoint, index) => ({ kind: "checkpoint", index, ...checkpoint }))];
  for (const zone of zones) {
    if (!seen.has(`${Math.round(zone.col)},${Math.round(zone.row)}`)) found.push(problem("warning", `Nothing can reach ${zoneName(zone)} from the start`, zone));
  }
  return found;
}

// A piston stands on flat floor all across its box, at its own height. A platform meets the floor at each end, at its
// height, a little past it, so a marble can roll on and off, and has only a gap in the middle of its way.
function moverProblems(grid) {
  const found = [];
  grid.movers.forEach((mover, index) => {
    const top = mover.height * HEIGHT_STEP;
    const level = (x, z) => {
      const floor = heightAt(grid, x, z);
      return floor !== null && Math.abs(floor - top) < 1e-9;
    };
    if (mover.kind === "piston") {
      const x = mover.at.col * CELL;
      const z = mover.at.row * CELL;
      const flat = [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]].every(([dx, dz]) => level(x + (dx * mover.size.x) / 2, z + (dz * mover.size.z) / 2));
      if (!flat) found.push(problem("warning", `Piston ${index + 1} needs flat floor under all of it, at its height`, mover.at));
      return;
    }
    const dx = (mover.to.col - mover.from.col) * CELL;
    const dz = (mover.to.row - mover.from.row) * CELL;
    const length = Math.hypot(dx, dz);
    const along = { x: dx / length, z: dz / length };
    const half = (Math.abs(along.x) * mover.size.x + Math.abs(along.z) * mover.size.z) / 2; // how far it reaches along its way
    const ends = [[mover.from, -1], [mover.to, 1]].every(([end, sign]) => level(end.col * CELL + sign * along.x * (half + 0.3), end.row * CELL + sign * along.z * (half + 0.3)));
    if (!ends) found.push(problem("warning", `Platform ${index + 1} needs floor at its height past each end`, mover.from));
    const middle = { x: ((mover.from.col + mover.to.col) / 2) * CELL, z: ((mover.from.row + mover.to.row) / 2) * CELL };
    if (heightAt(grid, middle.x, middle.z) !== null) found.push(problem("warning", `Platform ${index + 1} has floor in its way`, mover.from));
  });
  return found;
}

// Enemies start on the floor, and well away from the start.
function enemyProblems(grid) {
  const found = [];
  grid.enemies.forEach((enemy, index) => {
    if (heightAt(grid, enemy.col * CELL, enemy.row * CELL) === null) {
      found.push(problem("warning", `Enemy ${index + 1} is not on the floor`, enemy));
    } else if (Math.hypot((enemy.col - grid.start.col) * CELL, (enemy.row - grid.start.row) * CELL) <= ENEMY_DISTANCE) {
      found.push(problem("warning", `Enemy ${index + 1} is too close to the start`, enemy));
    }
  });
  return found;
}

// The clock gives at least a second for every SPEED_FOR_TIME units in a straight line to the goal, and a checkpoint is never
// worth more than a quarter of the time (or it would be worth going back and forth).
function clockProblems(grid) {
  const found = [];
  const distance = Math.hypot((grid.goal.col - grid.start.col) * CELL, (grid.goal.row - grid.start.row) * CELL);
  if (grid.time < distance / SPEED_FOR_TIME) found.push(problem("warning", `${grid.time} seconds is too little for ${Math.round(distance)} units: ${Math.ceil(distance / SPEED_FOR_TIME)} at least`));
  grid.checkpoints.forEach((checkpoint, index) => {
    if (!(checkpoint.bonus >= 0 && checkpoint.bonus <= grid.time / 4)) found.push(problem("warning", `Checkpoint ${index + 1} gives more than a quarter of the time`, checkpoint));
  });
  return found;
}

// Everything wrong with a level, errors first. An empty list is a level that is fine.
function checkLevel(level, limits = EDITOR_LIMITS) {
  const shape = shapeProblems(level, limits);
  if (shape.length) return shape;
  const grid = parseLevel(level);
  const floor = floorProblems(grid);
  if (floor.length) return [...floor, ...zoneProblems(grid), ...enemyProblems(grid), ...clockProblems(grid)];
  return [...zoneProblems(grid), ...reachProblems(grid), ...moverProblems(grid), ...enemyProblems(grid), ...clockProblems(grid)];
}

// Whether a level can be played: it has no errors (warnings don't stop it).
function canPlay(problems) {
  return !problems.some((found) => found.severity === "error");
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { REACH_STEP, SPEED_FOR_TIME, ENEMY_DISTANCE, shapeProblems, reachableCorners, checkLevel, canPlay };
} else {
  Object.assign(window, { REACH_STEP, SPEED_FOR_TIME, ENEMY_DISTANCE, shapeProblems, reachableCorners, checkLevel, canPlay });
}
```

Things to notice:

- **A problem is `{ severity, message, col, row }`.** The `col` and `row` say *where*, so the editor can ring the place on the picture.
- **There are two severities.** An **error** is something that makes a level impossible to play at all: no rows, a size outside the limits, a start or a goal over a hole, a mover with a period of 0. A **warning** is something that makes it unfair or odd: a goal on a slope, a checkpoint nobody can reach, a clock that is too short. A level with warnings can still be *tried*, because the only way to find out whether a hard level is fair is to play it.
- **`shapeProblems` comes first, and is all errors.** If the shape is wrong (rows of different lengths, a character that isn't a height) nothing else can be checked, so it stops there. The size limits are read from the `limits` it is given.
- **`reachableCorners` is the flood fill from Tutorial 9**, which walks from the start from corner to corner where there is floor and the step is at most two digits, and treats a moving platform as a bridge. It was a function inside a test. Now it is real code, and the test will use it from here.
- **The zone, mover, enemy and clock checks are the same rules, word for word, as the tests.** The numbers (`ZONE_BORDER`, `HEIGHT_STEP`, how far from the start an enemy must be) come from the same constants the game uses, so they can't drift apart.
- **`checkLevel` puts errors first**, and when the start or goal is off the floor it doesn't try to find a way from a start that isn't there.
- **`canPlay(problems)` is true when there are no errors.** That is the gate for **Test** and **Play**.

### Tests

In `tests.html`, add the script below `limits.js`, and the tests below `limits.tests.js`:

```html
  <script src="js/check.js"></script>
  <script src="tests/check.tests.js"></script>
```

Open the placeholder `tests/check.tests.js` and replace its contents with:

```js
QUnit.module("checkLevel on the levels of the game", () => {
  QUnit.test("none of the ten levels has a problem", (assert) => {
    for (const level of LEVELS) assert.deepEqual(checkLevel(level), [], level.name);
  });

  QUnit.test("a blank level has none either", (assert) => {
    assert.deepEqual(checkLevel(blankLevel()), []);
  });
});

QUnit.module("checkLevel: the shape of a level", () => {
  const L = EDITOR_LIMITS;
  const messages = (level, limits = L) => checkLevel(level, limits).map((found) => found.message);
  const errors = (level, limits = L) => checkLevel(level, limits).filter((found) => found.severity === "error");

  QUnit.test("a level with no rows, or rows that are not text, is an error", (assert) => {
    assert.strictEqual(errors({}).length, 1);
    assert.strictEqual(errors(null).length, 1);
    assert.strictEqual(errors({ ...blankLevel(), rows: [] }).length, 1);
    assert.strictEqual(errors({ ...blankLevel(), rows: [1, 2] }).length, 1);
  });

  QUnit.test("rows of different lengths are an error", (assert) => {
    const level = blankLevel();
    level.rows[3] = level.rows[3].slice(1);
    assert.true(messages(level).some((text) => text.includes("same length")));
  });

  QUnit.test("a level wider or narrower than the limits is an error, and so is one too deep or too shallow", (assert) => {
    const wide = { ...blankLevel(), rows: Array(L.defaultRows).fill("2".repeat(L.maxCols + 1)) };
    const narrow = { ...blankLevel(), rows: Array(L.defaultRows).fill("2".repeat(L.minCols - 1)) };
    const deep = { ...blankLevel(), rows: Array(L.maxRows + 1).fill("2".repeat(L.defaultCols)) };
    const shallow = { ...blankLevel(), rows: Array(L.minRows - 1).fill("2".repeat(L.defaultCols)) };
    for (const level of [wide, narrow, deep, shallow]) assert.true(errors(level).some((found) => found.message.includes("corners")));
  });

  QUnit.test("the limits are the ones given, not fixed ones", (assert) => {
    const small = { ...L, maxCols: 10, maxRows: 8 };
    assert.deepEqual(errors(blankLevel(), small).length > 0, true);
    assert.deepEqual(checkLevel(blankLevel(), { ...L, maxCols: 100, maxRows: 100 }), []);
  });

  QUnit.test("a height must be a dot or a digit up to the highest", (assert) => {
    const level = blankLevel();
    level.rows[0] = "x" + level.rows[0].slice(1);
    assert.true(messages(level).some((text) => text.includes("height")));
    const tall = blankLevel();
    tall.rows[0] = "9" + tall.rows[0].slice(1);
    assert.strictEqual(errors(tall, { ...L, maxHeight: 5 }).length > 0, true);
  });

  QUnit.test("a level needs a start, a goal and a time within the limits", (assert) => {
    assert.true(messages({ ...blankLevel(), start: null }).includes("The level has no start"));
    assert.true(messages({ ...blankLevel(), goal: { col: "x", row: 1 } }).includes("The level has no goal"));
    assert.true(messages({ ...blankLevel(), time: L.minTime - 1 }).some((text) => text.includes("seconds")));
    assert.true(messages({ ...blankLevel(), time: L.maxTime + 1 }).some((text) => text.includes("seconds")));
  });

  QUnit.test("no more of a thing than the limit", (assert) => {
    const level = blankLevel();
    level.enemies = Array.from({ length: L.maxObjects + 1 }, () => ({ col: 10, row: 3 }));
    assert.true(messages(level).some((text) => text.includes("at most")));
  });

  QUnit.test("a thing with no place, or a puddle with no size, is an error", (assert) => {
    assert.strictEqual(errors({ ...blankLevel(), enemies: [{ col: 1 }] }).length, 1);
    assert.strictEqual(errors({ ...blankLevel(), slime: [{ col: 5, row: 5, radius: 0 }] }).length, 1);
  });

  QUnit.test("a mover with numbers that don't work is an error", (assert) => {
    const piston = { kind: "piston", at: { col: 10, row: 6 }, height: 2, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 3 };
    const platform = { kind: "platform", from: { col: 5, row: 5 }, to: { col: 8, row: 5 }, height: 2, size: { x: 5, z: 6 }, period: 12 };
    assert.strictEqual(errors({ ...blankLevel(), movers: [piston, platform] }).length, 0);
    for (const broken of [{ ...piston, period: 0 }, { ...piston, size: { x: 0, z: 1 } }, { ...piston, kind: "fan" }, { ...platform, to: platform.from }, { ...piston, phase: 1 }]) {
      assert.strictEqual(errors({ ...blankLevel(), movers: [broken] }).length, 1);
    }
  });

  QUnit.test("when the shape is wrong, nothing else is said", (assert) => {
    const level = { ...blankLevel(), rows: [] };
    assert.strictEqual(checkLevel(level).length, 1);
  });
});

QUnit.module("checkLevel: is it fair", () => {
  const warnings = (level) => checkLevel(level).filter((found) => found.severity === "warning").map((found) => found.message);
  const withRow = (level, row, text) => {
    level.rows[row] = text;
    return level;
  };

  QUnit.test("a start or a goal over a hole is an error, and says where", (assert) => {
    const level = blankLevel();
    level.rows = level.rows.map((row, i) => (i === level.start.row ? "." + row.slice(1) : row));
    level.start = { col: 0, row: level.start.row };
    const found = checkLevel(level);

    assert.strictEqual(found[0].severity, "error");
    assert.true(found[0].message.includes("start"));
    assert.deepEqual([found[0].col, found[0].row], [0, level.start.row]);
    assert.false(canPlay(found));
  });

  QUnit.test("a goal on a slope needs flat floor", (assert) => {
    const level = blankLevel();
    level.rows = level.rows.map((row, i) => (i === level.goal.row ? row.slice(0, level.goal.col) + "5" + row.slice(level.goal.col + 1) : row));
    const found = warnings(level);

    assert.true(found.includes("the goal needs flat floor all round it"));
    assert.true(canPlay(checkLevel(level)));
  });

  QUnit.test("a checkpoint and a puddle are checked the same way, and named", (assert) => {
    const level = blankLevel();
    level.checkpoints = [{ col: 9, row: 6, bonus: 10 }];
    level.slime = [{ col: 12, row: 6, radius: 1.6 }];
    level.rows = level.rows.map((row, i) => (i === 6 ? row.slice(0, 9) + "5" + row.slice(10, 12) + "5" + row.slice(13) : row));
    const found = warnings(level);

    assert.true(found.includes("checkpoint 1 needs flat floor all round it"));
    assert.true(found.includes("slime puddle 1 needs flat floor all round it"));
  });

  QUnit.test("a checkpoint over a hole is not on the floor", (assert) => {
    const level = blankLevel();
    level.checkpoints = [{ col: 9, row: 6, bonus: 10 }];
    level.rows = level.rows.map((row) => row.slice(0, 8) + "...." + row.slice(12));
    assert.true(warnings(level).includes("checkpoint 1 is not on the floor"));
  });

  QUnit.test("a zone too close to the start, or to another, is a warning", (assert) => {
    const near = blankLevel();
    near.checkpoints = [{ col: near.start.col + 1, row: near.start.row, bonus: 10 }];
    assert.true(warnings(near).includes("checkpoint 1 is too close to the start"));

    const twins = blankLevel();
    twins.checkpoints = [{ col: 8, row: 6, bonus: 10 }, { col: 8.5, row: 6, bonus: 10 }];
    assert.true(warnings(twins).includes("checkpoint 1 and checkpoint 2 overlap"));
  });

  QUnit.test("a goal that nothing can reach is a warning, and the level can still be tried", (assert) => {
    const level = blankLevel();
    for (let row = 0; row < level.rows.length; row++) withRow(level, row, level.rows[row].slice(0, 10) + ".." + level.rows[row].slice(12));
    const found = checkLevel(level);

    assert.true(found.some((one) => one.message === "Nothing can reach the goal from the start"));
    assert.true(canPlay(found));
  });

  QUnit.test("a step of more than two digits can't be climbed, so it cuts the level in two", (assert) => {
    const level = blankLevel();
    for (let row = 0; row < level.rows.length; row++) withRow(level, row, level.rows[row].slice(0, 10) + "7".repeat(10));
    assert.true(warnings(level).includes("Nothing can reach the goal from the start"));
  });

  QUnit.test("a platform is a bridge across a gap", (assert) => {
    const level = blankLevel();
    for (let row = 0; row < level.rows.length; row++) withRow(level, row, level.rows[row].slice(0, 9) + "....." + level.rows[row].slice(14));
    level.movers = [{ kind: "platform", from: { col: 9.25, row: 6 }, to: { col: 12.75, row: 6 }, height: 2, size: { x: 5, z: 6 }, period: 12 }];

    assert.deepEqual(checkLevel(level), []);
  });

  QUnit.test("a piston has to stand on flat floor at its height", (assert) => {
    const level = blankLevel();
    level.movers = [{ kind: "piston", at: { col: 10, row: 6 }, height: 2, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 3 }];
    assert.deepEqual(checkLevel(level), []);

    level.movers[0].height = 3;
    assert.true(warnings(level).includes("Piston 1 needs flat floor under all of it, at its height"));
  });

  QUnit.test("a platform needs floor past each end, and none in its way", (assert) => {
    const level = blankLevel();
    level.movers = [{ kind: "platform", from: { col: 9.25, row: 6 }, to: { col: 12.75, row: 6 }, height: 2, size: { x: 5, z: 6 }, period: 12 }];
    assert.true(warnings(level).includes("Platform 1 has floor in its way"));

    level.movers[0].height = 5;
    assert.true(warnings(level).includes("Platform 1 needs floor at its height past each end"));
  });

  QUnit.test("an enemy has to be on the floor, and not close to the start", (assert) => {
    const level = blankLevel();
    level.enemies = [{ col: level.start.col + 2, row: level.start.row }, { col: 40, row: 3 }];
    const found = warnings(level);

    assert.true(found.includes("Enemy 1 is too close to the start"));
    assert.true(found.includes("Enemy 2 is not on the floor"));
  });

  QUnit.test("the clock has to be long enough for the way to the goal", (assert) => {
    const far = Math.ceil((EDITOR_LIMITS.minTime * SPEED_FOR_TIME) / CELL) + 5; // a way that takes more than the shortest time
    const level = { ...blankLevel(), rows: Array(EDITOR_LIMITS.defaultRows).fill("2".repeat(far + 5)), time: EDITOR_LIMITS.minTime, start: { col: 1, row: 6 }, goal: { col: far, row: 6 } };
    assert.true(warnings(level).some((text) => text.includes("too little")));
  });

  QUnit.test("a checkpoint is not worth more than a quarter of the time", (assert) => {
    const level = blankLevel();
    level.checkpoints = [{ col: 9, row: 6, bonus: level.time }];
    assert.true(warnings(level).includes("Checkpoint 1 gives more than a quarter of the time"));
  });

  QUnit.test("errors come before warnings", (assert) => {
    const level = blankLevel();
    level.start = { col: 40, row: 3 };
    level.enemies = [{ col: 30, row: 3 }];
    const severities = checkLevel(level).map((found) => found.severity);

    assert.strictEqual(severities[0], "error");
    assert.deepEqual(severities, [...severities].sort((a, b) => (a === "error" ? -1 : 1) - (b === "error" ? -1 : 1)));
  });
});

QUnit.module("reachableCorners and canPlay", () => {
  QUnit.test("reachableCorners finds the corners joined to the start by floor", (assert) => {
    const grid = parseLevel({ ...blankLevel(), rows: ["2222.222", "2222.222", "2222.222", "2222.222", "2222.222", "2222.222"], start: { col: 0, row: 0 } });
    const seen = reachableCorners(grid);

    assert.true(seen.has("3,5"));
    assert.false(seen.has("5,0"));
    assert.strictEqual(seen.size, 24);
  });

  QUnit.test("a step of two digits can be climbed, and of three can't", (assert) => {
    const base = { ...blankLevel(), start: { col: 0, row: 0 } };
    const two = reachableCorners(parseLevel({ ...base, rows: Array(6).fill("22224444") }));
    const three = reachableCorners(parseLevel({ ...base, rows: Array(6).fill("22225555") }));

    assert.true(two.has("7,0"));
    assert.false(three.has("7,0"));
  });

  QUnit.test("canPlay is false only for errors", (assert) => {
    assert.true(canPlay([]));
    assert.true(canPlay([{ severity: "warning", message: "x" }]));
    assert.false(canPlay([{ severity: "warning", message: "x" }, { severity: "error", message: "y" }]));
  });
});
```

Things to notice:

- **The best test is the first: none of the ten levels has a problem.** The new checker agrees with every judgement of the old tests, so the rules really did move and not change. A blank level has none either.
- **Each rule has a test that breaks it**: a hole under the start, a slope under the goal, a checkpoint over a hole, two zones on top of each other, a step too high to climb, a gap with a platform across it, a piston at the wrong height, an enemy next to the start, a clock that is too short.
- **A level is built, then spoiled one way at a time**, starting from `blankLevel()`, which has no problems. A test that spoils two things at once can't say which found it.
- **Errors come before warnings** is a test too, because the editor shows the list in the order it is given.

Now the old test. Open `tests/level.tests.js`. In the module *"the ten levels"*, find the comment that starts `// Every corner that can be reached from the start` and **delete** it and the function under it (down to and including the closing `};` of `reachable`). In the test *"the goal and every checkpoint can be walked to from the start"*, change the call so that it uses the shared function:

```js
      const seen = reachableCorners(grid);
```

Things to notice:

- **One copy of the rule.** The test and the editor use the same flood fill, so a fix in one is a fix in both.
- **The older tests for zones and movers keep their own copies** of the flatness rules, as they were written for their own tutorials. They could be changed to use `checkLevel` too (see the challenges), but each of them is also a test of *those* rules, and having two sets that agree is not a bad thing.

Open `tests.html`. You should see **635 passing tests**: 29 more.

---

## Step 3: Things in a level

Everything in a level that isn't floor is a *thing*: the start, the goal, a checkpoint, an enemy, a puddle of slime, a piston, a platform. Each is a few numbers in the level's data, so adding one is pushing an object into a list, and moving one is changing two numbers. These functions do that for a plain level object, and know nothing about the page. Open the placeholder `js/things.js` and replace its contents with:

```js
// The things in a level that aren't floor: the start, the goal, checkpoints, enemies, puddles of slime, pistons and
// platforms. Each is a few numbers in the level's data, and these functions add, find, move, change and remove them. They
// work on a plain level object and know nothing about the page, so they are easy to test. A thing is pointed to by a
// *ref*, { kind, index }, where kind is "start", "goal", "checkpoint", "enemy", "slime" or "mover". See ../tests/things.tests.js.

// The list in a level that each kind of thing lives in. The start and the goal are one each, and are not in a list.
const THING_LISTS = { checkpoint: "checkpoints", enemy: "enemies", slime: "slime", mover: "movers" };

// What a new thing starts as. They are all changed in the editor afterwards, so these are only a good first try.
const THING_DEFAULTS = {
  slimeRadius: 1.6,
  pistonSize: 2.4,
  pistonRise: 1.2,
  pistonPeriod: 3.5,
  platformSize: { x: 5, z: 6 },
  platformPeriod: 12,
  platformSpan: 3.5, // how far a new platform goes, in corners
  hitReach: 0.8, // how near a click has to be to a thing to pick it, in corners
};

// Things are placed on a grid of half a corner (a platform's ends, on a quarter), so they line up the way the levels of the
// game do.
const THING_SNAP = 0.5;
const PLATFORM_SNAP = 0.25;

function snapTo(value, step) {
  return Math.round(value / step) * step;
}

function snapPoint(point, step = THING_SNAP) {
  return { col: snapTo(point.col, step), row: snapTo(point.row, step) };
}

// The things of one kind, as a list (an empty one if the level has none).
function thingList(level, kind) {
  return level[THING_LISTS[kind]] || [];
}

// The thing a ref points to, or undefined.
function thingOf(level, ref) {
  return ref.kind === "start" || ref.kind === "goal" ? level[ref.kind] : thingList(level, ref.kind)[ref.index];
}

// Every thing in the level, as refs, start and goal first.
function allThings(level) {
  const refs = [{ kind: "start", index: 0 }, { kind: "goal", index: 0 }];
  for (const kind of Object.keys(THING_LISTS)) thingList(level, kind).forEach((_, index) => refs.push({ kind, index }));
  return refs;
}

// The height (a digit) of the floor at a place, or if there is a hole there, of the first floor to the left of it. A level
// with no floor at all in that row gives a middling height.
function floorDigit(level, col, row, limits = EDITOR_LIMITS) {
  const line = level.rows[clampInt(row, 0, level.rows.length - 1)];
  for (let at = clampInt(col, 0, line.length - 1); at >= 0; at--) {
    if (line[at] !== ".") return Number(line[at]);
  }
  return Math.min(4, limits.maxHeight);
}

// A new thing of the kind a tool places, at `at`. (A piston or a platform is a mover: a "piston" tool makes a piston.)
function newThing(tool, level, at, limits) {
  const height = floorDigit(level, at.col, at.row, limits);
  if (tool === "checkpoint") return { ...at, bonus: limits.defaultBonus };
  if (tool === "slime") return { ...at, radius: THING_DEFAULTS.slimeRadius };
  if (tool === "piston") {
    const size = { x: THING_DEFAULTS.pistonSize, z: THING_DEFAULTS.pistonSize };
    return { kind: "piston", at, height, size, rise: THING_DEFAULTS.pistonRise, period: THING_DEFAULTS.pistonPeriod };
  }
  if (tool === "platform") {
    const from = snapPoint(at, PLATFORM_SNAP);
    const to = { col: from.col + THING_DEFAULTS.platformSpan, row: from.row };
    return { kind: "platform", from, to, height, size: { ...THING_DEFAULTS.platformSize }, period: THING_DEFAULTS.platformPeriod };
  }
  return { ...at }; // an enemy
}

// Whether there is room for another thing of the kind a tool places: the start and the goal are always moved, and a list is
// full at the limit.
function hasRoom(level, tool, limits = EDITOR_LIMITS) {
  if (tool === "start" || tool === "goal") return true;
  const kind = tool === "piston" || tool === "platform" ? "mover" : tool;
  return Boolean(THING_LISTS[kind]) && thingList(level, kind).length < limits.maxObjects;
}

// Puts a thing in the level, at a place in corners (snapped). The start and the goal are moved, since there is only one of
// each. Returns the ref of the thing, or null if the level already has as many of that kind as it is allowed.
function placeThing(level, tool, point, limits = EDITOR_LIMITS) {
  const at = snapPoint(point);
  if (tool === "start" || tool === "goal") {
    level[tool] = at;
    return { kind: tool, index: 0 };
  }
  const kind = tool === "piston" || tool === "platform" ? "mover" : tool;
  if (!THING_LISTS[kind]) return null;
  const list = (level[THING_LISTS[kind]] = thingList(level, kind));
  if (list.length >= limits.maxObjects) return null;
  list.push(newThing(tool, level, at, limits));
  return { kind, index: list.length - 1 };
}

// How far a place is from a thing, in corners. A platform is the whole of its way, so it is the distance to that line.
function thingDistance(level, ref, point) {
  const thing = thingOf(level, ref);
  if (ref.kind === "mover" && thing.kind === "platform") {
    const dx = thing.to.col - thing.from.col;
    const dy = thing.to.row - thing.from.row;
    const along = Math.max(0, Math.min(1, ((point.col - thing.from.col) * dx + (point.row - thing.from.row) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(point.col - (thing.from.col + dx * along), point.row - (thing.from.row + dy * along));
  }
  const centre = ref.kind === "mover" ? thing.at : thing;
  return Math.hypot(point.col - centre.col, point.row - centre.row);
}

// The thing nearest a place, if any is within `reach` corners of it. Where two are as near, the one made later wins.
function thingAt(level, point, reach = THING_DEFAULTS.hitReach) {
  let best = null;
  let bestDistance = reach;
  for (const ref of allThings(level)) {
    const distance = thingDistance(level, ref, point);
    if (distance <= bestDistance) {
      best = ref;
      bestDistance = distance;
    }
  }
  return best;
}

// Takes a thing out of the level. The start and the goal can't be taken out: a level needs both. Says whether it did.
function removeThing(level, ref) {
  if (ref.kind === "start" || ref.kind === "goal") return false;
  const list = thingList(level, ref.kind);
  if (!list[ref.index]) return false;
  list.splice(ref.index, 1);
  return true;
}

// Moves a thing so that its place is `point` (snapped). A platform keeps its length and direction: its first end goes to the
// place, and the other end goes with it.
function moveThing(level, ref, point) {
  const thing = thingOf(level, ref);
  if (!thing) return;
  if (ref.kind === "mover" && thing.kind === "platform") {
    const from = snapPoint(point, PLATFORM_SNAP);
    thing.to = { col: thing.to.col + from.col - thing.from.col, row: thing.to.row + from.row - thing.from.row };
    thing.from = from;
    return;
  }
  const at = snapPoint(point);
  const centre = ref.kind === "mover" ? thing.at : thing;
  centre.col = at.col;
  centre.row = at.row;
}

// What a thing is called, for a heading: "Checkpoint 2", "Piston 1", "Goal".
function thingName(level, ref) {
  const thing = thingOf(level, ref);
  if (!thing) return "";
  const label = ref.kind === "mover" ? thing.kind : ref.kind === "slime" ? "slime puddle" : ref.kind;
  const text = label[0].toUpperCase() + label.slice(1);
  return ref.kind === "start" || ref.kind === "goal" ? text : `${text} ${ref.index + 1}`;
}

// The numbers of a thing that can be changed, as rows: where it is, and what it does. A row is { path, label, min, max, step },
// and its path says where in the thing the number is ("size.x" is the x of its size). Like the rows of the developer panel, a
// new number is a new line.
function thingFields(level, ref, limits = EDITOR_LIMITS) {
  const thing = thingOf(level, ref);
  if (!thing) return [];
  const cols = level.rows[0].length - 1;
  const rows = level.rows.length - 1;
  const place = (path, label, step = THING_SNAP) => [
    { path: `${path}col`, label: `${label}across`, min: 0, max: cols, step },
    { path: `${path}row`, label: `${label}down`, min: 0, max: rows, step },
  ];
  const height = { path: "height", label: "height", min: 0, max: limits.maxHeight, step: 1 };
  const phase = { path: "phase", label: "phase", min: 0, max: 0.95, step: 0.05 };
  if (ref.kind === "checkpoint") return [...place("", ""), { path: "bonus", label: "bonus (s)", min: 0, max: limits.maxTime / 4, step: 1 }];
  if (ref.kind === "slime") return [...place("", ""), { path: "radius", label: "radius", min: 0.5, max: 4, step: 0.1 }];
  if (ref.kind !== "mover") return place("", "");
  if (thing.kind === "piston") {
    return [
      ...place("at.", ""),
      height,
      { path: "rise", label: "rise", min: 0.2, max: 3, step: 0.1 },
      { path: "period", label: "period (s)", min: 1, max: 20, step: 0.1 },
      phase,
      { path: "size.x", label: "width", min: 1, max: 6, step: 0.1 },
      { path: "size.z", label: "depth", min: 1, max: 6, step: 0.1 },
    ];
  }
  return [
    ...place("from.", "start ", PLATFORM_SNAP),
    ...place("to.", "end ", PLATFORM_SNAP),
    height,
    { path: "period", label: "period (s)", min: 2, max: 40, step: 1 },
    phase,
    { path: "size.x", label: "width", min: 1, max: 10, step: 0.5 },
    { path: "size.z", label: "depth", min: 1, max: 10, step: 0.5 },
  ];
}

// The number at a path in a thing: getField(piston, "size.x").
function getField(thing, path) {
  return path.split(".").reduce((value, key) => (value === undefined ? undefined : value[key]), thing);
}

// Sets the number at a path in a thing (the object in front of the last key has to be there already).
function setField(thing, path, value) {
  const keys = path.split(".");
  const last = keys.pop();
  keys.reduce((object, key) => object[key], thing)[last] = value;
}

// Changes one number of a thing, held to the range of its row and to its step. Returns the number it was set to, or null if
// the thing has no such number.
function setThingField(level, ref, path, value, limits = EDITOR_LIMITS) {
  const field = thingFields(level, ref, limits).find((row) => row.path === path);
  if (!field) return null;
  const number = clampStep(value, field.min, field.max, field.step);
  setField(thingOf(level, ref), path, number);
  return number;
}

// Makes the floor flat under a goal, a checkpoint, a puddle of slime or a piston, as far as they reach, because they all
// need it. The height is the one at the middle (a piston's own height, for a piston), and any holes there are filled.
// Returns how many corners it set, or -1 for a thing that needs no flat floor.
function flattenFloor(level, ref, limits = EDITOR_LIMITS) {
  const thing = thingOf(level, ref);
  if (!thing || !["goal", "checkpoint", "slime", "mover"].includes(ref.kind)) return -1;
  const isPiston = ref.kind === "mover";
  if (isPiston && thing.kind !== "piston") return -1;
  const centre = isPiston ? thing.at : thing;
  const reach = isPiston
    ? { col: thing.size.x / 2 / CELL, row: thing.size.z / 2 / CELL }
    : { col: (zoneRadius(thing) + ZONE_BORDER) / CELL, row: (zoneRadius(thing) + ZONE_BORDER) / CELL };
  const digit = isPiston ? thing.height : floorDigit(level, centre.col, centre.row, limits);
  let changed = 0;
  const rows = level.rows.map((line) => [...line]);
  for (let row = Math.max(0, Math.floor(centre.row - reach.row)); row <= Math.min(rows.length - 1, Math.floor(centre.row + reach.row) + 1); row++) {
    for (let col = Math.max(0, Math.floor(centre.col - reach.col)); col <= Math.min(rows[0].length - 1, Math.floor(centre.col + reach.col) + 1); col++) {
      if (rows[row][col] !== String(digit)) changed++;
      rows[row][col] = String(digit);
    }
  }
  level.rows = rows.map((line) => line.join(""));
  return changed;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { THING_LISTS, THING_DEFAULTS, THING_SNAP, PLATFORM_SNAP, snapTo, snapPoint, thingList, thingOf, allThings, floorDigit, hasRoom, placeThing, thingDistance, thingAt, removeThing, moveThing, thingName, thingFields, getField, setField, setThingField, flattenFloor };
} else {
  Object.assign(window, { THING_LISTS, THING_DEFAULTS, THING_SNAP, PLATFORM_SNAP, snapTo, snapPoint, thingList, thingOf, allThings, floorDigit, hasRoom, placeThing, thingDistance, thingAt, removeThing, moveThing, thingName, thingFields, getField, setField, setThingField, flattenFloor });
}
```

Things to notice:

- **A thing is pointed to by a *ref*, `{ kind, index }`.** The start and the goal are one each, so their index is 0; the others are the place in their list. `thingOf(level, ref)` turns a ref into the thing.
- **Defaults are a table**, `THING_DEFAULTS`: how big a new puddle is, how far a new platform goes, how near a click has to be to pick something. A new thing is only a *first try*; the editor lets you change every number.
- **A new piston or platform takes the height of the floor it is on** (`floorDigit`), or of the nearest floor to its left. A piston at the wrong height is one of the commonest mistakes, and this one makes it hard to make.
- **Things snap to half a corner** (a platform's ends to a quarter), the grid the ten levels already use.
- **`hasRoom` and `placeThing` keep to the limit**: a level has at most `maxObjects` of each kind. `placeThing` returns `null` when there is no room, and `hasRoom` lets the editor ask *first*, so a click that can't place anything doesn't make a step of Undo.
- **`thingAt` is nearest-within-reach.** A platform is found anywhere along its way (the distance to the *line*), because a platform is the whole of where it goes, not just where it starts.
- **`thingFields` is a table, like the developer panel's rows.** Each kind of thing says which numbers it has, their ranges and their steps, and the editor builds a box for each. A new number is a new line. The ranges for a height come from `maxHeight`.
- **`getField` and `setField` work along a path**: `"size.x"` is the `x` of the `size`. `setThingField` holds the number to its row's range and step, so the form can't make a level with a platform that is 0 wide.
- **`flattenFloor` makes the floor flat under a goal, checkpoint, puddle or piston**, as far as it reaches, to the height at its middle (a piston's own height, for a piston), and fills any holes there. Every zone needs flat floor, and this is the button for it.

### Tests

In `tests.html`, add the script below `check.js`, and the tests below `check.tests.js`:

```html
  <script src="js/things.js"></script>
  <script src="tests/things.tests.js"></script>
```

Open the placeholder `tests/things.tests.js` and replace its contents with:

```js
QUnit.module("placing things", () => {
  QUnit.test("the start and the goal are moved, not added, and snap to half a corner", (assert) => {
    const level = blankLevel();

    const ref = placeThing(level, "goal", { col: 10.3, row: 4.8 });

    assert.deepEqual(ref, { kind: "goal", index: 0 });
    assert.deepEqual(level.goal, { col: 10.5, row: 5 });
    placeThing(level, "start", { col: 1, row: 1 });
    assert.deepEqual(level.start, { col: 1, row: 1 });
  });

  QUnit.test("a checkpoint is worth the default bonus", (assert) => {
    const level = blankLevel();

    const ref = placeThing(level, "checkpoint", { col: 8, row: 3 });

    assert.deepEqual(ref, { kind: "checkpoint", index: 0 });
    assert.deepEqual(level.checkpoints[0], { col: 8, row: 3, bonus: EDITOR_LIMITS.defaultBonus });
  });

  QUnit.test("an enemy, a puddle, a piston and a platform each go in their own list", (assert) => {
    const level = blankLevel();

    placeThing(level, "enemy", { col: 12, row: 3 });
    placeThing(level, "slime", { col: 8, row: 8 });
    const piston = placeThing(level, "piston", { col: 10, row: 6 });
    const platform = placeThing(level, "platform", { col: 5.1, row: 6 });

    assert.deepEqual(level.enemies, [{ col: 12, row: 3 }]);
    assert.strictEqual(level.slime[0].radius, THING_DEFAULTS.slimeRadius);
    assert.deepEqual([piston, platform], [{ kind: "mover", index: 0 }, { kind: "mover", index: 1 }]);
    assert.strictEqual(level.movers[0].kind, "piston");
    assert.strictEqual(level.movers[1].kind, "platform");
  });

  QUnit.test("a new piston or platform is at the height of the floor it is on", (assert) => {
    const level = blankLevel();
    level.rows = level.rows.map((row) => row.slice(0, 5) + "7" + row.slice(6));

    placeThing(level, "piston", { col: 5, row: 4 });
    placeThing(level, "platform", { col: 9, row: 4 });

    assert.strictEqual(level.movers[0].height, 7);
    assert.strictEqual(level.movers[1].height, 2);
  });

  QUnit.test("a new platform goes to the right, by the span, on quarters of a corner", (assert) => {
    const level = blankLevel();

    placeThing(level, "platform", { col: 5.1, row: 4 });

    const platform = level.movers[0];
    assert.deepEqual(platform.from, { col: 5, row: 4 });
    assert.deepEqual(platform.to, { col: 5 + THING_DEFAULTS.platformSpan, row: 4 });
  });

  QUnit.test("no more of a kind than the limit, which is a limit that can be changed", (assert) => {
    const limits = { ...EDITOR_LIMITS, maxObjects: 2 };
    const level = blankLevel();

    assert.ok(placeThing(level, "enemy", { col: 12, row: 3 }, limits));
    assert.ok(placeThing(level, "enemy", { col: 13, row: 3 }, limits));
    assert.strictEqual(placeThing(level, "enemy", { col: 14, row: 3 }, limits), null);
    assert.strictEqual(level.enemies.length, 2);
    assert.ok(placeThing(level, "checkpoint", { col: 8, row: 3 }, limits));
  });

  QUnit.test("a tool that is not a thing places nothing", (assert) => {
    assert.strictEqual(placeThing(blankLevel(), "banana", { col: 1, row: 1 }), null);
  });

  QUnit.test("floorDigit is the height of the floor, or of the nearest to the left", (assert) => {
    const level = blankLevel();
    level.rows[3] = "34....56" + level.rows[3].slice(8);

    assert.strictEqual(floorDigit(level, 1, 3), 4);
    assert.strictEqual(floorDigit(level, 4, 3), 4);
    assert.strictEqual(floorDigit(level, 6, 3), 5);
    level.rows[3] = ".".repeat(level.rows[3].length);
    assert.strictEqual(floorDigit(level, 6, 3), 4);
  });
});

QUnit.module("finding, moving and removing things", () => {
  const make = () => {
    const level = blankLevel();
    placeThing(level, "checkpoint", { col: 8, row: 3 });
    placeThing(level, "enemy", { col: 12, row: 8 });
    placeThing(level, "platform", { col: 5, row: 5 });
    return level;
  };

  QUnit.test("allThings lists the start and the goal first, then each list in turn", (assert) => {
    assert.deepEqual(allThings(make()).map((ref) => ref.kind), ["start", "goal", "checkpoint", "enemy", "mover"]);
  });

  QUnit.test("thingAt finds the thing nearest a place, within reach", (assert) => {
    const level = make();

    assert.deepEqual(thingAt(level, { col: 8.2, row: 3.1 }), { kind: "checkpoint", index: 0 });
    assert.deepEqual(thingAt(level, { col: 2, row: 6 }), { kind: "start", index: 0 });
    assert.strictEqual(thingAt(level, { col: 15, row: 1 }), null);
  });

  QUnit.test("a platform is found anywhere along its way", (assert) => {
    const level = make();
    const middle = { col: level.movers[0].from.col + THING_DEFAULTS.platformSpan / 2, row: 5.2 };

    assert.deepEqual(thingAt(level, middle), { kind: "mover", index: 0 });
  });

  QUnit.test("thingAt takes the reach it is given", (assert) => {
    const level = make();
    assert.strictEqual(thingAt(level, { col: 9, row: 3 }, 0.5), null);
    assert.deepEqual(thingAt(level, { col: 9, row: 3 }, 1.5), { kind: "checkpoint", index: 0 });
  });

  QUnit.test("moveThing moves a thing, snapped", (assert) => {
    const level = make();

    moveThing(level, { kind: "checkpoint", index: 0 }, { col: 10.2, row: 4.9 });
    moveThing(level, { kind: "goal", index: 0 }, { col: 3, row: 2 });

    assert.deepEqual([level.checkpoints[0].col, level.checkpoints[0].row], [10, 5]);
    assert.deepEqual(level.goal, { col: 3, row: 2 });
  });

  QUnit.test("moveThing moves a platform with its other end", (assert) => {
    const level = make();
    const { from, to } = JSON.parse(JSON.stringify(level.movers[0]));

    moveThing(level, { kind: "mover", index: 0 }, { col: from.col + 2, row: from.row + 1 });

    assert.deepEqual(level.movers[0].from, { col: from.col + 2, row: from.row + 1 });
    assert.deepEqual(level.movers[0].to, { col: to.col + 2, row: to.row + 1 });
  });

  QUnit.test("removeThing takes a thing out, and the others close up", (assert) => {
    const level = make();
    placeThing(level, "enemy", { col: 14, row: 8 });

    assert.true(removeThing(level, { kind: "enemy", index: 0 }));

    assert.deepEqual(level.enemies, [{ col: 14, row: 8 }]);
  });

  QUnit.test("the start and the goal can't be taken out, and nor can a thing that isn't there", (assert) => {
    const level = make();
    assert.false(removeThing(level, { kind: "start", index: 0 }));
    assert.false(removeThing(level, { kind: "goal", index: 0 }));
    assert.false(removeThing(level, { kind: "enemy", index: 5 }));
    assert.ok(level.start && level.goal);
  });

  QUnit.test("thingName says what it is, and which", (assert) => {
    const level = make();
    placeThing(level, "slime", { col: 4, row: 8 });
    placeThing(level, "piston", { col: 10, row: 6 });

    assert.strictEqual(thingName(level, { kind: "goal", index: 0 }), "Goal");
    assert.strictEqual(thingName(level, { kind: "checkpoint", index: 0 }), "Checkpoint 1");
    assert.strictEqual(thingName(level, { kind: "slime", index: 0 }), "Slime puddle 1");
    assert.strictEqual(thingName(level, { kind: "mover", index: 0 }), "Platform 1");
    assert.strictEqual(thingName(level, { kind: "mover", index: 1 }), "Piston 2");
    assert.strictEqual(thingName(level, { kind: "enemy", index: 9 }), "");
  });
});

QUnit.module("the numbers of a thing", () => {
  QUnit.test("each kind of thing has the rows it needs", (assert) => {
    const level = blankLevel();
    placeThing(level, "checkpoint", { col: 8, row: 3 });
    placeThing(level, "slime", { col: 4, row: 8 });
    placeThing(level, "piston", { col: 10, row: 6 });
    placeThing(level, "platform", { col: 5, row: 5 });
    const paths = (ref) => thingFields(level, ref).map((field) => field.path);

    assert.deepEqual(paths({ kind: "goal", index: 0 }), ["col", "row"]);
    assert.deepEqual(paths({ kind: "checkpoint", index: 0 }), ["col", "row", "bonus"]);
    assert.deepEqual(paths({ kind: "slime", index: 0 }), ["col", "row", "radius"]);
    assert.deepEqual(paths({ kind: "mover", index: 0 }), ["at.col", "at.row", "height", "rise", "period", "phase", "size.x", "size.z"]);
    assert.deepEqual(paths({ kind: "mover", index: 1 }), ["from.col", "from.row", "to.col", "to.row", "height", "period", "phase", "size.x", "size.z"]);
    assert.deepEqual(thingFields(level, { kind: "enemy", index: 3 }), []);
  });

  QUnit.test("every row has a label, and a range that is not empty", (assert) => {
    const level = blankLevel();
    placeThing(level, "piston", { col: 10, row: 6 });
    placeThing(level, "platform", { col: 5, row: 5 });
    for (const index of [0, 1]) {
      for (const field of thingFields(level, { kind: "mover", index })) {
        assert.true(field.label.length > 0 && field.min < field.max && field.step > 0, field.path);
      }
    }
  });

  QUnit.test("getField and setField work along a path", (assert) => {
    const thing = { size: { x: 2, z: 3 }, period: 4 };

    assert.strictEqual(getField(thing, "size.z"), 3);
    assert.strictEqual(getField(thing, "period"), 4);
    assert.strictEqual(getField(thing, "size.q"), undefined);
    assert.strictEqual(getField(thing, "nothing.here"), undefined);
    setField(thing, "size.z", 9);
    assert.strictEqual(thing.size.z, 9);
  });

  QUnit.test("setThingField holds a number to its range and its step", (assert) => {
    const level = blankLevel();
    placeThing(level, "slime", { col: 4, row: 8 });
    const ref = { kind: "slime", index: 0 };

    assert.strictEqual(setThingField(level, ref, "radius", 2.04), 2);
    assert.strictEqual(setThingField(level, ref, "radius", 99), 4);
    assert.strictEqual(setThingField(level, ref, "radius", -1), 0.5);
    assert.strictEqual(level.slime[0].radius, 0.5);
    assert.strictEqual(setThingField(level, ref, "col", 999), level.rows[0].length - 1);
  });

  QUnit.test("a height is held to the highest the limits allow", (assert) => {
    const level = blankLevel();
    placeThing(level, "piston", { col: 10, row: 6 });
    const limits = { ...EDITOR_LIMITS, maxHeight: 5 };

    assert.strictEqual(setThingField(level, { kind: "mover", index: 0 }, "height", 8, limits), 5);
  });

  QUnit.test("setThingField on a number the thing doesn't have does nothing", (assert) => {
    const level = blankLevel();
    placeThing(level, "enemy", { col: 12, row: 3 });
    assert.strictEqual(setThingField(level, { kind: "enemy", index: 0 }, "radius", 3), null);
    assert.strictEqual(level.enemies[0].radius, undefined);
  });
});

QUnit.module("flattenFloor", () => {
  const bumpy = () => {
    const level = blankLevel();
    level.rows = level.rows.map((row, i) => (i >= 4 && i <= 8 ? row.slice(0, 8) + "34567" + row.slice(13) : row));
    return level;
  };
  const flatProblems = (level) => checkLevel(level).filter((found) => found.message.includes("flat floor"));

  QUnit.test("makes the floor under a checkpoint flat, so the check passes", (assert) => {
    const level = bumpy();
    placeThing(level, "checkpoint", { col: 10, row: 6 });
    assert.strictEqual(flatProblems(level).length, 1);

    const changed = flattenFloor(level, { kind: "checkpoint", index: 0 });

    assert.true(changed > 0);
    assert.deepEqual(flatProblems(level), []);
  });

  QUnit.test("works for the goal, a puddle and a piston too", (assert) => {
    const level = bumpy();
    placeThing(level, "goal", { col: 10, row: 6 });
    placeThing(level, "slime", { col: 10, row: 6 });
    placeThing(level, "piston", { col: 10, row: 6 });
    level.movers[0].height = 5;

    for (const ref of [{ kind: "goal", index: 0 }, { kind: "slime", index: 0 }, { kind: "mover", index: 0 }]) {
      assert.true(flattenFloor(level, ref) >= 0);
    }
    assert.deepEqual(checkLevel(level).filter((found) => found.message.includes("needs flat")), []);
  });

  QUnit.test("a piston is flattened to its own height", (assert) => {
    const level = bumpy();
    placeThing(level, "piston", { col: 10, row: 6 });
    level.movers[0].height = 6;

    flattenFloor(level, { kind: "mover", index: 0 });

    assert.strictEqual(level.rows[6][10], "6");
  });

  QUnit.test("fills holes under the thing", (assert) => {
    const level = blankLevel();
    placeThing(level, "checkpoint", { col: 10, row: 6 });
    level.rows = level.rows.map((row) => row.slice(0, 9) + "..." + row.slice(12));

    flattenFloor(level, { kind: "checkpoint", index: 0 });

    assert.false(level.rows.slice(5, 8).some((row) => row.slice(8, 13).includes(".")));
  });

  QUnit.test("does not go outside the level at an edge", (assert) => {
    const level = blankLevel();
    placeThing(level, "checkpoint", { col: 0, row: 0 });
    const size = [level.rows.length, level.rows[0].length];

    flattenFloor(level, { kind: "checkpoint", index: 0 });

    assert.deepEqual([level.rows.length, level.rows[0].length], size);
  });

  QUnit.test("says -1 for a thing that needs no flat floor, or isn't there", (assert) => {
    const level = blankLevel();
    placeThing(level, "enemy", { col: 12, row: 3 });
    placeThing(level, "platform", { col: 5, row: 5 });
    assert.strictEqual(flattenFloor(level, { kind: "enemy", index: 0 }), -1);
    assert.strictEqual(flattenFloor(level, { kind: "start", index: 0 }), -1);
    assert.strictEqual(flattenFloor(level, { kind: "mover", index: 0 }), -1);
    assert.strictEqual(flattenFloor(level, { kind: "checkpoint", index: 4 }), -1);
  });
});
```

Things to notice:

- **The limit is a limit that can be changed**: a test gives `placeThing` a `maxObjects` of 2 and checks that the third enemy is refused and a checkpoint still isn't.
- **`flattenFloor` is tested by the checker.** The test makes a bumpy floor under a checkpoint, sees that `checkLevel` complains, flattens it, and sees that it doesn't. The two halves of the editor check each other.
- **A thing that isn't there answers with a safe value** (`""`, `[]`, `-1`, `false`), not an error: the editor asks about a selection that has just been removed.

Open `tests.html`. You should see **664 passing tests**: 29 more.

---

## Step 4: A draft

A **draft** is the level being edited, and everything the editor does to it. The level inside it is the same plain data the game plays, so a draft can be played as it is. The draft can paint a corner, fill a box, ramp from one height to another, change the size, rename, set the time, place and move things, check itself, and go back and forward. It knows nothing about the page, so all of it is testable. Open the placeholder `js/draft.js` and replace its contents with:

```js
// A draft: the level being edited, and everything the editor does to it. The level is the same plain data as the levels
// of the game (rows of heights, a start, a goal, the things), so a draft can be played as it is, and a finished one pasted
// into the game's list. The draft can paint heights, fill and ramp, change its size and its things, check itself, and go
// back and forward through what was done. It knows nothing about the page. See ../tests/draft.tests.js.
class LevelDraft {
  constructor(level = blankLevel(), limits = EDITOR_LIMITS) {
    this.limits = limits;
    this.level = cloneLevel(level);
    this.past = []; // earlier versions of the level, as text, the latest last
    this.future = []; // versions that were undone, so they can be done again
    this.selected = null; // the ref of the thing being edited
    this.saved = JSON.stringify(this.level); // the level as it was when it was last saved, to tell if it has changed
  }

  get cols() {
    return this.level.rows[0].length;
  }

  get rows() {
    return this.level.rows.length;
  }

  // Whether the draft has changed since it was made or last saved.
  get changed() {
    return JSON.stringify(this.level) !== this.saved;
  }

  markSaved() {
    this.saved = JSON.stringify(this.level);
  }

  // The level to play, save or export: a copy, so nothing done to it changes the draft.
  toLevel() {
    return cloneLevel(this.level);
  }

  // Undo. Call begin() before each thing the person does (not each step of it: a drag across the floor is one thing), and
  // undo() takes the level back to how it was.
  begin() {
    this.past.push(JSON.stringify(this.level));
    if (this.past.length > this.limits.undoDepth) this.past.shift();
    this.future = [];
  }

  get canUndo() {
    return this.past.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  _swap(from, to) {
    if (from.length === 0) return false;
    to.push(JSON.stringify(this.level));
    this.level = JSON.parse(from.pop());
    this.selected = null; // what it pointed to may not be there now
    return true;
  }

  undo() {
    return this._swap(this.past, this.future);
  }

  redo() {
    return this._swap(this.future, this.past);
  }

  // The floor. A corner's height is a digit, or null for a hole.
  digitAt(col, row) {
    const line = this.level.rows[row];
    if (line === undefined || col < 0 || col >= line.length) return null;
    return line[col] === "." ? null : Number(line[col]);
  }

  // Sets one corner to a height (0 up to the limit), or to a hole with null. Says whether it changed anything.
  setDigit(col, row, digit) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return false;
    if (digit !== null && !(Number.isInteger(digit) && digit >= 0 && digit <= this.limits.maxHeight)) return false;
    const text = digit === null ? "." : String(digit);
    const line = this.level.rows[row];
    if (line[col] === text) return false;
    this.level.rows[row] = line.slice(0, col) + text + line.slice(col + 1);
    return true;
  }

  // Fills a rectangle of corners, from one corner to the other. The heights run from `from` at the corner the drag began to
  // `to` at the other along the longer side, so a drag with two different heights is a ramp, and with the same one (or no
  // `to`) is flat. A `from` of null makes holes.
  fill(col0, row0, col1, row1, from, to = from) {
    const acrossFirst = Math.abs(col1 - col0) >= Math.abs(row1 - row0);
    const span = (acrossFirst ? col1 - col0 : row1 - row0) || 1;
    for (let row = Math.min(row0, row1); row <= Math.max(row0, row1); row++) {
      for (let col = Math.min(col0, col1); col <= Math.max(col0, col1); col++) {
        const share = ((acrossFirst ? col - col0 : row - row0) / span);
        this.setDigit(col, row, from === null ? null : Math.round(from + (to - from) * share));
      }
    }
  }

  // Changes the size of the level, held to the limits. What is cut off is lost, and what is new is holes. Says whether the
  // size changed.
  resize(cols, rows) {
    const newCols = clampInt(cols, this.limits.minCols, this.limits.maxCols);
    const newRows = clampInt(rows, this.limits.minRows, this.limits.maxRows);
    if (newCols === this.cols && newRows === this.rows) return false;
    const lines = this.level.rows.slice(0, newRows).map((line) => line.slice(0, newCols).padEnd(newCols, "."));
    while (lines.length < newRows) lines.push(".".repeat(newCols));
    this.level.rows = lines;
    return true;
  }

  setName(name) {
    this.level.name = cleanLevelName(name, this.limits);
  }

  setTime(time) {
    this.level.time = clampInt(time, this.limits.minTime, this.limits.maxTime);
  }

  // The things. These are the functions of things.js, working on the draft's level and remembering which is selected.
  select(ref) {
    this.selected = ref;
  }

  get selectedThing() {
    return this.selected ? thingOf(this.level, this.selected) : undefined;
  }

  // Whether the level has room for another thing of the kind a tool places.
  canPlace(tool) {
    return hasRoom(this.level, tool, this.limits);
  }

  // Places a thing (a tool's name: "goal", "checkpoint", "piston"...) and selects it. Returns its ref, or null.
  place(tool, point) {
    const ref = placeThing(this.level, tool, point, this.limits);
    if (ref) this.selected = ref;
    return ref;
  }

  thingAt(point) {
    return thingAt(this.level, point);
  }

  // Moves the selected thing.
  moveSelected(point) {
    if (this.selected) moveThing(this.level, this.selected, point);
  }

  // Takes the selected thing out (not the start or goal). Says whether it did.
  removeSelected() {
    if (!this.selected || !removeThing(this.level, this.selected)) return false;
    this.selected = null;
    return true;
  }

  get fields() {
    return this.selected ? thingFields(this.level, this.selected, this.limits) : [];
  }

  setField(path, value) {
    return this.selected ? setThingField(this.level, this.selected, path, value, this.limits) : null;
  }

  flattenSelected() {
    return this.selected ? flattenFloor(this.level, this.selected, this.limits) : -1;
  }

  // Everything wrong with the level, as checkLevel says.
  get problems() {
    return checkLevel(this.level, this.limits);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LevelDraft };
} else {
  window.LevelDraft = LevelDraft;
}
```

Things to notice:

- **Undo is a list of snapshots.** `begin()` saves the level as text before each *thing the person does*; `undo()` swaps the level for the last snapshot, and keeps the one it left so `redo()` can bring it back. It is plain, and it works for *everything*: paint, ramps, size, things, names. `undoDepth` limits how many it keeps.
- **A drag is one step, not one per square.** The editor calls `begin()` when the mouse goes down, and not on every move. That is why `begin()` is a call of its own, and not part of `setDigit`.
- **`fill` is a ramp when the two heights differ.** It runs along the longer side of the box, from `from` at the corner where the drag *began* to `to` at the other end, so dragging the other way slopes the other way. With one height, or none given, it is flat. With `null` it makes holes. This is the feature that saves the most time: slopes by hand are the tedious part of a level.
- **`setDigit` only accepts a real height**: a whole number from 0 to `maxHeight`, or `null`, and a corner inside the level. Everything else changes nothing and says so (`false`).
- **`resize` is held to the limits.** Growing adds holes at the right and bottom, and shrinking cuts. Every row stays the same length, which the checker needs.
- **`changed` compares the level with the text it was when it was last saved**, so the editor can say *Saved* or *Save •*, and ask before closing a level whose changes would be lost.
- **`toLevel()` is a copy**, which is what is saved, tested and exported.
- **The things are the functions of Step 3**, with the draft remembering which is `selected`. `canPlace` asks if there is room, `place` makes one and selects it, `moveSelected`, `removeSelected`, `fields`, `setField`, `flattenSelected`.
- **`problems` is `checkLevel`** on the level as it is now.

### Tests

In `tests.html`, add the script below `things.js`, and the tests below `things.tests.js`:

```html
  <script src="js/draft.js"></script>
  <script src="tests/draft.tests.js"></script>
```

Open the placeholder `tests/draft.tests.js` and replace its contents with:

```js
QUnit.module("LevelDraft: the floor", () => {
  QUnit.test("starts as a copy of the level it is given, or as a blank one", (assert) => {
    const level = blankLevel();
    const draft = new LevelDraft(level);

    draft.setDigit(0, 0, 7);

    assert.notStrictEqual(level.rows[0][0], "7");
    assert.strictEqual(new LevelDraft().cols, EDITOR_LIMITS.defaultCols);
    assert.strictEqual(new LevelDraft().rows, EDITOR_LIMITS.defaultRows);
  });

  QUnit.test("digitAt is the height of a corner, null for a hole or for outside the level", (assert) => {
    const draft = new LevelDraft();
    draft.setDigit(1, 1, null);

    assert.strictEqual(draft.digitAt(0, 0), 2);
    assert.strictEqual(draft.digitAt(1, 1), null);
    assert.strictEqual(draft.digitAt(-1, 0), null);
    assert.strictEqual(draft.digitAt(0, 99), null);
    assert.strictEqual(draft.digitAt(99, 0), null);
  });

  QUnit.test("setDigit changes a corner and says whether it changed", (assert) => {
    const draft = new LevelDraft();

    assert.true(draft.setDigit(3, 2, 5));
    assert.strictEqual(draft.digitAt(3, 2), 5);
    assert.false(draft.setDigit(3, 2, 5));
    assert.true(draft.setDigit(3, 2, null));
    assert.strictEqual(draft.level.rows[2][3], ".");
  });

  QUnit.test("setDigit leaves alone anything outside the level, or a height that isn't one", (assert) => {
    const draft = new LevelDraft();
    const before = JSON.stringify(draft.level);

    assert.false(draft.setDigit(-1, 0, 3));
    assert.false(draft.setDigit(0, draft.rows, 3));
    assert.false(draft.setDigit(0, 0, EDITOR_LIMITS.maxHeight + 1));
    assert.false(draft.setDigit(0, 0, -1));
    assert.false(draft.setDigit(0, 0, 1.5));
    assert.strictEqual(JSON.stringify(draft.level), before);
  });

  QUnit.test("the highest height is the limit's", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, maxHeight: 4 });
    assert.true(draft.setDigit(0, 0, 4));
    assert.false(draft.setDigit(0, 0, 5));
  });

  QUnit.test("fill makes a flat rectangle, whichever corner the drag begins at", (assert) => {
    const draft = new LevelDraft();

    draft.fill(5, 4, 2, 2, 7);

    for (let row = 2; row <= 4; row++) for (let col = 2; col <= 5; col++) assert.strictEqual(draft.digitAt(col, row), 7);
    assert.strictEqual(draft.digitAt(6, 3), 2);
    assert.strictEqual(draft.digitAt(1, 3), 2);
  });

  QUnit.test("fill with two heights is a ramp along the longer side, from the corner the drag begins at", (assert) => {
    const draft = new LevelDraft();

    draft.fill(0, 0, 8, 1, 0, 8);

    assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => draft.digitAt(col, 0)), [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual([0, 4, 8].map((col) => draft.digitAt(col, 1)), [0, 4, 8]);
  });

  QUnit.test("a ramp dragged the other way runs the other way", (assert) => {
    const draft = new LevelDraft();

    draft.fill(8, 0, 0, 1, 0, 8);

    assert.deepEqual([0, 4, 8].map((col) => draft.digitAt(col, 0)), [8, 4, 0]);
  });

  QUnit.test("a ramp down a column goes down the rows", (assert) => {
    const draft = new LevelDraft();

    draft.fill(2, 0, 3, 8, 8, 0);

    assert.deepEqual([0, 4, 8].map((row) => draft.digitAt(2, row)), [8, 4, 0]);
    assert.strictEqual(draft.digitAt(3, 4), 4);
  });

  QUnit.test("a ramp is steady: no step is more than one digit when the heights are as far apart as the corners", (assert) => {
    const draft = new LevelDraft();
    draft.fill(0, 0, 6, 0, 1, 7);
    const row = [0, 1, 2, 3, 4, 5, 6].map((col) => draft.digitAt(col, 0));
    for (let i = 1; i < row.length; i++) assert.true(Math.abs(row[i] - row[i - 1]) <= 1);
  });

  QUnit.test("fill with no height makes holes", (assert) => {
    const draft = new LevelDraft();

    draft.fill(1, 1, 3, 2, null);

    assert.strictEqual(draft.digitAt(2, 1), null);
    assert.strictEqual(draft.digitAt(4, 1), 2);
  });

  QUnit.test("fill stops at the edge of the level", (assert) => {
    const draft = new LevelDraft();
    const size = [draft.cols, draft.rows];

    draft.fill(draft.cols - 2, draft.rows - 2, draft.cols + 5, draft.rows + 5, 6);

    assert.deepEqual([draft.cols, draft.rows], size);
    assert.strictEqual(draft.digitAt(draft.cols - 1, draft.rows - 1), 6);
  });

  QUnit.test("a ramp is held to the highest height the limits allow", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, maxHeight: 5 });
    draft.fill(0, 0, 4, 0, 0, 9);
    assert.true([0, 1, 2, 3, 4].every((col) => draft.digitAt(col, 0) <= 5));
  });
});

QUnit.module("LevelDraft: size, name and time", () => {
  const L = EDITOR_LIMITS;

  QUnit.test("resize makes the level bigger with holes, and smaller by cutting", (assert) => {
    const draft = new LevelDraft();

    assert.true(draft.resize(L.defaultCols + 2, L.defaultRows + 1));
    assert.deepEqual([draft.cols, draft.rows], [L.defaultCols + 2, L.defaultRows + 1]);
    assert.strictEqual(draft.digitAt(L.defaultCols + 1, 0), null);
    assert.strictEqual(draft.digitAt(0, L.defaultRows), null);
    assert.strictEqual(draft.digitAt(0, 0), 2);

    assert.true(draft.resize(L.minCols, L.minRows));
    assert.deepEqual([draft.cols, draft.rows], [L.minCols, L.minRows]);
  });

  QUnit.test("resize holds the size to the limits", (assert) => {
    const draft = new LevelDraft();

    draft.resize(10000, 10000);
    assert.deepEqual([draft.cols, draft.rows], [L.maxCols, L.maxRows]);

    draft.resize(1, 1);
    assert.deepEqual([draft.cols, draft.rows], [L.minCols, L.minRows]);
  });

  QUnit.test("the limits are the ones the draft was given", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...L, maxCols: 25, maxRows: 14 });

    draft.resize(100, 100);

    assert.deepEqual([draft.cols, draft.rows], [25, 14]);
  });

  QUnit.test("resize to the size it is says it did nothing", (assert) => {
    assert.false(new LevelDraft().resize(L.defaultCols, L.defaultRows));
  });

  QUnit.test("every row stays the same length", (assert) => {
    const draft = new LevelDraft();
    draft.resize(30, 20);
    draft.resize(12, 9);
    assert.true(draft.level.rows.every((row) => row.length === 12));
    assert.strictEqual(draft.level.rows.length, 9);
  });

  QUnit.test("setName cleans the name", (assert) => {
    const draft = new LevelDraft();
    draft.setName("   Big   Hill ");
    assert.strictEqual(draft.level.name, "Big Hill");
    draft.setName("");
    assert.strictEqual(draft.level.name, DEFAULT_LEVEL_NAME);
  });

  QUnit.test("setTime holds the time to the limits", (assert) => {
    const draft = new LevelDraft();
    draft.setTime(75.4);
    assert.strictEqual(draft.level.time, 75);
    draft.setTime(1);
    assert.strictEqual(draft.level.time, L.minTime);
    draft.setTime(99999);
    assert.strictEqual(draft.level.time, L.maxTime);
    draft.setTime("soon");
    assert.strictEqual(draft.level.time, L.minTime);
  });
});

QUnit.module("LevelDraft: undo and redo", () => {
  QUnit.test("undo takes back everything since begin(), and redo does it again", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.setDigit(1, 1, 5);
    draft.setDigit(2, 1, 5);

    assert.true(draft.undo());
    assert.strictEqual(draft.digitAt(1, 1), 2);
    assert.strictEqual(draft.digitAt(2, 1), 2);

    assert.true(draft.redo());
    assert.strictEqual(draft.digitAt(1, 1), 5);
    assert.strictEqual(draft.digitAt(2, 1), 5);
  });

  QUnit.test("each begin() is a step of its own", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.setDigit(1, 1, 5);
    draft.begin();
    draft.setDigit(1, 1, 8);

    draft.undo();
    assert.strictEqual(draft.digitAt(1, 1), 5);
    draft.undo();
    assert.strictEqual(draft.digitAt(1, 1), 2);
  });

  QUnit.test("with nothing to undo or redo, they say so", (assert) => {
    const draft = new LevelDraft();
    assert.false(draft.canUndo);
    assert.false(draft.canRedo);
    assert.false(draft.undo());
    assert.false(draft.redo());
  });

  QUnit.test("canUndo and canRedo follow the steps", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    assert.true(draft.canUndo);
    draft.undo();
    assert.true(draft.canRedo);
    assert.false(draft.canUndo);
  });

  QUnit.test("something new after an undo ends the steps that were undone", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.setDigit(1, 1, 5);
    draft.undo();

    draft.begin();

    assert.false(draft.canRedo);
  });

  QUnit.test("it only goes back as far as the limit", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, undoDepth: 3 });
    for (let i = 0; i < 10; i++) {
      draft.begin();
      draft.setDigit(i, 0, 5);
    }

    let steps = 0;
    while (draft.undo()) steps++;

    assert.strictEqual(steps, 3);
  });

  QUnit.test("undo covers things as well as the floor, and size", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.place("enemy", { col: 12, row: 3 });
    draft.begin();
    draft.resize(30, 20);

    draft.undo();
    assert.strictEqual(draft.cols, EDITOR_LIMITS.defaultCols);
    draft.undo();
    assert.strictEqual((draft.level.enemies || []).length, 0);
  });

  QUnit.test("undo lets go of the selection, which may not be there any more", (assert) => {
    const draft = new LevelDraft();
    draft.begin();
    draft.place("enemy", { col: 12, row: 3 });

    draft.undo();

    assert.strictEqual(draft.selected, null);
  });
});

QUnit.module("LevelDraft: changes, copies and problems", () => {
  QUnit.test("changed is whether the level is different from when it was made or last saved", (assert) => {
    const draft = new LevelDraft();
    assert.false(draft.changed);

    draft.setDigit(0, 0, 9);
    assert.true(draft.changed);

    draft.markSaved();
    assert.false(draft.changed);

    draft.setDigit(0, 0, 2);
    assert.true(draft.changed);
  });

  QUnit.test("toLevel is a copy", (assert) => {
    const draft = new LevelDraft();
    const level = draft.toLevel();

    level.rows[0] = "x";
    level.start.col = 77;

    assert.notStrictEqual(draft.level.rows[0], "x");
    assert.strictEqual(draft.level.start.col, 2);
  });

  QUnit.test("problems are the checks of the level as it is now", (assert) => {
    const draft = new LevelDraft();
    assert.deepEqual(draft.problems, []);

    draft.setDigit(draft.level.goal.col, draft.level.goal.row, null);

    assert.true(draft.problems.some((found) => found.severity === "error"));
  });

  QUnit.test("a level of the game can be edited, and is the same when it is given back", (assert) => {
    for (const level of LEVELS) assert.deepEqual(new LevelDraft(level).toLevel(), level, level.name);
  });
});

QUnit.module("LevelDraft: things", () => {
  QUnit.test("place puts a thing in, selects it, and returns its ref", (assert) => {
    const draft = new LevelDraft();

    const ref = draft.place("checkpoint", { col: 8, row: 3 });

    assert.deepEqual(ref, { kind: "checkpoint", index: 0 });
    assert.deepEqual(draft.selected, ref);
    assert.strictEqual(draft.selectedThing.bonus, EDITOR_LIMITS.defaultBonus);
  });

  QUnit.test("place keeps to the limit and leaves the selection as it was when there is no room", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, maxObjects: 1 });
    draft.place("enemy", { col: 12, row: 3 });
    draft.select({ kind: "goal", index: 0 });

    assert.strictEqual(draft.place("enemy", { col: 14, row: 3 }), null);
    assert.deepEqual(draft.selected, { kind: "goal", index: 0 });
  });

  QUnit.test("thingAt, select and moveSelected move a thing that was picked", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });
    draft.select(null);

    draft.select(draft.thingAt({ col: 12.2, row: 3.1 }));
    draft.moveSelected({ col: 14, row: 5 });

    assert.deepEqual(draft.level.enemies[0], { col: 14, row: 5 });
  });

  QUnit.test("moveSelected with nothing selected does nothing", (assert) => {
    const draft = new LevelDraft();
    const before = JSON.stringify(draft.level);
    draft.moveSelected({ col: 1, row: 1 });
    assert.strictEqual(JSON.stringify(draft.level), before);
  });

  QUnit.test("removeSelected takes the thing out and clears the selection, except for the start and goal", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });

    assert.true(draft.removeSelected());
    assert.strictEqual(draft.selected, null);
    assert.strictEqual(draft.level.enemies.length, 0);

    draft.select({ kind: "goal", index: 0 });
    assert.false(draft.removeSelected());
    assert.deepEqual(draft.selected, { kind: "goal", index: 0 });
  });

  QUnit.test("fields are the numbers of the selected thing, and setField changes one", (assert) => {
    const draft = new LevelDraft();
    assert.deepEqual(draft.fields, []);
    assert.strictEqual(draft.setField("bonus", 5), null);

    draft.place("checkpoint", { col: 8, row: 3 });

    assert.deepEqual(draft.fields.map((field) => field.path), ["col", "row", "bonus"]);
    assert.strictEqual(draft.setField("bonus", 7), 7);
    assert.strictEqual(draft.selectedThing.bonus, 7);
  });

  QUnit.test("flattenSelected makes the floor flat under the selected thing", (assert) => {
    const draft = new LevelDraft();
    draft.fill(8, 4, 12, 8, 3, 7);
    draft.place("checkpoint", { col: 10, row: 6 });
    assert.true(draft.problems.some((found) => found.message.includes("flat")));

    assert.true(draft.flattenSelected() > 0);
    assert.false(draft.problems.some((found) => found.message.includes("flat")));
    assert.strictEqual(new LevelDraft().flattenSelected(), -1);
  });
});
```

Things to notice:

- **The ramp tests are exact**: a ramp from 0 to 8 across nine corners is `0 1 2 3 4 5 6 7 8`, a ramp dragged the other way is `8 4 0`, and a ramp down a column goes down the rows.
- **The limits are the ones the draft was given**: a draft with a `maxCols` of 25 won't grow past 25, however big the box says.
- **Undo is tested as a story**: each `begin()` is a step; something new after an undo ends the steps that were undone; it only goes back as far as `undoDepth`; undoing lets go of the selection.
- **Every level of the game can be edited and given back unchanged**: `new LevelDraft(level).toLevel()` is deeply equal to the level, for all ten.

Open `tests.html`. You should see **703 passing tests**: 39 more.

---

## Step 5: Keeping levels

Levels made by a person have to be kept somewhere, and be turned into text so they can be shared. Both mean data that **comes from outside**: from `localStorage`, which anyone can edit, and from text someone pasted into a box. That data could be anything. It could be the wrong shape, or have a million enemies, or rows a million characters long. So this file has one rule: **a level that comes in is never used as it is**. `cleanLevel` builds a *new* level from it, with every number held to a range and every list to a limit, and leaves behind anything it doesn't know. Open the placeholder `js/mylevels.js` and replace its contents with:

```js
// My levels: the levels a person has made, kept in the browser like the leaderboard, and turned into text and back so they can be
// shared. A level that comes from storage, or from text someone pasted, is just data, and could be anything, so it is never
// trusted: cleanLevel builds a new level from it, with every number held to a range, and every list to its limit, and
// leaves behind anything it doesn't know. See ../tests/mylevels.tests.js.
const MY_LEVELS_KEY = "rollingRampage.myLevels";

// What a mover that has some numbers missing is given.
const MOVER_BOUNDS = {
  size: { min: 1, max: 10 },
  period: { min: 1, max: 60 },
  rise: { min: 0, max: 5 },
};

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

// A level built from `raw`, which can be anything, with the same fields as the levels of the game. Returns null if there is
// nothing to make a level from (no rows). Floor that has anything but a dot or a digit in it becomes holes, and a digit that
// is too high becomes the highest. The result has a start, a goal and a time that are fine, whatever came in, so the editor
// can always open it, but it may still be a level with problems (see checkLevel).
function cleanLevel(raw, limits = EDITOR_LIMITS) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.rows)) return null;
  const lines = raw.rows.filter((row) => typeof row === "string").slice(0, limits.maxRows);
  if (lines.length === 0) return null;
  const cols = clampInt(Math.max(...lines.map((line) => line.length)), limits.minCols, limits.maxCols);
  const corner = (ch) => (/^[0-9]$/.test(ch) ? String(Math.min(Number(ch), limits.maxHeight)) : ".");
  const rows = lines.map((line) => [...line.slice(0, cols)].map(corner).join("").padEnd(cols, "."));
  while (rows.length < limits.minRows) rows.push(".".repeat(cols));

  const point = (p) => ({ col: clampStep(p.col, 0, cols - 1, 0.01), row: clampStep(p.row, 0, rows.length - 1, 0.01) });
  const middle = Math.floor(rows.length / 2);
  const list = (name, make) => (Array.isArray(raw[name]) ? raw[name].slice(0, limits.maxObjects).map(make).filter(Boolean) : []);
  const bounded = (value, fallback, { min, max }) => clampStep(isNumber(value) ? value : fallback, min, max, 0.01);

  const mover = (m) => {
    if (!m || typeof m !== "object") return null;
    const common = {
      height: clampInt(isNumber(m.height) ? m.height : 4, 0, limits.maxHeight),
      size: { x: bounded(m.size && m.size.x, THING_DEFAULTS.pistonSize, MOVER_BOUNDS.size), z: bounded(m.size && m.size.z, THING_DEFAULTS.pistonSize, MOVER_BOUNDS.size) },
      period: bounded(m.period, THING_DEFAULTS.pistonPeriod, MOVER_BOUNDS.period),
    };
    const phase = isNumber(m.phase) ? { phase: clampStep(m.phase, 0, 0.95, 0.01) } : {};
    if (m.kind === "piston" && isPoint(m.at)) {
      return { kind: "piston", at: point(m.at), ...common, rise: bounded(m.rise, THING_DEFAULTS.pistonRise, MOVER_BOUNDS.rise), ...phase };
    }
    if (m.kind === "platform" && isPoint(m.from) && isPoint(m.to)) {
      const [from, to] = [point(m.from), point(m.to)];
      if (from.col === to.col && from.row === to.row) return null;
      return { kind: "platform", from, to, ...common, ...phase };
    }
    return null;
  };

  const level = {
    name: cleanLevelName(raw.name, limits),
    start: isPoint(raw.start) ? point(raw.start) : { col: 2, row: middle },
    time: clampInt(isNumber(raw.time) ? raw.time : limits.defaultTime, limits.minTime, limits.maxTime),
    goal: isPoint(raw.goal) ? point(raw.goal) : { col: cols - 3, row: middle },
    checkpoints: list("checkpoints", (p) => (isPoint(p) ? { ...point(p), bonus: clampInt(isNumber(p.bonus) ? p.bonus : limits.defaultBonus, 0, limits.maxTime) } : null)),
  };
  const enemies = list("enemies", (p) => (isPoint(p) ? point(p) : null));
  const slime = list("slime", (p) => (isPoint(p) ? { ...point(p), radius: bounded(p.radius, THING_DEFAULTS.slimeRadius, { min: 0.5, max: 4 }) } : null));
  const movers = list("movers", mover);
  if (enemies.length) level.enemies = enemies;
  if (slime.length) level.slime = slime;
  if (movers.length) level.movers = movers;
  level.rows = rows;
  return level;
}

// A level as text that can be kept or sent. It is the very same shape as an entry of LEVELS in level.js (JSON is also
// JavaScript), so a level worth keeping can be pasted straight into the game.
function levelToText(level) {
  return JSON.stringify(level, null, 2);
}

// The level in some text, cleaned, or null if the text is not a level.
function levelFromText(text, limits = EDITOR_LIMITS) {
  try {
    return cleanLevel(JSON.parse(String(text)), limits);
  } catch (error) {
    return null;
  }
}

class MyLevels {
  constructor({ storage = browserStorage(), key = MY_LEVELS_KEY, limits = EDITOR_LIMITS } = {}) {
    this.storage = storage;
    this.key = key;
    this.limits = limits;
    this.levels = [];
    this.load();
  }

  // Takes what was saved. Whatever isn't a level is dropped, and what is kept is cleaned, so a damaged or hand-edited save
  // can't break the game.
  load() {
    const saved = readJson(this.storage, this.key);
    const list = Array.isArray(saved) ? saved : [];
    this.levels = list.map((level) => cleanLevel(level, this.limits)).filter(Boolean).slice(0, this.limits.maxLevels);
  }

  // Remembers the levels. Says whether it could.
  save() {
    return writeJson(this.storage, this.key, this.levels);
  }

  get full() {
    return this.levels.length >= this.limits.maxLevels;
  }

  // Adds a level, and saves. Returns its place in the list, or -1 if the list is full or it is not a level.
  add(level) {
    const clean = cleanLevel(level, this.limits);
    if (!clean || this.full) return -1;
    this.levels.push(clean);
    this.save();
    return this.levels.length - 1;
  }

  // Puts a level in the place of another, and saves. Says whether it did.
  replace(index, level) {
    const clean = cleanLevel(level, this.limits);
    if (!clean || !this.levels[index]) return false;
    this.levels[index] = clean;
    this.save();
    return true;
  }

  // Takes a level out, and saves. Says whether it did.
  remove(index) {
    if (!this.levels[index]) return false;
    this.levels.splice(index, 1);
    this.save();
    return true;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MY_LEVELS_KEY, cleanLevel, levelToText, levelFromText, MyLevels };
} else {
  Object.assign(window, { MY_LEVELS_KEY, cleanLevel, levelToText, levelFromText, MyLevels });
}
```

Things to notice:

- **`cleanLevel(raw)` returns a new level, or `null`.** It takes the rows that are text, cuts them to the limits, makes them all the same length, turns any character that isn't a dot or a digit into a hole, and holds a digit that is too high to the highest. Then each thing is rebuilt from its numbers, held to a range, or left out if it has no place.
- **What comes out can always be opened by the editor.** It has a start, a goal, a time and a name that are fine, whatever came in. It may still be a level with *problems* (a goal over a hole), and that is for `checkLevel` to say. The two jobs are separate: `cleanLevel` makes it *safe*, `checkLevel` says if it is *good*.
- **A mover with numbers missing gets sensible ones**, so it can never divide by a period of 0.
- **The levels of the game come out exactly as they went in.** A test proves it for all ten, which is the proof that `cleanLevel` only removes what is wrong, and doesn't change a good level.
- **`levelToText` is `JSON.stringify` with line breaks**, one row to a line, and it is the very same shape as an entry of `LEVELS` in `level.js`. JSON is also JavaScript, so a level worth keeping can be pasted straight into the game's list. `levelFromText` is the other way, and answers `null` for text that isn't a level.
- **`MyLevels` is built like `Leaderboard`**: it is given its `storage` (so the tests can give it a stand-in), loads and cleans what was saved, and saves after each change. `add`, `replace` and `remove` say whether they worked, and `add` says `-1` when the list is full (`maxLevels`) or the level isn't one.
- **Storage can fail**, and the game must still work: `writeJson` says whether it saved, and nothing else depends on it.

### Tests

In `tests.html`, add the script below `draft.js`, and the tests below `draft.tests.js`:

```html
  <script src="js/mylevels.js"></script>
  <script src="tests/mylevels.tests.js"></script>
```

Open the placeholder `tests/mylevels.tests.js` and replace its contents with:

```js
QUnit.module("cleanLevel", () => {
  const L = EDITOR_LIMITS;

  QUnit.test("a level of the game comes out exactly as it went in", (assert) => {
    for (const level of LEVELS) assert.deepEqual(cleanLevel(level), level, level.name);
  });

  QUnit.test("a blank level comes out as it went in", (assert) => {
    assert.deepEqual(cleanLevel(blankLevel()), blankLevel());
  });

  QUnit.test("anything that is not a level with rows is null", (assert) => {
    for (const raw of [null, undefined, 5, "level", [], {}, { rows: "22" }, { rows: [] }, { rows: [1, 2] }]) assert.strictEqual(cleanLevel(raw), null);
  });

  QUnit.test("the rows are made the same length, within the limits", (assert) => {
    const level = cleanLevel({ rows: ["22222222", "222", "2222222222222"] });

    assert.true(level.rows.length >= L.minRows);
    assert.true(level.rows.every((row) => row.length === level.rows[0].length));
    assert.true(level.rows[0].length >= L.minCols && level.rows[0].length <= L.maxCols);
    assert.strictEqual(level.rows[1], "222".padEnd(level.rows[0].length, "."));
  });

  QUnit.test("rows too many or too long are cut to the limits", (assert) => {
    const level = cleanLevel({ rows: Array(L.maxRows + 20).fill("2".repeat(L.maxCols + 20)) });

    assert.strictEqual(level.rows.length, L.maxRows);
    assert.strictEqual(level.rows[0].length, L.maxCols);
  });

  QUnit.test("it follows the limits it is given", (assert) => {
    const level = cleanLevel({ rows: Array(30).fill("2".repeat(50)) }, { ...L, maxCols: 12, maxRows: 9 });

    assert.deepEqual([level.rows[0].length, level.rows.length], [12, 9]);
  });

  QUnit.test("anything in the rows but a dot or a digit is a hole, and a digit that is too high is the highest", (assert) => {
    const level = cleanLevel({ rows: Array(L.minRows).fill("2x<b>5 9") }, { ...L, maxHeight: 6 });

    assert.strictEqual(level.rows[0], "2....5.6".padEnd(L.minCols, "."));
  });

  QUnit.test("a name is cleaned, a time is held to the limits, and a missing start and goal are made", (assert) => {
    const level = cleanLevel({ name: "  A   B ", time: 99999, rows: Array(L.minRows).fill("2".repeat(L.minCols)) });

    assert.strictEqual(level.name, "A B");
    assert.strictEqual(level.time, L.maxTime);
    assert.true(isPoint(level.start) && isPoint(level.goal));
    assert.deepEqual(level.checkpoints, []);
  });

  QUnit.test("a place is held inside the level", (assert) => {
    const level = cleanLevel({ ...blankLevel(), start: { col: -5, row: 999 }, enemies: [{ col: 500, row: 2 }] });

    assert.deepEqual(level.start, { col: 0, row: level.rows.length - 1 });
    assert.strictEqual(level.enemies[0].col, level.rows[0].length - 1);
  });

  QUnit.test("each list is cut to the most of a thing, and what is not a thing is left out", (assert) => {
    const many = Array.from({ length: L.maxObjects + 10 }, () => ({ col: 10, row: 3 }));
    const level = cleanLevel({ ...blankLevel(), enemies: [...many, null, "x", {}], checkpoints: "no", slime: [{ col: 1 }] });

    assert.strictEqual(level.enemies.length, L.maxObjects);
    assert.deepEqual(level.checkpoints, []);
    assert.strictEqual(level.slime, undefined);
  });

  QUnit.test("a checkpoint has a bonus, a puddle has a radius, and both are held to a range", (assert) => {
    const level = cleanLevel({ ...blankLevel(), checkpoints: [{ col: 5, row: 5 }, { col: 6, row: 6, bonus: 99999 }], slime: [{ col: 5, row: 5, radius: 99 }, { col: 7, row: 7 }] });

    assert.strictEqual(level.checkpoints[0].bonus, L.defaultBonus);
    assert.strictEqual(level.checkpoints[1].bonus, L.maxTime);
    assert.strictEqual(level.slime[0].radius, 4);
    assert.strictEqual(level.slime[1].radius, THING_DEFAULTS.slimeRadius);
  });

  QUnit.test("a mover that is not a piston or a platform, or has no place, is left out", (assert) => {
    const level = cleanLevel({
      ...blankLevel(),
      movers: [
        { kind: "fan", at: { col: 5, row: 5 } },
        { kind: "piston" },
        { kind: "platform", from: { col: 5, row: 5 }, to: { col: 5, row: 5 } },
        { kind: "piston", at: { col: 5, row: 5 } },
      ],
    });

    assert.strictEqual(level.movers.length, 1);
    assert.strictEqual(level.movers[0].kind, "piston");
  });

  QUnit.test("a mover that has numbers missing, or silly ones, is given sensible ones, so it never divides by nothing", (assert) => {
    const level = cleanLevel({ ...blankLevel(), movers: [{ kind: "piston", at: { col: 5, row: 5 }, period: 0, size: { x: -3 }, rise: "high", phase: 7 }] });
    const piston = level.movers[0];

    assert.true(piston.period > 0 && piston.size.x > 0 && piston.size.z > 0 && Number.isFinite(piston.rise));
    assert.true(piston.phase < 1);
    assert.true(canPlay(checkLevel(level)));
  });

  QUnit.test("whatever it is given, what comes out can be opened by the editor and checked", (assert) => {
    const rubbish = [
      { rows: ["!!!!!!", "######"], start: "here", goal: [], time: "later", checkpoints: [1, 2], movers: [{}, null, 5] },
      { rows: Array(100).fill("9".repeat(200)), name: 12, enemies: { length: 4 } },
      { rows: ["2"], movers: [{ kind: "platform", from: { col: NaN, row: 1 }, to: { col: 2, row: 2 } }] },
    ];
    for (const raw of rubbish) {
      const level = cleanLevel(raw);
      assert.deepEqual(shapeProblems(level, L), []);
      assert.ok(new LevelDraft(level));
    }
  });
});

QUnit.module("levelToText and levelFromText", () => {
  QUnit.test("a level goes to text and comes back the same", (assert) => {
    for (const level of LEVELS) assert.deepEqual(levelFromText(levelToText(level)), level, level.name);
  });

  QUnit.test("the text is the shape of an entry of LEVELS, one row to a line, to be pasted into the game", (assert) => {
    const text = levelToText(blankLevel());

    assert.true(text.includes('"name": "My level"'));
    assert.true(text.includes('"rows": ['));
    assert.strictEqual(text.split("\n").filter((line) => /^ {4}"2+",?$/.test(line)).length, EDITOR_LIMITS.defaultRows);
    assert.deepEqual(new Function(`return ${text}`)(), blankLevel());
  });

  QUnit.test("text that is not a level is null", (assert) => {
    for (const text of ["", "hello", "{", "[]", "{}", '{"rows": 5}', "null", undefined]) assert.strictEqual(levelFromText(text), null);
  });

  QUnit.test("text is cleaned like any other level", (assert) => {
    const level = levelFromText(JSON.stringify({ name: "x".repeat(500), rows: Array(8).fill("2222222222") }));
    assert.strictEqual(level.name.length, EDITOR_LIMITS.maxName);
  });
});

QUnit.module("MyLevels", () => {
  const memoryStorage = (start = {}) => {
    const data = { ...start };
    return {
      data,
      getItem: (key) => (key in data ? data[key] : null),
      setItem: (key, value) => {
        data[key] = value;
      },
    };
  };

  QUnit.test("starts empty", (assert) => {
    assert.deepEqual(new MyLevels({ storage: memoryStorage() }).levels, []);
  });

  QUnit.test("add keeps a level and gives its place; it is saved and comes back in a new MyLevels", (assert) => {
    const storage = memoryStorage();
    const mine = new MyLevels({ storage });

    assert.strictEqual(mine.add(blankLevel()), 0);
    assert.strictEqual(mine.add({ ...blankLevel(), name: "Second" }), 1);

    const again = new MyLevels({ storage });
    assert.deepEqual(again.levels.map((level) => level.name), [DEFAULT_LEVEL_NAME, "Second"]);
  });

  QUnit.test("add cleans the level it is given, and refuses something that is not one", (assert) => {
    const mine = new MyLevels({ storage: memoryStorage() });

    assert.strictEqual(mine.add({ name: "no rows" }), -1);
    assert.strictEqual(mine.add({ ...blankLevel(), name: "   " }), 0);
    assert.strictEqual(mine.levels[0].name, DEFAULT_LEVEL_NAME);
  });

  QUnit.test("it holds as many levels as the limit says, and says it is full", (assert) => {
    const limits = { ...EDITOR_LIMITS, maxLevels: 2 };
    const mine = new MyLevels({ storage: memoryStorage(), limits });

    mine.add(blankLevel());
    assert.false(mine.full);
    mine.add(blankLevel());
    assert.true(mine.full);
    assert.strictEqual(mine.add(blankLevel()), -1);
    assert.strictEqual(mine.levels.length, 2);
  });

  QUnit.test("replace puts a level in the place of another, and remove takes one out", (assert) => {
    const storage = memoryStorage();
    const mine = new MyLevels({ storage });
    mine.add({ ...blankLevel(), name: "A" });
    mine.add({ ...blankLevel(), name: "B" });

    assert.true(mine.replace(0, { ...blankLevel(), name: "A2" }));
    assert.true(mine.remove(1));

    assert.deepEqual(new MyLevels({ storage }).levels.map((level) => level.name), ["A2"]);
    assert.false(mine.replace(5, blankLevel()));
    assert.false(mine.replace(0, { nothing: true }));
    assert.false(mine.remove(5));
  });

  QUnit.test("damaged saves are dropped or cleaned, and too many are cut", (assert) => {
    const limits = { ...EDITOR_LIMITS, maxLevels: 2 };
    const storage = memoryStorage({ [MY_LEVELS_KEY]: JSON.stringify([5, null, { rows: ["22"] }, blankLevel(), blankLevel(), blankLevel()]) });

    const mine = new MyLevels({ storage, limits });

    assert.strictEqual(mine.levels.length, 2);
    assert.true(mine.levels.every((level) => shapeProblems(level, limits).length === 0 || level.rows.length >= limits.minRows));
  });

  QUnit.test("a save that is not a list, or not JSON, is nothing", (assert) => {
    assert.deepEqual(new MyLevels({ storage: memoryStorage({ [MY_LEVELS_KEY]: "[not json" }) }).levels, []);
    assert.deepEqual(new MyLevels({ storage: memoryStorage({ [MY_LEVELS_KEY]: '{"a":1}' }) }).levels, []);
  });

  QUnit.test("with no storage, or storage that refuses, it still works for now", (assert) => {
    const refusing = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const mine = new MyLevels({ storage: refusing });

    assert.strictEqual(mine.add(blankLevel()), 0);
    assert.false(mine.save());
    assert.strictEqual(new MyLevels({ storage: null }).add(blankLevel()), 0);
  });
});
```

Things to notice:

- **The test that matters is the last of `cleanLevel`'s:** *whatever it is given, what comes out can be opened by the editor and checked.* It is given rubbish (wrong types, rows of `!`, a hundred rows of 200 nines, a mover with a `NaN`), and the result must have no shape problems and must open in a `LevelDraft`.
- **Text is tested both ways**: every level of the game goes to text and comes back equal, and the text, run as JavaScript, gives the level back. That second test is why a shared level can be pasted into `LEVELS`.
- **`MyLevels` is tested with a stand-in for storage**, a small object with `getItem` and `setItem`, and with one whose `setItem` throws. A save that fails must never break the game.

Open `tests.html`. You should see **729 passing tests**: 26 more.

---

## Step 6: What the mouse does

The editor screen will turn a click on a picture into a corner of the level, and call a function. The function is the *editing*, and it doesn't need a page, so it comes first. Open the placeholder `js/gestures.js` and replace its contents with:

```js
// What a press, a drag and a release of the mouse (or a finger) do in the editor, as plain functions. The screen only turns
// pixels into corners and calls these, so the editing itself can be tested without a page. See ../tests/gestures.tests.js.

// The tools, in the order of the toolbar. `group` is the row of the toolbar a tool is on. A tool that *places* a thing makes
// one at the place clicked, and then the editor switches to the select tool so the new thing can be adjusted.
const EDITOR_TOOLS = [
  { id: "paint", group: "Floor", label: "Paint", hint: "Drag to paint the height chosen on the left." },
  { id: "fill", group: "Floor", label: "Fill", hint: "Drag a box. With a Ramp to height, it slopes from the corner you start at." },
  { id: "erase", group: "Floor", label: "Erase", hint: "Drag to make holes. A marble falls through them." },
  { id: "select", group: "Things", label: "Select", hint: "Click a thing to pick it, and drag it to move it. Delete takes it away." },
  { id: "start", group: "Things", label: "Start", hint: "Click to put the start here." },
  { id: "goal", group: "Things", label: "Goal", hint: "Click to put the goal here." },
  { id: "checkpoint", group: "Things", label: "Checkpoint", hint: "Click to put a checkpoint here." },
  { id: "enemy", group: "Things", label: "Enemy", hint: "Click to put an enemy here." },
  { id: "slime", group: "Things", label: "Slime", hint: "Click to put a puddle of slime here." },
  { id: "piston", group: "Things", label: "Piston", hint: "Click to put a piston here. It needs flat floor." },
  { id: "platform", group: "Things", label: "Platform", hint: "Click to put a moving platform here. It needs a gap, with floor at both ends." },
];

const PLACING_TOOLS = ["start", "goal", "checkpoint", "enemy", "slime", "piston", "platform"];

// How big a corner is on the screen, in pixels: as big as the space allows, within a range, so a small level is easy to
// hit and a big one still fits.
const CELL_PIXELS = { min: 8, max: 32 };

function cellSizeFor(cols, rows, width, height) {
  const fit = Math.floor(Math.min(width / cols, height / rows));
  return Math.max(CELL_PIXELS.min, Math.min(CELL_PIXELS.max, fit));
}

// The corner under a pixel, as whole numbers. A corner is drawn as a square, so this is the square the pixel is in.
function cornerAt(x, y, cell) {
  return { col: Math.floor(x / cell), row: Math.floor(y / cell) };
}

// The place under a pixel in the units of the level, where the middle of a corner's square is the corner itself (so a thing
// at col 1.5 is half way between the second and third squares).
function placeAt(x, y, cell) {
  return { col: x / cell - 0.5, row: y / cell - 0.5 };
}

// The corners on the straight line from one to another, both included. A mouse that moves fast skips squares, and this
// fills them in.
function lineCorners(from, to) {
  const steps = Math.max(Math.abs(to.col - from.col), Math.abs(to.row - from.row));
  const corners = [];
  for (let i = 0; i <= steps; i++) {
    const share = steps === 0 ? 0 : i / steps;
    corners.push({ col: Math.round(from.col + (to.col - from.col) * share), row: Math.round(from.row + (to.row - from.row) * share) });
  }
  return corners;
}

// A colour for a height: darker is lower. A hole has its own.
function heightColor(digit, maxHeight) {
  if (digit === null) return "#0b0e14";
  const share = maxHeight > 0 ? digit / maxHeight : 0;
  return `hsl(215, ${Math.round(24 + share * 10)}%, ${Math.round(20 + share * 52)}%)`;
}

// Does what a tool does for one step of a gesture, to a draft. `settings` is { tool, height, rampTo }, `phase` is "down",
// "move" or "up", `at` is { corner, place } under the pointer, and `held` is what is known about the gesture so far:
// { origin, last, picked, began }. Returns what changed about the gesture: { picked } for a click that found a thing, { began }
// once an undo step has been started, { switchTo } for the tool to go to next, { full } for a thing there was no room for.
function applyGesture(draft, settings, phase, at, held = {}) {
  const { tool, height, rampTo } = settings;
  const digit = tool === "erase" ? null : height;
  if (phase === "down") {
    if (tool === "paint" || tool === "erase") {
      draft.begin();
      draft.setDigit(at.corner.col, at.corner.row, digit);
    } else if (tool === "fill") {
      draft.begin();
    } else if (tool === "select") {
      const ref = draft.thingAt(at.place);
      draft.select(ref);
      return { picked: Boolean(ref) };
    } else if (PLACING_TOOLS.includes(tool)) {
      if (!draft.canPlace(tool)) return { full: true };
      draft.begin();
      draft.place(tool, at.place);
      return { switchTo: "select" };
    }
    return {};
  }
  if (phase === "move") {
    if (tool === "paint" || tool === "erase") {
      for (const corner of lineCorners(held.last.corner, at.corner)) draft.setDigit(corner.col, corner.row, digit);
    } else if (tool === "select" && held.picked) {
      if (!held.began) draft.begin();
      draft.moveSelected(at.place);
      return { began: true };
    }
    return {};
  }
  if (phase === "up" && tool === "fill") {
    const to = rampTo === null || rampTo === undefined ? height : rampTo;
    draft.fill(held.origin.corner.col, held.origin.corner.row, at.corner.col, at.corner.row, height, to);
  }
  return {};
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EDITOR_TOOLS, PLACING_TOOLS, CELL_PIXELS, cellSizeFor, cornerAt, placeAt, lineCorners, heightColor, applyGesture };
} else {
  Object.assign(window, { EDITOR_TOOLS, PLACING_TOOLS, CELL_PIXELS, cellSizeFor, cornerAt, placeAt, lineCorners, heightColor, applyGesture });
}
```

Things to notice:

- **The tools are a table**, `EDITOR_TOOLS`: an id, a group for the toolbar, a label, and a hint to show when it is chosen. A new tool is a new row, and the toolbar follows.
- **The geometry is four small functions.** `cellSizeFor` makes a corner as big as the space allows (between 8 and 32 pixels), so a small level is easy to hit and the biggest one the limits allow still fits. `cornerAt` is the square under a pixel, and `placeAt` is the place under a pixel in the units of the level, where the *middle* of a square is the corner (so a checkpoint at column 1.5 is half way between two squares). `lineCorners` fills in the squares a fast mouse skipped.
- **`applyGesture(draft, settings, phase, at, held)` is the whole editing logic.** A gesture has three phases (`down`, `move`, `up`), and what happens depends on the tool. Paint and erase set the square pressed and every square dragged over; fill remembers where it began and fills the box on `up`; select picks the thing pressed on and drags it; a placing tool puts a thing at the place and asks to go on to the select tool, so the new thing can be adjusted.
- **It says what happened, and the screen follows**: `{ picked }`, `{ began }`, `{ switchTo }`, `{ full }`. It never touches the page.
- **Undo steps are made here, and carefully.** Painting and filling start a step on `down`. Selecting makes none; *dragging* a picked thing makes one on the first move. A tool that can't place anything (there is no room) makes none either. A click that changes nothing leaves nothing to undo.
- **`heightColor` is the colour of a height**: darker is lower, so a ramp is a gradient you can see.

### Tests

In `tests.html`, add the script below `mylevels.js`, and the tests below `mylevels.tests.js`:

```html
  <script src="js/gestures.js"></script>
  <script src="tests/gestures.tests.js"></script>
```

Open the placeholder `tests/gestures.tests.js` and replace its contents with:

```js
QUnit.module("the tools and the geometry of the editor", () => {
  QUnit.test("every tool has an id, a group, a label and a hint, and the ids are different", (assert) => {
    for (const tool of EDITOR_TOOLS) assert.true([tool.id, tool.group, tool.label, tool.hint].every((text) => typeof text === "string" && text.length > 0), tool.id);
    assert.strictEqual(new Set(EDITOR_TOOLS.map((tool) => tool.id)).size, EDITOR_TOOLS.length);
  });

  QUnit.test("each placing tool is a tool, and one that makes a thing the draft knows how to place", (assert) => {
    const ids = EDITOR_TOOLS.map((tool) => tool.id);
    for (const tool of PLACING_TOOLS) {
      assert.true(ids.includes(tool), tool);
      assert.ok(new LevelDraft().place(tool, { col: 8, row: 3 }), tool);
    }
  });

  QUnit.test("cellSizeFor is as big as the space allows, between the least and the most", (assert) => {
    assert.strictEqual(cellSizeFor(20, 10, 400, 400), 20);
    assert.strictEqual(cellSizeFor(10, 10, 5000, 5000), CELL_PIXELS.max);
    assert.strictEqual(cellSizeFor(60, 30, 100, 100), CELL_PIXELS.min);
  });

  QUnit.test("the biggest level the limits allow still fits a screen at the smallest size", (assert) => {
    const width = EDITOR_LIMITS.maxCols * CELL_PIXELS.min;
    const height = EDITOR_LIMITS.maxRows * CELL_PIXELS.min;
    assert.true(width <= 1920 && height <= 1080, `${width} x ${height}`);
  });

  QUnit.test("cornerAt is the square a pixel is in", (assert) => {
    assert.deepEqual(cornerAt(0, 0, 20), { col: 0, row: 0 });
    assert.deepEqual(cornerAt(19, 39, 20), { col: 0, row: 1 });
    assert.deepEqual(cornerAt(20, 40, 20), { col: 1, row: 2 });
  });

  QUnit.test("placeAt is a place in the units of the level, where the middle of a square is the corner", (assert) => {
    assert.deepEqual(placeAt(10, 10, 20), { col: 0, row: 0 });
    assert.deepEqual(placeAt(30, 50, 20), { col: 1, row: 2 });
    assert.deepEqual(placeAt(20, 20, 20), { col: 0.5, row: 0.5 });
  });

  QUnit.test("lineCorners fills in the squares between two", (assert) => {
    assert.deepEqual(lineCorners({ col: 0, row: 0 }, { col: 4, row: 0 }).map((c) => c.col), [0, 1, 2, 3, 4]);
    assert.deepEqual(lineCorners({ col: 2, row: 2 }, { col: 2, row: 2 }), [{ col: 2, row: 2 }]);
    assert.deepEqual(lineCorners({ col: 0, row: 0 }, { col: 3, row: 3 }).map((c) => [c.col, c.row]), [[0, 0], [1, 1], [2, 2], [3, 3]]);
    const back = lineCorners({ col: 4, row: 0 }, { col: 0, row: 0 });
    assert.deepEqual(back.map((c) => c.col), [4, 3, 2, 1, 0]);
  });

  QUnit.test("heightColor is lighter the higher the corner, and a hole has its own colour", (assert) => {
    const lightness = (color) => Number(color.match(/(\d+)%\)$/)[1]);
    assert.true(lightness(heightColor(9, 9)) > lightness(heightColor(0, 9)));
    assert.notStrictEqual(heightColor(null, 9), heightColor(0, 9));
    assert.notStrictEqual(heightColor(3, 9), heightColor(4, 9));
  });
});

QUnit.module("applyGesture", () => {
  const at = (col, row) => ({ corner: { col, row }, place: { col, row } });
  const settings = (tool, height = 6, rampTo = null) => ({ tool, height, rampTo });

  // Presses, drags through some squares, and lets go, as the screen does.
  const drag = (draft, config, points) => {
    let held = { origin: at(...points[0]), last: at(...points[0]), picked: false, began: false };
    Object.assign(held, applyGesture(draft, config, "down", at(...points[0])));
    for (const point of points.slice(1)) {
      Object.assign(held, applyGesture(draft, config, "move", at(...point), held));
      held.last = at(...point);
    }
    applyGesture(draft, config, "up", at(...points[points.length - 1]), held);
    return held;
  };

  QUnit.test("paint sets the corner pressed, and every square dragged over, even those a fast mouse skipped", (assert) => {
    const draft = new LevelDraft();

    drag(draft, settings("paint", 6), [[2, 2], [8, 2]]);

    for (let col = 2; col <= 8; col++) assert.strictEqual(draft.digitAt(col, 2), 6);
    assert.strictEqual(draft.digitAt(9, 2), 2);
  });

  QUnit.test("a whole drag is one step of undo", (assert) => {
    const draft = new LevelDraft();
    drag(draft, settings("paint", 6), [[2, 2], [5, 2], [5, 5]]);

    draft.undo();

    assert.strictEqual(draft.digitAt(5, 5), 2);
    assert.false(draft.canUndo);
  });

  QUnit.test("erase makes holes", (assert) => {
    const draft = new LevelDraft();
    drag(draft, settings("erase"), [[3, 3], [5, 3]]);
    assert.deepEqual([3, 4, 5].map((col) => draft.digitAt(col, 3)), [null, null, null]);
  });

  QUnit.test("fill fills the box from where it began to where it ended, when the pointer is let go", (assert) => {
    const draft = new LevelDraft();
    drag(draft, settings("fill", 8), [[2, 2], [4, 3], [5, 4]]);

    assert.strictEqual(draft.digitAt(2, 2), 8);
    assert.strictEqual(draft.digitAt(5, 4), 8);
    assert.strictEqual(draft.digitAt(6, 4), 2);
  });

  QUnit.test("fill with a ramp-to slopes from the corner it began at", (assert) => {
    const draft = new LevelDraft();
    drag(draft, settings("fill", 0, 6), [[0, 0], [6, 1]]);
    assert.deepEqual([0, 3, 6].map((col) => draft.digitAt(col, 0)), [0, 3, 6]);
  });

  QUnit.test("fill changes nothing until it is let go", (assert) => {
    const draft = new LevelDraft();
    const config = settings("fill", 8);
    const held = { origin: at(2, 2), last: at(2, 2) };
    applyGesture(draft, config, "down", at(2, 2));
    applyGesture(draft, config, "move", at(5, 5), held);
    assert.strictEqual(draft.digitAt(3, 3), 2);
  });

  QUnit.test("select picks the thing pressed on, or nothing", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });
    draft.select(null);

    const hit = applyGesture(draft, settings("select"), "down", at(12, 3));
    assert.true(hit.picked);
    assert.deepEqual(draft.selected, { kind: "enemy", index: 0 });

    const miss = applyGesture(draft, settings("select"), "down", at(18, 10));
    assert.false(miss.picked);
    assert.strictEqual(draft.selected, null);
  });

  QUnit.test("selecting makes no undo step, and dragging a thing makes one", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });

    const held = drag(draft, settings("select"), [[12, 3], [13, 4], [14, 5]]);

    assert.true(held.picked);
    assert.deepEqual(draft.level.enemies[0], { col: 14, row: 5 });
    draft.undo();
    assert.deepEqual(draft.level.enemies[0], { col: 12, row: 3 });
    assert.false(draft.canUndo);
  });

  QUnit.test("dragging from empty floor with select moves nothing", (assert) => {
    const draft = new LevelDraft();
    draft.place("enemy", { col: 12, row: 3 });
    drag(draft, settings("select"), [[18, 10], [14, 5]]);
    assert.deepEqual(draft.level.enemies[0], { col: 12, row: 3 });
  });

  QUnit.test("a placing tool puts the thing there and says to go to the select tool", (assert) => {
    const draft = new LevelDraft();

    const outcome = applyGesture(draft, settings("checkpoint"), "down", at(8, 3));

    assert.deepEqual(outcome, { switchTo: "select" });
    assert.strictEqual(draft.level.checkpoints.length, 1);
    assert.deepEqual(draft.selected, { kind: "checkpoint", index: 0 });
    draft.undo();
    assert.strictEqual((draft.level.checkpoints || []).length, 0);
  });

  QUnit.test("a placing tool says when there is no room, and changes nothing", (assert) => {
    const draft = new LevelDraft(blankLevel(), { ...EDITOR_LIMITS, maxObjects: 1 });
    draft.place("enemy", { col: 12, row: 3 });
    draft.markSaved();

    const outcome = applyGesture(draft, settings("enemy"), "down", at(14, 3));

    assert.deepEqual(outcome, { full: true });
    assert.false(draft.changed);
    assert.false(draft.canUndo);
  });
});
```

Things to notice:

- **The tests drive the gestures as the screen will**: a `drag` helper presses, moves through some squares, and lets go, and the tests look at the draft.
- **"A whole drag is one step of undo"** is the test that would catch the commonest editor bug: an Undo that takes back one square.
- **Every placing tool is tried** against a real draft, so a tool in the table that the draft can't place fails at once.
- **The biggest level the limits allow still fits a screen at the smallest size**, which checks the limits and the sizes against each other.

Open `tests.html`. You should see **748 passing tests**: 19 more.

---

## Step 7: The editor screen

Now the screen. It draws the draft on a canvas, one square for each corner (darker is lower, with its digit in it), with the start, goal and things on top, and has the tools, the numbers of the picked thing, and the list of problems around it. Everything it *does* is a call to the draft or to `applyGesture`, so this file is only drawing, and turning clicks and keys into calls.

It needs a style, and a style is a new part of the page, so it is a **new file** with a `<link>`. Create `css/editor.css` in **this** sample's `css/` folder:

```css
/* The level editor (see editor.js): a bar across the top, the tools on the left, the level in the middle, and the numbers of
   the picked thing and the list of problems on the right. It is one of the full-screen .screen panels, so it has the same
   backdrop, but it is packed from the top and fills the space, since the level is the point. */
/* The sound and pause buttons sit in the corners of the game, and would be over the tools. */
body.editing #sound,
body.editing #pause-button {
  display: none;
}
.screen.editor {
  justify-content: flex-start;
  align-items: stretch;
  gap: 8px;
  padding: 52px 10px 10px;
  text-align: left;
}
.editor input,
.editor select {
  box-sizing: border-box;
  padding: 4px 6px;
  border: 3px solid var(--chrome-dark);
  background: var(--ink);
  color: var(--chrome-light);
  font: 700 17px / 1 var(--small-font);
  user-select: text;
  -webkit-user-select: text;
}
.editor input:focus,
.editor select:focus {
  border-color: var(--yellow);
  outline: none;
}
.editor-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}
.editor-name {
  width: 12em;
  max-width: 100%;
}
.editor-field {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--chrome);
  font: 600 16px / 1.2 var(--small-font);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.editor-field input {
  width: 4.2em;
}
.editor button.hazard {
  padding: 4px 12px;
  border-width: 4px;
  font-size: 16px;
}
.editor button.hazard:disabled {
  opacity: 0.4;
  cursor: default;
}
.editor button.hazard.blocked {
  opacity: 0.55;
}
.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  gap: 10px;
}
.editor h3 {
  margin: 6px 0 2px;
  color: var(--orange);
  font: 400 15px var(--title-font);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.editor-tools {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 4px;
  width: 138px;
  overflow-y: auto;
}
.editor-tools button.hazard.on {
  background: var(--yellow);
  color: var(--ink);
}
.editor-palette {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 3px;
  margin-top: 8px;
}
.editor button.hazard.swatch {
  padding: 5px 0;
  border-width: 3px;
  font-size: 15px;
}
.editor button.hazard.swatch.on {
  outline: 3px solid var(--yellow);
  outline-offset: 1px;
}
.editor-ramp {
  margin-top: 4px;
}
.editor-stage {
  flex: 1;
  min-width: 0;
  overflow: auto;
  border: 3px solid var(--steel);
  background: #0b0e14;
}
.editor-canvas {
  display: block;
  margin: auto;
  cursor: crosshair;
  touch-action: none;
}
.editor-side {
  flex: none;
  width: 232px;
  overflow-y: auto;
}
.editor-fields {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.editor-fields .editor-field {
  justify-content: space-between;
}
.editor-thing-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.editor-problems {
  margin: 0;
  padding: 0;
  list-style: none;
}
.editor-problems li {
  padding: 3px 0;
  cursor: pointer;
  font: 600 15px / 1.2 var(--small-font);
  letter-spacing: 0.03em;
}
.editor-problems li.error {
  color: #ff6b6b;
}
.editor-problems li.warning {
  color: var(--orange);
}
.editor-hint {
  min-height: 1.3em;
  color: var(--chrome);
  font: 600 18px / 1.3 var(--small-font);
  letter-spacing: 0.04em;
}

/* A narrow, tall screen (a phone held upright) has no room for three columns: the tools go in a row above the level, and the
   numbers below it. */
@media (max-width: 860px) and (min-height: 521px) {
  .editor-body {
    flex-direction: column;
    overflow-y: auto;
  }
  .editor-tools {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    width: auto;
    overflow: visible;
  }
  .editor-tools h3 {
    width: 100%;
  }
  .editor-palette {
    grid-template-columns: repeat(10, 1fr);
    margin-top: 0;
  }
  .editor-stage {
    flex: none;
    min-height: 240px;
  }
  .editor-side {
    width: auto;
    overflow: visible;
  }
}

/* A short screen (a phone on its side) keeps the three columns, and makes everything in them smaller. */
@media (max-height: 520px) {
  .screen.editor {
    gap: 4px;
    padding-top: 46px;
  }
  .editor-tools {
    width: 112px;
    gap: 3px;
  }
  .editor-side {
    width: 170px;
  }
  .editor button.hazard {
    padding: 2px 8px;
    border-width: 3px;
    font-size: 14px;
  }
  .editor-hint {
    font-size: 15px;
  }
}
```

Things to notice:

- **The editor is one of the full-screen `.screen` panels**, so it has the same backdrop as the title, but it packs from the top and fills the space, since the level is the point.
- **Three columns, then a row.** On a wide screen the tools are on the left, the level in the middle and the numbers on the right. On a **narrow, tall** screen (a phone upright) the tools go in a row above the level and the numbers below it. On a **short** screen (a phone on its side) it keeps three columns and makes everything smaller.
- **The game's sound and pause buttons are hidden while the editor is up** (`body.editing`), because they sit in the corners over the tools.
- **`touch-action: none` on the canvas** stops a finger dragging the page when it should be painting.

Now `js/editor.js`. It is long, so it comes in three parts. First the skeleton: the colours, a small helper for building elements, and the class with the code that **builds the page**. Open the placeholder `js/editor.js` and replace its contents with:

```js
// The level editor screen. It draws a LevelDraft on a canvas, one square for each corner of the floor (darker is lower, with its
// digit written in it), with the start, goal and things on top, and has the tools, the numbers of the picked thing and the list
// of problems around it. Everything it does to the level is done by the draft and by applyGesture, so this file is only
// drawing, and turning clicks and keys into calls. It is built from a `document`, like the developer panel. The limits (how big
// a level can be, how tall a height can be) are read from the draft, never written here.

const EDITOR_COLORS = {
  hole: "#0b0e14",
  start: "#ffffff",
  enemy: "#ef5e07",
  mover: "#a2adc0",
  selected: "#f6bf0e",
  error: "#ff4040",
  warning: "#ef5e07",
  digitOnLight: "#0b0909",
  digitOnDark: "#d9dbdc",
};

// A small helper for building the page: an element with some properties and children.
function element(doc, tag, props = {}, children = []) {
  const node = doc.createElement(tag);
  Object.assign(node, props);
  for (const child of children) node.appendChild(child);
  return node;
}

class Editor {
  constructor(doc, { limits = EDITOR_LIMITS, onTest = () => {}, onSave = () => true, onClose = () => {} } = {}) {
    this.doc = doc;
    this.limits = limits;
    this.onTest = onTest; // called with the level to play, when Test is clicked and the level can be played
    this.onSave = onSave; // called with the level to keep. Returns whether it was kept
    this.onClose = onClose;
    this.draft = null;
    this.settings = { tool: "paint", height: Math.min(4, limits.maxHeight), rampTo: null };
    this.held = null; // the gesture being made: where it began, where it was last, and so on
    this.preview = null; // the box being dragged by the fill tool
    this.problems = [];
    this.cell = CELL_PIXELS.max;
    this.closing = false; // whether Close is waiting for a second click, because of changes that would be lost
    this._onKey = (event) => this._key(event);
    this._build();
  }

  // ---- building the page ----

  _button(text, onClick, className = "") {
    const button = element(this.doc, "button", { type: "button", textContent: text, className: `hazard ${className}`.trim() });
    button.addEventListener("click", () => {
      button.blur();
      onClick();
    });
    return button;
  }

  _number(min, max, step, onChange) {
    const input = element(this.doc, "input", { type: "number", min, max, step });
    input.addEventListener("change", () => onChange(Number(input.value)));
    return input;
  }

  _build() {
    const { doc, limits } = this;
    this.root = element(doc, "div", { id: "editor", className: "screen editor hidden" });

    // The top bar: the name, the clock, the size, and the buttons.
    this.nameInput = element(doc, "input", { type: "text", className: "editor-name", maxLength: limits.maxName, spellcheck: false, autocomplete: "off" });
    this.nameInput.addEventListener("change", () => this._edit(() => this.draft.setName(this.nameInput.value)));
    this.timeInput = this._number(limits.minTime, limits.maxTime, 5, (value) => this._edit(() => this.draft.setTime(value)));
    this.colsInput = this._number(limits.minCols, limits.maxCols, 1, (value) => this._resize(value, this.draft.rows));
    this.rowsInput = this._number(limits.minRows, limits.maxRows, 1, (value) => this._resize(this.draft.cols, value));
    const labelled = (text, ...inputs) => element(doc, "label", { className: "editor-field" }, [element(doc, "span", { textContent: text }), ...inputs]);
    this.undoButton = this._button("Undo", () => this._undo(), "quiet");
    this.redoButton = this._button("Redo", () => this._redo(), "quiet");
    this.testButton = this._button("Test", () => this._test());
    this.saveButton = this._button("Save", () => this._save());
    this.closeButton = this._button("Exit", () => this._close(), "quiet");
    const bar = element(doc, "div", { className: "editor-bar" }, [
      this.nameInput,
      labelled("Time", this.timeInput),
      labelled("Size", this.colsInput, element(doc, "span", { textContent: "×" }), this.rowsInput),
      this.undoButton,
      this.redoButton,
      this.testButton,
      this.saveButton,
      this.closeButton,
    ]);

    // The tools: the floor ones, a palette of heights, then the things.
    this.toolButtons = {};
    const tools = element(doc, "div", { className: "editor-tools" });
    for (const group of [...new Set(EDITOR_TOOLS.map((tool) => tool.group))]) {
      tools.appendChild(element(doc, "h3", { textContent: group }));
      for (const tool of EDITOR_TOOLS.filter((one) => one.group === group)) {
        this.toolButtons[tool.id] = this._button(tool.label, () => this.setTool(tool.id), "tool");
        tools.appendChild(this.toolButtons[tool.id]);
      }
      if (group === "Floor") this._buildPalette(tools);
    }

    // The picture, and beside it the numbers of the thing that is picked and the problems.
    this.canvas = element(doc, "canvas", { className: "editor-canvas" });
    for (const [type, phase] of [["pointerdown", "down"], ["pointermove", "move"], ["pointerup", "up"], ["pointercancel", "up"]]) {
      this.canvas.addEventListener(type, (event) => this._pointer(phase, event));
    }
    this.stage = element(doc, "div", { className: "editor-stage" }, [this.canvas]);
    this.thingTitle = element(doc, "h3");
    this.thingFields = element(doc, "div", { className: "editor-fields" });
    this.thingButtons = element(doc, "div", { className: "editor-thing-buttons" });
    this.problemTitle = element(doc, "h3");
    this.problemList = element(doc, "ul", { className: "editor-problems" });
    const side = element(doc, "div", { className: "editor-side" }, [this.thingTitle, this.thingFields, this.thingButtons, this.problemTitle, this.problemList]);

    this.hint = element(doc, "p", { className: "editor-hint" });
    this.root.appendChild(bar);
    this.root.appendChild(element(doc, "div", { className: "editor-body" }, [tools, this.stage, side]));
    this.root.appendChild(this.hint);
  }

  // The heights to paint with: a swatch for each digit, and the height a fill ramps to.
  _buildPalette(tools) {
    const { doc, limits } = this;
    this.swatches = [];
    const palette = element(doc, "div", { className: "editor-palette" });
    for (let height = 0; height <= limits.maxHeight; height++) {
      const swatch = this._button(String(height), () => this.setHeight(height), "swatch");
      swatch.style.background = heightColor(height, limits.maxHeight);
      swatch.style.color = height > limits.maxHeight / 2 ? EDITOR_COLORS.digitOnLight : EDITOR_COLORS.digitOnDark;
      this.swatches.push(swatch);
      palette.appendChild(swatch);
    }
    this.rampSelect = element(doc, "select", { className: "editor-ramp", title: "Ramp to" });
    this.rampSelect.appendChild(element(doc, "option", { value: "", textContent: "flat" }));
    for (let height = 0; height <= limits.maxHeight; height++) this.rampSelect.appendChild(element(doc, "option", { value: String(height), textContent: `ramp to ${height}` }));
    this.rampSelect.addEventListener("change", () => {
      this.settings.rampTo = this.rampSelect.value === "" ? null : Number(this.rampSelect.value);
      this.rampSelect.blur();
    });
    tools.appendChild(palette);
    tools.appendChild(this.rampSelect);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EDITOR_COLORS, element, Editor };
} else {
  Object.assign(window, { EDITOR_COLORS, element, Editor });
}
```

Things to notice:

- **It is built from a `document`**, like the developer panel, and it is given `onTest`, `onSave` and `onClose` to call, so it knows nothing about how the game plays or keeps a level.
- **`element(doc, tag, props, children)`** builds an element with some properties and children, which makes the build code short.
- **Everything numeric comes from the limits.** The boxes for the size and the time take their `min` and `max` from `limits`, the palette has a swatch for each height up to `maxHeight`, and the name box has `maxLength`. Change a limit and the screen changes with it.
- **Buttons let go of the keyboard when clicked** (`blur`), like every button in the game.

Next, add the methods that **open and close the screen and do things**. Directly **above** the closing `}` of the class (the one just above the export block), add:

```js
  // ---- opening and closing ----

  open(draft) {
    this.draft = draft;
    this.held = null;
    this.preview = null;
    this.closing = false;
    this.root.classList.remove("hidden");
    this.doc.body.classList.add("editing");
    window.addEventListener("keydown", this._onKey);
    window.addEventListener("resize", this._onResize || (this._onResize = () => this.refresh()));
    this.say("");
    this.setTool(this.settings.tool);
    this.refresh();
  }

  hide() {
    this.root.classList.add("hidden");
    this.doc.body.classList.remove("editing");
    window.removeEventListener("keydown", this._onKey);
    window.removeEventListener("resize", this._onResize);
  }

  get isOpen() {
    return !this.root.classList.contains("hidden");
  }

  say(text) {
    this.hint.textContent = text;
  }

  // ---- doing things ----

  setTool(id) {
    this.settings.tool = id;
    this.say(EDITOR_TOOLS.find((tool) => tool.id === id).hint);
    this._showChoices();
  }

  setHeight(height) {
    this.settings.height = height;
    this._showChoices();
  }

  // One change made by a button or a box: an undo step is started, the change is made, and the screen follows.
  _edit(change) {
    this.draft.begin();
    change();
    this.refresh();
  }

  _resize(cols, rows) {
    this._edit(() => this.draft.resize(cols, rows));
  }

  _undo() {
    if (this.draft.undo()) this.refresh();
  }

  _redo() {
    if (this.draft.redo()) this.refresh();
  }

  _remove() {
    if (!this.draft.selected) return;
    this.draft.begin();
    if (this.draft.removeSelected()) this.refresh();
    else this.say("The start and the goal can't be taken out. Move them with their tools.");
  }

  _flatten() {
    this.draft.begin();
    const changed = this.draft.flattenSelected();
    this.say(changed > 0 ? "The floor is flat under it now." : "The floor was flat there already.");
    this.refresh();
  }

  _test() {
    const problems = this.draft.problems;
    const error = problems.find((found) => found.severity === "error");
    if (error) {
      this.say(`It can't be played yet: ${error.message}.`);
      return;
    }
    this.onTest(this.draft.toLevel());
  }

  _save() {
    if (this.onSave(this.draft.toLevel())) {
      this.draft.markSaved();
      this.say("Saved to My levels.");
    } else {
      this.say("It could not be saved. Is My levels full?");
    }
    this.refresh();
  }

  // Closing a level with changes that were not saved asks first: the button says so, and the next click closes.
  _close() {
    if (this.draft.changed && !this.closing) {
      this.closing = true;
      this.closeButton.textContent = "Exit without saving?";
      return;
    }
    this.closing = false;
    this.closeButton.textContent = "Exit";
    this.hide();
    this.onClose();
  }

  // ---- the mouse and the keyboard ----

  _at(event) {
    const box = this.canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    return { corner: cornerAt(x, y, this.cell), place: placeAt(x, y, this.cell) };
  }

  _pointer(phase, event) {
    if (!this.draft) return;
    if (phase === "down") {
      if (event.button !== 0) return;
      if (this.canvas.setPointerCapture) this.canvas.setPointerCapture(event.pointerId);
    } else if (!this.held) {
      return;
    }
    const at = this._at(event);
    const outcome = applyGesture(this.draft, this.settings, phase, at, this.held || {});
    if (phase === "down") this.held = { origin: at, last: at, picked: false, began: false };
    Object.assign(this.held, outcome);
    this.held.last = at;
    if (outcome.full) this.say(`There is no room for another: a level has at most ${this.limits.maxObjects} of each thing.`);
    if (outcome.switchTo) this.setTool(outcome.switchTo);
    if (this.settings.tool === "fill") this.preview = { from: this.held.origin.corner, to: at.corner };
    if (phase === "move") {
      this.draw();
      return;
    }
    if (phase === "up") {
      this.held = null;
      this.preview = null;
    }
    this.refresh();
  }

  _key(event) {
    if (typesText(event) || (event.target && event.target.tagName === "SELECT")) return;
    const command = event.ctrlKey || event.metaKey;
    if (command && event.code === "KeyZ") {
      event.preventDefault();
      if (event.shiftKey) this._redo();
      else this._undo();
    } else if (command && event.code === "KeyY") {
      event.preventDefault();
      this._redo();
    } else if (event.code === "Delete" || event.code === "Backspace") {
      event.preventDefault();
      this._remove();
    } else if (/^Digit\d$/.test(event.code) && Number(event.code.slice(5)) <= this.limits.maxHeight) {
      this.setHeight(Number(event.code.slice(5)));
    }
  }
```

Things to notice:

- **`_edit(change)` is the one way a button or a box changes the level**: start an undo step, make the change, and refresh the screen.
- **Closing a level with unsaved changes asks first**: the button says *Exit without saving?*, and the next click exits.
- **`_pointer` is the whole of the mouse.** It turns a pixel into a corner and a place, calls `applyGesture`, keeps what the gesture says about itself in `held`, and redraws. A move only redraws the picture (a drag can be hundreds of moves); the end of the gesture redraws everything.
- **`setPointerCapture`** keeps the pointer events coming to the canvas when the mouse leaves it in the middle of a drag.
- **The keys**: **0 to 9** pick a height (up to the highest), **Ctrl+Z** undoes, **Ctrl+Y** or **Ctrl+Shift+Z** redoes, **Delete** removes the picked thing. They are ignored while typing in a box, as every key in the game is (`typesText`).
- **The editor is opened and hidden, not made and destroyed.** The key listeners are added when it opens and taken away when it hides, so a hidden editor can't take a key meant for the game.

Last, add the part that **draws**. Again directly **above** the closing `}` of the class, add:

```js
  // ---- showing it ----

  // Redraws everything from the draft: the boxes at the top, the picture, the picked thing and the problems.
  refresh() {
    const { draft } = this;
    this.problems = draft.problems;
    if (this.doc.activeElement !== this.nameInput) this.nameInput.value = draft.level.name;
    this.timeInput.value = draft.level.time;
    this.colsInput.value = draft.cols;
    this.rowsInput.value = draft.rows;
    this.undoButton.disabled = !draft.canUndo;
    this.redoButton.disabled = !draft.canRedo;
    this.saveButton.textContent = draft.changed ? "Save •" : "Saved";
    this.testButton.classList.toggle("blocked", !canPlay(this.problems));
    this._layout();
    this.draw();
    this._showChoices();
    this._showThing();
    this._showProblems();
  }

  // Which tool and height are chosen.
  _showChoices() {
    for (const [id, button] of Object.entries(this.toolButtons)) button.classList.toggle("on", id === this.settings.tool);
    this.swatches.forEach((swatch, height) => swatch.classList.toggle("on", height === this.settings.height));
  }

  // Makes the picture the size that fits the space it is in.
  _layout() {
    const { draft } = this;
    const width = this.stage.clientWidth || 900;
    const height = this.stage.clientHeight || 520;
    this.cell = cellSizeFor(draft.cols, draft.rows, width, height);
    this.canvas.width = draft.cols * this.cell;
    this.canvas.height = draft.rows * this.cell;
  }

  draw() {
    const { draft, cell, canvas } = this;
    const context = canvas.getContext("2d");
    const at = (value) => (value + 0.5) * cell; // the middle of a corner's square, in pixels
    context.fillStyle = EDITOR_COLORS.hole;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // The floor.
    context.font = `700 ${Math.floor(cell * 0.55)}px "Barlow Condensed", sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (let row = 0; row < draft.rows; row++) {
      for (let col = 0; col < draft.cols; col++) {
        const digit = draft.digitAt(col, row);
        if (digit === null) continue;
        context.fillStyle = heightColor(digit, this.limits.maxHeight);
        context.fillRect(col * cell + 1, row * cell + 1, cell - 2, cell - 2);
        if (cell >= 16) {
          context.fillStyle = digit > this.limits.maxHeight / 2 ? EDITOR_COLORS.digitOnLight : EDITOR_COLORS.digitOnDark;
          context.fillText(String(digit), at(col), at(row) + 1);
        }
      }
    }

    // The things. A zone is drawn as big as the floor it needs flat.
    const level = draft.level;
    const disc = (point, radius, color, letter, textColor = EDITOR_COLORS.digitOnLight) => {
      context.globalAlpha = 0.35;
      context.fillStyle = color;
      context.beginPath();
      context.arc(at(point.col), at(point.row), (radius / CELL) * cell, 0, Math.PI * 2);
      context.fill();
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(at(point.col), at(point.row), cell * 0.4, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = textColor;
      context.fillText(letter, at(point.col), at(point.row) + 1);
    };
    disc(level.goal, ZONE_RADIUS, ZONE_COLORS.goal, "G");
    (level.checkpoints || []).forEach((checkpoint, index) => disc(checkpoint, ZONE_RADIUS, ZONE_COLORS.checkpoint, String(index + 1)));
    (level.slime || []).forEach((puddle) => disc(puddle, puddle.radius, ZONE_COLORS.slime, "~"));
    (level.enemies || []).forEach((enemy) => disc(enemy, 0, EDITOR_COLORS.enemy, "E"));
    disc(level.start, 0, EDITOR_COLORS.start, "S");
    context.lineWidth = 2;
    context.strokeStyle = EDITOR_COLORS.mover;
    for (const mover of level.movers || []) {
      const box = (point) => context.strokeRect(at(point.col) - (mover.size.x / CELL / 2) * cell, at(point.row) - (mover.size.z / CELL / 2) * cell, (mover.size.x / CELL) * cell, (mover.size.z / CELL) * cell);
      if (mover.kind === "piston") {
        box(mover.at);
        context.fillStyle = EDITOR_COLORS.mover;
        context.fillText("P", at(mover.at.col), at(mover.at.row) + 1);
      } else {
        box(mover.from);
        box(mover.to);
        context.beginPath();
        context.moveTo(at(mover.from.col), at(mover.from.row));
        context.lineTo(at(mover.to.col), at(mover.to.row));
        context.stroke();
      }
    }

    // The problems, ringed where they are, and the thing that is picked.
    for (const found of this.problems) {
      if (found.col === undefined) continue;
      context.strokeStyle = EDITOR_COLORS[found.severity];
      context.beginPath();
      context.arc(at(found.col), at(found.row), cell * 0.7, 0, Math.PI * 2);
      context.stroke();
    }
    if (draft.selected && draft.selectedThing) {
      const thing = draft.selectedThing;
      const marks = thing.kind === "platform" ? [thing.from, thing.to] : [thing.kind === "piston" ? thing.at : thing];
      context.strokeStyle = EDITOR_COLORS.selected;
      context.lineWidth = 3;
      for (const point of marks) context.strokeRect(at(point.col) - cell * 0.6, at(point.row) - cell * 0.6, cell * 1.2, cell * 1.2);
    }

    // The box being dragged by the fill tool.
    if (this.preview) {
      const { from, to } = this.preview;
      context.strokeStyle = EDITOR_COLORS.selected;
      context.lineWidth = 2;
      context.strokeRect(Math.min(from.col, to.col) * cell, Math.min(from.row, to.row) * cell, (Math.abs(to.col - from.col) + 1) * cell, (Math.abs(to.row - from.row) + 1) * cell);
    }
  }

  // The numbers of the thing that is picked, as boxes, with buttons for what can be done to it.
  _showThing() {
    const { doc, draft } = this;
    this.thingFields.replaceChildren();
    this.thingButtons.replaceChildren();
    if (!draft.selected || !draft.selectedThing) {
      this.thingTitle.textContent = "Nothing picked";
      return;
    }
    this.thingTitle.textContent = thingName(draft.level, draft.selected);
    for (const field of draft.fields) {
      const input = element(doc, "input", { type: "number", min: field.min, max: field.max, step: field.step, value: getField(draft.selectedThing, field.path) });
      input.addEventListener("change", () => this._edit(() => draft.setField(field.path, input.value)));
      this.thingFields.appendChild(element(doc, "label", { className: "editor-field" }, [element(doc, "span", { textContent: field.label }), input]));
    }
    if (["goal", "checkpoint", "slime"].includes(draft.selected.kind) || (draft.selected.kind === "mover" && draft.selectedThing.kind === "piston")) {
      this.thingButtons.appendChild(this._button("Flatten floor", () => this._flatten(), "quiet"));
    }
    if (draft.selected.kind !== "start" && draft.selected.kind !== "goal") this.thingButtons.appendChild(this._button("Remove", () => this._remove(), "quiet"));
  }

  // The problems, worst first. Clicking one picks the thing it is about.
  _showProblems() {
    const { doc, draft } = this;
    this.problemList.replaceChildren();
    const errors = this.problems.filter((found) => found.severity === "error").length;
    this.problemTitle.textContent = this.problems.length === 0 ? "No problems" : `${errors ? `${errors} error${errors === 1 ? "" : "s"}, ` : ""}${this.problems.length - errors} warning${this.problems.length - errors === 1 ? "" : "s"}`;
    for (const found of this.problems) {
      const item = element(doc, "li", { className: found.severity, textContent: found.message });
      item.addEventListener("click", () => {
        if (found.col === undefined) return;
        draft.select(draft.thingAt({ col: found.col, row: found.row }));
        this.refresh();
      });
      this.problemList.appendChild(item);
    }
  }
```

Things to notice:

- **`refresh()` redraws everything from the draft**: the boxes at the top, the picture, the picked thing and the problems. There is no other state to keep in step.
- **The picture is the draft.** Each corner is a square coloured by its height, with the digit written in it when the squares are big enough; a hole is dark.
- **A zone is drawn as big as the floor it needs flat.** The goal, a checkpoint and a puddle are discs with the radius they really have, so you can *see* whether the area under one is flat. The start and enemies are small discs, a piston is a box, and a platform is the box at each end with a line between.
- **Problems are ringed where they are**, in red for an error and orange for a warning, and the thing that is picked has a yellow frame.
- **The form for the picked thing is built from `thingFields`**: a box for each number, with its range and step, and each change is an undo step. *Flatten floor* and *Remove* are there when they make sense.
- **Clicking a problem picks the thing it is about**, so the list is a way round the level as well as a list.

---

## Step 8: The My levels screen

A list of the levels a person has made, each with **Play**, **Edit**, **Share** and **Delete**, and buttons to make a **New level** or **Add from text**. Like the editor it is built from a `document`, shows what it is told to, and calls back when a button is pressed. It needs a style, so create `css/mylevels.css` in **this** sample's `css/` folder:

```css
/* The My levels screen (see myscreen.js): a list of the levels a person has made, with a few buttons on each, and a box for the
   text of a level. */
.mylevels .mine-count {
  color: var(--blue);
  font: 700 22px / 1.2 var(--small-font);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.mylevels .hidden {
  display: none;
}
.mine-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: min(760px, 94vw);
  max-height: 46vh;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}
.mine-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 14px;
  padding: 6px 12px;
  border: 4px solid var(--steel);
  background: rgba(11, 9, 9, 0.5);
}
.mine-name {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}
.mine-name strong {
  color: var(--chrome-light);
  font: 700 22px / 1.1 var(--small-font);
  letter-spacing: 0.04em;
}
.mine-name small {
  color: var(--chrome-dark);
  font: 600 15px / 1.2 var(--small-font);
}
.mine-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mylevels button.hazard {
  padding: 4px 14px;
  border-width: 4px;
  font-size: 17px;
}
.mylevels button.hazard:disabled {
  opacity: 0.4;
  cursor: default;
}
.mine-message {
  min-height: 1.3em;
  color: var(--yellow);
  font: 700 18px / 1.3 var(--small-font);
  letter-spacing: 0.04em;
}
.mine-text-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: min(760px, 94vw);
}
.mine-text-panel.hidden {
  display: none;
}
.mine-text-label {
  color: var(--chrome);
  font: 600 18px / 1.3 var(--small-font);
}
.mine-text {
  box-sizing: border-box;
  width: 100%;
  padding: 8px;
  border: 3px solid var(--chrome-dark);
  background: var(--ink);
  color: var(--chrome-light);
  font: 14px / 1.3 ui-monospace, Consolas, monospace;
  user-select: text;
  -webkit-user-select: text;
}
.mine-text:focus {
  border-color: var(--yellow);
  outline: none;
}

@media (max-height: 520px) {
  .mine-list {
    max-height: 36vh;
  }
}

/* The button that stops playing a level of your own and goes back to where it came from. It is at the top left, under the way
   back to the samples, which is clear of the marble in the middle. */
#leave-play {
  position: fixed;
  left: 12px;
  top: 56px;
  z-index: 20;
}
#leave-play.hidden {
  display: none;
}
```

Then `js/myscreen.js`. Open the placeholder and replace its contents with:

```js
// The My levels screen: a list of the levels a person has made, each with buttons to play it, edit it, share it as text, or delete it,
// and buttons to make a new one or add one from text. It shows what it is told to (a list of { name, detail, playable }) and
// calls back when a button is pressed, so it knows nothing about saving or playing. Built from a `document`, like the developer
// panel and the editor (it uses their `element` helper), so the tests can give it a stand-in. See ../tests/myscreen.tests.js.
class MyLevelsScreen {
  constructor(doc, { onPlay = () => {}, onEdit = () => {}, onExport = () => {}, onDelete = () => {}, onNew = () => {}, onImport = () => {}, onBack = () => {}, clipboard = null } = {}) {
    this.doc = doc;
    this.callbacks = { onPlay, onEdit, onExport, onDelete, onNew, onImport, onBack };
    this.clipboard = clipboard;
    this.deleteButtons = [];
    this.action = null; // what the button of the text box does with the text, when it is for adding a level

    this.root = element(doc, "div", { id: "mylevels", className: "screen mylevels hidden" });
    this.count = element(doc, "p", { className: "mine-count" });
    this.list = element(doc, "ul", { className: "mine-list" });
    this.message = element(doc, "p", { className: "mine-message" });
    this.newButton = this._button("New level", () => onNew(), "");
    this.importButton = this._button("Add from text", () => this.callbacks.onImport(), "");
    this.backButton = this._button("Back", () => onBack(), "");

    // The box for the text of a level: to copy one, or to paste one.
    this.textLabel = element(doc, "p", { className: "mine-text-label" });
    this.textBox = element(doc, "textarea", { className: "mine-text", rows: 8, spellcheck: false });
    this.actionButton = this._button("Add this level", () => this._run(), "");
    this.copyButton = this._button("Copy", () => this._copy(), "");
    this.closeTextButton = this._button("Close", () => this.hideText(), "");
    this.textPanel = element(doc, "div", { className: "mine-text-panel hidden" }, [
      this.textLabel,
      this.textBox,
      element(doc, "div", { className: "row" }, [this.actionButton, this.copyButton, this.closeTextButton]),
    ]);

    this.root.appendChild(element(doc, "h2", { textContent: "My levels" }));
    this.root.appendChild(this.count);
    this.root.appendChild(this.list);
    this.root.appendChild(this.message);
    this.root.appendChild(element(doc, "div", { className: "row" }, [this.newButton, this.importButton, this.backButton]));
    this.root.appendChild(this.textPanel);
  }

  _button(text, onClick, className) {
    const button = element(this.doc, "button", { type: "button", textContent: text, className: `hazard ${className}`.trim() });
    button.addEventListener("click", () => {
      button.blur();
      onClick();
    });
    return button;
  }

  show() {
    this.root.classList.remove("hidden");
  }

  hide() {
    this.root.classList.add("hidden");
    this.hideText();
  }

  setMessage(text) {
    this.message.textContent = text;
  }

  // Shows the list. Each item is { name, detail, playable }. Names are set as text, never as HTML, so a name can't add anything
  // to the page. A level that can't be played has its Play button switched off. `max` is the most levels there can be.
  render(items, max) {
    this.list.replaceChildren();
    this.deleteButtons = [];
    this.count.textContent = items.length === 0 ? "You haven't made a level yet." : `${items.length} of ${max}`;
    this.newButton.disabled = items.length >= max;
    this.importButton.disabled = items.length >= max;
    items.forEach((item, index) => {
      const play = this._button("Play", () => this.callbacks.onPlay(index), "");
      play.disabled = !item.playable;
      const remove = this._button("Delete", () => this._delete(index), "quiet");
      this.deleteButtons.push(remove);
      const buttons = [play, this._button("Edit", () => this.callbacks.onEdit(index), ""), this._button("Share", () => this.callbacks.onExport(index), ""), remove];
      const label = element(this.doc, "span", { className: "mine-name" }, [element(this.doc, "strong", { textContent: item.name }), element(this.doc, "small", { textContent: item.detail })]);
      this.list.appendChild(element(this.doc, "li", {}, [label, element(this.doc, "span", { className: "mine-buttons" }, buttons)]));
    });
  }

  // Deleting asks first, so a slip doesn't lose a level: the button says "Sure?", and the next click on it deletes. Pressing
  // any other button, or showing the list again, lets it off.
  _delete(index) {
    const button = this.deleteButtons[index];
    if (button.textContent === "Sure?") {
      this.callbacks.onDelete(index);
      return;
    }
    this.deleteButtons.forEach((other) => (other.textContent = "Delete"));
    button.textContent = "Sure?";
  }

  // The text box, for copying a level (readOnly) or for pasting one, which is added by `action` with the text.
  showText({ label, text = "", readOnly = false, action = null }) {
    this.textLabel.textContent = label;
    this.textBox.value = text;
    this.textBox.readOnly = readOnly;
    this.actionButton.classList.toggle("hidden", !action);
    this.copyButton.classList.toggle("hidden", !readOnly);
    this.action = action;
    this.textPanel.classList.remove("hidden");
    if (readOnly && this.textBox.select) this.textBox.select();
  }

  hideText() {
    this.textPanel.classList.add("hidden");
    this.action = null;
  }

  _run() {
    if (this.action) this.action(this.textBox.value);
  }

  // Puts the text on the clipboard if there is one. Says whether it did.
  async _copy() {
    if (!this.clipboard) return false;
    try {
      await this.clipboard.writeText(this.textBox.value);
      this.setMessage("Copied.");
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MyLevelsScreen };
} else {
  window.MyLevelsScreen = MyLevelsScreen;
}
```

Things to notice:

- **It is given a list of `{ name, detail, playable }`**, and doesn't know where it came from. A level that can't be played (it has an error) has its **Play** button switched off.
- **Names are set as text, never as HTML.** A level called `<img src=x onerror=...>` is shown as exactly those characters, and a test proves it. Levels can arrive from other people, so this matters.
- **Delete asks first.** The first click turns the button into **Sure?**, and the next click on it deletes. Pressing another row's Delete, or showing the list again, lets it off.
- **One text box does two jobs.** `showText` with `readOnly` is for **Share** (the text of a level, selected, with a **Copy** button), and without it is for **Add from text**, with an action that is given what was pasted.
- **`maxLevels` is passed in**, so the count (*3 of 20*) and the switching off of *New level* when the list is full come from the limit, not from a number in this file.

### Tests

The tests for a screen need a page, and a stand-in for one is long enough to have its own file. Create `tests/fakedom.js`: open the placeholder and replace its contents with:

```js
// A stand-in for the page, for the tests of the screens that are built from a `document`: just enough of an element for them to
// be built, clicked and looked at. It does nothing that a page does, and needs no page. (The developer panel's tests have a
// smaller one of their own.)
class FakeElement {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.listeners = {};
    this.style = {};
    this.textContent = "";
    this.value = "";
    this.className = "";
    this.disabled = false;
    this.readOnly = false;
    const element = this;
    this.classList = {
      get set() {
        return new Set(element.className.split(/\s+/).filter(Boolean));
      },
      add(name) {
        element.className = [...new Set([...this.set, name])].join(" ");
      },
      remove(name) {
        element.className = [...this.set].filter((one) => one !== name).join(" ");
      },
      contains(name) {
        return this.set.has(name);
      },
      toggle(name, force) {
        const on = force === undefined ? !this.set.has(name) : force;
        if (on) this.add(name);
        else this.remove(name);
        return on;
      },
    };
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  addEventListener(type, callback) {
    this.listeners[type] = callback;
  }

  click() {
    this.listeners.click();
  }

  blur() {
    this.blurred = (this.blurred || 0) + 1;
  }

  select() {
    this.selected = true;
  }

  // Every element below this one (and this one) that satisfies `test`.
  findAll(test) {
    const found = test(this) ? [this] : [];
    for (const child of this.children) found.push(...child.findAll(test));
    return found;
  }
}

const fakeDocument = { createElement: (tag) => new FakeElement(tag) };
```

Then in `tests.html`, add the scripts below `gestures.js` and the tests below `gestures.tests.js`. The stand-in goes **above** the tests that use it:

```html
  <script src="js/editor.js"></script>
  <script src="js/myscreen.js"></script>
  <script src="tests/fakedom.js"></script>
  <script src="tests/myscreen.tests.js"></script>
```

(`editor.js` is there for `element`, which `myscreen.js` uses.) Open the placeholder `tests/myscreen.tests.js` and replace its contents with:

```js
QUnit.module("element", () => {
  QUnit.test("makes an element with properties and children", (assert) => {
    const child = element(fakeDocument, "span", { textContent: "x" });
    const parent = element(fakeDocument, "div", { className: "box", id: "one" }, [child]);

    assert.strictEqual(parent.tag, "div");
    assert.strictEqual(parent.className, "box");
    assert.strictEqual(parent.id, "one");
    assert.deepEqual(parent.children, [child]);
  });
});

QUnit.module("MyLevelsScreen", () => {
  const items = [
    { name: "Hill", detail: "20 × 12", playable: true },
    { name: "Broken", detail: "20 × 12 · 2 to fix", playable: false },
  ];
  const calls = [];
  const make = (options = {}) => {
    calls.length = 0;
    const record = (name) => (...args) => calls.push([name, ...args]);
    const screen = new MyLevelsScreen(fakeDocument, {
      onPlay: record("play"),
      onEdit: record("edit"),
      onExport: record("export"),
      onDelete: record("delete"),
      onNew: record("new"),
      onImport: record("import"),
      onBack: record("back"),
      ...options,
    });
    screen.render(items, 5);
    return screen;
  };
  const buttonsOf = (screen, index) => screen.list.children[index].findAll((node) => node.tag === "button");
  const press = (screen, index, text) => buttonsOf(screen, index).find((button) => button.textContent === text).click();

  QUnit.test("starts hidden, and show and hide change that", (assert) => {
    const screen = make();
    assert.true(screen.root.classList.contains("hidden"));
    screen.show();
    assert.false(screen.root.classList.contains("hidden"));
    screen.hide();
    assert.true(screen.root.classList.contains("hidden"));
  });

  QUnit.test("a row for every level, with its name and detail as text", (assert) => {
    const screen = make();

    assert.strictEqual(screen.list.children.length, 2);
    const texts = screen.list.children[1].findAll((node) => node.textContent && node.children.length === 0).map((node) => node.textContent);
    assert.true(texts.includes("Broken"));
    assert.true(texts.includes("20 × 12 · 2 to fix"));
  });

  QUnit.test("the count says how many of how many, or that there are none", (assert) => {
    const screen = make();
    assert.strictEqual(screen.count.textContent, "2 of 5");
    screen.render([], 5);
    assert.true(screen.count.textContent.includes("haven't"));
    assert.strictEqual(screen.list.children.length, 0);
  });

  QUnit.test("a level that can't be played has its Play button switched off", (assert) => {
    const screen = make();
    const play = (index) => buttonsOf(screen, index).find((button) => button.textContent === "Play");
    assert.false(play(0).disabled);
    assert.true(play(1).disabled);
  });

  QUnit.test("Play, Edit and Share say which level", (assert) => {
    const screen = make();

    press(screen, 1, "Play");
    press(screen, 0, "Edit");
    press(screen, 1, "Share");

    assert.deepEqual(calls, [["play", 1], ["edit", 0], ["export", 1]]);
  });

  QUnit.test("Delete asks first: the first click changes the button, and the second deletes", (assert) => {
    const screen = make();

    press(screen, 0, "Delete");
    assert.deepEqual(calls, []);
    assert.strictEqual(screen.deleteButtons[0].textContent, "Sure?");

    press(screen, 0, "Sure?");
    assert.deepEqual(calls, [["delete", 0]]);
  });

  QUnit.test("asking to delete another level lets the first off", (assert) => {
    const screen = make();
    press(screen, 0, "Delete");

    press(screen, 1, "Delete");

    assert.strictEqual(screen.deleteButtons[0].textContent, "Delete");
    assert.strictEqual(screen.deleteButtons[1].textContent, "Sure?");
  });

  QUnit.test("showing the list again lets every delete off", (assert) => {
    const screen = make();
    press(screen, 0, "Delete");
    screen.render(items, 5);
    assert.strictEqual(screen.deleteButtons[0].textContent, "Delete");
  });

  QUnit.test("New, Add from text and Back call back", (assert) => {
    const screen = make();

    screen.newButton.click();
    screen.importButton.click();
    screen.backButton.click();

    assert.deepEqual(calls.map((call) => call[0]), ["new", "import", "back"]);
  });

  QUnit.test("when there is no room for another level, New and Add from text are off", (assert) => {
    const screen = make();
    assert.false(screen.newButton.disabled);
    screen.render(items, 2);
    assert.true(screen.newButton.disabled);
    assert.true(screen.importButton.disabled);
  });

  QUnit.test("a name is shown as text, so it can't add anything to the page", (assert) => {
    const screen = make();
    screen.render([{ name: "<img src=x onerror=alert(1)>", detail: "", playable: true }], 5);

    const names = screen.list.children[0].findAll((node) => node.tag === "strong");
    assert.strictEqual(names[0].textContent, "<img src=x onerror=alert(1)>");
    assert.strictEqual(names[0].innerHTML, undefined);
  });

  QUnit.test("showText shows the text box with the text, and hideText hides it", (assert) => {
    const screen = make();

    screen.showText({ label: "Copy this", text: "{}", readOnly: true });
    assert.false(screen.textPanel.classList.contains("hidden"));
    assert.strictEqual(screen.textBox.value, "{}");
    assert.true(screen.textBox.readOnly);
    assert.true(screen.textBox.selected);
    assert.strictEqual(screen.textLabel.textContent, "Copy this");

    screen.hideText();
    assert.true(screen.textPanel.classList.contains("hidden"));
  });

  QUnit.test("a box for copying has a Copy button and no Add button, and a box for pasting the other way round", (assert) => {
    const screen = make();

    screen.showText({ label: "x", text: "y", readOnly: true });
    assert.true(screen.actionButton.classList.contains("hidden"));
    assert.false(screen.copyButton.classList.contains("hidden"));

    screen.showText({ label: "x", action: () => {} });
    assert.false(screen.actionButton.classList.contains("hidden"));
    assert.true(screen.copyButton.classList.contains("hidden"));
    assert.false(screen.textBox.readOnly);
  });

  QUnit.test("the Add button gives the text to the action", (assert) => {
    const screen = make();
    const got = [];
    screen.showText({ label: "x", action: (text) => got.push(text) });

    screen.textBox.value = "pasted";
    screen.actionButton.click();

    assert.deepEqual(got, ["pasted"]);
  });

  QUnit.test("Copy puts the text on the clipboard, and says so", async (assert) => {
    const written = [];
    const screen = make({ clipboard: { writeText: async (text) => written.push(text) } });
    screen.showText({ label: "x", text: "level text", readOnly: true });

    assert.true(await screen._copy());

    assert.deepEqual(written, ["level text"]);
    assert.strictEqual(screen.message.textContent, "Copied.");
  });

  QUnit.test("Copy without a clipboard, or with one that refuses, doesn't fail", async (assert) => {
    assert.false(await make()._copy());
    assert.false(await make({ clipboard: { writeText: async () => { throw new Error("no"); } } })._copy());
  });

  QUnit.test("setMessage shows a line of words", (assert) => {
    const screen = make();
    screen.setMessage("Added.");
    assert.strictEqual(screen.message.textContent, "Added.");
  });
});
```

Things to notice:

- **`FakeElement` is just enough of an element**: children, a class list, listeners, a click. It does nothing a page does, which is the point. The tests are about what the screen *asks for*.
- **The buttons are found by their text**, as a person would, so renaming one means changing the test, which is right.
- **The hostile name test** gives the screen a name with markup in it and checks that it came out as plain text.

Open `tests.html`. You should see **766 passing tests**: 18 more.

---

## Step 9: Playing your own levels

The last step joins it to the game. The title gets a **My levels** button, the pause and result buttons can say where they go back to, and `main.js` learns three things: to play *one* level instead of the list, to remember **where a game was started from**, and to show the editor and the list.

First the page. In `index.html`, add the two styles below the one for `devpanel.css`:

```html
  <link rel="stylesheet" href="css/editor.css">
  <link rel="stylesheet" href="css/mylevels.css">
```

Add the scripts to the list at the bottom of `<body>`, below `devpanel.js` and above `controls.js`:

```html
  <script src="js/limits.js"></script>
  <script src="js/check.js"></script>
  <script src="js/things.js"></script>
  <script src="js/draft.js"></script>
  <script src="js/mylevels.js"></script>
  <script src="js/gestures.js"></script>
  <script src="js/editor.js"></script>
  <script src="js/myscreen.js"></script>
```

And add the button to the title, directly **below** the line `<p id="title-best"></p>`:

```html
    <div class="row">
      <button id="mine" class="hazard" type="button">My levels</button>
    </div>
```

### Where a button goes back to

A pause or a result has a button that goes **back**, and until now it always said *Title*. Playing a level from **My levels** should go back to My levels, and testing a level from the editor should go back to the editor. Open `js/screens.js` and add this method to `Screens`, directly above the comment for `setSound`:

```js
  // Says on the buttons that leave a pause or a result where they go: "Title", or "My levels" if that is where the level
  // being played was started from.
  setLeave(label) {
    this.buttons.pauseTitle.textContent = label;
    this.buttons.overTitle.textContent = label;
  }
```

and its test, in `tests/screens.tests.js`, directly above the test *"bind() makes each button do its own thing"*:

```js
  QUnit.test("setLeave() says on the pause and result buttons where they go", (assert) => {
    const { screens, els } = make();

    screens.setLeave("My levels");
    assert.strictEqual(els["pause-title"].textContent, "My levels");
    assert.strictEqual(els["over-title"].textContent, "My levels");

    screens.setLeave("Title");
    assert.strictEqual(els["pause-title"].textContent, "Title");
    assert.strictEqual(els["over-title"].textContent, "Title");
  });
```

### Playing one level

`main.js` plays `LEVELS`, the game's list. For a level of a person's own it needs to play a list of **one**. Find the line `let level = buildLevel(scene, LEVELS[levelIndex]);` and **replace** it with:

```js
  let playlist = LEVELS; // the levels being played: the game's own, or just one of a person's
  let level = buildLevel(scene, playlist[levelIndex]);
```

In `loadLevel`, change the line that builds the level:

```js
    level = buildLevel(scene, playlist[levelIndex]);
```

Change `nextLevel`, and the line in `announceEnd` that works out whether this is the last level, to go by `playlist` and not `LEVELS`:

```js
  const nextLevel = () => loadLevel((levelIndex + 1) % playlist.length); // after the last, the first
      const last = levelIndex === playlist.length - 1;
```

### Starting, ending and leaving

Find `startGame`, `endGame` and `toTitle` and **delete all three** (from `const startGame` down to and including the closing `};` of `toTitle`, which is just above `const togglePause`). Add these in their place:

```js
  const beginRun = () => {
    sounds.unlock(); // the browser only allows sound after the player has done something
    tally.reset();
    loadLevel(0);
    game.start();
    screens.setPlaying(true);
    screens.show(STATES.playing);
    sounds.play("start");
  };
  const startGame = () => {
    profile.name = cleanName(screens.name);
    profile.save();
    screens.setName(profile.name);
    origin = "title";
    playlist = LEVELS;
    screens.setLeave("Title");
    leaveButton.classList.add("hidden");
    beginRun();
  };
  // A level of a person's own is played on its own, and does not go on the leaderboard, which is for the game's levels.
  const playLevel = (levelToPlay, from) => {
    origin = from;
    playlist = [levelToPlay];
    overlay = null;
    myScreen.hide();
    editor.hide();
    screens.setLeave(from === "editor" ? "Editor" : "My levels");
    leaveButton.textContent = from === "editor" ? "Back to editor" : "Back to My levels";
    leaveButton.classList.remove("hidden");
    beginRun();
  };
  const playAgain = () => (origin === "title" ? startGame() : playLevel(playlist[0], origin));
  const endGame = (won) => {
    const score = tally.total;
    const own = origin !== "title";
    const newBest = !own && board.isBest(score);
    const rank = own ? 0 : board.add(profile.name, score);
    game.end();
    screens.setPlaying(false);
    screens.showResult({ heading: won ? "You win!" : "Time's up", score, best: board.best, newBest, rank, entries: board.entries });
    sounds.play(newBest ? "best" : won ? "goal" : "over");
  };
  // Leaving a pause or a result goes back to where the game was started from: the title, My levels, or the editor.
  const toTitle = () => {
    if (!game.toTitle()) return;
    const from = origin;
    origin = "title";
    playlist = LEVELS;
    screens.setLeave("Title");
    leaveButton.classList.add("hidden");
    loadLevel(0); // the first level waits behind the title
    if (from === "mine") openMine();
    else if (from === "editor") reopenEditor();
    else showTitle();
    sounds.play("click");
  };
```

Things to notice:

- **`beginRun` is what the three kinds of start share**: reset the score, load the first level of the playlist, start the game.
- **`origin` is where the game came from**: `"title"` (the game's own levels), `"mine"` (a level from My levels), or `"editor"` (a test). `playLevel` sets it, and `toTitle` goes back to it. That is the whole of "the buttons go back where you came from".
- **A level of a person's own is played alone and is not scored for the leaderboard**, which is for the game's levels (`own`). Otherwise a hand-made level of 10 seconds would be at the top of the board.
- **`playAgain` replays whichever it was**, so *Play again* on the result of a custom level plays that level, not the game.
- **A test from the editor comes back to the same draft.** The editor keeps it, so everything you drew, and your undo, is there when you return.

### The screens

Directly **above** the `screens.bind({` line, add:

```js
  // Where the game was started from, which is also where leaving it goes back to: "title" (the game's own levels), "mine" (one of
  // a person's levels, from My levels) or "editor" (a test of the level being edited).
  let origin = "title";

  // My levels, and the editor. Both are screens over the title, and `overlay` says which is up ("mine" or "editor", or null), so
  // the keys that belong to the title (Enter) leave them alone.
  let overlay = null;
  let draft = null; // the level being edited. It is kept while it is tested, so the editor comes back as it was
  let savedIndex = -1; // its place in My levels, or -1 if it hasn't been saved yet
  const mine = new MyLevels();
  const editor = new Editor(document, {
    limits: EDITOR_LIMITS,
    onTest: (levelToTest) => playLevel(levelToTest, "editor"),
    onSave: (levelToKeep) => {
      if (savedIndex >= 0) return mine.replace(savedIndex, levelToKeep);
      savedIndex = mine.add(levelToKeep);
      return savedIndex >= 0;
    },
    onClose: () => openMine(),
  });
  const myScreen = new MyLevelsScreen(document, {
    clipboard: navigator.clipboard,
    onPlay: (index) => playLevel(mine.levels[index], "mine"),
    onEdit: (index) => openEditor(index),
    onNew: () => openEditor(-1),
    onDelete: (index) => {
      mine.remove(index);
      openMine();
    },
    onExport: (index) => myScreen.showText({ label: "Copy this text to keep the level or to send it. It is the same shape as the levels in level.js.", text: levelToText(mine.levels[index]), readOnly: true }),
    onImport: () =>
      myScreen.showText({
        label: "Paste the text of a level here.",
        action: (text) => {
          const added = levelFromText(text);
          const index = added ? mine.add(added) : -1;
          myScreen.setMessage(index >= 0 ? `Added "${added.name}".` : added ? "My levels is full." : "That text is not a level.");
          if (index >= 0) openMine();
        },
      }),
    onBack: () => closeMine(),
  });
  document.body.appendChild(myScreen.root);
  document.body.appendChild(editor.root);

  // What the list shows of a level: its name, how big it is, and how many problems it has. One with an error can't be played.
  const describe = (saved) => {
    const problems = checkLevel(saved);
    const detail = `${saved.rows[0].length} × ${saved.rows.length}${problems.length ? ` · ${problems.length} to fix` : ""}`;
    return { name: saved.name, detail, playable: canPlay(problems) };
  };
  const openMine = () => {
    overlay = "mine";
    editor.hide();
    screens.show(null); // no state has a screen of this name, so the title is hidden too
    myScreen.render(mine.levels.map(describe), EDITOR_LIMITS.maxLevels);
    myScreen.show();
  };
  const closeMine = () => {
    overlay = null;
    myScreen.hide();
    showTitle();
  };
  const openEditor = (index) => {
    savedIndex = index;
    draft = new LevelDraft(index >= 0 ? mine.levels[index] : blankLevel());
    reopenEditor();
  };
  const reopenEditor = () => {
    overlay = "editor";
    myScreen.hide();
    screens.show(null);
    editor.open(draft);
  };
  // A button to stop playing a level of your own, at any moment, and go back to where it came from.
  const leaveButton = document.getElementById("leave-play");
  leaveButton.addEventListener("click", () => {
    leaveButton.blur();
    if (game.playing) game.pause();
    toTitle();
  });
  document.getElementById("mine").addEventListener("click", (event) => {
    event.currentTarget.blur();
    sounds.unlock();
    openMine();
  });
```

Things to notice:

- **`overlay` says which screen is up**, `"mine"` or `"editor"` (or `null`). **Enter** starts a game on the title and the result, and it must not do that while you are typing in a box in the editor, so the key handler checks `overlay`.
- **`screens.show(null)` hides the title** (no game state has a screen called that), and `closeMine` shows it again.
- **The editor's callbacks are lambdas**: `onTest: (levelToTest) => playLevel(...)`. The editor is made *before* `playLevel` is defined to be called, and a lambda looks the name up only when it is called.
- **`describe` is what the list shows**: the name, the size, and how many problems the level has. One with an error can't be played.
- **`navigator.clipboard`** is given to the screen for the **Copy** button, which does nothing where there is none.

Now the line that connects the buttons. Change the `screens.bind({ ... })` line so that **Play again** is `playAgain`:

```js
  screens.bind({ play: startGame, resume: togglePause, again: playAgain, toTitle, sound: toggleSound, pause: togglePause });
```

And the keys. Find the block of key handling that starts with the comment `// The keys.` and **delete the old one** (down to and including the closing `});` of the `keydown` listener), and add this:

```js
  // The keys. (Not while typing a name: the keys of a name are for spelling.)
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.code === "Enter" && !overlay && (game.state === STATES.title || game.state === STATES.over)) {
      playAgain();
      return;
    }
    if (typesText(event)) return;
    if (event.code === "KeyP" || event.code === "Escape") togglePause();
    else if (event.code === "KeyM") toggleSound();
    else if (event.code === "KeyT") toTitle();
    else if (event.code === "KeyR" && game.state === STATES.over) playAgain();
  });
```

Lastly, the **level slider** of the developer panel moves among the game's own levels, so it must do nothing while a custom level is being played. In the `?dev` block, change the `level` row to:

```js
          rows: [control("level", () => levelIndex + 1, (value) => origin === "title" && loadLevel(value - 1), 1, LEVELS.length, 1)],
```

And a button to stop playing a level of your own, whenever you like, directly above the line for `next-level`:

```html
  <button id="leave-play" class="hazard quiet hidden" type="button">Editor</button>
```

Its style is in `mylevels.css` (top left, under the way back to the samples, which is clear of the marble). In `main.js` it is shown by `playLevel` and hidden by `startGame` and `toTitle`, and its click pauses the game and calls `toTitle`, which goes back to the `origin`. Pausing first is needed because `toTitle` only leaves a game that is paused or over.

Open the game. The title has a **My levels** button.

---

## Step 10: Try it

Serve the page and open it.

- [ ] The title has **My levels**, and the game's own **Play** still plays the ten levels, with the leaderboard
- [ ] **My levels** is empty, and says so. **New level** opens the editor with flat floor, a start on the left and a goal on the right, and **No problems**
- [ ] **Paint** with a height drags a line of that height. **Erase** makes holes, the picture shows them dark, and **Fill** drags a box
- [ ] **Fill** with *ramp to* (for example height 2, ramp to 6) drags a **slope**, and dragging the other way slopes the other way
- [ ] The keys **0 to 9** pick a height, **Ctrl+Z** and **Ctrl+Y** undo and redo, and one drag is one undo step
- [ ] **Goal**, **Checkpoint**, **Enemy**, **Slime**, **Piston** and **Platform** place a thing and switch to **Select**. Dragging a thing moves it, and the form on the right changes its numbers
- [ ] Put the **goal on a slope**: the list says *the goal needs flat floor all round it*, with the place ringed. **Flatten floor** fixes it
- [ ] Put a **checkpoint** where nothing can reach it (cut the level in two with holes): it says nothing can reach it. A **platform** across the gap makes the problem go away
- [ ] Set the **time** to 10 on a long level: *too little*
- [ ] **Test** plays the level. **P** pauses, and the button says **Editor**. It comes back to the editor with everything you drew
- [ ] Winning a tested level says **You win!** and the button says **Editor**. It doesn't go on the leaderboard
- [ ] **Save** says *Saved to My levels*. **Exit** goes to the list. **Play** plays it, and its button says **My levels**
- [ ] **Share** shows the text of the level, selected, and **Copy** puts it on the clipboard. **Add from text** with that text adds a copy. Text that isn't a level says so
- [ ] **Delete** asks *Sure?* before it deletes
- [ ] **Reload the page.** The level is still in **My levels**
- [ ] **Enter** typed in a box of the editor does not start a game
- [ ] **Exit** on a level with changes asks *Exit without saving?*
- [ ] While a level of your own is being played, a button at the top left says **Back to editor** (or **Back to My levels**), and stops the level at once
- [ ] On a **phone** the editor is usable (Chrome's device mode): the tools sit above the level in portrait, and beside it in landscape. Playing a level works as usual

**If something's wrong**

- **`ReferenceError: LevelDraft is not defined`, `Editor`, `MyLevels`, `checkLevel`, `EDITOR_LIMITS`, `MyLevelsScreen`:** a script tag is missing from `index.html`. They go in the list at the bottom of `<body>`, above `main.js`.
- **The editor is blank, or has no style:** `css/editor.css` and `css/mylevels.css` must be in **this** sample's `css/` folder, and linked in `index.html`.
- **`Cannot read properties of undefined` as soon as the editor opens:** the `Editor` is made in `main.js` before `limits.js` has run, or `limits.js` is missing.
- **Painting does nothing:** the canvas must get `pointerdown`, `pointermove` and `pointerup`, and `touch-action: none` must be on it.
- **A drag paints only a dotted line:** `applyGesture` must fill in the squares between the last move and this one (`lineCorners`).
- **Undo takes back one square:** `begin()` must be called once, when the mouse goes down, and not on every move.
- **The tests pass but the editor says a built-in level has problems:** `checkLevel` and the old tests disagree. Compare with Step 2.
- **Pressing Enter in the editor starts a game:** the key handler must check `overlay`.
- **Leaving a tested level goes to the title:** `playLevel` must set `origin`, and `toTitle` must read it before it resets it.
- **My levels is empty after a reload:** `localStorage` may be blocked (a private window). The game works, it just can't keep levels.
- **A level can't be played, and the list says why:** an *error* is something the level needs fixing for, and a warning is not.

**Experiments** (change one, reload, then change it back):

- **Change `maxCols` to 80 and `maxRows` to 40** in `limits.js`. The size boxes, the checks and the saving all follow, and every test still passes. Then set `maxHeight` to 5 and watch the palette shrink
- **`maxLevels` of 3**: *New level* switches off after the third
- **Add a tool**: a new row in `EDITOR_TOOLS` and a place for it in `applyGesture` (and for a thing, `placeThing`)
- **Change a `THING_DEFAULTS` number** (`platformSpan`) and place a platform
- **Take a level of the game** with **Share**, make it yours, and compare it with the original

---

## Step 11: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/level.js"></script>
  <script src="js/clock.js"></script>
  <script src="js/zones.js"></script>
  <script src="js/slime.js"></script>
  <script src="js/movers.js"></script>
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/enemies.js"></script>
  <script src="js/score.js"></script>
  <script src="js/profile.js"></script>
  <script src="js/leaderboard.js"></script>
  <script src="js/game.js"></script>
  <script src="js/sounds.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/particles.js"></script>
  <script src="js/shake.js"></script>
  <script src="js/devpanel.js"></script>
  <script src="js/limits.js"></script>
  <script src="js/check.js"></script>
  <script src="js/things.js"></script>
  <script src="js/draft.js"></script>
  <script src="js/mylevels.js"></script>
  <script src="js/gestures.js"></script>
  <script src="js/editor.js"></script>
  <script src="js/myscreen.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/tilt.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/level.tests.js"></script>
  <script src="tests/clock.tests.js"></script>
  <script src="tests/zones.tests.js"></script>
  <script src="tests/slime.tests.js"></script>
  <script src="tests/movers.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/enemies.tests.js"></script>
  <script src="tests/score.tests.js"></script>
  <script src="tests/profile.tests.js"></script>
  <script src="tests/leaderboard.tests.js"></script>
  <script src="tests/game.tests.js"></script>
  <script src="tests/sounds.tests.js"></script>
  <script src="tests/screens.tests.js"></script>
  <script src="tests/particles.tests.js"></script>
  <script src="tests/shake.tests.js"></script>
  <script src="tests/devpanel.tests.js"></script>
  <script src="tests/limits.tests.js"></script>
  <script src="tests/check.tests.js"></script>
  <script src="tests/things.tests.js"></script>
  <script src="tests/draft.tests.js"></script>
  <script src="tests/mylevels.tests.js"></script>
  <script src="tests/gestures.tests.js"></script>
  <script src="tests/fakedom.js"></script>
  <script src="tests/myscreen.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/tilt.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **767 passing tests**: the 592 you started with, plus 14 for the limits, 29 for the checks, 29 for the things, 39 for the draft, 26 for My levels, 19 for the gestures, 18 for the screen, and one for `setLeave`.

> **What these tests don't cover.** The editor screen itself (`editor.js`): the drawing, the layout, the feel of the mouse. All of the *editing* is tested, because all of it is in the draft and in `applyGesture`, and the screen only draws and calls them. That is the point of keeping the screen thin. What it looks like is checked by using it, in Step 10.

> **Try breaking something.** In `limits.js`, set `maxCols` to 20. The test *"the ten levels of the game fit inside the limits"* fails and names the level that is wider, and so does *"a level of the game comes out exactly as it went in"*, since a level of 30 corners would be cut. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Every limit in one place | `EDITOR_LIMITS`, and every function taking `limits` |
| Rules as code, shared by tests and editor | `checkLevel`, `reachableCorners` |
| Errors and warnings | `severity`, `canPlay` |
| A thing pointed to by a ref | `{ kind, index }`, `thingOf` |
| A form built from a table | `thingFields`, `getField`, `setField` |
| A model with no page in it | `LevelDraft` |
| Undo as snapshots | `begin`, `undo`, `redo` |
| A ramp as a fill | `fill(..., from, to)` |
| Never trusting data from outside | `cleanLevel` |
| Text that is also code | `levelToText`, `levelFromText` |
| Editing as plain functions | `applyGesture` |
| A thin screen over a model | `Editor`, `MyLevelsScreen` |
| Testing a screen with a fake page | `FakeElement`, `fakeDocument` |
| A mode that remembers where you came from | `origin`, `playLevel`, `toTitle` |
| A new part of the page is a new file | `editor.css`, `mylevels.css` |

## Challenges

1. **Autosave.** Keep the draft in `localStorage` as you edit, so a closed tab doesn't lose work. (Hint: `cloneLevel`, `writeJson`, and the draft's `changed`.)
2. **Use the checker in the old tests.** Change the zones test and the movers test to use `checkLevel` instead of their own copies of the rules. (Hint: filter the problems by message, or by kind, and decide whether you still want two sets.)
3. **Copy and paste a box.** Select a box of floor and paste it somewhere else. (Hint: a new tool, and a `paste(col, row, rows)` on the draft that uses `setDigit`.)
4. **Mirror.** A button that mirrors the level left to right, including the things. (Hint: reverse each row, and `col` becomes `cols - 1 - col`.)
5. **Auto-ramp.** A button that smooths every step of more than one digit into a ramp. (Hint: the checker already knows what a step is: `REACH_STEP`.)
6. **A share link.** Put a level in the address (`#level=...`), and open it in the editor. (Hint: `levelToText`, `btoa`, and the check on `cleanLevel`.)
7. **A time suggestion.** A button that sets the time from the length of the shortest way to the goal. (Hint: the flood fill in `reachableCorners` could count steps.)

---

*That's the end of the Rolling Rampage series, and a game you can add to. You can make levels, play them, keep them and send them to someone else. The same pattern (a model with no page in it, a thin screen on top, one place for the limits, and a checker everybody shares) is worth taking to every editor you make.*
