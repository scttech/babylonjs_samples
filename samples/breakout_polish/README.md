# Breakout Polish

![Breakout Polish](../../img/breakout_polish/breakout_polish.png)

Step 5 — the final sample in the Breakout series. Builds on [Breakout Levels](../breakout_levels/README.md), reusing its ball/paddle/brick/level physics, particle sparks, procedural bounce sound, and score/lives/win tracking wholesale. What's new is everything that turns it from "a working game" into something that feels like a real one: a proper start screen, a pause you can resume from, and three catchable power-ups.

**The game no longer auto-launches.** Every earlier sample spawned a moving ball the instant the scene loaded. Here, `main.js` tracks a `started` flag and doesn't create any ball until the player's first click or tap (`beginGame()`, wired to `POINTERDOWN`); until then, `Hud`'s new `startLabel` ("Click or tap to start") is the only overlay visible, shown by default instead of hidden like the others.

**Pause is resumable; Game Over and Win aren't.** `paused` gates the same physics/input block `gameOver`/`won` already did (`if (!started || gameOver || won || paused) return;`), but `togglePause()` (bound to `P`) can only engage between `started` and the round actually ending, and flips back off on a second press — unlike the other two, which only clear on Reset. Sparks keep animating through all three freezes, same as before; they're cosmetic either way.

**Multi-ball turns `ball` into `balls`.** The single-`Ball` variable every earlier sample used is now an array, iterated once per frame for wall/brick/paddle collision exactly like before, but a ball that falls past the bottom is now just removed from the array instead of immediately costing a life -- only once `balls.length === 0` does `loseLife()` actually run. Nothing about `Ball` itself changed; every method already operated on `this`, so managing several instances instead of one needed no changes to `ball.js`.

**Three power-ups, one new class.** `PowerUpManager` (`js/powerups.js`) tracks falling pickups the same way `BrickGrid` tracks bricks -- plain records with an optional mesh, `BABYLON` only touched when a `scene` is supplied. A destroyed brick has a 25% chance of dropping one (`BrickGrid.checkCollision()` now also reports `destroyed`/`x`/`y` so `main.js` knows where), and catching it with the paddle applies an effect `main.js` owns, not `PowerUpManager`:
- **wide** — widens the paddle for 10 seconds. This needed one real change outside `main.js`: `Paddle.setHalfWidth()` rescales the mesh (`mesh.scaling.x`) relative to the half-width baked into the geometry at `attachTo()` time, so the visible paddle and its collision hitbox (`moveTo()`'s clamp, `Ball.bounceOffPaddle()`'s span check -- both already read `this.halfWidth` live) never drift apart the way they would if only the number were mutated.
- **life** — `Hud.addLife()`, a life gain with no Game Over overlay to hide, unlike `resetLives()`.
- **multi** — spawns two extra balls angled ±20° off the catching ball's current heading, at the same speed.

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
