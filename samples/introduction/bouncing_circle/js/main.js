const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

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

  circle.left = x;
  circle.top = y;

  scene.onBeforeRenderObservable.add(() => {
    const dt = engine.getDeltaTime() / 1000;
    const halfW = engine.getRenderWidth() / 2;
    const halfH = engine.getRenderHeight() / 2;

    x += vx * dt;
    y += vy * dt;

    if (x + radius > halfW) {
      x = halfW - radius;
      vx = -vx;
    } else if (x - radius < -halfW) {
      x = -halfW + radius;
      vx = -vx;
    }

    if (y + radius > halfH) {
      y = halfH - radius;
      vy = -vy;
    } else if (y - radius < -halfH) {
      y = -halfH + radius;
      vy = -vy;
    }

    circle.left = x;
    circle.top = y;
  });

  return scene;
};

const scene = createScene();

engine.runRenderLoop(() => {
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
