QUnit.module("cloudPlan", () => {
  const plan = (seed = CLOUDS.seed) => cloudPlan(seededRandom(seed));
  const within = (value, range) => value >= range[0] && value <= range[1];

  QUnit.test("makes the number of clouds the table says", (assert) => {
    assert.strictEqual(plan().length, CLOUDS.count);
  });

  QUnit.test("every cloud is inside the ranges in the table", (assert) => {
    for (const cloud of plan()) {
      assert.true(Math.abs(cloud.x) <= CLOUDS.reachX);
      assert.true(Math.abs(cloud.z) <= CLOUDS.reachZ);
      assert.true(within(-cloud.y, CLOUDS.below));
      assert.true(within(cloud.width, CLOUDS.width));
      assert.true(within(cloud.speed, CLOUDS.speed));
      assert.true(within(cloud.opacity, CLOUDS.opacity));
    }
  });

  QUnit.test("they are all under the board, so none gets in the way of a tower", (assert) => {
    assert.true(plan().every((cloud) => cloud.y < 0));
  });

  QUnit.test("the same seed is the same sky", (assert) => {
    assert.deepEqual(plan(4), plan(4));
    assert.notDeepEqual(plan(4), plan(5));
  });

  QUnit.test("they are not all the same", (assert) => {
    assert.true(new Set(plan().map((c) => c.width)).size > 1);
  });
});

QUnit.module("driftCloud", () => {
  const cloud = { x: 0, y: -5, z: 2, width: 10, speed: 0.5, opacity: 0.8 };

  QUnit.test("goes to the right, at its speed", (assert) => {
    assert.strictEqual(driftCloud(cloud, 4).x, 2);
  });

  QUnit.test("changes nothing but where it is", (assert) => {
    assert.deepEqual({ ...driftCloud(cloud, 4), x: 0 }, cloud);
  });

  QUnit.test("does not change the cloud it is given", (assert) => {
    driftCloud(cloud, 4);

    assert.strictEqual(cloud.x, 0);
  });

  QUnit.test("a cloud that has gone right out of the sky comes in again from the left", (assert) => {
    const edge = CLOUDS.reachX + cloud.width / 2;
    const moved = driftCloud({ ...cloud, x: edge - 0.1 }, 1);

    assert.true(moved.x < -CLOUDS.reachX, `${moved.x}`);
  });

  QUnit.test("and none of it is showing when it does", (assert) => {
    const edge = CLOUDS.reachX + cloud.width / 2;
    const moved = driftCloud({ ...cloud, x: edge - 0.1 }, 1);

    assert.true(moved.x + cloud.width / 2 <= -CLOUDS.reachX);
  });

  QUnit.test("a long time later, they are all still in the sky", (assert) => {
    let clouds = cloudPlan(seededRandom(CLOUDS.seed));
    for (let step = 0; step < 6000; step++) clouds = clouds.map((c) => driftCloud(c, 0.1));

    assert.true(clouds.every((c) => Math.abs(c.x) <= CLOUDS.reachX + c.width / 2));
  });
});

QUnit.module("buildClouds", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("makes a plane for every cloud, that always faces the camera", (assert) => {
    const { planes } = buildClouds(scene, seededRandom(CLOUDS.seed));

    assert.strictEqual(planes.length, CLOUDS.count);
    assert.true(planes.every((p) => p.billboardMode === BABYLON.Mesh.BILLBOARDMODE_ALL));
  });

  QUnit.test("a cloud cannot be picked, so it does not get in the way of the board", (assert) => {
    const { planes } = buildClouds(scene, seededRandom(CLOUDS.seed));

    assert.true(planes.every((p) => p.isPickable === false));
  });

  QUnit.test("they share one picture, and each has its own see-through-ness", (assert) => {
    const { planes } = buildClouds(scene, seededRandom(CLOUDS.seed));

    assert.strictEqual(new Set(planes.map((p) => p.material.diffuseTexture)).size, 1);
    assert.true(planes.every((p) => p.material.alpha >= CLOUDS.opacity[0] && p.material.alpha <= CLOUDS.opacity[1]));
  });

  QUnit.test("update moves every plane to the right, by a speed that the table keeps between two limits", (assert) => {
    const { planes, update } = buildClouds(scene, seededRandom(CLOUDS.seed));
    const before = planes.map((p) => p.position.x);
    update(1);

    planes.forEach((p, n) => {
      const moved = p.position.x - before[n];
      if (moved < 0) assert.true(p.position.x < -CLOUDS.reachX, `cloud ${n} came in again from the left`);
      else assert.true(moved >= CLOUDS.speed[0] - 1e-9 && moved <= CLOUDS.speed[1] + 1e-9, `cloud ${n} moved ${moved}`);
    });
  });

  QUnit.test("update keeps every plane at the height it began", (assert) => {
    const { planes, update } = buildClouds(scene, seededRandom(CLOUDS.seed));
    const before = planes.map((p) => [p.position.y, p.position.z]);
    update(5);

    planes.forEach((p, n) => assert.deepEqual([p.position.y, p.position.z], before[n]));
  });
});
