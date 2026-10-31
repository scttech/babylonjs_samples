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
