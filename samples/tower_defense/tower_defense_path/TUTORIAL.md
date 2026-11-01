# Tutorial: Tower Defense Path -- A Road, and Someone to Walk It

This is the second tutorial in the Tower Defense series. The board is there and nothing is on it. This step gives it a **road**, drawn as text, and an **enemy** that walks it. The road is a map that is written as rows of characters; the right piece of road is put in every cell by looking at which of its neighbors are road too, and turned so that it joins them; the road becomes a smooth line that an enemy follows from where it comes on to the board to where it goes off, with the right animation played at the right speed so that its feet don't skate. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Maps** as text: a legend, two maps, and a check that says in words what is wrong with a map that can't be played
- **Autotiling**: the right piece (a straight piece, a corner, a junction or a crossroads) in every cell of road, turned to join its neighbors, from a number made of four bits
- A **path**: the road followed from the start to the goal, turned into a line in the world with its corners rounded by a curve, and a way to ask where something is after it has walked some distance
- A **walker**: distance, speed and time, with no models and no scene, so that it can be tested with nothing at all
- **Enemies**: five kinds, from a table, each loaded once, made the right height, standing on the ground, and walking with its own copy of a skeleton and an animation, played at a speed that matches its feet to the ground
- **Markers**: a glowing ring where enemies come on and another where they are trying to get to, made in code, that breathe
- A game that sends an enemy of each kind along the road in turn, on either map (`?map=1`)
- Unit tests for all of it: **237 passing tests**, 131 of them new

**What you'll learn:** how to describe a map as data and check it, how to pick a tile from the sides that have road using bits (and turn it by shifting them), how to find a path along a road, how a quadratic Bezier curve rounds a corner, how to find where something is on a line from how far it has gone, what a `Walker` is and why it has no models in it, how to scale a model to a height, how to play an animation at a speed that fits the ground, why a character with a skeleton can't be an *instance* and what is cloned instead, and how to test things that move by letting time pass.

**Before you start:** do the [World tutorial](../tower_defense_world/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished World sample, plus placeholders for the new files and their tests:

```
tower_defense_path/
├── index.html, tests.html   (already list the new scripts)
├── css/                      (everything from the World sample)
├── js/
│   ├── maps.js               (placeholder -- Step 1)
│   ├── roads.js              (placeholder -- Step 2)
│   ├── path.js               (placeholder -- Step 3)
│   ├── walker.js             (placeholder -- Step 4)
│   ├── enemies.js            (placeholder -- Step 5)
│   ├── markers.js            (placeholder -- Step 6)
│   ├── models.js             (two additions -- Step 5)
│   ├── main.js               (changes -- Step 7)
│   └── everything else, from the World sample
└── tests/
    ├── maps.tests.js, roads.tests.js, path.tests.js, walker.tests.js, enemies.tests.js, markers.tests.js   (placeholders)
    ├── models.tests.js       (an addition -- Step 5)
    └── everything else, from the World sample
```

Open `tests.html` before you change anything, through the web server. You should see **106 passing tests**, the World sample's.

### Serving the page

Like the World sample, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_path/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Maps**: a board as text, and what is wrong with one.
2. **Roads**: which piece goes in a cell, and how it is turned.
3. **The path**: the road as a line.
4. **The walker**: how far along the line.
5. **Enemies**: models that walk.
6. **Markers**: the ends of the road.
7. **The game.**

---

## Step 1: Maps

A map is a board drawn as text: one string for each row, one character for each cell. That is easy to write, and easy to read, and (the reason it is first) easy to **check**: a map is data, so a function can say what is wrong with it. The editor in the last tutorial will write the same thing.

Open the placeholder `js/maps.js` and replace its contents with:

```js
// Maps: a board drawn as text, one string for every row, one character for every cell. A map is
// data, so it is easy to write, easy to read, and easy to check. The editor in the last tutorial
// writes the same thing. See ../tests/maps.tests.js.

// What each character means. The start is where enemies come on to the board, and the goal is
// where they are trying to get to: both are pieces of road.
const LEGEND = {
  ".": "grass",
  "#": "road",
  S: "start",
  G: "goal",
};

const MAPS = [
  {
    name: "The Winding Road",
    rows: [
      "..............",
      "S###########..",
      "...........#..",
      "..##########..",
      "..#...........",
      "..##########..",
      "...........#..",
      "...........##G",
      "..............",
    ],
  },
  {
    name: "Switchback",
    rows: [
      ".S..........G.",
      ".#..####..###.",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".####..####...",
      "..............",
    ],
  },
];

// A map as a grid: { name, cols, rows, cells, start, goal }. `cells[row][col]` is "grass" or "road",
// and the start and goal are also road. A character that isn't in the legend is a grass cell and is
// written down in `unknown`, so that a check can complain about it.
function parseMap(map) {
  const cells = [];
  const unknown = [];
  const starts = [];
  const goals = [];
  map.rows.forEach((text, row) => {
    cells.push(
      [...text].map((character, col) => {
        const meaning = LEGEND[character];
        if (!meaning) unknown.push({ col, row, character });
        if (meaning === "start") starts.push({ col, row });
        if (meaning === "goal") goals.push({ col, row });
        return meaning === "road" || meaning === "start" || meaning === "goal" ? "road" : "grass";
      })
    );
  });
  return {
    name: map.name,
    cols: Math.max(0, ...map.rows.map((text) => text.length)),
    rows: map.rows.length,
    cells,
    start: starts[0] || null,
    goal: goals[0] || null,
    starts,
    goals,
    unknown,
  };
}

// Whether a cell of a parsed map is road. Off the map, it isn't.
function isRoad(grid, col, row) {
  return !!grid.cells[row] && grid.cells[row][col] === "road";
}

// How many of the four cells beside this one are road.
function roadNeighbors(grid, col, row) {
  return [
    [col, row - 1],
    [col + 1, row],
    [col, row + 1],
    [col - 1, row],
  ].filter(([c, r]) => isRoad(grid, c, r)).length;
}

// Everything that is wrong with a map, as a list of sentences: nothing in the list is a map you can play.
// `board` is the board it has to fit.
function mapProblems(map, board = BOARD) {
  const grid = parseMap(map);
  const problems = [];
  if (grid.rows !== board.rows) problems.push(`it has ${grid.rows} rows, and the board has ${board.rows}`);
  map.rows.forEach((text, row) => {
    if (text.length !== board.cols) problems.push(`row ${row} has ${text.length} cells, and the board has ${board.cols}`);
  });
  for (const { col, row, character } of grid.unknown) problems.push(`"${character}" at column ${col}, row ${row} means nothing`);
  if (grid.starts.length !== 1) problems.push(`it needs one start, and has ${grid.starts.length}`);
  if (grid.goals.length !== 1) problems.push(`it needs one goal, and has ${grid.goals.length}`);

  const onEdge = (cell) => cell.col === 0 || cell.row === 0 || cell.col === grid.cols - 1 || cell.row === grid.rows - 1;
  if (grid.start && !onEdge(grid.start)) problems.push("the start is not on the edge of the board, where enemies come on");
  if (grid.goal && !onEdge(grid.goal)) problems.push("the goal is not on the edge of the board, where enemies go off");

  // A road is one line: each piece has a road on two sides, except the ends, which have one.
  grid.cells.forEach((line, row) =>
    line.forEach((cell, col) => {
      if (cell !== "road") return;
      const isEnd = (grid.start && grid.start.col === col && grid.start.row === row) || (grid.goal && grid.goal.col === col && grid.goal.row === row);
      const want = isEnd ? 1 : 2;
      const have = roadNeighbors(grid, col, row);
      const plural = (n) => `${n} ${n === 1 ? "neighbor" : "neighbors"}`;
      if (have !== want) problems.push(`the road at column ${col}, row ${row} has ${plural(have)}, and should have ${plural(want)}`);
    })
  );
  return problems;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LEGEND, MAPS, parseMap, isRoad, roadNeighbors, mapProblems };
} else {
  Object.assign(window, { LEGEND, MAPS, parseMap, isRoad, roadNeighbors, mapProblems });
}
```

Things to notice:

- **`LEGEND` says what each character means,** and nothing else in the game does. `S` and `G` are the start and the goal; both are also pieces of road.
- **A map is `{ name, rows }`**, and `MAPS` is a list of them. The first one is a serpentine road that goes across the board and back, three times, and the second goes up and down. The road is **one line**: no road has more than two neighbors and nothing crosses itself. That is a choice (the pieces for a junction and a crossroads are there, and the next section uses them), and the check below makes it a rule.
- **`parseMap` turns the text into a grid:** `cells[row][col]` is `"grass"` or `"road"`, and `start` and `goal` are the cells, if there are any. A character that isn't in the legend is *kept* in `unknown` (and is grass), so that the check can say where it was, and not just that something was wrong. `starts` and `goals` keep every one that was found, so that the check can say that there are two.
- **`isRoad` is false off the map,** so that nothing else has to ask whether `col - 1` is still on it.
- **`mapProblems` returns a list of sentences,** not a yes or no. Everything that is wrong with the map is said at once, and each says *where*: `the road at column 1, row 0 has 3 neighbors, and should have 2 neighbors`. That is what you will want to read when a map that you wrote doesn't work, and the editor will show them.
- **The rule for a road is about its neighbors:** every piece has road on exactly two sides, except the start and the goal, which have one. That one rule finds forks, dead ends, a goal with no road to it, and a road with a piece missing.

Open the placeholder `tests/maps.tests.js` and replace its contents with:

```js
// A board of five across and three deep, to write small maps for.
const MAP_BOARD = { cols: 5, rows: 3, cell: 2, rim: 1, depth: 6, peek: 2, headroom: 1 };

// A small map from rows of text.
const smallMap = (...rows) => ({ name: "test", rows });

QUnit.module("LEGEND", () => {
  QUnit.test("every character means grass, road, the start or the goal", (assert) => {
    for (const meaning of Object.values(LEGEND)) assert.true(["grass", "road", "start", "goal"].includes(meaning));
  });

  QUnit.test("there is a character for each of the four", (assert) => {
    assert.deepEqual(Object.values(LEGEND).sort(), ["goal", "grass", "road", "start"]);
  });
});

QUnit.module("the maps", () => {
  QUnit.test("there is more than one, each with a name of its own", (assert) => {
    assert.true(MAPS.length > 1);
    assert.strictEqual(new Set(MAPS.map((map) => map.name)).size, MAPS.length);
    assert.true(MAPS.every((map) => map.name.length > 0));
  });

  QUnit.test("every map fits the board, and has nothing wrong with it", (assert) => {
    for (const map of MAPS) assert.deepEqual(mapProblems(map), [], map.name);
  });

  QUnit.test("every map is a different shape", (assert) => {
    assert.strictEqual(new Set(MAPS.map((map) => map.rows.join("/"))).size, MAPS.length);
  });
});

QUnit.module("parseMap", () => {
  QUnit.test("counts the columns and the rows", (assert) => {
    const grid = parseMap(smallMap("S###.", "....#", "...G."));

    assert.strictEqual(grid.cols, 5);
    assert.strictEqual(grid.rows, 3);
  });

  QUnit.test("finds the start and the goal", (assert) => {
    const grid = parseMap(smallMap("S###.", "....#", "...G."));

    assert.deepEqual(grid.start, { col: 0, row: 0 });
    assert.deepEqual(grid.goal, { col: 3, row: 2 });
  });

  QUnit.test("a cell is grass or road, and the start and the goal are road", (assert) => {
    const grid = parseMap(smallMap("S#..G"));

    assert.deepEqual(grid.cells[0], ["road", "road", "grass", "grass", "road"]);
  });

  QUnit.test("a character that means nothing is grass, and is written down", (assert) => {
    const grid = parseMap(smallMap("S?#G"));

    assert.strictEqual(grid.cells[0][1], "grass");
    assert.deepEqual(grid.unknown, [{ col: 1, row: 0, character: "?" }]);
  });

  QUnit.test("a map with no start has none", (assert) => {
    const grid = parseMap(smallMap("..G"));

    assert.strictEqual(grid.start, null);
    assert.strictEqual(grid.starts.length, 0);
  });

  QUnit.test("every start is kept, even though only the first is used", (assert) => {
    const grid = parseMap(smallMap("S.S"));

    assert.strictEqual(grid.starts.length, 2);
    assert.deepEqual(grid.start, { col: 0, row: 0 });
  });
});

QUnit.module("isRoad and roadNeighbors", () => {
  const grid = parseMap(smallMap("S##", ".#.", ".#G"));

  QUnit.test("road is road, grass is not", (assert) => {
    assert.true(isRoad(grid, 1, 1));
    assert.false(isRoad(grid, 0, 1));
  });

  QUnit.test("a place off the map is not road", (assert) => {
    assert.false(isRoad(grid, -1, 0));
    assert.false(isRoad(grid, 0, -1));
    assert.false(isRoad(grid, 3, 0));
    assert.false(isRoad(grid, 0, 3));
  });

  QUnit.test("counts the road on the four sides", (assert) => {
    assert.strictEqual(roadNeighbors(grid, 1, 0), 3, "a corner joined to the start, the right and the one below");
    assert.strictEqual(roadNeighbors(grid, 1, 1), 2);
    assert.strictEqual(roadNeighbors(grid, 0, 0), 1);
  });

  QUnit.test("does not count the cells at the corners of a cell", (assert) => {
    assert.strictEqual(roadNeighbors(parseMap(smallMap("#.#", ".#.", "#.#")), 1, 1), 0);
  });
});

QUnit.module("mapProblems", () => {
  const problems = (...rows) => mapProblems(smallMap(...rows), MAP_BOARD);

  QUnit.test("a good map has none", (assert) => {
    assert.deepEqual(problems("S###G", ".....", "....."), []);
  });

  QUnit.test("a map with the wrong number of rows is wrong", (assert) => {
    assert.true(problems("S###G", ".....").some((p) => p.includes("2 rows")));
  });

  QUnit.test("a row of the wrong length is wrong, and says which", (assert) => {
    assert.true(problems("S####", "....", ".....").some((p) => p.includes("row 1 has 4")));
  });

  QUnit.test("a character that means nothing is wrong, and says where", (assert) => {
    assert.true(problems("S##?G", ".....", ".....").some((p) => p.includes('"?" at column 3, row 0')));
  });

  QUnit.test("a map has to have a start", (assert) => {
    assert.true(problems("#####", ".....", ".....").some((p) => p.includes("one start, and has 0")));
  });

  QUnit.test("and only one goal", (assert) => {
    assert.true(problems("S###G", "....G", ".....").some((p) => p.includes("one goal, and has 2")));
  });

  QUnit.test("the start has to be on the edge", (assert) => {
    assert.true(problems(".....", ".S###", ".....").some((p) => p.includes("start is not on the edge")));
  });

  QUnit.test("a start in a corner, or on any edge, is on the edge", (assert) => {
    assert.false(problems("S####", ".....", ".....").some((p) => p.includes("start is not on the edge")));
    assert.false(problems(".....", "S####", ".....").some((p) => p.includes("start is not on the edge")));
    assert.false(problems(".....", "....S", ".....").some((p) => p.includes("start is not on the edge")));
    assert.false(problems("..S..", ".....", ".....").some((p) => p.includes("start is not on the edge")));
  });

  QUnit.test("so does the goal", (assert) => {
    assert.true(problems("S#...", ".#G..", ".....").some((p) => p.includes("goal is not on the edge")));
  });

  QUnit.test("a piece of road with three neighbors is a fork, and is wrong", (assert) => {
    assert.true(problems("S####", ".#...", ".#..G").some((p) => p.includes("column 1, row 0 has 3 neighbors, and should have 2 neighbors")));
  });

  QUnit.test("a piece of road with one neighbor, that is not an end, is a dead end, and is wrong", (assert) => {
    assert.true(problems("S##..", ".....", "....G").some((p) => p.includes("column 2, row 0 has 1 neighbor, and should have 2 neighbors")));
  });

  QUnit.test("the start and the goal want exactly one neighbor each", (assert) => {
    assert.true(problems("S####", ".....", "..G..").some((p) => p.includes("column 2, row 2 has 0 neighbors, and should have 1 neighbor")));
  });

  QUnit.test("every problem is a sentence you could read to someone", (assert) => {
    for (const problem of problems("S?#", "....", ".G")) assert.true(typeof problem === "string" && problem.length > 10);
  });
});
```

- **`MAP_BOARD` is a board of five by three,** and `smallMap` makes a map from rows, so that each test is a few characters: you can see the problem in it. The tests of the real maps use the real `BOARD`.
- **"Every map fits the board, and has nothing wrong with it"** is the test that stops a map you write later from being a surprise in the game. The next ones check each kind of mistake by writing a map with just that mistake.
- **A start that is on any edge is fine:** one test tries a corner, the left edge, the right edge and the back. A rule about "the edge" is easy to write one cell wrong.

**Check:** open `tests.html`. 134 tests pass.

---

## Step 2: Roads

The map says which cells are road. It does not say *which piece*. A straight piece, a corner, a junction and a crossroads are four models, and a corner can be turned four ways. Nobody wants to write that down for every cell of every map, so the game works it out from the cell's neighbors. That is called **autotiling**, and it is what makes a map a few characters instead of a list of pieces and turns.

Open the placeholder `js/roads.js` and replace its contents with:

```js
// Roads: which piece goes in a cell, and how it is turned. A map says only which cells are road. The
// piece in a cell is worked out from which of its four neighbors are road too, so that every piece joins
// the ones beside it. This is called *autotiling*, and it means a map is only ever drawn as text.
// See ../tests/roads.tests.js.

// The four sides of a cell, as bits that add up to a number that says which of them are road: the
// back (north, the far edge of the board), the right (east), the front (south) and the left (west).
const NORTH = 1;
const EAST = 2;
const SOUTH = 4;
const WEST = 8;

// Which sides each piece of road joins when it is not turned, as drawn in the model (see TILES).
const BASE_SIDES = {
  straight: NORTH | SOUTH,
  corner: NORTH | EAST,
  junction: NORTH | EAST | WEST,
  crossroads: NORTH | EAST | SOUTH | WEST,
};

// The sides a piece joins once it has been turned by `turn` quarter turns clockwise, seen from
// above: the back goes to the right, the right to the front, and so on round. Each quarter
// turn moves every bit up one place, and the one that falls off the top comes back at the bottom.
function turnSides(sides, turn) {
  const t = ((turn % 4) + 4) % 4;
  return ((sides << t) | (sides >> (4 - t))) & 15;
}

// The sides a piece joins, given its kind and its turn.
function sidesOf(kind, turn) {
  return kind in BASE_SIDES ? turnSides(BASE_SIDES[kind], turn) : 0;
}

// A lookup from every possible set of road neighbors to the piece to use, made once. A cell with
// two or more road neighbors takes the piece that joins exactly those. A cell with one (the start and the
// goal, where the road comes up to the edge of the board) takes a straight piece pointing along it.
// A cell with none is only a stretch of road with nowhere to go: a straight piece will do.
const PIECE_FOR_SIDES = (() => {
  const table = [];
  for (const kind of Object.keys(BASE_SIDES)) {
    for (let turn = 0; turn < 4; turn++) {
      const sides = sidesOf(kind, turn);
      if (!table[sides]) table[sides] = { kind, turn };
    }
  }
  table[0] = { kind: "straight", turn: 0 };
  for (const side of [NORTH, SOUTH]) table[side] = { kind: "straight", turn: 0 };
  for (const side of [EAST, WEST]) table[side] = { kind: "straight", turn: 1 };
  return table;
})();

// Which of the four sides of a cell have road beside them.
function neighborMask(grid, col, row) {
  return (
    (isRoad(grid, col, row - 1) ? NORTH : 0) |
    (isRoad(grid, col + 1, row) ? EAST : 0) |
    (isRoad(grid, col, row + 1) ? SOUTH : 0) |
    (isRoad(grid, col - 1, row) ? WEST : 0)
  );
}

// The piece for a set of sides: { kind, turn }.
function roadPiece(mask) {
  return PIECE_FOR_SIDES[mask & 15];
}

// What goes in a cell of a map: { kind, turn }. Grass is turned in the way grassTurn says, so
// that it doesn't look like wallpaper.
function pieceAt(grid, col, row) {
  if (!isRoad(grid, col, row)) return { kind: "grass", turn: grassTurn(col, row) };
  return roadPiece(neighborMask(grid, col, row));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NORTH, EAST, SOUTH, WEST, BASE_SIDES, turnSides, sidesOf, neighborMask, roadPiece, pieceAt };
} else {
  Object.assign(window, { NORTH, EAST, SOUTH, WEST, BASE_SIDES, turnSides, sidesOf, neighborMask, roadPiece, pieceAt });
}
```

Things to notice:

- **The four sides of a cell are four bits:** back 1, right 2, front 4, left 8. A cell with road at the back and the right is `1 | 2`, which is `3`. Any set of sides is one number from 0 to 15, and there are only sixteen, which is why a table can say what to do for each.
- **`BASE_SIDES` says what each piece joins when it is not turned,** as the model is drawn: a straight piece runs from the back to the front, a corner joins the back to the right, a junction is a road across with a branch to the back, a crossroads joins all four. These came from looking at the models (it's in the note above `TILES` in the World sample).
- **`turnSides` turns a set of sides a quarter turn clockwise by shifting the bits up one place,** so the back (1) becomes the right (2), the right the front (4), the front the left (8), and the left, which would fall off the top, comes back as the back. `(sides << t) | (sides >> (4 - t))` is that, for `t` quarter turns, and `& 15` keeps four bits. This is the same as *rotating a number of four bits*, which some processors can do in a single instruction.
- **`PIECE_FOR_SIDES` is a table made once, from the pieces.** For each kind and each turn, it works out which sides that piece joins, and writes the piece into the table at that number. After that, "which piece for these sides" is one lookup, and it can only give a piece that really joins those sides. The first piece to claim a number keeps it: a straight piece turned twice is the same as turned none, and the table keeps the first.
- **A cell with one neighbor is a straight piece pointing at it.** That is the start and the goal, where the road comes up to the edge of the board. (A cell with none gets a straight piece too, because it has to be something, and the check in `mapProblems` already says a road like that is wrong.)
- **`pieceAt` is what the game asks:** for a cell of the map, the piece and the turn. Grass takes `grassTurn`, from the World sample, so it doesn't look like wallpaper.

Open the placeholder `tests/roads.tests.js` and replace its contents with:

```js
QUnit.module("turnSides", () => {
  QUnit.test("no turn leaves the sides as they are", (assert) => {
    for (let sides = 0; sides < 16; sides++) assert.strictEqual(turnSides(sides, 0), sides);
  });

  QUnit.test("a quarter turn clockwise takes the back to the right, the right to the front, the front to the left, and the left to the back", (assert) => {
    assert.strictEqual(turnSides(NORTH, 1), EAST);
    assert.strictEqual(turnSides(EAST, 1), SOUTH);
    assert.strictEqual(turnSides(SOUTH, 1), WEST);
    assert.strictEqual(turnSides(WEST, 1), NORTH);
  });

  QUnit.test("four quarter turns come back to where it began, for every set of sides", (assert) => {
    for (let sides = 0; sides < 16; sides++) assert.strictEqual(turnSides(turnSides(turnSides(turnSides(sides, 1), 1), 1), 1), sides);
  });

  QUnit.test("turning by several at once is turning by one that many times", (assert) => {
    for (let sides = 0; sides < 16; sides++) assert.strictEqual(turnSides(sides, 3), turnSides(turnSides(sides, 2), 1));
  });

  QUnit.test("more than a whole turn, or a turn the other way, still works", (assert) => {
    assert.strictEqual(turnSides(NORTH, 5), EAST);
    assert.strictEqual(turnSides(NORTH, -1), WEST);
  });

  QUnit.test("it never makes a side that was not there: the number of sides stays the same", (assert) => {
    const count = (n) => [NORTH, EAST, SOUTH, WEST].filter((side) => n & side).length;
    for (let sides = 0; sides < 16; sides++) for (let turn = 0; turn < 4; turn++) assert.strictEqual(count(turnSides(sides, turn)), count(sides));
  });
});

QUnit.module("sidesOf", () => {
  QUnit.test("a straight piece joins the back and the front, and turned a quarter, the left and the right", (assert) => {
    assert.strictEqual(sidesOf("straight", 0), NORTH | SOUTH);
    assert.strictEqual(sidesOf("straight", 1), EAST | WEST);
  });

  QUnit.test("a corner joins the back and the right, and each quarter turn takes it round to the next corner", (assert) => {
    assert.deepEqual([0, 1, 2, 3].map((turn) => sidesOf("corner", turn)), [NORTH | EAST, EAST | SOUTH, SOUTH | WEST, WEST | NORTH]);
  });

  QUnit.test("a junction has a branch to the back, and no road to the front", (assert) => {
    assert.strictEqual(sidesOf("junction", 0), NORTH | EAST | WEST);
  });

  QUnit.test("a crossroads joins all four, however it is turned", (assert) => {
    for (let turn = 0; turn < 4; turn++) assert.strictEqual(sidesOf("crossroads", turn), 15);
  });

  QUnit.test("grass joins nothing", (assert) => {
    assert.strictEqual(sidesOf("grass", 2), 0);
  });

  QUnit.test("there is a row for every kind of road in the tiles table, and for no other", (assert) => {
    assert.deepEqual(Object.keys(BASE_SIDES).sort(), Object.keys(TILES).filter((kind) => kind !== "grass").sort());
  });
});

QUnit.module("roadPiece", () => {
  const count = (n) => [NORTH, EAST, SOUTH, WEST].filter((side) => n & side).length;

  QUnit.test("for every set of sides with two or more roads, the piece joins exactly those", (assert) => {
    for (let mask = 0; mask < 16; mask++) {
      if (count(mask) < 2) continue;
      const { kind, turn } = roadPiece(mask);

      assert.strictEqual(sidesOf(kind, turn), mask, `mask ${mask}`);
    }
  });

  QUnit.test("two sides across from each other are a straight piece, and two side by side are a corner", (assert) => {
    assert.strictEqual(roadPiece(NORTH | SOUTH).kind, "straight");
    assert.strictEqual(roadPiece(EAST | WEST).kind, "straight");
    for (const mask of [NORTH | EAST, EAST | SOUTH, SOUTH | WEST, WEST | NORTH]) assert.strictEqual(roadPiece(mask).kind, "corner");
  });

  QUnit.test("three sides are a junction, and four a crossroads", (assert) => {
    for (const missing of [NORTH, EAST, SOUTH, WEST]) assert.strictEqual(roadPiece(15 & ~missing).kind, "junction");
    assert.strictEqual(roadPiece(15).kind, "crossroads");
  });

  QUnit.test("a road with one neighbor is a straight piece pointing at it, for the end of a road", (assert) => {
    for (const side of [NORTH, EAST, SOUTH, WEST]) {
      const { kind, turn } = roadPiece(side);

      assert.strictEqual(kind, "straight");
      assert.true((sidesOf(kind, turn) & side) !== 0, `side ${side}`);
    }
  });

  QUnit.test("a road with no neighbors is a straight piece, because it has to be something", (assert) => {
    assert.deepEqual(roadPiece(0), { kind: "straight", turn: 0 });
  });

  QUnit.test("only the four bits count", (assert) => {
    assert.deepEqual(roadPiece(16 + 5), roadPiece(5));
  });

  QUnit.test("every piece it gives is one that there is a model for", (assert) => {
    for (let mask = 0; mask < 16; mask++) assert.true(roadPiece(mask).kind in TILES);
  });
});

QUnit.module("neighborMask and pieceAt", () => {
  const grid = parseMap({ name: "test", rows: ["S##", "..#", "..G"] });

  QUnit.test("the mask has a bit for each side that has road", (assert) => {
    assert.strictEqual(neighborMask(grid, 1, 0), EAST | WEST, "the second cell has the start on its left, and the corner on its right");
    assert.strictEqual(neighborMask(grid, 2, 0), WEST | SOUTH);
    assert.strictEqual(neighborMask(grid, 0, 0), EAST);
  });

  QUnit.test("the edge of the map has no road beyond it", (assert) => {
    assert.strictEqual(neighborMask(grid, 2, 2), NORTH);
  });

  QUnit.test("a corner of a road is a corner piece, turned to join its neighbors", (assert) => {
    assert.deepEqual(pieceAt(grid, 2, 0), { kind: "corner", turn: 2 });
  });

  QUnit.test("a stretch of road is a straight piece, the way the road goes", (assert) => {
    assert.deepEqual(pieceAt(grid, 1, 0), { kind: "straight", turn: 1 });
    assert.deepEqual(pieceAt(grid, 2, 1), { kind: "straight", turn: 0 });
  });

  QUnit.test("the start and the goal are straight pieces pointing along the road", (assert) => {
    assert.deepEqual(pieceAt(grid, 0, 0), { kind: "straight", turn: 1 });
    assert.deepEqual(pieceAt(grid, 2, 2), { kind: "straight", turn: 0 });
  });

  QUnit.test("grass is grass, turned in the way grassTurn says", (assert) => {
    assert.deepEqual(pieceAt(grid, 0, 2), { kind: "grass", turn: grassTurn(0, 2) });
  });

  QUnit.test("on every real map, every piece of road joins every road beside it", (assert) => {
    for (const map of MAPS) {
      const real = parseMap(map);
      real.cells.forEach((line, row) =>
        line.forEach((cell, col) => {
          if (cell !== "road") return;
          const { kind, turn } = pieceAt(real, col, row);
          const wanted = neighborMask(real, col, row);

          assert.strictEqual(sidesOf(kind, turn) & wanted, wanted, `${map.name} ${col},${row}`);
        })
      );
    }
  });

  QUnit.test("a map with branches gets junctions and a crossroads", (assert) => {
    const crossed = parseMap({ name: "test", rows: [".#.", "###", ".#."] });

    assert.strictEqual(pieceAt(crossed, 1, 1).kind, "crossroads");
    assert.strictEqual(pieceAt(crossed, 1, 0).kind, "straight");
    assert.strictEqual(pieceAt(parseMap({ name: "test", rows: [".#.", "###", "..."] }), 1, 1).kind, "junction");
  });
});
```

- **The most important test is "for every set of sides with two or more roads, the piece joins exactly those."** It doesn't say which piece goes where, which you would have to write the answer to sixteen times, and could get wrong in the same way as the code. It says what a piece is *for*: it joins what it is meant to, for every one of them.
- **"On every real map, every piece of road joins every road beside it"** is the same idea, on the real maps: for every cell, the turned piece joins every neighbor. If a quarter turn were the wrong way round (anticlockwise for clockwise), this fails, and it says which cell.
- **`turnSides` has tests of its own:** four turns come back to where they began, turning by three is turning by two and then one, and the number of sides never changes. A turn that loses a side, or makes one, is a turn that is wrong.

**Check:** open `tests.html`. 161 tests pass.

---

## Step 3: The path

Enemies don't walk from cell to cell: they walk a **line**. This file finds the road from the start to the goal, makes it a line in the world, rounds its corners, and answers one question: *if something has walked this far along the line, where is it, and which way is it facing?*

Open the placeholder `js/path.js` and replace its contents with:

```js
// The path an enemy walks: the road of a map, followed from its start to its goal, made into a smooth
// line in the world, and a way to ask where on that line something is after it has walked some distance.
// Nothing here draws anything. See ../tests/path.tests.js.

// The cells of the road, in the order they are walked, from the start to the goal. It is found by
// standing on the start and stepping on to a road cell that hasn't been stood on yet, until the goal.
// It is null if that never gets there.
function findPath(grid) {
  if (!grid.start || !grid.goal) return null;
  const path = [grid.start];
  const seen = new Set([`${grid.start.col},${grid.start.row}`]);
  let here = grid.start;
  while (here.col !== grid.goal.col || here.row !== grid.goal.row) {
    const next = [
      { col: here.col, row: here.row - 1 },
      { col: here.col + 1, row: here.row },
      { col: here.col, row: here.row + 1 },
      { col: here.col - 1, row: here.row },
    ].find((cell) => isRoad(grid, cell.col, cell.row) && !seen.has(`${cell.col},${cell.row}`));
    if (!next) return null;
    path.push(next);
    seen.add(`${next.col},${next.row}`);
    here = next;
  }
  return path;
}

// What is wrong with the road of a map, as a list of sentences. A road can have the right shape, a
// line with two ends, and still not be one road: it can have a loop, or a piece of road on its own.
function pathProblems(grid) {
  const path = findPath(grid);
  if (!path) return ["the road from the start never gets to the goal"];
  const roads = grid.cells.flat().filter((cell) => cell === "road").length;
  if (path.length !== roads) return [`${roads - path.length} cells of road are not on the way from the start to the goal`];
  return [];
}

// Which way is off the board, from a cell on its edge: a step of one in x and z. (The back of the
// board is the end with the biggest z.) A cell in a corner is off two edges: it goes off the first of
// the left, the right, the back and the front that it is on.
function outward(grid, cell) {
  if (cell.col === 0) return { x: -1, z: 0 };
  if (cell.col === grid.cols - 1) return { x: 1, z: 0 };
  if (cell.row === 0) return { x: 0, z: 1 };
  return { x: 0, z: -1 };
}

// The points of the road in the world: where each cell is, with one more at each end, out at the
// edge of the island, so that an enemy walks on to the board and off it, and doesn't appear in the
// middle of the first cell.
function routePoints(grid, path, board = BOARD) {
  const centers = path.map((cell) => cellCenter(cell.col, cell.row, board));
  const reach = board.cell / 2 + board.rim;
  const first = outward(grid, path[0]);
  const last = outward(grid, path[path.length - 1]);
  return [
    { x: centers[0].x + first.x * reach, z: centers[0].z + first.z * reach },
    ...centers,
    { x: centers[centers.length - 1].x + last.x * reach, z: centers[centers.length - 1].z + last.z * reach },
  ];
}

// Rounds off the corners of a line of points. At each corner the line is cut short, to the middle
// of each of the two sides, and joined by a curve that is pulled towards the corner (a *quadratic
// Bezier curve*: at each moment, a mix of the start, the corner and the end). A point in the middle
// of a straight stretch is left alone. The first and the last points don't move.
function smoothPoints(points, samples = 6) {
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1];
    const b = points[i];
    const c = points[i + 1];
    const straight = Math.abs((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x)) < 1e-9;
    if (straight) {
      out.push(b);
      continue;
    }
    const from = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
    const to = { x: (b.x + c.x) / 2, z: (b.z + c.z) / 2 };
    for (let s = 0; s <= samples; s++) {
      const t = s / samples;
      const u = 1 - t;
      out.push({
        x: u * u * from.x + 2 * u * t * b.x + t * t * to.x,
        z: u * u * from.z + 2 * u * t * b.z + t * t * to.z,
      });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

// A line of points, with how far along it each point is, so that "how far has it walked" can be
// turned into a place without adding up every piece again.
function makeRoute(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z));
  }
  return { points, lengths, total: lengths[lengths.length - 1] };
}

// Where something is after walking `distance` along a route, and which way it faces: { x, z, yaw }.
// The yaw is the way Babylon.js turns a model that faces along z to face the way it is going. A
// distance before the start, or past the end, is the start or the end.
function pointAlong(route, distance) {
  const d = Math.min(Math.max(distance, 0), route.total);
  let i = 1;
  while (i < route.lengths.length - 1 && route.lengths[i] < d) i++;
  const a = route.points[i - 1];
  const b = route.points[i];
  const span = route.lengths[i] - route.lengths[i - 1];
  const t = span > 0 ? (d - route.lengths[i - 1]) / span : 0;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    yaw: Math.atan2(b.x - a.x, b.z - a.z),
  };
}

// The route of a map, ready to walk: from the grid of a map to a route, or null if it has no road.
function routeFor(grid, board = BOARD) {
  const path = findPath(grid);
  return path ? makeRoute(smoothPoints(routePoints(grid, path, board))) : null;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findPath, pathProblems, outward, routePoints, smoothPoints, makeRoute, pointAlong, routeFor };
} else {
  Object.assign(window, { findPath, pathProblems, outward, routePoints, smoothPoints, makeRoute, pointAlong, routeFor });
}
```

Things to notice:

- **`findPath` walks the road:** stand on the start, step to a road cell that you haven't stood on, and go on until the goal. It's null if it gets stuck. Because a road is one line, there is never a choice (the check that comes before it says so), and the same code would be wrong for a road with a fork, which will want a decision about which way to go.
- **`pathProblems` finishes the checking** that `mapProblems` can't do. A road can have exactly two neighbors on every piece and still be two roads, or a road and a ring on its own. This says so, and says how many cells aren't on the way.
- **`routePoints` makes the cells into points in the world,** and puts one more at each end, out at the edge of the island (half a cell and the rim away from the first and the last cell, off the side of the board that they are on). That is where an enemy first appears and where it goes off, so it walks on to the board, and doesn't pop up in the middle of the first cell.
- **`smoothPoints` rounds each corner.** Walking from one cell's middle to the next in straight lines would turn an enemy on the spot at every corner. Instead, at a corner the line is cut short, to the middle of each of the two sides, and joined by a curve that is *pulled towards* the corner: a **quadratic Bezier curve**. At a time `t` from 0 to 1, it is a mix of the start, the corner and the end, `(1 - t)^2` of the first, `2 (1 - t) t` of the second, and `t^2` of the third. It leaves the start heading for the corner, and arrives at the end coming from it, and that is what makes it smooth. A point on a straight stretch is left alone (it tests that by whether the two sides are in a line, the *cross product* is zero).
- **`makeRoute` adds how far along each point is,** so that `pointAlong` doesn't have to add up every piece of the line each time it is asked.
- **`pointAlong` finds the piece of the line that a distance is on,** and goes that share of the way along it. The facing, `yaw`, is `Math.atan2(dx, dz)`, which is the turn about the vertical axis that makes a model facing along z face the way `(dx, dz)` points. (The usual order for `atan2` is `(y, x)`; here the angle is measured from the z axis, so it is `(x, z)`.)
- **A distance before the start, or after the end, is the start or the end.** A walker that has gone past the end of the road is at the end of it.

Open the placeholder `tests/path.tests.js` and replace its contents with:

```js
// A board of five across and three deep, a cell of two and a rim of one, so a route is easy to work out by hand.
const PATH_BOARD = { cols: 5, rows: 3, cell: 2, rim: 1, depth: 6, peek: 2, headroom: 1 };

QUnit.module("findPath", () => {
  const near = (a, b) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;

  QUnit.test("goes from the start to the goal along the road", (assert) => {
    const path = findPath(parseMap({ name: "test", rows: ["S##", "..#", "..G"] }));

    assert.deepEqual(path, [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
    ]);
  });

  QUnit.test("on every real map it begins at the start, ends at the goal, and has a cell for every piece of road", (assert) => {
    for (const map of MAPS) {
      const grid = parseMap(map);
      const path = findPath(grid);
      const roads = grid.cells.flat().filter((cell) => cell === "road").length;

      assert.deepEqual(path[0], grid.start, map.name);
      assert.deepEqual(path[path.length - 1], grid.goal, map.name);
      assert.strictEqual(path.length, roads, map.name);
    }
  });

  QUnit.test("each step is to a cell beside the last, and no cell is walked twice", (assert) => {
    for (const map of MAPS) {
      const path = findPath(parseMap(map));

      assert.true(path.every((cell, i) => i === 0 || near(cell, path[i - 1])), map.name);
      assert.strictEqual(new Set(path.map((cell) => `${cell.col},${cell.row}`)).size, path.length, map.name);
    }
  });

  QUnit.test("a road with a gap in it goes nowhere", (assert) => {
    assert.strictEqual(findPath(parseMap({ name: "test", rows: ["S#.#G"] })), null);
  });

  QUnit.test("a map with no start, or no goal, goes nowhere", (assert) => {
    assert.strictEqual(findPath(parseMap({ name: "test", rows: ["###G"] })), null);
    assert.strictEqual(findPath(parseMap({ name: "test", rows: ["S###"] })), null);
  });
});

QUnit.module("pathProblems", () => {
  QUnit.test("a good road has none, and so does every real map", (assert) => {
    assert.deepEqual(pathProblems(parseMap({ name: "test", rows: ["S##G"] })), []);
    for (const map of MAPS) assert.deepEqual(pathProblems(parseMap(map)), [], map.name);
  });

  QUnit.test("a gap in the road is a problem", (assert) => {
    assert.strictEqual(pathProblems(parseMap({ name: "test", rows: ["S#.#G"] })).length, 1);
  });

  QUnit.test("a piece of road that is not on the way is a problem, and is counted", (assert) => {
    const problems = pathProblems(parseMap({ name: "test", rows: ["S###G", ".....", "##..."] }));

    assert.strictEqual(problems.length, 1);
    assert.true(problems[0].startsWith("2 cells"));
  });
});

QUnit.module("outward and routePoints", () => {
  const grid = parseMap({ name: "test", rows: [".S...", ".#..G", ".####"] });

  QUnit.test("off the board is away from the edge a cell is on", (assert) => {
    assert.deepEqual(outward({ cols: 5, rows: 3 }, { col: 0, row: 1 }), { x: -1, z: 0 });
    assert.deepEqual(outward({ cols: 5, rows: 3 }, { col: 4, row: 1 }), { x: 1, z: 0 });
    assert.deepEqual(outward({ cols: 5, rows: 3 }, { col: 2, row: 0 }), { x: 0, z: 1 }, "the back of the board is the way of more z");
    assert.deepEqual(outward({ cols: 5, rows: 3 }, { col: 2, row: 2 }), { x: 0, z: -1 });
  });

  QUnit.test("there is a point for every cell, and one more at each end", (assert) => {
    const path = findPath(grid);

    assert.strictEqual(routePoints(grid, path, PATH_BOARD).length, path.length + 2);
  });

  QUnit.test("the middle points are the middles of the cells", (assert) => {
    const path = findPath(grid);
    const points = routePoints(grid, path, PATH_BOARD);

    path.forEach((cell, i) => assert.deepEqual(points[i + 1], cellCenter(cell.col, cell.row, PATH_BOARD)));
  });

  QUnit.test("the first point is out past the edge of the island, in line with the start, so an enemy walks on to the board", (assert) => {
    const path = findPath(grid);
    const start = cellCenter(path[0].col, path[0].row, PATH_BOARD);
    const first = routePoints(grid, path, PATH_BOARD)[0];

    assert.strictEqual(first.x, start.x);
    assert.strictEqual(first.z, start.z + PATH_BOARD.cell / 2 + PATH_BOARD.rim, "the start is on the back row, so it comes on from the back");
  });

  QUnit.test("and the last is out past the edge in line with the goal", (assert) => {
    const path = findPath(grid);
    const goal = cellCenter(path[path.length - 1].col, path[path.length - 1].row, PATH_BOARD);
    const last = routePoints(grid, path, PATH_BOARD).pop();

    assert.strictEqual(last.x, goal.x + PATH_BOARD.cell / 2 + PATH_BOARD.rim);
    assert.strictEqual(last.z, goal.z);
  });
});

QUnit.module("smoothPoints", () => {
  const length = (points) => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.z - points[i].z), 0);
  const square = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
  ];

  QUnit.test("the first and the last points do not move", (assert) => {
    const out = smoothPoints(square);

    assert.deepEqual(out[0], square[0]);
    assert.deepEqual(out[out.length - 1], square[2]);
  });

  QUnit.test("a straight line is left as it is", (assert) => {
    const line = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 4, z: 0 }, { x: 6, z: 0 }];

    assert.deepEqual(smoothPoints(line), line);
  });

  QUnit.test("a corner is cut: the curve starts in the middle of one side and ends in the middle of the other", (assert) => {
    const out = smoothPoints(square, 6);

    assert.deepEqual(out[1], { x: 2, z: 0 });
    assert.deepEqual(out[out.length - 2], { x: 4, z: 2 });
  });

  QUnit.test("a corner is replaced by the number of samples plus one", (assert) => {
    assert.strictEqual(smoothPoints(square, 6).length, 2 + 7);
    assert.strictEqual(smoothPoints(square, 2).length, 2 + 3);
  });

  QUnit.test("the curve stays inside the corner: no point is outside the box of the three that made it", (assert) => {
    for (const p of smoothPoints(square)) assert.true(p.x >= 0 && p.x <= 4 && p.z >= 0 && p.z <= 4);
  });

  QUnit.test("the way round is shorter than the way along the sides, because it cuts the corner", (assert) => {
    assert.true(length(smoothPoints(square)) < length(square));
  });

  QUnit.test("it never turns sharply: each step is within a quarter of a turn of the last", (assert) => {
    const out = smoothPoints(square, 6);
    for (let i = 2; i < out.length; i++) {
      const a = Math.atan2(out[i - 1].x - out[i - 2].x, out[i - 1].z - out[i - 2].z);
      const b = Math.atan2(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z);
      let turn = Math.abs(b - a);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;

      assert.true(turn < Math.PI / 4, `step ${i}`);
    }
  });
});

QUnit.module("makeRoute and pointAlong", () => {
  const route = makeRoute([
    { x: 0, z: 0 },
    { x: 0, z: 4 },
    { x: 3, z: 4 },
  ]);

  QUnit.test("the route knows how far along each point is, and how long it is", (assert) => {
    assert.deepEqual(route.lengths, [0, 4, 7]);
    assert.strictEqual(route.total, 7);
  });

  QUnit.test("zero is the start, and the whole length is the end", (assert) => {
    assert.deepEqual({ x: pointAlong(route, 0).x, z: pointAlong(route, 0).z }, { x: 0, z: 0 });
    assert.deepEqual({ x: pointAlong(route, 7).x, z: pointAlong(route, 7).z }, { x: 3, z: 4 });
  });

  QUnit.test("in between, it is in between", (assert) => {
    assert.deepEqual({ x: pointAlong(route, 2).x, z: pointAlong(route, 2).z }, { x: 0, z: 2 });
    assert.deepEqual({ x: pointAlong(route, 5.5).x, z: pointAlong(route, 5.5).z }, { x: 1.5, z: 4 });
  });

  QUnit.test("it goes round a corner: the point where two sides meet is on both", (assert) => {
    const p = pointAlong(route, 4);

    assert.true(Math.abs(p.x) < 1e-9 && Math.abs(p.z - 4) < 1e-9);
  });

  QUnit.test("before the start, or past the end, it stays at the start or the end", (assert) => {
    assert.strictEqual(pointAlong(route, -5).z, 0);
    assert.strictEqual(pointAlong(route, 99).x, 3);
  });

  QUnit.test("it faces the way it is going: more z is yaw 0, more x is a quarter turn, and less x is a quarter turn back", (assert) => {
    assert.strictEqual(pointAlong(route, 2).yaw, 0);
    assert.strictEqual(pointAlong(route, 5).yaw, Math.PI / 2);
    const back = makeRoute([{ x: 3, z: 0 }, { x: 0, z: 0 }]);

    assert.strictEqual(pointAlong(back, 1).yaw, -Math.PI / 2);
  });

  QUnit.test("at the very end it still faces the way of the last side", (assert) => {
    assert.strictEqual(pointAlong(route, 7).yaw, Math.PI / 2);
  });

  QUnit.test("a route of no length does not divide by nothing", (assert) => {
    const still = makeRoute([{ x: 1, z: 1 }, { x: 1, z: 1 }]);

    assert.strictEqual(pointAlong(still, 0).x, 1);
  });
});

QUnit.module("routeFor", () => {
  QUnit.test("a map with no road has no route", (assert) => {
    assert.strictEqual(routeFor(parseMap({ name: "test", rows: ["...."] })), null);
  });

  QUnit.test("a real map has one, that starts off the board and ends off the board", (assert) => {
    for (const map of MAPS) {
      const route = routeFor(parseMap(map));
      const start = route.points[0];
      const end = route.points[route.points.length - 1];
      const halfWidth = (BOARD.cols * BOARD.cell) / 2;
      const halfDepth = (BOARD.rows * BOARD.cell) / 2;
      const outside = (p) => Math.abs(p.x) > halfWidth || Math.abs(p.z) > halfDepth;

      assert.true(outside(start) && outside(end), map.name);
    }
  });

  QUnit.test("every point of the route is on the island", (assert) => {
    for (const map of MAPS) {
      for (const p of routeFor(parseMap(map)).points) {
        assert.true(Math.abs(p.x) <= (BOARD.cols * BOARD.cell) / 2 + BOARD.rim + 1e-9, map.name);
        assert.true(Math.abs(p.z) <= (BOARD.rows * BOARD.cell) / 2 + BOARD.rim + 1e-9, map.name);
      }
    }
  });

  QUnit.test("it is about a cell long for every cell of road, a little less for the corners it cuts, and a little more for the ways on and off", (assert) => {
    for (const map of MAPS) {
      const grid = parseMap(map);
      const cells = findPath(grid).length;
      const route = routeFor(grid);
      const straight = (cells - 1) * BOARD.cell + 2 * (BOARD.cell / 2 + BOARD.rim);

      assert.true(route.total < straight, `${map.name}: cut corners are shorter`);
      assert.true(route.total > straight * 0.85, `${map.name}: but not by much`);
    }
  });
});
```

- **The tests use a small board and a small map** for each rule, and the real maps for what must be true of all of them: a path that starts at the start and ends at the goal, has a cell for every piece of road, steps to a neighbor every time, and never walks a cell twice.
- **"It never turns sharply"** walks a rounded corner and checks that no step turns by more than a quarter of a turn from the last one. That is what *smooth* means, said as a test.
- **"The way round is shorter than the way along the sides"** and **"it is about a cell long for every cell of road, a little less for the corners it cuts"** pin the length down from both sides: not longer than the corners would be, and not much shorter.
- **`pointAlong`'s tests say which way is which:** more z is yaw 0, more x is a quarter turn, less x a quarter turn back. If you ever change which way the camera looks, this is where it shows.

**Check:** open `tests.html`. 193 tests pass.

---

## Step 4: The walker

Something that walks a route needs to know how far it has gone, how fast it goes, and when it has got there. That is all a **walker** is, and it has no models, no scene and no animation in it. That is what makes it easy to test (a test can walk a route for a minute in a few milliseconds), and it means a slowing spell, in a later tutorial, only has to change one number.

Open the placeholder `js/walker.js` and replace its contents with:

```js
// The walker: how far something has walked along a route. It knows nothing of models or of the
// scene, only of distance, speed and time, and that is what makes it easy to test. An enemy has one,
// and later a slowing spell will change its `speedScale`. See ../tests/walker.tests.js.

class Walker {
  constructor(route, speed, distance = 0) {
    this.route = route;
    this.speed = speed; // world units a second
    this.speedScale = 1; // a way to slow it down (or speed it up) for a while: 0.5 is half as fast
    this.distance = distance;
  }

  // Walks for `dt` seconds. It stops at the end of the route and doesn't go further.
  update(dt) {
    this.distance = Math.min(this.route.total, this.distance + this.speed * this.speedScale * dt);
  }

  // How far along it is, from 0 at the start to 1 at the end.
  get progress() {
    return this.route.total > 0 ? this.distance / this.route.total : 1;
  }

  // Whether it has got to the end.
  get done() {
    return this.distance >= this.route.total;
  }

  // Where it is, and which way it faces: { x, z, yaw }.
  position() {
    return pointAlong(this.route, this.distance);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Walker };
} else {
  window.Walker = Walker;
}
```

- **`speedScale` is a multiplier, and the way to slow something down:** 0.5 is half as fast, 0 is standing still, 2 is twice as fast. It is separate from `speed` so that whatever slows an enemy doesn't have to remember what its speed was to put it back.
- **`update(dt)` takes the time that has passed,** not "one frame". Frames are different lengths, and an enemy has to go the same distance in a second on a slow computer as on a fast one.
- **`Math.min(total, ...)` stops it at the end.** Without it, a walker would go on past the end of the road, and `done` would be true, and so would a lot of other things that aren't.
- **`progress` is a number from 0 to 1,** which a later tutorial uses to say which enemy is *furthest ahead*, which is the one a tower should shoot first.
- **`get` makes `progress` and `done` look like fields,** though they are worked out each time you ask.

Open the placeholder `tests/walker.tests.js` and replace its contents with:

```js
QUnit.module("Walker", () => {
  // A route that goes four along z, and then three along x: seven in all.
  const makeWalkRoute = () =>
    makeRoute([
      { x: 0, z: 0 },
      { x: 0, z: 4 },
      { x: 3, z: 4 },
    ]);

  QUnit.test("begins at the start, not done, with nothing walked", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);

    assert.strictEqual(walker.distance, 0);
    assert.strictEqual(walker.progress, 0);
    assert.false(walker.done);
  });

  QUnit.test("walks its speed times the time", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);
    walker.update(1.5);

    assert.strictEqual(walker.distance, 3);
  });

  QUnit.test("many short steps are the same as one long one", (assert) => {
    const a = new Walker(makeWalkRoute(), 2);
    const b = new Walker(makeWalkRoute(), 2);
    for (let i = 0; i < 60; i++) a.update(1 / 60);
    b.update(1);

    assert.true(Math.abs(a.distance - b.distance) < 1e-9);
  });

  QUnit.test("progress is the share of the route walked", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1);
    walker.update(3.5);

    assert.strictEqual(walker.progress, 0.5);
  });

  QUnit.test("stops at the end, and is done, and does not go on", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);
    walker.update(100);

    assert.strictEqual(walker.distance, 7);
    assert.strictEqual(walker.progress, 1);
    assert.true(walker.done);
  });

  QUnit.test("is done at the end exactly, and not a moment before", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1);
    walker.update(6.99);
    assert.false(walker.done);
    walker.update(0.01);

    assert.true(walker.done);
  });

  QUnit.test("a speed scale makes it slower or faster, and can be changed in the middle", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);
    walker.speedScale = 0.5;
    walker.update(2);
    walker.speedScale = 2;
    walker.update(1);

    assert.strictEqual(walker.distance, 2 + 4);
  });

  QUnit.test("a speed scale of nothing is standing still", (assert) => {
    const walker = new Walker(makeWalkRoute(), 2);
    walker.speedScale = 0;
    walker.update(10);

    assert.strictEqual(walker.distance, 0);
  });

  QUnit.test("it can begin part of the way along", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1, 5);

    assert.strictEqual(walker.position().z, 4);
    assert.strictEqual(walker.position().x, 1);
  });

  QUnit.test("it says where it is, and which way it faces, as the route does", (assert) => {
    const walker = new Walker(makeWalkRoute(), 1);
    walker.update(2);

    assert.deepEqual(walker.position(), pointAlong(walker.route, 2));
    assert.strictEqual(walker.position().yaw, 0);
    walker.update(3);
    assert.strictEqual(walker.position().yaw, Math.PI / 2);
  });

  QUnit.test("on a real route it gets to the end in the length over the speed", (assert) => {
    const route = routeFor(parseMap(MAPS[0]));
    const walker = new Walker(route, 2);
    let time = 0;
    while (!walker.done) {
      walker.update(1 / 60);
      time += 1 / 60;
    }

    assert.true(Math.abs(time - route.total / 2) < 0.05);
  });
});
```

- **"Many short steps are the same as one long one"** is the test for the frame rate: sixty steps of a sixtieth of a second go the same distance as one of a second.
- **"On a real route it gets to the end in the length over the speed"** walks a whole map, a sixtieth of a second at a time, and checks the time it took.

**Check:** open `tests.html`. 204 tests pass.

---

## Step 5: Enemies

Now the enemies, and they are the first characters in the game: models with a **skeleton** and **animations**. An enemy needs to be the right size, stand on the ground, walk along the route facing the way it goes, play its walking animation, and keep its feet from skating over the ground.

First, two small additions to `models.js`, for models that stand on their feet and whose height matters more than their width. You wrote `fitScale` for a tile, which has to fit its cell whatever its thickness; a character is the other way round.

In `js/models.js`, after line 21, add:

```js
// How much to scale a model to make it `height` tall: for a character, whose height matters and whose
// width is whatever it is.
function heightScale(size, height) {
  return height / size.y;
}

// How far to move a model up so that its *bottom* is at the ground, for a model that stands on its feet.
function bottomOffset(bounds, scale) {
  return -bounds.min.y * scale;
}

```

Then the new names have to be in the export block at the bottom of the same file:

In `js/models.js`, **replace** lines 71 to 73:

```js
  module.exports = { ASSETS, sizeOf, fitScale, topOffset, centerOffset, measure, loadModel };
} else {
  Object.assign(window, { ASSETS, sizeOf, fitScale, topOffset, centerOffset, measure, loadModel });
```

with:

```js
  module.exports = { ASSETS, sizeOf, fitScale, heightScale, bottomOffset, topOffset, centerOffset, measure, loadModel };
} else {
  Object.assign(window, { ASSETS, sizeOf, fitScale, heightScale, bottomOffset, topOffset, centerOffset, measure, loadModel });
```

And their tests, at the very end of `tests/models.tests.js`:

In `tests/models.tests.js`, after line 97, add:

```js

QUnit.module("heightScale and bottomOffset", () => {
  QUnit.test("heightScale makes a model the height asked for, whatever its width", (assert) => {
    assert.strictEqual(heightScale({ x: 5, y: 2, z: 9 }, 1), 0.5);
    assert.strictEqual(heightScale({ x: 0.1, y: 1.8, z: 0.1 }, 0.9), 0.5);
  });

  QUnit.test("bottomOffset lifts a model drawn with its feet below zero, and lowers one that floats", (assert) => {
    assert.strictEqual(bottomOffset(box([-1, -0.5, -1], [1, 1.5, 1]), 2), 1);
    assert.strictEqual(bottomOffset(box([-1, 2, -1], [1, 3, 1]), 1), -2);
  });

  QUnit.test("a model that stands on zero is not moved", (assert) => {
    assert.strictEqual(bottomOffset(box([-1, 0, -1], [1, 1.8, 1]), 0.5) + 0, 0);
  });

  QUnit.test("after the offset, the bottom is exactly at zero", (assert) => {
    const bounds = box([-1, -0.3, -1], [1, 1.7, 1]);
    const scale = heightScale(sizeOf(bounds), 1.2);

    assert.true(Math.abs(bounds.min.y * scale + bottomOffset(bounds, scale)) < 1e-12);
  });
});
```

Now the enemies. Open the placeholder `js/enemies.js` and replace its contents with:

```js
// The enemies: who they are (a table), loading their models, and an enemy that walks a route
// with the right animation at the right speed. How fast an enemy goes comes from the table; the
// distance it has walked comes from a Walker; this file turns those into a model that moves and
// walks. See ../tests/enemies.tests.js.

// The enemies, one row each. `height` is how tall the model is made in the world, where a cell is two
// units wide; `speed` is how fast it walks, in world units a second; `clip` is the animation it plays.
const ENEMIES = {
  grunt: { name: "Masked Grunt", file: "enemies/grunt.glb", height: 1.5, speed: 1.6, clip: "Walking" },
  scout: { name: "Scout Raider", file: "enemies/scout.glb", height: 1.35, speed: 3.0, clip: "Running" },
  heavy: { name: "Heavy Trooper", file: "enemies/heavy.glb", height: 1.9, speed: 1.1, clip: "Walking" },
  dai_li: { name: "Dai Li Agent", file: "enemies/dai_li.glb", height: 1.55, speed: 1.9, clip: "Walking" },
  spirit: { name: "Corrupted Spirit", file: "enemies/spirit.glb", height: 1.8, speed: 1.3, clip: "Unsteady_Walk" },
};

// How far a model that is not scaled moves in a second while it plays a clip at its normal speed: its
// *stride*. An animation plays at its own pace, and to stop the feet sliding it has to be played faster
// or slower to match how fast the enemy is going. These are measured by eye, and are the numbers to
// change if a walk looks like skating.
const CLIPS = {
  Walking: { stride: 1.4 },
  Running: { stride: 4 },
  Unsteady_Walk: { stride: 0.7 },
};

// How fast to play a clip so that the feet keep up: the speed of the enemy, against the speed the clip
// would move a model of the size it is made.
function clipRatio(speed, scale, clip) {
  return speed / (CLIPS[clip].stride * scale);
}

// Loads every kind of enemy, and works out how each is scaled and lifted to stand on the ground.
async function loadEnemies(scene, enemies = ENEMIES) {
  const kinds = Object.keys(enemies);
  const containers = await Promise.all(kinds.map((kind) => loadModel(scene, enemies[kind].file)));
  const loaded = {};
  kinds.forEach((kind, i) => {
    const bounds = measure(containers[i].rootNodes[0]);
    const scale = heightScale(sizeOf(bounds), enemies[kind].height);
    loaded[kind] = { container: containers[i], scale, lift: bottomOffset(bounds, scale) };
  });
  return loaded;
}

class Enemy {
  constructor(scene, loaded, kind, route, name = `enemy ${kind}`, enemies = ENEMIES) {
    const spec = enemies[kind];
    const model = loaded[kind];
    this.kind = kind;
    this.walker = new Walker(route, spec.speed);

    // The outer node is where the enemy is and which way it faces. The inner one scales the model and
    // puts its feet on the ground.
    this.node = new BABYLON.TransformNode(name, scene);
    const inner = new BABYLON.TransformNode(`${name} model`, scene);
    inner.parent = this.node;
    inner.position.y = model.lift;
    inner.scaling.setAll(model.scale);

    // A model with a skeleton can't be an instance: every copy has to be in a pose of its own. So the
    // container makes a copy of the skeleton, and of the animations, for each enemy.
    this.copy = model.container.instantiateModelsToScene((original) => `${name} ${original}`, false, { doNotInstantiate: false });
    this.copy.rootNodes[0].parent = inner;
    this.copy.animationGroups.forEach((group) => group.stop());
    this.clip = this.copy.animationGroups.find((group) => group.name === `${name} ${spec.clip}`);
    this.clip.start(true, clipRatio(spec.speed, model.scale, spec.clip));
    this.update(0);
  }

  // Walks for `dt` seconds, and puts the enemy where it has got to.
  update(dt) {
    this.walker.update(dt);
    const { x, z, yaw } = this.walker.position();
    this.node.position.set(x, 0, z);
    this.node.rotation.y = yaw;
  }

  // Whether it has walked the whole route.
  get done() {
    return this.walker.done;
  }

  // Takes it out of the scene, with its copy of the skeleton and of the animations (the model's meshes and
  // pictures are shared with every other enemy of the kind, and are left alone).
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
  module.exports = { ENEMIES, CLIPS, clipRatio, loadEnemies, Enemy };
} else {
  Object.assign(window, { ENEMIES, CLIPS, clipRatio, loadEnemies, Enemy });
}
```

Things to notice:

- **`ENEMIES` is the table of who they are:** name, model, how tall, how fast, and which clip they play. Everything about an enemy that is a number is here, and a later tutorial adds the numbers that matter in a fight (how much health, how much armor) to the same rows. The scout runs, so it is the fastest; the heavy trooper is the biggest and the slowest; the spirit walks with an unsteady walk of its own.
- **`CLIPS` and `clipRatio` are how the feet stay on the ground.** An animation plays at its own pace, which is right for a model at its own size going the speed it was made for. A model scaled down to half takes half-size steps, and an enemy that is going faster or slower than the clip would need its feet to move at a different rate. `stride` is how far a model at its own size goes in a second of a clip, and the ratio of the enemy's speed to the stride (scaled to its size) is how much faster or slower to play the clip. The strides are **measured by eye**, and are the numbers to change if a walk looks like skating: it's the one place where looking is better than a test.
- **`loadEnemies` loads one container for each kind,** like `loadTiles`, and works out its scale (from the *height* in the table) and its lift (so its feet are at the ground).
- **An enemy is two nodes and a copy of a model,** like a tile. The outer node says where it is and which way it faces, and the inner one scales the model and puts its feet on the ground.
- **A model with a skeleton can't be an instance.** An instance shares everything with its source, including the pose, and two enemies have to be in different poses. So `instantiateModelsToScene` **clones the skeleton, and the animations**, for each enemy; only the triangles and the pictures are shared. (A hundred enemies are a hundred skeletons, which is why a later tutorial puts a limit, in a table, on how many are on the board.)
- **The clone's names start with the enemy's name,** because the function that is passed in names each part of the copy. That is how `find` gets the right clip of *this* enemy and not another one's.
- **The clip is stopped and started again** because a copy of every animation starts playing at once, and an enemy that walks and runs and falls over all at the same time is a mess. Then the one it needs is started, looping, at the ratio that fits its feet.
- **`update` moves the walker, and puts the enemy where it is.** The enemy owns a walker and asks it; the walker knows nothing of the enemy.
- **`dispose` takes the copies away,** the animation groups and the skeleton, and the nodes. A mesh and a picture that belong to the container are left alone because the next enemy of that kind uses them. If it forgot the skeleton or the animations, a game that sends a thousand enemies would be a little slower with each one, and nothing would say why.

Open the placeholder `tests/enemies.tests.js` and replace its contents with:

```js
QUnit.module("the ENEMIES table", () => {
  QUnit.test("every enemy has a name, a model, a size, a speed and a clip", (assert) => {
    for (const [kind, spec] of Object.entries(ENEMIES)) {
      assert.true(spec.name.length > 0, kind);
      assert.true(spec.file.endsWith(".glb"), kind);
      assert.true(spec.height > 0, kind);
      assert.true(spec.speed > 0, kind);
      assert.true(spec.clip in CLIPS, kind);
    }
  });

  QUnit.test("there are five kinds, and the heavy one is the biggest and the slowest", (assert) => {
    const rows = Object.values(ENEMIES);

    assert.strictEqual(rows.length, 5);
    assert.strictEqual(Math.max(...rows.map((r) => r.height)), ENEMIES.heavy.height);
    assert.strictEqual(Math.min(...rows.map((r) => r.speed)), ENEMIES.heavy.speed);
  });

  QUnit.test("the scout is the fastest, and it runs", (assert) => {
    assert.strictEqual(Math.max(...Object.values(ENEMIES).map((r) => r.speed)), ENEMIES.scout.speed);
    assert.strictEqual(ENEMIES.scout.clip, "Running");
  });

  QUnit.test("an enemy is not taller than a podium would let you see over: under a cell and a bit", (assert) => {
    for (const spec of Object.values(ENEMIES)) assert.true(spec.height < BOARD.cell, spec.name);
  });
});

QUnit.module("clipRatio", () => {
  QUnit.test("a model that goes the speed its clip would take it plays the clip at its normal speed", (assert) => {
    assert.strictEqual(clipRatio(CLIPS.Walking.stride * 0.5, 0.5, "Walking"), 1);
  });

  QUnit.test("twice as fast is twice as quick a clip", (assert) => {
    assert.strictEqual(clipRatio(2, 1, "Walking"), 2 * clipRatio(1, 1, "Walking"));
  });

  QUnit.test("a smaller model takes smaller steps, and has to move its feet quicker to go the same speed", (assert) => {
    assert.true(clipRatio(1, 0.5, "Walking") > clipRatio(1, 1, "Walking"));
  });

  QUnit.test("a running clip covers more ground, so it is played more slowly at the same speed", (assert) => {
    assert.true(clipRatio(2, 1, "Running") < clipRatio(2, 1, "Walking"));
  });
});

QUnit.module("loading and walking enemies", (hooks) => {
  let engine, scene, loaded, route;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadEnemies(scene);
    route = routeFor(parseMap(MAPS[0]));
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  // The box that holds everything a node holds, in the world.
  const boundsOf = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true);
  };

  QUnit.test("every kind loads, and has every clip that the table says it plays", (assert) => {
    for (const [kind, spec] of Object.entries(ENEMIES)) {
      assert.true(loaded[kind].container.animationGroups.some((group) => group.name === spec.clip), `${kind} has ${spec.clip}`);
    }
  });

  QUnit.test("every kind has a Walking clip and a clip for falling, for the next tutorials", (assert) => {
    for (const kind of Object.keys(ENEMIES)) {
      const names = loaded[kind].container.animationGroups.map((group) => group.name);

      assert.true(names.includes("Walking") && names.includes("Running"), kind);
      assert.true(names.includes("Dead") || names.includes("Fall_Dead_from_Abdominal_Injury"), kind);
    }
  });

  QUnit.test("each is made the height the table says, and stands with its feet on the ground", (assert) => {
    for (const kind of Object.keys(ENEMIES)) {
      const enemy = new Enemy(scene, loaded, kind, route, `size ${kind}`);
      const { min, max } = boundsOf(enemy.node);

      assert.true(Math.abs(max.y - min.y - ENEMIES[kind].height) < 0.02, `${kind} is ${(max.y - min.y).toFixed(2)} tall`);
      assert.true(Math.abs(min.y) < 0.02, `${kind} stands at ${min.y.toFixed(3)}`);
      enemy.dispose();
    }
  });

  QUnit.test("an enemy begins at the start of the route, facing the way it goes", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "begin");

    assert.true(Math.abs(enemy.node.position.x - route.points[0].x) < 1e-9);
    assert.true(Math.abs(enemy.node.position.z - route.points[0].z) < 1e-9);
    assert.true(Math.abs(enemy.node.rotation.y - pointAlong(route, 0).yaw) < 1e-9);
    enemy.dispose();
  });

  QUnit.test("it plays the clip the table says, and no other, at a speed that matches its feet to the ground", (assert) => {
    for (const kind of Object.keys(ENEMIES)) {
      const enemy = new Enemy(scene, loaded, kind, route, `clip ${kind}`);
      const playing = enemy.copy.animationGroups.filter((group) => group.isPlaying);

      assert.strictEqual(playing.length, 1, kind);
      assert.strictEqual(playing[0], enemy.clip, kind);
      assert.true(Math.abs(enemy.clip.speedRatio - clipRatio(ENEMIES[kind].speed, loaded[kind].scale, ENEMIES[kind].clip)) < 1e-9, kind);
      assert.true(enemy.clip.loopAnimation, kind);
      enemy.dispose();
    }
  });

  QUnit.test("update moves it along the route at the speed in the table", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "move");
    enemy.update(2);

    assert.true(Math.abs(enemy.walker.distance - 2 * ENEMIES.grunt.speed) < 1e-9);
    const where = pointAlong(route, enemy.walker.distance);
    assert.true(Math.abs(enemy.node.position.x - where.x) < 1e-9 && Math.abs(enemy.node.position.z - where.z) < 1e-9);
    enemy.dispose();
  });

  QUnit.test("it turns to face the way it goes round the corners", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "turn");
    const yaws = new Set();
    for (let i = 0; i < 2000 && !enemy.done; i++) {
      enemy.update(0.1);
      yaws.add(Math.round(enemy.node.rotation.y * 10) / 10);
    }

    assert.true(yaws.size > 4, "it faces many ways on the way");
    enemy.dispose();
  });

  QUnit.test("it is done when it has walked all the way, and not before", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "done");

    assert.false(enemy.done);
    enemy.update(route.total / ENEMIES.scout.speed + 1);
    assert.true(enemy.done);
    enemy.dispose();
  });

  QUnit.test("each enemy has a skeleton and animations of its own, so each is in a pose of its own", (assert) => {
    const a = new Enemy(scene, loaded, "grunt", route, "own a");
    const b = new Enemy(scene, loaded, "grunt", route, "own b");

    assert.notStrictEqual(a.copy.skeletons[0], b.copy.skeletons[0]);
    assert.notStrictEqual(a.clip, b.clip);
    a.dispose();
    b.dispose();
  });

  QUnit.test("an enemy that is taken away leaves nothing behind", (assert) => {
    const meshes = scene.meshes.length;
    const groups = scene.animationGroups.length;
    const skeletons = scene.skeletons.length;
    const nodes = scene.transformNodes.length;
    const enemy = new Enemy(scene, loaded, "heavy", route, "gone");
    assert.true(scene.animationGroups.length > groups);
    enemy.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.animationGroups.length, groups);
    assert.strictEqual(scene.skeletons.length, skeletons);
    assert.strictEqual(scene.transformNodes.length, nodes);
  });
});
```

- **These tests load the real models,** so the page must come from a web server. `hooks.before` loads them once for the whole module (five models take a moment), and every test makes enemies in the same scene.
- **"Each is made the height the table says, and stands with its feet on the ground"** measures the box round a real enemy in the world, so it checks the scale, the lift and the two nodes together.
- **"It plays the clip the table says, and no other"** is why the enemy stops every group and starts one.
- **"An enemy that is taken away leaves nothing behind"** counts meshes, animation groups, skeletons and nodes in the scene before and after. A leak of any of them would show here and nowhere else.

**Check:** open `tests.html` through the web server. 226 tests pass.

---

## Step 6: Markers

The road has a piece for a bend and a piece for a crossing, and none for an end. The start and the goal are straight pieces, and nothing says that they are special. So they get a marker: a glowing ring and a disc, made in code, in the color of the nation that comes from there (the red of fire for where the enemies come on, the gold of the banner for where they are trying to go).

Open the placeholder `js/markers.js` and replace its contents with:

```js
// The markers of the road: a glowing ring where enemies come on to the board, and another where
// they are trying to get to. They are made in code, from a ring and a disc, because the road has no
// piece for an end. They breathe a little, so that they are noticed. See ../tests/markers.tests.js.

const MARKERS = {
  start: { color: "#e0482b", radius: 0.78 }, // the red of the fire nation
  goal: { color: "#f2c230", radius: 0.78 }, // the gold of the banner
};

const MARKER_BREATH = { size: 0.08, rate: 3 }; // how much the ring grows and shrinks (a share of its size), and how fast, in radians a second

// How big the ring is, as a multiple of its size, after `time` seconds: a slow swell and shrink.
function markerPulse(time) {
  return 1 + MARKER_BREATH.size * Math.sin(time * MARKER_BREATH.rate);
}

// Makes a marker in the cell, standing on the ground. `update(time)` makes it breathe.
function buildMarker(scene, kind, col, row, board = BOARD) {
  const { color, radius } = MARKERS[kind];
  const { x, z } = cellCenter(col, row, board);
  const node = new BABYLON.TransformNode(`marker ${kind}`, scene);
  node.position.set(x, 0.04, z);

  const glow = BABYLON.Color3.FromHexString(color);
  const material = new BABYLON.StandardMaterial(`marker ${kind}`, scene);
  material.emissiveColor = glow;
  material.disableLighting = true;
  material.backFaceCulling = false;
  material.alpha = 0.9;

  const ring = BABYLON.MeshBuilder.CreateTorus(`marker ${kind} ring`, { diameter: radius * 2, thickness: 0.14, tessellation: 40 }, scene);
  ring.parent = node;
  ring.material = material;
  ring.isPickable = false;

  const disc = BABYLON.MeshBuilder.CreateDisc(`marker ${kind} disc`, { radius: radius * 0.92, tessellation: 40 }, scene);
  disc.parent = node;
  disc.rotation.x = Math.PI / 2; // a disc is made standing up, facing along z: lay it flat
  disc.position.y = -0.02;
  disc.material = material.clone(`marker ${kind} disc`);
  disc.material.alpha = 0.3;
  disc.isPickable = false;

  const update = (time) => node.scaling.setAll(markerPulse(time));
  return { node, ring, disc, update };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARKERS, MARKER_BREATH, markerPulse, buildMarker };
} else {
  Object.assign(window, { MARKERS, MARKER_BREATH, markerPulse, buildMarker });
}
```

- **A marker is made from a torus and a disc.** `CreateTorus` makes a ring that lies flat on the ground, and `CreateDisc` makes a disc that stands up, facing along z, so it is turned a quarter about x to lie down.
- **`disableLighting` and `emissiveColor`** make them glow: the light doesn't change the color, so a marker looks the same in the sun and in shadow. The disc is a copy of the material with its own `alpha`, so it is see-through and the ring isn't.
- **`backFaceCulling = false`** draws both sides of the disc. A flat shape seen from above is only seen from one side, and which side depends on which way it is turned: it's easier to draw both than to work it out.
- **`markerPulse` is a function of time** that swells and shrinks the marker, a few percent. The rate and the size are in `MARKER_BREATH`. A thing that is perfectly still on a board where everything else moves is easy not to see.
- **`isPickable = false`** on both: later, a finger will touch the cell under a marker, and the marker mustn't be what catches it.

Open the placeholder `tests/markers.tests.js` and replace its contents with:

```js
QUnit.module("markerPulse", () => {
  QUnit.test("starts at its own size", (assert) => {
    assert.strictEqual(markerPulse(0), 1);
  });

  QUnit.test("never gets more than the table's share bigger or smaller", (assert) => {
    for (let t = 0; t < 20; t += 0.1) {
      assert.true(markerPulse(t) <= 1 + MARKER_BREATH.size + 1e-12);
      assert.true(markerPulse(t) >= 1 - MARKER_BREATH.size - 1e-12);
    }
  });

  QUnit.test("does get that big, and that small", (assert) => {
    const sizes = Array.from({ length: 200 }, (_, n) => markerPulse(n * 0.05));

    assert.true(Math.max(...sizes) > 1 + MARKER_BREATH.size * 0.99);
    assert.true(Math.min(...sizes) < 1 - MARKER_BREATH.size * 0.99);
  });

  QUnit.test("comes round again: after a whole turn of the rate it is the same", (assert) => {
    const turn = (2 * Math.PI) / MARKER_BREATH.rate;

    assert.true(Math.abs(markerPulse(1) - markerPulse(1 + turn)) < 1e-9);
  });
});

QUnit.module("buildMarker", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("stands in the middle of its cell, a hair above the ground", (assert) => {
    const marker = buildMarker(scene, "start", 3, 2);
    const { x, z } = cellCenter(3, 2);

    assert.strictEqual(marker.node.position.x, x);
    assert.strictEqual(marker.node.position.z, z);
    assert.true(marker.node.position.y > 0 && marker.node.position.y < 0.2);
  });

  QUnit.test("is a ring and a disc, in the color of its kind", (assert) => {
    for (const kind of Object.keys(MARKERS)) {
      const marker = buildMarker(scene, kind, 0, 0);

      assert.true(marker.ring.parent === marker.node && marker.disc.parent === marker.node, kind);
      assert.true(marker.ring.material.emissiveColor.toHexString().toLowerCase() === MARKERS[kind].color, kind);
    }
  });

  QUnit.test("the start and the goal are not the same color", (assert) => {
    assert.notStrictEqual(MARKERS.start.color, MARKERS.goal.color);
  });

  QUnit.test("is flat: the ring lies in the ground, and the disc is turned to lie in it too", (assert) => {
    const marker = buildMarker(scene, "goal", 0, 0);
    const { extendSize } = marker.ring.getBoundingInfo().boundingBox;

    assert.true(extendSize.y < extendSize.x / 4, "the ring is much wider than it is tall");
    assert.strictEqual(marker.disc.rotation.x, Math.PI / 2);
  });

  QUnit.test("is lit by nothing, and the disc is more see-through than the ring", (assert) => {
    const marker = buildMarker(scene, "goal", 0, 0);

    assert.true(marker.ring.material.disableLighting);
    assert.true(marker.disc.material.alpha < marker.ring.material.alpha);
  });

  QUnit.test("cannot be picked, so it won't catch a click meant for the cell", (assert) => {
    const marker = buildMarker(scene, "start", 0, 0);

    assert.false(marker.ring.isPickable);
    assert.false(marker.disc.isPickable);
  });

  QUnit.test("update makes it the size markerPulse says", (assert) => {
    const marker = buildMarker(scene, "start", 0, 0);
    marker.update(1.7);

    assert.true(Math.abs(marker.node.scaling.x - markerPulse(1.7)) < 1e-12);
    assert.strictEqual(marker.node.scaling.x, marker.node.scaling.z);
  });
});
```

**Check:** open `tests.html`. 237 tests pass.

---

## Step 7: The game

The page and the test page already load every new script (you were given `index.html` and `tests.html` with their `<script>` lines). The last change is `main.js`, which loses the stand-in road and uses the map, the markers and the enemies.

First, the road across the middle goes, and with it the function that said what went in each cell. In its place there is a choice of map, and a table for the demonstration that sends enemies along it:

In `js/main.js`, **replace** lines 14 to 17:

```js
// What goes in every cell, for now: grass, with one road of straight pieces across the middle
// row, turned a quarter so that it runs from side to side. It is only there to show that two kinds
// of tile fit together. The next sample replaces it with a map.
const kindAt = (col, row) => (row === Math.floor(BOARD.rows / 2) ? { kind: "straight", turn: 1 } : { kind: "grass", turn: grassTurn(col, row) });
```

with:

```js
// Which map to play: the first, unless the address says `?map=1` (or 2, and so on, round the list).
const mapNumber = Number(new URLSearchParams(window.location.search).get("map")) || 0;
const map = MAPS[mapNumber % MAPS.length];

// For now there is no wave: an enemy of each kind in turn comes on every few seconds and walks the
// road, so that you can see them.
const DEMO = { gap: 2.5, order: ["grunt", "scout", "heavy", "dai_li", "spirit"] };
```

- **`?map=1` in the address chooses the second map.** `new URLSearchParams(window.location.search).get("map")` reads it; if there's none, `Number(null)` is 0, and `|| 0` makes sure that a word that isn't a number ends up as the first map too. `% MAPS.length` brings any number round into the list.
- **`DEMO` is a stand-in, like the road was.** There are no waves yet, so an enemy of each kind comes on in turn, every two and a half seconds, and walks the road. The next tutorials replace it with towers to shoot them.

Then the scene uses the map. This is the biggest change: it checks the map, builds the tiles from it, puts the markers on, loads the enemies, and sends them along the road every frame:

In `js/main.js`, **replace** lines 43 to 51:

```js
  const tiles = await loadTiles(scene);
  buildTiles(scene, tiles, kindAt);
  buildIsland(scene);

  // The clouds drift every frame. The time a frame took is capped, so that a tab that has been
  // in the background doesn't make them jump when it comes back.
  const clouds = buildClouds(scene, seededRandom(CLOUDS.seed));
  scene.onBeforeRenderObservable.add(() => {
    clouds.update(Math.min(engine.getDeltaTime() / 1000, 0.05));
```

with:

```js
  // A map that can't be played is no use, so say what is wrong with it, and stop.
  const grid = parseMap(map);
  const problems = [...mapProblems(map), ...pathProblems(grid)];
  if (problems.length) throw new Error(`The map "${map.name}" can't be played: ${problems.join("; ")}.`);

  const tiles = await loadTiles(scene);
  buildTiles(scene, tiles, (col, row) => pieceAt(grid, col, row));
  buildIsland(scene);
  const markers = [buildMarker(scene, "start", grid.start.col, grid.start.row), buildMarker(scene, "goal", grid.goal.col, grid.goal.row)];

  const loaded = await loadEnemies(scene);
  const route = routeFor(grid);

  // Everything moves every frame, by the time the frame took, capped at 0.05 seconds, so that a tab
  // that has been in the background doesn't make everything jump when it comes back.
  const clouds = buildClouds(scene, seededRandom(CLOUDS.seed));
  let enemies = [];
  let clock = 0;
  let sinceLast = DEMO.gap; // so that the first one comes on at once
  let comeOn = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    clock += dt;
    clouds.update(dt);
    markers.forEach((marker) => marker.update(clock));

    sinceLast += dt;
    if (sinceLast >= DEMO.gap) {
      sinceLast = 0;
      enemies.push(new Enemy(scene, loaded, DEMO.order[comeOn++ % DEMO.order.length], route, `enemy ${comeOn}`));
    }
    enemies.forEach((enemy) => enemy.update(dt));
    enemies = enemies.filter((enemy) => {
      if (!enemy.done) return true;
      enemy.dispose();
      return false;
    });
```

This is a long block, and it **begins with the check on the map**: the comment, the three lines that follow it, and a blank line, all *above* `const tiles`. They are easy to skip when the code you are replacing starts at `const tiles`.

Things to notice:

- **A map that can't be played stops the game,** with its problems in the message. `throw new Error(...)` inside `createScene` goes to the `catch` that you wrote last time, which puts the message on the splash. A game that shows the splash for ever because a map was one cell too wide is the worst way to find out.
- **`pieceAt(grid, col, row)` is the whole interface** between the map and the board: the same function that `buildTiles` was asking `kindAt` for.
- **Enemies are made, updated and removed in one place.** The frame function adds one every `DEMO.gap` seconds, moves each of them, and takes away the ones that are done, with `dispose`, which is what stops the game filling up with enemies that have walked off the board.
- **`dt` is capped at 0.05 seconds,** so that a window that has been in the background doesn't send every enemy off the end of the road when it comes back.

**Check:** open `tests.html`. 237 tests pass. Then open `index.html` through the web server. After the splash, the board has a road across it from a ring of red to a ring of gold, and every two and a half seconds an enemy comes on and walks it: a grunt, a scout who runs, a heavy trooper, an agent, a spirit. They turn the corners, and each faces the way it goes.

---

## Step 8: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **The second map.** Add `?map=1` to the address. Different road, the same code.
- **A map of your own.** Add a third map to `MAPS` in `maps.js`. If you get it wrong, the splash tells you what is wrong, and where. Try a road with a fork (a cell with three neighbors), or two goals, or a gap.
- **A crossroads.** To *see* the other pieces, put a map with a branch through `pieceAt` in the console (it won't be a map you can play): `pieceAt(parseMap({ name: "x", rows: [".#.", "###", ".#."] }), 1, 1)` is `{ kind: "crossroads", turn: 0 }`.
- **Speed.** Change the `speed` of the grunt in `ENEMIES` to `4`. The feet keep up, because the animation is played faster. Then change `CLIPS.Walking.stride` to `4`: now the feet are too slow for the ground, and the enemy skates. That is the number to tune by eye.
- **Size.** Change a `height` and see a heavy trooper the size of a cell or a spirit half as tall. Nothing else needs to change.
- **A different gap.** `DEMO.gap` of `0.5` sends a crowd. Watch how it copes: every enemy is a skeleton of its own.
- **Corners.** In `path.js` change the `samples` of `smoothPoints` to `1`, and the corners are cut by straight lines. Change `routePoints` to be the cells alone and the enemies turn on the spot.
- **A phone.** In device mode, check the road and the enemies fit the screen, and run on their own.

---

## Troubleshooting

- **The splash says the map can't be played:** read the message: it says what is wrong with it and where. The most common is a row that is one character too long or too short.
- **`grid is not defined` in the console, and the splash never goes:** the four lines that make `grid` (and check the map) are missing from the top of the block in Step 7.
- **`pieceAt is not defined` (or `MAPS`, `Enemy`, `routeFor`...):** the file isn't loaded, the script tag is in the wrong order, or its export block is missing. `maps.js` comes before `roads.js`, and the others come before `enemies.js`.
- **The road has the wrong pieces, or corners that don't join:** a quarter turn the wrong way round. The test "on every real map, every piece of road joins every road beside it" names the cell.
- **An enemy is at the wrong end of the road, or faces sideways:** `yaw` is `Math.atan2(dx, dz)`, and not `(dz, dx)`. The tests of `pointAlong` say which way is which.
- **The enemies are underground, or float:** the `lift`. The test "stands with its feet on the ground" says how far out it is.
- **Every enemy has the same pose, or they all stop when one does:** the animation groups are shared. Check that `instantiateModelsToScene` is given the names function, and that the clip is found by the enemy's own name.
- **The game slows down:** `dispose` is never called, or doesn't dispose the skeleton or the animations.
- **A test says `404` for an `.glb`:** the page was opened from a file. Use the web server.

---

## What you have

A road you write as text, laid with the right piece in every cell, a line that rounds the corners, a walker that knows how far it has gone, and five kinds of enemy that walk it with their feet on the ground, and a test suite of 237 tests behind it.

**Next up:** the benders. The next tutorial puts a podium on the board, a bender on it, and plays its idle (and its attacks, in place, with its hips held where they begin) while it looks for something to shoot.
