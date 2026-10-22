const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const ASSETS = "../assets/"; // the .glb pieces, shared by the Parkour Runner samples
const SKY_COLOR = "#9cc4e8"; // the sky, and the color distant things fade into
const FOG_DENSITY = 0.014;
const SEED = 7; // the same seed gives the same street every load
const SPLASH_MIN_MS = 3000; // the splash stays at least this long, even if the street loads sooner


// The camera follows the runner, a little above and behind, looking down the street.
const CAMERA_PITCH = 0.12; // radians of tilt down
const CAMERA_FOV = 0.9;

// The runner, who is made from the character file that holds its animation clips.
// The model comes out of the file already facing down the street (+z).
const RUNNER_FILE = "character/runner.glb";
const RUNNER_START_Z = 0;
const LIFT_RATE = 14; // how quickly the model eases up and down for a slide; bigger is snappier
const PITCH_RATE = 14; // and how quickly it leans forward for a vault


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
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, CAMERA_HEIGHT, RUNNER_START_Z - CAMERA_DISTANCE), scene);
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
  const library = new PieceLibrary(scene, { baseUrl: ASSETS, scale: WORLD_SCALE });
  await library.load([...STREET_PIECES, ...OBSTACLE_PIECES]);

  // The street is never built all at once: the stream says which pieces should
  // exist for where the runner is, and the pool makes them, or reuses pieces that
  // fell behind. `nodes` remembers which piece in the world is which in the stream.
  const stream = new StreetStream({ seed: SEED });
  const pool = new PiecePool(library);
  const nodes = new Map();

  const buildStreet = (z) => {
    const { added, removed } = stream.update(z);
    for (const piece of removed) release(piece);
    for (const piece of added) nodes.set(piece.id, pool.acquire(piece.piece, piece));
  };
  const release = (piece) => {
    pool.release(piece.piece, nodes.get(piece.id));
    nodes.delete(piece.id);
  };

  // The obstacles are made the same way as the street, from the same pool, but they
  // have their own ids, so they are remembered in a separate map.
  const field = new ObstacleField({ seed: SEED });
  const obstacleNodes = new Map();

  const buildObstacles = (z) => {
    const { added, removed } = field.update(z);
    for (const obstacle of removed) releaseObstacle(obstacle);
    for (const obstacle of added) obstacleNodes.set(obstacle.id, pool.acquire(obstacle.piece, obstacle));
  };
  const releaseObstacle = (obstacle) => {
    pool.release(obstacle.piece, obstacleNodes.get(obstacle.id));
    obstacleNodes.delete(obstacle.id);
  };

  // A message over the picture, for when the runner crashes.
  const message = document.getElementById("message");

  // The runner: loaded once, and standing at the start of the street.
  const character = await loadCharacter(scene, `${ASSETS}${RUNNER_FILE}`, { name: "runner" });
  const clips = new ClipPlayer(character.clips);

  const runner = new Runner({ z: RUNNER_START_Z });
  let lift = 0; // how far the model is raised above the runner right now
  let pitch = 0; // and how far it is leaning forward
  let vaultQueued = false; // a jump pressed a little early for a barrier: it vaults when it is close enough
  buildStreet(runner.z); // so there is a street to see from the very first frame
  buildObstacles(runner.z);

  const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
  const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
  const JUMP_KEYS = new Set(["ArrowUp", "KeyW", "Space"]);
  const SLIDE_KEYS = new Set(["ArrowDown", "KeyS"]);

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") {
      runner.reset();
      for (const piece of stream.reset()) release(piece); // the street starts again too
      for (const obstacle of field.reset()) releaseObstacle(obstacle); // and the obstacles
      message.classList.add("hidden");
      vaultQueued = false;
      return;
    }

    const isControl = [LEFT_KEYS, RIGHT_KEYS, JUMP_KEYS, SLIDE_KEYS].some((keys) => keys.has(event.code));
    if (!isControl) return;
    event.preventDefault(); // arrow keys and the space bar otherwise scroll the page
    if (event.repeat) return; // one move per press; holding the key doesn't repeat it

    if (LEFT_KEYS.has(event.code)) runner.moveLane(-1);
    else if (RIGHT_KEYS.has(event.code)) runner.moveLane(1);
        else if (JUMP_KEYS.has(event.code)) {
      // Next to a barrier, a jump is a vault: a quick, low hop over it. A little
      // further back, the vault waits until the barrier is close enough.
      const gap = field.barrierGap(runner);
      if (gap <= VAULT_RANGE) runner.vault();
      else if (gap <= VAULT_QUEUE_RANGE) vaultQueued = true;
      else runner.jump();
    } else runner.slide();
  });

  // Our frame loop
  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't throw the runner down the street.
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    runner.update(dt);
    buildStreet(runner.z);
    buildObstacles(runner.z);

    // A vault that was waiting for the barrier to come close enough. It stops
    // waiting if the barrier is gone: he changed lanes, or he is past it.
    if (vaultQueued) {
      const gap = field.barrierGap(runner);
      if (gap <= VAULT_RANGE) {
        runner.vault();
        vaultQueued = false;
      } else if (gap === Infinity) {
        vaultQueued = false;
      }
    }

    // Running into something ends the run.
    if (!runner.crashed && field.hit(runner)) {
      runner.crash();
      message.classList.remove("hidden");
    }

    // Put the character where the runner is, turned a little into a lane change,
    // and playing the clip for what it is doing.
    lift = approach(lift, liftFor(runner), LIFT_RATE, dt);
    character.root.position.set(runner.x, runner.y + lift, runner.z);
    pitch = approach(pitch, pitchFor(runner), PITCH_RATE, dt);
    character.root.rotation.x = pitch;
    character.root.rotation.y = runner.heading;
    const clip = clipFor(runner);
    clips.play(clip.name, clip);

    // And the camera behind it.
    const view = followPosition(runner);
    camera.position.set(view.x, view.y, view.z);
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
