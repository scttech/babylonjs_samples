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
  QUnit.test("the spider has no model yet, and is shapes; the skeleton has one with clips of its own; the others are moved from outside", (assert) => {
    assert.strictEqual(CREATURE_MODELS.spider, null);
    assert.true(CREATURE_MODELS.skeleton.url.endsWith("skeleton.glb"));
    assert.deepEqual(Object.keys(CREATURE_MODELS.skeleton.clips).sort(), ["idle", "lunge", "recover", "walk"]);
    for (const name of ["zombie", "doll", "abomination", "terror", "horde"]) assert.true(CREATURE_MODELS[name].url.endsWith(`${name}.glb`), name);
  });

  QUnit.test("only the kinds that have an entry are loaded, and one that fails is left out", async (assert) => {
    const asked = [];
    const loader = { LoadAssetContainerAsync: async (folder, file) => { const url = folder + file; asked.push(url); if (url === "bad.glb") throw new Error("no"); return { url }; } };
    const warn = console.warn;
    console.warn = () => {};
    const loaded = await loadCreatureModels(null, { spider: { url: "good.glb" }, ghoul: null, skeleton: { url: "bad.glb" } }, loader);
    console.warn = warn;
    assert.deepEqual(asked, ["good.glb", "bad.glb"]);
    assert.deepEqual([...loaded.keys()], ["spider"]);
  });

  QUnit.test("the clip follows what the creature is doing, and a model with no clip for something uses its idle one", (assert) => {
    const clips = CREATURE_MODELS.skeleton.clips;
    assert.strictEqual(ModelBody.clipFor("lurk", clips), "Walking", "this model has no idle: a very slow walk");
    assert.strictEqual(ModelBody.clipFor("stalk", clips), "Walking");
    assert.strictEqual(ModelBody.clipFor("lunge", clips), "Running");
    assert.strictEqual(ModelBody.clipFor("recover", clips), "Zombie_Scream");
    assert.strictEqual(ModelBody.clipFor("dying", clips), null, "and no death: it is stopped and toppled");
    assert.strictEqual(ModelBody.clipFor("stalk", { idle: "Idle" }), "Idle", "a model with no walk stands");
    assert.strictEqual(ModelBody.clipFor("recover", { idle: "Idle", walk: "Walk" }), "Idle");
    assert.strictEqual(ModelBody.clipFor("dying", { die: "Death" }), "Death");
  });

  const loadSkeleton = async (scene) => (await loadCreatureModels(scene, { skeleton: CREATURE_MODELS.skeleton })).get("skeleton");

  QUnit.test("the real skeleton loads, with the three clips and a skeleton of bones", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = await loadSkeleton(scene);
    assert.deepEqual(loaded.container.animationGroups.map((g) => g.name).sort(), ["Running", "Walking", "Zombie_Scream"]);
    assert.strictEqual(loaded.container.skeletons.length, 1);
    for (const clip of Object.values(CREATURE_MODELS.skeleton.clips)) assert.true(loaded.container.animationGroups.some((g) => g.name === clip), clip);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a skeleton is fitted, put where the creature is, turned the way it faces, and plays the clip of its state at the table's speed", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = await loadSkeleton(scene);
    const creature = new Creature({ id: 1, kind: "skeleton", position: [2, 0, 5], random: () => 0 });
    creature.yaw = 1;
    const body = makeCreatureBody(scene, creature, null, null, new Map([["skeleton", loaded]]));
    assert.true(body instanceof ModelBody);
    body.update();
    assert.deepEqual([body.root.position.x, body.root.position.z], [2, 5]);
    assert.strictEqual(body.root.rotation.y, 1);
    const { min, max } = body.root.getHierarchyBoundingVectors(true);
    assert.true(Math.abs(max.y - min.y - CREATURE_MODELS.skeleton.height) < 0.03, "as tall as the table says");
    assert.strictEqual(body.current.name.split("-")[0], "Walking");
    assert.strictEqual(body.current.speedRatio, CREATURE_MODELS.skeleton.speeds.idle, "a lurk is a slow walk");
    const walking = body.current;
    creature.state = "stalk";
    body.update();
    assert.strictEqual(body.current, walking, "the same clip, at its own pace now");
    assert.strictEqual(walking.speedRatio, 1);
    creature.state = "lunge";
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Running");
    assert.false(walking.isPlaying);
    creature.state = "recover";
    body.update();
    assert.strictEqual(body.current.name.split("-")[0], "Zombie_Scream");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a dying skeleton stops, and topples, and fades", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = await loadSkeleton(scene);
    const creature = new Creature({ id: 1, kind: "skeleton", position: [0, 0, 5], random: () => 0 });
    const body = new ModelBody(scene, creature, loaded);
    body.update();
    creature.hit(100);
    creature.update(CREATURES.skeleton.deathTime * 0.95, { position: [0, 1.4, 0] });
    body.update();
    assert.true(body.root.rotation.x < -1, "toppled");
    assert.true(body.fitted.meshes.every((m) => m.visibility < 0.5), "and mostly gone");
    assert.false(body.current.isPlaying && !body.current.isPaused, "and not still walking");
    body.dispose();
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a kind with a model is drawn as it, and one without as shapes", async (assert) => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    const loaded = await loadSkeleton(scene);
    const skeleton = new Creature({ id: 1, kind: "skeleton", position: [0, 0, 5], random: () => 0 });
    assert.true(makeCreatureBody(scene, skeleton, creatureMaterials(scene), null, new Map([["skeleton", loaded]])) instanceof ModelBody);
    assert.true(makeCreatureBody(scene, skeleton, creatureMaterials(scene), null, new Map()) instanceof CreatureBody);
    scene.dispose();
    engine.dispose();
  });
});
