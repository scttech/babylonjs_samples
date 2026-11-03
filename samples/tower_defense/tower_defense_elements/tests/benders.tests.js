QUnit.module("the BENDERS table", () => {
  QUnit.test("there are four, one for each nation", (assert) => {
    assert.deepEqual(Object.keys(BENDERS).sort(), ["air", "earth", "fire", "water"]);
  });

  QUnit.test("every bender has a name, two models, a color, a range, a cooldown, an idle and an attack", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      assert.true(spec.name.length > 0, kind);
      assert.true(spec.podium.endsWith(".glb") && spec.file.endsWith(".glb"), kind);
      assert.true(/^#[0-9a-f]{6}$/i.test(spec.color), kind);
      assert.true(spec.range > 0 && spec.cooldown > 0, kind);
      assert.true(spec.damage > 0, kind);
      assert.true(spec.idles.length >= 1, kind);
      assert.true(spec.attack.clip.length > 0 && spec.attack.seconds > 0 && spec.attack.speed > 0, kind);
      assert.true(spec.attack.hits.length >= 1, kind);
    }
  });

  QUnit.test("every hit is at a moment inside the attack, in order, with a place for the hand", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      spec.attack.hits.forEach((hit, i) => {
        assert.true(hit.at > 0 && hit.at < 1, `${kind} hit ${i}`);
        assert.true(i === 0 || hit.at > spec.attack.hits[i - 1].at, `${kind} hit ${i} is after the one before`);
        assert.true(["x", "y", "z"].every((axis) => Number.isFinite(hit.muzzle[axis])), `${kind} hit ${i}`);
      });
    }
  });

  QUnit.test("the fire nation's combo is a punch for every hit: it has more hits than any other attack", (assert) => {
    assert.strictEqual(BENDERS.fire.attack.hits.length, 6);
    for (const kind of ["air", "water", "earth"]) assert.strictEqual(BENDERS[kind].attack.hits.length, 1, kind);
  });

  QUnit.test("so that a hit of the fire nation is small, and a combo is about as much harm as the others do in one go", (assert) => {
    const harm = (kind) => BENDERS[kind].damage * BENDERS[kind].attack.hits.length;

    assert.true(BENDERS.fire.damage < BENDERS.air.damage);
    assert.true(harm("fire") > BENDERS.air.damage && harm("fire") < BENDERS.earth.damage);
  });

  QUnit.test("every bender has an effect, from the table of effects, and no two have the same", (assert) => {
    const kinds = Object.values(BENDERS).map((spec) => spec.effect);

    assert.true(kinds.every((kind) => kind in EFFECTS));
    assert.strictEqual(new Set(kinds).size, 4);
  });

  QUnit.test("the four colors are different", (assert) => {
    assert.strictEqual(new Set(Object.values(BENDERS).map((spec) => spec.color)).size, 4);
  });

  QUnit.test("a tower can shoot further than it is wide, and never across the whole board", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      assert.true(spec.range > BOARD.cell, kind);
      assert.true(spec.range < (BOARD.cols * BOARD.cell) / 2, kind);
    }
  });

  QUnit.test("the air bender, who has the longest reach, shoots the furthest, and the earth bender, whose attack is a punch, the least", (assert) => {
    const ranges = Object.values(BENDERS).map((spec) => spec.range);

    assert.strictEqual(BENDERS.air.range, Math.max(...ranges));
    assert.strictEqual(BENDERS.earth.range, Math.min(...ranges));
  });

  QUnit.test("a tower with its bender on it fits under the roof of the view", (assert) => {
    assert.true(TOWER.benderHeight + TOWER.podiumWidth < BOARD.headroom, "(a podium is no taller than it is wide)");
  });

  QUnit.test("a podium fits in its cell, with room beside it", (assert) => {
    assert.true(TOWER.podiumWidth < BOARD.cell);
  });
});

QUnit.module("holdHips", () => {
  // A group of one track: the hips, with three keys.
  const fakeGroup = (name = HIPS) => {
    const keys = [0, 1, 2].map((i) => ({ frame: i, value: new BABYLON.Vector3(10 + i, 90 + i, 5 - i) }));
    let stored = keys;
    return {
      targetedAnimations: [{ target: { name }, animation: { targetProperty: "position", getKeys: () => stored, setKeys: (k) => (stored = k) } }],
      keys: () => stored,
    };
  };

  QUnit.test("every key is moved to the home place, along and across the ground", (assert) => {
    const group = fakeGroup();
    holdHips(group, { x: 3, z: 7 });

    group.keys().forEach((key) => {
      assert.strictEqual(key.value.x, 3);
      assert.strictEqual(key.value.z, 7);
    });
  });

  QUnit.test("but not the height: a bender still crouches and jumps", (assert) => {
    const group = fakeGroup();
    holdHips(group, { x: 3, z: 7 });

    assert.deepEqual(group.keys().map((key) => key.value.y), [90, 91, 92]);
  });

  QUnit.test("the keys keep their frames", (assert) => {
    const group = fakeGroup();
    holdHips(group, { x: 0, z: 0 });

    assert.deepEqual(group.keys().map((key) => key.frame), [0, 1, 2]);
  });

  QUnit.test("it says it held them", (assert) => {
    assert.true(holdHips(fakeGroup(), { x: 0, z: 0 }));
  });

  QUnit.test("a clip with nothing for the hips is left alone, and it says so", (assert) => {
    const group = fakeGroup("something else");

    assert.false(holdHips(group, { x: 0, z: 0 }));
    assert.strictEqual(group.keys()[0].value.x, 10);
  });

  QUnit.test("hipsHome is where the hips are in the first frame", (assert) => {
    assert.deepEqual(hipsHome(fakeGroup()), { x: 10, z: 5 });
  });
});

QUnit.module("loading benders", (hooks) => {
  let engine, scene, loaded, fresh;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    loaded = await loadBenders(scene);
    fresh = {};
    for (const [kind, spec] of Object.entries(BENDERS)) fresh[kind] = await loadModel(scene, spec.file);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const group = (container, name) => container.animationGroups.find((g) => g.name === name);

  QUnit.test("every bender loads, with every clip the table names", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      for (const clip of [...spec.idles, spec.attack.clip]) assert.true(!!group(loaded[kind].bender.container, clip), `${kind} has ${clip}`);
    }
  });

  QUnit.test("an attack is as long as the table says it is", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const clip = group(loaded[kind].bender.container, spec.attack.clip);

      assert.true(Math.abs((clip.to - clip.from) / 60 - spec.attack.seconds) < 0.02, `${kind}: ${((clip.to - clip.from) / 60).toFixed(3)} against ${spec.attack.seconds}`);
    }
  });

  QUnit.test("the hips of every idle and every attack are held in one place along and across the ground, and the same place for all", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const home = hipsHome(group(loaded[kind].bender.container, spec.idles[0]));
      for (const clip of [...spec.idles, spec.attack.clip]) {
        for (const key of hipsTrack(group(loaded[kind].bender.container, clip)).animation.getKeys()) {
          assert.true(Math.abs(key.value.x - home.x) < 1e-9 && Math.abs(key.value.z - home.z) < 1e-9, `${kind} ${clip}`);
        }
      }
    }
  });

  QUnit.test("they were not held before: without it these attacks do wander", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const xs = hipsTrack(group(fresh[kind], spec.attack.clip)).animation.getKeys().map((key) => key.value.x);
      const zs = hipsTrack(group(fresh[kind], spec.attack.clip)).animation.getKeys().map((key) => key.value.z);

      assert.true(Math.max(...xs) - Math.min(...xs) > 1 || Math.max(...zs) - Math.min(...zs) > 1, kind);
    }
  });

  QUnit.test("holding the hips keeps their height: the bender still moves up and down as the clip says", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const before = hipsTrack(group(fresh[kind], spec.attack.clip)).animation.getKeys().map((key) => key.value.y);
      const after = hipsTrack(group(loaded[kind].bender.container, spec.attack.clip)).animation.getKeys().map((key) => key.value.y);

      assert.deepEqual(after, before, kind);
    }
  });

  QUnit.test("walking and running are left alone, since a tower never plays them", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const keys = hipsTrack(group(loaded[kind].bender.container, "Walking")).animation.getKeys();

      assert.true(Math.max(...keys.map((key) => key.value.z)) - Math.min(...keys.map((key) => key.value.z)) > 0.5, kind);
    }
  });

  QUnit.test("each podium is made the width the TOWER table says, and stands on the ground", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const { podium } = loaded[kind];
      const bounds = measure(podium.container.rootNodes[0]);
      const size = sizeOf(bounds);

      assert.true(Math.abs(Math.max(size.x, size.z) * podium.scale - TOWER.podiumWidth) < 1e-9, kind);
      assert.true(Math.abs(bounds.min.y * podium.scale + podium.lift) < 1e-9, `${kind}: the bottom is at the ground`);
      assert.true(Math.abs(podium.top - size.y * podium.scale) < 1e-9, `${kind}: top is its height`);
    }
  });

  QUnit.test("the podiums are not all the same height, and the tallest is no taller than it is wide", (assert) => {
    const tops = Object.values(loaded).map(({ podium }) => podium.top);

    assert.true(new Set(tops.map((t) => t.toFixed(2))).size > 1);
    assert.true(Math.max(...tops) <= TOWER.podiumWidth * 1.3);
  });

  QUnit.test("each bender is made the height the table says, with its feet at zero", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const { bender } = loaded[kind];
      const bounds = measure(bender.container.rootNodes[0]);

      assert.true(Math.abs(sizeOf(bounds).y * bender.scale - TOWER.benderHeight) < 1e-9, kind);
      assert.true(Math.abs(bounds.min.y * bender.scale + bender.lift) < 1e-9, kind);
    }
  });

  QUnit.test("the tallest tower, podium and bender, is under the roof of the view", (assert) => {
    for (const kind of Object.keys(BENDERS)) assert.true(loaded[kind].podium.top + TOWER.benderHeight < BOARD.headroom, kind);
  });
});

QUnit.module("the numbers in the table, measured again on the real clips", (hooks) => {
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

  // Plays the attack clip of a bender, a frame at a time, and works out which hand is furthest from the hips, and
  // how far, at each of `steps` + 1 moments: [{ reach, x, y, z, dx, dz }].
  const sample = (kind, steps = 120) => {
    const spec = BENDERS[kind];
    const copy = loaded[kind].bender.container.instantiateModelsToScene((name) => `${kind} measure ${name}`, false, { doNotInstantiate: false });
    copy.animationGroups.forEach((g) => g.stop());
    const node = (name) => scene.getTransformNodeByName(`${kind} measure mixamorig:${name}`);
    const hips = node("Hips");
    const hands = [node("LeftHand"), node("RightHand")];
    const clip = copy.animationGroups.find((g) => g.name === `${kind} measure ${spec.attack.clip}`);
    clip.start(true, 1, clip.from, clip.to);
    clip.pause();
    const rows = [];
    for (let i = 0; i <= steps; i++) {
      clip.goToFrame(clip.from + ((clip.to - clip.from) * i) / steps);
      copy.rootNodes[0].computeWorldMatrix(true);
      [hips, ...hands].forEach((n) => n.computeWorldMatrix(true));
      const h = hips.getAbsolutePosition();
      let best = null;
      for (const hand of hands) {
        const p = hand.getAbsolutePosition();
        const reach = Math.hypot(p.x - h.x, p.z - h.z);
        if (!best || reach > best.reach) best = { reach, x: p.x, y: p.y, z: p.z, dx: p.x - h.x, dz: p.z - h.z };
      }
      rows.push(best);
    }
    clip.stop();
    copy.animationGroups.forEach((g) => g.dispose());
    copy.skeletons.forEach((s) => s.dispose());
    copy.rootNodes[0].dispose();
    return rows;
  };

  QUnit.test("at each hit the hand is out nearly as far as it ever goes in the clip", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const rows = sample(kind);
      const best = Math.max(...rows.map((r) => r.reach));
      spec.attack.hits.forEach((hit, i) => {
        const atHit = rows[Math.round(hit.at * 120)];

        assert.true(atHit.reach >= 0.9 * best, `${kind} hit ${i}: ${atHit.reach.toFixed(2)} of ${best.toFixed(2)}`);
      });
    }
  });

  QUnit.test("and the clip points, on average, the way the table says it does", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const rows = sample(kind);
      const aims = spec.attack.hits.map((hit) => Math.atan2(rows[Math.round(hit.at * 120)].dx, rows[Math.round(hit.at * 120)].dz));
      const mean = aims.reduce((sum, aim) => sum + aim, 0) / aims.length;

      assert.true(Math.abs(mean - spec.attack.aim) < 0.06, `${kind}: ${mean.toFixed(2)} against ${spec.attack.aim}`);
    }
  });

  QUnit.test("and the hand is where the table says the muzzle is, at every hit", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const rows = sample(kind);
      spec.attack.hits.forEach((hit, i) => {
        const atHit = rows[Math.round(hit.at * 120)];
        const m = hit.muzzle;

        assert.true(Math.hypot(atHit.x - m.x, atHit.y - m.y, atHit.z - m.z) < 0.1, `${kind} hit ${i}: ${atHit.x.toFixed(2)}, ${atHit.y.toFixed(2)}, ${atHit.z.toFixed(2)}`);
      });
    }
  });

  QUnit.test("the hips stay where they are held, for the whole of the attack", (assert) => {
    for (const kind of Object.keys(BENDERS)) {
      const rows = sample(kind, 30);
      const xs = rows.map((r) => r.x - r.dx);
      const zs = rows.map((r) => r.z - r.dz);

      assert.true(Math.max(...xs) - Math.min(...xs) < 0.01 && Math.max(...zs) - Math.min(...zs) < 0.01, kind);
    }
  });
});
