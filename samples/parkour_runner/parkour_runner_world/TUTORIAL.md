# Tutorial: Parkour Runner World -- A City Street You Can Walk Down

This is the first tutorial in the Parkour Runner series: an endless runner that races through a city street, jumping, sliding and rolling past obstacles. Nobody runs yet. First you build the **world**: a street made of real 3D pieces, buildings on both sides, street lights, fog, and a camera you can walk down it to look around. You write the code; this document tells you what to write and why.

Where the Asteroids series drew flat line art and added 3D at the very end, this series is real 3D from the first step.

By the end you'll have:

- A **page and a perspective camera**, with fog and two lights, so the world has depth and a bright side and a dark side
- A **street plan**: plain numbers and arrays that say where every road tile, sidewalk, street light and building goes, from a seeded random-number generator so the street is the same every time
- A **piece library** that loads each 3D piece from its `.glb` file **once**, and places as many **instances** of it as the street needs
- A **scout** that you walk down the street with the arrow keys, to look at the world
- A **splash screen** that covers the page while the street loads, and stays for at least three seconds
- Unit tests for the street plan, the piece library, the scout and the splash timing

**What you'll learn:** a perspective camera and its field of view, fog, `HemisphericLight` and `DirectionalLight`, loading `.glb` files with `SceneLoader`, centering and scaling models, instancing with `instantiateHierarchy` so copies share their geometry, keeping layout logic free of Babylon.js so it can be tested, a seeded random-number generator, an async `createScene`, and a splash screen with a minimum display time.

## Where you're starting

This folder holds only empty placeholder files for the code you'll write. The 3D pieces are in a folder beside it:

```
parkour_runner/
├── assets/                                         (the 3D pieces, shared by the series)
├── parkour_runner_splash.png, parkour_runner_splash_small.jpg
└── parkour_runner_world/
    ├── index.html                                  (placeholder -- Step 1)
    ├── tests.html                                  (placeholder -- Step 2)
    ├── js/
    │   ├── main.js                                 (placeholder -- Step 1)
    │   ├── world.js                                (placeholder -- Step 2)
    │   ├── models.js                               (placeholder -- Step 3)
    │   ├── scout.js                                (placeholder -- Step 5)
    │   └── splash.js                               (placeholder -- Step 6)
    └── tests/
        ├── world.tests.js                          (placeholder -- Step 2)
        ├── models.tests.js                         (placeholder -- Step 3)
        ├── scout.tests.js                          (placeholder -- Step 5)
        └── splash.tests.js                         (placeholder -- Step 6)
```

### The pieces

The street is built from a few of the models in `assets/`. They're free CC0 models from [Kenney](https://www.kenney.nl); the [assets README](../assets/README.md) has the credits, and lists the rest of the models for the later steps.

| Folder | Pieces used here |
|---|---|
| `roads/` | `road_straight` (the road), `tile_low` (a flat sidewalk), `light_square` (a street light) |
| `commercial/` | sixteen buildings, from three-story shops to skyscrapers |

### You need a web server for this one

Loading a `.glb` file can't work from a page opened from a file: browsers don't let such a page fetch other files. You need to open the game over `http://`. Either of these works:

- In the repo's root folder, run `npx serve`, then open `http://localhost:3000/samples/parkour_runner/parkour_runner_world/` (the command prints the exact address).
- In VS Code, install the *Live Server* extension, right-click `index.html`, and choose *Open with Live Server*.

(The tests page, `tests.html`, doesn't load any models, so it works from a file.) The game on GitHub Pages is served over `https://`, so it works there too.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with the empty placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds a name to it. That way every file is valid JavaScript after every step.

---

## Step 1: A page, a sky, and a camera

Start with the smallest thing that draws something: a page with a canvas, a Babylon.js scene, a sky, a camera and lights.

### 1a. The page

Put this in `index.html`. It links the shared stylesheet and screenshot script used by every sample in the repo, the Babylon.js library, and your `main.js`:

```html
<!DOCTYPE html>
<html>

<head>
  <meta charset="utf-8">
  <title>Parkour Runner World - Babylon.js</title>
  <link rel="stylesheet" href="../../../css/sample.css">
  <style>
    /* .hint has pointer-events: none so the canvas stays interactive; opt the
       "Run tests" link back in so it can be clicked. */
    .hint a {
      pointer-events: auto;
      color: #8ab4ff;
    }
  </style>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script>
    // Parkour Runner will use Space to jump later on, so move the shared
    // screenshot shortcut to C for this series.
    window.SCREENSHOT_KEY = "KeyC";
  </script>
</head>

<body>
  <a class="back-button" href="../../../index.html#parkour_runner">&larr; Samples</a>
  <div class="hint">C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
  <canvas id="renderCanvas"></canvas>
  <script src="../../../js/screenshot.js"></script>
  <script src="js/main.js"></script>
</body>

</html>
```

Things to notice:

- **The `.hint` bar** is the player's only on-screen reminder of the controls. It only mentions the screenshot key for now; you'll update it in Step 5.
- **`window.SCREENSHOT_KEY = "KeyC"`** moves the shared screenshot shortcut off the Space bar, because this series will use Space to jump.
- **The red page background** you'll see in the browser while things load is deliberate: it's a way to notice that nothing has drawn yet. (Step 6 covers it up with a splash screen.)

### 1b. The scene

Put this in `js/main.js`:

```js
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const SKY_COLOR = "#9cc4e8"; // the sky, and the color distant things fade into
const FOG_DENSITY = 0.014;

// The camera looks down the street from a bit above where the runner will be.
const CAMERA_HEIGHT = 3.4;
const CAMERA_PITCH = 0.14; // radians of tilt down
const CAMERA_FOV = 0.9;
const CAMERA_START_Z = -9;

const createScene = () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString(`${SKY_COLOR}FF`);

  // Fog fades far things into the sky color. It hides the end of the street
  // and makes the world feel bigger than it is.
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor = BABYLON.Color3.FromHexString(SKY_COLOR);
  scene.fogDensity = FOG_DENSITY;

  // A perspective camera (things in the distance get smaller), unlike the
  // orthographic one the earlier series used. FreeCamera's rotation.x tips it
  // downward; rotation.y stays 0, so it looks straight down +z.
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, CAMERA_HEIGHT, CAMERA_START_Z), scene);
  camera.rotation.x = CAMERA_PITCH;
  camera.fov = CAMERA_FOV;
  camera.minZ = 0.1;
  camera.maxZ = 400;
  scene.activeCamera = camera;

  // A soft light from the sky fills in the shadows; a stronger one from above
  // and ahead gives every building a bright side and a dark side.
  const sky = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  sky.intensity = 0.75;
  sky.groundColor = BABYLON.Color3.FromHexString("#5a6270");
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.5, -1, 0.45), scene);
  sun.intensity = 0.85;

  return { scene };
};

const { scene } = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
```

Things to notice:

- **A perspective camera.** The Asteroids series used an *orthographic* camera, where an object looks the same size however far away it is. Here the camera is a `FreeCamera` with a **field of view** (`fov`, in radians), so distant things shrink toward a vanishing point, like a real view down a street. `rotation.x` tips the camera downward a little (a positive value looks down), and with `rotation.y` left at 0 the camera looks straight down the **+z axis**, which is the way the street will run.
- **The axes.** Babylon.js is left-handed: **+x is to the right, +y is up, and +z is forward**, away from you into the screen. The street runs along z, so across it is x: left of the street is negative x, right is positive.
- **`minZ` and `maxZ`** are the nearest and farthest distances the camera draws.
- **Fog fades far things into one color.** `FOGMODE_EXP2` makes the fraction of fog grow with the *square* of the distance, so it stays clear nearby and thickens quickly in the distance. It's set to the same color as the sky (`clearColor`), so far buildings dissolve into the horizon, which also hides the end of the street.
- **Two lights.** A `HemisphericLight` is a soft light from a whole half of the sky (its vector is the direction it comes *from*). It fills in the shadows. A `DirectionalLight` is a sun (its vector is the direction the light *travels*): it shines down and a little forward, so every building gets a bright side and a dark side. Nothing is lit yet because there is nothing to light.

Serve the page and open it. You should see a **plain sky-blue window**, the hint bar, and the back button. Open the developer console (F12) and keep it open as you work: it should show no red errors.

---

## Step 2: The street plan

The street is a lot of copies of a few pieces: a road tile, a sidewalk tile, a street light and a selection of buildings. *Where* each copy goes is plain arithmetic, so it goes in its own file that doesn't touch Babylon.js and is easy to test. It works out a list of **placements**, each one saying "put this piece here, turned this way", and a later step makes that list real.

Open `js/world.js` (it's a placeholder). You'll build it in six pieces, and each piece goes **below** the one before it and **above** the export block at the end.

### 2a. Scale and distances

```js
// The street: where every piece of the world goes. Everything in here is plain
// numbers and arrays (no Babylon.js), so the layout can be tested on its own;
// models.js loads the pieces and main.js places them where this says.
//
// The street runs along +z. The runner will start near z = 0 and run toward
// +z; x is across the street (left is negative, right is positive) and y is up.
// A "row" is one road tile long.

// The Kenney city pieces were drawn about 7 times too small for the runner
// (1.83 units tall, a person): one road tile is 1 unit wide, a shipping
// container 0.35 units tall. Scaling every piece by 7 makes a road tile 7 units
// wide and a container about 2.5 units tall, which is the size of the real thing.
const WORLD_SCALE = 7;

// One road tile is one row: this many world units long.
const TILE = WORLD_SCALE;

// The sidewalk tiles sit right beside the road, and the buildings start a
// little way into them, so about 4 units of sidewalk show in front of each.
const SIDEWALK_X = TILE; // center of a sidewalk tile, to the left and right of the road
const BUILDING_EDGE_X = 7.5; // how far from the middle of the street a building's front stands

const BUILDING_GAP = 0.1; // a little space between neighbors, in piece units
const LIGHT_EVERY = 2; // a street light every this many rows, alternating sides

// The Kenney buildings face -z, the way they come out of the file. Turning one a
// quarter turn faces it down the street's cross axis: +PI/2 faces -x (so a
// building on the right, at positive x, looks back at the street) and -PI/2
// faces +x (for the left side).
const FACE_LEFT_SIDE = -Math.PI / 2;
const FACE_RIGHT_SIDE = Math.PI / 2;

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDING_GAP, LIGHT_EVERY };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDING_GAP, LIGHT_EVERY });
}
```

Things to notice:

- **The scale.** The Kenney pieces were drawn about seven times too small for the runner who arrives in the next step (a person is 1.83 units tall, but a road tile is 1 unit wide and a shipping container is 0.35 units tall). Drawing every piece seven times bigger makes a road tile seven units wide and a container about as tall as a real one.
- **The street runs along +z**, so a "row" of the street is one road tile long, `TILE` units. Rows are what the road and sidewalk tiles line up with.
- **The sidewalks and buildings sit to the left and right.** A sidewalk tile's center is `SIDEWALK_X` from the middle, right beside the road. A building's *front* stands at `BUILDING_EDGE_X`, a little way into the sidewalk tile, so about four units of sidewalk show in front of each building.
- **Which way do buildings face?** Every Kenney building comes out of its file facing **-z**, toward the camera at the start. To face one at the street from the side, it needs a quarter turn: +π/2 faces it toward -x (a building on the right looks back at the street), and -π/2 toward +x (the left side).
- **The export block** at the bottom is how a plain `<script>` file offers its names to other files: to Node (where the tests run) through `module.exports`, and to the browser through `window`. It only lists names that exist so far.

### 2b. A repeatable random number

The buildings will be chosen at random, but you'll want the same street every time you load the page, so you can compare your work against the screenshots here and test the layout. A *seeded* random-number generator gives you the same sequence every time from the same starting number. Add it below the constants:

```js
// A small, repeatable random number generator (mulberry32). Seeding it means
// the same street every time you load the page, which makes the layout easy to
// test and to compare while you work on it. Returns a function like Math.random.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

and replace the export block with:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDING_GAP, LIGHT_EVERY, seededRandom };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDING_GAP, LIGHT_EVERY, seededRandom });
}
```

This is the *mulberry32* generator. You don't need to follow the bit-twiddling: what matters is that `seededRandom(7)` returns a function that behaves like `Math.random` (a number from 0 up to but not including 1 each time you call it) and that two functions made from the same seed give identical sequences.

Create `tests.html`, so you can run tests as you go:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>World tests - Babylon.js Samples</title>
  <link rel="stylesheet" href="https://code.jquery.com/qunit/qunit-2.22.0.css">
</head>
<body>
  <div id="qunit"></div>
  <div id="qunit-fixture"></div>
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="js/world.js"></script>
  <script src="tests/world.tests.js"></script>
</body>
</html>
```

Then put this in `tests/world.tests.js`:

```js
QUnit.module("seededRandom", () => {
  QUnit.test("gives the same numbers for the same seed", (assert) => {
    const a = seededRandom(42);
    const b = seededRandom(42);

    for (let i = 0; i < 20; i++) assert.strictEqual(a(), b());
  });

  QUnit.test("gives different numbers for different seeds", (assert) => {
    assert.notStrictEqual(seededRandom(1)(), seededRandom(2)());
  });

  QUnit.test("stays between 0 (included) and 1 (not included)", (assert) => {
    const random = seededRandom(7);

    for (let i = 0; i < 1000; i++) {
      const value = random();
      assert.true(value >= 0 && value < 1, `${value} is in range`);
    }
  });

  QUnit.test("doesn't repeat the same number over and over", (assert) => {
    const random = seededRandom(7);
    const seen = new Set();

    for (let i = 0; i < 100; i++) seen.add(random());

    assert.true(seen.size > 90);
  });
});
```

Open `tests.html`: **4** tests, all green.

### 2c. The buildings

Add the table of buildings below `seededRandom`:

```js
// Buildings, with their footprint (width along the street, depth back from it)
// in the pieces' own units. They're all commercial pieces from the same kit,
// so they match each other.
const BUILDINGS = [
  { piece: "commercial/building-a", width: 0.884, depth: 0.94 },
  { piece: "commercial/building-b", width: 0.97, depth: 0.94 },
  { piece: "commercial/building-c", width: 0.884, depth: 1.09 },
  { piece: "commercial/building-d", width: 0.84, depth: 0.9 },
  { piece: "commercial/building-e", width: 1.64, depth: 1.008 },
  { piece: "commercial/building-f", width: 0.84, depth: 1.03 },
  { piece: "commercial/building-g", width: 0.97, depth: 0.922 },
  { piece: "commercial/building-h", width: 0.884, depth: 1.008 },
  { piece: "commercial/building-i", width: 1.24, depth: 1.302 },
  { piece: "commercial/building-k", width: 2.084, depth: 0.942 },
  { piece: "commercial/building-l", width: 1.37, depth: 1.402 },
  { piece: "commercial/building-m", width: 1.24, depth: 1.242 },
  { piece: "commercial/building-skyscraper-a", width: 1.36, depth: 1.36 },
  { piece: "commercial/building-skyscraper-b", width: 1.36, depth: 1.36 },
  { piece: "commercial/building-skyscraper-c", width: 1.28, depth: 1.388 },
  { piece: "commercial/building-skyscraper-e", width: 1.295, depth: 1.242 },
];
```

and update the export block to add `BUILDINGS`:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom });
}
```

Each building has a piece name (`"commercial/building-a"` is the file `commercial/building-a.glb`) and its **footprint** in the pieces' own units: `width` along the street and `depth` back from it. Those numbers were measured from the models' bounding boxes. They matter because a building's neighbors have to be placed just far enough away not to overlap it.

Add the tests for the table, below the `seededRandom` module:

```js
QUnit.module("BUILDINGS", () => {
  QUnit.test("every building has a piece name, and a footprint bigger than nothing", (assert) => {
    for (const building of BUILDINGS) {
      assert.true(/^commercial\/[\w-]+$/.test(building.piece), `${building.piece}: a piece in the commercial kit`);
      assert.true(building.width > 0 && building.depth > 0, `${building.piece}: has a footprint`);
    }
  });

  QUnit.test("no building is listed twice", (assert) => {
    assert.strictEqual(new Set(BUILDINGS.map((b) => b.piece)).size, BUILDINGS.length);
  });
});
```

Reload `tests.html`: **2 more** tests.

### 2d. A line of buildings

Add a function that lines buildings up along one side of the street, from a starting z, until the length is covered:

```js
// Lines buildings up along one side of the street, from `fromZ` for at least
// `length`, picking each one at random. Returns the placements for that side.
// `side` is -1 for the left (negative x) and 1 for the right.
function layoutSide(side, fromZ, length, random) {
  const placements = [];
  let z = fromZ;
  while (z < fromZ + length) {
    const building = BUILDINGS[Math.floor(random() * BUILDINGS.length)];
    const width = building.width * WORLD_SCALE;
    const depth = building.depth * WORLD_SCALE;
    placements.push({
      piece: building.piece,
      x: side * (BUILDING_EDGE_X + depth / 2),
      z: z + width / 2,
      rotationY: side < 0 ? FACE_LEFT_SIDE : FACE_RIGHT_SIDE,
    });
    z += width + BUILDING_GAP * WORLD_SCALE;
  }
  return placements;
}
```

and add `layoutSide` to the export block:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide });
}
```

Things to notice:

- **The random numbers are passed in.** `layoutSide` takes `random` as a parameter instead of calling `Math.random`, so a test (or a seed) decides what gets built. The same trick was used for the rocks in Asteroids.
- **The `side` is -1 for the left and 1 for the right**, and it does double duty: it puts the building at negative or positive x, and it picks which way the building is turned.
- **A building's center is half its width ahead of where it starts,** and the next building starts after it plus a small gap. The building's *front* edge is at `BUILDING_EDGE_X`, so its center is half its depth further out.

Tests for it come after the main layout tests, so you'll write them in 2e.

### 2e. The whole street

Add the function that works out everything:

```js
// Works out everything the street is made of: `rows` road tiles in a line, a
// sidewalk tile beside each, a building line along each side, and street lights.
// The first row is centered on `firstZ` (by default a row behind the start, so
// there is street behind the camera too). Returns a list of placements:
// { piece, x, z, rotationY }, with the piece named "kit/file" like the assets folder.
function streetLayout({ rows, random = Math.random, firstZ = -TILE } = {}) {
  const placements = [];

  for (let i = 0; i < rows; i++) {
    const z = firstZ + i * TILE;
    // The road tile is drawn running along x, so turn it a quarter turn to run along z.
    placements.push({ piece: "roads/road_straight", x: 0, z, rotationY: Math.PI / 2 });
    placements.push({ piece: "roads/tile_low", x: -SIDEWALK_X, z, rotationY: 0 });
    placements.push({ piece: "roads/tile_low", x: SIDEWALK_X, z, rotationY: 0 });

    if (i % LIGHT_EVERY === 0) {
      // Alternate sides, with the lamp's arm reaching over the road.
      const side = (i / LIGHT_EVERY) % 2 === 0 ? -1 : 1;
      placements.push({ piece: "roads/light_square", x: side * (TILE / 2 + 0.4), z, rotationY: side < 0 ? Math.PI / 2 : -Math.PI / 2 });
    }
  }

  const start = firstZ - TILE / 2;
  const length = rows * TILE;
  placements.push(...layoutSide(-1, start, length, random));
  placements.push(...layoutSide(1, start, length, random));
  return placements;
}
```

and add `streetLayout` to the exports:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide, streetLayout };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide, streetLayout });
}
```

Things to notice:

- **Every placement is `{ piece, x, z, rotationY }`** and nothing else. That's the whole interface between this file and the rest of the game.
- **Each row gets a road tile and two sidewalks.** The road tile is modeled running along x, so it's turned a quarter turn to run along z.
- **Street lights alternate sides.** `(i / LIGHT_EVERY) % 2` is 0 for the first light, 1 for the second, and so on, so they zig-zag down the street. Each lamp's arm points along the piece's +z, so a quarter turn reaches it over the road: +π/2 turns +z into +x (for a lamp on the left) and -π/2 turns it into -x (for the right).
- **`firstZ` defaults to one row behind the start (`-TILE`),** so there is street *behind* the camera too.

The tests come next. First a small helper, then the tests for the layout, then for `layoutSide`. Add them below the `BUILDINGS` module:

```js
const assertClose = (assert, actual, expected, tolerance, message) =>
  assert.true(Math.abs(actual - expected) <= tolerance, message || `expected ${actual} to be within ${tolerance} of ${expected}`);

QUnit.module("streetLayout", () => {
  const layout = (options) => streetLayout({ rows: 6, random: seededRandom(3), ...options });
  const ofPiece = (placements, piece) => placements.filter((p) => p.piece === piece);

  QUnit.test("has one road tile per row, in a line down the middle of the street", (assert) => {
    const roads = ofPiece(layout(), "roads/road_straight");

    assert.strictEqual(roads.length, 6);
    for (const road of roads) assert.strictEqual(road.x, 0);
  });

  QUnit.test("the road tiles are one tile apart, starting a row behind the start", (assert) => {
    const roads = ofPiece(layout(), "roads/road_straight");

    assert.strictEqual(roads[0].z, -TILE);
    for (let i = 1; i < roads.length; i++) assertClose(assert, roads[i].z - roads[i - 1].z, TILE, 1e-9);
  });

  QUnit.test("the first row can be moved with firstZ", (assert) => {
    const roads = ofPiece(layout({ firstZ: 100 }), "roads/road_straight");

    assert.strictEqual(roads[0].z, 100);
  });

  QUnit.test("the road tiles are turned to run along the street, not across it", (assert) => {
    for (const road of ofPiece(layout(), "roads/road_straight")) assertClose(assert, road.rotationY, Math.PI / 2, 1e-9);
  });

  QUnit.test("a sidewalk tile sits beside the road on each side of every row", (assert) => {
    const sidewalks = ofPiece(layout(), "roads/tile_low");

    assert.strictEqual(sidewalks.length, 12);
    assert.strictEqual(sidewalks.filter((s) => s.x === -SIDEWALK_X).length, 6, "left");
    assert.strictEqual(sidewalks.filter((s) => s.x === SIDEWALK_X).length, 6, "right");
  });

  QUnit.test("sidewalks line up with the road tile in their row", (assert) => {
    const placements = layout();
    const roadZs = ofPiece(placements, "roads/road_straight").map((r) => r.z);

    for (const sidewalk of ofPiece(placements, "roads/tile_low")) assert.true(roadZs.includes(sidewalk.z));
  });

  QUnit.test("street lights stand every LIGHT_EVERY rows, one side then the other", (assert) => {
    const lights = ofPiece(layout({ rows: 8 }), "roads/light_square");

    assert.strictEqual(lights.length, Math.ceil(8 / LIGHT_EVERY));
    assert.true(lights[0].x < 0, "the first is on the left");
    assert.true(lights[1].x > 0, "the next is on the right");
    assert.true(lights[2].x < 0, "then back to the left");
  });

  QUnit.test("each light's arm is turned to reach over the road", (assert) => {
    for (const light of ofPiece(layout({ rows: 8 }), "roads/light_square")) {
      // The arm points along the piece's +z. A quarter turn one way sends it toward +x, the other way toward -x.
      assert.strictEqual(Math.sign(light.rotationY), -Math.sign(light.x));
    }
  });

  QUnit.test("buildings stand on both sides of the street, set back from the sidewalk", (assert) => {
    const buildings = layout().filter((p) => p.piece.includes("building"));

    assert.true(buildings.some((b) => b.x < 0), "left");
    assert.true(buildings.some((b) => b.x > 0), "right");
    for (const b of buildings) assert.true(Math.abs(b.x) > BUILDING_EDGE_X, "set back beyond the edge of the sidewalk");
  });

  QUnit.test("buildings face the street from either side", (assert) => {
    for (const b of layout().filter((p) => p.piece.includes("building"))) {
      // Facing is -z at rotation 0. A quarter turn of +PI/2 faces -x, -PI/2 faces +x.
      const facingX = -Math.sign(b.rotationY);
      assert.strictEqual(facingX, -Math.sign(b.x), `${b.piece} at x = ${b.x} faces the middle of the street`);
    }
  });

  QUnit.test("a building's front stands at the edge no matter how deep it is", (assert) => {
    for (const b of layout().filter((p) => p.piece.includes("building"))) {
      const info = BUILDINGS.find((x) => x.piece === b.piece);
      const front = Math.abs(b.x) - (info.depth * WORLD_SCALE) / 2;
      assertClose(assert, front, BUILDING_EDGE_X, 1e-9, `${b.piece}'s front is at the edge`);
    }
  });

  QUnit.test("buildings on one side don't overlap, and leave a gap", (assert) => {
    const placements = layout({ rows: 10 });

    for (const side of [-1, 1]) {
      const row = placements.filter((p) => p.piece.includes("building") && Math.sign(p.x) === side);
      for (let i = 1; i < row.length; i++) {
        const before = BUILDINGS.find((b) => b.piece === row[i - 1].piece);
        const after = BUILDINGS.find((b) => b.piece === row[i].piece);
        const gap = row[i].z - (after.width * WORLD_SCALE) / 2 - (row[i - 1].z + (before.width * WORLD_SCALE) / 2);
        assertClose(assert, gap, BUILDING_GAP * WORLD_SCALE, 1e-9, `side ${side}, building ${i}`);
      }
    }
  });

  QUnit.test("buildings run the whole length of the street, on both sides", (assert) => {
    const rows = 10;
    const placements = layout({ rows });
    const streetEnd = -TILE + (rows - 1) * TILE + TILE / 2;

    for (const side of [-1, 1]) {
      const row = placements.filter((p) => p.piece.includes("building") && Math.sign(p.x) === side);
      const last = row[row.length - 1];
      const lastInfo = BUILDINGS.find((b) => b.piece === last.piece);
      assert.true(last.z + (lastInfo.width * WORLD_SCALE) / 2 >= streetEnd, `side ${side} reaches the end`);
      const first = row[0];
      const firstInfo = BUILDINGS.find((b) => b.piece === first.piece);
      assertClose(assert, first.z - (firstInfo.width * WORLD_SCALE) / 2, -TILE - TILE / 2, 1e-9, `side ${side} starts at the start`);
    }
  });

  QUnit.test("the same seed gives the same street", (assert) => {
    assert.deepEqual(streetLayout({ rows: 8, random: seededRandom(5) }), streetLayout({ rows: 8, random: seededRandom(5) }));
  });

  QUnit.test("a different seed gives different buildings", (assert) => {
    const a = streetLayout({ rows: 8, random: seededRandom(1) }).filter((p) => p.piece.includes("building"));
    const b = streetLayout({ rows: 8, random: seededRandom(2) }).filter((p) => p.piece.includes("building"));

    assert.notDeepEqual(a, b);
  });

  QUnit.test("with no rows there is no street", (assert) => {
    assert.strictEqual(ofPiece(streetLayout({ rows: 0 }), "roads/road_straight").length, 0);
  });
});

QUnit.module("layoutSide", () => {
  QUnit.test("uses the random numbers to choose which building comes next", (assert) => {
    const first = layoutSide(1, 0, 1, () => 0); // 0 picks the first in the list
    const last = layoutSide(1, 0, 1, () => 0.9999); // nearly 1 picks the last

    assert.strictEqual(first[0].piece, BUILDINGS[0].piece);
    assert.strictEqual(last[0].piece, BUILDINGS[BUILDINGS.length - 1].piece);
  });

  QUnit.test("stops as soon as the length is covered", (assert) => {
    // The first building is 0.884 units wide: one is enough for a length shorter than that.
    const placements = layoutSide(1, 0, 3, () => 0);

    assert.strictEqual(placements.length, 1);
  });
});
```

Reload `tests.html`: **18 more** tests.

### 2f. Which pieces are used

Last, a helper that lists the pieces a layout uses, each once, so each file is loaded once. Add it below `streetLayout`:

```js
// The names of the pieces a layout uses, each once, so each file is loaded once.
function piecesUsed(placements) {
  return [...new Set(placements.map((p) => p.piece))];
}
```

and replace the export block with the final version, which adds `piecesUsed` to both lists (the tests in Node need it there, even though the browser would find it anyway):

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide, streetLayout, piecesUsed };
} else {
  Object.assign(window, { WORLD_SCALE, TILE, SIDEWALK_X, BUILDING_EDGE_X, BUILDINGS, BUILDING_GAP, LIGHT_EVERY, seededRandom, layoutSide, streetLayout, piecesUsed });
}
```

Add its tests at the end of `tests/world.tests.js`:

```js
QUnit.module("piecesUsed", () => {
  QUnit.test("lists each piece once, however many times it is placed", (assert) => {
    const used = piecesUsed([{ piece: "a" }, { piece: "b" }, { piece: "a" }, { piece: "a" }]);

    assert.deepEqual(used, ["a", "b"]);
  });

  QUnit.test("covers every piece in a real layout", (assert) => {
    const placements = streetLayout({ rows: 12, random: seededRandom(7) });
    const used = piecesUsed(placements);

    assert.true(used.includes("roads/road_straight"));
    assert.true(used.includes("roads/tile_low"));
    assert.true(used.includes("roads/light_square"));
    assert.strictEqual(new Set(used).size, used.length, "no repeats");
    for (const p of placements) assert.true(used.includes(p.piece));
  });
});
```

Reload `tests.html`: **2 more** tests. **26 in all** for this file.

---

## Step 3: Loading pieces and making copies

Now the Babylon.js side. A street of a hundred pieces uses only about ten different models, so loading a file for every copy would be slow and wasteful. Instead each piece is loaded **once** and kept hidden as a **template**, and every copy in the street is an **instance** of the template: a new node that shares the template's geometry and materials.

A model also arrives centered wherever its artist chose. The street plan says "this building is at x = 12", and that has to mean the *middle of the building*, resting on the ground. Working out how to get there is plain arithmetic, so it goes in its own function.

### 3a. Centering a piece

Put this in `js/models.js`:

```js
// Loading 3D pieces (.glb files) and placing copies of them in the world.
//
// A street is made of the same few pieces over and over: a road tile, a
// sidewalk tile, a dozen buildings. Loading a file for every copy would be slow
// and wasteful, so each piece is loaded ONCE, kept hidden as a template, and
// every copy placed in the world is an instance of that template: a new node
// that shares the template's geometry and materials.
//
// Pieces come out of their files centered wherever the artist felt like.
// centerOnGround() works out how to move a piece so it is centered on the
// ground at its own origin: then the numbers in world.js can say "this piece is
// here" and mean it. See ../tests/models.tests.js.

// Given the corners of a piece's bounding box and the scale it will be drawn at,
// returns the position that centers the piece on the origin (x and z) and rests
// it on the ground (y), already in scaled units.
function centerOnGround(min, max, scale) {
  return {
    x: -((min.x + max.x) / 2) * scale,
    y: -min.y * scale,
    z: -((min.z + max.z) / 2) * scale,
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { centerOnGround };
} else {
  window.centerOnGround = centerOnGround;
}
```

Things to notice:

- **It takes the two opposite corners of the piece's bounding box** (`min` and `max`) and returns the position that moves the box's middle (in x and z) to the origin, and its bottom (in y) onto the ground.
- **The result is already multiplied by the scale,** so it can be used as a position *after* the piece is scaled.

Test it. Put this in `tests/models.tests.js`:

```js
QUnit.module("centerOnGround", () => {
  const near = (assert, actual, expected, message) =>
    assert.true(Math.abs(actual - expected) < 1e-9, message || `expected ${actual} to be close to ${expected}`);

  QUnit.test("moves the middle of the footprint to the origin", (assert) => {
    // A box running 2..4 in x and 10..14 in z: the middle is (3, 12).
    const offset = centerOnGround({ x: 2, y: 0, z: 10 }, { x: 4, y: 5, z: 14 }, 1);

    near(assert, offset.x, -3);
    near(assert, offset.z, -12);
  });

  QUnit.test("rests the bottom of the piece on the ground, whatever its height", (assert) => {
    const offset = centerOnGround({ x: 0, y: 0.5, z: 0 }, { x: 1, y: 2, z: 1 }, 1);

    near(assert, offset.y, -0.5);
  });

  QUnit.test("a piece that is already centered on the ground isn't moved", (assert) => {
    const offset = centerOnGround({ x: -1, y: 0, z: -2 }, { x: 1, y: 3, z: 2 }, 1);

    near(assert, offset.x, 0);
    near(assert, offset.y, 0);
    near(assert, offset.z, 0);
  });

  QUnit.test("the offset is in scaled units, so it works after the piece is scaled", (assert) => {
    // Middle at (3, 12) and bottom at y = 0.5, scaled by 2: the piece is moved by double.
    const offset = centerOnGround({ x: 2, y: 0.5, z: 10 }, { x: 4, y: 5, z: 14 }, 2);

    near(assert, offset.x, -6);
    near(assert, offset.y, -1);
    near(assert, offset.z, -24);
  });

  QUnit.test("a piece that sinks below the ground is lifted onto it", (assert) => {
    const offset = centerOnGround({ x: 0, y: -0.25, z: 0 }, { x: 1, y: 1, z: 1 }, 1);

    near(assert, offset.y, 0.25);
  });
});
```

Add the scripts to `tests.html`, next to the others:

```html
  <script src="js/models.js"></script>
```
```html
  <script src="tests/models.tests.js"></script>
```

Reload `tests.html`: **5 more** tests.

### 3b. The library, closed

Add the class below `centerOnGround`. It's complete and closed, with just a constructor:

```js
class PieceLibrary {
  // `baseUrl` is the folder the .glb files are in, and `scale` how much bigger
  // every piece is drawn than it was modeled.
  constructor(scene, { baseUrl = "", scale = 1 } = {}) {
    this.scene = scene;
    this.baseUrl = baseUrl;
    this.scale = scale;
    this.templates = new Map(); // piece name -> the hidden original
  }
}
```

and replace the export block:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { centerOnGround, PieceLibrary };
} else {
  window.centerOnGround = centerOnGround;
  window.PieceLibrary = PieceLibrary;
}
```

Things to notice:

- **`baseUrl` and `scale`.** The library knows which folder the `.glb` files are in, and how much bigger every piece is drawn than it was modeled (`WORLD_SCALE`, from Step 2).
- **`templates` is a `Map`** from a piece's name to its hidden original.

The next two sections add methods **inside the class**, below the constructor and above its closing `}`.

### 3c. Loading

```js
  // Loads every piece in `names` that isn't loaded yet, all at once. A piece is
  // named "kit/file", for example "commercial/building-a" is the file
  // commercial/building-a.glb in the base folder.
  async load(names) {
    const wanted = [...new Set(names)].filter((name) => !this.templates.has(name));
    await Promise.all(wanted.map((name) => this._loadOne(name)));
  }

  async _loadOne(name) {
    const slash = name.lastIndexOf("/") + 1;
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", `${this.baseUrl}${name.slice(0, slash)}`, `${name.slice(slash)}.glb`, this.scene);

    // The first mesh is the loader's root node; everything else hangs off it.
    const loaded = result.meshes[0];
    const bounds = loaded.getHierarchyBoundingVectors(true);
    const offset = centerOnGround(bounds.min, bounds.max, this.scale);

    loaded.scaling.scaleInPlace(this.scale); // scaleInPlace keeps the loader's mirroring of glTF
    loaded.position.x = offset.x;
    loaded.position.y = offset.y;
    loaded.position.z = offset.z;

    // The template is the node copies are made from. Disabled, it is never drawn.
    const template = new BABYLON.TransformNode(name, this.scene);
    loaded.parent = template;
    template.setEnabled(false);
    this.templates.set(name, template);
  }
```

Things to notice:

- **`load` takes a list of names** and loads the ones it hasn't got yet, **all at once** with `Promise.all`, rather than one after another. It returns a promise, so the caller can `await` it.
- **`ImportMeshAsync` returns every mesh in the file;** the first, `meshes[0]`, is a root node the loader adds that everything else hangs from. Scaling and moving that root moves the whole piece.
- **The loader's root is mirrored.** glTF uses a right-handed coordinate system and Babylon.js a left-handed one, so the root has a `scaling` of `(1, 1, -1)`. That's why the code uses `scaleInPlace`, which multiplies by the factor and keeps the minus sign, instead of replacing the scaling.
- **The template is a plain `TransformNode`,** an empty node the model hangs from, and **it is disabled**. A disabled node, and everything below it, is never drawn. Only its copies will be.

### 3d. Placing a copy

```js
  // Puts a copy of a loaded piece in the world at (x, y, z), turned by
  // rotationY radians about the vertical axis, and returns it.
  place(name, { x = 0, y = 0, z = 0, rotationY = 0 } = {}) {
    const template = this.templates.get(name);
    if (!template) throw new Error(`The piece "${name}" hasn't been loaded`);

    const copy = template.instantiateHierarchy(null);
    copy.position.x = x;
    copy.position.y = y;
    copy.position.z = z;
    copy.rotation.y = rotationY;
    return copy;
  }
```

Things to notice:

- **`instantiateHierarchy`** makes a new tree of nodes in which every mesh is an *instance* of the original: it draws using the template's vertices and materials rather than a copy of them. A hundred buildings cost about the same graphics memory as the dozen different ones.
- **The copy is enabled even though the template isn't,** because disabling is a property of the node you disable and of what hangs below it. The copy hangs from nothing.
- **`placement` can be a whole placement from the layout.** Pulling `{ x, y, z, rotationY }` out of the object ignores the extra `piece` field, so Step 4 can pass a placement straight in.
- **A piece that was never loaded throws a clear error** instead of failing mysteriously later.

### 3e. Tests

The library's tests use a *fake* `BABYLON`, so they check the calls the code makes without loading a real file. Add them to the end of `tests/models.tests.js`:

```js
QUnit.module("PieceLibrary", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeVector3 {
    constructor(x = 0, y = 0, z = 0) {
      Object.assign(this, { x, y, z });
    }
    scaleInPlace(k) {
      this.x *= k;
      this.y *= k;
      this.z *= k;
    }
  }

  class FakeTransformNode {
    position = new FakeVector3();
    rotation = new FakeVector3();
    enabled = true;
    copiedFrom = null;

    constructor(name, scene) {
      Object.assign(this, { name, scene });
    }
    setEnabled(value) {
      this.enabled = value;
    }
    instantiateHierarchy(parent) {
      const copy = new FakeTransformNode(this.name + " copy", this.scene);
      copy.copiedFrom = this;
      copy.parent = parent;
      return copy;
    }
  }

  let imports; // what the fake loader was asked for, in order
  let roots; // the fake root mesh handed back for each file name

  hooks.beforeEach(() => {
    imports = [];
    roots = {};
    globalScope.BABYLON = {
      TransformNode: FakeTransformNode,
      SceneLoader: {
        ImportMeshAsync: async (names, rootUrl, filename, scene) => {
          imports.push({ names, rootUrl, filename, scene });
          const root = {
            scaling: new FakeVector3(1, 1, -1), // the real loader mirrors its root, for glTF's handedness
            position: new FakeVector3(),
            parent: null,
            // A box from (0, 1, 10) to (2, 3, 14): its middle is (1, ?, 12) and its bottom is at y = 1.
            getHierarchyBoundingVectors: () => ({ min: { x: 0, y: 1, z: 10 }, max: { x: 2, y: 3, z: 14 } }),
          };
          roots[filename] = root;
          return { meshes: [root, {}] };
        },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("splits a piece name into a folder and a file for the loader", async (assert) => {
    const library = new PieceLibrary({}, { baseUrl: "../assets/" });

    await library.load(["commercial/building-a"]);

    assert.strictEqual(imports[0].rootUrl, "../assets/commercial/");
    assert.strictEqual(imports[0].filename, "building-a.glb");
  });

  QUnit.test("loads into the scene it is given", async (assert) => {
    const scene = { id: "the scene" };

    await new PieceLibrary(scene).load(["roads/road_straight"]);

    assert.strictEqual(imports[0].scene, scene);
  });

  QUnit.test("loads every piece it is asked for", async (assert) => {
    const library = new PieceLibrary({});

    await library.load(["a/one", "a/two", "b/three"]);

    assert.strictEqual(imports.length, 3);
    assert.true(library.templates.has("a/one") && library.templates.has("a/two") && library.templates.has("b/three"));
  });

  QUnit.test("loads a piece only once, however many times it is asked for", async (assert) => {
    const library = new PieceLibrary({});

    await library.load(["a/one", "a/one"]);
    await library.load(["a/one"]);

    assert.strictEqual(imports.length, 1);
  });

  QUnit.test("scales the loaded root by the library's scale, keeping its mirroring", async (assert) => {
    await new PieceLibrary({}, { scale: 7 }).load(["a/one"]);

    assert.strictEqual(roots["one.glb"].scaling.x, 7);
    assert.strictEqual(roots["one.glb"].scaling.y, 7);
    assert.strictEqual(roots["one.glb"].scaling.z, -7, "still flipped in z");
  });

  QUnit.test("moves the loaded root so the piece is centered on the ground at its origin", async (assert) => {
    await new PieceLibrary({}, { scale: 2 }).load(["a/one"]);

    // Middle (1, 12), bottom y = 1, scale 2.
    assert.strictEqual(roots["one.glb"].position.x, -2);
    assert.strictEqual(roots["one.glb"].position.y, -2);
    assert.strictEqual(roots["one.glb"].position.z, -24);
  });

  QUnit.test("hangs the loaded root from a hidden template", async (assert) => {
    const library = new PieceLibrary({});

    await library.load(["a/one"]);
    const template = library.templates.get("a/one");

    assert.ok(template instanceof FakeTransformNode);
    assert.strictEqual(roots["one.glb"].parent, template);
    assert.false(template.enabled, "the template is never drawn");
  });

  QUnit.test("place() makes a copy of the template, not the template itself", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one");

    assert.strictEqual(copy.copiedFrom, library.templates.get("a/one"));
    assert.true(copy.enabled, "the copy is drawn");
  });

  QUnit.test("place() puts the copy where it is told, and turns it", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one", { x: 3, y: 0.5, z: -8, rotationY: 1.5 });

    assert.strictEqual(copy.position.x, 3);
    assert.strictEqual(copy.position.y, 0.5);
    assert.strictEqual(copy.position.z, -8);
    assert.strictEqual(copy.rotation.y, 1.5);
  });

  QUnit.test("place() defaults to the origin, facing the way the piece was made", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one");

    assert.strictEqual(copy.position.x, 0);
    assert.strictEqual(copy.position.y, 0);
    assert.strictEqual(copy.position.z, 0);
    assert.strictEqual(copy.rotation.y, 0);
  });

  QUnit.test("place() accepts a whole placement from the layout, extra fields and all", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const copy = library.place("a/one", { piece: "a/one", x: 1, z: 2, rotationY: 0.5 });

    assert.strictEqual(copy.position.x, 1);
    assert.strictEqual(copy.position.z, 2);
  });

  QUnit.test("each copy is its own node", async (assert) => {
    const library = new PieceLibrary({});
    await library.load(["a/one"]);

    const first = library.place("a/one", { x: 1 });
    const second = library.place("a/one", { x: 2 });

    assert.notStrictEqual(first, second);
    assert.strictEqual(first.position.x, 1, "moving the second didn't move the first");
  });

  QUnit.test("place() refuses a piece that hasn't been loaded", (assert) => {
    const library = new PieceLibrary({});

    assert.throws(() => library.place("a/missing"), /hasn't been loaded/);
  });

  QUnit.test("a failed load is passed on to the caller", async (assert) => {
    globalScope.BABYLON.SceneLoader.ImportMeshAsync = async () => {
      throw new Error("404 not found");
    };

    try {
      await new PieceLibrary({}).load(["a/missing"]);
      assert.true(false, "should have thrown");
    } catch (error) {
      assert.strictEqual(error.message, "404 not found");
    }
  });
});
```

The tests are `async` functions so they can `await` the loader. QUnit waits for them to finish.

Reload `tests.html`: **14 more** tests, all green. **19 in all** for this file.

---

## Step 4: Build the street

Now put the plan and the library to work. `main.js` has to wait for the models, so the biggest change is that `createScene` becomes `async`.

### 4a. `index.html`

Add the glTF loader to the `<head>`, directly after the core Babylon.js script. It's a separate download from the core library, and without it `ImportMeshAsync` can't read `.glb` files:

```html
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
```

In the `<body>`, add a loading message directly after the `.hint` line. It's visible until the pieces arrive, and `main.js` removes it (or replaces its text with an error):

```html
  <div id="loading" style="position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; text-align: center; color: #fff; font: 18px/1.4 system-ui, sans-serif; pointer-events: none;">Loading the street&hellip;</div>
```

Add your two new scripts after `screenshot.js`, before `main.js`:

```html
  <script src="../../../js/screenshot.js"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/main.js"></script>
```

### 4b. `js/main.js`

Make these changes.

**1. Constants.** Add these under `const engine = ...`, before `SKY_COLOR`:

```js
const ASSETS = "../assets/"; // the .glb pieces, shared by the Parkour Runner samples
```

and these below `FOG_DENSITY`:

```js
const STREET_ROWS = 24; // how many road tiles long the street is
const SEED = 7; // the same seed gives the same street every load
```

**2. `createScene` becomes `async`.** Change `const createScene = () => {` to:

```js
const createScene = async () => {
```

**3. Build the street.** Directly after the lights, and before `return { scene };`, add:

```js
  // Work out the street, load each piece it uses once, then put copies in place.
  const layout = streetLayout({ rows: STREET_ROWS, random: seededRandom(SEED) });
  const library = new PieceLibrary(scene, { baseUrl: ASSETS, scale: WORLD_SCALE });
  await library.load(piecesUsed(layout));
  for (const placement of layout) library.place(placement.piece, placement);
```

Things to notice:

- **Plan, load, place.** First the plan (cheap, plain numbers), then `library.load(piecesUsed(layout))`, which loads each piece the plan uses **once**, and only then a `place` for every placement. `await` pauses `createScene` until the files arrive.
- **`WORLD_SCALE` is passed to the library,** which applies it as it loads each piece. The numbers in the plan are already in world units.
- **The seed.** `seededRandom(SEED)` is passed where `Math.random` would otherwise go. Change `SEED` later to get a different street.

**4. Start the game once the street is built.** At the very bottom of the file, replace this:

```js
const { scene } = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
```

with:

```js
const loading = document.getElementById("loading");

createScene()
  .then(({ scene }) => {
    loading.remove();

    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener("resize", () => {
      engine.resize();
    });
  })
  .catch((error) => {
    console.error(error);
    loading.textContent =
      "Something went wrong starting the game. If the 3D models didn't load: a page opened straight from a file " +
      "can't load them, so run a local web server (for example `npx serve` in the repo folder) and open the page " +
      "through that. The console has the details.";
  });
```

Things to notice:

- **`createScene` returns a promise now.** An `async` function always does, so the old `const { scene } = createScene();` would have received a promise, not the scene. `.then` runs the rest once everything is ready.
- **The render loop only starts after the pieces arrive,** so the player never sees a half-built street. The loading message holds the place.
- **The `.catch` is for people, not for you.** A page opened from a file fails to load the models in a way that's invisible unless you open the console. Putting the reason on the screen turns a blank page into a fix.

Serve the page and open it. After a moment you should see the **street**: a grey road with a lane line down the middle, wide sidewalks, buildings of different heights on both sides facing the road, a street light here and there, and the far end fading into the fog.

---

## Step 5: Walk the street

You can only see the one view from the start. A **scout** is a position along the street that moves forward and back with the keys, so you can look at the whole street. It's just numbers, so it gets its own small class and its own tests, and `main.js` points the camera at it.

### 5a. The scout, closed

Put this in `js/scout.js`. The class is complete and closed, with just a constructor, plus the export block:

```js
// A scout walks the length of the street so you can look at the world before
// anyone runs through it: it is just a position along the street (z) that
// moves forward and back, never past either end. main.js points the camera at it.
class Scout {
  constructor({ z = 0, min = -Infinity, max = Infinity, speed = 10 } = {}) {
    this.start = z; // where reset() puts it back
    this.z = z;
    this.min = min; // the nearest and farthest it may go
    this.max = max;
    this.speed = speed; // world units per second
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Scout;
} else {
  window.Scout = Scout;
}
```

### 5b. Moving

Add these two methods **inside the class**, below the constructor and above its closing `}`:

```js
  // Moves for dt seconds: direction 1 is forward (+z), -1 is back, 0 stands still.
  move(direction, dt) {
    this.z = Math.min(this.max, Math.max(this.min, this.z + direction * this.speed * dt));
  }

  reset() {
    this.z = this.start;
  }
```

Things to notice:

- **`direction` is -1, 0 or 1,** so one method covers forward, back and standing still, and it moves by `speed * dt`. Multiplying by the time since the last frame is what makes the movement the same on a 60 Hz and a 144 Hz monitor.
- **`Math.min(max, Math.max(min, ...))` clamps** the position between the two ends, so the scout can't go past the start of the street or run off the far end into the fog.
- **`reset` goes back to `start`,** the position the scout was created at.

### 5c. Tests

Put this in `tests/scout.tests.js`:

```js
QUnit.module("Scout", () => {
  QUnit.test("starts where it is told to, and by default at 0", (assert) => {
    assert.strictEqual(new Scout().z, 0);
    assert.strictEqual(new Scout({ z: -9 }).z, -9);
  });

  QUnit.test("move(1) goes forward at its speed", (assert) => {
    const scout = new Scout({ speed: 10 });

    scout.move(1, 0.5);

    assert.strictEqual(scout.z, 5);
  });

  QUnit.test("move(-1) goes back", (assert) => {
    const scout = new Scout({ z: 20, speed: 10 });

    scout.move(-1, 0.5);

    assert.strictEqual(scout.z, 15);
  });

  QUnit.test("move(0) stands still", (assert) => {
    const scout = new Scout({ z: 3 });

    scout.move(0, 1);

    assert.strictEqual(scout.z, 3);
  });

  QUnit.test("can't go back past the start of the street", (assert) => {
    const scout = new Scout({ z: -9, min: -9, speed: 10 });

    scout.move(-1, 1);

    assert.strictEqual(scout.z, -9);
  });

  QUnit.test("can't go forward past the end of the street", (assert) => {
    const scout = new Scout({ z: 95, max: 100, speed: 10 });

    scout.move(1, 1);

    assert.strictEqual(scout.z, 100);
  });

  QUnit.test("reset() goes back to where it started", (assert) => {
    const scout = new Scout({ z: -9, speed: 10 });
    scout.move(1, 3);

    scout.reset();

    assert.strictEqual(scout.z, -9);
  });
});
```

Add the script and its tests to `tests.html`:

```html
  <script src="js/scout.js"></script>
```
```html
  <script src="tests/scout.tests.js"></script>
```

Reload `tests.html`: **7 more** tests, all green.

### 5d. Wiring it up

First the page. In `index.html`, add the script tag after `models.js`:

```html
  <script src="js/scout.js"></script>
```

and replace the `.hint` line (don't delete it) with one that mentions the new keys:

```html
  <div class="hint">&uarr;/&darr; (W/S) to walk along the street &middot; R to go back to the start &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Now `js/main.js`. Add a speed constant under `CAMERA_START_Z`:

```js
const SCOUT_SPEED = 14; // world units per second
```

Then, in `createScene`, directly after the loop that places the pieces, and before `return { scene };`, add:

```js
  // The last road tile is centered on firstZ + (STREET_ROWS - 1) * TILE; stop
  // short of the far end so the view never runs out of street.
  const lastRoadZ = -TILE + (STREET_ROWS - 1) * TILE;
  const scout = new Scout({ z: CAMERA_START_Z, min: CAMERA_START_Z, max: lastRoadZ - 40, speed: SCOUT_SPEED });

  const FORWARD_KEYS = new Set(["ArrowUp", "KeyW"]);
  const BACK_KEYS = new Set(["ArrowDown", "KeyS"]);
  const heldKeys = new Set();
  const isControlKey = (code) => FORWARD_KEYS.has(code) || BACK_KEYS.has(code);

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") {
      scout.reset();
      return;
    }
    if (!isControlKey(event.code)) return;
    event.preventDefault(); // arrow keys otherwise scroll the page
    heldKeys.add(event.code);
  });
  window.addEventListener("keyup", (event) => heldKeys.delete(event.code));
  window.addEventListener("blur", () => heldKeys.clear()); // don't get stuck walking after alt-tab

  const anyHeld = (keys) => [...heldKeys].some((code) => keys.has(code));

  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't launch the camera down the street.
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const direction = (anyHeld(FORWARD_KEYS) ? 1 : 0) - (anyHeld(BACK_KEYS) ? 1 : 0);
    scout.move(direction, dt);
    camera.position.z = scout.z;
  });
```

Things to notice:

- **The scout can't start behind or go past the ends.** It starts at the camera's starting z and may not go back past it; the far limit is 40 units short of the last road tile, so the far end of the street never comes into view.
- **Held keys are applied once per frame,** by `scene.onBeforeRenderObservable`, not once per key event. Holding a key down then behaves the same at any frame rate. The `keydown` and `keyup` handlers only keep a set of which keys are down.
- **`dt` is clamped** to 0.05 seconds so a backgrounded tab (which stops drawing frames) doesn't throw the camera down the street when you come back.
- **`event.preventDefault()`** stops the arrow keys scrolling the page.
- **The `blur` handler** forgets all held keys when the window loses focus, so alt-tabbing away mid-walk doesn't leave the camera walking.
- **Only the camera's z follows the scout.** The camera stays at the same height and keeps looking straight ahead.

Open the page and walk: **↑** or **W** walks forward, **↓** or **S** back, and **R** returns to the start.

---

## Step 6: A splash screen

While the pieces download, the page is just the red background. You could leave a "Loading…" message there, but this game has a splash picture, so show that instead, and keep it up for **at least three seconds** even if the street loads faster: a splash that flashes by too quickly looks like a glitch.

### 6a. Working out how much longer

The timing is plain arithmetic, so it goes in its own file. Put this in `js/splash.js`:

```js
// The splash screen covers the page while the street loads. If the street loads
// quickly, taking the splash away at once would just make it flash by, so it
// stays up for a minimum time. This works out how much longer that is. Times
// are in milliseconds, and `now` and `shownAt` come from performance.now().
// See ../tests/splash.tests.js.
function remainingSplashTime(shownAt, now, minimum) {
  return Math.max(0, minimum - (now - shownAt));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { remainingSplashTime };
} else {
  window.remainingSplashTime = remainingSplashTime;
}
```

and its tests in `tests/splash.tests.js`:

```js
QUnit.module("remainingSplashTime", () => {
  QUnit.test("a splash that has only just appeared has the whole minimum left", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 1000, 3000), 3000);
  });

  QUnit.test("counts down as time passes", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 2200, 3000), 1800);
  });

  QUnit.test("is zero once exactly the minimum has passed", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 4000, 3000), 0);
  });

  QUnit.test("never goes below zero, however long loading took", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 90000, 3000), 0);
  });

  QUnit.test("a minimum of zero never waits", (assert) => {
    assert.strictEqual(remainingSplashTime(0, 0, 0), 0);
  });
});
```

Add the script and its tests to `tests.html`:

```html
  <script src="js/splash.js"></script>
```
```html
  <script src="tests/splash.tests.js"></script>
```

Reload `tests.html`: **5 more** tests, all green.

### 6b. The splash itself

In `index.html`, add some styles at the end of the `<style>` block, below the `.hint a` rule:

```html
    /* The splash covers the page while the street loads, then fades away. Its
       white matches the white of the picture, so the picture has no visible edge. */
    #splash {
      position: fixed;
      inset: 0;
      z-index: 30;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: #fff;
      transition: opacity 0.6s ease;
    }
    #splash.hidden {
      opacity: 0;
      pointer-events: none;
    }
    #splash img {
      max-width: min(80vw, 720px);
      max-height: 70vh;
    }
    #splash p {
      margin: 0;
      padding: 0 24px;
      text-align: center;
      color: #44506a;
      font: 18px/1.4 system-ui, sans-serif;
    }
```

Replace the loading message (the `<div id="loading">` line) with the splash, and add the new script after `scout.js`:

```html
  <div id="splash">
    <img src="../parkour_runner_splash_small.jpg" alt="Parkour Runner">
    <p id="splash-status">Loading the street&hellip;</p>
  </div>
```

```html
  <script src="js/scout.js"></script>
  <script src="js/splash.js"></script>
```

Things to notice:

- **A full-screen overlay** (`position: fixed; inset: 0`) with a high `z-index` covers everything, including the back button and hint, until it's gone.
- **Its background is white** because the picture's own background is white, so the picture has no visible edge.
- **The `hidden` class fades it out:** `opacity` goes to 0 over 0.6 seconds (that's the `transition`), and `pointer-events: none` lets clicks through while it fades.
- **`parkour_runner_splash_small.jpg`** is a 960-pixel-wide copy of the full-size splash, about 145 KB instead of 1.6 MB. A splash that takes a long time to download defeats its own purpose.

### 6c. `js/main.js`

Add a constant below `SEED`:

```js
const SPLASH_MIN_MS = 3000; // the splash stays at least this long, even if the street loads sooner
```

and replace the whole bootstrap at the bottom (everything from `const loading =` to the end of the file) with:

```js
const splash = document.getElementById("splash");
const splashStatus = document.getElementById("splash-status");
const shownAt = performance.now();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

createScene()
  .then(async ({ scene }) => {
    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener("resize", () => {
      engine.resize();
    });

    // The street is ready, drawing behind the splash. Keep the splash up for its
    // minimum time, then fade it out and take it away.
    await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent =
      "Something went wrong starting the game. If the 3D models didn't load: a page opened straight from a file " +
      "can't load them, so run a local web server (for example `npx serve` in the repo folder) and open the page " +
      "through that. The console has the details.";
  });
```

Things to notice:

- **`shownAt` is taken as soon as the script runs,** roughly when the splash appeared.
- **The street draws behind the splash** as soon as it's built. When it's ready, `remainingSplashTime` says how much of the three seconds is left, `await delay(...)` waits that long (zero if it's already been three seconds), and only then does the splash fade.
- **The splash is removed after the fade,** 700 ms after the `hidden` class goes on, a little longer than the 0.6-second transition, so it fades completely before it vanishes.
- **On a failure the splash stays** and its status line is replaced by the explanation, instead of fading away and leaving a broken page.

---

## Step 7: Try it

Serve the page (see "You need a web server" above) and open it.

- [ ] The **splash** with the Parkour Runner picture appears at once and stays for at least three seconds, then fades to the street
- [ ] The street runs away from you down the middle of the screen, with a lane line down the road and sidewalks on both sides
- [ ] **Buildings of different heights stand on both sides,** all facing the road, with no gaps between them and no two overlapping
- [ ] Street lights stand along the road, one side and then the other, with their arms reaching over the road
- [ ] The far end of the street **fades into the sky**, and you can't see where it stops
- [ ] The buildings have a **bright side and a dark side**
- [ ] **↑ / W** walks forward, **↓ / S** back; holding a key keeps moving; you can't walk back past where you started
- [ ] **R** goes back to the start
- [ ] **C** saves a screenshot
- [ ] Reloading shows the **same street** every time
- [ ] Opening the page straight from a file (not through a server) shows the explanatory message on the splash instead of a blank screen

**If something's wrong**

- **A blank page, or the splash never goes away:** open the console (F12). A red error about a `.glb` means the pieces weren't found. Check you're using a server and that the folder `samples/parkour_runner/assets/` has `roads/` and `commercial/` in it.
- **`streetLayout is not defined`, `PieceLibrary is not defined`, `Scout is not defined` or `remainingSplashTime is not defined`:** a script tag is missing from **`index.html`**, or is in the wrong order (`main.js` must come last).
- **`SceneLoader.ImportMeshAsync` fails, or there's no loader:** the loader script in Step 4a is missing.
- **Everything is black:** the lights are missing. Check the two light lines in Step 1b.
- **The buildings face the wrong way, or face away from the street:** the `FACE_LEFT_SIDE` and `FACE_RIGHT_SIDE` constants are swapped, or the `side < 0 ? ... : ...` line in `layoutSide` is.
- **Buildings sink into the sidewalk or float above the road:** `centerOnGround` isn't being used, or the `y` line of it is wrong.
- **Everything is tiny, a toy street:** `WORLD_SCALE` isn't being passed to the library in `main.js`.
- **The street lights point away from the road:** the `rotationY` sign for lights in `streetLayout` is the wrong way around.
- **You walk, but nothing moves:** the `scout.move(...)` or `camera.position.z = scout.z` line is missing in the frame loop.

**Experiments** (change one, reload, then change it back):

- `FOG_DENSITY` of `0.004`: the fog thins and you can see much farther, right to the far end
- `SEED` of `1`, `2`, `3`: a different street each time
- `CAMERA_HEIGHT` of `12` and `CAMERA_PITCH` of `0.5`: a view from high above the street
- `CAMERA_FOV` of `1.4` for a wide-angle lens, or `0.5` for a telephoto one
- `SPLASH_MIN_MS` of `0`, or of `8000`
- `LIGHT_EVERY` of `1` for a light on every row
- Change `SKY_COLOR` to `"#e8a070"` for a sunset

---

## Step 8: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/scout.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/world.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/scout.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **57 passing tests**: 26 for the street plan, 19 for the piece library, 7 for the scout and 5 for the splash timing.

> **What these tests don't cover.** They check the logic and the calls the code makes, using stand-ins for Babylon.js. They can't tell you a street *looks* right, or that the buildings face the road. That check is Step 7, with your own eyes. It's a good example of why a test suite and a play-through are different things.

> **Try breaking something.** In `streetLayout`, change `FACE_LEFT_SIDE` for `FACE_RIGHT_SIDE` in `layoutSide` and see which test notices. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A perspective camera, fog and two lights | `createScene` |
| Layout as plain data, away from the engine | `streetLayout`, `layoutSide` |
| A repeatable random-number generator | `seededRandom` |
| Centering and scaling a model | `centerOnGround`, `WORLD_SCALE` |
| Load once, place many instances | `PieceLibrary` |
| Waiting for assets before starting | `async createScene`, `Promise.all` |
| Frame-rate independent movement | `Scout`, `dt` |
| A splash with a minimum time | `remainingSplashTime` |
| Failing helpfully | the `.catch` and the splash status line |

## Challenges

1. **Trees.** Add the `suburban/tree-large` and `suburban/tree-small` pieces along the curb between the sidewalk and the road. (Hint: they're thin, so place one every row or two, at a small `x`, using the same `streetLayout` pattern.)
2. **A crossing.** Every eighth row, replace the road tile with `roads/road_crossroad`. What happens to the sidewalks and buildings there? (Hint: you'll want a gap in the buildings.)
3. **Shadows.** Give the buildings shadows with a `ShadowGenerator` on the `DirectionalLight`. (Hint: you'll need `receiveShadows` on the road and sidewalk, and to add every building to the shadow caster list.)
4. **A different mood.** Change the fog and sky colors, and the light intensities, for dusk or night. Add `roads/construction_light`s that glow. (Hint: an `emissiveColor` on a material.)
5. **Smarter placement.** Make skyscrapers rarer than shops by giving each entry in `BUILDINGS` a `weight`. (Hint: add the weights up and pick a number between 0 and the total.)

---
