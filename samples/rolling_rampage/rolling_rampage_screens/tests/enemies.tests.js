QUnit.module("chaseDirection", () => {
  QUnit.test("points from one place to the other, with a length of 1", (assert) => {
    const direction = chaseDirection({ x: 1, y: 5, z: 1 }, { x: 4, y: 0, z: 5 });

    assert.true(Math.abs(direction.x - 0.6) < 1e-9);
    assert.true(Math.abs(direction.z - 0.8) < 1e-9);
    assert.true(Math.abs(Math.hypot(direction.x, direction.z) - 1) < 1e-9);
  });

  QUnit.test("goes along the floor, whatever the heights are", (assert) => {
    assert.strictEqual(chaseDirection({ x: 0, y: 0, z: 0 }, { x: 3, y: 100, z: 0 }).y, 0);
    assert.strictEqual(chaseDirection({ x: 0, y: 9, z: 0 }, { x: 3, y: -4, z: 0 }).y, 0);
  });

  QUnit.test("goes either way, on both axes", (assert) => {
    const back = chaseDirection({ x: 5, y: 0, z: 5 }, { x: 2, y: 0, z: 1 });

    assert.true(back.x < 0 && back.z < 0);
  });

  QUnit.test("is no direction at all when they are in the same place", (assert) => {
    assert.deepEqual(chaseDirection({ x: 2, y: 1, z: 3 }, { x: 2, y: 4, z: 3 }), { x: 0, y: 0, z: 0 });
  });
});

QUnit.module("Brain", () => {
  const here = { x: 0, y: 0, z: 0 };
  const at = (distance) => ({ x: distance, y: 0, z: 0 });
  const STILL = { x: 0, y: 0, z: 0 };

  // Lets `seconds` go by, a frame at a time, with the player `distance` away. Gives back the last answer.
  const run = (brain, seconds, distance, fallen = false) => {
    let answer;
    for (let t = 0; t < seconds - 1e-9; t += 1 / 60) answer = brain.update(1 / 60, here, at(distance), fallen);
    return answer;
  };

  QUnit.test("starts idle, and with the player nowhere near it stays idle and still", (assert) => {
    const brain = new Brain();

    assert.strictEqual(brain.state, "idle");
    const answer = run(brain, 5, SIGHT_RANGE + 5);

    assert.strictEqual(brain.state, "idle");
    assert.deepEqual(answer.direction, STILL);
    assert.false(answer.respawn);
  });

  QUnit.test("notices the player in range, but takes a moment to react, and stays still until then", (assert) => {
    const brain = new Brain();

    const answer = run(brain, REACTION_TIME / 2, SIGHT_RANGE - 1);

    assert.strictEqual(brain.state, "idle");
    assert.deepEqual(answer.direction, STILL);
  });

  QUnit.test("then sets off, straight at the player", (assert) => {
    const brain = new Brain();

    const answer = run(brain, REACTION_TIME + 0.1, SIGHT_RANGE - 1);

    assert.strictEqual(brain.state, "chasing");
    assert.deepEqual(answer.direction, { x: 1, y: 0, z: 0 });
  });

  QUnit.test("a player who is only just in sight, for less than the reaction time, is forgotten", (assert) => {
    const brain = new Brain();
    run(brain, REACTION_TIME * 0.6, SIGHT_RANGE - 1);

    run(brain, 0.1, SIGHT_RANGE + 2); // out of sight: the count starts again
    run(brain, REACTION_TIME * 0.6, SIGHT_RANGE - 1);

    assert.strictEqual(brain.state, "idle");
  });

  QUnit.test("keeps chasing a player who is further away than it first saw them, up to the giving-up distance", (assert) => {
    const brain = new Brain();
    run(brain, REACTION_TIME + 0.1, SIGHT_RANGE - 1);

    run(brain, 1, (SIGHT_RANGE + GIVE_UP_RANGE) / 2);

    assert.strictEqual(brain.state, "chasing");
  });

  QUnit.test("gives up on a player who gets further than that, and stands still", (assert) => {
    const brain = new Brain();
    run(brain, REACTION_TIME + 0.1, SIGHT_RANGE - 1);

    const answer = run(brain, 0.1, GIVE_UP_RANGE + 1);

    assert.strictEqual(brain.state, "idle");
    assert.deepEqual(answer.direction, STILL);
  });

  QUnit.test("doesn't start chasing at a distance it would keep chasing from: it notices at one range and gives up at another", (assert) => {
    const brain = new Brain();

    run(brain, 5, (SIGHT_RANGE + GIVE_UP_RANGE) / 2);

    assert.strictEqual(brain.state, "idle");
    assert.true(SIGHT_RANGE < GIVE_UP_RANGE);
  });

  QUnit.test("an enemy that has fallen off does nothing, and isn't put back until the delay is up", (assert) => {
    const brain = new Brain();
    run(brain, REACTION_TIME + 0.1, SIGHT_RANGE - 1);

    const answer = run(brain, RESPAWN_DELAY - 0.5, 5, true);

    assert.strictEqual(brain.state, "fallen");
    assert.deepEqual(answer.direction, STILL);
    assert.false(answer.respawn);
  });

  QUnit.test("when the delay is up, it says so once, and is idle again", (assert) => {
    const brain = new Brain();
    let respawns = 0;

    // The enemy is fallen until it is told to be put back, and it is put back at once.
    for (let t = 0; t < RESPAWN_DELAY + 1 && respawns === 0; t += 1 / 60) {
      if (brain.update(1 / 60, here, at(5), true).respawn) respawns++;
    }

    assert.strictEqual(respawns, 1);
    assert.strictEqual(brain.state, "idle");
    assert.false(brain.update(1 / 60, here, at(5), false).respawn, "and it doesn't say so again");
  });

  QUnit.test("after it is put back it has to notice the player all over again", (assert) => {
    const brain = new Brain();
    run(brain, RESPAWN_DELAY + 0.1, 5, true);

    const answer = brain.update(1 / 60, here, at(5), false);

    assert.strictEqual(brain.state, "idle");
    assert.deepEqual(answer.direction, STILL);
  });
});

QUnit.module("the enemies of every level", () => {
  const grids = LEVELS.map((level) => parseLevel(level));

  QUnit.test("parseLevel gives a level with no enemies an empty list", (assert) => {
    assert.deepEqual(parseLevel({ name: "T", start: { col: 0, row: 0 }, rows: ["00", "00"] }).enemies, []);
  });

  QUnit.test("some levels have enemies, and the first doesn't, so it is easy to practise on", (assert) => {
    assert.strictEqual(grids[0].enemies.length, 0);
    assert.true(grids.some((grid) => grid.enemies.length > 0));
  });

  QUnit.test("every enemy starts over floor, and above the fall limit", (assert) => {
    for (const grid of grids) {
      for (const place of grid.enemies) {
        const x = place.col * CELL;
        const z = place.row * CELL;
        assert.notStrictEqual(heightAt(grid, x, z), null, `${grid.name}: floor under an enemy at ${place.col}, ${place.row}`);
        assert.true(levelStart(grid, place).y > fallLimit(grid), `${grid.name}: above the limit`);
      }
    }
  });

  QUnit.test("every enemy starts well out of the player's reach, so the first thing isn't a collision", (assert) => {
    for (const grid of grids) {
      const start = levelStart(grid);
      for (const place of grid.enemies) {
        const enemy = levelStart(grid, place);
        assert.true(Math.hypot(enemy.x - start.x, enemy.z - start.z) > 8, `${grid.name}: an enemy at ${place.col}, ${place.row} is far from the start`);
      }
    }
  });

  QUnit.test("no enemy starts on a zone or a mover", (assert) => {
    for (const grid of grids) {
      for (const place of grid.enemies) {
        const enemy = levelStart(grid, place);
        for (const zone of levelZones(grid)) {
          const at = zonePosition(grid, zone);
          assert.true(Math.hypot(enemy.x - at.x, enemy.z - at.z) > zoneRadius(zone) + ZONE_BORDER + MARBLE_RADIUS, `${grid.name}: clear of ${zone.kind} ${zone.index}`);
        }
        for (const mover of grid.movers) {
          const centre = moverCenter(mover, 0);
          assert.true(Math.hypot(enemy.x - centre.x, enemy.z - centre.z) > Math.max(mover.size.x, mover.size.z) / 2 + 1, `${grid.name}: clear of a ${mover.kind}`);
        }
      }
    }
  });
});

// Enemies need a scene and physics. These use a NullEngine, which draws nothing, and let time go by with
// stepPhysics, giving the enemies a turn to think every sixtieth of a second, as the game does.
QUnit.module("enemies in the world", (hooks) => {
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

  // Lets `seconds` go by, with the enemies thinking about a target (a position) every frame.
  const run = (enemies, seconds, target) => {
    for (let i = 0; i < Math.round(seconds * 60); i++) {
      enemies.update(1 / 60, target);
      stepPhysics(scene, 1 / 60);
    }
  };

  // The start deck of the test course is flat, and long enough to chase across.
  const deck = () => {
    buildCourse(scene);
    return { x: -7, y: 4, z: 0 }; // somewhere to be chased to, on the deck
  };

  QUnit.test("an enemy is a marble, but a heavier and weaker one, with a brain, in its own colours", (assert) => {
    deck();
    const enemy = new Enemy(scene, { x: -13, y: 5, z: 0 }, { name: "enemy-7" });

    assert.true(enemy instanceof Marble);
    assert.strictEqual(enemy.mesh.name, "enemy-7");
    assert.strictEqual(enemy.aggregate.body.getMassProperties().mass, ENEMY_MASS);
    assert.true(ENEMY_MASS > MARBLE_MASS, "heavier than the player's");
    assert.true(ENEMY_FORCE < STEER_FORCE && ENEMY_TOP_SPEED < TOP_SPEED, "and weaker at pushing itself");
    assert.true(enemy.brain instanceof Brain);
    assert.notStrictEqual(enemy.mesh.material.name, "steel", "and doesn't look like the player's");
  });

  QUnit.test("an enemy sets off after a player in sight, and gets nearer", (assert) => {
    const target = deck();
    const enemies = { update: (dt, to) => enemy.update(dt, to) };
    const enemy = new Enemy(scene, { x: -13, y: 4.6, z: 0 });
    stepPhysics(scene, 1);
    const before = Math.abs(target.x - enemy.position.x);

    run(enemies, 2, target);

    assert.strictEqual(enemy.brain.state, "chasing");
    assert.true(Math.abs(target.x - enemy.position.x) < before - 1.5, `from ${before} to ${Math.abs(target.x - enemy.position.x)}`);
  });

  QUnit.test("an enemy with nobody in sight stays where it is", (assert) => {
    deck();
    const enemy = new Enemy(scene, { x: -13, y: 4.6, z: 0 });
    stepPhysics(scene, 1);
    const x = enemy.position.x;

    run({ update: (dt, to) => enemy.update(dt, to) }, 2, { x: 500, y: 0, z: 0 });

    assert.true(Math.abs(enemy.position.x - x) < 0.05, `it moved ${enemy.position.x - x}`);
    assert.strictEqual(enemy.brain.state, "idle");
  });

  QUnit.test("an enemy can't go as fast as the player can", (assert) => {
    const level = buildLevel(scene, LEVELS[0]);
    const start = levelStart(level.grid);
    const enemy = new Enemy(scene, { x: start.x, y: start.y, z: start.z });
    const chased = { x: start.x + 14, y: 0, z: start.z }; // a long way down the first deck and its ramp

    let fastest = 0;
    for (let i = 0; i < 6 * 60; i++) {
      enemy.update(1 / 60, chased);
      stepPhysics(scene, 1 / 60);
      if (enemy.grounded) fastest = Math.max(fastest, enemy.speed);
    }

    assert.true(fastest > 2, `it got going: ${fastest}`);
    assert.true(fastest < 12, `but not as the player can: ${fastest}`);
  });

  QUnit.test("an enemy that falls off the level is put back at its start after the delay", (assert) => {
    const level = buildLevel(scene, LEVELS[1]);
    const enemies = buildEnemies(scene, level.grid);
    const enemy = enemies.enemies[0];
    const start = enemy.position.clone();
    enemy.mesh.position.set(start.x - 8, start.y, start.z); // over the edge of the landing
    const target = { x: 500, y: 0, z: 0 };

    run(enemies, 2, target);
    assert.true(hasFallen(enemy.position.y, fallLimit(level.grid)), `it has fallen: ${enemy.position.y}`);
    assert.strictEqual(enemy.brain.state, "fallen");

    run(enemies, RESPAWN_DELAY, target);
    assert.true(Math.abs(enemy.position.x - start.x) < 0.5 && Math.abs(enemy.position.z - start.z) < 0.5, `it is back at ${enemy.position.x}, ${enemy.position.z}`);
    assert.false(hasFallen(enemy.position.y, fallLimit(level.grid)));
  });

  QUnit.test("buildEnemies makes one for each place in the level, where it says, and owns them", (assert) => {
    const level = buildLevel(scene, LEVELS[1]);

    const enemies = buildEnemies(scene, level.grid);

    assert.strictEqual(enemies.enemies.length, level.grid.enemies.length);
    const place = levelStart(level.grid, level.grid.enemies[0]);
    assert.true(Math.abs(enemies.meshes[0].position.x - place.x) < 1e-9 && Math.abs(enemies.meshes[0].position.z - place.z) < 1e-9);
    assert.true(enemies.owns(enemies.meshes[0]));
    assert.false(enemies.owns(level.mesh));
  });

  QUnit.test("a level with no enemies builds none, and everything still works", (assert) => {
    const level = buildLevel(scene, LEVELS[0]);

    const enemies = buildEnemies(scene, level.grid);
    enemies.update(1 / 60, { x: 0, y: 0, z: 0 });
    enemies.dispose();

    assert.strictEqual(enemies.enemies.length, 0);
  });

  QUnit.test("disposing takes them away", (assert) => {
    const level = buildLevel(scene, LEVELS[1]);
    const enemies = buildEnemies(scene, level.grid);

    enemies.dispose();

    assert.strictEqual(scene.getMeshByName("enemy-0"), null);
  });

  // Two marbles on the flat deck, one fired at the other.
  const collide = () => {
    deck();
    const marble = new Marble(scene, { start: { x: -11, y: 4.6, z: 0 } });
    const enemy = new Enemy(scene, { x: -8, y: 4.6, z: 0 });
    stepPhysics(scene, 1);
    return { marble, enemy };
  };

  QUnit.test("watchHits says when the marble and an enemy touch, with the enemy", (assert) => {
    const { marble, enemy } = collide();
    const hits = [];
    const watching = watchHits(scene, marble, (node) => node === enemy.mesh, (node) => hits.push(node));

    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    stepPhysics(scene, 1);

    assert.strictEqual(hits.length, 1, "once");
    assert.strictEqual(hits[0], enemy.mesh);
    watching.dispose();
  });

  QUnit.test("the heavier enemy is shoved less than the marble that hits it is", (assert) => {
    const { marble, enemy } = collide();
    let touched = false;
    const watching = watchHits(scene, marble, (node) => node === enemy.mesh, () => (touched = true));

    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    for (let i = 0; i < 120 && !touched; i++) stepPhysics(scene, 1 / 60);
    stepPhysics(scene, 3 / 60); // and a moment for the shove to be done

    assert.true(touched, "they hit");
    assert.true(enemy.velocity.x > 0, `the enemy has been shoved on: ${enemy.velocity.x}`);
    assert.true(5 - marble.velocity.x > enemy.velocity.x, `and the marble has lost more speed than the enemy has gained: lost ${5 - marble.velocity.x}, gained ${enemy.velocity.x}`);
    watching.dispose();
  });

  QUnit.test("watchHits says nothing about landing on the floor, or about a marble that touches nothing", (assert) => {
    deck();
    const marble = new Marble(scene, { start: { x: -11, y: 6, z: 0 } });
    const enemy = new Enemy(scene, { x: -7, y: 6, z: 3 });
    const hits = [];
    const watching = watchHits(scene, marble, (node) => node === enemy.mesh, (node) => hits.push(node));

    stepPhysics(scene, 2); // both land on the deck, and don't touch each other

    assert.deepEqual(hits, []);
    watching.dispose();
  });

  QUnit.test("something that isn't an enemy is no hit", (assert) => {
    const { marble, enemy } = collide();
    const hits = [];
    const watching = watchHits(scene, marble, () => false, (node) => hits.push(node));

    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    stepPhysics(scene, 1);

    assert.deepEqual(hits, []);
    assert.true(enemy.position.x > -8, "although they did touch");
    watching.dispose();
  });

  QUnit.test("disposing the watcher stops it saying anything", (assert) => {
    const { marble, enemy } = collide();
    const hits = [];
    watchHits(scene, marble, (node) => node === enemy.mesh, (node) => hits.push(node)).dispose();

    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(5, 0, 0));
    stepPhysics(scene, 1);

    assert.deepEqual(hits, []);
  });

  QUnit.test("an enemy rolling into the goal is reported to the zones as the enemy, so it can't win the level", (assert) => {
    const level = buildLevel(scene, LEVELS[1]);
    const marble = new Marble(scene, { start: levelStart(level.grid) });
    const seen = [];
    buildZones(scene, level.grid, (zone, node) => seen.push({ zone, node }));
    const enemy = new Enemy(scene, levelStart(level.grid, level.grid.goal));

    stepPhysics(scene, 1);

    const arrivals = seen.filter((s) => s.zone.kind === "goal");
    assert.strictEqual(arrivals.length, 1);
    assert.strictEqual(arrivals[0].node, enemy.mesh);
    assert.notStrictEqual(arrivals[0].node, marble.mesh, "which the game compares with the marble's, and ignores");
  });
});
