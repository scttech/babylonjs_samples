// The heads-up display: the score, the distance, the coins and the combo, as text drawn
// over the picture with Babylon.js GUI. It only draws what a Score says, and it does
// nothing without a GUI to draw on (so the rest of the game, and the tests, can
// create one without Babylon.js). See ../tests/hud.tests.js.

// The game's two fonts, loaded in index.html. Sedgwick Ave Display is the graffiti
// lettering of the logo: good for big words and numbers, but thin, so it is not for small
// text. Bangers is its chunkier, more readable partner for everything small.
const FONT_TITLE = "Sedgwick Ave Display";
const FONT_SMALL = "Bangers";

// The text's sizes are written for a screen about 720 pixels high. The GUI can scale them to
// the screen it is on, by being told what height they were written for: on a screen half
// that high it draws everything at half size. But scaled right down, a short phone screen
// would make the text too small to read, and scaled right up a big monitor would make it
// huge, so the height it is told is held between these two.
const HUD_IDEAL_MIN = 480;
const HUD_IDEAL_MAX = 720;

// The height to tell the GUI its sizes were written for, on a screen `height` pixels high.
function idealHeightFor(height) {
  return Math.min(HUD_IDEAL_MAX, Math.max(HUD_IDEAL_MIN, height));
}

const HUD_COLOR = "white";
const HUD_OUTLINE = "#050508"; // a dark edge round the letters, so they show against the sky too

class Hud {
  constructor({ ui = null } = {}) {
    this.ui = null;
    this.scoreLabel = null;
    this.distanceLabel = null;
    this.coinsLabel = null;
    this.comboLabel = null;
    this.visible = true; // whether the labels are on show at all
    this.shown = { total: 0, distance: 0, coins: 0, combo: 0, multiplier: 1 }; // the last score drawn
    if (ui) this.attachTo(ui);
  }

  // Makes the labels and adds them to `ui`, an AdvancedDynamicTexture.
  attachTo(ui) {
    this.ui = ui;

    // The top-left corner holds three lines. The page's back button sits on top of the
    // canvas from y = 12 to about y = 46, and the text is scaled down on a small screen, so
    // they start well below it.
    this.scoreLabel = this._label({ top: "72px", fontSize: 38, font: FONT_TITLE });
    this.distanceLabel = this._label({ top: "124px", fontSize: 24, font: FONT_SMALL });
    this.coinsLabel = this._label({ top: "154px", fontSize: 24, font: FONT_SMALL });

    // The combo is in the middle, near the top, so it is hard to miss.
    this.comboLabel = this._label({ top: "72px", fontSize: 46, font: FONT_TITLE, centered: true });
    this.comboLabel.isVisible = false;

    this.update(this.shown);

    return this;
  }

  // One piece of text, set up the way they all are, in the given font. `centered` puts it
  // in the middle of the screen's width instead of the left edge.
  _label({ top, fontSize, font, centered = false }) {
    const label = new BABYLON.GUI.TextBlock();
    label.color = HUD_COLOR;
    label.fontFamily = font;
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
    this.shown = score;
    if (!this.scoreLabel) return;
    this.scoreLabel.text = `Score ${score.total}`;
    this.distanceLabel.text = `${Math.floor(score.distance)} m`;
    this.coinsLabel.text = `Coins ${score.coins}`;
    this.comboLabel.text = `COMBO ${score.combo}  x${score.multiplier}`;
    for (const label of [this.scoreLabel, this.distanceLabel, this.coinsLabel]) label.isVisible = this.visible;
    this.comboLabel.isVisible = this.visible && score.combo > 0;
  }

  // Shows or hides all the text, for a screen that has no use for it (the title).
  setVisible(visible) {
    this.visible = visible;
    this.update(this.shown);
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
  module.exports = { FONT_TITLE, FONT_SMALL, HUD_IDEAL_MIN, HUD_IDEAL_MAX, idealHeightFor, Hud };
} else {
  Object.assign(window, { FONT_TITLE, FONT_SMALL, HUD_IDEAL_MIN, HUD_IDEAL_MAX, idealHeightFor, Hud });
}
