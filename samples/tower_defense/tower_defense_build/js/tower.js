// A tower: a podium with a bender on it, and a brain (see brain.js) that decides what it does. This file
// is the model and the animation: it builds the podium and the bender, plays the idle and the attack
// that the brain asks for, turns the bender to face where the brain says, and works out where the hand
// is when it fires. See ../tests/tower.tests.js.

const TOWER_VIEW = {
  idlePeriod: 7, // how many seconds a tower plays one idle before it changes to the next (if it has more than one)
  blending: 0.08, // how quickly one clip fades into the next: the share of the way it goes each frame
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

class Tower {
  constructor(scene, loaded, kind, col, row, name = `tower ${col},${row}`, board = BOARD, benders = BENDERS) {
    const spec = benders[kind];
    const { podium, bender } = loaded[kind];
    const at = cellCenter(col, row, board);
    this.kind = kind;
    this.spec = spec;
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
    this.idles = spec.idles.map(find);
    this.attackClip = find(spec.attack.clip);
    this.current = null;
    this.idleNow = -1;
    this.playIdle();
    this.turner.rotation.y = this.brain.yaw;
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

  // Where the hand is now, if it fired now.
  muzzle() {
    return muzzleAt(this.at, this.top, this.brain.yaw, this.spec.attack.muzzle, this.scale);
  }

  // Lets `dt` seconds go by, given the enemies there are. It gives back what the tower did that the
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color }.
  update(dt, enemies) {
    this.time += dt;
    const shots = [];
    for (const event of this.brain.update(dt, enemies)) {
      if (event.type === "start") this.play(this.attackClip, false, this.spec.attack.speed);
      if (event.type === "end") this.playIdle();
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(), color: this.spec.color });
    }
    // Waiting, it changes its idle now and then, if it has more than one.
    if (this.brain.state === "idle" && this.idles.length > 1 && idleAt(this.idles.length, this.time) !== this.idleNow) this.playIdle();
    this.turner.rotation.y = this.brain.yaw;
    return shots;
  }

  // Takes the tower out of the scene, with its copy of the skeleton and of the animations.
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
  module.exports = { TOWER_VIEW, idleAt, muzzleAt, Tower };
} else {
  Object.assign(window, { TOWER_VIEW, idleAt, muzzleAt, Tower });
}
