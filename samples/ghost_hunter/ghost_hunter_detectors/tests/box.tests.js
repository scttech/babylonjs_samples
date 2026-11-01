QUnit.module("the spirit box", () => {
  QUnit.test("a ghost has a frequency of its own, always on the dial, the same each time", (assert) => {
    for (const key of ["g1", "g2", "g3", "g17", "g400"]) {
      const f = ghostFrequency(key);
      assert.true(f >= DETECT.box.lowest && f <= DETECT.box.highest, `${key}: ${f}`);
      assert.strictEqual(f, ghostFrequency(key));
    }
    assert.notStrictEqual(ghostFrequency("g1"), ghostFrequency("g2"));
  });

  QUnit.test("with no ghost in reach it is all static", (assert) => {
    const heard = boxHears(0.5, [src("ghost", 0, 20, "g")], dPlayer, 1, () => 0);
    assert.deepEqual([heard.lock, heard.hiss, heard.nearest], [0, 1, null]);
  });

  QUnit.test("creatures are not heard, only ghosts", (assert) => {
    assert.strictEqual(boxHears(0.5, [src("mummy", 0, 2, "m")], dPlayer, 1, () => 0).nearest, null);
  });

  QUnit.test("tuned exactly, the lock is full and the static is quiet; tuned away, there is no lock and the static is full", (assert) => {
    const ghost = src("ghost", 0, 2, "g1");
    const f = ghostFrequency("g1");
    const on = boxHears(f, [ghost], dPlayer, 0.1, () => 0.99);
    assert.strictEqual(on.lock, 1);
    assert.strictEqual(on.hiss, DETECT.box.hiss);
    const off = boxHears(f + DETECT.box.tolerance * 2, [ghost], dPlayer, 0.1, () => 0);
    assert.strictEqual(off.lock, 0);
    assert.strictEqual(off.hiss, 1);
    assert.strictEqual(off.word, undefined, "a word needs a lock");
  });

  QUnit.test("a word is said when the chance comes up, and not when it does not", (assert) => {
    const ghost = src("ghost", 0, 1, "g1");
    const f = ghostFrequency("g1");
    assert.strictEqual(typeof boxHears(f, [ghost], dPlayer, 1, () => 0).word, "string");
    assert.strictEqual(boxHears(f, [ghost], dPlayer, 1, () => 0.999).word, undefined);
  });

  QUnit.test("a ghost that is near says the harder words, and one that is far the gentler", (assert) => {
    const f = ghostFrequency("g1");
    const near = boxHears(f, [src("ghost", 0, 1, "g1")], dPlayer, 100, () => 0).word;
    const far = boxHears(f, [src("ghost", 0, 7, "g1")], dPlayer, 100, () => 0).word;
    assert.true(DETECT.words.near.includes(near), near);
    assert.true(DETECT.words.far.includes(far), far);
  });

  QUnit.test("the better the lock and the nearer the ghost, the more often it speaks", (assert) => {
    const f = ghostFrequency("g1");
    const rate = (dial, distance) => {
      let said = 0;
      let n = 0;
      const random = () => (n++ % 100) / 100 + 0.004;
      for (let i = 0; i < 400; i++) if (boxHears(dial, [src("ghost", 0, distance, "g1")], dPlayer, 0.1, random).word) said++;
      return said;
    };
    assert.true(rate(f, 1) > rate(f, 6), "nearer is more");
    assert.true(rate(f, 2) > rate(f + DETECT.box.tolerance * 0.7, 2), "tuned is more");
  });
});
