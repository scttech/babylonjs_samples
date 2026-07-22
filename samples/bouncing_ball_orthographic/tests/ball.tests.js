QUnit.module("Ball", () => {
  QUnit.test("defaults to origin, zero velocity, and radius 0.6", (assert) => {
    const ball = new Ball();

    assert.strictEqual(ball.x, 0, "x defaults to 0");
    assert.strictEqual(ball.y, 0, "y defaults to 0");
    assert.strictEqual(ball.vx, 0, "vx defaults to 0");
    assert.strictEqual(ball.vy, 0, "vy defaults to 0");
    assert.strictEqual(ball.radius, 0.6, "radius defaults to 0.6");
    assert.strictEqual(ball.rotation, 0, "rotation starts at 0");
  });

  QUnit.test("accepts initial state via constructor options", (assert) => {
    const ball = new Ball({ x: 10, y: -5, vx: 100, vy: -50, radius: 20 });

    assert.strictEqual(ball.x, 10);
    assert.strictEqual(ball.y, -5);
    assert.strictEqual(ball.vx, 100);
    assert.strictEqual(ball.vy, -50);
    assert.strictEqual(ball.radius, 20);
  });

  QUnit.test("moves by velocity * dt when no wall is hit", (assert) => {
    const ball = new Ball({ x: 0, y: 0, vx: 100, vy: 50, radius: 10 });
    const bounds = { halfWidth: 1000, halfHeight: 1000 };

    const events = ball.update(0.5, bounds);

    assert.strictEqual(ball.x, 50, "x advances by vx * dt");
    assert.strictEqual(ball.y, 25, "y advances by vy * dt");
    assert.deepEqual(events, [], "no bounce events when staying in bounds");
  });

  QUnit.test("bounces off the right wall and reflects vx", (assert) => {
    const ball = new Ball({ x: 90, y: 0, vx: 100, vy: 0, radius: 10 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.x, 90, "x is clamped to halfWidth - radius");
    assert.strictEqual(ball.vx, -100, "vx is reflected");
    assert.strictEqual(events.length, 1, "produces one bounce event");
    assert.deepEqual(
      events[0],
      { x: 100, y: 0, normalX: -1, normalY: 0, speed: 100 },
      "event reports impact point, inward normal, and post-bounce speed"
    );
  });

  QUnit.test("bounces off the left wall and reflects vx", (assert) => {
    const ball = new Ball({ x: -90, y: 0, vx: -100, vy: 0, radius: 10 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.x, -90, "x is clamped to -halfWidth + radius");
    assert.strictEqual(ball.vx, 100, "vx is reflected");
    assert.strictEqual(events.length, 1);
    assert.deepEqual(events[0], { x: -100, y: 0, normalX: 1, normalY: 0, speed: 100 });
  });

  QUnit.test("bounces off the bottom wall and reflects vy", (assert) => {
    const ball = new Ball({ x: 0, y: 90, vx: 0, vy: 100, radius: 10 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.y, 90, "y is clamped to halfHeight - radius");
    assert.strictEqual(ball.vy, -100, "vy is reflected");
    assert.strictEqual(events.length, 1);
    assert.deepEqual(events[0], { x: 0, y: 100, normalX: 0, normalY: -1, speed: 100 });
  });

  QUnit.test("bounces off the top wall and reflects vy", (assert) => {
    const ball = new Ball({ x: 0, y: -90, vx: 0, vy: -100, radius: 10 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.y, -90, "y is clamped to -halfHeight + radius");
    assert.strictEqual(ball.vy, 100, "vy is reflected");
    assert.strictEqual(events.length, 1);
    assert.deepEqual(events[0], { x: 0, y: -100, normalX: 0, normalY: 1, speed: 100 });
  });

  QUnit.test("hitting a corner produces two bounce events in the same frame", (assert) => {
    const ball = new Ball({ x: 90, y: 90, vx: 100, vy: 100, radius: 10 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.vx, -100, "vx is reflected");
    assert.strictEqual(ball.vy, -100, "vy is reflected");
    assert.strictEqual(events.length, 2, "both walls report a bounce event");
    assert.strictEqual(events[0].normalX, -1, "x-axis event fires first, matching update()'s check order");
    assert.strictEqual(events[1].normalY, -1);
  });

  QUnit.test("rotation accumulates proportionally to vx / radius", (assert) => {
    const ball = new Ball({ vx: 200, radius: 40 });
    const bounds = { halfWidth: 1000, halfHeight: 1000 };

    ball.update(0.5, bounds);

    assert.strictEqual(ball.rotation, (200 / 40) * 0.5, "rotation += (vx / radius) * dt");
  });

  QUnit.test("does not mutate the bounds object passed in", (assert) => {
    const ball = new Ball({ x: 90, vx: 100, radius: 10 });
    const bounds = { halfWidth: 100, halfHeight: 100 };
    const boundsCopy = { ...bounds };

    ball.update(1, bounds);

    assert.deepEqual(bounds, boundsCopy, "bounds object is left untouched");
  });
});

// Rendering (attachTo/dispose/mesh sync) only needs `BABYLON.MeshBuilder`,
// `BABYLON.StandardMaterial`, and `BABYLON.Color3` to exist, so these tests
// stub them out instead of loading the real engine.
QUnit.module("Ball rendering", (hooks) => {
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
    rotation = { x: 0, y: 0, z: 0 };
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

  QUnit.test("constructor attaches a mesh and material when scene is provided", (assert) => {
    const scene = {};
    const ball = new Ball({ scene, x: 5, y: -5, radius: 25, color: "#8ab4ff" });

    assert.ok(ball.mesh instanceof FakeMesh, "mesh is created");
    assert.ok(ball.mesh.material instanceof FakeMaterial, "material is created and assigned");
    assert.strictEqual(ball.mesh.material.diffuseColor, "#8ab4ff");
    assert.strictEqual(ball.mesh.position.x, 5, "mesh starts synced to initial x");
    assert.strictEqual(ball.mesh.position.y, 5, "mesh y is flipped relative to physics y (-(-5))");
  });

  QUnit.test("no mesh is created when scene is omitted", (assert) => {
    const ball = new Ball({ x: 5, y: -5 });

    assert.strictEqual(ball.mesh, null);
  });

  QUnit.test("update() keeps the mesh synced to position (Y flipped) and rotation", (assert) => {
    const scene = {};
    const ball = new Ball({ scene, vx: 100, vy: 0, radius: 10 });
    const bounds = { halfWidth: 1000, halfHeight: 1000 };

    ball.update(0.5, bounds);

    assert.strictEqual(ball.mesh.position.x, ball.x);
    assert.strictEqual(ball.mesh.position.y, -ball.y);
    assert.strictEqual(ball.mesh.rotation.z, -ball.rotation);
  });

  QUnit.test("reset() keeps the mesh synced to the new position and rotation", (assert) => {
    const scene = {};
    const ball = new Ball({ scene, vx: 100, vy: 0, radius: 10 });
    ball.update(0.5, { halfWidth: 1000, halfHeight: 1000 });

    ball.reset(20, -10);

    assert.strictEqual(ball.mesh.position.x, 20);
    assert.strictEqual(ball.mesh.position.y, 10, "flipped: -(-10)");
    assert.strictEqual(ball.mesh.rotation.z, 0);
  });

  QUnit.test("dispose() disposes the mesh", (assert) => {
    const scene = {};
    const ball = new Ball({ scene });
    const mesh = ball.mesh;

    ball.dispose();

    assert.true(mesh.disposed, "mesh.dispose() was called");
    assert.strictEqual(ball.mesh, null);
  });

  QUnit.test("dispose() is a no-op when no mesh exists", (assert) => {
    const ball = new Ball();

    ball.dispose();

    assert.strictEqual(ball.mesh, null);
  });
});

QUnit.module("Ball slingshot drag", () => {
  QUnit.test("beginDrag() records the anchor at the current position and zeroes velocity", (assert) => {
    const ball = new Ball({ x: 30, y: -20, vx: 100, vy: -50 });

    ball.beginDrag();

    assert.true(ball.dragging, "dragging is now true");
    assert.strictEqual(ball.anchorX, 30, "anchorX captures the pre-drag x");
    assert.strictEqual(ball.anchorY, -20, "anchorY captures the pre-drag y");
    assert.strictEqual(ball.vx, 0, "vx is zeroed");
    assert.strictEqual(ball.vy, 0, "vy is zeroed");
  });

  QUnit.test("dragTo() follows the pointer when within maxDragDistance", (assert) => {
    const ball = new Ball({ x: 0, y: 0 });
    ball.beginDrag();

    const strength = ball.dragTo(30, 40, 100); // distance 50, well under the cap

    assert.strictEqual(ball.x, 30, "x follows the pointer");
    assert.strictEqual(ball.y, 40, "y follows the pointer");
    assert.strictEqual(strength, 0.5, "strength is distance / maxDragDistance");
  });

  QUnit.test("dragTo() clamps to maxDragDistance when pulled further", (assert) => {
    const ball = new Ball({ x: 0, y: 0 });
    ball.beginDrag();

    const strength = ball.dragTo(300, 400, 100); // direction (0.6, 0.8), distance 500

    assert.strictEqual(ball.x, 60, "x is clamped along the same direction");
    assert.strictEqual(ball.y, 80, "y is clamped along the same direction");
    assert.strictEqual(strength, 1, "strength saturates at 1");
  });

  QUnit.test("dragTo() returns 0 and stays at the anchor when the pointer is on it", (assert) => {
    const ball = new Ball({ x: 5, y: 5 });
    ball.beginDrag();

    const strength = ball.dragTo(5, 5, 100);

    assert.strictEqual(ball.x, 5);
    assert.strictEqual(ball.y, 5);
    assert.strictEqual(strength, 0);
  });

  QUnit.test("release() launches opposite the pull direction, scaled by strength * maxSpeed", (assert) => {
    const ball = new Ball({ x: 0, y: 0 });
    ball.beginDrag();
    ball.dragTo(50, 0, 100); // pulled halfway along +x

    ball.release(100, 200);

    assert.strictEqual(ball.x, 0, "x snaps back to the anchor");
    assert.strictEqual(ball.y, 0, "y snaps back to the anchor");
    assert.strictEqual(ball.vx, -100, "launches in -x at half of maxSpeed (0.5 * 200)");
    assert.strictEqual(ball.vy, 0);
    assert.false(ball.dragging, "dragging is cleared");
  });

  QUnit.test("release() with no pull leaves the ball at rest", (assert) => {
    const ball = new Ball({ x: 10, y: 10 });
    ball.beginDrag();
    // No dragTo() call: the pointer never moved off the anchor.

    ball.release(100, 200);

    assert.strictEqual(ball.vx, 0);
    assert.strictEqual(ball.vy, 0);
    assert.strictEqual(ball.x, 10);
    assert.strictEqual(ball.y, 10);
  });

  QUnit.test("release() at full pull reaches exactly maxSpeed", (assert) => {
    const ball = new Ball({ x: 0, y: 0 });
    ball.beginDrag();
    ball.dragTo(0, 100, 100); // pulled fully along +y

    ball.release(100, 200);

    assert.strictEqual(ball.vx, 0);
    assert.strictEqual(ball.vy, -200, "launches in -y at full maxSpeed");
  });
});

QUnit.module("Ball reset", () => {
  QUnit.test("reset() defaults to the origin at rest", (assert) => {
    const ball = new Ball({ x: 90, y: -40, vx: 300, vy: -150, radius: 10 });
    ball.rotation = 4;

    ball.reset();

    assert.strictEqual(ball.x, 0);
    assert.strictEqual(ball.y, 0);
    assert.strictEqual(ball.vx, 0);
    assert.strictEqual(ball.vy, 0);
    assert.strictEqual(ball.rotation, 0, "rotation is also cleared");
  });

  QUnit.test("reset() accepts an explicit position", (assert) => {
    const ball = new Ball({ vx: 100, vy: 50 });

    ball.reset(20, -30);

    assert.strictEqual(ball.x, 20);
    assert.strictEqual(ball.y, -30);
    assert.strictEqual(ball.vx, 0);
    assert.strictEqual(ball.vy, 0);
  });

  QUnit.test("reset() cancels an in-progress drag", (assert) => {
    const ball = new Ball({ x: 5, y: 5 });
    ball.beginDrag();
    ball.dragTo(50, 50, 100);

    ball.reset();

    assert.false(ball.dragging, "dragging is cleared");
    assert.strictEqual(ball.x, 0);
    assert.strictEqual(ball.y, 0);
  });
});
