// Models that do not move. The models that have arrived are single meshes with no skeleton and no animation: a figure, as it was made.
// They are brought to life from outside, in code: a walk is a rock from side to side with a bob; a lunge is a lean forward with a squash and
// a stretch; a death is a topple. All of that is worked out here as plain arithmetic (`staticMotion`), and `StaticBody` puts it on the
// model. A model with a skeleton and animations is a `ModelBody` (creaturemesh.js), and the day a skeleton arrives it goes in the same table.
// (This file uses TAU from ghost.js.) See ../tests/staticbody.tests.js.

// Where each model is, and what it is for. `height` is how tall it should be in the room, in metres (a model is made at any size, and is
// scaled to this); `yaw` is how far it must be turned to face forward; `motion` is how it moves, and a number of it is how much.
const STATIC_MODELS = {
  zombie: { url: "../assets/creatures/zombie.glb", height: 1.8, yaw: 0, motion: { sway: 0.07, lean: 0.12, bob: 0.025, squash: 0.08 } },
  doll: { url: "../assets/creatures/doll.glb", height: 1.05, yaw: 0, motion: { sway: 0.12, lean: 0.05, bob: 0.05, squash: 0.1 } },
  abomination: { url: "../assets/creatures/abomination.glb", height: 1.5, yaw: 0, motion: { sway: 0.05, lean: 0.1, bob: 0.07, squash: 0.15 } },
  terror: { url: "../assets/creatures/terror.glb", height: 0.9, yaw: 0, motion: { sway: 0.1, lean: 0.15, bob: 0.1, squash: 0.18 } },
  horde: { url: "../assets/creatures/horde.glb", height: 2.1, yaw: 0, motion: { sway: 0.03, lean: 0.06, bob: 0.03, squash: 0.06 } },
  ghost_enraged: { url: "../assets/creatures/ghost_enraged.glb", height: 1.9, yaw: 0, motion: { sway: 0.02, lean: 0.04, bob: 0.02, squash: 0.03 }, ghost: true },
  silhouette: { url: "../assets/creatures/silhouette.glb", height: 1.9, yaw: 0, motion: { sway: 0.02, lean: 0.03, bob: 0.02, squash: 0.03 }, ghost: true },
};

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

// A creature drawn as a model that does not move: put where the creature is, turned the way it faces, and moved by `staticMotion`.
class StaticBody {
  constructor(scene, creature, loaded, name = loaded.entry.url) {
    this.creature = creature;
    this.fitted = new FittedModel(scene, loaded, `${creature.id}`);
    this.motion = loaded.entry.motion;
    this.yaw = loaded.entry.yaw || 0;
    this.root = this.fitted.pivot;
  }

  update() {
    const creature = this.creature;
    const state = creature.state;
    const dying = state === "dying" ? 1 - creature.timer / creature.table.deathTime : 0;
    const reach = state === "lunge" ? 1 : state === "recover" ? 0.3 : 0;
    const motion = staticMotion({ state, gait: creature.gait, time: creature.clock, moving: creature.moving, reach, dying: Math.max(0, Math.min(1, dying)) }, this.motion);
    const pivot = this.fitted.pivot;
    pivot.position.set(creature.position[0], creature.position[1] + motion.lift, creature.position[2]);
    pivot.rotation.set(motion.pitch, creature.yaw + this.yaw, motion.roll);
    pivot.scaling.set(motion.wide, motion.stretch, motion.wide);
    this.fitted.setVisibility(motion.opacity * creature.fade);
  }

  dispose() {
    this.fitted.dispose();
  }
}

// A ghost drawn as a model: it floats where the numbers of the ghost say, faces the player, and is as see-through as they say.
class GhostModelBody {
  constructor(scene, apparition, loaded) {
    this.apparition = apparition;
    this.fitted = new FittedModel(scene, loaded, `ghost-${apparition.id}`);
    this.root = this.fitted.pivot;
  }

  update() {
    const ghost = this.apparition;
    const shown = ghost.stage !== "waiting" && ghost.stage !== "gone";
    this.fitted.pivot.setEnabled(shown);
    const position = ghost.position();
    this.fitted.pivot.position.set(position[0], position[1], position[2]);
    this.fitted.pivot.rotation.y = ghost.yaw + (this.fitted.entry.yaw || 0);
    this.fitted.setVisibility(Math.min(1, ghost.opacity() / ghost.table.opacity) * 0.85);
  }

  dispose() {
    this.fitted.dispose();
  }
}

// Does this ghost have a model? Some do and some do not, decided by the ghost's own number (so it is the same every time), among the models
// there are. Gives the name of the model, or null.
function ghostModelFor(id, names, chance) {
  if (!names.length || hash(id + 40) >= chance) return null;
  return names[id % names.length];
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { STATIC_MODELS, staticMotion, measureModel, FittedModel, StaticBody, GhostModelBody, ghostModelFor };
} else {
  Object.assign(window, { STATIC_MODELS, staticMotion, measureModel, FittedModel, StaticBody, GhostModelBody, ghostModelFor });
}
