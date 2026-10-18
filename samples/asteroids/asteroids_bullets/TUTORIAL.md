# Tutorial: Adding Bullets to Asteroids

In this tutorial you'll add the ability to fire bullets to the [Asteroids Ship](../asteroids_ship/README.md) sample. You write the code; this document tells you what to write and why.

By the end you'll have:

- A `Ship.muzzle()` method that says where bullets leave the ship and which way they go
- A `BulletSystem` class that handles firing, a cooldown, a cap on bullets, movement, screen wrap, and expiry
- Space to fire (hold it for auto-fire)
- Unit tests for both
- *(Optional)* a synthesized "pew" sound

**What you'll learn:** spawning and disposing meshes at runtime, sharing one material across many meshes, emissive materials, timers driven by `dt`, safely removing items from an array while looping, and combining velocities.

## Where you're starting

This folder is a copy of the Ship sample, plus two empty placeholder files:

```
asteroids_bullets/
├── index.html
├── tests.html
├── js/
│   ├── ship.js            (unchanged from the Ship sample)
│   ├── main.js            (unchanged from the Ship sample)
│   └── bullets.js         (empty -- you'll write this)
└── tests/
    ├── ship.tests.js      (unchanged from the Ship sample)
    └── bullets.tests.js   (empty -- you'll write this)
```

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Ship sample plus the two empty placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` is never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Open `index.html` in a browser now to confirm the ship flies. Keep the browser's developer console open (F12) as you work; most mistakes show up there as red errors.

---

## Step 1: Tell bullets where to start

A bullet should leave from the ship's **nose**, travelling in the direction the ship points. The ship already knows its heading (`angle`), and in the Ship sample you used this to thrust:

```
direction = (-sin(angle), cos(angle))
```

The nose is `radius` units from the ship's center along that direction. Rather than have the bullet code redo this math, give `Ship` a method that reports it.

Open `js/ship.js` and add this method to the `Ship` class, just above the `get speed()` getter:

```js
  // Where a bullet should leave the ship: the nose position, plus the unit
  // vector the ship is pointing along.
  muzzle() {
    const dirX = -Math.sin(this.angle);
    const dirY = Math.cos(this.angle);
    return { x: this.x + dirX * this.radius, y: this.y + dirY * this.radius, dirX, dirY };
  }
```

> **Why a method on `Ship`?** The ship owns its own geometry. If you later change the hull's shape, only `Ship` needs to change, not the code that fires bullets.

## Step 2: Test the muzzle

Add this to the **end** of `tests/ship.tests.js`. (`assertClose` is already defined at the top of that file.)

```js
QUnit.module("Ship muzzle", () => {
  QUnit.test("muzzle() is at the nose, pointing the way the ship faces", (assert) => {
    const ship = new Ship({ x: 1, y: 2, radius: 0.5 });

    const m = ship.muzzle();

    assertClose(assert, m.x, 1, 1e-9);
    assertClose(assert, m.y, 2.5, 1e-9);
    assertClose(assert, m.dirX, 0, 1e-9);
    assertClose(assert, m.dirY, 1, 1e-9);
  });

  QUnit.test("muzzle() follows the heading", (assert) => {
    const ship = new Ship({ angle: Math.PI / 2, radius: 1 }); // pointing left

    const m = ship.muzzle();

    assertClose(assert, m.x, -1, 1e-9);
    assertClose(assert, m.y, 0, 1e-9);
    assertClose(assert, m.dirX, -1, 1e-9);
  });

  QUnit.test("muzzle() is correct at diagonal headings", (assert) => {
    const ship = new Ship({ angle: Math.PI / 4, radius: 1 }); // 45deg counter-clockwise

    const m = ship.muzzle();

    assertClose(assert, m.dirX, -Math.SQRT1_2, 1e-9);
    assertClose(assert, m.dirY, Math.SQRT1_2, 1e-9);
  });
});
```

Open `tests.html` in a browser. Everything should be green.

> **Why a diagonal test?** The first two tests only use 0° and 90°, and plenty of wrong formulas give the right answer at those angles. For example, typing `Math.sign` instead of `Math.sin` passes both, but the bullet would leave the wrong side of the nose at every angle in between. A 45° heading is the cheapest way to catch that kind of mistake: both components must be about 0.71, which a three-valued function like `sign` can't produce.

---

## Step 3: Write `BulletSystem`

Open `js/bullets.js` (currently one comment line). You'll first write the file's **skeleton**: the whole class, complete and closed, with just a constructor, plus the export footer at the bottom. Every later piece goes **inside the class**, below the previous one and above its closing `}`, so the file is valid JavaScript after every step and you can reload the page or the tests at any point.

**Design:** a bullet is just a plain record, `{ x, y, vx, vy, life, mesh }`, not its own class. This is the same choice you saw for bricks in the Breakout series: a bullet has no behavior of its own, so a class per bullet would be overhead. One `BulletSystem` owns the whole list.

As with `Ship`, `BulletSystem` only touches `BABYLON` when it's given a `scene`. That's what will let you test it without a browser engine.

### 3a. The skeleton: constructor and export

```js
// Manages every bullet in flight: firing (with a cooldown and a cap on how
// many can exist at once), moving, wrapping around the screen, aging, and
// the mesh lifecycle. A bullet is a plain record ({x, y, vx, vy, life, mesh}),
// not its own class -- same reasoning as BrickGrid's bricks in the Breakout
// series: simple enough that a class per bullet would just be overhead.
//
// `BABYLON` is only touched when `scene` is supplied, the same split Ship
// uses, so the logic can be unit tested without a real engine. See
// ../tests/bullets.tests.js.
class BulletSystem {
  constructor({
    scene = null,
    speed = 14, // world units/s, relative to the ship
    lifetime = 1, // seconds before a bullet expires
    cooldown = 0.2, // seconds between shots
    maxBullets = 4, // the classic arcade limit
    radius = 0.08,
    color = "#ffffff",
  } = {}) {
    this.scene = scene;
    this.speed = speed;
    this.lifetime = lifetime;
    this.cooldown = cooldown;
    this.maxBullets = maxBullets;
    this.radius = radius;
    this.bullets = [];
    this.cooldownRemaining = 0;

    this._material = null;
    if (scene) {
      this._material = this._createMaterial(scene, color);
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = BulletSystem;
} else {
  window.BulletSystem = BulletSystem;
}
```

Things to notice:

- `lifetime` and `maxBullets` are two different limits. Lifetime stops a bullet flying forever; the cap stops the player flooding the screen. Together they make you aim.
- The material is created **once** here, not per bullet. You'll see why in 3e.
- The constructor calls `this._createMaterial(scene, color)`, which you add in 3e. That's fine for now: nothing creates a `BulletSystem` with a scene until the game wires it up in Step 4, and by then every method is in place.

The next pieces all go **inside the class**, below the constructor and above its closing `}`, in this order.

### 3b. Firing

Add this inside the class, below the previous piece and above its closing `}`:

```js
  // Fires one bullet from the ship's nose, unless the gun is still cooling
  // down or the cap has been reached. Returns the new bullet, or null.
  fire(ship) {
    if (this.cooldownRemaining > 0 || this.bullets.length >= this.maxBullets) return null;

    const { x, y, dirX, dirY } = ship.muzzle();
    const bullet = {
      x,
      y,
      // The bullet inherits the ship's velocity, so firing while drifting
      // sideways sends it off at an angle, like in the arcade original.
      vx: ship.vx + dirX * this.speed,
      vy: ship.vy + dirY * this.speed,
      life: this.lifetime,
      mesh: null,
    };
    if (this.scene) this._attach(bullet);
    this.bullets.push(bullet);
    this.cooldownRemaining = this.cooldown;
    return bullet;
  }
```

Things to notice:

- **Velocity inheritance.** `ship.vx + dirX * speed` adds the ship's own motion. If you fly right and fire straight up, the bullet drifts right too. Try removing `ship.vx +` later to see how much worse it feels.
- `fire()` returns `null` when it can't fire. That makes it easy for callers (and tests, and later the sound) to tell whether a shot actually happened.

### 3c. Updating every frame

Add this inside the class, below the previous piece and above its closing `}`:

```js
  // Advances the cooldown and every bullet by dt seconds. Bullets wrap around
  // the screen like the ship does, and are disposed once their life runs out.
  update(dt, bounds) {
    const { halfWidth, halfHeight } = bounds;
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);

    // Iterate backwards so splice() doesn't skip the next bullet.
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.life -= dt;
      if (bullet.life <= 0) {
        this._disposeBullet(bullet);
        this.bullets.splice(i, 1);
        continue;
      }

      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      const limitX = halfWidth + this.radius;
      const limitY = halfHeight + this.radius;
      if (bullet.x > limitX) bullet.x = -limitX;
      else if (bullet.x < -limitX) bullet.x = limitX;
      if (bullet.y > limitY) bullet.y = -limitY;
      else if (bullet.y < -limitY) bullet.y = limitY;

      if (bullet.mesh) {
        bullet.mesh.position.x = bullet.x;
        bullet.mesh.position.y = bullet.y;
      }
    }
  }
```

Things to notice:

- **Why loop backwards?** `splice(i, 1)` shifts every later element down one slot. Going forwards, that makes the loop skip the element that slid into position `i`. Going backwards, the elements you haven't visited yet are never disturbed.
- The wrap logic is the same as `Ship.update()`. (If you wanted to avoid the duplication, you could extract a shared helper. That's a good refactor for a later step, once there's a third thing that wraps: rocks.)
- `if (bullet.mesh)` lets the same code run in tests, where there's no mesh.

### 3d. Cleanup

Add this inside the class, below the previous piece and above its closing `}`:

```js
  // Removes every bullet in flight (e.g. on reset) and clears the cooldown.
  clear() {
    for (const bullet of this.bullets) {
      this._disposeBullet(bullet);
    }
    this.bullets = [];
    this.cooldownRemaining = 0;
  }

  // Removes every bullet and the shared material.
  dispose() {
    this.clear();
    if (this._material) {
      this._material.dispose();
      this._material = null;
    }
  }
```

### 3e. The Babylon.js parts

These are the only methods that touch `BABYLON`.

Add this inside the class, below the previous piece and above its closing `}`:

```js
  // One material is shared by every bullet. It's emissive with lighting
  // disabled, so bullets glow at full brightness without needing a light.
  _createMaterial(scene, color) {
    const material = new BABYLON.StandardMaterial("bulletMaterial", scene);
    material.emissiveColor = BABYLON.Color3.FromHexString(color);
    material.disableLighting = true;
    return material;
  }

  _attach(bullet) {
    bullet.mesh = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: this.radius * 2, segments: 8 }, this.scene);
    bullet.mesh.material = this._material;
    bullet.mesh.position.x = bullet.x;
    bullet.mesh.position.y = bullet.y;
  }

  _disposeBullet(bullet) {
    if (!bullet.mesh) return;
    // The second argument is false so the shared material survives.
    bullet.mesh.dispose(false, false);
    bullet.mesh = null;
  }
```

Things to notice:

- **Emissive + `disableLighting`.** The Ship sample drew unlit lines. Here bullets are spheres, which normally need a light to be visible. `emissiveColor` makes a surface glow with its own color, and `disableLighting = true` tells the material to ignore lights entirely, so the bullets are full-bright without adding a light to the scene.
- **One shared material.** Creating a material per bullet would allocate a new GPU resource every shot. Sharing one is cheaper.
- **`dispose(false, false)`.** The signature is `dispose(doNotRecurse, disposeMaterialAndTextures)`. The Breakout sample used `(false, true)` to dispose each brick's own material along with it. Here the material is shared, so passing `true` would destroy it and the *next* bullet would render with a disposed material. The second argument has to be `false`.

---

## Step 4: Wire it into the game

Nothing happens yet, because the page doesn't load `bullets.js`, and `main.js` doesn't use it.

### 4a. `index.html`

Add the script tag **between** `ship.js` and `main.js`:

```html
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="js/main.js"></script>
```

Also update the hint bar so players know about the new key:

```html
  <div class="hint">&larr;/&rarr; (A/D) to turn &middot; &uarr; (W) to thrust &middot; Space to fire &middot; R to reset &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Space was reserved for firing when the Ship sample moved the screenshot shortcut to **C**, so there's no conflict.

### 4b. `js/main.js`

Make four small changes.

**1.** Create the bullet system right after the ship:

```js
  const ship = new Ship({ scene, radius: SHIP_RADIUS, drag: SHIP_DRAG });
  const bullets = new BulletSystem({ scene });
```

**2.** Add a fire key set next to the others, and include it in `isControlKey`:

```js
  const THRUST_KEYS = new Set(["ArrowUp", "KeyW"]);
  const FIRE_KEYS = new Set(["Space"]);
  const isControlKey = (code) =>
    LEFT_KEYS.has(code) || RIGHT_KEYS.has(code) || THRUST_KEYS.has(code) || FIRE_KEYS.has(code);
```

Because `isControlKey` now includes Space, the existing `keydown` handler's `event.preventDefault()` also stops Space from scrolling the page.

**3.** Make **R** clear the bullets too, in the `keydown` handler:

```js
    if (event.code === "KeyR") {
      ship.reset();
      bullets.clear();
      return;
    }
```

**4.** Replace the body of the `onBeforeRenderObservable` callback:

```js
  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't launch the ship across the map.
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const bounds = { halfWidth, halfHeight };

    // Holding both turn keys cancels out, as in the original.
    const turn = (anyHeld(LEFT_KEYS) ? 1 : 0) - (anyHeld(RIGHT_KEYS) ? 1 : 0);
    if (turn !== 0) ship.rotate(turn, dt);
    if (anyHeld(THRUST_KEYS)) ship.thrust(dt);

    ship.update(dt, bounds);

    // Fire after the ship has moved this frame, so bullets spawn at the
    // nose's current position. Holding Space auto-fires; the system's own
    // cooldown and bullet cap set the pace.
    if (anyHeld(FIRE_KEYS)) bullets.fire(ship);
    bullets.update(dt, bounds);
  });
```

Order matters here. Try swapping `ship.update` and `bullets.fire` and watch where a bullet appears when you fire at full speed. It will lag a frame behind the nose.

### 4c. Try it

Reload `index.html` and check each of these:

- [ ] Space fires a bullet from the nose, in the direction you're pointing
- [ ] Holding Space fires steadily (about 5 shots a second), not a stream
- [ ] You can never have more than 4 bullets on screen at once
- [ ] Bullets vanish after about a second, wherever they are
- [ ] Bullets that leave one edge reappear on the opposite edge
- [ ] Thrust forward, then turn sideways and fire: the bullet drifts with your old momentum
- [ ] **R** removes bullets on screen

**If nothing fires:** open the console. `BulletSystem is not defined` means the script tag from 4a is missing or in the wrong place. `ship.muzzle is not a function` means step 1 didn't land.

**Experiments** (change one, reload, then change it back):

- `cooldown: 0` in `new BulletSystem(...)` removes the rate limit, leaving only the 4-bullet cap
- `maxBullets: 20` and `lifetime: 3` makes a gun that never stops
- Remove `ship.vx +` / `ship.vy +` from `fire()` to see bullets without inherited velocity

---

## Step 5: Test `BulletSystem`

Because `BulletSystem` only touches `BABYLON` when given a scene, you can test almost everything without one.

### 5a. Register the new files in `tests.html`

```html
  <script src="js/ship.js"></script>
  <script src="js/bullets.js"></script>
  <script src="tests/ship.tests.js"></script>
  <script src="tests/bullets.tests.js"></script>
```

### 5b. The logic tests

Put this in `tests/bullets.tests.js`:

```js
// Local helper -- named differently from ship.tests.js's assertClose so both
// files can be loaded on the same page without a duplicate-declaration error.
const near = (assert, actual, expected, tolerance = 1e-9) =>
  assert.true(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);

QUnit.module("BulletSystem", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  QUnit.test("starts empty with the gun ready", (assert) => {
    const system = new BulletSystem();

    assert.deepEqual(system.bullets, []);
    assert.strictEqual(system.cooldownRemaining, 0);
  });

  QUnit.test("fire() spawns a bullet at the ship's nose, heading the way it points", (assert) => {
    const ship = new Ship({ x: 1, y: 2, radius: 0.5 }); // pointing up
    const system = new BulletSystem({ speed: 10 });

    const bullet = system.fire(ship);

    near(assert, bullet.x, 1);
    near(assert, bullet.y, 2.5);
    near(assert, bullet.vx, 0);
    near(assert, bullet.vy, 10);
    assert.strictEqual(system.bullets.length, 1);
  });

  QUnit.test("fire() follows the ship's heading", (assert) => {
    const ship = new Ship({ angle: Math.PI / 2 }); // pointing left
    const system = new BulletSystem({ speed: 10 });

    const bullet = system.fire(ship);

    near(assert, bullet.vx, -10);
    near(assert, bullet.vy, 0);
  });

  QUnit.test("bullets inherit the ship's velocity", (assert) => {
    const ship = new Ship();
    ship.vx = 3;
    ship.vy = -2;
    const system = new BulletSystem({ speed: 10 });

    const bullet = system.fire(ship);

    near(assert, bullet.vx, 3);
    near(assert, bullet.vy, 8);
  });

  QUnit.test("fire() is blocked during the cooldown and allowed after it", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ cooldown: 0.5 });

    assert.ok(system.fire(ship), "first shot fires");
    assert.strictEqual(system.fire(ship), null, "immediate second shot is blocked");

    system.update(0.3, BOUNDS);
    assert.strictEqual(system.fire(ship), null, "still cooling down");

    system.update(0.3, BOUNDS);
    assert.ok(system.fire(ship), "fires again once the cooldown has elapsed");
  });

  QUnit.test("fire() respects maxBullets", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ cooldown: 0, maxBullets: 2 });

    system.fire(ship);
    system.fire(ship);

    assert.strictEqual(system.fire(ship), null);
    assert.strictEqual(system.bullets.length, 2);
  });

  QUnit.test("update() moves bullets by velocity * dt", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ speed: 4, radius: 0.1 });
    const bullet = system.fire(ship);
    const startY = bullet.y;

    system.update(0.5, BOUNDS);

    near(assert, bullet.y, startY + 2);
  });

  QUnit.test("bullets expire after their lifetime", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ lifetime: 1, speed: 1 });
    system.fire(ship);

    system.update(0.6, BOUNDS);
    assert.strictEqual(system.bullets.length, 1, "still alive at 0.6s");

    system.update(0.6, BOUNDS);
    assert.strictEqual(system.bullets.length, 0, "gone after 1.2s");
  });

  QUnit.test("expiring a bullet frees a slot for a new one", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ cooldown: 0, maxBullets: 1, lifetime: 0.5 });
    system.fire(ship);
    assert.strictEqual(system.fire(ship), null, "full");

    system.update(0.6, BOUNDS);

    assert.ok(system.fire(ship), "slot is free again");
  });

  QUnit.test("bullets wrap around the screen edges", (assert) => {
    const system = new BulletSystem({ radius: 0.1, speed: 1, lifetime: 100 });
    const bullet = system.fire(new Ship());
    bullet.x = 10.05; // just inside halfWidth + radius = 10.1
    bullet.vx = 1;
    bullet.vy = 0;

    system.update(0.1, BOUNDS); // x -> 10.15, past the limit

    near(assert, bullet.x, -10.1);
  });

  QUnit.test("clear() removes every bullet and resets the cooldown", (assert) => {
    const system = new BulletSystem({ cooldown: 1 });
    system.fire(new Ship());

    system.clear();

    assert.deepEqual(system.bullets, []);
    assert.strictEqual(system.cooldownRemaining, 0);
  });
});
```

### 5c. The rendering tests

To test the code that touches `BABYLON` without loading the engine, these tests replace `BABYLON` with a tiny fake that has only the pieces `BulletSystem` uses (the same technique as `Ship rendering` and the Breakout samples). Add this **below** the previous module in the same file:

```js
QUnit.module("BulletSystem rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeMaterial {
    emissiveColor = null;
    disableLighting = false;
    disposed = false;

    dispose() {
      this.disposed = true;
    }
  }

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    material = null;
    disposeArgs = null;

    dispose(...args) {
      this.disposeArgs = args;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: { CreateSphere: () => new FakeMesh() },
      StandardMaterial: FakeMaterial,
      Color3: { FromHexString: (hex) => hex },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("creates one shared emissive, unlit material", (assert) => {
    const system = new BulletSystem({ scene: {}, color: "#ff0000" });

    assert.ok(system._material instanceof FakeMaterial);
    assert.strictEqual(system._material.emissiveColor, "#ff0000");
    assert.true(system._material.disableLighting);
  });

  QUnit.test("each bullet gets a mesh using the shared material", (assert) => {
    const system = new BulletSystem({ scene: {}, cooldown: 0 });

    const a = system.fire(new Ship());
    const b = system.fire(new Ship());

    assert.ok(a.mesh instanceof FakeMesh);
    assert.strictEqual(a.mesh.material, system._material);
    assert.strictEqual(b.mesh.material, system._material, "same material instance");
  });

  QUnit.test("no meshes are created when scene is omitted", (assert) => {
    const system = new BulletSystem();

    const bullet = system.fire(new Ship());

    assert.strictEqual(bullet.mesh, null);
  });

  QUnit.test("update() keeps each mesh synced to its bullet", (assert) => {
    const system = new BulletSystem({ scene: {}, speed: 4 });
    const bullet = system.fire(new Ship());

    system.update(0.5, BOUNDS);

    assert.strictEqual(bullet.mesh.position.x, bullet.x);
    assert.strictEqual(bullet.mesh.position.y, bullet.y);
  });

  QUnit.test("an expired bullet's mesh is disposed without disposing the shared material", (assert) => {
    const system = new BulletSystem({ scene: {}, lifetime: 0.1 });
    const bullet = system.fire(new Ship());
    const mesh = bullet.mesh;

    system.update(0.2, BOUNDS);

    assert.deepEqual(mesh.disposeArgs, [false, false]);
    assert.false(system._material.disposed, "material is still alive for the next shot");
  });

  QUnit.test("dispose() clears bullets and disposes the material", (assert) => {
    const system = new BulletSystem({ scene: {} });
    system.fire(new Ship());
    const material = system._material;

    system.dispose();

    assert.strictEqual(system.bullets.length, 0);
    assert.true(material.disposed);
    assert.strictEqual(system._material, null);
  });
});
```

Open `tests.html`. You should see **41 passing tests** (21 from the Ship sample, 3 for the muzzle, 17 for bullets).

> **A good habit to try:** temporarily change `bullet.mesh.dispose(false, false)` to `(false, true)` in `bullets.js`, reload `tests.html`, and watch which test fails. That's the test that protects the shared-material gotcha from Step 3e. Then change it back.

---

## Step 6 (optional): A "pew" sound

The earlier samples synthesized sound instead of loading files. Do the same here. This is the same Audio Engine V2 pattern from [Bouncing Ball with Sparks and Sound](../../introduction/bouncing_ball_sparks_sound/README.md), but with a new trick: a **frequency sweep**.

Add this near the top of `js/main.js`, right after the `engine` line:

```js
// --- Procedural fire sound ---
// A short downward "pew": a sine wave whose pitch swoops from high to low
// while its volume fades out. Synthesized on the fly, so there's no audio
// file to fetch or license.
let audioEngine = null;
let fireBuffer = null;

const initAudio = async () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioEngine = await BABYLON.CreateAudioEngineAsync({ audioContext });
  await audioEngine.unlockAsync();

  const duration = 0.15;
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Accumulate phase instead of computing sin(2 * PI * f * t) directly.
  // When the frequency changes over time, the direct formula produces
  // glitches, because the phase jumps every time f changes. Adding up the
  // small phase step for each sample keeps the wave continuous.
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const frequency = 1000 * Math.exp(-t * 12); // swoops from 1000 Hz down to ~165 Hz
    phase += (2 * Math.PI * frequency) / sampleRate;
    data[i] = Math.sin(phase) * Math.exp(-t * 18) * 0.5;
  }

  fireBuffer = buffer;
};

const playFireSound = async () => {
  if (!audioEngine || !fireBuffer) return;

  const sound = await audioEngine.createSoundAsync("fire", fireBuffer, {
    volume: 0.4,
    playbackRate: 0.95 + Math.random() * 0.1, // slight pitch variation so shots don't sound identical
  });
  sound.onEndedObservable.add(() => sound.dispose());
  sound.play();
};
```

Then use it. Because `fire()` returns `null` when it can't fire, you can play the sound only for real shots. Change the fire line in the render loop to:

```js
    if (anyHeld(FIRE_KEYS) && bullets.fire(ship)) playFireSound();
```

And start the audio at the bottom of `main.js`, right after `createScene()` is called:

```js
const { scene, updateViewport } = createScene();
initAudio();
```

Browsers block audio until the user interacts with the page. Pressing a key counts, and Babylon shows a small unmute prompt if it's needed.

---

## Step 7: Publish the sample

Once it works, make it appear in the gallery and docs.

**Gallery.** In the root `index.html`, find the Asteroids series and give the "Asteroids Bullets" step a `slug`. That turns it from a greyed-out "Coming soon" into a live entry:

```js
          { slug: "asteroids_bullets", title: "Asteroids Bullets", description: "Firing along the ship's heading, with cooldown and lifetime." },
```

(You may want a sharper description, such as "Hold Space to fire bullets that inherit the ship's momentum, with a cooldown and a four-bullet cap.")

**Root README.** Add a line to the Asteroids list in the repo's top-level `README.md`:

```md
2. [Asteroids Bullets](samples/asteroids/asteroids_bullets/README.md) — fire bullets from the ship's nose, with a cooldown, a bullet cap, and inherited momentum.
```

**Series roadmap.** In `samples/asteroids/README.md`, turn the table's row 2 into a link: `[Asteroids Bullets](asteroids_bullets/README.md)`.

**Sample README.** Add `samples/asteroids/asteroids_bullets/README.md`. Use the Ship sample's README as a template: a short paragraph on what's new, a **Key code** section with snippets, **Babylon.js features demonstrated**, **Controls**, and **Running the tests**. When you're ready, ask me and I'll draft it from your finished code.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Nose position and direction from heading | `Ship.muzzle()` |
| Cooldown and bullet cap | `BulletSystem.fire()` |
| Combining velocities | `ship.vx + dirX * speed` |
| Timers with `dt` | `cooldownRemaining`, `bullet.life` |
| Removing items while looping | backwards loop + `splice` |
| Runtime meshes sharing one material | `_createMaterial`, `_attach`, `dispose(false, false)` |
| Emissive, unlit material | `emissiveColor` + `disableLighting` |
| Testing without an engine | `BABYLON` stub in `BulletSystem rendering` |

## Challenges

If you want to go further before the next step:

1. **Bullet trails.** Give each bullet a short fading tail. (Hint: a `BABYLON.TrailMesh`, or a second dimmer sphere at the previous position.)
2. **Muzzle flash.** Reuse the `ParticleSystem` pattern from the Introduction series to throw a few sparks at the nose when you fire.
3. **Single-shot mode.** Change firing to one bullet per key *press* instead of auto-fire. (Hint: track `event.repeat` in the `keydown` handler, or clear the key from `heldKeys` after firing.)
4. **Tune the feel.** Find a combination of `speed`, `lifetime`, `cooldown` and `maxBullets` that feels good. The arcade original's bullets travel roughly the width of the screen before vanishing.

**Up next:** *Asteroids Rocks* will give the bullets something to hit. It adds drifting rocks, circle-vs-circle collision, and splitting.
