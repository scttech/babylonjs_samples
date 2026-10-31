// The third-person camera: it sits behind the runner and a little above, looks at them, and swings round when the mouse moves. How it
// swings (lookAngles) and where it ends up (orbitPosition) are plain functions, so they can be tested. PointerLook is the browser's
// pointer lock, which hides the mouse and gives the page how far it moved however far that is; and OrbitCamera puts a Babylon.js
// camera where the maths says. See ../tests/camera.tests.js.

const LOOK = {
  sensitivity: 0.0025, // radians of turn for each pixel the mouse moves
  minPitch: -0.35, // how far the camera may go below the runner's head, looking up (negative is below)
  maxPitch: 1.3, // and how far above it, looking down: a little short of straight down
  distance: 5.5, // how far behind the runner
  height: 1.6, // how high above the ground the point it looks at is (about the runner's shoulders)
  fov: 0.9, // the width of the view, in radians
  floor: 0.3, // the lowest the camera may go, above the runner's feet: it stays above the ground, and comes in toward the runner instead of going under it
};

// A whole turn, and half of one.
const TAU = Math.PI * 2;

// An angle brought back into the range -PI to PI, so a yaw that has gone round and round doesn't grow without end.
function wrapAngle(angle) {
  const turned = (((angle + Math.PI) % TAU) + TAU) % TAU;
  return turned - Math.PI;
}

// Turns the way the camera looks by the distance the mouse moved. `yaw` is the direction it looks along the ground (0 is north, +z,
// and it grows toward the east) and `pitch` how far it is tipped down. A mouse moved right turns the camera right, and a mouse moved
// forward (up the screen, a negative dy) tips the camera down less, as in every game of this kind, unless `invert` is set. The pitch is held
// between the limits.
function lookAngles({ yaw, pitch }, dx, dy, { sensitivity = LOOK.sensitivity, minPitch = LOOK.minPitch, maxPitch = LOOK.maxPitch, invert = false } = {}) {
  const sign = invert ? -1 : 1;
  return {
    yaw: wrapAngle(yaw + dx * sensitivity),
    pitch: Math.min(maxPitch, Math.max(minPitch, pitch + dy * sensitivity * sign)),
  };
}

// Where the camera is: `distance` from `target`, behind the way it looks (`yaw`) and raised by `pitch`.
function orbitPosition(target, yaw, pitch, distance) {
  const flat = Math.cos(pitch) * distance;
  return {
    x: target.x - Math.sin(yaw) * flat,
    y: target.y + Math.sin(pitch) * distance,
    z: target.z - Math.cos(yaw) * flat,
  };
}

// The direction on the ground the camera looks along, as a unit vector { x, z }: what "forward" means to a player.
function lookForward(yaw) {
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

// How much of the way from `from` to `to` is clear of the boxes, from 0 to 1: so a camera that would end up inside a building is
// brought in front of it. Each box ({ minX, maxX, minY, maxY, minZ, maxZ }) is made `margin` bigger on every side, so the camera
// stops a little short of the wall and not right against it. It is the slab method: for each of the three directions, find when the
// line is between the box's two sides, and the line is in the box only when it is between all three at once.
function clearFraction(from, to, boxes, margin = 0.3) {
  let clear = 1;
  for (const box of boxes) {
    let enter = 0;
    let leave = 1;
    for (const axis of ["X", "Y", "Z"]) {
      const lo = box[`min${axis}`] - margin;
      const hi = box[`max${axis}`] + margin;
      const start = from[axis.toLowerCase()];
      const move = to[axis.toLowerCase()] - start;
      if (move === 0) {
        if (start < lo || start > hi) {
          enter = 2; // it never is between this pair of sides, so it never is in the box
          break;
        }
      } else {
        const a = (lo - start) / move;
        const b = (hi - start) / move;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
      }
    }
    if (enter <= leave && enter > 0) clear = Math.min(clear, enter);
    else if (enter <= leave && enter === 0) clear = 0; // it starts inside the box
  }
  return clear;
}

// How much of the way from `from` to `to` is above a floor, from 0 to 1: a camera that would end up under the ground is brought in along the
// line to the runner until it is at the height of the floor (which is how the camera gets closer, and not just lower). `from` is the runner
// and is above the floor; if it isn't, there is no way that is.
function aboveFloorFraction(from, to, floorY) {
  if (to.y >= floorY) return 1;
  if (from.y <= floorY) return 0;
  return (from.y - floorY) / (from.y - to.y);
}

class PointerLook {
  // `canvas` is what is clicked to take hold of the mouse, and `doc` the document that says whether it is held. Both are given, so
  // the tests can give stand-ins. `onChange` is called with true when the mouse is taken, and false when it is let go (the browser
  // lets it go when Esc is pressed, so the page can't be sure it keeps it).
  constructor(canvas, doc = document, onChange = () => {}) {
    this.canvas = canvas;
    this.doc = doc;
    this.onChange = onChange;
    this.dx = 0;
    this.dy = 0;
    doc.addEventListener("pointerlockchange", () => this.onChange(this.locked));
    doc.addEventListener("mousemove", (event) => {
      if (!this.locked) return;
      this.dx += event.movementX || 0;
      this.dy += event.movementY || 0;
    });
    canvas.addEventListener("click", () => this.lock());
  }

  get locked() {
    return this.doc.pointerLockElement === this.canvas;
  }

  // Asks the browser to hide the mouse and keep it. It only agrees in answer to a click, which is why the player clicks.
  lock() {
    if (!this.locked && this.canvas.requestPointerLock) this.canvas.requestPointerLock();
  }

  unlock() {
    if (this.locked && this.doc.exitPointerLock) this.doc.exitPointerLock();
  }

  // How far the mouse has moved since the last time this was asked, and forgets it: { dx, dy }. Called once a frame.
  take() {
    const moved = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return moved;
  }
}

class OrbitCamera {
  // `camera` is a Babylon.js camera that can be put somewhere and pointed at something (a FreeCamera does).
  constructor(camera, { yaw = 0, pitch = 0.35, distance = LOOK.distance, height = LOOK.height, invert = false } = {}) {
    this.camera = camera;
    this.yaw = yaw;
    this.pitch = pitch;
    this.distance = distance;
    this.height = height;
    this.invert = invert;
    this.sensitivity = LOOK.sensitivity;
    this.boxes = []; // the walls the camera must not go through
    this.floor = LOOK.floor; // the lowest it may go above the feet of the runner
    this.closest = 0.15; // the least of its distance it will come in to, however close the wall: the rest of it is in the wall
  }

  // Turns the camera by the mouse's movement.
  look(dx, dy) {
    const turned = lookAngles({ yaw: this.yaw, pitch: this.pitch }, dx, dy, { sensitivity: this.sensitivity, invert: this.invert });
    this.yaw = turned.yaw;
    this.pitch = turned.pitch;
  }

  // Puts the camera behind `target` (a point on the ground, where the runner stands) and points it at the runner. If a wall is in
  // the way, the camera comes in along the line to the runner until it is in front of it.
  follow(target) {
    const aim = { x: target.x, y: target.y + this.height, z: target.z };
    const wanted = orbitPosition(aim, this.yaw, this.pitch, this.distance);
    const above = aboveFloorFraction(aim, wanted, target.y + this.floor);
    const fraction = Math.max(this.closest, Math.min(above, clearFraction(aim, wanted, this.boxes)));
    const at = { x: aim.x + (wanted.x - aim.x) * fraction, y: aim.y + (wanted.y - aim.y) * fraction, z: aim.z + (wanted.z - aim.z) * fraction };
    this.camera.position.set(at.x, at.y, at.z);
    this.camera.setTarget(new BABYLON.Vector3(aim.x, aim.y, aim.z));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LOOK, wrapAngle, lookAngles, orbitPosition, lookForward, clearFraction, aboveFloorFraction, PointerLook, OrbitCamera };
} else {
  Object.assign(window, { LOOK, wrapAngle, lookAngles, orbitPosition, lookForward, clearFraction, aboveFloorFraction, PointerLook, OrbitCamera });
}
