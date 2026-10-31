QUnit.module("level and build-up", () => {
  QUnit.test("the level comes from the address, then the browser, then the table", (assert) => {
    assert.strictEqual(levelWanted("", null), "creepy");
    assert.strictEqual(levelWanted("?scare=gentle", "terrifying"), "gentle");
    assert.strictEqual(levelWanted("", "terrifying"), "terrifying");
    assert.strictEqual(levelWanted("?scare=nonsense", "nonsense"), "creepy", "a level that does not exist is not one");
  });

  QUnit.test("the levels get stronger, in order, in everything", (assert) => {
    const [a, b, c] = levelNames().map((name) => SCARE.levels[name]);
    for (const key of ["volume", "flash", "shake", "vibrate", "silence", "vignette"]) assert.true(a[key] <= b[key] && b[key] <= c[key], key);
    assert.strictEqual(a.flash, 0, "the gentlest level has no flashing at all");
    assert.strictEqual(a.shake, 0);
    assert.deepEqual(levelNames(), ["gentle", "creepy", "terrifying"]);
  });

  QUnit.test("the dread is nothing far away, everything at the lunge, and goes up as it comes", (assert) => {
    assert.strictEqual(dreadAt(20, 1.6), 0);
    assert.strictEqual(dreadAt(1.6, 1.6), 1);
    assert.strictEqual(dreadAt(0.5, 1.6), 1);
    let last = 0;
    for (let d = SCARE.tellDistance; d >= 1.6; d -= 0.2) {
      const dread = dreadAt(d, 1.6);
      assert.true(dread >= last);
      last = dread;
    }
  });

  QUnit.test("the heart is calm when it is quiet and fast at the edge, and never out of the table's range", (assert) => {
    assert.strictEqual(heartRate(0), SCARE.heartBeats[0]);
    assert.strictEqual(heartRate(1), SCARE.heartBeats[1]);
    for (let d = -1; d < 2; d += 0.1) assert.true(heartRate(d) >= SCARE.heartBeats[0] && heartRate(d) <= SCARE.heartBeats[1]);
  });

  QUnit.test("the room goes quiet as it comes near, and to nothing, and more completely at the higher levels", (assert) => {
    const creepy = SCARE.levels.creepy, gentle = SCARE.levels.gentle, terrifying = SCARE.levels.terrifying;
    assert.strictEqual(buildUp(0, creepy).ambient, 1);
    assert.true(buildUp(0.5, creepy).ambient < 1);
    assert.true(buildUp(1, terrifying).ambient < 0.01, "a silence");
    assert.true(buildUp(1, gentle).ambient > 0.1, "the gentlest never goes right out");
    assert.true(buildUp(0.8, terrifying).ambient < buildUp(0.8, gentle).ambient);
  });
});

QUnit.module("buzz and shake", () => {
  QUnit.test("a buzz is a pattern of milliseconds, longer for a touch than for a lunge, and nothing if the level has none", (assert) => {
    const creepy = SCARE.levels.creepy;
    const lunge = vibratePattern(SCARE.strikes.lunge, creepy), touch = vibratePattern(SCARE.strikes.touch, creepy);
    assert.true(touch.reduce((a, b) => a + b, 0) > lunge.reduce((a, b) => a + b, 0));
    assert.true(lunge.every((n) => n > 0 && Number.isInteger(n)));
    assert.deepEqual(vibratePattern(1, { vibrate: 0 }), []);
  });

  QUnit.test("the gentlest level buzzes less than the proper one", (assert) => {
    const total = (level) => vibratePattern(1, level).reduce((a, b) => a + b, 0);
    assert.true(total(SCARE.levels.gentle) < total(SCARE.levels.creepy));
    assert.true(total(SCARE.levels.creepy) < total(SCARE.levels.terrifying));
  });

  QUnit.test("a shake is nothing with no strength, and never more than the table's turn", (assert) => {
    assert.deepEqual(shakeOffset(1.2, 0), [0, 0]);
    for (let t = 0; t < 10; t += 0.01) {
      const [yaw, pitch] = shakeOffset(t, 1);
      assert.true(Math.abs(yaw) <= SCARE.shakeRadians + 1e-12 && Math.abs(pitch) <= SCARE.shakeRadians + 1e-12);
    }
  });

  QUnit.test("a shake moves, and does not go the same way for ever", (assert) => {
    const yaws = [];
    for (let t = 0; t < 2; t += 0.01) yaws.push(shakeOffset(t, 1)[0]);
    assert.true(Math.max(...yaws) > 0.01 && Math.min(...yaws) < -0.01);
  });

  QUnit.test("a shaken view still points about the same way, as a direction of length one, with the up at right angles", (assert) => {
    const view = { forward: [0, 0, 1], up: [0, 1, 0] };
    const shaken = shakeView(view, [0.03, 0.02]);
    assert.true(Math.abs(Math.hypot(...shaken.forward) - 1) < 1e-9);
    assert.true(shaken.forward[2] > 0.99);
    assert.true(Math.abs(shaken.forward[0]) > 0.01, "it has turned");
    assert.deepEqual(shakeView(view, [0, 0]).forward, [0, 0, 1]);
  });
});

QUnit.module("ScareSequence", () => {
  const make = (level = "creepy") => {
    const table = { ...SCARE, level };
    return new ScareSequence(table);
  };

  QUnit.test("nothing happens until there is a strike", (assert) => {
    const scare = make();
    const frame = scare.update(0.1);
    assert.strictEqual(frame.fired, null);
    assert.strictEqual(frame.flash, 0);
    assert.strictEqual(frame.shake, 0);
    assert.strictEqual(frame.ambient, 1);
  });

  QUnit.test("a strike fires once, with its buzz, and is a flash and a shake and a silence for that frame", (assert) => {
    const scare = make();
    assert.true(scare.trigger("lunge"));
    const frame = scare.update(0.016);
    assert.strictEqual(frame.fired.kind, "lunge");
    assert.true(frame.fired.vibrate.length > 0);
    assert.true(frame.flash > 0 && frame.shake > 0);
    assert.strictEqual(frame.ambient, 0);
    assert.strictEqual(scare.update(0.016).fired, null, "and only once");
  });

  QUnit.test("it fades: the flash and the shake die away, and the room comes back", (assert) => {
    const scare = make();
    scare.trigger("touch");
    const first = scare.update(0.016);
    let last = first;
    for (let t = 0; t < SCARE.duration.aftershock + 0.5; t += 0.05) {
      const frame = scare.update(0.05);
      assert.true(frame.flash <= last.flash + 1e-9, "never brighter than it was");
      assert.true(frame.ambient >= last.ambient - 1e-9, "never quieter than it was");
      last = frame;
    }
    assert.strictEqual(last.flash, 0);
    assert.strictEqual(last.shake, 0);
    assert.strictEqual(last.ambient, 1);
  });

  QUnit.test("a touch is harder than a lunge", (assert) => {
    const lunge = make(), touch = make();
    lunge.trigger("lunge");
    touch.trigger("touch");
    assert.true(touch.update(0.016).flash > lunge.update(0.016).flash);
  });

  QUnit.test("a second strike in the cooldown is the same scare, unless it is a harder one", (assert) => {
    const scare = make();
    scare.trigger("lunge");
    scare.update(0.016);
    assert.false(scare.trigger("lunge"));
    assert.true(scare.trigger("touch"), "a touch on top of a lunge is allowed");
    scare.update(0.016);
    assert.strictEqual(scare.strikes, 2);
  });

  QUnit.test("another strike is allowed once it is all over", (assert) => {
    const scare = make();
    scare.trigger("lunge");
    scare.update(0.016);
    for (let t = 0; t < 4; t += 0.1) scare.update(0.1);
    assert.true(scare.trigger("lunge"));
  });

  QUnit.test("the level scales everything: the gentlest level never flashes or shakes, and the strongest does most", (assert) => {
    const frameAt = (level) => {
      const scare = make(level);
      scare.trigger("touch");
      return scare.update(0.016);
    };
    const gentle = frameAt("gentle"), creepy = frameAt("creepy"), terrifying = frameAt("terrifying");
    assert.strictEqual(gentle.flash, 0);
    assert.strictEqual(gentle.shake, 0);
    assert.true(creepy.flash < terrifying.flash);
    assert.true(gentle.volume < creepy.volume && creepy.volume < terrifying.volume);
  });

  QUnit.test("the level can be changed while it is played", (assert) => {
    const scare = make("creepy");
    scare.setLevel("gentle");
    scare.trigger("touch");
    assert.strictEqual(scare.update(0.016).flash, 0);
    scare.setLevel("nonsense");
    assert.strictEqual(scare.level, SCARE.levels.gentle, "a level that does not exist changes nothing");
  });
});
