const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// A phone's screen has two or three times as many pixels across as it seems to, and drawing
// every one is slow and hot. Drawing at most twice as many as the page's units looks sharp
// and keeps the game smooth. (A hardware scaling level of 0.5 draws twice as many pixels.)
const MAX_PIXEL_RATIO = 2;
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

const BACKGROUND = "#161b26"; // dark blue-steel, so the chrome marble and the yellow edges stand out
const SPLASH_MIN_MS = 3000; // the splash stays at least this long, even if everything loads sooner

const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString(`${BACKGROUND}FF`);

  // Physics first: the course and the marble are bodies in it.
  await loadPhysics(scene);

  // The physics moves with every frame that is drawn, and frames are drawn behind the splash
  // while the game loads, so the marble would be halfway down the ramp by the time anyone
  // saw it. Hold the world still until the splash has gone.
  scene.physicsEnabled = false;

  // An orthographic camera (no perspective) looking down from a corner. It is an ArcRotateCamera,
  // which sits on a sphere around a target, so "from a corner, tipped down" is just two angles.
  // It isn't attached to the mouse or touch: the player doesn't move the view.
  const camera = new BABYLON.ArcRotateCamera("camera", ISO_ALPHA, ISO_BETA, CAMERA_RADIUS, BABYLON.Vector3.Zero(), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 1;
  camera.maxZ = 200;
  scene.activeCamera = camera;

  // An orthographic camera is given the edges of its view, in world units, and they have to be
  // worked out again whenever the screen changes shape: a phone turned on its side, a window resized.
  const fitView = () => {
    const { halfWidth, halfHeight } = viewHalfExtents(engine.getAspectRatio(camera));
    camera.orthoLeft = -halfWidth;
    camera.orthoRight = halfWidth;
    camera.orthoBottom = -halfHeight;
    camera.orthoTop = halfHeight;
  };
  fitView();

  // A soft light from above fills in the dark sides, and a stronger one from a corner gives
  // every slab a bright side and a dark one, and lets the marble cast a shadow, which is how you
  // see how high above a floor it is.
  const sky = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  sky.intensity = 0.75;
  sky.groundColor = new BABYLON.Color3(0.17, 0.2, 0.28);
  sky.diffuse = new BABYLON.Color3(0.82, 0.88, 1); // a cool light from above, like the logo's sky
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.6, -1, -0.45), scene);
  sun.intensity = 0.9;
  sun.diffuse = new BABYLON.Color3(1, 0.94, 0.82); // and a warm one from the corner, like the factory glow

  // Shadows are drawn into a picture of the scene as the sun sees it, and that picture only covers
  // a square of the world, SHADOW_AREA wide. Covering the whole course would make every shadow a
  // blur, so the square is kept around the marble: the sun is moved with it every frame (below).
  sun.shadowFrustumSize = SHADOW_AREA;
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = SUN_DISTANCE * 2;
  const shadows = new BABYLON.ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true; // soft edges, without the artifacts of the cheaper kinds
  shadows.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.001; // stops a surface shadowing itself

    // The level: a grid of heights, made into a mesh for the marble to roll on. Going on to the next
  // level takes this one away and builds another in its place, so `level` is changed, not made once.
  let levelIndex = 0;
  let level = buildLevel(scene, LEVELS[levelIndex]);
  const marble = new Marble(scene, { start: levelStart(level.grid) });
  shadows.addShadowCaster(marble.mesh);

  // Steering: the keys, and a thumb on the screen. Each makes a stick, and the game adds them.
  const keyboard = new KeyboardInput(window);
  const thumb = new StickControls(canvas, {
    ring: document.getElementById("stick-ring"),
    knob: document.getElementById("stick-knob"),
  });

  // And a third kind of stick: the tilt of the phone. It starts off, because it has to be asked
  // for (see below), and has a button, a line of words about how it is going, and a gauge.
  const tilt = new TiltInput();
  const tiltToggle = document.getElementById("tilt-toggle");
  const tiltLevel = document.getElementById("tilt-level");
  const tiltStatus = document.getElementById("tilt-status");
  const tiltGauge = document.getElementById("tilt-gauge");
  const tiltDot = document.getElementById("tilt-dot");

  // Make the words and buttons say what tilt is doing. The state changes when the player answers a
  // question, when the first reading arrives, and when there is no sensor, so this is run every frame.
  let shownState = null;
  const showTiltState = () => {
    if (tilt.state === shownState) return;
    shownState = tilt.state;
    tiltToggle.textContent = tilt.active ? "Tilt: on" : "Tilt: off";
    tiltLevel.classList.toggle("hidden", tilt.state !== "ready");
    tiltGauge.classList.toggle("hidden", tilt.state !== "ready");
    tiltStatus.textContent = TILT_MESSAGES[tilt.state];
  };
  showTiltState();

  // It must be switched on from a tap: an iPhone only asks the player for permission to use the
  // sensors when a page asks because of one.
  tiltToggle.addEventListener("click", async () => {
    tiltToggle.blur();
    if (tilt.active) tilt.disable();
    else await tilt.enable();
  });
  tiltLevel.addEventListener("click", () => {
    tiltLevel.blur();
    tilt.calibrate();
  });
  // Turning the phone on its side changes how it is held, so what was level isn't any more.
  if (screen.orientation) screen.orientation.addEventListener("change", () => tilt.calibrate());

  // Rolling again: R on a keyboard, and a button for a screen with no keys.
  const dropAgain = () => marble.reset();
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR" && !event.repeat) dropAgain();
  });
  const dropButton = document.getElementById("drop");
  dropButton.addEventListener("click", () => {
    dropButton.blur();
    dropAgain();
  });

  // The next level: take this one away, build the next (the last one is followed by the first), and
  // start the marble at its start. The camera is put at the marble too, or it would glide across
  // from the old level.
  let focus = { ...marble.start };
  const levelName = document.getElementById("level-name");
  levelName.textContent = level.grid.name;
  const nextLevel = () => {
    level.dispose();
    levelIndex = (levelIndex + 1) % LEVELS.length;
    level = buildLevel(scene, LEVELS[levelIndex]);
    marble.start = levelStart(level.grid);
    marble.reset();
    focus = { ...marble.start };
    levelName.textContent = level.grid.name;
  };
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyN" && !event.repeat) nextLevel();
  });
  const nextButton = document.getElementById("next-level");
  nextButton.addEventListener("click", () => {
    nextButton.blur();
    nextLevel();
  });

  // Each frame: read the tilt, steer the marble, put it back if it fell off the level, keep the
  // sun over it, and ease the camera after it.
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);

    // The tilt: ease its stick toward where the phone is tipped, keep the words and the gauge
    // up to date, and move the gauge's dot (18 pixels is as far as it can go from the middle).
    tilt.update(dt);
    showTiltState();
    tiltDot.style.transform = `translate(${tilt.stick.x * 18}px, ${-tilt.stick.y * 18}px)`;

    // The stick, as it is seen on the screen, turned into a direction in the world (by the
    // camera's own angle) and into a push. Not before the splash has gone: a push is a change
    // of speed that happens at once, so it would load the marble up while the world is held still.
    if (scene.physicsEnabled) {
      const stick = combineSticks(combineSticks(keyboard.stick, thumb.value), tilt.stick);
      marble.push(worldDirection(stick, camera.alpha));
    }

    if (hasFallen(marble.position.y, fallLimit(level.grid))) dropAgain();
    const sunAt = sunPosition(marble.position, sun.direction, SUN_DISTANCE);
    sun.position.set(sunAt.x, sunAt.y, sunAt.z);
    focus = follow(focus, marble.position, FOLLOW_RATE, dt);
    camera.target.set(focus.x, focus.y, focus.z);
  });

  engine.onResizeObservable.add(fitView);

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

    // The world is ready, drawing behind the splash. Keep the splash up for its minimum
    // time, then fade it out and take it away.
    await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
    splash.classList.add("hidden");
    scene.physicsEnabled = true; // and now the marble can drop
    setTimeout(() => splash.remove(), 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent =
      "Something went wrong starting the game. The physics engine is loaded from the internet, so check " +
      "your connection, and that the page is opened through a web server (for example `npx serve` in the " +
      "repo folder). The console has the details.";
  });
