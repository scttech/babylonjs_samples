QUnit.module("ToolsUi", () => {
  class FakeElement {
    constructor() {
      this.listeners = {};
      this.classes = new Set();
      this.style = {};
      this.classList = { add: (n) => this.classes.add(n), remove: (n) => this.classes.delete(n), contains: (n) => this.classes.has(n) };
    }
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const make = () => {
    const ids = ["tool-light", "tool-beam", "meter-light", "meter-beam", "grip", "torch"];
    const elements = Object.fromEntries(ids.map((id) => [id, new FakeElement()]));
    const log = [];
    const ui = new ToolsUi({ getElementById: (id) => elements[id] }, { onLight: () => log.push("light"), onBeam: (on) => log.push(on ? "beam on" : "beam off") });
    return { ui, elements, log };
  };
  const frame = (extra = {}) => ({ lightOn: false, power: 0, charge: 1, heat: 0, overheated: false, firing: false, grip: 0, ...extra });

  QUnit.test("the light button switches the light, and the beam button is held", (assert) => {
    const { elements, log } = make();
    elements["tool-light"].listeners.click();
    elements["tool-beam"].listeners.pointerdown({ preventDefault() {} });
    elements["tool-beam"].listeners.pointerup();
    assert.deepEqual(log, ["light", "beam on", "beam off"]);
  });

  QUnit.test("a touch that leaves the beam button, or is taken away, lets the beam go", (assert) => {
    const { elements, log } = make();
    elements["tool-beam"].listeners.pointerdown({});
    elements["tool-beam"].listeners.pointerleave();
    elements["tool-beam"].listeners.pointerdown({});
    elements["tool-beam"].listeners.pointercancel();
    assert.deepEqual(log, ["beam on", "beam off", "beam on", "beam off"]);
  });

  QUnit.test("the buttons show what is on, what is low, and what is too hot", (assert) => {
    const { ui, elements } = make();
    ui.apply(frame({ lightOn: true, power: 1, charge: 0.1, firing: true, overheated: true, heat: 1 }));
    assert.true(elements["tool-light"].classes.has("on") && elements["tool-light"].classes.has("low"));
    assert.true(elements["tool-beam"].classes.has("on") && elements["tool-beam"].classes.has("hot"));
    ui.apply(frame());
    assert.false(elements["tool-light"].classes.has("on") || elements["tool-light"].classes.has("low") || elements["tool-beam"].classes.has("hot"));
  });

  QUnit.test("the meters are as full as the battery is and as hot as the beam is, never more than all", (assert) => {
    const { ui, elements } = make();
    ui.apply(frame({ charge: 0.42, heat: 3 }));
    assert.strictEqual(elements["meter-light"].style.width, "42%");
    assert.strictEqual(elements["meter-beam"].style.width, "100%");
  });

  QUnit.test("the bar of the hold shows only while there is a hold, and the glow only while the light is on", (assert) => {
    const { ui, elements } = make();
    ui.apply(frame({ grip: 0.5 }));
    assert.strictEqual(elements.grip.style.width, "50%");
    assert.strictEqual(elements.grip.style.opacity, "1");
    assert.strictEqual(elements.torch.style.opacity, "0.000");
    ui.apply(frame({ lightOn: true, power: 1 }));
    assert.strictEqual(elements.grip.style.opacity, "0");
    assert.true(Number(elements.torch.style.opacity) > 0.1);
    ui.apply(frame({ lightOn: true, power: 0.5 }));
    assert.true(Number(elements.torch.style.opacity) < 0.15, "a weak light glows less");
  });
});

QUnit.module("BeamBody and the hand", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    return { engine, scene: new BABYLON.Scene(engine) };
  };

  QUnit.test("the beam is only there when it is firing", (assert) => {
    const { engine, scene } = make();
    const beam = new BeamBody(scene);
    assert.false(beam.mesh.isEnabled());
    beam.update([0, 1, 0], [0, 1, 5], true, 0);
    assert.true(beam.mesh.isEnabled());
    beam.update([0, 1, 0], [0, 1, 5], false, 0);
    assert.false(beam.mesh.isEnabled());
    beam.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("it runs from one point to the other: as long as the way between, halfway, pointing along it", (assert) => {
    const { engine, scene } = make();
    const beam = new BeamBody(scene);
    beam.update([1, 1, 0], [1, 1, 6], true, 0);
    assert.true(Math.abs(beam.mesh.scaling.y - 6) < 1e-6);
    assert.true(Math.abs(beam.mesh.position.z - 3) < 1e-6 && Math.abs(beam.mesh.position.x - 1) < 1e-6);
    const along = new BABYLON.Vector3(0, 1, 0).applyRotationQuaternion(beam.mesh.rotationQuaternion);
    assert.true(Math.abs(along.z - 1) < 1e-5);
    beam.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the beam is thin, and shakes a little", (assert) => {
    const { engine, scene } = make();
    const beam = new BeamBody(scene);
    const widths = new Set();
    for (let t = 0; t < 1; t += 0.013) {
      beam.update([0, 1, 0], [0, 1, 4], true, t);
      widths.add(beam.mesh.scaling.x.toFixed(4));
      assert.true(beam.mesh.scaling.x > 0.015 && beam.mesh.scaling.x < 0.05);
    }
    assert.true(widths.size > 5);
    beam.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the hand is to the right of, below and in front of the eye", (assert) => {
    const hand = handPosition({ position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] });
    assert.true(hand[0] > 0.1, "right");
    assert.true(hand[1] < 1.4 && hand[1] > 1, "below");
    assert.true(hand[2] > 0.1, "in front");
  });

  QUnit.test("the hand goes round with the player", (assert) => {
    const hand = handPosition({ position: [0, 1.4, 0], forward: [1, 0, 0], up: [0, 1, 0] }); // facing to the right
    assert.true(hand[0] > 0.1, "in front, which is now x");
    assert.true(hand[2] < -0.1, "and the right hand is now towards -z");
  });
});
