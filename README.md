# Babylon.js Samples

A collection of Babylon.js demos and samples

[Live gallery](https://scttech.github.io/babylonjs_samples/)

## Samples

Each sample builds on the one before it, so they're best read in order:

1. [Bouncing Circle](samples/bouncing_circle/README.md) — a minimal Babylon.js sample: a circle bounces around inside the browser window, reversing direction off each edge.
2. [Bouncing Ball with Sparks](samples/bouncing_ball_sparks/README.md) — the ball throws off a shower of sparks and spins like a rolling wheel every time it hits a wall.
3. [Bouncing Ball with Sparks and Sound](samples/bouncing_ball_sparks_sound/README.md) — every wall hit now also plays a procedurally synthesized "thump" sound.
4. [Bouncing Ball with Unit Tests](samples/bouncing_ball_tests/README.md) — the ball and spark logic are pulled out into standalone, unit-tested classes.
5. [Bouncing Ball Slingshot](samples/bouncing_ball_slingshot/README.md) — the ball starts at rest; click and drag to pull it back and launch it, slingshot-style.
6. [Bouncing Ball HUD](samples/bouncing_ball_hud/README.md) — a HUD tracks the bounce count, with a button to reset the scene.
7. [Bouncing Ball Orthographic](samples/bouncing_ball_orthographic/README.md) — the ball becomes a real lit 3D mesh, viewed through an orthographic camera.
8. [Bouncing Ball Particles & Friction](samples/bouncing_ball_particles_friction/README.md) — the ball loses energy on each bounce, and the sparks become real particle system bursts.

## Breakout

Same incremental approach, now building an actual game on top of the bouncing-ball toy above. Also best read in order:

1. [Breakout Paddle](samples/breakout_paddle/README.md) — a player-controlled paddle deflects the ball, steering it based on where it lands.
2. [Breakout Bricks](samples/breakout_bricks/README.md) — a destructible grid of bricks and a score turn the toy into an actual game.
3. [Breakout Lives](samples/breakout_lives/README.md) — missing the ball costs a life; running out freezes the game with a Game Over overlay until Reset.
