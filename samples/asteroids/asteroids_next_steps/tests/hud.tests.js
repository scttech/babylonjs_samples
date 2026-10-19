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

  QUnit.test("remembers the lives it is told about", (assert) => {
    const hud = new Hud({ lives: 3 });
    assert.strictEqual(hud.lives, 3);

    hud.setLives(2);
    assert.strictEqual(hud.lives, 2);
  });

  QUnit.test("remembers the wave it is told about", (assert) => {
    const hud = new Hud();
    assert.strictEqual(hud.wave, 0);

    hud.setWave(4);
    assert.strictEqual(hud.wave, 4);
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

    assert.strictEqual(ui.controls.length, 8, "score, lives, wave, game over, announcement, title, paused, and ship choice");
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

  QUnit.test("shows the lives remaining", (assert) => {
    const hud = new Hud({ ui: new FakeUi(), lives: 3 });
    assert.strictEqual(hud.livesLabel.text, "Lives: 3");

    hud.setLives(1);
    assert.strictEqual(hud.livesLabel.text, "Lives: 1");
  });

  QUnit.test("the game over message starts hidden and can be shown and hidden", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.false(hud.gameOverLabel.isVisible, "hidden to begin with");

    hud.showGameOver();
    assert.true(hud.gameOverLabel.isVisible);

    hud.hideGameOver();
    assert.false(hud.gameOverLabel.isVisible);
  });

  QUnit.test("the game over message doesn't intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.gameOverLabel.isHitTestVisible);
  });

  QUnit.test("showing and hiding game over without a ui does nothing", (assert) => {
    const hud = new Hud();

    hud.showGameOver();
    hud.hideGameOver();

    assert.strictEqual(hud.gameOverLabel, null);
  });

    QUnit.test("shows the wave number, and nothing before the first wave", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.strictEqual(hud.waveLabel.text, "", "wave 0 shows nothing");

    hud.setWave(3);
    assert.strictEqual(hud.waveLabel.text, "Wave: 3");
  });

  QUnit.test("the announcement starts hidden, then shows the text it is given", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.false(hud.announcementLabel.isVisible, "hidden to begin with");

    hud.showAnnouncement("WAVE 2");
    assert.true(hud.announcementLabel.isVisible);
    assert.strictEqual(hud.announcementLabel.text, "WAVE 2");

    hud.hideAnnouncement();
    assert.false(hud.announcementLabel.isVisible);
  });

  QUnit.test("the announcement doesn't intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.announcementLabel.isHitTestVisible);
  });

  QUnit.test("announcing without a ui does nothing", (assert) => {
    const hud = new Hud();

    hud.showAnnouncement("WAVE 1");
    hud.hideAnnouncement();

    assert.strictEqual(hud.announcementLabel, null);
  });

  QUnit.test("the title screen and the paused message start hidden and can be shown and hidden", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.false(hud.titleLabel.isVisible, "title hidden to begin with");
    assert.false(hud.pausedLabel.isVisible, "paused hidden to begin with");

    hud.showTitle();
    hud.showPaused();
    assert.true(hud.titleLabel.isVisible);
    assert.true(hud.pausedLabel.isVisible);

    hud.hideTitle();
    hud.hidePaused();
    assert.false(hud.titleLabel.isVisible);
    assert.false(hud.pausedLabel.isVisible);
  });

  QUnit.test("the title screen invites the player to start", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.true(hud.titleLabel.text.includes("ASTEROIDS"));
    assert.true(hud.titleLabel.text.includes("Enter"));
  });

  QUnit.test("neither message intercepts pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.titleLabel.isHitTestVisible);
    assert.false(hud.pausedLabel.isHitTestVisible);
  });

  QUnit.test("showing the title or paused message without a ui does nothing", (assert) => {
    const hud = new Hud();

    hud.showTitle();
    hud.hideTitle();
    hud.showPaused();
    hud.hidePaused();

    assert.strictEqual(hud.titleLabel, null);
    assert.strictEqual(hud.pausedLabel, null);
  });

  QUnit.test("the ship choice starts hidden, then shows the name it is given", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });
    assert.false(hud.shipLabel.isVisible, "hidden to begin with");

    hud.showShipChoice("Fighter");
    assert.true(hud.shipLabel.isVisible);
    assert.true(hud.shipLabel.text.includes("Fighter"));

    hud.hideShipChoice();
    assert.false(hud.shipLabel.isVisible);
  });

  QUnit.test("the ship choice tells the player how to change it", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    hud.showShipChoice("Rocket");

    assert.true(hud.shipLabel.text.includes("arrow"));
  });

  QUnit.test("the ship choice doesn't intercept pointer events", (assert) => {
    const hud = new Hud({ ui: new FakeUi() });

    assert.false(hud.shipLabel.isHitTestVisible);
  });

  QUnit.test("choosing a ship without a ui does nothing", (assert) => {
    const hud = new Hud();

    hud.showShipChoice("Rocket");
    hud.hideShipChoice();

    assert.strictEqual(hud.shipLabel, null);
  });
});
