// Local helper -- named differently from ship.tests.js's assertClose so both
// files can be loaded on the same page without a duplicate-declaration error.
const near = (assert, actual, expected, tolerance = 1e-9) =>
  assert.true(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);

QUnit.module("BulletSystem", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  QUnit.test("starts empty with the gun ready", (assert) => {
    const system = new BulletSystem();

    assert.deepEqual(system.bullets, []);
    assert.strictEqual(system.cooldownRemaining, 0);
  });

  QUnit.test("fire() spawns a bullet at the ship's nose, heading the way it points", (assert) => {
    const ship = new Ship({ x: 1, y: 2, radius: 0.5 }); // pointing up
    const system = new BulletSystem({ speed: 10 });

    const bullet = system.fire(ship);

    near(assert, bullet.x, 1);
    near(assert, bullet.y, 2.5);
    near(assert, bullet.vx, 0);
    near(assert, bullet.vy, 10);
    assert.strictEqual(system.bullets.length, 1);
  });

  QUnit.test("fire() follows the ship's heading", (assert) => {
    const ship = new Ship({ angle: Math.PI / 2 }); // pointing left
    const system = new BulletSystem({ speed: 10 });

    const bullet = system.fire(ship);

    near(assert, bullet.vx, -10);
    near(assert, bullet.vy, 0);
  });

  QUnit.test("bullets inherit the ship's velocity", (assert) => {
    const ship = new Ship();
    ship.vx = 3;
    ship.vy = -2;
    const system = new BulletSystem({ speed: 10 });

    const bullet = system.fire(ship);

    near(assert, bullet.vx, 3);
    near(assert, bullet.vy, 8);
  });

  QUnit.test("fire() is blocked during the cooldown and allowed after it", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ cooldown: 0.5 });

    assert.ok(system.fire(ship), "first shot fires");
    assert.strictEqual(system.fire(ship), null, "immediate second shot is blocked");

    system.update(0.3, BOUNDS);
    assert.strictEqual(system.fire(ship), null, "still cooling down");

    system.update(0.3, BOUNDS);
    assert.ok(system.fire(ship), "fires again once the cooldown has elapsed");
  });

  QUnit.test("fire() respects maxBullets", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ cooldown: 0, maxBullets: 2 });

    system.fire(ship);
    system.fire(ship);

    assert.strictEqual(system.fire(ship), null);
    assert.strictEqual(system.bullets.length, 2);
  });

  QUnit.test("update() moves bullets by velocity * dt", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ speed: 4, radius: 0.1 });
    const bullet = system.fire(ship);
    const startY = bullet.y;

    system.update(0.5, BOUNDS);

    near(assert, bullet.y, startY + 2);
  });

  QUnit.test("bullets expire after their lifetime", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ lifetime: 1, speed: 1 });
    system.fire(ship);

    system.update(0.6, BOUNDS);
    assert.strictEqual(system.bullets.length, 1, "still alive at 0.6s");

    system.update(0.6, BOUNDS);
    assert.strictEqual(system.bullets.length, 0, "gone after 1.2s");
  });

  QUnit.test("expiring a bullet frees a slot for a new one", (assert) => {
    const ship = new Ship();
    const system = new BulletSystem({ cooldown: 0, maxBullets: 1, lifetime: 0.5 });
    system.fire(ship);
    assert.strictEqual(system.fire(ship), null, "full");

    system.update(0.6, BOUNDS);

    assert.ok(system.fire(ship), "slot is free again");
  });

  QUnit.test("bullets wrap around the screen edges", (assert) => {
    const system = new BulletSystem({ radius: 0.1, speed: 1, lifetime: 100 });
    const bullet = system.fire(new Ship());
    bullet.x = 10.05; // just inside halfWidth + radius = 10.1
    bullet.vx = 1;
    bullet.vy = 0;

    system.update(0.1, BOUNDS); // x -> 10.15, past the limit

    near(assert, bullet.x, -10.1);
  });

  QUnit.test("clear() removes every bullet and resets the cooldown", (assert) => {
    const system = new BulletSystem({ cooldown: 1 });
    system.fire(new Ship());

    system.clear();

    assert.deepEqual(system.bullets, []);
    assert.strictEqual(system.cooldownRemaining, 0);
  });
});

QUnit.module("BulletSystem rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeMaterial {
    emissiveColor = null;
    disableLighting = false;
    disposed = false;

    dispose() {
      this.disposed = true;
    }
  }

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    material = null;
    disposeArgs = null;

    dispose(...args) {
      this.disposeArgs = args;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: { CreateSphere: () => new FakeMesh() },
      StandardMaterial: FakeMaterial,
      Color3: { FromHexString: (hex) => hex },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("creates one shared emissive, unlit material", (assert) => {
    const system = new BulletSystem({ scene: {}, color: "#ff0000" });

    assert.ok(system._material instanceof FakeMaterial);
    assert.strictEqual(system._material.emissiveColor, "#ff0000");
    assert.true(system._material.disableLighting);
  });

  QUnit.test("each bullet gets a mesh using the shared material", (assert) => {
    const system = new BulletSystem({ scene: {}, cooldown: 0 });

    const a = system.fire(new Ship());
    const b = system.fire(new Ship());

    assert.ok(a.mesh instanceof FakeMesh);
    assert.strictEqual(a.mesh.material, system._material);
    assert.strictEqual(b.mesh.material, system._material, "same material instance");
  });

  QUnit.test("no meshes are created when scene is omitted", (assert) => {
    const system = new BulletSystem();

    const bullet = system.fire(new Ship());

    assert.strictEqual(bullet.mesh, null);
  });

  QUnit.test("update() keeps each mesh synced to its bullet", (assert) => {
    const system = new BulletSystem({ scene: {}, speed: 4 });
    const bullet = system.fire(new Ship());

    system.update(0.5, BOUNDS);

    assert.strictEqual(bullet.mesh.position.x, bullet.x);
    assert.strictEqual(bullet.mesh.position.y, bullet.y);
  });

  QUnit.test("an expired bullet's mesh is disposed without disposing the shared material", (assert) => {
    const system = new BulletSystem({ scene: {}, lifetime: 0.1 });
    const bullet = system.fire(new Ship());
    const mesh = bullet.mesh;

    system.update(0.2, BOUNDS);

    assert.deepEqual(mesh.disposeArgs, [false, false]);
    assert.false(system._material.disposed, "material is still alive for the next shot");
  });

  QUnit.test("dispose() clears bullets and disposes the material", (assert) => {
    const system = new BulletSystem({ scene: {} });
    system.fire(new Ship());
    const material = system._material;

    system.dispose();

    assert.strictEqual(system.bullets.length, 0);
    assert.true(material.disposed);
    assert.strictEqual(system._material, null);
  });
});
