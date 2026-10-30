# Ghost Hunter Room

Step 1 of the Ghost Hunter series. A game for a phone starts with the phone: this sample shows **the camera's picture** on the page, draws a **see-through 3D scene** over it, and turns the camera of that scene to wherever the phone is pointing, using its **motion sensors**. Where there are no sensors (a desktop), you **drag** to look, and a dark room with a floor takes the place of the picture. It starts with a **start screen** that says what this phone can do and warns that the game is made to frighten.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from empty files. Run `node reset-tutorial.js` to return this folder to the start, to work through it yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel.

**The page is layers.** From the back: the `<video>` with the camera's picture (it fills the screen, with its edges cut off, not squeezed), the 3D canvas, which is **see-through** wherever nothing is drawn (the engine is made with `alpha: true`, and the scene's clear colour has an alpha of 0), and the things on the glass: the reticle, the line of words, the notices.

**Where the phone points is plain arithmetic.** `lookFromAngles` takes the three angles of a browser's `deviceorientation` event and the angle of the screen, and says which way the camera faces and which way the top of the screen points. No Babylon.js is in it, so the tests can say that a phone held upright faces along the ground, that turning it to the left turns the view to the left, that one lying face up looks at the floor, and that a phone turned on its side has the top of its screen to the side.

**The sensors have to prove themselves.** A desktop browser has the sensor code and never sends a reading, so having the sensors is not enough: the game waits to be sent a reading, and looks by dragging if none comes.

**An iPhone asks.** `askForMotion` asks for permission where the device wants to be asked, and it has to be called straight from a tap, so the button of the start screen asks first of all, before anything waits.

**Every way the camera can fail is words.** A refused camera, no camera, a camera that another app is using: each is a message on the screen, and the game carries on with the dark room.

## Key code

**Which way a phone is looking.**

```js
const [fx, fy, fz] = turn([0, 0, -1]); // out of the back of the phone
return { forward: [fx, fz, fy], up: [ux, uz, uy] }; // (east, north, up) -> (x, y, z) of the game
```

**A see-through scene.**

```js
const engine = new BABYLON.Engine(canvas, true, { alpha: true, preserveDrawingBuffer: true, stencil: true });
scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
```

**The camera follows the phone.**

```js
BABYLON.Matrix.FromXYZAxesToRef(right, up, forward, axes);
BABYLON.Quaternion.FromRotationMatrixToRef(axes, eye.rotationQuaternion);
```

## Babylon.js features demonstrated

- A transparent canvas over a `<video>` element
- Setting a camera's `rotationQuaternion` from three axes
- Glowing materials, billboards and a `DynamicTexture` for labels, fog, and `GridMaterial`
- (The looking, the support checks and the camera's messages need no Babylon.js: they are plain code, tested without it.)

## Controls

- **Turn the phone** to look around (allow the camera and the motion sensors when it asks)
- **Drag** to look around where there are no sensors
- **R** puts the way you are facing now at the front (bearing 000)
- With **`?dev`**: read-outs of the sensor angles and the look source, a slider for the field of view and the drag speed, and buttons to recentre and to switch between the sensors and dragging. The key under Esc shows and hides the panel

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests check the look arithmetic (every direction of a phone, the screen turned on its side, the axes of a camera, and that Babylon.js faces the way the arithmetic says), looking by dragging, the support checks of every kind of device, the permission, the camera with a stand-in for the browser's camera (shown, refused, none, stopped), the start screen, and the developer panel.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the fonts are Rubik Wet Paint and Share Tech Mono, both under the SIL Open Font Licence.

## Next up

The second sample is **Real AR**: on an Android phone, the browser can find the floor and the walls of the room itself (WebXR), and the game can stand a reticle on the floor and keep things where they were put.
