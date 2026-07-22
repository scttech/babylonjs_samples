QUnit.module("Hud counting", () => {
  QUnit.test("starts at zero bounces", (assert) => {
    const hud = new Hud();

    assert.strictEqual(hud.bounces, 0);
  });

  QUnit.test("recordBounce() increments the count", (assert) => {
    const hud = new Hud();

    hud.recordBounce();
    hud.recordBounce();
    hud.recordBounce();

    assert.strictEqual(hud.bounces, 3);
  });

  QUnit.test("resetBounceCount() zeroes the count", (assert) => {
    const hud = new Hud();
    hud.recordBounce();
    hud.recordBounce();

    hud.resetBounceCount();

    assert.strictEqual(hud.bounces, 0);
  });

  QUnit.test("no control is created when ui is omitted", (assert) => {
    const hud = new Hud();

    assert.strictEqual(hud.panel, null);
    assert.strictEqual(hud.countLabel, null);
    assert.strictEqual(hud.resetButton, null);
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

  QUnit.test("constructor attaches a panel with a label and a button when ui is provided", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    assert.ok(hud.panel instanceof FakeControl, "panel is created");
    assert.true(ui.controls.includes(hud.panel), "panel is added to the ui");
    assert.ok(hud.countLabel instanceof FakeTextBlock, "count label is created");
    assert.ok(hud.resetButton instanceof FakeButton, "reset button is created");
    assert.true(hud.panel.children.includes(hud.countLabel), "label is inside the panel");
    assert.true(hud.panel.children.includes(hud.resetButton), "button is inside the panel");
    assert.strictEqual(hud.countLabel.text, "Bounces: 0", "label starts synced to the count");
  });

  QUnit.test("recordBounce() updates the label text", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });

    hud.recordBounce();
    hud.recordBounce();

    assert.strictEqual(hud.countLabel.text, "Bounces: 2");
  });

  QUnit.test("resetBounceCount() updates the label text", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    hud.recordBounce();
    hud.recordBounce();

    hud.resetBounceCount();

    assert.strictEqual(hud.countLabel.text, "Bounces: 0");
  });

  QUnit.test("clicking the reset button invokes onReset", (assert) => {
    const ui = new FakeUi();
    let resetCount = 0;
    const hud = new Hud({ ui, onReset: () => resetCount++ });

    hud.resetButton.onPointerUpObservable.notifyObservers();

    assert.strictEqual(resetCount, 1);
  });

  QUnit.test("dispose() removes and disposes the panel", (assert) => {
    const ui = new FakeUi();
    const hud = new Hud({ ui });
    const panel = hud.panel;

    hud.dispose();

    assert.false(ui.controls.includes(panel), "panel removed from the ui");
    assert.true(panel.disposed, "panel.dispose() was called");
    assert.strictEqual(hud.panel, null);
  });

  QUnit.test("dispose() is a no-op when no panel exists", (assert) => {
    const hud = new Hud();

    hud.dispose();

    assert.strictEqual(hud.panel, null);
  });
});
