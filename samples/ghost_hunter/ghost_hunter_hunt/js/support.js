// What this phone (or this desktop) can do, worked out from a plain description of it so that the tests can describe any device: the
// camera, the motion sensors, and whether the page is allowed to use them. A page may only use the camera and the sensors if it is
// served over HTTPS (or from localhost), and iPhones ask the person before they hand over the motion sensors.
// See ../tests/support.tests.js.

// The description of the device that the game is running on. `win` and `nav` are the page's window and navigator.
function describeDevice(win = window, nav = navigator) {
  const orientation = win.DeviceOrientationEvent;
  return {
    secure: Boolean(win.isSecureContext),
    camera: Boolean(nav.mediaDevices && nav.mediaDevices.getUserMedia),
    motion: Boolean(orientation),
    needsMotionPermission: Boolean(orientation && typeof orientation.requestPermission === "function"),
    touch: (nav.maxTouchPoints || 0) > 0,
  };
}

// What the game can use: the camera and the motion sensors only on a secure page, and only if the device has them.
function detectSupport(device) {
  return {
    secure: device.secure,
    camera: device.secure && device.camera,
    motion: device.secure && device.motion,
    needsPermission: device.secure && device.needsMotionPermission,
    touch: device.touch,
  };
}

// How the player looks around: with the motion sensors if they really send readings, and otherwise by dragging. (A desktop browser
// has the sensors in the code and sends nothing, so having them is not enough: the game waits to be sent a reading.)
function chooseLookSource(support, gotReading) {
  return support.motion && gotReading ? "gyro" : "drag";
}

// The words on the start screen about what this device can do.
function startStatus(support) {
  if (!support.secure) {
    return "This page is not on HTTPS, so the phone will not allow the camera or the motion sensors. You can still look around by dragging.";
  }
  if (!support.camera && !support.motion) return "No camera and no motion sensor here: drag to look around the dark room.";
  if (!support.camera) return "No camera here: you will look around a dark room instead. Turn your phone to look.";
  if (!support.motion) return "No motion sensor here: drag the screen to look around.";
  if (support.needsPermission) return "Your phone will ask to use its camera and its motion sensors. Allow both.";
  return "Your camera will show the room, and the dead will show up in it. Turn your phone to look around.";
}

// Asks for the motion sensors where the device wants to be asked (an iPhone), and gives "granted" or "denied". It must be called
// straight from a tap, or the phone says no. A device that does not ask has the sensors already: "granted". `api` is the
// DeviceOrientationEvent of the page.
async function askForMotion(api) {
  if (!api || typeof api.requestPermission !== "function") return "granted";
  try {
    return (await api.requestPermission()) === "granted" ? "granted" : "denied";
  } catch (error) {
    return "denied";
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { describeDevice, detectSupport, chooseLookSource, startStatus, askForMotion };
} else {
  Object.assign(window, { describeDevice, detectSupport, chooseLookSource, startStatus, askForMotion });
}
