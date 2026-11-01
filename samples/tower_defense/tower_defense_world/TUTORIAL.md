# Tutorial: Tower Defense World -- A Floating Island in the Sky

This is the first tutorial in the Tower Defense series: a tower defense game set in the world of *Avatar: The Last Airbender*. Enemy soldiers and spirits march along a road across a floating island, and you stop them by building **podiums** for four benders, one for each nation, each with an attack of its own: air, water, earth and fire. You build them by dragging a podium onto the board, and at the end you build maps of your own. First, in this tutorial, you build the **world**: a board made of real 3D tiles on a rock that floats in the sky, seen by a camera that fits any screen, on a page made for a phone. You write the code; this document tells you what to write and why.

*A note: this is a non-commercial fan project, made to teach. Avatar: The Last Airbender belongs to its owners.*

By the end you'll have:

- A **page that works on a phone**: it fits the screen, doesn't scroll or zoom under a finger, and has a sky behind it that costs the 3D scene nothing to draw
- A **board**: a grid of cells, and the maths that turns a column and a row into a place in the world and back
- A **camera** with no perspective, that is given the edges of its view and works them out again so that the whole board fits on a phone held upright or a wide window
- **Models** made the right size: a measuring step that scales and lifts a model so that it stands on the ground and fits its cell
- A board of **tiles**: five kinds of tile (grass, a straight road, a corner, a junction and a crossroads) that are drawn from one copy of each, with every grass tile turned a different way so that it doesn't look like wallpaper
- A **floating island**: a lump of rock under the board, made in code from rings of points, lumpy and the same every time
- **Clouds** that drift by below it
- A **splash screen** with the logo that stays for at least two and a half seconds
- Unit tests for all of it, **including tests that load the real models** with nothing drawn

**What you'll learn:** how to make a model that has a million triangles light enough for a phone, loading a model into a container and making copies that are *instances* (and why that is much cheaper than clones), measuring a model, orthographic cameras, the maths of a camera's *right* and *up*, a left-handed world, repeatable random numbers, building a mesh from your own triangles, drawing a picture in code (a rock and a cloud) to use as a texture, billboards, a see-through canvas that lets the page paint the sky, and the `NullEngine`, which lets you test 3D code with no screen.

## Where you're starting

This folder holds only empty placeholder files for the code you'll write. The models, the logo and the fonts that the whole series shares are in a folder beside it, `assets/`, so there is nothing to download.

```
tower_defense/
├── assets/                              (the models, the logo and the fonts, shared by the series)
└── tower_defense_world/
    ├── index.html                       (placeholder -- Step 1)
    ├── tests.html                       (placeholder -- Step 2)
    ├── css/
    │   ├── theme.css                    (placeholder -- Step 1)
    │   ├── page.css                     (placeholder -- Step 1)
    │   └── splash.css                   (placeholder -- Step 1)
    ├── js/
    │   ├── board.js                     (placeholder -- Step 2)
    │   ├── view.js                      (placeholder -- Step 3)
    │   ├── models.js                    (placeholder -- Step 4)
    │   ├── tiles.js                     (placeholder -- Step 5)
    │   ├── random.js                    (placeholder -- Step 6)
    │   ├── island.js                    (placeholder -- Step 6)
    │   ├── sky.js                       (placeholder -- Step 7)
    │   ├── splash.js                    (placeholder -- Step 8)
    │   └── main.js                      (placeholder -- Step 8)
    └── tests/
        ├── board.tests.js               (placeholder -- Step 2)
        ├── view.tests.js                (placeholder -- Step 3)
        ├── models.tests.js              (placeholder -- Step 4)
        ├── tiles.tests.js               (placeholder -- Step 5)
        ├── random.tests.js              (placeholder -- Step 6)
        ├── island.tests.js              (placeholder -- Step 6)
        ├── sky.tests.js                 (placeholder -- Step 7)
        └── splash.tests.js              (placeholder -- Step 8)
```

### The models, the logo and the fonts

They are already in `assets/`:

| File | What it is |
|---|---|
| `assets/images/tower_defense_logo_small.webp` | The logo, 800 pixels wide. The full-size one (1600 pixels) is beside it |
| `assets/fonts/Cinzel.ttf` | **Cinzel**: serif capitals like the ones in the logo, for titles and big words |
| `assets/fonts/Lato-Bold.ttf` | **Lato Bold**: the legible font, for anything small |
| `assets/tiles/*.glb` | The five tiles: `grass`, `straight`, `corner`, `junction` and `crossroads` |
| `assets/podiums/*.glb` | A podium for each nation: `air`, `water`, `earth` and `fire` (used from the third tutorial) |
| `assets/benders/*.glb` | The four benders, with animations (used from the third tutorial) |
| `assets/enemies/*.glb` | Five kinds of enemy, with walking, running and falling animations (used from the fourth tutorial) |

The fonts are free under the SIL Open Font License; the licenses are in the same folder. The models were made with [Meshy](https://www.meshy.ai), and are shared under a Creative Commons licence (see the [assets README](../assets/README.md)). The colors of the game were taken from the logo: a clear blue sky, white cloud, parchment and brush black, and the red and gold of the banner.

### Why the models are already made small

The tiles and podiums came out of the model maker with **between 700,000 and 1,700,000 triangles each**, and files of up to 78 MB. A page can't use that: a phone has to download it, keep it in memory, and draw it sixty times a second, and this board has more than a hundred tiles. So every model was **made smaller** with a script, `assets/optimize-models.js`, which you don't have to run (it reads the originals, which are not in this repo):

1. **Weld** the points that are really the same point, so that the next step can see the surface.
2. **Simplify** the triangles down towards a budget (a few thousand for a tile). The tool removes the triangles that change the shape least.
3. **Shrink the pictures** (the *textures*) to 1024 pixels across, and save them as WebP.

A model with a **skeleton** (a bender, an enemy) is not simplified, because that would have to move the weights of the bones as well, and they are about ten thousand triangles already. Only their pictures are made smaller.

| | Before | After |
|---|---|---|
| A grass tile | 1,531,546 triangles, 71 MB | 21,218 triangles, 1.2 MB |
| A straight road | 724,410 triangles, 49 MB | 5,170 triangles, 0.5 MB |
| A crossroads | 1,209,660 triangles, 63 MB | 8,522 triangles, 0.6 MB |
| A podium | 0.7 to 1.5 million triangles, 47 to 69 MB | about 0.5 MB each |
| A bender or an enemy | 10,000 triangles, 30 to 37 MB | 2 to 4 MB |

Some tiles stop at twenty thousand triangles rather than three: their grass is a thousand little pieces, and taking any more away would make holes. A hundred of them is still two million triangles, which is what you will see the game cost on a slow phone, and a later tutorial gives the player a way to turn the detail down.

### Serving the page

This game loads files (the models), and a browser won't let a page opened straight from a file do that. A web server is needed. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_world/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Testing on a phone-sized screen

You don't need a phone for this. Open the page in Chrome or Edge, press **F12**, then **Ctrl+Shift+M** (the *device toolbar*), and choose a phone from the list. The page reloads as that phone, with its screen size, a touch pointer and its pixel density. The rotate button turns it on its side. This tutorial calls that **device mode**.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh set of placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

> **A note on how this tutorial builds code.** Every file in this tutorial is written once, whole, in the step that creates it. Files that other files depend on end with a short block that exports their names: it works both for the test page and for the game page, which have no bundler. Every file is valid JavaScript as soon as you save it.

---

## Step 1: A page with a sky

Start with the page, because a game that is built for a desktop and squeezed onto a phone later is never quite right. Four files: `index.html` for what is on the page, and three small stylesheets for how it looks (one for the colors and fonts, one for the page, one for the splash screen: small files that each do one job are easier to find your way round in). Open the placeholder `index.html` and replace its contents with:

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Tower Defense World - Babylon.js</title>
  <link rel="stylesheet" href="../../../css/sample.css">
  <link rel="stylesheet" href="css/theme.css">
  <link rel="stylesheet" href="css/page.css">
  <link rel="stylesheet" href="css/splash.css">
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
</head>

<body>
  <a class="back-button" href="../../../index.html#tower_defense">&larr; Samples</a>
  <div class="hint">Space for a screenshot &middot; <a href="tests.html">Run tests</a></div>
  <div id="splash">
    <img src="../assets/images/tower_defense_logo_small.webp" alt="Avatar: The Last Airbender Tower Defense">
    <p id="splash-status">Loading&hellip;</p>
  </div>
  <canvas id="renderCanvas"></canvas>
  <script src="../../../js/screenshot.js"></script>
  <script src="js/board.js"></script>
  <script src="js/view.js"></script>
  <script src="js/models.js"></script>
  <script src="js/tiles.js"></script>
  <script src="js/random.js"></script>
  <script src="js/island.js"></script>
  <script src="js/sky.js"></script>
  <script src="js/splash.js"></script>
  <script src="js/main.js"></script>
</body>

</html>
```

Things to notice:

- **The `viewport` tag is the most important line for a phone.** Without it a phone pretends the page is about 980 pixels wide and shrinks everything to fit, so nothing you do for a small screen would apply. `width=device-width` says to use the real width. `maximum-scale=1, user-scalable=no` stops pinch-zoom, which would otherwise fight the game.
- **There are two Babylon.js scripts.** `babylon.js` is the engine. `babylonjs.loaders.min.js` teaches it to read `.glb` files, the format of every model in this series. Without it, loading a model fails.
- **Your own scripts are at the bottom of `<body>`,** after the canvas. They look for the canvas as soon as they run, so it has to exist already.
- **The order of the scripts matters.** `board.js` comes first because the others use it, and `main.js` comes last because it uses all of them.
- **The splash is the logo.** It is an `<img>`, with the text *Loading...* under it. The page starts with the splash up, so it covers everything while the models load.
- **The page doesn't set the screenshot key,** so the shared screenshot script uses **Space**.
- **`lang="en"`** on `<html>` helps screen readers and translation tools.

The page refers to files you haven't written yet, and if you open it now the splash will stay on *Loading...*, with errors in the console. That's expected.

Open the placeholder `css/theme.css` and replace its contents with:

```css
/* The look of Avatar: The Last Airbender Tower Defense, taken from its logo: a clear blue sky and
   white cloud, parchment and black brush lettering, and the red and gold of its banner, and one
   color for each of the four nations. The colors and the fonts are named once here, and
   everything else uses the names. */
@font-face {
  font-family: "Cinzel";
  src: url("../../assets/fonts/Cinzel.ttf") format("truetype");
  font-weight: 400 900;
  font-display: swap;
}
@font-face {
  font-family: "Lato";
  src: url("../../assets/fonts/Lato-Bold.ttf") format("truetype");
  font-weight: 700;
  font-display: swap;
}
:root {
  /* The two fonts. Cinzel is the logo's serif capitals, for titles and big words. Lato Bold is
     the legible one, for everything small, and the one to fall back on. */
  --title-font: "Cinzel", "Times New Roman", serif;
  --small-font: "Lato", system-ui, sans-serif;

  --ink: #1d110b; /* the brush black of the lettering */
  --parchment: #f3deaa; /* the scroll behind the title */
  --parchment-dark: #d3ab68;
  --banner: #8d1f14; /* the red banner under it */
  --banner-dark: #5b120b;
  --gold: #e3a924; /* the trim, and the spiral */
  --sky: #5fb0ee; /* the top of the sky */
  --sky-low: #b9def7; /* and the haze at the bottom of it */
  --cloud: #ffffff;

  --air: #f0f4fa; /* a color for each nation */
  --water: #38b6ff;
  --earth: #8a6a3a;
  --fire: #f0701a;
}
```

- **The colors and the fonts are named once,** as *custom properties* on `:root`, and everything else uses `var(--gold)` and the like. To change the look of the whole game you change one line.
- **`@font-face` loads a font from a file.** `font-display: swap` shows the text in a fallback font at once and swaps when the real one arrives, so the page never waits for a font.
- **Cinzel is a variable font**: one file with every weight, which is why its rule says `font-weight: 400 900`.
- **Four colors are the nations.** Air, water, earth and fire each get a color that the game will use for their towers and their effects.

Open the placeholder `css/page.css` and replace its contents with:

```css
/* The page: sky behind a see-through canvas, so the sky costs the 3D scene nothing to draw. */
html,
body {
  background: linear-gradient(to bottom, var(--sky), var(--sky-low));
}

/* .hint has pointer-events: none so the canvas stays interactive; opt the
   "Run tests" link back in so it can be clicked. */
.hint a {
  pointer-events: auto;
  color: var(--gold);
}
.hint {
  font-family: var(--small-font);
  letter-spacing: 0.03em;
}

/* The back button and the hint stay above the splash's fade and anything else. */
.back-button,
.hint {
  z-index: 26;
}

/* Touch. The page must not scroll, zoom or select text when a finger moves over it. */
html,
body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

/* A small screen: a phone, or a window made small. */
@media (max-width: 640px), (max-height: 520px) {
  .hint {
    display: none;
  }
}
```

- **The sky is a gradient behind the canvas.** A gradient costs nothing to draw, and it means the 3D scene doesn't have to draw a sky at all: the canvas is *see-through*, and the page shows through it (you will switch that on in Step 8).
- **`../../../css/sample.css`** (loaded in the page) is the little stylesheet every sample in the repo shares: it styles the *back* button and the hint. It sets the page's background to bright red, which is what you'd see if a sample forgot its own, and this file puts the sky over that.
- **`user-select: none` and `overscroll-behavior: none`** stop a finger from selecting text or dragging the page, and `-webkit-tap-highlight-color` removes the grey flash on a tap.
- **A media query hides the hint on a small screen,** where there's no keyboard to press a key on and no room.

Open the placeholder `css/splash.css` and replace its contents with:

```css
/* The splash covers the page while the game loads, then fades away. */
#splash {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: linear-gradient(to bottom, var(--sky), var(--sky-low));
  transition: opacity 0.6s ease;
}
#splash.hidden {
  opacity: 0;
  pointer-events: none;
}
#splash img {
  max-width: min(92vw, 760px);
  max-height: 72vh;
  border: 4px solid var(--ink);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(20, 40, 70, 0.45);
}
#splash p {
  margin: 0;
  padding: 0 24px;
  text-align: center;
  color: var(--ink);
  font: 700 clamp(18px, 4.5vw, 26px) / 1.3 var(--title-font);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

- **`position: fixed; inset: 0`** makes it cover the whole screen, and `z-index: 30` puts it above everything.
- **`#splash.hidden`** is the faded-out look: transparent and no longer catching clicks. A transition on `opacity` makes the change a fade. The script adds the class `hidden` when it's time; the CSS does the fading.
- **`min(92vw, 760px)`** keeps the picture inside a phone's width but no bigger than 760 pixels on a big screen, and `max-height: 72vh` keeps it from filling a phone turned on its side.

**Check:** open `index.html`. You should see the logo on a blue sky gradient, with *Loading...* under it, in the logo's lettering, and errors in the console about scripts that aren't there yet.

---

## Step 2: The tests page, and the board

Now the first code, and the page that checks it. Tests go first because the board is **arithmetic**: where a cell is, and which cell a place belongs to. That is easy to get wrong in ways that don't show for a while, like a board that is a cell out, so each rule gets a test.

Open the placeholder `tests.html` and replace its contents with:

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <title>Tower Defense World tests - Babylon.js Samples</title>
  <link rel="stylesheet" href="https://code.jquery.com/qunit/qunit-2.22.0.css" integrity="sha384-Gvip0iPXLBuTKlP0Fan1cxz2R4K8z+c4rnqVxXfz96ojkUDMp2HvFsByVGtBT30o" crossorigin="anonymous">
</head>

<body>
  <div id="qunit"></div>
  <div id="qunit-fixture"></div>
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js"></script>
  <script src="js/board.js"></script>
  <script src="js/view.js"></script>
  <script src="js/models.js"></script>
  <script src="js/tiles.js"></script>
  <script src="js/random.js"></script>
  <script src="js/island.js"></script>
  <script src="js/sky.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/board.tests.js"></script>
  <script src="tests/view.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/tiles.tests.js"></script>
  <script src="tests/random.tests.js"></script>
  <script src="tests/island.tests.js"></script>
  <script src="tests/sky.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
</body>

</html>
```

- **QUnit** is the test framework: it runs everything and shows the results as a web page. The `integrity` attribute makes the browser refuse the file if it isn't exactly the one expected.
- **It loads the same Babylon.js and the same loaders,** because some tests make a scene and load models.
- **It lists every script of the game except `main.js`:** that one starts the game, which a test page mustn't do. Then it lists the test files, which you'll write step by step. Until they exist the page shows errors for the missing files, and the tests it can run still run.

The board is the first file. Open the placeholder `js/board.js` and replace its contents with:

```js
// The board: a grid of square cells on a flat island in the sky. Everything else in the game
// refers to a cell by its column and row (the row 0 is the far edge, at the top of the screen),
// and this file is the one place that knows where a cell is in the world, and which cell a place
// in the world belongs to. Every size is a number in the BOARD table, and nothing else repeats
// them. See ../tests/board.tests.js.

const BOARD = {
  cols: 14, // cells across
  rows: 9, // cells deep
  cell: 2, // the width of a cell, in world units
  rim: 0.8, // how far the island sticks out past the cells
  depth: 9, // how far the rock hangs under the board
  peek: 3.5, // how much of the rock the view makes room for: the rest runs off the bottom of the screen
  headroom: 4, // how high the tallest thing that stands on the board reaches
};

// The middle of a cell, on the ground. The board is centered on the origin, column 0 is on the
// left and row 0 is the far edge: world z grows away from the camera, so the far row has the biggest z.
function cellCenter(col, row, board = BOARD) {
  return {
    x: (col - (board.cols - 1) / 2) * board.cell,
    z: ((board.rows - 1) / 2 - row) * board.cell,
  };
}

// Whether a column and a row are on the board.
function inBoard(col, row, board = BOARD) {
  return Number.isInteger(col) && Number.isInteger(row) && col >= 0 && col < board.cols && row >= 0 && row < board.rows;
}

// The cell that a place in the world is over, or null when it is off the board.
function cellAt(x, z, board = BOARD) {
  const col = Math.floor(x / board.cell + board.cols / 2);
  const row = Math.floor(board.rows / 2 - z / board.cell);
  return inBoard(col, row, board) ? { col, row } : null;
}

// Every cell, row by row.
function boardCells(board = BOARD) {
  const cells = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) cells.push({ col, row });
  }
  return cells;
}

// The edges of the cells, in world units.
function boardBounds(board = BOARD) {
  const halfWidth = (board.cols * board.cell) / 2;
  const halfDepth = (board.rows * board.cell) / 2;
  return { minX: -halfWidth, maxX: halfWidth, minZ: -halfDepth, maxZ: halfDepth };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOARD, cellCenter, inBoard, cellAt, boardCells, boardBounds };
} else {
  Object.assign(window, { BOARD, cellCenter, inBoard, cellAt, boardCells, boardBounds });
}
```

Things to notice:

- **Every size is in one table,** `BOARD`. Nothing else in the game repeats `14` or `2`: the tests, the camera and the tiles all read the table, so the board can be a different size by changing one line (and the editor in the last tutorial will).
- **The board is centered on the origin.** With 14 columns the middle is between two of them, which is why a column's place is `(col - (cols - 1) / 2) * cell`.
- **Babylon.js is left-handed:** with y up and looking along the z axis, x is to the right and **z goes away from you**. The camera will look from the front, so the *far* row, row 0, is the one with the biggest z. That's why `cellCenter`'s z is `((rows - 1) / 2 - row) * cell`, a row counted down the screen from the top.
- **`cellAt` is the opposite of `cellCenter`:** from a place in the world to a cell, or `null` when it is off the board. A later tutorial uses it to turn a finger's position into a cell.
- **`inBoard` insists on whole numbers.** `1.5` is not a column, and neither is `NaN`: `Number.isInteger` says no to both.
- **The export block at the bottom** is how a plain `<script>` file is also usable from the tests: in a page the names become globals, and elsewhere they are exported. It is the same in every file of this tutorial.

Open the placeholder `tests/board.tests.js` and replace its contents with:

```js
// A small board to test with: four across and three deep, in cells of two units, so the numbers are easy to check by hand.
const SMALL = { cols: 4, rows: 3, cell: 2, rim: 0, depth: 1, peek: 1, headroom: 1 };

QUnit.module("the BOARD table", () => {
  QUnit.test("the counts are whole numbers, and the sizes are more than nothing", (assert) => {
    assert.true(Number.isInteger(BOARD.cols) && BOARD.cols > 0);
    assert.true(Number.isInteger(BOARD.rows) && BOARD.rows > 0);
    assert.true(BOARD.cell > 0);
    assert.true(BOARD.depth > 0 && BOARD.headroom > 0 && BOARD.rim >= 0);
  });

  QUnit.test("the view never makes room for more rock than there is", (assert) => {
    assert.true(BOARD.peek > 0 && BOARD.peek <= BOARD.depth);
  });
});

QUnit.module("cellCenter", () => {
  QUnit.test("the board is centered on the origin: the first cell is back left", (assert) => {
    const first = cellCenter(0, 0, SMALL);

    assert.strictEqual(first.x, -3);
    assert.strictEqual(first.z, 2);
  });

  QUnit.test("the last cell is front right", (assert) => {
    const last = cellCenter(SMALL.cols - 1, SMALL.rows - 1, SMALL);

    assert.strictEqual(last.x, 3);
    assert.strictEqual(last.z, -2);
  });

  QUnit.test("row 0 is the far edge: the further a row is down the board, the nearer the camera it is", (assert) => {
    assert.true(cellCenter(0, 0, SMALL).z > cellCenter(0, 1, SMALL).z);
    assert.true(cellCenter(0, 1, SMALL).z > cellCenter(0, 2, SMALL).z);
  });

  QUnit.test("neighbours are one cell apart", (assert) => {
    const a = cellCenter(1, 1, SMALL);
    const right = cellCenter(2, 1, SMALL);
    const below = cellCenter(1, 2, SMALL);

    assert.strictEqual(right.x - a.x, SMALL.cell);
    assert.strictEqual(a.z - below.z, SMALL.cell);
  });

  QUnit.test("the middles of all the cells average to the origin", (assert) => {
    const cells = boardCells();
    const x = cells.reduce((sum, c) => sum + cellCenter(c.col, c.row).x, 0) / cells.length;
    const z = cells.reduce((sum, c) => sum + cellCenter(c.col, c.row).z, 0) / cells.length;

    assert.true(Math.abs(x) < 1e-9);
    assert.true(Math.abs(z) < 1e-9);
  });
});

QUnit.module("cellAt", () => {
  QUnit.test("the middle of every cell is in that cell", (assert) => {
    for (const { col, row } of boardCells()) {
      const { x, z } = cellCenter(col, row);

      assert.deepEqual(cellAt(x, z), { col, row });
    }
  });

  QUnit.test("anywhere in a cell is in that cell, up to its edge", (assert) => {
    const { x, z } = cellCenter(2, 1, SMALL);
    const almost = SMALL.cell / 2 - 0.001;

    assert.deepEqual(cellAt(x - almost, z + almost, SMALL), { col: 2, row: 1 });
    assert.deepEqual(cellAt(x + almost, z - almost, SMALL), { col: 2, row: 1 });
  });

  QUnit.test("a place off the board is in no cell", (assert) => {
    const { maxX, minX, maxZ, minZ } = boardBounds(SMALL);

    assert.strictEqual(cellAt(maxX + 0.01, 0, SMALL), null);
    assert.strictEqual(cellAt(minX - 0.01, 0, SMALL), null);
    assert.strictEqual(cellAt(0, maxZ + 0.01, SMALL), null);
    assert.strictEqual(cellAt(0, minZ - 0.01, SMALL), null);
  });
});

QUnit.module("inBoard", () => {
  QUnit.test("the corners are on the board", (assert) => {
    assert.true(inBoard(0, 0, SMALL));
    assert.true(inBoard(SMALL.cols - 1, SMALL.rows - 1, SMALL));
  });

  QUnit.test("one past the edge, or before it, is not", (assert) => {
    assert.false(inBoard(-1, 0, SMALL));
    assert.false(inBoard(0, -1, SMALL));
    assert.false(inBoard(SMALL.cols, 0, SMALL));
    assert.false(inBoard(0, SMALL.rows, SMALL));
  });

  QUnit.test("half a cell is not a cell", (assert) => {
    assert.false(inBoard(1.5, 1, SMALL));
    assert.false(inBoard(NaN, 1, SMALL));
  });
});

QUnit.module("boardCells", () => {
  QUnit.test("there is one for every cell", (assert) => {
    assert.strictEqual(boardCells(SMALL).length, SMALL.cols * SMALL.rows);
  });

  QUnit.test("they go along a row, and then on to the next", (assert) => {
    const cells = boardCells(SMALL);

    assert.deepEqual(cells[0], { col: 0, row: 0 });
    assert.deepEqual(cells[1], { col: 1, row: 0 });
    assert.deepEqual(cells[SMALL.cols], { col: 0, row: 1 });
  });
});

QUnit.module("boardBounds", () => {
  QUnit.test("the edges are half the board's size from the middle", (assert) => {
    assert.deepEqual(boardBounds(SMALL), { minX: -4, maxX: 4, minZ: -3, maxZ: 3 });
  });

  QUnit.test("the real board's width and depth are its cells counted", (assert) => {
    const { minX, maxX, minZ, maxZ } = boardBounds();

    assert.strictEqual(maxX - minX, BOARD.cols * BOARD.cell);
    assert.strictEqual(maxZ - minZ, BOARD.rows * BOARD.cell);
  });
});
```

- **`SMALL` is a board of four by three,** with a cell of two, so you can check by hand that column 0, row 0 is at (-3, 2). The tests use the real `BOARD` only where they say something about it.
- **Look at "the middles of all the cells average to the origin".** It says the board is centered without saying anything about its size, so it stays true if the table changes.
- **`cellAt`'s tests include the edge:** `almost` is a hair less than half a cell, so the test checks the whole cell and not only its middle.

**Check:** open `tests.html` through the web server. 17 tests pass. Errors in the console about the other scripts are expected, because you haven't written them.

---

## Step 3: A camera that fits any screen

The view of this game never moves. It looks at the board from the front, tipped down, with **no perspective**, so a tower at the back is as big as one at the front, which is what a tower defense game wants. An *orthographic* camera in Babylon.js isn't given a field of view: it is given the **edges of the box it shows**, in world units: `orthoLeft`, `orthoRight`, `orthoTop` and `orthoBottom`. When the screen is a different shape, those four numbers have to be worked out again. This step is that work.

Open the placeholder `js/view.js` and replace its contents with:

```js
// The view: a fixed camera that looks down at the board from the front, tipped over, with no
// perspective, so a tower at the back is the same size as one at the front. An orthographic
// camera is given the edges of what it shows, and this works them out so that the whole board
// fits whatever shape the screen is: a wide window, or a phone held upright. See ../tests/view.tests.js.

const CAMERA = {
  alpha: -Math.PI / 2, // which side it looks from: -90 degrees is the front, with the far row at the top of the screen
  beta: 0.72, // how far it is tipped from straight up, in radians (41 degrees)
  distance: 120, // how far back it is. With no perspective this changes nothing but what is cut off
  margin: 1.06, // a little room round the board, as a multiplier
};

// Which way the screen's right and up point in the world, and which way the camera looks, for
// the two angles an ArcRotateCamera is given. (Babylon.js is left-handed: right is up crossed with forward.)
function viewAxes(alpha = CAMERA.alpha, beta = CAMERA.beta) {
  const forward = [-Math.cos(alpha) * Math.sin(beta), -Math.cos(beta), -Math.sin(alpha) * Math.sin(beta)];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const length = (v) => Math.hypot(v[0], v[1], v[2]);
  const unit = (v) => v.map((n) => n / length(v));
  const right = unit(cross([0, 1, 0], forward));
  const up = cross(forward, right);
  return { right, up, forward };
}

// The eight corners of what the view must always show: the island's rim, as much of the rock under
// it as there is room for, and the headroom above it for what stands on it.
function boardPoints(board = BOARD) {
  const x = (board.cols * board.cell) / 2 + board.rim;
  const z = (board.rows * board.cell) / 2 + board.rim;
  const points = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      for (const y of [-board.peek, board.headroom]) points.push([sx * x, y, sz * z]);
    }
  }
  return points;
}

// What the view must show to hold some points: where the middle of them is on the screen, and
// half their width and half their height. `aspect` is the screen's width divided by its height.
// The view has the screen's shape, so one of the two is bigger than the points need.
function viewExtents(points, aspect, angles = CAMERA, margin = CAMERA.margin) {
  const { right, up } = viewAxes(angles.alpha, angles.beta);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const xs = points.map((p) => dot(p, right));
  const ys = points.map((p) => dot(p, up));
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
  let halfWidth = ((Math.max(...xs) - Math.min(...xs)) / 2) * margin;
  let halfHeight = ((Math.max(...ys) - Math.min(...ys)) / 2) * margin;
  if (halfWidth / halfHeight < aspect) halfWidth = halfHeight * aspect;
  else halfHeight = halfWidth / aspect;
  return { centerX, centerY, halfWidth, halfHeight };
}

// Gives an orthographic camera the edges of its view.
function applyExtents(camera, extents) {
  camera.orthoLeft = extents.centerX - extents.halfWidth;
  camera.orthoRight = extents.centerX + extents.halfWidth;
  camera.orthoBottom = extents.centerY - extents.halfHeight;
  camera.orthoTop = extents.centerY + extents.halfHeight;
}

// Makes the camera. It is an ArcRotateCamera, which sits on a sphere round a target, so "from the
// front, tipped over" is two angles. It isn't attached to the mouse or touch: the player doesn't move the view.
function buildCamera(scene) {
  const camera = new BABYLON.ArcRotateCamera("camera", CAMERA.alpha, CAMERA.beta, CAMERA.distance, BABYLON.Vector3.Zero(), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 1;
  camera.maxZ = CAMERA.distance * 2;
  scene.activeCamera = camera;
  return camera;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CAMERA, viewAxes, boardPoints, viewExtents, applyExtents, buildCamera };
} else {
  Object.assign(window, { CAMERA, viewAxes, boardPoints, viewExtents, applyExtents, buildCamera });
}
```

Things to notice:

- **The camera is two angles.** An `ArcRotateCamera` sits on a sphere round a target. `alpha` is how far round, and `beta` how far it is tipped from straight up. `alpha: -Math.PI / 2` is the front: change it to `-Math.PI / 4` and you look from a corner instead. Everything below works for any angle.
- **`viewAxes` finds which way the screen's right and up point in the world.** The camera looks along `forward`, which comes from its two angles. *Right* is the world's up crossed with forward (that is the order in a left-handed world, and a test checks it against a real camera so you don't have to trust me), and *up on the screen* is forward crossed with right.
- **`boardPoints` gives the eight corners of what must always be in view:** the board with its rim, the headroom above it for a tall tower, and the part of the rock that there is room for. The rest of the rock runs off the bottom of the screen on purpose, or the board would be small.
- **`viewExtents` projects each point onto the screen's right and up, and finds the box that holds them,** which is a plain *dot product* each way. Then it makes the box the screen's shape: if the points are too tall for the aspect ratio it widens the box, and if too wide it makes it taller. So a phone held upright is limited by the width of the board, and a wide window by its height.
- **The `margin` is a multiplier,** so there is a little sky round the board.
- **The center of the box isn't the origin:** the board's projected box isn't centered on the screen (the headroom above makes the box taller on one side), so `viewExtents` returns the box's center and `applyExtents` puts the four edges round it.

Open the placeholder `tests/view.tests.js` and replace its contents with:

```js
// Several shapes of screen: a phone held upright, a square, a wide window, and a very wide phone.
const ASPECTS = [0.46, 1, 16 / 9, 2.4];

QUnit.module("the CAMERA table", () => {
  QUnit.test("it looks from the front, which puts the far row at the top of the screen", (assert) => {
    const { forward } = viewAxes();

    assert.true(forward[2] > 0, "it looks away from the front, toward more z");
  });

  QUnit.test("it is tipped down: more than straight on, less than straight down", (assert) => {
    assert.true(CAMERA.beta > 0 && CAMERA.beta < Math.PI / 2);
  });

  QUnit.test("it is far enough back to see over everything", (assert) => {
    const farthest = Math.hypot((BOARD.cols * BOARD.cell) / 2, BOARD.depth, (BOARD.rows * BOARD.cell) / 2);

    assert.true(CAMERA.distance > farthest);
  });
});

QUnit.module("viewAxes", () => {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const length = (v) => Math.hypot(v[0], v[1], v[2]);

  QUnit.test("right, up and forward are each one unit long", (assert) => {
    const { right, up, forward } = viewAxes();

    for (const axis of [right, up, forward]) assert.true(Math.abs(length(axis) - 1) < 1e-9);
  });

  QUnit.test("and each is at a right angle to the others", (assert) => {
    const { right, up, forward } = viewAxes();

    assert.true(Math.abs(dot(right, up)) < 1e-9);
    assert.true(Math.abs(dot(right, forward)) < 1e-9);
    assert.true(Math.abs(dot(up, forward)) < 1e-9);
  });

  QUnit.test("from the front, the screen's right is the world's x", (assert) => {
    const { right } = viewAxes(-Math.PI / 2, 0.7);

    assert.true(Math.abs(right[0] - 1) < 1e-9);
    assert.true(Math.abs(right[1]) < 1e-9 && Math.abs(right[2]) < 1e-9);
  });

  QUnit.test("up on the screen is up in the world, and away from the camera", (assert) => {
    const { up } = viewAxes();

    assert.true(up[1] > 0);
    assert.true(up[2] > 0);
  });

  QUnit.test("looking straight down, up on the screen is the far edge, away from the camera", (assert) => {
    const { up } = viewAxes(-Math.PI / 2, 1e-6);

    assert.true(up[2] > 0.999);
  });

  QUnit.test("it matches where a real camera is", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const camera = buildCamera(scene);
    camera.getViewMatrix(true);
    const { forward } = viewAxes();
    const real = camera.getForwardRay().direction;

    assert.true(Math.abs(real.x - forward[0]) < 1e-6);
    assert.true(Math.abs(real.y - forward[1]) < 1e-6);
    assert.true(Math.abs(real.z - forward[2]) < 1e-6);
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("boardPoints", () => {
  QUnit.test("there are eight corners", (assert) => {
    assert.strictEqual(boardPoints().length, 8);
  });

  QUnit.test("they are the board's edges plus the rim, as high as the headroom and as low as the view shows", (assert) => {
    const points = boardPoints();
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const zs = points.map((p) => p[2]);

    assert.strictEqual(Math.max(...xs), (BOARD.cols * BOARD.cell) / 2 + BOARD.rim);
    assert.strictEqual(Math.min(...xs), -(BOARD.cols * BOARD.cell) / 2 - BOARD.rim);
    assert.strictEqual(Math.max(...zs), (BOARD.rows * BOARD.cell) / 2 + BOARD.rim);
    assert.strictEqual(Math.max(...ys), BOARD.headroom);
    assert.strictEqual(Math.min(...ys), -BOARD.peek);
  });
});

QUnit.module("viewExtents", () => {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  QUnit.test("the view has the shape of the screen", (assert) => {
    for (const aspect of ASPECTS) {
      const { halfWidth, halfHeight } = viewExtents(boardPoints(), aspect);

      assert.true(Math.abs(halfWidth / halfHeight - aspect) < 1e-9, `aspect ${aspect}`);
    }
  });

  QUnit.test("every corner of the board is inside it, on every shape of screen", (assert) => {
    const { right, up } = viewAxes();
    for (const aspect of ASPECTS) {
      const e = viewExtents(boardPoints(), aspect);
      const inside = boardPoints().every((p) => {
        return Math.abs(dot(p, right) - e.centerX) <= e.halfWidth + 1e-9 && Math.abs(dot(p, up) - e.centerY) <= e.halfHeight + 1e-9;
      });

      assert.true(inside, `aspect ${aspect}`);
    }
  });

  QUnit.test("it is no bigger than it needs to be: one direction is exactly full, with the margin", (assert) => {
    const { right, up } = viewAxes();
    const points = boardPoints();
    const xs = points.map((p) => dot(p, right));
    const ys = points.map((p) => dot(p, up));
    const wantWidth = ((Math.max(...xs) - Math.min(...xs)) / 2) * CAMERA.margin;
    const wantHeight = ((Math.max(...ys) - Math.min(...ys)) / 2) * CAMERA.margin;

    for (const aspect of ASPECTS) {
      const e = viewExtents(points, aspect);
      const full = Math.abs(e.halfWidth - wantWidth) < 1e-9 || Math.abs(e.halfHeight - wantHeight) < 1e-9;

      assert.true(full, `aspect ${aspect}`);
      assert.true(e.halfWidth >= wantWidth - 1e-9 && e.halfHeight >= wantHeight - 1e-9, `aspect ${aspect}`);
    }
  });

  QUnit.test("a phone held upright is limited by the board's width, and a wide window by its height", (assert) => {
    const { right, up } = viewAxes();
    const points = boardPoints();
    const xs = points.map((p) => dot(p, right));
    const ys = points.map((p) => dot(p, up));
    const needWidth = ((Math.max(...xs) - Math.min(...xs)) / 2) * CAMERA.margin;
    const needHeight = ((Math.max(...ys) - Math.min(...ys)) / 2) * CAMERA.margin;

    assert.true(Math.abs(viewExtents(points, 0.46).halfWidth - needWidth) < 1e-9);
    assert.true(Math.abs(viewExtents(points, 3).halfHeight - needHeight) < 1e-9);
  });

  QUnit.test("it is centered on the middle of the points, not on the origin", (assert) => {
    const { right, up } = viewAxes();
    const points = [[0, 0, 0], [10, 0, 0], [0, 0, 4]];
    const e = viewExtents(points, 1);
    const xs = points.map((p) => dot(p, right));
    const ys = points.map((p) => dot(p, up));

    assert.true(Math.abs(e.centerX - (Math.min(...xs) + Math.max(...xs)) / 2) < 1e-9);
    assert.true(Math.abs(e.centerY - (Math.min(...ys) + Math.max(...ys)) / 2) < 1e-9);
  });
});

QUnit.module("applyExtents and buildCamera", () => {
  QUnit.test("applyExtents puts the four edges on a camera", (assert) => {
    const camera = {};
    applyExtents(camera, { centerX: 1, centerY: -2, halfWidth: 8, halfHeight: 4 });

    assert.strictEqual(camera.orthoLeft, -7);
    assert.strictEqual(camera.orthoRight, 9);
    assert.strictEqual(camera.orthoBottom, -6);
    assert.strictEqual(camera.orthoTop, 2);
  });

  QUnit.test("buildCamera makes an orthographic camera at the CAMERA angles, and makes it the one that is used", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const camera = buildCamera(scene);

    assert.strictEqual(camera.mode, BABYLON.Camera.ORTHOGRAPHIC_CAMERA);
    assert.strictEqual(camera.alpha, CAMERA.alpha);
    assert.strictEqual(camera.beta, CAMERA.beta);
    assert.strictEqual(camera.radius, CAMERA.distance);
    assert.strictEqual(scene.activeCamera, camera);
    scene.dispose();
    engine.dispose();
  });
});
```

- **"It matches where a real camera is"** is the most important one. All the maths above is only worth anything if it agrees with Babylon.js, so this test makes a real camera in a scene (with the `NullEngine`, an engine that draws nothing, so no screen is needed) and asks which way it looks.
- **The tests go through several screen shapes** (`ASPECTS`): a phone held upright, a square, a wide window and a very wide phone. Every corner of the board has to be inside the view on every one of them.
- **"It is no bigger than it needs to be"** is the other half: a view that showed the whole sky would pass the test above, so this one says that one direction is exactly full.

**Check:** open `tests.html`. 35 tests pass.

---

## Step 4: Models the right size

A model comes in its own size, and with its own idea of where the middle is. The tiles of this game are 1.9 units wide and drawn around their middle, so half of each is *under* the ground; the podiums are drawn around their middle too; a bender stands on the ground. Rather than fix each by hand, this file **measures** a model and works out how to scale and lift it, and every later model goes through it.

Open the placeholder `js/models.js` and replace its contents with:

```js
// Models come in their own size, and with their own idea of where the middle is: the tiles of
// this game are 1.9 units wide, the podiums are drawn around their middle, and the next ones
// will be different again. This measures a model and works out how to scale and lift it so that
// it stands on the ground and fits where it is put. See ../tests/models.tests.js.

const ASSETS = "../assets/"; // where the models are, from the page

// The size of a box that holds a model, given as its two corners.
function sizeOf(bounds) {
  return {
    x: bounds.max.x - bounds.min.x,
    y: bounds.max.y - bounds.min.y,
    z: bounds.max.z - bounds.min.z,
  };
}

// How much to scale a model to make it `width` wide on the ground (its longer side, across or deep).
function fitScale(size, width) {
  return width / Math.max(size.x, size.z);
}

// How far to move a model up (or down) so that its top is at the ground. `scale` is the
// scale it will be given. The tiles are drawn around their middle, and a tower stands on the
// top of one, so it is the top that must be at zero.
function topOffset(bounds, scale) {
  return -bounds.max.y * scale;
}

// How far to move a model along x and z, after it has been scaled, so that its middle is at the middle of its cell.
function centerOffset(bounds, scale) {
  return {
    x: -((bounds.min.x + bounds.max.x) / 2) * scale,
    z: -((bounds.min.z + bounds.max.z) / 2) * scale,
  };
}

// The box that holds a model and everything under it, in the model's own units. The
// model's meshes are not in the scene yet (they are in a container), so the matrices
// that put each mesh in place are worked out first.
function measure(root) {
  root.computeWorldMatrix(true);
  const { min, max } = root.getHierarchyBoundingVectors(true);
  return {
    min: { x: min.x, y: min.y, z: min.z },
    max: { x: max.x, y: max.y, z: max.z },
  };
}

// Loads a .glb into a container: its meshes, materials and animations are made, but nothing is in
// the scene until it is asked for. Many copies can be made from one container, and they share
// the one set of triangles and pictures.
async function loadModel(scene, file) {
  return BABYLON.SceneLoader.LoadAssetContainerAsync(ASSETS, file, scene);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ASSETS, sizeOf, fitScale, topOffset, centerOffset, measure, loadModel };
} else {
  Object.assign(window, { ASSETS, sizeOf, fitScale, topOffset, centerOffset, measure, loadModel });
}
```

Things to notice:

- **A model is loaded into a *container*,** with `LoadAssetContainerAsync`. A container holds the model's meshes, materials and animations, but **nothing is in the scene** until you ask: that is what lets you load a tile once and put a hundred of it on the board. (`ImportMeshAsync`, the other way to load a model, puts it in the scene at once.)
- **`measure` is the box that holds a model,** from `getHierarchyBoundingVectors`, which looks at every mesh in the model. The matrices that place each mesh are worked out first (`computeWorldMatrix(true)`), because a container's meshes have never been drawn, and so don't have them yet.
- **`fitScale` uses the longer of the two sides on the ground, and not the height:** a tile has to fit its cell whatever its thickness, and a tower will have to fit whatever its height.
- **`topOffset` is the amount to lift a model so that its *top* is at zero.** A tile is a thin slab drawn around its middle, and what stands on it stands on its top, so the top is the ground. (A bender is drawn standing on its feet; a later tutorial uses `bounds.min.y` for that.)
- **`centerOffset` is for a model drawn off to one side,** and moves its middle to the origin after it has been scaled.

Open the placeholder `tests/models.tests.js` and replace its contents with:

```js
// A box, given as its two corners.
const box = (min, max) => ({ min: { x: min[0], y: min[1], z: min[2] }, max: { x: max[0], y: max[1], z: max[2] } });

QUnit.module("sizeOf", () => {
  QUnit.test("is how far apart the corners are, along each axis", (assert) => {
    assert.deepEqual(sizeOf(box([-1, 2, 0], [3, 3, 5])), { x: 4, y: 1, z: 5 });
  });
});

QUnit.module("fitScale", () => {
  QUnit.test("makes the longer side of the ground the width asked for", (assert) => {
    assert.strictEqual(fitScale({ x: 4, y: 9, z: 2 }, 2), 0.5);
    assert.strictEqual(fitScale({ x: 2, y: 9, z: 4 }, 2), 0.5);
  });

  QUnit.test("does not look at the height, which can be anything", (assert) => {
    assert.strictEqual(fitScale({ x: 2, y: 100, z: 2 }, 4), 2);
  });

  QUnit.test("a model that is already the right width keeps its size", (assert) => {
    assert.strictEqual(fitScale({ x: 1.9, y: 0.2, z: 1.9 }, 1.9), 1);
  });
});

QUnit.module("topOffset and centerOffset", () => {
  QUnit.test("a model drawn around its middle is lifted by half its height, scaled", (assert) => {
    const bounds = box([-1, -0.1, -1], [1, 0.1, 1]);

    assert.strictEqual(topOffset(bounds, 1), -0.1);
    assert.strictEqual(topOffset(bounds, 10), -1);
  });

  QUnit.test("a model that stands on the ground, with its top high up, is moved down", (assert) => {
    assert.strictEqual(topOffset(box([-1, 0, -1], [1, 1.8, 1]), 1), -1.8);
  });

  QUnit.test("after the offset, the top is exactly at zero", (assert) => {
    const bounds = box([-1, -0.3, -1], [1, 0.7, 1]);
    const scale = 2.5;

    assert.true(Math.abs(bounds.max.y * scale + topOffset(bounds, scale)) < 1e-12);
  });

  QUnit.test("a model drawn off to one side is moved back to the middle, after it is scaled", (assert) => {
    const bounds = box([0, 0, -1], [4, 1, 1]);

    assert.deepEqual(centerOffset(bounds, 0.5), { x: -1, z: -0 });
  });

  QUnit.test("a model that is already in the middle is not moved", (assert) => {
    const offset = centerOffset(box([-2, 0, -3], [2, 1, 3]), 1);

    assert.strictEqual(offset.x + 0, 0);
    assert.strictEqual(offset.z + 0, 0);
  });
});

QUnit.module("real models", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a model loads into a container, and nothing is in the scene until it is asked for", async (assert) => {
    const container = await loadModel(scene, "tiles/grass.glb");

    assert.true(container.meshes.length > 0);
    assert.strictEqual(scene.meshes.length, 0);
  });

  QUnit.test("measure gives the box that holds a model: a tile is about two wide, and thin", async (assert) => {
    const container = await loadModel(scene, "tiles/straight.glb");
    const size = sizeOf(measure(container.rootNodes[0]));

    assert.true(size.x > 1.5 && size.x < 2.5, `width ${size.x}`);
    assert.true(size.z > 1.5 && size.z < 2.5, `depth ${size.z}`);
    assert.true(size.y > 0 && size.y < 0.5, `height ${size.y}`);
  });

  QUnit.test("the five tiles are all the same size on the ground, so that they fit together", async (assert) => {
    const sizes = [];
    for (const kind of ["grass", "straight", "corner", "junction", "crossroads"]) {
      const container = await loadModel(scene, `tiles/${kind}.glb`);
      sizes.push(sizeOf(measure(container.rootNodes[0])));
    }
    const widths = sizes.map((s) => s.x);
    const depths = sizes.map((s) => s.z);

    assert.true(Math.max(...widths) / Math.min(...widths) < 1.05, widths.join(", "));
    assert.true(Math.max(...depths) / Math.min(...depths) < 1.05, depths.join(", "));
  });
});
```

- **The first modules are plain arithmetic** on boxes made by hand, so each rule is easy to read.
- **"After the offset, the top is exactly at zero"** says what the offset is *for*, whatever numbers it's given.
- **"real models" loads the real files.** `NullEngine` loads and measures them as the browser would, with nothing drawn. The test of the five tiles is the one that would have caught a model made the wrong size by the model maker: tiles that aren't the same size don't fit together.
- **A container really does keep its meshes out of the scene,** and a test says so (`scene.meshes.length` is 0).

**Check:** open `tests.html` through the web server (the real-model tests fetch files, so a page opened from a file will fail them). 47 tests pass.

---

## Step 5: The tiles

Now the board's floor. A **tile** is a model, and the board is a hundred and twenty-six of them. Loading a hundred and twenty-six copies of a 1 MB file would be slow and use a lot of memory; the way to avoid it is to load one of each kind and put **instances** in every cell. An *instance* is a mesh that shares the original's triangles and materials: it only has a position, a turn and a scale of its own, and Babylon.js draws all the instances of a mesh in one go.

Open the placeholder `js/tiles.js` and replace its contents with:

```js
// The tiles the board is made of: grass for building on, and the pieces of road that enemies
// walk. Each kind is a model, loaded once, and every cell of that kind is a copy that shares the
// one set of triangles and pictures. See ../tests/tiles.tests.js.

// The models, and what each one looks like when it is not turned. The road pieces are drawn
// with their road running up the screen: a straight piece runs from the front to the back,
// a corner joins the back to the right, a junction is a road across with a branch to the back,
// and a crossroads joins all four.
const TILES = {
  grass: { file: "tiles/grass.glb" },
  straight: { file: "tiles/straight.glb" },
  corner: { file: "tiles/corner.glb" },
  junction: { file: "tiles/junction.glb" },
  crossroads: { file: "tiles/crossroads.glb" },
};

// A tile is made a little wider than its cell, so the ragged edges of one hide the crack
// between it and the next.
const TILE_FIT = 1.02;

// Which way to turn a tile of grass. Every grass tile is the same picture, and a board of them looks like
// wallpaper, so each is turned a quarter at a time, in a way that looks random but is the
// same every time: it depends only on the cell.
function grassTurn(col, row) {
  let hash = Math.imul(col + 1, 374761393) ^ Math.imul(row + 1, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return (hash >>> 16) & 3;
}

// Loads every kind of tile, and works out how each is scaled and lifted to fit a cell.
async function loadTiles(scene, board = BOARD, tiles = TILES) {
  const kinds = Object.keys(tiles);
  const containers = await Promise.all(kinds.map((kind) => loadModel(scene, tiles[kind].file)));
  const loaded = {};
  kinds.forEach((kind, i) => {
    const bounds = measure(containers[i].rootNodes[0]);
    const scale = fitScale(sizeOf(bounds), board.cell * TILE_FIT);
    loaded[kind] = {
      container: containers[i],
      scale,
      lift: topOffset(bounds, scale),
      shift: centerOffset(bounds, scale),
    };
  });
  return loaded;
}

// Puts one tile in a cell. `turn` is how many quarter turns it is given, clockwise seen from
// above. Two nodes hold it: the outer one is at the middle of the cell and does the turning, and the
// inner one scales the model and moves it so that its top is at the ground and its middle at the cell's.
function placeTile(scene, tile, name, col, row, turn = 0, board = BOARD) {
  const { x, z } = cellCenter(col, row, board);
  const outer = new BABYLON.TransformNode(name, scene);
  outer.position.set(x, 0, z);
  outer.rotation.y = (turn * Math.PI) / 2;

  const inner = new BABYLON.TransformNode(`${name} model`, scene);
  inner.parent = outer;
  inner.position.set(tile.shift.x, tile.lift, tile.shift.z);
  inner.scaling.setAll(tile.scale);

  // Instances, not clones: Babylon.js draws every instance of a mesh in one go, which is what makes a
  // board of a hundred and twenty tiles cheap. (By default it makes clones, which are drawn one at a time.)
  const copy = tile.container.instantiateModelsToScene((original) => `${name} ${original}`, false, { doNotInstantiate: false });
  copy.rootNodes[0].parent = inner;
  return outer;
}

// Fills the board. `kindAt(col, row)` says what goes in a cell: { kind, turn }.
function buildTiles(scene, tiles, kindAt, board = BOARD) {
  return boardCells(board).map(({ col, row }) => {
    const { kind, turn } = kindAt(col, row);
    const node = placeTile(scene, tiles[kind], `tile ${col},${row}`, col, row, turn, board);
    return { col, row, kind, turn, node };
  });
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TILES, TILE_FIT, grassTurn, loadTiles, placeTile, buildTiles };
} else {
  Object.assign(window, { TILES, TILE_FIT, grassTurn, loadTiles, placeTile, buildTiles });
}
```

Things to notice:

- **`TILES` says which file is which kind,** and the comment above it says how each is drawn when it is *not* turned: a straight piece runs from the front to the back, a corner joins the back to the right, a junction is a road across with a branch to the back, a crossroads joins all four. The next tutorial lays the road with these, by turning each piece, and it needs to know what a piece looks like before it is turned.
- **`TILE_FIT` makes each tile 2% wider than its cell,** so that the ragged edges of two tiles overlap and hide the crack between them. Try `1` and you will see the cracks.
- **`grassTurn` breaks up the pattern.** All the grass tiles are the same picture, and a board of them looks like wallpaper, with the same bush in every cell. Turning each by a quarter-turn at a time, in a way that depends only on the cell (a *hash*: it mixes the column and the row into a number that looks random), makes it look natural, and because it depends only on the cell it is the same every time you open the page.
- **`loadTiles` loads every kind at once** (`Promise.all`: the loads run side by side, and it waits for all of them), measures each and works out its scale, its lift and its shift. They are put in one object, `tiles[kind]`.
- **`placeTile` uses two nodes.** The outer one is at the middle of the cell and **does the turning**, so a tile turns about its middle. The inner one scales the model and moves it so that its top is on the ground and its middle is at the cell's. If you put the turn and the shift on one node the tile would swing round a corner.
- **`instantiateModelsToScene(..., { doNotInstantiate: false })` is the line that makes instances.** Without that option Babylon.js makes *clones*, which share their triangles too, but are drawn one at a time: for a hundred tiles, a hundred draws instead of one for each kind. A test says "two tiles of one kind share their triangles" by checking that they are instances of the same source mesh.
- **`buildTiles` fills the board from a function,** `kindAt(col, row)`, that says what goes in each cell. That is the whole interface between the map and the board, and in the next tutorial the map is what answers it.

Open the placeholder `tests/tiles.tests.js` and replace its contents with:

```js
// A board of three across and two deep, so that loading and building take no time.
const TINY = { cols: 3, rows: 2, cell: 2, rim: 0, depth: 1, peek: 1, headroom: 1 };

QUnit.module("grassTurn", () => {
  QUnit.test("is a number of quarter turns, from none to three", (assert) => {
    for (const { col, row } of boardCells()) {
      const turn = grassTurn(col, row);

      assert.true(Number.isInteger(turn) && turn >= 0 && turn <= 3);
    }
  });

  QUnit.test("is the same for a cell every time", (assert) => {
    assert.strictEqual(grassTurn(5, 3), grassTurn(5, 3));
  });

  QUnit.test("uses all four turns, and none of them for much more than a third of the board", (assert) => {
    const counts = [0, 0, 0, 0];
    for (const { col, row } of boardCells()) counts[grassTurn(col, row)]++;
    const total = BOARD.cols * BOARD.rows;

    assert.true(counts.every((n) => n > 0), counts.join(", "));
    assert.true(counts.every((n) => n < total * 0.4), counts.join(", "));
  });

  QUnit.test("a cell is not always turned the same way as the one beside it", (assert) => {
    let same = 0;
    for (let col = 0; col < BOARD.cols - 1; col++) {
      if (grassTurn(col, 0) === grassTurn(col + 1, 0)) same++;
    }

    assert.true(same < BOARD.cols / 2);
  });
});

QUnit.module("the tiles", (hooks) => {
  let engine, scene, tiles;
  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    tiles = await loadTiles(scene, TINY);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // The box that holds everything a node holds.
  const boundsOf = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true);
  };

  QUnit.test("there is a tile for every kind in the TILES table", (assert) => {
    assert.deepEqual(Object.keys(tiles).sort(), Object.keys(TILES).sort());
  });

  QUnit.test("each is scaled to be a little wider than a cell", (assert) => {
    for (const kind of Object.keys(TILES)) {
      const bounds = boundsOf(placeTile(scene, tiles[kind], `test ${kind}`, 0, 0, 0, TINY));

      assert.true(Math.abs(bounds.max.x - bounds.min.x - TINY.cell * TILE_FIT) < TINY.cell * 0.06, kind);
    }
  });

  QUnit.test("the top of a tile is at the ground", (assert) => {
    for (const kind of Object.keys(TILES)) {
      const bounds = boundsOf(placeTile(scene, tiles[kind], `test ${kind}`, 0, 0, 0, TINY));

      assert.true(Math.abs(bounds.max.y) < 0.01, `${kind} top ${bounds.max.y}`);
    }
  });

  QUnit.test("a tile is centered on its cell", (assert) => {
    const { x, z } = cellCenter(2, 1, TINY);
    const bounds = boundsOf(placeTile(scene, tiles.straight, "test", 2, 1, 0, TINY));

    assert.true(Math.abs((bounds.min.x + bounds.max.x) / 2 - x) < 0.05);
    assert.true(Math.abs((bounds.min.z + bounds.max.z) / 2 - z) < 0.05);
  });

  QUnit.test("a turned tile is still centered on its cell", (assert) => {
    const { x, z } = cellCenter(1, 0, TINY);
    for (let turn = 1; turn <= 3; turn++) {
      const bounds = boundsOf(placeTile(scene, tiles.corner, `test ${turn}`, 1, 0, turn, TINY));

      assert.true(Math.abs((bounds.min.x + bounds.max.x) / 2 - x) < 0.05, `turn ${turn}`);
      assert.true(Math.abs((bounds.min.z + bounds.max.z) / 2 - z) < 0.05, `turn ${turn}`);
    }
  });

  QUnit.test("each turn is a quarter of a circle", (assert) => {
    assert.strictEqual(placeTile(scene, tiles.grass, "a", 0, 0, 0, TINY).rotation.y, 0);
    assert.strictEqual(placeTile(scene, tiles.grass, "b", 0, 0, 1, TINY).rotation.y, Math.PI / 2);
    assert.strictEqual(placeTile(scene, tiles.grass, "c", 0, 0, 3, TINY).rotation.y, (3 * Math.PI) / 2);
  });

  QUnit.test("placeTile gives back the node it made, and it is named", (assert) => {
    const node = placeTile(scene, tiles.grass, "tile 1,1", 1, 1, 0, TINY);

    assert.strictEqual(node.name, "tile 1,1");
    assert.true(node.getChildMeshes().length > 0);
  });

  QUnit.test("two tiles of one kind share their triangles, so a big board costs memory only once", (assert) => {
    const instances = (node) => node.getChildMeshes().filter((mesh) => mesh.sourceMesh);
    const a = instances(placeTile(scene, tiles.grass, "a", 0, 0, 0, TINY));
    const b = instances(placeTile(scene, tiles.grass, "b", 1, 0, 0, TINY));

    assert.true(a.length > 0, "a tile is made of instances of the model's meshes");
    assert.strictEqual(a.length, b.length);
    assert.strictEqual(a[0].sourceMesh, b[0].sourceMesh);
  });

  QUnit.test("buildTiles fills every cell, with what kindAt says", (assert) => {
    const built = buildTiles(scene, tiles, (col, row) => (col === 1 ? { kind: "straight", turn: 1 } : { kind: "grass", turn: 0 }), TINY);

    assert.strictEqual(built.length, TINY.cols * TINY.rows);
    assert.true(built.filter((t) => t.col === 1).every((t) => t.kind === "straight" && t.turn === 1));
    assert.true(built.filter((t) => t.col !== 1).every((t) => t.kind === "grass"));
  });

  QUnit.test("buildTiles puts each one in its cell", (assert) => {
    const built = buildTiles(scene, tiles, () => ({ kind: "grass", turn: 0 }), TINY);

    for (const { col, row, node } of built) {
      const { x, z } = cellCenter(col, row, TINY);

      assert.true(Math.abs(node.position.x - x) < 1e-9 && Math.abs(node.position.z - z) < 1e-9);
    }
  });
});
```

- **`TINY` is a board of three by two,** so the tests make six tiles and not a hundred and twenty-six.
- **The `grassTurn` tests say what you want of "random":** every turn is used, none is used much more than a third of the time, and a cell isn't always turned like its neighbour. (My first try was a plain formula, and these tests said that one turn made up nearly half the board: they were worth writing.)
- **`boundsOf` measures the box round a placed tile,** and the tests use it to say that a tile is a little wider than its cell, that its top is at the ground, that it is centered on its cell, and that **a turned tile is still centered**, which is the test that would fail if the turn and the shift were on one node.

**Check:** open `tests.html`. 61 tests pass.

---

## Step 6: A floating island

A tower defense board that sits on nothing looks like a diagram. This board sits on a lump of rock in the sky, and because it is made in code from a few rings of points, it costs nothing to download and you can change it with a number. It needs random numbers to make the rock lumpy, and a rock that is different every time the page opens would be a bad thing, and so would a test that gives a different answer every time. So first: **random numbers that can be repeated**.

Open the placeholder `js/random.js` and replace its contents with:

```js
// Random numbers that can be repeated. Math.random() gives something different every time,
// which is no good for a rock that must look the same on every visit, or for a test that must
// give the same answer every time. This gives a function that is used like Math.random(), a
// number from 0 up to (not including) 1, but that makes the same list of numbers for the same
// seed. (It is the one called mulberry32.) See ../tests/random.tests.js.
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { seededRandom };
} else {
  window.seededRandom = seededRandom;
}
```

- **`seededRandom(seed)` gives a function used like `Math.random()`:** a number from 0 up to, but not including, 1. The same seed always gives the same list of numbers. Every part of the game that needs chance (the island, the clouds, and later the waves) takes its random function as an *argument*, so a test can hand it a seeded one and get the same answer every time.
- **The algorithm is *mulberry32*,** a few lines of integer maths that mixes a counter. `Math.imul` is a 32-bit multiply (an ordinary `*` would lose the low bits to floating point), and `>>> 0` keeps the number unsigned.

Open the placeholder `tests/random.tests.js` and replace its contents with:

```js
QUnit.module("seededRandom", () => {
  const take = (random, n) => Array.from({ length: n }, () => random());

  QUnit.test("the same seed gives the same numbers, every time", (assert) => {
    assert.deepEqual(take(seededRandom(5), 20), take(seededRandom(5), 20));
  });

  QUnit.test("a different seed gives different numbers", (assert) => {
    assert.notDeepEqual(take(seededRandom(5), 20), take(seededRandom(6), 20));
  });

  QUnit.test("every number is from 0 up to, but not including, 1", (assert) => {
    for (const n of take(seededRandom(1), 2000)) assert.true(n >= 0 && n < 1);
  });

  QUnit.test("the numbers are spread out evenly: a thousand of them average about a half", (assert) => {
    const numbers = take(seededRandom(3), 1000);
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;

    assert.true(Math.abs(mean - 0.5) < 0.05);
  });

  QUnit.test("each number is the next in a list, so two functions with the same seed do not share it", (assert) => {
    const a = seededRandom(9);
    const b = seededRandom(9);
    a();
    a();

    assert.strictEqual(b(), take(seededRandom(9), 1)[0]);
  });
});
```

Now the island. Open the placeholder `js/island.js` and replace its contents with:

```js
// The island: the board floats in the sky on a lump of rock that narrows to a point below it.
// The rock is made in code from a few rings of points round the board's outline, each ring lower
// and smaller than the one above, and pushed a little in or out by a seeded random number so that
// it is lumpy, and the same lump every time. See ../tests/island.tests.js.

const ISLAND = {
  segments: 5, // points along each side of the outline, not counting the corner that starts the next
  seed: 7, // which lump: change it for another rock
  top: -0.3, // the height of the island's top face: under the bottom of every tile, or a road in a thick tile would be buried
  jitter: 0.45, // how far a point may be pushed in or out, in world units
  // The rings, from the top down: how far down (as a share of the board's depth), and how
  // much of the outline's size is left (1 is all of it).
  rings: [
    { down: 0, size: 1 },
    { down: 0.14, size: 1 },
    { down: 0.3, size: 0.88 },
    { down: 0.55, size: 0.6 },
    { down: 0.8, size: 0.3 },
    { down: 1, size: 0.08 },
  ],
  rock: "#6e5f50", // the colors of the rock and of the grass round the board's edge
  grass: "#4f7a2a",
};

// The points of a rectangle's outline, going once round it: `segments` on each side, starting
// at the corner at the back left. They are given in the order a clock's hand goes, seen from above.
function outline(halfWidth, halfDepth, segments = ISLAND.segments) {
  const corners = [
    [-halfWidth, halfDepth],
    [halfWidth, halfDepth],
    [halfWidth, -halfDepth],
    [-halfWidth, -halfDepth],
  ];
  const points = [];
  for (let side = 0; side < 4; side++) {
    const [ax, az] = corners[side];
    const [bx, bz] = corners[(side + 1) % 4];
    for (let i = 0; i < segments; i++) {
      points.push([ax + ((bx - ax) * i) / segments, az + ((bz - az) * i) / segments]);
    }
  }
  return points;
}

// The rings of points that make the rock: an array of rings, each an array of { x, y, z }. The
// top ring is exactly the board's outline (with its rim); the rest are smaller, lower, and lumpy.
function rockRings(random, board = BOARD, island = ISLAND) {
  const halfWidth = (board.cols * board.cell) / 2 + board.rim;
  const halfDepth = (board.rows * board.cell) / 2 + board.rim;
  const base = outline(halfWidth, halfDepth, island.segments);
  return island.rings.map((ring, index) => {
    const y = island.top - ring.down * board.depth;
    return base.map(([x, z]) => {
      let px = x * ring.size;
      let pz = z * ring.size;
      if (index > 0) {
        // push it in along the line to the middle, so the rock never sticks out past the board
        const away = Math.hypot(px, pz) || 1;
        const push = -random() * island.jitter * ring.size; // the narrow rings get less, or a point could cross the middle
        px += (px / away) * push;
        pz += (pz / away) * push;
      }
      return { x: px, y, z: pz };
    });
  });
}

// The triangles between the rings, as plain lists for a mesh: every triangle has points of its
// own (nothing is shared) so that each is lit flat, like a cut stone. The last ring is closed
// off with a fan of triangles to its middle. Counted clockwise, seen from outside, which is the
// side Babylon.js draws.
function rockGeometry(rings) {
  const positions = [];
  const uvs = [];
  const count = rings[0].length;
  const add = (point, u, v) => {
    positions.push(point.x, point.y, point.z);
    uvs.push(u, v);
  };
  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < count; i++) {
      const j = (i + 1) % count;
      const a = rings[r][i];
      const b = rings[r][j];
      const c = rings[r + 1][j];
      const d = rings[r + 1][i];
      const u0 = (i / count) * 4;
      const u1 = ((i + 1) / count) * 4;
      const v0 = r * 0.5;
      const v1 = (r + 1) * 0.5;
      add(a, u0, v0);
      add(b, u1, v0);
      add(c, u1, v1);
      add(a, u0, v0);
      add(c, u1, v1);
      add(d, u0, v1);
    }
  }
  const last = rings[rings.length - 1];
  const tip = { x: 0, y: last[0].y - 0.05, z: 0 };
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    add(last[i], 0, 1);
    add(last[j], 1, 1);
    add(tip, 0.5, 1);
  }
  const indices = Array.from({ length: positions.length / 3 }, (_, n) => n); // nothing is shared, so every point is used once, in order
  return { positions, uvs, indices };
}

// A picture of rock for the lump: a dull brown with darker and lighter flecks.
function makeRockTexture(scene, random, color = ISLAND.rock) {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("rock", { width: size, height: size }, scene, true);
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  const context = texture.getContext();
  context.fillStyle = color;
  context.fillRect(0, 0, size, size);
  for (let n = 0; n < 700; n++) {
    const shade = random() < 0.5 ? "0,0,0" : "255,240,220";
    context.fillStyle = `rgba(${shade},${0.04 + random() * 0.1})`;
    const w = 4 + random() * 28;
    context.fillRect(random() * size, random() * size, w, 2 + random() * 6);
  }
  texture.update();
  return texture;
}

// Makes the island in a scene: the lumpy rock, and a flat top of grass that shows round the edge of the board.
function buildIsland(scene, board = BOARD, island = ISLAND) {
  const random = seededRandom(island.seed);
  const rings = rockRings(random, board, island);
  const { positions, uvs, indices } = rockGeometry(rings);
  const normals = [];
  BABYLON.VertexData.ComputeNormals(positions, indices, normals);

  const rock = new BABYLON.Mesh("rock", scene);
  const data = new BABYLON.VertexData();
  data.positions = positions;
  data.indices = indices;
  data.normals = normals;
  data.uvs = uvs;
  data.applyToMesh(rock);
  const rockMaterial = new BABYLON.StandardMaterial("rock", scene);
  rockMaterial.diffuseTexture = makeRockTexture(scene, random, island.rock);
  rockMaterial.specularColor = BABYLON.Color3.Black();
  rock.material = rockMaterial;

  const top = BABYLON.MeshBuilder.CreateGround(
    "island top",
    { width: board.cols * board.cell + board.rim * 2, height: board.rows * board.cell + board.rim * 2 },
    scene
  );
  top.position.y = island.top;
  const topMaterial = new BABYLON.StandardMaterial("island top", scene);
  topMaterial.diffuseColor = BABYLON.Color3.FromHexString(island.grass);
  topMaterial.specularColor = BABYLON.Color3.Black();
  top.material = topMaterial;
  return { rock, top };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ISLAND, outline, rockRings, rockGeometry, makeRockTexture, buildIsland };
} else {
  Object.assign(window, { ISLAND, outline, rockRings, rockGeometry, makeRockTexture, buildIsland });
}
```

Things to notice:

- **The rock is rings.** The top ring is the board's outline (with the rim) exactly; each ring below is lower and smaller; the last is nearly a point. Between two rings there is a band of triangles, so six rings and twenty points on each make a rock of about 220 triangles. The `ISLAND` table is the rock: how many points, how far down each ring is, how much of the size it keeps, how lumpy it is.
- **`outline` walks round a rectangle** with `segments` points on each side. It goes the way a clock's hand goes seen from above, and a test checks that with the sign of a sum (the *shoelace formula*: the signed area of a shape, negative one way round and positive the other).
- **The lumps only go inward, and less for the narrow rings.** A point pushed out past the top ring would stick out of the board's edge, and one pushed too far in on a narrow ring crosses the middle and turns its triangles inside out. Both of those were real bugs, and the tests "nothing sticks out" and "every triangle faces away from the middle" are what found them.
- **`rockGeometry` gives every triangle three points of its own.** Nothing is shared, so every triangle is lit flat, like a cut stone. The index list is then just `0, 1, 2, 3...`.
- **The order of the points in a triangle matters.** Babylon.js draws a triangle only if it is seen from the side its points go round one way (the other side is culled, to save drawing the inside of everything). The test computes the **normals** (the direction each triangle faces, with `VertexData.ComputeNormals`) and checks that every side triangle faces away from the middle, which is the same as saying it's drawn from the outside.
- **The picture of the rock is drawn in code.** `makeRockTexture` fills a `DynamicTexture` (a canvas that becomes a texture) with brown and scatters dark and light strokes on it. `WRAP_ADDRESSMODE` makes it repeat when it is stretched over a big face (a dynamic texture defaults to clamping, which smears the edge pixels).
- **`buildIsland` makes the rock from a `VertexData`** (positions, indices, normals and uvs) and gives it a material with no shine (`specularColor` black: rock isn't shiny). The flat grass top is a `CreateGround` under the tiles, lower than the bottom of every one of them, so that it shows only where they don't quite meet. (The crossroads is the thickest tile, and a top any higher would bury its road: the first version of this file did, and the last test of this step is the one that found it.)

Open the placeholder `tests/island.tests.js` and replace its contents with:

```js
// A board of three across and two deep, no rim, so the numbers are small.
const ROCK_BOARD = { cols: 3, rows: 2, cell: 2, rim: 1, depth: 6, peek: 2, headroom: 1 };

QUnit.module("outline", () => {
  QUnit.test("has the same number of points on each of four sides", (assert) => {
    assert.strictEqual(outline(4, 3, 5).length, 20);
    assert.strictEqual(outline(4, 3, 2).length, 8);
  });

  QUnit.test("starts at the back left corner", (assert) => {
    assert.deepEqual(outline(4, 3, 5)[0], [-4, 3]);
  });

  QUnit.test("every point is on the edge of the rectangle", (assert) => {
    for (const [x, z] of outline(4, 3, 5)) {
      assert.true(Math.abs(x) === 4 || Math.abs(z) === 3, `${x}, ${z}`);
      assert.true(Math.abs(x) <= 4 && Math.abs(z) <= 3);
    }
  });

  QUnit.test("goes round the way a clock's hand goes, seen from above", (assert) => {
    const points = outline(4, 3, 5);
    let area = 0;
    points.forEach(([x, z], i) => {
      const [nx, nz] = points[(i + 1) % points.length];
      area += x * nz - nx * z;
    });

    assert.true(area < 0, "a negative sum of cross products is clockwise, with z going up the screen");
  });
});

QUnit.module("rockRings", () => {
  const rings = (seed = ISLAND.seed, board = ROCK_BOARD) => rockRings(seededRandom(seed), board);

  QUnit.test("there is a ring for every row of the ISLAND table, and a point for each of the outline's", (assert) => {
    const made = rings();

    assert.strictEqual(made.length, ISLAND.rings.length);
    made.forEach((ring) => assert.strictEqual(ring.length, ISLAND.segments * 4));
  });

  QUnit.test("the top ring is the board's outline, exactly, just under the tiles", (assert) => {
    const top = rings()[0];
    const halfWidth = (ROCK_BOARD.cols * ROCK_BOARD.cell) / 2 + ROCK_BOARD.rim;
    const halfDepth = (ROCK_BOARD.rows * ROCK_BOARD.cell) / 2 + ROCK_BOARD.rim;

    top.forEach((p) => {
      assert.strictEqual(p.y, ISLAND.top);
      assert.true(Math.abs(p.x) === halfWidth || Math.abs(p.z) === halfDepth);
    });
  });

  QUnit.test("each ring is lower than the one above, and the last is as deep as the board says", (assert) => {
    const made = rings();

    for (let r = 1; r < made.length; r++) assert.true(made[r][0].y < made[r - 1][0].y);
    assert.true(Math.abs(made[made.length - 1][0].y - (ISLAND.top - ROCK_BOARD.depth)) < 1e-9);
  });

  QUnit.test("nothing sticks out past the board's edge, however the numbers fall", (assert) => {
    const halfWidth = (ROCK_BOARD.cols * ROCK_BOARD.cell) / 2 + ROCK_BOARD.rim;
    const halfDepth = (ROCK_BOARD.rows * ROCK_BOARD.cell) / 2 + ROCK_BOARD.rim;
    for (let seed = 1; seed <= 20; seed++) {
      for (const ring of rings(seed)) {
        assert.true(ring.every((p) => Math.abs(p.x) <= halfWidth + 1e-9 && Math.abs(p.z) <= halfDepth + 1e-9), `seed ${seed}`);
      }
    }
  });

  QUnit.test("the rock narrows as it goes down", (assert) => {
    const reach = (ring) => Math.max(...ring.map((p) => Math.hypot(p.x, p.z)));
    const made = rings();

    assert.true(reach(made[made.length - 1]) < reach(made[0]) / 2);
  });

  QUnit.test("the same seed is the same rock, and another seed is another", (assert) => {
    assert.deepEqual(rings(3), rings(3));
    assert.notDeepEqual(rings(3), rings(4));
  });
});

QUnit.module("rockGeometry", () => {
  const made = () => rockRings(seededRandom(ISLAND.seed), ROCK_BOARD);
  const count = ISLAND.segments * 4;

  QUnit.test("has two triangles for every gap between rings round the outline, and a fan to close the bottom", (assert) => {
    const { positions } = rockGeometry(made());
    const triangles = (ISLAND.rings.length - 1) * count * 2 + count;

    assert.strictEqual(positions.length, triangles * 9);
  });

  QUnit.test("has a pair of texture numbers for every point, and an index for every point, in order", (assert) => {
    const { positions, uvs, indices } = rockGeometry(made());

    assert.strictEqual(uvs.length / 2, positions.length / 3);
    assert.deepEqual(indices.slice(0, 4), [0, 1, 2, 3]);
    assert.strictEqual(indices.length, positions.length / 3);
  });

  QUnit.test("every triangle faces away from the middle: the side is drawn from outside, where it is seen", (assert) => {
    const { positions, indices } = rockGeometry(made());
    const normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    const sides = (ISLAND.rings.length - 1) * count * 2;
    for (let t = 0; t < sides; t++) {
      const at = (k) => positions.slice((t * 3 + k) * 3, (t * 3 + k) * 3 + 3);
      const [a, b, c] = [at(0), at(1), at(2)];
      const middle = [(a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3];
      const n = normals.slice(t * 9, t * 9 + 3);

      assert.true(n[0] * middle[0] + n[2] * middle[1] > 0, `triangle ${t}`);
    }
  });

  QUnit.test("and the fan at the bottom faces down", (assert) => {
    const { positions, indices } = rockGeometry(made());
    const normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    const first = (ISLAND.rings.length - 1) * count * 2;
    for (let t = first; t < first + count; t++) assert.true(normals[t * 9 + 1] < 0, `triangle ${t}`);
  });
});

QUnit.module("makeRockTexture and buildIsland", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the rock texture repeats when it is stretched over a big face", (assert) => {
    const texture = makeRockTexture(scene, seededRandom(1));

    assert.strictEqual(texture.wrapU, BABYLON.Texture.WRAP_ADDRESSMODE);
    assert.strictEqual(texture.wrapV, BABYLON.Texture.WRAP_ADDRESSMODE);
  });

  QUnit.test("buildIsland makes a rock and a flat top", (assert) => {
    const { rock, top } = buildIsland(scene, ROCK_BOARD);

    assert.strictEqual(rock.getTotalVertices(), rockGeometry(rockRings(seededRandom(ISLAND.seed), ROCK_BOARD)).positions.length / 3);
    assert.strictEqual(top.position.y, ISLAND.top);
  });

  QUnit.test("the top is as big as the board with its rim", (assert) => {
    const { top } = buildIsland(scene, ROCK_BOARD);
    const { extendSize } = top.getBoundingInfo().boundingBox;

    assert.true(Math.abs(extendSize.x * 2 - (ROCK_BOARD.cols * ROCK_BOARD.cell + ROCK_BOARD.rim * 2)) < 1e-6);
    assert.true(Math.abs(extendSize.z * 2 - (ROCK_BOARD.rows * ROCK_BOARD.cell + ROCK_BOARD.rim * 2)) < 1e-6);
  });

  QUnit.test("the rock has a material with a picture, and no shine", (assert) => {
    const { rock } = buildIsland(scene, ROCK_BOARD);

    assert.true(rock.material.diffuseTexture !== null);
    assert.true(rock.material.specularColor.equals(BABYLON.Color3.Black()));
  });
});

QUnit.module("the island and the tiles", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the top of the island is under the bottom of every kind of tile, so that no road is buried", async (assert) => {
    const tiles = await loadTiles(scene, ROCK_BOARD);
    for (const kind of Object.keys(TILES)) {
      const node = placeTile(scene, tiles[kind], `test ${kind}`, 0, 0, 0, ROCK_BOARD);
      node.computeWorldMatrix(true);
      node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
      const { min } = node.getHierarchyBoundingVectors(true);

      assert.true(min.y > ISLAND.top, `${kind} goes down to ${min.y.toFixed(3)}, and the island's top is at ${ISLAND.top}`);
    }
  });
});
```

- **`rings(seed)`** makes the rings for a seed, so each test can say which rock it means. "Nothing sticks out" tries twenty seeds, because one lucky rock proves little.
- **Every number comes from the table:** the tests say `ISLAND.rings.length`, never `6`.
- **"The island and the tiles" loads the real tiles** and checks that the lowest point of every kind is above the island's top. It's the test that sits between two files: neither the tiles nor the island is wrong on its own, but together they hid a road.

**Check:** open `tests.html`. 85 tests pass.

---

## Step 7: The sky

Clouds that drift past below the island make it feel like it's high up. They are **planes**, flat rectangles that always face the camera (a *billboard*), with a picture of a cloud on them. Where they are and how they move is just numbers, worked out apart from the drawing, so that it can be tested.

Open the placeholder `js/sky.js` and replace its contents with:

```js
// The sky: clouds that drift past below the island. A cloud is a flat picture that always faces the
// camera, drawn once in code and used for every cloud. Where they are and how they move is plain
// numbers, worked out apart from the drawing, so that it can be tested. See ../tests/sky.tests.js.

const CLOUDS = {
  count: 12,
  seed: 11, // which sky
  width: [8, 18], // the least and the most a cloud is wide, in world units
  speed: [0.3, 0.9], // how fast it drifts to the right, in world units a second
  opacity: [0.55, 0.95],
  below: [4, 12], // how far under the board it is
  reachX: 34, // how far left and right of the middle they are found
  reachZ: 16, // and how far toward and away from the camera
  shape: 0.45, // how tall a cloud is, as a share of its width
};

const between = (range, t) => range[0] + (range[1] - range[0]) * t;

// Where every cloud starts, and what each is like: a list of { x, y, z, width, speed, opacity }.
// `random` is given, so that a test can ask for the same sky every time.
function cloudPlan(random, clouds = CLOUDS) {
  const plan = [];
  for (let n = 0; n < clouds.count; n++) {
    plan.push({
      x: (random() * 2 - 1) * clouds.reachX,
      y: -between(clouds.below, random()),
      z: (random() * 2 - 1) * clouds.reachZ,
      width: between(clouds.width, random()),
      speed: between(clouds.speed, random()),
      opacity: between(clouds.opacity, random()),
    });
  }
  return plan;
}

// Moves a cloud on for `dt` seconds. When it has drifted right out of the sky on the right it comes
// in again on the left, put just far enough out that none of it is showing.
function driftCloud(cloud, dt, clouds = CLOUDS) {
  const edge = clouds.reachX + cloud.width / 2;
  const x = cloud.x + cloud.speed * dt;
  return { ...cloud, x: x > edge ? -edge : x };
}

// A picture of a cloud: a few soft white puffs side by side, drawn with gradients that fade to nothing.
function makeCloudTexture(scene, random) {
  const width = 256;
  const height = 128;
  const texture = new BABYLON.DynamicTexture("cloud", { width, height }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.clearRect(0, 0, width, height);
  const puffs = 7;
  for (let n = 0; n < puffs; n++) {
    const x = 36 + (n / (puffs - 1)) * (width - 72) + (random() - 0.5) * 12;
    const y = height * (0.62 - 0.22 * Math.sin((n / (puffs - 1)) * Math.PI)) + (random() - 0.5) * 8;
    const radius = 24 + random() * 16;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.7)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  texture.update();
  return texture;
}

// Makes the clouds in a scene. `update(dt)` drifts them all.
function buildClouds(scene, random, clouds = CLOUDS) {
  const texture = makeCloudTexture(scene, random);
  const state = cloudPlan(random, clouds);
  const planes = state.map((cloud, n) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(`cloud ${n}`, { width: cloud.width, height: cloud.width * clouds.shape }, scene);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // always faces the camera
    plane.isPickable = false;
    const material = new BABYLON.StandardMaterial(`cloud ${n}`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.emissiveColor = BABYLON.Color3.White();
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alpha = cloud.opacity;
    plane.material = material;
    plane.position.set(cloud.x, cloud.y, cloud.z);
    return plane;
  });
  const update = (dt) => {
    state.forEach((cloud, n) => {
      state[n] = driftCloud(cloud, dt, clouds);
      planes[n].position.x = state[n].x;
    });
  };
  return { planes, update };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLOUDS, cloudPlan, driftCloud, makeCloudTexture, buildClouds };
} else {
  Object.assign(window, { CLOUDS, cloudPlan, driftCloud, makeCloudTexture, buildClouds });
}
```

Things to notice:

- **`cloudPlan(random)` is the sky as data:** a list of `{ x, y, z, width, speed, opacity }`. Each is made from the table's ranges, with `between(range, t)` turning a number from 0 to 1 into a number in a range. Every cloud is **under the board** (`below`), so none can drift in front of a tower.
- **`driftCloud` is a pure function:** it gets a cloud and a time, and gives back a *new* cloud, `{ ...cloud, x }`, without changing the one it was given. A cloud that has gone right off the right of the sky comes back on the left, put just far enough out that none of it is showing, so there is never a pop.
- **One picture is drawn and shared by every cloud.** `makeCloudTexture` draws seven soft puffs with radial gradients that fade to transparent (`rgba(255,255,255,0)` at the edge), each a different size. `hasAlpha` tells Babylon.js the picture has see-through parts.
- **`useAlphaFromDiffuseTexture` and `disableLighting`:** the cloud takes its see-through-ness from the picture, and it's lit by nothing, because a cloud that went dark on one side would look like a lump of grey. `material.alpha` is the cloud's own overall opacity, so each is a different white.
- **`billboardMode = BILLBOARDMODE_ALL`** keeps the plane facing the camera. With an orthographic camera it is always the same direction, but it also keeps working if you change the angle.
- **`isPickable = false`:** a cloud will never catch a click that was meant for a cell.
- **`buildClouds` returns `{ planes, update }`,** and `update(dt)` moves them all: the drawing code is a thin layer over the data.

Open the placeholder `tests/sky.tests.js` and replace its contents with:

```js
QUnit.module("cloudPlan", () => {
  const plan = (seed = CLOUDS.seed) => cloudPlan(seededRandom(seed));
  const within = (value, range) => value >= range[0] && value <= range[1];

  QUnit.test("makes the number of clouds the table says", (assert) => {
    assert.strictEqual(plan().length, CLOUDS.count);
  });

  QUnit.test("every cloud is inside the ranges in the table", (assert) => {
    for (const cloud of plan()) {
      assert.true(Math.abs(cloud.x) <= CLOUDS.reachX);
      assert.true(Math.abs(cloud.z) <= CLOUDS.reachZ);
      assert.true(within(-cloud.y, CLOUDS.below));
      assert.true(within(cloud.width, CLOUDS.width));
      assert.true(within(cloud.speed, CLOUDS.speed));
      assert.true(within(cloud.opacity, CLOUDS.opacity));
    }
  });

  QUnit.test("they are all under the board, so none gets in the way of a tower", (assert) => {
    assert.true(plan().every((cloud) => cloud.y < 0));
  });

  QUnit.test("the same seed is the same sky", (assert) => {
    assert.deepEqual(plan(4), plan(4));
    assert.notDeepEqual(plan(4), plan(5));
  });

  QUnit.test("they are not all the same", (assert) => {
    assert.true(new Set(plan().map((c) => c.width)).size > 1);
  });
});

QUnit.module("driftCloud", () => {
  const cloud = { x: 0, y: -5, z: 2, width: 10, speed: 0.5, opacity: 0.8 };

  QUnit.test("goes to the right, at its speed", (assert) => {
    assert.strictEqual(driftCloud(cloud, 4).x, 2);
  });

  QUnit.test("changes nothing but where it is", (assert) => {
    assert.deepEqual({ ...driftCloud(cloud, 4), x: 0 }, cloud);
  });

  QUnit.test("does not change the cloud it is given", (assert) => {
    driftCloud(cloud, 4);

    assert.strictEqual(cloud.x, 0);
  });

  QUnit.test("a cloud that has gone right out of the sky comes in again from the left", (assert) => {
    const edge = CLOUDS.reachX + cloud.width / 2;
    const moved = driftCloud({ ...cloud, x: edge - 0.1 }, 1);

    assert.true(moved.x < -CLOUDS.reachX, `${moved.x}`);
  });

  QUnit.test("and none of it is showing when it does", (assert) => {
    const edge = CLOUDS.reachX + cloud.width / 2;
    const moved = driftCloud({ ...cloud, x: edge - 0.1 }, 1);

    assert.true(moved.x + cloud.width / 2 <= -CLOUDS.reachX);
  });

  QUnit.test("a long time later, they are all still in the sky", (assert) => {
    let clouds = cloudPlan(seededRandom(CLOUDS.seed));
    for (let step = 0; step < 6000; step++) clouds = clouds.map((c) => driftCloud(c, 0.1));

    assert.true(clouds.every((c) => Math.abs(c.x) <= CLOUDS.reachX + c.width / 2));
  });
});

QUnit.module("buildClouds", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("makes a plane for every cloud, that always faces the camera", (assert) => {
    const { planes } = buildClouds(scene, seededRandom(CLOUDS.seed));

    assert.strictEqual(planes.length, CLOUDS.count);
    assert.true(planes.every((p) => p.billboardMode === BABYLON.Mesh.BILLBOARDMODE_ALL));
  });

  QUnit.test("a cloud cannot be picked, so it does not get in the way of the board", (assert) => {
    const { planes } = buildClouds(scene, seededRandom(CLOUDS.seed));

    assert.true(planes.every((p) => p.isPickable === false));
  });

  QUnit.test("they share one picture, and each has its own see-through-ness", (assert) => {
    const { planes } = buildClouds(scene, seededRandom(CLOUDS.seed));

    assert.strictEqual(new Set(planes.map((p) => p.material.diffuseTexture)).size, 1);
    assert.true(planes.every((p) => p.material.alpha >= CLOUDS.opacity[0] && p.material.alpha <= CLOUDS.opacity[1]));
  });

  QUnit.test("update moves every plane to the right, by a speed that the table keeps between two limits", (assert) => {
    const { planes, update } = buildClouds(scene, seededRandom(CLOUDS.seed));
    const before = planes.map((p) => p.position.x);
    update(1);

    planes.forEach((p, n) => {
      const moved = p.position.x - before[n];
      if (moved < 0) assert.true(p.position.x < -CLOUDS.reachX, `cloud ${n} came in again from the left`);
      else assert.true(moved >= CLOUDS.speed[0] - 1e-9 && moved <= CLOUDS.speed[1] + 1e-9, `cloud ${n} moved ${moved}`);
    });
  });

  QUnit.test("update keeps every plane at the height it began", (assert) => {
    const { planes, update } = buildClouds(scene, seededRandom(CLOUDS.seed));
    const before = planes.map((p) => [p.position.y, p.position.z]);
    update(5);

    planes.forEach((p, n) => assert.deepEqual([p.position.y, p.position.z], before[n]));
  });
});
```

- **"A long time later, they are all still in the sky"** runs six hundred seconds in a hundred milliseconds at a time and checks that no cloud is ever outside its range. A bug in the wrap would fail it.
- **`driftCloud` is tested without a scene at all,** because it is arithmetic on a plain object.

**Check:** open `tests.html`. 101 tests pass.

---

## Step 8: Putting it together

Two files left. Open the placeholder `js/splash.js` and replace its contents with:

```js
// The splash screen covers the page while the game loads. If the game loads
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

- **A splash that vanishes the moment the game is ready would flash by,** so it stays for a minimum time. This works out how much longer that is. The times come in as arguments (from `performance.now()`), so the test needn't wait.

Open the placeholder `tests/splash.tests.js` and replace its contents with:

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

Now the file that uses everything. Open the placeholder `js/main.js` and replace its contents with:

```js
const canvas = document.getElementById("renderCanvas");

// The canvas is see-through (`alpha`), so the sky is the page's own gradient, which the browser draws for free.
const engine = new BABYLON.Engine(canvas, true, { alpha: true });

// A phone's screen has two or three times as many pixels across as it seems to, and drawing
// every one is slow and hot. Drawing at most twice as many as the page's units looks sharp
// and keeps the game smooth. (A hardware scaling level of 0.5 draws twice as many pixels.)
const MAX_PIXEL_RATIO = 2;
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

const SPLASH_MIN_MS = 2500; // the splash stays at least this long, even if everything loads sooner

// What goes in every cell, for now: grass, with one road of straight pieces across the middle
// row, turned a quarter so that it runs from side to side. It is only there to show that two kinds
// of tile fit together. The next sample replaces it with a map.
const kindAt = (col, row) => (row === Math.floor(BOARD.rows / 2) ? { kind: "straight", turn: 1 } : { kind: "grass", turn: grassTurn(col, row) });

const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // see-through: the page's sky shows

  // An orthographic camera is given the edges of its view, in world units, and they have to be
  // worked out again whenever the screen changes shape: a phone turned on its side, a window resized.
  const camera = buildCamera(scene);
  const fitView = () => applyExtents(camera, viewExtents(boardPoints(), engine.getAspectRatio(camera)));
  fitView();
  engine.onResizeObservable.add(fitView);

  // A soft light from above, bluer than the sun, fills in the dark sides, and a warm one from the
  // front, high up on the left, gives everything a bright side and a dark one.
  const skyLight = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  skyLight.intensity = 0.65;
  skyLight.diffuse = new BABYLON.Color3(0.85, 0.92, 1);
  skyLight.groundColor = new BABYLON.Color3(0.45, 0.4, 0.35);
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.5, -1, 0.6), scene);
  sun.intensity = 0.85;
  sun.diffuse = new BABYLON.Color3(1, 0.95, 0.85);

  const tiles = await loadTiles(scene);
  buildTiles(scene, tiles, kindAt);
  buildIsland(scene);

  // The clouds drift every frame. The time a frame took is capped, so that a tab that has been
  // in the background doesn't make them jump when it comes back.
  const clouds = buildClouds(scene, seededRandom(CLOUDS.seed));
  scene.onBeforeRenderObservable.add(() => {
    clouds.update(Math.min(engine.getDeltaTime() / 1000, 0.05));
  });

  return { scene };
};

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

    // The board is ready, drawing behind the splash. Keep the splash up for its minimum
    // time, then fade it out and take it away.
    await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent =
      "Something went wrong starting the game. The models are loaded from files, so the page has to be " +
      "opened through a web server (for example `npx serve` in the repo folder), and Babylon.js comes from " +
      "the internet, so check your connection. The console has the details.";
  });
```

Things to notice:

- **`alpha: true` makes the canvas see-through,** and `clearColor` of (0, 0, 0, 0) clears it to nothing, so the page's sky shows through wherever nothing is drawn.
- **`setHardwareScalingLevel`** draws fewer pixels than the screen has. A phone's screen has two or three times as many pixels across as it seems to, and drawing every one is slow and hot. Drawing at most twice as many as the page's units looks sharp and keeps the game smooth.
- **`kindAt` is the placeholder for a map:** grass, with a road of straight pieces turned a quarter across the middle row. It is there to show that two kinds of tile fit together, and that a turn works. In the next tutorial a real map answers this question.
- **`fitView` is run again when the screen changes shape:** `engine.onResizeObservable` says when.
- **Two lights.** A *hemispheric* light is a soft light from above (blue, like the sky) with a different color for what faces down. A *directional* light is the sun, with a direction and no position. They are weaker than you'd think: the tiles are *PBR* materials, and with a bright light on a bright color they turn the grass the color of a tennis ball.
- **The clouds drift every frame,** by the time the frame took, **capped at 0.05 seconds.** A tab that has been in the background has a very long first frame when it comes back, and without the cap everything would jump.
- **The splash comes away after the minimum time,** with a fade (`hidden` is a class) and then removed from the page. If anything goes wrong while the scene is made, the `catch` puts a message on the splash, because a splash that says *Loading...* for ever is the worst thing a game can say.

**Check:** open `tests.html`. 106 tests pass. Then open `index.html` through the web server. The logo shows for two and a half seconds, then fades to a floating island with a board of grass, a road across its middle, and soft clouds drifting by below.

---

## Step 9: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **Look from a corner.** In `view.js` change `alpha` to `-Math.PI / 4`. The board is now a diamond, and it still fits: the maths doesn't know about the angle.
- **Look from higher up.** Change `beta` to `0.3` (almost straight down) or `1.2` (almost level).
- **Change the board.** In `board.js` set `cols: 20` and `rows: 12`. Everything follows: the tiles, the island and the view. No other file says a number.
- **See the cracks.** In `tiles.js` set `TILE_FIT` to `1`.
- **See the wallpaper.** In `main.js` change `grassTurn(col, row)` to `0`.
- **Another rock.** In `island.js` change `seed` to another number.
- **Meet the other tiles.** Change `kindAt` in `main.js` to this, and look at the five road pieces, each unturned:

```js
const kindAt = (col, row) => {
  const kinds = ["straight", "corner", "junction", "crossroads"];
  return row === 4 && col < kinds.length ? { kind: kinds[col], turn: 0 } : { kind: "grass", turn: grassTurn(col, row) };
};
```

  The straight piece runs from the front to the back, the corner joins the back and the right, the junction has a branch to the back, and the crossroads has all four. Now set `turn` to `1`, `2` and `3`: each is a quarter-turn clockwise seen from above. That is all the next tutorial needs to lay a road.
- **A phone.** In device mode try a phone upright and on its side: the board is as wide as the screen allows, and the empty space above and below is where the buttons will go.

---

## Troubleshooting

- **The splash says it went wrong, or stays on *Loading...*:** open the console (F12). A `404` for a `.js` file is a file name you spelled differently from the page's `<script>` tag. A *cross-origin* or *fetch* error for a `.glb` means the page was opened from a file: use the web server.
- **`BOARD is not defined` (or `cellCenter`, `viewAxes`...):** the file that defines it isn't loaded, or its export block at the bottom is missing, or the script tag is in the wrong order (`board.js` first).
- **The tests page says `0 tests`:** a test file has a syntax error. The console says which, and the line.
- **The board is a flat green with no roads:** the island's top (`ISLAND.top`) is higher than the bottom of the tiles, and buries them.
- **The board is there, but looks flat white:** the lights are too strong, or a model failed to load its pictures.
- **The tiles have cracks between them:** `TILE_FIT` is `1` or less.
- **The rock is invisible or dark:** its triangles are the wrong way round (a *winding* mistake), or its material has no texture. The island tests say which.
- **The board is cut off at the sides on a phone:** `engine.onResizeObservable.add(fitView)` is missing.

---

## What you have

A floating island you can look at on any screen, made of models that were too big and are now light enough, with a map hook (`kindAt`) that the next tutorial fills in, and a test suite of 106 tests behind it.

**Next up:** the road. The next tutorial describes a map as text, lays the right road piece in each cell by looking at which neighbours are road, turns each so its ends meet its neighbours, finds the path an enemy walks, and sends an enemy along it.
