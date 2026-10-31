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

QUnit.module("labelSpec", () => {
  QUnit.test("hangs the name above the middle of the box", (assert) => {
    const spec = labelSpec({ name: "Building_Small_1", minX: 2, maxX: 8, minY: 0, maxY: 30, minZ: -10, maxZ: -4 });
    assert.deepEqual(spec, { text: "Building_Small_1", x: 5, y: 34, z: -7 });
  });

  QUnit.test("how high it hangs can be chosen", (assert) => {
    assert.strictEqual(labelSpec({ name: "a", minX: 0, maxX: 1, minY: 0, maxY: 10, minZ: 0, maxZ: 1 }, 10).y, 20);
  });
});

QUnit.module("ledgeLines", () => {
  QUnit.test("gives the two ends of each ledge, a little above it", (assert) => {
    const lines = ledgeLines([{ ax: 0, az: 1, bx: 4, bz: 1, y: 10 }], 0.1);
    assert.deepEqual(lines, [[{ x: 0, y: 10.1, z: 1 }, { x: 4, y: 10.1, z: 1 }]]);
  });

  QUnit.test("gives a line for each of the ledges of the district", (assert) => {
    const ledges = ledgesOf(buildingBoxes());
    assert.strictEqual(ledgeLines(ledges).length, ledges.length);
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

QUnit.module("DebugLabels", (hooks) => {
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

  QUnit.test("makes a label for each box, above it, that faces the camera, and starts hidden", (assert) => {
    const labels = new DebugLabels(scene, boxes);
    const meshes = labels.root.getChildMeshes();
    assert.strictEqual(meshes.length, 2);
    assert.deepEqual([meshes[0].position.x, meshes[0].position.y, meshes[0].position.z], [2, 14, 3]);
    assert.strictEqual(meshes[0].billboardMode, BABYLON.Mesh.BILLBOARDMODE_ALL);
    assert.false(labels.visible);
  });

  QUnit.test("setVisible shows and hides them all", (assert) => {
    const labels = new DebugLabels(scene, boxes);
    labels.setVisible(true);
    assert.true(labels.visible);
    labels.setVisible(false);
    assert.false(labels.visible);
  });

  QUnit.test("dispose takes them all away", (assert) => {
    const before = scene.meshes.length;
    const labels = new DebugLabels(scene, boxes);
    assert.strictEqual(scene.meshes.length, before + 2);
    labels.dispose();
    assert.strictEqual(scene.meshes.length, before);
  });
});

QUnit.module("DebugLedges", (hooks) => {
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

  const ledges = ledgesOf([{ name: "a", minX: 0, maxX: 4, minY: 0, maxY: 10, minZ: 0, maxZ: 6 }]);

  QUnit.test("makes one mesh of lines for all the ledges, and starts hidden", (assert) => {
    const debug = new DebugLedges(scene, ledges);
    assert.strictEqual(debug.mesh.getTotalVertices(), ledges.length * 2);
    assert.false(debug.visible);
  });

  QUnit.test("setVisible shows and hides it", (assert) => {
    const debug = new DebugLedges(scene, ledges);
    debug.setVisible(true);
    assert.true(debug.visible);
    debug.setVisible(false);
    assert.false(debug.visible);
  });

  QUnit.test("it can't be picked, and dispose takes it away", (assert) => {
    const before = scene.meshes.length;
    const debug = new DebugLedges(scene, ledges);
    assert.false(debug.mesh.isPickable);
    assert.strictEqual(scene.meshes.length, before + 1);
    debug.dispose();
    assert.strictEqual(scene.meshes.length, before);
  });
});

