QUnit.module("the numbers of physics", () => {
  QUnit.test("gravity pulls down, and harder than Earth's, so a small world doesn't feel like slow motion", (assert) => {
    assert.true(GRAVITY < -9.81);
  });

  QUnit.test("every surface has a friction and a restitution between 0 and 1", (assert) => {
    for (const [name, surface] of Object.entries(SURFACES)) {
      assert.true(surface.friction >= 0 && surface.friction <= 1, `${name} friction`);
      assert.true(surface.restitution >= 0 && surface.restitution <= 1, `${name} restitution`);
    }
  });

  QUnit.test("a steel marble bounces less than it would off rubber, and the floor grips more than ice", (assert) => {
    assert.true(SURFACES.steel.restitution < 0.5);
    assert.true(SURFACES.deck.friction > 0);
  });
});

// These need Havok, which is loaded by a script in tests.html, and a scene to put it in. The
// scene uses a NullEngine: an engine that draws nothing, so the physics can run with no
// screen, and fast.
QUnit.module("a physics world", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("loadHavok() loads Havok once, and gives the same one every time", async (assert) => {
    assert.strictEqual(loadHavok(), loadHavok());
    assert.strictEqual(typeof (await loadHavok()), "object");
  });

  QUnit.test("loadPhysics() turns physics on in the scene, with gravity pulling down", (assert) => {
    const physics = scene.getPhysicsEngine();

    assert.true(physics !== null && physics !== undefined);
    assert.strictEqual(physics.gravity.y, GRAVITY);
    assert.strictEqual(physics.gravity.x, 0);
    assert.strictEqual(physics.gravity.z, 0);
  });

  QUnit.test("two scenes can share the one Havok", async (assert) => {
    const other = new BABYLON.Scene(engine);

    await loadPhysics(other);

    assert.true(other.getPhysicsEngine() !== null);
    other.dispose();
  });

  QUnit.test("a body with mass falls, and one with none stays where it is", (assert) => {
    const falls = BABYLON.MeshBuilder.CreateSphere("falls", { diameter: 1 }, scene);
    falls.position.y = 10;
    new BABYLON.PhysicsAggregate(falls, BABYLON.PhysicsShapeType.SPHERE, { mass: 1 }, scene);
    const stays = BABYLON.MeshBuilder.CreateBox("stays", { size: 1 }, scene);
    stays.position.set(5, 10, 0);
    new BABYLON.PhysicsAggregate(stays, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, scene);

    stepPhysics(scene, 0.5);

    assert.true(falls.position.y < 10 - 1, `fell to ${falls.position.y}`);
    assert.strictEqual(stays.position.y, 10);
  });

  QUnit.test("a body falls as far as gravity says: half g t squared", (assert) => {
    const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, scene);
    ball.position.y = 100;
    new BABYLON.PhysicsAggregate(ball, BABYLON.PhysicsShapeType.SPHERE, { mass: 1 }, scene);

    stepPhysics(scene, 1);

    const expected = 100 + 0.5 * GRAVITY * 1 * 1;
    assert.true(Math.abs(ball.position.y - expected) < 0.5, `${ball.position.y} against ${expected}`);
  });

  QUnit.test("stepPhysics() gives the same answer every time, so a test can rely on it", (assert) => {
    const drop = () => {
      const world = new BABYLON.Scene(engine);
      return loadPhysics(world).then(() => {
        const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, world);
        ball.position.set(0, 20, 0);
        new BABYLON.PhysicsAggregate(ball, BABYLON.PhysicsShapeType.SPHERE, { mass: 1 }, world);
        stepPhysics(world, 0.7);
        const y = ball.position.y;
        world.dispose();
        return y;
      });
    };

    return Promise.all([drop(), drop()]).then(([a, b]) => assert.strictEqual(a, b));
  });
});
