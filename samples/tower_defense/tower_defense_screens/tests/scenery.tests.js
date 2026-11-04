QUnit.module("the PROPS table", () => {
  QUnit.test("every prop has a name for a sentence, a model, and a width that fits a cell", (assert) => {
    for (const [kind, spec] of Object.entries(PROPS)) {
      assert.true(/^an? /.test(spec.name), `${kind}: "${spec.name}" reads as "there is ${spec.name} there"`);
      assert.true(spec.file.startsWith("scenery/") && spec.file.endsWith(".glb"), kind);
      assert.true(spec.width > 0.5 && spec.width < BOARD.cell, kind);
    }
  });

  QUnit.test("there are five, and each has a character in the map's legend", (assert) => {
    assert.strictEqual(Object.keys(PROPS).length, 5);
    for (const kind of Object.keys(PROPS)) assert.true(Object.values(LEGEND).includes(kind), kind);
  });

  QUnit.test("and every character of the legend that is not the ground is one of them", (assert) => {
    for (const meaning of Object.values(LEGEND)) assert.true(GROUND.includes(meaning) || meaning in PROPS, meaning);
  });

  QUnit.test("the maps use every one of them", (assert) => {
    const used = new Set(MAPS.flatMap((map) => parseMap(map).props.map((prop) => prop.kind)));

    assert.deepEqual([...used].sort(), Object.keys(PROPS).sort());
  });
});

QUnit.module("propTurn", () => {
  QUnit.test("is a number of quarter turns, from none to three, the same every time for a cell", (assert) => {
    for (const { col, row } of boardCells()) {
      const turn = propTurn(col, row);

      assert.true(Number.isInteger(turn) && turn >= 0 && turn <= 3);
      assert.strictEqual(propTurn(col, row), turn);
    }
  });

  QUnit.test("uses all four, so that two of a kind are not a copy of each other", (assert) => {
    const seen = new Set(boardCells().map(({ col, row }) => propTurn(col, row)));

    assert.strictEqual(seen.size, 4);
  });

  QUnit.test("is not the turn of the grass under it, or every prop would be turned as its tile is", (assert) => {
    const same = boardCells().filter(({ col, row }) => propTurn(col, row) === grassTurn(col, row)).length;

    assert.true(same < boardCells().length * 0.5);
  });
});

QUnit.module("loading and placing props", (hooks) => {
  let engine, scene, loaded;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadProps(scene);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const bounds = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true);
  };

  QUnit.test("every kind loads", (assert) => {
    assert.deepEqual(Object.keys(loaded).sort(), Object.keys(PROPS).sort());
  });

  QUnit.test("each is made the width the table says, on its longer side, and no bigger than its cell", (assert) => {
    for (const kind of Object.keys(PROPS)) {
      const node = placeProp(scene, loaded[kind], `size ${kind}`, 3, 2);
      const { min, max } = bounds(node);

      assert.true(Math.abs(Math.max(max.x - min.x, max.z - min.z) - PROPS[kind].width) < 0.02, `${kind}: ${Math.max(max.x - min.x, max.z - min.z).toFixed(2)}`);
      assert.true(max.x - min.x < BOARD.cell && max.z - min.z < BOARD.cell, kind);
    }
  });

  QUnit.test("each stands on the ground, in the middle of its cell, and under the roof of the view", (assert) => {
    const { x, z } = cellCenter(3, 2);
    for (const kind of Object.keys(PROPS)) {
      const { min, max } = bounds(placeProp(scene, loaded[kind], `stand ${kind}`, 3, 2));

      assert.true(Math.abs(min.y) < 0.02, `${kind} stands at ${min.y.toFixed(3)}`);
      assert.true(Math.abs((min.x + max.x) / 2 - x) < 0.05 && Math.abs((min.z + max.z) / 2 - z) < 0.05, `${kind} is centered`);
      assert.true(max.y < BOARD.headroom, kind);
    }
  });

  QUnit.test("a turned prop is still in the middle of its cell, and each turn is a quarter", (assert) => {
    const { x, z } = cellCenter(1, 1);
    for (let turn = 0; turn < 4; turn++) {
      const node = placeProp(scene, loaded.shrine, `turn ${turn}`, 1, 1, turn);
      const { min, max } = bounds(node);

      assert.strictEqual(node.rotation.y, (turn * Math.PI) / 2);
      assert.true(Math.abs((min.x + max.x) / 2 - x) < 0.05 && Math.abs((min.z + max.z) / 2 - z) < 0.05, `turn ${turn}`);
    }
  });

  QUnit.test("two of a kind share their triangles: each is an instance", (assert) => {
    const a = placeProp(scene, loaded.koi_pond, "a", 0, 0).getChildMeshes().filter((mesh) => mesh.sourceMesh);
    const b = placeProp(scene, loaded.koi_pond, "b", 5, 5).getChildMeshes().filter((mesh) => mesh.sourceMesh);

    assert.true(a.length > 0);
    assert.strictEqual(a[0].sourceMesh, b[0].sourceMesh);
  });

  QUnit.test("buildProps puts a prop in every cell of the map that has one, and in no other", (assert) => {
    for (const map of MAPS) {
      const grid = parseMap(map);
      const built = buildProps(scene, loaded, grid);

      assert.strictEqual(built.length, grid.props.length, map.name);
      for (const { kind, col, row, node } of built) {
        const { x, z } = cellCenter(col, row);

        assert.true(Math.abs(node.position.x - x) < 1e-9 && Math.abs(node.position.z - z) < 1e-9, `${kind} ${col},${row}`);
        assert.strictEqual(node.rotation.y, (propTurn(col, row) * Math.PI) / 2, `${kind} ${col},${row}`);
        assert.false(isRoad(grid, col, row), `${kind} ${col},${row} is not on the road`);
      }
    }
  });

  QUnit.test("a map with no props has none built", (assert) => {
    assert.deepEqual(buildProps(scene, loaded, parseMap({ name: "test", rows: ["S##G"] })), []);
  });
});
