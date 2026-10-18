# Tutorial: Adding a UFO to Asteroids

In this tutorial you'll add the enemy flying saucer to [Asteroids Waves](../asteroids_waves/README.md). It crosses the screen, weaves up and down, and **shoots back**. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **UFO** that appears every so often, flies across the screen, and leaves the other side
- **Two sizes**: a big, slow, sloppy one worth 200 points, and a small, fast one worth 1,000 that **leads its shots** at a moving target
- A UFO that gets more dangerous as your score climbs
- UFO bullets that can destroy the ship, and ship bullets that can destroy the UFO
- A reusable **aiming** module: direction to a target, intercept aiming, and deliberate inaccuracy
- Unit tests for all of it
- *(Optional)* a wobbling siren that plays while a UFO is on screen

**What you'll learn:** targeting math (unit vectors and predicting where a moving target will be), reusing one class (`BulletSystem`) for a second shooter by generalizing a method, splitting "who decides to shoot" from "who owns the bullets", an object that waits, appears, and leaves, `CreateLineSystem` for multi-stroke drawings, and looping audio.

## Where you're starting

This folder is a copy of the finished Waves sample, plus four empty placeholder files for the new code:

```
asteroids_ufo/
├── index.html
├── tests.html
├── js/
│   ├── wrap.js, collision.js, ship.js, bullets.js, rocks.js,
│   │   hud.js, game.js, waves.js, main.js      (from the Waves sample)
│   ├── aim.js                                   (placeholder -- Step 1)
│   └── ufo.js                                   (placeholder -- Step 3)
└── tests/
    ├── wrap / collision / ship / bullets / rocks / hud / game / waves .tests.js   (from the Waves sample)
    ├── aim.tests.js                             (placeholder -- Step 1)
    └── ufo.tests.js                             (placeholder -- Step 4)
```

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Waves sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` is never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Open `index.html` in a browser now to confirm the game still works. Open `tests.html` too and note how many tests pass; you'll watch that number grow. Keep the developer console open (F12) as you work.

---

## Step 1: Aiming math

Before there's a UFO, there needs to be a way for something to **aim**. That's pure geometry on numbers, with no ships or screens involved, so it goes in its own small module that is easy to test.

You need three tools:

1. **`directionTo`**: the unit vector (a direction with length 1) from one point to another. A bullet's velocity is then just `direction * speed`.
2. **`interceptDirection`**: where to aim at a target that is *moving*. Aim at where it is, and a bullet that takes a second to arrive finds the target long gone. You have to aim at where it *will be*.
3. **`rotateDirection`**: turn a direction by an angle, so a shooter can be deliberately inaccurate.

### The idea behind intercept aiming

Fire a bullet of speed `s` at time 0. Suppose it meets the target at time `t`. By then the bullet has flown a distance `s * t`, and the target has moved from where it started along its velocity. For them to meet, the target's distance from the shooter at time `t` must equal `s * t`:

```
| (target - shooter) + targetVelocity * t |  =  s * t
```

Square both sides and the distance becomes a sum of squares, which rearranges into a **quadratic equation in `t`**: `a·t² + b·t + c = 0`, where

- `a = (target speed)² − s²`
- `b = 2 × (position · velocity)`
- `c = (distance to target)²`

Solve it, take the earliest positive `t`, work out where the target will be at that moment, and aim there. If there is no positive solution, the target is simply outrunning the bullet, so you give up on leading it and aim straight at it.

### The code

Put this in `js/aim.js`:

```js
// Aiming math for anything that shoots at something else. Plain functions on
// plain numbers, so they can be tested without a ship, a UFO, or a screen.
//
// Directions are unit vectors: { x, y } with a length of 1. A bullet's velocity
// is then just direction * speed.

// The unit vector pointing from (fx, fy) toward (tx, ty). If the two points are
// the same, there is no direction to speak of, so it returns "straight up".
function directionTo(fx, fy, tx, ty) {
  const dx = tx - fx;
  const dy = ty - fy;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 1 };
  return { x: dx / length, y: dy / length };
}

// The unit vector to fire along so that a bullet of the given `speed`, fired
// from (fx, fy), meets a target now at (tx, ty) moving at (tvx, tvy). Aiming
// where the target IS misses a moving target; this aims where it WILL BE.
//
// If the bullet fired at time 0 meets the target at time t, then the target's
// distance from the shooter at t equals how far the bullet has flown:
//
//   |(tx - fx, ty - fy) + (tvx, tvy) * t| = speed * t
//
// Squaring both sides gives a quadratic in t. Take the earliest positive
// answer. If there isn't one (the target is outrunning the bullet), give up on
// leading it and aim straight at it.
function interceptDirection(fx, fy, tx, ty, tvx, tvy, speed) {
  const rx = tx - fx;
  const ry = ty - fy;

  const a = tvx * tvx + tvy * tvy - speed * speed;
  const b = 2 * (rx * tvx + ry * tvy);
  const c = rx * rx + ry * ry;

  let t = null;
  if (Math.abs(a) < 1e-9) {
    // The target moves at exactly the bullet's speed: the quadratic collapses
    // to a straight line, b * t + c = 0.
    if (b < 0) t = -c / b;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter((x) => x > 0);
      if (candidates.length) t = Math.min(...candidates);
    }
  }

  if (t === null) return directionTo(fx, fy, tx, ty);
  return directionTo(fx, fy, tx + tvx * t, ty + tvy * t);
}

// Turns a direction by `angle` radians (positive = counter-clockwise). Used to
// make a shooter inaccurate on purpose.
function rotateDirection(direction, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: direction.x * cos - direction.y * sin, y: direction.x * sin + direction.y * cos };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { directionTo, interceptDirection, rotateDirection };
} else {
  window.directionTo = directionTo;
  window.interceptDirection = interceptDirection;
  window.rotateDirection = rotateDirection;
}
```

Things to notice:

- **`directionTo` guards against a zero distance.** Dividing by a length of 0 would produce `NaN`, so identical points give "straight up" instead.
- **A special case for `a` near zero.** When the target moves at exactly the bullet's speed, the quadratic stops being a quadratic (the `t²` term disappears), and the formula would divide by zero. That case is solved as a straight line instead.
- **`filter((x) => x > 0)`** throws away answers in the past. A quadratic has two roots, and a negative time means "this would have worked if you'd fired earlier".
- **`Object.assign`-style exports.** This file defines three functions, so the export hands back an object with all three (and in the browser it puts each on `window`).

### Tests

Put this in `tests/aim.tests.js`:

```js
// Directions are floating-point, so compare within a small tolerance.
const closeTo = (assert, actual, expected, message) =>
  assert.true(Math.abs(actual - expected) < 1e-9, message || `expected ${actual} to be close to ${expected}`);

QUnit.module("directionTo", () => {
  QUnit.test("points along an axis", (assert) => {
    const right = directionTo(0, 0, 5, 0);
    closeTo(assert, right.x, 1);
    closeTo(assert, right.y, 0);

    const down = directionTo(0, 0, 0, -3);
    closeTo(assert, down.x, 0);
    closeTo(assert, down.y, -1);
  });

  QUnit.test("points along a diagonal", (assert) => {
    const d = directionTo(1, 1, 4, 5); // a 3-4-5 triangle
    closeTo(assert, d.x, 0.6);
    closeTo(assert, d.y, 0.8);
  });

  QUnit.test("always returns a unit vector, however far away the target is", (assert) => {
    for (const [tx, ty] of [[1, 0], [100, 37], [-0.001, 0.002], [-50, -50]]) {
      const d = directionTo(0, 0, tx, ty);
      closeTo(assert, Math.hypot(d.x, d.y), 1);
    }
  });

  QUnit.test("two identical points have no direction, so it falls back to straight up", (assert) => {
    assert.deepEqual(directionTo(2, 2, 2, 2), { x: 0, y: 1 });
  });
});

QUnit.module("interceptDirection", () => {
  QUnit.test("a target standing still is aimed at directly", (assert) => {
    const lead = interceptDirection(0, 0, 3, 4, 0, 0, 10);
    const direct = directionTo(0, 0, 3, 4);

    closeTo(assert, lead.x, direct.x);
    closeTo(assert, lead.y, direct.y);
  });

  QUnit.test("a target crossing the line of fire is led", (assert) => {
    // Shooter at the origin, bullets at speed 5. The target is 10 to the right
    // and moving up at 3. They meet after 2.5 s, when the target is at (10, 7.5)
    // and the bullet has flown 5 * 2.5 = 12.5 units: a 10-7.5-12.5 triangle.
    const d = interceptDirection(0, 0, 10, 0, 0, 3, 5);

    closeTo(assert, d.x, 0.8);
    closeTo(assert, d.y, 0.6);
  });

  QUnit.test("the bullet really does meet the target", (assert) => {
    const [fx, fy, tx, ty, tvx, tvy, speed] = [-2, 1, 6, -4, -1.5, 2, 7];
    const d = interceptDirection(fx, fy, tx, ty, tvx, tvy, speed);

    // The bullet is at fx + d.x * speed * t and the target at tx + tvx * t, so
    // they share an x when t = (tx - fx) / (d.x * speed - tvx). If the aim is
    // right, they must share a y at that same moment.
    const t = (tx - fx) / (d.x * speed - tvx);
    assert.true(t > 0, "the meeting is in the future");
    closeTo(assert, fy + d.y * speed * t, ty + tvy * t, "same y at the same time");
  });

  QUnit.test("a target moving straight away more slowly than the bullet is caught", (assert) => {
    // 10 away and receding at 2; the bullet does 5, so they meet after 10/3 s.
    const d = interceptDirection(0, 0, 10, 0, 2, 0, 5);

    closeTo(assert, d.x, 1);
    closeTo(assert, d.y, 0);
  });

  QUnit.test("a target outrunning the bullet falls back to aiming straight at it", (assert) => {
    const d = interceptDirection(0, 0, 10, 0, 8, 0, 5); // receding at 8, bullet does 5

    closeTo(assert, d.x, 1);
    closeTo(assert, d.y, 0);
  });

  QUnit.test("a target moving at exactly the bullet's speed is handled", (assert) => {
    // Straight toward the shooter at the bullet's speed: they meet halfway.
    const d = interceptDirection(0, 0, 10, 0, -5, 0, 5);

    closeTo(assert, d.x, 1);
    closeTo(assert, d.y, 0);
  });

  QUnit.test("always returns a unit vector", (assert) => {
    const d = interceptDirection(1, 2, -7, 5, 3, -4, 6);

    closeTo(assert, Math.hypot(d.x, d.y), 1);
  });
});

QUnit.module("rotateDirection", () => {
  QUnit.test("an angle of zero changes nothing", (assert) => {
    const d = rotateDirection({ x: 0.6, y: 0.8 }, 0);

    closeTo(assert, d.x, 0.6);
    closeTo(assert, d.y, 0.8);
  });

  QUnit.test("a quarter turn counter-clockwise takes right to up", (assert) => {
    const d = rotateDirection({ x: 1, y: 0 }, Math.PI / 2);

    closeTo(assert, d.x, 0);
    closeTo(assert, d.y, 1);
  });

  QUnit.test("a negative angle turns clockwise", (assert) => {
    const d = rotateDirection({ x: 1, y: 0 }, -Math.PI / 2);

    closeTo(assert, d.x, 0);
    closeTo(assert, d.y, -1);
  });

  QUnit.test("rotating never changes the length", (assert) => {
    const d = rotateDirection({ x: 0.6, y: 0.8 }, 1.234);

    closeTo(assert, Math.hypot(d.x, d.y), 1);
  });
});
```

Look at the second intercept test. The numbers were chosen so the answer is a famous right triangle: the target is 10 away and moving at 3, the bullet does 5, they meet after 2.5 seconds with the target at (10, 7.5) and the bullet having flown 12.5. That's a 10-7.5-12.5 triangle, a 4-3-5 triangle scaled up, so the expected direction is exactly `(0.8, 0.6)`. **Pick numbers whose answer you can check by hand** when you can; it makes a test far easier to trust.

The next test, "the bullet really does meet the target", checks the *property* instead of a number: if you aim that way, at the moment the bullet and target share an x they also share a y.

Register the new files on **both** pages: the game (`index.html`) and the test page (`tests.html`) each have their own list of scripts. First `index.html`: add `aim.js` after `collision.js` (add the one line; don't add a second copy of the others):

```html
  <script src="js/collision.js"></script>
  <script src="js/aim.js"></script>
```

In `tests.html`, add the script and its tests next to the others:

```html
  <script src="js/aim.js"></script>
```
```html
  <script src="tests/aim.tests.js"></script>
```

Reload `tests.html`: **15 more** tests, all green.

---

## Step 2: Let `BulletSystem` fire from anywhere

The UFO needs bullets too, and `BulletSystem` already does nearly everything: moving, wrapping, expiring, drawing, disposing. But its `fire()` takes a *ship* and always launches from the ship's nose. Rather than write a second bullet system, generalize the one you have: split `fire()` into the ship-specific part and a general part, and have the UFO use the general one.

Open `js/bullets.js`.

### 2a. Split `fire()`

Find `fire(ship)`:

```js
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
```

Replace *those lines* (from `fire(ship) {` down to the closing `};` of the `bullet` object) with:

```js
    fire(ship) {
        const { x, y, dirX, dirY } = ship.muzzle();
        // The bullet inherits the ship's velocity, so firing while drifting
        // sideways sends it off at an angle, like in the arcade original.
        return this.fireFrom(x, y, dirX, dirY, ship.vx, ship.vy);
    }

    // Fires one bullet from any point, along the unit vector (dirX, dirY), on
    // top of an optional starting velocity. The ship uses it through fire();
    // the UFO calls it directly. Returns the new bullet, or null if the gun is
    // cooling down or the cap has been reached.
    fireFrom(x, y, dirX, dirY, vx = 0, vy = 0) {
        if (this.cooldownRemaining > 0 || this.bullets.length >= this.maxBullets) return null;

        const bullet = {
            x,
            y,
            vx: vx + dirX * this.speed,
            vy: vy + dirY * this.speed,
            life: this.lifetime,
            mesh: null,
        };
```

The rest of the old method (the `if (this.scene) this._attach(bullet);` line and the lines after it) now belongs to `fireFrom` and stays exactly as it was.

Things to notice:

- **This is a refactor.** `fire(ship)` behaves exactly as before, which the existing bullet tests prove. Reload `tests.html` to check.
- **`vx = 0, vy = 0` defaults** mean a caller that doesn't care about inherited motion can leave them out. The UFO's bullets don't inherit the UFO's speed.

### 2b. Ask "did a bullet hit this circle?"

Add this method above `remove()`:

```js
    // Returns the first bullet that overlaps the given circle, or null if none
    // does. Used to ask "did anything shoot this?" about a UFO or the ship.
    findHit(x, y, radius) {
        return this.bullets.find((b) => circlesOverlap(b.x, b.y, this.radius, x, y, radius)) || null;
    }
```

It only *finds* the bullet; it doesn't remove it. The caller decides what a hit means: shoot a UFO and the bullet is used up; that's `remove()`.

### 2c. Tests

Add this to the **end** of `tests/bullets.tests.js`:

```js
QUnit.module("BulletSystem fireFrom", () => {
  QUnit.test("fires from the given point along the given direction", (assert) => {
    const system = new BulletSystem({ speed: 10 });

    const bullet = system.fireFrom(3, -2, 0, -1);

    assert.strictEqual(bullet.x, 3);
    assert.strictEqual(bullet.y, -2);
    assert.strictEqual(bullet.vx, 0);
    assert.strictEqual(bullet.vy, -10);
    assert.strictEqual(system.bullets.length, 1);
  });

  QUnit.test("adds an optional starting velocity", (assert) => {
    const system = new BulletSystem({ speed: 10 });

    const bullet = system.fireFrom(0, 0, 1, 0, 2, 3);

    assert.strictEqual(bullet.vx, 12);
    assert.strictEqual(bullet.vy, 3);
  });

  QUnit.test("without a starting velocity, the bullet only has its own speed", (assert) => {
    const bullet = new BulletSystem({ speed: 4 }).fireFrom(0, 0, 0, 1);

    assert.strictEqual(bullet.vx, 0);
    assert.strictEqual(bullet.vy, 4);
  });

  QUnit.test("still respects the cooldown and the bullet cap", (assert) => {
    const slow = new BulletSystem({ cooldown: 1 });
    assert.ok(slow.fireFrom(0, 0, 1, 0));
    assert.strictEqual(slow.fireFrom(0, 0, 1, 0), null, "cooling down");

    const full = new BulletSystem({ cooldown: 0, maxBullets: 1 });
    assert.ok(full.fireFrom(0, 0, 1, 0));
    assert.strictEqual(full.fireFrom(0, 0, 1, 0), null, "at the cap");
  });

  QUnit.test("fire(ship) still launches from the ship's nose, using the ship's velocity", (assert) => {
    const ship = new Ship({ radius: 1 });
    ship.vx = 2;
    const bullet = new BulletSystem({ speed: 10 }).fire(ship);

    assert.strictEqual(bullet.y, 1, "the nose of an upward-pointing ship");
    assert.strictEqual(bullet.vx, 2, "the ship's own sideways drift is inherited");
    assert.strictEqual(bullet.vy, 10);
  });
});

QUnit.module("BulletSystem findHit", () => {
  QUnit.test("returns the bullet that overlaps a circle", (assert) => {
    const system = new BulletSystem({ radius: 0.1 });
    const bullet = system.fireFrom(5, 5, 1, 0);

    assert.strictEqual(system.findHit(5.2, 5, 0.5), bullet);
  });

  QUnit.test("returns null when no bullet is close enough", (assert) => {
    const system = new BulletSystem({ radius: 0.1 });
    system.fireFrom(5, 5, 1, 0);

    assert.strictEqual(system.findHit(0, 0, 0.5), null);
  });

  QUnit.test("counts both radii", (assert) => {
    const system = new BulletSystem({ radius: 0.1 });
    system.fireFrom(1, 0, 1, 0);

    assert.strictEqual(system.findHit(0, 0, 0.5), null, "0.6 needed, bullet is 1.0 away");
    assert.ok(system.findHit(0, 0, 1), "a bigger circle reaches it");
  });

  QUnit.test("doesn't remove the bullet", (assert) => {
    const system = new BulletSystem({ radius: 0.1 });
    system.fireFrom(0, 0, 1, 0);

    system.findHit(0, 0, 1);

    assert.strictEqual(system.bullets.length, 1);
  });

  QUnit.test("an empty system hits nothing", (assert) => {
    assert.strictEqual(new BulletSystem().findHit(0, 0, 10), null);
  });
});
```

Reload `tests.html`: **10 more** tests, all green.

---

## Step 3: Write `Ufo`

The UFO is one object that is either on screen (`active`) or waiting for its next appearance. Two things to settle first.

**It doesn't own the bullets.** `Ufo` decides *where it is*, *when it shoots*, and *at what*. `update()` just returns a "shot" (`{ x, y, dirX, dirY }`), and `main.js` fires it from a `BulletSystem`. That keeps the UFO free of anything about bullet lifetimes, wrapping or drawing.

**It spawns itself.** While there's no UFO, `update()` counts down, and when the timer runs out it spawns one. `main.js` just calls `update()` every frame.

Open `js/ufo.js` and build it up in pieces.

### 3a. The size table and constructor

```js
// The flying saucer: it crosses the screen, weaves up and down, and shoots at
// the ship. There is only ever one, so this is a single object that is
// "active" while it's on screen and waits to spawn again while it isn't.
//
// Two sizes, as in the arcade game. The big one is slow and sloppy; the small
// one is fast, worth far more, and aims well enough to lead a moving target.
//
// This class decides WHERE the UFO is and WHEN and AT WHAT it shoots. It does
// not own the bullets: update() returns a shot, and main.js fires it from a
// BulletSystem. `BABYLON` is only touched when `scene` is supplied, and all
// randomness goes through an injectable `random`, as in Ship, BulletSystem, and
// RockField. See ../tests/ufo.tests.js.

const UFO_SIZES = {
  large: { radius: 0.9, points: 200, speed: 3, fireInterval: 1.6, spread: 0.6, leadsTarget: false },
  small: { radius: 0.5, points: 1000, speed: 4.5, fireInterval: 1.1, spread: 0.12, leadsTarget: true },
};

class Ufo {
  constructor({
    scene = null,
    minSpawnDelay = 12, // seconds from the start (or from the last UFO) to the next one
    maxSpawnDelay = 25,
    bulletSpeed = 7, // how fast the UFO's bullets travel; the small UFO needs it to lead a target
    color = "#ff6b6b",
    random = Math.random,
  } = {}) {
    this.scene = scene;
    this.minSpawnDelay = minSpawnDelay;
    this.maxSpawnDelay = maxSpawnDelay;
    this.bulletSpeed = bulletSpeed;
    this.color = color;
    this._random = random;

    this.active = false;
    this.size = null;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 0;
    this.direction = 1; // +1 flying right, -1 flying left
    this.fireTimer = 0;
    this.weaveTimer = 0;
    this.spawnTimer = this._randomSpawnDelay();
    this.mesh = null;
  }
}
```

Things to notice:

- **Two sizes in one table**, like `ROCK_SIZES`. The small UFO is *better in every way except being small*: faster, more accurate, and `leadsTarget: true`. Its `spread` (aiming error, in radians) is about a fifth of the big one's.
- `bulletSpeed` is an option because the small UFO's aiming needs it (intercept math depends on how fast the bullet travels), and the number has to match the `BulletSystem` that fires the shot. `main.js` will pass the same constant to both.
- The constructor **draws one `random()` value** to choose the delay before the first UFO. Remember that when you write the tests.

### 3b. Choosing a size and spawning

```js
  // Which size to send next. The big one is common early; the longer the
  // player has survived (the higher the score), the more often the dangerous
  // small one shows up, up to a 3-in-4 chance.
  pickSize(score) {
    const smallChance = Math.min(score / 20000, 0.75);
    return this._random() < smallChance ? "small" : "large";
  }

  // Starts a UFO of the given size ("large" or "small") entering from a random
  // side of the screen at a random height.
  spawn(size, bounds) {
    const config = UFO_SIZES[size];
    const { halfWidth, halfHeight } = bounds;

    this.active = true;
    this.size = size;
    this.radius = config.radius;
    this.direction = this._random() < 0.5 ? 1 : -1;
    this.x = -this.direction * (halfWidth + this.radius); // just off the side it enters from
    this.y = (this._random() * 2 - 1) * halfHeight * 0.8;
    this.vx = this.direction * config.speed;
    this.vy = 0;
    this.fireTimer = config.fireInterval;
    this.weaveTimer = this._randomWeaveTime();

    if (this.scene) this._attach();
  }
```

Things to notice:

- **Difficulty tracks the score.** `score / 20000` is a chance from 0 up to 75%, so the dangerous small UFO is rare early and common late. `Math.min(..., 0.75)` keeps the big one coming sometimes.
- **It enters just off the screen edge** (`halfWidth + radius`) so it slides into view rather than popping in, and flies toward the far side. `-this.direction * (...)` puts a right-flying UFO on the left.
- Starting at 80% of the half-height keeps it from appearing right at the top or bottom edge.

### 3c. Flying, leaving, shooting

```js
  // Advances the UFO by dt seconds and returns a shot to fire, or null.
  //
  // While there's no UFO this counts down to the next spawn (choosing a size
  // from `score`). While there is one it flies, weaves, leaves when it reaches
  // the far side, and fires at `target` -- anything with x, y, vx and vy, such
  // as the ship -- every fireInterval seconds. Pass null as the target when
  // there is nothing to shoot at.
  update(dt, bounds, target = null, score = 0) {
    if (!this.active) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) this.spawn(this.pickSize(score), bounds);
      return null;
    }

    const { halfWidth, halfHeight } = bounds;

    // Every so often, pick a new up/down drift: up, level, or down.
    this.weaveTimer -= dt;
    if (this.weaveTimer <= 0) {
      this.vy = (Math.floor(this._random() * 3) - 1) * UFO_SIZES[this.size].speed * 0.6;
      this.weaveTimer = this._randomWeaveTime();
    }

    this.x += this.vx * dt;
    this.y = wrapCoordinate(this.y + this.vy * dt, halfHeight + this.radius);
    this._syncMesh();

    // Gone off the far side: it doesn't wrap, it leaves.
    if (this.direction * this.x > halfWidth + this.radius) {
      this._leave();
      return null;
    }

    this.fireTimer -= dt;
    if (this.fireTimer > 0 || !target) return null;
    this.fireTimer = UFO_SIZES[this.size].fireInterval;
    return this._aimAt(target);
  }
```

Things to notice:

- **One method, two modes.** Inactive: count down, maybe spawn, return `null`. Active: weave, move, maybe leave, maybe shoot.
- **Weaving.** Every one to two and a half seconds the UFO picks a new vertical drift: `Math.floor(random * 3) - 1` is -1, 0 or +1 (down, level, up), scaled to 60% of its speed. Its height `wrapCoordinate`s, so it can drift off the top and appear at the bottom, using the helper you made two tutorials ago.
- **Leaving, not wrapping.** Unlike rocks and the ship, the UFO is meant to *cross* the screen. When `direction * x` passes the far edge (the multiplication by `direction` makes one check cover both directions), it leaves.
- **It only shoots when there's a `target`.** Pass `null` and it never fires, which is how `main.js` will stop it shooting at a ship that doesn't exist.

### 3d. Being destroyed

```js
  // Shot down or rammed: removes the UFO, starts the wait for the next one,
  // and returns the points it was worth (0 if there was no UFO).
  destroy() {
    if (!this.active) return 0;
    const points = UFO_SIZES[this.size].points;
    this._leave();
    return points;
  }

  // Removes the UFO without scoring, and starts the wait over (e.g. on reset).
  reset() {
    this._leave();
  }
```

`destroy()` returns the **points**, so the caller can write `hud.addScore(ufo.destroy())` in one line. Destroying a UFO that isn't there is worth 0, so it's safe to call blindly. `reset()` is the same removal without scoring, for restarting the game.

### 3e. Aiming

```js
  // Where to shoot, as { x, y, dirX, dirY }: from the UFO toward the target.
  // The small UFO leads a moving target; the large one just aims at where it
  // is. Either way the direction is then turned by a random error, wide for
  // the large UFO and narrow for the small one.
  _aimAt(target) {
    const config = UFO_SIZES[this.size];
    const ideal = config.leadsTarget
      ? interceptDirection(this.x, this.y, target.x, target.y, target.vx, target.vy, this.bulletSpeed)
      : directionTo(this.x, this.y, target.x, target.y);

    const error = (this._random() * 2 - 1) * config.spread;
    const aim = rotateDirection(ideal, error);
    return { x: this.x, y: this.y, dirX: aim.x, dirY: aim.y };
  }
```

This is where Step 1 pays off. Look at the two tools side by side:

- The **small** UFO uses `interceptDirection`: it leads a moving ship.
- The **large** UFO uses `directionTo`: it aims where the ship is *now*.

Then both get a **random error** from `rotateDirection`. `random() * 2 - 1` is between -1 and +1, times `spread` radians. The big UFO can be wrong by up to 0.6 radians (about 34°); the small one by only 0.12 (about 7°). The result is that the big UFO is easy to dodge, and the small one will hit you if you fly in a straight line.

### 3f. Housekeeping

```js
  _leave() {
    this.active = false;
    this.size = null;
    this.spawnTimer = this._randomSpawnDelay();
    this._disposeMesh();
  }

  _randomSpawnDelay() {
    return this.minSpawnDelay + this._random() * (this.maxSpawnDelay - this.minSpawnDelay);
  }

  _randomWeaveTime() {
    return 1 + this._random() * 1.5; // between 1 and 2.5 seconds
  }
```

`_leave()` is shared by "flew off the far side", `destroy()` and `reset()`. They all mean the same thing for the UFO: stop being active, start waiting for the next one, tidy up the mesh. One private method means they can't drift apart.

### 3g. The Babylon.js parts

```js
  // A saucer drawn as two separate line strokes: the hull (a flat diamond
  // with a line through the middle) and the dome on top. CreateLineSystem
  // draws several disconnected polylines as one mesh.
  _attach() {
    const r = this.radius;
    const v = (x, y) => new BABYLON.Vector3(x * r, y * r, 0);

    this.mesh = BABYLON.MeshBuilder.CreateLineSystem(
      "ufo",
      {
        lines: [
          [v(-1, 0), v(-0.55, -0.35), v(0.55, -0.35), v(1, 0), v(0.55, 0.3), v(-0.55, 0.3), v(-1, 0), v(1, 0)],
          [v(-0.35, 0.3), v(-0.2, 0.6), v(0.2, 0.6), v(0.35, 0.3)],
        ],
      },
      this.scene
    );
    this.mesh.color = BABYLON.Color3.FromHexString(this.color);
    this._syncMesh();
  }

  _syncMesh() {
    if (!this.mesh) return;
    this.mesh.position.x = this.x;
    this.mesh.position.y = this.y;
  }

  _disposeMesh() {
    if (!this.mesh) return;
    this.mesh.dispose();
    this.mesh = null;
  }
```

Things to notice:

- **`CreateLineSystem`** draws several separate polylines as a single mesh. The saucer is two strokes that don't touch end to end: the hull (a flat diamond, with a line through the middle) and the dome above it. `CreateLines`, which you've used for the ship and rocks, draws one connected path.
- `v(x, y)` is a tiny local helper that scales a unit-sized point by the radius, so the same drawing serves both sizes.
- The mesh is created at **spawn** and disposed in `_leave()`, so a saucer doesn't linger invisibly between appearances. It never rotates, so `_syncMesh()` only sets the position.

### 3h. Export

```js
// The size table, for callers (and tests) that need to read it without
// duplicating the numbers this class already owns.
Ufo.SIZES = UFO_SIZES;

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Ufo;
} else {
  window.Ufo = Ufo;
}
```

---

## Step 4: Test `Ufo`

Put this in `tests/ufo.tests.js`. It's long, so it's in four parts. Add each part below the previous one, in the same file.

### 4a. Spawning

```js
// Returns a random()-compatible function that replays `values`, cycling once
// exhausted, so randomized behavior can be pinned down exactly.
const script = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

// A Ufo's constructor uses one random() call to pick how long until the first
// UFO appears. `scripted` feeds it a throwaway value first, so the values you
// list are the ones spawn() and update() see.
const scripted = (values) => script([0.5, ...values]);

QUnit.module("Ufo spawning", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = Ufo.SIZES;

  QUnit.test("starts with no UFO on screen", (assert) => {
    const ufo = new Ufo();

    assert.false(ufo.active);
    assert.strictEqual(ufo.size, null);
  });

  QUnit.test("the first UFO is a while away: between the min and max delay", (assert) => {
    for (let i = 0; i < 30; i++) {
      const ufo = new Ufo({ minSpawnDelay: 12, maxSpawnDelay: 25 });
      assert.true(ufo.spawnTimer >= 12 && ufo.spawnTimer <= 25);
    }
  });

  QUnit.test("update() counts down and spawns a UFO when the timer runs out", (assert) => {
    const ufo = new Ufo({ minSpawnDelay: 5, maxSpawnDelay: 5 });

    ufo.update(4, BOUNDS);
    assert.false(ufo.active, "4s into a 5s wait");

    ufo.update(1.1, BOUNDS);
    assert.true(ufo.active, "5.1s: here it comes");
  });

  QUnit.test("pickSize() is always large at a score of zero", (assert) => {
    const ufo = new Ufo({ random: script([0.0]) });

    assert.strictEqual(ufo.pickSize(0), "large");
  });

  QUnit.test("pickSize() sends the small one more often as the score climbs", (assert) => {
    const mostlyLow = new Ufo({ random: script([0.5]) });
    assert.strictEqual(mostlyLow.pickSize(5000), "large", "a 25% chance, and 0.5 isn't below it");
    assert.strictEqual(mostlyLow.pickSize(15000), "small", "a 75% chance, and 0.5 is below it");
  });

  QUnit.test("the chance of a small UFO tops out at three in four", (assert) => {
    const ufo = new Ufo({ random: script([0.8]) });

    assert.strictEqual(ufo.pickSize(1000000), "large", "0.8 is above 0.75, even at an enormous score");
  });

  QUnit.test("spawn() sets up a UFO of the chosen size just off the screen edge it enters from", (assert) => {
    const ufo = new Ufo({ random: scripted([0.9, 0.5]) }); // 0.9 -> flies left, 0.5 -> middle height

    ufo.spawn("small", BOUNDS);

    assert.true(ufo.active);
    assert.strictEqual(ufo.size, "small");
    assert.strictEqual(ufo.radius, SIZES.small.radius);
    assert.strictEqual(ufo.direction, -1, "flying left");
    assert.strictEqual(ufo.x, BOUNDS.halfWidth + SIZES.small.radius, "entering from the right");
    assert.strictEqual(ufo.vx, -SIZES.small.speed);
  });

  QUnit.test("a UFO that enters from the left flies right", (assert) => {
    const ufo = new Ufo({ random: scripted([0.1, 0.5]) });

    ufo.spawn("large", BOUNDS);

    assert.strictEqual(ufo.direction, 1);
    assert.strictEqual(ufo.x, -(BOUNDS.halfWidth + SIZES.large.radius));
    assert.strictEqual(ufo.vx, SIZES.large.speed);
  });

  QUnit.test("it appears at a height that stays on screen", (assert) => {
    for (let i = 0; i < 100; i++) {
      const ufo = new Ufo();
      ufo.spawn("large", BOUNDS);
      assert.true(Math.abs(ufo.y) <= BOUNDS.halfHeight * 0.8 + 1e-9);
    }
  });
});
```

### 4b. Flying

```js
QUnit.module("Ufo flying", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = Ufo.SIZES;

  // A UFO that enters from the left at the vertical middle, with nothing random
  // left to chance, and doesn't shoot unless given a target.
  const flyingRight = (size = "large") => {
    const ufo = new Ufo({ random: scripted([0.1, 0.5, 0.5, 0.5, 0.5]) });
    ufo.spawn(size, BOUNDS);
    ufo.weaveTimer = 100; // no weaving unless a test wants it
    return ufo;
  };

  QUnit.test("it flies across the screen at its speed", (assert) => {
    const ufo = flyingRight();
    const startX = ufo.x;

    ufo.update(1, BOUNDS);

    assert.true(Math.abs(ufo.x - (startX + SIZES.large.speed)) < 1e-9);
  });

  QUnit.test("it leaves once it's fully past the far side, rather than wrapping", (assert) => {
    const ufo = flyingRight();
    ufo.x = BOUNDS.halfWidth + SIZES.large.radius - 0.01;

    ufo.update(0.1, BOUNDS);

    assert.false(ufo.active);
  });

  QUnit.test("it doesn't leave while it is still crossing", (assert) => {
    const ufo = flyingRight();

    ufo.update(0.1, BOUNDS);

    assert.true(ufo.active);
  });

  QUnit.test("once gone, the wait for the next UFO starts again", (assert) => {
    const ufo = new Ufo({ minSpawnDelay: 7, maxSpawnDelay: 7, random: scripted([0.1, 0.5]) });
    ufo.spawn("large", BOUNDS);
    ufo.weaveTimer = 100;
    ufo.x = BOUNDS.halfWidth + SIZES.large.radius;

    ufo.update(0.1, BOUNDS);

    assert.false(ufo.active);
    assert.strictEqual(ufo.spawnTimer, 7);
  });

  QUnit.test("a left-flying UFO leaves through the left side", (assert) => {
    const ufo = new Ufo({ random: scripted([0.9, 0.5]) });
    ufo.spawn("large", BOUNDS);
    ufo.weaveTimer = 100;
    ufo.x = -(BOUNDS.halfWidth + SIZES.large.radius);

    ufo.update(0.1, BOUNDS);

    assert.false(ufo.active);
  });

  QUnit.test("it weaves: after a while it starts drifting up or down", (assert) => {
    // After spawning (two calls), the weave timer asks for a time, then the
    // first weave picks a direction: 0.99 -> index 2 -> +1 (up).
    const ufo = new Ufo({ random: scripted([0.1, 0.5, 0.0, 0.99, 0.5]) });
    ufo.spawn("large", BOUNDS); // weaveTimer = 1 + 0.0 * 1.5 = 1

    ufo.update(1.1, BOUNDS);

    assert.true(Math.abs(ufo.vy - SIZES.large.speed * 0.6) < 1e-9, "drifting up at 60% of its speed");
  });

  QUnit.test("its height wraps around the top and bottom of the screen", (assert) => {
    const ufo = flyingRight();
    ufo.vy = 100;
    ufo.y = 0;

    ufo.update(1, BOUNDS);

    assert.true(Math.abs(ufo.y) <= BOUNDS.halfHeight + SIZES.large.radius, "still within the wrap limits");
  });
});
```

### 4c. Shooting

```js
QUnit.module("Ufo shooting", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = Ufo.SIZES;
  const TARGET = { x: 0, y: 0, vx: 0, vy: 0 };

  // `randoms` are, in order: which way it flies, how high, the weave timer, and
  // finally the aiming error of its first shot.
  const ufoAt = (size, x, y, randoms) => {
    const ufo = new Ufo({ random: scripted(randoms) });
    ufo.spawn(size, BOUNDS);
    ufo.weaveTimer = 100;
    ufo.x = x;
    ufo.y = y;
    ufo.vx = 0; // hold still so the aim is easy to reason about
    return ufo;
  };

  QUnit.test("it doesn't shoot before its first interval is up", (assert) => {
    const ufo = ufoAt("large", 5, 0, [0.1, 0.5, 0.5, 0.5]);

    assert.strictEqual(ufo.update(0.5, BOUNDS, TARGET), null);
  });

  QUnit.test("it shoots when the interval is up, then waits for the next one", (assert) => {
    const ufo = ufoAt("large", 5, 0, [0.1, 0.5, 0.5, 0.5]);

    const first = ufo.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);
    assert.ok(first, "fired");

    assert.strictEqual(ufo.update(0.5, BOUNDS, TARGET), null, "has to wait again");
    assert.ok(ufo.update(SIZES.large.fireInterval, BOUNDS, TARGET), "fires again after another interval");
  });

  QUnit.test("it never shoots when there's nothing to shoot at", (assert) => {
    const ufo = ufoAt("large", 5, 0, [0.1, 0.5, 0.5, 0.5]);

    assert.strictEqual(ufo.update(10, BOUNDS, null), null);
  });

  QUnit.test("the shot starts at the UFO", (assert) => {
    const ufo = ufoAt("large", 5, 2, [0.1, 0.5, 0.5, 0.5]);

    const shot = ufo.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);

    assert.strictEqual(shot.x, 5);
    assert.strictEqual(shot.y, 2);
  });

  QUnit.test("the large UFO aims straight at the target when its error is zero", (assert) => {
    // random() = 0.5 makes the aiming error exactly zero.
    const ufo = ufoAt("large", 6, 0, [0.1, 0.5, 0.5, 0.5]);

    const shot = ufo.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);

    assert.true(Math.abs(shot.dirX - -1) < 1e-9, "target is straight to the left");
    assert.true(Math.abs(shot.dirY) < 1e-9);
  });

  QUnit.test("the shot's direction is always a unit vector", (assert) => {
    const ufo = ufoAt("large", 6, 3, [0.1, 0.5, 0.5, 0.2]);

    const shot = ufo.update(SIZES.large.fireInterval + 0.01, BOUNDS, { x: -2, y: 1, vx: 1, vy: 1 });

    assert.true(Math.abs(Math.hypot(shot.dirX, shot.dirY) - 1) < 1e-9);
  });

  QUnit.test("the large UFO is sloppy: its error can be up to its spread either way", (assert) => {
    const wideLeft = ufoAt("large", 6, 0, [0.1, 0.5, 0.5, 0.0]); // error = -spread
    const shotA = wideLeft.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);
    const wideRight = ufoAt("large", 6, 0, [0.1, 0.5, 0.5, 1.0]); // error = +spread
    const shotB = wideRight.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);

    // Straight at the target would be (-1, 0). An error of `spread` turns the shot
    // by that angle, so it picks up a sideways part of sin(spread), to either side.
    const sideways = Math.sin(SIZES.large.spread);
    assert.true(Math.abs(Math.abs(shotA.dirY) - sideways) < 1e-9);
    assert.true(Math.abs(Math.abs(shotB.dirY) - sideways) < 1e-9);
    assert.notStrictEqual(Math.sign(shotA.dirY), Math.sign(shotB.dirY), "the two errors are on opposite sides");
  });

  QUnit.test("the small UFO leads a moving target; the large one doesn't", (assert) => {
    // The target is 6 to the left and moving straight down at 3. Aiming where it
    // IS points straight left; leading it points down-left.
    const moving = { x: 0, y: 0, vx: 0, vy: -3 };
    const small = ufoAt("small", 6, 0, [0.1, 0.5, 0.5, 0.5]);
    const large = ufoAt("large", 6, 0, [0.1, 0.5, 0.5, 0.5]);

    const smallShot = small.update(SIZES.small.fireInterval + 0.01, BOUNDS, moving);
    const largeShot = large.update(SIZES.large.fireInterval + 0.01, BOUNDS, moving);

    assert.true(smallShot.dirY < -0.05, "the small UFO aims below the target's current position");
    assert.true(Math.abs(largeShot.dirY) < 1e-9, "the large UFO aims straight at it");
  });

  QUnit.test("the small UFO is much more accurate than the large one", (assert) => {
    assert.true(SIZES.small.spread < SIZES.large.spread / 3);
  });

  QUnit.test("the small UFO is worth more, and faster, than the large one", (assert) => {
    assert.true(SIZES.small.points > SIZES.large.points);
    assert.true(SIZES.small.speed > SIZES.large.speed);
  });
});
```

### 4d. Destroying, and drawing

```js
QUnit.module("Ufo destroy and reset", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = Ufo.SIZES;

  QUnit.test("destroy() removes the UFO and returns its points", (assert) => {
    const ufo = new Ufo();
    ufo.spawn("small", BOUNDS);

    assert.strictEqual(ufo.destroy(), SIZES.small.points);
    assert.false(ufo.active);
  });

  QUnit.test("the large UFO is worth its own points", (assert) => {
    const ufo = new Ufo();
    ufo.spawn("large", BOUNDS);

    assert.strictEqual(ufo.destroy(), SIZES.large.points);
  });

  QUnit.test("destroying a UFO that isn't there is worth nothing", (assert) => {
    assert.strictEqual(new Ufo().destroy(), 0);
  });

  QUnit.test("destroying starts the wait for the next UFO", (assert) => {
    const ufo = new Ufo({ minSpawnDelay: 9, maxSpawnDelay: 9 });
    ufo.spawn("large", BOUNDS);
    ufo.spawnTimer = 0;

    ufo.destroy();

    assert.strictEqual(ufo.spawnTimer, 9);
  });

  QUnit.test("reset() removes the UFO without scoring and starts the wait over", (assert) => {
    const ufo = new Ufo({ minSpawnDelay: 9, maxSpawnDelay: 9 });
    ufo.spawn("large", BOUNDS);

    ufo.reset();

    assert.false(ufo.active);
    assert.strictEqual(ufo.spawnTimer, 9);
  });
});

QUnit.module("Ufo rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeVector3 {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
  }

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    color = null;
    disposed = false;

    constructor(lines) {
      this.lines = lines;
    }
    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: { CreateLineSystem: (name, options) => new FakeMesh(options.lines) },
      Vector3: FakeVector3,
      Color3: { FromHexString: (hex) => hex },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("spawning draws the saucer as two separate strokes", (assert) => {
    const ufo = new Ufo({ scene: {}, color: "#ff0000" });

    ufo.spawn("large", BOUNDS);

    assert.ok(ufo.mesh instanceof FakeMesh);
    assert.strictEqual(ufo.mesh.lines.length, 2, "hull and dome");
    assert.strictEqual(ufo.mesh.color, "#ff0000");
  });

  QUnit.test("the saucer is scaled to the UFO's size", (assert) => {
    const large = new Ufo({ scene: {} });
    large.spawn("large", BOUNDS);
    const small = new Ufo({ scene: {} });
    small.spawn("small", BOUNDS);

    const width = (ufo) => Math.max(...ufo.mesh.lines[0].map((p) => p.x)) - Math.min(...ufo.mesh.lines[0].map((p) => p.x));
    assert.true(Math.abs(width(large) - 2 * Ufo.SIZES.large.radius) < 1e-9);
    assert.true(Math.abs(width(small) - 2 * Ufo.SIZES.small.radius) < 1e-9);
  });

  QUnit.test("no mesh is created when scene is omitted", (assert) => {
    const ufo = new Ufo();

    ufo.spawn("large", BOUNDS);

    assert.strictEqual(ufo.mesh, null);
  });

  QUnit.test("update() keeps the mesh at the UFO's position", (assert) => {
    const ufo = new Ufo({ scene: {}, random: scripted([0.1, 0.5, 0.5, 0.5]) });
    ufo.spawn("large", BOUNDS);
    ufo.weaveTimer = 100;

    ufo.update(1, BOUNDS);

    assert.strictEqual(ufo.mesh.position.x, ufo.x);
    assert.strictEqual(ufo.mesh.position.y, ufo.y);
  });

  QUnit.test("destroy() disposes the mesh", (assert) => {
    const ufo = new Ufo({ scene: {} });
    ufo.spawn("large", BOUNDS);
    const mesh = ufo.mesh;

    ufo.destroy();

    assert.true(mesh.disposed);
    assert.strictEqual(ufo.mesh, null);
  });

  QUnit.test("leaving the screen disposes the mesh too", (assert) => {
    const ufo = new Ufo({ scene: {}, random: scripted([0.1, 0.5, 0.5, 0.5]) });
    ufo.spawn("large", BOUNDS);
    ufo.weaveTimer = 100;
    const mesh = ufo.mesh;
    ufo.x = BOUNDS.halfWidth + Ufo.SIZES.large.radius;

    ufo.update(0.1, BOUNDS);

    assert.true(mesh.disposed);
  });
});
```

Things to notice:

- **`scripted([...])` and the throwaway value.** The constructor uses up one `random()` call, so a plain scripted sequence would be shifted by one. `scripted` puts a throwaway `0.5` in front so the values you list are the ones `spawn()` and `update()` see. If a test like "a UFO that enters from the left flies right" fails mysteriously, count the `random()` calls.
- **Predictable "random" shots.** `random() = 0.5` makes the aiming error exactly zero, so the big UFO's shot points *exactly* at the target and the test can say `dirX is -1`. `0.0` and `1.0` push the error to its two extremes.
- **Comparing the two sizes** in "the small UFO leads a moving target; the large one doesn't" is the most important test here: the same situation gives two different answers because of one flag.

Register the file in `index.html`, `ufo.js` after `waves.js` (add the one line):

```html
  <script src="js/waves.js"></script>
  <script src="js/ufo.js"></script>
```

and in `tests.html`:

```html
  <script src="js/ufo.js"></script>
```
```html
  <script src="tests/ufo.tests.js"></script>
```

Reload `tests.html`: **37 more** tests, all green.

---

## Step 5: Wire it together

Now `main.js` creates the UFO and its bullets, and handles the three new things that can collide.

### 5.0 Check your script tags first

`index.html` and `tests.html` are separate pages with separate lists of scripts, and **adding a file to one doesn't add it to the other**. The tests can pass while the game itself is missing a file. Here that would be especially sneaky: the UFO doesn't call the aiming functions until it first *shoots*, 12-25 seconds into a game, so a missing `aim.js` only shows up as `ReferenceError: directionTo is not defined` long after you've stopped looking.

So before going further, check that the bottom of `index.html` lists **all** of these, in this order:

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
  <script src="js/main.js"></script>
```

### 5a. A shared constant

Add this next to `RESPAWN_PROTECTION`:

```js
const UFO_BULLET_SPEED = 7; // world units/s; the small UFO needs this to lead its shots
```

### 5b. Create the UFO and its bullets

Right after `const rocks = new RockField({ scene });`, add:

```js
  const ufo = new Ufo({ scene, bulletSpeed: UFO_BULLET_SPEED });
  // The UFO's bullets are a second BulletSystem: red, slower, and with no
  // cooldown of its own because the UFO decides when to shoot.
  const ufoBullets = new BulletSystem({
    scene,
    speed: UFO_BULLET_SPEED,
    lifetime: 2.2,
    cooldown: 0,
    maxBullets: 4,
    color: "#ff6b6b",
  });
```

Both use `UFO_BULLET_SPEED`. If they disagreed, the small UFO would lead its shots for a different bullet speed than the one it actually fires, and miss in a way no test would notice.

### 5c. Split `crash` in two

Until now only a rock could destroy the ship, so `crash` did everything. Now a UFO bullet can too. Replace the whole `crash` function (and the comment above it) with these two functions:

```js
  // The ship was destroyed, by whatever: the player loses a life, then either
  // respawns, protected for a few seconds, or the game ends.
  const loseShip = () => {
    hud.setLives(game.loseLife());
    playBangSound("large");
    if (game.over) {
      ship.setVisible(false);
      hud.hideAnnouncement();
      hud.showGameOver();
    } else {
      ship.respawn(RESPAWN_PROTECTION);
    }
  };

  // The ship hit a rock: the rock breaks apart (and scores) as if it had been
  // shot, and the ship is lost.
  const crash = (rock) => {
    const { size } = rock;
    hud.addScore(rocks.destroy(rock).points);
    playBangSound(size);
    loseShip();
  };
```

The "what happens when the ship is lost" part moved into `loseShip`; `crash` is now just "the rock part, then `loseShip`". The collision check for rocks (further down) still calls `crash(rock)` and is unchanged.

### 5d. **R** resets the UFO too

In the `KeyR` branch, add two lines after `bullets.clear();`:

```js
      bullets.clear();
      ufoBullets.clear();
      ufo.reset();
      rocks.clear();
```

### 5e. The UFO each frame

In the `onBeforeRenderObservable` callback, find the comment `// Wave progression: when the screen is clear,` and add this block **just above** it:

```js
    // The UFO flies and weaves, and shoots at the ship while there's a ship to
    // shoot at. The score decides which size it sends next.
    const shot = ufo.update(dt, bounds, game.over ? null : ship, hud.score);
    if (shot) {
      ufoBullets.fireFrom(shot.x, shot.y, shot.dirX, shot.dirY);
      playFireSound();
    }
    ufoBullets.update(dt, bounds);

    if (ufo.active) {
      const bullet = bullets.findHit(ufo.x, ufo.y, ufo.radius);
      if (bullet) {
        // Shot down.
        bullets.remove(bullet);
        hud.addScore(ufo.destroy());
        playBangSound("medium");
      } else if (!game.over && !ship.invulnerable && circlesOverlap(ship.x, ship.y, ship.radius, ufo.x, ufo.y, ufo.radius)) {
        // Rammed: both are lost.
        hud.addScore(ufo.destroy());
        playBangSound("medium");
        loseShip();
      }
    }

    // A UFO bullet hits the ship (unless it's protected).
    if (!game.over && !ship.invulnerable) {
      const bullet = ufoBullets.findHit(ship.x, ship.y, ship.radius);
      if (bullet) {
        ufoBullets.remove(bullet);
        loseShip();
      }
    }
```

Things to notice:

- **The ship is passed as the target.** It has `x`, `y`, `vx` and `vy`, which is all the aiming needs. `Ufo` never imports `Ship`; it's handed anything shaped like a target. After Game Over it gets `null`, and stops shooting.
- **Three collisions, three small blocks:** your bullets against the UFO, the ship against the UFO's body, and the UFO's bullets against the ship. Each uses either `findHit` or the same `circlesOverlap` as everything else.
- **Protected ships ignore UFO bullets too**, the same `!ship.invulnerable` check as for rocks.
- The UFO's bullets don't hurt rocks, and rocks don't stop the UFO's bullets. That's a challenge at the end.

### 5f. Try it

The first UFO takes 12-25 seconds to arrive. Reload `index.html`:

- [ ] After 12-25 seconds a red saucer enters from one side, weaves up and down, and leaves the other side
- [ ] It fires **red** bullets at you, about every second and a half
- [ ] Early on the saucer is the **big** one: slow, and its shots wander
- [ ] Shooting it removes it, adds **200** (big) or **1000** (small) to the score, and starts the wait for the next one
- [ ] When your score gets into the thousands, the **small** one starts to appear: it's quicker, and its shots track you where you're *going*
- [ ] A red bullet hitting you costs a life, with the usual protected respawn
- [ ] Flying into the saucer destroys it and costs a life
- [ ] **R** removes the UFO and its bullets
- [ ] Rocks and ship bullets still work exactly as before

**To skip the wait while you test**, temporarily use `new Ufo({ scene, bulletSpeed: UFO_BULLET_SPEED, minSpawnDelay: 1, maxSpawnDelay: 2 })`, and put it back afterwards.

**If something's wrong:** `Ufo is not defined`, `directionTo is not defined` or `interceptDirection is not defined` means a script tag from Step 1 or Step 4 is missing from **`index.html`** (see 5.0), even if `tests.html` has it. The aiming ones only appear when the UFO first fires. `ufoBullets.fireFrom is not a function` means Step 2a didn't land.

**Experiments** (change one, reload, then change it back):

- In `UFO_SIZES`, set `large`'s `spread` to `0.05` and see how much more dangerous a "big" UFO becomes
- Set `leadsTarget: true` for the large UFO
- Change `20000` in `pickSize` to `2000` for a game where small UFOs arrive almost immediately
- Make `UFO_BULLET_SPEED` slower, like `3`, and watch the small UFO still hit you by leading further ahead

---

## Step 6 (optional): A siren

The arcade UFO announces itself with a warbling siren that plays as long as it's on screen. You'll synthesize one, and play it on a **loop**.

In `js/main.js`, add a buffer variable under `bangBuffer`:

```js
let bangBuffer = null;
let sirenBuffer = null;
```

In `initAudio()`, right after `bangBuffer = bang;`, add:

```js
  // The UFO siren: a tone whose pitch wobbles four times a second. The buffer
  // is half a second long, which holds exactly two wobbles and exactly 300
  // cycles of the carrier, so its end joins its start with no click when it
  // loops.
  const sirenLength = Math.floor(sampleRate * 0.5);
  const siren = audioContext.createBuffer(1, sirenLength, sampleRate);
  const sirenData = siren.getChannelData(0);
  let sirenPhase = 0;
  for (let i = 0; i < sirenLength; i++) {
    const t = i / sampleRate;
    const frequency = 600 + 200 * Math.sin(2 * Math.PI * 4 * t);
    sirenPhase += (2 * Math.PI * frequency) / sampleRate;
    sirenData[i] = Math.sin(sirenPhase) * 0.25;
  }

  sirenBuffer = siren;
```

Below `playBangSound`, above `playFireSound`, add the controller:

```js
// The siren plays on a loop for as long as a UFO is on screen.
let sirenSound = null;
let sirenWanted = false;

const setSiren = async (on) => {
  sirenWanted = on;

  if (!on) {
    if (sirenSound) {
      sirenSound.stop();
      sirenSound.dispose();
      sirenSound = null;
    }
    return;
  }

  if (sirenSound || !audioEngine || !sirenBuffer) return;
  const sound = await audioEngine.createSoundAsync("siren", sirenBuffer, { loop: true, volume: 0.25 });
  // The UFO may have gone while the sound was being created.
  if (!sirenWanted || sirenSound) {
    sound.dispose();
    return;
  }
  sirenSound = sound;
  sound.play();
};
```

Then drive it from the frame loop. Declare a flag next to `ufoBullets`:

```js
  let sirenOn = false;
  const ufoBullets = new BulletSystem({
```

and in the UFO block, right after `ufoBullets.update(dt, bounds);`, add:

```js
    // Start or stop the siren only when a UFO appears or leaves.
    if (ufo.active !== sirenOn) {
      sirenOn = ufo.active;
      setSiren(sirenOn);
    }
```

Things to notice:

- **A seamless loop.** A looped sound clicks if the end doesn't join the start. The carrier averages 600 Hz over a whole number of wobbles, so over 0.5 seconds it completes exactly 300 cycles and the wave ends where it began.
- **The same phase-accumulation trick** as the "pew" sound, because the frequency changes continuously.
- **Why `sirenWanted`?** Creating a sound is `async`. If the UFO is shot in the gap between asking for the siren and the sound being ready, the "stop" arrives *before* there is anything to stop, and the siren would play forever. The flag lets the late-arriving sound notice it's no longer wanted and throw itself away.
- **Only on change.** The frame loop compares `ufo.active` with `sirenOn`, so `setSiren` runs once when a UFO appears and once when it leaves, not 60 times a second.

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
```

Open it. You should see **200 passing tests** in total (201 if you added the diagonal muzzle test in the Bullets tutorial): the 138 you started with, plus 15 for aiming, 10 for the new bullet methods, and 37 for the UFO.

> **Try breaking something.** In `interceptDirection`, change `.filter((x) => x > 0)` to `.filter((x) => x < 0)`, reload `tests.html`, and see which tests notice. Then put it back.

---

## Step 8: Publish the sample

**Gallery.** In the root `index.html`, find the Asteroids series and give "Asteroids UFO" a `slug` and `tutorial: true`:

```js
          { slug: "asteroids_ufo", tutorial: true, title: "Asteroids UFO", description: "An enemy saucer that crosses the screen and shoots back: big and sloppy, or small and able to lead its shots." },
```

**Root README.** Add a line to the Asteroids list in the top-level `README.md`.

**Series roadmap.** In `samples/asteroids/README.md`, link row 6 of the table to `asteroids_ufo/README.md` and its tutorial.

**Previous README.** In `samples/asteroids/asteroids_waves/README.md`, change the "Next up" line to link to Asteroids UFO.

**Sample README.** Add `samples/asteroids/asteroids_ufo/README.md`, using the Waves README as a template. When you're ready, ask me and I'll draft it from your finished code.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Unit vectors as directions | `directionTo` |
| Predicting where a moving target will be (a quadratic) | `interceptDirection` |
| Deliberate inaccuracy | `rotateDirection` + `spread` |
| Generalizing a method so a second user can share it | `fireFrom` behind `fire(ship)` |
| Separating "decides to shoot" from "owns the bullets" | `Ufo.update` returns a shot |
| An object that waits, appears, and leaves | `active`, `spawnTimer`, `_leave` |
| Difficulty that follows the score | `pickSize` |
| Multi-stroke line drawings | `CreateLineSystem` |
| A seamless looping sound | the siren |

## Challenges

1. **UFO bullets break rocks.** Right now they pass through. Let `rocks.findCollision` stop and destroy on contact. (Hint: it's the same shape as the ship-versus-rock check, and you'll need to decide whether it scores.)
2. **Aim the short way round.** The screen wraps, so sometimes the shortest path to the ship is *through* the edge. Make `directionTo` choose between the direct route and the wrapped ones. (Hint: try the target at `x`, `x + 2*halfWidth` and `x - 2*halfWidth`, and keep the nearest.)
3. **A shot-down animation**, with the saucer breaking into flying line segments. (Hint: the `lines` you passed to `CreateLineSystem` are the pieces.)
4. **UFO that dodges.** Make it swerve away from nearby rocks, not just weave at random.

**Up next:** *Asteroids Polish* adds a start screen and pause, particle explosions, and hyperspace.
