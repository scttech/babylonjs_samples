# Parkour Runner Obstacles

<img src="../parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 5 of the Parkour Runner series. Builds on [Parkour Runner Moves](../parkour_runner_moves/README.md), reusing its runner, moves, endless street and camera. What's new is what gets in the way: **barriers** to jump or vault, **overhead bars** to slide under, and **containers** that only a lane change avoids. Hit one and the runner falls over, a message appears, and **R** starts the run again. The runner also learns a new move: the **vault**.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Moves sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**Each obstacle needs a different answer.** A barrier is 0.9 high, lower than the top of a jump or a vault. An overhead bar hangs from 1.0 to 1.5 high: above a sliding runner (0.7) and in the way of a standing one (1.8). A container is 2.45 high, taller than any jump, so only a lane change gets round it. The numbers in `OBSTACLE_TYPES` are what make the moves matter.

**A collision is three overlaps.** The runner and an obstacle must overlap *across* the street, *along* it, and in *height*. All three, or they miss. Height is the interesting one: the runner fills `y` up to `y + bodyHeight`, and `bodyHeight` changes with the move, so a slide fits under a bar a jump never could.

**A vault is the forgiving jump.** A jump clears a barrier only if it starts in a window about 0.24 seconds wide, and a lower, quicker hop can't beat that by physics alone. So a vault is an assist: with his hands on a barrier it can't catch him, and he can start it anywhere in the 2.5 units before. The game picks it for you: **one key, a different move by situation.** Within 2.5 units of a barrier, jump vaults at once; within 14 (about a second and a half of running) the press is remembered and the vault happens when the barrier gets close enough; with nothing near, it jumps. An early press isn't wasted. A vault also leans him forward over the barrier, so it looks different from a jump.

**Neighbors must fit.** Lanes are 2.2 apart, so two obstacles side by side must have half widths that add up to no more than that. The containers are narrowed to fit, and a test checks every pair of kinds, so a barrier between two containers is never clipped by them.

**A course that can always be beaten.** Obstacles come in groups, each one of ten patterns for the three lanes. Every pattern has a lane that is empty or isn't a wall, and a test checks it, so a run is never impossible. The gaps between groups are random, from one seeded generator, so the same seed gives the same course however the updates are spaced, and a restart is the same course.

**Made ahead, dropped behind, from the same pool.** `ObstacleField` works like `StreetStream`: it says what should exist for where the runner is. The pool makes the pieces or reuses ones that fell behind. Obstacles are reshaped from the street's models (a barrier is a construction barrier turned and stretched; an overhead bar is an awning made narrower and lower), so a placement now carries a `scale`, and `moveTo` sets it every time a piece is placed or reused.

**The street surface is y = 0.** The road and sidewalk tiles are a slab 0.14 thick after the scale, and were drawn standing on the ground, so the street was 14 centimeters above the runner's feet: invisible while running, but a slide or a crash showed an arm or his head inside it. The tiles are now drawn sunk by `ROAD_HEIGHT`, so the top of the street is at y = 0 and the slide and crash lifts only cover what the poses dip below it.

**A crash is a move.** `crash()` stops him, lays him flat, and nothing but `reset()` starts him again: every other move checks it may start first.

## Key code

**Hitting: three overlaps.**

```js
function hits(runner, obstacle) {
  if (obstacle.vaultable && runner.move === MOVES.vault) return false;
  const across = Math.abs(runner.x - obstacle.x) < obstacle.halfWidth + RUNNER_HALF_WIDTH;
  const along = Math.abs(runner.z - obstacle.z) < obstacle.depth / 2 + RUNNER_HALF_DEPTH;
  const high = runner.y < obstacle.top && runner.y + runner.bodyHeight > obstacle.bottom;
  return across && along && high;
}
```

**Groups of obstacles, with a random gap between them.**

```js
while (this.nextGroupZ < z + this.ahead) {
  added.push(...this._makeGroup(this.nextGroupZ));
  this.nextGroupZ += MIN_GAP + this.random() * (MAX_GAP - MIN_GAP);
}
```

**One key, a different move by situation.**

```js
else if (JUMP_KEYS.has(event.code)) {
  const gap = field.barrierGap(runner);
  if (gap <= VAULT_RANGE) runner.vault();
  else if (gap <= VAULT_QUEUE_RANGE) vaultQueued = true;
  else runner.jump();
} else runner.slide();
```

**Checking for a crash every frame.**

```js
runner.update(dt);
buildStreet(runner.z);
buildObstacles(runner.z);

if (!runner.crashed && field.hit(runner)) {
  runner.crash();
  message.classList.remove("hidden");
}
```

**Reshaping a piece when it is placed.** Set every time, so a reused piece is exactly what its placement says.

```js
moveTo(piece, { x = 0, y = 0, z = 0, rotationY = 0, scale = { x: 1, y: 1, z: 1 } } = {}) {
  piece.position.x = x;
  piece.position.y = y;
  piece.position.z = z;
  piece.rotation.y = rotationY;
  piece.scaling.x = scale.x;
  piece.scaling.y = scale.y;
  piece.scaling.z = scale.z;
}
```

## Babylon.js features demonstrated

- Everything from Parkour Runner Moves (an animated character, clip choice from state, an endless street, a follow camera, a splash screen)
- Non-uniform `scaling` on a node: reshaping one model into different obstacles
- Instances sharing one pool, with their own placements, sizes and turns
- Playing a clip once and holding the last pose (the crash)
- An HTML overlay for a message, shown and hidden with a class

## Controls

- **Left/Right arrow keys or A/D** — move one lane left or right
- **Up arrow, W or Space** — jump, or vault if a barrier is just ahead
- **Down arrow or S** — slide; in the air, dive and roll
- **R** — run again after a crash (the course starts again too)
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover the obstacle kinds (that the numbers make a jump, a slide and a lane change each necessary), the patterns (every one beatable), `hits` (across, along and up, for every move), vaulting and jumping over barriers with a real `Runner`, `barrierGap`, the `ObstacleField` (groups, spacing, a repeatable course, a bounded number, reset), the runner's vault and crash, the clips for them, and `moveTo` with a scale.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the street and the obstacles) and [Quaternius](https://quaternius.com) (the runner and his animations), as listed in [the assets README](../assets/README.md).

## Next up

**Parkour Runner Score** adds coins to collect, a distance counter, a speed that rises as you go, and a combo for clean moves.
