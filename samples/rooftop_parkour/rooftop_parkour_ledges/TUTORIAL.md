# Tutorial: Rooftop Parkour Ledges -- Catching a Ledge, Hanging, Shimmying and Climbing

This is the fourth tutorial of the Rooftop Parkour series. The runner can run, jump, fall and roll, but a wall is still a wall. In this step the runner learns the thing the whole game is about: to **jump at a wall, catch the ledge at the top of it with both hands, hang there, shimmy along it, and climb up onto it**. The ledges are **data**: every roof of the district has them, found from the same boxes as everything else, and the decision of whether a runner catches one is plain arithmetic, so it can be tested without a screen. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Ledges**: the top edges of the roofs, as lines to hang from, found from the boxes of the district
- **Catching**: arithmetic that says whether a body in the air has a ledge in reach of its hands: not too low, not too high, near the wall, facing it, beside some of it, with room to hang and room to climb
- A body that **hangs** (no gravity, held against the wall by its hands), **shimmies** along the ledge, **climbs** it onto the roof, or **lets go**: all with the same keys as running, read against the wall. And one that stands at the edge of a roof can **lower itself over it** to hang from the ledge
- **Walls that lean**: the two buildings in two levels are wider at the bottom, and a body that hangs against the top of one has to hang out from it, or it is in the wall
- **Clips** for all of it: a hanging clip, left and right shimmy clips and a climbing clip
- More in the **developer panel**: sliders for the reach of the hands, the shimmy speed and the climb time, buttons that take the runner to a **ledge**, hang it from any ledge, or **drop it down** from a roof, a switch that draws the **ledges**, and a read-out of whether the body hangs
- Unit tests for all of it, including a test that **every building in two levels can be climbed**, from its lower roof

**What you'll learn:** how a game finds the ledges of a world from its boxes, how to decide if a hand can catch a ledge, how to read the keys against a wall (toward it, away from it, along it), a state that holds the body where it is told (a hang), moving a body along a line, easing a climb, and how to test all of it.

## Where you're starting

This folder is a copy of the finished Jump sample, plus two empty placeholders for the new file and its tests:

```
rooftop_parkour_ledges/
├── index.html, tests.html   (already list the new scripts)
├── css/                     (from the Jump sample)
├── js/
│   ├── ledges.js           (placeholder -- Steps 2 to 4)
│   ├── controller.js       (changes -- Steps 1 and 5)
│   ├── character.js        (changes -- Step 6)
│   ├── plan.js             (changes -- Step 7)
│   ├── debug.js            (changes -- Step 7)
│   ├── main.js             (changes -- Step 7)
│   └── the rest            (from the Jump sample)
└── tests/
    ├── ledges.tests.js     (placeholder -- Steps 2 to 4)
    ├── controller.tests.js, character.tests.js, plan.tests.js, debug.tests.js   (grow)
    └── the rest            (from the Jump sample)
```

### Serving the page

As before, the models can't be loaded from a page opened from a file, so run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rooftop_parkour/rooftop_parkour_ledges/` (the command prints the exact address), or use the *Live Server* extension in VS Code. Add `?dev` for the developer panel.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Jump sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**324**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new file*, the functions are added a few at a time, and the file ends with a short block that exports their names. That way every file is valid JavaScript after every step, and each time a step adds functions, the block at the end is **replaced** by a longer one. Where a step replaces something, **delete the old one**: a file with two functions of the same name runs the last. Line numbers are for the file as it is at the start of the step, if you have followed it.

> **Put the work in this sample's folder.** Everything goes in `rooftop_parkour_ledges/`, **not** in the Jump sample next door.

---

## What is a ledge, to a game?

To a climber, a ledge is the edge of something that you can get your fingers over. To a game that has its world as boxes, it is simpler: **the top edge of a side of a box.** Every roof is a box, with four sides, and so four ledges, each a line that starts at one corner, runs to the next, has a height and has a way that is *out* from the wall. That is all the data there is. Whether a runner can *catch* one is then a few questions:

- **Is it in reach of the hands?** Not at the waist (that is only a wall), and not higher than the arms go.
- **Is the body near the wall under it, and facing it, and beside some of it?**
- **Is there room to hang there**, with nothing else in the way, **and room to stand on top** when it is climbed?

If so, the body is moved to where it hangs, and held. The keys then mean different things, read **against the wall**: toward it is up, away from it is letting go, and along it is a shimmy. So the same keys that run the runner on the ground work the ledge, and nothing new has to be learned.

The district has these ledges in two places for now: the **edges of the roofs**, and the **edges of the upper roofs of the two buildings in two levels**, which a runner can reach from the lower roof. (Climbing from the street needs something to climb on: window sills, pipes and fire escapes. They come later in the series, as more ledges in the same data.)

---

## Step 1: The numbers of a ledge

Open `js/controller.js`. In the table `BODY`, find the last line (`rollTime`, line 24) and add these under it, above the `};` that ends the table:

```js
  handReach: 2.2, // how far above the feet the hands reach, to catch a ledge
  handLow: 0.9, // a ledge lower than this above the feet is at the waist, and is not a ledge to catch
  grabDistance: 0.5, // how far the body can be from the wall, edge to wall, to catch a ledge on it
  grabAngle: 1.05, // how far from facing the wall the body can be, in radians (60 degrees), to catch a ledge on it
  grabMaxRise: 6, // how fast the body can be still going up, and catch a ledge: a ledge is caught near the top of a jump, and not at the start
  hangDrop: 1.7, // how far under the ledge the feet hang: the hands, which are a little over the head, are at the ledge
  hangOffset: 0.05, // how far the body hangs from the wall, edge to wall
  topOffset: 0.15, // how far in from the edge of a ledge the body stands, after climbing it, edge to edge
  shimmySpeed: 1.6, // how fast a body moves along a ledge
  ledgeMargin: 0.5, // how far from the end of a ledge the body can shimmy
  climbTime: 0.63, // how long it takes to climb a ledge, in seconds: the length of the climbing clip
  grabCooldown: 0.4, // how long after letting go of a ledge it can't be caught again, in seconds
  dropReach: 1.5, // how far in from the edge of a roof a body can be, and lower itself over the edge to hang from the ledge there
```

Things to notice:

- **The numbers are all in the table**, with the others: how high the hands reach (`handReach`), the lowest a ledge is caught (`handLow`), how near the wall and how square to it the body has to be (`grabDistance`, `grabAngle`), how fast a body can still be going up (`grabMaxRise`), how it hangs (`hangDrop`, `hangOffset`), how it ends up (`topOffset`), the speed and times (`shimmySpeed`, `ledgeMargin`, `climbTime`, `grabCooldown`), and how far in from the edge of a roof a body can lower itself over it (`dropReach`).
- **`grabMaxRise` makes a ledge caught near the top of a jump**, and not at the start of it, where the body is going up too fast for a hand to hold. A runner who jumps at a ledge two and a half metres up catches it a little over half way up.
- **The heights are tied together by tests**, which come next: a ledge has to be higher than the waist and lower than the reach, a body has to hang by hands that reach it, and every ledge that the district has to be climbed from a lower roof must be reachable by a jump.

### Tests

Add this at the **end** of `tests/controller.tests.js` (below line 706):

```js
QUnit.module("The numbers of a ledge", () => {
  QUnit.test("the hands catch a ledge above the waist, and not above their reach", (assert) => {
    assert.true(BODY.handLow > 0 && BODY.handLow < BODY.handReach);
  });

  QUnit.test("a body hangs by its hands: its feet are under the ledge by no more than the hands reach", (assert) => {
    assert.true(BODY.hangDrop > 0 && BODY.hangDrop <= BODY.handReach);
  });

  QUnit.test("every ledge of a building in two levels can be caught by a jump from the roof below it", (assert) => {
    for (const building of Object.values(BUILDINGS)) {
      if (building.ledge) assert.true(building.ledge < jumpHeight(BODY) + BODY.handReach - BODY.handLow, building.file);
    }
  });

  QUnit.test("the times are real: a climb takes a fraction of a second, and a ledge that was let go of is caught again after a moment", (assert) => {
    assert.true(BODY.climbTime > 0.2 && BODY.climbTime < 1.5);
    assert.true(BODY.grabCooldown > 0 && BODY.grabCooldown < 1);
  });
});
```

Open `tests.html`. You should see **328 passing tests**: 4 more.

---

## Step 2: Ledges from boxes

The new file is `js/ledges.js`: plain arithmetic on ledges, a body and a World, so that a grab can be said in a test. Open the placeholder and replace its contents with these two functions, and the block that exports them:

```js
// Ledges: the top edges of things, that a runner in the air can catch with their hands. A ledge is one side of the top of a box (a roof, a
// ledge of a building in two levels), as a line to hang from. Everything here is plain arithmetic on a list of ledges, a body and a World, so a
// grab can be said in a test: that a body is in reach of a ledge, that there is room to hang from it, and room to stand on it after. The
// controller (see controller.js) is what hangs, shimmies and climbs. See ../tests/ledges.tests.js.

// The ledges of a list of boxes ({ name, minX, maxX, minY, maxY, minZ, maxZ }): four for each, one for each side. A ledge is
// { name, ax, az, bx, bz, nx, nz, tx, tz, length, y, lean }: it runs from (ax, az) to (bx, bz), `t` is the way along it, `n` is the way out from
// the wall (both unit vectors), `y` is the height of the top, which is where the hands go, and `lean` is how far the wall leans out, under the
// ledge, at the feet of a body that hangs from it (0 for a wall that is straight: it is the `lean` of the box, if it has one).
function ledgesOf(boxes) {
  const ledges = [];
  for (const box of boxes) {
    const sides = [
      { ax: box.minX, az: box.maxZ, bx: box.maxX, bz: box.maxZ, nx: 0, nz: 1 }, // the north side, which faces +z
      { ax: box.maxX, az: box.minZ, bx: box.minX, bz: box.minZ, nx: 0, nz: -1 }, // the south side
      { ax: box.maxX, az: box.maxZ, bx: box.maxX, bz: box.minZ, nx: 1, nz: 0 }, // the east side
      { ax: box.minX, az: box.minZ, bx: box.minX, bz: box.maxZ, nx: -1, nz: 0 }, // the west side
    ];
    for (const side of sides) {
      const length = Math.hypot(side.bx - side.ax, side.bz - side.az);
      ledges.push({ name: box.name, ...side, tx: (side.bx - side.ax) / length, tz: (side.bz - side.az) / length, length, y: box.maxY, lean: box.lean || 0 });
    }
  }
  return ledges;
}

// How far along a ledge a body may hang: not at the very end of it, since a body is wider than a point. A ledge shorter than that is hung from
// at its middle.
function clampAlong(ledge, u, options) {
  const margin = options.ledgeMargin;
  if (ledge.length <= margin * 2) return ledge.length / 2;
  return Math.min(ledge.length - margin, Math.max(margin, u));
}
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ledgesOf, clampAlong };
} else {
  Object.assign(window, { ledgesOf, clampAlong });
}
```

Things to notice:

- **A ledge is a line with a way out.** `(ax, az)` to `(bx, bz)` is where it runs, `t` is the unit vector along it, and `n` is the unit vector out from the wall. Those two are all that every other function needs. A ledge is made from each of the four sides of a box, by the same four lines of data, with `n` pointing the way that side faces.
- **A ledge has a `lean`**, which is the `lean` of its box (0 for a wall that is straight, which is nearly all of them). The walls of the buildings in two levels are not: they are wider at the bottom, and where a body hangs, at the feet, the wall is nearly half a metre further out than the edge at the top. It is data of the building (Step 7), and it goes through the box to the ledge.
- **`clampAlong` keeps a body off the end of a ledge**, since a body is wider than a point. A ledge that is shorter than that is hung from at its middle.

### Tests

The tests for the new file go in `tests/ledges.tests.js`. They start with a few things the modules share: a wall to catch (a box of ten metres, with its top three metres up), a World to hold it, and the numbers of the body. Open the placeholder and replace its contents with:

```js
// A wall to catch: a box whose south side is the plane z = 0, from x = 0 to 10, with its top 3 metres up. A body south of it, facing north (+z),
// is facing the wall. (The ledge on that side runs from x = 10 to x = 0, with its outside to the south, -z.)
const WALL = { name: "wall", minX: 0, maxX: 10, minY: 0, maxY: 3, minZ: 0, maxZ: 10 };
const worldOf = (...boxes) => new World({ boxes });
const OPTIONS = { ...SCOUT, ...BODY };
// A body 0.5 metres from the wall (edge to wall is 0.05), a metre off the ground, facing it.
const bodyAt = (changes = {}) => ({ x: 5, y: 1, z: -OPTIONS.radius - 0.05, heading: 0, ...changes });

QUnit.module("ledgesOf", () => {
  QUnit.test("a box has four ledges, one for each side, at the height of its top", (assert) => {
    const ledges = ledgesOf([WALL]);
    assert.strictEqual(ledges.length, 4);
    assert.true(ledges.every((ledge) => ledge.y === 3 && ledge.name === "wall"));
  });

  QUnit.test("each ledge has a unit way out from the wall, and a unit way along it, the two at right angles", (assert) => {
    for (const ledge of ledgesOf([WALL])) {
      assert.true(Math.abs(Math.hypot(ledge.nx, ledge.nz) - 1) < 1e-9);
      assert.true(Math.abs(Math.hypot(ledge.tx, ledge.tz) - 1) < 1e-9);
      assert.true(Math.abs(ledge.nx * ledge.tx + ledge.nz * ledge.tz) < 1e-9);
    }
  });

  QUnit.test("the way out points away from the middle of the box, and each ledge is along the side of the box it is on", (assert) => {
    const middle = { x: 5, z: 5 };
    for (const ledge of ledgesOf([WALL])) {
      const toMiddle = (middle.x - ledge.ax) * ledge.nx + (middle.z - ledge.az) * ledge.nz;
      assert.true(toMiddle < 0, "the middle is behind the wall");
      assert.strictEqual(ledge.length, 10);
      assert.true(Math.abs(ledge.ax + ledge.tx * ledge.length - ledge.bx) < 1e-9);
    }
  });

  QUnit.test("a ledge has the lean of its box, and none if the box has none", (assert) => {
    assert.true(ledgesOf([WALL]).every((ledge) => ledge.lean === 0));
    assert.true(ledgesOf([{ ...WALL, lean: 0.4 }]).every((ledge) => ledge.lean === 0.4));
  });

  QUnit.test("a box that is not square has ledges of two lengths", (assert) => {
    const lengths = ledgesOf([{ ...WALL, maxX: 4 }]).map((ledge) => ledge.length).sort((a, b) => a - b);
    assert.deepEqual(lengths, [4, 4, 10, 10]);
  });

  QUnit.test("the ledges of the district are all above the ground and all have a length", (assert) => {
    const ledges = ledgesOf([...buildingBoxes(), ...ledgeBoxes()]);
    assert.strictEqual(ledges.length, (buildingBoxes().length + ledgeBoxes().length) * 4);
    assert.true(ledges.every((ledge) => ledge.y > 10 && ledge.length > 3));
  });
});

QUnit.module("clampAlong", () => {
  const ledge = ledgesOf([WALL])[0];

  QUnit.test("a place along a ledge is kept off its ends, by the margin", (assert) => {
    assert.strictEqual(clampAlong(ledge, -3, OPTIONS), OPTIONS.ledgeMargin);
    assert.strictEqual(clampAlong(ledge, 4, OPTIONS), 4);
    assert.strictEqual(clampAlong(ledge, 30, OPTIONS), 10 - OPTIONS.ledgeMargin);
  });

  QUnit.test("a ledge shorter than twice the margin is hung from at its middle", (assert) => {
    assert.strictEqual(clampAlong({ length: 0.8 }, 0.1, OPTIONS), 0.4);
  });
});
```

Things to notice:

- **The wall is chosen so that the arithmetic can be done by head.** Its south side is the plane `z = 0`, so a body that is south of it and faces north is facing it, and a ledge is three metres up, which a standing jump can reach.
- **The district is tested too**: every box has four ledges, and every ledge of the district is high up and has a length.

Open `tests.html`. You should see **336 passing tests**: 8 more.

---

## Step 3: Where to hang, and where to stand

Two places are worked out from a ledge: where a body hangs, and where it stands when it has climbed. And two questions are asked of the world about them: is there room to hang there, and is there something to stand on, with room, at the top? Find the lines that export the names (lines 35 to 42: the comment, and the block under it) and **delete them**. Add this in their place, and the longer block of exports under it:

```js
// Where a body hangs from a ledge, `u` of the way along it: against the wall (a little out from it, and as far more as the wall leans), with its
// feet `hangDrop` under the ledge, facing the wall.
function hangSpot(ledge, u, options) {
  const out = options.radius + options.hangOffset + ledge.lean;
  return {
    x: ledge.ax + ledge.tx * u + ledge.nx * out,
    z: ledge.az + ledge.tz * u + ledge.nz * out,
    y: ledge.y - options.hangDrop,
    heading: Math.atan2(-ledge.nx, -ledge.nz),
  };
}

// Where a body stands after climbing a ledge: on top of it, a little in from the edge.
function topSpot(ledge, u, options) {
  const inside = options.radius + options.topOffset;
  return { x: ledge.ax + ledge.tx * u - ledge.nx * inside, z: ledge.az + ledge.tz * u - ledge.nz * inside, y: ledge.y };
}

// Whether a body can hang from a ledge at `u` (there is nothing else where it hangs), and whether it can climb it from there (there is
// something to stand on at the top, with nothing in the way of it).
function canHang(world, ledge, u, options) {
  const spot = hangSpot(ledge, u, options);
  const at = world.push(spot.x, spot.z, options.radius, spot.y, options.height, 0);
  return Math.hypot(at.x - spot.x, at.z - spot.z) < 0.05;
}
function canClimb(world, ledge, u, options) {
  const spot = topSpot(ledge, u, options);
  if (world.supportAt(spot.x, spot.z, 0, ledge.y + options.stepHeight) < ledge.y - 0.05) return false;
  const at = world.push(spot.x, spot.z, options.radius, ledge.y, options.height, options.stepHeight);
  return Math.hypot(at.x - spot.x, at.z - spot.z) < 0.05;
}
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ledgesOf, clampAlong, hangSpot, topSpot, canHang, canClimb };
} else {
  Object.assign(window, { ledgesOf, clampAlong, hangSpot, topSpot, canHang, canClimb });
}
```

Things to notice:

- **`hangSpot` puts the body against the wall**, out from the face by the width of the body, a gap (`hangOffset`) **and the lean of the wall**, so that the feet are against a wall that leans out and not in it, its feet `hangDrop` under the ledge so that its hands are on it, and **turned to face the wall** (`heading`). `u` is how far along the ledge.
- **`topSpot` is on top**, in from the edge by the width of the body and a little.
- **`canHang` asks the World** whether anything is in the way at the place where the body hangs. It is `push`: the body is put there, and if the world would move it, there is something in the way. `canClimb` asks whether there is a floor at the top (at the height of the ledge, or up to a step above it), and room for the body to stand.
- **The World is not given anything new.** Everything here is built from `supportAt` and `push`, which the world has had since Step 2 of the series.

### Tests

Add these two modules at the **end** of `tests/ledges.tests.js` (below line 63):

```js
QUnit.module("hangSpot and topSpot", () => {
  const ledge = ledgesOf([WALL]).find((l) => l.nz === -1);

  QUnit.test("a body hangs against the wall, its feet under the ledge by the drop, facing the wall", (assert) => {
    const spot = hangSpot(ledge, 5, OPTIONS);
    assert.true(Math.abs(spot.z - -(OPTIONS.radius + OPTIONS.hangOffset)) < 1e-9);
    assert.strictEqual(spot.y, 3 - OPTIONS.hangDrop);
    assert.strictEqual(spot.heading, 0);
    assert.true(Math.abs(spot.x - 5) < 1e-9, "5 metres along the ledge from where it starts, which is the east end");
  });

  QUnit.test("the place along the ledge is the place along it, whichever way the ledge runs", (assert) => {
    for (const side of ledgesOf([WALL])) {
      const a = hangSpot(side, 2, OPTIONS);
      const b = hangSpot(side, 6, OPTIONS);
      assert.true(Math.abs(Math.hypot(b.x - a.x, b.z - a.z) - 4) < 1e-9);
    }
  });

  QUnit.test("the body is turned to face the wall, on all four sides", (assert) => {
    for (const side of ledgesOf([WALL])) {
      const spot = hangSpot(side, 5, OPTIONS);
      assert.true(Math.abs(Math.sin(spot.heading) + side.nx) < 1e-9 && Math.abs(Math.cos(spot.heading) + side.nz) < 1e-9);
    }
  });

  QUnit.test("a body hangs as far further out as the wall leans, so that it is not in the wall", (assert) => {
    const plain = hangSpot(ledge, 5, OPTIONS);
    const leaning = hangSpot({ ...ledge, lean: 0.4 }, 5, OPTIONS);
    assert.true(Math.abs(plain.z - leaning.z - 0.4) < 1e-9, "further south, where south is out from this wall");
    assert.strictEqual(leaning.y, plain.y);
  });

  QUnit.test("it stands on top, in from the edge, at the height of the ledge", (assert) => {
    const spot = topSpot(ledge, 5, OPTIONS);
    assert.true(spot.z > 0, "over the box, not beside it");
    assert.true(Math.abs(spot.z - (OPTIONS.radius + OPTIONS.topOffset)) < 1e-9);
    assert.strictEqual(spot.y, 3);
  });
});

QUnit.module("canHang and canClimb", () => {
  const ledge = ledgesOf([WALL]).find((l) => l.nz === -1);

  QUnit.test("with nothing else about, a body can hang from a ledge and climb it", (assert) => {
    const world = worldOf(WALL);
    assert.true(canHang(world, ledge, 5, OPTIONS));
    assert.true(canClimb(world, ledge, 5, OPTIONS));
  });

  QUnit.test("it cannot hang where another box is in the way", (assert) => {
    const other = { name: "other", minX: 4, maxX: 6, minY: 0, maxY: 20, minZ: -3, maxZ: -0.2 };
    const world = worldOf(WALL, other);
    assert.false(canHang(world, ledge, 5, OPTIONS));
    assert.true(canHang(world, ledge, 8, OPTIONS));
  });

  QUnit.test("it cannot climb where there is a wall on top, or nothing to stand on", (assert) => {
    const above = { name: "above", minX: 0, maxX: 10, minY: 0, maxY: 9, minZ: 0.5, maxZ: 10 };
    assert.false(canClimb(worldOf(WALL, above), ledge, 5, OPTIONS));
    assert.false(canClimb(worldOf(WALL), { ...ledge, y: 5 }, 5, OPTIONS), "a ledge in the air has nothing to stand on");
  });
});
```

Things to notice:

- **`hangSpot` is tested on all four sides**, with the same arithmetic: the place along the ledge is the place along it, whichever way the ledge runs, and the body is turned to face the wall.
- **Room is tested by putting things there**: a box in the way of the hang, a wall over the top of the ledge, and a ledge in the air with nothing to stand on.

Open `tests.html`. You should see **344 passing tests**: 8 more.

---

## Step 4: Catching a ledge, and lowering yourself onto one

The last functions of the file ask all the questions at once: given a list of ledges and a body, which ledge, if any, does it catch? And the other way, for a body that stands on a roof: which ledge could it lower itself onto? Find the lines that export the names (lines 67 to 74) and **delete them**. Add this in their place, and the whole block of exports under it:

```js
// The ledge a body in the air would catch, if any, and where along it: { ledge, u }. The body is { x, y, z, heading }. A ledge is caught if it
// is in reach of the hands (above the waist, below the top of the reach), the body is near the wall below it, is beside some of it, and faces
// it, and there is room to hang from it and to climb it. Of those that are, the nearest.
function findLedge(ledges, body, world, options) {
  const o = options;
  const forwardX = Math.sin(body.heading);
  const forwardZ = Math.cos(body.heading);
  let best = null;
  for (const ledge of ledges) {
    const above = ledge.y - body.y;
    if (above < o.handLow || above > o.handReach) continue;
    const dx = body.x - ledge.ax;
    const dz = body.z - ledge.az;
    const out = dx * ledge.nx + dz * ledge.nz;
    if (out < o.radius - 0.1 || out > o.radius + o.grabDistance) continue;
    const along = dx * ledge.tx + dz * ledge.tz;
    if (along < 0 || along > ledge.length) continue;
    if (-(forwardX * ledge.nx + forwardZ * ledge.nz) < Math.cos(o.grabAngle)) continue;
    const u = clampAlong(ledge, along, o);
    if (!canHang(world, ledge, u, o) || !canClimb(world, ledge, u, o)) continue;
    if (!best || out < best.out) best = { ledge, u, out };
  }
  return best && { ledge: best.ledge, u: best.u };
}

// The ledge that a body standing on a roof could lower itself over, if any, and where along it: { ledge, u }. The body is standing at the top of the
// ledge (its feet at the height of it, or a step above, on the raised edge), over the roof and within `dropReach` of the edge, beside some of it, and
// there is room to hang there. It need not be facing the edge. Of those that are, the nearest.
function findDrop(ledges, body, world, options) {
  const o = options;
  let best = null;
  for (const ledge of ledges) {
    const above = body.y - ledge.y;
    if (above < -0.1 || above > o.stepHeight) continue;
    const dx = body.x - ledge.ax;
    const dz = body.z - ledge.az;
    const inside = -(dx * ledge.nx + dz * ledge.nz);
    if (inside < -0.1 || inside > o.dropReach) continue;
    const along = dx * ledge.tx + dz * ledge.tz;
    if (along < 0 || along > ledge.length) continue;
    const u = clampAlong(ledge, along, o);
    if (!canHang(world, ledge, u, o)) continue;
    if (!best || inside < best.inside) best = { ledge, u, inside };
  }
  return best && { ledge: best.ledge, u: best.u };
}
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ledgesOf, clampAlong, hangSpot, topSpot, canHang, canClimb, findLedge, findDrop };
} else {
  Object.assign(window, { ledgesOf, clampAlong, hangSpot, topSpot, canHang, canClimb, findLedge, findDrop });
}
```

Things to notice:

- **Each condition is one line**, and each says `continue` to go on to the next ledge: in reach (`above`), near (`out`), beside some of it (`along`), facing (the dot product of the way the body faces with the way into the wall), and then the room to hang and to climb. The first four are the cheap ones, and come first.
- **The way the body faces is compared with `cos(grabAngle)`**: the dot product of two unit vectors is the cosine of the angle between them, so no angle has to be worked out.
- **Of those that are caught, the nearest is taken**, so a body in a corner takes the wall it is closer to.
- **`findDrop` is the other way about.** It is for a body that stands on a roof: the feet are at the height of the ledge (or on the raised edge, a step above it), it is over the roof within `dropReach` of the edge, and beside some of it, and there is room to hang. It need not face the edge, since a person can turn and step off backwards. It is what lets a runner go back down the way they came up, and what lets every ledge of the district be tried without a jump.
- **There is no state.** The functions read the body and say what it would catch. That is what makes it testable, and also what lets the controller call it every frame without any more bookkeeping.

### Tests

Add this at the **end** of `tests/ledges.tests.js` (below line 127):

```js
QUnit.module("findLedge", () => {
  const ledges = ledgesOf([WALL]);
  const world = worldOf(WALL);
  const find = (changes, options = OPTIONS, from = ledges) => findLedge(from, bodyAt(changes), world, options);

  QUnit.test("a body in reach of the ledge, facing it, catches it, where it is along it", (assert) => {
    const found = find({});
    assert.strictEqual(found.ledge.nz, -1);
    assert.true(Math.abs(found.u - 5) < 1e-9);
  });

  QUnit.test("it must be in reach: not too low (at the waist), and not too high", (assert) => {
    assert.strictEqual(find({ y: 2.5 }), null, "the ledge is half a metre up from the feet");
    assert.notStrictEqual(find({ y: 1.2 }), null);
    assert.strictEqual(find({ y: 0.5 }), null, "the ledge is two and a half metres up");
    assert.notStrictEqual(find({ y: 0.9 }), null);
    assert.strictEqual(find({ y: 0 }), null, "three metres up");
  });

  QUnit.test("a longer reach is a ledge that is higher", (assert) => {
    assert.strictEqual(find({ y: 0 }), null);
    assert.notStrictEqual(find({ y: 0 }, { ...OPTIONS, handReach: 3.1 }), null);
  });

  QUnit.test("it must face the wall, to within the angle", (assert) => {
    assert.strictEqual(find({ heading: Math.PI }), null, "facing away");
    assert.strictEqual(find({ heading: Math.PI / 2 }), null, "facing along it");
    assert.notStrictEqual(find({ heading: 0.5 }), null);
    assert.strictEqual(find({ heading: 1.3 }), null);
  });

  QUnit.test("it must be near the wall: close enough for the hands", (assert) => {
    const near = OPTIONS.radius + OPTIONS.grabDistance;
    assert.notStrictEqual(find({ z: -near + 0.01 }), null);
    assert.strictEqual(find({ z: -near - 0.1 }), null);
  });

  QUnit.test("it must be beside some of the ledge: past its end there is no ledge", (assert) => {
    assert.strictEqual(find({ x: -0.5 }), null);
    assert.strictEqual(find({ x: 10.5 }), null);
    assert.notStrictEqual(find({ x: 0.2 }), null);
  });

  QUnit.test("it takes the place along the ledge that keeps it off the end", (assert) => {
    const found = find({ x: 0.2 });
    assert.true(found.u >= OPTIONS.ledgeMargin - 1e-9 && found.u <= 10 - OPTIONS.ledgeMargin + 1e-9);
  });

  QUnit.test("it does not catch a ledge it can't hang from, or can't climb", (assert) => {
    const other = { name: "other", minX: 3, maxX: 7, minY: 0, maxY: 20, minZ: -3, maxZ: -0.2 };
    assert.strictEqual(findLedge(ledgesOf([WALL, other]), bodyAt({ x: 5 }), worldOf(WALL, other), OPTIONS), null);
  });

  QUnit.test("of two ledges it takes the nearer", (assert) => {
    const behind = { name: "behind", minX: -20, maxX: -5, minY: 0, maxY: 3, minZ: -20, maxZ: -10 };
    const found = findLedge(ledgesOf([WALL, behind]), bodyAt(), worldOf(WALL, behind), OPTIONS);
    assert.strictEqual(found.ledge.name, "wall");
  });

  QUnit.test("with no ledges, there is nothing to catch", (assert) => {
    assert.strictEqual(find({}, OPTIONS, []), null);
  });
});

QUnit.module("findDrop", () => {
  const ledges = ledgesOf([WALL]);
  const world = worldOf(WALL);
  // A body on top of the wall (3 metres up), 0.5 metres in from its south edge.
  const standing = (changes = {}) => ({ x: 5, y: 3, z: 0.5, heading: 0, ...changes });
  const find = (changes, options = OPTIONS) => findDrop(ledges, standing(changes), world, options);

  QUnit.test("a body on a roof near its edge could lower itself over it, onto the ledge there, wherever it faces", (assert) => {
    const found = find({});
    assert.strictEqual(found.ledge.nz, -1);
    assert.true(Math.abs(found.u - 5) < 1e-9);
    assert.notStrictEqual(find({ heading: Math.PI }), null);
  });

  QUnit.test("it must be near the edge: within the drop reach of it", (assert) => {
    assert.notStrictEqual(find({ z: OPTIONS.dropReach - 0.05 }), null);
    assert.strictEqual(find({ z: OPTIONS.dropReach + 0.5 }), null);
    assert.strictEqual(find({ z: 5 }), null, "the middle of the roof is not near any edge");
  });

  QUnit.test("it must be standing at the top of the ledge: not on a lower roof, and not in the air above it", (assert) => {
    assert.strictEqual(find({ y: 1 }), null);
    assert.strictEqual(find({ y: 3 + OPTIONS.stepHeight + 0.2 }), null);
    assert.notStrictEqual(find({ y: 3.2 }), null, "on the raised edge of the roof, a little above");
  });

  QUnit.test("it must be over the roof, and not out beyond its edge", (assert) => {
    assert.strictEqual(find({ z: -1.5 }), null);
  });

  QUnit.test("it must be beside some of the ledge, and there must be room to hang", (assert) => {
    assert.strictEqual(find({ x: -1 }), null);
    const post = { name: "post", minX: 4, maxX: 6, minY: 0, maxY: 20, minZ: -3, maxZ: -0.2 };
    assert.strictEqual(findDrop(ledgesOf([WALL, post]), standing({ x: 5 }), worldOf(WALL, post), OPTIONS), null);
  });

  QUnit.test("of two edges it takes the nearer", (assert) => {
    const corner = findDrop(ledges, standing({ x: 9.7, z: 0.9 }), world, OPTIONS);
    assert.strictEqual(corner.ledge.nx, 1, "the east edge is 0.3 metres away, and the south one 0.9");
    assert.strictEqual(find({ x: 5.2, z: 0.3 }).ledge.nz, -1);
  });
});
```

Things to notice:

- **`findDrop` is tested the same way**: near the edge and too far from it, at the height of the roof and on a lower one or in the air, over the roof and out beyond its edge, beside the ledge and past its end, with room to hang and with something in the way, and of two edges the nearer.
- **Every condition has a test on each side of its limit.** A body at the waist and at the very top of its reach, in front of the wall and a little too far from it, facing it and 70 degrees off: if the numbers in the table are changed, the tests move with them, since they use `OPTIONS`, which is the table.

Open `tests.html`. You should see **360 passing tests**: 16 more.

---

## Step 5: The body hangs

Now the controller. A body that hangs is held where it is told, and the keys are read against the ledge. Open `js/controller.js`. The changes go from the top of the file to the bottom, except the two at its start, which are done the other way about, so that the line numbers hold.

First, the constructor. Find it, and the comment above it (lines 50 to 71) and **delete them**, and add this in their place:

```js
  // `world` is a World. `bounds` is the edge of the world: { minX, maxX, minZ, maxZ }. `ledges` are the ledges that can be caught (see
  // ledges.js). The runner starts on whatever is at (x, z), the highest thing there if `y` isn't given.
  constructor({ x = 0, y = null, z = 0, heading = 0, world, bounds = null, ledges = [], options = {} } = {}) {
    this.world = world;
    this.bounds = bounds;
    this.ledges = ledges;
    this.options = { ...SCOUT, ...BODY, ...options };
    this.x = x;
    this.z = z;
    this.y = y === null ? world.supportAt(x, z, this.options.supportReach, Infinity) : y;
    this.heading = heading; // the way the body faces, as a yaw
    this.speed = 0; // how fast it is going along the ground
    this.vy = 0; // how fast it is going up (negative is down)
    this.grounded = true;
    this.landing = 0; // seconds left of a hard landing
    this.rolling = 0; // seconds left of a roll
    this.impact = 0; // how fast the last fall was, when it landed
    this.airTime = 0; // how long the feet have been off the ground
    this.jumping = false; // whether the body is in the air because it jumped (and so can be slowed by letting go of the key)
    this.jumpHeld = false; // whether the key was down the last frame, to know the moment it goes down
    this.jumpWanted = 0; // seconds left that a jump is wanted, from when the key went down
    this.hang = null; // when the body hangs from a ledge: { ledge, u (how far along it), climb (null, or how long it has climbed), moving (-1, 0 or 1) }
    this.cooldown = 0; // seconds left before a ledge can be caught again
    this.start = { x, z, heading, y: this.y };
  }
```

Things to notice:

- **The controller is given the ledges**, like it is given the world and the bounds, and not made to find them: it does not know what a roof is.
- **`hang` is the whole of the state**: `null` for a body that is not hanging, or `{ ledge, u, climb, moving }`: which ledge, how far along it, how long it has climbed (`null` before it climbs), and which way it is shimmying. `cooldown` is the moment after letting go when a ledge isn't caught again.

Then the comment at the top of the file, which says what the controller does. **Delete the one that is there** (lines 1 to 5) and add this in its place:

```js
// The character controller: a runner's body that is moved by code and not by a physics engine. Each frame it is told which way the keys
// ask it to go, and it works out where it ends up: running along the ground at a speed it builds up to, turning to face the way it goes,
// stepping up a curb and down again, stopped by walls, standing on the roof of a building, jumping, catching a ledge with its hands and
// hanging from it, shimmying along it and climbing it, and, when there is nothing under its feet, falling. Everything is plain arithmetic on a World (see collision.js), so a jump from this speed onto that roof is a thing a test
// can say. See ../tests/controller.tests.js.
```

In `update`, two small additions. Under the line `this.jumpHeld = jump;` (line 84) add:

```js
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.hang) {
      this._hang(direction, dt);
      return;
    }
```

and at the end of `update`, under the line `if (!this.grounded) this._fall(dt);` (line 119), add:

```js
    if (!this.grounded && this.cooldown === 0 && this.rolling === 0 && this.vy <= o.grabMaxRise) this._grab();
```

Directly under the end of `update` (the line `}` after the one you have just added, line 121), **above** the comment `// A jump, if one is wanted`, add the three new methods:

```js
  // Catches a ledge, if the body is in the air and one is in reach: it is held where it hangs from it, and falls no more.
  _grab() {
    const found = findLedge(this.ledges, this, this.world, this.options);
    if (found) this.hangOn(found.ledge, found.u);
  }

  // Lowers a body that stands near the edge of a roof over it, to hang from the ledge there. It says whether there was one.
  dropDown() {
    if (!this.grounded || this.hang) return false;
    const found = findDrop(this.ledges, this, this.world, this.options);
    if (found) this.hangOn(found.ledge, found.u);
    return Boolean(found);
  }

  // Hangs the body from a ledge, `u` of the way along it, wherever it was: it is held there, and falls no more.
  hangOn(ledge, u) {
    this.hang = { ledge, u, climb: null, moving: 0 };
    this.grounded = false;
    this.jumping = false;
    this.jumpWanted = 0;
    this.vy = 0;
    this.speed = 0;
    this._holdOn();
  }

  // Puts the body where it hangs.
  _holdOn() {
    const spot = hangSpot(this.hang.ledge, this.hang.u, this.options);
    this.x = spot.x;
    this.y = spot.y;
    this.z = spot.z;
    this.heading = spot.heading;
  }

  // Hanging from a ledge. The keys are read against the ledge: toward the wall is up (or the jump key), away from it is letting go, and
  // along it is a shimmy. Climbing takes `climbTime`, and ends with the body standing on top.
  _hang(direction, dt) {
    const o = this.options;
    const hang = this.hang;
    const ledge = hang.ledge;
    if (hang.climb !== null) {
      hang.climb += dt;
      const p = Math.min(1, hang.climb / o.climbTime);
      const from = hangSpot(ledge, hang.u, o);
      const to = topSpot(ledge, hang.u, o);
      const up = p * p * (3 - 2 * p); // the body goes up first, and then over the edge
      const over = Math.min(1, Math.max(0, (p - 0.4) / 0.6));
      this.x = from.x + (to.x - from.x) * over;
      this.z = from.z + (to.z - from.z) * over;
      this.y = from.y + (to.y - from.y) * up;
      if (p >= 1) {
        this.y = this.world.supportAt(to.x, to.z, 0, ledge.y + o.stepHeight);
        this.hang = null;
        this.grounded = true;
        this.cooldown = o.grabCooldown;
      }
      return;
    }
    const into = direction ? -(direction.x * ledge.nx + direction.z * ledge.nz) : 0;
    const along = direction ? direction.x * ledge.tx + direction.z * ledge.tz : 0;
    hang.moving = 0;
    if ((this.jumpWanted > 0 || into > 0.6) && canClimb(this.world, ledge, hang.u, o)) {
      this.jumpWanted = 0;
      hang.climb = 0;
    } else if (into < -0.6) {
      this.hang = null;
      this.grounded = false;
      this.vy = 0;
      this.airTime = o.coyoteTime + 1;
      this.cooldown = o.grabCooldown;
      return;
    } else if (Math.abs(along) > 0.3) {
      const u = clampAlong(ledge, hang.u + Math.sign(along) * o.shimmySpeed * dt, o);
      if (canHang(this.world, ledge, u, o)) {
        // the body's right is the way (nz, -nx) points: which way along the ledge is that?
        const right = ledge.tx * -ledge.nz + ledge.tz * ledge.nx;
        hang.moving = Math.sign(along) * Math.sign(right);
        hang.u = u;
      }
    }
    this._holdOn();
  }
```

Things to notice:

- **A hanging body skips the rest of `update`.** It is not walked, jumped or fallen: `_hang` decides everything, and `update` returns. So there is no gravity to fight, and the walls do not push it about.
- **`_grab` is asked every frame that the body is in the air**, once the jump is nearly at its top, and it asks `findLedge`. If there is one, `hangOn` puts the body where it hangs (`_holdOn`) and takes its speed away. `hangOn` is a method of its own, so that anything can hang the body from a ledge: the developer panel does.
- **`dropDown` lowers a body that stands near the edge of a roof over it.** It asks `findDrop`, and says whether there was a ledge. It is called by a button for now, and could be called by a key.
- **The keys are read against the ledge, as two numbers**: `into` (how much they point at the wall) and `along` (how much they point along it), each the dot product of the direction with a unit vector of the ledge. The same camera-relative direction as running, and so the key that runs at the wall climbs it.
- **Climbing is a timer.** `hang.climb` counts up to `climbTime`, and the body is moved from where it hangs to where it stands, by an ease: it goes **up first**, and **over the edge after**, which is what a climb looks like. When it is done, the body is standing on the roof (on the highest thing there, so a raised edge is stood on and not in), and `cooldown` is set so that it is not caught again.
- **A shimmy moves along the ledge by `shimmySpeed`**, only if there is room at the new place (`canHang`), and says which way (`moving`, -1 or 1) in the body's own left and right, for the clip.
- **Letting go sets `airTime` large**, so that there is no coyote time: the runner has chosen to fall.

At the bottom of the class, `reset` and `placeAt` have to let go of a ledge. Find the line in each that begins `Object.assign(this,` (line 261 and line 266) and **delete them**, and add:

```js
    Object.assign(this, this.start, { speed: 0, vy: 0, grounded: true, landing: 0, rolling: 0, impact: 0, airTime: 0, jumping: false, jumpWanted: 0, hang: null, cooldown: 0 });
```

and:

```js
    Object.assign(this, { x, y, z, speed: 0, vy: 0, grounded: false, landing: 0, rolling: 0, airTime: this.options.coyoteTime + 1, jumping: false, jumpWanted: 0, hang: null, cooldown: 0 });
```

### Tests

Add these four modules at the **end** of `tests/controller.tests.js` (below line 727), one at a time. **All go in `controller.tests.js`**, and not in `ledges.tests.js`, which is for the tests of `ledges.js` and is finished. The first:

```js
QUnit.module("Controller hanging from a ledge", () => {
  const dt = 1 / 60;
  const south = { x: 0, z: -1 }; // away from the wall
  const north = { x: 0, z: 1 }; // toward it
  const climber = (box = WALL, options = {}) => new Controller({ x: 5, z: -0.5, heading: 0, world: new World({ boxes: [box] }), ledges: ledgesOf([box]), options });
  // Stands at the wall and jumps at it, until it has hold of something or it has come down.
  const jumpedAt = (body) => {
    for (let i = 0; i < 60 && !body.hang; i++) body.update(null, false, dt, i < 20);
    return body;
  };
  const run = (body, frames, direction = null) => {
    for (let i = 0; i < frames; i++) body.update(direction, false, dt);
  };

  QUnit.test("a body that jumps at a wall with a ledge in reach catches it, and hangs from it by the hands", (assert) => {
    const body = jumpedAt(climber());
    assert.notStrictEqual(body.hang, null);
    assert.false(body.grounded);
    assert.strictEqual(body.vy, 0);
    assert.true(Math.abs(body.y - (3 - BODY.hangDrop)) < 1e-9);
    assert.strictEqual(body.hang.climb, null);
  });

  QUnit.test("it hangs there: gravity does not pull it off, and it faces the wall", (assert) => {
    const body = jumpedAt(climber());
    const { x, y, z } = body;
    run(body, 120);
    assert.deepEqual([body.x, body.y, body.z], [x, y, z]);
    assert.strictEqual(body.heading, 0);
    assert.notStrictEqual(body.hang, null);
  });

  QUnit.test("on the ground, it does not catch a ledge, even one it could reach", (assert) => {
    const low = { ...WALL, maxY: 2 };
    const body = climber(low);
    run(body, 60);
    assert.strictEqual(body.hang, null);
    assert.true(body.grounded);
  });

  QUnit.test("it does not catch a ledge that is too high, or one it is not facing", (assert) => {
    assert.strictEqual(jumpedAt(climber({ ...WALL, maxY: 6 })).hang, null);
    const away = climber();
    away.heading = Math.PI;
    assert.strictEqual(jumpedAt(away).hang, null);
  });

  QUnit.test("a higher jump reaches a higher ledge", (assert) => {
    assert.strictEqual(jumpedAt(climber({ ...WALL, maxY: 4.2 })).hang, null);
    assert.notStrictEqual(jumpedAt(climber({ ...WALL, maxY: 4.2 }, { jumpSpeed: 12 })).hang, null);
  });

  QUnit.test("it does not catch a ledge until the jump is near its top", (assert) => {
    const body = climber();
    body.update(null, false, dt, true);
    assert.strictEqual(body.hang, null, "just off the ground, going up fast");
    assert.true(body.vy > BODY.grabMaxRise);
  });

  QUnit.test("letting go (the key away from the wall) drops it, and the ledge is not caught again at once", (assert) => {
    const body = jumpedAt(climber());
    body.update(south, false, dt);
    assert.strictEqual(body.hang, null);
    assert.false(body.grounded);
    run(body, 10);
    assert.strictEqual(body.hang, null, "still in reach of the ledge, but it has only just let go");
    run(body, 120);
    assert.true(body.grounded);
    assert.strictEqual(body.y, 0);
  });

  QUnit.test("reset and placeAt let go of a ledge", (assert) => {
    const body = jumpedAt(climber());
    body.placeAt(1, 5, 1);
    assert.strictEqual(body.hang, null);
    const again = jumpedAt(climber());
    again.reset();
    assert.deepEqual([again.hang, again.grounded], [null, true]);
  });
});
```

Things to notice:

- **The wall of the tests is the one of `ledges.tests.js`**, and so the numbers are the same: a body at the foot of it, jumping at it, catches the ledge three metres up at about the top of its jump, and hangs two metres under it.
- **Each limit has a test**: the ledge too high, or too low, or behind the body, or caught too early in the jump, or let go of and not caught again at once.

Open `tests.html`: the new tests pass. Then add the second module, **in `tests/controller.tests.js` too**, below the last line of the one you have just added:

```js
QUnit.module("Controller shimmying and climbing", () => {
  const dt = 1 / 60;
  const west = { x: -1, z: 0 };
  const east = { x: 1, z: 0 };
  const north = { x: 0, z: 1 };
  const hanging = (box = WALL, boxes = []) => {
    const body = new Controller({ x: 5, z: -0.5, heading: 0, world: new World({ boxes: [box, ...boxes] }), ledges: ledgesOf([box]) });
    for (let i = 0; i < 60 && !body.hang; i++) body.update(null, false, dt, i < 20);
    return body;
  };
  const run = (body, frames, direction = null, jump = false) => {
    for (let i = 0; i < frames; i++) body.update(direction, false, dt, jump);
  };

  QUnit.test("a key along the ledge shimmies along it, at the speed of a shimmy, and not off the wall", (assert) => {
    const body = hanging();
    const { y, z } = body;
    run(body, 60, west);
    assert.true(Math.abs(body.x - (5 - BODY.shimmySpeed)) < 0.05, String(body.x));
    assert.deepEqual([body.y, body.z], [y, z]);
    run(body, 120, east);
    assert.true(body.x > 5, "and back the other way");
  });

  QUnit.test("it says which way it is shimmying, as the body's left or right", (assert) => {
    const body = hanging();
    body.update(east, false, dt);
    assert.strictEqual(body.hang.moving, 1, "facing north, east is to the right");
    body.update(west, false, dt);
    assert.strictEqual(body.hang.moving, -1);
    body.update(null, false, dt);
    assert.strictEqual(body.hang.moving, 0);
  });

  QUnit.test("it stops at the ends of the ledge, with room for the body", (assert) => {
    const body = hanging();
    run(body, 600, west);
    assert.true(Math.abs(body.x - OPTIONS.ledgeMargin) < 0.05, String(body.x));
    run(body, 1200, east);
    assert.true(Math.abs(body.x - (10 - OPTIONS.ledgeMargin)) < 0.05, String(body.x));
  });

  QUnit.test("it stops when there is something in the way along the ledge", (assert) => {
    const post = { name: "post", minX: 0, maxX: 3, minY: 0, maxY: 20, minZ: -3, maxZ: -0.2 };
    const body = hanging(WALL, [post]);
    run(body, 600, west);
    assert.true(body.x >= 3 + OPTIONS.radius - 0.05, String(body.x));
    assert.notStrictEqual(body.hang, null);
  });

  QUnit.test("a key into the wall climbs the ledge, in the time of a climb, and ends standing on top", (assert) => {
    const body = hanging();
    body.update(north, false, dt);
    assert.notStrictEqual(body.hang.climb, null);
    run(body, Math.floor((BODY.climbTime - 0.1) / dt));
    assert.notStrictEqual(body.hang, null, "not done yet");
    run(body, 15);
    assert.strictEqual(body.hang, null);
    assert.true(body.grounded);
    assert.strictEqual(body.y, 3);
    assert.true(body.z > 0 && body.z < 1, "on top of the box, near its edge");
  });

  QUnit.test("the jump key climbs it too", (assert) => {
    const body = hanging();
    run(body, 5);
    body.update(null, false, dt, true);
    assert.notStrictEqual(body.hang.climb, null);
  });

  QUnit.test("it rises while it climbs, and goes over the edge after", (assert) => {
    const body = hanging();
    body.update(north, false, dt);
    let lastY = body.y;
    for (let i = 0; i < 10; i++) {
      body.update(null, false, dt);
      assert.true(body.y >= lastY - 1e-9);
      lastY = body.y;
    }
    assert.true(body.z < 0, "still in front of the wall at the start of the climb");
  });

  QUnit.test("the keys do nothing while it climbs: it cannot be dropped half way", (assert) => {
    const body = hanging();
    body.update(north, false, dt);
    run(body, 10, { x: 0, z: -1 });
    assert.notStrictEqual(body.hang, null);
    run(body, 60);
    assert.true(body.grounded);
    assert.strictEqual(body.y, 3);
  });

  QUnit.test("it cannot climb a ledge that has a wall on top of it, and stays hanging", (assert) => {
    const above = { name: "above", minX: 0, maxX: 10, minY: 0, maxY: 9, minZ: 0.5, maxZ: 10 };
    const body = hanging();
    body.world.boxes.push(above); // the wall is put there after the body has caught the ledge
    run(body, 60, north);
    assert.notStrictEqual(body.hang, null);
    assert.strictEqual(body.hang.climb, null);
  });

  QUnit.test("after a climb it can walk away on top, and is not pulled back to the ledge", (assert) => {
    const body = hanging();
    body.update(north, false, dt);
    run(body, 60);
    run(body, 60, north);
    assert.strictEqual(body.hang, null);
    assert.true(body.z > 3);
  });
});
```

The third, for a body that is put on a ledge, without a jump (and on a wall that leans):

```js
QUnit.module("Hanging from any ledge", () => {
  const dt = 1 / 60;
  const wallWorld = () => new World({ boxes: [WALL] });
  const ledge = () => ledgesOf([WALL]).find((l) => l.nz === -1);

  QUnit.test("hangOn puts the body hanging from the ledge where it is told, wherever it was, and still", (assert) => {
    const body = new Controller({ x: 1, z: 20, world: wallWorld(), ledges: ledgesOf([WALL]) });
    body.hangOn(ledge(), 5);
    const spot = hangSpot(ledge(), 5, body.options);
    assert.deepEqual([body.x, body.y, body.z, body.heading], [spot.x, spot.y, spot.z, spot.heading]);
    assert.false(body.grounded);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.strictEqual(body.y, spot.y);
  });

  QUnit.test("a body put on a ledge can climb it, shimmy on it and be dropped", (assert) => {
    const body = new Controller({ x: 1, z: 20, world: wallWorld(), ledges: ledgesOf([WALL]) });
    body.hangOn(ledge(), 5);
    body.update({ x: 1, z: 0 }, false, dt);
    assert.strictEqual(body.hang.moving, 1);
    body.update({ x: 0, z: 1 }, false, dt);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.true(body.grounded && body.y === 3);
  });

  QUnit.test("a body that hangs from a leaning wall is out from the face of the box by the lean, and climbs just the same", (assert) => {
    const leaning = { ...WALL, lean: 0.45 };
    const body = new Controller({ x: 1, z: 20, world: new World({ boxes: [leaning] }), ledges: ledgesOf([leaning]) });
    body.hangOn(ledgesOf([leaning]).find((l) => l.nz === -1), 5);
    assert.true(Math.abs(body.z - -(OPTIONS.radius + OPTIONS.hangOffset + 0.45)) < 1e-9);
    body.update({ x: 0, z: 1 }, false, dt);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.true(body.grounded && body.y === 3 && body.z > 0);
  });
});
```

And the fourth, for lowering a body over the edge of a roof, and climbing back:

```js
QUnit.module("Dropping down onto a ledge", () => {
  const dt = 1 / 60;
  const onTop = (changes = {}) => new Controller({ x: 5, z: 0.6, y: 3, world: new World({ boxes: [WALL] }), ledges: ledgesOf([WALL]), ...changes });

  QUnit.test("a body near the edge of a roof can lower itself over it, and hangs from the ledge, facing the wall", (assert) => {
    const body = onTop();
    assert.true(body.dropDown());
    assert.notStrictEqual(body.hang, null);
    assert.false(body.grounded);
    assert.true(Math.abs(body.y - (3 - BODY.hangDrop)) < 1e-9);
    assert.true(body.z < 0, "it is on the outside of the wall now");
    assert.strictEqual(body.heading, 0, "and faces the wall, which is to the north");
  });

  QUnit.test("it can climb back up, and the climb ends where it began, on the roof", (assert) => {
    const body = onTop();
    body.dropDown();
    body.update({ x: 0, z: 1 }, false, dt);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.true(body.grounded && body.y === 3 && body.z > 0);
  });

  QUnit.test("away from the edges, or in the air, or already hanging, there is nothing to drop to", (assert) => {
    const middle = onTop({ z: 5 });
    assert.false(middle.dropDown());
    assert.strictEqual(middle.hang, null);
    const falling = onTop();
    falling.placeAt(5, 3, 0.6);
    assert.false(falling.dropDown());
    const hanging = onTop();
    hanging.dropDown();
    assert.false(hanging.dropDown());
  });

  QUnit.test("it is the same on every roof of the district that has room under its edge", (assert) => {
    const roofs = buildingBoxes();
    const world = new World({ boxes: [...roofs, ...ledgeBoxes(), ...rimBoxes()], ground: (x, z) => groundHeight(x, z) });
    const ledges = ledgesOf([...roofs, ...ledgeBoxes()]);
    let dropped = 0;
    for (const roof of roofs) {
      const spot = roofSpot(roof);
      const body = new Controller({ x: roof.minX + 0.6, y: roof.maxY, z: spot.z, world, ledges });
      if (body.dropDown()) dropped++;
    }
    assert.true(dropped >= roofs.length / 2, "most of the roofs have a ledge to lower oneself onto: " + dropped);
  });
});
```

Things to notice:

- **Shimmying is tested in all four ways it can end**: it moves at the speed of a shimmy, it says which way, it stops at the ends of the ledge, and it stops when something is in the way.
- **A climb is tested by its time**: not done a tenth of a second before the time, and done a moment after, standing on top with its feet at the height of the roof.
- **The wall that falls on a hanging body** is added *after* the catch, since a ledge with a wall on top of it is not caught at all.

Open `tests.html`. You should see **385 passing tests**: 25 more than in the last step.

---

## Step 6: Clips for a ledge

The character file has the clips: `Climb_Idle_Loop` (hanging, with both hands overhead), `Climb_Left_Loop` and `Climb_Right_Loop` (the shimmies) and `ClimbLedge` (the climb: it is a little over half a second, as long as `climbTime`). Open `js/character.js`. Find the line that begins `const CLIPS =` (line 13) and **delete it**, and add this:

```js
const CLIPS = { idle: "Idle_Loop", walk: "Walk_Loop", jog: "Jog_Fwd_Loop", sprint: "Sprint_Loop", jump: "Jump_Start", fall: "Jump_Loop", land: "Jump_Land", roll: "Roll", hang: "Climb_Idle_Loop", shimmyLeft: "Climb_Left_Loop", shimmyRight: "Climb_Right_Loop", climb: "ClimbLedge" };
```

Then find the comment of `clipForBody` and the function (lines 37 to 45) and **delete them**, and add this:

```js
// The clip for a body (a Controller): { name, rate, loop }. Hanging from a ledge, the clip for hanging, or for shimmying to the left or the right,
// or, while climbing it, the clip for climbing, once (it is as long as the climb). On the way up from a jump, the jump clip, once, and then it stays at its last pose;
// on the way down, the falling clip, which goes on for as long as the fall; in a roll, the roll clip, once, fast enough to be done when the roll
// is; just after a hard landing, the landing clip, once; and otherwise the one for the speed.
function clipForBody(body) {
  if (body.hang) {
    if (body.hang.climb !== null) return { name: CLIPS.climb, rate: 1, loop: false };
    if (body.hang.moving !== 0) return { name: body.hang.moving > 0 ? CLIPS.shimmyRight : CLIPS.shimmyLeft, rate: 1, loop: true };
    return { name: CLIPS.hang, rate: 1, loop: true };
  }
  if (!body.grounded) return body.jumping ? { name: CLIPS.jump, rate: JUMP_RATE, loop: false } : { name: CLIPS.fall, rate: 1, loop: true };
  if (body.rolling > 0) return { name: CLIPS.roll, rate: ROLL_RATE, loop: false };
  if (body.landing > 0) return { name: CLIPS.land, rate: LAND_RATE, loop: false };
  return { ...clipForSpeed(body.speed), loop: true };
}
```

Things to notice:

- **Hanging comes first**, before being in the air: a hanging body is not on the ground, and would otherwise be falling. Then the clip for a climb (once), for a shimmy (left or right, looping), and for hanging (looping).
- **The clips are all of a body against a wall**, with both hands over its head. They look best against a wall, which is where the body is.

### Tests

In `tests/character.tests.js`, **change** the list in *"the clips are all clips the character file has"* (line 37) to:

```js
    assert.deepEqual(Object.values(CLIPS), ["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop", "Jump_Start", "Jump_Loop", "Jump_Land", "Roll", "Climb_Idle_Loop", "Climb_Left_Loop", "Climb_Right_Loop", "ClimbLedge"]);
```

Find the module `clipForBody` (lines 41 to 76). **Delete it**, and add this in its place (the old module, with a body that has a `hang` in it, and three new tests):

```js
QUnit.module("clipForBody", () => {
  const body = (changes) => ({ grounded: true, landing: 0, rolling: 0, jumping: false, hang: null, speed: 0, ...changes });

  QUnit.test("on the ground, it is the clip for the speed, looping", (assert) => {
    assert.deepEqual(clipForBody(body({ speed: 0 })), { name: CLIPS.idle, rate: 1, loop: true });
    assert.strictEqual(clipForBody(body({ speed: 4.5 })).name, CLIPS.jog);
    assert.strictEqual(clipForBody(body({ speed: 7.5 })).name, CLIPS.sprint);
    assert.true(clipForBody(body({ speed: 4.5 })).loop);
  });

  QUnit.test("in the air, after the top of a jump or a step off an edge, it is the falling clip, whatever the speed", (assert) => {
    for (const speed of [0, 4.5, 7.5]) assert.deepEqual(clipForBody(body({ grounded: false, speed })), { name: CLIPS.fall, rate: 1, loop: true });
  });

  QUnit.test("on the way up from a jump, it is the jump clip, played once and fast", (assert) => {
    const clip = clipForBody(body({ grounded: false, jumping: true, speed: 4.5 }));
    assert.deepEqual(clip, { name: CLIPS.jump, rate: JUMP_RATE, loop: false });
  });

  QUnit.test("in a roll, it is the roll clip, played once, at the rate that makes it as long as the roll", (assert) => {
    const clip = clipForBody(body({ rolling: 0.3, speed: 6 }));
    assert.deepEqual(clip, { name: CLIPS.roll, rate: ROLL_RATE, loop: false });
    assert.true(JUMP_RATE > 1 && ROLL_RATE > 1);
  });

  QUnit.test("hanging from a ledge, it is the hanging clip, looping, and not the falling clip, though the body is in the air", (assert) => {
    const clip = clipForBody(body({ grounded: false, hang: { climb: null, moving: 0 } }));
    assert.deepEqual(clip, { name: CLIPS.hang, rate: 1, loop: true });
  });

  QUnit.test("shimmying along a ledge, it is the clip for going left, or right, looping", (assert) => {
    assert.strictEqual(clipForBody(body({ grounded: false, hang: { climb: null, moving: -1 } })).name, CLIPS.shimmyLeft);
    assert.strictEqual(clipForBody(body({ grounded: false, hang: { climb: null, moving: 1 } })).name, CLIPS.shimmyRight);
    assert.true(clipForBody(body({ grounded: false, hang: { climb: null, moving: 1 } })).loop);
  });

  QUnit.test("climbing a ledge, it is the climbing clip, played once", (assert) => {
    const clip = clipForBody(body({ grounded: false, hang: { climb: 0.2, moving: 0 } }));
    assert.deepEqual(clip, { name: CLIPS.climb, rate: 1, loop: false });
  });

  QUnit.test("just after a hard landing, it is the landing clip, played once", (assert) => {
    const clip = clipForBody(body({ landing: 0.2, speed: 4.5 }));
    assert.strictEqual(clip.name, CLIPS.land);
    assert.strictEqual(clip.rate, LAND_RATE);
    assert.false(clip.loop);
  });

  QUnit.test("in the air wins over a landing, since it is falling again", (assert) => {
    assert.strictEqual(clipForBody(body({ grounded: false, landing: 0.2 })).name, CLIPS.fall);
  });
});
```

Open `tests.html`. You should see **388 passing tests**: 3 more.

---

## Step 7: Putting it in the game

Three smaller changes make the ledges something to play with: a place to stand to try one, a way to see them, and the game itself.

### The lean of a wall

In `js/plan.js`, the buildings in two levels get a `lean`: how far out their walls are at the feet of a hanging runner (it was measured with rays at the walls: 0 at the top, and 0.45 two metres down). Four small changes, top to bottom. In the comment above `BUILDINGS` (lines 28 to 31), which is **replaced**:

```js
// A footprint is not always all roof. `deck` is how far the roof is in from the edge of the footprint on each side (as the building comes out
// of its file, facing +z; a side that is not given is 0): the small_1 and large_1 have steps at the front that are not part of the roof, and
// the medium_1 and large_3 are in two levels, a smaller roof on top, and a ledge round it, `ledge` metres lower (the ledge is not quite flat:
// this is its middle). `lean` is how far the wall under the upper roof leans out, at the feet of a runner hanging from its edge: those walls
// are not straight, and a body that hangs against the edge of the roof would be in the wall below it.
```

Add `lean: 0.45` to the end of the lines of `medium_1` and `large_3` in the table (line 36 and line 40, after `ledge: 2.5`):

```js
  medium_1: { file: "Building_Medium_1", width: 13.056, depth: 12.054, height: 27.915, roof: 27.72, rim: 0.2, deck: { minX: 1.25, maxX: 1.3, minZ: 1.25, maxZ: 2.3 }, ledge: 2.5, lean: 0.45 },
  large_3: { file: "Building_Large_3", width: 23.056, depth: 19.058, height: 34.945, roof: 34.8, rim: 0.14, deck: { minX: 1.25, maxX: 1.3, minZ: 1.25, maxZ: 1.3 }, ledge: 2.5, lean: 0.45 },
```

In `buildingPlacements`, under the line `ledge: building.ledge || 0,` (line 170), add `lean: building.lean || 0,`, and **replace** `buildingBoxes` (lines 202 to 208), which now gives each roof the lean of its building:

```js
function buildingBoxes(grid = GRID, layouts = LAYOUTS) {
  return buildingPlacements(grid, layouts).map((placement) => {
    const { minX, maxX, minZ, maxZ } = footprint(placement);
    const inset = placement.deck;
    return { name: placement.name, minX: minX + inset.minX, maxX: maxX - inset.maxX, minZ: minZ + inset.minZ, maxZ: maxZ - inset.maxZ, minY: 0, maxY: placement.roof, lean: placement.lean };
  });
}
```

(The comment above it is the one you have.) Things to notice:

- **The lean is data of the building, as the roof and the ledge are**, and it goes from the building to the box to the ledge to the hang. Nothing else in the code knows about it.
- **It is an average.** The wall is not exactly a slope: it is straight for a while under the roof, and then leans. A body is a vertical thing, so it hangs out as far as the wall is at its feet, and its hands, which are a little further from the wall than the edge, still reach it.

### A place to stand

In `js/plan.js`, under the function `roofSpot` (it ends on line 243), and a blank line, add:

```js
// Where to stand to jump at the ledge of a building in two levels: on its lower roof, a little way from the wall of the upper one on its east
// side, facing it. `placement` is the building, and `roof` is the box of its upper roof (see buildingBoxes).
function ledgeSpot(placement, roof) {
  return { x: roof.maxX + 0.6, y: placement.roof - placement.ledge, z: (roof.minZ + roof.maxZ) / 2, heading: -Math.PI / 2 };
}
```

and add `ledgeSpot` to the two export lists at the bottom of the file (line 317 and line 319), next to `roofSpot`.

In `tests/plan.tests.js`, add two modules directly **above** the module `deckInsets` (line 288):

```js
QUnit.module("lean", () => {
  QUnit.test("the buildings whose walls lean are the ones in two levels, and none leans by more than a body is wide", (assert) => {
    for (const building of Object.values(BUILDINGS)) {
      assert.true((building.lean || 0) >= 0 && (building.lean || 0) < OPTIONS.radius * 2, building.file);
      if (building.lean) assert.true(building.ledge > 0, building.file);
    }
  });

  QUnit.test("each roof box has the lean of its building", (assert) => {
    const placed = buildingPlacements();
    buildingBoxes().forEach((box, i) => assert.strictEqual(box.lean, placed[i].lean, box.name));
    assert.true(buildingBoxes().some((box) => box.lean > 0));
  });
});

QUnit.module("ledgeSpot", () => {
  QUnit.test("it is on the lower roof, beside the wall of the upper one, facing it", (assert) => {
    const placement = { roof: 30, ledge: 2.5 };
    const roof = { minX: 2, maxX: 8, minY: 0, maxY: 30, minZ: -10, maxZ: -4 };
    const spot = ledgeSpot(placement, roof);
    assert.strictEqual(spot.y, 27.5);
    assert.true(spot.x > roof.maxX && spot.x - roof.maxX < 1);
    assert.strictEqual(spot.z, -7);
    assert.true(Math.abs(Math.sin(spot.heading) + 1) < 1e-9, "facing west, at the wall");
  });

  QUnit.test("every building in two levels has a place to stand that is on its lower roof", (assert) => {
    const lower = ledgeBoxes();
    buildingPlacements().forEach((placement, i) => {
      if (!placement.ledge) return;
      const spot = ledgeSpot(placement, buildingBoxes()[i]);
      const under = lower.find((box) => box.name === `${placement.name} ledge` && spot.x > box.minX && spot.x < box.maxX && spot.z > box.minZ && spot.z < box.maxZ);
      assert.notStrictEqual(under, undefined, placement.name);
      assert.strictEqual(under.maxY, spot.y);
    });
  });
});
```

### A way to see them

In `js/debug.js`, three additions, as with the boxes and the names, done from the bottom of the file to the top, so that the line numbers hold. Above the comment `// Plain <script> include` (line 101), the class that draws the lines:

```js
// A line along each ledge, in one colour, drawn over what is in front of it, to see where the ledges are.
class DebugLedges {
  constructor(scene, ledges, color = "#7dff6b") {
    const lines = ledgeLines(ledges).map(([a, b]) => [new BABYLON.Vector3(a.x, a.y, a.z), new BABYLON.Vector3(b.x, b.y, b.z)]);
    this.mesh = BABYLON.MeshBuilder.CreateLineSystem("debug-ledges", { lines }, scene);
    this.mesh.color = BABYLON.Color3.FromHexString(color);
    this.mesh.isPickable = false;
    this.mesh.renderingGroupId = 1;
    this.mesh.setEnabled(false);
  }

  get visible() {
    return this.mesh.isEnabled();
  }

  setVisible(visible) {
    this.mesh.setEnabled(visible);
  }

  dispose() {
    this.mesh.dispose();
  }
}
```

Above the comment `// A name over each box` (line 57), the function that makes the lines:

```js
// The lines of a list of ledges (see ledges.js), as pairs of points a little above each: where a runner's hands go, to see where they are.
function ledgeLines(ledges, lift = 0.05) {
  return ledges.map((ledge) => [
    { x: ledge.ax, y: ledge.y + lift, z: ledge.az },
    { x: ledge.bx, y: ledge.y + lift, z: ledge.bz },
  ]);
}
```

and the comment at the top of the file (lines 1 to 3) is **replaced**:

```js
// Drawing what the game knows but doesn't show: the boxes it uses for walls, the names of the buildings, and the ledges. In developer mode they can
// be drawn over the buildings, to see that they are where the buildings are, and which building is which. The size and place of the mesh
// for a box is plain arithmetic (boxMeshSpec), so it is tested; DebugBoxes and DebugLabels make them in a scene. See ../tests/debug.tests.js.
```

Add `ledgeLines` and `DebugLedges` to the two export lists at the bottom (line 137 and line 139).

In `tests/debug.tests.js`, add a module directly **above** the module `DebugBoxes` (line 31):

```js
QUnit.module("ledgeLines", () => {
  QUnit.test("gives the two ends of each ledge, a little above it", (assert) => {
    const lines = ledgeLines([{ ax: 0, az: 1, bx: 4, bz: 1, y: 10 }], 0.1);
    assert.deepEqual(lines, [[{ x: 0, y: 10.1, z: 1 }, { x: 4, y: 10.1, z: 1 }]]);
  });

  QUnit.test("gives a line for each of the ledges of the district", (assert) => {
    const ledges = ledgesOf(buildingBoxes());
    assert.strictEqual(ledgeLines(ledges).length, ledges.length);
  });
});
```

and this one at the **end** of the file (below line 127):

```js
QUnit.module("DebugLedges", (hooks) => {
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

  const ledges = ledgesOf([{ name: "a", minX: 0, maxX: 4, minY: 0, maxY: 10, minZ: 0, maxZ: 6 }]);

  QUnit.test("makes one mesh of lines for all the ledges, and starts hidden", (assert) => {
    const debug = new DebugLedges(scene, ledges);
    assert.strictEqual(debug.mesh.getTotalVertices(), ledges.length * 2);
    assert.false(debug.visible);
  });

  QUnit.test("setVisible shows and hides it", (assert) => {
    const debug = new DebugLedges(scene, ledges);
    debug.setVisible(true);
    assert.true(debug.visible);
    debug.setVisible(false);
    assert.false(debug.visible);
  });

  QUnit.test("it can't be picked, and dispose takes it away", (assert) => {
    const before = scene.meshes.length;
    const debug = new DebugLedges(scene, ledges);
    assert.false(debug.mesh.isPickable);
    assert.strictEqual(scene.meshes.length, before + 1);
    debug.dispose();
    assert.strictEqual(scene.meshes.length, before);
  });
});
```

Things to notice:

- **The lines are one mesh**, a *line system*, with a line along each ledge, a little above it. They are drawn over what is in front of them (`renderingGroupId`), so that a ledge on the far side of a roof can still be seen.

### The game

Now `js/main.js`. Find the world of the body (lines 109 to 113: the line that makes `ledges`, down to the line that makes the `Controller`). **Delete the lines**, and add these in their place (the lower roofs have a new name, `lowerRoofs`, since `ledges` is now the ledges that can be caught):

```js
  const lowerRoofs = ledgeBoxes();
  const rims = rimBoxes();
  orbit.boxes = [...boxes, ...lowerRoofs];
  const world = new World({ boxes: [...boxes, ...lowerRoofs, ...rims], ground: (x, z) => groundHeight(x, z) });
  // The ledges that can be caught: the top edges of the roofs, and of the lower roofs of the buildings in two levels.
  const ledges = ledgesOf([...boxes, ...lowerRoofs]);
  const body = new Controller({ ...START, world, bounds: districtBounds(), ledges });
```

In the `?dev` block, find the two lines that make the debug boxes and the building names (`const debugBoxes = new DebugBoxes` and `const debugLabels = new DebugLabels`, line 173 and line 174, once you have changed the world above them). The line above them, `let roofNumber = 0;`, **stays**. **Delete the two lines**, and add these in their place:

```js
    let ledgeNumber = 0; // which building the ledge button takes the runner to next
    // The ledges that can be hung from, in the middle: the button for them takes the runner to each in turn, to try them without a jump.
    const hangable = ledges.filter((ledge) => canHang(world, ledge, ledge.length / 2, body.options) && canClimb(world, ledge, ledge.length / 2, body.options));
    let hangNumber = 0;
    const ledgeSpots = buildingPlacements().flatMap((placement, i) => (placement.ledge > 0 ? [ledgeSpot(placement, boxes[i])] : []));
    const debugBoxes = new DebugBoxes(scene, [...boxes, ...lowerRoofs, ...rims]);
    const debugLedges = new DebugLedges(scene, ledges);
    const debugLabels = new DebugLabels(scene, boxes.map((box) => ({ ...box, name: BUILDINGS[box.name].file })));
```

In the developer panel, in the group `Runner`, add these three sliders directly under the one for `step height` (line 214):

```js
            slider("hand reach", body.options, "handReach", 1, 3.5, 0.05),
            slider("shimmy speed", body.options, "shimmySpeed", 0.5, 4, 0.1),
            slider("climb time", body.options, "climbTime", 0.2, 2, 0.01),
```

and these three buttons directly under **Go to a roof** (the button ends on line 221), above **Switch runner**:

```js
            action("Go to a ledge", () => {
              const spot = ledgeSpots[ledgeNumber++ % ledgeSpots.length];
              body.placeAt(spot.x, spot.y + 0.05, spot.z);
              body.heading = spot.heading;
              orbit.yaw = spot.heading;
            }),
            action("Drop to the ledge below", () => body.dropDown()),
            action("Hang from a ledge", () => {
              const ledge = hangable[hangNumber++ % hangable.length];
              body.hangOn(ledge, ledge.length / 2);
              orbit.yaw = body.heading;
            }),
```

- **Go to a ledge** is the jump: it puts the runner on the lower roof of a building in two levels, in front of the wall of the upper one.
- **Drop to the ledge below** is `dropDown`: stand near the edge of a roof, press it, and the runner is lowered over the edge to hang from the ledge there.
- **Hang from a ledge** takes the runner to the middle of each ledge that can be hung from, in turn, without a jump, so that every building can be tried.

In the group `World`, add the switch under the one for `building names` (line 243):

```js
            toggle("ledges", () => debugLedges.visible, (value) => debugLedges.setVisible(value)),
```

and the read-out under the one for `on the ground` (line 248), above the one for `clip`:

```js
            readout("hanging", () => (!body.hang ? "no" : body.hang.climb !== null ? "climbing" : body.hang.moving ? "shimmying" : "yes")),
```

Last, the page's hint line, in `index.html` (line 25), which gets the new use of Space:

```html
  <div class="hint">WASD run &middot; Shift sprint &middot; Space jump (and climb a ledge) &middot; mouse look (click first, Esc lets go) &middot; R restart &middot; C screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Things to notice:

- **Nothing changes in the frame.** `body.update` gets the same direction and the same jump key as before, and does the rest: the body that hangs ignores the running, and reads the keys against the ledge.
- **The ledges are made once**, from the roofs and the lower roofs, and given to the controller. The roofs that have no lower roof under them are caught only from other, lower roofs, or from the air.
- **`Go to a ledge`** takes the runner to the lower roof of a building in two levels, beside the wall of the upper one, facing it. Jump, and the runner catches the ledge two and a half metres up.

### One more test

The test that matters most is in the real district: from the lower roof of each building in two levels, a jump catches the ledge and a climb stands the runner on the roof. Add this at the **end** of `tests/controller.tests.js` (below line 1007):

```js
QUnit.module("Ledges of the district", () => {
  const roofs = buildingBoxes();
  const lowerRoofs = ledgeBoxes();
  const world = new World({ boxes: [...roofs, ...lowerRoofs, ...rimBoxes()], ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...roofs, ...lowerRoofs]);
  const dt = 1 / 60;

  QUnit.test("a runner on the lower roof of a building in two levels can jump at the upper one, catch its ledge and climb it", (assert) => {
    const problems = [];
    buildingPlacements().forEach((placement, i) => {
      if (!placement.ledge) return;
      const spot = ledgeSpot(placement, roofs[i]);
      const body = new Controller({ x: spot.x, y: spot.y, z: spot.z, heading: spot.heading, world, ledges });
      for (let f = 0; f < 60 && !body.hang; f++) body.update(null, false, dt, f < 20);
      if (!body.hang || body.hang.ledge.name !== placement.name) return problems.push(`${placement.name} not caught`);
      body.update({ x: -1, z: 0 }, false, dt);
      for (let f = 0; f < 80; f++) body.update(null, false, dt);
      if (!body.grounded || body.y < placement.roof - 0.01) problems.push(`${placement.name} not climbed: ${body.y}`);
    });
    assert.deepEqual(problems, []);
  });

  QUnit.test("every ledge of the district that can be hung from, in the middle, can be climbed onto the roof", (assert) => {
    const problems = [];
    let hung = 0;
    for (const ledge of ledges) {
      const body = new Controller({ world, ledges });
      const u = ledge.length / 2;
      if (!canHang(world, ledge, u, body.options) || !canClimb(world, ledge, u, body.options)) continue;
      hung++;
      body.hangOn(ledge, u);
      body.update({ x: -ledge.nx, z: -ledge.nz }, false, dt);
      for (let f = 0; f < 80; f++) body.update(null, false, dt);
      if (!body.grounded || body.y < ledge.y - 0.01) problems.push(`${ledge.name} ${ledge.nx},${ledge.nz}`);
    }
    assert.true(hung > 20, "most of the ledges can be hung from");
    assert.deepEqual(problems, []);
  });

  QUnit.test("a runner in the street cannot reach a ledge of any building", (assert) => {
    const body = new Controller({ x: 0, z: -9, world, ledges, bounds: districtBounds() });
    for (let f = 0; f < 120; f++) body.update({ x: 0, z: 1 }, true, dt, f % 30 < 15);
    assert.strictEqual(body.hang, null);
  });
});
```

Open `tests.html`. You should see **400 passing tests**: 12 more.

---

## Step 8: Try it

Serve the page and open it **with `?dev`**.

- [ ] Running and jumping are as before
- [ ] Press **Go to a ledge**. The runner is on a lower roof, in front of a wall that goes up, and facing it. **Press Space**: the runner jumps, **catches the ledge** at the top of the wall, and **hangs** from it, with the **hanging clip**, and the **read-out** says *yes*
- [ ] **A and D** (with the camera looking at the wall) **shimmy** the runner along the ledge, with the **shimmy clips**, left and right, and stop at the ends of it
- [ ] **W** (or **Space**) **climbs**: the **climbing clip** plays, and the runner ends **standing on the roof**, on top of the raised edge, ready to run. (The read-out says *climbing* while it does)
- [ ] **S** lets go: the runner **falls** and lands on the lower roof, and can't catch the ledge again for a moment
- [ ] Walk off the lower roof and jump at the **wall** with the runner turned **away** from it, or from **too far away**, or **too low** (stand on the ground): nothing is caught
- [ ] **Hang from a ledge**, pressed again and again, hangs the runner from the ledge of each building in turn. From each, **W** climbs onto the roof. Look at the runner from the side on a building in two levels (`medium_1`, `large_3`): the **feet are against the sloping wall, not in it**
- [ ] On a roof, walk to the edge and press **Drop to the ledge below**: the runner is lowered over the edge and **hangs**, and **W** climbs back. In the middle of a roof the button does nothing
- [ ] **Ledges** draws a **green line** along the top of each wall of each roof, so that you can see what can be caught
- [ ] **Hand reach** to 3.5, and a ledge that is higher is caught. To 1, and a runner has to jump much higher
- [ ] **Shimmy speed** and **climb time** change how fast they are. (A climb time that is not 0.63 is a climb that doesn't match its clip)
- [ ] **R** and **Back to the start** put the runner back, and **Switch runner** (the other character does the same things)

**If something's wrong**

- **`ReferenceError: findLedge is not defined` or `ledgesOf is not defined`:** the footer of `ledges.js` has to list the names, and `index.html` has to load the file before it is used (the starter's does).
- **The runner never catches a ledge:** `Controller` has to be given `ledges` (the line in `main.js` that makes it), and `_grab` has to be called in `update`. The ledge has to be in reach (`handReach`) and the runner has to be facing the wall, and near it. Switch on **Ledges** to see where they are.
- **The runner catches the ledge as soon as it jumps, and sticks to the wall like a fly:** `grabMaxRise` is how fast a body can still be going up. A jump that leaves the ground at 9 metres a second should not catch a ledge until it is going slower than 6.
- **The runner hangs, but can't be moved:** `_hang` reads the direction against the ledge, and the direction is camera-relative. Turn the camera to look at the wall.
- **The runner falls through the roof after a climb:** the end of the climb has to set `grounded` and the height of what is under the runner (`supportAt`).
- **The runner is stuck hanging, and cannot climb:** `canClimb` says there is no room on top. A wall in the way, or nothing to stand on.

**Experiments** (change one, reload, then change it back):

- **`hangDrop: 1`**: the runner hangs with its feet only a metre under the ledge, and its head above the ledge
- **`grabAngle: 3`**: ledges can be caught from any way round, even facing away from them
- **`ledgeMargin: 0`**: the body can shimmy right to the corner, and its hands are over nothing
- **`shimmySpeed: 6`**: a very fast shimmy, and the clip can't keep up with it
- **`grabCooldown: 0`**: a runner who lets go catches the ledge again at once

---

## Step 9: Tests, all together

Your `tests.html` scripts should look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="js/progress.js"></script>
  <script src="js/splash.js"></script>
  <script src="js/plan.js"></script>
  <script src="js/models.js"></script>
  <script src="js/sky.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/character.js"></script>
  <script src="js/scout.js"></script>
  <script src="js/collision.js"></script>
  <script src="js/ledges.js"></script>
  <script src="js/controller.js"></script>
  <script src="js/debug.js"></script>
  <script src="js/devpanel.js"></script>
  <script src="tests/progress.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
  <script src="tests/plan.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/sky.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/character.tests.js"></script>
  <script src="tests/scout.tests.js"></script>
  <script src="tests/collision.tests.js"></script>
  <script src="tests/ledges.tests.js"></script>
  <script src="tests/controller.tests.js"></script>
  <script src="tests/debug.tests.js"></script>
  <script src="tests/devpanel.tests.js"></script>
```

Open it. You should see **400 passing tests**: the 324 you started with, plus 4 for the numbers, 8 for the ledges of the boxes, 8 for where to hang, 16 for catching a ledge, 25 for the body, 3 for the clips and 12 for the game.

> **What these tests don't cover.** The *feel*: whether a runner should catch a ledge a little earlier or later, whether the hang is the right height under the hands, and how the climb looks. The clips were made for a body against a wall, and the climb is eased by a simple curve. They are first tries, and the sliders in the developer panel are how you find better ones. And `main.js`, the glue, is checked by playing.

> **Try breaking something.** In `ledges.js`, in `findLedge`, take out the line that checks `canClimb`. The test *"it does not catch a ledge it can't hang from, or can't climb"* fails, and the runner, in the game, catches a ledge with a wall over it, and hangs there for ever. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A ledge is a top edge of a box | `ledgesOf` |
| Reach, and the limits of a grab, in a table | `BODY`, `handReach`, `grabDistance`, `grabAngle`, `grabMaxRise` |
| Whether a hand can catch a ledge | `findLedge` |
| Where a body hangs, and where it stands after | `hangSpot`, `topSpot` |
| Room to hang, and room to climb | `canHang`, `canClimb`, `World.push`, `World.supportAt` |
| A state that holds the body | `hang`, `_hang`, `_holdOn` |
| The keys, read against a wall | `into`, `along` |
| Moving along a line, and stopping at its ends | `shimmySpeed`, `clampAlong` |
| A climb as a timer and an ease | `climbTime`, `_hang` |
| Not catching the same ledge again at once | `cooldown`, `grabCooldown` |
| A wall that leans | `lean`, `hangSpot` |
| Lowering yourself over an edge | `findDrop`, `dropDown` |
| Hanging the body from anywhere, for testing | `hangOn`, "Hang from a ledge" |
| Clips for a body against a wall | `clipForBody`, `CLIPS.hang`, `CLIPS.climb` |
| Seeing what the game knows | `DebugLedges`, `ledgeLines` |
| A test that every two-level building can be climbed | "Ledges of the district" |

## Challenges

1. **A key to lower yourself.** `dropDown` is a button of the developer panel. Make it a key of the game (the key *toward* the edge while walking off it is the obvious one, with a moment's wait so that a runner who only runs off an edge falls). (Hint: `update`, and the direction against the ledge.)
2. **Corners.** Shimmy round the corner of a building onto the next side. (Hint: when `u` reaches the end of a ledge, look for another ledge that starts where this one ends.)
3. **A jump from a hang.** Space, with the key pointed away from the wall, jumps off the ledge backwards, and lets go. (Hint: `_hang`, and `jumpSpeed`.)
4. **Fingers that slip.** A hang that can't last for ever: a bar that runs down, after which the runner lets go. (Hint: a number in `hang`, and a slider.)
5. **A sound.** A thud when the hands land on a ledge, scaled by how fast the body was going. (Hint: `vy` before it is set to 0 in `_grab`.)

---

*That's the ledge. A runner can catch the top of a wall, and the roofs of the district are a place to climb. Next they learn the moves between: **vaulting** a low wall, **mantling** a ledge without hanging, a **wall jump**, and a little help for a grab that is nearly right.*
