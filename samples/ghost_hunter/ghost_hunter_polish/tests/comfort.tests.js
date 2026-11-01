const comfortStore = (start = {}, { refuse = false } = {}) => {
  const kept = { ...start };
  return {
    kept,
    getItem(key) {
      if (refuse) throw new Error("no storage");
      return key in kept ? kept[key] : null;
    },
    setItem(key, value) {
      if (refuse) throw new Error("no storage");
      kept[key] = String(value);
    },
  };
};

QUnit.module("calm, as a level", () => {
  QUnit.test("calm takes the damage, the pops and the strikes out, and the intensity down; any other level is as it was", (assert) => {
    const calm = comfortFor("calm");
    assert.strictEqual(calm.damage, 0);
    assert.false(calm.pops);
    assert.false(calm.strikes);
    assert.true(calm.intensity < 1);
    for (const name of ["gentle", "creepy", "terrifying", "nonsense"]) assert.deepEqual(comfortFor(name), COMFORT.normal, name);
  });

  QUnit.test("the calm row has nothing that flashes, shakes or buzzes, and says what it is", (assert) => {
    assert.strictEqual(CALM_LEVEL.flash, 0);
    assert.strictEqual(CALM_LEVEL.shake, 0);
    assert.strictEqual(CALM_LEVEL.vibrate, 0);
    assert.true(CALM_LEVEL.calm);
    assert.true(CALM_LEVEL.note.includes("No scares"));
  });

  QUnit.test("it has every number that the other levels have, so the scare code can read it", (assert) => {
    for (const key of Object.keys(SCARE.levels.creepy)) assert.true(key in CALM_LEVEL, key);
  });
});

QUnit.module("effectiveLevel and the settings", () => {
  const creepy = SCARE.levels.creepy;

  QUnit.test("with nothing reduced, the level is as it was", (assert) => {
    assert.deepEqual(effectiveLevel(creepy, { reduceMotion: false, vibration: true }), creepy);
  });

  QUnit.test("reducing motion takes out the shake and the flash, and leaves the rest", (assert) => {
    const level = effectiveLevel(creepy, { reduceMotion: true, vibration: true });
    assert.strictEqual(level.shake, 0);
    assert.strictEqual(level.flash, 0);
    assert.strictEqual(level.volume, creepy.volume);
    assert.strictEqual(level.vibrate, creepy.vibrate);
    assert.true(creepy.shake > 0, "and the level itself is not changed");
  });

  QUnit.test("no vibration takes out the buzz", (assert) => {
    assert.strictEqual(effectiveLevel(creepy, { reduceMotion: false, vibration: false }).vibrate, 0);
  });

  QUnit.test("the picture does not sway when motion is reduced", (assert) => {
    assert.true(swayAllowed({ reduceMotion: false }));
    assert.false(swayAllowed({ reduceMotion: true }));
  });

  QUnit.test("a first visit begins with motion reduced if the phone says so", (assert) => {
    assert.deepEqual(firstSettings(true), { reduceMotion: true, vibration: true });
    assert.deepEqual(firstSettings(false), { reduceMotion: false, vibration: true });
  });
});

QUnit.module("ComfortSettings", () => {
  QUnit.test("a new player has the defaults, and the phone's wish to reduce motion", (assert) => {
    const settings = new ComfortSettings(comfortStore(), true);
    assert.true(settings.reduceMotion);
    assert.true(settings.vibration);
  });

  QUnit.test("what was chosen is kept and read back, and it wins over what the phone says", (assert) => {
    const store = comfortStore();
    const first = new ComfortSettings(store, true);
    assert.true(first.set("reduceMotion", false));
    first.set("vibration", false);
    const second = new ComfortSettings(store, true);
    assert.false(second.reduceMotion);
    assert.false(second.vibration);
  });

  QUnit.test("only the two settings can be set, to a yes or a no", (assert) => {
    const settings = new ComfortSettings(comfortStore(), false);
    assert.false(settings.set("volume", true));
    assert.strictEqual(settings.volume, undefined);
    settings.set("vibration", 0);
    assert.strictEqual(settings.vibration, false);
  });

  QUnit.test("nonsense in the storage is not believed, and storage that refuses is allowed to", (assert) => {
    assert.true(new ComfortSettings(comfortStore({ [COMFORT.key]: "{not json" })).vibration);
    assert.true(new ComfortSettings(comfortStore({ [COMFORT.key]: JSON.stringify({ reduceMotion: "yes", vibration: 3 }) })).vibration, "a word is not a yes");
    const refused = new ComfortSettings(comfortStore({}, { refuse: true }), false);
    assert.false(refused.set("vibration", false), "not kept");
    assert.false(refused.vibration, "but it is so for this visit");
  });
});
