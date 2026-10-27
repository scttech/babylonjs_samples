# Rolling Rampage Marble

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 2 of the Rolling Rampage series. Builds on [Rolling Rampage World](../rolling_rampage_world/README.md), reusing its physics world, course, marble and isometric camera. What's new is that you can **steer**: the arrow keys or WASD on a keyboard, and a **thumb dragged anywhere on the screen** on a phone, both roll the marble. A floating stick is drawn under the thumb, a ring where it touched with a knob that follows it.

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from the World sample. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo. To try the touch stick without a phone, use Chrome's device mode (F12, then Ctrl+Shift+M).

**Every input is boiled down to one stick.** A stick is `{ x, y }`: how far right and up the player is pushing, as seen on the screen, from -1 to 1, and never longer than 1. The keyboard makes one (opposite keys cancel, a diagonal is no stronger than a straight push), a thumb makes one (with a dead zone, scaled to the screen), and the two are added. From there it is always: a stick on the screen, then a direction in the world, then a force on the marble.

**The push is relative to the camera.** The camera looks across the course from a corner, so "up on the screen" is not along an axis of the world: it is away from the camera, along the diagonal. `worldDirection` turns a stick into a flat direction using the camera's own angle (`camera.alpha`), so if the camera ever turned, the controls would turn with it. A test checks the result through a real camera's view matrix: pushing up rolls the marble up the screen, and not across it.

**A force, not a speed.** The marble isn't told how fast to go. It is pushed with `applyForce` every frame the player is pushing, through its middle (so friction with the floor makes it roll instead of slide), so it accelerates, keeps its speed when you let go, and rolls on down slopes. The push fades as the marble nears `TOP_SPEED` *in the direction of the push*, is up to twice as strong when the marble is going the other way (so it turns round quickly), and is a quarter as strong in the air.

**The ground is found with a ray.** `grounded` shoots a ray from the marble's middle straight down: if a body is within the marble's radius and a little more, it is on the ground. The little extra means a marble that is bouncing, or sitting on a slope, still counts.

**A virtual stick under a thumb.** Wherever the thumb first lands is the middle of the stick, so the player can steer with their eyes on the marble. `y` is turned over (a screen's gets bigger going down). The dead zone means a resting thumb doesn't creep the marble along, and the push is rescaled to start at the edge of it, so there's no jump. The radius is a fraction of the screen's smaller side, so the reach feels the same on a phone and a tablet.

**Input is state, read every frame.** `KeyboardInput` keeps a set of the keys held, and `StickControls` the stick; the game reads them when it needs them. A window that loses focus clears the keys, because the browser never sends the `keyup` for a key held at the time, and the marble would roll for ever.

## Key code

**From a stick to a direction in the world.**

```js
function worldDirection(stick, alpha) {
  const forward = { x: -Math.cos(alpha), z: -Math.sin(alpha) }; // away from the camera, along the ground
  const right = { x: forward.z, z: -forward.x };
  return { x: right.x * stick.x + forward.x * stick.y, y: 0, z: right.z * stick.x + forward.z * stick.y };
}
```

**The push, faded near top speed.**

```js
const along = velocity.x * unit.x + velocity.z * unit.z;
const fade = Math.min(2, Math.max(0, 1 - along / TOP_SPEED));
const strength = STEER_FORCE * length * fade * (grounded ? 1 : AIR_CONTROL);
```

**Testing steering as the player sees it.**

```js
const moved = marble.position.subtract(before);
const view = BABYLON.Vector3.TransformNormal(moved, camera.getViewMatrix(true));
assert.true(view.y > 1);          // up the screen
assert.true(Math.abs(view.x) < 0.15); // and not across it
```

**Steering in the frame loop.**

```js
if (scene.physicsEnabled) {
  const stick = combineSticks(keyboard.stick, thumb.value);
  marble.push(worldDirection(stick, camera.alpha));
}
```

## Babylon.js features demonstrated

- Everything from Rolling Rampage World
- `PhysicsBody.applyForce`, and `getLinearVelocity` / `getAngularVelocity`
- `scene.pickWithRay` with a filter, for the ground check
- `Camera.getViewMatrix` and `Vector3.TransformNormal`, to see a world movement as the camera does
- Pointer events with `setPointerCapture`, for the touch stick

## Controls

- **Arrow keys or WASD** — roll the marble (up the screen is away from you along the diagonal)
- **Touch and drag anywhere** — a floating stick: drag the way you want to roll
- **R**, or the **Drop again** button — put the marble back at the start
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, so it needs a connection. The new tests cover the stick (clamping, the keys, combining), the direction in the world for any camera angle, the steering force (the fade, turning round, the air), the touch stick (the dead zone, the scale, the upside-down `y`, one finger), the marble on the ground and in the air, real pushes (does it roll, does it level off at top speed, can it turn round, does a push wake a sleeping body), pushes as seen through a real camera, and the keyboard and thumb controls with stand-ins for the page.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md).

## Next up

[**Rolling Rampage Tilt**](../rolling_rampage_tilt/README.md) steers the marble by tipping the phone, as a third kind of stick.
