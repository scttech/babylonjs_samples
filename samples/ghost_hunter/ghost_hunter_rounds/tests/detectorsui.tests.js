QUnit.module("DetectorsUi", () => {
  const make = (handlers = {}) => {
    const ui = new DetectorsUi(document, handlers);
    return { ui, gone: () => { ui.root.remove(); ui.chill.remove(); document.body.classList.remove("thermal"); } };
  };
  const blank = (selected, extra = {}) => ({ selected, emf: null, radar: null, box: null, thermal: null, ...extra });

  QUnit.test("a button for each gadget, and pressing one says which", (assert) => {
    const pressed = [];
    const { ui, gone } = make({ onSelect: (name) => pressed.push(name) });
    assert.deepEqual(Object.keys(ui.buttons), DETECT.names);
    ui.buttons.radar.click();
    ui.buttons.thermal.click();
    assert.deepEqual(pressed, ["radar", "thermal"]);
    gone();
  });

  QUnit.test("with nothing in the hand there is no screen, and the one in the hand is marked", (assert) => {
    const { ui, gone } = make();
    ui.apply(blank(null));
    assert.true(ui.screen.classList.contains("hidden"));
    ui.apply(blank("emf", { emf: { level: 2, strength: 0.4, nearest: "g" } }));
    assert.false(ui.screen.classList.contains("hidden"));
    assert.true(ui.buttons.emf.classList.contains("on"));
    assert.false(ui.buttons.radar.classList.contains("on"));
    assert.false(ui.emf.classList.contains("hidden"));
    assert.true(ui.radar.classList.contains("hidden"));
    gone();
  });

  QUnit.test("the meter lights as many lights as it reads", (assert) => {
    const { ui, gone } = make();
    ui.apply(blank("emf", { emf: { level: 3, strength: 0.6, nearest: "g" } }));
    assert.strictEqual(ui.lights.length, DETECT.emf.lights);
    assert.deepEqual(ui.lights.map((l) => l.classList.contains("on")), [true, true, true, false, false]);
    ui.apply(blank("emf", { emf: { level: 0, strength: 0, nearest: null } }));
    assert.true(ui.lights.every((l) => !l.classList.contains("on")));
    gone();
  });

  QUnit.test("the radar is drawn without trouble, with blips and without", (assert) => {
    const { ui, gone } = make();
    ui.apply(blank("radar", { radar: { sweep: 45, blips: [] } }));
    ui.apply(blank("radar", { radar: { sweep: 200, blips: [{ key: "g", kind: "ghost", angle: 90, radius: 0.5, light: 0.7 }, { key: "c", kind: "mummy", angle: 270, radius: 1, light: 0.2 }] } }));
    const pixels = ui.canvas.getContext("2d").getImageData(0, 0, 120, 120).data;
    assert.true(pixels.some((v, i) => i % 4 === 3 && v > 0), "something was drawn");
    gone();
  });

  QUnit.test("the box shows its static, says the dial, and shows the last word, fading", (assert) => {
    const tuned = [];
    const { ui, gone } = make({ onTune: (v) => tuned.push(v) });
    ui.dial.value = "0.62";
    ui.dial.dispatchEvent(new Event("input"));
    assert.deepEqual(tuned, [0.62]);
    ui.apply(blank("box", { box: { dial: 0.62, lock: 0, hiss: 0.5, nearest: null } }), { lastWord: "LEAVE", wordAge: 0 });
    assert.strictEqual(ui.hissFill.style.width, "50%");
    assert.strictEqual(ui.word.textContent, "LEAVE");
    const fresh = Number(ui.word.style.opacity);
    ui.apply(blank("box", { box: { dial: 0.62, lock: 0, hiss: 0.5, nearest: null } }), { lastWord: "LEAVE", wordAge: 2.5 });
    assert.true(Number(ui.word.style.opacity) < fresh);
    gone();
  });

  QUnit.test("thermal vision shows the temperature, tints the picture by the chill, and marks the page", (assert) => {
    const { ui, gone } = make();
    ui.apply(blank("thermal", { thermal: { temperature: 7.25, chill: 0.8 } }));
    assert.strictEqual(ui.temperature.textContent, "7.3\u00b0C");
    assert.true(Number(ui.chill.style.opacity) > 0.3);
    assert.true(document.body.classList.contains("thermal"));
    ui.apply(blank("emf", { emf: { level: 0, strength: 0, nearest: null } }));
    assert.strictEqual(ui.chill.style.opacity, "0");
    assert.false(document.body.classList.contains("thermal"));
    gone();
  });
});
