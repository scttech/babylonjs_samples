# Breakout Paddle

![Breakout Paddle](../../../img/breakout_paddle/breakout_paddle.png)

The first step in a new series: turning the bouncing-ball toy into an actual game. Builds on [Bouncing Ball Particles & Friction](../../introduction/bouncing_ball_particles_friction/README.md), reusing its ball physics, particle sparks, procedural bounce sound, orthographic camera, and HUD wholesale. What's new is a player-controlled paddle the ball can bounce off, with its own collision response — everything else about that gameplay loop (steps 2-5: bricks, lives, levels, polish) will build on top of this.

**Paddle input replaces slingshot input.** The drag-to-launch mechanic from the slingshot samples is gone: with a paddle now claiming pointer control, the ball instead auto-launches on scene start (and on reset) at a randomized downward diagonal. Two input methods drive the paddle: moving the pointer anywhere over the canvas, and Left/Right (or A/D) held down for constant-speed movement — both ultimately call `Paddle.moveTo()`, clamped so the paddle never leaves the play area. `Paddle` mirrors `Ball`'s scene-optional split — its collision math and clamping are plain arithmetic, testable without a real Babylon engine, and `attachTo()` is the only place `BABYLON` gets touched.

**No dead zone at the edges.** `moveTo()` clamps the paddle's *center*, so handing it the pointer's world x 1:1 leaves a dead zone at each edge — the paddle's center hits its clamp a half-paddle-width before the pointer reaches the screen edge, so the pointer has to travel back inward past that point before the paddle starts following again. `main.js` avoids this by remapping the pointer's full range onto the paddle center's actual range of motion before calling `moveTo()`, so pointer-at-edge always means paddle-at-edge, with no lag on either end.

**Paddle collision and steering.** `Ball.bounceOffPaddle(paddle)` is a new method alongside the existing wall-bounce `update()`: a circle-vs-box check against the paddle's top edge, gated on `vy > 0` so a ball that's still overlapping the paddle right after bouncing off it doesn't immediately bounce again. A hit reflects `vy` and steers `vx` by how far off-center it landed — hit the left edge and the ball comes off arcing left, hit dead center and it goes straight back up — the classic Breakout paddle-English feel. The deflected `(vx, vy)` is rescaled back to the ball's pre-bounce speed, so — like every wall bounce — a paddle hit never changes the ball's total energy. It returns the same bounce-event shape `update()`'s wall bounces do, so `main.js` runs paddle hits through the exact same spark/sound/bounce-count path as a wall hit, with no special-casing.

**Elastic again.** The energy-loss/rest-snap behavior `Ball` picked up in the previous sample is still there in the code, but this sample constructs its ball with `restitution: 1` — an arcade ball that settles to a stop mid-game isn't the goal here, so it stays fully elastic on every wall and paddle bounce instead of bleeding energy.

## Key code

**The paddle is a box mesh.** Same scene-optional pattern as `Ball`: `attachTo()` is the only place `BABYLON` is touched. A paddle's depth matches its height; under a straight-on orthographic camera the depth never shows.

```js
attachTo(scene, color = "#4a90e2") {
  this.scene = scene;
  this.mesh = BABYLON.MeshBuilder.CreateBox(
    "paddle",
    { width: this.halfWidth * 2, height: this.halfHeight * 2, depth: this.halfHeight * 2 },
    scene
  );
  const material = new BABYLON.StandardMaterial("paddleMaterial", scene);
  material.diffuseColor = BABYLON.Color3.FromHexString(color);
  this.mesh.material = material;
  this._syncMesh();
  return this;
}
```

**Clamping the paddle's center.** `moveTo()` keeps the whole paddle inside the play area by clamping its *center* to a range that leaves room for its own half-width.

```js
moveTo(targetX, boundHalfWidth) {
  const min = -boundHalfWidth + this.halfWidth;
  const max = boundHalfWidth - this.halfWidth;
  this.x = Math.min(Math.max(targetX, min), max);
  this._syncMesh();
}
```

**Pointer input without the dead zone.** The pointer's full range is remapped onto the paddle center's actual range of motion, so pointer-at-edge means paddle-at-edge. Only `POINTERMOVE` is used, so no click or drag is needed.

```js
scene.onPointerObservable.add((pointerInfo) => {
  if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERMOVE) return;
  const { x } = toWorld(scene.pointerX, scene.pointerY);
  const maxPaddleX = halfWidth - paddle.halfWidth;
  paddle.moveTo((x / halfWidth) * maxPaddleX, halfWidth);
});
```

**Keyboard input.** Held keys go in a `Set` and are applied each frame scaled by `dt`, so movement speed doesn't depend on frame rate. Calling `preventDefault()` stops the arrow keys from scrolling the page.

```js
const heldKeys = new Set();
window.addEventListener("keydown", (event) => {
  if (!LEFT_KEYS.has(event.code) && !RIGHT_KEYS.has(event.code)) return;
  event.preventDefault();
  heldKeys.add(event.code);
});
window.addEventListener("keyup", (event) => heldKeys.delete(event.code));

// each frame:
let keyboardDx = 0;
for (const key of heldKeys) {
  if (LEFT_KEYS.has(key)) keyboardDx -= PADDLE_KEYBOARD_SPEED * dt;
  if (RIGHT_KEYS.has(key)) keyboardDx += PADDLE_KEYBOARD_SPEED * dt;
}
if (keyboardDx !== 0) paddle.moveTo(paddle.x + keyboardDx, halfWidth);
```

**Paddle collision and steering.** A circle-vs-box overlap test, gated on `vy > 0` so a ball still overlapping the paddle after a bounce doesn't bounce again. The new direction is built from an angle: straight up, tilted by how far off-center the ball landed, then rescaled to the old speed so the hit adds or removes no energy.

```js
bounceOffPaddle(paddle) {
  if (this.vy <= 0) return null;

  const paddleTop = paddle.y - paddle.halfHeight;
  const withinReach = this.y + this.radius >= paddleTop && this.y - this.radius <= paddle.y + paddle.halfHeight;
  const withinSpan = this.x + this.radius >= paddle.x - paddle.halfWidth && this.x - this.radius <= paddle.x + paddle.halfWidth;
  if (!withinReach || !withinSpan) return null;

  const speed = Math.hypot(this.vx, this.vy);
  this.y = paddleTop - this.radius;

  const offset = Math.min(Math.max((this.x - paddle.x) / paddle.halfWidth, -1), 1); // -1 left edge .. +1 right edge
  const angle = -Math.PI / 2 + offset * 0.9; // straight up, tilted by the offset

  this.vx = Math.cos(angle) * speed;
  this.vy = Math.sin(angle) * speed;
  return this._bounceEvent(this.x, paddleTop, 0, -1);
}
```

## Babylon.js features demonstrated

- Everything from Bouncing Ball Particles & Friction (orthographic camera, lit mesh, `BABYLON.ParticleSystem` bursts, synthesized bounce sound, HUD)
- A second physics-driven mesh (`Paddle`, a `BABYLON.MeshBuilder.CreateBox`) alongside the ball, following the same scene-optional attach/dispose/sync pattern
- Custom circle-vs-box collision detection and velocity-based deflection (steering, not just reflecting) driven entirely by hand-written math, no physics engine/plugin involved
- Pointer-follow input (`POINTERMOVE` only, no drag) and held-key input driving the same game object, combined without conflict since both just call `Paddle.moveTo()`

## Controls

- **Move the pointer (mouse or touch) over the canvas** — steers the paddle left/right, proportionally mapped to the play area so pointer-at-edge always means paddle-at-edge
- **Left/Right arrow keys or A/D** — steers the paddle at a constant speed while held
- **Reset button** (top of screen) — snaps the ball and paddle back to center and relaunches the ball, zeroing the bounce count
- **Space** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js`, `js/paddle.js`, `js/sparks.js`, and `js/hud.js`.

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
