const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const ASSETS = "../assets/"; // the .glb pieces, shared by the Parkour Runner samples
const SKY_COLOR = "#9cc4e8"; // the sky, and the color distant things fade into
const FOG_DENSITY = 0.014;
const SEED = 7; // the same seed gives the same street every load
const SPLASH_MIN_MS = 3000; // the splash stays at least this long, even if the street loads sooner
let started = false; // the splash has gone, so the game can be played
const CRASH_PAUSE_MS = 1200; // after a crash, how long the runner is left to fall before the game over screen


// The camera follows the runner, a little above and behind, looking down the street.
const CAMERA_PITCH = 0.12; // radians of tilt down
const CAMERA_FOV = 0.9;

// The runner, who is made from the character file that holds its animation clips.
// The model comes out of the file already facing down the street (+z).
const RUNNER_FILE = "character/runner.glb";
const RUNNER_START_Z = 0;
const LIFT_RATE = 14; // how quickly the model eases up and down for a slide; bigger is snappier
const PITCH_RATE = 14; // and how quickly it leans forward for a vault

// The fonts are files the browser loads only when text first needs them, and a GUI label
// draws its text once, so ask for them now and wait, or the score would be drawn in a plain
// font. (If a font can't be loaded the game carries on without it.)
const loadFonts = () => Promise.all([FONT_TITLE, FONT_SMALL].map((font) => document.fonts.load(`32px "${font}"`))).catch(() => {});

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
  // A coin is a piece too, and is given back to the pool the same way once it is picked up.
  const releaseCoin = (coin) => {
    pool.release(coin.piece, obstacleNodes.get(coin.id));
    obstacleNodes.delete(coin.id);
  };


  // Who is playing, the best scores so far, what the game is doing (the title, a run, a
  // pause, the end of a run), and the screens that go with each.
  const profile = new Profile();
  const leaderboard = new Leaderboard();
  const game = new Game();
  const screens = new Screens(document);

  // The score, and the heads-up display that shows it: text drawn over the picture by
  // Babylon.js GUI, in the game's fonts.
  const score = new Score();
  await loadFonts();
  const hud = new Hud({ ui: BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("hud", true, scene) });

  // The runner: loaded once, and standing at the start of the street.
  const character = await loadCharacter(scene, `${ASSETS}${RUNNER_FILE}`, { name: "runner" });
  const clips = new ClipPlayer(character.clips);

  const runner = new Runner({ z: RUNNER_START_Z });
  let lift = 0; // how far the model is raised above the runner right now
  let pitch = 0; // and how far it is leaning forward
  let vaultQueued = false; // a jump pressed a little early for a barrier: it vaults when it is close enough
  buildStreet(runner.z); // so there is a street to see from the very first frame
  buildObstacles(runner.z);

  let spin = 0; // how far the coins have turned
  let overTimer = 0; // the wait for the runner to fall, before the game over screen

  // Shows the screen for what the game is doing. The score has no place on the title.
  const showScreen = () => {
    screens.show(game.state);
    hud.setVisible(game.state !== STATES.title);
  };

  // The runner is painted in the color that was chosen last time, and the title screen
  // shows the choices. Picking a color paints the runner at once, so he is the preview.
  tintRunner(character.root, colorById(profile.color));
  screens.setName(profile.name);
  screens.setBest(leaderboard.entries[0] || null);
  screens.renderSwatches(RUNNER_COLORS, profile.color, (id) => {
    profile.color = id;
    tintRunner(character.root, colorById(id));
  });
  showScreen();

  // Puts everything back at the start of the street: the runner, the street, the
  // obstacles and the score.
  const resetRun = () => {
    clearTimeout(overTimer);
    runner.reset();
    for (const piece of stream.reset()) release(piece); // the street starts again too
    for (const obstacle of field.reset()) releaseObstacle(obstacle); // and the obstacles
    vaultQueued = false;
    score.reset();
    hud.update(score);
  };

  const startRun = () => {
    resetRun();
    game.start();
    showScreen();
  };

  // The Play button, or Enter on the title: remember who is playing, then run.
  const playFromTitle = () => {
    if (!started || game.state !== STATES.title) return; // not until the splash has gone
    profile.name = cleanName(screens.name);
    screens.setName(profile.name);
    profile.save();
    startRun();
  };

  const goToTitle = () => {
    if (!game.toTitle()) return;
    resetRun();
    screens.setBest(leaderboard.entries[0] || null);
    showScreen();
  };

  const togglePause = () => {
    if (game.togglePause()) showScreen();
  };

  // The game pauses by itself when the player looks away.
  const pauseIfPlaying = () => {
    if (game.pause()) showScreen();
  };
  window.addEventListener("blur", pauseIfPlaying);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pauseIfPlaying();
  });

  // The runner has crashed: record the score, and once he has had a moment to fall,
  // show how it went.
  const endRun = () => {
    runner.crash();
    game.end();
    const total = score.total;
    const newBest = leaderboard.isBest(total);
    const rank = leaderboard.add(profile.name, total);
    overTimer = setTimeout(() => {
      screens.showResult({ score: total, best: leaderboard.best, newBest, rank, entries: leaderboard.entries });
    }, CRASH_PAUSE_MS);
  };

  screens.bind({ play: playFromTitle, resume: togglePause, again: startRun, toTitle: goToTitle });

  const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
  const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
  const JUMP_KEYS = new Set(["ArrowUp", "KeyW", "Space"]);
  const SLIDE_KEYS = new Set(["ArrowDown", "KeyS"]);

  window.addEventListener("keydown", (event) => {
    // While a name is being typed the keys are letters, not moves. Enter starts the run.
    if (event.target instanceof HTMLInputElement) {
      if (event.code === "Enter" && !event.repeat) playFromTitle();
      return;
    }

    // The moves, while a run is going.
    const isControl = [LEFT_KEYS, RIGHT_KEYS, JUMP_KEYS, SLIDE_KEYS].some((keys) => keys.has(event.code));
    if (isControl && game.playing) {
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
      return;
    }

    // The rest are about the game itself, and act once for each press.
    if (event.repeat) return;
    if (event.code === "Enter") {
      if (game.state === STATES.title) playFromTitle();
      else if (game.state === STATES.over) startRun();
      else if (game.state === STATES.paused) togglePause();
    } else if (event.code === "KeyP" || event.code === "Escape") togglePause();
    else if (event.code === "KeyT") goToTitle();
    else if (event.code === "KeyR" && game.state !== STATES.title) startRun();
  });

  // Our frame loop
  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't throw the runner down the street.
    const dt = game.frozen ? 0 : Math.min(engine.getDeltaTime() / 1000, 0.05);
    scene.animationsEnabled = game.state !== STATES.paused; // a pause holds the animation clips too

    // The longer the run, the faster. (A crashed runner isn't running, so it doesn't matter.)
    runner.speed = speedFor(score.distance);
    runner.update(dt);
    buildStreet(runner.z);
    buildObstacles(runner.z);
    if (game.playing) {
      // The score: the distance run, any coins he has touched, and any obstacle he has
      // just got past with the right move.
      score.setDistance(runner.z - RUNNER_START_Z);
      score.update(dt);
      for (const coin of field.collect(runner)) {
        score.collectCoin();
        releaseCoin(coin);
      }
      field.track(runner);
      for (const _ of field.passed(runner)) score.cleanMove();
      hud.update(score);
    }

    // Coins spin, all together, so the trail glints as he runs.
    spin += dt * 2.5;
    for (const obstacle of field.active.values()) {
      if (obstacle.type === "coin") obstacleNodes.get(obstacle.id).rotation.y = spin;
    }

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
    if (game.playing && field.hit(runner)) endRun();

    // Put the character where the runner is, turned a little into a lane change,
    // and playing the clip for what it is doing.
    lift = approach(lift, liftFor(runner), LIFT_RATE, dt);
    character.root.position.set(runner.x, runner.y + lift, runner.z);
    pitch = approach(pitch, pitchFor(runner), PITCH_RATE, dt);
    character.root.rotation.x = pitch;
    character.root.rotation.y = runner.heading;
    const clip = game.state === STATES.title ? { name: CLIPS.idle, loop: true, speed: 1 } : clipFor(runner); // he stands still on the title
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
    started = true;
    setTimeout(() => splash.remove(), 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent =
      "Something went wrong starting the game. If the 3D models didn't load: a page opened straight from a file " +
      "can't load them, so run a local web server (for example `npx serve` in the repo folder) and open the page " +
      "through that. The console has the details.";
  });
