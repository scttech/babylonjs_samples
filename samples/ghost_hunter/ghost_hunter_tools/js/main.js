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
let playing = false; // has the player pressed the button? (nothing is sent after them before then)
let shakeAmount = 0; // how hard the view is being shaken by a strike, 0 to 1
let xrOk = false; // can this phone do real augmented reality? (found out a moment after the page opens)
let panel = null; // the developer panel, if there is one (see the end of this file)

// What the browser remembers between visits. A browser can refuse, so every use of it is allowed to fail.
const remembered = (key) => { try { return localStorage.getItem(key); } catch (error) { return null; } };
const remember = (key, value) => { try { localStorage.setItem(key, value); } catch (error) { /* it is only a preference */ } };

const LEVEL_KEY = "ghost-hunter.scare"; // where the scare level is kept in the browser
SCARE.level = levelWanted(location.search, remembered(LEVEL_KEY));

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

// The ghosts. `haunting` keeps their numbers (see ghost.js) and a GhostBody gives each one a look; mist (the same soft puff, large and
// faint) hangs over every place that has been marked. None of it is a placeholder: the ghosts and the mist are the real thing, made in code.
registerGhostShader();
const puff = softTexture(scene);
const haunting = new Haunting();
const bodies = new Map(); // apparition id -> its GhostBody
const mists = new Map(); // placement id -> the mist over it
let clock = 0; // seconds since the game began: the shader moves with it

haunting.onChange(({ type, item }) => {
  if (type === "added") {
    // A ghost is made in code, or (if there are models of ghosts, and its own number says so) it is a model.
    const ghostModels = [...creatureModels.keys()].filter((name) => STATIC_MODELS[name] && STATIC_MODELS[name].ghost);
    const chosen = ghostModelFor(item.id, ghostModels, GHOST.modelChance);
    bodies.set(item.id, chosen ? new GhostModelBody(scene, item, creatureModels.get(chosen)) : new GhostBody(scene, item, puff));
    item.reveal = 0; // a ghost is half there until the light is on it
    if (audio.ready) audio.cue("whisper", item.home, 0.8, audio.context.currentTime + GHOST.summonDelay); // a whisper, as it comes
    return;
  }
  const body = bodies.get(item.id);
  if (body) body.dispose();
  bodies.delete(item.id);
});

systems.push((seconds, player) => {
  clock += seconds;
  haunting.update(seconds, player);
  for (const body of bodies.values()) body.update(clock);
});

// A ghost three metres ahead of the player, on the floor, at once.
function summonAhead() {
  const ahead = player.forward;
  const flat = Math.hypot(ahead[0], ahead[2]) || 1;
  haunting.summon([player.position[0] + (ahead[0] / flat) * 3, 0, player.position[2] + (ahead[2] / flat) * 3], { delay: 0.2 });
}

// The creatures. `creatures` keeps their numbers (see creatures.js), and each has a body that is drawn from its pose (creaturemesh.js).
// A kind that has a model is drawn as it (staticbody.js moves it); one that has none (the spider and the skeleton, so far) is drawn as
// simple shapes, which are placeholders of the kind "creature": hide
// them with P (or the panel) and the creatures are still there, and still coming.
const looks = creatureMaterials(scene);
const creatures = new Menagerie();
const creatureBodies = new Map(); // creature id -> its body
let creatureModels = new Map(); // the models that have been loaded, by kind (none, so far)
let lastCreatureEvent = "none";
let creaturesActive = true; // developer mode can freeze them where they stand

creatures.onChange(({ type, item }) => {
  if (type === "added") {
    creatureBodies.set(item.id, makeCreatureBody(scene, item, looks, placeholders, creatureModels));
    audio.cue("creak", item.position, 1); // the tell: a creak from where it is, before it is anywhere to be seen
  } else if (type === "removed") {
    const body = creatureBodies.get(item.id);
    if (body) body.dispose(placeholders);
    creatureBodies.delete(item.id);
    audio.forget(item.id);
  } else {
    lastCreatureEvent = `${item.kind} ${type}`; // a lunge, a touch, a death
    if (type === "touch") director.noteScare(); // it got to the player: the dread drops, and there is a rest
    if (type === "lunge" || type === "touch") scare.trigger(type); // and it is a scare
    if (type === "landed") audio.cue("thud", item.position, 0.7);
  }
});

systems.push((seconds, player) => {
  if (creaturesActive) creatures.update(seconds, player);
  for (const body of creatureBodies.values()) body.update();
});

loadCreatureModels(scene).then((loaded) => { creatureModels = loaded; });

// The hunt. The director decides what turns up, where and when (see director.js), and the game does what it orders. It sends nothing
// until the player has pressed the button, and nothing in the first moments: the dread has to build.
const director = new Director(HUNT);
let lastOrder = "none";

// How far each way the camera sees, from the middle of the screen, in degrees: the director keeps out of it.
const currentHalfFov = () => horizontalHalfFov(LOOK.fovDegrees, engine.getAspectRatio(scene.activeCamera));

systems.push((seconds, player) => {
  if (!playing) return;
  const active = creatures.items.filter((creature) => creature.alive).length;
  for (const order of director.update(seconds, { player, halfFov: currentHalfFov(), active })) {
    if (creatures.spawn(order.kind, order.point)) lastOrder = `${order.kind} from ${order.zone}${order.point[1] > 0 ? ", dropping" : ""}`;
  }
});

// Sends one now, from a zone (or from any of them), as the director would.
function strikeNow(zone) {
  const table = { ...HUNT, zones: zone ? HUNT.zones.filter((candidate) => candidate.name === zone) : HUNT.zones };
  const spot = chooseSpawn(player, currentHalfFov(), table, Math.random);
  const pick = chooseKind(Math.max(director.tension, 0.5), HUNT.intensity, HUNT, Math.random);
  if (spot && pick && creatures.spawn(pick.kind, spot.point)) lastOrder = `${pick.kind} from ${spot.zone}`;
}

// The scare. `audio` is every sound of the game, made in code (audio.js); `scare` is the build-up, the strike and the aftershock as numbers
// (scare.js); `fx` is the flash and the dark edge over the picture. The choice of how much of it the player wants is on the start screen.
const audio = new GhostAudio();
const music = new Music(audio);
const scare = new ScareSequence(SCARE);
const fx = new ScareFx(document);
const picker = new LevelPicker(document, SCARE, (name) => {
  scare.setLevel(name);
  audio.setVolume(SCARE.levels[name].volume);
  remember(LEVEL_KEY, name);
});
scare.setLevel(SCARE.level);
audio.setVolume(SCARE.levels[SCARE.level].volume);
let dread = 0; // how near the nearest creature is, as a feeling: 0 to 1

systems.push((seconds, player) => {
  const level = SCARE.levels[SCARE.level];
  const near = playing ? creatures.nearest(player.position) : null;
  dread = near ? dreadAt(near.distance, CREATURES[near.creature.kind].lungeRange) : 0;
  const frame = scare.update(seconds);
  shakeAmount = mode === "xr" ? 0 : frame.shake; // in augmented reality the phone's own view is not ours to shake
  if (frame.fired) {
    audio.cue("stinger", null, frame.fired.strength);
    if (frame.fired.vibrate.length && navigator.vibrate) navigator.vibrate(frame.fired.vibrate);
  }
  const quiet = buildUp(dread, level);
  audio.setHum(quiet.ambient * frame.ambient);
  audio.setHeart(quiet.heart, dread > 0.05);
  music.update(seconds, { dread, ambient: frame.ambient, silence: level.silence }); // the score follows the dread, and goes out for the strike
  audio.update(seconds, player);
  for (const creature of creatures.items) audio.voice(creature.id, creature.table.voice || creature.kind, creature.state, creature.position, creature.distanceTo(player.position), seconds);
  fx.apply({ flash: frame.flash, dread, level });
});

// The tools. `tools` is the flashlight and the beam as numbers (tools.js): what is in the cone, what it does to it, what is left in the
// battery, how hot the beam is, and how much of a hold it has. The game gives it everything that can be aimed at, as a list of targets, and
// does what it says: a light shows a ghost (it is half there until then) and hurts and stops what hates it; a beam that has held on long
// enough captures. The light is a real light in the scene, so that what it is on can be seen; the beam is a glowing line from the hand.
const tools = new Tools();
let beamHeld = false;
const torchLight = new BABYLON.SpotLight("torch", BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, 1), toRadians(TOOLS.light.halfAngle * 2.2), 2, scene);
torchLight.intensity = 0;
torchLight.diffuse = new BABYLON.Color3(1, 0.95, 0.8);
const beamBody = new BeamBody(scene);
const toolsUi = new ToolsUi(document, { onLight: () => tools.toggleLight(), onBeam: (on) => { beamHeld = on; } });
let lastCapture = "none";

// Everything that can be aimed at, as the tools want it: a thing with a key, a kind, where its feet are, and how thick and tall it is.
function aimTargets() {
  const targets = [];
  for (const creature of creatures.items) {
    if (!creature.alive) continue;
    targets.push({ key: `c${creature.id}`, kind: creature.kind, base: creature.position, radius: creature.table.radius, height: creature.table.height, creature });
  }
  for (const ghost of haunting.items) {
    if (ghost.stage === "waiting" || ghost.stage === "gone" || ghost.captured) continue;
    targets.push({ key: `g${ghost.id}`, kind: "ghost", base: ghost.position(), radius: 0.45, height: GHOST.height, ghost });
  }
  return targets;
}

systems.push((seconds, player) => {
  const targets = playing ? aimTargets() : [];
  const frame = tools.update(seconds, { beam: beamHeld && playing }, { player, targets });
  const byKey = new Map(targets.map((target) => [target.key, target]));
  for (const hit of frame.hits) {
    const target = byKey.get(hit.key);
    if (!target || !target.creature) continue;
    if (hit.damage > 0) target.creature.hit(hit.damage);
    if (hit.stun > 0) target.creature.stun(hit.stun);
  }
  const lit = new Set(frame.lit);
  for (const ghost of haunting.items) ghost.reveal = approach(ghost.reveal, lit.has(`g${ghost.id}`) ? 1 : 0, seconds, 0.4);
  for (const target of frame.captured) {
    const done = target.creature ? target.creature.capture() : haunting.capture(target.ghost.id);
    if (done) {
      lastCapture = target.kind;
      notice.textContent = `Captured: ${target.kind}`;
      audio.cue("thud", target.base, 0.6);
    }
  }
  torchLight.position.set(player.position[0], player.position[1], player.position[2]);
  torchLight.direction.set(player.forward[0], player.forward[1], player.forward[2]);
  torchLight.intensity = frame.lightOn ? 3.5 * frame.power : 0;
  const from = handPosition(player);
  const reach = frame.aimed ? frame.aimDistance : TOOLS.beam.range;
  beamBody.update(from, [0, 1, 2].map((i) => player.position[i] + player.forward[i] * reach), frame.firing, clock);
  toolsUi.apply(frame);
});

// A creature six metres ahead of the player, on the floor.
function spawnCreature(kind) {
  const ahead = player.forward;
  const flat = Math.hypot(ahead[0], ahead[2]) || 1;
  creatures.spawn(kind, [player.position[0] + (ahead[0] / flat) * 6, 0, player.position[2] + (ahead[2] / flat) * 6]);
}

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
    haunting.banish(item.id); // a place that is taken up has nothing to haunt
    if (mists.has(item.id)) releaseEffect(mists.get(item.id));
    mists.delete(item.id);
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
  mists.set(item.id, createMist(scene, item.point, puff)); // the mist comes at once, and the ghost a moment later
  haunting.summon(item.point, { placement: item.id });
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
  playing = false;
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
  const shown = shakeAmount > 0 ? shakeView(view, shakeOffset(clock, shakeAmount)) : view; // a strike shakes what is seen, not where the phone points
  const { right, up, forward } = lookAxes(shown.forward, shown.up);
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
  if (event.code === "KeyG") summonAhead();
  if (event.code === "Digit1") spawnCreature("spider");
  if (event.code === "Digit2") spawnCreature("ghoul");
  if (event.code === "Digit3") spawnCreature("skeleton");
  if (event.code === "Digit4") spawnCreature("doll");
  if (event.code === "Digit5") spawnCreature("floater");
  if (event.code === "Digit6") spawnCreature("horde");
  if (event.code === "Digit0") creatures.clear();
  if (event.code === "KeyH") HUNT.enabled = !HUNT.enabled;
  if (event.code === "KeyF" && !event.repeat) tools.toggleLight();
  if (event.code === "KeyB") beamHeld = true;
});

window.addEventListener("keyup", (event) => {
  if (event.code === "KeyB") beamHeld = false;
});

window.addEventListener("deviceorientation", (event) => gyro.feed(event));

// A page that is hidden (the phone is put in a pocket) stops the music, and it goes on when the page is back.
document.addEventListener("visibilitychange", () => (document.hidden ? music.pause() : music.resume()));

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
  audio.start(); // the sound can only begin from a touch of the screen (it is not waited for: the other questions are asked at once)
  music.start(); // and so can the music: it is told to play now, in the touch
  const problems = experience === "xr" ? await enterAr() : await enterCamera();
  notice.textContent = problems.join(" ");
  reticle.classList.add("shown");
  playing = true;
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
        title: "Ghosts",
        rows: [
          readout("ghosts", () => `${haunting.items.length} (${haunting.items.filter((ghost) => ghost.stage === "present").length} showing)`),
          readout("nearest", () => { const near = haunting.nearest(player.position); return near ? `${near.distance.toFixed(1)} m, ${near.item.stage}` : "none"; }),
          slider("brightness", GHOST, "opacity", 0.1, 1, 0.05),
          slider("how many are models", GHOST, "modelChance", 0, 1, 0.1),
          slider("flicker depth", GHOST, "flickerDepth", 0, 1, 0.05),
          slider("flicker speed (Hz)", GHOST, "flickerHz", 0, 20, 0.5),
          slider("fade in (s)", GHOST, "fadeIn", 0.2, 6, 0.1),
          slider("fade out (s)", GHOST, "fadeOut", 0.2, 6, 0.1),
          slider("life (s)", GHOST, "life", 5, 90, 1),
          slider("bob height (m)", GHOST, "bobHeight", 0, 0.5, 0.01),
          slider("drift radius (m)", GHOST, "driftRadius", 0, 3, 0.1),
          slider("turn rate", GHOST, "turnRate", 0, 8, 0.1),
          slider("mist thickness (new mist)", EFFECTS.mist, "alpha", 0, 0.4, 0.01),
          action("Summon a ghost ahead (G)", summonAhead),
          action("Send the ghosts away", () => haunting.banish()),
        ],
      },
      {
        title: "Tools",
        rows: [
          readout("light", () => (tools.lightOn ? `on, ${Math.round(tools.charge * 100)}%` : `off, ${Math.round(tools.charge * 100)}%${tools.flat ? " (flat)" : ""}`)),
          readout("beam heat", () => `${Math.round(tools.heat * 100)}%${tools.overheated ? " (too hot)" : ""}`),
          readout("captured", () => `${tools.total()} (last: ${lastCapture})`),
          readout("holds", () => ([...tools.grips].map(([key, grip]) => `${key} ${Math.round(grip * 100)}%`).join(", ") || "none")),
          slider("how wide the light is (degrees)", TOOLS.light, "halfAngle", 5, 40, 1),
          slider("how far the light reaches (m)", TOOLS.light, "range", 2, 14, 0.5),
          slider("how fast the beam holds", TOOLS.beam, "grip", 0.1, 2, 0.05),
          slider("how fast the beam cools", TOOLS.beam, "cool", 0.05, 1, 0.05),
          slider("how much of a ghost is there unlit", GHOST, "unlit", 0, 1, 0.05),
          action("Light on or off (F)", () => tools.toggleLight()),
          action("Fill the battery, cool the beam", () => { tools.charge = 1; tools.flat = false; tools.heat = 0; tools.overheated = false; }),
          action("Capture the nearest", () => { const near = creatures.nearest(player.position); if (near) near.creature.capture(); }),
        ],
      },
      {
        title: "Scares",
        rows: [
          readout("level", () => SCARE.level),
          readout("dread", () => dread.toFixed(2)),
          readout("heart (beats a minute)", () => (audio.heartOn ? audio.heartBpm.toFixed(0) : "-")),
          readout("sound", () => (audio.ready ? "running" : "not started")),
          readout("strikes", () => scare.strikes),
          readout("music (calm / tense)", () => { const l = music.levels(); return music.started ? `${(l.calm || 0).toFixed(2)} / ${(l.tense || 0).toFixed(2)}` : "not started"; }),
          toggle("music", () => MUSIC.enabled, (value) => { MUSIC.enabled = value; }),
          slider("music volume", MUSIC, "volume", 0, 1, 0.05),
          slider("how fast the mix moves (s)", MUSIC, "fade", 0.2, 5, 0.1),
          slider("when the room goes quiet (m)", SCARE, "tellDistance", 3, 14, 0.5),
          slider("how hard the camera shakes", SCARE, "shakeRadians", 0, 0.15, 0.005),
          slider("master volume", AUDIO, "master", 0, 1, 0.05),
          action("Strike: a lunge", () => scare.trigger("lunge")),
          action("Strike: a touch", () => scare.trigger("touch")),
          action("A creak behind you", () => audio.cue("creak", [-player.forward[0] * 3, 1, -player.forward[2] * 3], 1)),
          action("A whisper to the right", () => audio.cue("whisper", [player.forward[2] * 3, 1.4, -player.forward[0] * 3], 1)),
          action("Change the level", () => { const names = levelNames(); picker.select(names[(names.indexOf(SCARE.level) + 1) % names.length]); }),
        ],
      },
      {
        title: "The hunt",
        rows: [
          toggle("the hunt (H)", () => HUNT.enabled, (value) => { HUNT.enabled = value; }),
          slider("intensity", HUNT, "intensity", 0.5, 4, 0.1),
          readout("dread", () => `${director.tension.toFixed(2)} (strikes at ${director.target.toFixed(2)})`),
          readout("resting", () => (director.resting > 0 ? `${director.resting.toFixed(1)} s` : "no")),
          readout("sent / got to you", () => `${director.spawned} / ${director.scares}`),
          readout("at most at once", () => director.limit),
          readout("last sent", () => lastOrder),
          slider("how fast the dread builds", HUNT, "riseRate", 0.01, 0.4, 0.005),
          slider("rest after a scare (s)", HUNT, "cooldown", 0, 30, 1),
          slider("most at once", HUNT, "maxActive", 1, 8, 1),
          control("closest it appears (m)", () => HUNT.distance[0], (value) => { HUNT.distance[0] = Math.min(value, HUNT.distance[1] - 0.5); }, 3, 10, 0.5),
          control("furthest it appears (m)", () => HUNT.distance[1], (value) => { HUNT.distance[1] = Math.max(value, HUNT.distance[0] + 0.5); }, 4, 14, 0.5),
          slider("how often a spider drops", HUNT, "dropChance", 0, 1, 0.05),
          action("Send one now", () => strikeNow()),
          action("Send one from behind", () => strikeNow("behind")),
          action("Send one from the edge", () => strikeNow("edge")),
          action("Calm: no dread, a rest", () => { director.tension = 0; director.resting = HUNT.cooldown; }),
        ],
      },
      {
        title: "Creatures",
        rows: [
          readout("creatures", () => creatures.items.length),
          readout("nearest", () => { const near = creatures.nearest(player.position); return near ? `${near.creature.kind} ${near.creature.state}, ${near.distance.toFixed(1)} m` : "none"; }),
          readout("last thing it did", () => lastCreatureEvent),
          readout("models loaded", () => (creatureModels.size ? `${creatureModels.size} of ${Object.values(CREATURE_MODELS).filter(Boolean).length}` : "none: shapes")),
          slider("zombie height (m)", STATIC_MODELS.zombie, "height", 1, 3, 0.05),
          toggle("they move", () => creaturesActive, (value) => { creaturesActive = value; }),
          slider("spider speed", CREATURES.spider, "speed", 0.3, 4, 0.1),
          slider("ghoul speed", CREATURES.ghoul, "speed", 0.3, 4, 0.1),
          slider("skeleton speed", CREATURES.skeleton, "speed", 0.3, 4, 0.1),
          slider("spider lunge range", CREATURES.spider, "lungeRange", 0.5, 4, 0.1),
          slider("lunge pause (ghoul)", CREATURES.ghoul, "recoverTime", 0.2, 6, 0.1),
          action("Spider (1)", () => spawnCreature("spider")),
          action("Ghoul (2)", () => spawnCreature("ghoul")),
          action("Skeleton (3)", () => spawnCreature("skeleton")),
          action("Doll (4)", () => spawnCreature("doll")),
          action("Floater (5)", () => spawnCreature("floater")),
          action("Horde (6)", () => spawnCreature("horde")),
          action("Hurt the nearest", () => { const near = creatures.nearest(player.position); if (near) near.creature.hit(1); }),
          action("Clear them (0)", () => creatures.clear()),
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

  // A map of what the director is doing: the player in the middle, facing up, the edges of the view, every creature (orange spiders,
  // green ghouls, white skeletons; a big dot is a lunge) and every ghost (blue), and a bar for the dread with a mark where it strikes.
  const mapCanvas = document.createElement("canvas");
  mapCanvas.id = "hunt-map";
  mapCanvas.width = mapCanvas.height = 160;
  document.body.appendChild(mapCanvas);
  const mapContext = mapCanvas.getContext("2d");
  const MAP_SCALE = 9; // pixels to the metre
  const dot = (point, color, radius) => {
    const [x, y] = mapPoint(player, point, MAP_SCALE, 160);
    mapContext.fillStyle = color;
    mapContext.beginPath();
    mapContext.arc(x, y, radius, 0, Math.PI * 2);
    mapContext.fill();
  };
  systems.push(() => {
    mapCanvas.style.visibility = playing ? "visible" : "hidden"; // not over the start screen
    mapContext.clearRect(0, 0, 160, 160);
    mapContext.strokeStyle = "rgba(57, 255, 20, 0.25)";
    for (const metres of [2, 4, 6, 8]) {
      mapContext.beginPath();
      mapContext.arc(80, 80, metres * MAP_SCALE, 0, Math.PI * 2);
      mapContext.stroke();
    }
    mapContext.strokeStyle = "rgba(60, 230, 255, 0.7)";
    for (const side of [-1, 1]) {
      const [x, y] = mapPoint(player, pointAt(player, side * currentHalfFov(), 8), MAP_SCALE, 160);
      mapContext.beginPath();
      mapContext.moveTo(80, 80);
      mapContext.lineTo(x, y);
      mapContext.stroke();
    }
    for (const ghost of haunting.items) if (ghost.stage !== "waiting") dot(ghost.position(), "#3ce6ff", 2.5);
    const colors = { spider: "#ff9a1a", ghoul: "#7fe07f", skeleton: "#f2f3ee" };
    for (const creature of creatures.items) dot(creature.position, colors[creature.kind], creature.state === "lunge" ? 5 : 3);
    mapContext.fillStyle = "#39ff14";
    mapContext.fillRect(76, 76, 8, 8);
    mapContext.fillStyle = "rgba(57, 255, 20, 0.8)";
    mapContext.fillRect(4, 152, 152 * director.tension, 4);
    mapContext.fillStyle = "#c4161f";
    mapContext.fillRect(4 + 152 * director.target, 150, 2, 8);
  });
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music, tools }; // for poking at from the console
}
