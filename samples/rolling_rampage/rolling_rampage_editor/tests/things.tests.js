QUnit.module("placing things", () => {
  QUnit.test("the start and the goal are moved, not added, and snap to half a corner", (assert) => {
    const level = blankLevel();

    const ref = placeThing(level, "goal", { col: 10.3, row: 4.8 });

    assert.deepEqual(ref, { kind: "goal", index: 0 });
    assert.deepEqual(level.goal, { col: 10.5, row: 5 });
    placeThing(level, "start", { col: 1, row: 1 });
    assert.deepEqual(level.start, { col: 1, row: 1 });
  });

  QUnit.test("a checkpoint is worth the default bonus", (assert) => {
    const level = blankLevel();

    const ref = placeThing(level, "checkpoint", { col: 8, row: 3 });

    assert.deepEqual(ref, { kind: "checkpoint", index: 0 });
    assert.deepEqual(level.checkpoints[0], { col: 8, row: 3, bonus: EDITOR_LIMITS.defaultBonus });
  });

  QUnit.test("an enemy, a puddle, a piston and a platform each go in their own list", (assert) => {
    const level = blankLevel();

    placeThing(level, "enemy", { col: 12, row: 3 });
    placeThing(level, "slime", { col: 8, row: 8 });
    const piston = placeThing(level, "piston", { col: 10, row: 6 });
    const platform = placeThing(level, "platform", { col: 5.1, row: 6 });

    assert.deepEqual(level.enemies, [{ col: 12, row: 3 }]);
    assert.strictEqual(level.slime[0].radius, THING_DEFAULTS.slimeRadius);
    assert.deepEqual([piston, platform], [{ kind: "mover", index: 0 }, { kind: "mover", index: 1 }]);
    assert.strictEqual(level.movers[0].kind, "piston");
    assert.strictEqual(level.movers[1].kind, "platform");
  });

  QUnit.test("a new piston or platform is at the height of the floor it is on", (assert) => {
    const level = blankLevel();
    level.rows = level.rows.map((row) => row.slice(0, 5) + "7" + row.slice(6));

    placeThing(level, "piston", { col: 5, row: 4 });
    placeThing(level, "platform", { col: 9, row: 4 });

    assert.strictEqual(level.movers[0].height, 7);
    assert.strictEqual(level.movers[1].height, 2);
  });

  QUnit.test("a new platform goes to the right, by the span, on quarters of a corner", (assert) => {
    const level = blankLevel();

    placeThing(level, "platform", { col: 5.1, row: 4 });

    const platform = level.movers[0];
    assert.deepEqual(platform.from, { col: 5, row: 4 });
    assert.deepEqual(platform.to, { col: 5 + THING_DEFAULTS.platformSpan, row: 4 });
  });

  QUnit.test("no more of a kind than the limit, which is a limit that can be changed", (assert) => {
    const limits = { ...EDITOR_LIMITS, maxObjects: 2 };
    const level = blankLevel();

    assert.ok(placeThing(level, "enemy", { col: 12, row: 3 }, limits));
    assert.ok(placeThing(level, "enemy", { col: 13, row: 3 }, limits));
    assert.strictEqual(placeThing(level, "enemy", { col: 14, row: 3 }, limits), null);
    assert.strictEqual(level.enemies.length, 2);
    assert.ok(placeThing(level, "checkpoint", { col: 8, row: 3 }, limits));
  });

  QUnit.test("a tool that is not a thing places nothing", (assert) => {
    assert.strictEqual(placeThing(blankLevel(), "banana", { col: 1, row: 1 }), null);
  });

  QUnit.test("floorDigit is the height of the floor, or of the nearest to the left", (assert) => {
    const level = blankLevel();
    level.rows[3] = "34....56" + level.rows[3].slice(8);

    assert.strictEqual(floorDigit(level, 1, 3), 4);
    assert.strictEqual(floorDigit(level, 4, 3), 4);
    assert.strictEqual(floorDigit(level, 6, 3), 5);
    level.rows[3] = ".".repeat(level.rows[3].length);
    assert.strictEqual(floorDigit(level, 6, 3), 4);
  });
});

QUnit.module("finding, moving and removing things", () => {
  const make = () => {
    const level = blankLevel();
    placeThing(level, "checkpoint", { col: 8, row: 3 });
    placeThing(level, "enemy", { col: 12, row: 8 });
    placeThing(level, "platform", { col: 5, row: 5 });
    return level;
  };

  QUnit.test("allThings lists the start and the goal first, then each list in turn", (assert) => {
    assert.deepEqual(allThings(make()).map((ref) => ref.kind), ["start", "goal", "checkpoint", "enemy", "mover"]);
  });

  QUnit.test("thingAt finds the thing nearest a place, within reach", (assert) => {
    const level = make();

    assert.deepEqual(thingAt(level, { col: 8.2, row: 3.1 }), { kind: "checkpoint", index: 0 });
    assert.deepEqual(thingAt(level, { col: 2, row: 6 }), { kind: "start", index: 0 });
    assert.strictEqual(thingAt(level, { col: 15, row: 1 }), null);
  });

  QUnit.test("a platform is found anywhere along its way", (assert) => {
    const level = make();
    const middle = { col: level.movers[0].from.col + THING_DEFAULTS.platformSpan / 2, row: 5.2 };

    assert.deepEqual(thingAt(level, middle), { kind: "mover", index: 0 });
  });

  QUnit.test("thingAt takes the reach it is given", (assert) => {
    const level = make();
    assert.strictEqual(thingAt(level, { col: 9, row: 3 }, 0.5), null);
    assert.deepEqual(thingAt(level, { col: 9, row: 3 }, 1.5), { kind: "checkpoint", index: 0 });
  });

  QUnit.test("moveThing moves a thing, snapped", (assert) => {
    const level = make();

    moveThing(level, { kind: "checkpoint", index: 0 }, { col: 10.2, row: 4.9 });
    moveThing(level, { kind: "goal", index: 0 }, { col: 3, row: 2 });

    assert.deepEqual([level.checkpoints[0].col, level.checkpoints[0].row], [10, 5]);
    assert.deepEqual(level.goal, { col: 3, row: 2 });
  });

  QUnit.test("moveThing moves a platform with its other end", (assert) => {
    const level = make();
    const { from, to } = JSON.parse(JSON.stringify(level.movers[0]));

    moveThing(level, { kind: "mover", index: 0 }, { col: from.col + 2, row: from.row + 1 });

    assert.deepEqual(level.movers[0].from, { col: from.col + 2, row: from.row + 1 });
    assert.deepEqual(level.movers[0].to, { col: to.col + 2, row: to.row + 1 });
  });

  QUnit.test("removeThing takes a thing out, and the others close up", (assert) => {
    const level = make();
    placeThing(level, "enemy", { col: 14, row: 8 });

    assert.true(removeThing(level, { kind: "enemy", index: 0 }));

    assert.deepEqual(level.enemies, [{ col: 14, row: 8 }]);
  });

  QUnit.test("the start and the goal can't be taken out, and nor can a thing that isn't there", (assert) => {
    const level = make();
    assert.false(removeThing(level, { kind: "start", index: 0 }));
    assert.false(removeThing(level, { kind: "goal", index: 0 }));
    assert.false(removeThing(level, { kind: "enemy", index: 5 }));
    assert.ok(level.start && level.goal);
  });

  QUnit.test("thingName says what it is, and which", (assert) => {
    const level = make();
    placeThing(level, "slime", { col: 4, row: 8 });
    placeThing(level, "piston", { col: 10, row: 6 });

    assert.strictEqual(thingName(level, { kind: "goal", index: 0 }), "Goal");
    assert.strictEqual(thingName(level, { kind: "checkpoint", index: 0 }), "Checkpoint 1");
    assert.strictEqual(thingName(level, { kind: "slime", index: 0 }), "Slime puddle 1");
    assert.strictEqual(thingName(level, { kind: "mover", index: 0 }), "Platform 1");
    assert.strictEqual(thingName(level, { kind: "mover", index: 1 }), "Piston 2");
    assert.strictEqual(thingName(level, { kind: "enemy", index: 9 }), "");
  });
});

QUnit.module("the numbers of a thing", () => {
  QUnit.test("each kind of thing has the rows it needs", (assert) => {
    const level = blankLevel();
    placeThing(level, "checkpoint", { col: 8, row: 3 });
    placeThing(level, "slime", { col: 4, row: 8 });
    placeThing(level, "piston", { col: 10, row: 6 });
    placeThing(level, "platform", { col: 5, row: 5 });
    const paths = (ref) => thingFields(level, ref).map((field) => field.path);

    assert.deepEqual(paths({ kind: "goal", index: 0 }), ["col", "row"]);
    assert.deepEqual(paths({ kind: "checkpoint", index: 0 }), ["col", "row", "bonus"]);
    assert.deepEqual(paths({ kind: "slime", index: 0 }), ["col", "row", "radius"]);
    assert.deepEqual(paths({ kind: "mover", index: 0 }), ["at.col", "at.row", "height", "rise", "period", "phase", "size.x", "size.z"]);
    assert.deepEqual(paths({ kind: "mover", index: 1 }), ["from.col", "from.row", "to.col", "to.row", "height", "period", "phase", "size.x", "size.z"]);
    assert.deepEqual(thingFields(level, { kind: "enemy", index: 3 }), []);
  });

  QUnit.test("every row has a label, and a range that is not empty", (assert) => {
    const level = blankLevel();
    placeThing(level, "piston", { col: 10, row: 6 });
    placeThing(level, "platform", { col: 5, row: 5 });
    for (const index of [0, 1]) {
      for (const field of thingFields(level, { kind: "mover", index })) {
        assert.true(field.label.length > 0 && field.min < field.max && field.step > 0, field.path);
      }
    }
  });

  QUnit.test("getField and setField work along a path", (assert) => {
    const thing = { size: { x: 2, z: 3 }, period: 4 };

    assert.strictEqual(getField(thing, "size.z"), 3);
    assert.strictEqual(getField(thing, "period"), 4);
    assert.strictEqual(getField(thing, "size.q"), undefined);
    assert.strictEqual(getField(thing, "nothing.here"), undefined);
    setField(thing, "size.z", 9);
    assert.strictEqual(thing.size.z, 9);
  });

  QUnit.test("setThingField holds a number to its range and its step", (assert) => {
    const level = blankLevel();
    placeThing(level, "slime", { col: 4, row: 8 });
    const ref = { kind: "slime", index: 0 };

    assert.strictEqual(setThingField(level, ref, "radius", 2.04), 2);
    assert.strictEqual(setThingField(level, ref, "radius", 99), 4);
    assert.strictEqual(setThingField(level, ref, "radius", -1), 0.5);
    assert.strictEqual(level.slime[0].radius, 0.5);
    assert.strictEqual(setThingField(level, ref, "col", 999), level.rows[0].length - 1);
  });

  QUnit.test("a height is held to the highest the limits allow", (assert) => {
    const level = blankLevel();
    placeThing(level, "piston", { col: 10, row: 6 });
    const limits = { ...EDITOR_LIMITS, maxHeight: 5 };

    assert.strictEqual(setThingField(level, { kind: "mover", index: 0 }, "height", 8, limits), 5);
  });

  QUnit.test("setThingField on a number the thing doesn't have does nothing", (assert) => {
    const level = blankLevel();
    placeThing(level, "enemy", { col: 12, row: 3 });
    assert.strictEqual(setThingField(level, { kind: "enemy", index: 0 }, "radius", 3), null);
    assert.strictEqual(level.enemies[0].radius, undefined);
  });
});

QUnit.module("flattenFloor", () => {
  const bumpy = () => {
    const level = blankLevel();
    level.rows = level.rows.map((row, i) => (i >= 4 && i <= 8 ? row.slice(0, 8) + "34567" + row.slice(13) : row));
    return level;
  };
  const flatProblems = (level) => checkLevel(level).filter((found) => found.message.includes("flat floor"));

  QUnit.test("makes the floor under a checkpoint flat, so the check passes", (assert) => {
    const level = bumpy();
    placeThing(level, "checkpoint", { col: 10, row: 6 });
    assert.strictEqual(flatProblems(level).length, 1);

    const changed = flattenFloor(level, { kind: "checkpoint", index: 0 });

    assert.true(changed > 0);
    assert.deepEqual(flatProblems(level), []);
  });

  QUnit.test("works for the goal, a puddle and a piston too", (assert) => {
    const level = bumpy();
    placeThing(level, "goal", { col: 10, row: 6 });
    placeThing(level, "slime", { col: 10, row: 6 });
    placeThing(level, "piston", { col: 10, row: 6 });
    level.movers[0].height = 5;

    for (const ref of [{ kind: "goal", index: 0 }, { kind: "slime", index: 0 }, { kind: "mover", index: 0 }]) {
      assert.true(flattenFloor(level, ref) >= 0);
    }
    assert.deepEqual(checkLevel(level).filter((found) => found.message.includes("needs flat")), []);
  });

  QUnit.test("a piston is flattened to its own height", (assert) => {
    const level = bumpy();
    placeThing(level, "piston", { col: 10, row: 6 });
    level.movers[0].height = 6;

    flattenFloor(level, { kind: "mover", index: 0 });

    assert.strictEqual(level.rows[6][10], "6");
  });

  QUnit.test("fills holes under the thing", (assert) => {
    const level = blankLevel();
    placeThing(level, "checkpoint", { col: 10, row: 6 });
    level.rows = level.rows.map((row) => row.slice(0, 9) + "..." + row.slice(12));

    flattenFloor(level, { kind: "checkpoint", index: 0 });

    assert.false(level.rows.slice(5, 8).some((row) => row.slice(8, 13).includes(".")));
  });

  QUnit.test("does not go outside the level at an edge", (assert) => {
    const level = blankLevel();
    placeThing(level, "checkpoint", { col: 0, row: 0 });
    const size = [level.rows.length, level.rows[0].length];

    flattenFloor(level, { kind: "checkpoint", index: 0 });

    assert.deepEqual([level.rows.length, level.rows[0].length], size);
  });

  QUnit.test("says -1 for a thing that needs no flat floor, or isn't there", (assert) => {
    const level = blankLevel();
    placeThing(level, "enemy", { col: 12, row: 3 });
    placeThing(level, "platform", { col: 5, row: 5 });
    assert.strictEqual(flattenFloor(level, { kind: "enemy", index: 0 }), -1);
    assert.strictEqual(flattenFloor(level, { kind: "start", index: 0 }), -1);
    assert.strictEqual(flattenFloor(level, { kind: "mover", index: 0 }), -1);
    assert.strictEqual(flattenFloor(level, { kind: "checkpoint", index: 4 }), -1);
  });
});
