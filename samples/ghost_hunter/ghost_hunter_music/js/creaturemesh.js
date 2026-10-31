// How a creature looks. Until the models arrive, a creature is drawn out of simple shapes, and every one of them is a **placeholder**
// that can be hidden. The shapes are not a model of a spider: they are whatever list of bones and blobs the creature's pose gives this
// frame, drawn as rounded sticks and balls from a pool that grows when it has to. When a model is wanted instead, it goes in the table
// `CREATURE_MODELS`, and a creature that has an entry there is drawn as the model and not as shapes. See ../tests/creaturemesh.tests.js.

const CREATURE_LOOK = {
  colors: {
    flesh: [0.4, 0.5, 0.38], // a sick green-grey
    bone: [0.84, 0.82, 0.7],
    dark: [0.2, 0.17, 0.2],
    claw: [0.6, 0.55, 0.42],
    eye: [1, 0.15, 0.1], // red, and it glows
  },
  glow: 0.5, // how much of its colour a thing shows even in the dark (the rest it takes from the light)
  eyeGlow: 1, // and the eyes show all of it
  sides: 8, // the number of sides of a stick or a ball: it is small, and a phone is slow
};

// Where a model would go for each kind of creature. A kind with `null` is drawn as shapes. An entry is
//   { url: "assets/creatures/spider.glb", scale: 1, yaw: 0, clips: { idle: "Idle", walk: "Walk", lunge: "Attack", die: "Death" } }
// where `scale` and `yaw` put the model right (it may be made big, or face the wrong way), and `clips` names its animations.
// The models there are: the skeleton has a skeleton and clips of its own; the rest are in staticbody.js (they do not move by themselves).
// The spider has no model yet, and is shapes.
const CREATURE_MODELS = {
  spider: null,
  skeleton: {
    url: "../assets/creatures/skeleton.glb",
    height: 1.75,
    yaw: 0,
    // The model has three clips: a walk, a run, and a scream (2.8 seconds). It has no idle: a creature that lurks walks very slowly, and
    // one that is getting its breath back after a strike screams. It has no death: a dying skeleton is stopped and toppled.
    clips: { idle: "Walking", walk: "Walking", lunge: "Running", recover: "Zombie_Scream" },
    speeds: { idle: 0.2, walk: 1, lunge: 1.1, recover: 1 },
  },
  ...STATIC_MODELS,
};

// Loads the models in a table that have an entry. Gives a map from kind to what was loaded; a model that will not load is left out (and
// that kind is drawn as shapes), and `loader` is the Babylon.js loader of asset containers, or anything with the same method.
async function loadCreatureModels(scene, models = CREATURE_MODELS, loader = BABYLON.SceneLoader) {
  const loaded = new Map();
  for (const [kind, entry] of Object.entries(models)) {
    if (!entry) continue;
    try {
      const slash = entry.url.lastIndexOf("/"); // the loader wants the folder and the file apart
      loaded.set(kind, { entry, container: await loader.LoadAssetContainerAsync(entry.url.slice(0, slash + 1), entry.url.slice(slash + 1), scene) });
    } catch (error) {
      console.warn(`The model for the ${kind} would not load, so it is drawn as shapes.`, error);
    }
  }
  return loaded;
}

// The materials of the colours, made once for a scene.
function creatureMaterials(scene, look = CREATURE_LOOK) {
  const materials = {};
  for (const [name, color] of Object.entries(look.colors)) {
    const material = new BABYLON.StandardMaterial(`creature-${name}`, scene);
    const glow = name === "eye" ? look.eyeGlow : look.glow;
    material.diffuseColor = new BABYLON.Color3(...color);
    material.emissiveColor = new BABYLON.Color3(...color.map((n) => n * glow));
    material.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    materials[name] = material;
  }
  return materials;
}

const FROM_UP = new BABYLON.Quaternion();

// A creature drawn as shapes: a root that is moved and turned, with a pool of sticks and balls that is set from the pose every frame.
class CreatureBody {
  constructor(scene, creature, materials, placeholders, look = CREATURE_LOOK) {
    this.scene = scene;
    this.creature = creature;
    this.materials = materials;
    this.look = look;
    this.root = new BABYLON.TransformNode(`creature-${creature.id}`, scene);
    this.sticks = [];
    this.balls = [];
    if (placeholders) placeholders.add(this.root, "creature");
  }

  _stick(index) {
    if (!this.sticks[index]) {
      const stick = BABYLON.MeshBuilder.CreateCylinder(`stick-${this.creature.id}-${index}`, { height: 1, diameter: 1, tessellation: this.look.sides, cap: BABYLON.Mesh.CAP_ALL }, this.scene);
      stick.parent = this.root;
      stick.rotationQuaternion = new BABYLON.Quaternion();
      stick.isPickable = false;
      this.sticks[index] = stick;
    }
    return this.sticks[index];
  }

  _ball(index) {
    if (!this.balls[index]) {
      const ball = BABYLON.MeshBuilder.CreateSphere(`ball-${this.creature.id}-${index}`, { diameter: 1, segments: this.look.sides }, this.scene);
      ball.parent = this.root;
      ball.isPickable = false;
      this.balls[index] = ball;
    }
    return this.balls[index];
  }

  // Sets everything from what the creature is doing now.
  update() {
    const creature = this.creature;
    this.root.position.set(creature.position[0], creature.position[1], creature.position[2]);
    this.root.rotation.y = creature.yaw;
    const pose = creature.pose();
    pose.bones.forEach((bone, i) => {
      const stick = this._stick(i);
      const along = [bone.b[0] - bone.a[0], bone.b[1] - bone.a[1], bone.b[2] - bone.a[2]];
      const length = Math.hypot(...along) || 1e-6;
      stick.setEnabled(true);
      stick.position.set((bone.a[0] + bone.b[0]) / 2, (bone.a[1] + bone.b[1]) / 2, (bone.a[2] + bone.b[2]) / 2);
      stick.scaling.set(bone.r * 2, length, bone.r * 2);
      BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.Up(), new BABYLON.Vector3(along[0] / length, along[1] / length, along[2] / length), FROM_UP);
      stick.rotationQuaternion.copyFrom(FROM_UP);
      stick.material = this.materials[bone.color];
    });
    for (let i = pose.bones.length; i < this.sticks.length; i++) this.sticks[i].setEnabled(false);
    pose.blobs.forEach((blob, i) => {
      const ball = this._ball(i);
      ball.setEnabled(true);
      ball.position.set(blob.p[0], blob.p[1], blob.p[2]);
      ball.scaling.setAll(blob.r * 2);
      ball.material = this.materials[blob.color];
    });
    for (let i = pose.blobs.length; i < this.balls.length; i++) this.balls[i].setEnabled(false);
  }

  dispose(placeholders) {
    if (placeholders) placeholders.remove(this.root);
    this.root.dispose(false, false);
  }
}

// A creature drawn as a model with a skeleton and animations: the model is instanced, fitted to its height, put where the creature is,
// and plays the clip for what the creature is doing, as fast as its entry in the table says. A model has no clip for everything (this
// one has no idle, and no death): the table says which clip to use in its place, and a creature that is dying with no clip of its own
// stops where it is and topples, as the models that do not move do.
class ModelBody {
  constructor(scene, creature, loaded) {
    this.creature = creature;
    this.entry = loaded.entry;
    this.fitted = new FittedModel(scene, loaded, `${creature.id}`);
    this.root = this.fitted.pivot;
    this.groups = this.fitted.instance.animationGroups;
    for (const group of this.groups) group.stop(); // the model arrives playing something
    this.role = null;
    this.current = null;
  }

  // What a creature is doing, as the part a clip plays: "idle", "walk", "lunge", "recover" or "die".
  static roleFor(state) {
    return { lurk: "idle", stalk: "walk", lunge: "lunge", recover: "recover", dying: "die" }[state] || "idle";
  }

  // The name of the clip for what a creature is doing: its own, or the idle one if it has none (and none at all for a death).
  static clipFor(state, clips) {
    const role = ModelBody.roleFor(state);
    return clips[role] || (role === "die" ? null : clips.idle) || null;
  }

  update() {
    const creature = this.creature;
    const pivot = this.fitted.pivot;
    const dying = creature.state === "dying" ? Math.max(0, Math.min(1, 1 - creature.timer / creature.table.deathTime)) : 0;
    const fall = staticMotion({ state: creature.state, gait: 0, time: 0, moving: 0, reach: 0, dying }, { sway: 0, lean: 0, bob: 0, squash: 0 });
    pivot.position.set(creature.position[0], creature.position[1], creature.position[2]);
    pivot.rotation.set(fall.pitch, creature.yaw + (this.entry.yaw || 0), 0);
    this.fitted.setVisibility(fall.opacity);

    const role = ModelBody.roleFor(creature.state);
    if (role === this.role) return;
    this.role = role;
    const name = ModelBody.clipFor(creature.state, this.entry.clips || {});
    const next = name ? this.groups.find((group) => group.name.startsWith(name)) : null;
    const speed = (this.entry.speeds && this.entry.speeds[role]) || 1;
    if (next && next === this.current) {
      next.speedRatio = speed; // the same clip at another pace: a walk and an idle that is a slow walk
    } else {
      if (this.current) (next || role !== "die" ? this.current.stop() : this.current.pause());
      this.current = next || this.current;
      if (next) next.start(role !== "die", speed);
    }
  }

  dispose() {
    this.fitted.dispose();
  }
}

// Which model a creature has: a creature's kind can have several (the table lists them), and each creature has one, by its number, so
// that the same creature is always the same one.
function modelNameFor(creature) {
  const names = creature.table.models || [creature.kind];
  return names[creature.id % names.length];
}

// Whichever body a creature should have: its model if there is one loaded (one that moves itself, or one that is moved from outside),
// and shapes if not.
function makeCreatureBody(scene, creature, materials, placeholders, models = new Map()) {
  const loaded = models.get(modelNameFor(creature));
  if (!loaded) return new CreatureBody(scene, creature, materials, placeholders);
  return loaded.entry.clips ? new ModelBody(scene, creature, loaded) : new StaticBody(scene, creature, loaded);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, modelNameFor, makeCreatureBody };
} else {
  Object.assign(window, { CREATURE_LOOK, CREATURE_MODELS, loadCreatureModels, creatureMaterials, CreatureBody, ModelBody, modelNameFor, makeCreatureBody });
}
