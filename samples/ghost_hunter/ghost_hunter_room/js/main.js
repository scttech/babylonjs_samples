const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { alpha: true, preserveDrawingBuffer: true, stencil: true });
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

const feedVideo = document.getElementById("feed");
const reticle = document.getElementById("reticle");
const notice = document.getElementById("notice");
const compass = document.getElementById("compass");

const device = describeDevice();
const support = detectSupport(device);
const feed = new CameraFeed(feedVideo);
const gyro = new GyroLook(() => (screen.orientation ? screen.orientation.angle : window.orientation) || 0);
const drag = new DragLook();
let source = "drag"; // what the player is looking around with: "gyro" or "drag"
let panel = null; // the developer panel, if there is one (see the end of this file)

const start = new StartScreen();
start.setStatus(startStatus(support));

// The scene is see-through: where nothing is drawn, the camera's picture shows (or, with no camera, the dark of the page).
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity = 0.04;
scene.fogColor = new BABYLON.Color3(0.02, 0.03, 0.05);

const eye = new BABYLON.FreeCamera("eye", new BABYLON.Vector3(0, LOOK.eyeHeight, 0), scene);
eye.fov = toRadians(LOOK.fovDegrees);
eye.minZ = 0.05;
eye.rotationQuaternion = new BABYLON.Quaternion();
eye.inputs.clear(); // the phone is the controls, not the keys

new BABYLON.HemisphericLight("dim", new BABYLON.Vector3(0, 1, 0), scene).intensity = 0.5;

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());

// Some things to look at, so that looking around can be seen to work: a ring of glowing posts round the player, every 45 degrees,
// with the bearing on each, and one straight up. They stand where the ghosts will.
const glow = (name, color) => {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.disableLighting = true;
  material.emissiveColor = BABYLON.Color3.FromHexString(color);
  return material;
};
const green = glow("green", "#39ff14");
const cyan = glow("cyan", "#3ce6ff");

function label(text) {
  const texture = new BABYLON.DynamicTexture(`label-${text}`, { width: 256, height: 128 }, scene, true);
  texture.hasAlpha = true;
  texture.drawText(text, null, 92, "bold 84px monospace", "#39ff14", "transparent", true);
  const plane = BABYLON.MeshBuilder.CreatePlane(`label-${text}`, { width: 1, height: 0.5 }, scene);
  const labelMaterial = new BABYLON.StandardMaterial(`label-${text}`, scene);
  labelMaterial.disableLighting = true;
  labelMaterial.emissiveTexture = texture;
  labelMaterial.opacityTexture = texture;
  plane.material = labelMaterial;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  return plane;
}

const RING_RADIUS = 4;
for (let bearing = 0; bearing < 360; bearing += 45) {
  const angle = toRadians(bearing);
  const x = Math.sin(angle) * RING_RADIUS;
  const z = Math.cos(angle) * RING_RADIUS;
  const post = BABYLON.MeshBuilder.CreateCylinder(`post-${bearing}`, { height: LOOK.eyeHeight * 2, diameter: 0.08 }, scene);
  post.position.set(x, LOOK.eyeHeight, z);
  post.material = bearing === 0 ? cyan : green;
  label(String(bearing).padStart(3, "0")).position.set(x, LOOK.eyeHeight * 2 + 0.4, z);
}
const above = BABYLON.MeshBuilder.CreateSphere("above", { diameter: 0.3 }, scene);
above.position.set(0, LOOK.eyeHeight + 3, 0);
above.material = cyan;

// With no camera there is no room, so there is a floor to stand on: a grid, fading into the dark.
const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: 30, height: 30 }, scene);
const grid = new BABYLON.GridMaterial("grid", scene);
grid.mainColor = new BABYLON.Color3(0.02, 0.05, 0.03);
grid.lineColor = new BABYLON.Color3(0.1, 0.5, 0.1);
grid.gridRatio = 1;
floor.material = grid;
floor.isVisible = false;

// Every frame the camera is turned to where the player is looking.
const axes = new BABYLON.Matrix();
function aim() {
  const view = source === "gyro" ? gyro.look() : drag.look();
  const { right, up, forward } = lookAxes(view.forward, view.up);
  BABYLON.Matrix.FromXYZAxesToRef(new BABYLON.Vector3(...right), new BABYLON.Vector3(...up), new BABYLON.Vector3(...forward), axes);
  BABYLON.Quaternion.FromRotationMatrixToRef(axes, eye.rotationQuaternion);
  return view;
}

scene.onBeforeRenderObservable.add(() => {
  const view = aim();
  compass.textContent = bearingText(bearingOf(view.forward), pitchOf(view.forward));
  if (panel) panel.refreshReadouts();
});

// Dragging to look: for a desktop, and for a phone with no motion sensors.
let dragging = null;
canvas.addEventListener("pointerdown", (event) => {
  dragging = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragging || source !== "drag") return;
  drag.drag(event.clientX - dragging.x, event.clientY - dragging.y);
  dragging = { x: event.clientX, y: event.clientY };
});
const endDrag = () => { dragging = null; };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

function recentre() {
  gyro.recentre();
  drag.recentre();
}
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") recentre();
});

window.addEventListener("deviceorientation", (event) => gyro.feed(event));

// Waits up to `milliseconds` for the motion sensors to send a reading: a desktop has them in the code and never sends one.
const gyroReading = (milliseconds) => new Promise((resolve) => {
  if (gyro.ready) return resolve(true);
  const started = performance.now();
  const check = () => {
    if (gyro.ready) resolve(true);
    else if (performance.now() - started > milliseconds) resolve(false);
    else setTimeout(check, 50);
  };
  check();
});

// The button. A phone wants the questions asked straight from the tap, so the motion sensors are asked for first, before anything waits.
async function enter() {
  start.setBusy(true);
  const motion = support.needsPermission ? await askForMotion(window.DeviceOrientationEvent) : "granted";
  const picture = support.camera ? await feed.start() : { ok: false, message: "" };
  const reading = motion === "granted" && support.motion ? await gyroReading(1200) : false;
  source = chooseLookSource(support, reading);

  const problems = [];
  if (support.camera && !picture.ok) problems.push(picture.message);
  if (motion === "denied") problems.push("The motion sensors were not allowed, so drag the screen to look around.");
  else if (!reading && support.motion) problems.push("This device sent no motion readings: drag the screen to look around.");
  notice.textContent = problems.join(" ");

  gyro.recentre();
  floor.isVisible = !feed.live; // no camera, no room: so there is a floor
  reticle.classList.add("shown");
  start.hide();
  start.setBusy(false);
  if (panel) panel.refresh();
}
start.onEnter(enter);

// Developer mode, with ?dev on the end of the address: a panel to watch and change things while the game runs. The key under Esc
// shows and hides it, and a short screen starts it folded up, so it never covers much of the picture.
if (devEnabled(location.search)) {
  panel = new DevPanel(
    document,
    [
      {
        title: "Looking",
        rows: [
          readout("look source", () => source),
          readout("camera picture", () => (feed.live ? "live" : "none")),
          readout("sensor readings", () => gyro.readings),
          readout("alpha / beta / gamma", () => (gyro.reading ? `${gyro.reading.alpha.toFixed(0)} / ${gyro.reading.beta.toFixed(0)} / ${gyro.reading.gamma.toFixed(0)}` : "-")),
          slider("field of view", LOOK, "fovDegrees", 30, 100, 1),
          slider("drag speed", LOOK, "dragRadiansPerPixel", 0.001, 0.01, 0.0005),
          action("Recentre", recentre),
          action("Look by dragging", () => { source = "drag"; }),
          action("Look by the sensors", () => { if (gyro.ready) source = "gyro"; }),
          toggle("show the floor", () => floor.isVisible, (value) => { floor.isVisible = value; }),
        ],
      },
    ],
    { collapsed: window.innerHeight < 600, clipboard: navigator.clipboard },
  );
  document.body.appendChild(panel.root);
  window.addEventListener("keydown", (event) => {
    if (event.code === DEV_KEY) panel.toggleShown();
  });
  scene.onBeforeRenderObservable.add(() => { eye.fov = toRadians(LOOK.fovDegrees); });
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre }; // for poking at from the console
}
