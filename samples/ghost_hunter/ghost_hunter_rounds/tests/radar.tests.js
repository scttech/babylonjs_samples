QUnit.module("the radar", () => {
  QUnit.test("a sweep that crosses a bearing, with the wrap at 360 taken into account", (assert) => {
    assert.true(sweepCrossed(10, 40, 30));
    assert.false(sweepCrossed(10, 40, 50));
    assert.false(sweepCrossed(10, 40, 5));
    assert.true(sweepCrossed(350, 20, 5), "over the top");
    assert.true(sweepCrossed(350, 20, 355));
    assert.false(sweepCrossed(350, 20, 300));
    assert.false(sweepCrossed(10, 10, 10), "no time, no crossing");
  });

  QUnit.test("something is lit when the arm goes over it, at the radius of how far it is, and not before", (assert) => {
    const radar = new Radar();
    const ghost = src("ghost", 0, 5.5, "g"); // straight ahead (bearing 0), half the range away
    radar.sweep = 340;
    assert.deepEqual(radar.update(0.1, [ghost], dPlayer), [], "the arm has not got there");
    const seen = radar.update((20 / 360) * DETECT.radar.period, [ghost], dPlayer);
    assert.strictEqual(seen.length, 1);
    assert.true(Math.abs(seen[0].radius - 0.5) < 1e-9);
    assert.true(seen[0].angle < 1 || seen[0].angle > 359);
    assert.strictEqual(seen[0].light, 1);
  });

  QUnit.test("something to the right is on the right of the screen of the radar, and something behind is at the bottom", (assert) => {
    const radar = new Radar();
    const right = radar.update(DETECT.radar.period, [src("ghost", 5, 0, "r"), src("ghost", 0, -5, "b")], dPlayer);
    const angleOf = (key) => right.find((b) => b.key === key).angle;
    assert.true(Math.abs(angleOf("r") - 90) < 1e-6);
    assert.true(Math.abs(angleOf("b") - 180) < 1e-6);
  });

  QUnit.test("a blip fades after it was lit, and goes", (assert) => {
    const radar = new Radar();
    const ghost = src("ghost", 0, 4, "g");
    radar.update(DETECT.radar.period, [ghost], dPlayer);
    assert.strictEqual(radar.blips.size, 1);
    radar.update(0.001, [], dPlayer);
    const light = radar.blips.get("g").light;
    radar.update(DETECT.radar.fade / 2, [], dPlayer);
    assert.true(radar.blips.get("g").light < light);
    radar.update(DETECT.radar.fade, [], dPlayer);
    assert.strictEqual(radar.blips.size, 0);
  });

  QUnit.test("what is out of the radar's range is not shown", (assert) => {
    const radar = new Radar();
    assert.deepEqual(radar.update(DETECT.radar.period, [src("ghost", 0, DETECT.radar.range + 2)], dPlayer), []);
  });

  QUnit.test("the arm turns once in a period, and the radar can be cleared", (assert) => {
    const radar = new Radar();
    radar.update(DETECT.radar.period / 4, [], dPlayer);
    assert.true(Math.abs(radar.sweep - 90) < 1e-9);
    radar.clear();
    assert.strictEqual(radar.sweep, 0);
  });
});
