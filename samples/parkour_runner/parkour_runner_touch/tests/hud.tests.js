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

  QUnit.test("the score and the combo are in the graffiti font, and the small lines in the plainer one", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.strictEqual(hud.scoreLabel.fontFamily, FONT_TITLE);
    assert.strictEqual(hud.comboLabel.fontFamily, FONT_TITLE);
    assert.strictEqual(hud.distanceLabel.fontFamily, FONT_SMALL);
    assert.strictEqual(hud.coinsLabel.fontFamily, FONT_SMALL);
  });

  QUnit.test("the two fonts are different, and named as index.html loads them", (assert) => {
    assert.notStrictEqual(FONT_TITLE, FONT_SMALL);
    assert.strictEqual(FONT_TITLE, "Sedgwick Ave Display");
    assert.strictEqual(FONT_SMALL, "Bangers");
  });

  QUnit.test("setVisible(false) hides every label, and setVisible(true) brings them back", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    hud.update(scoreOf({ combo: 4, multiplier: 2 }));

    hud.setVisible(false);
    for (const label of [hud.scoreLabel, hud.distanceLabel, hud.coinsLabel, hud.comboLabel]) assert.false(label.isVisible);

    hud.setVisible(true);
    for (const label of [hud.scoreLabel, hud.distanceLabel, hud.coinsLabel, hud.comboLabel]) assert.true(label.isVisible);
  });

  QUnit.test("while hidden, an update changes the text but shows nothing, not even the combo", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    hud.setVisible(false);

    hud.update(scoreOf({ total: 77, combo: 3, multiplier: 2 }));

    assert.strictEqual(hud.scoreLabel.text, "Score 77");
    assert.false(hud.scoreLabel.isVisible);
    assert.false(hud.comboLabel.isVisible);
  });

  QUnit.test("setVisible() before there is anything to draw on does nothing, and the labels follow it once there is", (assert) => {
    const hud = new Hud();

    hud.setVisible(false);
    hud.attachTo(new FakeUi());

    assert.false(hud.scoreLabel.isVisible);
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

QUnit.module("idealHeightFor", () => {
  QUnit.test("a screen between the limits is told its own height, so the text is its written size", (assert) => {
    assert.strictEqual(idealHeightFor(600), 600);
    assert.strictEqual(idealHeightFor(HUD_IDEAL_MIN), HUD_IDEAL_MIN);
    assert.strictEqual(idealHeightFor(HUD_IDEAL_MAX), HUD_IDEAL_MAX);
  });

  QUnit.test("a short screen is told no less than the minimum, so the text can't shrink to nothing", (assert) => {
    assert.strictEqual(idealHeightFor(320), HUD_IDEAL_MIN);
    assert.strictEqual(idealHeightFor(0), HUD_IDEAL_MIN);
  });

  QUnit.test("a tall screen is told no more than the maximum, so the text is only a little bigger", (assert) => {
    assert.strictEqual(idealHeightFor(1440), HUD_IDEAL_MAX);
  });

  QUnit.test("on a phone 320 pixels high the text is drawn at two thirds of its size, and not smaller", (assert) => {
    const scale = 320 / idealHeightFor(320); // the GUI draws at the screen's height over the height it is told

    assert.true(Math.abs(scale - 2 / 3) < 1e-9);
  });
});
