// On-screen score + reset button, following the same ui-optional split as
// Ball/SparkSystem/BrickGrid: `BABYLON` is only touched when a `ui` is
// supplied, so the counting logic can be tested directly and the controls
// can be tested by stubbing `BABYLON.GUI`. See ../tests/hud.tests.js.
//
// The bounce counter earlier samples in this series had is gone -- now that
// bricks give the player an actual score to chase, a running wall/paddle
// bounce tally next to it was just noise.
//
// Unlike Ball/SparkSystem, the HUD lives in screen space pinned to the top
// of the canvas (via horizontalAlignment/verticalAlignment), not the
// center-origin coordinate space the ball and sparks move in.
class Hud {
  constructor({ ui = null, onReset = () => {} } = {}) {
    this.score = 0;
    this.onReset = onReset;

    this.ui = null;
    this.panel = null;
    this.scoreLabel = null;
    this.resetButton = null;
    if (ui) {
      this.attachTo(ui);
    }
  }

  // Creates the HUD's controls (a vertical stack holding the score label and
  // reset button) and adds them to `ui`. Only needed if `ui` wasn't already
  // passed to the constructor.
  attachTo(ui) {
    this.ui = ui;

    this.panel = new BABYLON.GUI.StackPanel();
    this.panel.isVertical = true;
    this.panel.spacing = 8;
    this.panel.width = "160px";
    this.panel.adaptHeightToChildren = true;
    this.panel.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
    this.panel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    // Clears the fixed-position HTML back-button/hint bar (see sample.css),
    // which sits on top of the canvas from y=12px to roughly y=42px.
    this.panel.top = "56px";
    this.ui.addControl(this.panel);

    this.scoreLabel = new BABYLON.GUI.TextBlock();
    this.scoreLabel.height = "30px";
    this.scoreLabel.color = "white";
    this.scoreLabel.fontSize = 22;
    this.scoreLabel.outlineWidth = 4;
    this.scoreLabel.outlineColor = "#202020";
    this.panel.addControl(this.scoreLabel);

    this.resetButton = BABYLON.GUI.Button.CreateSimpleButton("resetButton", "Reset");
    this.resetButton.height = "36px";
    this.resetButton.color = "white";
    this.resetButton.background = "#33363d";
    this.resetButton.thickness = 0;
    this.resetButton.cornerRadius = 6;
    this.resetButton.onPointerUpObservable.add(() => this.onReset());
    this.panel.addControl(this.resetButton);

    this._syncLabel();
    return this;
  }

  // Removes and disposes the HUD's controls, if attached.
  dispose() {
    if (!this.panel) return;
    this.ui.removeControl(this.panel);
    this.panel.dispose();
    this.ui = null;
    this.panel = null;
    this.scoreLabel = null;
    this.resetButton = null;
  }

  // Adds points to the score and refreshes the label.
  recordScore(points) {
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
