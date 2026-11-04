QUnit.module("drawMark", () => {
  const SIZE = 64;
  // What a mark of an effect draws: the alpha of every pixel of a canvas.
  const alphas = (kind) => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    drawMark(context, kind, SIZE);
    const data = context.getImageData(0, 0, SIZE, SIZE).data;
    return Array.from({ length: SIZE * SIZE }, (_, i) => data[i * 4 + 3]);
  };

  QUnit.test("each effect draws something, and not all of the square", (assert) => {
    for (const kind of Object.keys(EFFECTS)) {
      const covered = alphas(kind).filter((a) => a > 128).length / (SIZE * SIZE);

      assert.true(covered > 0.05 && covered < 0.7, `${kind}: ${covered.toFixed(2)}`);
    }
  });

  QUnit.test("each is a different shape", (assert) => {
    const shapes = Object.keys(EFFECTS).map((kind) => alphas(kind).join());

    assert.strictEqual(new Set(shapes).size, 4);
  });

  QUnit.test("each stays inside its square: the edge is clear", (assert) => {
    for (const kind of Object.keys(EFFECTS)) {
      const a = alphas(kind);
      let edge = 0;
      for (let i = 0; i < SIZE; i++) edge += a[i] + a[(SIZE - 1) * SIZE + i] + a[i * SIZE] + a[i * SIZE + SIZE - 1];

      assert.strictEqual(edge, 0, kind);
    }
  });

  QUnit.test("it is drawn white, so that the material can make it any color", (assert) => {
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext("2d");
    drawMark(context, "stun", SIZE);
    const pixel = context.getImageData(SIZE / 2, SIZE / 2, 1, 1).data;

    assert.deepEqual([pixel[0], pixel[1], pixel[2]], [255, 255, 255]);
  });
});

QUnit.module("marksLayout", () => {
  QUnit.test("none is none, and one is in the middle", (assert) => {
    assert.deepEqual(marksLayout(0), []);
    assert.deepEqual(marksLayout(1), [0]);
  });

  QUnit.test("they are in a row, a mark and a gap apart, with the row centered", (assert) => {
    const places = marksLayout(3, 1, 0.5);

    assert.deepEqual(places, [-1.5, 0, 1.5]);
    assert.true(Math.abs(marksLayout(4).reduce((sum, x) => sum + x, 0)) < 1e-9);
  });

  QUnit.test("four of them, which is all there are, fit over an enemy that is a cell wide", (assert) => {
    const places = marksLayout(Object.keys(EFFECTS).length);
    const width = places[places.length - 1] - places[0] + MARKS.size;

    assert.true(width < BOARD.cell * 1.2, `${width.toFixed(2)}`);
  });
});

QUnit.module("StatusMarks", (hooks) => {
  let engine, scene, node;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    node = new BABYLON.TransformNode("enemy", scene);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("there is a square for each effect, and none is shown to begin with", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);

    assert.strictEqual(Object.keys(marks.squares).length, 4);
    assert.deepEqual(marks.shown, []);
  });

  QUnit.test("they hang over the head: the height of the enemy and a little more", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);

    assert.strictEqual(marks.node.parent, node);
    assert.strictEqual(marks.node.position.y, 1.5 + MARKS.above);
  });

  QUnit.test("show shows the ones in the list, side by side, and hides the rest", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);
    marks.show(["burn", "stun"]);

    assert.deepEqual(marks.shown.sort(), ["burn", "stun"]);
    assert.true(marks.squares.burn.position.x < marks.squares.stun.position.x, "in the order of the list");
    marks.show(["stun"]);
    assert.deepEqual(marks.shown, ["stun"]);
    assert.strictEqual(marks.squares.stun.position.x, 0);
  });

  QUnit.test("a square always faces the camera, and is the color of its effect", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);

    for (const [kind, square] of Object.entries(marks.squares)) {
      assert.strictEqual(square.billboardMode, BABYLON.Mesh.BILLBOARDMODE_ALL, kind);
      assert.strictEqual(square.material.emissiveColor.toHexString().toLowerCase(), EFFECTS[kind].color, kind);
    }
  });

  QUnit.test("every enemy shares the same four materials, so another enemy makes no more", (assert) => {
    new StatusMarks(scene, node, 1.5, "a");
    const materials = scene.materials.length;
    new StatusMarks(scene, new BABYLON.TransformNode("other", scene), 1.5, "b");

    assert.strictEqual(scene.materials.length, materials);
    assert.strictEqual(materials, 4);
  });

  QUnit.test("taking the marks away takes the squares and leaves the materials for the next", (assert) => {
    const marks = new StatusMarks(scene, node, 1.5);
    const meshes = scene.meshes.length;
    marks.dispose();

    assert.strictEqual(scene.meshes.length, meshes - 4);
    assert.strictEqual(scene.materials.length, 4);
  });
});
