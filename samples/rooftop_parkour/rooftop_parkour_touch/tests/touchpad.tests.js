QUnit.module("Stick and LookPad", () => {
  QUnit.test("the stick measures from where the thumb went down, and lets go when it comes up", (assert) => {
    const stick = new Stick();
    assert.true(stick.start(1, 100, 300));
    stick.move(1, 100, 300 - TOUCH.stickRadius);
    assert.true(stick.value.amount > 0.99);
    assert.deepEqual(stick.input.forward, 1);
    assert.true(stick.end(1));
    assert.strictEqual(stick.value.amount, 0);
    assert.false(stick.active);
  });

  QUnit.test("another finger can not take the stick, nor move it, nor let it go", (assert) => {
    const stick = new Stick();
    stick.start(1, 100, 300);
    assert.false(stick.start(2, 50, 50));
    stick.move(2, 400, 400);
    assert.strictEqual(stick.dx, 0);
    assert.false(stick.end(2));
    assert.true(stick.active);
  });

  QUnit.test("the knob is drawn where the thumb is, but not past the reach of the stick", (assert) => {
    const stick = new Stick();
    stick.start(1, 0, 0);
    stick.move(1, 3 * TOUCH.stickRadius, 0);
    assert.strictEqual(stick.knob.x, TOUCH.stickRadius);
    assert.strictEqual(stick.knob.y, 0);
    stick.move(1, 20, 0);
    assert.strictEqual(stick.knob.x, 20);
  });

  QUnit.test("a drag turns the view by how far it moved, scaled, and what was taken is forgotten", (assert) => {
    const pad = new LookPad();
    pad.start(7, 500, 200);
    pad.move(7, 520, 190);
    pad.move(7, 530, 190);
    const turned = pad.take();
    assert.strictEqual(turned.dx, 30 * TOUCH.lookScale);
    assert.strictEqual(turned.dy, -10 * TOUCH.lookScale);
    assert.deepEqual(pad.take(), { dx: 0, dy: 0 });
  });

  QUnit.test("a finger that is not the look pad's does not turn the view", (assert) => {
    const pad = new LookPad();
    pad.start(7, 500, 200);
    pad.move(8, 900, 900);
    assert.deepEqual(pad.take(), { dx: 0, dy: 0 });
  });
});

QUnit.module("TouchControls", () => {
  // A surface that is a plain element, 800 pixels wide, touched by events that a test makes up.
  const setup = (enabled = true) => {
    const surface = document.createElement("div");
    const controls = new TouchControls(surface, { enabled, width: () => 800 });
    const touch = (type, id, x, y) => surface.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true }));
    return { surface, controls, touch };
  };

  QUnit.test("a finger on the left is the stick, and one on the right looks", (assert) => {
    const { controls, touch } = setup();
    touch("pointerdown", 1, 100, 400);
    touch("pointerdown", 2, 600, 400);
    assert.true(controls.stick.active);
    assert.true(controls.pad.active);
    touch("pointermove", 1, 100, 400 - TOUCH.stickRadius);
    touch("pointermove", 2, 640, 380);
    assert.strictEqual(controls.input().forward, 1);
    assert.strictEqual(controls.take().dx, 40 * TOUCH.lookScale);
  });

  QUnit.test("the stick keeps its finger when the finger wanders across the screen", (assert) => {
    const { controls, touch } = setup();
    touch("pointerdown", 1, 100, 400);
    touch("pointermove", 1, 700, 400);
    assert.true(controls.stick.active);
    assert.false(controls.pad.active);
    touch("pointerup", 1, 700, 400);
    assert.false(controls.stick.active);
  });

  QUnit.test("a cancelled touch is let go of like an ended one", (assert) => {
    const { controls, touch } = setup();
    touch("pointerdown", 1, 100, 400);
    touch("pointercancel", 1, 100, 400);
    assert.false(controls.stick.active);
  });

  QUnit.test("nothing is heard when the controls are off, and turning them off lets go of everything", (assert) => {
    const off = setup(false);
    off.touch("pointerdown", 1, 100, 400);
    assert.false(off.controls.stick.active);
    const { controls, touch } = setup(true);
    touch("pointerdown", 1, 100, 400);
    controls.jumpDown(5);
    controls.setEnabled(false);
    assert.false(controls.stick.active);
    assert.false(controls.jumpHeld);
  });

  QUnit.test("the jump is held while a finger is on the button, and two fingers need both to come up", (assert) => {
    const { controls } = setup();
    controls.jumpDown(1);
    controls.jumpDown(2);
    assert.true(controls.input().jump);
    controls.jumpUp(1);
    assert.true(controls.jumpHeld);
    controls.jumpUp(2);
    assert.false(controls.input().jump);
  });
});
