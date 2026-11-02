// A board of five across and three deep, a cell of two and a rim of one, so a route is easy to work out by hand.
const PATH_BOARD = { cols: 5, rows: 3, cell: 2, rim: 1, depth: 6, peek: 2, headroom: 1 };

QUnit.module("findPath", () => {
  const near = (a, b) => Math.abs(a.col - b.col) + Math.abs(a.row - b.row) === 1;

  QUnit.test("goes from the start to the goal along the road", (assert) => {
    const path = findPath(parseMap({ name: "test", rows: ["S##", "..#", "..G"] }));

    assert.deepEqual(path, [
      { col: 0, row: 0 },
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 2, row: 1 },
      { col: 2, row: 2 },
    ]);
  });

  QUnit.test("on every real map it begins at the start, ends at the goal, and has a cell for every piece of road", (assert) => {
    for (const map of MAPS) {
      const grid = parseMap(map);
      const path = findPath(grid);
      const roads = grid.cells.flat().filter((cell) => cell === "road").length;

      assert.deepEqual(path[0], grid.start, map.name);
      assert.deepEqual(path[path.length - 1], grid.goal, map.name);
      assert.strictEqual(path.length, roads, map.name);
    }
  });

  QUnit.test("each step is to a cell beside the last, and no cell is walked twice", (assert) => {
    for (const map of MAPS) {
      const path = findPath(parseMap(map));

      assert.true(path.every((cell, i) => i === 0 || near(cell, path[i - 1])), map.name);
      assert.strictEqual(new Set(path.map((cell) => `${cell.col},${cell.row}`)).size, path.length, map.name);
    }
  });

  QUnit.test("a road with a gap in it goes nowhere", (assert) => {
    assert.strictEqual(findPath(parseMap({ name: "test", rows: ["S#.#G"] })), null);
  });

  QUnit.test("a map with no start, or no goal, goes nowhere", (assert) => {
    assert.strictEqual(findPath(parseMap({ name: "test", rows: ["###G"] })), null);
    assert.strictEqual(findPath(parseMap({ name: "test", rows: ["S###"] })), null);
  });
});

QUnit.module("pathProblems", () => {
  QUnit.test("a good road has none, and so does every real map", (assert) => {
    assert.deepEqual(pathProblems(parseMap({ name: "test", rows: ["S##G"] })), []);
    for (const map of MAPS) assert.deepEqual(pathProblems(parseMap(map)), [], map.name);
  });

  QUnit.test("a gap in the road is a problem", (assert) => {
    assert.strictEqual(pathProblems(parseMap({ name: "test", rows: ["S#.#G"] })).length, 1);
  });

  QUnit.test("a piece of road that is not on the way is a problem, and is counted", (assert) => {
    const problems = pathProblems(parseMap({ name: "test", rows: ["S###G", ".....", "##..."] }));

    assert.strictEqual(problems.length, 1);
    assert.true(problems[0].startsWith("2 cells"));
  });
});

QUnit.module("outward and routePoints", () => {
  const grid = parseMap({ name: "test", rows: [".S...", ".#..G", ".####"] });

  QUnit.test("off the board is away from the edge a cell is on", (assert) => {
    assert.deepEqual(outward({ cols: 5, rows: 3 }, { col: 0, row: 1 }), { x: -1, z: 0 });
    assert.deepEqual(outward({ cols: 5, rows: 3 }, { col: 4, row: 1 }), { x: 1, z: 0 });
    assert.deepEqual(outward({ cols: 5, rows: 3 }, { col: 2, row: 0 }), { x: 0, z: 1 }, "the back of the board is the way of more z");
    assert.deepEqual(outward({ cols: 5, rows: 3 }, { col: 2, row: 2 }), { x: 0, z: -1 });
  });

  QUnit.test("there is a point for every cell, and one more at each end", (assert) => {
    const path = findPath(grid);

    assert.strictEqual(routePoints(grid, path, PATH_BOARD).length, path.length + 2);
  });

  QUnit.test("the middle points are the middles of the cells", (assert) => {
    const path = findPath(grid);
    const points = routePoints(grid, path, PATH_BOARD);

    path.forEach((cell, i) => assert.deepEqual(points[i + 1], cellCenter(cell.col, cell.row, PATH_BOARD)));
  });

  QUnit.test("the first point is out past the edge of the island, in line with the start, so an enemy walks on to the board", (assert) => {
    const path = findPath(grid);
    const start = cellCenter(path[0].col, path[0].row, PATH_BOARD);
    const first = routePoints(grid, path, PATH_BOARD)[0];

    assert.strictEqual(first.x, start.x);
    assert.strictEqual(first.z, start.z + PATH_BOARD.cell / 2 + PATH_BOARD.rim, "the start is on the back row, so it comes on from the back");
  });

  QUnit.test("and the last is out past the edge in line with the goal", (assert) => {
    const path = findPath(grid);
    const goal = cellCenter(path[path.length - 1].col, path[path.length - 1].row, PATH_BOARD);
    const last = routePoints(grid, path, PATH_BOARD).pop();

    assert.strictEqual(last.x, goal.x + PATH_BOARD.cell / 2 + PATH_BOARD.rim);
    assert.strictEqual(last.z, goal.z);
  });
});

QUnit.module("smoothPoints", () => {
  const length = (points) => points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i].x, p.z - points[i].z), 0);
  const square = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 4, z: 4 },
  ];

  QUnit.test("the first and the last points do not move", (assert) => {
    const out = smoothPoints(square);

    assert.deepEqual(out[0], square[0]);
    assert.deepEqual(out[out.length - 1], square[2]);
  });

  QUnit.test("a straight line is left as it is", (assert) => {
    const line = [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 4, z: 0 }, { x: 6, z: 0 }];

    assert.deepEqual(smoothPoints(line), line);
  });

  QUnit.test("a corner is cut: the curve starts in the middle of one side and ends in the middle of the other", (assert) => {
    const out = smoothPoints(square, 6);

    assert.deepEqual(out[1], { x: 2, z: 0 });
    assert.deepEqual(out[out.length - 2], { x: 4, z: 2 });
  });

  QUnit.test("a corner is replaced by the number of samples plus one", (assert) => {
    assert.strictEqual(smoothPoints(square, 6).length, 2 + 7);
    assert.strictEqual(smoothPoints(square, 2).length, 2 + 3);
  });

  QUnit.test("the curve stays inside the corner: no point is outside the box of the three that made it", (assert) => {
    for (const p of smoothPoints(square)) assert.true(p.x >= 0 && p.x <= 4 && p.z >= 0 && p.z <= 4);
  });

  QUnit.test("the way round is shorter than the way along the sides, because it cuts the corner", (assert) => {
    assert.true(length(smoothPoints(square)) < length(square));
  });

  QUnit.test("it never turns sharply: each step is within a quarter of a turn of the last", (assert) => {
    const out = smoothPoints(square, 6);
    for (let i = 2; i < out.length; i++) {
      const a = Math.atan2(out[i - 1].x - out[i - 2].x, out[i - 1].z - out[i - 2].z);
      const b = Math.atan2(out[i].x - out[i - 1].x, out[i].z - out[i - 1].z);
      let turn = Math.abs(b - a);
      if (turn > Math.PI) turn = 2 * Math.PI - turn;

      assert.true(turn < Math.PI / 4, `step ${i}`);
    }
  });
});

QUnit.module("makeRoute and pointAlong", () => {
  const route = makeRoute([
    { x: 0, z: 0 },
    { x: 0, z: 4 },
    { x: 3, z: 4 },
  ]);

  QUnit.test("the route knows how far along each point is, and how long it is", (assert) => {
    assert.deepEqual(route.lengths, [0, 4, 7]);
    assert.strictEqual(route.total, 7);
  });

  QUnit.test("zero is the start, and the whole length is the end", (assert) => {
    assert.deepEqual({ x: pointAlong(route, 0).x, z: pointAlong(route, 0).z }, { x: 0, z: 0 });
    assert.deepEqual({ x: pointAlong(route, 7).x, z: pointAlong(route, 7).z }, { x: 3, z: 4 });
  });

  QUnit.test("in between, it is in between", (assert) => {
    assert.deepEqual({ x: pointAlong(route, 2).x, z: pointAlong(route, 2).z }, { x: 0, z: 2 });
    assert.deepEqual({ x: pointAlong(route, 5.5).x, z: pointAlong(route, 5.5).z }, { x: 1.5, z: 4 });
  });

  QUnit.test("it goes round a corner: the point where two sides meet is on both", (assert) => {
    const p = pointAlong(route, 4);

    assert.true(Math.abs(p.x) < 1e-9 && Math.abs(p.z - 4) < 1e-9);
  });

  QUnit.test("before the start, or past the end, it stays at the start or the end", (assert) => {
    assert.strictEqual(pointAlong(route, -5).z, 0);
    assert.strictEqual(pointAlong(route, 99).x, 3);
  });

  QUnit.test("it faces the way it is going: more z is yaw 0, more x is a quarter turn, and less x is a quarter turn back", (assert) => {
    assert.strictEqual(pointAlong(route, 2).yaw, 0);
    assert.strictEqual(pointAlong(route, 5).yaw, Math.PI / 2);
    const back = makeRoute([{ x: 3, z: 0 }, { x: 0, z: 0 }]);

    assert.strictEqual(pointAlong(back, 1).yaw, -Math.PI / 2);
  });

  QUnit.test("at the very end it still faces the way of the last side", (assert) => {
    assert.strictEqual(pointAlong(route, 7).yaw, Math.PI / 2);
  });

  QUnit.test("a route of no length does not divide by nothing", (assert) => {
    const still = makeRoute([{ x: 1, z: 1 }, { x: 1, z: 1 }]);

    assert.strictEqual(pointAlong(still, 0).x, 1);
  });
});

QUnit.module("routeFor", () => {
  QUnit.test("a map with no road has no route", (assert) => {
    assert.strictEqual(routeFor(parseMap({ name: "test", rows: ["...."] })), null);
  });

  QUnit.test("a real map has one, that starts off the board and ends off the board", (assert) => {
    for (const map of MAPS) {
      const route = routeFor(parseMap(map));
      const start = route.points[0];
      const end = route.points[route.points.length - 1];
      const halfWidth = (BOARD.cols * BOARD.cell) / 2;
      const halfDepth = (BOARD.rows * BOARD.cell) / 2;
      const outside = (p) => Math.abs(p.x) > halfWidth || Math.abs(p.z) > halfDepth;

      assert.true(outside(start) && outside(end), map.name);
    }
  });

  QUnit.test("every point of the route is on the island", (assert) => {
    for (const map of MAPS) {
      for (const p of routeFor(parseMap(map)).points) {
        assert.true(Math.abs(p.x) <= (BOARD.cols * BOARD.cell) / 2 + BOARD.rim + 1e-9, map.name);
        assert.true(Math.abs(p.z) <= (BOARD.rows * BOARD.cell) / 2 + BOARD.rim + 1e-9, map.name);
      }
    }
  });

  QUnit.test("it is about a cell long for every cell of road, a little less for the corners it cuts, and a little more for the ways on and off", (assert) => {
    for (const map of MAPS) {
      const grid = parseMap(map);
      const cells = findPath(grid).length;
      const route = routeFor(grid);
      const straight = (cells - 1) * BOARD.cell + 2 * (BOARD.cell / 2 + BOARD.rim);

      assert.true(route.total < straight, `${map.name}: cut corners are shorter`);
      assert.true(route.total > straight * 0.85, `${map.name}: but not by much`);
    }
  });
});
