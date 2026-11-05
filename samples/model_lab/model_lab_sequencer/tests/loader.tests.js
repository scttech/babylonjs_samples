// The models that come with the lab, as the tests find them from tests.html.
const FIRE = "../assets/characters/fire.glb";
const HEAVY = "../assets/characters/heavy.glb";

QUnit.module("looksLikeGlb", () => {
  QUnit.test("a GLB begins with the letters glTF", (assert) => {
    const bytes = new Uint8Array([0x67, 0x6c, 0x54, 0x46, 2, 0, 0, 0, 12, 0, 0, 0]);
    assert.true(looksLikeGlb(bytes.buffer));
  });

  QUnit.test("a picture, an empty file and nothing are not", (assert) => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10, 0, 0, 0, 13]);
    assert.false(looksLikeGlb(png.buffer));
    assert.false(looksLikeGlb(new ArrayBuffer(0)));
    assert.false(looksLikeGlb(null));
  });
});

QUnit.module("modelName", () => {
  QUnit.test("is the file's name without the folders or the ending", (assert) => {
    assert.strictEqual(modelName("../assets/characters/fire.glb"), "fire");
    assert.strictEqual(modelName({ name: "My Knight.final.glb" }), "My Knight.final");
    assert.strictEqual(modelName("a/b/c.glb?cache=1"), "c");
  });
});

QUnit.module("loadModelFile", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("loads a model into a container and says how big the file was", async (assert) => {
    const { container, info } = await loadModelFile(scene, FIRE);
    assert.strictEqual(info.name, "fire");
    assert.ok(info.bytes > 1000000);
    assert.ok(container.meshes.length > 0);
  });

  QUnit.test("puts nothing in the scene until it is shown", async (assert) => {
    const before = scene.meshes.length;
    const { container } = await loadModelFile(scene, HEAVY);
    assert.strictEqual(scene.meshes.length, before);
    showModel(container);
    assert.ok(scene.meshes.length > before);
  });

  QUnit.test("a model that is shown is still: no clip plays", async (assert) => {
    const { container } = await loadModelFile(scene, FIRE);
    showModel(container);
    assert.ok(container.animationGroups.length > 0);
    for (const group of container.animationGroups) assert.notOk(group.isStarted, group.name);
  });

  QUnit.test("removing a model leaves the scene as it was", async (assert) => {
    const before = scene.meshes.length;
    const { container } = await loadModelFile(scene, HEAVY);
    showModel(container);
    removeModel(container);
    assert.strictEqual(scene.meshes.length, before);
  });

  QUnit.test("a file that is not a GLB is refused with a sentence that says what works", async (assert) => {
    const file = new File([new Uint8Array(100)], "picture.png");
    try {
      await loadModelFile(scene, file);
      assert.ok(false, "it should have been refused");
    } catch (error) {
      assert.ok(/GLB/.test(error.message));
    }
  });

  QUnit.test("a file picked from the computer loads like one from the server", async (assert) => {
    const bytes = await (await fetch(HEAVY)).arrayBuffer();
    const { container, info } = await loadModelFile(scene, new File([bytes], "my heavy.glb"));
    assert.strictEqual(info.name, "my heavy");
    assert.strictEqual(info.bytes, bytes.byteLength);
    assert.ok(container.skeletons.length > 0);
  });

  QUnit.test("an address that is not there is an error with a sentence", async (assert) => {
    try {
      await loadModelFile(scene, "../assets/characters/nothing.glb");
      assert.ok(false, "it should have failed");
    } catch (error) {
      assert.ok(/fetched/.test(error.message));
    }
  });
});
