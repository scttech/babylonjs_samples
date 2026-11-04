QUnit.module("a Tray", (hooks) => {
  let parts, tray;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    parts = { tray: document.createElement("div"), gold: document.createElement("span"), message: document.createElement("div") };
    fixture.append(parts.tray, parts.gold, parts.message);
    tray = new Tray(parts, document);
  });

  const press = (button, x = 10, y = 20, pointerType = "mouse") => button.dispatchEvent(new PointerEvent("pointerdown", { clientX: x, clientY: y, pointerType, bubbles: true, cancelable: true }));

  QUnit.test("element makes a node with a class and some text", (assert) => {
    const node = element(document, "span", "name", "hello");

    assert.strictEqual(node.tagName, "SPAN");
    assert.strictEqual(node.className, "name");
    assert.strictEqual(node.textContent, "hello");
  });

  QUnit.test("there is a button for every kind, in the order of the tray", (assert) => {
    assert.deepEqual([...parts.tray.children].map((button) => button.dataset.kind), TRAY_ORDER);
    assert.deepEqual(TRAY_ORDER.slice().sort(), Object.keys(BENDERS).sort());
  });

  QUnit.test("each button shows the name and the price, and is a real button that can be reached with a keyboard", (assert) => {
    for (const kind of TRAY_ORDER) {
      const button = tray.buttons[kind];

      assert.strictEqual(button.tagName, "BUTTON");
      assert.strictEqual(button.type, "button");
      assert.strictEqual(button.querySelector(".name").textContent, BENDERS[kind].name);
      assert.strictEqual(button.querySelector(".cost").textContent, String(BENDERS[kind].cost));
      assert.true(button.getAttribute("aria-label").includes(String(BENDERS[kind].cost)), kind);
    }
  });

  QUnit.test("each button has the color of its nation", (assert) => {
    for (const kind of TRAY_ORDER) assert.strictEqual(tray.buttons[kind].style.getPropertyValue("--nation"), BENDERS[kind].color, kind);
  });

  QUnit.test("pressing a button says which, and where, and what kind of pointer", (assert) => {
    const heard = [];
    tray.onPress((kind, point) => heard.push([kind, point]));
    press(tray.buttons.earth, 33, 44, "touch");

    assert.deepEqual(heard, [["earth", { x: 33, y: 44, pointerType: "touch" }]]);
  });

  QUnit.test("pressing is not a click: the browser's own handling (selecting, scrolling) is stopped", (assert) => {
    const event = new PointerEvent("pointerdown", { bubbles: true, cancelable: true });
    tray.buttons.air.dispatchEvent(event);

    assert.true(event.defaultPrevented);
  });

  QUnit.test("more than one listener can listen", (assert) => {
    let count = 0;
    tray.onPress(() => count++);
    tray.onPress(() => count++);
    press(tray.buttons.fire);

    assert.strictEqual(count, 2);
  });

  QUnit.test("update shows the gold, in whole gold", (assert) => {
    tray.update(123.9);

    assert.strictEqual(parts.gold.textContent, "123");
  });

  QUnit.test("update fades the buttons that cost more than there is, and no others", (assert) => {
    tray.update(BENDERS.water.cost);
    const poor = TRAY_ORDER.filter((kind) => tray.buttons[kind].classList.contains("poor"));

    assert.deepEqual(poor.sort(), TRAY_ORDER.filter((kind) => BENDERS[kind].cost > BENDERS.water.cost).sort());
  });

  QUnit.test("with more gold they are not faded any more", (assert) => {
    tray.update(0);
    assert.true(TRAY_ORDER.every((kind) => tray.buttons[kind].classList.contains("poor")));
    tray.update(10000);

    assert.true(TRAY_ORDER.every((kind) => !tray.buttons[kind].classList.contains("poor")));
  });

  QUnit.test("a faded button still works: it is pressed, and the game says why not", (assert) => {
    let heard = 0;
    tray.onPress(() => heard++);
    tray.update(0);
    press(tray.buttons.fire);

    assert.strictEqual(heard, 1);
    assert.false(tray.buttons.fire.disabled);
  });

  QUnit.test("hold marks the button that is in the hand, and only that one, and null puts it down", (assert) => {
    tray.hold("water");
    assert.deepEqual(TRAY_ORDER.filter((kind) => tray.buttons[kind].classList.contains("held")), ["water"]);
    tray.hold("fire");
    assert.deepEqual(TRAY_ORDER.filter((kind) => tray.buttons[kind].classList.contains("held")), ["fire"]);
    tray.hold(null);

    assert.deepEqual(TRAY_ORDER.filter((kind) => tray.buttons[kind].classList.contains("held")), []);
  });

  QUnit.test("say puts a sentence on the line, and shows it, and an empty one hides it", (assert) => {
    tray.say("that is road");
    assert.strictEqual(parts.message.textContent, "that is road");
    assert.true(parts.message.classList.contains("shown"));
    tray.say("");

    assert.false(parts.message.classList.contains("shown"));
  });

  QUnit.test("it works with a tray that has fewer kinds", (assert) => {
    const box = document.createElement("div");
    const small = new Tray({ ...parts, tray: box }, document, { air: BENDERS.air }, ["air"]);

    assert.strictEqual(box.children.length, 1);
    small.update(0);
    assert.true(box.children[0].classList.contains("poor"));
  });
});
