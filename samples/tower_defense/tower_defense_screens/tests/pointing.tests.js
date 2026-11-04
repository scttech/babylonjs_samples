// A canvas 800 wide and 400 tall, 100 across and 50 down the page.
const CANVAS = { left: 100, top: 50, width: 800, height: 400, right: 900, bottom: 450 };

QUnit.module("toScreenShare", () => {
  QUnit.test("the middle of the canvas is the middle of the view", (assert) => {
    assert.deepEqual(toScreenShare(CANVAS, 500, 250), { x: 0, y: 0 });
  });

  QUnit.test("the edges are minus one and one, and up is bigger, as a camera sees it", (assert) => {
    assert.deepEqual(toScreenShare(CANVAS, 100, 450), { x: -1, y: -1 });
    assert.deepEqual(toScreenShare(CANVAS, 900, 50), { x: 1, y: 1 });
  });

  QUnit.test("it does not matter where on the page the canvas is", (assert) => {
    const moved = { left: 0, top: 0, width: 800, height: 400, right: 800, bottom: 400 };

    assert.deepEqual(toScreenShare(moved, 600, 100), toScreenShare(CANVAS, 700, 150));
  });

  QUnit.test("a place outside the canvas is outside the range", (assert) => {
    assert.true(toScreenShare(CANVAS, 1000, 250).x > 1);
    assert.true(toScreenShare(CANVAS, 500, 500).y < -1);
  });
});

QUnit.module("liftFor and isInside", () => {
  QUnit.test("a finger is held up, and a mouse is not", (assert) => {
    assert.strictEqual(liftFor("touch"), POINTER.touchLift);
    assert.strictEqual(liftFor("mouse"), 0);
    assert.strictEqual(liftFor("pen"), 0);
    assert.strictEqual(liftFor(undefined), 0);
  });

  QUnit.test("isInside is true on the box and its edge, false off it", (assert) => {
    assert.true(isInside(CANVAS, 500, 250));
    assert.true(isInside(CANVAS, 100, 50));
    assert.true(isInside(CANVAS, 900, 450));
    assert.false(isInside(CANVAS, 99, 250));
    assert.false(isInside(CANVAS, 500, 451));
  });
});

QUnit.module("groundAt", () => {
  const extents = viewExtents(boardPoints(), 2);
  const { right, up } = viewAxes();
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  // Where a place in the world is on the screen: the opposite of groundAt.
  const shareOf = (p, e = extents) => ({ x: (dot(p, right) - e.centerX) / e.halfWidth, y: (dot(p, up) - e.centerY) / e.halfHeight });

  QUnit.test("it is the opposite of putting a place on the screen: from the ground, to the screen, and back", (assert) => {
    for (const cell of boardCells()) {
      const { x, z } = cellCenter(cell.col, cell.row);
      const back = groundAt(extents, shareOf([x, 0, z]));

      assert.true(Math.abs(back.x - x) < 1e-9 && Math.abs(back.z - z) < 1e-9, `${cell.col},${cell.row}`);
    }
  });

  QUnit.test("it works for a height other than the ground", (assert) => {
    const head = [3, 2.5, -4];
    const back = groundAt(extents, shareOf(head), CAMERA, 2.5);

    assert.true(Math.abs(back.x - 3) < 1e-9 && Math.abs(back.z + 4) < 1e-9);
  });

  QUnit.test("it works from any angle the camera might have", (assert) => {
    for (const alpha of [-Math.PI / 2, -Math.PI / 4, -2, -1]) {
      const angles = { alpha, beta: 0.9 };
      const view = viewExtents(boardPoints(), 1.6, angles);
      const axes = viewAxes(alpha, 0.9);
      const share = { x: (dot([2, 0, 3], axes.right) - view.centerX) / view.halfWidth, y: (dot([2, 0, 3], axes.up) - view.centerY) / view.halfHeight };
      const back = groundAt(view, share, angles);

      assert.true(Math.abs(back.x - 2) < 1e-9 && Math.abs(back.z - 3) < 1e-9, `alpha ${alpha}`);
    }
  });

  QUnit.test("going up the screen goes away from the camera: the back of the board is the top", (assert) => {
    const low = groundAt(extents, { x: 0, y: -0.2 });
    const high = groundAt(extents, { x: 0, y: 0.2 });

    assert.true(high.z > low.z);
    assert.true(Math.abs(high.x - low.x) < 1e-9);
  });

  QUnit.test("going right on the screen is more x", (assert) => {
    const left = groundAt(extents, { x: -0.3, y: 0 });
    const rightward = groundAt(extents, { x: 0.3, y: 0 });

    assert.true(rightward.x > left.x);
  });

  QUnit.test("it agrees with where a real camera looks", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const camera = buildCamera(scene);
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const view = viewExtents(boardPoints(), engine.getAspectRatio(camera));
    applyExtents(camera, view);
    scene.render();
    for (const [px, py] of [[width * 0.5, height * 0.5], [width * 0.25, height * 0.3], [width * 0.8, height * 0.7]]) {
      const ray = scene.createPickingRay(px, py, BABYLON.Matrix.Identity(), camera);
      const t = -ray.origin.y / ray.direction.y;
      const real = { x: ray.origin.x + ray.direction.x * t, z: ray.origin.z + ray.direction.z * t };
      const mine = groundAt(view, { x: (px / width) * 2 - 1, y: 1 - (py / height) * 2 });

      assert.true(Math.abs(real.x - mine.x) < 1e-3 && Math.abs(real.z - mine.z) < 1e-3, `${px}, ${py}: real ${real.x.toFixed(3)}, ${real.z.toFixed(3)}, mine ${mine.x.toFixed(3)}, ${mine.z.toFixed(3)}`);
    }
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("cellAtPoint", () => {
  const view = viewExtents(boardPoints(), CANVAS.width / CANVAS.height);
  const { right, up } = viewAxes();
  const pageOf = (col, row) => {
    const { x, z } = cellCenter(col, row);
    const sx = (x * right[0] + z * right[2] - view.centerX) / view.halfWidth;
    const sy = (x * up[0] + z * up[2] - view.centerY) / view.halfHeight;
    return { x: CANVAS.left + ((sx + 1) / 2) * CANVAS.width, y: CANVAS.top + ((1 - sy) / 2) * CANVAS.height };
  };

  QUnit.test("the middle of every cell, put on the screen, is that cell again", (assert) => {
    for (const { col, row } of boardCells()) {
      const p = pageOf(col, row);

      assert.deepEqual(cellAtPoint(CANVAS, view, p.x, p.y), { col, row }, `${col},${row}`);
    }
  });

  QUnit.test("off the board is no cell", (assert) => {
    assert.strictEqual(cellAtPoint(CANVAS, view, CANVAS.left + 2, CANVAS.top + 2), null, "the corner of the sky");
  });

  QUnit.test("a lift holds the cell above the pointer: it is the cell that many pixels up the screen", (assert) => {
    const p = pageOf(5, 5);
    const lifted = cellAtPoint(CANVAS, view, p.x, p.y + 40, 40);

    assert.deepEqual(lifted, { col: 5, row: 5 });
    assert.deepEqual(cellAtPoint(CANVAS, view, p.x, p.y, 0), { col: 5, row: 5 });
  });

  QUnit.test("a bigger lift is a cell further up the screen, which is further back on the board", (assert) => {
    const p = pageOf(5, 5);
    const lifted = cellAtPoint(CANVAS, view, p.x, p.y, 70);

    assert.true(lifted.row < 5, `row ${lifted.row}`);
    assert.strictEqual(lifted.col, 5);
  });
});
