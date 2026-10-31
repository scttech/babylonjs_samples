// WebXR: real augmented reality, where the browser has it (Chrome on an Android phone, today). The phone then finds the floor and the
// walls itself, keeps track of where it is in the room, and draws the camera's picture for the page. The game uses it if it can, and
// falls back to the camera's picture and the motion sensors of Step 1 if it can't, and every other part of the game is written to
// work with either. The decisions here are plain code; ArSession is the part that talks to Babylon.js and the browser, and it takes
// both as arguments so that the tests can give it stand-ins. See ../tests/xr.tests.js.

const XR = {
  mode: "immersive-ar", // the kind of session: the camera's picture, with the game over it
  space: "local-floor", // measured from the floor under where the session began
  required: ["hit-test"], // without this there is no finding the floor
  optional: ["anchors", "dom-overlay"], // anchors keep things in place; the overlay keeps the page's words on the screen
};

// Can this browser and this device do augmented reality? Asks, and says no to anything that goes wrong.
async function xrAvailable(nav = navigator) {
  if (!nav || !nav.xr || typeof nav.xr.isSessionSupported !== "function") return false;
  try {
    return Boolean(await nav.xr.isSessionSupported(XR.mode));
  } catch (error) {
    return false;
  }
}

// Which experience to use: "xr" when the browser can and the address does not say ?xr=off, and otherwise "camera".
function chooseExperience(available, search) {
  const asked = new URLSearchParams(search || "").get("xr");
  return available && asked !== "off" ? "xr" : "camera";
}

// The words for the start screen about augmented reality.
function xrStatus(available, search) {
  if (!available) return "";
  return chooseExperience(available, search) === "xr"
    ? "Your phone can do real augmented reality: it will find the floor of your room."
    : "Real augmented reality is switched off by the address: the camera view will be used.";
}

// What to ask the browser for when starting a session. The overlay is the page itself, so that its words stay on the screen.
function sessionInit(overlayRoot) {
  const init = { requiredFeatures: XR.required.slice(), optionalFeatures: XR.optional.slice() };
  if (overlayRoot) init.domOverlay = { root: overlayRoot };
  return init;
}

// A hit of the phone's, from the matrix Babylon.js gives it, as a surface.
function surfaceFromHit(hit) {
  const matrix = hit.transformationMatrix;
  const position = new BABYLON.Vector3();
  const rotation = new BABYLON.Quaternion();
  matrix.decompose(new BABYLON.Vector3(), rotation, position);
  return surfaceFromPose([position.x, position.y, position.z], rotation);
}

// A session of augmented reality. `scene` is the Babylon.js scene; `api` is Babylon.js itself (for the names of its features).
class ArSession {
  constructor(scene, api = BABYLON) {
    this.scene = scene;
    this.api = api;
    this.experience = null;
    this.hitTest = null;
    this.anchors = null;
    this.latest = null; // the newest hit, as the phone gave it
    this.inside = false;
    this.selectCallbacks = [];
    this.enterCallbacks = [];
    this.exitCallbacks = [];
  }

  // Makes the experience and turns on the features (finding surfaces, and anchors if the phone has them). Nothing is shown until `enter`.
  async create() {
    this.experience = await this.scene.createDefaultXRExperienceAsync({
      disableDefaultUI: true,
      disablePointerSelection: true,
      disableTeleportation: true,
      optionalFeatures: true,
    });
    const features = this.experience.baseExperience.featuresManager;
    const names = this.api.WebXRFeatureName || {};
    this.hitTest = features.enableFeature(names.HIT_TEST || "xr-hit-test", "latest");
    this.hitTest.onHitTestResultObservable.add((results) => {
      this.latest = results.length ? results[0] : null;
    });
    try {
      this.anchors = features.enableFeature(names.ANCHOR_SYSTEM || "xr-anchor-system", "latest", { doNotRemoveAnchorsOnSessionEnd: true });
    } catch (error) {
      this.anchors = null; // a phone without anchors still plays
    }
    this.experience.baseExperience.onStateChangedObservable.add((state) => {
      const states = this.api.WebXRState || { IN_XR: 2, NOT_IN_XR: 3 };
      if (state === states.IN_XR) {
        this.inside = true;
        const session = this.experience.baseExperience.sessionManager.session;
        session.addEventListener("select", () => this.selectCallbacks.forEach((callback) => callback()));
        this.enterCallbacks.forEach((callback) => callback());
      } else if (state === states.NOT_IN_XR) {
        this.inside = false;
        this.latest = null;
        this.exitCallbacks.forEach((callback) => callback());
      }
    });
  }

  // Starts the session: the phone shows its camera and the game is drawn over it.
  async enter(overlayRoot) {
    const base = this.experience.baseExperience;
    await base.enterXRAsync(XR.mode, XR.space, this.experience.renderTarget, sessionInit(overlayRoot));
  }

  onSelect(callback) { this.selectCallbacks.push(callback); }
  onEnter(callback) { this.enterCallbacks.push(callback); }
  onExit(callback) { this.exitCallbacks.push(callback); }

  // The surface the phone is looking at, as it has found it now, or null.
  surface() {
    return this.latest ? surfaceFromHit(this.latest) : null;
  }

  // Asks the phone to anchor the newest hit, so that the thing put there stays where it was put. Gives the node that follows the
  // anchor, or null if the phone has no anchors or says no.
  async anchorHere() {
    if (!this.anchors || !this.latest) return null;
    try {
      const anchor = await this.anchors.addAnchorPointUsingHitTestResultAsync(this.latest);
      return anchor && anchor.attachedNode ? anchor.attachedNode : null;
    } catch (error) {
      return null;
    }
  }

  exit() {
    if (this.inside) return this.experience.baseExperience.exitXRAsync();
    return Promise.resolve();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { XR, xrAvailable, chooseExperience, xrStatus, sessionInit, surfaceFromHit, ArSession };
} else {
  Object.assign(window, { XR, xrAvailable, chooseExperience, xrStatus, sessionInit, surfaceFromHit, ArSession });
}
