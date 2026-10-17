const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// --- Procedural fire sound ---
// A short downward "pew": a sine wave whose pitch swoops from high to low
// while its volume fades out. Synthesized on the fly, so there's no audio
// file to fetch or license.
let audioEngine = null;
let fireBuffer = null;
let bangBuffer = null;

const initAudio = async () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioEngine = await BABYLON.CreateAudioEngineAsync({ audioContext });
  await audioEngine.unlockAsync();

  const duration = 0.15;
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Accumulate phase instead of computing sin(2 * PI * f * t) directly.
  // When the frequency changes over time, the direct formula produces
  // glitches, because the phase jumps every time f changes. Adding up the
  // small phase step for each sample keeps the wave continuous.
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const frequency = 1000 * Math.exp(-t * 12); // swoops from 1000 Hz down to ~165 Hz
    phase += (2 * Math.PI * frequency) / sampleRate;
    data[i] = Math.sin(phase) * Math.exp(-t * 18) * 0.5;
  }

  fireBuffer = buffer;

  // The explosion: white noise run through a simple low-pass filter (each
  // sample moves only 15% of the way toward the next random value, which
  // smooths away the harsh high frequencies), fading out over 0.4 seconds.
  const bangLength = Math.floor(sampleRate * 0.4);
  const bang = audioContext.createBuffer(1, bangLength, sampleRate);
  const bangData = bang.getChannelData(0);
  let smoothed = 0;
  for (let i = 0; i < bangLength; i++) {
    const t = i / sampleRate;
    smoothed += (Math.random() * 2 - 1 - smoothed) * 0.15;
    bangData[i] = smoothed * Math.exp(-t * 8) * 2;
  }

  bangBuffer = bang;

};

const playFireSound = async () => {
  if (!audioEngine || !fireBuffer) return;

  const sound = await audioEngine.createSoundAsync("fire", fireBuffer, {
    volume: 0.4,
    playbackRate: 0.95 + Math.random() * 0.1, // slight pitch variation so shots don't sound identical
  });
  sound.onEndedObservable.add(() => sound.dispose());
  sound.play();
};

// Bigger rocks sound deeper: a lower playback rate slows the noise down.
const BANG_RATES = { large: 0.6, medium: 0.9, small: 1.3 };

const playBangSound = async (size) => {
  if (!audioEngine || !bangBuffer) return;

  const sound = await audioEngine.createSoundAsync("bang", bangBuffer, {
    volume: 0.5,
    playbackRate: BANG_RATES[size],
  });
  sound.onEndedObservable.add(() => sound.dispose());
  sound.play();
};

// --- World-space / orthographic-camera tuning ---
// The viewport's vertical half-extent always maps to this many world units,
// no matter the window size -- halfWidth is derived from it every resize so
// the wrap-around bounds and what's on screen always agree. Unlike Breakout,
// y grows UP here (see Ship), so no y-flip is needed anywhere.
const WORLD_HALF_HEIGHT = 7;
const SHIP_RADIUS = 0.6;
const SHIP_DRAG = 0.15; // a touch of drag so the ship eventually coasts to a halt
const START_ROCKS = 4; // large rocks on screen at the start
const SAFE_DISTANCE = 3; // world units; rocks never spawn this close to the ship


const createScene = () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString("#050508FF");

  // Same orthographic setup the earlier series use: flat "2D" gameplay with
  // no perspective distortion.
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.setTarget(BABYLON.Vector3.Zero());
  scene.activeCamera = camera;

  let halfWidth, halfHeight;

  const updateViewport = () => {
    const aspect = engine.getRenderWidth() / engine.getRenderHeight();
    halfHeight = WORLD_HALF_HEIGHT;
    halfWidth = halfHeight * aspect;
    camera.orthoLeft = -halfWidth;
    camera.orthoRight = halfWidth;
    camera.orthoTop = halfHeight;
    camera.orthoBottom = -halfHeight;
  };
  updateViewport();

  const ship = new Ship({ scene, radius: SHIP_RADIUS, drag: SHIP_DRAG });
  const bullets = new BulletSystem({ scene });
  const rocks = new RockField({ scene });

  // Fullscreen 2D GUI layer for the score, drawn on top of the 3D world.
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
  const hud = new Hud({ ui });

  const populateRocks = () => rocks.populate(START_ROCKS, { halfWidth, halfHeight }, ship, SAFE_DISTANCE);
  populateRocks();

  // Held-key input: turn and thrust are applied once per frame below, so
  // holding a key behaves identically at any frame rate.
  const heldKeys = new Set();
  const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
  const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
  const THRUST_KEYS = new Set(["ArrowUp", "KeyW"]);
  const FIRE_KEYS = new Set(["Space"]);
  const isControlKey = (code) => LEFT_KEYS.has(code) || RIGHT_KEYS.has(code) || THRUST_KEYS.has(code) || FIRE_KEYS.has(code);

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") {
      ship.reset();
      bullets.clear();
      rocks.clear();
      hud.resetScore();
      populateRocks();
      return;
    }

    if (!isControlKey(event.code)) return;
    event.preventDefault(); // arrow keys otherwise scroll the page
    heldKeys.add(event.code);
  });
  window.addEventListener("keyup", (event) => heldKeys.delete(event.code));
  window.addEventListener("blur", () => heldKeys.clear()); // don't get stuck thrusting after alt-tab

  const anyHeld = (keys) => [...heldKeys].some((code) => keys.has(code));

  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't launch the ship across the map.
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const bounds = { halfWidth, halfHeight };

    // Holding both turn keys cancels out, as in the original.
    const turn = (anyHeld(LEFT_KEYS) ? 1 : 0) - (anyHeld(RIGHT_KEYS) ? 1 : 0);
    if (turn !== 0) ship.rotate(turn, dt);
    if (anyHeld(THRUST_KEYS)) ship.thrust(dt);

    ship.update(dt, bounds);

    // Fire after the ship has moved this frame, so bullets spawn at the
    // nose's current position. Holding Space auto-fires; the system's own
    // cooldown and bullet cap set the pace.
    if (anyHeld(FIRE_KEYS) && bullets.fire(ship)) playFireSound();

    bullets.update(dt, bounds);
    rocks.update(dt, bounds);
    for (const hit of rocks.collideBullets(bullets)) {
      hud.addScore(hit.points);
      playBangSound(hit.size);
    }
    // Everything shot? Bring in a fresh set. (A later step turns this into
    // proper waves.)
    if (rocks.rocks.length === 0) populateRocks();
  });

  return { scene, updateViewport };
};

const { scene, updateViewport } = createScene();
initAudio();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
  updateViewport();
});
