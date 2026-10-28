// The controls need something to listen to. These tests give them stand-ins that remember their
// listeners, and send them events by hand.
QUnit.module("KeyboardInput", () => {
  class FakeTarget {
    constructor() {
      this.listeners = {};
    }
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
    removeEventListener(type) {
      delete this.listeners[type];
    }
    send(type, code) {
      const event = { code, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
      if (this.listeners[type]) this.listeners[type](event);
      return event;
    }
  }

  const make = () => {
    const target = new FakeTarget();
    return { target, input: new KeyboardInput(target) };
  };

  QUnit.test("no keys are held to begin with, so there is no stick", (assert) => {
    const { input } = make();

    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("pressing a steering key makes a stick, and letting go ends it", (assert) => {
    const { target, input } = make();

    target.send("keydown", "ArrowRight");
    assert.deepEqual(input.stick, { x: 1, y: 0 });

    target.send("keyup", "ArrowRight");
    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("keys held together make a diagonal", (assert) => {
    const { target, input } = make();

    target.send("keydown", "KeyW");
    target.send("keydown", "KeyD");

    assert.true(input.stick.x > 0 && input.stick.y > 0);
  });

  QUnit.test("letting go of one of two keys leaves the other held", (assert) => {
    const { target, input } = make();
    target.send("keydown", "KeyW");
    target.send("keydown", "KeyD");

    target.send("keyup", "KeyD");

    assert.deepEqual(input.stick, { x: 0, y: 1 });
  });

  QUnit.test("a key held down repeats its keydown, which makes no difference", (assert) => {
    const { target, input } = make();

    target.send("keydown", "ArrowUp");
    target.send("keydown", "ArrowUp");
    target.send("keydown", "ArrowUp");
    target.send("keyup", "ArrowUp");

    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("the steering keys are stopped from scrolling the page", (assert) => {
    const { target } = make();

    assert.true(target.send("keydown", "ArrowDown").defaultPrevented);
  });

  QUnit.test("other keys are not touched, so R and C still do their own things", (assert) => {
    const { target, input } = make();

    for (const code of ["KeyR", "KeyC", "Space", "Escape"]) {
      assert.false(target.send("keydown", code).defaultPrevented, code);
    }
    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("losing focus lets go of every key, so none is stuck down", (assert) => {
    const { target, input } = make();
    target.send("keydown", "ArrowRight");
    target.send("keydown", "ArrowUp");

    target.send("blur");

    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("dispose() stops listening, and lets go of the keys", (assert) => {
    const { target, input } = make();
    target.send("keydown", "ArrowRight");

    input.dispose();
    target.send("keydown", "ArrowLeft");

    assert.deepEqual(Object.keys(target.listeners), []);
    assert.deepEqual(input.stick, NO_STICK);
  });

  QUnit.test("STEERING_KEYS is every key the stick uses", (assert) => {
    assert.strictEqual(STEERING_KEYS.size, Object.values(KEYS).flat().length);
    assert.true(STEERING_KEYS.has("KeyW") && STEERING_KEYS.has("ArrowLeft"));
  });
});

QUnit.module("StickControls", () => {
  class FakeElement {
    constructor() {
      this.listeners = {};
      this.clientWidth = 1000;
      this.clientHeight = 600;
      this.captured = [];
      this.style = {};
      this.classes = new Set(["hidden"]);
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        contains: (name) => this.classes.has(name),
      };
    }
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
    removeEventListener(type) {
      delete this.listeners[type];
    }
    setPointerCapture(id) {
      this.captured.push(id);
    }
    send(type, event) {
      if (this.listeners[type]) this.listeners[type]({ pointerType: "touch", pointerId: 1, clientX: 0, clientY: 0, ...event });
    }
  }

  const make = () => {
    const element = new FakeElement();
    const ring = new FakeElement();
    const knob = new FakeElement();
    const controls = new StickControls(element, { ring, knob });
    return { element, ring, knob, controls };
  };

  QUnit.test("listens for the four kinds of pointer event", (assert) => {
    const { element } = make();

    assert.deepEqual(Object.keys(element.listeners).sort(), ["pointercancel", "pointerdown", "pointermove", "pointerup"]);
  });

  QUnit.test("there is no stick until a finger touches", (assert) => {
    const { controls } = make();

    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("touching and dragging right makes a stick pointing right", (assert) => {
    const { element, controls } = make();

    element.send("pointerdown", { clientX: 200, clientY: 300 });
    element.send("pointermove", { clientX: 400, clientY: 300 });

    assert.true(controls.value.x > 0.9 && Math.abs(controls.value.y) < 1e-9);
  });

  QUnit.test("the radius comes from the size of the element, so a thumb's reach is about the same on any screen", (assert) => {
    const { element, controls } = make(); // 1000 x 600: a radius of 0.12 of 600 = 72

    element.send("pointerdown", { clientX: 200, clientY: 300 });

    assert.true(Math.abs(controls.touchStick.radius - 72) < 1e-9);
  });

  QUnit.test("the ring appears where the finger touched, as big as the stick's reach", (assert) => {
    const { element, ring } = make();

    element.send("pointerdown", { clientX: 200, clientY: 300 });

    assert.false(ring.classes.has("hidden"));
    assert.strictEqual(ring.style.width, "144px");
    assert.strictEqual(ring.style.transform, "translate(128px, 228px)");
  });

  QUnit.test("the knob follows the thumb, and the ring stays where it was", (assert) => {
    const { element, ring, knob } = make();
    element.send("pointerdown", { clientX: 200, clientY: 300 });

    element.send("pointermove", { clientX: 230, clientY: 280 });

    assert.strictEqual(knob.style.transform, "translate(30px, -20px)");
    assert.strictEqual(ring.style.transform, "translate(128px, 228px)");
  });

  QUnit.test("lifting the finger takes the ring away and ends the stick", (assert) => {
    const { element, ring, controls } = make();
    element.send("pointerdown", { clientX: 200, clientY: 300 });
    element.send("pointermove", { clientX: 400, clientY: 300 });

    element.send("pointerup", { clientX: 400, clientY: 300 });

    assert.true(ring.classes.has("hidden"));
    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("when the browser takes the touch away it ends the same way", (assert) => {
    const { element, ring, controls } = make();
    element.send("pointerdown", { clientX: 200, clientY: 300 });

    element.send("pointercancel", {});

    assert.true(ring.classes.has("hidden"));
    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("the mouse is ignored: a click doesn't start a stick", (assert) => {
    const { element, ring, controls } = make();

    element.send("pointerdown", { pointerType: "mouse", clientX: 200, clientY: 300 });
    element.send("pointermove", { pointerType: "mouse", clientX: 400, clientY: 300 });

    assert.deepEqual(controls.value, NO_STICK);
    assert.true(ring.classes.has("hidden"));
  });

  QUnit.test("a pen counts as a finger", (assert) => {
    const { element, controls } = make();

    element.send("pointerdown", { pointerType: "pen", clientX: 200, clientY: 300 });
    element.send("pointermove", { pointerType: "pen", clientX: 300, clientY: 300 });

    assert.true(controls.value.x > 0);
  });

  QUnit.test("a second finger is ignored", (assert) => {
    const { element, controls } = make();
    element.send("pointerdown", { pointerId: 1, clientX: 200, clientY: 300 });

    element.send("pointerdown", { pointerId: 2, clientX: 700, clientY: 300 });
    element.send("pointermove", { pointerId: 2, clientX: 900, clientY: 300 });

    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("it captures the finger, so the moves keep coming if it slides off the element", (assert) => {
    const { element } = make();

    element.send("pointerdown", { pointerId: 5, clientX: 200, clientY: 300 });

    assert.deepEqual(element.captured, [5]);
  });

  QUnit.test("works without a ring and a knob, for a game that doesn't draw one", (assert) => {
    const element = new FakeElement();
    const controls = new StickControls(element);

    element.send("pointerdown", { clientX: 200, clientY: 300 });
    element.send("pointermove", { clientX: 300, clientY: 300 });
    element.send("pointerup", {});

    assert.deepEqual(controls.value, NO_STICK);
  });

  QUnit.test("dispose() stops listening and puts the ring away", (assert) => {
    const { element, ring, controls } = make();
    element.send("pointerdown", { clientX: 200, clientY: 300 });

    controls.dispose();

    assert.deepEqual(Object.keys(element.listeners), []);
    assert.true(ring.classes.has("hidden"));
    assert.deepEqual(controls.value, NO_STICK);
  });
});

QUnit.module("typing in a text field", () => {
  QUnit.test("a key pressed in a text field is for typing", (assert) => {
    assert.true(typesText({ target: { tagName: "INPUT" } }));
    assert.true(typesText({ target: { tagName: "TEXTAREA" } }));
  });

  QUnit.test("a key pressed anywhere else isn't", (assert) => {
    assert.false(typesText({ target: { tagName: "BUTTON" } }));
    assert.false(typesText({ target: { tagName: "BODY" } }));
    assert.false(typesText({ target: null }));
    assert.false(typesText({}));
  });

  QUnit.test("the steering keys don't steer, and aren't stopped from typing, when they are pressed in a text field", (assert) => {
    const listeners = {};
    const input = new KeyboardInput({
      addEventListener: (type, listener) => (listeners[type] = listener),
      removeEventListener() {},
    });
    let prevented = false;

    listeners.keydown({ code: "KeyW", target: { tagName: "INPUT" }, preventDefault: () => (prevented = true) });

    assert.false(prevented, "the browser is let type the letter");
    assert.deepEqual(input.stick, NO_STICK, "and the marble isn't steered");
  });

  QUnit.test("pressed anywhere else, they steer, as before", (assert) => {
    const listeners = {};
    const input = new KeyboardInput({
      addEventListener: (type, listener) => (listeners[type] = listener),
      removeEventListener() {},
    });

    listeners.keydown({ code: "KeyW", target: { tagName: "BODY" }, preventDefault() {} });

    assert.true(input.stick.y > 0);
  });
});
