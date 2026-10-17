# Tutorial: Adding Rocks to Asteroids

In this tutorial you'll give the bullets from [Asteroids Bullets](../asteroids_bullets/README.md) something to shoot. You write the code; this document tells you what to write and why.

By the end you'll have:

- Rocks that drift, spin, and wrap around the screen
- Rocks that **split** when shot: large into two medium, medium into two small, small just vanish
- A score, worth more for the smaller (harder) rocks
- A shared wrap-around helper, so ship, bullets and rocks all use the same rule
- A reusable circle-vs-circle collision check
- Unit tests for all of it
- *(Optional)* a synthesized explosion sound

**What you'll learn:** refactoring shared code safely with tests, circle-vs-circle collision, drawing randomized outlines with `CreateLines`, parent-and-child splitting logic, injecting a random source so random behavior can be tested, and a 2D GUI layer on top of a 3D scene.

## Where you're starting

This folder is a copy of the finished Bullets sample, plus empty placeholder files for the new code:

```
asteroids_rocks/
├── index.html
├── tests.html
├── js/
│   ├── ship.js, bullets.js, main.js   (from the Bullets sample)
│   ├── wrap.js         (placeholder -- Step 1)
│   ├── collision.js    (placeholder -- Step 2)
│   ├── rocks.js        (placeholder -- Step 3)
│   └── hud.js          (placeholder -- Step 5)
└── tests/
    ├── ship.tests.js, bullets.tests.js   (from the Bullets sample)
    ├── wrap.tests.js        (placeholder -- Step 1)
    ├── collision.tests.js   (placeholder -- Step 2)
    ├── rocks.tests.js       (placeholder -- Step 7)
    └── hud.tests.js         (placeholder -- Step 7)
```

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Bullets sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` is never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Open `index.html` in a browser now to confirm the ship still flies and fires. Open `tests.html` too and note how many tests pass; you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on whitespace.** Some of the existing files use 2-space indentation and some 4. When a step says "replace this block", match the *code*, and keep whatever indentation the surrounding file uses.

---

## Step 1: Share the wrap-around rule

Rocks wrap around the screen too. That makes **three** things (ship, bullets, rocks) following the same rule, and right now the rule is copy-pasted into `Ship.update()` and `BulletSystem.update()`. A third copy is the point to stop and share it.

This is a *refactor*: you change the structure without changing the behavior. The existing tests are your safety net, so you'll write the helper and its tests first, swap it in, and check that nothing moved.

### 1a. The helper

Put this in `js/wrap.js`:

```js
// Screen wrap for a single axis. Ship, bullets, and rocks all leave one edge
// of the screen and reappear on the opposite one, so the rule lives here once
// instead of being copied into each of them.
//
// `limit` is how far from the center something may travel before it wraps:
// pass the half-extent of the screen plus the thing's own radius, so it slides
// completely out of view before reappearing on the other side.
function wrapCoordinate(value, limit) {
  if (value > limit) return -limit;
  if (value < -limit) return limit;
  return value;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = wrapCoordinate;
} else {
  window.wrapCoordinate = wrapCoordinate;
}
```

It handles one axis, so callers use it twice (x and y). A value *exactly* on the limit doesn't wrap, which matches what the ship did before.

### 1b. Tests for the helper

Put this in `tests/wrap.tests.js`:

```js
QUnit.module("wrapCoordinate", () => {
  QUnit.test("leaves a value inside the range alone", (assert) => {
    assert.strictEqual(wrapCoordinate(3, 10), 3);
    assert.strictEqual(wrapCoordinate(-3, 10), -3);
    assert.strictEqual(wrapCoordinate(0, 10), 0);
  });

  QUnit.test("a value exactly on the limit does not wrap", (assert) => {
    assert.strictEqual(wrapCoordinate(10, 10), 10);
    assert.strictEqual(wrapCoordinate(-10, 10), -10);
  });

  QUnit.test("wraps past the positive limit to the negative one", (assert) => {
    assert.strictEqual(wrapCoordinate(10.5, 10), -10);
  });

  QUnit.test("wraps past the negative limit to the positive one", (assert) => {
    assert.strictEqual(wrapCoordinate(-10.5, 10), 10);
  });
});
```

### 1c. Load the helper

Add `wrap.js` to **both** pages, *before* the files that use it.

In `tests.html`, add these two lines (the helper's script before `ship.js`, and its tests with the others):

```html
  <script src="js/wrap.js"></script>
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="tests/wrap.tests.js"></script>
  <script src="tests/ship.tests.js"></script>
  <script src="tests/bullets.tests.js"></script>
```

In `index.html`, add one line, `wrap.js`, between `screenshot.js` and `ship.js`, so the end of the file reads:

```html
  <script src="../../../js/screenshot.js"></script>
  <script src="js/wrap.js"></script>
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="js/main.js"></script>
```

Open `tests.html`: the new wrap tests pass, so you should now have **4 more** than before.

### 1d. Use it in `Ship`

In `js/ship.js`, find the wrap section in `update()`. It's this block (from `const limitX` down to the closing brace of the `y` check):

```js
    const limitX = halfWidth + this.radius;
    const limitY = halfHeight + this.radius;
    let wrappedX = false;
    let wrappedY = false;

    if (this.x > limitX) {
      this.x = -limitX;
      wrappedX = true;
    } else if (this.x < -limitX) {
      this.x = limitX;
      wrappedX = true;
    }
    if (this.y > limitY) {
      this.y = -limitY;
      wrappedY = true;
    } else if (this.y < -limitY) {
      this.y = limitY;
      wrappedY = true;
    }
```

Replace all of it with:

```js
    const x = wrapCoordinate(this.x, halfWidth + this.radius);
    const y = wrapCoordinate(this.y, halfHeight + this.radius);
    const wrappedX = x !== this.x;
    const wrappedY = y !== this.y;
    this.x = x;
    this.y = y;
```

The `return { wrappedX, wrappedY }` further down stays as it is. The flags are now worked out by checking whether the helper changed the value.

### 1e. Use it in `BulletSystem`

In `js/bullets.js`, in `update()`, find:

```js
            const limitX = halfWidth + this.radius;
            const limitY = halfHeight + this.radius;
            if (bullet.x > limitX) bullet.x = -limitX;
            else if (bullet.x < -limitX) bullet.x = limitX;
            if (bullet.y > limitY) bullet.y = -limitY;
            else if (bullet.y < -limitY) bullet.y = limitY;
```

and replace it with:

```js
            bullet.x = wrapCoordinate(bullet.x, halfWidth + this.radius);
            bullet.y = wrapCoordinate(bullet.y, halfHeight + this.radius);
```

### 1f. Check nothing changed

- Reload `tests.html`. **Every test should still pass**, including the ship and bullet wrap tests you didn't touch. That's the point: they prove the behavior is the same.
- Reload `index.html`. Fly off every edge and fire bullets across the edges; they should wrap exactly as before.

**If the game breaks** with `wrapCoordinate is not defined`, the script tag from 1c is missing or comes after `ship.js`.

---

## Step 2: Circle-vs-circle collision

Bullets and rocks are both treated as circles (a bullet is a very small one). Two circles overlap when the distance between their centers is less than the sum of their radii.

Put this in `js/collision.js`:

```js
// Circle-vs-circle overlap test, the collision check Asteroids is built on:
// bullets, rocks, and (in a later step) the ship are all treated as circles.
//
// Two circles overlap when the distance between their centers is less than
// the sum of their radii. Comparing *squared* distances avoids a Math.sqrt()
// call, which matters when this runs for every bullet-rock pair every frame.
// Circles that exactly touch do not count as overlapping.
function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const radii = ar + br;
  return dx * dx + dy * dy < radii * radii;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = circlesOverlap;
} else {
  window.circlesOverlap = circlesOverlap;
}
```

> **Why squared distances?** `distance < radii` and `distance² < radii²` give the same answer for non-negative numbers, but the second skips a square root. Square roots are comparatively slow, and this check will run for every bullet against every rock, every frame.

Test it. Put this in `tests/collision.tests.js`:

```js
QUnit.module("circlesOverlap", () => {
  QUnit.test("circles on top of each other overlap", (assert) => {
    assert.true(circlesOverlap(0, 0, 1, 0, 0, 1));
  });

  QUnit.test("circles far apart do not overlap", (assert) => {
    assert.false(circlesOverlap(0, 0, 1, 10, 0, 1));
  });

  QUnit.test("circles that partly overlap do", (assert) => {
    assert.true(circlesOverlap(0, 0, 1, 1.5, 0, 1)); // centers 1.5 apart, radii sum to 2
  });

  QUnit.test("circles that exactly touch do not count as overlapping", (assert) => {
    assert.false(circlesOverlap(0, 0, 1, 2, 0, 1));
  });

  QUnit.test("works along the diagonal, not just the axes", (assert) => {
    // Centers are sqrt(2) ~ 1.414 apart.
    assert.true(circlesOverlap(0, 0, 1, 1, 1, 0.5), "radii sum to 1.5, so they overlap");
    assert.false(circlesOverlap(0, 0, 0.5, 1, 1, 0.5), "radii sum to 1.0, so they don't");
  });

  QUnit.test("is symmetric", (assert) => {
    assert.strictEqual(circlesOverlap(0, 0, 1, 1.5, 0.5, 0.7), circlesOverlap(1.5, 0.5, 0.7, 0, 0, 1));
  });

  QUnit.test("a small circle inside a big one overlaps", (assert) => {
    assert.true(circlesOverlap(0, 0, 5, 1, 1, 0.1));
  });
});
```

Register both files in `tests.html` (helper next to the other scripts, tests next to the other tests):

```html
  <script src="js/wrap.js"></script>
  <script src="js/collision.js"></script>
```
```html
  <script src="tests/wrap.tests.js"></script>
  <script src="tests/collision.tests.js"></script>
```

Reload `tests.html`: **7 more** tests, all green. (You'll add the helper to `index.html` in Step 6, together with the rest.)

---

## Step 3: Write `RockField`

`RockField` is the heart of this step. It follows the same pattern as `BulletSystem`: rocks are plain records, one class owns the list, and `BABYLON` is touched only when a `scene` is given.

Open `js/rocks.js` and build it up in pieces.

### 3a. The size table and constructor

```js
// Every rock on screen: spawning, drifting, spinning, wrapping, splitting when
// shot, and the mesh lifecycle. A rock is a plain record, not its own class --
// same reasoning as bullets (see ../js/bullets.js): it has no behavior of its
// own, so a class per rock would just be overhead.
//
// `BABYLON` is only touched when `scene` is supplied, the same split Ship and
// BulletSystem use, so the logic can be unit tested without a real engine. All
// randomness goes through an injectable `random` function for the same reason
// SparkSystem has one in the Breakout series. See ../tests/rocks.tests.js.

// Three sizes. Shooting a large rock splits it into two medium ones, a medium
// into two small ones, and a small one just disappears. Smaller rocks are
// worth more points because they're faster and harder to hit.
const ROCK_SIZES = {
  large: { radius: 1.2, points: 20, minSpeed: 0.8, maxSpeed: 1.8, splitsInto: "medium" },
  medium: { radius: 0.7, points: 50, minSpeed: 1.4, maxSpeed: 2.6, splitsInto: "small" },
  small: { radius: 0.35, points: 100, minSpeed: 2.2, maxSpeed: 3.5, splitsInto: null },
};

class RockField {
  constructor({
    scene = null,
    vertices = 10, // corners on each rock's outline
    maxSpin = 1.5, // rad/s, in either direction
    color = "#bbbbbb",
    random = Math.random,
  } = {}) {
    this.scene = scene;
    this.vertices = vertices;
    this.maxSpin = maxSpin;
    this.color = color;
    this.rocks = [];
    this._random = random;
  }
}
```

Things to notice:

- **The whole game's rock behavior is in one table.** To rebalance the game (bigger rocks, different scores, a fourth size), you change `ROCK_SIZES`, not the code. `splitsInto` is how a size knows what comes next; `null` ends the chain.
- **`random` is injected.** Every dice roll in this class goes through `this._random`. In the game it's `Math.random`; in tests you'll hand in a scripted sequence so a "random" result is exactly predictable. You saw this in `SparkSystem` in the Breakout series.

### 3b. Spawning

Add inside the class:

```js
  // Creates one rock of the given size ("large", "medium", or "small") at
  // (x, y). Pass { vx, vy } to choose its velocity; otherwise it drifts in a
  // random direction at a random speed within the size's range.
  spawn(size, x, y, velocity = null) {
    const config = ROCK_SIZES[size];
    const { vx, vy } = velocity || this._randomVelocity(config);

    // Each corner sits between 80% and 100% of the rock's radius from its
    // center, so the outline is lumpy but never pokes outside the circle used
    // for collisions.
    const shape = [];
    for (let i = 0; i < this.vertices; i++) {
      shape.push(0.8 + this._random() * 0.2);
    }

    const rock = {
      size,
      x,
      y,
      vx,
      vy,
      radius: config.radius,
      angle: 0,
      spin: (this._random() * 2 - 1) * this.maxSpin,
      shape,
      mesh: null,
    };
    if (this.scene) this._attach(rock);
    this.rocks.push(rock);
    return rock;
  }
```

Things to notice:

- **Two circles in one.** What you *see* is a lumpy polygon; what the game *collides with* is a perfect circle of `radius`. Keeping every corner at 80-100% of that radius means a bullet never visibly passes through a rock's edge without a hit. Players notice unfair collisions, so the visual shape stays inside the hit circle.
- `shape` is just an array of numbers, one per corner. The rock stores it so the outline stays the same for the rock's whole life.
- The optional `velocity` argument is what lets `destroy()` (3e) choose the pieces' velocities while `populate()` (3c) lets them be random.

### 3c. Scattering the starting rocks

```js
  // Scatters `count` large rocks across the screen, keeping each at least
  // `safeDistance` away from `avoid` (normally the ship) so the player isn't
  // buried the moment the game starts.
  populate(count, bounds, avoid = { x: 0, y: 0 }, safeDistance = 3) {
    const { halfWidth, halfHeight } = bounds;
    for (let n = 0; n < count; n++) {
      let x = 0;
      let y = 0;
      // Retry a limited number of times so a tiny screen can't loop forever.
      for (let attempt = 0; attempt < 20; attempt++) {
        x = (this._random() * 2 - 1) * halfWidth;
        y = (this._random() * 2 - 1) * halfHeight;
        if (Math.hypot(x - avoid.x, y - avoid.y) >= safeDistance) break;
      }
      this.spawn("large", x, y);
    }
  }
```

`this._random() * 2 - 1` turns a number in 0 to 1 into one in -1 to 1, which scaled by the half-width gives a random x anywhere on screen. The loop tries a position, and if it's too close to the ship, tries again.

### 3d. Moving, spinning, wrapping

```js
  // Advances every rock by dt seconds: drift, wrap around the screen, spin.
  update(dt, bounds) {
    const { halfWidth, halfHeight } = bounds;
    for (const rock of this.rocks) {
      rock.x = wrapCoordinate(rock.x + rock.vx * dt, halfWidth + rock.radius);
      rock.y = wrapCoordinate(rock.y + rock.vy * dt, halfHeight + rock.radius);
      rock.angle += rock.spin * dt;
      this._syncMesh(rock);
    }
  }
```

This is where Step 1 pays off: the shared helper in two lines, instead of a third copy of the wrap logic. Notice each rock wraps by *its own* radius, so a big rock slides fully off-screen before reappearing.

### 3e. Splitting

```js
  // Removes `rock` and, unless it was the smallest size, replaces it with two
  // smaller rocks flying apart. Returns { points, children }.
  destroy(rock) {
    const index = this.rocks.indexOf(rock);
    if (index === -1) return { points: 0, children: [] };

    const config = ROCK_SIZES[rock.size];
    this.rocks.splice(index, 1);
    this._disposeRock(rock);

    const children = [];
    if (config.splitsInto) {
      const childConfig = ROCK_SIZES[config.splitsInto];
      // Pick a random direction and speed for one child and send the other the
      // opposite way at the same speed, so the pieces always separate evenly.
      // Each also keeps half of the parent's velocity, so a fast rock throws
      // off fast pieces.
      const direction = this._random() * Math.PI * 2;
      const speed = childConfig.minSpeed + this._random() * (childConfig.maxSpeed - childConfig.minSpeed);
      for (const heading of [direction, direction + Math.PI]) {
        children.push(
          this.spawn(config.splitsInto, rock.x, rock.y, {
            vx: rock.vx * 0.5 + Math.cos(heading) * speed,
            vy: rock.vy * 0.5 + Math.sin(heading) * speed,
          })
        );
      }
    }
    return { points: config.points, children };
  }
```

Things to notice:

- **Opposite headings** (`direction` and `direction + Math.PI`) guarantee the two pieces fly *apart* rather than staying together.
- **Half the parent's velocity** (`rock.vx * 0.5`) is a cheap bit of momentum: the pieces carry on roughly the way the parent was going, plus their own kick.
- It returns both the **points** (so the caller can score) and the **children** (so a test, or a later effect, can see them), and returns zero points if the rock isn't in the field, so destroying the same rock twice can't score twice.

### 3f. Bullets meet rocks

```js
  // Checks every bullet against every rock. A bullet that overlaps a rock is
  // removed and the rock is destroyed (splitting if it can). Returns one
  // { size, points, x, y } entry per rock destroyed, so the caller can add up
  // the score and, later, play effects where each one blew up.
  collideBullets(bulletSystem) {
    const hits = [];
    // Backwards, because a hit removes the bullet from the array being walked.
    for (let i = bulletSystem.bullets.length - 1; i >= 0; i--) {
      const bullet = bulletSystem.bullets[i];
      const rock = this.rocks.find((r) => circlesOverlap(bullet.x, bullet.y, bulletSystem.radius, r.x, r.y, r.radius));
      if (!rock) continue;

      bulletSystem.remove(bullet);
      const { size, x, y } = rock;
      hits.push({ size, x, y, points: this.destroy(rock).points });
    }
    return hits;
  }
```

Things to notice:

- `Array.find` returns the first rock that overlaps the bullet. A bullet only ever destroys **one** rock, then it's used up.
- When `destroy()` adds new pieces to `this.rocks`, later bullets in the same loop can hit those pieces too, which is fine.
- A bullet is a *point-ish* circle, so its radius is `bulletSystem.radius`: the same value used for drawing it.
- It uses `bulletSystem.remove(bullet)`, which doesn't exist yet. You'll add it in Step 4.
- The `{ size, x, y }` it returns isn't all used yet. `size` will pick the explosion sound in Step 8, and `x`/`y` are there for effects in a later step.

### 3g. Cleanup

```js
  // Removes every rock (e.g. on reset).
  clear() {
    for (const rock of this.rocks) {
      this._disposeRock(rock);
    }
    this.rocks = [];
  }

  dispose() {
    this.clear();
  }

  _randomVelocity(config) {
    const heading = this._random() * Math.PI * 2;
    const speed = config.minSpeed + this._random() * (config.maxSpeed - config.minSpeed);
    return { vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed };
  }
```

### 3h. The Babylon.js parts

These are the only methods that touch `BABYLON`:

```js
  // Draws the rock as a closed outline: one point per corner, spaced evenly
  // around a circle, each pulled in by its entry in `shape`. Repeating the
  // first point at the end closes the loop.
  _attach(rock) {
    const points = rock.shape.map((factor, i) => {
      const a = (i / rock.shape.length) * Math.PI * 2;
      return new BABYLON.Vector3(Math.cos(a) * rock.radius * factor, Math.sin(a) * rock.radius * factor, 0);
    });
    points.push(points[0].clone());

    rock.mesh = BABYLON.MeshBuilder.CreateLines("rock", { points }, this.scene);
    rock.mesh.color = BABYLON.Color3.FromHexString(this.color);
    this._syncMesh(rock);
  }

  _syncMesh(rock) {
    if (!rock.mesh) return;
    rock.mesh.position.x = rock.x;
    rock.mesh.position.y = rock.y;
    rock.mesh.rotation.z = rock.angle;
  }

  _disposeRock(rock) {
    if (!rock.mesh) return;
    rock.mesh.dispose();
    rock.mesh = null;
  }
```

Things to notice:

- **Polar coordinates.** For corner `i` of `n`, the angle is `i / n * 2π`, and the point is `(cos a, sin a)` times the radius. Multiplying by the corner's `factor` (0.8-1.0) pulls it in a little, making the outline lumpy.
- **The mesh is built around its own origin** and then *moved and rotated* by `_syncMesh`. That's why spinning is just `mesh.rotation.z = rock.angle`, with no rebuilding of points.
- The first point is **cloned** and added at the end to close the outline. `points[0].clone()` rather than reusing `points[0]` avoids two array slots pointing at the same object.
- Lines have their own `color` property, so unlike bullets there's **no material to share**. That's why `_disposeRock` is a plain `dispose()`.

### 3i. Export the class

```js
// The size table, for callers (and tests) that need to read it without
// duplicating the numbers this class already owns.
RockField.SIZES = ROCK_SIZES;

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = RockField;
} else {
  window.RockField = RockField;
}
```

`RockField.SIZES` attaches the table to the class itself (the Breakout series' `PowerUpManager.TYPES` does the same), so tests can read it as `RockField.SIZES`.

---

## Step 4: Let a single bullet be removed

`collideBullets()` needs to take one bullet out of play when it hits something. `BulletSystem` can only `clear()` everything or expire bullets by age, so it needs a small new method.

In `js/bullets.js`, add this to `BulletSystem`, just above `clear()`:

```js
    // Removes one bullet (e.g. because it hit a rock). Does nothing if the
    // bullet isn't in flight.
    remove(bullet) {
        const index = this.bullets.indexOf(bullet);
        if (index === -1) return;
        this._disposeBullet(bullet);
        this.bullets.splice(index, 1);
    }
```

It reuses `_disposeBullet`, so the mesh is disposed the same careful way as when a bullet expires (keeping the shared material alive). Because it frees a slot, removing a bullet also lets the player fire again right away, subject to the cooldown.

---

## Step 5: A score display

The ship, bullets and rocks are meshes in the 3D world. A score is better drawn on a flat 2D layer on top, using `BABYLON.GUI`, the same approach as the HUD in the Introduction and Breakout series.

Put this in `js/hud.js`:

```js
// On-screen score, following the same ui-optional split as the Breakout
// series' Hud: `BABYLON` is only touched when a `ui` is supplied, so the
// counting logic can be tested directly and the label can be tested by
// stubbing `BABYLON.GUI`. See ../tests/hud.tests.js.
//
// The ship, bullets, and rocks are 3D meshes in the world; this is a 2D GUI
// layer drawn on top of them, pinned to the top of the canvas.
class Hud {
  constructor({ ui = null } = {}) {
    this.score = 0;

    this.ui = null;
    this.scoreLabel = null;
    if (ui) {
      this.attachTo(ui);
    }
  }

  // Creates the score label and adds it to `ui`. Only needed if `ui` wasn't
  // already passed to the constructor.
  attachTo(ui) {
    this.ui = ui;

    this.scoreLabel = new BABYLON.GUI.TextBlock();
    this.scoreLabel.height = "30px";
    this.scoreLabel.color = "white";
    this.scoreLabel.fontSize = 24;
    this.scoreLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    // Clears the fixed-position HTML back-button/hint bar (see sample.css),
    // which sits on top of the canvas from y=12px to roughly y=42px.
    this.scoreLabel.top = "56px";
    // The label spans the full width of the screen, so don't let it swallow
    // pointer events meant for the canvas underneath.
    this.scoreLabel.isHitTestVisible = false;
    this.ui.addControl(this.scoreLabel);

    this._syncLabel();
    return this;
  }

  // Removes and disposes the label, if attached.
  dispose() {
    if (!this.scoreLabel) return;
    this.ui.removeControl(this.scoreLabel);
    this.scoreLabel.dispose();
    this.ui = null;
    this.scoreLabel = null;
  }

  // Adds points to the score and refreshes the label.
  addScore(points) {
    this.score += points;
    this._syncLabel();
  }

  resetScore() {
    this.score = 0;
    this._syncLabel();
  }

  _syncLabel() {
    if (!this.scoreLabel) return;
    this.scoreLabel.text = `Score: ${this.score}`;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Hud;
} else {
  window.Hud = Hud;
}
```

Things to notice:

- A `TextBlock` with no explicit width fills its parent, here the whole screen. `verticalAlignment = TOP` plus `top = "56px"` pins it near the top, and `isHitTestVisible = false` stops that invisible full-width box from intercepting clicks. (This was the cause of a nasty "Reset button won't click" bug in the Breakout series.)
- The GUI layer needs its own script: Babylon's GUI library is a separate file. You'll add it in Step 6.

---

## Step 6: Wire it all together

Now make the page load everything and use it.

### 6a. `index.html`

Add the GUI library right after the main Babylon script in `<head>`:

```html
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/gui/babylon.gui.min.js"></script>
```

And at the bottom, **replace** the existing run of `<script src="js/...">` tags (everything after `screenshot.js`) with this list. Don't add it underneath the old tags, or every script loads twice and the console fills with "has already been declared" errors:

```html
  <script src="../../../js/screenshot.js"></script>
  <script src="js/wrap.js"></script>
  <script src="js/collision.js"></script>
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="js/rocks.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/main.js"></script>
```

### 6b. `js/main.js`

Make four changes.

**1.** Add two tuning constants next to `SHIP_DRAG`:

```js
const START_ROCKS = 4; // large rocks on screen at the start
const SAFE_DISTANCE = 3; // world units; rocks never spawn this close to the ship
```

**2.** Right after `const bullets = new BulletSystem({ scene });`, create the rocks, the GUI layer, the HUD, and a helper that fills the screen:

```js
  const rocks = new RockField({ scene });

  // Fullscreen 2D GUI layer for the score, drawn on top of the 3D world.
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
  const hud = new Hud({ ui });

  const populateRocks = () => rocks.populate(START_ROCKS, { halfWidth, halfHeight }, ship, SAFE_DISTANCE);
  populateRocks();
```

Passing `ship` as the "avoid" point works because it has `x` and `y`.

**3.** Make **R** reset the rocks and score too. The `KeyR` branch of the `keydown` handler becomes:

```js
    if (event.code === "KeyR") {
      ship.reset();
      bullets.clear();
      rocks.clear();
      hud.resetScore();
      populateRocks();
      return;
    }
```

**4.** At the end of the `onBeforeRenderObservable` callback, right after `bullets.update(dt, bounds);`, add:

```js
    rocks.update(dt, bounds);
    for (const hit of rocks.collideBullets(bullets)) {
      hud.addScore(hit.points);
    }
    // Everything shot? Bring in a fresh set. (A later step turns this into
    // proper waves.)
    if (rocks.rocks.length === 0) populateRocks();
```

### 6c. Try it

Reload `index.html`:

- [ ] Four lumpy grey rocks drift and spin, none close to the ship
- [ ] Rocks that leave one edge reappear on the opposite one
- [ ] A bullet that touches a rock **disappears** with the rock
- [ ] A large rock becomes **two medium** rocks flying apart; a medium becomes two small
- [ ] Small rocks are faster, and just vanish when hit
- [ ] The score goes up: **20** per large, **50** per medium, **100** per small
- [ ] Clearing everything brings in four fresh large rocks
- [ ] **R** resets the ship, clears bullets, restarts the rocks, and zeroes the score
- [ ] The ship flies *through* rocks. That's expected; colliding with the ship is the next tutorial.

**If something's wrong:** `RockField is not defined` or `Hud is not defined` means a script tag from 6a is missing; `BABYLON.GUI is undefined` means the GUI script tag is missing; `bulletSystem.remove is not a function` means Step 4 didn't land.

**Experiments** (change one, reload, then change it back):

- `START_ROCKS = 12` for a crowded field
- In `ROCK_SIZES`, change `large`'s `splitsInto` to `"small"` and watch large rocks skip a size
- Raise `maxSpin` in `new RockField({ scene, maxSpin: 5 })` for tumbling rocks
- Temporarily make the shape `0.4 + this._random() * 0.6` and see what happens at the edge of a rock when you fire at it (the visible outline now pulls well inside the collision circle)

---

## Step 7: Tests

### 7a. Register the remaining files in `tests.html`

Your finished `tests.html` scripts should look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="js/wrap.js"></script>
  <script src="js/collision.js"></script>
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="js/rocks.js"></script>
  <script src="js/hud.js"></script>
  <script src="tests/wrap.tests.js"></script>
  <script src="tests/collision.tests.js"></script>
  <script src="tests/ship.tests.js"></script>
  <script src="tests/bullets.tests.js"></script>
  <script src="tests/rocks.tests.js"></script>
  <script src="tests/hud.tests.js"></script>
```

### 7b. `RockField` logic tests

Put this in `tests/rocks.tests.js`:

```js
// Returns a random()-compatible function that replays `values`, cycling once
// exhausted, so randomized behavior can be pinned down exactly.
const sequence = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

QUnit.module("RockField", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = RockField.SIZES;

  QUnit.test("starts empty", (assert) => {
    assert.deepEqual(new RockField().rocks, []);
  });

  QUnit.test("spawn() creates a rock of the requested size at the requested spot", (assert) => {
    const field = new RockField();

    const rock = field.spawn("medium", 3, -2);

    assert.strictEqual(rock.size, "medium");
    assert.strictEqual(rock.x, 3);
    assert.strictEqual(rock.y, -2);
    assert.strictEqual(rock.radius, SIZES.medium.radius);
    assert.strictEqual(field.rocks.length, 1);
  });

  QUnit.test("spawn() uses the velocity it is given", (assert) => {
    const rock = new RockField().spawn("large", 0, 0, { vx: 2, vy: -3 });

    assert.strictEqual(rock.vx, 2);
    assert.strictEqual(rock.vy, -3);
  });

  QUnit.test("spawn() without a velocity picks a speed within the size's range", (assert) => {
    const field = new RockField();

    for (const size of Object.keys(SIZES)) {
      for (let i = 0; i < 50; i++) {
        const rock = field.spawn(size, 0, 0);
        const speed = Math.hypot(rock.vx, rock.vy);
        assert.true(
          speed >= SIZES[size].minSpeed - 1e-9 && speed <= SIZES[size].maxSpeed + 1e-9,
          `${size} rock speed ${speed} is in range`
        );
      }
    }
  });

  QUnit.test("spawn() gives each rock a lumpy outline that stays inside its collision circle", (assert) => {
    const rock = new RockField({ vertices: 12 }).spawn("large", 0, 0);

    assert.strictEqual(rock.shape.length, 12);
    assert.true(rock.shape.every((f) => f >= 0.8 && f <= 1), "every corner is 80-100% of the radius");
  });

  QUnit.test("spin ranges from -maxSpin to +maxSpin", (assert) => {
    // With a velocity supplied and a single corner, spawn() calls random() twice:
    // once for the corner, then once for the spin.
    const negative = new RockField({ maxSpin: 2, vertices: 1, random: sequence([0.5, 0]) });
    const positive = new RockField({ maxSpin: 2, vertices: 1, random: sequence([0.5, 1]) });
    const still = new RockField({ maxSpin: 2, vertices: 1, random: sequence([0.5, 0.5]) });
    const velocity = { vx: 0, vy: 0 };

    assert.strictEqual(negative.spawn("large", 0, 0, velocity).spin, -2);
    assert.strictEqual(positive.spawn("large", 0, 0, velocity).spin, 2);
    assert.strictEqual(still.spawn("large", 0, 0, velocity).spin, 0);
  });

  QUnit.test("populate() makes the requested number of large rocks inside the screen", (assert) => {
    const field = new RockField();

    field.populate(6, BOUNDS);

    assert.strictEqual(field.rocks.length, 6);
    for (const rock of field.rocks) {
      assert.strictEqual(rock.size, "large");
      assert.true(Math.abs(rock.x) <= BOUNDS.halfWidth && Math.abs(rock.y) <= BOUNDS.halfHeight);
    }
  });

  QUnit.test("populate() keeps rocks away from the point to avoid", (assert) => {
    for (let trial = 0; trial < 30; trial++) {
      const field = new RockField();
      field.populate(5, BOUNDS, { x: 0, y: 0 }, 3);
      for (const rock of field.rocks) {
        assert.true(Math.hypot(rock.x, rock.y) >= 3, "rock is at least 3 units from the ship");
      }
    }
  });

  QUnit.test("update() drifts and spins every rock", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 0, 0, { vx: 2, vy: -1 });
    rock.spin = 1;

    field.update(0.5, BOUNDS);

    assert.strictEqual(rock.x, 1);
    assert.strictEqual(rock.y, -0.5);
    assert.strictEqual(rock.angle, 0.5);
  });

  QUnit.test("update() wraps a rock that has fully left the screen", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 0, 0, { vx: 0, vy: 0 });
    // The wrap limit is halfWidth + radius = 10 + 1.2 = 11.2.
    rock.x = 11.1;
    field.update(0, BOUNDS);
    assert.strictEqual(rock.x, 11.1, "still partly on screen, so it stays");

    rock.x = 11.3;
    field.update(0, BOUNDS);
    assert.strictEqual(rock.x, -(BOUNDS.halfWidth + SIZES.large.radius));
  });

  QUnit.test("destroy() splits a large rock into two medium ones and scores it", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 4, 2);

    const result = field.destroy(rock);

    assert.strictEqual(result.points, SIZES.large.points);
    assert.strictEqual(result.children.length, 2);
    assert.true(result.children.every((c) => c.size === "medium"));
    assert.false(field.rocks.includes(rock), "the original is gone");
    assert.strictEqual(field.rocks.length, 2);
  });

  QUnit.test("destroy() splits a medium rock into two small ones", (assert) => {
    const field = new RockField();
    const rock = field.spawn("medium", 0, 0);

    const result = field.destroy(rock);

    assert.strictEqual(result.points, SIZES.medium.points);
    assert.true(result.children.every((c) => c.size === "small"));
  });

  QUnit.test("destroy() on a small rock just removes it", (assert) => {
    const field = new RockField();
    const rock = field.spawn("small", 0, 0);

    const result = field.destroy(rock);

    assert.strictEqual(result.points, SIZES.small.points);
    assert.deepEqual(result.children, []);
    assert.strictEqual(field.rocks.length, 0);
  });

  QUnit.test("the pieces start where the rock was and fly apart", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 4, 2, { vx: 2, vy: 0 });

    const [a, b] = field.destroy(rock).children;

    assert.strictEqual(a.x, 4);
    assert.strictEqual(a.y, 2);
    assert.strictEqual(b.x, 4);
    // Each piece keeps half the parent's velocity, plus an equal kick in opposite directions.
    assert.true(Math.abs(a.vx - 1 + (b.vx - 1)) < 1e-9, "x kicks cancel out");
    assert.true(Math.abs(a.vy + b.vy) < 1e-9, "y kicks cancel out");
    assert.true(Math.hypot(a.vx - b.vx, a.vy - b.vy) > 0, "the pieces are not moving together");
  });

  QUnit.test("destroy() ignores a rock that isn't in the field", (assert) => {
    const field = new RockField();
    field.spawn("large", 0, 0);
    const stranger = new RockField().spawn("large", 0, 0);

    const result = field.destroy(stranger);

    assert.strictEqual(result.points, 0);
    assert.strictEqual(field.rocks.length, 1);
  });

  QUnit.test("clear() removes every rock", (assert) => {
    const field = new RockField();
    field.populate(3, BOUNDS);

    field.clear();

    assert.deepEqual(field.rocks, []);
  });
});
```

Look at the **spin** test. It works because the order of `random()` calls inside `spawn()` is fixed, so a scripted `sequence([0.5, 0])` gives a known spin of exactly `-maxSpin`. That's the payoff of injecting the random source.

### 7c. Bullet-and-rock collision tests

Add below it, in the same file:

```js
QUnit.module("RockField bullet collisions", () => {
  const fireFrom = (bullets, x, y) => {
    const ship = new Ship({ x, y });
    const bullet = bullets.fire(ship);
    bullet.x = x;
    bullet.y = y;
    return bullet;
  };

  QUnit.test("a bullet inside a rock destroys the rock and is consumed", (assert) => {
    const field = new RockField();
    const bullets = new BulletSystem({ cooldown: 0 });
    field.spawn("large", 0, 0, { vx: 0, vy: 0 });
    fireFrom(bullets, 0.5, 0);

    const hits = field.collideBullets(bullets);

    assert.strictEqual(hits.length, 1);
    assert.strictEqual(hits[0].size, "large");
    assert.strictEqual(hits[0].points, RockField.SIZES.large.points);
    assert.strictEqual(bullets.bullets.length, 0, "the bullet is used up");
    assert.strictEqual(field.rocks.length, 2, "the rock split in two");
  });

  QUnit.test("a bullet that misses leaves everything alone", (assert) => {
    const field = new RockField();
    const bullets = new BulletSystem({ cooldown: 0 });
    field.spawn("large", 0, 0, { vx: 0, vy: 0 });
    fireFrom(bullets, 8, 4);

    const hits = field.collideBullets(bullets);

    assert.deepEqual(hits, []);
    assert.strictEqual(bullets.bullets.length, 1);
    assert.strictEqual(field.rocks.length, 1);
  });

  QUnit.test("each bullet can hit a different rock in the same frame", (assert) => {
    const field = new RockField();
    const bullets = new BulletSystem({ cooldown: 0 });
    field.spawn("small", -5, 0, { vx: 0, vy: 0 });
    field.spawn("small", 5, 0, { vx: 0, vy: 0 });
    fireFrom(bullets, -5, 0);
    fireFrom(bullets, 5, 0);

    const hits = field.collideBullets(bullets);

    assert.strictEqual(hits.length, 2);
    assert.strictEqual(bullets.bullets.length, 0);
    assert.strictEqual(field.rocks.length, 0, "small rocks leave nothing behind");
  });

  QUnit.test("two bullets in one rock only destroy it once", (assert) => {
    const field = new RockField();
    const bullets = new BulletSystem({ cooldown: 0 });
    field.spawn("small", 0, 0, { vx: 0, vy: 0 });
    fireFrom(bullets, 0, 0);
    fireFrom(bullets, 0.1, 0);

    const hits = field.collideBullets(bullets);

    assert.strictEqual(hits.length, 1);
    assert.strictEqual(bullets.bullets.length, 1, "the second bullet survives, with nothing left to hit");
  });
});
```

Notice these tests use a **real** `Ship` and `BulletSystem` (no scene, so no engine), so they check that the pieces really fit together.

### 7d. Rendering tests

And below that, tests for the drawing code with a stubbed `BABYLON`:

```js
QUnit.module("RockField rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeVector3 {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
    clone() {
      return new FakeVector3(this.x, this.y, this.z);
    }
  }

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    rotation = { x: 0, y: 0, z: 0 };
    color = null;
    disposed = false;

    constructor(points) {
      this.points = points;
    }
    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: { CreateLines: (name, options) => new FakeMesh(options.points) },
      Vector3: FakeVector3,
      Color3: { FromHexString: (hex) => hex },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("each rock gets a closed outline mesh", (assert) => {
    const field = new RockField({ scene: {}, vertices: 8, color: "#ff0000" });

    const rock = field.spawn("large", 1, 2);

    assert.ok(rock.mesh instanceof FakeMesh);
    assert.strictEqual(rock.mesh.points.length, 9, "8 corners plus a repeat of the first to close the loop");
    assert.strictEqual(rock.mesh.points[0].x, rock.mesh.points[8].x);
    assert.strictEqual(rock.mesh.points[0].y, rock.mesh.points[8].y);
    assert.strictEqual(rock.mesh.color, "#ff0000");
    assert.strictEqual(rock.mesh.position.x, 1);
    assert.strictEqual(rock.mesh.position.y, 2);
  });

  QUnit.test("no meshes are created when scene is omitted", (assert) => {
    assert.strictEqual(new RockField().spawn("large", 0, 0).mesh, null);
  });

  QUnit.test("update() keeps each mesh synced to position and spin", (assert) => {
    const field = new RockField({ scene: {} });
    const rock = field.spawn("large", 0, 0, { vx: 2, vy: 0 });
    rock.spin = 1;

    field.update(0.5, BOUNDS);

    assert.strictEqual(rock.mesh.position.x, 1);
    assert.strictEqual(rock.mesh.rotation.z, 0.5);
  });

  QUnit.test("destroy() disposes the rock's mesh and meshes the new pieces", (assert) => {
    const field = new RockField({ scene: {} });
    const rock = field.spawn("large", 0, 0);
    const mesh = rock.mesh;

    const { children } = field.destroy(rock);

    assert.true(mesh.disposed);
    assert.true(children.every((c) => c.mesh instanceof FakeMesh), "the pieces are drawn too");
  });

  QUnit.test("clear() disposes every mesh", (assert) => {
    const field = new RockField({ scene: {} });
    const meshes = [field.spawn("large", 0, 0).mesh, field.spawn("small", 1, 1).mesh];

    field.clear();

    assert.true(meshes.every((m) => m.disposed));
  });
});
```

### 7e. `Hud` tests

Put this in `tests/hud.tests.js`:

```js
QUnit.module("Hud", () => {
  QUnit.test("starts with a score of 0", (assert) => {
    assert.strictEqual(new Hud().score, 0);
  });

  QUnit.test("addScore() accumulates points", (assert) => {
    const hud = new Hud();

    hud.addScore(20);
    hud.addScore(100);

    assert.strictEqual(hud.score, 120);
  });

  QUnit.test("resetScore() returns to 0", (assert) => {
    const hud = new Hud();
    hud.addScore(50);

    hud.resetScore();

    assert.strictEqual(hud.score, 0);
  });
});

// Rendering only needs a few `BABYLON.GUI` pieces to exist, so these tests
// stub them out instead of loading the real engine.
QUnit.module("Hud rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeTextBlock {
    text = "";
    disposed = false;

    dispose() {
      this.disposed = true;
    }
  }

  class FakeUi {
    controls = [];

    addControl(control) {
      this.controls.push(control);
    }
    removeControl(control) {
      this.controls = this.controls.filter((c) => c !== control);
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      GUI: {
        TextBlock: FakeTextBlock,
        Control: { VERTICAL_ALIGNMENT_TOP: 0 },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("constructor adds a score label showing 0", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.strictEqual(ui.controls.length, 1);
    assert.strictEqual(hud.scoreLabel.text, "Score: 0");
  });

  QUnit.test("the label doesn't intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.scoreLabel.isHitTestVisible);
  });

  QUnit.test("addScore() and resetScore() keep the label in sync", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.addScore(150);
    assert.strictEqual(hud.scoreLabel.text, "Score: 150");

    hud.resetScore();
    assert.strictEqual(hud.scoreLabel.text, "Score: 0");
  });

  QUnit.test("dispose() removes and disposes the label", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    const label = hud.scoreLabel;

    hud.dispose();

    assert.true(label.disposed);
    assert.strictEqual(ui.controls.length, 0);
    assert.strictEqual(hud.scoreLabel, null);
  });

  QUnit.test("dispose() is a no-op when there's no label", (assert) => {
    const hud = new Hud();

    hud.dispose();

    assert.strictEqual(hud.scoreLabel, null);
  });
});
```

### 7f. `BulletSystem.remove()` tests

Add this to the **end** of `tests/bullets.tests.js`:

```js
QUnit.module("BulletSystem remove", () => {
  QUnit.test("remove() takes one bullet out of flight", (assert) => {
    const system = new BulletSystem({ cooldown: 0 });
    const first = system.fire(new Ship());
    const second = system.fire(new Ship());

    system.remove(first);

    assert.deepEqual(system.bullets, [second]);
  });

  QUnit.test("remove() ignores a bullet that is not in flight", (assert) => {
    const system = new BulletSystem({ cooldown: 0 });
    system.fire(new Ship());

    system.remove({ x: 0, y: 0, mesh: null });

    assert.strictEqual(system.bullets.length, 1);
  });

  QUnit.test("remove() frees a slot for a new shot", (assert) => {
    const system = new BulletSystem({ cooldown: 0, maxBullets: 1 });
    const bullet = system.fire(new Ship());
    assert.strictEqual(system.fire(new Ship()), null, "full");

    system.remove(bullet);

    assert.ok(system.fire(new Ship()));
  });
});
```

### 7g. Run them

Open `tests.html`. You should see **87 passing tests** in total: 4 wrap, 7 collision, 23 ship, 20 bullets, 25 rocks, 8 HUD. (If you added the diagonal muzzle test in the Bullets tutorial, that's 88.)

> **Try breaking something.** Change `splitsInto: "medium"` to `splitsInto: "small"` in the `large` row of `ROCK_SIZES`, then reload `tests.html` and see which tests catch it. Then change it back.

---

## Step 8 (optional): An explosion sound

Add a "bang" next to your "pew". It's built from noise, but filtered so it rumbles instead of hissing, and it changes pitch with the rock's size.

In `js/main.js`, add a second buffer variable under `fireBuffer`:

```js
let fireBuffer = null;
let bangBuffer = null;
```

In `initAudio()`, right after `fireBuffer = buffer;`, add:

```js
  // The explosion: white noise run through a simple low-pass filter (each
  // sample moves only 15% of the way toward the next random value, which
  // smooths away the harsh high frequencies), fading out over 0.4 seconds.
  const bangLength = Math.floor(sampleRate * 0.4);
  const bang = audioContext.createBuffer(1, bangLength, sampleRate);
  const bangData = bang.getChannelData(0);
  let smoothed = 0;
  for (let i = 0; i < bangLength; i++) {
    const t = i / sampleRate;
    smoothed += (Math.random() * 2 - 1 - smoothed) * 0.15;
    bangData[i] = smoothed * Math.exp(-t * 8) * 2;
  }

  bangBuffer = bang;
```

Below `playFireSound`, add the player:

```js
// Bigger rocks sound deeper: a lower playback rate slows the noise down.
const BANG_RATES = { large: 0.6, medium: 0.9, small: 1.3 };

const playBangSound = async (size) => {
  if (!audioEngine || !bangBuffer) return;

  const sound = await audioEngine.createSoundAsync("bang", bangBuffer, {
    volume: 0.5,
    playbackRate: BANG_RATES[size],
  });
  sound.onEndedObservable.add(() => sound.dispose());
  sound.play();
};
```

And play it for every rock that is hit, in the loop from Step 6:

```js
    for (const hit of rocks.collideBullets(bullets)) {
      hud.addScore(hit.points);
      playBangSound(hit.size);
    }
```

This is why `collideBullets` returns `size` in each hit. A large rock now booms low and a small one cracks high, from one buffer played at different speeds.

> **The filter in one line.** `smoothed += (noise - smoothed) * 0.15` moves a running value 15% of the way toward each new random sample. Fast random jumps get averaged away, so only slow wobbles (low frequencies) survive. Try `0.5` for a brighter crash and `0.05` for a deep rumble.

---

## Step 9: Publish the sample

**Gallery.** In the root `index.html`, find the Asteroids series and give "Asteroids Rocks" a `slug` and `tutorial: true`:

```js
          { slug: "asteroids_rocks", tutorial: true, title: "Asteroids Rocks", description: "Drifting rocks that split into smaller ones when shot, with scoring." },
```

**Root README.** Add a line to the Asteroids list in the top-level `README.md`.

**Series roadmap.** In `samples/asteroids/README.md`, link row 3 of the table to `asteroids_rocks/README.md`, and add the tutorial.

**Previous README.** In `samples/asteroids/asteroids_bullets/README.md`, change the "Next up" line to link to Asteroids Rocks.

**Sample README.** Add `samples/asteroids/asteroids_rocks/README.md`, using the Bullets README as a template. When you're ready, ask me and I'll draft it from your finished code.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Shared wrap rule, refactored under test | `wrapCoordinate`, used by ship, bullets, rocks |
| Circle-vs-circle collision | `circlesOverlap` |
| Data-driven game balance | `ROCK_SIZES` |
| Randomized outlines in polar coordinates | `RockField._attach` |
| Splitting with opposite headings | `RockField.destroy` |
| Collision between two systems | `RockField.collideBullets` |
| Injected randomness for testing | `random` option, `sequence()` in tests |
| 2D GUI over a 3D scene | `Hud`, `AdvancedDynamicTexture` |

## Challenges

1. **Different shapes.** Give every rock a different corner count, between 7 and 13.
2. **Heavier splits.** Let a large rock sometimes split into *three* medium ones.
3. **Speed bonus.** Score extra for a hit made at long range (the distance between the ship and the rock when it died).
4. **A rock-sized hint.** Colour the three sizes differently (a different `color` per size).

**Up next:** *Asteroids Lives* makes the rocks dangerous. It adds ship-vs-rock collision, respawning with brief invulnerability, and game over. It'll reuse `circlesOverlap` for the ship.
