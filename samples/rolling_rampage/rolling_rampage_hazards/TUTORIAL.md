# Tutorial: Rolling Rampage Hazards -- Moving Platforms, Pistons and Slime

This is the sixth tutorial in the Rolling Rampage series. The levels so far were still: floors that stayed where they were, and nothing to be afraid of but an edge. In this step the course fights back. A **platform** shuttles to and fro across a gap that is too wide to roll over, and has to be ridden. A **piston** sits level with the floor, then shoots up and throws the marble into the air. A puddle of **slime** slows the marble to a crawl and, if it stays in, dissolves it. There is a new level, **Hazard Alley**, with all three. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Slime** as a rule: a marble that is eaten while it is in a puddle, recovers when it is out, and dissolves when it has had too much, in plain numbers
- Puddles as **zones**, which now say when the marble goes in *and* when it comes out
- A marble that is **slowed and turned green** by the slime, and put back clean
- **Movers** as plain numbers: where a platform or a piston is at any moment, worked out from the time
- Movers built as **animated physics bodies**: they push the marble, and nothing pushes them
- A marble that is **carried by a moving platform**, which the physics alone won't do
- A new level, **Hazard Alley**, with a platform, a piston, a puddle, a checkpoint and a goal
- Unit tests for all of it, **including a real marble** carried across a gap, thrown by a piston, and dissolved

**What you'll learn:** physics bodies that are moved by the game (`ANIMATED`) and `setTargetTransform`, a motion described as a function of time (and why that is easier to test than one stored in the physics), waves that ease and waves that snap, why a rolling ball is left behind by a floor that moves under it and what to do about it, trigger *exit* events as well as enter events, a state that builds up and wears off (the slime), a zone of its own size, and bringing a mesh's world matrix up to date when nothing is being drawn.

## Where you're starting

This folder is a copy of the finished Clock sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_hazards/
├── index.html, tests.html   (change -- Steps 1 and 7)
├── css/                     (no change: see the note in Step 7)
├── js/
│   ├── slime.js            (placeholder -- Step 2)
│   ├── movers.js           (placeholder -- Steps 5 and 6)
│   ├── level.js            (changes -- Step 1)
│   ├── zones.js            (changes -- Step 3)
│   ├── marble.js           (changes -- Steps 4 and 6)
│   ├── main.js             (changes -- Step 7)
│   └── physics.js, course.js, clock.js, steering.js, controls.js, tilt.js, camera.js, splash.js   (from the Clock sample)
└── tests/
    ├── slime.tests.js      (placeholder)
    ├── movers.tests.js     (placeholder)
    └── zones.tests.js and marble.tests.js grow, and the rest   (from the Clock sample)
```

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_hazards/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Clock sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**307**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step. Where a step adds a long function, paste it **whole**, below the closing `}` of the one above it. Where it **replaces** a block, replace the whole block, to its closing `}`.

---

## Step 1: A level with hazards

A level is data, so the hazards are data too. Open `js/level.js`. Three changes: say what the new fields are, carry them through `parseLevel`, and add the level.

Replace the comment directly above `LEVELS` (from `// A zone sits on flat floor` down to the line `const LEVELS = [`) with:

```js
// A zone sits on flat floor, so its disc lies flat on it.
//
// A level can also have `slime`, puddles (zones with a `radius` of their own) that slow a marble and
// dissolve it if it stays, and `movers`, which move on their own. A mover is a "platform", which shuttles
// between `from` and `to` (both { col, row }), or a "piston", which pops up where it is (`at`) by `rise`
// units. Either has a `size` (x and z, in world units), a `height` (as a digit, where its top is), and a
// `period` in seconds for a whole cycle, and may have a `phase`, how far through its cycle it starts, from 0 to 1.
const LEVELS = [
```

Replace `parseLevel` with:

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
  };
}
```

and add the new level to `LEVELS`, after the last one (the `},` that ends *The Bridge*) and before the closing `];`:

```js
  {
    name: "Hazard Alley",
    start: { col: 1.5, row: 4 },
    time: 70,
    goal: { col: 24, row: 4 },
    checkpoints: [{ col: 11.5, row: 4, bonus: 15 }],
    slime: [{ col: 21.5, row: 4, radius: 1.6 }],
    movers: [
      { kind: "platform", from: { col: 5.25, row: 4 }, to: { col: 8.75, row: 4 }, height: 4, size: { x: 5, z: 6 }, period: 14 },
      { kind: "piston", at: { col: 14, row: 4 }, height: 4, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 4, phase: 0.1 },
    ],
    rows: [
      "..........................",
      "..........................",
      "44444.....4444444321000000",
      "44444.....4444444321000000",
      "44444.....4444444321000000",
      "44444.....4444444321000000",
      "44444.....4444444321000000",
      "..........................",
      "..........................",
    ],
  },
```

Things to notice:

- **A mover is described, not built.** A platform has a `from` and a `to` (places in the grid, like the start), a `size`, a `height` (as a digit, so its top is level with the floor at its ends), and a `period`: the seconds a whole trip there and back takes. A piston has an `at` and a `rise`. Both may have a `phase`, how far through the cycle they start, so a row of pistons needn't all fire at once.
- **The platform fits a gap.** Hazard Alley's first deck ends at column 4 and the next begins at column 10. That is 12 units of nothing. The platform is 5 wide, and runs from touching one deck to touching the other.
- **The numbers are chosen by looking at the picture.** The grid has the platform's gap in dots, the decks at height 4 (two units) on both sides, a ramp down, and a flat deck at the end. Read it the way you read the other levels.
- **`parseLevel` defaults the new fields to empty lists** (`|| []`), so the two older levels, which have no hazards, still work and need no change.
- **Slime puddles have a `radius` of their own**, because a puddle is not the size of a checkpoint.

Nothing is built from the new fields yet, so open the page and press **N** twice: the new level appears, and it is just a plain level with a gap in it. Open `tests.html`: the old tests that go through every level (that every start is over floor, that no slope is too steep, that a marble drops onto the floor) now go through three, and still pass. That is **307 passing tests**: the same ones, with more to check.

---

## Step 2: Slime, as a rule

A marble in slime is eaten a little at a time. Stay in too long and it dissolves; leave and it recovers. That is a number that goes up while the marble is in a puddle and down while it is out, from 0 (clean) to 1 (dissolved), and it has nothing to do with the screen or the physics, so it goes in a file of its own. Open the placeholder `js/slime.js` and replace its contents with:

```js
// Slime: a puddle that slows a marble down and, if it stays in it, dissolves it. The puddles are
// zones in the level (see zones.js); this is the rule for what being in them does, as plain numbers,
// so it is easy to test. See ../tests/slime.tests.js.

const DISSOLVE_TIME = 1.2; // seconds in slime until a marble is dissolved
const RECOVER_TIME = 0.8; // seconds out of slime for a marble to recover completely

// How much a marble has been eaten by slime, from 0 (not at all) to 1 (dissolved). It goes up while
// the marble is in a puddle, and back down when it is out. A marble can be in more than one puddle
// at once, so it counts how many it is in.
class Exposure {
  constructor() {
    this.level = 0;
    this.puddles = 0;
  }

  // The marble has rolled into a puddle.
  enter() {
    this.puddles += 1;
  }

  // The marble has rolled out of one.
  leave() {
    this.puddles = Math.max(0, this.puddles - 1);
  }

  // Whether the marble is in slime now.
  get inSlime() {
    return this.puddles > 0;
  }

  // Whether it has been in slime long enough to dissolve.
  get dissolved() {
    return this.level >= 1;
  }

  // Let `dt` seconds go by: more eaten if in slime, and less if out.
  tick(dt) {
    const change = this.inSlime ? dt / DISSOLVE_TIME : -dt / RECOVER_TIME;
    this.level = Math.min(1, Math.max(0, this.level + change));
  }

  // Back to a clean marble, in no puddle.
  reset() {
    this.level = 0;
    this.puddles = 0;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DISSOLVE_TIME, RECOVER_TIME, Exposure };
} else {
  Object.assign(window, { DISSOLVE_TIME, RECOVER_TIME, Exposure });
}
```

Things to notice:

- **`Exposure` counts puddles**, not just "in" and "out". A marble can be in two at once (two puddles that touch), and it is only out of the slime when it has left both.
- **Leaving a puddle it never entered does nothing.** `Math.max(0, ...)` keeps the count from going negative. This happens for real: a marble put back at the start after a fall is teleported out of a puddle, and the game may say it has left one it never *entered* since the last reset.
- **Dissolving is quick and recovering is slow, as numbers** (`DISSOLVE_TIME` 1.2 seconds, `RECOVER_TIME` 0.8). A quick dash through a puddle is safe, and a stop in it is not. Those two numbers are all the tuning the slime has.
- **`tick` clamps**, to 0 and to 1, so the level never goes past either end.

### Tests

Add the new script and its tests to `tests.html`, after `zones.js` and `zones.tests.js`:

```html
  <script src="js/slime.js"></script>
  <script src="tests/slime.tests.js"></script>
```

Open the placeholder `tests/slime.tests.js` and replace its contents with:

```js
QUnit.module("Exposure", () => {
  QUnit.test("a marble starts clean, and out of the slime", (assert) => {
    const exposure = new Exposure();

    assert.strictEqual(exposure.level, 0);
    assert.false(exposure.inSlime);
    assert.false(exposure.dissolved);
  });

  QUnit.test("it is in slime from going in until coming out", (assert) => {
    const exposure = new Exposure();

    exposure.enter();
    assert.true(exposure.inSlime);

    exposure.leave();
    assert.false(exposure.inSlime);
  });

  QUnit.test("in two puddles at once, it is in slime until it has left both", (assert) => {
    const exposure = new Exposure();
    exposure.enter();
    exposure.enter();

    exposure.leave();
    assert.true(exposure.inSlime, "still in one");

    exposure.leave();
    assert.false(exposure.inSlime);
  });

  QUnit.test("leaving a puddle it never entered (a marble put back, say) is harmless", (assert) => {
    const exposure = new Exposure();

    exposure.leave();
    exposure.enter();

    assert.true(exposure.inSlime, "and the count didn't go negative");
  });

  QUnit.test("time in slime eats it, and doesn't change it out of slime if it is already clean", (assert) => {
    const exposure = new Exposure();
    exposure.tick(1);
    assert.strictEqual(exposure.level, 0);

    exposure.enter();
    exposure.tick(DISSOLVE_TIME / 4);

    assert.true(Math.abs(exposure.level - 0.25) < 1e-9);
  });

  QUnit.test("it dissolves after the time it takes, and not before", (assert) => {
    const exposure = new Exposure();
    exposure.enter();

    exposure.tick(DISSOLVE_TIME - 0.01);
    assert.false(exposure.dissolved);

    exposure.tick(0.02);
    assert.true(exposure.dissolved);
  });

  QUnit.test("it never goes past fully dissolved", (assert) => {
    const exposure = new Exposure();
    exposure.enter();

    exposure.tick(100);

    assert.strictEqual(exposure.level, 1);
  });

  QUnit.test("out of the slime it recovers, at its own pace, and never below clean", (assert) => {
    const exposure = new Exposure();
    exposure.enter();
    exposure.tick(DISSOLVE_TIME / 2);
    exposure.leave();

    exposure.tick(RECOVER_TIME / 4);
    assert.true(Math.abs(exposure.level - 0.25) < 1e-9, `${exposure.level}`);

    exposure.tick(100);
    assert.strictEqual(exposure.level, 0);
  });

  QUnit.test("a quick dash through gets out before it is dissolved", (assert) => {
    const exposure = new Exposure();

    exposure.enter();
    for (let i = 0; i < 30; i++) exposure.tick(1 / 60); // half a second
    exposure.leave();
    for (let i = 0; i < 10; i++) exposure.tick(1 / 60);

    assert.false(exposure.dissolved);
    assert.true(exposure.level > 0 && exposure.level < 0.5);
  });

  QUnit.test("reset makes it clean, and out of every puddle", (assert) => {
    const exposure = new Exposure();
    exposure.enter();
    exposure.enter();
    exposure.tick(100);

    exposure.reset();

    assert.strictEqual(exposure.level, 0);
    assert.false(exposure.inSlime);
    assert.false(exposure.dissolved);
  });
});
```

Things to notice:

- **The tests read like the rules**: *a marble starts clean. In two puddles at once it is in slime until it has left both. It dissolves after the time it takes, and not before. Out of the slime it recovers at its own pace and never goes below clean. A quick dash through gets out before it is dissolved.*

Open `tests.html`. You should see **317 passing tests**: ten more.

---

## Step 3: Slime in the level

A puddle is a **zone**, like a checkpoint: a disc on the floor with an invisible trigger above it. Two things are new about it, and both change `zones.js`:

- A puddle has a **radius of its own**. A zone's size was one constant, `ZONE_RADIUS`. A puddle that is as big as a checkpoint isn't much of a puddle.
- The game needs to know when the marble **leaves** it. A checkpoint only matters the moment the marble goes in. Slime matters for as long as the marble is in it, so the game needs both ends of the visit. The physics already reports both (`TRIGGER_ENTERED` and `TRIGGER_EXITED`); the zones only passed on the first.

Open `js/zones.js`. There are **three separate changes, each in place, in this order from the top of the file to the bottom**. Each *replaces* something that is already there; none goes inside another function.

**First**, the colours get a green for slime. Replace the `ZONE_COLORS` line with:

```js
const ZONE_COLORS = { goal: "#f6bf0e", checkpoint: "#248de3", taken: "#757d8e", slime: "#6fd13a" }; // the logo's yellow and blue, steel, and a slime green
```

**Second**, replace the function `levelZones`, **with the comment above it**, by these two functions (a new `zoneRadius` goes right below it, and `zonePosition` below that stays as it is). They are both at the left edge of the file, outside every other function:

```js
// The zones of a level, goal first, then the checkpoints, then the slime, as { kind, index, col, row }. A
// checkpoint also has its `bonus`, and a puddle of slime its `radius`. The index of a zone is its place
// in the level's list of that kind.
function levelZones(grid) {
  return [
    { kind: "goal", index: 0, col: grid.goal.col, row: grid.goal.row },
    ...grid.checkpoints.map((checkpoint, index) => ({ kind: "checkpoint", index, ...checkpoint })),
    ...grid.slime.map((puddle, index) => ({ kind: "slime", index, ...puddle })),
  ];
}

// How far a zone reaches from its centre: its own `radius` if it has one (slime does), and ZONE_RADIUS if not.
function zoneRadius(zone) {
  return zone.radius || ZONE_RADIUS;
}
```

**Third**, replace the whole of `buildZones`, from the comment above it, to its closing `}` after the `return { ... };`. It is the last function in the file, just above the export block, and it contains no other function:

```js
// Builds every zone of a level in a scene: a glowing disc laid on the floor, inside a hazard-striped
// border, to see, and an invisible
// trigger standing on it, to feel. `onEnter(zone, node)` is called when something rolls into a
// zone's trigger, with the zone and what it was (the marble's mesh, for example), and `onExit(zone, node)`
// when it rolls out again. Returns `markTaken(zone)`,
// which greys out a zone that has been used (a checkpoint reached, or the goal won), and `dispose()`, which takes it all away again.
function buildZones(scene, grid, onEnter, onExit = () => {}) {
  const plugin = scene.getPhysicsEngine().getPhysicsPlugin();
  const materials = {};
  const colorFor = (name) => {
    if (!materials[name]) {
      const material = new BABYLON.StandardMaterial(`zone-${name}`, scene);
      material.emissiveColor = BABYLON.Color3.FromHexString(ZONE_COLORS[name]);
      material.disableLighting = true; // it glows, so it is the same in the dark corner as in the light
      materials[name] = material;
    }
    return materials[name];
  };

  // The border is the same for every zone: stripes that glow, like the discs.
  const stripes = makeStripeTexture(scene);
  stripes.uScale = 2;
  stripes.vScale = 2;
  const borderMaterial = new BABYLON.StandardMaterial("zone-border", scene);
  borderMaterial.emissiveTexture = stripes;
  borderMaterial.disableLighting = true;

  const built = levelZones(grid).map((zone) => {
    const at = zonePosition(grid, zone);
    const name = `${zone.kind}-${zone.index}`;
    const radius = zoneRadius(zone);

    const border = BABYLON.MeshBuilder.CreateCylinder(`${name}-border`, { diameter: (radius + ZONE_BORDER) * 2, height: 0.06 }, scene);
    border.position.set(at.x, at.y + 0.03, at.z);
    border.material = borderMaterial;

    const disc = BABYLON.MeshBuilder.CreateCylinder(`${name}-disc`, { diameter: radius * 2, height: 0.08 }, scene);
    disc.position.set(at.x, at.y + 0.04, at.z);
    disc.material = colorFor(zone.kind);

    const trigger = BABYLON.MeshBuilder.CreateCylinder(name, { diameter: radius * 2, height: ZONE_HEIGHT }, scene);
    trigger.position.set(at.x, at.y + ZONE_HEIGHT / 2 - 1, at.z); // from a unit under the floor to above it
    trigger.isVisible = false;
    const aggregate = new BABYLON.PhysicsAggregate(trigger, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0, isTriggerShape: true }, scene);

    return { zone, border, disc, trigger, aggregate };
  });

  // Havok says when anything enters or leaves any trigger in the world. Find out which zone it was.
  const byNode = new Map(built.map((entry) => [entry.trigger, entry.zone]));
  const observer = plugin.onTriggerCollisionObservable.add((event) => {
    const handler = event.type === "TRIGGER_ENTERED" ? onEnter : event.type === "TRIGGER_EXITED" ? onExit : null;
    if (!handler) return;
    const triggerNode = [event.collider.transformNode, event.collidedAgainst.transformNode].find((node) => byNode.has(node));
    if (!triggerNode) return;
    const other = triggerNode === event.collider.transformNode ? event.collidedAgainst.transformNode : event.collider.transformNode;
    handler(byNode.get(triggerNode), other);
  });

  return {
    zones: built.map((entry) => entry.zone),
    markTaken(zone) {
      const entry = built.find((e) => e.zone.kind === zone.kind && e.zone.index === zone.index);
      if (entry) entry.disc.material = colorFor("taken");
    },
    dispose() {
      plugin.onTriggerCollisionObservable.remove(observer);
      for (const { border, disc, trigger, aggregate } of built) {
        aggregate.dispose();
        trigger.dispose();
        disc.dispose();
        border.dispose();
      }
      stripes.dispose();
      borderMaterial.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}
```

and the export block has one more name, `zoneRadius`. (If the page then stops with `SyntaxError: Unexpected token '}'`, a block has gone inside another function: every function in `zones.js` should start at the left edge, and the one above it should already have closed.)

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ZONE_RADIUS, ZONE_BORDER, ZONE_HEIGHT, ZONE_COLORS, levelZones, zoneRadius, zonePosition, makeStripeTexture, buildZones };
} else {
  Object.assign(window, { ZONE_RADIUS, ZONE_BORDER, ZONE_HEIGHT, ZONE_COLORS, levelZones, zoneRadius, zonePosition, makeStripeTexture, buildZones });
}
```

Things to notice:

- **`zoneRadius(zone)` is `zone.radius || ZONE_RADIUS`**: its own radius if it has one, the usual one if not. Every place that used `ZONE_RADIUS` for a particular zone (the disc, the border, the trigger, and the tests) now asks this instead.
- **`buildZones` takes a fourth argument, `onExit`**, and it has a default (`() => {}`), so a game that doesn't care when something leaves (the checkpoints and the goal) can leave it out, as the earlier tests do.
- **One observer, two jobs.** The same event handler now picks `onEnter` or `onExit` by the event's `type`, and ignores any other type.
- **The puddle gets the stripe border too.** It is a hazard. A black and yellow ring round a green disc is the clearest warning there is.

### Tests

Two of the tests for the zones need to say "this zone's own radius". In `tests/zones.tests.js`, in the test *"every zone of every level is on flat floor, all the way round"*, replace the line that works out `reach`:

```js
        const reach = zoneRadius(zone) + ZONE_BORDER; // the border has to lie flat too
```

and in *"no zone is on the start, and no two zones overlap"*, change the two distance checks so that they use each zone's own radius:

```js
        assert.true(Math.hypot(at.x - start.x, at.z - start.z) > (zoneRadius(zone) + ZONE_BORDER) * 2, `${level.name}: ${zone.kind} ${zone.index} is clear of the start`);
```
```js
          assert.true(Math.hypot(a.x - b.x, a.z - b.z) > zoneRadius(zones[i]) + zoneRadius(zones[j]) + ZONE_BORDER * 2, `${level.name}: zones ${i} and ${j} apart`);
```

Then add these to the **bottom** of `tests/zones.tests.js`, below everything that is there. They are a module of their own:

```js
QUnit.module("slime zones", (hooks) => {
  let engine;
  let scene;
  let level;
  let entered;
  let left;
  let zones;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    level = buildLevel(scene, LEVELS[2]); // Hazard Alley, which has slime
    entered = [];
    left = [];
    zones = buildZones(scene, level.grid, (zone, node) => entered.push({ zone, node }), (zone, node) => left.push({ zone, node }));
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("levelZones lists the slime after the checkpoints, with its radius", (assert) => {
    const list = levelZones(level.grid);

    assert.deepEqual(list.map((z) => z.kind), ["goal", "checkpoint", "slime"]);
    assert.strictEqual(list[2].radius, 1.6);
  });

  QUnit.test("zoneRadius is a zone's own radius, or the usual one", (assert) => {
    assert.strictEqual(zoneRadius({ radius: 1.6 }), 1.6);
    assert.strictEqual(zoneRadius({}), ZONE_RADIUS);
  });

  QUnit.test("a puddle is as big as its radius, and green", (assert) => {
    const disc = scene.getMeshByName("slime-0-disc");
    const border = scene.getMeshByName("slime-0-border");

    assert.true(Math.abs(disc.getBoundingInfo().boundingBox.extendSize.x - 1.6) < 1e-6);
    assert.true(Math.abs(border.getBoundingInfo().boundingBox.extendSize.x - (1.6 + ZONE_BORDER)) < 1e-6);
    assert.true(disc.material.emissiveColor.equals(BABYLON.Color3.FromHexString(ZONE_COLORS.slime)));
  });

  QUnit.test("a marble rolling through a puddle is reported going in, and again coming out, and isn't stopped", (assert) => {
    const puddle = zonePosition(level.grid, levelZones(level.grid)[2]);
    const marble = new Marble(scene, { start: { x: puddle.x - 3, y: puddle.y + MARBLE_RADIUS + 0.05, z: puddle.z } });
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(8, 0, 0));

    stepPhysics(scene, 1.5);

    const goingIn = entered.filter((e) => e.zone.kind === "slime");
    const comingOut = left.filter((e) => e.zone.kind === "slime");
    assert.strictEqual(goingIn.length, 1, "in once");
    assert.strictEqual(goingIn[0].node, marble.mesh);
    assert.strictEqual(comingOut.length, 1, "out once");
    assert.strictEqual(comingOut[0].node, marble.mesh);
    assert.true(marble.position.x > puddle.x + 1.6, `and out the other side: ${marble.position.x}`);
  });

  QUnit.test("with no onExit given, rolling out of a zone is simply ignored", (assert) => {
    zones.dispose();
    zones = buildZones(scene, level.grid, () => {});
    const puddle = zonePosition(level.grid, levelZones(level.grid)[2]);
    const marble = new Marble(scene, { start: { x: puddle.x - 3, y: puddle.y + MARBLE_RADIUS + 0.05, z: puddle.z } });
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(6, 0, 0));

    stepPhysics(scene, 1.2);

    assert.true(marble.position.x > puddle.x, "it got through without an error");
  });
});
```

Things to notice:

- **They run on Hazard Alley**, the level with slime, with a real marble. The marble is fired through the puddle and the tests count the events: in once, out once, and the marble isn't stopped.
- **The first two modules of tests, which check every level, now cover the puddle too**: it has to be on flat floor all the way round, with its border, and clear of the start and the other zones. Hazard Alley already passes them.
- **A test builds the zones with no `onExit` at all**, to show that leaving is ignored when nobody asked.

Open `tests.html`. You should see **322 passing tests**: five more.

---

## Step 4: A marble in slime

Two things happen to a marble in slime. It rolls as if through treacle, and it turns green. Both are the marble's business, so both are methods of `Marble`. Open `js/marble.js`.

Add two constants directly below `STOP_DAMPING`:

```js
const SLIME_DAMPING = 3; // how thick slime is: the speed a marble loses in it, a share of it each second
const SLIME_GREEN = "#6fd13a"; // what a marble goes as the slime eats it
```

and **add `slow` and `tint`, and replace `reset`** (all inside the `Marble` class, above its closing `}`, below `glideTo`):

```js
  // Makes the marble roll through something thick (slime), or back to normal. Damping is the share of
  // its speed a marble loses every second, so thick is a high one.
  slow(thick) {
    this.aggregate.body.setLinearDamping(thick ? SLIME_DAMPING : MARBLE_DAMPING.linear);
  }

  // Colours the marble green by `amount`, from 0 (as it is) to 1 (all the way), as slime eats it.
  tint(amount) {
    this.mesh.material.emissiveColor = BABYLON.Color3.Lerp(BABYLON.Color3.Black(), BABYLON.Color3.FromHexString(SLIME_GREEN), amount);
  }

  // Puts the marble back at its start, still, clean, and free to roll.
  reset() {
    this.tint(0);
    this.aggregate.body.setLinearDamping(MARBLE_DAMPING.linear);
    this.aggregate.body.setAngularDamping(MARBLE_DAMPING.angular);
    this.mesh.position.set(this.start.x, this.start.y, this.start.z);
    this.mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    this.aggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
    this.aggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
  }
```

The export block has two more names, `SLIME_DAMPING` and `SLIME_GREEN`:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, STOP_DAMPING, SLIME_DAMPING, SLIME_GREEN, GLIDE_RATE, GLIDE_MAX_SPEED, GROUND_REACH, FALL_LIMIT, hasFallen, glideVelocity, makeSteel, Marble };
} else {
  Object.assign(window, { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, STOP_DAMPING, SLIME_DAMPING, SLIME_GREEN, GLIDE_RATE, GLIDE_MAX_SPEED, GROUND_REACH, FALL_LIMIT, hasFallen, glideVelocity, makeSteel, Marble });
}
```

Things to notice:

- **Thick is damping.** Damping is the share of a marble's speed that it loses every second, and the marble already has a little (so it eventually stops on a flat floor). Slime is more of it (`SLIME_DAMPING`, 3, against the usual 0.15): you can still steer, but not get far.
- **`tint` lerps the glow.** `Color3.Lerp(Black, green, amount)` is the marble's `emissiveColor`, which is added to its lit colour: black adds nothing (the marble as it was) and green adds a green glow. At 0 the marble is as it was.
- **`reset` puts all of it back**, and the new `reset` starts with `this.tint(0);`. It *replaces* the old one, so **delete the old `reset`** (the one that doesn't start with `this.tint(0);`). A class with two methods of the same name runs the *last* one, so a leftover old `reset` below the new one quietly undoes it. There must be only one `reset` in the class, and if the test *"resetting makes it clean and normal again"* fails, that line is missing: the colour, the damping, and the position and speed as before. Every way the marble is put back (a fall, the **R** key, going to the next level, being dissolved) calls `reset`, so a marble can never come back still green.

### Tests

Add this to the **bottom** of `tests/marble.tests.js`, below everything that is there. It is a module of its own:

```js
// Slime is thick, and eats a marble green. These put it on the test course and let time go by.
QUnit.module("a marble in slime", (hooks) => {
  let engine;
  let scene;
  let marble;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene);
    marble = new Marble(scene);
    stepPhysics(scene, 1); // let it land on the start deck
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // How fast the marble is going after a second of rolling along the deck from the same push.
  const speedAfterASecond = () => {
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    stepPhysics(scene, 1);
    return marble.speed;
  };

  QUnit.test("it loses its speed faster in slime than out of it", (assert) => {
    const clean = speedAfterASecond();
    marble.reset();
    stepPhysics(scene, 1);

    marble.slow(true);
    const slimy = speedAfterASecond();

    assert.true(slimy < clean * 0.5, `${slimy} in slime, ${clean} out of it`);
  });

  QUnit.test("slowing it back down to normal gives its speed back", (assert) => {
    marble.slow(true);
    marble.slow(false);

    const speed = speedAfterASecond();

    assert.true(speed > 1.5, `${speed}`);
  });

  QUnit.test("it goes green as it is eaten, by the amount", (assert) => {
    const green = BABYLON.Color3.FromHexString(SLIME_GREEN);

    marble.tint(0);
    assert.true(marble.mesh.material.emissiveColor.equals(BABYLON.Color3.Black()), "not at all");

    marble.tint(1);
    assert.true(marble.mesh.material.emissiveColor.equals(green), "all the way");

    marble.tint(0.5);
    assert.true(Math.abs(marble.mesh.material.emissiveColor.g - green.g / 2) < 1e-6, "half way");
  });

  QUnit.test("resetting makes it clean and normal again", (assert) => {
    marble.slow(true);
    marble.tint(1);

    marble.reset();

    assert.true(marble.mesh.material.emissiveColor.equals(BABYLON.Color3.Black()));
    stepPhysics(scene, 1);
    assert.true(speedAfterASecond() > 1.5, "and rolls freely");
  });
});
```

Things to notice:

- **The speed test compares the same marble in and out of slime**, given the same push, a second later. It doesn't ask for a particular number, only that the marble in slime is going at less than half the speed.
- **The colour test checks the ends and the middle**: not at all, all the way, and half way.

Open `tests.html`. You should see **326 passing tests**: four more.

---

## Step 5: Where a mover is

A platform and a piston both do the same thing: be somewhere that depends on the time. That is a function, `moverCenter(mover, time)`, and every other thing about movers follows from it: where to draw it, where to put its physics body, and how fast it is going. Because it is a function of time, with no physics in it, it is easy to test exactly. Open the placeholder `js/movers.js` and replace its contents with:

```js
// Movers: the parts of a level that move on their own. A platform shuttles to and fro across a gap,
// and a piston pops up out of the floor and drops back. A mover is described in the level's data, and
// where it is at any moment is plain numbers worked out from the time, so it is easy to test. Only
// then are they built in a scene, as physics bodies that move but are never pushed. See ../tests/movers.tests.js.

const PLATFORM_THICKNESS = 0.6; // how thick a moving platform is, like the floor slabs
const PISTON_DEPTH = 2; // how tall a piston's box is: most of it is under the floor, and only its top shows
const PISTON_REST = 0.03; // how far above the floor a piston's top is when it is down. Level with it, the two
// would be in the very same place, and the screen would flicker as the graphics card chose between them

// How far through its movement a mover is, from 0 (the way it starts) to 1 (the other end), at `u`
// through its cycle, where `u` goes from 0 to 1 and then starts again.
//   platform: eases away from one end, and eases into the other, and back again, with no pause
//   piston:   waits, shoots up, stays up, and sinks back, the way a piston does
function moverWave(kind, u) {
  if (kind === "piston") {
    if (u < 0.5) return 0; // waiting
    if (u < 0.55) return (u - 0.5) / 0.05; // up in a snap
    if (u < 0.8) return 1; // held up
    return 1 - (u - 0.8) / 0.2; // and down, more gently
  }
  return (1 - Math.cos(2 * Math.PI * u)) / 2;
}

// How far through its cycle a mover is at `time` seconds, from 0 up to but not including 1. Each
// mover has a `period` (how long a cycle takes) and an optional `phase` (how far through it starts,
// so that two pistons needn't all pop up together).
function moverCycle(mover, time) {
  const u = (time / mover.period + (mover.phase || 0)) % 1;
  return u < 0 ? u + 1 : u;
}

// How big a mover's box is, in world units.
function moverSize(mover) {
  return { x: mover.size.x, y: mover.kind === "piston" ? PISTON_DEPTH : PLATFORM_THICKNESS, z: mover.size.z };
}

// Where the middle of a mover's box is at `time` seconds. The top of a platform is at its `height`
// (in steps of the grid), so it is level with the floor at each end. The top of a piston is a hair above
// its `height` (PISTON_REST) when it is down, and `rise` units higher than that when it is up.
function moverCenter(mover, time) {
  const wave = moverWave(mover.kind, moverCycle(mover, time));
  const top = mover.height * HEIGHT_STEP;
  if (mover.kind === "piston") {
    return { x: mover.at.col * CELL, y: top - PISTON_DEPTH / 2 + PISTON_REST + wave * mover.rise, z: mover.at.row * CELL };
  }
  const col = mover.from.col + (mover.to.col - mover.from.col) * wave;
  const row = mover.from.row + (mover.to.row - mover.from.row) * wave;
  return { x: col * CELL, y: top - PLATFORM_THICKNESS / 2, z: row * CELL };
}

// How fast a mover is going at `time`, along the floor, in units a second: how far it moved in the last
// `dt` seconds, over `dt`. (A piston moves straight up and down, so along the floor it is still.)
function moverVelocity(mover, time, dt = 1 / 60) {
  const before = moverCenter(mover, time - dt);
  const now = moverCenter(mover, time);
  return { x: (now.x - before.x) / dt, z: (now.z - before.z) / dt };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PLATFORM_THICKNESS, PISTON_DEPTH, PISTON_REST, moverWave, moverCycle, moverSize, moverCenter, moverVelocity };
} else {
  Object.assign(window, { PLATFORM_THICKNESS, PISTON_DEPTH, PISTON_REST, moverWave, moverCycle, moverSize, moverCenter, moverVelocity });
}
```

Things to notice:

- **A wave turns a time into how far along.** `moverCycle` turns the time into how far through its cycle a mover is, from 0 up to (not including) 1, using the `period` and the `phase`. `moverWave` turns that into how far *along its movement* it is, from 0 to 1.
- **There are two waves, and the difference is the feel.** A platform's wave is a cosine, so it *eases*: it leaves one end slowly, goes fastest in the middle, and arrives slowly, with no sudden changes of speed to throw a marble off. A piston's is a *snap*: it waits half the cycle, shoots up in a twentieth of it, stays up, and sinks back more gently than it rose.
- **`moverCenter` puts the top where the level says.** The platform's `height` is where its *top* is, so its centre is half its thickness below. The piston is a deep box, most of it under the floor: when it is down its top is a hair above the floor round it (`PISTON_REST`), and when it is up it is `rise` higher than that.
- **A hair above, not level with.** If the piston's top were exactly the height of the floor, the two surfaces would be in the very same place, and the graphics card would choose between them pixel by pixel, differently each frame: the screen *flickers*. This is called z-fighting. A few hundredths of a unit is enough to settle it, and a marble rolls over a lip that small without noticing. As a bonus, the thin striped plate shows where the piston is, so there is a warning before it fires.
- **`moverVelocity` is how far it moved, over how long.** It looks a frame back (`time - dt`) rather than working out a derivative, so it can't disagree with `moverCenter`. It only reports speed *along the floor*. A piston goes straight up, so along the floor it is still.
- **`% 1` and a negative time.** The remainder of a negative number is negative, so `moverCycle` adds 1 to put it back in range. A time before the start isn't likely, but `moverVelocity` asks for `time - dt`, which at time 0 is.

### Tests

Add the new script and its tests to `tests.html`, after `slime.js` and `slime.tests.js`:

```html
  <script src="js/movers.js"></script>
  <script src="tests/movers.tests.js"></script>
```

Open the placeholder `tests/movers.tests.js` and replace its contents with:

```js
// Movers the tests can hold in their hand: a platform and a piston, with round numbers.
const PLATFORM = { kind: "platform", from: { col: 2, row: 3 }, to: { col: 6, row: 3 }, height: 4, size: { x: 4, z: 6 }, period: 10 };
const PISTON = { kind: "piston", at: { col: 5, row: 5 }, height: 4, size: { x: 2, z: 2 }, rise: 1.2, period: 4 };

QUnit.module("moverWave", () => {
  const near = (assert, actual, expected, message) => assert.true(Math.abs(actual - expected) < 1e-9, `${message}: ${actual}`);

  QUnit.test("a platform starts at one end, is at the other half way through, and is back at the end of the cycle", (assert) => {
    near(assert, moverWave("platform", 0), 0, "start");
    near(assert, moverWave("platform", 0.5), 1, "half way");
    near(assert, moverWave("platform", 1), 0, "back");
    near(assert, moverWave("platform", 0.25), 0.5, "a quarter of the way through is half way across");
  });

  QUnit.test("a platform goes there and back the same way", (assert) => {
    for (const u of [0.1, 0.2, 0.3, 0.4]) near(assert, moverWave("platform", u), moverWave("platform", 1 - u), `${u}`);
  });

  QUnit.test("a platform eases: slowest at the ends", (assert) => {
    const nearEnd = moverWave("platform", 0.02) - moverWave("platform", 0);
    const middle = moverWave("platform", 0.27) - moverWave("platform", 0.25);

    assert.true(nearEnd < middle / 5, "hardly moving at the end, and moving in the middle");
  });

  QUnit.test("a piston waits down for half its cycle", (assert) => {
    for (const u of [0, 0.2, 0.49]) near(assert, moverWave("piston", u), 0, `${u}`);
  });

  QUnit.test("a piston shoots up in a snap, stays up, and sinks back more slowly", (assert) => {
    near(assert, moverWave("piston", 0.525), 0.5, "half way up after 0.025 of the cycle");
    near(assert, moverWave("piston", 0.55), 1, "all the way up");
    near(assert, moverWave("piston", 0.7), 1, "and held");
    near(assert, moverWave("piston", 0.9), 0.5, "half way down at 0.9");
    near(assert, moverWave("piston", 1 - 1e-12), 0, "and down again by the end");
  });

  QUnit.test("every wave stays between 0 and 1", (assert) => {
    for (const kind of ["platform", "piston"]) {
      for (let u = 0; u < 1; u += 0.01) assert.true(moverWave(kind, u) >= -1e-9 && moverWave(kind, u) <= 1 + 1e-9, `${kind} ${u}`);
    }
  });
});

QUnit.module("moverVelocity", () => {
  QUnit.test("a platform is still at the start of its way, and is going toward the other end after", (assert) => {
    const start = moverVelocity(PLATFORM, 0.001);
    const later = moverVelocity(PLATFORM, 2.5);

    assert.true(Math.abs(start.x) < 0.05, `${start.x}`);
    assert.true(later.x > 1, `${later.x}`);
    assert.true(Math.abs(later.z) < 1e-9, "and straight along it");
  });

  QUnit.test("it is the slope of the position: how far it moved, over how long", (assert) => {
    const dt = 1 / 60;
    const v = moverVelocity(PLATFORM, 3, dt);

    assert.true(Math.abs(v.x * dt - (moverCenter(PLATFORM, 3).x - moverCenter(PLATFORM, 3 - dt).x)) < 1e-9);
  });

  QUnit.test("a platform comes back the other way in the second half of its cycle", (assert) => {
    assert.true(moverVelocity(PLATFORM, 2.5).x > 0);
    assert.true(moverVelocity(PLATFORM, 7.5).x < 0);
  });

  QUnit.test("a piston goes up and down, and not along the floor", (assert) => {
    for (const time of [1.9, 2.1, 3.3]) assert.deepEqual(moverVelocity(PISTON, time), { x: 0, z: 0 });
  });
});

QUnit.module("moverCycle", () => {
  QUnit.test("is how far through a cycle a mover is, from 0 up to 1", (assert) => {
    assert.strictEqual(moverCycle(PLATFORM, 0), 0);
    assert.strictEqual(moverCycle(PLATFORM, 2.5), 0.25);
    assert.strictEqual(moverCycle(PLATFORM, 10), 0, "a whole cycle is back at the start");
    assert.true(Math.abs(moverCycle(PLATFORM, 12.5) - 0.25) < 1e-9, "and it goes round again");
  });

  QUnit.test("a phase makes it start part of the way through", (assert) => {
    assert.strictEqual(moverCycle({ ...PISTON, phase: 0.25 }, 0), 0.25);
    assert.true(Math.abs(moverCycle({ ...PISTON, phase: 0.75 }, 2) - 0.25) < 1e-9, "wrapping round");
  });

  QUnit.test("it is always in range, even for a time before the start", (assert) => {
    const u = moverCycle(PLATFORM, -2.5);

    assert.true(u >= 0 && u < 1);
    assert.true(Math.abs(u - 0.75) < 1e-9);
  });
});

QUnit.module("moverCenter and moverSize", () => {
  QUnit.test("a platform is at its first end at the start, and its second end half a cycle later, and in line", (assert) => {
    const start = moverCenter(PLATFORM, 0);
    const far = moverCenter(PLATFORM, 5);

    assert.strictEqual(start.x, 2 * CELL);
    assert.true(Math.abs(far.x - 6 * CELL) < 1e-9);
    assert.strictEqual(start.z, 3 * CELL);
    assert.true(Math.abs(far.z - 3 * CELL) < 1e-9);
  });

  QUnit.test("the top of a platform is at its height, whatever its thickness, and it doesn't rise or fall", (assert) => {
    for (const time of [0, 1.3, 5, 8.8]) {
      const centre = moverCenter(PLATFORM, time);

      assert.true(Math.abs(centre.y + moverSize(PLATFORM).y / 2 - 4 * HEIGHT_STEP) < 1e-9, `${time}`);
    }
  });

  QUnit.test("a piston stays where it is, and its top is just above the floor until it rises, and then a rise higher", (assert) => {
    const down = moverCenter(PISTON, 0);
    const up = moverCenter(PISTON, 2.4); // 0.6 of the cycle

    assert.strictEqual(down.x, 5 * CELL);
    assert.strictEqual(up.x, 5 * CELL);
    assert.strictEqual(down.z, 5 * CELL);
    assert.true(Math.abs(down.y + PISTON_DEPTH / 2 - (4 * HEIGHT_STEP + PISTON_REST)) < 1e-9, "down: its top is a hair above the floor");
    assert.true(PISTON_REST > 0 && PISTON_REST < 0.1, "and only a hair, so a marble rolls over it");
    assert.true(Math.abs(up.y + PISTON_DEPTH / 2 - (4 * HEIGHT_STEP + PISTON_REST + 1.2)) < 1e-9, "up: its top is a rise higher");
  });

  QUnit.test("sizes: a platform is thin, a piston is deep, and both are as wide as they say", (assert) => {
    assert.deepEqual(moverSize(PLATFORM), { x: 4, y: PLATFORM_THICKNESS, z: 6 });
    assert.deepEqual(moverSize(PISTON), { x: 2, y: PISTON_DEPTH, z: 2 });
  });
});

QUnit.module("the movers of every level", () => {
  const grids = LEVELS.map((level) => parseLevel(level));

  QUnit.test("each is a platform or a piston, with a size and a period", (assert) => {
    for (const grid of grids) {
      for (const mover of grid.movers) {
        assert.true(["platform", "piston"].includes(mover.kind), `${grid.name}: ${mover.kind}`);
        assert.true(mover.size.x > 0 && mover.size.z > 0, `${grid.name}: has a size`);
        assert.true(mover.period > 0, `${grid.name}: has a period`);
        if (mover.phase !== undefined) assert.true(mover.phase >= 0 && mover.phase < 1, `${grid.name}: phase`);
      }
    }
  });

  QUnit.test("a platform meets the floor at each end, so a marble can roll on and off", (assert) => {
    const problems = [];
    for (const grid of grids) {
      for (const mover of grid.movers.filter((m) => m.kind === "platform")) {
        const top = mover.height * HEIGHT_STEP;
        const dx = (mover.to.col - mover.from.col) * CELL;
        const dz = (mover.to.row - mover.from.row) * CELL;
        const length = Math.hypot(dx, dz);
        const along = { x: dx / length, z: dz / length };
        const half = (Math.abs(along.x) * mover.size.x + Math.abs(along.z) * mover.size.z) / 2; // how far it reaches along its way
        for (const [end, sign] of [[mover.from, -1], [mover.to, 1]]) {
          const x = end.col * CELL + sign * along.x * (half + 0.3); // a little past the platform, on the far side from the other end
          const z = end.row * CELL + sign * along.z * (half + 0.3);
          const floor = heightAt(grid, x, z);
          if (floor === null || Math.abs(floor - top) > 1e-9) problems.push(`${grid.name}: floor past the end at ${x}, ${z} is ${floor}, not ${top}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a platform's way is clear: there is no floor for it to cross, only a gap", (assert) => {
    const problems = [];
    for (const grid of grids) {
      for (const mover of grid.movers.filter((m) => m.kind === "platform")) {
        const middle = { x: ((mover.from.col + mover.to.col) / 2) * CELL, z: ((mover.from.row + mover.to.row) / 2) * CELL };
        if (heightAt(grid, middle.x, middle.z) !== null) problems.push(`${grid.name}: floor in the middle of the platform's way`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a piston stands on flat floor, all across its box", (assert) => {
    const problems = [];
    for (const grid of grids) {
      for (const mover of grid.movers.filter((m) => m.kind === "piston")) {
        const top = mover.height * HEIGHT_STEP;
        const x = mover.at.col * CELL;
        const z = mover.at.row * CELL;
        for (const [dx, dz] of [[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          const floor = heightAt(grid, x + (dx * mover.size.x) / 2, z + (dz * mover.size.z) / 2);
          if (floor === null || Math.abs(floor - top) > 1e-9) problems.push(`${grid.name}: floor under a piston at ${dx}, ${dz} is ${floor}, not ${top}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("no mover is on a zone or on the start", (assert) => {
    for (const grid of grids) {
      const start = levelStart(grid);
      for (const mover of grid.movers) {
        const centre = moverCenter(mover, 0);
        const reach = Math.max(mover.size.x, mover.size.z) / 2 + 1;
        assert.true(Math.hypot(centre.x - start.x, centre.z - start.z) > reach, `${grid.name}: ${mover.kind} is clear of the start`);
        for (const zone of levelZones(grid)) {
          const at = zonePosition(grid, zone);
          assert.true(Math.hypot(centre.x - at.x, centre.z - at.z) > reach + zoneRadius(zone), `${grid.name}: ${mover.kind} is clear of ${zone.kind} ${zone.index}`);
        }
      }
    }
  });
});
```

Things to notice:

- **`PLATFORM` and `PISTON` are round numbers**, so the expected answers can be worked out by hand: a period of 10, a cycle of a quarter at 2.5 seconds, and so on.
- **The waves are checked at the points that matter**: the start, half way, the end, a quarter of the way (half way across), and for the piston the moments it starts to rise, finishes rising, and is half way down.
- **A platform is tested for easing** by comparing how far it moves in the first 0.02 of its cycle to how far it moves in the same time in the middle.
- **The last module checks the movers of every level** (every level you will ever write): that a platform meets the floor at each end, so a marble can roll on and off it; that there is a *gap* for it to cross; that a piston stands on flat floor all across its box; and that no mover is on the start or a zone.

Open `tests.html`. You should see **348 passing tests**: twenty-two more.

---

## Step 6: Movers in the world

Now the physics. A mover is a box that moves, and has to be a body that *pushes* the marble but isn't pushed back. Havok has a kind of body for exactly that: **`ANIMATED`**. It moves where the game tells it, and everything else reacts to it as if it were infinitely heavy. Each frame, the game says where each mover should be (`setTargetTransform`), and Havok works out how fast it must have gone to get there, so that what is on it is dragged and what is under it is pushed.

Add this to `js/movers.js`, **below** `moverVelocity` and above the export block. It is one long function: paste it whole, to its closing `}` after the `return { ... };`:

```js
// Makes every mover of a level in a scene. Each is a box that is a physics body of the kind that is
// moved by the game and not by anything else (ANIMATED): it pushes the marble, and carries it by
// friction, but nothing pushes it. Returns `update(time)`, which puts them where they are at that
// time (call it every frame), and `dispose()`, which takes them away again.
function buildMovers(scene, grid) {
  const steel = new BABYLON.StandardMaterial("mover-steel", scene);
  steel.diffuseColor = BABYLON.Color3.FromHexString("#4b5367"); // the logo's steel
  steel.specularColor = new BABYLON.Color3(0.25, 0.27, 0.32);
  const stripes = makeStripeTexture(scene);
  stripes.uScale = 2;
  stripes.vScale = 2;
  const hazard = new BABYLON.StandardMaterial("mover-hazard", scene);
  hazard.diffuseTexture = stripes; // a piston is striped all over, as a warning

  const built = grid.movers.map((mover, index) => {
    const size = moverSize(mover);
    const mesh = BABYLON.MeshBuilder.CreateBox(`${mover.kind}-${index}`, { width: size.x, height: size.y, depth: size.z }, scene);
    const at = moverCenter(mover, 0);
    mesh.position.set(at.x, at.y, at.z);
    mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    mesh.material = mover.kind === "piston" ? hazard : steel;
    mesh.receiveShadows = true;
    const aggregate = new BABYLON.PhysicsAggregate(mesh, BABYLON.PhysicsShapeType.BOX, { mass: 0, ...SURFACES.deck }, scene);
    aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
    return { mover, mesh, aggregate };
  });

  return {
    meshes: built.map((entry) => entry.mesh),
    // A marble standing on a platform goes where the platform goes. Call it every frame, after `update`.
    // (Left to the physics, a rolling marble is left behind by a floor that moves under it, and rolls off the
    // back, because it is rolling and not sliding. The marble is told what the platform is doing, and
    // gives in to it, and can still be steered across it.)
    carry(marble, time, dt) {
      // A ray finds a mesh where its world matrix says it is, and that is only brought up to date when a
      // frame is drawn (and a test draws none), so bring the movers' up to date first.
      for (const { mesh } of built) mesh.computeWorldMatrix(true);
      const under = marble.ground;
      const entry = built.find((e) => e.mesh === under);
      if (entry && entry.mover.kind === "platform") marble.carry(moverVelocity(entry.mover, time, dt), dt);
    },
    update(time) {
      for (const { mover, aggregate } of built) {
        const at = moverCenter(mover, time);
        aggregate.body.setTargetTransform(new BABYLON.Vector3(at.x, at.y, at.z), BABYLON.Quaternion.Identity());
      }
    },
    dispose() {
      for (const { mesh, aggregate } of built) {
        aggregate.dispose();
        mesh.dispose();
      }
      stripes.dispose();
      steel.dispose();
      hazard.dispose();
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
  module.exports = { PLATFORM_THICKNESS, PISTON_DEPTH, PISTON_REST, moverWave, moverCycle, moverSize, moverCenter, moverVelocity, buildMovers };
} else {
  Object.assign(window, { PLATFORM_THICKNESS, PISTON_DEPTH, PISTON_REST, moverWave, moverCycle, moverSize, moverCenter, moverVelocity, buildMovers });
}
```

Things to notice:

- **`PhysicsMotionType.ANIMATED`** is the whole difference between a mover and the floor (`mass: 0` and static). Without it a platform would be a wall that jumped about, taking the marble with it by teleport. With it, Havok knows the platform's *velocity*.
- **`setTargetTransform(position, rotation)`** is the call that moves it, every frame, from `update(time)`. The mesh follows the body, so the mesh position is where the physics put it.
- **A piston is deeper than it looks** (`PISTON_DEPTH`): most of the box is *inside* the level's floor, which is hollow, and the physics doesn't mind two bodies overlapping if one of them is static. When it comes up through the floor it is a solid top, and the marble stands on it.
- **`update` and `carry` are called by the game every frame**, with a time. Nothing here has a clock of its own, which is what makes it testable: a test calls them with whatever time it likes.
- **A piston is striped all over.** It uses the same stripe texture as the zones' borders, as a lit material this time.
- **`dispose` takes everything away**, the physics bodies, the meshes, the texture and the materials, so a level can be rebuilt without leaving anything behind.

### The marble is carried

There is a catch that every game with moving platforms meets. A marble **rolls**. A floor that moves under a rolling ball doesn't drag it along: the ball keeps rolling where it was, so the floor slips out from under it, the ball drifts toward the back, and falls off. It isn't a bug in the physics; it is exactly what a ball on a moving tray does. A real player would have to chase the platform the whole way, and the platform would be impossible to ride at all.

So the game cheats, the way platform games always do. While the marble is standing on a platform, it is **told what the platform is doing**, and its speed is pulled toward the platform's: a share of the difference every second. It is soon going with it. It can still be steered across it, because the pull is a drag on the *difference*, and a push for a moment beats it.

In `js/marble.js`, one constant, below `SLIME_GREEN`:

```js
const CARRY_GRIP = 8; // how firmly a moving platform takes a marble along: a share of the difference in speed, every second
```

Replace `grounded` with these two, `ground` (what the marble is standing on) and `grounded` (whether it is standing on anything), which is now defined from it:

```js
  // What it is on: a ray from the middle of the marble, straight down, finds a floor no further away
  // than the marble's radius and a little more, and this is the mesh of that floor (or null, in the air).
  // (The physics does know what is touching what, but a ray is the simple way to ask, and it lets a marble
  // that is only just off the floor count.) Only things with a physics body count, which here is the
  // level, and its movers.
  get ground() {
    const ray = new BABYLON.Ray(this.mesh.position, BABYLON.Vector3.Down(), MARBLE_RADIUS + GROUND_REACH);
    const hit = this.mesh.getScene().pickWithRay(ray, (mesh) => mesh !== this.mesh && mesh.physicsBody);
    return hit && hit.hit ? hit.pickedMesh : null;
  }

  // Whether it is on the ground.
  get grounded() {
    return this.ground !== null;
  }
```

and add `carry` directly below `slow`:

```js
  // Moves the marble toward the speed of a floor that is moving, { x, z }: each second it closes CARRY_GRIP of
  // the difference, so a marble put on a moving platform is soon going with it, and one that is steered
  // across it still can be. Call it every frame the marble is on the platform.
  carry(platform, dt) {
    const speed = this.aggregate.body.getLinearVelocity();
    const give = 1 - Math.exp(-CARRY_GRIP * dt);
    this.aggregate.body.setLinearVelocity(
      new BABYLON.Vector3(speed.x + (platform.x - speed.x) * give, speed.y, speed.z + (platform.z - speed.z) * give)
    );
  }
```

and the export block has one more name, `CARRY_GRIP`:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, STOP_DAMPING, SLIME_DAMPING, SLIME_GREEN, CARRY_GRIP, GLIDE_RATE, GLIDE_MAX_SPEED, GROUND_REACH, FALL_LIMIT, hasFallen, glideVelocity, makeSteel, Marble };
} else {
  Object.assign(window, { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, STOP_DAMPING, SLIME_DAMPING, SLIME_GREEN, CARRY_GRIP, GLIDE_RATE, GLIDE_MAX_SPEED, GROUND_REACH, FALL_LIMIT, hasFallen, glideVelocity, makeSteel, Marble });
}
```

Things to notice:

- **`ground` is `grounded` with the answer kept.** The ray that asked "is there a floor under me?" now also says *which*, because the game has to know whether it is a platform. `grounded` is `ground !== null`, so everything that used it is unchanged.
- **`carry` closes a share of the gap, `1 - Math.exp(-CARRY_GRIP * dt)`**, the same form as the camera's easing and the tilt's, so it is the same however long the frames are. It leaves the *up and down* speed alone: that is the physics' job.
- **`CARRY_GRIP` is the one number to tune.** Low, and the marble lags the platform and slides about on it. High, and it is glued to it and can hardly walk across it.
- **The movers' `carry` only carries a marble on a *platform*.** A piston goes up and down, and a marble on top of one is lifted by it, with no help.
- **The movers' matrices are brought up to date before the ray is cast** (`computeWorldMatrix(true)`). A ray finds a mesh where its world matrix says it is, and a world matrix is only recalculated when a frame is *drawn*. In the game that happens every frame anyway; in a test, with nothing drawn, a ray would miss a platform that had moved.

### Tests

Add these to the **bottom** of `tests/movers.tests.js`:

```js
// Building movers needs a scene and physics. These use a NullEngine, which draws nothing, and put
// the movers where they are by hand, step by step, as the game does every frame.
QUnit.module("buildMovers", (hooks) => {
  let engine;
  let scene;
  let level;
  let movers;
  let time;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    level = buildLevel(scene, LEVELS[2]);
    movers = buildMovers(scene, level.grid);
    time = 0;
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // Lets `seconds` go by, putting the movers where they are, and carrying a marble if it is on one,
  // every sixtieth of a second, as the game does every frame.
  const run = (seconds, marble = null) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      time += 1 / 60;
      movers.update(time);
      if (marble) movers.carry(marble, time, 1 / 60);
      stepPhysics(scene, 1 / 60);
    }
  };

  QUnit.test("makes a mesh for every mover, named for its kind and place in the list, where it starts", (assert) => {
    assert.deepEqual(movers.meshes.map((m) => m.name), ["platform-0", "piston-1"]);
    level.grid.movers.forEach((mover, i) => {
      const at = moverCenter(mover, 0);
      assert.true(Math.abs(movers.meshes[i].position.x - at.x) < 1e-9, `${mover.kind} x`);
      assert.true(Math.abs(movers.meshes[i].position.y - at.y) < 1e-9, `${mover.kind} y`);
    });
  });

  QUnit.test("each has a physics body that the game moves and nothing pushes", (assert) => {
    for (const mesh of movers.meshes) {
      assert.true(Boolean(mesh.physicsBody), `${mesh.name} has a body`);
      assert.strictEqual(mesh.physicsBody.getMotionType(), BABYLON.PhysicsMotionType.ANIMATED);
    }
  });

  QUnit.test("update puts them where they are at that time", (assert) => {
    const platform = level.grid.movers[0];
    const halfWay = platform.period / 2;

    for (let t = 1 / 60; t <= halfWay + 1e-9; t += 1 / 60) {
      movers.update(t);
      stepPhysics(scene, 1 / 60);
    }

    const at = moverCenter(platform, halfWay);
    assert.true(Math.abs(movers.meshes[0].position.x - at.x) < 0.1, `${movers.meshes[0].position.x} for ${at.x}`);
  });

  QUnit.test("a marble on a platform is carried along with it, not left behind", (assert) => {
    const platform = level.grid.movers[0];
    const at = moverCenter(platform, 0);
    const marble = new Marble(scene, { start: { x: at.x, y: at.y + PLATFORM_THICKNESS / 2 + MARBLE_RADIUS + 0.05, z: at.z } });

    run(4, marble);

    const platformNow = moverCenter(platform, time);
    assert.true(platformNow.x > at.x + 3, "the platform has gone a good way");
    assert.true(Math.abs(marble.position.x - platformNow.x) < 0.6, `the marble went from ${at.x} to ${marble.position.x}, with the platform at ${platformNow.x}`);
    assert.true(marble.grounded, "and is still on it");
  });

  QUnit.test("without being carried, the same marble is left behind: that is why it is carried", (assert) => {
    const platform = level.grid.movers[0];
    const at = moverCenter(platform, 0);
    const marble = new Marble(scene, { start: { x: at.x, y: at.y + PLATFORM_THICKNESS / 2 + MARBLE_RADIUS + 0.05, z: at.z } });

    run(4);

    assert.true(marble.position.x < moverCenter(platform, time).x - 1.5, `it is at ${marble.position.x}`);
  });

  QUnit.test("a marble crossing a platform can still be steered across it", (assert) => {
    const platform = level.grid.movers[0];
    const at = moverCenter(platform, 0);
    const marble = new Marble(scene, { start: { x: at.x - 1, y: at.y + PLATFORM_THICKNESS / 2 + MARBLE_RADIUS + 0.05, z: at.z } });

    for (let i = 0; i < 90; i++) {
      time += 1 / 60;
      movers.update(time);
      movers.carry(marble, time, 1 / 60);
      marble.push({ x: 1, y: 0, z: 0 }); // pushing along the way the platform goes
      stepPhysics(scene, 1 / 60);
    }

    assert.true(marble.position.x > at.x + 1, `it went from ${at.x - 1} to ${marble.position.x}`);
  });

  QUnit.test("a piston coming up throws a marble standing on it into the air", (assert) => {
    const piston = level.grid.movers[1];
    const at = moverCenter(piston, 0);
    const floor = piston.height * HEIGHT_STEP;
    const marble = new Marble(scene, { start: { x: at.x, y: floor + MARBLE_RADIUS + 0.05, z: at.z } });

    let highest = marble.position.y;
    for (let i = 0; i < Math.round(3 * 60); i++) {
      time += 1 / 60;
      movers.update(time);
      stepPhysics(scene, 1 / 60);
      highest = Math.max(highest, marble.position.y);
    }

    assert.true(highest > floor + MARBLE_RADIUS + piston.rise * 0.8, `it reached ${highest}`);
  });

  QUnit.test("and a marble that isn't on the piston isn't disturbed by it", (assert) => {
    const piston = level.grid.movers[1];
    const at = moverCenter(piston, 0);
    const floor = piston.height * HEIGHT_STEP;
    const marble = new Marble(scene, { start: { x: at.x - 4, y: floor + MARBLE_RADIUS + 0.05, z: at.z } });

    run(3);

    assert.true(Math.abs(marble.position.y - (floor + MARBLE_RADIUS)) < 0.05, `${marble.position.y}`);
  });

  QUnit.test("disposing takes them away", (assert) => {
    movers.dispose();

    assert.strictEqual(scene.getMeshByName("platform-0"), null);
    assert.strictEqual(scene.getMeshByName("piston-1"), null);
  });
});
```

and add this module to the **bottom** of `tests/marble.tests.js`, directly above the slime module you added in Step 4 (or below it: they don't depend on each other):

```js
// A marble on a floor that moves has to go with it. These put it on the test course, which stands still,
// and tell it the floor is moving.
QUnit.module("carrying a marble", (hooks) => {
  let engine;
  let scene;
  let marble;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene);
    marble = new Marble(scene);
    stepPhysics(scene, 1); // let it land on the start deck
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("it is on the course, and the course is what it is on", (assert) => {
    assert.true(marble.grounded);
    assert.strictEqual(marble.ground.name, "start deck");
  });

  QUnit.test("it is on nothing in the air", (assert) => {
    marble.start = { x: -11, y: 12, z: 0 };
    marble.reset();

    assert.strictEqual(marble.ground, null);
    assert.false(marble.grounded);
  });

  QUnit.test("it closes on the speed of the floor, a share at a time, and never overshoots", (assert) => {
    const speed = [];
    for (let i = 0; i < 60; i++) {
      marble.carry({ x: 2, z: -1 }, 1 / 60);
      speed.push(marble.velocity);
    }

    assert.true(speed[0].x > 0 && speed[0].x < 2, "part of the way at first");
    assert.true(speed[59].x > 1.9 && speed[59].x <= 2 + 1e-6, `and there in the end: ${speed[59].x}`);
    assert.true(speed[59].z < -0.95 && speed[59].z >= -1 - 1e-6);
    assert.true(speed.every((v, i) => i === 0 || v.x >= speed[i - 1].x - 1e-9), "steadily");
  });

  QUnit.test("it leaves the speed up and down to the physics", (assert) => {
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(0, 3, 0));

    marble.carry({ x: 2, z: 0 }, 1 / 60);

    assert.strictEqual(marble.velocity.y, 3);
  });
});
```

Things to notice:

- **A marble is put on the platform and the movers are run for four seconds.** With `carry`, the marble ends up beside the platform, a good way along, and still on it. *Without* carrying, the same test shows the marble left behind by more than a unit and a half: that test is there to say why the carrying exists.
- **A marble is steered across a platform** while it is carried, and it gets across.
- **A piston is run through its cycle under a marble.** At the moment it shoots up, the marble is thrown at least 80% of the piston's rise higher. A marble beside the piston is not disturbed.
- **The tests call `movers.update` and `movers.carry` by hand, sixty times a second**, exactly as the game's frame loop does.

Open `tests.html`. You should see **361 passing tests**: thirteen more.

---

## Step 7: The game

Last, `index.html` and `js/main.js`. In `index.html`, add the two scripts to the list at the **bottom of `<body>`**, below `zones.js`:

```html
  <script src="js/movers.js"></script>
  <script src="js/slime.js"></script>
```

Without them, `main.js` stops with `ReferenceError: Exposure is not defined`, or `buildMovers is not defined`.

> **No new CSS this time.** Nothing in this step is a new part of the page: the slime and the movers are drawn by the game, not by the page, and the *Dissolved!* message uses the banner you already have. (A new part of the page would get a new file in `css/` and a new `<link>`, as the clock did.)

Now `js/main.js`, in four places.

### 7a. The marble's exposure, and putting it back clean

Find the comment `// Rolling again` and the line under it, `const dropAgain = () => marble.reset();`, and **replace those two lines** with:

```js
  // How much slime has got at the marble. The slime zones tell it when the marble goes in and out.
  const exposure = new Exposure();

  // Rolling again: R on a keyboard, and a button for a screen with no keys. A marble put back is clean.
  const dropAgain = () => {
    marble.reset();
    exposure.reset();
  };
```

(The `window.addEventListener("keydown", ...)` for the **R** key stays as it is, directly below.)

### 7b. The zones, and the movers

In `reachZone`, add the slime case directly below the check on what rolled in, above the goal:

```js
    if (zone.kind === "slime") {
      exposure.enter();
      return;
    }
```

Then replace the line `let zones = buildZones(scene, level.grid, reachZone);` (and add the movers below it), so that the block directly above the comment `// Playing a level` reads:

```js
  const leaveZone = (zone, node) => {
    if (zone.kind === "slime" && node === marble.mesh) exposure.leave();
  };
  let zones = buildZones(scene, level.grid, reachZone, leaveZone);

  // The movers (platforms and pistons) have a clock of their own, that starts at zero with the level.
  let movers = buildMovers(scene, level.grid);
  let levelTime = 0;
```

### 7c. Playing a level

Replace `loadLevel` with:

```js
  const loadLevel = (index) => {
    zones.dispose();
    movers.dispose();
    level.dispose();
    levelIndex = index;
    level = buildLevel(scene, LEVELS[levelIndex]);
    zones = buildZones(scene, level.grid, reachZone, leaveZone);
    movers = buildMovers(scene, level.grid);
    levelTime = 0;
    run = new Run(level.grid);
    marble.start = levelStart(level.grid);
    dropAgain();
    focus = { ...marble.start };
    levelName.textContent = level.grid.name;
  };
```

### 7d. Every frame

Directly below the clock lines (`announceEnd();`... and the glide to the goal), and above `// The tilt: ease its stick`, add:

```js
    // The movers go by the level's own clock, which only runs once the splash has gone.
    if (scene.physicsEnabled) {
      levelTime += dt;
      movers.update(levelTime);
      movers.carry(marble, levelTime, dt);
    }

    // Slime slows the marble and turns it green, and if it stays in too long, it dissolves, and starts again.
    if (run.status === "running") {
      exposure.tick(dt);
      marble.slow(exposure.inSlime);
      marble.tint(exposure.level);
      if (exposure.dissolved) {
        say("Dissolved!", "Keep out of the slime");
        dropAgain();
      }
    }
```

Things to notice:

- **The marble can be in slime without anything knowing it.** `reachZone` and `leaveZone` only keep a count (`exposure.enter()` and `exposure.leave()`), and the frame loop does the rest. That keeps the zones simple: they report, and the game decides.
- **The movers have a clock of their own**, `levelTime`, that starts at 0 with each level and only runs once the physics is going (after the splash). Every mover is a function of it, so they all start in step.
- **`movers.carry` is called straight after `movers.update`**, and before the marble is steered. The marble is brought up to the platform's speed first, and then pushed.
- **Slime only works on a running run.** After a win (the marble is gliding to rest), slime shouldn't dissolve it.
- **When the marble dissolves, it is put back, clean.** `dropAgain` is now `marble.reset()` *and* `exposure.reset()`, so the green goes, the count of puddles goes, and the marble starts again at the last checkpoint, with the clock still running.
- **`loadLevel` takes the movers away too, and builds the next level's.** A platform left behind from the last level would be an invisible floor in the new one.
- **`dropAgain` replaces `marble.reset()` in `loadLevel`**, so changing level also clears any slime.

---

## Step 8: Try it

Serve the page and open it. Press **N** twice to go to **Hazard Alley** (the first two levels are as they were).

- [ ] The marble drops onto the first deck, with a **gap** in front of it, and a **steel platform** sliding to and fro across it, taking about 14 seconds for the round trip
- [ ] **Roll onto the platform** when it is at your side, and let it carry you: you **stay on it**, and arrive at the far deck. You can steer across it
- [ ] A **piston** (a yellow and black striped plate, just proud of the floor) on the second deck **shoots up every four seconds** and throws the marble if it is on it. It is easy to roll round
- [ ] The **blue checkpoint** on the second deck pays its 15 seconds as before
- [ ] A **green puddle**, in a striped border, at the foot of the ramp. Rolling **through it quickly** is fine, and the marble goes a little green. **Stopping in it** turns the marble greener and greener, slows it, and after a moment **Dissolved!**, and the marble starts again from the checkpoint, not green
- [ ] Rolling **round** the puddle is easy, and takes a little longer
- [ ] **R** while in slime puts the marble back clean, and the next time through the puddle starts from nothing
- [ ] The goal, at the end, wins, as before
- [ ] **N** away from Hazard Alley and back: the platform and the piston start from the beginning, and there are no strays left in the other levels
- [ ] Everything from before still works: the clock, the checkpoints, tilt, touch

**If something's wrong**

- **`SyntaxError: Unexpected token '}'` from `zones.js` (or `movers.js`, or `marble.js`):** a pasted block has landed inside another function, so a `}` is left over. Every function should start at the left edge and be closed before the next begins. Compare the file with the block in the step.
- **`ReferenceError: Exposure is not defined`, or `buildMovers is not defined`:** `index.html` is missing a script tag. `movers.js` and `slime.js` go in the list at the bottom of `<body>`, below `zones.js`.
- **`Cannot read properties of undefined (reading 'map')` from `movers.js`, or from `zones.js`:** `parseLevel` doesn't carry `slime` and `movers` over, or a level is missing them and the default (`|| []`) isn't there.
- **The platform doesn't move, or the movers sit at the start:** `movers.update(levelTime)` isn't called, or `levelTime` isn't being added to (it only runs when `scene.physicsEnabled` is true).
- **The platform moves, but the marble is left behind and falls:** `movers.carry(marble, levelTime, dt)` isn't called, or `marble.carry` or `marble.ground` is wrong. The test *"a marble on a platform is carried along with it"* should be failing.
- **The marble can't be steered across the platform:** `CARRY_GRIP` is too high.
- **The marble hops or slides about on the platform:** `CARRY_GRIP` is too low, or the platform's `setTargetTransform` isn't being called every frame.
- **The platform passes straight through the marble, or the marble falls through it:** the mover isn't `PhysicsMotionType.ANIMATED`, or has no `PhysicsAggregate`.
- **The piston does nothing:** its `rise`, its `phase` and its `period` in the level data. Wait for it: the first rise is at 1.6 seconds.
- **The piston flickers when it is down:** its top is at exactly the height of the floor (z-fighting). `PISTON_REST` has to be a little more than 0, and `moverCenter` has to add it.
- **The piston is a solid block that never goes down:** `moverWave("piston", u)`: it should wait half the cycle.
- **There is no puddle:** the level has no `slime`, or `levelZones` isn't listing it, or the colour is missing from `ZONE_COLORS`.
- **The puddle is the size of a checkpoint:** `zoneRadius`, and `buildZones` still uses `ZONE_RADIUS` in one place.
- **Nothing happens in the slime:** `reachZone` and `leaveZone` aren't both being given to `buildZones` (both calls, the first one and the one in `loadLevel`).
- **The marble dissolves, but comes back green:** `marble.reset()` isn't calling `tint(0)`. Check there is only **one** `reset` in `marble.js`: if the old one is still there below the new one, it wins.
- **The marble is stuck slow after leaving the slime:** `marble.slow(exposure.inSlime)` has to be called every frame while running, so that `slow(false)` happens.
- **It dissolves at once, or never:** `DISSOLVE_TIME`, and that `exposure.tick(dt)` is given seconds and not milliseconds.
- **Dissolved too soon after the next level:** `exposure.reset()`, and `dropAgain` being used in `loadLevel`.
- **A platform from the last level is still there:** `movers.dispose()` isn't called in `loadLevel`.

**Experiments** (change one, reload, then change it back):

- The platform's `period` of `6`: a fast, hard crossing. Of `30`: a long wait
- `CARRY_GRIP` of `0`: the marble is never carried, and falls off every time
- The piston's `rise` of `3`: it throws the marble clear over the deck
- The piston's `phase` of `0.5`: it fires at a different moment
- `DISSOLVE_TIME` of `4`: a puddle that is easy to cross. Of `0.3`: one that kills at a touch
- `SLIME_DAMPING` of `0.15` (the usual damping): slime that doesn't slow the marble
- The puddle's `radius` of `3`: a lake, and the flat-floor test says if it crosses a slope
- Add a second piston to Hazard Alley with a different `phase`, and see the test check where it stands

---

## Step 9: Tests, all together

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
  <script src="js/movers.js"></script>
  <script src="js/slime.js"></script>
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/tilt.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/level.tests.js"></script>  
  <script src="tests/clock.tests.js"></script>  
  <script src="tests/zones.tests.js"></script>  
  <script src="tests/movers.tests.js"></script>
  <script src="tests/slime.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/tilt.tests.js"></script>  
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **361 passing tests**: the 307 you started with, plus 10 for the slime rule, 5 for slime in the level, 4 for the marble in slime, 22 for where a mover is, and 13 for movers in the world and carrying the marble.

> **What these tests don't cover.** They check the waves and the slime numbers exactly, that every mover of every level stands where it should, and that a real marble is carried, thrown and dissolved. They can't tell you that a platform's 14 seconds is the right speed, that the piston is fair, or that a puddle is easy enough to see round. That is Step 8, with a thumb or a tilted phone. A hazard that is too hard is fixed in the level's numbers, not in the code.

> **Try breaking something.** In `moverWave`, swap the two ends of the piston's rise, so it reads `if (u < 0.5) return 1;` (it waits *up*). The piston test fails (it should wait down), and in the game the piston is a block that is up for half its cycle. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A build-up that wears off | `Exposure`: `tick`, `enter`, `leave` |
| A zone of its own size | `zoneRadius`, `radius` in the level |
| Hearing a trigger on the way out | `TRIGGER_EXITED`, `onExit` |
| A marble made thick and green | `slow`, `tint`, and `reset` |
| Movement as a function of time | `moverWave`, `moverCycle`, `moverCenter` |
| A wave that eases, and one that snaps | the platform's cosine, the piston's snap |
| How fast something is going, from where it is | `moverVelocity` |
| A body the game moves, that pushes and isn't pushed | `PhysicsMotionType.ANIMATED`, `setTargetTransform` |
| Why a rolling ball isn't carried by a floor | the marble is left behind: see `carry` |
| Telling the marble what the floor is doing | `Marble.carry`, `ground` |
| A ray that needs an up-to-date mesh | `computeWorldMatrix(true)` |
| A clock for each level | `levelTime` |
| Taking everything away with the level | `movers.dispose()`, `zones.dispose()` |

## Challenges

1. **A conveyor.** A strip of floor that pushes the marble along. (Hint: it is like a platform that doesn't move: `carry` could be given a velocity for a floor that is still. Which mover would own it?)
2. **A lift.** A platform that moves up and down between two heights, to carry the marble to a higher deck. (Hint: `moverCenter` for a platform only changes `x` and `z`; what would give it a `y`?)
3. **A timed gate.** A wall that is down for a few seconds and up for a few, built from the piston's wave. (Hint: a piston that rises a long way, with a long wait.)
4. **A slime meter.** Show how much of the marble has been eaten as a bar on the screen, or let the *banner* count it down. (Hint: `exposure.level` is already a number from 0 to 1, and a new part of the page is a new file in `css/`.)
5. **A bouncy pad.** A zone that kicks the marble upward when it rolls in, with `applyImpulse`. (Hint: a zone already tells the game the marble has rolled in.)

---
