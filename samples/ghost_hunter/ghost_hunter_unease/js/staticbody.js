// What a model with bones still needs from outside. `staticMotion` is how a thing with no animation of its own moves (a rock, a lean, a
// topple and a fade): the skeleton has no death clip, and uses it for its death. `FittedModel` measures a loaded model, scales it to the height
// its entry in the table says, and puts its feet on the floor, in the middle. (This file uses TAU from ghost.js.) See ../tests/staticbody.tests.js.

// The motion of a model that does not move itself, at a moment. `s` is { state, gait, time, moving, reach, dying }: what the creature is doing,
// its steps, the clock, how much it is walking and reaching (0 to 1), and how far through dying it is (0 to 1). Gives how far to tip it
// forward (pitch) and sideways (roll) in radians, how far to raise it, and how much to stretch it up and sideways.
function staticMotion(s, motion) {
  const walk = Math.sin(s.gait * TAU) * s.moving;
  const step = Math.abs(Math.sin(s.gait * TAU)) * s.moving;
  const idle = Math.sin(s.time * 1.1) * (1 - s.moving);
  let pitch = motion.lean * s.moving + motion.lean * 2.5 * s.reach;
  let roll = walk * motion.sway + idle * motion.sway * 0.4;
  let lift = step * motion.bob + Math.sin(s.time * 0.8) * motion.bob * 0.3;
  let stretch = 1 + s.reach * motion.squash * 0.5 - (s.state === "lurk" ? motion.squash * 0.15 : 0);
  let wide = 1 - s.reach * motion.squash * 0.3;
  let opacity = 1;
  if (s.dying > 0) {
    pitch = -(Math.PI / 2) * Math.min(1, s.dying * 1.6);
    roll *= 1 - s.dying;
    lift = 0;
    stretch = 1 - 0.1 * s.dying;
    opacity = 1 - Math.max(0, (s.dying - 0.6) / 0.4);
  }
  return { pitch, roll, lift, stretch, wide, opacity };
}

// How big a model is, and where it stands: the box round it in the world as it was loaded, at the origin. Gives how tall it is, and where the
// middle of its feet are.
function measureModel(root) {
  const { min, max } = root.getHierarchyBoundingVectors(true);
  return { height: max.y - min.y, feet: [(min.x + max.x) / 2, min.y, (min.z + max.z) / 2] };
}

// An instance of a loaded model, stood at the origin, scaled to the height the table says, with its feet on the floor and in the middle.
class FittedModel {
  constructor(scene, loaded, name, cloneMaterials = false) {
    this.entry = loaded.entry;
    this.instance = loaded.container.instantiateModelsToScene((meshName) => `${meshName}-${name}`, cloneMaterials);
    this.inner = new BABYLON.TransformNode(`fit-${name}`, scene);
    for (const node of this.instance.rootNodes) node.parent = this.inner;
    this.pivot = new BABYLON.TransformNode(`pivot-${name}`, scene);
    this.inner.parent = this.pivot;
    this.inner.computeWorldMatrix(true);
    this.size = measureModel(this.inner);
    this.scale = this.entry.height / this.size.height;
    this.inner.scaling.setAll(this.scale);
    this.inner.position.set(-this.size.feet[0] * this.scale, -this.size.feet[1] * this.scale, -this.size.feet[2] * this.scale);
    this.meshes = this.inner.getChildMeshes();
  }

  setVisibility(amount) {
    for (const mesh of this.meshes) mesh.visibility = amount;
  }

  dispose() {
    this.instance.dispose();
    this.inner.dispose();
    this.pivot.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { staticMotion, measureModel, FittedModel };
} else {
  Object.assign(window, { staticMotion, measureModel, FittedModel });
}
