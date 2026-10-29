QUnit.module("the size of the district", () => {
  QUnit.test("the junctions are a junction and the tiles between them apart", (assert) => {
    assert.strictEqual(spacing(GRID), STREET.junction + GRID.tilesBetween * STREET.tile);
  });

  QUnit.test("a block is the space between two streets, sidewalk to sidewalk", (assert) => {
    assert.strictEqual(blockSize(GRID), spacing(GRID) - STREET.width);
  });

  QUnit.test("the middle of the district is the middle of the middle junction, and the origin", (assert) => {
    const grid = { ...GRID, blocksX: 2, blocksZ: 2 };
    const middle = junctionCenter(grid, 1, 1);
    assert.strictEqual(middle.x, 0);
    assert.strictEqual(middle.z, 0);
  });

  QUnit.test("a block is half way between its four junctions", (assert) => {
    const a = junctionCenter(GRID, 0, 0);
    const b = junctionCenter(GRID, 1, 1);
    const block = blockCenter(GRID, 0, 0);
    assert.true(Math.abs(block.x - (a.x + b.x) / 2) < 1e-9);
    assert.true(Math.abs(block.z - (a.z + b.z) / 2) < 1e-9);
  });

  QUnit.test("the district is as big as the plan says, whatever the grid", (assert) => {
    const small = { blocksX: 1, blocksZ: 1, tilesBetween: 2, extraTiles: 1 };
    const bounds = districtBounds(small);
    assert.strictEqual(bounds.maxX - bounds.minX, spacing(small) + STREET.junction + 2 * STREET.tile);
    assert.strictEqual(bounds.maxX, -bounds.minX);
  });
});

QUnit.module("streetPlacements", () => {
  const streets = streetPlacements(GRID);

  QUnit.test("there is a junction at every crossing", (assert) => {
    const junctions = streets.filter((p) => p.piece === STREET.junctionFile);
    assert.strictEqual(junctions.length, (GRID.blocksX + 1) * (GRID.blocksZ + 1));
  });

  QUnit.test("the number of tiles follows the grid: tiles between every pair of junctions, and past the edge", (assert) => {
    const small = { blocksX: 1, blocksZ: 1, tilesBetween: 3, extraTiles: 2 };
    const tiles = streetPlacements(small).filter((p) => p.piece === STREET.file);
    // 4 gaps of 3 tiles between the junctions of a 2 by 2 grid of junctions, and 8 arms of 2 tiles going out
    assert.strictEqual(tiles.length, 4 * 3 + 8 * 2);
  });

  QUnit.test("roads along x are not turned, and roads along z are turned a quarter", (assert) => {
    const tiles = streets.filter((p) => p.piece === STREET.file);
    assert.true(tiles.some((p) => p.rotationY === 0));
    assert.true(tiles.some((p) => p.rotationY === Math.PI / 2));
  });

  QUnit.test("no two pieces are in the same place", (assert) => {
    const keys = streets.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`);
    assert.strictEqual(new Set(keys).size, keys.length);
  });

  QUnit.test("tiles of a road are a tile apart, and the first starts where its junction ends", (assert) => {
    const first = junctionCenter(GRID, 0, 0);
    const along = streets.filter((p) => p.piece === STREET.file && p.rotationY === 0 && Math.abs(p.z - first.z) < 1e-9 && p.x > first.x && p.x < first.x + spacing(GRID));
    along.sort((a, b) => a.x - b.x);
    assert.strictEqual(along.length, GRID.tilesBetween);
    assert.true(Math.abs(along[0].x - (first.x + STREET.junction / 2 + STREET.tile / 2)) < 1e-9);
    for (let i = 1; i < along.length; i++) assert.true(Math.abs(along[i].x - along[i - 1].x - STREET.tile) < 1e-9);
  });

  QUnit.test("the road reaches the edge of the district", (assert) => {
    const bounds = districtBounds(GRID);
    const farthest = Math.max(...streets.map((p) => Math.abs(p.x) + (p.rotationY === 0 && p.piece === STREET.file ? STREET.tile / 2 : 0)));
    assert.true(Math.abs(farthest - bounds.maxX) < 1e-9);
  });
});

QUnit.module("buildingPlacements and the plan", () => {
  const buildings = buildingPlacements(GRID, LAYOUTS);

  QUnit.test("the plan has no problems: every building is in its block, and none overlap or are too close", (assert) => {
    assert.deepEqual(planProblems(GRID, LAYOUTS), []);
  });

  QUnit.test("there is a placement for every entry of every layout", (assert) => {
    const wanted = Object.values(LAYOUTS).reduce((sum, list) => sum + list.length, 0);
    assert.strictEqual(buildings.length, wanted);
  });

  QUnit.test("every building is a building of the kit, with a size", (assert) => {
    for (const building of buildings) {
      assert.true(building.width > 0 && building.depth > 0 && building.height > 0, building.name);
      assert.true(building.piece.startsWith("Building_"), building.name);
    }
  });

  QUnit.test("a building facing a street stands right at its sidewalk", (assert) => {
    const half = blockSize(GRID) / 2;
    for (const building of buildings.filter((b) => b.facing === "north")) {
      const center = blockCenter(GRID, ...building.block.split(",").map(Number));
      if (building.name === "large_1") continue; // the tower stands in the middle of its block
      assert.true(Math.abs(building.z + building.depth / 2 - (center.z + half)) < 1e-9, building.name);
    }
    for (const building of buildings.filter((b) => b.facing === "south")) {
      const center = blockCenter(GRID, ...building.block.split(",").map(Number));
      assert.true(Math.abs(building.z - building.depth / 2 - (center.z - half)) < 1e-9, building.name);
    }
  });

  QUnit.test("a building turned to the east or west swaps its width and depth", (assert) => {
    const size = footprintSize(BUILDINGS.small_1, "east");
    assert.strictEqual(size.width, BUILDINGS.small_1.depth);
    assert.strictEqual(size.depth, BUILDINGS.small_1.width);
    assert.deepEqual(footprintSize(BUILDINGS.small_1, "north"), { width: BUILDINGS.small_1.width, depth: BUILDINGS.small_1.depth });
  });

  QUnit.test("a column of buildings along an east or west street is placed against it too", (assert) => {
    const layouts = { "0,0": [{ building: "medium_1", facing: "east", v: 0 }, { building: "medium_1", facing: "west", v: 0 }] };
    const placed = buildingPlacements(GRID, layouts);
    const half = blockSize(GRID) / 2;
    const center = blockCenter(GRID, 0, 0);
    assert.true(Math.abs(placed[0].x + placed[0].width / 2 - (center.x + half)) < 1e-9);
    assert.true(Math.abs(placed[1].x - placed[1].width / 2 - (center.x - half)) < 1e-9);
  });

  QUnit.test("the facings are quarters of a turn", (assert) => {
    assert.deepEqual(FACINGS, { north: 0, east: Math.PI / 2, south: Math.PI, west: -Math.PI / 2 });
  });
});

QUnit.module("planProblems finds what is wrong", () => {
  QUnit.test("a building that sticks out of its block", (assert) => {
    const problems = planProblems(GRID, { "0,0": [{ building: "large_1", facing: "north", u: 10, v: 0 }] });
    assert.true(problems.some((text) => text.includes("sticks out")));
  });

  QUnit.test("two buildings that overlap", (assert) => {
    const problems = planProblems(GRID, { "0,0": [{ building: "small_1", facing: "north", u: 0 }, { building: "small_1", facing: "north", u: 5 }] });
    assert.true(problems.some((text) => text.includes("overlap")));
  });

  QUnit.test("an alley that is too narrow", (assert) => {
    const problems = planProblems(GRID, { "0,0": [{ building: "small_1", facing: "north", u: -8 }, { building: "small_1", facing: "north", u: 5.5 }] });
    assert.true(problems.some((text) => text.includes("alley")), problems.join("; "));
  });

  QUnit.test("a block that isn't there", (assert) => {
    const problems = planProblems(GRID, { "9,9": [{ building: "small_1", facing: "north", u: 0 }] });
    assert.true(problems.some((text) => text.includes("which there is not")));
  });

  QUnit.test("the least alley is as wide as MIN_ALLEY says", (assert) => {
    const wide = (gap) => ({ "0,0": [{ building: "small_1", facing: "north", u: -8 }, { building: "small_1", facing: "north", u: -8 + BUILDINGS.small_1.width + gap }] });
    assert.deepEqual(planProblems(GRID, wide(MIN_ALLEY + 0.01)), []);
    assert.strictEqual(planProblems(GRID, wide(MIN_ALLEY - 0.01)).length, 1);
  });
});

QUnit.module("footprints, boxes and gaps", () => {
  QUnit.test("a footprint is the ground a building covers", (assert) => {
    const box = footprint({ x: 10, z: -4, width: 6, depth: 2 });
    assert.deepEqual(box, { minX: 7, maxX: 13, minZ: -5, maxZ: -3 });
  });

  QUnit.test("boxGap says whether boxes overlap, and how far apart they are", (assert) => {
    const a = { minX: 0, maxX: 4, minZ: 0, maxZ: 4 };
    assert.true(boxGap(a, { minX: 3, maxX: 8, minZ: 3, maxZ: 8 }).overlap);
    assert.deepEqual(boxGap(a, { minX: 7, maxX: 9, minZ: 0, maxZ: 4 }), { overlap: false, gap: 3 });
    assert.deepEqual(boxGap(a, { minX: 7, maxX: 9, minZ: 8, maxZ: 9 }), { overlap: false, gap: 5 });
  });

  QUnit.test("boxes that touch don't overlap, and are 0 apart", (assert) => {
    const result = boxGap({ minX: 0, maxX: 4, minZ: 0, maxZ: 4 }, { minX: 4, maxX: 8, minZ: 0, maxZ: 4 });
    assert.deepEqual(result, { overlap: false, gap: 0 });
  });

  QUnit.test("buildingBoxes are the footprints, from the ground up to the roof", (assert) => {
    const boxes = buildingBoxes(GRID, LAYOUTS);
    const placed = buildingPlacements(GRID, LAYOUTS);
    assert.strictEqual(boxes.length, placed.length);
    boxes.forEach((box, i) => {
      assert.deepEqual([box.minY, box.maxY], [0, placed[i].height]);
      assert.deepEqual([box.minX, box.maxX], [footprint(placed[i]).minX, footprint(placed[i]).maxX]);
    });
  });

  QUnit.test("blockBoxes are the blocks, one each, all the same size", (assert) => {
    const blocks = blockBoxes(GRID);
    assert.strictEqual(blocks.length, GRID.blocksX * GRID.blocksZ);
    for (const block of blocks) assert.true(Math.abs(block.maxX - block.minX - blockSize(GRID)) < 1e-9);
  });
});

QUnit.module("groundHeight", () => {
  QUnit.test("the road is lower than the sidewalk, by ROAD_DEPTH", (assert) => {
    assert.strictEqual(groundHeight(0, -20), -ROAD_DEPTH); // on the road that runs north and south through the middle of the district
    assert.strictEqual(groundHeight(20, 0), -ROAD_DEPTH); // and on the one that runs east and west
    assert.strictEqual(groundHeight(0, 0), -ROAD_DEPTH); // and in the junction where they cross
  });

  QUnit.test("a sidewalk, a block and the world beyond the roads are at 0", (assert) => {
    const middle = junctionCenter(GRID, 1, 1);
    assert.strictEqual(groundHeight(middle.x + 20, middle.z - 7.5), 0); // 7.5 from the middle of the road: the sidewalk
    assert.strictEqual(groundHeight(...Object.values(blockCenter(GRID, 0, 0))), 0); // the middle of a block
    assert.strictEqual(groundHeight(1000, 1000), 0);
  });

  QUnit.test("the road is 12 across: the sidewalk starts 6 from the middle", (assert) => {
    assert.strictEqual(groundHeight(20, 5.9), -ROAD_DEPTH);
    assert.strictEqual(groundHeight(20, 6.1), 0);
  });

  QUnit.test("the start of the runner is on the road", (assert) => {
    assert.strictEqual(groundHeight(0, -9), -ROAD_DEPTH);
  });

  QUnit.test("it follows the grid it is given", (assert) => {
    const small = { blocksX: 1, blocksZ: 1, tilesBetween: 2, extraTiles: 1 };
    const at = junctionCenter(small, 1, 1);
    assert.strictEqual(groundHeight(at.x, at.z, small), -ROAD_DEPTH);
    assert.strictEqual(groundHeight(at.x + 100, at.z + 100, small), 0);
  });
});

QUnit.module("piecesUsed", () => {
  QUnit.test("lists each file once: the street, the junction, and every building", (assert) => {
    const used = piecesUsed(GRID, LAYOUTS);
    assert.strictEqual(new Set(used).size, used.length);
    assert.true(used.includes(STREET.file) && used.includes(STREET.junctionFile));
    for (const building of buildingPlacements(GRID, LAYOUTS)) assert.true(used.includes(building.piece));
  });

  QUnit.test("every building of the plan is a building that has a size here", (assert) => {
    const files = Object.values(BUILDINGS).map((building) => building.file);
    for (const building of buildingPlacements(GRID, LAYOUTS)) assert.true(files.includes(building.piece));
  });
});
