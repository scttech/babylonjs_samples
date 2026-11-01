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

// For now there is no wave: an enemy of each kind in turn comes on every few seconds and walks the
// road, so that you can see them. And there is no building: each map has four towers, one of each nation,
// beside the road, put there to shoot at them. (The next tutorial lets you build them.)
const DEMO = {
  gap: 2.5,
  order: ["grunt", "scout", "heavy", "dai_li", "spirit"],
  towers: [
    [
      { kind: "air", col: 4, row: 2 },
      { kind: "water", col: 8, row: 2 },
      { kind: "earth", col: 6, row: 4 },
      { kind: "fire", col: 6, row: 6 },
    ],
    [
      { kind: "air", col: 2, row: 4 },
      { kind: "water", col: 5, row: 4 },
      { kind: "earth", col: 8, row: 4 },
      { kind: "fire", col: 11, row: 4 },
    ],
  ],
};

const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0, 0, 0, 0); // see-through: the page's sky shows

  // An orthographic camera is given the edges of its view, in world units, and they have to be
  // worked out again whenever the screen changes shape: a phone turned on its side, a window resized.
  const camera = buildCamera(scene);
  const fitView = () => applyExtents(camera, viewExtents(boardPoints(), engine.getAspectRatio(camera)));
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
  const markers = [buildMarker(scene, "start", grid.start.col, grid.start.row), buildMarker(scene, "goal", grid.goal.col, grid.goal.row)];

  const loaded = await loadEnemies(scene);
  const route = routeFor(grid);

  // The towers. Each has to be in a place where one can be built (a mistake in the table says so, and stops).
  const benders = await loadBenders(scene);
  const places = DEMO.towers[mapNumber % DEMO.towers.length];
  places.forEach(({ col, row }, i) => {
    const { ok, reason } = canBuild(grid, col, row, places.slice(0, i));
    if (!ok) throw new Error(`A tower can't go at column ${col}, row ${row}: ${reason}.`);
  });
  const towers = places.map(({ kind, col, row }) => new Tower(scene, benders, kind, col, row));
  let bolts = [];

  // Everything moves every frame, by the time the frame took, capped at 0.05 seconds, so that a tab
  // that has been in the background doesn't make everything jump when it comes back.
  const clouds = buildClouds(scene, seededRandom(CLOUDS.seed));
  let enemies = [];
  let clock = 0;
  let sinceLast = DEMO.gap; // so that the first one comes on at once
  let comeOn = 0;
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    clock += dt;
    clouds.update(dt);
    markers.forEach((marker) => marker.update(clock));

    sinceLast += dt;
    if (sinceLast >= DEMO.gap) {
      sinceLast = 0;
      enemies.push(new Enemy(scene, loaded, DEMO.order[comeOn++ % DEMO.order.length], route, `enemy ${comeOn}`));
    }
    enemies.forEach((enemy) => enemy.update(dt));
    enemies = enemies.filter((enemy) => {
      if (!enemy.done) return true;
      enemy.dispose();
      return false;
    });

    // Every tower looks at the enemies, and throws a bolt at each one it shoots. The bolts fly until they arrive.
    for (const tower of towers) {
      for (const shot of tower.update(dt, enemies)) bolts.push(new Bolt(scene, shot.muzzle, shot.enemy, shot.color));
    }
    bolts.forEach((bolt) => bolt.update(dt));
    bolts = bolts.filter((bolt) => {
      if (!bolt.done) return true;
      bolt.dispose();
      return false;
    });

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
