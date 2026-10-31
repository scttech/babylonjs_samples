QUnit.module("staticMotion", () => {
  const motion = STATIC_MODELS.zombie.motion;
  const base = { state: "stalk", gait: 0, time: 0, moving: 0, reach: 0, dying: 0 };

  QUnit.test("a model that stands still sways a little, and does not lean or bob much", (assert) => {
    for (let t = 0; t < 10; t += 0.2) {
      const m = staticMotion({ ...base, state: "lurk", time: t }, motion);
      assert.true(Math.abs(m.roll) <= motion.sway * 0.4 + 1e-9);
      assert.strictEqual(m.pitch, 0);
      assert.true(m.lift <= motion.bob * 0.3 + 1e-9);
    }
  });

  QUnit.test("a walk rocks from side to side with each step, and bobs twice a step", (assert) => {
    const a = staticMotion({ ...base, moving: 1, gait: 0.25 }, motion);
    const b = staticMotion({ ...base, moving: 1, gait: 0.75 }, motion);
    assert.true(a.roll > 0.9 * motion.sway && b.roll < -0.9 * motion.sway, "one way, then the other");
    assert.true(Math.abs(a.lift - b.lift) < 1e-9, "the bob is up at both");
    assert.true(a.pitch > 0, "leaning forward as it goes");
  });

  QUnit.test("a lunge leans well forward, stretches and narrows", (assert) => {
    const walk = staticMotion({ ...base, moving: 1 }, motion);
    const lunge = staticMotion({ ...base, state: "lunge", moving: 1, reach: 1 }, motion);
    assert.true(lunge.pitch > walk.pitch * 2);
    assert.true(lunge.stretch > 1 && lunge.wide < 1);
  });

  QUnit.test("a death topples it backwards, flat, and fades the last of it", (assert) => {
    const early = staticMotion({ ...base, state: "dying", dying: 0.2 }, motion);
    const late = staticMotion({ ...base, state: "dying", dying: 1 }, motion);
    assert.true(early.pitch < 0 && late.pitch === -Math.PI / 2);
    assert.strictEqual(early.opacity, 1);
    assert.strictEqual(late.opacity, 0);
    assert.strictEqual(late.lift, 0);
  });

  QUnit.test("every number is finite for every state, and every model has a motion", (assert) => {
    for (const [name, entry] of Object.entries(STATIC_MODELS)) {
      for (const state of ["lurk", "stalk", "lunge", "recover", "dying"]) for (const moving of [0, 1]) for (const dying of [0, 0.5, 1]) {
        const m = staticMotion({ state, gait: 3.3, time: 7.1, moving, reach: state === "lunge" ? 1 : 0, dying }, entry.motion);
        assert.true(Object.values(m).every(Number.isFinite), `${name} ${state}`);
        assert.true(m.stretch > 0 && m.wide > 0);
      }
    }
  });
});

QUnit.module("the models", () => {
  QUnit.test("every model is in the folder of the assets, has a height in metres, and says how it moves", (assert) => {
    for (const [name, entry] of Object.entries(STATIC_MODELS)) {
      assert.strictEqual(entry.url, `../assets/creatures/${name}.glb`);
      assert.true(entry.height > 0.5 && entry.height < 3, name);
      for (const key of ["sway", "lean", "bob", "squash"]) assert.true(entry.motion[key] >= 0, `${name} ${key}`);
    }
  });

  QUnit.test("two of them are ghosts, and every kind of creature that has models names ones that there are", (assert) => {
    assert.deepEqual(Object.keys(STATIC_MODELS).filter((name) => STATIC_MODELS[name].ghost), ["ghost_enraged", "silhouette"]);
    for (const [kind, table] of Object.entries(CREATURES)) {
      if (!table.models) continue;
      for (const name of table.models) assert.true(name in CREATURE_MODELS && !(STATIC_MODELS[name] || {}).ghost, `${kind}: ${name}`);
    }
  });

  QUnit.test("every kind has a pose and a voice, its own or borrowed", (assert) => {
    for (const [kind, table] of Object.entries(CREATURES)) {
      assert.true(Boolean(table.pose || POSES[kind]), kind);
      assert.strictEqual(typeof POSES[table.pose || kind], "function", kind);
      assert.true(["spider", "ghoul", "skeleton"].includes(table.voice || kind), kind);
    }
  });

  QUnit.test("a creature has the model its number says, always the same one", (assert) => {
    const floater = (id) => new Creature({ id, kind: "floater", position: [0, 0, 5], random: () => 0 });
    assert.strictEqual(modelNameFor(floater(1)), "terror");
    assert.strictEqual(modelNameFor(floater(2)), "abomination");
    assert.strictEqual(modelNameFor(floater(2)), modelNameFor(floater(2)));
    assert.strictEqual(modelNameFor(new Creature({ id: 9, kind: "spider", position: [0, 0, 5] })), "spider", "a kind with no list is its own name");
  });

  QUnit.test("a ghost has a model or not by its own number, and never when there are none or the chance is none", (assert) => {
    const names = ["ghost_enraged", "silhouette"];
    let some = 0;
    for (let id = 1; id <= 200; id++) {
      const name = ghostModelFor(id, names, 0.5);
      if (name) { some += 1; assert.true(names.includes(name)); }
      assert.strictEqual(ghostModelFor(id, names, 0.5), name, "the same every time");
      assert.strictEqual(ghostModelFor(id, [], 1), null);
      assert.strictEqual(ghostModelFor(id, names, 0), null);
      assert.true(ghostModelFor(id, names, 1) !== null);
    }
    assert.true(some > 60 && some < 140, `${some} of 200`);
  });
});

QUnit.module("the new kinds", () => {
  const player = { position: [0, 1.4, 0] };

  QUnit.test("a floater floats where it is put, and does not fall", (assert) => {
    const floater = new Creature({ id: 1, kind: "floater", position: [0, 0, 6], random: () => 0 });
    assert.strictEqual(floater.state, "lurk");
    assert.strictEqual(floater.position[1], CREATURES.floater.hover);
    for (let i = 0; i < 100; i++) floater.update(0.05, player);
    assert.strictEqual(floater.position[1], CREATURES.floater.hover);
  });

  QUnit.test("a doll, a floater and a horde come at the player, lunge and touch, like the others", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) {
      const creature = new Creature({ id: 1, kind, position: [0, 0, 5], table: { ...CREATURES[kind], creep: { patience: [0.5, 0.5] } }, random: () => 0 });
      creature.state = "stalk";
      creature.yaw = Math.PI;
      const told = [];
      for (let t = 0; t < 20; t += 0.05) {
        creature.update(0.05, player);
        told.push(...creature.events);
        creature.events = [];
      }
      assert.true(told.includes("lunge") && told.includes("touch"), kind);
    }
  });

  QUnit.test("they have a pose even with no model, borrowed from the ghoul", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) {
      const creature = new Creature({ id: 1, kind, position: [0, 0, 5] });
      assert.true(creature.pose().bones.length > 5, kind);
    }
  });

  QUnit.test("the director may send them, from the intensity the table says", (assert) => {
    for (const kind of ["doll", "floater", "horde"]) assert.true(HUNT.kinds.some((k) => k.kind === kind), kind);
    const random = () => 0.5;
    assert.true(chooseKind(1, 0.5, HUNT, random).kind === "spider");
    const high = new Set();
    let n = 0;
    const spread = () => ((n++ * 0.137) % 1);
    for (let i = 0; i < 400; i++) high.add(chooseKind(1, 2.5, HUNT, spread).kind);
    assert.true(high.has("floater") && high.has("horde") && high.has("doll"));
  });
});

QUnit.module("real models", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    return { engine, scene: new BABYLON.Scene(engine) };
  };

  QUnit.test("every model in the table loads from the assets folder, and has a mesh in it", async (assert) => {
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, STATIC_MODELS);
    assert.deepEqual([...loaded.keys()].sort(), Object.keys(STATIC_MODELS).sort(), "none was left out");
    for (const [name, model] of loaded) assert.true(model.container.meshes.length > 0, name);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a model is fitted: as tall as the table says, with its feet on the floor, in the middle", async (assert) => {
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { zombie: STATIC_MODELS.zombie, doll: STATIC_MODELS.doll });
    for (const [name, model] of loaded) {
      const fitted = new FittedModel(scene, model, name);
      const { min, max } = fitted.pivot.getHierarchyBoundingVectors(true);
      assert.true(Math.abs(max.y - min.y - model.entry.height) < 0.02, `${name}: ${(max.y - min.y).toFixed(3)} m`);
      assert.true(Math.abs(min.y) < 0.02, `${name}: feet at ${min.y.toFixed(3)}`);
      assert.true(Math.abs((min.x + max.x) / 2) < 0.02 && Math.abs((min.z + max.z) / 2) < 0.02, `${name}: in the middle`);
      fitted.dispose();
    }
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a static body is put where the creature is, turned, and moved by its motion; and a dead one fades", async (assert) => {
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { zombie: STATIC_MODELS.zombie });
    const creature = new Creature({ id: 1, kind: "ghoul", position: [2, 0, 5], random: () => 0 });
    creature.yaw = 0.8;
    const body = makeCreatureBody(scene, creature, null, null, loaded);
    assert.true(body instanceof StaticBody);
    body.update();
    assert.deepEqual([body.root.position.x, body.root.position.z], [2, 5]);
    assert.strictEqual(body.root.rotation.y, 0.8);
    creature.hit(100);
    creature.update(CREATURES.ghoul.deathTime * 0.95, { position: [0, 1.4, 0] });
    body.update();
    assert.true(body.root.rotation.x < -1, "toppled");
    assert.true(body.fitted.meshes.every((mesh) => mesh.visibility < 0.5), "and mostly gone");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a ghost model floats where the ghost is, turned, and as faint as it is", async (assert) => {
    const { engine, scene } = make();
    const loaded = await loadCreatureModels(scene, { silhouette: STATIC_MODELS.silhouette });
    const ghost = new Apparition({ id: 3, home: [1, 0, 4], delay: 0 });
    const body = new GhostModelBody(scene, ghost, loaded.get("silhouette"));
    ghost.update(0.1, [8, 1.4, 4]);
    body.update();
    assert.true(body.root.isEnabled());
    assert.strictEqual(body.root.position.x, ghost.position()[0]);
    assert.true(body.fitted.meshes[0].visibility < 0.5, "it is only just there");
    ghost.update(6, [8, 1.4, 4]);
    body.update();
    assert.true(body.fitted.meshes[0].visibility > 0.2, "and there");
    const waiting = new GhostModelBody(scene, new Apparition({ id: 4, home: [0, 0, 4], delay: 9 }), loaded.get("silhouette"));
    waiting.update();
    assert.false(waiting.root.isEnabled(), "a ghost that has not begun is not there");
    body.dispose();
    waiting.dispose();
    scene.dispose();
    engine.dispose();
  });
});
