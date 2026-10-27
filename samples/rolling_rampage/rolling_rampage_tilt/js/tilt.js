// Tilt: steering by tipping the phone like a tray, so the marble rolls toward the edge that
// goes down. The first half is the rules, all plain numbers (how a tilt turns into a stick,
// and how a stick is eased), with no page and no sensor. The second half, TiltInput, is the part
// that talks to the sensor and keeps a stick up to date for the game to read.
// See ../tests/tilt.tests.js.
//
// The sensor says how the phone is tipped in two angles, in degrees:
//   beta   forward and back: 0 lying flat, and growing as the top edge is raised
//   gamma  left and right: 0 lying flat, and growing as the right edge goes down
// Both are in the phone's own frame, which turns with the phone. The stick, like the others,
// is in the screen's frame. When the phone is on its side the two don't match, so the tilt has
// to be turned by the angle the screen is turned.

// The tilt, in degrees from level, that is a full stick. Beyond it a stick doesn't get stronger,
// so the wrist never has to bend further than this.
const TILT_MAX_ANGLE = 20;
// A tilt smaller than this (in degrees) is ignored: nobody holds a phone perfectly still, and a
// marble that creeps while the player thinks they are level is maddening.
const TILT_DEAD_ZONE = 2.5;
// How quickly the stick catches up with the tilt, in "parts of the way there a second". The sensor
// is a little jittery, and easing the stick takes the jitter out. Bigger is quicker and twitchier.
const TILT_SMOOTHING = 12;
// What to tell the player in each state. A phone has no console to look in, so every way tilt
// can fail is a sentence on the screen.
const TILT_MESSAGES = {
  off: "Tilt is off",
  asking: "Allow motion access when asked",
  waiting: "Waiting for the tilt sensor",
  ready: "Tilt is on. Hold the phone how you like, then Set level",
  denied: "Motion access was refused. Reload the page to be asked again",
  unsupported: "This device has no tilt sensor",
  insecure: "Tilt needs the page to be served over https",
};


// An angle between two readings, kept between -180 and 180: from 179 to -179 is a 2 degree turn,
// not a 358 degree one.
function wrapDegrees(degrees) {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

// A tilt in the phone's frame, { x, y } in degrees (x: right edge down, y: top edge down), turned into
// the screen's frame. `angle` is how far the screen is turned from the phone's usual way up, in
// degrees (screen.orientation.angle: 0 upright, 90 or 270 on its side, 180 upside down).
function screenTilt(tilt, angle) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: tilt.x * cos - tilt.y * sin, y: tilt.x * sin + tilt.y * cos };
}

// A tilt on the screen, in degrees, as a stick. A tilt inside the dead zone is nothing at all; past it the
// stick grows until `max`, and from there is as long as it gets. Like the touch stick, it is rescaled
// to start from the edge of the dead zone, so there is no jump.
function tiltToStick(tilt, { max = TILT_MAX_ANGLE, deadZone = TILT_DEAD_ZONE } = {}) {
  const length = Math.hypot(tilt.x, tilt.y);
  if (length <= deadZone) return { x: 0, y: 0 };
  const strength = Math.min(1, (length - deadZone) / (max - deadZone));
  return { x: (tilt.x / length) * strength, y: (tilt.y / length) * strength };
}

// Moves a stick part of the way to where it is headed. The part depends on how long the frame
// was, not on the frame, so it eases the same on a phone at 30 frames a second as on a
// monitor at 144. (The same easing as the camera's.)
function smoothStick(current, target, rate, dt) {
  const k = 1 - Math.exp(-rate * dt);
  return { x: current.x + (target.x - current.x) * k, y: current.y + (target.y - current.y) * k };
}

// Listens to the phone's tilt and keeps `stick` up to date. Everything it needs from the outside is
// given to it, so a test can give it a fake sensor:
//   target            what hears "deviceorientation" events (the window)
//   orientationAngle  a function: how far the screen is turned right now
//   OrientationEvent  the browser's DeviceOrientationEvent: on an iPhone it has requestPermission
//   secure            whether the page is served securely (https, or localhost)
//
// It is always in one of these states, each with a message in TILT_MESSAGES:
//   off          not asked for
//   asking       waiting for the player to answer the browser's permission question
//   waiting      listening, but nothing has been heard yet
//   ready        listening, and tilting steers
//   denied       the player said no
//   unsupported  the device has no sensor (a laptop's browser sends one empty reading)
//   insecure     the browser won't give the page the sensor
class TiltInput {
  constructor({
    target = window,
    orientationAngle = () => (screen.orientation ? screen.orientation.angle : 0),
    OrientationEvent = window.DeviceOrientationEvent,
    secure = window.isSecureContext,
  } = {}) {
    this.target = target;
    this.orientationAngle = orientationAngle;
    this.OrientationEvent = OrientationEvent;
    this.secure = secure;

    this.state = "off";
    this.reading = null; // the latest { beta, gamma }
    this.neutral = null; // the reading that counts as level, in the phone's frame
    this.stick = { x: 0, y: 0 }; // what the game reads: the tilt, as a stick, eased

    this.listener = (event) => this.hear(event);
  }

  // True while tilt is switched on, whether or not it has heard anything yet.
  get active() {
    return this.state === "asking" || this.state === "waiting" || this.state === "ready";
  }

  // Switch tilt on. This must be called from a tap: an iPhone only shows its permission question
  // to a page that asks because of one. Resolves to the state it ended up in.
  async enable() {
    if (this.active) return this.state;
    if (!this.secure) return (this.state = "insecure");
    if (!this.OrientationEvent) return (this.state = "unsupported");

    // Only an iPhone (and iPad) has requestPermission. Everything else just starts sending events.
    if (typeof this.OrientationEvent.requestPermission === "function") {
      this.state = "asking";
      let answer;
      try {
        answer = await this.OrientationEvent.requestPermission();
      } catch (error) {
        answer = "denied"; // it throws if it wasn't asked from a tap
      }
      if (this.state !== "asking") return this.state; // switched off while the question was up
      if (answer !== "granted") return (this.state = "denied");
    }

    this.state = "waiting";
    this.target.addEventListener("deviceorientation", this.listener);
    return this.state;
  }

  // Switch tilt off, and forget everything it knew.
  disable() {
    this.target.removeEventListener("deviceorientation", this.listener);
    this.state = "off";
    this.reading = null;
    this.neutral = null;
    this.stick = { x: 0, y: 0 };
  }

  // A reading from the sensor.
  hear(event) {
    // A computer's browser has the event but no sensor, and sends one reading with nothing in it.
    if (event.beta == null || event.gamma == null) {
      if (this.state === "waiting") {
        this.target.removeEventListener("deviceorientation", this.listener);
        this.state = "unsupported";
      }
      return;
    }
    this.reading = { beta: event.beta, gamma: event.gamma };
    if (!this.neutral) this.neutral = { ...this.reading }; // the way it was first held is level, until told otherwise
    this.state = "ready";
  }

  // Say that the phone is level the way it is held now. If nothing has been heard yet, the first reading will be.
  calibrate() {
    this.neutral = this.reading ? { ...this.reading } : null;
  }

  // How far the phone is tipped from level, in degrees, as seen on the screen.
  get tilt() {
    if (!this.reading || !this.neutral) return { x: 0, y: 0 };
    const inPhone = {
      x: wrapDegrees(this.reading.gamma - this.neutral.gamma), // right edge down
      y: -wrapDegrees(this.reading.beta - this.neutral.beta), // beta grows as the top goes up, so the top going down is minus
    };
    return screenTilt(inPhone, this.orientationAngle());
  }

  // The stick the tilt is asking for now, before easing.
  get aim() {
    return this.state === "ready" ? tiltToStick(this.tilt) : { x: 0, y: 0 };
  }

  // Ease `stick` toward `aim`. Called once a frame.
  update(dt) {
    this.stick = smoothStick(this.stick, this.aim, TILT_SMOOTHING, dt);
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TILT_MAX_ANGLE, TILT_DEAD_ZONE, TILT_SMOOTHING, TILT_MESSAGES, wrapDegrees, screenTilt, tiltToStick, smoothStick, TiltInput };
} else {
  Object.assign(window, { TILT_MAX_ANGLE, TILT_DEAD_ZONE, TILT_SMOOTHING, TILT_MESSAGES, wrapDegrees, screenTilt, tiltToStick, smoothStick, TiltInput });
}
