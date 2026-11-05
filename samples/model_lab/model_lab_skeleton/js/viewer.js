// The stage the model stands on: a camera that orbits it, some light, a floor grid to judge its size by, and the view options (axes, wireframe,
// the box around it, a turntable) that let a person look at a model in different ways. See ../tests/viewer.tests.js.

// The lines of a floor grid as a list of lines, each a list of two [x, y, z] points. `half` is how far the grid reaches from the middle on each side
// and `step` is the gap between lines. The two lines through the middle are the axes' places, so they are the ones that are drawn in a
// different colour, which is why they come back separately.
function gridLines(half, step) {
  const lines = [];
  const count = Math.round(half / step);
  for (let i = -count; i <= count; i++) {
    const at = i * step;
    lines.push({ axis: i === 0, points: [[at, 0, -half], [at, 0, half]] });
    lines.push({ axis: i === 0, points: [[-half, 0, at], [half, 0, at]] });
  }
  return lines;
}

// How big a grid to draw for a model that is `size` across: a few times the model, rounded up to a whole number of metres, with
// a gap that keeps the lines to about ten on each side, so that they are a scale that a person can count.
function gridFor(size) {
  const half = Math.max(1, Math.ceil(size * 1.5));
  return { half, step: half <= 5 ? 0.5 : Math.ceil(half / 10) };
}

// The things a person can switch on and off. One table: the panel makes a switch for each, and the viewer reads each. `on` is how it begins.
const VIEW_OPTIONS = [
  { id: "grid", label: "Floor grid", on: true },
  { id: "axes", label: "Axes (red x, green y, blue z)", on: false },
  { id: "wireframe", label: "Wireframe (show the triangles)", on: false },
  { id: "bounds", label: "Box around the model", on: false },
  { id: "spin", label: "Turntable (spin slowly)", on: false },
];

// The viewer. It makes the camera, the lights and the floor, and gives back what the page needs to steer them.
function createViewer(scene, canvas) {
  const camera = new BABYLON.ArcRotateCamera("camera", Math.PI / 2.4, Math.PI / 2.5, 5, BABYLON.Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.wheelPrecision = 30;
  camera.panningSensibility = 400;
  camera.lowerRadiusLimit = 0.05;

  const sky = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  sky.intensity = 0.8;
  sky.groundColor = new BABYLON.Color3(0.25, 0.25, 0.3);
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.5, -1, -0.6), scene);
  sun.intensity = 0.9;
  scene.clearColor = new BABYLON.Color4(0.09, 0.1, 0.13, 1);

  const state = Object.fromEntries(VIEW_OPTIONS.map((option) => [option.id, option.on]));
  let grid = null;
  let axes = null;
  let box = null;
  let current = null;

  const drawGrid = (size) => {
    if (grid) grid.dispose();
    const { half, step } = gridFor(size);
    const lines = gridLines(half, step);
    grid = BABYLON.MeshBuilder.CreateLineSystem(
      "grid",
      {
        lines: lines.map((line) => line.points.map((p) => new BABYLON.Vector3(...p))),
        colors: lines.map((line) => {
          const color = line.axis ? new BABYLON.Color4(0.5, 0.55, 0.7, 1) : new BABYLON.Color4(0.28, 0.3, 0.38, 1);
          return [color, color];
        }),
      },
      scene
    );
    grid.isPickable = false;
    grid.setEnabled(state.grid);
  };

  const apply = () => {
    if (grid) grid.setEnabled(state.grid);
    if (axes) axes.dispose();
    axes = state.axes ? new BABYLON.AxesViewer(scene, Math.max(0.5, (current ? current.size : 1) * 0.4)) : null;
    if (box) box.dispose();
    box = null;
    if (state.bounds && current) {
      const size = current.bounds.max.subtract(current.bounds.min);
      box = BABYLON.MeshBuilder.CreateBox("bounds", { width: size.x, height: size.y, depth: size.z }, scene);
      box.position = current.bounds.min.add(current.bounds.max).scale(0.5);
      box.material = new BABYLON.StandardMaterial("boundsMaterial", scene);
      box.material.wireframe = true;
      box.material.emissiveColor = new BABYLON.Color3(1, 0.8, 0.2);
      box.material.disableLighting = true;
      box.isPickable = false;
    }
    for (const mesh of scene.meshes) {
      if (mesh === grid || mesh === box || (axes && mesh.name.startsWith("axis"))) continue;
      if (mesh.material && mesh.name !== "bounds") mesh.material.wireframe = state.wireframe;
    }
    camera.useAutoRotationBehavior = state.spin;
    if (state.spin && camera.autoRotationBehavior) camera.autoRotationBehavior.idleRotationSpeed = 0.4;
  };

  drawGrid(2);
  apply();

  return {
    camera,
    state,
    // Turn a view option on or off.
    set(id, value) {
      if (!Object.hasOwn(state, id)) return;
      state[id] = !!value;
      apply();
    },
    // Aim the camera at a model's box (see frame.js), and size the grid to it.
    frame(bounds) {
      const framing = framingFor(bounds, camera.fov, engineAspect(scene, camera));
      current = { bounds, size: framing.size };
      camera.setTarget(framing.target);
      camera.radius = framing.radius;
      camera.upperRadiusLimit = framing.radius * 20;
      camera.minZ = framing.near;
      camera.maxZ = framing.far;
      camera.wheelPrecision = 30 / Math.max(framing.radius, 0.1);
      drawGrid(framing.size);
      apply();
    },
    // Called when a model comes or goes, so that the options (wireframe, the box) are applied to what is there now.
    refresh: apply,
  };
}

// The picture's width over its height, with a sensible answer when there is no engine yet (as in a test).
function engineAspect(scene, camera) {
  const engine = scene.getEngine();
  return engine && engine.getRenderWidth() > 0 ? engine.getAspectRatio(camera) : 1;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { gridLines, gridFor, VIEW_OPTIONS, createViewer, engineAspect };
} else {
  Object.assign(window, { gridLines, gridFor, VIEW_OPTIONS, createViewer, engineAspect });
}
