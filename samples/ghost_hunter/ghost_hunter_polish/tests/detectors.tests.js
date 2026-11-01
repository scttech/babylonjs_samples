QUnit.module("the gadgets in the hand", () => {
  const ghosts = [src("ghost", 0, 2, "g1")];

  QUnit.test("none is in the hand to begin with, selecting one picks it up and again puts it away", (assert) => {
    const d = new Detectors();
    assert.strictEqual(d.selected, null);
    assert.true(d.select("emf"));
    assert.strictEqual(d.selected, "emf");
    d.select("emf");
    assert.strictEqual(d.selected, null);
    assert.false(d.select("camera"), "there is no such gadget");
  });

  QUnit.test("cycling goes through all four and then none", (assert) => {
    const d = new Detectors();
    const seen = [d.cycle(), d.cycle(), d.cycle(), d.cycle(), d.cycle()];
    assert.deepEqual(seen, ["emf", "radar", "box", "thermal", null]);
  });

  QUnit.test("only the gadget in the hand has a reading", (assert) => {
    const d = new Detectors();
    d.select("emf");
    const frame = d.update(0.1, ghosts, dPlayer);
    assert.true(frame.emf.level > 0);
    assert.strictEqual(frame.radar, null);
    assert.strictEqual(frame.box, null);
    assert.strictEqual(frame.thermal, null);
    assert.strictEqual(d.update(0.1, ghosts, dPlayer).selected, "emf");
  });

  QUnit.test("the meter ticks while it reads something, faster when it reads more, and is quiet when it reads nothing", (assert) => {
    const count = (sources) => {
      const d = new Detectors();
      d.select("emf");
      let ticks = 0;
      for (let t = 0; t < 5; t += 0.05) {
        d.update(0.05, sources, dPlayer);
        ticks += d.take().filter((e) => e === "tick").length;
      }
      return ticks;
    };
    assert.strictEqual(count([]), 0);
    assert.true(count([src("ghost", 0, 1)]) > count([src("ghost", 0, 6)]));
  });

  QUnit.test("the dial is held between nothing and one, and the box says a word when tuned (once, with its age)", (assert) => {
    const d = new Detectors(DETECT, () => 0);
    d.select("box");
    d.tune(7);
    assert.strictEqual(d.dial, 1);
    d.tune(ghostFrequency("g1"));
    d.update(1, ghosts, dPlayer);
    assert.deepEqual(d.take(), ["word"]);
    assert.strictEqual(typeof d.lastWord, "string");
    assert.strictEqual(d.wordAge, 0);
    assert.deepEqual(d.take(), [], "told once");
    d.update(2, [], dPlayer);
    assert.true(d.wordAge >= 2);
  });

  QUnit.test("thermal has a temperature and a chill, and the radar a sweep and blips; putting the radar away clears it", (assert) => {
    const d = new Detectors();
    d.select("thermal");
    assert.true(d.update(0.1, ghosts, dPlayer).thermal.chill > 0);
    d.select("radar");
    const frame = d.update(DETECT.radar.period, ghosts, dPlayer);
    assert.strictEqual(frame.radar.blips.length, 1);
    d.select("radar");
    assert.strictEqual(d.radar.blips.size, 0);
  });
});
