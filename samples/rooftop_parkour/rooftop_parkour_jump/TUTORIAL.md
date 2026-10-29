# Tutorial: Rooftop Parkour Jump -- Jumping That Feels Fair

This is the third tutorial of the Rooftop Parkour series. The runner of the last step has a body that falls, lands and stands on roofs, but it can't jump. In this step it can. **Space** jumps, and a jump is higher for as long as the key is held. But the interesting part of a jump is not the arithmetic, it is how it **feels**: a player who runs off an edge and presses jump a moment too late has still, to their mind, jumped from the edge, and a player who presses jump a moment before landing has still, to their mind, jumped when they landed. A game that is exact about those moments feels broken. A game that is a little kind about them feels fair. You also give the runner a **roll**, to take the sting out of a long fall. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **jump** in the controller: a speed upwards that gravity takes away, and **variable height**: let go of the key early and the jump is cut short
- **Coyote time**: a jump that still works for a moment after running off an edge
- A **jump buffer**: a jump that is pressed a moment too early is remembered, and happens as soon as it can
- A **roll**: a runner who lands a long fall while going somewhere rolls out of it, and is not hurt
- The **arithmetic of a jump**, as two functions, `jumpHeight` and `jumpDistance`, that say how high and how far a jump goes, tested against jumps that are really made, and a test that a gap of a given width **can or can't be jumped**, which is what the levels of the later steps will be built from
- **Clips** for all of it: a jump clip on the way up, the falling clip on the way down, and a roll clip
- More in the **developer panel**: sliders for the jump, the cut, the coyote time and the buffer, and read-outs of how high and how far a jump goes
- Unit tests for all of it

**What you'll learn:** how a jump is a speed and gravity, how to work out how high and how far it goes, why a jump that is exact feels bad and what coyote time and a jump buffer do about it, how to cut a jump short, how to tell a key that went *down* from a key that *is* down, a roll as a state with a time, and how to test the feel of a jump with numbers.

## Where you're starting

This folder is a copy of the finished Run sample. There are no new files in this step: the jump goes into the files that are there.

```
rooftop_parkour_jump/
├── index.html, tests.html   (already list every script)
├── css/                     (from the Run sample)
├── js/
│   ├── controller.js       (changes -- Steps 1 and 2)
│   ├── character.js        (changes -- Step 3)
│   ├── scout.js            (changes -- Step 4)
│   ├── main.js             (changes -- Step 4)
│   └── the rest            (from the Run sample)
└── tests/
    ├── controller.tests.js, character.tests.js, scout.tests.js   (grow)
    └── the rest            (from the Run sample)
```

### Serving the page

As before, the models can't be loaded from a page opened from a file, so run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rooftop_parkour/rooftop_parkour_jump/` (the command prints the exact address), or use the *Live Server* extension in VS Code. Add `?dev` for the developer panel.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Run sample. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**284**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** This step changes code that is already there more than it adds new code. Where a step **replaces** something, **delete the old one**: a file with two functions of the same name runs the last. Each step leaves every file valid, and the tests passing.

> **Put the work in this sample's folder.** Everything goes in `rooftop_parkour_jump/`, **not** in the Run sample next door.

---

## What makes a jump feel fair?

A jump is simple: when the key goes down, give the body a speed upwards. Gravity, which you already have, takes the speed away and brings the body down. That is a jump that is exactly right, and one that, in a game with edges in it, feels wrong in three ways:

- **It is the same height every time.** A jump a little shorter, to land on something close, should be possible. So **a tap is a hop and holding the key is the whole jump.** If the key is let go on the way up, the speed up is cut.
- **It is not there when you were sure you pressed it.** A runner who runs off an edge is *already falling* on the next frame, and a jump that is only allowed on the ground is lost. So a jump is allowed for a moment after the feet leave the ground: **coyote time**. (After the cartoon coyote, who does not fall until he looks down.)
- **It is not there when you pressed it a moment early.** A key that goes down in the last tenth of a second of a fall is lost, because the runner was not on the ground yet. So a key that goes down is **remembered** for a moment, in a **jump buffer**, and used as soon as it can be.

These are tenths of a second, and they make the difference between a game that people say is *tight* and one they say is *slippery*. All of them are numbers, so all of them go in the table, and in the developer panel to be felt.

---

## Step 1: The numbers of a jump

A jump goes up at a speed, and gravity takes that speed away at 30 metres a second, each second. So it reaches the top when the speed is gone, `jumpSpeed / gravity` seconds later, and it comes down in the same time. That gives two things worth knowing before there is a jump to test: **how high** it goes, `jumpSpeed² / (2 × gravity)`, and **how far**, which is the time in the air, `2 × jumpSpeed / gravity`, times how fast the runner is going. Open `js/controller.js`. Find the comment at the top of the file (it starts `// The character controller`) and the table `BODY` under it, which are lines 1 to 17, and **delete them**, and add this in their place:

```js
// The character controller: a runner's body that is moved by code and not by a physics engine. Each frame it is told which way the keys
// ask it to go, and it works out where it ends up: running along the ground at a speed it builds up to, turning to face the way it goes,
// stepping up a curb and down again, stopped by walls, standing on the roof of a building, jumping, and, when there is nothing under its
// feet, falling. Everything is plain arithmetic on a World (see collision.js), so a jump from this speed onto that roof is a thing a test
// can say. See ../tests/controller.tests.js.

// The body, and the world's pull on it. Metres and seconds.
const BODY = {
  height: 1.8, // how tall the runner is, for walls above their head
  stepHeight: 0.4, // the highest step they can go up without jumping: a curb, a low wall, a stair
  supportReach: 0.25, // how far past the edge of something the middle of the runner can be, and still stand on it
  snapDown: 0.35, // the biggest drop the feet follow without falling: a step down is walked, a bigger drop is a fall
  gravity: 30, // how much faster a fall gets each second: more than the real 9.8, as a game wants
  terminalSpeed: 50, // the fastest a fall gets
  hardLanding: 7, // how fast a fall has to be, on landing, for a runner who is standing still to feel it (about 0.8 metres of fall)
  landTime: 0.4, // how long a hard landing lasts, in seconds, before the runner is free to run again
  jumpSpeed: 9, // how fast a jump goes up, as it leaves the ground: it takes it about a metre and a third up
  jumpCutSpeed: 3, // a jump that is let go of on the way up is slowed to this: a tap is a hop, and holding the key is the whole jump
  coyoteTime: 0.12, // how long after running off an edge a jump still works, in seconds
  jumpBuffer: 0.12, // how long a jump that was asked for too early is remembered, in seconds, to happen as soon as it can
  rollImpact: 11, // how fast a fall has to be, on landing, for a runner who is going somewhere to roll out of it (about 2 metres of fall)
  rollMinSpeed: 2, // how fast they have to be going to roll, or to run through a landing: slower than that and it is a hard landing
  rollSpeed: 6, // how fast a roll goes
  rollTime: 0.45, // how long a roll lasts, in seconds: the tumble of the roll clip, and not the slow getting up after it
};

// How high a jump goes, and how far it goes along level ground, for a runner going a given speed. Plain arithmetic on the numbers of BODY:
// the way up takes `jumpSpeed / gravity` seconds and so does the way down.
function jumpHeight(options = BODY) {
  return (options.jumpSpeed * options.jumpSpeed) / (2 * options.gravity);
}
function jumpDistance(speed, options = BODY) {
  return speed * ((2 * options.jumpSpeed) / options.gravity);
}
```

Things to notice:

- **All the jump's limits are in the table**, next to the others, and nothing else in the code has a number in it: `jumpSpeed` (9 metres a second goes a metre and a third up), `jumpCutSpeed`, `coyoteTime`, `jumpBuffer`, and for the roll `rollImpact`, `rollMinSpeed`, `rollSpeed` and `rollTime`. The tests will read them from the table, and so will the developer panel.
- **`jumpHeight` and `jumpDistance` are plain arithmetic**, with the table as an argument (so a test can give it another). They are not used by the game, apart from a read-out. They are there so that a level can be **checked**: a gap wider than `jumpDistance` is not a gap to be jumped.
- **`jumpDistance` is for level ground.** A jump onto a higher roof is shorter, and a jump down to a lower one is longer. The controller will find the real answer, and the tests will check it against this one.

The lines that list the exports are now wrong. Find them, at the bottom of the file (line 133):

```js
module.exports = { BODY, Controller };
```

and **change** it, and the `Object.assign(window, ...)` under it (line 135), to export `jumpHeight` and `jumpDistance` too: `{ BODY, jumpHeight, jumpDistance, Controller }`.

### Tests

Add this at the **end** of `tests/controller.tests.js` (below line 341):

```js
QUnit.module("jumpHeight and jumpDistance", () => {
  QUnit.test("a jump goes as high as the speed it leaves at, and gravity, say", (assert) => {
    assert.strictEqual(jumpHeight({ jumpSpeed: 6, gravity: 20 }), 0.9);
    assert.true(Math.abs(jumpHeight(BODY) - 1.35) < 1e-9);
  });

  QUnit.test("a jump goes as far as the time it is in the air, at the speed of the runner", (assert) => {
    assert.strictEqual(jumpDistance(5, { jumpSpeed: 6, gravity: 20 }), 3);
    assert.true(jumpDistance(7.5) > jumpDistance(4.5));
    assert.strictEqual(jumpDistance(0), 0);
  });
});
```

Open `tests.html`. You should see **286 passing tests**: 2 more.

---

## Step 2: The body jumps

Now the controller. Find the class `Controller` (lines 36 to 127: it starts with the line `class Controller`, and ends just above the comment `// Plain <script> include`) and **delete the whole class**. Add this in its place:

```js
class Controller {
  // `world` is a World. `bounds` is the edge of the world: { minX, maxX, minZ, maxZ }. The runner starts on whatever is at (x, z), the highest
  // thing there if `y` isn't given.
  constructor({ x = 0, y = null, z = 0, heading = 0, world, bounds = null, options = {} } = {}) {
    this.world = world;
    this.bounds = bounds;
    this.options = { ...SCOUT, ...BODY, ...options };
    this.x = x;
    this.z = z;
    this.y = y === null ? world.supportAt(x, z, this.options.supportReach, Infinity) : y;
    this.heading = heading; // the way the body faces, as a yaw
    this.speed = 0; // how fast it is going along the ground
    this.vy = 0; // how fast it is going up (negative is down)
    this.grounded = true;
    this.landing = 0; // seconds left of a hard landing
    this.rolling = 0; // seconds left of a roll
    this.impact = 0; // how fast the last fall was, when it landed
    this.airTime = 0; // how long the feet have been off the ground
    this.jumping = false; // whether the body is in the air because it jumped (and so can be slowed by letting go of the key)
    this.jumpHeld = false; // whether the key was down the last frame, to know the moment it goes down
    this.jumpWanted = 0; // seconds left that a jump is wanted, from when the key went down
    this.start = { x, z, heading, y: this.y };
  }

  // Moves on by `dt` seconds. `direction` is where the keys ask to go (or null), `sprint` whether they ask to go fast, and `jump` whether the
  // jump key is down.
  update(direction, sprint, dt, jump = false) {
    const o = this.options;
    this.landing = Math.max(0, this.landing - dt);
    this.rolling = Math.max(0, this.rolling - dt);
    this.jumpWanted = Math.max(0, this.jumpWanted - dt);
    if (jump && !this.jumpHeld) this.jumpWanted = o.jumpBuffer;
    this.jumpHeld = jump;

    // Along the ground: build up to the speed asked for (or slow to a stop), face the way it goes, and go the way it faces. A runner who is
    // in the air keeps the way they were going: they can't speed up or stop in mid air, but they can still steer a little. A runner who is
    // rolling goes the way they were going, at the speed of the roll, and can't steer.
    const rolling = this.rolling > 0;
    const wanted = rolling ? o.rollSpeed : direction ? (sprint ? o.sprintSpeed : o.jogSpeed) : 0;
    const control = this.grounded ? 1 : 0.35;
    const change = o.acceleration * control * dt;
    this.speed = Math.abs(wanted - this.speed) <= change ? wanted : this.speed + Math.sign(wanted - this.speed) * change;
    if (direction && !rolling) this.heading = turnToward(this.heading, Math.atan2(direction.x, direction.z), o.turnRate * dt);
    const moved = this.world.push(
      this.x + Math.sin(this.heading) * this.speed * dt,
      this.z + Math.cos(this.heading) * this.speed * dt,
      o.radius,
      this.y,
      o.height,
      o.stepHeight
    );
    this.x = moved.x;
    this.z = moved.z;
    if (this.bounds) {
      this.x = Math.min(this.bounds.maxX, Math.max(this.bounds.minX, this.x));
      this.z = Math.min(this.bounds.maxZ, Math.max(this.bounds.minZ, this.z));
    }

    // Up and down.
    if (this.grounded) this._walk(dt);
    if (!this.grounded) this.airTime += dt;
    this._jump();
    if (!this.grounded) this._fall(dt);
  }

  // A jump, if one is wanted and the body can: on the ground, or only just off it (the coyote time, for a runner who has just run off an
  // edge), and not in the middle of a roll. (A hard landing is only a picture: the runner is free to jump out of it.) A jump that is let go of
  // on the way up is cut short.
  _jump() {
    const o = this.options;
    const footing = this.grounded || (!this.jumping && this.airTime <= o.coyoteTime);
    if (this.jumpWanted > 0 && this.rolling === 0 && footing) {
      this.grounded = false;
      this.jumping = true;
      this.vy = o.jumpSpeed;
      this.jumpWanted = 0;
      this.airTime = o.coyoteTime + 1; // a runner in the air has no footing, and a jump that has begun can't be begun again
    }
    if (this.jumping && !this.jumpHeld && this.vy > o.jumpCutSpeed) this.vy = o.jumpCutSpeed;
  }

  // On the ground: the feet follow whatever is under them, a share of the way each frame (so that a curb is a quick step and not a jump). A
  // drop of more than snapDown is not followed: there is nothing under the feet, and the runner begins to fall.
  _walk(dt) {
    const o = this.options;
    const support = this.world.supportAt(this.x, this.z, o.supportReach, this.y + o.stepHeight);
    if (support < this.y - o.snapDown) {
      this.grounded = false;
      this.vy = 0;
      this.airTime = 0;
      return;
    }
    this.y += (support - this.y) * (1 - Math.exp(-o.stepRate * dt));
  }

  // In the air: gravity speeds the fall, and the feet are moved down. If they have gone through something that was under them, they stand on it:
  // the highest thing under where they were (and a step above, so that a runner who falls with the edge of a curb at their feet is put on it).
  // A runner who is going somewhere comes out of a long fall with a roll, and runs through a lesser one: only a runner who is standing (or
  // nearly) has a hard landing, which holds them for a moment.
  _fall(dt) {
    const o = this.options;
    const before = this.y;
    this.vy = Math.max(-o.terminalSpeed, this.vy - o.gravity * dt);
    this.y += this.vy * dt;
    if (this.vy > 0) return; // going up: nothing can be landed on
    this.jumping = false; // the top of the jump is past
    const support = this.world.supportAt(this.x, this.z, o.supportReach, before + o.stepHeight);
    if (this.y <= support) {
      this.impact = -this.vy;
      this.y = support;
      this.vy = 0;
      this.grounded = true;
      this.airTime = 0;
      if (this.impact >= o.rollImpact && this.speed >= o.rollMinSpeed) this.rolling = o.rollTime;
      else if (this.impact >= o.hardLanding && this.speed < o.rollMinSpeed) this.landing = o.landTime;
    }
  }

  // Back to where it began.
  reset() {
    Object.assign(this, this.start, { speed: 0, vy: 0, grounded: true, landing: 0, rolling: 0, impact: 0, airTime: 0, jumping: false, jumpWanted: 0 });
  }

  // Puts it somewhere else, standing still, in the air: it falls from there (or lands, if there is something right under it).
  placeAt(x, y, z) {
    Object.assign(this, { x, y, z, speed: 0, vy: 0, grounded: false, landing: 0, rolling: 0, airTime: this.options.coyoteTime + 1, jumping: false, jumpWanted: 0 });
  }
}
```

It is long, and most of it is what was there. Things to notice, in the order they come:

- **The new state** is in the constructor: `jumping` (the body is in the air *because it jumped*), `jumpHeld` (whether the key was down the last frame), `jumpWanted` (seconds left that a jump is wanted), `airTime` (how long the feet have been off the ground), and `rolling` (seconds left of a roll).
- **`update` takes a fourth argument, `jump`: whether the key is *down*.** The controller works out for itself the moment that it *went* down: down now, and not before. That keeps the keys out of the controller: it is told one boolean a frame, and it can be tested with no keyboard at all.
- **The buffer is `jumpWanted`.** The moment the key goes down, it is set to `jumpBuffer`, and it runs down with time. A jump happens if it is above zero *and* the body can jump. So a key that went down a tenth of a second before landing is still wanted when the feet touch.
- **`_jump` is where it is decided.** The body can jump if it is on the ground, **or** if it is not on a jump and `airTime` is no more than `coyoteTime`: only just off the ground. Not while rolling. A jump sets the speed up to `jumpSpeed`, uses up the buffer, and sets `airTime` so large that nothing can be jumped from the air again: **there is no second jump**.
- **A jump is cut short in `_jump` too**: if the key is not down and the body is on a jump and going up faster than `jumpCutSpeed`, the speed is made that. A tap is a hop, and the cut is **gentler** than stopping, so the hop still goes a little way.
- **A hard landing is only a picture, and only for a runner who is standing.** It does not stop the runner from jumping, so a runner who lands and jumps at once, as a player does, gets a jump. And a runner who is *going somewhere* (at least `rollMinSpeed`) runs through any landing that is not long enough to roll: a full jump lands at 9 metres a second, which is over `hardLanding`, and a runner who stopped to crouch after every jump would be no fun.
- **`_fall` says when a roll is.** On landing, if the fall was faster than `rollImpact` *and* the runner was going at least `rollMinSpeed`, the runner rolls for `rollTime`. Otherwise, a fall faster than `hardLanding` is a hard landing **if the runner is standing** (slower than `rollMinSpeed`): a runner who is going somewhere runs on. A runner who falls the same way standing still has no roll to take the sting out of it.
- **A roll lasts as long as the tumble of its clip** (`rollTime`, 0.45 seconds), and no longer, so that the runner is not held in a stand-up that a runner would not do. Look at the clip in the character file and you will see: tuck, tumble, crouch, and then a long rise.
- **A roll is committed.** In `update`, a rolling body goes at `rollSpeed` the way it was going and ignores the keys: it can't steer, and can't jump out of it.
- **The jump goes through the same world.** There is no new code for a jump onto a roof, or a jump into a wall: the world is asked for what is under the feet, and what is in the way, as always. A jump at a wall is stopped by the wall.

(The `// Plain <script> include` comment is the one after the class, at the bottom of the file, above the exports. Leave it and what is under it alone.)

### Tests

Add these **four** modules at the **end** of `tests/controller.tests.js`, one at a time, and open `tests.html` after each. The first is the jump itself, and goes below line 354:

```js
QUnit.module("Controller jumping", () => {
  const dt = 1 / 60;
  const flat = () => new World({ ground: () => 0 });
  const run = (body, frames, direction = null, sprint = false, jump = false) => {
    for (let i = 0; i < frames; i++) body.update(direction, sprint, dt, jump);
  };

  QUnit.test("a jump that is made agrees with the formula for its height", (assert) => {
    const fine = 1 / 120; // a finer step, for the arithmetic to come close to the formula
    const body = new Controller({ world: flat() });
    let highest = 0;
    for (let i = 0; i < 200; i++) {
      body.update(null, false, fine, true);
      highest = Math.max(highest, body.y);
    }
    assert.true(Math.abs(highest - jumpHeight(BODY)) < 0.1, String(highest));
  });

  QUnit.test("a jump that is made agrees with the formula for its distance", (assert) => {
    const fine = 1 / 120;
    for (const sprint of [false, true]) {
      const body = new Controller({ world: flat() });
      for (let i = 0; i < 200; i++) body.update({ x: 0, z: 1 }, sprint, fine);
      const from = body.z;
      body.update({ x: 0, z: 1 }, sprint, fine, true);
      for (let i = 0; i < 400 && !body.grounded; i++) body.update({ x: 0, z: 1 }, sprint, fine, true);
      const speed = sprint ? SCOUT.sprintSpeed : SCOUT.jogSpeed;
      assert.true(Math.abs(body.z - from - jumpDistance(speed)) < 0.2, `${sprint}: ${body.z - from}`);
    }
  });

  QUnit.test("the jump key leaves the ground, going up", (assert) => {
    const body = new Controller({ world: flat() });
    body.update(null, false, dt, true);
    assert.false(body.grounded);
    assert.true(body.jumping);
    assert.true(body.vy > 0 && body.y > 0);
  });

  QUnit.test("without the key, it stays on the ground", (assert) => {
    const body = new Controller({ world: flat() });
    run(body, 30);
    assert.true(body.grounded);
    assert.false(body.jumping);
  });

  QUnit.test("a jump held to the top goes the whole height, and comes down to the ground", (assert) => {
    const body = new Controller({ world: flat() });
    let highest = 0;
    for (let i = 0; i < 90; i++) {
      body.update(null, false, dt, i < 30);
      highest = Math.max(highest, body.y);
    }
    assert.true(highest > jumpHeight(BODY) - 0.2 && highest < jumpHeight(BODY) + 0.1, String(highest));
    assert.true(body.grounded);
    assert.strictEqual(body.y, 0);
  });

  QUnit.test("a tap is a hop: letting go on the way up cuts the jump short", (assert) => {
    const hop = new Controller({ world: flat() });
    const jump = new Controller({ world: flat() });
    let hopReached = 0;
    let jumpReached = 0;
    for (let i = 0; i < 60; i++) {
      hop.update(null, false, dt, i === 0);
      jump.update(null, false, dt, i < 30);
      hopReached = Math.max(hopReached, hop.y);
      jumpReached = Math.max(jumpReached, jump.y);
    }
    assert.true(hopReached > 0.1 && hopReached < jumpReached / 2, `${hopReached} ${jumpReached}`);
  });

  QUnit.test("a key held down jumps once: it has to go up and down again to jump again", (assert) => {
    const body = new Controller({ world: flat() });
    let takeoffs = 0;
    let was = true;
    for (let i = 0; i < 240; i++) {
      body.update(null, false, dt, true);
      if (was && !body.grounded) takeoffs++;
      was = body.grounded;
    }
    assert.strictEqual(takeoffs, 1);
  });

  QUnit.test("there is no jumping in the air", (assert) => {
    const body = new Controller({ world: flat() });
    run(body, 20, null, false, true);
    run(body, 5, null, false, false);
    const vy = body.vy;
    body.update(null, false, dt, true);
    assert.true(body.vy < vy, "pressing again is not a second jump");
  });

  QUnit.test("a jump lands in a hard landing for a runner who is standing, and runs on for one who is running", (assert) => {
    // Jumps for 30 frames, and says what the body is the frame it lands.
    const landsHolding = (direction) => {
      const body = new Controller({ world: flat() });
      run(body, 60, direction);
      let wasInTheAir = false;
      for (let i = 0; i < 90; i++) {
        body.update(direction, false, dt, i < 30);
        if (wasInTheAir && body.grounded) return body.landing;
        wasInTheAir = !body.grounded;
      }
      return -1;
    };
    assert.true(landsHolding(null) > 0);
    assert.strictEqual(landsHolding({ x: 0, z: 1 }), 0);
  });

  QUnit.test("a jump goes on in the way the runner was going", (assert) => {
    const body = new Controller({ world: flat() });
    run(body, 100, { x: 0, z: 1 }, true);
    const from = body.z;
    run(body, 20, { x: 0, z: 1 }, true, true);
    assert.true(body.z - from > 2);
    assert.false(body.grounded);
  });

  QUnit.test("it cannot jump in the middle of a roll, but can out of a hard landing, which is only a picture", (assert) => {
    const rolling = new Controller({ world: flat() });
    rolling.rolling = 0.5;
    rolling.update(null, false, dt, true);
    assert.true(rolling.grounded);
    const landing = new Controller({ world: flat() });
    landing.landing = 0.3;
    landing.update(null, false, dt, true);
    assert.false(landing.grounded);
  });

  QUnit.test("a runner who jumps at a wall does not go through it", (assert) => {
    const wall = { minX: -5, maxX: 5, minY: 0, maxY: 30, minZ: 3, maxZ: 4 };
    const body = new Controller({ world: new World({ boxes: [wall] }) });
    for (let i = 0; i < 200; i++) body.update({ x: 0, z: 1 }, true, dt, i % 60 < 30);
    assert.true(body.z <= 3 - body.options.radius + 1e-6);
  });

  QUnit.test("reset and placeAt put a jump away", (assert) => {
    const body = new Controller({ world: flat() });
    run(body, 10, null, false, true);
    body.reset();
    assert.deepEqual([body.grounded, body.jumping, body.vy], [true, false, 0]);
    run(body, 10, null, false, true);
    body.placeAt(1, 5, 1);
    assert.deepEqual([body.grounded, body.jumping, body.rolling], [false, false, 0]);
  });

  QUnit.test("the numbers of the jump can be changed: a stronger jump goes higher", (assert) => {
    const high = new Controller({ world: flat(), options: { jumpSpeed: 14 } });
    let highest = 0;
    for (let i = 0; i < 90; i++) {
      high.update(null, false, dt, i < 40);
      highest = Math.max(highest, high.y);
    }
    assert.true(highest > 2.5);
  });
});
```

Things to notice:

- **A jump that is made is checked against the formula.** The two tests at the top make a jump, at a smaller step so that the arithmetic comes close, and compare the height and the distance with `jumpHeight` and `jumpDistance`. A test that agrees with a formula can't be wrong in the same way the code is.
- **A tap and a held key are tested side by side**, in the same frames, and the hop must go less than half as high.
- **A key held down jumps once.** The test counts the times the feet left the ground in four seconds of a held key.
- **A jump lands differently standing and running.** The test jumps with no keys and with a key held, and looks at the body the frame it lands: a hard landing in one, none in the other.
- **A jump into a wall** is run at a wall 30 metres high, and the runner must not have gone through it.

Open `tests.html`. You should see **300 passing tests**. The second module is the fairness of the jump, and goes below the last line of the first (line 513):

```js
QUnit.module("Controller coyote time and jump buffer", () => {
  const dt = 1 / 60;
  const roof = { minX: -50, maxX: 0, minY: 0, maxY: 5, minZ: -50, maxZ: 50 };
  const east = { x: 1, z: 0 };
  const onRoof = (options = {}) => new Controller({ x: -10, z: 0, heading: Math.PI / 2, world: new World({ boxes: [roof] }), options });

  // Runs off the edge of the roof, and then `late` frames after the feet left it, presses jump. Whether that jumped.
  const jumpsAfterTheEdge = (late, options) => {
    const body = onRoof(options);
    for (let i = 0; i < 600 && body.grounded; i++) body.update(east, true, dt);
    for (let i = 0; i < late; i++) body.update(east, true, dt);
    body.update(east, true, dt, true);
    return body.jumping;
  };

  QUnit.test("a jump a moment after running off an edge still works (the coyote time)", (assert) => {
    assert.true(jumpsAfterTheEdge(0));
    assert.true(jumpsAfterTheEdge(3));
  });

  QUnit.test("a jump too long after it does not", (assert) => {
    assert.false(jumpsAfterTheEdge(12));
  });

  QUnit.test("with no coyote time, a jump after the edge does not work", (assert) => {
    assert.false(jumpsAfterTheEdge(2, { coyoteTime: 0 }));
  });

  QUnit.test("a longer coyote time is a longer wait", (assert) => {
    assert.false(jumpsAfterTheEdge(12));
    assert.true(jumpsAfterTheEdge(12, { coyoteTime: 0.3 }));
  });

  QUnit.test("a runner who has jumped has no coyote time left to jump again with", (assert) => {
    const body = onRoof();
    for (let i = 0; i < 600 && body.x < -0.3; i++) body.update(east, true, dt);
    body.update(east, true, dt, true);
    assert.true(body.jumping);
    for (let i = 0; i < 20; i++) body.update(east, true, dt);
    const vy = body.vy;
    body.update(east, true, dt, true);
    assert.true(body.vy <= vy);
  });

  // Drops from a metre up (about a quarter of a second, fifteen frames), and presses jump after `wait` frames. Whether that jumped by the
  // time it had landed and a few frames more.
  const jumpsAfterTheDrop = (wait, options) => {
    const body = new Controller({ world: new World({ ground: () => 0 }), options });
    body.placeAt(0, 1, 0);
    let jumped = false;
    for (let i = 0; i < 40; i++) {
      body.update(null, false, dt, i === wait);
      if (body.jumping) jumped = true;
    }
    return jumped;
  };

  QUnit.test("a jump pressed a moment before landing happens as it lands (the jump buffer)", (assert) => {
    assert.true(jumpsAfterTheDrop(10));
    assert.true(jumpsAfterTheDrop(12));
  });

  QUnit.test("a jump pressed too long before landing is forgotten", (assert) => {
    assert.false(jumpsAfterTheDrop(0));
    assert.false(jumpsAfterTheDrop(2));
  });

  QUnit.test("with no jump buffer, a jump that is early is lost", (assert) => {
    assert.false(jumpsAfterTheDrop(12, { jumpBuffer: 0 }));
  });

  QUnit.test("a longer jump buffer remembers a jump pressed earlier", (assert) => {
    assert.false(jumpsAfterTheDrop(2));
    assert.true(jumpsAfterTheDrop(2, { jumpBuffer: 0.4 }));
  });
});
```

Things to notice:

- **The edge of a roof makes the coyote tests**: a runner runs off the end of one, and a jump is pressed some frames after the feet left it. At 3 frames (a twentieth of a second) it is a jump, at 12 (a fifth) it is not, and with `coyoteTime: 0.3` it is again. The numbers of the table are changed by the test, for the one runner, and that is the whole reason they are in a table.
- **The buffer is tested with a drop of a metre**, which is about 15 frames. A jump that is pressed 10 or 12 frames in (5 or 3 before landing) happens. One at the very start (15 before) is forgotten.
- **A runner who has jumped has no coyote time left to jump again with.** Without that, a runner could jump in the air, over and over, at the top of a jump, and climb as high as they liked.

Open `tests.html`. You should see **309 passing tests**. The third is the roll, and goes below line 591:

```js
QUnit.module("Controller rolling", () => {
  const dt = 1 / 60;
  const east = { x: 1, z: 0 };

  // Runs off a roof `height` metres up (or, if not `running`, is put in the air above the edge of one), and returns the body just after it
  // has landed.
  const landed = (height, running) => {
    const world = new World({ boxes: [{ minX: -50, maxX: 0, minY: 0, maxY: height, minZ: -50, maxZ: 50 }] });
    const body = new Controller({ x: -10, z: 0, heading: Math.PI / 2, world });
    if (running) for (let i = 0; i < 600 && body.grounded; i++) body.update(east, false, dt);
    else body.placeAt(5, height, 0);
    for (let i = 0; i < 600 && !(body.grounded && body.impact > 0); i++) body.update(running ? east : null, false, dt);
    return body;
  };

  QUnit.test("a runner who falls a long way, going somewhere, rolls out of it", (assert) => {
    const body = landed(5, true);
    assert.true(body.impact >= BODY.rollImpact);
    assert.true(body.rolling > 0);
    assert.strictEqual(body.landing, 0);
  });

  QUnit.test("a runner who falls the same way standing still has a hard landing", (assert) => {
    const body = landed(5, false);
    assert.true(body.impact >= BODY.rollImpact);
    assert.strictEqual(body.rolling, 0);
    assert.true(body.landing > 0);
  });

  QUnit.test("a runner who falls a short way, going somewhere, does not roll, and runs through the landing", (assert) => {
    const short = landed(1.2, true);
    assert.true(short.impact >= BODY.hardLanding && short.impact < BODY.rollImpact);
    assert.strictEqual(short.rolling, 0);
    assert.strictEqual(short.landing, 0);
  });

  QUnit.test("a runner who falls a short way standing still has a hard landing, and a very short fall is not felt", (assert) => {
    const short = landed(1.2, false);
    assert.strictEqual(short.rolling, 0);
    assert.true(short.landing > 0);
    const tiny = landed(0.6, false);
    assert.strictEqual(tiny.landing, 0);
  });

  QUnit.test("a roll goes at the speed of a roll, and the way the runner was going", (assert) => {
    const body = landed(5, true);
    const z = body.z;
    for (let i = 0; i < 10; i++) body.update(east, false, dt);
    assert.strictEqual(body.speed, BODY.rollSpeed);
    assert.true(Math.abs(body.z - z) < 1e-6);
  });

  QUnit.test("a roll cannot be steered", (assert) => {
    const body = landed(5, true);
    const heading = body.heading;
    for (let i = 0; i < 10; i++) body.update({ x: -1, z: 0 }, false, dt);
    assert.strictEqual(body.heading, heading);
  });

  QUnit.test("a roll cannot be jumped out of, until it is over", (assert) => {
    const body = landed(5, true);
    body.update(east, false, dt, true);
    assert.true(body.grounded);
    assert.false(body.jumping);
  });

  QUnit.test("a roll is over after its time, and the runner is free again", (assert) => {
    const body = landed(5, true);
    for (let i = 0; i < Math.ceil((BODY.rollTime + 0.1) / dt); i++) body.update(null, false, dt);
    assert.strictEqual(body.rolling, 0);
    for (let i = 0; i < 60; i++) body.update(null, false, dt);
    assert.strictEqual(body.speed, 0);
  });
});
```

Things to notice:

- **`landed(height, running)` is a helper that makes the fall:** runs off a roof, or is put above one, and runs the body to just after the landing. Each test is then one line of what is true of it.
- **Four falls decide what a roll is:** a long fall, going somewhere, rolls; the same fall standing still is a hard landing; a short fall, going somewhere, is not a roll, and is run through; and a short fall standing still is a hard landing, and a very short one is not felt.

Open `tests.html`. You should see **317 passing tests**. The last is the one that matters for the levels, and goes below line 667:

```js
QUnit.module("Jumping across a gap", () => {
  const dt = 1 / 60;
  const east = { x: 1, z: 0 };

  // Two roofs of the same height with `gap` metres between them. A runner takes a run up along the first, and jumps just before its edge, as a
  // player would. Whether they end on the second.
  const crosses = (gap, sprint, options) => {
    const first = { minX: -60, maxX: 0, minY: 0, maxY: 10, minZ: -10, maxZ: 10 };
    const second = { minX: gap, maxX: gap + 60, minY: 0, maxY: 10, minZ: -10, maxZ: 10 };
    const body = new Controller({ x: -40, z: 0, heading: Math.PI / 2, world: new World({ boxes: [first, second] }), options });
    for (let i = 0; i < 1500; i++) {
      body.update(east, sprint, dt, body.x > -0.3);
      if (body.x > gap && body.grounded && Math.abs(body.y - 10) < 0.01) return true;
      if (body.y < 5) return false;
    }
    return false;
  };

  QUnit.test("a short gap can be jumped jogging, and a longer one can't", (assert) => {
    assert.true(crosses(1.5, false));
    assert.false(crosses(4, false));
  });

  QUnit.test("a longer gap can be jumped sprinting", (assert) => {
    assert.true(crosses(3.5, true));
    assert.false(crosses(6, true));
  });

  QUnit.test("the gaps that can be jumped follow jumpDistance: a little under it, and not much over it", (assert) => {
    for (const sprint of [false, true]) {
      const reach = jumpDistance(sprint ? SCOUT.sprintSpeed : SCOUT.jogSpeed);
      assert.true(crosses(reach - 0.8, sprint), `${sprint} inside`);
      assert.false(crosses(reach + 1, sprint), `${sprint} outside`);
    }
  });

  QUnit.test("a bigger jump speed crosses a bigger gap", (assert) => {
    assert.false(crosses(5.5, true));
    assert.true(crosses(5.5, true, { jumpSpeed: 11 }));
  });
});
```

Things to notice:

- **`crosses(gap, sprint)` builds two roofs with a gap, and plays a runner over it**: a run up, and a jump just before the edge, as a player would. It says whether the runner ended on the other roof.
- **A gap that can be jumped follows `jumpDistance`.** The test says a gap a little *under* the distance can be crossed and one a metre *over* it can't, for jogging and for sprinting. That is the rule the buildings of the district will be spaced by.

Open `tests.html`. You should see **321 passing tests**.

---

## Step 3: Clips for a jump and a roll

The character file has a jump clip, `Jump_Start`, and a roll, `Roll`. Open `js/character.js`. Find the line that begins `const CLIPS =` (line 13) and **delete it**, and add this:

```js
const CLIPS = { idle: "Idle_Loop", walk: "Walk_Loop", jog: "Jog_Fwd_Loop", sprint: "Sprint_Loop", jump: "Jump_Start", fall: "Jump_Loop", land: "Jump_Land", roll: "Roll" };
```

Then find the part from the comment `// How fast the landing clip plays` to the end of `clipForBody` (lines 32 to 41), and **delete it**, and add this:

```js
// How fast the landing clip plays: it is a little over a second as it was recorded, and a hard landing is over in less than half of one.
const LAND_RATE = 2.5;
const JUMP_RATE = 3; // the jump clip is a second and a third long, and a jump is over the top in a third of a second
const ROLL_RATE = 2; // the roll clip is a second and a half long, and its tumble is over by 0.6 of the way through: a roll lasts 0.45 of a second, and the runner goes straight on from the crouch

// The clip for a body (a Controller): { name, rate, loop }. On the way up from a jump, the jump clip, once, and then it stays at its last pose;
// on the way down, the falling clip, which goes on for as long as the fall; in a roll, the roll clip, once, fast enough to be done when the roll
// is; just after a hard landing, the landing clip, once; and otherwise the one for the speed.
function clipForBody(body) {
  if (!body.grounded) return body.jumping ? { name: CLIPS.jump, rate: JUMP_RATE, loop: false } : { name: CLIPS.fall, rate: 1, loop: true };
  if (body.rolling > 0) return { name: CLIPS.roll, rate: ROLL_RATE, loop: false };
  if (body.landing > 0) return { name: CLIPS.land, rate: LAND_RATE, loop: false };
  return { ...clipForSpeed(body.speed), loop: true };
}
```

Things to notice:

- **A clip for each of four things the body can be doing in the air or on landing**: going up from a jump, falling, rolling, and landing hard. They come in that order of importance: in the air first (and whether it is a jump going up, or only a fall), then a roll, then a hard landing, then the clip for the speed.
- **`jumping` is what tells a jump from a fall.** A runner who walks off an edge falls, with the falling clip; a runner who jumps has the jump clip on the way up, and from the top (`jumping` is turned off there, in `_fall`) the falling clip, which is the same clip that a fall has.
- **The rates make the clips the length of what they are for.** The jump clip is a second and a third long, and it is played three times as fast, to be at its last pose when the jump is at its top. The roll is a second and a half long, but only the first 60 per cent of it is the tumble: the rest is a slow getting up, which a runner who goes straight on does not do, and which would look like standing still. So it is played twice as fast, and the roll lasts 0.45 of a second, which is the tumble: the runner comes out of the crouch and into the run. They are `JUMP_RATE` and `ROLL_RATE`, next to `LAND_RATE`.

Add `JUMP_RATE` and `ROLL_RATE` to the export lists at the bottom of the file (line 113 and line 115), next to `LAND_RATE`.

### Tests

In `tests/character.tests.js`, **change** the list in *"the clips are all clips the character file has"* (line 37) to:

```js
    assert.deepEqual(Object.values(CLIPS), ["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop", "Jump_Start", "Jump_Loop", "Jump_Land", "Roll"]);
```

Find the module `clipForBody` (lines 41 to 65). **Delete it**, and add this in its place (it is the old module, with two new tests, and a body with `rolling` and `jumping` in it):

```js
QUnit.module("clipForBody", () => {
  const body = (changes) => ({ grounded: true, landing: 0, rolling: 0, jumping: false, speed: 0, ...changes });

  QUnit.test("on the ground, it is the clip for the speed, looping", (assert) => {
    assert.deepEqual(clipForBody(body({ speed: 0 })), { name: CLIPS.idle, rate: 1, loop: true });
    assert.strictEqual(clipForBody(body({ speed: 4.5 })).name, CLIPS.jog);
    assert.strictEqual(clipForBody(body({ speed: 7.5 })).name, CLIPS.sprint);
    assert.true(clipForBody(body({ speed: 4.5 })).loop);
  });

  QUnit.test("in the air, after the top of a jump or a step off an edge, it is the falling clip, whatever the speed", (assert) => {
    for (const speed of [0, 4.5, 7.5]) assert.deepEqual(clipForBody(body({ grounded: false, speed })), { name: CLIPS.fall, rate: 1, loop: true });
  });

  QUnit.test("on the way up from a jump, it is the jump clip, played once and fast", (assert) => {
    const clip = clipForBody(body({ grounded: false, jumping: true, speed: 4.5 }));
    assert.deepEqual(clip, { name: CLIPS.jump, rate: JUMP_RATE, loop: false });
  });

  QUnit.test("in a roll, it is the roll clip, played once, at the rate that makes it as long as the roll", (assert) => {
    const clip = clipForBody(body({ rolling: 0.3, speed: 6 }));
    assert.deepEqual(clip, { name: CLIPS.roll, rate: ROLL_RATE, loop: false });
    assert.true(JUMP_RATE > 1 && ROLL_RATE > 1);
  });

  QUnit.test("just after a hard landing, it is the landing clip, played once", (assert) => {
    const clip = clipForBody(body({ landing: 0.2, speed: 4.5 }));
    assert.strictEqual(clip.name, CLIPS.land);
    assert.strictEqual(clip.rate, LAND_RATE);
    assert.false(clip.loop);
  });

  QUnit.test("in the air wins over a landing, since it is falling again", (assert) => {
    assert.strictEqual(clipForBody(body({ grounded: false, landing: 0.2 })).name, CLIPS.fall);
  });
});
```

Open `tests.html`. You should see **323 passing tests**.

---

## Step 4: The key, and the game

The key goes in the list of keys. Open `js/scout.js`. In `MOVE_KEYS`, find the line for `sprint` (line 21), and add a line under it:

```js
  jump: ["Space"],
```

(The page keeps the keys that are listed there for itself, so **Space no longer scrolls the page**, and a button that has been clicked does not get a click from it.) In `moveInput`, add a line under the one for `sprint` (line 41):

```js
    jump: anyHeld(held, MOVE_KEYS.jump),
```

and change the comment above `moveInput` (line 36) to say that the result also says whether to jump. In `tests/scout.tests.js`, the first test of `moveInput` has to say what no keys ask for, which now has `jump: false`. **Change** that line (line 3), and add a test under the ones for the sprint, directly above the test *"ALL_MOVE_KEYS has every key..."* (line 31):

```js
    assert.deepEqual(moveInput(new Set()), { forward: 0, right: 0, sprint: false, jump: false });
```

```js
  QUnit.test("the space bar is a jump", (assert) => {
    assert.true(moveInput(new Set(["Space"])).jump);
    assert.false(moveInput(new Set(["KeyW"])).jump);
  });
```

Open `tests.html`. You should see **324 passing tests**.

### The game

Now `js/main.js`. In the frame, find the line `body.update(...)` (line 156), and **change** it to give the body the jump key too:

```js
    body.update(started ? moveDirection(input, orbit.yaw) : null, input.sprint, dt, started && input.jump);
```

(`started &&` keeps the key from making a jump before the game has begun.) That is all of the game's part: the controller does the rest. In the developer panel, in the group `Runner`, add these four rows directly under the row for `gravity` (line 201):

```js
            slider("jump speed", body.options, "jumpSpeed", 2, 16, 0.5),
            slider("jump cut speed", body.options, "jumpCutSpeed", 0, 8, 0.5),
            slider("coyote time", body.options, "coyoteTime", 0, 0.4, 0.01),
            slider("jump buffer", body.options, "jumpBuffer", 0, 0.4, 0.01),
```

and in the group `World`, add these three read-outs directly under the one for `on the ground` (line 224):

```js
            readout("jump height", () => `${jumpHeight(body.options).toFixed(1)} m`),
            readout("jog jump reach", () => `${jumpDistance(body.options.jogSpeed, body.options).toFixed(1)} m`),
            readout("sprint jump reach", () => `${jumpDistance(body.options.sprintSpeed, body.options).toFixed(1)} m`),
```

Things to notice:

- **The read-outs are the formulas**, with the numbers of this runner: how high a jump is, and how far, jogging and sprinting. Change the jump speed or gravity, and they change, and they are the figures that a gap in a level should be checked against.
- **The sliders are the feel.** Make the coyote time 0 and run off a roof, and press jump a moment after, and it won't work. Make it 0.4, and it works well after you are falling, which is what makes a game forgiving. Do the same with the buffer.

Last, the page's hint line. In `index.html`, find the hint (line 25) and **change** it to include the key:

```html
  <div class="hint">WASD run &middot; Shift sprint &middot; Space jump &middot; mouse look (click first, Esc lets go) &middot; R restart &middot; C screenshot &middot; <a href="tests.html">Run tests</a></div>
```

---

## Step 5: Try it

Serve the page and open it **with `?dev`**.

- [ ] Running about is as before, and **Space no longer scrolls the page**
- [ ] **Space** jumps: the runner plays the **jump clip** on the way up, and the **falling clip** from the top
- [ ] **A tap** is a hop and **holding Space** is a full jump. The read-out of the **jump height** says how high a full one is
- [ ] **Holding Space down** jumps once, not over and over. Let go and press again to jump again
- [ ] A **running jump goes further** than a standing one, and a sprinting jump further than a jogging one, as far as the **read-outs** say
- [ ] **Go to a roof** and run off the edge, and press Space **just after** the runner leaves it: it still jumps (**coyote time**). Press it a good moment later, and it doesn't
- [ ] **Go to a roof**, and jump **across** the alley to the next building, if it is close enough. (Some of the roofs are at different heights: a jump down is longer than `jumpDistance`, and a jump up is shorter)
- [ ] Press Space **just before** landing, from a small drop: the runner **jumps as soon as it lands** (**the buffer**)
- [ ] **A running jump** lands and the runner **runs straight on**, with no pause in the middle (a jump from standing still lands with a short crouch)
- [ ] **Run off a tall roof** (or **Go to a roof** on a tall building and run off its edge): the runner lands in a **roll**, with the **roll clip**, and goes on, and **can't steer in the middle of it**
- [ ] **Stand still** above the edge of a roof and step off: no roll, a **hard landing**
- [ ] A jump at a **wall** doesn't go through it, and a jump from the street **can't reach a roof** (it is far too high). A jump onto a **low** wall, or the **raised edge** of a roof, works
- [ ] **R** and **Back to the start** put the runner back, and **Switch runner**: the other character does the same things

**If something's wrong**

- **Space does nothing:** `jump: ["Space"]` in `MOVE_KEYS`, and that `main.js` passes `input.jump` as the fourth argument. If the page scrolls instead, the key is not in `MOVE_KEYS`.
- **The runner jumps over and over while Space is held:** `jumpWanted` must be set only when the key *goes* down: `jump && !this.jumpHeld`, and `this.jumpHeld = jump` after it.
- **The runner jumps in the air, again and again:** `_jump` must have `!this.jumping` in front of the coyote time, and a jump must set `airTime` to more than `coyoteTime`.
- **A jump is the same height however long the key is held:** `_jump` must cut the speed only when the key is *not* held (`!this.jumpHeld`) and the body is going up faster than `jumpCutSpeed`.
- **A jump that was pressed a moment before landing doesn't happen:** `jumpWanted` must count down by `dt` each frame, and `_jump` must be called after the landing, which is in `_fall`, so on the frame *after* it.
- **The runner is stuck in the landing clip and can't jump:** a hard landing is only a picture: `_jump` should not look at `landing`. **The runner stops to crouch after every running jump:** `landing` must be set only when the runner's speed is under `rollMinSpeed`.
- **The runner rolls from every small drop:** `rollImpact` is how fast a fall has to be to roll (11 is about two metres). **Never rolls:** the runner has to be going at least `rollMinSpeed` when the feet land.

**Experiments** (change one, reload, then change it back):

- **`jumpSpeed: 12`** in `BODY`: a jump of two and a half metres. The alleys of the district are easy
- **`gravity: 60`** with **`jumpSpeed: 18`**: the same height, in half the time. A snappier jump, and the same one when it is over
- **`coyoteTime: 0.3`**: a runner who can run off the edge, count to three and still jump
- **`jumpCutSpeed: 9`**: a jump that is not cut at all
- **`rollMinSpeed: 0`**: a roll, even from standing still

---

## Step 6: Tests, all together

Your `tests.html` scripts should look like this, as they did at the start:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="js/progress.js"></script>
  <script src="js/splash.js"></script>
  <script src="js/plan.js"></script>
  <script src="js/models.js"></script>
  <script src="js/sky.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/character.js"></script>
  <script src="js/scout.js"></script>
  <script src="js/collision.js"></script>
  <script src="js/controller.js"></script>
  <script src="js/debug.js"></script>
  <script src="js/devpanel.js"></script>
  <script src="tests/progress.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
  <script src="tests/plan.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/sky.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/character.tests.js"></script>
  <script src="tests/scout.tests.js"></script>
  <script src="tests/collision.tests.js"></script>
  <script src="tests/controller.tests.js"></script>
  <script src="tests/debug.tests.js"></script>
  <script src="tests/devpanel.tests.js"></script>
```

Open it. You should see **324 passing tests**: the 284 you started with, plus 2 for the numbers of a jump, 14 for the jump, 9 for coyote time and the buffer, 8 for the roll, 4 for the gaps, 2 for the clips and 1 for the key.

> **What these tests don't cover.** The *feel*: whether 9 is the right jump speed, or 0.12 seconds a good coyote time. They are first tries, and the sliders in the developer panel are how you find better ones. And `main.js`, the glue, is checked by playing.

> **Try breaking something.** In `controller.js`, in `_jump` (line 106), take `!this.jumping &&` out of the line that works out `footing`. The test *"a runner who has jumped has no coyote time left to jump again with"* fails, and the runner, in the game, can climb the air. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A jump is a speed, and gravity takes it away | `jumpSpeed`, `_jump`, `_fall` |
| How high and how far a jump goes | `jumpHeight`, `jumpDistance` |
| A tap is a hop | `jumpCutSpeed`, `_jump` |
| Down now, and not before: the moment a key goes down | `jumpHeld`, `update` |
| A little grace after an edge | `coyoteTime`, `airTime` |
| A press that is early is remembered | `jumpBuffer`, `jumpWanted` |
| No jump in the air | `jumping`, `airTime` |
| A roll takes the sting out of a long fall | `rollImpact`, `rollMinSpeed`, `rolling`, `_fall` |
| A clip for each thing the body is doing | `clipForBody`, `JUMP_RATE`, `ROLL_RATE` |
| Testing whether a gap can be jumped | `crosses`, `jumpDistance` |
| Tuning the feel while playing | the sliders and read-outs of the panel |

## Challenges

1. **A longer jump with a run up.** Make the jump go a little higher the faster the runner is going (a share of the speed added to `jumpSpeed`). Check that it does not break the gap tests, and change them if it should.
2. **A head bump.** A box that is over the runner's head, with room under it (a bridge) stops a jump going up: the speed is lost at the underside of the box. (Hint: the `minY` of a box, which `supportAt` ignores.)
3. **A trail.** A faint mark on the ground, at the place a jump would land, drawn while the key is held. (Hint: `jumpDistance`, the heading and `supportAt`.)
4. **A second, smaller jump in the air.** A double jump, which the tests say is not there. Add `maxJumps` to the table and change the tests that said there is none.
5. **A hard landing that stops you.** Make a runner who lands hard *can't jump* for the time it takes. (Hint: it is the one-line change that was taken out of `_jump`, and the test that says why.)

---

*That's the jump. A runner can cross an alley, and fall from a tower and roll out of it. Next they learn the thing that the whole game is about: to jump at a wall, **grab its ledge**, hang there, shimmy along it and pull up.*
