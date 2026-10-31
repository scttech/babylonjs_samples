// Surfaces: where in the room a thing can stand. With WebXR the phone finds the floor and the walls itself and reports them as poses;
// with only the camera's picture the game has to guess, and its guess is that the floor is flat, level and one phone's height below
// the eye. Both kinds of answer are the same shape, { point, normal, distance, guessed }, so the rest of the game cannot tell which it
// has. All plain arithmetic, tested without a phone. See ../tests/surface.tests.js.

const SURFACE = {
  floorY: 0, // the height of the floor in the game's world (the eye is LOOK.eyeHeight above it)
  maxDistance: 6, // metres: further than this a guess about the floor is not believed
  minDownDegrees: 8, // how far below the horizon the camera must look to be looking at the floor
  upDot: 0.8, // a surface whose normal points this far up (the dot with straight up) is a floor
  tapPixels: 10, // a press that moves further than this is a drag, not a tap
  tapMilliseconds: 450, // and one that lasts longer is a hold
};

const length = (v) => Math.hypot(v[0], v[1], v[2]);

// Where a ray (a point and a direction, not necessarily of length one) meets a flat level surface at height `planeY`. Nothing if
// it never does: it runs level, or away from it.
function hitPlane(origin, direction, planeY) {
  if (Math.abs(direction[1]) < 1e-9) return null;
  const t = (planeY - origin[1]) / direction[1];
  if (t <= 0) return null;
  return {
    point: [origin[0] + direction[0] * t, planeY, origin[2] + direction[2] * t],
    distance: t * length(direction),
  };
}

// The game's guess at the floor: where the line of sight meets it, as long as the camera looks down enough and it is not too far.
function findFloor(origin, forward, table = SURFACE) {
  const looking = (Math.asin(Math.max(-1, Math.min(1, forward[1] / (length(forward) || 1)))) * 180) / Math.PI;
  if (looking > -table.minDownDegrees) return null;
  const hit = hitPlane(origin, forward, table.floorY);
  if (!hit || hit.distance > table.maxDistance) return null;
  return { point: hit.point, normal: [0, 1, 0], distance: hit.distance, guessed: true };
}

// A vector turned by a rotation (a quaternion: { x, y, z, w }).
function rotateByQuaternion(v, q) {
  const [x, y, z] = v;
  // t = 2 * cross(q.xyz, v); result = v + w * t + cross(q.xyz, t)
  const tx = 2 * (q.y * z - q.z * y);
  const ty = 2 * (q.z * x - q.x * z);
  const tz = 2 * (q.x * y - q.y * x);
  return [x + q.w * tx + (q.y * tz - q.z * ty), y + q.w * ty + (q.z * tx - q.x * tz), z + q.w * tz + (q.x * ty - q.y * tx)];
}

// A surface from the pose WebXR gives for a hit: where it is, and the rotation of a flat thing laid on it, whose up is the normal.
function surfaceFromPose(position, rotation, distance = null) {
  return { point: [position[0], position[1], position[2]], normal: rotateByQuaternion([0, 1, 0], rotation), distance, guessed: false };
}

// Is a surface a floor (or a table, or the top of anything level), and not a wall?
function isFloor(surface, table = SURFACE) {
  return surface !== null && surface.normal[1] >= table.upDot;
}

// Was a press and its release a tap? `down` and `up` are { x, y, time } (pixels, milliseconds).
function isTap(down, up, table = SURFACE) {
  return Math.hypot(up.x - down.x, up.y - down.y) <= table.tapPixels && up.time - down.time <= table.tapMilliseconds;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SURFACE, hitPlane, findFloor, rotateByQuaternion, surfaceFromPose, isFloor, isTap };
} else {
  Object.assign(window, { SURFACE, hitPlane, findFloor, rotateByQuaternion, surfaceFromPose, isFloor, isTap });
}
