QUnit.module("Paddle", () => {
  QUnit.test("defaults to x=0 and standard dimensions", (assert) => {
    const paddle = new Paddle();

    assert.strictEqual(paddle.x, 0);
    assert.strictEqual(paddle.halfWidth, 1.2);
    assert.strictEqual(paddle.halfHeight, 0.18);
  });

  QUnit.test("accepts initial state via constructor options", (assert) => {
    const paddle = new Paddle({ x: 2, y: 4, halfWidth: 2, halfHeight: 0.3 });

    assert.strictEqual(paddle.x, 2);
    assert.strictEqual(paddle.y, 4);
    assert.strictEqual(paddle.halfWidth, 2);
    assert.strictEqual(paddle.halfHeight, 0.3);
  });

  QUnit.test("moveTo() follows the target when within bounds", (assert) => {
    const paddle = new Paddle({ halfWidth: 1 });

    paddle.moveTo(3, 10);

    assert.strictEqual(paddle.x, 3);
  });

  QUnit.test("moveTo() clamps against the right bound", (assert) => {
    const paddle = new Paddle({ halfWidth: 1 });

    paddle.moveTo(100, 10);

    assert.strictEqual(paddle.x, 9, "clamped to boundHalfWidth - paddle.halfWidth");
  });

  QUnit.test("moveTo() clamps against the left bound", (assert) => {
    const paddle = new Paddle({ halfWidth: 1 });

    paddle.moveTo(-100, 10);

    assert.strictEqual(paddle.x, -9, "clamped to -boundHalfWidth + paddle.halfWidth");
  });

  QUnit.test("reset() snaps x back to 0", (assert) => {
    const paddle = new Paddle();
    paddle.moveTo(5, 10);

    paddle.reset();

    assert.strictEqual(paddle.x, 0);
  });
});

// Rendering (attachTo/dispose/mesh sync) only needs `BABYLON.MeshBuilder`,
// `BABYLON.StandardMaterial`, and `BABYLON.Color3` to exist, so these tests
// stub them out instead of loading the real engine (same approach as
// ball.tests.js's "Ball rendering" module).
QUnit.module("Paddle rendering", (hooks) => {
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

  QUnit.test("constructor attaches a mesh and material when scene is provided", (assert) => {
    const scene = {};
    const paddle = new Paddle({ scene, x: 3, y: 4, color: "#4a90e2" });

    assert.ok(paddle.mesh instanceof FakeMesh, "mesh is created");
    assert.ok(paddle.mesh.material instanceof FakeMaterial, "material is created and assigned");
    assert.strictEqual(paddle.mesh.material.diffuseColor, "#4a90e2");
    assert.strictEqual(paddle.mesh.position.x, 3, "mesh starts synced to initial x");
    assert.strictEqual(paddle.mesh.position.y, -4, "mesh y is flipped relative to physics y");
  });

  QUnit.test("no mesh is created when scene is omitted", (assert) => {
    const paddle = new Paddle({ x: 3, y: 4 });

    assert.strictEqual(paddle.mesh, null);
  });

  QUnit.test("moveTo() keeps the mesh synced to x", (assert) => {
    const scene = {};
    const paddle = new Paddle({ scene, halfWidth: 1 });

    paddle.moveTo(5, 10);

    assert.strictEqual(paddle.mesh.position.x, 5);
  });

  QUnit.test("dispose() disposes the mesh", (assert) => {
    const scene = {};
    const paddle = new Paddle({ scene });
    const mesh = paddle.mesh;

    paddle.dispose();

    assert.true(mesh.disposed, "mesh.dispose() was called");
    assert.strictEqual(paddle.mesh, null);
  });

  QUnit.test("dispose() is a no-op when no mesh exists", (assert) => {
    const paddle = new Paddle();

    paddle.dispose();

    assert.strictEqual(paddle.mesh, null);
  });
});
