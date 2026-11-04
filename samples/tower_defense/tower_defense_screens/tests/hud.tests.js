QUnit.module("waveText", () => {
  QUnit.test("while getting ready it says how many seconds there are, rounded up, and never below nothing", (assert) => {
    assert.strictEqual(waveText("preparing", 3, 10, 12.2), "Wave 3 of 10 in 13");
    assert.strictEqual(waveText("preparing", 3, 10, 0.01), "Wave 3 of 10 in 1");
    assert.strictEqual(waveText("preparing", 3, 10, -4), "Wave 3 of 10 in 0");
  });

  QUnit.test("while the wave is on it says which wave", (assert) => {
    assert.strictEqual(waveText("running", 4, 10, 0), "Wave 4 of 10");
  });

  QUnit.test("at the end it says how it went", (assert) => {
    assert.strictEqual(waveText("won", 10, 10, 0), "All 10 waves beaten");
    assert.strictEqual(waveText("lost", 6, 10, 0), "Lost in wave 6 of 10");
  });
});

QUnit.module("a Hud", (hooks) => {
  let parts, hud;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    const make = (tag) => fixture.appendChild(document.createElement(tag));
    parts = { lives: make("span"), wave: make("span"), next: make("button") };
    hud = new Hud(parts);
  });

  const state = (extra = {}) => ({ lives: 17, phase: "preparing", number: 2, total: 10, countdown: 8.5, ...extra });

  QUnit.test("show writes the lives and the wave", (assert) => {
    hud.show(state());

    assert.strictEqual(parts.lives.textContent, "17");
    assert.strictEqual(parts.wave.textContent, "Wave 2 of 10 in 9");
  });

  QUnit.test("the button for the next wave is there while getting ready, and nowhere else", (assert) => {
    hud.show(state());
    assert.false(parts.next.hidden);
    for (const phase of ["running", "won", "lost"]) {
      hud.show(state({ phase }));

      assert.true(parts.next.hidden, phase);
    }
  });

  QUnit.test("it only writes text that has changed, so asking every frame costs nothing", (assert) => {
    hud.show(state());
    let writes = 0;
    new MutationObserver(() => writes++).observe(parts.wave, { childList: true, characterData: true, subtree: true });
    hud.show(state());
    hud.show(state());

    return new Promise((resolve) =>
      setTimeout(() => {
        assert.strictEqual(writes, 0);
        resolve();
      }, 20)
    );
  });

  QUnit.test("pressing the wave button says so", (assert) => {
    let count = 0;
    hud.onStartWave(() => count++);
    parts.next.click();

    assert.strictEqual(count, 1);
  });

  QUnit.test("a pointer let go on the button does not go on to the page, where the game would take it for a tap on a cell", (assert) => {
    let heard = 0;
    window.addEventListener("pointerup", () => heard++, { once: true });
    parts.next.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    const stopped = heard === 0;
    window.dispatchEvent(new PointerEvent("pointerup"));

    assert.true(stopped, "the button's pointerup stopped");
    assert.strictEqual(heard, 1, "and only the one that was sent to the window arrived");
  });
});
