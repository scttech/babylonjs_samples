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

  // The box that holds everything a node holds, in the world, but not the marks that hang over its head (which are not the enemy).
  const boundsOf = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true, (mesh) => !mesh.name.includes(" mark "));
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

  QUnit.test("an effect shows as a mark over its head, and goes when the effect does", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "marked");
    assert.deepEqual(enemy.marks.shown, []);
    enemy.afflict("slow");
    enemy.afflict("burn");
    enemy.update(0.1);
    enemy.showMarks();

    assert.deepEqual(enemy.marks.shown.sort(), ["burn", "slow"]);
    enemy.update(EFFECTS.slow.seconds + 1);
    enemy.showMarks();
    assert.deepEqual(enemy.marks.shown, [], "both are over");
    enemy.dispose();
  });

  QUnit.test("a fallen enemy shows no marks, and the marks go with it", (assert) => {
    const meshes = scene.meshes.length;
    const enemy = new Enemy(scene, loaded, "grunt", route, "marks gone");
    enemy.afflict("stun");
    enemy.update(0.1);
    enemy.showMarks();
    assert.deepEqual(enemy.marks.shown, ["stun"]);
    enemy.hurt(1000);
    enemy.showMarks();

    assert.deepEqual(enemy.marks.shown, []);
    enemy.dispose();
    assert.strictEqual(scene.meshes.length, meshes);
  });

  QUnit.test("every enemy has health, a reward and a number of lives it costs", (assert) => {
    for (const [kind, spec] of Object.entries(ENEMIES)) {
      assert.true(spec.health > 0 && spec.reward > 0 && Number.isInteger(spec.leak) && spec.leak > 0, kind);
    }
  });

  QUnit.test("the heavier an enemy, the more it is worth: the toughest pay the most", (assert) => {
    assert.true(ENEMIES.heavy.reward > ENEMIES.grunt.reward);
    assert.true(ENEMIES.spirit.reward > ENEMIES.heavy.reward);
    assert.true(ENEMIES.spirit.leak > ENEMIES.grunt.leak);
  });

  QUnit.test("an enemy begins with all its health, as much more as the wave says, and is on its feet", (assert) => {
    const plain = new Enemy(scene, loaded, "grunt", route, "health a");
    const tough = new Enemy(scene, loaded, "grunt", route, "health b", 1.5);

    assert.strictEqual(plain.health, ENEMIES.grunt.health);
    assert.strictEqual(tough.health, ENEMIES.grunt.health * 1.5);
    assert.true(plain.alive && !plain.dead && !plain.finished);
    plain.dispose();
    tough.dispose();
  });

  QUnit.test("hurt takes health, and says no while there is some left", (assert) => {
    const enemy = new Enemy(scene, loaded, "heavy", route, "hurt");

    assert.false(enemy.hurt(30));
    assert.strictEqual(enemy.health, ENEMIES.heavy.health - 30);
    assert.true(enemy.alive);
    enemy.dispose();
  });

  QUnit.test("hurt that takes the last of it says yes, once: the enemy falls, and health is not below nothing", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "defeat");

    assert.true(enemy.hurt(1000));
    assert.strictEqual(enemy.health, 0);
    assert.true(enemy.dead && !enemy.alive);
    assert.false(enemy.hurt(10), "something that has fallen takes no more, and is not defeated again");
    enemy.dispose();
  });

  QUnit.test("a fallen enemy stops walking, plays one of the death clips and no other, and the clip is not looped", (assert) => {
    for (const kind of Object.keys(ENEMIES)) {
      const enemy = new Enemy(scene, loaded, kind, route, `fall ${kind}`);
      enemy.update(2);
      enemy.hurt(10000);
      const playing = enemy.copy.animationGroups.filter((group) => group.isPlaying);

      assert.strictEqual(playing.length, 1, kind);
      assert.strictEqual(playing[0], enemy.fall, kind);
      assert.true(DEATH.clips.some((clip) => enemy.fall.name === `fall ${kind} ${clip}`), kind);
      assert.false(enemy.fall.loopAnimation, kind);
      enemy.dispose();
    }
  });

  QUnit.test("the death clip is played at the speed that makes the fall last DEATH.seconds", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "fall time");
    enemy.hurt(10000);
    const seconds = (enemy.fall.to - enemy.fall.from) / 60 / enemy.fall.speedRatio;

    assert.true(Math.abs(seconds - DEATH.seconds) < 0.01);
    enemy.dispose();
  });

  QUnit.test("which death an enemy has depends on its name, the same each time, and both are used", (assert) => {
    const clipOf = (name) => {
      const enemy = new Enemy(scene, loaded, "grunt", route, name);
      enemy.hurt(1000);
      const clip = enemy.fall.name.slice(name.length + 1);
      enemy.dispose();
      return clip;
    };
    const names = Array.from({ length: 12 }, (_, i) => `death ${i}`);
    const clips = names.map(clipOf);

    assert.deepEqual(names.map(clipOf), clips);
    assert.deepEqual([...new Set(clips)].sort(), [...DEATH.clips].sort());
  });

  QUnit.test("a fallen enemy lies where it fell, and its position does not change as time goes on", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "lie");
    enemy.update(3);
    enemy.hurt(1000);
    const { x, z } = enemy.node.position;
    enemy.update(1);

    assert.strictEqual(enemy.node.position.x, x);
    assert.strictEqual(enemy.node.position.z, z);
    assert.strictEqual(enemy.walker.distance, 3 * ENEMIES.grunt.speed);
    enemy.dispose();
  });

  QUnit.test("after it has lain a while it sinks into the ground, and then it is over", (assert) => {
    const enemy = new Enemy(scene, loaded, "heavy", route, "sink");
    enemy.hurt(1000);
    enemy.update(DEATH.seconds + DEATH.linger - 0.01);
    assert.strictEqual(enemy.node.position.y, 0, "not yet");
    assert.false(enemy.finished);
    enemy.update(DEATH.sink / 2 + 0.01);
    assert.true(enemy.node.position.y < 0 && enemy.node.position.y > -enemy.height, "on its way down");
    assert.false(enemy.finished);
    enemy.update(DEATH.sink);

    assert.true(enemy.finished);
    assert.true(Math.abs(enemy.node.position.y + enemy.height) < 1e-9, "all the way down, and no further");
    enemy.dispose();
  });

  QUnit.test("an enemy that walks to the end is over, without falling", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "through");
    enemy.update(route.total / ENEMIES.scout.speed + 1);

    assert.true(enemy.alive && enemy.done && enemy.finished);
    enemy.dispose();
  });

  QUnit.test("an enemy that has fallen is taken away without leaving anything behind", (assert) => {
    const meshes = scene.meshes.length;
    const groups = scene.animationGroups.length;
    const enemy = new Enemy(scene, loaded, "dai_li", route, "tidy");
    enemy.hurt(1000);
    enemy.update(10);
    enemy.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.animationGroups.length, groups);
  });

  
  QUnit.test("every enemy says how much of each effect it takes, and an effect it doesn't mention it takes in full", (assert) => {
    for (const [kind, spec] of Object.entries(ENEMIES)) {
      assert.true(typeof spec.affected === "object", kind);
      for (const [effect, share] of Object.entries(spec.affected)) assert.true(effect in EFFECTS && share >= 0, `${kind} ${effect}`);
    }
  });

  QUnit.test("some resist, and some are weak: the heavy trooper is hard to burn and to push, and the spirit burns easily", (assert) => {
    assert.true(ENEMIES.heavy.affected.burn < 1 && ENEMIES.heavy.affected.push < 1);
    assert.true(ENEMIES.spirit.affected.burn > 1);
    assert.deepEqual(ENEMIES.grunt.affected, {}, "and the grunt is the plain one");
  });

  QUnit.test("an enemy begins under no effect, and walks at its own speed", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "plain");

    assert.deepEqual(enemy.status.kinds, []);
    enemy.update(1);
    assert.true(Math.abs(enemy.walker.distance - ENEMIES.grunt.speed) < 1e-9);
    enemy.dispose();
  });

  QUnit.test("a slow makes it walk slower, and its feet keep up: the clip is played slower by the same share", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "slowed");
    const clipAtFullSpeed = enemy.clip.speedRatio;
    enemy.afflict("slow");
    enemy.update(1);

    assert.true(Math.abs(enemy.walker.distance - ENEMIES.grunt.speed * EFFECTS.slow.speed) < 1e-9);
    assert.true(Math.abs(enemy.clip.speedRatio - clipAtFullSpeed * EFFECTS.slow.speed) < 1e-9);
    enemy.dispose();
  });

  QUnit.test("when the slow is over it goes at its own speed again, and its clip too", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "recovers");
    const clipAtFullSpeed = enemy.clip.speedRatio;
    enemy.afflict("slow");
    enemy.update(EFFECTS.slow.seconds + 0.5);
    const before = enemy.walker.distance;
    enemy.update(1);

    assert.true(Math.abs(enemy.walker.distance - before - ENEMIES.grunt.speed) < 1e-9);
    assert.strictEqual(enemy.clip.speedRatio, clipAtFullSpeed);
    enemy.dispose();
  });

  QUnit.test("a stun stops it where it is, and the clip with it", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "stunned");
    enemy.update(1);
    const before = enemy.walker.distance;
    enemy.afflict("stun");
    enemy.update(0.3);

    assert.strictEqual(enemy.walker.distance, before);
    assert.strictEqual(enemy.clip.speedRatio, 0);
    enemy.update(1);
    enemy.update(1);
    assert.true(enemy.walker.distance > before, "and it goes on afterwards");
    enemy.dispose();
  });

  QUnit.test("a burn hurts it a little every moment, and it can be defeated by it, and is paid for as it is by a bolt", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "burning");
    enemy.afflict("burn");
    enemy.update(1);

    assert.true(Math.abs(enemy.health - (enemy.maxHealth - EFFECTS.burn.damage)) < 1e-9);
    for (let i = 0; i < 30 && enemy.alive; i++) {
      enemy.afflict("burn");
      enemy.update(1);
    }
    assert.true(enemy.dead, "burned to nothing");
    assert.strictEqual(enemy.health, 0);
    enemy.dispose();
  });

  QUnit.test("a push throws it back along the road: it slides, and does not jump, and is back by the time the glide is over", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "pushed");
    for (let i = 0; i < 20; i++) enemy.update(0.5);
    enemy.status.apply("stun", 100); // so that it does not walk while it is pushed, and the slide is all that there is to see
    enemy.update(0.01);
    const before = { distance: enemy.walker.distance, x: enemy.x, z: enemy.z };
    enemy.afflict("push");

    assert.strictEqual(enemy.walker.distance, before.distance, "not at once");
    enemy.update(EFFECTS.push.glide / 2);
    const half = enemy.walker.distance;
    assert.true(half < before.distance && half > before.distance - EFFECTS.push.distance, "half way back after half the time");
    enemy.update(EFFECTS.push.glide);
    assert.true(Math.abs(enemy.walker.distance - (before.distance - EFFECTS.push.distance)) < 1e-9);
    assert.true(Math.hypot(enemy.x - before.x, enemy.z - before.z) > 0.5, "and it has moved on the board");
    enemy.dispose();
  });

  QUnit.test("it takes as much of an effect as the table says: a push moves a heavy trooper less than a grunt", (assert) => {
    const grunt = new Enemy(scene, loaded, "grunt", route, "push grunt");
    const heavy = new Enemy(scene, loaded, "heavy", route, "push heavy");
    grunt.walker.distance = 10;
    heavy.walker.distance = 10;
    grunt.afflict("push");
    heavy.afflict("push");

    assert.true(Math.abs(grunt.walker.slide - EFFECTS.push.distance) < 1e-9);
    assert.true(Math.abs(heavy.walker.slide - EFFECTS.push.distance * ENEMIES.heavy.affected.push) < 1e-9);
    grunt.dispose();
    heavy.dispose();
  });

  QUnit.test("a bigger potency is a bigger effect", (assert) => {
    const a = new Enemy(scene, loaded, "grunt", route, "potent a");
    const b = new Enemy(scene, loaded, "grunt", route, "potent b");
    a.walker.distance = 10;
    b.walker.distance = 10;
    a.afflict("push", 1);
    b.afflict("push", 2);

    assert.true(Math.abs(b.walker.slide - a.walker.slide - EFFECTS.push.distance) < 1e-9);
    a.dispose();
    b.dispose();
  });

  QUnit.test("afflict says whether it took: an enemy that is immune takes nothing, and an enemy that has fallen takes nothing", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "takes");

    assert.true(enemy.afflict("slow"));
    enemy.affected = { slow: 0 };
    assert.false(enemy.afflict("slow"), "affected not at all");
    enemy.hurt(1000);
    assert.false(enemy.afflict("burn"), "fallen");
    assert.false(enemy.status.has("burn"));
    enemy.dispose();
  });

  QUnit.test("an enemy that is stunned is not walking: a fallen one is not stunned and does not move in its death", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "falls");
    enemy.afflict("burn");
    enemy.hurt(1000);
    const at = enemy.walker.distance;
    enemy.update(1);

    assert.strictEqual(enemy.walker.distance, at);
    enemy.dispose();
  });

});
