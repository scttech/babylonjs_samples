QUnit.module("remainingSplashTime", () => {
  QUnit.test("is how much of the minimum is left", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 1500, 3000), 2500);
  });

  QUnit.test("is 0 once the minimum has passed", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 5000, 3000), 0);
    assert.strictEqual(remainingSplashTime(1000, 4000, 3000), 0);
  });
});

QUnit.module("Splash", () => {
  class FakeElement {
    constructor() {
      this.style = {};
      this.attributes = {};
      this.classes = new Set();
      this.textContent = "";
      this.removed = false;
      this.classList = { add: (name) => this.classes.add(name), contains: (name) => this.classes.has(name) };
    }
    setAttribute(name, value) {
      this.attributes[name] = value;
    }
    remove() {
      this.removed = true;
    }
  }

  const make = () => {
    const els = {};
    for (const id of ["splash", "splash-bar", "splash-fill", "splash-status"]) els[id] = new FakeElement();
    return { splash: new Splash({ getElementById: (id) => els[id] }), els };
  };

  QUnit.test("starts with an empty bar", (assert) => {
    const { splash, els } = make();
    assert.strictEqual(els["splash-fill"].style.width, "0.0%");
    assert.strictEqual(els["splash-bar"].attributes["aria-valuenow"], "0");
    assert.strictEqual(splash.finished, false);
  });

  QUnit.test("setProgress fills the bar, and tells a screen reader how far", (assert) => {
    const { splash, els } = make();
    splash.setProgress(0.426);
    assert.strictEqual(els["splash-fill"].style.width, "42.6%");
    assert.strictEqual(els["splash-bar"].attributes["aria-valuenow"], "42");
  });

  QUnit.test("a share outside 0 to 1 is held to the bar's ends", (assert) => {
    const { splash, els } = make();
    splash.setProgress(3);
    assert.strictEqual(els["splash-fill"].style.width, "100.0%");
    splash.setProgress(-1);
    assert.strictEqual(els["splash-fill"].style.width, "0.0%");
  });

  QUnit.test("setStatus writes the words under the bar", (assert) => {
    const { splash, els } = make();
    splash.setStatus("42%  ·  Building Large 1");
    assert.strictEqual(els["splash-status"].textContent, "42%  ·  Building Large 1");
  });

  QUnit.test("fail says what went wrong, and marks the splash so the bar can be hidden", (assert) => {
    const { splash, els } = make();
    splash.fail("Something went wrong");
    assert.true(els["splash"].classList.contains("failed"));
    assert.strictEqual(els["splash-status"].textContent, "Something went wrong");
  });

  QUnit.test("hide fades it out, and remove takes it away", (assert) => {
    const { splash, els } = make();
    splash.hide();
    assert.true(els["splash"].classList.contains("hidden"));
    assert.false(els["splash"].removed);
    splash.remove();
    assert.true(els["splash"].removed);
  });
});
