QUnit.module("the LEVELS table", () => {
  QUnit.test("there are three levels, and the last is the number of them", (assert) => {
    assert.strictEqual(LEVELS.length, 3);
    assert.strictEqual(MAX_LEVEL, 3);
  });

  QUnit.test("the first level is a bender as it is: it costs nothing, and changes nothing", (assert) => {
    assert.deepEqual(LEVELS[0], { name: "Novice", cost: 0, damage: 1, range: 1, tempo: 1 });
  });

  QUnit.test("every level is better than the one before: more harm, more reach, faster, and a higher price", (assert) => {
    for (let i = 1; i < LEVELS.length; i++) {
      for (const key of ["cost", "damage", "range", "tempo"]) assert.true(LEVELS[i][key] > LEVELS[i - 1][key], `${LEVELS[i].name} ${key}`);
    }
  });

  QUnit.test("and each has a name of its own", (assert) => {
    assert.strictEqual(new Set(LEVELS.map((level) => level.name)).size, LEVELS.length);
  });
});

QUnit.module("statsFor", () => {
  QUnit.test("at the first level it is the bender's own numbers", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const stats = statsFor(spec, 1);

      assert.strictEqual(stats.damage, spec.damage, kind);
      assert.strictEqual(stats.range, spec.range, kind);
      assert.strictEqual(stats.cooldown, spec.cooldown, kind);
      assert.strictEqual(stats.attack.speed, spec.attack.speed, kind);
    }
  });

  QUnit.test("at a higher level the damage and the range are multiplied, and the cooldown is divided, by the row of the table", (assert) => {
    const spec = BENDERS.water;
    const row = LEVELS[2];
    const stats = statsFor(spec, 3);

    assert.true(Math.abs(stats.damage - spec.damage * row.damage) < 1e-9);
    assert.true(Math.abs(stats.range - spec.range * row.range) < 1e-9);
    assert.true(Math.abs(stats.cooldown - spec.cooldown / row.tempo) < 1e-9);
  });

  QUnit.test("and the attack is played faster by the same amount, which is why it is no longer than the cooldown", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        const stats = statsFor(spec, level);

        assert.true(Math.abs(stats.attack.speed - spec.attack.speed * LEVELS[level - 1].tempo) < 1e-9, `${kind} ${level}`);
        assert.true(attackDuration(stats.attack) <= stats.cooldown, `${kind} ${level}: ${attackDuration(stats.attack).toFixed(2)} in ${stats.cooldown.toFixed(2)}`);
      }
    }
  });

  QUnit.test("everything else about the bender is kept: it is still the same attack, in the same colors", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const stats = statsFor(spec, 3);

      assert.strictEqual(stats.color, spec.color, kind);
      assert.strictEqual(stats.cost, spec.cost, kind);
      assert.deepEqual(stats.idles, spec.idles, kind);
      assert.strictEqual(stats.attack.clip, spec.attack.clip, kind);
      assert.strictEqual(stats.attack.aim, spec.attack.aim, kind);
      assert.deepEqual(stats.attack.hits, spec.attack.hits, kind);
    }
  });

  QUnit.test("the table is not changed by working out a level from it", (assert) => {
    const before = JSON.stringify(BENDERS);
    for (let level = 1; level <= MAX_LEVEL; level++) for (const spec of Object.values(BENDERS)) statsFor(spec, level);

    assert.strictEqual(JSON.stringify(BENDERS), before);
  });

  QUnit.test("even the longest reach, at the last level, is less than half the board, and every reach is more than a cell", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const range = statsFor(spec, MAX_LEVEL).range;

      assert.true(range < (BOARD.cols * BOARD.cell) / 2 && statsFor(spec, 1).range > BOARD.cell, `${kind}: ${range.toFixed(2)}`);
    }
  });

  QUnit.test("and what it gives a brain is a row that a brain can use: a master fires faster, and harder", (assert) => {
    const slow = new TowerBrain(statsFor(BENDERS.earth, 1), { x: 0, z: 0 });
    const quick = new TowerBrain(statsFor(BENDERS.earth, 3), { x: 0, z: 0 });
    const enemy = { x: 0, z: 3, progress: 0.5, done: false };
    const fires = (brain) => {
      brain.yaw = 0;
      let harm = 0;
      for (let t = 0; t < 20; t += 0.02) for (const event of brain.update(0.02, [enemy])) if (event.type === "fire") harm += event.damage;
      return harm;
    };

    assert.true(fires(quick) > fires(slow) * 2, "in twenty seconds it does more than twice the harm");
  });
});

QUnit.module("what a level costs", () => {
  QUnit.test("a price is in whole gold, in fives", (assert) => {
    for (const spec of Object.values(BENDERS)) {
      for (let level = 1; level < MAX_LEVEL; level++) assert.strictEqual(upgradeCost(spec, level) % 5, 0, `${spec.name} ${level}`);
    }
  });

  QUnit.test("it is a share of the podium's price, which the table says", (assert) => {
    assert.strictEqual(upgradeCost(BENDERS.air, 1), 60);
    assert.strictEqual(upgradeCost(BENDERS.air, 2), 90);
    assert.strictEqual(upgradeCost(BENDERS.fire, 1), 105);
  });

  QUnit.test("there is no price for more than the last level", (assert) => {
    for (const spec of Object.values(BENDERS)) assert.strictEqual(upgradeCost(spec, MAX_LEVEL), null);
  });

  QUnit.test("a tower is worth what its podium cost, and every upgrade", (assert) => {
    const spec = BENDERS.earth;

    assert.strictEqual(worthOf(spec, 1), 150);
    assert.strictEqual(worthOf(spec, 2), 150 + upgradeCost(spec, 1));
    assert.strictEqual(worthOf(spec, 3), 150 + upgradeCost(spec, 1) + upgradeCost(spec, 2));
  });

  QUnit.test("selling gives back a share of that, in whole gold, and less than it was worth", (assert) => {
    for (const spec of Object.values(BENDERS)) {
      for (let level = 1; level <= MAX_LEVEL; level++) {
        const refund = refundFor(spec, level);

        assert.true(Number.isInteger(refund) && refund < worthOf(spec, level) && refund > 0, `${spec.name} ${level}: ${refund} of ${worthOf(spec, level)}`);
      }
    }
    assert.strictEqual(refundFor(BENDERS.air, 1), 70);
  });

  QUnit.test("each upgrade gives more for its gold than another podium would, which is why a player upgrades", (assert) => {
    for (const spec of Object.values(BENDERS)) {
      const power = (level) => LEVELS[level - 1].damage * LEVELS[level - 1].tempo;
      for (let level = 1; level < MAX_LEVEL; level++) {
        const gain = (power(level + 1) - power(level)) / upgradeCost(spec, level);

        assert.true(gain > 1 / spec.cost, `${spec.name} ${level} to ${level + 1}`);
      }
    }
  });
});
