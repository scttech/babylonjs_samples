// A skeleton made of plain objects that answer the two questions boneTree asks of a bone: its name and its parent.
function fakeSkeleton(list) {
  const bones = list.map(([name]) => ({ name }));
  list.forEach(([, parentIndex], index) => {
    bones[index].getParent = () => (parentIndex === null ? null : bones[parentIndex]);
  });
  return { bones };
}

QUnit.module("shortName", () => {
  QUnit.test("takes away the program's prefix", (assert) => {
    assert.strictEqual(shortName("mixamorig:Hips"), "Hips");
  });

  QUnit.test("leaves a name with no prefix as it is", (assert) => {
    assert.strictEqual(shortName("headfront"), "headfront");
  });
});

QUnit.module("boneTree, of a small skeleton", () => {
  const skeleton = fakeSkeleton([["root", null], ["a", 0], ["b", 0], ["c", 1]]);
  const tree = boneTree(skeleton);

  QUnit.test("knows each bone's parent and children", (assert) => {
    assert.strictEqual(tree.nodes[0].parent, null);
    assert.strictEqual(tree.nodes[3].parent, 1);
    assert.deepEqual(tree.nodes[0].children, [1, 2]);
    assert.deepEqual(tree.nodes[2].children, []);
  });

  QUnit.test("knows how far down each bone is", (assert) => {
    assert.deepEqual(tree.nodes.map((node) => node.depth), [0, 1, 1, 2]);
  });

  QUnit.test("finds the roots", (assert) => {
    assert.deepEqual(tree.roots, [0]);
  });

  QUnit.test("a walk visits a bone, then everything under its first child, then the next", (assert) => {
    assert.deepEqual(walkOrder(tree), [0, 1, 3, 2]);
  });

  QUnit.test("a path runs from the root down to the bone", (assert) => {
    assert.deepEqual(bonePath(tree, 3), ["root", "a", "c"]);
    assert.deepEqual(bonePath(tree, 0), ["root"]);
  });

  QUnit.test("the descendants of a bone are everything under it, and not itself", (assert) => {
    assert.deepEqual(descendants(tree, 0), [1, 3, 2]);
    assert.deepEqual(descendants(tree, 1), [3]);
    assert.deepEqual(descendants(tree, 3), []);
  });

  QUnit.test("a skeleton can have more than one root", (assert) => {
    const two = boneTree(fakeSkeleton([["x", null], ["y", null], ["z", 1]]));
    assert.deepEqual(two.roots, [0, 1]);
  });
});

QUnit.module("regionOf", () => {
  QUnit.test("puts the bones in the parts of the body", (assert) => {
    assert.strictEqual(regionOf("mixamorig:Head"), "head");
    assert.strictEqual(regionOf("mixamorig:Spine1"), "torso");
    assert.strictEqual(regionOf("mixamorig:Hips"), "torso");
    assert.strictEqual(regionOf("mixamorig:LeftForeArm"), "leftArm");
    assert.strictEqual(regionOf("mixamorig:RightHand"), "rightArm");
    assert.strictEqual(regionOf("mixamorig:LeftToeBase"), "leftLeg");
    assert.strictEqual(regionOf("mixamorig:RightUpLeg"), "rightLeg");
  });

  QUnit.test("fingers belong to their hand", (assert) => {
    assert.strictEqual(regionOf("mixamorig:LeftHandThumb1"), "leftArm");
  });

  QUnit.test("a bone that someone added is in other", (assert) => {
    assert.strictEqual(regionOf("headfront"), "other");
  });

  QUnit.test("every region has a label and no two share an id", (assert) => {
    const ids = BODY_REGIONS.map((region) => region.id);
    assert.strictEqual(new Set(ids).size, ids.length);
    for (const id of [...ids, "other"]) assert.ok(regionLabel(id).length > 0, id);
  });
});

QUnit.module("namingStyle", () => {
  QUnit.test("a skeleton whose bones begin with mixamorig: is a Mixamo skeleton", (assert) => {
    assert.strictEqual(namingStyle(boneTree(fakeSkeleton([["mixamorig:Hips", null], ["mixamorig:Spine", 0]]))), "mixamo");
  });

  QUnit.test("anything else is unknown, and an empty skeleton too", (assert) => {
    assert.strictEqual(namingStyle(boneTree(fakeSkeleton([["Bone", null], ["Bone.001", 0]]))), "unknown");
    assert.strictEqual(namingStyle(boneTree(fakeSkeleton([]))), "unknown");
  });
});

QUnit.module("the real skeletons", (hooks) => {
  let engine, scene, trees;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    trees = {};
    for (const name of ["fire", "air", "heavy"]) {
      const { container } = await loadModelFile(scene, `../assets/characters/${name}.glb`);
      trees[name] = boneTree(container.skeletons[0]);
    }
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("have twenty-four bones and one root, the hips", (assert) => {
    const tree = trees.fire;
    assert.strictEqual(tree.nodes.length, 24);
    assert.deepEqual(tree.roots.map((index) => tree.nodes[index].short), ["Hips"]);
  });

  QUnit.test("have the bones named in the Mixamo way", (assert) => {
    assert.strictEqual(namingStyle(trees.fire), "mixamo");
    for (const short of ["Hips", "Spine2", "Neck", "Head", "LeftHand", "RightHand", "LeftFoot", "RightFoot"]) assert.ok(findBone(trees.fire, short) >= 0, short);
  });

  QUnit.test("find a bone by its whole name or its short one", (assert) => {
    assert.strictEqual(findBone(trees.fire, "mixamorig:Head"), findBone(trees.fire, "Head"));
    assert.strictEqual(findBone(trees.fire, "Tail"), -1);
  });

  QUnit.test("run from the hips to the right hand by way of the spine and the arm", (assert) => {
    const hand = findBone(trees.fire, "RightHand");
    assert.deepEqual(bonePath(trees.fire, hand), ["Hips", "Spine", "Spine1", "Spine2", "RightShoulder", "RightArm", "RightForeArm", "RightHand"]);
  });

  QUnit.test("the neck and both shoulders hang from the top of the spine", (assert) => {
    const tree = trees.fire;
    const shorts = tree.nodes[findBone(tree, "Spine2")].children.map((index) => tree.nodes[index].short);
    assert.deepEqual(shorts.sort(), ["LeftShoulder", "Neck", "RightShoulder"]);
  });

  QUnit.test("a parent always comes before its children", (assert) => {
    for (const node of trees.fire.nodes) if (node.parent !== null) assert.ok(node.parent < node.index, node.short);
  });

  QUnit.test("every bone has a part of the body, except the one that was added", (assert) => {
    const others = trees.fire.nodes.filter((node) => regionOf(node.name) === "other").map((node) => node.name);
    assert.deepEqual(others, ["headfront"]);
  });

  QUnit.test("all three characters have exactly the same bones in the same order", (assert) => {
    const names = (tree) => tree.nodes.map((node) => node.name);
    assert.deepEqual(names(trees.air), names(trees.fire));
    assert.deepEqual(names(trees.heavy), names(trees.fire));
  });
});
