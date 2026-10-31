// Reach: a check that the places of the district can be got to. It plays the game, with a bot in place of a player: it puts a runner on one roof,
// runs it at another, jumps at the edge, and says whether the runner ended up standing on the other roof; or it takes a runner up a fire escape,
// from the street to the roof. The same Controller, the same numbers, the same boxes as the game: so a change to any of them (a wider gap, a slower
// jump, a taller wall) that makes a route impossible makes a test fail, and nobody has to walk it to find out. See ../tests/reach.tests.js.

// How the bot plays a jump: how far back from the edge it starts its run, how far ahead it looks for the edge (the jump key goes down where the
// ground a little ahead is a long way down), how far down is a long way, and how long it has, in seconds, before it gives up.
const BOT = { runUp: 6, lookAhead: 0.7, drop: 0.5, time: 6, dt: 1 / 60 };

// How far one roof is from another, as the line between their nearest points: { from: { x, z }, to: { x, z }, distance, dx, dz }, with (dx, dz) the
// unit vector from one to the other (for roofs that touch, from the middle of one to the middle of the other). The roofs are boxes { minX, maxX, minZ, maxZ }.
function approach(a, b) {
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const middle = { x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2 };
  const near = { x: clamp(middle.x, a.minX, a.maxX), z: clamp(middle.z, a.minZ, a.maxZ) };
  const to = { x: clamp(near.x, b.minX, b.maxX), z: clamp(near.z, b.minZ, b.maxZ) };
  const from = { x: clamp(to.x, a.minX, a.maxX), z: clamp(to.z, a.minZ, a.maxZ) };
  const distance = Math.hypot(to.x - from.x, to.z - from.z);
  // Roofs that touch have no line between them: the way is from the middle of one to the middle of the other.
  const aim = distance > 0 ? { x: to.x - from.x, z: to.z - from.z } : { x: middle.x - (a.minX + a.maxX) / 2, z: middle.z - (a.minZ + a.maxZ) / 2 };
  const length = Math.hypot(aim.x, aim.z) || 1;
  return { from, to, distance, dx: aim.x / length, dz: aim.z / length };
}

// Whether a point is over a box, with `margin` to spare (negative is inside it by that much).
function isOver(box, x, z, margin = 0) {
  return x >= box.minX - margin && x <= box.maxX + margin && z >= box.minZ - margin && z <= box.maxZ + margin;
}

// The unit vector from the body toward a point, or null if it is there.
function steerTo(body, point) {
  const dx = point.x - body.x;
  const dz = point.z - body.z;
  const distance = Math.hypot(dx, dz);
  return distance < 1e-6 ? null : { x: dx / distance, z: dz / distance };
}

// Where a run at one roof from another begins: { x, y, z, heading, dx, dz }, on the roof `from`, as far back from the edge nearest `to` as there is
// roof for, but not further than `runUp`, facing the way to go.
function crossingStart(from, to, runUp = BOT.runUp) {
  const line = approach(from, to);
  let back = runUp;
  while (back > 0 && !isOver(from, line.from.x - line.dx * back, line.from.z - line.dz * back, -0.6)) back -= 0.25;
  return { x: line.from.x - line.dx * back, y: from.maxY, z: line.from.z - line.dz * back, heading: Math.atan2(line.dx, line.dz), dx: line.dx, dz: line.dz };
}

// Plays one crossing: a runner on the roof `from` runs at the roof `to` (both boxes { minX, maxX, minY, maxY, minZ, maxZ }, a roof being where
// the top of the box is). `world` and `ledges` are the game's. It says how it went, { landed, how, time }: `landed` is whether the runner ended up
// standing on `to`, and `how` is "jump", "climb" (it caught the edge, and climbed up), or "fell" or "stayed" if it did not get there.
function playCrossing(world, ledges, from, to, options = {}) {
  const { runUp, lookAhead, drop, time, dt } = { ...BOT, ...options.bot };
  const start = crossingStart(from, to, runUp);
  const body = new Controller({ x: start.x, z: start.z, y: start.y, heading: start.heading, world, ledges, options: options.body });
  const direction = { x: start.dx, z: start.dz };
  let jumped = false;
  let climbed = false;
  for (let t = 0; t < time; t += dt) {
    // The key goes down where the ground ends: the ground a little ahead is a long way down. Then it is held while the runner rises.
    const ahead = world.supportAt(body.x + direction.x * lookAhead, body.z + direction.z * lookAhead, 0, body.y + 0.01);
    const edge = body.grounded && ahead < body.y - drop;
    if (edge) jumped = true;
    body.update(direction, true, dt, edge || (jumped && !body.grounded && body.vy > 0));
    if (body.hang && body.hang.climb !== null) climbed = true;
    if (body.grounded && body.move === null && isOver(to, body.x, body.z, 0.1) && Math.abs(body.y - to.maxY) < 0.6) {
      return { landed: true, how: climbed ? "climb" : "jump", time: t };
    }
    if (body.y < Math.min(from.maxY, to.maxY) - 4) return { landed: false, how: "fell", time: t };
  }
  return { landed: false, how: "stayed", time };
}

// How the bot climbs a fire escape: how far out from the planter (in the street) it begins, how near the edge of the platform (out from the wall)
// it is when it jumps from the planter, how near the middle of each waypoint of the platforms it must come, and how long it has.
const CLIMBER = { start: 3.5, jumpOut: 1, arrive: 0.35, time: 120, dt: 1 / 60 };

// Plays a climb of a fire escape (see fireEscapes in props.js) from the street to the roof `roof` (a box): the runner begins on the street in front of
// the planter, runs at it and mantles it, jumps from it at the edge of the first platform and climbs onto it, then, at each platform, walks round to the
// foot of the stair and up it; at the top platform it walks at the wall and, if the roof is higher than a step, climbs. It says { reached, time, floor }.
function playEscape(world, ledges, escape, roof, options = {}) {
  const { start, jumpOut, arrive, time, dt } = { ...CLIMBER, ...options.bot };
  const at = (along, out) => frameToWorld({ x: escape.x, z: escape.z }, escape.turn, along, out);
  const outOf = (body) => {
    const s = Math.sin((escape.turn * Math.PI) / 2);
    const c = Math.cos((escape.turn * Math.PI) / 2);
    return (body.x - escape.x) * s + (body.z - escape.z) * c;
  };
  const begin = at(0, PLANTER.out + start);
  const wall = at(0, 0);
  const body = new Controller({ x: begin.x, z: begin.z, heading: Math.atan2(wall.x - begin.x, wall.z - begin.z), world, ledges, options: options.body });
  const planter = escape.planter.box;
  const nearPlanter = (b) => Math.hypot(Math.max(planter.minX - b.x, 0, b.x - planter.maxX), Math.max(planter.minZ - b.z, 0, b.z - planter.maxZ));
  // At each platform: the corner by the front of the platform to the left of the stair, the foot of the stair, and the top of it.
  const way = [at(-1.8, 1.5), at(-1.8, 0.45), at(1.7, 0.45)];
  let phase = "planter";
  let step = 0;
  let floor = 0;
  for (let t = 0; t < time; t += dt) {
    let direction = null;
    let jump = false;
    if (phase === "planter") {
      direction = steerTo(body, at(0, PLANTER.out));
      jump = nearPlanter(body) < 0.75;
      if (body.grounded && body.y >= PLANTER.height - 0.1) phase = "edge";
    } else if (phase === "edge") {
      direction = steerTo(body, wall);
      jump = outOf(body) < FIRE_ESCAPE.depth + jumpOut;
      if (!body.grounded && outOf(body) < FIRE_ESCAPE.depth + jumpOut - 0.2) direction = null;
      if (body.hang) phase = "hang";
    } else if (phase === "hang") {
      direction = steerTo(body, wall);
      if (!body.hang && body.grounded) phase = "walk";
    } else if (floor >= escape.floors - 1) {
      direction = steerTo(body, at(0, -1));
      jump = escape.rise > ESCAPE_RISE.walk;
      if (body.grounded && body.move === null && isOver(roof, body.x, body.z) && Math.abs(body.y - roof.maxY) < 0.6) return { reached: true, time: t, floor };
    } else {
      direction = steerTo(body, way[step]);
      if (Math.hypot(body.x - way[step].x, body.z - way[step].z) < arrive) {
        step++;
        if (step >= way.length) {
          step = 0;
          floor++;
        }
      }
    }
    body.update(direction, false, dt, jump);
    if (body.y < -2) return { reached: false, time: t, floor, phase };
  }
  return { reached: false, time, floor, phase };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { BOT, approach, isOver, steerTo, crossingStart, playCrossing, CLIMBER, playEscape };
} else {
  Object.assign(window, { BOT, approach, isOver, steerTo, crossingStart, playCrossing, CLIMBER, playEscape });
}
