// The heads-up display: the score, the distance, the coins and the combo, as text drawn
// over the picture with Babylon.js GUI. It only draws what a Score says, and it does
// nothing without a GUI to draw on (so the rest of the game, and the tests, can
// create one without Babylon.js). See ../tests/hud.tests.js.

const HUD_COLOR = "white";
const HUD_OUTLINE = "#050508"; // a dark edge round the letters, so they show against the sky too

class Hud {
  constructor({ ui = null } = {}) {
    this.ui = null;
    this.scoreLabel = null;
    this.distanceLabel = null;
    this.coinsLabel = null;
    this.comboLabel = null;
    if (ui) this.attachTo(ui);
  }
  // Makes the labels and adds them to `ui`, an AdvancedDynamicTexture.
  attachTo(ui) {
    this.ui = ui;

    // The top-left corner holds three lines. The page's back button sits on top of the
    // canvas from y = 12 to about y = 46, so they start below it.
    this.scoreLabel = this._label({ top: "56px", fontSize: 32 });
    this.distanceLabel = this._label({ top: "96px", fontSize: 22 });
    this.coinsLabel = this._label({ top: "124px", fontSize: 22 });

    // The combo is in the middle, near the top, so it is hard to miss.
    this.comboLabel = this._label({ top: "56px", fontSize: 40, centered: true });
    this.comboLabel.isVisible = false;

    this.update({ total: 0, distance: 0, coins: 0, combo: 0, multiplier: 1 });
    return this;
  }

  // One piece of text, set up the way they all are. `centered` puts it in the middle of
  // the screen's width instead of the left edge.
  _label({ top, fontSize, centered = false }) {
    const label = new BABYLON.GUI.TextBlock();
    label.color = HUD_COLOR;
    label.fontSize = fontSize;
    label.outlineWidth = 4;
    label.outlineColor = HUD_OUTLINE;
    label.top = top;
    label.height = fontSize + 12 + "px";
    label.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    if (!centered) {
      label.textHorizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
      label.paddingLeft = "20px";
    }
    // These labels span the width of the screen, so don't let them swallow pointer
    // events meant for the canvas underneath.
    label.isHitTestVisible = false;
    this.ui.addControl(label);
    return label;
  }

  // Shows what a Score says. The combo is only on screen while there is one.
  update(score) {
    if (!this.scoreLabel) return;
    this.scoreLabel.text = `Score ${score.total}`;
    this.distanceLabel.text = `${Math.floor(score.distance)} m`;
    this.coinsLabel.text = `Coins ${score.coins}`;
    this.comboLabel.isVisible = score.combo > 0;
    this.comboLabel.text = `COMBO ${score.combo}  x${score.multiplier}`;
  }

  // Removes and disposes the labels, if attached.
  dispose() {
    if (!this.ui) return;
    for (const label of [this.scoreLabel, this.distanceLabel, this.coinsLabel, this.comboLabel]) {
      this.ui.removeControl(label);
      label.dispose();
    }
    this.ui = null;
    this.scoreLabel = null;
    this.distanceLabel = null;
    this.coinsLabel = null;
    this.comboLabel = null;
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Hud };
} else {
  window.Hud = Hud;
}
