# Tutorial: Tower Defense Benders -- A Podium, a Bender, and Something to Shoot

This is the third tutorial in the Tower Defense series. The board has a road and enemies on it; this step gives it **defenders**. A tower is a **podium** with a **bender** standing on it, one for each of the four nations: air, water, earth and fire. It plays an idle while it waits, turns to face the enemy it has chosen, plays an attack, and at the moment its hand is out it throws a bolt that flies to the enemy. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Targeting**: which enemy a tower shoots at (the one furthest along, the one least far along, or the nearest), worked out from plain numbers
- **Placement**: one function that says whether a tower can go in a cell, and *why not* if it can't
- **Benders**: a table of the four nations (range, cooldown, idles, attack), models loaded and measured, and **animations whose hips are held still**, so that a spin jump that travels two metres stays on its podium
- A **brain** for a tower: turning, a cooldown, and an attack that is a start, a fire and an end, as events, with no models in it at all
- A **tower** that builds a podium and a bender, plays the idle or the attack the brain asks for (fading from one clip into the next), turns to face the target, and knows where its hand is
- **Bolts**: a glowing ball that flies at the enemy and follows it
- A game where four towers beside the road shoot at the enemies that walk it
- Unit tests for all of it: **369 passing tests**, 132 of them new, including tests that **play the real animations** and measure where the hand is

**What you'll learn:** how to choose a target from a list with a score, how to turn a state machine into events instead of callbacks, the shortest way round a circle (angles that wrap), what *root motion* is and how to take it out of an animation by editing its keys, how to measure a real animation in a test (stepping a clip to a frame and asking where a bone is), how to fade one animation into another, how to find where a hand is in the world from numbers measured in the model's own units, and how to test a whole tower without a screen or a clock.

**Before you start:** do the [Path tutorial](../tower_defense_path/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Path sample, plus placeholders for the new files and their tests:

```
tower_defense_benders/
├── index.html, tests.html   (already list the new scripts)
├── css/                      (everything from the Path sample)
├── js/
│   ├── targeting.js          (placeholder -- Step 1)
│   ├── placement.js          (placeholder -- Step 2)
│   ├── benders.js            (placeholder -- Step 3)
│   ├── brain.js              (placeholder -- Step 4)
│   ├── tower.js              (placeholder -- Step 5)
│   ├── bolts.js              (placeholder -- Step 6)
│   ├── enemies.js            (additions -- Step 1)
│   ├── main.js               (changes -- Step 7)
│   └── everything else, from the Path sample
└── tests/
    ├── targeting.tests.js, placement.tests.js, benders.tests.js, brain.tests.js, tower.tests.js, bolts.tests.js   (placeholders)
    ├── enemies.tests.js      (an addition -- Step 1)
    └── everything else, from the Path sample
```

Open `tests.html` before you change anything, through the web server. You should see **237 passing tests**, the Path sample's.

### The models

The podiums and the benders are already in `assets/podiums/` and `assets/benders/`. Each bender has the animations of the clips it can play: `Walking`, `Running`, an **idle** or two, and a handful of **attacks**. The [assets README](../assets/README.md) has the table. Two things about them matter for this tutorial:

- **Many attacks move the character a long way.** The hips of the spin jump travel more than two metres, and a flying kick a metre and a half. (That is *root motion*: the animation moves the character, as well as posing it, because it was made for a character that runs about.) A tower stays where it is built, so this tutorial holds the hips still.
- **The podiums are different heights.** The fire podium is low and the water one is tall. A bender has to stand on the *top* of whichever it is on.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_benders/` (the command prints the exact address), or use the *Live Server* extension in VS Code. `?map=1` is the second map.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Targeting**: who to shoot.
2. **Placement**: where a tower can go.
3. **The benders**: the table, and the hips.
4. **The brain**: turning, waiting and attacking.
5. **The tower**: models that do what the brain says.
6. **Bolts.**
7. **The game.**

---

## Step 1: Targeting

A tower looks at the enemies and says which to shoot. Choosing is arithmetic, so it needs no models: an *enemy*, to this file, is anything with an `x`, a `z`, a `progress` (how far along the road it is, from 0 to 1) and a `done` (whether it has got to the end). Anything with those four will do, which means a test can make an enemy in a line of code.

The real enemies need to say those four things first. Two small additions to `enemies.js`. The enemy remembers how tall it is:

In `js/enemies.js`, after line 49, add:

```js
    this.height = spec.height;
```

And it has four *getters*: things that look like fields and are worked out when you ask. A tower aims at the middle of an enemy, which is about sixty percent of the way up:

In `js/enemies.js`, after line 83, add:

```js
  // Where it is on the ground, how far along the road it is, and how high the middle of it is: what a
  // tower needs to know to aim at it.
  get x() {
    return this.node.position.x;
  }

  get z() {
    return this.node.position.z;
  }

  get progress() {
    return this.walker.progress;
  }

  get aimHeight() {
    return this.height * 0.6;
  }

```

(`done` was already one.) And their test, at the end of `tests/enemies.tests.js`, above the closing `});` of the last module:

In `tests/enemies.tests.js`, after line 170, add:

```js

  QUnit.test("an enemy says where it is, how far along the road, and how high its middle is, for a tower to aim at", (assert) => {
    const enemy = new Enemy(scene, loaded, "heavy", route, "aim");
    enemy.update(3);

    assert.strictEqual(enemy.x, enemy.node.position.x);
    assert.strictEqual(enemy.z, enemy.node.position.z);
    assert.strictEqual(enemy.progress, enemy.walker.progress);
    assert.true(enemy.progress > 0 && enemy.progress < 1);
    assert.true(Math.abs(enemy.aimHeight - ENEMIES.heavy.height * 0.6) < 1e-9);
    assert.true(enemy.aimHeight > 0 && enemy.aimHeight < enemy.height);
    enemy.dispose();
  });
```

Now the targeting itself. Open the placeholder `js/targeting.js` and replace its contents with:

```js
// Targeting: which enemy a tower shoots at. A tower is given the enemies that there are and the way it
// likes to choose, and it says which one. Nothing here knows about models or the scene: an enemy is
// anything with an `x`, a `z`, a `progress` (how far along the road it is, from 0 to 1) and a `done`
// (whether it has got to the end), so that a test can make them with a line each. See ../tests/targeting.tests.js.

// How far apart two places are on the ground.
function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

// Whether `to` is as near as `range` to `from`.
function inRange(from, to, range) {
  return distanceBetween(from, to) <= range;
}

// The ways to choose. Each is a score, and the enemy with the highest score is the one that is shot.
// `first` is the one furthest along the road (the one that has nearly got there), `last` the one least
// far along, and `closest` the one nearest to the tower.
const TARGET_MODES = {
  first: (enemy) => enemy.progress,
  last: (enemy) => -enemy.progress,
  closest: (enemy, from) => -distanceBetween(from, enemy),
};

// The enemy in range with the highest score, or null if there is none. An enemy that has got to the
// end is not a target. If two have the same score, the one that comes first in the list is.
function pickTarget(from, range, enemies, mode = "first") {
  const score = TARGET_MODES[mode];
  let best = null;
  let bestScore = -Infinity;
  for (const enemy of enemies) {
    if (enemy.done || !inRange(from, enemy, range)) continue;
    const s = score(enemy, from);
    if (s > bestScore) {
      best = enemy;
      bestScore = s;
    }
  }
  return best;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { distanceBetween, inRange, TARGET_MODES, pickTarget };
} else {
  Object.assign(window, { distanceBetween, inRange, TARGET_MODES, pickTarget });
}
```

Things to notice:

- **`distanceBetween` uses only `x` and `z`.** A tower and an enemy are different heights, and the height has nothing to do with whether one is in range of the other.
- **`TARGET_MODES` is a table of scoring functions,** and **the enemy with the highest score is the one shot**. `first` scores an enemy by how far along the road it is (so the one that has nearly got there, which is the one that matters most, wins), `last` by the opposite, and `closest` by minus its distance. Adding a way to choose is adding a row. A later tutorial adds `strongest`, which needs enemies to have health.
- **A function in a table takes `(enemy, from)`** so that each can use what it needs: `first` ignores `from`, and `closest` uses it.
- **`pickTarget` goes through the list once,** keeping the best so far. `>` and not `>=` is what makes a tie go to the one that comes first in the list: the first to reach a score keeps it.
- **An enemy that is `done` is skipped,** since it has already got to the end and shooting it is shooting nobody.

Open the placeholder `tests/targeting.tests.js` and replace its contents with:

```js
// An enemy, as a tower sees one.
const foe = (x, z, progress = 0, done = false) => ({ x, z, progress, done });

QUnit.module("distanceBetween and inRange", () => {
  QUnit.test("is how far apart two places are on the ground, along the straight line", (assert) => {
    assert.strictEqual(distanceBetween({ x: 0, z: 0 }, { x: 3, z: 4 }), 5);
    assert.strictEqual(distanceBetween({ x: -1, z: -1 }, { x: -1, z: 2 }), 3);
  });

  QUnit.test("does not care which way round, or how high things are", (assert) => {
    assert.strictEqual(distanceBetween({ x: 1, z: 2 }, { x: 4, z: 6 }), distanceBetween({ x: 4, z: 6 }, { x: 1, z: 2 }));
    assert.strictEqual(distanceBetween({ x: 0, z: 0, y: 9 }, { x: 3, z: 4, y: -9 }), 5);
  });

  QUnit.test("something exactly as far as the range is in range", (assert) => {
    assert.true(inRange({ x: 0, z: 0 }, { x: 3, z: 4 }, 5));
  });

  QUnit.test("something a little further is not", (assert) => {
    assert.false(inRange({ x: 0, z: 0 }, { x: 3, z: 4.01 }, 5));
  });

  QUnit.test("something in the same place is in range of any range, even none", (assert) => {
    assert.true(inRange({ x: 2, z: 2 }, { x: 2, z: 2 }, 0));
  });
});

QUnit.module("pickTarget", () => {
  const tower = { x: 0, z: 0 };

  QUnit.test("with nobody about, it is nobody", (assert) => {
    assert.strictEqual(pickTarget(tower, 5, []), null);
  });

  QUnit.test("nobody in range is nobody", (assert) => {
    assert.strictEqual(pickTarget(tower, 5, [foe(6, 0), foe(0, -9)]), null);
  });

  QUnit.test("`first` is the one furthest along the road, wherever it is in range", (assert) => {
    const far = foe(4, 0, 0.9);
    const near = foe(1, 0, 0.2);

    assert.strictEqual(pickTarget(tower, 5, [near, far], "first"), far);
    assert.strictEqual(pickTarget(tower, 5, [far, near], "first"), far);
  });

  QUnit.test("`first` is the default", (assert) => {
    const ahead = foe(4, 0, 0.9);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.2), ahead]), ahead);
  });

  QUnit.test("`last` is the one that has come the least way", (assert) => {
    const behind = foe(4, 0, 0.1);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.5), behind, foe(2, 0, 0.8)], "last"), behind);
  });

  QUnit.test("`closest` is the one nearest to the tower, and not the one furthest along", (assert) => {
    const near = foe(1, 1, 0.1);

    assert.strictEqual(pickTarget(tower, 5, [foe(4, 0, 0.9), near, foe(0, 3, 0.5)], "closest"), near);
  });

  QUnit.test("an enemy out of range is not picked, however far along it is", (assert) => {
    const inside = foe(2, 0, 0.1);

    assert.strictEqual(pickTarget(tower, 5, [foe(9, 0, 0.99), inside], "first"), inside);
  });

  QUnit.test("an enemy that has got to the end is not picked", (assert) => {
    const walking = foe(2, 0, 0.5);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 1, true), walking]), walking);
    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 1, true)]), null);
  });

  QUnit.test("a tie goes to the one that is first in the list", (assert) => {
    const a = foe(1, 0, 0.5);
    const b = foe(-1, 0, 0.5);

    assert.strictEqual(pickTarget(tower, 5, [a, b], "first"), a);
    assert.strictEqual(pickTarget(tower, 5, [b, a], "first"), b);
  });

  QUnit.test("a bigger range sees more", (assert) => {
    const enemies = [foe(3, 0, 0.1), foe(7, 0, 0.9)];

    assert.strictEqual(pickTarget(tower, 4, enemies), enemies[0]);
    assert.strictEqual(pickTarget(tower, 8, enemies), enemies[1]);
  });

  QUnit.test("it does not change the list it is given", (assert) => {
    const enemies = [foe(1, 0, 0.5), foe(2, 0, 0.6)];
    pickTarget(tower, 5, enemies, "last");

    assert.deepEqual(enemies.map((e) => e.progress), [0.5, 0.6]);
  });
});

QUnit.module("TARGET_MODES", () => {
  QUnit.test("there are three ways to choose, and each is a function of an enemy", (assert) => {
    assert.deepEqual(Object.keys(TARGET_MODES), ["first", "last", "closest"]);
    for (const score of Object.values(TARGET_MODES)) assert.strictEqual(typeof score(foe(1, 1, 0.5), { x: 0, z: 0 }), "number");
  });

  QUnit.test("`first` and `last` are opposites", (assert) => {
    const e = foe(0, 0, 0.3);

    assert.strictEqual(TARGET_MODES.first(e), -TARGET_MODES.last(e));
  });
});
```

- **`foe` makes an enemy in one line,** which is the whole reason the targeting takes plain numbers.
- **"A tie goes to the one that is first in the list"** says it both ways round, because a test that put the winner first only would pass with `>=` too.
- **"It does not change the list it is given"** is easy to forget and awful to debug: a function that sorts its argument in place would pass every other test.

**Check:** open `tests.html`. 256 tests pass.

---

## Step 2: Placement

Before a tower can be built, the game has to know where it can be. The rule is one function: a tower can go on a cell that is on the board, is grass, and has no tower in it. It gives back **why not**, as a sentence, because the next tutorial shows that sentence to the player as they drag a podium over the board.

Open the placeholder `js/placement.js` and replace its contents with:

```js
// Placement: where a tower may be put. The rule is one function, and says *why* when the answer is no,
// so that whatever asks (the next tutorial asks as a finger drags a podium over the board) can show
// the reason. See ../tests/placement.tests.js.

// Whether a tower can stand in a cell: on the board, on grass, and with nothing in it already. `taken`
// is a list of the cells that have a tower. The answer is { ok, reason }, and reason is a sentence.
function canBuild(grid, col, row, taken = []) {
  if (!Number.isInteger(col) || !Number.isInteger(row) || col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) {
    return { ok: false, reason: "that is not on the board" };
  }
  if (isRoad(grid, col, row)) return { ok: false, reason: "that is road" };
  if (taken.some((cell) => cell.col === col && cell.row === row)) return { ok: false, reason: "there is a tower there already" };
  return { ok: true, reason: "" };
}

// Every cell where a tower could be built, row by row.
function buildableCells(grid, taken = []) {
  const cells = [];
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      if (canBuild(grid, col, row, taken).ok) cells.push({ col, row });
    }
  }
  return cells;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { canBuild, buildableCells };
} else {
  Object.assign(window, { canBuild, buildableCells });
}
```

- **`{ ok, reason }` is the answer,** and not just `true` or `false`. Whatever asks can show the reason, and a test can check that each of the three ways to say no is a different one.
- **`Number.isInteger` rejects `1.5`, `NaN` and `"1"`** in one go (a string is not an integer), so the bounds check can't be fooled by a number that is not a column.
- **`taken` is a list of the cells that have towers in them,** and it is an argument, not something the function remembers: a function that answers from what it is given is a function that can be tested.
- **`buildableCells` is the same rule over the whole board:** every cell where the answer would be yes. The next tutorial uses it to show where a podium can be dropped.

Open the placeholder `tests/placement.tests.js` and replace its contents with:

```js
QUnit.module("canBuild", () => {
  const grid = parseMap({ name: "test", rows: ["S##..", "..#..", "..#.G", "..###"] });

  QUnit.test("grass can be built on", (assert) => {
    assert.deepEqual(canBuild(grid, 0, 1), { ok: true, reason: "" });
    assert.true(canBuild(grid, 4, 0).ok);
  });

  QUnit.test("road cannot, and says so", (assert) => {
    assert.deepEqual(canBuild(grid, 2, 1), { ok: false, reason: "that is road" });
  });

  QUnit.test("the start and the goal are road, so they cannot either", (assert) => {
    assert.false(canBuild(grid, 0, 0).ok);
    assert.false(canBuild(grid, 4, 2).ok);
  });

  QUnit.test("a place off the board cannot, in any direction", (assert) => {
    for (const [col, row] of [[-1, 0], [0, -1], [5, 0], [0, 4], [99, 99]]) {
      assert.deepEqual(canBuild(grid, col, row), { ok: false, reason: "that is not on the board" }, `${col},${row}`);
    }
  });

  QUnit.test("half a cell is not a cell, and nor is a word", (assert) => {
    assert.false(canBuild(grid, 1.5, 1).ok);
    assert.false(canBuild(grid, NaN, 1).ok);
    assert.false(canBuild(grid, "1", 1).ok);
  });

  QUnit.test("a cell that has a tower in it cannot have another", (assert) => {
    const taken = [{ col: 0, row: 1 }];

    assert.deepEqual(canBuild(grid, 0, 1, taken), { ok: false, reason: "there is a tower there already" });
    assert.true(canBuild(grid, 1, 1, taken).ok, "the next cell is still free");
  });

  QUnit.test("the reasons are sentences, and each is different", (assert) => {
    const reasons = [canBuild(grid, 2, 1).reason, canBuild(grid, 9, 9).reason, canBuild(grid, 0, 1, [{ col: 0, row: 1 }]).reason];

    assert.strictEqual(new Set(reasons).size, 3);
    assert.true(reasons.every((reason) => reason.length > 10));
  });

  QUnit.test("it does not change the list of towers it is given", (assert) => {
    const taken = [{ col: 0, row: 1 }];
    canBuild(grid, 1, 1, taken);

    assert.deepEqual(taken, [{ col: 0, row: 1 }]);
  });
});

QUnit.module("buildableCells", () => {
  QUnit.test("on a real map, every cell that is not road, and only those", (assert) => {
    for (const map of MAPS) {
      const grid = parseMap(map);
      const roads = grid.cells.flat().filter((cell) => cell === "road").length;
      const cells = buildableCells(grid);

      assert.strictEqual(cells.length, grid.cols * grid.rows - roads, map.name);
      assert.true(cells.every(({ col, row }) => !isRoad(grid, col, row)), map.name);
    }
  });

  QUnit.test("there is room: more grass than road, on every map", (assert) => {
    for (const map of MAPS) assert.true(buildableCells(parseMap(map)).length > 60, map.name);
  });

  QUnit.test("a cell with a tower is left out", (assert) => {
    const grid = parseMap(MAPS[0]);
    const all = buildableCells(grid).length;
    const some = buildableCells(grid, [{ col: 0, row: 0 }, { col: 5, row: 2 }]);

    assert.strictEqual(some.length, all - 2, "both are grass on the first map");
    assert.false(some.some((c) => c.col === 5 && c.row === 2));
  });

  QUnit.test("the cells go row by row", (assert) => {
    const cells = buildableCells(parseMap({ name: "test", rows: ["S#G", "..."] }));

    assert.deepEqual(cells, [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }]);
  });
});
```

- **The map in the tests has a start and a goal in it,** and one test says that **they** can't be built on either: a start and a goal are road.
- **"On a real map, every cell that is not road, and only those"** checks `buildableCells` against a count made another way (all cells less the road cells). Two ways to get the same number, written differently, is how a test catches a mistake in one of them.

**Check:** open `tests.html`. 268 tests pass.

---

## Step 3: The benders

Now the benders themselves: a table of who they are, and the loading. This is the file where the real work on the animations is. The first part is the **table**.

Open the placeholder `js/benders.js` and replace its contents with:

```js
// The benders: who they are (a table), and loading their podiums and models. A bender is an animated
// character that stands on a podium and plays one of its idles, or its attack. Many of the animations
// move the character a long way (a spin jump travels two metres), and a tower stays where it is built,
// so the first job of loading a bender is to hold its hips still. See ../tests/benders.tests.js.

// How big a tower is built: the podium is made this wide (a cell is two), and the bender this tall.
const TOWER = {
  podiumWidth: 1.5,
  benderHeight: 1.3,
};

// The benders, one row each. `podium` and `file` are the models. `color` is the color of what they
// throw. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
// start of one attack to the start of the next. `idles` are the clips played while there is nothing to do.
//
// `attack` describes the clip played to shoot, and all but the first two numbers were *measured* on the
// real clip (see the tests, which measure them again): `seconds` is how long it is, `speed` how much faster
// than that it is played, `hitAt` how far through it (from 0 to 1) the hand is out furthest, `aim` which
// way the attack points (in radians, 0 is straight ahead), and `muzzle` where the hand is at that moment, in
// meters from the bender's feet, for a bender that is not scaled.
const BENDERS = {
  air: {
    name: "Air Nomad",
    podium: "podiums/air.glb",
    file: "benders/air.glb",
    color: "#e8f4ff",
    range: 6,
    cooldown: 1.6,
    idles: ["Idle_9", "Idle_02"],
    attack: { clip: "mage_soell_cast_3", seconds: 3.333, speed: 2.2, hitAt: 0.3, aim: -0.06, muzzle: { x: -0.04, y: 1.03, z: 0.61 } },
  },
  water: {
    name: "Water Tribe",
    podium: "podiums/water.glb",
    file: "benders/water.glb",
    color: "#38b6ff",
    range: 5,
    cooldown: 1.8,
    idles: ["Idle_3"],
    attack: { clip: "mage_soell_cast_4", seconds: 2.2, speed: 1.6, hitAt: 0.108, aim: -0.07, muzzle: { x: -0.04, y: 1.16, z: 0.55 } },
  },
  earth: {
    name: "Earth Kingdom",
    podium: "podiums/earth.glb",
    file: "benders/earth.glb",
    color: "#b08a4a",
    range: 4,
    cooldown: 2.2,
    idles: ["Idle_10"],
    attack: { clip: "Left_Jab_from_Guard", seconds: 1.733, speed: 1.3, hitAt: 0.308, aim: 0.27, muzzle: { x: 0.17, y: 1.31, z: 0.85 } },
  },
  fire: {
    name: "Fire Nation",
    podium: "podiums/fire.glb",
    file: "benders/fire.glb",
    color: "#f0701a",
    range: 4.5,
    cooldown: 1.5,
    idles: ["Idle_11"],
    attack: { clip: "Punch_Combo_5", seconds: 3.833, speed: 2.6, hitAt: 0.208, aim: -0.11, muzzle: { x: -0.08, y: 1.26, z: 0.67 } },
  },
};

// The name of the hips in every one of these skeletons, and the clips that are for walking and
// running, which a tower never plays and are left as they are.
const HIPS = "mixamorig:Hips";
const LOCOMOTION = ["Walking", "Running"];

// The place the hips are held at: where they are, along and across the ground, in the first frame of a
// clip. (The numbers in an animation of a skeleton are in centimeters, and "home" is in those.)
function hipsTrack(group) {
  return group.targetedAnimations.find((t) => t.target.name === HIPS && t.animation.targetProperty === "position");
}
function hipsHome(group) {
  const { x, z } = hipsTrack(group).animation.getKeys()[0].value;
  return { x, z };
}

// Holds the hips of a clip at `home`: every key of their position keeps its height (the character still
// crouches, and jumps) but is moved to the same place along and across the ground. The arms, the legs and the
// spine still do everything the clip says; only the walking away is taken out. Returns whether there was a track to hold.
function holdHips(group, home) {
  const track = hipsTrack(group);
  if (!track) return false;
  const keys = track.animation.getKeys();
  keys.forEach((key) => {
    key.value = new BABYLON.Vector3(home.x, key.value.y, home.z);
  });
  track.animation.setKeys(keys);
  return true;
}

// Loads the podium and the bender of every kind, holds the hips of all their clips, and works out how
// each is scaled, lifted and shifted: the podium stands on the ground and is centered on the cell, and
// the bender's feet are on the podium's top.
async function loadBenders(scene, benders = BENDERS) {
  const kinds = Object.keys(benders);
  const podiums = await Promise.all(kinds.map((kind) => loadModel(scene, benders[kind].podium)));
  const characters = await Promise.all(kinds.map((kind) => loadModel(scene, benders[kind].file)));
  const loaded = {};
  kinds.forEach((kind, i) => {
    const podiumBounds = measure(podiums[i].rootNodes[0]);
    const podiumScale = fitScale(sizeOf(podiumBounds), TOWER.podiumWidth);
    const benderBounds = measure(characters[i].rootNodes[0]);
    const benderScale = heightScale(sizeOf(benderBounds), TOWER.benderHeight);

    const home = hipsHome(characters[i].animationGroups.find((group) => group.name === benders[kind].idles[0]));
    for (const group of characters[i].animationGroups) {
      if (!LOCOMOTION.includes(group.name)) holdHips(group, home);
    }

    loaded[kind] = {
      podium: {
        container: podiums[i],
        scale: podiumScale,
        lift: bottomOffset(podiumBounds, podiumScale),
        shift: centerOffset(podiumBounds, podiumScale),
        top: sizeOf(podiumBounds).y * podiumScale, // how high the podium is, which is how high the bender stands
      },
      bender: { container: characters[i], scale: benderScale, lift: bottomOffset(benderBounds, benderScale) },
    };
  });
  return loaded;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOWER, BENDERS, HIPS, LOCOMOTION, hipsTrack, hipsHome, holdHips, loadBenders };
} else {
  Object.assign(window, { TOWER, BENDERS, HIPS, LOCOMOTION, hipsTrack, hipsHome, holdHips, loadBenders });
}
```

Things to notice:

- **`TOWER` says how big a tower is built,** in world units: a podium that is 1.5 wide (a cell is 2) with a bender 1.3 tall on it. Change these two numbers and every tower changes.
- **`BENDERS` is the table of the four nations.** The name, the models, the color of what they throw, how far they can shoot, and the **cooldown**: how many seconds from the start of one attack to the start of the next. Air shoots furthest and earth least; the colors are the nations' (the air nomad's is white, the water tribe's blue).
- **An `attack` is a row of numbers about a clip.** `clip` is which of the model's animations, and `seconds` its length. The clips are *long* (three seconds for the air nomad's spell) and an attack that takes three seconds is too slow to watch, so `speed` plays it faster: 2.2 is more than twice as fast, and 3.3 seconds becomes about a second and a half.
- **`hitAt` is the moment the hand is out furthest,** as a share of the clip from 0 to 1. A bender throws something when his hand is out, and not at the start of the swing; so the *fire* has to happen then. `muzzle` is where the hand is at that moment, in meters, measured from the bender's feet on a bender who isn't scaled; and `aim` is which way the attack points: 0 is straight ahead, and the earth bender's jab points 0.27 of a radian (15 degrees) off, so the tower has to turn that much less to hit what it shoots at.
- **These numbers were measured on the real clips,** not guessed. The tests at the bottom of this step measure them again, which is the point of having them: if you change the clip, the test says the numbers are out of date.
- **The idles:** a list, because a bender can have more than one. The air nomad has two and changes between them now and then.

Next, **holding the hips**:

- **`hipsTrack` finds the part of an animation that moves the hips.** An animation is a list of *tracks*, each one moving one property of one node, and the track for the hips moving is the one whose target is called `mixamorig:Hips` and whose property is `position`. (`mixamorig` is the name of the company whose skeleton these are made on.)
- **`hipsHome` is where the hips are in the first frame of a clip.** The numbers in the animation are in **centimeters**: the skeleton is inside a node that is scaled by 0.01 to make meters.
- **`holdHips` rewrites the keys.** A *key* is a frame number and a value. Every key of the position gets the **same x and z** (the home place) and **keeps its own y**. So the bender still crouches and jumps (that's the height) and swings his arms and his legs (those are other tracks), but his hips no longer travel along or across the ground. The spin jump becomes a spin jump on the spot.
- **It changes the clip once, in the container,** and not on each tower's copy. Every copy of the animation that is made from the container is made from the changed one. (A model with a skeleton makes a copy of its animations for each tower, as the enemies did.)
- **It holds every clip but walking and running,** which a tower never plays, and which are left as they came. All of the clips are held at the *same* home place, the one from the first idle, so that when a tower goes from its idle to its attack the hips don't jump.

Last, **`loadBenders`:** it loads the podium and the bender of every nation, holds the hips of their clips, and works out how to scale and lift each. The podium is scaled to a width (it's a thing that fits in a cell), the bender to a height (it's a person), and the podium's `top` is how high it stands, which is how high the bender's feet are.

Open the placeholder `tests/benders.tests.js` and replace its contents with:

```js
QUnit.module("the BENDERS table", () => {
  QUnit.test("there are four, one for each nation", (assert) => {
    assert.deepEqual(Object.keys(BENDERS).sort(), ["air", "earth", "fire", "water"]);
  });

  QUnit.test("every bender has a name, two models, a color, a range, a cooldown, an idle and an attack", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      assert.true(spec.name.length > 0, kind);
      assert.true(spec.podium.endsWith(".glb") && spec.file.endsWith(".glb"), kind);
      assert.true(/^#[0-9a-f]{6}$/i.test(spec.color), kind);
      assert.true(spec.range > 0 && spec.cooldown > 0, kind);
      assert.true(spec.idles.length >= 1, kind);
      assert.true(spec.attack.clip.length > 0 && spec.attack.seconds > 0 && spec.attack.speed > 0, kind);
      assert.true(spec.attack.hitAt > 0 && spec.attack.hitAt < 1, kind);
    }
  });

  QUnit.test("the four colors are different", (assert) => {
    assert.strictEqual(new Set(Object.values(BENDERS).map((spec) => spec.color)).size, 4);
  });

  QUnit.test("a tower can shoot further than it is wide, and never across the whole board", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      assert.true(spec.range > BOARD.cell, kind);
      assert.true(spec.range < (BOARD.cols * BOARD.cell) / 2, kind);
    }
  });

  QUnit.test("the air bender, who has the longest reach, shoots the furthest, and the earth bender, whose attack is a punch, the least", (assert) => {
    const ranges = Object.values(BENDERS).map((spec) => spec.range);

    assert.strictEqual(BENDERS.air.range, Math.max(...ranges));
    assert.strictEqual(BENDERS.earth.range, Math.min(...ranges));
  });

  QUnit.test("a tower with its bender on it fits under the roof of the view", (assert) => {
    assert.true(TOWER.benderHeight + TOWER.podiumWidth < BOARD.headroom, "(a podium is no taller than it is wide)");
  });

  QUnit.test("a podium fits in its cell, with room beside it", (assert) => {
    assert.true(TOWER.podiumWidth < BOARD.cell);
  });
});

QUnit.module("holdHips", () => {
  // A group of one track: the hips, with three keys.
  const fakeGroup = (name = HIPS) => {
    const keys = [0, 1, 2].map((i) => ({ frame: i, value: new BABYLON.Vector3(10 + i, 90 + i, 5 - i) }));
    let stored = keys;
    return {
      targetedAnimations: [{ target: { name }, animation: { targetProperty: "position", getKeys: () => stored, setKeys: (k) => (stored = k) } }],
      keys: () => stored,
    };
  };

  QUnit.test("every key is moved to the home place, along and across the ground", (assert) => {
    const group = fakeGroup();
    holdHips(group, { x: 3, z: 7 });

    group.keys().forEach((key) => {
      assert.strictEqual(key.value.x, 3);
      assert.strictEqual(key.value.z, 7);
    });
  });

  QUnit.test("but not the height: a bender still crouches and jumps", (assert) => {
    const group = fakeGroup();
    holdHips(group, { x: 3, z: 7 });

    assert.deepEqual(group.keys().map((key) => key.value.y), [90, 91, 92]);
  });

  QUnit.test("the keys keep their frames", (assert) => {
    const group = fakeGroup();
    holdHips(group, { x: 0, z: 0 });

    assert.deepEqual(group.keys().map((key) => key.frame), [0, 1, 2]);
  });

  QUnit.test("it says it held them", (assert) => {
    assert.true(holdHips(fakeGroup(), { x: 0, z: 0 }));
  });

  QUnit.test("a clip with nothing for the hips is left alone, and it says so", (assert) => {
    const group = fakeGroup("something else");

    assert.false(holdHips(group, { x: 0, z: 0 }));
    assert.strictEqual(group.keys()[0].value.x, 10);
  });

  QUnit.test("hipsHome is where the hips are in the first frame", (assert) => {
    assert.deepEqual(hipsHome(fakeGroup()), { x: 10, z: 5 });
  });
});

QUnit.module("loading benders", (hooks) => {
  let engine, scene, loaded, fresh;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadBenders(scene);
    fresh = {};
    for (const [kind, spec] of Object.entries(BENDERS)) fresh[kind] = await loadModel(scene, spec.file);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const group = (container, name) => container.animationGroups.find((g) => g.name === name);

  QUnit.test("every bender loads, with every clip the table names", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      for (const clip of [...spec.idles, spec.attack.clip]) assert.true(!!group(loaded[kind].bender.container, clip), `${kind} has ${clip}`);
    }
  });

  QUnit.test("an attack is as long as the table says it is", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const clip = group(loaded[kind].bender.container, spec.attack.clip);

      assert.true(Math.abs((clip.to - clip.from) / 60 - spec.attack.seconds) < 0.02, `${kind}: ${((clip.to - clip.from) / 60).toFixed(3)} against ${spec.attack.seconds}`);
    }
  });

  QUnit.test("the hips of every idle and every attack are held in one place along and across the ground, and the same place for all", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const home = hipsHome(group(loaded[kind].bender.container, spec.idles[0]));
      for (const clip of [...spec.idles, spec.attack.clip]) {
        for (const key of hipsTrack(group(loaded[kind].bender.container, clip)).animation.getKeys()) {
          assert.true(Math.abs(key.value.x - home.x) < 1e-9 && Math.abs(key.value.z - home.z) < 1e-9, `${kind} ${clip}`);
        }
      }
    }
  });

  QUnit.test("they were not held before: without it these attacks do wander", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const xs = hipsTrack(group(fresh[kind], spec.attack.clip)).animation.getKeys().map((key) => key.value.x);
      const zs = hipsTrack(group(fresh[kind], spec.attack.clip)).animation.getKeys().map((key) => key.value.z);

      assert.true(Math.max(...xs) - Math.min(...xs) > 1 || Math.max(...zs) - Math.min(...zs) > 1, kind);
    }
  });

  QUnit.test("holding the hips keeps their height: the bender still moves up and down as the clip says", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const before = hipsTrack(group(fresh[kind], spec.attack.clip)).animation.getKeys().map((key) => key.value.y);
      const after = hipsTrack(group(loaded[kind].bender.container, spec.attack.clip)).animation.getKeys().map((key) => key.value.y);

      assert.deepEqual(after, before, kind);
    }
  });

  QUnit.test("walking and running are left alone, since a tower never plays them", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const keys = hipsTrack(group(loaded[kind].bender.container, "Walking")).animation.getKeys();

      assert.true(Math.max(...keys.map((key) => key.value.z)) - Math.min(...keys.map((key) => key.value.z)) > 0.5, kind);
    }
  });

  QUnit.test("each podium is made the width the TOWER table says, and stands on the ground", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const { podium } = loaded[kind];
      const bounds = measure(podium.container.rootNodes[0]);
      const size = sizeOf(bounds);

      assert.true(Math.abs(Math.max(size.x, size.z) * podium.scale - TOWER.podiumWidth) < 1e-9, kind);
      assert.true(Math.abs(bounds.min.y * podium.scale + podium.lift) < 1e-9, `${kind}: the bottom is at the ground`);
      assert.true(Math.abs(podium.top - size.y * podium.scale) < 1e-9, `${kind}: top is its height`);
    }
  });

  QUnit.test("the podiums are not all the same height, and the tallest is no taller than it is wide", (assert) => {
    const tops = Object.values(loaded).map(({ podium }) => podium.top);

    assert.true(new Set(tops.map((t) => t.toFixed(2))).size > 1);
    assert.true(Math.max(...tops) <= TOWER.podiumWidth * 1.3);
  });

  QUnit.test("each bender is made the height the table says, with its feet at zero", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const { bender } = loaded[kind];
      const bounds = measure(bender.container.rootNodes[0]);

      assert.true(Math.abs(sizeOf(bounds).y * bender.scale - TOWER.benderHeight) < 1e-9, kind);
      assert.true(Math.abs(bounds.min.y * bender.scale + bender.lift) < 1e-9, kind);
    }
  });

  QUnit.test("the tallest tower, podium and bender, is under the roof of the view", (assert) => {
    for (const kind of Object.keys(BENDERS)) assert.true(loaded[kind].podium.top + TOWER.benderHeight < BOARD.headroom, kind);
  });
});

QUnit.module("the numbers in the table, measured again on the real clips", (hooks) => {
  let engine, scene, loaded;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadBenders(scene);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  // Plays the attack clip of a bender, a frame at a time, and works out which hand is furthest from the hips, and
  // how far, at each of `steps` + 1 moments: [{ reach, x, y, z, dx, dz }].
  const sample = (kind, steps = 120) => {
    const spec = BENDERS[kind];
    const copy = loaded[kind].bender.container.instantiateModelsToScene((name) => `${kind} measure ${name}`, false, { doNotInstantiate: false });
    copy.animationGroups.forEach((g) => g.stop());
    const node = (name) => scene.getTransformNodeByName(`${kind} measure mixamorig:${name}`);
    const hips = node("Hips");
    const hands = [node("LeftHand"), node("RightHand")];
    const clip = copy.animationGroups.find((g) => g.name === `${kind} measure ${spec.attack.clip}`);
    clip.start(true, 1, clip.from, clip.to);
    clip.pause();
    const rows = [];
    for (let i = 0; i <= steps; i++) {
      clip.goToFrame(clip.from + ((clip.to - clip.from) * i) / steps);
      copy.rootNodes[0].computeWorldMatrix(true);
      [hips, ...hands].forEach((n) => n.computeWorldMatrix(true));
      const h = hips.getAbsolutePosition();
      let best = null;
      for (const hand of hands) {
        const p = hand.getAbsolutePosition();
        const reach = Math.hypot(p.x - h.x, p.z - h.z);
        if (!best || reach > best.reach) best = { reach, x: p.x, y: p.y, z: p.z, dx: p.x - h.x, dz: p.z - h.z };
      }
      rows.push(best);
    }
    clip.stop();
    copy.animationGroups.forEach((g) => g.dispose());
    copy.skeletons.forEach((s) => s.dispose());
    copy.rootNodes[0].dispose();
    return rows;
  };

  QUnit.test("at hitAt the hand is out nearly as far as it ever goes in the clip", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const rows = sample(kind);
      const best = Math.max(...rows.map((r) => r.reach));
      const atHit = rows[Math.round(spec.attack.hitAt * 120)];

      assert.true(atHit.reach >= 0.9 * best, `${kind}: ${atHit.reach.toFixed(2)} of ${best.toFixed(2)}`);
    }
  });

  QUnit.test("and the clip points the way the table says it does", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const atHit = sample(kind)[Math.round(spec.attack.hitAt * 120)];

      assert.true(Math.abs(Math.atan2(atHit.dx, atHit.dz) - spec.attack.aim) < 0.06, `${kind}: ${Math.atan2(atHit.dx, atHit.dz).toFixed(2)} against ${spec.attack.aim}`);
    }
  });

  QUnit.test("and the hand is where the table says the muzzle is", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const atHit = sample(kind)[Math.round(spec.attack.hitAt * 120)];
      const m = spec.attack.muzzle;

      assert.true(Math.hypot(atHit.x - m.x, atHit.y - m.y, atHit.z - m.z) < 0.1, `${kind}: ${atHit.x.toFixed(2)}, ${atHit.y.toFixed(2)}, ${atHit.z.toFixed(2)}`);
    }
  });

  QUnit.test("the hips stay where they are held, for the whole of the attack", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const rows = sample(kind, 30);
      const xs = rows.map((r) => r.x - r.dx);
      const zs = rows.map((r) => r.z - r.dz);

      assert.true(Math.max(...xs) - Math.min(...xs) < 0.01 && Math.max(...zs) - Math.min(...zs) < 0.01, kind);
    }
  });
});
```

- **"The BENDERS table"** checks the shape of every row, and a few facts about the design: the four colors are different, no tower can shoot across the whole board, and the tallest tower still fits under the roof of the view (`BOARD.headroom`).
- **`holdHips` is tested on a fake clip,** a hand-made object with the same three things the function uses (a target with a name, a property, and keys). It is simple to read, and it means the function's rules are tested apart from the model's files.
- **"They were not held before: without it these attacks do wander"** loads the models again, unheld, and checks that their hips *did* travel. That is what makes the test before it mean something: a test that says the hips are still would pass on a model that never moved.
- **"Holding the hips keeps their height"** compares every key's `y` before and after.
- **"The numbers in the table, measured again on the real clips"** is the test that makes a table of numbers safe to trust. It plays an attack a frame at a time (`goToFrame`; the scene's clock doesn't run in a test, so nothing moves unless the test moves it), asks where each hand is, and checks that at `hitAt` the hand is out nearly as far as it ever goes, that it points the way `aim` says, and that it is where `muzzle` says. Each number in the table has something that would fail if it were wrong.

**Check:** open `tests.html` through the web server. 295 tests pass.

---

## Step 4: The brain

A tower decides what to do from what it sees, and it does it in a certain order: turn to face the target, wait for the cooldown, attack, and fire when the hand is out. That is a **state machine** with two states (idle, attacking), and this file is that, and nothing else. It knows nothing of models and nothing of the scene, so a test can run a minute of it in a moment.

Open the placeholder `js/brain.js` and replace its contents with:

```js
// The brain of a tower: what it is doing and what it will do next. It turns to face its target, and
// waits for its cooldown, and starts an attack; some way into the attack (when the hand is out
// furthest) it *fires*; and when the attack is over it goes back to waiting. It says what happens as
// a list of events, which the model and the effects listen to, so that the brain itself needs no
// model, and a test can run a minute of it in a moment. See ../tests/brain.tests.js.

const BRAIN = {
  turnRate: 7, // the fastest a tower turns, in radians a second
  aligned: 0.35, // how near to facing its target it has to be to start an attack, in radians
  rest: Math.PI, // the way it faces when it has had nothing to shoot at: toward the front of the board
};

// An angle that goes round: the same angle, put in the range from just over minus a half turn to a half turn.
function wrapAngle(angle) {
  let a = (angle + Math.PI) % (2 * Math.PI);
  if (a <= 0) a += 2 * Math.PI;
  return a - Math.PI;
}

// How far to turn, and which way, to get from one angle to another by the short way round: from
// a hair under a half turn one way to a half turn the other way.
function angleDifference(from, to) {
  return wrapAngle(to - from);
}

// Turns from `current` towards `desired` by at most `maxStep`, the short way round.
function turnToward(current, desired, maxStep) {
  const difference = angleDifference(current, desired);
  if (Math.abs(difference) <= maxStep) return wrapAngle(desired);
  return wrapAngle(current + Math.sign(difference) * maxStep);
}

// The way to face to look from one place at another, the same turn about the vertical axis that a model
// facing along z is given to face along (dx, dz).
function facing(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

// How long an attack lasts, in seconds, once it is played at its speed, and how long after it starts the hand is out.
function attackDuration(attack) {
  return attack.seconds / attack.speed;
}
function hitTime(attack) {
  return attack.hitAt * attackDuration(attack);
}

class TowerBrain {
  // `spec` is the row of a bender in the BENDERS table. `at` is where the tower stands: { x, z }.
  constructor(spec, at, mode = "first") {
    this.spec = spec;
    this.x = at.x;
    this.z = at.z;
    this.mode = mode;
    this.yaw = BRAIN.rest;
    this.state = "idle"; // "idle" or "attacking"
    this.target = null; // who it is looking at while idle
    this.lock = null; // who it is shooting at while it attacks: { enemy, x, z }
    this.sinceStart = Infinity; // time since the last attack began, so the first one needn't wait
    this.attackTime = 0; // how far into an attack it is
    this.fired = false; // whether this attack has fired yet
  }

  // The way the tower has to face to shoot at something: toward it, less the way that its attack points.
  yawFor(place) {
    return facing(this, place) - this.spec.attack.aim;
  }

  turn(dt, place) {
    this.yaw = turnToward(this.yaw, this.yawFor(place), BRAIN.turnRate * dt);
  }

  // Lets `dt` seconds go by, given the enemies there are. It says what happened, as a list of events:
  // { type: "start", enemy }, { type: "fire", enemy, x, z } and { type: "end" }.
  update(dt, enemies) {
    const events = [];
    this.sinceStart += dt;

    if (this.state === "attacking") {
      // It keeps its eye on who it is shooting at, as long as they are about, and then where they were.
      if (enemies.includes(this.lock.enemy)) {
        this.lock.x = this.lock.enemy.x;
        this.lock.z = this.lock.enemy.z;
      }
      this.turn(dt, this.lock);
      this.attackTime += dt;
      if (!this.fired && this.attackTime >= hitTime(this.spec.attack)) {
        this.fired = true;
        events.push({ type: "fire", enemy: this.lock.enemy, x: this.lock.x, z: this.lock.z });
      }
      if (this.attackTime >= attackDuration(this.spec.attack)) {
        this.state = "idle";
        events.push({ type: "end" });
      }
      return events;
    }

    this.target = pickTarget(this, this.spec.range, enemies, this.mode);
    if (this.target) {
      this.turn(dt, this.target);
      const ready = this.sinceStart >= this.spec.cooldown;
      const facingIt = Math.abs(angleDifference(this.yaw, this.yawFor(this.target))) <= BRAIN.aligned;
      if (ready && facingIt) {
        this.state = "attacking";
        this.sinceStart = 0;
        this.attackTime = 0;
        this.fired = false;
        this.lock = { enemy: this.target, x: this.target.x, z: this.target.z };
        events.push({ type: "start", enemy: this.target });
      }
    }
    return events;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BRAIN, wrapAngle, angleDifference, turnToward, facing, attackDuration, hitTime, TowerBrain };
} else {
  Object.assign(window, { BRAIN, wrapAngle, angleDifference, turnToward, facing, attackDuration, hitTime, TowerBrain });
}
```

Things to notice:

- **Angles go round,** and that is the main trouble. A tower facing just under a half turn and asked to face just over one has a tiny turn to make, not a huge one the other way. `wrapAngle` puts any angle in the range from just over minus a half turn to a half turn. `angleDifference(from, to)` is **the short way round**, with the sign saying which. `turnToward` moves by at most a step, that way, and stops exactly on the angle when it is near enough. The `%` of JavaScript gives a negative answer for a negative number, and the `if (a <= 0)` is the fix for that.
- **`facing` is the same angle that `pointAlong` gave the enemies:** `Math.atan2(dx, dz)`. A model that faces along z, turned by that, faces the way `(dx, dz)` points. A test says it is the same one.
- **`attackDuration` and `hitTime` are worked out from the table,** not stored beside it: how long it lasts is the clip's length over its speed, and the hand is out `hitAt` of the way through. If you change the speed of an attack, the time of the fire changes too, and nothing else needs telling.
- **`yawFor` is the turn needed to shoot at something:** the way to face it, **less the way the attack points**. A jab that points 15 degrees to the left needs the body turned 15 degrees to the right, so that the *fist* is on the target.
- **`update(dt, enemies)` is the whole brain,** and it returns a list of **events**: `start`, `fire` and `end`. That is better than callbacks, because the caller (the tower, which has the model) decides what to do with each, in the order they happened. A `fire` says who it was at and where they were.
- **While it attacks, the tower keeps its eye on its target:** if the enemy is still in the list, it copies where it is now; if it has gone (it has walked off the end of the road, which is the same as being gone), the tower shoots where it was last seen. It never changes who it is shooting at in the middle of an attack.
- **A tower that is idle looks for a target every frame** and turns toward it, and starts an attack only when **the cooldown is over** and **it is facing the enemy** (to within `BRAIN.aligned`). `sinceStart` begins at `Infinity` so that the first attack doesn't have to wait for a cooldown that never began.
- **The cooldown is from the start of one attack to the start of the next,** so a tower with a cooldown of 1.5 and an attack of 1.5 attacks without a pause, and a test says that no cooldown is shorter than its attack.
- **The turn rate and the angle are in `BRAIN`,** and nothing else says `7` or `0.35`.

Open the placeholder `tests/brain.tests.js` and replace its contents with:

```js
QUnit.module("angles", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  QUnit.test("wrapAngle leaves an angle that is already in range alone", (assert) => {
    for (const a of [0, 1, -1, 3, -3, Math.PI]) assert.true(near(wrapAngle(a), a), `${a}`);
  });

  QUnit.test("wrapAngle brings a bigger angle back round, and a smaller one", (assert) => {
    assert.true(near(wrapAngle(2 * Math.PI + 1), 1));
    assert.true(near(wrapAngle(-2 * Math.PI - 1), -1));
    assert.true(near(wrapAngle(7 * Math.PI), Math.PI));
  });

  QUnit.test("a half turn is a half turn the same way whichever way it is written", (assert) => {
    assert.true(near(wrapAngle(Math.PI), Math.PI));
    assert.true(near(wrapAngle(-Math.PI), Math.PI));
  });

  QUnit.test("angleDifference is the short way round: just past the half turn is a small turn the other way", (assert) => {
    assert.true(near(angleDifference(3, -3), 2 * Math.PI - 6), "from 3 to -3 is a little further round the same way, and not nearly all the way back");
    assert.true(near(angleDifference(-3, 3), -(2 * Math.PI - 6)));
    assert.true(near(angleDifference(0, 1), 1));
    assert.true(near(angleDifference(1, 0), -1));
  });

  QUnit.test("turnToward goes the whole way when it is near enough", (assert) => {
    assert.true(near(turnToward(0, 0.2, 0.5), 0.2));
    assert.true(near(turnToward(0, -0.2, 0.5), -0.2));
  });

  QUnit.test("turnToward goes no further than the step, in the right direction", (assert) => {
    assert.true(near(turnToward(0, 2, 0.5), 0.5));
    assert.true(near(turnToward(0, -2, 0.5), -0.5));
  });

  QUnit.test("turnToward goes the short way round, across the half turn", (assert) => {
    const next = turnToward(3, -3, 0.1);

    assert.true(near(next, wrapAngle(3.1)), "from 3 towards -3 is up, through the half turn, and not down through zero");
  });

  QUnit.test("turnToward gets there in the end, from anywhere", (assert) => {
    for (const [from, to] of [[0, 3], [3, -3], [-2, 2], [1, 1], [3.1, -3.1]]) {
      let angle = from;
      for (let i = 0; i < 100; i++) angle = turnToward(angle, to, 0.2);

      assert.true(Math.abs(angleDifference(angle, to)) < 1e-9, `${from} to ${to}`);
    }
  });

  QUnit.test("facing is the yaw that points a model that faces along z at a place", (assert) => {
    const here = { x: 0, z: 0 };

    assert.true(near(facing(here, { x: 0, z: 5 }), 0), "more z is straight ahead");
    assert.true(near(facing(here, { x: 5, z: 0 }), Math.PI / 2), "more x is a quarter turn");
    assert.true(near(facing(here, { x: -5, z: 0 }), -Math.PI / 2));
    assert.true(near(Math.abs(facing(here, { x: 0, z: -5 })), Math.PI), "less z is behind");
  });

  QUnit.test("facing agrees with the walking enemies: it is the same angle pointAlong gives", (assert) => {
    const route = makeRoute([{ x: 0, z: 0 }, { x: 3, z: 4 }]);

    assert.true(near(facing({ x: 0, z: 0 }, { x: 3, z: 4 }), pointAlong(route, 1).yaw));
  });
});

QUnit.module("an attack in the BENDERS table", () => {
  QUnit.test("it lasts its length over its speed, and the hand is out that share of the way through", (assert) => {
    const attack = { seconds: 3, speed: 2, hitAt: 0.4 };

    assert.strictEqual(attackDuration(attack), 1.5);
    assert.true(Math.abs(hitTime(attack) - 0.6) < 1e-12);
  });

  QUnit.test("for every bender, the hand is out before the attack is over", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(hitTime(spec.attack) < attackDuration(spec.attack), kind);
  });

  QUnit.test("and the cooldown is at least as long as the attack, so that an attack is never cut off by the next", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(spec.cooldown >= attackDuration(spec.attack), kind);
  });

  QUnit.test("every attack is over in about a second and a half or less, which is as long as a person will watch one", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(attackDuration(spec.attack) <= 1.6, kind);
  });
});

QUnit.module("TowerBrain", () => {
  // A bender that is easy to work out: an attack of one second, with the hand out at a half, a cooldown of two
  // seconds, and a range of five. It points straight ahead.
  const spec = { range: 5, cooldown: 2, attack: { seconds: 1, speed: 1, hitAt: 0.5, aim: 0 } };
  const at = { x: 0, z: 0 };
  const enemy = (x, z, progress = 0.5) => ({ x, z, progress, done: false });

  // Runs the brain for `seconds` in steps of a fiftieth of a second, and gives back every event, with when it was.
  const run = (brain, seconds, enemies) => {
    const events = [];
    for (let t = 0; t < seconds - 1e-9; t += 0.02) for (const event of brain.update(0.02, enemies)) events.push({ ...event, time: Math.round((t + 0.02) * 100) / 100 });
    return events;
  };

  QUnit.test("begins idle, facing the way it rests, with nothing to shoot at", (assert) => {
    const brain = new TowerBrain(spec, at);

    assert.strictEqual(brain.state, "idle");
    assert.strictEqual(brain.yaw, BRAIN.rest);
    assert.strictEqual(brain.target, null);
  });

  QUnit.test("with no enemies it does nothing: no events, and it stays facing where it was", (assert) => {
    const brain = new TowerBrain(spec, at);

    assert.deepEqual(run(brain, 5, []), []);
    assert.strictEqual(brain.yaw, BRAIN.rest);
  });

  QUnit.test("an enemy out of range is ignored", (assert) => {
    const brain = new TowerBrain(spec, at);

    assert.deepEqual(run(brain, 3, [enemy(9, 0)]), []);
    assert.strictEqual(brain.target, null);
  });

  QUnit.test("an enemy in range is looked at: it turns to it, and no faster than its turn rate", (assert) => {
    const brain = new TowerBrain(spec, at);
    const e = enemy(5, 0); // a quarter turn to the right of straight ahead
    brain.update(0.01, [e]);

    assert.strictEqual(brain.target, e);
    assert.true(Math.abs(angleDifference(BRAIN.rest, brain.yaw)) <= BRAIN.turnRate * 0.01 + 1e-9);
    assert.true(Math.abs(angleDifference(BRAIN.rest, brain.yaw)) > 0, "it has started to turn");
  });

  QUnit.test("it takes time to turn: it does not start an attack until it is facing the enemy", (assert) => {
    const brain = new TowerBrain(spec, at);
    const e = enemy(0, 4); // straight ahead is along z, and it is facing the other way, a half turn off
    const events = run(brain, 2, [e]);
    const start = events.find((event) => event.type === "start");

    assert.true(start.time > 0.1, `it started at ${start.time}`);
    assert.true(Math.abs(angleDifference(brain.yaw, brain.yawFor(e))) <= BRAIN.aligned + 1e-9);
  });

  QUnit.test("an attack is a start, then a fire half way through, then an end, in that order, at the right times", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = run(brain, 1.5, [e]);

    assert.deepEqual(events.map((event) => event.type), ["start", "fire", "end"]);
    assert.true(Math.abs(events[1].time - events[0].time - 0.5) <= 0.02, "the hand is out half a second after the start");
    assert.true(Math.abs(events[2].time - events[0].time - 1) <= 0.02, "and the attack lasts a second");
  });

  QUnit.test("the start and the fire say who it is", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = run(brain, 1.5, [e]);

    assert.strictEqual(events[0].enemy, e);
    assert.strictEqual(events[1].enemy, e);
    assert.strictEqual(events[1].x, 0);
    assert.strictEqual(events[1].z, 3);
  });

  QUnit.test("it is attacking between the start and the end, and idle outside", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    brain.update(0.02, [e]);
    assert.strictEqual(brain.state, "attacking");
    for (let i = 0; i < 60; i++) brain.update(0.02, [e]);

    assert.strictEqual(brain.state, "idle");
  });

  QUnit.test("it waits for its cooldown: attacks begin that far apart, at the soonest", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const starts = run(brain, 10, [enemy(0, 3)]).filter((event) => event.type === "start").map((event) => event.time);

    assert.true(starts.length >= 4, `${starts.length} attacks`);
    starts.slice(1).forEach((time, i) => assert.true(time - starts[i] >= spec.cooldown - 0.021, `gap ${(time - starts[i]).toFixed(2)}`));
  });

  QUnit.test("and does not wait any longer than that, once it is facing the enemy", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const starts = run(brain, 10, [enemy(0, 3)]).filter((event) => event.type === "start").map((event) => event.time);

    starts.slice(1).forEach((time, i) => assert.true(time - starts[i] <= spec.cooldown + 0.05, `gap ${(time - starts[i]).toFixed(2)}`));
  });

  QUnit.test("the first attack does not have to wait for a cooldown that has not begun", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const first = run(brain, 0.2, [enemy(0, 3)]).find((event) => event.type === "start");

    assert.true(first.time <= 0.04);
  });

  QUnit.test("a fire is never without a start before it, or after an end, however long it runs", (assert) => {
    const brain = new TowerBrain(spec, at);
    const events = run(brain, 60, [enemy(2, 2), enemy(-1, 3, 0.9)]);
    let inside = false;
    let ok = true;
    for (const event of events) {
      if (event.type === "start") {
        ok = ok && !inside;
        inside = true;
      }
      if (event.type === "fire") ok = ok && inside;
      if (event.type === "end") {
        ok = ok && inside;
        inside = false;
      }
    }

    assert.true(ok);
    assert.true(events.filter((e) => e.type === "fire").length >= 25);
  });

  QUnit.test("while it attacks it keeps its target, even when a better one comes", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const first = enemy(0, 3, 0.2);
    const better = enemy(1, 3, 0.9);
    brain.update(0.02, [first]);
    const events = [];
    for (let i = 0; i < 40; i++) events.push(...brain.update(0.02, [first, better]));

    assert.strictEqual(events.find((event) => event.type === "fire").enemy, first);
  });

  QUnit.test("and a better one is taken for the next attack: `first` is the one furthest along", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const slow = enemy(0, 3, 0.2);
    const fast = enemy(1, 3, 0.9);
    const starts = run(brain, 6, [slow, fast]).filter((event) => event.type === "start");

    assert.true(starts.every((event) => event.enemy === fast));
  });

  QUnit.test("its mode can be changed, and a `closest` tower picks the nearest", (assert) => {
    const brain = new TowerBrain(spec, at, "closest");
    brain.yaw = 0;
    const near = enemy(0, 1, 0.1);
    const far = enemy(0, 4, 0.9);
    const start = run(brain, 1, [far, near]).find((event) => event.type === "start");

    assert.strictEqual(start.enemy, near);
  });

  QUnit.test("it follows its target while it attacks, so the shot goes where the enemy is", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = [];
    for (let i = 0; i < 60; i++) {
      e.x += 0.02; // the enemy walks across
      events.push(...brain.update(0.02, [e]));
    }
    const fire = events.find((event) => event.type === "fire");

    assert.true(fire.x > 0.2, "it fires at where the enemy is, and not where it was when the attack began");
    assert.true(fire.x < e.x, "and the enemy has walked on since");
  });

  QUnit.test("an enemy that has gone by the time the hand is out is shot at where it was last", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = [...brain.update(0.02, [e])];
    for (let i = 0; i < 60; i++) events.push(...brain.update(0.02, []));
    const fire = events.find((event) => event.type === "fire");

    assert.strictEqual(fire.enemy, e);
    assert.strictEqual(fire.z, 3);
  });

  QUnit.test("it turns to face where the attack points, and not where the body faces", (assert) => {
    const turned = new TowerBrain({ ...spec, attack: { ...spec.attack, aim: 0.5 } }, at);
    const e = enemy(0, 3);
    for (let i = 0; i < 100; i++) turned.update(0.02, [e]);

    assert.true(Math.abs(turned.yaw - (0 - 0.5)) < 0.02, `${turned.yaw}`);
  });

  QUnit.test("it takes its place in the world into account: a tower on the other side of the board turns the other way", (assert) => {
    const brain = new TowerBrain(spec, { x: 10, z: 0 });
    brain.update(0.02, []);
    const e = enemy(10, 3);
    for (let i = 0; i < 100; i++) brain.update(0.02, [e]);

    assert.true(Math.abs(brain.yaw) < 0.05);
  });

  QUnit.test("it does not fire at an enemy that has got to the end", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const done = { x: 0, z: 3, progress: 1, done: true };

    assert.deepEqual(run(brain, 5, [done]), []);
  });

  QUnit.test("a very long step does not skip the end of an attack, or lose track of the state", (assert) => {
    const brain = new TowerBrain(spec, at);
    brain.yaw = 0;
    const e = enemy(0, 3);
    const events = [...brain.update(0.02, [e]), ...brain.update(5, [e])];

    assert.deepEqual(events.map((event) => event.type), ["start", "fire", "end"]);
    assert.strictEqual(brain.state, "idle");
  });

  QUnit.test("every bender in the table has a brain that can attack: it fires at an enemy ahead, in range", (assert) => {
    for (const [kind, benderSpec] of Object.entries(BENDERS)) {
      const brain = new TowerBrain(benderSpec, at);
      const e = enemy(0, benderSpec.range * 0.5);
      const events = run(brain, 3, [e]);

      assert.true(events.some((event) => event.type === "fire"), kind);
    }
  });
});
```

- **The angle tests go across the half turn,** because that's where the mistake is. "Turns the short way round, across the half turn" starts at 3 radians and asks for -3: the answer is up, through π, and not down through 0.
- **The brain tests use an attack of one second with the hand out at a half,** and a cooldown of two, so that every time in them is easy to work out. `run` steps the brain a fiftieth of a second at a time and records *when* each event happened.
- **"A fire is never without a start before it, or after an end"** runs for a minute against two enemies and checks that the events come in the right order, every time. A test that runs a long time against a rule is a good way to find the case you didn't think of.
- **"A very long step does not skip the end of an attack"** gives the brain five seconds at once, which a tab that has been in the background would. It must still say start, fire, end, in that order, and be idle at the end.
- **The last test makes a brain for every bender in the real table** and checks that each fires at an enemy ahead in range. A mistake in a row of the table (a `hitAt` of 1.2, say) shows up here.

**Check:** open `tests.html`. 331 tests pass.

---

## Step 5: The tower

Now the model that does what the brain says. A **tower** builds a podium and a bender, plays the idle or the attack that the brain asks for, turns the bender to face where the brain says, and knows where the hand is when it fires.

Open the placeholder `js/tower.js` and replace its contents with:

```js
// A tower: a podium with a bender on it, and a brain (see brain.js) that decides what it does. This file
// is the model and the animation: it builds the podium and the bender, plays the idle and the attack
// that the brain asks for, turns the bender to face where the brain says, and works out where the hand
// is when it fires. See ../tests/tower.tests.js.

const TOWER_VIEW = {
  idlePeriod: 7, // how many seconds a tower plays one idle before it changes to the next (if it has more than one)
  blending: 0.08, // how quickly one clip fades into the next: the share of the way it goes each frame
};

// Which of `count` idles should be playing after `time` seconds: each, in turn, for `period` seconds.
function idleAt(count, time, period = TOWER_VIEW.idlePeriod) {
  return Math.floor(time / period) % count;
}

// Where the hand is in the world when it fires, as { x, y, z }. A tower stands at `at` (on the ground) with its
// bender on a podium `top` high, turned by `yaw`; `muzzle` is where the hand is, for a bender that is not scaled,
// and `scale` is how much it is scaled. Turning by a yaw takes a place (x, z) to (x cos + z sin, z cos - x sin).
function muzzleAt(at, top, yaw, muzzle, scale) {
  const x = muzzle.x * scale;
  const z = muzzle.z * scale;
  return {
    x: at.x + x * Math.cos(yaw) + z * Math.sin(yaw),
    y: top + muzzle.y * scale,
    z: at.z + z * Math.cos(yaw) - x * Math.sin(yaw),
  };
}

class Tower {
  constructor(scene, loaded, kind, col, row, name = `tower ${col},${row}`, board = BOARD, benders = BENDERS) {
    const spec = benders[kind];
    const { podium, bender } = loaded[kind];
    const at = cellCenter(col, row, board);
    this.kind = kind;
    this.spec = spec;
    this.col = col;
    this.row = row;
    this.at = at;
    this.top = podium.top;
    this.scale = bender.scale;
    this.brain = new TowerBrain(spec, at);
    this.time = (col * 3 + row * 5) % TOWER_VIEW.idlePeriod; // so that the towers don't all change idle at once

    this.node = new BABYLON.TransformNode(name, scene);
    this.node.position.set(at.x, 0, at.z);

    // The podium stands on the ground, in the middle of the cell.
    const podiumInner = new BABYLON.TransformNode(`${name} podium`, scene);
    podiumInner.parent = this.node;
    podiumInner.position.set(podium.shift.x, podium.lift, podium.shift.z);
    podiumInner.scaling.setAll(podium.scale);
    this.podiumCopy = podium.container.instantiateModelsToScene((original) => `${name} podium ${original}`, false, { doNotInstantiate: false });
    this.podiumCopy.rootNodes[0].parent = podiumInner;

    // The bender stands on top of it. The node that turns is in the middle, so that it turns about its feet.
    this.turner = new BABYLON.TransformNode(`${name} bender`, scene);
    this.turner.parent = this.node;
    this.turner.position.y = podium.top;
    const benderInner = new BABYLON.TransformNode(`${name} bender model`, scene);
    benderInner.parent = this.turner;
    benderInner.position.y = bender.lift;
    benderInner.scaling.setAll(bender.scale);
    this.copy = bender.container.instantiateModelsToScene((original) => `${name} bender ${original}`, false, { doNotInstantiate: false });
    this.copy.rootNodes[0].parent = benderInner;

    // Every clip fades into the one before it, and none of them plays until it is asked for.
    const find = (clip) => this.copy.animationGroups.find((group) => group.name === `${name} bender ${clip}`);
    this.copy.animationGroups.forEach((group) => {
      group.stop();
      group.enableBlending = true;
      group.blendingSpeed = TOWER_VIEW.blending;
    });
    this.idles = spec.idles.map(find);
    this.attackClip = find(spec.attack.clip);
    this.current = null;
    this.idleNow = -1;
    this.playIdle();
    this.turner.rotation.y = this.brain.yaw;
  }

  // Plays a clip in place of the one that is playing.
  play(group, loop, speed = 1) {
    if (this.current && this.current !== group) this.current.stop();
    group.start(loop, speed);
    this.current = group;
  }

  playIdle() {
    this.idleNow = idleAt(this.idles.length, this.time);
    this.play(this.idles[this.idleNow], true);
  }

  // Where the hand is now, if it fired now.
  muzzle() {
    return muzzleAt(this.at, this.top, this.brain.yaw, this.spec.attack.muzzle, this.scale);
  }

  // Lets `dt` seconds go by, given the enemies there are. It gives back what the tower did that the
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color }.
  update(dt, enemies) {
    this.time += dt;
    const shots = [];
    for (const event of this.brain.update(dt, enemies)) {
      if (event.type === "start") this.play(this.attackClip, false, this.spec.attack.speed);
      if (event.type === "end") this.playIdle();
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(), color: this.spec.color });
    }
    // Waiting, it changes its idle now and then, if it has more than one.
    if (this.brain.state === "idle" && this.idles.length > 1 && idleAt(this.idles.length, this.time) !== this.idleNow) this.playIdle();
    this.turner.rotation.y = this.brain.yaw;
    return shots;
  }

  // Takes the tower out of the scene, with its copy of the skeleton and of the animations.
  dispose() {
    this.copy.animationGroups.forEach((group) => group.dispose());
    this.copy.skeletons.forEach((skeleton) => skeleton.dispose());
    this.node.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOWER_VIEW, idleAt, muzzleAt, Tower };
} else {
  Object.assign(window, { TOWER_VIEW, idleAt, muzzleAt, Tower });
}
```

Things to notice:

- **A tower is nodes, as an enemy was.** An outer node is in the middle of the cell. The podium is inside one (scaled to a width and standing on the ground), and the bender is inside another, a node of its own that **does the turning** (`turner`), so the bender turns about its feet and not about the corner of the board. The turner is as high as the podium's `top`.
- **The podium is an instance** (it has no skeleton, and instances are cheap), **and the bender is a clone** with a skeleton and animations of its own, as the enemies were.
- **Every clip fades into the next.** `enableBlending` and `blendingSpeed` on an animation group make a clip that starts *begin from the pose that the model is in* and move into its own over a few frames, and not jump. Without it a tower snaps from its idle to its attack, and back again.
- **`play` stops the clip that is playing and starts the new one.** That is how a fade works: the model keeps the pose it was in, and the new clip pulls it toward its own.
- **`update` asks the brain, and does what it says.** On `start` it plays the attack clip (not looping, at its speed); on `end` it goes back to an idle; on `fire` it adds a **shot** to the list it returns, saying who it was at, where the hand is, and what color. The tower throws nothing itself: it says that a shot happened, and the game decides what a shot is (this tutorial: a bolt; later ones: the effects of each nation).
- **`idleAt` chooses which idle to play from the time:** each in turn, for a number of seconds. A tower begins at a different time from its neighbors (`(col * 3 + row * 5) % period`) so that the air nomads on a board don't all change pose together.
- **`muzzleAt` is where the hand is in the world.** The measured `muzzle` is in the bender's own units, measured from his feet, for a bender who faces along z. The hand in the world is the tower's place, plus the height of the podium, plus the muzzle *scaled* by how much the bender is scaled, and *turned* by the bender's yaw: `(x cos + z sin, z cos - x sin)` is what turning by a yaw does to a place on the ground. A test checks this against the position of a real hand.
- **`dispose` takes the copies away,** as an enemy's does.

Open the placeholder `tests/tower.tests.js` and replace its contents with:

```js
QUnit.module("idleAt", () => {
  QUnit.test("begins with the first, and goes on to the next every period, and round again", (assert) => {
    assert.strictEqual(idleAt(2, 0, 7), 0);
    assert.strictEqual(idleAt(2, 6.99, 7), 0);
    assert.strictEqual(idleAt(2, 7, 7), 1);
    assert.strictEqual(idleAt(2, 14, 7), 0);
  });

  QUnit.test("a bender with one idle is always on it", (assert) => {
    for (const time of [0, 3, 7, 100]) assert.strictEqual(idleAt(1, time, 7), 0);
  });

  QUnit.test("uses the period in the TOWER_VIEW table if it is not given one", (assert) => {
    assert.strictEqual(idleAt(3, TOWER_VIEW.idlePeriod * 2.5), 2);
  });
});

QUnit.module("muzzleAt", () => {
  const at = { x: 10, z: -4 };
  const muzzle = { x: 0.2, y: 1, z: 0.5 };

  QUnit.test("facing straight ahead, the hand is a little ahead (more z), and as high as the podium plus the hand", (assert) => {
    const p = muzzleAt(at, 1.4, 0, muzzle, 2);

    assert.true(Math.abs(p.x - (10 + 0.4)) < 1e-9);
    assert.true(Math.abs(p.y - (1.4 + 2)) < 1e-9);
    assert.true(Math.abs(p.z - (-4 + 1)) < 1e-9);
  });

  QUnit.test("turned a quarter, ahead is to the right (more x) and the right is behind (less z)", (assert) => {
    const p = muzzleAt(at, 0, Math.PI / 2, { x: 0, y: 0, z: 1 }, 1);

    assert.true(Math.abs(p.x - 11) < 1e-9 && Math.abs(p.z + 4) < 1e-9);
    const q = muzzleAt(at, 0, Math.PI / 2, { x: 1, y: 0, z: 0 }, 1);

    assert.true(Math.abs(q.x - 10) < 1e-9 && Math.abs(q.z - -5) < 1e-9);
  });

  QUnit.test("turning does not change how far the hand is from the tower, or how high", (assert) => {
    for (const yaw of [0, 1, 2, -2, 3]) {
      const p = muzzleAt(at, 1, yaw, muzzle, 1.5);

      assert.true(Math.abs(Math.hypot(p.x - at.x, p.z - at.z) - Math.hypot(0.2, 0.5) * 1.5) < 1e-9, `${yaw}`);
      assert.true(Math.abs(p.y - (1 + 1.5)) < 1e-9);
    }
  });

  QUnit.test("a half turn puts it on the other side", (assert) => {
    const p = muzzleAt(at, 0, Math.PI, { x: 0, y: 0, z: 1 }, 1);

    assert.true(Math.abs(p.z - -5) < 1e-9);
  });
});

QUnit.module("a Tower", (hooks) => {
  let engine, scene, loaded;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadBenders(scene);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const foe = (x, z, progress = 0.5) => ({ x, z, progress, done: false });
  const bounds = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true);
  };

  QUnit.test("it stands in the middle of its cell", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `centered ${kind}`);
      const { x, z } = cellCenter(3, 2);

      assert.true(Math.abs(tower.node.position.x - x) < 1e-9 && Math.abs(tower.node.position.z - z) < 1e-9, kind);
      tower.dispose();
    }
  });

  QUnit.test("its podium stands on the ground, and fits in the cell", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `podium ${kind}`);
      const { min, max } = bounds(tower.podiumCopy.rootNodes[0].parent);
      const { x, z } = cellCenter(3, 2);

      assert.true(Math.abs(min.y) < 0.02, `${kind} stands at ${min.y.toFixed(3)}`);
      assert.true(max.x - min.x < BOARD.cell && max.z - min.z < BOARD.cell, kind);
      assert.true(Math.abs((min.x + max.x) / 2 - x) < 0.05 && Math.abs((min.z + max.z) / 2 - z) < 0.05, `${kind} is centered`);
      tower.dispose();
    }
  });

  QUnit.test("the bender's feet are on top of the podium", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `feet ${kind}`);
      const podium = bounds(tower.podiumCopy.rootNodes[0].parent);
      const bender = bounds(tower.copy.rootNodes[0].parent);

      assert.true(Math.abs(bender.min.y - podium.max.y) < 0.03, `${kind}: feet ${bender.min.y.toFixed(3)}, top ${podium.max.y.toFixed(3)}`);
      tower.dispose();
    }
  });

  QUnit.test("the whole tower is under the roof of the view", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `roof ${kind}`);

      assert.true(bounds(tower.node).max.y < BOARD.headroom, kind);
      tower.dispose();
    }
  });

  QUnit.test("it begins playing its first idle, and nothing else", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `idle ${kind}`);
      const playing = tower.copy.animationGroups.filter((group) => group.isPlaying);

      assert.strictEqual(playing.length, 1, kind);
      assert.strictEqual(playing[0], tower.idles[tower.idleNow], kind);
      assert.true(playing[0].loopAnimation, kind);
      tower.dispose();
    }
  });

  QUnit.test("every clip fades into the one before it", (assert) => {
    const tower = new Tower(scene, loaded, "air", 3, 2, "blend");

    assert.true(tower.copy.animationGroups.every((group) => group.enableBlending === true && group.blendingSpeed === TOWER_VIEW.blending));
    tower.dispose();
  });

  QUnit.test("with nothing to shoot at it gives no shots, and goes on idling", (assert) => {
    const tower = new Tower(scene, loaded, "water", 3, 2, "quiet");

    for (let i = 0; i < 100; i++) assert.deepEqual(tower.update(0.05, []), []);
    assert.strictEqual(tower.brain.state, "idle");
    assert.true(tower.idles[0].isPlaying);
    tower.dispose();
  });

  QUnit.test("the bender turns as the brain says", (assert) => {
    const tower = new Tower(scene, loaded, "water", 3, 2, "turner");
    tower.update(0.05, [foe(tower.at.x + 3, tower.at.z)]);

    assert.strictEqual(tower.turner.rotation.y, tower.brain.yaw);
    assert.notStrictEqual(tower.turner.rotation.y, BRAIN.rest);
    tower.dispose();
  });

  QUnit.test("it attacks an enemy that comes in range: the attack clip plays, at its speed, and nothing else", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `attack ${kind}`);
      const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
      let started = false;
      for (let i = 0; i < 100 && !started; i++) {
        tower.update(0.05, [enemy]);
        started = tower.brain.state === "attacking";
      }
      const playing = tower.copy.animationGroups.filter((group) => group.isPlaying);

      assert.true(started, `${kind} began an attack`);
      assert.deepEqual(playing, [tower.attackClip], kind);
      assert.strictEqual(tower.attackClip.speedRatio, BENDERS[kind].attack.speed, kind);
      assert.false(tower.attackClip.loopAnimation, kind);
      tower.dispose();
    }
  });

  QUnit.test("when the attack is over it goes back to its idle", (assert) => {
    const tower = new Tower(scene, loaded, "earth", 3, 2, "return");
    const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
    for (let i = 0; i < 200; i++) tower.update(0.05, [enemy]);
    tower.update(0.05, []);
    for (let i = 0; i < 100; i++) tower.update(0.05, []);

    assert.strictEqual(tower.brain.state, "idle");
    assert.deepEqual(tower.copy.animationGroups.filter((group) => group.isPlaying), [tower.idles[tower.idleNow]]);
    tower.dispose();
  });

  QUnit.test("it fires: a shot says who at, where from, and in what color", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `shot ${kind}`);
      const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
      const shots = [];
      for (let i = 0; i < 100; i++) shots.push(...tower.update(0.02, [enemy]));

      assert.true(shots.length >= 1, `${kind} fired`);
      assert.strictEqual(shots[0].enemy, enemy, kind);
      assert.strictEqual(shots[0].color, spec.color, kind);
      assert.true(shots[0].muzzle.y > tower.top, `${kind}: the hand is above the podium`);
      tower.dispose();
    }
  });

  QUnit.test("and the muzzle is where the hand really is when it fires", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const name = `muzzle ${kind}`;
      const tower = new Tower(scene, loaded, kind, 3, 2, name);
      const enemy = foe(tower.at.x + 1.5, tower.at.z + 2);
      let shot = null;
      for (let i = 0; i < 200 && !shot; i++) shot = tower.update(0.02, [enemy])[0];
      // The animation in the scene is played by the clock, which does not run here: put the clip where it would
      // be, on its own and with no fade from the idle (a fade takes a few frames of the clock, too).
      const clip = tower.attackClip;
      tower.copy.animationGroups.forEach((group) => {
        group.stop();
        group.enableBlending = false;
      });
      clip.start(false, 1);
      clip.pause();
      clip.goToFrame(clip.from + (clip.to - clip.from) * spec.attack.hitAt);
      tower.node.computeWorldMatrix(true);
      tower.copy.rootNodes[0].computeWorldMatrix(true);
      const hands = ["LeftHand", "RightHand"].map((hand) => {
        const node = scene.getTransformNodeByName(`${name} bender mixamorig:${hand}`);
        node.computeWorldMatrix(true);
        return node.getAbsolutePosition();
      });
      const nearest = Math.min(...hands.map((p) => Math.hypot(p.x - shot.muzzle.x, p.y - shot.muzzle.y, p.z - shot.muzzle.z)));

      assert.true(nearest < 0.15, `${kind}: ${nearest.toFixed(3)} from a hand`);
      tower.dispose();
    }
  });

  QUnit.test("through the whole attack the bender stays over its podium: the hips do not wander", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const name = `stay ${kind}`;
      const tower = new Tower(scene, loaded, kind, 3, 2, name);
      const hips = scene.getTransformNodeByName(`${name} bender mixamorig:Hips`);
      const clip = tower.attackClip;
      clip.start(false, 1);
      clip.pause();
      let farthest = 0;
      for (let i = 0; i <= 24; i++) {
        clip.goToFrame(clip.from + ((clip.to - clip.from) * i) / 24);
        tower.node.computeWorldMatrix(true);
        hips.computeWorldMatrix(true);
        const p = hips.getAbsolutePosition();
        farthest = Math.max(farthest, Math.hypot(p.x - tower.at.x, p.z - tower.at.z));
      }

      assert.true(farthest < 0.1, `${kind}: furthest from the middle ${farthest.toFixed(3)} (a cell is ${BOARD.cell})`);
      assert.true(spec.attack.seconds > 0);
      tower.dispose();
    }
  });

  QUnit.test("a bender with two idles changes from one to the other as time goes by", (assert) => {
    const tower = new Tower(scene, loaded, "air", 0, 0, "two idles");
    const seen = new Set();
    for (let i = 0; i < 400; i++) {
      tower.update(0.05, []);
      seen.add(tower.idleNow);
    }

    assert.deepEqual([...seen].sort(), [0, 1]);
    assert.strictEqual(tower.copy.animationGroups.filter((group) => group.isPlaying).length, 1, "and only one plays");
    tower.dispose();
  });

  QUnit.test("two towers do not share a skeleton or a clip, so each is in a pose of its own", (assert) => {
    const a = new Tower(scene, loaded, "fire", 1, 1, "own a");
    const b = new Tower(scene, loaded, "fire", 2, 1, "own b");

    assert.notStrictEqual(a.copy.skeletons[0], b.copy.skeletons[0]);
    assert.notStrictEqual(a.attackClip, b.attackClip);
    a.dispose();
    b.dispose();
  });

  QUnit.test("a tower that is taken away leaves nothing behind", (assert) => {
    const meshes = scene.meshes.length;
    const groups = scene.animationGroups.length;
    const skeletons = scene.skeletons.length;
    const nodes = scene.transformNodes.length;
    const tower = new Tower(scene, loaded, "water", 4, 4, "gone");
    assert.true(scene.animationGroups.length > groups);
    tower.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.animationGroups.length, groups);
    assert.strictEqual(scene.skeletons.length, skeletons);
    assert.strictEqual(scene.transformNodes.length, nodes);
  });
});
```

- **"The bender's feet are on top of the podium"** measures the box round the bender and the box round the podium, for all four, and says the one's bottom is the other's top. If the `top` in `loadBenders` were wrong, this is the test that says by how much.
- **"Through the whole attack the bender stays over its podium"** is the test of the whole of Step 3. It steps through an attack clip and checks that the hips never go more than a tenth of a unit from the middle of the cell, when the cell is two across and the *unheld* spin jump goes two meters. If the hold didn't work, this fails.
- **"The muzzle is where the hand really is when it fires"** is the other great one. The tower says the hand is *here*; the test puts the real animation at the frame it should be at, asks the real skeleton where its hands are, and checks that one of them is within 0.15 of that. (It puts the fade out of the way first: the clock doesn't run in a test, so a fade would never finish.) It checks the scale, the turn, the height of the podium and the clip together.
- **Tests use `goToFrame` because there is no clock.** In a game the engine moves every animation on a little each frame. In a test nothing does, so a test that wants a pose has to ask for it.
- **"Two towers do not share a skeleton or a clip"** and **"a tower that is taken away leaves nothing behind"** are the same two tests as the enemies', for the same reasons.

**Check:** open `tests.html`. 354 tests pass.

---

## Step 6: Bolts

A shot is a moment; a bolt is how you see it. This one is a glowing ball that flies from the hand to the enemy and is gone: no damage yet, no effect, nothing that depends on the nation but its color. It's there so that you can see with your own eyes that the tower shot the right enemy at the right moment.

Open the placeholder `js/bolts.js` and replace its contents with:

```js
// Bolts: what a bender throws. For now it is a glowing ball that flies to the enemy it was thrown at,
// following it as it walks, and is gone when it gets there. (The effect of each nation, and what the
// hit does to the enemy, come in later tutorials: this is only so that you can see that the tower
// shot at the right enemy at the right moment.) See ../tests/bolts.tests.js.

const BOLT = {
  speed: 9, // world units a second
  size: 0.28, // how wide the ball is
  hit: 0.25, // how near to its target it has to be to have hit it
};

// One step towards a place: from `from`, `distance` of the way to `to`, but no further. It says where it
// got to, and whether that is where it was going: { x, y, z, arrived }.
function stepToward(from, to, distance) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  if (length <= distance || length === 0) return { x: to.x, y: to.y, z: to.z, arrived: true };
  const k = distance / length;
  return { x: from.x + dx * k, y: from.y + dy * k, z: from.z + dz * k, arrived: false };
}

class Bolt {
  // `from` is where it is thrown from, `enemy` who it is thrown at, `color` its color.
  constructor(scene, from, enemy, color) {
    this.enemy = enemy;
    this.at = { x: from.x, y: from.y, z: from.z };
    this.arrived = false;

    this.mesh = BABYLON.MeshBuilder.CreateSphere("bolt", { diameter: BOLT.size, segments: 8 }, scene);
    const material = new BABYLON.StandardMaterial("bolt", scene);
    material.emissiveColor = BABYLON.Color3.FromHexString(color);
    material.disableLighting = true;
    this.mesh.material = material;
    this.mesh.isPickable = false;
    this.mesh.position.set(from.x, from.y, from.z);
  }

  get done() {
    return this.arrived;
  }

  // Flies for `dt` seconds towards where the enemy is now, and about the middle of it.
  update(dt) {
    const goal = { x: this.enemy.x, y: this.enemy.aimHeight, z: this.enemy.z };
    const step = stepToward(this.at, goal, BOLT.speed * dt);
    this.at = { x: step.x, y: step.y, z: step.z };
    this.arrived = step.arrived || Math.hypot(goal.x - step.x, goal.y - step.y, goal.z - step.z) <= BOLT.hit;
    this.mesh.position.set(step.x, step.y, step.z);
  }

  dispose() {
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOLT, stepToward, Bolt };
} else {
  Object.assign(window, { BOLT, stepToward, Bolt });
}
```

- **`stepToward` is the one piece of arithmetic.** From a place, go a distance towards another, in a straight line in three dimensions; if the distance is more than there is left, stop **on** the place, and say that you arrived. It is a pure function, and it is why a bolt can't overshoot.
- **The bolt flies at a constant speed and *follows* the enemy.** Every frame it works out where the enemy is now (the middle of it, `aimHeight` up) and takes a step. A bolt that flew to where the enemy *was* would miss whenever the enemy moved, and an enemy is always moving. A bolt is faster than any enemy, so it always catches up.
- **It has hit when it is within `BOLT.hit` of its target.** The bolt doesn't need to be on the exact point: it's near enough.
- **An enemy that has gone** (taken out of the game when it got to the end) still has the place where it was, so the bolt flies there and ends, as it should. There is no case where a bolt would wait for ever.
- **`dispose` takes away the material as well as the mesh,** because a bolt makes one of its own, and a game that throws a bolt a second for an hour would otherwise be keeping thousands of them.

Open the placeholder `tests/bolts.tests.js` and replace its contents with:

```js
QUnit.module("stepToward", () => {
  const origin = { x: 0, y: 0, z: 0 };

  QUnit.test("goes the distance asked, in the direction of the place", (assert) => {
    const p = stepToward(origin, { x: 10, y: 0, z: 0 }, 3);

    assert.deepEqual({ x: p.x, y: p.y, z: p.z }, { x: 3, y: 0, z: 0 });
    assert.false(p.arrived);
  });

  QUnit.test("goes in a straight line in three dimensions", (assert) => {
    const p = stepToward(origin, { x: 3, y: 4, z: 12 }, 6.5);

    assert.true(Math.abs(p.x - 1.5) < 1e-9 && Math.abs(p.y - 2) < 1e-9 && Math.abs(p.z - 6) < 1e-9);
  });

  QUnit.test("does not go past the place: it stops on it, and says so", (assert) => {
    const p = stepToward(origin, { x: 1, y: 1, z: 1 }, 99);

    assert.deepEqual({ x: p.x, y: p.y, z: p.z, arrived: p.arrived }, { x: 1, y: 1, z: 1, arrived: true });
  });

  QUnit.test("a step of exactly the distance arrives", (assert) => {
    assert.true(stepToward(origin, { x: 0, y: 5, z: 0 }, 5).arrived);
  });

  QUnit.test("already there is arrived, and does not divide by nothing", (assert) => {
    const p = stepToward({ x: 2, y: 2, z: 2 }, { x: 2, y: 2, z: 2 }, 1);

    assert.true(p.arrived);
    assert.strictEqual(p.x, 2);
  });

  QUnit.test("it does not change the places it is given", (assert) => {
    const from = { x: 0, y: 0, z: 0 };
    stepToward(from, { x: 5, y: 5, z: 5 }, 1);

    assert.deepEqual(from, { x: 0, y: 0, z: 0 });
  });
});

QUnit.module("Bolt", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // An enemy that stands where it is told to, so that a test can say where it is.
  const target = (x, z, aimHeight = 1) => ({ x, z, aimHeight });

  QUnit.test("begins where it is thrown from, not arrived", (assert) => {
    const bolt = new Bolt(scene, { x: 1, y: 2, z: 3 }, target(9, 9), "#ff0000");

    assert.deepEqual(bolt.mesh.position.asArray(), [1, 2, 3]);
    assert.false(bolt.done);
  });

  QUnit.test("is the color it is given, and glows", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(5, 0), "#38b6ff");

    assert.strictEqual(bolt.mesh.material.emissiveColor.toHexString().toLowerCase(), "#38b6ff");
    assert.true(bolt.mesh.material.disableLighting);
  });

  QUnit.test("flies towards the enemy at its speed", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(20, 0, 1), "#ffffff");
    bolt.update(1);

    assert.true(Math.abs(bolt.mesh.position.x - BOLT.speed) < 1e-9);
    assert.true(Math.abs(bolt.mesh.position.y - 1) < 1e-9);
  });

  QUnit.test("goes to about the middle of the enemy, and not its feet", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 3, z: 0 }, target(0, 5, 0.8), "#ffffff");
    for (let i = 0; i < 100 && !bolt.done; i++) bolt.update(0.05);

    assert.true(Math.abs(bolt.mesh.position.y - 0.8) < BOLT.hit + 1e-9);
  });

  QUnit.test("arrives when it is as near as the hit distance, and is done", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(5, 0, 1), "#ffffff");
    let time = 0;
    while (!bolt.done && time < 10) {
      bolt.update(0.01);
      time += 0.01;
    }

    assert.true(bolt.done);
    assert.true(Math.abs(time - (5 - BOLT.hit) / BOLT.speed) < 0.03, `${time}`);
  });

  QUnit.test("follows an enemy that is walking away", (assert) => {
    const enemy = target(5, 0);
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff");
    for (let i = 0; i < 20; i++) {
      enemy.x += 0.05;
      bolt.update(0.02);
    }

    assert.false(bolt.done, "it is still on its way");
    assert.true(bolt.mesh.position.x > 2.5);
    for (let i = 0; i < 200 && !bolt.done; i++) {
      enemy.x += 0.05;
      bolt.update(0.02);
    }
    assert.true(bolt.done, "it catches up with an enemy that is slower than it is");
  });

  QUnit.test("an enemy that is gone (still, where it was last) is flown to, and hit", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(4, 3, 1), "#ffffff");
    for (let i = 0; i < 200 && !bolt.done; i++) bolt.update(0.02);

    assert.true(bolt.done);
  });

  QUnit.test("a bolt that is thrown at something right beside it is done at once", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(0.1, 0, 1), "#ffffff");
    bolt.update(0.016);

    assert.true(bolt.done);
  });

  QUnit.test("dispose takes it out of the scene, with its material", (assert) => {
    const meshes = scene.meshes.length;
    const materials = scene.materials.length;
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(5, 0), "#ffffff");
    bolt.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.materials.length, materials);
  });
});
```

- **`target` makes an enemy that stands where it is told to,** with the three things a bolt asks for: `x`, `z` and `aimHeight`.
- **"Follows an enemy that is walking away"** moves the enemy a little every step, checks that the bolt is still in the air after a while, and then that it does catch up.
- **"Dispose takes it out of the scene, with its material"** counts the meshes and the materials in the scene before and after.

**Check:** open `tests.html`. 369 tests pass.

---

## Step 7: The game

The page and the test page already load every new script (you were given `index.html` and `tests.html` with their `<script>` lines). The last change is `main.js`: it places four towers beside the road, and every frame it lets each look at the enemies and throws a bolt at each shot.

First, the demonstration table. There is no building yet, so each map has four towers in it, one of each nation, in places that are beside the road:

In `js/main.js`, **replace** lines 19 to 20:

```js
// road, so that you can see them.
const DEMO = { gap: 2.5, order: ["grunt", "scout", "heavy", "dai_li", "spirit"] };
```

with:

```js
// road, so that you can see them. And there is no building: each map has four towers, one of each nation,
// beside the road, put there to shoot at them. (The next tutorial lets you build them.)
const DEMO = {
  gap: 2.5,
  order: ["grunt", "scout", "heavy", "dai_li", "spirit"],
  towers: [
    [
      { kind: "air", col: 4, row: 2 },
      { kind: "water", col: 8, row: 2 },
      { kind: "earth", col: 6, row: 4 },
      { kind: "fire", col: 6, row: 6 },
    ],
    [
      { kind: "air", col: 2, row: 4 },
      { kind: "water", col: 5, row: 4 },
      { kind: "earth", col: 8, row: 4 },
      { kind: "fire", col: 11, row: 4 },
    ],
  ],
};
```

Then the towers are made, after the enemies are loaded:

In `js/main.js`, after line 73, add:

```js
  // The towers. Each has to be in a place where one can be built (a mistake in the table says so, and stops).
  const benders = await loadBenders(scene);
  const places = DEMO.towers[mapNumber % DEMO.towers.length];
  places.forEach(({ col, row }, i) => {
    const { ok, reason } = canBuild(grid, col, row, places.slice(0, i));
    if (!ok) throw new Error(`A tower can't go at column ${col}, row ${row}: ${reason}.`);
  });
  const towers = places.map(({ kind, col, row }) => new Tower(scene, benders, kind, col, row));
  let bolts = [];

```

- **Each place is checked with `canBuild` before the tower goes in it,** and a mistake in the table stops the game with a sentence that says what. `places.slice(0, i)` is "the towers before this one", so that two in the same cell are caught as well.
- **`loadBenders` loads eight models and holds the hips of every clip,** once. The towers are then made from them, as many as are asked for.

And last, in the frame function, the towers look at the enemies and the bolts fly:

In `js/main.js`, after line 107, add:

```js

    // Every tower looks at the enemies, and throws a bolt at each one it shoots. The bolts fly until they arrive.
    for (const tower of towers) {
      for (const shot of tower.update(dt, enemies)) bolts.push(new Bolt(scene, shot.muzzle, shot.enemy, shot.color));
    }
    bolts.forEach((bolt) => bolt.update(dt));
    bolts = bolts.filter((bolt) => {
      if (!bolt.done) return true;
      bolt.dispose();
      return false;
    });
```

- **The order matters.** The enemies move first, and the towers then look at where they are, and the bolts fly last, so a bolt is always going towards where the enemy is *now*.
- **Done bolts are disposed of** in the same way as the enemies, and for the same reason.

**Check:** open `tests.html`. 369 tests pass. Then open `index.html` through the web server. Four podiums with four benders on them stand beside the road, each waiting in its own pose. When an enemy comes into range of one, the bender turns to face it, throws its attack, and a glowing ball flies from its hand to the enemy: white for air, blue for water, brown for earth, orange for fire. They don't hurt anything yet.

---

## Step 8: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **Watch a bender attack.** The bender turns *before* it throws, and the ball leaves at the moment its hand is out, and not before.
- **The hips.** In `benders.js`, make `holdHips` do nothing (return `false` at the top) and reload. The earth bender's jab and the air nomad's spell make him step off his podium. Put it back.
- **Faster, slower.** Change the `speed` of an attack to `1`: the real speed of the clip, three seconds for the air nomad. The ball leaves much later, and the tower can't attack again until the cooldown, which is shorter than the attack, and the tests say so.
- **A different attack.** In `BENDERS`, change the earth bender's clip to `"Spartan_Kick"` (it has `seconds` of 1.4). The tests of the numbers say that `hitAt`, `aim` and `muzzle` are now out of date, and give the numbers they measured.
- **How they choose.** In `brain.js` change the default `mode` in the `TowerBrain` constructor to `"closest"` or `"last"`.
- **Range.** Make `range` of the air nomad 12 and the towers all shoot across the board.
- **Where.** Change a tower in the `DEMO` table of `main.js` to a cell that is road: the game stops, and the sentence says why.
- **Bigger.** Change `TOWER.benderHeight` to `2`: every bender gets taller, the muzzle moves with it (a test checks that), and the bolt still leaves the hand.
- **A phone.** In device mode, check the towers are still easy to tell apart at a small size.

---

## Troubleshooting

- **The splash never goes, and the console says something is not defined:** a script is missing from `index.html`, or one of the new files has no export block. The scripts have to be in the order the file lists them: `targeting.js` before `brain.js`, and `benders.js` before `tower.js`.
- **A bender stands in the podium, or floats above it:** `podium.top` in `loadBenders`, or `bender.lift`. The test "the bender's feet are on top of the podium" says how far out it is.
- **A bender wanders off his podium in an attack:** `holdHips` isn't being run on that clip, or the track is not being found (the name of the hips node is `mixamorig:Hips`, and the property is `position`).
- **A bender turns his back to the enemy:** `facing` or the `aim` is wrong. The bender faces along z; a test says what angle each direction is.
- **The ball starts from his feet, or from beside him:** `muzzleAt`, and the numbers in `muzzle`. The test "the muzzle is where the hand really is" says how far out.
- **The ball leaves at the wrong moment:** `hitAt`. The tests of the table say whether it is the moment the hand is out.
- **A tower never attacks:** the enemy is out of range, or the cooldown is longer than the time between enemies, or the brain isn't being given the list of enemies.
- **The towers jump from one pose to the next:** `enableBlending` is not set on the clips, or a clip is started without the one before it being stopped.
- **The game slows down after a while:** a bolt or an enemy isn't disposed of.

---

## What you have

Four towers that look, turn, attack in place and shoot, from a brain that is state and events, a table of what a bender is, animations with their wandering taken out, a hand that is found by arithmetic and agrees with the real one, and a test suite of 369 tests behind it.

**Next up:** building. The next tutorial lets you **drag** a podium from a tray onto the board, with an outline that is red where you can't build and green where you can (that is the rule from Step 2), and gold to pay for it.
