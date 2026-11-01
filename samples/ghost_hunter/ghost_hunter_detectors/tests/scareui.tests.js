QUnit.module("LevelPicker and ScareFx", () => {
  class FakeElement {
    constructor() {
      this.children = [];
      this.listeners = {};
      this.classes = new Set();
      this.style = {};
      this.textContent = "";
      this.classList = { add: (name) => this.classes.add(name), remove: (name) => this.classes.delete(name), contains: (name) => this.classes.has(name) };
    }
    appendChild(child) { this.children.push(child); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const page = () => {
    const elements = { "start-level": new FakeElement(), "start-level-note": new FakeElement(), flash: new FakeElement(), vignette: new FakeElement() };
    return { elements, doc: { getElementById: (id) => elements[id], createElement: () => new FakeElement() } };
  };
  const table = () => ({ ...SCARE, level: "creepy" });

  QUnit.test("there is a button for every level, in order, and the chosen one is marked", (assert) => {
    const { doc, elements } = page();
    const picker = new LevelPicker(doc, table());
    assert.deepEqual(elements["start-level"].children.map((b) => b.textContent), ["Gentle", "Creepy", "Terrifying"]);
    assert.true(picker.buttons.creepy.classes.has("selected"));
    assert.false(picker.buttons.gentle.classes.has("selected"));
    assert.strictEqual(elements["start-level-note"].textContent, SCARE.levels.creepy.note);
  });

  QUnit.test("pressing a button chooses it, says what it does, and tells whoever is listening", (assert) => {
    const { doc, elements } = page();
    const told = [];
    const t = table();
    const picker = new LevelPicker(doc, t, (name) => told.push(name));
    picker.buttons.terrifying.listeners.click();
    assert.deepEqual(told, ["terrifying"]);
    assert.strictEqual(t.level, "terrifying");
    assert.true(picker.buttons.terrifying.classes.has("selected"));
    assert.false(picker.buttons.creepy.classes.has("selected"));
    assert.strictEqual(elements["start-level-note"].textContent, SCARE.levels.terrifying.note);
  });

  QUnit.test("a level that does not exist is ignored, and setting the one it starts with tells nobody", (assert) => {
    const { doc } = page();
    const told = [];
    const picker = new LevelPicker(doc, table(), (name) => told.push(name));
    picker.select("nonsense");
    assert.deepEqual(told, []);
    assert.strictEqual(picker.table.level, "creepy");
  });

  QUnit.test("the flash is as bright as the strike says, and the dark edge as thick as the dread and the level", (assert) => {
    const { doc, elements } = page();
    const fx = new ScareFx(doc);
    fx.apply({ flash: 0.5, dread: 0.5, level: SCARE.levels.creepy });
    assert.strictEqual(elements.flash.style.opacity, "0.500");
    assert.strictEqual(Number(elements.vignette.style.opacity), 0.5 * SCARE.levels.creepy.vignette);
    fx.apply({ flash: 7, dread: 0, level: SCARE.levels.gentle });
    assert.strictEqual(elements.flash.style.opacity, "1.000", "never more than all");
    assert.strictEqual(Number(elements.vignette.style.opacity), 0);
  });
});
