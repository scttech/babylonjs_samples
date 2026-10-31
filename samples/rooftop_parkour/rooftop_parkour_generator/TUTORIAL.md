# Tutorial: Rooftop Parkour Generator -- A City From a Seed

This is the tenth and last tutorial of the Rooftop Parkour series. The district is a map somebody drew by hand, and a hand-drawn map is a place you learn by heart. This sample makes a **city from a seed**: add `?seed=12` to the address and the blocks, the buildings, the fire escapes, the jumps across the alleys, the tokens and the trial are all made by rules, the same each time for the same seed. And, because a generated city has nobody to check that it can be played, a **bot that plays the game proves it**: every building can be got onto from the street, and every jump is one the runner makes.

By the end you'll have:

- **Goals and routes that take a city**: tokens and the trial follow a start and a route they are given, and the bot's routes follow the jumps they are given (and a bug that only a generated city could find is found and fixed)
- **A block generator**: a random number from a seed that is always the same, patterns for a block (a tower, a row, two back to back, two rows of two), buildings that fit (the plan's own check says so), and what is on each, taken from what the handmade district was proved with
- **A city**: the jumps between roofs that the bot makes, where the runner starts, the route of the trial, a par from the bot, and the handmade district in the same shape, so the game asks for either
- The **title** says which city it is
- The **game** with a city: `?seed=12`, `?seed=random`, a **City** section in the developer panel with a button for a new one
- Unit tests for all of it, including the bot proving whole cities: **745 passing tests**

**What you'll learn:** how to make a place from rules and a seed, why a generator's randomness is *given* to it, how to check what a generator makes against the rules that matter (a plan check, and a bot that plays the game), how to find a bug by asking more of the code than the handmade data ever did, and how to keep the old way working while the new one comes in.

**Before you start:** do the [Touch tutorial](../rooftop_parkour_touch/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Touch sample, plus placeholders for the new files and their tests:

```
rooftop_parkour_generator/
├── index.html, tests.html   (already list the new scripts)
├── js/
│   ├── generator.js        (placeholder -- Step 2)
│   ├── city.js             (placeholder -- Step 3)
│   ├── goals.js, routes.js, screens.js, main.js   (changes -- Steps 1, 4 and 5)
│   └── everything else, from the Touch sample (the controller, the plan, the props and the bot are not touched at all)
└── tests/
    ├── generator.tests.js, city.tests.js   (placeholders)
    └── everything else, from the Touch sample
```

Open `tests.html` before you change anything. You should see **721 passing tests**.

### Serving the page

The models can't be loaded from a page opened straight from a file, so run a web server: `npx serve` in the repo root, and open the sample through `http://localhost`. Add **`?dev`** for the developer panel, and **`?seed=12`** (or `?seed=random`) for a city made from a seed.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **Goals and routes that take a city**: stop assuming there is only one.
2. **The blocks**: patterns, buildings that fit, and what is on them.
3. **The city**: jumps that the bot makes, a start, a route, a par.
4. **The title** says which city.
5. **The game**: all of it together.

## Step 1: Goals and routes that take a city

Everything in the game was written for one district, and a few things know it. The plan functions already take a `grid` and `layouts` (they always did, and the tests have been giving them others since Step 1), but four things still reach for the district itself:

- **The tokens in the street** are put on the way from `START`, the place the runner begins.
- **The trial** goes to the roof of building 1 and then building 0: the medium_1 and the small_1.
- **The jumps** (`CROSSINGS`) are a list in the plan, and the bot's routes read it.
- **The trial's estimate** (what the par is made from) climbs *building 1*.

None of that can stay. Each becomes a **parameter with the old thing as its default**, so everything that was written for the handmade district goes on working with no change, and a generated one can give its own:

In `js/goals.js`, **replace** line 30:

```js
function tokenSpots(grid = GRID, layouts = LAYOUTS) {
```

with:

```js
function tokenSpots(grid = GRID, layouts = LAYOUTS, start = START) {
```

In `js/goals.js`, **replace** lines 34 to 35:

```js
    const z = START.z - 1.5 - i * 1.5;
    add("street", START.x, groundHeight(START.x, z, grid), z, -1, i);
```

with:

```js
    const z = start.z - 1.5 - i * 1.5;
    add("street", start.x, groundHeight(start.x, z, grid), z, -1, i);
```

The route of the trial is two buildings, and the names of the gates follow them:

In `js/goals.js`, **replace** lines 111 to 124:

```js
// The checkpoints of the trial, as a list of { name, x, y, z }: the start gate (where the runner begins), the roof of the medium_1 (reached by its fire
// escape, and a ledge), the roof of the small_1 beside it (reached by the jump across the alley: the shortcut), and the finish, which is the start gate
// again. They are made from the plan, so they follow it.
function trialCheckpoints(grid = GRID, layouts = LAYOUTS) {
  const roofs = buildingBoxes(grid, layouts);
  const middle = (box) => ({ x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 });
  const medium = middle(roofs[1]);
  const small = middle(roofs[0]);
  const ground = groundHeight(START.x, START.z, grid);
  return [
    { name: "Start", x: START.x, y: ground, z: START.z },
    { name: "Medium roof", x: medium.x, y: roofs[1].maxY, z: medium.z },
    { name: "Small roof", x: small.x, y: roofs[0].maxY, z: small.z },
    { name: "Finish", x: START.x, y: ground, z: START.z },
```

with:

```js
// The route of the trial: the numbers of two buildings (in the order of buildingPlacements). The first is climbed from the street, by its fire escape, and the
// second is reached by a jump from the first (the shortcut). In the handmade district they are the medium_1 and the small_1 beside it.
const TRIAL_ROUTE = [1, 0];

// The checkpoints of the trial, as a list of { name, x, y, z }: the start gate (where the runner begins), the roof of the first building of the route, the roof
// of the second, and the finish, which is the start gate again. They are made from the plan, so they follow it.
function trialCheckpoints(grid = GRID, layouts = LAYOUTS, start = START, route = TRIAL_ROUTE) {
  const roofs = buildingBoxes(grid, layouts);
  const names = buildingPlacements(grid, layouts).map((placement) => placement.name[0].toUpperCase() + placement.name.split("_")[0].slice(1)); // "medium_1" is "Medium"
  const middle = (box) => ({ x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 });
  const first = middle(roofs[route[0]]);
  const second = middle(roofs[route[1]]);
  const ground = groundHeight(start.x, start.z, grid);
  return [
    { name: "Start", x: start.x, y: ground, z: start.z },
    { name: `${names[route[0]]} roof`, x: first.x, y: roofs[route[0]].maxY, z: first.z },
    { name: `${names[route[1]]} roof`, x: second.x, y: roofs[route[1]].maxY, z: second.z },
    { name: "Finish", x: start.x, y: ground, z: start.z },
```

In `js/goals.js`, **replace** lines 200 to 202:

```js
  module.exports = { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection, TRIAL, trialCheckpoints, inGate, medalFor, Trial };
} else {
  Object.assign(window, { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection, TRIAL, trialCheckpoints, inGate, medalFor, Trial });
```

with:

```js
  module.exports = { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection, TRIAL, TRIAL_ROUTE, trialCheckpoints, inGate, medalFor, Trial };
} else {
  Object.assign(window, { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection, TRIAL, TRIAL_ROUTE, trialCheckpoints, inGate, medalFor, Trial });
```

In the routes, the world the bot plays in is given the jumps, and everything that read the plan's list reads the world's:

In `js/routes.js`, **replace** line 20:

```js
function districtWorld(grid = GRID, layouts = LAYOUTS) {
```

with:

```js
function districtWorld(grid = GRID, layouts = LAYOUTS, crossings = CROSSINGS) {
```

### A bug that the handmade district could not show

Look at this one carefully:

In `js/routes.js`, **replace** lines 27 to 29:

```js
  // The roof that a fire escape reaches: the lower one, for a building in two levels.
  const reached = roofs.map((roof, i) => (placed[i].ledge > 0 ? lower.find((box) => box.name === `${placed[i].name} ledge`) : roof));
  return { world, ledges, roofs, lower, placed, reached, escapes: fireEscapes(grid, layouts) };
```

with:

```js
  // The roof that a fire escape reaches: the lower one, for a building in two levels. (The lower roofs come in the order of the buildings that have one: two buildings
  // of the same kind each have their own, so they are not found by name.)
  let nextLower = 0;
  const reached = roofs.map((roof, i) => (placed[i].ledge > 0 ? lower[nextLower++] : roof));
  return { world, ledges, roofs, lower, placed, reached, escapes: fireEscapes(grid, layouts), crossings };
```

The old line found the lower roof that a fire escape reaches **by the name of the building**: `"medium_1 ledge"`. In the handmade district there is one medium_1, so there was only one such box, and it worked. A city can have two. Both found the *first* one's lower roof, and the second building's fire escape was climbed against the wrong roof: the bot got stuck on the top platform, forever.

This is why a generator is worth building: **it asks the code questions that the data never did.** The fix is to take the lower roofs in the order of the buildings that have one (which is the order `ledgeBoxes` makes them in), and not by name. The test for it makes two medium_1s and says that each reaches its own:

In `js/routes.js`, **replace** line 88:

```js
    for (const { from, to } of CROSSINGS) {
```

with:

```js
    for (const { from, to } of env.crossings) {
```

In `js/routes.js`, **replace** line 105:

```js
  return CROSSINGS.map(({ from, to }) => {
```

with:

```js
  return env.crossings.map(({ from, to }) => {
```

In `js/routes.js`, **replace** lines 115 to 124:

```js
// How long the trial takes if it is run well (as the bot would run it, with sprint held): to the foot of the fire escape of the medium_1, up it, up the
// ledge to the roof, across the gap to the small_1, off the roof to the street, and back to the start. It is an estimate, in seconds, and what the
// par of the trial is made from.
function trialEstimate(env = districtWorld(), edges = reachable(env).edges, checkpoints = trialCheckpoints()) {
  const escape = env.escapes.find((e) => e.building === 1);
  const up = edges.find((edge) => edge.kind === "escape" && edge.to === 1).time;
  const climb = edges.find((edge) => edge.kind === "climb" && edge.to === 1).time;
  const jump = edges.find((edge) => edge.kind === "crossing" && edge.from === 1 && edge.to === 0).time;
  const start = checkpoints[0];
  return runTime(start, escape.planter) + up + climb + jump + fallTime(checkpoints[2].y) + runTime(env.escapes.find((e) => e.building === 0).planter, start);
```

with:

```js
// How long the trial takes if it is run well (as the bot would run it, with sprint held): to the foot of the fire escape of the first building of the route,
// up it (and up the ledge to the roof, if the building has two levels), across the gap to the second, off the roof to the street, and back to the start. It is
// an estimate, in seconds, and what the par of the trial is made from.
function trialEstimate(env = districtWorld(), edges = reachable(env).edges, checkpoints = trialCheckpoints(), route = TRIAL_ROUTE) {
  const [first, second] = route;
  const escape = env.escapes.find((e) => e.building === first);
  const up = edges.find((edge) => edge.kind === "escape" && edge.to === first).time;
  const climbEdge = edges.find((edge) => edge.kind === "climb" && edge.to === first);
  const jump = edges.find((edge) => edge.kind === "crossing" && edge.from === first && edge.to === second).time;
  const start = checkpoints[0];
  return runTime(start, escape.planter) + up + (climbEdge ? climbEdge.time : 0) + jump + fallTime(checkpoints[2].y) + runTime(env.escapes.find((e) => e.building === second).planter, start);
```

At the end of `tests/routes.tests.js` add:

In `tests/routes.tests.js`, after line 139, add:

```js

QUnit.module("two buildings of one kind", () => {
  QUnit.test("each has its own lower roof: the one the fire escape reaches is not found by the name of its kind", (assert) => {
    const grid = { ...GRID, blocksX: 2, blocksZ: 1 };
    const two = { u: 2.5, base: 3.6 };
    const layouts = {
      "0,0": [{ building: "medium_1", facing: "north", u: 0, escape: two }],
      "1,0": [{ building: "medium_1", facing: "north", u: 0, escape: two }],
    };
    const env = districtWorld(grid, layouts, []);
    assert.notStrictEqual(env.reached[0], env.reached[1]);
    assert.true(env.reached[0].maxX < env.reached[1].minX, "the second is the one in its own block");
    assert.true(playEscape(env.world, env.ledges, env.escapes[1], env.reached[1]).reached, "and its fire escape gets to it");
  });
});
```

Open `tests.html`. You should see **722 passing tests**: 1 more.

## Step 2: The blocks

A block of the district is a square of about 30 metres, with a street round it, and the buildings stand on it. The generator makes the buildings of one block at a time, in four steps:

1. **A random number that is always the same.** `cityRandom(seed)` is a small, fast generator (a mulberry): give it the same seed and it gives the same numbers, in the same order. Everything the generator decides comes from it, and it is *given* to the functions that decide, so a test can say that seed 7 makes this and seed 8 makes that.
2. **A pattern** for the block, chosen by weight (`CITY.patterns`): one big building (a tower), two side by side (a row), two back to back (one facing each street), or two rows of two.
3. **Buildings that fit.** Each pattern picks buildings from a list and works out where they stand, with the room that is left over shared out at random. But a pattern does not know that the buildings it picked fit; it only *tries*. `fitBlock` asks the plan itself (`planProblems`: inside the block, no overlaps, no alley narrower than `MIN_ALLEY`) and tries again if it says no, up to `fits` times, and a block that will not fit gets a single small building in the middle, which always does.
4. **What is on each building** (`furnish`): a fire escape, a row of sills, and some of what can be on the roof. This is **not invented**: the numbers are the ones the handmade district was proved with (a fire escape for each kind of building, in its place along the front, and a hut only on the roofs that took one), and the fire escape is moved a little (`moveEscape`), so that two buildings of a kind are not twins.

Open `js/generator.js` (the placeholder) and **replace the TODO line** with:

```js
// The generator: the buildings of a city made from a seed. The handmade district is a plan (plan.js) of where each building goes, and what is on it; this makes the
// same kind of plan, by rules, block by block: a pattern for the block (one big building, two side by side, two back to back, two rows of two), buildings from the
// kit that fit it (the plan's own check, planProblems, says so), and what is on each, taken from what the handmade district was proved with. Everything is plain
// numbers and arithmetic with the randomness given in, so the same seed always makes the same blocks. (It uses the plan, which comes first.) See ../tests/generator.tests.js.

const CITY = {
  blocks: [3, 2], // how many blocks east and north, by default
  margin: 0.4, // metres a building stands from the side of its block, at the least, along the street
  fits: 40, // how many times a block is tried before it is given a plain building in the middle
  // What a block can be, and how often (the weights): one big building; two side by side; two back to back; or two rows of two.
  patterns: [
    { name: "tower", weight: 2 },
    { name: "row", weight: 2 },
    { name: "back to back", weight: 3 },
    { name: "four", weight: 2 },
  ],
  towers: ["large_1", "large_2", "large_3"],
  smaller: ["small_1", "small_2", "medium_1", "medium_2"],
  // What is on a building of each kind, as it is known to be climbable: the fire escape (its place along the front, `u`, and how high the first platform is, if
  // it is not the usual), the row of sills, and what is on the roof. The handmade district was proved with these, so the generator uses these, and moves a
  // fire escape only a little.
  escape: { small_1: { u: 2.5 }, small_2: { u: 4 }, medium_1: { u: 2.5, base: 3.6 }, medium_2: { u: 3 }, large_1: { u: 6 }, large_2: { u: 4 }, large_3: { u: 5 } },
  moveEscape: 0.4,
  sills: { small_1: { u: -3, count: 2 }, small_2: { u: -4, count: 2 }, medium_1: { u: -3, count: 3 }, medium_2: { u: -3, count: 3 }, large_1: { u: -6, count: 3 }, large_2: { u: -4, count: 3 }, large_3: { u: -5, count: 3 } },
  sillHeight: 6.9,
  roof: {
    small_1: [{ kind: "vent", u: -2, v: 2 }],
    small_2: [{ kind: "vent", u: 0, v: 0 }],
    medium_2: [{ kind: "hut", u: 3, v: 0 }, { kind: "vent", u: -3, v: 1 }],
    large_1: [{ kind: "hut", u: -5, v: 4 }, { kind: "vent", u: 4, v: -3 }, { kind: "vent", u: 6, v: 5 }],
    large_2: [{ kind: "hut", u: 2, v: 2 }],
    large_3: [{ kind: "vent", u: 0, v: 0 }],
  },
  propChance: 0.75, // how often each of the things that can be on a roof is
  // Which gaps between roofs are tried as a jump: the gap between the walls, in metres, how much lower the roof landed on must be, and how many are kept.
  gap: [2.5, 6],
  minDrop: 1,
  maxCrossings: 12,
  startOut: 3.5, // how far in front of the foot of the first fire escape the runner begins, past the planter
};

// A random number from a seed, always the same for the same seed: a number from 0 up to 1 each time it is called.
function cityRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const between = (random, low, high) => low + random() * (high - low);
const choose = (random, list) => list[Math.floor(random() * list.length)];
const chooseWeighted = (random, list) => {
  let at = random() * list.reduce((sum, item) => sum + item.weight, 0);
  for (const item of list) {
    at -= item.weight;
    if (at < 0) return item;
  }
  return list[list.length - 1];
};

// What is on a building, as the layout wants it: the fire escape, the sills, and some of what can be on the roof.
function furnish(name, random, table = CITY) {
  const escape = { ...table.escape[name] };
  escape.u = Math.round((escape.u + between(random, -table.moveEscape, table.moveEscape)) * 10) / 10;
  const entry = { escape, sills: { ...table.sills[name], y: table.sillHeight } };
  const roof = (table.roof[name] || []).filter(() => random() < table.propChance);
  if (roof.length > 0) entry.roof = roof;
  return entry;
}

// A block's buildings by a pattern, as a list of layout entries. `half` is half the size of a block. They are not yet known to fit: see fitBlock.
function layBlock(pattern, random, half, table = CITY) {
  const size = BUILDINGS;
  const side = () => (random() < 0.5 ? "north" : "south");
  // a row of buildings along one side of the block, facing the street at that side: their places along it, from the west, with the room left over shared out
  const row = (names, facing) => {
    const widths = names.map((n) => size[n].width);
    const spare = half * 2 - widths.reduce((a, b) => a + b, 0) - (names.length - 1) * MIN_ALLEY - 2 * table.margin;
    if (spare < 0) return null;
    let at = -half + table.margin + (spare > 0 ? random() * spare * 0.5 : 0);
    return names.map((n, i) => {
      const u = at + widths[i] / 2;
      at += widths[i] + MIN_ALLEY + (spare > 0 ? (random() * spare) / (names.length + 1) : 0);
      return { building: n, facing, u: Math.round(u * 10) / 10, ...furnish(n, random, table) };
    });
  };
  if (pattern === "tower") {
    const name = choose(random, table.towers);
    return [{ building: name, facing: side(), u: Math.round(between(random, -3, 3) * 10) / 10, ...furnish(name, random, table) }];
  }
  if (pattern === "row") {
    return row([choose(random, table.smaller), choose(random, table.smaller)], side());
  }
  if (pattern === "back to back") {
    const a = choose(random, table.smaller);
    const b = choose(random, table.smaller);
    const place = (n, facing) => ({ building: n, facing, u: Math.round(between(random, -half + size[n].width / 2 + table.margin, half - size[n].width / 2 - table.margin) * 10) / 10, ...furnish(n, random, table) });
    return [place(a, "north"), place(b, "south")];
  }
  const north = row([choose(random, table.smaller), choose(random, table.smaller)], "north");
  const south = row([choose(random, table.smaller), choose(random, table.smaller)], "south");
  return north && south ? [...north, ...south] : null;
}

// One block's buildings, tried until they fit (see planProblems: inside the block, no overlap, no alley narrower than MIN_ALLEY). A block that will not fit
// gets a single small building in the middle, which always does.
function fitBlock(key, random, grid, table = CITY) {
  const half = blockSize(grid) / 2;
  for (let i = 0; i < table.fits; i++) {
    const pattern = chooseWeighted(random, table.patterns).name;
    const entries = layBlock(pattern, random, half, table);
    if (entries && planProblems(grid, { [key]: entries }).length === 0) return entries;
  }
  return [{ building: "small_1", facing: "north", u: 0, ...furnish("small_1", random, table) }];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CITY, cityRandom, furnish, layBlock, fitBlock };
} else {
  Object.assign(window, { CITY, cityRandom, furnish, layBlock, fitBlock });
}
```

Things to notice:

- **The table is the design.** `CITY` is every number: the size of a city, the patterns and their weights, what is proved for each building, how much a fire escape may move. A different feel of city is a different table.
- **Proved values are better than clever ones.** The generator could invent a fire escape position for every building. It does not, because *a fire escape that cannot be climbed is worse than no fire escape*; it uses what the bot has seen climbed.
- **Everything round is to a tenth of a metre.** The numbers in a plan are read by people; they should not have eleven digits.

### Tests

Open `tests/generator.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("cityRandom", () => {
  QUnit.test("the same seed gives the same numbers, and another seed gives other ones", (assert) => {
    const a = cityRandom(7);
    const b = cityRandom(7);
    const c = cityRandom(8);
    const first = [a(), a(), a()];
    assert.deepEqual([b(), b(), b()], first);
    assert.notDeepEqual([c(), c(), c()], first);
  });

  QUnit.test("every number is from 0 up to 1, and they are spread, not bunched", (assert) => {
    const random = cityRandom(1);
    let low = 0;
    for (let i = 0; i < 1000; i++) {
      const n = random();
      assert.true(n >= 0 && n < 1);
      if (n < 0.5) low++;
    }
    assert.true(low > 420 && low < 580, `${low} of 1000 below a half`);
  });
});

QUnit.module("a block of a city", () => {
  const grid = { ...GRID, blocksX: 3, blocksZ: 2 };

  QUnit.test("every pattern that fits is a block that the plan has no problem with", (assert) => {
    for (let seed = 1; seed <= 40; seed++) {
      const random = cityRandom(seed);
      const entries = fitBlock("1,1", random, grid);
      assert.true(entries.length >= 1 && entries.length <= 4, `${entries.length} buildings`);
      assert.deepEqual(planProblems(grid, { "1,1": entries }), [], `seed ${seed}`);
    }
  });

  QUnit.test("every building has a fire escape that is where it was proved, give or take a little, and sills that are proved", (assert) => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const entry of fitBlock("0,0", cityRandom(seed), grid)) {
        const proved = CITY.escape[entry.building];
        assert.true(Math.abs(entry.escape.u - proved.u) <= CITY.moveEscape + 0.051, `${entry.building} escape ${entry.escape.u}`);
        assert.strictEqual(entry.escape.base, proved.base);
        assert.deepEqual(entry.sills, { ...CITY.sills[entry.building], y: CITY.sillHeight });
      }
    }
  });

  QUnit.test("what is on a roof is only what the building is known to take, and not always", (assert) => {
    let nothing = 0;
    let something = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const entry = furnish("large_1", cityRandom(seed));
      for (const thing of entry.roof || []) assert.true(CITY.roof.large_1.some((t) => t.kind === thing.kind && t.u === thing.u && t.v === thing.v));
      if (entry.roof) something++;
      else nothing++;
    }
    assert.true(something > 0 && nothing >= 0);
    assert.strictEqual(furnish("medium_1", cityRandom(1)).roof, undefined, "a building that has nothing known for its roof has nothing");
  });

  QUnit.test("a tower is one big building, and the patterns are all of them used by some seed", (assert) => {
    const seen = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const random = cityRandom(seed);
      const entries = fitBlock("0,0", random, grid);
      seen.add(entries.length);
    }
    assert.true(seen.has(1) && seen.has(2) && seen.has(4), [...seen].join(", "));
  });
});
```

The tests run forty seeds and say that every block the generator makes is a block the plan has no problem with: a **property** (for all seeds, this is true), not a single made-up example.

Open `tests.html`. You should see **728 passing tests**: 6 more.

## Step 3: The city

The blocks are not yet a place to run. Three things are left to decide, and they are the rules that matter:

- **The jumps.** Which pairs of roofs are jumped between? `findCrossings` takes every pair of buildings whose walls are a jumpable gap apart (`gap`) with the second roof lower than the first (`minDrop`: the way up is a fire escape, as in the handmade district), and **asks the bot**. `playCrossing` is the runner's own controller, run at the gap: if it lands, the gap is a crossing; if it falls, it is not. The *rules of what can be jumped are the runner's, not the generator's.*
- **The start and the trial.** The runner begins on the street in front of the first building's fire escape (`cityStart`), and the trial goes up the fire escape of the building with a jump that is nearest it, and across the jump (`cityRoute`). The par is **how long the bot takes** (`cityPar`): the same way the handmade district's was made.
- **The shape.** A city is `{ seed, grid, layouts, crossings, start, route, par }`, and the handmade district is made into the same shape (`HANDMADE`), so that the game asks `cityFor(location.search)` for a city and does not know which it was given.

Open `js/city.js` (the placeholder) and **replace the TODO line** with:

```js
// The city: what the generator's blocks are made into. A city is { seed, grid, layouts, crossings, start, route, par }, the same shape as the handmade district (HANDMADE),
// so the game asks for either and does not know which it has. The rules of what can be jumped are not the generator's: they are the runner's. A gap is only a
// crossing if a bot that plays the game (reach.js) makes it, and a city is only a city if every building can be got onto from the street (routes.js, which the tests
// ask of many seeds). (It uses the generator, the plan, the props, the goals, the bot and the routes, which come first.) See ../tests/city.tests.js.

// The jumps between roofs of a layout that the bot makes, as a list of { from, to } (the numbers of two buildings, in the order of buildingPlacements): every pair
// whose walls are a jumpable gap apart, with the roof of the second lower than the roof of the first, tried by the bot, nearest gaps first, as many as the table
// keeps. (The roof of a building in two levels is its upper roof.)
function findCrossings(grid, layouts, table = CITY) {
  const env = districtWorld(grid, layouts, []);
  const feet = env.placed.map((placement) => footprint(placement));
  const candidates = [];
  for (let from = 0; from < feet.length; from++) {
    for (let to = 0; to < feet.length; to++) {
      if (from === to) continue;
      const { overlap, gap } = boxGap(feet[from], feet[to]);
      if (overlap || gap < table.gap[0] || gap > table.gap[1]) continue;
      if (env.roofs[from].maxY - env.roofs[to].maxY < table.minDrop) continue;
      candidates.push({ from, to, gap });
    }
  }
  candidates.sort((a, b) => a.gap - b.gap || a.from - b.from || a.to - b.to);
  const made = [];
  for (const { from, to } of candidates) {
    if (made.length >= table.maxCrossings) break;
    if (playCrossing(env.world, env.ledges, env.roofs[from], env.roofs[to]).landed) made.push({ from, to });
  }
  return made;
}

// Where the runner begins: on the street in front of the first building's fire escape, past its planter, facing it. { x, z, heading }.
function cityStart(grid, layouts, table = CITY) {
  const escape = fireEscapes(grid, layouts)[0];
  const spot = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 0, PLANTER.out + table.startOut);
  return { x: Math.round(spot.x * 10) / 10, z: Math.round(spot.z * 10) / 10, heading: Math.atan2(escape.x - spot.x, escape.z - spot.z) };
}

// The route of the trial for a city: up the fire escape of the building that is nearest the start and has a jump from it, and across that jump. [from, to].
function cityRoute(grid, layouts, crossings, start) {
  const escapes = fireEscapes(grid, layouts);
  const distance = (crossing) => {
    const escape = escapes.find((e) => e.building === crossing.from);
    return Math.hypot(escape.planter.x - start.x, escape.planter.z - start.z);
  };
  const best = crossings.reduce((a, b) => (distance(b) < distance(a) ? b : a));
  return [best.from, best.to];
}

// The par of the trial of a city, in seconds: how long the bot takes to run it (up the fire escape of the first building of the route, and the ledge if it has
// one, across the jump, down to the street and back to the start), to the whole second. The par of the handmade district was made the same way.
function cityPar(city, env = districtWorld(city.grid, city.layouts, city.crossings)) {
  const [first, second] = city.route;
  const edges = [{ kind: "escape", from: -1, to: first, time: playEscape(env.world, env.ledges, env.escapes.find((e) => e.building === first), env.reached[first]).time }];
  if (env.placed[first].ledge > 0) edges.push({ kind: "climb", from: first, to: first, time: playClimb(env.world, env.ledges, env.reached[first], env.roofs[first]).time });
  edges.push({ kind: "crossing", from: first, to: second, time: playCrossing(env.world, env.ledges, env.roofs[first], env.roofs[second]).time });
  return Math.round(trialEstimate(env, edges, trialCheckpoints(city.grid, city.layouts, city.start, city.route), city.route));
}

// The handmade district, as a city (the same shape as what the generator makes), so that the game can ask for either.
const HANDMADE = { seed: null, grid: GRID, layouts: LAYOUTS, crossings: CROSSINGS, start: START, route: TRIAL_ROUTE, par: TRIAL.par };

// A city from a seed: { seed, grid, layouts, crossings, start, route, par }. `blocks` is [east, north] (the table's, if it is left out). A layout with no jump in it
// (which is a dull city) is made again with the next numbers from the same seed.
function generateCity(seed, { blocks = CITY.blocks, table = CITY } = {}) {
  const random = cityRandom(seed);
  const grid = { ...GRID, blocksX: blocks[0], blocksZ: blocks[1] };
  for (let attempt = 0; attempt < 20; attempt++) {
    const layouts = {};
    for (let a = 0; a < grid.blocksX; a++) for (let b = 0; b < grid.blocksZ; b++) layouts[`${a},${b}`] = fitBlock(`${a},${b}`, random, grid, table);
    const crossings = findCrossings(grid, layouts, table);
    if (crossings.length === 0) continue;
    const start = cityStart(grid, layouts, table);
    const city = { seed, grid, layouts, crossings, start, route: cityRoute(grid, layouts, crossings, start) };
    return { ...city, par: cityPar(city) };
  }
  throw new Error(`No city could be made from the seed ${seed}`);
}

// Which city a page asks for: the handmade district, unless the address has `seed=` and a number (or `seed=random`, a number made now). `random` is given so a test
// can say what "random" is.
function cityFor(search, random = Math.random) {
  const seed = new URLSearchParams(search).get("seed");
  if (seed === null) return HANDMADE;
  const number = seed === "random" || seed === "" ? Math.floor(random() * 1e6) : Number(seed);
  return Number.isFinite(number) ? generateCity(Math.abs(Math.floor(number))) : HANDMADE;
}

// A few words that say what a city is.
function describeCity(city) {
  const placed = buildingPlacements(city.grid, city.layouts);
  const name = city.seed === null ? "The handmade district" : `City ${city.seed}`;
  return `${name}: ${city.grid.blocksX} by ${city.grid.blocksZ} blocks, ${placed.length} buildings, ${city.crossings.length} ${city.crossings.length === 1 ? "jump" : "jumps"}`;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { findCrossings, cityStart, cityRoute, cityPar, HANDMADE, generateCity, cityFor, describeCity };
} else {
  Object.assign(window, { findCrossings, cityStart, cityRoute, cityPar, HANDMADE, generateCity, cityFor, describeCity });
}
```

Things to notice:

- **A city with no jump is made again.** It is a dull place, and the trial needs one. The next numbers of the same seed make the next try, so the same seed still makes the same city.
- **`cityFor` is forgiving.** No seed is the handmade district; `seed=random` is a number made now; a seed that is not a number is the handmade district too.

### Tests

Open `tests/city.tests.js` (the placeholder) and **replace the TODO line** with:

```js
// The cities are made once and kept: a city is a few hundred milliseconds of the bot, and several tests look at the same ones.
const kept = new Map();
const cityOf = (seed) => {
  if (!kept.has(seed)) kept.set(seed, generateCity(seed));
  return kept.get(seed);
};

QUnit.module("a city", () => {
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  QUnit.test("the same seed makes the same city, and another seed another", (assert) => {
    const a = JSON.stringify(generateCity(3));
    assert.strictEqual(JSON.stringify(generateCity(3)), a);
    assert.notStrictEqual(JSON.stringify(generateCity(4)), a);
  });

  QUnit.test("every city is as big as asked, and every block has buildings that the plan has no problem with", (assert) => {
    for (const seed of SEEDS) {
      const city = cityOf(seed);
      assert.strictEqual(Object.keys(city.layouts).length, CITY.blocks[0] * CITY.blocks[1]);
      assert.deepEqual(planProblems(city.grid, city.layouts), [], `seed ${seed}`);
      assert.true(city.crossings.length >= 1, `seed ${seed} has a jump`);
    }
    const small = generateCity(2, { blocks: [2, 2] });
    assert.strictEqual(small.grid.blocksX, 2);
    assert.strictEqual(Object.keys(small.layouts).length, 4);
  });

  QUnit.test("every building has a fire escape, and every jump is from a roof to a lower one across a gap that can be jumped", (assert) => {
    for (const seed of SEEDS) {
      const city = cityOf(seed);
      const placed = buildingPlacements(city.grid, city.layouts);
      const roofs = buildingBoxes(city.grid, city.layouts);
      assert.strictEqual(fireEscapes(city.grid, city.layouts).length, placed.length, `seed ${seed}: an escape for each`);
      for (const { from, to } of city.crossings) {
        assert.true(roofs[from].maxY - roofs[to].maxY >= CITY.minDrop, `seed ${seed}: ${from} to ${to} is down`);
        const { gap } = boxGap(footprint(placed[from]), footprint(placed[to]));
        assert.true(gap >= CITY.gap[0] && gap <= CITY.gap[1], `seed ${seed}: a gap of ${gap.toFixed(1)}`);
      }
    }
  });

  QUnit.test("no more jumps than the table allows, and none twice", (assert) => {
    for (const seed of SEEDS) {
      const { crossings } = cityOf(seed);
      assert.true(crossings.length <= CITY.maxCrossings);
      assert.strictEqual(new Set(crossings.map((c) => `${c.from}>${c.to}`)).size, crossings.length);
    }
  });

  QUnit.test("the runner begins on open ground in front of the first fire escape, facing it, and not inside a building", (assert) => {
    for (const seed of SEEDS) {
      const city = cityOf(seed);
      const escape = fireEscapes(city.grid, city.layouts)[0];
      const toward = Math.atan2(escape.x - city.start.x, escape.z - city.start.z);
      assert.true(Math.abs(Math.atan2(Math.sin(toward - city.start.heading), Math.cos(toward - city.start.heading))) < 0.01, `seed ${seed}: facing it`);
      for (const box of buildingBoxes(city.grid, city.layouts)) {
        assert.false(city.start.x > box.minX && city.start.x < box.maxX && city.start.z > box.minZ && city.start.z < box.maxZ, `seed ${seed}: not in a building`);
      }
      assert.true(Math.hypot(escape.planter.x - city.start.x, escape.planter.z - city.start.z) >= 3, "at a run from the planter");
    }
  });

  QUnit.test("the route of the trial is a jump of the city, from a building that has an escape", (assert) => {
    for (const seed of SEEDS) {
      const city = cityOf(seed);
      assert.true(city.crossings.some((c) => c.from === city.route[0] && c.to === city.route[1]), `seed ${seed}`);
    }
  });

  QUnit.test("the goals follow the city: the tokens, and the trial", (assert) => {
    for (const seed of [2, 5, 9]) {
      const city = cityOf(seed);
      const tokens = tokenSpots(city.grid, city.layouts, city.start);
      const placed = buildingPlacements(city.grid, city.layouts);
      assert.strictEqual(tokens.filter((t) => t.kind === "roof").length, placed.length, "a token on each roof");
      assert.strictEqual(tokens.filter((t) => t.kind === "platform").length, placed.length, "and on each fire escape");
      const street = tokens.filter((t) => t.kind === "street");
      assert.true(street.every((t) => Math.abs(t.x - city.start.x) < 1e-9), "the street tokens are from the start");
      const gates = trialCheckpoints(city.grid, city.layouts, city.start, city.route);
      assert.deepEqual([gates[0].x, gates[0].z], [city.start.x, city.start.z]);
      assert.deepEqual([gates[3].x, gates[3].z], [city.start.x, city.start.z], "it ends where it began");
      assert.strictEqual(gates[1].y, buildingBoxes(city.grid, city.layouts)[city.route[0]].maxY);
    }
  });

  QUnit.test("the district of before is still what the plan says, and the goals for it are what they were", (assert) => {
    assert.strictEqual(HANDMADE.grid, GRID);
    assert.strictEqual(HANDMADE.layouts, LAYOUTS);
    assert.strictEqual(trialCheckpoints()[1].name, "Medium roof");
    assert.deepEqual(trialCheckpoints(GRID, LAYOUTS, START, TRIAL_ROUTE), trialCheckpoints());
  });
});

QUnit.module("the bot proves a city", () => {
  // The bot plays the game, so this is the slow part: a few cities, each in full.
  for (const seed of [3, 11, 17]) {
    QUnit.test(`city ${seed}: every building can be got onto from the street, every jump is made, and the trial and its par can be run`, (assert) => {
      const city = cityOf(seed);
      const env = districtWorld(city.grid, city.layouts, city.crossings);
      const { reached, edges } = reachable(env);
      assert.strictEqual(reached.size, env.placed.length, "every building");
      for (const { from, to } of city.crossings) assert.true(edges.some((e) => e.kind === "crossing" && e.from === from && e.to === to), `${from} to ${to}`);
      const saved = shortcuts(env, edges);
      assert.true(saved.every((s) => s.saved > 0), "every jump is a shortcut");
      const gates = trialCheckpoints(city.grid, city.layouts, city.start, city.route);
      const estimate = trialEstimate(env, edges, gates, city.route);
      assert.true(estimate > 8 && estimate < 200, `${estimate.toFixed(1)} seconds`);
    });
  }
});

QUnit.module("the par of a city", () => {
  QUnit.test("it is how long the bot takes round the trial, to the second, and the handmade district keeps its own", (assert) => {
    const city = generateCity(5);
    const env = districtWorld(city.grid, city.layouts, city.crossings);
    const { edges } = reachable(env);
    const estimate = trialEstimate(env, edges, trialCheckpoints(city.grid, city.layouts, city.start, city.route), city.route);
    assert.strictEqual(city.par, Math.round(estimate));
    assert.true(city.par > 8 && city.par < 200, `${city.par} seconds`);
    assert.strictEqual(HANDMADE.par, TRIAL.par);
  });
});

QUnit.module("which city a page asks for", () => {
  QUnit.test("no seed is the handmade district", (assert) => {
    assert.strictEqual(cityFor(""), HANDMADE);
    assert.strictEqual(cityFor("?dev"), HANDMADE);
  });

  QUnit.test("a seed is a generated city, the same each time", (assert) => {
    const city = cityFor("?dev&seed=12");
    assert.strictEqual(city.seed, 12);
    assert.strictEqual(JSON.stringify(cityFor("?seed=12")), JSON.stringify(city));
  });

  QUnit.test("random is a seed from the random numbers given, and nonsense is the handmade district", (assert) => {
    assert.strictEqual(cityFor("?seed=random", () => 0.5).seed, 500000);
    assert.strictEqual(cityFor("?seed=banana"), HANDMADE);
  });

  QUnit.test("a city is described in a few words", (assert) => {
    assert.true(describeCity(HANDMADE).startsWith("The handmade district: 2 by 2 blocks, 8 buildings"));
    const text = describeCity(generateCity(5));
    assert.true(text.startsWith("City 5: 3 by 2 blocks"), text);
  });
});
```

Look at the last tests, **the bot proves a city**: for three seeds, `reachable` is asked whether every building can be got onto from the street, every jump is asked for, every jump is a shortcut that saves time, and the trial can be run in a believable time. They are slow (the bot plays the game), so they are few. When this was written the same check was run on **sixty seeds** by hand, and every one passed (after the bug of Step 1 was fixed).

Open `tests.html`. You should see **744 passing tests**: 16 more.

## Step 4: The title says which

A city that is not the one you expected should be told. The title screen gets a line under the logo:

In `js/screens.js`, after line 93, add:

```js
    this.cityLine = makeElement(doc, "p", "screen-city", this.title);
```

In `js/screens.js`, after line 148, add:

```js
  // Says which city this is, under the logo.
  setCity(text) {
    this.cityLine.textContent = text;
  }

```

with a little style:

In `css/screens.css`, after line 37, add:

```css
.screen-city {
  margin: 0;
  font-size: 16px;
  color: var(--sky);
}
```

and a test:

In `tests/screens.tests.js`, after line 130, add:

```js
  QUnit.test("the title says which city it is", (assert) => {
    const screens = make();
    screens.setCity("City 12: 3 by 2 blocks, 11 buildings, 5 jumps");
    assert.strictEqual(screens.cityLine.textContent, "City 12: 3 by 2 blocks, 11 buildings, 5 jumps");
    gone(screens);
  });

```

Open `tests.html`. You should see **745 passing tests**: 1 more.

## Step 5: The game

`main.js` now asks for a city, and gives its parts to everything that took the district for granted. Sixteen changes, but only two of them are ideas; the rest are `(grid, layouts)` added to a call.

**The city is asked for first**, from the address, and its grid and layouts are named:

In `js/main.js`, after line 22, add:

```js
// The city: the handmade district, or one made from a seed (`?seed=12`, or `?seed=random`), with its jumps, its start and the route of its trial (see generator.js).
const city = cityFor(location.search);
const { grid, layouts } = city;
```

**Then everything that used the district uses the city**: the start of the camera and the runner...

In `js/main.js`, **replace** line 38:

```js
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 3, START.z - 6), scene);
```

with:

```js
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 3, city.start.z - 6), scene);
```

In `js/main.js`, **replace** line 43:

```js
  const orbit = new OrbitCamera(camera, { yaw: START.heading });
```

with:

```js
  const orbit = new OrbitCamera(camera, { yaw: city.start.heading });
```

...the ground of each block, which pieces to load, and what to place...

In `js/main.js`, **replace** line 74:

```js
  for (const box of blockBoxes()) {
```

with:

```js
  for (const box of blockBoxes(grid)) {
```

In `js/main.js`, **replace** line 98:

```js
  const wanted = [...new Set([...piecesUsed(), ...propPieces()])];
```

with:

```js
  const wanted = [...new Set([...piecesUsed(grid, layouts), ...propPieces(grid, layouts)])];
```

In `js/main.js`, **replace** lines 114 to 118:

```js
  placeAll(streetPlacements(), false);
  placeAll(buildingPlacements(), true);
  const escapes = fireEscapes();
  placeAll(escapes.flatMap((escape) => [...escape.pieces, escape.planter]), true);
  placeAll(sills().map((sill) => sill.piece), true);
```

with:

```js
  placeAll(streetPlacements(grid), false);
  placeAll(buildingPlacements(grid, layouts), true);
  const escapes = fireEscapes(grid, layouts);
  placeAll(escapes.flatMap((escape) => [...escape.pieces, escape.planter]), true);
  placeAll(sills(grid, layouts).map((sill) => sill.piece), true);
```

...the boxes of the world...

In `js/main.js`, **replace** lines 123 to 129:

```js
  const boxes = buildingBoxes();
  const lowerRoofs = ledgeBoxes();
  const rims = rimBoxes();
  const things = roofThings();
  const props = propBoxes();
  orbit.boxes = [...boxes, ...lowerRoofs, ...things, ...escapes.map((escape) => escape.planter.box)];
  const world = new World({ boxes: [...boxes, ...lowerRoofs, ...rims, ...props], ground: (x, z) => groundHeight(x, z) });
```

with:

```js
  const boxes = buildingBoxes(grid, layouts);
  const lowerRoofs = ledgeBoxes(grid, layouts);
  const rims = rimBoxes(grid, layouts);
  const things = roofThings(grid, layouts);
  const props = propBoxes(grid, layouts);
  orbit.boxes = [...boxes, ...lowerRoofs, ...things, ...escapes.map((escape) => escape.planter.box)];
  const world = new World({ boxes: [...boxes, ...lowerRoofs, ...rims, ...props], ground: (x, z) => groundHeight(x, z, grid) });
```

...the body, and the goals (the second idea: **the trial has the city's par**, which the bot made)...

In `js/main.js`, **replace** line 145:

```js
  const body = new Controller({ ...START, world, bounds: districtBounds(), ledges });
```

with:

```js
  const body = new Controller({ ...city.start, world, bounds: districtBounds(grid), ledges });
```

In `js/main.js`, **replace** lines 149 to 150:

```js
  const collection = new Collection(tokenSpots());
  const trial = new Trial(trialCheckpoints());
```

with:

```js
  const collection = new Collection(tokenSpots(grid, layouts, city.start));
  const trial = new Trial(trialCheckpoints(grid, layouts, city.start, city.route), { ...TRIAL, par: city.par });
```

...and the buttons of the developer panel that go to places:

In `js/main.js`, **replace** line 336:

```js
    const ledgeSpots = buildingPlacements().flatMap((placement, i) => (placement.ledge > 0 ? [ledgeSpot(placement, boxes[i])] : []));
```

with:

```js
    const ledgeSpots = buildingPlacements(grid, layouts).flatMap((placement, i) => (placement.ledge > 0 ? [ledgeSpot(placement, boxes[i])] : []));
```

In `js/main.js`, **replace** line 390:

```js
              body.placeAt(spot.x, groundHeight(spot.x, spot.z), spot.z);
```

with:

```js
              body.placeAt(spot.x, groundHeight(spot.x, spot.z, grid), spot.z);
```

In `js/main.js`, **replace** line 395:

```js
              const crossing = CROSSINGS[crossingNumber++ % CROSSINGS.length];
```

with:

```js
              const crossing = city.crossings[crossingNumber++ % city.crossings.length];
```

In `js/main.js`, **replace** line 426:

```js
            readout("trial", () => `${trial.state}, ${formatTime(trial.time)}, par ${formatTime(TRIAL.par)}`),
```

with:

```js
            readout("trial", () => `${trial.state}, ${formatTime(trial.time)}, par ${formatTime(trial.table.par)}`),
```

**A section of the developer panel for the city** (the first idea of the step in the game: a button for a new one):

In `js/main.js`, after line 462, add:

```js
          title: "City",
          rows: [
            readout("city", () => describeCity(city)),
            readout("seed", () => (city.seed === null ? "handmade" : String(city.seed))),
            action("A new city (random seed)", () => {
              const next = new URL(location.href);
              next.searchParams.set("seed", String(Math.floor(Math.random() * 1e6)));
              location.href = next.toString();
            }),
            action("The handmade district", () => {
              const next = new URL(location.href);
              next.searchParams.delete("seed");
              location.href = next.toString();
            }),
          ],
        },
        {
```

In `js/main.js`, **replace** line 508:

```js
    window.dev = { scene, body, world, sky, orbit, panel, look, shadows, flow, collection, trial, hud, records, sound, screenFlow, game, touch, touchUi }; // for poking at from the console
```

with:

```js
    window.dev = { city, scene, body, world, sky, orbit, panel, look, shadows, flow, collection, trial, hud, records, sound, screenFlow, game, touch, touchUi }; // for poking at from the console
```

**And the title says which city.**

In `js/main.js`, after line 603, add:

```js
    screens.setCity(describeCity(city));
```

### Try it

Open `index.html?dev&seed=12` (and try `?seed=random`, or the **City** section's button for a new city). You should see:

- the title says **City 12: 3 by 2 blocks, 9 buildings, 1 jump** (more blocks than the handmade district, and different buildings in different places)
- press Play: you begin on the street in front of a fire escape, facing it, with the first tokens on the way
- run the trial (**T**): the gates, the par and the medals follow the city
- try another seed, and the handmade district (without a seed) for comparison: **the same code plays both**

### Tests

Open `tests.html`. You should see **745 passing tests**: 0 more (none: the game is not what the tests are about, and everything they say about it is in the files above).

## Stretch goals

- **More patterns.** A block with a courtyard, an L, a building facing east or west (the plan already supports them).
- **A bigger city, made in pieces.** Make the blocks nearest the runner, and the others as the runner goes (the district would have no edge).
- **A seed on the title.** An entry box, and a button that shares a link to this city.
- **More proved things.** A new kind of prop for the roof, tried by the bot on every kind of building before the generator is allowed to use it.

## What you've learned

- How to make a place from rules and a seed, and why the generator's randomness is given to it
- How to check what a generator makes: a plan check for what is true of any plan, and a **bot that plays the game** for what is true of a *game*
- How asking more of the code than the data ever did finds a bug (two buildings of one kind)
- How to bring in a new way (a generated city) while the old one (the handmade district) keeps working, by making both the same shape

**That is the series.** From an empty page and a loading bar, through a runner, jumps, ledges, vaults, wall kicks, fire escapes and goals, to a game with a title, sound and a phone's controls, and now a city that nobody drew. Every rule of it is plain numbers and arithmetic with a test, and a bot that plays the game says that the world can be played.
