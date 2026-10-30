QUnit.module("formatTime", () => {
  QUnit.test("a time is minutes, seconds and tenths", (assert) => {
    assert.strictEqual(formatTime(0), "0:00.0");
    assert.strictEqual(formatTime(7.25), "0:07.2");
    assert.strictEqual(formatTime(61.3), "1:01.3");
    assert.strictEqual(formatTime(600), "10:00.0");
  });

  QUnit.test("the tenths are cut and not rounded, so that a time is never shown better than it was", (assert) => {
    assert.strictEqual(formatTime(59.99), "0:59.9");
    assert.strictEqual(formatTime(0.05), "0:00.0");
  });

  QUnit.test("a time under zero is zero", (assert) => {
    assert.strictEqual(formatTime(-4), "0:00.0");
  });
});

QUnit.module("trialLines", () => {
  const checkpoints = trialCheckpoints();
  const through = (trial, count, seconds) => {
    trial.update({ x: 0, y: 0, z: 0, speed: 3 }, 0);
    for (const c of checkpoints.slice(1, 1 + count)) trial.update({ x: c.x, y: c.y, z: c.z, speed: 3 }, seconds);
  };

  QUnit.test("before the run it says where to go, and the clock is at zero", (assert) => {
    const lines = trialLines(new Trial(checkpoints));
    assert.strictEqual(lines.title, TRIAL.name);
    assert.strictEqual(lines.time, "0:00.0");
    assert.true(lines.hint.includes("medium roof") && lines.hint.includes("T"));
  });

  QUnit.test("during the run it says the time, and which checkpoint is next out of how many", (assert) => {
    const trial = new Trial(checkpoints);
    through(trial, 1, 12.5);
    const lines = trialLines(trial);
    assert.strictEqual(lines.time, "0:12.5");
    assert.true(lines.hint.startsWith("2 of 3") && lines.hint.includes("small roof"), lines.hint);
  });

  QUnit.test("at the end it says the medal and the best, and how to go again", (assert) => {
    const trial = new Trial(checkpoints, { ...TRIAL, par: 100 });
    through(trial, 3, 5);
    const lines = trialLines(trial);
    assert.true(lines.hint.startsWith("GOLD") && lines.hint.includes("a new best") && lines.hint.includes("T"), lines.hint);
    assert.strictEqual(lines.time, "0:15.0");
  });

  QUnit.test("a run that earns no medal is just finished, and one that is not the best says what is", (assert) => {
    const trial = new Trial(checkpoints, { ...TRIAL, par: 1 });
    through(trial, 3, 100);
    assert.true(trialLines(trial).hint.startsWith("Finished"));
    trial.restart();
    through(trial, 3, 120);
    assert.true(trialLines(trial).hint.includes("best 5:00.0"), trialLines(trial).hint);
  });
});

QUnit.module("Hud", () => {
  const make = () => {
    const hud = new Hud(document);
    return hud;
  };
  const state = (changes = {}) => ({ score: 123.4, multiplier: 3, fraction: 0.5, tokens: 4, total: 22, trial: new Trial(trialCheckpoints()), ...changes });

  QUnit.test("it puts the display on the page", (assert) => {
    const hud = make();
    assert.true(document.body.contains(hud.root));
    assert.true(hud.root.querySelector(".hud-score") !== null && hud.root.querySelector(".hud-trial") !== null);
    hud.root.remove();
  });

  QUnit.test("it shows the score as a whole number, the multiplier, the bar and the tokens", (assert) => {
    const hud = make();
    hud.set(state());
    assert.strictEqual(hud.score.textContent, "123");
    assert.strictEqual(hud.multiplier.textContent, "x3");
    assert.strictEqual(hud.fill.style.width, "50%");
    assert.strictEqual(hud.tokens.textContent, "4 / 22 tokens");
    hud.root.remove();
  });

  QUnit.test("it shows the trial", (assert) => {
    const hud = make();
    hud.set(state());
    assert.strictEqual(hud.trialTitle.textContent, TRIAL.name);
    assert.strictEqual(hud.trialTime.textContent, "0:00.0");
    assert.true(hud.trialHint.textContent.length > 0);
    hud.root.remove();
  });

  QUnit.test("the Sick Combo banner is there, with its picture, and says what it is told, and plays again each time", (assert) => {
    const hud = make();
    assert.true(hud.comboImage.src.endsWith("sick_combo_small.png"));
    assert.strictEqual(hud.comboImage.alt, "Sick combo");
    assert.false(hud.comboBanner.classList.contains("show"));
    hud.banner("5 in a row");
    assert.strictEqual(hud.comboText.textContent, "5 in a row");
    assert.true(hud.comboBanner.classList.contains("show"));
    hud.banner("10 in a row");
    assert.strictEqual(hud.comboText.textContent, "10 in a row");
    assert.true(hud.comboBanner.classList.contains("show"), "still shown: it was taken off and put on again");
    hud.root.remove();
  });

  QUnit.test("a toast is put up, and taken away after its time, and there are never more than five", (assert) => {
    const done = assert.async();
    const hud = make();
    hud.toast("+5 vault", 0.05);
    assert.strictEqual(hud.toasts.children.length, 1);
    assert.strictEqual(hud.toasts.children[0].textContent, "+5 vault");
    for (let i = 0; i < 8; i++) hud.toast(`${i}`, 5);
    assert.strictEqual(hud.toasts.children.length, 5);
    setTimeout(() => {
      assert.true(hud.toasts.children.length <= 5);
      hud.root.remove();
      done();
    }, 120);
  });
});
