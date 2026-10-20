const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// --- Procedural fire sound ---
// A short downward "pew": a sine wave whose pitch swoops from high to low
// while its volume fades out. Synthesized on the fly, so there's no audio
// file to fetch or license.
let audioEngine = null;
let fireBuffer = null;
let bangBuffer = null;
let sirenBuffer = null;
let thrustBuffer = null;


const initAudio = async () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioEngine = await BABYLON.CreateAudioEngineAsync({ audioContext });
  await audioEngine.unlockAsync();

  const duration = 0.15;
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Accumulate phase instead of computing sin(2 * PI * f * t) directly.
  // When the frequency changes over time, the direct formula produces
  // glitches, because the phase jumps every time f changes. Adding up the
  // small phase step for each sample keeps the wave continuous.
  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const frequency = 1000 * Math.exp(-t * 12); // swoops from 1000 Hz down to ~165 Hz
    phase += (2 * Math.PI * frequency) / sampleRate;
    data[i] = Math.sin(phase) * Math.exp(-t * 18) * 0.5;
  }

  fireBuffer = buffer;

  // The explosion: white noise run through a simple low-pass filter (each
  // sample moves only 15% of the way toward the next random value, which
  // smooths away the harsh high frequencies), fading out over 0.4 seconds.
  const bangLength = Math.floor(sampleRate * 0.4);
  const bang = audioContext.createBuffer(1, bangLength, sampleRate);
  const bangData = bang.getChannelData(0);
  let smoothed = 0;
  for (let i = 0; i < bangLength; i++) {
    const t = i / sampleRate;
    smoothed += (Math.random() * 2 - 1 - smoothed) * 0.15;
    bangData[i] = smoothed * Math.exp(-t * 8) * 2;
  }

  bangBuffer = bang;

  // The UFO siren: a tone whose pitch wobbles four times a second. The buffer
  // is half a second long, which holds exactly two wobbles and exactly 300
  // cycles of the carrier, so its end joins its start with no click when it
  // loops.
  const sirenLength = Math.floor(sampleRate * 0.5);
  const siren = audioContext.createBuffer(1, sirenLength, sampleRate);
  const sirenData = siren.getChannelData(0);
  let sirenPhase = 0;
  for (let i = 0; i < sirenLength; i++) {
    const t = i / sampleRate;
    const frequency = 600 + 200 * Math.sin(2 * Math.PI * 4 * t);
    sirenPhase += (2 * Math.PI * frequency) / sampleRate;
    sirenData[i] = Math.sin(sirenPhase) * 0.25;
  }

  sirenBuffer = siren;

  // The thrust rumble: low-passed noise, played on a loop. Random noise
  // doesn't join up with itself at the loop point, so the buffer is made a
  // little too long and the extra samples that would have followed the end
  // are blended into the start, so the end flows into the beginning.
  const rumbleLength = Math.floor(sampleRate * 0.6);
  const fadeLength = Math.floor(sampleRate * 0.05);
  const raw = new Float32Array(rumbleLength + fadeLength);
  let rumbleSmoothed = 0;
  for (let i = 0; i < raw.length; i++) {
    rumbleSmoothed += (Math.random() * 2 - 1 - rumbleSmoothed) * 0.08;
    raw[i] = rumbleSmoothed;
  }
  const rumble = audioContext.createBuffer(1, rumbleLength, sampleRate);
  const rumbleData = rumble.getChannelData(0);
  for (let i = 0; i < rumbleLength; i++) {
    let value = raw[i];
    if (i < fadeLength) {
      const mix = i / fadeLength;
      value = raw[i] * mix + raw[rumbleLength + i] * (1 - mix);
    }
    rumbleData[i] = value * 2.5;
  }

  thrustBuffer = rumble;

};

// The rumble plays on a loop for as long as the engine is firing.
let thrustSound = null;
let thrustWanted = false;

const setThrust = async (on) => {
  thrustWanted = on;

  if (!on) {
    if (thrustSound) {
      thrustSound.stop();
      thrustSound.dispose();
      thrustSound = null;
    }
    return;
  }

  if (thrustSound || !audioEngine || !thrustBuffer) return;
  const sound = await audioEngine.createSoundAsync("thrust", thrustBuffer, { loop: true, volume: 0.3 });
  // The player may have let go while the sound was being created.
  if (!thrustWanted || thrustSound) {
    sound.dispose();
    return;
  }
  thrustSound = sound;
  sound.play();
};

const playFireSound = async () => {
  if (!audioEngine || !fireBuffer) return;

  const sound = await audioEngine.createSoundAsync("fire", fireBuffer, {
    volume: 0.4,
    playbackRate: 0.95 + Math.random() * 0.1, // slight pitch variation so shots don't sound identical
  });
  sound.onEndedObservable.add(() => sound.dispose());
  sound.play();
};

// The siren plays on a loop for as long as a UFO is on screen.
let sirenSound = null;
let sirenWanted = false;

const setSiren = async (on) => {
  sirenWanted = on;

  if (!on) {
    if (sirenSound) {
      sirenSound.stop();
      sirenSound.dispose();
      sirenSound = null;
    }
    return;
  }

  if (sirenSound || !audioEngine || !sirenBuffer) return;
  const sound = await audioEngine.createSoundAsync("siren", sirenBuffer, { loop: true, volume: 0.25 });
  // The UFO may have gone while the sound was being created.
  if (!sirenWanted || sirenSound) {
    sound.dispose();
    return;
  }
  sirenSound = sound;
  sound.play();
};

// Bigger rocks sound deeper: a lower playback rate slows the noise down.
const BANG_RATES = { large: 0.6, medium: 0.9, small: 1.3 };

const playBangSound = async (size) => {
  if (!audioEngine || !bangBuffer) return;

  const sound = await audioEngine.createSoundAsync("bang", bangBuffer, {
    volume: 0.5,
    playbackRate: BANG_RATES[size],
  });
  sound.onEndedObservable.add(() => sound.dispose());
  sound.play();
};

// --- World-space / orthographic-camera tuning ---
// The viewport's vertical half-extent always maps to this many world units,
// no matter the window size -- halfWidth is derived from it every resize so
// the wrap-around bounds and what's on screen always agree. Unlike Breakout,
// y grows UP here (see Ship), so no y-flip is needed anywhere.
const WORLD_HALF_HEIGHT = 7;
const SHIP_RADIUS = 0.6;
const SHIP_DRAG = 0.15; // a touch of drag so the ship eventually coasts to a halt
const SHIP_MODEL_LENGTH = SHIP_RADIUS * 2.4; // every ship's length, nose to tail, in world units
const SHIP_PREVIEW_Y = 2.8; // where the ship floats on the title screen
const SHIP_PREVIEW_SCALE = 2.4; // and how much bigger it is there
const ASSETS = "../assets/"; // the .glb models, shared by the Asteroids samples
const UFO_CHASE_TILT = 0; // seen from behind the ship, the saucers are left level
const SPLASH_MIN_MS = 3000; // the splash stays at least this long, even if the models load sooner
const SAFE_DISTANCE = 3; // world units; rocks never spawn this close to the ship
const RESPAWN_PROTECTION = 3; // seconds the ship can't be hurt after losing a life
const UFO_BULLET_SPEED = 7; // world units/s; the small UFO needs this to lead its shots
const ROCK_EXPLOSION = { large: 1.6, medium: 1, small: 0.6 }; // how big a burst each rock size makes
const UFO_COLORS = ["#ffffff", "#ff6b6b"]; // a red-tinted burst for the UFO
const HYPERSPACE_COLORS = ["#ffffff", "#6bb6ff"]; // a blue flash for the ship jumping



const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString("#050508FF");

  // Same orthographic setup the earlier series use: flat "2D" gameplay with
  // no perspective distortion.
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.setTarget(BABYLON.Vector3.Zero());
  scene.activeCamera = camera;

  // Lit 3D needs light. A soft one from above fills in the shadows, and a
  // stronger one shining into the screen from the upper left lights the faces
  // that look toward the camera, so the rocks and ship have a bright side and a
  // dark side.
  const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, -0.5), scene);
  ambient.intensity = 0.55;
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.5, -0.6, 1), scene);
  sun.intensity = 0.9;

  let halfWidth, halfHeight;
  let chasing = false; // true while the chase camera is on
  let frame = null; // a rectangle marking the edge of the arena, shown in the chase view

  // In the overhead view the screen edge IS the arena edge. From behind the
  // ship you can't see that, so draw it.
  const buildFrame = () => {
    if (frame) frame.dispose();
    frame = BABYLON.MeshBuilder.CreateLines(
      "arenaFrame",
      {
        points: [
          new BABYLON.Vector3(-halfWidth, -halfHeight, 0),
          new BABYLON.Vector3(halfWidth, -halfHeight, 0),
          new BABYLON.Vector3(halfWidth, halfHeight, 0),
          new BABYLON.Vector3(-halfWidth, halfHeight, 0),
          new BABYLON.Vector3(-halfWidth, -halfHeight, 0),
        ],
      },
      scene
    );
    frame.color = BABYLON.Color3.FromHexString("#3a4a66");
    frame.setEnabled(chasing);
  };

  const updateViewport = () => {
    const aspect = engine.getRenderWidth() / engine.getRenderHeight();
    halfHeight = WORLD_HALF_HEIGHT;
    halfWidth = halfHeight * aspect;
    camera.orthoLeft = -halfWidth;
    camera.orthoRight = halfWidth;
    camera.orthoTop = halfHeight;
    camera.orthoBottom = -halfHeight;
    buildFrame();
  };
  updateViewport();

  // Every ship the player can choose, and both saucers, are 3D models. Load
  // them all, side by side, before the game starts. Each ship comes in at the
  // same length, turned by the correction its table entry gives.
  const [ufoLargeModel, ufoSmallModel, ...shipModels] = await Promise.all([
    loadModel(scene, `${ASSETS}plaggy_cc0-ufo-621.glb`, { size: 1, name: "ufoLarge" }),
    loadModel(scene, `${ASSETS}jeremywoodsster-ufo-2582.glb`, { size: 1, name: "ufoSmall" }),
    ...SHIPS.map((choice) =>
      loadModel(scene, `${ASSETS}${choice.file}`, { size: SHIP_MODEL_LENGTH, name: choice.id, rotation: choice.rotation })
    ),
  ]);

  const picker = new ShipPicker(SHIPS);
  const ship = new Ship({ radius: SHIP_RADIUS, drag: SHIP_DRAG });
  ship.attachModel(scene, shipModels[picker.index], { length: SHIP_MODEL_LENGTH });
  // Only the chosen ship shows; the others wait their turn.
  shipModels.forEach((model, i) => model.setEnabled(i === picker.index));
  const bullets = new BulletSystem({ scene });
  const rocks = new RockField({ scene });
  const ufo = new Ufo({
    scene,
    bulletSpeed: UFO_BULLET_SPEED,
    models: { large: ufoLargeModel, small: ufoSmallModel }, // the detailed saucer is the big one
  });
  let sirenOn = false;
  let thrustOn = false;
  // The UFO's bullets are a second BulletSystem: red, slower, and with no
  // cooldown of its own because the UFO decides when to shoot.
  const ufoBullets = new BulletSystem({
    scene,
    speed: UFO_BULLET_SPEED,
    lifetime: 2.2,
    cooldown: 0,
    maxBullets: 4,
    color: "#ff6b6b",
  });
  const explosions = new Explosions({ scene });

  // The chase camera's numbers, and the two functions that put them to work.
  const chase = new ChaseCamera();

  const applyChase = () => {
    camera.position.copyFromFloats(chase.position.x, chase.position.y, chase.position.z);
    camera.setTarget(new BABYLON.Vector3(chase.target.x, chase.target.y, chase.target.z));
  };

  const setChase = (on) => {
    chasing = on;
    frame.setEnabled(on);
    ufo.setTilt(on ? UFO_CHASE_TILT : Ufo.TILT);
    if (on) {
      camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
      camera.upVector = new BABYLON.Vector3(0, 0, -1); // "up" is toward the viewer, away from the plane
      camera.fov = 0.9;
      chase.snapTo(ship);
      applyChase();
    } else {
      camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
      camera.upVector = new BABYLON.Vector3(0, 1, 0);
      camera.position = new BABYLON.Vector3(0, 0, -10);
      camera.setTarget(BABYLON.Vector3.Zero());
      updateViewport(); // puts the orthographic bounds back
    }
  };

  // Fullscreen 2D GUI layer for the score, drawn on top of the 3D world.
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);
  const game = new Game();
  const hud = new Hud({ ui, lives: game.lives });

  const waves = new Waves();

  // Brings in the rocks for the wave that just started. Each wave has more of
  // them, and they drift faster.
  const startWave = () => {
    rocks.speedScale = waves.speedScaleFor(waves.wave);
    rocks.populate(waves.rocksFor(waves.wave), { halfWidth, halfHeight }, ship, SAFE_DISTANCE);
    hud.setWave(waves.wave);
  };

  // The ship was destroyed, by whatever: the player loses a life, then either
  // respawns, protected for a few seconds, or the game ends.
  const loseShip = () => {
    explosions.spawn(ship.x, ship.y, 2);
    hud.setLives(game.loseLife());
    playBangSound("large");
    if (game.over) {
      ship.setVisible(false);
      hud.hideAnnouncement();
      hud.showGameOver();
    } else {
      ship.respawn(RESPAWN_PROTECTION);
      chase.snapTo(ship);
    }
  };

  // The ship hit a rock: the rock breaks apart (and scores) as if it had been
  // shot, and the ship is lost.
  const crash = (rock) => {
    const { size } = rock;
    explosions.spawn(rock.x, rock.y, ROCK_EXPLOSION[size]);
    hud.addScore(rocks.destroy(rock).points);
    playBangSound(size);
    loseShip();
  };

  // Puts everything back to the start of a fresh game. Used when the player
  // starts from the title screen and when they press R later.
  const restartGame = () => {
    ship.reset();
    chase.snapTo(ship);
    bullets.clear();
    ufoBullets.clear();
    ufo.reset();
    rocks.clear();
    hud.resetScore();
    game.reset();
    hud.setLives(game.lives);
    hud.hideGameOver();
    hud.hidePaused();
    waves.reset();
    hud.setWave(waves.wave);
  };

  const startGame = () => {
    if (document.getElementById("splash")) return; // the splash is still up: the game can't start behind it
    game.start();
    hud.hideTitle();
    hud.hideShipChoice();
    ship.mesh.scaling.setAll(1); // back from the title screen's big preview
    restartGame();
  };

  // On the title screen: swap to the next or previous ship.
  const chooseShip = (direction) => {
    picker.step(direction);
    ship.useModel(shipModels[picker.index]);
    hud.showShipChoice(picker.current.name);
  };

  const togglePause = () => {
    if (game.togglePause()) hud.showPaused();
    else hud.hidePaused();
  };

  // The emergency escape: jump to a random spot. A flash of blue marks where
  // the ship left and where it arrived. It's a gamble, since the new spot may
  // be on a rock and the jump itself can fail.
  const hyperspace = () => {
    if (!game.playing || !ship.hyperspaceReady) return;
    explosions.spawn(ship.x, ship.y, 0.5, HYPERSPACE_COLORS);
    const survived = ship.hyperspace({ halfWidth, halfHeight });
    chase.snapTo(ship);
    explosions.spawn(ship.x, ship.y, 0.5, HYPERSPACE_COLORS);
    if (!survived) loseShip();
  };

  // The game opens on the title screen: the chosen ship turns slowly above the
  // title, a few rocks drift behind it, and the arrow keys pick a different ship.
  ship.y = SHIP_PREVIEW_Y;
  ship.mesh.scaling.setAll(SHIP_PREVIEW_SCALE);
  rocks.populate(5, { halfWidth, halfHeight });
  hud.showTitle();
  hud.showShipChoice(picker.current.name);

  // Held-key input: turn and thrust are applied once per frame below, so
  // holding a key behaves identically at any frame rate.
  const heldKeys = new Set();
  const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
  const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
  const THRUST_KEYS = new Set(["ArrowUp", "KeyW"]);
  const FIRE_KEYS = new Set(["Space"]);
  const isControlKey = (code) => LEFT_KEYS.has(code) || RIGHT_KEYS.has(code) || THRUST_KEYS.has(code) || FIRE_KEYS.has(code);

  window.addEventListener("keydown", (event) => {
    // On the title screen, Enter starts the game, the left and right keys pick a
    // ship, and nothing else does anything.
    if (!game.started) {
      if (event.code === "Enter") startGame();
      else if (LEFT_KEYS.has(event.code)) chooseShip(-1);
      else if (RIGHT_KEYS.has(event.code)) chooseShip(1);
      return;
    }

    if (event.code === "KeyR") {
      restartGame();
      return;
    }
    if (event.code === "KeyP") {
      togglePause();
      return;
    }
    if (event.code === "KeyH") {
      if (!event.repeat) hyperspace(); // one jump per press, not one per key repeat
      return;
    }

    if (event.code === "KeyV") {
      setChase(!chasing);
      return;
    }

    if (!isControlKey(event.code)) return;
    event.preventDefault(); // arrow keys otherwise scroll the page
    heldKeys.add(event.code);
  });
  window.addEventListener("keyup", (event) => heldKeys.delete(event.code));
  // Clicking also starts the game. It's a user gesture too, which lets the
  // browser play sound.
  canvas.addEventListener("pointerdown", () => {
    if (!game.started) startGame();
  });
  window.addEventListener("blur", () => heldKeys.clear()); // don't get stuck thrusting after alt-tab

  const anyHeld = (keys) => [...heldKeys].some((code) => keys.has(code));

  scene.onBeforeRenderObservable.add(() => {
    // Clamp dt so a backgrounded tab doesn't launch the ship across the map.
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const bounds = { halfWidth, halfHeight };

    // Bursts are cleaned up as they finish, whatever else is happening.
    explosions.update(dt);
    
    // The rumble plays while the thrust key is held in a running game, so
    // pausing or losing the last life silences it.
    const thrusting = game.playing && anyHeld(THRUST_KEYS);
    if (thrusting !== thrustOn) {
      thrustOn = thrusting;
      setThrust(thrustOn);
    }
    
    // On the title screen the rocks drift and the ship turns slowly to show
    // itself off; everything else waits for the player.
    if (!game.started) {
      rocks.update(dt, bounds);
      ship.rotate(1, dt * 0.6);
      ship.update(dt, bounds);
      return;
    }

    // Paused: nothing moves, and the UFO siren falls quiet.
    if (game.paused) {
      if (sirenOn) {
        sirenOn = false;
        setSiren(false);
      }
      return;
    }

    // Once the game is over there's no ship to steer or fire; the rocks and
    // any bullets already in flight carry on.
    if (!game.over) {
      // Holding both turn keys cancels out, as in the original.
      const turn = (anyHeld(LEFT_KEYS) ? 1 : 0) - (anyHeld(RIGHT_KEYS) ? 1 : 0);
      if (turn !== 0) ship.rotate(turn, dt);
      if (anyHeld(THRUST_KEYS)) ship.thrust(dt);

      const moved = ship.update(dt, bounds);
      // Wrapping to the other side of the screen would send an easing camera
      // swooping across the arena, so it jumps there instead.
      if (moved.wrappedX || moved.wrappedY) chase.snapTo(ship);

      // Fire after the ship has moved this frame, so bullets spawn at the
      // nose's current position. Holding Space auto-fires; the system's own
      // cooldown and bullet cap set the pace.
      if (anyHeld(FIRE_KEYS) && bullets.fire(ship)) playFireSound();
    }

    bullets.update(dt, bounds);
    rocks.update(dt, bounds);
    for (const hit of rocks.collideBullets(bullets)) {
      hud.addScore(hit.points);
      playBangSound(hit.size);
      explosions.spawn(hit.x, hit.y, ROCK_EXPLOSION[hit.size]);
    }

    // A protected ship (just respawned) passes through rocks harmlessly.
    if (!game.over && !ship.invulnerable) {
      const rock = rocks.findCollision(ship.x, ship.y, ship.radius);
      if (rock) crash(rock);
    }

    // The UFO flies and weaves, and shoots at the ship while there's a ship to
    // shoot at. The score decides which size it sends next.
    const shot = ufo.update(dt, bounds, game.over ? null : ship, hud.score);
    if (shot) {
      ufoBullets.fireFrom(shot.x, shot.y, shot.dirX, shot.dirY);
      playFireSound();
    }
    ufoBullets.update(dt, bounds);

    // Start or stop the siren only when a UFO appears or leaves.
    if (ufo.active !== sirenOn) {
      sirenOn = ufo.active;
      setSiren(sirenOn);
    }

    if (ufo.active) {
      const bullet = bullets.findHit(ufo.x, ufo.y, ufo.radius);
      if (bullet) {
        // Shot down.
        bullets.remove(bullet);
        explosions.spawn(ufo.x, ufo.y, 1.2, UFO_COLORS);
        hud.addScore(ufo.destroy());
        playBangSound("medium");
      } else if (!game.over && !ship.invulnerable && circlesOverlap(ship.x, ship.y, ship.radius, ufo.x, ufo.y, ufo.radius)) {
        // Rammed: both are lost.
        explosions.spawn(ufo.x, ufo.y, 1.2, UFO_COLORS);
        hud.addScore(ufo.destroy());      
        playBangSound("medium");
        loseShip();
      }
    }

    // A UFO bullet hits the ship (unless it's protected).
    if (!game.over && !ship.invulnerable) {
      const bullet = ufoBullets.findHit(ship.x, ship.y, ship.radius);
      if (bullet) {
        ufoBullets.remove(bullet);
        loseShip();
      }
    }

    // In the chase view the camera follows the ship every frame.
    if (chasing) {
      chase.update(ship, dt);
      applyChase();
    }

    // Wave progression: when the screen is clear, count down, then start the
    // next wave. Nothing to announce once the game is over.
    if (!game.over) {
      if (waves.update(dt, rocks.rocks.length)) startWave();
      if (waves.between) hud.showAnnouncement(`WAVE ${waves.wave + 1}`);
      else hud.hideAnnouncement();
    }
  });

  return { scene, updateViewport };
};

const splash = document.getElementById("splash");
const splashStatus = document.getElementById("splash-status");
const shownAt = performance.now();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

createScene()
  .then(async ({ scene, updateViewport }) => {
    initAudio();

    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener("resize", () => {
      engine.resize();
      updateViewport();
    });

    // The game is ready, drawing behind the splash. Keep the splash up for its
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

