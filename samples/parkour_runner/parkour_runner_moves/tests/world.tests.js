QUnit.module("seededRandom", () => {
  QUnit.test("gives the same numbers for the same seed", (assert) => {
    const a = seededRandom(42);
    const b = seededRandom(42);

    for (let i = 0; i < 20; i++) assert.strictEqual(a(), b());
  });

  QUnit.test("gives different numbers for different seeds", (assert) => {
    assert.notStrictEqual(seededRandom(1)(), seededRandom(2)());
  });

  QUnit.test("stays between 0 (included) and 1 (not included)", (assert) => {
    const random = seededRandom(7);

    for (let i = 0; i < 1000; i++) {
      const value = random();
      assert.true(value >= 0 && value < 1, `${value} is in range`);
    }
  });

  QUnit.test("doesn't repeat the same number over and over", (assert) => {
    const random = seededRandom(7);
    const seen = new Set();

    for (let i = 0; i < 100; i++) seen.add(random());

    assert.true(seen.size > 90);
  });
});

QUnit.module("BUILDINGS", () => {
  QUnit.test("every building has a piece name, and a footprint bigger than nothing", (assert) => {
    for (const building of BUILDINGS) {
      assert.true(/^commercial\/[\w-]+$/.test(building.piece), `${building.piece}: a piece in the commercial kit`);
      assert.true(building.width > 0 && building.depth > 0, `${building.piece}: has a footprint`);
    }
  });

  QUnit.test("no building is listed twice", (assert) => {
    assert.strictEqual(new Set(BUILDINGS.map((b) => b.piece)).size, BUILDINGS.length);
  });
});

const assertClose = (assert, actual, expected, tolerance, message) =>
  assert.true(Math.abs(actual - expected) <= tolerance, message || `expected ${actual} to be within ${tolerance} of ${expected}`);


QUnit.module("buildingAt", () => {
  const widthOf = (piece) => BUILDINGS.find((b) => b.piece === piece).width * WORLD_SCALE;
  const depthOf = (piece) => BUILDINGS.find((b) => b.piece === piece).depth * WORLD_SCALE;

  QUnit.test("starts where it is told to: its near edge is at fromZ", (assert) => {
    const building = buildingAt(1, 40, () => 0);

    assertClose(assert, building.z - widthOf(building.piece) / 2, 40, 1e-9);
  });

  QUnit.test("ends one width further along, and says so in endZ", (assert) => {
    const building = buildingAt(1, 40, () => 0);

    assertClose(assert, building.endZ, 40 + widthOf(building.piece), 1e-9);
  });

  QUnit.test("stands on the left for side -1 and the right for side 1", (assert) => {
    assert.true(buildingAt(-1, 0, () => 0).x < 0);
    assert.true(buildingAt(1, 0, () => 0).x > 0);
  });

  QUnit.test("its front stands at the edge of the sidewalk, however deep it is", (assert) => {
    for (const r of [0, 0.3, 0.6, 0.9999]) {
      const building = buildingAt(1, 0, () => r);

      assertClose(assert, building.x - depthOf(building.piece) / 2, BUILDING_EDGE_X, 1e-9, `${building.piece}`);
    }
  });

  QUnit.test("faces the middle of the street from either side", (assert) => {
    // Facing is -z at rotation 0. A quarter turn of +PI/2 faces -x, and -PI/2 faces +x.
    assert.true(buildingAt(1, 0, () => 0).rotationY > 0, "the right side turns to face -x");
    assert.true(buildingAt(-1, 0, () => 0).rotationY < 0, "the left side turns to face +x");
  });

  QUnit.test("uses one random number to choose the building", (assert) => {
    let calls = 0;

    buildingAt(1, 0, () => {
      calls++;
      return 0.5;
    });

    assert.strictEqual(calls, 1);
  });

  QUnit.test("the random number picks from the list: 0 is the first building and nearly 1 the last", (assert) => {
    assert.strictEqual(buildingAt(1, 0, () => 0).piece, BUILDINGS[0].piece);
    assert.strictEqual(buildingAt(1, 0, () => 0.9999).piece, BUILDINGS[BUILDINGS.length - 1].piece);
  });
});

QUnit.module("rowPieces", () => {
  const ofPiece = (pieces, name) => pieces.filter((p) => p.piece === name);

  QUnit.test("row 0 has a road tile in the middle of the street, turned to run along it", (assert) => {
    const [road] = ofPiece(rowPieces(0), "roads/road_straight");

    assert.strictEqual(road.x, 0);
    assert.strictEqual(road.z, 0);
    assertClose(assert, road.rotationY, Math.PI / 2, 1e-9);
  });

  QUnit.test("each row is one tile further along, and all its pieces are at that z", (assert) => {
    for (const row of [-1, 0, 1, 5]) {
      for (const piece of rowPieces(row)) assert.strictEqual(piece.z, row * TILE, `row ${row}: ${piece.piece}`);
    }
  });

  QUnit.test("a sidewalk tile sits beside the road on each side", (assert) => {
    const sidewalks = ofPiece(rowPieces(3), "roads/tile_low");

    assert.strictEqual(sidewalks.length, 2);
    assert.deepEqual(sidewalks.map((s) => s.x).sort((a, b) => a - b), [-SIDEWALK_X, SIDEWALK_X]);
  });

  QUnit.test("a street light stands every LIGHT_EVERY rows, and not between", (assert) => {
    for (let row = 0; row < 8; row++) {
      const lights = ofPiece(rowPieces(row), "roads/light_square");

      assert.strictEqual(lights.length, row % LIGHT_EVERY === 0 ? 1 : 0, `row ${row}`);
    }
  });

  QUnit.test("the lights alternate sides, left then right", (assert) => {
    const side = (row) => Math.sign(ofPiece(rowPieces(row), "roads/light_square")[0].x);

    assert.strictEqual(side(0), -1);
    assert.strictEqual(side(LIGHT_EVERY), 1);
    assert.strictEqual(side(LIGHT_EVERY * 2), -1);
  });

  QUnit.test("each light's arm is turned to reach over the road", (assert) => {
    for (const row of [0, LIGHT_EVERY, LIGHT_EVERY * 2, LIGHT_EVERY * 3]) {
      const [light] = ofPiece(rowPieces(row), "roads/light_square");

      // The arm points along the piece's +z. A quarter turn one way sends it toward +x, the other way toward -x.
      assert.strictEqual(Math.sign(light.rotationY), -Math.sign(light.x), `row ${row}`);
    }
  });

  QUnit.test("every piece says where its row ends", (assert) => {
    for (const piece of rowPieces(4)) assertClose(assert, piece.endZ, 4 * TILE + TILE / 2, 1e-9, piece.piece);
  });

  QUnit.test("the same row always gives the same pieces, so rows can be made in any order", (assert) => {
    assert.deepEqual(rowPieces(6), rowPieces(6));
  });

  QUnit.test("rows behind the start work too", (assert) => {
    const road = ofPiece(rowPieces(-1), "roads/road_straight")[0];

    assert.strictEqual(road.z, -TILE);
    assert.strictEqual(ofPiece(rowPieces(-1), "roads/light_square").length, 0);
    assert.strictEqual(ofPiece(rowPieces(-2), "roads/light_square").length, 1);
  });
});

QUnit.module("STREET_PIECES", () => {
  QUnit.test("includes the road, the sidewalk and the street light", (assert) => {
    for (const name of ["roads/road_straight", "roads/tile_low", "roads/light_square"]) assert.true(STREET_PIECES.includes(name), name);
  });

  QUnit.test("includes every building", (assert) => {
    for (const building of BUILDINGS) assert.true(STREET_PIECES.includes(building.piece), building.piece);
  });

  QUnit.test("lists each piece once", (assert) => {
    assert.strictEqual(new Set(STREET_PIECES).size, STREET_PIECES.length);
  });

  QUnit.test("covers every piece the street can make", (assert) => {
    for (let row = -4; row < 20; row++) {
      for (const piece of rowPieces(row)) assert.true(STREET_PIECES.includes(piece.piece), piece.piece);
    }
    const random = seededRandom(3);
    for (let i = 0; i < 200; i++) assert.true(STREET_PIECES.includes(buildingAt(1, 0, random).piece));
  });
});
