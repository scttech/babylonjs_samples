// A stand-in for the browser's storage, that can be made to refuse.
const makeStorage = (start = {}, { refuse = false } = {}) => {
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
    removeItem(key) {
      delete kept[key];
    },
  };
};

QUnit.module("cleanRecords", () => {
  QUnit.test("nothing kept gives the defaults", (assert) => {
    assert.deepEqual(cleanRecords(null), RECORDS.defaults);
    assert.deepEqual(cleanRecords("a string"), RECORDS.defaults);
  });

  QUnit.test("good values are kept, and bad ones are replaced one by one", (assert) => {
    const clean = cleanRecords({ runner: "female", volume: "loud", lookSpeed: 0.004, trialBest: 41.5, scoreBest: 120.9, chainBest: -3, tokensBest: NaN, runs: 4 });
    assert.strictEqual(clean.runner, "female");
    assert.strictEqual(clean.volume, RECORDS.defaults.volume, "a word is not a volume");
    assert.strictEqual(clean.lookSpeed, 0.004);
    assert.strictEqual(clean.trialBest, 41.5);
    assert.strictEqual(clean.scoreBest, 120, "whole numbers");
    assert.strictEqual(clean.chainBest, 0, "never below nothing");
    assert.strictEqual(clean.tokensBest, 0);
    assert.strictEqual(clean.runs, 4);
  });

  QUnit.test("a runner that is not one of the runners is the default, and a setting is held to its limits", (assert) => {
    assert.strictEqual(cleanRecords({ runner: "robot" }).runner, "male");
    assert.strictEqual(cleanRecords({ volume: 7 }).volume, 1);
    assert.strictEqual(cleanRecords({ volume: -1 }).volume, 0);
    assert.strictEqual(cleanRecords({ lookSpeed: 5 }).lookSpeed, RECORDS.limits.lookSpeed[1]);
  });

  QUnit.test("a best time of nothing or less is no time at all", (assert) => {
    assert.strictEqual(cleanRecords({ trialBest: 0 }).trialBest, null);
    assert.strictEqual(cleanRecords({ trialBest: -5 }).trialBest, null);
  });
});

QUnit.module("Records", () => {
  QUnit.test("a new player has the defaults", (assert) => {
    const records = new Records(makeStorage());
    assert.strictEqual(records.runner, "male");
    assert.strictEqual(records.trialBest, null);
    assert.strictEqual(records.runs, 0);
  });

  QUnit.test("what is kept is what is read back the next time", (assert) => {
    const storage = makeStorage();
    const first = new Records(storage);
    first.set("runner", "female");
    first.noteTrial(44.2);
    first.noteRun({ score: 300, chain: 9, tokens: 5 });
    const second = new Records(storage);
    assert.strictEqual(second.runner, "female");
    assert.strictEqual(second.trialBest, 44.2);
    assert.strictEqual(second.scoreBest, 300);
    assert.strictEqual(second.chainBest, 9);
    assert.strictEqual(second.runs, 1);
  });

  QUnit.test("nonsense in the storage is not believed, and does not stop the game", (assert) => {
    assert.strictEqual(new Records(makeStorage({ [RECORDS.key]: "{not json" })).runner, "male");
    assert.strictEqual(new Records(makeStorage({ [RECORDS.key]: '{"runner":"female","volume":2}' })).volume, 1);
  });

  QUnit.test("storage that refuses is allowed to: the records are for this visit only", (assert) => {
    const records = new Records(makeStorage({}, { refuse: true }));
    assert.strictEqual(records.runner, "male");
    assert.false(records.save());
    assert.true(records.noteTrial(50), "it still knows a best, for now");
    assert.strictEqual(records.trialBest, 50);
  });

  QUnit.test("a setting is held to its limits and an unknown one is ignored", (assert) => {
    const records = new Records(makeStorage());
    assert.strictEqual(records.set("volume", 3), 1);
    assert.strictEqual(records.set("runner", "robot"), "male");
  });

  QUnit.test("the first trial is a best, a slower one is not, a faster one is", (assert) => {
    const records = new Records(makeStorage());
    assert.true(records.noteTrial(60));
    assert.false(records.noteTrial(61));
    assert.false(records.noteTrial(60), "the same time is not better");
    assert.true(records.noteTrial(59.9));
    assert.strictEqual(records.trialBest, 59.9);
    assert.false(records.noteTrial(0), "a time of nothing is not a run");
  });

  QUnit.test("a run says which of its numbers are new bests, and keeps the better of each", (assert) => {
    const records = new Records(makeStorage());
    assert.deepEqual(records.noteRun({ score: 100, chain: 4, tokens: 2 }), ["score", "chain", "tokens"]);
    assert.deepEqual(records.noteRun({ score: 80, chain: 7, tokens: 1 }), ["chain"]);
    assert.strictEqual(records.scoreBest, 100);
    assert.strictEqual(records.chainBest, 7);
    assert.strictEqual(records.runs, 2);
  });

  QUnit.test("clearing the bests keeps the settings", (assert) => {
    const records = new Records(makeStorage());
    records.set("runner", "female");
    records.noteTrial(40);
    records.noteRun({ score: 10 });
    records.clearBests();
    assert.strictEqual(records.trialBest, null);
    assert.strictEqual(records.scoreBest, 0);
    assert.strictEqual(records.runner, "female");
  });

  QUnit.test("the page's storage is used when it works, and a stand-in when it does not", (assert) => {
    const stand = pageStorage({ localStorage: { setItem() { throw new Error("full"); }, removeItem() {}, getItem() { return null; } } });
    stand.setItem("a", "1");
    assert.strictEqual(stand.getItem("a"), "1");
    const real = makeStorage();
    assert.strictEqual(pageStorage({ localStorage: real }), real);
    assert.strictEqual(pageStorage(null).getItem("nothing"), null);
  });
});
