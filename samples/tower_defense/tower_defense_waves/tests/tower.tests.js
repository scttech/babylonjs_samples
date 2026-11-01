QUnit.module("idleAt", () => {
  QUnit.test("begins with the first, and goes on to the next every period, and round again", (assert) => {
    assert.strictEqual(idleAt(2, 0, 7), 0);
    assert.strictEqual(idleAt(2, 6.99, 7), 0);
    assert.strictEqual(idleAt(2, 7, 7), 1);
    assert.strictEqual(idleAt(2, 14, 7), 0);
  });

  QUnit.test("a bender with one idle is always on it", (assert) => {
    for (const time of [0, 3, 7, 100]) assert.strictEqual(idleAt(1, time, 7), 0);
  });

  QUnit.test("uses the period in the TOWER_VIEW table if it is not given one", (assert) => {
    assert.strictEqual(idleAt(3, TOWER_VIEW.idlePeriod * 2.5), 2);
  });
});

QUnit.module("muzzleAt", () => {
  const at = { x: 10, z: -4 };
  const muzzle = { x: 0.2, y: 1, z: 0.5 };

  QUnit.test("facing straight ahead, the hand is a little ahead (more z), and as high as the podium plus the hand", (assert) => {
    const p = muzzleAt(at, 1.4, 0, muzzle, 2);

    assert.true(Math.abs(p.x - (10 + 0.4)) < 1e-9);
    assert.true(Math.abs(p.y - (1.4 + 2)) < 1e-9);
    assert.true(Math.abs(p.z - (-4 + 1)) < 1e-9);
  });

  QUnit.test("turned a quarter, ahead is to the right (more x) and the right is behind (less z)", (assert) => {
    const p = muzzleAt(at, 0, Math.PI / 2, { x: 0, y: 0, z: 1 }, 1);

    assert.true(Math.abs(p.x - 11) < 1e-9 && Math.abs(p.z + 4) < 1e-9);
    const q = muzzleAt(at, 0, Math.PI / 2, { x: 1, y: 0, z: 0 }, 1);

    assert.true(Math.abs(q.x - 10) < 1e-9 && Math.abs(q.z - -5) < 1e-9);
  });

  QUnit.test("turning does not change how far the hand is from the tower, or how high", (assert) => {
    for (const yaw of [0, 1, 2, -2, 3]) {
      const p = muzzleAt(at, 1, yaw, muzzle, 1.5);

      assert.true(Math.abs(Math.hypot(p.x - at.x, p.z - at.z) - Math.hypot(0.2, 0.5) * 1.5) < 1e-9, `${yaw}`);
      assert.true(Math.abs(p.y - (1 + 1.5)) < 1e-9);
    }
  });

  QUnit.test("a half turn puts it on the other side", (assert) => {
    const p = muzzleAt(at, 0, Math.PI, { x: 0, y: 0, z: 1 }, 1);

    assert.true(Math.abs(p.z - -5) < 1e-9);
  });
});

QUnit.module("a Tower", (hooks) => {
  let engine, scene, loaded;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadBenders(scene);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const foe = (x, z, progress = 0.5) => ({ x, z, progress, done: false });
  const bounds = (node) => {
    node.computeWorldMatrix(true);
    node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    return node.getHierarchyBoundingVectors(true);
  };

  QUnit.test("it stands in the middle of its cell", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `centered ${kind}`);
      const { x, z } = cellCenter(3, 2);

      assert.true(Math.abs(tower.node.position.x - x) < 1e-9 && Math.abs(tower.node.position.z - z) < 1e-9, kind);
      tower.dispose();
    }
  });

  QUnit.test("its podium stands on the ground, and fits in the cell", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `podium ${kind}`);
      const { min, max } = bounds(tower.podiumCopy.rootNodes[0].parent);
      const { x, z } = cellCenter(3, 2);

      assert.true(Math.abs(min.y) < 0.02, `${kind} stands at ${min.y.toFixed(3)}`);
      assert.true(max.x - min.x < BOARD.cell && max.z - min.z < BOARD.cell, kind);
      assert.true(Math.abs((min.x + max.x) / 2 - x) < 0.05 && Math.abs((min.z + max.z) / 2 - z) < 0.05, `${kind} is centered`);
      tower.dispose();
    }
  });

  QUnit.test("the bender's feet are on top of the podium", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `feet ${kind}`);
      const podium = bounds(tower.podiumCopy.rootNodes[0].parent);
      const bender = bounds(tower.copy.rootNodes[0].parent);

      assert.true(Math.abs(bender.min.y - podium.max.y) < 0.03, `${kind}: feet ${bender.min.y.toFixed(3)}, top ${podium.max.y.toFixed(3)}`);
      tower.dispose();
    }
  });

  QUnit.test("the whole tower is under the roof of the view", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `roof ${kind}`);

      assert.true(bounds(tower.node).max.y < BOARD.headroom, kind);
      tower.dispose();
    }
  });

  QUnit.test("it begins playing its first idle, and nothing else", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `idle ${kind}`);
      const playing = tower.copy.animationGroups.filter((group) => group.isPlaying);

      assert.strictEqual(playing.length, 1, kind);
      assert.strictEqual(playing[0], tower.idles[tower.idleNow], kind);
      assert.true(playing[0].loopAnimation, kind);
      tower.dispose();
    }
  });

  QUnit.test("every clip fades into the one before it", (assert) => {
    const tower = new Tower(scene, loaded, "air", 3, 2, "blend");

    assert.true(tower.copy.animationGroups.every((group) => group.enableBlending === true && group.blendingSpeed === TOWER_VIEW.blending));
    tower.dispose();
  });

  QUnit.test("with nothing to shoot at it gives no shots, and goes on idling", (assert) => {
    const tower = new Tower(scene, loaded, "water", 3, 2, "quiet");

    for (let i = 0; i < 100; i++) assert.deepEqual(tower.update(0.05, []), []);
    assert.strictEqual(tower.brain.state, "idle");
    assert.true(tower.idles[0].isPlaying);
    tower.dispose();
  });

  QUnit.test("the bender turns as the brain says", (assert) => {
    const tower = new Tower(scene, loaded, "water", 3, 2, "turner");
    tower.update(0.05, [foe(tower.at.x + 3, tower.at.z)]);

    assert.strictEqual(tower.turner.rotation.y, tower.brain.yaw);
    assert.notStrictEqual(tower.turner.rotation.y, BRAIN.rest);
    tower.dispose();
  });

  QUnit.test("it attacks an enemy that comes in range: the attack clip plays, at its speed, and nothing else", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `attack ${kind}`);
      const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
      let started = false;
      for (let i = 0; i < 100 && !started; i++) {
        tower.update(0.05, [enemy]);
        started = tower.brain.state === "attacking";
      }
      const playing = tower.copy.animationGroups.filter((group) => group.isPlaying);

      assert.true(started, `${kind} began an attack`);
      assert.deepEqual(playing, [tower.attackClip], kind);
      assert.strictEqual(tower.attackClip.speedRatio, BENDERS[kind].attack.speed, kind);
      assert.false(tower.attackClip.loopAnimation, kind);
      tower.dispose();
    }
  });

  QUnit.test("when the attack is over it goes back to its idle", (assert) => {
    const tower = new Tower(scene, loaded, "earth", 3, 2, "return");
    const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
    for (let i = 0; i < 200; i++) tower.update(0.05, [enemy]);
    tower.update(0.05, []);
    for (let i = 0; i < 100; i++) tower.update(0.05, []);

    assert.strictEqual(tower.brain.state, "idle");
    assert.deepEqual(tower.copy.animationGroups.filter((group) => group.isPlaying), [tower.idles[tower.idleNow]]);
    tower.dispose();
  });

  QUnit.test("it fires: a shot says who at, where from, and in what color", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const tower = new Tower(scene, loaded, kind, 3, 2, `shot ${kind}`);
      const enemy = foe(tower.at.x + 1, tower.at.z + 1.5);
      const shots = [];
      for (let i = 0; i < 100; i++) shots.push(...tower.update(0.02, [enemy]));

      assert.true(shots.length >= 1, `${kind} fired`);
      assert.strictEqual(shots[0].enemy, enemy, kind);
      assert.strictEqual(shots[0].color, spec.color, kind);
      assert.strictEqual(shots[0].damage, spec.damage, kind);
      assert.true(shots[0].muzzle.y > tower.top, `${kind}: the hand is above the podium`);
      tower.dispose();
    }
  });

  QUnit.test("and the muzzle is where the hand really is when it fires", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const name = `muzzle ${kind}`;
      const tower = new Tower(scene, loaded, kind, 3, 2, name);
      const enemy = foe(tower.at.x + 1.5, tower.at.z + 2);
      let shot = null;
      for (let i = 0; i < 200 && !shot; i++) shot = tower.update(0.02, [enemy])[0];
      // The animation in the scene is played by the clock, which does not run here: put the clip where it would
      // be, on its own and with no fade from the idle (a fade takes a few frames of the clock, too).
      const clip = tower.attackClip;
      tower.copy.animationGroups.forEach((group) => {
        group.stop();
        group.enableBlending = false;
      });
      clip.start(false, 1);
      clip.pause();
      clip.goToFrame(clip.from + (clip.to - clip.from) * spec.attack.hitAt);
      tower.node.computeWorldMatrix(true);
      tower.copy.rootNodes[0].computeWorldMatrix(true);
      const hands = ["LeftHand", "RightHand"].map((hand) => {
        const node = scene.getTransformNodeByName(`${name} bender mixamorig:${hand}`);
        node.computeWorldMatrix(true);
        return node.getAbsolutePosition();
      });
      const nearest = Math.min(...hands.map((p) => Math.hypot(p.x - shot.muzzle.x, p.y - shot.muzzle.y, p.z - shot.muzzle.z)));

      assert.true(nearest < 0.15, `${kind}: ${nearest.toFixed(3)} from a hand`);
      tower.dispose();
    }
  });

  QUnit.test("through the whole attack the bender stays over its podium: the hips do not wander", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const name = `stay ${kind}`;
      const tower = new Tower(scene, loaded, kind, 3, 2, name);
      const hips = scene.getTransformNodeByName(`${name} bender mixamorig:Hips`);
      const clip = tower.attackClip;
      clip.start(false, 1);
      clip.pause();
      let farthest = 0;
      for (let i = 0; i <= 24; i++) {
        clip.goToFrame(clip.from + ((clip.to - clip.from) * i) / 24);
        tower.node.computeWorldMatrix(true);
        hips.computeWorldMatrix(true);
        const p = hips.getAbsolutePosition();
        farthest = Math.max(farthest, Math.hypot(p.x - tower.at.x, p.z - tower.at.z));
      }

      assert.true(farthest < 0.1, `${kind}: furthest from the middle ${farthest.toFixed(3)} (a cell is ${BOARD.cell})`);
      assert.true(spec.attack.seconds > 0);
      tower.dispose();
    }
  });

  QUnit.test("a bender with two idles changes from one to the other as time goes by", (assert) => {
    const tower = new Tower(scene, loaded, "air", 0, 0, "two idles");
    const seen = new Set();
    for (let i = 0; i < 400; i++) {
      tower.update(0.05, []);
      seen.add(tower.idleNow);
    }

    assert.deepEqual([...seen].sort(), [0, 1]);
    assert.strictEqual(tower.copy.animationGroups.filter((group) => group.isPlaying).length, 1, "and only one plays");
    tower.dispose();
  });

  QUnit.test("two towers do not share a skeleton or a clip, so each is in a pose of its own", (assert) => {
    const a = new Tower(scene, loaded, "fire", 1, 1, "own a");
    const b = new Tower(scene, loaded, "fire", 2, 1, "own b");

    assert.notStrictEqual(a.copy.skeletons[0], b.copy.skeletons[0]);
    assert.notStrictEqual(a.attackClip, b.attackClip);
    a.dispose();
    b.dispose();
  });

  QUnit.test("a tower that is taken away leaves nothing behind", (assert) => {
    const meshes = scene.meshes.length;
    const groups = scene.animationGroups.length;
    const skeletons = scene.skeletons.length;
    const nodes = scene.transformNodes.length;
    const tower = new Tower(scene, loaded, "water", 4, 4, "gone");
    assert.true(scene.animationGroups.length > groups);
    tower.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.animationGroups.length, groups);
    assert.strictEqual(scene.skeletons.length, skeletons);
    assert.strictEqual(scene.transformNodes.length, nodes);
  });
});
