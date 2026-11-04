// A small board to test with: four across and three deep, in cells of two units, so the numbers are easy to check by hand.
const SMALL = { cols: 4, rows: 3, cell: 2, rim: 0, depth: 1, peek: 1, headroom: 1 };

QUnit.module("the BOARD table", () => {
  QUnit.test("the counts are whole numbers, and the sizes are more than nothing", (assert) => {
    assert.true(Number.isInteger(BOARD.cols) && BOARD.cols > 0);
    assert.true(Number.isInteger(BOARD.rows) && BOARD.rows > 0);
    assert.true(BOARD.cell > 0);
    assert.true(BOARD.depth > 0 && BOARD.headroom > 0 && BOARD.rim >= 0);
  });

  QUnit.test("the view never makes room for more rock than there is", (assert) => {
    assert.true(BOARD.peek > 0 && BOARD.peek <= BOARD.depth);
  });
});

QUnit.module("cellCenter", () => {
  QUnit.test("the board is centered on the origin: the first cell is back left", (assert) => {
    const first = cellCenter(0, 0, SMALL);

    assert.strictEqual(first.x, -3);
    assert.strictEqual(first.z, 2);
  });

  QUnit.test("the last cell is front right", (assert) => {
    const last = cellCenter(SMALL.cols - 1, SMALL.rows - 1, SMALL);

    assert.strictEqual(last.x, 3);
    assert.strictEqual(last.z, -2);
  });

  QUnit.test("row 0 is the far edge: the further a row is down the board, the nearer the camera it is", (assert) => {
    assert.true(cellCenter(0, 0, SMALL).z > cellCenter(0, 1, SMALL).z);
    assert.true(cellCenter(0, 1, SMALL).z > cellCenter(0, 2, SMALL).z);
  });

  QUnit.test("neighbours are one cell apart", (assert) => {
    const a = cellCenter(1, 1, SMALL);
    const right = cellCenter(2, 1, SMALL);
    const below = cellCenter(1, 2, SMALL);

    assert.strictEqual(right.x - a.x, SMALL.cell);
    assert.strictEqual(a.z - below.z, SMALL.cell);
  });

  QUnit.test("the middles of all the cells average to the origin", (assert) => {
    const cells = boardCells();
    const x = cells.reduce((sum, c) => sum + cellCenter(c.col, c.row).x, 0) / cells.length;
    const z = cells.reduce((sum, c) => sum + cellCenter(c.col, c.row).z, 0) / cells.length;

    assert.true(Math.abs(x) < 1e-9);
    assert.true(Math.abs(z) < 1e-9);
  });
});

QUnit.module("cellAt", () => {
  QUnit.test("the middle of every cell is in that cell", (assert) => {
    for (const { col, row } of boardCells()) {
      const { x, z } = cellCenter(col, row);

      assert.deepEqual(cellAt(x, z), { col, row });
    }
  });

  QUnit.test("anywhere in a cell is in that cell, up to its edge", (assert) => {
    const { x, z } = cellCenter(2, 1, SMALL);
    const almost = SMALL.cell / 2 - 0.001;

    assert.deepEqual(cellAt(x - almost, z + almost, SMALL), { col: 2, row: 1 });
    assert.deepEqual(cellAt(x + almost, z - almost, SMALL), { col: 2, row: 1 });
  });

  QUnit.test("a place off the board is in no cell", (assert) => {
    const { maxX, minX, maxZ, minZ } = boardBounds(SMALL);

    assert.strictEqual(cellAt(maxX + 0.01, 0, SMALL), null);
    assert.strictEqual(cellAt(minX - 0.01, 0, SMALL), null);
    assert.strictEqual(cellAt(0, maxZ + 0.01, SMALL), null);
    assert.strictEqual(cellAt(0, minZ - 0.01, SMALL), null);
  });
});

QUnit.module("inBoard", () => {
  QUnit.test("the corners are on the board", (assert) => {
    assert.true(inBoard(0, 0, SMALL));
    assert.true(inBoard(SMALL.cols - 1, SMALL.rows - 1, SMALL));
  });

  QUnit.test("one past the edge, or before it, is not", (assert) => {
    assert.false(inBoard(-1, 0, SMALL));
    assert.false(inBoard(0, -1, SMALL));
    assert.false(inBoard(SMALL.cols, 0, SMALL));
    assert.false(inBoard(0, SMALL.rows, SMALL));
  });

  QUnit.test("half a cell is not a cell", (assert) => {
    assert.false(inBoard(1.5, 1, SMALL));
    assert.false(inBoard(NaN, 1, SMALL));
  });
});

QUnit.module("boardCells", () => {
  QUnit.test("there is one for every cell", (assert) => {
    assert.strictEqual(boardCells(SMALL).length, SMALL.cols * SMALL.rows);
  });

  QUnit.test("they go along a row, and then on to the next", (assert) => {
    const cells = boardCells(SMALL);

    assert.deepEqual(cells[0], { col: 0, row: 0 });
    assert.deepEqual(cells[1], { col: 1, row: 0 });
    assert.deepEqual(cells[SMALL.cols], { col: 0, row: 1 });
  });
});

QUnit.module("boardBounds", () => {
  QUnit.test("the edges are half the board's size from the middle", (assert) => {
    assert.deepEqual(boardBounds(SMALL), { minX: -4, maxX: 4, minZ: -3, maxZ: 3 });
  });

  QUnit.test("the real board's width and depth are its cells counted", (assert) => {
    const { minX, maxX, minZ, maxZ } = boardBounds();

    assert.strictEqual(maxX - minX, BOARD.cols * BOARD.cell);
    assert.strictEqual(maxZ - minZ, BOARD.rows * BOARD.cell);
  });
});
