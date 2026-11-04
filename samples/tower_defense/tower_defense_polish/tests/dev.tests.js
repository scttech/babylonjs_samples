QUnit.module("devEnabled", () => {
  QUnit.test("is there for ?dev, with or without a value, and with other things in the address", (assert) => {
    assert.true(devEnabled("?dev"));
    assert.true(devEnabled("?dev=1"));
    assert.true(devEnabled("?map=1&dev"));
  });

  QUnit.test("is not there without it", (assert) => {
    assert.false(devEnabled(""));
    assert.false(devEnabled("?map=1"));
    assert.false(devEnabled("?device=1"), "and a name that begins with it is not it");
  });
});

QUnit.module("the dev table", () => {
  QUnit.test("every row has a number to change, in its range, with a label and a group", (assert) => {
    for (const row of devTable()) {
      assert.true(typeof row.object[row.key] === "number", row.label);
      assert.true(row.min < row.max && row.step > 0, row.label);
      assert.true(row.object[row.key] >= row.min && row.object[row.key] <= row.max, `${row.label}: ${row.object[row.key]} is in ${row.min} to ${row.max}`);
      assert.true(row.label.length > 0 && row.group.length > 0, row.label);
    }
  });

  QUnit.test("no two rows have the same label", (assert) => {
    const labels = devTable().map((row) => row.label);

    assert.strictEqual(new Set(labels).size, labels.length);
  });

  QUnit.test("the numbers that are in it are the ones that the game reads: they are the tables themselves", (assert) => {
    const rows = devTable();

    assert.true(rows.some((row) => row.object === BOLT && row.key === "speed"));
    assert.true(rows.some((row) => row.object === EFFECTS.slow));
    assert.true(rows.some((row) => row.object === LIMITS));
  });
});

QUnit.module("clampDev", () => {
  const row = { min: 1, max: 5, step: 0.5 };

  QUnit.test("keeps a value in the range", (assert) => {
    assert.strictEqual(clampDev(row, 0), 1);
    assert.strictEqual(clampDev(row, 9), 5);
  });

  QUnit.test("puts it on a step, from the least", (assert) => {
    assert.strictEqual(clampDev(row, 2.3), 2.5);
    assert.strictEqual(clampDev(row, 2.2), 2);
    assert.strictEqual(clampDev({ min: 0.1, max: 1, step: 0.1 }, 0.3), 0.3, "and a number that isn't exact in a computer is made right");
  });
});

QUnit.module("a DevPanel", (hooks) => {
  let parts, rows, thing, panel, logged;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    parts = { panel: fixture.appendChild(document.createElement("div")) };
    thing = { a: 2, b: 10 };
    rows = [
      { group: "One", label: "a", object: thing, key: "a", min: 0, max: 4, step: 0.5 },
      { group: "Two", label: "b", object: thing, key: "b", min: 5, max: 20, step: 5 },
    ];
    logged = [];
    panel = new DevPanel(parts, document, rows, (values) => logged.push(values));
  });

  const sliders = () => [...parts.panel.querySelectorAll("input[type=range]")];
  const move = (slider, value) => {
    slider.value = String(value);
    slider.dispatchEvent(new Event("input"));
  };

  QUnit.test("it is out of sight until it is asked for, and the key shows it and puts it away", (assert) => {
    assert.false(panel.visible);
    panel.toggle();
    assert.true(panel.visible);
    panel.toggle();
    assert.false(panel.visible);
  });

  QUnit.test("it has a slider for each row, at the number now, with a heading for each group", (assert) => {
    assert.strictEqual(sliders().length, 2);
    assert.strictEqual(sliders()[0].value, "2");
    assert.strictEqual(sliders()[1].max, "20");
    assert.deepEqual([...parts.panel.querySelectorAll("h4")].map((h) => h.textContent), ["One", "Two"]);
  });

  QUnit.test("a slider changes the number that it is for, in the table itself, and shows it", (assert) => {
    move(sliders()[0], 3.5);

    assert.strictEqual(thing.a, 3.5);
    assert.strictEqual(parts.panel.querySelectorAll(".dev-value")[0].textContent, "3.5");
  });

  QUnit.test("a number is kept to its steps", (assert) => {
    move(sliders()[1], 12);

    assert.strictEqual(thing.b, 10);
  });

  QUnit.test("reset puts every number back to what it was when the panel was made", (assert) => {
    move(sliders()[0], 4);
    move(sliders()[1], 20);
    panel.reset();

    assert.deepEqual(thing, { a: 2, b: 10 });
    assert.strictEqual(sliders()[0].value, "2");
  });

  QUnit.test("the buttons reset and log the values, by label", (assert) => {
    move(sliders()[0], 1);
    const buttons = [...parts.panel.querySelectorAll(".dev-button")];
    buttons.find((b) => b.textContent === "Log values").click();
    buttons.find((b) => b.textContent === "Reset").click();

    assert.deepEqual(logged, [{ a: 1, b: 10 }]);
    assert.strictEqual(thing.a, 2);
  });

  QUnit.test("it can be folded away and brought back, and still be there", (assert) => {
    panel.toggle();
    panel.fold();
    assert.true(panel.visible);
    assert.true(panel.body.hidden);
    panel.fold();
    assert.false(panel.body.hidden);
  });

  QUnit.test("a press on the panel does not go on to the board behind it", (assert) => {
    let reached = 0;
    document.getElementById("qunit-fixture").addEventListener("pointerup", () => reached++);
    document.getElementById("qunit-fixture").addEventListener("pointerdown", () => reached++);
    for (const type of ["pointerup", "pointerdown"]) parts.panel.dispatchEvent(new PointerEvent(type, { bubbles: true }));

    assert.strictEqual(reached, 0);
  });
});

QUnit.module("devValues and resetDev", () => {
  QUnit.test("values are by label, and reset puts back what was there at the start", (assert) => {
    const thing = { x: 3 };
    const rows = [{ label: "x", object: thing, key: "x", initial: 3 }];
    thing.x = 9;

    assert.deepEqual(devValues(rows), { x: 9 });
    resetDev(rows);
    assert.strictEqual(thing.x, 3);
  });
});
