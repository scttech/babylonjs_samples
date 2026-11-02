# Tutorial: Tower Defense Scenery -- A Board That Is a Place

This is the sixth tutorial in the Tower Defense series. The board is a green slab with a road across it, and it plays well and looks like a diagram. This tutorial gives it **scenery**: a cabbage cart, a spirit shrine, a koi pond, a lemur perch and a sky bison camp, **written in the map's own text** (a letter in a row of the map puts one in a cell), standing on the grass, **in the way of a tower** (and the game says so: *there is a spirit shrine there*). It is a short tutorial, because the pieces from the last five make it easy: a map is data, a prop is a model that stands in a cell, and the rule that said *why not* for a road and a tower says it for a shrine too. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Props in the map text**: five letters in the legend, a list of the props that a parsed map holds, and two maps with scenery in them
- **A table of props**: what each is called in a sentence, which model, and how wide it is made
- **Props on the board**: loaded once and drawn as **instances**, each scaled to its width, stood on the ground, centered in its cell and turned a quarter-turn at a time in a way that depends only on the cell
- **A rule**: a tower can't be built on a prop, and the reason says what is there
- A game where the scenery is on the island, and a podium dragged over it gets a red outline and says why
- Unit tests for all of it: **591 passing tests**, 28 of them new, including tests that **load the real models** and measure them

**What you'll learn:** how to add a thing to a data format without breaking what already reads it (a map with no props is still a map), how a table drives both a model loader and a sentence, instances of static models (again, and why it matters more for scenery than for tiles), centering and standing a model of any shape by measuring it, and how a rule that is in one place gets a new case in two lines.

**Before you start:** do the [Waves tutorial](../tower_defense_waves/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Waves sample, plus placeholders for the new files and their tests:

```
tower_defense_scenery/
├── index.html, tests.html   (already list the new scripts)
├── js/
│   ├── scenery.js            (placeholder -- Step 2)
│   ├── maps.js               (changes -- Step 1)
│   ├── placement.js          (changes -- Step 3)
│   ├── main.js               (a change -- Step 4)
│   └── everything else, from the Waves sample
└── tests/
    ├── scenery.tests.js      (placeholder -- Step 2)
    ├── maps.tests.js, placement.tests.js, build.tests.js, hand.tests.js   (additions)
    └── everything else, from the Waves sample
```

Open `tests.html` before you change anything, through the web server. You should see **563 passing tests**, the Waves sample's.

### The models

The five props are in `assets/scenery/`. Like the tiles they are **static** (no skeleton, no animation), and they were made smaller by the same script (6,000 to 15,000 triangles, about a megabyte each). They are of every shape: a thin tall perch, a low wide pond. The [assets README](../assets/README.md) has the table.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_scenery/` (the command prints the exact address), or use the *Live Server* extension in VS Code. `?map=1` is the second map.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Props in the map**: letters in the text.
2. **The props themselves**: models in cells.
3. **In the way**: a tower can't go on a shrine.
4. **The game.**

---

## Step 1: Props in the map

A map is rows of text, and a prop is one more character. This is a change to what a map can *say*, and the rule for such a change is that **everything that reads a map must still work for a map that doesn't say it**. A map with no props is still a map, and the tests of every earlier tutorial go on passing.

First the legend. A prop is a letter, and what it means is the name of a prop in the table you write in the next step:

In `js/maps.js`, **replace** line 6:

```js
// where they are trying to get to: both are pieces of road.
```

with:

```js
// where they are trying to get to: both are pieces of road. Anything else is a *prop*: a piece of
// scenery that stands on a cell of grass (the name is a key of PROPS, in scenery.js).
```

In `js/maps.js`, **replace** line 13:

```js
};
```

with:

```js
  c: "cabbage_cart",
  k: "koi_pond",
  s: "shrine",
  l: "lemur_perch",
  b: "bison_camp",
};

// What a character can mean that is not scenery.
const GROUND = ["grass", "road", "start", "goal"];
```

- **`GROUND` is the four things a cell can be that aren't scenery.** Anything else in the legend is a prop. That is a better way to say it than a list of props in the parser: when you add another prop, you add a line to the legend and one to the table in `scenery.js`, and `parseMap` doesn't change.
- **`s` and `S` are different.** A shrine is a lowercase *s*, and the start is a capital one. (A map is read by people, and a capital for the two things that matter to the road, and lowercase for the decoration, is easy to see.)

Now the two maps get scenery. The first has a koi pond at the back, a cart, a shrine and another cart on the right, a lemur perch on the left, and a sky bison camp at the back:

In `js/maps.js`, **replace** lines 27 to 33:

```js
      "..............",
      "S###########..",
      "...........#..",
      "..##########..",
      "..#...........",
      "..##########..",
      "...........#..",
```

with:

```js
      "...b........k.",
      "S###########..",
      ".c.........#..",
      "..##########..",
      "..#.........s.",
      "..##########.c",
      "l..........#..",
```

and the second has a cart, a shrine, a pond, a perch and a bison camp of its own:

In `js/maps.js`, **replace** lines 41 to 48:

```js
      ".S..........G.",
      ".#..####..###.",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".#..#..#..#...",
      ".####..####...",
```

with:

```js
      ".S....b.....G.",
      ".#..####..###.",
      ".#c.#..#..#...",
      ".#..#..#..#..s",
      ".#..#..#..#...",
      ".#..#..#k.#...",
      ".#..#..#..#...",
      ".####..####..l",
```

- **Props are beside the road, and between its stretches,** in places that a tower might have gone. That is the *point*: they make the player choose a different place, and keep the board from being a lawn with a stripe.

Now the parser. It keeps a list of the props, and it says in its comment what it gives back:

In `js/maps.js`, **replace** lines 54 to 55:

```js
// A map as a grid: { name, cols, rows, cells, start, goal }. `cells[row][col]` is "grass" or "road",
// and the start and goal are also road. A character that isn't in the legend is a grass cell and is
```

with:

```js
// A map as a grid: { name, cols, rows, cells, start, goal, props }. `cells[row][col]` is "grass" or "road",
// and the start and goal are also road. A prop stands on a cell of grass, which is what that cell is, and is also
// in `props`, as { kind, col, row }. A character that isn't in the legend is a grass cell and is
```

In `js/maps.js`, after line 62, add:

```js
  const props = [];
```

In `js/maps.js`, after line 70, add:

```js
        if (meaning && !GROUND.includes(meaning)) props.push({ kind: meaning, col, row });
```

In `js/maps.js`, after line 84, add:

```js
    props,
```

- **The cell that a prop stands on is *grass*,** and the prop is in a list of its own. So everything that asked whether a cell was road, or counted the road beside a cell, goes on being right. A prop is a fact *about* a grass cell, and not a new kind of cell.
- **`propAt(grid, col, row)`** is the question to ask of the list, and it comes next to `isRoad`:

In `js/maps.js`, after line 94, add:

```js
// The prop that stands in a cell of a parsed map, or null if there isn't one.
function propAt(grid, col, row) {
  return grid.props.find((prop) => prop.col === col && prop.row === row) || null;
}

```

And the new name is exported:

In `js/maps.js`, **replace** lines 145 to 147:

```js
  module.exports = { LEGEND, MAPS, parseMap, isRoad, roadNeighbors, mapProblems };
} else {
  Object.assign(window, { LEGEND, MAPS, parseMap, isRoad, roadNeighbors, mapProblems });
```

with:

```js
  module.exports = { LEGEND, GROUND, MAPS, parseMap, isRoad, propAt, roadNeighbors, mapProblems };
} else {
  Object.assign(window, { LEGEND, GROUND, MAPS, parseMap, isRoad, propAt, roadNeighbors, mapProblems });
```

Now the tests. The two tests of the legend say the wrong thing now (there are more than four meanings), so they are replaced:

In `tests/maps.tests.js`, **replace** lines 8 to 13:

```js
  QUnit.test("every character means grass, road, the start or the goal", (assert) => {
    for (const meaning of Object.values(LEGEND)) assert.true(["grass", "road", "start", "goal"].includes(meaning));
  });

  QUnit.test("there is a character for each of the four", (assert) => {
    assert.deepEqual(Object.values(LEGEND).sort(), ["goal", "grass", "road", "start"]);
```

with:

```js
  QUnit.test("every character means a kind of ground (grass, road, the start or the goal) or a prop", (assert) => {
    for (const [character, meaning] of Object.entries(LEGEND)) {
      assert.strictEqual(character.length, 1, character);
      assert.true(GROUND.includes(meaning) || /^[a-z_]+$/.test(meaning), meaning);
    }
  });

  QUnit.test("there is a character for each of the four kinds of ground", (assert) => {
    for (const ground of GROUND) assert.true(Object.values(LEGEND).includes(ground), ground);
    assert.deepEqual([...GROUND].sort(), ["goal", "grass", "road", "start"]);
  });

  QUnit.test("and each prop has a character of its own, so that no two mean the same", (assert) => {
    const props = Object.values(LEGEND).filter((meaning) => !GROUND.includes(meaning));

    assert.true(props.length >= 4);
    assert.strictEqual(new Set(props).size, props.length);
```

and the new tests of props in a map:

In `tests/maps.tests.js`, after line 86, add:

```js
QUnit.module("props in a map", () => {
  const grid = parseMap(smallMap("S#c.G", "s...k", "l...b"));

  QUnit.test("each prop is found, with what it is and where", (assert) => {
    assert.deepEqual(grid.props, [
      { kind: "cabbage_cart", col: 2, row: 0 },
      { kind: "shrine", col: 0, row: 1 },
      { kind: "koi_pond", col: 4, row: 1 },
      { kind: "lemur_perch", col: 0, row: 2 },
      { kind: "bison_camp", col: 4, row: 2 },
    ]);
  });

  QUnit.test("the cell a prop stands on is grass, and not road", (assert) => {
    assert.strictEqual(grid.cells[0][2], "grass");
    assert.false(isRoad(grid, 2, 0));
  });

  QUnit.test("a prop is not an unknown character", (assert) => {
    assert.deepEqual(grid.unknown, []);
  });

  QUnit.test("propAt gives the prop in a cell, or null", (assert) => {
    assert.deepEqual(propAt(grid, 0, 1), { kind: "shrine", col: 0, row: 1 });
    assert.strictEqual(propAt(grid, 1, 1), null);
    assert.strictEqual(propAt(grid, 9, 9), null);
  });

  QUnit.test("a map with no props has an empty list", (assert) => {
    assert.deepEqual(parseMap(smallMap("S##G")).props, []);
  });

  QUnit.test("props are no problem, for the check of a map, as long as the rest is right", (assert) => {
    assert.deepEqual(mapProblems(smallMap("S###G", ".c.s.", "k...l"), MAP_BOARD), []);
  });

  QUnit.test("a prop beside the road is not a piece of road, so it does not turn the road into a fork", (assert) => {
    assert.deepEqual(mapProblems(smallMap("S###G", ".c...", "....."), MAP_BOARD), []);
    assert.strictEqual(roadNeighbors(parseMap(smallMap("S#c", "...")), 1, 0), 1 + 0, "only the start beside it counts");
  });

  QUnit.test("the real maps have a few props each, and none of them is on the road or at the start or the goal", (assert) => {
    for (const map of MAPS) {
      const real = parseMap(map);

      assert.true(real.props.length >= 4, map.name);
      for (const prop of real.props) assert.strictEqual(real.cells[prop.row][prop.col], "grass", `${map.name} ${prop.kind}`);
    }
  });
});

```

- **"A prop beside the road is not a piece of road, so it does not turn the road into a fork"** is the test of the rule above. A map that is perfectly good has props right beside its road, and the check says nothing.
- **"The real maps have a few props each, and none of them is on the road"** says it of the maps you wrote.

**Check:** open `tests.html`. 572 tests pass.

---

## Step 2: The props themselves

A prop is a model. It is the same kind of thing as a tile (static, loaded once, many instances), with a different shape each: so this file does for the props what `tiles.js` did for the tiles, with one difference: a tile is as wide as its cell, and a prop is as wide as *it* is.

Open the placeholder `js/scenery.js` and replace its contents with:

```js
// The scenery: props that stand on the board and make it a place. A prop is a model that doesn't do anything: it
// stands in a cell of grass, says what it is, and is in the way of a tower. The map's text says where each is (see maps.js);
// this file says what each looks like and puts them there. See ../tests/scenery.tests.js.

// The props, one row each. `name` is what the game calls it in a sentence, `file` is the model, and `width` is how wide
// it is made in the world, where a cell is two across: a tall thin thing is made narrower than a low wide one, so
// that none is bigger than its cell and none is lost in it.
const PROPS = {
  cabbage_cart: { name: "a cabbage cart", file: "scenery/cabbage_cart.glb", width: 1.85 },
  koi_pond: { name: "a koi pond", file: "scenery/koi_pond.glb", width: 1.9 },
  shrine: { name: "a spirit shrine", file: "scenery/shrine.glb", width: 1.55 },
  lemur_perch: { name: "a lemur perch", file: "scenery/lemur_perch.glb", width: 1.1 },
  bison_camp: { name: "a sky bison camp", file: "scenery/bison_camp.glb", width: 1.9 },
};

// Which way to turn a prop, in quarter turns, so that two of one kind aren't a copy of each other. Like the grass,
// it depends only on the cell, so that it is the same every time.
function propTurn(col, row) {
  let hash = Math.imul(row + 3, 374761393) ^ Math.imul(col + 5, 668265263);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822519);
  return (hash >>> 13) & 3;
}

// Loads every prop, and works out how each is scaled, lifted and centered to stand in the middle of a cell.
async function loadProps(scene, props = PROPS) {
  const kinds = Object.keys(props);
  const containers = await Promise.all(kinds.map((kind) => loadModel(scene, props[kind].file)));
  const loaded = {};
  kinds.forEach((kind, i) => {
    const bounds = measure(containers[i].rootNodes[0]);
    const scale = fitScale(sizeOf(bounds), props[kind].width);
    loaded[kind] = { container: containers[i], scale, lift: bottomOffset(bounds, scale), shift: centerOffset(bounds, scale) };
  });
  return loaded;
}

// Puts one prop in a cell. Two nodes, as a tile has: the outer one is in the middle of the cell and turns, the inner one
// scales the model, stands it on the ground and centers it. The prop is an instance, so a map with a lot of the same
// kind of prop costs no more to draw than one.
function placeProp(scene, model, name, col, row, turn = 0, board = BOARD) {
  const { x, z } = cellCenter(col, row, board);
  const outer = new BABYLON.TransformNode(name, scene);
  outer.position.set(x, 0, z);
  outer.rotation.y = (turn * Math.PI) / 2;

  const inner = new BABYLON.TransformNode(`${name} model`, scene);
  inner.parent = outer;
  inner.position.set(model.shift.x, model.lift, model.shift.z);
  inner.scaling.setAll(model.scale);

  const copy = model.container.instantiateModelsToScene((original) => `${name} ${original}`, false, { doNotInstantiate: false });
  copy.rootNodes[0].parent = inner;
  return outer;
}

// Puts every prop of a map on the board: [{ kind, col, row, node }].
function buildProps(scene, loaded, grid, board = BOARD) {
  return grid.props.map(({ kind, col, row }) => ({
    kind,
    col,
    row,
    node: placeProp(scene, loaded[kind], `${kind} ${col},${row}`, col, row, propTurn(col, row), board),
  }));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PROPS, propTurn, loadProps, placeProp, buildProps };
} else {
  Object.assign(window, { PROPS, propTurn, loadProps, placeProp, buildProps });
}
```

Things to notice:

- **`PROPS` is a table, and it is read in two places:** the loader takes the file and the width from it, and the game takes the name from it to say *there is a spirit shrine there*. The name is written to be read in that sentence, with its *a* in it: *a cabbage cart*, *a koi pond*. A test checks it.
- **`width` is how wide the prop is made, and it is chosen for the look of it.** The perch is tall and thin, so it is the narrowest, and the pond and the bison camp are low and wide, so they are the widest. Each is under two, which is a cell, so that no prop is bigger than the cell it is in.
- **`propTurn` is the same idea as `grassTurn`:** a hash of the cell, so two carts aren't copies of each other, and so that it is the same every time. It uses different numbers from the grass, so that the prop is not always turned as the tile under it is, and a test says so.
- **`loadProps` measures each model** (`measure`), scales it to its width on its longer side (`fitScale`), and works out how to stand it on the ground (`bottomOffset`) and put its middle in the middle of the cell (`centerOffset`). Every one of those is from `models.js`, which is why it was written the way it was: a new kind of model is those four calls and a table.
- **`placeProp` is two nodes and an instance, as a tile was.** The outer node is at the cell's middle and does the turning; the inner node scales, lifts and shifts; the model hangs from it as an *instance* (`doNotInstantiate: false`). That matters for scenery more than for tiles: a map that is *covered* in carts costs no more to draw than one cart.
- **`buildProps` puts a prop in every cell of the map that has one,** and gives back what it built, so that a test can see.

Open the placeholder `tests/scenery.tests.js` and replace its contents with:

```js
QUnit.module("the PROPS table", () => {
  QUnit.test("every prop has a name for a sentence, a model, and a width that fits a cell", (assert) => {
    for (const [kind, spec] of Object.entries(PROPS)) {
      assert.true(/^an? /.test(spec.name), `${kind}: "${spec.name}" reads as "there is ${spec.name} there"`);
      assert.true(spec.file.startsWith("scenery/") && spec.file.endsWith(".glb"), kind);
      assert.true(spec.width > 0.5 && spec.width < BOARD.cell, kind);
    }
  });

  QUnit.test("there are five, and each has a character in the map's legend", (assert) => {
    assert.strictEqual(Object.keys(PROPS).length, 5);
    for (const kind of Object.keys(PROPS)) assert.true(Object.values(LEGEND).includes(kind), kind);
  });

  QUnit.test("and every character of the legend that is not the ground is one of them", (assert) => {
    for (const meaning of Object.values(LEGEND)) assert.true(GROUND.includes(meaning) || meaning in PROPS, meaning);
  });

  QUnit.test("the maps use every one of them", (assert) => {
    const used = new Set(MAPS.flatMap((map) => parseMap(map).props.map((prop) => prop.kind)));

    assert.deepEqual([...used].sort(), Object.keys(PROPS).sort());
  });
});

QUnit.module("propTurn", () => {
  QUnit.test("is a number of quarter turns, from none to three, the same every time for a cell", (assert) => {
    for (const { col, row } of boardCells()) {
      const turn = propTurn(col, row);

      assert.true(Number.isInteger(turn) && turn >= 0 && turn <= 3);
      assert.strictEqual(propTurn(col, row), turn);
    }
  });

  QUnit.test("uses all four, so that two of a kind are not a copy of each other", (assert) => {
    const seen = new Set(boardCells().map(({ col, row }) => propTurn(col, row)));

    assert.strictEqual(seen.size, 4);
  });

  QUnit.test("is not the turn of the grass under it, or every prop would be turned as its tile is", (assert) => {
    const same = boardCells().filter(({ col, row }) => propTurn(col, row) === grassTurn(col, row)).length;

    assert.true(same < boardCells().length * 0.5);
  });
});

QUnit.module("loading and placing props", (hooks) => {
  let engine, scene, loaded;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadProps(scene);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const bounds = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true);
  };

  QUnit.test("every kind loads", (assert) => {
    assert.deepEqual(Object.keys(loaded).sort(), Object.keys(PROPS).sort());
  });

  QUnit.test("each is made the width the table says, on its longer side, and no bigger than its cell", (assert) => {
    for (const kind of Object.keys(PROPS)) {
      const node = placeProp(scene, loaded[kind], `size ${kind}`, 3, 2);
      const { min, max } = bounds(node);

      assert.true(Math.abs(Math.max(max.x - min.x, max.z - min.z) - PROPS[kind].width) < 0.02, `${kind}: ${Math.max(max.x - min.x, max.z - min.z).toFixed(2)}`);
      assert.true(max.x - min.x < BOARD.cell && max.z - min.z < BOARD.cell, kind);
    }
  });

  QUnit.test("each stands on the ground, in the middle of its cell, and under the roof of the view", (assert) => {
    const { x, z } = cellCenter(3, 2);
    for (const kind of Object.keys(PROPS)) {
      const { min, max } = bounds(placeProp(scene, loaded[kind], `stand ${kind}`, 3, 2));

      assert.true(Math.abs(min.y) < 0.02, `${kind} stands at ${min.y.toFixed(3)}`);
      assert.true(Math.abs((min.x + max.x) / 2 - x) < 0.05 && Math.abs((min.z + max.z) / 2 - z) < 0.05, `${kind} is centered`);
      assert.true(max.y < BOARD.headroom, kind);
    }
  });

  QUnit.test("a turned prop is still in the middle of its cell, and each turn is a quarter", (assert) => {
    const { x, z } = cellCenter(1, 1);
    for (let turn = 0; turn < 4; turn++) {
      const node = placeProp(scene, loaded.shrine, `turn ${turn}`, 1, 1, turn);
      const { min, max } = bounds(node);

      assert.strictEqual(node.rotation.y, (turn * Math.PI) / 2);
      assert.true(Math.abs((min.x + max.x) / 2 - x) < 0.05 && Math.abs((min.z + max.z) / 2 - z) < 0.05, `turn ${turn}`);
    }
  });

  QUnit.test("two of a kind share their triangles: each is an instance", (assert) => {
    const a = placeProp(scene, loaded.koi_pond, "a", 0, 0).getChildMeshes().filter((mesh) => mesh.sourceMesh);
    const b = placeProp(scene, loaded.koi_pond, "b", 5, 5).getChildMeshes().filter((mesh) => mesh.sourceMesh);

    assert.true(a.length > 0);
    assert.strictEqual(a[0].sourceMesh, b[0].sourceMesh);
  });

  QUnit.test("buildProps puts a prop in every cell of the map that has one, and in no other", (assert) => {
    for (const map of MAPS) {
      const grid = parseMap(map);
      const built = buildProps(scene, loaded, grid);

      assert.strictEqual(built.length, grid.props.length, map.name);
      for (const { kind, col, row, node } of built) {
        const { x, z } = cellCenter(col, row);

        assert.true(Math.abs(node.position.x - x) < 1e-9 && Math.abs(node.position.z - z) < 1e-9, `${kind} ${col},${row}`);
        assert.strictEqual(node.rotation.y, (propTurn(col, row) * Math.PI) / 2, `${kind} ${col},${row}`);
        assert.false(isRoad(grid, col, row), `${kind} ${col},${row} is not on the road`);
      }
    }
  });

  QUnit.test("a map with no props has none built", (assert) => {
    assert.deepEqual(buildProps(scene, loaded, parseMap({ name: "test", rows: ["S##G"] })), []);
  });
});
```

- **"Every character of the legend that is not the ground is one of them"** and **"the maps use every one of them"** are what keep the legend and the table together: neither can have a prop that the other doesn't.
- **"Each is made the width the table says, and no bigger than its cell"** measures the box round a real, placed prop. **"Each stands on the ground, in the middle of its cell, and under the roof of the view"** says the rest. They are the tests that would have said, at once, that the lemur perch (which is a metre and a half tall, and made narrow) is not underground or off to one side.
- **"A turned prop is still in the middle of its cell"** turns the shrine all four ways. A model that was centered on a *corner* of its box would swing round as it turned, and this is what says so.

**Check:** open `tests.html` through the web server. 586 tests pass.

---

## Step 3: In the way

A tower can't be built on a prop. The rule that decides is `canBuild`, in one place, and it says *why*; so this is two lines:

In `js/placement.js`, **replace** line 5:

```js
// Whether a tower can stand in a cell: on the board, on grass, and with nothing in it already. `taken`
```

with:

```js
// Whether a tower can stand in a cell: on the board, on grass, with no scenery on it, and with no tower in it already. `taken`
```

In `js/placement.js`, after line 11, add:

```js
  const prop = propAt(grid, col, row);
  if (prop) return { ok: false, reason: `there is ${PROPS[prop.kind].name} there` };
```

- **The order of the rules is the order of what can be put right.** *Not on the board* and *road* can't be, and nor can a prop. A tower in the cell can (it can be sold, in a later tutorial), so that comes last.
- **The reason is built from the table:** `there is ${PROPS[prop.kind].name} there`. The sentence is the one the player sees under the outline, as they drag a podium over the shrine.

Nothing else needs to change for a podium to be refused. The tray's outline asks `checkBuild`, which asks `canBuild`; `tryBuild` asks `checkBuild`; and the list of cells where a tower could be (`buildableCells`) asks `canBuild` for each. That is what it is to have the rule in one place.

And the tests: the rule itself, with a map that has a shrine and a cart in it:

In `tests/placement.tests.js`, after line 36, add:

```js
  QUnit.test("a prop is in the way, and says what it is", (assert) => {
    const scenic = parseMap({ name: "test", rows: ["S##..", "..#s.", "c.#.G"] });

    assert.deepEqual(canBuild(scenic, 3, 1), { ok: false, reason: "there is a spirit shrine there" });
    assert.deepEqual(canBuild(scenic, 0, 2), { ok: false, reason: "there is a cabbage cart there" });
    assert.true(canBuild(scenic, 4, 0).ok, "the cells beside them are free");
  });

  QUnit.test("each kind of prop says its own name", (assert) => {
    for (const [kind, spec] of Object.entries(PROPS)) {
      const scenic = { cols: 3, rows: 1, cells: [["grass", "grass", "grass"]], props: [{ kind, col: 1, row: 0 }] };

      assert.strictEqual(canBuild(scenic, 1, 0).reason, `there is ${spec.name} there`, kind);
    }
  });

  QUnit.test("a prop beats a tower in the reason, since it can't be put right and the tower can", (assert) => {
    const scenic = parseMap({ name: "test", rows: ["S#.G", ".s.."] });

    assert.strictEqual(canBuild(scenic, 1, 1, [{ col: 1, row: 1 }]).reason, "there is a spirit shrine there");
  });

```

and the two that count the buildable cells, which now leave out the props:

In `tests/placement.tests.js`, **replace** line 75:

```js
  QUnit.test("on a real map, every cell that is not road, and only those", (assert) => {
```

with:

```js
    QUnit.test("on a real map, every cell that is not road, and only those", (assert) => {
```

In `tests/placement.tests.js`, **replace** lines 81 to 82:

```js
      assert.strictEqual(cells.length, grid.cols * grid.rows - roads, map.name);
      assert.true(cells.every(({ col, row }) => !isRoad(grid, col, row)), map.name);
```

with:

```js
      assert.strictEqual(cells.length, grid.cols * grid.rows - roads - grid.props.length, map.name);
      assert.true(cells.every(({ col, row }) => !isRoad(grid, col, row) && !propAt(grid, col, row)), map.name);
```

Building on a prop does not build, and does not pay:

In `tests/build.tests.js`, after line 58, add:

```js
  QUnit.test("on scenery it does not build, or pay, and says what is there", (assert) => {
    const state = { grid: parseMap({ name: "test", rows: ["S##..", "..#s.", "..#.G"] }), towers: [], wallet: new Wallet(400) };
    const result = tryBuild(state, "air", 3, 1, make);

    assert.false(result.ok);
    assert.strictEqual(result.reason, "there is a spirit shrine there");
    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
  });

```

And the whole drag, in the test of the hand: a podium dragged over a shrine is red, says what is there, and builds nothing when it is let go:

In `tests/hand.tests.js`, after line 167, add:

```js
  QUnit.test("a cell with scenery on it is red, and says what is there", (assert) => {
    state.grid = parseMap({ name: "test", rows: ["S##.......", "..#..s....", "..#.......", "..#......G"] });
    drag("air", at([5, 1]));

    assert.deepEqual(hand.outline.target, outlineTarget(false));
    assert.strictEqual(parts.message.textContent, "there is a spirit shrine there");
    hand.release(at([5, 1]));
    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
  });

```

- **The test of the hand replaces the grid of the state with a small map** that has a shrine in it, and drags over it. The hand reads `state.grid` each time, so it sees the new one.

**Check:** open `tests.html`. 591 tests pass.

---

## Step 4: The game

Two lines in `main.js`: load the props, and put them on the board, after the tiles and the island:

In `js/main.js`, after line 53, add:

```js
  const scenery = await loadProps(scene);
  buildProps(scene, scenery, grid);
```

**Check:** open `tests.html`. 591 tests pass. Then open `index.html` through the web server. The island has a cabbage cart, a shrine, a koi pond, a lemur perch and a sky bison camp on it. Drag a podium over one: the outline is red, and the line above the tray says *there is a spirit shrine there*. (And on the second map, `?map=1`, others.)

---

## Step 5: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **Move one.** In `maps.js`, change a letter in a row of a map to a `.` and put an `s` somewhere else. Reload: the shrine has moved, and the cell it left can be built on.
- **Cover a map.** Put a dozen `c` in the grass of a map. Nothing gets slower: they are instances. (And the fairness test says whether the game is still fair with that few places to build.)
- **A bigger shrine.** Change `width` of the shrine to `1.95`: it fills its cell. Make it `2.5` and the test says it is bigger than a cell.
- **Turn.** Change `propTurn` to always return `0`: every cart faces the same way, and the test that says the turns are used fails.
- **A prop on the road.** Put an `s` where the road is: the road has a gap in it, and the splash says the road has a piece missing.
- **A new prop.** Add a fifth: a line in `LEGEND` (`b: "lantern"`) and a row in `PROPS` with a model, and the map can use it. (You would need a model: copy one to try.) Nothing else needs to change.

---

## Troubleshooting

- **The splash never goes, and the console says `PROPS is not defined` or `propAt is not defined`:** `scenery.js` is missing from `index.html`, or has no export block, or `maps.js` is missing `propAt` from its export block.
- **`Cannot read properties of undefined (reading 'name')` when a podium is dragged over a prop:** the kind in the map isn't a key of `PROPS`: the legend and the table don't agree.
- **A prop is under the ground, or floating:** `bottomOffset`, in `loadProps`. The test "each stands on the ground" says how far out it is.
- **A prop is off to one side of its cell:** `centerOffset`, or the shift is on the wrong node.
- **A prop is as big as the whole board, or too small to see:** the `width`: `fitScale` makes the *longer* side that wide.
- **A tower can be built on a prop:** `canBuild` doesn't ask `propAt`, or `parseMap` isn't filling in `props`.
- **The tests of the legend fail:** they say more than four meanings now, and Step 1 replaces them.

---

## What you have

A board with things on it: five props written in the map's text, loaded once and drawn as instances, each standing in its cell, in the way of a tower, with a sentence that says what it is, behind a test suite of 591 tests.

**Next up:** variety. The [next tutorial](../tower_defense_variety/TUTORIAL.md) gives the benders **upgrades** (a podium that can be made better for gold), and makes the fire nation's **combo** do what it looks like: every punch of it throws its own bolt.
