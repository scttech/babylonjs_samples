// The hand: the part of the game that listens to the pointer and builds. It puts the pieces of this tutorial
// together. The tray says that a button was pressed; the builder says whether that was a drag or a tap; the pointing
// maths says which cell the pointer is over; the rules say whether a tower can go there; and the hand shows it (an
// outline that is red or green, a ring of how far the tower shoots, a podium held over the cell) and builds the
// tower. It also chooses a tower that is tapped, and shows its panel, and upgrades it or sells it when the panel
// says so. It is given everything it uses, and it is given plain events (`{ clientX, clientY, pointerType }`), not
// the browser's, so a test can press, drag and let go with no screen. See ../tests/hand.tests.js.

const HAND = {
  hover: 0.25, // how far above the ground a podium is held while it is carried, so that it looks lifted
  refusal: 1.8, // how many seconds the reason that a tower can't be built stays on the screen after a try
  pickHeights: [2, 1, 0], // how high above the ground to look for a tower that is tapped (its bender is taller than the cell is wide)
};

class Hand {
  // `parts`: { canvas, tray, panel, state, outline, ring, previews, extents, make }. `canvas` has a `getBoundingClientRect()`,
  // `tray` is a Tray, `panel` is a Panel, `state` is { grid, towers, wallet }, `outline` and `ring` are what shows the cell and the
  // range, `previews` has a node for each kind (a podium to hold), `extents()` says what the camera shows now, and
  // `make(kind, col, row)` makes a tower.
  constructor(parts, benders = BENDERS) {
    Object.assign(this, parts);
    this.benders = benders;
    this.builder = new Builder();
    this.messageLeft = 0;
    this.selected = null; // the tower that has been chosen, if one has
  }

  // The cell that the pointer is over, or null: the pointer has to be on the board's canvas (and not on the tray), and
  // a finger is taken to be a little above where it is, so that it doesn't cover the podium.
  cellUnder(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!isInside(rect, event.clientX, event.clientY)) return null;
    return cellAtPoint(rect, this.extents(), event.clientX, event.clientY, liftFor(event.pointerType));
  }

  // Whether the held kind can go in a cell, and if not why.
  check(kind, cell) {
    return checkBuild(this.state.grid, cell.col, cell.row, this.state.towers, this.state.wallet.gold, this.benders[kind].cost);
  }

  // The player did something that has a sound.
  hear(name) {
    if (this.sound) this.sound(name);
  }

  // Takes away what is shown on the board.
  clear() {
    this.outline.hide();
    this.ring.hide();
    for (const preview of Object.values(this.previews)) preview.node.setEnabled(false);
  }

  say(sentence, seconds) {
    this.tray.say(sentence);
    this.messageLeft = seconds;
  }

  // Shows the held podium over the cell the pointer is over, with an outline that says if a tower can go there.
  // Over nothing, nothing is shown.
  refresh(event) {
    const kind = this.builder.holding;
    const cell = kind && event ? this.cellUnder(event) : null;
    this.clear();
    if (!cell) return this.say("", 0);
    const { ok, reason } = this.check(kind, cell);
    const { x, z } = cellCenter(cell.col, cell.row);
    this.outline.show(cell.col, cell.row, ok);
    this.ring.show(x, z, this.benders[kind].range, this.benders[kind].color);
    this.previews[kind].node.position.set(x, HAND.hover, z);
    this.previews[kind].node.setEnabled(true);
    this.say(reason, Infinity);
  }

  // The tower that a place on the page is over, or null. A bender stands up out of its cell, so a tap on one is on the
  // screen above where its cell is: look for the cell at a few heights, the highest first, since what is highest is in front.
  towerUnder(event) {
    const rect = this.canvas.getBoundingClientRect();
    if (!isInside(rect, event.clientX, event.clientY)) return null;
    const share = toScreenShare(rect, event.clientX, event.clientY);
    for (const height of HAND.pickHeights) {
      const ground = groundAt(this.extents(), share, CAMERA, height);
      const cell = cellAt(ground.x, ground.z);
      const tower = cell && this.state.towers.find((t) => t.col === cell.col && t.row === cell.row);
      if (tower) return tower;
    }
    return null;
  }

  // Chooses a tower (or none): its range shows as a ring and its cell is outlined, and the panel comes up from the next frame.
  select(tower) {
    this.selected = tower;
    this.clear();
    if (!tower) return this.panel.hide();
    const { x, z } = cellCenter(tower.col, tower.row);
    this.outline.show(tower.col, tower.row, true);
    this.ring.show(x, z, tower.spec.range, tower.spec.color);
    this.showPanel();
  }

  // Shows the chosen tower in the panel, as it is now.
  showPanel() {
    const tower = this.selected;
    const base = this.benders[tower.kind];
    const next = LEVELS[tower.level];
    this.panel.show({
      name: base.name,
      color: base.color,
      level: tower.level,
      total: MAX_LEVEL,
      levelName: LEVELS[tower.level - 1].name,
      effect: describe(base.effect, tower.spec.potency || 1),
      nextName: next ? next.name : null,
      cost: upgradeCost(base, tower.level),
      refund: refundFor(base, tower.level),
      gold: this.state.wallet.gold,
    });
  }

  // The panel's button: makes the chosen tower better, if there is the gold, and says why not if there isn't.
  upgrade() {
    if (!this.selected) return null;
    const result = tryUpgrade(this.state, this.selected, this.benders);
    if (result.ok && this.stats) this.stats.count("upgraded");
    this.hear(result.ok ? "upgrade" : "refuse");
    if (result.ok) this.select(this.selected);
    else this.say(result.reason, HAND.refusal);
    return result;
  }

  // The panel's other button: sells the chosen tower, and takes it away.
  sell() {
    if (!this.selected) return null;
    const tower = this.selected;
    const result = trySell(this.state, tower, this.benders);
    this.select(null);
    if (result.ok) {
      if (this.stats) this.stats.count("sold");
      this.hear("sell");
      tower.dispose();
      this.tray.update(this.state.wallet.gold);
      this.say(`sold for ${result.refund}`, HAND.refusal);
    }
    return result;
  }

  // The pointer goes down on a button of the tray. Pressing the button of a podium that is armed puts it down again.
  // Whatever tower was chosen is put away: a podium is what the hand is for now.
  press(kind, point) {
    if (this.selected) this.select(null);
    if (this.builder.state === "armed" && this.builder.kind === kind) return this.cancel();
    this.builder.press(kind, point.x, point.y);
    this.tray.hold(kind);
    this.clear();
  }

  // The pointer moves.
  move(event) {
    this.builder.move(event.clientX, event.clientY);
    if (this.builder.holding) this.refresh(event);
  }

  // The pointer is let go, anywhere.
  release(event) {
    const kind = this.builder.kind;
    const before = this.builder.state;
    if (before === "pressing" || before === "dragging") {
      const cell = this.cellUnder(event);
      const refusal = cell ? this.check(kind, cell) : { ok: false, reason: "" };
      const action = this.builder.release(cell, refusal.ok);
      if (action === "arm") return this.refresh(null);
      this.tray.hold(null);
      if (action === "place") return this.build(kind, cell);
      this.clear();
      if (refusal.reason) this.hear("refuse");
      return this.say(refusal.reason, HAND.refusal);
    }
    if (before === "armed") {
      const cell = this.cellUnder(event);
      const refusal = cell ? this.check(kind, cell) : { ok: false, reason: "" };
      const action = this.builder.tap(cell, refusal.ok);
      if (action === "place") return this.build(kind, cell);
      if (action === "refuse") {
        this.refresh(event);
        this.hear("refuse");
        this.say(refusal.reason, HAND.refusal);
      }
      return;
    }
    // With nothing in the hand, a tap on a tower chooses it, and a tap on anything else puts it down.
    this.select(this.towerUnder(event));
  }

  // Builds the tower the hand holds, in a cell, and puts the hand down.
  build(kind, cell) {
    const result = tryBuild(this.state, kind, cell.col, cell.row, this.make, this.benders);
    if (result.ok && this.stats) this.stats.count("built");
    this.hear(result.ok ? "build" : "refuse");
    this.tray.hold(null);
    this.clear();
    this.tray.update(this.state.wallet.gold);
    this.say(result.reason, HAND.refusal);
    return result;
  }

  // Puts the podium down, unused, and the tower that was chosen, if one was (the Escape key does this).
  cancel() {
    this.builder.cancel();
    this.select(null);
    this.tray.hold(null);
    this.clear();
    this.say("", 0);
  }

  // Every frame: the outline fades towards its color, the gold is shown (and the chosen tower with it, which can be one that the gold
  // has just paid for), and a message that has been there long enough goes.
  update(dt) {
    this.outline.update(dt);
    this.tray.update(this.state.wallet.gold);
    if (this.selected) this.showPanel();
    if (this.messageLeft > 0 && this.messageLeft !== Infinity) {
      this.messageLeft -= dt;
      if (this.messageLeft <= 0) this.tray.say("");
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HAND, Hand };
} else {
  Object.assign(window, { HAND, Hand });
}
