QUnit.module("dustFor", () => {
  QUnit.test("a small fall raises no dust", (assert) => {
    assert.strictEqual(dustFor(0), null);
    assert.strictEqual(dustFor(DUST.minImpact - 0.1), null);
    assert.strictEqual(dustFor(NaN), null);
  });

  QUnit.test("the dust grows with the fall, from the least to the most, and no further", (assert) => {
    const small = dustFor(DUST.minImpact);
    const big = dustFor(DUST.hardImpact);
    const huge = dustFor(DUST.hardImpact * 3);
    assert.strictEqual(small.count, DUST.count[0]);
    assert.strictEqual(big.count, DUST.count[1]);
    assert.deepEqual(huge, big, "a longer fall than the most is the most");
    assert.true(big.size > small.size && big.spread > small.spread);
    const middle = dustFor((DUST.minImpact + DUST.hardImpact) / 2);
    assert.true(middle.count > small.count && middle.count < big.count);
  });

  QUnit.test("the dust never has more puffs than the system can hold", (assert) => {
    assert.true(DUST.count[1] * 4 <= DUST.maxParticles, "four big bursts at once still fit");
  });
});

QUnit.module("Dust", () => {
  QUnit.test("a burst adds puffs to the system, at the place, and says how many", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const dust = new Dust(scene);
    assert.strictEqual(dust.system.emitRate, 0, "it makes nothing by itself");
    const made = dust.burst(3, 1, -2, dustFor(15));
    assert.true(made > DUST.count[0]);
    assert.strictEqual(dust.system.manualEmitCount, made);
    assert.deepEqual([dust.system.emitter.x, dust.system.emitter.y, dust.system.emitter.z], [3, 1, -2]);
    assert.strictEqual(dust.bursts, 1);
    dust.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("no shape is no burst", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const dust = new Dust(scene);
    assert.strictEqual(dust.burst(0, 0, 0, null), 0);
    assert.strictEqual(dust.system.manualEmitCount, 0);
    dust.dispose();
    scene.dispose();
    engine.dispose();
  });
});
