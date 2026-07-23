// On-screen score + lives + reset button + a Game Over overlay, following
// the same ui-optional split as Ball/SparkSystem/BrickGrid: `BABYLON` is
// only touched when a `ui` is supplied, so the counting logic can be tested
// directly and the controls can be tested by stubbing `BABYLON.GUI`. See
// ../tests/hud.tests.js.
//
// Unlike Ball/SparkSystem, the HUD lives in screen space pinned to the top
// of the canvas (via horizontalAlignment/verticalAlignment), not the
// center-origin coordinate space the ball and sparks move in. The Game Over
// label is the exception: it's added straight to `ui` rather than the
// top-pinned panel, so it keeps `BABYLON.GUI`'s default center/center
// alignment and shows up in the middle of the screen.
class Hud {
  constructor({ ui = null, onReset = () => {}, startingLives = 3 } = {}) {
    this.score = 0;
    this.startingLives = startingLives;
    this.lives = startingLives;
    this.onReset = onReset;

    this.ui = null;
    this.panel = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.resetButton = null;
    this.gameOverLabel = null;
    if (ui) {
      this.attachTo(ui);
    }
  }

  // Creates the HUD's controls (a vertical stack holding the score label,
  // lives label, and reset button, plus a separate centered Game Over label)
  // and adds them to `ui`. Only needed if `ui` wasn't already passed to the
  // constructor.
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

    this.livesLabel = new BABYLON.GUI.TextBlock();
    this.livesLabel.height = "24px";
    this.livesLabel.color = "white";
    this.livesLabel.fontSize = 16;
    this.livesLabel.outlineWidth = 4;
    this.livesLabel.outlineColor = "#202020";
    this.panel.addControl(this.livesLabel);

    this.resetButton = BABYLON.GUI.Button.CreateSimpleButton("resetButton", "Reset");
    this.resetButton.height = "36px";
    this.resetButton.color = "white";
    this.resetButton.background = "#33363d";
    this.resetButton.thickness = 0;
    this.resetButton.cornerRadius = 6;
    this.resetButton.onPointerUpObservable.add(() => this.onReset());
    this.panel.addControl(this.resetButton);

    this.gameOverLabel = new BABYLON.GUI.TextBlock();
    this.gameOverLabel.text = "Game Over";
    this.gameOverLabel.color = "white";
    this.gameOverLabel.fontSize = 48;
    this.gameOverLabel.outlineWidth = 6;
    this.gameOverLabel.outlineColor = "#202020";
    this.gameOverLabel.isVisible = false;
    this.ui.addControl(this.gameOverLabel);

    this._syncLabels();
    return this;
  }

  // Removes and disposes the HUD's controls, if attached.
  dispose() {
    if (!this.panel) return;
    this.ui.removeControl(this.panel);
    this.panel.dispose();
    this.ui.removeControl(this.gameOverLabel);
    this.gameOverLabel.dispose();
    this.ui = null;
    this.panel = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.resetButton = null;
    this.gameOverLabel = null;
  }

  // Adds points to the score and refreshes the label.
  recordScore(points) {
    this.score += points;
    this._syncLabels();
  }

  resetScore() {
    this.score = 0;
    this._syncLabels();
  }

  // Takes one life and refreshes the label. Shows the Game Over overlay once
  // lives reach 0. Returns the remaining life count, so callers can tell
  // whether the game just ended without checking `hud.lives` separately.
  loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    this._syncLabels();
    if (this.lives === 0) this.showGameOver();
    return this.lives;
  }

  // Restores lives to the starting count and hides the Game Over overlay --
  // a life-count reset always means the game is playable again.
  resetLives() {
    this.lives = this.startingLives;
    this._syncLabels();
    this.hideGameOver();
  }

  showGameOver() {
    if (this.gameOverLabel) this.gameOverLabel.isVisible = true;
  }

  hideGameOver() {
    if (this.gameOverLabel) this.gameOverLabel.isVisible = false;
  }

  _syncLabels() {
    if (this.scoreLabel) this.scoreLabel.text = `Score: ${this.score}`;
    if (this.livesLabel) this.livesLabel.text = `Lives: ${this.lives}`;
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
