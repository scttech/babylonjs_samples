# Parkour Runner World

<img src="../parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 1 of the Parkour Runner series. Nobody is running yet: this sample builds the **city street** the runner will run through, and lets you walk a camera down it to look around. It's real 3D from the start: models for the road, sidewalks, buildings and street lights, a perspective camera, fog and two lights. A **splash screen** covers the page while the street loads and stays for at least three seconds.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from empty files. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**Pieces, not a scene file.** The street is a handful of pieces from the Kenney City Kits repeated down a long road: a road tile, a sidewalk tile, a street light, and a dozen different buildings. Each piece is loaded from its `.glb` file **once** and kept hidden as a template. Every copy in the street is an **instance** of the template, a new node that shares the template's geometry and materials, so a street of a hundred pieces costs about as much as the fifteen different ones.

**Pieces are fitted, not trusted.** A model comes out of its file centered wherever its artist chose, so `centerOnGround` works out how to move a piece so it sits centered on the ground at its own origin. After that, "this building is at x = 12, z = 30" means exactly that. The Kenney pieces were also drawn about seven times too small for the runner who will arrive in the next step (a road tile is 1 unit wide, a person is 1.8 units tall), so every piece is scaled by `WORLD_SCALE = 7`, which makes a road tile 7 units wide and a shipping container the height of a real one.

**The road is sunk.** The road and sidewalk tiles are a slab 0.14 thick after the scale. Drawn standing on the ground, their top would be 0.14 up, and anything standing at y = 0 (the runner, from the next sample on) would have its feet inside the road. So the tiles are drawn sunk by `ROAD_HEIGHT`, which puts the top of the street at y = 0.

**The layout is plain numbers.** `streetLayout` is a pure function: it returns a list of `{ piece, x, z, rotationY }` and doesn't touch Babylon.js, so it's easy to test. Buildings are chosen with an injectable random-number function, and `seededRandom(seed)` makes the same street every time you load the page. Each building is turned a quarter turn to face the road, from whichever side it stands on.

**A perspective camera, and a world with distance.** Earlier series used an orthographic camera, where distance makes no difference to size. Here the camera is a `FreeCamera` with a field of view, so things in the distance shrink toward a vanishing point. **Fog** fades faraway buildings into the sky color, which hides the end of the street and makes the world feel bigger than it is. A soft `HemisphericLight` and a stronger `DirectionalLight` give every building a bright side and a dark side.

**A splash that doesn't flash.** The page opens on the Parkour Runner picture. When the street is ready, `remainingSplashTime` works out how much of a three-second minimum is left, the game waits that long, and the splash fades away. If loading fails, the splash stays and explains what to do instead.

**A scout to look around with.** `Scout` is just a position that moves along the street between two limits. The camera follows it with the keys, so you can look at the whole street before anyone runs down it.

## Key code

**Centering a piece on the ground.** Plain arithmetic, in scaled units, so it is easy to test.

```js
function centerOnGround(min, max, scale) {
  return {
    x: -((min.x + max.x) / 2) * scale,
    y: -min.y * scale,
    z: -((min.z + max.z) / 2) * scale,
  };
}
```

**Loading a piece once, as a hidden template.**

```js
const result = await BABYLON.SceneLoader.ImportMeshAsync("", `${this.baseUrl}${folder}`, `${file}.glb`, this.scene);
const loaded = result.meshes[0]; // the loader's root; everything hangs from it
const bounds = loaded.getHierarchyBoundingVectors(true);
const offset = centerOnGround(bounds.min, bounds.max, this.scale);

loaded.scaling.scaleInPlace(this.scale); // keeps glTF's mirroring
loaded.position.x = offset.x;
loaded.position.y = offset.y;
loaded.position.z = offset.z;

const template = new BABYLON.TransformNode(name, this.scene);
loaded.parent = template;
template.setEnabled(false); // never drawn; only copied
```

**Placing a copy.** `instantiateHierarchy` makes a new node tree whose meshes are instances of the template's.

```js
const copy = template.instantiateHierarchy(null);
copy.position.x = x;
copy.position.y = y;
copy.position.z = z;
copy.rotation.y = rotationY;
```

**A repeatable street.** A seeded random-number generator, passed in where `Math.random` would otherwise be used.

```js
const layout = streetLayout({ rows: 24, random: seededRandom(7) });
await library.load(piecesUsed(layout)); // each piece is loaded once
for (const placement of layout) library.place(placement.piece, placement);
```

**Waiting for the splash.** The street draws behind the splash as soon as it's built; `delay` holds the splash up for whatever is left of its minimum time.

```js
await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
splash.classList.add("hidden"); // fades out through a CSS transition
setTimeout(() => splash.remove(), 700); // after the fade has finished
```

**Fog, camera and lights.**

```js
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogColor = BABYLON.Color3.FromHexString(SKY_COLOR);
scene.fogDensity = 0.014;

const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 3.4, -9), scene);
camera.rotation.x = 0.14; // tip it down a little
camera.fov = 0.9;

const sky = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(-0.5, -1, 0.45), scene);
```

## Babylon.js features demonstrated

- A perspective `FreeCamera` with `fov`, `rotation.x`, and near and far planes
- `scene.fogMode` with `FOGMODE_EXP2`, and a matching `clearColor`
- `SceneLoader.ImportMeshAsync` with `babylonjs.loaders.min.js`, bounding boxes, and wrapper `TransformNode`s
- `TransformNode.instantiateHierarchy`, which makes cheap copies that share geometry and materials
- `HemisphericLight` and `DirectionalLight` lighting loaded PBR materials
- An `async` `createScene`, and a splash screen (a CSS-faded overlay) that explains what to do if the models can't load

## Controls

- **Up arrow or W** — walk forward along the street
- **Down arrow or S** — walk back
- **R** — go back to the start
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The tests cover the street layout (rows, sidewalks, lights, buildings facing the road and not overlapping, a repeatable seed), the seeded random-number generator, `centerOnGround`, the `PieceLibrary` (through a stubbed `BABYLON`: loading once, scaling, centering, hidden templates, placing copies), and the scout's movement and limits, and the splash timing.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the City Kits), as listed in [the assets README](../assets/README.md).

## Next up

[Parkour Runner Runner](../parkour_runner_runner/README.md) brings the street to life with an animated runner who eases between three lanes.
