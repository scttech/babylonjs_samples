QUnit.module("BrickGrid layout", () => {
  QUnit.test("places a brick only where the pattern is > 0", (assert) => {
    const grid = new BrickGrid({ pattern: [[1, 0, 1]] });

    assert.strictEqual(grid.bricks.length, 2, "the middle (0) cell produces no brick");
  });

  QUnit.test("centers columns based on the widest row", (assert) => {
    const grid = new BrickGrid({ pattern: [[1, 1, 1]], halfWidth: 0.5, gap: 0.1 });

    const xs = grid.bricks.map((b) => Math.round(b.x * 100) / 100);
    assert.deepEqual(xs, [-1.1, 0, 1.1]);
  });

  QUnit.test("stacks rows by 2*halfHeight + gap starting at `top`", (assert) => {
    const grid = new BrickGrid({ pattern: [[1], [1]], halfHeight: 0.25, gap: 0.1, top: -2 });

    const ys = grid.bricks.map((b) => b.y);
    assert.deepEqual(ys, [-2, -1.4]);
  });

  QUnit.test("each brick's hits equals its pattern durability value", (assert) => {
    const grid = new BrickGrid({ pattern: [[1, 2, 3]] });

    assert.deepEqual(
      grid.bricks.map((b) => b.hits),
      [1, 2, 3]
    );
  });

  QUnit.test("all placed bricks start alive", (assert) => {
    const grid = new BrickGrid({ pattern: [[1, 3, 2]] });

    assert.true(grid.bricks.every((brick) => brick.alive));
  });
});

QUnit.module("BrickGrid collision", () => {
  // A single column, two rows, no gap: brick 0 (2 hits) spans y -0.5..0.5,
  // brick 1 (1 hit) spans y 0.5..1.5, both centered on x = 0.
  const gridOptions = { pattern: [[2], [1]], halfWidth: 1, halfHeight: 0.5, gap: 0, top: 0, pointsPerHit: 10 };

  QUnit.test("checkCollision() returns null when the ball isn't touching any brick", (assert) => {
    const grid = new BrickGrid(gridOptions);
    const ball = new Ball({ x: 50, y: 50, vx: 0, vy: -1, radius: 0.4 });

    const result = grid.checkCollision(ball);

    assert.strictEqual(result, null);
  });

  QUnit.test("a hit reduces the brick's hits by 1 without destroying a multi-hit brick", (assert) => {
    const grid = new BrickGrid(gridOptions);
    // Approaches brick 0 (2 hits, y=0) from above.
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });

    const result = grid.checkCollision(ball);

    assert.ok(result, "reports a hit");
    assert.strictEqual(result.points, 10);
    assert.false(result.destroyed, "not destroyed yet -- it started with 2 hits");
    assert.strictEqual(result.x, 0, "reports the hit brick's position");
    assert.strictEqual(result.y, 0);
    assert.strictEqual(grid.bricks[0].hits, 1, "one hit remains");
    assert.true(grid.bricks[0].alive);
  });

  QUnit.test("a brick is destroyed once its hits reach 0", (assert) => {
    const grid = new BrickGrid(gridOptions);
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });
    grid.checkCollision(ball); // brick 0: 2 -> 1 hit, ball nudged back out

    // Re-approach the same brick for a second hit.
    ball.x = 0;
    ball.y = -0.7;
    ball.vx = 0;
    ball.vy = -6;
    const result = grid.checkCollision(ball);

    assert.true(result.destroyed);
    assert.false(grid.bricks[0].alive);
  });

  QUnit.test("isCleared() is true only once every brick is destroyed", (assert) => {
    const grid = new BrickGrid(gridOptions);

    assert.false(grid.isCleared());

    grid.bricks[0].alive = false;
    assert.false(grid.isCleared(), "brick 1 is still alive");

    grid.bricks[1].alive = false;
    assert.true(grid.isCleared());
  });

  QUnit.test("load() tears down the old pattern and lays out a new one", (assert) => {
    const grid = new BrickGrid(gridOptions);

    grid.load([[1, 1, 1]]);

    assert.strictEqual(grid.bricks.length, 3);
    assert.true(grid.bricks.every((brick) => brick.hits === 1 && brick.alive));
  });
});

// Rendering (mesh creation/disposal/recoloring) only needs
// `BABYLON.MeshBuilder`, `BABYLON.StandardMaterial`, and `BABYLON.Color3` to
// exist, so these tests stub them out instead of loading the real engine
// (same approach as ball.tests.js's "Ball rendering" module).
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

  QUnit.test("creates a mesh per placed brick when scene is provided", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, pattern: [[1, 0, 2]] });

    assert.strictEqual(grid.bricks.length, 2);
    assert.true(grid.bricks.every((brick) => brick.mesh instanceof FakeMesh));
  });

  QUnit.test("no meshes are created when scene is omitted", (assert) => {
    const grid = new BrickGrid({ pattern: [[1, 1]] });

    assert.true(grid.bricks.every((brick) => brick.mesh === null));
  });

  QUnit.test("checkCollision() recolors (but doesn't dispose) a damaged multi-hit brick's mesh", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, pattern: [[2]], halfWidth: 1, halfHeight: 0.5, gap: 0, top: 0 });
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });
    const mesh = grid.bricks[0].mesh;

    grid.checkCollision(ball);

    assert.false(mesh.disposed, "mesh survives a hit that doesn't destroy the brick");
    assert.strictEqual(grid.bricks[0].mesh, mesh, "same mesh instance, just recolored");
    assert.strictEqual(mesh.material.diffuseColor, "#2ecc71", "recolored to the 1-hit-remaining color");
  });

  QUnit.test("checkCollision() disposes the mesh once a brick is destroyed", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, pattern: [[1]], halfWidth: 1, halfHeight: 0.5, gap: 0, top: 0 });
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: -6, radius: 0.4 });
    const mesh = grid.bricks[0].mesh;

    grid.checkCollision(ball);

    assert.true(mesh.disposed);
    assert.strictEqual(grid.bricks[0].mesh, null);
  });

  QUnit.test("dispose() disposes every brick's mesh", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, pattern: [[1, 1]] });
    const meshes = grid.bricks.map((b) => b.mesh);

    grid.dispose();

    assert.true(meshes.every((mesh) => mesh.disposed));
    assert.strictEqual(grid.bricks.length, 0);
  });

  QUnit.test("load() disposes old meshes and creates fresh ones for the new pattern", (assert) => {
    const scene = {};
    const grid = new BrickGrid({ scene, pattern: [[1, 1]] });
    const oldMeshes = grid.bricks.map((b) => b.mesh);

    grid.load([[1, 1, 1]]);

    assert.true(oldMeshes.every((mesh) => mesh.disposed), "old meshes are disposed");
    assert.strictEqual(grid.bricks.length, 3);
    assert.true(grid.bricks.every((brick) => brick.mesh instanceof FakeMesh && !brick.mesh.disposed));
  });
});
