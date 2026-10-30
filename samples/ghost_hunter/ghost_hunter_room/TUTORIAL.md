# Tutorial: Ghost Hunter Room -- The Camera Behind the Scene

This is the first tutorial of a new series, **Ghost Hunter**: an augmented reality game for your phone, in which the camera shows the room you are standing in and the dead turn up in it. This first sample has no ghosts yet. It builds what every later sample stands on: **the camera's picture on the page, a see-through 3D scene drawn over it, and a camera in that scene that turns to wherever the phone is pointing.**

By the end you'll have:

- A **page made of layers**: the camera's picture at the back, a see-through 3D canvas over it, and the things of the game on the glass
- A **look at what a device can do**: camera, motion sensors, a secure page, a permission to ask, all worked out from a plain description so that the tests can describe any phone
- **Where a phone points as arithmetic**: from the three angles of the motion sensors to the directions of a camera, tested for a phone held upright, lying flat, turned on its side
- **Looking by dragging**, for a desktop and for a phone with no sensors, and **the motion sensors**, with the front made to be wherever you were facing when you started
- **The camera's picture** from the back camera, and a message in words for every way it can fail
- A **start screen** with a content warning (this game is made to frighten), which is also the tap a phone needs before it hands over the camera
- A **scene** to look at: a ring of glowing posts with their bearings, and a floor to stand on when there is no picture
- A **developer panel** (add `?dev` to the address) with sliders, switches, read-outs and buttons, which you will use in every part of the series
- Unit tests for all of it: **79 passing tests**

**What you'll learn:** how to put a 3D scene over a video, how a phone's motion sensors become a camera, why a page must ask before it uses the camera (and why it must be on HTTPS), how to write code that makes decisions about a device in a way that can be tested without one, and how to plan a game so that most of it can be built and tried on a desktop.

**Before you start:** nothing from the other series is needed, though the [Rolling Rampage Tilt](../../rolling_rampage/rolling_rampage_tilt/TUTORIAL.md) tutorial is a good read on the motion sensors, and the Rooftop Parkour series explains the developer panel at more length.

## Where you're starting

This folder holds an empty placeholder for every file you will write, a finished `tests.html` that lists them, and the logo, the fonts and (later) the models you need in the series' shared `assets` folder, one level up:

```
ghost_hunter/
├── assets/                    (the logo and the fonts, and a README that says where they are from)
│   ├── images/
│   └── fonts/
└── ghost_hunter_room/
    ├── index.html             (placeholder -- Step 1)
    ├── tests.html             (finished: it already lists every test file)
    ├── css/
    │   ├── theme.css, page.css      (placeholders -- Step 1)
    │   ├── start.css                (placeholder -- Step 7)
    │   └── devpanel.css             (placeholder -- Step 8)
    ├── js/
    │   ├── support.js               (placeholder -- Step 2)
    │   ├── look.js                  (placeholder -- Steps 3, 4 and 5)
    │   ├── camerafeed.js            (placeholder -- Step 6)
    │   ├── start.js                 (placeholder -- Step 7)
    │   ├── devpanel.js              (placeholder -- Step 8)
    │   └── main.js                  (placeholder -- Step 9)
    └── tests/
        └── a test file for each of those, except main.js   (placeholders)
```

Open `tests.html` before you change anything. QUnit says **"No tests were run"**, which is right: the test files are empty.

### Serving the page

The page needs a web server: `npx serve` in the repo's root folder, and open `http://localhost:3000/samples/ghost_hunter/ghost_hunter_room/index.html`. Add **`?dev`** to the address for the developer panel.

**A phone needs HTTPS.** A page may only use the camera and the motion sensors if it comes over HTTPS (or from `localhost`, which only helps on the same computer). To try the sample on a phone, open a tunnel to your computer: with `npx serve` running, in another terminal use a tunnel such as `npx localtunnel --port 3000` or `cloudflared tunnel --url http://localhost:3000`, and open the HTTPS address it prints on the phone. Or use the published gallery. You can do the whole tutorial on a desktop, and only look at the phone at the end (Step 10).

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **The page**: layers, and the colours of the logo.
2. **What the device can do**: the camera, the sensors, the permission.
3. **Where a phone points**: the angles of the sensors, as arithmetic.
4. **Dragging**: looking around without sensors.
5. **The motion sensors**: a reading, the front, and recentring.
6. **The camera's picture**: the back camera, and every way it can fail, in words.
7. **The start screen**: a warning, a tap, and a status.
8. **The developer panel**: sliders and read-outs.
9. **The game**: a scene over the picture, and everything joined together.
10. **Try it**: on a desktop, and on a phone.

## Step 1: The page

The game is **layers**, from the back to the front:

1. a `<video>` with the camera's picture (it is empty until the camera starts, and then it fades in);
2. the 3D `<canvas>`, **see-through** wherever nothing is drawn;
3. the things on the glass: a reticle (the corners of a viewfinder), a line of words that says where the phone is looking, a place for notices;
4. the **start screen**, over everything.

The colours and the lettering come from the logo, and they are named **once**, in `css/theme.css`, so that everything else uses the names: a night that is nearly black (`--night`), a toxic green for the thing to look at (`--ghost`), the cold glow of a ghost (`--ecto`), the bone white of the lettering (`--bone`), and a red that is used for danger and only for danger (`--blood`). The title face is **Rubik Wet Paint**, which drips like the logo; the small words are in **Share Tech Mono**, the face of a detector's read-out.

Open `css/theme.css` (the placeholder) and **replace the TODO line** with:

```css
/* The look of Ghost Hunter, taken from its logo: a night that is nearly black, a toxic ghost green, the cold cyan glow of the ghost, and bone white
   for the lettering. The colours and the fonts are named once here, and everything else uses the names. */
@font-face {
  font-family: "Rubik Wet Paint";
  src: url("../../assets/fonts/RubikWetPaint-Regular.ttf") format("truetype");
  font-display: swap;
}
@font-face {
  font-family: "Share Tech Mono";
  src: url("../../assets/fonts/ShareTechMono-Regular.ttf") format("truetype");
  font-display: swap;
}
:root {
  --title-font: "Rubik Wet Paint", "Impact", system-ui, sans-serif; /* dripping paint, for the title and the headings */
  --small-font: "Share Tech Mono", ui-monospace, "Courier New", monospace; /* a detector's read-out, for the small words that must be read */

  --night: #05080d; /* behind everything */
  --night-lift: #0c1824;
  --bone: #f2f3ee; /* the lettering */
  --ghost: #39ff14; /* the accent: the reticle, the buttons, the thing to look at */
  --ecto: #3ce6ff; /* the glow of a ghost */
  --blood: #c4161f; /* danger, and only danger */
  --good: #39ff14;
}
```

Open `css/page.css` and **replace the TODO line** with:

```css
/* The page is layers, from the back: the camera's picture, the 3D scene (see through where nothing is drawn), and the things on the glass. */
html, body {
  background: var(--night);
  color: var(--bone);
  font-family: var(--small-font);
}
#stage {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 40%, var(--night-lift), var(--night) 70%);
}
#feed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover; /* the picture fills the screen the way the real view would, with its edges cut off, not squeezed */
  opacity: 0;
  transition: opacity 0.8s;
}
#feed.live {
  opacity: 1;
}
#renderCanvas {
  position: absolute;
  inset: 0;
  z-index: 1;
}

/* The corners of the logo's viewfinder, drawn with borders, and a small cross in the middle. */
#reticle {
  position: fixed;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s;
}
#reticle.shown {
  opacity: 1;
}
#reticle i {
  position: absolute;
  width: 34px;
  height: 34px;
  border: 0 solid var(--ghost);
  filter: drop-shadow(0 0 6px var(--ghost));
}
#reticle i:nth-child(1) { left: 6vmin; top: 6vmin; border-width: 4px 0 0 4px; }
#reticle i:nth-child(2) { right: 6vmin; top: 6vmin; border-width: 4px 4px 0 0; }
#reticle i:nth-child(3) { left: 6vmin; bottom: 6vmin; border-width: 0 0 4px 4px; }
#reticle i:nth-child(4) { right: 6vmin; bottom: 6vmin; border-width: 0 4px 4px 0; }
#reticle b {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 26px;
  margin: -13px 0 0 -13px;
  background:
    linear-gradient(var(--ghost), var(--ghost)) center / 2px 100% no-repeat,
    linear-gradient(var(--ghost), var(--ghost)) center / 100% 2px no-repeat;
  filter: drop-shadow(0 0 5px var(--ghost));
}

.hint a {
  color: var(--ghost);
}
/* What the phone is looking at, in words, so that a person can see that it works. */
#compass {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 14px;
  z-index: 5;
  text-align: center;
  font-size: 15px;
  letter-spacing: 0.12em;
  color: var(--ghost);
  text-shadow: 0 0 8px var(--ghost);
  pointer-events: none;
}
#notice {
  position: fixed;
  left: 50%;
  bottom: 44px;
  z-index: 6;
  max-width: min(520px, 86vw);
  transform: translateX(-50%);
  padding: 8px 14px;
  background: rgba(5, 8, 13, 0.8);
  border: 1px solid var(--ghost);
  font-size: 14px;
  text-align: center;
  pointer-events: none;
}
#notice:empty {
  display: none;
}
```

Things to notice:

- **`object-fit: cover`** is what makes the camera's picture fill the screen the way the real view would: it is cut off at the edges, and not squeezed.
- **The canvas is a layer like the others** (`position: absolute`, a higher `z-index` than the video), and there is nothing to make it see-through in the CSS: that is done in the code, in Step 9, where the engine is told that its canvas has an alpha channel.
- **The reticle is four borders and a cross**, drawn with CSS: no picture. They are the corners of the viewfinder in the logo. It starts see-through and is shown when the game does.
- **The background of `#stage` is a dark glow.** When there is no camera, that is what is behind the scene, and it should look like a dark room, not like a page.

Now the page itself. Open `index.html` and **replace the TODO line** with:

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Ghost Hunter Room - Babylon.js</title>
  <link rel="stylesheet" href="../../../css/sample.css">
  <link rel="stylesheet" href="css/theme.css">
  <link rel="stylesheet" href="css/page.css">
  <link rel="stylesheet" href="css/start.css">
  <link rel="stylesheet" href="css/devpanel.css">
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js"></script>
</head>

<body>
  <a class="back-button" href="../../../index.html#ghost_hunter">&larr; Samples</a>
  <div class="hint">Turn your phone, or drag, to look &middot; R recentre &middot; <a href="tests.html">Run tests</a></div>
  <div id="stage">
    <video id="feed" playsinline muted autoplay></video>
    <canvas id="renderCanvas"></canvas>
  </div>
  <div id="reticle"><i></i><i></i><i></i><i></i><b></b></div>
  <div id="notice"></div>
  <div id="compass"></div>
  <div id="start">
    <h1><img src="../assets/images/ghost_hunter_logo.webp" alt="Ghost Hunter" width="600" height="600"></h1>
    <p id="start-status"></p>
    <p id="start-warning"></p>
    <button id="start-button" type="button">Enter the dark</button>
  </div>
  <script src="../../../js/screenshot.js"></script>
  <script src="js/support.js"></script>
  <script src="js/look.js"></script>
  <script src="js/camerafeed.js"></script>
  <script src="js/start.js"></script>
  <script src="js/devpanel.js"></script>
  <script src="js/main.js"></script>
</body>

</html>
```

Things to notice:

- **`viewport-fit=cover`, `user-scalable=no`**: the page is the whole screen of a phone, and a pinch should not zoom it.
- **The `<video>` has `playsinline` and `muted` and `autoplay`.** Without `playsinline` an iPhone takes a video full screen, out of the page; and a page may not play a video with sound until the person has touched it.
- **Every script of the sample is listed already.** The files are empty placeholders until their steps, and an empty script does nothing, so the page is valid at every step.
- **The libraries come from a CDN**: Babylon.js, and its materials library (for the grid of the floor).

Open the page. It is the logo and a plain button over the dark: the words of the start screen are made by script, in later steps. Open `tests.html`: QUnit still says that no tests were run.

## Step 2: What the device can do

Before the game asks for anything, it should know what it *can* ask for. A phone with a camera and motion sensors on an HTTPS page can have both. The same phone on an ordinary `http://` page can have neither: the browser refuses. A desktop has a camera, perhaps, and the motion sensors **in the code**, but they never send anything. An iPhone has sensors but **asks the person first**.

So what the device can do is worked out in two stages, and the first is small enough not to need a test: `describeDevice` reads the page's `window` and `navigator` and makes a **plain description** (`{ secure, camera, motion, needsMotionPermission, touch }`). Everything after that is a function of that description, and a test can make any description it likes.

Open `js/support.js` (the placeholder) and **replace the TODO line** with:

```js
// What this phone (or this desktop) can do, worked out from a plain description of it so that the tests can describe any device: the
// camera, the motion sensors, and whether the page is allowed to use them. A page may only use the camera and the sensors if it is
// served over HTTPS (or from localhost), and iPhones ask the person before they hand over the motion sensors.
// See ../tests/support.tests.js.

// The description of the device that the game is running on. `win` and `nav` are the page's window and navigator.
function describeDevice(win = window, nav = navigator) {
  const orientation = win.DeviceOrientationEvent;
  return {
    secure: Boolean(win.isSecureContext),
    camera: Boolean(nav.mediaDevices && nav.mediaDevices.getUserMedia),
    motion: Boolean(orientation),
    needsMotionPermission: Boolean(orientation && typeof orientation.requestPermission === "function"),
    touch: (nav.maxTouchPoints || 0) > 0,
  };
}

// What the game can use: the camera and the motion sensors only on a secure page, and only if the device has them.
function detectSupport(device) {
  return {
    secure: device.secure,
    camera: device.secure && device.camera,
    motion: device.secure && device.motion,
    needsPermission: device.secure && device.needsMotionPermission,
    touch: device.touch,
  };
}

// How the player looks around: with the motion sensors if they really send readings, and otherwise by dragging. (A desktop browser
// has the sensors in the code and sends nothing, so having them is not enough: the game waits to be sent a reading.)
function chooseLookSource(support, gotReading) {
  return support.motion && gotReading ? "gyro" : "drag";
}

// The words on the start screen about what this device can do.
function startStatus(support) {
  if (!support.secure) {
    return "This page is not on HTTPS, so the phone will not allow the camera or the motion sensors. You can still look around by dragging.";
  }
  if (!support.camera && !support.motion) return "No camera and no motion sensor here: drag to look around the dark room.";
  if (!support.camera) return "No camera here: you will look around a dark room instead. Turn your phone to look.";
  if (!support.motion) return "No motion sensor here: drag the screen to look around.";
  if (support.needsPermission) return "Your phone will ask to use its camera and its motion sensors. Allow both.";
  return "Your camera will show the room, and the dead will show up in it. Turn your phone to look around.";
}

// Asks for the motion sensors where the device wants to be asked (an iPhone), and gives "granted" or "denied". It must be called
// straight from a tap, or the phone says no. A device that does not ask has the sensors already: "granted". `api` is the
// DeviceOrientationEvent of the page.
async function askForMotion(api) {
  if (!api || typeof api.requestPermission !== "function") return "granted";
  try {
    return (await api.requestPermission()) === "granted" ? "granted" : "denied";
  } catch (error) {
    return "denied";
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { describeDevice, detectSupport, chooseLookSource, startStatus, askForMotion };
} else {
  Object.assign(window, { describeDevice, detectSupport, chooseLookSource, startStatus, askForMotion });
}
```

Things to notice:

- **Nothing can be used on a page that is not secure**, whatever the device has: `detectSupport` is the rule, written once.
- **`chooseLookSource` takes `gotReading`**, because having the sensors is not enough: a desktop browser has them and sends nothing. The game waits to be sent a reading (Step 9) and drags if none comes.
- **`startStatus` says it in words**: every case has its own sentence, for the start screen. A test says that every combination says something.
- **`askForMotion` has to be called from a tap.** An iPhone says no to a page that asks out of the blue. It gives `"granted"` or `"denied"` and never throws: a question that fails is a no. A device that does not ask has the sensors already, so it is `"granted"`.

### Tests

Open `tests/support.tests.js` and **replace the TODO line** with:

```js
QUnit.module("describeDevice", () => {
  QUnit.test("reads a window and a navigator", (assert) => {
    const win = { isSecureContext: true, DeviceOrientationEvent: function () {} };
    const nav = { mediaDevices: { getUserMedia() {} }, maxTouchPoints: 5 };
    assert.deepEqual(describeDevice(win, nav), { secure: true, camera: true, motion: true, needsMotionPermission: false, touch: true });
  });

  QUnit.test("an iPhone has a function to ask for the sensors", (assert) => {
    const event = function () {};
    event.requestPermission = () => Promise.resolve("granted");
    const device = describeDevice({ isSecureContext: true, DeviceOrientationEvent: event }, { mediaDevices: {}, maxTouchPoints: 5 });
    assert.true(device.needsMotionPermission);
    assert.false(device.camera, "no getUserMedia means no camera");
  });

  QUnit.test("a bare desktop has nothing", (assert) => {
    assert.deepEqual(describeDevice({}, {}), { secure: false, camera: false, motion: false, needsMotionPermission: false, touch: false });
  });
});

QUnit.module("detectSupport and chooseLookSource", () => {
  const phone = { secure: true, camera: true, motion: true, needsMotionPermission: false, touch: true };

  QUnit.test("a phone on a secure page can use everything", (assert) => {
    assert.deepEqual(detectSupport(phone), { secure: true, camera: true, motion: true, needsPermission: false, touch: true });
  });

  QUnit.test("a page that is not secure can use nothing, whatever the device has", (assert) => {
    const support = detectSupport({ ...phone, secure: false, needsMotionPermission: true });
    assert.false(support.camera);
    assert.false(support.motion);
    assert.false(support.needsPermission);
  });

  QUnit.test("the sensors are used if they send readings, and not because they exist", (assert) => {
    const support = detectSupport(phone);
    assert.strictEqual(chooseLookSource(support, true), "gyro");
    assert.strictEqual(chooseLookSource(support, false), "drag");
    assert.strictEqual(chooseLookSource(detectSupport({ ...phone, motion: false }), true), "drag");
  });
});

QUnit.module("startStatus", () => {
  const full = { secure: true, camera: true, motion: true, needsPermission: false, touch: true };

  QUnit.test("says why an unsecured page cannot use the camera", (assert) => {
    assert.true(startStatus({ ...full, secure: false, camera: false, motion: false }).includes("HTTPS"));
  });

  QUnit.test("says what is missing", (assert) => {
    assert.true(startStatus({ ...full, camera: false }).includes("No camera"));
    assert.true(startStatus({ ...full, motion: false }).includes("No motion sensor"));
    assert.true(startStatus({ ...full, camera: false, motion: false }).includes("drag"));
  });

  QUnit.test("warns a phone that will ask", (assert) => {
    assert.true(startStatus({ ...full, needsPermission: true }).includes("ask"));
  });

  QUnit.test("every case says something", (assert) => {
    for (const secure of [true, false]) for (const camera of [true, false]) for (const motion of [true, false]) for (const needsPermission of [true, false]) {
      assert.true(startStatus({ secure, camera, motion, needsPermission }).length > 20);
    }
  });
});

QUnit.module("askForMotion", () => {
  QUnit.test("a device that does not ask has the sensors already", async (assert) => {
    assert.strictEqual(await askForMotion({}), "granted");
    assert.strictEqual(await askForMotion(undefined), "granted");
  });

  QUnit.test("an iPhone says granted or denied", async (assert) => {
    assert.strictEqual(await askForMotion({ requestPermission: () => Promise.resolve("granted") }), "granted");
    assert.strictEqual(await askForMotion({ requestPermission: () => Promise.resolve("denied") }), "denied");
  });

  QUnit.test("a question that fails is a no", async (assert) => {
    assert.strictEqual(await askForMotion({ requestPermission: () => Promise.reject(new Error("not from a tap")) }), "denied");
  });
});
```

Open `tests.html`. You should see **13 passing tests**.

## Step 3: Where a phone points

This is the heart of the sample, and it is only arithmetic. A phone's motion sensors say its orientation as three angles, in degrees. A browser's `deviceorientation` event has them as `alpha`, `beta` and `gamma`:

- **alpha** is the turn about the vertical: which way the phone faces on the compass (0 to 360);
- **beta** is the tip forward and back: 0 when the phone lies face up, 90 when it is held upright, 180 when it lies face down;
- **gamma** is the tilt side to side.

The game needs two *directions* instead: which way the camera **faces** (it looks out of the back of the phone), and which way the **top of the screen** points. With those two, the camera of the scene can be turned to match. The directions are three numbers `[x, y, z]` in the world of the game: **x to the right, y up, z straight ahead**.

The sensors measure with x to the east, y to the north and z up. The game has x to the east, y up and z to the north. It is the same three directions with the names changed, and that is the last line of `lookFromAngles`.

The angle of the **screen** matters too: a phone turned on its side has the top of its screen to the side, and the picture on it must turn with it.

Open `js/look.js` (the placeholder) and **replace the TODO line** with:

```js
// Looking around. The camera of the game points where the phone points, and that is worked out here as plain arithmetic, with no
// Babylon.js in it, so that the tests can check it. The answer to "where is it looking?" is always two directions: the way the camera
// faces (forward) and the way the top of the screen points (up), as [x, y, z] in the world of the game: x is to the right, y is up
// and z is straight ahead. See ../tests/look.tests.js.

const LOOK = {
  fovDegrees: 60, // how much the camera sees from the top of the screen to the bottom: a phone's camera sees about this much
  eyeHeight: 1.4, // metres: the height of a phone held up to look
  dragRadiansPerPixel: 0.005, // how far a drag turns the view when there are no motion sensors
  maxPitchDegrees: 85, // how far up or down a drag can look (straight up would have no "up")
  dragDirection: -1, // -1 drags the world, as a map is dragged: the view turns the opposite way to the finger
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const toDegrees = (radians) => (radians * 180) / Math.PI;

// Turns a direction about the vertical axis, by an angle in radians. A positive angle turns it to the right (from z towards x).
function turnAboutUp(vector, radians) {
  const [x, y, z] = vector;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [x * cos + z * sin, y, -x * sin + z * cos];
}

// Which way is a direction facing, as a bearing from 0 to 360 degrees? Straight ahead (z) is 0 and the right (x) is 90.
function bearingOf(vector) {
  const degrees = toDegrees(Math.atan2(vector[0], vector[2]));
  return (degrees + 360) % 360;
}

// How far is a direction above (positive) or below (negative) the horizon, in degrees?
function pitchOf(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return toDegrees(Math.asin(Math.max(-1, Math.min(1, vector[1] / length))));
}

// Where a phone is looking, from what its motion sensors say. The three angles (in degrees) are the standard ones of a browser's
// deviceorientation event: alpha is the turn about the vertical, beta is the tip forward and back, gamma is the tilt side to side.
// A phone held upright has a beta of 90 and its camera looks along the ground. A phone lying face up has a beta of 0 and its camera
// looks at the floor. `screenAngle` is how far the screen has been turned from upright (0, 90, 180 or 270).
// The sensors measure from the north, with x to the east, y to the north and z up; the game has x to the east, y up and z to the
// north, which is the same directions with the names changed.
function lookFromAngles(alpha, beta, gamma, screenAngle = 0) {
  const a = toRadians(alpha);
  const b = toRadians(beta);
  const g = toRadians(gamma);
  const s = toRadians(screenAngle);
  // The phone's own directions: its camera looks out of the back (-z), and the top of the screen is its up turned by the screen.
  const turn = ([x, y, z]) => {
    const [x1, y1, z1] = [x * Math.cos(g) + z * Math.sin(g), y, -x * Math.sin(g) + z * Math.cos(g)]; // gamma, about the phone's y
    const [x2, y2, z2] = [x1, y1 * Math.cos(b) - z1 * Math.sin(b), y1 * Math.sin(b) + z1 * Math.cos(b)]; // beta, about x
    return [x2 * Math.cos(a) - y2 * Math.sin(a), x2 * Math.sin(a) + y2 * Math.cos(a), z2]; // alpha, about the vertical
  };
  const [fx, fy, fz] = turn([0, 0, -1]);
  const [ux, uy, uz] = turn([Math.sin(s), Math.cos(s), 0]);
  return { forward: [fx, fz, fy], up: [ux, uz, uy] }; // (east, north, up) -> (x, y, z) of the game
}

// The three directions of a camera that faces `forward` with its top towards `up`: right, up and forward, at right angles and one long
// (Babylon.js is left handed: the right is up crossed with forward). `up` need only be roughly up: it is made square with forward.
function lookAxes(forward, up) {
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (v) => { const length = Math.hypot(...v) || 1; return v.map((n) => n / length); };
  const front = unit(forward);
  const right = unit(cross(up, front));
  return { right, up: cross(front, right), forward: front };
}

// Where a drag is looking, from a bearing (yaw) and a tilt (pitch), both in radians.
function lookFromDrag(yaw, pitch) {
  return {
    forward: [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)],
    up: [-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch)],
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LOOK, toRadians, toDegrees, turnAboutUp, bearingOf, pitchOf, lookFromAngles, lookAxes, lookFromDrag };
} else {
  Object.assign(window, { LOOK, toRadians, toDegrees, turnAboutUp, bearingOf, pitchOf, lookFromAngles, lookAxes, lookFromDrag });
}
```

Things to notice:

- **The numbers are in a table** (`LOOK`): how much the camera sees, how high a phone is held, how far a drag turns, how far up a drag can look. Nothing in the code has a number that a person might want to change.
- **`lookFromAngles` turns three directions of the phone**: out of its back, the top of its screen, in the order of the sensors' own convention: the turn by gamma, then beta, then alpha. Each turn is a line of the same arithmetic as a rotation matrix, written out, so that you can read it.
- **`lookAxes` squares up the two directions** into the three of a camera (right, up, forward). Babylon.js is **left handed**, so the right of a camera is up crossed with forward. Step 9 turns the three directions into a rotation for the camera.
- **There is no Babylon.js in here at all**, so the tests can run without a scene, and a phone is described by three numbers.
- **`bearingOf` and `pitchOf`** say where a direction is facing, in degrees, for the line of words on the screen.

### Tests

Open `tests/look.tests.js` and **replace the TODO line** with:

```js
QUnit.module("lookFromAngles", () => {
  const near = (assert, got, want, message, tolerance = 1e-9) => {
    for (let i = 0; i < 3; i++) assert.true(Math.abs(got[i] - want[i]) < tolerance, `${message}: ${got.map((n) => n.toFixed(3))} should be ${want}`);
  };

  QUnit.test("a phone held upright looks along the ground, with the top of the screen up", (assert) => {
    const { forward, up } = lookFromAngles(0, 90, 0);
    near(assert, forward, [0, 0, 1], "forward");
    near(assert, up, [0, 1, 0], "up");
  });

  QUnit.test("turning the phone to the left (alpha) turns the view to the left", (assert) => {
    near(assert, lookFromAngles(90, 90, 0).forward, [-1, 0, 0], "a quarter turn left");
    near(assert, lookFromAngles(180, 90, 0).forward, [0, 0, -1], "half a turn");
    near(assert, lookFromAngles(270, 90, 0).forward, [1, 0, 0], "a quarter turn right");
  });

  QUnit.test("a phone lying face up looks at the floor, and face down at the ceiling", (assert) => {
    near(assert, lookFromAngles(0, 0, 0).forward, [0, -1, 0], "face up");
    near(assert, lookFromAngles(0, 180, 0).forward, [0, 1, 0], "face down");
  });

  QUnit.test("tipping the top of the phone back (beta over 90) looks up", (assert) => {
    assert.true(lookFromAngles(0, 120, 0).forward[1] > 0.4);
    assert.true(lookFromAngles(0, 60, 0).forward[1] < -0.4);
  });

  QUnit.test("a phone turned on its side has the top of its screen to the side", (assert) => {
    const left = lookFromAngles(0, 90, 0, 90); // the phone turned a quarter turn one way
    near(assert, left.forward, [0, 0, 1], "it still looks the same way");
    near(assert, left.up, [1, 0, 0], "but the top of the screen is the phone's right edge");
    near(assert, lookFromAngles(0, 90, 0, 270).up, [-1, 0, 0], "and the other way");
  });

  QUnit.test("the two directions are always at right angles, and the length of one", (assert) => {
    for (const [a, b, g, s] of [[10, 80, 5, 0], [200, 100, -20, 90], [330, 45, 30, 270], [90, 170, -80, 180]]) {
      const { forward, up } = lookFromAngles(a, b, g, s);
      const dot = forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2];
      assert.true(Math.abs(dot) < 1e-9, `at right angles for ${a}, ${b}, ${g}, ${s}`);
      assert.true(Math.abs(Math.hypot(...forward) - 1) < 1e-9);
      assert.true(Math.abs(Math.hypot(...up) - 1) < 1e-9);
    }
  });

  QUnit.test("the same directions make the camera of Babylon.js face the same way", (assert) => {
    for (const angles of [[0, 90, 0], [90, 100, 10], [200, 70, -15]]) {
      const { forward, up } = lookFromAngles(...angles);
      const axes = lookAxes(forward, up);
      const matrix = new BABYLON.Matrix();
      BABYLON.Matrix.FromXYZAxesToRef(new BABYLON.Vector3(...axes.right), new BABYLON.Vector3(...axes.up), new BABYLON.Vector3(...axes.forward), matrix);
      const rotation = BABYLON.Quaternion.FromRotationMatrix(matrix);
      const faces = new BABYLON.Vector3(0, 0, 1).applyRotationQuaternion(rotation);
      const top = new BABYLON.Vector3(0, 1, 0).applyRotationQuaternion(rotation);
      near(assert, [faces.x, faces.y, faces.z], forward, "facing", 1e-5); // Babylon.js works in single precision
      near(assert, [top.x, top.y, top.z], up, "top of the screen", 1e-5);
    }
  });
});

QUnit.module("lookAxes", () => {
  QUnit.test("makes three directions at right angles, of length one, with the right on the right", (assert) => {
    const { right, up, forward } = lookAxes([0, 0, 1], [0, 1, 0]);
    assert.deepEqual(right.map((n) => Math.round(n)), [1, 0, 0]);
    assert.deepEqual(up.map((n) => Math.round(n)), [0, 1, 0]);
    assert.deepEqual(forward.map((n) => Math.round(n)), [0, 0, 1]);
  });

  QUnit.test("turned to the right, the right goes round with it", (assert) => {
    const { right } = lookAxes([1, 0, 0], [0, 1, 0]);
    assert.deepEqual(right.map((n) => Math.round(n)), [0, 0, -1]);
  });

  QUnit.test("squares up an up that is only roughly up", (assert) => {
    const { right, up, forward } = lookAxes([0, 0, 2], [0, 1, 0.5]);
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    assert.true(Math.abs(dot(right, up)) < 1e-9);
    assert.true(Math.abs(dot(up, forward)) < 1e-9);
    assert.true(Math.abs(dot(right, forward)) < 1e-9);
    for (const v of [right, up, forward]) assert.true(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  });
});

QUnit.module("lookFromDrag, bearingOf and pitchOf", () => {
  QUnit.test("no turn looks straight ahead, and a turn to the right looks to the right", (assert) => {
    assert.deepEqual(lookFromDrag(0, 0).forward.map((n) => Math.round(n)), [0, 0, 1]);
    assert.deepEqual(lookFromDrag(Math.PI / 2, 0).forward.map((n) => Math.round(n)), [1, 0, 0]);
  });

  QUnit.test("looking up has the top of the screen leaning back", (assert) => {
    const { forward, up } = lookFromDrag(0, toRadians(45));
    assert.true(forward[1] > 0.7);
    assert.true(up[2] < -0.7);
    assert.true(Math.abs(forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2]) < 1e-9);
  });

  QUnit.test("the bearing is 0 straight ahead, 90 to the right and 270 to the left", (assert) => {
    assert.strictEqual(Math.round(bearingOf([0, 0, 1])), 0);
    assert.strictEqual(Math.round(bearingOf([1, 0, 0])), 90);
    assert.strictEqual(Math.round(bearingOf([0, 0, -1])), 180);
    assert.strictEqual(Math.round(bearingOf([-1, 0, 0])), 270);
  });

  QUnit.test("the pitch is positive looking up and negative looking down", (assert) => {
    assert.strictEqual(Math.round(pitchOf([0, 1, 0])), 90);
    assert.strictEqual(Math.round(pitchOf([0, 0, 1])), 0);
    assert.strictEqual(Math.round(pitchOf([0, -1, 1])), -45);
  });

  QUnit.test("turnAboutUp turns a direction to the right", (assert) => {
    const turned = turnAboutUp([0, 0, 1], Math.PI / 2);
    assert.deepEqual(turned.map((n) => Math.round(n)), [1, 0, 0]);
    assert.deepEqual(turnAboutUp([0, 1, 0], 1), [0, 1, 0], "up stays up");
  });
});
```

Things to notice:

- **The tests state what a phone does**, in everyday terms: held upright it looks along the ground; turned to the left, the view turns to the left; face up it looks at the floor, face down at the ceiling; tipped back it looks up; on its side the top of its screen is to the side.
- **The last test of the first module asks Babylon.js**: it makes a camera rotation from the three directions, and checks that a real camera faces the way the arithmetic says (to single precision, which is how Babylon.js counts).
- **The directions are always at right angles and one long**, for any angles at all: a few phones that are held awkwardly, tested together.

Open `tests.html`. You should see **28 passing tests**: 15 more.

## Step 4: Dragging

A desktop has no motion sensors, and a phone might not either. For them, the view is turned by **dragging**. It is the same two directions, from a bearing (`yaw`) and a tilt (`pitch`), and a little class to keep them.

In `js/look.js`, find the export block (lines 77 to 84) and **delete it**. Add this in its place, and the export block under it:

```js
// Looking around by dragging, for a desktop and for a phone with no sensors.
class DragLook {
  constructor(table = LOOK) {
    this.table = table;
    this.yaw = 0;
    this.pitch = 0;
  }

  // A drag of (dx, dy) pixels. Dragging down looks up, as dragging the world down would.
  drag(dx, dy) {
    const { dragRadiansPerPixel, dragDirection, maxPitchDegrees } = this.table;
    const limit = toRadians(maxPitchDegrees);
    this.yaw += dx * dragRadiansPerPixel * dragDirection;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch - dy * dragRadiansPerPixel * dragDirection));
  }

  recentre() {
    this.yaw = 0;
  }

  look() {
    return lookFromDrag(this.yaw, this.pitch);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LOOK, toRadians, toDegrees, turnAboutUp, bearingOf, pitchOf, lookFromAngles, lookAxes, lookFromDrag, DragLook };
} else {
  Object.assign(window, { LOOK, toRadians, toDegrees, turnAboutUp, bearingOf, pitchOf, lookFromAngles, lookAxes, lookFromDrag, DragLook });
}
```

Things to notice:

- **A drag turns the view the opposite way to the finger**, like dragging a map: drag to the right and the world follows your finger, so you look to the left. Which way is a number of the table (`dragDirection`), so that anyone who prefers the other way changes one number.
- **The tilt is limited** to `maxPitchDegrees`: straight up has no "up", and the camera would not know which way round it was.
- **`recentre` keeps the tilt and zeroes the turn**: the way you look now becomes the front.

### Tests

At the end of `tests/look.tests.js` (below line 114) add:

```js
QUnit.module("DragLook", () => {
  QUnit.test("starts looking straight ahead", (assert) => {
    const look = new DragLook();
    assert.deepEqual(look.look().forward.map((n) => Math.round(n)), [0, 0, 1]);
  });

  QUnit.test("dragging to the right turns the view to the left, like dragging a map", (assert) => {
    const look = new DragLook();
    look.drag(100, 0);
    assert.true(look.yaw < 0);
    look.drag(-300, 0);
    assert.true(look.yaw > 0);
  });

  QUnit.test("dragging down looks up", (assert) => {
    const look = new DragLook();
    look.drag(0, 50);
    assert.true(look.pitch > 0);
  });

  QUnit.test("it cannot look further up or down than the limit", (assert) => {
    const look = new DragLook();
    look.drag(0, 100000);
    assert.strictEqual(Math.round(toDegrees(look.pitch)), LOOK.maxPitchDegrees);
    look.drag(0, -1000000);
    assert.strictEqual(Math.round(toDegrees(look.pitch)), -LOOK.maxPitchDegrees);
  });

  QUnit.test("how far a drag turns is a number of the table, not of the code", (assert) => {
    const look = new DragLook({ ...LOOK, dragRadiansPerPixel: 0.01, dragDirection: 1 });
    look.drag(100, 0);
    assert.strictEqual(look.yaw, 1);
  });

  QUnit.test("recentre makes the way it looks now the front, and keeps the tilt", (assert) => {
    const look = new DragLook();
    look.drag(200, 30);
    look.recentre();
    assert.strictEqual(look.yaw, 0);
    assert.true(look.pitch !== 0);
  });
});
```

Open `tests.html`. You should see **34 passing tests**: 6 more.

## Step 5: The motion sensors

Now the same two directions from a phone. `GyroLook` keeps the last reading, and says where the phone points.

Two things about the sensors that the class has to deal with:

- **An empty reading is not a reading.** A desktop browser sends one `deviceorientation` event, with every angle `null`. `feed` says whether the reading was a real one, and the game waits to be sent one.
- **The sensors know the north, and the game does not care.** The first thing the player faces should be straight ahead, whichever way that is on a compass. So there is an `offset`, a turn about the vertical, and `recentre` makes it whatever the phone is pointing at now. (If the phone points at the floor it has no heading, and `recentre` leaves things as they were.)

In `js/look.js`, find the export block (lines 102 to 109) and **delete it**. Add this in its place, and the export block under it:

```js
// Looking around with the motion sensors: it keeps the last reading, and says where it points. The first thing it faces is
// straight ahead, because the sensors know the north and the game does not care about it: `recentre` makes the way the phone
// points now the way that is straight ahead.
class GyroLook {
  constructor(screenAngle = () => 0) {
    this.screenAngle = screenAngle; // asked each time: a phone can be turned on its side while it is played
    this.reading = null; // the last { alpha, beta, gamma }
    this.offset = 0; // the turn that makes the first heading the front
    this.readings = 0;
  }

  // A reading from the sensors. Some browsers send readings that are empty (a desktop does), and those are not readings.
  feed({ alpha, beta, gamma }) {
    if (alpha === null || beta === null || gamma === null || alpha === undefined || beta === undefined || gamma === undefined) return false;
    this.reading = { alpha, beta, gamma };
    this.readings += 1;
    return true;
  }

  get ready() {
    return this.reading !== null;
  }

  // The view as the sensors have it, before the front is chosen.
  _raw() {
    const { alpha, beta, gamma } = this.reading || { alpha: 0, beta: 90, gamma: 0 };
    return lookFromAngles(alpha, beta, gamma, this.screenAngle());
  }

  // Makes where the phone points now the front. (If it points at the floor or the ceiling it has no heading, and nothing changes.)
  recentre() {
    const { forward } = this._raw();
    if (Math.hypot(forward[0], forward[2]) < 0.2) return;
    this.offset = Math.atan2(forward[0], forward[2]);
  }

  look() {
    const raw = this._raw();
    return { forward: turnAboutUp(raw.forward, -this.offset), up: turnAboutUp(raw.up, -this.offset) };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LOOK, toRadians, toDegrees, turnAboutUp, bearingOf, pitchOf, lookFromAngles, lookAxes, lookFromDrag, DragLook, GyroLook };
} else {
  Object.assign(window, { LOOK, toRadians, toDegrees, turnAboutUp, bearingOf, pitchOf, lookFromAngles, lookAxes, lookFromDrag, DragLook, GyroLook });
}
```

Things to notice:

- **The screen's angle is asked for each time** (`screenAngle` is a function), because a phone can be turned on its side while it is played.
- **The reading is plain data.** A test feeds it any angles it likes, with no sensors at all.

### Tests

At the end of `tests/look.tests.js` (below line 157) add:

```js
QUnit.module("GyroLook", () => {
  QUnit.test("is not ready until a reading comes", (assert) => {
    const look = new GyroLook();
    assert.false(look.ready);
    assert.true(look.feed({ alpha: 10, beta: 90, gamma: 0 }));
    assert.true(look.ready);
    assert.strictEqual(look.readings, 1);
  });

  QUnit.test("an empty reading (what a desktop sends) is not a reading", (assert) => {
    const look = new GyroLook();
    assert.false(look.feed({ alpha: null, beta: null, gamma: null }));
    assert.false(look.feed({}));
    assert.false(look.ready);
    assert.strictEqual(look.readings, 0);
  });

  QUnit.test("follows the phone: a quarter turn to the left is a bearing of 270", (assert) => {
    const look = new GyroLook();
    look.feed({ alpha: 0, beta: 90, gamma: 0 });
    assert.strictEqual(Math.round(bearingOf(look.look().forward)), 0);
    look.feed({ alpha: 90, beta: 90, gamma: 0 });
    assert.strictEqual(Math.round(bearingOf(look.look().forward)), 270);
  });

  QUnit.test("recentre makes where the phone points now the front", (assert) => {
    const look = new GyroLook();
    look.feed({ alpha: 123, beta: 90, gamma: 0 });
    look.recentre();
    assert.strictEqual(Math.round(bearingOf(look.look().forward)), 0);
    look.feed({ alpha: 123 - 90, beta: 90, gamma: 0 }); // a quarter turn to the right
    assert.strictEqual(Math.round(bearingOf(look.look().forward)), 90);
  });

  QUnit.test("recentre keeps the tilt, and turns the top of the screen with the view", (assert) => {
    const look = new GyroLook();
    look.feed({ alpha: 200, beta: 110, gamma: 0 });
    look.recentre();
    const { forward, up } = look.look();
    assert.strictEqual(Math.round(bearingOf(forward)), 0);
    assert.strictEqual(Math.round(pitchOf(forward)), 20);
    assert.true(Math.abs(forward[0] * up[0] + forward[1] * up[1] + forward[2] * up[2]) < 1e-9);
  });

  QUnit.test("pointing at the floor has no bearing, so recentre leaves the front where it was", (assert) => {
    const look = new GyroLook();
    look.feed({ alpha: 50, beta: 90, gamma: 0 });
    look.recentre();
    const offset = look.offset;
    look.feed({ alpha: 120, beta: 0, gamma: 0 });
    look.recentre();
    assert.strictEqual(look.offset, offset);
  });

  QUnit.test("the angle of the screen is asked for each time, so turning the phone on its side counts", (assert) => {
    let angle = 0;
    const look = new GyroLook(() => angle);
    look.feed({ alpha: 0, beta: 90, gamma: 0 });
    assert.strictEqual(Math.round(look.look().up[1]), 1);
    angle = 90;
    assert.strictEqual(Math.round(look.look().up[0]), 1);
  });
});
```

Open `tests.html`. You should see **41 passing tests**: 7 more.

## Step 6: The camera's picture

The game asks the phone for its **back camera**: the one that faces away from you, so that the screen is a window onto the room. Asking is `getUserMedia`, and it is a **promise**: it comes back when the person has said yes, and fails when they say no, or there is no camera, or another app has it. Each failure has a name, and each gets its own words, because a blank screen tells a person nothing.

Open `js/camerafeed.js` (the placeholder) and **replace the TODO line** with:

```js
// The camera's picture, behind the game. The page asks the phone for its back camera, and shows what it sees in a <video> element that
// sits under the 3D scene. Everything that can go wrong goes wrong in words a person can use, so a refused camera is a message and
// not a blank screen. See ../tests/camerafeed.tests.js.

// What to ask the phone for: the camera on the back ("environment", the other one is "user"), at a size that is sharp enough
// without making a phone work hard, and no microphone (yet).
function cameraConstraints() {
  return {
    audio: false,
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
  };
}

// The words for a camera that would not start. The browser says why with the name of an error.
function explainCameraError(error) {
  switch (error && error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "The camera was not allowed. Allow it in the browser's settings for this page to see the dead in your room.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera was found on this device.";
    case "NotReadableError":
    case "AbortError":
      return "The camera is busy with another app. Close it and try again.";
    default:
      return "The camera would not start.";
  }
}

class CameraFeed {
  // `video` is the <video> element to show the picture in, and `mediaDevices` is where cameras come from (navigator.mediaDevices).
  constructor(video, mediaDevices = navigator.mediaDevices) {
    this.video = video;
    this.mediaDevices = mediaDevices;
    this.stream = null;
  }

  get live() {
    return this.stream !== null;
  }

  // Starts the camera. Gives { ok: true } when the picture is showing, and { ok: false, message } when it is not.
  async start() {
    if (!this.mediaDevices || !this.mediaDevices.getUserMedia) return { ok: false, message: explainCameraError({ name: "NotFoundError" }) };
    try {
      this.stream = await this.mediaDevices.getUserMedia(cameraConstraints());
    } catch (error) {
      this.stream = null;
      return { ok: false, message: explainCameraError(error) };
    }
    this.video.srcObject = this.stream;
    this.video.muted = true;
    this.video.setAttribute("playsinline", ""); // or an iPhone takes the picture full screen, out of the page
    try {
      await this.video.play();
    } catch (error) {
      // A picture that will not play is still a picture: the next tap will start it.
    }
    this.video.classList.add("live");
    return { ok: true };
  }

  // Turns the camera off, so the light on the phone goes out.
  stop() {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) track.stop();
    this.stream = null;
    this.video.srcObject = null;
    this.video.classList.remove("live");
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { cameraConstraints, explainCameraError, CameraFeed };
} else {
  Object.assign(window, { cameraConstraints, explainCameraError, CameraFeed });
}
```

Things to notice:

- **`facingMode: { ideal: "environment" }`**, not `exact`: the back camera is what we want, but a device that has only one camera should use it, and not refuse.
- **`audio: false`**: a microphone is not asked for until the game can use it (a later sample listens for a scream).
- **The element is given as an argument**, and so is `navigator.mediaDevices`: a test gives a stand-in video and a stand-in camera, and nothing in it needs a phone.
- **`playsinline` is set in the code too.** An iPhone, without it, takes the picture full screen.
- **A picture that will not play is still a picture.** `play()` can be refused until a tap; the next tap starts it, and it is not an error.
- **`stop` turns the camera off**, so the light on the phone goes out. It can be called twice.

### Tests

Open `tests/camerafeed.tests.js` and **replace the TODO line** with:

```js
QUnit.module("cameraConstraints and explainCameraError", () => {
  QUnit.test("asks for the camera on the back, and no sound", (assert) => {
    const constraints = cameraConstraints();
    assert.strictEqual(constraints.video.facingMode.ideal, "environment");
    assert.false(constraints.audio);
  });

  QUnit.test("asks for the back camera, but does not refuse a phone that has only one", (assert) => {
    assert.true("ideal" in cameraConstraints().video.facingMode);
    assert.false("exact" in cameraConstraints().video.facingMode);
  });

  QUnit.test("every way the camera fails has its own words", (assert) => {
    const words = ["NotAllowedError", "NotFoundError", "NotReadableError", "Whatever"].map((name) => explainCameraError({ name }));
    assert.strictEqual(new Set(words).size, 4);
    assert.true(explainCameraError({ name: "NotAllowedError" }).includes("allowed"));
    assert.strictEqual(explainCameraError({ name: "SecurityError" }), explainCameraError({ name: "NotAllowedError" }));
    assert.strictEqual(explainCameraError(undefined), explainCameraError({ name: "Whatever" }));
  });
});

QUnit.module("CameraFeed", () => {
  const fakeVideo = () => {
    const classes = new Set();
    return {
      srcObject: undefined,
      muted: false,
      attributes: {},
      played: 0,
      setAttribute(name, value) { this.attributes[name] = value; },
      play() { this.played += 1; return Promise.resolve(); },
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
    };
  };
  const fakeStream = () => {
    const stopped = [];
    return { stopped, getTracks: () => [{ stop: () => stopped.push("video") }] };
  };

  QUnit.test("shows the stream in the video, muted and played in the page", async (assert) => {
    const video = fakeVideo();
    const stream = fakeStream();
    let asked = null;
    const feed = new CameraFeed(video, { getUserMedia: async (constraints) => { asked = constraints; return stream; } });
    assert.deepEqual(await feed.start(), { ok: true });
    assert.strictEqual(video.srcObject, stream);
    assert.true(video.muted);
    assert.strictEqual(video.attributes.playsinline, "");
    assert.strictEqual(video.played, 1);
    assert.true(video.classList.contains("live"));
    assert.true(feed.live);
    assert.deepEqual(asked, cameraConstraints());
  });

  QUnit.test("a refused camera is a message, not an error", async (assert) => {
    const video = fakeVideo();
    const feed = new CameraFeed(video, { getUserMedia: async () => { throw Object.assign(new Error("no"), { name: "NotAllowedError" }); } });
    const result = await feed.start();
    assert.false(result.ok);
    assert.strictEqual(result.message, explainCameraError({ name: "NotAllowedError" }));
    assert.false(feed.live);
    assert.false(video.classList.contains("live"));
  });

  QUnit.test("a device with no cameras at all is a message too", async (assert) => {
    const result = await new CameraFeed(fakeVideo(), null).start();
    assert.false(result.ok);
    assert.true(result.message.includes("No camera"));
  });

  QUnit.test("a picture that will not play is still a picture", async (assert) => {
    const video = fakeVideo();
    video.play = () => Promise.reject(new Error("wants a tap"));
    const feed = new CameraFeed(video, { getUserMedia: async () => fakeStream() });
    assert.true((await feed.start()).ok);
  });

  QUnit.test("stop turns the camera off", async (assert) => {
    const video = fakeVideo();
    const stream = fakeStream();
    const feed = new CameraFeed(video, { getUserMedia: async () => stream });
    await feed.start();
    feed.stop();
    assert.deepEqual(stream.stopped, ["video"]);
    assert.strictEqual(video.srcObject, null);
    assert.false(feed.live);
    assert.false(video.classList.contains("live"));
    feed.stop(); // twice is nothing
  });
});
```

Things to notice:

- **A fake camera** is a function that returns a fake stream (an object with the tracks to stop), or throws an error with a name. The test of a refusal checks the *words*, not the error.
- **Every way of failing has different words**: the test counts them.

Open `tests.html`. You should see **49 passing tests**: 8 more.

## Step 7: The start screen

A phone only lets a page use its camera and its motion sensors **after the person has touched the screen**. So the game begins with a button, and the button is also the place to say what the game is. This one is made to frighten, and it is played while standing in a real room, so there is a warning: sudden scares, flashing lights, loud sounds, and *never while walking about or on stairs*. A later sample adds a setting for how scary it is, and a calm mode.

Open `css/start.css` (the placeholder) and **replace the TODO line** with:

```css
/* The start screen: the logo, what this phone can do, a warning, and a button. It is also the thing a tap goes through, because a phone
   only lets a page use its camera and its motion sensors after the person has touched the screen. */
#start {
  position: fixed;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
  background: var(--night); /* solid: nothing of the game shows through while the warning is read */
  text-align: center;
  transition: opacity 0.7s;
}
#start.hidden {
  opacity: 0;
  pointer-events: none;
}
#start h1 {
  margin: 0;
  line-height: 0;
}
#start h1 img {
  width: min(78vmin, 440px);
  height: auto;
}
#start-status {
  margin: 0;
  max-width: 460px;
  font-size: 16px;
  color: var(--ecto);
  min-height: 2.6em;
}
#start-warning {
  margin: 0;
  max-width: 460px;
  padding: 8px 12px;
  border: 1px solid var(--blood);
  font-size: 13px;
  line-height: 1.4;
  color: var(--bone);
}
#start-warning strong {
  color: var(--blood);
  letter-spacing: 0.1em;
}
#start-button {
  padding: 12px 30px;
  border: 3px solid var(--ghost);
  background: transparent;
  color: var(--ghost);
  font: 400 30px var(--title-font);
  letter-spacing: 0.04em;
  text-shadow: 0 0 10px var(--ghost);
  box-shadow: 0 0 14px rgba(57, 255, 20, 0.45), inset 0 0 14px rgba(57, 255, 20, 0.25);
  cursor: pointer;
}
#start-button:hover, #start-button:focus-visible {
  background: rgba(57, 255, 20, 0.14);
}
#start-button:disabled {
  opacity: 0.45;
  cursor: wait;
}
@media (max-height: 560px) {
  #start h1 img { width: 34vmin; }
}
```

Open `js/start.js` (the placeholder) and **replace the TODO line** with:

```js
// The start screen. A phone only lets a page use its camera and its motion sensors after the person has touched the screen, so the
// game begins with a button, and the button is also the place to say what the game is: this one is meant to frighten, and it is played
// while walking about a real room, which is a reason to be careful. The StartScreen is built from the page's own elements, and given
// the `document` to look in, so the tests can give it a stand-in. See ../tests/start.tests.js.

const WARNING = "Warning: this game is made to frighten. It has sudden scares, flashing lights and loud sounds. Play it sitting down or standing still, in a room you know, and never while walking about or on stairs.";

// The line on the page that says what the phone is looking at (the sensors' readings, as words): "BEARING 045   TILT +12".
function bearingText(bearing, pitch) {
  const sign = pitch < -0.5 ? "-" : pitch > 0.5 ? "+" : " ";
  return `BEARING ${String(Math.round(bearing) % 360).padStart(3, "0")}   TILT ${sign}${String(Math.abs(Math.round(pitch))).padStart(2, "0")}`;
}

class StartScreen {
  constructor(doc = document) {
    const get = (id) => doc.getElementById(id);
    this.root = get("start");
    this.status = get("start-status");
    this.warning = get("start-warning");
    this.button = get("start-button");
    this.warning.textContent = "";
    const strong = doc.createElement("strong");
    strong.textContent = "WARNING ";
    this.warning.appendChild(strong);
    this.warning.appendChild(doc.createTextNode(WARNING.replace("Warning: ", "")));
  }

  setStatus(text) {
    this.status.textContent = text;
  }

  // The button waits while the phone is asked for its camera, and cannot be pressed twice.
  setBusy(busy) {
    this.button.disabled = busy;
  }

  // Calls `callback` when the button is pressed. The call is made straight from the press, which is what a phone wants.
  onEnter(callback) {
    this.button.addEventListener("click", callback);
  }

  hide() {
    this.root.classList.add("hidden");
  }

  get hidden() {
    return this.root.classList.contains("hidden");
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WARNING, bearingText, StartScreen };
} else {
  Object.assign(window, { WARNING, bearingText, StartScreen });
}
```

Things to notice:

- **The warning is put together with `createElement`**, not written as HTML with `innerHTML`: the word "WARNING" is in its own element, in the red of danger.
- **`StartScreen` is given the `document`**, as the other classes of the series are, so a test can give a stand-in.
- **`onEnter` hands the press straight to the game.** A phone wants its questions asked from the tap itself, and not after a wait.
- **`bearingText`** is the line of words at the foot of the screen, the way a detector would read it: `BEARING 045   TILT +12`.

### Tests

Open `tests/start.tests.js` and **replace the TODO line** with:

```js
QUnit.module("bearingText", () => {
  QUnit.test("is the bearing in three figures, and the tilt with its sign", (assert) => {
    assert.strictEqual(bearingText(45, 12), "BEARING 045   TILT +12");
    assert.strictEqual(bearingText(0, 0), "BEARING 000   TILT  00");
    assert.strictEqual(bearingText(270.4, -8.2), "BEARING 270   TILT -08");
  });

  QUnit.test("a bearing that rounds up to a full turn is 0", (assert) => {
    assert.strictEqual(bearingText(359.7, 0), "BEARING 000   TILT  00");
  });
});

QUnit.module("StartScreen", () => {
  class FakeElement {
    constructor(tag = "div") {
      this.tag = tag;
      this.textContent = "";
      this.disabled = false;
      this.children = [];
      this.listeners = {};
      this.classes = new Set();
      this.classList = { add: (name) => this.classes.add(name), contains: (name) => this.classes.has(name) };
    }
    appendChild(child) { this.children.push(child); }
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }
  const make = () => {
    const elements = { start: new FakeElement(), "start-status": new FakeElement(), "start-warning": new FakeElement(), "start-button": new FakeElement("button") };
    const doc = {
      getElementById: (id) => elements[id],
      createElement: (tag) => new FakeElement(tag),
      createTextNode: (text) => Object.assign(new FakeElement("#text"), { textContent: text }),
    };
    return { screen: new StartScreen(doc), elements };
  };

  QUnit.test("the warning is there, and says what the game is", (assert) => {
    const { elements } = make();
    const words = elements["start-warning"].children.map((child) => child.textContent).join("");
    assert.true(words.includes("WARNING"));
    assert.true(words.includes("frighten"));
    assert.true(words.includes("never while walking"));
    assert.true(WARNING.length > 100);
  });

  QUnit.test("says what the phone can do", (assert) => {
    const { screen, elements } = make();
    screen.setStatus("hello");
    assert.strictEqual(elements["start-status"].textContent, "hello");
  });

  QUnit.test("the button is called straight from the press, and can be made to wait", (assert) => {
    const { screen, elements } = make();
    let entered = 0;
    screen.onEnter(() => { entered += 1; });
    elements["start-button"].listeners.click();
    assert.strictEqual(entered, 1);
    screen.setBusy(true);
    assert.true(elements["start-button"].disabled);
    screen.setBusy(false);
    assert.false(elements["start-button"].disabled);
  });

  QUnit.test("hides itself", (assert) => {
    const { screen } = make();
    assert.false(screen.hidden);
    screen.hide();
    assert.true(screen.hidden);
  });
});
```

Open `tests.html`. You should see **55 passing tests**: 6 more.

## Step 8: The developer panel

Every sample of the series has a **developer mode**: add `?dev` to the address and a panel appears with sliders, switches, read-outs and buttons, for the things worth watching while you play. Each row is plain data (a label, and how to read and write the number), so a later part of the game adds a row and not a new panel. You will use it in every part of the series, so it is given to you whole: it is the one from the Rooftop Parkour series, with the colours of this one.

Open `css/devpanel.css` (the placeholder) and **replace the TODO line** with:

```css
/* The developer panel (see devpanel.js): sliders, switches and read-outs on the left of the screen, only there with ?dev in the address.
   It folds up to its title bar, and a short screen starts it folded up, so it never covers much of the picture. */
#dev-panel {
  position: fixed;
  left: 8px;
  top: 52px;
  z-index: 30;
  width: min(340px, 86vw);
  max-height: calc(100vh - 70px);
  overflow-y: auto;
  padding: 6px 10px 10px;
  border: 2px solid var(--ghost);
  background: rgba(13, 15, 19, 0.88);
  color: var(--bone);
  font: 14px / 1.3 var(--small-font);
  letter-spacing: 0.04em;
}
#dev-panel.hidden {
  display: none;
}
#dev-panel .dev-head {
  width: 100%;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--ghost);
  font: 400 22px var(--title-font);
  text-align: left;
  cursor: pointer;
}
#dev-panel.collapsed .dev-body {
  display: none;
}
#dev-panel.collapsed {
  width: auto;
}
#dev-panel h3 {
  margin: 10px 0 2px;
  color: var(--ecto);
  font: 400 17px var(--title-font);
  letter-spacing: 0.08em;
}
#dev-panel .dev-row {
  display: grid;
  grid-template-columns: 96px 1fr 62px;
  align-items: center;
  gap: 6px;
}
#dev-panel .dev-row.readout {
  grid-template-columns: 96px 1fr;
}
#dev-panel .dev-row input[type="range"] {
  width: 100%;
  min-width: 0;
}
#dev-panel .dev-row input[type="checkbox"] {
  justify-self: start;
}
#dev-panel output {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
#dev-panel .dev-row.readout output {
  color: var(--good);
}
#dev-panel .dev-action,
#dev-panel .dev-copy {
  margin: 6px 6px 0 0;
  padding: 3px 10px;
  border: 2px solid var(--bone);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--bone);
  font: 15px var(--small-font);
  letter-spacing: 0.06em;
  cursor: pointer;
}
#dev-panel .dev-action:hover,
#dev-panel .dev-copy:hover {
  background: var(--ghost);
  color: #000;
}
/* A narrow screen has a hint that takes more than one line, so the panel goes lower. A short one has less room, so it may be less tall. */
@media (max-width: 640px) {
  #dev-panel {
    top: 100px;
    max-height: calc(100vh - 120px);
  }
}
@media (max-height: 520px) {
  #dev-panel {
    max-height: calc(100vh - 60px);
  }
}
```

Open `js/devpanel.js` and **replace the TODO line** with:

```js
// The developer panel: sliders, switches and read-outs for the things worth watching and adjusting while you play, to see what they do
// at once. It is only made when the address ends in ?dev, so a player never sees it. Each row is plain data (a label, and how to read
// and write the number), so a later part of the game adds a row, not a new panel. See ../tests/devpanel.tests.js.

const DEV_KEY = "Backquote"; // the key (the one under Esc) that shows and hides the panel

// Is developer mode asked for? `search` is the end of the address, the part from the question mark.
function devEnabled(search) {
  return new URLSearchParams(search || "").has("dev");
}

// A row with a slider, for a number that is kept somewhere particular: how to read it, and how to write it.
function control(label, get, set, min, max, step = 0.01) {
  return { kind: "range", label, min, max, step, get, set };
}

// A row with a slider for a number that is a property of an object: slider("Gravity", world, "g", 0, 30).
function slider(label, object, key, min, max, step = 0.01) {
  return control(label, () => object[key], (value) => { object[key] = value; }, min, max, step);
}

// A row with a switch, for something that is on or off.
function toggle(label, get, set) {
  return { kind: "toggle", label, get, set };
}

// A row that only shows something, such as the speed or the frame rate. `get` gives the words (or a number) to show.
function readout(label, get) {
  return { kind: "readout", label, get };
}

// A row with a button, that does something when it is pressed (jump to a place, say).
function action(label, run) {
  return { kind: "action", label, run };
}

// How many places after the point a step has (0.01 has two), so a number is shown to just that many.
function decimalsOf(step) {
  const text = String(step);
  const point = text.indexOf(".");
  return point < 0 ? 0 : text.length - point - 1;
}

function formatValue(value, step) {
  return Number(value).toFixed(decimalsOf(step));
}

// What a row shows as words: a number to its step, a switch as on or off, a read-out as it is.
function rowText(row) {
  if (row.kind === "toggle") return row.get() ? "on" : "off";
  if (row.kind === "readout") return String(row.get());
  return formatValue(row.get(), row.step);
}

// Every row as a line of text, under the title of its group, to read or to paste back into the code:
//   Camera
//     distance: 5.50
// (A button has nothing to say, so it is left out.)
function valuesText(groups) {
  const lines = [];
  for (const group of groups) {
    lines.push(group.title);
    for (const row of group.rows) if (row.kind !== "action") lines.push(`  ${row.label}: ${rowText(row)}`);
  }
  return lines.join("\n");
}

class DevPanel {
  // `groups` is [{ title, rows }]. It starts folded up, to a title bar, if `collapsed`. `onChange(row, value)` is told of every
  // change, and `clipboard` is where Copy puts the text.
  constructor(doc, groups, { collapsed = false, onChange = () => {}, clipboard = null } = {}) {
    this.groups = groups;
    this.onChange = onChange;
    this.clipboard = clipboard;
    this.inputs = []; // { row, input, output } for every row that has a value, to bring up to date

    this.root = doc.createElement("div");
    this.root.id = "dev-panel";

    this.head = doc.createElement("button");
    this.head.className = "dev-head";
    this.head.addEventListener("click", () => this.toggleCollapsed());
    this.root.appendChild(this.head);

    this.body = doc.createElement("div");
    this.body.className = "dev-body";
    this.root.appendChild(this.body);

    for (const group of groups) {
      const title = doc.createElement("h3");
      title.textContent = group.title;
      this.body.appendChild(title);
      for (const row of group.rows) this.body.appendChild(this._makeRow(doc, row));
    }

    this.copyButton = doc.createElement("button");
    this.copyButton.className = "dev-copy";
    this.copyButton.textContent = "Copy values";
    this.copyButton.addEventListener("click", () => this.copy());
    this.body.appendChild(this.copyButton);

    this.setCollapsed(collapsed);
  }

  // One row. What it has depends on its kind: a slider and its number, a switch, a line of words, or a button.
  _makeRow(doc, row) {
    if (row.kind === "action") {
      const button = doc.createElement("button");
      button.className = "dev-action";
      button.textContent = row.label;
      button.addEventListener("click", () => {
        button.blur();
        row.run();
      });
      return button;
    }

    const line = doc.createElement("label");
    line.className = "dev-row";
    const name = doc.createElement("span");
    name.textContent = row.label;
    const output = doc.createElement("output");
    line.appendChild(name);

    if (row.kind === "readout") {
      line.appendChild(output);
      line.classList.add("readout");
      this.inputs.push({ row, input: null, output });
      this.refresh();
      return line;
    }

    const input = doc.createElement("input");
    if (row.kind === "toggle") {
      input.type = "checkbox";
      input.addEventListener("change", () => {
        row.set(input.checked);
        output.textContent = rowText(row);
        this.onChange(row, input.checked);
        input.blur();
      });
    } else {
      input.type = "range";
      input.min = row.min;
      input.max = row.max;
      input.step = row.step;
      // Once a slider is let go it lets go of the keyboard too, or the arrow keys would move it and not the camera.
      input.addEventListener("change", () => input.blur());
      input.addEventListener("input", () => {
        const value = Number(input.value);
        row.set(value);
        output.textContent = rowText(row);
        this.onChange(row, value);
      });
    }
    line.appendChild(input);
    line.appendChild(output);
    this.inputs.push({ row, input, output });
    this.refresh();
    return line;
  }

  // Shows every row as the game has it now, for when the game has changed one itself.
  refresh() {
    for (const { row, input, output } of this.inputs) {
      if (input) {
        if (row.kind === "toggle") input.checked = Boolean(row.get());
        else input.value = row.get();
      }
      output.textContent = rowText(row);
    }
  }

  // Brings up to date only the read-outs, which change all the time. (Doing the sliders too would fight with a hand that is moving one.)
  refreshReadouts() {
    for (const { row, output } of this.inputs) if (row.kind === "readout") output.textContent = rowText(row);
  }

  get collapsed() {
    return this.root.classList.contains("collapsed");
  }

  setCollapsed(collapsed) {
    this.root.classList.toggle("collapsed", collapsed);
    this.head.textContent = collapsed ? "Dev ▸" : "Dev ▾";
  }

  toggleCollapsed() {
    this.setCollapsed(!this.collapsed);
  }

  get shown() {
    return !this.root.classList.contains("hidden");
  }

  toggleShown() {
    this.root.classList.toggle("hidden", this.shown);
  }

  text() {
    return valuesText(this.groups);
  }

  // Puts the numbers on the clipboard as text (and says so in the console), if there is a clipboard to put them on.
  async copy() {
    const text = this.text();
    console.log(text);
    if (!this.clipboard) return false;
    try {
      await this.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEV_KEY, devEnabled, control, slider, toggle, readout, action, decimalsOf, formatValue, rowText, valuesText, DevPanel };
} else {
  Object.assign(window, { DEV_KEY, devEnabled, control, slider, toggle, readout, action, decimalsOf, formatValue, rowText, valuesText, DevPanel });
}
```

Open `tests/devpanel.tests.js` and **replace the TODO line** with:

```js
QUnit.module("devEnabled", () => {
  QUnit.test("is on when the address has ?dev", (assert) => {
    assert.true(devEnabled("?dev"));
    assert.true(devEnabled("?hour=9&dev"));
    assert.true(devEnabled("?dev=1"));
  });

  QUnit.test("is off otherwise, and for a missing address", (assert) => {
    assert.false(devEnabled(""));
    assert.false(devEnabled("?hour=9"));
    assert.false(devEnabled("?developer"));
    assert.false(devEnabled(undefined));
  });
});

QUnit.module("the kinds of row", () => {
  QUnit.test("a slider reads and writes a property of an object", (assert) => {
    const world = { g: 9.8 };
    const row = slider("Gravity", world, "g", 0, 30);
    assert.strictEqual(row.kind, "range");
    assert.strictEqual(row.get(), 9.8);
    row.set(20);
    assert.strictEqual(world.g, 20);
  });

  QUnit.test("a control reads and writes a number wherever it is kept", (assert) => {
    let kept = 5;
    const row = control("Push", () => kept, (value) => { kept = value; }, 1, 10, 1);
    row.set(8);
    assert.strictEqual(row.get(), 8);
    assert.deepEqual([row.label, row.min, row.max, row.step], ["Push", 1, 10, 1]);
  });

  QUnit.test("a slider has a label, a range, and a step of 0.01 unless told another", (assert) => {
    const row = slider("Gravity", {}, "g", 0, 30);
    assert.deepEqual([row.label, row.min, row.max, row.step], ["Gravity", 0, 30, 0.01]);
    assert.strictEqual(slider("x", {}, "x", 0, 1, 5).step, 5);
  });

  QUnit.test("a toggle is a switch, and a readout only shows, and an action does something", (assert) => {
    let on = false;
    const switchRow = toggle("shadows", () => on, (value) => { on = value; });
    switchRow.set(true);
    assert.strictEqual(switchRow.kind, "toggle");
    assert.true(on);
    assert.strictEqual(readout("speed", () => 3).kind, "readout");
    let ran = 0;
    const button = action("Go", () => ran++);
    button.run();
    assert.deepEqual([button.kind, ran], ["action", 1]);
  });

  QUnit.test("decimalsOf counts the places after the point", (assert) => {
    assert.strictEqual(decimalsOf(1), 0);
    assert.strictEqual(decimalsOf(0.5), 1);
    assert.strictEqual(decimalsOf(0.01), 2);
  });

  QUnit.test("a number is shown to as many places as its step", (assert) => {
    assert.strictEqual(formatValue(160, 1), "160");
    assert.strictEqual(formatValue(0.4, 0.01), "0.40");
    assert.strictEqual(formatValue(0.123456, 0.01), "0.12");
  });

  QUnit.test("rowText shows a number to its step, a switch as on or off, and a read-out as it is", (assert) => {
    assert.strictEqual(rowText(slider("x", { x: 0.5 }, "x", 0, 1, 0.1)), "0.5");
    assert.strictEqual(rowText(toggle("t", () => true, () => {})), "on");
    assert.strictEqual(rowText(toggle("t", () => false, () => {})), "off");
    assert.strictEqual(rowText(readout("r", () => "idle")), "idle");
    assert.strictEqual(rowText(readout("n", () => 12)), "12");
  });

  QUnit.test("valuesText lists each row under the title of its group, and leaves out buttons", (assert) => {
    const groups = [
      { title: "Camera", rows: [slider("distance", { d: 5.5 }, "d", 1, 10), toggle("invert", () => true, () => {})] },
      { title: "Hunter", rows: [readout("clip", () => "Idle_Loop"), action("Go", () => {})] },
    ];
    assert.strictEqual(valuesText(groups), "Camera\n  distance: 5.50\n  invert: on\nHunter\n  clip: Idle_Loop");
  });
});

QUnit.module("DevPanel", () => {
  class FakeElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.listeners = {};
      this.classes = new Set();
      this.textContent = "";
      this.checked = false;
      this.value = "";
      this.className = "";
      this.classList = {
        toggle: (name, on) => (on ? this.classes.add(name) : this.classes.delete(name)),
        contains: (name) => this.classes.has(name),
        add: (name) => this.classes.add(name),
      };
    }
    appendChild(child) {
      this.children.push(child);
    }
    addEventListener(type, callback) {
      this.listeners[type] = callback;
    }
    blur() {
      this.blurred = (this.blurred || 0) + 1;
    }
    find(test) {
      const found = [];
      const walk = (element) => {
        if (test(element)) found.push(element);
        element.children.forEach(walk);
      };
      walk(this);
      return found;
    }
  }

  const doc = { createElement: (tag) => new FakeElement(tag) };

  const make = (options) => {
    const state = { power: 160, on: false, speed: 3 };
    const ran = [];
    const groups = [
      {
        title: "Marble",
        rows: [
          slider("power", state, "power", 1, 512, 1),
          toggle("on", () => state.on, (value) => { state.on = value; }),
          readout("speed", () => state.speed),
          action("Go", () => ran.push("go")),
        ],
      },
    ];
    return { panel: new DevPanel(doc, groups, options), state, ran };
  };

  QUnit.test("makes a slider for a range row, set to where the number is", (assert) => {
    const { panel } = make();
    const [input] = panel.root.find((e) => e.tag === "input" && e.type === "range");
    assert.deepEqual([input.min, input.max, input.step, input.value], [1, 512, 1, 160]);
  });

  QUnit.test("makes a checkbox for a switch, a line for a read-out, and a button for an action", (assert) => {
    const { panel } = make();
    assert.strictEqual(panel.root.find((e) => e.tag === "input" && e.type === "checkbox").length, 1);
    assert.strictEqual(panel.root.find((e) => e.tag === "label" && e.classes.has("readout")).length, 1);
    assert.deepEqual(panel.root.find((e) => e.className === "dev-action").map((b) => b.textContent), ["Go"]);
  });

  QUnit.test("the numbers shown are the numbers the game has", (assert) => {
    const { panel } = make();
    assert.deepEqual(panel.root.find((e) => e.tag === "output").map((o) => o.textContent), ["160", "off", "3"]);
  });

  QUnit.test("each group has its title", (assert) => {
    const { panel } = make();
    assert.deepEqual(panel.root.find((e) => e.tag === "h3").map((h) => h.textContent), ["Marble"]);
  });

  QUnit.test("moving a slider changes the number, shows it, and tells onChange", (assert) => {
    const changes = [];
    const { panel, state } = make({ onChange: (row, value) => changes.push([row.label, value]) });
    const [input] = panel.root.find((e) => e.tag === "input" && e.type === "range");
    input.value = "200";
    input.listeners.input();
    assert.strictEqual(state.power, 200);
    assert.strictEqual(panel.root.find((e) => e.tag === "output")[0].textContent, "200");
    assert.deepEqual(changes, [["power", 200]]);
  });

  QUnit.test("a slider that has been let go lets go of the keyboard, so the keys work the game", (assert) => {
    const { panel } = make();
    const [input] = panel.root.find((e) => e.tag === "input" && e.type === "range");
    input.listeners.change();
    assert.strictEqual(input.blurred, 1);
  });

  QUnit.test("a switch changes the game, shows on or off, tells onChange, and lets go of the keyboard", (assert) => {
    const changes = [];
    const { panel, state } = make({ onChange: (row, value) => changes.push([row.label, value]) });
    const [box] = panel.root.find((e) => e.tag === "input" && e.type === "checkbox");
    box.checked = true;
    box.listeners.change();
    assert.true(state.on);
    assert.strictEqual(panel.root.find((e) => e.tag === "output")[1].textContent, "on");
    assert.deepEqual(changes, [["on", true]]);
    assert.strictEqual(box.blurred, 1);
  });

  QUnit.test("a button does its action and lets go of the keyboard", (assert) => {
    const { panel, ran } = make();
    const [button] = panel.root.find((e) => e.className === "dev-action");
    button.listeners.click();
    assert.deepEqual(ran, ["go"]);
    assert.strictEqual(button.blurred, 1);
  });

  QUnit.test("refresh brings every row up to date with what the game has changed", (assert) => {
    const { panel, state } = make();
    state.power = 300;
    state.on = true;
    state.speed = 9;
    panel.refresh();
    assert.strictEqual(panel.root.find((e) => e.tag === "input" && e.type === "range")[0].value, 300);
    assert.true(panel.root.find((e) => e.tag === "input" && e.type === "checkbox")[0].checked);
    assert.deepEqual(panel.root.find((e) => e.tag === "output").map((o) => o.textContent), ["300", "on", "9"]);
  });

  QUnit.test("refreshReadouts brings up to date only the read-outs, and leaves the sliders alone", (assert) => {
    const { panel, state } = make();
    const [input] = panel.root.find((e) => e.tag === "input" && e.type === "range");
    state.power = 300;
    state.speed = 9;
    panel.refreshReadouts();
    assert.strictEqual(input.value, 160);
    assert.deepEqual(panel.root.find((e) => e.tag === "output").map((o) => o.textContent), ["160", "off", "9"]);
  });

  QUnit.test("it starts open, or folded up if asked, and the title bar folds it and opens it", (assert) => {
    assert.false(make().panel.collapsed);
    const { panel } = make({ collapsed: true });
    assert.true(panel.collapsed);
    panel.head.listeners.click();
    assert.false(panel.collapsed);
    assert.true(panel.head.textContent.includes("▾"));
  });

  QUnit.test("toggleShown hides the whole panel and shows it again, without forgetting that it was folded", (assert) => {
    const { panel } = make({ collapsed: true });
    panel.toggleShown();
    assert.false(panel.shown);
    panel.toggleShown();
    assert.true(panel.shown);
    assert.true(panel.collapsed);
  });

  QUnit.test("copy puts the numbers on the clipboard as text", async (assert) => {
    const written = [];
    const { panel } = make({ clipboard: { writeText: async (text) => written.push(text) } });
    assert.true(await panel.copy());
    assert.deepEqual(written, ["Marble\n  power: 160\n  on: off\n  speed: 3"]);
  });

  QUnit.test("copy without a clipboard, or with one that refuses, doesn't fail", async (assert) => {
    assert.false(await make().panel.copy());
    assert.false(await make({ clipboard: { writeText: async () => { throw new Error("no"); } } }).panel.copy());
  });
});
```

Things to notice:

- **Five kinds of row**: a slider for a number that is kept somewhere (`control`), a slider for a property of an object (`slider`), a switch (`toggle`), a read-out (`readout`) and a button (`action`).
- **It only exists with `?dev`.** `devEnabled` reads the address, and a player never sees the panel.
- **A slider lets go of the keyboard** when it is let go, or the arrow keys would move it and not the game.
- **Copy values** puts the numbers on the clipboard as text, to paste back into the code when you have found a number you like.

Open `tests.html`. You should see **79 passing tests**: 24 more.

## Step 9: The game

Now everything joined together, in `js/main.js`. It is a script, not a class, and it is written in five pieces. The page works after each, so you can look at it as you go.

### The scene

The first piece: the engine, the device, the camera's picture, and a scene that is **see-through**.

Open `js/main.js` (the placeholder) and **replace the TODO line** with:

```js
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true, { alpha: true, preserveDrawingBuffer: true, stencil: true });
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 2));

const feedVideo = document.getElementById("feed");
const reticle = document.getElementById("reticle");
const notice = document.getElementById("notice");
const compass = document.getElementById("compass");

const device = describeDevice();
const support = detectSupport(device);
const feed = new CameraFeed(feedVideo);
const gyro = new GyroLook(() => (screen.orientation ? screen.orientation.angle : window.orientation) || 0);
const drag = new DragLook();
let source = "drag"; // what the player is looking around with: "gyro" or "drag"
let panel = null; // the developer panel, if there is one (see the end of this file)

const start = new StartScreen();
start.setStatus(startStatus(support));

// The scene is see-through: where nothing is drawn, the camera's picture shows (or, with no camera, the dark of the page).
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity = 0.04;
scene.fogColor = new BABYLON.Color3(0.02, 0.03, 0.05);

const eye = new BABYLON.FreeCamera("eye", new BABYLON.Vector3(0, LOOK.eyeHeight, 0), scene);
eye.fov = toRadians(LOOK.fovDegrees);
eye.minZ = 0.05;
eye.rotationQuaternion = new BABYLON.Quaternion();
eye.inputs.clear(); // the phone is the controls, not the keys

new BABYLON.HemisphericLight("dim", new BABYLON.Vector3(0, 1, 0), scene).intensity = 0.5;

engine.runRenderLoop(() => scene.render());
window.addEventListener("resize", () => engine.resize());
```

Things to notice:

- **`alpha: true` makes a canvas that can be see-through**, and a clear colour of `Color4(0, 0, 0, 0)` has an alpha of 0: where nothing is drawn, the page behind shows, which is the camera's picture. With `preserveDrawingBuffer` a screenshot of the canvas works too.
- **The sensors and the camera are made but not started.** `gyro`, `drag` and `feed` are objects that wait; the button of the start screen starts them (in a moment).
- **`eye.inputs.clear()`**: this camera has no keys and no mouse. The phone is the controls.
- **The field of view is a number of the table** (`LOOK.fovDegrees`): the camera of a phone sees about 60 degrees from the top of the screen to the bottom, and the dev panel will change it, to match the picture to the scene.
- **`panel` is declared here, as `null`**, and filled in at the end of the file: pieces in between look at it every frame, and they must not find it undefined.

Open the page. It is the start screen over a dark room: pressing the button does nothing yet.

### Things to look at

Now something to see, so that looking around can be seen to work. **A ring of glowing posts** round the player every 45 degrees, each with its bearing written above it, with the one straight ahead in the cold ecto blue and the others in ghost green, and a glowing sphere straight up. They stand where the ghosts will. And **a floor**: with a camera, the floor is the real one; without, a dark grid, fading into the fog.

At the end of `js/main.js` add:

```js
// Some things to look at, so that looking around can be seen to work: a ring of glowing posts round the player, every 45 degrees,
// with the bearing on each, and one straight up. They stand where the ghosts will.
const glow = (name, color) => {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.disableLighting = true;
  material.emissiveColor = BABYLON.Color3.FromHexString(color);
  return material;
};
const green = glow("green", "#39ff14");
const cyan = glow("cyan", "#3ce6ff");

function label(text) {
  const texture = new BABYLON.DynamicTexture(`label-${text}`, { width: 256, height: 128 }, scene, true);
  texture.hasAlpha = true;
  texture.drawText(text, null, 92, "bold 84px monospace", "#39ff14", "transparent", true);
  const plane = BABYLON.MeshBuilder.CreatePlane(`label-${text}`, { width: 1, height: 0.5 }, scene);
  const labelMaterial = new BABYLON.StandardMaterial(`label-${text}`, scene);
  labelMaterial.disableLighting = true;
  labelMaterial.emissiveTexture = texture;
  labelMaterial.opacityTexture = texture;
  plane.material = labelMaterial;
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  return plane;
}

const RING_RADIUS = 4;
for (let bearing = 0; bearing < 360; bearing += 45) {
  const angle = toRadians(bearing);
  const x = Math.sin(angle) * RING_RADIUS;
  const z = Math.cos(angle) * RING_RADIUS;
  const post = BABYLON.MeshBuilder.CreateCylinder(`post-${bearing}`, { height: LOOK.eyeHeight * 2, diameter: 0.08 }, scene);
  post.position.set(x, LOOK.eyeHeight, z);
  post.material = bearing === 0 ? cyan : green;
  label(String(bearing).padStart(3, "0")).position.set(x, LOOK.eyeHeight * 2 + 0.4, z);
}
const above = BABYLON.MeshBuilder.CreateSphere("above", { diameter: 0.3 }, scene);
above.position.set(0, LOOK.eyeHeight + 3, 0);
above.material = cyan;

// With no camera there is no room, so there is a floor to stand on: a grid, fading into the dark.
const floor = BABYLON.MeshBuilder.CreateGround("floor", { width: 30, height: 30 }, scene);
const grid = new BABYLON.GridMaterial("grid", scene);
grid.mainColor = new BABYLON.Color3(0.02, 0.05, 0.03);
grid.lineColor = new BABYLON.Color3(0.1, 0.5, 0.1);
grid.gridRatio = 1;
floor.material = grid;
floor.isVisible = false;
```

Things to notice:

- **A `DynamicTexture` is a picture made in code**: here, a number drawn on it, used as both the colour and the see-through part of a plane (`opacityTexture`), and the plane is a **billboard** that always faces the camera.
- **The floor is hidden at first**: it is only shown if there is no camera.

### Looking around

The camera must turn every frame to where the player is looking, and the player must be able to *make* it look somewhere: by dragging, by the sensors, by pressing R.

At the end of `js/main.js` add:

```js
// Every frame the camera is turned to where the player is looking.
const axes = new BABYLON.Matrix();
function aim() {
  const view = source === "gyro" ? gyro.look() : drag.look();
  const { right, up, forward } = lookAxes(view.forward, view.up);
  BABYLON.Matrix.FromXYZAxesToRef(new BABYLON.Vector3(...right), new BABYLON.Vector3(...up), new BABYLON.Vector3(...forward), axes);
  BABYLON.Quaternion.FromRotationMatrixToRef(axes, eye.rotationQuaternion);
  return view;
}

scene.onBeforeRenderObservable.add(() => {
  const view = aim();
  compass.textContent = bearingText(bearingOf(view.forward), pitchOf(view.forward));
  if (panel) panel.refreshReadouts();
});

// Dragging to look: for a desktop, and for a phone with no motion sensors.
let dragging = null;
canvas.addEventListener("pointerdown", (event) => {
  dragging = { x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragging || source !== "drag") return;
  drag.drag(event.clientX - dragging.x, event.clientY - dragging.y);
  dragging = { x: event.clientX, y: event.clientY };
});
const endDrag = () => { dragging = null; };
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

function recentre() {
  gyro.recentre();
  drag.recentre();
}
window.addEventListener("keydown", (event) => {
  if (event.code === "KeyR") recentre();
});

window.addEventListener("deviceorientation", (event) => gyro.feed(event));
```

Things to notice:

- **`aim` turns the three directions into a rotation.** `Matrix.FromXYZAxesToRef` makes a rotation matrix out of the right, the up and the forward directions of a camera, and `Quaternion.FromRotationMatrixToRef` turns it into the camera's `rotationQuaternion`. (The obvious way, `Quaternion.FromLookDirectionLH`, gives a rotation that turns the other way: the tests found it.)
- **A drag only counts if the player is looking by dragging.** A phone with sensors does not turn when the finger moves.
- **`setPointerCapture`** keeps the drag going when the pointer leaves the canvas.
- **R is `recentre`**: the way you face now becomes the front, on both kinds of look.
- **The words at the foot of the screen** are written from the same directions that turn the camera, so if they say 000 the camera is facing the front.

### The button

The part that touches the phone. It must start *from the tap*, so it asks for the sensors **first**, before anything waits, and then the camera.

At the end of `js/main.js` add:

```js
// Waits up to `milliseconds` for the motion sensors to send a reading: a desktop has them in the code and never sends one.
const gyroReading = (milliseconds) => new Promise((resolve) => {
  if (gyro.ready) return resolve(true);
  const started = performance.now();
  const check = () => {
    if (gyro.ready) resolve(true);
    else if (performance.now() - started > milliseconds) resolve(false);
    else setTimeout(check, 50);
  };
  check();
});

// The button. A phone wants the questions asked straight from the tap, so the motion sensors are asked for first, before anything waits.
async function enter() {
  start.setBusy(true);
  const motion = support.needsPermission ? await askForMotion(window.DeviceOrientationEvent) : "granted";
  const picture = support.camera ? await feed.start() : { ok: false, message: "" };
  const reading = motion === "granted" && support.motion ? await gyroReading(1200) : false;
  source = chooseLookSource(support, reading);

  const problems = [];
  if (support.camera && !picture.ok) problems.push(picture.message);
  if (motion === "denied") problems.push("The motion sensors were not allowed, so drag the screen to look around.");
  else if (!reading && support.motion) problems.push("This device sent no motion readings: drag the screen to look around.");
  notice.textContent = problems.join(" ");

  gyro.recentre();
  floor.isVisible = !feed.live; // no camera, no room: so there is a floor
  reticle.classList.add("shown");
  start.hide();
  start.setBusy(false);
  if (panel) panel.refresh();
}
start.onEnter(enter);
```

Things to notice:

- **The order is the order of the phone's rules**: the sensors' permission first (an iPhone wants it asked straight from the tap), then the camera, and only then a wait for the first reading of the sensors.
- **Each problem is a notice** and not an error: the camera refused, the sensors refused, or no reading ever came. The game carries on with what it has, and says so.
- **`gyro.recentre()` once everything is going**: whichever way the player faces at that moment is the front.
- **No picture, so a floor.** The room is made out of the dark, if there is no room.

### Developer mode

At the end of `js/main.js` add:

```js
// Developer mode, with ?dev on the end of the address: a panel to watch and change things while the game runs. The key under Esc
// shows and hides it, and a short screen starts it folded up, so it never covers much of the picture.
if (devEnabled(location.search)) {
  panel = new DevPanel(
    document,
    [
      {
        title: "Looking",
        rows: [
          readout("look source", () => source),
          readout("camera picture", () => (feed.live ? "live" : "none")),
          readout("sensor readings", () => gyro.readings),
          readout("alpha / beta / gamma", () => (gyro.reading ? `${gyro.reading.alpha.toFixed(0)} / ${gyro.reading.beta.toFixed(0)} / ${gyro.reading.gamma.toFixed(0)}` : "-")),
          slider("field of view", LOOK, "fovDegrees", 30, 100, 1),
          slider("drag speed", LOOK, "dragRadiansPerPixel", 0.001, 0.01, 0.0005),
          action("Recentre", recentre),
          action("Look by dragging", () => { source = "drag"; }),
          action("Look by the sensors", () => { if (gyro.ready) source = "gyro"; }),
          toggle("show the floor", () => floor.isVisible, (value) => { floor.isVisible = value; }),
        ],
      },
    ],
    { collapsed: window.innerHeight < 600, clipboard: navigator.clipboard },
  );
  document.body.appendChild(panel.root);
  window.addEventListener("keydown", (event) => {
    if (event.code === DEV_KEY) panel.toggleShown();
  });
  scene.onBeforeRenderObservable.add(() => { eye.fov = toRadians(LOOK.fovDegrees); });
  window.dev = { scene, eye, gyro, drag, feed, panel, enter, recentre }; // for poking at from the console
}
```

Things to notice:

- **The panel is one group of rows**: read-outs of the look source and the sensors' angles (to see what a real phone sends), sliders for the field of view and the drag speed, buttons to recentre and to switch between looking by the sensors and by dragging, and a switch for the floor.
- **`window.dev`** is the things to poke at from the console of the browser.
- **The key under Esc** (`Backquote`) shows and hides the panel, and a short screen starts it folded up.

## Step 10: Try it

**On a desktop** (with `?dev` on the end of the address, press the button):

- You are in a dark room with a floor and a ring of glowing posts. **Drag** with the mouse to look around: the bearing at the foot of the screen changes, and the blue post is the one at 000. **R** makes where you are looking now the front.
- The camera is refused or missing, and the notice says so in words. If your computer has a camera and you allow it, the picture is behind the scene.
- In the panel, change **field of view**: the posts get bigger or smaller.

**On a phone** (open the HTTPS address of your tunnel, Step "Serving the page"):

- The start screen says what the phone will ask for. Press the button, and **allow both**.
- The picture of the back camera is behind the posts. **Turn the phone**: the posts stay where they are in the room, and the bearing at the foot changes.
- Turn the phone **on its side**: the scene turns with it, and the posts are upright.
- Press **R** (on a phone, add `?dev` to the address and use the button "Recentre" of the developer panel) to make where you are facing the front.
- Say **no** to the camera: you get the dark room and a message. Say no to the sensors: you can drag.
- On an **iPhone**, the sensors' question is asked first; on an **Android** phone you are not asked for them.

If the posts drift as you turn, that is the sensors' own drift, which a later step smooths. If they are a long way out of step with the picture, change the **field of view** in the panel until the posts stay on the same things in the room when you turn.

## Step 11: Tests, all together

Open `tests.html`. You should see **79 passing tests**. The look arithmetic is tested for every direction of a phone; the device and its support and the permission for every kind of device; the camera with a stand-in for the browser's camera; the start screen and the developer panel with stand-ins for the page. None of it needs a phone, a camera or a screen.

## Recap: what you built

| What | Where |
|------|-------|
| The colours and the lettering of the logo | `css/theme.css` |
| The layers of the page | `css/page.css`, `index.html` |
| What a device can do, and the permission | `describeDevice`, `detectSupport`, `chooseLookSource`, `startStatus`, `askForMotion` in `support.js` |
| The directions of a phone, a drag, and a camera | `lookFromAngles`, `lookFromDrag`, `lookAxes` in `look.js` |
| Looking by dragging, and by the sensors | `DragLook`, `GyroLook` in `look.js` |
| The camera's picture and its messages | `CameraFeed`, `explainCameraError` in `camerafeed.js` |
| The start screen and its warning | `StartScreen`, `WARNING` in `start.js`, `css/start.css` |
| The developer panel | `devpanel.js`, `css/devpanel.css` |
| The scene, the posts and the button | `main.js` |

## Challenges

- **Smooth the sensors.** The readings jitter a little. Keep the last direction and move a fraction of the way to the new one each frame (a low-pass filter, or a spherical interpolation of the two quaternions), with the fraction a number of the table and a slider in the panel.
- **North.** Some phones send `deviceorientationabsolute`, measured from the real north. Use it where it is sent, and put a letter N on the post that really is to the north.
- **A real field of view.** Different phones see different angles. Ask the camera's track for its settings (`getSettings()`), and see what it says about the picture's width and height.
- **Another camera.** Add a button to the corner that asks for the camera on the front (`facingMode: "user"`) and back again.
- **Say it in the notice.** The notice stays for ever. Make it fade after a few seconds, and write a test that says when it should go.
