// Returns a random()-compatible function that replays `values`, cycling once
// exhausted, so randomized behavior can be pinned down exactly.
const sequence = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

QUnit.module("RockField", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = RockField.SIZES;

  QUnit.test("starts empty", (assert) => {
    assert.deepEqual(new RockField().rocks, []);
  });

  QUnit.test("spawn() creates a rock of the requested size at the requested spot", (assert) => {
    const field = new RockField();

    const rock = field.spawn("medium", 3, -2);

    assert.strictEqual(rock.size, "medium");
    assert.strictEqual(rock.x, 3);
    assert.strictEqual(rock.y, -2);
    assert.strictEqual(rock.radius, SIZES.medium.radius);
    assert.strictEqual(field.rocks.length, 1);
  });

  QUnit.test("spawn() uses the velocity it is given", (assert) => {
    const rock = new RockField().spawn("large", 0, 0, { vx: 2, vy: -3 });

    assert.strictEqual(rock.vx, 2);
    assert.strictEqual(rock.vy, -3);
  });

  QUnit.test("spawn() without a velocity picks a speed within the size's range", (assert) => {
    const field = new RockField();

    for (const size of Object.keys(SIZES)) {
      for (let i = 0; i < 50; i++) {
        const rock = field.spawn(size, 0, 0);
        const speed = Math.hypot(rock.vx, rock.vy);
        assert.true(
          speed >= SIZES[size].minSpeed - 1e-9 && speed <= SIZES[size].maxSpeed + 1e-9,
          `${size} rock speed ${speed} is in range`
        );
      }
    }
  });

  QUnit.test("spawn() gives each rock a lumpy outline that stays inside its collision circle", (assert) => {
    const rock = new RockField({ vertices: 12 }).spawn("large", 0, 0);

    assert.strictEqual(rock.shape.length, 12);
    assert.true(rock.shape.every((f) => f >= 0.8 && f <= 1), "every corner is 80-100% of the radius");
  });

  QUnit.test("spin ranges from -maxSpin to +maxSpin", (assert) => {
    // With a velocity supplied and a single corner, spawn() calls random() twice:
    // once for the corner, then once for the spin.
    const negative = new RockField({ maxSpin: 2, vertices: 1, random: sequence([0.5, 0]) });
    const positive = new RockField({ maxSpin: 2, vertices: 1, random: sequence([0.5, 1]) });
    const still = new RockField({ maxSpin: 2, vertices: 1, random: sequence([0.5, 0.5]) });
    const velocity = { vx: 0, vy: 0 };

    assert.strictEqual(negative.spawn("large", 0, 0, velocity).spin, -2);
    assert.strictEqual(positive.spawn("large", 0, 0, velocity).spin, 2);
    assert.strictEqual(still.spawn("large", 0, 0, velocity).spin, 0);
  });

  QUnit.test("populate() makes the requested number of large rocks inside the screen", (assert) => {
    const field = new RockField();

    field.populate(6, BOUNDS);

    assert.strictEqual(field.rocks.length, 6);
    for (const rock of field.rocks) {
      assert.strictEqual(rock.size, "large");
      assert.true(Math.abs(rock.x) <= BOUNDS.halfWidth && Math.abs(rock.y) <= BOUNDS.halfHeight);
    }
  });

  QUnit.test("populate() keeps rocks away from the point to avoid", (assert) => {
    for (let trial = 0; trial < 30; trial++) {
      const field = new RockField();
      field.populate(5, BOUNDS, { x: 0, y: 0 }, 3);
      for (const rock of field.rocks) {
        assert.true(Math.hypot(rock.x, rock.y) >= 3, "rock is at least 3 units from the ship");
      }
    }
  });

  QUnit.test("update() drifts and spins every rock", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 0, 0, { vx: 2, vy: -1 });
    rock.spin = 1;

    field.update(0.5, BOUNDS);

    assert.strictEqual(rock.x, 1);
    assert.strictEqual(rock.y, -0.5);
    assert.strictEqual(rock.angle, 0.5);
  });

  QUnit.test("update() wraps a rock that has fully left the screen", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 0, 0, { vx: 0, vy: 0 });
    // The wrap limit is halfWidth + radius = 10 + 1.2 = 11.2.
    rock.x = 11.1;
    field.update(0, BOUNDS);
    assert.strictEqual(rock.x, 11.1, "still partly on screen, so it stays");

    rock.x = 11.3;
    field.update(0, BOUNDS);
    assert.strictEqual(rock.x, -(BOUNDS.halfWidth + SIZES.large.radius));
  });

  QUnit.test("destroy() splits a large rock into two medium ones and scores it", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 4, 2);

    const result = field.destroy(rock);

    assert.strictEqual(result.points, SIZES.large.points);
    assert.strictEqual(result.children.length, 2);
    assert.true(result.children.every((c) => c.size === "medium"));
    assert.false(field.rocks.includes(rock), "the original is gone");
    assert.strictEqual(field.rocks.length, 2);
  });

  QUnit.test("destroy() splits a medium rock into two small ones", (assert) => {
    const field = new RockField();
    const rock = field.spawn("medium", 0, 0);

    const result = field.destroy(rock);

    assert.strictEqual(result.points, SIZES.medium.points);
    assert.true(result.children.every((c) => c.size === "small"));
  });

  QUnit.test("destroy() on a small rock just removes it", (assert) => {
    const field = new RockField();
    const rock = field.spawn("small", 0, 0);

    const result = field.destroy(rock);

    assert.strictEqual(result.points, SIZES.small.points);
    assert.deepEqual(result.children, []);
    assert.strictEqual(field.rocks.length, 0);
  });

  QUnit.test("the pieces start where the rock was and fly apart", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 4, 2, { vx: 2, vy: 0 });

    const [a, b] = field.destroy(rock).children;

    assert.strictEqual(a.x, 4);
    assert.strictEqual(a.y, 2);
    assert.strictEqual(b.x, 4);
    // Each piece keeps half the parent's velocity, plus an equal kick in opposite directions.
    assert.true(Math.abs(a.vx - 1 + (b.vx - 1)) < 1e-9, "x kicks cancel out");
    assert.true(Math.abs(a.vy + b.vy) < 1e-9, "y kicks cancel out");
    assert.true(Math.hypot(a.vx - b.vx, a.vy - b.vy) > 0, "the pieces are not moving together");
  });

  QUnit.test("destroy() ignores a rock that isn't in the field", (assert) => {
    const field = new RockField();
    field.spawn("large", 0, 0);
    const stranger = new RockField().spawn("large", 0, 0);

    const result = field.destroy(stranger);

    assert.strictEqual(result.points, 0);
    assert.strictEqual(field.rocks.length, 1);
  });

  QUnit.test("clear() removes every rock", (assert) => {
    const field = new RockField();
    field.populate(3, BOUNDS);

    field.clear();

    assert.deepEqual(field.rocks, []);
  });
});

QUnit.module("RockField bullet collisions", () => {
  const fireFrom = (bullets, x, y) => {
    const ship = new Ship({ x, y });
    const bullet = bullets.fire(ship);
    bullet.x = x;
    bullet.y = y;
    return bullet;
  };

  QUnit.test("a bullet inside a rock destroys the rock and is consumed", (assert) => {
    const field = new RockField();
    const bullets = new BulletSystem({ cooldown: 0 });
    field.spawn("large", 0, 0, { vx: 0, vy: 0 });
    fireFrom(bullets, 0.5, 0);

    const hits = field.collideBullets(bullets);

    assert.strictEqual(hits.length, 1);
    assert.strictEqual(hits[0].size, "large");
    assert.strictEqual(hits[0].points, RockField.SIZES.large.points);
    assert.strictEqual(bullets.bullets.length, 0, "the bullet is used up");
    assert.strictEqual(field.rocks.length, 2, "the rock split in two");
  });

  QUnit.test("a bullet that misses leaves everything alone", (assert) => {
    const field = new RockField();
    const bullets = new BulletSystem({ cooldown: 0 });
    field.spawn("large", 0, 0, { vx: 0, vy: 0 });
    fireFrom(bullets, 8, 4);

    const hits = field.collideBullets(bullets);

    assert.deepEqual(hits, []);
    assert.strictEqual(bullets.bullets.length, 1);
    assert.strictEqual(field.rocks.length, 1);
  });

  QUnit.test("each bullet can hit a different rock in the same frame", (assert) => {
    const field = new RockField();
    const bullets = new BulletSystem({ cooldown: 0 });
    field.spawn("small", -5, 0, { vx: 0, vy: 0 });
    field.spawn("small", 5, 0, { vx: 0, vy: 0 });
    fireFrom(bullets, -5, 0);
    fireFrom(bullets, 5, 0);

    const hits = field.collideBullets(bullets);

    assert.strictEqual(hits.length, 2);
    assert.strictEqual(bullets.bullets.length, 0);
    assert.strictEqual(field.rocks.length, 0, "small rocks leave nothing behind");
  });

  QUnit.test("two bullets in one rock only destroy it once", (assert) => {
    const field = new RockField();
    const bullets = new BulletSystem({ cooldown: 0 });
    field.spawn("small", 0, 0, { vx: 0, vy: 0 });
    fireFrom(bullets, 0, 0);
    fireFrom(bullets, 0.1, 0);

    const hits = field.collideBullets(bullets);

    assert.strictEqual(hits.length, 1);
    assert.strictEqual(bullets.bullets.length, 1, "the second bullet survives, with nothing left to hit");
  });
});

QUnit.module("RockField rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeVector3 {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
    clone() {
      return new FakeVector3(this.x, this.y, this.z);
    }
  }

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    rotation = { x: 0, y: 0, z: 0 };
    color = null;
    disposed = false;

    constructor(points) {
      this.points = points;
    }
    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: { CreateLines: (name, options) => new FakeMesh(options.points) },
      Vector3: FakeVector3,
      Color3: { FromHexString: (hex) => hex },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("each rock gets a closed outline mesh", (assert) => {
    const field = new RockField({ scene: {}, vertices: 8, color: "#ff0000" });

    const rock = field.spawn("large", 1, 2);

    assert.ok(rock.mesh instanceof FakeMesh);
    assert.strictEqual(rock.mesh.points.length, 9, "8 corners plus a repeat of the first to close the loop");
    assert.strictEqual(rock.mesh.points[0].x, rock.mesh.points[8].x);
    assert.strictEqual(rock.mesh.points[0].y, rock.mesh.points[8].y);
    assert.strictEqual(rock.mesh.color, "#ff0000");
    assert.strictEqual(rock.mesh.position.x, 1);
    assert.strictEqual(rock.mesh.position.y, 2);
  });

  QUnit.test("no meshes are created when scene is omitted", (assert) => {
    assert.strictEqual(new RockField().spawn("large", 0, 0).mesh, null);
  });

  QUnit.test("update() keeps each mesh synced to position and spin", (assert) => {
    const field = new RockField({ scene: {} });
    const rock = field.spawn("large", 0, 0, { vx: 2, vy: 0 });
    rock.spin = 1;

    field.update(0.5, BOUNDS);

    assert.strictEqual(rock.mesh.position.x, 1);
    assert.strictEqual(rock.mesh.rotation.z, 0.5);
  });

  QUnit.test("destroy() disposes the rock's mesh and meshes the new pieces", (assert) => {
    const field = new RockField({ scene: {} });
    const rock = field.spawn("large", 0, 0);
    const mesh = rock.mesh;

    const { children } = field.destroy(rock);

    assert.true(mesh.disposed);
    assert.true(children.every((c) => c.mesh instanceof FakeMesh), "the pieces are drawn too");
  });

  QUnit.test("clear() disposes every mesh", (assert) => {
    const field = new RockField({ scene: {} });
    const meshes = [field.spawn("large", 0, 0).mesh, field.spawn("small", 1, 1).mesh];

    field.clear();

    assert.true(meshes.every((m) => m.disposed));
  });
});

QUnit.module("RockField findCollision", () => {
  QUnit.test("returns the rock a circle overlaps", (assert) => {
    const field = new RockField();
    const rock = field.spawn("large", 0, 0, { vx: 0, vy: 0 });

    assert.strictEqual(field.findCollision(0.5, 0, 0.1), rock);
  });

  QUnit.test("returns null when nothing overlaps", (assert) => {
    const field = new RockField();
    field.spawn("large", 0, 0, { vx: 0, vy: 0 });

    assert.strictEqual(field.findCollision(8, 4, 0.5), null);
  });

  QUnit.test("counts the circle's own radius, not just its center", (assert) => {
    const field = new RockField();
    field.spawn("large", 0, 0, { vx: 0, vy: 0 }); // radius 1.2

    assert.strictEqual(field.findCollision(2, 0, 0.1), null, "a tiny circle at distance 2 misses");
    assert.ok(field.findCollision(2, 0, 1), "a bigger circle at the same spot hits");
  });

  QUnit.test("picks a rock when several overlap", (assert) => {
    const field = new RockField();
    const a = field.spawn("large", 0, 0, { vx: 0, vy: 0 });
    const b = field.spawn("large", 0.5, 0, { vx: 0, vy: 0 });

    assert.true([a, b].includes(field.findCollision(0.25, 0, 0.1)));
  });

  QUnit.test("an empty field has nothing to hit", (assert) => {
    assert.strictEqual(new RockField().findCollision(0, 0, 5), null);
  });
});
