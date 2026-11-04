QUnit.module("the DETAIL table", () => {
  QUnit.test("there are three levels, lowest first, and each is named", (assert) => {
    assert.deepEqual(DETAIL_ORDER, ["low", "medium", "high"]);
    for (const level of DETAIL_ORDER) assert.true(DETAIL[level].name.length > 0, level);
  });

  QUnit.test("each level draws at least as many pixels as the one below it, and has at least its clouds", (assert) => {
    for (let i = 1; i < DETAIL_ORDER.length; i++) {
      const below = DETAIL[DETAIL_ORDER[i - 1]];
      const level = DETAIL[DETAIL_ORDER[i]];

      assert.true(level.pixelRatio >= below.pixelRatio, DETAIL_ORDER[i]);
      assert.true(level.clouds || !below.clouds, DETAIL_ORDER[i]);
    }
  });

  QUnit.test("the lowest draws a pixel for each of the page's, and the highest is as sharp as the old game was", (assert) => {
    assert.strictEqual(DETAIL.low.pixelRatio, 1);
    assert.strictEqual(DETAIL.high.pixelRatio, 2);
  });
});

QUnit.module("choosing a level", () => {
  QUnit.test("the address comes first, then what the player chose before, then the device", (assert) => {
    assert.strictEqual(startingDetail({ query: "low", stored: "high", touch: false }), "low");
    assert.strictEqual(startingDetail({ query: null, stored: "medium", touch: false }), "medium");
    assert.strictEqual(startingDetail({ touch: true }), "medium");
    assert.strictEqual(startingDetail({ touch: false }), "high");
  });

  QUnit.test("something that isn't a level is not one", (assert) => {
    assert.strictEqual(startingDetail({ query: "ultra", stored: "bogus", touch: false }), "high");
    assert.strictEqual(startingDetail({ query: "toString" }), "high", "and a name that an object has is not a level either");
  });

  QUnit.test("nextDetail goes round: low, medium, high, low", (assert) => {
    assert.strictEqual(nextDetail("low"), "medium");
    assert.strictEqual(nextDetail("medium"), "high");
    assert.strictEqual(nextDetail("high"), "low");
  });

  QUnit.test("lowerDetail goes down one, and stops at the bottom", (assert) => {
    assert.strictEqual(lowerDetail("high"), "medium");
    assert.strictEqual(lowerDetail("medium"), "low");
    assert.strictEqual(lowerDetail("low"), "low");
  });
});

QUnit.module("scalingFor", () => {
  QUnit.test("a screen that is sharper than the level draws is drawn at the level's ratio", (assert) => {
    assert.strictEqual(scalingFor("high", 3), 0.5);
    assert.strictEqual(scalingFor("medium", 3), 1 / 1.5);
    assert.strictEqual(scalingFor("low", 3), 1);
  });

  QUnit.test("a screen that is less sharp than the level is drawn pixel for pixel, and never at more than it has", (assert) => {
    assert.strictEqual(scalingFor("high", 1), 1);
    assert.strictEqual(scalingFor("high", 1.25), 1 / 1.25);
    assert.strictEqual(scalingFor("high", undefined), 1);
  });

  QUnit.test("a lower level is never sharper", (assert) => {
    for (const ratio of [1, 1.5, 2, 3]) {
      for (let i = 1; i < DETAIL_ORDER.length; i++) assert.true(scalingFor(DETAIL_ORDER[i - 1], ratio) >= scalingFor(DETAIL_ORDER[i], ratio), `${DETAIL_ORDER[i]} at ${ratio}`);
    }
  });
});

QUnit.module("FrameMeter", () => {
  const feed = (meter, seconds, dt) => {
    for (let t = 0; t < seconds; t += dt) meter.add(dt);
  };

  QUnit.test("says nothing is slow until it has seen enough frames to say", (assert) => {
    const meter = new FrameMeter();
    feed(meter, 1, 0.1);

    assert.false(meter.slow);
  });

  QUnit.test("a game at sixty frames a second is not slow, and one at fifteen is", (assert) => {
    const quick = new FrameMeter();
    const slow = new FrameMeter();
    feed(quick, 5, 1 / 60);
    feed(slow, 5, 1 / 15);

    assert.false(quick.slow);
    assert.true(slow.slow);
  });

  QUnit.test("the line is the one in the table", (assert) => {
    const above = new FrameMeter();
    const below = new FrameMeter();
    feed(above, 6, 1 / (FRAMES.slowFps + 3));
    feed(below, 6, 1 / (FRAMES.slowFps - 3));

    assert.false(above.slow);
    assert.true(below.slow);
  });

  QUnit.test("one long frame among many is a stutter, and not a slow game", (assert) => {
    const meter = new FrameMeter();
    feed(meter, 4, 1 / 60);
    meter.add(0.8);
    feed(meter, 1, 1 / 60);

    assert.false(meter.slow);
  });

  QUnit.test("it only remembers the last few seconds: a game that was slow and is not, is not", (assert) => {
    const meter = new FrameMeter();
    feed(meter, 5, 1 / 10);
    assert.true(meter.slow);
    feed(meter, 8, 1 / 60);

    assert.false(meter.slow);
    assert.true(meter.total < FRAMES.seconds + 0.2, "and it has not kept them all");
  });

  QUnit.test("reset forgets what it has seen", (assert) => {
    const meter = new FrameMeter();
    feed(meter, 5, 1 / 10);
    meter.reset();

    assert.false(meter.slow);
    assert.strictEqual(meter.total, 0);
  });
});

QUnit.module("Preferences", () => {
  const memory = () => {
    const data = {};
    return { getItem: (key) => (key in data ? data[key] : null), setItem: (key, value) => (data[key] = value) };
  };

  QUnit.test("have no detail until one is chosen", (assert) => {
    assert.strictEqual(new Preferences(memory()).detail, null);
  });

  QUnit.test("keep a choice, and a new set on the same storage has it", (assert) => {
    const storage = memory();
    new Preferences(storage).detail = "low";

    assert.strictEqual(new Preferences(storage).detail, "low");
  });

  QUnit.test("whether the sound is off is kept too, and is on until it is turned off", (assert) => {
    const storage = memory();
    const preferences = new Preferences(storage);
    assert.false(preferences.muted);
    preferences.muted = true;

    assert.true(new Preferences(storage).muted);
    preferences.muted = false;
    assert.false(new Preferences(storage).muted);
  });

  QUnit.test("the two choices do not undo each other", (assert) => {
    const storage = memory();
    const preferences = new Preferences(storage);
    preferences.detail = "low";
    preferences.muted = true;

    const again = new Preferences(storage);
    assert.strictEqual(again.detail, "low");
    assert.true(again.muted);
  });

  QUnit.test("a choice that isn't a level is not kept", (assert) => {
    const preferences = new Preferences(memory());
    preferences.detail = "medium";
    preferences.detail = "ultra";

    assert.strictEqual(preferences.detail, "medium");
  });

  QUnit.test("storage that has nonsense in it, or can't be written to, is no preferences and no error", (assert) => {
    const broken = { getItem: () => "{nope", setItem: () => {} };
    const full = { getItem: () => null, setItem: () => { throw new Error("full"); } };
    const stale = { getItem: () => JSON.stringify({ detail: "ultra" }), setItem: () => {} };

    assert.strictEqual(new Preferences(broken).detail, null);
    assert.strictEqual(new Preferences(stale).detail, null);
    const preferences = new Preferences(full);
    preferences.detail = "low";
    assert.strictEqual(preferences.detail, "low", "it is kept until the page is closed");
  });
});
