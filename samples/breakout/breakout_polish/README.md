# Breakout Polish

![Breakout Polish](../../../img/breakout_polish/breakout_polish.png)

Step 5 in the Breakout series. Builds on [Breakout Levels](../breakout_levels/README.md), reusing its ball/paddle/brick/level physics, particle sparks, procedural bounce sound, and score/lives/win tracking wholesale. What's new is everything that turns it from "a working game" into something that feels like a real one: a proper start screen, a pause you can resume from, and three catchable power-ups.

**The game no longer auto-launches.** Every earlier sample spawned a moving ball the instant the scene loaded. Here, `main.js` tracks a `started` flag and doesn't create any ball until the player's first click or tap (`beginGame()`, wired to `POINTERDOWN`); until then, `Hud`'s new `startLabel` ("Click or tap to start") is the only overlay visible, shown by default instead of hidden like the others.

**Pause is resumable; Game Over and Win aren't.** `paused` gates the same physics/input block `gameOver`/`won` already did (`if (!started || gameOver || won || paused) return;`), but `togglePause()` (bound to `P`) can only engage between `started` and the round actually ending, and flips back off on a second press — unlike the other two, which only clear on Reset. Sparks keep animating through all three freezes, same as before; they're cosmetic either way.

**Multi-ball turns `ball` into `balls`.** The single-`Ball` variable every earlier sample used is now an array, iterated once per frame for wall/brick/paddle collision exactly like before, but a ball that falls past the bottom is now just removed from the array instead of immediately costing a life -- only once `balls.length === 0` does `loseLife()` actually run. Nothing about `Ball` itself changed; every method already operated on `this`, so managing several instances instead of one needed no changes to `ball.js`.

**Three power-ups, one new class.** `PowerUpManager` (`js/powerups.js`) tracks falling pickups the same way `BrickGrid` tracks bricks -- plain records with an optional mesh, `BABYLON` only touched when a `scene` is supplied. A destroyed brick has a 25% chance of dropping one (`BrickGrid.checkCollision()` now also reports `destroyed`/`x`/`y` so `main.js` knows where), and catching it with the paddle applies an effect `main.js` owns, not `PowerUpManager`:
- **wide** — widens the paddle for 10 seconds. This needed one real change outside `main.js`: `Paddle.setHalfWidth()` rescales the mesh (`mesh.scaling.x`) relative to the half-width baked into the geometry at `attachTo()` time, so the visible paddle and its collision hitbox (`moveTo()`'s clamp, `Ball.bounceOffPaddle()`'s span check -- both already read `this.halfWidth` live) never drift apart the way they would if only the number were mutated.
- **life** — `Hud.addLife()`, a life gain with no Game Over overlay to hide, unlike `resetLives()`.
- **multi** — spawns two extra balls angled ±20° off the catching ball's current heading, at the same speed.

## Key code

**Game-state flags.** Four booleans describe the whole flow. One check gates all gameplay; sparks still update above it so bursts finish fading while frozen.

```js
let started = false; // first click launches the ball
let gameOver = false;
let won = false;
let paused = false;

scene.onBeforeRenderObservable.add(() => {
  const dt = engine.getDeltaTime() / 1000;
  sparkSystem.update(dt);
  if (!started || gameOver || won || paused) return;
  // ...gameplay...
});
```

**Starting and pausing.** The first `POINTERDOWN` starts the round. Pause can only engage between starting and finishing, and toggles on a second press of `P`.

```js
scene.onPointerObservable.add((pointerInfo) => {
  if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
    beginGame();
    return;
  }
  // ...pointer-move paddle control...
});

const togglePause = () => {
  if (!started || gameOver || won) return;
  paused = !paused;
  if (paused) hud.showPause();
  else hud.hidePause();
};

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyP") {
    togglePause();
    return;
  }
  // ...
});
```

**Multi-ball: one ball becomes many.** `ball` is now a `balls` array. A ball that falls off the bottom is disposed and removed, and a life is lost only once the array is empty. Iterating backwards makes removal during the loop safe.

```js
for (let i = balls.length - 1; i >= 0; i--) {
  const ball = balls[i];
  const bounces = ball.update(dt, { halfWidth, halfHeight, openBottom: true });
  // ...brick and paddle collisions...

  if (ball.y - ball.radius > halfHeight) {
    ball.dispose();
    balls.splice(i, 1);
  }
}
// ...
if (balls.length === 0) {
  loseLife();
}
```

**Falling pickups.** `PowerUpManager` tracks items as plain records with an optional mesh. Each is a small colored sphere. Catching one reuses the same box-overlap test as the paddle bounce, and uncaught items are disposed when they fall past the bottom.

```js
_attach(item) {
  item.mesh = BABYLON.MeshBuilder.CreateSphere("powerup", { diameter: this.radius * 2, segments: 12 }, this.scene);
  const material = new BABYLON.StandardMaterial("powerupMaterial", this.scene);
  material.diffuseColor = BABYLON.Color3.FromHexString(POWERUP_COLORS[item.type]);
  item.mesh.material = material;
  item.mesh.position.x = item.x;
  item.mesh.position.y = -item.y;
}

update(dt, bounds) {
  for (let i = this.items.length - 1; i >= 0; i--) {
    const item = this.items[i];
    item.y += this.fallSpeed * dt;
    if (item.mesh) item.mesh.position.y = -item.y;
    if (item.y - this.radius > bounds.halfHeight) {
      this._disposeItem(item);
      this.items.splice(i, 1);
    }
  }
}
```

**Chance to drop, and what each type does.** A destroyed brick rolls for a drop. `PowerUpManager` only reports which type was caught; the effects live in `main.js`.

```js
if (brickHit.destroyed && Math.random() < POWERUP_DROP_CHANCE) {
  const type = PowerUpManager.TYPES[Math.floor(Math.random() * PowerUpManager.TYPES.length)];
  powerUps.spawn(brickHit.x, brickHit.y, type);
}

const applyPowerUp = (type) => {
  if (type === "wide") {
    paddle.setHalfWidth(WIDE_PADDLE_HALF_WIDTH);
    wideTimer = WIDE_PADDLE_DURATION;
  } else if (type === "life") {
    hud.addLife();
  } else if (type === "multi" && balls.length > 0) {
    spawnExtraBalls(balls[0]);
  }
};
```

**Widening a mesh without rebuilding it.** The box's geometry is baked at its original width, so `setHalfWidth()` scales the mesh relative to that and updates the number the collision code reads, keeping the visible paddle and its hitbox in sync.

```js
setHalfWidth(halfWidth) {
  this.halfWidth = halfWidth;
  if (this.mesh) {
    this.mesh.scaling.x = halfWidth / this._meshHalfWidth;
  }
}
```

**Splitting a ball.** Two new balls leave at ±`MULTI_BALL_SPREAD` radians from the original's heading, at the same speed.

```js
const speed = Math.hypot(fromBall.vx, fromBall.vy) || LAUNCH_SPEED;
const baseAngle = Math.atan2(fromBall.vy, fromBall.vx);
for (const offset of [-MULTI_BALL_SPREAD, MULTI_BALL_SPREAD]) {
  const angle = baseAngle + offset;
  balls.push(new Ball({ scene, x: fromBall.x, y: fromBall.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    radius: BALL_RADIUS, restitution: 1 }));
}
```

## Babylon.js features demonstrated

- Everything from Breakout Levels (orthographic camera, lit meshes, particle bursts, synthesized bounce sound, mouse + keyboard paddle control, scoring, lives, levels, win state)
- A full four-state game-flow gate (start / play / pause / end) built from boolean flags and one shared early-return, rather than a formal state machine -- proportionate to a project this size
- Runtime mesh rescaling (`mesh.scaling`) as a lighter alternative to disposing and rebuilding geometry when a game object's size needs to change
- Managing a variable-length collection of physics-driven meshes (`balls`) with the same per-instance methods written for a single one

## Controls

- **Click or tap the canvas** — starts the round
- **Move the pointer (mouse or touch) over the canvas** — steers the paddle left/right, proportionally mapped to the play area
- **Left/Right arrow keys or A/D** — steers the paddle at a constant speed while held
- **P** — pause / resume
- **Reset button** (top of screen) — always available: restarts at level 1 with full lives, zero score, and the ball in play immediately (no need to click Start again)
- **Space** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js`, `js/paddle.js`, `js/bricks.js`, `js/powerups.js`, `js/sparks.js`, and `js/hud.js`.

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
