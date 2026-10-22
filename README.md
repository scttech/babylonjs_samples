# Babylon.js Samples

A collection of Babylon.js demos and samples

[Live gallery](https://scttech.github.io/babylonjs_samples/)

## Samples

Each sample builds on the one before it, so they're best read in order:

1. [Bouncing Circle](samples/introduction/bouncing_circle/README.md) — a minimal Babylon.js sample: a circle bounces around inside the browser window, reversing direction off each edge.
2. [Bouncing Ball with Sparks](samples/introduction/bouncing_ball_sparks/README.md) — the ball throws off a shower of sparks and spins like a rolling wheel every time it hits a wall.
3. [Bouncing Ball with Sparks and Sound](samples/introduction/bouncing_ball_sparks_sound/README.md) — every wall hit now also plays a procedurally synthesized "thump" sound.
4. [Bouncing Ball with Unit Tests](samples/introduction/bouncing_ball_tests/README.md) — the ball and spark logic are pulled out into standalone, unit-tested classes.
5. [Bouncing Ball Slingshot](samples/introduction/bouncing_ball_slingshot/README.md) — the ball starts at rest; click and drag to pull it back and launch it, slingshot-style.
6. [Bouncing Ball HUD](samples/introduction/bouncing_ball_hud/README.md) — a HUD tracks the bounce count, with a button to reset the scene.
7. [Bouncing Ball Orthographic](samples/introduction/bouncing_ball_orthographic/README.md) — the ball becomes a real lit 3D mesh, viewed through an orthographic camera.
8. [Bouncing Ball Particles & Friction](samples/introduction/bouncing_ball_particles_friction/README.md) — the ball loses energy on each bounce, and the sparks become real particle system bursts.

## Breakout

Same incremental approach, now building an actual game on top of the bouncing-ball toy above. Also best read in order:

1. [Breakout Paddle](samples/breakout/breakout_paddle/README.md) — a player-controlled paddle deflects the ball, steering it based on where it lands.
2. [Breakout Bricks](samples/breakout/breakout_bricks/README.md) — a destructible grid of bricks and a score turn the toy into an actual game.
3. [Breakout Lives](samples/breakout/breakout_lives/README.md) — missing the ball costs a life; running out freezes the game with a Game Over overlay until Reset.
4. [Breakout Levels](samples/breakout/breakout_levels/README.md) — three brick layouts with tougher multi-hit bricks, cleared one after another for an actual win condition.
5. [Breakout Polish](samples/breakout/breakout_polish/README.md) — a proper start screen and pause, plus wide-paddle, extra-life, and multi-ball power-ups.
6. [Breakout Next Steps](samples/breakout/breakout_next_steps/README.md) — bricks become deeper, beveled 3D blocks with lit highlight/shadow banding, and the ball now bounces off a fixed-size walled box instead of the browser window's edges.

## Asteroids

A third series, building Asteroids from a single thrusting ship. See the [series roadmap](samples/asteroids/README.md). Also best read in order:

1. [Asteroids Ship](samples/asteroids/asteroids_ship/README.md) — a vector-style ship you rotate and thrust, with inertia and screen wrap.
2. [Asteroids Bullets](samples/asteroids/asteroids_bullets/README.md) — hold Space to fire bullets from the ship's nose, with a cooldown, a four-bullet cap, and inherited momentum. Also available as a [step-by-step tutorial](samples/asteroids/asteroids_bullets/TUTORIAL.md).
3. [Asteroids Rocks](samples/asteroids/asteroids_rocks/README.md) — shoot drifting rocks that split into smaller, faster, higher-scoring ones, with circle-vs-circle collisions and a score. Also available as a [step-by-step tutorial](samples/asteroids/asteroids_rocks/TUTORIAL.md).
4. [Asteroids Lives](samples/asteroids/asteroids_lives/README.md) — rocks now hurt the ship: three lives, a blinking protected respawn, and a Game Over screen. Also available as a [step-by-step tutorial](samples/asteroids/asteroids_lives/TUTORIAL.md).
5. [Asteroids Waves](samples/asteroids/asteroids_waves/README.md) — escalating waves with more and faster rocks, a "WAVE N" announcement between them, and rocks that each have their own shape. Also available as a [step-by-step tutorial](samples/asteroids/asteroids_waves/TUTORIAL.md).
6. [Asteroids UFO](samples/asteroids/asteroids_ufo/README.md) — an enemy saucer that crosses the screen and shoots back: big and sloppy, or small and able to lead its shots using targeting math. Also available as a [step-by-step tutorial](samples/asteroids/asteroids_ufo/TUTORIAL.md).
7. [Asteroids Polish](samples/asteroids/asteroids_polish/README.md) — a title screen, pause, particle explosions, a risky hyperspace jump, and a looping thrust rumble. Also available as a [step-by-step tutorial](samples/asteroids/asteroids_polish/TUTORIAL.md).
8. [Asteroids Next Steps](samples/asteroids/asteroids_next_steps/README.md) — lit 3D rocks, a choice of two 3D ships on the title screen, 3D flying saucers, and an optional chase camera. Also available as a [step-by-step tutorial](samples/asteroids/asteroids_next_steps/TUTORIAL.md).

## Parkour Runner

A fourth series, and the first in real 3D from the start: an endless parkour runner through a city street, with a third-person camera and animated characters. See the [series roadmap](samples/parkour_runner/README.md).

1. [Parkour Runner World](samples/parkour_runner/parkour_runner_world/README.md) — a city street built from real 3D pieces, with fog and lights, a camera you can walk down it, and a splash screen. Also available as a [step-by-step tutorial](samples/parkour_runner/parkour_runner_world/TUTORIAL.md).
2. [Parkour Runner Runner](samples/parkour_runner/parkour_runner_runner/README.md) — an animated runner who sprints down the street, eases between three lanes, and is followed by a camera. Also available as a [step-by-step tutorial](samples/parkour_runner/parkour_runner_runner/TUTORIAL.md).
3. [Parkour Runner Street](samples/parkour_runner/parkour_runner_street/README.md) — an endless street: pieces are made ahead of the runner and recycled from behind, so it never ends and never grows. Also available as a [step-by-step tutorial](samples/parkour_runner/parkour_runner_street/TUTORIAL.md).
4. [Parkour Runner Moves](samples/parkour_runner/parkour_runner_moves/README.md) — the runner can jump, slide, and dive into a roll: a small state machine, exact gravity, and animation clips played to fit each move. Also available as a [step-by-step tutorial](samples/parkour_runner/parkour_runner_moves/TUTORIAL.md).
5. [Parkour Runner Obstacles](samples/parkour_runner/parkour_runner_obstacles/README.md) — barriers to jump or vault, bars to slide under and containers to dodge, with collisions that use the runner's height and a crash when you get it wrong. Also available as a [step-by-step tutorial](samples/parkour_runner/parkour_runner_obstacles/TUTORIAL.md).
6. [Parkour Runner Score](samples/parkour_runner/parkour_runner_score/README.md) — coins to collect, a distance counter, a speed that rises as you run, and a combo for getting past obstacles with the right move, shown with Babylon.js GUI. Also available as a [step-by-step tutorial](samples/parkour_runner/parkour_runner_score/TUTORIAL.md).
