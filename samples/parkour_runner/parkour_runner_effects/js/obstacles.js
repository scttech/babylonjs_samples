// Obstacles: the things in the runner's way, where they are, and whether the runner
// hit one. Like the street, this is plain data (no Babylon.js), so it is easy to
// test; main.js makes and hides the pieces, and runs the collision check every
// frame. See ../tests/obstacles.tests.js.
//
// Each kind of obstacle is beaten by a different move:
//   barrier   low, about knee height: jump it, or vault it (a vault is the more
//             forgiving: his hands are on it, so it can't catch him)
//   overhead  a bar at head height: slide (or roll) underneath it
//   container a wall: no move gets over it, so change lanes
// The numbers that matter for hitting things are in world units: how wide the
// obstacle is across the street, how long along it, and the range of heights it
// fills (bottom and top). The runner has a size too, from runner.js.

const RUNNER_HALF_WIDTH = 0.35; // half the runner's width, across the street
const RUNNER_HALF_DEPTH = 0.3; // half his length, along it
const VAULT_RANGE = 2.5; // a barrier this close ahead (in units) turns a jump into a vault
const VAULT_QUEUE_RANGE = 14; // press jump this far from a barrier (about a second and a half), and the vault waits until it is VAULT_RANGE away

const OBSTACLE_TYPES = {
  barrier: {
    // The construction barrier comes lying along z. Turned a quarter turn it lies
    // across the lane, and stretched along its length to fill one lane.
    pieces: ["roads/construction_barrier"],
    vaultable: true,
    rotationY: Math.PI / 2,
    scale: { x: 1, y: 1.1, z: 1.3 },
    halfWidth: 1,
    depth: 0.7,
    bottom: 0,
    top: 0.9,
  },
  overhead: {
    // The awning is a canopy on posts, made narrower and lower, so the canopy is a
    // bar across the lane at about head height.
    pieces: ["commercial/detail-awning-wide"],
    rotationY: 0,
    scale: { x: 0.36, y: 0.5, z: 1 },
    halfWidth: 1,
    depth: 1,
    bottom: 1,
    top: 1.5,
  },
  container: {
    pieces: ["industrial/shipping-container-a", "industrial/shipping-container-b", "industrial/shipping-container-c"],
    rotationY: 0,
    scale: { x: 0.8, y: 1, z: 1 }, // 2.6 wide as modeled, narrowed to fit a lane
    halfWidth: 1.04,
    depth: 5.7,
    bottom: 0,
    top: 2.45,
  },
};

// Which moves get past each kind of obstacle cleanly, for the combo. A container has
// none: the only way past it is another lane.
const CLEAN_MOVES = {
  barrier: ["jump", "vault"],
  overhead: ["slide", "roll"],
  container: [],
};

// Coins are made with the obstacles, in the gaps between the groups. The coin model
// is about 13 units across at the world's scale, so it is shrunk to half a unit.
const COIN_PIECE = "pickups/coin";
const COIN_SCALE = 0.04;
const COIN_SIZE = 0.54; // how big that makes it
const COIN_HEIGHT = 0.9; // the bottom of a coin is this far above the street: head and chest height
const COIN_SPACING = 2.5; // between one coin of a trail and the next
const COIN_MARGIN = 8; // a trail stays this far from the obstacles at either end of its gap
const MAX_TRAIL = 8; // the most coins in a trail

// Every piece an obstacle or a coin can be made from, each once, so each file is loaded once.
const OBSTACLE_PIECES = [...new Set([...Object.values(OBSTACLE_TYPES).flatMap((type) => type.pieces), COIN_PIECE])];

// The ways obstacles come: a group is a pattern, with what is in each of the three
// lanes (left, middle, right), or null for an empty lane. Every pattern can be
// beaten: there is always an empty lane, or one that a jump or a slide gets past.
const PATTERNS = [
  ["container", null, null],
  [null, "container", null],
  [null, null, "container"],
  ["barrier", "barrier", "barrier"],
  ["overhead", "overhead", "overhead"],
  ["container", "barrier", "container"],
  ["container", "overhead", "container"],
  ["barrier", null, "barrier"],
  ["overhead", "container", null],
  [null, "container", "container"],
];

const FIRST_GROUP_Z = 50; // the first obstacles are this far from the start
const MIN_GAP = 22; // the shortest and longest distance between one group and the next
const MAX_GAP = 36;

// Once the runner is fast enough, the groups come closer together. From DENSE_SPEED
// the gaps shrink as he speeds up, down to DENSE_GAP_SCALE of what they were at MAX_SPEED.
const DENSE_SPEED = 22;
const DENSE_GAP_SCALE = 0.8;

// What the gaps are multiplied by for a group at distance `z` along the street: 1
// until the runner (who has run that far) reaches DENSE_SPEED, then less and less.
function gapScale(z) {
  const speed = speedFor(z);
  if (speed <= DENSE_SPEED) return 1;
  return 1 - ((1 - DENSE_GAP_SCALE) * (speed - DENSE_SPEED)) / (MAX_SPEED - DENSE_SPEED);
}

const OBSTACLES_AHEAD = 150; // built this far in front of the runner, as the street is
const OBSTACLES_BEHIND = 20;

// One obstacle of the given kind in the given lane (-1, 0 or 1), at distance `z`
// along the street. `random` picks which piece, for kinds that have several.
// The placement says what to draw (`piece`, `rotationY`, `scale`) and what it
// hits (the size and height numbers), and `endZ` is where it ends along the street.
function obstacleAt(kind, lane, z, random) {
  const type = OBSTACLE_TYPES[kind];
  return {
    type: kind,
    piece: type.pieces[Math.floor(random() * type.pieces.length)],
    vaultable: Boolean(type.vaultable),
    x: laneX(lane),
    z,
    rotationY: type.rotationY,
    scale: type.scale,
    halfWidth: type.halfWidth,
    depth: type.depth,
    bottom: type.bottom,
    top: type.top,
    endZ: z + type.depth / 2,
  };
}

// One coin, in the given lane (-1, 0 or 1), at distance `z` along the street. It has
// the same kind of placement as an obstacle, with a size to be touched by, so the same
// collision test works. Its `type` is "coin", which is how the field tells it apart.
function coinAt(lane, z) {
  return {
    type: "coin",
    piece: COIN_PIECE,
    x: laneX(lane),
    y: COIN_HEIGHT,
    z,
    rotationY: 0,
    scale: { x: COIN_SCALE, y: COIN_SCALE, z: COIN_SCALE },
    halfWidth: COIN_SIZE / 2,
    depth: COIN_SIZE,
    bottom: COIN_HEIGHT,
    top: COIN_HEIGHT + COIN_SIZE,
    endZ: z + COIN_SIZE / 2,
  };
}

// Whether the runner is touching an obstacle. Three tests, and all three must
// pass: they overlap across the street, along the street, and in height. The
// runner's height is the part that changes with what he is doing, so a slide
// goes under an overhead bar and a jump goes over a barrier. A vault is the one
// move that ignores part of the test: with his hands on a vaultable obstacle, he
// can't be caught by it.
function hits(runner, obstacle) {
  if (obstacle.vaultable && runner.move === MOVES.vault) return false;
  const across = Math.abs(runner.x - obstacle.x) < obstacle.halfWidth + RUNNER_HALF_WIDTH;
  const along = Math.abs(runner.z - obstacle.z) < obstacle.depth / 2 + RUNNER_HALF_DEPTH;
  const high = runner.y < obstacle.top && runner.y + runner.bodyHeight > obstacle.bottom;
  return across && along && high;
}

// How far ahead the next barrier in the runner's lane is: from the front of the
// runner to the front of the barrier, in units, or Infinity if there isn't one (in
// his lane, and not yet passed). The game uses it to turn a jump into a vault: close
// enough (VAULT_RANGE) and he vaults now; a little further (VAULT_QUEUE_RANGE) and he
// vaults when he gets there. `obstacles` is any list of placements.
function barrierGap(runner, obstacles) {
  let nearest = Infinity;
  for (const obstacle of obstacles) {
    if (obstacle.type !== "barrier") continue;
    if (Math.abs(runner.x - obstacle.x) >= obstacle.halfWidth + RUNNER_HALF_WIDTH) continue;
    const gap = obstacle.z - obstacle.depth / 2 - (runner.z + RUNNER_HALF_DEPTH);
    if (gap >= 0 && gap < nearest) nearest = gap;
  }
  return nearest;
}

class ObstacleField {
  constructor({ seed = 1, firstZ = FIRST_GROUP_Z, ahead = OBSTACLES_AHEAD, behind = OBSTACLES_BEHIND } = {}) {
    this.seed = seed;
    this.firstZ = firstZ;
    this.ahead = ahead;
    this.behind = behind;
    this.active = new Map(); // id -> obstacle, for every obstacle that exists right now
    this._start();
  }

  // Puts the field back to before anything was made.
  _start() {
    this.random = seededRandom(this.seed);
    this.nextId = 0;
    this.nextGroupZ = this.firstZ;
    this.lastGroupZ = 0; // where the group before the next one was: the start of the street, to begin with
    this.touched = new Map(); // obstacle id -> the moves the runner was doing while he was over it
    this.counted = new Set(); // ids of the obstacles already counted as passed
  }

  // Remembers a new obstacle, giving it an id so it can be found again to remove.
  _add(obstacle) {
    const placed = { ...obstacle, id: this.nextId++ };
    this.active.set(placed.id, placed);
    return placed;
  }

  // Makes a group of obstacles at `z`: one of the patterns, with an obstacle in
  // each lane the pattern says.
  _makeGroup(z) {
    const pattern = PATTERNS[Math.floor(this.random() * PATTERNS.length)];
    const group = [];
    pattern.forEach((kind, i) => {
      if (kind) group.push(this._add(obstacleAt(kind, i - MAX_LANE, z, this.random)));
    });
    return group;
  }

  // A trail of coins in one lane, in the gap between the group at `fromZ` and the one
  // at `toZ`, well clear of both. The lane is random, and a trail never has more than
  // MAX_TRAIL coins, or fewer than the gap has room for.
  _makeTrail(fromZ, toZ) {
    const lane = Math.floor(this.random() * (2 * MAX_LANE + 1)) - MAX_LANE;
    const trail = [];
    const start = fromZ + COIN_MARGIN;
    const end = toZ - COIN_MARGIN;
    for (let z = start; z <= end && trail.length < MAX_TRAIL; z += COIN_SPACING) {
      trail.push(this._add(coinAt(lane, z)));
    }
    return trail;
  }


  // Brings the obstacles up to date for a runner at `z`: makes the groups now
  // within `ahead` of him, with a random gap between one group and the next, and
  // drops the ones that are behind him. Returns what changed, { added, removed }, as
  // the street does. Calling it again for the same `z` changes nothing.
  update(z) {
    const added = [];
    const removed = [];

    while (this.nextGroupZ < z + this.ahead) {
      added.push(...this._makeTrail(this.lastGroupZ, this.nextGroupZ));
      added.push(...this._makeGroup(this.nextGroupZ));
      this.lastGroupZ = this.nextGroupZ;
      this.nextGroupZ += (MIN_GAP + this.random() * (MAX_GAP - MIN_GAP)) * gapScale(this.nextGroupZ);
    }

    const back = z - this.behind;
    for (const [id, obstacle] of this.active) {
      if (obstacle.endZ < back) {
        this.active.delete(id);
        this.touched.delete(id);
        this.counted.delete(id);
        removed.push(obstacle);
      }
    }
    return { added, removed };
  }

  // The obstacle the runner is touching, or null. Coins are not obstacles.
  hit(runner) {
    for (const obstacle of this.active.values()) {
      if (obstacle.type !== "coin" && hits(runner, obstacle)) return obstacle;
    }
    return null;
  }

  // The coins the runner is touching. They are picked up: taken out of the field, and
  // returned so the game can hide them.
  collect(runner) {
    const collected = [];
    for (const [id, obstacle] of this.active) {
      if (obstacle.type === "coin" && hits(runner, obstacle)) {
        this.active.delete(id);
        collected.push(obstacle);
      }
    }
    return collected;
  }

  // Remembers what the runner is doing while he is over an obstacle (in its lane and
  // along its length, whatever his height). Call it every frame.
  track(runner) {
    for (const [id, obstacle] of this.active) {
      if (obstacle.type === "coin") continue;
      const across = Math.abs(runner.x - obstacle.x) < obstacle.halfWidth + RUNNER_HALF_WIDTH;
      const along = Math.abs(runner.z - obstacle.z) < obstacle.depth / 2 + RUNNER_HALF_DEPTH;
      if (across && along) {
        if (!this.touched.has(id)) this.touched.set(id, new Set());
        this.touched.get(id).add(runner.move);
      }
    }
  }

  // The obstacles the runner has just got past with the right move: ones he went over,
  // under or through (never just ran by in another lane), that are now behind him. Each is
  // returned once. This is what the combo counts.
  passed(runner) {
    const clean = [];
    for (const [id, obstacle] of this.active) {
      if (obstacle.type === "coin" || this.counted.has(id)) continue;
      if (obstacle.endZ + RUNNER_HALF_DEPTH >= runner.z) continue; // not behind him yet
      this.counted.add(id);
      const moves = this.touched.get(id);
      if (moves && CLEAN_MOVES[obstacle.type].some((move) => moves.has(move))) clean.push(obstacle);
    }
    return clean;
  }

  // How far ahead the next barrier in the runner's lane is (see barrierGap).
  barrierGap(runner) {
    return barrierGap(runner, this.active.values());
  }

  // Takes every obstacle away and starts again, so the next update makes the same
  // obstacles as the first. Returns the ones that were taken away.
  reset() {
    const removed = [...this.active.values()];
    this.active.clear();
    this._start();
    return removed;
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, CLEAN_MOVES, OBSTACLE_PIECES, COIN_PIECE, COIN_HEIGHT, COIN_SPACING, COIN_MARGIN, MAX_TRAIL, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, DENSE_SPEED, DENSE_GAP_SCALE, gapScale, obstacleAt, coinAt, hits, barrierGap, ObstacleField };
} else {
  Object.assign(window, { RUNNER_HALF_WIDTH, RUNNER_HALF_DEPTH, VAULT_RANGE, VAULT_QUEUE_RANGE, OBSTACLE_TYPES, CLEAN_MOVES, OBSTACLE_PIECES, COIN_PIECE, COIN_HEIGHT, COIN_SPACING, COIN_MARGIN, MAX_TRAIL, PATTERNS, FIRST_GROUP_Z, MIN_GAP, MAX_GAP, DENSE_SPEED, DENSE_GAP_SCALE, gapScale, obstacleAt, coinAt, hits, barrierGap, ObstacleField });
}
