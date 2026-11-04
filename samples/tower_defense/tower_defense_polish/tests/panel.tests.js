QUnit.module("what the panel says", () => {
  QUnit.test("the level: which, of how many, and what it is called", (assert) => {
    assert.strictEqual(levelText(2, 3, "Adept"), "Level 2 of 3, Adept");
  });

  QUnit.test("the upgrade: where it goes and what it costs", (assert) => {
    assert.strictEqual(upgradeText("Master", 90), "Make Master for 90");
  });

  QUnit.test("the sale: what it gives back", (assert) => {
    assert.strictEqual(sellText(105), "Sell for 105");
  });
});

QUnit.module("the Panel", (hooks) => {
  let parts, panel;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    parts = {
      panel: document.createElement("div"),
      title: document.createElement("div"),
      level: document.createElement("div"),
      effect: document.createElement("div"),
      upgrade: document.createElement("button"),
      sell: document.createElement("button"),
    };
    parts.panel.hidden = true;
    parts.panel.append(parts.title, parts.level, parts.effect, parts.upgrade, parts.sell);
    fixture.append(parts.panel);
    panel = new Panel(parts);
  });

  const earth = { name: "Earth Kingdom", color: "#b08a4a", level: 1, total: 3, levelName: "Novice", effect: "Stuns for 1 second", nextName: "Adept", cost: 90, refund: 105, gold: 400 };

  QUnit.test("it is out of sight until a tower is shown, and out of sight again when it is hidden", (assert) => {
    assert.false(panel.visible);
    panel.show(earth);
    assert.true(panel.visible);
    panel.hide();
    assert.false(panel.visible);
  });

  QUnit.test("it shows the name, the level, and what each button does", (assert) => {
    panel.show(earth);

    assert.strictEqual(parts.title.textContent, "Earth Kingdom");
    assert.strictEqual(parts.level.textContent, "Level 1 of 3, Novice");
    assert.strictEqual(parts.effect.textContent, "Stuns for 1 second");
    assert.strictEqual(parts.upgrade.textContent, "Make Adept for 90");
    assert.strictEqual(parts.sell.textContent, "Sell for 105");
  });

  QUnit.test("it has the color of the nation", (assert) => {
    panel.show(earth);

    assert.strictEqual(parts.panel.style.getPropertyValue("--nation"), "#b08a4a");
  });

  QUnit.test("an upgrade that costs more than there is looks poor, and one that does not, does not", (assert) => {
    panel.show({ ...earth, gold: 89 });
    assert.true(parts.upgrade.classList.contains("poor"));
    panel.show({ ...earth, gold: 90 });
    assert.false(parts.upgrade.classList.contains("poor"));
  });

  QUnit.test("a tower that is as good as it gets has no upgrade button, and can still be sold", (assert) => {
    panel.show({ ...earth, level: 3, levelName: "Master", nextName: null, cost: null, refund: 250 });

    assert.true(parts.upgrade.hidden);
    assert.false(parts.sell.hidden);
    assert.strictEqual(parts.sell.textContent, "Sell for 250");
  });

  QUnit.test("and the button comes back for the next tower that can be upgraded", (assert) => {
    panel.show({ ...earth, level: 3, nextName: null, cost: null });
    panel.show(earth);

    assert.false(parts.upgrade.hidden);
  });

  QUnit.test("it only writes text that has changed, so that it can be shown every frame", (assert) => {
    panel.show(earth);
    const node = parts.title.firstChild;
    panel.show(earth);

    assert.strictEqual(parts.title.firstChild, node);
  });

  QUnit.test("a click on a button is told to whoever asked", (assert) => {
    const heard = [];
    panel.onUpgrade(() => heard.push("upgrade"));
    panel.onSell(() => heard.push("sell"));
    parts.upgrade.click();
    parts.sell.click();

    assert.deepEqual(heard, ["upgrade", "sell"]);
  });

  QUnit.test("a press on the panel is not passed on to the board behind it", (assert) => {
    let reached = false;
    document.getElementById("qunit-fixture").addEventListener("pointerup", () => (reached = true));
    for (const part of [parts.panel, parts.upgrade, parts.sell]) part.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));

    assert.false(reached);
  });
});
