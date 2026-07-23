const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// --- Procedural bounce sound ---
// Synthesized on the fly (thump + noise transient) via Babylon's Audio Engine
// V2, so the sample stays self-contained with no external audio asset to
// fetch or license. Unchanged from Bouncing Ball Particles & Friction.
let audioEngine = null;
let bounceBuffer = null;

const initAudio = async () => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  audioEngine = await BABYLON.CreateAudioEngineAsync({ audioContext });
  await audioEngine.unlockAsync();

  const duration = 0.12;
  const sampleRate = audioContext.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const thump = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 35);
    const click = (Math.random() * 2 - 1) * Math.exp(-t * 90);
    data[i] = thump * 0.6 + click * 0.5;
  }

  bounceBuffer = buffer;
};

const playBounceSound = async (impactSpeed) => {
  if (!audioEngine || !bounceBuffer) return;

  const speedFactor = Math.min(impactSpeed / 400, 1.5);
  const sound = await audioEngine.createSoundAsync("bounce", bounceBuffer, {
    volume: 0.25 + speedFactor * 0.35,
    playbackRate: 0.9 + Math.random() * 0.3,
  });
  sound.onEndedObservable.add(() => sound.dispose());
  sound.play();
};

// --- World-space / orthographic-camera tuning ---
// The viewport's vertical half-extent always maps to this many world units,
// no matter the window size -- halfWidth is derived from it every resize so
// the physics bounds and what's on screen always agree. Taller and the
// ball/paddle smaller than the slingshot samples used (carried over from
// Breakout Paddle), which is what leaves room for the rows of bricks this
// sample adds above the paddle.
const WORLD_HALF_HEIGHT = 7;
const BALL_RADIUS = 0.4;
const PADDLE_HALF_WIDTH = 1;
const PADDLE_HALF_HEIGHT = 0.14;
const PADDLE_Y = WORLD_HALF_HEIGHT - 0.5; // fixed inset from the bottom wall
const LAUNCH_SPEED = 8; // world units/s
const PADDLE_KEYBOARD_SPEED = 9; // world units/s, for arrow-key/A-D control

// Brick grid: centered horizontally, starting a bit below the top wall so
// there's room to see a brick's top edge get hit.
const BRICK_HALF_WIDTH = 0.55;
const BRICK_HALF_HEIGHT = 0.25;
const BRICK_GAP = 0.12;
const BRICK_TOP = -WORLD_HALF_HEIGHT + 1.5;
const POINTS_PER_HIT = 10;

const STARTING_LIVES = 3;

// Each level is a grid of characters, one row per string: "." is an empty
// cell (no brick), and a digit is a brick that survives that many hits.
// Rows don't have to fill a rectangle -- BrickGrid only places a brick where
// a cell is > 0, so level 3's diamond silhouette works the same way a solid
// rectangle does. Clearing every brick in a level advances to the next one;
// clearing the last one wins the game (see advanceLevel() below).
const LEVELS = [
  ["11111111", "11111111", "11111111", "11111111", "11111111"],
  ["22222222", "11111111", "22222222", "11111111", "22222222"],
  ["..1111..", ".122221.", "12333321", ".122221.", "..1111.."],
];

const parseLevel = (rows) => rows.map((row) => row.split("").map((ch) => (ch === "." ? 0 : Number(ch))));

// Launches downward at a random-ish diagonal angle so the ball engages the
// paddle right away, instead of starting at rest like the slingshot samples.
const randomLaunchVelocity = () => {
  const angle = ((40 + Math.random() * 20) * Math.PI) / 180; // 40-60 deg from horizontal
  const dir = Math.random() < 0.5 ? -1 : 1;
  return {
    vx: dir * LAUNCH_SPEED * Math.cos(angle),
    vy: LAUNCH_SPEED * Math.sin(angle), // positive = downward, y grows downward
  };
};

const createScene = () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString("#202020FF");

  // An orthographic camera looking straight down the Z axis: no perspective
  // distortion, so flat "2D" gameplay still reads correctly even though the
  // ball and paddle are real meshes living in a 3D world.
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.setTarget(BABYLON.Vector3.Zero());
  scene.activeCamera = camera;

  // A light so the ball/paddle materials actually show shading.
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.3, 1, -0.4), scene);
  light.intensity = 0.9;

  // Fullscreen 2D UI layer for the HUD, overlaid on top of the 3D world.
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

  let halfWidth, halfHeight, worldToScreenScale;

  // Recomputes the camera's ortho bounds -- and the resulting world<->screen
  // scale everything else in this scene depends on -- from the current
  // canvas size. Called once up front and again on every resize.
  const updateViewport = () => {
    const aspect = engine.getRenderWidth() / engine.getRenderHeight();
    halfHeight = WORLD_HALF_HEIGHT;
    halfWidth = halfHeight * aspect;
    camera.orthoLeft = -halfWidth;
    camera.orthoRight = halfWidth;
    camera.orthoTop = halfHeight;
    camera.orthoBottom = -halfHeight;
    worldToScreenScale = engine.getRenderWidth() / (2 * halfWidth);
  };
  updateViewport();

  // The ball is fully elastic in this sample (restitution: 1) -- an arcade
  // ball shouldn't bleed energy and settle at rest like the earlier
  // slingshot samples' ball did.
  const { vx, vy } = randomLaunchVelocity();
  const ball = new Ball({ scene, x: 0, y: 0, vx, vy, radius: BALL_RADIUS, restitution: 1 });
  const paddle = new Paddle({ scene, x: 0, y: PADDLE_Y, halfWidth: PADDLE_HALF_WIDTH, halfHeight: PADDLE_HALF_HEIGHT });
  const brickGrid = new BrickGrid({
    scene,
    pattern: parseLevel(LEVELS[0]),
    halfWidth: BRICK_HALF_WIDTH,
    halfHeight: BRICK_HALF_HEIGHT,
    gap: BRICK_GAP,
    top: BRICK_TOP,
    pointsPerHit: POINTS_PER_HIT,
  });
  const sparkSystem = new SparkSystem({ scene });
  const hud = new Hud({
    ui,
    startingLives: STARTING_LIVES,
    onReset: () => {
      paddle.reset();
      levelIndex = 0;
      brickGrid.load(parseLevel(LEVELS[levelIndex]));
      hud.setLevel(levelIndex + 1);
      const relaunch = randomLaunchVelocity();
      ball.reset(0, 0, relaunch.vx, relaunch.vy);
      hud.resetScore();
      hud.resetLives();
      hud.hideWin();
      gameOver = false;
      won = false;
    },
  });

  // True once lives reach 0, or once every level has been cleared -- either
  // gates paddle input and the physics/collision step below so nothing
  // moves until Reset is clicked.
  let gameOver = false;
  let won = false;
  let levelIndex = 0;

  // Takes a life for a ball that fell past the paddle. If any remain, just
  // respawns the ball and paddle so play continues with the current score
  // and brick layout intact; once they hit 0, freezes the game and shows
  // the Game Over overlay.
  const loseLife = () => {
    const remaining = hud.loseLife();
    if (remaining > 0) {
      paddle.reset();
      const relaunch = randomLaunchVelocity();
      ball.reset(0, 0, relaunch.vx, relaunch.vy);
    } else {
      gameOver = true;
    }
  };

  // Called once the current level's brick grid is fully cleared. Loads the
  // next level and relaunches the ball with the current score/lives intact,
  // or -- once every level in LEVELS has been cleared -- freezes the game
  // and shows the You Win overlay instead.
  const advanceLevel = () => {
    levelIndex += 1;
    if (levelIndex >= LEVELS.length) {
      won = true;
      hud.showWin();
      return;
    }
    brickGrid.load(parseLevel(LEVELS[levelIndex]));
    hud.setLevel(levelIndex + 1);
    paddle.reset();
    const relaunch = randomLaunchVelocity();
    ball.reset(0, 0, relaunch.vx, relaunch.vy);
  };

  // Converts a canvas pixel coordinate (top-left origin) into the same
  // logical, center-origin, y-grows-downward coordinate space Ball/Paddle's
  // physics use -- the world-unit equivalent of what earlier GUI-based
  // samples did directly in pixels.
  const toWorld = (pointerX, pointerY) => ({
    x: (pointerX - engine.getRenderWidth() / 2) / worldToScreenScale,
    y: (pointerY - engine.getRenderHeight() / 2) / worldToScreenScale,
  });

  // The paddle follows the pointer's x position -- no click/drag needed,
  // unlike the slingshot samples' launch gesture. The pointer's full range
  // (-halfWidth..halfWidth) is remapped proportionally onto the paddle
  // center's actual range of motion (-maxPaddleX..maxPaddleX) rather than
  // handed to moveTo() 1:1 -- otherwise, since moveTo() clamps the paddle's
  // *center* to stay in bounds, the paddle center reaches its clamp before
  // the pointer reaches the screen edge, leaving a dead zone at each edge
  // where the pointer keeps moving but the paddle already stopped.
  scene.onPointerObservable.add((pointerInfo) => {
    if (pointerInfo.type !== BABYLON.PointerEventTypes.POINTERMOVE) return;
    if (gameOver || won) return;
    const { x } = toWorld(scene.pointerX, scene.pointerY);
    const maxPaddleX = halfWidth - paddle.halfWidth;
    paddle.moveTo((x / halfWidth) * maxPaddleX, halfWidth);
  });

  // Keyboard paddle control: Left/Right and A/D move the paddle at a
  // constant speed while held, applied once per frame below alongside the
  // pointer-driven movement above.
  const heldKeys = new Set();
  const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
  const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);
  window.addEventListener("keydown", (event) => {
    if (!LEFT_KEYS.has(event.code) && !RIGHT_KEYS.has(event.code)) return;
    event.preventDefault(); // arrow keys otherwise scroll the page
    heldKeys.add(event.code);
  });
  window.addEventListener("keyup", (event) => heldKeys.delete(event.code));

  const handleBounce = (bounce) => {
    if (!bounce) return;
    sparkSystem.spawn(bounce.x, -bounce.y, bounce.normalX, -bounce.normalY);
    playBounceSound(bounce.speed * worldToScreenScale);
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    // Sparks still finish animating out even while frozen on Game Over/Win.
    sparkSystem.update(dt);
    if (gameOver || won) return;

    let keyboardDx = 0;
    for (const key of heldKeys) {
      if (LEFT_KEYS.has(key)) keyboardDx -= PADDLE_KEYBOARD_SPEED * dt;
      if (RIGHT_KEYS.has(key)) keyboardDx += PADDLE_KEYBOARD_SPEED * dt;
    }
    if (keyboardDx !== 0) paddle.moveTo(paddle.x + keyboardDx, halfWidth);

    // openBottom: true -- the bottom wall no longer bounces the ball back;
    // instead a ball that falls all the way past it (fully offscreen, and
    // not intercepted by the paddle/brick checks below) costs a life.
    const bounces = ball.update(dt, { halfWidth, halfHeight, openBottom: true });
    for (const bounce of bounces) {
      handleBounce(bounce);
    }

    const brickHit = brickGrid.checkCollision(ball);
    if (brickHit) {
      handleBounce(brickHit.event);
      hud.recordScore(brickHit.points);
      if (brickGrid.isCleared()) {
        advanceLevel();
        if (won) return; // frozen now -- don't run this frame's paddle/miss checks
      }
    }

    handleBounce(ball.bounceOffPaddle(paddle));

    if (ball.y - ball.radius > halfHeight) {
      loseLife();
    }
  });

  return { scene, updateViewport };
};

const { scene, updateViewport } = createScene();
initAudio();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
  updateViewport();
});
