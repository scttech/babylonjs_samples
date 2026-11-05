QUnit.module("SkeletonView", (hooks) => {
  let engine, scene, container, tree, view;
  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    new BABYLON.ArcRotateCamera("camera", 0, 1, 5, BABYLON.Vector3.Zero(), scene);
    ({ container } = await loadModelFile(scene, "../assets/characters/fire.glb"));
    showModel(container);
    tree = boneTree(container.skeletons[0]);
    view = new SkeletonView(scene);
    view.show(container.skeletons[0], tree, 1.8);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("draws a ball for each joint and one set of lines", (assert) => {
    assert.strictEqual(view.balls.length, 24);
    assert.strictEqual(scene.meshes.filter((mesh) => mesh.name.startsWith("bone-") && mesh.name !== "bone-lines").length, 24);
    assert.ok(scene.getMeshByName("bone-lines"));
  });

  QUnit.test("draws them in a later group than the model, so that they show through it", (assert) => {
    for (const ball of view.balls) assert.strictEqual(ball.renderingGroupId, SKELETON_GROUP);
    assert.ok(SKELETON_GROUP > 0);
  });

  QUnit.test("the balls are at the joints", (assert) => {
    const positions = view.positions();
    view.balls.forEach((ball, index) => assert.ok(ball.position.subtract(positions[index]).length() < 1e-6, tree.nodes[index].short));
  });

  QUnit.test("the picture follows a bone that has moved", (assert) => {
    const hips = findBone(tree, "Hips");
    const before = view.balls[hips].position.y;
    // The bones are in centimetres inside a model that is scaled to metres, so a hundred of them is a metre.
    container.skeletons[0].bones[hips].getTransformNode().position.y += 100;
    view.update(true);
    assert.ok(Math.abs(view.balls[hips].position.y - before - 1) < 1e-3);
  });

  QUnit.test("update(false) hides it, and update(true) shows it again", (assert) => {
    view.update(false);
    assert.notOk(view.balls[0].isEnabled());
    assert.notOk(view.lines.isEnabled());
    view.update(true);
    assert.ok(view.balls[0].isEnabled());
  });

  QUnit.test("the chosen joint looks chosen, and its parent and children look related", (assert) => {
    const spine = findBone(tree, "Spine1");
    view.select(spine);
    assert.strictEqual(view.lookOf(spine), "selected");
    assert.strictEqual(view.lookOf(findBone(tree, "Spine")), "related");
    assert.strictEqual(view.lookOf(findBone(tree, "Spine2")), "related");
    assert.strictEqual(view.lookOf(findBone(tree, "Head")), "normal");
    assert.strictEqual(view.balls[spine].material, view.materials.selected);
  });

  QUnit.test("choosing -1 chooses nothing", (assert) => {
    view.select(findBone(tree, "Head"));
    view.select(-1);
    for (let index = 0; index < 24; index++) assert.strictEqual(view.lookOf(index), "normal");
  });

  QUnit.test("showing another skeleton takes the first one's drawing away", (assert) => {
    view.show(container.skeletons[0], tree, 1.8);
    assert.strictEqual(scene.meshes.filter((mesh) => mesh.name === "bone-Hips").length, 1);
  });

  QUnit.test("clear takes everything away", (assert) => {
    view.clear();
    assert.strictEqual(scene.meshes.filter((mesh) => mesh.name.startsWith("bone-")).length, 0);
    view.update(true);
    assert.deepEqual(view.positions(), []);
  });
});
