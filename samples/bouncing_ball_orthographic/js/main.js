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

// --- World-space / orthographic-camera tuning ---
// The viewport's vertical half-extent always maps to this many world units,
// no matter the window size -- halfWidth is derived from it every resize so
// a full drag pull, the physics bounds, and what's on screen always agree.
const WORLD_HALF_HEIGHT = 5;
const BALL_RADIUS = 0.6;
const MAX_LAUNCH_SPEED = 16; // world units/s reached at a full-strength pull
const GRAB_PADDING = 0.3; // extra world units beyond the ball's radius that still grabs it
const MIN_PULL = 0.08; // pulls shorter than this (world units) don't show/count as a launch

const createScene = () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString("#202020FF");

  // An orthographic camera looking straight down the Z axis: no perspective
  // distortion, so flat "2D" gameplay still reads correctly even though the
  // ball is now a real mesh living in a 3D world, not a flat GUI control.
  const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 0, -10), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.setTarget(BABYLON.Vector3.Zero());
  scene.activeCamera = camera;

  // A light so the ball's material actually shows shading -- the visual
  // payoff of switching from a flat GUI circle to a real lit mesh.
  const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0.3, 1, -0.4), scene);
  light.intensity = 0.9;

  // Fullscreen 2D UI layer, unchanged from the previous sample: sparks and
  // the HUD stay in screen space, overlaid on top of the 3D world.
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

  // The ball starts at rest, waiting to be pulled back and launched.
  const ball = new Ball({ scene, x: 0, y: 0, vx: 0, vy: 0, radius: BALL_RADIUS });
  const sparkSystem = new SparkSystem({ ui });
  const indicator = new SlingshotIndicator({ ui });
  const hud = new Hud({
    ui,
    onReset: () => {
      indicator.hide();
      ball.reset(0, 0);
      hud.resetBounceCount();
    },
  });

  // Converts a canvas pixel coordinate (top-left origin) into the same
  // logical, center-origin, y-grows-downward coordinate space Ball's physics
  // use -- the world-unit equivalent of what earlier GUI-based samples did
  // directly in pixels. The literal 3D mesh is the only thing that needs a Y
  // flip (see Ball._syncMesh()); pointer/physics/spark math never sees it.
  const toWorld = (pointerX, pointerY) => ({
    x: (pointerX - engine.getRenderWidth() / 2) / worldToScreenScale,
    y: (pointerY - engine.getRenderHeight() / 2) / worldToScreenScale,
  });

  const getMaxDragDistance = () => halfHeight * 0.6;

  const endDrag = () => {
    if (!ball.dragging) return;
    indicator.hide();
    ball.release(getMaxDragDistance(), MAX_LAUNCH_SPEED);
  };

  scene.onPointerObservable.add((pointerInfo) => {
    const { x, y } = toWorld(scene.pointerX, scene.pointerY);

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERDOWN) {
      if (Math.hypot(x - ball.x, y - ball.y) <= ball.radius + GRAB_PADDING) {
        ball.beginDrag();
      }
      return;
    }

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
      if (!ball.dragging) return;
      const strength = ball.dragTo(x, y, getMaxDragDistance());

      const dx = ball.x - ball.anchorX;
      const dy = ball.y - ball.anchorY;
      const pullDistance = Math.hypot(dx, dy);
      if (pullDistance < MIN_PULL) {
        indicator.hide();
        return;
      }
      // The indicator is a screen-space GUI overlay, so its origin needs
      // converting from world units back into screen pixels.
      indicator.show(
        ball.x * worldToScreenScale,
        ball.y * worldToScreenScale,
        -dx / pullDistance,
        -dy / pullDistance,
        strength
      );
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
    const bounces = ball.update(dt, { halfWidth, halfHeight });
    for (const bounce of bounces) {
      // Sparks are also a screen-space GUI overlay, so the bounce point
      // (in world units) needs the same conversion as the indicator.
      sparkSystem.spawn(bounce.x * worldToScreenScale, bounce.y * worldToScreenScale, bounce.normalX, bounce.normalY);
      playBounceSound(bounce.speed * worldToScreenScale);
      hud.recordBounce();
    }

    sparkSystem.update(dt);
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
