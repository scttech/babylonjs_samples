const journalStore = (start = {}, { refuse = false } = {}) => {
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

QUnit.module("cleanJournal", () => {
  QUnit.test("nothing kept is an empty journal with every kind in it", (assert) => {
    const clean = cleanJournal(null);
    assert.deepEqual(Object.keys(clean.entries), JOURNAL.kinds);
    assert.deepEqual([clean.played, clean.won, clean.best, clean.scores.length], [0, 0, 0, 0]);
  });

  QUnit.test("only whole numbers from nothing up are believed, none can have been dealt with that were not met, and kinds that are not there are dropped", (assert) => {
    const clean = cleanJournal({ entries: { ghost: { met: 3.7, dealt: -2 }, mummy: { met: 1, dealt: 5 }, dragon: { met: 9, dealt: 9 }, doll: { met: "many" } }, played: "x", won: 2, best: 4 });
    assert.deepEqual(clean.entries.ghost, { met: 3, dealt: 0 });
    assert.deepEqual(clean.entries.mummy, { met: 5, dealt: 5 });
    assert.strictEqual(clean.entries.dragon, undefined);
    assert.deepEqual(clean.entries.doll, { met: 0, dealt: 0 });
    assert.deepEqual([clean.played, clean.won, clean.best], [0, 2, 4]);
  });

  QUnit.test("the scores are numbers over nothing, the best first, and no more than are kept", (assert) => {
    const clean = cleanJournal({ scores: [50, "x", 900, -4, 300, 20, 10, 700, 5] });
    assert.deepEqual(clean.scores, [900, 700, 300, 50, 20]);
    assert.strictEqual(clean.scores.length, JOURNAL.top);
  });
});

QUnit.module("Journal", () => {
  QUnit.test("what was kept is what is read back, and the first of a kind is told", (assert) => {
    const store = journalStore();
    const first = new Journal(store);
    assert.true(first.noteMet("ghost"), "the first ghost ever");
    assert.false(first.noteMet("ghost"));
    first.noteDealt("ghost");
    first.noteMet("spider");
    const second = new Journal(store);
    assert.deepEqual(second.entries.ghost, { met: 2, dealt: 1 });
    assert.strictEqual(second.entries.spider.met, 1);
  });

  QUnit.test("a kind that is not in the journal is ignored", (assert) => {
    const journal = new Journal(journalStore());
    assert.false(journal.noteMet("dragon"));
    journal.noteDealt("dragon");
    assert.strictEqual(journal.entries.dragon, undefined);
  });

  QUnit.test("storage that refuses is allowed to, and nonsense is not believed", (assert) => {
    const journal = new Journal(journalStore({}, { refuse: true }));
    assert.false(journal.save());
    journal.noteMet("ghost");
    assert.strictEqual(journal.entries.ghost.met, 1, "it still counts, for this visit");
    assert.strictEqual(new Journal(journalStore({ [JOURNAL.key]: "{no json" })).played, 0);
  });

  QUnit.test("a won round makes the scores, a new best says so, and the best round reached is kept", (assert) => {
    const journal = new Journal(journalStore());
    assert.true(journal.noteRound({ number: 1, outcome: "won", score: 300 }), "the first is the best");
    assert.false(journal.noteRound({ number: 2, outcome: "won", score: 200 }));
    assert.true(journal.noteRound({ number: 3, outcome: "won", score: 450 }));
    assert.deepEqual(journal.scores, [450, 300, 200]);
    assert.strictEqual(journal.best, 3);
    assert.deepEqual([journal.played, journal.won], [3, 3]);
  });

  QUnit.test("a lost round counts as played, makes no score, and the best reached is the round before it", (assert) => {
    const journal = new Journal(journalStore());
    journal.noteRound({ number: 1, outcome: "won", score: 100 });
    journal.noteRound({ number: 2, outcome: "lost", reason: "health", score: 0 });
    journal.noteRound({ number: 4, outcome: "lost", reason: "sanity", score: 0 });
    assert.deepEqual([journal.played, journal.won, journal.best], [3, 1, 3]);
    assert.deepEqual(journal.scores, [100]);
  });

  QUnit.test("the pages are the kinds that have been met, in order, and clearing empties them", (assert) => {
    const journal = new Journal(journalStore());
    journal.noteMet("mummy");
    journal.noteMet("ghost");
    journal.noteDealt("ghost");
    assert.deepEqual(journal.pages().map((p) => p.kind), ["ghost", "mummy"]);
    assert.deepEqual(journal.pages()[0], { kind: "ghost", met: 1, dealt: 1 });
    journal.clear();
    assert.deepEqual(journal.pages(), []);
    assert.strictEqual(journal.played, 0);
  });

  QUnit.test("the page's storage is used when it works, and a stand-in when it does not", (assert) => {
    const real = journalStore();
    assert.strictEqual(journalStorage({ localStorage: real }), real);
    const stand = journalStorage({ localStorage: { setItem() { throw new Error("full"); }, removeItem() {}, getItem() { return null; } } });
    stand.setItem("a", "1");
    assert.strictEqual(stand.getItem("a"), "1");
    assert.strictEqual(journalStorage(null).getItem("none"), null);
  });
});
