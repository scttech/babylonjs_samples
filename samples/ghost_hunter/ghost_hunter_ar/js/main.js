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
let mode = "camera"; // what the game is drawn over: "camera" (the picture of the camera) or "xr" (real augmented reality)
let xrOk = false; // can this phone do real augmented reality? (found out a moment after the page opens)
let panel = null; // the developer panel, if there is one (see the end of this file)

// What the browser remembers between visits. A browser can refuse, so every use of it is allowed to fail.
const remembered = (key) => { try { return localStorage.getItem(key); } catch (error) { return null; } };
const remember = (key, value) => { try { localStorage.setItem(key, value); } catch (error) { /* it is only a preference */ } };

const placeholders = new PlaceholderSet();
placeholders.table.show = placeholdersWanted(location.search, remembered(PLACEHOLDER_KEY));

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

// Everything the game does every frame is a system: a function of the seconds that have gone and of the player. Each part of the game
// adds its own to this list.
const systems = [];

// Some things to look at, so that looking around can be seen to work: a ring of glowing posts round the player, every 45 degrees,
// with the bearing on each, and one straight up. They are placeholders: the game works without them, and they can be hidden.
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
  placeholders.add(post, "marker");
  const words = label(String(bearing).padStart(3, "0"));
  words.position.set(x, LOOK.eyeHeight * 2 + 0.4, z);
  placeholders.add(words, "marker");
}
const above = BABYLON.MeshBuilder.CreateSphere("above", { diameter: 0.3 }, scene);
above.position.set(0, LOOK.eyeHeight + 3, 0);
above.material = cyan;
placeholders.add(above, "marker");

// With no camera there is no room, so there is a floor to stand on: a grid, fading into the dark.
const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: 30, height: 30 }, scene);
const grid = new BABYLON.GridMaterial("grid", scene);
grid.mainColor = new BABYLON.Color3(0.02, 0.05, 0.03);
grid.lineColor = new BABYLON.Color3(0.1, 0.5, 0.1);
grid.gridRatio = 1;
floor.material = grid;
floor.isVisible = false;

// The player: where the eye is and which way it looks, as plain numbers, whatever is moving the camera. The camera's picture and a
// dark room have the eye in one place, turned; augmented reality has it wherever the phone is in the room. Every system reads this.
const player = { position: [0, LOOK.eyeHeight, 0], forward: [0, 0, 1], up: [0, 1, 0] };

function updatePlayer(view) {
  if (mode === "xr") {
    const camera = scene.activeCamera;
    const here = camera.globalPosition;
    const ahead = camera.getDirection(BABYLON.Axis.Z);
    const top = camera.getDirection(BABYLON.Axis.Y);
    player.position = [here.x, here.y, here.z];
    player.forward = [ahead.x, ahead.y, ahead.z];
    player.up = [top.x, top.y, top.z];
  } else {
    player.position = [eye.position.x, eye.position.y, eye.position.z];
    player.forward = view.forward;
    player.up = view.up;
  }
}

// Where the player is looking at the floor, and a mark on it. The surface is what the phone has found (real augmented reality) or the
// game's guess that the floor is flat and a phone's height below the eye (the camera's picture): the same shape either way.
let surface = null;
const target = BABYLON.MeshBuilder.CreateTorus("target", { diameter: 0.5, thickness: 0.02, tessellation: 48 }, scene);
target.material = green;
target.rotationQuaternion = new BABYLON.Quaternion();
target.isVisible = false;
const tilt = new BABYLON.Quaternion();

function updateTarget() {
  surface = mode === "xr" ? (xr.surface()) : findFloor(player.position, player.forward);
  target.isVisible = surface !== null;
  if (!surface) return;
  target.position.set(surface.point[0], surface.point[1] + 0.01, surface.point[2]);
  BABYLON.Quaternion.FromUnitVectorsToRef(BABYLON.Vector3.Up(), new BABYLON.Vector3(...surface.normal), tilt);
  target.rotationQuaternion.copyFrom(tilt);
}
systems.push(updateTarget);

// The places the player has marked. Each is a glowing orb standing on a ring, which is a placeholder for what will haunt the place.
const placements = new Placements();
const marks = new Map(); // placement id -> the node that shows it

placements.onChange(({ type, item }) => {
  if (type === "removed") {
    const mark = marks.get(item.id);
    if (mark) {
      placeholders.remove(mark);
      mark.dispose();
    }
    marks.delete(item.id);
    return;
  }
  const mark = new BABYLON.TransformNode(`mark-${item.id}`, scene);
  mark.position.set(item.point[0], item.point[1], item.point[2]);
  const orb = BABYLON.MeshBuilder.CreateSphere(`orb-${item.id}`, { diameter: 0.18 }, scene);
  orb.parent = mark;
  orb.position.y = 0.3;
  orb.material = cyan;
  const base = BABYLON.MeshBuilder.CreateTorus(`base-${item.id}`, { diameter: 0.4, thickness: 0.015, tessellation: 32 }, scene);
  base.parent = mark;
  base.position.y = 0.01;
  base.material = cyan;
  placeholders.add(mark, "marker");
  marks.set(item.id, mark);
  if (mode === "xr") {
    xr.anchorHere().then((node) => {
      if (!node || !marks.has(item.id)) return;
      mark.parent = node; // the phone keeps the anchor where it was put, and the mark goes with it
      mark.position.set(0, 0, 0);
      placements.anchor(item.id);
    });
  }
});

// Marks the floor where the target is. Says so if there is nothing to mark.
function placeAtReticle() {
  if (!surface || !isFloor(surface)) {
    notice.textContent = "Look at the floor to mark it.";
    return;
  }
  notice.textContent = "";
  placements.add(surface);
}

// Real augmented reality, if the phone has it. Nothing happens until the player asks.
const xr = new ArSession(scene);
xr.onSelect(placeAtReticle);
xr.onExit(() => {
  mode = "camera";
  start.show();
});
xrAvailable().then((available) => {
  xrOk = available;
  start.setStatus(`${startStatus(support)} ${xrStatus(available, location.search)}`.trim());
  if (available) {
    const other = chooseExperience(available, location.search) === "xr" ? "camera" : "xr";
    start.offerAlternative(other === "camera" ? "Use the camera view instead" : "Use real augmented reality");
    start.onAlternative(() => enter(other));
  }
});

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
  const view = mode === "xr" ? null : aim();
  updatePlayer(view);
  compass.textContent = bearingText(bearingOf(player.forward), pitchOf(player.forward));
  const seconds = Math.min(engine.getDeltaTime() / 1000, 0.1);
  for (const system of systems) system(seconds, player);
  if (panel) panel.refreshReadouts();
});

// Dragging to look, for a desktop and for a phone with no motion sensors; and a tap (a press that does not move) marks the floor.
let dragging = null;
let pressed = null;
canvas.addEventListener("pointerdown", (event) => {
  dragging = { x: event.clientX, y: event.clientY };
  pressed = { x: event.clientX, y: event.clientY, time: performance.now() };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragging || source !== "drag") return;
  drag.drag(event.clientX - dragging.x, event.clientY - dragging.y);
  dragging = { x: event.clientX, y: event.clientY };
});
canvas.addEventListener("pointerup", (event) => {
  if (pressed && isTap(pressed, { x: event.clientX, y: event.clientY, time: performance.now() })) placeAtReticle();
  dragging = null;
  pressed = null;
});
canvas.addEventListener("pointercancel", () => {
  dragging = null;
  pressed = null;
});

function recentre() {
  gyro.recentre();
  drag.recentre();
}

// The placeholders, hidden or shown, and the choice kept for next time.
function showPlaceholders(show) {
  placeholders.setShow(show);
  remember(PLACEHOLDER_KEY, show ? "on" : "off");
  if (panel) panel.refresh();
}
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") recentre();
  if (event.code === "KeyP") showPlaceholders(!placeholders.table.show);
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

// The camera's picture with the motion sensors. A phone wants the questions asked straight from the tap, so the motion sensors are
// asked for first, before anything waits. Gives the notices for whatever did not work.
async function enterCamera() {
  const motion = support.needsPermission ? await askForMotion(window.DeviceOrientationEvent) : "granted";
  const picture = support.camera ? await feed.start() : { ok: false, message: "" };
  const reading = motion === "granted" && support.motion ? await gyroReading(1200) : false;
  source = chooseLookSource(support, reading);
  mode = "camera";

  const problems = [];
  if (support.camera && !picture.ok) problems.push(picture.message);
  if (motion === "denied") problems.push("The motion sensors were not allowed, so drag the screen to look around.");
  else if (!reading && support.motion) problems.push("This device sent no motion readings: drag the screen to look around.");
  gyro.recentre();
  floor.isVisible = !feed.live; // no camera, no room: so there is a floor
  return problems;
}

// Real augmented reality: the phone shows its camera and finds the floor itself. If it will not start, the camera's picture is used.
async function enterAr() {
  try {
    await xr.create();
    await xr.enter(document.body);
    mode = "xr";
    floor.isVisible = false;
    return [];
  } catch (error) {
    const problems = await enterCamera();
    return ["Augmented reality would not start, so this is the camera view.", ...problems];
  }
}

// The button (or the second button). `experience` is "xr" or "camera".
async function enter(experience = chooseExperience(xrOk, location.search)) {
  start.setBusy(true);
  const problems = experience === "xr" ? await enterAr() : await enterCamera();
  notice.textContent = problems.join(" ");
  reticle.classList.add("shown");
  start.hide();
  start.setBusy(false);
  if (panel) panel.refresh();
}
start.onEnter(() => enter());

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
      {
        title: "Placeholders",
        rows: [
          toggle("show placeholders (P)", () => placeholders.table.show, showPlaceholders),
          ...Object.keys(placeholders.table.kinds).map((kind) => toggle(`show ${kind}s`, () => placeholders.table.kinds[kind], (value) => placeholders.setKind(kind, value))),
          readout("placeholders", () => placeholders.count()),
        ],
      },
      {
        title: "Surfaces",
        rows: [
          readout("experience", () => (mode === "xr" ? "augmented reality" : "camera view")),
          readout("augmented reality", () => (xrOk ? "available" : "not available")),
          readout("surface", () => (surface ? `${surface.guessed ? "guessed" : "found"} floor at ${surface.distance === null ? "?" : surface.distance.toFixed(1)} m` : "none")),
          readout("marks", () => `${placements.items.length} (${placements.items.filter((item) => item.anchored).length} anchored)`),
          slider("furthest floor guess (m)", SURFACE, "maxDistance", 2, 12, 0.5),
          slider("least look down (degrees)", SURFACE, "minDownDegrees", 0, 40, 1),
          action("Mark the floor here", placeAtReticle),
          action("Clear the marks", () => placements.clear()),
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
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr }; // for poking at from the console
}
