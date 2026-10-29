# Tutorial: Rolling Rampage Enemies -- Marbles That Chase You

This is the seventh tutorial in the Rolling Rampage series. The hazards of the last step stayed where they were put, and so could be learned. Enemies can't: they come after you. An **enemy** is a dark marble with an orange glow, heavier than yours and a little slower, that notices you when you get close, takes a moment to react, and then rolls straight at you. If it hits you, it takes **three seconds off the clock** and shoves you, and with a gap or an edge nearby, that is often the end of you. If it falls off the level itself, it is gone for a few seconds and then comes back. You write the code; this document tells you what to write and why.

By the end you'll have:

- A marble that can be **a different marble**: the same class with a name, a look, a weight and a strength of its own, so an enemy is a marble, and not a second thing to keep in step with the first
- A **brain** as plain numbers: when an enemy notices you, when it sets off, when it gives up, and when it comes back after a fall
- A **hit** that costs time, with a **cooldown** so that one collision isn't many
- **Enemies as level data**, and as real marbles in the physics world, that push themselves toward you
- A **collision watcher** that says when the marble and an enemy touch, and nothing else
- Enemies in the two harder levels, and the guarantee that an enemy rolling into the goal **can't win the level**
- Unit tests for all of it, **including real enemies** that chase, fall off, respawn and hit

**What you'll learn:** reusing a class by giving it options (and by extending it), a chase as a pure function and a state machine, why a program that decides things should have two different distances for starting and stopping, a reaction time, Havok **collision events** (`setCollisionCallbackEnabled`, `onCollisionObservable`, `COLLISION_STARTED`), a cooldown against repeated events, mass and what it does in a collision, and why the checks you made on *what* rolled into a zone in the Clock tutorial pay off now.

## Where you're starting

This folder is a copy of the finished Hazards sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_enemies/
├── index.html, tests.html   (change -- Steps 3 and 6)
├── css/                     (no change: see the note in Step 6)
├── js/
│   ├── enemies.js          (placeholder -- Steps 3 and 5)
│   ├── steering.js         (changes -- Step 1)
│   ├── marble.js           (changes -- Step 1)
│   ├── clock.js            (changes -- Step 2)
│   ├── level.js            (changes -- Step 4)
│   ├── main.js             (changes -- Step 6)
│   └── physics.js, course.js, zones.js, movers.js, slime.js, controls.js, tilt.js, camera.js, splash.js   (from the Hazards sample)
└── tests/
    ├── enemies.tests.js    (placeholder)
    └── steering, clock and marble tests grow, and the rest   (from the Hazards sample)
```

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_enemies/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Hazards sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**361**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step. Where a step adds a long function, paste it **whole**, below the closing `}` of the one above it. Where it **replaces** something, **delete the old one**: a class with two methods of the same name runs the last, and a file with two functions of the same name does too.

---

## Step 1: A marble that can be a different marble

An enemy rolls, falls, is pushed and is put back, exactly as the player's marble does. It would be silly to write all that twice. Instead the `Marble` class is given **options**: a name, a look, a weight, and a strength. The player's marble uses none of them and is as it was. An enemy uses all of them.

First the strength. The steering force already fades near a top speed. A weaker marble needs its own top speed and its own force, so `steeringForce` takes them as an optional fourth argument, with the old numbers as defaults. Open `js/steering.js` and **replace `steeringForce`** (with the comment above it) with:

```js
// The force to push the marble with: the direction the stick points in the world, at full
// strength, but fading to nothing as the marble gets to TOP_SPEED *in that direction*, and
// stronger when it is going the other way, so it can turn round quickly. In the air there is a
// quarter of the push. `velocity` is the marble's velocity, { x, y, z }. A marble with a different
// strength (an enemy's is less) can say so: `force` is its full push, and `topSpeed` the speed above which
// its push stops helping.
function steeringForce(direction, velocity, grounded, { force = STEER_FORCE, topSpeed = TOP_SPEED } = {}) {
  const length = Math.hypot(direction.x, direction.z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  const unit = { x: direction.x / length, z: direction.z / length };
  const along = velocity.x * unit.x + velocity.z * unit.z; // how fast it is already going that way
  const fade = Math.min(2, Math.max(0, 1 - along / topSpeed));
  const strength = force * length * fade * (grounded ? 1 : AIR_CONTROL);
  return { x: unit.x * strength, y: 0, z: unit.z * strength };
}
```

Then `js/marble.js`. **Replace the start of the class**, from the comment above `class Marble` to the end of the constructor (just above `// Where the marble is.`), with:

```js
// A marble. Everything but `start` is optional, and is what makes an enemy a different marble: its `name`,
// its `material` (the look), its `mass`, and its `steer`, how hard it can push itself ({ force, topSpeed }, as
// steeringForce takes them).
class Marble {
  constructor(scene, { start = MARBLE_START, name = "marble", material = null, mass = MARBLE_MASS, steer = {} } = {}) {
    this.start = start;
    this.steer = steer;
    this.mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter: MARBLE_RADIUS * 2, segments: 24 }, scene);
    this.mesh.material = material || makeSteel(scene);
    this.mesh.position.set(start.x, start.y, start.z);
    this.aggregate = new BABYLON.PhysicsAggregate(
      this.mesh,
      BABYLON.PhysicsShapeType.SPHERE,
      { mass, ...SURFACES.steel },
      scene
    );
    this.aggregate.body.setLinearDamping(MARBLE_DAMPING.linear);
    this.aggregate.body.setAngularDamping(MARBLE_DAMPING.angular);
    // Physics normally only moves the mesh. To put the marble somewhere ourselves (a reset)
    // it has to read the mesh's position back before each step as well.
    this.aggregate.body.disablePreStep = false;
  }
```

and **replace `push`**, so that it gives the marble's own strength to `steeringForce`:

```js
  // Pushes the marble: `direction` is the way, in the world, with a length from 0 to 1 for how
  // hard. Call it every frame the player is pushing. The force comes from steeringForce, which
  // fades near top speed and is weaker in the air, and is given to the physics at the marble's
  // middle, so it pushes it along without making it spin by itself.
  push(direction) {
    const force = steeringForce(direction, this.velocity, this.grounded, this.steer);
    if (force.x === 0 && force.z === 0) return;
    this.aggregate.body.applyForce(new BABYLON.Vector3(force.x, force.y, force.z), this.mesh.position);
  }
```

Things to notice:

- **Everything has a default** that is what the player's marble had before: named `marble`, made of steel, with `MARBLE_MASS`, and no strength of its own (`{}`), which means the usual one. Not one existing call to `new Marble(...)` needs changing.
- **`steer` is stored on the marble**, and `push` hands it to `steeringForce`. A destructured default (`{ force = STEER_FORCE, topSpeed = TOP_SPEED } = {}`) turns "nothing said" into "the usual", so there is no `if` in sight.
- **A weaker marble isn't slower by a speed limit alone.** `force` is how hard it accelerates, `topSpeed` is where its push stops helping. An enemy with both lower is slower to get going *and* easier to outrun.

### Tests

Add these to the **bottom** of `tests/steering.tests.js`, below everything that is there. They are a module of their own:

```js
QUnit.module("steeringForce for a marble of a different strength", () => {
  const flat = { x: 0, y: 0, z: 0 };

  QUnit.test("with no strength given it is the usual push, as it was", (assert) => {
    assert.deepEqual(steeringForce({ x: 1, y: 0, z: 0 }, flat, true), steeringForce({ x: 1, y: 0, z: 0 }, flat, true, {}));
    assert.strictEqual(steeringForce({ x: 1, y: 0, z: 0 }, flat, true).x, STEER_FORCE);
  });

  QUnit.test("a weaker marble pushes with its own force, at rest", (assert) => {
    assert.strictEqual(steeringForce({ x: 0, y: 0, z: 1 }, flat, true, { force: 10 }).z, 10);
  });

  QUnit.test("and its push fades toward its own top speed, not the usual one", (assert) => {
    const going = { x: 5, y: 0, z: 0 }; // fast for a marble with a top speed of 6, and slow for the usual one

    const slow = steeringForce({ x: 1, y: 0, z: 0 }, going, true, { topSpeed: 6 }).x;
    const usual = steeringForce({ x: 1, y: 0, z: 0 }, going, true).x;

    assert.true(slow < usual / 2, `${slow} against ${usual}`);
    assert.strictEqual(steeringForce({ x: 1, y: 0, z: 0 }, { x: 6, y: 0, z: 0 }, true, { topSpeed: 6 }).x, 0, "nothing at its top speed");
  });
});
```

and these to the **bottom** of `tests/marble.tests.js`, below everything that is there:

```js
// A marble can be made a different marble: a name, a look, a weight and a strength. These make one and look at it.
QUnit.module("a marble with options", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("with none, it is the player's marble: named marble, made of steel, and of the usual weight", (assert) => {
    const marble = new Marble(scene);

    assert.strictEqual(marble.mesh.name, "marble");
    assert.strictEqual(marble.mesh.material.name, "steel");
    assert.strictEqual(marble.aggregate.body.getMassProperties().mass, MARBLE_MASS);
    assert.deepEqual(marble.steer, {});
  });

  QUnit.test("it can be given a name, a look and a weight", (assert) => {
    const look = new BABYLON.StandardMaterial("odd", scene);

    const marble = new Marble(scene, { name: "other", material: look, mass: 5 });

    assert.strictEqual(marble.mesh.name, "other");
    assert.strictEqual(marble.mesh.material, look);
    assert.strictEqual(marble.aggregate.body.getMassProperties().mass, 5);
  });

  QUnit.test("a marble given less force is pushed less by the same push", (assert) => {
    const strong = new Marble(scene);
    const weak = new Marble(scene, { start: { x: -11, y: 5, z: 3 }, steer: { force: STEER_FORCE / 4 } });
    stepPhysics(scene, 1); // land them both on the deck

    for (let i = 0; i < 60; i++) {
      strong.push({ x: 1, y: 0, z: 0 });
      weak.push({ x: 1, y: 0, z: 0 });
      stepPhysics(scene, 1 / 60);
    }

    assert.true(weak.speed < strong.speed * 0.6, `${weak.speed} against ${strong.speed}`);
  });
});
```

Things to notice:

- **The first test says nothing has changed.** With no strength given, `steeringForce` is the same answer as before. That is how you know a change like this is safe.
- **The marble test pushes two marbles the same for a second**, one with a quarter of the force, and checks it is going much more slowly.

Open `tests.html`. You should see **367 passing tests**: the 361 you started with and six new ones.

---

## Step 2: A hit costs time

An enemy that touches you should cost you something, and time is what the player has. That is a rule of the *run*, so it goes in `Run`, with the rest.

One thing about collisions is easy to get wrong. When two marbles touch, the physics doesn't say "they touched": it says it, and says it again as they stay in contact and bounce. If every report cost three seconds, a single clumsy bump would drain the clock. So a hit has a **cooldown**: for a moment after one, another doesn't count. Open `js/clock.js`.

Replace the constants at the top (from `TIME_LOW` down to just above `formatTime`'s comment) with:

```js
const TIME_LOW = 10; // when this many seconds are left, the clock warns the player
const HIT_PENALTY = 3; // the seconds a hit from an enemy takes off the clock
const HIT_COOLDOWN = 1.5; // and the seconds after one in which another doesn't count, so one collision isn't many
```

**Replace the constructor** of `Run`:

```js
class Run {
  constructor(level) {
    this.remaining = level.time;
    this.bonuses = level.checkpoints.map((checkpoint) => checkpoint.bonus);
    this.reached = new Set(); // the checkpoints already reached
    this.cooldown = 0; // seconds until another hit counts
    this.status = "ready";
  }
```

and **replace `tick`**, adding `hit` directly below it (above `reachCheckpoint`):

```js
  // Let `dt` seconds go by. Only a running clock counts down, and it stops at zero, and the run is over.
  tick(dt) {
    if (this.status !== "running") return;
    this.remaining = Math.max(0, this.remaining - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.remaining === 0) this.status = "timeup";
  }

  // The marble has been hit by an enemy. Takes HIT_PENALTY seconds off the clock (or what is left, if that is
  // less) and says how many. Does nothing, and says 0, if the run isn't running, or if the last hit was so
  // recently that this is the same collision going on. A hit can use up the last of the time.
  hit() {
    if (this.status !== "running" || this.cooldown > 0) return 0;
    const taken = Math.min(HIT_PENALTY, this.remaining);
    this.remaining -= taken;
    this.cooldown = HIT_COOLDOWN;
    if (this.remaining === 0) this.status = "timeup";
    return taken;
  }
```

and the export block has two more names:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TIME_LOW, HIT_PENALTY, HIT_COOLDOWN, formatTime, Run };
} else {
  Object.assign(window, { TIME_LOW, HIT_PENALTY, HIT_COOLDOWN, formatTime, Run });
}
```

Things to notice:

- **`hit` says how many seconds it took**, as `reachCheckpoint` says how many it gave. Zero means it didn't count, and the game only shows a message when it isn't zero.
- **It can only take what is there**, `Math.min(HIT_PENALTY, this.remaining)`, and if that uses the last of the time, the run is over, like any other way the clock reaches zero.
- **The cooldown only runs down while the run does**, inside `tick`, after the early return for a run that isn't running. A hit on a won run does nothing, and so doesn't need one.
- **Only a running run can be hit.** Before the splash has gone, and after a win, an enemy is harmless.

### Tests

Add these to the **bottom** of `tests/clock.tests.js`, below everything that is there:

```js
QUnit.module("Run.hit", () => {
  const level = { time: 40, checkpoints: [{ bonus: 10 }] };
  const running = () => {
    const run = new Run(level);
    run.start();
    return run;
  };

  QUnit.test("a hit takes the penalty off the clock, and says how much", (assert) => {
    const run = running();

    assert.strictEqual(run.hit(), HIT_PENALTY);

    assert.strictEqual(run.remaining, 40 - HIT_PENALTY);
  });

  QUnit.test("a second hit straight away is the same collision, and costs nothing", (assert) => {
    const run = running();
    run.hit();

    assert.strictEqual(run.hit(), 0);
    run.tick(HIT_COOLDOWN / 2);
    assert.strictEqual(run.hit(), 0, "and half the cooldown later");

    assert.strictEqual(run.remaining, 40 - HIT_PENALTY - HIT_COOLDOWN / 2);
  });

  QUnit.test("after the cooldown, a new hit counts again", (assert) => {
    const run = running();
    run.hit();
    run.tick(HIT_COOLDOWN + 0.01);

    assert.strictEqual(run.hit(), HIT_PENALTY);
  });

  QUnit.test("a hit before the run starts, or after it is over, costs nothing", (assert) => {
    const ready = new Run(level);
    assert.strictEqual(ready.hit(), 0);
    assert.strictEqual(ready.remaining, 40);

    const won = running();
    won.finish();
    assert.strictEqual(won.hit(), 0);
    assert.strictEqual(won.remaining, 40);

    const over = running();
    over.tick(100);
    assert.strictEqual(over.hit(), 0);
  });

  QUnit.test("a hit can only take the time there is, and that ends the run", (assert) => {
    const run = running();
    run.tick(40 - 1);

    assert.strictEqual(run.hit(), 1, "it takes the one second that is left");

    assert.strictEqual(run.remaining, 0);
    assert.strictEqual(run.status, "timeup");
  });

  QUnit.test("the cooldown only runs while the run does", (assert) => {
    const run = running();
    run.hit();
    run.finish();

    run.tick(100);

    assert.strictEqual(run.cooldown, HIT_COOLDOWN);
  });
});
```

Open `tests.html`. You should see **373 passing tests**: six more.

---

## Step 3: The brain

What an enemy *decides* is plain numbers: which way to push, and whether to be pushing at all. A good enemy is not a clever one. It should be **beatable**, and **fair**, and the rules that make it so are small enough to be tested exactly. Open the placeholder `js/enemies.js` and replace its contents with:

```js
// Enemies: marbles that chase the player. An enemy is a marble like the player's (the same class, the
// same physics, steered with the same kind of push) but lighter on its feet, heavier in the shove,
// and steered by a program instead of a person. What it decides is plain numbers (where to push, and
// when to give up or to start again), with no Babylon.js and no page, so it is easy to test. Only then
// is it built in a scene. See ../tests/enemies.tests.js.

const ENEMY_FORCE = 15; // how hard an enemy pushes itself (the player's is 22), so it can be outrun
const ENEMY_TOP_SPEED = 6.5; // and how fast it can go by its own push (the player's is 10)
const ENEMY_MASS = 2; // twice the player's, so a hit shoves the player more than the enemy
const SIGHT_RANGE = 16; // an enemy notices the player when they are this close, in world units
const GIVE_UP_RANGE = 22; // and gives up when they have got this far away
const REACTION_TIME = 0.4; // seconds between noticing the player and setting off, so a first sight isn't a surprise attack
const RESPAWN_DELAY = 4; // seconds an enemy that has fallen off the level is gone for

// The way to push to get from one place to another along the floor, as a direction with a length
// of 1 ({ x, y, z } with y always 0), or no direction at all if they are already in the same place.
function chaseDirection(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.01) return { x: 0, y: 0, z: 0 };
  return { x: dx / distance, y: 0, z: dz / distance };
}

// What an enemy is thinking. It is always in one of these states:
//   idle      doing nothing, until the player comes within SIGHT_RANGE (and stays there for REACTION_TIME)
//   chasing   rolling at the player, until they get further than GIVE_UP_RANGE
//   fallen    off the level, for RESPAWN_DELAY seconds, and then back where it started
// The two distances are different (it gives up at 22 and notices at 16), so an enemy that has the
// player at the edge of its sight doesn't keep starting and stopping.
class Brain {
  constructor() {
    this.state = "idle";
    this.seen = 0; // how long the player has been in sight
    this.fallenFor = 0;
  }

  // Let `dt` seconds go by. `from` is where the enemy is and `to` where the player is, { x, y, z }, and
  // `fallen` says whether the enemy is off the level. Says which way to push, and whether it is time
  // to put the enemy back.
  update(dt, from, to, fallen) {
    const still = { x: 0, y: 0, z: 0 };

    if (fallen) {
      this.state = "fallen";
      this.seen = 0;
      this.fallenFor += dt;
      if (this.fallenFor < RESPAWN_DELAY) return { direction: still, respawn: false };
      this.state = "idle";
      this.fallenFor = 0;
      return { direction: still, respawn: true };
    }
    this.fallenFor = 0;
    if (this.state === "fallen") this.state = "idle";

    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    if (this.state === "idle") {
      this.seen = distance <= SIGHT_RANGE ? this.seen + dt : 0;
      if (this.seen >= REACTION_TIME) this.state = "chasing";
    } else if (distance > GIVE_UP_RANGE) {
      this.state = "idle";
      this.seen = 0;
    }
    return { direction: this.state === "chasing" ? chaseDirection(from, to) : still, respawn: false };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ENEMY_FORCE, ENEMY_TOP_SPEED, ENEMY_MASS, SIGHT_RANGE, GIVE_UP_RANGE, REACTION_TIME, RESPAWN_DELAY, chaseDirection, Brain };
} else {
  Object.assign(window, { ENEMY_FORCE, ENEMY_TOP_SPEED, ENEMY_MASS, SIGHT_RANGE, GIVE_UP_RANGE, REACTION_TIME, RESPAWN_DELAY, chaseDirection, Brain });
}
```

Things to notice:

- **`chaseDirection` is the whole of "chasing".** A direction with a length of 1 from where the enemy is to where you are, along the floor (`y` is always 0, so an enemy on a lower floor doesn't try to push downward). It has no memory and no map: an enemy rolls *straight* at you, and falls off whatever is in the way. That is the simplest thing that works, and it makes the gaps and edges of the levels your weapons.
- **`Brain` is a state machine**, like `Run` and for the same reason: every rule has one place to live, and the page asks `brain.state`. It is `idle`, `chasing` or `fallen`.
- **It notices you at one distance and gives up at another** (`SIGHT_RANGE` 16, `GIVE_UP_RANGE` 22). With one distance, an enemy with you at exactly that distance would start and stop chasing every frame. Two distances, a gap apart, is called **hysteresis**: it gives the decision some stickiness. A test checks that at a distance between the two, an enemy that is idle stays idle, and one that is chasing keeps chasing.
- **It takes `REACTION_TIME` to set off.** An enemy that rolled at you the instant you came into range would feel like cheating. A small delay, and a count that starts again if you leave its sight, makes the first sight a warning.
- **A fallen enemy is out for `RESPAWN_DELAY` seconds**, then `update` says `respawn: true` *once*, and the enemy is idle again, with the reaction time to wait through all over.
- **`update` doesn't touch the world.** It is told where the enemy and the player are, and whether the enemy has fallen, and answers with a direction and a yes or no. Moving the enemy, and putting it back, is for the class that owns the body (Step 5).
- **The numbers are the difficulty.** `ENEMY_FORCE` and `ENEMY_TOP_SPEED` are lower than the player's, so a player can outrun an enemy. `ENEMY_MASS` is twice the player's, so in a collision the *player* is shoved. Tuning an enemy is changing five numbers at the top of the file.

### Tests

Add the new script and its tests to `tests.html`. The script goes in the list of game scripts directly below `marble.js` (the enemy class will need `Marble`), and the tests directly below `slime.tests.js`:

```html
  <script src="js/enemies.js"></script>
  <script src="tests/enemies.tests.js"></script>
```

Open the placeholder `tests/enemies.tests.js` and replace its contents with:

```js
QUnit.module("chaseDirection", () => {
  QUnit.test("points from one place to the other, with a length of 1", (assert) => {
    const direction = chaseDirection({ x: 1, y: 5, z: 1 }, { x: 4, y: 0, z: 5 });

    assert.true(Math.abs(direction.x - 0.6) < 1e-9);
    assert.true(Math.abs(direction.z - 0.8) < 1e-9);
    assert.true(Math.abs(Math.hypot(direction.x, direction.z) - 1) < 1e-9);
  });

  QUnit.test("goes along the floor, whatever the heights are", (assert) => {
    assert.strictEqual(chaseDirection({ x: 0, y: 0, z: 0 }, { x: 3, y: 100, z: 0 }).y, 0);
    assert.strictEqual(chaseDirection({ x: 0, y: 9, z: 0 }, { x: 3, y: -4, z: 0 }).y, 0);
  });

  QUnit.test("goes either way, on both axes", (assert) => {
    const back = chaseDirection({ x: 5, y: 0, z: 5 }, { x: 2, y: 0, z: 1 });

    assert.true(back.x < 0 && back.z < 0);
  });

  QUnit.test("is no direction at all when they are in the same place", (assert) => {
    assert.deepEqual(chaseDirection({ x: 2, y: 1, z: 3 }, { x: 2, y: 4, z: 3 }), { x: 0, y: 0, z: 0 });
  });
});

QUnit.module("Brain", () => {
  const here = { x: 0, y: 0, z: 0 };
  const at = (distance) => ({ x: distance, y: 0, z: 0 });
  const STILL = { x: 0, y: 0, z: 0 };

  // Lets `seconds` go by, a frame at a time, with the player `distance` away. Gives back the last answer.
  const run = (brain, seconds, distance, fallen = false) => {
    let answer;
    for (let t = 0; t < seconds - 1e-9; t += 1 / 60) answer = brain.update(1 / 60, here, at(distance), fallen);
    return answer;
  };

  QUnit.test("starts idle, and with the player nowhere near it stays idle and still", (assert) => {
    const brain = new Brain();

    assert.strictEqual(brain.state, "idle");
    const answer = run(brain, 5, SIGHT_RANGE + 5);

    assert.strictEqual(brain.state, "idle");
    assert.deepEqual(answer.direction, STILL);
    assert.false(answer.respawn);
  });

  QUnit.test("notices the player in range, but takes a moment to react, and stays still until then", (assert) => {
    const brain = new Brain();

    const answer = run(brain, REACTION_TIME / 2, SIGHT_RANGE - 1);

    assert.strictEqual(brain.state, "idle");
    assert.deepEqual(answer.direction, STILL);
  });

  QUnit.test("then sets off, straight at the player", (assert) => {
    const brain = new Brain();

    const answer = run(brain, REACTION_TIME + 0.1, SIGHT_RANGE - 1);

    assert.strictEqual(brain.state, "chasing");
    assert.deepEqual(answer.direction, { x: 1, y: 0, z: 0 });
  });

  QUnit.test("a player who is only just in sight, for less than the reaction time, is forgotten", (assert) => {
    const brain = new Brain();
    run(brain, REACTION_TIME * 0.6, SIGHT_RANGE - 1);

    run(brain, 0.1, SIGHT_RANGE + 2); // out of sight: the count starts again
    run(brain, REACTION_TIME * 0.6, SIGHT_RANGE - 1);

    assert.strictEqual(brain.state, "idle");
  });

  QUnit.test("keeps chasing a player who is further away than it first saw them, up to the giving-up distance", (assert) => {
    const brain = new Brain();
    run(brain, REACTION_TIME + 0.1, SIGHT_RANGE - 1);

    run(brain, 1, (SIGHT_RANGE + GIVE_UP_RANGE) / 2);

    assert.strictEqual(brain.state, "chasing");
  });

  QUnit.test("gives up on a player who gets further than that, and stands still", (assert) => {
    const brain = new Brain();
    run(brain, REACTION_TIME + 0.1, SIGHT_RANGE - 1);

    const answer = run(brain, 0.1, GIVE_UP_RANGE + 1);

    assert.strictEqual(brain.state, "idle");
    assert.deepEqual(answer.direction, STILL);
  });

  QUnit.test("doesn't start chasing at a distance it would keep chasing from: it notices at one range and gives up at another", (assert) => {
    const brain = new Brain();

    run(brain, 5, (SIGHT_RANGE + GIVE_UP_RANGE) / 2);

    assert.strictEqual(brain.state, "idle");
    assert.true(SIGHT_RANGE < GIVE_UP_RANGE);
  });

  QUnit.test("an enemy that has fallen off does nothing, and isn't put back until the delay is up", (assert) => {
    const brain = new Brain();
    run(brain, REACTION_TIME + 0.1, SIGHT_RANGE - 1);

    const answer = run(brain, RESPAWN_DELAY - 0.5, 5, true);

    assert.strictEqual(brain.state, "fallen");
    assert.deepEqual(answer.direction, STILL);
    assert.false(answer.respawn);
  });

  QUnit.test("when the delay is up, it says so once, and is idle again", (assert) => {
    const brain = new Brain();
    let respawns = 0;

    // The enemy is fallen until it is told to be put back, and it is put back at once.
    for (let t = 0; t < RESPAWN_DELAY + 1 && respawns === 0; t += 1 / 60) {
      if (brain.update(1 / 60, here, at(5), true).respawn) respawns++;
    }

    assert.strictEqual(respawns, 1);
    assert.strictEqual(brain.state, "idle");
    assert.false(brain.update(1 / 60, here, at(5), false).respawn, "and it doesn't say so again");
  });

  QUnit.test("after it is put back it has to notice the player all over again", (assert) => {
    const brain = new Brain();
    run(brain, RESPAWN_DELAY + 0.1, 5, true);

    const answer = brain.update(1 / 60, here, at(5), false);

    assert.strictEqual(brain.state, "idle");
    assert.deepEqual(answer.direction, STILL);
  });
});
```

Things to notice:

- **`run` is a small helper** that lets a number of seconds go by a frame at a time, and gives back the last answer, so a test can say "a player in sight for half the reaction time" in one line.
- **The tests read like the rules**: *starts idle. Notices the player in range but takes a moment to react. A player in sight for less than the reaction time is forgotten. Keeps chasing up to the giving-up distance. Doesn't start chasing at a distance it would keep chasing from. A fallen enemy isn't put back until the delay is up, and then says so once.*

Open `tests.html`. You should see **387 passing tests**: fourteen more.

---

## Step 4: Enemies in the levels

Enemies are level data, a list of places like the start's. Open `js/level.js`.

Replace the comment above `LEVELS` (from `// A level can also have` down to the line `const LEVELS = [`) with:

```js
// A level can also have `enemies`, a list of places ({ col, row }) where enemy marbles start, and `slime`, puddles (zones with a `radius` of their own) that slow a marble and
// dissolve it if it stays, and `movers`, which move on their own. A mover is a "platform", which shuttles
// between `from` and `to` (both { col, row }), or a "piston", which pops up where it is (`at`) by `rise`
// units. Either has a `size` (x and z, in world units), a `height` (as a digit, where its top is), and a
// `period` in seconds for a whole cycle, and may have a `phase`, how far through its cycle it starts, from 0 to 1.
const LEVELS = [
```

**Replace `parseLevel`**, so that it carries the new field through, with a default for a level that has none:

```js
// A level's grid as numbers: `heights[row][col]` is the height of a corner in world units, or
// null where the grid has a dot.
function parseLevel(level) {
  return {
    name: level.name,
    cols: level.rows[0].length,
    rows: level.rows.length,
    heights: level.rows.map((row) => [...row].map((ch) => (ch === "." ? null : Number(ch) * HEIGHT_STEP))),
    start: level.start,
    time: level.time,
    goal: level.goal,
    checkpoints: level.checkpoints,
    slime: level.slime || [],
    movers: level.movers || [],
    enemies: level.enemies || [],
  };
}
```

and add an `enemies` line to each of the two harder levels. In **The Bridge**, directly below its `checkpoints` line:

```js
    enemies: [{ col: 15, row: 6 }],
```

In **Hazard Alley**, directly below its `checkpoints` line:

```js
    enemies: [{ col: 12, row: 2.5 }],
```

Things to notice:

- **Practice Run has none**, because it is for practice. The tests check that the first level has no enemies, and that some level has.
- **Where an enemy starts is a design decision with rules.** It must be over floor, well away from the player's start (so the first thing that happens isn't a collision), and clear of the zones and the movers (an enemy that starts inside a goal, or on a piston, is a mess). The tests check all of them, for every level you will ever write.
- **The Bridge's enemy waits at the far end**, past the checkpoint, and comes along the narrow bridge to meet you. **Hazard Alley's waits on the second deck**, where it can be thrown by the piston as easily as you can.

### Tests

Add these to the `tests/enemies.tests.js`, directly below what is there (they are modules of their own):

```js
QUnit.module("the enemies of every level", () => {
  const grids = LEVELS.map((level) => parseLevel(level));

  QUnit.test("parseLevel gives a level with no enemies an empty list", (assert) => {
    assert.deepEqual(parseLevel({ name: "T", start: { col: 0, row: 0 }, rows: ["00", "00"] }).enemies, []);
  });

  QUnit.test("some levels have enemies, and the first doesn't, so it is easy to practise on", (assert) => {
    assert.strictEqual(grids[0].enemies.length, 0);
    assert.true(grids.some((grid) => grid.enemies.length > 0));
  });

  QUnit.test("every enemy starts over floor, and above the fall limit", (assert) => {
    for (const grid of grids) {
      for (const place of grid.enemies) {
        const x = place.col * CELL;
        const z = place.row * CELL;
        assert.notStrictEqual(heightAt(grid, x, z), null, `${grid.name}: floor under an enemy at ${place.col}, ${place.row}`);
        assert.true(levelStart(grid, place).y > fallLimit(grid), `${grid.name}: above the limit`);
      }
    }
  });

  QUnit.test("every enemy starts well out of the player's reach, so the first thing isn't a collision", (assert) => {
    for (const grid of grids) {
      const start = levelStart(grid);
      for (const place of grid.enemies) {
        const enemy = levelStart(grid, place);
        assert.true(Math.hypot(enemy.x - start.x, enemy.z - start.z) > 8, `${grid.name}: an enemy at ${place.col}, ${place.row} is far from the start`);
      }
    }
  });

  QUnit.test("no enemy starts on a zone or a mover", (assert) => {
    for (const grid of grids) {
      for (const place of grid.enemies) {
        const enemy = levelStart(grid, place);
        for (const zone of levelZones(grid)) {
          const at = zonePosition(grid, zone);
          assert.true(Math.hypot(enemy.x - at.x, enemy.z - at.z) > zoneRadius(zone) + ZONE_BORDER + MARBLE_RADIUS, `${grid.name}: clear of ${zone.kind} ${zone.index}`);
        }
        for (const mover of grid.movers) {
          const centre = moverCenter(mover, 0);
          assert.true(Math.hypot(enemy.x - centre.x, enemy.z - centre.z) > Math.max(mover.size.x, mover.size.z) / 2 + 1, `${grid.name}: clear of a ${mover.kind}`);
        }
      }
    }
  });
});
```

Open `tests.html`. You should see **392 passing tests**: five more.

---

## Step 5: Enemies in the world

Now the bodies. An enemy is a `Marble` that is heavier, weaker, a different colour, has a brain, and asks the physics to tell it about collisions. In JavaScript that is `class Enemy extends Marble`: it has everything `Marble` has, and adds to it.

Add this to `js/enemies.js`, **below** `Brain` and above the export block. It is the rest of the file (a look, the class, a builder, and a watcher), so paste it **whole**:

```js
// A look for an enemy: dark steel with an orange glow, the logo's colours for danger.
function makeEnemyMaterial(scene) {
  const material = new BABYLON.StandardMaterial("enemy", scene);
  material.diffuseColor = BABYLON.Color3.FromHexString("#2a2d38");
  material.emissiveColor = BABYLON.Color3.FromHexString("#ef5e07").scale(0.3);
  material.specularColor = new BABYLON.Color3(1, 1, 1);
  material.specularPower = 64;
  return material;
}

// A marble that steers itself. Everything a marble can do (be pushed, roll, fall, be put back at its start)
// it can do, and it is made heavier, and weaker at pushing itself, and given a brain.
class Enemy extends Marble {
  constructor(scene, start, { name = "enemy", limit = FALL_LIMIT } = {}) {
    super(scene, { start, name, material: makeEnemyMaterial(scene), mass: ENEMY_MASS, steer: { force: ENEMY_FORCE, topSpeed: ENEMY_TOP_SPEED } });
    this.brain = new Brain();
    this.limit = limit; // the height below which it has fallen off the level
    // The physics only says when bodies hit each other if a body asks to be told.
    this.aggregate.body.setCollisionCallbackEnabled(true);
  }

  // Think, then push, or be put back. Call it every frame, with how long the frame was and where the player is.
  update(dt, target) {
    const { direction, respawn } = this.brain.update(dt, this.position, target, hasFallen(this.position.y, this.limit));
    if (respawn) this.reset();
    else this.push(direction);
  }

  // Takes the enemy away.
  dispose() {
    this.aggregate.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}

// Makes the enemies of a level, each where the level says. Returns them, `update(dt, target)`, which
// gives every one a turn to think, `owns(node)`, which says whether a mesh belongs to one of them,
// and `dispose()`.
function buildEnemies(scene, grid) {
  const limit = fallLimit(grid);
  const enemies = grid.enemies.map((place, index) => new Enemy(scene, levelStart(grid, place), { name: `enemy-${index}`, limit }));
  return {
    enemies,
    meshes: enemies.map((enemy) => enemy.mesh),
    owns: (node) => enemies.some((enemy) => enemy.mesh === node),
    update(dt, target) {
      for (const enemy of enemies) enemy.update(dt, target);
    },
    dispose() {
      for (const enemy of enemies) enemy.dispose();
    },
  };
}

// Calls `onHit(enemy's mesh, event)` when the marble and an enemy first touch (not while they stay in contact, and not when
// either touches the floor or anything else). `isEnemy(node)` says which meshes are enemies, so it can
// be asked afresh each time: the enemies change with the level. Returns `dispose()`.
function watchHits(scene, marble, isEnemy, onHit) {
  const plugin = scene.getPhysicsEngine().getPhysicsPlugin();
  const observer = plugin.onCollisionObservable.add((event) => {
    if (event.type !== "COLLISION_STARTED") return;
    const a = event.collider.transformNode;
    const b = event.collidedAgainst.transformNode;
    const other = a === marble.mesh ? b : b === marble.mesh ? a : null;
    if (other && isEnemy(other)) onHit(other, event);
  });
  return {
    dispose() {
      plugin.onCollisionObservable.remove(observer);
    },
  };
}
```

and the export block is now complete:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ENEMY_FORCE, ENEMY_TOP_SPEED, ENEMY_MASS, SIGHT_RANGE, GIVE_UP_RANGE, REACTION_TIME, RESPAWN_DELAY, chaseDirection, Brain, makeEnemyMaterial, Enemy, buildEnemies, watchHits };
} else {
  Object.assign(window, { ENEMY_FORCE, ENEMY_TOP_SPEED, ENEMY_MASS, SIGHT_RANGE, GIVE_UP_RANGE, REACTION_TIME, RESPAWN_DELAY, chaseDirection, Brain, makeEnemyMaterial, Enemy, buildEnemies, watchHits });
}
```

Things to notice:

- **`super(...)` is how the options of Step 1 are used.** The enemy's constructor calls `Marble`'s with a name, a material, a mass and a steer, and everything else (the sphere, the body, the damping) is built by `Marble`.
- **`update(dt, target)` is the whole of an enemy's turn**: ask the brain, and either put the enemy back (`this.reset()`, which every marble has) or push it. `push` is the marble's own, so the fade at top speed, the weaker push in the air and the rest are all there for free.
- **`setCollisionCallbackEnabled(true)`** is how a body asks to be told about collisions. Without it, Havok says nothing: it would be a lot of reports about every marble touching the floor all the time.
- **`buildEnemies` follows the pattern** of `buildMovers` and `buildZones`: one function that makes everything a level needs, and returns it with an `update` and a `dispose`. `owns(node)` says whether a mesh is one of the enemies, which `watchHits` needs.
- **`watchHits` filters hard.** The physics reports `COLLISION_STARTED` (first contact) and `COLLISION_CONTINUED` (still touching), between *every* pair of bodies that asked. It ignores all but the first kind, and all pairs but the marble and an enemy. It is told how to recognise an enemy with a function, rather than a list, because the list changes with each level.
- **A hit needs no code to shove the player.** The enemy has twice the mass, and Havok does the rest.
- **`dispose`** takes the enemy's body, material and mesh away.

### Tests

Add these to the `tests/enemies.tests.js`, directly below what is there:

```js
// Enemies need a scene and physics. These use a NullEngine, which draws nothing, and let time go by with
// stepPhysics, giving the enemies a turn to think every sixtieth of a second, as the game does.
QUnit.module("enemies in the world", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // Lets `seconds` go by, with the enemies thinking about a target (a position) every frame.
  const run = (enemies, seconds, target) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      enemies.update(1 / 60, target);
      stepPhysics(scene, 1 / 60);
    }
  };

  // The start deck of the test course is flat, and long enough to chase across.
  const deck = () => {
    buildCourse(scene);
    return { x: -7, y: 4, z: 0 }; // somewhere to be chased to, on the deck
  };

  QUnit.test("an enemy is a marble, but a heavier and weaker one, with a brain, in its own colours", (assert) => {
    deck();
    const enemy = new Enemy(scene, { x: -13, y: 5, z: 0 }, { name: "enemy-7" });

    assert.true(enemy instanceof Marble);
    assert.strictEqual(enemy.mesh.name, "enemy-7");
    assert.strictEqual(enemy.aggregate.body.getMassProperties().mass, ENEMY_MASS);
    assert.true(ENEMY_MASS > MARBLE_MASS, "heavier than the player's");
    assert.true(ENEMY_FORCE < STEER_FORCE && ENEMY_TOP_SPEED < TOP_SPEED, "and weaker at pushing itself");
    assert.true(enemy.brain instanceof Brain);
    assert.notStrictEqual(enemy.mesh.material.name, "steel", "and doesn't look like the player's");
  });

  QUnit.test("an enemy sets off after a player in sight, and gets nearer", (assert) => {
    const target = deck();
    const enemies = { update: (dt, to) => enemy.update(dt, to) };
    const enemy = new Enemy(scene, { x: -13, y: 4.6, z: 0 });
    stepPhysics(scene, 1);
    const before = Math.abs(target.x - enemy.position.x);

    run(enemies, 2, target);

    assert.strictEqual(enemy.brain.state, "chasing");
    assert.true(Math.abs(target.x - enemy.position.x) < before - 1.5, `from ${before} to ${Math.abs(target.x - enemy.position.x)}`);
  });

  QUnit.test("an enemy with nobody in sight stays where it is", (assert) => {
    deck();
    const enemy = new Enemy(scene, { x: -13, y: 4.6, z: 0 });
    stepPhysics(scene, 1);
    const x = enemy.position.x;

    run({ update: (dt, to) => enemy.update(dt, to) }, 2, { x: 500, y: 0, z: 0 });

    assert.true(Math.abs(enemy.position.x - x) < 0.05, `it moved ${enemy.position.x - x}`);
    assert.strictEqual(enemy.brain.state, "idle");
  });

  QUnit.test("an enemy can't go as fast as the player can", (assert) => {
    const level = buildLevel(scene, LEVELS[0]);
    const start = levelStart(level.grid);
    const enemy = new Enemy(scene, { x: start.x, y: start.y, z: start.z });
    const chased = { x: start.x + 14, y: 0, z: start.z }; // a long way down the first deck and its ramp

    let fastest = 0;
    for (let i = 0; i < 6 * 60; i++) {
      enemy.update(1 / 60, chased);
      stepPhysics(scene, 1 / 60);
      if (enemy.grounded) fastest = Math.max(fastest, enemy.speed);
    }

    assert.true(fastest > 2, `it got going: ${fastest}`);
    assert.true(fastest < 12, `but not as the player can: ${fastest}`);
  });

  QUnit.test("an enemy that falls off the level is put back at its start after the delay", (assert) => {
    const level = buildLevel(scene, LEVELS[1]);
    const enemies = buildEnemies(scene, level.grid);
    const enemy = enemies.enemies[0];
    const start = enemy.position.clone();
    enemy.mesh.position.set(start.x - 8, start.y, start.z); // over the edge of the landing
    const target = { x: 500, y: 0, z: 0 };

    run(enemies, 2, target);
    assert.true(hasFallen(enemy.position.y, fallLimit(level.grid)), `it has fallen: ${enemy.position.y}`);
    assert.strictEqual(enemy.brain.state, "fallen");

    run(enemies, RESPAWN_DELAY, target);
    assert.true(Math.abs(enemy.position.x - start.x) < 0.5 && Math.abs(enemy.position.z - start.z) < 0.5, `it is back at ${enemy.position.x}, ${enemy.position.z}`);
    assert.false(hasFallen(enemy.position.y, fallLimit(level.grid)));
  });

  QUnit.test("buildEnemies makes one for each place in the level, where it says, and owns them", (assert) => {
    const level = buildLevel(scene, LEVELS[1]);

    const enemies = buildEnemies(scene, level.grid);

    assert.strictEqual(enemies.enemies.length, level.grid.enemies.length);
    const place = levelStart(level.grid, level.grid.enemies[0]);
    assert.true(Math.abs(enemies.meshes[0].position.x - place.x) < 1e-9 && Math.abs(enemies.meshes[0].position.z - place.z) < 1e-9);
    assert.true(enemies.owns(enemies.meshes[0]));
    assert.false(enemies.owns(level.mesh));
  });

  QUnit.test("a level with no enemies builds none, and everything still works", (assert) => {
    const level = buildLevel(scene, LEVELS[0]);

    const enemies = buildEnemies(scene, level.grid);
    enemies.update(1 / 60, { x: 0, y: 0, z: 0 });
    enemies.dispose();

    assert.strictEqual(enemies.enemies.length, 0);
  });

  QUnit.test("disposing takes them away", (assert) => {
    const level = buildLevel(scene, LEVELS[1]);
    const enemies = buildEnemies(scene, level.grid);

    enemies.dispose();

    assert.strictEqual(scene.getMeshByName("enemy-0"), null);
  });

  // Two marbles on the flat deck, one fired at the other.
  const collide = () => {
    deck();
    const marble = new Marble(scene, { start: { x: -11, y: 4.6, z: 0 } });
    const enemy = new Enemy(scene, { x: -8, y: 4.6, z: 0 });
    stepPhysics(scene, 1);
    return { marble, enemy };
  };

  QUnit.test("watchHits says when the marble and an enemy touch, with the enemy", (assert) => {
    const { marble, enemy } = collide();
    const hits = [];
    const watching = watchHits(scene, marble, (node) => node === enemy.mesh, (node) => hits.push(node));

    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    stepPhysics(scene, 1);

    assert.strictEqual(hits.length, 1, "once");
    assert.strictEqual(hits[0], enemy.mesh);
    watching.dispose();
  });

  QUnit.test("the heavier enemy is shoved less than the marble that hits it is", (assert) => {
    const { marble, enemy } = collide();
    let touched = false;
    const watching = watchHits(scene, marble, (node) => node === enemy.mesh, () => (touched = true));

    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    for (let i = 0; i < 120 && !touched; i++) stepPhysics(scene, 1 / 60);
    stepPhysics(scene, 3 / 60); // and a moment for the shove to be done

    assert.true(touched, "they hit");
    assert.true(enemy.velocity.x > 0, `the enemy has been shoved on: ${enemy.velocity.x}`);
    assert.true(5 - marble.velocity.x > enemy.velocity.x, `and the marble has lost more speed than the enemy has gained: lost ${5 - marble.velocity.x}, gained ${enemy.velocity.x}`);
    watching.dispose();
  });

  QUnit.test("watchHits says nothing about landing on the floor, or about a marble that touches nothing", (assert) => {
    deck();
    const marble = new Marble(scene, { start: { x: -11, y: 6, z: 0 } });
    const enemy = new Enemy(scene, { x: -7, y: 6, z: 3 });
    const hits = [];
    const watching = watchHits(scene, marble, (node) => node === enemy.mesh, (node) => hits.push(node));

    stepPhysics(scene, 2); // both land on the deck, and don't touch each other

    assert.deepEqual(hits, []);
    watching.dispose();
  });

  QUnit.test("something that isn't an enemy is no hit", (assert) => {
    const { marble, enemy } = collide();
    const hits = [];
    const watching = watchHits(scene, marble, () => false, (node) => hits.push(node));

    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    stepPhysics(scene, 1);

    assert.deepEqual(hits, []);
    assert.true(enemy.position.x > -8, "although they did touch");
    watching.dispose();
  });

  QUnit.test("disposing the watcher stops it saying anything", (assert) => {
    const { marble, enemy } = collide();
    const hits = [];
    watchHits(scene, marble, (node) => node === enemy.mesh, (node) => hits.push(node)).dispose();

    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    stepPhysics(scene, 1);

    assert.deepEqual(hits, []);
  });

  QUnit.test("an enemy rolling into the goal is reported to the zones as the enemy, so it can't win the level", (assert) => {
    const level = buildLevel(scene, LEVELS[1]);
    const marble = new Marble(scene, { start: levelStart(level.grid) });
    const seen = [];
    buildZones(scene, level.grid, (zone, node) => seen.push({ zone, node }));
    const enemy = new Enemy(scene, levelStart(level.grid, level.grid.goal));

    stepPhysics(scene, 1);

    const arrivals = seen.filter((s) => s.zone.kind === "goal");
    assert.strictEqual(arrivals.length, 1);
    assert.strictEqual(arrivals[0].node, enemy.mesh);
    assert.notStrictEqual(arrivals[0].node, marble.mesh, "which the game compares with the marble's, and ignores");
  });
});
```

Things to notice:

- **They run the real physics**: enemies on the start deck of the test course, and on the real levels.
- **An enemy is tested for chasing** (it gets nearer), for *not* chasing (with nobody in sight it stays put), and for **not being as fast as the player**.
- **An enemy that is knocked off the level is put back** at its start, after the delay. The test moves it over the edge by hand and lets the clock run.
- **`watchHits` is tested from every side**: it reports a marble hitting an enemy, with the enemy; it says nothing about two marbles landing on the floor, nor about contact with something that isn't an enemy; and after `dispose` it says nothing.
- **The heavier enemy is shoved less than the marble that hits it.** The test waits for the first touch, lets a few frames go by, and checks the marble has lost more speed than the enemy has gained.
- **The last test is the important one.** An enemy dropped into the goal is reported to the zones *as the enemy*. The game compares what rolled in with the marble's mesh (since the Clock tutorial), so it is ignored. If the game had asked only "did something roll into the goal?", the first enemy to wander into it would win the level for you.

Open `tests.html`. You should see **406 passing tests**: fourteen more.

---

## Step 6: The game

Last, `index.html` and `js/main.js`. In `index.html`, add the script to the list at the **bottom of `<body>`**, directly below `marble.js`:

```html
  <script src="js/enemies.js"></script>
```

Without it, `main.js` stops with `ReferenceError: buildEnemies is not defined`.

> **No new CSS this time.** The enemies are drawn by the game, and *Bumped!* uses the banner you already have. (A new part of the page would get a new file in `css/` and a new `<link>`.)

Now `js/main.js`, in three places.

### 6a. The enemies

Directly above the comment `// Playing a level`, add:

```js
  // The enemies of the level: marbles that chase the marble. When one hits it, it costs time.
  let enemies = buildEnemies(scene, level.grid);
  enemies.meshes.forEach((mesh) => shadows.addShadowCaster(mesh));
  watchHits(scene, marble, (node) => enemies.owns(node), () => {
    const lost = run.hit();
    if (lost > 0) say("Bumped!", `-${lost} seconds`, 1200);
  });
```

### 6b. Playing a level

**Replace `loadLevel`** (the whole function) with:

```js
  const loadLevel = (index) => {
    zones.dispose();
    movers.dispose();
    enemies.meshes.forEach((mesh) => shadows.removeShadowCaster(mesh));
    enemies.dispose();
    level.dispose();
    levelIndex = index;
    level = buildLevel(scene, LEVELS[levelIndex]);
    zones = buildZones(scene, level.grid, reachZone, leaveZone);
    movers = buildMovers(scene, level.grid);
    enemies = buildEnemies(scene, level.grid);
    enemies.meshes.forEach((mesh) => shadows.addShadowCaster(mesh));
    levelTime = 0;
    run = new Run(level.grid);
    marble.start = levelStart(level.grid);
    dropAgain();
    focus = { ...marble.start };
    levelName.textContent = level.grid.name;
  };
```

### 6c. Every frame

Directly above the slime lines (the comment `// Slime slows the marble...`), add:

```js
    // The enemies think and push, while the run is on.
    if (run.status === "running") enemies.update(dt, marble.position);
```

Things to notice:

- **The enemies are shadow casters too**, so they look as if they are standing on the floor. When the level goes, so do they, and a mesh that is *disposed* must be taken out of the shadow generator first (`removeShadowCaster`), or the generator is left holding a mesh that no longer exists.
- **`watchHits` is made once**, when the game starts, and given a *function* that reads `enemies` each time, since `enemies` changes with each level (`let`, not `const`). It doesn't need to be rebuilt.
- **A hit shows a message** only when it cost something. `run.hit()` says 0 for a collision that doesn't count, and the banner is silent then.
- **The enemies only think while the run is `running`.** Before the splash has gone, and after a win or a loss, they sit still. (They are still physical, so one that is rolling goes on rolling.)
- **Nothing about the zones changed.** `reachZone` already checks that what rolled in is the marble, so an enemy rolling into a checkpoint, the goal or a puddle does nothing at all.

---

## Step 7: Try it

Serve the page and open it. Press **N** once to go to **The Bridge**.

- [ ] A **dark marble with an orange glow** sits on the far landing, past the goal, and does nothing while you cross the bridge
- [ ] When you get **within about 16 units** of it, it **waits a moment**, and then **rolls at you**, straight
- [ ] It **can be outrun**: you are faster, and it gives up when you are far enough away
- [ ] When it **hits you**, the banner says **Bumped! -3 seconds**, the clock drops by three, and you are **shoved**. It is shoved much less
- [ ] Being hit **twice in a second** costs three seconds, not six
- [ ] On the narrow bridge, a hit often **knocks you off**, and you start again from the checkpoint
- [ ] An enemy that **rolls off the edge** is gone, and **comes back where it started**, a few seconds later
- [ ] An enemy that **rolls into the goal** does **not** win the level (let it chase you across the landing)
- [ ] **N** again, for **Hazard Alley**: an enemy on the second deck. The piston can throw it too
- [ ] **N** back to **Practice Run**: no enemies. Neither level has strays from another
- [ ] Everything from before still works: the clock, the hazards, tilt and touch

**If something's wrong**

- **`ReferenceError: buildEnemies is not defined` (or `Brain`, or `watchHits`):** `index.html` has no `<script src="js/enemies.js"></script>`, or it is above `marble.js`. `Enemy extends Marble` needs `Marble` to exist when the file is read.
- **`Class extends value undefined is not a constructor or null`:** the same thing: `enemies.js` is loaded before `marble.js`, in `index.html` or in `tests.html`.
- **`SyntaxError: Unexpected token '}'` in one of the files:** a pasted block has landed inside another function. Every function should start at the left edge and be closed before the next begins.
- **The enemy never moves:** `enemies.update(dt, marble.position)` isn't being called, or the run isn't `running`. Check the brain: `brain.state` should become `"chasing"` when you are within 16 units for 0.4 seconds.
- **The enemy rolls at you at once, with no pause:** `REACTION_TIME`, and the `seen` count in `Brain`.
- **The enemy keeps chasing for ever, from any distance:** the `distance > GIVE_UP_RANGE` check in `Brain.update`.
- **The enemy is as fast as the player, or faster:** `steeringForce` isn't being given the enemy's strength, or `push` isn't passing `this.steer`. The test *"a marble given less force is pushed less"* should be failing.
- **The enemy is a steel marble like yours:** `makeEnemyMaterial` isn't being used, or `Marble` ignores `material`.
- **Hits do nothing:** `setCollisionCallbackEnabled(true)` is missing from `Enemy`, or `watchHits` is never made, or `isEnemy` says no. Check the console for `COLLISION_STARTED`.
- **One bump takes six or nine seconds:** the cooldown. `hit()` must set `this.cooldown`, and `tick` must count it down.
- **The enemy wins the level when it reaches the goal:** `reachZone` has lost its `node !== marble.mesh` check.
- **A mesh error, or a flicker of enemies, after changing level:** the enemies aren't taken out of the shadows (`removeShadowCaster`) before they are disposed, or aren't disposed at all.
- **Enemies from the last level are still there:** `enemies.dispose()` isn't in `loadLevel`.
- **The marble is shoved a long way by every hit:** `ENEMY_MASS` is too large, or the enemy is moving too fast when it hits.

**Experiments** (change one, reload, then change it back):

- `ENEMY_TOP_SPEED` of `12`: an enemy you can't outrun
- `ENEMY_MASS` of `1`: a hit shoves both equally. Of `6`: a wrecking ball
- `SIGHT_RANGE` of `40`: they see you from the other end of the level. Of `4`: you can nearly step round them
- `REACTION_TIME` of `0`: no warning. Of `2`: easy to avoid
- `HIT_PENALTY` of `10`: a hit hurts. Of `0`: it is only a shove
- `HIT_COOLDOWN` of `0`: bumps cost time many times over. This is why there is a cooldown
- `RESPAWN_DELAY` of `0.5`: they come back at once
- Add a second enemy to Hazard Alley, in another place, and see the tests check it
- In `chaseDirection`, return the opposite direction: enemies that run away

---

## Step 8: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/level.js"></script>    
  <script src="js/clock.js"></script>
  <script src="js/zones.js"></script>
  <script src="js/slime.js"></script>
  <script src="js/movers.js"></script>
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/enemies.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/tilt.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/level.tests.js"></script>  
  <script src="tests/clock.tests.js"></script>  
  <script src="tests/zones.tests.js"></script>  
  <script src="tests/slime.tests.js"></script>
  <script src="tests/enemies.tests.js"></script>
  <script src="tests/movers.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/tilt.tests.js"></script>  
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **406 passing tests**: the 361 you started with, plus 6 for a marble with options, 6 for the hit, 14 for the brain, 5 for the enemies of every level, and 14 for enemies in the world.

> **What these tests don't cover.** They check every rule of the brain, that every enemy in every level starts where it should, and that a real enemy chases, falls off, is put back, hits and is shoved. They can't tell you that an enemy is *fun*: that 16 units is a fair warning, that three seconds is the right penalty, or that a player can enjoy being chased. That is Step 7, and it is changed in the numbers at the top of `enemies.js`, not in the code.

> **Try breaking something.** In `Brain.update`, remove the check that makes it wait for the reaction time, so that it reads `if (this.seen >= 0) this.state = "chasing";`. The test *"notices the player in range, but takes a moment to react"* fails, and on the page the enemy sets off the instant you come into range. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Reusing a class by giving it options | `Marble`'s `name`, `material`, `mass`, `steer` |
| A different strength, with defaults | `steeringForce(…, { force, topSpeed })` |
| A chase as a pure function | `chaseDirection` |
| A decision as a state machine | `Brain`: `idle`, `chasing`, `fallen` |
| Two distances, so it doesn't flip-flop | `SIGHT_RANGE`, `GIVE_UP_RANGE` |
| A reaction time | `REACTION_TIME`, `seen` |
| Extending a class | `class Enemy extends Marble` |
| Collision events | `setCollisionCallbackEnabled`, `onCollisionObservable`, `COLLISION_STARTED` |
| Filtering them | `watchHits` |
| A cooldown against repeated events | `Run.hit`, `HIT_COOLDOWN` |
| What mass does in a collision | `ENEMY_MASS` |
| Checking what entered a zone | `node !== marble.mesh` in `reachZone` |
| Taking meshes out of the shadows | `removeShadowCaster` |

## Challenges

1. **A smarter chaser.** Make an enemy aim where the player *will be*, not where they are. (Hint: the player's velocity, and a short time ahead. Is the enemy then too hard?)
2. **An enemy that falls for slime.** Slow an enemy in a puddle, and dissolve it. (Hint: `zones` already reports enemies as nodes, and `reachZone` ignores them. What would it have to do instead?)
3. **A guard.** An enemy that stays near a place and only chases when you come close. (Hint: a state in `Brain` for going back, and a `home`.)
4. **A different kind.** A faster, lighter enemy, or a slower and heavier one. (Hint: `Enemy` takes options from `Marble`. Where would a level say which kind?)
5. **A knock-back effect.** A puff of sparks, or a sound, on a hit. (Hint: `watchHits` already gives you the collision's event, which has a point and a normal.)

---
