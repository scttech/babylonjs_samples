# Parkour Runner Runner

<img src="../assets/images/parkour_runner_splash.png" alt="Parkour Runner" width="480">

Step 2 of the Parkour Runner series. Builds on [Parkour Runner World](../parkour_runner_world/README.md), reusing its street, fog, lights and splash screen. What's new is the **runner**: an animated character who runs down the street by himself, **eases between three lanes** when you press ←/→, and is followed by a camera from behind. At the end of the street he stops and stands.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the World sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

**This one needs a web server.** Browsers won't let a page opened from a file load `.glb` models. Run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. (`tests.html` loads no models and still works from a file.)

**A character is a model, a skeleton and clips.** The runner's file holds a mannequin, its 65-bone skeleton, and a recording (a *clip*) of how the bones move for each action. Babylon.js's glTF loader hands each clip back as an *animation group*. The loader starts the first one by itself, so `loadCharacter` stops them all and switches on **blending**: when the game starts another clip, it fades in from the pose the character is in instead of snapping.

**The game logic never touches Babylon.js.** `Runner` is plain numbers: the lane it is heading for, where it actually is, how far along the street, and whether it is still running. `clipFor` chooses a clip from that state, and `followPosition` works out where the camera goes. Each frame, `main.js` does the same two things: update the numbers, then put the picture where the numbers say. That keeps the logic easy to test, and it is the shape every later step builds on.

**Lane changes ease, at any frame rate.** `approach` moves a value toward a target with `1 - e^(-rate × dt)`. A fixed fraction per frame would ease faster on a 144 Hz monitor than on a 60 Hz one; a share that depends on elapsed *time* gives the same movement everywhere, and two half-steps land exactly where one whole step does. `lane` changes the moment a key is pressed, and `x` follows over the next few frames.

**A lean, for free.** While the runner slides sideways, `heading` is `Math.atan2(vx, speed)`: the angle between straight ahead and where he is really going. The character is turned by that much, so he leans into every lane change and straightens up once he arrives.

**A camera that doesn't drag the world.** The camera copies only part of the runner's sideways move, so when he changes lanes he visibly crosses the picture instead of staying fixed in the middle while the street slides past.

## Key code

**Loading a character, and taking over its animation.**

```js
const result = await BABYLON.SceneLoader.ImportMeshAsync("", rootUrl, filename, scene);

const clips = new Map();
for (const group of result.animationGroups) {
  group.stop(); // the loader starts the first clip by itself
  group.enableBlending = true; // fade between clips instead of snapping
  group.blendingSpeed = CLIP_BLEND_SPEED;
  clips.set(group.name, group);
}

const root = new BABYLON.TransformNode(name, scene);
result.meshes[0].parent = root;
```

**Easing that doesn't depend on frame rate.**

```js
function approach(current, target, rate, dt) {
  return target + (current - target) * Math.exp(-rate * dt);
}
```

**Moving the runner.** Sideways eases toward the lane; forward is steady until the end of the street.

```js
update(dt) {
  const before = this.x;
  this.x = approach(this.x, laneX(this.lane), this.laneRate, dt);
  this.vx = dt > 0 ? (this.x - before) / dt : 0;

  if (!this.running) return;
  this.z = Math.min(this.endZ, this.z + this.speed * dt);
  if (this.z >= this.endZ) this.running = false;
}

get heading() {
  return Math.atan2(this.vx, this.speed);
}
```

**Choosing and playing a clip.** Safe to call every frame: asking for the clip that is already playing does nothing.

```js
function clipFor(runner) {
  return runner.running ? CLIPS.run : CLIPS.idle;
}

play(name) {
  if (name === this.current) return;
  const next = this.clips.get(name);
  if (!next) throw new Error(`The character has no clip called "${name}"`);

  if (this.current) this.clips.get(this.current).stop();
  next.start(true); // true loops
  this.current = name;
}
```

**The frame loop.** Update the numbers, then move the picture.

```js
scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
  runner.update(dt);

  character.root.position.set(runner.x, 0, runner.z);
  character.root.rotation.y = runner.heading;
  clips.play(clipFor(runner));

  const view = followPosition(runner);
  camera.position.set(view.x, view.y, view.z);
});
```

## Babylon.js features demonstrated

- Everything from Parkour Runner World (a perspective camera, fog, lights, instanced pieces, a splash screen)
- Loading a skinned, animated `.glb`, and `AnimationGroup`s: `start`, `stop`, `enableBlending` and `blendingSpeed`
- A `TransformNode` wrapper that the game moves and turns, with the loader's own mirrored root underneath
- Frame-rate independent movement from `engine.getDeltaTime()`
- A camera repositioned each frame from game state

## Controls

- **Left/Right arrow keys or A/D** — move one lane left or right (one lane per press)
- **R** — start again from the beginning
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against every file in `js/`. The new tests cover `loadCharacter` (through a stubbed `BABYLON`: stopping the loader's autoplay, blending, the clip map), `approach` (never overshoots, same result at any frame rate), the `Runner` (lanes and their limits, easing, running and stopping, the lean, restarting), `clipFor` and the `ClipPlayer` (through stand-in clips), and the camera's position.

## Credits

The 3D models are CC0 models from [Kenney](https://www.kenney.nl) (the street) and [Quaternius](https://quaternius.com) (the runner and his animations), as listed in [the assets README](../assets/README.md).

## Next up

[Parkour Runner Street](../parkour_runner_street/README.md) makes the street endless, recycling the pieces behind the runner so it never runs out.
