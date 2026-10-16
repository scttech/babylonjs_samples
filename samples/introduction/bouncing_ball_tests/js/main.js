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

const createScene = () => {
  const scene = new BABYLON.Scene(engine);

  // Create an active camera for the scene
  scene.activeCamera = new BABYLON.FreeCamera("camera", BABYLON.Vector3.Zero(), scene);

  // Use Aurora Black for the background
  scene.clearColor = BABYLON.Color4.FromHexString("#202020FF");

  // Fullscreen 2D UI layer
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

  const ball = new Ball({ ui, vx: 260, vy: 190, radius: 40 });
  const sparkSystem = new SparkSystem({ ui });

  scene.onBeforeRenderObservable.add(() => {
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
