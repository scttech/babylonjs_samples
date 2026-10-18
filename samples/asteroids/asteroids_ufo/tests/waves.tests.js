QUnit.module("Waves difficulty", () => {
  QUnit.test("wave 1 starts with four rocks, then one more each wave", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.rocksFor(1), 4);
    assert.strictEqual(waves.rocksFor(2), 5);
    assert.strictEqual(waves.rocksFor(3), 6);
  });

  QUnit.test("the number of rocks stops growing at nine", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.rocksFor(6), 9);
    assert.strictEqual(waves.rocksFor(7), 9);
    assert.strictEqual(waves.rocksFor(50), 9);
  });

  QUnit.test("wave 1 runs at normal speed and each wave after is faster", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.speedScaleFor(1), 1);
    assert.true(waves.speedScaleFor(2) > waves.speedScaleFor(1));
    assert.true(Math.abs(waves.speedScaleFor(2) - 1.12) < 1e-9);
    assert.true(Math.abs(waves.speedScaleFor(3) - 1.24) < 1e-9);
  });

  QUnit.test("rocks never get more than twice as fast", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.speedScaleFor(20), 2);
    assert.strictEqual(waves.speedScaleFor(500), 2);
  });
});

QUnit.module("Waves progression", () => {
  QUnit.test("starts before wave 1, not waiting", (assert) => {
    const waves = new Waves();

    assert.strictEqual(waves.wave, 0);
    assert.false(waves.between);
  });

  QUnit.test("rocks on screen means nothing happens", (assert) => {
    const waves = new Waves();

    assert.false(waves.update(5, 3));
    assert.strictEqual(waves.wave, 0);
    assert.false(waves.between);
  });

  QUnit.test("an empty screen starts the breather", (assert) => {
    const waves = new Waves({ breather: 2 });

    assert.false(waves.update(0.1, 0), "not yet");
    assert.true(waves.between);
  });

  QUnit.test("the next wave starts once the breather has run out", (assert) => {
    const waves = new Waves({ breather: 2 });

    assert.false(waves.update(1, 0), "1s into a 2s breather");
    assert.false(waves.update(0.9, 0), "1.9s");
    assert.true(waves.update(0.2, 0), "2.1s: time to start");
    assert.strictEqual(waves.wave, 1);
    assert.false(waves.between, "the breather is over");
  });

  QUnit.test("a new wave is only announced once", (assert) => {
    const waves = new Waves({ breather: 1 });
    waves.update(1.5, 0); // starts wave 1

    // The caller spawns rocks, so the next frame there are some.
    assert.false(waves.update(0.016, 4));
    assert.strictEqual(waves.wave, 1);
  });

  QUnit.test("clearing a wave leads to the next, and the count keeps climbing", (assert) => {
    const waves = new Waves({ breather: 1 });

    waves.update(1.5, 0);
    assert.strictEqual(waves.wave, 1);

    waves.update(0.016, 4); // wave 1 is underway
    assert.true(waves.update(1.5, 0), "cleared, then the breather passes");
    assert.strictEqual(waves.wave, 2);
  });

  QUnit.test("shooting a rock during the breather cancels it", (assert) => {
    const waves = new Waves({ breather: 2 });
    waves.update(1, 0);
    assert.true(waves.between);

    waves.update(0.1, 1); // something is on screen again

    assert.false(waves.between);
  });

  QUnit.test("reset() goes back to before wave 1", (assert) => {
    const waves = new Waves({ breather: 1 });
    waves.update(1.5, 0);
    waves.update(0.5, 0);

    waves.reset();

    assert.strictEqual(waves.wave, 0);
    assert.false(waves.between);
    assert.false(waves.update(0.5, 0), "the breather starts over from the full length");
  });
});
