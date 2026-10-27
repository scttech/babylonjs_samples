# Rolling Rampage World

<img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage" width="360">

Step 1 of the Rolling Rampage series: an isometric marble game in the spirit of the classic arcade games, with real physics, built to be played on a phone as well as a desktop. This first step is the world: a steel **marble** that rolls down a **course** of ramps and decks under the **Havok** physics engine, seen through an **isometric camera**, on a page that fits a phone from the start. Nothing is steered yet: the marble drops onto the top of the ramp, rolls down it, bounces, slows on the flat, falls off the end, and is put back to drop again (**R**, or the *Drop again* button, does it by hand).

This sample is also a [step-by-step tutorial](TUTORIAL.md) you can work through yourself, starting from empty files. Run `node reset-tutorial.js` to return this folder to the tutorial's starting point.

The page can usually be opened from a file, since there are no models to load (the physics engine comes from the same place as Babylon.js), but a web server is safer: run `npx serve` in the repo root and open the sample through `http://localhost`, or use the live demo.

**Physics is a description, not a program.** Havok moves every body and handles every collision. We say what exists (a ball, a floor), how heavy it is, and how grippy and bouncy its surface is (`friction`, `restitution`), and what gravity is. A body with `mass: 0` never moves, and one with mass rolls. The numbers are in one place (`GRAVITY`, `SURFACES`, `MARBLE_DAMPING`), because tuning them is most of the work of making a game like this feel good.

**A rolling marble needs damping.** A ball rolling on a flat floor rolls for ever: rolling grips, and gripping uses up no speed. Real marbles slow down from tiny dents and the air. Damping fakes that: each second the body loses a fraction of its speed and its spin.

**The course is data.** Each slab is the line of its top surface seen from the side (where it starts and ends). `slabShape` turns that into a box: its length is the line's length, its tilt the line's angle, and it is put half its thickness *below* the line, so the top lies exactly along it. That makes levels easy to write, and a test checks that the top of every real box lands on its line, tilt direction included.

**Physics is tested by letting time pass.** The tests run the real Havok in a `NullEngine` (an engine that draws nothing) and step the world by hand in fixed sixtieths of a second with `stepPhysics`, so the answers are the same every time. They say what a marble should *do*: land with its middle one radius above the floor, roll down the ramp and get faster, slow on the flat, fall off an edge, reset and roll again.

**Isometric means equal angles.** The camera is turned 45 degrees about the vertical and tipped down 35.26 degrees, so all three axes slope the same on screen, and it is **orthographic**: no perspective, so a ramp is as wide at the top of the screen as at the bottom. The visible box is worked out from the shape of the screen so that at least a fixed width and height always show: a wide screen is limited by its height, and a phone held upright by its width.

**A page for a phone, from the start.** The `viewport` tag, no scroll, zoom or text selection under a finger, a button for what a key would do, and `setHardwareScalingLevel` so a phone draws at most twice as many pixels as the page's units instead of three times as many.

**The look comes from the logo.** The colors (gunmetal, chrome, hazard yellow, safety orange, one sky blue) and the three fonts (Russo One for big words, Barlow Condensed for everything small, Saira Stencil One for a few labels) are named once at the top of `css/game.css` and used by name. The button has a hazard-stripe border made from a `repeating-linear-gradient` used as a `border-image`.

**A shadow is a depth cue, and its area has to follow the action.** In an isometric view there is no perspective to say whether the marble is on the floor or above it, and the shadow it casts on the floor does. A shadow is drawn into a picture of the scene as the sun sees it, and that picture only covers a square of the world (`SHADOW_AREA` wide). Spread over the whole course every shadow would be a blur, so the sun is moved with the marble every frame (`sunPosition`), which keeps the square around it. Only the marble casts a shadow, and the slabs receive it.

## Key code

**A course, as data, turned into boxes.**

```js
const COURSE = [
  { name: "start deck", from: [-14, 4], to: [-6, 4], z: 0, depth: 8 },
  { name: "ramp", from: [-6, 4], to: [6, 0], z: 0, depth: 6 },
];

function slabShape(slab, thickness = THICKNESS) {
  const [x1, y1] = slab.from;
  const [x2, y2] = slab.to;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const up = { x: -Math.sin(angle), y: Math.cos(angle) };
  return { x: (x1 + x2) / 2 - (up.x * thickness) / 2, y: (y1 + y2) / 2 - (up.y * thickness) / 2, length: Math.hypot(x2 - x1, y2 - y1), angle, /* ... */ };
}
```

**A marble is a dynamic body.**

```js
this.aggregate = new BABYLON.PhysicsAggregate(this.mesh, BABYLON.PhysicsShapeType.SPHERE, { mass: MARBLE_MASS, ...SURFACES.steel }, scene);
this.aggregate.body.setLinearDamping(MARBLE_DAMPING.linear);
this.aggregate.body.setAngularDamping(MARBLE_DAMPING.angular);
```

**Letting time pass in a test.**

```js
placeAt(-4, 4.1, 0); // on the ramp
stepPhysics(scene, 0.5);
const slow = marble.speed;
stepPhysics(scene, 0.5);
assert.true(marble.speed > slow);
```

**A view that fits any screen.**

```js
function viewHalfExtents(aspect, width = VIEW_WIDTH, height = VIEW_HEIGHT) {
  const halfHeight = Math.max(height / 2, width / 2 / aspect);
  return { halfWidth: halfHeight * aspect, halfHeight };
}
```

**Easing that doesn't depend on the frame rate.**

```js
const k = 1 - Math.exp(-rate * dt);
return { x: current.x + (target.x - current.x) * k, /* ... */ };
```

## Babylon.js features demonstrated

- The Havok physics engine: `HavokPlugin`, `scene.enablePhysics`, `PhysicsAggregate`, shapes, friction, restitution, damping, fixed and dynamic bodies
- `NullEngine`: running a scene with nothing drawn, for tests
- An orthographic `ArcRotateCamera`, and its `ortho*` edges
- `DynamicTexture`, texture wrapping, and `faceUV` on a box
- `DirectionalLight` with a `ShadowGenerator`: a fixed `shadowFrustumSize`, percentage-closer filtering and `bias`
- `engine.setHardwareScalingLevel`, `engine.onResizeObservable`

## Controls

- **R**, or the **Drop again** button — put the marble back at the top and drop it again
- **C** — save a PNG screenshot of the current frame

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. It loads Babylon.js and Havok from the internet, like the game, so it needs a connection. The tests cover the physics numbers and a real physics world, the course data and the slab geometry (including a check that every real box lies along the line it was described by), the marble on the real course (landing, rolling, slowing, falling, resetting), the isometric angles, the view box for every screen shape, the camera's easing, and the splash timing.

## Credits

The logo was made for this project, and the fonts are Russo One, Barlow Condensed and Saira Stencil One, from Google Fonts, under the SIL Open Font License, as listed in [the assets README](../assets/README.md).

## Next up

[**Rolling Rampage Marble**](../rolling_rampage_marble/README.md) steers the marble with the keyboard and a thumb on a touch screen.
