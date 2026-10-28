QUnit.module("COURSE", () => {
  QUnit.test("every slab has a name, a start and an end that go forward along the course, and a size", (assert) => {
    for (const slab of COURSE) {
      assert.true(slab.name.length > 0);
      assert.true(slab.to[0] > slab.from[0], `${slab.name} goes forward`);
      assert.true(slab.depth > 0, `${slab.name} has some depth`);
    }
  });

  QUnit.test("the names are all different", (assert) => {
    assert.strictEqual(new Set(COURSE.map((s) => s.name)).size, COURSE.length);
  });

  QUnit.test("each slab starts where the one before it ends, so there is a way across", (assert) => {
    for (let i = 1; i < COURSE.length; i++) {
      assert.deepEqual(COURSE[i].from, COURSE[i - 1].to, `${COURSE[i].name}`);
    }
  });

  QUnit.test("no slope is steep enough that a marble couldn't be steered up it", (assert) => {
    for (const slab of COURSE) assert.true(steepness(slab) < 0.5, slab.name);
  });
});

QUnit.module("steepness", () => {
  QUnit.test("is 0 for a flat floor", (assert) => {
    assert.strictEqual(steepness({ from: [0, 3], to: [8, 3] }), 0);
  });

  QUnit.test("is the rise over the run", (assert) => {
    assert.strictEqual(steepness({ from: [0, 0], to: [10, 4] }), 0.4);
  });

  QUnit.test("is the same going down as going up", (assert) => {
    assert.strictEqual(steepness({ from: [0, 4], to: [10, 0] }), 0.4);
  });
});

QUnit.module("slabShape", () => {
  const flat = { name: "flat", from: [0, 5], to: [10, 5], z: 2, depth: 6 };
  const ramp = { name: "ramp", from: [0, 4], to: [12, 0], z: -1, depth: 3 };

  QUnit.test("a flat slab isn't tilted, and is as long as it is wide on the page", (assert) => {
    const shape = slabShape(flat);

    assert.strictEqual(shape.angle, 0);
    assert.strictEqual(shape.length, 10);
    assert.strictEqual(shape.depth, 6);
    assert.strictEqual(shape.z, 2);
  });

  QUnit.test("its middle is half the thickness below the top, and halfway along", (assert) => {
    const shape = slabShape(flat, 0.6);

    assert.strictEqual(shape.x, 5);
    assert.true(Math.abs(shape.y - (5 - 0.3)) < 1e-9);
  });

  QUnit.test("a ramp is as long as its slope, not its run", (assert) => {
    const shape = slabShape(ramp);

    assert.true(Math.abs(shape.length - Math.hypot(12, 4)) < 1e-9);
  });

  QUnit.test("a ramp that goes down is tilted down", (assert) => {
    assert.true(slabShape(ramp).angle < 0);
    assert.true(slabShape({ from: [0, 0], to: [12, 4], z: 0, depth: 1 }).angle > 0);
  });

  QUnit.test("the middle of the top of the box is the middle of the line the slab was described by", (assert) => {
    for (const slab of [flat, ramp]) {
      const shape = slabShape(slab, 0.6);
      const topX = shape.x - Math.sin(shape.angle) * 0.3; // half a thickness out along the way the top faces
      const topY = shape.y + Math.cos(shape.angle) * 0.3;

      assert.true(Math.abs(topX - (slab.from[0] + slab.to[0]) / 2) < 1e-9, `${slab.name} x`);
      assert.true(Math.abs(topY - (slab.from[1] + slab.to[1]) / 2) < 1e-9, `${slab.name} y`);
    }
  });

  QUnit.test("a thicker slab is lower, because the top stays where it was described", (assert) => {
    assert.true(slabShape(flat, 2).y < slabShape(flat, 0.5).y);
  });
});

QUnit.module("makeDeckTexture", (hooks) => {
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

  QUnit.test("repeats in both directions, so a big floor is covered in squares and not stretched from one corner", (assert) => {
    const texture = makeDeckTexture(scene);

    assert.strictEqual(texture.wrapU, BABYLON.Texture.WRAP_ADDRESSMODE);
    assert.strictEqual(texture.wrapV, BABYLON.Texture.WRAP_ADDRESSMODE);
  });

  QUnit.test("is a square of the size it is given", (assert) => {
    const size = makeDeckTexture(scene, 64).getSize();

    assert.deepEqual([size.width, size.height], [64, 64]);
  });
});

// Building the course needs a scene and physics. These use a NullEngine, which draws nothing.
QUnit.module("buildCourse", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("makes a mesh for every slab, named for it", (assert) => {
    const meshes = buildCourse(scene);

    assert.deepEqual(meshes.map((m) => m.name), COURSE.map((s) => s.name));
  });

  QUnit.test("each mesh is a box the size of its slab", (assert) => {
    const meshes = buildCourse(scene);

    meshes.forEach((mesh, i) => {
      const shape = slabShape(COURSE[i]);
      const size = mesh.getBoundingInfo().boundingBox.extendSize;
      assert.true(Math.abs(size.x * 2 - shape.length) < 1e-6, `${mesh.name} length`);
      assert.true(Math.abs(size.y * 2 - shape.thickness) < 1e-6, `${mesh.name} thickness`);
      assert.true(Math.abs(size.z * 2 - shape.depth) < 1e-6, `${mesh.name} depth`);
    });
  });

  QUnit.test("the top of every box lies along the line its slab was described by, which also checks which way it is tilted", (assert) => {
    const meshes = buildCourse(scene);

    meshes.forEach((mesh, i) => {
      const slab = COURSE[i];
      const shape = slabShape(slab);
      mesh.computeWorldMatrix(true);
      const matrix = mesh.getWorldMatrix();
      const start = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-shape.length / 2, shape.thickness / 2, 0), matrix);
      const end = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(shape.length / 2, shape.thickness / 2, 0), matrix);

      assert.true(Math.abs(start.x - slab.from[0]) < 1e-5 && Math.abs(start.y - slab.from[1]) < 1e-5, `${slab.name} start`);
      assert.true(Math.abs(end.x - slab.to[0]) < 1e-5 && Math.abs(end.y - slab.to[1]) < 1e-5, `${slab.name} end`);
    });
  });

  QUnit.test("every slab is a body that never moves", (assert) => {
    const meshes = buildCourse(scene);

    for (const mesh of meshes) {
      assert.true(mesh.physicsBody !== null && mesh.physicsBody !== undefined, mesh.name);
      assert.strictEqual(mesh.physicsBody.getMassProperties().mass || 0, 0, `${mesh.name} has no mass, so it is fixed`);
    }
  });

  QUnit.test("the slabs share one material, so there is only one texture to draw", (assert) => {
    const meshes = buildCourse(scene);

    assert.true(meshes.every((m) => m.material === meshes[0].material));
  });

  QUnit.test("they take shadows", (assert) => {
    assert.true(buildCourse(scene).every((m) => m.receiveShadows));
  });
});
