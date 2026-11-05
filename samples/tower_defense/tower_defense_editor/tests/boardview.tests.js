QUnit.module("affectedCells", () => {
  const keys = (cells) => cells.map((c) => `${c.col},${c.row}`).sort();

  QUnit.test("a cell in the middle is five cells: itself and the four beside it", (assert) => {
    assert.deepEqual(keys(affectedCells([{ col: 5, row: 4 }])), ["4,4", "5,3", "5,4", "5,5", "6,4"]);
  });

  QUnit.test("a cell in the corner is three, and one on the edge four: nothing off the board", (assert) => {
    assert.strictEqual(affectedCells([{ col: 0, row: 0 }]).length, 3);
    assert.strictEqual(affectedCells([{ col: 0, row: 4 }]).length, 4);
    assert.strictEqual(affectedCells([{ col: BOARD.cols - 1, row: BOARD.rows - 1 }]).length, 3);
  });

  QUnit.test("cells that are beside each other share their neighbors, and none is in the list twice", (assert) => {
    const cells = affectedCells([{ col: 5, row: 4 }, { col: 6, row: 4 }]);

    assert.strictEqual(cells.length, 8);
    assert.strictEqual(new Set(keys(cells)).size, cells.length);
  });

  QUnit.test("nothing changed is nothing to draw, and a cell that is off the board is not drawn", (assert) => {
    assert.deepEqual(affectedCells([]), []);
    assert.deepEqual(affectedCells([{ col: -5, row: -5 }]), []);
  });
});

QUnit.module("the EditorBoard", (hooks) => {
  let engine, scene, tiles, props, baseMeshes;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    tiles = await loadTiles(scene);
    props = await loadProps(scene);
    baseMeshes = scene.meshes.length;
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const STRAIGHT_MAP = { name: "s", rows: ["S" + "#".repeat(12) + "G", ...Array(8).fill(".".repeat(14))] };

  QUnit.test("show draws a tile in every cell, a prop for each prop, and a marker for the start and the goal", (assert) => {
    const editor = new MapEditor({ name: "x", rows: ["S" + "#".repeat(12) + "G", "..c...........", ...Array(7).fill(".".repeat(14))] });
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);

    assert.strictEqual(board.tileNodes.size, BOARD.cols * BOARD.rows);
    assert.strictEqual(board.propNodes.size, 1);
    assert.strictEqual(board.markers.length, 2);
    board.dispose();
  });

  QUnit.test("a tile is the piece of the cell, as the game would have it, and a road piece is turned as the road goes", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    const grid = parseMap(editor.toMap());
    const node = board.tileNodes.get("5,0");
    const want = pieceAt(grid, 5, 0);

    assert.strictEqual(node.rotation.y, (want.turn * Math.PI) / 2);
    assert.notStrictEqual(want.kind, "grass");
    board.dispose();
  });

  QUnit.test("a change draws only the cells that it changes and the ones beside them: the other tiles are the very same tiles", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    const before = new Map(board.tileNodes);
    const changed = editor.paint(5, 4, "road");
    const drawn = board.update(editor, changed);
    let replaced = 0;
    for (const [key, node] of board.tileNodes) if (before.get(key) !== node) replaced++;

    assert.strictEqual(drawn, 5);
    assert.strictEqual(replaced, 5);
    assert.true(before.get("5,4").isDisposed(), "and the old tile is gone from the scene");
    assert.false(before.get("9,7").isDisposed(), "a tile far away is left alone");
    board.dispose();
  });

  QUnit.test("a piece of road changes when the road beside it does: it is a corner where the road turns", (assert) => {
    const editor = new MapEditor({ name: "x", rows: ["S" + "#".repeat(12) + "G", "#" + ".".repeat(13), ...Array(7).fill(".".repeat(14))] });
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    const turnBefore = board.tileNodes.get("1,0").rotation.y;
    const changed = editor.paint(1, 1, "road");
    board.update(editor, changed);
    const grid = parseMap(editor.toMap());

    assert.strictEqual(board.tileNodes.get("1,0").rotation.y, (pieceAt(grid, 1, 0).turn * Math.PI) / 2);
    assert.true(turnBefore !== undefined);
    board.dispose();
  });

  QUnit.test("painting scenery draws it, and erasing it takes it away", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.update(editor, editor.paint(4, 4, "shrine"));
    assert.true(board.propNodes.has("4,4"));
    const node = board.propNodes.get("4,4");
    board.update(editor, editor.paint(4, 4, "erase"));

    assert.false(board.propNodes.has("4,4"));
    assert.true(node.isDisposed());
    board.dispose();
  });

  QUnit.test("scenery changed for other scenery is drawn as the new kind, and there is one prop in the cell", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.update(editor, editor.paint(4, 4, "shrine"));
    board.update(editor, editor.paint(4, 4, "koi_pond"));

    assert.strictEqual(board.propNodes.size, 1);
    assert.true(board.propNodes.get("4,4").name.startsWith("koi_pond"));
    board.dispose();
  });

  QUnit.test("the markers go where the start and the goal go, and there is one of each however many times they are moved", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    for (let i = 0; i < 4; i++) board.update(editor, editor.paint(0, i + 3, "start"));

    assert.strictEqual(board.markers.length, 2);
    const meshes = scene.meshes.filter((mesh) => mesh.name.startsWith("marker")).length;
    assert.strictEqual(meshes, 4, "two rings and two discs, and the old ones are gone");
    board.dispose();
  });

  QUnit.test("a map with no start has no marker for it", (assert) => {
    const editor = new MapEditor();
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);

    assert.strictEqual(board.markers.length, 0);
    board.dispose();
  });

  QUnit.test("nothing changed draws nothing", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);

    assert.strictEqual(board.update(editor, []), 0);
    board.dispose();
  });

  QUnit.test("undo is drawn too: the cells that it changes are the cells that are drawn again", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.update(editor, editor.paint(4, 4, "shrine"));
    board.update(editor, editor.undo());

    assert.false(board.propNodes.has("4,4"));
    board.dispose();
  });

  QUnit.test("taking the board away leaves nothing in the scene: no tile, no prop, no marker", (assert) => {
    const editor = new MapEditor({ name: "x", rows: ["S" + "#".repeat(12) + "G", "..c...........", ...Array(7).fill(".".repeat(14))] });
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.dispose();

    assert.strictEqual(scene.meshes.filter((mesh) => !mesh.isDisposed()).length, baseMeshes);
    assert.strictEqual(board.tileNodes.size, 0);
  });

  QUnit.test("the markers breathe: tick gives them the time", (assert) => {
    const editor = new MapEditor(STRAIGHT_MAP);
    const board = new EditorBoard(scene, tiles, props);
    board.show(editor);
    board.tick(1.3);

    assert.true(Math.abs(board.markers[0].node.scaling.x - markerPulse(1.3)) < 1e-9);
    board.dispose();
  });
});
