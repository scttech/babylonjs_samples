# Asteroids UFO

Step 6 of the Asteroids series. Builds on [Asteroids Waves](../asteroids_waves/README.md), reusing its ship, bullets, rocks, score, lives, waves, and sounds wholesale. What's new is an enemy: a flying saucer that appears every so often, crosses the screen, weaves up and down, and **shoots back**.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Waves sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**Two saucers.** As in the arcade game, the big one is slow and sloppy (200 points) while the small one is fast, accurate, and worth 1,000. Both live in a single table, `UFO_SIZES`, so the difference is a handful of numbers: speed, fire rate, aiming error, and a `leadsTarget` flag. Which one appears depends on the score: `score / 20000` is the chance of the small one, capped at three in four, so it is rare early and common late.

**Aiming is its own module.** `aim.js` holds three plain functions on plain numbers. `directionTo` gives the unit vector from one point to another. `rotateDirection` turns a direction by an angle, which is how a UFO is made inaccurate on purpose. `interceptDirection` is the interesting one: it aims at where a *moving* target will be rather than where it is.

**Leading a target is a quadratic.** If a bullet of speed `s` meets the target after time `t`, the target's distance from the shooter at `t` equals `s * t`. Squaring that gives a quadratic in `t`; the earliest positive root says when they meet, and you aim at the target's position then. If there's no positive root the target is outrunning the bullet, and it falls back to aiming straight at it. A target moving at exactly the bullet's speed turns the quadratic into a straight line, which is handled separately.

**The UFO decides, the bullets belong to someone else.** `Ufo.update()` returns a shot (`{ x, y, dirX, dirY }`) or `null`, and `main.js` fires it from a second `BulletSystem`. The UFO knows nothing about bullet lifetimes, wrapping, or drawing. To make that work `BulletSystem.fire(ship)` was split: the ship-specific part (the nose position and inherited velocity) calls a new general `fireFrom(x, y, dirX, dirY)`, which the UFO's bullets use directly. The existing bullet tests proved the refactor changed nothing.

**An object that waits, appears, and leaves.** A UFO is `active` while it's on screen. While it isn't, `update()` counts down and spawns it itself, so `main.js` only calls `update()` every frame. It enters just off one edge, flies toward the other, and *leaves* rather than wrapping. Shot down, rammed, flown off, or reset, it ends up in one private `_leave()`, so all four can't drift apart.

**Three new collisions, no new machinery.** Your bullets against the UFO and the UFO's bullets against the ship both use `BulletSystem.findHit()`, which only *finds* the bullet and leaves removing it to the caller. Ramming the UFO is the same circle-versus-circle check as everything else. Because a UFO bullet can now destroy the ship as well as a rock, `crash` was split into `loseShip` (lose a life, respawn or game over) and a rock-specific `crash` that calls it.

## Key code

**Aiming at where a target will be.**

```js
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
```

**Firing from anywhere.** `fire(ship)` is now a thin wrapper, so the ship behaves exactly as before.

```js
fire(ship) {
  const { x, y, dirX, dirY } = ship.muzzle();
  return this.fireFrom(x, y, dirX, dirY, ship.vx, ship.vy);
}

fireFrom(x, y, dirX, dirY, vx = 0, vy = 0) {
  if (this.cooldownRemaining > 0 || this.bullets.length >= this.maxBullets) return null;
  const bullet = { x, y, vx: vx + dirX * this.speed, vy: vy + dirY * this.speed, life: this.lifetime, mesh: null };
  // ...attach a mesh if there's a scene, then store it...
}

findHit(x, y, radius) {
  return this.bullets.find((b) => circlesOverlap(b.x, b.y, this.radius, x, y, radius)) || null;
}
```

**Two UFOs in one table.** The small one is better in every way except being small.

```js
const UFO_SIZES = {
  large: { radius: 0.9, points: 200, speed: 3, fireInterval: 1.6, spread: 0.6, leadsTarget: false },
  small: { radius: 0.5, points: 1000, speed: 4.5, fireInterval: 1.1, spread: 0.12, leadsTarget: true },
};

pickSize(score) {
  const smallChance = Math.min(score / 20000, 0.75);
  return this._random() < smallChance ? "small" : "large";
}
```

**Aiming, then getting it wrong on purpose.** The small UFO leads; the large one aims where the ship is now. Either way the direction is turned by a random error up to `spread` radians.

```js
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

**Crossing the screen.** Multiplying by `direction` makes one check cover both directions, and the height wraps using the helper from the Rocks step.

```js
this.x += this.vx * dt;
this.y = wrapCoordinate(this.y + this.vy * dt, halfHeight + this.radius);

if (this.direction * this.x > halfWidth + this.radius) {
  this._leave();
  return null;
}
```

**A saucer from two strokes.** `CreateLineSystem` draws several disconnected polylines as one mesh: the hull (a flat diamond with a line through the middle) and the dome above it.

```js
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
```

**The UFO each frame.** The ship is passed as the target because it has `x`, `y`, `vx` and `vy`; `Ufo` is simply handed anything shaped like a target, and after Game Over it gets `null` and stops shooting.

```js
const shot = ufo.update(dt, bounds, game.over ? null : ship, hud.score);
if (shot) {
  ufoBullets.fireFrom(shot.x, shot.y, shot.dirX, shot.dirY);
  playFireSound();
}
ufoBullets.update(dt, bounds);

if (ufo.active) {
  const bullet = bullets.findHit(ufo.x, ufo.y, ufo.radius);
  if (bullet) {
    bullets.remove(bullet);
    hud.addScore(ufo.destroy());
    playBangSound("medium");
  }
  // ...else, if the ship rammed it, destroy the UFO and call loseShip()...
}

if (!game.over && !ship.invulnerable) {
  const bullet = ufoBullets.findHit(ship.x, ship.y, ship.radius);
  if (bullet) {
    ufoBullets.remove(bullet);
    loseShip();
  }
}
```

**Testing code that uses `random()` in its constructor.** The `Ufo` constructor draws one value to pick the delay before the first UFO, which shifts every scripted sequence by one. The tests put a throwaway value in front so the values they list are the ones `spawn()` and `update()` see.

```js
const scripted = (values) => script([0.5, ...values]);
```

## Babylon.js features demonstrated

- Everything from Asteroids Waves (orthographic camera, line-art meshes, GUI over a 3D scene, synthesized sound)
- `BABYLON.MeshBuilder.CreateLineSystem` for a drawing made of several separate strokes
- Targeting math (unit vectors, rotation, and solving for an intercept) driving a second set of bullets
- One class (`BulletSystem`) reused for two shooters by generalizing a method rather than copying it

## Controls

- **Left/Right arrow keys or A/D** — rotate the ship
- **Up arrow or W** — thrust
- **Space** — fire (hold for auto-fire)
- **R** — restart: ship, bullets, rocks, UFO and its bullets all cleared, score zero, three lives, back to a breather before wave 1
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover the aiming functions (including a hand-checkable intercept and a property check that the bullet really does meet the target), the new `BulletSystem` methods, and the UFO's spawning, flying, leaving, shooting (using scripted `random()` values to pin down aim and error), scoring, and drawing through a stubbed `BABYLON`.

## Notes

Browsers block audio until a user gesture. Pressing a key counts, and Babylon shows its own small unmute prompt if it's still needed. The UFO reuses the ship's fire sound; the tutorial has an optional step that adds a looping siren while a UFO is on screen.

## Next up

[Asteroids Polish](../asteroids_polish/README.md) adds a title screen and pause, particle explosions, and hyperspace.
