QUnit.module("devEnabled", () => {
  QUnit.test("is on when the address has ?dev", (assert) => {
    assert.true(devEnabled("?dev"));
    assert.true(devEnabled("?level=2&dev"));
    assert.true(devEnabled("?dev=1"));
  });

  QUnit.test("is off otherwise, and for a missing address", (assert) => {
    assert.false(devEnabled(""));
    assert.false(devEnabled("?level=2"));
    assert.false(devEnabled("?developer"));
    assert.false(devEnabled(undefined));
  });
});

QUnit.module("slider and the way numbers are shown", () => {
  QUnit.test("a slider reads and writes a property of an object", (assert) => {
    const world = { g: 9.8 };
    const row = slider("Gravity", world, "g", 0, 30);

    assert.strictEqual(row.get(), 9.8);
    row.set(20);
    assert.strictEqual(world.g, 20);
  });

  QUnit.test("a control reads and writes a number wherever it is kept", (assert) => {
    let kept = 5;
    const row = control("Push", () => kept, (value) => { kept = value; }, 1, 10, 1);

    row.set(8);

    assert.strictEqual(row.get(), 8);
    assert.deepEqual([row.label, row.min, row.max, row.step], ["Push", 1, 10, 1]);
  });

  QUnit.test("a slider has a label, a range, and a step of 0.01 unless told another", (assert) => {
    const row = slider("Gravity", {}, "g", 0, 30);

    assert.deepEqual([row.label, row.min, row.max, row.step], ["Gravity", 0, 30, 0.01]);
    assert.strictEqual(slider("x", {}, "x", 0, 1, 5).step, 5);
  });

  QUnit.test("decimalsOf counts the places after the point", (assert) => {
    assert.strictEqual(decimalsOf(1), 0);
    assert.strictEqual(decimalsOf(0.5), 1);
    assert.strictEqual(decimalsOf(0.01), 2);
  });

  QUnit.test("a number is shown to as many places as its step", (assert) => {
    assert.strictEqual(formatValue(160, 1), "160");
    assert.strictEqual(formatValue(0.4, 0.01), "0.40");
    assert.strictEqual(formatValue(0.123456, 0.01), "0.12");
  });

  QUnit.test("valuesText lists each row under the title of its group", (assert) => {
    const groups = [
      { title: "Marble", rows: [slider("power", { p: 160 }, "p", 1, 512, 1), slider("rim", { r: 0.7 }, "r", 0, 1)] },
      { title: "Lights", rows: [slider("sun", { s: 0.9 }, "s", 0, 2)] },
    ];

    assert.strictEqual(valuesText(groups), "Marble\n  power: 160\n  rim: 0.70\nLights\n  sun: 0.90");
  });
});

// The panel needs a page to build itself on. These give it a stand-in: elements that remember what is done to them.
QUnit.module("DevPanel", () => {
  class FakeElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.classes = new Set();
      this.listeners = {};
      this.textContent = "";
      this.value = "";
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        toggle: (name, on) => (on ? this.classes.add(name) : this.classes.delete(name)),
        contains: (name) => this.classes.has(name),
      };
    }

    appendChild(child) {
      this.children.push(child);
    }
    addEventListener(type, callback) {
      this.listeners[type] = callback;
    }
    blur() {
      this.blurred = (this.blurred || 0) + 1;
    }
    find(tag) {
      const found = [];
      const walk = (element) => {
        if (element.tag === tag) found.push(element);
        element.children.forEach(walk);
      };
      walk(this);
      return found;
    }
  }

  const doc = { createElement: (tag) => new FakeElement(tag) };

  const make = (options) => {
    const values = { power: 160, rim: 0.7 };
    const groups = [{ title: "Marble", rows: [slider("power", values, "power", 1, 512, 1), slider("rim", values, "rim", 0, 1)] }];
    return { panel: new DevPanel(doc, groups, options), values };
  };

  QUnit.test("makes a row (a slider and its number) for every row, set to where the number is", (assert) => {
    const { panel } = make();

    const inputs = panel.root.find("input");
    assert.strictEqual(inputs.length, 2);
    assert.deepEqual(inputs.map((i) => i.type), ["range", "range"]);
    assert.deepEqual([inputs[0].min, inputs[0].max, inputs[0].step, inputs[0].value], [1, 512, 1, 160]);
    assert.deepEqual(panel.root.find("output").map((o) => o.textContent), ["160", "0.70"]);
  });

  QUnit.test("each group has its title", (assert) => {
    const { panel } = make();

    assert.deepEqual(panel.root.find("h3").map((h) => h.textContent), ["Marble"]);
  });

  QUnit.test("moving a slider changes the number, shows it, and tells onChange", (assert) => {
    const changes = [];
    const { panel, values } = make({ onChange: (row, value) => changes.push([row.label, value]) });
    const [power] = panel.root.find("input");

    power.value = "200";
    power.listeners.input();

    assert.strictEqual(values.power, 200);
    assert.strictEqual(panel.root.find("output")[0].textContent, "200");
    assert.deepEqual(changes, [["power", 200]]);
  });

  QUnit.test("a slider that has been let go lets go of the keyboard, so the arrow keys steer the marble", (assert) => {
    const { panel } = make();
    const [power] = panel.root.find("input");

    power.listeners.change();

    assert.strictEqual(power.blurred, 1);
  });

  QUnit.test("refresh() brings the sliders up to date with numbers the game has changed", (assert) => {
    const { panel, values } = make();

    values.power = 300;
    panel.refresh();

    assert.strictEqual(panel.root.find("input")[0].value, 300);
    assert.strictEqual(panel.root.find("output")[0].textContent, "300");
  });

  QUnit.test("it starts open, or folded up if asked", (assert) => {
    assert.false(make().panel.collapsed);
    assert.true(make({ collapsed: true }).panel.collapsed);
  });

  QUnit.test("the title bar button folds it up and opens it again, and says which it will do", (assert) => {
    const { panel } = make();

    panel.head.listeners.click();
    assert.true(panel.collapsed);
    assert.true(panel.head.textContent.includes("▸"));

    panel.head.listeners.click();
    assert.false(panel.collapsed);
    assert.true(panel.head.textContent.includes("▾"));
  });

  QUnit.test("toggleShown() hides the whole panel and shows it again", (assert) => {
    const { panel } = make();
    assert.true(panel.shown);

    panel.toggleShown();
    assert.false(panel.shown);
    assert.true(panel.root.classes.has("hidden"));

    panel.toggleShown();
    assert.true(panel.shown);
  });

  QUnit.test("hiding the panel doesn't forget whether it was folded up", (assert) => {
    const { panel } = make({ collapsed: true });

    panel.toggleShown();
    panel.toggleShown();

    assert.true(panel.collapsed);
  });

  QUnit.test("copy() puts the numbers on the clipboard as text", async (assert) => {
    const written = [];
    const { panel } = make({ clipboard: { writeText: async (text) => written.push(text) } });

    const done = await panel.copy();

    assert.true(done);
    assert.deepEqual(written, ["Marble\n  power: 160\n  rim: 0.70"]);
  });

  QUnit.test("copy() without a clipboard, or with one that refuses, doesn't fail", async (assert) => {
    assert.false(await make().panel.copy());
    assert.false(await make({ clipboard: { writeText: async () => { throw new Error("no"); } } }).panel.copy());
  });

  QUnit.test("the Copy button copies", (assert) => {
    const { panel } = make();
    let copied = 0;
    panel.copy = () => copied++;

    panel.copyButton.listeners.click();

    assert.strictEqual(copied, 1);
  });
});
