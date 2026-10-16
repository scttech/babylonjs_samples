# Bouncing Ball with Unit Tests

![Bouncing Ball with Unit Tests](../../img/bouncing_ball_tests/bouncing_ball_tests.png)

Builds on [Bouncing Ball with Sparks and Sound](../bouncing_ball_sparks_sound/README.md): the ball's state/physics/rendering are pulled out of `main.js` into a standalone [`Ball`](js/ball.js) class, and the spark particle effect is likewise pulled out into a [`SparkSystem`](js/sparks.js) class. `main.js` is now just wiring: create a `Ball` and a `SparkSystem`, feed the ball's bounce events into the spark system and the bounce sound, and let each class manage its own `BABYLON.GUI` controls. That keeps things manageable as more balls (or spark bursts) are added.

Both classes stay testable without a real Babylon engine: `BABYLON` is only touched when a GUI texture (`ui`) is actually supplied, so the physics can be tested directly and the rendering can be tested by stubbing `BABYLON.GUI.Ellipse` / `BABYLON.GUI.Rectangle`. `SparkSystem` additionally takes an injectable `random` function (defaults to `Math.random`) so its randomized spawn behavior — particle count, spread, speed, lifetime, color — can be pinned down exactly in tests instead of only checking loose ranges. Verified here with QUnit: [ball.tests.js](tests/ball.tests.js), [sparks.tests.js](tests/sparks.tests.js).

## Babylon.js features demonstrated

- Everything from Bouncing Ball with Sparks and Sound
- Self-contained classes that own both simulation state and their own `BABYLON.GUI` controls
- Structuring code so gameplay/physics logic can be unit tested independently of a running Babylon.js engine
- Injecting a random source so randomized behavior (particle spawning) can be tested deterministically

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ball.js` and `js/sparks.js`.

## Controls

- **Space** — save a PNG screenshot of the current frame

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
