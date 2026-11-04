QUnit.module("stepToward", () => {
  const origin = { x: 0, y: 0, z: 0 };

  QUnit.test("goes the distance asked, in the direction of the place", (assert) => {
    const p = stepToward(origin, { x: 10, y: 0, z: 0 }, 3);

    assert.deepEqual({ x: p.x, y: p.y, z: p.z }, { x: 3, y: 0, z: 0 });
    assert.false(p.arrived);
  });

  QUnit.test("goes in a straight line in three dimensions", (assert) => {
    const p = stepToward(origin, { x: 3, y: 4, z: 12 }, 6.5);

    assert.true(Math.abs(p.x - 1.5) < 1e-9 && Math.abs(p.y - 2) < 1e-9 && Math.abs(p.z - 6) < 1e-9);
  });

  QUnit.test("does not go past the place: it stops on it, and says so", (assert) => {
    const p = stepToward(origin, { x: 1, y: 1, z: 1 }, 99);

    assert.deepEqual({ x: p.x, y: p.y, z: p.z, arrived: p.arrived }, { x: 1, y: 1, z: 1, arrived: true });
  });

  QUnit.test("a step of exactly the distance arrives", (assert) => {
    assert.true(stepToward(origin, { x: 0, y: 5, z: 0 }, 5).arrived);
  });

  QUnit.test("already there is arrived, and does not divide by nothing", (assert) => {
    const p = stepToward({ x: 2, y: 2, z: 2 }, { x: 2, y: 2, z: 2 }, 1);

    assert.true(p.arrived);
    assert.strictEqual(p.x, 2);
  });

  QUnit.test("it does not change the places it is given", (assert) => {
    const from = { x: 0, y: 0, z: 0 };
    stepToward(from, { x: 5, y: 5, z: 5 }, 1);

    assert.deepEqual(from, { x: 0, y: 0, z: 0 });
  });
});

QUnit.module("Bolt", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // An enemy that stands where it is told to, so that a test can say where it is.
  const target = (x, z, aimHeight = 1) => ({ x, z, aimHeight });

  QUnit.test("begins where it is thrown from, not arrived", (assert) => {
    const bolt = new Bolt(scene, { x: 1, y: 2, z: 3 }, target(9, 9), "#ff0000");

    assert.deepEqual(bolt.mesh.position.asArray(), [1, 2, 3]);
    assert.false(bolt.done);
  });

  QUnit.test("is the color it is given, and glows", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(5, 0), "#38b6ff");

    assert.strictEqual(bolt.mesh.material.emissiveColor.toHexString().toLowerCase(), "#38b6ff");
    assert.true(bolt.mesh.material.disableLighting);
  });

  QUnit.test("flies towards the enemy at its speed", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(20, 0, 1), "#ffffff");
    bolt.update(1);

    assert.true(Math.abs(bolt.mesh.position.x - BOLT.speed) < 1e-9);
    assert.true(Math.abs(bolt.mesh.position.y - 1) < 1e-9);
  });

  QUnit.test("goes to about the middle of the enemy, and not its feet", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 3, z: 0 }, target(0, 5, 0.8), "#ffffff");
    for (let i = 0; i < 100 && !bolt.done; i++) bolt.update(0.05);

    assert.true(Math.abs(bolt.mesh.position.y - 0.8) < BOLT.hit + 1e-9);
  });

  QUnit.test("arrives when it is as near as the hit distance, and is done", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(5, 0, 1), "#ffffff");
    let time = 0;
    while (!bolt.done && time < 10) {
      bolt.update(0.01);
      time += 0.01;
    }

    assert.true(bolt.done);
    assert.true(Math.abs(time - (5 - BOLT.hit) / BOLT.speed) < 0.03, `${time}`);
  });

  QUnit.test("follows an enemy that is walking away", (assert) => {
    const enemy = target(5, 0);
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff");
    for (let i = 0; i < 20; i++) {
      enemy.x += 0.05;
      bolt.update(0.02);
    }

    assert.false(bolt.done, "it is still on its way");
    assert.true(bolt.mesh.position.x > 2.5);
    for (let i = 0; i < 200 && !bolt.done; i++) {
      enemy.x += 0.05;
      bolt.update(0.02);
    }
    assert.true(bolt.done, "it catches up with an enemy that is slower than it is");
  });

  QUnit.test("an enemy that is gone (still, where it was last) is flown to, and hit", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(4, 3, 1), "#ffffff");
    for (let i = 0; i < 200 && !bolt.done; i++) bolt.update(0.02);

    assert.true(bolt.done);
  });

  QUnit.test("a bolt that is thrown at something right beside it is done at once", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(0.1, 0, 1), "#ffffff");
    bolt.update(0.016);

    assert.true(bolt.done);
  });

  QUnit.test("it does its damage when it gets there, once, and says if that defeated the enemy", (assert) => {
    const enemy = {
      x: 3,
      z: 0,
      aimHeight: 1,
      health: 20,
      hits: [],
      hurt(amount) {
        this.hits.push(amount);
        this.health -= amount;
        return this.health <= 0;
      },
    };
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff", 20);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.hits, [20], "once");
    assert.true(bolt.killed);
    assert.true(bolt.done);
  });

  QUnit.test("it does no damage on the way, only on arrival", (assert) => {
    const enemy = {
      x: 20,
      z: 0,
      aimHeight: 1,
      hits: [],
      hurt(amount) {
        this.hits.push(amount);
        return false;
      },
    };
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff", 5);
    bolt.update(0.1);

    assert.deepEqual(enemy.hits, []);
    assert.false(bolt.killed);
  });

  QUnit.test("an enemy that was not defeated by it is not said to be", (assert) => {
    const enemy = { x: 2, z: 0, aimHeight: 1, hurt: () => false };
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff", 5);
    for (let i = 0; i < 100; i++) bolt.update(0.02);

    assert.true(bolt.done);
    assert.false(bolt.killed);
  });

  QUnit.test("dispose takes it out of the scene, with its material", (assert) => {
    const meshes = scene.meshes.length;
    const materials = scene.materials.length;
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, target(5, 0), "#ffffff");
    bolt.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.materials.length, materials);
  });


  // An enemy that says what was put on it.
  const afflicted = (x = 3) => ({
    x,
    z: 0,
    aimHeight: 1,
    put: [],
    hurt() {
      return false;
    },
    afflict(kind, potency) {
      this.put.push([kind, potency]);
    },
  });

  QUnit.test("it puts its effect on the enemy when it gets there, once, as strong as it was thrown", (assert) => {
    const enemy = afflicted();
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#38b6ff", 5, "slow", 1.3);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.put, [["slow", 1.3]]);
  });

  QUnit.test("and not on the way", (assert) => {
    const enemy = afflicted(30);
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#38b6ff", 5, "slow");
    for (let i = 0; i < 20; i++) bolt.update(0.02);

    assert.false(bolt.arrived);
    assert.deepEqual(enemy.put, []);
  });

  QUnit.test("a bolt with no effect puts none on, and a potency of one is the usual", (assert) => {
    const enemy = afflicted();
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff", 5);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.put, []);
    assert.strictEqual(bolt.potency, 1);
    assert.strictEqual(bolt.effect, null);
  });

  QUnit.test("an enemy that can't be afflicted (a stand-in with only a position) is still hit, and nothing breaks", (assert) => {
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, { x: 3, z: 0, aimHeight: 1 }, "#ffffff", 5, "burn");
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.true(bolt.done);
  });

  QUnit.test("an effect with a radius reaches the others near the enemy it hit, and not the ones that are far", (assert) => {
    const near = afflicted(3.5);
    const far = afflicted(30);
    near.alive = true;
    far.alive = true;
    const enemy = afflicted(3);
    enemy.alive = true;
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#38b6ff", 5, "slow", 1, () => [enemy, near, far]);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.put, [["slow", 1]]);
    assert.deepEqual(near.put, [["slow", 1]]);
    assert.deepEqual(far.put, []);
  });

  QUnit.test("an effect with none reaches only the one it hit, whoever is near", (assert) => {
    const near = afflicted(3.1);
    near.alive = true;
    const enemy = afflicted(3);
    enemy.alive = true;
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#e8c33a", 5, "stun", 1, () => [enemy, near]);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.put, [["stun", 1]]);
    assert.deepEqual(near.put, []);
  });

});
