QUnit.module("Hud counting", () => {
  QUnit.test("starts at zero score, startingLives lives (default 3), and level 1", (assert) => {
    const hud = new Hud();

    assert.strictEqual(hud.score, 0);
    assert.strictEqual(hud.lives, 3);
    assert.strictEqual(hud.startingLives, 3);
    assert.strictEqual(hud.level, 1);
  });

  QUnit.test("accepts a startingLives override", (assert) => {
    const hud = new Hud({ startingLives: 5 });

    assert.strictEqual(hud.lives, 5);
    assert.strictEqual(hud.startingLives, 5);
  });

  QUnit.test("recordScore() adds points to the score", (assert) => {
    const hud = new Hud();

    hud.recordScore(50);
    hud.recordScore(30);

    assert.strictEqual(hud.score, 80);
  });

  QUnit.test("resetScore() zeroes the score", (assert) => {
    const hud = new Hud();
    hud.recordScore(50);

    hud.resetScore();

    assert.strictEqual(hud.score, 0);
  });

  QUnit.test("loseLife() decrements lives and returns the remaining count", (assert) => {
    const hud = new Hud({ startingLives: 3 });

    const remaining = hud.loseLife();

    assert.strictEqual(remaining, 2);
    assert.strictEqual(hud.lives, 2);
  });

  QUnit.test("loseLife() never drops lives below 0", (assert) => {
    const hud = new Hud({ startingLives: 1 });

    hud.loseLife();
    const remaining = hud.loseLife();

    assert.strictEqual(remaining, 0);
    assert.strictEqual(hud.lives, 0);
  });

  QUnit.test("resetLives() restores lives to startingLives", (assert) => {
    const hud = new Hud({ startingLives: 3 });
    hud.loseLife();
    hud.loseLife();

    hud.resetLives();

    assert.strictEqual(hud.lives, 3);
  });

  QUnit.test("addLife() increments lives", (assert) => {
    const hud = new Hud({ startingLives: 3 });

    hud.addLife();

    assert.strictEqual(hud.lives, 4);
  });

  QUnit.test("setLevel() updates the level", (assert) => {
    const hud = new Hud();

    hud.setLevel(2);

    assert.strictEqual(hud.level, 2);
  });

  QUnit.test("no control is created when ui is omitted", (assert) => {
    const hud = new Hud();

    assert.strictEqual(hud.panel, null);
    assert.strictEqual(hud.scoreLabel, null);
    assert.strictEqual(hud.livesLabel, null);
    assert.strictEqual(hud.levelLabel, null);
    assert.strictEqual(hud.resetButton, null);
    assert.strictEqual(hud.startLabel, null);
    assert.strictEqual(hud.pauseLabel, null);
    assert.strictEqual(hud.gameOverLabel, null);
    assert.strictEqual(hud.winLabel, null);
  });

  QUnit.test("show*()/hide*() overlay toggles are no-ops when ui is omitted", (assert) => {
    const hud = new Hud();

    hud.showStart();
    hud.hideStart();
    hud.showPause();
    hud.hidePause();
    hud.showGameOver();
    hud.hideGameOver();
    hud.showWin();
    hud.hideWin();

    assert.strictEqual(hud.startLabel, null);
    assert.strictEqual(hud.pauseLabel, null);
    assert.strictEqual(hud.gameOverLabel, null);
    assert.strictEqual(hud.winLabel, null);
  });
});

// Rendering (attachTo/dispose/label sync/reset button) only needs a handful
// of `BABYLON.GUI` pieces to exist, so these tests stub them out instead of
// loading the real engine.
QUnit.module("Hud rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeObservable {
    constructor() {
      this.callbacks = [];
    }
    add(callback) {
      this.callbacks.push(callback);
    }
    notifyObservers() {
      for (const callback of this.callbacks) callback();
    }
  }

  class FakeControl {
    children = [];
    disposed = false;
    isVisible = true;
    isHitTestVisible = true;

    addControl(child) {
      this.children.push(child);
    }
    dispose() {
      this.disposed = true;
    }
  }

  class FakeTextBlock extends FakeControl {
    text = "";
  }

  class FakeButton extends FakeControl {
    onPointerUpObservable = new FakeObservable();
  }

  class FakeUi {
    controls = [];

    addControl(control) {
      this.controls.push(control);
    }
    removeControl(control) {
      this.controls = this.controls.filter((c) => c !== control);
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      GUI: {
        StackPanel: FakeControl,
        TextBlock: FakeTextBlock,
        Button: {
          CreateSimpleButton: () => new FakeButton(),
        },
        Control: {
          HORIZONTAL_ALIGNMENT_CENTER: "center",
          VERTICAL_ALIGNMENT_TOP: "top",
        },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("constructor attaches a panel with score/lives/level labels and a button when ui is provided", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.ok(hud.panel instanceof FakeControl, "panel is created");
    assert.true(ui.controls.includes(hud.panel), "panel is added to the ui");
    assert.ok(hud.scoreLabel instanceof FakeTextBlock, "score label is created");
    assert.ok(hud.livesLabel instanceof FakeTextBlock, "lives label is created");
    assert.ok(hud.levelLabel instanceof FakeTextBlock, "level label is created");
    assert.ok(hud.resetButton instanceof FakeButton, "reset button is created");
    assert.true(hud.panel.children.includes(hud.scoreLabel), "score label is inside the panel");
    assert.true(hud.panel.children.includes(hud.livesLabel), "lives label is inside the panel");
    assert.true(hud.panel.children.includes(hud.levelLabel), "level label is inside the panel");
    assert.true(hud.panel.children.includes(hud.resetButton), "button is inside the panel");
    assert.strictEqual(hud.scoreLabel.text, "Score: 0", "score label starts synced to the score");
    assert.strictEqual(hud.livesLabel.text, "Lives: 3", "lives label starts synced to the lives count");
    assert.strictEqual(hud.levelLabel.text, "Level: 1", "level label starts synced to the level");
  });

  QUnit.test("constructor adds Game Over and Win labels directly to ui, hidden, not the panel", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.ok(hud.gameOverLabel instanceof FakeTextBlock, "game over label is created");
    assert.ok(hud.winLabel instanceof FakeTextBlock, "win label is created");
    assert.true(ui.controls.includes(hud.gameOverLabel), "game over label added directly to ui");
    assert.true(ui.controls.includes(hud.winLabel), "win label added directly to ui");
    assert.false(hud.panel.children.includes(hud.gameOverLabel), "not inside the top-pinned panel");
    assert.false(hud.panel.children.includes(hud.winLabel), "not inside the top-pinned panel");
    assert.false(hud.gameOverLabel.isVisible, "hidden until showGameOver() is called");
    assert.false(hud.winLabel.isVisible, "hidden until showWin() is called");
    assert.false(
      hud.gameOverLabel.isHitTestVisible,
      "never intercepts pointer events -- a TextBlock with no explicit width/height defaults to " +
        "100% of the screen, which would otherwise swallow clicks on the Reset button underneath " +
        "it the moment it becomes visible"
    );
    assert.false(hud.winLabel.isHitTestVisible, "same reasoning as gameOverLabel");
  });

  QUnit.test("constructor adds a Start label directly to ui, visible by default", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.ok(hud.startLabel instanceof FakeTextBlock, "start label is created");
    assert.true(ui.controls.includes(hud.startLabel), "added directly to ui");
    assert.false(hud.panel.children.includes(hud.startLabel), "not inside the top-pinned panel");
    assert.true(hud.startLabel.isVisible, "shown up front -- it's the only overlay visible before the first click");
    assert.false(hud.startLabel.isHitTestVisible, "never intercepts pointer events (same reasoning as gameOverLabel)");
  });

  QUnit.test("constructor adds a hidden Pause label directly to ui, not the panel", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.ok(hud.pauseLabel instanceof FakeTextBlock, "pause label is created");
    assert.true(ui.controls.includes(hud.pauseLabel), "added directly to ui");
    assert.false(hud.panel.children.includes(hud.pauseLabel), "not inside the top-pinned panel");
    assert.false(hud.pauseLabel.isVisible, "hidden until showPause() is called");
    assert.false(hud.pauseLabel.isHitTestVisible, "never intercepts pointer events (same reasoning as gameOverLabel)");
  });

  QUnit.test("showStart()/hideStart() toggle the start label's visibility", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    hud.hideStart(); // constructor already showed it

    assert.false(hud.startLabel.isVisible);

    hud.showStart();
    assert.true(hud.startLabel.isVisible);
  });

  QUnit.test("showPause()/hidePause() toggle the pause label's visibility", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    hud.showPause();
    assert.true(hud.pauseLabel.isVisible);

    hud.hidePause();
    assert.false(hud.pauseLabel.isVisible);
  });

  QUnit.test("addLife() updates the lives label text", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui, startingLives: 3 });

    hud.addLife();

    assert.strictEqual(hud.livesLabel.text, "Lives: 4");
  });

  QUnit.test("recordScore() updates the score label text", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    hud.recordScore(50);
    hud.recordScore(30);

    assert.strictEqual(hud.scoreLabel.text, "Score: 80");
  });

  QUnit.test("resetScore() updates the score label text", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    hud.recordScore(50);

    hud.resetScore();

    assert.strictEqual(hud.scoreLabel.text, "Score: 0");
  });

  QUnit.test("loseLife() updates the lives label text", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    hud.loseLife();

    assert.strictEqual(hud.livesLabel.text, "Lives: 2");
  });

  QUnit.test("loseLife() shows the Game Over label once lives reach 0", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui, startingLives: 1 });

    hud.loseLife();

    assert.true(hud.gameOverLabel.isVisible);
  });

  QUnit.test("loseLife() leaves the Game Over label hidden while lives remain", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui, startingLives: 3 });

    hud.loseLife();

    assert.false(hud.gameOverLabel.isVisible);
  });

  QUnit.test("resetLives() updates the lives label and hides the Game Over label", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui, startingLives: 1 });
    hud.loseLife(); // triggers game over

    hud.resetLives();

    assert.strictEqual(hud.livesLabel.text, "Lives: 1");
    assert.false(hud.gameOverLabel.isVisible, "resetting lives always hides Game Over");
  });

  QUnit.test("setLevel() updates the level label text", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    hud.setLevel(3);

    assert.strictEqual(hud.levelLabel.text, "Level: 3");
  });

  QUnit.test("showWin()/hideWin() toggle the win label's visibility", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    hud.showWin();
    assert.true(hud.winLabel.isVisible);

    hud.hideWin();
    assert.false(hud.winLabel.isVisible);
  });

  QUnit.test("clicking the reset button invokes onReset", (assert) => {
    const ui = new FakeUi();
    let resetCount = 0;
    const hud = new Hud({ ui, onReset: () => resetCount++ });

    hud.resetButton.onPointerUpObservable.notifyObservers();

    assert.strictEqual(resetCount, 1);
  });

  QUnit.test("dispose() removes and disposes the panel and all four overlay labels", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    const panel = hud.panel;
    const overlays = { startLabel: hud.startLabel, pauseLabel: hud.pauseLabel, gameOverLabel: hud.gameOverLabel, winLabel: hud.winLabel };

    hud.dispose();

    assert.false(ui.controls.includes(panel), "panel removed from the ui");
    assert.true(panel.disposed, "panel.dispose() was called");
    for (const [name, label] of Object.entries(overlays)) {
      assert.false(ui.controls.includes(label), `${name} removed from the ui`);
      assert.true(label.disposed, `${name}.dispose() was called`);
      assert.strictEqual(hud[name], null);
    }
    assert.strictEqual(hud.panel, null);
  });

  QUnit.test("dispose() is a no-op when no panel exists", (assert) => {
    const hud = new Hud();

    hud.dispose();

    assert.strictEqual(hud.panel, null);
  });
});
