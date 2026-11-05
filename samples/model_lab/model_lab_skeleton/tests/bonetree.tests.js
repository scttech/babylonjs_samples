QUnit.module("describeBone", () => {
  const tree = boneTree(fakeSkeleton([["mixamorig:Hips", null], ["mixamorig:Spine", 0], ["mixamorig:LeftArm", 1], ["mixamorig:RightArm", 1]]));
  const positions = [{ x: 0, y: 1, z: 0 }, { x: 0, y: 1.2, z: 0 }, { x: 0.3, y: 1.4, z: 0 }, { x: -0.3, y: 1.4, z: 0 }];

  QUnit.test("says a bone's names, its part of the body and its place", (assert) => {
    const bone = describeBone(tree, positions, 2);
    assert.strictEqual(bone.name, "mixamorig:LeftArm");
    assert.strictEqual(bone.short, "LeftArm");
    assert.strictEqual(bone.region, "Left arm");
    assert.deepEqual(bone.position, { x: 0.3, y: 1.4, z: 0 });
  });

  QUnit.test("says its parent and its children by their short names", (assert) => {
    assert.strictEqual(describeBone(tree, positions, 1).parent, "Hips");
    assert.deepEqual(describeBone(tree, positions, 1).children, ["LeftArm", "RightArm"]);
    assert.strictEqual(describeBone(tree, positions, 0).parent, null);
  });

  QUnit.test("says the way down from the root", (assert) => {
    const bone = describeBone(tree, positions, 3);
    assert.deepEqual(bone.path, ["Hips", "Spine", "RightArm"]);
    assert.strictEqual(bone.depth, 2);
  });
});

QUnit.module("BoneTree", (hooks) => {
  let container, picked, panel, tree;
  const positions = [{ x: 0, y: 1, z: 0 }, { x: 0, y: 1.2, z: 0 }, { x: 0.3, y: 1.4, z: 0 }];
  hooks.beforeEach(() => {
    container = document.createElement("div");
    picked = [];
    panel = new BoneTree(container, (index) => picked.push(index));
    tree = boneTree(fakeSkeleton([["mixamorig:Hips", null], ["mixamorig:Spine", 0], ["<img src=x onerror=alert(1)>", 1]]));
    panel.show(tree);
  });

  QUnit.test("has a button for each bone, with the short name", (assert) => {
    const buttons = container.querySelectorAll("button.bone");
    assert.strictEqual(buttons.length, 3);
    assert.strictEqual(buttons[0].textContent, "Hips");
  });

  QUnit.test("puts each bone inside the list of its parent", (assert) => {
    const buttons = container.querySelectorAll("button.bone");
    assert.ok(buttons[0].closest("li").querySelector("ul").contains(buttons[1]));
    assert.notOk(buttons[1].closest("ul").contains(buttons[0]));
  });

  QUnit.test("a click on a bone says which", (assert) => {
    container.querySelectorAll("button.bone")[2].click();
    assert.deepEqual(picked, [2]);
  });

  QUnit.test("choosing a bone marks it, and only it, and says what it is", (assert) => {
    panel.select(1, positions);
    const marked = [...container.querySelectorAll("button.bone.selected")];
    assert.strictEqual(marked.length, 1);
    assert.strictEqual(marked[0].textContent, "Spine");
    const text = container.textContent;
    assert.ok(text.includes("mixamorig:Spine"));
    assert.ok(text.includes("0.00, 1.20, 0.00"));
    assert.ok(text.includes("Hips > Spine"));
  });

  QUnit.test("a bone's name is shown as text and never as HTML", (assert) => {
    panel.select(2, positions);
    assert.strictEqual(container.querySelector("img"), null);
    assert.ok(container.textContent.includes("<img src=x"));
  });

  QUnit.test("choosing a bone that does not exist only clears the mark", (assert) => {
    panel.select(1, positions);
    panel.select(-1, positions);
    assert.strictEqual(container.querySelectorAll("button.bone.selected").length, 0);
  });

  QUnit.test("clear says why there is nothing to list", (assert) => {
    panel.clear("No skeleton here.");
    assert.strictEqual(container.querySelectorAll("button").length, 0);
    assert.strictEqual(container.textContent, "No skeleton here.");
  });
});
