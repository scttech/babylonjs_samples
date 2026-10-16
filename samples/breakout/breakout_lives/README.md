# Breakout Lives

![Breakout Lives](../../../img/breakout_lives/breakout_lives.png)

Step 3 of the Breakout series. Builds on [Breakout Bricks](../breakout_bricks/README.md), reusing its ball/paddle/brick physics, particle sparks, procedural bounce sound, and score tracking wholesale. What's new is an actual lose condition: missing the ball costs a life, and running out ends the game.

**The bottom wall no longer bounces the ball back.** `Ball.update(dt, bounds)` gains an `openBottom` bounds flag — when true, the bottom-edge check is skipped entirely, so a ball that reaches it just keeps falling instead of reflecting. Every earlier sample in this series passed `openBottom: false` (the default) and gets the old forever-bouncing behavior unchanged; this sample is the first to pass `openBottom: true`. `main.js` then watches for the ball fully clearing the bottom edge (`ball.y - ball.radius > halfHeight`) *after* the paddle and brick collision checks have had a chance to intercept it — so catching the ball with the paddle in the same frame it would've fallen out still works exactly as before, and only a genuine miss reaches that check.

**`Hud` gained lives and a Game Over overlay.** A `Lives:` label sits next to `Score:`, driven by `loseLife()` (decrements, refreshes the label, and shows the overlay once lives hit 0) and `resetLives()` (restores `startingLives` and always hides the overlay — a life-count reset unambiguously means the game is playable again). The Game Over label itself is added straight to `ui` rather than the top-pinned score/lives panel, so it keeps `BABYLON.GUI`'s default center/center alignment and shows up in the middle of the screen instead of the corner.

**Missing the ball freezes the game, not just the ball.** `main.js` tracks a `gameOver` flag. `loseLife()` calls `hud.loseLife()`; if lives remain, it just respawns the ball and paddle (score and the brick layout are left alone, so progress isn't lost over a single miss) — but once lives hit 0, it sets `gameOver = true` instead. That flag gates both the pointer handler (no more paddle tracking) and the physics/collision block in the render loop, so everything freezes in place — except `sparkSystem.update()`, which keeps running even during Game Over so any in-flight burst still finishes fading out instead of stopping mid-animation.

**Reset is now a full restart.** Alongside the ball/paddle/score/brick reset carried over from Breakout Bricks, the Reset button now also calls `hud.resetLives()` (which clears the Game Over overlay) and clears the local `gameOver` flag, so Reset is the only way back into a frozen game.

## Key code

**An open bottom edge.** The bottom bounce is skipped when `openBottom` is set, so the ball falls straight through. The caller then checks whether it has fully cleared the edge, *after* the paddle and brick checks have had their chance, so a last-moment catch still counts.

```js
update(dt, bounds) {
  const { halfWidth, halfHeight, openBottom = false } = bounds;
  // ...
  if (this.y + this.radius > halfHeight && !openBottom) {
    this.y = halfHeight - this.radius;
    this.vy = -this.vy * this.restitution;
    events.push(this._bounceEvent(this.x, this.y + this.radius, 0, -1));
  }
  // ...
}
```

```js
const bounces = ball.update(dt, { halfWidth, halfHeight, openBottom: true });
// ...brick and paddle collisions...

if (ball.y - ball.radius > halfHeight) {
  loseLife();
}
```

**Losing a life, or the game.** Lives remaining means a fresh ball and a re-centered paddle, with score and bricks untouched. Zero lives sets a flag that the render loop checks.

```js
let gameOver = false;

const loseLife = () => {
  const remaining = hud.loseLife();
  if (remaining > 0) {
    paddle.reset();
    const relaunch = randomLaunchVelocity();
    ball.reset(0, 0, relaunch.vx, relaunch.vy);
  } else {
    gameOver = true;
  }
};
```

**Freezing the game, but not the sparks.** Everything past the early return is gameplay. `sparkSystem.update()` runs before it, so any burst still in flight finishes fading instead of stopping mid-animation.

```js
scene.onBeforeRenderObservable.add(() => {
  const dt = engine.getDeltaTime() / 1000;
  sparkSystem.update(dt);
  if (gameOver) return;
  // ...paddle input, ball physics, collisions...
});
```

**A centered overlay.** Added to `ui` directly rather than to the top-pinned panel, so it keeps the GUI's default center alignment. `isHitTestVisible = false` is the subtle part: a `TextBlock` with no explicit size fills its whole parent, so without it the invisible full-screen label would swallow clicks meant for the Reset button as soon as it appears.

```js
this.gameOverLabel = new BABYLON.GUI.TextBlock();
this.gameOverLabel.text = "Game Over";
this.gameOverLabel.color = "white";
this.gameOverLabel.fontSize = 48;
this.gameOverLabel.outlineWidth = 6;
this.gameOverLabel.outlineColor = "#202020";
this.gameOverLabel.isVisible = false;
this.gameOverLabel.isHitTestVisible = false;
this.ui.addControl(this.gameOverLabel);

loseLife() {
  this.lives = Math.max(0, this.lives - 1);
  this._syncLabels();
  if (this.lives === 0) this.showGameOver();
  return this.lives;
}
```

## Babylon.js features demonstrated

- Everything from Breakout Bricks (orthographic camera, lit meshes, particle bursts, synthesized bounce sound, mouse + keyboard paddle control, scoring)
- A conditional physics branch (`openBottom`) that changes which walls bounce, driven entirely by a bounds flag rather than a second copy of the collision code
- A full game-state gate (`gameOver`) that freezes input and simulation in the render loop while still letting cosmetic systems (particles) finish naturally
- A centered `BABYLON.GUI` overlay added directly to the fullscreen UI texture, alongside (but independent of) the top-pinned HUD panel

## Controls

- **Move the pointer (mouse or touch) over the canvas** — steers the paddle left/right, proportionally mapped to the play area
- **Left/Right arrow keys or A/D** — steers the paddle at a constant speed while held
- **Reset button** (top of screen) — always available, even after Game Over: respawns the full brick grid, restores lives, zeroes the score, and relaunches the ball
- **Space** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js`, `js/paddle.js`, `js/bricks.js`, `js/sparks.js`, and `js/hud.js`.

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
