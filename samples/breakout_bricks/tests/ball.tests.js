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
    const ball = new Ball({ x: 90, y: 0, vx: 100, vy: 0, radius: 10, restitution: 1 });
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
    const ball = new Ball({ x: -90, y: 0, vx: -100, vy: 0, radius: 10, restitution: 1 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.x, -90, "x is clamped to -halfWidth + radius");
    assert.strictEqual(ball.vx, 100, "vx is reflected");
    assert.strictEqual(events.length, 1);
    assert.deepEqual(events[0], { x: -100, y: 0, normalX: 1, normalY: 0, speed: 100 });
  });

  QUnit.test("bounces off the bottom wall and reflects vy", (assert) => {
    const ball = new Ball({ x: 0, y: 90, vx: 0, vy: 100, radius: 10, restitution: 1 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.y, 90, "y is clamped to halfHeight - radius");
    assert.strictEqual(ball.vy, -100, "vy is reflected");
    assert.strictEqual(events.length, 1);
    assert.deepEqual(events[0], { x: 0, y: 100, normalX: 0, normalY: -1, speed: 100 });
  });

  QUnit.test("bounces off the top wall and reflects vy", (assert) => {
    const ball = new Ball({ x: 0, y: -90, vx: 0, vy: -100, radius: 10, restitution: 1 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.y, -90, "y is clamped to -halfHeight + radius");
    assert.strictEqual(ball.vy, 100, "vy is reflected");
    assert.strictEqual(events.length, 1);
    assert.deepEqual(events[0], { x: 0, y: -100, normalX: 0, normalY: 1, speed: 100 });
  });

  QUnit.test("hitting a corner produces two bounce events in the same frame", (assert) => {
    const ball = new Ball({ x: 90, y: 90, vx: 100, vy: 100, radius: 10, restitution: 1 });
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

QUnit.module("Ball restitution / rest threshold", () => {
  QUnit.test("defaults to restitution 0.82 and restThreshold 0.05", (assert) => {
    const ball = new Ball();

    assert.strictEqual(ball.restitution, 0.82);
    assert.strictEqual(ball.restThreshold, 0.05);
  });

  QUnit.test("accepts restitution/restThreshold overrides via constructor options", (assert) => {
    const ball = new Ball({ restitution: 0.5, restThreshold: 1 });

    assert.strictEqual(ball.restitution, 0.5);
    assert.strictEqual(ball.restThreshold, 1);
  });

  QUnit.test("bounce scales the reflected velocity by restitution", (assert) => {
    const ball = new Ball({ x: 90, y: 0, vx: 100, vy: 0, radius: 10, restitution: 0.8 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    const events = ball.update(1, bounds);

    assert.strictEqual(ball.vx, -80, "vx is reflected and scaled by restitution");
    assert.strictEqual(events[0].speed, 80, "bounce event reports the post-restitution speed");
  });

  QUnit.test("a corner hit scales both reflected axes by restitution", (assert) => {
    const ball = new Ball({ x: 90, y: 90, vx: 100, vy: 100, radius: 10, restitution: 0.5 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    ball.update(1, bounds);

    assert.strictEqual(ball.vx, -50);
    assert.strictEqual(ball.vy, -50);
  });

  QUnit.test("snaps fully to rest once post-bounce speed drops below restThreshold", (assert) => {
    const ball = new Ball({ x: 90, y: 0, vx: 1, vy: 0, radius: 10, restitution: 0.5, restThreshold: 1 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    ball.update(1, bounds);

    assert.strictEqual(ball.vx, 0, "post-bounce speed (0.5) was under restThreshold (1), so vx snaps to 0");
    assert.strictEqual(ball.vy, 0);
  });

  QUnit.test("does not snap to rest when post-bounce speed is at or above restThreshold", (assert) => {
    const ball = new Ball({ x: 90, y: 0, vx: 10, vy: 0, radius: 10, restitution: 0.5, restThreshold: 1 });
    const bounds = { halfWidth: 100, halfHeight: 100 };

    ball.update(1, bounds);

    assert.strictEqual(ball.vx, -5, "post-bounce speed (5) is above restThreshold, so it is left alone");
  });

  QUnit.test("does not snap to rest on a frame with no bounce, even if already slow", (assert) => {
    const ball = new Ball({ x: 0, y: 0, vx: 0.01, vy: 0, radius: 10, restThreshold: 1 });
    const bounds = { halfWidth: 1000, halfHeight: 1000 };

    ball.update(1, bounds);

    assert.strictEqual(ball.vx, 0.01, "no bounce occurred, so the rest snap never runs");
  });
});

QUnit.module("Ball paddle bounce", () => {
  QUnit.test("does nothing when the ball is far from the paddle", (assert) => {
    const ball = new Ball({ x: 0, y: -5, vx: 0, vy: 10, radius: 0.6 });
    const paddle = { x: 0, y: 4, halfWidth: 1.2, halfHeight: 0.18 };

    const event = ball.bounceOffPaddle(paddle);

    assert.strictEqual(event, null, "no collision reported");
    assert.strictEqual(ball.vy, 10, "velocity is untouched");
  });

  QUnit.test("does nothing when overlapping but moving away from the paddle (vy <= 0)", (assert) => {
    const ball = new Ball({ x: 0, y: 3.5, vx: 0, vy: -10, radius: 0.6 });
    const paddle = { x: 0, y: 4, halfWidth: 1.2, halfHeight: 0.18 };

    const event = ball.bounceOffPaddle(paddle);

    assert.strictEqual(event, null, "no collision reported while retreating, even though overlapping");
    assert.strictEqual(ball.vy, -10);
  });

  QUnit.test("reflects vy and returns a bounce event on a centered hit", (assert) => {
    const ball = new Ball({ x: 0, y: 3.5, vx: 0, vy: 10, radius: 0.6 });
    const paddle = { x: 0, y: 4, halfWidth: 1.2, halfHeight: 0.18 };

    const event = ball.bounceOffPaddle(paddle);

    assert.ok(event, "reports a bounce event");
    assert.strictEqual(event.normalY, -1);
    assert.ok(ball.vy < 0, "vy now points back up");
    assert.strictEqual(Math.round(ball.vx), 0, "a dead-center hit launches straight up");
  });

  QUnit.test("preserves total speed through the bounce", (assert) => {
    const ball = new Ball({ x: 0.5, y: 3.5, vx: 1, vy: 10, radius: 0.6 });
    const paddle = { x: 0, y: 4, halfWidth: 1.2, halfHeight: 0.18 };
    const speedBefore = Math.hypot(ball.vx, ball.vy);

    ball.bounceOffPaddle(paddle);

    const speedAfter = Math.hypot(ball.vx, ball.vy);
    assert.ok(Math.abs(speedAfter - speedBefore) < 1e-9, "speed is unchanged by the deflection");
  });

  QUnit.test("hitting off-center steers vx toward that side", (assert) => {
    const rightHit = new Ball({ x: 1, y: 3.5, vx: 0, vy: 10, radius: 0.6 });
    const leftHit = new Ball({ x: -1, y: 3.5, vx: 0, vy: 10, radius: 0.6 });
    const paddle = { x: 0, y: 4, halfWidth: 1.2, halfHeight: 0.18 };

    rightHit.bounceOffPaddle(paddle);
    leftHit.bounceOffPaddle(paddle);

    assert.ok(rightHit.vx > 0, "hitting right of center steers the ball to the right");
    assert.ok(leftHit.vx < 0, "hitting left of center steers the ball to the left");
  });

  QUnit.test("no collision when the ball is outside the paddle's horizontal span", (assert) => {
    const ball = new Ball({ x: 5, y: 3.5, vx: 0, vy: 10, radius: 0.6 });
    const paddle = { x: 0, y: 4, halfWidth: 1.2, halfHeight: 0.18 };

    const event = ball.bounceOffPaddle(paddle);

    assert.strictEqual(event, null);
  });
});

QUnit.module("Ball brick bounce", () => {
  const brick = { x: 0, y: 0, halfWidth: 1, halfHeight: 0.5 };

  QUnit.test("does nothing when the ball is far from the brick", (assert) => {
    const ball = new Ball({ x: 10, y: 10, vx: -5, vy: -5, radius: 0.4 });

    const event = ball.bounceOffBrick(brick);

    assert.strictEqual(event, null);
    assert.strictEqual(ball.vx, -5, "velocity is untouched");
    assert.strictEqual(ball.vy, -5);
  });

  QUnit.test("a hit on the right side reflects vx outward and nudges x clear", (assert) => {
    const ball = new Ball({ x: 1.2, y: 0, vx: -5, vy: 3, radius: 0.4 });

    const event = ball.bounceOffBrick(brick);

    assert.strictEqual(Math.round(ball.x * 100) / 100, 1.4, "x is nudged out by the overlap (0.2)");
    assert.strictEqual(ball.vx, 5, "vx is reflected outward regardless of its incoming sign");
    assert.strictEqual(ball.vy, 3, "vy (the non-colliding axis) is untouched");
    assert.deepEqual({ normalX: event.normalX, normalY: event.normalY }, { normalX: 1, normalY: 0 });
  });

  QUnit.test("a hit on the left side reflects vx outward the other way", (assert) => {
    const ball = new Ball({ x: -1.2, y: 0, vx: 5, vy: 0, radius: 0.4 });

    const event = ball.bounceOffBrick(brick);

    assert.strictEqual(ball.vx, -5);
    assert.strictEqual(event.normalX, -1);
  });

  QUnit.test("a hit on the bottom reflects vy outward and nudges y clear", (assert) => {
    const ball = new Ball({ x: 0, y: 0.7, vx: 2, vy: -6, radius: 0.4 });

    const event = ball.bounceOffBrick(brick);

    assert.strictEqual(Math.round(ball.y * 100) / 100, 0.9, "y is nudged out by the overlap (0.2)");
    assert.strictEqual(ball.vy, 6, "vy is reflected outward regardless of its incoming sign");
    assert.strictEqual(ball.vx, 2, "vx (the non-colliding axis) is untouched");
    assert.deepEqual({ normalX: event.normalX, normalY: event.normalY }, { normalX: 0, normalY: 1 });
  });

  QUnit.test("a hit on the top reflects vy outward the other way", (assert) => {
    const ball = new Ball({ x: 0, y: -0.7, vx: 0, vy: 6, radius: 0.4 });

    const event = ball.bounceOffBrick(brick);

    assert.strictEqual(ball.vy, -6);
    assert.strictEqual(event.normalY, -1);
  });

  QUnit.test("does not mutate the brick object passed in", (assert) => {
    const ball = new Ball({ x: 1.2, y: 0, vx: -5, vy: 0, radius: 0.4 });
    const brickCopy = { ...brick };

    ball.bounceOffBrick(brick);

    assert.deepEqual(brick, brickCopy, "collision resolution never writes to the brick");
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

QUnit.module("Ball reset", () => {
  QUnit.test("reset() defaults to the origin with zero velocity", (assert) => {
    const ball = new Ball({ x: 90, y: -40, vx: 300, vy: -150, radius: 10 });
    ball.rotation = 4;

    ball.reset();

    assert.strictEqual(ball.x, 0);
    assert.strictEqual(ball.y, 0);
    assert.strictEqual(ball.vx, 0);
    assert.strictEqual(ball.vy, 0);
    assert.strictEqual(ball.rotation, 0, "rotation is also cleared");
  });

  QUnit.test("reset() accepts an explicit position and relaunch velocity", (assert) => {
    const ball = new Ball({ vx: 100, vy: 50 });

    ball.reset(20, -30, 5, 6);

    assert.strictEqual(ball.x, 20);
    assert.strictEqual(ball.y, -30);
    assert.strictEqual(ball.vx, 5);
    assert.strictEqual(ball.vy, 6);
  });
});
