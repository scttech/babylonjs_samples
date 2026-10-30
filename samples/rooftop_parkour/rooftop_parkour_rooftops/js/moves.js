// The moves between: vaulting a low wall, mantling a ledge from the ground without hanging, kicking off a wall in the air, and a little help
// for a grab that is nearly right. Like ledges.js, everything here is plain arithmetic on a body and a World (or a list of ledges), so a vault
// can be said in a test: that a wall is low enough, thin enough and near enough, and that there is room to land. The controller (see
// controller.js) is what moves the body. See ../tests/moves.tests.js.

// Where a line from (x, z) in the direction (dx, dz) crosses a box, as the distances along it at which it goes in and comes out: { enter, exit },
// or null if it misses. (A line that starts inside the box goes in at 0.) The line is only looked at ahead of its start.
function crossing(box, x, z, dx, dz) {
  let enter = 0;
  let exit = Infinity;
  for (const [at, along, low, high] of [[x, dx, box.minX, box.maxX], [z, dz, box.minZ, box.maxZ]]) {
    if (Math.abs(along) < 1e-9) {
      if (at < low || at > high) return null; // going along the slab, and outside it
      continue;
    }
    const a = (low - at) / along;
    const b = (high - at) / along;
    enter = Math.max(enter, Math.min(a, b));
    exit = Math.min(exit, Math.max(a, b));
  }
  return enter <= exit ? { enter, exit } : null;
}

// The wall a body that is running would vault, if any, and where: { from, to, top, distance }, with `from` and `to` as { x, y, z }. The body is
// { x, y, z, heading, speed }. It must be going fast enough, and the wall must be ahead of it and near, low enough to get over and thick
// enough to be more than a step, and no thicker than it can get across; and there must be a place to land on the other side, about as high
// as the one it is on, with room to stand there.
function findVault(world, body, options) {
  const o = options;
  if (body.speed < o.vaultSpeed) return null;
  const dx = Math.sin(body.heading);
  const dz = Math.cos(body.heading);
  let best = null;
  for (const box of world.boxes) {
    const top = box.maxY - body.y;
    if (top <= o.stepHeight || top > o.vaultHeight || box.minY >= body.y + o.stepHeight) continue;
    const hit = crossing(box, body.x, body.z, dx, dz);
    if (!hit || hit.enter > o.radius + o.vaultReach || hit.exit - hit.enter > o.vaultDepth) continue;
    const far = hit.exit + o.radius + o.vaultLanding;
    const to = { x: body.x + dx * far, z: body.z + dz * far };
    const ground = world.supportAt(to.x, to.z, o.supportReach, box.maxY);
    if (Math.abs(ground - body.y) > o.stepHeight) continue;
    const at = world.push(to.x, to.z, o.radius, ground, o.height, o.stepHeight);
    if (Math.hypot(at.x - to.x, at.z - to.z) > 0.05) continue;
    if (!best || hit.enter < best.enter) {
      best = { enter: hit.enter, from: { x: body.x, y: body.y, z: body.z }, to: { x: to.x, y: ground, z: to.z }, top: box.maxY, distance: far };
    }
  }
  return best && { from: best.from, to: best.to, top: best.top, distance: best.distance };
}

// The ledge a body on the ground would mantle, if any, and where along it: { ledge, u }. It is a ledge too high to step onto and not so high that
// the hands can't get onto it from the ground, and it is caught the way a ledge is in the air (near the wall, facing it, beside it), except that
// the body does not hang from it: there only has to be room to climb it.
function findMantle(ledges, body, world, options) {
  return findLedge(ledges, body, world, { ...options, handLow: options.stepHeight, handReach: options.mantleHeight }, true);
}
// The wall that a body in the air could kick off, if any: { nx, nz }, the way out from it, as a unit vector. It is a wall that reaches
// `wallMinHeight` above the feet, that is within `wallReach` of the body, edge to wall, and that the body is facing (to within the angle of a
// grab). Of those that are, the nearest. It is { nx, nz, box }, the box being the wall; the wall `except` is not looked at (the one just kicked off).
function findWall(world, body, options, except = null) {
  const o = options;
  const forwardX = Math.sin(body.heading);
  const forwardZ = Math.cos(body.heading);
  let best = null;
  for (const box of world.wallsAt(body.y, o.height, o.stepHeight)) {
    if (box === except || box.maxY - body.y < o.wallMinHeight) continue;
    const dx = body.x - Math.min(box.maxX, Math.max(box.minX, body.x));
    const dz = body.z - Math.min(box.maxZ, Math.max(box.minZ, body.z));
    const distance = Math.hypot(dx, dz);
    if (distance === 0 || distance > o.radius + o.wallReach) continue;
    const nx = dx / distance;
    const nz = dz / distance;
    if (-(forwardX * nx + forwardZ * nz) < Math.cos(o.grabAngle)) continue;
    if (!best || distance < best.distance) best = { nx, nz, box, distance };
  }
  return best && { nx: best.nx, nz: best.nz, box: best.box };
}

// The numbers of a grab, with a little more allowed, for a body that is steering toward a ledge: the hands reach a little higher, it can be a
// little further from the wall, and a little more turned from it. It is for findLedge, when it has found nothing, to ask again.
function assisted(options) {
  return {
    ...options,
    handReach: options.handReach + options.assistReach,
    grabDistance: options.grabDistance + options.assistDistance,
    grabAngle: options.grabAngle + options.assistAngle,
  };
}
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { crossing, findVault, findMantle, findWall, assisted };
} else {
  Object.assign(window, { crossing, findVault, findMantle, findWall, assisted });
}
