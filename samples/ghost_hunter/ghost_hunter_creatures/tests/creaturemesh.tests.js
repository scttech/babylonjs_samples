QUnit.module("creature bodies", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    return { engine, scene, materials: creatureMaterials(scene), placeholders: new PlaceholderSet({ show: true, kinds: { creature: true } }) };
  };
  const spawn = (kind) => new Creature({ id: 1, kind, position: [1, 0, 4], random: () => 0 });

  QUnit.test("there is a material for every colour a pose can use", (assert) => {
    const { scene, engine, materials } = make();
    for (const name of ["flesh", "bone", "dark", "claw", "eye"]) assert.true(name in materials, name);
    assert.strictEqual(materials.eye.emissiveColor.r, CREATURE_LOOK.colors.eye[0] * CREATURE_LOOK.eyeGlow);
    assert.true(materials.flesh.emissiveColor.r < materials.flesh.diffuseColor.r, "a thing shows only part of its colour in the dark");
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a body draws the pose it is given: a stick for every bone, a ball for every blob", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    for (const kind of ["spider", "ghoul", "skeleton"]) {
      const creature = spawn(kind);
      const body = new CreatureBody(scene, creature, materials, placeholders);
      body.update();
      const pose = creature.pose();
      assert.strictEqual(body.sticks.filter((s) => s.isEnabled()).length, pose.bones.length, kind);
      assert.strictEqual(body.balls.filter((b) => b.isEnabled()).length, pose.blobs.length, kind);
      body.dispose(placeholders);
    }
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a stick runs from one end of its bone to the other", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const body = new CreatureBody(scene, spawn("skeleton"), materials, placeholders);
    body.update();
    const bone = body.creature.pose().bones[0];
    const stick = body.sticks[0];
    const direction = new BABYLON.Vector3(0, 1, 0).applyRotationQuaternion(stick.rotationQuaternion);
    const along = new BABYLON.Vector3(bone.b[0] - bone.a[0], bone.b[1] - bone.a[1], bone.b[2] - bone.a[2]);
    assert.true(Math.abs(stick.scaling.y - along.length()) < 1e-5, "as long as the bone");
    assert.true(Math.abs(BABYLON.Vector3.Dot(direction, along.normalize()) - 1) < 1e-5, "pointing along it");
    assert.true(Math.abs(stick.position.y - (bone.a[1] + bone.b[1]) / 2) < 1e-6, "halfway");
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the root is where the creature is, and turned the way it faces", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const creature = spawn("ghoul");
    creature.yaw = 1.2;
    const body = new CreatureBody(scene, creature, materials, placeholders);
    body.update();
    assert.deepEqual([body.root.position.x, body.root.position.z], [1, 4]);
    assert.strictEqual(body.root.rotation.y, 1.2);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the pool only grows: a pose with fewer parts hides the rest", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const creature = spawn("ghoul");
    const body = new CreatureBody(scene, creature, materials, placeholders);
    body.update();
    const grown = body.sticks.length;
    creature.pose = () => ({ bones: [{ a: [0, 0, 0], b: [0, 1, 0], r: 0.1, color: "bone" }], blobs: [] });
    body.update();
    assert.strictEqual(body.sticks.length, grown);
    assert.strictEqual(body.sticks.filter((s) => s.isEnabled()).length, 1);
    assert.strictEqual(body.balls.filter((b) => b.isEnabled()).length, 0);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a body is a placeholder of its kind, and hiding the placeholders hides it", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const body = new CreatureBody(scene, spawn("spider"), materials, placeholders);
    assert.strictEqual(body.root.metadata.placeholder, "creature");
    assert.true(body.root.isEnabled());
    placeholders.setKind("creature", false);
    assert.false(body.root.isEnabled());
    body.dispose(placeholders);
    assert.strictEqual(placeholders.count("creature"), 0);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("disposing takes the meshes away", (assert) => {
    const { scene, engine, materials, placeholders } = make();
    const before = scene.meshes.length;
    const body = new CreatureBody(scene, spawn("spider"), materials, placeholders);
    body.update();
    assert.true(scene.meshes.length > before + 10);
    body.dispose(placeholders);
    assert.strictEqual(scene.meshes.length, before);
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("models", () => {
  const entry = { url: "x.glb", scale: 2, yaw: 3, clips: { idle: "Idle", walk: "Walk", lunge: "Attack", die: "Death" } };
  const fakeGroup = (name) => ({ name, started: null, stopped: 0, start(loop) { this.started = loop; }, stop() { this.stopped += 1; } });
  const fakeContainer = () => {
    const groups = ["Idle", "Walk", "Attack", "Death"].map(fakeGroup);
    const root = { scaling: new BABYLON.Vector3(1, 1, 1), position: new BABYLON.Vector3(), rotation: new BABYLON.Vector3() };
    return { groups, root, instantiateModelsToScene: () => ({ rootNodes: [root], animationGroups: groups, dispose() { this.disposed = true; } }) };
  };

  QUnit.test("no kind has a model yet, so every kind is drawn as shapes", (assert) => {
    assert.deepEqual(Object.values(CREATURE_MODELS), [null, null, null]);
  });

  QUnit.test("only the kinds that have an entry are loaded, and one that fails is left out", async (assert) => {
    const asked = [];
    const loader = { LoadAssetContainerAsync: async (url) => { asked.push(url); if (url === "bad.glb") throw new Error("no"); return { url }; } };
    const warn = console.warn;
    console.warn = () => {};
    const loaded = await loadCreatureModels(null, { spider: { url: "good.glb" }, ghoul: null, skeleton: { url: "bad.glb" } }, loader);
    console.warn = warn;
    assert.deepEqual(asked, ["good.glb", "bad.glb"]);
    assert.deepEqual([...loaded.keys()], ["spider"]);
  });

  QUnit.test("a model is scaled, put where the creature is, and turned the way it faces, plus what the model needs", (assert) => {
    const container = fakeContainer();
    const creature = new Creature({ id: 1, kind: "spider", position: [2, 0, 5], random: () => 0 });
    creature.yaw = 1;
    const body = new ModelBody(null, creature, { entry, container });
    body.update();
    assert.strictEqual(container.root.scaling.x, 2);
    assert.deepEqual([container.root.position.x, container.root.position.z], [2, 5]);
    assert.strictEqual(container.root.rotation.y, 4);
  });

  QUnit.test("the clip follows what the creature is doing, and only changes when that does", (assert) => {
    assert.strictEqual(ModelBody.clipFor("lurk", entry.clips), "Idle");
    assert.strictEqual(ModelBody.clipFor("stalk", entry.clips), "Walk");
    assert.strictEqual(ModelBody.clipFor("lunge", entry.clips), "Attack");
    assert.strictEqual(ModelBody.clipFor("dying", entry.clips), "Death");
    assert.strictEqual(ModelBody.clipFor("stalk", { idle: "Idle" }), "Idle", "a model with no walk stands");
    const container = fakeContainer();
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 0, 5], random: () => 0 });
    const body = new ModelBody(null, creature, { entry, container });
    body.update();
    const idle = container.groups[0];
    assert.strictEqual(idle.started, true, "idle loops");
    body.update();
    assert.strictEqual(idle.stopped, 1, "and is not started again while it goes on");
    creature.state = "dying";
    body.update();
    assert.strictEqual(container.groups[3].started, false, "death plays once");
  });

  QUnit.test("a kind with a model is drawn as it, and one without as shapes", (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const creature = new Creature({ id: 1, kind: "spider", position: [0, 0, 5], random: () => 0 });
    const withModel = makeCreatureBody(scene, creature, creatureMaterials(scene), null, new Map([["spider", { entry, container: fakeContainer() }]]));
    assert.true(withModel instanceof ModelBody);
    const without = makeCreatureBody(scene, creature, creatureMaterials(scene), null, new Map());
    assert.true(without instanceof CreatureBody);
    scene.dispose();
    engine.dispose();
  });
});
