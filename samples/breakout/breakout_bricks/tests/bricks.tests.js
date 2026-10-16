QUnit.module("BrickGrid layout", () => {
  QUnit.test("generates rows * cols bricks, all alive", (assert) => {
    const grid = new BrickGrid({ rows: 3, cols: 4 });

    assert.strictEqual(grid.bricks.length, 12);
    assert.true(grid.bricks.every((brick) => brick.alive));
  });

  QUnit.test("centers each row and spaces rows by 2*halfHeight + gap", (assert) => {
    const grid = new BrickGrid({ rows: 1, cols: 3, halfWidth: 0.5, halfHeight: 0.25, gap: 0.1, top: -2 });

    const xs = grid.bricks.map((b) => Math.round(b.x * 100) / 100);
    assert.deepEqual(xs, [-1.1, 0, 1.1], "columns are evenly spaced and centered on x = 0");
    assert.true(grid.bricks.every((b) => b.y === -2), "the single row sits at `top`");
  });

  QUnit.test("assigns each row's points value, cycling if there are more rows than values", (assert) => {
    const grid = new BrickGrid({ rows: 2, cols: 1, pointsPerRow: [50, 40] });

    assert.strictEqual(grid.bricks[0].points, 50, "row 0 uses pointsPerRow[0]");
    assert.strictEqual(grid.bricks[1].points, 40, "row 1 uses pointsPerRow[1]");
  });
});

QUnit.module("BrickGrid collision", () => {
  // A single column, two rows, no gap: brick 0 spans y -0.5..0.5, brick 1
  // spans y 0.5..1.5, both centered on x = 0.
  const gridOptions = { rows: 2, cols: 1, halfWidth: 1, halfHeight: 0.5, gap: 0, top: 0, pointsPerRow: [50, 40] };

  QUnit.test("checkCollision() returns null when the ball isn't touching any brick", (assert) => {
    const grid = new BrickGrid(gridOptions);
    const ball = new Ball({ x: 50, y: 50, vx: 0, vy: -1, radius: 0.4 });

    const result = grid.checkCollision(ball);

    assert.strictEqual(result, null);
    assert.true(grid.bricks.every((brick) => brick.alive), "no brick was touched");
  });

  QUnit.test("checkCollision() destroys the hit brick and returns its event and points", (assert) => {
    const grid = new BrickGrid(gridOptions);
    // Approaches brick 0 (top brick, y=0) from above.
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });

    const result = grid.checkCollision(ball);

    assert.ok(result, "reports a hit");
    assert.strictEqual(result.points, 50, "brick 0's row-0 points value");
    assert.strictEqual(result.event.normalY, -1);
    assert.false(grid.bricks[0].alive, "the hit brick is destroyed");
    assert.true(grid.bricks[1].alive, "the untouched brick is left alone");
  });

  QUnit.test("a destroyed brick is skipped on the next checkCollision() call", (assert) => {
    const grid = new BrickGrid(gridOptions);
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });
    grid.checkCollision(ball); // destroys brick 0 and pushes the ball back out

    const result = grid.checkCollision(ball);

    assert.strictEqual(result, null, "brick 0 is dead, and brick 1 is out of reach, so nothing is hit");
  });

  QUnit.test("isCleared() is true only once every brick is destroyed", (assert) => {
    const grid = new BrickGrid(gridOptions);
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });

    assert.false(grid.isCleared());

    grid.checkCollision(ball); // destroys brick 0
    assert.false(grid.isCleared(), "brick 1 is still alive");

    grid.bricks[1].alive = false;
    assert.true(grid.isCleared());
  });

  QUnit.test("reset() respawns every brick alive", (assert) => {
    const grid = new BrickGrid(gridOptions);
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });
    grid.checkCollision(ball);

    grid.reset();

    assert.strictEqual(grid.bricks.length, 2);
    assert.true(grid.bricks.every((brick) => brick.alive));
  });
});

// Rendering (mesh creation/disposal) only needs `BABYLON.MeshBuilder`,
// `BABYLON.StandardMaterial`, and `BABYLON.Color3` to exist, so these tests
// stub them out instead of loading the real engine (same approach as
// ball.tests.js's "Ball rendering" module).
QUnit.module("BrickGrid rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeMaterial {
    diffuseColor = null;
    disposed = false;

    dispose() {
      this.disposed = true;
    }
  }

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    material = null;
    disposed = false;

    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: {
        CreateBox: () => new FakeMesh(),
      },
      StandardMaterial: FakeMaterial,
      Color3: {
        FromHexString: (hex) => hex,
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("creates a mesh per brick when scene is provided", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, rows: 2, cols: 3 });

    assert.strictEqual(grid.bricks.length, 6);
    assert.true(grid.bricks.every((brick) => brick.mesh instanceof FakeMesh));
  });

  QUnit.test("no meshes are created when scene is omitted", (assert) => {
    const grid = new BrickGrid({ rows: 2, cols: 3 });

    assert.true(grid.bricks.every((brick) => brick.mesh === null));
  });

  QUnit.test("checkCollision() disposes the hit brick's mesh", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, rows: 2, cols: 1, halfWidth: 1, halfHeight: 0.5, gap: 0, top: 0 });
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });
    const mesh = grid.bricks[0].mesh;

    grid.checkCollision(ball);

    assert.true(mesh.disposed, "the destroyed brick's mesh was disposed");
    assert.strictEqual(grid.bricks[0].mesh, null);
  });

  QUnit.test("dispose() disposes every brick's mesh", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, rows: 1, cols: 2 });
    const meshes = grid.bricks.map((b) => b.mesh);

    grid.dispose();

    assert.true(meshes.every((mesh) => mesh.disposed));
    assert.strictEqual(grid.bricks.length, 0);
  });

  QUnit.test("reset() disposes old meshes and creates fresh ones", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, rows: 1, cols: 2 });
    const oldMeshes = grid.bricks.map((b) => b.mesh);

    grid.reset();

    assert.true(oldMeshes.every((mesh) => mesh.disposed), "old meshes are disposed");
    assert.strictEqual(grid.bricks.length, 2);
    assert.true(grid.bricks.every((brick) => brick.mesh instanceof FakeMesh && !brick.mesh.disposed));
  });
});
