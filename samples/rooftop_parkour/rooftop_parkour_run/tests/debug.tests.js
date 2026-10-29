QUnit.module("boxMeshSpec", () => {
  QUnit.test("gives the size of a box and the place of its middle", (assert) => {
    const spec = boxMeshSpec({ minX: 2, maxX: 8, minY: 0, maxY: 30, minZ: -10, maxZ: -4 });
    assert.deepEqual(spec, { width: 6, height: 30, depth: 6, x: 5, y: 15, z: -7 });
  });

  QUnit.test("a box on the ground has its middle half its height up", (assert) => {
    const spec = boxMeshSpec({ minX: 0, maxX: 1, minY: 0, maxY: 17, minZ: 0, maxZ: 1 });
    assert.strictEqual(spec.y, 8.5);
  });

  QUnit.test("every building box of the plan has a size above 0", (assert) => {
    for (const box of buildingBoxes()) {
      const spec = boxMeshSpec(box);
      assert.true(spec.width > 0 && spec.height > 0 && spec.depth > 0, box.name);
    }
  });
});

QUnit.module("DebugBoxes", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  const boxes = [
    { name: "a", minX: 0, maxX: 4, minY: 0, maxY: 10, minZ: 0, maxZ: 6 },
    { name: "b", minX: 10, maxX: 12, minY: 0, maxY: 5, minZ: 0, maxZ: 2 },
  ];

  QUnit.test("makes a mesh for each box, where the box is, and starts hidden", (assert) => {
    const debug = new DebugBoxes(scene, boxes);
    const meshes = debug.root.getChildMeshes();
    assert.strictEqual(meshes.length, 2);
    assert.deepEqual([meshes[0].position.x, meshes[0].position.y, meshes[0].position.z], [2, 5, 3]);
    assert.false(debug.visible);
  });

  QUnit.test("setVisible shows and hides them all", (assert) => {
    const debug = new DebugBoxes(scene, boxes);
    debug.setVisible(true);
    assert.true(debug.visible);
    assert.true(debug.root.getChildMeshes()[0].isEnabled());
    debug.setVisible(false);
    assert.false(debug.visible);
  });

  QUnit.test("the boxes are drawn as wires, can't be picked, and share one material", (assert) => {
    const debug = new DebugBoxes(scene, boxes);
    const [first, second] = debug.root.getChildMeshes();
    assert.true(debug.material.wireframe);
    assert.false(first.isPickable);
    assert.strictEqual(first.material, second.material);
  });

  QUnit.test("dispose takes them all away", (assert) => {
    const before = scene.meshes.length;
    const debug = new DebugBoxes(scene, boxes);
    assert.strictEqual(scene.meshes.length, before + 2);
    debug.dispose();
    assert.strictEqual(scene.meshes.length, before);
  });
});
