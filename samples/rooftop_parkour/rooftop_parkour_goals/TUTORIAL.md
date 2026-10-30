# Tutorial: Rooftop Parkour Goals -- A Reason to Run

This is the seventh tutorial of the Rooftop Parkour series. The runner can go anywhere in the district now, and has nothing to go there for. This sample gives it three things to do: **collect tokens**, **score for running well**, and **run a time trial**. Like everything in the series, the rules are plain numbers and arithmetic with nothing drawn, so a test can say what a vault is worth and when a trial is won; and, because the district is full of places that are hard to get to, a **bot that plays the game** proves that every token can be got to, and says what the shortcut across the alley is worth.

By the end you'll have:

- **Flow**: a score in which every move is worth points, and moves that follow each other quickly make a chain, in which each move is worth more, and a **Sick Combo banner** that pops up every fifth move of a chain
- **Tokens** to collect: in the street, on every fire escape, on every roof, on top of every hut
- **A time trial**: checkpoints in order, a clock that starts when the runner moves off, splits, a par and a medal
- **Routes**: a bot that says which buildings can be got onto, that every token is on one, what each jump across a gap saves, and how long the trial takes if it is run well (which is what the par is made from)
- **A display** over the game: the score, the multiplier and the bar of the chain, the tokens, the trial, and words that float up
- The goals in the **game**: spinning tokens, an orange beacon over the next checkpoint, **T** to run the trial again
- More in the **developer panel**: the numbers of flow, read-outs, and buttons to take every token and to go to the next checkpoint
- Unit tests for all of it: **654 passing tests**

**What you'll learn:** how to turn "what the player did" into events by comparing a frame with the one before, how to make a score that rewards a style and not a count, how to write a state machine for a run (ready, running, finished) that tests can walk through, how to make goals from the plan so that they follow it, and how a bot can prove that a goal is reachable (and what a shortcut is worth).

**Before you start:** do the [Rooftops tutorial](../rooftop_parkour_rooftops/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Rooftops sample, plus placeholders for the new files and their tests:

```
rooftop_parkour_goals/
├── index.html, tests.html   (already list the new scripts and the new stylesheet)
├── css/
│   ├── hud.css             (placeholder -- Step 5)
│   └── everything else, from the Rooftops sample
├── js/
│   ├── flow.js             (placeholder -- Step 1)
│   ├── goals.js            (placeholder -- Steps 2 and 3)
│   ├── routes.js           (placeholder -- Step 4)
│   ├── hud.js              (placeholder -- Step 5)
│   ├── main.js             (changes -- Step 6)
│   └── everything else, from the Rooftops sample (the controller and the plan are not touched at all)
└── tests/
    ├── flow.tests.js, goals.tests.js, routes.tests.js, hud.tests.js   (placeholders)
    └── everything else, from the Rooftops sample
```

**Nothing that already exists is changed, except the game itself** (`main.js` and a line of the hint). The goals are new files that read what the controller and the plan already say. That is how it should be: a score and a trial are *about* the game, not a part of how the runner moves.

Open `tests.html` before you change anything. You should see **568 passing tests**.

### Serving the page

The models can't be loaded from a page opened straight from a file, so run a web server: `npx serve` in the repo root, and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **Flow**: the score, and finding the moves.
2. **Tokens**: where they are, and taking them.
3. **A trial**: checkpoints, a clock, a medal.
4. **Routes**: a bot that proves the goals can be reached, and says what a shortcut is worth.
5. **The display**: words and a stylesheet.
6. **The game**: all of it together.

## Step 1: Flow

A score for running well is a score for **style**: not how many moves, but how they fit together. Two vaults a minute apart are two vaults; two vaults in a second, with a kick in between, are a line. So the score has a **memory**: a **chain** of moves, each made soon after the one before, and a **multiplier** that goes up with the length of the chain. Stop for too long and the chain ends: the points stay, and the multiplier goes back to 1.

The numbers are in a table, as every number of the game is (`FLOW`): how many seconds a chain stays alive after a move (`window`), how many moves in the chain it takes to add one to the multiplier (`perStep`), the highest the multiplier goes (`maxMultiplier`), the points for each kind of move (`points`), and one more thing: running is flowing, so a body that runs at `runSpeed` or more uses up the window at only `runSlow` of the rate.

### What a move is

The controller does not say "I vaulted": it has a state, `move`, that is `null` and then is `{ kind: "vault" ... }` for a while. To score a vault, once, at the moment it begins, flow compares **what the body was doing a frame ago with what it is doing now**. `snapshot` is the part of a controller to keep from one frame to the next, and `moveEvents` is the comparison.

Open `js/flow.js` (the placeholder) and **replace the TODO line** with:

```js
// Flow: a score for running well. Every move is worth some points, and moves that follow each other quickly make a chain: the longer the chain, the more
// each move in it is worth. Stop, or fall silent for too long, and the chain ends (the points stay). Like the rest of the game's rules it is plain
// numbers in a table and plain arithmetic, with nothing drawn and nothing to click, so a test can say that a vault is worth three points and that a
// chain of eight is worth more than eight chains of one. See ../tests/flow.tests.js.

// The numbers of flow. `window` is how many seconds a chain stays alive after a move; `perStep` is how many moves in a chain it takes to
// add one to the multiplier, up to `maxMultiplier`; every `milestone` moves in a chain is a combo to be proud of (see `comboMilestone`); a body that runs at `runSpeed` or more uses up the window at `runSlow` of the rate (running is
// flowing, too). `points` is what each kind of move is worth, before the multiplier.
const FLOW = {
  window: 2.2,
  perStep: 2,
  maxMultiplier: 6,
  milestone: 5,
  runSpeed: 3,
  runSlow: 0.4,
  points: { jump: 1, roll: 2, grab: 2, climb: 2, vault: 3, mantle: 3, kick: 4, token: 5 },
};

// What a body is doing, as far as flow cares: the part of a Controller to compare from one frame to the next.
function snapshot(body) {
  return {
    grounded: body.grounded,
    move: body.move ? body.move.kind : null,
    wallJumps: body.wallJumps,
    hanging: Boolean(body.hang),
    climbing: Boolean(body.hang && body.hang.climb !== null),
    rolling: body.rolling > 0,
  };
}

// The moves a body made between a snapshot and now, as a list of kinds: each is the moment something began (a vault, a kick, a grab), not the
// whole time it lasts, so each is counted once.
function moveEvents(before, body) {
  const now = snapshot(body);
  const found = [];
  if (before.move === null && now.move !== null) found.push(now.move);
  if (now.wallJumps > before.wallJumps) found.push("kick");
  if (!before.hanging && now.hanging) found.push("grab");
  if (!before.climbing && now.climbing) found.push("climb");
  if (!before.rolling && now.rolling) found.push("roll");
  if (before.grounded && !now.grounded && body.jumping && now.move === null && !now.hanging && now.wallJumps === before.wallJumps) found.push("jump");
  return found;
}

// Whether going from a chain of `before` moves to one of `after` crosses a multiple of the table's milestone: 5, 10, 15 moves in a chain. The
// game puts up the Sick Combo banner when it does. A chain that has ended and begun again (`after` less than `before`) crosses nothing.
function comboMilestone(before, after, table = FLOW) {
  return after > before && Math.floor(after / table.milestone) > Math.floor(before / table.milestone);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FLOW, snapshot, moveEvents, comboMilestone };
} else {
  Object.assign(window, { FLOW, snapshot, moveEvents, comboMilestone });
}
```

Things to notice:

- **A move is counted when it begins.** A vault lasts half a second; it must score once. `before.move === null && now.move !== null` is "a vault began", and a vault that is going on is no event.
- **A kick is a count that went up** (`wallJumps`), a grab is `hang` that was `null` and is not, a climb is `hang.climb` that was `null` and is not, a roll is `rolling` that was zero and is not.
- **A jump is a jump, and not a fall.** The body left the ground *because it jumped* (`body.jumping`), not because it walked off an edge, and it is not also a kick or a grab (those have their own points).
- **`snapshot` is plain data.** It does not keep the controller: a snapshot is a copy of a few numbers, so a frame later it is still what it was.
- **A combo is a milestone of the chain.** `comboMilestone(before, after)` says whether going from a chain of `before` moves to one of `after` crosses a multiple of `milestone` (5, 10, 15). It is the same rule as the Sick Combo banner of the Parkour Runner series: the game puts the banner up when it is true. It is a function of two numbers and a table, so that a test can say that the fifth move does and the sixth does not, that a chain that jumps over a milestone (a token and a move in the same frame) crosses it once, and that a chain that ended and began again crossed nothing.

### Tests

Open `tests/flow.tests.js` and **replace the TODO line** with:

```js
QUnit.module("The numbers of flow", () => {
  QUnit.test("every kind of move that can happen is worth something, and the harder the move the more", (assert) => {
    for (const kind of ["jump", "roll", "grab", "climb", "vault", "mantle", "kick", "token"]) assert.true(FLOW.points[kind] > 0, kind);
    assert.true(FLOW.points.kick > FLOW.points.vault && FLOW.points.vault >= FLOW.points.mantle && FLOW.points.mantle > FLOW.points.jump);
  });

  QUnit.test("a chain lasts long enough to get from one move to the next, and running slows the clock down but does not stop it", (assert) => {
    assert.true(FLOW.window > 1);
    assert.true(FLOW.runSlow > 0 && FLOW.runSlow < 1);
    assert.true(FLOW.runSpeed <= SCOUT.jogSpeed, "a jog is running");
    assert.true(FLOW.maxMultiplier >= 2 && FLOW.perStep >= 1);
  });
});

QUnit.module("snapshot and moveEvents", () => {
  const body = (changes = {}) => ({ grounded: true, move: null, wallJumps: 0, hang: null, rolling: 0, jumping: false, ...changes });

  QUnit.test("a snapshot is what a body is doing, as far as flow cares", (assert) => {
    assert.deepEqual(snapshot(body({ move: { kind: "vault" }, hang: { climb: 0.2 }, rolling: 0.3, wallJumps: 2, grounded: false })), {
      grounded: false,
      move: "vault",
      wallJumps: 2,
      hanging: true,
      climbing: true,
      rolling: true,
    });
    assert.deepEqual(snapshot(body({ hang: { climb: null } })), { grounded: true, move: null, wallJumps: 0, hanging: true, climbing: false, rolling: false });
  });

  QUnit.test("nothing changed, nothing happened", (assert) => {
    assert.deepEqual(moveEvents(snapshot(body()), body()), []);
  });

  QUnit.test("a vault and a mantle are counted the moment they begin, and not while they go on", (assert) => {
    const still = snapshot(body());
    assert.deepEqual(moveEvents(still, body({ move: { kind: "vault" } })), ["vault"]);
    assert.deepEqual(moveEvents(still, body({ move: { kind: "mantle" } })), ["mantle"]);
    assert.deepEqual(moveEvents(snapshot(body({ move: { kind: "vault" } })), body({ move: { kind: "vault" } })), []);
  });

  QUnit.test("a kick is counted for each wall jump", (assert) => {
    assert.deepEqual(moveEvents(snapshot(body({ wallJumps: 1, grounded: false })), body({ wallJumps: 2, grounded: false, jumping: true })), ["kick"]);
  });

  QUnit.test("catching a ledge, and then climbing it, are each counted once", (assert) => {
    const air = snapshot(body({ grounded: false }));
    assert.deepEqual(moveEvents(air, body({ grounded: false, hang: { climb: null } })), ["grab"]);
    const hanging = snapshot(body({ grounded: false, hang: { climb: null } }));
    assert.deepEqual(moveEvents(hanging, body({ grounded: false, hang: { climb: 0.1 } })), ["climb"]);
    assert.deepEqual(moveEvents(snapshot(body({ grounded: false, hang: { climb: 0.1 } })), body({ grounded: false, hang: { climb: 0.2 } })), []);
  });

  QUnit.test("a roll is counted when it begins", (assert) => {
    assert.deepEqual(moveEvents(snapshot(body({ grounded: false })), body({ rolling: 0.4 })), ["roll"]);
    assert.deepEqual(moveEvents(snapshot(body({ rolling: 0.4 })), body({ rolling: 0.3 })), []);
  });

  QUnit.test("a jump is counted when the body leaves the ground because it jumped, and not when it walks off an edge", (assert) => {
    const ground = snapshot(body());
    assert.deepEqual(moveEvents(ground, body({ grounded: false, jumping: true })), ["jump"]);
    assert.deepEqual(moveEvents(ground, body({ grounded: false, jumping: false })), []);
  });

  QUnit.test("a kick is not also a jump, and a catch is not", (assert) => {
    assert.deepEqual(moveEvents(snapshot(body()), body({ grounded: false, jumping: true, wallJumps: 1 })), ["kick"]);
    assert.deepEqual(moveEvents(snapshot(body()), body({ grounded: false, jumping: true, hang: { climb: null } })), ["grab"]);
  });

  QUnit.test("with a real controller: a jump, a vault, and a mantle are each seen", (assert) => {
    const dt = 1 / 60;
    const wall = { name: "wall", minX: -3, maxX: 3, minY: 0, maxY: 1, minZ: 2, maxZ: 2.4 };
    const crate = { name: "crate", minX: -3, maxX: 3, minY: 0, maxY: 1.5, minZ: 8, maxZ: 10 };
    const world = new World({ boxes: [wall, crate] });
    const ledges = ledgesOf([wall, crate]);
    const body1 = new Controller({ x: 0, z: -1, heading: 0, world, ledges });
    const seen = [];
    for (let i = 0; i < 400; i++) {
      const before = snapshot(body1);
      body1.update({ x: 0, z: 1 }, true, dt, i > 150 && body1.z > 6.9 && body1.z < 7.6);
      seen.push(...moveEvents(before, body1));
    }
    assert.true(seen.includes("vault"), seen.join());
    assert.true(seen.includes("mantle") || seen.includes("jump"), seen.join());
  });
});

QUnit.module("comboMilestone", () => {
  const table = { milestone: 5 };

  QUnit.test("a chain that reaches a multiple of the milestone is a combo", (assert) => {
    assert.true(comboMilestone(4, 5, table));
    assert.true(comboMilestone(9, 10, table));
    assert.true(comboMilestone(14, 15, table));
  });

  QUnit.test("a chain that does not is not, and the one that is already there is not again", (assert) => {
    assert.false(comboMilestone(0, 1, table));
    assert.false(comboMilestone(5, 6, table));
    assert.false(comboMilestone(5, 5, table));
    assert.false(comboMilestone(8, 9, table));
  });

  QUnit.test("a chain that jumps over a milestone (a token and a move in a frame) has crossed it, once", (assert) => {
    assert.true(comboMilestone(4, 6, table));
    assert.true(comboMilestone(3, 11, table));
  });

  QUnit.test("a chain that ended and began again crossed nothing", (assert) => {
    assert.false(comboMilestone(7, 1, table));
    assert.false(comboMilestone(12, 0, table));
  });

  QUnit.test("with the numbers of the game, the milestone is a few moves, and a chain can reach it before the multiplier is at its highest", (assert) => {
    assert.true(FLOW.milestone >= 3 && FLOW.milestone <= FLOW.perStep * FLOW.maxMultiplier);
    assert.true(comboMilestone(FLOW.milestone - 1, FLOW.milestone));
  });

  QUnit.test("it is the moves of a Flow that cross it: the fifth move of a chain does", (assert) => {
    const flow = new Flow({ ...FLOW, milestone: 5 });
    const crossed = [];
    for (let i = 0; i < 11; i++) {
      const before = flow.chain;
      flow.add("vault");
      if (comboMilestone(before, flow.chain, flow.table)) crossed.push(flow.chain);
    }
    assert.deepEqual(crossed, [5, 10]);
  });
});
```

Things to notice:

- **The last test uses a real controller**: it runs a body at a low wall and a crate, and says which moves flow saw. The others use plain objects, so that each says one thing.
- **The table is tested too**: a kick is worth more than a vault, a vault more than a jump, a chain lasts longer than a second, and running must be slower than standing but not stopped.

Open `tests.html`. You should see **585 passing tests**: 17 more.

### The chain

Now the score. `Flow` has a score, a chain (how many moves), a timer (how long the chain has left), and the best chain. `add` is a move: it is worth the points of its kind times `count` (a token is worth what it is marked with) times the multiplier *before* the move; then it joins the chain and starts the window again. `update` is time going by.

In `js/flow.js`, find the export block (lines 51 to 58) and **delete it**. Add this in its place, and the whole block of exports under it:

```js
class Flow {
  // `table` is the numbers of flow, FLOW unless a test or the developer panel has others.
  constructor(table = FLOW) {
    this.table = table;
    this.score = 0; // all the points so far
    this.chain = 0; // how many moves are in the chain that is alive (0 if there is none)
    this.timer = 0; // seconds left that the chain stays alive
    this.bestChain = 0; // the longest chain so far
    this.lastKind = null; // what the last move was
  }

  // How much each move in the chain is worth now: 1 for a chain that has just begun, and one more for each `perStep` moves, up to the most.
  get multiplier() {
    const t = this.table;
    return Math.min(t.maxMultiplier, 1 + Math.floor(this.chain / t.perStep));
  }

  // A move of `kind` (a key of the table's points) has been made, worth `count` times as much (a token is worth what it is marked with). The
  // points are the table's, times the multiplier before this move, and the move joins the chain and keeps it alive. It says how many points that was.
  add(kind, count = 1) {
    const points = (this.table.points[kind] || 0) * count * this.multiplier;
    this.score += points;
    this.chain++;
    this.bestChain = Math.max(this.bestChain, this.chain);
    this.timer = this.table.window;
    this.lastKind = kind;
    return points;
  }

  // Time goes by, `dt` seconds. A body that is running (`speed` m/s along the ground) uses up the window slowly. When it is used up, the chain ends.
  // It says whether the chain ended.
  update(dt, speed = 0) {
    if (this.chain === 0) return false;
    const t = this.table;
    this.timer -= dt * (speed >= t.runSpeed ? t.runSlow : 1);
    if (this.timer > 0) return false;
    this.chain = 0;
    this.timer = 0;
    return true;
  }

  // How much of the window is left, from 1 (just moved) to 0 (gone): for a bar.
  get fraction() {
    return this.chain === 0 ? 0 : Math.max(0, Math.min(1, this.timer / this.table.window));
  }

  // Starts again: no points, no chain.
  reset() {
    this.score = 0;
    this.chain = 0;
    this.timer = 0;
    this.bestChain = 0;
    this.lastKind = null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FLOW, snapshot, moveEvents, comboMilestone, Flow };
} else {
  Object.assign(window, { FLOW, snapshot, moveEvents, comboMilestone, Flow });
}
```

Things to notice:

- **The multiplier is not stored: it is worked out from the chain.** `1 + floor(chain / perStep)`, no more than the most. Nothing can get out of step with anything else.
- **The multiplier is the one *before* the move**, so the first move of a chain is worth its points, and the second, with `perStep` of 2, is too, and the third is worth double: a chain is something you have to *earn*.
- **A slow clock for a running body.** `update(dt, speed)` takes `dt * runSlow` off the window of a body that is running. A runner that keeps moving between moves keeps its chain; one that stops, loses it.
- **`update` says whether the chain ended**, once, so that the game can say "flow lost".
- **`fraction` is for a bar**: 1 when a move has just been made, down to 0.
- **The table is passed in**, with the numbers of the game as the default (and so the developer panel changes the game's own numbers, and a test gives its own).

### Tests

At the end of `tests/flow.tests.js` (below line 128) add:

```js
QUnit.module("Flow", () => {
  const table = { window: 2, perStep: 2, maxMultiplier: 4, runSpeed: 3, runSlow: 0.5, points: { vault: 3, kick: 4, token: 5 } };

  QUnit.test("it begins with nothing: no points, no chain, a multiplier of 1", (assert) => {
    const flow = new Flow(table);
    assert.deepEqual([flow.score, flow.chain, flow.multiplier, flow.fraction, flow.bestChain], [0, 0, 1, 0, 0]);
  });

  QUnit.test("a move is worth its points, times the multiplier at the time", (assert) => {
    const flow = new Flow(table);
    assert.strictEqual(flow.add("vault"), 3);
    assert.strictEqual(flow.score, 3);
    assert.strictEqual(flow.add("kick"), 4);
    assert.strictEqual(flow.multiplier, 2, "two moves make a step");
    assert.strictEqual(flow.add("vault"), 6);
    assert.strictEqual(flow.score, 13);
  });

  QUnit.test("a token is worth what it is marked with, times its points", (assert) => {
    const flow = new Flow(table);
    assert.strictEqual(flow.add("token", 3), 15);
  });

  QUnit.test("a kind that is not in the table is worth nothing, but is a move", (assert) => {
    const flow = new Flow(table);
    assert.strictEqual(flow.add("dance"), 0);
    assert.strictEqual(flow.chain, 1);
  });

  QUnit.test("the multiplier goes up a step each perStep moves, and no higher than the most", (assert) => {
    const flow = new Flow(table);
    const seen = [];
    for (let i = 0; i < 12; i++) {
      flow.add("vault");
      seen.push(flow.multiplier);
    }
    assert.deepEqual(seen, [1, 2, 2, 3, 3, 4, 4, 4, 4, 4, 4, 4]);
  });

  QUnit.test("a chain is alive for the window, and a move starts the window again", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    assert.false(flow.update(1.5));
    assert.strictEqual(flow.chain, 1);
    flow.add("vault");
    assert.false(flow.update(1.5), "the second move began the window again");
    assert.strictEqual(flow.chain, 2);
  });

  QUnit.test("when the window is used up the chain ends: the multiplier is 1 again, the points stay, and the best chain is kept", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    flow.add("vault");
    flow.add("vault");
    assert.true(flow.update(2.1));
    assert.deepEqual([flow.chain, flow.multiplier, flow.score, flow.bestChain], [0, 1, 12, 3]);
  });

  QUnit.test("it says only once that the chain ended", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    assert.true(flow.update(3));
    assert.false(flow.update(3));
  });

  QUnit.test("a body that runs uses up the window more slowly, and one that stands doesn't", (assert) => {
    const running = new Flow(table);
    const standing = new Flow(table);
    running.add("vault");
    standing.add("vault");
    assert.false(running.update(3, 5), "3 s at half the rate is 1.5 s of 2");
    assert.true(standing.update(3, 0));
  });

  QUnit.test("the fraction is how much of the window is left, for a bar", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    assert.strictEqual(flow.fraction, 1);
    flow.update(0.5);
    assert.strictEqual(flow.fraction, 0.75);
    flow.update(5);
    assert.strictEqual(flow.fraction, 0);
  });

  QUnit.test("a long chain is worth more than the same moves each on their own", (assert) => {
    const chained = new Flow(table);
    for (let i = 0; i < 8; i++) chained.add("vault");
    const apart = new Flow(table);
    for (let i = 0; i < 8; i++) {
      apart.add("vault");
      apart.update(5);
    }
    assert.true(chained.score > apart.score * 1.5, `${chained.score} against ${apart.score}`);
    assert.strictEqual(apart.score, 24);
  });

  QUnit.test("reset starts again", (assert) => {
    const flow = new Flow(table);
    flow.add("vault");
    flow.add("kick");
    flow.reset();
    assert.deepEqual([flow.score, flow.chain, flow.bestChain, flow.lastKind, flow.fraction], [0, 0, 0, null, 0]);
  });

  QUnit.test("it uses the numbers of the game unless it is given others, so the developer panel can change them", (assert) => {
    const flow = new Flow();
    assert.strictEqual(flow.table, FLOW);
    flow.add("kick");
    assert.strictEqual(flow.score, FLOW.points.kick);
  });
});
```

Things to notice:

- **The multiplier is tested as a sequence**: twelve moves, and the numbers it goes through (1, 2, 2, 3, 3, 4, then 4 for ever).
- **Style is tested**: eight vaults in a chain are worth more than half as much again as eight vaults that are each on their own.
- **The window is tested both ways**: a second move starts it again, and the chain ends when it runs out, once.

Open `tests.html`. You should see **598 passing tests**: 13 more.

## Step 2: Tokens

A token is a thing to collect. Where they are is data, **made from the plan**, so that they follow it: if a building moves, its token does. There are four kinds: three in the **street** on the way to the first fire escape (to learn the idea), one on the top platform of every **fire escape**, one on every **roof**, and one on top of every **hut**, which takes a climb. The kinds are in a table (`TOKEN`) with what each is worth and its colour.

Open `js/goals.js` (the placeholder) and **replace the TODO line** with:

```js
// Goals: things to do in the district. Tokens to collect, on the roofs and the fire escapes and in the street, and a time trial, a route of
// checkpoints to run as fast as can be. Like the plan, they are data and arithmetic with nothing drawn: where each token is, whether a body is
// close enough to take it, whether it has reached the next checkpoint, and how good its time was, can be said in a test. (Whether each can be
// *got to* is another question, and routes.js asks it with a bot.) See ../tests/goals.tests.js.

// A token. `radius` is how close to it a body must come to take it (the feet of the body to the place the token is over, which is where a
// body stands to be there), and `roofClear` how far from the things on a roof a token on the roof must be. `kinds` says what each kind of token is
// worth (flow counts it as that many tokens) and the colour it is drawn in.
const TOKEN = {
  radius: 1,
  roofClear: 2.5,
  kinds: {
    street: { value: 1, color: "#ffd23f" },
    platform: { value: 2, color: "#ffb02e" },
    roof: { value: 2, color: "#ff8c1a" },
    hut: { value: 3, color: "#ff5a36" },
  },
};

// Where on a roof there is room for a token: the middle of it, and then round the middle, as far from the things on the roof as `roofClear`.
const ROOF_SPOTS = [[0, 0], [3, 3], [-3, 3], [3, -3], [-3, -3], [5, 0], [-5, 0]];

// How far a token floats above what it is over, when it is drawn (the middle of it is a body's chest high: see TOKEN).
const TOKEN_FLOAT = 0.9;

// Every token of the district, as a list of { id, kind, x, y, z, value, building }: where it is (y is the ground or the roof or the platform
// that it is over, not the middle of it), how many it is worth, and which building it belongs to (-1 for the street). There are three in the street
// on the way from the start to the first fire escape; one on the top platform of every fire escape; one on every roof, in the clearest spot; and one on
// top of every hut.
function tokenSpots(grid = GRID, layouts = LAYOUTS) {
  const tokens = [];
  const add = (kind, x, y, z, building, index) => tokens.push({ id: `${kind}-${building}-${index}`, kind, x, y, z, value: TOKEN.kinds[kind].value, building });
  for (let i = 0; i < 3; i++) {
    const z = START.z - 1.5 - i * 1.5;
    add("street", START.x, groundHeight(START.x, z, grid), z, -1, i);
  }
  const roofs = buildingBoxes(grid, layouts);
  const things = roofThings(grid, layouts);
  for (const escape of fireEscapes(grid, layouts)) {
    const at = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 1.7, 1.2);
    add("platform", at.x, escape.top, at.z, escape.building, 0);
  }
  roofs.forEach((roof, building) => {
    const middle = { x: (roof.minX + roof.maxX) / 2, z: (roof.minZ + roof.maxZ) / 2 };
    const mine = things.filter((thing) => thing.minY === roof.maxY && thing.maxX > roof.minX && thing.minX < roof.maxX && thing.maxZ > roof.minZ && thing.minZ < roof.maxZ);
    const clear = ROOF_SPOTS.map(([u, v]) => ({ x: middle.x + u, z: middle.z + v })).find((spot) => mine.every((thing) => distanceToBox(thing, spot.x, spot.z) >= TOKEN.roofClear));
    add("roof", clear.x, roof.maxY, clear.z, building, 0);
  });
  things.forEach((thing, index) => {
    if (thing.kind !== "hut") return;
    const building = roofs.findIndex((roof) => thing.minY === roof.maxY && thing.minX >= roof.minX && thing.maxX <= roof.maxX && thing.minZ >= roof.minZ && thing.maxZ <= roof.maxZ);
    add("hut", (thing.minX + thing.maxX) / 2, thing.maxY, (thing.minZ + thing.maxZ) / 2, building, index);
  });
  return tokens;
}

// How far a point on the ground is from a box (0 if it is over it).
function distanceToBox(box, x, z) {
  return Math.hypot(Math.max(box.minX - x, 0, x - box.maxX), Math.max(box.minZ - z, 0, z - box.maxZ));
}

// Whether a body (its feet at { x, y, z }) is close enough to a token to take it: within `radius` of the place the token is over.
function canTake(token, body, table = TOKEN) {
  const dx = body.x - token.x;
  const dy = body.y - token.y;
  const dz = body.z - token.z;
  return Math.hypot(dx, dy, dz) <= table.radius;
}

// The tokens taken so far. `take` says which a body has just taken.
class Collection {
  constructor(tokens) {
    this.tokens = tokens;
    this.taken = new Set();
  }

  get count() {
    return this.taken.size;
  }

  get total() {
    return this.tokens.length;
  }

  // How much the tokens taken are worth.
  get value() {
    return this.tokens.filter((token) => this.taken.has(token.id)).reduce((sum, token) => sum + token.value, 0);
  }

  // Takes every token that the body is close enough to and that has not been taken: it says which they were.
  take(body, table = TOKEN) {
    const found = this.tokens.filter((token) => !this.taken.has(token.id) && canTake(token, body, table));
    for (const token of found) this.taken.add(token.id);
    return found;
  }

  has(token) {
    return this.taken.has(token.id);
  }

  reset() {
    this.taken.clear();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection };
} else {
  Object.assign(window, { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection });
}
```

Things to notice:

- **`tokenSpots` uses the functions of the plan and the props**: `START`, `fireEscapes`, `buildingBoxes`, `roofThings`, `groundHeight`. A token is `{ id, kind, x, y, z, value, building }`, with `y` the height of what it is *over* (a roof, a platform), not the middle of it: that is where a body stands to take it.
- **A roof token is in the clearest spot.** The things on the roof (a vent, a hut) are in the way; `ROOF_SPOTS` is a list of places round the middle to try, and the first that is `roofClear` metres from everything on the roof is the one.
- **A token knows its building** (and `-1` for the street), so that a test can say that every token is on a building that can be reached (Step 4).
- **`canTake` is a distance.** The body and the token are in the same three dimensions, so a body under a token, or on the floor above it, does not take it.
- **A collection remembers** which have been taken (`taken`, a set of ids) and says which a body has just taken, once each: `take` is called every frame.

### Tests

Open `tests/goals.tests.js` and **replace the TODO line** with:

```js
QUnit.module("distanceToBox", () => {
  const box = { minX: 0, maxX: 4, minZ: 0, maxZ: 2 };

  QUnit.test("over the box it is 0, and beside it it is the way to the nearest side or corner", (assert) => {
    assert.strictEqual(distanceToBox(box, 2, 1), 0);
    assert.strictEqual(distanceToBox(box, 7, 1), 3);
    assert.strictEqual(distanceToBox(box, 7, 6), 5);
  });
});

QUnit.module("tokenSpots", () => {
  const tokens = tokenSpots();
  const roofs = buildingBoxes();
  const escapes = fireEscapes();
  const things = roofThings();

  QUnit.test("every token has a name that is its own, a kind that is in the table, and what it is worth", (assert) => {
    assert.strictEqual(new Set(tokens.map((token) => token.id)).size, tokens.length);
    for (const token of tokens) {
      assert.true(token.kind in TOKEN.kinds, token.id);
      assert.strictEqual(token.value, TOKEN.kinds[token.kind].value, token.id);
      assert.true(/^#[0-9a-f]{6}$/i.test(TOKEN.kinds[token.kind].color), token.kind);
    }
  });

  QUnit.test("there are three in the street, on the way from the start to the first fire escape, and on the ground", (assert) => {
    const street = tokens.filter((token) => token.kind === "street");
    assert.strictEqual(street.length, 3);
    const planter = escapes[0].planter.box;
    for (const token of street) {
      assert.strictEqual(token.building, -1);
      assert.strictEqual(token.y, groundHeight(token.x, token.z));
      assert.true(token.z < START.z && token.z > planter.maxZ, "between the start and the planter");
      assert.true(Math.abs(token.x - START.x) < 1e-9);
    }
  });

  QUnit.test("there is one on the top platform of every fire escape, over the platform, at the top of the stair", (assert) => {
    const platform = tokens.filter((token) => token.kind === "platform");
    assert.strictEqual(platform.length, escapes.length);
    for (const token of platform) {
      const escape = escapes.find((e) => e.building === token.building);
      assert.strictEqual(token.y, escape.top);
      const slab = escape.boxes.find((box) => box.maxY === escape.top && token.x >= box.minX && token.x <= box.maxX && token.z >= box.minZ && token.z <= box.maxZ);
      assert.notStrictEqual(slab, undefined, `${token.id} is over a slab of the platform`);
    }
  });

  QUnit.test("there is one on every roof, over the roof, and clear of what is on it", (assert) => {
    const roof = tokens.filter((token) => token.kind === "roof");
    assert.strictEqual(roof.length, roofs.length);
    for (const token of roof) {
      const box = roofs[token.building];
      assert.true(token.x > box.minX + RIM_WIDTH && token.x < box.maxX - RIM_WIDTH && token.z > box.minZ + RIM_WIDTH && token.z < box.maxZ - RIM_WIDTH, `${token.id} is on the roof, not the raised edge`);
      assert.strictEqual(token.y, box.maxY);
      for (const thing of things) {
        if (thing.minY === box.maxY && distanceToBox(thing, token.x, token.z) < TOKEN.roofClear) assert.true(thing.minX < box.minX || thing.maxX > box.maxX, `${token.id} is ${distanceToBox(thing, token.x, token.z).toFixed(1)} m from ${thing.name}`);
      }
    }
  });

  QUnit.test("there is one on top of every hut, and none on anything else", (assert) => {
    const huts = things.filter((thing) => thing.kind === "hut");
    const onHuts = tokens.filter((token) => token.kind === "hut");
    assert.strictEqual(onHuts.length, huts.length);
    for (const token of onHuts) {
      const hut = huts.find((thing) => token.x > thing.minX && token.x < thing.maxX && token.z > thing.minZ && token.z < thing.maxZ);
      assert.notStrictEqual(hut, undefined, token.id);
      assert.strictEqual(token.y, hut.maxY);
      assert.strictEqual(roofs[token.building].maxY, hut.minY, "the building it is on");
    }
  });

  QUnit.test("a token higher up is worth more than one in the street, and the hut, which takes a climb, the most", (assert) => {
    assert.true(TOKEN.kinds.platform.value > TOKEN.kinds.street.value);
    assert.true(TOKEN.kinds.hut.value > TOKEN.kinds.roof.value);
  });

  QUnit.test("none of them is in a wall: a runner could stand where each one is", (assert) => {
    const world = new World({ boxes: [...roofs, ...ledgeBoxes(), ...rimBoxes(), ...propBoxes()], ground: (x, z) => groundHeight(x, z) });
    for (const token of tokens) {
      const support = world.supportAt(token.x, token.z, 0, token.y + 0.01);
      assert.true(Math.abs(support - token.y) < 0.05, `${token.id} is over something to stand on (${support.toFixed(2)} against ${token.y.toFixed(2)})`);
      const pushed = world.push(token.x, token.z, SCOUT.radius, token.y, BODY.height, BODY.stepHeight);
      assert.true(Math.hypot(pushed.x - token.x, pushed.z - token.z) < 0.05, `${token.id} is not in a wall`);
    }
  });
});

QUnit.module("canTake and Collection", () => {
  const token = { id: "t", kind: "roof", x: 5, y: 10, z: 5, value: 2, building: 0 };
  const another = { id: "u", kind: "hut", x: 20, y: 10, z: 5, value: 3, building: 0 };

  QUnit.test("a body takes a token when it is within the radius, in all three directions", (assert) => {
    assert.true(canTake(token, { x: 5, y: 10, z: 5 }));
    assert.true(canTake(token, { x: 5 + TOKEN.radius - 0.01, y: 10, z: 5 }));
    assert.false(canTake(token, { x: 5 + TOKEN.radius + 0.01, y: 10, z: 5 }));
    assert.false(canTake(token, { x: 5, y: 10 + TOKEN.radius + 0.01, z: 5 }), "above it, as on another floor");
    assert.false(canTake(token, { x: 5, y: 10 - 2, z: 5 }), "and under it");
  });

  QUnit.test("a collection takes what the body is at, once", (assert) => {
    const collection = new Collection([token, another]);
    assert.deepEqual(collection.take({ x: 5, y: 10, z: 5.5 }), [token]);
    assert.deepEqual(collection.take({ x: 5, y: 10, z: 5.5 }), [], "it is not taken twice");
    assert.deepEqual([collection.count, collection.total, collection.value], [1, 2, 2]);
    assert.true(collection.has(token));
    assert.false(collection.has(another));
  });

  QUnit.test("two tokens at the same place are taken together", (assert) => {
    const collection = new Collection([token, { ...another, x: 5.5 }]);
    assert.strictEqual(collection.take({ x: 5, y: 10, z: 5 }).length, 2);
    assert.strictEqual(collection.value, 5);
  });

  QUnit.test("reset puts them all back", (assert) => {
    const collection = new Collection([token]);
    collection.take({ x: 5, y: 10, z: 5 });
    collection.reset();
    assert.strictEqual(collection.count, 0);
    assert.strictEqual(collection.take({ x: 5, y: 10, z: 5 }).length, 1);
  });
});
```

Things to notice:

- **The tokens are tested against the world**: each is over something to stand on (`supportAt`), and not in a wall (`push` leaves it where it is). A token in the middle of a hut or under a platform would be a token that can't be taken.
- **Each kind is tested for where it must be**: the street tokens between the start and the planter; a platform token over a slab of the platform; a roof token on the roof, not the raised edge, and clear of what is on it; a hut token on top of the hut.

Open `tests.html`. You should see **610 passing tests**: 12 more.

## Step 3: A trial

A time trial is a route of **checkpoints** to run in order, against a clock. This one goes round the block: from the start in the street, up the fire escape of the medium building to its roof (the first checkpoint), across the alley by a jump to the roof of the small building beside it (the second), and down to the street and back to the start (the finish). The checkpoints are made from the plan, as the tokens are.

The rules of a run are a **state machine**: `ready` (at the start, the clock at zero), `running` (the runner has moved off, and the clock goes), `finished` (the last checkpoint is reached, and the clock stops). Every frame `update` takes the body and the time, and says what happened, as a list of events: it began, a checkpoint was reached, it finished (with the time, the medal and the best time).

In `js/goals.js`, find the export block (lines 106 to 113) and **delete it**. Add this in its place, and the whole block of exports under it:

```js
// The trial: a route of checkpoints, in order, from the street to a roof to another roof and back to the street. It begins at the start gate, and
// the clock starts when the runner moves off. `par` is the time that is good (a gold), which is worked out by routes.js from a bot that runs it.
// `radius` is how close to the middle of a gate a body must come, and `above` how high over its base it counts (a gate is a tall post, not a floor).
const TRIAL = { name: "Round the block", radius: 2.2, below: 1, above: 3, moveOff: 0.5, par: 38, silver: 1.4, bronze: 2 };

// The checkpoints of the trial, as a list of { name, x, y, z }: the start gate (where the runner begins), the roof of the medium_1 (reached by its fire
// escape, and a ledge), the roof of the small_1 beside it (reached by the jump across the alley: the shortcut), and the finish, which is the start gate
// again. They are made from the plan, so they follow it.
function trialCheckpoints(grid = GRID, layouts = LAYOUTS) {
  const roofs = buildingBoxes(grid, layouts);
  const middle = (box) => ({ x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 });
  const medium = middle(roofs[1]);
  const small = middle(roofs[0]);
  const ground = groundHeight(START.x, START.z, grid);
  return [
    { name: "Start", x: START.x, y: ground, z: START.z },
    { name: "Medium roof", x: medium.x, y: roofs[1].maxY, z: medium.z },
    { name: "Small roof", x: small.x, y: roofs[0].maxY, z: small.z },
    { name: "Finish", x: START.x, y: ground, z: START.z },
  ];
}

// Whether a body is in a gate: close enough to its middle, and over its base by no more than it is tall.
function inGate(gate, body, table = TRIAL) {
  const over = body.y - gate.y;
  return Math.hypot(body.x - gate.x, body.z - gate.z) <= table.radius && over >= -table.below && over <= table.above;
}

// The medal that a time earns, against `par`: "gold" for par or better, "silver" for up to `silver` times par, "bronze" for up to `bronze` times, and
// "none" for slower.
function medalFor(time, par = TRIAL.par, table = TRIAL) {
  if (time <= par) return "gold";
  if (time <= par * table.silver) return "silver";
  if (time <= par * table.bronze) return "bronze";
  return "none";
}

// The state of a run of the trial. It is "ready" until the runner moves off from the start gate, then "running" (the clock goes), and "finished" when the
// last checkpoint is reached. `splits` is the time at each checkpoint reached. `update` says what happened this frame, as a list of events:
// { kind: "start" } or { kind: "checkpoint", index, time } or { kind: "finish", time, medal, best }.
class Trial {
  constructor(checkpoints, table = TRIAL) {
    this.checkpoints = checkpoints;
    this.table = table;
    this.best = null; // the best finishing time of all the runs
    this.restart();
  }

  // Back to the start gate, with the clock at zero.
  restart() {
    this.state = "ready";
    this.time = 0;
    this.next = 1; // the checkpoint to reach next (the start gate is 0)
    this.splits = [];
    this.medal = null;
  }

  // The checkpoint to head for now, or null when the run is over.
  get target() {
    return this.state === "finished" ? null : this.checkpoints[this.next];
  }

  update(body, dt) {
    const events = [];
    if (this.state === "ready" && body.speed > this.table.moveOff) {
      this.state = "running";
      events.push({ kind: "start" });
    }
    if (this.state !== "running") return events;
    this.time += dt;
    if (inGate(this.checkpoints[this.next], body, this.table)) {
      this.splits.push(this.time);
      if (this.next === this.checkpoints.length - 1) {
        this.state = "finished";
        this.medal = medalFor(this.time, this.table.par, this.table);
        this.best = this.best === null ? this.time : Math.min(this.best, this.time);
        events.push({ kind: "finish", time: this.time, medal: this.medal, best: this.best });
      } else {
        events.push({ kind: "checkpoint", index: this.next, time: this.time });
        this.next++;
      }
    }
    return events;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection, TRIAL, trialCheckpoints, inGate, medalFor, Trial };
} else {
  Object.assign(window, { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection, TRIAL, trialCheckpoints, inGate, medalFor, Trial });
}
```

Things to notice:

- **A gate is a post, not a floor.** A checkpoint on a roof must not be reached from the street below it: `inGate` asks for a body that is close to the middle of it *and* no more than a little under its base and three metres over it. Jumping through it counts.
- **The clock starts when the runner moves off**, not when the page loads or a key is pressed (`moveOff`, a little over standing still). The first frame of the run is counted.
- **Checkpoints are in order.** A runner that gets to the finish first has not finished: only the next checkpoint is looked at.
- **A medal is a multiple of par.** `medalFor` is gold at par or better, silver up to `silver` times par, bronze up to `bronze` times. The par is a number in the table, and Step 4 says where it comes from.
- **`best` is kept across runs** (`restart` forgets the run and keeps the best): a better time replaces it, a worse one does not.
- **Everything is a function of the body it is given.** The trial does not know about controllers or the screen: a test walks a plain object through the gates.

### Tests

At the end of `tests/goals.tests.js` (below line 124) add:

```js
QUnit.module("the trial", () => {
  const checkpoints = trialCheckpoints();
  const roofs = buildingBoxes();

  QUnit.test("the checkpoints are the start, two roofs and the finish, and the finish is where the start is", (assert) => {
    assert.deepEqual(checkpoints.map((c) => c.name), ["Start", "Medium roof", "Small roof", "Finish"]);
    assert.deepEqual([checkpoints[3].x, checkpoints[3].y, checkpoints[3].z], [checkpoints[0].x, checkpoints[0].y, checkpoints[0].z]);
  });

  QUnit.test("the start is where the runner begins, on the road", (assert) => {
    assert.deepEqual([checkpoints[0].x, checkpoints[0].z], [START.x, START.z]);
    assert.strictEqual(checkpoints[0].y, groundHeight(START.x, START.z));
  });

  QUnit.test("the roofs are the roofs of the medium_1 and the small_1 beside it, at the middle, and at the height of the roof", (assert) => {
    for (const [index, building] of [[1, 1], [2, 0]]) {
      const box = roofs[building];
      assert.true(checkpoints[index].x > box.minX && checkpoints[index].x < box.maxX && checkpoints[index].z > box.minZ && checkpoints[index].z < box.maxZ, checkpoints[index].name);
      assert.strictEqual(checkpoints[index].y, box.maxY);
    }
    assert.strictEqual(buildingPlacements()[1].name, "medium_1");
    assert.strictEqual(buildingPlacements()[0].name, "small_1");
  });

  QUnit.test("the jump from the medium_1 to the small_1 is one of the crossings of the district", (assert) => {
    assert.true(CROSSINGS.some((crossing) => crossing.from === 1 && crossing.to === 0));
  });

  QUnit.test("a body is in a gate when it is near the middle, and not much under it or over it", (assert) => {
    const gate = { x: 0, y: 10, z: 0 };
    assert.true(inGate(gate, { x: 1, y: 10, z: 1 }));
    assert.false(inGate(gate, { x: 3, y: 10, z: 0 }), "too far");
    assert.false(inGate(gate, { x: 0, y: 10 + TRIAL.above + 0.1, z: 0 }), "on the floor above");
    assert.false(inGate(gate, { x: 0, y: 10 - TRIAL.below - 0.1, z: 0 }), "and on the floor below");
    assert.true(inGate(gate, { x: 0, y: 10 + 2, z: 0 }), "in a jump");
  });

  QUnit.test("a medal is for par or better, and then for so many times par", (assert) => {
    assert.strictEqual(medalFor(TRIAL.par - 1), "gold");
    assert.strictEqual(medalFor(TRIAL.par), "gold");
    assert.strictEqual(medalFor(TRIAL.par * TRIAL.silver), "silver");
    assert.strictEqual(medalFor(TRIAL.par * TRIAL.bronze), "bronze");
    assert.strictEqual(medalFor(TRIAL.par * TRIAL.bronze + 1), "none");
    assert.strictEqual(medalFor(50, 40), "silver");
  });

  QUnit.test("it is ready until the body moves off, and then it runs, and the clock does not run before", (assert) => {
    const trial = new Trial(checkpoints);
    assert.strictEqual(trial.state, "ready");
    assert.deepEqual(trial.update({ x: checkpoints[0].x, y: 0, z: checkpoints[0].z, speed: 0 }, 1), []);
    assert.strictEqual(trial.time, 0);
    assert.deepEqual(trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.5), [{ kind: "start" }]);
    assert.strictEqual(trial.state, "running");
    assert.strictEqual(trial.time, 0.5, "the clock runs from the frame that it started");
  });

  QUnit.test("the target is the next checkpoint, and then the one after", (assert) => {
    const trial = new Trial(checkpoints);
    assert.strictEqual(trial.target, checkpoints[1]);
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    trial.update({ x: checkpoints[1].x, y: checkpoints[1].y, z: checkpoints[1].z, speed: 3 }, 1);
    assert.strictEqual(trial.target, checkpoints[2]);
  });

  QUnit.test("it asks for the checkpoints in order: reaching the last first is not enough", (assert) => {
    const trial = new Trial(checkpoints);
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    const events = trial.update({ x: checkpoints[3].x, y: checkpoints[3].y, z: checkpoints[3].z, speed: 3 }, 1);
    assert.deepEqual(events, []);
    assert.strictEqual(trial.state, "running");
  });

  QUnit.test("a run through all of them finishes, with the splits, a time, a medal and a best", (assert) => {
    const trial = new Trial(checkpoints, { ...TRIAL, par: 20 });
    const at = (c) => ({ x: c.x, y: c.y, z: c.z, speed: 3 });
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    const seen = [];
    for (const c of checkpoints.slice(1)) seen.push(...trial.update(at(c), 6));
    assert.deepEqual(seen.map((e) => e.kind), ["checkpoint", "checkpoint", "finish"]);
    assert.strictEqual(trial.state, "finished");
    assert.strictEqual(trial.splits.length, 3);
    assert.true(Math.abs(trial.time - 18.1) < 1e-9);
    assert.strictEqual(trial.medal, "gold");
    assert.strictEqual(trial.best, trial.time);
    assert.strictEqual(trial.target, null);
  });

  QUnit.test("a finished run does not go on: the clock stops", (assert) => {
    const trial = new Trial(checkpoints);
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    for (const c of checkpoints.slice(1)) trial.update({ x: c.x, y: c.y, z: c.z, speed: 3 }, 1);
    const time = trial.time;
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 5);
    assert.strictEqual(trial.time, time);
  });

  QUnit.test("restart goes back to the start, and keeps the best time", (assert) => {
    const trial = new Trial(checkpoints);
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0.1);
    for (const c of checkpoints.slice(1)) trial.update({ x: c.x, y: c.y, z: c.z, speed: 3 }, 10);
    const best = trial.best;
    trial.restart();
    assert.deepEqual([trial.state, trial.time, trial.next, trial.splits.length, trial.medal], ["ready", 0, 1, 0, null]);
    assert.strictEqual(trial.best, best);
  });

  QUnit.test("a better run replaces the best, and a worse one does not", (assert) => {
    const trial = new Trial(checkpoints);
    const run = (seconds) => {
      trial.restart();
      trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0);
      for (const c of checkpoints.slice(1)) trial.update({ x: c.x, y: c.y, z: c.z, speed: 3 }, seconds / 3);
    };
    run(60);
    run(90);
    assert.true(Math.abs(trial.best - 60) < 1e-9);
    run(30);
    assert.true(Math.abs(trial.best - 30) < 1e-9);
  });
});
```

Things to notice:

- **Each rule is a test**: it is ready until the body moves off; the clock does not run before that; the checkpoints are in order; a finished run stops the clock; a restart keeps the best.
- **The checkpoints are tested against the plan**: the start is where the runner begins, the roofs are the roofs of the right buildings (and at the height of the roof), and the jump from the one to the other is one of the district's crossings.

Open `tests.html`. You should see **623 passing tests**: 13 more.

## Step 4: Routes

Everything so far *says* where things are. Whether a runner can *get* there is another question, and it is the one that matters: a token on a roof that can't be reached is a bug that only a player finds. So the bot of the last step is asked. `routes.js` is the questions.

### How long things take

Two pieces of arithmetic: how long it takes to **run** from one place in the street to another (the distance over the sprint speed), and how long a **fall** takes (from rest, with gravity, and then a second for the roll). They are used to say what the long way round costs.

Open `js/routes.js` (the placeholder) and **replace the TODO line** with:

```js
// Routes: whether the goals can be got to, and how long it takes. It asks the bot of reach.js. Which buildings can be got onto from the street (by a
// fire escape, by a climb from a ledge to the roof above it, by a jump across a gap), whether every token is on one of them, what each jump across a
// gap saves over the long way round, and how long the trial takes if it is run well, which is what its par is made from. The same controller and the
// same boxes as the game: so a change that puts a token out of reach is a failing test, and not a player who is stuck. See ../tests/routes.tests.js.

// How a runner is taken to be: how long the roll takes that follows a fall into the street from a roof.
const ROUTE = { roll: 1 };

// How long it takes to get from the street at one place to another, running: the distance over the sprint speed.
function runTime(a, b, options = { ...SCOUT, ...BODY }) {
  return Math.hypot(a.x - b.x, a.z - b.z) / options.sprintSpeed;
}

// How long a fall takes, from `height` metres: from rest, with gravity, and then the roll that follows it.
function fallTime(height, options = { ...SCOUT, ...BODY }) {
  return Math.sqrt((2 * Math.max(0, height)) / options.gravity) + ROUTE.roll;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ROUTE, runTime, fallTime };
} else {
  Object.assign(window, { ROUTE, runTime, fallTime });
}
```

### Tests

Open `tests/routes.tests.js` and **replace the TODO line** with:

```js
QUnit.module("runTime and fallTime", () => {
  const o = { ...SCOUT, ...BODY };

  QUnit.test("a run is the distance at the sprint speed", (assert) => {
    assert.strictEqual(runTime({ x: 0, z: 0 }, { x: 30, z: 40 }, { sprintSpeed: 10 }), 5);
    assert.true(Math.abs(runTime({ x: 0, z: 0 }, { x: 3, z: 4 }) - 5 / o.sprintSpeed) < 1e-9);
  });

  QUnit.test("a fall is how long gravity takes, and the roll that follows it", (assert) => {
    assert.strictEqual(fallTime(0), ROUTE.roll);
    assert.true(Math.abs(fallTime(20, { gravity: 10 }) - (2 + ROUTE.roll)) < 1e-9);
    assert.true(fallTime(40) > fallTime(10));
    assert.strictEqual(fallTime(-5), ROUTE.roll, "never a negative fall");
  });
});
```

Open `tests.html`. You should see **625 passing tests**: 2 more.

### The district for a bot, and a climb

The bot needs the world the game has: the boxes, the ledges, the roofs, the fire escapes. `districtWorld` makes them the way `main.js` does. And it needs one more thing it did not have: to **climb** a box that stands on a roof (a hut, or the upper roof of a building in two levels). `playClimb` runs at it square on, jumps when it is near, holds the key, and says whether it ended up standing on top. `climbStart` is where the run begins: at the face of the box with the most roof in front of it.

In `js/routes.js`, find the export block (lines 19 to 26) and **delete it**. Add this in its place, and the whole block of exports under it:

```js
// The district as the game has it, for the bot: the world, the ledges, the roofs, the lower roofs (of the buildings in two levels), and the fire escapes.
function districtWorld(grid = GRID, layouts = LAYOUTS) {
  const roofs = buildingBoxes(grid, layouts);
  const lower = ledgeBoxes(grid, layouts);
  const props = propBoxes(grid, layouts);
  const world = new World({ boxes: [...roofs, ...lower, ...rimBoxes(grid, layouts), ...props], ground: (x, z) => groundHeight(x, z, grid) });
  const ledges = ledgesOf([...roofs, ...lower, ...props]);
  const placed = buildingPlacements(grid, layouts);
  // The roof that a fire escape reaches: the lower one, for a building in two levels.
  const reached = roofs.map((roof, i) => (placed[i].ledge > 0 ? lower.find((box) => box.name === `${placed[i].name} ledge`) : roof));
  return { world, ledges, roofs, lower, placed, reached, escapes: fireEscapes(grid, layouts) };
}

// Where a run at a box that stands on a roof begins: at the face of it that has the most roof in front of it, as far back from the face as there
// is room for, up to `runUp`, facing it. It is { x, y, z, heading, dx, dz }, with (dx, dz) the way to go (along an axis, square on to the face).
function climbStart(from, target, runUp = 5) {
  const middle = { x: (target.minX + target.maxX) / 2, z: (target.minZ + target.maxZ) / 2 };
  const faces = [
    { dx: 1, dz: 0, room: target.minX - from.minX, x: target.minX, z: middle.z },
    { dx: -1, dz: 0, room: from.maxX - target.maxX, x: target.maxX, z: middle.z },
    { dx: 0, dz: 1, room: target.minZ - from.minZ, x: middle.x, z: target.minZ },
    { dx: 0, dz: -1, room: from.maxZ - target.maxZ, x: middle.x, z: target.maxZ },
  ];
  const face = faces.reduce((best, f) => (f.room > best.room ? f : best));
  const back = Math.max(0.3, Math.min(runUp, face.room - 0.6));
  return { x: face.x - face.dx * back, y: from.maxY, z: face.z - face.dz * back, heading: Math.atan2(face.dx, face.dz), dx: face.dx, dz: face.dz };
}

// Plays a climb on a roof: a runner on the roof `from` runs square at `target`, a box that stands on it or beside it (a hut, the upper roof of a building
// in two levels), jumps when it is within `near` of it, and holds the key while rising. It says { landed, time }: whether it ended up standing on the top.
function playClimb(world, ledges, from, target, options = {}) {
  const { runUp, near, time, dt } = { runUp: 5, near: 0.9, time: 8, dt: 1 / 60, ...options.bot };
  const start = climbStart(from, target, runUp);
  const body = new Controller({ x: start.x, z: start.z, y: start.y, heading: start.heading, world, ledges, options: options.body });
  const direction = { x: start.dx, z: start.dz };
  let jumped = false;
  for (let t = 0; t < time; t += dt) {
    const close = distanceToBox(target, body.x, body.z) < near;
    if (close) jumped = true;
    body.update(direction, true, dt, close || (jumped && !body.grounded && body.vy > 0));
    if (body.grounded && body.move === null && isOver(target, body.x, body.z, -0.1) && Math.abs(body.y - target.maxY) < 0.3) return { landed: true, time: t };
    if (body.y < Math.min(from.maxY, target.maxY) - 4) return { landed: false, time: t };
  }
  return { landed: false, time };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ROUTE, runTime, fallTime, districtWorld, climbStart, playClimb };
} else {
  Object.assign(window, { ROUTE, runTime, fallTime, districtWorld, climbStart, playClimb });
}
```

Things to notice:

- **The bot goes straight at a face.** The first version aimed at the middle of the hut from wherever it was, and arrived at a corner, where the hands can't catch the top. A person goes at the wall. `climbStart` picks the face, and the run is along an axis.
- **It is the real controller.** `playClimb(world, ledges, roof, box, { body: { jumpSpeed: 1 } })` is the same runner with a hardly-a-jump: a test says that a runner that can jump gets up a box that one that can't does not.

### Tests

At the end of `tests/routes.tests.js` (below line 15) add:

```js
QUnit.module("districtWorld", () => {
  const env = districtWorld();

  QUnit.test("it is the district the game is: the roofs, the lower roofs, the fire escapes, and a roof that each fire escape reaches", (assert) => {
    assert.strictEqual(env.roofs.length, buildingPlacements().length);
    assert.strictEqual(env.escapes.length, fireEscapes().length);
    assert.true(env.world.boxes.length > env.roofs.length + env.lower.length);
    assert.true(env.ledges.length >= env.world.boxes.length - rimBoxes().length);
  });

  QUnit.test("a fire escape reaches the roof, or for a building in two levels the lower one", (assert) => {
    env.placed.forEach((placement, i) => {
      assert.strictEqual(env.reached[i].maxY, placement.ledge > 0 ? placement.roof - placement.ledge : placement.roof, placement.name);
    });
  });
});

QUnit.module("climbStart and playClimb", () => {
  const roof = { name: "roof", minX: 0, maxX: 20, minY: 0, maxY: 10, minZ: 0, maxZ: 10 };
  const box = (height, minX = 8, maxX = 11) => ({ name: "box", minX, maxX, minY: 10, maxY: 10 + height, minZ: 4, maxZ: 7 });
  const climb = (target, options) => {
    const world = new World({ boxes: [roof, target], ground: () => 0 });
    return playClimb(world, ledgesOf([roof, target]), roof, target, options);
  };

  QUnit.test("a run begins at the face with the most roof in front of it, square to it, a run-up back", (assert) => {
    const start = climbStart(roof, box(2, 14, 17));
    assert.deepEqual([start.dx, start.dz], [1, 0], "from the west, where there are 14 m of roof, and not the east, where there are 3");
    assert.true(Math.abs(Math.sin(start.heading) - 1) < 1e-9, "facing east");
  });

  QUnit.test("it starts on the roof, and not further back than there is room for", (assert) => {
    const start = climbStart(roof, box(2, 1.5, 4.5));
    assert.true(start.x >= roof.minX && start.x <= roof.maxX && start.z >= roof.minZ && start.z <= roof.maxZ);
    assert.strictEqual(start.y, 10);
  });

  QUnit.test("something a jump gets the hands to is climbed", (assert) => {
    assert.true(climb(box(2.4)).landed);
    assert.true(climb(box(1.6)).landed);
  });

  QUnit.test("something that is too high is not", (assert) => {
    assert.false(climb(box(6)).landed);
  });

  QUnit.test("it plays by the numbers of the runner it is given", (assert) => {
    assert.true(climb(box(3.4)).landed, "a runner that jumps");
    assert.false(climb(box(3.4), { body: { jumpSpeed: 1 } }).landed, "and one that hardly does");
  });
});
```

Open `tests.html`. You should see **632 passing tests**: 7 more.

### What the bot can reach

`reachable` asks: which buildings can the bot get a runner onto? It plays each **fire escape** (street to roof, with the time it took), for a building in two levels the **climb** from the lower roof to the upper one, and then each designed **crossing** from a building that is already reached. It says the set of buildings and the edges, each with its time. From that, `shortcuts` says what each crossing **saves**: the way round is to drop to the street, run to the foot of the next fire escape, and climb it, and the jump is the bot's time for the jump. And `trialEstimate` is how long the trial takes if it is run well, which is what the **par** is made from.

In `js/routes.js`, delete the export block again (lines 65 to 72) and add this in its place:

```js
// What the bot can do in the district, as a list of the buildings it can get a runner onto, and how: { reached, edges }. `reached` is the set of the
// numbers of the buildings (the upper roof, for a building in two levels), and each edge is { kind, from, to, time }: "escape" (from the street, `from` is
// -1, by the fire escape, to the roof it reaches), "climb" (from that lower roof to the upper one, `from` and `to` the same building) and "crossing".
function reachable(env = districtWorld()) {
  const edges = [];
  const reached = new Set();
  env.escapes.forEach((escape) => {
    const result = playEscape(env.world, env.ledges, escape, env.reached[escape.building]);
    if (!result.reached) return;
    edges.push({ kind: "escape", from: -1, to: escape.building, time: result.time });
    if (env.placed[escape.building].ledge > 0) {
      const up = playClimb(env.world, env.ledges, env.reached[escape.building], env.roofs[escape.building]);
      if (!up.landed) return;
      edges.push({ kind: "climb", from: escape.building, to: escape.building, time: up.time });
    }
    reached.add(escape.building);
  });
  // The jumps: each from a building that is reached, played once, and as many times round as it takes for what they reach to reach more.
  const played = new Set();
  for (let again = true; again; ) {
    again = false;
    for (const { from, to } of CROSSINGS) {
      if (!reached.has(from) || played.has(`${from}>${to}`)) continue;
      played.add(`${from}>${to}`);
      const result = playCrossing(env.world, env.ledges, env.roofs[from], env.roofs[to]);
      if (!result.landed) continue;
      edges.push({ kind: "crossing", from, to, time: result.time });
      again = again || !reached.has(to);
      reached.add(to);
    }
  }
  return { reached, edges };
}

// What each designed jump across a gap saves over the long way round, as a list of { from, to, jump, around, saved } in seconds: the way round is to
// drop to the street, run to the foot of the fire escape of the building it goes to, and climb that. The jump is the bot's time for the jump (with its
// run-up). They say what a shortcut is worth, and a shortcut that saves nothing is not one.
function shortcuts(env = districtWorld(), edges = reachable(env).edges) {
  return CROSSINGS.map(({ from, to }) => {
    const jump = edges.find((edge) => edge.kind === "crossing" && edge.from === from && edge.to === to);
    const climb = edges.find((edge) => edge.kind === "escape" && edge.to === to);
    const foot = env.escapes.find((escape) => escape.building === to).planter;
    const here = env.escapes.find((escape) => escape.building === from).planter;
    const around = fallTime(env.roofs[from].maxY) + runTime(here, foot) + (climb ? climb.time : Infinity);
    return { from, to, jump: jump ? jump.time : Infinity, around, saved: around - (jump ? jump.time : Infinity) };
  });
}

// How long the trial takes if it is run well (as the bot would run it, with sprint held): to the foot of the fire escape of the medium_1, up it, up the
// ledge to the roof, across the gap to the small_1, off the roof to the street, and back to the start. It is an estimate, in seconds, and what the
// par of the trial is made from.
function trialEstimate(env = districtWorld(), edges = reachable(env).edges, checkpoints = trialCheckpoints()) {
  const escape = env.escapes.find((e) => e.building === 1);
  const up = edges.find((edge) => edge.kind === "escape" && edge.to === 1).time;
  const climb = edges.find((edge) => edge.kind === "climb" && edge.to === 1).time;
  const jump = edges.find((edge) => edge.kind === "crossing" && edge.from === 1 && edge.to === 0).time;
  const start = checkpoints[0];
  return runTime(start, escape.planter) + up + climb + jump + fallTime(checkpoints[2].y) + runTime(env.escapes.find((e) => e.building === 0).planter, start);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ROUTE, runTime, fallTime, districtWorld, climbStart, playClimb, reachable, shortcuts, trialEstimate };
} else {
  Object.assign(window, { ROUTE, runTime, fallTime, districtWorld, climbStart, playClimb, reachable, shortcuts, trialEstimate });
}
```

Things to notice:

- **A shortcut is a number.** It saves about 14 to 19 seconds, every one of them, and there is a test that says it saves more than five: a crossing that is not worth the risk is not one.
- **The par is not the bot's time.** The bot's run is the estimate (26 seconds or so): a person who runs it well can match it, and gold is a little over that (38). A test says the par is between 1.2 and 2 times the estimate, so that if a change makes the route twice as slow, the par is wrong, and a test says so.
- **The estimate is made of pieces**: the run to the first fire escape, the climb (the bot's time), the climb to the upper roof, the jump (the bot's time), the fall, and the run home.

### Tests

At the end of `tests/routes.tests.js` (below line 67) add:

```js
QUnit.module("the routes of the district", () => {
  const env = districtWorld();
  const found = reachable(env);
  const tokens = tokenSpots();

  QUnit.test("every building can be got onto from the street, by its fire escape", (assert) => {
    assert.deepEqual([...found.reached].sort(), env.placed.map((_, i) => i));
    for (const [i] of env.placed.entries()) assert.true(found.edges.some((edge) => edge.kind === "escape" && edge.to === i), `building ${i}`);
  });

  QUnit.test("a building in two levels is climbed from the lower roof to the upper one", (assert) => {
    env.placed.forEach((placement, i) => {
      const climbs = found.edges.filter((edge) => edge.kind === "climb" && edge.to === i);
      assert.strictEqual(climbs.length, placement.ledge > 0 ? 1 : 0, placement.name);
    });
  });

  QUnit.test("every designed crossing is made, from a building that is reached", (assert) => {
    for (const { from, to } of CROSSINGS) assert.true(found.edges.some((edge) => edge.kind === "crossing" && edge.from === from && edge.to === to), `${from} to ${to}`);
  });

  QUnit.test("every token is on a building that the bot can get to, or in the street", (assert) => {
    for (const token of tokens) assert.true(token.building === -1 || found.reached.has(token.building), token.id);
  });

  QUnit.test("every token on a hut is one that the bot can climb to, from the roof, and stand on", (assert) => {
    const huts = roofThings().filter((thing) => thing.kind === "hut");
    for (const token of tokens.filter((t) => t.kind === "hut")) {
      const hut = huts.find((thing) => token.x > thing.minX && token.x < thing.maxX && token.z > thing.minZ && token.z < thing.maxZ);
      assert.true(playClimb(env.world, env.ledges, env.roofs[token.building], hut).landed, token.id);
    }
  });

  QUnit.test("every token on a platform is at the top of the stair that the bot climbs: within the reach of a body that passes", (assert) => {
    for (const token of tokens.filter((t) => t.kind === "platform")) {
      const escape = env.escapes.find((e) => e.building === token.building);
      const top = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 1.7, 0.45);
      const near = Math.hypot(top.x - token.x, top.z - token.z);
      assert.true(near < TOKEN.radius, `${token.id} is ${near.toFixed(2)} m from the top of the stair`);
      assert.strictEqual(token.y, escape.top);
    }
  });

  QUnit.test("a body that climbs a fire escape takes the token on its top platform, with the real controller", (assert) => {
    const escape = env.escapes.find((e) => e.building === 0);
    const collection = new Collection(tokens.filter((token) => token.building === 0 && token.kind === "platform"));
    const at = (along, out) => frameToWorld({ x: escape.x, z: escape.z }, escape.turn, along, out);
    const body = new Controller({ x: at(1.7, 0.45).x, z: at(1.7, 0.45).z, y: escape.top, heading: 0, world: env.world, ledges: env.ledges });
    assert.strictEqual(collection.take(body).length, 1);
  });

  QUnit.test("every jump across a gap saves time over going round: dropping to the street, running to the foot of the fire escape and climbing it", (assert) => {
    for (const shortcut of shortcuts(env, found.edges)) {
      assert.true(Number.isFinite(shortcut.jump) && shortcut.jump < 5, `${shortcut.from} to ${shortcut.to} takes ${shortcut.jump.toFixed(1)} s`);
      assert.true(shortcut.saved > 5, `${shortcut.from} to ${shortcut.to} saves ${shortcut.saved.toFixed(1)} s`);
    }
  });

  QUnit.test("the par of the trial is about what the bot takes, a little more: a gold is for running it well, and not for the bot", (assert) => {
    const estimate = trialEstimate(env, found.edges);
    assert.true(estimate > 15 && estimate < 60, `the bot's run takes ${estimate.toFixed(1)} s`);
    assert.true(TRIAL.par >= estimate * 1.2, `the par is ${TRIAL.par}`);
    assert.true(TRIAL.par <= estimate * 2, `the par is ${TRIAL.par}`);
  });

  QUnit.test("with the jump across the alley the trial is quicker than the way round, by more than a gold's margin", (assert) => {
    const jump = found.edges.find((edge) => edge.kind === "crossing" && edge.from === 1 && edge.to === 0);
    const shortcut = shortcuts(env, found.edges).find((s) => s.from === 1 && s.to === 0);
    assert.true(shortcut.saved > TRIAL.par * 0.2, `the jump takes ${jump.time.toFixed(1)} s, and saves ${shortcut.saved.toFixed(1)} s of ${TRIAL.par}`);
  });
});
```

Things to notice:

- **Every token is on a building the bot can get to**: the test that says the goals are reachable is five lines long, and it has every fire escape, climb and jump behind it.
- **Every hut token is a climb**: the bot is run at each hut, from the roof it is on.
- **Every platform token is on the path of the stair**: within a metre of where a body passes on its way up, so that anyone who climbs the fire escape takes it; and there is a test with the real controller that standing there takes it.

Open `tests.html`. You should see **642 passing tests**: 10 more.

## Step 5: The display

The score, the chain and the trial are on a display over the game. The *words* are made by plain functions, so that a test can say them (`formatTime` makes 61.3 seconds into "1:01.3", cutting the tenths, so a time is never shown as better than it was; `trialLines` says what the trial block shows). The `Hud` only puts them on the page.

Open `js/hud.js` (the placeholder) and **replace the TODO line** with:

```js
// The heads-up display: the score, the chain of moves and how long it has left, the tokens, the trial, and the banner for a combo. The words are made by plain functions (so a
// test can say that 61.3 seconds is "1:01.3"), and the Hud only puts them on the page. See ../tests/hud.tests.js and ../css/hud.css.

// A time in seconds as minutes, seconds and tenths: 61.3 is "1:01.3". (Tenths are cut, not rounded, so a time is never shown as better than it was.)
function formatTime(seconds) {
  const tenths = Math.floor(Math.max(0, seconds) * 10 + 1e-9);
  const minutes = Math.floor(tenths / 600);
  const rest = (tenths - minutes * 600) / 10;
  return `${minutes}:${rest < 10 ? "0" : ""}${rest.toFixed(1)}`;
}

// What the trial block says, as { title, time, hint }: the name of the run, the clock, and what to do next.
function trialLines(trial) {
  const target = trial.target;
  if (trial.state === "finished") {
    const best = trial.best === trial.time ? " (a new best)" : trial.best === null ? "" : ` (best ${formatTime(trial.best)})`;
    return { title: trial.table.name, time: formatTime(trial.time), hint: `${trial.medal === "none" ? "Finished" : trial.medal.toUpperCase()}${best}. Press T to run it again` };
  }
  if (trial.state === "ready") return { title: trial.table.name, time: formatTime(0), hint: `Run to the ${target.name.toLowerCase()}, or press T` };
  return { title: trial.table.name, time: formatTime(trial.time), hint: `${trial.next} of ${trial.checkpoints.length - 1}: the ${target.name.toLowerCase()}` };
}

// The picture of the Sick Combo banner, from the Parkour Runner series (it is in the assets of this one), as the page sees it.
const COMBO_IMAGE = "../assets/images/sick_combo_small.png";

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { COMBO_IMAGE, formatTime, trialLines };
} else {
  Object.assign(window, { COMBO_IMAGE, formatTime, trialLines });
}
```

Open `tests/hud.tests.js` and **replace the TODO line** with:

```js
QUnit.module("formatTime", () => {
  QUnit.test("a time is minutes, seconds and tenths", (assert) => {
    assert.strictEqual(formatTime(0), "0:00.0");
    assert.strictEqual(formatTime(7.25), "0:07.2");
    assert.strictEqual(formatTime(61.3), "1:01.3");
    assert.strictEqual(formatTime(600), "10:00.0");
  });

  QUnit.test("the tenths are cut and not rounded, so that a time is never shown better than it was", (assert) => {
    assert.strictEqual(formatTime(59.99), "0:59.9");
    assert.strictEqual(formatTime(0.05), "0:00.0");
  });

  QUnit.test("a time under zero is zero", (assert) => {
    assert.strictEqual(formatTime(-4), "0:00.0");
  });
});

QUnit.module("trialLines", () => {
  const checkpoints = trialCheckpoints();
  const through = (trial, count, seconds) => {
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0);
    for (const c of checkpoints.slice(1, 1 + count)) trial.update({ x: c.x, y: c.y, z: c.z, speed: 3 }, seconds);
  };

  QUnit.test("before the run it says where to go, and the clock is at zero", (assert) => {
    const lines = trialLines(new Trial(checkpoints));
    assert.strictEqual(lines.title, TRIAL.name);
    assert.strictEqual(lines.time, "0:00.0");
    assert.true(lines.hint.includes("medium roof") && lines.hint.includes("T"));
  });

  QUnit.test("during the run it says the time, and which checkpoint is next out of how many", (assert) => {
    const trial = new Trial(checkpoints);
    through(trial, 1, 12.5);
    const lines = trialLines(trial);
    assert.strictEqual(lines.time, "0:12.5");
    assert.true(lines.hint.startsWith("2 of 3") && lines.hint.includes("small roof"), lines.hint);
  });

  QUnit.test("at the end it says the medal and the best, and how to go again", (assert) => {
    const trial = new Trial(checkpoints, { ...TRIAL, par: 100 });
    through(trial, 3, 5);
    const lines = trialLines(trial);
    assert.true(lines.hint.startsWith("GOLD") && lines.hint.includes("a new best") && lines.hint.includes("T"), lines.hint);
    assert.strictEqual(lines.time, "0:15.0");
  });

  QUnit.test("a run that earns no medal is just finished, and one that is not the best says what is", (assert) => {
    const trial = new Trial(checkpoints, { ...TRIAL, par: 1 });
    through(trial, 3, 100);
    assert.true(trialLines(trial).hint.startsWith("Finished"));
    trial.restart();
    through(trial, 3, 120);
    assert.true(trialLines(trial).hint.includes("best 5:00.0"), trialLines(trial).hint);
  });
});
```

Open `tests.html`. You should see **649 passing tests**: 7 more.

Now the display itself. In `js/hud.js`, find the export block (lines 26 to 33) and **delete it**. Add this in its place, and the whole block of exports under it:

```js
class Hud {
  // `doc` is the page. The display is made and put at the end of its body.
  constructor(doc) {
    this.doc = doc;
    const make = (tag, className, parent, text = "") => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };
    this.root = make("div", "hud", doc.body);
    const flow = make("div", "hud-flow", this.root);
    this.score = make("span", "hud-score", flow, "0");
    this.multiplier = make("span", "hud-multiplier", flow, "x1");
    const bar = make("div", "hud-bar", this.root);
    this.fill = make("div", "hud-fill", bar);
    this.tokens = make("div", "hud-tokens", this.root, "0 / 0 tokens");
    const trial = make("div", "hud-trial", this.root);
    this.trialTitle = make("div", "hud-trial-title", trial);
    this.trialTime = make("div", "hud-trial-time", trial);
    this.trialHint = make("div", "hud-trial-hint", trial);
    this.toasts = make("div", "hud-toasts", this.root);
    // The banner for a combo that has reached a milestone: the picture, and the words under it. It is not in the corner with the rest: it is in the
    // middle, near the top, and plays its animation (see hud.css) once each time it is shown.
    this.comboBanner = make("div", "hud-combo", this.root);
    this.comboImage = make("img", "hud-combo-image", this.comboBanner);
    this.comboImage.src = COMBO_IMAGE;
    this.comboImage.alt = "Sick combo";
    this.comboText = make("p", "hud-combo-text", this.comboBanner);
  }

  // Pops up the Sick Combo banner, with `text` under it ("5 in a row"). It plays its animation again from the start.
  banner(text) {
    this.comboText.textContent = text;
    this.comboBanner.classList.remove("show");
    void this.comboBanner.offsetWidth; // a read, so that the browser notices the class has gone before it is put back
    this.comboBanner.classList.add("show");
  }

  // Shows the state of the game: { score, multiplier, fraction (of the chain's window left), tokens, total, trial }.
  set({ score, multiplier, fraction, tokens, total, trial }) {
    this.score.textContent = String(Math.round(score));
    this.multiplier.textContent = `x${multiplier}`;
    this.fill.style.width = `${Math.round(fraction * 100)}%`;
    this.tokens.textContent = `${tokens} / ${total} tokens`;
    const lines = trialLines(trial);
    this.trialTitle.textContent = lines.title;
    this.trialTime.textContent = lines.time;
    this.trialHint.textContent = lines.hint;
  }

  // A few words that float up and go: "+12", "Checkpoint 1". They are taken away after `seconds`.
  toast(text, seconds = 1.6) {
    const element = this.doc.createElement("div");
    element.className = "hud-toast";
    element.textContent = text;
    this.toasts.appendChild(element);
    while (this.toasts.children.length > 5) this.toasts.removeChild(this.toasts.firstChild);
    setTimeout(() => element.parentNode && element.parentNode.removeChild(element), seconds * 1000);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { COMBO_IMAGE, formatTime, trialLines, Hud };
} else {
  Object.assign(window, { COMBO_IMAGE, formatTime, trialLines, Hud });
}
```

And its stylesheet. Open `css/hud.css` and **replace the TODO comment** with:

```css
/* The heads-up display, at the top right: the score and its multiplier, the bar of the chain, the tokens, and the trial. It lets the mouse through, so the
   picture stays interactive. On a small screen it is smaller. */
.hud {
  position: fixed;
  top: 56px;
  right: 14px;
  z-index: 22;
  width: 240px;
  color: var(--paper);
  font-family: var(--small-font);
  letter-spacing: 0.06em;
  text-align: right;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.7);
  pointer-events: none;
}
.hud-flow {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 10px;
}
.hud-score {
  font: 44px / 1 var(--title-font);
}
.hud-multiplier {
  font: 26px / 1 var(--title-font);
  color: var(--orange);
}
.hud-bar {
  height: 6px;
  margin: 6px 0 8px;
  border: 2px solid var(--paper);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.5);
  overflow: hidden;
}
.hud-fill {
  width: 0;
  height: 100%;
  background: var(--orange);
}
.hud-tokens {
  font-size: 18px;
  color: #ffd23f;
}
.hud-trial {
  margin-top: 10px;
  padding: 8px 10px;
  border: 3px solid var(--paper);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.55);
}
.hud-trial-title {
  font-size: 15px;
  color: var(--sky);
}
.hud-trial-time {
  font: 34px / 1.1 var(--title-font);
}
.hud-trial-hint {
  font-size: 15px;
}
.hud-toasts {
  margin-top: 10px;
}
.hud-toast {
  font-size: 22px;
  color: var(--good);
  animation: hud-rise 1.6s ease-out forwards;
}
@keyframes hud-rise {
  from {
    opacity: 1;
    transform: translateY(8px);
  }
  to {
    opacity: 0;
    transform: translateY(-14px);
  }
}
/* The banner for a combo that has reached a milestone: it pops in, stays a moment and fades out, once, each time the class "show" is put on it. */
.hud-combo {
  position: fixed;
  left: 50%;
  top: 16%;
  z-index: 24;
  width: min(60vw, 360px);
  text-align: center;
  pointer-events: none;
  opacity: 0;
  transform: translateX(-50%);
}
.hud-combo-image {
  width: 100%;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6));
}
.hud-combo-text {
  margin: -8px 0 0;
  font: 400 40px / 1 var(--title-font);
  color: #fff;
  -webkit-text-stroke: 5px var(--asphalt);
  paint-order: stroke fill;
}
.hud-combo.show {
  animation: hud-combo-pop 1.8s ease-out forwards;
}
@keyframes hud-combo-pop {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.5);
  }
  12% {
    opacity: 1;
    transform: translateX(-50%) scale(1.12);
  }
  22% {
    transform: translateX(-50%) scale(1);
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) scale(1);
  }
}
@media (max-width: 640px), (max-height: 520px) {
  .hud {
    top: 50px;
    right: 8px;
    width: 170px;
  }
  .hud-score {
    font-size: 30px;
  }
  .hud-multiplier {
    font-size: 20px;
  }
  .hud-trial-time {
    font-size: 24px;
  }
  .hud-trial-hint,
  .hud-toast {
    font-size: 13px;
  }
  .hud-combo {
    top: 22%;
    width: min(70vw, 260px);
  }
  .hud-combo-text {
    font-size: 28px;
  }
}
```

Things to notice:

- **The Sick Combo banner is the picture of the Parkour Runner series** (`assets/images/sick_combo_small.png`, a copy of the one in that series, with its transparent background), with the words under it ("5 in a row"). `banner(text)` takes the class `show` off, reads `offsetWidth` (so that the browser notices), and puts it back: the animation plays again from the start every time, and only then.
- **The display makes its own elements** and puts them in the body: no change to `index.html` beyond the stylesheet, which was there from the start. It uses the names of the theme (`--paper`, `--orange`, `--title-font`), so it looks like the rest of the game.
- **It lets the mouse through** (`pointer-events: none`): the picture under it stays interactive.
- **A toast floats up and goes** (a CSS animation), and is taken off the page after its time; there are never more than five.
- **It is smaller on a small screen**: the same media query that folds the developer panel.

Open `tests.html`. You should see **654 passing tests**: 5 more.

## Step 6: The game

Now `main.js` puts it together. The changes go from the **bottom of the file to the top**, so that the line numbers hold.

In the last line of the developer mode, the one that exposes things to poke at from the console, add the goals (line 308). **Delete the line**, and add:

```js
    window.dev = { scene, body, world, sky, orbit, panel, look, shadows, flow, collection, trial, hud }; // for poking at from the console
```

In the developer panel, there is a new section above the world's. Find the line `title: "World",` (line 280). **Delete it and the line above it** (an opening brace), and add:

```js
        {
          title: "Goals",
          rows: [
            slider("flow window", flow.table, "window", 0.5, 6, 0.1),
            slider("flow steps", flow.table, "perStep", 1, 6, 1),
            slider("flow multiplier", flow.table, "maxMultiplier", 1, 12, 1),
            readout("score", () => String(flow.score)),
            readout("chain", () => `${flow.chain} (best ${flow.bestChain}), x${flow.multiplier}`),
            readout("tokens", () => `${collection.count} of ${collection.total}, worth ${collection.value}`),
            readout("trial", () => `${trial.state}, ${formatTime(trial.time)}, par ${formatTime(TRIAL.par)}`),
            action("Collect every token", () => collection.tokens.forEach((token) => collection.taken.add(token.id))),
            action("Go to the next checkpoint", () => {
              const target = trial.target || trial.checkpoints[0];
              body.placeAt(target.x, target.y + 0.05, target.z);
            }),
            action("Restart the trial", restartTrial),
          ],
        },
        {
          title: "World",
```

In the frame, flow needs a picture of the body before it moves, and everything to be told after. The two lines that read the keys and move the body (lines 176 to 177) are **replaced**. **Delete them**, and add:

```js
    const input = moveInput(heldKeys);
    const before = snapshot(body);
    body.update(started ? moveDirection(input, orbit.yaw) : null, input.sprint, dt, started && input.jump);
    if (started) updateGoals(before, dt);
```

Under the key that restarts the body, a key that restarts the trial. Find the line `if (event.code === "KeyR") body.reset();` (line 161) and add under it:

```js
    if (event.code === "KeyT" && !event.repeat && !typesText(event)) restartTrial();
```

And the goals themselves, created where the body is (line 134). **Delete the line**, and add:

```js
  const body = new Controller({ ...START, world, bounds: districtBounds(), ledges });

  // The goals: tokens to take, moves to score, a trial to run, and the display that shows them.
  const flow = new Flow();
  const collection = new Collection(tokenSpots());
  const trial = new Trial(trialCheckpoints());
  const hud = new Hud(document);
  const glow = (name, hex, alpha = 1) => {
    const material = new BABYLON.StandardMaterial(name, scene);
    material.emissiveColor = BABYLON.Color3.FromHexString(hex);
    material.diffuseColor = BABYLON.Color3.Black();
    material.specularColor = BABYLON.Color3.Black();
    material.alpha = alpha;
    return material;
  };
  const tokenMeshes = collection.tokens.map((token) => {
    const mesh = BABYLON.MeshBuilder.CreateSphere(token.id, { diameter: 0.55, segments: 8 }, scene);
    mesh.material = glow(`${token.id}-material`, TOKEN.kinds[token.kind].color);
    mesh.position.set(token.x, token.y + TOKEN_FLOAT, token.z);
    mesh.isPickable = false;
    return mesh;
  });
  // The beacon: a tall glow over the checkpoint to run to next.
  const beacon = BABYLON.MeshBuilder.CreateCylinder("beacon", { diameter: TRIAL.radius * 2, height: 9, tessellation: 24 }, scene);
  beacon.material = glow("beacon-material", "#ff7a1a", 0.28);
  beacon.isPickable = false;

  // A run of the trial begins again at the start, with the clock at zero. (The tokens that have been taken stay taken.)
  const restartTrial = () => {
    body.reset();
    trial.restart();
    flow.reset();
  };

  // What happens each frame to the goals, after the body has moved: the moves it made score, the tokens it is at are taken, the trial goes on, and the
  // display shows how things are.
  const updateGoals = (before, dt) => {
    const chain = flow.chain;
    for (const kind of moveEvents(before, body)) {
      const points = flow.add(kind);
      if (points >= 3) hud.toast(`+${points} ${kind}`);
    }
    if (flow.update(dt, body.speed) && flow.bestChain >= 3) hud.toast("flow lost");
    for (const token of collection.take(body)) {
      const points = flow.add("token", token.value);
      hud.toast(`+${points} token`);
    }
    if (comboMilestone(chain, flow.chain)) hud.banner(`${flow.chain} in a row`);
    for (const event of trial.update(body, dt)) {
      if (event.kind === "start") hud.toast("Go!");
      if (event.kind === "checkpoint") hud.toast(`${trial.checkpoints[event.index].name} ${formatTime(event.time)}`);
      if (event.kind === "finish") hud.toast(`Finish ${formatTime(event.time)}: ${event.medal}`, 4);
    }
    const seconds = performance.now() / 1000;
    tokenMeshes.forEach((mesh, i) => {
      const token = collection.tokens[i];
      mesh.setEnabled(!collection.has(token));
      mesh.position.y = token.y + TOKEN_FLOAT + Math.sin(seconds * 3 + i) * 0.12;
      mesh.rotation.y = seconds * 2 + i;
    });
    const target = trial.target;
    beacon.setEnabled(Boolean(target));
    if (target) beacon.position.set(target.x, target.y + 4.5, target.z);
    hud.set({ score: flow.score, multiplier: flow.multiplier, fraction: flow.fraction, tokens: collection.count, total: collection.total, trial });
  };
  updateGoals(snapshot(body), 0); // so that the display shows the goals before the first frame
```

The hint at the top of the page says what the keys are; add the new one. Find the line that begins `<div class="hint">` (line 26). **Delete it**, and add:

```html
  <div class="hint">WASD run &middot; Shift sprint &middot; Space jump, vault, climb, kick off a wall &middot; mouse look (click first, Esc lets go) &middot; R restart &middot; T run the trial &middot; C screenshot &middot; <a href="tests.html">Run tests</a></div>
```

Things to notice:

- **The banner is a milestone of the chain.** `updateGoals` remembers the chain at the start of the frame, and after the moves and the tokens asks `comboMilestone(chain, flow.chain)`: when it is true, `hud.banner` says how many in a row.
- **The goals are made where the body is**, and only need what is in scope: the scene, the body, the shadows are not needed, the display and the flow are plain.
- **`updateGoals` is called after the body has moved**, with the snapshot from before it: the events are the difference. It is only called once the game has started, so nothing scores behind the loading screen.
- **The tokens are drawn as glowing spheres**: an emissive colour, no lighting, so that they are as bright in the shade as in the sun. They spin and bob a little (the sine of the time and the index, so that they are not in step), and a token that has been taken is switched off.
- **The beacon is one mesh**: a tall, see-through cylinder that goes to the checkpoint to run to next, and is switched off when the run is over.
- **`T` is `restartTrial`**: the body goes back to the start, the trial to ready, the flow to nothing. The tokens that have been taken stay taken.
- **The developer panel changes the game's own numbers**: the flow sliders write to `FLOW`, so the next move is scored with them.

Open `tests.html`. You should see **654 passing tests**: 0 more (none: the game is not what the tests are about, and everything they say was said in the steps before).

## Step 7: Try it

Open the sample with **`?dev`**: `index.html?dev`. The runner is in the street, in front of three gold tokens that lead to a planter. The display at the top right says **0**, **x1**, **0 / 22 tokens**, and a block for the trial: *Round the block*, 0:00.0, and "Run to the medium roof, or press T".

- **Run through the three tokens.** Each is worth 5 points, and the second is worth the same and starts a chain: the **bar** under the score shows how long the chain has left, and the **x** next to the score goes up.
- **Run the trial.** The clock starts when you move off. The **orange beacon** shows where to go: the roof of the medium building, up its fire escape (the one to the right of the start), and onto the ledge, and the roof above it. Then the beacon is on the small roof beside it: jump the alley (the shortcut). Then the beacon is at the start again: jump off, and run home. At the end the display says the medal and your time. **T** runs it again.
- **Chain moves.** Vault a vent, climb a hut, kick off a wall, catch a ledge: each adds points, and a long chain is worth more. Stop for two seconds and it is gone. Every fifth move in a chain, the **Sick Combo** banner pops up.
- **Take the huts.** The token on top of a hut is worth the most (3 tokens' worth) and takes a jump and a climb.

Things to try in the developer panel:

- **Flow window** longer and it forgives; shorter and every move has to follow the last. **Flow steps** at 1 and the multiplier goes up on every move.
- **Collect every token** and see what a full set is worth. **Go to the next checkpoint** takes the runner to the gate that is next, to see it.
- **Restart the trial** does what **T** does.

## Step 8: Tests, all together

Open `tests.html`. You should see **654 passing tests**. The ones added in this step:

- **Flow**: the numbers of the table, every kind of move seen (with plain objects and with a real controller), the multiplier through twelve moves, the window, the end of a chain, style being worth more than counting, and the milestones of a combo.
- **Tokens**: each kind where it should be, each over something to stand on and not in a wall, taken once, the collection's value.
- **The trial**: the checkpoints from the plan, the gates, the medals, every rule of the state machine, the best time.
- **The routes**: every building reached by the bot, every crossing made, every token on a building that is reached, every hut climbed, every platform token on the path, what each shortcut saves, and the par against the bot's time.
- **The display**: times, the words of the trial block, the display on the page, and the Sick Combo banner.

## Recap: what you built

| What | Where |
|------|-------|
| The numbers of flow, and what each move is worth | `FLOW` in `flow.js` |
| The moves between two frames | `snapshot`, `moveEvents` |
| A chain and its multiplier | `Flow` |
| Tokens, from the plan | `TOKEN`, `tokenSpots` in `goals.js` |
| Taking them | `canTake`, `Collection` |
| A trial: checkpoints, gates, a medal | `trialCheckpoints`, `inGate`, `medalFor`, `Trial` |
| The district for a bot, and a climb | `districtWorld`, `playClimb` in `routes.js` |
| What the bot can reach | `reachable` |
| What a shortcut saves, and the trial's estimate | `shortcuts`, `trialEstimate` |
| A combo: a milestone of the chain | `comboMilestone` in `flow.js` |
| Words for the display | `formatTime`, `trialLines` in `hud.js` |
| The display, and the Sick Combo banner | `Hud`, `css/hud.css` |
| The goals in the game | `main.js` |

## Challenges

1. **A second trial.** Make another route (a table of checkpoints, and a par from the bot) that goes by the large buildings. Does a runner get gold? What does the bot say?
2. **Air time.** A long jump should be worth something. Count the seconds in the air (`airTime`) and give points when a body lands after more than a second: another event for `moveEvents`, with a test.
3. **Hidden tokens.** Add a kind that is only on a sill, or on a hut that is high. Let the bot prove it (it can't yet: a sill is hung from). What would the bot have to do?
4. **Ghost.** Keep the best run as a list of positions and draw it as a second runner while the player runs. Where does the list come from? (The bot is a person that never makes a mistake.)
5. **A chain that survives a fall.** Falling is not a move, so a fall that is long enough to lose the chain loses it. Make landing (after more than a second in the air) keep it alive for a moment.
6. **Weird numbers.** `FLOW.window` 0.4: what chains are possible? Which moves can still follow each other? Use the developer panel.
7. **Persist the best time.** `Trial.best` is lost when the page is closed. Where would you keep it, and how do you test that without a browser? (The next sample does this.)
