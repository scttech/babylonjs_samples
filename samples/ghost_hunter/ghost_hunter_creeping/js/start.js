// The start screen. A phone only lets a page use its camera and its motion sensors after the person has touched the screen, so the
// game begins with a button, and the button is also the place to say what the game is: this one is meant to frighten, and it is played
// while walking about a real room, which is a reason to be careful. The StartScreen is built from the page's own elements, and given
// the `document` to look in, so the tests can give it a stand-in. See ../tests/start.tests.js.

const WARNING = "Warning: this game is made to frighten. It has sudden scares, flashing lights and loud sounds. Play it sitting down or standing still, in a room you know, and never while walking about or on stairs.";

// The line on the page that says what the phone is looking at (the sensors' readings, as words): "BEARING 045   TILT +12".
function bearingText(bearing, pitch) {
  const sign = pitch < -0.5 ? "-" : pitch > 0.5 ? "+" : " ";
  return `BEARING ${String(Math.round(bearing) % 360).padStart(3, "0")}   TILT ${sign}${String(Math.abs(Math.round(pitch))).padStart(2, "0")}`;
}

class StartScreen {
  constructor(doc = document) {
    const get = (id) => doc.getElementById(id);
    this.root = get("start");
    this.status = get("start-status");
    this.warning = get("start-warning");
    this.button = get("start-button");
    this.alternative = get("start-alternative"); // a second way in, for when there are two (real AR, or the camera view)
    this.warning.textContent = "";
    const strong = doc.createElement("strong");
    strong.textContent = "WARNING ";
    this.warning.appendChild(strong);
    this.warning.appendChild(doc.createTextNode(WARNING.replace("Warning: ", "")));
  }

  setStatus(text) {
    this.status.textContent = text;
  }

  // The button waits while the phone is asked for its camera, and cannot be pressed twice.
  setBusy(busy) {
    this.button.disabled = busy;
    this.alternative.disabled = busy;
  }

  // Calls `callback` when the button is pressed. The call is made straight from the press, which is what a phone wants.
  onEnter(callback) {
    this.button.addEventListener("click", callback);
  }

  // Shows the second button, with its words.
  offerAlternative(text) {
    this.alternative.textContent = text;
    this.alternative.classList.remove("hidden");
  }

  onAlternative(callback) {
    this.alternative.addEventListener("click", callback);
  }

  hide() {
    this.root.classList.add("hidden");
  }

  // Shows it again (when augmented reality has ended).
  show() {
    this.root.classList.remove("hidden");
  }

  get hidden() {
    return this.root.classList.contains("hidden");
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WARNING, bearingText, StartScreen };
} else {
  Object.assign(window, { WARNING, bearingText, StartScreen });
}
