# Breakout Bricks

![Breakout Bricks](../../img/breakout_bricks/breakout_bricks.png)

Step 2 of the Breakout series. Builds on [Breakout Paddle](../breakout_paddle/README.md), reusing its ball/paddle physics, particle sparks, procedural bounce sound, orthographic camera, and mouse/keyboard paddle control wholesale. What's new is a destructible grid of bricks and a score — the goal is finally to *do* something, not just keep a ball in the air.

**`BrickGrid` manages a grid of plain brick records.** A brick is a plain `{x, y, halfWidth, halfHeight, points, alive, mesh}` object, not its own class — like `SparkSystem`'s particle bursts, they're simple enough that a full scene-optional attach/dispose class per brick would just be overhead. `BrickGrid` owns laying them out (centered rows x cols, `_build()`), resolving collisions, and their mesh lifecycle; `BABYLON` is only touched when `scene` is supplied, the same split every other class in this series uses.

**`Ball.bounceOffBrick(brick)` bounces off any side.** `bounceOffPaddle` only ever handles a from-above hit, but a brick can be hit from any direction, so this compares how deep the ball has penetrated the brick on x vs y — whichever axis has the *smaller* overlap is the side the ball actually crossed, so that axis is the one that reflects. The ball is also nudged back out of the brick by that overlap, so it can't stay stuck inside it and re-trigger the same collision next frame. It returns a bounce event in the same shape as every other collision in this series, but doesn't touch the brick itself — `BrickGrid.checkCollision(ball)` is what marks a hit brick dead, disposes its mesh, and reports back `{ event, points }`.

**Scoring reuses the existing bounce-feedback path.** `main.js` still runs a brick hit through the exact same `handleBounce()` spark/sound path a wall or paddle hit gets, then adds the destroyed brick's points to a new `hud.recordScore()`. Each row is worth a different amount (`pointsPerRow`, top row worth the most, the classic Breakout scoring shape) via `BrickGrid`'s per-row color/points assignment.

**The bounce counter is gone.** Earlier samples' `Hud` tracked wall/paddle bounces in a running counter next to whatever else it showed; now that bricks give the player an actual score to chase, that tally was just noise, so `Hud` dropped `bounces`/`recordBounce()`/`resetBounceCount()` entirely and shows only `Score`. `main.js`'s `handleBounce()` still spawns sparks and plays the bounce sound on every wall/paddle/brick hit — it just no longer reports the hit to the HUD.

**Resetting respawns the board.** The Reset button calls `brickGrid.reset()` and `hud.resetScore()`, so a full board at zero score is always one click away. `BrickGrid.reset()` just re-runs the same layout logic the constructor uses, disposing the old meshes first.

Clearing the whole board doesn't do anything special yet (`BrickGrid.isCleared()` exists but nothing calls it) — a win state and the rest of the game loop (lives, levels) are the next steps in this series.

## Babylon.js features demonstrated

- Everything from Breakout Paddle (orthographic camera, lit meshes, `BABYLON.ParticleSystem` bursts, synthesized bounce sound, mouse + keyboard paddle control)
- A grid of independently destructible `BABYLON.MeshBuilder.CreateBox` meshes, created and disposed individually as the game is played
- Generalized AABB collision resolution (any side, not just "from above" like the paddle) driven by comparing penetration depth on each axis
- A `BABYLON.GUI` HUD field repurposed from a bounce tally to a running score

## Controls

- **Move the pointer (mouse or touch) over the canvas** — steers the paddle left/right, proportionally mapped to the play area
- **Left/Right arrow keys or A/D** — steers the paddle at a constant speed while held
- **Reset button** (top of screen) — respawns the full brick grid, snaps the ball and paddle back to center, relaunches the ball, and zeroes the score
- **Space** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js`, `js/paddle.js`, `js/bricks.js`, `js/sparks.js`, and `js/hud.js`.

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
