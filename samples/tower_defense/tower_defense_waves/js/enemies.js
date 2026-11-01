// The enemies: who they are (a table), loading their models, and an enemy that walks a route
// with the right animation at the right speed. How fast an enemy goes comes from the table; the
// distance it has walked comes from a Walker; this file turns those into a model that moves and
// walks. See ../tests/enemies.tests.js.

// The enemies, one row each. `height` is how tall the model is made in the world, where a cell is two
// units wide; `speed` is how fast it walks, in world units a second; `clip` is the animation it plays.
// `health` is how much damage it takes to defeat it, `reward` how much gold that pays, and `leak` how many
// lives are lost if it gets to the end of the road.
const ENEMIES = {
  grunt: { name: "Masked Grunt", file: "enemies/grunt.glb", height: 1.5, speed: 1.6, clip: "Walking", health: 40, reward: 6, leak: 1 },
  scout: { name: "Scout Raider", file: "enemies/scout.glb", height: 1.35, speed: 3.0, clip: "Running", health: 26, reward: 6, leak: 1 },
  heavy: { name: "Heavy Trooper", file: "enemies/heavy.glb", height: 1.9, speed: 1.1, clip: "Walking", health: 140, reward: 14, leak: 2 },
  dai_li: { name: "Dai Li Agent", file: "enemies/dai_li.glb", height: 1.55, speed: 1.9, clip: "Walking", health: 70, reward: 9, leak: 1 },
  spirit: { name: "Corrupted Spirit", file: "enemies/spirit.glb", height: 1.8, speed: 1.3, clip: "Unsteady_Walk", health: 120, reward: 20, leak: 3 },
};

// How an enemy falls. Every model has two death clips, and an enemy plays one of them, once. A clip is
// three seconds or so, which is a long time to wait for something that has already been beaten, so it is
// played quicker: `seconds` is how long the fall takes. Then the body lies there for `linger` seconds, and
// sinks into the ground over `sink` more, and is gone.
const DEATH = {
  clips: ["Dead", "Fall_Dead_from_Abdominal_Injury"],
  seconds: 2.2,
  linger: 0.6,
  sink: 1.6,
};

// How far a model that is not scaled moves in a second while it plays a clip at its normal speed: its
// *stride*. An animation plays at its own pace, and to stop the feet sliding it has to be played faster
// or slower to match how fast the enemy is going. These are measured by eye, and are the numbers to
// change if a walk looks like skating.
const CLIPS = {
  Walking: { stride: 1.4 },
  Running: { stride: 4 },
  Unsteady_Walk: { stride: 0.7 },
};

// How fast to play a clip so that the feet keep up: the speed of the enemy, against the speed the clip
// would move a model of the size it is made.
function clipRatio(speed, scale, clip) {
  return speed / (CLIPS[clip].stride * scale);
}

// Loads every kind of enemy, and works out how each is scaled and lifted to stand on the ground.
async function loadEnemies(scene, enemies = ENEMIES) {
  const kinds = Object.keys(enemies);
  const containers = await Promise.all(kinds.map((kind) => loadModel(scene, enemies[kind].file)));
  const loaded = {};
  kinds.forEach((kind, i) => {
    const bounds = measure(containers[i].rootNodes[0]);
    const scale = heightScale(sizeOf(bounds), enemies[kind].height);
    loaded[kind] = { container: containers[i], scale, lift: bottomOffset(bounds, scale) };
  });
  return loaded;
}

class Enemy {
  // `healthScale` is how much tougher than the table this one is: later waves are tougher.
  constructor(scene, loaded, kind, route, name = `enemy ${kind}`, healthScale = 1, enemies = ENEMIES) {
    const spec = enemies[kind];
    const model = loaded[kind];
    this.kind = kind;
    this.name = name;
    this.height = spec.height;
    this.reward = spec.reward;
    this.leak = spec.leak;
    this.maxHealth = spec.health * healthScale;
    this.health = this.maxHealth;
    this.state = "walking"; // "walking", and then "dying" once its health has run out
    this.sinceDeath = 0;
    this.walker = new Walker(route, spec.speed);

    // The outer node is where the enemy is and which way it faces. The inner one scales the model and
    // puts its feet on the ground.
    this.node = new BABYLON.TransformNode(name, scene);
    const inner = new BABYLON.TransformNode(`${name} model`, scene);
    inner.parent = this.node;
    inner.position.y = model.lift;
    inner.scaling.setAll(model.scale);

    // A model with a skeleton can't be an instance: every copy has to be in a pose of its own. So the
    // container makes a copy of the skeleton, and of the animations, for each enemy.
    this.copy = model.container.instantiateModelsToScene((original) => `${name} ${original}`, false, { doNotInstantiate: false });
    this.copy.rootNodes[0].parent = inner;
    this.copy.animationGroups.forEach((group) => group.stop());
    this.clip = this.copy.animationGroups.find((group) => group.name === `${name} ${spec.clip}`);
    this.clip.start(true, clipRatio(spec.speed, model.scale, spec.clip));
    this.update(0);
  }

  // Walks for `dt` seconds, and puts the enemy where it has got to. An enemy that is falling doesn't walk: it lies where
  // it fell, and then sinks into the ground.
  update(dt) {
    if (this.state === "dying") {
      this.sinceDeath += dt;
      const sunk = (this.sinceDeath - DEATH.seconds - DEATH.linger) / DEATH.sink;
      if (sunk > 0) this.node.position.y = -this.height * Math.min(1, sunk);
      return;
    }
    this.walker.update(dt);
    const { x, z, yaw } = this.walker.position();
    this.node.position.set(x, 0, z);
    this.node.rotation.y = yaw;
  }

  // Whether it has walked the whole route.
  get done() {
    return this.walker.done;
  }

  // Whether it is still on its feet, whether it is falling, and whether it is over (it got to the end, or it has
  // fallen and gone): when it is over, it is time to take it away.
  get alive() {
    return this.state === "walking";
  }

  get dead() {
    return this.state === "dying";
  }

  get finished() {
    return this.alive ? this.walker.done : this.sinceDeath >= DEATH.seconds + DEATH.linger + DEATH.sink;
  }

  // Takes damage. Says whether this was what defeated it. Something that has fallen takes no more.
  hurt(amount) {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health > 0) return false;
    this.die();
    return true;
  }

  // Falls: the walking clip stops, and one of the two death clips plays, once, at the speed that makes it last
  // DEATH.seconds. Which one is decided by the name of the enemy, so that it is the same every time.
  die() {
    this.state = "dying";
    this.clip.stop();
    const pick = [...this.name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % DEATH.clips.length;
    this.fall = this.copy.animationGroups.find((group) => group.name === `${this.name} ${DEATH.clips[pick]}`);
    const length = (this.fall.to - this.fall.from) / this.fall.targetedAnimations[0].animation.framePerSecond;
    this.fall.start(false, length / DEATH.seconds);
  }

  // Where it is on the ground, how far along the road it is, and how high the middle of it is: what a
  // tower needs to know to aim at it.
  get x() {
    return this.node.position.x;
  }

  get z() {
    return this.node.position.z;
  }

  get progress() {
    return this.walker.progress;
  }

  get aimHeight() {
    return this.height * 0.6;
  }

  // Takes it out of the scene, with its copy of the skeleton and of the animations (the model's meshes and
  // pictures are shared with every other enemy of the kind, and are left alone).
  dispose() {
    this.copy.animationGroups.forEach((group) => group.dispose());
    this.copy.skeletons.forEach((skeleton) => skeleton.dispose());
    this.node.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ENEMIES, DEATH, CLIPS, clipRatio, loadEnemies, Enemy };
} else {
  Object.assign(window, { ENEMIES, DEATH, CLIPS, clipRatio, loadEnemies, Enemy });
}
