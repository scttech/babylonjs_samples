# Tutorial: Rooftop Parkour Run -- A Body That Falls, Steps and Lands

This is the second tutorial of the Rooftop Parkour series. The runner of the last step walked on a flat plane and was pushed out of the buildings. In this step the runner gets a **body**: it has weight, so when there is nothing under its feet it **falls**, and it **lands**; it can **stand on the roof of a building**; it steps up a curb and down again without a jump; and it is stopped by a wall that is too high to step on. You also give the developer panel a button that takes the runner **up to a roof**, which is how you will test it, because there is no way to climb up yet. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **world of boxes**: the ground, and a list of solid boxes (the buildings), that can say what is under a place to stand on, and what is a wall to a body
- A **character controller**: a body that is moved by your code, and not by a physics engine, with gravity, a step height, walls, roofs, falls and landings, tested **exactly**
- Animation for it: a **falling** clip while it is in the air, and a **landing** clip, once, after a hard landing
- The **real heights of the roofs**, so that the runner stands on the roof and not in the air above it
- More in the **developer panel**: gravity, step height, a button to **go to a roof**, and read-outs of the height and whether the body is on the ground
- Unit tests for all of it

**What you'll learn:** why a game like this moves its character with code and not with a physics engine, how to ask the world what is under a character's feet and what is in its way, gravity as a number that changes a speed, how to stop a fast fall going through a thin floor, step height and why it makes a curb easy and a wall a wall, how to tell a hard landing from a small drop, one-shot animation clips, and how to test a character exactly by walking it about in a world you build in the test.

## Where you're starting

This folder is a copy of the finished World sample, plus empty placeholders for the new code and its tests:

```
rooftop_parkour_run/
├── index.html, tests.html   (already list the new scripts)
├── css/                     (from the World sample)
├── js/
│   ├── collision.js        (placeholder -- Step 2)
│   ├── controller.js       (placeholder -- Step 3)
│   ├── plan.js             (changes -- Step 1)
│   ├── character.js        (changes -- Step 4)
│   ├── main.js             (changes -- Step 5)
│   ├── debug.js            (changes -- Step 5)
│   └── the rest            (from the World sample)
└── tests/
    ├── collision.tests.js, controller.tests.js   (placeholders)
    ├── plan.tests.js, character.tests.js, debug.tests.js grow   (Steps 1, 4 and 5)
    └── the rest            (from the World sample)
```

### Serving the page

As before, the models can't be loaded from a page opened from a file, so run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rooftop_parkour/rooftop_parkour_run/` (the command prints the exact address), or use the *Live Server* extension in VS Code. Add `?dev` for the developer panel.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the World sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**206**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away. Files that other files depend on end with a short block that exports their names. That way every file is valid JavaScript after every step. Where a step **replaces** something, **delete the old one**: a file with two functions of the same name runs the last.

> **Put new files in this sample's folder.** The two new files go in `rooftop_parkour_run/js/` and `tests/`, **not** in the World sample next door.

---

## Why no physics engine?

Rolling Rampage used Havok, a physics engine: the marble was a body that the engine pushed about, and rolling *is* physics. A person is different. A physics body that stands for a person slides down slopes, sticks to walls, bounces off things, and gets in the way when the character has to do something exact, such as grab a ledge and be moved along it. So in a game of this kind the character is moved **by code**: each frame, the code says where the character wants to go, then asks the world whether it can, and puts it where it should be. That is called a **kinematic** controller. It is a few hundred lines you write yourself, and it means a jump is always exactly as high as you say, and that every part of it can be tested without a screen.

---

## Step 1: A roof to stand on

The plan's boxes come from the heights of the buildings, and a building's height is the top of the **parapet**: the low wall that runs round its roof. The roof itself, where a runner stands, is about 20 centimetres lower. (It was measured from the files, as the sizes were.) A body that is made to stand on the top of the parapet would float in the air over the roof. So the plan gets a second height, and a third: how high the parapet stands above the roof, which is its `rim`. And a footprint is not always all roof, so a building says where its roof is, too. Open `js/plan.js`. Find the comment above `BUILDINGS` (it starts `// The buildings of the kit`) and the table under it, and **delete the old ones**, and add this in their place:

```js
// The buildings of the kit, and how big each is: the width and depth of its footprint, and its height, as measured from the files
// (see assets/README.md). A building has a front, with the windows and the door, which is its +z side as it comes out of its file. `height`
// is the top of the building, which is the top of the low wall (the parapet) that runs round its roof, and `roof` is the roof itself, where a
// runner stands: 20 centimetres lower, which is lower than the step height of a runner, so the parapet is something to step over, not a wall.
// `rim` is how high that raised edge stands above the roof, as measured (the large_2 has none). (The roofs of the kit are not all flat:
// the back of the medium building is a little lower. Later in the series they are measured properly.)
// A footprint is not always all roof. `deck` is how far the roof is in from the edge of the footprint on each side (as the building comes out
// of its file, facing +z; a side that is not given is 0): the small_1 and large_1 have steps at the front that are not part of the roof, and
// the medium_1 and large_3 are in two levels, a smaller roof on top, and a ledge round it, `ledge` metres lower (the ledge is not quite flat:
// this is its middle).
const BUILDINGS = {
  small_1: { file: "Building_Small_1", width: 12.46, depth: 14.536, height: 17.014, roof: 16.8, rim: 0.2, deck: { maxZ: 2 } },
  small_2: { file: "Building_Small_2", width: 20, depth: 12.002, height: 18.999, roof: 18.8, rim: 0.2 },
  medium_1: { file: "Building_Medium_1", width: 13.056, depth: 12.054, height: 27.915, roof: 27.72, rim: 0.2, deck: { minX: 1.25, maxX: 1.3, minZ: 1.25, maxZ: 2.3 }, ledge: 2.5 },
  medium_2: { file: "Building_Medium_2", width: 15.056, depth: 13.056, height: 24.998, roof: 24.8, rim: 0.2 },
  large_1: { file: "Building_Large_1", width: 25.038, depth: 26.028, height: 41, roof: 40.74, rim: 0.26, deck: { maxZ: 1 } },
  large_2: { file: "Building_Large_2", width: 20.644, depth: 16.644, height: 28, roof: 27.8, rim: 0 },
  large_3: { file: "Building_Large_3", width: 23.056, depth: 19.058, height: 34.945, roof: 34.8, rim: 0.14, deck: { minX: 1.25, maxX: 1.3, minZ: 1.25, maxZ: 1.3 }, ledge: 2.5 },
};
```

Things to notice:

- **`roof` is 20 centimetres under `height`.** That is lower than the step height of a runner (40 centimetres, in Step 3), so the parapet is something to step over, and not a wall.
- **`rim` is how high the raised edge round the roof is**, as measured with rays pointing down at the roofs. It is 20 centimetres on most, 26 on the biggest building, 14 on another, and none on the `large_2`. It is **under 40 centimetres too**, which the next step will make something that is stepped onto.
- **`deck` is how far the roof is in from the edge of the footprint**, on each side, seen from the front of the building. The small building has steps down to its door at the front that are not roof, and no runner should be able to stand on them, so its front 2 metres are left out. The two big ones are in **two levels**: a smaller roof on top, and a lower **ledge** round it. `ledge` is how far down the ledge is. (The ledge isn't quite flat. This is its middle.)
- **The roofs of the kit are not all flat.** The back of the medium building is a little lower. They are treated as flat for now, and measured properly in Step 6 of the series, when the roofs are what the game is about.

The placement of each building takes it from its building:

```js
        roof: building.roof,
```

And the same for the rim:

```js
        rim: building.rim,
```

And the roof's place in the footprint, and the ledge:

```js
        deck: deckInsets(building, entry.facing),
        ledge: building.ledge || 0,
```

Add all four lines to the object that `buildingPlacements` pushes, below `height: building.height,`.

Then `buildingBoxes`. Find it (it starts with a comment: `// Every building as a solid box`) and **delete it**, and add this. It has the new `deckInsets`, which turns a building's `deck` the way the building faces, a new `buildingBoxes` that is the **roofs**, `ledgeBoxes`, `rimBoxes`, the raised edges, and `roofSpot`, a place to put the runner on a roof:

```js
// How far the upper roof of a building is in from each side of its footprint, as seen from above (minX is the west side), for the way the
// building faces. The sides are given for a building facing +z, so a building that faces another way has them turned with it.
function deckInsets(building, facing) {
  const none = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  const d = { ...none, ...building.deck };
  if (facing === "south") return { minX: d.maxX, maxX: d.minX, minZ: d.maxZ, maxZ: d.minZ };
  if (facing === "east") return { minX: d.minZ, maxX: d.maxZ, minZ: d.maxX, maxZ: d.minX };
  if (facing === "west") return { minX: d.maxZ, maxX: d.minZ, minZ: d.minX, maxZ: d.maxX };
  return d;
}

// The top roof of a building, as a box: where a runner stands. It is the footprint less the ledge, if the building has one, from the
// ground up to the roof (not to the top of the parapet). Each is { name, minX, maxX, minY, maxY, minZ, maxZ },
// which is what the walls of the scout, the camera and (later) the runner's collisions are made from.
function buildingBoxes(grid = GRID, layouts = LAYOUTS) {
  return buildingPlacements(grid, layouts).map((placement) => {
    const { minX, maxX, minZ, maxZ } = footprint(placement);
    const inset = placement.deck;
    return { name: placement.name, minX: minX + inset.minX, maxX: maxX - inset.maxX, minZ: minZ + inset.minZ, maxZ: maxZ - inset.maxZ, minY: 0, maxY: placement.roof };
  });
}

// The ledge round the upper roof of the buildings that have one: the whole footprint, from the ground up to the ledge.
function ledgeBoxes(grid = GRID, layouts = LAYOUTS) {
  return buildingPlacements(grid, layouts)
    .filter((placement) => placement.ledge > 0)
    .map((placement) => ({ name: `${placement.name} ledge`, ...footprint(placement), minY: 0, maxY: placement.roof - placement.ledge }));
}

// How wide the raised edge round a roof is, in metres.
const RIM_WIDTH = 1;

// The raised edge round each roof, as four boxes a building (the same kind of box as above, named "<building> rim"), from the ground up to
// the top of the edge. A runner steps onto it, which is lower than a step, and so their feet are on the edge and not sunk into it.
function rimBoxes(grid = GRID, layouts = LAYOUTS) {
  const boxes = [];
  const roofs = buildingBoxes(grid, layouts);
  for (const [i, placement] of buildingPlacements(grid, layouts).entries()) {
    if (!placement.rim) continue;
    const { minX, maxX, minZ, maxZ } = roofs[i];
    const rim = { name: `${placement.name} rim`, minY: 0, maxY: placement.roof + placement.rim };
    boxes.push(
      { ...rim, minX, maxX, minZ, maxZ: minZ + RIM_WIDTH },
      { ...rim, minX, maxX, minZ: maxZ - RIM_WIDTH, maxZ },
      { ...rim, minX, maxX: minX + RIM_WIDTH, minZ: minZ + RIM_WIDTH, maxZ: maxZ - RIM_WIDTH },
      { ...rim, minX: maxX - RIM_WIDTH, maxX, minZ: minZ + RIM_WIDTH, maxZ: maxZ - RIM_WIDTH }
    );
  }
  return boxes;
}

// Where to stand on the roof of a building: the middle of the roof, at the height of its top. It is for putting the runner on a roof
// (from the developer panel), until there is a way to climb up.
function roofSpot(box) {
  return { x: (box.minX + box.maxX) / 2, y: box.maxY, z: (box.minZ + box.maxZ) / 2 };
}
```

Things to notice:

- **A box is as high as the roof, not as the parapet.** It is what a body stands on, and what it walks into. It is the roof and not the whole footprint, so that a runner who walks off the front of the small building is in the air, and not walking on air.
- **`deckInsets` turns a building's sides with the building.** They are given for a building that faces +z, and a building that faces south has its front on the other side. The east and west turns are the quarter turns of the same idea.
- **`ledgeBoxes` are the lower level.** The whole footprint, from the ground up to the ledge. A runner at the edge of the upper roof who walks off falls two and a half metres, and lands on the ledge, and not on the street.
- **`rimBoxes` are the raised edges, as boxes.** A box that stopped at the roof would let the runner's feet stay at the roof while the edge stood 20 centimetres above them, and the feet would sink into it. Each building with a rim gets four thin boxes (a metre wide) along its four sides, from the ground to the top of the edge. The runner will step onto them, and their feet will be on the edge. They are only for the body: the camera uses the roof boxes.
- **`roofSpot(box)` is the middle of a roof**, at the height of its top. The developer panel will take the runner there.

Add `roofSpot`, `deckInsets`, `ledgeBoxes`, `RIM_WIDTH` and `rimBoxes` to the two export lists at the bottom of `plan.js` (the `module.exports` and the `Object.assign(window, ...)`): `roofSpot` next to `groundHeight`, `deckInsets` before `buildingBoxes`, and `ledgeBoxes`, `RIM_WIDTH` and `rimBoxes` after it.

### Tests

In `tests/plan.tests.js`, find the test *"buildingBoxes are the footprints"*. It compared the box with the footprint and with `placed[i].height`. **Delete it**, since a box is now the roof, which is inside the footprint and as high as the roof, and add the tests below in its place:

```js
  QUnit.test("the roof of a building is a little under its top: lower than a runner can step, so the parapet round it is stepped over", (assert) => {
    for (const building of Object.values(BUILDINGS)) {
      assert.true(building.roof < building.height && building.height - building.roof < 0.4, building.file);
    }
  });

  QUnit.test("buildingBoxes are the roofs, from the ground up to the roof (not to the top of the parapet), inside the footprints", (assert) => {
    const boxes = buildingBoxes(GRID, LAYOUTS);
    const placed = buildingPlacements(GRID, LAYOUTS);
    assert.strictEqual(boxes.length, placed.length);
    boxes.forEach((box, i) => {
      const inside = footprint(placed[i]);
      assert.deepEqual([box.minY, box.maxY], [0, placed[i].roof]);
      assert.true(box.minX >= inside.minX && box.maxX <= inside.maxX && box.minZ >= inside.minZ && box.maxZ <= inside.maxZ, box.name);
      assert.true(box.maxX > box.minX && box.maxZ > box.minZ, box.name);
    });
  });

  QUnit.test("a building with no deck is a roof as wide as its footprint", (assert) => {
    const boxes = buildingBoxes(GRID, LAYOUTS);
    buildingPlacements(GRID, LAYOUTS).forEach((placement, i) => {
      if (BUILDINGS[placement.name].deck) return;
      const inside = footprint(placement);
      assert.deepEqual([boxes[i].minX, boxes[i].maxX, boxes[i].minZ, boxes[i].maxZ], [inside.minX, inside.maxX, inside.minZ, inside.maxZ]);
    });
  });

  QUnit.test("the roof of a building with steps at the front stops before them, whichever way the building faces", (assert) => {
    const boxes = buildingBoxes(GRID, LAYOUTS);
    buildingPlacements(GRID, LAYOUTS).forEach((placement, i) => {
      if (placement.name !== "small_1") return;
      const inside = footprint(placement);
      const missing = placement.facing === "north" ? inside.maxZ - boxes[i].maxZ : boxes[i].minZ - inside.minZ;
      assert.true(Math.abs(missing - BUILDINGS.small_1.deck.maxZ) < 1e-9, placement.facing);
    });
  });

  QUnit.test("ledgeBoxes are the footprints of the buildings in two levels, from the ground up to the ledge", (assert) => {
    const ledges = ledgeBoxes(GRID, LAYOUTS);
    const placed = buildingPlacements(GRID, LAYOUTS).filter((placement) => placement.ledge > 0);
    assert.true(placed.length > 0);
    assert.strictEqual(ledges.length, placed.length);
    placed.forEach((placement, i) => {
      assert.strictEqual(ledges[i].name, `${placement.name} ledge`);
      assert.true(Math.abs(ledges[i].maxY - (placement.roof - placement.ledge)) < 1e-9);
      assert.deepEqual([ledges[i].minX, ledges[i].maxX], [footprint(placement).minX, footprint(placement).maxX]);
    });
  });

  QUnit.test("a ledge is lower than the roof by more than a runner can step, or it would not be a ledge", (assert) => {
    for (const building of Object.values(BUILDINGS)) {
      if (building.ledge) assert.true(building.ledge > 0.4, building.file);
    }
  });

  QUnit.test("rimBoxes are four boxes round the roof of each building that has a raised edge, as high as the edge", (assert) => {
    const rims = rimBoxes(GRID, LAYOUTS);
    const placed = buildingPlacements(GRID, LAYOUTS).filter((placement) => placement.rim > 0);
    assert.strictEqual(rims.length, placed.length * 4);
    placed.forEach((placement, i) => {
      const inside = footprint(placement);
      for (const rim of rims.slice(i * 4, i * 4 + 4)) {
        assert.strictEqual(rim.name, `${placement.name} rim`);
        assert.true(Math.abs(rim.maxY - (placement.roof + placement.rim)) < 1e-9);
        assert.true(rim.minX >= inside.minX - 1e-9 && rim.maxX <= inside.maxX + 1e-9 && rim.minZ >= inside.minZ - 1e-9 && rim.maxZ <= inside.maxZ + 1e-9);
        assert.true(rim.maxX - rim.minX > 0 && rim.maxZ - rim.minZ > 0);
      }
    });
  });

  QUnit.test("the raised edge of a roof is lower than a runner can step, so it is stepped onto and not a wall", (assert) => {
    for (const building of Object.values(BUILDINGS)) {
      assert.true(building.rim >= 0 && building.rim < 0.4, building.file);
    }
  });
```

(That includes new tests, about the roofs, the ledges and the raised edges, and the changed one. Keep the other tests in the module as they were.) And add two new modules, directly **above** the module `piecesUsed`:

```js
QUnit.module("deckInsets", () => {
  const building = { deck: { minX: 1, maxX: 2, minZ: 3, maxZ: 4 } };

  QUnit.test("a building with no deck has none to leave out", (assert) => {
    assert.deepEqual(deckInsets({}, "north"), { minX: 0, maxX: 0, minZ: 0, maxZ: 0 });
  });

  QUnit.test("a side that is not given is 0", (assert) => {
    assert.deepEqual(deckInsets({ deck: { maxZ: 2 } }, "north"), { minX: 0, maxX: 0, minZ: 0, maxZ: 2 });
  });

  QUnit.test("a building that faces north has them as they are", (assert) => {
    assert.deepEqual(deckInsets(building, "north"), { minX: 1, maxX: 2, minZ: 3, maxZ: 4 });
  });

  QUnit.test("a building that faces south has them turned half way round", (assert) => {
    assert.deepEqual(deckInsets(building, "south"), { minX: 2, maxX: 1, minZ: 4, maxZ: 3 });
  });

  QUnit.test("a building that faces east has its front on the east side, and one that faces west on the west side", (assert) => {
    assert.strictEqual(deckInsets(building, "east").maxX, 4);
    assert.strictEqual(deckInsets(building, "west").minX, 4);
  });

  QUnit.test("turned all the way round, they add up to the same", (assert) => {
    for (const facing of ["north", "east", "south", "west"]) {
      const d = deckInsets(building, facing);
      assert.strictEqual(d.minX + d.maxX + d.minZ + d.maxZ, 10, facing);
    }
  });
});

QUnit.module("roofSpot", () => {
  QUnit.test("is the middle of the roof, at the height of the roof", (assert) => {
    assert.deepEqual(roofSpot({ minX: 2, maxX: 8, minY: 0, maxY: 17, minZ: -10, maxZ: -4 }), { x: 5, y: 17, z: -7 });
  });

  QUnit.test("is inside the box of every building, at its top", (assert) => {
    for (const box of buildingBoxes()) {
      const spot = roofSpot(box);
      assert.true(spot.x > box.minX && spot.x < box.maxX && spot.z > box.minZ && spot.z < box.maxZ && spot.y === box.maxY, box.name);
    }
  });
});
```

Open `tests.html`. You should see **221 passing tests**: 15 more.

---

## Step 2: What is under, and what is in the way

A body in the world has two questions to ask. *What is there to stand on, under me?* and *Is anything in my way, beside me?* Both are plain arithmetic on a list of boxes. Open the placeholder `js/collision.js` and replace its contents with:

```js
// The world as the runner's body meets it: the ground, and a list of solid boxes (the buildings). Two questions are asked of it. What is
// there to stand on under a place (supportAt)? And what is in the way of a body moving along (push)? Both are plain arithmetic on boxes, with
// no Babylon.js and no page, so they are tested exactly. A box is { minX, maxX, minY, maxY, minZ, maxZ }, as the plan makes them. See
// ../tests/collision.tests.js.

class World {
  // `boxes` are the solid things, and `ground` says how high the ground is at a place (x, z). It is what is under everything: the road,
  // the sidewalk, and the floor of an alley.
  constructor({ boxes = [], ground = () => 0 } = {}) {
    this.boxes = boxes;
    this.ground = ground;
  }

  // The height of the highest thing to stand on at (x, z) that is at or below `topY`: the top of a box that the place is over (to within
  // `reach` of its edge, so that standing with only a heel over the edge still holds), or the ground. A box whose top is above `topY` is
  // not under the feet, it is beside them or over them, and is not counted. With a `topY` of Infinity it is the highest of all.
  supportAt(x, z, reach, topY) {
    let best = this.ground(x, z);
    for (const box of this.boxes) {
      if (box.maxY > topY || box.maxY <= best) continue;
      if (x < box.minX - reach || x > box.maxX + reach || z < box.minZ - reach || z > box.maxZ + reach) continue;
      best = box.maxY;
    }
    return best;
  }

  // The boxes that are walls to a body whose feet are at height `y` and that is `height` tall: those that reach up higher than the body can
  // step (`stepHeight`) and that start below its head. A box whose top is only a step above the feet is something to climb onto, not a wall,
  // and a box that is all above the head is something to walk under.
  wallsAt(y, height, stepHeight) {
    return this.boxes.filter((box) => box.maxY > y + stepHeight && box.minY < y + height);
  }

  // Pushes a body out of the walls, as a circle of `radius` on the ground at (x, z): where it should be, { x, z }. It takes two passes, so
  // that being pushed out of one wall doesn't leave it in the next.
  push(x, z, radius, y, height, stepHeight) {
    const walls = this.wallsAt(y, height, stepHeight);
    let at = { x, z };
    for (let pass = 0; pass < 2; pass++) {
      for (const wall of walls) at = pushOutOfBox(at.x, at.z, radius, wall);
    }
    return at;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { World };
} else {
  window.World = World;
}
```

Things to notice:

- **`supportAt(x, z, reach, topY)` is the height of what is under a place**: the highest of the ground and the tops of the boxes the place is over. The `topY` is the key to it. A box whose top is **above** it is not under the feet: it is beside them, or over them. So `topY` is "the highest thing I could be standing on", and a body asks it with a height just above its feet.
- **`reach` lets a heel hang over an edge.** The middle of the body only has to be within `reach` of the edge of a roof for the roof to hold it. Without it, a runner whose toes are on the edge is already falling, and feels as if they have stepped off a cliff on a ledge that was still under their foot.
- **`wallsAt(y, height, stepHeight)` are the boxes that are walls to a body** at a height: those that reach higher than the body can step, and that start below its head. A box whose top is only a step above the feet is something to **climb onto**, and a box that is all above the head is something to **walk under**. And a body that is standing on a roof is not stopped by the building it is standing on, because that building's top is not above its feet.
- **`push` moves a body out of the walls.** It takes the circle that is the runner's body, and uses `pushOutOfBox` from the scout of the last step, twice, so that being pushed out of one wall doesn't leave it in the next.
- **The world knows nothing about runners.** It is a list of boxes and a function for the ground. That is why a test can build one in two lines.

### Tests

`tests.html` already has the script and the tests of this step. Open the placeholder `tests/collision.tests.js` and replace its contents with:

```js
QUnit.module("World.supportAt", () => {
  const roof = { minX: 0, maxX: 10, minY: 0, maxY: 20, minZ: 0, maxZ: 10 };
  const step = { minX: 20, maxX: 22, minY: 0, maxY: 0.3, minZ: 0, maxZ: 2 };

  QUnit.test("with no boxes, it is the ground", (assert) => {
    assert.strictEqual(new World({ ground: () => -0.15 }).supportAt(3, 4, 0.25, 100), -0.15);
    assert.strictEqual(new World().supportAt(3, 4, 0.25, 100), 0);
  });

  QUnit.test("over a box, it is the top of the box", (assert) => {
    assert.strictEqual(new World({ boxes: [roof] }).supportAt(5, 5, 0.25, 100), 20);
  });

  QUnit.test("beside a box, it is the ground", (assert) => {
    assert.strictEqual(new World({ boxes: [roof] }).supportAt(15, 5, 0.25, 100), 0);
  });

  QUnit.test("a box whose top is above where the feet are is not under them", (assert) => {
    const world = new World({ boxes: [roof] });
    assert.strictEqual(world.supportAt(5, 5, 0.25, 10), 0);
    assert.strictEqual(world.supportAt(5, 5, 0.25, 20), 20);
  });

  QUnit.test("of several boxes at the same place, it is the highest that is not above", (assert) => {
    const low = { ...roof, maxY: 5 };
    const world = new World({ boxes: [roof, low] });
    assert.strictEqual(world.supportAt(5, 5, 0.25, 100), 20);
    assert.strictEqual(world.supportAt(5, 5, 0.25, 10), 5);
  });

  QUnit.test("a place a little past the edge is still held up, by as much as the reach", (assert) => {
    const world = new World({ boxes: [roof] });
    assert.strictEqual(world.supportAt(10.2, 5, 0.25, 100), 20);
    assert.strictEqual(world.supportAt(10.3, 5, 0.25, 100), 0);
  });

  QUnit.test("the ground can be higher than a box (a box sunk in it) and then it is the ground", (assert) => {
    const world = new World({ boxes: [step], ground: () => 1 });
    assert.strictEqual(world.supportAt(21, 1, 0.25, 100), 1);
  });

  QUnit.test("with a top of Infinity, it is the highest thing there is", (assert) => {
    assert.strictEqual(new World({ boxes: [roof] }).supportAt(5, 5, 0.25, Infinity), 20);
  });

  QUnit.test("the ground can change from place to place", (assert) => {
    const world = new World({ ground: (x) => (x > 0 ? 0 : -0.15) });
    assert.strictEqual(world.supportAt(-1, 0, 0.25, 10), -0.15);
    assert.strictEqual(world.supportAt(1, 0, 0.25, 10), 0);
  });
});

QUnit.module("World.wallsAt", () => {
  const tower = { name: "tower", minX: 0, maxX: 10, minY: 0, maxY: 20, minZ: 0, maxZ: 10 };
  const curb = { name: "curb", minX: 20, maxX: 22, minY: 0, maxY: 0.3, minZ: 0, maxZ: 2 };
  const bridge = { name: "bridge", minX: 30, maxX: 40, minY: 10, maxY: 12, minZ: 0, maxZ: 5 };
  const world = new World({ boxes: [tower, curb, bridge] });
  const names = (list) => list.map((box) => box.name);

  QUnit.test("a tall box is a wall to a body on the ground", (assert) => {
    assert.deepEqual(names(world.wallsAt(0, 1.8, 0.4)), ["tower"]);
  });

  QUnit.test("a box that is only a step high is not a wall: it is a step", (assert) => {
    assert.false(names(world.wallsAt(0, 1.8, 0.4)).includes("curb"));
    assert.true(names(world.wallsAt(0, 1.8, 0.2)).includes("curb"));
  });

  QUnit.test("a box that is all above the head is not a wall: it can be walked under", (assert) => {
    assert.false(names(world.wallsAt(0, 1.8, 0.4)).includes("bridge"));
    assert.true(names(world.wallsAt(9, 1.8, 0.4)).includes("bridge"));
  });

  QUnit.test("a body on the roof is not stopped by the building it is standing on", (assert) => {
    assert.deepEqual(names(world.wallsAt(20, 1.8, 0.4)), []);
  });

  QUnit.test("a body a little under the roof is a wall to it again", (assert) => {
    assert.deepEqual(names(world.wallsAt(19.5, 1.8, 0.4)), ["tower"]);
  });
});

QUnit.module("World.push", () => {
  const tower = { minX: 0, maxX: 10, minY: 0, maxY: 20, minZ: 0, maxZ: 10 };
  const world = new World({ boxes: [tower] });

  QUnit.test("a body that touches no wall is where it was", (assert) => {
    assert.deepEqual(world.push(-5, 5, 0.45, 0, 1.8, 0.4), { x: -5, z: 5 });
  });

  QUnit.test("a body in a wall is pushed out of it, the way it came", (assert) => {
    const out = world.push(-0.2, 5, 0.45, 0, 1.8, 0.4);
    assert.true(Math.abs(out.x - -0.45) < 1e-9);
    assert.strictEqual(out.z, 5);
  });

  QUnit.test("a body on the roof goes where it likes", (assert) => {
    assert.deepEqual(world.push(5, 5, 0.45, 20, 1.8, 0.4), { x: 5, z: 5 });
  });

  QUnit.test("a body is pushed out of two walls, one after the other", (assert) => {
    const two = new World({ boxes: [tower, { minX: -4, maxX: -1.2, minY: 0, maxY: 20, minZ: 0, maxZ: 10 }] });
    const out = two.push(-0.9, 5, 0.45, 0, 1.8, 0.4);
    // squeezed between two walls with 0.2 to spare for a body 0.9 wide, it ends in one of them, and not in neither: the second pass settles it
    const nearest = (box) => Math.hypot(out.x - Math.min(box.maxX, Math.max(box.minX, out.x)), out.z - Math.min(box.maxZ, Math.max(box.minZ, out.z)));
    assert.true(Math.min(nearest(two.boxes[0]), nearest(two.boxes[1])) > 0.45 - 1e-9);
  });
});
```

Things to notice:

- **`supportAt` is tested for what it should *not* find**: a box beside the place, a box whose top is above the feet, a box a little too far from the edge. They are the cases that would put a runner in the air, or in a wall.
- **`wallsAt` is tested with a curb, a tower and a bridge**: a tall box is a wall, a curb isn't, a bridge over your head isn't (until you are as high as it).

Open `tests.html`. You should see **239 passing tests**: 18 more.

---

## Step 3: The body

Now the body itself. Every frame it is told which way the keys ask it to go, and it works out where it ends up. Open the placeholder `js/controller.js` and replace its contents with:

```js
// The character controller: a runner's body that is moved by code and not by a physics engine. Each frame it is told which way the keys
// ask it to go, and it works out where it ends up: running along the ground at a speed it builds up to, turning to face the way it goes,
// stepping up a curb and down again, stopped by walls, standing on the roof of a building, and, when there is nothing under its feet,
// falling. Everything is plain arithmetic on a World (see collision.js), so a jump from this speed onto that roof is a thing a test can say.
// See ../tests/controller.tests.js.

// The body, and the world's pull on it. Metres and seconds.
const BODY = {
  height: 1.8, // how tall the runner is, for walls above their head
  stepHeight: 0.4, // the highest step they can go up without jumping: a curb, a low wall, a stair
  supportReach: 0.25, // how far past the edge of something the middle of the runner can be, and still stand on it
  snapDown: 0.35, // the biggest drop the feet follow without falling: a step down is walked, a bigger drop is a fall
  gravity: 30, // how much faster a fall gets each second: more than the real 9.8, as a game wants
  terminalSpeed: 50, // the fastest a fall gets
  hardLanding: 7, // how fast a fall has to be, on landing, for the landing to be felt (about 0.8 metres of fall)
  landTime: 0.4, // how long a hard landing lasts, in seconds, before the runner is free to run again
};

class Controller {
  // `world` is a World. `bounds` is the edge of the world: { minX, maxX, minZ, maxZ }. The runner starts on whatever is at (x, z), the highest
  // thing there if `y` isn't given.
  constructor({ x = 0, y = null, z = 0, heading = 0, world, bounds = null, options = {} } = {}) {
    this.world = world;
    this.bounds = bounds;
    this.options = { ...SCOUT, ...BODY, ...options };
    this.x = x;
    this.z = z;
    this.y = y === null ? world.supportAt(x, z, this.options.supportReach, Infinity) : y;
    this.heading = heading; // the way the body faces, as a yaw
    this.speed = 0; // how fast it is going along the ground
    this.vy = 0; // how fast it is going up (negative is down)
    this.grounded = true;
    this.landing = 0; // seconds left of a hard landing
    this.impact = 0; // how fast the last fall was, when it landed
    this.start = { x, z, heading, y: this.y };
  }

  // Moves on by `dt` seconds. `direction` is where the keys ask to go (or null) and `sprint` whether they ask to go fast.
  update(direction, sprint, dt) {
    const o = this.options;
    this.landing = Math.max(0, this.landing - dt);

    // Along the ground: build up to the speed asked for (or slow to a stop), face the way it goes, and go the way it faces. A runner who is
    // in the air keeps the way they were going: they can't speed up or stop in mid air, but they can still steer a little.
    const wanted = direction ? (sprint ? o.sprintSpeed : o.jogSpeed) : 0;
    const control = this.grounded ? 1 : 0.35;
    const change = o.acceleration * control * dt;
    this.speed = Math.abs(wanted - this.speed) <= change ? wanted : this.speed + Math.sign(wanted - this.speed) * change;
    if (direction) this.heading = turnToward(this.heading, Math.atan2(direction.x, direction.z), o.turnRate * dt);
    const moved = this.world.push(
      this.x + Math.sin(this.heading) * this.speed * dt,
      this.z + Math.cos(this.heading) * this.speed * dt,
      o.radius,
      this.y,
      o.height,
      o.stepHeight
    );
    this.x = moved.x;
    this.z = moved.z;
    if (this.bounds) {
      this.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, this.x));
      this.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, this.z));
    }

    // Up and down.
    if (this.grounded) this._walk(dt);
    if (!this.grounded) this._fall(dt);
  }

  // On the ground: the feet follow whatever is under them, a share of the way each frame (so that a curb is a quick step and not a jump). A
  // drop of more than snapDown is not followed: there is nothing under the feet, and the runner begins to fall.
  _walk(dt) {
    const o = this.options;
    const support = this.world.supportAt(this.x, this.z, o.supportReach, this.y + o.stepHeight);
    if (support < this.y - o.snapDown) {
      this.grounded = false;
      this.vy = 0;
      return;
    }
    this.y += (support - this.y) * (1 - Math.exp(-o.stepRate * dt));
  }

  // In the air: gravity speeds the fall, and the feet are moved down. If they have gone through something that was under them, they stand on it:
  // the highest thing under where they were (and a step above, so that a runner who falls with the edge of a curb at their feet is put on it).
  _fall(dt) {
    const o = this.options;
    const before = this.y;
    this.vy = Math.max(-o.terminalSpeed, this.vy - o.gravity * dt);
    this.y += this.vy * dt;
    if (this.vy > 0) return; // going up: nothing can be landed on
    const support = this.world.supportAt(this.x, this.z, o.supportReach, before + o.stepHeight);
    if (this.y <= support) {
      this.impact = -this.vy;
      this.y = support;
      this.vy = 0;
      this.grounded = true;
      if (this.impact >= o.hardLanding) this.landing = o.landTime;
    }
  }

  // Back to where it began.
  reset() {
    Object.assign(this, this.start, { speed: 0, vy: 0, grounded: true, landing: 0, impact: 0 });
  }

  // Puts it somewhere else, standing still, in the air: it falls from there (or lands, if there is something right under it).
  placeAt(x, y, z) {
    Object.assign(this, { x, y, z, speed: 0, vy: 0, grounded: false, landing: 0 });
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BODY, Controller };
} else {
  Object.assign(window, { BODY, Controller });
}
```

Things to notice:

- **`BODY` is a table of numbers**, each with a comment: how tall, how high a step, how far past an edge, how much of a drop is walked and not fallen, gravity, the fastest fall, how hard a landing has to be to be felt. The controller copies them (with the speeds from `SCOUT`), so the developer panel can change one without changing the defaults.
- **On the ground, `_walk`**: the feet follow what is under them (`supportAt`, asked with a height a step above the feet, so a curb counts and the top of a building doesn't). They follow it a share of the way each frame, so that a curb is a quick step and not a jump. If what is under them is **more than `snapDown` lower**, there is nothing under them: the body starts to fall. A drop smaller than that is walked down.
- **In the air, `_fall`**: gravity changes the vertical speed (`vy`) by `gravity` each second, up to a `terminalSpeed`, and the speed moves the feet. Then it asks whether the feet have gone through something that was under them: the highest thing at or under *where they were* (and a step above, so that a body whose feet pass a curb as it falls is put on it and not in it). If they have, the body **lands**: it stands on that, its vertical speed is 0, and `impact` says how fast it was falling.
- **That is also why a fast fall can't go through a thin floor.** The check is not "is it inside the box now?" (a fast fall could be past the box) but "has it gone through what was under it?", which is true however far it went in one frame.
- **A hard landing holds the runner for a moment** (`landing`, a number of seconds that counts down): that is the time to play the landing clip. A small drop isn't felt.
- **In the air the body keeps its way** (`control` is 0.35): it can steer a little, but it can't stop or speed up as it could on the ground.
- **`placeAt(x, y, z)` puts the body somewhere**, in the air, and still. It falls from there, or lands if there is something under it. It is how the developer panel takes the runner to a roof, and how the tests put it on one.
- **A body stands on a roof for the same reason it stands on the ground.** It has no idea which is which. A roof is a box whose top is under its feet.

### Tests

`tests.html` has this step's tests in it already. Open the placeholder `tests/controller.tests.js` and replace its contents with:

```js
QUnit.module("Controller on the ground", () => {
  const north = { x: 0, z: 1 };
  const flat = () => new World({ ground: () => 0 });

  QUnit.test("starts standing on the ground, still", (assert) => {
    const body = new Controller({ world: flat() });
    assert.true(body.grounded);
    assert.deepEqual([body.y, body.speed, body.vy], [0, 0, 0]);
  });

  QUnit.test("starts on the highest thing at its place, unless it is told a height", (assert) => {
    const roof = { minX: -5, maxX: 5, minY: 0, maxY: 20, minZ: -5, maxZ: 5 };
    assert.strictEqual(new Controller({ world: new World({ boxes: [roof] }) }).y, 20);
    assert.strictEqual(new Controller({ world: new World({ boxes: [roof] }), y: 3 }).y, 3);
  });

  QUnit.test("gets up to speed gradually, and not past it, and sprints faster", (assert) => {
    const body = new Controller({ world: flat() });
    body.update(north, false, 0.05);
    assert.true(body.speed > 0 && body.speed < body.options.jogSpeed);
    for (let i = 0; i < 100; i++) body.update(north, false, 0.05);
    assert.strictEqual(body.speed, body.options.jogSpeed);
    for (let i = 0; i < 100; i++) body.update(north, true, 0.05);
    assert.strictEqual(body.speed, body.options.sprintSpeed);
  });

  QUnit.test("stops when the keys are let go", (assert) => {
    const body = new Controller({ world: flat() });
    for (let i = 0; i < 100; i++) body.update(north, false, 0.05);
    for (let i = 0; i < 100; i++) body.update(null, false, 0.05);
    assert.strictEqual(body.speed, 0);
  });

  QUnit.test("turns to face the way it goes, and goes the way it faces", (assert) => {
    const body = new Controller({ world: flat() });
    for (let i = 0; i < 200; i++) body.update({ x: 1, z: 0 }, false, 0.02);
    assert.true(Math.abs(body.heading - Math.PI / 2) < 1e-9);
    assert.true(body.x > 5);
  });

  QUnit.test("can't walk into a wall", (assert) => {
    const wall = { minX: -5, maxX: 5, minY: 0, maxY: 10, minZ: 3, maxZ: 8 };
    const body = new Controller({ world: new World({ boxes: [wall] }) });
    for (let i = 0; i < 300; i++) body.update(north, true, 0.02);
    assert.true(body.z <= wall.minZ - body.options.radius + 1e-9);
    assert.true(body.z > 2);
  });

  QUnit.test("can't leave the world", (assert) => {
    const body = new Controller({ world: flat(), bounds: { minX: -10, maxX: 10, minZ: -10, maxZ: 10 } });
    for (let i = 0; i < 300; i++) body.update(north, true, 0.02);
    assert.strictEqual(body.z, 10);
  });

  QUnit.test("its numbers can be changed without changing the defaults", (assert) => {
    const before = BODY.gravity;
    const a = new Controller({ world: flat() });
    const b = new Controller({ world: flat() });
    a.options.gravity = 99;
    assert.strictEqual(b.options.gravity, before);
    assert.strictEqual(BODY.gravity, before);
  });
});

QUnit.module("Controller steps", () => {
  const north = { x: 0, z: 1 };
  const walk = (body, frames, direction = north) => {
    for (let i = 0; i < frames; i++) body.update(direction, false, 1 / 60);
  };

  QUnit.test("it walks up a low step, and stands on it", (assert) => {
    const step = { minX: -5, maxX: 5, minY: 0, maxY: 0.3, minZ: 3, maxZ: 8 };
    const body = new Controller({ world: new World({ boxes: [step] }) });
    walk(body, 75); // far enough to be on it, and not so far as to be off the other side
    assert.true(body.grounded);
    assert.true(Math.abs(body.y - 0.3) < 1e-3);
    assert.true(body.z > 3);
  });

  QUnit.test("a step higher than the step height is a wall", (assert) => {
    const wall = { minX: -5, maxX: 5, minY: 0, maxY: 0.6, minZ: 3, maxZ: 8 };
    const body = new Controller({ world: new World({ boxes: [wall] }) });
    walk(body, 240);
    assert.true(body.y < 0.01);
    assert.true(body.z <= 3 - body.options.radius + 1e-6);
  });

  QUnit.test("the step height can be changed", (assert) => {
    const wall = { minX: -5, maxX: 5, minY: 0, maxY: 0.6, minZ: 3, maxZ: 8 };
    const body = new Controller({ world: new World({ boxes: [wall] }), options: { stepHeight: 0.8 } });
    walk(body, 75);
    assert.true(Math.abs(body.y - 0.6) < 1e-3);
  });

  QUnit.test("it walks down a small drop without falling", (assert) => {
    const world = new World({ ground: (x, z) => (z > 3 ? -0.2 : 0) });
    const body = new Controller({ world });
    let fell = false;
    for (let i = 0; i < 240; i++) {
      body.update(north, false, 1 / 60);
      if (!body.grounded) fell = true;
    }
    assert.false(fell);
    assert.true(Math.abs(body.y + 0.2) < 1e-3);
  });

  QUnit.test("its feet follow a step quickly, but not at once", (assert) => {
    const body = new Controller({ world: new World({ ground: () => 1 }), y: 0.8 });
    body.update(null, false, 0.01);
    assert.true(body.y > 0.8 && body.y < 1);
  });
});

QUnit.module("Controller falls", () => {
  const roof = { minX: -5, maxX: 5, minY: 0, maxY: 20, minZ: -5, maxZ: 5 };
  const north = { x: 0, z: 1 };

  QUnit.test("a runner in the air falls, faster and faster, and lands on the ground", (assert) => {
    const body = new Controller({ world: new World({ ground: () => 0 }) });
    body.placeAt(0, 10, 0);
    const speeds = [];
    for (let i = 0; i < 300 && !body.grounded; i++) {
      body.update(null, false, 1 / 60);
      speeds.push(body.vy);
    }
    assert.true(body.grounded);
    assert.strictEqual(body.y, 0);
    assert.strictEqual(body.vy, 0);
    assert.true(speeds[10] < speeds[1]);
  });

  QUnit.test("it takes as long to fall as gravity says: about the square root of twice the height over gravity", (assert) => {
    const body = new Controller({ world: new World(), options: { terminalSpeed: 1000 } });
    body.placeAt(0, 4.5, 0);
    let time = 0;
    while (!body.grounded && time < 5) {
      body.update(null, false, 1 / 120);
      time += 1 / 120;
    }
    assert.true(Math.abs(time - Math.sqrt((2 * 4.5) / body.options.gravity)) < 0.03);
  });

  QUnit.test("a fall can't get faster than the terminal speed", (assert) => {
    const body = new Controller({ world: new World() });
    body.placeAt(0, 500, 0);
    for (let i = 0; i < 600; i++) body.update(null, false, 1 / 60);
    assert.strictEqual(body.vy, -body.options.terminalSpeed);
  });

  QUnit.test("gravity can be turned off, and then it floats", (assert) => {
    const body = new Controller({ world: new World(), options: { gravity: 0 } });
    body.placeAt(0, 5, 0);
    for (let i = 0; i < 120; i++) body.update(null, false, 1 / 60);
    assert.false(body.grounded);
    assert.strictEqual(body.y, 5);
  });

  QUnit.test("a fall onto a roof lands on the roof, and not on the ground under it", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 30, 0);
    for (let i = 0; i < 300 && !body.grounded; i++) body.update(null, false, 1 / 60);
    assert.strictEqual(body.y, 20);
  });

  QUnit.test("a fast fall doesn't go through a thin box", (assert) => {
    const thin = { minX: -5, maxX: 5, minY: 9.9, maxY: 10, minZ: -5, maxZ: 5 };
    const body = new Controller({ world: new World({ boxes: [thin] }), options: { gravity: 3000, terminalSpeed: 200 } });
    body.placeAt(0, 12, 0);
    for (let i = 0; i < 100 && !body.grounded; i++) body.update(null, false, 0.05);
    assert.strictEqual(body.y, 10);
  });

  QUnit.test("running off the edge of a roof is a fall, to the ground", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 20, 0);
    let fell = false;
    for (let i = 0; i < 1000 && !(fell && body.grounded); i++) {
      body.update(north, false, 1 / 60);
      if (!body.grounded) fell = true;
    }
    assert.true(fell);
    assert.true(body.grounded);
    assert.strictEqual(body.y, 0);
    assert.true(body.z > 5);
  });

  QUnit.test("on a roof it isn't stopped by the building it stands on", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 20, -4);
    for (let i = 0; i < 20; i++) body.update(north, false, 1 / 60);
    assert.true(body.z > -4);
    assert.true(body.grounded || body.y <= 20);
  });

  QUnit.test("runs along a roof without falling while there is roof under it", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 20, -4);
    body.update(null, false, 1 / 60); // lands
    let fell = false;
    for (let i = 0; i < 30; i++) {
      body.update(north, false, 1 / 60);
      if (!body.grounded) fell = true;
    }
    assert.false(fell);
    assert.strictEqual(body.y > 19.99, true);
  });

  QUnit.test("the edge holds a heel: it falls only when the middle of the body is past the reach", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(0, 20, 5.1);
    body.update(null, false, 1 / 60);
    assert.true(body.grounded);
    body.placeAt(0, 20, 5.4);
    body.update(null, false, 1 / 60);
    assert.true(body.y < 20);
  });

  QUnit.test("a runner can fall past the side of a building without going through it", (assert) => {
    const body = new Controller({ world: new World({ boxes: [roof] }) });
    body.placeAt(-5.7, 15, 0);
    for (let i = 0; i < 400 && !body.grounded; i++) body.update({ x: 1, z: 0 }, false, 1 / 60);
    assert.true(body.x <= -5.45 + 1e-6);
    assert.strictEqual(body.y, 0);
  });
});

QUnit.module("Controller landing", () => {
  const world = new World();
  const fallFrom = (height, options = {}) => {
    const body = new Controller({ world, options });
    body.placeAt(0, height, 0);
    let frames = 0;
    while (!body.grounded && frames++ < 1000) body.update(null, false, 1 / 60);
    return body;
  };

  QUnit.test("a landing reports how fast the fall was", (assert) => {
    const body = fallFrom(10);
    assert.true(Math.abs(body.impact - Math.sqrt(2 * body.options.gravity * 10)) < 1.5);
  });

  QUnit.test("a hard landing holds the runner for a moment, and then lets go", (assert) => {
    const body = fallFrom(10);
    assert.true(body.landing > 0);
    for (let i = 0; i < 60; i++) body.update(null, false, 1 / 60);
    assert.strictEqual(body.landing, 0);
  });

  QUnit.test("a small drop is not felt", (assert) => {
    const body = fallFrom(0.3);
    assert.strictEqual(body.landing, 0);
  });

  QUnit.test("how hard a landing has to be to be felt can be changed", (assert) => {
    assert.true(fallFrom(0.3, { hardLanding: 1 }).landing > 0);
  });
});

QUnit.module("Controller reset and placeAt", () => {
  QUnit.test("reset puts it back where it began, standing, still", (assert) => {
    const body = new Controller({ x: 2, z: -9, heading: 0.5, world: new World({ ground: () => -0.15 }) });
    body.placeAt(30, 40, 50);
    for (let i = 0; i < 100; i++) body.update({ x: 1, z: 0 }, true, 1 / 60);
    body.reset();
    assert.deepEqual([body.x, body.z, body.y, body.heading, body.speed, body.vy, body.grounded], [2, -9, -0.15, 0.5, 0, 0, true]);
  });

  QUnit.test("placeAt puts it somewhere, in the air and still, and it falls from there", (assert) => {
    const body = new Controller({ world: new World() });
    body.placeAt(3, 7, 4);
    assert.deepEqual([body.x, body.y, body.z, body.speed, body.grounded], [3, 7, 4, 0, false]);
  });
});

QUnit.module("Controller in the district", () => {
  const world = new World({ boxes: [...buildingBoxes(), ...ledgeBoxes(), ...rimBoxes()], ground: (x, z) => groundHeight(x, z) });
  const bounds = districtBounds();

  QUnit.test("it can stand on every roof, and the roof is as high as the building", (assert) => {
    const problems = [];
    for (const box of buildingBoxes()) {
      const spot = roofSpot(box);
      const body = new Controller({ world, bounds });
      body.placeAt(spot.x, spot.y + 0.05, spot.z);
      for (let i = 0; i < 10; i++) body.update(null, false, 1 / 60);
      if (!body.grounded || Math.abs(body.y - box.maxY) > 1e-6) problems.push(box.name);
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("walking across a roof to its edge, the feet go up onto the raised edge and do not sink into it", (assert) => {
    const problems = [];
    for (const placement of buildingPlacements().filter((placed) => placed.rim > 0)) {
      const body = new Controller({ world, bounds });
      const spot = roofSpot({ ...footprint(placement), maxY: placement.roof });
      body.placeAt(spot.x, spot.y + 0.05, spot.z);
      for (let i = 0; i < 30; i++) body.update(null, false, 1 / 60);
      let highest = body.y;
      for (let i = 0; i < 400; i++) {
        body.update({ x: 1, z: 0 }, false, 1 / 60);
        highest = Math.max(highest, body.y);
        if (!body.grounded) break;
      }
      if (Math.abs(highest - (placement.roof + placement.rim)) > 0.02) problems.push(placement.name + " landed " + landed + " wanted " + (placement.roof - placement.ledge) + " y " + body.y);
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("beside the upper roof of a building in two levels, what is under the feet is the ledge, and not the air or the ground", (assert) => {
    const roofs = buildingBoxes();
    const problems = [];
    buildingPlacements().forEach((placement, i) => {
      if (!placement.ledge) return;
      const roof = roofs[i];
      const z = (roof.minZ + roof.maxZ) / 2;
      const beside = world.supportAt(roof.maxX + 0.6, z, BODY.supportReach, Infinity);
      const on = world.supportAt(roof.maxX - 3, z, BODY.supportReach, Infinity);
      if (Math.abs(beside - (placement.roof - placement.ledge)) > 1e-9 || Math.abs(on - placement.roof) > 1e-9) problems.push(placement.name);
    });
    assert.deepEqual(problems, []);
  });

  QUnit.test("it starts on the road at the junction", (assert) => {
    const body = new Controller({ x: 0, z: -9, world, bounds });
    assert.strictEqual(body.y, -ROAD_DEPTH);
  });

  QUnit.test("from a roof, walking off the edge ends on the ground, wherever it goes", (assert) => {
    const problems = [];
    for (const box of buildingBoxes()) {
      for (const direction of [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }]) {
        const body = new Controller({ world, bounds });
        const spot = roofSpot(box);
        body.placeAt(spot.x, spot.y + 0.05, spot.z);
        for (let i = 0; i < 1500 && !(body.y < 1 && body.grounded); i++) body.update(direction, true, 1 / 60);
        if (!(body.y < 1 && body.grounded)) problems.push(`${box.name} ${direction.x},${direction.z}`);
      }
    }
    assert.deepEqual(problems, []);
  });
});
```

Things to notice:

- **The body is walked about in worlds the tests build**: a wall, a step of 30 centimetres, a step of 60, a roof, a thin plate. Each test is a small story. *It walks up a low step, and stands on it. A step higher than the step height is a wall. The step height can be changed, and then it isn't.*
- **A fall is tested against the formula**: the time a body takes to fall from 4.5 metres is about the square root of twice the height over gravity. A test that agrees with a formula is a test that can't be wrong in the same way as the code.
- **The four tests at the end use the real district**, with the ledges and the raised edges in it. Every roof can be stood on, at the height of its building. A runner who walks to the edge of a roof goes up onto the raised edge, to exactly its top, and doesn't sink into it. Beside the upper roof of a building in two levels, what is under the feet is the ledge. And from every roof the runner can walk off each of the four sides and ends up on the ground. A building added to the plan that a runner can't stand on, or can get stuck on, is a failing test.
- **A fast fall onto a thin plate** (a gravity of 3000, a plate 10 centimetres thick) is the test for tunnelling, and it is the one that fails first if `_fall` is ever changed to look at where the feet *are* and not where they *went*.

Open `tests.html`. You should see **274 passing tests**: 35 more.

---

## Step 4: Clips for a body

A body that is in the air should look as if it is falling, and one that has just landed hard should look as if it has. The character file has a falling clip, `Jump_Loop`, and a landing clip, `Jump_Land`. Open `js/character.js`. In `CLIPS`, add the two:

```js
const CLIPS = { idle: "Idle_Loop", walk: "Walk_Loop", jog: "Jog_Fwd_Loop", sprint: "Sprint_Loop", fall: "Jump_Loop", land: "Jump_Land" };
```

Add this directly above the line `const FADE_TIME = 0.2;`:

```js
// How fast the landing clip plays: it is a little over a second as it was recorded, and a hard landing is over in less than half of one.
const LAND_RATE = 2.5;

// The clip for a body (a Controller): { name, rate, loop }. In the air, the falling clip, which goes on for as long as the fall; just after a
// hard landing, the landing clip, once; and otherwise the one for the speed.
function clipForBody(body) {
  if (!body.grounded) return { name: CLIPS.fall, rate: 1, loop: true };
  if (body.landing > 0) return { name: CLIPS.land, rate: LAND_RATE, loop: false };
  return { ...clipForSpeed(body.speed), loop: true };
}
```

Things to notice:

- **`clipForBody` chooses from the whole body**, not only its speed: in the air, falling (whatever the speed); just after a hard landing, the landing clip; otherwise the clip for the speed, as before. Being in the air comes first: a runner who lands and falls again is falling.
- **A clip can play once.** Landing is not a loop. The result has `loop`, and `LAND_RATE` plays it faster, since the clip was recorded slower than a hard landing lasts.

`ClipPlayer.play` has to take `loop`. Find it (it starts `// Plays the named clip`) and **delete it**, and add this:

```js
  // Plays the named clip at a rate (1 is as recorded), looping, or once if `loop` is false (it then stays at its last pose). The clip that was playing fades out while this one fades in. Asking
  // for the clip that is already playing only follows a change of rate, so it is safe to call every frame.
  play(name, rate = 1, loop = true) {
    const next = this.clips.get(name);
    if (!next) throw new Error(`The character has no clip called "${name}"`);
    if (name === this.current) {
      next.speedRatio = rate;
      return;
    }
    if (this.current) this.fading.push(this.current);
    this.fading = this.fading.filter((fading) => fading !== name); // one that is coming back is no longer on its way out
    next.start(loop, rate);
    next.setWeightForAllAnimatables(0);
    this.current = name;
    this.weight = 0;
  }
```

Things to notice:

- **A clip that is played once stays at its last pose** when it ends, and a body that is still landing keeps it. Asking for the same clip again does nothing (that is the same rule as before), so it is safe to ask every frame.

Add `LAND_RATE` and `clipForBody` to the export lists at the bottom of the file.

### Tests

In `tests/character.tests.js`, the test of the clips now has two more: **change** the list in *"the clips are all clips the character file has"* to:

```js
    assert.deepEqual(Object.values(CLIPS), ["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop", "Jump_Loop", "Jump_Land"]);
```

Add a new module directly **above** the module `ClipPlayer`:

```js
QUnit.module("clipForBody", () => {
  const body = (changes) => ({ grounded: true, landing: 0, speed: 0, ...changes });

  QUnit.test("on the ground, it is the clip for the speed, looping", (assert) => {
    assert.deepEqual(clipForBody(body({ speed: 0 })), { name: CLIPS.idle, rate: 1, loop: true });
    assert.strictEqual(clipForBody(body({ speed: 4.5 })).name, CLIPS.jog);
    assert.strictEqual(clipForBody(body({ speed: 7.5 })).name, CLIPS.sprint);
    assert.true(clipForBody(body({ speed: 4.5 })).loop);
  });

  QUnit.test("in the air, it is the falling clip, whatever the speed", (assert) => {
    for (const speed of [0, 4.5, 7.5]) assert.deepEqual(clipForBody(body({ grounded: false, speed })), { name: CLIPS.fall, rate: 1, loop: true });
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

and, inside the module `ClipPlayer`, a new test directly **above** the test *"asking for the clip that is playing doesn't start it again"*:

```js
  QUnit.test("a clip can be played once, and not looping", (assert) => {
    const { clips, player } = make();
    player.play("Walk_Loop", 1, false);
    assert.false(clips.get("Walk_Loop").loop);
  });
```

Open `tests.html`. You should see **279 passing tests**: 5 more.

---

## Step 5: Putting it in the game

`main.js` loses its scout and gets a body. There are three changes to it, each a block to **delete** and a block to add in its place, and `debug.js` gets names for the buildings, in between.

### The world and the body

Find the comment that starts `// The walls: every building as a box` and the four lines under it (down to and including the line that makes the `Scout`), and **delete them**. Add this in their place:

```js
  // The world the body lives in: every building as a box, to keep out of, to stand on the roof of, and for the camera to keep out of too,
  // the raised edges of the roofs, and the ground. The body is a Controller: it runs, steps, falls and lands in that world.
  const boxes = buildingBoxes();
  const ledges = ledgeBoxes();
  const rims = rimBoxes();
  orbit.boxes = [...boxes, ...ledges];
  const world = new World({ boxes: [...boxes, ...ledges, ...rims], ground: (x, z) => groundHeight(x, z) });
  const body = new Controller({ ...START, world, bounds: districtBounds() });
```

Things to notice:

- **The world is the plan's boxes, the ledges, the raised edges of the roofs, and the plan's ground.** The camera uses the roofs and the ledges, so a camera behind a wall and a runner at a wall agree about where the wall is.
- **The body is a `Controller`.** It takes the place of the scout, and starts where it started.

### The keys and the frame

Find the chunk that starts with the comment `// The keys.` and ends just above the comment `// Developer mode`, and **delete it** (that is the key listeners, and the function that runs every frame), and add this:

```js
  // The keys. Arrow keys would scroll the page, so the ones the runner uses are taken for the game.
  const heldKeys = new Set();
  const look = new PointerLook(canvas, document, (locked) => document.body.classList.toggle("looking", locked));
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") body.reset();
    if (!ALL_MOVE_KEYS.has(event.code) || typesText(event)) return;
    event.preventDefault();
    heldKeys.add(event.code);
  });
  window.addEventListener("keyup", (event) => heldKeys.delete(event.code));
  window.addEventListener("blur", () => heldKeys.clear()); // don't get stuck running after alt-tab

  // Each frame: the mouse turns the camera, the keys move the body, and the runner and the camera go where the body is.
  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't launch the runner across the district.
    const dt = started ? Math.min(engine.getDeltaTime() / 1000, 0.05) : 0;
    const turned = look.take();
    if (started) orbit.look(turned.dx, turned.dy);

    const input = moveInput(heldKeys);
    body.update(started ? moveDirection(input, orbit.yaw) : null, input.sprint, dt);

    runner.root.position.set(body.x, body.y, body.z);
    runner.root.rotation.y = body.heading + RUNNER_TURN;
    const clip = clipForBody(body);
    player.play(clip.name, clip.rate, clip.loop);
    player.update(dt);
    orbit.follow({ x: body.x, y: body.y, z: body.z });
  });
```

Things to notice:

- **The frame is the same five lines**, with a body in place of the scout: the mouse turns the camera, the keys move the body, the runner goes where the body is, the clip follows what the body is doing (`clipForBody`, with its loop), and the camera follows the runner.
- **The runner stands at the body's height**, `body.y`, which is on the roof, on the road, in the air.

### Names for the buildings

When the boxes don't match a building, the first question is *which building is it?* Open `js/debug.js`. At the top is a comment that starts `// Drawing what the game knows`. **Delete it**, and add this in its place:

```js
// Drawing what the game knows but doesn't show: the boxes it uses for walls, and the names of the buildings. In developer mode they can
// be drawn over the buildings, to see that they are where the buildings are, and which building is which. The size and place of the mesh
// for a box is plain arithmetic (boxMeshSpec), so it is tested; DebugBoxes and DebugLabels make them in a scene. See ../tests/debug.tests.js.
```

Above `class DebugBoxes`, add the function that says what a label says and where it hangs:

```js
// What a label for a box says, and where it hangs: above the middle of the box, so that it can be seen from the street.
function labelSpec(box, lift = 4) {
  const spec = boxMeshSpec(box);
  return { text: box.name || "", x: spec.x, y: box.maxY + lift, z: spec.z };
}
```

Above the comment `// Plain <script> include`, add the class that makes the labels:

```js
// A name over each box, that always faces the camera: for knowing which building is which.
class DebugLabels {
  constructor(scene, boxes) {
    this.root = new BABYLON.TransformNode("debug-labels", scene);
    for (const box of boxes) {
      const spec = labelSpec(box);
      const texture = new BABYLON.DynamicTexture(`debug-label-${spec.text}`, { width: 512, height: 96 }, scene, false);
      texture.hasAlpha = true;
      texture.drawText(spec.text, null, 66, "bold 56px monospace", "#ffffff", "rgba(0, 0, 0, 0.75)", true);
      const material = new BABYLON.StandardMaterial(`debug-label-${spec.text}`, scene);
      material.diffuseTexture = texture;
      material.opacityTexture = texture;
      material.emissiveColor = BABYLON.Color3.White();
      material.disableLighting = true;
      material.fogEnabled = false;
      material.disableDepthWrite = true;
      const mesh = BABYLON.MeshBuilder.CreatePlane(`debug-label-${spec.text}`, { width: 9, height: 1.7 }, scene);
      mesh.position.set(spec.x, spec.y, spec.z);
      mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      mesh.material = material;
      mesh.isPickable = false;
      mesh.renderingGroupId = 1;
      mesh.parent = this.root;
    }
    this.root.setEnabled(false);
  }

  get visible() {
    return this.root.isEnabled();
  }

  setVisible(visible) {
    this.root.setEnabled(visible);
  }

  dispose() {
    for (const mesh of this.root.getChildMeshes()) {
      mesh.material.diffuseTexture.dispose();
      mesh.material.dispose();
    }
    this.root.dispose(false, true);
  }
}
```

And add `labelSpec` and `DebugLabels` to the two export lists at the bottom.

Things to notice:

- **A label is a plane with a name written on it**, that always faces the camera (`BILLBOARDMODE_ALL`), and is drawn over what is in front of it, so it can be read through a building. Where it hangs is plain arithmetic (`labelSpec`), so it is tested.
- **It says the name of the file** (`Building_Medium_1`), which is what to look for in `assets/`.

The tests are in `tests/debug.tests.js`. Add a module **above** the module `DebugBoxes`:

```js
QUnit.module("labelSpec", () => {
  QUnit.test("hangs the name above the middle of the box", (assert) => {
    const spec = labelSpec({ name: "Building_Small_1", minX: 2, maxX: 8, minY: 0, maxY: 30, minZ: -10, maxZ: -4 });
    assert.deepEqual(spec, { text: "Building_Small_1", x: 5, y: 34, z: -7 });
  });

  QUnit.test("how high it hangs can be chosen", (assert) => {
    assert.strictEqual(labelSpec({ name: "a", minX: 0, maxX: 1, minY: 0, maxY: 10, minZ: 0, maxZ: 1 }, 10).y, 20);
  });
});
```

And this one at the **end** of the file:

```js
QUnit.module("DebugLabels", (hooks) => {
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

  const boxes = [
    { name: "a", minX: 0, maxX: 4, minY: 0, maxY: 10, minZ: 0, maxZ: 6 },
    { name: "b", minX: 10, maxX: 12, minY: 0, maxY: 5, minZ: 0, maxZ: 2 },
  ];

  QUnit.test("makes a label for each box, above it, that faces the camera, and starts hidden", (assert) => {
    const labels = new DebugLabels(scene, boxes);
    const meshes = labels.root.getChildMeshes();
    assert.strictEqual(meshes.length, 2);
    assert.deepEqual([meshes[0].position.x, meshes[0].position.y, meshes[0].position.z], [2, 14, 3]);
    assert.strictEqual(meshes[0].billboardMode, BABYLON.Mesh.BILLBOARDMODE_ALL);
    assert.false(labels.visible);
  });

  QUnit.test("setVisible shows and hides them all", (assert) => {
    const labels = new DebugLabels(scene, boxes);
    labels.setVisible(true);
    assert.true(labels.visible);
    labels.setVisible(false);
    assert.false(labels.visible);
  });

  QUnit.test("dispose takes them all away", (assert) => {
    const before = scene.meshes.length;
    const labels = new DebugLabels(scene, boxes);
    assert.strictEqual(scene.meshes.length, before + 2);
    labels.dispose();
    assert.strictEqual(scene.meshes.length, before);
  });
});
```

Open `tests.html`. You should see **284 passing tests**: 5 more than the last time.

### The developer panel
Find the comment `// Developer mode, with ?dev` and the whole block under it, down to the comment `// The last step of loading`, and **delete it**. Add this:

```js
  // Developer mode, with ?dev on the end of the address: a panel to watch and change things while the game runs. The key under Esc
  // hides it, and its title bar folds it up (it starts folded up on a small screen).
  let panel = null;
  if (devEnabled(location.search)) {
    let roofNumber = 0; // which roof the button takes the runner to next
    const debugBoxes = new DebugBoxes(scene, [...boxes, ...ledges, ...rims]);
    const debugLabels = new DebugLabels(scene, boxes.map((box) => ({ ...box, name: BUILDINGS[box.name].file })));
    panel = new DevPanel(
      document,
      [
        {
          title: "Time and light",
          rows: [
            control("hour", () => sky.hour, (value) => sky.setHour(value), HOURS.min, HOURS.max, 0.05),
            readout("clock", () => formatHour(sky.hour)),
            control("sun strength", () => sky.sunStrength, (value) => { sky.sunStrength = value; sky.setHour(sky.hour); }, 0, 2),
            control("fog", () => scene.fogDensity, (value) => { scene.fogDensity = value; }, 0, 0.02, 0.0005),
            toggle("shadows", () => sun.shadowEnabled, (value) => { sun.shadowEnabled = value; }),
          ],
        },
        {
          title: "Camera",
          rows: [
            slider("distance", orbit, "distance", 1.5, 14, 0.1),
            slider("height", orbit, "height", 0.5, 3, 0.05),
            control("field of view", () => camera.fov, (value) => { camera.fov = value; }, 0.4, 1.6),
            slider("look speed", orbit, "sensitivity", 0.0005, 0.008, 0.0001),
            toggle("invert up/down", () => orbit.invert, (value) => { orbit.invert = value; }),
          ],
        },
        {
          title: "Runner",
          rows: [
            slider("jog speed", body.options, "jogSpeed", 1, 10, 0.1),
            slider("sprint speed", body.options, "sprintSpeed", 2, 14, 0.1),
            slider("gravity", body.options, "gravity", 0, 80, 1),
            slider("step height", body.options, "stepHeight", 0.1, 1.5, 0.05),
            action("Go to a roof", () => {
              const spot = roofSpot(boxes[roofNumber++ % boxes.length]);
              body.placeAt(spot.x, spot.y + 0.05, spot.z);
            }),
            action("Switch runner", () => useRunner(runner === runners.male ? "female" : "male")),
            action("Back to the start", () => body.reset()),
          ],
        },
        {
          title: "World",
          rows: [
            toggle("window glass", () => glass[0].alpha > 0, (value) => glass.forEach((material) => { material.alpha = value ? 1 : GLASS_ALPHA; })),
            toggle("building boxes", () => debugBoxes.visible, (value) => debugBoxes.setVisible(value)),
            toggle("building names", () => debugLabels.visible, (value) => debugLabels.setVisible(value)),
            readout("position", () => `${body.x.toFixed(1)}, ${body.z.toFixed(1)}`),
            readout("height", () => `${body.y.toFixed(2)} m`),
            readout("speed", () => `${body.speed.toFixed(1)} m/s`),
            readout("on the ground", () => (body.grounded ? "yes" : `no (${body.vy.toFixed(1)} m/s)`)),
            readout("clip", () => player.current),
            readout("mouse", () => (look.locked ? "locked" : "free")),
            readout("frames", () => `${engine.getFps().toFixed(0)} fps`),
          ],
        },
      ],
      { collapsed: window.matchMedia("(max-height: 520px), (max-width: 640px)").matches, clipboard: navigator.clipboard }
    );
    document.body.appendChild(panel.root);
    window.addEventListener("keydown", (event) => {
      if (event.code === DEV_KEY && !event.repeat && !typesText(event)) panel.toggleShown();
    });
    scene.onAfterRenderObservable.add(() => panel.refreshReadouts());
    window.dev = { scene, body, world, sky, orbit, panel, look, shadows }; // for poking at from the console
  }
```

Things to notice:

- **A new switch, `building names`, next to `building boxes`.** Switch both on and look at a building that is wrong.
- **Four new things in the panel**: **gravity** (turn it down to 5 and the runner floats like an astronaut, and at 0 they don't fall at all), **step height** (a runner who can step 1.5 metres climbs a wall that was in their way), **Go to a roof** (each press takes the runner to the roof of the next building) and read-outs of the **height** and whether the body is **on the ground**, and if not, how fast it is falling.
- **The panel is how you test falling**, since there is no way up to a roof yet.

---

## Step 6: Try it

Serve the page and open it **with `?dev`**.

- [ ] Running about the streets is as before: the body gets up to speed, stops, turns, and **can't walk into a building**
- [ ] **The runner steps up** onto the sidewalk and down onto the road at the curbs, without a jump, and **can't climb** a wall (stand in front of a building and keep running)
- [ ] **Go to a roof** takes the runner to the **middle of a roof**, standing on it, not above or in it. Press it again for the next building
- [ ] On a roof, run in any direction: the runner **runs along the roof, steps up onto the parapet** (the feet are on top of it, not sunk in it), and then **falls**, with the **falling clip**, and the **read-out** says *no* and a falling speed that grows
- [ ] The runner **lands on the ground** and plays the **landing clip**, and a moment later is free to run again. (A fall from a tall building is much harder than from a short one)
- [ ] The runner can fall off a low roof onto the roof of **another** building, if one is below, and stands on that
- [ ] **Gravity** to 5: the fall is slow and long. To 0: the runner **floats** where they were put
- [ ] **Step height** to 1.2: the runner walks up onto things that were walls (the parapet is no longer in the way of anything), and back to 0.4 puts it back
- [ ] **Building boxes** shows pink wire boxes whose tops are at the **roofs**, and thin ones along the edges, at the top of the **parapet**
- [ ] **R** and **Back to the start** put the runner back on the road at the start
- [ ] **Switch runner**: the other character does the same things, including the falling clip

**If something's wrong**

- **`ReferenceError: World is not defined` or `Controller is not defined`:** a script tag is missing, or the file is still the placeholder. `index.html` of this sample already lists them, so check the file.
- **The runner floats above a roof, or sinks into it:** `roof` and `height` in `BUILDINGS`, and that `buildingBoxes` uses `placement.roof`. **Sunk into the raised edge:** `rimBoxes` must be in the world, as `boxes: [...boxes, ...rims]`.
- **The runner falls through the ground at the start:** `groundHeight` is the ground of the world, and must be given as `ground: (x, z) => groundHeight(x, z)`.
- **The runner never lands:** `supportAt` must be asked with a height above the feet (`before + o.stepHeight`), and `placeAt` puts the body *in the air*, so the first frame lands it.
- **The runner can climb walls:** `wallsAt` must compare the top of a box with `y + stepHeight`.
- **The runner falls off a roof as soon as it moves:** a roof must hold the body while the middle of the body is within `supportReach` of it. And `snapDown` is how far the ground may drop and be walked down.
- **The camera is inside a roof when the runner stands on it:** the camera's boxes are the same boxes, so it is brought in front of any wall, and is held above the feet of the runner (the camera floor of the last step).
- **The landing clip plays as soon as I step off a curb:** `hardLanding` is how fast a fall has to be, on landing, for it to be felt. A curb is nowhere near it.

**Experiments** (change one, reload, then change it back):

- **`gravity: 12`** in `BODY`: the moon. **`60`**: the runner is a stone
- **`stepHeight: 0.15`**: a runner who can't climb a curb. (The sidewalk has to be walked round.)
- **`terminalSpeed: 15`**: a fall from the tower takes much longer, and is never very hard
- **`supportReach: 0`**: standing on the very edge of a roof is a fall, and with **`0.6`**, you can stand with only a heel on it
- **A new row for the panel**: `slider("hard landing", body.options, "hardLanding", 1, 30, 0.5)`

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

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
  <script src="tests/controller.tests.js"></script>
  <script src="tests/debug.tests.js"></script>
  <script src="tests/devpanel.tests.js"></script>
```

Open it. You should see **284 passing tests**: the 206 you started with, plus 15 for the roofs, 18 for the world, 35 for the body, 5 for the clips and 5 for the building names.

> **What these tests don't cover.** The *feel* of a fall (is 30 the right gravity?), and how a landing looks. The numbers in `BODY` are a first try, and the developer panel is how you find better ones. And `main.js`, the glue, is checked by playing.

> **Try breaking something.** In `controller.js`, in `_fall`, change `before + o.stepHeight` to `this.y + o.stepHeight`. The test *"a fast fall doesn't go through a thin box"* fails, and the runner, in the game, falls through a roof if you give it enough gravity. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Moving a character with code, not physics | `Controller` |
| What is under the feet, and what is in the way | `World.supportAt`, `World.wallsAt`, `World.push` |
| A step height | `stepHeight`, `wallsAt` |
| Gravity and terminal speed | `_fall`, `BODY` |
| Landing on what was passed through | `_fall`, `supportAt(..., before + stepHeight)` |
| A drop that is walked, and one that is fallen | `snapDown`, `_walk` |
| Standing on a roof | the buildings' boxes, `roof` |
| Standing on a raised edge | `rim`, `rimBoxes` |
| A roof that is only part of a footprint, and a ledge | `deck`, `ledge`, `deckInsets`, `ledgeBoxes` |
| Knowing which building is which | `labelSpec`, `DebugLabels`, the `building names` switch |
| Hard and soft landings | `impact`, `landing`, `hardLanding` |
| A clip chosen from the whole body | `clipForBody` |
| A clip that plays once | `ClipPlayer.play(name, rate, loop)` |
| Testing a character in worlds built for the test | `controller.tests.js` |
| A button to get to a place that can't yet be reached | `roofSpot`, "Go to a roof" |

## Challenges

1. **A ceiling.** Stop the runner walking under a box that is too low for them (a box whose underside is lower than their head, with floor under it), by making `wallsAt` and `supportAt` aware of the underside of a box. (Hint: `minY`.)
2. **A fall that hurts.** Take time off, or play the hit clip, when the impact is above a second, higher speed. (Hint: `impact`, and `Hit_Knockback` is in the character files.)
3. **A shadow that follows the ground.** A dark spot on whatever is under the runner, bigger when they are high. (Hint: `supportAt`.)
4. **Slopes.** A box with a sloped top (a ramp) and a `supportAt` that knows the height at each place on it. (Hint: the `heightAt` of Rolling Rampage.)
5. **Show the numbers on the page.** A line in the panel that says what the body is standing on. (Hint: a read-out, and `supportAt`.)

---

*That's the body. It can stand on a roof and fall off it. Next it learns to jump: the other way, up, with a jump that feels fair (a moment's grace after running off an edge, and a press just before landing that isn't lost), and a roll to take the sting out of a long fall.*
