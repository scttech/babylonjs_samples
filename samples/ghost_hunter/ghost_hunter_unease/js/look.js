// Looking around. The camera of the game points where the phone points, and that is worked out here as plain arithmetic, with no
// Babylon.js in it, so that the tests can check it. The answer to "where is it looking?" is always two directions: the way the camera
// faces (forward) and the way the top of the screen points (up), as [x, y, z] in the world of the game: x is to the right, y is up
// and z is straight ahead. See ../tests/look.tests.js.

const LOOK = {
  fovDegrees: 60, // how much the camera sees from the top of the screen to the bottom: a phone's camera sees about this much
  eyeHeight: 1.4, // metres: the height of a phone held up to look
  dragRadiansPerPixel: 0.005, // how far a drag turns the view when there are no motion sensors
  maxPitchDegrees: 85, // how far up or down a drag can look (straight up would have no "up")
  dragDirection: -1, // -1 drags the world, as a map is dragged: the view turns the opposite way to the finger
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

// Turns a direction about the vertical axis, by an angle in radians. A positive angle turns it to the right (from z towards x).
function turnAboutUp(vector, radians) {
  const [x, y, z] = vector;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

// Which way is a direction facing, as a bearing from 0 to 360 degrees? Straight ahead (z) is 0 and the right (x) is 90.
function bearingOf(vector) {
  const degrees = toDegrees(Math.atan2(vector[0], vector[2]));
  return (degrees + 360) % 360;
}

// How far is a direction above (positive) or below (negative) the horizon, in degrees?
function pitchOf(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return toDegrees(Math.asin(Math.max(-1, Math.min(1, vector[1] / length))));
}

// Where a phone is looking, from what its motion sensors say. The three angles (in degrees) are the standard ones of a browser's
// deviceorientation event: alpha is the turn about the vertical, beta is the tip forward and back, gamma is the tilt side to side.
// A phone held upright has a beta of 90 and its camera looks along the ground. A phone lying face up has a beta of 0 and its camera
// looks at the floor. `screenAngle` is how far the screen has been turned from upright (0, 90, 180 or 270).
// The sensors measure from the north, with x to the east, y to the north and z up; the game has x to the east, y up and z to the
// north, which is the same directions with the names changed.
function lookFromAngles(alpha, beta, gamma, screenAngle = 0) {
  const a = toRadians(alpha);
  const b = toRadians(beta);
  const g = toRadians(gamma);
  const s = toRadians(screenAngle);
  // The phone's own directions: its camera looks out of the back (-z), and the top of the screen is its up turned by the screen.
  const turn = ([x, y, z]) => {
    const [x1, y1, z1] = [x * Math.cos(g) + z * Math.sin(g), y, -x * Math.sin(g) + z * Math.cos(g)]; // gamma, about the phone's y
    const [x2, y2, z2] = [x1, y1 * Math.cos(b) - z1 * Math.sin(b), y1 * Math.sin(b) + z1 * Math.cos(b)]; // beta, about x
    return [x2 * Math.cos(a) - y2 * Math.sin(a), x2 * Math.sin(a) + y2 * Math.cos(a), z2]; // alpha, about the vertical
  };
  const [fx, fy, fz] = turn([0, 0, -1]);
  const [ux, uy, uz] = turn([Math.sin(s), Math.cos(s), 0]);
  return { forward: [fx, fz, fy], up: [ux, uz, uy] }; // (east, north, up) -> (x, y, z) of the game
}

// The three directions of a camera that faces `forward` with its top towards `up`: right, up and forward, at right angles and one long
// (Babylon.js is left handed: the right is up crossed with forward). `up` need only be roughly up: it is made square with forward.
function lookAxes(forward, up) {
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (v) => { const length = Math.hypot(...v) || 1; return v.map((n) => n / length); };
  const front = unit(forward);
  const right = unit(cross(up, front));
  return { right, up: cross(front, right), forward: front };
}

// Where a drag is looking, from a bearing (yaw) and a tilt (pitch), both in radians.
function lookFromDrag(yaw, pitch) {
  return {
    forward: [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)],
    up: [-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch)],
  };
}

// Looking around by dragging, for a desktop and for a phone with no sensors.
class DragLook {
  constructor(table = LOOK) {
    this.table = table;
    this.yaw = 0;
    this.pitch = 0;
  }

  // A drag of (dx, dy) pixels. Dragging down looks up, as dragging the world down would.
  drag(dx, dy) {
    const { dragRadiansPerPixel, dragDirection, maxPitchDegrees } = this.table;
    const limit = toRadians(maxPitchDegrees);
    this.yaw += dx * dragRadiansPerPixel * dragDirection;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch - dy * dragRadiansPerPixel * dragDirection));
  }

  recentre() {
    this.yaw = 0;
  }

  look() {
    return lookFromDrag(this.yaw, this.pitch);
  }
}

// Looking around with the motion sensors: it keeps the last reading, and says where it points. The first thing it faces is
// straight ahead, because the sensors know the north and the game does not care about it: `recentre` makes the way the phone
// points now the way that is straight ahead.
class GyroLook {
  constructor(screenAngle = () => 0) {
    this.screenAngle = screenAngle; // asked each time: a phone can be turned on its side while it is played
    this.reading = null; // the last { alpha, beta, gamma }
    this.offset = 0; // the turn that makes the first heading the front
    this.readings = 0;
  }

  // A reading from the sensors. Some browsers send readings that are empty (a desktop does), and those are not readings.
  feed({ alpha, beta, gamma }) {
    if (alpha === null || beta === null || gamma === null || alpha === undefined || beta === undefined || gamma === undefined) return false;
    this.reading = { alpha, beta, gamma };
    this.readings += 1;
    return true;
  }

  get ready() {
    return this.reading !== null;
  }

  // The view as the sensors have it, before the front is chosen.
  _raw() {
    const { alpha, beta, gamma } = this.reading || { alpha: 0, beta: 90, gamma: 0 };
    return lookFromAngles(alpha, beta, gamma, this.screenAngle());
  }

  // Makes where the phone points now the front. (If it points at the floor or the ceiling it has no heading, and nothing changes.)
  recentre() {
    const { forward } = this._raw();
    if (Math.hypot(forward[0], forward[2]) < 0.2) return;
    this.offset = Math.atan2(forward[0], forward[2]);
  }

  look() {
    const raw = this._raw();
    return { forward: turnAboutUp(raw.forward, -this.offset), up: turnAboutUp(raw.up, -this.offset) };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LOOK, toRadians, toDegrees, turnAboutUp, bearingOf, pitchOf, lookFromAngles, lookAxes, lookFromDrag, DragLook, GyroLook };
} else {
  Object.assign(window, { LOOK, toRadians, toDegrees, turnAboutUp, bearingOf, pitchOf, lookFromAngles, lookAxes, lookFromDrag, DragLook, GyroLook });
}
