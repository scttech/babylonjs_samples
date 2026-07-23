QUnit.module("Hud counting", () => {
  QUnit.test("starts at zero score and startingLives lives (default 3)", (assert) => {
    const hud = new Hud();

    assert.strictEqual(hud.score, 0);
    assert.strictEqual(hud.lives, 3);
    assert.strictEqual(hud.startingLives, 3);
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

  QUnit.test("no control is created when ui is omitted", (assert) => {
    const hud = new Hud();

    assert.strictEqual(hud.panel, null);
    assert.strictEqual(hud.scoreLabel, null);
    assert.strictEqual(hud.livesLabel, null);
    assert.strictEqual(hud.resetButton, null);
    assert.strictEqual(hud.gameOverLabel, null);
  });

  QUnit.test("showGameOver()/hideGameOver() are no-ops when ui is omitted", (assert) => {
    const hud = new Hud();

    hud.showGameOver();
    hud.hideGameOver();

    assert.strictEqual(hud.gameOverLabel, null);
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

  QUnit.test("constructor attaches a panel with score/lives labels and a button when ui is provided", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.ok(hud.panel instanceof FakeControl, "panel is created");
    assert.true(ui.controls.includes(hud.panel), "panel is added to the ui");
    assert.ok(hud.scoreLabel instanceof FakeTextBlock, "score label is created");
    assert.ok(hud.livesLabel instanceof FakeTextBlock, "lives label is created");
    assert.ok(hud.resetButton instanceof FakeButton, "reset button is created");
    assert.true(hud.panel.children.includes(hud.scoreLabel), "score label is inside the panel");
    assert.true(hud.panel.children.includes(hud.livesLabel), "lives label is inside the panel");
    assert.true(hud.panel.children.includes(hud.resetButton), "button is inside the panel");
    assert.strictEqual(hud.scoreLabel.text, "Score: 0", "score label starts synced to the score");
    assert.strictEqual(hud.livesLabel.text, "Lives: 3", "lives label starts synced to the lives count");
  });

  QUnit.test("constructor adds a hidden Game Over label directly to ui, not the panel", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.ok(hud.gameOverLabel instanceof FakeTextBlock, "game over label is created");
    assert.true(ui.controls.includes(hud.gameOverLabel), "added directly to ui");
    assert.false(hud.panel.children.includes(hud.gameOverLabel), "not inside the top-pinned panel");
    assert.false(hud.gameOverLabel.isVisible, "hidden until showGameOver() is called");
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

  QUnit.test("clicking the reset button invokes onReset", (assert) => {
    const ui = new FakeUi();
    let resetCount = 0;
    const hud = new Hud({ ui, onReset: () => resetCount++ });

    hud.resetButton.onPointerUpObservable.notifyObservers();

    assert.strictEqual(resetCount, 1);
  });

  QUnit.test("dispose() removes and disposes the panel and the Game Over label", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    const panel = hud.panel;
    const gameOverLabel = hud.gameOverLabel;

    hud.dispose();

    assert.false(ui.controls.includes(panel), "panel removed from the ui");
    assert.true(panel.disposed, "panel.dispose() was called");
    assert.false(ui.controls.includes(gameOverLabel), "game over label removed from the ui");
    assert.true(gameOverLabel.disposed, "game over label.dispose() was called");
    assert.strictEqual(hud.panel, null);
    assert.strictEqual(hud.gameOverLabel, null);
  });

  QUnit.test("dispose() is a no-op when no panel exists", (assert) => {
    const hud = new Hud();

    hud.dispose();

    assert.strictEqual(hud.panel, null);
  });
});
