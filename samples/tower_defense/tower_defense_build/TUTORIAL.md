# Tutorial: Tower Defense Build -- Dragging a Podium onto the Board

This is the fourth tutorial in the Tower Defense series. The board has a road, enemies and four towers that were put there for you. Now **you build them**. A tray along the bottom of the screen holds a podium for each nation; you **drag** one onto the board, an outline round the cell under it turns **red** where a tower can't go and **green** where one can, a ring shows how far it will shoot, and when you let go the tower is built and its price is paid in **gold**. You can also **tap** a podium and then tap the board, for a finger that would rather not hold on. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Pointing**: the arithmetic that turns where a finger or a mouse is on the screen into a cell of the board, with no scene, and a finger held a little *above* where it is so that it doesn't hide what is being dragged
- **Gold**: a price for each bender, and a wallet that knows what there is and whether it can pay
- **The rule**: one function that says whether a tower can be built in a cell (the placement rules, and then the gold), and one that builds it
- A **builder**: a small state machine that tells a drag from a tap
- An **outline** that fades from red to green (and back) over a cell, and a **ring** of how far a tower shoots
- A **tray** of four buttons, with the gold and a line that says why a tower can't be built, made from a page with no game in it
- A **hand**: the part that listens to the pointer and puts all of that together
- A game where you build the towers yourself, on a phone or a desktop
- Unit tests for all of it: **474 passing tests**, 105 of them new, including tests that **press, drag and let go with no screen**

**What you'll learn:** how an orthographic camera is turned around to say what the pointer is looking at (two equations in two unknowns), pointer events (the one that goes down on a button, and the ones that go on over the whole page), the difference between a drag and a tap and how to tell them apart, why a finger is held *above* the place it touches, how to fade a color so that it takes the same time on every computer (an exponential approach), tinting a shape that is drawn in code, laying out a page so that a tray never hides the board, a HUD made from a page and a list, passing a tool *events it can fake* so that the whole of a drag can be tested, and keeping a rule in one place so that the thing that checks it and the thing that shows why are the same.

**Before you start:** do the [Benders tutorial](../tower_defense_benders/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Benders sample, plus placeholders for the new files and their tests:

```
tower_defense_build/
├── index.html, tests.html   (already list the new scripts, the tray and the readouts)
├── css/
│   ├── tray.css              (placeholder -- Step 5)
│   └── everything else, from the Benders sample
├── js/
│   ├── pointing.js           (placeholder -- Step 1)
│   ├── economy.js            (placeholder -- Step 2)
│   ├── build.js              (placeholder -- Step 3)
│   ├── outline.js            (placeholder -- Step 4)
│   ├── tray.js               (placeholder -- Step 5)
│   ├── hand.js               (placeholder -- Step 6)
│   ├── benders.js            (an addition -- Step 2)
│   ├── main.js               (changes -- Step 7)
│   └── everything else, from the Benders sample
└── tests/
    ├── pointing.tests.js, economy.tests.js, build.tests.js, outline.tests.js, tray.tests.js, hand.tests.js   (placeholders)
    └── everything else, from the Benders sample
```

Open `tests.html` before you change anything, through the web server. You should see **369 passing tests**, the Benders sample's.

### What the page has been given

`index.html` has three new things in it. A stylesheet, `css/tray.css` (you write it in Step 5); three elements, which are where the gold, the message and the tray are drawn:

```html
<div id="gold" aria-live="polite"><span class="coin"></span><span id="gold-amount">0</span></div>
<div id="message" aria-live="polite"></div>
<div id="tray"></div>
```

and a `<script>` line for each new file. (`aria-live` tells a screen reader to read out changes to the gold and to the message.) `tests.html` has the same new scripts and tests.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_build/` (the command prints the exact address), or use the *Live Server* extension in VS Code. `?map=1` is the second map.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Pointing**: where on the board is the pointer?
2. **Gold**: prices, and a wallet.
3. **The rule and the builder**: can a tower go here, and is it a drag or a tap?
4. **The outline**: red, green, and a ring.
5. **The tray**: the buttons, the gold, and the message.
6. **The hand**: all of it together.
7. **The game.**

---

## Step 1: Pointing

When a finger is on the screen, which cell of the board is under it? The screen is a picture of the board, and this works backwards from the picture. It needs no scene, because the camera is orthographic, so there is no perspective to undo: it is **two equations with two unknowns**.

Open the placeholder `js/pointing.js` and replace its contents with:

```js
// Pointing: turning a place on the screen (where a finger or a mouse is) into a place on the board. The
// camera has no perspective, so this is simple arithmetic and needs no scene: the screen shows a box of
// the world (the extents that view.js works out), a place on the screen is a share of the way across that
// box and up it, and the ground is the one place on the line of sight that is at the height you ask for.
// See ../tests/pointing.tests.js.

const POINTER = {
  touchLift: 72, // how many pixels above a finger a dragged podium is held, so that the finger doesn't hide it
  tapDistance: 10, // how far a finger can move and still be a tap, in pixels
};

// A place on the page, as a share of the way across and up the canvas, from -1 to 1 each way, with
// up and to the right the bigger numbers (as a camera sees it). `rect` is the canvas's box on the page.
function toScreenShare(rect, clientX, clientY) {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: 1 - ((clientY - rect.top) / rect.height) * 2,
  };
}

// How far above the pointer to hold something that is dragged: a finger covers what is under it and
// a mouse pointer does not.
function liftFor(pointerType) {
  return pointerType === "touch" ? POINTER.touchLift : 0;
}

// The place on the ground that a place on the screen is looking at, as { x, z }. `share` is { x, y } from
// -1 to 1, `extents` is what viewExtents gave for the screen, and `height` is how high the ground is.
// A place on the screen is a place in the world that is that far to the right of the camera and that far up
// from it: dot(p, right) = px and dot(p, up) = py. With the height known, that is two equations for x and z.
function groundAt(extents, share, angles = CAMERA, height = 0) {
  const { right, up } = viewAxes(angles.alpha, angles.beta);
  const px = extents.centerX + share.x * extents.halfWidth - right[1] * height;
  const py = extents.centerY + share.y * extents.halfHeight - up[1] * height;
  // right[0] x + right[2] z = px, and up[0] x + up[2] z = py
  const determinant = right[0] * up[2] - right[2] * up[0];
  return {
    x: (px * up[2] - right[2] * py) / determinant,
    z: (right[0] * py - up[0] * px) / determinant,
  };
}

// The cell that a place on the page is over, or null when it is off the board. This is the three steps in
// order: where on the canvas, where on the ground, which cell.
function cellAtPoint(rect, extents, clientX, clientY, lift = 0, board = BOARD) {
  const ground = groundAt(extents, toScreenShare(rect, clientX, clientY - lift));
  return cellAt(ground.x, ground.z, board);
}

// Whether a place on the page is inside a box (a canvas, a tray).
function isInside(rect, clientX, clientY) {
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { POINTER, toScreenShare, liftFor, groundAt, cellAtPoint, isInside };
} else {
  Object.assign(window, { POINTER, toScreenShare, liftFor, groundAt, cellAtPoint, isInside });
}
```

Things to notice:

- **A place on the page, as a share of the canvas.** `toScreenShare` gives a number from -1 to 1 across and up: -1 is the left and the bottom, 1 the right and the top, as a camera sees it (up is bigger, and the page counts down). `rect` is the box of the canvas on the page, from `getBoundingClientRect()`.
- **`groundAt` is the whole idea.** The screen shows a box of the world: its middle is `centerX, centerY` and it is `halfWidth` and `halfHeight` big (the `extents` that `view.js` worked out). A share across the screen is a place in that box. A point `p` in the world is at that place if `dot(p, right) = px` and `dot(p, up) = py`, where `right` and `up` are the axes of the screen in the world (from `viewAxes`). We know the height of the ground, so with `p = (x, height, z)` that is two equations for `x` and `z`, which are solved by the usual formula (the *determinant*). A look from straight down has `up` pointing along z, and the equations come out as `x = px` and `z = py / cos(beta)`: a tilt makes the board look shorter than it is, so a place on the screen is further along the ground than it looks.
- **It works from any angle.** `groundAt` takes the camera's angles, like `viewExtents` does, so the same function works if the camera is turned to look from a corner.
- **`cellAtPoint` is three steps in a row:** where on the canvas, where on the ground, which cell. That is `cellAt` from the first tutorial at the end of it.
- **`liftFor`: a finger is held *above*.** A finger covers what is under it, so the podium a finger drags would be hidden by the finger. A touch is taken to be `POINTER.touchLift` (72 pixels) higher on the screen than it really is, so the podium appears above the fingertip. A mouse pointer covers almost nothing, and has no lift. (The lift is *pixels on the screen*, so the cell it makes is further back on the board.)
- **`tapDistance`:** a finger isn't still. A press that moves less than ten pixels is a tap. It is in this table because it is about the pointer.

Open the placeholder `tests/pointing.tests.js` and replace its contents with:

```js
// A canvas 800 wide and 400 tall, 100 across and 50 down the page.
const CANVAS = { left: 100, top: 50, width: 800, height: 400, right: 900, bottom: 450 };

QUnit.module("toScreenShare", () => {
  QUnit.test("the middle of the canvas is the middle of the view", (assert) => {
    assert.deepEqual(toScreenShare(CANVAS, 500, 250), { x: 0, y: 0 });
  });

  QUnit.test("the edges are minus one and one, and up is bigger, as a camera sees it", (assert) => {
    assert.deepEqual(toScreenShare(CANVAS, 100, 450), { x: -1, y: -1 });
    assert.deepEqual(toScreenShare(CANVAS, 900, 50), { x: 1, y: 1 });
  });

  QUnit.test("it does not matter where on the page the canvas is", (assert) => {
    const moved = { left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400 };

    assert.deepEqual(toScreenShare(moved, 600, 100), toScreenShare(CANVAS, 700, 150));
  });

  QUnit.test("a place outside the canvas is outside the range", (assert) => {
    assert.true(toScreenShare(CANVAS, 1000, 250).x > 1);
    assert.true(toScreenShare(CANVAS, 500, 500).y < -1);
  });
});

QUnit.module("liftFor and isInside", () => {
  QUnit.test("a finger is held up, and a mouse is not", (assert) => {
    assert.strictEqual(liftFor("touch"), POINTER.touchLift);
    assert.strictEqual(liftFor("mouse"), 0);
    assert.strictEqual(liftFor("pen"), 0);
    assert.strictEqual(liftFor(undefined), 0);
  });

  QUnit.test("isInside is true on the box and its edge, false off it", (assert) => {
    assert.true(isInside(CANVAS, 500, 250));
    assert.true(isInside(CANVAS, 100, 50));
    assert.true(isInside(CANVAS, 900, 450));
    assert.false(isInside(CANVAS, 99, 250));
    assert.false(isInside(CANVAS, 500, 451));
  });
});

QUnit.module("groundAt", () => {
  const extents = viewExtents(boardPoints(), 2);
  const { right, up } = viewAxes();
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // Where a place in the world is on the screen: the opposite of groundAt.
  const shareOf = (p, e = extents) => ({ x: (dot(p, right) - e.centerX) / e.halfWidth, y: (dot(p, up) - e.centerY) / e.halfHeight });

  QUnit.test("it is the opposite of putting a place on the screen: from the ground, to the screen, and back", (assert) => {
    for (const cell of boardCells()) {
      const { x, z } = cellCenter(cell.col, cell.row);
      const back = groundAt(extents, shareOf([x, 0, z]));

      assert.true(Math.abs(back.x - x) < 1e-9 && Math.abs(back.z - z) < 1e-9, `${cell.col},${cell.row}`);
    }
  });

  QUnit.test("it works for a height other than the ground", (assert) => {
    const head = [3, 2.5, -4];
    const back = groundAt(extents, shareOf(head), CAMERA, 2.5);

    assert.true(Math.abs(back.x - 3) < 1e-9 && Math.abs(back.z + 4) < 1e-9);
  });

  QUnit.test("it works from any angle the camera might have", (assert) => {
    for (const alpha of [-Math.PI / 2, -Math.PI / 4, -2, -1]) {
      const angles = { alpha, beta: 0.9 };
      const view = viewExtents(boardPoints(), 1.6, angles);
      const axes = viewAxes(alpha, 0.9);
      const share = { x: (dot([2, 0, 3], axes.right) - view.centerX) / view.halfWidth, y: (dot([2, 0, 3], axes.up) - view.centerY) / view.halfHeight };
      const back = groundAt(view, share, angles);

      assert.true(Math.abs(back.x - 2) < 1e-9 && Math.abs(back.z - 3) < 1e-9, `alpha ${alpha}`);
    }
  });

  QUnit.test("going up the screen goes away from the camera: the back of the board is the top", (assert) => {
    const low = groundAt(extents, { x: 0, y: -0.2 });
    const high = groundAt(extents, { x: 0, y: 0.2 });

    assert.true(high.z > low.z);
    assert.true(Math.abs(high.x - low.x) < 1e-9);
  });

  QUnit.test("going right on the screen is more x", (assert) => {
    const left = groundAt(extents, { x: -0.3, y: 0 });
    const rightward = groundAt(extents, { x: 0.3, y: 0 });

    assert.true(rightward.x > left.x);
  });

  QUnit.test("it agrees with where a real camera looks", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const camera = buildCamera(scene);
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const view = viewExtents(boardPoints(), engine.getAspectRatio(camera));
    applyExtents(camera, view);
    scene.render();
    for (const [px, py] of [[width * 0.5, height * 0.5], [width * 0.25, height * 0.3], [width * 0.8, height * 0.7]]) {
      const ray = scene.createPickingRay(px, py, BABYLON.Matrix.Identity(), camera);
      const t = -ray.origin.y / ray.direction.y;
      const real = { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
      const mine = groundAt(view, { x: (px / width) * 2 - 1, y: 1 - (py / height) * 2 });

      assert.true(Math.abs(real.x - mine.x) < 1e-3 && Math.abs(real.z - mine.z) < 1e-3, `${px}, ${py}: real ${real.x.toFixed(3)}, ${real.z.toFixed(3)}, mine ${mine.x.toFixed(3)}, ${mine.z.toFixed(3)}`);
    }
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("cellAtPoint", () => {
  const view = viewExtents(boardPoints(), CANVAS.width / CANVAS.height);
  const { right, up } = viewAxes();
  const pageOf = (col, row) => {
    const { x, z } = cellCenter(col, row);
    const sx = (x * right[0] + z * right[2] - view.centerX) / view.halfWidth;
    const sy = (x * up[0] + z * up[2] - view.centerY) / view.halfHeight;
    return { x: CANVAS.left + ((sx + 1) / 2) * CANVAS.width, y: CANVAS.top + ((1 - sy) / 2) * CANVAS.height };
  };

  QUnit.test("the middle of every cell, put on the screen, is that cell again", (assert) => {
    for (const { col, row } of boardCells()) {
      const p = pageOf(col, row);

      assert.deepEqual(cellAtPoint(CANVAS, view, p.x, p.y), { col, row }, `${col},${row}`);
    }
  });

  QUnit.test("off the board is no cell", (assert) => {
    assert.strictEqual(cellAtPoint(CANVAS, view, CANVAS.left + 2, CANVAS.top + 2), null, "the corner of the sky");
  });

  QUnit.test("a lift holds the cell above the pointer: it is the cell that many pixels up the screen", (assert) => {
    const p = pageOf(5, 5);
    const lifted = cellAtPoint(CANVAS, view, p.x, p.y + 40, 40);

    assert.deepEqual(lifted, { col: 5, row: 5 });
    assert.deepEqual(cellAtPoint(CANVAS, view, p.x, p.y, 0), { col: 5, row: 5 });
  });

  QUnit.test("a bigger lift is a cell further up the screen, which is further back on the board", (assert) => {
    const p = pageOf(5, 5);
    const lifted = cellAtPoint(CANVAS, view, p.x, p.y, 70);

    assert.true(lifted.row < 5, `row ${lifted.row}`);
    assert.strictEqual(lifted.col, 5);
  });
});
```

- **"It is the opposite of putting a place on the screen"** is the main test: every cell's middle is put *on* the screen (a dot product each way, which is what a camera does) and then `groundAt` has to get it back. Doing a thing and undoing it is the cleanest way to test an inverse.
- **"It agrees with where a real camera looks"** is the one that stops it all being a closed circle. It makes a real camera, asks Babylon.js for the ray that goes through a pixel (`createPickingRay`), finds where that ray meets the ground, and checks it is the place `groundAt` says. Everything above could be wrong in the same way as itself; this can't.
- **"It works from any angle the camera might have"** tries four angles. A function that is only right for the angle you wrote it for is a function that breaks the day you change the camera.
- **"A bigger lift is a cell further up the screen, which is further back on the board"** is the lift for a finger, said as a test.

**Check:** open `tests.html`. 385 tests pass.

---

## Step 2: Gold

A tower costs gold, so a bender has a price, and the game has a wallet. First, the price. It goes in the table of benders, because it is a fact about a bender, beside the range and the cooldown. A change to the comment:

In `js/benders.js`, **replace** line 13:

```js
// throw. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
```

with:

```js
// throw. `cost` is what a podium for them costs, in gold. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
```

and a price for each of the four (the air nomad's podium costs least and the fire nation's most):

In `js/benders.js`, after line 26, add:

```js
    cost: 100,
```

In `js/benders.js`, after line 37, add:

```js
    cost: 125,
```

In `js/benders.js`, after line 48, add:

```js
    cost: 150,
```

In `js/benders.js`, after line 59, add:

```js
    cost: 175,
```

Now the wallet. Open the placeholder `js/economy.js` and replace its contents with:

```js
// Gold: what a tower costs and what there is to spend. The prices are in the BENDERS table, and
// the numbers about money that are not a price are in ECONOMY. A wallet knows only how much there is,
// and whether it can pay. See ../tests/economy.tests.js.

const ECONOMY = {
  startGold: 400, // what there is at the start
  trickle: 12, // gold a second that comes in for now, with no one to defeat: the next tutorial pays for defeats instead
};

class Wallet {
  constructor(gold = ECONOMY.startGold) {
    this.gold = gold;
  }

  // Whether there is enough to pay `cost`.
  canAfford(cost) {
    return this.gold >= cost;
  }

  // Pays `cost`, if there is enough, and says whether it did. If there is not enough, nothing is taken.
  spend(cost) {
    if (!this.canAfford(cost)) return false;
    this.gold -= cost;
    return true;
  }

  // Takes in `amount`.
  earn(amount) {
    this.gold += amount;
  }

  // What to show: whole gold, rounded down (gold that comes in a bit at a time has a fraction, and 99.9 is not 100).
  get shown() {
    return Math.floor(this.gold);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ECONOMY, Wallet };
} else {
  Object.assign(window, { ECONOMY, Wallet });
}
```

- **`ECONOMY` is the table of numbers about money that aren't a price:** what there is at the start, and a **trickle**. There are no waves yet, so nothing can be defeated and nothing can be earned by defeating it; a little gold comes in every second so that you can go on building. The next tutorial pays for defeats instead, and the trickle goes.
- **A wallet knows how much there is, and whether it can pay.** `spend` takes the gold and says yes, or takes nothing and says no. It never goes below nothing, because spending is only done if there is enough.
- **`earn` takes a fraction.** Gold that comes in a bit at a time (`trickle * dt`) has a fraction, and `shown` is the **whole** gold, rounded down. A screen that says 100 when you have 99.9 would let you try to buy something that costs 100 and be refused.

Open the placeholder `tests/economy.tests.js` and replace its contents with:

```js
QUnit.module("the ECONOMY table and the prices", () => {
  QUnit.test("every bender has a price, in whole gold", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) assert.true(Number.isInteger(spec.cost) && spec.cost > 0, kind);
  });

  QUnit.test("there is gold to start with, for a few towers, and not for all of them", (assert) => {
    const prices = Object.values(BENDERS).map((spec) => spec.cost);
    const all = prices.reduce((a, b) => a + b, 0);

    assert.true(ECONOMY.startGold >= Math.min(...prices) * 2, "at least two of the cheapest");
    assert.true(ECONOMY.startGold < all, "not one of each kind and more");
  });
});

QUnit.module("Wallet", () => {
  QUnit.test("begins with the starting gold, or what it is given", (assert) => {
    assert.strictEqual(new Wallet().gold, ECONOMY.startGold);
    assert.strictEqual(new Wallet(30).gold, 30);
  });

  QUnit.test("can afford what it has, and no more", (assert) => {
    const wallet = new Wallet(100);

    assert.true(wallet.canAfford(100));
    assert.true(wallet.canAfford(1));
    assert.false(wallet.canAfford(100.5));
  });

  QUnit.test("spending takes the gold, and says so", (assert) => {
    const wallet = new Wallet(100);

    assert.true(wallet.spend(30));
    assert.strictEqual(wallet.gold, 70);
  });

  QUnit.test("spending more than there is takes nothing, and says no", (assert) => {
    const wallet = new Wallet(20);

    assert.false(wallet.spend(21));
    assert.strictEqual(wallet.gold, 20);
  });

  QUnit.test("spending exactly what there is leaves none", (assert) => {
    const wallet = new Wallet(50);

    assert.true(wallet.spend(50));
    assert.strictEqual(wallet.gold, 0);
  });

  QUnit.test("earning adds, and a little at a time adds up", (assert) => {
    const wallet = new Wallet(0);
    for (let i = 0; i < 100; i++) wallet.earn(ECONOMY.trickle / 100);

    assert.true(Math.abs(wallet.gold - ECONOMY.trickle) < 1e-9);
  });

  QUnit.test("what is shown is whole gold, rounded down", (assert) => {
    assert.strictEqual(new Wallet(99.99).shown, 99);
    assert.strictEqual(new Wallet(100).shown, 100);
    assert.strictEqual(new Wallet(0.4).shown, 0);
  });

  QUnit.test("it never goes below nothing", (assert) => {
    const wallet = new Wallet(10);
    wallet.spend(5);
    wallet.spend(5);
    wallet.spend(1);

    assert.strictEqual(wallet.gold, 0);
  });
});
```

- **"There is gold to start with, for a few towers, and not for all of them"** says something about the *design*, in a test: at least two of the cheapest, and fewer than one of every kind. A change to a price that broke that would break how the start of the game feels, and now it fails.
- **"A little at a time adds up"** earns a hundredth of the trickle a hundred times.

**Check:** open `tests.html`. 395 tests pass.

---

## Step 3: The rule, and the builder

Two things here that need no screen. First, **whether a tower can be built in a cell**, and **building it**. Second, **a drag from a tap**.

Open the placeholder `js/build.js` and replace its contents with:

```js
// Building: the rule for whether a tower can be built, the way a podium is picked up from the tray (a
// state machine that tells a drag from a tap), and the act of building. None of it knows about the
// screen or the scene: places, costs and states go in, and answers and actions come out. See ../tests/build.tests.js.

// Whether a tower that costs `cost` can be built in a cell: the rules of placement, and then the money. The
// answer is { ok, reason } as in canBuild, with a reason that is a sentence.
function checkBuild(grid, col, row, taken, gold, cost) {
  const placement = canBuild(grid, col, row, taken);
  if (!placement.ok) return placement;
  if (gold < cost) return { ok: false, reason: `that costs ${cost}, and there is ${Math.floor(gold)}` };
  return { ok: true, reason: "" };
}

// Builds a tower, if it can be built: takes the money, makes the tower with `make(kind, col, row)` and adds it to
// `state.towers`. `state` is { grid, towers, wallet }, and each of the towers is anything with a `col` and a `row`.
// It gives back { ok, reason, tower }; if it did not build, there is no tower and nothing has been paid.
function tryBuild(state, kind, col, row, make, benders = BENDERS) {
  const cost = benders[kind].cost;
  const check = checkBuild(state.grid, col, row, state.towers, state.wallet.gold, cost);
  if (!check.ok) return { ...check, tower: null };
  state.wallet.spend(cost);
  const tower = make(kind, col, row);
  state.towers.push(tower);
  return { ok: true, reason: "", tower };
}

// How a podium is picked up. A press on the tray, and then either the finger moves a good way (a drag, and the
// podium goes where the finger is let go), or it doesn't (a tap, and the podium is *armed*: the next tap on the
// board puts it down). That is two ways to do one thing, and it is why it works with a mouse, a finger, and a
// finger that would rather not hold on.
//
//   idle --press--> pressing --move far--> dragging --release--> idle (placed, or not)
//                      '--release near--> armed --tap on board--> idle (placed) or armed (refused)
//   armed or dragging --cancel--> idle
class Builder {
  constructor(tapDistance = POINTER.tapDistance) {
    this.tapDistance = tapDistance;
    this.state = "idle";
    this.kind = null;
    this.start = null;
  }

  // The kind that is to be shown on the board, if any: one that is being dragged, or armed.
  get holding() {
    return this.state === "dragging" || this.state === "armed" ? this.kind : null;
  }

  // The pointer goes down on the tray, on the button for `kind`.
  press(kind, x, y) {
    this.state = "pressing";
    this.kind = kind;
    this.start = { x, y };
  }

  // The pointer moves. A press that moves far enough is a drag.
  move(x, y) {
    if (this.state === "pressing" && Math.hypot(x - this.start.x, y - this.start.y) > this.tapDistance) this.state = "dragging";
  }

  // The pointer is let go. `cell` is the cell it is over, or null, and `ok` whether a tower can go there. It says what
  // to do: "place", "arm" (it was a tap), or "cancel".
  release(cell, ok) {
    if (this.state === "pressing") {
      this.state = "armed";
      return "arm";
    }
    if (this.state === "dragging") {
      const place = !!cell && ok;
      this.cancel();
      return place ? "place" : "cancel";
    }
    return "cancel";
  }

  // A tap on the board while a podium is armed. A refusal leaves it armed, to try somewhere else.
  tap(cell, ok) {
    if (this.state !== "armed" || !cell) return "ignore";
    if (!ok) return "refuse";
    this.cancel();
    return "place";
  }

  // Puts the podium down, unused.
  cancel() {
    this.state = "idle";
    this.kind = null;
    this.start = null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { checkBuild, tryBuild, Builder };
} else {
  Object.assign(window, { checkBuild, tryBuild, Builder });
}
```

Things to notice:

- **`checkBuild` is `canBuild` and then the money.** The placement rules (is it on the board, is it road, is there a tower in it) come first, because they can't be put right and the gold can: a podium on the road is *"that is road"* however much gold there is. The answer is `{ ok, reason }`, as it was in Step 2 of the last tutorial, and the reason for too little gold says what it costs and what there is: *that costs 175, and there is 60*.
- **`tryBuild` does it:** checks, takes the money, makes the tower and keeps it. The tower is made by a function it is given (`make`), not by `tryBuild`: a test gives it a function that makes a line of data, and the game gives it one that makes a `Tower` out of models. **It does not make a tower it isn't going to keep**, and a test says so with a counter.
- **A state machine for a drag and a tap.** Dragging a podium and tapping one are two ways to start the same job, and they start the same way: a press on a button. What happens next says which it was. If the pointer moves a good way before it is let go, it was a **drag**, and the podium goes where it is let go. If it doesn't, it was a **tap**: the podium is **armed**, and the next tap on the board puts it down. The drawing in the comment above the class is the whole machine, and the tests walk every line of it.
- **The distance is from where the press began,** not how far the last move went. A finger that moves a pixel at a time for a long way is still dragging, and the test "it is how far from where it began that counts" does that.
- **A refusal doesn't cancel an armed podium.** A tap on the road is refused (with a reason), and the podium stays armed, so you can try again somewhere else. Only a press on its own button, or Escape, puts it down.
- **`holding` is what the screen is to show:** a podium that is being dragged or is armed, and not one that has only been pressed (it might yet be a tap).

Open the placeholder `tests/build.tests.js` and replace its contents with:

```js
QUnit.module("checkBuild", () => {
  const grid = parseMap({ name: "test", rows: ["S##..", "..#..", "..#.G"] });

  QUnit.test("grass, with enough gold, is fine", (assert) => {
    assert.deepEqual(checkBuild(grid, 0, 1, [], 100, 100), { ok: true, reason: "" });
  });

  QUnit.test("the rules of placement come first, and give their own reasons", (assert) => {
    assert.deepEqual(checkBuild(grid, 2, 1, [], 1000, 100), canBuild(grid, 2, 1, []));
    assert.deepEqual(checkBuild(grid, 9, 9, [], 1000, 100), canBuild(grid, 9, 9, []));
    assert.deepEqual(checkBuild(grid, 0, 1, [{ col: 0, row: 1 }], 1000, 100), canBuild(grid, 0, 1, [{ col: 0, row: 1 }]));
  });

  QUnit.test("too little gold is a reason, and says what it costs and what there is", (assert) => {
    const check = checkBuild(grid, 0, 1, [], 60, 100);

    assert.false(check.ok);
    assert.true(check.reason.includes("100") && check.reason.includes("60"), check.reason);
  });

  QUnit.test("exactly enough is enough", (assert) => {
    assert.true(checkBuild(grid, 0, 1, [], 100, 100).ok);
  });

  QUnit.test("the gold shown in the reason is whole gold, like the screen", (assert) => {
    assert.true(checkBuild(grid, 0, 1, [], 59.9, 100).reason.endsWith("there is 59"));
  });

  QUnit.test("on a road, with no gold, the road is the reason, since it is the one that cannot be put right", (assert) => {
    assert.strictEqual(checkBuild(grid, 2, 1, [], 0, 100).reason, "that is road");
  });
});

QUnit.module("tryBuild", () => {
  const make = (kind, col, row) => ({ kind, col, row });
  const fresh = (gold = 400) => ({ grid: parseMap({ name: "test", rows: ["S##..", "..#..", "..#.G"] }), towers: [], wallet: new Wallet(gold) });

  QUnit.test("builds the tower: pays, makes it and keeps it", (assert) => {
    const state = fresh();
    const result = tryBuild(state, "air", 0, 1, make);

    assert.true(result.ok);
    assert.deepEqual(result.tower, { kind: "air", col: 0, row: 1 });
    assert.deepEqual(state.towers, [result.tower]);
    assert.strictEqual(state.wallet.gold, 400 - BENDERS.air.cost);
  });

  QUnit.test("on a road it does not build, or pay, and says why", (assert) => {
    const state = fresh();
    const result = tryBuild(state, "air", 2, 1, make);

    assert.false(result.ok);
    assert.strictEqual(result.tower, null);
    assert.strictEqual(result.reason, "that is road");
    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
  });

  QUnit.test("with too little gold it does not build, or pay", (assert) => {
    const state = fresh(BENDERS.fire.cost - 1);
    const result = tryBuild(state, "fire", 0, 1, make);

    assert.false(result.ok);
    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, BENDERS.fire.cost - 1);
  });

  QUnit.test("it does not make a tower it is not going to keep", (assert) => {
    let made = 0;
    tryBuild(fresh(0), "air", 0, 1, () => made++);
    tryBuild(fresh(), "air", 2, 1, () => made++);

    assert.strictEqual(made, 0);
  });

  QUnit.test("a second tower in the same cell is refused, and the first is kept", (assert) => {
    const state = fresh();
    tryBuild(state, "air", 0, 1, make);
    const second = tryBuild(state, "water", 0, 1, make);

    assert.false(second.ok);
    assert.strictEqual(state.towers.length, 1);
    assert.strictEqual(state.towers[0].kind, "air");
    assert.strictEqual(state.wallet.gold, 400 - BENDERS.air.cost);
  });

  QUnit.test("gold runs out: with 400, the first towers are built and then there is not enough", (assert) => {
    const state = fresh(400);
    const results = [];
    for (const [kind, col, row] of [["fire", 0, 1], ["fire", 1, 1], ["fire", 3, 0]]) results.push(tryBuild(state, kind, col, row, make).ok);

    assert.deepEqual(results, [true, true, false]);
    assert.strictEqual(state.wallet.gold, 400 - 2 * BENDERS.fire.cost);
  });
});

QUnit.module("Builder", () => {
  QUnit.test("begins idle, holding nothing", (assert) => {
    const builder = new Builder();

    assert.strictEqual(builder.state, "idle");
    assert.strictEqual(builder.holding, null);
  });

  QUnit.test("pressing a button is not yet holding anything: it might be a tap", (assert) => {
    const builder = new Builder();
    builder.press("air", 100, 100);

    assert.strictEqual(builder.state, "pressing");
    assert.strictEqual(builder.kind, "air");
    assert.strictEqual(builder.holding, null);
  });

  QUnit.test("moving a little is still pressing; moving a good way is dragging, and holds the podium", (assert) => {
    const builder = new Builder(10);
    builder.press("air", 100, 100);
    builder.move(104, 103);
    assert.strictEqual(builder.state, "pressing");
    builder.move(100, 120);

    assert.strictEqual(builder.state, "dragging");
    assert.strictEqual(builder.holding, "air");
  });

  QUnit.test("it is how far from where it began that counts, and not how far in one move", (assert) => {
    const builder = new Builder(10);
    builder.press("air", 0, 0);
    for (let x = 1; x <= 12; x++) builder.move(x, 0);

    assert.strictEqual(builder.state, "dragging");
  });

  QUnit.test("letting go after a drag, over a cell where a tower can go, places it", (assert) => {
    const builder = new Builder(10);
    builder.press("fire", 0, 0);
    builder.move(50, 50);

    assert.strictEqual(builder.release({ col: 3, row: 3 }, true), "place");
    assert.strictEqual(builder.state, "idle");
    assert.strictEqual(builder.kind, null);
  });

  QUnit.test("letting go after a drag over a cell where one can't go, or over no cell, cancels", (assert) => {
    for (const [cell, ok] of [[{ col: 1, row: 1 }, false], [null, false], [null, true]]) {
      const builder = new Builder(10);
      builder.press("fire", 0, 0);
      builder.move(50, 50);

      assert.strictEqual(builder.release(cell, ok), "cancel", JSON.stringify([cell, ok]));
      assert.strictEqual(builder.state, "idle");
    }
  });

  QUnit.test("letting go without moving far is a tap, and arms the podium", (assert) => {
    const builder = new Builder(10);
    builder.press("water", 5, 5);
    builder.move(7, 6);

    assert.strictEqual(builder.release(null, false), "arm");
    assert.strictEqual(builder.state, "armed");
    assert.strictEqual(builder.holding, "water");
  });

  QUnit.test("a tap on the board puts an armed podium down where it can go", (assert) => {
    const builder = new Builder();
    builder.press("water", 5, 5);
    builder.release(null, false);

    assert.strictEqual(builder.tap({ col: 2, row: 2 }, true), "place");
    assert.strictEqual(builder.state, "idle");
  });

  QUnit.test("a tap where it can't go is refused, and the podium stays armed to try again", (assert) => {
    const builder = new Builder();
    builder.press("water", 5, 5);
    builder.release(null, false);

    assert.strictEqual(builder.tap({ col: 2, row: 2 }, false), "refuse");
    assert.strictEqual(builder.state, "armed");
    assert.strictEqual(builder.tap({ col: 4, row: 4 }, true), "place");
  });

  QUnit.test("a tap off the board is ignored", (assert) => {
    const builder = new Builder();
    builder.press("water", 5, 5);
    builder.release(null, false);

    assert.strictEqual(builder.tap(null, false), "ignore");
    assert.strictEqual(builder.state, "armed");
  });

  QUnit.test("a tap with nothing armed is ignored", (assert) => {
    assert.strictEqual(new Builder().tap({ col: 1, row: 1 }, true), "ignore");
  });

  QUnit.test("cancel puts the podium down from any state", (assert) => {
    for (const setup of [(b) => b.press("air", 0, 0), (b) => { b.press("air", 0, 0); b.move(99, 99); }, (b) => { b.press("air", 0, 0); b.release(null, false); }]) {
      const builder = new Builder();
      setup(builder);
      builder.cancel();

      assert.strictEqual(builder.state, "idle");
      assert.strictEqual(builder.holding, null);
    }
  });

  QUnit.test("a release with nothing held cancels, and does no harm", (assert) => {
    const builder = new Builder();

    assert.strictEqual(builder.release({ col: 1, row: 1 }, true), "cancel");
    assert.strictEqual(builder.state, "idle");
  });

  QUnit.test("the distance for a tap is in the POINTER table, and is used if none is given", (assert) => {
    assert.strictEqual(new Builder().tapDistance, POINTER.tapDistance);
  });
});
```

- **`tryBuild`'s tests use a `make` that makes a line of data,** so they say what is built, what is paid, and what is left alone, with no models.
- **"Gold runs out"** builds three towers of 175 from 400: yes, yes, no, and the gold that is left is what it should be.
- **The `Builder` tests go through each arrow of the diagram:** press, small move, big move, release over a good cell, release over a bad one, release over no cell, tap, refused tap, ignored tap, and cancel from each state.

**Check:** open `tests.html`. 421 tests pass.

---

## Step 4: The outline

Something has to be *drawn* on the board while a podium is held: an outline round the cell that is red or green, and a ring that shows how far the tower will shoot. How the colors fade is arithmetic and is tested; how they are drawn is a flat square with a picture on it.

Open the placeholder `js/outline.js` and replace its contents with:

```js
// What is drawn on the board while a podium is held: an outline round the cell it is over, which is
// green where a tower can be built and red where it can't and fades from one to the other, and a ring on the
// ground that shows how far the tower can shoot. The colors and how they fade are plain numbers, apart from
// the drawing, so that they can be tested. See ../tests/outline.tests.js.

const OUTLINE = {
  ok: "#3fd16b", // green: a tower can be built here
  bad: "#e5483a", // red: it can't
  fade: 9, // how quickly it changes color: bigger is quicker (it is the rate of an exponential approach, a second at a time)
  size: 0.94, // how big the outline is, as a share of a cell
  height: 0.06, // how far above the ground it is, so that it isn't lost in the grass
};

// A color as a list of three numbers from 0 to 1: red, green and blue.
function parseColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// One step from a color towards another: each of the three goes `step` of the way (a number from 0 to 1) there.
// Always a share of what is left, so it slows down as it arrives and does not overshoot.
function fadeColor(current, target, step) {
  const s = Math.min(1, Math.max(0, step));
  return current.map((value, i) => value + (target[i] - value) * s);
}

// The color the outline is on its way to.
function outlineTarget(ok) {
  return parseColor(ok ? OUTLINE.ok : OUTLINE.bad);
}

// A picture of a rounded square, to lay on the ground: a thick white edge, and a faint white inside it. It
// is white, so that the material can make it any color.
function makeOutlineTexture(scene) {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("outline", { width: size, height: size }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.clearRect(0, 0, size, size);
  const edge = 14;
  const radius = 34;
  const path = (inset) => {
    const a = inset;
    const b = size - inset;
    context.beginPath();
    context.moveTo(a + radius, a);
    context.arcTo(b, a, b, b, radius);
    context.arcTo(b, b, a, b, radius);
    context.arcTo(a, b, a, a, radius);
    context.arcTo(a, a, b, a, radius);
    context.closePath();
  };
  path(edge / 2);
  context.fillStyle = "rgba(255,255,255,0.22)";
  context.fill();
  context.lineWidth = edge;
  context.strokeStyle = "rgba(255,255,255,0.95)";
  context.stroke();
  texture.update();
  return texture;
}

// A picture of a ring with a faint inside, for the range.
function makeRingTexture(scene) {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("range", { width: size, height: size }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.clearRect(0, 0, size, size);
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  context.fillStyle = "rgba(255,255,255,0.14)";
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = "rgba(255,255,255,0.8)";
  context.stroke();
  texture.update();
  return texture;
}

// A flat square on the ground that shows a shape, in any color. The picture is only the shape (its see-through-ness: the
// opacity texture); the color is the material's emissive color, which is lit by nothing, so it can be changed in a moment.
function makeFlat(scene, name, texture, width, height) {
  const mesh = BABYLON.MeshBuilder.CreateGround(name, { width, height }, scene);
  const material = new BABYLON.StandardMaterial(name, scene);
  material.disableLighting = true;
  material.diffuseColor = BABYLON.Color3.Black();
  material.opacityTexture = texture;
  material.backFaceCulling = false;
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return mesh;
}

class Outline {
  constructor(scene, board = BOARD) {
    this.board = board;
    this.mesh = makeFlat(scene, "outline", makeOutlineTexture(scene), board.cell * OUTLINE.size, board.cell * OUTLINE.size);
    this.color = outlineTarget(false);
    this.target = this.color;
    this.apply();
  }

  get visible() {
    return this.mesh.isEnabled();
  }

  // Puts the outline round a cell, and says whether a tower can be built there: it fades to the color for that.
  show(col, row, ok) {
    const { x, z } = cellCenter(col, row, this.board);
    this.mesh.position.set(x, OUTLINE.height, z);
    this.target = outlineTarget(ok);
    this.mesh.setEnabled(true);
  }

  hide() {
    this.mesh.setEnabled(false);
  }

  // Fades towards the color it should be, for `dt` seconds.
  update(dt) {
    this.color = fadeColor(this.color, this.target, 1 - Math.exp(-OUTLINE.fade * dt));
    this.apply();
  }

  apply() {
    this.mesh.material.emissiveColor = new BABYLON.Color3(...this.color);
  }
}

// The ring of how far a tower can shoot: a flat disc that is twice the range across.
class RangeRing {
  constructor(scene) {
    this.mesh = makeFlat(scene, "range", makeRingTexture(scene), 2, 2);
  }

  get visible() {
    return this.mesh.isEnabled();
  }

  show(x, z, range, color) {
    this.mesh.position.set(x, OUTLINE.height / 2, z);
    this.mesh.scaling.set(range, 1, range);
    this.mesh.material.emissiveColor = BABYLON.Color3.FromHexString(color);
    this.mesh.setEnabled(true);
  }

  hide() {
    this.mesh.setEnabled(false);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { OUTLINE, parseColor, fadeColor, outlineTarget, Outline, RangeRing };
} else {
  Object.assign(window, { OUTLINE, parseColor, fadeColor, outlineTarget, Outline, RangeRing });
}
```

Things to notice:

- **A color is three numbers from 0 to 1,** and `fadeColor` takes each of the three a share of the way to the target. A share **of what is left**, not a fixed step: that makes the change fast at first and slow as it arrives, and it **never goes past**. A step bigger than 1 would overshoot, so it is held between 0 and 1.
- **The fade is `1 - Math.exp(-OUTLINE.fade * dt)`,** and that matters. If the share were a constant (say 0.1 a frame) then a fast computer would fade faster than a slow one, because it has more frames. An exponential in the *time* a frame took gives the same fade in a second at any frame rate, which a test checks by fading for one sixtieth of a second six times against one hundred-and-twentieth twelve times.
- **The drawing is a shape and a color, kept apart.** The picture (`makeOutlineTexture`) is a rounded square, drawn on a canvas with white edges and a faint white inside, and it is used for its *see-through-ness* (the `opacityTexture`). The **color** is the material's `emissiveColor`, which no light changes: so changing the color of the outline is changing three numbers, and nothing is drawn again. (My first try used the picture as an emissive texture too, and it came out white whatever the color was: a texture's color wins over the material's. The shape and the color have to come from different places.)
- **`Outline.show(col, row, ok)` puts it round a cell, and says what color to go to.** It doesn't change the color: it sets the *target*, and `update(dt)` moves the color towards it, a frame at a time. So dragging from road to grass is a fade from red to green over about a third of a second, and not a flick.
- **`RangeRing` is a flat disc as wide as twice the range** (the ground it is drawn on is 2 across and is scaled by the range), tinted in the nation's color.
- **Both are `isPickable = false`,** so they never catch a click meant for the board.

Open the placeholder `tests/outline.tests.js` and replace its contents with:

```js
QUnit.module("colors", () => {
  QUnit.test("parseColor turns a hex color into three numbers from 0 to 1", (assert) => {
    assert.deepEqual(parseColor("#000000"), [0, 0, 0]);
    assert.deepEqual(parseColor("#ffffff"), [1, 1, 1]);
    assert.deepEqual(parseColor("#ff0000"), [1, 0, 0]);
    assert.true(Math.abs(parseColor("#336699")[1] - 0x66 / 255) < 1e-12);
  });

  QUnit.test("the outline is green where a tower can go and red where it can't, and they are not alike", (assert) => {
    const [r1, g1] = outlineTarget(true);
    const [r2, g2] = outlineTarget(false);

    assert.true(g1 > r1, "green is mostly green");
    assert.true(r2 > g2, "red is mostly red");
  });

  QUnit.test("fadeColor goes the share of the way asked, on each of the three", (assert) => {
    assert.deepEqual(fadeColor([0, 0, 0], [1, 0.5, 0.2], 0.5), [0.5, 0.25, 0.1]);
  });

  QUnit.test("a step of none stays, and a step of one arrives", (assert) => {
    assert.deepEqual(fadeColor([0.2, 0.3, 0.4], [1, 1, 1], 0), [0.2, 0.3, 0.4]);
    assert.deepEqual(fadeColor([0.2, 0.3, 0.4], [1, 0, 1], 1), [1, 0, 1]);
  });

  QUnit.test("a step bigger than one, or less than none, cannot go past", (assert) => {
    assert.deepEqual(fadeColor([0, 0, 0], [1, 1, 1], 5), [1, 1, 1]);
    assert.deepEqual(fadeColor([0.5, 0.5, 0.5], [1, 1, 1], -3), [0.5, 0.5, 0.5]);
  });

  QUnit.test("it does not change the color it is given", (assert) => {
    const from = [0, 0, 0];
    fadeColor(from, [1, 1, 1], 0.5);

    assert.deepEqual(from, [0, 0, 0]);
  });

  QUnit.test("again and again, it gets as near as you like, and never past", (assert) => {
    let color = outlineTarget(false);
    const target = outlineTarget(true);
    for (let i = 0; i < 40; i++) {
      color = fadeColor(color, target, 0.3);

      assert.true(color.every((value, j) => Math.abs(value - target[j]) <= Math.abs(outlineTarget(false)[j] - target[j]) + 1e-12));
    }
    assert.true(color.every((value, j) => Math.abs(value - target[j]) < 1e-5));
  });
});

QUnit.module("Outline and RangeRing", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  const colorOf = (outline) => outline.mesh.material.emissiveColor.asArray();

  QUnit.test("an outline is hidden to begin with, and flat", (assert) => {
    const outline = new Outline(scene);

    assert.false(outline.visible);
    assert.true(outline.mesh.getBoundingInfo().boundingBox.extendSize.y < 1e-6);
  });

  QUnit.test("show puts it round a cell, a hair above the ground, and makes it visible", (assert) => {
    const outline = new Outline(scene);
    outline.show(4, 3, true);
    const { x, z } = cellCenter(4, 3);

    assert.true(outline.visible);
    assert.strictEqual(outline.mesh.position.x, x);
    assert.strictEqual(outline.mesh.position.z, z);
    assert.strictEqual(outline.mesh.position.y, OUTLINE.height);
  });

  QUnit.test("it is a little smaller than a cell, so that two side by side don't touch", (assert) => {
    const outline = new Outline(scene);
    const { extendSize } = outline.mesh.getBoundingInfo().boundingBox;

    assert.true(Math.abs(extendSize.x * 2 - BOARD.cell * OUTLINE.size) < 1e-9);
    assert.true(OUTLINE.size < 1);
  });

  QUnit.test("hide takes it away", (assert) => {
    const outline = new Outline(scene);
    outline.show(1, 1, true);
    outline.hide();

    assert.false(outline.visible);
  });

  QUnit.test("it begins red, and when shown over a cell that is fine it fades to green, not at once", (assert) => {
    const outline = new Outline(scene);
    outline.show(1, 1, true);
    const before = colorOf(outline);
    outline.update(0.05);
    const during = colorOf(outline);

    assert.true(during[1] > before[1], "greener");
    assert.true(during[0] < before[0], "less red");
    assert.true(during[1] < outlineTarget(true)[1] - 0.01, "and not green yet");
  });

  QUnit.test("given long enough it is the green, and then if the cell is not fine it fades back to the red", (assert) => {
    const outline = new Outline(scene);
    outline.show(1, 1, true);
    for (let i = 0; i < 60; i++) outline.update(0.05);
    assert.true(colorOf(outline).every((v, i) => Math.abs(v - outlineTarget(true)[i]) < 1e-3), "green");
    outline.show(1, 1, false);
    for (let i = 0; i < 60; i++) outline.update(0.05);

    assert.true(colorOf(outline).every((v, i) => Math.abs(v - outlineTarget(false)[i]) < 1e-3), "red");
  });

  QUnit.test("it fades at the same pace on a slow computer and a fast one", (assert) => {
    const slow = new Outline(scene);
    const fast = new Outline(scene);
    slow.show(0, 0, true);
    fast.show(0, 0, true);
    for (let i = 0; i < 6; i++) slow.update(1 / 60);
    for (let i = 0; i < 12; i++) fast.update(1 / 120);

    assert.true(colorOf(slow).every((v, i) => Math.abs(v - colorOf(fast)[i]) < 1e-9));
  });

  QUnit.test("a ring is hidden, then shown on the ground, as wide as twice the range", (assert) => {
    const ring = new RangeRing(scene);
    assert.false(ring.visible);
    ring.show(3, -2, 5, "#38b6ff");
    const { extendSize } = ring.mesh.getBoundingInfo().boundingBox;

    assert.true(ring.visible);
    assert.strictEqual(ring.mesh.position.x, 3);
    assert.strictEqual(ring.mesh.position.z, -2);
    assert.true(Math.abs(extendSize.x * ring.mesh.scaling.x * 2 - 10) < 1e-9, "ten across for a range of five");
    assert.strictEqual(ring.mesh.material.emissiveColor.toHexString().toLowerCase(), "#38b6ff");
    ring.hide();
    assert.false(ring.visible);
  });

  QUnit.test("neither can be picked, so neither catches a click meant for the board", (assert) => {
    assert.false(new Outline(scene).mesh.isPickable);
    assert.false(new RangeRing(scene).mesh.isPickable);
  });
});
```

- **"Again and again, it gets as near as you like, and never past"** fades forty times and checks that no channel is ever further from the target than where it began.
- **"It fades at the same pace on a slow computer and a fast one"** is the test of the exponential.
- **The `Outline` tests make a real one** in a scene that draws nothing, and look at the numbers of its material, which is all there is to see.

**Check:** open `tests.html`. 437 tests pass.

---

## Step 5: The tray

The buttons, the gold and the message. The page is the tray's, and the tray is a list of benders made into buttons: no game in it. Its look comes first, because it changes how the page is laid out.

Open the placeholder `css/tray.css` and replace its contents with:

```css
/* The tray at the bottom, where podiums are picked up, and the gold and the message that go with it. The tray is
   under the board, not over it: the canvas is made shorter by the height of the tray, and the camera fits the
   board into what is left, so that nothing is ever hidden by a button. */
:root {
  --tray-height: 100px;
}
#renderCanvas {
  height: calc(100% - var(--tray-height));
}

#tray {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 12;
  height: var(--tray-height);
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(to bottom, var(--parchment), var(--parchment-dark));
  border-top: 4px solid var(--ink);
  box-shadow: 0 -6px 18px rgba(20, 40, 70, 0.3);
}

/* One podium to pick up: the color of its nation, its name, and what it costs. */
#tray .podium {
  flex: 0 1 150px;
  min-width: 0;
  display: grid;
  grid-template-rows: 8px 1fr auto;
  justify-items: center;
  align-items: center;
  padding: 0 8px 6px;
  overflow: hidden;
  background: #fff7e0;
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 10px;
  cursor: grab;
  touch-action: none; /* a finger that starts on a button is for dragging it, not for scrolling the page */
  transition: transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease;
}
#tray .podium:hover {
  transform: translateY(-3px);
}
#tray .podium .swatch {
  align-self: stretch;
  margin: 0 -8px;
  background: var(--nation);
}
#tray .podium .name {
  font: 700 clamp(12px, 2.6vw, 17px) / 1.1 var(--title-font);
  text-align: center;
}
#tray .podium .cost {
  display: flex;
  align-items: center;
  gap: 5px;
  font: 700 clamp(13px, 2.8vw, 18px) / 1 var(--small-font);
}
#tray .podium .cost::before,
#gold .coin {
  content: "";
  display: inline-block;
  width: 0.9em;
  height: 0.9em;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff2b0, var(--gold) 60%, #a8740c);
  border: 2px solid var(--ink);
  box-sizing: border-box;
}

/* Too little gold: the button is faded and its price is red. It can still be pressed, and says why not. */
#tray .podium.poor {
  opacity: 0.55;
}
#tray .podium.poor .cost {
  color: var(--banner);
}

/* The podium that is in the hand (armed, or being dragged). */
#tray .podium.held {
  transform: translateY(-5px);
  box-shadow: 0 0 0 4px var(--nation), 0 6px 14px rgba(20, 40, 70, 0.4);
}

/* Gold, at the top, in the middle. */
#gold {
  position: fixed;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: var(--parchment);
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 999px;
  font: 700 22px / 1 var(--title-font);
  pointer-events: none;
}

/* Why a tower can't go there: a line above the tray, only while there is something to say. */
#message {
  position: fixed;
  left: 50%;
  bottom: calc(var(--tray-height) + 10px);
  transform: translateX(-50%);
  z-index: 12;
  max-width: calc(100vw - 24px);
  padding: 6px 14px;
  background: var(--banner);
  color: #fff;
  border: 3px solid var(--ink);
  border-radius: 8px;
  font: 700 16px / 1.2 var(--small-font);
  text-align: center;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;
}
#message.shown {
  opacity: 1;
}

/* A small screen: a phone, or a window made small. */
@media (max-width: 640px), (max-height: 520px) {
  :root {
    --tray-height: 78px;
  }
  #tray {
    gap: 6px;
    padding: 6px 8px;
  }
  #tray .podium {
    padding: 0 4px 4px;
    border-width: 2px;
  }
  #gold {
    top: 8px;
    padding: 4px 12px;
    font-size: 18px;
  }
}
```

Things to notice:

- **The tray is under the board, not over it.** The canvas is made shorter by the height of the tray (`height: calc(100% - var(--tray-height))`), and the camera, which is given the canvas's shape, fits the board into what is left. So no button ever hides a cell. A tray that floated over the bottom of the canvas would hide the front row on a phone held sideways.
- **`touch-action: none` on a button.** Without it a finger that starts on a button and moves is a *scroll*, and the browser takes it over (and the game is sent a `pointercancel`). With it, the finger is the game's.
- **`.poor` is a faded button with a red price.** It is still a button that can be pressed; the game says why not.
- **`.held` lifts the button and rings it in the color of its nation,** so you can see which podium is in your hand, and (with a podium armed) which one to press to put it down.
- **The coin is a `::before` with a gradient,** a circle with a highlight, and it is used in the tray and in the gold. There is no picture of a coin.
- **The message line sits just above the tray** and fades in and out. It is empty most of the time.
- **A media query makes the tray smaller on a phone,** and a variable (`--tray-height`) is what makes the canvas follow.

Now the tray itself. Open the placeholder `js/tray.js` and replace its contents with:

```js
// The tray at the bottom of the screen, where podiums are picked up, and the readouts that go with it: how
// much gold there is, and a line that says why a tower can't be built. It is made from a page and a list of
// benders, with no game in it: it says when a button is pressed, and is told what to show. See ../tests/tray.tests.js.

// The order of the buttons.
const TRAY_ORDER = ["air", "water", "earth", "fire"];

// A page element with a class and some text.
function element(document, tag, className, text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

class Tray {
  // `parts` is { tray, gold, message }: the three elements of the page that this fills in.
  constructor(parts, document, benders = BENDERS, order = TRAY_ORDER) {
    this.parts = parts;
    this.benders = benders;
    this.buttons = {};
    this.pressed = [];
    for (const kind of order) {
      const spec = benders[kind];
      const button = element(document, "button", "podium");
      button.type = "button";
      button.dataset.kind = kind;
      button.style.setProperty("--nation", spec.color);
      button.setAttribute("aria-label", `${spec.name}, ${spec.cost} gold`);
      button.append(element(document, "span", "swatch"), element(document, "span", "name", spec.name), element(document, "span", "cost", String(spec.cost)));
      // A press is passed on, with where it was: the game decides if it is a drag or a tap.
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        for (const listener of this.pressed) listener(kind, { x: event.clientX, y: event.clientY, pointerType: event.pointerType });
      });
      parts.tray.append(button);
      this.buttons[kind] = button;
    }
  }

  // Asks to be told when a button is pressed: listener(kind, { x, y, pointerType }).
  onPress(listener) {
    this.pressed.push(listener);
  }

  // Shows how much gold there is, and which podiums there is too little for: a button that costs more than
  // there is looks greyed out (it still works, and says why not when it is tried).
  update(gold) {
    this.parts.gold.textContent = String(Math.floor(gold));
    for (const [kind, button] of Object.entries(this.buttons)) button.classList.toggle("poor", gold < this.benders[kind].cost);
  }

  // Marks the button of the podium that is armed or held, and unmarks the rest. `null` for none.
  hold(kind) {
    for (const [name, button] of Object.entries(this.buttons)) button.classList.toggle("held", name === kind);
  }

  // Says something on the line above the tray, such as why a tower can't be built. An empty sentence clears it.
  say(sentence) {
    this.parts.message.textContent = sentence;
    this.parts.message.classList.toggle("shown", sentence.length > 0);
  }

  // The tray's box on the page.
  get rect() {
    return this.parts.tray.getBoundingClientRect();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TRAY_ORDER, element, Tray };
} else {
  Object.assign(window, { TRAY_ORDER, element, Tray });
}
```

- **A tray is made from a page and a table.** It is given three elements (the places for the buttons, the gold and the message) and the benders, and it makes a button for each, in the order `TRAY_ORDER` says. It has no idea what a podium *does*.
- **`element` makes a node with a class and some text,** so that making a button is a few lines and not a page of `createElement`.
- **The colour of each nation is a custom property on its button** (`--nation`), and the stylesheet uses it for the swatch and for the ring of a button that is held. The nations' colors are written once, in the table.
- **A button is a real `<button>`,** with a name a screen reader can read (`aria-label`), so it can be reached with a keyboard.
- **A press is passed on with where it was.** `pointerdown` is a *pointer* event, which a mouse, a finger and a pen all send; `preventDefault` stops the browser from selecting text or starting a drag-and-drop of its own. The tray says *"a button was pressed here"*; whether that is the start of a drag is not its business.
- **`update(gold)` shows the gold and fades the buttons that cost more than there is.** `hold(kind)` marks the one that is in the hand. `say(sentence)` fills the message line, and an empty sentence hides it.

Open the placeholder `tests/tray.tests.js` and replace its contents with:

```js
QUnit.module("a Tray", (hooks) => {
  let parts, tray;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    parts = { tray: document.createElement("div"), gold: document.createElement("span"), message: document.createElement("div") };
    fixture.append(parts.tray, parts.gold, parts.message);
    tray = new Tray(parts, document);
  });

  const press = (button, x = 10, y = 20, pointerType = "mouse") => button.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, clientY: y, pointerType, bubbles: true, cancelable: true }));

  QUnit.test("element makes a node with a class and some text", (assert) => {
    const node = element(document, "span", "name", "hello");

    assert.strictEqual(node.tagName, "SPAN");
    assert.strictEqual(node.className, "name");
    assert.strictEqual(node.textContent, "hello");
  });

  QUnit.test("there is a button for every kind, in the order of the tray", (assert) => {
    assert.deepEqual([...parts.tray.children].map((button) => button.dataset.kind), TRAY_ORDER);
    assert.deepEqual(TRAY_ORDER.slice().sort(), Object.keys(BENDERS).sort());
  });

  QUnit.test("each button shows the name and the price, and is a real button that can be reached with a keyboard", (assert) => {
    for (const kind of TRAY_ORDER) {
      const button = tray.buttons[kind];

      assert.strictEqual(button.tagName, "BUTTON");
      assert.strictEqual(button.type, "button");
      assert.strictEqual(button.querySelector(".name").textContent, BENDERS[kind].name);
      assert.strictEqual(button.querySelector(".cost").textContent, String(BENDERS[kind].cost));
      assert.true(button.getAttribute("aria-label").includes(String(BENDERS[kind].cost)), kind);
    }
  });

  QUnit.test("each button has the color of its nation", (assert) => {
    for (const kind of TRAY_ORDER) assert.strictEqual(tray.buttons[kind].style.getPropertyValue("--nation"), BENDERS[kind].color, kind);
  });

  QUnit.test("pressing a button says which, and where, and what kind of pointer", (assert) => {
    const heard = [];
    tray.onPress((kind, point) => heard.push([kind, point]));
    press(tray.buttons.earth, 33, 44, "touch");

    assert.deepEqual(heard, [["earth", { x: 33, y: 44, pointerType: "touch" }]]);
  });

  QUnit.test("pressing is not a click: the browser's own handling (selecting, scrolling) is stopped", (assert) => {
    const event = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    tray.buttons.air.dispatchEvent(event);

    assert.true(event.defaultPrevented);
  });

  QUnit.test("more than one listener can listen", (assert) => {
    let count = 0;
    tray.onPress(() => count++);
    tray.onPress(() => count++);
    press(tray.buttons.fire);

    assert.strictEqual(count, 2);
  });

  QUnit.test("update shows the gold, in whole gold", (assert) => {
    tray.update(123.9);

    assert.strictEqual(parts.gold.textContent, "123");
  });

  QUnit.test("update fades the buttons that cost more than there is, and no others", (assert) => {
    tray.update(BENDERS.water.cost);
    const poor = TRAY_ORDER.filter((kind) => tray.buttons[kind].classList.contains("poor"));

    assert.deepEqual(poor.sort(), TRAY_ORDER.filter((kind) => BENDERS[kind].cost > BENDERS.water.cost).sort());
  });

  QUnit.test("with more gold they are not faded any more", (assert) => {
    tray.update(0);
    assert.true(TRAY_ORDER.every((kind) => tray.buttons[kind].classList.contains("poor")));
    tray.update(10000);

    assert.true(TRAY_ORDER.every((kind) => !tray.buttons[kind].classList.contains("poor")));
  });

  QUnit.test("a faded button still works: it is pressed, and the game says why not", (assert) => {
    let heard = 0;
    tray.onPress(() => heard++);
    tray.update(0);
    press(tray.buttons.fire);

    assert.strictEqual(heard, 1);
    assert.false(tray.buttons.fire.disabled);
  });

  QUnit.test("hold marks the button that is in the hand, and only that one, and null puts it down", (assert) => {
    tray.hold("water");
    assert.deepEqual(TRAY_ORDER.filter((kind) => tray.buttons[kind].classList.contains("held")), ["water"]);
    tray.hold("fire");
    assert.deepEqual(TRAY_ORDER.filter((kind) => tray.buttons[kind].classList.contains("held")), ["fire"]);
    tray.hold(null);

    assert.deepEqual(TRAY_ORDER.filter((kind) => tray.buttons[kind].classList.contains("held")), []);
  });

  QUnit.test("say puts a sentence on the line, and shows it, and an empty one hides it", (assert) => {
    tray.say("that is road");
    assert.strictEqual(parts.message.textContent, "that is road");
    assert.true(parts.message.classList.contains("shown"));
    tray.say("");

    assert.false(parts.message.classList.contains("shown"));
  });

  QUnit.test("it works with a tray that has fewer kinds", (assert) => {
    const box = document.createElement("div");
    const small = new Tray({ ...parts, tray: box }, document, { air: BENDERS.air }, ["air"]);

    assert.strictEqual(box.children.length, 1);
    small.update(0);
    assert.true(box.children[0].classList.contains("poor"));
  });
});
```

- **These tests use the real page** (the test page is a page, and has `document`), and put the tray's elements in `qunit-fixture`, which QUnit empties after every test.
- **They press with a real `PointerEvent`,** sent to the button, so the listener in the tray is the one that runs. (The test makes the event itself, and it is the same as the browser's.)
- **"Pressing is not a click"** checks that `defaultPrevented` is true after a press.
- **"A faded button still works"** is a decision, written as a test: a button you can't afford is *not* disabled, because pressing it is how you find out why not.

**Check:** open `tests.html`. 451 tests pass.

---

## Step 6: The hand

Everything so far is a piece. The **hand** is the part that puts them together: the tray says a button was pressed, the builder says whether it is a drag or a tap, the pointing says which cell, the rule says whether a tower can go there, and the hand shows it (an outline, a ring, a podium held over the cell) and builds the tower.

Open the placeholder `js/hand.js` and replace its contents with:

```js
// The hand: the part of the game that listens to the pointer and builds. It puts the pieces of this tutorial
// together. The tray says that a button was pressed; the builder says whether that was a drag or a tap; the pointing
// maths says which cell the pointer is over; the rules say whether a tower can go there; and the hand shows it (an
// outline that is red or green, a ring of how far the tower shoots, a podium held over the cell) and builds the
// tower. It is given everything it uses, and it is given plain events (`{ clientX, clientY, pointerType }`), not
// the browser's, so a test can press, drag and let go with no screen. See ../tests/hand.tests.js.

const HAND = {
  hover: 0.25, // how far above the ground a podium is held while it is carried, so that it looks lifted
  refusal: 1.8, // how many seconds the reason that a tower can't be built stays on the screen after a try
};

class Hand {
  // `parts`: { canvas, tray, state, outline, ring, previews, extents, make }. `canvas` has a `getBoundingClientRect()`,
  // `tray` is a Tray, `state` is { grid, towers, wallet }, `outline` and `ring` are what shows the cell and the
  // range, `previews` has a node for each kind (a podium to hold), `extents()` says what the camera shows now, and
  // `make(kind, col, row)` makes a tower.
  constructor(parts, benders = BENDERS) {
    Object.assign(this, parts);
    this.benders = benders;
    this.builder = new Builder();
    this.messageLeft = 0;
  }

  // The cell that the pointer is over, or null: the pointer has to be on the board's canvas (and not on the tray), and
  // a finger is taken to be a little above where it is, so that it doesn't cover the podium.
  cellUnder(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!isInside(rect, event.clientX, event.clientY)) return null;
    return cellAtPoint(rect, this.extents(), event.clientX, event.clientY, liftFor(event.pointerType));
  }

  // Whether the held kind can go in a cell, and if not why.
  check(kind, cell) {
    return checkBuild(this.state.grid, cell.col, cell.row, this.state.towers, this.state.wallet.gold, this.benders[kind].cost);
  }

  // Takes away what is shown on the board.
  clear() {
    this.outline.hide();
    this.ring.hide();
    for (const preview of Object.values(this.previews)) preview.node.setEnabled(false);
  }

  say(sentence, seconds) {
    this.tray.say(sentence);
    this.messageLeft = seconds;
  }

  // Shows the held podium over the cell the pointer is over, with an outline that says if a tower can go there.
  // Over nothing, nothing is shown.
  refresh(event) {
    const kind = this.builder.holding;
    const cell = kind && event ? this.cellUnder(event) : null;
    this.clear();
    if (!cell) return this.say("", 0);
    const { ok, reason } = this.check(kind, cell);
    const { x, z } = cellCenter(cell.col, cell.row);
    this.outline.show(cell.col, cell.row, ok);
    this.ring.show(x, z, this.benders[kind].range, this.benders[kind].color);
    this.previews[kind].node.position.set(x, HAND.hover, z);
    this.previews[kind].node.setEnabled(true);
    this.say(reason, Infinity);
  }

  // The pointer goes down on a button of the tray. Pressing the button of a podium that is armed puts it down again.
  press(kind, point) {
    if (this.builder.state === "armed" && this.builder.kind === kind) return this.cancel();
    this.builder.press(kind, point.x, point.y);
    this.tray.hold(kind);
    this.clear();
  }

  // The pointer moves.
  move(event) {
    this.builder.move(event.clientX, event.clientY);
    if (this.builder.holding) this.refresh(event);
  }

  // The pointer is let go, anywhere.
  release(event) {
    const kind = this.builder.kind;
    const before = this.builder.state;
    if (before === "pressing" || before === "dragging") {
      const cell = this.cellUnder(event);
      const refusal = cell ? this.check(kind, cell) : { ok: false, reason: "" };
      const action = this.builder.release(cell, refusal.ok);
      if (action === "arm") return this.refresh(null);
      this.tray.hold(null);
      if (action === "place") return this.build(kind, cell);
      this.clear();
      return this.say(refusal.reason, HAND.refusal);
    }
    if (before === "armed") {
      const cell = this.cellUnder(event);
      const refusal = cell ? this.check(kind, cell) : { ok: false, reason: "" };
      const action = this.builder.tap(cell, refusal.ok);
      if (action === "place") return this.build(kind, cell);
      if (action === "refuse") {
        this.refresh(event);
        this.say(refusal.reason, HAND.refusal);
      }
    }
  }

  // Builds the tower the hand holds, in a cell, and puts the hand down.
  build(kind, cell) {
    const result = tryBuild(this.state, kind, cell.col, cell.row, this.make, this.benders);
    this.tray.hold(null);
    this.clear();
    this.tray.update(this.state.wallet.gold);
    this.say(result.reason, HAND.refusal);
    return result;
  }

  // Puts the podium down, unused (the Escape key does this).
  cancel() {
    this.builder.cancel();
    this.tray.hold(null);
    this.clear();
    this.say("", 0);
  }

  // Every frame: the outline fades towards its color, the gold is shown, and a message that has been there long enough goes.
  update(dt) {
    this.outline.update(dt);
    this.tray.update(this.state.wallet.gold);
    if (this.messageLeft > 0 && this.messageLeft !== Infinity) {
      this.messageLeft -= dt;
      if (this.messageLeft <= 0) this.tray.say("");
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HAND, Hand };
} else {
  Object.assign(window, { HAND, Hand });
}
```

Things to notice:

- **The hand is given everything it uses,** in one object: the canvas (anything with `getBoundingClientRect`), the tray, the state (the grid, the towers and the wallet), the outline and the ring, a podium to hold for each kind, a function that says what the camera shows now, and a function that makes a tower. **It is also given plain events** (`{ clientX, clientY, pointerType }`), not the browser's. That is what lets a test press, drag and let go with no screen, no mouse and no models.
- **`cellUnder` is where the pointer is, as a cell, or nothing.** The pointer has to be on the canvas (a pointer over the tray is over no cell), and a finger is lifted.
- **`refresh` is what is shown while a podium is held.** Over a cell: the outline goes round it (red or green, from the check), the ring is drawn round it, the podium is held a little above it (`HAND.hover`), and the message line says why not, if not. Over nothing: nothing.
- **`press`, `move` and `release` are the three events.** `press` marks the button and asks the builder; `move` asks the builder (a long move makes it a drag) and refreshes; `release` is the interesting one: from a press or a drag it asks the builder what to do with the cell it is over, and from an armed podium it is a tap on the board. It reads the builder's state **before** it lets the builder change it, so the tap that *arms* a podium is not also a tap that *builds* one. (A test says so.)
- **Every way a try can end is covered:** placed (the tower is built, the gold is paid, the screen is cleared), refused over a cell (the reason stays for a moment: `HAND.refusal` seconds, and then goes), cancelled over the tray or nowhere (nothing happens), and put down (Escape).
- **`update(dt)` is every frame:** the outline fades, the gold is shown, and a message that has been up long enough goes. A message that says why a podium *can't* go over the cell it is over doesn't go: it is for as long as the pointer is there (`Infinity`).

Open the placeholder `tests/hand.tests.js` and replace its contents with:

```js
QUnit.module("the Hand", (hooks) => {
  // The page, as the hand sees it: a canvas 800 by 400 at (100, 50), and a tray below it.
  const page = { left: 100, top: 50, width: 800, height: 400, right: 900, bottom: 450 };
  const MAP = { name: "test", rows: ["S##.......", "..#.......", "..#.......", "..#......G"] };

  let engine, scene, hand, state, parts, extents, made;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    const fixture = document.getElementById("qunit-fixture");
    const els = { tray: document.createElement("div"), gold: document.createElement("span"), message: document.createElement("div") };
    fixture.append(els.tray, els.gold, els.message);
    parts = els;
    state = { grid: parseMap(MAP), towers: [], wallet: new Wallet(400) };
    const previews = {};
    for (const kind of Object.keys(BENDERS)) {
      previews[kind] = { node: new BABYLON.TransformNode(`preview ${kind}`, scene) };
      previews[kind].node.setEnabled(false);
    }
    extents = viewExtents(boardPoints(), page.width / page.height);
    made = [];
    hand = new Hand({
      canvas: { getBoundingClientRect: () => page },
      tray: new Tray(els, document),
      state,
      previews,
      outline: new Outline(scene),
      ring: new RangeRing(scene),
      extents: () => extents,
      make: (kind, col, row) => {
        made.push({ kind, col, row });
        return { kind, col, row };
      },
    });
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // Where on the page the middle of a cell is.
  const pageOf = (col, row) => {
    const { right, up } = viewAxes();
    const { x, z } = cellCenter(col, row);
    const sx = (x * right[0] + z * right[2] - extents.centerX) / extents.halfWidth;
    const sy = (x * up[0] + z * up[2] - extents.centerY) / extents.halfHeight;
    return { clientX: page.left + ((sx + 1) / 2) * page.width, clientY: page.top + ((1 - sy) / 2) * page.height, pointerType: "mouse" };
  };
  const onTray = { clientX: 500, clientY: 500, pointerType: "mouse" };
  const GRASS = [5, 1]; // a cell of grass
  const ROAD = [2, 1]; // a cell of road
  const at = ([col, row]) => pageOf(col, row);
  const drag = (kind, event) => {
    hand.press(kind, { x: onTray.clientX, y: onTray.clientY });
    hand.move({ ...event, clientX: event.clientX, clientY: event.clientY });
  };
  const held = () => Object.entries(hand.previews).filter(([, preview]) => preview.node.isEnabled()).map(([kind]) => kind);

  QUnit.test("with nothing pressed, nothing is shown, and a pointer moving about changes nothing", (assert) => {
    hand.move(at(GRASS));

    assert.false(hand.outline.visible);
    assert.false(hand.ring.visible);
    assert.deepEqual(held(), []);
  });

  QUnit.test("pressing a button marks it in the tray, and shows nothing on the board yet", (assert) => {
    hand.press("water", { x: 500, y: 500 });

    assert.true(hand.tray.buttons.water.classList.contains("held"));
    assert.false(hand.outline.visible);
  });

  QUnit.test("dragging over grass shows the podium there, with a ring of its range, and an outline that is on its way to green", (assert) => {
    drag("water", at(GRASS));
    const { x, z } = cellCenter(...GRASS);

    assert.true(hand.outline.visible);
    assert.strictEqual(hand.outline.mesh.position.x, x);
    assert.deepEqual(hand.outline.target, outlineTarget(true));
    assert.true(hand.ring.visible);
    assert.strictEqual(hand.ring.mesh.scaling.x, BENDERS.water.range);
    assert.deepEqual(held(), ["water"]);
    assert.strictEqual(hand.previews.water.node.position.x, x);
    assert.strictEqual(hand.previews.water.node.position.z, z);
    assert.strictEqual(hand.previews.water.node.position.y, HAND.hover);
    assert.strictEqual(parts.message.textContent, "");
  });

  QUnit.test("dragging over road makes the outline red, and says why", (assert) => {
    drag("air", at(ROAD));

    assert.deepEqual(hand.outline.target, outlineTarget(false));
    assert.strictEqual(parts.message.textContent, "that is road");
    assert.true(parts.message.classList.contains("shown"));
  });

  QUnit.test("dragging from road to grass turns the outline from red to green, over a moment, and takes the message away", (assert) => {
    drag("air", at(ROAD));
    for (let i = 0; i < 40; i++) hand.update(0.05);
    const red = hand.outline.mesh.material.emissiveColor.asArray();
    hand.move(at(GRASS));
    hand.update(0.05);
    const between = hand.outline.mesh.material.emissiveColor.asArray();
    for (let i = 0; i < 40; i++) hand.update(0.05);
    const green = hand.outline.mesh.material.emissiveColor.asArray();

    assert.true(red[0] > red[1], "red");
    assert.true(between[1] > red[1] && between[1] < green[1], "on its way");
    assert.true(green[1] > green[0], "green");
    assert.strictEqual(parts.message.textContent, "");
  });

  QUnit.test("a podium that costs more than there is gives a red outline, and says what it costs", (assert) => {
    state.wallet.gold = 10;
    drag("fire", at(GRASS));

    assert.deepEqual(hand.outline.target, outlineTarget(false));
    assert.true(parts.message.textContent.includes(String(BENDERS.fire.cost)));
  });

  QUnit.test("dragging off the board, or over the tray, shows nothing", (assert) => {
    drag("air", at(GRASS));
    hand.move(onTray);

    assert.false(hand.outline.visible);
    assert.deepEqual(held(), []);
    assert.false(hand.ring.visible);
  });

  QUnit.test("letting go over grass builds the tower, takes the gold, and puts everything away", (assert) => {
    drag("earth", at(GRASS));
    hand.release(at(GRASS));

    assert.deepEqual(made, [{ kind: "earth", col: GRASS[0], row: GRASS[1] }]);
    assert.strictEqual(state.towers.length, 1);
    assert.strictEqual(state.wallet.gold, 400 - BENDERS.earth.cost);
    assert.false(hand.outline.visible);
    assert.deepEqual(held(), []);
    assert.false(hand.tray.buttons.earth.classList.contains("held"));
    assert.strictEqual(parts.gold.textContent, String(400 - BENDERS.earth.cost));
  });

  QUnit.test("letting go over road builds nothing, charges nothing, and the reason stays a moment and then goes", (assert) => {
    drag("earth", at(ROAD));
    hand.release(at(ROAD));

    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
    assert.strictEqual(parts.message.textContent, "that is road");
    hand.update(HAND.refusal - 0.5);
    assert.strictEqual(parts.message.textContent, "that is road", "still there");
    hand.update(1);

    assert.strictEqual(parts.message.textContent, "", "gone");
  });

  QUnit.test("letting go over the tray, or anywhere that is not the board, puts the podium down", (assert) => {
    drag("earth", at(GRASS));
    hand.release(onTray);

    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(state.wallet.gold, 400);
    assert.strictEqual(hand.builder.state, "idle");
    assert.false(hand.tray.buttons.earth.classList.contains("held"));
  });

  QUnit.test("a cell that has a tower in it is red, and says so", (assert) => {
    drag("air", at(GRASS));
    hand.release(at(GRASS));
    drag("water", at(GRASS));

    assert.deepEqual(hand.outline.target, outlineTarget(false));
    assert.strictEqual(parts.message.textContent, "there is a tower there already");
  });

  QUnit.test("a tap on a button arms the podium: it stays marked, and follows the pointer over the board with no button down", (assert) => {
    hand.press("water", { x: 500, y: 500 });
    hand.release(onTray);

    assert.strictEqual(hand.builder.state, "armed");
    assert.true(hand.tray.buttons.water.classList.contains("held"));
    hand.move(at(GRASS));
    assert.true(hand.outline.visible);
    assert.deepEqual(held(), ["water"]);
  });

  QUnit.test("with a podium armed, a tap on the board builds it", (assert) => {
    hand.press("fire", { x: 500, y: 500 });
    hand.release(onTray);
    hand.release(at(GRASS));

    assert.deepEqual(made, [{ kind: "fire", col: GRASS[0], row: GRASS[1] }]);
    assert.strictEqual(state.wallet.gold, 400 - BENDERS.fire.cost);
    assert.strictEqual(hand.builder.state, "idle");
    assert.false(hand.tray.buttons.fire.classList.contains("held"));
  });

  QUnit.test("the tap that arms is not also a tap that builds", (assert) => {
    hand.press("fire", { x: at(GRASS).clientX, y: at(GRASS).clientY });
    hand.release(at(GRASS));

    assert.strictEqual(state.towers.length, 0, "it is only armed");
    assert.strictEqual(hand.builder.state, "armed");
  });

  QUnit.test("with a podium armed, a tap on road is refused with the reason, and the podium stays armed to try again", (assert) => {
    hand.press("fire", { x: 500, y: 500 });
    hand.release(onTray);
    hand.release(at(ROAD));

    assert.strictEqual(state.towers.length, 0);
    assert.strictEqual(hand.builder.state, "armed");
    assert.strictEqual(parts.message.textContent, "that is road");
    hand.release(at(GRASS));
    assert.strictEqual(state.towers.length, 1, "the second try is fine");
  });

  QUnit.test("pressing the button of the armed podium puts it down", (assert) => {
    hand.press("fire", { x: 500, y: 500 });
    hand.release(onTray);
    hand.press("fire", { x: 500, y: 500 });

    assert.strictEqual(hand.builder.state, "idle");
    assert.false(hand.tray.buttons.fire.classList.contains("held"));
  });

  QUnit.test("pressing another button swaps the podium", (assert) => {
    hand.press("fire", { x: 500, y: 500 });
    hand.release(onTray);
    hand.press("air", { x: 500, y: 500 });
    hand.release(onTray);

    assert.strictEqual(hand.builder.kind, "air");
    assert.deepEqual(TRAY_ORDER.filter((kind) => hand.tray.buttons[kind].classList.contains("held")), ["air"]);
  });

  QUnit.test("cancel (the Escape key) puts the podium down from any state, and clears the message", (assert) => {
    drag("air", at(ROAD));
    hand.cancel();

    assert.strictEqual(hand.builder.state, "idle");
    assert.false(hand.outline.visible);
    assert.deepEqual(held(), []);
    assert.strictEqual(parts.message.textContent, "");
    assert.deepEqual(TRAY_ORDER.filter((kind) => hand.tray.buttons[kind].classList.contains("held")), []);
  });

  QUnit.test("a finger holds the podium above itself: the cell is the one a little further up the screen", (assert) => {
    const p = at([5, 2]);
    hand.press("air", { x: 500, y: 500 });
    hand.move({ ...p, clientY: p.clientY + 200, pointerType: "touch" });
    const finger = { ...p, pointerType: "touch" };
    hand.move(finger);

    assert.true(hand.outline.mesh.position.z > cellCenter(5, 2).z, "further back than the cell under the finger");
    const row = cellAt(hand.outline.mesh.position.x, hand.outline.mesh.position.z).row;

    assert.true(row < 2, `the row held is ${row}, above row 2`);
  });

  QUnit.test("a mouse is not lifted", (assert) => {
    const p = at([5, 2]);
    drag("air", p);

    assert.strictEqual(hand.outline.mesh.position.z, cellCenter(5, 2).z);
  });

  QUnit.test("update fades the outline and shows the gold, every frame", (assert) => {
    state.wallet.gold = 250.7;
    hand.update(0.016);

    assert.strictEqual(parts.gold.textContent, "250");
  });

  QUnit.test("gold that comes in lets a podium that was too dear be built", (assert) => {
    state.wallet.gold = BENDERS.fire.cost - 20;
    drag("fire", at(GRASS));
    assert.deepEqual(hand.outline.target, outlineTarget(false));
    state.wallet.earn(25);
    hand.move(at(GRASS));

    assert.deepEqual(hand.outline.target, outlineTarget(true));
  });

  QUnit.test("it builds as many as there is gold for, and then says that there isn't enough", (assert) => {
    for (const cell of [[3, 0], [4, 0], [5, 0], [6, 0]]) {
      drag("fire", at(cell));
      hand.release(at(cell));
    }

    assert.strictEqual(state.towers.length, 2, "two of 175 from 400");
    assert.strictEqual(state.wallet.gold, 400 - 2 * BENDERS.fire.cost);
    assert.true(parts.message.textContent.includes("costs"));
  });
});
```

- **`pageOf` is a camera in a test:** where on the page the middle of a cell is, worked out the same way a camera does it (a dot product each way), so the test can *point at a cell*.
- **The tests are the stories of a player:** drag over grass, over road, over a tower; drag and let go; tap and tap; tap and refused and tap again; press the same button twice; press another; cancel; use a finger; run out of gold. Each says what is on the screen and what is in the wallet afterwards.
- **"A finger holds the podium above itself"** is the lift, said through the whole hand.
- **"Gold that comes in lets a podium that was too dear be built"** drags over a cell with too little gold, adds some, moves, and finds the outline's target has gone from red to green.

**Check:** open `tests.html`. 474 tests pass.

---

## Step 7: The game

The page and the test page already have everything (you were given `index.html`, `tests.html`). The last change is `main.js`. The four towers that were put there go, and the player's own take their place.

First, the note about the demonstration changes (the towers are gone from it):

In `js/main.js`, **replace** lines 19 to 38 (from `// road, so that you can see them. And there is no building:` to `};`) with:

```js
// road, so that you can see them. (The towers are built by the player now, with gold that trickles in.)
const DEMO = { gap: 2.5, order: ["grunt", "scout", "heavy", "dai_li", "spirit"] };
```

The camera's extents are kept, because the hand needs to ask what the camera shows:

In `js/main.js`, **replace** line 29:

```js
  const fitView = () => applyExtents(camera, viewExtents(boardPoints(), engine.getAspectRatio(camera)));
```

with:

```js
  let extents;
  const fitView = () => {
    extents = viewExtents(boardPoints(), engine.getAspectRatio(camera));
    applyExtents(camera, extents);
  };
```

- **`extents` is a variable that `fitView` fills in,** and it is run again when the screen changes shape (as before). The hand is given a *function* that says what it is now (`() => extents`), and not the number, so it is never out of date.

Now the building itself, which replaces the code that made the four towers:

In `js/main.js`, **replace** lines 60 to 67:

```js
  // The towers. Each has to be in a place where one can be built (a mistake in the table says so, and stops).
  const benders = await loadBenders(scene);
  const places = DEMO.towers[mapNumber % DEMO.towers.length];
  places.forEach(({ col, row }, i) => {
    const { ok, reason } = canBuild(grid, col, row, places.slice(0, i));
    if (!ok) throw new Error(`A tower can't go at column ${col}, row ${row}: ${reason}.`);
  });
  const towers = places.map(({ kind, col, row }) => new Tower(scene, benders, kind, col, row));
```

with:

```js
  // Building. The towers and the gold are in `state`. A podium of each kind waits, out of sight, to be held over
  // the board while one is carried. The hand listens to the pointer and does the building.
  const benders = await loadBenders(scene);
  const state = { grid, towers: [], wallet: new Wallet() };
  const previews = {};
  for (const kind of Object.keys(BENDERS)) {
    previews[kind] = new Tower(scene, benders, kind, 0, 0, `preview ${kind}`);
    previews[kind].node.setEnabled(false);
  }
  const tray = new Tray(
    { tray: document.getElementById("tray"), gold: document.getElementById("gold-amount"), message: document.getElementById("message") },
    document
  );
  const hand = new Hand({
    canvas,
    tray,
    state,
    previews,
    outline: new Outline(scene),
    ring: new RangeRing(scene),
    extents: () => extents,
    make: (kind, col, row) => new Tower(scene, benders, kind, col, row),
  });
  tray.onPress((kind, point) => hand.press(kind, point));
  window.addEventListener("pointermove", (event) => hand.move(event));
  window.addEventListener("pointerup", (event) => hand.release(event));
  window.addEventListener("pointercancel", () => hand.cancel());
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hand.cancel();
  });
```

- **`state` is everything the rules need:** the grid, the towers so far and the wallet.
- **A podium of each kind is made now, and switched off.** Each is a whole `Tower` (it has a model and an idle), so that holding one over the board looks like the tower it will be, and it is *waiting* so that dragging one doesn't have to load anything. A switched-off node switches off everything under it.
- **Four listeners are on `window`,** not on the canvas. A drag begins on a button of the tray and ends anywhere, and the pointer events go to the window for all of it. **`pointercancel`** is what a phone sends when it takes the touch over (a swipe from the edge, a call), and **Escape** is for a keyboard.

And the frame function. The gold trickles in, the hand is updated, and the loop that went round the four towers goes round the ones that have been built:

In `js/main.js`, after line 103, add:

```js
    state.wallet.earn(ECONOMY.trickle * dt);
    hand.update(dt);
```

In `js/main.js`, **replace** line 120:

```js
    for (const tower of towers) {
```

with:

```js
    for (const tower of state.towers) {
```

**Check:** open `tests.html`. 474 tests pass. Then open `index.html` through the web server. Along the bottom is a tray with four podiums, each with its price, and at the top the gold. **Press a podium and drag it on to the board:** a ring shows how far it will shoot, the outline is red over the road and fades to green over the grass, and the message says why (*that is road*). Let go over the grass and the tower is built and the gold goes down. Press a button and let go without moving: it is armed, and a tap on the board builds it. Escape puts it down.

---

## Step 8: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **Build all four.** The gold runs out after two or three; wait, and it comes in.
- **Over a tower.** Drag over one that is built: the outline is red, and the message says *there is a tower there already*.
- **Too dear.** With less than 175 gold the fire podium's outline is red over grass, and the message says what it costs and what you have. Wait: when you have enough, move the pointer and it fades to green.
- **Put it down.** Drag on to the board and then back down on the tray, or press Escape: nothing is built, nothing is paid.
- **Tap, tap.** Tap the air nomad's button without moving, and move the mouse over the board: the podium follows. Tap the road: it says no. Tap grass: it is built. Tap its button again to put it down.
- **A phone.** In device mode (a touch screen), drag a podium: it is held a little above your finger. Change `touchLift` in `pointing.js` to `0` and the finger hides it.
- **The fade.** Change `OUTLINE.fade` to `2` for a slow fade and `40` for one that is almost a flick. Change `OUTLINE.ok` to a different green.
- **Prices.** Change a `cost` in `benders.js`. Try `ECONOMY.startGold` of `100`: the tests say at least two of the cheapest.
- **The camera.** Change `CAMERA.alpha` in `view.js` to `-Math.PI / 4`: the board is a diamond, and the pointing still finds the right cell, because it works from the same angles.

---

## Troubleshooting

- **`places is not defined` in the console, and the splash never goes:** the old line `const towers = places.map(...)` is still in `main.js`. It is the *last* line of the block that Step 7 replaces, and it goes with the rest.
- **The splash never goes, and the console says something is not defined:** a script is missing from `index.html`, or has no export block, or is in the wrong order (`pointing.js` needs `view.js` and `board.js` first, `hand.js` needs everything).
- **A drag shows nothing on the board:** the pointer isn't over the canvas (the tray is *under* it), or `extents` isn't being kept. Check the `fitView` change.
- **The outline is a cell off, always:** `groundAt`. The test "it agrees with where a real camera looks" says how far.
- **The outline is white or the wrong color:** the picture is being used as an emissive texture. It has to be the `opacityTexture`, with the color on the material.
- **The outline flicks from red to green with no fade, or fades more slowly on a phone:** `update(dt)` isn't being given the time the frame took, or the fade isn't an exponential of it.
- **A podium dragged on a phone is hidden by the finger:** `liftFor` isn't being used, or the event has no `pointerType`.
- **Pressing a button scrolls the page on a phone:** `touch-action: none` is missing from the buttons.
- **A tap builds a tower at once, or never arms:** the hand is reading the builder's state *after* the builder has changed it.
- **A tower is built in a cell that has one:** the tower isn't being kept in `state.towers`, or the check isn't being given it.
- **The gold doesn't go down, or goes below nothing:** `tryBuild` isn't the thing that builds, or the wallet's `spend` is being skipped.

---

## What you have

A tray, a drag, an outline that fades red to green, a ring of range, a tap that does the same job, gold that is spent and earned, a rule that says why not, and a hand that has been tested by pressing, dragging and letting go with no screen at all, behind a test suite of 474 tests.

**Next up:** waves. The next tutorial replaces the demonstration with a **table of waves**: a spawner that sends the enemies of a wave, a pause between waves, lives that go when an enemy gets to the end, and the **death animations**, so that what the towers shoot at can finally be hurt, and gold is paid for it.
