const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// A phone's screen has two or three times as many pixels across as it seems to, and drawing
// every one is slow and hot. Drawing at most twice as many as the page's units looks sharp
// and keeps the game smooth. (A hardware scaling level of 0.5 draws twice as many pixels.)
const MAX_PIXEL_RATIO = 2;
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

const BACKGROUND = "#161b26"; // dark blue-steel, so the chrome marble and the yellow edges stand out
const SPLASH_MIN_MS = 3000; // the splash stays at least this long, even if everything loads sooner
const DISSOLVE_PAUSE = 1.5; // seconds a dissolved marble is a puff, before it drops again
const END_PAUSE_MS = 2500; // how long the banner for a won or lost level stays before the game goes on

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

  // The edges are kept, so that a shake can move the whole view across and up by a little, and the next frame put it back.
  let view = viewHalfExtents(1);
  const showView = (across = 0, up = 0) => {
    camera.orthoLeft = -view.halfWidth + across;
    camera.orthoRight = view.halfWidth + across;
    camera.orthoBottom = -view.halfHeight + up;
    camera.orthoTop = view.halfHeight + up;
  };
  const fitView = () => {
    view = viewHalfExtents(engine.getAspectRatio(camera));
    showView();
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

  // How much slime has got at the marble. The slime zones tell it when the marble goes in and out.
  const exposure = new Exposure();

  // The game as a whole: what the screen is showing, who is playing, what they have scored, the best scores
  // on this device, the sound, and the screens themselves.
  const game = new Game();
  const profile = new Profile();
  const board = new Leaderboard();
  const tally = new Tally();
  const sounds = new Sounds({ muted: profile.muted });
  const screens = new Screens(document);
  // The finishing touches: particles (sparks, glitter, a firework, a puff, a trail) and a shake of the camera.
  const effects = new ParticleBursts(scene);
  const shake = new Shake();

  // Rolling again: R on a keyboard, and a button for a screen with no keys. A marble put back is clean.
  let dissolveWait = 0; // seconds left of the puff, while a dissolved marble is gone
  const dropAgain = () => {
    marble.reset();
    marble.mesh.isVisible = true;
    dissolveWait = 0;
    exposure.reset();
  };

  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR" && !event.repeat && game.playing && !typesText(event)) dropAgain();
  });
  const dropButton = document.getElementById("drop");
  dropButton.addEventListener("click", () => {
    dropButton.blur();
    if (game.playing) dropAgain();
  });

    // The banner: a few big words in the middle of the screen for what has just happened.
  const banner = document.getElementById("banner");
  const bannerTitle = document.getElementById("banner-title");
  const bannerDetail = document.getElementById("banner-detail");
  let bannerTimer = null;
  const say = (title, detail = "", ms = 1500) => {
    bannerTitle.textContent = title;
    bannerDetail.textContent = detail;
    banner.classList.remove("hidden");
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => banner.classList.add("hidden"), ms);
  };  

  // A run is one attempt at the level: the clock, and which checkpoints have been reached. The zones
  // of the level (its goal and checkpoints) tell the game when the marble rolls into one.
  let run = new Run(level.grid);
  const reachZone = (zone, node) => {
    if (node !== marble.mesh) return; // something else rolled in, and zones are only for the marble
    if (zone.kind === "slime") {
      exposure.enter();
      return;
    }
    if (zone.kind === "goal") {
      if (run.finish()) {
        marble.stop(); // it has arrived, and mustn't roll on over the edge
        zones.markTaken(zone);
        sounds.play("goal");
        effects.burst("firework", marble.position.x, marble.position.y + 0.5, marble.position.z);
        shake.knock(0.4);
      }
      return;
    }
    const bonus = run.reachCheckpoint(zone.index);
    if (bonus === 0) return; // one already reached, or the run isn't running
    marble.start = levelStart(level.grid, zone); // a marble that falls now starts again from here
    zones.markTaken(zone);
    say("Checkpoint", `+${bonus} seconds`);
    sounds.play("checkpoint");
    effects.burst("glitter", marble.position.x, marble.position.y + 0.3, marble.position.z);
  };
  const leaveZone = (zone, node) => {
    if (zone.kind === "slime" && node === marble.mesh) exposure.leave();
  };
  let zones = buildZones(scene, level.grid, reachZone, leaveZone);

  // The movers (platforms and pistons) have a clock of their own, that starts at zero with the level.
  let movers = buildMovers(scene, level.grid);
  let levelTime = 0;

  // The enemies of the level: marbles that chase the marble. When one hits it, it costs time.
  let enemies = buildEnemies(scene, level.grid);
  enemies.meshes.forEach((mesh) => shadows.addShadowCaster(mesh));
  watchHits(scene, marble, (node) => enemies.owns(node), () => {
    const lost = run.hit();
    if (lost > 0) {
      say("Bumped!", `-${lost} seconds`, 1200);
      sounds.play("bump");
      effects.burst("spark", marble.position.x, marble.position.y, marble.position.z);
      shake.knock(1);
    }
  });

  // Playing a level: take the one that is there away (and its zones), build this one, begin a new run
  // and start the marble at its start. The camera is put at the marble too, or it would glide across
  // from the old level.
  let focus = { ...marble.start };
  const levelName = document.getElementById("level-name");
  levelName.textContent = level.grid.name;
  const loadLevel = (index) => {
    zones.dispose();
    movers.dispose();
    enemies.meshes.forEach((mesh) => shadows.removeShadowCaster(mesh));
    enemies.dispose();
    level.dispose();
    levelIndex = index;
    level = buildLevel(scene, LEVELS[levelIndex]);
    zones = buildZones(scene, level.grid, reachZone, leaveZone);
    movers = buildMovers(scene, level.grid);
    enemies = buildEnemies(scene, level.grid);
    enemies.meshes.forEach((mesh) => shadows.addShadowCaster(mesh));
    levelTime = 0;
    run = new Run(level.grid);
    marble.start = levelStart(level.grid);
    dropAgain();
    focus = { ...marble.start };
    levelName.textContent = level.grid.name;
  };

  const nextLevel = () => loadLevel((levelIndex + 1) % LEVELS.length); // after the last, the first
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyN" && !event.repeat && game.playing && !typesText(event)) nextLevel();
  });
  const nextButton = document.getElementById("next-level");
  nextButton.addEventListener("click", () => {
    nextButton.blur();
    if (game.playing) nextLevel();
  });

  // The clock on the screen. It is written to only when the words change, once a second.
  const clock = document.getElementById("clock");
  let shownTime = "";
  const showClock = () => {
    const text = formatTime(run.remaining);
    if (text !== shownTime) {
      shownTime = text;
      clock.textContent = text;
    }
    clock.classList.toggle("low", run.low);
  };

  // The flow of a game. A game begins at the title, on the first level with nothing scored. It ends when the
  // last level is finished, or when the time runs out, and then the result is shown, and the score goes on the
  // leaderboard if it is good enough.
  const showTitle = () => {
    screens.setName(profile.name);
    screens.setBest(board.entries[0]);
    screens.setSound(!profile.muted);
    screens.setPlaying(false);
    screens.show(STATES.title);
  };
  const startGame = () => {
    sounds.unlock(); // the browser only allows sound after the player has done something
    profile.name = cleanName(screens.name);
    profile.save();
    screens.setName(profile.name);
    tally.reset();
    loadLevel(0);
    game.start();
    screens.setPlaying(true);
    screens.show(STATES.playing);
    sounds.play("start");
  };
  const endGame = (won) => {
    const score = tally.total;
    const newBest = board.isBest(score);
    const rank = board.add(profile.name, score);
    game.end();
    screens.setPlaying(false);
    screens.showResult({ heading: won ? "You win!" : "Time's up", score, best: board.best, newBest, rank, entries: board.entries });
    sounds.play(newBest ? "best" : won ? "goal" : "over");
  };
  const toTitle = () => {
    if (!game.toTitle()) return;
    loadLevel(0); // the first level waits behind the title
    showTitle();
    sounds.play("click");
  };
  const togglePause = () => {
    if (run.status === "won" || run.status === "timeup") return; // the end of a level is already on its way
    if (!game.togglePause()) return;
    screens.setPlaying(game.playing);
    screens.show(game.state);
    sounds.play("click");
  };
  const toggleSound = () => {
    sounds.unlock();
    profile.muted = !profile.muted;
    sounds.setMuted(profile.muted);
    profile.save();
    screens.setSound(!profile.muted);
    sounds.play("click");
  };
  screens.bind({ play: startGame, resume: togglePause, again: startGame, toTitle, sound: toggleSound, pause: togglePause });
  showTitle();

  // The keys. (Not while typing a name: the keys of a name are for spelling.)
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.code === "Enter" && (game.state === STATES.title || game.state === STATES.over)) {
      startGame();
      return;
    }
    if (typesText(event)) return;
    if (event.code === "KeyP" || event.code === "Escape") togglePause();
    else if (event.code === "KeyM") toggleSound();
    else if (event.code === "KeyT") toTitle();
    else if (event.code === "KeyR" && game.state === STATES.over) startGame();
  });
  // A page that is put in the background (another tab, a phone's lock button) is paused.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && game.playing) togglePause();
  });

  // When a run is won or lost, say so, wait a moment, then go on: to the next level, or to the result. The
  // wait is a timer, and the player might press N in the meantime, which starts a new run; so the timer only
  // goes on if the run it was set for is still the one being played.
  let announced = null;
  const announceEnd = () => {
    if (run === announced || (run.status !== "won" && run.status !== "timeup")) return;
    announced = run;
    const thisRun = run;
    if (run.status === "won") {
      const points = tally.add(run.remaining);
      const last = levelIndex === LEVELS.length - 1;
      say("Goal!", `${formatTime(run.remaining)} left, +${formatScore(points)}`, END_PAUSE_MS);
      setTimeout(() => run === thisRun && (last ? endGame(true) : nextLevel()), END_PAUSE_MS);
    } else {
      say("Time's up", "", END_PAUSE_MS);
      setTimeout(() => run === thisRun && endGame(false), END_PAUSE_MS);
    }
  };

  // Each frame: run the clock, read the tilt, steer the marble, put it back if it fell off the
  // level, keep the sun over it, and ease the camera after it.
  let lastTick = null; // the second of the clock that last ticked
  scene.onBeforeRenderObservable.add(() => {
    // Time stands still on the title and in a pause: no time passes, and the physics isn't moved on.
    scene.physicsEnabled = !game.frozen;
    const dt = game.frozen ? 0 : Math.min(engine.getDeltaTime() / 1000, 0.05);

    // The clock starts when the game does (the physics is held until then), and counts down
    // until the run is won or lost.
    if (game.playing && run.status === "ready") run.start();
    run.tick(dt);
    showClock();
    announceEnd();

    // A tick for every second of the last ten.
    if (run.low && Math.ceil(run.remaining) !== lastTick) {
      lastTick = Math.ceil(run.remaining);
      sounds.play("tick");
    } else if (!run.low) {
      lastTick = null;
    }

    // A marble that has won was stopped where it touched the goal, which is its edge. It rolls
    // on to the middle, and rests there.
    if (run.status === "won") marble.glideTo(zonePosition(level.grid, level.grid.goal));

    // The movers go by the level's own clock, which only runs once the splash has gone.
    if (scene.physicsEnabled) {
      levelTime += dt;
      movers.update(levelTime);
      movers.carry(marble, levelTime, dt);
    }

    // The enemies think and push, while the run is on.
    if (!game.frozen && run.status === "running") enemies.update(dt, marble.position);

    // Slime slows the marble and turns it green, and if it stays in too long, it dissolves, and starts again.
    if (!game.frozen && run.status === "running") {
      if (dissolveWait > 0) {
        // The marble is a puff: out of sight and held where it dissolved, until the puff has been seen.
        dissolveWait -= dt;
        marble.glideTo(marble.position);
        if (dissolveWait <= 0) dropAgain();
      } else {
        exposure.tick(dt);
        marble.slow(exposure.inSlime);
        marble.tint(exposure.level);
        if (exposure.dissolved) {
          say("Dissolved!", "Keep out of the slime");
          sounds.play("dissolve");
          effects.burst("puff", marble.position.x, marble.position.y, marble.position.z);
          marble.mesh.isVisible = false;
          dissolveWait = DISSOLVE_PAUSE;
        }
      }
    }

    // The tilt: ease its stick toward where the phone is tipped, keep the words and the gauge
    // up to date, and move the gauge's dot (18 pixels is as far as it can go from the middle).
    tilt.update(dt);
    showTiltState();
    tiltDot.style.transform = `translate(${tilt.stick.x * 18}px, ${-tilt.stick.y * 18}px)`;

    // The stick, as it is seen on the screen, turned into a direction in the world (by the
    // camera's own angle) and into a push. Only while the clock is running: not before the splash
    // has gone (a push is a change of speed that happens at once, so it would load the marble up
    // while the world is held still), and not once the run is won or lost.
    if (!game.frozen && run.status === "running" && dissolveWait <= 0) {
      const stick = combineSticks(combineSticks(keyboard.stick, thumb.value), tilt.stick);
      marble.push(worldDirection(stick, camera.alpha));
    }

    if (hasFallen(marble.position.y, fallLimit(level.grid))) {
      if (game.playing) sounds.play("fall");
      dropAgain();
    }
    // The finishing touches. A trail behind a marble that is going fast, but not while the game is held (a pause, a
    // result), and every particle is held with it. A shake moves the view a little, and dies away.
    effects.setFrozen(game.frozen);
    const speed = Math.hypot(marble.velocity.x, marble.velocity.z);
    const rate = game.frozen || run.status !== "running" ? 0 : trailRate(speed, TOP_SPEED);
    effects.trail(marble.position.x, marble.position.y, marble.position.z, rate);
    shake.update(dt);
    showView(shake.offset.x, shake.offset.y);
    const sunAt = sunPosition(marble.position, sun.direction, SUN_DISTANCE);
    sun.position.set(sunAt.x, sunAt.y, sunAt.z);
    focus = follow(focus, marble.position, FOLLOW_RATE, dt);
    camera.target.set(focus.x, focus.y, focus.z);
  });

  engine.onResizeObservable.add(fitView);

  // Developer mode, with ?dev on the end of the address: a panel of sliders to change things while the game runs,
  // to see what they do. Each is a row, so a later part of the game adds a row, not a new panel. The key under Esc
  // hides the panel, and its title bar folds it up (it starts folded up on a phone, which has little room).
  if (devEnabled(location.search)) {
    const steel = marble.mesh.material;
    const rim = steel.emissiveFresnelParameters;
    const physics = scene.getPhysicsEngine();
    const panel = new DevPanel(
      document,
      [
        {
          title: "Game",
          rows: [control("level", () => levelIndex + 1, (value) => loadLevel(value - 1), 1, LEVELS.length, 1)],
        },
        {
          title: "Marble look",
          rows: [
            slider("body red", steel.diffuseColor, "r", 0, 1),
            slider("body green", steel.diffuseColor, "g", 0, 1),
            slider("body blue", steel.diffuseColor, "b", 0, 1),
            slider("shine", steel, "specularPower", 1, 512, 1),
            slider("rim red", rim.rightColor, "r", 0, 1),
            slider("rim green", rim.rightColor, "g", 0, 1),
            slider("rim blue", rim.rightColor, "b", 0, 1),
            slider("rim power", rim, "power", 0.5, 8),
            slider("rim bias", rim, "bias", 0, 1),
          ],
        },
        {
          title: "Feel",
          rows: [
            control("push", () => marble.steer.force ?? STEER_FORCE, (value) => (marble.steer.force = value), 5, 60, 1),
            control("top speed", () => marble.steer.topSpeed ?? TOP_SPEED, (value) => (marble.steer.topSpeed = value), 4, 30, 0.5),
            control("gravity", () => -physics.gravity.y, (value) => physics.setGravity(new BABYLON.Vector3(0, -value, 0)), 1, 30, 0.1),
          ],
        },
        {
          title: "Light and effects",
          rows: [
            slider("sky light", sky, "intensity", 0, 2),
            slider("sun light", sun, "intensity", 0, 2),
            slider("particles", effects, "amount", 0, 3, 0.1),
            slider("shake", shake, "strength", 0, 2),
          ],
        },
      ],
      {
        collapsed: window.matchMedia("(max-height: 520px), (max-width: 640px)").matches,
        clipboard: navigator.clipboard,
      }
    );
    document.body.appendChild(panel.root);
    window.addEventListener("keydown", (event) => {
      if (event.code === DEV_KEY && !event.repeat && !typesText(event)) panel.toggleShown();
    });
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

    // The world is ready, drawing behind the splash. Keep the splash up for its minimum
    // time, then fade it out and take it away.
    await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
    splash.classList.add("hidden"); // and the title is there underneath, waiting for Play
    setTimeout(() => splash.remove(), 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent =
      "Something went wrong starting the game. The physics engine is loaded from the internet, so check " +
      "your connection, and that the page is opened through a web server (for example `npx serve` in the " +
      "repo folder). The console has the details.";
  });
