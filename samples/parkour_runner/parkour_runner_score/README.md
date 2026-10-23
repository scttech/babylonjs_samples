# Parkour Runner Score

<img src="../assets/images/parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 6 of the Parkour Runner series. Builds on [Parkour Runner Obstacles](../parkour_runner_obstacles/README.md), reusing its runner, moves, street and obstacles. What's new is a reason to keep running: **coins** to collect, a **distance** that counts up, a **speed** that rises the longer you survive, and a **combo** for getting past obstacles with the right move. It is all drawn over the picture with Babylon.js **GUI**, and the score is shown when you crash.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Obstacles sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**The rules are a small plain class.** `Score` holds the distance, the coins, the points and the combo, with no Babylon.js in it. The game says what happened (`collectCoin()`, `cleanMove()`) and the `Hud` draws what the score says. That is what makes every rule testable: a coin is worth 10, a clean move 25, the distance counts a point a unit, and the multiplier rises by one for every 3 clean moves in a row, up to x5.

**The speed has a ramp, and a cap.** `speedFor(distance)` starts at the normal running speed and rises a little for every unit run, up to 30, which it reaches after about 1600 units. The cap matters: the vault and jump windows get tighter as the street goes by faster, and past about 30 they stop being fair. From 22 (after 1000 units) the groups of obstacles also come closer together, down to four fifths of the gap at top speed, so the course gets harder as well as faster. The run clip plays faster in step (`speedRatio`), so his feet keep up.

**A coin is in the world but isn't an obstacle.** Coins are made by the `ObstacleField`, in trails in the gaps between groups, with the same placements, the same pool and the same drawing code. A coin has a size, so the same `hits` test finds out whether the runner is touching it, and its `type` says what to do next: an obstacle crashes him, a coin is collected. Coins sit at chest height, so a standing or jumping runner takes them and a sliding one goes under.

**A clean move is judged afterwards.** While the runner is over an obstacle (in its lane, along its length), `track` records every move he makes. Once the obstacle is behind him, `passed` asks whether any of those moves is in `CLEAN_MOVES` for that kind: a jump or vault for a barrier, a slide or roll for an overhead bar, nothing for a container. Each obstacle counts once.

**The combo is worth what he had before.** A clean move pays out the multiplier he had before it, and then the combo grows. Take more than 5 seconds to make the next clean move and the combo, and so the multiplier, is lost. The points already won stay.

**Text over the picture.** `Hud` makes four `TextBlock` labels on a fullscreen `AdvancedDynamicTexture`: the score, the distance, the coins and, while there is one, the combo. They start below the page's back button, and don't intercept pointer events.

## Key code

**The speed ramp.**

```js
function speedFor(distance) {
  return Math.min(MAX_SPEED, RUN_SPEED + Math.max(0, distance) * SPEED_RAMP);
}
```

**Clean moves: points first, then the combo grows.**

```js
cleanMove() {
  this.points += CLEAN_MOVE_POINTS * this.multiplier;
  this.combo++;
  this.comboTimer = COMBO_TIME;
}
```

**Judging a pass after the fact.**

```js
passed(runner) {
  const clean = [];
  for (const [id, obstacle] of this.active) {
    if (obstacle.type === "coin" || this.counted.has(id)) continue;
    if (obstacle.endZ + RUNNER_HALF_DEPTH >= runner.z) continue; // not behind him yet
    this.counted.add(id);
    const moves = this.touched.get(id);
    if (moves && CLEAN_MOVES[obstacle.type].some((move) => moves.has(move))) clean.push(obstacle);
  }
  return clean;
}
```

**Scoring in the frame loop.**

```js
runner.speed = speedFor(score.distance);
runner.update(dt);
...
if (!runner.crashed) {
  score.setDistance(runner.z - RUNNER_START_Z);
  score.update(dt);
  for (const coin of field.collect(runner)) {
    score.collectCoin();
    releaseCoin(coin);
  }
  field.track(runner);
  for (const _ of field.passed(runner)) score.cleanMove();
  hud.update(score);
}
```

**A clip that follows the speed without starting over.**

```js
if (name === this.current) {
  if (speed !== this.speed) {
    this.clips.get(name).speedRatio = speed;
    this.speed = speed;
  }
  return;
}
```

## Babylon.js features demonstrated

- Everything from Parkour Runner Obstacles (an animated character, an endless street, obstacles from a shared pool, a follow camera, a splash screen)
- Babylon.js GUI: `AdvancedDynamicTexture.CreateFullscreenUI` and `TextBlock`, with outlines and alignment
- `AnimationGroup.speedRatio`: changing the speed of a clip that is already playing
- Instances placed and spun each frame (the coins)

## Controls

- **Left/Right arrow keys or A/D** — move one lane left or right
- **Up arrow, W or Space** — jump, or vault if a barrier is just ahead
- **Down arrow or S** — slide; in the air, dive and roll
- **R** — run again after a crash (the score starts again too)
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover the speed ramp, every rule of `Score` (coins, clean moves, the multiplier and its cap, the combo timer, reset), the coins (their placement, trails, spacing, repeatability, being kept clear of obstacles, collecting), tracking and passing obstacles with real moves, the clip speed that follows the runner, and the `Hud` with a stand-in for Babylon.js GUI.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the street, the obstacles and the coin) and [Quaternius](https://quaternius.com) (the runner and his animations), as listed in [the assets README](../assets/README.md).

## Next up

[**Parkour Runner Screens**](../parkour_runner_screens/README.md) adds a title screen with your name and a choice of runner color, a pause, and a game over screen with a local leaderboard.
