// On-screen score, following the same ui-optional split as the Breakout
// series' Hud: `BABYLON` is only touched when a `ui` is supplied, so the
// counting logic can be tested directly and the label can be tested by
// stubbing `BABYLON.GUI`. See ../tests/hud.tests.js.
//
// The ship, bullets, and rocks are 3D meshes in the world; this is a 2D GUI
// layer drawn on top of them, pinned to the top of the canvas.
class Hud {
  constructor({ ui = null } = {}) {
    this.score = 0;

    this.ui = null;
    this.scoreLabel = null;
    if (ui) {
      this.attachTo(ui);
    }
  }

  // Creates the score label and adds it to `ui`. Only needed if `ui` wasn't
  // already passed to the constructor.
  attachTo(ui) {
    this.ui = ui;

    this.scoreLabel = new BABYLON.GUI.TextBlock();
    this.scoreLabel.height = "30px";
    this.scoreLabel.color = "white";
    this.scoreLabel.fontSize = 24;
    this.scoreLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    // Clears the fixed-position HTML back-button/hint bar (see sample.css),
    // which sits on top of the canvas from y=12px to roughly y=42px.
    this.scoreLabel.top = "56px";
    // The label spans the full width of the screen, so don't let it swallow
    // pointer events meant for the canvas underneath.
    this.scoreLabel.isHitTestVisible = false;
    this.ui.addControl(this.scoreLabel);

    this._syncLabel();
    return this;
  }

  // Removes and disposes the label, if attached.
  dispose() {
    if (!this.scoreLabel) return;
    this.ui.removeControl(this.scoreLabel);
    this.scoreLabel.dispose();
    this.ui = null;
    this.scoreLabel = null;
  }

  // Adds points to the score and refreshes the label.
  addScore(points) {
    this.score += points;
    this._syncLabel();
  }

  resetScore() {
    this.score = 0;
    this._syncLabel();
  }

  _syncLabel() {
    if (!this.scoreLabel) return;
    this.scoreLabel.text = `Score: ${this.score}`;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = Hud;
} else {
  window.Hud = Hud;
}
