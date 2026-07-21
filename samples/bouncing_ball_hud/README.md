# Bouncing Ball HUD

Builds on [Bouncing Ball Slingshot](../bouncing_ball_slingshot/README.md): a `BABYLON.GUI.TextBlock` pinned to the top of the screen now tracks how many times the ball has bounced off a wall, and a `BABYLON.GUI.Button` below it resets everything back to the start — the ball snaps back to the center at zero velocity (canceling any in-progress drag and clearing the launch indicator) and the bounce count returns to zero.

The new `Hud` class follows the same ui-optional, testable split as `Ball`/`SparkSystem`/`SlingshotIndicator`: `BABYLON` is only touched in `attachTo()`, so `recordBounce()`'s counting logic is tested directly, and the label/button wiring is tested by stubbing `BABYLON.GUI.StackPanel` / `TextBlock` / `Button.CreateSimpleButton`. `Ball` gains a matching `reset(x, y)` method (defaults to the origin), tested alongside its other physics. See [hud.tests.js](tests/hud.tests.js) and [ball.tests.js](tests/ball.tests.js).

## Babylon.js features demonstrated

- Everything from Bouncing Ball Slingshot
- `BABYLON.GUI.TextBlock` inside a `BABYLON.GUI.StackPanel` for simple auto-laid-out HUD text
- `BABYLON.GUI.Button.CreateSimpleButton` and its `onPointerUpObservable` for a clickable in-scene control
- Screen-space GUI layout (`horizontalAlignment` / `verticalAlignment` pinned to a corner) alongside the center-origin coordinate space `Ball`/`SparkSystem` already use

## Controls

- **Click/tap the ball and drag, then release** — pull back and launch it, slingshot-style. Works again mid-flight to relaunch.
- **Reset button** (top of screen) — snaps the ball back to the center at rest
- **Space** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js`, `js/sparks.js`, and `js/hud.js`.

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
