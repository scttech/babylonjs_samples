const canvas = document.getElementById("renderCanvas");

// The canvas is see-through (`alpha`), so the sky is the page's own gradient, which the browser draws for free.
const engine = new BABYLON.Engine(canvas, true, { alpha: true });

// A phone's screen has two or three times as many pixels across as it seems to, and drawing every one is slow and hot. How many are
// drawn is the detail setting (see detail.js), which is chosen by the address, or by the player's last choice, or by the device;
// it is put into effect below, when the game starts.

const SPLASH_MIN_MS = 2500; // the splash stays at least this long, even if everything loads sooner

// Which map to play: the first, unless the address says `?map=1` (or 2, and so on, round the list). An address with `go=1` skips the
// title and begins at once, which is how a game is started again, or a different map is chosen.
const params = new URLSearchParams(window.location.search);

// The maps: the game's own, the ones that the player has made and kept, and one that came in a link (`?data=`, which is checked: a link can say
// anything). A map that came in a link is the one that is chosen.
const store = new MapStore(safeStorage(window));
const shared = params.get("data") ? decodeMap(params.get("data")) : null;
const kept = store.list();
const maps = [...MAPS, ...kept, ...(shared && shared.ok ? [{ ...shared.map, name: `${shared.map.name} (sent)` }] : [])];
const kinds = [...MAPS.map(() => "built-in"), ...kept.map(() => "kept"), ...(shared && shared.ok ? ["shared"] : [])];
const mapNumber = shared && shared.ok ? maps.length - 1 : (Number(params.get("map")) || 0) % maps.length;
const map = maps[mapNumber];

// Which screen the game is on, and the numbers of this game, and the best that the player has done (if the browser lets it be kept).
const flow = new Flow();
const stats = new Stats();
const records = new Records(safeStorage(window));
const preferences = new Preferences(safeStorage(window));
let detail = startingDetail({ query: params.get("detail"), stored: preferences.detail, touch: navigator.maxTouchPoints > 0 });
const speed = new GameSpeed();
const meter = new FrameMeter();

// The sound of the game: the effects, and the music that goes through the same volume. A browser makes no sound until the page has been
// touched, so they are begun by the first touch or key (see below).
const sound = new Sound();
const music = new Music(sound);
sound.muted = preferences.muted;

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
  const panel = new Panel({
    panel: document.getElementById("panel"),
    title: document.getElementById("panel-title"),
    level: document.getElementById("panel-level"),
    effect: document.getElementById("panel-effect"),
    upgrade: document.getElementById("panel-upgrade"),
    sell: document.getElementById("panel-sell"),
  });
  const hand = new Hand({
    canvas,
    tray,
    panel,
    stats,
    sound: (name) => sound.play(name),
    state,
    previews,
    outline: new Outline(scene),
    ring: new RangeRing(scene),
    extents: () => extents,
    make: (kind, col, row) => new Tower(scene, benders, kind, col, row),
  });
  // The hand only listens while the game is going: the title, the pause and the result are over the board.
  tray.onPress((kind, point) => flow.running && hand.press(kind, point));
  panel.onUpgrade(() => flow.running && hand.upgrade());
  panel.onSell(() => flow.running && hand.sell());
  window.addEventListener("pointermove", (event) => flow.running && hand.move(event));
  window.addEventListener("pointerup", (event) => flow.running && hand.release(event));
  window.addEventListener("pointercancel", () => hand.cancel());
 
  // The rules, and what shows them. The wave button starts the next wave early.
  const director = new Director();
  const hud = new Hud({
    lives: document.getElementById("lives"),
    wave: document.getElementById("wave"),
    next: document.getElementById("next-wave"),
  });
  hud.onStartWave(() => flow.running && director.callNext());

  // The screens. A different map, or a game again, is a new page, from the address.
  const screens = new Screens(
    {
      title: document.getElementById("title-screen"),
      pause: document.getElementById("pause-screen"),
      result: document.getElementById("result-screen"),
      pauseButton: document.getElementById("pause-button"),
      speedButton: document.getElementById("speed-button"),
    },
    document,
    maps,
    records,
    "../assets/images/tower_defense_logo_small.webp",
    kinds
  );
  screens.selectMap(mapNumber);
  const goTo = (number, go) => window.location.assign(gameUrl(window.location.href, number, go));
  screens.on("play", (number) => (number === mapNumber ? flow.start() : goTo(number, true)));
  screens.on("resume", () => flow.resume());
  screens.on("pause", () => flow.pause());
  screens.on("speed", () => {
    speed.cycle();
    scene.animationTimeScale = speed.value; // the enemies' walk and the benders' moves go as fast as the game does
    screens.setSpeed(speed.label);
  });
  screens.on("detail", () => setDetail(nextDetail(detail)));
  const toggleSound = () => {
    sound.setMuted(!sound.muted);
    preferences.muted = sound.muted;
    screens.setSound(!sound.muted);
  };
  screens.on("mute", toggleSound);
  screens.setSound(!sound.muted);

  // The first touch or key starts the sound (a browser only lets a page make a noise after the person has used it), and the music with it.
  const unlock = () => sound.start().then(() => music.start());
  for (const type of ["pointerdown", "keydown"]) window.addEventListener(type, unlock, { once: true });
  screens.on("restart", () => goTo(mapNumber, true));
  screens.on("menu", () => goTo(mapNumber, false));
  
  // Making a map, and changing or deleting one that was made. A map that was kept is edited by its id; one that was sent is edited as a copy.
  screens.on("make", () => window.location.assign("editor.html"));
  screens.on("edit", (number) => {
    const target = kinds[number] === "kept" ? `editor.html?edit=${kept[number - MAPS.length].id}` : shareUrl(window.location.href, maps[number], "editor.html");
    window.location.assign(target);
  });
  screens.on("delete", (number) => {
    if (!window.confirm(`Delete "${maps[number].name}"?`)) return;
    store.remove(kept[number - MAPS.length].id);
    goTo(0, false);
  });

  // Whatever the screen is, it is shown; and when the game ends, what it came to is worked out and put on the record.
  flow.onChange((now) => {
    scene.animationsEnabled = flow.running; // the enemies' walk and the benders' moves stop when the game does
    if (flow.over) {
      sound.play(now); // the sound of a win, or of a loss
      const total = director.waves.length;
      const stars = starsFor(now, director.lives, RULES.lives);
      const wave = now === "won" ? total : director.number;
      const improved = records.update(map.name, { stars, wave });
      screens.showResult({ result: now, stars, rows: summarize(stats, { wave, total, lives: director.lives, gold: state.wallet.earned }), improved });
    }
    if (!flow.running) {
      hand.cancel();
      meter.reset();
    }
    screens.show(now);
  });
  screens.show(flow.state);
  if (params.get("go")) flow.start();

  // P, and Escape when there is nothing in the hand to put down, pause and resume. So does leaving the page.
  window.addEventListener("keydown", (event) => {
    if (event.key === "m" || event.key === "M") toggleSound();
    if (event.key === "p" || event.key === "P") flow.toggle();
    if (event.key === "Escape") {
      if (flow.running && (hand.builder.holding || hand.selected)) hand.cancel();
      else flow.toggle();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flow.pause();
      music.suspend();
    } else {
      music.resume();
    }
  });

  // Everything moves every frame, by the time the frame took, capped at 0.05 seconds, so that a tab
  // that has been in the background doesn't make everything jump when it comes back. The frame of the game itself is
  // `advance`, which is given the world: the enemies and bolts so far, and how to make a new one.
  const clouds = buildClouds(scene, seededRandom(CLOUDS.seed));
  let comeOn = 0;

  // Puts a level of detail into effect: how many pixels are drawn, and whether the clouds are. A level that the player chose (or the game
  // chose for them) is remembered, and the frames are looked at afresh.
  const setDetail = (level, remember = true) => {
    detail = level;
    if (remember) preferences.detail = level;
    engine.setHardwareScalingLevel(scalingFor(level, window.devicePixelRatio));
    clouds.setVisible(DETAIL[level].clouds);
    screens.setDetail(DETAIL[level].name);
    meter.reset();
  };
  setDetail(detail, false);

  const world = {
    director,
    wallet: state.wallet,
    stats,
    towers: state.towers,
    enemies: [],
    bolts: [],
    spawn: (kind, healthScale) => new Enemy(scene, loaded, kind, route, `enemy ${++comeOn}`, healthScale),
    shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage, shot.effect, shot.potency, () => world.enemies),
    ended: (result) => flow.finish(result),
    sound: (name, detail) => sound.play(soundFor(name, detail)),
  };
  let clock = 0;

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    clock += dt;
    sound.update();
    music.update(dt, { flow: flow.state, phase: director.phase });
    if (flow.running) {
      const before = { phase: director.phase, index: director.index };
      for (const step of speed.steps(dt)) advance(world, step);
      // What the director did that has a sound: a wave begins, a wave is beaten (not the last, which is a win, and has a sound of its own).
      if (director.phase === "running" && before.phase !== "running") sound.play("wave");
      if (director.phase === "preparing" && director.index > before.index) sound.play("cleared");
      hand.update(dt);
      // A game that is slow lowers its own detail, once, and says so: a player who finds it slow need not find the setting.
      meter.add(dt);
      if (meter.slow && detail !== lowerDetail(detail)) {
        setDetail(lowerDetail(detail));
        hand.say("The game was running slowly, so the detail is lower.", 4);
      }
    }
    hud.show({ lives: director.lives, phase: director.phase, number: Math.min(director.number, director.waves.length), total: director.waves.length, countdown: director.countdown });
    clouds.update(dt);
    markers.forEach((marker) => marker.update(clock));
  });

  // Developer mode: sliders for the numbers of the game, with `?dev` in the address, and the ` key to show them and put them away.
  if (devEnabled(window.location.search)) {
    const devPanel = new DevPanel({ panel: document.getElementById("dev-panel") }, document);
    window.addEventListener("keydown", (event) => {
      if (event.key === "`") devPanel.toggle();
    });
    devPanel.toggle();
  }

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
