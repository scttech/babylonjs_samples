// The colors the player can choose for the runner. The mannequin is made from two
// materials, a main one for the body and one for the joints, and a color is a pair of
// hex colors, one for each. Choosing a color only changes those two materials, so it
// costs nothing at run time. See ../tests/colors.tests.js.
const RUNNER_COLORS = [
  { id: "sunset", name: "Sunset", body: "#cc670b", joints: "#6722b5" }, // as the model comes
  { id: "ocean", name: "Ocean", body: "#1e7fd6", joints: "#f2c230" },
  { id: "neon", name: "Neon", body: "#2fd16a", joints: "#1f2a44" },
  { id: "crimson", name: "Crimson", body: "#d6342c", joints: "#26263a" },
  { id: "ghost", name: "Ghost", body: "#e8ecf2", joints: "#4b5563" },
];
const DEFAULT_COLOR = RUNNER_COLORS[0].id;

// The names of the model's two materials.
const BODY_MATERIAL = "M_Main";
const JOINTS_MATERIAL = "M_Joints";

// The color with this id. An id that isn't one of them (a saved choice that no longer
// exists, or nothing at all) gives the default, so there is always a color to use.
function colorById(id) {
  return RUNNER_COLORS.find((color) => color.id === id) || RUNNER_COLORS[0];
}

// Paints a character: finds its two materials among the meshes of `root` and sets
// their color. Anything else is left alone.
function tintRunner(root, color) {
  for (const mesh of root.getChildMeshes()) {
    const material = mesh.material;
    if (!material) continue;
    if (material.name === BODY_MATERIAL) material.albedoColor = BABYLON.Color3.FromHexString(color.body);
    else if (material.name === JOINTS_MATERIAL) material.albedoColor = BABYLON.Color3.FromHexString(color.joints);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNER_COLORS, DEFAULT_COLOR, BODY_MATERIAL, JOINTS_MATERIAL, colorById, tintRunner };
} else {
  Object.assign(window, { RUNNER_COLORS, DEFAULT_COLOR, BODY_MATERIAL, JOINTS_MATERIAL, colorById, tintRunner });
}
