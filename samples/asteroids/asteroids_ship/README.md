# Asteroids Ship

The first step in a new series: building Asteroids. Unlike the Breakout series, this one starts from a blank canvas rather than a previous sample, reusing only the project's conventions (an orthographic camera looking down the Z axis, plain `<script>` classes with a scene-optional split, QUnit tests). What's new is the thing that makes Asteroids *Asteroids*: a ship you rotate and thrust, whose momentum persists, in a world that wraps around.

**Rotate and thrust are separate.** Left/Right (or A/D) only change the ship's `angle`; Up (or W) adds acceleration along the current heading. Turning never touches velocity, so after thrusting you can spin around and keep drifting the way you were going — that decoupling of *where you point* from *where you move* is the whole feel of the game. `Ship.thrust()` converts the heading into a vector, `(-sin(angle), cos(angle))` (angle 0 = up, positive = counter-clockwise), adds it to the velocity scaled by `thrustAccel * dt`, and clamps the result to `maxSpeed`. A small `drag` is applied in `main.js` so the ship eventually coasts to a halt; the class defaults to zero drag (pure inertia).

**Screen wrap.** Nothing bounces in Asteroids — leave one edge and you reappear on the opposite one. `Ship.update()` waits until the ship is fully off-screen (past `halfWidth + radius`) before teleporting it to the matching position on the other side, so it slides out of view completely instead of popping across while still half visible. It returns `{ wrappedX, wrappedY }` so later samples can react (e.g. wrapping bullets and rocks the same way).

**Y goes up now.** The Breakout classes kept physics in a y-grows-downward space and flipped it only when syncing the mesh. With rotation in the mix that is an easy source of backwards angles, and nothing here shares a coordinate space with GUI pixels, so `Ship` uses the world's own y-up coordinates throughout and its mesh sync is a straight copy.

**Frame-rate independence.** Held keys are collected in a `Set` and applied once per `onBeforeRender` with the frame's `dt`, so holding a key behaves identically at 30 or 144 fps. `dt` is clamped to 50 ms so a backgrounded tab doesn't launch the ship across the map when it wakes up, and held keys are cleared on window blur so alt-tabbing doesn't leave the thrusters stuck on.

**Vector-style art.** The hull and exhaust flame are `BABYLON.MeshBuilder.CreateLines` meshes — an unlit outline, true to the original arcade look. The flame is parented to the hull, so it inherits position and rotation for free, and is simply shown or hidden each frame depending on whether the ship thrust.

## Key code

**Heading to velocity.** With angle 0 pointing up and positive turning counter-clockwise, the forward vector is `(-sin(angle), cos(angle))`. Thrust adds that, scaled by acceleration and `dt`, to the *velocity*. The ship's position only ever changes through velocity, which is what gives it inertia.

```js
rotate(direction, dt) {
  this.angle += direction * this.turnSpeed * dt;
}

thrust(dt) {
  this.thrusting = true;
  this.vx += -Math.sin(this.angle) * this.thrustAccel * dt;
  this.vy += Math.cos(this.angle) * this.thrustAccel * dt;
  this._clampSpeed();
}
```

**Integrating, with optional drag.**

```js
if (this.drag > 0) {
  const keep = Math.max(0, 1 - this.drag * dt);
  this.vx *= keep;
  this.vy *= keep;
}
this.x += this.vx * dt;
this.y += this.vy * dt;
```

**Screen wrap.** The ship teleports only once it is fully past an edge (by its radius), so it slides out of view before reappearing on the opposite side.

```js
const limitX = halfWidth + this.radius;
if (this.x > limitX) {
  this.x = -limitX;
  wrappedX = true;
} else if (this.x < -limitX) {
  this.x = limitX;
  wrappedX = true;
}
// ...same for y with halfHeight...
```

**A line-art ship with a parented flame.** `CreateLines` draws an unlit polyline, which gives the vector-arcade look. Repeating the first point closes the shape. The flame is a second line mesh whose `parent` is the hull, so it inherits the hull's position and rotation without any extra code.

```js
this.mesh = BABYLON.MeshBuilder.CreateLines(
  "ship",
  {
    points: [
      new BABYLON.Vector3(0, r, 0), // nose
      new BABYLON.Vector3(-0.7 * r, -0.8 * r, 0),
      new BABYLON.Vector3(0, -0.4 * r, 0), // rear notch
      new BABYLON.Vector3(0.7 * r, -0.8 * r, 0),
      new BABYLON.Vector3(0, r, 0), // back to the nose
    ],
  },
  scene
);
this.mesh.color = BABYLON.Color3.FromHexString(color);

this.flame = BABYLON.MeshBuilder.CreateLines("shipFlame", { points: [/* ... */] }, scene);
this.flame.color = BABYLON.Color3.FromHexString("#ffb347");
this.flame.parent = this.mesh;
this.flame.isVisible = false;
```

**Syncing the mesh.** No y flip here. Rotating about Z turns the mesh, and the flame is shown only on frames where `thrust()` was called, since `update()` clears the flag.

```js
_syncMesh() {
  if (!this.mesh) return;
  this.mesh.position.x = this.x;
  this.mesh.position.y = this.y;
  this.mesh.rotation.z = this.angle;
  this.flame.isVisible = this.thrusting;
}
```

**Held-key input, once per frame.** Keys go in a `Set` and are applied in the render loop with a clamped `dt`, so behavior is the same at any frame rate and a long pause can't launch the ship. Clearing on `blur` prevents stuck keys after alt-tabbing.

```js
window.addEventListener("keydown", (event) => {
  if (!isControlKey(event.code)) return;
  event.preventDefault(); // arrow keys otherwise scroll the page
  heldKeys.add(event.code);
});
window.addEventListener("keyup", (event) => heldKeys.delete(event.code));
window.addEventListener("blur", () => heldKeys.clear());

scene.onBeforeRenderObservable.add(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);

  const turn = (anyHeld(LEFT_KEYS) ? 1 : 0) - (anyHeld(RIGHT_KEYS) ? 1 : 0);
  if (turn !== 0) ship.rotate(turn, dt);
  if (anyHeld(THRUST_KEYS)) ship.thrust(dt);

  ship.update(dt, { halfWidth, halfHeight });
});
```

## Babylon.js features demonstrated

- `BABYLON.MeshBuilder.CreateLines` for unlit, wireframe-style line art, with a parented child mesh that inherits its parent's transform
- Rotating a mesh about Z (`mesh.rotation.z`) under an orthographic camera
- Frame-rate-independent, held-key input (a `Set` of pressed `event.code`s, applied once per frame with `engine.getDeltaTime()`)
- Newtonian movement and screen-wrap math with no physics engine involved

## Controls

- **Left/Right arrow keys or A/D** — rotate the ship
- **Up arrow or W** — thrust
- **R** — reset the ship to the center, at rest
- **C** — save a PNG screenshot of the current frame (Space is reserved for firing in the next sample, so this series moves the shared screenshot shortcut via `window.SCREENSHOT_KEY`)

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to execute the QUnit suite against `js/ship.js`.

## Next up

[Asteroids](../README.md) continues with bullets.
