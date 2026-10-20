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

QUnit.module("streetLayout", () => {
  const layout = (options) => streetLayout({ rows: 6, random: seededRandom(3), ...options });
  const ofPiece = (placements, piece) => placements.filter((p) => p.piece === piece);

  QUnit.test("has one road tile per row, in a line down the middle of the street", (assert) => {
    const roads = ofPiece(layout(), "roads/road_straight");

    assert.strictEqual(roads.length, 6);
    for (const road of roads) assert.strictEqual(road.x, 0);
  });

  QUnit.test("the road tiles are one tile apart, starting a row behind the start", (assert) => {
    const roads = ofPiece(layout(), "roads/road_straight");

    assert.strictEqual(roads[0].z, -TILE);
    for (let i = 1; i < roads.length; i++) assertClose(assert, roads[i].z - roads[i - 1].z, TILE, 1e-9);
  });

  QUnit.test("the first row can be moved with firstZ", (assert) => {
    const roads = ofPiece(layout({ firstZ: 100 }), "roads/road_straight");

    assert.strictEqual(roads[0].z, 100);
  });

  QUnit.test("the road tiles are turned to run along the street, not across it", (assert) => {
    for (const road of ofPiece(layout(), "roads/road_straight")) assertClose(assert, road.rotationY, Math.PI / 2, 1e-9);
  });

  QUnit.test("a sidewalk tile sits beside the road on each side of every row", (assert) => {
    const sidewalks = ofPiece(layout(), "roads/tile_low");

    assert.strictEqual(sidewalks.length, 12);
    assert.strictEqual(sidewalks.filter((s) => s.x === -SIDEWALK_X).length, 6, "left");
    assert.strictEqual(sidewalks.filter((s) => s.x === SIDEWALK_X).length, 6, "right");
  });

  QUnit.test("sidewalks line up with the road tile in their row", (assert) => {
    const placements = layout();
    const roadZs = ofPiece(placements, "roads/road_straight").map((r) => r.z);

    for (const sidewalk of ofPiece(placements, "roads/tile_low")) assert.true(roadZs.includes(sidewalk.z));
  });

  QUnit.test("street lights stand every LIGHT_EVERY rows, one side then the other", (assert) => {
    const lights = ofPiece(layout({ rows: 8 }), "roads/light_square");

    assert.strictEqual(lights.length, Math.ceil(8 / LIGHT_EVERY));
    assert.true(lights[0].x < 0, "the first is on the left");
    assert.true(lights[1].x > 0, "the next is on the right");
    assert.true(lights[2].x < 0, "then back to the left");
  });

  QUnit.test("each light's arm is turned to reach over the road", (assert) => {
    for (const light of ofPiece(layout({ rows: 8 }), "roads/light_square")) {
      // The arm points along the piece's +z. A quarter turn one way sends it toward +x, the other way toward -x.
      assert.strictEqual(Math.sign(light.rotationY), -Math.sign(light.x));
    }
  });

  QUnit.test("buildings stand on both sides of the street, set back from the sidewalk", (assert) => {
    const buildings = layout().filter((p) => p.piece.includes("building"));

    assert.true(buildings.some((b) => b.x < 0), "left");
    assert.true(buildings.some((b) => b.x > 0), "right");
    for (const b of buildings) assert.true(Math.abs(b.x) > BUILDING_EDGE_X, "set back beyond the edge of the sidewalk");
  });

  QUnit.test("buildings face the street from either side", (assert) => {
    for (const b of layout().filter((p) => p.piece.includes("building"))) {
      // Facing is -z at rotation 0. A quarter turn of +PI/2 faces -x, -PI/2 faces +x.
      const facingX = -Math.sign(b.rotationY);
      assert.strictEqual(facingX, -Math.sign(b.x), `${b.piece} at x = ${b.x} faces the middle of the street`);
    }
  });

  QUnit.test("a building's front stands at the edge no matter how deep it is", (assert) => {
    for (const b of layout().filter((p) => p.piece.includes("building"))) {
      const info = BUILDINGS.find((x) => x.piece === b.piece);
      const front = Math.abs(b.x) - (info.depth * WORLD_SCALE) / 2;
      assertClose(assert, front, BUILDING_EDGE_X, 1e-9, `${b.piece}'s front is at the edge`);
    }
  });

  QUnit.test("buildings on one side don't overlap, and leave a gap", (assert) => {
    const placements = layout({ rows: 10 });

    for (const side of [-1, 1]) {
      const row = placements.filter((p) => p.piece.includes("building") && Math.sign(p.x) === side);
      for (let i = 1; i < row.length; i++) {
        const before = BUILDINGS.find((b) => b.piece === row[i - 1].piece);
        const after = BUILDINGS.find((b) => b.piece === row[i].piece);
        const gap = row[i].z - (after.width * WORLD_SCALE) / 2 - (row[i - 1].z + (before.width * WORLD_SCALE) / 2);
        assertClose(assert, gap, BUILDING_GAP * WORLD_SCALE, 1e-9, `side ${side}, building ${i}`);
      }
    }
  });

  QUnit.test("buildings run the whole length of the street, on both sides", (assert) => {
    const rows = 10;
    const placements = layout({ rows });
    const streetEnd = -TILE + (rows - 1) * TILE + TILE / 2;

    for (const side of [-1, 1]) {
      const row = placements.filter((p) => p.piece.includes("building") && Math.sign(p.x) === side);
      const last = row[row.length - 1];
      const lastInfo = BUILDINGS.find((b) => b.piece === last.piece);
      assert.true(last.z + (lastInfo.width * WORLD_SCALE) / 2 >= streetEnd, `side ${side} reaches the end`);
      const first = row[0];
      const firstInfo = BUILDINGS.find((b) => b.piece === first.piece);
      assertClose(assert, first.z - (firstInfo.width * WORLD_SCALE) / 2, -TILE - TILE / 2, 1e-9, `side ${side} starts at the start`);
    }
  });

  QUnit.test("the same seed gives the same street", (assert) => {
    assert.deepEqual(streetLayout({ rows: 8, random: seededRandom(5) }), streetLayout({ rows: 8, random: seededRandom(5) }));
  });

  QUnit.test("a different seed gives different buildings", (assert) => {
    const a = streetLayout({ rows: 8, random: seededRandom(1) }).filter((p) => p.piece.includes("building"));
    const b = streetLayout({ rows: 8, random: seededRandom(2) }).filter((p) => p.piece.includes("building"));

    assert.notDeepEqual(a, b);
  });

  QUnit.test("with no rows there is no street", (assert) => {
    assert.strictEqual(ofPiece(streetLayout({ rows: 0 }), "roads/road_straight").length, 0);
  });
});

QUnit.module("layoutSide", () => {
  QUnit.test("uses the random numbers to choose which building comes next", (assert) => {
    const first = layoutSide(1, 0, 1, () => 0); // 0 picks the first in the list
    const last = layoutSide(1, 0, 1, () => 0.9999); // nearly 1 picks the last

    assert.strictEqual(first[0].piece, BUILDINGS[0].piece);
    assert.strictEqual(last[0].piece, BUILDINGS[BUILDINGS.length - 1].piece);
  });

  QUnit.test("stops as soon as the length is covered", (assert) => {
    // The first building is 0.884 units wide: one is enough for a length shorter than that.
    const placements = layoutSide(1, 0, 3, () => 0);

    assert.strictEqual(placements.length, 1);
  });
});

QUnit.module("piecesUsed", () => {
  QUnit.test("lists each piece once, however many times it is placed", (assert) => {
    const used = piecesUsed([{ piece: "a" }, { piece: "b" }, { piece: "a" }, { piece: "a" }]);

    assert.deepEqual(used, ["a", "b"]);
  });

  QUnit.test("covers every piece in a real layout", (assert) => {
    const placements = streetLayout({ rows: 12, random: seededRandom(7) });
    const used = piecesUsed(placements);

    assert.true(used.includes("roads/road_straight"));
    assert.true(used.includes("roads/tile_low"));
    assert.true(used.includes("roads/light_square"));
    assert.strictEqual(new Set(used).size, used.length, "no repeats");
    for (const p of placements) assert.true(used.includes(p.piece));
  });
});

