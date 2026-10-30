// Ledges: the top edges of things, that a runner in the air can catch with their hands. A ledge is one side of the top of a box (a roof, a
// ledge of a building in two levels), as a line to hang from. Everything here is plain arithmetic on a list of ledges, a body and a World, so a
// grab can be said in a test: that a body is in reach of a ledge, that there is room to hang from it, and room to stand on it after. The
// controller (see controller.js) is what hangs, shimmies and climbs. See ../tests/ledges.tests.js.

// The ledges of a list of boxes ({ name, minX, maxX, minY, maxY, minZ, maxZ }): four for each, one for each side. A ledge is
// { name, ax, az, bx, bz, nx, nz, tx, tz, length, y, lean }: it runs from (ax, az) to (bx, bz), `t` is the way along it, `n` is the way out from
// the wall (both unit vectors), `y` is the height of the top, which is where the hands go, and `lean` is how far the wall leans out, under the
// ledge, at the feet of a body that hangs from it (0 for a wall that is straight: it is the `lean` of the box, if it has one).
function ledgesOf(boxes) {
  const ledges = [];
  for (const box of boxes) {
    const sides = [
      { ax: box.minX, az: box.maxZ, bx: box.maxX, bz: box.maxZ, nx: 0, nz: 1 }, // the north side, which faces +z
      { ax: box.maxX, az: box.minZ, bx: box.minX, bz: box.minZ, nx: 0, nz: -1 }, // the south side
      { ax: box.maxX, az: box.maxZ, bx: box.maxX, bz: box.minZ, nx: 1, nz: 0 }, // the east side
      { ax: box.minX, az: box.minZ, bx: box.minX, bz: box.maxZ, nx: -1, nz: 0 }, // the west side
    ];
    for (const side of sides) {
      const length = Math.hypot(side.bx - side.ax, side.bz - side.az);
      ledges.push({ name: box.name, ...side, tx: (side.bx - side.ax) / length, tz: (side.bz - side.az) / length, length, y: box.maxY, lean: box.lean || 0 });
    }
  }
  return ledges;
}

// How far along a ledge a body may hang: not at the very end of it, since a body is wider than a point. A ledge shorter than that is hung from
// at its middle.
function clampAlong(ledge, u, options) {
  const margin = options.ledgeMargin;
  if (ledge.length <= margin * 2) return ledge.length / 2;
  return Math.min(ledge.length - margin, Math.max(margin, u));
}

// Where a body hangs from a ledge, `u` of the way along it: against the wall (a little out from it, and as far more as the wall leans), with its
// feet `hangDrop` under the ledge, facing the wall.
function hangSpot(ledge, u, options) {
  const out = options.radius + options.hangOffset + ledge.lean;
  return {
    x: ledge.ax + ledge.tx * u + ledge.nx * out,
    z: ledge.az + ledge.tz * u + ledge.nz * out,
    y: ledge.y - options.hangDrop,
    heading: Math.atan2(-ledge.nx, -ledge.nz),
  };
}

// Where a body stands after climbing a ledge: on top of it, a little in from the edge.
function topSpot(ledge, u, options) {
  const inside = options.radius + options.topOffset;
  return { x: ledge.ax + ledge.tx * u - ledge.nx * inside, z: ledge.az + ledge.tz * u - ledge.nz * inside, y: ledge.y };
}

// Whether a body can hang from a ledge at `u` (there is nothing else where it hangs), and whether it can climb it from there (there is
// something to stand on at the top, with nothing in the way of it).
function canHang(world, ledge, u, options) {
  const spot = hangSpot(ledge, u, options);
  const at = world.push(spot.x, spot.z, options.radius, spot.y, options.height, 0);
  return Math.hypot(at.x - spot.x, at.z - spot.z) < 0.05;
}
function canClimb(world, ledge, u, options) {
  const spot = topSpot(ledge, u, options);
  if (world.supportAt(spot.x, spot.z, 0, ledge.y + options.stepHeight) < ledge.y - 0.05) return false;
  const at = world.push(spot.x, spot.z, options.radius, ledge.y, options.height, options.stepHeight);
  return Math.hypot(at.x - spot.x, at.z - spot.z) < 0.05;
}

// The ledge a body in the air would catch, if any, and where along it: { ledge, u }. The body is { x, y, z, heading }. A ledge is caught if it
// is in reach of the hands (above the waist, below the top of the reach), the body is near the wall below it, is beside some of it, and faces
// it, and there is room to hang from it and to climb it. Of those that are, the nearest.
function findLedge(ledges, body, world, options) {
  const o = options;
  const forwardX = Math.sin(body.heading);
  const forwardZ = Math.cos(body.heading);
  let best = null;
  for (const ledge of ledges) {
    const above = ledge.y - body.y;
    if (above < o.handLow || above > o.handReach) continue;
    const dx = body.x - ledge.ax;
    const dz = body.z - ledge.az;
    const out = dx * ledge.nx + dz * ledge.nz;
    if (out < o.radius - 0.1 || out > o.radius + o.grabDistance) continue;
    const along = dx * ledge.tx + dz * ledge.tz;
    if (along < 0 || along > ledge.length) continue;
    if (-(forwardX * ledge.nx + forwardZ * ledge.nz) < Math.cos(o.grabAngle)) continue;
    const u = clampAlong(ledge, along, o);
    if (!canHang(world, ledge, u, o) || !canClimb(world, ledge, u, o)) continue;
    if (!best || out < best.out) best = { ledge, u, out };
  }
  return best && { ledge: best.ledge, u: best.u };
}

// The ledge that a body standing on a roof could lower itself over, if any, and where along it: { ledge, u }. The body is standing at the top of the
// ledge (its feet at the height of it, or a step above, on the raised edge), over the roof and within `dropReach` of the edge, beside some of it, and
// there is room to hang there. It need not be facing the edge. Of those that are, the nearest.
function findDrop(ledges, body, world, options) {
  const o = options;
  let best = null;
  for (const ledge of ledges) {
    const above = body.y - ledge.y;
    if (above < -0.1 || above > o.stepHeight) continue;
    const dx = body.x - ledge.ax;
    const dz = body.z - ledge.az;
    const inside = -(dx * ledge.nx + dz * ledge.nz);
    if (inside < -0.1 || inside > o.dropReach) continue;
    const along = dx * ledge.tx + dz * ledge.tz;
    if (along < 0 || along > ledge.length) continue;
    const u = clampAlong(ledge, along, o);
    if (!canHang(world, ledge, u, o)) continue;
    if (!best || inside < best.inside) best = { ledge, u, inside };
  }
  return best && { ledge: best.ledge, u: best.u };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ledgesOf, clampAlong, hangSpot, topSpot, canHang, canClimb, findLedge, findDrop };
} else {
  Object.assign(window, { ledgesOf, clampAlong, hangSpot, topSpot, canHang, canClimb, findLedge, findDrop });
}
