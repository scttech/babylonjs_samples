// The isometric camera: the game is seen from a fixed corner, looking down, with no
// perspective, so things don't get smaller with distance (like the classic arcade games).
// The numbers for where it looks from, how much it shows, and how it follows the marble are
// plain values here, and so is where the sun goes to keep a shadow under the marble. See ../tests/camera.tests.js.

// "Isometric" means the three axes are seen at equal angles: turned 45 degrees about the
// vertical, and tipped down by about 35 degrees. Babylon.js measures the tip from straight
// up, so it is 90 degrees less that.
const ISO_ALPHA = -Math.PI / 4; // which corner the camera looks from
const ISO_BETA = Math.acos(1 / Math.sqrt(3)); // 54.7 degrees from straight up
const CAMERA_RADIUS = 60; // how far back from what it looks at. With no perspective this changes nothing but what is cut off
const VIEW_WIDTH = 24; // the least width the view always shows, in world units
const VIEW_HEIGHT = 16; // and the least height
const FOLLOW_RATE = 4; // how quickly the camera catches up with the marble: bigger is tighter

// How big the view is, for a screen of this shape (`aspect` is width divided by height): half
// its height and half its width, in world units. It shows at least VIEW_WIDTH across and
// VIEW_HEIGHT up, so a wide screen is limited by its height and a tall one, a phone held upright,
// by its width, and neither cuts the course off.
function viewHalfExtents(aspect, width = VIEW_WIDTH, height = VIEW_HEIGHT) {
  const halfHeight = Math.max(height / 2, width / 2 / aspect);
  return { halfWidth: halfHeight * aspect, halfHeight };
}

// Moves `current` toward `target` by a fraction of the way that depends on how much time has
// passed, so the camera eases in and takes the same time to catch up at any frame rate.
// (Moving a fixed fraction each frame would make it faster on a fast screen.)
function follow(current, target, rate, dt) {
  const k = 1 - Math.exp(-rate * dt);
  return {
    x: current.x + (target.x - current.x) * k,
    y: current.y + (target.y - current.y) * k,
    z: current.z + (target.z - current.z) * k,
  };
}

// A shadow is drawn from where the sun is, into a square picture of the world that is only so
// many units wide (SHADOW_AREA): spread over the whole course it would be a few blurry pixels. So
// the sun is kept near whatever the shadow is for, and moved with it. It only matters which way
// the sun points and how far back it is (SUN_DISTANCE), so this finds the spot that distance
// back along the direction the sun shines from `target`.
const SHADOW_AREA = 30; // how wide, in world units, the area that gets shadows is
const SUN_DISTANCE = 40; // how far from the marble the sun is kept

function sunPosition(target, direction, distance) {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  return {
    x: target.x - (direction.x / length) * distance,
    y: target.y - (direction.y / length) * distance,
    z: target.z - (direction.z / length) * distance,
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ISO_ALPHA, ISO_BETA, CAMERA_RADIUS, VIEW_WIDTH, VIEW_HEIGHT, FOLLOW_RATE, SHADOW_AREA, SUN_DISTANCE, viewHalfExtents, follow, sunPosition };
} else {
  Object.assign(window, { ISO_ALPHA, ISO_BETA, CAMERA_RADIUS, VIEW_WIDTH, VIEW_HEIGHT, FOLLOW_RATE, SHADOW_AREA, SUN_DISTANCE, viewHalfExtents, follow, sunPosition });
}
