QUnit.module("the ENEMIES table", () => {
  QUnit.test("every enemy has a name, a model, a size, a speed and a clip", (assert) => {
    for (const [kind, spec] of Object.entries(ENEMIES)) {
      assert.true(spec.name.length > 0, kind);
      assert.true(spec.file.endsWith(".glb"), kind);
      assert.true(spec.height > 0, kind);
      assert.true(spec.speed > 0, kind);
      assert.true(spec.clip in CLIPS, kind);
    }
  });

  QUnit.test("there are five kinds, and the heavy one is the biggest and the slowest", (assert) => {
    const rows = Object.values(ENEMIES);

    assert.strictEqual(rows.length, 5);
    assert.strictEqual(Math.max(...rows.map((r) => r.height)), ENEMIES.heavy.height);
    assert.strictEqual(Math.min(...rows.map((r) => r.speed)), ENEMIES.heavy.speed);
  });

  QUnit.test("the scout is the fastest, and it runs", (assert) => {
    assert.strictEqual(Math.max(...Object.values(ENEMIES).map((r) => r.speed)), ENEMIES.scout.speed);
    assert.strictEqual(ENEMIES.scout.clip, "Running");
  });

  QUnit.test("an enemy is not taller than a podium would let you see over: under a cell and a bit", (assert) => {
    for (const spec of Object.values(ENEMIES)) assert.true(spec.height < BOARD.cell, spec.name);
  });
});

QUnit.module("clipRatio", () => {
  QUnit.test("a model that goes the speed its clip would take it plays the clip at its normal speed", (assert) => {
    assert.strictEqual(clipRatio(CLIPS.Walking.stride * 0.5, 0.5, "Walking"), 1);
  });

  QUnit.test("twice as fast is twice as quick a clip", (assert) => {
    assert.strictEqual(clipRatio(2, 1, "Walking"), 2 * clipRatio(1, 1, "Walking"));
  });

  QUnit.test("a smaller model takes smaller steps, and has to move its feet quicker to go the same speed", (assert) => {
    assert.true(clipRatio(1, 0.5, "Walking") > clipRatio(1, 1, "Walking"));
  });

  QUnit.test("a running clip covers more ground, so it is played more slowly at the same speed", (assert) => {
    assert.true(clipRatio(2, 1, "Running") < clipRatio(2, 1, "Walking"));
  });
});

QUnit.module("loading and walking enemies", (hooks) => {
  let engine, scene, loaded, route;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadEnemies(scene);
    route = routeFor(parseMap(MAPS[0]));
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  // The box that holds everything a node holds, in the world.
  const boundsOf = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true);
  };

  QUnit.test("every kind loads, and has every clip that the table says it plays", (assert) => {
    for (const [kind, spec] of Object.entries(ENEMIES)) {
      assert.true(loaded[kind].container.animationGroups.some((group) => group.name === spec.clip), `${kind} has ${spec.clip}`);
    }
  });

  QUnit.test("every kind has a Walking clip and a clip for falling, for the next tutorials", (assert) => {
    for (const kind of Object.keys(ENEMIES)) {
      const names = loaded[kind].container.animationGroups.map((group) => group.name);

      assert.true(names.includes("Walking") && names.includes("Running"), kind);
      assert.true(names.includes("Dead") || names.includes("Fall_Dead_from_Abdominal_Injury"), kind);
    }
  });

  QUnit.test("each is made the height the table says, and stands with its feet on the ground", (assert) => {
    for (const kind of Object.keys(ENEMIES)) {
      const enemy = new Enemy(scene, loaded, kind, route, `size ${kind}`);
      const { min, max } = boundsOf(enemy.node);

      assert.true(Math.abs(max.y - min.y - ENEMIES[kind].height) < 0.02, `${kind} is ${(max.y - min.y).toFixed(2)} tall`);
      assert.true(Math.abs(min.y) < 0.02, `${kind} stands at ${min.y.toFixed(3)}`);
      enemy.dispose();
    }
  });

  QUnit.test("an enemy begins at the start of the route, facing the way it goes", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "begin");

    assert.true(Math.abs(enemy.node.position.x - route.points[0].x) < 1e-9);
    assert.true(Math.abs(enemy.node.position.z - route.points[0].z) < 1e-9);
    assert.true(Math.abs(enemy.node.rotation.y - pointAlong(route, 0).yaw) < 1e-9);
    enemy.dispose();
  });

  QUnit.test("it plays the clip the table says, and no other, at a speed that matches its feet to the ground", (assert) => {
    for (const kind of Object.keys(ENEMIES)) {
      const enemy = new Enemy(scene, loaded, kind, route, `clip ${kind}`);
      const playing = enemy.copy.animationGroups.filter((group) => group.isPlaying);

      assert.strictEqual(playing.length, 1, kind);
      assert.strictEqual(playing[0], enemy.clip, kind);
      assert.true(Math.abs(enemy.clip.speedRatio - clipRatio(ENEMIES[kind].speed, loaded[kind].scale, ENEMIES[kind].clip)) < 1e-9, kind);
      assert.true(enemy.clip.loopAnimation, kind);
      enemy.dispose();
    }
  });

  QUnit.test("update moves it along the route at the speed in the table", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "move");
    enemy.update(2);

    assert.true(Math.abs(enemy.walker.distance - 2 * ENEMIES.grunt.speed) < 1e-9);
    const where = pointAlong(route, enemy.walker.distance);
    assert.true(Math.abs(enemy.node.position.x - where.x) < 1e-9 && Math.abs(enemy.node.position.z - where.z) < 1e-9);
    enemy.dispose();
  });

  QUnit.test("it turns to face the way it goes round the corners", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "turn");
    const yaws = new Set();
    for (let i = 0; i < 2000 && !enemy.done; i++) {
      enemy.update(0.1);
      yaws.add(Math.round(enemy.node.rotation.y * 10) / 10);
    }

    assert.true(yaws.size > 4, "it faces many ways on the way");
    enemy.dispose();
  });

  QUnit.test("it is done when it has walked all the way, and not before", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "done");

    assert.false(enemy.done);
    enemy.update(route.total / ENEMIES.scout.speed + 1);
    assert.true(enemy.done);
    enemy.dispose();
  });

  QUnit.test("each enemy has a skeleton and animations of its own, so each is in a pose of its own", (assert) => {
    const a = new Enemy(scene, loaded, "grunt", route, "own a");
    const b = new Enemy(scene, loaded, "grunt", route, "own b");

    assert.notStrictEqual(a.copy.skeletons[0], b.copy.skeletons[0]);
    assert.notStrictEqual(a.clip, b.clip);
    a.dispose();
    b.dispose();
  });

  QUnit.test("an enemy that is taken away leaves nothing behind", (assert) => {
    const meshes = scene.meshes.length;
    const groups = scene.animationGroups.length;
    const skeletons = scene.skeletons.length;
    const nodes = scene.transformNodes.length;
    const enemy = new Enemy(scene, loaded, "heavy", route, "gone");
    assert.true(scene.animationGroups.length > groups);
    enemy.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.animationGroups.length, groups);
    assert.strictEqual(scene.skeletons.length, skeletons);
    assert.strictEqual(scene.transformNodes.length, nodes);
  });

  QUnit.test("an enemy says where it is, how far along the road, and how high its middle is, for a tower to aim at", (assert) => {
    const enemy = new Enemy(scene, loaded, "heavy", route, "aim");
    enemy.update(3);

    assert.strictEqual(enemy.x, enemy.node.position.x);
    assert.strictEqual(enemy.z, enemy.node.position.z);
    assert.strictEqual(enemy.progress, enemy.walker.progress);
    assert.true(enemy.progress > 0 && enemy.progress < 1);
    assert.true(Math.abs(enemy.aimHeight - ENEMIES.heavy.height * 0.6) < 1e-9);
    assert.true(enemy.aimHeight > 0 && enemy.aimHeight < enemy.height);
    enemy.dispose();
  });  
});
