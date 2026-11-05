QUnit.module("boneSegments", () => {
  const v = (x, y, z) => new BABYLON.Vector3(x, y, z);

  QUnit.test("has a line from each bone to its parent, and none for a root", (assert) => {
    const tree = boneTree(fakeSkeleton([["root", null], ["a", 0], ["b", 1]]));
    const positions = [v(0, 0, 0), v(0, 1, 0), v(0, 2, 0)];
    const segments = boneSegments(tree, positions);
    assert.strictEqual(segments.length, 2);
    assert.deepEqual(segments[0], [positions[0], positions[1]]);
    assert.deepEqual(segments[1], [positions[1], positions[2]]);
  });
});

QUnit.module("jointRadius", () => {
  QUnit.test("grows with the model, and is never nothing", (assert) => {
    assert.ok(jointRadius(10) > jointRadius(1));
    assert.ok(jointRadius(0) > 0);
  });
});

QUnit.module("nearestJoint", () => {
  const points = [{ x: 10, y: 10 }, { x: 100, y: 100 }, { x: 105, y: 100 }];

  QUnit.test("is the joint closest to the point", (assert) => {
    assert.strictEqual(nearestJoint(points, 12, 9, 20), 0);
    assert.strictEqual(nearestJoint(points, 104, 100, 20), 2);
  });

  QUnit.test("is -1 when nothing is near enough", (assert) => {
    assert.strictEqual(nearestJoint(points, 300, 300, 20), -1);
    assert.strictEqual(nearestJoint([], 0, 0, 20), -1);
  });

  QUnit.test("a joint exactly on the edge of the distance counts", (assert) => {
    assert.strictEqual(nearestJoint([{ x: 0, y: 0 }], 3, 4, 5), 0);
  });
});

QUnit.module("jointPositions and screenPoints, of the real fire bender", (hooks) => {
  let engine, scene, camera, tree, positions;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    const { container } = await loadModelFile(scene, "../assets/characters/fire.glb");
    showModel(container);
    tree = boneTree(container.skeletons[0]);
    positions = jointPositions(container.skeletons[0]);
    camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2, Math.PI / 2, 5, new BABYLON.Vector3(0, 1, 0), scene);
    scene.render();
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  const at = (name) => positions[findBone(tree, name)];

  QUnit.test("has a position for every bone", (assert) => {
    assert.strictEqual(positions.length, 24);
  });

  QUnit.test("the head is above the hips, and the hips above the feet", (assert) => {
    assert.ok(at("Head").y > at("Hips").y);
    assert.ok(at("Hips").y > at("LeftFoot").y);
  });

  QUnit.test("the person is the size of a person, in metres", (assert) => {
    const height = at("HeadTop_End").y - at("LeftToeBase").y;
    assert.ok(height > 1.4 && height < 2.2, `${height}`);
  });

  QUnit.test("the left and right hands are on opposite sides", (assert) => {
    assert.ok(at("LeftHand").x * at("RightHand").x < 0);
  });

  QUnit.test("screenPoints puts the point that the camera looks at in the middle of the picture", (assert) => {
    const [point] = screenPoints([new BABYLON.Vector3(0, 1, 0)], scene, camera);
    assert.ok(Math.abs(point.x - engine.getRenderWidth() / 2) < 1);
    assert.ok(Math.abs(point.y - engine.getRenderHeight() / 2) < 1);
  });

  QUnit.test("screenPoints puts what is higher up the screen higher on the picture (a smaller y)", (assert) => {
    const [low, high] = screenPoints([new BABYLON.Vector3(0, 0.5, 0), new BABYLON.Vector3(0, 1.5, 0)], scene, camera);
    assert.ok(high.y < low.y);
  });
});
