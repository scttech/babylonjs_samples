// A tower: a podium with a bender on it, and a brain (see brain.js) that decides what it does. This file
// is the model and the animation: it builds the podium and the bender, plays the idle and the attack
// that the brain asks for, turns the bender to face where the brain says, and works out where the hand
// is when it fires. See ../tests/tower.tests.js.

const TOWER_VIEW = {
  idlePeriod: 7, // how many seconds a tower plays one idle before it changes to the next (if it has more than one)
  blending: 0.08, // how quickly one clip fades into the next: the share of the way it goes each frame
  ring: 1.62, // how wide the ring of the first upgrade is, on the ground round the podium (which is 1.5 wide, in a cell of 2)
  ringStep: 0.22, // how much wider each ring after the first is
  ringThickness: 0.07, // how thick the tube of a ring is
  ringHeight: 0.06, // how high above the ground the rings are
};

// Which of `count` idles should be playing after `time` seconds: each, in turn, for `period` seconds.
function idleAt(count, time, period = TOWER_VIEW.idlePeriod) {
  return Math.floor(time / period) % count;
}

// Where the hand is in the world when it fires, as { x, y, z }. A tower stands at `at` (on the ground) with its
// bender on a podium `top` high, turned by `yaw`; `muzzle` is where the hand is, for a bender that is not scaled,
// and `scale` is how much it is scaled. Turning by a yaw takes a place (x, z) to (x cos + z sin, z cos - x sin).
function muzzleAt(at, top, yaw, muzzle, scale) {
  const x = muzzle.x * scale;
  const z = muzzle.z * scale;
  return {
    x: at.x + x * Math.cos(yaw) + z * Math.sin(yaw),
    y: top + muzzle.y * scale,
    z: at.z + z * Math.cos(yaw) - x * Math.sin(yaw),
  };
}

// The rings that say a tower has been upgraded: one for every level above the first, flat on the ground round the
// podium, in the color of the nation. They are all made now, out of sight, and shown as the tower gets its levels.
function buildRings(scene, parent, name, color) {
  const material = new BABYLON.StandardMaterial(`${name} ring`, scene);
  material.emissiveColor = BABYLON.Color3.FromHexString(color);
  material.disableLighting = true;
  const rings = [];
  for (let level = 2; level <= MAX_LEVEL; level++) {
    const diameter = TOWER_VIEW.ring + (level - 2) * TOWER_VIEW.ringStep;
    const ring = BABYLON.MeshBuilder.CreateTorus(`${name} ring ${level}`, { diameter, thickness: TOWER_VIEW.ringThickness, tessellation: 40 }, scene);
    ring.material = material;
    ring.parent = parent;
    ring.position.y = TOWER_VIEW.ringHeight;
    ring.isPickable = false;
    ring.setEnabled(false);
    rings.push(ring);
  }
  return rings;
}

class Tower {
  constructor(scene, loaded, kind, col, row, name = `tower ${col},${row}`, board = BOARD, benders = BENDERS) {
    const spec = benders[kind];
    const { podium, bender } = loaded[kind];
    const at = cellCenter(col, row, board);
    this.kind = kind;
    this.spec = spec; // what the tower can do now: the bender's row of the table, with its level worked into it
    this.base = spec; // the bender's row as it is in the table
    this.level = 1;
    this.col = col;
    this.row = row;
    this.at = at;
    this.top = podium.top;
    this.scale = bender.scale;
    this.brain = new TowerBrain(spec, at);
    this.time = (col * 3 + row * 5) % TOWER_VIEW.idlePeriod; // so that the towers don't all change idle at once

    this.node = new BABYLON.TransformNode(name, scene);
    this.node.position.set(at.x, 0, at.z);

    // The podium stands on the ground, in the middle of the cell.
    const podiumInner = new BABYLON.TransformNode(`${name} podium`, scene);
    podiumInner.parent = this.node;
    podiumInner.position.set(podium.shift.x, podium.lift, podium.shift.z);
    podiumInner.scaling.setAll(podium.scale);
    this.podiumCopy = podium.container.instantiateModelsToScene((original) => `${name} podium ${original}`, false, { doNotInstantiate: false });
    this.podiumCopy.rootNodes[0].parent = podiumInner;

    // The bender stands on top of it. The node that turns is in the middle, so that it turns about its feet.
    this.turner = new BABYLON.TransformNode(`${name} bender`, scene);
    this.turner.parent = this.node;
    this.turner.position.y = podium.top;
    const benderInner = new BABYLON.TransformNode(`${name} bender model`, scene);
    benderInner.parent = this.turner;
    benderInner.position.y = bender.lift;
    benderInner.scaling.setAll(bender.scale);
    this.copy = bender.container.instantiateModelsToScene((original) => `${name} bender ${original}`, false, { doNotInstantiate: false });
    this.copy.rootNodes[0].parent = benderInner;

    // Every clip fades into the one before it, and none of them plays until it is asked for.
    const find = (clip) => this.copy.animationGroups.find((group) => group.name === `${name} bender ${clip}`);
    this.copy.animationGroups.forEach((group) => {
      group.stop();
      group.enableBlending = true;
      group.blendingSpeed = TOWER_VIEW.blending;
    });
    // A ring on the ground for every level above the first.
    this.rings = buildRings(scene, this.node, name, spec.color);

    this.idles = spec.idles.map(find);
    this.attackClip = find(spec.attack.clip);
    this.current = null;
    this.idleNow = -1;
    this.playIdle();
    this.turner.rotation.y = this.brain.yaw;
  }

  // Makes the tower the level it is told, which says what it can do (and shows a ring for each level above the first). A
  // tower that is in the middle of an attack finishes it as it was, and attacks the new way from the next.
  setLevel(level) {
    this.level = level;
    this.spec = statsFor(this.base, level);
    this.rings.forEach((ring, i) => ring.setEnabled(i < level - 1));
  }

  // Plays a clip in place of the one that is playing.
  play(group, loop, speed = 1) {
    if (this.current && this.current !== group) this.current.stop();
    group.start(loop, speed);
    this.current = group;
  }

  playIdle() {
    this.idleNow = idleAt(this.idles.length, this.time);
    this.play(this.idles[this.idleNow], true);
  }

  // Where the hand is now, if it fired now with one of the attack's hits (the first, unless it is said).
  muzzle(hit = 0) {
    return muzzleAt(this.at, this.top, this.brain.yaw, this.spec.attack.hits[hit].muzzle, this.scale);
  }

  // Lets `dt` seconds go by, given the enemies there are. It gives back what the tower did that the
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color, damage }. A hit of an attack is a shot.
  update(dt, enemies) {
    this.time += dt;
    const shots = [];
    if (this.brain.state === "idle") this.brain.spec = this.spec;
    for (const event of this.brain.update(dt, enemies)) {
      if (event.type === "start") this.play(this.attackClip, false, this.spec.attack.speed);
      if (event.type === "end") this.playIdle();
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(event.hit), color: this.spec.color, damage: event.damage });
    }
    // Waiting, it changes its idle now and then, if it has more than one.
    if (this.brain.state === "idle" && this.idles.length > 1 && idleAt(this.idles.length, this.time) !== this.idleNow) this.playIdle();
    this.turner.rotation.y = this.brain.yaw;
    return shots;
  }

  // Takes the tower out of the scene, with its copy of the skeleton and of the animations.
  dispose() {
    this.rings[0].material.dispose();
    this.copy.animationGroups.forEach((group) => group.dispose());
    this.copy.skeletons.forEach((skeleton) => skeleton.dispose());
    this.node.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOWER_VIEW, idleAt, muzzleAt, Tower };
} else {
  Object.assign(window, { TOWER_VIEW, idleAt, muzzleAt, Tower });
}
