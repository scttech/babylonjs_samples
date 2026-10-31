QUnit.module("TouchUi", () => {
  const make = () => {
    const surface = document.createElement("div");
    const controls = new TouchControls(surface, { enabled: true, width: () => 800 });
    const paused = [];
    const ui = new TouchUi(document, controls, { onPause: () => paused.push("pause") });
    return { surface, controls, ui, paused, gone: () => { ui.root.remove(); ui.turn.remove(); } };
  };

  QUnit.test("the ring is hidden until a thumb is down, and then it is where the thumb went down", (assert) => {
    const { controls, ui, gone } = make();
    ui.update();
    assert.true(ui.ring.classList.contains("hidden"));
    controls.stick.start(1, 120, 340);
    controls.stick.move(1, 150, 340);
    ui.update();
    assert.false(ui.ring.classList.contains("hidden"));
    assert.strictEqual(ui.ring.style.left, "120px");
    assert.strictEqual(ui.ring.style.top, "340px");
    assert.true(ui.knob.style.transform.includes("30px"));
    gone();
  });

  QUnit.test("the jump button tells the controls which finger is on it, and lets go", (assert) => {
    const { controls, ui, gone } = make();
    ui.jump.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 4, bubbles: true }));
    assert.true(controls.jumpHeld);
    assert.true(ui.jump.classList.contains("pressed"));
    ui.jump.dispatchEvent(new PointerEvent("pointerup", { pointerId: 4, bubbles: true }));
    assert.false(controls.jumpHeld);
    assert.false(ui.jump.classList.contains("pressed"));
    gone();
  });

  QUnit.test("the pause button calls the pause", (assert) => {
    const { ui, paused, gone } = make();
    ui.pause.click();
    assert.deepEqual(paused, ["pause"]);
    gone();
  });

  QUnit.test("the words that ask for the phone to be turned show only when it is upright, and touch mode is a class of the body", (assert) => {
    const { ui, gone } = make();
    ui.setPortrait(true);
    assert.false(ui.turn.classList.contains("hidden"));
    ui.setPortrait(false);
    assert.true(ui.turn.classList.contains("hidden"));
    ui.setEnabled(true);
    assert.true(document.body.classList.contains("touch"));
    ui.setEnabled(false);
    assert.false(document.body.classList.contains("touch"));
    gone();
  });
});
