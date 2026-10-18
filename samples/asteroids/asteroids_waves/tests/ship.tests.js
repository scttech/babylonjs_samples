// QUnit core has no approximate-equality assert, and heading math produces
// floating-point noise (sin/cos), so compare within a small tolerance.
const assertClose = (assert, actual, expected, tolerance, message) =>
  assert.true(Math.abs(actual - expected) <= tolerance, message || `expected ${actual} to be within ${tolerance} of ${expected}`);

QUnit.module("Ship", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  QUnit.test("defaults to the origin, at rest, pointing up", (assert) => {
    const ship = new Ship();

    assert.strictEqual(ship.x, 0);
    assert.strictEqual(ship.y, 0);
    assert.strictEqual(ship.vx, 0);
    assert.strictEqual(ship.vy, 0);
    assert.strictEqual(ship.angle, 0);
  });

  QUnit.test("rotate() turns counter-clockwise for +1 and clockwise for -1", (assert) => {
    const ship = new Ship({ turnSpeed: 2 });

    ship.rotate(1, 0.5);
    assertClose(assert, ship.angle, 1, 1e-9);

    ship.rotate(-1, 1);
    assertClose(assert, ship.angle, -1, 1e-9);
  });

  QUnit.test("thrust() accelerates straight up when pointing up", (assert) => {
    const ship = new Ship({ thrustAccel: 10 });

    ship.thrust(0.5);

    assertClose(assert, ship.vx, 0, 1e-9);
    assertClose(assert, ship.vy, 5, 1e-9);
  });

  QUnit.test("thrust() accelerates along the current heading", (assert) => {
    const ship = new Ship({ thrustAccel: 10, angle: Math.PI / 2 }); // turned 90deg counter-clockwise = pointing left

    ship.thrust(1);

    assertClose(assert, ship.vx, -10, 1e-9);
    assertClose(assert, ship.vy, 0, 1e-9);
  });

  QUnit.test("turning after thrusting does not change velocity (inertia)", (assert) => {
    const ship = new Ship({ thrustAccel: 10 });
    ship.thrust(0.5);

    ship.rotate(1, 1);
    ship.update(0, BOUNDS);

    assertClose(assert, ship.vy, 5, 1e-9, "still drifting the way it was going");
    assertClose(assert, ship.vx, 0, 1e-9);
  });

  QUnit.test("thrust() clamps speed to maxSpeed", (assert) => {
    const ship = new Ship({ thrustAccel: 100, maxSpeed: 4 });

    ship.thrust(1);

    assertClose(assert, ship.speed, 4, 1e-9);
    assertClose(assert, ship.vy, 4, 1e-9, "direction is preserved when clamping");
  });

  QUnit.test("update() integrates position from velocity", (assert) => {
    const ship = new Ship();
    ship.vx = 2;
    ship.vy = -1;

    ship.update(0.5, BOUNDS);

    assertClose(assert, ship.x, 1, 1e-9);
    assertClose(assert, ship.y, -0.5, 1e-9);
  });

  QUnit.test("drag bleeds off velocity over time", (assert) => {
    const ship = new Ship({ drag: 0.5 });
    ship.vx = 4;

    ship.update(1, BOUNDS);

    assertClose(assert, ship.vx, 2, 1e-9, "lost half its speed in one second");
  });

  QUnit.test("with no drag, velocity is preserved indefinitely", (assert) => {
    const ship = new Ship();
    ship.vx = 1;

    for (let i = 0; i < 10; i++) ship.update(0.1, { halfWidth: 100, halfHeight: 100 });

    assert.strictEqual(ship.vx, 1);
  });

  QUnit.test("update() wraps off the right edge to the left", (assert) => {
    const ship = new Ship({ radius: 1 });
    ship.x = 10.5;
    ship.vx = 1;

    const result = ship.update(1, BOUNDS); // x = 11.5, past halfWidth + radius = 11

    assert.strictEqual(ship.x, -11);
    assert.true(result.wrappedX);
    assert.false(result.wrappedY);
  });

  QUnit.test("update() wraps off the left edge to the right", (assert) => {
    const ship = new Ship({ radius: 1 });
    ship.x = -10.5;
    ship.vx = -1;

    ship.update(1, BOUNDS);

    assert.strictEqual(ship.x, 11);
  });

  QUnit.test("update() wraps vertically in both directions", (assert) => {
    const ship = new Ship({ radius: 1 });
    ship.y = 5.5;
    ship.vy = 1;
    const up = ship.update(1, BOUNDS);
    assert.strictEqual(ship.y, -6);
    assert.true(up.wrappedY);

    ship.y = -5.5;
    ship.vy = -1;
    ship.update(1, BOUNDS);
    assert.strictEqual(ship.y, 6);
  });

  QUnit.test("update() does not wrap while the ship is still partly on-screen", (assert) => {
    const ship = new Ship({ radius: 1 });
    ship.x = 10.5; // center is past the edge but within halfWidth + radius
    ship.vx = 0;

    const result = ship.update(1, BOUNDS);

    assert.strictEqual(ship.x, 10.5);
    assert.false(result.wrappedX);
  });

  QUnit.test("thrusting flag lasts for one update() only", (assert) => {
    const ship = new Ship();

    ship.thrust(0.1);
    assert.true(ship.thrusting);

    ship.update(0.1, BOUNDS);
    assert.false(ship.thrusting);
  });

  QUnit.test("reset() returns to the center at rest, pointing up", (assert) => {
    const ship = new Ship({ x: 3, y: 4, angle: 1 });
    ship.vx = 5;
    ship.vy = 5;

    ship.reset();

    assert.strictEqual(ship.x, 0);
    assert.strictEqual(ship.y, 0);
    assert.strictEqual(ship.vx, 0);
    assert.strictEqual(ship.vy, 0);
    assert.strictEqual(ship.angle, 0);
  });
});

// Rendering (attachTo/dispose/mesh sync) only needs a few `BABYLON` pieces to
// exist, so these tests stub them out instead of loading the real engine (same
// approach as the Breakout series' "Paddle rendering" module).
QUnit.module("Ship rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    rotation = { x: 0, y: 0, z: 0 };
    color = null;
    parent = null;
    isVisible = true;
    disposed = false;

    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: {
        CreateLines: () => new FakeMesh(),
      },
      Vector3: class {
        constructor(x, y, z) {
          Object.assign(this, { x, y, z });
        }
      },
      Color3: {
        FromHexString: (hex) => hex,
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("constructor attaches a hull and a hidden flame when scene is provided", (assert) => {
    const ship = new Ship({ scene: {}, x: 3, y: 4, angle: 0.5, color: "#00ff00" });

    assert.ok(ship.mesh instanceof FakeMesh, "hull is created");
    assert.strictEqual(ship.mesh.color, "#00ff00");
    assert.strictEqual(ship.flame.parent, ship.mesh, "flame follows the hull");
    assert.false(ship.flame.isVisible, "flame starts hidden");
    assert.strictEqual(ship.mesh.position.x, 3);
    assert.strictEqual(ship.mesh.position.y, 4, "y is not flipped in this series");
    assert.strictEqual(ship.mesh.rotation.z, 0.5);
  });

  QUnit.test("no mesh is created when scene is omitted", (assert) => {
    const ship = new Ship();

    assert.strictEqual(ship.mesh, null);
    assert.strictEqual(ship.flame, null);
  });

  QUnit.test("update() keeps the mesh synced to position and heading", (assert) => {
    const ship = new Ship({ scene: {} });
    ship.vx = 2;
    ship.rotate(1, 0.1);

    ship.update(1, BOUNDS);

    assert.strictEqual(ship.mesh.position.x, 2);
    assert.strictEqual(ship.mesh.rotation.z, ship.angle);
  });

  QUnit.test("flame is visible only on frames the ship thrusts", (assert) => {
    const ship = new Ship({ scene: {} });

    ship.thrust(0.1);
    ship.update(0.1, BOUNDS);
    assert.true(ship.flame.isVisible, "visible while thrusting");

    ship.update(0.1, BOUNDS);
    assert.false(ship.flame.isVisible, "hidden again once thrust stops");
  });

  QUnit.test("dispose() disposes the hull", (assert) => {
    const ship = new Ship({ scene: {} });
    const mesh = ship.mesh;

    ship.dispose();

    assert.true(mesh.disposed);
    assert.strictEqual(ship.mesh, null);
    assert.strictEqual(ship.flame, null);
  });

  QUnit.test("dispose() is a no-op when no mesh exists", (assert) => {
    const ship = new Ship();

    ship.dispose();

    assert.strictEqual(ship.mesh, null);
  });
});

QUnit.module("Ship muzzle", () => {
  QUnit.test("muzzle() is at the nose, pointing the way the ship faces", (assert) => {
    const ship = new Ship({ x: 1, y: 2, radius: 0.5 });

    const m = ship.muzzle();

    assertClose(assert, m.x, 1, 1e-9);
    assertClose(assert, m.y, 2.5, 1e-9);
    assertClose(assert, m.dirX, 0, 1e-9);
    assertClose(assert, m.dirY, 1, 1e-9);
  });

  QUnit.test("muzzle() follows the heading", (assert) => {
    const ship = new Ship({ angle: Math.PI / 2, radius: 1 }); // pointing left

    const m = ship.muzzle();

    assertClose(assert, m.x, -1, 1e-9);
    assertClose(assert, m.y, 0, 1e-9);
    assertClose(assert, m.dirX, -1, 1e-9);
  });
});

QUnit.module("Ship invulnerability", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  QUnit.test("starts vulnerable and visible", (assert) => {
    const ship = new Ship();

    assert.false(ship.invulnerable);
    assert.true(ship.visible);
    assert.true(ship.drawn);
  });

  QUnit.test("makeInvulnerable() protects the ship for the given time", (assert) => {
    const ship = new Ship();

    ship.makeInvulnerable(2);

    assert.true(ship.invulnerable);
    assert.strictEqual(ship.invulnerableTime, 2);
  });

  QUnit.test("update() counts the protection down until it ends", (assert) => {
    const ship = new Ship();
    ship.makeInvulnerable(1);

    ship.update(0.4, BOUNDS);
    assert.true(ship.invulnerable, "still protected after 0.4s");
    assert.true(Math.abs(ship.invulnerableTime - 0.6) < 1e-9);

    ship.update(0.7, BOUNDS);
    assert.false(ship.invulnerable, "protection has run out");
    assert.strictEqual(ship.invulnerableTime, 0, "and the timer stops at zero, not below");
  });

  QUnit.test("respawn() puts the ship back in the middle, at rest, and protected", (assert) => {
    const ship = new Ship({ x: 3, y: 4 });
    ship.vx = 5;
    ship.vy = 5;
    ship.angle = 1;

    ship.respawn(2.5);

    assert.strictEqual(ship.x, 0);
    assert.strictEqual(ship.y, 0);
    assert.strictEqual(ship.speed, 0);
    assert.strictEqual(ship.angle, 0);
    assert.strictEqual(ship.invulnerableTime, 2.5);
  });

  QUnit.test("respawn() protects for 3 seconds unless told otherwise", (assert) => {
    const ship = new Ship();

    ship.respawn();

    assert.strictEqual(ship.invulnerableTime, 3);
  });

  QUnit.test("reset() clears protection and shows the ship again", (assert) => {
    const ship = new Ship();
    ship.makeInvulnerable(5);
    ship.setVisible(false);

    ship.reset();

    assert.false(ship.invulnerable);
    assert.true(ship.visible);
  });

  QUnit.test("a protected ship blinks: ten flips a second", (assert) => {
    const ship = new Ship();

    ship.invulnerableTime = 1.0;
    assert.true(ship.drawn, "1.0s left: drawn");
    ship.invulnerableTime = 0.95;
    assert.false(ship.drawn, "0.95s left: blinked off");
    ship.invulnerableTime = 0.85;
    assert.true(ship.drawn, "0.85s left: back on");
  });

  QUnit.test("a hidden ship is never drawn, protected or not", (assert) => {
    const ship = new Ship();

    ship.setVisible(false);
    assert.false(ship.drawn);

    ship.invulnerableTime = 1.0; // a moment in the blink cycle that would be "on"
    assert.false(ship.drawn);
  });
});

QUnit.module("Ship visibility rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    rotation = { x: 0, y: 0, z: 0 };
    color = null;
    parent = null;
    isVisible = true;

    dispose() { }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: { CreateLines: () => new FakeMesh() },
      Vector3: class { },
      Color3: { FromHexString: (hex) => hex },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("setVisible(false) hides the hull and the flame", (assert) => {
    const ship = new Ship({ scene: {} });
    ship.thrust(0.1); // the flame would normally be showing

    ship.setVisible(false);

    assert.false(ship.mesh.isVisible);
    assert.false(ship.flame.isVisible);
  });

  QUnit.test("the hull follows the blink while protected", (assert) => {
    const ship = new Ship({ scene: {} });

    ship.makeInvulnerable(1.0);
    assert.true(ship.mesh.isVisible, "on at the start of the blink cycle");

    ship.update(0.05, BOUNDS); // 0.95s left
    assert.false(ship.mesh.isVisible, "off in the next half-cycle");
  });

  QUnit.test("the flame never shows while the hull is blinked off", (assert) => {
    const ship = new Ship({ scene: {} });
    ship.makeInvulnerable(1.0);

    ship.thrust(0.1);
    ship.update(0.05, BOUNDS); // 0.95s left: hull off

    assert.false(ship.flame.isVisible);
  });
});


