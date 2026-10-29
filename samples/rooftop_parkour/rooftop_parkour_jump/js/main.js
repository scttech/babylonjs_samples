const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// A phone's screen has two or three times as many pixels across as it seems to, and drawing every one is slow and hot. Drawing at most
// twice as many as the page's units looks sharp and keeps the game smooth.
const MAX_PIXEL_RATIO = 2;
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

const ASSETS = "../assets/";
const SPLASH_MIN_MS = 1200; // the loading screen stays at least this long, even if everything loads sooner
const FOG_DENSITY = 0.004; // how quickly far things fade into the haze
const SHADOWS = { size: 2048, cascades: 3, distance: 180 }; // the sun's shadows: how sharp, in how many steps of distance, and how far
const START = { x: 0, z: -9, heading: 0 }; // where the runner begins: on the road, just south of the middle junction, facing north
const RUNNER_TURN = 0; // how far the runner's model is turned from the way the scout faces, if the file faces another way
const RUNNER_KB = 3000; // how much of the waiting the runner is (the character files are about this big)
const READY_KB = 600; // and the last step, when the graphics card gets everything ready

let started = false; // the district is drawn behind the loading screen, but nothing moves until it has gone

const createScene = async (progress) => {
  const scene = new BABYLON.Scene(engine);

  // Fog fades far things into the colour of the horizon, which hides the end of the district and makes the world feel bigger than it
  // is. The colour is set with the time of day, below.
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = FOG_DENSITY;

  // A perspective camera that follows the runner. (The mouse turns it: see OrbitCamera.)
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 3, START.z - 6), scene);
  camera.fov = LOOK.fov;
  camera.minZ = 0.5; // the nearer and the further the camera sees, the less exact the depth buffer is, and the more things that are close together flicker
  camera.maxZ = 1000;
  scene.activeCamera = camera;
  const orbit = new OrbitCamera(camera, { yaw: START.heading });

  // The sky is a box with a material that works out the colour of the sky for where the sun is. Two lights: the sun, which shines in
  // one direction and makes shadows, and the sky's own, a soft light from above that fills in what the sun doesn't reach. Sky works
  // out what they should be for the hour, and sets them.
  const skyMaterial = new BABYLON.SkyMaterial("sky", scene);
  skyMaterial.backFaceCulling = false;
  skyMaterial.turbidity = 6;
  const skybox = BABYLON.MeshBuilder.CreateBox("skybox", { size: 1000 }, scene);
  skybox.material = skyMaterial;
  skybox.infiniteDistance = true;
  skybox.applyFog = false;
  skybox.isPickable = false;
  const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, 0), scene);
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0, -1, 0), scene);
  const sky = new Sky(scene, { sun, ambient, dome: skyMaterial });

  // Shadows from the sun, in steps ("cascades"): sharp ones near the camera, coarser ones further away, so that a district this big
  // still has crisp shadows round the runner.
  const shadows = new BABYLON.CascadedShadowGenerator(SHADOWS.size, sun);
  shadows.numCascades = SHADOWS.cascades;
  shadows.shadowMaxZ = SHADOWS.distance;
  shadows.stabilizeCascades = true;
  shadows.usePercentageCloserFiltering = true;
  shadows.bias = 0.002;

  // The ground: a plane of concrete under each block, and a dark one under everything, out to the horizon.
  const concrete = new BABYLON.StandardMaterial("concrete", scene);
  concrete.diffuseTexture = new BABYLON.Texture(`${ASSETS}city/textures/T_Concrete_BaseColor.webp`, scene);
  concrete.specularColor = BABYLON.Color3.Black();
  for (const box of blockBoxes()) {
    const size = box.maxX - box.minX;
    const ground = BABYLON.MeshBuilder.CreateGround(`block-${box.key}`, { width: size, height: size }, scene);
    ground.position.set((box.minX + box.maxX) / 2, 0, (box.minZ + box.maxZ) / 2);
    const material = concrete.clone(`concrete-${box.key}`);
    material.diffuseTexture = concrete.diffuseTexture.clone();
    material.diffuseTexture.uScale = size / 6;
    material.diffuseTexture.vScale = size / 6;
    ground.material = material;
    ground.receiveShadows = true;
    ground.freezeWorldMatrix();
  }
  const outside = BABYLON.MeshBuilder.CreateGround("outside", { width: 3000, height: 3000 }, scene);
  outside.position.y = -0.16;
  const dark = new BABYLON.StandardMaterial("outside", scene);
  dark.diffuseColor = BABYLON.Color3.FromHexString("#3d4048");
  dark.specularColor = BABYLON.Color3.Black();
  outside.material = dark;
  outside.receiveShadows = true;

  // Work out which pieces the plan needs, tell the loading screen about every one of them (so the bar knows how much there is to wait
  // for from the start, and never goes backwards when more turns up), then load each once and put copies in place.
  progress.add("runner", RUNNER_KB);
  progress.add("ready", READY_KB);
  for (const name of piecesUsed()) progress.add(name, pieceWeight(name));
  const library = new PieceLibrary(scene, { baseUrl: `${ASSETS}city/`, progress });
  await library.load(piecesUsed());
  for (const template of library.templates.values()) for (const mesh of template.getChildMeshes()) mesh.receiveShadows = true;

  const placeAll = (placements, castsShadow) => {
    for (const placement of placements) {
      const copy = library.place(placement.piece, placement);
      for (const mesh of copy.getChildMeshes()) {
        if (castsShadow) shadows.addShadowCaster(mesh);
        mesh.freezeWorldMatrix(); // nothing here ever moves
      }
    }
  };
  const glass = [...new Set([...library.templates.values()].flatMap((template) => template.getChildMeshes().map((mesh) => mesh.material)).filter((material) => material && /glass/i.test(material.name)))]; // for the panel
  placeAll(streetPlacements(), false);
  placeAll(buildingPlacements(), true);

  // The world the body lives in: every building as a box, to keep out of, to stand on the roof of, and for the camera to keep out of too,
  // the raised edges of the roofs, and the ground. The body is a Controller: it runs, steps, falls and lands in that world.
  const boxes = buildingBoxes();
  const ledges = ledgeBoxes();
  const rims = rimBoxes();
  orbit.boxes = [...boxes, ...ledges];
  const world = new World({ boxes: [...boxes, ...ledges, ...rims], ground: (x, z) => groundHeight(x, z) });
  const body = new Controller({ ...START, world, bounds: districtBounds() });

  // The runner. Both characters can be loaded; the one in use is the one that is shown.
  const runners = {};
  let runner = null;
  let player = null;
  const useRunner = async (kind, onProgress) => {
    if (!runners[kind]) {
      const loaded = await loadRunner(scene, `${ASSETS}character/`, kind, onProgress);
      loaded.player = new ClipPlayer(loaded.clips);
      for (const mesh of loaded.meshes) shadows.addShadowCaster(mesh);
      runners[kind] = loaded;
    }
    for (const [name, other] of Object.entries(runners)) other.root.setEnabled(name === kind);
    runner = runners[kind];
    player = runner.player;
    if (player.current === null) player.play(CLIPS.idle);
  };
  await useRunner("male", (event) => {
    if (event.lengthComputable && event.total > 0) progress.update("runner", (event.loaded / event.total) * 0.95);
  });
  progress.complete("runner");

  // The keys. Arrow keys would scroll the page, so the ones the runner uses are taken for the game.
  const heldKeys = new Set();
  const look = new PointerLook(canvas, document, (locked) => document.body.classList.toggle("looking", locked));
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR") body.reset();
    if (!ALL_MOVE_KEYS.has(event.code) || typesText(event)) return;
    event.preventDefault();
    heldKeys.add(event.code);
  });
  window.addEventListener("keyup", (event) => heldKeys.delete(event.code));
  window.addEventListener("blur", () => heldKeys.clear()); // don't get stuck running after alt-tab

  // Each frame: the mouse turns the camera, the keys move the body, and the runner and the camera go where the body is.
  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't launch the runner across the district.
    const dt = started ? Math.min(engine.getDeltaTime() / 1000, 0.05) : 0;
    const turned = look.take();
    if (started) orbit.look(turned.dx, turned.dy);

    const input = moveInput(heldKeys);
    body.update(started ? moveDirection(input, orbit.yaw) : null, input.sprint, dt, started && input.jump);

    runner.root.position.set(body.x, body.y, body.z);
    runner.root.rotation.y = body.heading + RUNNER_TURN;
    const clip = clipForBody(body);
    player.play(clip.name, clip.rate, clip.loop);
    player.update(dt);
    orbit.follow({ x: body.x, y: body.y, z: body.z });
  });

  // Developer mode, with ?dev on the end of the address: a panel to watch and change things while the game runs. The key under Esc
  // hides it, and its title bar folds it up (it starts folded up on a small screen).
  let panel = null;
  if (devEnabled(location.search)) {
    let roofNumber = 0; // which roof the button takes the runner to next
    const debugBoxes = new DebugBoxes(scene, [...boxes, ...ledges, ...rims]);
    const debugLabels = new DebugLabels(scene, boxes.map((box) => ({ ...box, name: BUILDINGS[box.name].file })));
    panel = new DevPanel(
      document,
      [
        {
          title: "Time and light",
          rows: [
            control("hour", () => sky.hour, (value) => sky.setHour(value), HOURS.min, HOURS.max, 0.05),
            readout("clock", () => formatHour(sky.hour)),
            control("sun strength", () => sky.sunStrength, (value) => { sky.sunStrength = value; sky.setHour(sky.hour); }, 0, 2),
            control("fog", () => scene.fogDensity, (value) => { scene.fogDensity = value; }, 0, 0.02, 0.0005),
            toggle("shadows", () => sun.shadowEnabled, (value) => { sun.shadowEnabled = value; }),
          ],
        },
        {
          title: "Camera",
          rows: [
            slider("distance", orbit, "distance", 1.5, 14, 0.1),
            slider("height", orbit, "height", 0.5, 3, 0.05),
            control("field of view", () => camera.fov, (value) => { camera.fov = value; }, 0.4, 1.6),
            slider("look speed", orbit, "sensitivity", 0.0005, 0.008, 0.0001),
            toggle("invert up/down", () => orbit.invert, (value) => { orbit.invert = value; }),
          ],
        },
        {
          title: "Runner",
          rows: [
            slider("jog speed", body.options, "jogSpeed", 1, 10, 0.1),
            slider("sprint speed", body.options, "sprintSpeed", 2, 14, 0.1),
            slider("gravity", body.options, "gravity", 0, 80, 1),
            slider("jump speed", body.options, "jumpSpeed", 2, 16, 0.5),
            slider("jump cut speed", body.options, "jumpCutSpeed", 0, 8, 0.5),
            slider("coyote time", body.options, "coyoteTime", 0, 0.4, 0.01),
            slider("jump buffer", body.options, "jumpBuffer", 0, 0.4, 0.01),
            slider("step height", body.options, "stepHeight", 0.1, 1.5, 0.05),
            action("Go to a roof", () => {
              const spot = roofSpot(boxes[roofNumber++ % boxes.length]);
              body.placeAt(spot.x, spot.y + 0.05, spot.z);
            }),
            action("Switch runner", () => useRunner(runner === runners.male ? "female" : "male")),
            action("Back to the start", () => body.reset()),
          ],
        },
        {
          title: "World",
          rows: [
            toggle("window glass", () => glass[0].alpha > 0, (value) => glass.forEach((material) => { material.alpha = value ? 1 : GLASS_ALPHA; })),
            toggle("building boxes", () => debugBoxes.visible, (value) => debugBoxes.setVisible(value)),
            toggle("building names", () => debugLabels.visible, (value) => debugLabels.setVisible(value)),
            readout("position", () => `${body.x.toFixed(1)}, ${body.z.toFixed(1)}`),
            readout("height", () => `${body.y.toFixed(2)} m`),
            readout("speed", () => `${body.speed.toFixed(1)} m/s`),
            readout("on the ground", () => (body.grounded ? "yes" : `no (${body.vy.toFixed(1)} m/s)`)),
            readout("jump height", () => `${jumpHeight(body.options).toFixed(1)} m`),
            readout("jog jump reach", () => `${jumpDistance(body.options.jogSpeed, body.options).toFixed(1)} m`),
            readout("sprint jump reach", () => `${jumpDistance(body.options.sprintSpeed, body.options).toFixed(1)} m`),
            readout("clip", () => player.current),
            readout("mouse", () => (look.locked ? "locked" : "free")),
            readout("frames", () => `${engine.getFps().toFixed(0)} fps`),
          ],
        },
      ],
      { collapsed: window.matchMedia("(max-height: 520px), (max-width: 640px)").matches, clipboard: navigator.clipboard }
    );
    document.body.appendChild(panel.root);
    window.addEventListener("keydown", (event) => {
      if (event.code === DEV_KEY && !event.repeat && !typesText(event)) panel.toggleShown();
    });
    scene.onAfterRenderObservable.add(() => panel.refreshReadouts());
    window.dev = { scene, body, world, sky, orbit, panel, look, shadows }; // for poking at from the console
  }

  // The last step of loading: the graphics card gets the shaders and textures ready.
  await scene.whenReadyAsync();
  progress.complete("ready");
  return { scene };
};

const splash = new Splash(document);
const progress = new LoadProgress();
const shownAt = performance.now();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The bar on the loading screen glides toward how much has really loaded, so it doesn't jump when a big building arrives.
let shown = 0;
let lastTick = performance.now();
const tickSplash = (now) => {
  const dt = Math.min(0.1, (now - lastTick) / 1000);
  lastTick = now;
  shown = easeToward(shown, progress.fraction, dt);
  splash.setProgress(shown);
  const busy = progress.busy;
  splash.setStatus(`${formatPercent(shown)}${busy && !progress.done ? `  ·  ${busy.replace(/_/g, " ")}` : ""}`);
  if (!splash.finished) requestAnimationFrame(tickSplash);
};
requestAnimationFrame(tickSplash);

createScene(progress)
  .then(async ({ scene }) => {
    engine.runRenderLoop(() => {
      scene.render();
    });
    window.addEventListener("resize", () => {
      engine.resize();
    });

    // The district is ready, drawing behind the loading screen. Let the bar reach the end, and keep the screen up for its minimum
    // time, then fade it out and take it away.
    while (shown < 0.995) await delay(40);
    await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
    splash.hide();
    started = true;
    setTimeout(() => {
      splash.finished = true;
      splash.remove();
    }, 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splash.finished = true;
    splash.fail(
      "Something went wrong starting the game. If the 3D models didn't load: a page opened straight from a file " +
        "can't load them, so run a local web server (for example `npx serve` in the repo folder) and open the page " +
        "through that. The console has the details."
    );
  });
