// Several shapes of screen: a phone held upright, a square, a wide window, and a very wide phone.
const ASPECTS = [0.46, 1, 16 / 9, 2.4];

QUnit.module("the CAMERA table", () => {
  QUnit.test("it looks from the front, which puts the far row at the top of the screen", (assert) => {
    const { forward } = viewAxes();

    assert.true(forward[2] > 0, "it looks away from the front, toward more z");
  });

  QUnit.test("it is tipped down: more than straight on, less than straight down", (assert) => {
    assert.true(CAMERA.beta > 0 && CAMERA.beta < Math.PI / 2);
  });

  QUnit.test("it is far enough back to see over everything", (assert) => {
    const farthest = Math.hypot((BOARD.cols * BOARD.cell) / 2, BOARD.depth, (BOARD.rows * BOARD.cell) / 2);

    assert.true(CAMERA.distance > farthest);
  });
});

QUnit.module("viewAxes", () => {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const length = (v) => Math.hypot(v[0], v[1], v[2]);

  QUnit.test("right, up and forward are each one unit long", (assert) => {
    const { right, up, forward } = viewAxes();

    for (const axis of [right, up, forward]) assert.true(Math.abs(length(axis) - 1) < 1e-9);
  });

  QUnit.test("and each is at a right angle to the others", (assert) => {
    const { right, up, forward } = viewAxes();

    assert.true(Math.abs(dot(right, up)) < 1e-9);
    assert.true(Math.abs(dot(right, forward)) < 1e-9);
    assert.true(Math.abs(dot(up, forward)) < 1e-9);
  });

  QUnit.test("from the front, the screen's right is the world's x", (assert) => {
    const { right } = viewAxes(-Math.PI / 2, 0.7);

    assert.true(Math.abs(right[0] - 1) < 1e-9);
    assert.true(Math.abs(right[1]) < 1e-9 && Math.abs(right[2]) < 1e-9);
  });

  QUnit.test("up on the screen is up in the world, and away from the camera", (assert) => {
    const { up } = viewAxes();

    assert.true(up[1] > 0);
    assert.true(up[2] > 0);
  });

  QUnit.test("looking straight down, up on the screen is the far edge, away from the camera", (assert) => {
    const { up } = viewAxes(-Math.PI / 2, 1e-6);

    assert.true(up[2] > 0.999);
  });

  QUnit.test("it matches where a real camera is", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const camera = buildCamera(scene);
    camera.getViewMatrix(true);
    const { forward } = viewAxes();
    const real = camera.getForwardRay().direction;

    assert.true(Math.abs(real.x - forward[0]) < 1e-6);
    assert.true(Math.abs(real.y - forward[1]) < 1e-6);
    assert.true(Math.abs(real.z - forward[2]) < 1e-6);
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("boardPoints", () => {
  QUnit.test("there are eight corners", (assert) => {
    assert.strictEqual(boardPoints().length, 8);
  });

  QUnit.test("they are the board's edges plus the rim, as high as the headroom and as low as the view shows", (assert) => {
    const points = boardPoints();
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const zs = points.map((p) => p[2]);

    assert.strictEqual(Math.max(...xs), (BOARD.cols * BOARD.cell) / 2 + BOARD.rim);
    assert.strictEqual(Math.min(...xs), -(BOARD.cols * BOARD.cell) / 2 - BOARD.rim);
    assert.strictEqual(Math.max(...zs), (BOARD.rows * BOARD.cell) / 2 + BOARD.rim);
    assert.strictEqual(Math.max(...ys), BOARD.headroom);
    assert.strictEqual(Math.min(...ys), -BOARD.peek);
  });
});

QUnit.module("viewExtents", () => {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  QUnit.test("the view has the shape of the screen", (assert) => {
    for (const aspect of ASPECTS) {
      const { halfWidth, halfHeight } = viewExtents(boardPoints(), aspect);

      assert.true(Math.abs(halfWidth / halfHeight - aspect) < 1e-9, `aspect ${aspect}`);
    }
  });

  QUnit.test("every corner of the board is inside it, on every shape of screen", (assert) => {
    const { right, up } = viewAxes();
    for (const aspect of ASPECTS) {
      const e = viewExtents(boardPoints(), aspect);
      const inside = boardPoints().every((p) => {
        return Math.abs(dot(p, right) - e.centerX) <= e.halfWidth + 1e-9 && Math.abs(dot(p, up) - e.centerY) <= e.halfHeight + 1e-9;
      });

      assert.true(inside, `aspect ${aspect}`);
    }
  });

  QUnit.test("it is no bigger than it needs to be: one direction is exactly full, with the margin", (assert) => {
    const { right, up } = viewAxes();
    const points = boardPoints();
    const xs = points.map((p) => dot(p, right));
    const ys = points.map((p) => dot(p, up));
    const wantWidth = ((Math.max(...xs) - Math.min(...xs)) / 2) * CAMERA.margin;
    const wantHeight = ((Math.max(...ys) - Math.min(...ys)) / 2) * CAMERA.margin;

    for (const aspect of ASPECTS) {
      const e = viewExtents(points, aspect);
      const full = Math.abs(e.halfWidth - wantWidth) < 1e-9 || Math.abs(e.halfHeight - wantHeight) < 1e-9;

      assert.true(full, `aspect ${aspect}`);
      assert.true(e.halfWidth >= wantWidth - 1e-9 && e.halfHeight >= wantHeight - 1e-9, `aspect ${aspect}`);
    }
  });

  QUnit.test("a phone held upright is limited by the board's width, and a wide window by its height", (assert) => {
    const { right, up } = viewAxes();
    const points = boardPoints();
    const xs = points.map((p) => dot(p, right));
    const ys = points.map((p) => dot(p, up));
    const needWidth = ((Math.max(...xs) - Math.min(...xs)) / 2) * CAMERA.margin;
    const needHeight = ((Math.max(...ys) - Math.min(...ys)) / 2) * CAMERA.margin;

    assert.true(Math.abs(viewExtents(points, 0.46).halfWidth - needWidth) < 1e-9);
    assert.true(Math.abs(viewExtents(points, 3).halfHeight - needHeight) < 1e-9);
  });

  QUnit.test("it is centered on the middle of the points, not on the origin", (assert) => {
    const { right, up } = viewAxes();
    const points = [[0, 0, 0], [10, 0, 0], [0, 0, 4]];
    const e = viewExtents(points, 1);
    const xs = points.map((p) => dot(p, right));
    const ys = points.map((p) => dot(p, up));

    assert.true(Math.abs(e.centerX - (Math.min(...xs) + Math.max(...xs)) / 2) < 1e-9);
    assert.true(Math.abs(e.centerY - (Math.min(...ys) + Math.max(...ys)) / 2) < 1e-9);
  });
});

QUnit.module("applyExtents and buildCamera", () => {
  QUnit.test("applyExtents puts the four edges on a camera", (assert) => {
    const camera = {};
    applyExtents(camera, { centerX: 1, centerY: -2, halfWidth: 8, halfHeight: 4 });

    assert.strictEqual(camera.orthoLeft, -7);
    assert.strictEqual(camera.orthoRight, 9);
    assert.strictEqual(camera.orthoBottom, -6);
    assert.strictEqual(camera.orthoTop, 2);
  });

  QUnit.test("buildCamera makes an orthographic camera at the CAMERA angles, and makes it the one that is used", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const camera = buildCamera(scene);

    assert.strictEqual(camera.mode, BABYLON.Camera.ORTHOGRAPHIC_CAMERA);
    assert.strictEqual(camera.alpha, CAMERA.alpha);
    assert.strictEqual(camera.beta, CAMERA.beta);
    assert.strictEqual(camera.radius, CAMERA.distance);
    assert.strictEqual(scene.activeCamera, camera);
    scene.dispose();
    engine.dispose();
  });
});
