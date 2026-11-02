// Building: the rule for whether a tower can be built, the way a podium is picked up from the tray (a
// state machine that tells a drag from a tap), and the act of building. None of it knows about the
// screen or the scene: places, costs and states go in, and answers and actions come out. See ../tests/build.tests.js.

// Whether a tower that costs `cost` can be built in a cell: the rules of placement, and then the money. The
// answer is { ok, reason } as in canBuild, with a reason that is a sentence.
function checkBuild(grid, col, row, taken, gold, cost) {
  const placement = canBuild(grid, col, row, taken);
  if (!placement.ok) return placement;
  if (gold < cost) return { ok: false, reason: `that costs ${cost}, and there is ${Math.floor(gold)}` };
  return { ok: true, reason: "" };
}

// Builds a tower, if it can be built: takes the money, makes the tower with `make(kind, col, row)` and adds it to
// `state.towers`. `state` is { grid, towers, wallet }, and each of the towers is anything with a `col` and a `row`.
// It gives back { ok, reason, tower }; if it did not build, there is no tower and nothing has been paid.
function tryBuild(state, kind, col, row, make, benders = BENDERS) {
  const cost = benders[kind].cost;
  const check = checkBuild(state.grid, col, row, state.towers, state.wallet.gold, cost);
  if (!check.ok) return { ...check, tower: null };
  state.wallet.spend(cost);
  const tower = make(kind, col, row);
  state.towers.push(tower);
  return { ok: true, reason: "", tower };
}

// How a podium is picked up. A press on the tray, and then either the finger moves a good way (a drag, and the
// podium goes where the finger is let go), or it doesn't (a tap, and the podium is *armed*: the next tap on the
// board puts it down). That is two ways to do one thing, and it is why it works with a mouse, a finger, and a
// finger that would rather not hold on.
//
//   idle --press--> pressing --move far--> dragging --release--> idle (placed, or not)
//                      '--release near--> armed --tap on board--> idle (placed) or armed (refused)
//   armed or dragging --cancel--> idle
class Builder {
  constructor(tapDistance = POINTER.tapDistance) {
    this.tapDistance = tapDistance;
    this.state = "idle";
    this.kind = null;
    this.start = null;
  }

  // The kind that is to be shown on the board, if any: one that is being dragged, or armed.
  get holding() {
    return this.state === "dragging" || this.state === "armed" ? this.kind : null;
  }

  // The pointer goes down on the tray, on the button for `kind`.
  press(kind, x, y) {
    this.state = "pressing";
    this.kind = kind;
    this.start = { x, y };
  }

  // The pointer moves. A press that moves far enough is a drag.
  move(x, y) {
    if (this.state === "pressing" && Math.hypot(x - this.start.x, y - this.start.y) > this.tapDistance) this.state = "dragging";
  }

  // The pointer is let go. `cell` is the cell it is over, or null, and `ok` whether a tower can go there. It says what
  // to do: "place", "arm" (it was a tap), or "cancel".
  release(cell, ok) {
    if (this.state === "pressing") {
      this.state = "armed";
      return "arm";
    }
    if (this.state === "dragging") {
      const place = !!cell && ok;
      this.cancel();
      return place ? "place" : "cancel";
    }
    return "cancel";
  }

  // A tap on the board while a podium is armed. A refusal leaves it armed, to try somewhere else.
  tap(cell, ok) {
    if (this.state !== "armed" || !cell) return "ignore";
    if (!ok) return "refuse";
    this.cancel();
    return "place";
  }

  // Puts the podium down, unused.
  cancel() {
    this.state = "idle";
    this.kind = null;
    this.start = null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { checkBuild, tryBuild, Builder };
} else {
  Object.assign(window, { checkBuild, tryBuild, Builder });
}
