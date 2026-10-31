QUnit.module("bearingText", () => {
  QUnit.test("is the bearing in three figures, and the tilt with its sign", (assert) => {
    assert.strictEqual(bearingText(45, 12), "BEARING 045   TILT +12");
    assert.strictEqual(bearingText(0, 0), "BEARING 000   TILT  00");
    assert.strictEqual(bearingText(270.4, -8.2), "BEARING 270   TILT -08");
  });

  QUnit.test("a bearing that rounds up to a full turn is 0", (assert) => {
    assert.strictEqual(bearingText(359.7, 0), "BEARING 000   TILT  00");
  });
});

QUnit.module("StartScreen", () => {
  class FakeElement {
    constructor(tag = "div") {
      this.tag = tag;
      this.textContent = "";
      this.disabled = false;
      this.children = [];
      this.listeners = {};
      this.classes = new Set();
      this.classList = { add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name), contains: (name) => this.classes.has(name) };
    }
    appendChild(child) { this.children.push(child); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const make = () => {
    const elements = { start: new FakeElement(), "start-status": new FakeElement(), "start-warning": new FakeElement(), "start-button": new FakeElement("button"), "start-alternative": new FakeElement("button") };
    elements["start-alternative"].classes.add("hidden");
    const doc = {
      getElementById: (id) => elements[id],
      createElement: (tag) => new FakeElement(tag),
      createTextNode: (text) => Object.assign(new FakeElement("#text"), { textContent: text }),
    };
    return { screen: new StartScreen(doc), elements };
  };

  QUnit.test("the warning is there, and says what the game is", (assert) => {
    const { elements } = make();
    const words = elements["start-warning"].children.map((child) => child.textContent).join("");
    assert.true(words.includes("WARNING"));
    assert.true(words.includes("frighten"));
    assert.true(words.includes("never while walking"));
    assert.true(WARNING.length > 100);
  });

  QUnit.test("says what the phone can do", (assert) => {
    const { screen, elements } = make();
    screen.setStatus("hello");
    assert.strictEqual(elements["start-status"].textContent, "hello");
  });

  QUnit.test("the button is called straight from the press, and can be made to wait", (assert) => {
    const { screen, elements } = make();
    let entered = 0;
    screen.onEnter(() => { entered += 1; });
    elements["start-button"].listeners.click();
    assert.strictEqual(entered, 1);
    screen.setBusy(true);
    assert.true(elements["start-button"].disabled);
    screen.setBusy(false);
    assert.false(elements["start-button"].disabled);
  });

  QUnit.test("a second way in is hidden until it is offered, and then says what it is", (assert) => {
    const { screen, elements } = make();
    assert.true(elements["start-alternative"].classes.has("hidden"));
    let chosen = 0;
    screen.onAlternative(() => { chosen += 1; });
    screen.offerAlternative("Use the camera view");
    assert.false(elements["start-alternative"].classes.has("hidden"));
    assert.strictEqual(elements["start-alternative"].textContent, "Use the camera view");
    elements["start-alternative"].listeners.click();
    assert.strictEqual(chosen, 1);
    screen.setBusy(true);
    assert.true(elements["start-alternative"].disabled);
  });

  QUnit.test("hides itself", (assert) => {
    const { screen } = make();
    assert.false(screen.hidden);
    screen.hide();
    assert.true(screen.hidden);
    screen.show();
    assert.false(screen.hidden);
  });
});
