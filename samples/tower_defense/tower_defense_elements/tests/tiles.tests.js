// A board of three across and two deep, so that loading and building take no time.
const TINY = { cols: 3, rows: 2, cell: 2, rim: 0, depth: 1, peek: 1, headroom: 1 };

QUnit.module("grassTurn", () => {
  QUnit.test("is a number of quarter turns, from none to three", (assert) => {
    for (const { col, row } of boardCells()) {
      const turn = grassTurn(col, row);

      assert.true(Number.isInteger(turn) && turn >= 0 && turn <= 3);
    }
  });

  QUnit.test("is the same for a cell every time", (assert) => {
    assert.strictEqual(grassTurn(5, 3), grassTurn(5, 3));
  });

  QUnit.test("uses all four turns, and none of them for much more than a third of the board", (assert) => {
    const counts = [0, 0, 0, 0];
    for (const { col, row } of boardCells()) counts[grassTurn(col, row)]++;
    const total = BOARD.cols * BOARD.rows;

    assert.true(counts.every((n) => n > 0), counts.join(", "));
    assert.true(counts.every((n) => n < total * 0.4), counts.join(", "));
  });

  QUnit.test("a cell is not always turned the same way as the one beside it", (assert) => {
    let same = 0;
    for (let col = 0; col < BOARD.cols - 1; col++) {
      if (grassTurn(col, 0) === grassTurn(col + 1, 0)) same++;
    }

    assert.true(same < BOARD.cols / 2);
  });
});

QUnit.module("the tiles", (hooks) => {
  let engine, scene, tiles;
  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    tiles = await loadTiles(scene, TINY);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // The box that holds everything a node holds.
  const boundsOf = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true);
  };

  QUnit.test("there is a tile for every kind in the TILES table", (assert) => {
    assert.deepEqual(Object.keys(tiles).sort(), Object.keys(TILES).sort());
  });

  QUnit.test("each is scaled to be a little wider than a cell", (assert) => {
    for (const kind of Object.keys(TILES)) {
      const bounds = boundsOf(placeTile(scene, tiles[kind], `test ${kind}`, 0, 0, 0, TINY));

      assert.true(Math.abs(bounds.max.x - bounds.min.x - TINY.cell * TILE_FIT) < TINY.cell * 0.06, kind);
    }
  });

  QUnit.test("the top of a tile is at the ground", (assert) => {
    for (const kind of Object.keys(TILES)) {
      const bounds = boundsOf(placeTile(scene, tiles[kind], `test ${kind}`, 0, 0, 0, TINY));

      assert.true(Math.abs(bounds.max.y) < 0.01, `${kind} top ${bounds.max.y}`);
    }
  });

  QUnit.test("a tile is centered on its cell", (assert) => {
    const { x, z } = cellCenter(2, 1, TINY);
    const bounds = boundsOf(placeTile(scene, tiles.straight, "test", 2, 1, 0, TINY));

    assert.true(Math.abs((bounds.min.x + bounds.max.x) / 2 - x) < 0.05);
    assert.true(Math.abs((bounds.min.z + bounds.max.z) / 2 - z) < 0.05);
  });

  QUnit.test("a turned tile is still centered on its cell", (assert) => {
    const { x, z } = cellCenter(1, 0, TINY);
    for (let turn = 1; turn <= 3; turn++) {
      const bounds = boundsOf(placeTile(scene, tiles.corner, `test ${turn}`, 1, 0, turn, TINY));

      assert.true(Math.abs((bounds.min.x + bounds.max.x) / 2 - x) < 0.05, `turn ${turn}`);
      assert.true(Math.abs((bounds.min.z + bounds.max.z) / 2 - z) < 0.05, `turn ${turn}`);
    }
  });

  QUnit.test("each turn is a quarter of a circle", (assert) => {
    assert.strictEqual(placeTile(scene, tiles.grass, "a", 0, 0, 0, TINY).rotation.y, 0);
    assert.strictEqual(placeTile(scene, tiles.grass, "b", 0, 0, 1, TINY).rotation.y, Math.PI / 2);
    assert.strictEqual(placeTile(scene, tiles.grass, "c", 0, 0, 3, TINY).rotation.y, (3 * Math.PI) / 2);
  });

  QUnit.test("placeTile gives back the node it made, and it is named", (assert) => {
    const node = placeTile(scene, tiles.grass, "tile 1,1", 1, 1, 0, TINY);

    assert.strictEqual(node.name, "tile 1,1");
    assert.true(node.getChildMeshes().length > 0);
  });

  QUnit.test("two tiles of one kind share their triangles, so a big board costs memory only once", (assert) => {
    const instances = (node) => node.getChildMeshes().filter((mesh) => mesh.sourceMesh);
    const a = instances(placeTile(scene, tiles.grass, "a", 0, 0, 0, TINY));
    const b = instances(placeTile(scene, tiles.grass, "b", 1, 0, 0, TINY));

    assert.true(a.length > 0, "a tile is made of instances of the model's meshes");
    assert.strictEqual(a.length, b.length);
    assert.strictEqual(a[0].sourceMesh, b[0].sourceMesh);
  });

  QUnit.test("buildTiles fills every cell, with what kindAt says", (assert) => {
    const built = buildTiles(scene, tiles, (col, row) => (col === 1 ? { kind: "straight", turn: 1 } : { kind: "grass", turn: 0 }), TINY);

    assert.strictEqual(built.length, TINY.cols * TINY.rows);
    assert.true(built.filter((t) => t.col === 1).every((t) => t.kind === "straight" && t.turn === 1));
    assert.true(built.filter((t) => t.col !== 1).every((t) => t.kind === "grass"));
  });

  QUnit.test("buildTiles puts each one in its cell", (assert) => {
    const built = buildTiles(scene, tiles, () => ({ kind: "grass", turn: 0 }), TINY);

    for (const { col, row, node } of built) {
      const { x, z } = cellCenter(col, row, TINY);

      assert.true(Math.abs(node.position.x - x) < 1e-9 && Math.abs(node.position.z - z) < 1e-9);
    }
  });
});
