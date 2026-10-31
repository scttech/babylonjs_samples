// Routes: whether the goals can be got to, and how long it takes. It asks the bot of reach.js. Which buildings can be got onto from the street (by a
// fire escape, by a climb from a ledge to the roof above it, by a jump across a gap), whether every token is on one of them, what each jump across a
// gap saves over the long way round, and how long the trial takes if it is run well, which is what its par is made from. The same controller and the
// same boxes as the game: so a change that puts a token out of reach is a failing test, and not a player who is stuck. See ../tests/routes.tests.js.

// How a runner is taken to be: how long the roll takes that follows a fall into the street from a roof.
const ROUTE = { roll: 1 };

// How long it takes to get from the street at one place to another, running: the distance over the sprint speed.
function runTime(a, b, options = { ...SCOUT, ...BODY }) {
  return Math.hypot(a.x - b.x, a.z - b.z) / options.sprintSpeed;
}

// How long a fall takes, from `height` metres: from rest, with gravity, and then the roll that follows it.
function fallTime(height, options = { ...SCOUT, ...BODY }) {
  return Math.sqrt((2 * Math.max(0, height)) / options.gravity) + ROUTE.roll;
}

// The district as the game has it, for the bot: the world, the ledges, the roofs, the lower roofs (of the buildings in two levels), and the fire escapes.
function districtWorld(grid = GRID, layouts = LAYOUTS) {
  const roofs = buildingBoxes(grid, layouts);
  const lower = ledgeBoxes(grid, layouts);
  const props = propBoxes(grid, layouts);
  const world = new World({ boxes: [...roofs, ...lower, ...rimBoxes(grid, layouts), ...props], ground: (x, z) => groundHeight(x, z, grid) });
  const ledges = ledgesOf([...roofs, ...lower, ...props]);
  const placed = buildingPlacements(grid, layouts);
  // The roof that a fire escape reaches: the lower one, for a building in two levels.
  const reached = roofs.map((roof, i) => (placed[i].ledge > 0 ? lower.find((box) => box.name === `${placed[i].name} ledge`) : roof));
  return { world, ledges, roofs, lower, placed, reached, escapes: fireEscapes(grid, layouts) };
}

// Where a run at a box that stands on a roof begins: at the face of it that has the most roof in front of it, as far back from the face as there
// is room for, up to `runUp`, facing it. It is { x, y, z, heading, dx, dz }, with (dx, dz) the way to go (along an axis, square on to the face).
function climbStart(from, target, runUp = 5) {
  const middle = { x: (target.minX + target.maxX) / 2, z: (target.minZ + target.maxZ) / 2 };
  const faces = [
    { dx: 1, dz: 0, room: target.minX - from.minX, x: target.minX, z: middle.z },
    { dx: -1, dz: 0, room: from.maxX - target.maxX, x: target.maxX, z: middle.z },
    { dx: 0, dz: 1, room: target.minZ - from.minZ, x: middle.x, z: target.minZ },
    { dx: 0, dz: -1, room: from.maxZ - target.maxZ, x: middle.x, z: target.maxZ },
  ];
  const face = faces.reduce((best, f) => (f.room > best.room ? f : best));
  const back = Math.max(0.3, Math.min(runUp, face.room - 0.6));
  return { x: face.x - face.dx * back, y: from.maxY, z: face.z - face.dz * back, heading: Math.atan2(face.dx, face.dz), dx: face.dx, dz: face.dz };
}

// Plays a climb on a roof: a runner on the roof `from` runs square at `target`, a box that stands on it or beside it (a hut, the upper roof of a building
// in two levels), jumps when it is within `near` of it, and holds the key while rising. It says { landed, time }: whether it ended up standing on the top.
function playClimb(world, ledges, from, target, options = {}) {
  const { runUp, near, time, dt } = { runUp: 5, near: 0.9, time: 8, dt: 1 / 60, ...options.bot };
  const start = climbStart(from, target, runUp);
  const body = new Controller({ x: start.x, z: start.z, y: start.y, heading: start.heading, world, ledges, options: options.body });
  const direction = { x: start.dx, z: start.dz };
  let jumped = false;
  for (let t = 0; t < time; t += dt) {
    const close = distanceToBox(target, body.x, body.z) < near;
    if (close) jumped = true;
    body.update(direction, true, dt, close || (jumped && !body.grounded && body.vy > 0));
    if (body.grounded && body.move === null && isOver(target, body.x, body.z, -0.1) && Math.abs(body.y - target.maxY) < 0.3) return { landed: true, time: t };
    if (body.y < Math.min(from.maxY, target.maxY) - 4) return { landed: false, time: t };
  }
  return { landed: false, time };
}

// What the bot can do in the district, as a list of the buildings it can get a runner onto, and how: { reached, edges }. `reached` is the set of the
// numbers of the buildings (the upper roof, for a building in two levels), and each edge is { kind, from, to, time }: "escape" (from the street, `from` is
// -1, by the fire escape, to the roof it reaches), "climb" (from that lower roof to the upper one, `from` and `to` the same building) and "crossing".
function reachable(env = districtWorld()) {
  const edges = [];
  const reached = new Set();
  env.escapes.forEach((escape) => {
    const result = playEscape(env.world, env.ledges, escape, env.reached[escape.building]);
    if (!result.reached) return;
    edges.push({ kind: "escape", from: -1, to: escape.building, time: result.time });
    if (env.placed[escape.building].ledge > 0) {
      const up = playClimb(env.world, env.ledges, env.reached[escape.building], env.roofs[escape.building]);
      if (!up.landed) return;
      edges.push({ kind: "climb", from: escape.building, to: escape.building, time: up.time });
    }
    reached.add(escape.building);
  });
  // The jumps: each from a building that is reached, played once, and as many times round as it takes for what they reach to reach more.
  const played = new Set();
  for (let again = true; again; ) {
    again = false;
    for (const { from, to } of CROSSINGS) {
      if (!reached.has(from) || played.has(`${from}>${to}`)) continue;
      played.add(`${from}>${to}`);
      const result = playCrossing(env.world, env.ledges, env.roofs[from], env.roofs[to]);
      if (!result.landed) continue;
      edges.push({ kind: "crossing", from, to, time: result.time });
      again = again || !reached.has(to);
      reached.add(to);
    }
  }
  return { reached, edges };
}

// What each designed jump across a gap saves over the long way round, as a list of { from, to, jump, around, saved } in seconds: the way round is to
// drop to the street, run to the foot of the fire escape of the building it goes to, and climb that. The jump is the bot's time for the jump (with its
// run-up). They say what a shortcut is worth, and a shortcut that saves nothing is not one.
function shortcuts(env = districtWorld(), edges = reachable(env).edges) {
  return CROSSINGS.map(({ from, to }) => {
    const jump = edges.find((edge) => edge.kind === "crossing" && edge.from === from && edge.to === to);
    const climb = edges.find((edge) => edge.kind === "escape" && edge.to === to);
    const foot = env.escapes.find((escape) => escape.building === to).planter;
    const here = env.escapes.find((escape) => escape.building === from).planter;
    const around = fallTime(env.roofs[from].maxY) + runTime(here, foot) + (climb ? climb.time : Infinity);
    return { from, to, jump: jump ? jump.time : Infinity, around, saved: around - (jump ? jump.time : Infinity) };
  });
}

// How long the trial takes if it is run well (as the bot would run it, with sprint held): to the foot of the fire escape of the medium_1, up it, up the
// ledge to the roof, across the gap to the small_1, off the roof to the street, and back to the start. It is an estimate, in seconds, and what the
// par of the trial is made from.
function trialEstimate(env = districtWorld(), edges = reachable(env).edges, checkpoints = trialCheckpoints()) {
  const escape = env.escapes.find((e) => e.building === 1);
  const up = edges.find((edge) => edge.kind === "escape" && edge.to === 1).time;
  const climb = edges.find((edge) => edge.kind === "climb" && edge.to === 1).time;
  const jump = edges.find((edge) => edge.kind === "crossing" && edge.from === 1 && edge.to === 0).time;
  const start = checkpoints[0];
  return runTime(start, escape.planter) + up + climb + jump + fallTime(checkpoints[2].y) + runTime(env.escapes.find((e) => e.building === 0).planter, start);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ROUTE, runTime, fallTime, districtWorld, climbStart, playClimb, reachable, shortcuts, trialEstimate };
} else {
  Object.assign(window, { ROUTE, runTime, fallTime, districtWorld, climbStart, playClimb, reachable, shortcuts, trialEstimate });
}
