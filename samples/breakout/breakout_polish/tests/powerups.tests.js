QUnit.module("PowerUpManager", () => {
  QUnit.test("exposes the valid type list", (assert) => {
    assert.deepEqual(PowerUpManager.TYPES.slice().sort(), ["life", "multi", "wide"]);
  });

  QUnit.test("spawn() adds an item with the given position and type", (assert) => {
    const manager = new PowerUpManager();

    manager.spawn(1, 2, "wide");

    assert.strictEqual(manager.items.length, 1);
    assert.strictEqual(manager.items[0].x, 1);
    assert.strictEqual(manager.items[0].y, 2);
    assert.strictEqual(manager.items[0].type, "wide");
  });

  QUnit.test("spawn() ignores an unknown type", (assert) => {
    const manager = new PowerUpManager();

    manager.spawn(0, 0, "not-a-real-type");

    assert.strictEqual(manager.items.length, 0);
  });

  QUnit.test("update() moves items down by fallSpeed * dt", (assert) => {
    const manager = new PowerUpManager({ fallSpeed: 2 });
    manager.spawn(0, 0, "wide");

    manager.update(0.5, { halfWidth: 100, halfHeight: 100 });

    assert.strictEqual(manager.items[0].y, 1);
  });

  QUnit.test("update() removes an item once it falls past halfHeight", (assert) => {
    const manager = new PowerUpManager({ fallSpeed: 10, radius: 0.2 });
    manager.spawn(0, 9.9, "wide");

    manager.update(1, { halfWidth: 100, halfHeight: 10 });

    assert.strictEqual(manager.items.length, 0);
  });

  QUnit.test("update() keeps an item that hasn't reached halfHeight yet", (assert) => {
    const manager = new PowerUpManager({ fallSpeed: 1, radius: 0.2 });
    manager.spawn(0, 0, "wide");

    manager.update(1, { halfWidth: 100, halfHeight: 10 });

    assert.strictEqual(manager.items.length, 1);
  });

  QUnit.test("checkCollision() catches an item overlapping the paddle and returns its type", (assert) => {
    const manager = new PowerUpManager({ radius: 0.2 });
    manager.spawn(0, 4, "life");
    const paddle = { x: 0, y: 4, halfWidth: 1, halfHeight: 0.2 };

    const caught = manager.checkCollision(paddle);

    assert.strictEqual(caught, "life");
    assert.strictEqual(manager.items.length, 0, "the caught item is removed");
  });

  QUnit.test("checkCollision() returns null and leaves items alone when nothing overlaps", (assert) => {
    const manager = new PowerUpManager({ radius: 0.2 });
    manager.spawn(50, 50, "life");
    const paddle = { x: 0, y: 4, halfWidth: 1, halfHeight: 0.2 };

    const caught = manager.checkCollision(paddle);

    assert.strictEqual(caught, null);
    assert.strictEqual(manager.items.length, 1);
  });

  QUnit.test("dispose() clears every in-flight item", (assert) => {
    const manager = new PowerUpManager();
    manager.spawn(0, 0, "wide");
    manager.spawn(1, 1, "life");

    manager.dispose();

    assert.strictEqual(manager.items.length, 0);
  });
});

// Rendering (mesh creation/disposal) only needs `BABYLON.MeshBuilder`,
// `BABYLON.StandardMaterial`, and `BABYLON.Color3` to exist, so these tests
// stub them out instead of loading the real engine (same approach as
// ball.tests.js's "Ball rendering" module).
QUnit.module("PowerUpManager rendering", (hooks) => {
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
        CreateSphere: () => new FakeMesh(),
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

  QUnit.test("spawn() creates a mesh when scene is provided", (assert) => {
    const scene = {};
    const manager = new PowerUpManager({ scene });

    manager.spawn(2, 3, "multi");

    assert.ok(manager.items[0].mesh instanceof FakeMesh);
    assert.strictEqual(manager.items[0].mesh.position.x, 2);
    assert.strictEqual(manager.items[0].mesh.position.y, -3, "mesh y is flipped relative to physics y");
  });

  QUnit.test("no mesh is created when scene is omitted", (assert) => {
    const manager = new PowerUpManager();

    manager.spawn(0, 0, "multi");

    assert.strictEqual(manager.items[0].mesh, null);
  });

  QUnit.test("update() keeps the mesh position synced (Y flipped)", (assert) => {
    const scene = {};
    const manager = new PowerUpManager({ scene, fallSpeed: 1 });
    manager.spawn(0, 0, "wide");

    manager.update(2, { halfWidth: 100, halfHeight: 100 });

    assert.strictEqual(manager.items[0].mesh.position.y, -2);
  });

  QUnit.test("update() disposes the mesh of an item that falls off the bottom", (assert) => {
    const scene = {};
    const manager = new PowerUpManager({ scene, fallSpeed: 10, radius: 0.2 });
    manager.spawn(0, 9.9, "wide");
    const mesh = manager.items[0].mesh;

    manager.update(1, { halfWidth: 100, halfHeight: 10 });

    assert.true(mesh.disposed);
  });

  QUnit.test("checkCollision() disposes the caught item's mesh", (assert) => {
    const scene = {};
    const manager = new PowerUpManager({ scene, radius: 0.2 });
    manager.spawn(0, 4, "life");
    const mesh = manager.items[0].mesh;
    const paddle = { x: 0, y: 4, halfWidth: 1, halfHeight: 0.2 };

    manager.checkCollision(paddle);

    assert.true(mesh.disposed);
  });

  QUnit.test("dispose() disposes every item's mesh", (assert) => {
    const scene = {};
    const manager = new PowerUpManager({ scene });
    manager.spawn(0, 0, "wide");
    manager.spawn(1, 1, "life");
    const meshes = manager.items.map((item) => item.mesh);

    manager.dispose();

    assert.true(meshes.every((mesh) => mesh.disposed));
  });
});
