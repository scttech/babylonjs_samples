# Tutorial: Rooftop Parkour Moves -- Vaulting, Mantling, Kicking Off a Wall and a Little Help

This is the fifth tutorial of the Rooftop Parkour series. The runner can run, jump, roll and catch a ledge, but every ledge of the district is up on a roof, and a low wall in the street is still a wall. In this step the runner learns the moves that go **between**: **vaulting** a low wall at a run, **mantling** a ledge from the ground without hanging from it, **kicking off a wall** in the air, and a **little help** for a grab that is nearly right. And, since there is nothing in the street yet to try them on, there is a **training yard**: a row of walls and crates, one set for each move.

By the end you'll have:

- **A vault**: arithmetic that says whether a runner has a low wall ahead that it can go over (fast enough, low enough, thin enough, near enough, with a place to land), and a body that goes over it in an arc and keeps its speed
- **A mantle**: the same arithmetic as catching a ledge, asked of a runner on the ground and a ledge a little too high to step onto, and a body that climbs it without hanging
- **A wall kick**: a jump in the air, off a wall that the body is facing, up and away from it, never twice in a row off the same wall: two walls are a way to the top
- **Grab assist**: the numbers of a grab, with a little more allowed for a body that is steering toward a ledge
- **A floor under the hang**: a ledge too low to hang from (the feet would be in the ground) is not hung from
- **Clips** for a vault, a mantle and a kick (the kick borrows the tuck of the vault)
- **The training yard** in the plan of the district: a low wall, a crate, two walls to kick between and a wall that is only just too high, drawn in the game, where the runner now begins
- More in the **developer panel**: sliders for the heights and the kick, and a read-out of the move
- Unit tests for all of it, including tests that **each piece of the yard can be passed by the move it is for**

**What you'll learn:** how to tell a vault from a wall with a line and a box (a slab test), how to reuse one question (catching a ledge) for another (mantling it) by changing the numbers it is asked with, a state that moves a body from one place to another over a time, a jump that can be made again and again, and how to test all of it.

## Where you're starting

This folder is a copy of the finished Ledges sample, plus two empty placeholders for the new file and its tests:

```
rooftop_parkour_moves/
├── index.html, tests.html   (already list the new scripts)
├── css/                     (from the Ledges sample)
├── js/
│   ├── moves.js            (placeholder -- Steps 2 to 4)
│   ├── controller.js       (changes -- Steps 1 and 5)
│   ├── ledges.js           (changes -- Step 3)
│   ├── character.js        (changes -- Step 6)
│   ├── plan.js             (changes -- Step 7)
│   ├── main.js             (changes -- Step 7)
│   └── the rest            (from the Ledges sample)
└── tests/
    ├── moves.tests.js      (placeholder -- Steps 2 to 4)
    ├── controller.tests.js, ledges.tests.js, character.tests.js, plan.tests.js   (grow)
    └── the rest            (from the Ledges sample)
```

### Serving the page

As before, the models can't be loaded from a page opened from a file, so run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rooftop_parkour/rooftop_parkour_moves/` (the command prints the exact address), or use the *Live Server* extension in VS Code. Add `?dev` for the developer panel.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Ledges sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**400**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new file*, the functions are added a few at a time, and the file ends with a short block that exports their names. That way every file is valid JavaScript after every step, and each time a step adds functions, the block at the end is **replaced** by a longer one. Where a step replaces something, **delete the old one**: a file with two copies of the same function would still run, with the wrong one, and a test would be the first to tell you.

> **Put the work in this sample's folder.** Everything goes in `rooftop_parkour_moves/`, **not** in the Ledges sample next door.

---

## Four moves, four questions

Each of the moves is a **question asked of the world**, and an **answer that the body acts on**. The questions are plain arithmetic on boxes, a body and a few numbers, so they can be tested without a screen:

- **A vault.** Is there a low wall ahead, that the runner is going fast enough to go over, that it is near, that it is low enough to get over and thin enough to get across, with somewhere to land? If so, the body is taken over it, in an arc, at the speed it was going.
- **A mantle.** Is there a ledge in front of the runner, too high to step onto and not so high that its hands can't reach it from the ground? That is the question that catching a ledge in the air asks, with other numbers. If so, the body climbs it, without hanging.
- **A kick off a wall.** Is the body in the air, near a wall it is facing? If so, the key that jumps is a second jump, up and away from the wall.
- **A little help.** Is a ledge *nearly* in reach, of a body that is steering at it? If so, it is caught. That is the same question again, with a little more allowed.

The runner has no clips for a vault, a mantle or a wall kick of their own. Two clips stand in: `ClimbUp_1m` (a climb up something about a metre high) is the mantle, and `NinjaJump_Start` (a leap with the knees tucked up) is the vault, and also the kick.

---

## Step 1: The numbers of the moves

Open `js/controller.js`. In the table `BODY`, find the last line (`dropReach`, line 37) and add these under it, above the `};` that ends the table:

```js
  vaultSpeed: 3.5, // how fast the body has to be going to vault a wall, in metres a second: a walk is a stop at the wall
  vaultHeight: 1.3, // the highest wall it can vault, above the feet
  vaultDepth: 1.2, // the thickest wall it can vault, front to back
  vaultReach: 0.5, // how far from a wall, edge to wall, the vault begins
  vaultLanding: 0.25, // how far past the wall, edge to wall, the body lands
  vaultLift: -0.4, // how far above the top of the wall the body goes, at the most (it is under the top: the feet are tucked up by the knees)
  mantleHeight: 1.8, // the highest ledge that the hands can get onto from the ground, above the feet
  mantleTime: 0.67, // how long a mantle takes, in seconds: the length of its clip
  wallMinHeight: 1, // how high a wall has to reach above the feet, to kick off it
  wallReach: 0.3, // how far from a wall, edge to wall, the body can be, to kick off it
  wallJumpSpeed: 8, // how fast a kick off a wall goes up
  wallKick: 5, // and how fast it goes out, away from the wall
  wallLock: 0.25, // how long after a kick the keys can't steer, in seconds
  assistReach: 0.5, // how much higher the hands reach, for a body that is steering toward a ledge
  assistDistance: 0.4, // how much further from the wall it can be
  assistAngle: 0.5, // and how much more turned from it, in radians
```

Then the comment at the top of the file, which says what the controller does. **Delete the one that is there** (lines 1 to 5) and add this in its place:

```js
// The character controller: a runner's body that is moved by code and not by a physics engine. Each frame it is told which way the keys
// ask it to go, and it works out where it ends up: running along the ground at a speed it builds up to, turning to face the way it goes,
// stepping up a curb and down again, stopped by walls, standing on the roof of a building, jumping, catching a ledge with its hands and
// hanging from it, shimmying along it and climbing it, vaulting a low wall, mantling a high one, kicking off a wall in the air, and, when there
// is nothing under its feet, falling. Everything is plain arithmetic on a World (see collision.js), so a jump from this speed onto that roof is a thing a test
// can say. See ../tests/controller.tests.js.
```

Things to notice:

- **The numbers are all in the table**, with the others: how fast, how high and how thick a vault can be (`vaultSpeed`, `vaultHeight`, `vaultDepth`), how near the wall it begins and how far past it the body lands (`vaultReach`, `vaultLanding`), how high the body goes (`vaultLift`), how high a mantle reaches and how long it takes (`mantleHeight`, `mantleTime`), what a kick off a wall needs and does (`wallMinHeight`, `wallReach`, `wallJumpSpeed`, `wallKick`, `wallLock`), and how much help a grab gets (`assistReach`, `assistDistance`, `assistAngle`).
- **`vaultLift` is negative.** It is how far above the top of the wall the *origin* of the body goes (the feet, when it stands). In a vault the knees are tucked up under the body, so the feet are high over the origin, and the origin can go under the top of the wall.
- **A mantle takes as long as its clip.** `mantleTime` is the length of `ClimbUp_1m`, in seconds, as `climbTime` is of `ClimbLedge`.
- **The numbers are tied together by tests**, which come next: a wall that is vaulted is higher than a step and no higher than the hands can reach from the ground, a vault has to be run at, and help is *a little*.

### Tests

Add this at the **end** of `tests/controller.tests.js` (below line 1049):

```js
QUnit.module("The numbers of the moves", () => {
  QUnit.test("a wall that is vaulted is more than a step and no higher than the reach of the hands from the ground", (assert) => {
    assert.true(BODY.stepHeight < BODY.vaultHeight && BODY.vaultHeight <= BODY.mantleHeight && BODY.mantleHeight < BODY.handReach);
  });

  QUnit.test("a vault has to be run at: slower than a jog, and faster than a walk", (assert) => {
    assert.true(BODY.vaultSpeed > 0 && BODY.vaultSpeed < SCOUT.jogSpeed);
  });

  QUnit.test("the times are real: a mantle takes a fraction of a second, and a kick holds the keys for less than that", (assert) => {
    assert.true(BODY.mantleTime > 0.2 && BODY.mantleTime < 1.5);
    assert.true(BODY.wallLock > 0 && BODY.wallLock < BODY.mantleTime);
  });

  QUnit.test("a kick off a wall goes up, and no more than twice as fast as a jump from the ground", (assert) => {
    assert.true(BODY.wallJumpSpeed < BODY.jumpSpeed * 2 && BODY.wallJumpSpeed > 0);
  });

  QUnit.test("help is a little: less than the reach of the hands, and than the width of the body", (assert) => {
    assert.true(BODY.assistReach > 0 && BODY.assistReach < BODY.handReach / 2);
    assert.true(BODY.assistDistance > 0 && BODY.assistDistance < SCOUT.radius * 2);
    assert.true(BODY.assistAngle > 0 && BODY.assistAngle < 1);
  });
});
```

Open `tests.html`. You should see **405 passing tests**: 5 more.

---

## Step 2: A vault

The new file is `js/moves.js`: plain arithmetic on a body and a World, so that a vault can be said in a test. Open the placeholder and replace its contents with these two functions, and the block that exports them:

```js
// The moves between: vaulting a low wall, mantling a ledge from the ground without hanging, kicking off a wall in the air, and a little help
// for a grab that is nearly right. Like ledges.js, everything here is plain arithmetic on a body and a World (or a list of ledges), so a vault
// can be said in a test: that a wall is low enough, thin enough and near enough, and that there is room to land. The controller (see
// controller.js) is what moves the body. See ../tests/moves.tests.js.

// Where a line from (x, z) in the direction (dx, dz) crosses a box, as the distances along it at which it goes in and comes out: { enter, exit },
// or null if it misses. (A line that starts inside the box goes in at 0.) The line is only looked at ahead of its start.
function crossing(box, x, z, dx, dz) {
  let enter = 0;
  let exit = Infinity;
  for (const [at, along, low, high] of [[x, dx, box.minX, box.maxX], [z, dz, box.minZ, box.maxZ]]) {
    if (Math.abs(along) < 1e-9) {
      if (at < low || at > high) return null; // going along the slab, and outside it
      continue;
    }
    const a = (low - at) / along;
    const b = (high - at) / along;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
  }
  return enter <= exit ? { enter, exit } : null;
}

// The wall a body that is running would vault, if any, and where: { from, to, top, distance }, with `from` and `to` as { x, y, z }. The body is
// { x, y, z, heading, speed }. It must be going fast enough, and the wall must be ahead of it and near, low enough to get over and thick
// enough to be more than a step, and no thicker than it can get across; and there must be a place to land on the other side, about as high
// as the one it is on, with room to stand there.
function findVault(world, body, options) {
  const o = options;
  if (body.speed < o.vaultSpeed) return null;
  const dx = Math.sin(body.heading);
  const dz = Math.cos(body.heading);
  let best = null;
  for (const box of world.boxes) {
    const top = box.maxY - body.y;
    if (top <= o.stepHeight || top > o.vaultHeight || box.minY >= body.y + o.stepHeight) continue;
    const hit = crossing(box, body.x, body.z, dx, dz);
    if (!hit || hit.enter > o.radius + o.vaultReach || hit.exit - hit.enter > o.vaultDepth) continue;
    const far = hit.exit + o.radius + o.vaultLanding;
    const to = { x: body.x + dx * far, z: body.z + dz * far };
    const ground = world.supportAt(to.x, to.z, o.supportReach, box.maxY);
    if (Math.abs(ground - body.y) > o.stepHeight) continue;
    const at = world.push(to.x, to.z, o.radius, ground, o.height, o.stepHeight);
    if (Math.hypot(at.x - to.x, at.z - to.z) > 0.05) continue;
    if (!best || hit.enter < best.enter) {
      best = { enter: hit.enter, from: { x: body.x, y: body.y, z: body.z }, to: { x: to.x, y: ground, z: to.z }, top: box.maxY, distance: far };
    }
  }
  return best && { from: best.from, to: best.to, top: best.top, distance: best.distance };
}
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { crossing, findVault };
} else {
  Object.assign(window, { crossing, findVault });
}
```

Things to notice:

- **`crossing` is a line and a box.** It says where a line goes in at a box and where it comes out, as distances along the line (a *slab test*: for each of the two directions, x and z, where the line is between the two sides of the box; it is in the box where both are). The distance from the body to the wall, and the thickness of the wall, are the two answers.
- **A vault is found by looking along the way the body faces.** The line starts at the body and goes where it is heading, so a wall that is beside the body, or behind it, is not vaulted.
- **Each condition is one line**, and each says `continue` or `return null`: fast enough (`vaultSpeed`), the top above a step and no higher than `vaultHeight` (from the *feet*, so a runner on a step vaults a wall that is as high above the step), the wall starting at the ground and not floating, near (`vaultReach` from the edge of the body), and no thicker than `vaultDepth`.
- **The place to land is asked of the World**, with the two questions it already answers: what is there to stand on (`supportAt`, not counting anything higher than the wall) and is there room (`push`). It has to be about as high as the place the body is on (a step up or down), so the body is not vaulted off a roof, or into a wall that stands behind.
- **It answers with where the body goes and not with what it does.** `from`, `to`, the `top` of the wall and the `distance`: the controller turns it into a movement in Step 5.

### Tests

The tests for the new file go in `tests/moves.tests.js`. Open the placeholder and replace its contents with:

```js
QUnit.module("crossing", () => {
  const box = { minX: 0, maxX: 4, minZ: 2, maxZ: 3 };

  QUnit.test("a line that goes through a box goes in and comes out, at distances along it", (assert) => {
    assert.deepEqual(crossing(box, 2, 0, 0, 1), { enter: 2, exit: 3 });
    assert.deepEqual(crossing(box, -1, 2.5, 1, 0), { enter: 1, exit: 5 });
  });

  QUnit.test("a line that starts inside goes in at 0", (assert) => {
    assert.deepEqual(crossing(box, 2, 2.5, 0, 1), { enter: 0, exit: 0.5 });
  });

  QUnit.test("a line that misses it, or is going away from it, crosses nothing", (assert) => {
    assert.strictEqual(crossing(box, 5, 0, 0, 1), null);
    assert.strictEqual(crossing(box, 2, 0, 0, -1), null);
    assert.strictEqual(crossing(box, 2, 5, 0, 1), null);
  });

  QUnit.test("a line along a side of the box, inside its slab, goes through it, and outside the slab misses it", (assert) => {
    assert.deepEqual(crossing(box, -2, 2.5, 1, 0), { enter: 2, exit: 6 });
    assert.strictEqual(crossing(box, -2, 3.5, 1, 0), null);
  });

  QUnit.test("a line at a slant is found by the same arithmetic", (assert) => {
    const s = Math.SQRT1_2;
    const hit = crossing(box, 1, 1, s, s);
    assert.true(Math.abs(hit.enter - Math.SQRT2) < 1e-9);
    assert.true(Math.abs(hit.exit - 2 * Math.SQRT2) < 1e-9);
  });
});

QUnit.module("findVault", () => {
  const OPTIONS = { ...SCOUT, ...BODY };
  // A low wall: 0.9 high and 0.4 thick, its south side on the plane z = 0.
  const LOW = { name: "low wall", minX: -5, maxX: 5, minY: 0, maxY: 0.9, minZ: 0, maxZ: 0.4 };
  const worldOf = (...boxes) => new World({ boxes });
  // A runner going north at 5 metres a second, 0.3 from the wall.
  const runnerAt = (changes = {}) => ({ x: 0, y: 0, z: -OPTIONS.radius - 0.3, heading: 0, speed: 5, ...changes });
  const wallOf = (changes) => ({ ...LOW, ...changes });

  QUnit.test("a runner at a low wall vaults it, to a place beyond it on the ground", (assert) => {
    const vault = findVault(worldOf(LOW), runnerAt(), OPTIONS);
    assert.deepEqual(vault.from, { x: 0, y: 0, z: -OPTIONS.radius - 0.3 });
    assert.true(Math.abs(vault.to.z - (LOW.maxZ + OPTIONS.radius + OPTIONS.vaultLanding)) < 1e-9);
    assert.strictEqual(vault.to.y, 0);
    assert.strictEqual(vault.top, 0.9);
    assert.true(Math.abs(vault.distance - (vault.to.z - vault.from.z)) < 1e-9);
  });

  QUnit.test("it takes a body that is going fast enough, and not one that is walking", (assert) => {
    assert.notStrictEqual(findVault(worldOf(LOW), runnerAt({ speed: OPTIONS.vaultSpeed }), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ speed: OPTIONS.vaultSpeed - 0.1 }), OPTIONS), null);
  });

  QUnit.test("the wall is low enough to get over, and more than a step", (assert) => {
    assert.notStrictEqual(findVault(worldOf(wallOf({ maxY: OPTIONS.vaultHeight })), runnerAt(), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(wallOf({ maxY: OPTIONS.vaultHeight + 0.1 })), runnerAt(), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(wallOf({ maxY: OPTIONS.stepHeight })), runnerAt(), OPTIONS), null);
  });

  QUnit.test("the height is from the feet: a runner on a step vaults a wall that is the same height above the step", (assert) => {
    const world = worldOf({ minX: -5, maxX: 5, minY: 0, maxY: 3, minZ: -9, maxZ: 5 }, wallOf({ minY: 3, maxY: 3.9 }));
    assert.notStrictEqual(findVault(world, runnerAt({ y: 3 }), OPTIONS), null);
  });

  QUnit.test("the wall is thin enough to get across", (assert) => {
    assert.notStrictEqual(findVault(worldOf(wallOf({ maxZ: OPTIONS.vaultDepth })), runnerAt(), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(wallOf({ maxZ: OPTIONS.vaultDepth + 0.1 })), runnerAt(), OPTIONS), null);
  });

  QUnit.test("the wall is near: within the reach of the vault, edge to wall, and not further", (assert) => {
    assert.notStrictEqual(findVault(worldOf(LOW), runnerAt({ z: -OPTIONS.radius - OPTIONS.vaultReach + 0.01 }), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ z: -OPTIONS.radius - OPTIONS.vaultReach - 0.1 }), OPTIONS), null);
  });

  QUnit.test("the wall is ahead: a runner going away from it, or along it, does not vault it", (assert) => {
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ heading: Math.PI }), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ heading: Math.PI / 2 }), OPTIONS), null);
  });

  QUnit.test("a runner is not taken over a wall that is beside them: the line it is going along has to cross it", (assert) => {
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ x: 6 }), OPTIONS), null);
  });

  QUnit.test("something that is above the head, or starts above the feet, is not a wall to vault", (assert) => {
    assert.strictEqual(findVault(worldOf(wallOf({ minY: OPTIONS.stepHeight, maxY: 1 })), runnerAt(), OPTIONS), null);
  });

  QUnit.test("there is a place to land: not a drop, not a wall right behind it", (assert) => {
    const drop = new World({ boxes: [LOW], ground: (x, z) => (z > 1 ? -3 : 0) });
    assert.strictEqual(findVault(drop, runnerAt(), OPTIONS), null);
    const behind = worldOf(LOW, { minX: -5, maxX: 5, minY: 0, maxY: 5, minZ: 0.8, maxZ: 3 });
    assert.strictEqual(findVault(behind, runnerAt(), OPTIONS), null);
  });

  QUnit.test("the place to land can be a step up or down, and not more", (assert) => {
    const up = worldOf(LOW, { minX: -5, maxX: 5, minY: 0, maxY: OPTIONS.stepHeight, minZ: 1, maxZ: 5 });
    assert.strictEqual(findVault(up, runnerAt(), OPTIONS).to.y, OPTIONS.stepHeight);
    const high = worldOf(LOW, { minX: -5, maxX: 5, minY: 0, maxY: OPTIONS.stepHeight + 0.2, minZ: 1, maxZ: 5 });
    assert.strictEqual(findVault(high, runnerAt(), OPTIONS), null);
  });

  QUnit.test("a runner vaults the wall it is at, of two", (assert) => {
    const world = worldOf(LOW, wallOf({ minZ: 3, maxZ: 3.4, maxY: 1.1 }));
    assert.strictEqual(findVault(world, runnerAt(), OPTIONS).top, 0.9);
    assert.strictEqual(findVault(world, runnerAt({ z: 3 - OPTIONS.radius - 0.3 }), OPTIONS).top, 1.1);
  });
});
```

Things to notice:

- **`crossing` is tested by head**: a box that is a metre or two from the start of a line, so that the two distances are small whole numbers, and a line that starts inside it, that misses it, that goes away from it, that runs along its side and that is at a slant.
- **Every limit of a vault has a test on each side.** A runner at the slowest speed that vaults, and a little under it; a wall at the highest and a little over it; and the same for the depth and the reach. The numbers come from `OPTIONS`, which is the table: if one is changed, the tests move with it.
- **The place to land has its own tests**: a drop on the other side, a wall right behind, and a step up that is allowed and one that is too high.

Open `tests.html`. You should see **422 passing tests**: 17 more.

---

## Step 3: A mantle, and a floor under the hang

A mantle is catching a ledge, with different numbers, and without hanging. So there is no new function to find the ledge: `findLedge` is asked, with a lower reach, and a flag. Two small changes to `js/ledges.js` come first, done from the bottom of the file to the top, so that the line numbers hold.

### A ledge that is not hung from

In `findLedge`, find the line that skips a ledge that cannot be hung from or climbed (line 86) and **delete it**. Add this in its place:

```js
    if ((!mantling && !canHang(world, ledge, u, o)) || !canClimb(world, ledge, u, o)) continue;
```

Then the comment above `findLedge`, and the line that begins the function (lines 67 to 70) are **replaced**:

```js
// The ledge a body in the air would catch, if any, and where along it: { ledge, u }. The body is { x, y, z, heading }. A ledge is caught if it
// is in reach of the hands (above the waist, below the top of the reach), the body is near the wall below it, is beside some of it, and faces
// it, and there is room to hang from it and to climb it. Of those that are, the nearest. A body that is `mantling` is on the ground, and the
// ledge is low: it does not hang from it, so there only has to be room to climb it.
function findLedge(ledges, body, world, options, mantling = false) {
```

### A floor under the hang

In `canHang`, under the line `const spot = hangSpot(ledge, u, options);` (line 56), add:

```js
  if (world.supportAt(spot.x, spot.z, 0, spot.y + options.stepHeight) > spot.y + 0.05) return false;
```

and **replace** the comment above `canHang` (lines 53 to 54):

```js
// Whether a body can hang from a ledge at `u` (the feet are not in the ground, and there is nothing else where it hangs), and whether it can
// climb it from there (there is something to stand on at the top, with nothing in the way of it).
```

Things to notice:

- **A hang has a floor.** A ledge that is a metre and a half up can't be hung from: the feet would be under it by `hangDrop`, which is *under the ground*. The question for the world is `supportAt` at the place where the feet would be, for what is under or just above them: if there is something higher than the feet, they are in it. That ground is the ground *there*, and not where the wall is, so a hang over a drop is allowed.
- **This has not mattered until now**, because every ledge of the district was high up. It matters now that there are crates.
- **`mantling` is a flag, and the rest is the same question.** A body that mantles is on the ground, and does not hang, so there only has to be room to climb. Everything else (near the wall, facing it, beside it, in reach) is asked as it is for a body in the air, so a mantle is caught in the same places a hang is.

### Asking for a mantle

Now `js/moves.js`. Find the lines that export the names (lines 52 to 59: the comment, and the block under it) and **delete them**. Add this in their place, and the whole block of exports under it:

```js
// The ledge a body on the ground would mantle, if any, and where along it: { ledge, u }. It is a ledge too high to step onto and not so high that
// the hands can't get onto it from the ground, and it is caught the way a ledge is in the air (near the wall, facing it, beside it), except that
// the body does not hang from it: there only has to be room to climb it.
function findMantle(ledges, body, world, options) {
  return findLedge(ledges, body, world, { ...options, handLow: options.stepHeight, handReach: options.mantleHeight }, true);
}
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { crossing, findVault, findMantle };
} else {
  Object.assign(window, { crossing, findVault, findMantle });
}
```

Things to notice:

- **`findMantle` is one line**: the same `findLedge`, with the lowest ledge it catches being the height of a step (below that, it is walked onto), the highest being `mantleHeight`, and `mantling` set.
- **`{ ...options, handLow: ..., handReach: ... }` is a copy with two numbers changed.** The table is not touched, so the same table serves a hang and a mantle.

### Tests

Add this at the **end** of `tests/moves.tests.js` (below line 108):

```js
QUnit.module("findMantle", () => {
  const OPTIONS = { ...SCOUT, ...BODY };
  // A crate to mantle: 1.5 high, its south side on the plane z = 0.
  const CRATE = { name: "crate", minX: 0, maxX: 4, minY: 0, maxY: 1.5, minZ: 0, maxZ: 1.5 };
  const worldOf = (...boxes) => new World({ boxes });
  const bodyAt = (changes = {}) => ({ x: 2, y: 0, z: -OPTIONS.radius - 0.05, heading: 0, ...changes });
  const mantle = (box, body = bodyAt(), world = worldOf(box)) => findMantle(ledgesOf([box]), body, world, OPTIONS);

  QUnit.test("a body at a crate that is too high to step onto, and in reach of the hands, mantles it", (assert) => {
    const found = mantle(CRATE);
    assert.strictEqual(found.ledge.y, 1.5);
    assert.strictEqual(found.ledge.nz, -1);
  });

  QUnit.test("it is not too low (a step) and not too high (past the reach of the hands from the ground)", (assert) => {
    assert.notStrictEqual(mantle({ ...CRATE, maxY: OPTIONS.mantleHeight }), null);
    assert.strictEqual(mantle({ ...CRATE, maxY: OPTIONS.mantleHeight + 0.1 }), null);
    assert.strictEqual(mantle({ ...CRATE, maxY: OPTIONS.stepHeight - 0.05 }), null);
    assert.notStrictEqual(mantle({ ...CRATE, maxY: OPTIONS.stepHeight + 0.1 }), null);
  });

  QUnit.test("the body is near the wall, facing it, and beside it, as for any ledge", (assert) => {
    assert.strictEqual(mantle(CRATE, bodyAt({ z: -OPTIONS.radius - OPTIONS.grabDistance - 0.1 })), null);
    assert.strictEqual(mantle(CRATE, bodyAt({ heading: Math.PI })), null);
    assert.strictEqual(mantle(CRATE, bodyAt({ x: 5 })), null);
  });

  QUnit.test("there is room to stand on top, or it is not mantled", (assert) => {
    const world = worldOf(CRATE, { minX: 0, maxX: 4, minY: 2, maxY: 3, minZ: 0, maxZ: 1.5 });
    assert.strictEqual(mantle(CRATE, bodyAt(), world), null);
  });

  QUnit.test("it does not need room to hang: a crate that is too low to hang from, with the feet in the ground, can be mantled", (assert) => {
    const ledge = ledgesOf([CRATE])[1];
    assert.false(canHang(worldOf(CRATE), ledge, 2, OPTIONS));
    assert.notStrictEqual(mantle(CRATE), null);
  });

  QUnit.test("a ledge too low to hang from is not caught in the air either", (assert) => {
    const body = bodyAt({ y: 0.6 });
    assert.strictEqual(findLedge(ledgesOf([CRATE]), body, worldOf(CRATE), OPTIONS), null);
  });
});
```

and this at the **end** of `tests/ledges.tests.js` (below line 234):

```js
QUnit.module("a ledge too low to hang from", () => {
  const CRATE = { name: "crate", minX: 0, maxX: 10, minY: 0, maxY: 1.5, minZ: 0, maxZ: 3 };

  QUnit.test("a body can't hang from a ledge if its feet would be in the ground", (assert) => {
    const ledge = ledgesOf([CRATE])[1];
    assert.false(canHang(worldOf(CRATE), ledge, 5, OPTIONS));
    assert.true(canHang(worldOf({ ...CRATE, maxY: OPTIONS.hangDrop }), ledgesOf([{ ...CRATE, maxY: OPTIONS.hangDrop }])[1], 5, OPTIONS));
  });

  QUnit.test("it can, over a drop: the ground under the feet is what counts, and not the ground at the wall", (assert) => {
    const world = new World({ boxes: [CRATE], ground: (x, z) => (z < -0.2 ? -4 : 0) });
    assert.true(canHang(world, ledgesOf([CRATE])[1], 5, OPTIONS));
  });

  QUnit.test("a low ledge is not caught from the air, as a ledge to hang from", (assert) => {
    const body = { x: 5, y: 0.5, z: -OPTIONS.radius - 0.05, heading: 0 };
    assert.strictEqual(findLedge(ledgesOf([CRATE]), body, worldOf(CRATE), OPTIONS), null);
  });

  QUnit.test("but a body that is mantling it is not looking for a ledge to hang from, only to climb", (assert) => {
    const body = { x: 5, y: 0, z: -OPTIONS.radius - 0.05, heading: 0 };
    const low = { ...OPTIONS, handLow: OPTIONS.stepHeight, handReach: OPTIONS.mantleHeight };
    assert.strictEqual(findLedge(ledgesOf([CRATE]), body, worldOf(CRATE), low), null);
    assert.notStrictEqual(findLedge(ledgesOf([CRATE]), body, worldOf(CRATE), low, true), null);
  });
});
```

Things to notice:

- **A crate is the thing to mantle**: a box a metre and a half high, that is too high to step onto. It is mantled at the top of its range and not a little above it, it is not mantled when it is a step, and it is mantled when there is room on top, and not when there is something over it.
- **The two kinds of catching meet in one test**: a crate too low to hang from *can* be mantled, and is *not* caught in the air.

Open `tests.html`. You should see **432 passing tests**: 10 more.

---

## Step 4: A kick off a wall, and a little help

Back in `js/moves.js`, add the last two functions, `findWall` and `assisted`, at the end of the file. Find the lines that export the names (lines 59 to 66) and **delete them**. Add this in their place, and the whole block of exports under it:

```js
// The wall that a body in the air could kick off, if any: { nx, nz }, the way out from it, as a unit vector. It is a wall that reaches
// `wallMinHeight` above the feet, that is within `wallReach` of the body, edge to wall, and that the body is facing (to within the angle of a
// grab). Of those that are, the nearest. It is { nx, nz, box }, the box being the wall; the wall `except` is not looked at (the one just kicked off).
function findWall(world, body, options, except = null) {
  const o = options;
  const forwardX = Math.sin(body.heading);
  const forwardZ = Math.cos(body.heading);
  let best = null;
  for (const box of world.wallsAt(body.y, o.height, o.stepHeight)) {
    if (box === except || box.maxY - body.y < o.wallMinHeight) continue;
    const dx = body.x - Math.min(box.maxX, Math.max(box.minX, body.x));
    const dz = body.z - Math.min(box.maxZ, Math.max(box.minZ, body.z));
    const distance = Math.hypot(dx, dz);
    if (distance === 0 || distance > o.radius + o.wallReach) continue;
    const nx = dx / distance;
    const nz = dz / distance;
    if (-(forwardX * nx + forwardZ * nz) < Math.cos(o.grabAngle)) continue;
    if (!best || distance < best.distance) best = { nx, nz, box, distance };
  }
  return best && { nx: best.nx, nz: best.nz, box: best.box };
}

// The numbers of a grab, with a little more allowed, for a body that is steering toward a ledge: the hands reach a little higher, it can be a
// little further from the wall, and a little more turned from it. It is for findLedge, when it has found nothing, to ask again.
function assisted(options) {
  return {
    ...options,
    handReach: options.handReach + options.assistReach,
    grabDistance: options.grabDistance + options.assistDistance,
    grabAngle: options.grabAngle + options.assistAngle,
  };
}
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { crossing, findVault, findMantle, findWall, assisted };
} else {
  Object.assign(window, { crossing, findVault, findMantle, findWall, assisted });
}
```

Things to notice:

- **`findWall` gives the way out from the wall**, as a unit vector, and the wall itself (`box`). A fourth argument, `except`, is a wall that it does not look at: the one the body kicked off last. It looks at each box that is a wall to the body (`wallsAt`, as the walls that push it are), finds the nearest point of it to the body, and its distance. The way out is from that point to the body, and the kick goes that way.
- **A wall has to be a wall to push off**: it reaches `wallMinHeight` above the feet (a low rail is not), and it is faced (to within `grabAngle`, the same dot product as for a ledge). A body *inside* a box has no way out to give, and is not kicked.
- **`assisted` is a copy of the numbers of a grab with a little more allowed**: `handReach`, `grabDistance` and `grabAngle` are each a little more. It has no logic of its own: `findLedge` is asked again with the new numbers, in the controller.

### Tests

Add these two modules at the **end** of `tests/moves.tests.js` (below line 152):

```js
QUnit.module("findWall", () => {
  const OPTIONS = { ...SCOUT, ...BODY };
  // A wall to kick off: 4 high, its south side on the plane z = 0.
  const WALL = { name: "wall", minX: 0, maxX: 10, minY: 0, maxY: 4, minZ: 0, maxZ: 1 };
  const worldOf = (...boxes) => new World({ boxes });
  // A body in the air, a metre and a half up, facing the wall, a little from it.
  const bodyAt = (changes = {}) => ({ x: 5, y: 1.5, z: -OPTIONS.radius - 0.1, heading: 0, ...changes });
  // The way out of what is found, without the wall itself.
  const way = (found) => found && { nx: found.nx, nz: found.nz };

  QUnit.test("a body beside a wall it faces has the way out from it", (assert) => {
    assert.deepEqual(way(findWall(worldOf(WALL), bodyAt(), OPTIONS)), { nx: 0, nz: -1 });
  });

  QUnit.test("the way out is from the face the body is at: the side of a wall is a wall too", (assert) => {
    const found = findWall(worldOf(WALL), bodyAt({ x: 10 + OPTIONS.radius + 0.1, z: 0.5, heading: -Math.PI / 2 }), OPTIONS);
    assert.deepEqual(way(found), { nx: 1, nz: 0 });
  });

  QUnit.test("it is near: within reach, edge to wall, and not further", (assert) => {
    assert.notStrictEqual(findWall(worldOf(WALL), bodyAt({ z: -OPTIONS.radius - OPTIONS.wallReach + 0.01 }), OPTIONS), null);
    assert.strictEqual(findWall(worldOf(WALL), bodyAt({ z: -OPTIONS.radius - OPTIONS.wallReach - 0.05 }), OPTIONS), null);
  });

  QUnit.test("it is faced, to within the angle of a grab", (assert) => {
    assert.notStrictEqual(findWall(worldOf(WALL), bodyAt({ heading: OPTIONS.grabAngle - 0.1 }), OPTIONS), null);
    assert.strictEqual(findWall(worldOf(WALL), bodyAt({ heading: OPTIONS.grabAngle + 0.1 }), OPTIONS), null);
    assert.strictEqual(findWall(worldOf(WALL), bodyAt({ heading: Math.PI }), OPTIONS), null);
  });

  QUnit.test("it reaches high enough above the feet to push off", (assert) => {
    assert.notStrictEqual(findWall(worldOf({ ...WALL, maxY: 1.5 + OPTIONS.wallMinHeight }), bodyAt(), OPTIONS), null);
    assert.strictEqual(findWall(worldOf({ ...WALL, maxY: 1.5 + OPTIONS.wallMinHeight - 0.1 }), bodyAt(), OPTIONS), null);
  });

  QUnit.test("a wall that is only a step is not a wall, and a wall that is all over the head is not one to push off", (assert) => {
    assert.strictEqual(findWall(worldOf({ ...WALL, maxY: 1.5 + OPTIONS.stepHeight }), bodyAt(), OPTIONS), null);
    assert.strictEqual(findWall(worldOf({ ...WALL, minY: 5, maxY: 9 }), bodyAt(), OPTIONS), null);
  });

  QUnit.test("of two walls, the nearer", (assert) => {
    const other = { ...WALL, minZ: -3, maxZ: -2.5 };
    const found = findWall(worldOf(WALL, other), bodyAt({ z: -OPTIONS.radius - 0.05, heading: 0 }), OPTIONS);
    assert.deepEqual(way(found), { nx: 0, nz: -1 });
    assert.strictEqual(found.box, WALL);
  });

  QUnit.test("the wall to leave out is not looked at, and the next is", (assert) => {
    const other = { ...WALL, minZ: -3, maxZ: -2.5 };
    const body = bodyAt({ z: -OPTIONS.radius - 0.05 });
    assert.strictEqual(findWall(worldOf(WALL), body, OPTIONS, WALL), null);
    assert.strictEqual(findWall(worldOf(WALL, other), body, OPTIONS, WALL), null);
    assert.strictEqual(findWall(worldOf(WALL), body, OPTIONS, other).box, WALL);
  });

  QUnit.test("a body that is inside a box has no way out of it to give", (assert) => {
    assert.strictEqual(findWall(worldOf(WALL), bodyAt({ z: 0.5 }), OPTIONS), null);
  });
});

QUnit.module("assisted", () => {
  const OPTIONS = { ...SCOUT, ...BODY };
  const WALL = { name: "wall", minX: 0, maxX: 10, minY: 0, maxY: 3, minZ: 0, maxZ: 10 };
  const world = new World({ boxes: [WALL] });
  const ledges = ledgesOf([WALL]);
  const bodyAt = (changes = {}) => ({ x: 5, y: 1, z: -OPTIONS.radius - 0.05, heading: 0, ...changes });
  const caught = (body, options) => findLedge(ledges, body, world, options) !== null;

  QUnit.test("it allows a little more of each of the three things: reach, distance and angle", (assert) => {
    const more = assisted(OPTIONS);
    assert.strictEqual(more.handReach, OPTIONS.handReach + OPTIONS.assistReach);
    assert.strictEqual(more.grabDistance, OPTIONS.grabDistance + OPTIONS.assistDistance);
    assert.strictEqual(more.grabAngle, OPTIONS.grabAngle + OPTIONS.assistAngle);
  });

  QUnit.test("it does not change the numbers it is given, and keeps all the others", (assert) => {
    const before = { ...OPTIONS };
    const more = assisted(OPTIONS);
    assert.deepEqual(OPTIONS, before);
    assert.strictEqual(more.handLow, OPTIONS.handLow);
    assert.strictEqual(more.jumpSpeed, OPTIONS.jumpSpeed);
  });

  QUnit.test("a ledge a little too high is caught with help, and not without", (assert) => {
    const body = bodyAt({ y: 3 - OPTIONS.handReach - OPTIONS.assistReach / 2 });
    assert.false(caught(body, OPTIONS));
    assert.true(caught(body, assisted(OPTIONS)));
  });

  QUnit.test("so is one a little too far, or a little turned away", (assert) => {
    const far = bodyAt({ z: -OPTIONS.radius - OPTIONS.grabDistance - OPTIONS.assistDistance / 2 });
    assert.false(caught(far, OPTIONS));
    assert.true(caught(far, assisted(OPTIONS)));
    const turned = bodyAt({ heading: OPTIONS.grabAngle + OPTIONS.assistAngle / 2 });
    assert.false(caught(turned, OPTIONS));
    assert.true(caught(turned, assisted(OPTIONS)));
  });

  QUnit.test("help is a little: a ledge that is much too high, far or turned away is still out of reach", (assert) => {
    const high = bodyAt({ y: 3 - OPTIONS.handReach - OPTIONS.assistReach - 0.2 });
    assert.false(caught(high, assisted(OPTIONS)));
    assert.false(caught(bodyAt({ z: -OPTIONS.radius - OPTIONS.grabDistance - OPTIONS.assistDistance - 0.2 }), assisted(OPTIONS)));
    assert.false(caught(bodyAt({ heading: Math.PI }), assisted(OPTIONS)));
  });

  QUnit.test("with no help allowed, it is the same as none", (assert) => {
    const none = assisted({ ...OPTIONS, assistReach: 0, assistDistance: 0, assistAngle: 0 });
    assert.strictEqual(caught(bodyAt({ y: 3 - OPTIONS.handReach - 0.1 }), none), false);
  });
});
```

Things to notice:

- **The side of a wall is a wall too**, so `findWall` is tested from the end of one, and gives a way out along x.
- **Help is tested by what it does and doesn't do**: a ledge that is a little too high, too far or too turned is caught with it and not without, and one that is much too high, far or turned is caught with neither.

Open `tests.html`. You should see **447 passing tests**: 15 more.

---

## Step 5: The body moves

Now the controller. A vault and a mantle are the same kind of thing: the body is taken from one place to another over a time, and the keys are not read while it goes. A kick is a jump. Open `js/controller.js`. The changes go from the **bottom of the file to the top**, so that the line numbers hold.

At the bottom of the class, `reset` and `placeAt` have to put the new state away. Find the lines in each that begin `Object.assign(this,` (line 283 for `placeAt`, the lower, and line 278 for `reset`). Do `placeAt` first. **Delete each line**, and add:

```js
    Object.assign(this, { x, y, z, speed: 0, vy: 0, grounded: false, landing: 0, rolling: 0, airTime: this.options.coyoteTime + 1, jumping: false, jumpWanted: 0, hang: null, cooldown: 0, move: null, wallJumps: 0, kickedOff: null, locked: 0 });
```

and:

```js
    Object.assign(this, this.start, { speed: 0, vy: 0, grounded: true, landing: 0, rolling: 0, impact: 0, airTime: 0, jumping: false, jumpWanted: 0, hang: null, cooldown: 0, move: null, wallJumps: 0, kickedOff: null, locked: 0 });
```

In `_fall`, when the body lands, a body that has landed has not kicked yet, and has no wall to leave out. Above the line `if (this.impact >= o.rollImpact` (line 271) add:

```js
      this.wallJumps = 0; // landing gives the kicks back
      this.kickedOff = null; // nor a wall to leave out
```

In `hangOn`, the same (a body that hangs has not kicked yet, and has no wall to leave out), under the line `this.jumping = false;` (line 158) add:

```js
    this.wallJumps = 0; // a hand on a ledge is something to push off, so the kicks are given back
    this.kickedOff = null; // or a wall to leave out
```

Now the new methods. The method `_grab` and the comment above it (lines 140 to 144) are **replaced**. **Delete them**, and add this in their place: `_grab` with a little help, and then the three new methods:

```js
  // Catches a ledge, if the body is in the air and one is in reach: it is held where it hangs from it, and falls no more. A body that is steering
  // gets a little help: if there is nothing in reach, it asks again with a little more allowed (see `assisted`).
  _grab(direction) {
    let found = findLedge(this.ledges, this, this.world, this.options);
    if (!found && direction) found = findLedge(this.ledges, this, this.world, assisted(this.options));
    if (found) this.hangOn(found.ledge, found.u);
  }

  // Starts a vault or a mantle, if there is one to start, and says whether it did. A body that is running at a low wall vaults it. A body that
  // wants to jump, beside a ledge that is too high to step onto and in reach of the hands, mantles it. Neither is for a body in the air, or in a roll.
  _startMove(direction) {
    const o = this.options;
    if (!this.grounded || this.rolling > 0) return false;
    const vault = direction && findVault(this.world, this, o);
    if (vault) {
      this.move = { kind: "vault", t: 0, time: vault.distance / Math.max(this.speed, o.vaultSpeed), from: vault.from, to: vault.to, top: vault.top };
      return true;
    }
    const found = this.jumpWanted > 0 && findMantle(this.ledges, this, this.world, o);
    if (found) {
      this.jumpWanted = 0;
      this.speed = 0;
      this.heading = Math.atan2(-found.ledge.nx, -found.ledge.nz);
      this.move = { kind: "mantle", t: 0, time: o.mantleTime, from: { x: this.x, y: this.y, z: this.z }, to: topSpot(found.ledge, found.u, o), top: found.ledge.y };
      return true;
    }
    return false;
  }

  // A vault or a mantle, as it goes: the body is taken from where it began to where it ends, and stands there. A vault goes over the wall in a
  // line, up at the start and down at the end, and keeps its speed. A mantle goes up first, and then over the edge, as a climb does.
  _move(dt) {
    const o = this.options;
    const move = this.move;
    move.t += dt;
    const p = Math.min(1, move.t / move.time);
    const { from, to } = move;
    const smooth = (q) => {
      const c = Math.min(1, Math.max(0, q));
      return c * c * (3 - 2 * c);
    };
    if (move.kind === "vault") {
      const peak = move.top + o.vaultLift;
      this.x = from.x + (to.x - from.x) * p;
      this.z = from.z + (to.z - from.z) * p;
      this.y = from.y + (peak - from.y) * smooth(p / 0.25) - (peak - to.y) * smooth((p - 0.75) / 0.25);
    } else {
      const over = Math.min(1, Math.max(0, (p - 0.4) / 0.6));
      this.x = from.x + (to.x - from.x) * over;
      this.z = from.z + (to.z - from.z) * over;
      this.y = from.y + (to.y - from.y) * smooth(p);
    }
    if (p >= 1) {
      this.y = this.world.supportAt(to.x, to.z, o.supportReach, to.y + o.stepHeight);
      this.move = null;
      this.cooldown = o.grabCooldown;
    }
  }

  // A kick off a wall: in the air, with a jump wanted (the key went down again), beside a wall that it faces. There is no limit to how many, but never twice off the same wall in a row, so a body kicks its way up between two walls, to the top. The
  // body is sent up and out, away from the wall, and turned to face the way it goes, and the keys can't steer it for a moment.
  _wallJump() {
    const o = this.options;
    if (this.jumpWanted <= 0 || this.rolling > 0) return;
    const wall = findWall(this.world, this, o, this.kickedOff);
    if (!wall) return;
    this.heading = Math.atan2(wall.nx, wall.nz);
    this.speed = o.wallKick;
    this.vy = o.wallJumpSpeed;
    this.jumping = true;
    this.jumpWanted = 0;
    this.wallJumps++;
    this.kickedOff = wall.box;
    this.locked = o.wallLock;
  }
```

Things to notice:

- **`_grab` asks twice.** The second time it asks is only for a body that is steering (`direction` is not `null`), and it is asked with `assisted(this.options)`: the same question, with a little more allowed. A body that is let go of the keys, and falls past a ledge, is not helped.
- **`_startMove` is asked at the start of every frame on the ground.** A body that is running (`direction`) at a wall that can be vaulted, vaults it. A body that wants a jump (`jumpWanted`, the key has just gone down) beside a ledge that can be mantled, mantles it, and the jump is used up. Both set `move`, the whole of the state: `{ kind, t, time, from, to, top }`.
- **A vault takes the time the way takes at the speed it was going**, so it goes at the speed the runner was running: `distance / speed`. A sprint is a quick vault, and a jog a slower one, and the body comes out at the speed it went in. (The least speed is `vaultSpeed`, so it can't be asked to take for ever.)
- **`_move` moves the body in a line, and eases the height.** `p` is how far through it is, from 0 to 1. A vault is a line in x and z. In y, it goes up to the top (`peak`) in the first quarter, stays there until three quarters, and goes down to where it lands in the last: two `smooth` curves (`c * c * (3 - 2 * c)`, the ease used for climbing) added and taken away. A mantle goes up first (all of its height, smoothly) and over the edge in the last 60%, as a climb does.
- **When it is over, the body is standing on what is under it**, `supportAt` at the end, so a landing on a raised edge is on it and not in it. `cooldown` is set, so that a ledge is not caught at once.
- **`_wallJump` is a jump in the air.** It is asked when a jump is wanted (the key went down), the body is not in a roll, and `findWall` has a wall. There is **no limit** to the kicks, but **never two in a row off the same wall**: a body in a gap between two walls can go on kicking from one to the other, up to the top, where it catches the ledge. It never looks at the wall that the body kicked off last (`kickedOff`, which `findWall` is told to leave out): the next kick is off another wall. It turns the body to face away (`atan2(nx, nz)`), gives it the speed of a kick and the upward speed of a kick, and counts it. `locked` is how long the keys cannot steer, so that a body that is kicked off a wall does not at once turn back and run into it.

In `update`, **four** changes, from the bottom up. Find the three lines at the end that call `_jump`, `_fall` and `_grab`, from `this._jump();` (line 135) to the one with `this._grab();` (line 137). **Delete them**, and add these in their place (the kick between the jump and the fall, and `direction` given to `_grab`):

```js
    this._jump();
    if (!this.grounded) this._wallJump();
    if (!this.grounded) this._fall(dt);
    if (!this.grounded && this.cooldown === 0 && this.rolling === 0 && this.vy <= o.grabMaxRise) this._grab(direction);
```

Find the line that turns the body to face the way it is going (line 116) and **delete it**. Add:

```js
    if (direction && !rolling && this.locked === 0) this.heading = turnToward(this.heading, Math.atan2(direction.x, direction.z), o.turnRate * dt);
```

Under the `if (this.hang)` block, which ends line 106, add the move (a body that moves does nothing else):

```js
    if (this.move || this._startMove(direction)) {
      this._move(dt);
      return;
    }
```

and under the line `this.cooldown = Math.max(0, this.cooldown - dt);` (line 102), add:

```js
    this.locked = Math.max(0, this.locked - dt);
```

Last, the constructor. Under the line `this.cooldown = 0;` (line 89) add the three new pieces of state:

```js
    this.move = null; // when the body vaults a wall or mantles a ledge: { kind ("vault" or "mantle"), t (seconds so far), time, from, to, top }
    this.kickedOff = null; // the wall it kicked off last, which it can't kick off again until it has kicked off another, or landed
    this.wallJumps = 0; // how many times the body has kicked off a wall, since it last had its feet on something
    this.locked = 0; // seconds left that the keys can't steer, after a kick
```

Things to notice (about `update`):

- **A body that moves skips the rest of `update`**, as a body that hangs does: it is not walked, jumped or fallen, and the walls don't push it. `_move` decides everything.
- **The kick is between `_jump` and `_fall`**, so that the jump of the ground (which takes the key) has its chance first, and a kick only gets a key that was not used.
- **`locked` only stops the turning**, and counts down on the ground and in the air, so that it is gone by the time the body is back on the ground.

### Tests

Add these four modules at the **end** of `tests/controller.tests.js` (below line 1074), one at a time. **All go in `controller.tests.js`**, and not in `moves.tests.js`, which is for the tests of `moves.js` and is finished. The first:

```js
QUnit.module("Controller vaulting", () => {
  const dt = 1 / 60;
  const north = { x: 0, z: 1 };
  const LOW = { name: "low wall", minX: -5, maxX: 5, minY: 0, maxY: 0.9, minZ: 0, maxZ: 0.4 };
  const runner = (box = LOW, options = {}) => new Controller({ x: 0, z: -5, heading: 0, world: new World({ boxes: [box] }), options });
  // Runs north for `seconds`, and says how high the feet got.
  const run = (body, seconds, sprint = false) => {
    let top = body.y;
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      body.update(north, sprint, dt);
      top = Math.max(top, body.y);
    }
    return top;
  };

  QUnit.test("a runner that runs at a low wall goes over it, and is on the ground beyond it, still running", (assert) => {
    const body = runner();
    run(body, 3);
    assert.true(body.z > LOW.maxZ + SCOUT.radius);
    assert.strictEqual(body.y, 0);
    assert.true(body.grounded);
    assert.strictEqual(body.move, null);
    assert.strictEqual(body.speed, SCOUT.jogSpeed);
  });

  QUnit.test("it begins as the body gets to the wall, and is a vault", (assert) => {
    const body = runner();
    let began = null;
    for (let i = 0; i < 200 && !began; i++) {
      body.update(north, false, dt);
      if (body.move) began = { z: body.z, kind: body.move.kind };
    }
    assert.strictEqual(began.kind, "vault");
    assert.true(began.z < LOW.minZ - SCOUT.radius, "before it has touched the wall");
    assert.true(began.z > LOW.minZ - SCOUT.radius - BODY.vaultReach - 0.2);
  });

  QUnit.test("it goes over the top of the wall, as high as the lift says, and not much higher", (assert) => {
    const body = runner();
    const top = run(body, 3);
    assert.true(Math.abs(top - (LOW.maxY + BODY.vaultLift)) < 1e-9);
  });

  QUnit.test("it takes the time that the way takes at the speed it is going, and a sprint is faster than a jog", (assert) => {
    const timeOf = (sprint) => {
      const body = runner();
      for (let i = 0; i < 600 && !body.move; i++) body.update(north, sprint, dt);
      return body.move.time;
    };
    assert.true(timeOf(true) < timeOf(false));
    assert.true(timeOf(false) > 0.3 && timeOf(false) < 1);
  });

  QUnit.test("it does not steer or stop: the keys are not read while it goes", (assert) => {
    const body = runner();
    while (!body.move) body.update(north, false, dt);
    const heading = body.heading;
    for (let i = 0; i < 5; i++) body.update({ x: -1, z: 0 }, false, dt);
    assert.strictEqual(body.heading, heading);
    assert.notStrictEqual(body.move, null);
  });

  QUnit.test("a walk is not a vault: a body that is too slow stops at the wall", (assert) => {
    const body = runner(LOW, { jogSpeed: BODY.vaultSpeed - 1 });
    run(body, 3);
    assert.strictEqual(body.move, null);
    assert.true(body.z < LOW.minZ);
  });

  QUnit.test("a wall that is too high is not vaulted, and stops the body", (assert) => {
    const body = runner({ ...LOW, maxY: BODY.vaultHeight + 0.3 });
    run(body, 3);
    assert.true(body.z < LOW.minZ);
  });

  QUnit.test("a wall that is too thick is not vaulted either", (assert) => {
    const body = runner({ ...LOW, maxZ: BODY.vaultDepth + 0.6 });
    run(body, 3);
    assert.true(body.z < LOW.minZ);
  });

  QUnit.test("a body in the air does not vault: it falls, or catches what it can", (assert) => {
    const body = runner();
    body.placeAt(0, 3, -1);
    body.speed = 5;
    body.update(north, false, dt);
    assert.strictEqual(body.move, null);
  });

  QUnit.test("a body that is only walking along the wall does not vault it", (assert) => {
    const body = new Controller({ x: -3, z: -0.5, heading: Math.PI / 2, world: new World({ boxes: [LOW] }) });
    for (let i = 0; i < 100; i++) body.update({ x: 1, z: 0 }, false, dt);
    assert.strictEqual(body.move, null);
  });

  QUnit.test("it can be reset or placed somewhere else in the middle of a vault", (assert) => {
    const body = runner();
    while (!body.move) body.update(north, false, dt);
    body.placeAt(0, 5, 0);
    assert.strictEqual(body.move, null);
    const again = runner();
    while (!again.move) again.update(north, false, dt);
    again.reset();
    assert.strictEqual(again.move, null);
  });
});
```

Open `tests.html`: the new tests pass. Then add the second module, **in `tests/controller.tests.js` too**, below the last line of the one you have just added:

```js
QUnit.module("Controller mantling", () => {
  const dt = 1 / 60;
  const CRATE = { name: "crate", minX: 0, maxX: 4, minY: 0, maxY: 1.5, minZ: 0, maxZ: 1.5 };
  const mantler = (box = CRATE, options = {}) => new Controller({ x: 2, z: -SCOUT.radius - 0.1, heading: 0, world: new World({ boxes: [box] }), ledges: ledgesOf([box]), options });
  const run = (body, frames, jump = false) => {
    for (let i = 0; i < frames; i++) body.update(null, false, dt, jump);
  };

  QUnit.test("a body at a crate that is too high to step onto mantles it when the jump key goes down", (assert) => {
    const body = mantler();
    body.update(null, false, dt, true);
    assert.strictEqual(body.move.kind, "mantle");
    assert.strictEqual(body.vy, 0);
  });

  QUnit.test("it is a jump that is wanted: without the key, nothing happens", (assert) => {
    const body = mantler();
    run(body, 30);
    assert.strictEqual(body.move, null);
  });

  QUnit.test("it takes the time of the mantle, and ends standing on top of the crate, on the ground", (assert) => {
    const body = mantler();
    run(body, Math.ceil(BODY.mantleTime / dt) - 3, true);
    assert.notStrictEqual(body.move, null);
    run(body, 6, true);
    assert.strictEqual(body.move, null);
    assert.strictEqual(body.y, 1.5);
    assert.true(body.grounded);
    assert.true(body.z > CRATE.minZ && body.z < CRATE.maxZ);
  });

  QUnit.test("it goes up first and then over the edge, as a climb does, and faces the wall the whole way", (assert) => {
    const body = mantler();
    run(body, 6, true);
    assert.strictEqual(body.heading, 0);
    const z = body.z;
    run(body, 12, true);
    assert.true(body.y > 0.1, "up");
    assert.true(Math.abs(body.z - z) < 0.2, "not yet over");
  });

  QUnit.test("it stands still when it has mantled: the speed is taken away, and the ledge is not caught again at once", (assert) => {
    const body = mantler();
    run(body, 80, true);
    assert.strictEqual(body.speed, 0);
    assert.strictEqual(body.hang, null);
    assert.strictEqual(body.y, 1.5);
  });

  QUnit.test("a ledge that is too high for the hands from the ground is jumped at instead", (assert) => {
    const body = mantler({ ...CRATE, maxY: BODY.mantleHeight + 0.3 });
    body.update(null, false, dt, true);
    assert.strictEqual(body.move, null);
    assert.true(body.vy > 0);
  });

  QUnit.test("a body that is not facing the crate jumps, and does not mantle", (assert) => {
    const body = mantler();
    body.heading = Math.PI;
    body.update(null, false, dt, true);
    assert.strictEqual(body.move, null);
    assert.true(body.vy > 0);
  });

  QUnit.test("a runner that does not have room on top of the crate does not mantle it", (assert) => {
    const world = new World({ boxes: [CRATE, { minX: 0, maxX: 4, minY: 2, maxY: 3, minZ: 0, maxZ: 1.5 }] });
    const body = new Controller({ x: 2, z: -SCOUT.radius - 0.1, heading: 0, world, ledges: ledgesOf([CRATE]) });
    body.update(null, false, dt, true);
    assert.strictEqual(body.move, null);
  });
});
```

The third:

```js
QUnit.module("Controller kicking off a wall", () => {
  const dt = 1 / 60;
  const WALL = { name: "wall", minX: -10, maxX: 10, minY: 0, maxY: 6, minZ: 0, maxZ: 1 };
  const kicker = (options = {}, box = WALL) => {
    const body = new Controller({ x: 0, z: -SCOUT.radius - 0.1, heading: 0, world: new World({ boxes: [box] }), options });
    body.placeAt(0, 2, -SCOUT.radius - 0.1); // in the air, beside the wall, facing it
    return body;
  };
  // A jump key that goes down, in the air.
  const press = (body, direction = null) => {
    body.update(direction, false, dt, false);
    body.update(direction, false, dt, true);
  };

  QUnit.test("a body in the air beside a wall that it faces, when the jump key goes down, is kicked up and out from the wall", (assert) => {
    const body = kicker();
    press(body);
    assert.strictEqual(body.wallJumps, 1);
    assert.true(Math.abs(body.vy - (BODY.wallJumpSpeed - BODY.gravity * dt)) < 1e-9);
    assert.strictEqual(body.speed, BODY.wallKick);
    assert.true(body.jumping);
  });

  QUnit.test("it is turned to face away from the wall, and goes that way", (assert) => {
    const body = kicker();
    press(body);
    assert.true(Math.abs(Math.abs(body.heading) - Math.PI) < 1e-9);
    const z = body.z;
    for (let i = 0; i < 10; i++) body.update(null, false, dt);
    assert.true(body.z < z, "away from the wall, to the south");
  });

  QUnit.test("it needs a wall, and a wall that it faces", (assert) => {
    const far = kicker();
    far.z = -3;
    press(far);
    assert.strictEqual(far.wallJumps, 0);
    const turned = kicker();
    turned.heading = Math.PI;
    press(turned);
    assert.strictEqual(turned.wallJumps, 0);
  });

  QUnit.test("on the ground, beside a wall, the jump key is a jump", (assert) => {
    const body = new Controller({ x: 0, z: -SCOUT.radius - 0.1, heading: 0, world: new World({ boxes: [WALL] }) });
    press(body);
    assert.strictEqual(body.wallJumps, 0);
    assert.strictEqual(body.speed, 0);
  });

  QUnit.test("the keys do not steer for a moment after a kick, and then they do", (assert) => {
    const body = kicker();
    press(body);
    const heading = body.heading;
    body.update({ x: 0, z: 1 }, false, dt);
    assert.strictEqual(body.heading, heading);
    for (let i = 0; i < Math.ceil(BODY.wallLock / dt) + 20; i++) body.update({ x: 0, z: 1 }, false, dt);
    assert.true(Math.abs(body.heading) < Math.abs(heading));
  });

  QUnit.test("never twice in a row off the same wall", (assert) => {
    const body = kicker();
    press(body);
    assert.strictEqual(body.wallJumps, 1);
    body.heading = 0;
    body.z = -SCOUT.radius - 0.1;
    press(body);
    assert.strictEqual(body.wallJumps, 1);
  });

  QUnit.test("there is no limit to the kicks in one jump, between two walls", (assert) => {
    const south = { name: "south", minX: -10, maxX: 10, minY: 0, maxY: 60, minZ: 0, maxZ: 1 };
    const north = { name: "north", minX: -10, maxX: 10, minY: 0, maxY: 60, minZ: -2.4, maxZ: -1.4 };
    const body = new Controller({ x: 0, z: -0.7, heading: 0, world: new World({ boxes: [south, north] }) });
    body.placeAt(0, 2, -0.7);
    for (let kick = 0; kick < 12; kick++) {
      body.heading = kick % 2 === 0 ? 0 : Math.PI;
      body.z = -0.7;
      press(body);
    }
    assert.strictEqual(body.wallJumps, 12);
  });

  QUnit.test("landing gives the kicks back, and the wall again", (assert) => {
    const body = kicker();
    press(body);
    for (let i = 0; i < 300 && !body.grounded; i++) body.update(null, false, dt);
    assert.true(body.grounded);
    assert.strictEqual(body.wallJumps, 0);
    assert.strictEqual(body.kickedOff, null);
  });

  QUnit.test("kicking between two walls goes on up, to the top of them, where the ledge is caught", (assert) => {
    const wall = (minX, maxX) => ({ name: "wall", minX, maxX, minY: 0, maxY: 20, minZ: -5, maxZ: 5 });
    const boxes = [wall(-3.1, -1), wall(1, 3.1)];
    const world = new World({ boxes });
    const body = new Controller({ x: -0.5, z: 0, heading: -Math.PI / 2, world, ledges: ledgesOf(boxes) });
    // A player who is jumping in a gap between two walls: the key goes up and down while a wall is near (to kick off it), and is held otherwise.
    let kicks = 0;
    let last = 0;
    for (let i = 0; i < 1200 && !body.hang; i++) {
      const near = Boolean(findWall(world, body, body.options, body.kickedOff));
      body.update(null, false, dt, near ? i % 2 === 0 : true);
      if (body.wallJumps > last) kicks++;
      last = body.wallJumps;
    }
    assert.notStrictEqual(body.hang, null, "it is hanging");
    assert.strictEqual(body.hang.ledge.y, 20);
    assert.true(kicks > 10, "more than ten kicks");
  });

  QUnit.test("a kick carries higher than the jump it came from", (assert) => {
    const reach = (kick) => {
      const body = kicker();
      if (kick) press(body);
      let top = body.y;
      for (let i = 0; i < 90; i++) {
        body.update(null, false, dt, kick);
        top = Math.max(top, body.y);
      }
      return top;
    };
    assert.true(reach(true) > reach(false) + 0.5);
  });
});
```

And the fourth:

```js
QUnit.module("Controller grab assist", () => {
  const dt = 1 / 60;
  const WALL = { name: "wall", minX: -5, maxX: 5, minY: 0, maxY: 3.9, minZ: 0, maxZ: 1 };
  const jumper = (options = {}) => new Controller({ x: 0, z: -SCOUT.radius - 0.15, heading: 0, world: new World({ boxes: [WALL] }), ledges: ledgesOf([WALL]), options });
  // Jumps at the wall, and holds the key toward it (or not), until it is caught, or has come down.
  const jumpAt = (body, direction) => {
    for (let i = 0; i < 90 && !body.hang && !(i > 10 && body.grounded); i++) body.update(direction, false, dt, i < 30);
    return body;
  };

  QUnit.test("a ledge that is just too high for a jump is caught by a body that is steering toward it", (assert) => {
    assert.notStrictEqual(jumpAt(jumper(), { x: 0, z: 1 }).hang, null);
  });

  QUnit.test("and not by one that is not: the help is for a body that is asking to go there", (assert) => {
    assert.strictEqual(jumpAt(jumper(), null).hang, null);
  });

  QUnit.test("and not at all, without the help", (assert) => {
    const none = { assistReach: 0, assistDistance: 0, assistAngle: 0 };
    assert.strictEqual(jumpAt(jumper(none), { x: 0, z: 1 }).hang, null);
  });

  QUnit.test("a body that is caught with help hangs just as one that was caught without it does", (assert) => {
    const body = jumpAt(jumper(), { x: 0, z: 1 });
    assert.true(Math.abs(body.y - (3.9 - BODY.hangDrop)) < 1e-9);
    assert.strictEqual(body.heading, 0);
  });

  QUnit.test("help is a little: a wall that is much too high is not caught", (assert) => {
    const high = { ...WALL, maxY: 6 };
    const body = new Controller({ x: 0, z: -SCOUT.radius - 0.15, heading: 0, world: new World({ boxes: [high] }), ledges: ledgesOf([high]) });
    assert.strictEqual(jumpAt(body, { x: 0, z: 1 }).hang, null);
  });
});
```

Things to notice:

- **A vault is tested by running at a wall**: the body is on the far side of it, on the ground, still running, and it went over the top as high as the lift says and no higher. A body that is too slow, and a wall that is too high or too thick, stop at the wall.
- **A kick between two walls goes on to the top.** A test plays the game of a player: the key goes up and down while a wall is near (so that it can be kicked off), and is held otherwise. Between two walls twenty metres high the body kicks more than ten times, and ends up hanging from the ledge at the top. There is a test that there is no limit to the kicks, too, and one that a wall cannot be kicked off twice in a row.
- **Help is tested with and without**: the same jump at the same wall, with the key held toward it and not, and with the numbers of help set to zero.

Open `tests.html`. You should see **481 passing tests**: 34 more than in the last step.

---

## Step 6: Clips for the moves

The character file has the clips: `NinjaJump_Start` (a leap, with the knees tucked up: a vault, and a kick) and `ClimbUp_1m` (a climb up something a metre high: a mantle). Open `js/character.js`. Changes from the bottom up, again. At the bottom of the file, add `VAULT_RATE` to the two lists of exports (the lines that begin `module.exports = ` and `Object.assign(window`, line 119 and line 121). **Delete each line**, and add:

```js
  module.exports = { RUNNERS, CLIPS, GAITS, PACE, MIN_RATE, MAX_RATE, LAND_RATE, JUMP_RATE, ROLL_RATE, VAULT_RATE, FADE_TIME, clipForSpeed, clipForBody, ClipPlayer, loadRunner };
```

and:

```js
  Object.assign(window, { RUNNERS, CLIPS, GAITS, PACE, MIN_RATE, MAX_RATE, LAND_RATE, JUMP_RATE, ROLL_RATE, VAULT_RATE, FADE_TIME, clipForSpeed, clipForBody, ClipPlayer, loadRunner });
```

Then find the comment of `clipForBody` and the function (lines 37 to 51) and **delete them**, and add this:

```js
// The clip for a body (a Controller): { name, rate, loop }. Hanging from a ledge, the clip for hanging, or for shimmying to the left or the right,
// or, while climbing it, the clip for climbing, once (it is as long as the climb). On the way up from a jump, the jump clip, once, and then it stays at its last pose;
// on the way down, the falling clip, which goes on for as long as the fall; in a roll, the roll clip, once, fast enough to be done when the roll
// is; just after a hard landing, the landing clip, once; and otherwise the one for the speed.
function clipForBody(body) {
  if (body.move) return body.move.kind === "vault" ? { name: CLIPS.vault, rate: VAULT_RATE, loop: false } : { name: CLIPS.mantle, rate: 1, loop: false };
  if (body.hang) {
    if (body.hang.climb !== null) return { name: CLIPS.climb, rate: 1, loop: false };
    if (body.hang.moving !== 0) return { name: body.hang.moving > 0 ? CLIPS.shimmyRight : CLIPS.shimmyLeft, rate: 1, loop: true };
    return { name: CLIPS.hang, rate: 1, loop: true };
  }
  if (!body.grounded && body.jumping && body.wallJumps > 0) return { name: CLIPS.vault, rate: VAULT_RATE, loop: false };
  if (!body.grounded) return body.jumping ? { name: CLIPS.jump, rate: JUMP_RATE, loop: false } : { name: CLIPS.fall, rate: 1, loop: true };
  if (body.rolling > 0) return { name: CLIPS.roll, rate: ROLL_RATE, loop: false };
  if (body.landing > 0) return { name: CLIPS.land, rate: LAND_RATE, loop: false };
  return { ...clipForSpeed(body.speed), loop: true };
}
```

Above the line `const ROLL_RATE = 2;` (line 35) add:

```js
const VAULT_RATE = 2; // the tuck of the vault clip is over in a tenth of a second as it was recorded, and a vault takes about half a second
```

And find the line that begins `const CLIPS =` (line 13) and **delete it**. Add this in its place:

```js
const CLIPS = { idle: "Idle_Loop", walk: "Walk_Loop", jog: "Jog_Fwd_Loop", sprint: "Sprint_Loop", jump: "Jump_Start", fall: "Jump_Loop", land: "Jump_Land", roll: "Roll", hang: "Climb_Idle_Loop", shimmyLeft: "Climb_Left_Loop", shimmyRight: "Climb_Right_Loop", climb: "ClimbLedge", vault: "NinjaJump_Start", mantle: "ClimbUp_1m" };
```

Things to notice:

- **A move comes first**, before hanging and being in the air: a vaulting body is on the ground (it is, as far as the controller is concerned) and would otherwise be running.
- **A vault plays fast** (`VAULT_RATE`), because the tuck of the clip is over in a tenth of a second as it was recorded, and a vault is about half a second.
- **A kick is the vault clip again**, played from the start. A body that is going up from a jump *and* has kicked is leaping, so it is the tuck, and a body that has kicked and is on its way down is falling, so it is the falling clip. That is how a kick shows: a second leap in the air, where the jump clip would be a pose that has already finished.

### Tests

In `tests/character.tests.js`, **change** the list in *"the clips are all clips the character file has"* (line 37) to:

```js
    assert.deepEqual(Object.values(CLIPS), ["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop", "Jump_Start", "Jump_Loop", "Jump_Land", "Roll", "Climb_Idle_Loop", "Climb_Left_Loop", "Climb_Right_Loop", "ClimbLedge", "NinjaJump_Start", "ClimbUp_1m"]);
```

Find the module `clipForBody` (lines 41 to 92). **Delete it**, and add this in its place (the old module, with a body that has a `move` and some `wallJumps` in it, and three new tests):

```js
QUnit.module("clipForBody", () => {
  const body = (changes) => ({ grounded: true, landing: 0, rolling: 0, jumping: false, hang: null, move: null, wallJumps: 0, speed: 0, ...changes });

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

  QUnit.test("hanging from a ledge, it is the hanging clip, looping, and not the falling clip, though the body is in the air", (assert) => {
    const clip = clipForBody(body({ grounded: false, hang: { climb: null, moving: 0 } }));
    assert.deepEqual(clip, { name: CLIPS.hang, rate: 1, loop: true });
  });

  QUnit.test("shimmying along a ledge, it is the clip for going left, or right, looping", (assert) => {
    assert.strictEqual(clipForBody(body({ grounded: false, hang: { climb: null, moving: -1 } })).name, CLIPS.shimmyLeft);
    assert.strictEqual(clipForBody(body({ grounded: false, hang: { climb: null, moving: 1 } })).name, CLIPS.shimmyRight);
    assert.true(clipForBody(body({ grounded: false, hang: { climb: null, moving: 1 } })).loop);
  });

  QUnit.test("climbing a ledge, it is the climbing clip, played once", (assert) => {
    const clip = clipForBody(body({ grounded: false, hang: { climb: 0.2, moving: 0 } }));
    assert.deepEqual(clip, { name: CLIPS.climb, rate: 1, loop: false });
  });

  QUnit.test("vaulting a wall, it is the vault clip, played once and fast", (assert) => {
    const clip = clipForBody(body({ move: { kind: "vault" }, speed: 5 }));
    assert.deepEqual(clip, { name: CLIPS.vault, rate: VAULT_RATE, loop: false });
    assert.true(VAULT_RATE > 1);
  });

  QUnit.test("mantling a ledge, it is the clip for climbing up something about a metre high, played once", (assert) => {
    const clip = clipForBody(body({ move: { kind: "mantle" } }));
    assert.deepEqual(clip, { name: CLIPS.mantle, rate: 1, loop: false });
  });

  QUnit.test("on the way up from a kick off a wall, it is the tuck of the vault, and not the jump clip, so that a kick can be seen", (assert) => {
    const kick = clipForBody(body({ grounded: false, jumping: true, wallJumps: 1 }));
    assert.strictEqual(kick.name, CLIPS.vault);
    assert.strictEqual(clipForBody(body({ grounded: false, jumping: true, wallJumps: 0 })).name, CLIPS.jump);
    assert.strictEqual(clipForBody(body({ grounded: false, jumping: false, wallJumps: 1 })).name, CLIPS.fall);
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

Open `tests.html`. You should see **484 passing tests**: 3 more.

---

## Step 7: The training yard, and the game

### The yard

In `js/plan.js`, the yard is data, like the buildings: a table of pieces and a function that makes boxes from it. Changes from the bottom up. At the bottom, add `YARD`, `YARD_START` and `yardBoxes` to the two lists of exports (the lines that begin `module.exports = ` and `Object.assign(window`, line 317 and line 319), after `ledgeSpot`. **Delete each line**, and add:

```js
  module.exports = { STREET, GRID, ROAD_DEPTH, MIN_ALLEY, BUILDINGS, FACINGS, LAYOUTS, spacing, blockSize, junctionCenter, blockCenter, groundHeight, roofSpot, ledgeSpot, YARD, YARD_START, yardBoxes, streetPlacements, footprintSize, buildingPlacements, footprint, boxGap, deckInsets, buildingBoxes, ledgeBoxes, RIM_WIDTH, rimBoxes, blockBoxes, districtBounds, planProblems, piecesUsed };
```

and:

```js
  Object.assign(window, { STREET, GRID, ROAD_DEPTH, MIN_ALLEY, BUILDINGS, FACINGS, LAYOUTS, spacing, blockSize, junctionCenter, blockCenter, groundHeight, roofSpot, ledgeSpot, YARD, YARD_START, yardBoxes, streetPlacements, footprintSize, buildingPlacements, footprint, boxGap, deckInsets, buildingBoxes, ledgeBoxes, RIM_WIDTH, rimBoxes, blockBoxes, districtBounds, planProblems, piecesUsed });
```

Then add this directly **above** the comment `// The space between two boxes:` (line 251):

```js
// The training yard: walls and crates on the road south of where the runner starts, one set for each of the moves, to try them on. Each is
// { name, move, x, z, width, depth, height, color }: the middle of it on the ground, its size (width along x, depth along z, and how high
// it stands above the road), and the colour it is drawn in. A runner coming north along the road meets them in turn: a low wall to vault, a
// crate to mantle, two walls to kick between all the way up, and a wall that is only just too high to reach, to be helped up.
const YARD = [
  { name: "low wall", move: "vault", x: 0, z: -36, width: 6, depth: 0.4, height: 0.9, color: "#c25f12" },
  { name: "crate", move: "mantle", x: 0, z: -31, width: 4, depth: 1.5, height: 1.5, color: "#8b5128" },
  { name: "west wall", move: "wall jump", x: -1.3, z: -25, width: 0.6, depth: 5, height: 8, color: "#4d5767" },
  { name: "east wall", move: "wall jump", x: 1.3, z: -25, width: 0.6, depth: 5, height: 8, color: "#6f7a8c" },
  { name: "high wall", move: "assist", x: 0, z: -16, width: 8, depth: 0.6, height: 3.9, color: "#2a6496" },
];

// Where to stand to begin the yard: on the road at its south end, facing north, with a run at the first wall.
const YARD_START = { x: 0, z: -43, heading: 0 };

// The pieces of the yard as boxes (the same kind of box as above, named "yard <name>"), standing on whatever the ground is where each is.
function yardBoxes(grid = GRID, yard = YARD) {
  return yard.map((piece) => {
    const ground = groundHeight(piece.x, piece.z, grid);
    return {
      name: `yard ${piece.name}`,
      minX: piece.x - piece.width / 2,
      maxX: piece.x + piece.width / 2,
      minY: ground,
      maxY: ground + piece.height,
      minZ: piece.z - piece.depth / 2,
      maxZ: piece.z + piece.depth / 2,
    };
  });
}
```

Things to notice:

- **Each piece is made for a move**, and has the size for it: a wall 0.9 high and 0.4 thick (under `vaultHeight`, and thin) to vault; a crate 1.5 high and 1.5 deep (over `vaultHeight`, under `mantleHeight`, and too thick to cross) to mantle; two walls eight metres high, two metres apart, to kick between all the way up; and a wall of 3.9, just higher than a jump and a reach can get to without help. The `move` of each is only a note for people and tests.
- **The yard stands on the road**, and each piece stands on whatever the ground is where it is (`groundHeight`), since the road is a little lower than the sidewalk.
- **`YARD_START` is where the runner begins now**: on the road at the south end of the yard, facing north, with a run at the first wall.
- **Each piece has a colour**, so that a player can tell them apart, and a tutorial can say "the orange wall".

In `tests/plan.tests.js`, add this at the **end** of the file (below line 383):

```js
QUnit.module("yardBoxes", () => {
  const boxes = yardBoxes();

  QUnit.test("there is a box for each piece of the yard, named for it, with the size of the piece", (assert) => {
    assert.strictEqual(boxes.length, YARD.length);
    for (const [i, piece] of YARD.entries()) {
      assert.strictEqual(boxes[i].name, `yard ${piece.name}`);
      assert.true(Math.abs(boxes[i].maxX - boxes[i].minX - piece.width) < 1e-9);
      assert.true(Math.abs(boxes[i].maxZ - boxes[i].minZ - piece.depth) < 1e-9);
      assert.true(Math.abs(boxes[i].maxY - boxes[i].minY - piece.height) < 1e-9);
    }
  });

  QUnit.test("each stands on the ground where it is, which is the road, and not above or in it", (assert) => {
    for (const [i, piece] of YARD.entries()) {
      assert.strictEqual(boxes[i].minY, groundHeight(piece.x, piece.z));
      assert.true(boxes[i].minY < 0, `${piece.name} is on the road`);
    }
  });

  QUnit.test("all of them are inside the district, none overlap, and none is where the runner starts", (assert) => {
    const bounds = districtBounds();
    for (const [i, box] of boxes.entries()) {
      assert.true(box.minX > bounds.minX && box.maxX < bounds.maxX && box.minZ > bounds.minZ && box.maxZ < bounds.maxZ, YARD[i].name);
      for (let j = i + 1; j < boxes.length; j++) assert.false(boxGap(box, boxes[j]).overlap, `${YARD[i].name} and ${YARD[j].name}`);
    }
    assert.true(boxes.every((box) => box.maxZ < -STREET.junction / 2), "all of them south of the junction that the runner starts in");
  });

  QUnit.test("each piece is for one of the moves, and has a colour", (assert) => {
    for (const piece of YARD) {
      assert.true(["vault", "mantle", "wall jump", "assist"].includes(piece.move), piece.name);
      assert.true(/^#[0-9a-f]{6}$/i.test(piece.color), piece.name);
    }
    assert.deepEqual([...new Set(YARD.map((piece) => piece.move))].sort(), ["assist", "mantle", "vault", "wall jump"]);
  });

  QUnit.test("the start of the yard is on the road, with room to run, facing the first piece", (assert) => {
    assert.true(groundHeight(YARD_START.x, YARD_START.z) < 0);
    assert.strictEqual(YARD_START.heading, 0);
    assert.true(YARD_START.z < boxes[0].minZ - 5, "a run of five metres or more");
    assert.true(YARD_START.x >= boxes[0].minX && YARD_START.x <= boxes[0].maxX);
  });

  QUnit.test("the yard is not in the buildings", (assert) => {
    const buildings = buildingBoxes();
    for (const box of boxes) for (const building of buildings) assert.false(boxGap(box, building).overlap);
  });

  QUnit.test("the two walls to kick between have a gap that a body fits in", (assert) => {
    const [west, east] = boxes.filter((box) => /wall$/.test(box.name) && /west|east/.test(box.name));
    assert.true(east.minX - west.maxX >= MIN_ALLEY);
  });
});
```

### The game

Now `js/main.js`, from the bottom up as well. In the group `World`, add the read-out for the move directly above the one for `hanging` (line 252):

```js
            readout("move", () => (body.move ? body.move.kind : body.wallJumps ? `wall jump ${body.wallJumps}` : "none")),
```

In the group `Runner`, add these five sliders directly under the one for `climb time` (line 217):

```js
            slider("vault height", body.options, "vaultHeight", 0.4, 2, 0.05),
            slider("mantle height", body.options, "mantleHeight", 0.8, 2.6, 0.05),
            slider("wall kick speed", body.options, "wallKick", 0, 10, 0.5),
            slider("wall jump speed", body.options, "wallJumpSpeed", 2, 14, 0.5),
            slider("grab help", body.options, "assistReach", 0, 1.5, 0.05),
```

The line that makes the boxes for the debug drawing (line 178) is **replaced**, so that the yard has its wireframe too:

```js
    const debugBoxes = new DebugBoxes(scene, [...boxes, ...lowerRoofs, ...rims, ...yard]);
```

Find the world of the body (lines 108 to 115: the line that makes `boxes`, down to the line that makes the `Controller`). **Delete the lines**, and add these in their place (the yard is added to the world, the camera's boxes and the ledges, and **drawn**):

```js
  const boxes = buildingBoxes();
  const lowerRoofs = ledgeBoxes();
  const rims = rimBoxes();
  const yard = yardBoxes();
  orbit.boxes = [...boxes, ...lowerRoofs, ...yard];
  const world = new World({ boxes: [...boxes, ...lowerRoofs, ...rims, ...yard], ground: (x, z) => groundHeight(x, z) });
  // The ledges that can be caught: the top edges of the roofs, of the lower roofs of the buildings in two levels, and of the yard.
  const ledges = ledgesOf([...boxes, ...lowerRoofs, ...yard]);

  // The yard is drawn as plain boxes, each in the colour of its piece.
  for (const [i, box] of yard.entries()) {
    const spec = boxMeshSpec(box);
    const mesh = BABYLON.MeshBuilder.CreateBox(box.name, { width: spec.width, height: spec.height, depth: spec.depth }, scene);
    mesh.position.set(spec.x, spec.y, spec.z);
    mesh.material = new BABYLON.StandardMaterial(`${box.name}-material`, scene);
    mesh.material.diffuseColor = BABYLON.Color3.FromHexString(YARD[i].color);
    mesh.material.specularColor = BABYLON.Color3.Black();
    mesh.receiveShadows = true;
    shadows.addShadowCaster(mesh);
    mesh.freezeWorldMatrix();
  }
  const body = new Controller({ ...START, world, bounds: districtBounds(), ledges });
```

Last, the line near the top of the file that says where the runner begins (line 13). **Delete it**, and add:

```js
const START = YARD_START; // where the runner begins: on the road, at the south end of the training yard, facing north
```

And the page's hint line, in `index.html` (line 25), which gets the new uses of Space:

```html
  <div class="hint">WASD run &middot; Shift sprint &middot; Space jump, vault, climb, kick off a wall &middot; mouse look (click first, Esc lets go) &middot; R restart &middot; C screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Things to notice:

- **The yard is in the world three times**: as boxes to collide with, as boxes for the camera to keep out of (so that it doesn't look at the runner from inside a crate), and as ledges (so that the top of the crate, and of every wall, can be caught).
- **It is drawn from the same boxes**, with the same function that sizes the wireframe (`boxMeshSpec`), in the colour of its piece. What is drawn is what is collided with, because it is the same data.
- **`START` is the yard's.** `R` and **Back to the start** put the runner at the south end of the yard.
- **Nothing changes in the frame.** `body.update` gets the same direction and the same jump key as before: a vault, a mantle and a kick are all decided inside.

### One more test

The test that matters most is in the real district: each piece of the yard can be passed by the move it is for. Add this at the **end** of `tests/controller.tests.js` (below line 1416):

```js
QUnit.module("The yard of the district", () => {
  const dt = 1 / 60;
  const boxes = [...buildingBoxes(), ...ledgeBoxes(), ...rimBoxes(), ...yardBoxes()];
  const world = () => new World({ boxes, ground: (x, z) => groundHeight(x, z) });
  const ledges = ledgesOf([...buildingBoxes(), ...ledgeBoxes(), ...yardBoxes()]);
  const piece = (name) => yardBoxes().find((box) => box.name === `yard ${name}`);
  const south = (box, back) => ({ x: (box.minX + box.maxX) / 2, z: box.minZ - back });

  QUnit.test("a runner coming north along the road from the start of the yard vaults the low wall, and is running on the other side of it", (assert) => {
    const wall = piece("low wall");
    const body = new Controller({ ...YARD_START, world: world(), ledges });
    let vaulted = false;
    for (let i = 0; i < 600 && body.z < wall.maxZ + 2; i++) {
      body.update({ x: 0, z: 1 }, false, dt);
      vaulted = vaulted || (body.move && body.move.kind === "vault");
    }
    assert.true(vaulted);
    assert.true(body.z > wall.maxZ + 1);
    assert.true(body.grounded);
    assert.strictEqual(body.y, groundHeight(body.x, body.z));
  });

  QUnit.test("a runner at the crate mantles it, and stands on it", (assert) => {
    const crate = piece("crate");
    const at = south(crate, SCOUT.radius + 0.1);
    const body = new Controller({ ...at, heading: 0, world: world(), ledges });
    for (let i = 0; i < 90; i++) body.update(null, false, dt, i < 3);
    assert.strictEqual(body.y, crate.maxY);
    assert.true(body.grounded);
  });

  QUnit.test("the two walls are close enough that a body kicked off one reaches the other before the top of the kick", (assert) => {
    const west = piece("west wall");
    const east = piece("east wall");
    const gap = east.minX - west.maxX;
    const across = (gap - SCOUT.radius * 2 - BODY.wallReach) / BODY.wallKick;
    assert.true(across < BODY.wallJumpSpeed / BODY.gravity);
    assert.true(gap > SCOUT.radius * 2 + 0.2, "and wide enough to stand between");
  });

  QUnit.test("the high wall is too high for a jump, and not with a little help", (assert) => {
    const wall = piece("high wall");
    const at = south(wall, SCOUT.radius + 0.15);
    const jumpAt = (options) => {
      const body = new Controller({ ...at, y: wall.minY, heading: 0, world: world(), ledges, options });
      for (let i = 0; i < 90 && !body.hang && !(i > 10 && body.grounded); i++) body.update({ x: 0, z: 1 }, false, dt, i < 30);
      return body.hang;
    };
    assert.strictEqual(jumpAt({ assistReach: 0, assistDistance: 0, assistAngle: 0 }), null);
    assert.notStrictEqual(jumpAt({}), null);
  });

  QUnit.test("every piece of the yard is for a move, and is the right size for it", (assert) => {
    for (const [i, piece] of YARD.entries()) {
      const box = yardBoxes()[i];
      const height = box.maxY - box.minY;
      if (piece.move === "vault") assert.true(height > BODY.stepHeight && height <= BODY.vaultHeight && piece.depth <= BODY.vaultDepth, piece.name);
      if (piece.move === "mantle") assert.true(height > BODY.vaultHeight && height <= BODY.mantleHeight && piece.depth > BODY.vaultDepth, piece.name);
      if (piece.move === "wall jump") assert.true(height >= BODY.wallMinHeight + jumpHeight(BODY), piece.name);
      if (piece.move === "assist") assert.true(height > jumpHeight(BODY) + BODY.handReach && height <= jumpHeight(BODY) + BODY.handReach + BODY.assistReach, piece.name);
    }
  });
});
```

Open `tests.html`. You should see **496 passing tests**: 12 more.

---

## Step 8: Try it

Serve the page and open it **with `?dev`**. The runner begins at the south end of the yard, facing north.

- [ ] Running, jumping and catching ledges are as before
- [ ] **Run at the low orange wall** (W, with the camera looking at it): the runner **vaults** it, with the **tuck clip**, in an arc, and **keeps running** on the other side. The **move** read-out says *vault* while it goes. **Walk** at it (tap W, and let go): the runner stops at the wall
- [ ] **Stand at the brown crate and press Space**: the runner **mantles** it, with the **climbing clip**, and ends **standing on the crate**. The read-out says *mantle*
- [ ] **Jump** at the grey walls (toward one, from a run), and **press Space again** while you are next to the wall: the runner is **kicked** off it, **away from it and up**, with the tuck clip, and the read-out says *wall jump 1*. Kick again off the other wall: *wall jump 2*, and again, as often as you like. **Kick your way up between the two walls, all the way to the top**, where the runner catches the ledge and hangs, and **W** climbs onto the wall
- [ ] **Jump at the tall blue wall with W held**: the runner **catches its ledge** (the hands are nearly, but not quite, high enough), and hangs, and **W climbs onto it**. With **grab help** at 0 in the developer panel, the same jump falls short
- [ ] **Look at the yard with *building boxes* on**: every piece has a wireframe, the size of the piece
- [ ] **Vault height** and **mantle height** change what can be vaulted and mantled. (Try the crate with a vault height of 1.6)
- [ ] **Wall kick speed** and **wall jump speed** change how far out and how high the kick goes
- [ ] A jump at the **low wall** from a little way back doesn't leave the runner **hanging with its feet in the ground**
- [ ] **R** and **Back to the start** put the runner back at the south end of the yard

**If something's wrong**

- **`ReferenceError: findVault is not defined` or `yardBoxes is not defined`:** the footer of `moves.js` or `plan.js` has to list the names, and `index.html` has to load `moves.js` (the starter's does) before the controller is used.
- **The runner never vaults:** it has to be going at least `vaultSpeed`, which is faster than a walk, and the wall has to be ahead of where it is *heading*. Switch on **building boxes** to see where the wall is.
- **The runner vaults, and comes down inside the wall:** the end of `_move` has to put the body on what is under it (`supportAt`), and the vault has to land past the far side of the wall, plus the width of the body (`vaultLanding`).
- **Space at the crate jumps and doesn't mantle:** `_startMove` is asked before the jump, and only for a body on the ground with a jump wanted. The crate has to be in front of the runner and no higher than `mantleHeight`.
- **The runner is kicked into the wall and not off it:** `findWall` gives the way *out* from the wall, which is from the box to the body; the heading is `atan2(nx, nz)` of it.
- **Every kick goes the same way, and the runner runs back into the wall:** `locked` makes the keys not steer for a moment. Without it the key that held the runner at the wall turns it round at once.

**Experiments** (change one, reload, then change it back):

- **`vaultSpeed: 0`**: a runner that has only just begun to move vaults a wall
- **`vaultHeight: 2.5`**: a runner vaults a wall over its head, and the crate
- **`vaultLift: 0.5`**: a vault that goes high over the wall, and a floating feeling
- **`wallKick: 0`**: a kick that only goes up, and never away from the wall, so that the runner has to be steered to the other wall
- **`wallLock: 0`**: the keys steer at once after a kick, and the runner is back at the wall in a moment
- **`assistReach: 2`**: grabs that are nearly right are very generous, and the body is snapped up to the ledge

---

## Step 9: Tests, all together

Your `tests.html` scripts should look like this:

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
  <script src="js/ledges.js"></script>
  <script src="js/moves.js"></script>
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
  <script src="tests/ledges.tests.js"></script>
  <script src="tests/moves.tests.js"></script>
  <script src="tests/controller.tests.js"></script>
  <script src="tests/debug.tests.js"></script>
  <script src="tests/devpanel.tests.js"></script>
```

Open it. You should see **496 passing tests**: the 400 you started with, plus 5 for the numbers, 17 for the vault, 10 for the mantle, 15 for the kick and the help, 34 for the body, 3 for the clips and 12 for the yard.

> **What these tests don't cover.** The *feel*: how long a vault takes, whether the knees clear the wall, whether a kick should carry further or higher, and how much help is too much. The clips were made for other things (a leap, and a climb up a metre), and are first tries. The sliders in the developer panel are how you find better ones. And `main.js`, the glue, is checked by playing.

> **Try breaking something.** In `moves.js`, in `findVault`, take out the line that checks the place to land (`world.push`). The test *"there is a place to land: not a drop, not a wall right behind it"* fails, and in the game a runner vaults a wall that has another wall right behind it, and ends up inside it. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| The numbers of the moves, in the table | `BODY`, `vaultHeight`, `mantleHeight`, `wallJumpSpeed`, `assistReach` |
| A line through a box (a slab test) | `crossing` |
| Whether a runner can vault a wall | `findVault` |
| Mantling, as catching a ledge with other numbers | `findMantle`, `findLedge(..., mantling)` |
| A floor under the hang | `canHang`, `supportAt` |
| A wall to kick off, and the way out from it | `findWall` |
| A little help, as the same question with more allowed | `assisted`, `_grab` |
| A state that takes the body from one place to another | `move`, `_move`, `_startMove` |
| A height eased in and out | `smooth` in `_move` |
| A jump in the air, never twice off the same wall in a row | `_wallJump`, `wallJumps` |
| Keys that don't steer for a moment | `locked`, `wallLock` |
| Clips borrowed from other moves | `clipForBody`, `CLIPS.vault`, `CLIPS.mantle` |
| A training yard as data | `YARD`, `yardBoxes`, `YARD_START` |
| A test that each piece of the yard can be passed | "The yard of the district" |

## Challenges

1. **Mantle at a run.** A runner who is running at a crate mantles it without pressing Space. (Hint: `_startMove`, `findMantle`, and `direction`.)
2. **Slide under.** A low bar to slide under, with the `Slide_Start` clips. (Hint: a wall with a gap under it, and `wallsAt`, which counts only boxes that start below the head.)
3. **A wall run.** Run along a wall for a moment before a kick. (Hint: a state like `move`, and gravity turned down.)
4. **Smoother help.** The grab with help snaps the body to the ledge. Move it there over a tenth of a second. (Hint: the `move` state, with a `kind`.)
5. **A vault from the air.** A jump at a low wall that goes over it with the tuck, and keeps its speed. (Hint: `findVault`, with the speed of the jump.)

---

*That's the moves between. A runner can go over a low wall, up a crate, off a wall and up a ledge that is nearly out of reach. Next the **roofs** get what they have been missing: window sills, pipes and fire escapes to climb from the street, and the roofs measured properly, so that the whole district is a place to run.*
