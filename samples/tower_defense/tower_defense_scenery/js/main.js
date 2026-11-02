const canvas = document.getElementById("renderCanvas");

// The canvas is see-through (`alpha`), so the sky is the page's own gradient, which the browser draws for free.
const engine = new BABYLON.Engine(canvas, true, { alpha: true });

// A phone's screen has two or three times as many pixels across as it seems to, and drawing
// every one is slow and hot. Drawing at most twice as many as the page's units looks sharp
// and keeps the game smooth. (A hardware scaling level of 0.5 draws twice as many pixels.)
const MAX_PIXEL_RATIO = 2;
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

const SPLASH_MIN_MS = 2500; // the splash stays at least this long, even if everything loads sooner

// Which map to play: the first, unless the address says `?map=1` (or 2, and so on, round the list).
const mapNumber = Number(new URLSearchParams(window.location.search).get("map")) || 0;
const map = MAPS[mapNumber % MAPS.length];

// The game is waves of enemies. What comes when, and how many lives there are, is the director's: this file does
// what it says, and shows it.
const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // see-through: the page's sky shows

  // An orthographic camera is given the edges of its view, in world units, and they have to be
  // worked out again whenever the screen changes shape: a phone turned on its side, a window resized.
  const camera = buildCamera(scene);
  let extents;
  const fitView = () => {
    extents = viewExtents(boardPoints(), engine.getAspectRatio(camera));
    applyExtents(camera, extents);
  };

  fitView();
  engine.onResizeObservable.add(fitView);

  // A soft light from above, bluer than the sun, fills in the dark sides, and a warm one from the
  // front, high up on the left, gives everything a bright side and a dark one.
  const skyLight = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  skyLight.intensity = 0.65;
  skyLight.diffuse = new BABYLON.Color3(0.85, 0.92, 1);
  skyLight.groundColor = new BABYLON.Color3(0.45, 0.4, 0.35);
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.5, -1, 0.6), scene);
  sun.intensity = 0.85;
  sun.diffuse = new BABYLON.Color3(1, 0.95, 0.85);

  // A map that can't be played is no use, so say what is wrong with it, and stop.
  const grid = parseMap(map);
  const problems = [...mapProblems(map), ...pathProblems(grid)];
  if (problems.length) throw new Error(`The map "${map.name}" can't be played: ${problems.join("; ")}.`);

  const tiles = await loadTiles(scene);
  buildTiles(scene, tiles, (col, row) => pieceAt(grid, col, row));
  buildIsland(scene);
  const scenery = await loadProps(scene);
  buildProps(scene, scenery, grid);
  const markers = [buildMarker(scene, "start", grid.start.col, grid.start.row), buildMarker(scene, "goal", grid.goal.col, grid.goal.row)];

  const loaded = await loadEnemies(scene);
  const route = routeFor(grid);

  // Building. The towers and the gold are in `state`. A podium of each kind waits, out of sight, to be held over
  // the board while one is carried. The hand listens to the pointer and does the building.
  const benders = await loadBenders(scene);
  const state = { grid, towers: [], wallet: new Wallet() };
  const previews = {};
  for (const kind of Object.keys(BENDERS)) {
    previews[kind] = new Tower(scene, benders, kind, 0, 0, `preview ${kind}`);
    previews[kind].node.setEnabled(false);
  }
  const tray = new Tray(
    { tray: document.getElementById("tray"), gold: document.getElementById("gold-amount"), message: document.getElementById("message") },
    document
  );
  const hand = new Hand({
    canvas,
    tray,
    state,
    previews,
    outline: new Outline(scene),
    ring: new RangeRing(scene),
    extents: () => extents,
    make: (kind, col, row) => new Tower(scene, benders, kind, col, row),
  });
  tray.onPress((kind, point) => hand.press(kind, point));
  window.addEventListener("pointermove", (event) => hand.move(event));
  window.addEventListener("pointerup", (event) => hand.release(event));
  window.addEventListener("pointercancel", () => hand.cancel());
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hand.cancel();
  });

  
  // The rules, and what shows them. The wave button starts the next wave early, and Play again starts the whole game again.
  const director = new Director();
  const hud = new Hud({
    lives: document.getElementById("lives"),
    wave: document.getElementById("wave"),
    next: document.getElementById("next-wave"),
    banner: document.getElementById("banner"),
    title: document.getElementById("banner-title"),
    text: document.getElementById("banner-text"),
    again: document.getElementById("again"),
  });
  hud.onStartWave(() => director.callNext());
  hud.onAgain(() => window.location.reload());

  // Everything moves every frame, by the time the frame took, capped at 0.05 seconds, so that a tab
  // that has been in the background doesn't make everything jump when it comes back. The frame of the game itself is
  // `advance`, which is given the world: the enemies and bolts so far, and how to make a new one.
  const clouds = buildClouds(scene, seededRandom(CLOUDS.seed));
  let comeOn = 0;
  const world = {
    director,
    wallet: state.wallet,
    towers: state.towers,
    enemies: [],
    bolts: [],
    spawn: (kind, healthScale) => new Enemy(scene, loaded, kind, route, `enemy ${++comeOn}`, healthScale),
    shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage),
    ended: (result) => hud.banner(result),
  };
  let clock = 0;

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    clock += dt;
    advance(world, dt);
    hud.show({ lives: director.lives, phase: director.phase, number: Math.min(director.number, director.waves.length), total: director.waves.length, countdown: director.countdown });
    hand.update(dt);
    clouds.update(dt);
    markers.forEach((marker) => marker.update(clock));

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

    // The board is ready, drawing behind the splash. Keep the splash up for its minimum
    // time, then fade it out and take it away.
    await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
    splash.classList.add("hidden");
    setTimeout(() => splash.remove(), 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent =
      "Something went wrong starting the game. The models are loaded from files, so the page has to be " +
      "opened through a web server (for example `npx serve` in the repo folder), and Babylon.js comes from " +
      "the internet, so check your connection. The console has the details.";
  });
