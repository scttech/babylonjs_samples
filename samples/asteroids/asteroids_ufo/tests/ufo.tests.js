// Returns a random()-compatible function that replays `values`, cycling once
// exhausted, so randomized behavior can be pinned down exactly.
const script = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

// A Ufo's constructor uses one random() call to pick how long until the first
// UFO appears. `scripted` feeds it a throwaway value first, so the values you
// list are the ones spawn() and update() see.
const scripted = (values) => script([0.5, ...values]);

QUnit.module("Ufo spawning", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = Ufo.SIZES;

  QUnit.test("starts with no UFO on screen", (assert) => {
    const ufo = new Ufo();

    assert.false(ufo.active);
    assert.strictEqual(ufo.size, null);
  });

  QUnit.test("the first UFO is a while away: between the min and max delay", (assert) => {
    for (let i = 0; i < 30; i++) {
      const ufo = new Ufo({ minSpawnDelay: 12, maxSpawnDelay: 25 });
      assert.true(ufo.spawnTimer >= 12 && ufo.spawnTimer <= 25);
    }
  });

  QUnit.test("update() counts down and spawns a UFO when the timer runs out", (assert) => {
    const ufo = new Ufo({ minSpawnDelay: 5, maxSpawnDelay: 5 });

    ufo.update(4, BOUNDS);
    assert.false(ufo.active, "4s into a 5s wait");

    ufo.update(1.1, BOUNDS);
    assert.true(ufo.active, "5.1s: here it comes");
  });

  QUnit.test("pickSize() is always large at a score of zero", (assert) => {
    const ufo = new Ufo({ random: script([0.0]) });

    assert.strictEqual(ufo.pickSize(0), "large");
  });

  QUnit.test("pickSize() sends the small one more often as the score climbs", (assert) => {
    const mostlyLow = new Ufo({ random: script([0.5]) });
    assert.strictEqual(mostlyLow.pickSize(5000), "large", "a 25% chance, and 0.5 isn't below it");
    assert.strictEqual(mostlyLow.pickSize(15000), "small", "a 75% chance, and 0.5 is below it");
  });

  QUnit.test("the chance of a small UFO tops out at three in four", (assert) => {
    const ufo = new Ufo({ random: script([0.8]) });

    assert.strictEqual(ufo.pickSize(1000000), "large", "0.8 is above 0.75, even at an enormous score");
  });

  QUnit.test("spawn() sets up a UFO of the chosen size just off the screen edge it enters from", (assert) => {
    const ufo = new Ufo({ random: scripted([0.9, 0.5]) }); // 0.9 -> flies left, 0.5 -> middle height

    ufo.spawn("small", BOUNDS);

    assert.true(ufo.active);
    assert.strictEqual(ufo.size, "small");
    assert.strictEqual(ufo.radius, SIZES.small.radius);
    assert.strictEqual(ufo.direction, -1, "flying left");
    assert.strictEqual(ufo.x, BOUNDS.halfWidth + SIZES.small.radius, "entering from the right");
    assert.strictEqual(ufo.vx, -SIZES.small.speed);
  });

  QUnit.test("a UFO that enters from the left flies right", (assert) => {
    const ufo = new Ufo({ random: scripted([0.1, 0.5]) });

    ufo.spawn("large", BOUNDS);

    assert.strictEqual(ufo.direction, 1);
    assert.strictEqual(ufo.x, -(BOUNDS.halfWidth + SIZES.large.radius));
    assert.strictEqual(ufo.vx, SIZES.large.speed);
  });

  QUnit.test("it appears at a height that stays on screen", (assert) => {
    for (let i = 0; i < 100; i++) {
      const ufo = new Ufo();
      ufo.spawn("large", BOUNDS);
      assert.true(Math.abs(ufo.y) <= BOUNDS.halfHeight * 0.8 + 1e-9);
    }
  });
});

QUnit.module("Ufo flying", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = Ufo.SIZES;

  // A UFO that enters from the left at the vertical middle, with nothing random
  // left to chance, and doesn't shoot unless given a target.
  const flyingRight = (size = "large") => {
    const ufo = new Ufo({ random: scripted([0.1, 0.5, 0.5, 0.5, 0.5]) });
    ufo.spawn(size, BOUNDS);
    ufo.weaveTimer = 100; // no weaving unless a test wants it
    return ufo;
  };

  QUnit.test("it flies across the screen at its speed", (assert) => {
    const ufo = flyingRight();
    const startX = ufo.x;

    ufo.update(1, BOUNDS);

    assert.true(Math.abs(ufo.x - (startX + SIZES.large.speed)) < 1e-9);
  });

  QUnit.test("it leaves once it's fully past the far side, rather than wrapping", (assert) => {
    const ufo = flyingRight();
    ufo.x = BOUNDS.halfWidth + SIZES.large.radius - 0.01;

    ufo.update(0.1, BOUNDS);

    assert.false(ufo.active);
  });

  QUnit.test("it doesn't leave while it is still crossing", (assert) => {
    const ufo = flyingRight();

    ufo.update(0.1, BOUNDS);

    assert.true(ufo.active);
  });

  QUnit.test("once gone, the wait for the next UFO starts again", (assert) => {
    const ufo = new Ufo({ minSpawnDelay: 7, maxSpawnDelay: 7, random: scripted([0.1, 0.5]) });
    ufo.spawn("large", BOUNDS);
    ufo.weaveTimer = 100;
    ufo.x = BOUNDS.halfWidth + SIZES.large.radius;

    ufo.update(0.1, BOUNDS);

    assert.false(ufo.active);
    assert.strictEqual(ufo.spawnTimer, 7);
  });

  QUnit.test("a left-flying UFO leaves through the left side", (assert) => {
    const ufo = new Ufo({ random: scripted([0.9, 0.5]) });
    ufo.spawn("large", BOUNDS);
    ufo.weaveTimer = 100;
    ufo.x = -(BOUNDS.halfWidth + SIZES.large.radius);

    ufo.update(0.1, BOUNDS);

    assert.false(ufo.active);
  });

  QUnit.test("it weaves: after a while it starts drifting up or down", (assert) => {
    // After spawning (two calls), the weave timer asks for a time, then the
    // first weave picks a direction: 0.99 -> index 2 -> +1 (up).
    const ufo = new Ufo({ random: scripted([0.1, 0.5, 0.0, 0.99, 0.5]) });
    ufo.spawn("large", BOUNDS); // weaveTimer = 1 + 0.0 * 1.5 = 1

    ufo.update(1.1, BOUNDS);

    assert.true(Math.abs(ufo.vy - SIZES.large.speed * 0.6) < 1e-9, "drifting up at 60% of its speed");
  });

  QUnit.test("its height wraps around the top and bottom of the screen", (assert) => {
    const ufo = flyingRight();
    ufo.vy = 100;
    ufo.y = 0;

    ufo.update(1, BOUNDS);

    assert.true(Math.abs(ufo.y) <= BOUNDS.halfHeight + SIZES.large.radius, "still within the wrap limits");
  });
});

QUnit.module("Ufo shooting", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = Ufo.SIZES;
  const TARGET = { x: 0, y: 0, vx: 0, vy: 0 };

  // `randoms` are, in order: which way it flies, how high, the weave timer, and
  // finally the aiming error of its first shot.
  const ufoAt = (size, x, y, randoms) => {
    const ufo = new Ufo({ random: scripted(randoms) });
    ufo.spawn(size, BOUNDS);
    ufo.weaveTimer = 100;
    ufo.x = x;
    ufo.y = y;
    ufo.vx = 0; // hold still so the aim is easy to reason about
    return ufo;
  };

  QUnit.test("it doesn't shoot before its first interval is up", (assert) => {
    const ufo = ufoAt("large", 5, 0, [0.1, 0.5, 0.5, 0.5]);

    assert.strictEqual(ufo.update(0.5, BOUNDS, TARGET), null);
  });

  QUnit.test("it shoots when the interval is up, then waits for the next one", (assert) => {
    const ufo = ufoAt("large", 5, 0, [0.1, 0.5, 0.5, 0.5]);

    const first = ufo.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);
    assert.ok(first, "fired");

    assert.strictEqual(ufo.update(0.5, BOUNDS, TARGET), null, "has to wait again");
    assert.ok(ufo.update(SIZES.large.fireInterval, BOUNDS, TARGET), "fires again after another interval");
  });

  QUnit.test("it never shoots when there's nothing to shoot at", (assert) => {
    const ufo = ufoAt("large", 5, 0, [0.1, 0.5, 0.5, 0.5]);

    assert.strictEqual(ufo.update(10, BOUNDS, null), null);
  });

  QUnit.test("the shot starts at the UFO", (assert) => {
    const ufo = ufoAt("large", 5, 2, [0.1, 0.5, 0.5, 0.5]);

    const shot = ufo.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);

    assert.strictEqual(shot.x, 5);
    assert.strictEqual(shot.y, 2);
  });

  QUnit.test("the large UFO aims straight at the target when its error is zero", (assert) => {
    // random() = 0.5 makes the aiming error exactly zero.
    const ufo = ufoAt("large", 6, 0, [0.1, 0.5, 0.5, 0.5]);

    const shot = ufo.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);

    assert.true(Math.abs(shot.dirX - -1) < 1e-9, "target is straight to the left");
    assert.true(Math.abs(shot.dirY) < 1e-9);
  });

  QUnit.test("the shot's direction is always a unit vector", (assert) => {
    const ufo = ufoAt("large", 6, 3, [0.1, 0.5, 0.5, 0.2]);

    const shot = ufo.update(SIZES.large.fireInterval + 0.01, BOUNDS, { x: -2, y: 1, vx: 1, vy: 1 });

    assert.true(Math.abs(Math.hypot(shot.dirX, shot.dirY) - 1) < 1e-9);
  });

  QUnit.test("the large UFO is sloppy: its error can be up to its spread either way", (assert) => {
    const wideLeft = ufoAt("large", 6, 0, [0.1, 0.5, 0.5, 0.0]); // error = -spread
    const shotA = wideLeft.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);
    const wideRight = ufoAt("large", 6, 0, [0.1, 0.5, 0.5, 1.0]); // error = +spread
    const shotB = wideRight.update(SIZES.large.fireInterval + 0.01, BOUNDS, TARGET);

    // Straight at the target would be (-1, 0). An error of `spread` turns the shot
    // by that angle, so it picks up a sideways part of sin(spread), to either side.
    const sideways = Math.sin(SIZES.large.spread);
    assert.true(Math.abs(Math.abs(shotA.dirY) - sideways) < 1e-9);
    assert.true(Math.abs(Math.abs(shotB.dirY) - sideways) < 1e-9);
    assert.notStrictEqual(Math.sign(shotA.dirY), Math.sign(shotB.dirY), "the two errors are on opposite sides");
  });

  QUnit.test("the small UFO leads a moving target; the large one doesn't", (assert) => {
    // The target is 6 to the left and moving straight down at 3. Aiming where it
    // IS points straight left; leading it points down-left.
    const moving = { x: 0, y: 0, vx: 0, vy: -3 };
    const small = ufoAt("small", 6, 0, [0.1, 0.5, 0.5, 0.5]);
    const large = ufoAt("large", 6, 0, [0.1, 0.5, 0.5, 0.5]);

    const smallShot = small.update(SIZES.small.fireInterval + 0.01, BOUNDS, moving);
    const largeShot = large.update(SIZES.large.fireInterval + 0.01, BOUNDS, moving);

    assert.true(smallShot.dirY < -0.05, "the small UFO aims below the target's current position");
    assert.true(Math.abs(largeShot.dirY) < 1e-9, "the large UFO aims straight at it");
  });

  QUnit.test("the small UFO is much more accurate than the large one", (assert) => {
    assert.true(SIZES.small.spread < SIZES.large.spread / 3);
  });

  QUnit.test("the small UFO is worth more, and faster, than the large one", (assert) => {
    assert.true(SIZES.small.points > SIZES.large.points);
    assert.true(SIZES.small.speed > SIZES.large.speed);
  });
});

QUnit.module("Ufo destroy and reset", () => {
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };
  const SIZES = Ufo.SIZES;

  QUnit.test("destroy() removes the UFO and returns its points", (assert) => {
    const ufo = new Ufo();
    ufo.spawn("small", BOUNDS);

    assert.strictEqual(ufo.destroy(), SIZES.small.points);
    assert.false(ufo.active);
  });

  QUnit.test("the large UFO is worth its own points", (assert) => {
    const ufo = new Ufo();
    ufo.spawn("large", BOUNDS);

    assert.strictEqual(ufo.destroy(), SIZES.large.points);
  });

  QUnit.test("destroying a UFO that isn't there is worth nothing", (assert) => {
    assert.strictEqual(new Ufo().destroy(), 0);
  });

  QUnit.test("destroying starts the wait for the next UFO", (assert) => {
    const ufo = new Ufo({ minSpawnDelay: 9, maxSpawnDelay: 9 });
    ufo.spawn("large", BOUNDS);
    ufo.spawnTimer = 0;

    ufo.destroy();

    assert.strictEqual(ufo.spawnTimer, 9);
  });

  QUnit.test("reset() removes the UFO without scoring and starts the wait over", (assert) => {
    const ufo = new Ufo({ minSpawnDelay: 9, maxSpawnDelay: 9 });
    ufo.spawn("large", BOUNDS);

    ufo.reset();

    assert.false(ufo.active);
    assert.strictEqual(ufo.spawnTimer, 9);
  });
});

QUnit.module("Ufo rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  const BOUNDS = { halfWidth: 10, halfHeight: 5 };

  class FakeVector3 {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
  }

  class FakeMesh {
    position = { x: 0, y: 0, z: 0 };
    color = null;
    disposed = false;

    constructor(lines) {
      this.lines = lines;
    }
    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      MeshBuilder: { CreateLineSystem: (name, options) => new FakeMesh(options.lines) },
      Vector3: FakeVector3,
      Color3: { FromHexString: (hex) => hex },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("spawning draws the saucer as two separate strokes", (assert) => {
    const ufo = new Ufo({ scene: {}, color: "#ff0000" });

    ufo.spawn("large", BOUNDS);

    assert.ok(ufo.mesh instanceof FakeMesh);
    assert.strictEqual(ufo.mesh.lines.length, 2, "hull and dome");
    assert.strictEqual(ufo.mesh.color, "#ff0000");
  });

  QUnit.test("the saucer is scaled to the UFO's size", (assert) => {
    const large = new Ufo({ scene: {} });
    large.spawn("large", BOUNDS);
    const small = new Ufo({ scene: {} });
    small.spawn("small", BOUNDS);

    const width = (ufo) => Math.max(...ufo.mesh.lines[0].map((p) => p.x)) - Math.min(...ufo.mesh.lines[0].map((p) => p.x));
    assert.true(Math.abs(width(large) - 2 * Ufo.SIZES.large.radius) < 1e-9);
    assert.true(Math.abs(width(small) - 2 * Ufo.SIZES.small.radius) < 1e-9);
  });

  QUnit.test("no mesh is created when scene is omitted", (assert) => {
    const ufo = new Ufo();

    ufo.spawn("large", BOUNDS);

    assert.strictEqual(ufo.mesh, null);
  });

  QUnit.test("update() keeps the mesh at the UFO's position", (assert) => {
    const ufo = new Ufo({ scene: {}, random: scripted([0.1, 0.5, 0.5, 0.5]) });
    ufo.spawn("large", BOUNDS);
    ufo.weaveTimer = 100;

    ufo.update(1, BOUNDS);

    assert.strictEqual(ufo.mesh.position.x, ufo.x);
    assert.strictEqual(ufo.mesh.position.y, ufo.y);
  });

  QUnit.test("destroy() disposes the mesh", (assert) => {
    const ufo = new Ufo({ scene: {} });
    ufo.spawn("large", BOUNDS);
    const mesh = ufo.mesh;

    ufo.destroy();

    assert.true(mesh.disposed);
    assert.strictEqual(ufo.mesh, null);
  });

  QUnit.test("leaving the screen disposes the mesh too", (assert) => {
    const ufo = new Ufo({ scene: {}, random: scripted([0.1, 0.5, 0.5, 0.5]) });
    ufo.spawn("large", BOUNDS);
    ufo.weaveTimer = 100;
    const mesh = ufo.mesh;
    ufo.x = BOUNDS.halfWidth + Ufo.SIZES.large.radius;

    ufo.update(0.1, BOUNDS);

    assert.true(mesh.disposed);
  });
});

