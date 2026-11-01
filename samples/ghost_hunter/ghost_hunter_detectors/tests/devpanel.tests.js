QUnit.module("devEnabled", () => {
  QUnit.test("is on when the address has ?dev", (assert) => {
    assert.true(devEnabled("?dev"));
    assert.true(devEnabled("?hour=9&dev"));
    assert.true(devEnabled("?dev=1"));
  });

  QUnit.test("is off otherwise, and for a missing address", (assert) => {
    assert.false(devEnabled(""));
    assert.false(devEnabled("?hour=9"));
    assert.false(devEnabled("?developer"));
    assert.false(devEnabled(undefined));
  });
});

QUnit.module("the kinds of row", () => {
  QUnit.test("a slider reads and writes a property of an object", (assert) => {
    const world = { g: 9.8 };
    const row = slider("Gravity", world, "g", 0, 30);
    assert.strictEqual(row.kind, "range");
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

  QUnit.test("a toggle is a switch, and a readout only shows, and an action does something", (assert) => {
    let on = false;
    const switchRow = toggle("shadows", () => on, (value) => { on = value; });
    switchRow.set(true);
    assert.strictEqual(switchRow.kind, "toggle");
    assert.true(on);
    assert.strictEqual(readout("speed", () => 3).kind, "readout");
    let ran = 0;
    const button = action("Go", () => ran++);
    button.run();
    assert.deepEqual([button.kind, ran], ["action", 1]);
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

  QUnit.test("rowText shows a number to its step, a switch as on or off, and a read-out as it is", (assert) => {
    assert.strictEqual(rowText(slider("x", { x: 0.5 }, "x", 0, 1, 0.1)), "0.5");
    assert.strictEqual(rowText(toggle("t", () => true, () => {})), "on");
    assert.strictEqual(rowText(toggle("t", () => false, () => {})), "off");
    assert.strictEqual(rowText(readout("r", () => "idle")), "idle");
    assert.strictEqual(rowText(readout("n", () => 12)), "12");
  });

  QUnit.test("valuesText lists each row under the title of its group, and leaves out buttons", (assert) => {
    const groups = [
      { title: "Camera", rows: [slider("distance", { d: 5.5 }, "d", 1, 10), toggle("invert", () => true, () => {})] },
      { title: "Hunter", rows: [readout("clip", () => "Idle_Loop"), action("Go", () => {})] },
    ];
    assert.strictEqual(valuesText(groups), "Camera\n  distance: 5.50\n  invert: on\nHunter\n  clip: Idle_Loop");
  });
});

QUnit.module("DevPanel", () => {
  class FakeElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.listeners = {};
      this.classes = new Set();
      this.textContent = "";
      this.checked = false;
      this.value = "";
      this.className = "";
      this.classList = {
        toggle: (name, on) => (on ? this.classes.add(name) : this.classes.delete(name)),
        contains: (name) => this.classes.has(name),
        add: (name) => this.classes.add(name),
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
    find(test) {
      const found = [];
      const walk = (element) => {
        if (test(element)) found.push(element);
        element.children.forEach(walk);
      };
      walk(this);
      return found;
    }
  }

  const doc = { createElement: (tag) => new FakeElement(tag) };

  const make = (options) => {
    const state = { power: 160, on: false, speed: 3 };
    const ran = [];
    const groups = [
      {
        title: "Marble",
        rows: [
          slider("power", state, "power", 1, 512, 1),
          toggle("on", () => state.on, (value) => { state.on = value; }),
          readout("speed", () => state.speed),
          action("Go", () => ran.push("go")),
        ],
      },
    ];
    return { panel: new DevPanel(doc, groups, options), state, ran };
  };

  QUnit.test("makes a slider for a range row, set to where the number is", (assert) => {
    const { panel } = make();
    const [input] = panel.root.find((e) => e.tag === "input" && e.type === "range");
    assert.deepEqual([input.min, input.max, input.step, input.value], [1, 512, 1, 160]);
  });

  QUnit.test("makes a checkbox for a switch, a line for a read-out, and a button for an action", (assert) => {
    const { panel } = make();
    assert.strictEqual(panel.root.find((e) => e.tag === "input" && e.type === "checkbox").length, 1);
    assert.strictEqual(panel.root.find((e) => e.tag === "label" && e.classes.has("readout")).length, 1);
    assert.deepEqual(panel.root.find((e) => e.className === "dev-action").map((b) => b.textContent), ["Go"]);
  });

  QUnit.test("the numbers shown are the numbers the game has", (assert) => {
    const { panel } = make();
    assert.deepEqual(panel.root.find((e) => e.tag === "output").map((o) => o.textContent), ["160", "off", "3"]);
  });

  QUnit.test("each group has its title", (assert) => {
    const { panel } = make();
    assert.deepEqual(panel.root.find((e) => e.tag === "h3").map((h) => h.textContent), ["Marble"]);
  });

  QUnit.test("moving a slider changes the number, shows it, and tells onChange", (assert) => {
    const changes = [];
    const { panel, state } = make({ onChange: (row, value) => changes.push([row.label, value]) });
    const [input] = panel.root.find((e) => e.tag === "input" && e.type === "range");
    input.value = "200";
    input.listeners.input();
    assert.strictEqual(state.power, 200);
    assert.strictEqual(panel.root.find((e) => e.tag === "output")[0].textContent, "200");
    assert.deepEqual(changes, [["power", 200]]);
  });

  QUnit.test("a slider that has been let go lets go of the keyboard, so the keys work the game", (assert) => {
    const { panel } = make();
    const [input] = panel.root.find((e) => e.tag === "input" && e.type === "range");
    input.listeners.change();
    assert.strictEqual(input.blurred, 1);
  });

  QUnit.test("a switch changes the game, shows on or off, tells onChange, and lets go of the keyboard", (assert) => {
    const changes = [];
    const { panel, state } = make({ onChange: (row, value) => changes.push([row.label, value]) });
    const [box] = panel.root.find((e) => e.tag === "input" && e.type === "checkbox");
    box.checked = true;
    box.listeners.change();
    assert.true(state.on);
    assert.strictEqual(panel.root.find((e) => e.tag === "output")[1].textContent, "on");
    assert.deepEqual(changes, [["on", true]]);
    assert.strictEqual(box.blurred, 1);
  });

  QUnit.test("a button does its action and lets go of the keyboard", (assert) => {
    const { panel, ran } = make();
    const [button] = panel.root.find((e) => e.className === "dev-action");
    button.listeners.click();
    assert.deepEqual(ran, ["go"]);
    assert.strictEqual(button.blurred, 1);
  });

  QUnit.test("refresh brings every row up to date with what the game has changed", (assert) => {
    const { panel, state } = make();
    state.power = 300;
    state.on = true;
    state.speed = 9;
    panel.refresh();
    assert.strictEqual(panel.root.find((e) => e.tag === "input" && e.type === "range")[0].value, 300);
    assert.true(panel.root.find((e) => e.tag === "input" && e.type === "checkbox")[0].checked);
    assert.deepEqual(panel.root.find((e) => e.tag === "output").map((o) => o.textContent), ["300", "on", "9"]);
  });

  QUnit.test("refreshReadouts brings up to date only the read-outs, and leaves the sliders alone", (assert) => {
    const { panel, state } = make();
    const [input] = panel.root.find((e) => e.tag === "input" && e.type === "range");
    state.power = 300;
    state.speed = 9;
    panel.refreshReadouts();
    assert.strictEqual(input.value, 160);
    assert.deepEqual(panel.root.find((e) => e.tag === "output").map((o) => o.textContent), ["160", "off", "9"]);
  });

  QUnit.test("it starts open, or folded up if asked, and the title bar folds it and opens it", (assert) => {
    assert.false(make().panel.collapsed);
    const { panel } = make({ collapsed: true });
    assert.true(panel.collapsed);
    panel.head.listeners.click();
    assert.false(panel.collapsed);
    assert.true(panel.head.textContent.includes("▾"));
  });

  QUnit.test("toggleShown hides the whole panel and shows it again, without forgetting that it was folded", (assert) => {
    const { panel } = make({ collapsed: true });
    panel.toggleShown();
    assert.false(panel.shown);
    panel.toggleShown();
    assert.true(panel.shown);
    assert.true(panel.collapsed);
  });

  QUnit.test("copy puts the numbers on the clipboard as text", async (assert) => {
    const written = [];
    const { panel } = make({ clipboard: { writeText: async (text) => written.push(text) } });
    assert.true(await panel.copy());
    assert.deepEqual(written, ["Marble\n  power: 160\n  on: off\n  speed: 3"]);
  });

  QUnit.test("copy without a clipboard, or with one that refuses, doesn't fail", async (assert) => {
    assert.false(await make().panel.copy());
    assert.false(await make({ clipboard: { writeText: async () => { throw new Error("no"); } } }).panel.copy());
  });
});
