// Enemies: marbles that chase the player. An enemy is a marble like the player's (the same class, the
// same physics, steered with the same kind of push) but lighter on its feet, heavier in the shove,
// and steered by a program instead of a person. What it decides is plain numbers (where to push, and
// when to give up or to start again), with no Babylon.js and no page, so it is easy to test. Only then
// is it built in a scene. See ../tests/enemies.tests.js.

const ENEMY_FORCE = 15; // how hard an enemy pushes itself (the player's is 22), so it can be outrun
const ENEMY_TOP_SPEED = 6.5; // and how fast it can go by its own push (the player's is 10)
const ENEMY_MASS = 2; // twice the player's, so a hit shoves the player more than the enemy
const SIGHT_RANGE = 16; // an enemy notices the player when they are this close, in world units
const GIVE_UP_RANGE = 22; // and gives up when they have got this far away
const REACTION_TIME = 0.4; // seconds between noticing the player and setting off, so a first sight isn't a surprise attack
const RESPAWN_DELAY = 4; // seconds an enemy that has fallen off the level is gone for

// The way to push to get from one place to another along the floor, as a direction with a length
// of 1 ({ x, y, z } with y always 0), or no direction at all if they are already in the same place.
function chaseDirection(from, to) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.01) return { x: 0, y: 0, z: 0 };
  return { x: dx / distance, y: 0, z: dz / distance };
}

// What an enemy is thinking. It is always in one of these states:
//   idle      doing nothing, until the player comes within SIGHT_RANGE (and stays there for REACTION_TIME)
//   chasing   rolling at the player, until they get further than GIVE_UP_RANGE
//   fallen    off the level, for RESPAWN_DELAY seconds, and then back where it started
// The two distances are different (it gives up at 22 and notices at 16), so an enemy that has the
// player at the edge of its sight doesn't keep starting and stopping.
class Brain {
  constructor() {
    this.state = "idle";
    this.seen = 0; // how long the player has been in sight
    this.fallenFor = 0;
  }

  // Let `dt` seconds go by. `from` is where the enemy is and `to` where the player is, { x, y, z }, and
  // `fallen` says whether the enemy is off the level. Says which way to push, and whether it is time
  // to put the enemy back.
  update(dt, from, to, fallen) {
    const still = { x: 0, y: 0, z: 0 };

    if (fallen) {
      this.state = "fallen";
      this.seen = 0;
      this.fallenFor += dt;
      if (this.fallenFor < RESPAWN_DELAY) return { direction: still, respawn: false };
      this.state = "idle";
      this.fallenFor = 0;
      return { direction: still, respawn: true };
    }
    this.fallenFor = 0;
    if (this.state === "fallen") this.state = "idle";

    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    if (this.state === "idle") {
      this.seen = distance <= SIGHT_RANGE ? this.seen + dt : 0;
      if (this.seen >= REACTION_TIME) this.state = "chasing";
    } else if (distance > GIVE_UP_RANGE) {
      this.state = "idle";
      this.seen = 0;
    }
    return { direction: this.state === "chasing" ? chaseDirection(from, to) : still, respawn: false };
  }
}

// A look for an enemy: dark steel with an orange glow, the logo's colours for danger.
function makeEnemyMaterial(scene) {
  const material = new BABYLON.StandardMaterial("enemy", scene);
  material.diffuseColor = BABYLON.Color3.FromHexString("#2a2d38");
  material.emissiveColor = BABYLON.Color3.FromHexString("#ef5e07").scale(0.3);
  material.specularColor = new BABYLON.Color3(1, 1, 1);
  material.specularPower = 64;
  return material;
}

// A marble that steers itself. Everything a marble can do (be pushed, roll, fall, be put back at its start)
// it can do, and it is made heavier, and weaker at pushing itself, and given a brain.
class Enemy extends Marble {
  constructor(scene, start, { name = "enemy", limit = FALL_LIMIT } = {}) {
    super(scene, { start, name, material: makeEnemyMaterial(scene), mass: ENEMY_MASS, steer: { force: ENEMY_FORCE, topSpeed: ENEMY_TOP_SPEED } });
    this.brain = new Brain();
    this.limit = limit; // the height below which it has fallen off the level
    // The physics only says when bodies hit each other if a body asks to be told.
    this.aggregate.body.setCollisionCallbackEnabled(true);
  }

  // Think, then push, or be put back. Call it every frame, with how long the frame was and where the player is.
  update(dt, target) {
    const { direction, respawn } = this.brain.update(dt, this.position, target, hasFallen(this.position.y, this.limit));
    if (respawn) this.reset();
    else this.push(direction);
  }

  // Takes the enemy away.
  dispose() {
    this.aggregate.dispose();
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}

// Makes the enemies of a level, each where the level says. Returns them, `update(dt, target)`, which
// gives every one a turn to think, `owns(node)`, which says whether a mesh belongs to one of them,
// and `dispose()`.
function buildEnemies(scene, grid) {
  const limit = fallLimit(grid);
  const enemies = grid.enemies.map((place, index) => new Enemy(scene, levelStart(grid, place), { name: `enemy-${index}`, limit }));
  return {
    enemies,
    meshes: enemies.map((enemy) => enemy.mesh),
    owns: (node) => enemies.some((enemy) => enemy.mesh === node),
    update(dt, target) {
      for (const enemy of enemies) enemy.update(dt, target);
    },
    dispose() {
      for (const enemy of enemies) enemy.dispose();
    },
  };
}

// Calls `onHit(enemy's mesh, event)` when the marble and an enemy first touch (not while they stay in contact, and not when
// either touches the floor or anything else). `isEnemy(node)` says which meshes are enemies, so it can
// be asked afresh each time: the enemies change with the level. Returns `dispose()`.
function watchHits(scene, marble, isEnemy, onHit) {
  const plugin = scene.getPhysicsEngine().getPhysicsPlugin();
  const observer = plugin.onCollisionObservable.add((event) => {
    if (event.type !== "COLLISION_STARTED") return;
    const a = event.collider.transformNode;
    const b = event.collidedAgainst.transformNode;
    const other = a === marble.mesh ? b : b === marble.mesh ? a : null;
    if (other && isEnemy(other)) onHit(other, event);
  });
  return {
    dispose() {
      plugin.onCollisionObservable.remove(observer);
    },
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ENEMY_FORCE, ENEMY_TOP_SPEED, ENEMY_MASS, SIGHT_RANGE, GIVE_UP_RANGE, REACTION_TIME, RESPAWN_DELAY, chaseDirection, Brain, makeEnemyMaterial, Enemy, buildEnemies, watchHits };
} else {
  Object.assign(window, { ENEMY_FORCE, ENEMY_TOP_SPEED, ENEMY_MASS, SIGHT_RANGE, GIVE_UP_RANGE, REACTION_TIME, RESPAWN_DELAY, chaseDirection, Brain, makeEnemyMaterial, Enemy, buildEnemies, watchHits });
}
