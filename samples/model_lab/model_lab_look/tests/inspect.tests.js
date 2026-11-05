QUnit.module("describeModel, of the real models", (hooks) => {
  let engine, scene, fire, heavy;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    const a = await loadModelFile(scene, "../assets/characters/fire.glb");
    const b = await loadModelFile(scene, "../assets/characters/heavy.glb");
    fire = describeModel(a.container, a.info);
    heavy = describeModel(b.container, b.info);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("knows where it came from", (assert) => {
    assert.strictEqual(fire.name, "fire");
    assert.ok(fire.bytes > 1000000);
  });

  QUnit.test("finds the one skinned mesh of a character, with a material", (assert) => {
    const skinned = fire.meshes.filter((mesh) => mesh.skinned);
    assert.strictEqual(skinned.length, 1);
    assert.ok(skinned[0].triangles > 1000);
    assert.ok(skinned[0].material);
  });

  QUnit.test("counts the bones of the skeleton", (assert) => {
    assert.strictEqual(fire.skeletons.length, 1);
    assert.ok(fire.skeletons[0].bones >= 24);
  });

  QUnit.test("lists the clips with names and lengths in seconds", (assert) => {
    assert.strictEqual(fire.clips.length, 12);
    assert.ok(fire.clips.some((clip) => /run/i.test(clip.name)));
    for (const clip of fire.clips) assert.ok(clip.seconds > 0 && clip.seconds < 60, clip.name);
    assert.strictEqual(heavy.clips.length, 4);
  });

  QUnit.test("finds a material and the pictures on it, with their sizes", (assert) => {
    assert.strictEqual(fire.materials.length, 1);
    assert.strictEqual(fire.textures.length, 3);
    for (const texture of fire.textures) assert.ok(texture.width > 0 && texture.height > 0, texture.name);
  });

  QUnit.test("the totals are the sums over the meshes", (assert) => {
    assert.strictEqual(fire.totals.triangles, fire.meshes.reduce((sum, mesh) => sum + mesh.triangles, 0));
    assert.ok(fire.totals.vertices > 0);
  });

  QUnit.test("measures a person the size of a person, once the file's scale is counted", (assert) => {
    const units = guessUnits(fire.size.y);
    assert.true(units.sure);
    const metres = heightInMetres(fire.size.y);
    assert.ok(metres > 1 && metres < 2.6, `${metres} m`);
  });

  QUnit.test("a character is taller than it is wide", (assert) => {
    assert.ok(fire.size.y > fire.size.x);
  });
});

QUnit.module("describeMesh, triangleCount, measureModel", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a box has eight corners that are drawn as twenty-four vertices and twelve triangles", (assert) => {
    const mesh = BABYLON.MeshBuilder.CreateBox("crate", { size: 1 }, scene);
    assert.strictEqual(triangleCount(mesh), 12);
    const described = describeMesh(mesh);
    assert.strictEqual(described.vertices, 24);
    assert.false(described.skinned);
    assert.strictEqual(described.material, null);
  });

  QUnit.test("measureModel boxes a model that is moved and scaled", (assert) => {
    const root = new BABYLON.TransformNode("root", scene);
    const mesh = BABYLON.MeshBuilder.CreateBox("crate", { size: 1 }, scene);
    mesh.parent = root;
    root.scaling.setAll(10);
    root.position.y = 5;
    const bounds = measureModel([root]);
    assert.ok(Math.abs(bounds.size.x - 10) < 1e-6);
    assert.ok(Math.abs(bounds.min.y - 0) < 1e-6);
  });
});
