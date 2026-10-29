# Tutorial: Rolling Rampage Marble -- Steering with Forces

This is the second tutorial in the Rolling Rampage series. The marble rolls down a ramp under physics, but you can only watch. In this step you take the controls. **Arrow keys or WASD** on a keyboard, and a **thumb dragged anywhere on the screen** on a phone, both roll the marble, and both feel like a push rather than a command. The marble is pushed with **forces** (so it accelerates, carries its speed, and has to be pushed back to turn around), the push is **relative to the camera** (so up on the screen is up on the screen, even though the camera looks across the course from a corner), and it fades near a top speed and is weaker in the air. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **stick**: every kind of input boiled down to one thing, how far right and up the player is pushing, as seen on the screen
- **Keyboard** and **touch** controls that each make a stick, and work together
- A way to turn a stick on the screen into a **direction in the world**, for a camera that looks from a corner
- A **force on the marble** that fades near top speed, is stronger when turning round, and is weaker in the air
- A way to tell whether the marble is **on the ground**, by shooting a ray down
- A **floating stick** drawn under the thumb: a ring where it touched, and a knob that follows it
- Unit tests for all of it, **including tests that push a real marble** and check where it goes on the screen

**What you'll learn:** forces and impulses on a physics body, why a push is a force and not a speed, why the force goes through the middle of a ball, a virtual stick (dead zone, clamping, scaling to the screen), turning screen directions into world directions with the camera's angle, picking with a ray to test for the ground, fading a push as speed rises, keyboard state without the keyboard's quirks (held keys, a lost focus), and testing steering by moving a real marble and looking at the result **as the camera sees it**.

## Where you're starting

This folder is a copy of the finished World sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_marble/
├── index.html, tests.html
├── css/
│   └── game.css            (grows -- Step 4)
├── js/
│   ├── steering.js         (placeholder -- Steps 1 and 3)
│   ├── controls.js         (placeholder -- Step 4)
│   ├── marble.js           (grows -- Step 2)
│   ├── main.js             (changes -- Step 5)
│   └── physics.js, course.js, camera.js, splash.js   (from the World sample)
└── tests/
    ├── steering.tests.js   (placeholder)
    ├── controls.tests.js   (placeholder)
    └── marble.tests.js grows, and the rest    (from the World sample)
```

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_marble/` (the command prints the exact address), or use the *Live Server* extension in VS Code. To try the touch stick without a phone, use Chrome's **device mode**: press **F12**, then **Ctrl+Shift+M**, and choose a phone. Your mouse then acts as a finger.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the World sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**79**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: One stick, whatever made it

A keyboard has four keys, a thumb has a position, and a game pad (one day) has two analog sticks. If the marble had to know about each, it would be a mess. So everything is boiled down to one thing, a **stick**: `{ x, y }`, where `x` is how far the player wants to go right and `y` how far up, *as seen on the screen*, each from -1 to 1, and never longer than 1 overall. From a stick on, it is the same whatever made it:

> a stick (on the screen) → a direction in the world → a force on the marble

The rules for each arrow are plain numbers, so they go in a file of their own with no Babylon.js and no page in it, and are easy to test. Open the placeholder `js/steering.js` and replace its contents with:

```js
// Steering: turning what the player does (keys, or a thumb on a touch screen) into a push on
// the marble. It is all plain numbers, with no Babylon.js and no page, so the rules are easy
// to test. See ../tests/steering.tests.js.
//
// Every kind of input is boiled down to one thing, a "stick": { x, y }, where x is how far
// right and y is how far up the player wants to go, as seen on the screen, each from -1 to 1
// and never longer than 1 overall. From there it is the same whatever made it:
//   a stick (on the screen) -> a direction in the world -> a force on the marble.

const NO_STICK = { x: 0, y: 0 };

// How hard the marble is pushed at full stick, in units a second a second (its mass is 1).
const STEER_FORCE = 22;
// The speed above which pushing stops helping: a marble can be rolled faster than this by a
// slope, but not by the player.
const TOP_SPEED = 10;
// How much of the push there is when the marble is in the air, where there is nothing to push against.
const AIR_CONTROL = 0.25;

// A stick can't be longer than 1: a stick pushed to its corner is still only as strong as one
// pushed straight up, or going diagonally would be faster than going straight.
function clampStick(stick) {
  const length = Math.hypot(stick.x, stick.y);
  if (length <= 1) return { x: stick.x, y: stick.y };
  return { x: stick.x / length, y: stick.y / length };
}

// The stick for the keys held down: the arrow keys and WASD. `held` is a set of
// KeyboardEvent.code values. Opposite keys cancel, and a diagonal is as strong as a straight line.
const KEYS = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
};

function keyboardStick(held) {
  const any = (codes) => (codes.some((code) => held.has(code)) ? 1 : 0);
  return clampStick({ x: any(KEYS.right) - any(KEYS.left), y: any(KEYS.up) - any(KEYS.down) });
}

// Two sticks as one, for a player with a hand on the keys and a thumb on the screen.
function combineSticks(a, b) {
  return clampStick({ x: a.x + b.x, y: a.y + b.y });
}

// Which way, in the world, a stick points. The camera looks across the course from a corner, so
// "up on the screen" is not along an axis of the world but away from the camera along the
// diagonal, and "right on the screen" is at right angles to that. `alpha` is the angle round the
// vertical that the camera sits at (ISO_ALPHA, from camera.js). The camera is at
// (cos alpha, sin alpha) from what it looks at, so up on the screen is the other way, and right
// is that turned a quarter turn. The result is flat (y is 0) and as long as the stick is.
function worldDirection(stick, alpha) {
  const forward = { x: -Math.cos(alpha), z: -Math.sin(alpha) }; // away from the camera, along the ground
  const right = { x: forward.z, z: -forward.x }; // a quarter turn from forward, to the right on the screen
  return {
    x: right.x * stick.x + forward.x * stick.y,
    y: 0,
    z: right.z * stick.x + forward.z * stick.y,
  };
}

// The force to push the marble with: the direction the stick points in the world, at full
// strength, but fading to nothing as the marble gets to TOP_SPEED *in that direction*, and
// stronger when it is going the other way, so it can turn round quickly. In the air there is a
// quarter of the push. `velocity` is the marble's velocity, { x, y, z }.
function steeringForce(direction, velocity, grounded) {
  const length = Math.hypot(direction.x, direction.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  const unit = { x: direction.x / length, z: direction.z / length };
  const along = velocity.x * unit.x + velocity.z * unit.z; // how fast it is already going that way
  const fade = Math.min(2, Math.max(0, 1 - along / TOP_SPEED));
  const strength = STEER_FORCE * length * fade * (grounded ? 1 : AIR_CONTROL);
  return { x: unit.x * strength, y: 0, z: unit.z * strength };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NO_STICK, STEER_FORCE, TOP_SPEED, AIR_CONTROL, KEYS, clampStick, keyboardStick, combineSticks, worldDirection, steeringForce };
} else {
  Object.assign(window, { NO_STICK, STEER_FORCE, TOP_SPEED, AIR_CONTROL, KEYS, clampStick, keyboardStick, combineSticks, worldDirection, steeringForce });
}
```

Things to notice:

- **`clampStick`: a corner is not further than a side.** Press up and right together and the stick would be `(1, 1)`, which is 1.41 long: a diagonal faster than a straight line. Shortening anything longer than 1 back to exactly 1 (keeping its direction) fixes it. Everything that makes a stick passes through it.
- **`keyboardStick` takes a set of held keys,** not events, and works out the stick for that set. Opposite keys cancel. Two keys that mean the same (W and the up arrow) don't add up, because each direction is a 0 or a 1, not a count.
- **`worldDirection` is where the camera comes in.** The camera looks across the course from a corner, so "up on the screen" is not along an axis of the world. It's *away from the camera*, along the ground, which is the diagonal. The camera sits at `(cos alpha, sin alpha)` from what it looks at, so up on the screen is the opposite of that, and right on the screen is that turned a quarter turn. The stick's `x` and `y` then just say how much of each to go. It takes the camera's `alpha`, so if the camera ever turned, the controls would turn with it.
- **The direction is flat.** `y` is always 0: pushing never lifts the marble, and gravity and the floor decide what happens vertically.
- **`steeringForce` is the push.** It points the way the stick points, at full strength for a full stick. Three things shape it:
  - **It fades as the marble nears `TOP_SPEED` *in that direction*.** A marble that is already rolling at the top speed gets no more help, which stops it from going faster and faster. Only the speed *along* the push counts: a marble falling fast, or rolling across the push, still gets all of it.
  - **It is stronger when the marble is going the other way,** up to twice as strong. A heavy ball that is rolling one way would take a long time to turn if you only pushed with the normal force. Pushing harder when you're going against it makes it turn quickly, which feels responsive.
  - **It is weaker in the air** (`AIR_CONTROL`, a quarter). There is nothing to push against.
- **A force, not a speed.** The marble isn't told "go this fast". It is pushed, so it accelerates, keeps its speed when you let go (slowing only by the damping), and rolls on down slopes whatever you do. That is what makes it a marble, and not a cursor.

Now the tests. Replace the placeholder `tests/steering.tests.js` with the first part of them:

```js
QUnit.module("clampStick", () => {
  QUnit.test("leaves a stick that is not too long as it is", (assert) => {
    assert.deepEqual(clampStick({ x: 0.3, y: -0.4 }), { x: 0.3, y: -0.4 });
  });

  QUnit.test("shortens one that is longer than 1 to exactly 1, keeping its direction", (assert) => {
    const stick = clampStick({ x: 3, y: 4 });

    assert.true(Math.abs(Math.hypot(stick.x, stick.y) - 1) < 1e-9);
    assert.true(Math.abs(stick.x / stick.y - 0.75) < 1e-9);
  });

  QUnit.test("a stick pushed into a corner is only as long as one pushed straight", (assert) => {
    const corner = clampStick({ x: 1, y: 1 });

    assert.true(Math.abs(Math.hypot(corner.x, corner.y) - 1) < 1e-9);
  });

  QUnit.test("doesn't change what it was given", (assert) => {
    const stick = { x: 3, y: 4 };

    clampStick(stick);

    assert.deepEqual(stick, { x: 3, y: 4 });
  });
});

QUnit.module("keyboardStick", () => {
  const held = (...codes) => new Set(codes);

  QUnit.test("no keys is no stick", (assert) => {
    assert.deepEqual(keyboardStick(held()), NO_STICK);
  });

  QUnit.test("each arrow key is a push the way it says", (assert) => {
    assert.deepEqual(keyboardStick(held("ArrowRight")), { x: 1, y: 0 });
    assert.deepEqual(keyboardStick(held("ArrowLeft")), { x: -1, y: 0 });
    assert.deepEqual(keyboardStick(held("ArrowUp")), { x: 0, y: 1 });
    assert.deepEqual(keyboardStick(held("ArrowDown")), { x: 0, y: -1 });
  });

  QUnit.test("W, A, S and D do the same", (assert) => {
    assert.deepEqual(keyboardStick(held("KeyD")), keyboardStick(held("ArrowRight")));
    assert.deepEqual(keyboardStick(held("KeyA")), keyboardStick(held("ArrowLeft")));
    assert.deepEqual(keyboardStick(held("KeyW")), keyboardStick(held("ArrowUp")));
    assert.deepEqual(keyboardStick(held("KeyS")), keyboardStick(held("ArrowDown")));
  });

  QUnit.test("opposite keys cancel", (assert) => {
    assert.deepEqual(keyboardStick(held("ArrowLeft", "ArrowRight")), NO_STICK);
    assert.deepEqual(keyboardStick(held("KeyW", "KeyS")), NO_STICK);
  });

  QUnit.test("two keys that mean the same thing aren't twice as strong", (assert) => {
    assert.deepEqual(keyboardStick(held("ArrowUp", "KeyW")), { x: 0, y: 1 });
  });

  QUnit.test("a diagonal is as strong as a straight push, not stronger", (assert) => {
    const stick = keyboardStick(held("ArrowUp", "ArrowRight"));

    assert.true(Math.abs(Math.hypot(stick.x, stick.y) - 1) < 1e-9);
    assert.true(stick.x > 0 && stick.y > 0);
  });

  QUnit.test("other keys do nothing", (assert) => {
    assert.deepEqual(keyboardStick(held("KeyR", "Space", "KeyC")), NO_STICK);
  });

  QUnit.test("the keys for each direction are all different, so none steals another's", (assert) => {
    const all = Object.values(KEYS).flat();

    assert.strictEqual(new Set(all).size, all.length);
  });
});

QUnit.module("combineSticks", () => {
  QUnit.test("two pushes the same way are one push, no stronger than a full one", (assert) => {
    assert.deepEqual(combineSticks({ x: 1, y: 0 }, { x: 1, y: 0 }), { x: 1, y: 0 });
  });

  QUnit.test("two pushes against each other cancel", (assert) => {
    assert.deepEqual(combineSticks({ x: 1, y: 0 }, { x: -1, y: 0 }), NO_STICK);
  });

  QUnit.test("one stick on its own comes through", (assert) => {
    assert.deepEqual(combineSticks({ x: 0.5, y: 0.25 }, NO_STICK), { x: 0.5, y: 0.25 });
  });

  QUnit.test("a push this way and a push that way make one diagonal", (assert) => {
    const stick = combineSticks({ x: 1, y: 0 }, { x: 0, y: 1 });

    assert.true(stick.x > 0 && stick.y > 0);
    assert.true(Math.abs(Math.hypot(stick.x, stick.y) - 1) < 1e-9);
  });
});

QUnit.module("worldDirection", () => {
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  QUnit.test("no stick is no direction", (assert) => {
    const d = worldDirection(NO_STICK, ISO_ALPHA);

    assert.true(near(d.x, 0) && near(d.y, 0) && near(d.z, 0));
  });

  QUnit.test("is flat: a push never lifts the marble", (assert) => {
    assert.strictEqual(worldDirection({ x: 0.3, y: 0.9 }, ISO_ALPHA).y, 0);
  });

  QUnit.test("is as long as the stick", (assert) => {
    for (const stick of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 0.6, y: 0.8 }, { x: 0.2, y: -0.1 }]) {
      const d = worldDirection(stick, ISO_ALPHA);
      assert.true(near(Math.hypot(d.x, d.z), Math.hypot(stick.x, stick.y)), JSON.stringify(stick));
    }
  });

  QUnit.test("up on the screen is away from the camera: the camera sits at (+x, -z), so up is toward (-x, +z)", (assert) => {
    const d = worldDirection({ x: 0, y: 1 }, ISO_ALPHA);

    assert.true(d.x < 0 && d.z > 0);
    assert.true(near(Math.abs(d.x), Math.abs(d.z)), "along the diagonal");
  });

  QUnit.test("right on the screen is a quarter turn from up, toward (+x, +z)", (assert) => {
    const d = worldDirection({ x: 1, y: 0 }, ISO_ALPHA);

    assert.true(d.x > 0 && d.z > 0);
  });

  QUnit.test("right and up are at right angles", (assert) => {
    const right = worldDirection({ x: 1, y: 0 }, ISO_ALPHA);
    const up = worldDirection({ x: 0, y: 1 }, ISO_ALPHA);

    assert.true(near(right.x * up.x + right.z * up.z, 0));
  });

  QUnit.test("down is the opposite of up, and left the opposite of right", (assert) => {
    const up = worldDirection({ x: 0, y: 1 }, ISO_ALPHA);
    const down = worldDirection({ x: 0, y: -1 }, ISO_ALPHA);
    const right = worldDirection({ x: 1, y: 0 }, ISO_ALPHA);
    const left = worldDirection({ x: -1, y: 0 }, ISO_ALPHA);

    assert.true(near(up.x, -down.x) && near(up.z, -down.z));
    assert.true(near(right.x, -left.x) && near(right.z, -left.z));
  });

  QUnit.test("turning the camera turns the directions with it", (assert) => {
    // A camera at alpha = 0 sits on the +x side, looking toward -x: up is -x.
    const d = worldDirection({ x: 0, y: 1 }, 0);

    assert.true(near(d.x, -1) && near(d.z, 0));
  });

  QUnit.test("a stick that is a mix is the same mix of the two directions", (assert) => {
    const mix = worldDirection({ x: 0.5, y: 0.5 }, ISO_ALPHA);
    const right = worldDirection({ x: 0.5, y: 0 }, ISO_ALPHA);
    const up = worldDirection({ x: 0, y: 0.5 }, ISO_ALPHA);

    assert.true(near(mix.x, right.x + up.x) && near(mix.z, right.z + up.z));
  });
});

QUnit.module("steeringForce", () => {
  const still = { x: 0, y: 0, z: 0 };
  const east = { x: 1, y: 0, z: 0 };

  QUnit.test("no direction is no force", (assert) => {
    assert.deepEqual(steeringForce({ x: 0, y: 0, z: 0 }, still, true), { x: 0, y: 0, z: 0 });
  });

  QUnit.test("a marble that isn't moving is pushed with the full force, the way the stick points", (assert) => {
    const f = steeringForce(east, still, true);

    assert.true(Math.abs(f.x - STEER_FORCE) < 1e-9);
    assert.strictEqual(f.z, 0);
  });

  QUnit.test("it never pushes up or down", (assert) => {
    assert.strictEqual(steeringForce({ x: 0.3, y: 0, z: 0.4 }, still, true).y, 0);
  });

  QUnit.test("a half-strength stick is a half-strength push", (assert) => {
    assert.true(Math.abs(steeringForce({ x: 0.5, y: 0, z: 0 }, still, true).x - STEER_FORCE / 2) < 1e-9);
  });

  QUnit.test("the push fades as the marble nears top speed in that direction", (assert) => {
    const slow = steeringForce(east, { x: 2, y: 0, z: 0 }, true).x;
    const fast = steeringForce(east, { x: 8, y: 0, z: 0 }, true).x;

    assert.true(fast < slow);
  });

  QUnit.test("at top speed in that direction there is no push at all, and above it, none either", (assert) => {
    assert.strictEqual(steeringForce(east, { x: TOP_SPEED, y: 0, z: 0 }, true).x, 0);
    assert.strictEqual(steeringForce(east, { x: TOP_SPEED * 3, y: 0, z: 0 }, true).x, 0);
  });

  QUnit.test("a marble going the other way is pushed harder, so it can turn round, but no more than twice as hard", (assert) => {
    const back = steeringForce(east, { x: -TOP_SPEED / 2, y: 0, z: 0 }, true).x;
    const way = steeringForce(east, { x: -TOP_SPEED * 5, y: 0, z: 0 }, true).x;

    assert.true(back > STEER_FORCE);
    assert.true(Math.abs(way - STEER_FORCE * 2) < 1e-9);
  });

  QUnit.test("speed across the push doesn't make it fade: only speed along it counts", (assert) => {
    const f = steeringForce(east, { x: 0, y: 0, z: TOP_SPEED * 2 }, true);

    assert.true(Math.abs(f.x - STEER_FORCE) < 1e-9);
  });

  QUnit.test("falling doesn't make it fade either: only the flat speed counts", (assert) => {
    const f = steeringForce(east, { x: 0, y: -50, z: 0 }, true);

    assert.true(Math.abs(f.x - STEER_FORCE) < 1e-9);
  });

  QUnit.test("in the air there is only AIR_CONTROL of the push", (assert) => {
    const ground = steeringForce(east, still, true).x;
    const air = steeringForce(east, still, false).x;

    assert.true(Math.abs(air - ground * AIR_CONTROL) < 1e-9);
    assert.true(AIR_CONTROL > 0 && AIR_CONTROL < 1);
  });

  QUnit.test("the force points the way of the direction, whatever its length", (assert) => {
    const f = steeringForce({ x: 0.6, y: 0, z: 0.8 }, still, true);

    assert.true(Math.abs(f.x / f.z - 0.75) < 1e-9);
  });
});
```

Add the script and its tests to `tests.html`, after `course.js` and `course.tests.js`:

```html
  <script src="js/steering.js"></script>
```
```html
  <script src="tests/steering.tests.js"></script>
```

Reload `tests.html`. You should see **115 passing tests** (the 79, plus 36). Look at the `worldDirection` tests. They check that up and right are at right angles, that down is the opposite of up, and that turning the camera turns the directions with it. They can't yet check that "up" really is up *on the screen*, because that needs a real camera, and Step 2 has one.

---

## Step 2: The marble can be pushed

Open `js/marble.js`. Three changes: where the marble starts, a way to tell if it is on the ground, and a way to push it.

### 2a. Start on the deck

The marble used to start over the ramp so it rolled by itself. Now the player rolls it, so it starts over the flat start deck, at rest. Change the start, and add a constant directly above `FALL_LIMIT`:

```js
const MARBLE_START = { x: -11, y: 5, z: 0 }; // above the start deck, to be dropped from
const GROUND_REACH = 0.15; // how far below its underside a floor can be for the marble to count as on it
```

### 2b. On the ground, and pushed

Add these two getters and a method **inside the class**, directly above the comment that begins `// Puts the marble back at its start`:

```js
  // Which way, and how fast, it is going: { x, y, z }.
  get velocity() {
    const v = this.aggregate.body.getLinearVelocity();
    return { x: v.x, y: v.y, z: v.z };
  }

  // Whether it is on the ground: a ray from the middle of the marble, straight down, finds a floor
  // no further away than the marble's radius and a little more. (The physics does know what is
  // touching what, but a ray is the simple way to ask, and it lets a marble that is only just off
  // the floor count.) Only things with a physics body count, which here is the course.
  get grounded() {
    const ray = new BABYLON.Ray(this.mesh.position, BABYLON.Vector3.Down(), MARBLE_RADIUS + GROUND_REACH);
    const hit = this.mesh.getScene().pickWithRay(ray, (mesh) => mesh !== this.mesh && mesh.physicsBody);
    return Boolean(hit && hit.hit);
  }

  // Pushes the marble: `direction` is the way, in the world, with a length from 0 to 1 for how
  // hard. Call it every frame the player is pushing. The force comes from steeringForce, which
  // fades near top speed and is weaker in the air, and is given to the physics at the marble's
  // middle, so it pushes it along without making it spin by itself.
  push(direction) {
    const force = steeringForce(direction, this.velocity, this.grounded);
    if (force.x === 0 && force.z === 0) return;
    this.aggregate.body.applyForce(new BABYLON.Vector3(force.x, force.y, force.z), this.mesh.position);
  }
```

and update the export block at the bottom:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, GROUND_REACH, FALL_LIMIT, hasFallen, makeSteel, Marble };
} else {
  Object.assign(window, { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, GROUND_REACH, FALL_LIMIT, hasFallen, makeSteel, Marble });
}
```

Things to notice:

- **`grounded` looks, rather than asking the physics.** A ray from the middle of the marble, straight down, finds the floor if it is no further than the marble's radius plus `GROUND_REACH`. The small extra is what makes a marble that is bouncing a little, or sitting on a slope, still count: it is on the ground for the player even if, for a moment, it isn't quite touching.
- **The filter `mesh.physicsBody`** means only things that are bodies in the physics count as ground: the course, not the marble's own mesh, and not anything that is only for show.
- **`push` hands the force to the physics,** at the marble's *middle*. A push through the centre of a ball moves it along. A push at the edge would also spin it, and the spin would come from where you pushed instead of from the floor. Friction with the floor does the spinning, which is what makes the marble roll instead of slide.
- **`applyForce` is called every frame the player is pushing.** A force acts for as long as it is applied: one frame's worth of push is a small change of speed, and sixty of them a second is a steady acceleration. (If you called it once, you'd get one small nudge.)
- **Havok puts a body to sleep when it has been still for a while,** to save work, and applying a force wakes it. There's a test for exactly that: a marble that has sat for ten seconds still responds.

### 2c. Tests

The old test *"a marble that has fallen can be reset and rolls again"* said the marble rolled down the ramp, which it no longer does from its new start. Replace its last lines (everything after the `marble.reset();` line) with:

```js
    stepPhysics(scene, 3);

    assert.false(hasFallen(marble.position.y));
    assert.true(Math.abs(marble.position.y - (4 + MARBLE_RADIUS)) < 0.03, "and it has landed on the start deck again");
  });
```

and in *"reset() puts it back at the start, with no speed and no spin"*, the first line is `stepPhysics(scene, 2);`. Change it to run for 0.3 seconds (the marble is falling then, so it is moving):

```js
    stepPhysics(scene, 0.3); // falling
```

Then add the new tests to the **end** of the file:

```js
// A floor big enough to roll about on, so a push can be watched for a long time without the
// marble running out of course.
const BIG_FLOOR = [{ name: "big floor", from: [-100, 0], to: [100, 0], z: 0, depth: 100 }];

QUnit.module("grounded", (hooks) => {
  let engine;
  let scene;
  let marble;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene);
    marble = new Marble(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  const placeAt = (x, y, z) => {
    marble.start = { x, y, z };
    marble.reset();
  };

  QUnit.test("a marble resting on a floor is on the ground", (assert) => {
    placeAt(-10, 4.6, 0);
    stepPhysics(scene, 2);

    assert.true(marble.grounded);
  });

  QUnit.test("one in the air is not", (assert) => {
    placeAt(-10, 9, 0);

    assert.false(marble.grounded);
  });

  QUnit.test("one that has rolled off the side of the course is not, though nothing is under it", (assert) => {
    placeAt(-10, 4.6, 20);

    assert.false(marble.grounded);
  });

  QUnit.test("one on a ramp is on the ground", (assert) => {
    placeAt(0, 2.6, 0);
    stepPhysics(scene, 0.5);

    assert.true(marble.grounded);
  });

  QUnit.test("it does not count the marble itself as the floor", (assert) => {
    placeAt(100, 50, 100); // nothing anywhere near

    assert.false(marble.grounded);
  });

  QUnit.test("one that has just left the floor, by more than GROUND_REACH, is not on the ground", (assert) => {
    placeAt(-10, 4 + MARBLE_RADIUS + GROUND_REACH + 0.2, 0);

    assert.false(marble.grounded);
  });

  QUnit.test("one that is only just off the floor, within GROUND_REACH, still is: a bounce is not flying", (assert) => {
    placeAt(-10, 4 + MARBLE_RADIUS + GROUND_REACH / 2, 0);

    assert.true(marble.grounded);
  });
});

QUnit.module("pushing the marble", (hooks) => {
  let engine;
  let scene;
  let marble;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene, BIG_FLOOR);
    marble = new Marble(scene);
    marble.start = { x: -50, y: 0.6, z: 0 };
    marble.reset();
    stepPhysics(scene, 1); // let it settle
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // Pushes the marble every frame for `seconds`, the way the game does.
  const pushFor = (direction, seconds) => {
    for (let t = 0; t < seconds - 1e-9; t += 1 / 60) {
      marble.push(direction);
      stepPhysics(scene, 1 / 60);
    }
  };

  QUnit.test("a marble that is not pushed stays where it is", (assert) => {
    const x = marble.position.x;

    stepPhysics(scene, 2);

    assert.true(Math.abs(marble.position.x - x) < 0.05);
  });

  QUnit.test("pushing it sets it rolling the way it is pushed", (assert) => {
    const x = marble.position.x;

    pushFor({ x: 1, y: 0, z: 0 }, 1);

    assert.true(marble.position.x > x + 3, `moved ${marble.position.x - x}`);
    assert.true(marble.velocity.x > 3);
    assert.true(Math.abs(marble.velocity.z) < 0.1, "and not sideways");
  });

  QUnit.test("it keeps to the floor: a push along the ground doesn't lift it", (assert) => {
    pushFor({ x: 1, y: 0, z: 0 }, 1);

    assert.true(Math.abs(marble.position.y - MARBLE_RADIUS) < 0.05, `${marble.position.y}`);
  });

  QUnit.test("it rolls, it doesn't slide: pushed along, it is turning too", (assert) => {
    pushFor({ x: 1, y: 0, z: 0 }, 1);

    assert.true(marble.aggregate.body.getAngularVelocity().length() > 2);
  });

  QUnit.test("pushing the other way sends it the other way", (assert) => {
    const z = marble.position.z;

    pushFor({ x: 0, y: 0, z: -1 }, 1);

    assert.true(marble.position.z < z - 3);
  });

  QUnit.test("a half push is a gentler push", (assert) => {
    pushFor({ x: 0.5, y: 0, z: 0 }, 1);
    const gentle = marble.velocity.x;
    marble.reset();
    stepPhysics(scene, 1);

    pushFor({ x: 1, y: 0, z: 0 }, 1);

    assert.true(gentle < marble.velocity.x * 0.75, `${gentle} against ${marble.velocity.x}`);
  });

  QUnit.test("pushing with no direction does nothing, and doesn't mind being asked", (assert) => {
    pushFor({ x: 0, y: 0, z: 0 }, 1);

    assert.true(marble.speed < 0.05);
  });

  QUnit.test("however long it is pushed, it doesn't go much past TOP_SPEED", (assert) => {
    pushFor({ x: 1, y: 0, z: 0 }, 6);

    assert.true(marble.speed > TOP_SPEED * 0.7, `${marble.speed}`);
    assert.true(marble.speed < TOP_SPEED * 1.1, `${marble.speed}`);
  });

  QUnit.test("it can turn round: pushed back the other way it slows, stops and comes back", (assert) => {
    pushFor({ x: 1, y: 0, z: 0 }, 2);
    assert.true(marble.velocity.x > 5);

    pushFor({ x: -1, y: 0, z: 0 }, 2);

    assert.true(marble.velocity.x < 0, `${marble.velocity.x}`);
  });

  QUnit.test("a push in the air is much weaker than one on the ground", (assert) => {
    marble.start = { x: -50, y: 40, z: 0 };
    marble.reset();
    pushFor({ x: 1, y: 0, z: 0 }, 0.5);
    const air = marble.velocity.x;
    marble.start = { x: -50, y: 0.6, z: 0 };
    marble.reset();
    stepPhysics(scene, 1);

    pushFor({ x: 1, y: 0, z: 0 }, 0.5);

    assert.true(air < marble.velocity.x * 0.5, `${air} against ${marble.velocity.x}`);
    assert.true(air > 0, "but it isn't nothing");
  });

  QUnit.test("it wakes up a marble that has been at rest long enough to go to sleep", (assert) => {
    stepPhysics(scene, 10);

    pushFor({ x: 1, y: 0, z: 0 }, 0.5);

    assert.true(marble.velocity.x > 1, `${marble.velocity.x}`);
  });
});

// The controls are given to the player as seen on the screen: up is up on the screen. Whether a
// push really goes that way on the screen is checked here, with a real camera.
QUnit.module("pushing, as seen on the screen", (hooks) => {
  let engine;
  let scene;
  let marble;
  let camera;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene, BIG_FLOOR);
    camera = new BABYLON.ArcRotateCamera("camera", ISO_ALPHA, ISO_BETA, CAMERA_RADIUS, BABYLON.Vector3.Zero(), scene);
    camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    marble = new Marble(scene);
    marble.start = { x: 0, y: 0.6, z: 0 };
    marble.reset();
    stepPhysics(scene, 1);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // How far the marble went across the screen (x, right is positive) and up it (y), after being
  // pushed with a stick for a second. The camera's view matrix turns a move in the world into
  // a move as the camera sees it.
  const movedOnScreen = (stick) => {
    const before = marble.position.clone();
    for (let t = 0; t < 1; t += 1 / 60) {
      marble.push(worldDirection(stick, camera.alpha));
      stepPhysics(scene, 1 / 60);
    }
    const moved = marble.position.subtract(before);
    const view = BABYLON.Vector3.TransformNormal(moved, camera.getViewMatrix(true));
    return { x: view.x, y: view.y };
  };

  QUnit.test("pushing the stick up rolls the marble up the screen, and not sideways across it", (assert) => {
    const { x, y } = movedOnScreen({ x: 0, y: 1 });

    assert.true(y > 1, `up ${y}`);
    assert.true(Math.abs(x) < 0.15, `across ${x}`);
  });

  QUnit.test("pushing it down rolls it down the screen", (assert) => {
    const { x, y } = movedOnScreen({ x: 0, y: -1 });

    assert.true(y < -1, `up ${y}`);
    assert.true(Math.abs(x) < 0.15, `across ${x}`);
  });

  QUnit.test("pushing it right rolls it right across the screen, and not up or down", (assert) => {
    const { x, y } = movedOnScreen({ x: 1, y: 0 });

    assert.true(x > 1, `across ${x}`);
    assert.true(Math.abs(y) < 0.15, `up ${y}`);
  });

  QUnit.test("pushing it left rolls it left", (assert) => {
    const { x } = movedOnScreen({ x: -1, y: 0 });

    assert.true(x < -1, `across ${x}`);
  });

  QUnit.test("a diagonal push goes diagonally on the screen: up and right", (assert) => {
    const { x, y } = movedOnScreen({ x: 0.7, y: 0.7 });

    assert.true(x > 0.5 && y > 0.5, `${x}, ${y}`);
  });
});
```

Reload `tests.html`: **23 more** tests (**138** in all). These are the tests to read:

- *"it keeps to the floor: a push along the ground doesn't lift it"* and *"it rolls, it doesn't slide: pushed along, it is turning too"* check the physics does what you expect from a push through the middle.
- *"however long it is pushed, it doesn't go much past TOP_SPEED"* pushes for six seconds, and checks the speed levels off between 70% and 110% of the top speed. That is the force fading and the damping working together.
- *"it can turn round"* pushes one way for two seconds and then the other, and checks the marble ends up going back.
- *"a push in the air is much weaker than one on the ground"* and *"it wakes up a marble that has been at rest..."* cover the other two things.
- **The last module is the one that checks the whole idea.** *"pushing the stick up rolls the marble up the screen, and not sideways across it"* makes a real camera, pushes the marble for a second, and sends how far it went through the **camera's view matrix** to see it the way the camera does. If the diagonal maths of Step 1 were wrong, this is where you'd find out: it would go up *and* across, or down.

---

## Step 3: A stick under a thumb

On a phone there are no keys. The player touches the screen and drags, and wherever the thumb first lands is the middle of a **virtual stick**: moving it from there pushes the stick that way. Back in `js/steering.js`, add these directly above the comment that begins `// Plain <script> include`:

```js
// How far a thumb has to move from where it touched down to push the stick all the way: a
// fraction of the screen's smaller side, but never less than a minimum, so it is a comfortable
// thumb's length on a phone and on a tablet.
const STICK_RADIUS_FRACTION = 0.12;
const STICK_MIN_RADIUS = 40; // in pixels
// A thumb never keeps perfectly still, so a stick pushed less than this much counts as not pushed.
const STICK_DEAD_ZONE = 0.12;

function stickRadiusFor(width, height) {
  return Math.max(STICK_MIN_RADIUS, Math.min(width, height) * STICK_RADIUS_FRACTION);
}

// A stick made by a thumb on the screen. Wherever the thumb first touches is the middle of the
// stick, and moving it from there pushes the stick that way, as far as `radius` pixels for full
// strength. It never looks at the screen: it is told where the finger is. Like the swipes in the
// Parkour Runner, it follows one finger and ignores any other.
class TouchStick {
  constructor({ radius = 80, deadZone = STICK_DEAD_ZONE } = {}) {
    this.radius = radius;
    this.deadZone = deadZone;
    this.id = null; // the finger that is making the stick
    this.originX = 0; // where it touched down: the middle of the stick
    this.originY = 0;
    this.value = { x: 0, y: 0 }; // the stick, as the rest of the game wants it
    this.knob = { x: 0, y: 0 }; // how far, in pixels, the thumb is from the middle, kept within the radius, to draw it
  }

  get active() {
    return this.id !== null;
  }

  // A finger has touched down. Only one makes the stick. Says whether this one does.
  start(id, x, y) {
    if (this.active) return false;
    this.id = id;
    this.originX = x;
    this.originY = y;
    this.value = { x: 0, y: 0 };
    this.knob = { x: 0, y: 0 };
    return true;
  }

  // The finger has moved. On a screen y grows downward, and on a stick up is positive, so y is turned over.
  move(id, x, y) {
    if (id !== this.id) return false;
    const dx = x - this.originX;
    const dy = y - this.originY;
    const distance = Math.hypot(dx, dy);
    const reach = Math.min(1, this.radius / (distance || 1)); // how much of the way to the thumb the knob can go
    this.knob = { x: dx * reach, y: dy * reach };

    const pushed = clampStick({ x: dx / this.radius, y: -dy / this.radius });
    const strength = Math.hypot(pushed.x, pushed.y);
    if (strength < this.deadZone) {
      this.value = { x: 0, y: 0 };
    } else {
      const scaled = (strength - this.deadZone) / (1 - this.deadZone); // just past the dead zone is 0, not a jump
      this.value = { x: (pushed.x / strength) * scaled, y: (pushed.y / strength) * scaled };
    }
    return true;
  }

  // The finger has lifted: the stick is let go. Says whether it was this finger.
  end(id) {
    if (id !== this.id) return false;
    this.id = null;
    this.value = { x: 0, y: 0 };
    this.knob = { x: 0, y: 0 };
    return true;
  }
}
```

and replace the export block at the bottom with one that adds the new names:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { NO_STICK, STEER_FORCE, TOP_SPEED, AIR_CONTROL, KEYS, STICK_RADIUS_FRACTION, STICK_MIN_RADIUS, STICK_DEAD_ZONE, clampStick, keyboardStick, combineSticks, worldDirection, steeringForce, stickRadiusFor, TouchStick };
} else {
  Object.assign(window, { NO_STICK, STEER_FORCE, TOP_SPEED, AIR_CONTROL, KEYS, STICK_RADIUS_FRACTION, STICK_MIN_RADIUS, STICK_DEAD_ZONE, clampStick, keyboardStick, combineSticks, worldDirection, steeringForce, stickRadiusFor, TouchStick });
}
```

Things to notice:

- **The stick appears where the thumb lands,** not in a fixed corner. A fixed on-screen stick makes the player look at it, and puts a thumb in the same place whatever hand they hold the phone in. A floating one means they can steer with their eyes on the marble.
- **Its size scales with the screen.** `stickRadiusFor` is a fraction (12%) of the smaller side, but never less than 40 pixels: a comfortable thumb's reach on a phone and on a tablet.
- **The dead zone** (12% of the radius) means a stick pushed less than that counts as not pushed. A thumb never keeps perfectly still, and without it a resting thumb would creep the marble along. **The push is rescaled to begin at the edge of the dead zone,** so just past it is almost nothing and not a sudden jump to 12%.
- **`y` is turned over.** On a screen, `y` gets bigger going *down*; on a stick, up is positive. Dragging the thumb up the screen is `dy` negative, and the stick's `y` is `-dy`.
- **`knob`** is where to draw the knob, in pixels from the middle: where the thumb is, but never further than the radius. It's kept separately from `value` because they differ: the stick stops at full, but the thumb can go on.
- **One finger.** Like the swipes in the Parkour Runner, `start` says whether this finger is *the* finger, and a second one is ignored, so a thumb resting on the screen can't confuse it.

Add the rest of the tests to the **end** of `tests/steering.tests.js`:

```js
QUnit.module("stickRadiusFor", () => {
  QUnit.test("is a fraction of the smaller side of the screen", (assert) => {
    assert.true(Math.abs(stickRadiusFor(1000, 800) - 800 * STICK_RADIUS_FRACTION) < 1e-9);
    assert.true(Math.abs(stickRadiusFor(800, 1000) - 800 * STICK_RADIUS_FRACTION) < 1e-9);
  });

  QUnit.test("is never less than the minimum, however small the screen", (assert) => {
    assert.strictEqual(stickRadiusFor(100, 100), STICK_MIN_RADIUS);
    assert.strictEqual(stickRadiusFor(0, 0), STICK_MIN_RADIUS);
  });

  QUnit.test("is bigger on a bigger screen", (assert) => {
    assert.true(stickRadiusFor(2000, 1500) > stickRadiusFor(800, 600));
  });
});

QUnit.module("TouchStick", () => {
  const make = () => new TouchStick({ radius: 100, deadZone: 0.1 });
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  QUnit.test("isn't being made by a finger to begin with, and the stick is not pushed", (assert) => {
    const stick = make();

    assert.false(stick.active);
    assert.deepEqual(stick.value, { x: 0, y: 0 });
  });

  QUnit.test("a finger going down starts it, and its first touch is the middle", (assert) => {
    const stick = make();

    assert.true(stick.start(1, 300, 400));

    assert.true(stick.active);
    assert.deepEqual(stick.value, { x: 0, y: 0 });
  });

  QUnit.test("a second finger is ignored while the first is down", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    assert.false(stick.start(2, 100, 100));
    assert.false(stick.move(2, 500, 400));
    assert.false(stick.end(2));
    assert.true(stick.active);
  });

  QUnit.test("moving right pushes the stick right", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 400, 400);

    assert.true(near(stick.value.x, 1) && near(stick.value.y, 0));
  });

  QUnit.test("moving UP the screen pushes the stick up, though y on a screen gets smaller going up", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 300, 300);

    assert.true(near(stick.value.x, 0) && near(stick.value.y, 1));
  });

  QUnit.test("moving down and to the left pushes it down and left", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 250, 450);

    assert.true(stick.value.x < 0 && stick.value.y < 0);
  });

  QUnit.test("a thumb that goes further than the radius pushes no harder than full strength", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 900, 400);

    assert.true(near(Math.hypot(stick.value.x, stick.value.y), 1));
  });

  QUnit.test("halfway to the radius is a push a little under half, because of the dead zone", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 350, 400);

    const strength = Math.hypot(stick.value.x, stick.value.y);
    assert.true(strength > 0.4 && strength < 0.5, `${strength}`);
  });

  QUnit.test("a thumb that hardly moves is no push, because of the dead zone", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 305, 398);

    assert.deepEqual(stick.value, { x: 0, y: 0 });
  });

  QUnit.test("the push grows smoothly from the dead zone's edge: just past it is almost nothing, not a jump", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 311, 400); // 0.11 of the radius, just past a dead zone of 0.1

    assert.true(stick.value.x > 0 && stick.value.x < 0.05, `${stick.value.x}`);
  });

  QUnit.test("the knob follows the thumb, but stays within the radius", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 340, 430);
    assert.deepEqual(stick.knob, { x: 40, y: 30 });

    stick.move(1, 700, 400);
    assert.true(near(Math.hypot(stick.knob.x, stick.knob.y), 100));
    assert.true(stick.knob.x > 0 && near(stick.knob.y, 0));
  });

  QUnit.test("the knob is drawn in screen directions: down is positive y, as on a screen", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);

    stick.move(1, 300, 450);

    assert.deepEqual(stick.knob, { x: 0, y: 50 });
  });

  QUnit.test("lifting the finger lets go: no push, and the knob goes back", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);
    stick.move(1, 400, 400);

    assert.true(stick.end(1));

    assert.false(stick.active);
    assert.deepEqual(stick.value, { x: 0, y: 0 });
    assert.deepEqual(stick.knob, { x: 0, y: 0 });
  });

  QUnit.test("after it is let go, the next touch starts a new stick with its own middle", (assert) => {
    const stick = make();
    stick.start(1, 300, 400);
    stick.end(1);

    assert.true(stick.start(2, 50, 60));
    stick.move(2, 150, 60);

    assert.true(near(stick.value.x, 1));
  });

  QUnit.test("a move or a lift from a finger that isn't the one making the stick does nothing", (assert) => {
    const stick = make();

    assert.false(stick.move(7, 100, 100));
    assert.false(stick.end(7));
  });

  QUnit.test("takes its radius and dead zone as options, with sensible ones if not given", (assert) => {
    const stick = new TouchStick();

    assert.true(stick.radius > 0);
    assert.strictEqual(stick.deadZone, STICK_DEAD_ZONE);
  });
});
```

Reload `tests.html`: **19 more** tests (**157** in all). *"moving UP the screen pushes the stick up, though y on a screen gets smaller going up"* is the one that guards the upside-down mistake. *"the push grows smoothly from the dead zone's edge"* guards the jump.

---

## Step 4: Listening to the page

The rules are done. Two small classes listen to the keys and the fingers and keep a stick up to date for the game to read. Open the placeholder `js/controls.js` and replace its contents with:

```js
// The controls: the part that listens to the page. The rules (what a stick is, which way it
// pushes) are in steering.js and need no page; these two classes only watch the keys and the
// fingers and keep a stick up to date for the game to read. See ../tests/controls.tests.js.

// The keys steer with: the arrow keys and WASD. Everything else (R to roll again, C for a
// screenshot) is left alone, so those still work.
const STEERING_KEYS = new Set(Object.values(KEYS).flat());

// Which keys are held right now, and the stick they make. `target` is what hears the keys
// (the window); it can be anything with addEventListener, so a test can give it its own.
class KeyboardInput {
  constructor(target = window) {
    this.target = target;
    this.held = new Set();

    this.listeners = {
      keydown: (event) => {
        if (!STEERING_KEYS.has(event.code)) return;
        event.preventDefault(); // the arrow keys otherwise scroll the page
        this.held.add(event.code);
      },
      keyup: (event) => this.held.delete(event.code),
      // A key held down while the window loses focus never gets its keyup, and would be held for ever.
      blur: () => this.held.clear(),
    };
    for (const [type, listener] of Object.entries(this.listeners)) target.addEventListener(type, listener);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STEERING_KEYS, KeyboardInput };
} else {
  Object.assign(window, { STEERING_KEYS, KeyboardInput });
}
```

Things to notice:

- **The class tracks which keys are held,** in a set, and the stick is worked out from that set when it's asked for. It doesn't try to remember "left was pressed before right": opposite keys simply cancel, whichever came first.
- **Only the steering keys are touched.** `preventDefault` is called for them (the arrow keys would otherwise scroll the page) and for nothing else, so `R` and `C` still work.
- **`blur` clears every key.** If the window loses focus while a key is held (alt-tab, a click on the address bar), the browser never sends its `keyup`, and the marble would roll for ever. This is a bug you only meet on a real keyboard, and it takes a long time to find.
- **`target` is a parameter** (`window` by default), so a test can give it a stand-in.

Add these methods **inside the class**, directly above its closing `}`:

```js
  // The stick the held keys make.
  get stick() {
    return keyboardStick(this.held);
  }

  dispose() {
    for (const [type, listener] of Object.entries(this.listeners)) this.target.removeEventListener(type, listener);
    this.held.clear();
  }
```

Replace the placeholder `tests/controls.tests.js` with the tests for the keyboard:

```js
// The controls need something to listen to. These tests give them stand-ins that remember their
// listeners, and send them events by hand.
QUnit.module("KeyboardInput", () => {
  class FakeTarget {
    constructor() {
      this.listeners = {};
    }
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
    removeEventListener(type) {
      delete this.listeners[type];
    }
    send(type, code) {
      const event = { code, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      if (this.listeners[type]) this.listeners[type](event);
      return event;
    }
  }

  const make = () => {
    const target = new FakeTarget();
    return { target, input: new KeyboardInput(target) };
  };

  QUnit.test("no keys are held to begin with, so there is no stick", (assert) => {
    const { input } = make();

    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("pressing a steering key makes a stick, and letting go ends it", (assert) => {
    const { target, input } = make();

    target.send("keydown", "ArrowRight");
    assert.deepEqual(input.stick, { x: 1, y: 0 });

    target.send("keyup", "ArrowRight");
    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("keys held together make a diagonal", (assert) => {
    const { target, input } = make();

    target.send("keydown", "KeyW");
    target.send("keydown", "KeyD");

    assert.true(input.stick.x > 0 && input.stick.y > 0);
  });

  QUnit.test("letting go of one of two keys leaves the other held", (assert) => {
    const { target, input } = make();
    target.send("keydown", "KeyW");
    target.send("keydown", "KeyD");

    target.send("keyup", "KeyD");

    assert.deepEqual(input.stick, { x: 0, y: 1 });
  });

  QUnit.test("a key held down repeats its keydown, which makes no difference", (assert) => {
    const { target, input } = make();

    target.send("keydown", "ArrowUp");
    target.send("keydown", "ArrowUp");
    target.send("keydown", "ArrowUp");
    target.send("keyup", "ArrowUp");

    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("the steering keys are stopped from scrolling the page", (assert) => {
    const { target } = make();

    assert.true(target.send("keydown", "ArrowDown").defaultPrevented);
  });

  QUnit.test("other keys are not touched, so R and C still do their own things", (assert) => {
    const { target, input } = make();

    for (const code of ["KeyR", "KeyC", "Space", "Escape"]) {
      assert.false(target.send("keydown", code).defaultPrevented, code);
    }
    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("losing focus lets go of every key, so none is stuck down", (assert) => {
    const { target, input } = make();
    target.send("keydown", "ArrowRight");
    target.send("keydown", "ArrowUp");

    target.send("blur");

    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("dispose() stops listening, and lets go of the keys", (assert) => {
    const { target, input } = make();
    target.send("keydown", "ArrowRight");

    input.dispose();
    target.send("keydown", "ArrowLeft");

    assert.deepEqual(Object.keys(target.listeners), []);
    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("STEERING_KEYS is every key the stick uses", (assert) => {
    assert.strictEqual(STEERING_KEYS.size, Object.values(KEYS).flat().length);
    assert.true(STEERING_KEYS.has("KeyW") && STEERING_KEYS.has("ArrowLeft"));
  });
});
```

Add the script and its tests to `tests.html`, after `marble.js` and `marble.tests.js`:

```html
  <script src="js/controls.js"></script>
```
```html
  <script src="tests/controls.tests.js"></script>
```

Reload `tests.html`: **10 more** tests (**167** in all).

### 4a. The thumb

Add this class to `js/controls.js`, directly above the comment that begins `// Plain <script> include`. It is shown closed, with its constructor:

```js
// A stick under a thumb: touch (or pen) anywhere on `element` and drag. A ring is drawn where
// the thumb first touched, with a knob in it that follows the thumb. A mouse is ignored, so a
// click on a desktop doesn't start a stick. `ring` and `knob` are the two elements that draw it.
class StickControls {
  constructor(element, { ring = null, knob = null } = {}) {
    this.element = element;
    this.ring = ring;
    this.knob = knob;
    this.touchStick = new TouchStick();

    this.listeners = {
      pointerdown: (event) => this._down(event),
      pointermove: (event) => this._move(event),
      pointerup: (event) => this._up(event),
      pointercancel: (event) => this._up(event),
    };
    for (const [type, listener] of Object.entries(this.listeners)) element.addEventListener(type, listener);
  }
}
```

Add these members **inside the class**, directly above its closing `}`:

```js
  // The stick the thumb makes.
  get value() {
    return this.touchStick.value;
  }

  _down(event) {
    if (event.pointerType === "mouse") return;
    this.touchStick.radius = stickRadiusFor(this.element.clientWidth, this.element.clientHeight);
    if (!this.touchStick.start(event.pointerId, event.clientX, event.clientY)) return;
    // Keep getting the finger's moves even if it slides off the element.
    if (this.element.setPointerCapture) this.element.setPointerCapture(event.pointerId);
    this._draw(event.clientX, event.clientY);
  }

  _move(event) {
    if (this.touchStick.move(event.pointerId, event.clientX, event.clientY)) this._draw(this.touchStick.originX, this.touchStick.originY);
  }

  _up(event) {
    if (this.touchStick.end(event.pointerId)) this._hide();
  }

  // Draws the ring, centred on (x, y), as big as the stick's reach, and the knob where the thumb is.
  _draw(x, y) {
    if (!this.ring || !this.knob) return;
    const radius = this.touchStick.radius;
    this.ring.style.width = this.ring.style.height = `${radius * 2}px`;
    this.ring.style.transform = `translate(${x - radius}px, ${y - radius}px)`;
    this.knob.style.transform = `translate(${this.touchStick.knob.x}px, ${this.touchStick.knob.y}px)`;
    this.ring.classList.remove("hidden");
  }

  _hide() {
    if (this.ring) this.ring.classList.add("hidden");
  }

  dispose() {
    for (const [type, listener] of Object.entries(this.listeners)) this.element.removeEventListener(type, listener);
    this.touchStick.end(this.touchStick.id);
    this._hide();
  }
```

and replace the export block with one that adds it:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STEERING_KEYS, KeyboardInput, StickControls };
} else {
  Object.assign(window, { STEERING_KEYS, KeyboardInput, StickControls });
}
```

Things to notice:

- **The same shape as the swipes in the Parkour Runner:** pointer events, the mouse ignored, one finger followed, `setPointerCapture` so the moves keep coming if the thumb slides off the canvas, and `pointercancel` handled like a lift.
- **The radius is worked out when the finger goes down,** from the canvas's size at that moment, so a window that has been resized is allowed for.
- **The drawing is separate from the stick.** The ring and the knob are two page elements that it moves. They are optional (`ring = null`): a game that doesn't want to draw a stick doesn't have to, and the tests don't need them.
- **The ring is centred where the finger went down,** and sized to the stick's reach; the knob moves inside it by `knob.x` and `knob.y`.

Add the rest of the tests to the **end** of `tests/controls.tests.js`:

```js
QUnit.module("StickControls", () => {
  class FakeElement {
    constructor() {
      this.listeners = {};
      this.clientWidth = 1000;
      this.clientHeight = 600;
      this.captured = [];
      this.style = {};
      this.classes = new Set(["hidden"]);
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        contains: (name) => this.classes.has(name),
      };
    }
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
    removeEventListener(type) {
      delete this.listeners[type];
    }
    setPointerCapture(id) {
      this.captured.push(id);
    }
    send(type, event) {
      if (this.listeners[type]) this.listeners[type]({ pointerType: "touch", pointerId: 1, clientX: 0, clientY: 0, ...event });
    }
  }

  const make = () => {
    const element = new FakeElement();
    const ring = new FakeElement();
    const knob = new FakeElement();
    const controls = new StickControls(element, { ring, knob });
    return { element, ring, knob, controls };
  };

  QUnit.test("listens for the four kinds of pointer event", (assert) => {
    const { element } = make();

    assert.deepEqual(Object.keys(element.listeners).sort(), ["pointercancel", "pointerdown", "pointermove", "pointerup"]);
  });

  QUnit.test("there is no stick until a finger touches", (assert) => {
    const { controls } = make();

    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("touching and dragging right makes a stick pointing right", (assert) => {
    const { element, controls } = make();

    element.send("pointerdown", { clientX: 200, clientY: 300 });
    element.send("pointermove", { clientX: 400, clientY: 300 });

    assert.true(controls.value.x > 0.9 && Math.abs(controls.value.y) < 1e-9);
  });

  QUnit.test("the radius comes from the size of the element, so a thumb's reach is about the same on any screen", (assert) => {
    const { element, controls } = make(); // 1000 x 600: a radius of 0.12 of 600 = 72

    element.send("pointerdown", { clientX: 200, clientY: 300 });

    assert.true(Math.abs(controls.touchStick.radius - 72) < 1e-9);
  });

  QUnit.test("the ring appears where the finger touched, as big as the stick's reach", (assert) => {
    const { element, ring } = make();

    element.send("pointerdown", { clientX: 200, clientY: 300 });

    assert.false(ring.classes.has("hidden"));
    assert.strictEqual(ring.style.width, "144px");
    assert.strictEqual(ring.style.transform, "translate(128px, 228px)");
  });

  QUnit.test("the knob follows the thumb, and the ring stays where it was", (assert) => {
    const { element, ring, knob } = make();
    element.send("pointerdown", { clientX: 200, clientY: 300 });

    element.send("pointermove", { clientX: 230, clientY: 280 });

    assert.strictEqual(knob.style.transform, "translate(30px, -20px)");
    assert.strictEqual(ring.style.transform, "translate(128px, 228px)");
  });

  QUnit.test("lifting the finger takes the ring away and ends the stick", (assert) => {
    const { element, ring, controls } = make();
    element.send("pointerdown", { clientX: 200, clientY: 300 });
    element.send("pointermove", { clientX: 400, clientY: 300 });

    element.send("pointerup", { clientX: 400, clientY: 300 });

    assert.true(ring.classes.has("hidden"));
    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("when the browser takes the touch away it ends the same way", (assert) => {
    const { element, ring, controls } = make();
    element.send("pointerdown", { clientX: 200, clientY: 300 });

    element.send("pointercancel", {});

    assert.true(ring.classes.has("hidden"));
    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("the mouse is ignored: a click doesn't start a stick", (assert) => {
    const { element, ring, controls } = make();

    element.send("pointerdown", { pointerType: "mouse", clientX: 200, clientY: 300 });
    element.send("pointermove", { pointerType: "mouse", clientX: 400, clientY: 300 });

    assert.deepEqual(controls.value, NO_STICK);
    assert.true(ring.classes.has("hidden"));
  });

  QUnit.test("a pen counts as a finger", (assert) => {
    const { element, controls } = make();

    element.send("pointerdown", { pointerType: "pen", clientX: 200, clientY: 300 });
    element.send("pointermove", { pointerType: "pen", clientX: 300, clientY: 300 });

    assert.true(controls.value.x > 0);
  });

  QUnit.test("a second finger is ignored", (assert) => {
    const { element, controls } = make();
    element.send("pointerdown", { pointerId: 1, clientX: 200, clientY: 300 });

    element.send("pointerdown", { pointerId: 2, clientX: 700, clientY: 300 });
    element.send("pointermove", { pointerId: 2, clientX: 900, clientY: 300 });

    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("it captures the finger, so the moves keep coming if it slides off the element", (assert) => {
    const { element } = make();

    element.send("pointerdown", { pointerId: 5, clientX: 200, clientY: 300 });

    assert.deepEqual(element.captured, [5]);
  });

  QUnit.test("works without a ring and a knob, for a game that doesn't draw one", (assert) => {
    const element = new FakeElement();
    const controls = new StickControls(element);

    element.send("pointerdown", { clientX: 200, clientY: 300 });
    element.send("pointermove", { clientX: 300, clientY: 300 });
    element.send("pointerup", {});

    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("dispose() stops listening and puts the ring away", (assert) => {
    const { element, ring, controls } = make();
    element.send("pointerdown", { clientX: 200, clientY: 300 });

    controls.dispose();

    assert.deepEqual(Object.keys(element.listeners), []);
    assert.true(ring.classes.has("hidden"));
    assert.deepEqual(controls.value, NO_STICK);
  });
});
```

Reload `tests.html`: **14 more** tests (**181** in all).

### 4b. The page

In `index.html`, change the `<title>` to `Rolling Rampage Marble - Babylon.js`, change the hint line, and add the ring, its knob and a reminder for a touch screen, directly below the *Drop again* button:

```html
  <div class="hint">Arrows or WASD to roll &middot; R to start again &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
```
```html
  <div id="stick-ring" class="hidden"><div id="stick-knob"></div></div>
  <p class="touch-hint">Touch and drag anywhere to steer</p>
```

and in `css/game.css`, add these rules directly above the comment that begins `/* The back button and the hint stay above`:

```css
/* The stick: a ring where the thumb first touched, and a knob in it that follows the thumb. The game
   sets the ring's size and position. It never takes a touch itself, so the touch reaches the canvas. */
#stick-ring {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 15;
  box-sizing: border-box;
  border: 4px solid rgba(246, 191, 14, 0.75);
  border-radius: 50%;
  background: rgba(11, 9, 9, 0.25);
  pointer-events: none;
}
#stick-ring.hidden {
  display: none;
}
#stick-knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44%;
  height: 44%;
  margin: -22% 0 0 -22%;
  border: 4px solid var(--ink);
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 0 0 12px rgba(246, 191, 14, 0.6);
}

/* A reminder of how to steer, only on a screen that is touched with a finger. */
.touch-hint {
  display: none;
  position: fixed;
  left: 12px;
  bottom: 18px;
  z-index: 20;
  margin: 0;
  padding: 0;
  color: var(--chrome);
  font: 600 20px/1 var(--small-font);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  pointer-events: none;
}
@media (pointer: coarse) {
  .touch-hint {
    display: block;
  }
}
```

Things to notice:

- **`pointer-events: none` on the ring** means it never takes a touch. The finger that made it is the one still on the canvas, and the ring is only drawn over it.
- **The knob is sized and centred in percentages of the ring,** so it is right whatever size the game makes the ring.
- **`@media (pointer: coarse)`** shows the reminder only on a screen whose main pointer is a finger. It is the same idea as in the Parkour Runner's `isTouchDevice`, but in plain CSS, which costs nothing and needs no code.

---

## Step 5: Wiring it up

Add the two new scripts to the list at the **bottom of `<body>`** in `index.html`. The list already has `marble.js`; `steering.js` goes just **before** it (since `marble.js` uses it), and `controls.js` just after it. Don't add a second `marble.js`: a script loaded twice stops with `Identifier 'MARBLE_RADIUS' has already been declared`. The three lines should read:

```html
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/controls.js"></script>
```

Now `js/main.js`.

### 5a. The two controls

Directly above the comment `// Rolling again`, add:

```js
  // Steering: the keys, and a thumb on the screen. Each makes a stick, and the game adds them.
  const keyboard = new KeyboardInput(window);
  const thumb = new StickControls(canvas, {
    ring: document.getElementById("stick-ring"),
    knob: document.getElementById("stick-knob"),
  });
```

### 5b. Steering, every frame

Replace the comment above the frame loop, and in the frame loop add the push directly below the `dt` line:

```js
  // Each frame: steer the marble, put it back if it fell off the course, keep the sun over it,
  // and ease the camera after it.
```
```js
    // The stick, as it is seen on the screen, turned into a direction in the world (by the
    // camera's own angle) and into a push. Not before the splash has gone: a push is a change
    // of speed that happens at once, so it would load the marble up while the world is held still.
    if (scene.physicsEnabled) {
      const stick = combineSticks(keyboard.stick, thumb.value);
      marble.push(worldDirection(stick, camera.alpha));
    }
```

Things to notice:

- **The camera's own angle (`camera.alpha`) turns the stick into a direction.** Not the constant `ISO_ALPHA`: if the camera ever moved, the controls would follow it, and they would be right without anyone remembering to change them.
- **A push waits for the world to be released.** A force is a change of speed that happens *at once*, so a player who pressed a key while the splash was up would load the marble with speed that the held-still world then released. `scene.physicsEnabled` is false until the splash has gone (World, Step 7b), so the push waits too.
- **The two sticks are added.** A keyboard and a thumb together are one stick, so a player with both (a tablet with a keyboard) isn't surprised.
- **The stick is read every frame, and the push applied every frame.** There are no key *events* in the game loop: the controls keep their state, and the game looks at it when it needs to. That is what makes input simple to reason about.

---

## Step 6: Try it

Serve the page and open it. The marble drops onto the start deck and waits.

- [ ] **Arrow keys, or WASD, roll the marble.** Up the screen goes away from you along the diagonal, right goes right across the screen, and a diagonal goes diagonally
- [ ] It **speeds up gradually**, and keeps rolling when you let go, slowing slowly
- [ ] Pushing the other way **turns it round** quickly
- [ ] It **doesn't go faster and faster**: along the flat it levels off. Down the ramp it can go faster than you could push it
- [ ] In the air (rolling off the edge) it **hardly steers**
- [ ] **Holding two directions** is no faster than one
- [ ] In **device mode** (a phone, either way up), **touch and drag anywhere**: a ring appears under your thumb with a knob in it, and the marble rolls the way you drag. Lift, and the ring goes
- [ ] A **tiny** movement of the thumb does nothing (the dead zone), and a big one is full strength
- [ ] **R** and the **Drop again** button still put the marble back, and **C** still takes a screenshot
- [ ] Pressing keys **during the splash** doesn't send the marble off the moment the splash fades

**If something's wrong**

- **`steeringForce is not defined`, `KeyboardInput is not defined`, and so on:** a script tag is missing from `index.html`. `steering.js` must be before `marble.js` and `controls.js`, and all before `main.js`. (A `KEYS is not defined` error from `controls.js` means `steering.js` is after it.)
- **Nothing happens when keys are pressed:** check the console. Then check that `marble.push` is called in the frame loop, and that `scene.physicsEnabled` is true by then.
- **The marble goes the wrong way on the screen:** the maths of `worldDirection`. The test *"pushing the stick up rolls the marble up the screen"* should be failing; if it isn't, the problem is in `main.js`: `camera.alpha` has to be what is passed.
- **The marble goes up and across when you push up:** the camera's angle isn't being used, or right and forward are not at right angles.
- **It slides instead of rolling:** the push is being applied away from the middle of the marble. It should be at `this.mesh.position`.
- **It never stops speeding up:** the force isn't fading. Check `steeringForce` uses the speed *along* the push.
- **It's sluggish, or too fast:** `STEER_FORCE` and `TOP_SPEED`. The *Experiments* below.
- **The marble keeps rolling after you let go of the keys, and never stops:** a key is stuck. Alt-tab away and back to test the `blur` handling.
- **A key does the wrong thing, or a diagonal is fast:** `keyboardStick` must pass through `clampStick`.
- **The touch stick does nothing in device mode:** the mouse is ignored by design, but device mode makes it a touch. Check the *pointer type* in the console: `event.pointerType` should say `"touch"`.
- **Dragging up on a phone rolls the marble down:** `y` isn't turned over in `TouchStick.move`.
- **The ring is in the wrong place:** it should be centred on where the finger *went down* (`originX`, `originY`), and not on where it is now.
- **The page scrolls when you drag:** the canvas needs `touch-action: none`, which it gets from the shared stylesheet.
- **The marble doesn't steer in the air at all:** `AIR_CONTROL` is 0, or `grounded` is wrong. Log it.

**Experiments** (change one, reload, then change it back):

- `STEER_FORCE` of `8`: heavy and slow to start. Of `60`: twitchy
- `TOP_SPEED` of `4`: it can't be rolled quickly. Of `30`: wild
- `AIR_CONTROL` of `0`: no steering in the air. Of `1`: full steering, and the marble can fly
- `MARBLE_DAMPING.linear` of `0.6`: a marble that stops quickly when you let go. Of `0`: one that doesn't
- `SURFACES.deck.friction` of `0.1`: ice. The marble slides, the push does less, and it takes ages to stop
- `STICK_DEAD_ZONE` of `0.5`: you have to push the stick hard before anything happens
- In `steeringForce`, replace `Math.min(2, ...)` with `Math.min(1, ...)`: turning round gets slow, and the marble feels heavy

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **181 passing tests**: the 79 you started with, plus 36 for the stick and the push, 23 for the marble (the ground and being pushed), 19 for the touch stick, and 24 for the controls.

> **What these tests don't cover.** They check where a pushed marble goes, as the camera sees it, and how the stick behaves for every kind of touch. They can't tell you the marble *feels* right: that `STEER_FORCE` of 22 is the right weight, that the dead zone is the right size, or that a thumb can reach everywhere it needs to. That check is Step 6, and on a real phone.

> **Try breaking something.** In `worldDirection`, swap `forward.x` and `forward.z` in the `right` line, so it reads `{ x: forward.x, z: -forward.z }`. The tests about right and up being at right angles, and the real-camera ones, fail. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Boiling every input down to one value | the stick: `clampStick`, `keyboardStick`, `TouchStick` |
| Turning a screen direction into a world direction | `worldDirection`, the camera's `alpha` |
| Steering as a force, not a speed | `steeringForce`, `applyForce` |
| Pushing through the middle, so friction makes it roll | `push` |
| Fading a push near top speed, and boosting it to turn round | `TOP_SPEED`, the fade |
| Knowing if something is on the ground | `grounded`, `pickWithRay` |
| A virtual stick: dead zone, clamping, scaling to the screen | `TouchStick`, `stickRadiusFor` |
| Input as state, read every frame | `KeyboardInput.held` |
| A key stuck down when focus is lost | the `blur` handler |
| Testing steering as the player sees it | the view matrix in the tests |

## Challenges

1. **A fixed stick.** Draw the ring in a corner instead of where the thumb lands, and make the thumb control it from there. (Hint: `StickControls` only needs a different origin and a different test for where a touch counts.)
2. **A drifting ring.** If the thumb goes past the ring's edge, drag the ring along with it, so the stick stays under the thumb. (Hint: move `originX` and `originY` toward the finger when it is further than `radius`.)
3. **A brake.** Space slows the marble quickly. (Hint: a force against the velocity, only when the marble is on the ground.)
4. **Different weights.** Give the marble more mass and see what the same push does. (Hint: acceleration is force over mass, so the force has to change with it. Where is the best place to scale it?)
5. **A game pad.** The Gamepad API gives two analog stick values. (Hint: it should produce a stick like the others, and `combineSticks` joins it in.)

---
