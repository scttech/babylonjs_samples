QUnit.module("the WAVES table", () => {
  QUnit.test("there are ten waves, and each has at least one group", (assert) => {
    assert.strictEqual(WAVES.length, 10);
    for (const [i, wave] of WAVES.entries()) assert.true(wave.groups.length >= 1, `wave ${i + 1}`);
  });

  QUnit.test("every group is of a kind of enemy that there is, and has a count and a gap", (assert) => {
    for (const wave of WAVES) {
      for (const group of wave.groups) {
        assert.true(group.kind in ENEMIES, group.kind);
        assert.true(Number.isInteger(group.count) && group.count > 0, group.kind);
        assert.true(group.gap > 0, group.kind);
      }
    }
  });

  QUnit.test("the waves get bigger: later waves have more to defeat, in all, than the first", (assert) => {
    const worth = (wave) => wave.groups.reduce((sum, group) => sum + group.count * ENEMIES[group.kind].health, 0);

    assert.true(worth(WAVES[WAVES.length - 1]) > worth(WAVES[0]) * 4);
    assert.true(worth(WAVES[5]) > worth(WAVES[1]));
  });

  QUnit.test("the first wave is the easy ones, and the spirit is saved for the end", (assert) => {
    assert.true(WAVES[0].groups.every((group) => group.kind === "grunt"));
    const spiritWaves = WAVES.map((wave, i) => (wave.groups.some((group) => group.kind === "spirit") ? i : -1)).filter((i) => i >= 0);

    assert.true(spiritWaves.every((i) => i >= WAVES.length - 2));
  });

  QUnit.test("every kind of enemy is met at least once", (assert) => {
    const met = new Set(WAVES.flatMap((wave) => wave.groups.map((group) => group.kind)));

    assert.deepEqual([...met].sort(), Object.keys(ENEMIES).sort());
  });
});

QUnit.module("healthScaleFor", () => {
  QUnit.test("the first wave is as the table says, and each after is a little tougher", (assert) => {
    assert.strictEqual(healthScaleFor(0), 1);
    assert.true(Math.abs(healthScaleFor(1) - (1 + WAVE_TOUGHER)) < 1e-12);
    assert.true(healthScaleFor(9) > healthScaleFor(8));
  });
});

QUnit.module("scheduleOf", () => {
  QUnit.test("an enemy for each one in the wave, in order of time", (assert) => {
    for (const wave of WAVES) {
      const schedule = scheduleOf(wave);

      assert.strictEqual(schedule.length, countIn(wave));
      assert.true(schedule.every((entry, i) => i === 0 || entry.time >= schedule[i - 1].time));
    }
  });

  QUnit.test("the first comes on at once", (assert) => {
    assert.strictEqual(scheduleOf(WAVES[0])[0].time, 0);
  });

  QUnit.test("those of a group are a gap apart", (assert) => {
    const schedule = scheduleOf({ groups: [{ kind: "grunt", count: 4, gap: 1.5 }] });

    assert.deepEqual(schedule.map((entry) => entry.time), [0, 1.5, 3, 4.5]);
  });

  QUnit.test("the next group comes a wait after the last of the one before, which is the table's if it isn't given", (assert) => {
    const schedule = scheduleOf({ groups: [{ kind: "grunt", count: 2, gap: 1 }, { kind: "scout", count: 2, gap: 1 }] });

    assert.deepEqual(schedule.map((entry) => entry.time), [0, 1, 1 + GROUP_WAIT, 2 + GROUP_WAIT]);
    assert.deepEqual(schedule.map((entry) => entry.kind), ["grunt", "grunt", "scout", "scout"]);
  });

  QUnit.test("a group can say how long to wait after it", (assert) => {
    const schedule = scheduleOf({ groups: [{ kind: "grunt", count: 1, gap: 1, wait: 10 }, { kind: "scout", count: 1, gap: 1 }] });

    assert.deepEqual(schedule.map((entry) => entry.time), [0, 10]);
  });

  QUnit.test("a wave comes on in less than a minute, so that no wave is long to wait for", (assert) => {
    for (const wave of WAVES) {
      const schedule = scheduleOf(wave);

      assert.true(schedule[schedule.length - 1].time < 60);
    }
  });
});

QUnit.module("countIn and rewardOf", () => {
  QUnit.test("countIn adds up the groups", (assert) => {
    assert.strictEqual(countIn({ groups: [{ kind: "grunt", count: 3, gap: 1 }, { kind: "scout", count: 4, gap: 1 }] }), 7);
  });

  QUnit.test("rewardOf is what they are all worth", (assert) => {
    assert.strictEqual(rewardOf({ groups: [{ kind: "grunt", count: 3, gap: 1 }, { kind: "heavy", count: 1, gap: 1 }] }), 3 * ENEMIES.grunt.reward + ENEMIES.heavy.reward);
  });
});

QUnit.module("Spawner", () => {
  const wave = { groups: [{ kind: "grunt", count: 3, gap: 2 }, { kind: "scout", count: 1, gap: 1, wait: 1 }] };

  QUnit.test("says nothing of the future: the first on at once, and the others as the time comes", (assert) => {
    const spawner = new Spawner(wave);

    assert.deepEqual(spawner.update(0), ["grunt"]);
    assert.deepEqual(spawner.update(1.9), []);
    assert.deepEqual(spawner.update(0.2), ["grunt"]);
  });

  QUnit.test("in the end it has said every one, in order, once", (assert) => {
    const spawner = new Spawner(wave);
    const all = [];
    for (let i = 0; i < 400; i++) all.push(...spawner.update(0.05));

    assert.deepEqual(all, ["grunt", "grunt", "grunt", "scout"]);
  });

  QUnit.test("a long step says all that came due in it", (assert) => {
    const spawner = new Spawner(wave);

    assert.deepEqual(spawner.update(100), ["grunt", "grunt", "grunt", "scout"]);
    assert.true(spawner.finished);
  });

  QUnit.test("it is finished when the last has come on, and not before", (assert) => {
    const spawner = new Spawner(wave);
    spawner.update(0);
    assert.false(spawner.finished);
    spawner.update(4);
    assert.false(spawner.finished);
    spawner.update(3);

    assert.true(spawner.finished);
  });

  QUnit.test("many short steps and one long one say the same", (assert) => {
    const a = new Spawner(WAVES[4]);
    const b = new Spawner(WAVES[4]);
    const stepped = [];
    for (let i = 0; i < 1200; i++) stepped.push(...a.update(1 / 60));

    assert.deepEqual(stepped, b.update(20));
  });
});
