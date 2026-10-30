# Tutorial: Rooftop Parkour Rooftops -- Somewhere to Run

This is the sixth tutorial of the Rooftop Parkour series. The runner has all of its moves, but the district does not give it much to do with them: the only ledges worth reaching are up on the roofs, with no way up, and the one place to try the moves is a training yard in the middle of the road. This sample makes the district a place to run. The walls of the buildings are measured from the models, a fire escape goes up the front of every building to its roof, there are sills to hang from and things on the roofs to vault and climb, and the gaps between roofs are a table of designed jumps. And, so that nobody has to walk it all to find out whether it works, **a bot that plays the game** climbs every fire escape and makes every jump.

By the end you'll have:

- **Measured walls**: how far in from the edge of each model its wall stands, found by shooting rays at it, so that a runner who hangs from the edge of a roof hangs against the wall
- **Fire escapes** up the front of every building: the kit's three pieces stacked as many times as the roof needs, each platform and stair made into boxes, a planter at the foot to start from, and a table (`LAYOUTS`) that says where
- **Sills** to hang from and shimmy along, and **vents and huts** on the roofs to vault and to climb up
- **Designed crossings**: a table of the jumps between roofs that the district is meant to have
- **A bot that plays the game** (`playCrossing`, `playEscape`): the same controller, the same boxes, run at a gap or up a fire escape, and a test for each one that says it works
- A runner that **starts in the street**, in front of the first fire escape, and **no training yard**
- More in the **developer panel**: buttons to go to a fire escape or a crossing
- Unit tests for all of it: **568 passing tests**

**What you'll learn:** how to measure a model with rays, how to describe a thing that stands on a wall as a frame (along the wall, out from it) so that one description works for a building that faces any way, how to make a real model into boxes a controller already understands, how to turn "can the player get there?" into a test by writing a bot that plays the game, and why a bot is better than a person at it.

**Before you start:** do the [Moves tutorial](../rooftop_parkour_moves/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Moves sample, plus four empty placeholders for the new files and their tests:

```
rooftop_parkour_rooftops/
├── index.html, tests.html   (already list the new scripts)
├── css/                     (from the Moves sample)
├── js/
│   ├── props.js            (placeholder -- Steps 2 and 3)
│   ├── reach.js            (placeholder -- Step 4)
│   ├── plan.js             (changes -- Steps 1, 2, 4 and 5)
│   ├── main.js             (changes -- Step 5)
│   └── everything else, from the Moves sample (the controller is not touched at all)
└── tests/
    ├── props.tests.js      (placeholder -- Steps 2 and 3)
    ├── reach.tests.js      (placeholder -- Step 4)
    ├── plan.tests.js       (changes -- Steps 1, 4 and 5)
    ├── controller.tests.js (changes -- Step 5)
    └── everything else, from the Moves sample
```

**The controller is not touched.** That is the point of the step: the runner learned to hang, climb, vault and kick in the last three steps, and a fire escape is only boxes of the kind a roof is made of, so everything it needs to be climbed is there already.

Open `tests.html` before you change anything. You should see **496 passing tests**.

### Serving the page

The models can't be loaded from a page opened straight from a file, so run a web server: `npx serve` in the repo root, and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

Five things, in the order that each needs the one before:

1. **The walls** are measured, and the boxes of the buildings follow them.
2. **A fire escape** is described: a frame to put it on a wall in, a platform and a stair, how many floors, and the one for each building in the district.
3. **Sills and roof things** are described the same way.
4. **A bot** plays the game, to check the jumps and the climbs.
5. **The game** puts all of it in the district, and the runner begins in the street.

## Step 1: The walls, measured

A building of the kit is a model. Everything that decides where the runner can stand and what it can hang from is a box in the plan (`buildingBoxes`): the ground the building covers, from the street to the roof. Until now that box was the **footprint**: the width and depth of the model, as measured from its file. But the footprint includes everything that sticks out of the model: steps at the front, a plinth, trim. The wall itself is further in. A runner that hangs from the edge of a roof hangs from the edge of the box, so it hung half a metre out from the real wall, which looked wrong on every building and was a bug on some.

So the walls were measured, with rays. For each building, from every side, at every height, in 1 m steps along it, a ray was shot at the model (only at that model, so that a building next to it can't be hit), and how far it travelled said where the wall is. The **middle** of those is the wall: the steps and the trims are what the rays that hit them are outliers of. The numbers are in `BUILDINGS`, as `wall`: how far in from the edge of the footprint the wall is, on each side, as the building comes out of its file (facing +z, so that `maxZ` is the front). They came out as:

- about **half a metre** in on most sides of most buildings (0.52 to 0.53, 0.32 to 0.46 for the large_2, a hand's breadth (0.1) for the small_2)
- **further in at the front** of the small_1 (2.3: it has steps there that are not part of the wall) and the large_1 (1.6)
- the same at every height, which is why one number per side is enough: the walls stand straight

The roofs were measured too, from above, a square metre at a time. They are flat. (The strips of missing roof and the structure on the large_1 that were noted in the earlier steps turned out to be the stoops and the trim at the front of the models, which the walls now stop before.)

### plan.js

Open `js/plan.js`. The changes go from the **bottom of the file to the top**, so that the line numbers hold.

In the two export lists at the end of the file, **replace `deckInsets` with `turnInsets, wallFootprint`** (the function is renamed, because it is about to turn more than the deck). The lists are on line 348 (`module.exports`) and line 350 (`Object.assign(window,`): change each.

The function `deckInsets` and the two functions after it (lines 188 to 215) are **replaced**: `deckInsets` becomes `turnInsets`, because the walls are given the same way as the deck (turned for the way the building faces), a new function `wallFootprint` says where the walls are, and `buildingBoxes` and `ledgeBoxes` use it. **Delete them**, and add this in their place:

```js
// How far something of a building (its wall, or its upper roof) is in from each side of its footprint, as seen from above (minX is the west
// side), for the way the building faces. The sides are given for a building facing +z, so a building that faces another way has them turned
// with it.
function turnInsets(insets, facing) {
  const none = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  const d = { ...none, ...insets };
  if (facing === "south") return { minX: d.maxX, maxX: d.minX, minZ: d.maxZ, maxZ: d.minZ };
  if (facing === "east") return { minX: d.minZ, maxX: d.maxZ, minZ: d.maxX, maxZ: d.minX };
  if (facing === "west") return { minX: d.maxZ, maxX: d.minZ, minZ: d.minX, maxZ: d.maxX };
  return d;
}

// The ground inside the walls of a building, as a box: the footprint, less how far each wall is in from it.
function wallFootprint(placement) {
  const { minX, maxX, minZ, maxZ } = footprint(placement);
  const wall = placement.wall;
  return { minX: minX + wall.minX, maxX: maxX - wall.maxX, minZ: minZ + wall.minZ, maxZ: maxZ - wall.maxZ };
}

// The top roof of a building, as a box: where a runner stands. It is the ground inside the walls, less (in a building of two levels) the
// ledge, from the ground up to the roof (not to the top of the parapet). Each is { name, minX, maxX, minY, maxY, minZ, maxZ },
// which is what the walls of the scout, the camera and (later) the runner's collisions are made from.
function buildingBoxes(grid = GRID, layouts = LAYOUTS) {
  return buildingPlacements(grid, layouts).map((placement) => {
    const walls = wallFootprint(placement);
    const { minX, maxX, minZ, maxZ } = footprint(placement);
    const inset = placement.deck;
    return {
      name: placement.name,
      minX: Math.max(walls.minX, minX + inset.minX),
      maxX: Math.min(walls.maxX, maxX - inset.maxX),
      minZ: Math.max(walls.minZ, minZ + inset.minZ),
      maxZ: Math.min(walls.maxZ, maxZ - inset.maxZ),
      minY: 0,
      maxY: placement.roof,
      lean: placement.lean,
    };
  });
}

// The ledge round the upper roof of the buildings that have one: all the ground inside the walls, from the ground up to the ledge.
function ledgeBoxes(grid = GRID, layouts = LAYOUTS) {
  return buildingPlacements(grid, layouts)
    .filter((placement) => placement.ledge > 0)
    .map((placement) => ({ name: `${placement.name} ledge`, ...wallFootprint(placement), minY: 0, maxY: placement.roof - placement.ledge }));
}
```

In `buildingPlacements`, a building is given its walls turned the way it faces, as well as its deck. Find the line `deck: deckInsets(building, entry.facing),` (line 169). **Delete it**, and add:

```js
                wall: turnInsets(building.wall, entry.facing),
                deck: turnInsets(building.deck, entry.facing),
```

And at the top, the table of buildings and the comment above it (lines 22 to 41) are replaced by the table with the measured walls in it. **Delete them**, and add:

```js
// The buildings of the kit, and how big each is: the width and depth of its footprint, and its height, as measured from the files
// (see assets/README.md). A building has a front, with the windows and the door, which is its +z side as it comes out of its file. `height`
// is the top of the building, which is the top of the low wall (the parapet) that runs round its roof, and `roof` is the roof itself, where a
// runner stands: 20 centimetres lower, which is lower than the step height of a runner, so the parapet is something to step over, not a wall.
// `rim` is how high that raised edge stands above the roof, as measured (the large_2 has none). The roofs were measured from above, a square
// metre at a time, and they are flat: the `height` of a building is the top of its edge, and the roof is 20 centimetres lower.
// A footprint is not all wall. `wall` is how far the wall is in from the edge of the footprint (which is the whole of the model, with its steps
// and its trims) on each side, as the building comes out of its file, facing +z (a side that is not given is 0). It was measured by shooting
// rays at each building from every side, at every height, and it is the middle of what they hit: the walls stand straight, so a runner that
// hangs from the edge of a roof is against the wall, and not half a metre from it. The front of the small_1 and the large_1 are further in:
// they have steps there that are not part of the wall.
// The medium_1 and large_3 are in two levels: a smaller roof on top, and a ledge round it, `ledge` metres lower (the ledge is not quite flat:
// this is its middle). `deck` is how far the upper roof is in from the edge of the footprint on each side. `lean` is how far the wall under
// the upper roof leans out, at the feet of a runner hanging from its edge: those walls are not straight, and a body that hangs against the
// edge of the roof would be in the wall below it.
const BUILDINGS = {
  small_1: { file: "Building_Small_1", width: 12.46, depth: 14.536, height: 17.014, roof: 16.8, rim: 0.2, wall: { minX: 0.23, maxX: 0.23, minZ: 0.23, maxZ: 2.3 } },
  small_2: { file: "Building_Small_2", width: 20, depth: 12.002, height: 18.999, roof: 18.8, rim: 0.2, wall: { minX: 0.1, maxX: 0.1, minZ: 0.1, maxZ: 0.65 } },
  medium_1: { file: "Building_Medium_1", width: 13.056, depth: 12.054, height: 27.915, roof: 27.72, rim: 0.2, wall: { minX: 0.52, maxX: 0.52, minZ: 0.52, maxZ: 0.66 }, deck: { minX: 1.25, maxX: 1.3, minZ: 1.25, maxZ: 2.3 }, ledge: 2.5, lean: 0.45 },
  medium_2: { file: "Building_Medium_2", width: 15.056, depth: 13.056, height: 24.998, roof: 24.8, rim: 0.2, wall: { minX: 0.53, maxX: 0.53, minZ: 0.53, maxZ: 0.53 } },
  large_1: { file: "Building_Large_1", width: 25.038, depth: 26.028, height: 41, roof: 40.74, rim: 0.26, wall: { minX: 0.62, maxX: 0.52, minZ: 0.52, maxZ: 1.6 } },
  large_2: { file: "Building_Large_2", width: 20.644, depth: 16.644, height: 28, roof: 27.8, rim: 0, wall: { minX: 0.32, maxX: 0.46, minZ: 0.32, maxZ: 0.46 } },
  large_3: { file: "Building_Large_3", width: 23.056, depth: 19.058, height: 34.945, roof: 34.8, rim: 0.14, wall: { minX: 0.53, maxX: 0.53, minZ: 0.53, maxZ: 0.58 }, deck: { minX: 1.25, maxX: 1.3, minZ: 1.25, maxZ: 1.3 }, ledge: 2.5, lean: 0.45 },
};
```

Things to notice:

- **`wall` is not `deck`.** The deck is how far in the *upper roof* of a building in two levels is. The wall is how far in the *building* is. A building in two levels has both, and a box of each: `buildingBoxes` is the upper roof (within the walls, as well as within the deck, so it takes the larger of the two insets on each side), and `ledgeBoxes` is the lower one, all the ground inside the walls. The small_1 and the large_1 no longer need a deck at all: the steps at the front are a wall that is further in.
- **`turnInsets` turns them for the way a building faces.** They are given for a building facing +z, as they come out of the file. One facing south has them half way round, east and west a quarter. That was already how the deck worked; it now works for anything given as four insets.
- **`wallFootprint` is the footprint less the walls.** `footprint` is still the whole model: it is what the plan checks (a building must be in its block, and the alley between two must be wide enough), because the model is what is really there. Only what the *runner* meets is the walls.

### Tests

The tests of `deckInsets` are now tests of `turnInsets`, and there are tests of the walls. In `tests/plan.tests.js` there are two changes, from the bottom up.

The module `deckInsets` (lines 326 to 356) is **replaced**: the same tests, of the same function, by its new name, which is given the insets and not a building. **Delete it**, and add this in its place:

```js
QUnit.module("turnInsets", () => {
  const insets = { minX: 1, maxX: 2, minZ: 3, maxZ: 4 };

  QUnit.test("a building with none has none to leave out", (assert) => {
    assert.deepEqual(turnInsets(undefined, "north"), { minX: 0, maxX: 0, minZ: 0, maxZ: 0 });
  });

  QUnit.test("a side that is not given is 0", (assert) => {
    assert.deepEqual(turnInsets({ maxZ: 2 }, "north"), { minX: 0, maxX: 0, minZ: 0, maxZ: 2 });
  });

  QUnit.test("a building that faces north has them as they are", (assert) => {
    assert.deepEqual(turnInsets(insets, "north"), { minX: 1, maxX: 2, minZ: 3, maxZ: 4 });
  });

  QUnit.test("a building that faces south has them turned half way round", (assert) => {
    assert.deepEqual(turnInsets(insets, "south"), { minX: 2, maxX: 1, minZ: 4, maxZ: 3 });
  });

  QUnit.test("a building that faces east has its front on the east side, and one that faces west on the west side", (assert) => {
    assert.strictEqual(turnInsets(insets, "east").maxX, 4);
    assert.strictEqual(turnInsets(insets, "west").minX, 4);
  });

  QUnit.test("turned all the way round, they add up to the same", (assert) => {
    for (const facing of ["north", "east", "south", "west"]) {
      const d = turnInsets(insets, facing);
      assert.strictEqual(d.minX + d.maxX + d.minZ + d.maxZ, 10, facing);
    }
  });
});
```

Three tests are replaced by four (lines 192 to 221): the old tests were about the footprint, and these are about the walls. **Delete them**, and add:

```js
  QUnit.test("a building in one level is a roof as wide as its walls", (assert) => {
    const boxes = buildingBoxes(GRID, LAYOUTS);
    buildingPlacements(GRID, LAYOUTS).forEach((placement, i) => {
      if (BUILDINGS[placement.name].deck) return;
      const inside = wallFootprint(placement);
      assert.deepEqual([boxes[i].minX, boxes[i].maxX, boxes[i].minZ, boxes[i].maxZ], [inside.minX, inside.maxX, inside.minZ, inside.maxZ]);
    });
  });

  QUnit.test("the walls of a building with steps at the front stop before them, whichever way the building faces", (assert) => {
    const boxes = buildingBoxes(GRID, LAYOUTS);
    buildingPlacements(GRID, LAYOUTS).forEach((placement, i) => {
      if (placement.name !== "small_1") return;
      const inside = footprint(placement);
      const missing = placement.facing === "north" ? inside.maxZ - boxes[i].maxZ : boxes[i].minZ - inside.minZ;
      assert.true(Math.abs(missing - BUILDINGS.small_1.wall.maxZ) < 1e-9, placement.facing);
    });
  });

  QUnit.test("the walls are in from the footprint by what was measured, on every side, whichever way the building faces", (assert) => {
    for (const placement of buildingPlacements(GRID, LAYOUTS)) {
      const outer = footprint(placement);
      const inner = wallFootprint(placement);
      const wall = placement.wall;
      assert.true(Math.abs(inner.minX - outer.minX - wall.minX) < 1e-9 && Math.abs(outer.maxX - inner.maxX - wall.maxX) < 1e-9, placement.name);
      assert.true(Math.abs(inner.minZ - outer.minZ - wall.minZ) < 1e-9 && Math.abs(outer.maxZ - inner.maxZ - wall.maxZ) < 1e-9, placement.name);
      assert.true(Math.abs(wall.minX + wall.maxX + wall.minZ + wall.maxZ - Object.values(BUILDINGS[placement.name].wall).reduce((a, b) => a + b, 0)) < 1e-9, `${placement.name} has the same walls, turned`);
    }
  });

  QUnit.test("every building has measured walls, none further in than the steps at a front, and all of them in from the edge", (assert) => {
    for (const building of Object.values(BUILDINGS)) {
      assert.notStrictEqual(building.wall, undefined, building.file);
      for (const inset of Object.values(building.wall)) assert.true(inset >= 0 && inset <= 2.5, building.file);
      assert.true(Object.values(building.wall).some((inset) => inset > 0), building.file);
    }
  });

  QUnit.test("ledgeBoxes are the ground inside the walls of the buildings in two levels, from the ground up to the ledge", (assert) => {
    const ledges = ledgeBoxes(GRID, LAYOUTS);
    const placed = buildingPlacements(GRID, LAYOUTS).filter((placement) => placement.ledge > 0);
    assert.true(placed.length > 0);
    assert.strictEqual(ledges.length, placed.length);
    placed.forEach((placement, i) => {
      assert.strictEqual(ledges[i].name, `${placement.name} ledge`);
      assert.true(Math.abs(ledges[i].maxY - (placement.roof - placement.ledge)) < 1e-9);
      assert.deepEqual([ledges[i].minX, ledges[i].maxX], [wallFootprint(placement).minX, wallFootprint(placement).maxX]);
    });
  });
```

Things to notice:

- **A wall of the plan is a wall of the data**: the tests say that for each building, whichever way it faces, the walls are in from the footprint by the numbers measured, and that every building has measured walls (none further in than the steps of a front, and all of them in from the edge).
- **The steps at the front are tested by name**: the small_1 faces north once and south once, and the missing metres must be at its front in both.

Open `tests.html`. You should see **498 passing tests**: 2 more.

## Step 2: A fire escape

A fire escape is the thing that makes the district climbable from the street, and it is already in the kit, as three pieces: a **bottom** one (with a ladder that hangs down to the street), a **middle** one, and a **top** one. The middle one can be stacked as many times as a building is tall. The pieces were measured from above, a quarter of a metre at a time, to find what a runner would stand on: each has a **platform** 4.8 m across the wall and 1.94 m out from it, with a gap in it, and a **stair** of eight treads that goes up through the gap to the platform of the piece above. The platforms are 3.04 m apart, and the first is 3.31 m above the street.

That is all the controller needs to know. Each slab of a platform, and each tread of a stair, becomes a box, like a roof. The controller already hangs from the edge of a box, climbs onto it, and walks up a step less than its step height. It does all of that to a fire escape without a line changed.

### A frame for a thing on a wall

A fire escape stands on the wall of a building that faces north, or south, or east, or west, and the plan has all four. Writing it four times would be four chances to get one wrong, so it is described **once, in a frame**: *along* the wall and *out* from it. A thing in its frame is at (along, out), and the world is the same numbers, turned. Open `js/props.js` (the placeholder) and **replace the TODO line** with the first part of the file: the table of the pieces (`FIRE_ESCAPE`, `PLANTER`, `SILL`, `ROOF_FEATURES`), the middle of each piece, and the functions that turn a frame into the world:

```js
// Props: the things in the district that are not buildings, and that a runner can use. The fire escapes up the fronts of the buildings (made
// of three kit pieces, stacked), the planter at the foot of each that gives the first jump a start, the sills along a front to hang from, and
// the vents and huts on the roofs to vault and climb. Like the plan they are plain data and arithmetic (no Babylon.js): each is a few boxes of
// the same kind as the buildings' ({ name, minX, maxX, minY, maxY, minZ, maxZ }), so the controller needs to be taught nothing: it hangs from
// them, climbs them and stands on them the way it does a roof. See ../tests/props.tests.js.

// A fire escape. The kit makes it of three pieces: a bottom one (with a ladder that hangs down to the street), as many middle ones as there
// are floors, and a top one. They all have the same platform, 4.8 across and 1.94 out from the wall, with a stair in a gap in it that goes up
// to the platform of the piece above. All of it was measured from above, in a quarter of a metre at a time, and the numbers are in the
// frame of a piece: x along the wall, z out from it (the wall is at z = 0), y up from the platform. `floor` is how far apart the platforms are,
// and `base` how high the first one is above the street (the ladder just reaches it). The stair is eight treads that rise `rise` each, from
// `first` at the first. The stair is drawn a little nearer the wall than the kit has it, and narrower, so that a runner (which is a circle, nearly a metre across) can
// stand on the platform in front of it and climb onto it from the street.
const FIRE_ESCAPE = {
  bottom: "Prop_FireEscape_Bottom",
  center: "Prop_FireEscape_Center",
  top: "Prop_FireEscape_Top",
  width: 4.8,
  depth: 1.94,
  floor: 3.04,
  base: 3.31,
  thickness: 0.1,
  opening: { minX: -1, maxX: 1.1, minZ: 0, maxZ: 1 },
  stair: { minX: -0.9, tread: 0.25, count: 8, first: 0.38, rise: 0.33, minZ: 0.05, maxZ: 0.85 },
};

// Where the middle of the footprint of each piece is, in its own frame (along the wall, out from it): the library puts a piece with the middle of its
// footprint where it is asked to (see models.js), and the numbers above are from the wall.
const PIECE_CENTERS = {
  Prop_FireEscape_Bottom: { x: 0.105, z: 0.955 },
  Prop_FireEscape_Center: { x: 0, z: 0.955 },
  Prop_FireEscape_Top: { x: 0, z: 0.955 },
  Prop_Planter_Single: { x: 0, z: 0 },
  Trim_Wall_Guard: { x: 0, z: 0.06 },
};

// Where to put a kit piece that stands on a wall at `origin` (facing out by `turn` quarter turns), `y` up: { piece, x, y, z, rotationY }.
function pieceAt(file, origin, turn, y) {
  const center = PIECE_CENTERS[file];
  const at = frameToWorld(origin, turn, center.x, center.z);
  return { piece: file, x: at.x, y, z: at.z, rotationY: turn * (Math.PI / 2) };
}

// How a roof is reached from the top platform of a fire escape: it is walked onto (the roof is no more than a step higher), or climbed (it is
// higher than a step, and not higher than a runner's hands can reach from the platform). Anything between is too high to walk and too low to
// be worth a hang, and is not allowed: see `escapeFloors`.
const ESCAPE_RISE = { walk: 0.35, climb: 1.8, least: 0.8 };

// A planter at the foot of a fire escape, which is its size and how far out from the wall its middle is: under the edge of the platform it is
// too far under (a runner jumping from it would hit the platform), so it is just beyond.
const PLANTER = { width: 2, depth: 2, height: 0.6, out: 3.04, file: "Prop_Planter_Single" };

// A sill: a piece of the kit that is meant to be a trim on a wall (a balustrade), 2 across, 0.64 high and 0.12 deep, used as a ledge along a
// front. Each row is { u, count, y }: the middle of the row (u along the front, from the middle of it), how many pieces side by side, and the
// height of the tops of them.
const SILL = { width: 2, height: 0.64, depth: 0.12, file: "Trim_Wall_Guard" };

// The things on a roof, each of a size, and the colour it is drawn in. A vent is low enough to be vaulted, and a hut is low enough that the
// hands can catch the top of it from the roof, and climb: either of them gets the runner moving, or a step higher.
const ROOF_FEATURES = {
  vent: { width: 1, depth: 1, height: 1.2, color: "#3f5f4c" },
  hut: { width: 3, depth: 3, height: 2.4, color: "#4a4f5a" },
};

// A box of the given size, turned to face a way (a quarter turn at a time): its middle is at (x, z). `turn` is 0 for facing +z, and a
// quarter for each step round to the east (+x), south and west.
function turnedBox(name, x, z, width, depth, minY, maxY, turn) {
  const swap = turn % 2 === 1;
  const w = swap ? depth : width;
  const d = swap ? width : depth;
  return { name, minX: x - w / 2, maxX: x + w / 2, minY, maxY, minZ: z - d / 2, maxZ: z + d / 2 };
}

// The way a building's front faces, as a number of quarter turns: north 0, east 1, south 2, west 3.
function quarterTurns(facing) {
  return { north: 0, east: 1, south: 2, west: 3 }[facing];
}

// A point in the frame of something that stands on the wall of a building, at `origin` (x, z) facing out of it by `turn` quarter turns: where
// (along, out) is in the world. `along` runs along the wall to the right of the way it faces out, as a runner facing the wall would see it
// run to the left (and as x does for a building that faces north).
function frameToWorld(origin, turn, along, out) {
  const c = [1, 0, -1, 0][turn];
  const s = [0, 1, 0, -1][turn];
  return { x: origin.x + along * c + out * s, z: origin.z - along * s + out * c };
}

// A box in the frame of a piece (minX..maxX along the wall, minZ..maxZ out from it, heights from the platform) as a box in the world, for a
// piece standing on the ground at `y`.
function frameBox(name, origin, turn, y, box) {
  const a = frameToWorld(origin, turn, box.minX, box.minZ);
  const b = frameToWorld(origin, turn, box.maxX, box.maxZ);
  return {
    name,
    minX: Math.min(a.x, b.x),
    maxX: Math.max(a.x, b.x),
    minZ: Math.min(a.z, b.z),
    maxZ: Math.max(a.z, b.z),
    minY: y + box.minY,
    maxY: y + box.maxY,
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, pieceAt, PIECE_CENTERS };
} else {
  Object.assign(window, { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, pieceAt, PIECE_CENTERS });
}
```

Things to notice:

- **The numbers of the fire escape are measured, and they are in a table**: how wide, how far out, how far apart the floors, how high the first one is, where the gap and the stair are. Nothing about a fire escape is anywhere else.
- **`frameToWorld` is a turn.** For a building facing north, along is east and out is north. For one facing east, out is east and along is south, and so on: it is the same arithmetic as turning a model by `rotationY` (a test checks that it agrees with how the models are turned, for all four).
- **A box in the frame** (`frameBox`) is two corners turned and put the right way round (min below max), and so is a box in the world.
- **The library puts the middle of a piece's footprint where it is asked** (see `models.js`). The kit's pieces are not centred on their wall, so `PIECE_CENTERS` says where each piece's middle is in its own frame, and `pieceAt` puts a piece on a wall at the right place.
- **`ESCAPE_RISE` says how a roof is reached from the top platform**: walked onto (no more than a step higher), or climbed (no more than a mantle). Between is neither. A building's height decides this, so a test will check it for each building.

### Tests

Open `tests/props.tests.js` and **replace the TODO line** with:

```js
QUnit.module("frameToWorld", () => {
  const origin = { x: 10, z: 20 };

  QUnit.test("for something that faces north, along is east and out is north", (assert) => {
    assert.deepEqual(frameToWorld(origin, 0, 2, 3), { x: 12, z: 23 });
  });

  QUnit.test("facing east, out is east and along is south", (assert) => {
    assert.deepEqual(frameToWorld(origin, 1, 2, 3), { x: 13, z: 18 });
  });

  QUnit.test("facing south, out is south and along is west", (assert) => {
    assert.deepEqual(frameToWorld(origin, 2, 2, 3), { x: 8, z: 17 });
  });

  QUnit.test("facing west, out is west and along is north", (assert) => {
    assert.deepEqual(frameToWorld(origin, 3, 2, 3), { x: 7, z: 22 });
  });

  QUnit.test("it is a turn: the distance from the origin is the same whichever way it faces", (assert) => {
    for (let turn = 0; turn < 4; turn++) {
      const at = frameToWorld(origin, turn, 2, 3);
      assert.true(Math.abs(Math.hypot(at.x - origin.x, at.z - origin.z) - Math.hypot(2, 3)) < 1e-9, turn);
    }
  });

  QUnit.test("it agrees with how the models are turned: out is the way a piece faces after rotationY", (assert) => {
    for (const facing of ["north", "east", "south", "west"]) {
      const turn = quarterTurns(facing);
      const out = frameToWorld({ x: 0, z: 0 }, turn, 0, 1);
      assert.true(Math.abs(out.x - Math.sin(FACINGS[facing])) < 1e-9 && Math.abs(out.z - Math.cos(FACINGS[facing])) < 1e-9, facing);
    }
  });
});

QUnit.module("turnedBox", () => {
  QUnit.test("a box is centred where it is put, with the size it is given", (assert) => {
    const box = turnedBox("b", 5, -2, 4, 2, 0, 1, 0);
    assert.deepEqual([box.minX, box.maxX, box.minZ, box.maxZ, box.minY, box.maxY], [3, 7, -3, -1, 0, 1]);
    assert.strictEqual(box.name, "b");
  });

  QUnit.test("turned a quarter, the width and the depth change places", (assert) => {
    const box = turnedBox("b", 5, -2, 4, 2, 0, 1, 1);
    assert.deepEqual([box.minX, box.maxX, box.minZ, box.maxZ], [4, 6, -4, 0]);
  });

  QUnit.test("turned half way, it is the same box", (assert) => {
    assert.deepEqual(turnedBox("b", 5, -2, 4, 2, 0, 1, 2), turnedBox("b", 5, -2, 4, 2, 0, 1, 0));
  });
});

QUnit.module("frameBox", () => {
  const box = { minX: -1, maxX: 3, minZ: 0, maxZ: 2, minY: -0.1, maxY: 0 };

  QUnit.test("a box in the frame of a piece is a box in the world, standing at the height of the piece", (assert) => {
    const world = frameBox("b", { x: 10, z: 20 }, 0, 5, box);
    assert.deepEqual([world.minX, world.maxX, world.minZ, world.maxZ], [9, 13, 20, 22]);
    assert.true(Math.abs(world.minY - 4.9) < 1e-9 && world.maxY === 5);
  });

  QUnit.test("turned, the sides are still the right way round (min is less than max)", (assert) => {
    for (let turn = 0; turn < 4; turn++) {
      const world = frameBox("b", { x: 10, z: 20 }, turn, 5, box);
      assert.true(world.minX < world.maxX && world.minZ < world.maxZ, turn);
      assert.true(Math.abs(world.maxX - world.minX - (turn % 2 ? 2 : 4)) < 1e-9, turn);
    }
  });
});
```

Open `tests.html`. You should see **509 passing tests**: 11 more.

### A platform, and a stair

Now the shape of a piece. A platform is **three slabs round the gap for the stair**, as thin boxes whose top is the platform. The stair is eight treads, each a thin box, each higher than the last. In `js/props.js`, find the export block (lines 104 to 111) and **delete it**. Add this in its place, and the whole block of exports under it:

```js
// The boxes of one platform of a fire escape, in the frame of a piece: the platform (three slabs, round the gap for the stair) and, unless it
// is the top piece, the stair to the next platform up.
function platformBoxes(withStair, spec = FIRE_ESCAPE) {
  const t = spec.thickness;
  const o = spec.opening;
  const half = spec.width / 2;
  const boxes = [
    { minX: -half, maxX: o.minX, minZ: 0, maxZ: spec.depth, minY: -t, maxY: 0 },
    { minX: o.maxX, maxX: half, minZ: 0, maxZ: spec.depth, minY: -t, maxY: 0 },
    { minX: o.minX, maxX: o.maxX, minZ: o.maxZ, maxZ: spec.depth, minY: -t, maxY: 0 },
  ];
  if (withStair) {
    const s = spec.stair;
    for (let i = 0; i < s.count; i++) {
      const top = s.first + s.rise * i;
      boxes.push({ minX: s.minX + s.tread * i, maxX: s.minX + s.tread * (i + 1), minZ: s.minZ, maxZ: s.maxZ, minY: top - t, maxY: top });
    }
  }
  return boxes;
}

// How many platforms a fire escape has that reaches a roof at height `roof`: as many as there are (the first at `base` above the street, the others
// `floor` apart) that are not above the roof. It is the top platform that decides how the roof is reached (see ESCAPE_RISE).
function escapeFloors(roof, base = FIRE_ESCAPE.base, spec = FIRE_ESCAPE) {
  return Math.max(1, Math.floor((roof - base) / spec.floor + 1e-9) + 1);
}

// How high the top platform of a fire escape of `floors` platforms is.
function escapeTop(floors, base = FIRE_ESCAPE.base, spec = FIRE_ESCAPE) {
  return base + spec.floor * (floors - 1);
}

// How a runner on the top platform gets onto a roof at height `roof`: "walk", "climb", or null if it can't.
function escapeReach(rise) {
  if (rise <= ESCAPE_RISE.walk) return "walk";
  if (rise >= ESCAPE_RISE.least && rise <= ESCAPE_RISE.climb) return "climb";
  return null;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, platformBoxes, escapeFloors, escapeTop, escapeReach, pieceAt, PIECE_CENTERS };
} else {
  Object.assign(window, { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, platformBoxes, escapeFloors, escapeTop, escapeReach, pieceAt, PIECE_CENTERS });
}
```

Things to notice:

- **The stair is narrower than the kit's, and nearer the wall.** The runner is a circle nearly a metre across. The strip of platform in front of the stair, where a runner stands after climbing onto the platform from the street, has to be as wide as the runner is, or the stair is *in* the runner, and the climb is refused (the controller checks that there is room to stand). So the treads are drawn 0.15 m nearer the wall than the kit has them, and the gap in the platform is a little wider than the stair. A test says so: the strip is about a body wide, and a body on it is clear of the stair.
- **Each step of the stair is a step**: the first is a little *less* than the runner's step height (not equal: arithmetic on exactly equal heights is a coin toss), each is less than a step above the last, and the last is less than a step below the platform above. A test checks all three.
- **`escapeFloors` is how many platforms**: the first is `base` above the street, the others `floor` apart, and as many as are not above the roof. `escapeTop` is how high the top one is. How the roof is reached from there (`escapeReach`) is a question of the difference.

### Tests

At the end of `tests/props.tests.js` (below line 69) add:

```js
QUnit.module("platformBoxes", () => {
  const o = { ...SCOUT, ...BODY };

  QUnit.test("a platform is three slabs round the gap for the stair, all the way to the wall and out to the edge", (assert) => {
    const slabs = platformBoxes(false);
    assert.strictEqual(slabs.length, 3);
    for (const slab of slabs) {
      assert.true(slab.maxY === 0 && slab.minY < 0 && slab.maxY - slab.minY < 0.2, "thin, and its top at the platform");
      assert.true(slab.minX >= -FIRE_ESCAPE.width / 2 && slab.maxX <= FIRE_ESCAPE.width / 2 && slab.minZ >= 0 && slab.maxZ <= FIRE_ESCAPE.depth);
    }
  });

  QUnit.test("with a stair, there is a tread for each step, each higher than the last", (assert) => {
    const boxes = platformBoxes(true);
    assert.strictEqual(boxes.length, 3 + FIRE_ESCAPE.stair.count);
    const treads = boxes.slice(3);
    for (let i = 1; i < treads.length; i++) {
      assert.true(treads[i].maxY > treads[i - 1].maxY && treads[i].minX >= treads[i - 1].maxX - 1e-9, i);
    }
  });

  QUnit.test("each step of the stair is a step a runner can take, from the platform to the last, and from the last to the platform above", (assert) => {
    const treads = platformBoxes(true).slice(3);
    assert.true(treads[0].maxY < o.stepHeight, "the first, from the platform");
    for (let i = 1; i < treads.length; i++) assert.true(treads[i].maxY - treads[i - 1].maxY < o.stepHeight, i);
    assert.true(FIRE_ESCAPE.floor - treads[treads.length - 1].maxY < o.stepHeight, "the last, to the platform above");
  });

  QUnit.test("the stair is in the gap in the platform, and the gap in the platform above has a body's room: the stair is a wide as the gap allows", (assert) => {
    const s = FIRE_ESCAPE.stair;
    const g = FIRE_ESCAPE.opening;
    assert.true(s.minX >= g.minX && s.minX + s.tread * s.count <= g.maxX + 1e-9 && s.minZ >= g.minZ && s.maxZ <= g.maxZ);
    assert.true(g.maxZ - g.minZ >= o.radius * 2, "the gap is as wide as a runner");
  });

  QUnit.test("a runner standing on the platform at the front of the stair can climb it: the stair is no nearer the front than a body is wide", (assert) => {
    const back = platformBoxes(false).find((slab) => slab.minX === FIRE_ESCAPE.opening.minX);
    const s = FIRE_ESCAPE.stair;
    assert.true(back.maxZ - back.minZ >= o.radius * 2 - 0.1, "the strip at the front is about a body wide");
    assert.true(back.maxZ - o.radius - o.topOffset >= s.maxZ + o.radius - 1e-9, "a body that has climbed onto it is clear of the stair");
  });
});

QUnit.module("escapeFloors", () => {
  QUnit.test("there is a platform at the base, and one more for each floor that is not above the roof", (assert) => {
    assert.strictEqual(escapeFloors(FIRE_ESCAPE.base), 1);
    assert.strictEqual(escapeFloors(FIRE_ESCAPE.base + FIRE_ESCAPE.floor - 0.01), 1);
    assert.strictEqual(escapeFloors(FIRE_ESCAPE.base + FIRE_ESCAPE.floor), 2);
    assert.strictEqual(escapeFloors(FIRE_ESCAPE.base + FIRE_ESCAPE.floor * 5 + 1), 6);
  });

  QUnit.test("there is always at least the one", (assert) => {
    assert.strictEqual(escapeFloors(0), 1);
  });

  QUnit.test("the top platform is the base and a floor for each of the others", (assert) => {
    assert.strictEqual(escapeTop(1), FIRE_ESCAPE.base);
    assert.true(Math.abs(escapeTop(4) - (FIRE_ESCAPE.base + FIRE_ESCAPE.floor * 3)) < 1e-9);
    assert.strictEqual(escapeTop(3, 4), 4 + FIRE_ESCAPE.floor * 2);
  });
});

QUnit.module("escapeReach", () => {
  QUnit.test("a roof no higher than a step from the platform is walked onto, and a roof a body's hands can reach is climbed", (assert) => {
    assert.strictEqual(escapeReach(0), "walk");
    assert.strictEqual(escapeReach(ESCAPE_RISE.walk), "walk");
    assert.strictEqual(escapeReach(ESCAPE_RISE.least), "climb");
    assert.strictEqual(escapeReach(ESCAPE_RISE.climb), "climb");
  });

  QUnit.test("between, or above, it is neither", (assert) => {
    assert.strictEqual(escapeReach(ESCAPE_RISE.walk + 0.05), null);
    assert.strictEqual(escapeReach(ESCAPE_RISE.least - 0.05), null);
    assert.strictEqual(escapeReach(ESCAPE_RISE.climb + 0.05), null);
  });

  QUnit.test("the numbers agree with the runner's: a step is what it can step, and a climb is what it can mantle", (assert) => {
    assert.true(ESCAPE_RISE.walk <= BODY.stepHeight);
    assert.true(ESCAPE_RISE.least > BODY.stepHeight);
    assert.true(ESCAPE_RISE.climb <= BODY.mantleHeight);
  });
});
```

Open `tests.html`. You should see **520 passing tests**: 11 more.

### The fire escapes of the district

Now the plan says which buildings have one, and where along the front. Each entry of `LAYOUTS` gets three optional fields (all three are added now, so that the plan changes once): an **`escape`** (how far along the front from the middle, and how high the first platform is if it is not the usual one), **`sills`** (Step 3) and **`roof`** (Step 3). Open `js/plan.js` and find the table of layouts and the comment above it (lines 50 to 66). **Delete them**, and add:

```js
// What is on each block. `u` and `v` are where the middle of the building is, from the middle of the block (u to the east, v to
// the north). A building facing a street stands right up to the sidewalk, so only the place along the street is given, and the
// other is worked out. A building with both is put exactly there (the tower of a block stands in the middle).
// A building also has what is on it (see props.js): an `escape` is a fire escape up its front, `u` along the front from the middle of
// it (and `base`, how high the first platform is, if it is not the usual); `sills` is a row of ledges along the front: { u, count, y }, the
// middle of the row, how many pieces, and how high the tops are; and `roof` is a list of what is on the roof: { kind, u, v }, east and north of
// the middle of it.
const LAYOUTS = {
  "0,0": [
    { building: "small_1", facing: "north", u: -8.5, escape: { u: 2.5 }, sills: { u: -3, count: 2, y: 6.9 }, roof: [{ kind: "vent", u: -2, v: 2 }] },
    { building: "medium_1", facing: "north", u: 8, escape: { u: 2.5, base: 3.6 }, sills: { u: -3, count: 3, y: 6.9 } },
    { building: "medium_2", facing: "south", u: -7, escape: { u: 3 }, sills: { u: -3, count: 3, y: 6.9 }, roof: [{ kind: "hut", u: 3, v: 0 }, { kind: "vent", u: -3, v: 1 }] },
    { building: "small_1", facing: "south", u: 9, escape: { u: 2.5 }, sills: { u: -3, count: 2, y: 6.9 } },
  ],
  "1,0": [{ building: "large_1", facing: "north", u: 0, v: 0, escape: { u: 6 }, sills: { u: -6, count: 3, y: 6.9 }, roof: [{ kind: "hut", u: -5, v: 4 }, { kind: "vent", u: 4, v: -3 }, { kind: "vent", u: 6, v: 5 }] }],
  "0,1": [{ building: "large_3", facing: "north", u: -3.8, escape: { u: 5 }, sills: { u: -5, count: 3, y: 6.9 }, roof: [{ kind: "vent", u: 0, v: 0 }] }],
  "1,1": [
    { building: "large_2", facing: "north", u: -4.7, escape: { u: 4 }, sills: { u: -4, count: 3, y: 6.9 }, roof: [{ kind: "hut", u: 2, v: 2 }] },
    { building: "small_2", facing: "south", u: -5.3, escape: { u: 4 }, sills: { u: -4, count: 2, y: 6.9 }, roof: [{ kind: "vent", u: 0, v: 0 }] },
  ],
};
```

Every building of the district has a fire escape. They are on the front of each (the side that faces the street), and the number of floors is not in the table: it is worked out from the height of the building. Now `js/props.js`: delete the export block again (lines 143 to 150), and add this in its place:

```js
// The fire escapes of the district, one for each building that has an `escape` in its layout ({ u, base }: how far along the front from its
// middle, and the height of the first platform, which is the default if it is left out). Each is
// { name, building, x, z, turn, base, floors, top, rise, pieces, boxes, planter } where `pieces` are the kit pieces to draw (each
// { piece, x, y, z, rotationY }), `boxes` all the boxes to collide with, and `planter` is { piece, x, y, z, rotationY, box }.
function fireEscapes(grid = GRID, layouts = LAYOUTS) {
  const placements = buildingPlacements(grid, layouts);
  const entries = Object.values(layouts).flat();
  const found = [];
  placements.forEach((placement, index) => {
    const entry = entries[index];
    if (!entry.escape) return;
    const turn = quarterTurns(placement.facing);
    const walls = wallFootprint(placement);
    // The wall: its plane, in the world, is the side of the walls that the front faces.
    const origin = frameToWorld({ x: placement.x, z: placement.z }, turn, entry.escape.u, 0);
    if (turn === 0) origin.z = walls.maxZ;
    if (turn === 2) origin.z = walls.minZ;
    if (turn === 1) origin.x = walls.maxX;
    if (turn === 3) origin.x = walls.minX;
    const base = entry.escape.base || FIRE_ESCAPE.base;
    const roof = placement.roof - placement.ledge;
    const floors = escapeFloors(roof, base);
    const top = escapeTop(floors, base);
    const name = `${placement.name} fire escape`;
    const pieces = [];
    const boxes = [];
    for (let i = 0; i < floors; i++) {
      const y = base + FIRE_ESCAPE.floor * i;
      const last = i === floors - 1;
      pieces.push(pieceAt(i === 0 ? FIRE_ESCAPE.bottom : last ? FIRE_ESCAPE.top : FIRE_ESCAPE.center, origin, turn, y));
      for (const box of platformBoxes(!last)) boxes.push(frameBox(name, origin, turn, y, box));
    }
    const at = frameToWorld(origin, turn, 0, PLANTER.out);
    const planterBox = turnedBox(`${placement.name} planter`, at.x, at.z, PLANTER.width, PLANTER.depth, 0, PLANTER.height, turn);
    found.push({
      name,
      building: index,
      x: origin.x,
      z: origin.z,
      turn,
      base,
      floors,
      top,
      rise: roof - top,
      pieces,
      boxes,
      planter: { ...pieceAt(PLANTER.file, at, turn, 0), box: planterBox },
    });
  });
  return found;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, platformBoxes, escapeFloors, escapeTop, escapeReach, pieceAt, PIECE_CENTERS, fireEscapes };
} else {
  Object.assign(window, { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, platformBoxes, escapeFloors, escapeTop, escapeReach, pieceAt, PIECE_CENTERS, fireEscapes });
}
```

Things to notice:

- **`fireEscapes` is one function of the plan.** It takes each building that has an `escape`, finds the wall in front of it (`wallFootprint` says where: the side the front faces), works out how many platforms reach the roof, and makes the pieces to draw and the boxes to collide with. It also makes the **planter**: a box 0.6 m high, 2 across, on the sidewalk just beyond the edge of the first platform.
- **The roof it is for is the lower one, for a building in two levels.** The fire escape stops at the ledge round the upper roof; from there the runner jumps for the edge above, as it already could. The top platform is then within a step of the ledge (it is walked onto), or a mantle of it (it is climbed): the second building has a platform that is 0.34 m under the ledge, and its first platform is 3.6 m up and not 3.31, to make that so.
- **The planter is not under the platform.** A runner on it that jumped would hit the underside of the platform: boxes are walls to a body that is inside their height. It is just beyond the edge, so that a runner on the planter is where its hand reaches the edge of the platform.
- **Pieces are put with `pieceAt`**: the piece, turned to face the way the building does, with the middle of its footprint where the library puts it.

### Tests

At the end of `tests/props.tests.js` (below line 152) add:

```js
QUnit.module("fireEscapes", () => {
  const o = { ...SCOUT, ...BODY };
  const escapes = fireEscapes();
  const placed = buildingPlacements();

  QUnit.test("there is one for each building that has one in the plan, named for it", (assert) => {
    const wanted = Object.values(LAYOUTS).flat().filter((entry) => entry.escape);
    assert.strictEqual(escapes.length, wanted.length);
    assert.true(escapes.length >= 1);
    for (const escape of escapes) assert.strictEqual(escape.name, `${placed[escape.building].name} fire escape`);
  });

  QUnit.test("every building of the district has one, so that every roof can be reached from the street", (assert) => {
    assert.deepEqual(escapes.map((escape) => escape.building), placed.map((_, i) => i));
  });

  QUnit.test("it is on the wall at the front of its building, inside the width of it, with the whole of its width on the wall", (assert) => {
    for (const escape of escapes) {
      const walls = wallFootprint(placed[escape.building]);
      const half = FIRE_ESCAPE.width / 2;
      const turn = escape.turn;
      const along = turn % 2 === 0 ? [escape.x - half, escape.x + half, walls.minX, walls.maxX] : [escape.z - half, escape.z + half, walls.minZ, walls.maxZ];
      assert.true(along[0] >= along[2] - 1e-9 && along[1] <= along[3] + 1e-9, escape.name);
      const plane = [walls.maxZ, walls.maxX, walls.minZ, walls.minX][turn];
      assert.true(Math.abs((turn % 2 === 0 ? escape.z : escape.x) - plane) < 1e-9, `\${escape.name} is on the wall`);
    }
  });

  QUnit.test("it sticks out into the street, in front of the building: it is not in the wall of its building, and not in another", (assert) => {
    const inside = (a, b) => Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 0.01 && Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 0.01;
    for (const escape of escapes) {
      for (const box of escape.boxes) {
        for (const [i, roof] of buildingBoxes().entries()) assert.false(inside(box, roof), `${escape.name} is not in the ${roof.name} (${i})`);
      }
    }
  });

  QUnit.test("the first platform is where the planter, and a jump, reach it, and a body is not hit on the head on the way", (assert) => {
    for (const escape of escapes) {
      const reach = escape.base - escape.planter.box.maxY;
      assert.true(reach < jumpHeight(o) + o.handReach - 0.2, `\${escape.name}: \${reach.toFixed(2)} m from the planter`);
      assert.true(reach > o.handLow, escape.name);
    }
  });

  QUnit.test("the top platform is under the roof, and the roof is walked onto or climbed onto from it", (assert) => {
    for (const escape of escapes) {
      assert.true(escape.top <= placed[escape.building].roof - placed[escape.building].ledge + 1e-9, escape.name);
      assert.notStrictEqual(escapeReach(escape.rise), null, `\${escape.name}: \${escape.rise.toFixed(2)} m up to the roof`);
    }
  });

  QUnit.test("there is a platform for each floor, a piece of the kit for each, with a bottom, a top and the middle ones between", (assert) => {
    for (const escape of escapes) {
      assert.strictEqual(escape.pieces.length, escape.floors, escape.name);
      assert.strictEqual(escape.pieces[0].piece, FIRE_ESCAPE.bottom);
      if (escape.floors > 1) assert.strictEqual(escape.pieces[escape.floors - 1].piece, FIRE_ESCAPE.top);
      for (const piece of escape.pieces.slice(1, -1)) assert.strictEqual(piece.piece, FIRE_ESCAPE.center);
      escape.pieces.forEach((piece, i) => assert.true(Math.abs(piece.y - (escape.base + FIRE_ESCAPE.floor * i)) < 1e-9));
    }
  });

  QUnit.test("each platform has its slabs, and all but the top have the stair too", (assert) => {
    for (const escape of escapes) {
      assert.strictEqual(escape.boxes.length, 3 * escape.floors + FIRE_ESCAPE.stair.count * (escape.floors - 1), escape.name);
    }
  });

  QUnit.test("the planter is on the sidewalk, not in the road, as far out as it must be", (assert) => {
    for (const escape of escapes) {
      const box = escape.planter.box;
      assert.strictEqual(box.maxY - box.minY, PLANTER.height);
      assert.true(PLANTER.height > o.stepHeight && PLANTER.height <= o.mantleHeight, "a mantle");
      const middle = { x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 };
      assert.strictEqual(groundHeight(middle.x, middle.z), 0, `\${escape.name}: the middle of the planter is on the sidewalk`);
      assert.false(buildingBoxes().some((roof) => boxGap(box, roof).overlap), escape.name);
    }
  });

  QUnit.test("the planter is next to the edge of the platform: near enough that a hand reaches it from the planter", (assert) => {
    for (const escape of escapes) {
      const edge = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 0, FIRE_ESCAPE.depth);
      const box = escape.planter.box;
      const near = Math.hypot(Math.max(box.minX - edge.x, 0, edge.x - box.maxX), Math.max(box.minZ - edge.z, 0, edge.z - box.maxZ));
      assert.true(near < o.grabDistance, `${escape.name}: the planter is ${near.toFixed(2)} m from the edge`);
    }
  });

  QUnit.test("pieces are placed with the middle of their footprint where the library puts it, and turned to face the way the building does", (assert) => {
    for (const escape of escapes) {
      for (const piece of escape.pieces) assert.true(Math.abs(piece.rotationY - escape.turn * (Math.PI / 2)) < 1e-9);
    }
  });
});
```

Things to notice:

- **Every building has one**, so that every roof can be reached from the street.
- **A fire escape is on the wall of its building, inside the width of it, in the street, and not in the wall or in another building** (it must stick out, and the boxes are the plan's own, so the test is a fact of the data).
- **The first platform is within reach of a jump from the planter** (less than a jump and a hand's reach, with 0.2 m to spare), and the planter is a mantle for a runner (more than a step, no more than a mantle).
- **The top platform is under the roof, and the roof is walked onto or climbed**: `escapeReach` says one of the two, for every building. This is what decides how many floors a building's fire escape has, and a building that is a metre too tall for it is a test that fails, not a runner stuck on a platform.

Open `tests.html`. You should see **531 passing tests**: 11 more.

## Step 3: Sills, and things on the roofs

Two more kinds of thing, made the same way, from the same table.

**A sill** is a row of ledges along the front of a building. The kit has a trim for the wall (`Trim_Wall_Guard`: a balustrade 2 m across, 0.64 high, a hand's breadth deep) and a row of them, side by side, is a ledge a runner can hang from and **shimmy along**, from the end of one piece to the next, because they touch. It is too thin to climb (there is no room on top) so it is for hanging. Every front has a row, with the tops at 6.9 m: higher than a runner can reach from the street, and a little above the second platform of the fire escape, beside it.

**A thing on a roof** is a plain box drawn in a colour: a **vent** (1 m, 1.2 high: low enough to vault and thin enough) and a **hut** (3 m, 2.4 high: too high to mantle from the roof, so it is jumped at, and the hands catch the top). These do what the yard did, but on the roofs, where the runner is going anyway.

In `js/props.js`, delete the export block (lines 195 to 202) and add this in its place:

```js
// The sills along the fronts of the buildings that have them (`sills` in the layout: { u, count, y }), as boxes, one for each piece of the row.
// Each is { name, minX, maxX, minY, maxY, minZ, maxZ, piece }, `piece` being where to put the kit piece ({ piece, x, y, z, rotationY }). The
// pieces stand on the wall, and are a hand's breadth deep: a ledge to hang from and shimmy along.
function sills(grid = GRID, layouts = LAYOUTS) {
  const placements = buildingPlacements(grid, layouts);
  const entries = Object.values(layouts).flat();
  const found = [];
  placements.forEach((placement, index) => {
    const entry = entries[index];
    if (!entry.sills) return;
    const turn = quarterTurns(placement.facing);
    const walls = wallFootprint(placement);
    const { u, count, y } = entry.sills;
    for (let i = 0; i < count; i++) {
      const along = u + (i - (count - 1) / 2) * SILL.width;
      const origin = frameToWorld({ x: placement.x, z: placement.z }, turn, along, 0);
      if (turn === 0) origin.z = walls.maxZ;
      if (turn === 2) origin.z = walls.minZ;
      if (turn === 1) origin.x = walls.maxX;
      if (turn === 3) origin.x = walls.minX;
      const middle = frameToWorld(origin, turn, 0, SILL.depth / 2);
      const box = turnedBox(`${placement.name} sill`, middle.x, middle.z, SILL.width, SILL.depth, y - SILL.height, y, turn);
      found.push({ ...box, piece: pieceAt(SILL.file, origin, turn, y - SILL.height) });
    }
  });
  return found;
}

// The things on the roofs (`roof` in the layout: a list of { kind, u, v } where kind is a key of ROOF_FEATURES, and u and v are east and
// north of the middle of the roof), as boxes standing on it, each { name, kind, minX, maxX, minY, maxY, minZ, maxZ, color }.
function roofThings(grid = GRID, layouts = LAYOUTS) {
  const placements = buildingPlacements(grid, layouts);
  const boxes = buildingBoxes(grid, layouts);
  const entries = Object.values(layouts).flat();
  const found = [];
  placements.forEach((placement, index) => {
    for (const thing of entries[index].roof || []) {
      const kind = ROOF_FEATURES[thing.kind];
      const roof = boxes[index];
      const x = (roof.minX + roof.maxX) / 2 + thing.u;
      const z = (roof.minZ + roof.maxZ) / 2 + thing.v;
      found.push({ ...turnedBox(`${placement.name} ${thing.kind}`, x, z, kind.width, kind.depth, 0, 0, 0), minY: placement.roof, maxY: placement.roof + kind.height, kind: thing.kind, color: kind.color });
    }
  });
  return found;
}

// Everything in the district to stand on, hang from and climb that is not a building, as boxes: the fire escapes, their planters, the sills and the
// things on the roofs.
function propBoxes(grid = GRID, layouts = LAYOUTS) {
  return [...fireEscapes(grid, layouts).flatMap((escape) => [...escape.boxes, escape.planter.box]), ...sills(grid, layouts), ...roofThings(grid, layouts)];
}

// The files the props need, once each: for loading them.
function propPieces(grid = GRID, layouts = LAYOUTS) {
  const wanted = new Set();
  for (const escape of fireEscapes(grid, layouts)) {
    for (const piece of escape.pieces) wanted.add(piece.piece);
    wanted.add(PLANTER.file);
  }
  if (sills(grid, layouts).length > 0) wanted.add(SILL.file);
  return [...wanted];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, platformBoxes, escapeFloors, escapeTop, escapeReach, pieceAt, PIECE_CENTERS, fireEscapes, sills, roofThings, propBoxes, propPieces };
} else {
  Object.assign(window, { FIRE_ESCAPE, ESCAPE_RISE, PLANTER, SILL, ROOF_FEATURES, turnedBox, quarterTurns, frameToWorld, frameBox, platformBoxes, escapeFloors, escapeTop, escapeReach, pieceAt, PIECE_CENTERS, fireEscapes, sills, roofThings, propBoxes, propPieces });
}
```

Things to notice:

- **`sills` and `roofThings` read the plan the way `fireEscapes` does**: the entries of the layout, in the order of the buildings, each with its own optional field.
- **A roof thing is placed east and north of the middle of the roof** (`u` and `v`, in the world, not in the frame: a roof has no front), standing on it, with its size from the table.
- **`propBoxes` is everything a runner stands on, hangs from and climbs that is not a building**: the fire escapes, the planters, the sills and the roof things. The game puts them in the world and in the ledges, and the controller does the rest.
- **`propPieces` is the list of kit files these need**, once each, for loading.

### Tests

At the end of `tests/props.tests.js` (below line 247) add:

```js
QUnit.module("sills", () => {
  const all = sills();

  QUnit.test("there is a piece for each in the rows of the plan", (assert) => {
    const wanted = Object.values(LAYOUTS).flat().reduce((sum, entry) => sum + (entry.sills ? entry.sills.count : 0), 0);
    assert.strictEqual(all.length, wanted);
    assert.true(all.length > 0);
  });

  QUnit.test("each is the size of the piece, and its top is where the plan says", (assert) => {
    for (const sill of all) {
      assert.true(Math.abs(sill.maxY - sill.minY - SILL.height) < 1e-9);
      const wide = sill.maxX - sill.minX;
      const deep = sill.maxZ - sill.minZ;
      assert.true((Math.abs(wide - SILL.width) < 1e-9 && Math.abs(deep - SILL.depth) < 1e-9) || (Math.abs(deep - SILL.width) < 1e-9 && Math.abs(wide - SILL.depth) < 1e-9));
    }
  });

  QUnit.test("each is under the roof of its building, and above where a runner can reach from the street", (assert) => {
    const placed = buildingPlacements();
    for (const sill of all) {
      const placement = placed.find((p) => sill.name === `${p.name} sill`);
      assert.notStrictEqual(placement, undefined, sill.name);
      assert.true(sill.maxY < placement.roof, "under the roof");
      assert.true(sill.minY > ESCAPE_RISE.climb, "above a runner's reach from the ground");
    }
  });

  QUnit.test("they are a row of ledges: from the end of one a runner can shimmy on to the next, because they touch", (assert) => {
    let next = 0;
    for (const entry of Object.values(LAYOUTS).flat()) {
      if (!entry.sills) continue;
      const row = all.slice(next, next + entry.sills.count);
      next += entry.sills.count;
      for (let i = 1; i < row.length; i++) assert.true(boxGap(row[i - 1], row[i]).gap < 0.01, `${row[i].name} ${i}`);
    }
  });
});

QUnit.module("roofThings", () => {
  const o = { ...SCOUT, ...BODY };
  const things = roofThings();

  QUnit.test("there is one for each in the plan, and every kind is a kind", (assert) => {
    const wanted = Object.values(LAYOUTS).flat().reduce((sum, entry) => sum + (entry.roof ? entry.roof.length : 0), 0);
    assert.strictEqual(things.length, wanted);
    for (const thing of things) assert.true(thing.kind in ROOF_FEATURES);
  });

  QUnit.test("each stands on the roof of its building, inside the edge of it, with its size", (assert) => {
    const roofs = buildingBoxes();
    const placed = buildingPlacements();
    for (const thing of things) {
      const index = placed.findIndex((placement) => thing.name.startsWith(placement.name) && thing.minY === placement.roof && boxGap(thing, roofs[placed.indexOf(placement)]).overlap);
      assert.true(index >= 0, thing.name);
      const roof = roofs[index];
      assert.true(thing.minX >= roof.minX + RIM_WIDTH && thing.maxX <= roof.maxX - RIM_WIDTH && thing.minZ >= roof.minZ + RIM_WIDTH && thing.maxZ <= roof.maxZ - RIM_WIDTH, `\${thing.name} is not on the raised edge`);
      assert.true(Math.abs(thing.maxY - thing.minY - ROOF_FEATURES[thing.kind].height) < 1e-9);
    }
  });

  QUnit.test("a vent is a wall to vault, and a hut is a ledge to climb to, with a jump", (assert) => {
    const vent = ROOF_FEATURES.vent;
    assert.true(vent.height > o.stepHeight && vent.height <= o.vaultHeight && vent.depth <= o.vaultDepth && vent.width <= o.vaultDepth);
    const hut = ROOF_FEATURES.hut;
    assert.true(hut.height > o.mantleHeight, "too high to mantle from the ground");
    assert.true(hut.height < jumpHeight(o) + o.handReach, "and a jump gets the hands to it");
  });

  QUnit.test("none touch each other, and each has a colour", (assert) => {
    things.forEach((thing, i) => {
      assert.true(/^#[0-9a-f]{6}$/i.test(thing.color), thing.name);
      for (let j = i + 1; j < things.length; j++) assert.false(boxGap(thing, things[j]).overlap && thing.minY === things[j].minY, `\${thing.name} and \${things[j].name}`);
    });
  });
});

QUnit.module("propBoxes and propPieces", () => {
  QUnit.test("propBoxes are the boxes of the fire escapes, the planters, the sills and what is on the roofs", (assert) => {
    const expected = fireEscapes().reduce((sum, escape) => sum + escape.boxes.length + 1, 0) + sills().length + roofThings().length;
    assert.strictEqual(propBoxes().length, expected);
  });

  QUnit.test("every box is a box: its sides are the right way round, and it has a name", (assert) => {
    for (const box of propBoxes()) {
      assert.true(box.minX < box.maxX && box.minZ < box.maxZ && box.minY < box.maxY && typeof box.name === "string", box.name);
    }
  });

  QUnit.test("no box is under the ground", (assert) => {
    for (const box of propBoxes()) assert.true(box.minY >= 0, box.name);
  });

  QUnit.test("propPieces lists the three pieces of a fire escape, the planter and the sill, once each", (assert) => {
    const wanted = propPieces();
    assert.strictEqual(new Set(wanted).size, wanted.length);
    for (const file of [FIRE_ESCAPE.bottom, FIRE_ESCAPE.center, FIRE_ESCAPE.top, PLANTER.file, SILL.file]) assert.true(wanted.includes(file), file);
  });

  QUnit.test("every piece has a middle that is known", (assert) => {
    for (const file of propPieces()) assert.notStrictEqual(PIECE_CENTERS[file], undefined, file);
  });
});
```

Things to notice:

- **A vent is a wall to vault and a hut is a ledge to climb to**: the tests say it with the runner's numbers (`vaultHeight`, `vaultDepth`, `mantleHeight`, the height of a jump plus the reach of a hand), so changing a number of the runner that makes a vent too high for a vault is a failing test.
- **Sills are above a runner's reach from the ground, and under the roof**, and a row of them touches end to end: the places a shimmy could stop are tested.
- **Every kit piece has a known middle**: a piece that is in `propPieces` and not in `PIECE_CENTERS` would be put in the wrong place.

Open `tests.html`. You should see **544 passing tests**: 13 more.

## Step 4: A bot that plays the game

Everything so far can be checked by looking at it, and that is not good enough: a fire escape that is a few centimetres too far from a wall, a roof too high to climb from the top platform, a gap that is a metre wider than a jump, and the district is a place where some of it can't be got to, and nobody knows until someone tries. So a **bot** tries: it is the real `Controller`, in the real boxes, with the numbers of the real runner, given a goal and keys to press. If a change to any of those makes a route impossible, a test fails.

### Crossings

First, the jumps the district is designed to have. In `js/plan.js`, from the bottom up: in the two export lists at the end (line 375 and line 377) add `CROSSINGS` after `ledgeSpot,`; then find the line `// The training yard:` (line 278) and add above it the table of crossings:

```js
// The jumps from one roof to another that the district is designed to have, each { from, to }: the numbers of two buildings (in the order of
// buildingPlacements), the roof of the first (the upper roof, for a building in two levels) to the roof of the second. The runner can do each with a
// run and a jump (see reach.js, which plays them, and the tests, which say so). The gaps are metres wide, and always downward: the way up is a fire escape.
const CROSSINGS = [
  { from: 2, to: 0 },
  { from: 2, to: 3 },
  { from: 1, to: 0 },
  { from: 1, to: 3 },
  { from: 6, to: 7 },
];
```

Things to notice:

- **A crossing is `{ from, to }`**: two buildings, by their number in `buildingPlacements`, and the roof of the first (the upper roof, for a building in two levels) to the roof of the second.
- **They are all downward.** The way up is the fire escape. A jump over a gap to a roof that is *higher* is not designed, and a test says it isn't: the bot tries every pair, and the ones that go up (or are far) must fail.
- **They are the gaps of block 0, and one of block 1**: 2.4 to 5.6 m wide, as the buildings stand. The district was not moved to make them: they are what the plan already had, found and proved.

### The bot jumps

Open `js/reach.js` (the placeholder) and **replace the TODO line** with:

```js
// Reach: a check that the places of the district can be got to. It plays the game, with a bot in place of a player: it puts a runner on one roof,
// runs it at another, jumps at the edge, and says whether the runner ended up standing on the other roof; or it takes a runner up a fire escape,
// from the street to the roof. The same Controller, the same numbers, the same boxes as the game: so a change to any of them (a wider gap, a slower
// jump, a taller wall) that makes a route impossible makes a test fail, and nobody has to walk it to find out. See ../tests/reach.tests.js.

// How the bot plays a jump: how far back from the edge it starts its run, how far ahead it looks for the edge (the jump key goes down where the
// ground a little ahead is a long way down), how far down is a long way, and how long it has, in seconds, before it gives up.
const BOT = { runUp: 6, lookAhead: 0.7, drop: 0.5, time: 6, dt: 1 / 60 };

// How far one roof is from another, as the line between their nearest points: { from: { x, z }, to: { x, z }, distance, dx, dz }, with (dx, dz) the
// unit vector from one to the other (for roofs that touch, from the middle of one to the middle of the other). The roofs are boxes { minX, maxX, minZ, maxZ }.
function approach(a, b) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const middle = { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
  const near = { x: clamp(middle.x, a.minX, a.maxX), z: clamp(middle.z, a.minZ, a.maxZ) };
  const to = { x: clamp(near.x, b.minX, b.maxX), z: clamp(near.z, b.minZ, b.maxZ) };
  const from = { x: clamp(to.x, a.minX, a.maxX), z: clamp(to.z, a.minZ, a.maxZ) };
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  // Roofs that touch have no line between them: the way is from the middle of one to the middle of the other.
  const aim = distance > 0 ? { x: to.x - from.x, z: to.z - from.z } : { x: middle.x - (a.minX + a.maxX) / 2, z: middle.z - (a.minZ + a.maxZ) / 2 };
  const length = Math.hypot(aim.x, aim.z) || 1;
  return { from, to, distance, dx: aim.x / length, dz: aim.z / length };
}

// Whether a point is over a box, with `margin` to spare (negative is inside it by that much).
function isOver(box, x, z, margin = 0) {
  return x >= box.minX - margin && x <= box.maxX + margin && z >= box.minZ - margin && z <= box.maxZ + margin;
}

// The unit vector from the body toward a point, or null if it is there.
function steerTo(body, point) {
  const dx = point.x - body.x;
  const dz = point.z - body.z;
  const distance = Math.hypot(dx, dz);
  return distance < 1e-6 ? null : { x: dx / distance, z: dz / distance };
}

// Where a run at one roof from another begins: { x, y, z, heading, dx, dz }, on the roof `from`, as far back from the edge nearest `to` as there is
// roof for, but not further than `runUp`, facing the way to go.
function crossingStart(from, to, runUp = BOT.runUp) {
  const line = approach(from, to);
  let back = runUp;
  while (back > 0 && !isOver(from, line.from.x - line.dx * back, line.from.z - line.dz * back, -0.6)) back -= 0.25;
  return { x: line.from.x - line.dx * back, y: from.maxY, z: line.from.z - line.dz * back, heading: Math.atan2(line.dx, line.dz), dx: line.dx, dz: line.dz };
}

// Plays one crossing: a runner on the roof `from` runs at the roof `to` (both boxes { minX, maxX, minY, maxY, minZ, maxZ }, a roof being where
// the top of the box is). `world` and `ledges` are the game's. It says how it went, { landed, how, time }: `landed` is whether the runner ended up
// standing on `to`, and `how` is "jump", "climb" (it caught the edge, and climbed up), or "fell" or "stayed" if it did not get there.
function playCrossing(world, ledges, from, to, options = {}) {
  const { runUp, lookAhead, drop, time, dt } = { ...BOT, ...options.bot };
  const start = crossingStart(from, to, runUp);
  const body = new Controller({ x: start.x, z: start.z, y: start.y, heading: start.heading, world, ledges, options: options.body });
  const direction = { x: start.dx, z: start.dz };
  let jumped = false;
  let climbed = false;
  for (let t = 0; t < time; t += dt) {
    // The key goes down where the ground ends: the ground a little ahead is a long way down. Then it is held while the runner rises.
    const ahead = world.supportAt(body.x + direction.x * lookAhead, body.z + direction.z * lookAhead, 0, body.y + 0.01);
    const edge = body.grounded && ahead < body.y - drop;
    if (edge) jumped = true;
    body.update(direction, true, dt, edge || (jumped && !body.grounded && body.vy > 0));
    if (body.hang && body.hang.climb !== null) climbed = true;
    if (body.grounded && body.move === null && isOver(to, body.x, body.z, 0.1) && Math.abs(body.y - to.maxY) < 0.6) {
      return { landed: true, how: climbed ? "climb" : "jump", time: t };
    }
    if (body.y < Math.min(from.maxY, to.maxY) - 4) return { landed: false, how: "fell", time: t };
  }
  return { landed: false, how: "stayed", time };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOT, approach, isOver, steerTo, crossingStart, playCrossing };
} else {
  Object.assign(window, { BOT, approach, isOver, steerTo, crossingStart, playCrossing });
}
```

Things to notice:

- **`approach` is the line between the two roofs**: their nearest points, how far apart (zero if they touch), and the unit vector from one to the other. Two boxes are all it needs.
- **`crossingStart` is where a run begins**: as far back from the edge nearest the other roof as there is roof for, up to 6 m, facing the other roof. It is also what the developer panel's "Go to a crossing" takes the runner to.
- **`playCrossing` is a player with one rule**: run at the other roof (with sprint held), and press jump where the ground ends (the ground a little way ahead is a long way below), and keep it held while rising. It says how it ended: `landed`, and `how` (`"jump"`, `"climb"` if it caught the edge and climbed, `"fell"` or `"stayed"`).
- **It runs the controller as it is**: `playCrossing(world, ledges, from, to, { body: { sprintSpeed: 3 } })` is the same runner with a slower sprint. The test that says a slower runner can't cross what a faster one can is this.
- **The hands count**: a gap a little too far for the jump is crossed by catching the far edge and climbing it. The bot finds those (the grab, the hang, the climb are all the controller's), which is why a flat gap that is more than the jump, but not more than six and a half metres or so, is crossed.

### Tests

Open `tests/reach.tests.js` and **replace the TODO line** with:

```js
QUnit.module("approach", () => {
  const a = { minX: 0, maxX: 10, minZ: 0, maxZ: 10 };

  QUnit.test("two roofs side by side are as far apart as the gap, along x, and the line goes from the one to the other", (assert) => {
    const line = approach(a, { minX: 14, maxX: 20, minZ: 2, maxZ: 8 });
    assert.strictEqual(line.distance, 4);
    assert.deepEqual([line.dx, line.dz], [1, 0]);
    assert.strictEqual(line.from.x, 10);
    assert.strictEqual(line.to.x, 14);
  });

  QUnit.test("it is the same the other way, turned round", (assert) => {
    const line = approach({ minX: 14, maxX: 20, minZ: 2, maxZ: 8 }, a);
    assert.strictEqual(line.distance, 4);
    assert.deepEqual([line.dx, line.dz], [-1, 0]);
  });

  QUnit.test("along z, too", (assert) => {
    const line = approach(a, { minX: 3, maxX: 6, minZ: -7, maxZ: -3 });
    assert.strictEqual(line.distance, 3);
    assert.deepEqual([line.dx, line.dz], [0, -1]);
  });

  QUnit.test("at a corner, the line goes from corner to corner", (assert) => {
    const line = approach(a, { minX: 13, maxX: 20, minZ: 14, maxZ: 20 });
    assert.strictEqual(line.distance, 5);
    assert.true(Math.abs(line.dx - 0.6) < 1e-9 && Math.abs(line.dz - 0.8) < 1e-9);
  });

  QUnit.test("roofs that touch are no distance apart", (assert) => {
    assert.strictEqual(approach(a, { minX: 10, maxX: 12, minZ: 0, maxZ: 10 }).distance, 0);
  });
});

QUnit.module("isOver and steerTo", () => {
  const box = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };

  QUnit.test("a point is over a box if it is inside, with a margin if there is one", (assert) => {
    assert.true(isOver(box, 2, 2));
    assert.false(isOver(box, 4.1, 2));
    assert.true(isOver(box, 4.1, 2, 0.2));
    assert.false(isOver(box, 0.5, 2, -0.6), "a negative margin is a margin inside");
  });

  QUnit.test("steering is the unit vector toward a point, and nothing at it", (assert) => {
    assert.deepEqual(steerTo({ x: 0, z: 0 }, { x: 0, z: 5 }), { x: 0, z: 1 });
    const d = steerTo({ x: 1, z: 1 }, { x: 4, z: 5 });
    assert.true(Math.abs(d.x - 0.6) < 1e-9 && Math.abs(d.z - 0.8) < 1e-9);
    assert.strictEqual(steerTo({ x: 1, z: 1 }, { x: 1, z: 1 }), null);
  });
});

QUnit.module("crossingStart", () => {
  const a = { minX: 0, maxX: 20, minY: 0, maxY: 10, minZ: 0, maxZ: 10 };
  const b = { minX: 24, maxX: 30, minY: 0, maxY: 10, minZ: 0, maxZ: 10 };

  QUnit.test("it starts on the roof, a run-up back from the edge, facing the other roof", (assert) => {
    const start = crossingStart(a, b);
    assert.strictEqual(start.y, 10);
    assert.true(Math.abs(start.x - (20 - BOT.runUp)) < 1e-9);
    assert.true(Math.abs(Math.sin(start.heading) - 1) < 1e-9, "east");
    assert.true(isOver(a, start.x, start.z));
  });

  QUnit.test("on a roof that is not so long, it starts at the far end of it", (assert) => {
    const small = { ...a, maxX: 3 };
    const start = crossingStart(small, { ...b, minX: 7, maxX: 12 });
    assert.true(isOver(small, start.x, start.z), "still on the roof");
    assert.true(start.x < 3 - 0.5);
  });
});

QUnit.module("playCrossing", () => {
  const o = { ...SCOUT, ...BODY };
  const roof = (minX, maxX, top) => ({ name: "roof", minX, maxX, minY: 0, maxY: top, minZ: 0, maxZ: 10 });
  const cross = (a, b) => playCrossing(new World({ boxes: [a, b], ground: () => 0 }), ledgesOf([a, b]), a, b);

  QUnit.test("a gap a runner can jump is crossed: the runner ends up standing on the other roof", (assert) => {
    const result = cross(roof(0, 10, 10), roof(13, 23, 10));
    assert.true(result.landed);
    assert.strictEqual(result.how, "jump");
  });

  QUnit.test("a gap that is further than a sprinting jump and the hands that catch the edge is not crossed: the runner falls between the roofs", (assert) => {
    const result = cross(roof(0, 10, 10), roof(18, 28, 10));
    assert.false(result.landed);
    assert.strictEqual(result.how, "fell");
  });

  QUnit.test("a gap a little too far to jump is crossed by the hands: the runner catches the edge of the other roof, and climbs", (assert) => {
    const result = cross(roof(0, 10, 10), roof(16, 26, 10));
    assert.true(result.landed);
    assert.strictEqual(result.how, "climb");
  });

  QUnit.test("a roof that is lower is further to jump to: a drop adds to the reach", (assert) => {
    assert.false(cross(roof(0, 10, 10), roof(18, 28, 10)).landed);
    assert.true(cross(roof(0, 10, 10), roof(18, 28, 4)).landed);
  });

  QUnit.test("a roof that is a little higher is reached by catching the edge, and climbing", (assert) => {
    const result = cross(roof(0, 10, 10), roof(12, 22, 12));
    assert.true(result.landed);
    assert.strictEqual(result.how, "climb");
  });

  QUnit.test("a roof that is much higher is not reached", (assert) => {
    assert.false(cross(roof(0, 10, 10), roof(12, 22, 18)).landed);
  });

  QUnit.test("roofs that touch are walked across", (assert) => {
    const a = roof(0, 10, 10);
    const b = { ...roof(10, 20, 10), maxZ: 10 };
    const result = playCrossing(new World({ boxes: [a, b], ground: () => 0 }), [], a, b);
    assert.true(result.landed);
  });

  QUnit.test("it plays by the numbers of the runner it is given: a slower runner can't cross what a faster one can", (assert) => {
    const a = roof(0, 10, 10);
    const b = roof(15, 25, 10);
    const world = new World({ boxes: [a, b], ground: () => 0 });
    assert.true(playCrossing(world, ledgesOf([a, b]), a, b).landed);
    assert.false(playCrossing(world, ledgesOf([a, b]), a, b, { body: { sprintSpeed: 3 } }).landed);
  });
});

QUnit.module("the roofs of the district", () => {
  const boxes = buildingBoxes();
  const lower = ledgeBoxes();
  const world = new World({ boxes: [...boxes, ...lower, ...rimBoxes(), ...propBoxes()], ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...boxes, ...lower, ...propBoxes()]);

  for (const { from, to } of CROSSINGS) {
    QUnit.test(`from the roof of building ${from} to the roof of building ${to} can be crossed with a run and a jump`, (assert) => {
      const result = playCrossing(world, ledges, boxes[from], boxes[to]);
      assert.true(result.landed, `${boxes[from].name} to ${boxes[to].name}: ${result.how}`);
    });
  }

  QUnit.test("a gap of the district that is not in the list of crossings is one that it is not designed to cross: every gap on the list is one that could be", (assert) => {
    const listed = new Set(CROSSINGS.map(({ from, to }) => `${from}>${to}`));
    for (let from = 0; from < boxes.length; from++) {
      for (let to = 0; to < boxes.length; to++) {
        if (from === to || listed.has(`${from}>${to}`)) continue;
        const result = playCrossing(world, ledges, boxes[from], boxes[to]);
        // a roof that is lower, and not far, is in the list; one that is higher, or far, is reached some other way: by the fire escape
        if (boxes[to].maxY >= boxes[from].maxY || approach(boxes[from], boxes[to]).distance > 8) assert.false(result.landed, `${boxes[from].name} (${from}) to ${boxes[to].name} (${to})`);
      }
    }
  });
});
```

and in `tests/plan.tests.js`, at the end (below line 457), add the module that checks the table:

```js
QUnit.module("CROSSINGS", () => {
  QUnit.test("each is between two different buildings of the plan, and a drop from one roof to the other", (assert) => {
    const placed = buildingPlacements();
    for (const { from, to } of CROSSINGS) {
      assert.true(from >= 0 && from < placed.length && to >= 0 && to < placed.length && from !== to);
      assert.true(placed[from].roof > placed[to].roof, `${placed[from].name} to ${placed[to].name} is down`);
    }
  });

  QUnit.test("each is a gap (the two roofs do not touch), and not more than a runner could cross on the flat plus the drop", (assert) => {
    const boxes = buildingBoxes();
    for (const { from, to } of CROSSINGS) {
      const gap = approach(boxes[from], boxes[to]).distance;
      assert.true(gap > MIN_ALLEY && gap < 8, `${boxes[from].name} to ${boxes[to].name}: ${gap.toFixed(2)} m`);
    }
  });
});
```

Things to notice:

- **Each designed crossing is a test**: the loop at the end of "the roofs of the district" makes one test for each entry of `CROSSINGS`, named for the buildings.
- **And every other gap is tested not to be one**: "a gap of the district that is not in the list of crossings" plays every other pair, and where the roof is higher or the gap is wide it must fail. A new crossing is added to the table on purpose, and a gap that becomes crossable by accident (a roof that is lowered, a jump that is raised) is a test that says so.
- **The checker can say no.** There are tests of gaps that are too wide, roofs that are too high, a runner that is too slow. A checker that always says yes proves nothing.

Open `tests.html`. You should see **569 passing tests**: 25 more.

### The bot climbs

Now the fire escape. `playEscape` plays what a person would: from the street in front of the planter it **runs at the planter and mantles it**, **jumps** from it at the edge of the first platform (and catches the edge, and climbs up, with the controller's help), and then, platform by platform, **walks round to the foot of the stair and up it**; at the top, it walks at the wall and, if the roof is higher than a step, **climbs it**. In `js/reach.js`, find the export block (lines 72 to 79) and **delete it**. Add this in its place, and the whole block of exports under it:

```js
// How the bot climbs a fire escape: how far out from the planter (in the street) it begins, how near the edge of the platform (out from the wall)
// it is when it jumps from the planter, how near the middle of each waypoint of the platforms it must come, and how long it has.
const CLIMBER = { start: 3.5, jumpOut: 1, arrive: 0.35, time: 120, dt: 1 / 60 };

// Plays a climb of a fire escape (see fireEscapes in props.js) from the street to the roof `roof` (a box): the runner begins on the street in front of
// the planter, runs at it and mantles it, jumps from it at the edge of the first platform and climbs onto it, then, at each platform, walks round to the
// foot of the stair and up it; at the top platform it walks at the wall and, if the roof is higher than a step, climbs. It says { reached, time, floor }.
function playEscape(world, ledges, escape, roof, options = {}) {
  const { start, jumpOut, arrive, time, dt } = { ...CLIMBER, ...options.bot };
  const at = (along, out) => frameToWorld({ x: escape.x, z: escape.z }, escape.turn, along, out);
  const outOf = (body) => {
    const s = Math.sin((escape.turn * Math.PI) / 2);
    const c = Math.cos((escape.turn * Math.PI) / 2);
    return (body.x - escape.x) * s + (body.z - escape.z) * c;
  };
  const begin = at(0, PLANTER.out + start);
  const wall = at(0, 0);
  const body = new Controller({ x: begin.x, z: begin.z, heading: Math.atan2(wall.x - begin.x, wall.z - begin.z), world, ledges, options: options.body });
  const planter = escape.planter.box;
  const nearPlanter = (b) => Math.hypot(Math.max(planter.minX - b.x, 0, b.x - planter.maxX), Math.max(planter.minZ - b.z, 0, b.z - planter.maxZ));
  // At each platform: the corner by the front of the platform to the left of the stair, the foot of the stair, and the top of it.
  const way = [at(-1.8, 1.5), at(-1.8, 0.45), at(1.7, 0.45)];
  let phase = "planter";
  let step = 0;
  let floor = 0;
  for (let t = 0; t < time; t += dt) {
    let direction = null;
    let jump = false;
    if (phase === "planter") {
      direction = steerTo(body, at(0, PLANTER.out));
      jump = nearPlanter(body) < 0.75;
      if (body.grounded && body.y >= PLANTER.height - 0.1) phase = "edge";
    } else if (phase === "edge") {
      direction = steerTo(body, wall);
      jump = outOf(body) < FIRE_ESCAPE.depth + jumpOut;
      if (!body.grounded && outOf(body) < FIRE_ESCAPE.depth + jumpOut - 0.2) direction = null;
      if (body.hang) phase = "hang";
    } else if (phase === "hang") {
      direction = steerTo(body, wall);
      if (!body.hang && body.grounded) phase = "walk";
    } else if (floor >= escape.floors - 1) {
      direction = steerTo(body, at(0, -1));
      jump = escape.rise > ESCAPE_RISE.walk;
      if (body.grounded && body.move === null && isOver(roof, body.x, body.z) && Math.abs(body.y - roof.maxY) < 0.6) return { reached: true, time: t, floor };
    } else {
      direction = steerTo(body, way[step]);
      if (Math.hypot(body.x - way[step].x, body.z - way[step].z) < arrive) {
        step++;
        if (step >= way.length) {
          step = 0;
          floor++;
        }
      }
    }
    body.update(direction, false, dt, jump);
    if (body.y < -2) return { reached: false, time: t, floor, phase };
  }
  return { reached: false, time, floor, phase };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOT, approach, isOver, steerTo, crossingStart, playCrossing, CLIMBER, playEscape };
} else {
  Object.assign(window, { BOT, approach, isOver, steerTo, crossingStart, playCrossing, CLIMBER, playEscape });
}
```

Things to notice:

- **It is a little state machine**: `planter`, `edge`, `hang`, then a walk through three waypoints at each platform (the corner by the front, the foot of the stair, the top of it), counted by floor. The waypoints are in the frame of the fire escape, so one set of numbers serves all four ways a building can face.
- **It cannot cheat**: it presses keys, and the controller moves. If the first platform were a hand too high, or a stair step too tall, or the strip in front of the stair too narrow for a body, the bot is stuck, and the test says on which floor and in which phase.
- **It is slow to run, and fast enough**: the tallest fire escape (13 platforms) takes thirty seconds of game time, and a fraction of one of real time, because nothing is drawn.

### Tests

At the end of `tests/reach.tests.js` (below line 151) add:

```js
QUnit.module("the fire escapes of the district", () => {
  const boxes = buildingBoxes();
  const lower = ledgeBoxes();
  const props = propBoxes();
  const world = new World({ boxes: [...boxes, ...lower, ...rimBoxes(), ...props], ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...boxes, ...lower, ...props]);
  const placed = buildingPlacements();

  for (const escape of fireEscapes()) {
    QUnit.test(`${escape.name} of building ${escape.building}: from the street to the roof, a mantle of the planter, a jump to the platform, a climb, and the stairs`, (assert) => {
      const roof = placed[escape.building].ledge > 0 ? lower.find((box) => box.name === `${placed[escape.building].name} ledge`) : boxes[escape.building];
      const result = playEscape(world, ledges, escape, roof);
      assert.true(result.reached, `got as far as floor ${result.floor} of ${escape.floors}, ${result.phase}`);
    });
  }

  QUnit.test("a runner that is too slow does not get there: the numbers of the runner are the ones that count", (assert) => {
    const escape = fireEscapes()[0];
    const roof = boxes[escape.building];
    assert.false(playEscape(world, ledges, escape, roof, { body: { stepHeight: 0.1 }, bot: { time: 30 } }).reached, "a runner that can hardly step can't climb a stair");
  });
});
```

Things to notice:

- **One test for each fire escape**, named for it: eight tests that each take the runner from the street to a roof. When one fails, the message says the floor it got to, and the phase (`planter`, `edge`, `hang` or `walk`).
- **A runner that can hardly step can't climb**: with a step height of 0.1 the first tread is a wall, and the bot does not get up. The same bot, a different runner.

Open `tests.html`. You should see **578 passing tests**: 9 more.

## Step 5: The game

Now put it in the district. The plan gets its last change, and so does `main.js`.

### The runner begins in the street

The yard is gone: the runner begins on the road, in front of the first fire escape, facing it. In `js/plan.js`, from the bottom up: in the two export lists at the end (line 386 and line 388), change `CROSSINGS, YARD, YARD_START, yardBoxes,` to `CROSSINGS, START,`. Then the training yard (lines 289 to 318: the table `YARD`, the place it begins, and `yardBoxes`) is **replaced** by one constant. **Delete it**, and add:

```js
// Where the runner begins: on the road in front of the first fire escape, with a run at the planter under it, facing it (south).
const START = { x: -30.3, z: -2, heading: Math.PI };
```

Its tests go with it. In `tests/plan.tests.js` the module `yardBoxes` (lines 404 to 457) is replaced by a test of the new start. **Delete it**, and add:

```js
QUnit.module("START", () => {
  QUnit.test("the runner begins on the road, in the open, facing south, with a run of five metres or more at the first planter", (assert) => {
    assert.true(groundHeight(START.x, START.z) < 0, "on the road");
    for (const box of buildingBoxes()) assert.false(START.x >= box.minX && START.x <= box.maxX && START.z >= box.minZ && START.z <= box.maxZ, box.name);
    assert.true(Math.abs(Math.cos(START.heading) + 1) < 1e-9, "facing south");
    const planter = fireEscapes()[0].planter.box;
    assert.true(START.z - planter.maxZ >= 5, "five metres or more to run");
    assert.true(START.x >= planter.minX && START.x <= planter.maxX, "in line with it");
  });
});
```

And in `tests/controller.tests.js` the last module, "The yard of the district" (lines 1418 to 1480), goes. **Delete it**. (The moves are still tested on their own, in the modules before it. What the yard added was a place to see them, and the district has that now.)

At the end of `tests/reach.tests.js` (below line 174) add the test that the game begins where the fire escape can be reached from:

```js
QUnit.module("the start of the game", () => {
  const boxes = buildingBoxes();
  const lower = ledgeBoxes();
  const props = propBoxes();
  const world = new World({ boxes: [...boxes, ...lower, ...rimBoxes(), ...props], ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...boxes, ...lower, ...props]);

  QUnit.test("the runner begins the game in front of the first fire escape, and can mantle the planter from the start", (assert) => {
    const escape = fireEscapes()[0];
    const planter = escape.planter.box;
    assert.true(START.z > planter.maxZ);
    assert.true(START.x > planter.minX && START.x < planter.maxX);
    const body = new Controller({ ...START, world, ledges });
    for (let i = 0; i < 600 && !(body.grounded && body.move === null && body.y > 0.5); i++) body.update({ x: 0, z: -1 }, false, 1 / 60, body.z < planter.maxZ + 0.75);
    assert.true(body.grounded && Math.abs(body.y - PLANTER.height) < 1e-9, "on the planter");
  });
});
```

### main.js

Open `js/main.js`. The changes go from the **bottom up**.

In the developer panel, above the button "Go to a ledge" (line 242), add two buttons: one takes the runner to the street in front of a fire escape, facing it, and the next to the start of a crossing:

```js
            action("Go to a fire escape", () => {
              const escape = escapes[escapeNumber++ % escapes.length];
              const spot = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 0, PLANTER.out + 3.5);
              body.placeAt(spot.x, groundHeight(spot.x, spot.z), spot.z);
              body.heading = Math.atan2(escape.x - spot.x, escape.z - spot.z);
              orbit.yaw = body.heading;
            }),
            action("Go to a crossing", () => {
              const crossing = CROSSINGS[crossingNumber++ % CROSSINGS.length];
              const start = crossingStart(boxes[crossing.from], boxes[crossing.to]);
              body.placeAt(start.x, start.y + 0.05, start.z);
              body.heading = start.heading;
              orbit.yaw = start.heading;
            }),
```

Find the line that draws the boxes in the debug view, `const debugBoxes = new DebugBoxes(` (line 192). **Delete it**, and add (the yard is replaced by the props):

```js
    const debugBoxes = new DebugBoxes(scene, [...boxes, ...lowerRoofs, ...rims, ...props]);
```

Under the line `let ledgeNumber = 0;` (line 187) add two counters, for the new buttons:

```js
    let escapeNumber = 0; // which fire escape the button for them takes the runner to next
    let crossingNumber = 0; // and which crossing
```

The world and what it is drawn from (lines 106 to 128) is **replaced**: the boxes are the buildings, the lower roofs and the rims as before, and now the **props** (the fire escapes, the planters, the sills, what is on the roofs), which are in the world, and in the ledges that can be caught; the camera is only kept out of the roofs, the things on them and the planters; and what is on the roofs is drawn as coloured boxes (as the yard was). **Delete it**, and add:

```js
  // The world the body lives in: every building as a box, to keep out of, to stand on the roof of, and for the camera to keep out of too,
  // the raised edges of the roofs, and the ground. The fire escapes, the sills and what is on the roofs are boxes in it as well (the camera
  // only has to keep out of what is on the roofs, and the planters). The body is a Controller: it runs, steps, falls and lands in that world.
  const boxes = buildingBoxes();
  const lowerRoofs = ledgeBoxes();
  const rims = rimBoxes();
  const things = roofThings();
  const props = propBoxes();
  orbit.boxes = [...boxes, ...lowerRoofs, ...things, ...escapes.map((escape) => escape.planter.box)];
  const world = new World({ boxes: [...boxes, ...lowerRoofs, ...rims, ...props], ground: (x, z) => groundHeight(x, z) });
  // The ledges that can be caught: the top edges of the roofs, of the lower roofs of the buildings in two levels, and of everything in the props.
  const ledges = ledgesOf([...boxes, ...lowerRoofs, ...props]);

  // What is on the roofs is drawn as plain boxes, each in the colour of its kind.
  for (const box of things) {
    const spec = boxMeshSpec(box);
    const mesh = BABYLON.MeshBuilder.CreateBox(box.name, { width: spec.width, height: spec.height, depth: spec.depth }, scene);
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.material = new BABYLON.StandardMaterial(`${box.name}-material`, scene);
    mesh.material.diffuseColor = BABYLON.Color3.FromHexString(box.color);
    mesh.material.specularColor = BABYLON.Color3.Black();
    mesh.receiveShadows = true;
    shadows.addShadowCaster(mesh);
    mesh.freezeWorldMatrix();
  }
```

After the buildings are placed (line 104), add the pieces of the fire escapes, the planters and the sills, put where `fireEscapes` and `sills` say (the same function that places a building places them):

```js
  const escapes = fireEscapes();
  placeAll(escapes.flatMap((escape) => [...escape.pieces, escape.planter]), true);
  placeAll(sills().map((sill) => sill.piece), true);
```

The pieces that are loaded are the plan's and the props'. The lines that list them and load them (lines 88 to 90) are **replaced**. **Delete them**, and add:

```js
  const wanted = [...new Set([...piecesUsed(), ...propPieces()])];
  for (const name of wanted) progress.add(name, pieceWeight(name));
  const library = new PieceLibrary(scene, { baseUrl: `${ASSETS}city/`, progress });
  await library.load(wanted);
```

And at the top, the line that said where the runner begins (line 13) goes: `START` is in the plan now. **Delete it.**

Things to notice:

- **The controller is as it was**, and so are the camera and the character. The only things the game needed to know about the props are that they are boxes, and which of them to draw.
- **The camera is not kept out of the fire escapes.** They are thin and open, and a camera that kept out of them would jump in and out as a runner climbed. It is kept out of the roofs, the things on them and the planters, as it was for the yard.
- **What is on the roofs is drawn as boxes.** The kit has no hut or vent: they are plain boxes in a colour, like the yard was, and the planter and the fire escape and the sill are the kit's.

Open `tests.html`. You should see **568 passing tests**. That is 10 fewer than the step before: the yard is gone, and its tests with it (the new ones are more than made up for in the steps before).

## Step 6: Try it

Open the sample with **`?dev`**: `index.html?dev`. The runner is in the street, on the road, in front of a building with a fire escape on its front. **W** (and the mouse to turn) runs at the planter at the foot of the fire escape. Then:

- **Space at the planter** climbs onto it (a mantle, as in the last step).
- **Space again at its edge**, facing the wall, jumps for the edge of the first platform: the runner catches it and hangs, and **W** climbs up.
- **Walk to the left end of the platform, along it, and into the stair**, which goes up to the platform above. Keep going.
- **At the top**, **W** at the wall: the roof is a step up (you walk onto it) or a little higher (**Space** climbs it).
- On the roof, **a vent** is a wall to vault (run at it), and **a hut** is too high to mantle: jump at it, and the hands catch its top.
- **Jump the gap** to the next roof: press the dev panel's **Go to a crossing**, and run. Each is a run and a jump.
- **Look for the sills**: the cream strips along the front, to the left of each fire escape, a little above its second platform. Jump left at the end of a row from the end of the platform, and hang, and **A** and **D** shimmy along it.
- **Go to a fire escape** from the panel takes you to the street in front of the next one.
- **R** puts you back at the start.

Things to try in the developer panel:

- **Building boxes** draws the walls, the lower roofs, the rims and now the fire escapes' slabs and treads, so you can see what the runner meets.
- **Ledges** draws every ledge there is. There are a great many now (each slab and tread has four sides), and the ones on a fire escape are what a runner catches at the edge of a platform.
- **Hand reach** lower, and lower, and see how low it can go before the first platform can't be caught from the planter. (A runner can catch it from the street too, with its hands as they are: the planter is a convenience, and a place to practise.)
- **Step height** at 0.3 and the stair is a wall: the first tread is 0.38.

## Step 7: Tests, all together

Open `tests.html`. You should see **568 passing tests**. The ones added in this step:

- **The walls**: whichever way a building faces, its walls are in from the footprint by what was measured, and the boxes follow them.
- **The frame**: `frameToWorld` turns, and agrees with how the models are turned; boxes in a frame are boxes in the world, the right way round.
- **The platform and the stair**: a body's room, the size of each step, the strip in front of the stair, the number of floors, the way the roof is reached.
- **The district's fire escapes**: one for every building, on the wall, in the street, in reach from the planter, under the roof by a step or a mantle.
- **The sills and the things on the roofs**: in the right places, the right size for the move each is for.
- **The bot's jumps**: each designed crossing is made, every other one that goes up or is far is not, and a gap that is too far, a roof that is too high and a runner that is too slow all fail.
- **The bot's climbs**: from the street to the roof, for each of the eight fire escapes.

## Recap: what you built

| What | Where |
|------|-------|
| Walls measured with rays, and the footprint less the walls | `BUILDINGS`, `wallFootprint`, `turnInsets` in `plan.js` |
| A thing on a wall, for a building that faces any way | `frameToWorld`, `frameBox`, `pieceAt` in `props.js` |
| A platform of a fire escape, and its stair, as boxes | `platformBoxes`, `FIRE_ESCAPE` |
| How many floors reach a roof, and how the roof is reached | `escapeFloors`, `escapeTop`, `escapeReach` |
| A fire escape for each building, with a planter | `fireEscapes`, and `escape` in `LAYOUTS` |
| Sills, and things on the roofs | `sills`, `roofThings`, `ROOF_FEATURES` |
| The jumps the district is designed to have | `CROSSINGS` in `plan.js` |
| A bot that jumps a gap | `approach`, `crossingStart`, `playCrossing` in `reach.js` |
| A bot that climbs a fire escape | `playEscape` |
| The start in the street | `START` in `plan.js` |
| Buttons for the fire escapes and the crossings | `main.js` |

## Challenges

1. **A ladder.** The bottom piece has one: a ladder from the first platform to the street. Make a way to climb it: a box that is a ladder to the controller (hold **W** to go up it). Then the planter isn't needed.
2. **Pipes.** The kit has none. Make a drainpipe from a cylinder, with a ledge every few metres on it, and check with `playEscape`'s cousin that it can be climbed.
3. **Railings.** The platforms have rails a metre high that the runner goes through. Add them as boxes (with a gap at the stair), and see that the bot still gets up; then make the runner vault the rail on the way off the platform.
4. **A bridge.** Two buildings of block 0 are about six metres apart, at about the same height (the medium_2 and the lower roof of the medium_1). Put a plank between them (a box, a metre wide and 0.2 thick) as a designed crossing that is *walked*, and have `playCrossing` prove it. Where does the bot start?
5. **A crossing to a ledge.** The nearest roofs in height in block 0 are the medium_2 (24.8 m) and the lower roof of the medium_1 (the ledge round it is 25.2 m high). Make a crossing with `to` the *ledge* box and not the upper roof (`ledgeBoxes` has it), and see how close the buildings would have to be for the bot to make it.
6. **Measure the doors.** The front of each building has a door and a stoop. Shoot rays at the front and find where the doors are, and make the planter go beside the door.
7. **Make the bot visible.** Make a button in the developer panel that plays `playEscape` for the nearest fire escape, in the game, with the real runner, so that you can watch what the tests are doing.
8. **Weird numbers.** `jumpSpeed` 7 and `sprintSpeed` 5: which of the crossings can still be made? Which fire escapes? Use the tests, and the developer panel, to find out which number each depends on most.
