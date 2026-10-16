# Breakout Paddle

![Breakout Paddle](../../img/breakout_paddle/breakout_paddle.png)

The first step in a new series: turning the bouncing-ball toy into an actual game. Builds on [Bouncing Ball Particles & Friction](../bouncing_ball_particles_friction/README.md), reusing its ball physics, particle sparks, procedural bounce sound, orthographic camera, and HUD wholesale. What's new is a player-controlled paddle the ball can bounce off, with its own collision response — everything else about that gameplay loop (steps 2-5: bricks, lives, levels, polish) will build on top of this.

**Paddle input replaces slingshot input.** The drag-to-launch mechanic from the slingshot samples is gone: with a paddle now claiming pointer control, the ball instead auto-launches on scene start (and on reset) at a randomized downward diagonal. Two input methods drive the paddle: moving the pointer anywhere over the canvas, and Left/Right (or A/D) held down for constant-speed movement — both ultimately call `Paddle.moveTo()`, clamped so the paddle never leaves the play area. `Paddle` mirrors `Ball`'s scene-optional split — its collision math and clamping are plain arithmetic, testable without a real Babylon engine, and `attachTo()` is the only place `BABYLON` gets touched.

**No dead zone at the edges.** `moveTo()` clamps the paddle's *center*, so handing it the pointer's world x 1:1 leaves a dead zone at each edge — the paddle's center hits its clamp a half-paddle-width before the pointer reaches the screen edge, so the pointer has to travel back inward past that point before the paddle starts following again. `main.js` avoids this by remapping the pointer's full range onto the paddle center's actual range of motion before calling `moveTo()`, so pointer-at-edge always means paddle-at-edge, with no lag on either end.

**Paddle collision and steering.** `Ball.bounceOffPaddle(paddle)` is a new method alongside the existing wall-bounce `update()`: a circle-vs-box check against the paddle's top edge, gated on `vy > 0` so a ball that's still overlapping the paddle right after bouncing off it doesn't immediately bounce again. A hit reflects `vy` and steers `vx` by how far off-center it landed — hit the left edge and the ball comes off arcing left, hit dead center and it goes straight back up — the classic Breakout paddle-English feel. The deflected `(vx, vy)` is rescaled back to the ball's pre-bounce speed, so — like every wall bounce — a paddle hit never changes the ball's total energy. It returns the same bounce-event shape `update()`'s wall bounces do, so `main.js` runs paddle hits through the exact same spark/sound/bounce-count path as a wall hit, with no special-casing.

**Elastic again.** The energy-loss/rest-snap behavior `Ball` picked up in the previous sample is still there in the code, but this sample constructs its ball with `restitution: 1` — an arcade ball that settles to a stop mid-game isn't the goal here, so it stays fully elastic on every wall and paddle bounce instead of bleeding energy.

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
