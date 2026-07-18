const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

const SPARK_COLORS = ["#fff59d", "#ffca28", "#ff7043", "#ffffff"];

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

const createScene = () => {
  const scene = new BABYLON.Scene(engine);

  // Create an active camera for the scene
  scene.activeCamera = new BABYLON.FreeCamera("camera", BABYLON.Vector3.Zero(), scene);

  // Use Aurora Black for the background
  scene.clearColor = BABYLON.Color4.FromHexString("#202020FF");

  // Fullscreen 2D UI layer
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

  const radius = 40;
  const circle = new BABYLON.GUI.Ellipse();
  circle.width = radius * 2 + "px";
  circle.height = radius * 2 + "px";
  circle.thickness = 0;
  circle.background = "white";
  ui.addControl(circle);

  // Position is tracked in pixels relative to screen center (Babylon GUI convention)
  let x = 0;
  let y = 0;
  let vx = 260; // pixels per second
  let vy = 190;
  let rotation = 0;

  circle.left = x;
  circle.top = y;

  // --- Spark particles ---
  // Lightweight GUI-based particles (no 3D mesh space is available here since
  // the ball lives entirely in the fullscreen GUI overlay).
  const sparks = [];
  const GRAVITY = 500; // px/s^2, pulls sparks downward
  const DRAG = 0.985; // per-frame velocity damping

  const spawnSparks = (px, py, normalX, normalY) => {
    const count = 14 + Math.floor(Math.random() * 8);
    const baseAngle = Math.atan2(normalY, normalX);
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 0.8; // ~±72°
      const angle = baseAngle + spread;
      const speed = 140 + Math.random() * 260;
      const svx = Math.cos(angle) * speed;
      const svy = Math.sin(angle) * speed;
      const life = 0.25 + Math.random() * 0.35;
      const color = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];

      const control = new BABYLON.GUI.Rectangle();
      control.width = "5px";
      control.height = "2px";
      control.thickness = 0;
      control.background = color;
      control.left = px + "px";
      control.top = py + "px";
      control.rotation = angle;
      ui.addControl(control);

      sparks.push({ control, x: px, y: py, vx: svx, vy: svy, life, maxLife: life });
    }
  };

  const updateSparks = (dt) => {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.vy += GRAVITY * dt;
      s.vx *= DRAG;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;

      if (s.life <= 0) {
        ui.removeControl(s.control);
        s.control.dispose();
        sparks.splice(i, 1);
        continue;
      }

      const t = s.life / s.maxLife;
      s.control.left = s.x;
      s.control.top = s.y;
      s.control.alpha = t;
      s.control.rotation = Math.atan2(s.vy, s.vx);
    }
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    const halfW = engine.getRenderWidth() / 2;
    const halfH = engine.getRenderHeight() / 2;

    x += vx * dt;
    y += vy * dt;

    if (x + radius > halfW) {
      x = halfW - radius;
      vx = -vx;
      spawnSparks(x + radius, y, -1, 0);
      playBounceSound(Math.hypot(vx, vy));
    } else if (x - radius < -halfW) {
      x = -halfW + radius;
      vx = -vx;
      spawnSparks(x - radius, y, 1, 0);
      playBounceSound(Math.hypot(vx, vy));
    }

    if (y + radius > halfH) {
      y = halfH - radius;
      vy = -vy;
      spawnSparks(x, y + radius, 0, -1);
      playBounceSound(Math.hypot(vx, vy));
    } else if (y - radius < -halfH) {
      y = -halfH + radius;
      vy = -vy;
      spawnSparks(x, y - radius, 0, 1);
      playBounceSound(Math.hypot(vx, vy));
    }

    // Roll the ball like a wheel: spin rate follows horizontal speed, as if
    // rolling along whichever horizontal surface (top/bottom) it last touched.
    rotation += (vx / radius) * dt;

    circle.left = x;
    circle.top = y;
    circle.rotation = rotation;

    updateSparks(dt);
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
