# Bouncing Ball Slingshot

Builds on [Bouncing Ball with Unit Tests](../bouncing_ball_tests/README.md): instead of always being in motion, the ball starts at rest and waits to be launched. Click or tap the ball and drag to pull it back like a slingshot — a trail of dots grows longer and shifts from green to yellow to red as the pull nears its maximum, previewing both the launch direction and speed. Release to fire the ball off opposite the pull. The ball can be grabbed again mid-flight at any time, freezing it in place to reset its trajectory.

`Ball` gains three new drag methods (`beginDrag`, `dragTo`, `release`) alongside its existing physics, all pure math with no `BABYLON` dependency, so they're covered the same way as the rest of the class in [ball.tests.js](tests/ball.tests.js). The new `SlingshotIndicator` class follows the same ui-optional split as `Ball`/`SparkSystem`: it only touches `BABYLON` when constructed with a `ui`, pooling a fixed set of dot controls up front and toggling their visibility instead of creating/disposing controls on every pointer move.

## Babylon.js features demonstrated

- Everything from Bouncing Ball with Unit Tests
- Pointer input via `scene.onPointerObservable` (`POINTERDOWN` / `POINTERMOVE` / `POINTERUP`), converted from canvas pixel space into the GUI's center-origin coordinate space
- A pooled set of `BABYLON.GUI.Ellipse` controls, reused every frame rather than created/disposed, to cheaply animate a growing, color-interpolated indicator

## Controls

- **Click/tap the ball and drag, then release** — pull back and launch it, slingshot-style. Works again mid-flight to relaunch.
- **Space** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js` and `js/sparks.js`.

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
