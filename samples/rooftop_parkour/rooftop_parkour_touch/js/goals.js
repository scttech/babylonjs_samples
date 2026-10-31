// Goals: things to do in the district. Tokens to collect, on the roofs and the fire escapes and in the street, and a time trial, a route of
// checkpoints to run as fast as can be. Like the plan, they are data and arithmetic with nothing drawn: where each token is, whether a body is
// close enough to take it, whether it has reached the next checkpoint, and how good its time was, can be said in a test. (Whether each can be
// *got to* is another question, and routes.js asks it with a bot.) See ../tests/goals.tests.js.

// A token. `radius` is how close to it a body must come to take it (the feet of the body to the place the token is over, which is where a
// body stands to be there), and `roofClear` how far from the things on a roof a token on the roof must be. `kinds` says what each kind of token is
// worth (flow counts it as that many tokens) and the colour it is drawn in.
const TOKEN = {
  radius: 1,
  roofClear: 2.5,
  kinds: {
    street: { value: 1, color: "#ffd23f" },
    platform: { value: 2, color: "#ffb02e" },
    roof: { value: 2, color: "#ff8c1a" },
    hut: { value: 3, color: "#ff5a36" },
  },
};

// Where on a roof there is room for a token: the middle of it, and then round the middle, as far from the things on the roof as `roofClear`.
const ROOF_SPOTS = [[0, 0], [3, 3], [-3, 3], [3, -3], [-3, -3], [5, 0], [-5, 0]];

// How far a token floats above what it is over, when it is drawn (the middle of it is a body's chest high: see TOKEN).
const TOKEN_FLOAT = 0.9;

// Every token of the district, as a list of { id, kind, x, y, z, value, building }: where it is (y is the ground or the roof or the platform
// that it is over, not the middle of it), how many it is worth, and which building it belongs to (-1 for the street). There are three in the street
// on the way from the start to the first fire escape; one on the top platform of every fire escape; one on every roof, in the clearest spot; and one on
// top of every hut.
function tokenSpots(grid = GRID, layouts = LAYOUTS) {
  const tokens = [];
  const add = (kind, x, y, z, building, index) => tokens.push({ id: `${kind}-${building}-${index}`, kind, x, y, z, value: TOKEN.kinds[kind].value, building });
  for (let i = 0; i < 3; i++) {
    const z = START.z - 1.5 - i * 1.5;
    add("street", START.x, groundHeight(START.x, z, grid), z, -1, i);
  }
  const roofs = buildingBoxes(grid, layouts);
  const things = roofThings(grid, layouts);
  for (const escape of fireEscapes(grid, layouts)) {
    const at = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 1.7, 1.2);
    add("platform", at.x, escape.top, at.z, escape.building, 0);
  }
  roofs.forEach((roof, building) => {
    const middle = { x: (roof.minX + roof.maxX) / 2, z: (roof.minZ + roof.maxZ) / 2 };
    const mine = things.filter((thing) => thing.minY === roof.maxY && thing.maxX > roof.minX && thing.minX < roof.maxX && thing.maxZ > roof.minZ && thing.minZ < roof.maxZ);
    const clear = ROOF_SPOTS.map(([u, v]) => ({ x: middle.x + u, z: middle.z + v })).find((spot) => mine.every((thing) => distanceToBox(thing, spot.x, spot.z) >= TOKEN.roofClear));
    add("roof", clear.x, roof.maxY, clear.z, building, 0);
  });
  things.forEach((thing, index) => {
    if (thing.kind !== "hut") return;
    const building = roofs.findIndex((roof) => thing.minY === roof.maxY && thing.minX >= roof.minX && thing.maxX <= roof.maxX && thing.minZ >= roof.minZ && thing.maxZ <= roof.maxZ);
    add("hut", (thing.minX + thing.maxX) / 2, thing.maxY, (thing.minZ + thing.maxZ) / 2, building, index);
  });
  return tokens;
}

// How far a point on the ground is from a box (0 if it is over it).
function distanceToBox(box, x, z) {
  return Math.hypot(Math.max(box.minX - x, 0, x - box.maxX), Math.max(box.minZ - z, 0, z - box.maxZ));
}

// Whether a body (its feet at { x, y, z }) is close enough to a token to take it: within `radius` of the place the token is over.
function canTake(token, body, table = TOKEN) {
  const dx = body.x - token.x;
  const dy = body.y - token.y;
  const dz = body.z - token.z;
  return Math.hypot(dx, dy, dz) <= table.radius;
}

// The tokens taken so far. `take` says which a body has just taken.
class Collection {
  constructor(tokens) {
    this.tokens = tokens;
    this.taken = new Set();
  }

  get count() {
    return this.taken.size;
  }

  get total() {
    return this.tokens.length;
  }

  // How much the tokens taken are worth.
  get value() {
    return this.tokens.filter((token) => this.taken.has(token.id)).reduce((sum, token) => sum + token.value, 0);
  }

  // Takes every token that the body is close enough to and that has not been taken: it says which they were.
  take(body, table = TOKEN) {
    const found = this.tokens.filter((token) => !this.taken.has(token.id) && canTake(token, body, table));
    for (const token of found) this.taken.add(token.id);
    return found;
  }

  has(token) {
    return this.taken.has(token.id);
  }

  reset() {
    this.taken.clear();
  }
}

// The trial: a route of checkpoints, in order, from the street to a roof to another roof and back to the street. It begins at the start gate, and
// the clock starts when the runner moves off. `par` is the time that is good (a gold), which is worked out by routes.js from a bot that runs it.
// `radius` is how close to the middle of a gate a body must come, and `above` how high over its base it counts (a gate is a tall post, not a floor).
const TRIAL = { name: "Round the block", radius: 2.2, below: 1, above: 3, moveOff: 0.5, par: 38, silver: 1.4, bronze: 2 };

// The checkpoints of the trial, as a list of { name, x, y, z }: the start gate (where the runner begins), the roof of the medium_1 (reached by its fire
// escape, and a ledge), the roof of the small_1 beside it (reached by the jump across the alley: the shortcut), and the finish, which is the start gate
// again. They are made from the plan, so they follow it.
function trialCheckpoints(grid = GRID, layouts = LAYOUTS) {
  const roofs = buildingBoxes(grid, layouts);
  const middle = (box) => ({ x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 });
  const medium = middle(roofs[1]);
  const small = middle(roofs[0]);
  const ground = groundHeight(START.x, START.z, grid);
  return [
    { name: "Start", x: START.x, y: ground, z: START.z },
    { name: "Medium roof", x: medium.x, y: roofs[1].maxY, z: medium.z },
    { name: "Small roof", x: small.x, y: roofs[0].maxY, z: small.z },
    { name: "Finish", x: START.x, y: ground, z: START.z },
  ];
}

// Whether a body is in a gate: close enough to its middle, and over its base by no more than it is tall.
function inGate(gate, body, table = TRIAL) {
  const over = body.y - gate.y;
  return Math.hypot(body.x - gate.x, body.z - gate.z) <= table.radius && over >= -table.below && over <= table.above;
}

// The medal that a time earns, against `par`: "gold" for par or better, "silver" for up to `silver` times par, "bronze" for up to `bronze` times, and
// "none" for slower.
function medalFor(time, par = TRIAL.par, table = TRIAL) {
  if (time <= par) return "gold";
  if (time <= par * table.silver) return "silver";
  if (time <= par * table.bronze) return "bronze";
  return "none";
}

// The state of a run of the trial. It is "ready" until the runner moves off from the start gate, then "running" (the clock goes), and "finished" when the
// last checkpoint is reached. `splits` is the time at each checkpoint reached. `update` says what happened this frame, as a list of events:
// { kind: "start" } or { kind: "checkpoint", index, time } or { kind: "finish", time, medal, best }.
class Trial {
  constructor(checkpoints, table = TRIAL) {
    this.checkpoints = checkpoints;
    this.table = table;
    this.best = null; // the best finishing time of all the runs
    this.restart();
  }

  // Back to the start gate, with the clock at zero.
  restart() {
    this.state = "ready";
    this.time = 0;
    this.next = 1; // the checkpoint to reach next (the start gate is 0)
    this.splits = [];
    this.medal = null;
  }

  // The checkpoint to head for now, or null when the run is over.
  get target() {
    return this.state === "finished" ? null : this.checkpoints[this.next];
  }

  update(body, dt) {
    const events = [];
    if (this.state === "ready" && body.speed > this.table.moveOff) {
      this.state = "running";
      events.push({ kind: "start" });
    }
    if (this.state !== "running") return events;
    this.time += dt;
    if (inGate(this.checkpoints[this.next], body, this.table)) {
      this.splits.push(this.time);
      if (this.next === this.checkpoints.length - 1) {
        this.state = "finished";
        this.medal = medalFor(this.time, this.table.par, this.table);
        this.best = this.best === null ? this.time : Math.min(this.best, this.time);
        events.push({ kind: "finish", time: this.time, medal: this.medal, best: this.best });
      } else {
        events.push({ kind: "checkpoint", index: this.next, time: this.time });
        this.next++;
      }
    }
    return events;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection, TRIAL, trialCheckpoints, inGate, medalFor, Trial };
} else {
  Object.assign(window, { TOKEN, ROOF_SPOTS, TOKEN_FLOAT, tokenSpots, distanceToBox, canTake, Collection, TRIAL, trialCheckpoints, inGate, medalFor, Trial });
}
