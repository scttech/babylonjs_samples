// Drawing only needs a few `BABYLON.GUI` pieces to exist, so these tests stub them
// out instead of loading the real engine.
QUnit.module("Hud", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeTextBlock {
    text = "";
    isVisible = true;
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

  const scoreOf = (extra = {}) => ({ total: 0, distance: 0, coins: 0, combo: 0, multiplier: 1, ...extra });

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      GUI: {
        TextBlock: FakeTextBlock,
        Control: {
          VERTICAL_ALIGNMENT_TOP: 0,
          HORIZONTAL_ALIGNMENT_LEFT: 0,
        },
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("does nothing without a GUI to draw on", (assert) => {
    const hud = new Hud();

    hud.update(scoreOf({ total: 50 }));
    hud.dispose();

    assert.strictEqual(hud.scoreLabel, null);
  });

  QUnit.test("makes four labels on the GUI it is given", (assert) => {
    const ui = new FakeUi();

    new Hud({ ui });

    assert.strictEqual(ui.controls.length, 4);
  });

  QUnit.test("attachTo() works after the fact too", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud();

    hud.attachTo(ui);

    assert.strictEqual(ui.controls.length, 4);
    assert.strictEqual(hud.ui, ui);
  });

  QUnit.test("starts at zero, with no combo on show", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.strictEqual(hud.scoreLabel.text, "Score 0");
    assert.strictEqual(hud.distanceLabel.text, "0 m");
    assert.strictEqual(hud.coinsLabel.text, "Coins 0");
    assert.false(hud.comboLabel.isVisible);
  });

  QUnit.test("none of the labels intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    for (const label of [hud.scoreLabel, hud.distanceLabel, hud.coinsLabel, hud.comboLabel]) {
      assert.false(label.isHitTestVisible);
    }
  });

  QUnit.test("update() shows what the score says", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.update(scoreOf({ total: 345, distance: 120.8, coins: 7 }));

    assert.strictEqual(hud.scoreLabel.text, "Score 345");
    assert.strictEqual(hud.distanceLabel.text, "120 m");
    assert.strictEqual(hud.coinsLabel.text, "Coins 7");
  });

  QUnit.test("the combo shows while there is one, with its multiplier", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.update(scoreOf({ combo: 4, multiplier: 2 }));

    assert.true(hud.comboLabel.isVisible);
    assert.strictEqual(hud.comboLabel.text, "COMBO 4  x2");
  });

  QUnit.test("the combo goes away when it is lost", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    hud.update(scoreOf({ combo: 4, multiplier: 2 }));

    hud.update(scoreOf({ combo: 0 }));

    assert.false(hud.comboLabel.isVisible);
  });

  QUnit.test("dispose() removes and disposes every label", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    const labels = [...ui.controls];

    hud.dispose();

    assert.strictEqual(ui.controls.length, 0);
    assert.true(labels.every((label) => label.disposed));
    assert.strictEqual(hud.ui, null);
  });

  QUnit.test("dispose() twice is harmless", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.dispose();
    hud.dispose();

    assert.strictEqual(hud.scoreLabel, null);
  });
});
