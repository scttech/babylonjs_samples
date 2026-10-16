const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// --- Procedural bounce sound ---
// Synthesized on the fly (thump + noise transient) via Babylon's Audio Engine
// V2, so the sample stays self-contained with no external audio asset to
// fetch or license.
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

// --- Slingshot tuning ---
const MAX_LAUNCH_SPEED = 1100; // px/s reached at a full-strength (maxDragDistance) pull
const GRAB_PADDING = 24; // extra px beyond the ball's radius that still grabs it
const MIN_PULL_PX = 6; // pulls shorter than this don't show/count as a launch

// Caps how far the ball can be pulled back, scaled down on small windows so
// a full pull always stays on screen.
const getMaxDragDistance = (engine) => {
  const shortSide = Math.min(engine.getRenderWidth(), engine.getRenderHeight());
  return Math.min(220, shortSide * 0.35);
};

const createScene = () => {
  const scene = new BABYLON.Scene(engine);

  // Create an active camera for the scene
  scene.activeCamera = new BABYLON.FreeCamera("camera", BABYLON.Vector3.Zero(), scene);

  // Use Aurora Black for the background
  scene.clearColor = BABYLON.Color4.FromHexString("#202020FF");

  // Fullscreen 2D UI layer
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

  // The ball starts at rest, waiting to be pulled back and launched.
  const ball = new Ball({ ui, x: 0, y: 0, vx: 0, vy: 0, radius: 40 });
  const sparkSystem = new SparkSystem({ ui });
  const indicator = new SlingshotIndicator({ ui });

  // Converts canvas pixel coordinates (top-left origin) into the GUI's
  // center-origin coordinate space, which is what Ball's x/y live in.
  const toLocal = (pointerX, pointerY) => ({
    x: pointerX - engine.getRenderWidth() / 2,
    y: pointerY - engine.getRenderHeight() / 2,
  });

  const endDrag = () => {
    if (!ball.dragging) return;
    indicator.hide();
    ball.release(getMaxDragDistance(engine), MAX_LAUNCH_SPEED);
  };

  scene.onPointerObservable.add((pointerInfo) => {
    const { x, y } = toLocal(scene.pointerX, scene.pointerY);

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      if (Math.hypot(x - ball.x, y - ball.y) <= ball.radius + GRAB_PADDING) {
        ball.beginDrag();
      }
      return;
    }

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
      if (!ball.dragging) return;
      const strength = ball.dragTo(x, y, getMaxDragDistance(engine));

      const dx = ball.x - ball.anchorX;
      const dy = ball.y - ball.anchorY;
      const pullDistance = Math.hypot(dx, dy);
      if (pullDistance < MIN_PULL_PX) {
        indicator.hide();
        return;
      }
      indicator.show(ball.x, ball.y, -dx / pullDistance, -dy / pullDistance, strength);
      return;
    }

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERUP) {
      endDrag();
    }
  });

  // Fallback for a release that happens outside the canvas (Babylon's
  // pointer observable only sees events targeting the canvas), so a drag
  // never gets stuck open.
  window.addEventListener("pointerup", endDrag);

  scene.onBeforeRenderObservable.add(() => {
    if (ball.dragging) return; // held in place while being pulled back

    const dt = engine.getDeltaTime() / 1000;
    const bounds = {
      halfWidth: engine.getRenderWidth() / 2,
      halfHeight: engine.getRenderHeight() / 2,
    };

    const bounces = ball.update(dt, bounds);
    for (const bounce of bounces) {
      sparkSystem.spawn(bounce.x, bounce.y, bounce.normalX, bounce.normalY);
      playBounceSound(bounce.speed);
    }

    sparkSystem.update(dt);
  });

  return scene;
};

const scene = createScene();
initAudio();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
