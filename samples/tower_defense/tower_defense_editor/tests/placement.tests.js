QUnit.module("canBuild", () => {
  const grid = parseMap({ name: "test", rows: ["S##..", "..#..", "..#.G", "..###"] });

  QUnit.test("grass can be built on", (assert) => {
    assert.deepEqual(canBuild(grid, 0, 1), { ok: true, reason: "" });
    assert.true(canBuild(grid, 4, 0).ok);
  });

  QUnit.test("road cannot, and says so", (assert) => {
    assert.deepEqual(canBuild(grid, 2, 1), { ok: false, reason: "that is road" });
  });

  QUnit.test("the start and the goal are road, so they cannot either", (assert) => {
    assert.false(canBuild(grid, 0, 0).ok);
    assert.false(canBuild(grid, 4, 2).ok);
  });

  QUnit.test("a place off the board cannot, in any direction", (assert) => {
    for (const [col, row] of [[-1, 0], [0, -1], [5, 0], [0, 4], [99, 99]]) {
      assert.deepEqual(canBuild(grid, col, row), { ok: false, reason: "that is not on the board" }, `${col},${row}`);
    }
  });

  QUnit.test("half a cell is not a cell, and nor is a word", (assert) => {
    assert.false(canBuild(grid, 1.5, 1).ok);
    assert.false(canBuild(grid, NaN, 1).ok);
    assert.false(canBuild(grid, "1", 1).ok);
  });

  QUnit.test("a cell that has a tower in it cannot have another", (assert) => {
    const taken = [{ col: 0, row: 1 }];

    assert.deepEqual(canBuild(grid, 0, 1, taken), { ok: false, reason: "there is a tower there already" });
    assert.true(canBuild(grid, 1, 1, taken).ok, "the next cell is still free");
  });

  QUnit.test("a prop is in the way, and says what it is", (assert) => {
    const scenic = parseMap({ name: "test", rows: ["S##..", "..#s.", "c.#.G"] });

    assert.deepEqual(canBuild(scenic, 3, 1), { ok: false, reason: "there is a spirit shrine there" });
    assert.deepEqual(canBuild(scenic, 0, 2), { ok: false, reason: "there is a cabbage cart there" });
    assert.true(canBuild(scenic, 4, 0).ok, "the cells beside them are free");
  });

  QUnit.test("each kind of prop says its own name", (assert) => {
    for (const [kind, spec] of Object.entries(PROPS)) {
      const scenic = { cols: 3, rows: 1, cells: [["grass", "grass", "grass"]], props: [{ kind, col: 1, row: 0 }] };

      assert.strictEqual(canBuild(scenic, 1, 0).reason, `there is ${spec.name} there`, kind);
    }
  });

  QUnit.test("a prop beats a tower in the reason, since it can't be put right and the tower can", (assert) => {
    const scenic = parseMap({ name: "test", rows: ["S#.G", ".s.."] });

    assert.strictEqual(canBuild(scenic, 1, 1, [{ col: 1, row: 1 }]).reason, "there is a spirit shrine there");
  });

  QUnit.test("the reasons are sentences, and each is different", (assert) => {
    const reasons = [canBuild(grid, 2, 1).reason, canBuild(grid, 9, 9).reason, canBuild(grid, 0, 1, [{ col: 0, row: 1 }]).reason];

    assert.strictEqual(new Set(reasons).size, 3);
    assert.true(reasons.every((reason) => reason.length > 10));
  });

  QUnit.test("it does not change the list of towers it is given", (assert) => {
    const taken = [{ col: 0, row: 1 }];
    canBuild(grid, 1, 1, taken);

    assert.deepEqual(taken, [{ col: 0, row: 1 }]);
  });
});

QUnit.module("buildableCells", () => {
    QUnit.test("on a real map, every cell that is not road, and only those", (assert) => {
    for (const map of MAPS) {
      const grid = parseMap(map);
      const roads = grid.cells.flat().filter((cell) => cell === "road").length;
      const cells = buildableCells(grid);

      assert.strictEqual(cells.length, grid.cols * grid.rows - roads - grid.props.length, map.name);
      assert.true(cells.every(({ col, row }) => !isRoad(grid, col, row) && !propAt(grid, col, row)), map.name);
    }
  });

  QUnit.test("there is room: more grass than road, on every map", (assert) => {
    for (const map of MAPS) assert.true(buildableCells(parseMap(map)).length > 60, map.name);
  });

  QUnit.test("a cell with a tower is left out", (assert) => {
    const grid = parseMap(MAPS[0]);
    const all = buildableCells(grid).length;
    const some = buildableCells(grid, [{ col: 0, row: 0 }, { col: 5, row: 2 }]);

    assert.strictEqual(some.length, all - 2, "both are grass on the first map");
    assert.false(some.some((c) => c.col === 5 && c.row === 2));
  });

  QUnit.test("the cells go row by row", (assert) => {
    const cells = buildableCells(parseMap({ name: "test", rows: ["S#G", "..."] }));

    assert.deepEqual(cells, [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }]);
  });
});
