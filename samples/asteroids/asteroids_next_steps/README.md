# Asteroids Next Steps

Step 8 of the Asteroids series, and the last. Builds on [Asteroids Polish](../asteroids_polish/README.md); the gameplay is unchanged, but everything is now **lit 3D**: procedural rocks, **3D models** for the ships and both flying saucers, a **ship picker** on the title screen, and an optional **chase camera** on **V**.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Polish sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**Models are fitted, not trusted.** An artist's model arrives at any size, position and facing. `fitToSize` (plain arithmetic, easy to test) works out a scale and offset from the bounding box, and `loadModel` applies them under a wrapper `TransformNode`. The game then moves, spins and scales the wrapper as if it were a mesh it had built. An optional `rotation` corrects a model's facing once, up front, and `metallic` is capped because a fully metallic surface with nothing to reflect renders black without an environment map.

**Rocks stay procedural.** Each rock's existing 2D `shape` array lumpy-ups a sphere, so every rock keeps its personality without new random numbers. Normals are recomputed for faceted lit shading, and all rocks share one material.

**Shared, hidden-then-shown saucers.** The two UFO models are loaded once and enabled while a UFO of that size is flying. They lean toward the camera in the overhead view and sit level in the chase view (`setTilt`).

**Choosing a ship is data plus a tiny class.** `SHIPS` lists each ship's name, file and correcting `rotation`; `ShipPicker` only tracks which is selected and wraps at both ends. `Ship.useModel` swaps the hull while the root, the flame, the position and the angle carry over. On the title screen the real ship is the preview, scaled up and turning slowly.

**A chase camera made of plain numbers.** `ChaseCamera` computes where a camera behind and above the ship should be, and eases toward it with `1 - e^(-rate × dt)` so the feel doesn't depend on frame rate. It snaps instead of easing whenever the ship teleports (wrap, respawn, hyperspace).

## Key code

**Fitting a model to the game.**

```js
function fitToSize(min, max, size) {
  const largest = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
  const scale = largest > 0 ? size / largest : 1;
  return {
    scale,
    offset: {
      x: -((min.x + max.x) / 2) * scale,
      y: -((min.y + max.y) / 2) * scale,
      z: -((min.z + max.z) / 2) * scale,
    },
  };
}
```

**Loading a `.glb` under a wrapper.**

```js
const result = await BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, filename, scene);
const loaded = result.meshes[0]; // the loader's root; everything hangs from it
const bounds = loaded.getHierarchyBoundingVectors(true);
const fit = fitToSize(bounds.min, bounds.max, size);

loaded.scaling.scaleInPlace(fit.scale); // keeps glTF's mirroring
loaded.position.x = fit.offset.x;
loaded.position.y = fit.offset.y;
loaded.position.z = fit.offset.z;

const wrapper = new BABYLON.TransformNode(name, scene);
loaded.parent = wrapper;
```

**Two lights.**

```js
const ambient = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0, 1, -0.5), scene);
ambient.intensity = 0.55;
const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.5, -0.6, 1), scene);
sun.intensity = 0.9;
```

**Swapping the ship's hull.**

```js
useModel(model) {
  if (this.model) {
    this.model.parent = null;
    this.model.setEnabled(false);
  }
  this.model = model;
  model.setEnabled(true);
  model.parent = this.mesh;
}
```

**Choosing, with wrap-around.**

```js
step(direction) {
  const count = this.ships.length;
  this.index = (((this.index + direction) % count) + count) % count;
  return this.current;
}
```

**Loading every model at once.**

```js
const [ufoLargeModel, ufoSmallModel, ...shipModels] = await Promise.all([
  loadModel(scene, `${ASSETS}plaggy_cc0-ufo-621.glb`, { size: 1, name: "ufoLarge" }),
  loadModel(scene, `${ASSETS}jeremywoodsster-ufo-2582.glb`, { size: 1, name: "ufoSmall" }),
  ...SHIPS.map((choice) =>
    loadModel(scene, `${ASSETS}${choice.file}`, { size: SHIP_MODEL_LENGTH, name: choice.id, rotation: choice.rotation })
  ),
]);
```

**The chase camera.** A perspective camera whose "up" is toward the viewer, because the arena is a plane at `z = 0` seen from negative z.

```js
camera.mode = BABYLON.Camera.PERSPECTIVE_CAMERA;
camera.upVector = new BABYLON.Vector3(0, 0, -1);
camera.fov = 0.9;
```

## Babylon.js features demonstrated

- Everything from Asteroids Polish
- `SceneLoader.ImportMeshAsync` with `babylonjs.loaders.min.js`, bounding boxes, and wrapper `TransformNode`s
- `HemisphericLight` and `DirectionalLight` with `StandardMaterial`, plus a glowing `emissiveColor` + `disableLighting` exhaust cone
- Meshes built from `VertexData` with `ComputeNormals`
- `setEnabled` (cascades to children) instead of `isVisible`
- Switching between orthographic and perspective cameras, with `upVector`
- An `async` `createScene` and a loading message

## Controls

- **Enter** or **click** — start from the title screen
- **Left/Right arrow keys or A/D** — on the title screen, choose your ship; in play, rotate it
- **Up arrow or W** — thrust
- **Space** — fire (hold for auto-fire)
- **H** — hyperspace
- **V** — toggle the chase camera
- **P** — pause and resume
- **R** — restart (keeps your ship)
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample). The new tests cover `fitToSize` and `loadModel` (through a stubbed `BABYLON`), the ship table and `ShipPicker`, `Ship.attachModel`/`useModel`, the saucers with models and their lean, the HUD's ship choice, `rockPoint`, and the chase camera math.

## Credits

The rocket and the two saucers are CC0 models from Pixabay:

- 3D model by [arunangshubanerjee](https://pixabay.com/users/arunangshubanerjee-29054022/?utm_source=link-attribution&utm_medium=referral&utm_campaign=object3d&utm_content=2090) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=object3d&utm_content=2090) (the Rocket)
- 3D model by [Plaggy_CC0](https://pixabay.com/users/plaggy_cc0-51322723/?utm_source=link-attribution&utm_medium=referral&utm_campaign=object3d&utm_content=621) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=object3d&utm_content=621) (the large UFO)
- 3D model by [jeremywoodsster](https://pixabay.com/users/jeremywoodsster-25048718/?utm_source=link-attribution&utm_medium=referral&utm_campaign=object3d&utm_content=2582) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=object3d&utm_content=2582) (the small UFO)

The Fighter (`spaceship.glb`) was created for this project with [Meshy](https://www.meshy.ai).

The textures in the rocket, the fighter and the large UFO were resized to keep the files small; see [the assets README](../assets/README.md).
