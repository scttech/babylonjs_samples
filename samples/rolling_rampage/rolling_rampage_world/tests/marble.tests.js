QUnit.module("hasFallen", () => {
  QUnit.test("a marble on the course hasn't fallen", (assert) => {
    assert.false(hasFallen(0));
    assert.false(hasFallen(MARBLE_START.y));
  });

  QUnit.test("one below the limit has", (assert) => {
    assert.true(hasFallen(FALL_LIMIT - 1));
    assert.false(hasFallen(FALL_LIMIT));
  });

  QUnit.test("the limit is below the lowest slab, or a marble would be put back while still rolling", (assert) => {
    const lowest = Math.min(...COURSE.flatMap((slab) => [slab.from[1], slab.to[1]]));

    assert.true(FALL_LIMIT < lowest - 5);
  });

  QUnit.test("takes the limit as a second argument", (assert) => {
    assert.true(hasFallen(-3, -2));
    assert.false(hasFallen(-3, -4));
  });
});

QUnit.module("MARBLE_DAMPING", () => {
  QUnit.test("slows the marble a little, and not so much that it would crawl", (assert) => {
    assert.true(MARBLE_DAMPING.linear > 0 && MARBLE_DAMPING.linear < 1);
    assert.true(MARBLE_DAMPING.angular > 0 && MARBLE_DAMPING.angular < 1);
  });
});

QUnit.module("the start", () => {
  QUnit.test("is above the top of the course, over a slab, so the marble is dropped onto something", (assert) => {
    const over = COURSE.filter((slab) => MARBLE_START.x >= slab.from[0] && MARBLE_START.x <= slab.to[0]);

    assert.true(over.length > 0, "there is a slab under the start");
    const slab = over[0];
    const t = (MARBLE_START.x - slab.from[0]) / (slab.to[0] - slab.from[0]);
    const top = slab.from[1] + t * (slab.to[1] - slab.from[1]);
    assert.true(MARBLE_START.y > top + MARBLE_RADIUS, "and the marble starts above it");
  });
});

// These put a marble on the real course, with real physics, in a NullEngine that draws
// nothing, and let time go by with stepPhysics.
QUnit.module("a marble on the course", (hooks) => {
  let engine;
  let scene;
  let marble;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene);
    marble = new Marble(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // Puts the marble somewhere, still.
  const placeAt = (x, y, z) => {
    marble.start = { x, y, z };
    marble.reset();
  };

  QUnit.test("starts where it should, and doesn't move until the physics does", (assert) => {
    assert.deepEqual({ x: marble.position.x, y: marble.position.y, z: marble.position.z }, MARBLE_START);
    assert.strictEqual(marble.speed, 0);
  });

  QUnit.test("is a ball of the radius it says", (assert) => {
    const size = marble.mesh.getBoundingInfo().boundingBox.extendSize;

    assert.true(Math.abs(size.x - MARBLE_RADIUS) < 1e-6);
  });

  QUnit.test("falls when it is dropped", (assert) => {
    stepPhysics(scene, 0.2);

    assert.true(marble.position.y < MARBLE_START.y - 0.2, `${marble.position.y}`);
  });

  QUnit.test("comes to rest on a flat floor with its middle one radius above the top", (assert) => {
    placeAt(-10, 5, 0); // over the start deck, whose top is at 4

    stepPhysics(scene, 3);

    assert.true(Math.abs(marble.position.y - (4 + MARBLE_RADIUS)) < 0.03, `${marble.position.y}`);
    assert.true(marble.speed < 0.05, `still moving at ${marble.speed}`);
  });

  QUnit.test("sits still on a flat floor: it stays where it landed", (assert) => {
    placeAt(-10, 5, 0);
    stepPhysics(scene, 3);
    const landed = marble.position.x;

    stepPhysics(scene, 2);

    assert.true(Math.abs(marble.position.x - landed) < 0.05);
  });

  QUnit.test("bounces a little, but not up to where it fell from", (assert) => {
    placeAt(-10, 12, 0);
    let highestAfterLanding = -Infinity;
    let landed = false;

    for (let i = 0; i < 240; i++) {
      stepPhysics(scene, 1 / 60);
      const y = marble.position.y;
      if (!landed && y < 4 + MARBLE_RADIUS + 0.05) landed = true;
      if (landed && marble.speed > 0.5) highestAfterLanding = Math.max(highestAfterLanding, y);
    }

    assert.true(landed, "it reached the floor");
    assert.true(highestAfterLanding < 12 - 2, `bounced up to ${highestAfterLanding}`);
  });

  QUnit.test("rolls down a ramp, toward the low end, and gets faster", (assert) => {
    placeAt(-4, 4.1, 0); // on the ramp, near the top
    const x0 = marble.position.x;

    stepPhysics(scene, 0.5);
    const slow = marble.speed;
    stepPhysics(scene, 0.5);
    const fast = marble.speed;

    assert.true(marble.position.x > x0 + 1, `rolled to ${marble.position.x}`);
    assert.true(fast > slow, `${slow} then ${fast}`);
  });

  QUnit.test("keeps rolling along the course, not off sideways", (assert) => {
    placeAt(-4, 4.1, 0);

    stepPhysics(scene, 2);

    assert.true(Math.abs(marble.position.z) < 0.05, `drifted to z = ${marble.position.z}`);
  });

  QUnit.test("rolls on to the lower deck, and slows there, because of the damping", (assert) => {
    placeAt(-4, 4.1, 0);

    for (let t = 0; marble.position.x < 7 && t < 6; t += 0.1) stepPhysics(scene, 0.1);
    assert.true(marble.position.x >= 7, `reached x = ${marble.position.x}`);
    const onDeck = marble.speed;
    stepPhysics(scene, 0.5);

    assert.true(marble.position.x < 14, "and it is still on the lower deck");
    assert.true(marble.speed < onDeck, `${onDeck} then ${marble.speed}`);
  });

  QUnit.test("rolls off the edge of a slab, and falls past the limit", (assert) => {
    placeAt(-10, 4.6, 5); // the start deck is 8 deep, so this is just over its edge

    stepPhysics(scene, 2);

    assert.true(marble.position.y < 4, `${marble.position.y}`);
    assert.true(marble.position.y < MARBLE_START.y - 4);
    stepPhysics(scene, 2);
    assert.true(hasFallen(marble.position.y), `${marble.position.y}`);
  });

  QUnit.test("reset() puts it back at the start, with no speed and no spin", (assert) => {
    stepPhysics(scene, 2);
    assert.true(marble.speed > 0, "it was moving");

    marble.reset();

    assert.deepEqual({ x: marble.position.x, y: marble.position.y, z: marble.position.z }, MARBLE_START);
    assert.strictEqual(marble.speed, 0);
    assert.strictEqual(marble.aggregate.body.getAngularVelocity().length(), 0);
  });

  QUnit.test("after a reset it falls the same way as the first time", (assert) => {
    stepPhysics(scene, 1);
    const first = { x: marble.position.x, y: marble.position.y };

    marble.reset();
    stepPhysics(scene, 1);

    assert.true(Math.abs(marble.position.x - first.x) < 0.01, `${marble.position.x} against ${first.x}`);
    assert.true(Math.abs(marble.position.y - first.y) < 0.01, `${marble.position.y} against ${first.y}`);
  });

  QUnit.test("a marble that has fallen can be reset and rolls again", (assert) => {
    placeAt(-10, 4.6, 5);
    stepPhysics(scene, 4);
    assert.true(hasFallen(marble.position.y));

    marble.start = MARBLE_START;
    marble.reset();
    stepPhysics(scene, 2);

    assert.false(hasFallen(marble.position.y));
    assert.true(marble.position.x > MARBLE_START.x, "and it is rolling down the ramp");
  });
});
