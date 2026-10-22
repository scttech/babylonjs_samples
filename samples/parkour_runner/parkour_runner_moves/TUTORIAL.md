# Tutorial: Parkour Runner Moves -- Jump, Slide and Roll

This is the fourth tutorial in the Parkour Runner series. So far the runner can only run and change lanes. Parkour is about getting past things, so in this step he learns three moves: he can **jump**, **slide** low, and **dive** out of the air into a **roll**. There are no obstacles yet (that's the next step), but the moves are all there, and they each change how tall the runner is, which is what obstacles will care about. You write the code; this document tells you what to write and why.

By the end you'll have:

- A runner that is always **doing one thing**: running, jumping, sliding or rolling, tracked as plain state
- A **jump** with real gravity that takes the same time at any frame rate
- A **slide** that goes low for a fixed time, and a **dive** that drops fast out of a jump and lands in a **roll**
- **Different animation clips** for each move, played once and sped up to fit, with the slide in two parts
- A camera that rises a little with the jump
- Controls: **↑ / W / Space** to jump, **↓ / S** to slide (or dive, in the air)
- Unit tests for all of it

**What you'll learn:** a small state machine for a character, frame-rate independent physics (the exact motion under gravity), timed moves, driving animation from state (which clip, how fast, looping or playing once), and giving a game object a size that depends on what it is doing.

## Where you're starting

This folder is a copy of the finished Street sample. There are no new files in this step; the existing ones grow:

```
parkour_runner_moves/
├── index.html, tests.html
├── js/
│   ├── runner.js       (grows -- Step 1)
│   ├── clips.js        (changes -- Step 2)
│   ├── camera.js       (changes -- Step 3)
│   ├── main.js         (changes -- Step 4)
│   └── world.js, models.js, stream.js, pool.js, splash.js   (from the Street sample)
└── tests/
    └── runner / clips / camera .tests.js, and the rest      (from the Street sample)
```

### The clips

The runner's file has a clip for each move. This step uses these (the others are for later):

| Move | Clip | Length as recorded | What it shows |
|---|---|---|---|
| Run | `Sprint_Loop` | 0.67 s | A fast run, repeating |
| Jump | `Jump_Start` | 1.33 s | Crouch, spring, tuck the legs, stretch for the landing |
| Slide | `Slide_Start` | 0.83 s | Dropping down into a low slide, and staying there |
| Slide | `Slide_Exit` | 0.5 s | Getting back up |
| Roll | `Roll` | 1.47 s | A dive roll |

The clips were recorded slower than a game wants a move to last, and they play in place (the character doesn't move forward or up in them), so the game moves the character and plays the clips faster to fit.

### You need a web server for this one

As before, the models can't be loaded from a page opened from a file. Run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/parkour_runner/parkour_runner_moves/` (the command prints the exact address), or use the *Live Server* extension in VS Code. (`tests.html` loads no models and works from a file.)

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `js/` and `tests/` with a fresh copy of the Street sample. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works: the runner runs down the endless street. Open `tests.html` too and note how many tests pass (**133**); you'll watch that number grow. Keep the developer console open (F12) as you work.

---

## Step 1: The runner's moves

What the runner is *doing* is plain state, so it goes in `js/runner.js` next to where he is, and the moves can be tested without a graphics engine. Open `js/runner.js`. Every change in this step is to the `Runner` class and the constants above it.

### 1a. Constants

The comment at the top of the file now covers moves too. Replace it with:

```js
// The runner: which of three lanes it is in, how far along the street it is, how
// fast it runs, and what it is doing right now: running, jumping, sliding or
// rolling. Everything here is plain numbers (no Babylon.js), so the movement can
// be tested on its own; main.js moves the character to wherever this says. See
// ../tests/runner.tests.js.
//
// A lane is -1 (left), 0 (middle) or 1 (right), and x is the runner's sideways
// position in the street. The street runs along +z, as in world.js, and y is up.
```

and add these constants below `RUN_SPEED`:

```js
// What the runner can be doing. Only one at a time.
const MOVES = { run: "run", jump: "jump", slide: "slide", roll: "roll" };

const GRAVITY = 32; // how fast a jump slows, then falls, in units per second per second
const JUMP_SPEED = 9.8; // how fast the runner leaves the ground: a jump about 1.5 units high and 0.6 seconds long
const DIVE_SPEED = 14; // how fast the runner is pushed down by diving in the air
const SLIDE_TIME = 0.9; // seconds
const ROLL_TIME = 0.55; // seconds

// How tall the runner is for the purposes of hitting things. Sliding and rolling
// make the runner low, so he can go under things that would hit him standing up.
const STANDING_HEIGHT = 1.8;
const LOW_HEIGHT = 0.7;
```

Things to notice:

- **`MOVES` is a list of names, one at a time.** The runner is always doing exactly one thing. That's the idea behind a *state machine*: instead of a pile of flags (`isJumping`, `isSliding`, ...) that could contradict each other, one value says what's going on, and each move says which other moves it may start from.
- **Gravity and the jump are numbers you can feel.** The jump leaves the ground at `JUMP_SPEED` and gravity slows it at `GRAVITY`. At 9.8 and 32, the runner rises about 1.5 units (a little under his own height) and is back down after about 0.6 seconds. Change them in the experiments to feel the difference.
- **Two heights.** `STANDING_HEIGHT` and `LOW_HEIGHT` are how tall the runner counts as when something might hit him. A slide and a roll make him low, so he can go under something that would hit him standing.

### 1b. More state

At the end of the constructor, after `this.running = true;`, add:

```js
    this.y = 0; // how high above the ground; 0 unless it is jumping
    this.vy = 0; // how fast it is rising (positive) or falling (negative)
    this.move = MOVES.run; // what it is doing
    this.moveTime = 0; // how long it has been doing it, in seconds
    this.diving = false; // true if it dived in the air, so it rolls when it lands
```

- **`y` and `vy`** are how high he is and how fast he's going up (positive) or down. Both are 0 on the ground.
- **`move` and `moveTime`** say what he is doing and for how long.
- **`diving`** remembers that the runner dived in the air, so that he rolls when he lands.

### 1c. Starting a move

Add these methods below `moveLane`:

```js
  // Jumps, if it is on the ground and not rolling. Jumping out of a slide is
  // allowed. Does nothing in the air, so there is no jumping twice.
  jump() {
    if (this.move !== MOVES.run && this.move !== MOVES.slide) return;
    this.vy = JUMP_SPEED;
    this._begin(MOVES.jump);
  }

  // Slides, if it is running. In the air it does something else: it dives,
  // dropping fast, and will roll when it lands. While sliding or rolling already,
  // it does nothing.
  slide() {
    if (this.move === MOVES.run) {
      this._begin(MOVES.slide);
    } else if (this.move === MOVES.jump && !this.diving) {
      this.vy = -DIVE_SPEED;
      this.diving = true;
    }
  }

  // Starts a new move, and the clock for it.
  _begin(move) {
    this.move = move;
    this.moveTime = 0;
  }
```

Things to notice:

- **Each move checks where it may start from.** `jump` works while running or sliding, so a slide can be cancelled with a jump, and does nothing in the air, so there's **no double jump**, and nothing during a roll. `slide` works only while running.
- **The same key does two things.** On the ground `slide` slides. In the air it **dives**: it sets the speed straight down, `-DIVE_SPEED`, and remembers it. A dive can only happen once per jump (`!this.diving`).
- **`_begin` starts a move and its clock** so every move starts counting its time from 0.

### 1d. Height and time left

```js
  // How tall the runner is right now, for hitting things: low while sliding or
  // rolling, standing the rest of the time.
  get bodyHeight() {
    return this.move === MOVES.slide || this.move === MOVES.roll ? LOW_HEIGHT : STANDING_HEIGHT;
  }

  // How many seconds are left of a slide or a roll, and 0 for any other move.
  get timeLeft() {
    if (this.move === MOVES.slide) return Math.max(0, SLIDE_TIME - this.moveTime);
    if (this.move === MOVES.roll) return Math.max(0, ROLL_TIME - this.moveTime);
    return 0;
  }
```

These are *getters*: properties computed each time you read them. `runner.bodyHeight` is what obstacles will ask next step, and `runner.timeLeft` is how long a slide or roll has to go, which the animation uses to start the slide's last clip.

### 1e. Moving

Replace the `update` method with this, which also adds `_land` below it:

```js
  // Moves for dt seconds: slides toward the chosen lane, goes up and down if it is
  // in the air, finishes a slide or a roll that has run its time, and, while
  // running, goes forward. The runner stops at the end of the street.
  update(dt) {
    const before = this.x;
    this.x = approach(this.x, laneX(this.lane), this.laneRate, dt);
    this.vx = dt > 0 ? (this.x - before) / dt : 0;

    this.moveTime += dt;
    if (this.move === MOVES.jump) {
      // The exact distance gravity gives over dt, not an approximation, so a jump
      // is the same height and length at any frame rate.
      this.y += this.vy * dt - 0.5 * GRAVITY * dt * dt;
      this.vy -= GRAVITY * dt;
      if (this.y <= 0) this._land();
    } else if (this.move === MOVES.slide && this.moveTime >= SLIDE_TIME) {
      this._begin(MOVES.run);
    } else if (this.move === MOVES.roll && this.moveTime >= ROLL_TIME) {
      this._begin(MOVES.run);
    }

    if (!this.running) return;
    this.z = Math.min(this.endZ, this.z + this.speed * dt);
    if (this.z >= this.endZ) this.running = false;
  }

  // Back on the ground: a roll if it dived, otherwise just running again.
  _land() {
    this.y = 0;
    this.vy = 0;
    this._begin(this.diving ? MOVES.roll : MOVES.run);
    this.diving = false;
  }
```

Things to notice:

- **The exact motion under gravity.** In the air, the new height is `vy × dt − ½ × g × dt²`, and the new speed is `vy − g × dt`. Those are the *exact* formulas for a constant gravity, so a jump has the same height and length whether the game runs at 30 frames a second or 144. The common shortcut (`vy -= g * dt; y += vy * dt`) is only an approximation, and it makes jumps visibly longer on slow computers. The tests check this.
- **Timed moves end by themselves.** A slide or roll ends when `moveTime` reaches its time.
- **Landing.** When the height reaches 0 the runner is back on the ground, rolling if he dived and running otherwise. Landing clears the dive.
- **Forward and sideways are untouched.** Lane changes and running forward work in every move, in the air or sliding or rolling.

### 1f. Starting again

Replace `reset` with:

```js
  // Back to the start: the starting lane and place, running again.
  reset() {
    this.lane = this.startLane;
    this.x = laneX(this.startLane);
    this.vx = 0;
    this.z = this.startZ;
    this.running = true;
    this.y = 0;
    this.vy = 0;
    this.diving = false;
    this._begin(MOVES.run);
  }
```

and replace the export block at the bottom with:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, MOVES, GRAVITY, JUMP_SPEED, DIVE_SPEED, SLIDE_TIME, ROLL_TIME, STANDING_HEIGHT, LOW_HEIGHT, laneX, approach, Runner };
} else {
  Object.assign(window, { LANE_WIDTH, MAX_LANE, LANE_CHANGE_RATE, RUN_SPEED, MOVES, GRAVITY, JUMP_SPEED, DIVE_SPEED, SLIDE_TIME, ROLL_TIME, STANDING_HEIGHT, LOW_HEIGHT, laneX, approach, Runner });
}
```

### 1g. Tests

Add these to the **end** of `tests/runner.tests.js`. They use the `assertNear` helper that is already at the top of the file:

```js
QUnit.module("Runner moves", () => {
  // Runs the runner for `seconds`, in small steps like frames.
  const run = (runner, seconds) => {
    for (let t = 0; t < seconds - 1e-9; t += 1 / 60) runner.update(1 / 60);
  };

  QUnit.test("starts on the ground, running", (assert) => {
    const runner = new Runner();

    assert.strictEqual(runner.move, MOVES.run);
    assert.strictEqual(runner.y, 0);
    assert.strictEqual(runner.vy, 0);
    assert.strictEqual(runner.bodyHeight, STANDING_HEIGHT);
  });

  QUnit.test("jump() leaves the ground and goes up", (assert) => {
    const runner = new Runner();

    runner.jump();
    runner.update(1 / 60);

    assert.strictEqual(runner.move, MOVES.jump);
    assert.true(runner.y > 0);
    assert.true(runner.vy > 0, "still rising");
  });

  QUnit.test("a jump goes up and comes down again, in about 0.6 seconds", (assert) => {
    const runner = new Runner();
    runner.jump();
    let peak = 0;
    let airTime = 0;

    while (runner.move === MOVES.jump && airTime < 5) {
      runner.update(1 / 60);
      peak = Math.max(peak, runner.y);
      airTime += 1 / 60;
    }

    assertNear(assert, peak, (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY), 0.05, "the height physics gives");
    assertNear(assert, airTime, (2 * JUMP_SPEED) / GRAVITY, 0.05, "the time physics gives");
    assert.strictEqual(runner.y, 0, "back on the ground");
    assert.strictEqual(runner.move, MOVES.run, "and running again");
  });

  QUnit.test("a jump takes the same time at any frame rate", (assert) => {
    const fast = new Runner();
    const slow = new Runner();
    fast.jump();
    slow.jump();

    for (let i = 0; i < 20; i++) fast.update(0.01);
    for (let i = 0; i < 4; i++) slow.update(0.05);

    assertNear(assert, fast.y, slow.y, 0.02);
  });

  QUnit.test("there is no jumping in the air", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.2);
    const vy = runner.vy;

    runner.jump();

    assert.strictEqual(runner.vy, vy, "the second jump did nothing");
  });

  QUnit.test("jump() while sliding jumps out of the slide", (assert) => {
    const runner = new Runner();
    runner.slide();
    run(runner, 0.2);

    runner.jump();

    assert.strictEqual(runner.move, MOVES.jump);
  });

  QUnit.test("jump() while rolling does nothing", (assert) => {
    const runner = new Runner();
    runner.jump();
    runner.slide();
    while (runner.move === MOVES.jump) runner.update(1 / 60);
    assert.strictEqual(runner.move, MOVES.roll);

    runner.jump();

    assert.strictEqual(runner.move, MOVES.roll);
  });

  QUnit.test("slide() on the ground starts a slide, and the runner is low", (assert) => {
    const runner = new Runner();

    runner.slide();

    assert.strictEqual(runner.move, MOVES.slide);
    assert.strictEqual(runner.bodyHeight, LOW_HEIGHT);
    assert.true(runner.bodyHeight < STANDING_HEIGHT);
  });

  QUnit.test("a slide ends by itself after SLIDE_TIME, and the runner stands up", (assert) => {
    const runner = new Runner();
    runner.slide();

    run(runner, SLIDE_TIME - 0.1);
    assert.strictEqual(runner.move, MOVES.slide, "still sliding just before the end");

    run(runner, 0.2);
    assert.strictEqual(runner.move, MOVES.run);
    assert.strictEqual(runner.bodyHeight, STANDING_HEIGHT);
  });

  QUnit.test("slide() while already sliding doesn't start it over", (assert) => {
    const runner = new Runner();
    runner.slide();
    run(runner, 0.5);

    runner.slide();

    assertNear(assert, runner.moveTime, 0.5, 0.05);
  });

  QUnit.test("slide() in the air is a dive: the runner is pushed down hard", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.1);

    runner.slide();

    assert.strictEqual(runner.vy, -DIVE_SPEED);
    assert.true(runner.diving);
    assert.strictEqual(runner.move, MOVES.jump, "it is still in the air until it lands");
  });

  QUnit.test("a dive gets to the ground much sooner than a plain jump", (assert) => {
    const plain = new Runner();
    const diver = new Runner();
    plain.jump();
    diver.jump();
    run(plain, 0.15);
    run(diver, 0.15);
    diver.slide();
    let plainTime = 0;
    let diveTime = 0;

    while (plain.move === MOVES.jump) {
      plain.update(1 / 60);
      plainTime += 1 / 60;
    }
    while (diver.move === MOVES.jump) {
      diver.update(1 / 60);
      diveTime += 1 / 60;
    }

    assert.true(diveTime < plainTime / 2, `${diveTime} against ${plainTime}`);
  });

  QUnit.test("a runner that dived rolls when it lands", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.1);
    runner.slide();

    while (runner.move === MOVES.jump) runner.update(1 / 60);

    assert.strictEqual(runner.move, MOVES.roll);
    assert.strictEqual(runner.y, 0);
    assert.false(runner.diving, "the dive is over");
    assert.strictEqual(runner.bodyHeight, LOW_HEIGHT, "low while rolling");
  });

  QUnit.test("a runner that didn't dive just runs on when it lands", (assert) => {
    const runner = new Runner();
    runner.jump();

    while (runner.move === MOVES.jump) runner.update(1 / 60);

    assert.strictEqual(runner.move, MOVES.run);
  });

  QUnit.test("a roll ends by itself after ROLL_TIME", (assert) => {
    const runner = new Runner();
    runner.jump();
    runner.slide();
    while (runner.move === MOVES.jump) runner.update(1 / 60);

    run(runner, ROLL_TIME + 0.1);

    assert.strictEqual(runner.move, MOVES.run);
  });

  QUnit.test("a second dive in the same jump does nothing", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.1);
    runner.slide();
    run(runner, 0.02);
    const vy = runner.vy;

    runner.slide();

    assert.strictEqual(runner.vy, vy);
  });

  QUnit.test("slide() while rolling does nothing", (assert) => {
    const runner = new Runner();
    runner.jump();
    runner.slide();
    while (runner.move === MOVES.jump) runner.update(1 / 60);

    runner.slide();

    assert.strictEqual(runner.move, MOVES.roll);
  });

  QUnit.test("timeLeft counts down a slide, and is 0 when not sliding or rolling", (assert) => {
    const runner = new Runner();
    assert.strictEqual(runner.timeLeft, 0, "running");

    runner.slide();
    assertNear(assert, runner.timeLeft, SLIDE_TIME, 1e-9);
    run(runner, 0.3);
    assertNear(assert, runner.timeLeft, SLIDE_TIME - 0.3, 0.05);

    runner.jump();
    assert.strictEqual(runner.timeLeft, 0, "jumping");
  });

  QUnit.test("sliding doesn't change the speed along the street", (assert) => {
    const runner = new Runner({ speed: 10 });
    runner.slide();

    runner.update(0.5);

    assert.strictEqual(runner.z, 5);
  });

  QUnit.test("the runner can still change lanes in the air", (assert) => {
    const runner = new Runner();
    runner.jump();
    runner.moveLane(1);

    run(runner, 0.3);

    assert.true(runner.x > 0.5);
  });

  QUnit.test("reset() puts the runner back on the ground, running", (assert) => {
    const runner = new Runner();
    runner.jump();
    run(runner, 0.2);
    runner.slide();

    runner.reset();

    assert.strictEqual(runner.y, 0);
    assert.strictEqual(runner.vy, 0);
    assert.strictEqual(runner.move, MOVES.run);
    assert.false(runner.diving);
    assert.strictEqual(runner.moveTime, 0);
  });
});
```

Reload `tests.html`: **21 more** tests (**154** in all), all green. Look at *"a jump takes the same time at any frame rate"*, which runs the same jump in 20 steps of 10 ms and in 4 steps of 50 ms and checks they agree, and *"a dive gets to the ground much sooner than a plain jump"*.

---

## Step 2: A clip for each move

Choosing a clip is a decision from plain state, and now it's a richer decision: which clip, how fast, and whether to loop. In `js/clips.js`, replace the table of clips and `clipFor` (everything from the comment `// The clips this sample uses` down to the end of `clipFor`, just above `class ClipPlayer`) with:

```js
// The clips this sample uses, by what the runner is doing.
const CLIPS = {
  idle: "Idle_Loop",
  run: "Sprint_Loop",
  jump: "Jump_Start",
  slideStart: "Slide_Start",
  slideExit: "Slide_Exit",
  roll: "Roll",
};

// The clips were recorded slower than a game wants a jump or a roll to last. A
// speed of 2 plays a clip in half the time, so it ends about when the move does.
const JUMP_CLIP_SPEED = 2.2; // the jump clip is 1.33 seconds; the jump in the air is about 0.6
const SLIDE_START_CLIP_SPEED = 2.2; // down into the slide in about 0.4 seconds
const SLIDE_EXIT_CLIP_SPEED = 1.7; // and back up in about 0.3
const SLIDE_EXIT_TIME = 0.3; // so the exit clip starts when this many seconds of the slide are left
const ROLL_CLIP_SPEED = 2.2; // the roll clip is 1.47 seconds, but its last third is a slow stand-up, so the roll is cut short (0.55) and the sprint takes over

// The slide clip lowers the character until his hand and arm dip a few
// centimeters into the street (about 4 in the held pose, and up to 8 on the way
// down). Raising the whole model while he slides keeps them out. (The street's top
// is at y = 0, so this only has to cover what the pose dips below it.)
const SLIDE_LIFT = 0.05;

// How far to raise the character above where the runner is, for the move he is
// doing. main.js eases toward it, so the model glides up and down instead of hopping.
function liftFor(runner) {
  return runner.move === MOVES.slide ? SLIDE_LIFT : 0;
}

// The clip for a runner: { name, loop, speed }. Moves play once, at the speed that
// fits them; running and standing loop. A slide is two clips: down into the
// slide, which then holds its last pose, and up out of it at the end.
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

Things to notice:

- **`clipFor` now returns a description:** `{ name, loop, speed }`, not just a name.
- **Moves play once.** `loop: false` means the clip plays through and then **holds its last pose**. That's what the slide wants: the slide-down clip ends in the low pose, and the character stays there.
- **Speed fits the clip to the move.** The jump clip is 1.33 seconds long but the jump in the air lasts about 0.6, so it's played at 2.2 times speed. The roll clip is 1.47 seconds, but the last third of it is a slow stand-up that a runner who keeps running doesn't want. So the roll lasts 0.55 seconds and the clip is played at 2.2 times speed, which hands over to the sprint just as he is back at running height. (An earlier version let the whole clip play, and the runner stood still for a moment before running again.) If you change a move's time in `runner.js`, these are the numbers that follow.
- **A slide is two clips.** While more than `SLIDE_EXIT_TIME` of the slide is left it plays `Slide_Start`, which drops into the slide and holds. For the last 0.3 seconds, the runner's `timeLeft` runs low enough to switch to `Slide_Exit`, which gets back up in time for the end of the slide.
- **A `switch` on the move,** with the old rule (sprint or stand) as the default.
- **`liftFor` keeps his hand out of the ground.** The slide clip drops the character very low, and his hand and arm dip a few centimeters into the street (the lowest point of the skinned model is about 4 cm below the ground in the held pose, and 8 cm on the way down). It's a fault in how the clip meets a flat floor, not a bug in the code, and the usual fix is to raise the whole model by about that much while the clip plays. `SLIDE_LIFT` is 5 cm, enough to clear the held pose (the dip is a little deeper for a moment on the way down). The top of the street is at y = 0, because the World tutorial drew the road tiles sunk by their thickness, so the lift only has to cover what the pose dips, not the road too. `liftFor` says when to apply it. `main.js` eases toward it in Step 4, so the model glides up instead of hopping.

Now `ClipPlayer` has to pass the loop and speed on. Replace its `play` method with:

```js
  // Plays the named clip and stops whichever was playing. `loop` says whether it
  // repeats or plays once and holds its last pose, and `speed` how fast (1 is as
  // recorded). Asking for the clip that is already playing does nothing, so it is
  // safe to call every frame.
  play(name, { loop = true, speed = 1 } = {}) {
    if (name === this.current) return;
    const next = this.clips.get(name);
    if (!next) throw new Error(`The character has no clip called "${name}"`);

    if (this.current) this.clips.get(this.current).stop();
    next.start(loop, speed);
    this.current = name;
  }

  // Stops whichever clip is playing.
  stop() {
    if (this.current) this.clips.get(this.current).stop();
    this.current = null;
  }
```

and replace the export block with:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLIPS, SLIDE_EXIT_TIME, SLIDE_LIFT, clipFor, liftFor, ClipPlayer };
} else {
  Object.assign(window, { CLIPS, SLIDE_EXIT_TIME, SLIDE_LIFT, clipFor, liftFor, ClipPlayer });
}
```

(`SLIDE_EXIT_TIME` is exported because the tests use it.)

Animation groups take both in `start(loop, speed)`: the first argument is whether to repeat and the second is the speed, with 1 as recorded.

### A quicker blend

The clips start by *blending* from the pose the character is in, so a change of clip doesn't snap. Moves are quick, so make the blend quicker. In `js/models.js`, change:

```js
const CLIP_BLEND_SPEED = 0.08;
```

to:

```js
const CLIP_BLEND_SPEED = 0.15;
```

Babylon.js counts blending in frames, not seconds: the new clip's share grows by this much every frame until it reaches 1, so 0.15 takes about 7 frames, a ninth of a second at 60 frames a second.

### Tests

The tests for the clips change a good deal, because `clipFor` returns more and `play` takes more. Replace the whole of `tests/clips.tests.js` with:

```js
QUnit.module("clipFor", () => {
  // The part of a runner that choosing a clip looks at.
  const doing = (move, extra = {}) => ({ running: true, move, timeLeft: 0, ...extra });

  QUnit.test("a runner that is running sprints, looping", (assert) => {
    const clip = clipFor(doing(MOVES.run));

    assert.strictEqual(clip.name, CLIPS.run);
    assert.true(clip.loop);
    assert.strictEqual(clip.speed, 1);
  });

  QUnit.test("a runner that has stopped stands, looping", (assert) => {
    const clip = clipFor(doing(MOVES.run, { running: false }));

    assert.strictEqual(clip.name, CLIPS.idle);
    assert.true(clip.loop);
  });

  QUnit.test("a jump plays the jump clip once, sped up to fit the jump", (assert) => {
    const clip = clipFor(doing(MOVES.jump));

    assert.strictEqual(clip.name, CLIPS.jump);
    assert.false(clip.loop);
    assert.true(clip.speed > 1);
  });

  QUnit.test("a slide starts by going down into it", (assert) => {
    const clip = clipFor(doing(MOVES.slide, { timeLeft: 0.8 }));

    assert.strictEqual(clip.name, CLIPS.slideStart);
    assert.false(clip.loop);
  });

  QUnit.test("a slide ends by coming back up, for the last SLIDE_EXIT_TIME", (assert) => {
    assert.strictEqual(clipFor(doing(MOVES.slide, { timeLeft: SLIDE_EXIT_TIME + 0.01 })).name, CLIPS.slideStart);
    assert.strictEqual(clipFor(doing(MOVES.slide, { timeLeft: SLIDE_EXIT_TIME })).name, CLIPS.slideExit);
    assert.strictEqual(clipFor(doing(MOVES.slide, { timeLeft: 0.05 })).name, CLIPS.slideExit);
  });

  QUnit.test("a roll plays the roll clip once, sped up", (assert) => {
    const clip = clipFor(doing(MOVES.roll));

    assert.strictEqual(clip.name, CLIPS.roll);
    assert.false(clip.loop);
    assert.true(clip.speed > 1);
  });

  QUnit.test("every clip it can choose is one the character file has", (assert) => {
    const inFile = ["Idle_Loop", "Sprint_Loop", "Jump_Start", "Slide_Start", "Slide_Exit", "Roll"];

    for (const name of Object.values(CLIPS)) assert.true(inFile.includes(name), name);
  });

  QUnit.test("works with a real Runner too", (assert) => {
    const runner = new Runner();

    assert.strictEqual(clipFor(runner).name, CLIPS.run);
    runner.jump();
    assert.strictEqual(clipFor(runner).name, CLIPS.jump);
  });
});

QUnit.module("ClipPlayer", () => {
  // A stand-in for an animation group: it only remembers what it was told.
  class FakeClip {
    constructor() {
      this.playing = false;
      this.looping = null;
      this.speed = null;
      this.starts = 0;
      this.stops = 0;
    }
    start(loop, speed) {
      this.playing = true;
      this.looping = loop;
      this.speed = speed;
      this.starts++;
    }
    stop() {
      this.playing = false;
      this.stops++;
    }
  }

  const makePlayer = () => {
    const clips = new Map([
      ["Idle_Loop", new FakeClip()],
      ["Sprint_Loop", new FakeClip()],
      ["Roll", new FakeClip()],
    ]);
    return { clips, player: new ClipPlayer(clips) };
  };

  QUnit.test("nothing is playing to begin with", (assert) => {
    const { clips, player } = makePlayer();

    assert.strictEqual(player.current, null);
    assert.false(clips.get("Idle_Loop").playing);
  });

  QUnit.test("play() starts the named clip, looping at normal speed by default", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Idle_Loop");

    assert.true(clips.get("Idle_Loop").playing);
    assert.true(clips.get("Idle_Loop").looping);
    assert.strictEqual(clips.get("Idle_Loop").speed, 1);
    assert.strictEqual(player.current, "Idle_Loop");
  });

  QUnit.test("play() can play a clip once, at another speed", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Roll", { loop: false, speed: 2 });

    assert.false(clips.get("Roll").looping);
    assert.strictEqual(clips.get("Roll").speed, 2);
  });

  QUnit.test("play() takes the whole object clipFor() returns", (assert) => {
    const { clips, player } = makePlayer();
    const clip = { name: "Roll", loop: false, speed: 2 };

    player.play(clip.name, clip);

    assert.false(clips.get("Roll").looping);
    assert.strictEqual(clips.get("Roll").speed, 2);
  });

  QUnit.test("play() stops the clip that was playing", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Idle_Loop");

    player.play("Sprint_Loop");

    assert.false(clips.get("Idle_Loop").playing);
    assert.true(clips.get("Sprint_Loop").playing);
    assert.strictEqual(player.current, "Sprint_Loop");
  });

  QUnit.test("asking for the clip that is already playing does nothing", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop");

    player.play("Sprint_Loop");
    player.play("Sprint_Loop");

    assert.strictEqual(clips.get("Sprint_Loop").starts, 1, "started once, not restarted every frame");
    assert.strictEqual(clips.get("Sprint_Loop").stops, 0);
  });

  QUnit.test("can switch back and forth, and a clip starts from the beginning each time", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Idle_Loop");
    player.play("Roll", { loop: false });
    player.play("Idle_Loop");

    assert.true(clips.get("Idle_Loop").playing);
    assert.false(clips.get("Roll").playing);
    assert.strictEqual(clips.get("Idle_Loop").starts, 2);
  });

  QUnit.test("play() refuses a clip the character doesn't have, and leaves the current one alone", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Idle_Loop");

    assert.throws(() => player.play("Backflip"), /no clip called "Backflip"/);

    assert.true(clips.get("Idle_Loop").playing);
    assert.strictEqual(player.current, "Idle_Loop");
  });

  QUnit.test("stop() stops whatever is playing, and the next play() starts it again", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop");

    player.stop();

    assert.false(clips.get("Sprint_Loop").playing);
    assert.strictEqual(player.current, null);

    player.play("Sprint_Loop");
    assert.true(clips.get("Sprint_Loop").playing);
  });

  QUnit.test("stop() with nothing playing is harmless", (assert) => {
    const { player } = makePlayer();

    player.stop();

    assert.strictEqual(player.current, null);
  });
});

QUnit.module("liftFor", () => {
  QUnit.test("a runner that is sliding is lifted a little, so his hand stays out of the ground", (assert) => {
    assert.strictEqual(liftFor({ move: MOVES.slide }), SLIDE_LIFT);
    assert.true(SLIDE_LIFT > 0);
  });

  QUnit.test("the lift is small: the model doesn't float", (assert) => {
    assert.true(SLIDE_LIFT < 0.2);
  });

  QUnit.test("every other move has no lift", (assert) => {
    for (const move of [MOVES.run, MOVES.jump, MOVES.roll]) assert.strictEqual(liftFor({ move }), 0, move);
  });
});
```

Reload `tests.html`: **10 more** tests (**164** in all), all green.

---

## Step 3: A camera that rises a little

When the runner jumps 1.5 units the camera should go with him a little, but not all the way: a camera that copies every jump makes the whole picture bob, and the runner would appear to stand still in the middle of it. Replace the whole of `js/camera.js` with:

```js
// Where the camera goes to follow the runner: behind it and a little above,
// looking down the street. Plain numbers (no Babylon.js), so it is easy to
// test; main.js moves the camera there each frame. See ../tests/camera.tests.js.

const CAMERA_DISTANCE = 6.5; // how far behind the runner the camera is
const CAMERA_HEIGHT = 2.8; // how high above the ground
const CAMERA_FOLLOW_X = 0.6; // how much of the runner's sideways move the camera copies
const CAMERA_FOLLOW_Y = 0.4; // how much of a jump the camera copies

// The camera's position for a runner at (x, y, z) in the street. The camera copies
// only part of the runner's sideways movement, so changing lanes moves the
// runner across the picture instead of dragging the whole street along with it,
// and only part of a jump, so the runner rises in the picture but the camera
// doesn't bob up and down with every jump.
function followPosition(runner, { distance = CAMERA_DISTANCE, height = CAMERA_HEIGHT, followX = CAMERA_FOLLOW_X, followY = CAMERA_FOLLOW_Y } = {}) {
  return { x: runner.x * followX, y: height + runner.y * followY, z: runner.z - distance };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_FOLLOW_X, CAMERA_FOLLOW_Y, followPosition };
} else {
  Object.assign(window, { CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_FOLLOW_X, CAMERA_FOLLOW_Y, followPosition });
}
```

It's the sideways idea from the last step again, now for height. The camera copies `CAMERA_FOLLOW_Y`, 0.4, of the runner's height, so a 1.5-unit jump lifts the camera 0.6 units and the runner rises in the picture by the rest.

The tests change too, because the runner passed to `followPosition` has a height now. Replace the whole of `tests/camera.tests.js` with:

```js
QUnit.module("followPosition", () => {
  // A runner, as far as the camera cares: where it is.
  const at = (x, y, z) => ({ x, y, z });

  QUnit.test("is behind the runner by the camera distance, so it looks down the street at it", (assert) => {
    const view = followPosition(at(0, 0, 50), { distance: 6, height: 3 });

    assert.strictEqual(view.z, 44);
  });

  QUnit.test("is above the ground by the camera height", (assert) => {
    const view = followPosition(at(0, 0, 0), { distance: 6, height: 3 });

    assert.strictEqual(view.y, 3);
  });

  QUnit.test("follows the runner along the street", (assert) => {
    const near = followPosition(at(0, 0, 10));
    const far = followPosition(at(0, 0, 110));

    assert.strictEqual(far.z - near.z, 100);
  });

  QUnit.test("copies only part of the runner's sideways position", (assert) => {
    const view = followPosition(at(2, 0, 0), { followX: 0.5 });

    assert.strictEqual(view.x, 1);
  });

  QUnit.test("with a follow of 0 the camera stays in the middle, and with 1 it goes where the runner goes", (assert) => {
    assert.strictEqual(followPosition(at(3, 0, 0), { followX: 0 }).x, 0);
    assert.strictEqual(followPosition(at(3, 0, 0), { followX: 1 }).x, 3);
  });

  QUnit.test("goes the same way as the runner, left or right", (assert) => {
    assert.true(followPosition(at(-2, 0, 0)).x < 0);
    assert.true(followPosition(at(2, 0, 0)).x > 0);
  });

  QUnit.test("rises with the runner when it jumps, but by less", (assert) => {
    const ground = followPosition(at(0, 0, 0), { height: 3, followY: 0.4 });
    const jumping = followPosition(at(0, 1.5, 0), { height: 3, followY: 0.4 });

    assert.true(jumping.y > ground.y, "it goes up");
    assert.true(jumping.y - ground.y < 1.5, "but not as far as the runner");
    assert.true(Math.abs(jumping.y - ground.y - 0.6) < 1e-9, "by the follow share of the jump");
  });

  QUnit.test("with a vertical follow of 0 the camera doesn't bob at all", (assert) => {
    assert.strictEqual(followPosition(at(0, 2, 0), { height: 3, followY: 0 }).y, 3);
  });

  QUnit.test("uses the standard distance, height and follow when none are given", (assert) => {
    const view = followPosition(at(1, 1, 20));

    assert.strictEqual(view.x, CAMERA_FOLLOW_X);
    assert.strictEqual(view.y, CAMERA_HEIGHT + CAMERA_FOLLOW_Y);
    assert.strictEqual(view.z, 20 - CAMERA_DISTANCE);
  });
});
```

Reload `tests.html`: **2 more** tests (**166** in all), all green.

---

## Step 4: Wire it together

`main.js` needs three changes: the keys, the character's height, and the clips.

### 4a. `index.html`

Replace the `.hint` line (don't delete it) with one that lists the new keys:

```html
  <div class="hint">&larr;/&rarr; (A/D) lanes &middot; &uarr; (W/Space) jump &middot; &darr; (S) slide, or dive in the air &middot; R restart &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```

### 4b. `js/main.js`

**1. Keys.** In `createScene`, add these two lines directly below the `RIGHT_KEYS` line:

```js
  const JUMP_KEYS = new Set(["ArrowUp", "KeyW", "Space"]);
  const SLIDE_KEYS = new Set(["ArrowDown", "KeyS"]);
```

**2. The handler.** In the `keydown` handler, replace these lines:

```js
    const isLane = LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code);
    if (!isLane) return;
    event.preventDefault(); // arrow keys otherwise scroll the page
    if (event.repeat) return; // one lane per press; holding the key doesn't skate across
    runner.moveLane(LEFT_KEYS.has(event.code) ? -1 : 1);
```

with:

```js
    const isControl = [LEFT_KEYS, RIGHT_KEYS, JUMP_KEYS, SLIDE_KEYS].some((keys) => keys.has(event.code));
    if (!isControl) return;
    event.preventDefault(); // arrow keys and the space bar otherwise scroll the page
    if (event.repeat) return; // one move per press; holding the key doesn't repeat it

    if (LEFT_KEYS.has(event.code)) runner.moveLane(-1);
    else if (RIGHT_KEYS.has(event.code)) runner.moveLane(1);
    else if (JUMP_KEYS.has(event.code)) runner.jump();
    else runner.slide();
```

**3. The lift.** Add a constant below `RUNNER_START_Z` at the top of the file, and a variable below the line that creates the runner:

```js
const LIFT_RATE = 14; // how quickly the model eases up and down for a slide; bigger is snappier
```

```js
  let lift = 0; // how far the model is raised above the runner right now
```

**4. The frame loop.** In the frame loop, replace these lines:

```js
    // Put the character where the runner is, turned a little into a lane change.
    character.root.position.set(runner.x, 0, runner.z);
    character.root.rotation.y = runner.heading;
    clips.play(clipFor(runner));
```

with:

```js
    // Put the character where the runner is, turned a little into a lane change,
    // and playing the clip for what it is doing.
    lift = approach(lift, liftFor(runner), LIFT_RATE, dt);
    character.root.position.set(runner.x, runner.y + lift, runner.z);
    character.root.rotation.y = runner.heading;
    const clip = clipFor(runner);
    clips.play(clip.name, clip);
```

Things to notice:

- **One more key is `Space`.** The very first sample in this series already moved the screenshot shortcut to **C**, for exactly this.
- **`preventDefault` matters more now:** the space bar and the down arrow scroll a page.
- **The character's height is `runner.y` plus the lift.** The game moves the node up and down; the clips don't (they play in place). `approach` (the easing function from the Runner tutorial) moves `lift` toward what `liftFor` asks for, a little each frame, so the model rises as the slide starts and settles back as it ends.
- **`clips.play(clip.name, clip)`** passes the whole description from `clipFor` on. Because `play` ignores a request for the clip that is already playing, calling it every frame is still fine, and a move's clip plays **once**: it isn't restarted each frame.
- **Moves don't need any of the other code to change:** the street, the camera, lane changes and restarting all work as before.

---

## Step 5: Try it

Serve the page and open it.

- [ ] The **controls hint** lists lanes, jump, slide and restart
- [ ] **↑**, **W** or **Space** makes the runner **jump**: he rises, tucks his legs, and lands about a second later, still running
- [ ] The camera rises a little with the jump
- [ ] **↓** or **S** makes him **slide**: he drops low, stays low for most of a second, and gets up. His hand doesn't dip into the street
- [ ] Pressing jump during a slide jumps out of it
- [ ] **No double jump:** jump in the air does nothing
- [ ] **↓** or **S in the air** dives: he drops fast and lands in a **roll**, which lasts about half a second, and flows straight back into the run
- [ ] Lane changes still work in every move, including mid-jump
- [ ] **Holding** a key does the move once
- [ ] **R** restarts, back to running on the ground
- [ ] Nothing scrolls the page

**If something's wrong**

- **Jump does nothing:** check `JUMP_KEYS` and that `runner.jump()` is called. The page may be scrolling instead: the `preventDefault` line must come before the early returns.
- **The runner rises but his legs keep running, or he stays in the sprint pose in a slide:** the clip isn't being played. Check `clips.play(clip.name, clip)`, and the clip names in `CLIPS` (`Jump_Start`, `Slide_Start`, `Slide_Exit`, `Roll`).
- **The runner doesn't come back down:** check the `update` in `runner.js`: while jumping it must change `y` and `vy`, and call `_land` when `y` reaches 0.
- **The jump is far too floaty, or far too short:** `GRAVITY` and `JUMP_SPEED` are the two numbers.
- **The slide never ends, or the runner stays low forever:** `moveTime` isn't counting up (`this.moveTime += dt`), or the end-of-slide branch is missing.
- **The runner stays in a crouch after a slide:** `timeLeft` isn't reaching `SLIDE_EXIT_TIME`, or `Slide_Exit` is missing from the clips.
- **`MOVES is not defined` in `clips.js`:** `runner.js` has to come before `clips.js` in `index.html`, and be loaded.
- **The tests for the clips fail:** you've changed `clips.js` but not replaced `tests/clips.tests.js`, or the other way round.

**Experiments** (change one, reload, then change it back):

- `JUMP_SPEED` of `14`: a much higher jump (and, for the clip, a much longer one)
- `GRAVITY` of `15`: a floaty, moon-like jump. The jump clip no longer fits, because the clip is sped up for a 0.6-second jump
- `SLIDE_TIME` of `2`: a long slide. The clip holds its pose, and the exit starts for the last 0.3 seconds
- `DIVE_SPEED` of `30`: a much sharper dive
- `CAMERA_FOLLOW_Y` of `0`, then `1`: a camera that never bobs, then one that follows every inch
- `SLIDE_LIFT` of `0`: the hand dips into the street again. Try `0.3` for a slide that floats
- `LOW_HEIGHT` doesn't show anything yet. In the next step, it decides what the runner can slide under

---

## Step 6: Tests, all together

Your `tests.html` should be unchanged from the start of this step: the same scripts, no new files. Open it. You should see **166 passing tests**: the 133 you started with, plus 21 for the moves, 10 for the clips and 2 for the camera.

> **What these tests don't cover.** They check the logic and the calls the code makes, using stand-ins for Babylon.js. They can't tell you a jump *feels* right, or that a slide looks like a slide. That check is Step 5, with your own eyes. It's a good example of why a test suite and a play-through are different things.

> **Try breaking something.** In `Runner.update`, change the exact line `this.y += this.vy * dt - 0.5 * GRAVITY * dt * dt;` to `this.y += this.vy * dt;`, reload `tests.html`, and see which test notices. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| One value for what the runner is doing | `MOVES`, `Runner.move` |
| Each move says where it can start from | `jump`, `slide` |
| One key, two meanings by context | `slide()` on the ground and in the air |
| The exact motion under gravity | `Runner.update` |
| Timed moves that end themselves | `moveTime`, `SLIDE_TIME`, `ROLL_TIME` |
| A size that depends on the move | `bodyHeight` |
| Animation chosen from state: clip, loop, speed | `clipFor`, `ClipPlayer.play` |
| A camera that follows part of a jump | `followPosition`, `CAMERA_FOLLOW_Y` |

## Challenges

1. **A variable-height jump.** Let the player cut a jump short by letting go of the key early. (Hint: listen for `keyup`; while rising, if the key has been released, reduce `vy`.)
2. **Coyote time.** Let the player jump for a few hundredths of a second after leaving the ground. (Hint: there's nothing to leave yet, since the street has no gaps, but you can build the timer now: count the time since the runner was last on the ground.)
3. **Input buffering.** If the player presses jump a moment *before* landing, jump the instant they land. (Hint: remember a pressed jump for 0.1 seconds, and check for it in `_land`.)
4. **A landing animation.** Play `Jump_Land` as the runner lands from a jump. (Hint: it's already in the file, and it's 1.27 seconds long, so it needs speeding up.)
5. **Slide under the camera?** The camera sits 2.8 units up and 6.5 behind. Where does it end up in a slide, and does the runner stay in view? Try a different `CAMERA_HEIGHT`.

---
