# Parkour Runner Moves

<img src="../parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 4 of the Parkour Runner series. Builds on [Parkour Runner Street](../parkour_runner_street/README.md), reusing its endless street, runner, lanes and camera. What's new is what the runner can *do*: **jump** (↑ / W / Space), **slide** low (↓ / S), and **dive** out of the air into a **roll** (↓ / S while jumping). There are no obstacles yet, but each move already changes how tall the runner is, which is what obstacles will care about in the next step.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Street sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**One thing at a time.** The runner is always doing exactly one of four things: running, jumping, sliding or rolling. That's one value, `runner.move`, not a pile of flags that could contradict each other. Each move says where it can start from: you can jump from a run or a slide, but not twice in the air, and not out of a roll. It's a small *state machine*.

**One key, two meanings.** On the ground, `slide()` slides. In the air the same key **dives**: the runner is pushed straight down, and remembers that he dived so that he **rolls** when he lands. Only one dive per jump.

**Gravity that doesn't depend on the frame rate.** In the air, the new height is `vy × dt − ½ × g × dt²` and the new speed is `vy − g × dt`: the exact motion under constant gravity. The usual shortcut (`vy -= g * dt; y += vy * dt`) is an approximation that makes jumps longer on slow computers. With the exact formulas a jump is the same height (about 1.5 units) and length (about 0.6 seconds) at any frame rate, and a test checks it.

**A size that depends on what the runner is doing.** `bodyHeight` is 1.8 standing and 0.7 while sliding or rolling. The next step's obstacles will ask for it.

**Animation chosen from state.** `clipFor(runner)` returns `{ name, loop, speed }`. Moves play once and hold their last pose. The clips were recorded slower than a game wants a move to last, so they're sped up to fit: the 1.33-second jump clip plays at 2.2 times speed for a 0.6-second jump. A slide is two clips: down into the slide, which holds, and back up for the last 0.3 seconds.

**Keeping a hand out of the ground.** The slide clip lowers the character until his hand dips a few centimeters into the street. `liftFor` raises the model 9 cm while he slides, and `main.js` eases toward it so the model glides up and down instead of hopping.

**A camera that doesn't bob.** The camera copies only 40% of the runner's height, so a jump lifts the runner in the picture but doesn't throw the whole view up and down.

## Key code

**The exact motion under gravity.**

```js
if (this.move === MOVES.jump) {
  this.y += this.vy * dt - 0.5 * GRAVITY * dt * dt;
  this.vy -= GRAVITY * dt;
  if (this.y <= 0) this._land();
}
```

**One key, two meanings.**

```js
slide() {
  if (this.move === MOVES.run) {
    this._begin(MOVES.slide);
  } else if (this.move === MOVES.jump && !this.diving) {
    this.vy = -DIVE_SPEED;
    this.diving = true;
  }
}

_land() {
  this.y = 0;
  this.vy = 0;
  this._begin(this.diving ? MOVES.roll : MOVES.run);
  this.diving = false;
}
```

**Choosing the clip, how fast, and whether to loop.**

```js
function clipFor(runner) {
  switch (runner.move) {
    case MOVES.jump:
      return { name: CLIPS.jump, loop: false, speed: JUMP_CLIP_SPEED };
    case MOVES.slide:
      return runner.timeLeft > SLIDE_EXIT_TIME
        ? { name: CLIPS.slideStart, loop: false, speed: SLIDE_START_CLIP_SPEED }
        : { name: CLIPS.slideExit, loop: false, speed: SLIDE_EXIT_CLIP_SPEED };
    case MOVES.roll:
      return { name: CLIPS.roll, loop: false, speed: ROLL_CLIP_SPEED };
    default:
      return { name: runner.running ? CLIPS.run : CLIPS.idle, loop: true, speed: 1 };
  }
}
```

**Playing it.** An animation group's `start` takes whether to repeat and how fast.

```js
play(name, { loop = true, speed = 1 } = {}) {
  if (name === this.current) return;
  const next = this.clips.get(name);
  if (!next) throw new Error(`The character has no clip called "${name}"`);

  if (this.current) this.clips.get(this.current).stop();
  next.start(loop, speed);
  this.current = name;
}
```

**The frame loop.** The character's height comes from the runner; the clips play in place.

```js
character.root.position.set(runner.x, runner.y, runner.z);
character.root.rotation.y = runner.heading;
const clip = clipFor(runner);
clips.play(clip.name, clip);
```

## Babylon.js features demonstrated

- Everything from Parkour Runner Street (an animated character, clips and blending, a follow camera, instanced pieces, an endless street, a splash screen)
- `AnimationGroup.start(loop, speedRatio)`: playing a clip once or repeating, faster or slower than recorded
- Blending between clips with `blendingSpeed`, counted in frames
- Driving a node's height from game state while the clips play in place

## Controls

- **Left/Right arrow keys or A/D** — move one lane left or right
- **Up arrow, W or Space** — jump
- **Down arrow or S** — slide; in the air, dive and roll
- **R** — start again from the beginning
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover the moves (jump height and length, the same jump at any frame rate, no double jump, jumping out of a slide, sliding and its time, dive and roll, body height, `timeLeft`, reset), `clipFor` (the clip, loop and speed for each move, and the slide's two halves), `liftFor`, the `ClipPlayer` playing once and at another speed, and the camera following height.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the street) and [Quaternius](https://quaternius.com) (the runner and his animations), as listed in [the assets README](../assets/README.md).

## Next up

**Parkour Runner Obstacles** puts barriers, fences and containers in the runner's way: low ones to jump, high ones to slide under, and ones to vault, with collisions that use the runner's height.
