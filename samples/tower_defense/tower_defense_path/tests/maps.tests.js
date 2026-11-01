// A board of five across and three deep, to write small maps for.
const MAP_BOARD = { cols: 5, rows: 3, cell: 2, rim: 1, depth: 6, peek: 2, headroom: 1 };

// A small map from rows of text.
const smallMap = (...rows) => ({ name: "test", rows });

QUnit.module("LEGEND", () => {
  QUnit.test("every character means grass, road, the start or the goal", (assert) => {
    for (const meaning of Object.values(LEGEND)) assert.true(["grass", "road", "start", "goal"].includes(meaning));
  });

  QUnit.test("there is a character for each of the four", (assert) => {
    assert.deepEqual(Object.values(LEGEND).sort(), ["goal", "grass", "road", "start"]);
  });
});

QUnit.module("the maps", () => {
  QUnit.test("there is more than one, each with a name of its own", (assert) => {
    assert.true(MAPS.length > 1);
    assert.strictEqual(new Set(MAPS.map((map) => map.name)).size, MAPS.length);
    assert.true(MAPS.every((map) => map.name.length > 0));
  });

  QUnit.test("every map fits the board, and has nothing wrong with it", (assert) => {
    for (const map of MAPS) assert.deepEqual(mapProblems(map), [], map.name);
  });

  QUnit.test("every map is a different shape", (assert) => {
    assert.strictEqual(new Set(MAPS.map((map) => map.rows.join("/"))).size, MAPS.length);
  });
});

QUnit.module("parseMap", () => {
  QUnit.test("counts the columns and the rows", (assert) => {
    const grid = parseMap(smallMap("S###.", "....#", "...G."));

    assert.strictEqual(grid.cols, 5);
    assert.strictEqual(grid.rows, 3);
  });

  QUnit.test("finds the start and the goal", (assert) => {
    const grid = parseMap(smallMap("S###.", "....#", "...G."));

    assert.deepEqual(grid.start, { col: 0, row: 0 });
    assert.deepEqual(grid.goal, { col: 3, row: 2 });
  });

  QUnit.test("a cell is grass or road, and the start and the goal are road", (assert) => {
    const grid = parseMap(smallMap("S#..G"));

    assert.deepEqual(grid.cells[0], ["road", "road", "grass", "grass", "road"]);
  });

  QUnit.test("a character that means nothing is grass, and is written down", (assert) => {
    const grid = parseMap(smallMap("S?#G"));

    assert.strictEqual(grid.cells[0][1], "grass");
    assert.deepEqual(grid.unknown, [{ col: 1, row: 0, character: "?" }]);
  });

  QUnit.test("a map with no start has none", (assert) => {
    const grid = parseMap(smallMap("..G"));

    assert.strictEqual(grid.start, null);
    assert.strictEqual(grid.starts.length, 0);
  });

  QUnit.test("every start is kept, even though only the first is used", (assert) => {
    const grid = parseMap(smallMap("S.S"));

    assert.strictEqual(grid.starts.length, 2);
    assert.deepEqual(grid.start, { col: 0, row: 0 });
  });
});

QUnit.module("isRoad and roadNeighbors", () => {
  const grid = parseMap(smallMap("S##", ".#.", ".#G"));

  QUnit.test("road is road, grass is not", (assert) => {
    assert.true(isRoad(grid, 1, 1));
    assert.false(isRoad(grid, 0, 1));
  });

  QUnit.test("a place off the map is not road", (assert) => {
    assert.false(isRoad(grid, -1, 0));
    assert.false(isRoad(grid, 0, -1));
    assert.false(isRoad(grid, 3, 0));
    assert.false(isRoad(grid, 0, 3));
  });

  QUnit.test("counts the road on the four sides", (assert) => {
    assert.strictEqual(roadNeighbors(grid, 1, 0), 3, "a corner joined to the start, the right and the one below");
    assert.strictEqual(roadNeighbors(grid, 1, 1), 2);
    assert.strictEqual(roadNeighbors(grid, 0, 0), 1);
  });

  QUnit.test("does not count the cells at the corners of a cell", (assert) => {
    assert.strictEqual(roadNeighbors(parseMap(smallMap("#.#", ".#.", "#.#")), 1, 1), 0);
  });
});

QUnit.module("mapProblems", () => {
  const problems = (...rows) => mapProblems(smallMap(...rows), MAP_BOARD);

  QUnit.test("a good map has none", (assert) => {
    assert.deepEqual(problems("S###G", ".....", "....."), []);
  });

  QUnit.test("a map with the wrong number of rows is wrong", (assert) => {
    assert.true(problems("S###G", ".....").some((p) => p.includes("2 rows")));
  });

  QUnit.test("a row of the wrong length is wrong, and says which", (assert) => {
    assert.true(problems("S####", "....", ".....").some((p) => p.includes("row 1 has 4")));
  });

  QUnit.test("a character that means nothing is wrong, and says where", (assert) => {
    assert.true(problems("S##?G", ".....", ".....").some((p) => p.includes('"?" at column 3, row 0')));
  });

  QUnit.test("a map has to have a start", (assert) => {
    assert.true(problems("#####", ".....", ".....").some((p) => p.includes("one start, and has 0")));
  });

  QUnit.test("and only one goal", (assert) => {
    assert.true(problems("S###G", "....G", ".....").some((p) => p.includes("one goal, and has 2")));
  });

  QUnit.test("the start has to be on the edge", (assert) => {
    assert.true(problems(".....", ".S###", ".....").some((p) => p.includes("start is not on the edge")));
  });

  QUnit.test("a start in a corner, or on any edge, is on the edge", (assert) => {
    assert.false(problems("S####", ".....", ".....").some((p) => p.includes("start is not on the edge")));
    assert.false(problems(".....", "S####", ".....").some((p) => p.includes("start is not on the edge")));
    assert.false(problems(".....", "....S", ".....").some((p) => p.includes("start is not on the edge")));
    assert.false(problems("..S..", ".....", ".....").some((p) => p.includes("start is not on the edge")));
  });

  QUnit.test("so does the goal", (assert) => {
    assert.true(problems("S#...", ".#G..", ".....").some((p) => p.includes("goal is not on the edge")));
  });

  QUnit.test("a piece of road with three neighbors is a fork, and is wrong", (assert) => {
    assert.true(problems("S####", ".#...", ".#..G").some((p) => p.includes("column 1, row 0 has 3 neighbors, and should have 2 neighbors")));
  });

  QUnit.test("a piece of road with one neighbor, that is not an end, is a dead end, and is wrong", (assert) => {
    assert.true(problems("S##..", ".....", "....G").some((p) => p.includes("column 2, row 0 has 1 neighbor, and should have 2 neighbors")));
  });

  QUnit.test("the start and the goal want exactly one neighbor each", (assert) => {
    assert.true(problems("S####", ".....", "..G..").some((p) => p.includes("column 2, row 2 has 0 neighbors, and should have 1 neighbor")));
  });

  QUnit.test("every problem is a sentence you could read to someone", (assert) => {
    for (const problem of problems("S?#", "....", ".G")) assert.true(typeof problem === "string" && problem.length > 10);
  });
});
