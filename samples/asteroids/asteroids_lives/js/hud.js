// On-screen score, following the same ui-optional split as the Breakout
// series' Hud: `BABYLON` is only touched when a `ui` is supplied, so the
// counting logic can be tested directly and the label can be tested by
// stubbing `BABYLON.GUI`. See ../tests/hud.tests.js.
//
// The ship, bullets, and rocks are 3D meshes in the world; this is a 2D GUI
// layer drawn on top of them, pinned to the top of the canvas.
class Hud {
  constructor({ ui = null, lives = 0 } = {}) {
    this.score = 0;
    this.lives = lives;

    this.ui = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.gameOverLabel = null;
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

    this.livesLabel = new BABYLON.GUI.TextBlock();
    this.livesLabel.height = "30px";
    this.livesLabel.color = "white";
    this.livesLabel.fontSize = 24;
    this.livesLabel.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    this.livesLabel.top = "86px"; // just below the score
    this.livesLabel.isHitTestVisible = false;
    this.ui.addControl(this.livesLabel);

    // A TextBlock keeps the GUI's default center alignment unless told
    // otherwise, so this lands in the middle of the screen. The \n starts a
    // second line.
    this.gameOverLabel = new BABYLON.GUI.TextBlock();
    this.gameOverLabel.text = "GAME OVER\nPress R to restart";
    this.gameOverLabel.color = "white";
    this.gameOverLabel.fontSize = 48;
    this.gameOverLabel.outlineWidth = 6;
    this.gameOverLabel.outlineColor = "#050508";
    this.gameOverLabel.isVisible = false;
    this.gameOverLabel.isHitTestVisible = false;
    this.ui.addControl(this.gameOverLabel);

    this._syncLabel();
    return this;
  }

  // Removes and disposes the labels, if attached.
  dispose() {
    if (!this.scoreLabel) return;
    for (const label of [this.scoreLabel, this.livesLabel, this.gameOverLabel]) {
      this.ui.removeControl(label);
      label.dispose();
    }
    this.ui = null;
    this.scoreLabel = null;
    this.livesLabel = null;
    this.gameOverLabel = null;
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

  // Shows how many lives are left.
  setLives(lives) {
    this.lives = lives;
    this._syncLabel();
  }

  showGameOver() {
    if (this.gameOverLabel) this.gameOverLabel.isVisible = true;
  }

  hideGameOver() {
    if (this.gameOverLabel) this.gameOverLabel.isVisible = false;
  }

  _syncLabel() {
    if (!this.scoreLabel) return;
    this.scoreLabel.text = `Score: ${this.score}`;
    this.livesLabel.text = `Lives: ${this.lives}`;
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
