// The skeleton drawn over the model: a small ball at each joint and a line from each joint to its parent. They are drawn *on top* of the model (in
// a later rendering group, which clears the depth first), because bones are inside the body and would otherwise be hidden by it.
// The picture follows the bones every frame, so it moves with an animation. See ../tests/skeletonview.tests.js.

// The three looks of a joint: an ordinary one, the chosen one, and the ones next to it (its parent and its children).
const JOINT_LOOKS = {
  normal: new BABYLON.Color3(0.35, 0.8, 1),
  selected: new BABYLON.Color3(1, 0.8, 0.2),
  related: new BABYLON.Color3(0.65, 1, 0.55),
};

// The rendering group that the skeleton is drawn in. Group 0 is the model and the floor.
const SKELETON_GROUP = 1;

class SkeletonView {
  constructor(scene) {
    this.scene = scene;
    this.balls = [];
    this.lines = null;
    this.skeleton = null;
    this.tree = null;
    this.selected = -1;
    this.materials = {};
    for (const [look, color] of Object.entries(JOINT_LOOKS)) {
      const material = new BABYLON.StandardMaterial(`boneMaterial-${look}`, scene);
      material.emissiveColor = color;
      material.disableLighting = true;
      this.materials[look] = material;
    }
    scene.setRenderingAutoClearDepthStencil(SKELETON_GROUP, true, true, true);
  }

  // Draws the skeleton of a model. `size` is how big the model is (see inspect.js), which sets how big the joints are.
  show(skeleton, tree, size) {
    this.clear();
    this.skeleton = skeleton;
    this.tree = tree;
    this.selected = -1;
    const positions = jointPositions(skeleton);
    this.balls = tree.nodes.map((node) => {
      const ball = BABYLON.MeshBuilder.CreateSphere(`bone-${node.short}`, { diameter: jointRadius(size) * 2, segments: 8 }, this.scene);
      ball.renderingGroupId = SKELETON_GROUP;
      ball.isPickable = false;
      return ball;
    });
    const segments = boneSegments(tree, positions);
    this.lines = BABYLON.MeshBuilder.CreateLineSystem("bone-lines", { lines: segments, updatable: true }, this.scene);
    this.lines.color = JOINT_LOOKS.normal;
    this.lines.renderingGroupId = SKELETON_GROUP;
    this.lines.isPickable = false;
    this.recolor();
    this.update(true);
  }

  // Chooses a joint (or -1 for none).
  select(index) {
    this.selected = index;
    this.recolor();
  }

  // What a joint looks like, by whether it is the chosen one, next to it, or neither.
  lookOf(index) {
    if (index === this.selected) return "selected";
    const chosen = this.selected >= 0 ? this.tree.nodes[this.selected] : null;
    if (chosen && (chosen.parent === index || chosen.children.includes(index))) return "related";
    return "normal";
  }

  recolor() {
    this.balls.forEach((ball, index) => {
      ball.material = this.materials[this.lookOf(index)];
    });
  }

  // Moves the balls and lines to where the bones are now. Called every frame, so that the picture follows an animation. `visible` is whether to
  // draw it at all.
  update(visible) {
    if (!this.skeleton) return;
    this.balls.forEach((ball) => ball.setEnabled(visible));
    this.lines.setEnabled(visible);
    if (!visible) return;
    const positions = jointPositions(this.skeleton);
    this.balls.forEach((ball, index) => ball.position.copyFrom(positions[index]));
    BABYLON.MeshBuilder.CreateLineSystem("bone-lines", { lines: boneSegments(this.tree, positions), instance: this.lines });
  }

  // The positions of the joints now, for the panel.
  positions() {
    return this.skeleton ? jointPositions(this.skeleton) : [];
  }

  // Takes the drawing away (the next model has its own skeleton).
  clear() {
    this.balls.forEach((ball) => ball.dispose());
    this.balls = [];
    if (this.lines) this.lines.dispose();
    this.lines = null;
    this.skeleton = null;
    this.tree = null;
    this.selected = -1;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { JOINT_LOOKS, SKELETON_GROUP, SkeletonView };
} else {
  Object.assign(window, { JOINT_LOOKS, SKELETON_GROUP, SkeletonView });
}
