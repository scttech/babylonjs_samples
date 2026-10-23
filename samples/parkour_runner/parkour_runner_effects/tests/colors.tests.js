QUnit.module("RUNNER_COLORS", () => {
  QUnit.test("there are a few to choose from, each with a name and two hex colors", (assert) => {
    assert.true(RUNNER_COLORS.length >= 3);
    for (const color of RUNNER_COLORS) {
      assert.true(color.name.length > 0, color.id);
      assert.true(/^#[0-9a-f]{6}$/.test(color.body), `${color.id} body`);
      assert.true(/^#[0-9a-f]{6}$/.test(color.joints), `${color.id} joints`);
    }
  });

  QUnit.test("every id is different, so a saved id means one color", (assert) => {
    assert.strictEqual(new Set(RUNNER_COLORS.map((c) => c.id)).size, RUNNER_COLORS.length);
  });

  QUnit.test("no two have the same look", (assert) => {
    const looks = RUNNER_COLORS.map((c) => c.body + c.joints);

    assert.strictEqual(new Set(looks).size, RUNNER_COLORS.length);
  });

  QUnit.test("the default is the first, and is the model's own colors", (assert) => {
    assert.strictEqual(DEFAULT_COLOR, RUNNER_COLORS[0].id);
    assert.strictEqual(RUNNER_COLORS[0].body, "#cc670b");
    assert.strictEqual(RUNNER_COLORS[0].joints, "#6722b5");
  });
});

QUnit.module("colorById", () => {
  QUnit.test("finds a color by its id", (assert) => {
    for (const color of RUNNER_COLORS) assert.strictEqual(colorById(color.id), color);
  });

  QUnit.test("an id that isn't one of them gives the default", (assert) => {
    assert.strictEqual(colorById("plaid"), RUNNER_COLORS[0]);
  });

  QUnit.test("so does no id at all", (assert) => {
    assert.strictEqual(colorById(undefined), RUNNER_COLORS[0]);
    assert.strictEqual(colorById(null), RUNNER_COLORS[0]);
    assert.strictEqual(colorById(""), RUNNER_COLORS[0]);
  });
});

// Painting needs `BABYLON.Color3.FromHexString`, so these tests stand one in for it
// instead of loading the real engine.
QUnit.module("tintRunner", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  hooks.beforeEach(() => {
    globalScope.BABYLON = { Color3: { FromHexString: (hex) => ({ hex }) } };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  // A character: a node whose meshes have the materials with these names.
  const characterWith = (...names) => {
    const meshes = names.map((name) => ({ material: name ? { name, albedoColor: null } : null }));
    return { getChildMeshes: () => meshes };
  };

  QUnit.test("paints the body material with the body color, and the joints with the joints color", (assert) => {
    const root = characterWith(BODY_MATERIAL, JOINTS_MATERIAL);
    const ocean = colorById("ocean");

    tintRunner(root, ocean);

    const [body, joints] = root.getChildMeshes();
    assert.deepEqual(body.material.albedoColor, { hex: ocean.body });
    assert.deepEqual(joints.material.albedoColor, { hex: ocean.joints });
  });

  QUnit.test("leaves materials it doesn't know alone", (assert) => {
    const root = {
      meshes: [{ material: { name: "Something_Else", albedoColor: "untouched" } }],
      getChildMeshes() {
        return this.meshes;
      },
    };

    tintRunner(root, RUNNER_COLORS[1]);

    assert.strictEqual(root.meshes[0].material.albedoColor, "untouched");
  });

  QUnit.test("copes with a mesh that has no material", (assert) => {
    const root = characterWith(null, BODY_MATERIAL);
    const ocean = colorById("ocean");

    tintRunner(root, ocean);

    assert.deepEqual(root.getChildMeshes()[1].material.albedoColor, { hex: ocean.body });
  });

  QUnit.test("can be done again with another color", (assert) => {
    const meshes = [{ material: { name: BODY_MATERIAL, albedoColor: null } }];
    const root = { getChildMeshes: () => meshes };

    tintRunner(root, colorById("ocean"));
    tintRunner(root, colorById("neon"));

    assert.deepEqual(meshes[0].material.albedoColor, { hex: colorById("neon").body });
  });
});
