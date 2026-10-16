// On-screen score + lives + level + reset button, plus two centered
// overlays (Game Over and You Win), following the same ui-optional split as
// Ball/SparkSystem/BrickGrid: `BABYLON` is only touched when a `ui` is
// supplied, so the counting logic can be tested directly and the controls
// can be tested by stubbing `BABYLON.GUI`. See ../tests/hud.tests.js.
//
// Unlike Ball/SparkSystem, the HUD lives in screen space pinned to the top
// of the canvas (via horizontalAlignment/verticalAlignment), not the
// center-origin coordinate space the ball and sparks move in. The two
// overlay labels are the exception: they're added straight to `ui` rather
// than the top-pinned panel, so they keep `BABYLON.GUI`'s default
// center/center alignment and show up in the middle of the screen.
class Hud {
  constructor({ ui = null, onReset = () => {}, startingLives = 3 } = {}) {
    this.score = 0;
    this.startingLives = startingLives;
    this.lives = startingLives;
    this.level = 1;
    this.onReset = onReset;

    this.ui = null;
    this.panel = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.levelLabel = null;
    this.resetButton = null;
    this.gameOverLabel = null;
    this.winLabel = null;
    if (ui) {
      this.attachTo(ui);
    }
  }

  // Creates the HUD's controls (a vertical stack holding the score, lives,
  // and level labels plus a reset button, and two separate centered overlay
  // labels) and adds them to `ui`. Only needed if `ui` wasn't already passed
  // to the constructor.
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

    this.levelLabel = new BABYLON.GUI.TextBlock();
    this.levelLabel.height = "24px";
    this.levelLabel.color = "white";
    this.levelLabel.fontSize = 16;
    this.levelLabel.outlineWidth = 4;
    this.levelLabel.outlineColor = "#202020";
    this.panel.addControl(this.levelLabel);

    this.resetButton = BABYLON.GUI.Button.CreateSimpleButton("resetButton", "Reset");
    this.resetButton.height = "36px";
    this.resetButton.color = "white";
    this.resetButton.background = "#33363d";
    this.resetButton.thickness = 0;
    this.resetButton.cornerRadius = 6;
    this.resetButton.onPointerUpObservable.add(() => this.onReset());
    this.panel.addControl(this.resetButton);

    this.gameOverLabel = this._createOverlayLabel("Game Over", "white");
    this.winLabel = this._createOverlayLabel("You Win!", "#ffd54f");

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
    this.ui.removeControl(this.winLabel);
    this.winLabel.dispose();
    this.ui = null;
    this.panel = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.levelLabel = null;
    this.resetButton = null;
    this.gameOverLabel = null;
    this.winLabel = null;
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

  // Sets the displayed level number (1-based) and refreshes the label.
  setLevel(level) {
    this.level = level;
    this._syncLabels();
  }

  showGameOver() {
    if (this.gameOverLabel) this.gameOverLabel.isVisible = true;
  }

  hideGameOver() {
    if (this.gameOverLabel) this.gameOverLabel.isVisible = false;
  }

  showWin() {
    if (this.winLabel) this.winLabel.isVisible = true;
  }

  hideWin() {
    if (this.winLabel) this.winLabel.isVisible = false;
  }

  _syncLabels() {
    if (this.scoreLabel) this.scoreLabel.text = `Score: ${this.score}`;
    if (this.livesLabel) this.livesLabel.text = `Lives: ${this.lives}`;
    if (this.levelLabel) this.levelLabel.text = `Level: ${this.level}`;
  }

  _createOverlayLabel(text, color) {
    const label = new BABYLON.GUI.TextBlock();
    label.text = text;
    label.color = color;
    label.fontSize = 48;
    label.outlineWidth = 6;
    label.outlineColor = "#202020";
    label.isVisible = false;
    // A TextBlock with no explicit width/height defaults to 100% of its
    // parent -- here, the full screen. Without this, the moment a label
    // becomes visible it silently intercepts every pointer event on top of
    // it, including clicks on the Reset button, even though only its
    // centered text is actually drawn.
    label.isHitTestVisible = false;
    this.ui.addControl(label);
    return label;
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
