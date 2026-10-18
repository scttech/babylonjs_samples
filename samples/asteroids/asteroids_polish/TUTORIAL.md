# Tutorial: Polishing Asteroids

In this tutorial you'll turn [Asteroids UFO](../asteroids_ufo/README.md) from a working game into one that *feels* finished. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **title screen**: the game waits for you, with rocks drifting behind the title, until you click or press Enter
- **Pause** with **P**, which freezes everything and silences the UFO siren
- **Particle explosions** for rocks, the UFO and the ship
- **Hyperspace** on **H**: a risky jump to a random spot, with a flash of blue at both ends
- *(Optional)* a looping **thrust rumble** while the engine is firing
- Unit tests for all of it

**What you'll learn:** a game-state machine (title, playing, paused, over) and how to gate a frame loop on it, a derived `playing` flag instead of repeated condition checks, `BABYLON.ParticleSystem` for one-shot bursts, a risky action with a cooldown and an injectable dice roll, why user gestures matter for audio, and seamless looping sounds.

## Where you're starting

This folder is a copy of the finished UFO sample, plus two empty placeholder files for the new code:

```
asteroids_polish/
├── index.html
├── tests.html
├── js/
│   ├── wrap.js, collision.js, aim.js, ship.js, bullets.js, rocks.js,
│   │   hud.js, game.js, waves.js, ufo.js, main.js     (from the UFO sample)
│   └── explosions.js                                    (placeholder -- Step 3)
└── tests/
    ├── wrap / collision / aim / ship / bullets / rocks / hud / game / waves / ufo .tests.js   (from the UFO sample)
    └── explosions.tests.js                              (placeholder -- Step 3)
```

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the UFO sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` is never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Open `index.html` in a browser now to confirm the game still works. Open `tests.html` too and note how many tests pass; you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. That way the file is valid JavaScript after every step, and you can reload the page or the tests at any point.

---

## Step 1: Game states

The game currently has one state: *playing* (or *over*). A title screen and a pause add two more, so the code needs a clear answer to "is the game running right now?". `Game` already tracks lives, so it's the natural home.

Open `js/game.js`.

### 1a. New state

In the constructor, add two fields after `this.lives = startingLives;`:

```js
    this.started = false; // false until the player leaves the title screen
    this.paused = false;
```

### 1b. New methods

Replace the existing `reset()` method (the last method in the class, with the comment `// Starts a fresh game.` above it) with all of these, inside the class, above its closing `}`:

```js
  // True while the game is actually running: started, not paused, not over.
  get playing() {
    return this.started && !this.paused && !this.over;
  }

  // Leaves the title screen and begins a fresh game.
  start() {
    this.started = true;
    this.reset();
  }

  // Pauses or resumes, and returns whether the game is now paused. There's
  // nothing to pause on the title screen or after the game is over, so it does
  // nothing then.
  togglePause() {
    if (!this.started || this.over) return this.paused;
    this.paused = !this.paused;
    return this.paused;
  }

  // Starts the lives and pause state over. It doesn't go back to the title
  // screen: once started, the game stays started.
  reset() {
    this.lives = this.startingLives;
    this.paused = false;
  }
```

Things to notice:

- **`playing` is derived.** `started && !paused && !over` says in one place what "the game is running" means. Without it, every part of `main.js` that cares would repeat that three-part condition, and one of them would eventually get it wrong. It's a getter for the same reason `over` is: it's a fact computed from other state, with no side effects.
- **`togglePause()` returns the new state**, so the caller can show or hide the PAUSED message without asking again. It ignores the request before the game starts and after it ends, since neither can be paused.
- **`reset()` doesn't go back to the title screen.** Once you've started, R restarts the game, but you don't see the title again. That's why `start()` is a separate method that sets `started` and then calls `reset()`.

### 1c. Tests

Add this to the **end** of `tests/game.tests.js`:

```js
QUnit.module("Game start and pause", () => {
  QUnit.test("begins on the title screen: not started, not playing", (assert) => {
    const game = new Game();

    assert.false(game.started);
    assert.false(game.paused);
    assert.false(game.playing);
  });

  QUnit.test("start() leaves the title screen and begins playing", (assert) => {
    const game = new Game();

    game.start();

    assert.true(game.started);
    assert.true(game.playing);
  });

  QUnit.test("start() gives a fresh set of lives", (assert) => {
    const game = new Game();
    game.loseLife();

    game.start();

    assert.strictEqual(game.lives, 3);
  });

  QUnit.test("togglePause() pauses and resumes, and says which", (assert) => {
    const game = new Game();
    game.start();

    assert.true(game.togglePause());
    assert.true(game.paused);
    assert.false(game.playing, "paused is not playing");

    assert.false(game.togglePause());
    assert.false(game.paused);
    assert.true(game.playing);
  });

  QUnit.test("there's nothing to pause on the title screen", (assert) => {
    const game = new Game();

    assert.false(game.togglePause());
    assert.false(game.paused);
  });

  QUnit.test("there's nothing to pause once the game is over", (assert) => {
    const game = new Game({ startingLives: 1 });
    game.start();
    game.loseLife();

    assert.false(game.togglePause());
    assert.false(game.paused);
    assert.false(game.playing, "over is not playing");
  });

  QUnit.test("reset() resumes a paused game but doesn't go back to the title screen", (assert) => {
    const game = new Game();
    game.start();
    game.togglePause();

    game.reset();

    assert.false(game.paused);
    assert.true(game.started);
    assert.true(game.playing);
  });
});
```

Reload `tests.html`: **7 more** tests, all green.

---

## Step 2: Title and pause messages

The `Hud` needs two more centered messages, like the Game Over and wave announcements: the title and PAUSED. They follow the exact same pattern, so this step is quick.

Open `js/hud.js`.

### 2a. Fields

In the constructor, add two fields after `this.announcementLabel = null;`:

```js
    this.titleLabel = null;
    this.pausedLabel = null;
```

### 2b. Create the labels

In `attachTo()`, directly after `this.ui.addControl(this.announcementLabel);`, add:

```js
    // The title screen, shown until the player starts.
    this.titleLabel = new BABYLON.GUI.TextBlock();
    this.titleLabel.text = "ASTEROIDS\nClick or press Enter to start";
    this.titleLabel.color = "white";
    this.titleLabel.fontSize = 48;
    this.titleLabel.outlineWidth = 6;
    this.titleLabel.outlineColor = "#050508";
    this.titleLabel.isVisible = false;
    this.titleLabel.isHitTestVisible = false;
    this.ui.addControl(this.titleLabel);

    this.pausedLabel = new BABYLON.GUI.TextBlock();
    this.pausedLabel.text = "PAUSED";
    this.pausedLabel.color = "white";
    this.pausedLabel.fontSize = 48;
    this.pausedLabel.outlineWidth = 6;
    this.pausedLabel.outlineColor = "#050508";
    this.pausedLabel.isVisible = false;
    this.pausedLabel.isHitTestVisible = false;
    this.ui.addControl(this.pausedLabel);
```

### 2c. Dispose

In `dispose()`, the list of labels in the `for` loop gains the two new ones. Replace the `for (...) {` line with:

```js
    for (const label of [
      this.scoreLabel,
      this.livesLabel,
      this.waveLabel,
      this.gameOverLabel,
      this.announcementLabel,
      this.titleLabel,
      this.pausedLabel,
    ]) {
```

and add two lines to the end of the nulling block, below `this.announcementLabel = null;`:

```js
    this.titleLabel = null;
    this.pausedLabel = null;
```

### 2d. Show and hide

Add these methods inside the class, just above `showGameOver()`:

```js
  showTitle() {
    if (this.titleLabel) this.titleLabel.isVisible = true;
  }

  hideTitle() {
    if (this.titleLabel) this.titleLabel.isVisible = false;
  }

  showPaused() {
    if (this.pausedLabel) this.pausedLabel.isVisible = true;
  }

  hidePaused() {
    if (this.pausedLabel) this.pausedLabel.isVisible = false;
  }
```

### 2e. Tests (and the control count, a third time)

The HUD now creates **seven** controls. Reload `tests.html` and the same test fails again. Edit it in place (don't paste a second copy):

```js
    assert.strictEqual(ui.controls.length, 7, "score, lives, wave, game over, announcement, title, and paused");
```

Then add these tests at the end of the **`Hud rendering`** module, after its last test and before the `});` that closes it (the last line of the file). They use `FakeUi`, which only exists inside that module:

```js
  QUnit.test("the title screen and the paused message start hidden and can be shown and hidden", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.false(hud.titleLabel.isVisible, "title hidden to begin with");
    assert.false(hud.pausedLabel.isVisible, "paused hidden to begin with");

    hud.showTitle();
    hud.showPaused();
    assert.true(hud.titleLabel.isVisible);
    assert.true(hud.pausedLabel.isVisible);

    hud.hideTitle();
    hud.hidePaused();
    assert.false(hud.titleLabel.isVisible);
    assert.false(hud.pausedLabel.isVisible);
  });

  QUnit.test("the title screen invites the player to start", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.true(hud.titleLabel.text.includes("ASTEROIDS"));
    assert.true(hud.titleLabel.text.includes("Enter"));
  });

  QUnit.test("neither message intercepts pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.titleLabel.isHitTestVisible);
    assert.false(hud.pausedLabel.isHitTestVisible);
  });

  QUnit.test("showing the title or paused message without a ui does nothing", (assert) => {
    const hud = new Hud();

    hud.showTitle();
    hud.hideTitle();
    hud.showPaused();
    hud.hidePaused();

    assert.strictEqual(hud.titleLabel, null);
    assert.strictEqual(hud.pausedLabel, null);
  });
```

Reload `tests.html`: **4 more** tests, all green.

---

## Step 3: Explosions

When a rock breaks it should *burst*. Babylon.js has a particle system built for exactly this, the same `BABYLON.ParticleSystem` you used for the Breakout sparks. You start a burst, Babylon moves and fades every particle, and you throw the burst away when it's done.

The new class is `Explosions`. Put a skeleton in `js/explosions.js` first: the whole class, **complete and closed**, with just a constructor. The footer at the bottom makes it available to the game and the tests, just like every other class.

### 3a. The class

```js
// Particle bursts for things that blow up: rocks, the UFO, the ship, and the
// flash when the ship jumps through hyperspace. Each burst is a one-shot
// BABYLON.ParticleSystem; Babylon's own particle engine moves and fades every
// particle, so this class only has to start a burst in the right place and
// throw it away once it has finished.
//
// The same idea as SparkSystem in the Breakout series, minus gravity (this is
// space) and aimed in every direction instead of in a fan. `BABYLON` is only
// touched when `scene` is supplied, so tests stub it out. See
// ../tests/explosions.tests.js.
class Explosions {
  constructor({
    scene = null,
    colors = ["#ffffff", "#ffb347"], // the two colors a burst's particles are tinted between
    maxParticles = 120, // the most a single burst may use
    minLifeTime = 0.4, // seconds
    maxLifeTime = 0.9,
  } = {}) {
    this.scene = scene;
    this.colors = colors;
    this.maxParticles = maxParticles;
    this.minLifeTime = minLifeTime;
    this.maxLifeTime = maxLifeTime;
    this.systems = [];
    this._texture = scene ? this._createTexture(scene) : null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Explosions;
} else {
  window.Explosions = Explosions;
}
```

Things to notice:

- **`colors` is a pair.** Each particle is randomly tinted between the two, and fades to transparent in the second. White-to-orange is a classic fireball. Callers can override the pair for a single burst, which is how the UFO gets red and hyperspace gets blue.
- `maxParticles` caps a burst, so one enormous explosion can't swamp the frame rate.
- The constructor creates the **shared glow texture** only if there's a scene (`scene ? ... : null`), the usual rule that `BABYLON` is only touched when a scene is supplied. It calls `_createTexture`, which you add in 3e. That's safe for now: nothing creates an `Explosions` with a scene until Step 5, so the call never runs before the method exists.

The next four pieces all go **inside the class**, below the constructor and above its closing `}`, in this order.

### 3b. Starting a burst

```js
  // Starts a burst at (x, y). `scale` sizes it: 1 is a medium rock, 0.5 a tiny
  // flash, 2 the ship. Bigger bursts have more particles that fly a little
  // faster. `colors` can override the pair of tint colors for this burst only.
  // Does nothing unless a scene was supplied.
  spawn(x, y, scale = 1, colors = this.colors) {
    if (!this.scene) return;

    const count = Math.min(Math.round(16 * scale), this.maxParticles);
    const power = Math.sqrt(scale);

    const system = new BABYLON.ParticleSystem("explosion", this.maxParticles, this.scene);
    system.particleTexture = this._texture;
    system.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    system.emitter = new BABYLON.Vector3(x, y, 0);
    system.minEmitBox = BABYLON.Vector3.Zero();
    system.maxEmitBox = BABYLON.Vector3.Zero();
    // Two opposite corners of a box of directions: Babylon picks a random
    // direction between them for each particle, so the burst goes everywhere.
    system.direction1 = new BABYLON.Vector3(-1, -1, 0);
    system.direction2 = new BABYLON.Vector3(1, 1, 0);
    system.minEmitPower = 2 * power;
    system.maxEmitPower = 6 * power;
    system.minLifeTime = this.minLifeTime;
    system.maxLifeTime = this.maxLifeTime;
    system.minSize = 0.06;
    system.maxSize = 0.18;
    system.color1 = this._toColor4(colors[0]);
    system.color2 = this._toColor4(colors[1]);
    system.colorDead = this._toColor4(colors[1], 0); // fades to transparent
    system.emitRate = count * 20; // high enough that manualEmitCount empties in ~1 frame
    system.manualEmitCount = count;

    system.start();
    // ttl covers the ramp-up (emitting `count` particles at emitRate) plus the
    // longest a single particle can live, so the burst is never disposed
    // before its last particle has faded out.
    const ttl = count / system.emitRate + this.maxLifeTime + 0.15;
    this.systems.push({ system, ttl });
  }
```

Things to notice:

- **`scale` does two jobs:** it sets how many particles (16 per unit) and how fast they fly (`sqrt(scale)`, so a burst four times bigger flies twice as fast rather than four times, which looks more natural).
- **`direction1` and `direction2`** are two opposite corners of a box of directions. Babylon picks a random direction between them for each particle, so the burst goes everywhere. There is no gravity: this is space.
- **`manualEmitCount` with a high `emitRate`** emits the whole burst in about a frame instead of trickling it out.
- **`ttl` is computed, not asked of Babylon.** Right after `start()`, Babylon's own "is it finished?" flags still read empty for a frame or two, so polling them can dispose a burst before it draws anything. Working out how long the burst will live (the ramp-up plus the longest-lived particle, plus a little spare) is reliable.

### 3c. Tidying up finished bursts

```js
  // Ages every burst by dt seconds and disposes any that have finished. Babylon
  // does everything else as part of rendering.
  update(dt) {
    for (let i = this.systems.length - 1; i >= 0; i--) {
      const entry = this.systems[i];
      entry.ttl -= dt;
      if (entry.ttl <= 0) {
        entry.system.dispose(false); // keep the shared texture alive
        this.systems.splice(i, 1);
      }
    }
  }
```

It loops backwards so `splice` is safe while looping, as in `BulletSystem`. The `false` passed to `dispose()` tells Babylon *not* to dispose the texture along with the burst, because every burst shares it.

### 3d. Disposing everything

```js
  // Removes every burst and the shared texture.
  dispose() {
    for (const entry of this.systems) {
      entry.system.dispose(false);
    }
    this.systems = [];
    if (this._texture) {
      this._texture.dispose();
      this._texture = null;
    }
  }
```

### 3e. Helpers: colors and the glow texture

```js
  _toColor4(hex, alpha = 1) {
    return BABYLON.Color3.FromHexString(hex).toColor4(alpha);
  }

  // A small soft-glow dot, drawn procedurally so this sample stays
  // self-contained with no sprite file to fetch or license (the same
  // reasoning as the synthesized sounds).
  _createTexture(scene) {
    const size = 32;
    const texture = new BABYLON.DynamicTexture("explosionTexture", size, scene, false);
    const ctx = texture.getContext();
    const center = size / 2;
    const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    texture.update(false);
    texture.hasAlpha = true;
    return texture;
  }
```

The sprite is drawn into a `DynamicTexture` with a canvas radial gradient: a soft white dot that fades to transparent at the edge. Like the synthesized sounds, it keeps the project free of image files.

### 3f. Tests

Put this in `tests/explosions.tests.js`:

```js
// Explosions only touches `BABYLON.ParticleSystem`, `Vector3`, `Color3` and
// `DynamicTexture`, so these tests stub them out instead of loading the real
// engine (the same approach as the other rendering tests).
QUnit.module("Explosions", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeVector3 {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
    static Zero() {
      return new FakeVector3(0, 0, 0);
    }
  }

  class FakeParticleSystem {
    static BLENDMODE_ADD = 1;

    started = false;
    disposedWith = undefined;

    constructor(name, capacity, scene) {
      Object.assign(this, { name, capacity, scene });
    }
    start() {
      this.started = true;
    }
    dispose(disposeTexture) {
      this.disposedWith = disposeTexture;
    }
  }

  class FakeTexture {
    hasAlpha = false;
    disposed = false;

    getContext() {
      return {
        createRadialGradient: () => ({ addColorStop() {} }),
        fillRect() {},
      };
    }
    update() {}
    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      ParticleSystem: FakeParticleSystem,
      Vector3: FakeVector3,
      DynamicTexture: FakeTexture,
      Color3: {
        FromHexString: (hex) => ({ toColor4: (alpha) => ({ hex, alpha }) }),
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("spawn() does nothing without a scene", (assert) => {
    const explosions = new Explosions();

    explosions.spawn(1, 2);

    assert.deepEqual(explosions.systems, []);
  });

  QUnit.test("spawn() starts one burst at the given spot", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(3, -4);

    assert.strictEqual(explosions.systems.length, 1);
    const { system } = explosions.systems[0];
    assert.true(system.started);
    assert.strictEqual(system.emitter.x, 3);
    assert.strictEqual(system.emitter.y, -4);
  });

  QUnit.test("a normal burst has 16 particles, and a bigger one has more", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0, 1);
    explosions.spawn(0, 0, 2);

    assert.strictEqual(explosions.systems[0].system.manualEmitCount, 16);
    assert.strictEqual(explosions.systems[1].system.manualEmitCount, 32);
  });

  QUnit.test("a burst never uses more particles than the maximum", (assert) => {
    const explosions = new Explosions({ scene: {}, maxParticles: 50 });

    explosions.spawn(0, 0, 100);

    assert.strictEqual(explosions.systems[0].system.manualEmitCount, 50);
    assert.strictEqual(explosions.systems[0].system.capacity, 50);
  });

  QUnit.test("the emit rate is high enough to empty the burst almost at once", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0, 1);

    const { system } = explosions.systems[0];
    assert.strictEqual(system.emitRate, system.manualEmitCount * 20);
  });

  QUnit.test("bigger explosions fly faster", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0, 1);
    explosions.spawn(0, 0, 4);

    assert.true(explosions.systems[1].system.maxEmitPower > explosions.systems[0].system.maxEmitPower);
  });

  QUnit.test("particles go in every direction, not just one", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0);

    const { direction1, direction2 } = explosions.systems[0].system;
    assert.true(direction1.x < 0 && direction1.y < 0);
    assert.true(direction2.x > 0 && direction2.y > 0);
  });

  QUnit.test("particles are tinted by the default colors and fade to transparent", (assert) => {
    const explosions = new Explosions({ scene: {}, colors: ["#111111", "#222222"] });

    explosions.spawn(0, 0);

    const { system } = explosions.systems[0];
    assert.deepEqual(system.color1, { hex: "#111111", alpha: 1 });
    assert.deepEqual(system.color2, { hex: "#222222", alpha: 1 });
    assert.deepEqual(system.colorDead, { hex: "#222222", alpha: 0 });
  });

  QUnit.test("one burst can use its own colors without changing the default", (assert) => {
    const explosions = new Explosions({ scene: {}, colors: ["#111111", "#222222"] });

    explosions.spawn(0, 0, 1, ["#aaaaaa", "#bbbbbb"]);
    explosions.spawn(0, 0, 1);

    assert.strictEqual(explosions.systems[0].system.color1.hex, "#aaaaaa");
    assert.strictEqual(explosions.systems[1].system.color1.hex, "#111111");
  });

  QUnit.test("every burst shares one glow texture", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0);
    explosions.spawn(1, 1);

    const first = explosions.systems[0].system.particleTexture;
    assert.ok(first instanceof FakeTexture);
    assert.strictEqual(explosions.systems[1].system.particleTexture, first);
    assert.true(first.hasAlpha);
  });

  QUnit.test("a finished burst is disposed, but not before then", (assert) => {
    const explosions = new Explosions({ scene: {}, maxLifeTime: 1 });
    explosions.spawn(0, 0, 1);
    const { system, ttl } = explosions.systems[0];

    explosions.update(ttl - 0.01);
    assert.strictEqual(explosions.systems.length, 1, "still in flight");
    assert.strictEqual(system.disposedWith, undefined);

    explosions.update(0.02);
    assert.strictEqual(explosions.systems.length, 0, "gone");
    assert.strictEqual(system.disposedWith, false, "disposed without taking the shared texture with it");
  });

  QUnit.test("its lifetime covers the ramp-up plus the longest-lived particle", (assert) => {
    const explosions = new Explosions({ scene: {}, maxLifeTime: 0.9 });

    explosions.spawn(0, 0, 1);

    const { system, ttl } = explosions.systems[0];
    assert.true(Math.abs(ttl - (system.manualEmitCount / system.emitRate + 0.9 + 0.15)) < 1e-9);
  });

  QUnit.test("dispose() removes every burst and the texture", (assert) => {
    const explosions = new Explosions({ scene: {} });
    explosions.spawn(0, 0);
    const texture = explosions._texture;

    explosions.dispose();

    assert.deepEqual(explosions.systems, []);
    assert.true(texture.disposed);
    assert.strictEqual(explosions._texture, null);
  });
});
```

Add the script and its tests to `tests.html`, next to the others:

```html
  <script src="js/explosions.js"></script>
```
```html
  <script src="tests/explosions.tests.js"></script>
```

Reload `tests.html`: **13 more** tests, all green.

---

## Step 4: Hyperspace

Hyperspace is the arcade game's panic button: vanish and reappear somewhere random. It's a gamble. The new spot could be on top of a rock, and the jump itself has a small chance of destroying the ship. The ship only needs to know how to *move* and whether it's *allowed*; deciding what a failed jump means is `main.js`'s job.

Open `js/ship.js`.

### 4a. Options and state

In the constructor's option list, add two lines after the `drag = 0, ...` line:

```js
    hyperspaceCooldown = 1.5, // seconds before the ship can jump again
    hyperspaceFailChance = 0.1, // chance a jump goes wrong and destroys the ship
```

and in the body, add three lines after `this.drag = drag;`:

```js
    this.hyperspaceCooldown = hyperspaceCooldown;
    this.hyperspaceFailChance = hyperspaceFailChance;
    this.hyperspaceTimer = 0; // seconds until the next jump is allowed
```

### 4b. Count the cooldown down

In `update()`, add one line directly after the `this.invulnerableTime = Math.max(...)` line:

```js
    this.hyperspaceTimer = Math.max(0, this.hyperspaceTimer - dt);
```

### 4c. Reset it

In `reset()`, add one line after `this.visible = true;`:

```js
    this.hyperspaceTimer = 0;
```

### 4d. The jump

Add these inside the class, just above the `// True while the ship is protected from rocks` comment:

```js
  // True when the ship is allowed to jump to hyperspace again.
  get hyperspaceReady() {
    return this.hyperspaceTimer <= 0;
  }

  // The emergency escape: vanish and reappear somewhere random on the screen,
  // stopped dead. It's a gamble -- the new spot might be on top of a rock, and
  // there's a small chance the jump itself fails. Returns true if the ship
  // survived, false if the jump went wrong. The caller decides what failing
  // means; the ship is only moved. `random` can be replaced in tests.
  hyperspace(bounds, random = Math.random) {
    this.x = (random() * 2 - 1) * bounds.halfWidth;
    this.y = (random() * 2 - 1) * bounds.halfHeight;
    this.vx = 0;
    this.vy = 0;
    this.hyperspaceTimer = this.hyperspaceCooldown;
    this._syncMesh();
    return random() >= this.hyperspaceFailChance;
  }
```

Things to notice:

- **The dice are injectable**, the same trick as `RockField` and `Ufo`: `random` defaults to `Math.random`, and a test passes in a scripted list. The three `random()` calls are, in order: the new x, the new y, and the roll for whether the jump fails.
- `random() * 2 - 1` turns a number between 0 and 1 into one between -1 and 1; times the half-width, that's anywhere across the screen.
- **The cooldown stops spamming.** Without it you could jump every frame, and hyperspace would stop being a risk and become a cheat.
- It returns *whether you survived* rather than doing something about it. The ship doesn't know about lives or explosions; `main.js` will.

### 4e. Tests

Add this to the **end** of `tests/ship.tests.js`:

```js
QUnit.module("Ship hyperspace", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  // Returns random() values from a list, so a jump can be pinned down exactly.
  const values = (list) => {
    let i = 0;
    return () => list[i++ % list.length];
  };

  QUnit.test("starts ready to jump", (assert) => {
    assert.true(new Ship().hyperspaceReady);
  });

  QUnit.test("hyperspace() moves the ship to a random spot on the screen", (assert) => {
    const ship = new Ship();

    ship.hyperspace(BOUNDS, values([0.75, 0.25, 0.9])); // x: +5, y: -2.5

    assert.strictEqual(ship.x, 5);
    assert.strictEqual(ship.y, -2.5);
  });

  QUnit.test("it can land anywhere from edge to edge", (assert) => {
    const ship = new Ship();

    ship.hyperspace(BOUNDS, values([0, 0, 0.9]));
    assert.strictEqual(ship.x, -10);
    assert.strictEqual(ship.y, -5);

    ship.hyperspace(BOUNDS, values([1, 1, 0.9]));
    assert.strictEqual(ship.x, 10);
    assert.strictEqual(ship.y, 5);
  });

  QUnit.test("the ship comes out stopped dead, but still facing the same way", (assert) => {
    const ship = new Ship({ angle: 1.2 });
    ship.vx = 4;
    ship.vy = -3;

    ship.hyperspace(BOUNDS, values([0.5, 0.5, 0.9]));

    assert.strictEqual(ship.vx, 0);
    assert.strictEqual(ship.vy, 0);
    assert.strictEqual(ship.angle, 1.2);
  });

  QUnit.test("a jump usually survives", (assert) => {
    const ship = new Ship({ hyperspaceFailChance: 0.1 });

    assert.true(ship.hyperspace(BOUNDS, values([0.5, 0.5, 0.5])));
  });

  QUnit.test("a jump fails when the dice land under the failure chance", (assert) => {
    const ship = new Ship({ hyperspaceFailChance: 0.1 });

    assert.false(ship.hyperspace(BOUNDS, values([0.5, 0.5, 0.05])));
  });

  QUnit.test("with a failure chance of zero, a jump can't fail", (assert) => {
    const ship = new Ship({ hyperspaceFailChance: 0 });

    assert.true(ship.hyperspace(BOUNDS, values([0.5, 0.5, 0])));
  });

  QUnit.test("a jump starts the cooldown, which update() counts down", (assert) => {
    const ship = new Ship({ hyperspaceCooldown: 2 });
    ship.hyperspace(BOUNDS, values([0.5, 0.5, 0.9]));
    assert.false(ship.hyperspaceReady, "just jumped");

    ship.update(1.5, BOUNDS);
    assert.false(ship.hyperspaceReady, "1.5s into a 2s cooldown");

    ship.update(0.6, BOUNDS);
    assert.true(ship.hyperspaceReady, "ready again");
  });

  QUnit.test("reset() makes the ship ready to jump again", (assert) => {
    const ship = new Ship();
    ship.hyperspace(BOUNDS, values([0.5, 0.5, 0.9]));

    ship.reset();

    assert.true(ship.hyperspaceReady);
  });
});
```

Reload `tests.html`: **9 more** tests, all green.

---

## Step 5: Wire it together

Now `main.js` ties the states, the explosions and hyperspace together.

### 5.0 Check your script tags first

Remember that `index.html` and `tests.html` each have their own list of scripts. Add `explosions.js` to **`index.html`** now, after `ufo.js`, so the bottom of the file reads:

```html
  <script src="../../../js/screenshot.js"></script>
  <script src="js/wrap.js"></script>
  <script src="js/collision.js"></script>
  <script src="js/aim.js"></script>
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="js/rocks.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/game.js"></script>
  <script src="js/waves.js"></script>
  <script src="js/ufo.js"></script>
  <script src="js/explosions.js"></script>
  <script src="js/main.js"></script>
```

While you're in `index.html`, update the hint text so players can discover the new keys. For example:

```html
  <div class="hint">&larr;/&rarr; (A/D) to turn &middot; &uarr; (W) to thrust &middot; Space to fire &middot; H for hyperspace &middot; P to pause &middot; R to restart &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

### 5a. Constants

Add these next to `UFO_BULLET_SPEED`:

```js
const ROCK_EXPLOSION = { large: 1.6, medium: 1, small: 0.6 }; // how big a burst each rock size makes
const UFO_COLORS = ["#ffffff", "#ff6b6b"]; // a red-tinted burst for the UFO
const HYPERSPACE_COLORS = ["#ffffff", "#6bb6ff"]; // a blue flash for the ship jumping
```

### 5b. Create the explosions

Directly after the `ufoBullets` definition (after its closing `});`), add:

```js
  const explosions = new Explosions({ scene });
```

### 5c. Explode when things are destroyed

In `loseShip`, add a line at the very start:

```js
  const loseShip = () => {
    explosions.spawn(ship.x, ship.y, 2);
    hud.setLives(game.loseLife());
```

In `crash`, add a line after `const { size } = rock;`:

```js
    const { size } = rock;
    explosions.spawn(rock.x, rock.y, ROCK_EXPLOSION[size]);
    hud.addScore(rocks.destroy(rock).points);
```

### 5d. Game-flow functions and the opening state

Directly above the `// Held-key input: turn and thrust are applied once per frame below, so` comment, add:

```js
  // Puts everything back to the start of a fresh game. Used when the player
  // starts from the title screen and when they press R later.
  const restartGame = () => {
    ship.reset();
    bullets.clear();
    ufoBullets.clear();
    ufo.reset();
    rocks.clear();
    hud.resetScore();
    game.reset();
    hud.setLives(game.lives);
    hud.hideGameOver();
    hud.hidePaused();
    waves.reset();
    hud.setWave(waves.wave);
  };

  const startGame = () => {
    game.start();
    hud.hideTitle();
    restartGame();
  };

  const togglePause = () => {
    if (game.togglePause()) hud.showPaused();
    else hud.hidePaused();
  };

  // The emergency escape: jump to a random spot. A flash of blue marks where
  // the ship left and where it arrived. It's a gamble, since the new spot may
  // be on a rock and the jump itself can fail.
  const hyperspace = () => {
    if (!game.playing || !ship.hyperspaceReady) return;
    explosions.spawn(ship.x, ship.y, 0.5, HYPERSPACE_COLORS);
    const survived = ship.hyperspace({ halfWidth, halfHeight });
    explosions.spawn(ship.x, ship.y, 0.5, HYPERSPACE_COLORS);
    if (!survived) loseShip();
  };

  // The game opens on the title screen: no ship yet, and a few rocks drifting
  // behind the title.
  ship.setVisible(false);
  rocks.populate(5, { halfWidth, halfHeight });
  hud.showTitle();
```

Things to notice:

- **`restartGame` is the old R handler, moved into a function** so both Enter (start) and R (restart) can use it. The only new line is `hud.hidePaused()`, so restarting while paused doesn't leave PAUSED on screen.
- `startGame` is "mark the game started, hide the title, then do the normal restart". There's one definition of what a fresh game looks like.
- `hyperspace` uses `game.playing`, so you can't jump while paused, on the title screen, or after the game is over. A failed jump goes through the same `loseShip` as every other way to die, which also spawns the ship's explosion.

### 5e. Keys and clicks

In the `keydown` handler, replace the whole `if (event.code === "KeyR") { ... }` block with:

```js
    // On the title screen, Enter starts the game and nothing else does anything.
    if (!game.started) {
      if (event.code === "Enter") startGame();
      return;
    }

    if (event.code === "KeyR") {
      restartGame();
      return;
    }
    if (event.code === "KeyP") {
      togglePause();
      return;
    }
    if (event.code === "KeyH") {
      if (!event.repeat) hyperspace(); // one jump per press, not one per key repeat
      return;
    }
```

Then add a click handler on the line after `window.addEventListener("keyup", ...)`:

```js
  // Clicking also starts the game. It's a user gesture too, which lets the
  // browser play sound.
  canvas.addEventListener("pointerdown", () => {
    if (!game.started) startGame();
  });
```

> **Why does a click matter for sound?** Browsers refuse to play audio until the user has *done something* on the page (a click or a key press). The title screen turns that into a feature: the player's first action is to start the game, and the sound is allowed from then on.

> **Why `event.repeat`?** Holding a key makes the browser send `keydown` over and over. Without the check, holding H would try to jump on every repeat. The cooldown would stop most of them, but a key repeat shouldn't count as a decision.

### 5f. The frame loop

In the `onBeforeRenderObservable` callback, find the line `const bounds = { halfWidth, halfHeight };` and add this directly after it, **before** the comment `// Once the game is over`:

```js
    // Bursts are cleaned up as they finish, whatever else is happening.
    explosions.update(dt);

    // On the title screen only the rocks drift; everything else waits for the
    // player.
    if (!game.started) {
      rocks.update(dt, bounds);
      return;
    }

    // Paused: nothing moves, and the UFO siren falls quiet.
    if (game.paused) {
      if (sirenOn) {
        sirenOn = false;
        setSiren(false);
      }
      return;
    }
```

Then add bursts to the places things are destroyed. In the loop over `rocks.collideBullets(bullets)`:

```js
      hud.addScore(hit.points);
      playBangSound(hit.size);
      explosions.spawn(hit.x, hit.y, ROCK_EXPLOSION[hit.size]);
```

In the UFO block, add a line before `hud.addScore(ufo.destroy());` in **both** the "Shot down" and the "Rammed" branches:

```js
        explosions.spawn(ufo.x, ufo.y, 1.2, UFO_COLORS);
        hud.addScore(ufo.destroy());
```

Things to notice:

- **Early `return`s are the pause.** Each state is just "stop the frame here". On the title screen the only thing that runs is the rocks drifting; paused runs nothing. This is simpler and safer than sprinkling `if (!paused)` through the loop.
- `explosions.update(dt)` runs *above* those returns, so finished bursts are still tidied up while paused.
- **The siren needs special handling.** The loop is what notices the UFO appearing or leaving, and it isn't running while paused, so a siren started before the pause would play right through it. The paused branch switches it off, and because `sirenOn` is now `false`, the normal "did the UFO's state change?" check turns it back on after resuming.
- Particle systems animate on their own inside Babylon, so a burst that is mid-flight when you pause keeps fading. That's fine for such a short effect.

### 5g. Try it

Reload `index.html`:

- [ ] The game opens with **ASTEROIDS / Click or press Enter to start** over drifting rocks, with no ship and no HUD action
- [ ] The arrow keys, Space and R do nothing yet
- [ ] **Enter** (or a click) starts the game: the title goes away, the ship appears, and **WAVE 1** is announced
- [ ] Rocks burst in **white-orange particles**: big for large rocks, small for small ones
- [ ] The UFO bursts **red**
- [ ] **P** freezes everything under a PAUSED message, and pressing it again carries on. The UFO siren is silent while paused.
- [ ] **H** makes the ship vanish and reappear somewhere else, standing still, with a blue flash at both spots; pressing it again right away does nothing for about a second and a half
- [ ] About one jump in ten **destroys the ship** instead
- [ ] A hyperspace jump can land you on a rock, which costs a life
- [ ] **R** restarts, and the title screen doesn't come back
- [ ] H and P do nothing on the title screen or after Game Over

**If something's wrong:** `Explosions is not defined` means the script tag in 5.0 is missing from **`index.html`**. `game.started` or `game.playing` being `undefined` means Step 1 didn't land. `ship.hyperspace is not a function` means Step 4d is missing.

**Experiments** (change one, reload, then change it back):

- `hyperspaceFailChance: 0.5` in `new Ship(...)` for a very dangerous jump
- `scale` of `4` for the ship's explosion, to see the cap on particles
- In `Explosions`, `colors: ["#6bff8a", "#ffffff"]` for green explosions

---

## Step 6 (optional): A thrust rumble

The arcade game rumbles while you thrust. This is a **looping** sound like the siren, with one new problem to solve: noise, unlike a steady tone, doesn't join up with itself where the loop restarts.

In `js/main.js`, add a buffer variable under `sirenBuffer`:

```js
let sirenBuffer = null;
let thrustBuffer = null;
```

In `initAudio()`, right after `sirenBuffer = siren;`, add:

```js
  // The thrust rumble: low-passed noise, played on a loop. Random noise
  // doesn't join up with itself at the loop point, so the buffer is made a
  // little too long and the extra samples that would have followed the end
  // are blended into the start, so the end flows into the beginning.
  const rumbleLength = Math.floor(sampleRate * 0.6);
  const fadeLength = Math.floor(sampleRate * 0.05);
  const raw = new Float32Array(rumbleLength + fadeLength);
  let rumbleSmoothed = 0;
  for (let i = 0; i < raw.length; i++) {
    rumbleSmoothed += (Math.random() * 2 - 1 - rumbleSmoothed) * 0.08;
    raw[i] = rumbleSmoothed;
  }
  const rumble = audioContext.createBuffer(1, rumbleLength, sampleRate);
  const rumbleData = rumble.getChannelData(0);
  for (let i = 0; i < rumbleLength; i++) {
    let value = raw[i];
    if (i < fadeLength) {
      const mix = i / fadeLength;
      value = raw[i] * mix + raw[rumbleLength + i] * (1 - mix);
    }
    rumbleData[i] = value * 2.5;
  }

  thrustBuffer = rumble;
```

Above `playFireSound`, add the controller (the same shape as `setSiren`):

```js
// The rumble plays on a loop for as long as the engine is firing.
let thrustSound = null;
let thrustWanted = false;

const setThrust = async (on) => {
  thrustWanted = on;

  if (!on) {
    if (thrustSound) {
      thrustSound.stop();
      thrustSound.dispose();
      thrustSound = null;
    }
    return;
  }

  if (thrustSound || !audioEngine || !thrustBuffer) return;
  const sound = await audioEngine.createSoundAsync("thrust", thrustBuffer, { loop: true, volume: 0.3 });
  // The player may have let go while the sound was being created.
  if (!thrustWanted || thrustSound) {
    sound.dispose();
    return;
  }
  thrustSound = sound;
  sound.play();
};
```

Declare a flag next to `sirenOn`:

```js
  let sirenOn = false;
  let thrustOn = false;
```

and in the frame loop, directly after `explosions.update(dt);`, add:

```js
    // The rumble plays while the thrust key is held in a running game, so
    // pausing or losing the last life silences it.
    const thrusting = game.playing && anyHeld(THRUST_KEYS);
    if (thrusting !== thrustOn) {
      thrustOn = thrusting;
      setThrust(thrustOn);
    }
```

Things to notice:

- **The crossfade is the whole trick.** The first `fadeLength` samples of the loop are blended with the extra samples that "would have come next" after the end. At the loop point, the sound is already flowing into where it restarts.
- **The filter is the same one-liner** as the explosion's noise: each sample moves a fraction of the way toward a new random value, which smooths away the harsh high frequencies. A smaller fraction (here 0.08) means a deeper rumble.
- **It uses `game.playing`,** not just the key, so pausing or running out of lives silences it even with the key held down. That's the payoff for Step 1's derived flag.

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="js/wrap.js"></script>
  <script src="js/collision.js"></script>
  <script src="js/aim.js"></script>
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="js/rocks.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/game.js"></script>
  <script src="js/waves.js"></script>
  <script src="js/ufo.js"></script>
  <script src="js/explosions.js"></script>
  <script src="tests/wrap.tests.js"></script>
  <script src="tests/collision.tests.js"></script>
  <script src="tests/aim.tests.js"></script>
  <script src="tests/ship.tests.js"></script>
  <script src="tests/bullets.tests.js"></script>
  <script src="tests/rocks.tests.js"></script>
  <script src="tests/hud.tests.js"></script>
  <script src="tests/game.tests.js"></script>
  <script src="tests/waves.tests.js"></script>
  <script src="tests/ufo.tests.js"></script>
  <script src="tests/explosions.tests.js"></script>
```

Open it. You should see **233 passing tests** in total (234 if you added the diagonal muzzle test in the Bullets tutorial): the 200 you started with, plus 7 for the game states, 4 for the HUD, 13 for explosions, and 9 for hyperspace.

> **Try breaking something.** In `Game`, change `playing` to `return this.started && !this.paused;` (forgetting `!this.over`), reload `tests.html`, and see which test notices. Then put it back.

---

## Step 8: Publish the sample

**Gallery.** In the root `index.html`, find the Asteroids series and give "Asteroids Polish" a `slug` and `tutorial: true`:

```js
          { slug: "asteroids_polish", tutorial: true, title: "Asteroids Polish", description: "A title screen, pause, particle explosions, and a risky hyperspace jump." },
```

**Root README.** Add a line to the Asteroids list in the top-level `README.md`.

**Series roadmap.** In `samples/asteroids/README.md`, link row 7 of the table to `asteroids_polish/README.md` and its tutorial.

**Previous README.** In `samples/asteroids/asteroids_ufo/README.md`, change the "Next up" line to link to Asteroids Polish. (While you're there: that README says the siren is only an optional tutorial step, but this sample's starting point already includes it.)

**Sample README.** Add `samples/asteroids/asteroids_polish/README.md`, using the UFO README as a template. When you're ready, ask me and I'll draft it from your finished code.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A derived "is the game running?" flag | `Game.playing` |
| Game states gated by early `return`s in the frame loop | title, paused, over |
| One definition of "a fresh game" | `restartGame` |
| Why a start screen helps with browser audio | the click and Enter handlers |
| One-shot particle bursts with a computed lifetime | `Explosions.spawn` |
| Scaling an effect two ways at once | particle count and speed from `scale` |
| A risky action with a cooldown and an injectable dice roll | `Ship.hyperspace` |
| Ignoring key repeat | `event.repeat` |
| A seamless noise loop | the thrust rumble |

## Challenges

1. **Ship debris.** Instead of a particle burst, break the ship into its three line segments and send them tumbling apart. (Hint: the points in `Ship.attachTo` are the segments.)
2. **A high score.** Remember the best score between games and show it on the title screen. (Hint: `localStorage`, wrapped in `try`/`catch`.)
3. **Hyperspace that's less random.** Only land somewhere with no rock within a safe radius, and make the failure chance rise with how crowded the screen is.
4. **Screen shake** when the ship is destroyed. (Hint: nudge the camera's `orthoLeft/Right/Top/Bottom` by a decaying random amount.)

**Up next:** *Asteroids Next Steps* gives the rocks and ship real depth with lit 3D meshes, and adds an optional chase-camera mode.
