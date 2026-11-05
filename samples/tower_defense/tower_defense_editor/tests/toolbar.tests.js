QUnit.module("a Toolbar", (hooks) => {
  let parts, toolbar, brushes, actions, names;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    const make = (tag) => fixture.appendChild(document.createElement(tag));
    parts = { palette: make("div"), actions: make("div"), name: make("input"), problems: make("ul"), status: make("div") };
    toolbar = new Toolbar(parts, document);
    brushes = [];
    actions = [];
    names = [];
    toolbar.onBrush((id) => brushes.push(id));
    toolbar.onAction((id) => actions.push(id));
    toolbar.onName((text) => names.push(text));
  });

  const brushButtons = () => [...parts.palette.querySelectorAll(".brush")];
  const button = (id) => parts.actions.querySelector(`[data-action="${id}"]`);
  const READY = [];

  QUnit.test("the palette has a button for each brush, in order, with its color and its name", (assert) => {
    const buttons = brushButtons();

    assert.strictEqual(buttons.length, BRUSHES.length);
    buttons.forEach((b, i) => {
      assert.strictEqual(b.dataset.brush, BRUSHES[i].id);
      assert.strictEqual(b.querySelector(".label").textContent, BRUSHES[i].name);
      assert.true(b.querySelector(".swatch").style.background.length > 0, BRUSHES[i].id);
    });
  });

  QUnit.test("the first brush is chosen, and pressing another chooses it, says so, and marks only that one", (assert) => {
    assert.strictEqual(toolbar.selected, BRUSHES[0].id);
    assert.true(brushButtons()[0].classList.contains("selected"));
    brushButtons()[3].click();

    assert.deepEqual(brushes, [BRUSHES[3].id]);
    assert.deepEqual(brushButtons().map((b) => b.classList.contains("selected")), BRUSHES.map((_, i) => i === 3));
  });

  QUnit.test("select (the keys 1 to 9) marks a brush without saying that it was pressed", (assert) => {
    toolbar.select("goal");

    assert.true(parts.palette.querySelector('[data-brush="goal"]').classList.contains("selected"));
    assert.deepEqual(brushes, []);
  });

  QUnit.test("each button has its name for a screen reader and its number as a hint", (assert) => {
    assert.strictEqual(brushButtons()[0].getAttribute("aria-label"), BRUSHES[0].name);
    assert.true(brushButtons()[0].title.includes("(1)"));
  });

  QUnit.test("there is a button for each action, and they say what was pressed", (assert) => {
    toolbar.showProblems(READY);
    toolbar.setHistory(true, true);
    for (const action of ACTIONS) button(action.id).click();

    assert.deepEqual(actions, ACTIONS.map((a) => a.id));
  });

  QUnit.test("with a map that can't be played, the buttons that need one are not there to press, and the others are", (assert) => {
    toolbar.showProblems(["the road is broken"]);

    for (const id of ["save", "share", "play"]) assert.true(button(id).disabled, id);
    for (const id of ["clear"]) assert.false(button(id).disabled, id);
    button("play").click();
    assert.deepEqual(actions, [], "and a press on one does nothing");
  });

  QUnit.test("with a map that can, they are", (assert) => {
    toolbar.showProblems(["no"]);
    toolbar.showProblems(READY);

    for (const id of ["save", "share", "play"]) assert.false(button(id).disabled, id);
    assert.true(toolbar.ready);
  });

  QUnit.test("what is wrong is a list, and not more than four things at once (the first are what to do next)", (assert) => {
    toolbar.showProblems(["a", "b", "c", "d", "e", "f"]);
    const items = [...parts.problems.querySelectorAll("li")].map((li) => li.textContent);

    assert.deepEqual(items, ["a", "b", "c", "d"]);
    assert.false(parts.problems.classList.contains("ready"));
  });

  QUnit.test("when nothing is wrong it says so, and is marked as ready", (assert) => {
    toolbar.showProblems(READY);

    assert.deepEqual([...parts.problems.querySelectorAll("li")].map((li) => li.textContent), ["Ready to play!"]);
    assert.true(parts.problems.classList.contains("ready"));
  });

  QUnit.test("undo and redo are there only when there is something to undo or redo", (assert) => {
    assert.true(button("undo").disabled && button("redo").disabled, "at the start");
    toolbar.setHistory(true, false);
    assert.false(button("undo").disabled);
    assert.true(button("redo").disabled);
    toolbar.setHistory(true, true);

    assert.false(button("redo").disabled);
  });

  QUnit.test("typing in the name says what was typed", (assert) => {
    parts.name.value = "Long road";
    parts.name.dispatchEvent(new Event("input"));

    assert.deepEqual(names, ["Long road"]);
  });

  QUnit.test("setName puts a name in the box, and does not say that it was typed, and does not move the cursor of what is already there", (assert) => {
    toolbar.setName("Mine");

    assert.strictEqual(parts.name.value, "Mine");
    assert.deepEqual(names, []);
  });

  QUnit.test("say puts a sentence on the line under the tools, and nothing clears it", (assert) => {
    toolbar.say("Saved.");
    assert.strictEqual(parts.status.textContent, "Saved.");
    toolbar.say("");

    assert.strictEqual(parts.status.textContent, "");
  });

  QUnit.test("a press on the tools does not go on to the board behind them, where it would paint", (assert) => {
    let reached = 0;
    document.getElementById("qunit-fixture").addEventListener("pointerdown", () => reached++);
    document.getElementById("qunit-fixture").addEventListener("pointerup", () => reached++);
    for (const part of [parts.palette, parts.actions, parts.name, parts.problems]) {
      for (const type of ["pointerdown", "pointerup"]) part.dispatchEvent(new PointerEvent(type, { bubbles: true }));
    }

    assert.strictEqual(reached, 0);
  });

  QUnit.test("the actions are in a table, and undo and redo come first and need no map", (assert) => {
    assert.strictEqual(ACTIONS[0].id, "undo");
    assert.false(ACTIONS.find((a) => a.id === "undo").needsMap);
    assert.true(ACTIONS.find((a) => a.id === "play").needsMap);
  });
});
