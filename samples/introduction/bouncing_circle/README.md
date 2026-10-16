# Bouncing Circle

![Bouncing Circle](../../img/bouncing_circle/bouncing_circle.png)

A minimal Babylon.js sample: a circle bounces around inside the browser window, reversing direction off each edge.

## Babylon.js features demonstrated

- `BABYLON.Engine` / `BABYLON.Scene` setup with a `FreeCamera`
- A fullscreen 2D GUI overlay (`BABYLON.GUI.AdvancedDynamicTexture`) with a `BABYLON.GUI.Ellipse` control
- Per-frame updates via `scene.onBeforeRenderObservable`

## Controls

- **Space** — save a PNG screenshot of the current frame
