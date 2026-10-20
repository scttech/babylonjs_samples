const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const ASSETS = "../assets/"; // the .glb pieces, shared by the Parkour Runner samples
const SKY_COLOR = "#9cc4e8"; // the sky, and the color distant things fade into
const FOG_DENSITY = 0.014;
const STREET_ROWS = 24; // how many road tiles long the street is
const SEED = 7; // the same seed gives the same street every load
const SPLASH_MIN_MS = 3000; // the splash stays at least this long, even if the street loads sooner


// The camera looks down the street from a bit above where the runner will be.
const CAMERA_HEIGHT = 3.4;
const CAMERA_PITCH = 0.14; // radians of tilt down
const CAMERA_FOV = 0.9;
const CAMERA_START_Z = -9;
const SCOUT_SPEED = 14; // world units per second


const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString(`${SKY_COLOR}FF`);

  // Fog fades far things into the sky color. It hides the end of the street
  // and makes the world feel bigger than it is.
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogColor = BABYLON.Color3.FromHexString(SKY_COLOR);
  scene.fogDensity = FOG_DENSITY;

  // A perspective camera (things in the distance get smaller), unlike the
  // orthographic one the earlier series used. FreeCamera's rotation.x tips it
  // downward; rotation.y stays 0, so it looks straight down +z.
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, CAMERA_HEIGHT, CAMERA_START_Z), scene);
  camera.rotation.x = CAMERA_PITCH;
  camera.fov = CAMERA_FOV;
  camera.minZ = 0.1;
  camera.maxZ = 400;
  scene.activeCamera = camera;

  // A soft light from the sky fills in the shadows; a stronger one from above
  // and ahead gives every building a bright side and a dark side.
  const sky = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  sky.intensity = 0.75;
  sky.groundColor = BABYLON.Color3.FromHexString("#5a6270");
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.5, -1, 0.45), scene);
  sun.intensity = 0.85;

  // Work out the street, load each piece it uses once, then put copies in place.
  const layout = streetLayout({ rows: STREET_ROWS, random: seededRandom(SEED) });
  const library = new PieceLibrary(scene, { baseUrl: ASSETS, scale: WORLD_SCALE });
  await library.load(piecesUsed(layout));
  for (const placement of layout) library.place(placement.piece, placement);

  // The last road tile is centered on firstZ + (STREET_ROWS - 1) * TILE; stop
  // short of the far end so the view never runs out of street.
  const lastRoadZ = -TILE + (STREET_ROWS - 1) * TILE;
  const scout = new Scout({ z: CAMERA_START_Z, min: CAMERA_START_Z, max: lastRoadZ - 40, speed: SCOUT_SPEED });

  const FORWARD_KEYS = new Set(["ArrowUp", "KeyW"]);
  const BACK_KEYS = new Set(["ArrowDown", "KeyS"]);
  const heldKeys = new Set();
  const isControlKey = (code) => FORWARD_KEYS.has(code) || BACK_KEYS.has(code);

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") {
      scout.reset();
      return;
    }
    if (!isControlKey(event.code)) return;
    event.preventDefault(); // arrow keys otherwise scroll the page
    heldKeys.add(event.code);
  });
  window.addEventListener("keyup", (event) => heldKeys.delete(event.code));
  window.addEventListener("blur", () => heldKeys.clear()); // don't get stuck walking after alt-tab

  const anyHeld = (keys) => [...heldKeys].some((code) => keys.has(code));

  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't launch the camera down the street.
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const direction = (anyHeld(FORWARD_KEYS) ? 1 : 0) - (anyHeld(BACK_KEYS) ? 1 : 0);
    scout.move(direction, dt);
    camera.position.z = scout.z;
  });

  return { scene };
};

const splash = document.getElementById("splash");
const splashStatus = document.getElementById("splash-status");
const shownAt = performance.now();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

createScene()
  .then(async ({ scene }) => {
    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener("resize", () => {
      engine.resize();
    });

    // The street is ready, drawing behind the splash. Keep the splash up for its
    // minimum time, then fade it out and take it away.
    await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent =
      "Something went wrong starting the game. If the 3D models didn't load: a page opened straight from a file " +
      "can't load them, so run a local web server (for example `npx serve` in the repo folder) and open the page " +
      "through that. The console has the details.";
  });
