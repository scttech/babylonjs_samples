QUnit.module("the clock and zones of a level", () => {
  QUnit.test("every level has some time, a goal and checkpoints worth having", (assert) => {
    for (const level of LEVELS) {
      assert.true(level.time > 0, `${level.name} has time`);
      assert.strictEqual(typeof level.goal.col, "number");
      assert.strictEqual(typeof level.goal.row, "number");
      for (const checkpoint of level.checkpoints) assert.true(checkpoint.bonus > 0, `${level.name}: a checkpoint pays a bonus`);
    }
  });

  QUnit.test("parseLevel keeps the time, the goal and the checkpoints", (assert) => {
    const level = { name: "T", start: { col: 0, row: 0 }, rows: ["00", "00"], time: 33, goal: { col: 1, row: 1 }, checkpoints: [{ col: 0, row: 1, bonus: 7 }] };

    const grid = parseLevel(level);

    assert.strictEqual(grid.time, 33);
    assert.deepEqual(grid.goal, { col: 1, row: 1 });
    assert.deepEqual(grid.checkpoints, [{ col: 0, row: 1, bonus: 7 }]);
  });

  QUnit.test("levelStart can start somewhere other than the start, such as a checkpoint", (assert) => {
    const grid = parseLevel(LEVELS[0]);
    const checkpoint = grid.checkpoints[0];

    const start = levelStart(grid, checkpoint);

    assert.strictEqual(start.x, checkpoint.col * CELL);
    assert.strictEqual(start.z, checkpoint.row * CELL);
    assert.true(Math.abs(start.y - (heightAt(grid, start.x, start.z) + MARBLE_RADIUS + DROP_HEIGHT)) < 1e-9);
  });

  QUnit.test("every zone of every level is on flat floor, all the way round", (assert) => {
    const problems = [];
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      for (const zone of levelZones(grid)) {
        const at = zonePosition(grid, zone);
        const reach = ZONE_RADIUS + ZONE_BORDER; // the border has to lie flat too
        const edges = [[reach, 0], [-reach, 0], [0, reach], [0, -reach]];
        for (const [dx, dz] of edges) {
          const height = heightAt(grid, at.x + dx, at.z + dz);
          if (height === null || Math.abs(height - at.y) > 1e-9) problems.push(`${level.name}: ${zone.kind} ${zone.index} at ${dx}, ${dz}: ${height} not ${at.y}`);
        }
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("no zone is on the start, and no two zones overlap", (assert) => {
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      const zones = levelZones(grid);
      const start = levelStart(grid);
      for (const zone of zones) {
        const at = zonePosition(grid, zone);
        assert.true(Math.hypot(at.x - start.x, at.z - start.z) > (ZONE_RADIUS + ZONE_BORDER) * 2, `${level.name}: ${zone.kind} ${zone.index} is clear of the start`);
      }
      for (let i = 0; i < zones.length; i++) {
        for (let j = i + 1; j < zones.length; j++) {
          const a = zonePosition(grid, zones[i]);
          const b = zonePosition(grid, zones[j]);
          assert.true(Math.hypot(a.x - b.x, a.z - b.z) > (ZONE_RADIUS + ZONE_BORDER) * 2, `${level.name}: zones ${i} and ${j} apart`);
        }
      }
    }
  });
});

QUnit.module("makeStripeTexture", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("is a square of the size it is asked for, that repeats", (assert) => {
    const texture = makeStripeTexture(scene, 64);
    const size = texture.getSize();

    assert.deepEqual([size.width, size.height], [64, 64]);
    assert.strictEqual(texture.wrapU, BABYLON.Texture.WRAP_ADDRESSMODE);
    assert.strictEqual(texture.wrapV, BABYLON.Texture.WRAP_ADDRESSMODE);
  });
});

QUnit.module("levelZones and zonePosition", () => {
  const grid = parseLevel({
    name: "T",
    start: { col: 0, row: 0 },
    rows: ["4444", "4444", "4444"],
    time: 30,
    goal: { col: 2, row: 1 },
    checkpoints: [{ col: 0.5, row: 0.5, bonus: 8 }, { col: 1, row: 1, bonus: 9 }],
  });

  QUnit.test("the goal comes first, and then the checkpoints in order, with their place and bonus", (assert) => {
    const zones = levelZones(grid);

    assert.deepEqual(zones.map((z) => [z.kind, z.index]), [["goal", 0], ["checkpoint", 0], ["checkpoint", 1]]);
    assert.strictEqual(zones[1].bonus, 8);
    assert.strictEqual(zones[2].bonus, 9);
  });

  QUnit.test("a zone is in the middle of its square, on the floor", (assert) => {
    const at = zonePosition(grid, { col: 2, row: 1 });

    assert.deepEqual(at, { x: 2 * CELL, y: 4 * HEIGHT_STEP, z: 1 * CELL });
  });
});

// Zones need a scene and physics, and a marble to roll into them. These use a NullEngine, which draws
// nothing, and let time go by with stepPhysics.
QUnit.module("buildZones", (hooks) => {
  let engine;
  let scene;
  let level;
  let entered;
  let zones;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    level = buildLevel(scene, LEVELS[0]);
    entered = [];
    zones = buildZones(scene, level.grid, (zone, node) => entered.push({ zone, node }));
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // A marble dropped at a zone of the level.
  const dropAt = (zone) => new Marble(scene, { start: levelStart(level.grid, zone) });

  QUnit.test("makes a glowing disc in a striped border, and an invisible trigger, for every zone", (assert) => {
    for (const zone of levelZones(level.grid)) {
      const name = `${zone.kind}-${zone.index}`;
      const disc = scene.getMeshByName(`${name}-disc`);
      const trigger = scene.getMeshByName(name);
      const border = scene.getMeshByName(`${name}-border`);
      const at = zonePosition(level.grid, zone);

      assert.true(disc.isVisible, `${name} disc is seen`);
      assert.true(border.isVisible, `${name} border is seen`);
      assert.true(Math.abs(border.getBoundingInfo().boundingBox.extendSize.x - (ZONE_RADIUS + ZONE_BORDER)) < 1e-6, `${name} border reaches out past the disc`);
      assert.true(Math.abs(border.position.y - (at.y + 0.03)) < 1e-6, `${name} border is on the floor`);
      assert.false(trigger.isVisible, `${name} trigger is not`);
      assert.true(Math.abs(disc.position.y - at.y) < 0.1, `${name} disc is on the floor`);
      assert.true(Boolean(trigger.physicsBody), `${name} trigger has a body`);
    }
    assert.strictEqual(zones.zones.length, 1 + level.grid.checkpoints.length);
  });

  QUnit.test("a marble that lands in the goal is reported, with the zone and the marble", (assert) => {
    const marble = dropAt(level.grid.goal);

    stepPhysics(scene, 1);

    assert.strictEqual(entered.length, 1);
    assert.strictEqual(entered[0].zone.kind, "goal");
    assert.strictEqual(entered[0].node, marble.mesh);
  });

  QUnit.test("a marble that lands in a checkpoint is reported as that checkpoint", (assert) => {
    const marble = dropAt(level.grid.checkpoints[0]);

    stepPhysics(scene, 1);

    assert.strictEqual(entered.length, 1);
    assert.strictEqual(entered[0].zone.kind, "checkpoint");
    assert.strictEqual(entered[0].zone.index, 0);
    assert.strictEqual(entered[0].zone.bonus, level.grid.checkpoints[0].bonus);
    assert.strictEqual(entered[0].node, marble.mesh);
  });

  QUnit.test("a zone doesn't stop the marble: it rolls through, at speed", (assert) => {
    const checkpoint = zonePosition(level.grid, level.grid.checkpoints[0]);
    const marble = new Marble(scene, { start: { x: checkpoint.x - 2.5, y: checkpoint.y + MARBLE_RADIUS + 0.02, z: checkpoint.z } });
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(6, 0, 0));

    stepPhysics(scene, 0.4);

    assert.strictEqual(entered.length, 1, "it went in");
    assert.true(marble.position.x > checkpoint.x - 1, `and is on its way, past the edge of the zone: ${marble.position.x}`);
    assert.true(marble.speed > 3, `at speed: ${marble.speed}`);
  });

  QUnit.test("it is reported on the way in only, not while inside, and not on the way out", (assert) => {
    const checkpoint = zonePosition(level.grid, level.grid.checkpoints[0]);
    const marble = new Marble(scene, { start: { x: checkpoint.x - 2.5, y: checkpoint.y + MARBLE_RADIUS + 0.02, z: checkpoint.z } });
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(6, 0, 0));

    stepPhysics(scene, 1); // in the middle, and out the other side

    assert.true(marble.position.x > checkpoint.x + ZONE_RADIUS, `it has come out: ${marble.position.x}`);
    assert.strictEqual(entered.length, 1);
  });

  QUnit.test("something that isn't the marble is reported as what it is, so the game can ignore it", (assert) => {
    const ball = BABYLON.MeshBuilder.CreateSphere("other", { diameter: 1 }, scene);
    const at = zonePosition(level.grid, level.grid.goal);
    ball.position.set(at.x, at.y + 1, at.z);
    new BABYLON.PhysicsAggregate(ball, BABYLON.PhysicsShapeType.SPHERE, { mass: 1 }, scene);

    stepPhysics(scene, 1);

    assert.strictEqual(entered.length, 1);
    assert.strictEqual(entered[0].node, ball);
    assert.strictEqual(entered[0].node.name, "other");
  });

  QUnit.test("a marble that rolls over the plain floor sets nothing off", (assert) => {
    new Marble(scene, { start: levelStart(level.grid) });

    stepPhysics(scene, 1.5);

    assert.deepEqual(entered, []);
  });

  QUnit.test("markTaken greys out that checkpoint's disc, and no other", (assert) => {
    const taken = BABYLON.Color3.FromHexString(ZONE_COLORS.taken);
    const goalDisc = scene.getMeshByName("goal-0-disc");
    const checkpointDisc = scene.getMeshByName("checkpoint-0-disc");
    const before = checkpointDisc.material.emissiveColor.clone();

    zones.markTaken(zones.zones[1]);

    assert.false(before.equals(taken), "it was not grey before");
    assert.true(checkpointDisc.material.emissiveColor.equals(taken), "and is now");
    assert.false(goalDisc.material.emissiveColor.equals(taken), "the goal is untouched");
  });

  QUnit.test("markTaken greys out the goal too, and leaves the checkpoints", (assert) => {
    const taken = BABYLON.Color3.FromHexString(ZONE_COLORS.taken);
    const goalDisc = scene.getMeshByName("goal-0-disc");
    const checkpointDisc = scene.getMeshByName("checkpoint-0-disc");

    zones.markTaken(zones.zones[0]);

    assert.true(goalDisc.material.emissiveColor.equals(taken));
    assert.false(checkpointDisc.material.emissiveColor.equals(taken));
  });

  QUnit.test("disposing takes the zones away: no meshes, and no more reports", (assert) => {
    zones.dispose();

    assert.strictEqual(scene.getMeshByName("goal-0"), null);
    assert.strictEqual(scene.getMeshByName("goal-0-disc"), null);
    assert.strictEqual(scene.getMeshByName("goal-0-border"), null);
    assert.strictEqual(scene.getMeshByName("checkpoint-0"), null);

    dropAt(level.grid.goal);
    stepPhysics(scene, 1);
    assert.deepEqual(entered, []);
  });

  QUnit.test("the zones of another level can be built in their place", (assert) => {
    zones.dispose();
    level.dispose();
    level = buildLevel(scene, LEVELS[1]);
    zones = buildZones(scene, level.grid, (zone, node) => entered.push({ zone, node }));

    dropAt(level.grid.goal);
    stepPhysics(scene, 1);

    assert.strictEqual(entered.length, 1);
    assert.strictEqual(entered[0].zone.kind, "goal");
  });
});

