QUnit.module("Hud", () => {
  QUnit.test("starts with a score of 0", (assert) => {
    assert.strictEqual(new Hud().score, 0);
  });

  QUnit.test("addScore() accumulates points", (assert) => {
    const hud = new Hud();

    hud.addScore(20);
    hud.addScore(100);

    assert.strictEqual(hud.score, 120);
  });

  QUnit.test("resetScore() returns to 0", (assert) => {
    const hud = new Hud();
    hud.addScore(50);

    hud.resetScore();

    assert.strictEqual(hud.score, 0);
  });
});

// Rendering only needs a few `BABYLON.GUI` pieces to exist, so these tests
// stub them out instead of loading the real engine.
QUnit.module("Hud rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeTextBlock {
    text = "";
    disposed = false;

    dispose() {
      this.disposed = true;
    }
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
        TextBlock: FakeTextBlock,
        Control: { VERTICAL_ALIGNMENT_TOP: 0 },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("constructor adds a score label showing 0", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.strictEqual(ui.controls.length, 1);
    assert.strictEqual(hud.scoreLabel.text, "Score: 0");
  });

  QUnit.test("the label doesn't intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.scoreLabel.isHitTestVisible);
  });

  QUnit.test("addScore() and resetScore() keep the label in sync", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.addScore(150);
    assert.strictEqual(hud.scoreLabel.text, "Score: 150");

    hud.resetScore();
    assert.strictEqual(hud.scoreLabel.text, "Score: 0");
  });

  QUnit.test("dispose() removes and disposes the label", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    const label = hud.scoreLabel;

    hud.dispose();

    assert.true(label.disposed);
    assert.strictEqual(ui.controls.length, 0);
    assert.strictEqual(hud.scoreLabel, null);
  });

  QUnit.test("dispose() is a no-op when there's no label", (assert) => {
    const hud = new Hud();

    hud.dispose();

    assert.strictEqual(hud.scoreLabel, null);
  });
});
