# Tutorial: Parkour Runner Street -- An Endless Street

This is the third tutorial in the Parkour Runner series. So far the street has an end: 24 rows of road, and the runner stops there. An endless runner can't do that, so in this step the street **never ends**. It also never gets any bigger: pieces are made a little way ahead of the runner, and the ones far behind are **recycled** and used again in front. You write the code; this document tells you what to write and why.

By the end you'll have:

- A street described **one piece at a time**: a row of road, and one building, that can be made whenever they're needed
- A **street stream**: given how far the runner has run, it says which pieces should exist, which are new, and which have fallen behind
- A **piece pool** that reuses the pieces that fell behind instead of making new ones, so the number of pieces stops growing
- A runner who can run **as far as you like**, down a street that's the same every time you load the page
- Unit tests for the new pieces

**What you'll learn:** streaming content ahead of the player and dropping it behind, why a pool beats creating and destroying, keeping a generator repeatable by giving each part its own random numbers, how few objects a world really needs, and keeping the game's logic (what should exist) apart from the engine's work (making and hiding nodes).

## Where you're starting

This folder is a copy of the finished Runner sample, plus four empty placeholder files for the new code:

```
parkour_runner_street/
├── index.html, tests.html
├── js/
│   ├── world.js, models.js, runner.js, clips.js, camera.js, splash.js, main.js   (from the Runner sample)
│   ├── stream.js                                                                  (placeholder -- Step 2)
│   └── pool.js                                                                    (placeholder -- Step 3)
└── tests/
    ├── world / models / runner / clips / camera / splash .tests.js                (from the Runner sample)
    ├── stream.tests.js                                                            (placeholder -- Step 2)
    └── pool.tests.js                                                              (placeholder -- Step 3)
```

### You need a web server for this one

As before, the models can't be loaded from a page opened from a file. Run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/parkour_runner/parkour_runner_street/` (the command prints the exact address), or use the *Live Server* extension in VS Code. (`tests.html` loads no models and works from a file.)

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Runner sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works: the runner runs down the street and stops at the end. Open `tests.html` too and note how many tests pass (**101**); you'll watch that number change. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: The street, one piece at a time

The street so far is made by `streetLayout`: one call works out *all* 24 rows and *all* the buildings. An endless street can't be worked out in one go, so the plan needs two smaller questions it can answer whenever it's asked: **what is in row number N?** and **what is the next building, starting here?**

Open `js/world.js`. The three new pieces go **below** `piecesUsed` and **above** the export block at the bottom. The old functions stay for now; you'll take them out in Step 4.

### 1a. One building

```js
// One building on one side of the street, starting at `fromZ` and picked at
// random. `side` is -1 for the left (negative x) and 1 for the right. The
// placement has an `endZ` too: where the building ends along the street, so the
// next one knows where to start and the street knows when this one is far behind.
function buildingAt(side, fromZ, random) {
  const building = BUILDINGS[Math.floor(random() * BUILDINGS.length)];
  const width = building.width * WORLD_SCALE;
  const depth = building.depth * WORLD_SCALE;
  return {
    piece: building.piece,
    x: side * (BUILDING_EDGE_X + depth / 2),
    z: fromZ + width / 2,
    rotationY: side < 0 ? FACE_LEFT_SIDE : FACE_RIGHT_SIDE,
    endZ: fromZ + width,
  };
}
```

Things to notice:

- **It's `layoutSide` for a single building.** The old function looped until the length was covered; this one makes one and says where it ends, so the caller decides when to stop.
- **`endZ` is new.** It's where the building ends along the street. The caller needs it for two reasons: the next building starts a gap after it, and, later, the street knows when a building is far enough behind the runner to drop.
- **The random number is still passed in,** so a test, or a seed, decides which building comes out.

### 1b. One row

```js
// The pieces of one row of the street: the road tile, a sidewalk tile on each
// side, and every LIGHT_EVERY rows a street light. `row` is a whole number, and
// row 0 is centered on z = 0, row 1 one tile further along, and so on. The
// same row always gives the same pieces, so the street can be built in any order.
function rowPieces(row) {
  const z = row * TILE;
  const endZ = z + TILE / 2; // where the row ends along the street
  const pieces = [
    // The road tile is drawn running along x, so turn it a quarter turn to run along z.
    { piece: "roads/road_straight", x: 0, z, rotationY: Math.PI / 2, endZ },
    { piece: "roads/tile_low", x: -SIDEWALK_X, z, rotationY: 0, endZ },
    { piece: "roads/tile_low", x: SIDEWALK_X, z, rotationY: 0, endZ },
  ];

  if (row % LIGHT_EVERY === 0) {
    // Alternate sides, with the lamp's arm reaching over the road.
    const side = (row / LIGHT_EVERY) % 2 === 0 ? -1 : 1;
    pieces.push({ piece: "roads/light_square", x: side * (TILE / 2 + 0.4), z, rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2, endZ });
  }
  return pieces;
}
```

Things to notice:

- **A row is a number.** Row 0 is centered on z = 0, row 1 is one tile further along, row -1 one tile behind. Nothing about a row depends on any other row, so **rows can be made in any order**, at any time.
- **It's the loop body of `streetLayout`,** with `i` as the row and the start of the street moved to 0. The lights still alternate sides.
- **Every piece has an `endZ`,** the end of its row, for the same reason as the buildings.

### 1c. Every piece

```js
// Every piece the street can ever use, each once, so each file is loaded once up
// front: the road, the sidewalk, the street light and every building.
const STREET_PIECES = ["roads/road_straight", "roads/tile_low", "roads/light_square", ...BUILDINGS.map((b) => b.piece)];
```

An endless street can use any building at any time, so every file it might need is loaded up front, once. This is that list: the road, the sidewalk, the light, and every building.

Now update the export block at the bottom of the file to add the three new names:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide, streetLayout, piecesUsed, buildingAt, rowPieces, STREET_PIECES };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide, streetLayout, piecesUsed, buildingAt, rowPieces, STREET_PIECES });
}
```

### 1d. Tests

Add these to the **end** of `tests/world.tests.js`. They use the `assertClose` helper that is already in the file:

```js
QUnit.module("buildingAt", () => {
  const widthOf = (piece) => BUILDINGS.find((b) => b.piece === piece).width * WORLD_SCALE;
  const depthOf = (piece) => BUILDINGS.find((b) => b.piece === piece).depth * WORLD_SCALE;

  QUnit.test("starts where it is told to: its near edge is at fromZ", (assert) => {
    const building = buildingAt(1, 40, () => 0);

    assertClose(assert, building.z - widthOf(building.piece) / 2, 40, 1e-9);
  });

  QUnit.test("ends one width further along, and says so in endZ", (assert) => {
    const building = buildingAt(1, 40, () => 0);

    assertClose(assert, building.endZ, 40 + widthOf(building.piece), 1e-9);
  });

  QUnit.test("stands on the left for side -1 and the right for side 1", (assert) => {
    assert.true(buildingAt(-1, 0, () => 0).x < 0);
    assert.true(buildingAt(1, 0, () => 0).x > 0);
  });

  QUnit.test("its front stands at the edge of the sidewalk, however deep it is", (assert) => {
    for (const r of [0, 0.3, 0.6, 0.9999]) {
      const building = buildingAt(1, 0, () => r);

      assertClose(assert, building.x - depthOf(building.piece) / 2, BUILDING_EDGE_X, 1e-9, `${building.piece}`);
    }
  });

  QUnit.test("faces the middle of the street from either side", (assert) => {
    // Facing is -z at rotation 0. A quarter turn of +PI/2 faces -x, and -PI/2 faces +x.
    assert.true(buildingAt(1, 0, () => 0).rotationY > 0, "the right side turns to face -x");
    assert.true(buildingAt(-1, 0, () => 0).rotationY < 0, "the left side turns to face +x");
  });

  QUnit.test("uses one random number to choose the building", (assert) => {
    let calls = 0;

    buildingAt(1, 0, () => {
      calls++;
      return 0.5;
    });

    assert.strictEqual(calls, 1);
  });

  QUnit.test("the random number picks from the list: 0 is the first building and nearly 1 the last", (assert) => {
    assert.strictEqual(buildingAt(1, 0, () => 0).piece, BUILDINGS[0].piece);
    assert.strictEqual(buildingAt(1, 0, () => 0.9999).piece, BUILDINGS[BUILDINGS.length - 1].piece);
  });
});

QUnit.module("rowPieces", () => {
  const ofPiece = (pieces, name) => pieces.filter((p) => p.piece === name);

  QUnit.test("row 0 has a road tile in the middle of the street, turned to run along it", (assert) => {
    const [road] = ofPiece(rowPieces(0), "roads/road_straight");

    assert.strictEqual(road.x, 0);
    assert.strictEqual(road.z, 0);
    assertClose(assert, road.rotationY, Math.PI / 2, 1e-9);
  });

  QUnit.test("each row is one tile further along, and all its pieces are at that z", (assert) => {
    for (const row of [-1, 0, 1, 5]) {
      for (const piece of rowPieces(row)) assert.strictEqual(piece.z, row * TILE, `row ${row}: ${piece.piece}`);
    }
  });

  QUnit.test("a sidewalk tile sits beside the road on each side", (assert) => {
    const sidewalks = ofPiece(rowPieces(3), "roads/tile_low");

    assert.strictEqual(sidewalks.length, 2);
    assert.deepEqual(sidewalks.map((s) => s.x).sort((a, b) => a - b), [-SIDEWALK_X, SIDEWALK_X]);
  });

  QUnit.test("a street light stands every LIGHT_EVERY rows, and not between", (assert) => {
    for (let row = 0; row < 8; row++) {
      const lights = ofPiece(rowPieces(row), "roads/light_square");

      assert.strictEqual(lights.length, row % LIGHT_EVERY === 0 ? 1 : 0, `row ${row}`);
    }
  });

  QUnit.test("the lights alternate sides, left then right", (assert) => {
    const side = (row) => Math.sign(ofPiece(rowPieces(row), "roads/light_square")[0].x);

    assert.strictEqual(side(0), -1);
    assert.strictEqual(side(LIGHT_EVERY), 1);
    assert.strictEqual(side(LIGHT_EVERY * 2), -1);
  });

  QUnit.test("each light's arm is turned to reach over the road", (assert) => {
    for (const row of [0, LIGHT_EVERY, LIGHT_EVERY * 2, LIGHT_EVERY * 3]) {
      const [light] = ofPiece(rowPieces(row), "roads/light_square");

      // The arm points along the piece's +z. A quarter turn one way sends it toward +x, the other way toward -x.
      assert.strictEqual(Math.sign(light.rotationY), -Math.sign(light.x), `row ${row}`);
    }
  });

  QUnit.test("every piece says where its row ends", (assert) => {
    for (const piece of rowPieces(4)) assertClose(assert, piece.endZ, 4 * TILE + TILE / 2, 1e-9, piece.piece);
  });

  QUnit.test("the same row always gives the same pieces, so rows can be made in any order", (assert) => {
    assert.deepEqual(rowPieces(6), rowPieces(6));
  });

  QUnit.test("rows behind the start work too", (assert) => {
    const road = ofPiece(rowPieces(-1), "roads/road_straight")[0];

    assert.strictEqual(road.z, -TILE);
    assert.strictEqual(ofPiece(rowPieces(-1), "roads/light_square").length, 0);
    assert.strictEqual(ofPiece(rowPieces(-2), "roads/light_square").length, 1);
  });
});

QUnit.module("STREET_PIECES", () => {
  QUnit.test("includes the road, the sidewalk and the street light", (assert) => {
    for (const name of ["roads/road_straight", "roads/tile_low", "roads/light_square"]) assert.true(STREET_PIECES.includes(name), name);
  });

  QUnit.test("includes every building", (assert) => {
    for (const building of BUILDINGS) assert.true(STREET_PIECES.includes(building.piece), building.piece);
  });

  QUnit.test("lists each piece once", (assert) => {
    assert.strictEqual(new Set(STREET_PIECES).size, STREET_PIECES.length);
  });

  QUnit.test("covers every piece the street can make", (assert) => {
    for (let row = -4; row < 20; row++) {
      for (const piece of rowPieces(row)) assert.true(STREET_PIECES.includes(piece.piece), piece.piece);
    }
    const random = seededRandom(3);
    for (let i = 0; i < 200; i++) assert.true(STREET_PIECES.includes(buildingAt(1, 0, random).piece));
  });
});
```

Reload `tests.html`: **20 more** tests (**121** in all), all green.

---

## Step 2: The street stream

Now the part that decides what exists. A **stream** is told where the runner is and answers with what changed: *these pieces are new, make them* and *these have fallen behind, drop them*. It doesn't make anything itself. It only works with plain data, so it's easy to test, and a bug in it can't be a bug in the graphics.

Put this in `js/stream.js`. The class is complete and closed, with a constructor and one helper, plus the export block:

```js
// The endless street: which pieces exist right now, given how far the runner has
// run. The street is never built all at once. Pieces are made a little way ahead
// of the runner, and dropped once they are far behind, so only a few dozen pieces
// exist at a time however far the runner goes. This works out *what* to add and
// remove, as plain data (no Babylon.js), so it is easy to test; main.js does the
// adding and removing. See ../tests/stream.tests.js.
//
// Rows (road, sidewalks, lights) are generated in order, one after another, and
// each side of the street has its own line of buildings with its own random
// numbers. Because nothing is shared, the street is the same however the calls
// to update() are spaced out: the same seed always gives the same street.

const STREET_AHEAD = 150; // how far in front of the runner the street is built; about as far as the fog lets you see
const STREET_BEHIND = 30; // how far behind the runner it is kept, a little more than the camera is behind

class StreetStream {
  constructor({ seed = 1, ahead = STREET_AHEAD, behind = STREET_BEHIND } = {}) {
    this.seed = seed;
    this.ahead = ahead;
    this.behind = behind;
    this.active = new Map(); // id -> placement, for every piece that exists right now
    this._start();
  }

  // Puts the street back to before anything was built.
  _start() {
    this.nextId = 0;
    this.nextRow = -1; // the first row is one behind the start, so there is street behind the camera
    // Each side builds its own line of buildings, starting where the first row starts.
    const startZ = this.nextRow * TILE - TILE / 2;
    this.sides = [
      { side: -1, nextZ: startZ, random: seededRandom(this.seed) },
      { side: 1, nextZ: startZ, random: seededRandom(this.seed + 1) },
    ];
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STREET_AHEAD, STREET_BEHIND, StreetStream };
} else {
  Object.assign(window, { STREET_AHEAD, STREET_BEHIND, StreetStream });
}
```

Things to notice:

- **`ahead` and `behind`.** The street is built 150 units in front of the runner, about as far as the fog lets anyone see, so a piece appears while it's still hidden in the fog. It's kept 30 units behind, a little more than the camera is.
- **Each side of the street has its own random numbers.** `seededRandom(seed)` for the left and `seededRandom(seed + 1)` for the right. If both sides shared one generator, the buildings you got would depend on whether the left or the right happened to be built first, and that depends on how far the runner moved between updates, which depends on the frame rate. With separate generators, each side makes the same buildings in the same order however the updates are spaced. **The street is the same on every computer.**
- **`active` is a `Map`** from a piece's id to the piece, for every piece that exists now.
- **`_start`** sets the generators and counters up, so `reset()` can use it too. (The leading underscore is a convention for "used inside the class".)

The next three methods go **inside the class**, below the constructor and above its closing `}`, in this order.

### 2a. Remembering a piece

```js
  // Remembers a new piece, giving it an id so it can be found again to remove.
  _add(placement) {
    const piece = { ...placement, id: this.nextId++ };
    this.active.set(piece.id, piece);
    return piece;
  }
```

Every piece gets an **id**, counting up, so it can be found again to remove it. `{ ...placement, id }` copies the placement and adds the id.

### 2b. Bringing the street up to date

```js
  // Brings the street up to date for a runner at `z`: builds whatever is now
  // within `ahead` of it, and drops whatever has fallen more than `behind` behind
  // it. Returns what changed: { added, removed }, each a list of placements with
  // an `id`. Calling it again for the same `z` changes nothing.
  update(z) {
    const added = [];
    const removed = [];

    const front = z + this.ahead;
    while (this.nextRow * TILE - TILE / 2 < front) {
      for (const placement of rowPieces(this.nextRow)) added.push(this._add(placement));
      this.nextRow++;
    }
    for (const side of this.sides) {
      while (side.nextZ < front) {
        const building = buildingAt(side.side, side.nextZ, side.random);
        added.push(this._add(building));
        side.nextZ = building.endZ + BUILDING_GAP * WORLD_SCALE;
      }
    }

    const back = z - this.behind;
    for (const [id, piece] of this.active) {
      if (piece.endZ < back) {
        this.active.delete(id);
        removed.push(piece);
      }
    }
    return { added, removed };
  }
```

Things to notice:

- **It works out what's missing, not what changed.** If the runner hasn't moved far enough to need anything, both loops do nothing, so **calling it twice for the same place changes nothing** and calling it every frame is cheap.
- **Rows are made in order,** `nextRow` counting up, until the row's far end is `ahead` of the runner. Each side's buildings are made the same way from its own `nextZ`.
- **The gap between buildings** comes from the old layout: each one starts a gap after the last one's `endZ`.
- **Removal comes last.** Anything whose `endZ` is behind `z - behind` is deleted from `active` (deleting from a `Map` while looping over it is allowed in JavaScript) and returned in `removed`.
- **It returns `{ added, removed }`.** That is the entire interface between the street's logic and the engine.

### 2c. Starting again

```js
  // Takes every piece away and starts the street again from the beginning, as if
  // it had never been built: the next update() builds the same street as before.
  // Returns the pieces that were taken away.
  reset() {
    const removed = [...this.active.values()];
    this.active.clear();
    this._start();
    return removed;
  }
```

When the player restarts, the street has to start again too, otherwise the pieces around the start would be long gone. `reset()` returns the pieces it takes away so the caller can hide them, and it starts the generators again from the same seed, so **the next update builds the very same street.**

### 2d. Tests

Put this in `tests/stream.tests.js`:

```js
QUnit.module("StreetStream", () => {
  const assertClose = (assert, actual, expected, tolerance, message) =>
    assert.true(Math.abs(actual - expected) <= tolerance, message || `expected ${actual} to be within ${tolerance} of ${expected}`);

  const isBuilding = (p) => p.piece.includes("building");
  const withoutId = ({ id, ...rest }) => rest;
  const byPosition = (a, b) => a.z - b.z || a.x - b.x || a.piece.localeCompare(b.piece);

  // Runs a runner from z = 0 to `to`, `step` at a time, and returns every piece ever added.
  const runTo = (stream, to, step) => {
    const everything = [];
    for (let z = 0; z <= to; z += step) everything.push(...stream.update(z).added);
    return everything;
  };

  QUnit.test("nothing exists before the first update", (assert) => {
    assert.strictEqual(new StreetStream().active.size, 0);
  });

  QUnit.test("the first update builds the street, one row behind the start and a good way ahead", (assert) => {
    const { added, removed } = new StreetStream({ ahead: 100 }).update(0);
    const roads = added.filter((p) => p.piece === "roads/road_straight");

    assert.strictEqual(removed.length, 0);
    assert.strictEqual(roads[0].z, -TILE, "starts a row behind");
    assert.true(roads[roads.length - 1].endZ >= 100, "reaches the distance ahead");
  });

  QUnit.test("builds buildings along both sides, out as far as the road", (assert) => {
    const { added } = new StreetStream({ ahead: 100 }).update(0);

    for (const side of [-1, 1]) {
      const buildings = added.filter((p) => isBuilding(p) && Math.sign(p.x) === side);
      assert.true(buildings.length > 3, `side ${side} has buildings`);
      assert.true(buildings[buildings.length - 1].endZ >= 100, `side ${side} reaches the distance ahead`);
    }
  });

  QUnit.test("gives every piece its own id, counting up", (assert) => {
    const { added } = new StreetStream().update(0);

    assert.strictEqual(new Set(added.map((p) => p.id)).size, added.length);
    assert.strictEqual(Math.min(...added.map((p) => p.id)), 0);
    assert.strictEqual(Math.max(...added.map((p) => p.id)), added.length - 1);
  });

  QUnit.test("keeps the pieces that exist in `active`, by id", (assert) => {
    const stream = new StreetStream();

    const { added } = stream.update(0);

    assert.strictEqual(stream.active.size, added.length);
    for (const piece of added) assert.strictEqual(stream.active.get(piece.id), piece);
  });

  QUnit.test("updating again at the same place changes nothing", (assert) => {
    const stream = new StreetStream();
    stream.update(50);

    const { added, removed } = stream.update(50);

    assert.strictEqual(added.length, 0);
    assert.strictEqual(removed.length, 0);
  });

  QUnit.test("moving forward builds more street ahead", (assert) => {
    const stream = new StreetStream({ ahead: 100 });
    stream.update(0);

    const { added } = stream.update(50);

    assert.true(added.length > 0);
    for (const piece of added) assert.true(piece.endZ > 100, `${piece.piece} is beyond what was already built`);
  });

  QUnit.test("pieces far behind the runner are removed, and only those", (assert) => {
    const stream = new StreetStream({ ahead: 100, behind: 30 });
    stream.update(0);

    const { removed } = stream.update(200);

    assert.true(removed.length > 0);
    for (const piece of removed) assert.true(piece.endZ < 170, `${piece.piece} ended at ${piece.endZ}, behind the runner`);
    for (const piece of stream.active.values()) assert.true(piece.endZ >= 170, `${piece.piece} is still wanted`);
  });

  QUnit.test("a removed piece is gone from `active`", (assert) => {
    const stream = new StreetStream({ ahead: 100, behind: 30 });
    stream.update(0);

    const { removed } = stream.update(200);

    for (const piece of removed) assert.false(stream.active.has(piece.id));
  });

  QUnit.test("nothing is removed while the runner is still near the start", (assert) => {
    const stream = new StreetStream();

    assert.strictEqual(stream.update(0).removed.length, 0);
    assert.strictEqual(stream.update(5).removed.length, 0);
  });

  QUnit.test("road tiles follow each other with no gaps, however far it runs", (assert) => {
    const roads = runTo(new StreetStream(), 500, 7).filter((p) => p.piece === "roads/road_straight");

    for (let i = 1; i < roads.length; i++) assertClose(assert, roads[i].z - roads[i - 1].z, TILE, 1e-9, `road ${i}`);
  });

  QUnit.test("buildings follow each other with just a gap between, on each side, however far it runs", (assert) => {
    const everything = runTo(new StreetStream(), 500, 7);

    for (const side of [-1, 1]) {
      const row = everything.filter((p) => isBuilding(p) && Math.sign(p.x) === side);
      for (let i = 1; i < row.length; i++) {
        const width = BUILDINGS.find((b) => b.piece === row[i].piece).width * WORLD_SCALE;
        assertClose(assert, row[i].z - width / 2 - row[i - 1].endZ, BUILDING_GAP * WORLD_SCALE, 1e-9, `side ${side}, building ${i}`);
      }
    }
  });

  QUnit.test("the same seed gives the same street, however the updates are spaced out", (assert) => {
    const fine = runTo(new StreetStream({ seed: 5 }), 400, 1).map(withoutId).sort(byPosition);
    const coarse = runTo(new StreetStream({ seed: 5 }), 400, 40).map(withoutId).sort(byPosition);

    assert.deepEqual(fine, coarse);
  });

  QUnit.test("a different seed gives different buildings", (assert) => {
    const a = runTo(new StreetStream({ seed: 1 }), 100, 10).filter(isBuilding).map((p) => p.piece);
    const b = runTo(new StreetStream({ seed: 2 }), 100, 10).filter(isBuilding).map((p) => p.piece);

    assert.notDeepEqual(a, b);
  });

  QUnit.test("the two sides don't copy each other", (assert) => {
    const buildings = runTo(new StreetStream({ seed: 4 }), 300, 10).filter(isBuilding);
    const left = buildings.filter((p) => p.x < 0).map((p) => p.piece);
    const right = buildings.filter((p) => p.x > 0).map((p) => p.piece);

    assert.notDeepEqual(left.slice(0, 10), right.slice(0, 10));
  });

  QUnit.test("only a bounded number of pieces exist at once, however far the runner goes", (assert) => {
    const stream = new StreetStream();
    stream.update(0);
    const atStart = stream.active.size;
    let most = atStart;

    for (let z = 0; z <= 20000; z += 5) {
      stream.update(z);
      most = Math.max(most, stream.active.size);
    }

    assert.true(most < atStart * 1.5, `${most} pieces at most, against ${atStart} to start with`);
  });

  QUnit.test("the options set how far ahead and behind the street is kept", (assert) => {
    const small = new StreetStream({ ahead: 40, behind: 10 });
    const big = new StreetStream({ ahead: 200, behind: 60 });

    assert.true(small.update(0).added.length < big.update(0).added.length);
  });

  QUnit.test("reset() takes every piece away, and returns them", (assert) => {
    const stream = new StreetStream();
    const { added } = stream.update(0);

    const removed = stream.reset();

    assert.strictEqual(removed.length, added.length);
    assert.strictEqual(stream.active.size, 0);
  });

  QUnit.test("after reset() the next update builds the very same street again", (assert) => {
    const stream = new StreetStream({ seed: 9 });
    const first = stream.update(0).added;
    stream.update(300);

    stream.reset();
    const again = stream.update(0).added;

    assert.deepEqual(again, first, "same pieces, same ids");
  });

  QUnit.test("reset() with nothing built returns nothing", (assert) => {
    assert.deepEqual(new StreetStream().reset(), []);
  });
});
```

Add the scripts and the tests to `tests.html`, after `models.js` and `models.tests.js`:

```html
  <script src="js/stream.js"></script>
```
```html
  <script src="tests/stream.tests.js"></script>
```

Reload `tests.html`: **20 more** tests (**141** in all), all green. Two are worth a look: *"only a bounded number of pieces exist at once, however far the runner goes"* runs the stream 20,000 units, and *"the same seed gives the same street, however the updates are spaced out"* builds it twice with different step sizes and compares.

---

## Step 3: A pool of pieces

The stream says "make a piece", and a few seconds later, "drop that one". Making a piece (an instance of a loaded model) costs a little every time, and a runner makes and drops about a dozen pieces every second. Throwing the dropped ones away and making new ones would work, but it's wasteful: it keeps asking the engine to create things and the garbage collector to clean up. A **pool** keeps the pieces it's given back, hidden, and hands them out again.

### 3a. Moving a piece that already exists

A pooled piece needs to be put somewhere new. `place` already knows how to set a piece's position and turn, so split that part out into its own method. In `js/models.js`, replace the `place` method inside `PieceLibrary` with these two:

```js
  // Puts a copy of a loaded piece in the world at (x, y, z), turned by
  // rotationY radians about the vertical axis, and returns it.
  place(name, { x = 0, y = 0, z = 0, rotationY = 0 } = {}) {
    const template = this.templates.get(name);
    if (!template) throw new Error(`The piece "${name}" hasn't been loaded`);

    const copy = template.instantiateHierarchy(null);
    this.moveTo(copy, { x, y, z, rotationY });
    return copy;
  }

  // Moves a piece that is already in the world to (x, y, z) and turns it by
  // rotationY, the same way place() does for a new one.
  moveTo(piece, { x = 0, y = 0, z = 0, rotationY = 0 } = {}) {
    piece.position.x = x;
    piece.position.y = y;
    piece.position.z = z;
    piece.rotation.y = rotationY;
  }
```

`place` makes a copy and then calls `moveTo` on it. The pool will call `moveTo` too, on a piece it is reusing.

Add tests for it **inside the `PieceLibrary` module**, above the test called *"place() refuses a piece that hasn't been loaded"*:

```js
  QUnit.test("moveTo() moves and turns a piece that is already in the world", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 0, y: 0, z: 0 }, rotation: { y: 0 } };

    library.moveTo(piece, { x: 3, y: 0.5, z: -8, rotationY: 1.5 });

    assert.strictEqual(piece.position.x, 3);
    assert.strictEqual(piece.position.y, 0.5);
    assert.strictEqual(piece.position.z, -8);
    assert.strictEqual(piece.rotation.y, 1.5);
  });

  QUnit.test("moveTo() with nothing given puts the piece back at the origin", (assert) => {
    const library = new PieceLibrary({});
    const piece = { position: { x: 3, y: 1, z: 9 }, rotation: { y: 2 } };

    library.moveTo(piece);

    assert.deepEqual(piece.position, { x: 0, y: 0, z: 0 });
    assert.strictEqual(piece.rotation.y, 0);
  });
```

Reload `tests.html`: **2 more** tests (**143** in all). The existing `place` tests still pass, which is the point of splitting it out without changing what it does.

### 3b. The pool, closed

Put this in `js/pool.js`. The class is complete and closed, with just a constructor, plus the export block:

```js
// A pool of street pieces. Making a piece (an instance of a loaded model) costs a
// little every time, and the street makes and drops pieces constantly as the
// runner moves. Rather than throw a dropped piece away, the pool hides it and
// keeps it, and hands it out again the next time a piece of that kind is needed.
// New pieces are only made when there is no spare one to reuse, so however long
// the runner runs, the number of pieces made stops growing. See ../tests/pool.tests.js.
class PiecePool {
  // `library` is a PieceLibrary: it makes the pieces and knows how to place them.
  constructor(library) {
    this.library = library;
    this.spare = new Map(); // piece name -> the hidden pieces waiting to be reused
    this.made = 0; // how many pieces have ever been made, for curiosity and tests
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = PiecePool;
} else {
  window.PiecePool = PiecePool;
}
```

Things to notice:

- **The pool needs a library,** because it asks the library to make pieces when it has none spare, and to move the ones it reuses.
- **`spare` is a `Map` of lists,** one list per kind of piece, because a spare road tile is no use when a building is needed.
- **`made`** counts how many pieces were ever made. It isn't needed by the game, but it's what proves the pool works.

### 3c. Handing out and taking back

Add these two methods **inside the class**, below the constructor and above its closing `}`:

```js
  // A piece of the named kind, at `placement`: a spare one if there is one,
  // otherwise a new one.
  acquire(name, placement) {
    const spares = this.spare.get(name);
    if (spares && spares.length > 0) {
      const piece = spares.pop();
      this.library.moveTo(piece, placement);
      piece.setEnabled(true);
      return piece;
    }
    this.made++;
    return this.library.place(name, placement);
  }

  // Gives a piece back. It's hidden, and kept for the next acquire() of that kind.
  release(name, piece) {
    piece.setEnabled(false);
    if (!this.spare.has(name)) this.spare.set(name, []);
    this.spare.get(name).push(piece);
  }
```

Things to notice:

- **`acquire` reuses before it makes.** A spare of the right kind is taken off the list, moved to its new place, and shown again. Only when there isn't one is a new piece made.
- **`release` hides a piece instead of destroying it.** A disabled node isn't drawn and costs almost nothing, and `setEnabled(true)` brings it straight back. This is the same function that hid the ship while it blinked in Asteroids.
- **After a while, nothing new is made.** Once the pool holds as many pieces of each kind as the street ever needs at once, every `acquire` finds a spare one.

### 3d. Tests

Put this in `tests/pool.tests.js`:

```js
QUnit.module("PiecePool", () => {
  // A stand-in piece, and a stand-in library that makes them and records what it is asked.
  class FakeNode {
    constructor(name) {
      this.name = name;
      this.enabled = true;
    }
    setEnabled(value) {
      this.enabled = value;
    }
  }

  class FakeLibrary {
    constructor() {
      this.placed = []; // every place() call
      this.moved = []; // every moveTo() call
    }
    place(name, placement) {
      const node = new FakeNode(name);
      this.placed.push({ name, placement, node });
      return node;
    }
    moveTo(node, placement) {
      this.moved.push({ node, placement });
    }
  }

  const makePool = () => {
    const library = new FakeLibrary();
    return { library, pool: new PiecePool(library) };
  };

  QUnit.test("with nothing spare, acquire() makes a new piece with the library", (assert) => {
    const { library, pool } = makePool();
    const placement = { x: 1, z: 2 };

    const node = pool.acquire("roads/road_straight", placement);

    assert.strictEqual(library.placed.length, 1);
    assert.strictEqual(library.placed[0].name, "roads/road_straight");
    assert.strictEqual(library.placed[0].placement, placement);
    assert.strictEqual(library.placed[0].node, node);
    assert.strictEqual(pool.made, 1);
  });

  QUnit.test("release() hides the piece", (assert) => {
    const { pool } = makePool();
    const node = pool.acquire("a", {});

    pool.release("a", node);

    assert.false(node.enabled);
  });

  QUnit.test("acquire() reuses a released piece of the same kind instead of making another", (assert) => {
    const { library, pool } = makePool();
    const first = pool.acquire("a", {});
    pool.release("a", first);

    const second = pool.acquire("a", {});

    assert.strictEqual(second, first, "the same piece");
    assert.strictEqual(library.placed.length, 1, "nothing new was made");
    assert.strictEqual(pool.made, 1);
  });

  QUnit.test("a reused piece is shown again and moved to the new place", (assert) => {
    const { library, pool } = makePool();
    const node = pool.acquire("a", { x: 0 });
    pool.release("a", node);
    const placement = { x: 5, z: 40 };

    pool.acquire("a", placement);

    assert.true(node.enabled);
    assert.strictEqual(library.moved.length, 1);
    assert.strictEqual(library.moved[0].node, node);
    assert.strictEqual(library.moved[0].placement, placement);
  });

  QUnit.test("a spare piece of one kind isn't used for another kind", (assert) => {
    const { library, pool } = makePool();
    pool.release("a", pool.acquire("a", {}));

    const other = pool.acquire("b", {});

    assert.strictEqual(other.name, "b");
    assert.strictEqual(library.placed.length, 2, "a new piece was made for b");
    assert.strictEqual(pool.made, 2);
  });

  QUnit.test("each spare piece is handed out once", (assert) => {
    const { pool } = makePool();
    const one = pool.acquire("a", {});
    const two = pool.acquire("a", {});
    pool.release("a", one);
    pool.release("a", two);

    const x = pool.acquire("a", {});
    const y = pool.acquire("a", {});
    const z = pool.acquire("a", {});

    assert.notStrictEqual(x, y, "two different pieces");
    assert.true([one, two].includes(x) && [one, two].includes(y), "both reused");
    assert.false([one, two].includes(z), "the third had to be new");
    assert.strictEqual(pool.made, 3);
  });

  QUnit.test("a piece that was never released can't be handed out again", (assert) => {
    const { pool } = makePool();
    const first = pool.acquire("a", {});

    const second = pool.acquire("a", {});

    assert.notStrictEqual(second, first);
    assert.strictEqual(pool.made, 2);
  });

  QUnit.test("the number of pieces made stops growing when pieces are given back", (assert) => {
    const { pool } = makePool();
    let live = [];

    // A street of five pieces that, every step, loses its oldest and gains a new one.
    for (let step = 0; step < 1000; step++) {
      if (live.length === 5) pool.release("a", live.shift());
      live.push(pool.acquire("a", { z: step }));
    }

    assert.strictEqual(pool.made, 5);
  });
});
```

Add the script and its tests to `tests.html`, after the stream ones:

```html
  <script src="js/pool.js"></script>
```
```html
  <script src="tests/pool.tests.js"></script>
```

The tests use a *fake* library, so they only check what the pool asks of it. The last one is the proof: a street of five pieces that loses its oldest and gains a new one a thousand times only ever makes **five** pieces.

Reload `tests.html`: **8 more** tests (**151** in all), all green.

---

## Step 4: Wire it together

Everything is built. Now `main.js` has to use the stream and the pool instead of the finite street, and the old planning functions can go.

### 4a. `index.html`

Add the two new scripts after `models.js`, before `runner.js`:

```html
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
```

### 4b. `js/main.js`

Make these changes.

**1. Constants.** Delete these two lines, because the street no longer has a length and the runner no longer has an end to stop short of:

```js
const STREET_ROWS = 24; // how many road tiles long the street is
```
```js
const STREET_END_MARGIN = 30; // the runner stops this far short of the last road tile
```

**2. The street.** In `createScene`, replace the code that plans the street, loads its pieces and places them:

```js
  const layout = streetLayout({ rows: STREET_ROWS, random: seededRandom(SEED) });
  const library = new PieceLibrary(scene, { baseUrl: ASSETS, scale: WORLD_SCALE });
  await library.load(piecesUsed(layout));
  for (const placement of layout) library.place(placement.piece, placement);
```

with:

```js
  const library = new PieceLibrary(scene, { baseUrl: ASSETS, scale: WORLD_SCALE });
  await library.load(STREET_PIECES);

  // The street is never built all at once: the stream says which pieces should
  // exist for where the runner is, and the pool makes them, or reuses pieces that
  // fell behind. `nodes` remembers which piece in the world is which in the stream.
  const stream = new StreetStream({ seed: SEED });
  const pool = new PiecePool(library);
  const nodes = new Map();

  const buildStreet = (z) => {
    const { added, removed } = stream.update(z);
    for (const piece of removed) release(piece);
    for (const piece of added) nodes.set(piece.id, pool.acquire(piece.piece, piece));
  };
  const release = (piece) => {
    pool.release(piece.piece, nodes.get(piece.id));
    nodes.delete(piece.id);
  };
```

Things to notice:

- **The library loads every piece the street could use, once,** and then isn't asked again.
- **`nodes` remembers which node in the world belongs to which piece in the stream,** by id. The stream knows pieces by id; the pool knows nodes. This is the bridge.
- **`buildStreet(z)` is the whole street.** Ask the stream what changed, give the removed pieces back to the pool first (so they can be reused straight away), then get the added ones from it.

**3. The runner.** Replace the comment about the last road tile and the two lines below it, which created a runner that stopped at the end:

```js
  // The last road tile is centered on firstZ + (STREET_ROWS - 1) * TILE; the
  // runner stops short of the far end so the street never runs out in view.
  const lastRoadZ = -TILE + (STREET_ROWS - 1) * TILE;
  const runner = new Runner({ z: RUNNER_START_Z, endZ: lastRoadZ - STREET_END_MARGIN });
```

with:

```js
  const runner = new Runner({ z: RUNNER_START_Z });
  buildStreet(runner.z); // so there is a street to see from the very first frame
```

The runner has no `endZ` any more, so it never stops, and the first `buildStreet` makes the street before the first frame is drawn.

**4. Restarting.** In the `keydown` handler, change the `KeyR` branch to:

```js
    if (event.code === "KeyR") {
      runner.reset();
      for (const piece of stream.reset()) release(piece); // the street starts again too
      return;
    }
```

**5. Keeping up.** In the frame loop, add one line directly after `runner.update(dt);`:

```js
    buildStreet(runner.z);
```

Things to notice:

- **The street is rebuilt every frame, but almost never changes.** `update` only does work when the runner has moved far enough for something to be missing, which is about once every few frames. The rest of the time it returns two empty lists.
- **`runner.reset()` and `stream.reset()` go together.** One puts the runner back; the other hands every piece back to the pool, and the next `buildStreet` rebuilds the start of the street from the pool.

### 4c. Take out the old plan

`streetLayout`, `layoutSide` and `piecesUsed` are not used any more. In `js/world.js`, delete those three functions (and their comments), and replace the export block with:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, buildingAt, rowPieces, STREET_PIECES };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, buildingAt, rowPieces, STREET_PIECES });
}
```

In `tests/world.tests.js`, delete the three modules that tested them: `streetLayout`, `layoutSide` and `piecesUsed`. **Keep the `assertClose` helper** above `streetLayout`: the new tests use it. That takes away 20 tests, so `tests.html` now shows **131**.

---

## Step 5: Try it

Serve the page and open it.

- [ ] After the splash, the runner runs down the street as before
- [ ] **It doesn't end.** Keep running past where the street used to stop (about 170 units, a little over 20 seconds): the street keeps coming, with new buildings and lights, forever
- [ ] The street never has gaps, and buildings don't overlap
- [ ] You can't see street appearing or disappearing: the far end is hidden in the fog, and the pieces behind are behind the camera
- [ ] **R** restarts, and the street at the start is **exactly the same** as the first time
- [ ] Reloading shows the same street every time
- [ ] Lane changes, the camera and the animation work as they did

**If something's wrong**

- **`StreetStream is not defined`, `PiecePool is not defined` or `STREET_PIECES is not defined`:** a script tag is missing from **`index.html`**, or it comes after `main.js`.
- **`streetLayout is not defined`:** `main.js` still uses the old plan: check Step 4b-2.
- **The street stops, or goes dark ahead of you:** `buildStreet(runner.z)` isn't called in the frame loop, or `STREET_AHEAD` is smaller than the camera can see.
- **Gaps or overlaps in the buildings:** check the line in `update` that sets `side.nextZ`, and that `BUILDING_GAP * WORLD_SCALE` is in it.
- **Pieces pop in or out where you can see them:** `ahead` is too short for the fog, or `behind` is shorter than the camera's distance behind the runner.
- **After R the street at the start is missing:** `main.js` isn't calling `stream.reset()` and releasing the pieces it returns.
- **Everything slows down the longer you run:** the pool isn't being used (check `release` is called for every removed piece), so pieces are being made and never reused.

**Experiments** (change one, reload, then change it back):

- `STREET_AHEAD` of `40`: the street visibly builds itself in front of you. A small number shows what the fog was hiding
- `STREET_BEHIND` of `3`: pieces vanish while the camera can still see them
- `SEED` of `1`, `2`, `3`: a different street each time
- Change `RUN_SPEED` in `runner.js` to `60` and watch the street go by
- Open the console and run `engine.scenes[0].meshes.length` now and a minute later: it stops growing, which is the pool at work

---

## Step 6: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/world.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/pool.tests.js"></script>
  <script src="tests/stream.tests.js"></script>
  <script src="tests/runner.tests.js"></script>
  <script src="tests/clips.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **131 passing tests**: 26 for the street plan, 29 for the piece library, 20 for the stream, 8 for the pool, 25 for the runner, 11 for the clip player, 7 for the camera and 5 for the splash timing.

> **What these tests don't cover.** They check the logic and the calls the code makes, using stand-ins for Babylon.js. They can't tell you the street *looks* right, or that pieces don't pop in view. That check is Step 5, with your own eyes. It's a good example of why a test suite and a play-through are different things.

> **Try breaking something.** In `StreetStream.update`, change `piece.endZ < back` to `piece.endZ < back - 100`, reload `tests.html`, and see which test notices. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A street described piece by piece, not all at once | `buildingAt`, `rowPieces` |
| Streaming: build ahead, drop behind | `StreetStream.update` |
| Repeatable generation: one generator per side | `seededRandom(seed)`, `seededRandom(seed + 1)` |
| Pooling: hide and reuse instead of destroy and create | `PiecePool` |
| Logic apart from the engine | the stream decides, `buildStreet` and the pool do |
| Why an endless world stays a fixed size | the bounded-pieces test |

## Challenges

1. **Show the numbers.** Display how many pieces are active and how many the pool ever made. (Hint: `stream.active.size` and `pool.made`. The pool stops growing: why does it grow for a few seconds at first?)
2. **Variety.** Make some buildings rarer than others by giving each entry in `BUILDINGS` a `weight`. (Hint: add the weights up, pick a number below the total, and walk the list subtracting.)
3. **Intersections.** Every so often make a row an intersection with `roads/road_crossroad` and leave a gap in the buildings. (Hint: `rowPieces` is just a function of the row number, so a row that's a multiple of 12 can return something different.)
4. **A floating origin.** After a long run the numbers get big and the graphics lose precision: pieces shimmer at tens of thousands of units. Fix it by moving the whole world back toward the origin every so often instead of letting the runner go further. (Hint: shift the runner, the stream's rows and every node by the same amount, and make sure the stream's `z` values shift too.)
5. **Different districts.** After every thousand units, switch to a different kit (the industrial one, say) for the buildings. (Hint: `buildingAt` takes a list of buildings it chooses from. It could take it as a parameter.)

---
