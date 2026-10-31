QUnit.module("effects", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    return { engine, scene };
  };

  QUnit.test("the tables make sense", (assert) => {
    for (const table of [EFFECTS.mist, EFFECTS.trail]) {
      assert.true(table.life[0] > 0 && table.life[0] <= table.life[1]);
      assert.true(table.size[0] > 0 && table.size[0] <= table.size[1]);
      assert.true(table.alpha > 0 && table.alpha <= 1);
      assert.true(table.rate > 0);
    }
    assert.true(EFFECTS.mist.alpha < EFFECTS.trail.alpha, "mist is fainter than a ghost's wisps");
  });

  QUnit.test("the puff is a texture with an alpha channel, drawn in code", (assert) => {
    const { scene, engine } = make();
    const texture = softTexture(scene);
    assert.true(texture.hasAlpha);
    assert.strictEqual(texture.getSize().width, 64);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("mist is a system at a point, as the table says", (assert) => {
    const { scene, engine } = make();
    const mist = createMist(scene, [2, 0, 3], softTexture(scene));
    assert.deepEqual([mist.emitter.x, mist.emitter.y, mist.emitter.z], [2, 0, 3]);
    assert.strictEqual(mist.emitRate, EFFECTS.mist.rate);
    assert.strictEqual(mist.minLifeTime, EFFECTS.mist.life[0]);
    assert.strictEqual(mist.maxEmitBox.x, EFFECTS.mist.radius);
    assert.strictEqual(mist.color1.a, EFFECTS.mist.alpha);
    assert.strictEqual(mist.colorDead.a, 0, "it fades to nothing");
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a trail is made on a mesh, and can be let go", (assert) => {
    const { scene, engine } = make();
    const mesh = BABYLON.MeshBuilder.CreateBox("body", {}, scene);
    const trail = createTrail(scene, mesh, softTexture(scene));
    assert.strictEqual(trail.emitter, mesh);
    assert.strictEqual(trail.blendMode, BABYLON.ParticleSystem.BLENDMODE_ADD);
    releaseEffect(trail);
    assert.true(trail.disposeOnStop);
    scene.dispose();
    engine.dispose();
  });
});

QUnit.module("the look of a ghost", () => {
  const make = () => {
    const engine = new BABYLON.NullEngine();
    const scene = new BABYLON.Scene(engine);
    new BABYLON.FreeCamera("eye", new BABYLON.Vector3(0, 1.4, 0), scene);
    registerGhostShader();
    return { engine, scene, texture: softTexture(scene) };
  };

  QUnit.test("the profile is as tall as the ghost of the table, and goes from the hem up", (assert) => {
    const heights = GHOST_LOOK.profile.map(([, y]) => y);
    assert.strictEqual(Math.max(...heights), GHOST.height);
    assert.deepEqual(heights, [...heights].sort((a, b) => a - b));
    assert.true(GHOST_LOOK.profile.every(([radius]) => radius > 0));
  });

  QUnit.test("the shader is where Babylon.js looks for it, and the two halves agree", (assert) => {
    registerGhostShader();
    assert.strictEqual(BABYLON.Effect.ShadersStore.ghostVertexShader, GHOST_VERTEX);
    assert.strictEqual(BABYLON.Effect.ShadersStore.ghostFragmentShader, GHOST_FRAGMENT);
    for (const name of ["vNormalW", "vPositionW", "vHeight"]) {
      assert.true(GHOST_VERTEX.includes(`varying ${name === "vHeight" ? "float" : "vec3"} ${name}`), `${name} is sent`);
      assert.true(GHOST_FRAGMENT.includes(`varying ${name === "vHeight" ? "float" : "vec3"} ${name}`), `${name} is received`);
    }
    for (const name of ["opacity", "color", "cameraPosition", "time"]) assert.true(GHOST_FRAGMENT.includes(`uniform`) && GHOST_FRAGMENT.includes(name));
  });

  QUnit.test("the material is see-through, shows both sides, and adds its light", (assert) => {
    const { scene, engine } = make();
    const material = ghostMaterial(scene, 1);
    assert.false(material.backFaceCulling);
    assert.true(material.needAlphaBlending());
    assert.strictEqual(material.alphaMode, BABYLON.Engine.ALPHA_ADD);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a body has a root, a lathe, two eyes, and a trail", (assert) => {
    const { scene, engine, texture } = make();
    const ghost = new Apparition({ id: 9, home: [1, 0, 4], delay: 0 });
    const body = new GhostBody(scene, ghost, texture);
    assert.strictEqual(body.body.parent, body.root);
    assert.true(body.body.getTotalVertices() > GHOST_LOOK.profile.length * GHOST_LOOK.tessellation, "the profile is smoothed into more points than it has corners");
    assert.strictEqual(body.eyes.length, 2);
    assert.true(body.eyes[0].position.x < 0 && body.eyes[1].position.x > 0, "one on each side");
    assert.true(body.eyes.every((eye) => eye.position.z > 0), "they look out of the front, which is the way it faces");
    assert.strictEqual(body.trail.emitter, body.body);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("update puts it where the numbers say, turned, and as bright as they say", (assert) => {
    const { scene, engine, texture } = make();
    const ghost = new Apparition({ id: 10, home: [1, 0, 4], delay: 0 });
    const body = new GhostBody(scene, ghost, texture);
    ghost.update(3, [8, 1.4, 4]);
    body.update(3);
    const position = ghost.position();
    assert.strictEqual(body.root.position.x, position[0]);
    assert.strictEqual(body.root.position.y, position[1]);
    assert.strictEqual(body.root.rotation.y, ghost.yaw);
    assert.true(body.root.isEnabled());
    assert.strictEqual(body.eyeMaterial.alpha, Math.min(1, ghost.opacity() * 1.5));
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("a ghost that has not begun is not there at all, and its trail makes nothing", (assert) => {
    const { scene, engine, texture } = make();
    const ghost = new Apparition({ id: 11, home: [0, 0, 4], delay: 10 });
    const body = new GhostBody(scene, ghost, texture);
    body.update(0);
    assert.false(body.root.isEnabled());
    assert.strictEqual(body.trail.emitRate, 0);
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("disposing takes everything away", (assert) => {
    const { scene, engine, texture } = make();
    const before = scene.meshes.length;
    const body = new GhostBody(scene, new Apparition({ id: 12, home: [0, 0, 4], delay: 0 }), texture);
    assert.strictEqual(scene.meshes.length, before + 3, "a body and two eyes");
    body.dispose();
    assert.strictEqual(scene.meshes.length, before);
    scene.dispose();
    engine.dispose();
  });
});
