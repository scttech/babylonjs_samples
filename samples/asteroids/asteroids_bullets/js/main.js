const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// --- World-space / orthographic-camera tuning ---
// The viewport's vertical half-extent always maps to this many world units,
// no matter the window size -- halfWidth is derived from it every resize so
// the wrap-around bounds and what's on screen always agree. Unlike Breakout,
// y grows UP here (see Ship), so no y-flip is needed anywhere.
const WORLD_HALF_HEIGHT = 7;
const SHIP_RADIUS = 0.6;
const SHIP_DRAG = 0.15; // a touch of drag so the ship eventually coasts to a halt

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
    if (anyHeld(FIRE_KEYS)) bullets.fire(ship);
    bullets.update(dt, bounds);
  });

  return { scene, updateViewport };
};

const { scene, updateViewport } = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
  updateViewport();
});
