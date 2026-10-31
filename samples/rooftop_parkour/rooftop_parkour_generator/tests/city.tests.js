// The cities are made once and kept: a city is a few hundred milliseconds of the bot, and several tests look at the same ones.
const kept = new Map();
const cityOf = (seed) => {
  if (!kept.has(seed)) kept.set(seed, generateCity(seed));
  return kept.get(seed);
};

QUnit.module("a city", () => {
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  QUnit.test("the same seed makes the same city, and another seed another", (assert) => {
    const a = JSON.stringify(generateCity(3));
    assert.strictEqual(JSON.stringify(generateCity(3)), a);
    assert.notStrictEqual(JSON.stringify(generateCity(4)), a);
  });

  QUnit.test("every city is as big as asked, and every block has buildings that the plan has no problem with", (assert) => {
    for (const seed of SEEDS) {
      const city = cityOf(seed);
      assert.strictEqual(Object.keys(city.layouts).length, CITY.blocks[0] * CITY.blocks[1]);
      assert.deepEqual(planProblems(city.grid, city.layouts), [], `seed ${seed}`);
      assert.true(city.crossings.length >= 1, `seed ${seed} has a jump`);
    }
    const small = generateCity(2, { blocks: [2, 2] });
    assert.strictEqual(small.grid.blocksX, 2);
    assert.strictEqual(Object.keys(small.layouts).length, 4);
  });

  QUnit.test("every building has a fire escape, and every jump is from a roof to a lower one across a gap that can be jumped", (assert) => {
    for (const seed of SEEDS) {
      const city = cityOf(seed);
      const placed = buildingPlacements(city.grid, city.layouts);
      const roofs = buildingBoxes(city.grid, city.layouts);
      assert.strictEqual(fireEscapes(city.grid, city.layouts).length, placed.length, `seed ${seed}: an escape for each`);
      for (const { from, to } of city.crossings) {
        assert.true(roofs[from].maxY - roofs[to].maxY >= CITY.minDrop, `seed ${seed}: ${from} to ${to} is down`);
        const { gap } = boxGap(footprint(placed[from]), footprint(placed[to]));
        assert.true(gap >= CITY.gap[0] && gap <= CITY.gap[1], `seed ${seed}: a gap of ${gap.toFixed(1)}`);
      }
    }
  });

  QUnit.test("no more jumps than the table allows, and none twice", (assert) => {
    for (const seed of SEEDS) {
      const { crossings } = cityOf(seed);
      assert.true(crossings.length <= CITY.maxCrossings);
      assert.strictEqual(new Set(crossings.map((c) => `${c.from}>${c.to}`)).size, crossings.length);
    }
  });

  QUnit.test("the runner begins on open ground in front of the first fire escape, facing it, and not inside a building", (assert) => {
    for (const seed of SEEDS) {
      const city = cityOf(seed);
      const escape = fireEscapes(city.grid, city.layouts)[0];
      const toward = Math.atan2(escape.x - city.start.x, escape.z - city.start.z);
      assert.true(Math.abs(Math.atan2(Math.sin(toward - city.start.heading), Math.cos(toward - city.start.heading))) < 0.01, `seed ${seed}: facing it`);
      for (const box of buildingBoxes(city.grid, city.layouts)) {
        assert.false(city.start.x > box.minX && city.start.x < box.maxX && city.start.z > box.minZ && city.start.z < box.maxZ, `seed ${seed}: not in a building`);
      }
      assert.true(Math.hypot(escape.planter.x - city.start.x, escape.planter.z - city.start.z) >= 3, "at a run from the planter");
    }
  });

  QUnit.test("the route of the trial is a jump of the city, from a building that has an escape", (assert) => {
    for (const seed of SEEDS) {
      const city = cityOf(seed);
      assert.true(city.crossings.some((c) => c.from === city.route[0] && c.to === city.route[1]), `seed ${seed}`);
    }
  });

  QUnit.test("the goals follow the city: the tokens, and the trial", (assert) => {
    for (const seed of [2, 5, 9]) {
      const city = cityOf(seed);
      const tokens = tokenSpots(city.grid, city.layouts, city.start);
      const placed = buildingPlacements(city.grid, city.layouts);
      assert.strictEqual(tokens.filter((t) => t.kind === "roof").length, placed.length, "a token on each roof");
      assert.strictEqual(tokens.filter((t) => t.kind === "platform").length, placed.length, "and on each fire escape");
      const street = tokens.filter((t) => t.kind === "street");
      assert.true(street.every((t) => Math.abs(t.x - city.start.x) < 1e-9), "the street tokens are from the start");
      const gates = trialCheckpoints(city.grid, city.layouts, city.start, city.route);
      assert.deepEqual([gates[0].x, gates[0].z], [city.start.x, city.start.z]);
      assert.deepEqual([gates[3].x, gates[3].z], [city.start.x, city.start.z], "it ends where it began");
      assert.strictEqual(gates[1].y, buildingBoxes(city.grid, city.layouts)[city.route[0]].maxY);
    }
  });

  QUnit.test("the district of before is still what the plan says, and the goals for it are what they were", (assert) => {
    assert.strictEqual(HANDMADE.grid, GRID);
    assert.strictEqual(HANDMADE.layouts, LAYOUTS);
    assert.strictEqual(trialCheckpoints()[1].name, "Medium roof");
    assert.deepEqual(trialCheckpoints(GRID, LAYOUTS, START, TRIAL_ROUTE), trialCheckpoints());
  });
});

QUnit.module("the bot proves a city", () => {
  // The bot plays the game, so this is the slow part: a few cities, each in full.
  for (const seed of [3, 11, 17]) {
    QUnit.test(`city ${seed}: every building can be got onto from the street, every jump is made, and the trial and its par can be run`, (assert) => {
      const city = cityOf(seed);
      const env = districtWorld(city.grid, city.layouts, city.crossings);
      const { reached, edges } = reachable(env);
      assert.strictEqual(reached.size, env.placed.length, "every building");
      for (const { from, to } of city.crossings) assert.true(edges.some((e) => e.kind === "crossing" && e.from === from && e.to === to), `${from} to ${to}`);
      const saved = shortcuts(env, edges);
      assert.true(saved.every((s) => s.saved > 0), "every jump is a shortcut");
      const gates = trialCheckpoints(city.grid, city.layouts, city.start, city.route);
      const estimate = trialEstimate(env, edges, gates, city.route);
      assert.true(estimate > 8 && estimate < 200, `${estimate.toFixed(1)} seconds`);
    });
  }
});

QUnit.module("the par of a city", () => {
  QUnit.test("it is how long the bot takes round the trial, to the second, and the handmade district keeps its own", (assert) => {
    const city = generateCity(5);
    const env = districtWorld(city.grid, city.layouts, city.crossings);
    const { edges } = reachable(env);
    const estimate = trialEstimate(env, edges, trialCheckpoints(city.grid, city.layouts, city.start, city.route), city.route);
    assert.strictEqual(city.par, Math.round(estimate));
    assert.true(city.par > 8 && city.par < 200, `${city.par} seconds`);
    assert.strictEqual(HANDMADE.par, TRIAL.par);
  });
});

QUnit.module("which city a page asks for", () => {
  QUnit.test("no seed is the handmade district", (assert) => {
    assert.strictEqual(cityFor(""), HANDMADE);
    assert.strictEqual(cityFor("?dev"), HANDMADE);
  });

  QUnit.test("a seed is a generated city, the same each time", (assert) => {
    const city = cityFor("?dev&seed=12");
    assert.strictEqual(city.seed, 12);
    assert.strictEqual(JSON.stringify(cityFor("?seed=12")), JSON.stringify(city));
  });

  QUnit.test("random is a seed from the random numbers given, and nonsense is the handmade district", (assert) => {
    assert.strictEqual(cityFor("?seed=random", () => 0.5).seed, 500000);
    assert.strictEqual(cityFor("?seed=banana"), HANDMADE);
  });

  QUnit.test("a city is described in a few words", (assert) => {
    assert.true(describeCity(HANDMADE).startsWith("The handmade district: 2 by 2 blocks, 8 buildings"));
    const text = describeCity(generateCity(5));
    assert.true(text.startsWith("City 5: 3 by 2 blocks"), text);
  });
});
