// A stand-in for localStorage: a Map with the two methods the game uses.
const profileMemory = () => {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
};

// One that refuses to save, as a private window can.
const profileBroken = () => ({
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("full");
  },
});

QUnit.module("cleanName", () => {
  QUnit.test("keeps an ordinary name as it is", (assert) => {
    assert.strictEqual(cleanName("Ana"), "Ana");
  });

  QUnit.test("trims the spaces round it and squeezes the ones inside", (assert) => {
    assert.strictEqual(cleanName("   Ana    Maria  "), "Ana Maria");
  });

  QUnit.test("cuts a long name to NAME_MAX characters, with no space left on the end", (assert) => {
    assert.strictEqual(cleanName("abcdefghijklmnopqrstuvwxyz"), "abcdefghijkl");
    assert.strictEqual(cleanName("abcdefghijk mnop"), "abcdefghijk");
  });

  QUnit.test("an empty name, spaces, nothing at all, or something that isn't text, is the default name", (assert) => {
    for (const name of ["", "     ", undefined, null]) assert.strictEqual(cleanName(name), DEFAULT_NAME);
  });

  QUnit.test("numbers are turned into text", (assert) => {
    assert.strictEqual(cleanName(42), "42");
  });

  QUnit.test("markup is only text: it is kept as it is, for the page to show as text", (assert) => {
    assert.strictEqual(cleanName("<b>hi</b>"), "<b>hi</b>");
  });
});

QUnit.module("readJson and writeJson", () => {
  QUnit.test("a value that is written can be read back", (assert) => {
    const storage = profileMemory();

    assert.true(writeJson(storage, "k", { a: [1, 2] }));

    assert.deepEqual(readJson(storage, "k"), { a: [1, 2] });
  });

  QUnit.test("reading what was never saved gives null", (assert) => {
    assert.strictEqual(readJson(profileMemory(), "nothing"), null);
  });

  QUnit.test("reading something that isn't JSON gives null, not an error", (assert) => {
    const storage = profileMemory();
    storage.setItem("k", "{oops");

    assert.strictEqual(readJson(storage, "k"), null);
  });

  QUnit.test("with no storage at all, reading gives null and writing says it failed", (assert) => {
    assert.strictEqual(readJson(null, "k"), null);
    assert.false(writeJson(null, "k", 1));
  });

  QUnit.test("storage that throws is the same as none", (assert) => {
    const storage = profileBroken();

    assert.strictEqual(readJson(storage, "k"), null);
    assert.false(writeJson(storage, "k", 1));
  });
});

QUnit.module("Profile", () => {
  QUnit.test("starts as the default name and color", (assert) => {
    const profile = new Profile({ storage: profileMemory() });

    assert.strictEqual(profile.name, DEFAULT_NAME);
    assert.strictEqual(profile.color, DEFAULT_COLOR);
  });

  QUnit.test("a saved profile comes back in a new one", (assert) => {
    const storage = profileMemory();
    const first = new Profile({ storage });
    first.name = "Ana";
    first.color = "ocean";

    assert.true(first.save());
    const second = new Profile({ storage });

    assert.strictEqual(second.name, "Ana");
    assert.strictEqual(second.color, "ocean");
  });

  QUnit.test("uses its own key, so it doesn't mix with other saves", (assert) => {
    const storage = profileMemory();
    new Profile({ storage }).save();

    assert.true(storage.data.has(PROFILE_KEY));
    assert.strictEqual(storage.data.size, 1);
  });

  QUnit.test("a saved color that no longer exists becomes the default", (assert) => {
    const storage = profileMemory();
    storage.setItem(PROFILE_KEY, JSON.stringify({ name: "Ana", color: "plaid" }));

    const profile = new Profile({ storage });

    assert.strictEqual(profile.color, DEFAULT_COLOR);
    assert.strictEqual(profile.name, "Ana");
  });

  QUnit.test("a saved name is cleaned, in case the save was edited", (assert) => {
    const storage = profileMemory();
    storage.setItem(PROFILE_KEY, JSON.stringify({ name: "   a very long name indeed   ", color: "neon" }));

    assert.strictEqual(new Profile({ storage }).name, "a very long");
  });

  QUnit.test("a damaged save is ignored", (assert) => {
    for (const text of ["{oops", "42", "null", "[1,2]", '"text"']) {
      const storage = profileMemory();
      storage.setItem(PROFILE_KEY, text);

      const profile = new Profile({ storage });

      assert.strictEqual(profile.name, DEFAULT_NAME, text);
      assert.strictEqual(profile.color, DEFAULT_COLOR, text);
    }
  });

  QUnit.test("works without storage: it just can't remember", (assert) => {
    const profile = new Profile({ storage: null });
    profile.name = "Ana";

    assert.false(profile.save());
    assert.strictEqual(profile.name, "Ana");
  });

  QUnit.test("storage that throws doesn't stop the game", (assert) => {
    const profile = new Profile({ storage: profileBroken() });

    assert.strictEqual(profile.name, DEFAULT_NAME);
    assert.false(profile.save());
  });
});
