# Bouncing Circle

![Bouncing Circle](../../../img/bouncing_circle/bouncing_circle.png)

A minimal Babylon.js sample: a circle bounces around inside the browser window, reversing direction off each edge.

## Key code

**Engine, scene, and camera.** `BABYLON.Engine` wraps the canvas, a `Scene` holds everything, and a `FreeCamera` is the minimum needed for the scene to render. Nothing is ever pointed at in 3D here — the ball lives entirely in the GUI layer — so the camera just sits at the origin.

```js
const engine = new BABYLON.Engine(canvas, true);

const scene = new BABYLON.Scene(engine);
scene.activeCamera = new BABYLON.FreeCamera("camera", BABYLON.Vector3.Zero(), scene);
scene.clearColor = BABYLON.Color4.FromHexString("#202020FF");
```

**The "ball" is a GUI control.** A fullscreen `AdvancedDynamicTexture` overlays a 2D layer on the scene. Its coordinates are in pixels, with `(0, 0)` at the *center* of the screen.

```js
const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI", true, scene);

const circle = new BABYLON.GUI.Ellipse();
circle.width = radius * 2 + "px";
circle.height = radius * 2 + "px";
circle.thickness = 0;
circle.background = "white";
ui.addControl(circle);
```

**Per-frame update.** `scene.onBeforeRenderObservable` fires every frame before rendering. Scaling movement by `engine.getDeltaTime()` (milliseconds since the last frame) keeps the speed the same at any frame rate.

```js
scene.onBeforeRenderObservable.add(() => {
  const dt = engine.getDeltaTime() / 1000;
  const halfW = engine.getRenderWidth() / 2;

  x += vx * dt;
  if (x + radius > halfW) {
    x = halfW - radius; // snap back inside the wall
    vx = -vx;           // reverse direction
  }
  // ...same for the other three edges...

  circle.left = x;
  circle.top = y;
});
```

**Render loop and resize.** `runRenderLoop` draws the scene every frame; `engine.resize()` keeps the canvas matched to the window.

```js
engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
```

## Babylon.js features demonstrated

- `BABYLON.Engine` / `BABYLON.Scene` setup with a `FreeCamera`
- A fullscreen 2D GUI overlay (`BABYLON.GUI.AdvancedDynamicTexture`) with a `BABYLON.GUI.Ellipse` control
- Per-frame updates via `scene.onBeforeRenderObservable`

## Controls

- **Space** — save a PNG screenshot of the current frame
