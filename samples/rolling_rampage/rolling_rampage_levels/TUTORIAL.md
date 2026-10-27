# Tutorial: Rolling Rampage Levels -- A Course Drawn as a Grid of Heights

This is the fourth tutorial in the Rolling Rampage series. So far the marble has rolled on a handful of boxes written out by hand. A real game needs many courses, and nobody wants to work out the angle of every ramp. In this step you draw a course the way a level designer would, as a **grid of numbers**: each number is a height, a row of rising numbers is a ramp, and a dot is a hole to fall into. Code turns the grid into a floor, with walls under its edges, and Havok lets the marble roll on it. You also add what a game needs around a level: a place to start, a line below which the marble has **fallen off**, and a way to go on to the **next level**. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Levels as data**: a few lines of text each, with a start, that are easy to write and easy to test
- A way to ask **how high the floor is** anywhere in a level, which is how the marble is put on it and how the tests know where it should be
- The **triangles** of the floor and its walls, as plain lists of numbers, and tests that check which way each one faces
- A **mesh** made from those triangles, and a Havok **mesh shape** so the marble rolls on the triangles themselves
- A **fall limit** worked out from the level, so falling off any level puts the marble back at its start
- **Two levels** and a button (and the **N** key) to go on to the next, which builds one and takes the other away
- Unit tests for all of it, **including a real marble** dropped on, rolled down, and let fall off the levels

**What you'll learn:** a level as data, a grid of corner heights and why that gives ramps for free, building a mesh from `VertexData` (points, indices, UVs, normals), the order of a triangle's points and the side that is drawn, a Havok mesh shape for static terrain, working out the height of a floor from the triangles, walls under a level so its edge has a side, building and disposing of a level while the game runs, and testing geometry by asking which way each triangle faces.

## Where you're starting

This folder is a copy of the finished Tilt sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_levels/
├── index.html, tests.html   (change -- Steps 1 and 5)
├── css/
│   └── game.css            (grows -- Step 5)
├── js/
│   ├── level.js            (placeholder -- Steps 1 to 4)
│   ├── main.js             (changes -- Step 5)
│   └── physics.js, course.js, marble.js, steering.js, controls.js, tilt.js, camera.js, splash.js   (from the Tilt sample)
└── tests/
    ├── level.tests.js      (placeholder)
    └── the rest            (from the Tilt sample)
```

**The slabs of the first tutorials stay.** `course.js` (the hand-written ramps and decks) is no longer what the game plays on, but the marble's tests still use it as a small, known world to drop a marble into, so it stays as the test bench. The game itself now plays the levels.

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_levels/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Tilt sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**223**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: A level is a grid

A level is a few lines of text. Each character is the height of one **corner** of the floor, a digit (in steps of half a unit) or a dot for "nothing here". The floor between four corners is a square, tipped to fit them. So:

- a row of digits that rise (`4567`) is a **ramp**,
- digits that are all the same are a **flat deck**,
- a **dot** is a hole, or the edge of the level, where a marble falls.

There is a catch worth knowing now: because neighbouring squares share their corners, the floor is always joined up. You can't draw a cliff between two squares that are both there, only a slope. A drop is made with a dot: a gap between a high part and a low part.

Everything about a level that doesn't need Babylon.js goes in a file of its own, so it can be tested with no screen. Open the placeholder `js/level.js` and replace its contents with:

```js
// Levels: a course drawn as a grid of heights. Each character is the height of one corner of the
// floor (a digit, in steps of HEIGHT_STEP) or a dot for nothing there at all. The floor between
// four corners is a square, tipped to fit them, so a row of rising digits is a ramp, and a dot is a
// hole or an edge to fall off. The grid is turned into plain lists of numbers (the corners of
// triangles), and only then into a mesh, so the rules are easy to test. See ../tests/level.tests.js.

const CELL = 2; // how far apart the corners of the grid are, in world units
const HEIGHT_STEP = 0.5; // how high a "1" in the grid is, in world units
const SKIRT_BOTTOM = -2; // the walls under the edge of a level go down to here
const FALL_MARGIN = 6; // a marble this far below the lowest floor has fallen off
const DROP_HEIGHT = 0.5; // how far above the floor a marble starts, so it is dropped on to it

// The levels. In the grid, rows go along z and columns along x, so on the screen the first
// column is the corner at the left, and the rows climb away to the right. `start` is a
// { col, row } in the grid, between corners if it likes.
const LEVELS = [
  {
    name: "Practice Run",
    start: { col: 1.5, row: 2 },
    rows: [
      "8888765432222",
      "8888765432222",
      "8888765432222",
      "8888765432222",
      "8888765432222",
      ".........2222",
      ".........2222",
      ".........1111",
      ".........0000",
      ".........0000",
      ".........0000",
      ".........0000",
    ],
  },
  {
    name: "The Bridge",
    start: { col: 1, row: 4 },
    rows: [
      ".................",
      "..............000",
      "666543........000",
      "66654333333321000",
      "66654333333321000",
      "66654333333321000",
      "666543........000",
      "..............000",
      ".................",
    ],
  },
];

// A level's grid as numbers: `heights[row][col]` is the height of a corner in world units, or
// null where the grid has a dot.
function parseLevel(level) {
  return {
    name: level.name,
    cols: level.rows[0].length,
    rows: level.rows.length,
    heights: level.rows.map((row) => [...row].map((ch) => (ch === "." ? null : Number(ch) * HEIGHT_STEP))),
    start: level.start,
  };
}

// The height of the corner at a column and row, or null if there is no corner there (a dot, or
// past the edge of the grid).
function cornerHeight(grid, col, row) {
  const heights = grid.heights[row];
  if (!heights || heights[col] === undefined) return null;
  return heights[col];
}

// Whether there is floor in the square whose corner nearest the origin is at (col, row): only if
// all four of its corners are there.
function cellExists(grid, col, row) {
  return [[0, 0], [1, 0], [0, 1], [1, 1]].every(([dc, dr]) => cornerHeight(grid, col + dc, row + dr) !== null);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists };
} else {
  Object.assign(window, { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists });
}
```

Things to notice:

- **The grid is drawn the way the world is laid out.** Rows run along `z` and columns along `x`. The camera looks from a corner, so on the screen the first column is the corner at the left and the rows climb away to the right. It takes a minute to read, and the picture on the screen is the quickest way to learn it.
- **`start` is in grid units and can be between corners**: `{ col: 1.5, row: 2 }` is a point in the middle of a square.
- **The constants have names.** `CELL` is how far apart corners are in the world, `HEIGHT_STEP` what a "1" means. Change either and every level changes with it. The other three (`SKIRT_BOTTOM`, `FALL_MARGIN`, `DROP_HEIGHT`) are used in the next steps.
- **Slopes can't be too steep.** One step of `HEIGHT_STEP` across one `CELL` is a slope of a quarter, and a marble rolls down that comfortably. Two steps is a half, and about as steep as is fun. A test will keep the levels to that.
- **`parseLevel` turns characters into numbers once**, so nothing else deals with text. A dot becomes `null`, which is how the rest of the code asks "is there floor here?".
- **`cellExists` needs all four corners.** A dot at any one of them takes the whole square away, which is what makes a hole with a clean edge.

### Tests

Add the new script and its tests to `tests.html`, after `course.js` and `course.tests.js`:

```html
  <script src="js/level.js"></script>
  <script src="tests/level.tests.js"></script>
```

(The first goes in the list of game scripts, the second in the list of tests.) Now open the placeholder `tests/level.tests.js` and replace its contents with:

```js
// A small grid to test with, so the numbers are easy to check by hand.
const gridOf = (rows, start = { col: 0, row: 0 }) => parseLevel({ name: "test", rows, start });

QUnit.module("LEVELS", () => {
  QUnit.test("every level has a name, a start and some rows, and the names are different", (assert) => {
    for (const level of LEVELS) {
      assert.true(level.name.length > 0);
      assert.true(level.rows.length > 1, `${level.name} has rows`);
      assert.strictEqual(typeof level.start.col, "number");
      assert.strictEqual(typeof level.start.row, "number");
    }
    assert.strictEqual(new Set(LEVELS.map((level) => level.name)).size, LEVELS.length);
  });

  QUnit.test("every row of a level is as long as the first", (assert) => {
    for (const level of LEVELS) {
      for (const row of level.rows) assert.strictEqual(row.length, level.rows[0].length, level.name);
    }
  });

  QUnit.test("a level is made only of digits and dots", (assert) => {
    for (const level of LEVELS) {
      for (const row of level.rows) assert.true(/^[0-9.]+$/.test(row), `${level.name}: ${row}`);
    }
  });
});

QUnit.module("parseLevel", () => {
  QUnit.test("keeps the name and the start, and says how big the grid is", (assert) => {
    const grid = parseLevel({ name: "Tiny", start: { col: 1, row: 1 }, rows: ["000", "000"] });

    assert.strictEqual(grid.name, "Tiny");
    assert.deepEqual(grid.start, { col: 1, row: 1 });
    assert.strictEqual(grid.cols, 3);
    assert.strictEqual(grid.rows, 2);
  });

  QUnit.test("a digit is that many steps high", (assert) => {
    const grid = gridOf(["03", "80"]);

    assert.deepEqual(grid.heights, [[0, 3 * HEIGHT_STEP], [8 * HEIGHT_STEP, 0]]);
  });

  QUnit.test("a dot is nothing at all", (assert) => {
    const grid = gridOf(["0.", ".0"]);

    assert.deepEqual(grid.heights, [[0, null], [null, 0]]);
  });
});

QUnit.module("cornerHeight", () => {
  const grid = gridOf(["02", "4."]);

  QUnit.test("is the height of the corner at a column and row", (assert) => {
    assert.strictEqual(cornerHeight(grid, 0, 0), 0);
    assert.strictEqual(cornerHeight(grid, 1, 0), 2 * HEIGHT_STEP);
    assert.strictEqual(cornerHeight(grid, 0, 1), 4 * HEIGHT_STEP);
  });

  QUnit.test("is null for a dot", (assert) => {
    assert.strictEqual(cornerHeight(grid, 1, 1), null);
  });

  QUnit.test("is null past the edge of the grid, whichever edge", (assert) => {
    assert.strictEqual(cornerHeight(grid, -1, 0), null);
    assert.strictEqual(cornerHeight(grid, 2, 0), null);
    assert.strictEqual(cornerHeight(grid, 0, -1), null);
    assert.strictEqual(cornerHeight(grid, 0, 2), null);
  });
});

QUnit.module("cellExists", () => {
  QUnit.test("a square has floor if all four of its corners are there", (assert) => {
    assert.true(cellExists(gridOf(["00", "00"]), 0, 0));
  });

  QUnit.test("a dot at any corner takes the square away", (assert) => {
    for (const rows of [[".0", "00"], ["0.", "00"], ["00", ".0"], ["00", "0."]]) {
      assert.false(cellExists(gridOf(rows), 0, 0), rows.join("/"));
    }
  });

  QUnit.test("there is no square at the last column or row, or off the grid", (assert) => {
    const grid = gridOf(["000", "000", "000"]);

    assert.true(cellExists(grid, 1, 1));
    assert.false(cellExists(grid, 2, 0), "the last column has no square to the right");
    assert.false(cellExists(grid, 0, 2), "the last row has no square below");
    assert.false(cellExists(grid, -1, 0));
    assert.false(cellExists(grid, 0, -1));
  });
});
```

Things to notice:

- **`gridOf` is a small helper** that makes a grid from a few rows, so each test can say exactly the little world it needs, and its numbers can be checked by hand.
- **The tests on `LEVELS` check every level you will ever write**: rows of one length, nothing but digits and dots. A typo in a level fails a test instead of making a strange floor.

Open `tests.html`. You should see **235 passing tests**: the 223 you started with and 12 new ones.

---

## Step 2: How high is the floor?

Two questions come up all the time: *how high is the floor here?* (to put the marble on it, and for tests to say where it should come to rest) and *where does a marble start?*

The floor of each square is **two triangles**, split from the square's first corner to its last. Inside a triangle the height is a plain weighted sum of its corners (a flat triangle's height is a straight-line mix, which is what a ramp is). The code only has to find which triangle the place is in, and the numbers follow.

Add these to `js/level.js`, directly below `cellExists` and above the export block:

```js
// The height of the floor at a place in the world, or null if there is no floor there. Each square
// is two triangles, split along the line from its first corner to its last, and the height is
// worked out in whichever triangle the place is in. It is the same two triangles the mesh is made of,
// so this is the height the marble really finds.
function heightAt(grid, x, z) {
  const col = Math.floor(x / CELL);
  const row = Math.floor(z / CELL);
  if (!cellExists(grid, col, row)) return null;
  const u = x / CELL - col; // how far across the square, 0 to 1
  const v = z / CELL - row; // how far along it
  const h00 = cornerHeight(grid, col, row);
  const h10 = cornerHeight(grid, col + 1, row);
  const h01 = cornerHeight(grid, col, row + 1);
  const h11 = cornerHeight(grid, col + 1, row + 1);
  if (u <= v) return h00 + (h11 - h01) * u + (h01 - h00) * v;
  return h00 + (h11 - h10) * v + (h10 - h00) * u;
}

// Where a marble starts: above the floor at the level's start, so it drops on to it.
function levelStart(grid) {
  const x = grid.start.col * CELL;
  const z = grid.start.row * CELL;
  return { x, y: heightAt(grid, x, z) + MARBLE_RADIUS + DROP_HEIGHT, z };
}

// The height of the lowest corner in the level.
function lowestHeight(grid) {
  return Math.min(...grid.heights.flat().filter((h) => h !== null));
}

// The height below which a marble has fallen off the level for good.
function fallLimit(grid) {
  return lowestHeight(grid) - FALL_MARGIN;
}
```

and the export block now has four more names:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists, heightAt, levelStart, lowestHeight, fallLimit };
} else {
  Object.assign(window, { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists, heightAt, levelStart, lowestHeight, fallLimit });
}
```

Things to notice:

- **`heightAt` uses the same two triangles the mesh will be made of.** That matters: if it used some other formula, the height it gave would be a little different from the floor the marble really finds. A test in Step 3 checks that the two agree, triangle by triangle.
- **It says `null` for "no floor".** A hole, past the edge, off the grid: all the same answer, and callers ask once.
- **`levelStart` drops the marble from half a unit above the floor**, as the start deck did, so the first thing the player sees is the marble landing.
- **The fall limit is worked out from the level**: a margin below the lowest floor. Before, one number (`FALL_LIMIT`) did for the whole course. Now a level that is deep down gets a limit that is deep down, and a level that is high up doesn't leave a marble falling for ages before it is put back.

### Tests

Add these to the bottom of `tests/level.tests.js`:

```js
QUnit.module("heightAt", () => {
  QUnit.test("a flat floor is the same height everywhere on it", (assert) => {
    const grid = gridOf(["444", "444", "444"]);

    for (const [x, z] of [[0.1, 0.1], [CELL, CELL], [3.3, 0.5], [0.5, 3.9]]) {
      assert.strictEqual(heightAt(grid, x, z), 4 * HEIGHT_STEP, `${x}, ${z}`);
    }
  });

  QUnit.test("at a corner it is the corner's height", (assert) => {
    const grid = gridOf(["024", "246", "468"]);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (!cellExists(grid, col, row)) continue; // the last row and column have no square of their own
        assert.strictEqual(heightAt(grid, col * CELL, row * CELL), cornerHeight(grid, col, row), `${col}, ${row}`);
      }
    }
  });

  QUnit.test("a ramp rises in a straight line", (assert) => {
    const grid = gridOf(["0246", "0246", "0246"]);

    // Heights go up by 2 steps a corner, so a step of 1 in x is a rise of 2 * HEIGHT_STEP / CELL.
    for (const x of [0.5, 1.5, 2.5, 3.9]) {
      assert.true(Math.abs(heightAt(grid, x, 1) - (x / CELL) * 2 * HEIGHT_STEP) < 1e-9, `x ${x}`);
    }
  });

  QUnit.test("in the middle of a square it is the average of the two corners across the diagonal", (assert) => {
    const grid = gridOf(["28", "46"]); // the corners across one diagonal are 2 and 6 steps, and across the other 8 and 4

    // The square is split from its first corner to its last, so that diagonal is the one the middle is on.
    assert.strictEqual(heightAt(grid, CELL / 2, CELL / 2), 4 * HEIGHT_STEP);
  });

  QUnit.test("is null where there is no floor: a hole, the edge of the grid, off the grid", (assert) => {
    const grid = gridOf(["00.", "000", "000"]);

    assert.strictEqual(heightAt(grid, 3, 1), null, "next to the dot");
    assert.strictEqual(heightAt(grid, -1, 1), null);
    assert.strictEqual(heightAt(grid, 1, 99), null);
  });
});

QUnit.module("levelStart", () => {
  QUnit.test("is above the floor at the start, by the marble's radius and the drop", (assert) => {
    const grid = gridOf(["444", "444", "444"], { col: 0.5, row: 0.5 });

    const start = levelStart(grid);

    assert.strictEqual(start.x, 0.5 * CELL);
    assert.strictEqual(start.z, 0.5 * CELL);
    assert.strictEqual(start.y, 4 * HEIGHT_STEP + MARBLE_RADIUS + DROP_HEIGHT);
  });

  QUnit.test("every real level starts over some floor, and well above the fall limit", (assert) => {
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      const x = grid.start.col * CELL;
      const z = grid.start.row * CELL;

      assert.notStrictEqual(heightAt(grid, x, z), null, `${level.name} has floor at its start`);
      assert.true(levelStart(grid).y > fallLimit(grid), level.name);
    }
  });
});

QUnit.module("lowestHeight and fallLimit", () => {
  QUnit.test("the lowest height is the lowest corner, and a dot doesn't count", (assert) => {
    assert.strictEqual(lowestHeight(gridOf(["50", "9."])), 0);
    assert.strictEqual(lowestHeight(gridOf(["53", "9."])), 3 * HEIGHT_STEP);
  });

  QUnit.test("the fall limit is a margin below the lowest floor", (assert) => {
    const grid = gridOf(["53", "94"]);

    assert.strictEqual(fallLimit(grid), 3 * HEIGHT_STEP - FALL_MARGIN);
  });

  QUnit.test("a marble below the limit has fallen, and one on the lowest floor has not", (assert) => {
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      assert.true(hasFallen(lowestHeight(grid) - FALL_MARGIN - 1, fallLimit(grid)), level.name);
      assert.false(hasFallen(lowestHeight(grid) + MARBLE_RADIUS, fallLimit(grid)), level.name);
    }
  });
});
```

Things to notice:

- **"At a corner it is the corner's height"** is tested at every corner of a small grid, and **"in the middle of a square"** checks the diagonal the square is split along. Between them, both triangles' sums are covered.
- **Every real level is checked to start over some floor.** A level whose start has a dot under it would drop the marble straight out of the world.

Open `tests.html`. You should see **245 passing tests**: ten more.

---

## Step 3: The triangles

To draw a level, and for Havok to roll a marble on it, the grid has to become **triangles**: lists of numbers that Babylon.js can take. A mesh is three lists:

- **`positions`**: `x, y, z` of every point, one after another,
- **`indices`**: three points to a triangle, by their numbers in the list,
- **`uvs`**: where each point is on the texture, `u, v`.

(And a fourth, the *normals*, which say which way each point faces so the light can shade it. Babylon.js can work those out, and does, in Step 4.)

The floor uses a point for each used corner, shared by the squares that meet there, so a slope is smooth. The **walls** are different: the edge of a level has no side unless we make one. Wherever a square has no square next to it, a wall hangs from that edge down to `SKIRT_BOTTOM`. Walls have points of their own, so the sharp corner between a floor and its wall isn't smoothed away.

There is one thing that goes wrong for everybody the first time, and it is the order of the points. A triangle has a **front** and a back, and only the front is drawn. Which side is the front depends on the order the three points are listed in. Get it wrong and you get a floor that isn't there, and the *insides* of the far walls instead. It also decides which way the triangle faces for the light. So the tests below check it by asking which way every triangle faces, using the same sum Babylon.js uses.

Add this to `js/level.js`, directly below `fallLimit` and above the export block. It is one long function: paste it whole, to its closing `}` after `return { positions, uvs, indices };`:

```js
// The triangles of a level, as plain lists of numbers: `positions` (x, y and z of every point, one
// after another), `uvs` (where each point is on the texture) and `indices` (three points to a
// triangle). The floor is made of the corners, shared between the squares that meet at them, so
// it is smooth. The walls under the edges (every side of a square that has no square next to it) have
// points of their own, so they stay sharp-edged.
function levelGeometry(grid) {
  const positions = [];
  const uvs = [];
  const indices = [];

  const addPoint = (x, y, z, u, v) => {
    positions.push(x, y, z);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };

  // The floor: a point for every corner that is used, made the first time it is asked for.
  const corners = new Map();
  const corner = (col, row) => {
    const key = row * grid.cols + col;
    if (!corners.has(key)) {
      const x = col * CELL;
      const z = row * CELL;
      corners.set(key, addPoint(x, cornerHeight(grid, col, row), z, x / TILE, z / TILE));
    }
    return corners.get(key);
  };

  // A wall down from one side of a square, from (ax, az) to (bx, bz) with the floor at heights ah
  // and bh, facing the way (nx, nz). Babylon.js only draws the front of a triangle, and which side is
  // the front depends on the order of its points, so the wall's points are given in the order that
  // makes its outside the front: starting at the end that is on the left as seen from outside.
  const wall = (ax, az, ah, bx, bz, bh, nx, nz) => {
    // Looking at the wall from outside, `right` is the way to the right. Find which end is which.
    const right = { x: -nz, z: nx };
    const aIsLeft = ax * right.x + az * right.z < bx * right.x + bz * right.z;
    const [lx, lz, lh, rx, rz, rh] = aIsLeft ? [ax, az, ah, bx, bz, bh] : [bx, bz, bh, ax, az, ah];
    const along = (x, z) => (x * Math.abs(nz) + z * Math.abs(nx)) / TILE; // the texture runs along the wall
    const topLeft = addPoint(lx, lh, lz, along(lx, lz), lh / TILE);
    const topRight = addPoint(rx, rh, rz, along(rx, rz), rh / TILE);
    const bottomRight = addPoint(rx, SKIRT_BOTTOM, rz, along(rx, rz), SKIRT_BOTTOM / TILE);
    const bottomLeft = addPoint(lx, SKIRT_BOTTOM, lz, along(lx, lz), SKIRT_BOTTOM / TILE);
    indices.push(topLeft, bottomRight, topRight, topLeft, bottomLeft, bottomRight);
  };

  for (let row = 0; row < grid.rows - 1; row++) {
    for (let col = 0; col < grid.cols - 1; col++) {
      if (!cellExists(grid, col, row)) continue;
      const p00 = corner(col, row);
      const p10 = corner(col + 1, row);
      const p01 = corner(col, row + 1);
      const p11 = corner(col + 1, row + 1);
      indices.push(p00, p11, p01, p00, p10, p11); // in the order that makes the top the front

      const h00 = cornerHeight(grid, col, row);
      const h10 = cornerHeight(grid, col + 1, row);
      const h01 = cornerHeight(grid, col, row + 1);
      const h11 = cornerHeight(grid, col + 1, row + 1);
      const x0 = col * CELL;
      const x1 = x0 + CELL;
      const z0 = row * CELL;
      const z1 = z0 + CELL;
      if (!cellExists(grid, col, row - 1)) wall(x0, z0, h00, x1, z0, h10, 0, -1);
      if (!cellExists(grid, col, row + 1)) wall(x0, z1, h01, x1, z1, h11, 0, 1);
      if (!cellExists(grid, col - 1, row)) wall(x0, z0, h00, x0, z1, h01, -1, 0);
      if (!cellExists(grid, col + 1, row)) wall(x1, z0, h10, x1, z1, h11, 1, 0);
    }
  }
  return { positions, uvs, indices };
}
```

and the export block gains `levelGeometry`:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists, heightAt, levelStart, lowestHeight, fallLimit, levelGeometry };
} else {
  Object.assign(window, { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists, heightAt, levelStart, lowestHeight, fallLimit, levelGeometry });
}
```

Things to notice:

- **`corner` makes a point the first time it is asked for** (it keeps them in a `Map`, keyed by where they are in the grid), and gives the same one back after. That is how neighbouring squares share.
- **The two triangles are `p00, p11, p01` and `p00, p10, p11`**: split from the first corner to the last, as in `heightAt`, and listed in the order that makes the top the front.
- **A wall is found by looking at the four neighbours.** For each of its four sides, if `cellExists` says there is no square there, the side is an edge and gets a wall.
- **`wall` works out which end is on the left**, as seen from outside, so the same code does all four sides, whichever way they face.
- **The texture runs along the wall and down it**, at the same size as on the floor, so the checks line up.

### Tests

Add these to the bottom of `tests/level.tests.js`:

```js
QUnit.module("levelGeometry", () => {
  const one = gridOf(["00", "00"]); // a single square
  const two = gridOf(["000", "000"]); // two squares side by side

  // The three points of every triangle, and the way it faces.
  const triangles = (grid) => {
    const { positions, indices } = levelGeometry(grid);
    const point = (i) => new BABYLON.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    const result = [];
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [point(indices[i]), point(indices[i + 1]), point(indices[i + 2])];
      // This is the sum Babylon.js uses to work out which way a triangle faces (and so which side is its front).
      const normal = BABYLON.Vector3.Cross(c.subtract(a), b.subtract(a));
      result.push({ a, b, c, area: normal.length() / 2, normal: normal.normalize() });
    }
    return result;
  };

  QUnit.test("the lists are the right lengths for what they describe", (assert) => {
    const { positions, uvs, indices } = levelGeometry(one);

    assert.strictEqual(positions.length % 3, 0);
    assert.strictEqual(uvs.length / 2, positions.length / 3, "a texture position for every point");
    assert.strictEqual(indices.length % 3, 0);
    assert.true(indices.every((i) => Number.isInteger(i) && i >= 0 && i < positions.length / 3), "every index is a point");
  });

  QUnit.test("a single square is two triangles of floor and four walls of two triangles each", (assert) => {
    assert.strictEqual(levelGeometry(one).indices.length / 3, 2 + 4 * 2);
  });

  QUnit.test("squares side by side share their corners, and have no wall between them", (assert) => {
    const { positions, indices } = levelGeometry(two);

    // 6 corners, and a wall on each of the 6 outside edges, each with 4 points of its own.
    assert.strictEqual(positions.length / 3, 6 + 6 * 4);
    assert.strictEqual(indices.length / 3, 2 * 2 + 6 * 2);
  });

  QUnit.test("a dot takes away every square that touches it", (assert) => {
    assert.strictEqual(levelGeometry(gridOf(["000", "0.0", "000"])).indices.length, 0, "all four squares are gone");
    assert.true(levelGeometry(gridOf(["000", "000", "00."])).indices.length > 0, "but three are left here");
  });

  QUnit.test("no triangle is flat on its edge, in any real level", (assert) => {
    for (const level of LEVELS) {
      for (const t of triangles(parseLevel(level))) assert.true(t.area > 1e-6, `${level.name}: a triangle with no area`);
    }
  });

  QUnit.test("the floor faces up and the walls face out", (assert) => {
    const middle = { x: CELL / 2, z: CELL / 2 };

    let floor = 0;
    let walls = 0;
    for (const t of triangles(one)) {
      if (t.normal.y > 0.99) {
        floor++;
      } else {
        walls++;
        assert.true(Math.abs(t.normal.y) < 1e-9, "a wall is upright");
        const centre = t.a.add(t.b).add(t.c).scale(1 / 3);
        const outward = (centre.x - middle.x) * t.normal.x + (centre.z - middle.z) * t.normal.z;
        assert.true(outward > 0, `a wall at ${centre.x}, ${centre.z} faces out`);
      }
    }
    assert.strictEqual(floor, 2);
    assert.strictEqual(walls, 8);
  });

  QUnit.test("the walls go down to the bottom", (assert) => {
    const { positions } = levelGeometry(one);
    const ys = positions.filter((_, i) => i % 3 === 1);

    assert.strictEqual(Math.min(...ys), SKIRT_BOTTOM);
  });

  QUnit.test("the floor is the same triangles heightAt works with, in every real level", (assert) => {
    const problems = [];
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      for (const t of triangles(grid)) {
        if (t.normal.y < 0.5) continue; // a wall
        const centre = t.a.add(t.b).add(t.c).scale(1 / 3);
        const height = heightAt(grid, centre.x, centre.z);
        if (height === null || Math.abs(height - centre.y) > 1e-9) problems.push(`${level.name} at ${centre.x}, ${centre.z}: ${height} not ${centre.y}`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("no slope in a real level is steeper than half", (assert) => {
    const problems = [];
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const here = cornerHeight(grid, col, row);
          for (const [dc, dr] of [[1, 0], [0, 1]]) {
            const there = cornerHeight(grid, col + dc, row + dr);
            if (here === null || there === null) continue;
            if (Math.abs(there - here) / CELL > 0.5) problems.push(`${level.name} at ${col}, ${row}`);
          }
        }
      }
    }
    assert.deepEqual(problems, []);
  });
});
```

Things to notice:

- **`triangles` takes the lists apart again**, into the three points of each triangle and the way it faces, so the tests can say things about *triangles* and not about positions in a list.
- **"The floor faces up and the walls face out"** is the one that catches a wrong order of points. For each wall triangle it checks that the way it faces points *away* from the middle of the level.
- **"The floor is the same triangles `heightAt` works with, in every real level"** takes the middle of every floor triangle of both levels and checks that `heightAt` gives that triangle's height there. If the mesh was split along the other diagonal, this would fail.
- **"No slope is steeper than half"** keeps every level you ever write to a floor a marble can climb.

Open `tests.html`. You should see **254 passing tests**: nine more.

---

## Step 4: A level in the world

Now the part that needs Babylon.js: a mesh from the lists, with a physics body.

Add this to `js/level.js` **after the whole of `levelGeometry`**: below its last line, the closing `}` that follows `return { positions, uvs, indices };`, and above the export block. (`levelGeometry` is a long function, so check that its closing `}` is above what you paste. If `buildLevel` ends up inside it, nothing else can see it, and the page stops with `ReferenceError: buildLevel is not defined`.)

```js
// Makes a level in a scene: a mesh of the floor and the walls, and a physics body for it that never
// moves (`mass: 0`), as the slabs of the test course are. Returns the grid, the mesh, and a
// `dispose()` that takes the level away again, so the next one can be put in its place.
function buildLevel(scene, level) {
  const grid = parseLevel(level);
  const { positions, uvs, indices } = levelGeometry(grid);

  const mesh = new BABYLON.Mesh(level.name, scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.uvs = uvs;
  data.indices = indices;
  data.normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, data.normals); // which way each point faces, for the light
  data.applyToMesh(mesh);

  const material = new BABYLON.StandardMaterial("deck", scene);
  material.diffuseTexture = makeDeckTexture(scene);
  material.specularColor = new BABYLON.Color3(0.2, 0.22, 0.28);
  mesh.material = material;
  mesh.receiveShadows = true;

  // The marble rolls on the triangles themselves (a MESH shape), not on a box round them.
  const aggregate = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.MESH, { mass: 0, ...SURFACES.deck }, scene);

  return {
    grid,
    mesh,
    aggregate,
    dispose() {
      aggregate.dispose();
      material.diffuseTexture.dispose();
      material.dispose();
      mesh.dispose();
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
  module.exports = { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists, heightAt, levelStart, lowestHeight, fallLimit, levelGeometry, buildLevel };
} else {
  Object.assign(window, { CELL, HEIGHT_STEP, SKIRT_BOTTOM, FALL_MARGIN, DROP_HEIGHT, LEVELS, parseLevel, cornerHeight, cellExists, heightAt, levelStart, lowestHeight, fallLimit, levelGeometry, buildLevel });
}
```

Things to notice:

- **A mesh made from nothing but numbers** is a `Mesh` and a `VertexData`: put the three lists in the vertex data, and `applyToMesh` fills the mesh. This is all `CreateBox` and the others do for you, and it is how any shape the builders don't have is made.
- **`ComputeNormals` fills in the normals** from the points and the triangles. The light needs them. They are worked out from the order of the points, so a wrong order also gives a floor that is lit as if it faced down.
- **The material is the checker texture from the course**, which repeats every `TILE` units, and the UVs were made in world units, so the checks are the same size everywhere on every slope and wall.
- **`PhysicsShapeType.MESH` rolls the marble on the triangles themselves.** The shapes so far (box, sphere) are simple solids. A mesh shape is as exact as the floor, and fine for something that **never moves** (`mass: 0`). It would be a poor choice for a moving body, because Havok has to look at every triangle.
- **`dispose` has to take everything away**: the physics body, the texture and material, and the mesh. A level that is only half taken away leaves an invisible floor in the physics world, which is a bad bug to meet halfway down a level.

### Tests

Add these to the bottom of `tests/level.tests.js`:

```js
// Building a level needs a scene and physics. These use a NullEngine, which draws nothing, and
// let time go by with stepPhysics.
QUnit.module("buildLevel", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("makes a mesh named for the level, with the points the geometry says, that can take a shadow", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);

    assert.strictEqual(built.mesh.name, LEVELS[0].name);
    assert.strictEqual(built.mesh.getTotalVertices(), levelGeometry(parseLevel(LEVELS[0])).positions.length / 3);
    assert.true(built.mesh.receiveShadows);
  });

  QUnit.test("gives the mesh a body that never moves", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);

    assert.true(Boolean(built.mesh.physicsBody));
    assert.strictEqual(built.mesh.physicsBody.getMassProperties().mass, 0);
  });

  QUnit.test("gives back the grid it made the level from", (assert) => {
    const built = buildLevel(scene, LEVELS[1]);

    assert.strictEqual(built.grid.name, LEVELS[1].name);
    assert.strictEqual(built.grid.cols, LEVELS[1].rows[0].length);
  });

  QUnit.test("a marble dropped at the start of each level comes to rest on the floor", (assert) => {
    for (const level of LEVELS) {
      const built = buildLevel(scene, level);
      const start = levelStart(built.grid);
      const marble = new Marble(scene, { start });

      stepPhysics(scene, 1.5);

      const floor = heightAt(built.grid, start.x, start.z);
      assert.true(Math.abs(marble.position.y - (floor + MARBLE_RADIUS)) < 0.05, `${level.name}: ${marble.position.y} on ${floor}`);
      assert.true(marble.grounded, `${level.name} is grounded`);

      marble.mesh.dispose();
      built.dispose();
    }
  });

  QUnit.test("a marble rolls down a ramp, along it and not across it", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);
    // The ramp is where the digits fall, from column 4 to column 9, so it goes down along +x.
    const x = 6.5 * CELL;
    const z = 2 * CELL;
    const startY = heightAt(built.grid, x, z) + MARBLE_RADIUS + 0.1;
    const marble = new Marble(scene, { start: { x, y: startY, z } });

    stepPhysics(scene, 1);

    assert.true(marble.position.x > x + 1.5, `rolled on to ${marble.position.x}`);
    assert.true(Math.abs(marble.position.z - z) < 0.3, `and stayed in line: ${marble.position.z}`);
    assert.true(marble.position.y < startY - 0.5, `and went down: ${marble.position.y}`);
  });

  QUnit.test("it keeps to the floor on the slope: it doesn't sink into it or bounce away", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);
    const x = 5.5 * CELL;
    const z = 2 * CELL;
    const marble = new Marble(scene, { start: { x, y: heightAt(built.grid, x, z) + MARBLE_RADIUS + 0.05, z } });

    const problems = [];
    for (let i = 0; i < 40; i++) {
      stepPhysics(scene, 1 / 20);
      const floor = heightAt(built.grid, marble.position.x, marble.position.z);
      if (floor === null) break; // it has rolled off the end of the floor
      const above = marble.position.y - floor;
      if (above < MARBLE_RADIUS - 0.1 || above > MARBLE_RADIUS + 0.6) problems.push(`${marble.position.x.toFixed(1)}: ${above.toFixed(2)} above`);
    }

    assert.deepEqual(problems, []);
  });

  QUnit.test("a marble over a hole falls out of the level", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);
    const marble = new Marble(scene, { start: { x: 2, y: 5, z: 10 * CELL } }); // the first columns are dots down here

    stepPhysics(scene, 1.5);

    assert.true(hasFallen(marble.position.y, fallLimit(built.grid)), `${marble.position.y}`);
  });

  QUnit.test("a wall stops a marble that rolls into it from underneath", (assert) => {
    buildLevel(scene, LEVELS[0]);
    // The start deck's wall is the plane x = 0. The marble comes at it from outside, with nothing
    // under it to roll on, so only the wall can stop it.
    const marble = new Marble(scene, { start: { x: -2, y: 1, z: 2 * CELL } });
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(4, 0, 0));
    marble.aggregate.body.setGravityFactor(0);

    stepPhysics(scene, 1);

    assert.true(marble.position.x < 0, `it is at ${marble.position.x}, still outside the wall at 0`);
  });

  QUnit.test("disposing a level takes the mesh and the floor away", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);
    const start = levelStart(built.grid);
    built.dispose();
    const marble = new Marble(scene, { start });

    stepPhysics(scene, 1.5);

    assert.strictEqual(scene.getMeshByName(LEVELS[0].name), null);
    assert.true(marble.position.y < start.y - 5, `fell to ${marble.position.y}`);
  });

  QUnit.test("another level can be built in its place", (assert) => {
    buildLevel(scene, LEVELS[0]).dispose();
    const built = buildLevel(scene, LEVELS[1]);
    const start = levelStart(built.grid);
    const marble = new Marble(scene, { start });

    stepPhysics(scene, 1.5);

    assert.true(Math.abs(marble.position.y - (heightAt(built.grid, start.x, start.z) + MARBLE_RADIUS)) < 0.05);
  });
});
```

Things to notice:

- **They run the real physics.** A `NullEngine` draws nothing, and `stepPhysics` lets time go by, as in the earlier tests.
- **"A marble dropped at the start of each level comes to rest on the floor"** checks the marble ends up exactly one radius above the floor `heightAt` promised, and that `grounded` agrees. That one test ties the grid, the height sum, the mesh and Havok together.
- **"Rolls down a ramp, along it and not across it"** checks the direction of the slope in the real world, and **"keeps to the floor on the slope"** watches the marble for two seconds to see that it never sinks into the floor or bounces away from it.
- **"A wall stops a marble that rolls into it from underneath"** turns gravity off for that marble and fires it at the edge of a deck from outside, where there is no floor to roll on. Only the wall, if it is there, can stop it.
- **"Disposing a level takes the floor away"** drops a marble where a level was, and it falls.

Open `tests.html`. You should see **264 passing tests**: ten more.

---

## Step 5: The page, and the game

Two small additions to `index.html`: the name of the level, and a button to go on to the next. Directly below the `<p class="touch-hint">` line, add:

```html
  <p id="level-name"></p>
```

Directly above the `<button id="drop" ...>` line, add:

```html
  <button id="next-level" class="hazard" type="button">Next level</button>
```

Change the hint at the top so it mentions the new key:

```html
  <div class="hint">Arrows or WASD to roll &middot; R to start again &middot; N for the next level &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

And the new script goes in the list at the **bottom of `<body>`**, below `course.js`. Without it, `main.js` stops with `ReferenceError: buildLevel is not defined`:

```html
  <script src="js/level.js"></script>
```

Now add this to the bottom of `css/game.css`:

```css
/* Levels. The name of the level, under the hint, and a button to go on to the next, above the one to drop again. */
#level-name {
  position: fixed;
  right: 12px;
  top: 56px;
  z-index: 20;
  margin: 0;
  color: var(--chrome);
  font: 400 clamp(18px, 4vw, 26px) / 1 var(--title-font);
  letter-spacing: 0.08em;
  text-shadow: 0 2px 4px var(--ink);
  text-transform: uppercase;
  pointer-events: none;
}
#next-level {
  position: fixed;
  right: 12px;
  bottom: 68px;
  z-index: 20;
}
```

Then `js/main.js`, in three places.

### 5a. Build the level

Find the two lines that build the old course and the marble:

```js
  buildCourse(scene);
  const marble = new Marble(scene);
```

and replace them with:

```js
  // The level: a grid of heights, made into a mesh for the marble to roll on. Going on to the next
  // level takes this one away and builds another in its place, so `level` is changed, not made once.
  let levelIndex = 0;
  let level = buildLevel(scene, LEVELS[levelIndex]);
  const marble = new Marble(scene, { start: levelStart(level.grid) });
```

(The `shadows.addShadowCaster` line stays as it is, directly below.) The marble starts where the level says. `buildCourse` is no longer called from the game; it stays in `course.js` for the tests.

### 5b. The next level

Replace the comment above the frame loop, and the `let focus` line, with:

```js
  // The next level: take this one away, build the next (the last one is followed by the first), and
  // start the marble at its start. The camera is put at the marble too, or it would glide across
  // from the old level.
  let focus = { ...marble.start };
  const levelName = document.getElementById("level-name");
  levelName.textContent = level.grid.name;
  const nextLevel = () => {
    level.dispose();
    levelIndex = (levelIndex + 1) % LEVELS.length;
    level = buildLevel(scene, LEVELS[levelIndex]);
    marble.start = levelStart(level.grid);
    marble.reset();
    focus = { ...marble.start };
    levelName.textContent = level.grid.name;
  };
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyN" && !event.repeat) nextLevel();
  });
  const nextButton = document.getElementById("next-level");
  nextButton.addEventListener("click", () => {
    nextButton.blur();
    nextLevel();
  });

  // Each frame: read the tilt, steer the marble, put it back if it fell off the level, keep the
  // sun over it, and ease the camera after it.
```

Things to notice:

- **`level` is `let`, not `const`**, because going to the next level changes it. Everything else only ever looks at `level.grid`.
- **The old level is disposed of first**, so there are never two floors in the physics world at once.
- **The marble keeps being the same marble.** Its `start` is changed and it is reset there. Making a new one would mean taking the old one out of the shadows, the controls and everything else.
- **The camera is moved to the marble too.** Otherwise it would glide across from where the last level was, which is an odd thing to watch, and it is not obviously a bug in anything but the camera.
- **The levels wrap round**: after the last, the first. `%` is how.

### 5c. Falling off the level

In the frame loop, change the line that checks whether the marble has fallen, so it uses the level's own limit:

```js
    if (hasFallen(marble.position.y, fallLimit(level.grid))) dropAgain();
```

Things to notice:

- **Falling off puts the marble back at its start**, with the same `dropAgain` as the **R** key. Later on this is where a life will be lost or a checkpoint used.
- **`fallLimit(level.grid)` is read every frame**, from the level that is current, so it is right for the next level too, with no more code.

---

## Step 6: Try it

Serve the page and open it. The marble drops onto the start deck of **Practice Run**, a deck with a long ramp down to a landing and a turn.

- [ ] The marble **lands on the deck** and sits there, with its shadow under it
- [ ] The floor is a **checkered steel**, with **walls** under its edges (no floating slabs), and the ramp is a smooth slope
- [ ] **Roll down the ramp**: the marble keeps to the floor, with no bouncing and no sinking in
- [ ] **Roll off the side** of the deck or the ramp: the marble falls, and after a moment is put back at the start
- [ ] **N**, or the **Next level** button, builds **The Bridge**, a deck, a ramp down, a narrow bridge, and a landing, and the name at the top right changes
- [ ] **N** again is back to the first level, and neither level has a stray floor from the other
- [ ] The marble still falls off the bridge, from either side, and it starts again
- [ ] **R**, the **Drop again** button, tilt and touch steering all still work

**If something's wrong**

- **`ReferenceError: buildLevel is not defined` (or `LEVELS`):** either `index.html` has no `<script src="js/level.js"></script>`, or it is after `main.js` (it goes in the list at the bottom of `<body>`, below `course.js`), or `buildLevel` was pasted *inside* `levelGeometry` and is only visible in there. The tell is that the console also points at the export block at the bottom of `level.js`. Check each function starts at the left edge and the one above it has closed. (The tests fail too in that case, but if only `index.html` is missing the tag they can still pass, since `tests.html` has its own list.)
- **The floor is missing, and what you see is the *inside* of the far walls:** the points of the triangles are in the wrong order, so the fronts face the wrong way. The test *"the floor faces up and the walls face out"* should be failing. The floor's two triangles are `p00, p11, p01` and `p00, p10, p11`.
- **The floor is there but looks black, or lit from underneath:** the normals. `ComputeNormals` needs `data.normals = []` to fill in, and is worked out from the same order of points.
- **The marble falls straight through the level:** there is no physics body (check the `PhysicsAggregate` line), or `scene.physicsEnabled` isn't true yet.
- **The marble sinks into the floor or sits above it:** the mesh and `heightAt` disagree. The test *"the floor is the same triangles heightAt works with"* should be failing.
- **The checks on the floor are stretched on the slopes and walls:** the UVs should be in world units over `TILE`, as in `levelGeometry`.
- **A level has a wall where it shouldn't, or none where it should:** the four `cellExists` checks in `levelGeometry`. A wall is only on a side with no square beside it.
- **The next level comes up, and the old floor is still there:** `dispose` is missing the `aggregate.dispose()`.
- **The camera slides across the world when the level changes:** `focus` isn't reset in `nextLevel`.
- **The marble is put back at the old level's start:** `marble.start` isn't updated before `marble.reset()`.
- **The marble falls off, and takes ages to come back:** `fallLimit`. Check it is a few units under the lowest floor.
- **`level.grid` is undefined:** `buildLevel` has to return `{ grid, mesh, aggregate, dispose }`.

**Experiments** (change one, reload, then change it back):

- Edit a level's rows: raise a column of digits to make a hill, or put a dot in the middle of a deck to make a hole in it. The marble falls through it
- `HEIGHT_STEP` of `1.5`: every ramp is three times as steep, and the slope test fails, which is just what it is for
- `CELL` of `3`: the levels are half as big again, and the checks of the floor stay the same size
- `FALL_MARGIN` of `40`: the marble falls for a long time before it is put back
- `SKIRT_BOTTOM` of `-0.5`: the walls are short, and you can see under the level
- Swap `p00, p11, p01` for `p00, p01, p11` in `levelGeometry` (and see Step 6's *If something's wrong*)

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
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/tilt.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/level.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/tilt.tests.js"></script>  
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **264 passing tests**: the 223 you started with, plus 12 for the grid, 10 for the height of the floor and the start, 9 for the triangles and 10 for building a level.

> **What these tests don't cover.** They check the numbers, the triangles, the order of their points, and that a real marble rolls where the grid says it should. They can't tell you a level is *fun*: that a slope is gentle enough, a bridge wide enough, a drop far enough. That check is Step 6, with a thumb or a tilted phone. Levels are made by playing them.

> **Try breaking something.** In `levelGeometry`, swap the order of the floor's triangles to `p00, p01, p11, p00, p11, p10`. The floor and wall tests fail, and the page shows the walls from the inside. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A level as data | `LEVELS`, `parseLevel` |
| A floor from corner heights, so ramps are free | `cornerHeight`, `cellExists` |
| The height of a floor anywhere, from its triangles | `heightAt` |
| Where a marble starts, and where it has fallen | `levelStart`, `fallLimit` |
| A mesh from plain lists of numbers | `levelGeometry`, `VertexData` |
| The order of a triangle's points decides its front | the floor's `p00, p11, p01`, and `wall` |
| Walls under the edge of a level | `wall`, `SKIRT_BOTTOM` |
| A physics shape that is the mesh itself | `PhysicsShapeType.MESH` |
| Taking a level away cleanly | `dispose` |
| Going on to the next level | `nextLevel` |
| Testing geometry by which way it faces | `triangles`, in the tests |

## Challenges

1. **A third level.** Draw one with a hill to roll over, a long bend, or a drop. (Hint: only `LEVELS` changes, and the tests check it for you.)
2. **A cliff.** Squares that share a corner can't have a step between them. What would you change to allow it? (Hint: a square would need a height for each of its own four corners, not the grid's.)
3. **Level names on a screen.** Show the name big for a moment when a level starts. (Hint: the `#level-name` element and a CSS transition.)
4. **Remember the level.** Keep the level number in `localStorage`, and start there next time.
5. **A different tile.** Give each level a texture colour of its own. (Hint: `makeDeckTexture` could take colours, and a level could name them.)

---
