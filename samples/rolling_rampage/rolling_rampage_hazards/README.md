# Rolling Rampage Hazards

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 6 of the Rolling Rampage series. Builds on [Rolling Rampage Clock](../rolling_rampage_clock/README.md). What's new is that the course **fights back**. There is a new level, **Hazard Alley**, with a **moving platform** that shuttles across a gap too wide to roll over, a **piston** that shoots up out of the floor and throws the marble, and a puddle of **slime** that slows the marble and dissolves it if it stays in. Press **N** twice to get to it.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the Clock sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo.

**Slime is a number that builds up and wears off.** `Exposure` goes from 0 (clean) to 1 (dissolved): up while the marble is in a puddle, down while it is out, at different speeds, so a dash through is safe and a stop is not. It counts the puddles the marble is in, because it can be in two at once. It is plain numbers, with a test for every rule.

**A puddle is a zone that says when the marble leaves.** Zones already said when the marble came in. A checkpoint only cares about that, but slime cares about the whole visit, so `buildZones` now also takes an `onExit`, from the physics' `TRIGGER_EXITED`. A puddle also has a `radius` of its own (`zoneRadius`), since it isn't the size of a checkpoint. The marble in slime is slowed with more damping and tinted green with an emissive colour, both by `Marble` methods that `reset` undoes.

**A mover is a function of time.** `moverCenter(mover, time)` says where a platform or a piston is. A platform's wave is a cosine, so it eases at the ends, and a piston's is a snap: it waits half its cycle, shoots up, stays up, and sinks back more gently. Because it is only numbers, the tests check it exactly. `moverVelocity` is how far it moved over how long, from the same function, so the two can't disagree.

**Animated bodies push, and are not pushed.** A mover is a box with `PhysicsMotionType.ANIMATED`. The game says where it should be each frame (`setTargetTransform`), and Havok works out the speed, so a marble on it is dragged and one over a piston is thrown. A piston is a deep box, most of it inside the hollow floor.

**A rolling ball is left behind by a floor that moves.** That isn't a bug: a ball on a moving tray does exactly that, rolls toward the back and falls off. So the game does what platform games do. While the marble is standing on a platform, `Marble.carry` pulls its speed toward the platform's, a share of the difference each second (the same form as the camera's easing). It can still be steered across it. A test shows the same marble left behind without it, which is why it is there. To know *what* the marble stands on, the ground check now returns the mesh (`ground`) as well as a yes or no (`grounded`).

**A ray needs an up-to-date mesh.** A ray finds a mesh where its world matrix says it is, which is only recalculated when a frame is drawn. Tests draw none, so `carry` refreshes the movers' matrices first.

**No new CSS.** Nothing here is a new part of the page, so no new file in `css/`.

## Key code

**Where a mover is.**

```js
function moverWave(kind, u) {
  if (kind === "piston") {
    if (u < 0.5) return 0; // waiting
    if (u < 0.55) return (u - 0.5) / 0.05; // up in a snap
    if (u < 0.8) return 1; // held up
    return 1 - (u - 0.8) / 0.2; // and down, more gently
  }
  return (1 - Math.cos(2 * Math.PI * u)) / 2; // a platform eases
}
```

**A body the game moves.**

```js
aggregate.body.setMotionType(BABYLON.PhysicsMotionType.ANIMATED);
// every frame:
aggregate.body.setTargetTransform(new BABYLON.Vector3(at.x, at.y, at.z), BABYLON.Quaternion.Identity());
```

**Carrying a marble.**

```js
carry(platform, dt) {
  const speed = this.aggregate.body.getLinearVelocity();
  const give = 1 - Math.exp(-CARRY_GRIP * dt);
  this.aggregate.body.setLinearVelocity(
    new BABYLON.Vector3(speed.x + (platform.x - speed.x) * give, speed.y, speed.z + (platform.z - speed.z) * give)
  );
}
```

**Slime builds up and wears off.**

```js
tick(dt) {
  const change = this.inSlime ? dt / DISSOLVE_TIME : -dt / RECOVER_TIME;
  this.level = Math.min(1, Math.max(0, this.level + change));
}
```

**Hearing a trigger both ways.**

```js
const handler = event.type === "TRIGGER_ENTERED" ? onEnter : event.type === "TRIGGER_EXITED" ? onExit : null;
```

## Babylon.js features demonstrated

- Everything from Rolling Rampage Clock
- `PhysicsMotionType.ANIMATED` and `PhysicsBody.setTargetTransform`, for bodies the game moves
- `HavokPlugin.onTriggerCollisionObservable` with `TRIGGER_EXITED` as well as `TRIGGER_ENTERED`
- `Color3.Lerp`, and `emissiveColor` on a material, for a tint
- `Mesh.computeWorldMatrix(true)`, to bring a mesh up to date without drawing a frame
- `PickingInfo.pickedMesh`, to find out what a ray hit

## Controls

- **N**, or the **Next level** button: go to the next level. Press it twice for Hazard Alley
- **Arrow keys or WASD**, **touch and drag**, or **tilt**: roll the marble. Steer across a platform to get off it
- **R**, or the **Drop again** button: put the marble back at the last checkpoint, clean of slime
- **C**: save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, so it needs a connection. The new tests cover the slime rule, the zones' own radius and exit events, the marble slowed and tinted, the waves and the position and speed of every kind of mover, that every mover of every level meets the floor and stands clear of the start and the zones, and real movers with a real marble: carried across a platform (and left behind when not carried), steered across it, thrown by a piston, and left alone beside it.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md).

## Next up

[**Rolling Rampage Enemies**](../rolling_rampage_enemies/README.md) adds marbles that chase you.
