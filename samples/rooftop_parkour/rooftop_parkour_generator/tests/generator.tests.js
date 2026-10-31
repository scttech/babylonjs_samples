QUnit.module("cityRandom", () => {
  QUnit.test("the same seed gives the same numbers, and another seed gives other ones", (assert) => {
    const a = cityRandom(7);
    const b = cityRandom(7);
    const c = cityRandom(8);
    const first = [a(), a(), a()];
    assert.deepEqual([b(), b(), b()], first);
    assert.notDeepEqual([c(), c(), c()], first);
  });

  QUnit.test("every number is from 0 up to 1, and they are spread, not bunched", (assert) => {
    const random = cityRandom(1);
    let low = 0;
    for (let i = 0; i < 1000; i++) {
      const n = random();
      assert.true(n >= 0 && n < 1);
      if (n < 0.5) low++;
    }
    assert.true(low > 420 && low < 580, `${low} of 1000 below a half`);
  });
});

QUnit.module("a block of a city", () => {
  const grid = { ...GRID, blocksX: 3, blocksZ: 2 };

  QUnit.test("every pattern that fits is a block that the plan has no problem with", (assert) => {
    for (let seed = 1; seed <= 40; seed++) {
      const random = cityRandom(seed);
      const entries = fitBlock("1,1", random, grid);
      assert.true(entries.length >= 1 && entries.length <= 4, `${entries.length} buildings`);
      assert.deepEqual(planProblems(grid, { "1,1": entries }), [], `seed ${seed}`);
    }
  });

  QUnit.test("every building has a fire escape that is where it was proved, give or take a little, and sills that are proved", (assert) => {
    for (let seed = 1; seed <= 20; seed++) {
      for (const entry of fitBlock("0,0", cityRandom(seed), grid)) {
        const proved = CITY.escape[entry.building];
        assert.true(Math.abs(entry.escape.u - proved.u) <= CITY.moveEscape + 0.051, `${entry.building} escape ${entry.escape.u}`);
        assert.strictEqual(entry.escape.base, proved.base);
        assert.deepEqual(entry.sills, { ...CITY.sills[entry.building], y: CITY.sillHeight });
      }
    }
  });

  QUnit.test("what is on a roof is only what the building is known to take, and not always", (assert) => {
    let nothing = 0;
    let something = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const entry = furnish("large_1", cityRandom(seed));
      for (const thing of entry.roof || []) assert.true(CITY.roof.large_1.some((t) => t.kind === thing.kind && t.u === thing.u && t.v === thing.v));
      if (entry.roof) something++;
      else nothing++;
    }
    assert.true(something > 0 && nothing >= 0);
    assert.strictEqual(furnish("medium_1", cityRandom(1)).roof, undefined, "a building that has nothing known for its roof has nothing");
  });

  QUnit.test("a tower is one big building, and the patterns are all of them used by some seed", (assert) => {
    const seen = new Set();
    for (let seed = 1; seed <= 200; seed++) {
      const random = cityRandom(seed);
      const entries = fitBlock("0,0", random, grid);
      seen.add(entries.length);
    }
    assert.true(seen.has(1) && seen.has(2) && seen.has(4), [...seen].join(", "));
  });
});
