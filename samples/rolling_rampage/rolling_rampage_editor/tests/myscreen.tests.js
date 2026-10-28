QUnit.module("element", () => {
  QUnit.test("makes an element with properties and children", (assert) => {
    const child = element(fakeDocument, "span", { textContent: "x" });
    const parent = element(fakeDocument, "div", { className: "box", id: "one" }, [child]);

    assert.strictEqual(parent.tag, "div");
    assert.strictEqual(parent.className, "box");
    assert.strictEqual(parent.id, "one");
    assert.deepEqual(parent.children, [child]);
  });
});

QUnit.module("MyLevelsScreen", () => {
  const items = [
    { name: "Hill", detail: "20 × 12", playable: true },
    { name: "Broken", detail: "20 × 12 · 2 to fix", playable: false },
  ];
  const calls = [];
  const make = (options = {}) => {
    calls.length = 0;
    const record = (name) => (...args) => calls.push([name, ...args]);
    const screen = new MyLevelsScreen(fakeDocument, {
      onPlay: record("play"),
      onEdit: record("edit"),
      onExport: record("export"),
      onDelete: record("delete"),
      onNew: record("new"),
      onImport: record("import"),
      onBack: record("back"),
      ...options,
    });
    screen.render(items, 5);
    return screen;
  };
  const buttonsOf = (screen, index) => screen.list.children[index].findAll((node) => node.tag === "button");
  const press = (screen, index, text) => buttonsOf(screen, index).find((button) => button.textContent === text).click();

  QUnit.test("starts hidden, and show and hide change that", (assert) => {
    const screen = make();
    assert.true(screen.root.classList.contains("hidden"));
    screen.show();
    assert.false(screen.root.classList.contains("hidden"));
    screen.hide();
    assert.true(screen.root.classList.contains("hidden"));
  });

  QUnit.test("a row for every level, with its name and detail as text", (assert) => {
    const screen = make();

    assert.strictEqual(screen.list.children.length, 2);
    const texts = screen.list.children[1].findAll((node) => node.textContent && node.children.length === 0).map((node) => node.textContent);
    assert.true(texts.includes("Broken"));
    assert.true(texts.includes("20 × 12 · 2 to fix"));
  });

  QUnit.test("the count says how many of how many, or that there are none", (assert) => {
    const screen = make();
    assert.strictEqual(screen.count.textContent, "2 of 5");
    screen.render([], 5);
    assert.true(screen.count.textContent.includes("haven't"));
    assert.strictEqual(screen.list.children.length, 0);
  });

  QUnit.test("a level that can't be played has its Play button switched off", (assert) => {
    const screen = make();
    const play = (index) => buttonsOf(screen, index).find((button) => button.textContent === "Play");
    assert.false(play(0).disabled);
    assert.true(play(1).disabled);
  });

  QUnit.test("Play, Edit and Share say which level", (assert) => {
    const screen = make();

    press(screen, 1, "Play");
    press(screen, 0, "Edit");
    press(screen, 1, "Share");

    assert.deepEqual(calls, [["play", 1], ["edit", 0], ["export", 1]]);
  });

  QUnit.test("Delete asks first: the first click changes the button, and the second deletes", (assert) => {
    const screen = make();

    press(screen, 0, "Delete");
    assert.deepEqual(calls, []);
    assert.strictEqual(screen.deleteButtons[0].textContent, "Sure?");

    press(screen, 0, "Sure?");
    assert.deepEqual(calls, [["delete", 0]]);
  });

  QUnit.test("asking to delete another level lets the first off", (assert) => {
    const screen = make();
    press(screen, 0, "Delete");

    press(screen, 1, "Delete");

    assert.strictEqual(screen.deleteButtons[0].textContent, "Delete");
    assert.strictEqual(screen.deleteButtons[1].textContent, "Sure?");
  });

  QUnit.test("showing the list again lets every delete off", (assert) => {
    const screen = make();
    press(screen, 0, "Delete");
    screen.render(items, 5);
    assert.strictEqual(screen.deleteButtons[0].textContent, "Delete");
  });

  QUnit.test("New, Add from text and Back call back", (assert) => {
    const screen = make();

    screen.newButton.click();
    screen.importButton.click();
    screen.backButton.click();

    assert.deepEqual(calls.map((call) => call[0]), ["new", "import", "back"]);
  });

  QUnit.test("when there is no room for another level, New and Add from text are off", (assert) => {
    const screen = make();
    assert.false(screen.newButton.disabled);
    screen.render(items, 2);
    assert.true(screen.newButton.disabled);
    assert.true(screen.importButton.disabled);
  });

  QUnit.test("a name is shown as text, so it can't add anything to the page", (assert) => {
    const screen = make();
    screen.render([{ name: "<img src=x onerror=alert(1)>", detail: "", playable: true }], 5);

    const names = screen.list.children[0].findAll((node) => node.tag === "strong");
    assert.strictEqual(names[0].textContent, "<img src=x onerror=alert(1)>");
    assert.strictEqual(names[0].innerHTML, undefined);
  });

  QUnit.test("showText shows the text box with the text, and hideText hides it", (assert) => {
    const screen = make();

    screen.showText({ label: "Copy this", text: "{}", readOnly: true });
    assert.false(screen.textPanel.classList.contains("hidden"));
    assert.strictEqual(screen.textBox.value, "{}");
    assert.true(screen.textBox.readOnly);
    assert.true(screen.textBox.selected);
    assert.strictEqual(screen.textLabel.textContent, "Copy this");

    screen.hideText();
    assert.true(screen.textPanel.classList.contains("hidden"));
  });

  QUnit.test("a box for copying has a Copy button and no Add button, and a box for pasting the other way round", (assert) => {
    const screen = make();

    screen.showText({ label: "x", text: "y", readOnly: true });
    assert.true(screen.actionButton.classList.contains("hidden"));
    assert.false(screen.copyButton.classList.contains("hidden"));

    screen.showText({ label: "x", action: () => {} });
    assert.false(screen.actionButton.classList.contains("hidden"));
    assert.true(screen.copyButton.classList.contains("hidden"));
    assert.false(screen.textBox.readOnly);
  });

  QUnit.test("the Add button gives the text to the action", (assert) => {
    const screen = make();
    const got = [];
    screen.showText({ label: "x", action: (text) => got.push(text) });

    screen.textBox.value = "pasted";
    screen.actionButton.click();

    assert.deepEqual(got, ["pasted"]);
  });

  QUnit.test("Copy puts the text on the clipboard, and says so", async (assert) => {
    const written = [];
    const screen = make({ clipboard: { writeText: async (text) => written.push(text) } });
    screen.showText({ label: "x", text: "level text", readOnly: true });

    assert.true(await screen._copy());

    assert.deepEqual(written, ["level text"]);
    assert.strictEqual(screen.message.textContent, "Copied.");
  });

  QUnit.test("Copy without a clipboard, or with one that refuses, doesn't fail", async (assert) => {
    assert.false(await make()._copy());
    assert.false(await make({ clipboard: { writeText: async () => { throw new Error("no"); } } })._copy());
  });

  QUnit.test("setMessage shows a line of words", (assert) => {
    const screen = make();
    screen.setMessage("Added.");
    assert.strictEqual(screen.message.textContent, "Added.");
  });
});
