// What the player sees and touches of the tools: two buttons (LIGHT, which is switched on and off, and BEAM, which is held), a meter under
// each (the light's battery, the beam's heat), a bar of how much of a hold the beam has on what it is on, a glow over the picture when the
// light is on, and the beam itself in the scene. The buttons and the bars are built from the page's own elements, given the `document` (so
// the tests can give them stand-ins), and the beam is a stretched, glowing cylinder from the hand to what it is on.
// See ../tests/toolsui.tests.js.

class ToolsUi {
  constructor(doc, { onLight = () => {}, onBeam = () => {} } = {}) {
    const get = (id) => doc.getElementById(id);
    this.light = get("tool-light");
    this.beam = get("tool-beam");
    this.lightMeter = get("meter-light");
    this.beamMeter = get("meter-beam");
    this.grip = get("grip");
    this.torch = get("torch");
    this.onLight = onLight;
    this.onBeam = onBeam;
    this.light.addEventListener("click", () => onLight());
    // The beam is held: it is on from the press to the release, and a touch that leaves the button is a release too.
    const press = (event) => { if (event && event.preventDefault) event.preventDefault(); onBeam(true); };
    const release = () => onBeam(false);
    this.beam.addEventListener("pointerdown", press);
    for (const name of ["pointerup", "pointercancel", "pointerleave"]) this.beam.addEventListener(name, release);
  }

  // Shows what the tools are doing: `frame` is what `Tools.update` gave.
  apply(frame) {
    this._mark(this.light, "on", frame.lightOn);
    this._mark(this.light, "low", frame.charge < TOOLS.light.dimBelow);
    this._mark(this.beam, "on", frame.firing);
    this._mark(this.beam, "hot", frame.overheated);
    this.lightMeter.style.width = `${Math.round(frame.charge * 100)}%`;
    this.beamMeter.style.width = `${Math.round(Math.min(1, frame.heat) * 100)}%`;
    this.grip.style.width = `${Math.round(frame.grip * 100)}%`;
    this.grip.style.opacity = frame.grip > 0 ? "1" : "0";
    this.torch.style.opacity = String((frame.lightOn ? 0.22 * frame.power : 0).toFixed(3));
  }

  _mark(element, name, on) {
    if (on) element.classList.add(name);
    else element.classList.remove(name);
  }
}

// The beam in the scene: a bright thin cylinder from the hand to what it is on (or as far as it reaches), that shakes a little. It is
// only there while the beam is firing.
class BeamBody {
  constructor(scene) {
    this.mesh = BABYLON.MeshBuilder.CreateCylinder("beam", { height: 1, diameter: 1, tessellation: 8 }, scene);
    this.mesh.rotationQuaternion = new BABYLON.Quaternion();
    this.mesh.isPickable = false;
    const material = new BABYLON.StandardMaterial("beam", scene);
    material.disableLighting = true;
    material.emissiveColor = new BABYLON.Color3(0.3, 0.9, 1);
    material.alpha = 0.7;
    this.mesh.material = material;
    this.mesh.setEnabled(false);
    this.up = new BABYLON.Quaternion();
  }

  // `from` and `to` are points; `on` is whether the beam is firing; `time` is the clock, for the shake.
  update(from, to, on, time) {
    this.mesh.setEnabled(on);
    if (!on) return;
    const along = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
    const length = Math.hypot(...along) || 1e-6;
    this.mesh.position.set((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
    const width = 0.03 + Math.sin(time * 60) * 0.008;
    this.mesh.scaling.set(width, length, width);
    BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.Up(), new BABYLON.Vector3(along[0] / length, along[1] / length, along[2] / length), this.up);
    this.mesh.rotationQuaternion.copyFrom(this.up);
  }

  dispose() {
    this.mesh.material.dispose();
    this.mesh.dispose();
  }
}

// Where the hand is, from the player: a little to the right, below the eye and in front. `player` is { position, forward, up }.
function handPosition(player) {
  const f = player.forward, u = player.up;
  const right = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]]; // left handed: up crossed with forward
  const length = Math.hypot(...right) || 1;
  return [0, 1, 2].map((i) => player.position[i] + (right[i] / length) * 0.16 - u[i] * 0.22 + f[i] * 0.25);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ToolsUi, BeamBody, handPosition };
} else {
  Object.assign(window, { ToolsUi, BeamBody, handPosition });
}
