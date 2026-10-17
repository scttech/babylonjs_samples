# Asteroids Rocks

Step 3 of the Asteroids series. Builds on [Asteroids Bullets](../asteroids_bullets/README.md), reusing its ship, bullets, and synthesized fire sound wholesale. What's new is the thing the bullets were waiting for: drifting, spinning rocks that **split into smaller ones when shot**, and a score to show for it.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Bullets sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**Rocks come in three sizes.** Shooting a large rock replaces it with two medium ones, a medium with two small ones, and a small one just vanishes. Everything about the sizes (radius, speed range, points, and what it splits into) lives in one table, `ROCK_SIZES`, so rebalancing the game means editing numbers rather than code. Smaller rocks are faster and worth more: 20, 50, and 100 points.

**Two circles in one rock.** What you see is a lumpy ten-cornered outline; what the game collides with is a perfect circle. Every corner sits between 80% and 100% of the collision radius, so the visible shape always stays inside the hit circle and a bullet never appears to pass through a rock's edge without a hit.

**Splitting.** `RockField.destroy()` sends one child off in a random direction and the other in the exact opposite direction at the same speed, so the pieces always fly apart. Each also keeps half of the parent's velocity, so a fast rock throws off fast pieces.

**Collision between two systems.** `RockField.collideBullets(bulletSystem)` tests every bullet against the rocks with a circle-vs-circle check. A bullet that hits is consumed (`BulletSystem.remove()`, new in this sample) and its rock is destroyed. It returns one `{ size, points, x, y }` entry per rock destroyed, so the caller can add up the score and pick the sound for each size.

**A refactor, under test.** Ship, bullets, and now rocks all wrap around the screen. With a third copy of the rule on the way, it moved into one shared function, `wrapCoordinate`, and the existing ship and bullet tests, untouched, proved the behavior didn't change.

**Injected randomness.** Like `SparkSystem` in the Breakout series, `RockField` takes a `random` function (default `Math.random`) and every dice roll goes through it. A test can hand in a scripted sequence and assert exact results, such as a rock's spin being precisely `-maxSpin`.

**A 2D score over a 3D scene.** The ship, bullets, and rocks are meshes in the world. The score is a `BABYLON.GUI.TextBlock` on a fullscreen 2D layer drawn on top.

The ship still flies straight through rocks. Colliding with them is the next step.

## Key code

**The size table.** `splitsInto` is how a size knows what comes next; `null` ends the chain.

```js
const ROCK_SIZES = {
  large: { radius: 1.2, points: 20, minSpeed: 0.8, maxSpeed: 1.8, splitsInto: "medium" },
  medium: { radius: 0.7, points: 50, minSpeed: 1.4, maxSpeed: 2.6, splitsInto: "small" },
  small: { radius: 0.35, points: 100, minSpeed: 2.2, maxSpeed: 3.5, splitsInto: null },
};
```

**Circle-vs-circle collision.** Two circles overlap when their centers are closer than the sum of their radii. Comparing squared distances avoids a square root, which matters when this runs for every bullet against every rock, every frame.

```js
function circlesOverlap(ax, ay, ar, bx, by, br) {
  const dx = ax - bx;
  const dy = ay - by;
  const radii = ar + br;
  return dx * dx + dy * dy < radii * radii;
}
```

**The shared wrap rule.** One axis at a time; callers pass the screen's half-extent plus the object's own radius, so it slides fully out of view before reappearing.

```js
function wrapCoordinate(value, limit) {
  if (value > limit) return -limit;
  if (value < -limit) return limit;
  return value;
}

// in RockField.update()
rock.x = wrapCoordinate(rock.x + rock.vx * dt, halfWidth + rock.radius);
rock.y = wrapCoordinate(rock.y + rock.vy * dt, halfHeight + rock.radius);
```

**A lumpy outline.** Corners are placed at even angles around a circle, each pulled in by its entry in `shape`. The first point is cloned onto the end to close the loop. The mesh is built around its own origin and then moved and rotated, so spinning is just `mesh.rotation.z` with no rebuilding of points.

```js
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
```

**Splitting a rock.** The two pieces head in opposite directions at the same speed, on top of half of the parent's velocity. It returns the points and the children, and returns zero points for a rock that isn't in the field, so destroying one twice can't score twice.

```js
destroy(rock) {
  const index = this.rocks.indexOf(rock);
  if (index === -1) return { points: 0, children: [] };

  const config = ROCK_SIZES[rock.size];
  this.rocks.splice(index, 1);
  this._disposeRock(rock);

  const children = [];
  if (config.splitsInto) {
    const childConfig = ROCK_SIZES[config.splitsInto];
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

**Bullets meet rocks.** The loop runs backwards because a hit removes the bullet from the array being walked.

```js
collideBullets(bulletSystem) {
  const hits = [];
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

**A score label on a 2D layer.** A `TextBlock` with no explicit width fills its parent, which here is the whole screen. `isHitTestVisible = false` stops that invisible full-width box from intercepting pointer events meant for the canvas.

```js
this.scoreLabel = new BABYLON.GUI.TextBlock();
this.scoreLabel.height = "30px";
this.scoreLabel.color = "white";
this.scoreLabel.fontSize = 24;
this.scoreLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
this.scoreLabel.top = "56px";
this.scoreLabel.isHitTestVisible = false;
this.ui.addControl(this.scoreLabel);
```

**Wiring it into the frame loop.** Each hit reports its size, which picks the explosion's pitch.

```js
bullets.update(dt, bounds);

rocks.update(dt, bounds);
for (const hit of rocks.collideBullets(bullets)) {
  hud.addScore(hit.points);
  playBangSound(hit.size);
}
if (rocks.rocks.length === 0) populateRocks();
```

**A filtered-noise explosion.** White noise is harsh, so each sample moves only 15% of the way toward the next random value, a one-line low-pass filter that smooths away the high frequencies, and then fades out. One buffer serves every size by playing at a different rate: lower for big rocks, higher for small ones.

```js
let smoothed = 0;
for (let i = 0; i < bangLength; i++) {
  const t = i / sampleRate;
  smoothed += (Math.random() * 2 - 1 - smoothed) * 0.15;
  bangData[i] = smoothed * Math.exp(-t * 8) * 2;
}

const BANG_RATES = { large: 0.6, medium: 0.9, small: 1.3 };
```

## Babylon.js features demonstrated

- Everything from Asteroids Bullets (orthographic camera, line-art meshes, runtime mesh creation and disposal, synthesized sound)
- `BABYLON.MeshBuilder.CreateLines` with computed, randomized points, moved and rotated as a unit via `position` and `rotation.z`
- A fullscreen `BABYLON.GUI.AdvancedDynamicTexture` with a `TextBlock` score, overlaid on a 3D scene
- Circle-vs-circle collision between two independent systems, with no physics engine
- A filtered-noise sound effect whose pitch is varied through `playbackRate`

## Controls

- **Left/Right arrow keys or A/D** — rotate the ship
- **Up arrow or W** — thrust
- **Space** — fire (hold for auto-fire)
- **R** — reset: ship to the center, bullets cleared, fresh rocks, score back to zero
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/wrap.js`, `js/collision.js`, `js/ship.js`, `js/bullets.js`, `js/rocks.js`, and `js/hud.js`. It covers the wrap and collision helpers, rock spawning and the split chain (with scripted random sequences), bullet-rock hits using the real `Ship` and `BulletSystem`, and the drawing and HUD code through a stubbed `BABYLON`.

## Notes

Browsers block audio until a user gesture. Pressing a key counts, and Babylon shows its own small unmute prompt if it's still needed.

## Next up

[Asteroids](../README.md) continues with lives, which makes the rocks dangerous to the ship.
