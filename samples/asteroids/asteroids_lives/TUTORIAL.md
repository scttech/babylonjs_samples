# Tutorial: Adding Lives to Asteroids

In this tutorial you'll make the rocks from [Asteroids Rocks](../asteroids_rocks/README.md) dangerous. You write the code; this document tells you what to write and why.

By the end you'll have:

- Rocks that **hurt the ship**: touching one costs a life
- A **respawn** in the middle of the screen, with a few seconds of protection during which the ship blinks
- A **Game Over** screen when the last life is gone, and **R** to start again
- A lives display next to the score
- A small `Game` class that keeps the rules in one tested place
- Unit tests for all of it

**What you'll learn:** reusing a collision helper for a new pair of objects, simple game state, time-based invulnerability, blinking with a time-driven formula, derived properties (getters) versus methods, and updating existing tests when a class's behavior legitimately changes.

## Where you're starting

This folder is a copy of the finished Rocks sample, plus two empty placeholder files for the new code:

```
asteroids_lives/
├── index.html
├── tests.html
├── js/
│   ├── wrap.js, collision.js, ship.js, bullets.js,
│   │   rocks.js, hud.js, main.js        (from the Rocks sample)
│   └── game.js                          (placeholder -- Step 1)
└── tests/
    ├── wrap / collision / ship / bullets / rocks / hud .tests.js   (from the Rocks sample)
    └── game.tests.js                    (placeholder -- Step 1)
```

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Rocks sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` is never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Open `index.html` in a browser now to confirm the game still works. Open `tests.html` too and note how many tests pass; you'll watch that number grow. Keep the developer console open (F12) as you work.

---

## Step 1: The rules of the game

So far, nothing in the game can be *lost*. Before you add ways to lose, give the rules a home: how many lives are left, and is the game over?

You could keep that in two variables in `main.js`, but a tiny class is easy to test and easy to grow. Later steps will add waves and bonus lives to it.

Put this in `js/game.js`:

```js
// The rules of the game that aren't about any one object: how many lives the
// player has left, and whether the game is over. Keeping this in its own tiny
// class (instead of a couple of loose variables in main.js) means it can be
// unit tested, and later steps can grow it with waves and extra lives.
//
// It deliberately knows nothing about ships, rocks, or the screen. main.js
// decides what happens when a life is lost; this only keeps the count. See
// ../tests/game.tests.js.
class Game {
  constructor({ startingLives = 3 } = {}) {
    this.startingLives = startingLives;
    this.lives = startingLives;
  }

  // True once every life has been used up.
  get over() {
    return this.lives <= 0;
  }

  // Takes one life and returns how many remain. Does nothing once the game is
  // already over, so a stray extra call can't push the count below zero.
  loseLife() {
    if (this.over) return this.lives;
    this.lives -= 1;
    return this.lives;
  }

  // Starts a fresh game.
  reset() {
    this.lives = this.startingLives;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Game;
} else {
  window.Game = Game;
}
```

Things to notice:

- **`over` is a getter; `loseLife()` is a method.** `over` is a fact derived from `lives`, cheap and with no side effects, so it reads like a property: `game.over`. `loseLife()` *changes* something, so it's a method. (This is the same getter-versus-method judgment as `Ship.speed` versus `Ship.muzzle()`.) Because `over` is derived, it can never disagree with `lives`: there's no second variable to forget to update.
- **`loseLife()` returns the remaining count.** The caller gets the answer in the same call that changed it.
- **It knows nothing about the screen.** `Game` doesn't hide the ship or show a message. `main.js` will react to `game.over`. That keeps the rules testable on their own.

Test it. Put this in `tests/game.tests.js`:

```js
QUnit.module("Game", () => {
  QUnit.test("starts with three lives and the game not over", (assert) => {
    const game = new Game();

    assert.strictEqual(game.lives, 3);
    assert.false(game.over);
  });

  QUnit.test("the starting number of lives can be chosen", (assert) => {
    assert.strictEqual(new Game({ startingLives: 5 }).lives, 5);
  });

  QUnit.test("loseLife() takes one life and returns how many remain", (assert) => {
    const game = new Game();

    assert.strictEqual(game.loseLife(), 2);
    assert.strictEqual(game.lives, 2);
  });

  QUnit.test("the game is over once the last life is gone", (assert) => {
    const game = new Game({ startingLives: 2 });

    game.loseLife();
    assert.false(game.over, "one life left, still playing");

    game.loseLife();
    assert.true(game.over);
  });

  QUnit.test("lives never go below zero", (assert) => {
    const game = new Game({ startingLives: 1 });
    game.loseLife();

    assert.strictEqual(game.loseLife(), 0);
    assert.strictEqual(game.lives, 0);
  });

  QUnit.test("reset() restores the starting lives and ends the game-over state", (assert) => {
    const game = new Game();
    game.loseLife();
    game.loseLife();
    game.loseLife();
    assert.true(game.over);

    game.reset();

    assert.strictEqual(game.lives, 3);
    assert.false(game.over);
  });
});
```

Register both files in `tests.html`. Add the script next to the other scripts and the tests next to the other tests:

```html
  <script src="js/game.js"></script>
```
```html
  <script src="tests/game.tests.js"></script>
```

Reload `tests.html`: **6 more** tests, all green.

---

## Step 2: A ship that can be protected, and can disappear

When the ship loses a life it reappears in the middle of the screen, where a rock might be drifting. Without help, it would be hit again instantly. The classic fix is a few seconds of **invulnerability**, shown by blinking, so the player knows the ship is safe and can steer clear.

The ship also needs to disappear completely on game over. Both are about the ship's own state, so they go in `Ship`.

Open `js/ship.js`.

### 2a. New state

In the constructor, find `this.thrusting = false;` (the one just before `this.scene = null;`) and add two lines after it:

```js
    this.thrusting = false;
    this.invulnerableTime = 0; // seconds of protection left
    this.visible = true; // false hides the ship entirely (e.g. on game over)
```

### 2b. Count the protection down

In `update()`, find the end of the method:

```js
    this._syncMesh();
    this.thrusting = false; // must be re-asserted by thrust() every frame
```

and add the countdown just above it:

```js
    this.invulnerableTime = Math.max(0, this.invulnerableTime - dt);

    this._syncMesh();
    this.thrusting = false; // must be re-asserted by thrust() every frame
```

`Math.max(0, ...)` keeps the timer from going negative, so "is it still running?" can be a simple `> 0`.

### 2c. New methods

Add these to the class, just above the `// Current speed in world units/s.` comment (the `get speed()` getter):

```js
  // True while the ship is protected from rocks (just after respawning).
  get invulnerable() {
    return this.invulnerableTime > 0;
  }

  // Whether the ship should be drawn this instant. While protected it blinks
  // ten times a second, so the player can see it can't be hurt; a hidden ship
  // is never drawn.
  get drawn() {
    if (!this.visible) return false;
    if (!this.invulnerable) return true;
    return Math.floor(this.invulnerableTime * 10) % 2 === 0;
  }

  // Protects the ship from rocks for the given number of seconds.
  makeInvulnerable(seconds) {
    this.invulnerableTime = seconds;
    this._syncMesh();
  }

  // Back to the center at rest, and protected for a few seconds. This is what
  // happens after the ship loses a life.
  respawn(invulnerableSeconds = 3) {
    this.reset();
    this.makeInvulnerable(invulnerableSeconds);
  }

  // Shows or hides the ship entirely.
  setVisible(visible) {
    this.visible = visible;
    this._syncMesh();
  }
```

Things to notice:

- **Blinking from a formula, not a timer.** `Math.floor(invulnerableTime * 10) % 2 === 0` is true for 0.1 seconds, false for the next 0.1, and so on, as the countdown falls. There's no separate "blink" variable or `setInterval` to manage, so the blink can never drift out of step with the protection, and a test can pick any moment and know the answer.
- **`invulnerable` and `drawn` are getters,** derived from `invulnerableTime` and `visible`. `makeInvulnerable`, `respawn` and `setVisible` are methods because they change state.
- **`respawn()` reuses `reset()`.** It doesn't repeat the code that puts the ship back in the middle.

### 2d. `reset()` clears both

`reset()` is what **R** uses to start over, so it has to remove any protection and bring a hidden ship back. Find it:

```js
    this.angle = 0;
    this.thrusting = false;
    this._syncMesh();
```

and add two lines:

```js
    this.angle = 0;
    this.thrusting = false;
    this.invulnerableTime = 0;
    this.visible = true;
    this._syncMesh();
```

### 2e. Draw it

At the bottom of the class, `_syncMesh()` currently ends with a line that shows the flame only while thrusting:

```js
    this.flame.isVisible = this.thrusting;
```

Replace that one line with:

```js
    const drawn = this.drawn;
    this.mesh.isVisible = drawn;
    this.flame.isVisible = drawn && this.thrusting;
```

> **Why handle the flame separately?** The flame is a child of the hull, but a mesh's `isVisible` only affects that one mesh, not its children. If you only hid the hull, a flame would float in space while the ship blinked.

### 2f. Tests

Add this to the **end** of `tests/ship.tests.js`:

```js
QUnit.module("Ship invulnerability", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  QUnit.test("starts vulnerable and visible", (assert) => {
    const ship = new Ship();

    assert.false(ship.invulnerable);
    assert.true(ship.visible);
    assert.true(ship.drawn);
  });

  QUnit.test("makeInvulnerable() protects the ship for the given time", (assert) => {
    const ship = new Ship();

    ship.makeInvulnerable(2);

    assert.true(ship.invulnerable);
    assert.strictEqual(ship.invulnerableTime, 2);
  });

  QUnit.test("update() counts the protection down until it ends", (assert) => {
    const ship = new Ship();
    ship.makeInvulnerable(1);

    ship.update(0.4, BOUNDS);
    assert.true(ship.invulnerable, "still protected after 0.4s");
    assert.true(Math.abs(ship.invulnerableTime - 0.6) < 1e-9);

    ship.update(0.7, BOUNDS);
    assert.false(ship.invulnerable, "protection has run out");
    assert.strictEqual(ship.invulnerableTime, 0, "and the timer stops at zero, not below");
  });

  QUnit.test("respawn() puts the ship back in the middle, at rest, and protected", (assert) => {
    const ship = new Ship({ x: 3, y: 4 });
    ship.vx = 5;
    ship.vy = 5;
    ship.angle = 1;

    ship.respawn(2.5);

    assert.strictEqual(ship.x, 0);
    assert.strictEqual(ship.y, 0);
    assert.strictEqual(ship.speed, 0);
    assert.strictEqual(ship.angle, 0);
    assert.strictEqual(ship.invulnerableTime, 2.5);
  });

  QUnit.test("respawn() protects for 3 seconds unless told otherwise", (assert) => {
    const ship = new Ship();

    ship.respawn();

    assert.strictEqual(ship.invulnerableTime, 3);
  });

  QUnit.test("reset() clears protection and shows the ship again", (assert) => {
    const ship = new Ship();
    ship.makeInvulnerable(5);
    ship.setVisible(false);

    ship.reset();

    assert.false(ship.invulnerable);
    assert.true(ship.visible);
  });

  QUnit.test("a protected ship blinks: ten flips a second", (assert) => {
    const ship = new Ship();

    ship.invulnerableTime = 1.0;
    assert.true(ship.drawn, "1.0s left: drawn");
    ship.invulnerableTime = 0.95;
    assert.false(ship.drawn, "0.95s left: blinked off");
    ship.invulnerableTime = 0.85;
    assert.true(ship.drawn, "0.85s left: back on");
  });

  QUnit.test("a hidden ship is never drawn, protected or not", (assert) => {
    const ship = new Ship();

    ship.setVisible(false);
    assert.false(ship.drawn);

    ship.invulnerableTime = 1.0; // a moment in the blink cycle that would be "on"
    assert.false(ship.drawn);
  });
});

QUnit.module("Ship visibility rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    rotation = { x: 0, y: 0, z: 0 };
    color = null;
    parent = null;
    isVisible = true;

    dispose() {}
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: { CreateLines: () => new FakeMesh() },
      Vector3: class {},
      Color3: { FromHexString: (hex) => hex },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("setVisible(false) hides the hull and the flame", (assert) => {
    const ship = new Ship({ scene: {} });
    ship.thrust(0.1); // the flame would normally be showing

    ship.setVisible(false);

    assert.false(ship.mesh.isVisible);
    assert.false(ship.flame.isVisible);
  });

  QUnit.test("the hull follows the blink while protected", (assert) => {
    const ship = new Ship({ scene: {} });

    ship.makeInvulnerable(1.0);
    assert.true(ship.mesh.isVisible, "on at the start of the blink cycle");

    ship.update(0.05, BOUNDS); // 0.95s left
    assert.false(ship.mesh.isVisible, "off in the next half-cycle");
  });

  QUnit.test("the flame never shows while the hull is blinked off", (assert) => {
    const ship = new Ship({ scene: {} });
    ship.makeInvulnerable(1.0);

    ship.thrust(0.1);
    ship.update(0.05, BOUNDS); // 0.95s left: hull off

    assert.false(ship.flame.isVisible);
  });
});
```

Reload `tests.html`. All the old ship tests should still pass (you changed `reset()` and `_syncMesh()`, so that's worth checking) and there are **11 more** green tests.

---

## Step 3: Ship against rocks

The ship needs to ask: "am I touching a rock?" You already have everything for it: `circlesOverlap`, and a ship with a `radius`. Bullets already ask the same question of the rocks, in `collideBullets`. Rather than write that search a second time, pull it into a method both can use.

Open `js/rocks.js` and add this method to `RockField`, just above `collideBullets`:

```js
  // Returns the first rock that overlaps the given circle, or null if none
  // does. Bullets use it, and so does the ship.
  findCollision(x, y, radius) {
    return this.rocks.find((r) => circlesOverlap(x, y, radius, r.x, r.y, r.radius)) || null;
  }
```

Then make `collideBullets` use it. Inside its loop, find:

```js
      const rock = this.rocks.find((r) => circlesOverlap(bullet.x, bullet.y, bulletSystem.radius, r.x, r.y, r.radius));
```

and replace it with:

```js
      const rock = this.findCollision(bullet.x, bullet.y, bulletSystem.radius);
```

Things to notice:

- **A refactor again.** Bullets behave exactly as before. The existing bullet-collision tests prove it. Reload `tests.html` to check.
- It takes a plain `(x, y, radius)` rather than a ship or a bullet, so it works for anything that is "a circle": the ship now, the UFO's bullets later.
- `|| null` turns `find`'s `undefined` into an explicit `null`, so "nothing hit" is an answer you can compare against.

Add this to the **end** of `tests/rocks.tests.js`:

```js
QUnit.module("RockField findCollision", () => {
  QUnit.test("returns the rock a circle overlaps", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 0, 0, { vx: 0, vy: 0 });

    assert.strictEqual(field.findCollision(0.5, 0, 0.1), rock);
  });

  QUnit.test("returns null when nothing overlaps", (assert) => {
    const field = new RockField();
    field.spawn("large", 0, 0, { vx: 0, vy: 0 });

    assert.strictEqual(field.findCollision(8, 4, 0.5), null);
  });

  QUnit.test("counts the circle's own radius, not just its center", (assert) => {
    const field = new RockField();
    field.spawn("large", 0, 0, { vx: 0, vy: 0 }); // radius 1.2

    assert.strictEqual(field.findCollision(2, 0, 0.1), null, "a tiny circle at distance 2 misses");
    assert.ok(field.findCollision(2, 0, 1), "a bigger circle at the same spot hits");
  });

  QUnit.test("picks a rock when several overlap", (assert) => {
    const field = new RockField();
    const a = field.spawn("large", 0, 0, { vx: 0, vy: 0 });
    const b = field.spawn("large", 0.5, 0, { vx: 0, vy: 0 });

    assert.true([a, b].includes(field.findCollision(0.25, 0, 0.1)));
  });

  QUnit.test("an empty field has nothing to hit", (assert) => {
    assert.strictEqual(new RockField().findCollision(0, 0, 5), null);
  });
});
```

Reload `tests.html`: **5 more** tests.

---

## Step 4: Lives and Game Over on the screen

The `Hud` shows a score. It now also needs a lives counter and a "Game Over" message.

Open `js/hud.js`.

### 4a. Constructor

Replace the constructor with this version. The changes are the `lives` option, the `this.lives` field, and the two new label fields:

```js
  constructor({ ui = null, lives = 0 } = {}) {
    this.score = 0;
    this.lives = lives;

    this.ui = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.gameOverLabel = null;
    if (ui) {
      this.attachTo(ui);
    }
  }
```

### 4b. Create the two new labels

In `attachTo()`, find the end:

```js
    this.ui.addControl(this.scoreLabel);

    this._syncLabel();
    return this;
```

and insert the two new labels between them, so it becomes:

```js
    this.ui.addControl(this.scoreLabel);

    this.livesLabel = new BABYLON.GUI.TextBlock();
    this.livesLabel.height = "30px";
    this.livesLabel.color = "white";
    this.livesLabel.fontSize = 24;
    this.livesLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.livesLabel.top = "86px"; // just below the score
    this.livesLabel.isHitTestVisible = false;
    this.ui.addControl(this.livesLabel);

    // A TextBlock keeps the GUI's default center alignment unless told
    // otherwise, so this lands in the middle of the screen. The \n starts a
    // second line.
    this.gameOverLabel = new BABYLON.GUI.TextBlock();
    this.gameOverLabel.text = "GAME OVER\nPress R to restart";
    this.gameOverLabel.color = "white";
    this.gameOverLabel.fontSize = 48;
    this.gameOverLabel.outlineWidth = 6;
    this.gameOverLabel.outlineColor = "#050508";
    this.gameOverLabel.isVisible = false;
    this.gameOverLabel.isHitTestVisible = false;
    this.ui.addControl(this.gameOverLabel);

    this._syncLabel();
    return this;
```

Things to notice:

- The score sits at `56px` from the top; the lives label at `86px` is one 30px row below it.
- **The Game Over message has no `verticalAlignment`**, so it keeps the default centering. The two lines come from the `\n` inside the string.
- `isVisible = false` hides it until the game ends. `isHitTestVisible = false` is the same lesson as the score label: a text block with no explicit size fills its parent, and would otherwise intercept clicks.
- `outlineWidth`/`outlineColor` keep large text readable when a rock drifts behind it.

### 4c. Dispose all three labels

Replace `dispose()` with:

```js
  // Removes and disposes the labels, if attached.
  dispose() {
    if (!this.scoreLabel) return;
    for (const label of [this.scoreLabel, this.livesLabel, this.gameOverLabel]) {
      this.ui.removeControl(label);
      label.dispose();
    }
    this.ui = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.gameOverLabel = null;
  }
```

### 4d. The new methods

Replace the existing `resetScore()` and `_syncLabel()` (the last two methods in the class) with these four methods plus the updated `_syncLabel()`:

```js
  resetScore() {
    this.score = 0;
    this._syncLabel();
  }

  // Shows how many lives are left.
  setLives(lives) {
    this.lives = lives;
    this._syncLabel();
  }

  showGameOver() {
    if (this.gameOverLabel) this.gameOverLabel.isVisible = true;
  }

  hideGameOver() {
    if (this.gameOverLabel) this.gameOverLabel.isVisible = false;
  }

  _syncLabel() {
    if (!this.scoreLabel) return;
    this.scoreLabel.text = `Score: ${this.score}`;
    this.livesLabel.text = `Lives: ${this.lives}`;
  }
```

### 4e. Tests (and one that has to change)

Adding labels changes what the HUD does, so one existing test is now out of date. In `tests/hud.tests.js`, find this test:

```js
  QUnit.test("constructor adds a score label showing 0", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.strictEqual(ui.controls.length, 1);
    assert.strictEqual(hud.scoreLabel.text, "Score: 0");
  });
```

Reload `tests.html` first and you'll see it fail: the HUD now adds **three** controls, not one. That's a *good* failure: the test is telling you exactly what changed. **Edit that test in place** (don't paste a second copy of it). Change just the one line:

```js
    assert.strictEqual(ui.controls.length, 3, "score, lives, and game over");
```

Now add new tests. In the first module (`QUnit.module("Hud", ...)`), add this as its last test:

```js
  QUnit.test("remembers the lives it is told about", (assert) => {
    const hud = new Hud({ lives: 3 });
    assert.strictEqual(hud.lives, 3);

    hud.setLives(2);
    assert.strictEqual(hud.lives, 2);
  });
```

The remaining four tests use `FakeUi`, which only exists *inside* the `Hud rendering` module, so they must go inside it too. Add them after that module's last test (`dispose() is a no-op when there's no label`) and **before** the `});` that closes the module, which is the last line of the file. When you're done the file should end with your last new test followed by that one `});`:

```js
  QUnit.test("shows the lives remaining", (assert) => {
    const hud = new Hud({ ui: new FakeUi(), lives: 3 });
    assert.strictEqual(hud.livesLabel.text, "Lives: 3");

    hud.setLives(1);
    assert.strictEqual(hud.livesLabel.text, "Lives: 1");
  });

  QUnit.test("the game over message starts hidden and can be shown and hidden", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.false(hud.gameOverLabel.isVisible, "hidden to begin with");

    hud.showGameOver();
    assert.true(hud.gameOverLabel.isVisible);

    hud.hideGameOver();
    assert.false(hud.gameOverLabel.isVisible);
  });

  QUnit.test("the game over message doesn't intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.gameOverLabel.isHitTestVisible);
  });

  QUnit.test("showing and hiding game over without a ui does nothing", (assert) => {
    const hud = new Hud();

    hud.showGameOver();
    hud.hideGameOver();

    assert.strictEqual(hud.gameOverLabel, null);
  });
```

The existing `dispose()` test (which expects zero controls left) should still pass, which confirms that all three labels are removed.

Reload `tests.html`: **5 more** tests, all green.

---

## Step 5: Wire it together

Now make the page use all of it.

### 5a. `index.html`

Add `game.js` to the script list, with the other classes and before `main.js`:

```html
  <script src="js/hud.js"></script>
  <script src="js/game.js"></script>
  <script src="js/main.js"></script>
```

(Add the one `game.js` line; don't add a second copy of the others.)

### 5b. `js/main.js`

Make these changes.

**1.** Add a constant next to the other tuning values:

```js
const RESPAWN_PROTECTION = 3; // seconds the ship can't be hurt after losing a life
```

**2.** Create the `Game`, and give the HUD the starting lives. Find `const hud = new Hud({ ui });` and replace it with:

```js
  const game = new Game();
  const hud = new Hud({ ui, lives: game.lives });
```

**3.** Add the `crash` function. Put it right after `populateRocks();`, before the "Held-key input" comment:

```js
  // The ship hit a rock: the rock breaks apart (and scores) as if it had been
  // shot, and the player loses a life -- then either respawns, protected for a
  // few seconds, or the game ends.
  const crash = (rock) => {
    const { size } = rock;
    hud.addScore(rocks.destroy(rock).points);
    playBangSound(size);

    hud.setLives(game.loseLife());
    playBangSound("large");
    if (game.over) {
      ship.setVisible(false);
      hud.showGameOver();
    } else {
      ship.respawn(RESPAWN_PROTECTION);
    }
  };
```

Things to notice:

- **Ramming a rock destroys it** (and scores it), as in the arcade original. The rock splits like any other, so crashing into a large one leaves two medium rocks near where you were. The size is saved first, because `destroy()` removes the rock from the field.
- Two explosions play: the rock's, and a deep "large" one for the ship.
- `game.loseLife()` returns the remaining count, which goes straight to the HUD.
- `game.over` is the single place the rest of the code asks "is it over?"

**4.** Make **R** restart everything. In the `KeyR` branch of the `keydown` handler, add three lines after `hud.resetScore();`:

```js
    if (event.code === "KeyR") {
      ship.reset();
      bullets.clear();
      rocks.clear();
      hud.resetScore();
      game.reset();
      hud.setLives(game.lives);
      hud.hideGameOver();
      populateRocks();
      return;
    }
```

`ship.reset()` already brings back a hidden ship (Step 2d).

**5.** Make steering and firing stop when the game is over. In the `onBeforeRenderObservable` callback, find this block:

```js
    // Holding both turn keys cancels out, as in the original.
    const turn = (anyHeld(LEFT_KEYS) ? 1 : 0) - (anyHeld(RIGHT_KEYS) ? 1 : 0);
    if (turn !== 0) ship.rotate(turn, dt);
    if (anyHeld(THRUST_KEYS)) ship.thrust(dt);

    ship.update(dt, bounds);

    // Fire after the ship has moved this frame, so bullets spawn at the
    // nose's current position. Holding Space auto-fires; the system's own
    // cooldown and bullet cap set the pace.
    if (anyHeld(FIRE_KEYS) && bullets.fire(ship)) playFireSound();
```

and wrap the whole of it in an `if (!game.over)`:

```js
    // Once the game is over there's no ship to steer or fire; the rocks and
    // any bullets already in flight carry on.
    if (!game.over) {
      // Holding both turn keys cancels out, as in the original.
      const turn = (anyHeld(LEFT_KEYS) ? 1 : 0) - (anyHeld(RIGHT_KEYS) ? 1 : 0);
      if (turn !== 0) ship.rotate(turn, dt);
      if (anyHeld(THRUST_KEYS)) ship.thrust(dt);

      ship.update(dt, bounds);

      // Fire after the ship has moved this frame, so bullets spawn at the
      // nose's current position. Holding Space auto-fires; the system's own
      // cooldown and bullet cap set the pace.
      if (anyHeld(FIRE_KEYS) && bullets.fire(ship)) playFireSound();
    }
```

**6.** Check for crashes. Just above the `// Everything shot? Bring in a fresh set.` comment (after the bullet-hit loop), add:

```js
    // A protected ship (just respawned) passes through rocks harmlessly.
    if (!game.over && !ship.invulnerable) {
      const rock = rocks.findCollision(ship.x, ship.y, ship.radius);
      if (rock) crash(rock);
    }
```

### 5c. Try it

Reload `index.html`:

- [ ] The HUD shows **Score: 0** and, below it, **Lives: 3**
- [ ] Flying into a rock breaks the rock, adds its points, and drops Lives to 2
- [ ] The ship reappears in the middle, **blinking** for about 3 seconds, and rocks pass through it harmlessly while it blinks
- [ ] When the blinking stops, rocks can hurt it again
- [ ] After the third crash the ship disappears and **GAME OVER / Press R to restart** shows in the middle
- [ ] In Game Over the rocks keep drifting, and the keys do nothing
- [ ] **R** restarts: score 0, lives 3, a visible ship, fresh rocks, message gone
- [ ] Shooting rocks still works exactly as before

**If something's wrong:** `Game is not defined` means the script tag from 5a is missing; `ship.respawn is not a function` or `rocks.findCollision is not a function` means Step 2c or Step 3 didn't land.

**Experiments** (change one, reload, then change it back):

- `new Game({ startingLives: 1 })` for a sudden-death game
- `RESPAWN_PROTECTION = 10` to see a long blink
- Change `% 2` to `% 3` in `drawn` and see how the blink pattern changes (and which tests catch it)
- Comment out `ship.setVisible(false)` and watch a "dead" ship keep sitting on screen

---

## Step 6: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="js/wrap.js"></script>
  <script src="js/collision.js"></script>
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="js/rocks.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/game.js"></script>
  <script src="tests/wrap.tests.js"></script>
  <script src="tests/collision.tests.js"></script>
  <script src="tests/ship.tests.js"></script>
  <script src="tests/bullets.tests.js"></script>
  <script src="tests/rocks.tests.js"></script>
  <script src="tests/hud.tests.js"></script>
  <script src="tests/game.tests.js"></script>
```

Open it. You should see **114 passing tests** in total (115 if you added the diagonal muzzle test in the Bullets tutorial): the 87 you started with, plus 6 for `Game`, 11 for the ship, 5 for `findCollision`, and 5 for the HUD.

> **Try breaking something.** Change `% 2 === 0` to `% 2 === 1` in `Ship.drawn`, reload `tests.html`, and see which tests notice. Then put it back.

---

## Step 7: Publish the sample

**Gallery.** In the root `index.html`, find the Asteroids series and give "Asteroids Lives" a `slug` and `tutorial: true`:

```js
          { slug: "asteroids_lives", tutorial: true, title: "Asteroids Lives", description: "Rocks now hurt: three lives, a blinking protected respawn, and a Game Over screen." },
```

**Root README.** Add a line to the Asteroids list in the top-level `README.md`.

**Series roadmap.** In `samples/asteroids/README.md`, link row 4 of the table to `asteroids_lives/README.md` and its tutorial.

**Previous README.** In `samples/asteroids/asteroids_rocks/README.md`, change the "Next up" line to link to Asteroids Lives.

**Sample README.** Add `samples/asteroids/asteroids_lives/README.md`, using the Rocks README as a template. When you're ready, ask me and I'll draft it from your finished code.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Game rules separate from objects and screen | `Game` |
| Derived values as getters, changes as methods | `over`, `invulnerable`, `drawn` vs `loseLife`, `respawn` |
| Time-based protection and a formula-driven blink | `invulnerableTime`, `drawn` |
| Reusing a collision helper for a new pair | `RockField.findCollision` |
| A failing test that's right | the HUD control count, 1 to 3 |
| Visibility of parent and child meshes | `_syncMesh` |
| Centered, multi-line GUI text | `gameOverLabel` |

## Challenges

1. **A safer respawn.** Wait until the middle of the screen is clear of rocks before the ship comes back, instead of relying only on protection. (Hint: `findCollision` with a bigger radius.)
2. **Bonus lives.** Award an extra life every 10,000 points. (Hint: `Game` is the right home for this.)
3. **Show the lives as little ships** instead of a number.
4. **A short pause on death**, with the ship broken into flying line segments, before the respawn.

**Up next:** *Asteroids Waves* replaces the "four new rocks when you clear the screen" stand-in with real waves: each one bigger and faster than the last, with a safe spawn distance and a "Wave N" announcement.
