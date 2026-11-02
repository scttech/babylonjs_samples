QUnit.module("turnSides", () => {
  QUnit.test("no turn leaves the sides as they are", (assert) => {
    for (let sides = 0; sides < 16; sides++) assert.strictEqual(turnSides(sides, 0), sides);
  });

  QUnit.test("a quarter turn clockwise takes the back to the right, the right to the front, the front to the left, and the left to the back", (assert) => {
    assert.strictEqual(turnSides(NORTH, 1), EAST);
    assert.strictEqual(turnSides(EAST, 1), SOUTH);
    assert.strictEqual(turnSides(SOUTH, 1), WEST);
    assert.strictEqual(turnSides(WEST, 1), NORTH);
  });

  QUnit.test("four quarter turns come back to where it began, for every set of sides", (assert) => {
    for (let sides = 0; sides < 16; sides++) assert.strictEqual(turnSides(turnSides(turnSides(turnSides(sides, 1), 1), 1), 1), sides);
  });

  QUnit.test("turning by several at once is turning by one that many times", (assert) => {
    for (let sides = 0; sides < 16; sides++) assert.strictEqual(turnSides(sides, 3), turnSides(turnSides(sides, 2), 1));
  });

  QUnit.test("more than a whole turn, or a turn the other way, still works", (assert) => {
    assert.strictEqual(turnSides(NORTH, 5), EAST);
    assert.strictEqual(turnSides(NORTH, -1), WEST);
  });

  QUnit.test("it never makes a side that was not there: the number of sides stays the same", (assert) => {
    const count = (n) => [NORTH, EAST, SOUTH, WEST].filter((side) => n & side).length;
    for (let sides = 0; sides < 16; sides++) for (let turn = 0; turn < 4; turn++) assert.strictEqual(count(turnSides(sides, turn)), count(sides));
  });
});

QUnit.module("sidesOf", () => {
  QUnit.test("a straight piece joins the back and the front, and turned a quarter, the left and the right", (assert) => {
    assert.strictEqual(sidesOf("straight", 0), NORTH | SOUTH);
    assert.strictEqual(sidesOf("straight", 1), EAST | WEST);
  });

  QUnit.test("a corner joins the back and the right, and each quarter turn takes it round to the next corner", (assert) => {
    assert.deepEqual([0, 1, 2, 3].map((turn) => sidesOf("corner", turn)), [NORTH | EAST, EAST | SOUTH, SOUTH | WEST, WEST | NORTH]);
  });

  QUnit.test("a junction has a branch to the back, and no road to the front", (assert) => {
    assert.strictEqual(sidesOf("junction", 0), NORTH | EAST | WEST);
  });

  QUnit.test("a crossroads joins all four, however it is turned", (assert) => {
    for (let turn = 0; turn < 4; turn++) assert.strictEqual(sidesOf("crossroads", turn), 15);
  });

  QUnit.test("grass joins nothing", (assert) => {
    assert.strictEqual(sidesOf("grass", 2), 0);
  });

  QUnit.test("there is a row for every kind of road in the tiles table, and for no other", (assert) => {
    assert.deepEqual(Object.keys(BASE_SIDES).sort(), Object.keys(TILES).filter((kind) => kind !== "grass").sort());
  });
});

QUnit.module("roadPiece", () => {
  const count = (n) => [NORTH, EAST, SOUTH, WEST].filter((side) => n & side).length;

  QUnit.test("for every set of sides with two or more roads, the piece joins exactly those", (assert) => {
    for (let mask = 0; mask < 16; mask++) {
      if (count(mask) < 2) continue;
      const { kind, turn } = roadPiece(mask);

      assert.strictEqual(sidesOf(kind, turn), mask, `mask ${mask}`);
    }
  });

  QUnit.test("two sides across from each other are a straight piece, and two side by side are a corner", (assert) => {
    assert.strictEqual(roadPiece(NORTH | SOUTH).kind, "straight");
    assert.strictEqual(roadPiece(EAST | WEST).kind, "straight");
    for (const mask of [NORTH | EAST, EAST | SOUTH, SOUTH | WEST, WEST | NORTH]) assert.strictEqual(roadPiece(mask).kind, "corner");
  });

  QUnit.test("three sides are a junction, and four a crossroads", (assert) => {
    for (const missing of [NORTH, EAST, SOUTH, WEST]) assert.strictEqual(roadPiece(15 & ~missing).kind, "junction");
    assert.strictEqual(roadPiece(15).kind, "crossroads");
  });

  QUnit.test("a road with one neighbor is a straight piece pointing at it, for the end of a road", (assert) => {
    for (const side of [NORTH, EAST, SOUTH, WEST]) {
      const { kind, turn } = roadPiece(side);

      assert.strictEqual(kind, "straight");
      assert.true((sidesOf(kind, turn) & side) !== 0, `side ${side}`);
    }
  });

  QUnit.test("a road with no neighbors is a straight piece, because it has to be something", (assert) => {
    assert.deepEqual(roadPiece(0), { kind: "straight", turn: 0 });
  });

  QUnit.test("only the four bits count", (assert) => {
    assert.deepEqual(roadPiece(16 + 5), roadPiece(5));
  });

  QUnit.test("every piece it gives is one that there is a model for", (assert) => {
    for (let mask = 0; mask < 16; mask++) assert.true(roadPiece(mask).kind in TILES);
  });
});

QUnit.module("neighborMask and pieceAt", () => {
  const grid = parseMap({ name: "test", rows: ["S##", "..#", "..G"] });

  QUnit.test("the mask has a bit for each side that has road", (assert) => {
    assert.strictEqual(neighborMask(grid, 1, 0), EAST | WEST, "the second cell has the start on its left, and the corner on its right");
    assert.strictEqual(neighborMask(grid, 2, 0), WEST | SOUTH);
    assert.strictEqual(neighborMask(grid, 0, 0), EAST);
  });

  QUnit.test("the edge of the map has no road beyond it", (assert) => {
    assert.strictEqual(neighborMask(grid, 2, 2), NORTH);
  });

  QUnit.test("a corner of a road is a corner piece, turned to join its neighbors", (assert) => {
    assert.deepEqual(pieceAt(grid, 2, 0), { kind: "corner", turn: 2 });
  });

  QUnit.test("a stretch of road is a straight piece, the way the road goes", (assert) => {
    assert.deepEqual(pieceAt(grid, 1, 0), { kind: "straight", turn: 1 });
    assert.deepEqual(pieceAt(grid, 2, 1), { kind: "straight", turn: 0 });
  });

  QUnit.test("the start and the goal are straight pieces pointing along the road", (assert) => {
    assert.deepEqual(pieceAt(grid, 0, 0), { kind: "straight", turn: 1 });
    assert.deepEqual(pieceAt(grid, 2, 2), { kind: "straight", turn: 0 });
  });

  QUnit.test("grass is grass, turned in the way grassTurn says", (assert) => {
    assert.deepEqual(pieceAt(grid, 0, 2), { kind: "grass", turn: grassTurn(0, 2) });
  });

  QUnit.test("on every real map, every piece of road joins every road beside it", (assert) => {
    for (const map of MAPS) {
      const real = parseMap(map);
      real.cells.forEach((line, row) =>
        line.forEach((cell, col) => {
          if (cell !== "road") return;
          const { kind, turn } = pieceAt(real, col, row);
          const wanted = neighborMask(real, col, row);

          assert.strictEqual(sidesOf(kind, turn) & wanted, wanted, `${map.name} ${col},${row}`);
        })
      );
    }
  });

  QUnit.test("a map with branches gets junctions and a crossroads", (assert) => {
    const crossed = parseMap({ name: "test", rows: [".#.", "###", ".#."] });

    assert.strictEqual(pieceAt(crossed, 1, 1).kind, "crossroads");
    assert.strictEqual(pieceAt(crossed, 1, 0).kind, "straight");
    assert.strictEqual(pieceAt(parseMap({ name: "test", rows: [".#.", "###", "..."] }), 1, 1).kind, "junction");
  });
});
