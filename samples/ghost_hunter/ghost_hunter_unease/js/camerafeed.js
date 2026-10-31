// The camera's picture, behind the game. The page asks the phone for its back camera, and shows what it sees in a <video> element that
// sits under the 3D scene. Everything that can go wrong goes wrong in words a person can use, so a refused camera is a message and
// not a blank screen. See ../tests/camerafeed.tests.js.

// What to ask the phone for: the camera on the back ("environment", the other one is "user"), at a size that is sharp enough
// without making a phone work hard, and no microphone (yet).
function cameraConstraints() {
  return {
    audio: false,
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
  };
}

// The words for a camera that would not start. The browser says why with the name of an error.
function explainCameraError(error) {
  switch (error && error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "The camera was not allowed. Allow it in the browser's settings for this page to see the dead in your room.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
    case "AbortError":
      return "The camera is busy with another app. Close it and try again.";
    default:
      return "The camera would not start.";
  }
}

class CameraFeed {
  // `video` is the <video> element to show the picture in, and `mediaDevices` is where cameras come from (navigator.mediaDevices).
  constructor(video, mediaDevices = navigator.mediaDevices) {
    this.video = video;
    this.mediaDevices = mediaDevices;
    this.stream = null;
  }

  get live() {
    return this.stream !== null;
  }

  // Starts the camera. Gives { ok: true } when the picture is showing, and { ok: false, message } when it is not.
  async start() {
    if (!this.mediaDevices || !this.mediaDevices.getUserMedia) return { ok: false, message: explainCameraError({ name: "NotFoundError" }) };
    try {
      this.stream = await this.mediaDevices.getUserMedia(cameraConstraints());
    } catch (error) {
      this.stream = null;
      return { ok: false, message: explainCameraError(error) };
    }
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.setAttribute("playsinline", ""); // or an iPhone takes the picture full screen, out of the page
    try {
      await this.video.play();
    } catch (error) {
      // A picture that will not play is still a picture: the next tap will start it.
    }
    this.video.classList.add("live");
    return { ok: true };
  }

  // Turns the camera off, so the light on the phone goes out.
  stop() {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) track.stop();
    this.stream = null;
    this.video.srcObject = null;
    this.video.classList.remove("live");
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { cameraConstraints, explainCameraError, CameraFeed };
} else {
  Object.assign(window, { cameraConstraints, explainCameraError, CameraFeed });
}
