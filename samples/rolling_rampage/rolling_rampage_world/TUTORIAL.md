# Tutorial: Rolling Rampage World -- A Marble on a Ramp

This is the first tutorial in the Rolling Rampage series: an isometric marble game in the spirit of the classic arcade games. You steer a steel marble down courses of ramps and ledges, against the clock, past pistons and moving platforms, with enemy marbles chasing you, and you can play it by tilting your phone. Nothing is steered yet. First you build the **world**: a physics engine, a course to roll on, a marble that rolls on it, an isometric camera, and a page that fits a phone from the very first step. You write the code; this document tells you what to write and why.

By the end you'll have:

- A **page that works on a phone**: it fits the screen, doesn't scroll or zoom under a finger, and draws no more pixels than it needs to
- A **physics world** with the Havok engine: gravity, and surfaces with friction and bounce
- A **course**: ramps and decks described as plain data, turned into boxes the physics can roll on
- A **marble**: a steel ball that is a physics body, which rolls down the ramp, bounces, slows down and falls off the edge
- A **shadow** under the marble, from a light that follows it, which shows how high the marble is above the floor
- An **isometric camera** with no perspective, that fits any screen shape and follows the marble smoothly
- A **splash screen** that stays for at least three seconds
- Unit tests for all of it, **including tests that run the real physics** with nothing drawn

**What you'll learn:** loading a WebAssembly physics engine, rigid bodies (fixed and moving), shapes, friction, restitution (bounce) and damping, why physics is tested by letting time pass, orthographic cameras and the isometric angles, `ArcRotateCamera`, repeating a texture drawn in code, shadows and why their area has to follow the action, `devicePixelRatio` and hardware scaling, the `viewport` meta tag, and the `NullEngine`, which lets you test 3D code with no screen.

## Where you're starting

This folder holds only empty placeholder files for the code you'll write. There are no 3D models in this series: everything is built from boxes and spheres, and from code. The pictures and fonts the whole series shares are in a folder beside it, `assets/`, so there is nothing to download.

```
rolling_rampage/
├── assets/                              (the logo and the fonts, shared by the series)
└── rolling_rampage_world/
    ├── index.html                       (placeholder -- Step 1)
    ├── tests.html                       (placeholder -- Step 2)
    ├── css/
    │   └── game.css                     (placeholder -- Step 1)
    ├── js/
    │   ├── physics.js                   (placeholder -- Step 2)
    │   ├── course.js                    (placeholder -- Step 3)
    │   ├── marble.js                    (placeholder -- Step 4)
    │   ├── camera.js                    (placeholder -- Step 5)
    │   ├── splash.js                    (placeholder -- Step 6)
    │   └── main.js                      (placeholder -- Step 7)
    └── tests/
        ├── physics.tests.js             (placeholder -- Step 2)
        ├── course.tests.js              (placeholder -- Step 3)
        ├── marble.tests.js              (placeholder -- Step 4)
        ├── camera.tests.js              (placeholder -- Step 5)
        └── splash.tests.js              (placeholder -- Step 6)
```

### The logo and the fonts

They are already in `assets/`:

| File | What it is |
|---|---|
| `assets/images/rolling_rampage_logo_small.webp` | The logo, 800 pixels wide, with its white background made transparent. It is a WebP, which keeps transparency at about a tenth of the size of a PNG. The full-size original is beside it |
| `assets/fonts/RussoOne-Regular.ttf` | **Russo One**: a wide, heavy font for big words and numbers, close to the weight of the logo's "ROLLING" |
| `assets/fonts/BarlowCondensed-SemiBold.ttf`, `-Bold.ttf` | **Barlow Condensed**: a road-sign font, very legible small, and narrow enough for a phone's HUD. It is the one to use for anything small |
| `assets/fonts/SairaStencilOne-Regular.ttf` | **Saira Stencil One**: stencil lettering, like on a shipping crate, for a few labels, and only big (its letters have gaps) |

The three fonts are free under the SIL Open Font License; the licenses are in the same folder. The look of the game, its colors and its fonts, was taken from the logo: riveted gunmetal, chrome, hazard-stripe yellow, safety orange and one cool blue.

### Serving the page

Nothing in this step loads a file of its own (the physics engine comes from the internet, from the same place as Babylon.js), so a page opened straight from a file will usually work. A web server is safer, and later steps will need one for the sensors on a phone. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_world/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Testing on a phone-sized screen

You don't need a phone for this. Open the page in Chrome or Edge, press **F12**, then **Ctrl+Shift+M** (the *device toolbar*), and choose a phone from the list. The page reloads as that phone, with its screen size, a touch pointer and its pixel density. The rotate button turns it on its side. This tutorial calls that **device mode**.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh set of placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: A page for a phone

Start with the page, because a game that is built for a desktop and squeezed onto a phone later is never quite right. Two files: `index.html` for what is on the page, and `css/game.css` for how it looks. Open the placeholder `index.html` and replace its contents with:

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <title>Rolling Rampage World - Babylon.js</title>
  <link rel="stylesheet" href="../../../css/sample.css">
  <link rel="stylesheet" href="css/game.css">
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script>
    // Rolling Rampage will use Space for other things later, so move the shared
    // screenshot shortcut to C for this series.
    window.SCREENSHOT_KEY = "KeyC";
  </script>
</head>

<body>
  <a class="back-button" href="../../../index.html#rolling_rampage">&larr; Samples</a>
  <div class="hint">R to roll again &middot; C for a screenshot &middot; <a href="tests.html">Run tests</a></div>
  <div id="splash">
    <img src="../assets/images/rolling_rampage_logo_small.webp" alt="Rolling Rampage">
    <p id="splash-status">Loading&hellip;</p>
  </div>
  <button id="drop" class="hazard" type="button">Drop again</button>
  <canvas id="renderCanvas"></canvas>
  <script src="../../../js/screenshot.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="js/main.js"></script>
</body>

</html>
```

Things to notice:

- **The `viewport` tag is the most important line for a phone.** Without it a phone pretends the page is about 980 pixels wide and shrinks everything to fit, so nothing you do for a small screen would apply. `width=device-width` says to use the real width. `maximum-scale=1, user-scalable=no` stops pinch-zoom, which would otherwise fight the game.
- **Babylon.js and Havok load in `<head>`, and your own scripts at the bottom of `<body>`,** after the canvas. Your scripts look for the canvas as soon as they run, so it has to exist already.
- **Havok is a script of its own.** `HavokPhysics_umd.js` is a small loader, and when it runs it fetches the physics engine itself, a WebAssembly file of about two megabytes, from the same folder. It is loaded from the same place as Babylon.js. (The `umd` in the name is the kind of script that works without a bundler.)
- **The order of the scripts matters.** `physics.js` comes first because the others use it, `main.js` comes last because it uses all of them.
- **The splash is the logo.** It is an `<img>`, with the text *Loading...* under it. The page *starts* with the splash up, so it covers everything while Havok and the world load.
- **There is a button for dropping the marble again,** because a phone has no R key. Everything this game needs a key for will need a button or a gesture too.
- **`lang="en"`** on `<html>` helps screen readers and translation tools.

Open the placeholder `css/game.css` and replace its contents with:

```css
/* The look of Rolling Rampage, taken from its logo: riveted gunmetal, chrome lettering,
   hazard-stripe yellow and safety orange, and one cool blue. The colors and the fonts are
   named once here, and everything else uses the names. */
@font-face {
  font-family: "Russo One";
  src: url("../../assets/fonts/RussoOne-Regular.ttf") format("truetype");
  font-display: swap;
}
@font-face {
  font-family: "Barlow Condensed";
  src: url("../../assets/fonts/BarlowCondensed-SemiBold.ttf") format("truetype");
  font-weight: 600;
  font-display: swap;
}
@font-face {
  font-family: "Barlow Condensed";
  src: url("../../assets/fonts/BarlowCondensed-Bold.ttf") format("truetype");
  font-weight: 700;
  font-display: swap;
}
@font-face {
  font-family: "Saira Stencil One";
  src: url("../../assets/fonts/SairaStencilOne-Regular.ttf") format("truetype");
  font-display: swap;
}
:root {
  /* The three fonts. Russo One is wide and heavy, for big words and numbers. Barlow
     Condensed is the legible one, for everything small, and the one to fall back on. The
     stencil is for a few labels, and only big: its letters have gaps. */
  --title-font: "Russo One", "Barlow Condensed", system-ui, sans-serif;
  --small-font: "Barlow Condensed", system-ui, sans-serif;
  --stencil-font: "Saira Stencil One", "Russo One", system-ui, sans-serif;

  --ink: #0b0909; /* the black outline round everything in the logo */
  --gunmetal: #211e21;
  --steel-dark: #30384a;
  --steel: #4b5367;
  --chrome-dark: #757d8e;
  --chrome: #a2adc0;
  --chrome-light: #d9dbdc;
  --yellow: #f6bf0e; /* hazard stripes: the main accent */
  --orange: #ef5e07; /* the crate, and the flame's tail: danger */
  --rust: #b25b0e;
  --blue: #248de3; /* the sky: the one cool color, for good things */
  --background: #161b26; /* behind the course: dark, so chrome and yellow stand out */
}

/* .hint has pointer-events: none so the canvas stays interactive; opt the
   "Run tests" link back in so it can be clicked. */
.hint a {
  pointer-events: auto;
  color: var(--blue);
}
.hint {
  font-family: var(--small-font);
  font-weight: 600;
  letter-spacing: 0.03em;
}

/* The splash covers the page while the game loads, then fades away. */
#splash {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: radial-gradient(circle at 50% 40%, var(--steel-dark), var(--background) 70%);
  transition: opacity 0.6s ease;
}
#splash.hidden {
  opacity: 0;
  pointer-events: none;
}
#splash img {
  max-width: min(80vw, 520px);
  max-height: 62vh;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.6));
}
#splash p {
  margin: 0;
  padding: 0 24px;
  text-align: center;
  color: var(--chrome);
  font: 400 clamp(18px, 4.5vw, 26px) / 1.3 var(--stencil-font);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* A button for pressing: dark steel, with a hazard-stripe border, like the edge of a ramp.
   Pressing it, or hovering, lights it up in yellow. */
button.hazard {
  padding: 8px 20px;
  border: 6px solid;
  border-image: repeating-linear-gradient(45deg, var(--yellow) 0 8px, var(--ink) 8px 16px) 6;
  background: var(--steel-dark);
  color: var(--chrome-light);
  font: 700 22px/1 var(--small-font);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  touch-action: manipulation;
}
button.hazard:hover,
button.hazard:active {
  background: var(--yellow);
  color: var(--ink);
}
#drop {
  position: fixed;
  right: 12px;
  bottom: 12px;
  z-index: 20;
}

/* The back button and the hint stay above the splash's fade and anything else. */
.back-button,
.hint {
  z-index: 26;
}

/* Touch. The page must not scroll, zoom or select text when a finger moves over it. */
html,
body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}

/* A small screen: a phone, or a window made small. */
@media (max-width: 640px), (max-height: 520px) {
  .hint {
    display: none;
  }
  button.hazard {
    padding: 6px 14px;
    font-size: 20px;
  }
}
```

Things to notice:

- **The colors and fonts are named once, at the top, and used by name.** `--yellow`, `--orange`, `--steel` and the rest are the colors of the logo, and `--title-font`, `--small-font` and `--stencil-font` are the three fonts by their jobs. Restyling the game later means changing this block.
- **`@font-face` names a font and says where its file is,** and the path is relative to the *CSS file*, which is two folders below `assets/`, so it starts with `../../`. `font-display: swap` shows text at once in a stand-in font and swaps when the file arrives, so a slow connection doesn't leave blank space. Barlow Condensed has two weights, so it has two `@font-face` rules with the same name.
- **A font list ends with fallbacks.** `"Russo One", "Barlow Condensed", system-ui, sans-serif`: if the first can't load the browser tries the next, so big words fall back to the other font and not to a plain one.
- **The hazard-stripe border is `border-image`.** A `repeating-linear-gradient` at 45 degrees, yellow then black in 8 pixel bands, is used as the picture for a 6 pixel border. (A border image doesn't follow rounded corners, which suits a square button.)
- **The dark colors behind the course are chosen so the chrome marble and the yellow stand out.** The logo is bright and busy, so the game itself is calmer, and lets the logo carry the loudness.
- **`overscroll-behavior: none`, `user-select: none` and `-webkit-tap-highlight-color`** stop the browser doing what it does with a finger: pull the page down to refresh, select text when you press and hold, and flash a highlight when you tap.
- **`touch-action: manipulation` on buttons** turns off double-tap-to-zoom, which also made a tap wait a moment in case a second one was coming. (The canvas already has `touch-action: none` from the shared stylesheet.)
- **`clamp(18px, 4.5vw, 26px)`** sizes the *Loading* text between 18 and 26 pixels by the width of the screen, so it fits on a phone and is bigger on a monitor, with no media query. The logo itself is sized with `min(80vw, 520px)` and `max-height: 62vh`, so it can't be wider than the screen or taller than most of it.
- **The media query is for a small screen:** a phone, either way up, or a window made small. For now it only hides the keyboard hint and makes the button a little smaller.

Serve the page. You should see the logo on a dark steel-blue screen, with **LOADING...** in stencil letters under it. It stays up for now, because nothing takes the splash away yet. Open it in device mode too: the logo should fit, upright and on its side.

---

## Step 2: A physics world

A **physics engine** moves things the way the real world does. You say what exists (a ball, a floor), how heavy each thing is, and how grippy and bouncy its surface is. Every frame the engine works out the forces, moves everything, and handles collisions. **Havok** is the one Babylon.js supports best: the engine of many commercial games, compiled to WebAssembly so it runs at near native speed in a browser.

Open the placeholder `js/physics.js` and replace its contents with:

```js
// The physics world: loading Havok, and the numbers that decide how things feel.
// Havok is a physics engine written in WebAssembly. It moves every body in the world
// (the marble, the floors) under gravity, and works out the collisions between them. We
// only say what is in the world, and how bouncy and how grippy each thing is. See
// ../tests/physics.tests.js.

// Gravity, in units a second a second. Earth's is 9.8, but a world this small feels like a
// slow-motion film at that, so a marble in this game falls faster.
const GRAVITY = -24;

// How each kind of surface behaves. `friction` is how much it grips what rolls on it
// (0 is ice) and `restitution` how much it bounces what lands on it (0 is clay, 1 is rubber).
const SURFACES = {
  steel: { friction: 0.45, restitution: 0.25 }, // the marble
  deck: { friction: 0.6, restitution: 0.1 }, // the floors
};

// Havok is loaded from a script (see index.html), and the loading is slow, so it is done
// once and the same instance is shared by every world in the page.
let havokLoading = null;
function loadHavok() {
  if (!havokLoading) havokLoading = HavokPhysics();
  return havokLoading;
}

// Turns physics on in a scene, with gravity pulling down. Returns the physics plugin.
async function loadPhysics(scene) {
  const havok = await loadHavok();
  const plugin = new BABYLON.HavokPlugin(true, havok);
  scene.enablePhysics(new BABYLON.Vector3(0, GRAVITY, 0), plugin);
  return plugin;
}

// Moves the physics on by `seconds`, in steps of a sixtieth of a second, by hand. The game
// never needs it, because the physics moves with every frame that is drawn. But a test has no
// frames, and this lets it say "now let a second go by" and look at where everything ended up,
// and the answer is the same every time.
function stepPhysics(scene, seconds, step = 1 / 60) {
  const engine = scene.getPhysicsEngine();
  for (let t = 0; t < seconds - 1e-9; t += step) engine._step(step);
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GRAVITY, SURFACES, loadHavok, loadPhysics, stepPhysics };
} else {
  Object.assign(window, { GRAVITY, SURFACES, loadHavok, loadPhysics, stepPhysics });
}
```

Things to notice:

- **`GRAVITY` is stronger than Earth's.** At this scale a marble about a unit across falling at Earth's gravity looks like it is falling through honey. Games nearly always cheat gravity upward. It is one number, and it is the first one to change if the game feels floaty.
- **`friction` and `restitution` are the two numbers that describe a surface.** Friction is how much it grips what moves across it: 0 is ice, 1 is sandpaper. Restitution is how much of its speed a thing keeps when it hits: 0 is clay, 1 would bounce for ever. When two surfaces meet, Havok combines them.
- **Havok is loaded once** (`havokLoading`): the first call starts the load and every call gives the same promise. Loading two megabytes of WebAssembly twice would be a waste, and the tests will make several worlds.
- **`loadPhysics` is `async`** because the load is. It makes the plugin and turns physics on in the scene with `scene.enablePhysics`.
- **`stepPhysics` is for tests.** The game never calls it: the engine moves with every frame drawn. But a test has no frames, and this says "now let a second go by", one sixtieth at a time. A fixed step is why the same test gives the same answer every time.

Create the tests page. Open the placeholder `tests.html` and replace its contents with:

```html
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="utf-8">
  <title>Rolling Rampage World tests - Babylon.js Samples</title>
  <link rel="stylesheet" href="https://code.jquery.com/qunit/qunit-2.22.0.css" integrity="sha384-Gvip0iPXLBuTKlP0Fan1cxz2R4K8z+c4rnqVxXfz96ojkUDMp2HvFsByVGtBT30o" crossorigin="anonymous">
</head>

<body>
  <div id="qunit"></div>
  <div id="qunit-fixture"></div>
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
</body>

</html>
```

Look at what the tests page loads: QUnit, then Babylon.js and Havok from the same CDNs as the game, then your files. Only the physics ones are there so far; you will add a line for each step. Then replace the placeholder `tests/physics.tests.js` with:

```js
QUnit.module("the numbers of physics", () => {
  QUnit.test("gravity pulls down, and harder than Earth's, so a small world doesn't feel like slow motion", (assert) => {
    assert.true(GRAVITY < -9.81);
  });

  QUnit.test("every surface has a friction and a restitution between 0 and 1", (assert) => {
    for (const [name, surface] of Object.entries(SURFACES)) {
      assert.true(surface.friction >= 0 && surface.friction <= 1, `${name} friction`);
      assert.true(surface.restitution >= 0 && surface.restitution <= 1, `${name} restitution`);
    }
  });

  QUnit.test("a steel marble bounces less than it would off rubber, and the floor grips more than ice", (assert) => {
    assert.true(SURFACES.steel.restitution < 0.5);
    assert.true(SURFACES.deck.friction > 0);
  });
});

// These need Havok, which is loaded by a script in tests.html, and a scene to put it in. The
// scene uses a NullEngine: an engine that draws nothing, so the physics can run with no
// screen, and fast.
QUnit.module("a physics world", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("loadHavok() loads Havok once, and gives the same one every time", async (assert) => {
    assert.strictEqual(loadHavok(), loadHavok());
    assert.strictEqual(typeof (await loadHavok()), "object");
  });

  QUnit.test("loadPhysics() turns physics on in the scene, with gravity pulling down", (assert) => {
    const physics = scene.getPhysicsEngine();

    assert.true(physics !== null && physics !== undefined);
    assert.strictEqual(physics.gravity.y, GRAVITY);
    assert.strictEqual(physics.gravity.x, 0);
    assert.strictEqual(physics.gravity.z, 0);
  });

  QUnit.test("two scenes can share the one Havok", async (assert) => {
    const other = new BABYLON.Scene(engine);

    await loadPhysics(other);

    assert.true(other.getPhysicsEngine() !== null);
    other.dispose();
  });

  QUnit.test("a body with mass falls, and one with none stays where it is", (assert) => {
    const falls = BABYLON.MeshBuilder.CreateSphere("falls", { diameter: 1 }, scene);
    falls.position.y = 10;
    new BABYLON.PhysicsAggregate(falls, BABYLON.PhysicsShapeType.SPHERE, { mass: 1 }, scene);
    const stays = BABYLON.MeshBuilder.CreateBox("stays", { size: 1 }, scene);
    stays.position.set(5, 10, 0);
    new BABYLON.PhysicsAggregate(stays, BABYLON.PhysicsShapeType.BOX, { mass: 0 }, scene);

    stepPhysics(scene, 0.5);

    assert.true(falls.position.y < 10 - 1, `fell to ${falls.position.y}`);
    assert.strictEqual(stays.position.y, 10);
  });

  QUnit.test("a body falls as far as gravity says: half g t squared", (assert) => {
    const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, scene);
    ball.position.y = 100;
    new BABYLON.PhysicsAggregate(ball, BABYLON.PhysicsShapeType.SPHERE, { mass: 1 }, scene);

    stepPhysics(scene, 1);

    const expected = 100 + 0.5 * GRAVITY * 1 * 1;
    assert.true(Math.abs(ball.position.y - expected) < 0.5, `${ball.position.y} against ${expected}`);
  });

  QUnit.test("stepPhysics() gives the same answer every time, so a test can rely on it", (assert) => {
    const drop = () => {
      const world = new BABYLON.Scene(engine);
      return loadPhysics(world).then(() => {
        const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 1 }, world);
        ball.position.set(0, 20, 0);
        new BABYLON.PhysicsAggregate(ball, BABYLON.PhysicsShapeType.SPHERE, { mass: 1 }, world);
        stepPhysics(world, 0.7);
        const y = ball.position.y;
        world.dispose();
        return y;
      });
    };

    return Promise.all([drop(), drop()]).then(([a, b]) => assert.strictEqual(a, b));
  });
});
```

Open `tests.html`. You should see **9 passing tests**. These are the first tests in this series that run a real physics engine, and they are worth reading.

Things to notice:

- **A `NullEngine` is an engine that draws nothing.** It lets you make a scene, meshes and physics with no screen and no canvas, so the tests are fast and run anywhere. Everything about a mesh's position and size works; only the drawing is missing.
- **The physics tests let time pass.** *"a body falls as far as gravity says"* drops a ball for one second and checks it fell half *g t squared*. That is a test of the *engine and your gravity together*, and it's how you learn the physics does what you meant.
- **`hooks.beforeEach` and `afterEach`** build a fresh world for every test and dispose of it afterwards, so one test can't change another's.
- ***"gives the same answer every time"*** is what makes the rest possible. A physics test that gave different answers on different runs would be useless.

---

## Step 3: The course

A course is a list of **slabs**: boxes to roll on. Rather than write boxes' centers and rotations by hand, each slab is described by what you can *see* from the side: the line of its top surface, where it starts and where it ends. A flat floor is a line that doesn't go up or down. A ramp is a line that does. Open the placeholder `js/course.js` and replace its contents with:

```js
// The test course: a few slabs to roll on. Each is described by the line of its top
// surface, as seen from the side (x along the course, y up): where the top starts and where it
// ends. A flat floor is a line that doesn't go up or down, and a ramp is a line that does.
// `slabShape` turns that into the box Babylon.js and Havok want. The course is plain data, so
// it is easy to test and to change. See ../tests/course.tests.js.

const THICKNESS = 0.6; // how thick every slab is
const TILE = 2; // how many units the floor texture repeats over

const COURSE = [
  { name: "start deck", from: [-14, 4], to: [-6, 4], z: 0, depth: 8 },
  { name: "ramp", from: [-6, 4], to: [6, 0], z: 0, depth: 6 },
  { name: "lower deck", from: [6, 0], to: [14, 0], z: 0, depth: 8 },
  { name: "side ramp", from: [14, 0], to: [20, 2], z: 0, depth: 4 },
];

// The box for a slab: where its middle is, how long, thick and deep it is, and how far it is
// tilted (an angle in radians about the z axis, 0 for flat). The top of the box lies along the
// line the slab was described by, so the box is put half its thickness below that line, on the
// side away from the sky.
function slabShape(slab, thickness = THICKNESS) {
  const [x1, y1] = slab.from;
  const [x2, y2] = slab.to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const length = Math.hypot(dx, dy);
  const up = { x: -Math.sin(angle), y: Math.cos(angle) }; // the way the top faces: the line turned a quarter turn
  return {
    x: (x1 + x2) / 2 - (up.x * thickness) / 2,
    y: (y1 + y2) / 2 - (up.y * thickness) / 2,
    z: slab.z,
    length,
    thickness,
    depth: slab.depth,
    angle,
  };
}

// How steep a slab is, as a fraction: 0 for flat, 1 for a slope that rises as fast as it runs.
function steepness(slab) {
  const [x1, y1] = slab.from;
  const [x2, y2] = slab.to;
  return Math.abs((y2 - y1) / (x2 - x1));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { THICKNESS, TILE, COURSE, slabShape, steepness };
} else {
  Object.assign(window, { THICKNESS, TILE, COURSE, slabShape, steepness });
}
```

Things to notice:

- **The course is plain data.** `COURSE` is a list of objects, and `slabShape` and `steepness` are plain functions. Nothing here needs Babylon.js, so it is easy to test and, later, easy to make levels from.
- **`slabShape` turns "a line" into "a box".** The box's length is the length of the line (`hypot`, so a ramp is longer than its run), its tilt is the angle of the line (`atan2`), and its middle is the middle of the line pushed *down*, half the thickness, away from the sky. That way the *top* of the box lies exactly along the line you described, wherever it tilts.
- **`up` is the line turned a quarter turn.** For a flat line the top faces `(0, 1)`: up. For a line that rises to the right it leans back. The same trick (rotate a direction 90 degrees to get the one at right angles) is used all over games.
- **`steepness`** is the rise over the run. A later step will check that no slope is too steep to roll up.

Replace the placeholder `tests/course.tests.js` with the tests for these:

```js
QUnit.module("COURSE", () => {
  QUnit.test("every slab has a name, a start and an end that go forward along the course, and a size", (assert) => {
    for (const slab of COURSE) {
      assert.true(slab.name.length > 0);
      assert.true(slab.to[0] > slab.from[0], `${slab.name} goes forward`);
      assert.true(slab.depth > 0, `${slab.name} has some depth`);
    }
  });

  QUnit.test("the names are all different", (assert) => {
    assert.strictEqual(new Set(COURSE.map((s) => s.name)).size, COURSE.length);
  });

  QUnit.test("each slab starts where the one before it ends, so there is a way across", (assert) => {
    for (let i = 1; i < COURSE.length; i++) {
      assert.deepEqual(COURSE[i].from, COURSE[i - 1].to, `${COURSE[i].name}`);
    }
  });

  QUnit.test("no slope is steep enough that a marble couldn't be steered up it", (assert) => {
    for (const slab of COURSE) assert.true(steepness(slab) < 0.5, slab.name);
  });
});

QUnit.module("steepness", () => {
  QUnit.test("is 0 for a flat floor", (assert) => {
    assert.strictEqual(steepness({ from: [0, 3], to: [8, 3] }), 0);
  });

  QUnit.test("is the rise over the run", (assert) => {
    assert.strictEqual(steepness({ from: [0, 0], to: [10, 4] }), 0.4);
  });

  QUnit.test("is the same going down as going up", (assert) => {
    assert.strictEqual(steepness({ from: [0, 4], to: [10, 0] }), 0.4);
  });
});

QUnit.module("slabShape", () => {
  const flat = { name: "flat", from: [0, 5], to: [10, 5], z: 2, depth: 6 };
  const ramp = { name: "ramp", from: [0, 4], to: [12, 0], z: -1, depth: 3 };

  QUnit.test("a flat slab isn't tilted, and is as long as it is wide on the page", (assert) => {
    const shape = slabShape(flat);

    assert.strictEqual(shape.angle, 0);
    assert.strictEqual(shape.length, 10);
    assert.strictEqual(shape.depth, 6);
    assert.strictEqual(shape.z, 2);
  });

  QUnit.test("its middle is half the thickness below the top, and halfway along", (assert) => {
    const shape = slabShape(flat, 0.6);

    assert.strictEqual(shape.x, 5);
    assert.true(Math.abs(shape.y - (5 - 0.3)) < 1e-9);
  });

  QUnit.test("a ramp is as long as its slope, not its run", (assert) => {
    const shape = slabShape(ramp);

    assert.true(Math.abs(shape.length - Math.hypot(12, 4)) < 1e-9);
  });

  QUnit.test("a ramp that goes down is tilted down", (assert) => {
    assert.true(slabShape(ramp).angle < 0);
    assert.true(slabShape({ from: [0, 0], to: [12, 4], z: 0, depth: 1 }).angle > 0);
  });

  QUnit.test("the middle of the top of the box is the middle of the line the slab was described by", (assert) => {
    for (const slab of [flat, ramp]) {
      const shape = slabShape(slab, 0.6);
      const topX = shape.x - Math.sin(shape.angle) * 0.3; // half a thickness out along the way the top faces
      const topY = shape.y + Math.cos(shape.angle) * 0.3;

      assert.true(Math.abs(topX - (slab.from[0] + slab.to[0]) / 2) < 1e-9, `${slab.name} x`);
      assert.true(Math.abs(topY - (slab.from[1] + slab.to[1]) / 2) < 1e-9, `${slab.name} y`);
    }
  });

  QUnit.test("a thicker slab is lower, because the top stays where it was described", (assert) => {
    assert.true(slabShape(flat, 2).y < slabShape(flat, 0.5).y);
  });
});
```

Add the two scripts to `tests.html`, after `physics.js` and `physics.tests.js`:

```html
  <script src="js/course.js"></script>
```
```html
  <script src="tests/course.tests.js"></script>
```

Reload `tests.html`: **13 more** tests (**22** in all). These need no engine at all. *"the middle of the top of the box is the middle of the line the slab was described by"* checks the maths of `slabShape` for a flat slab and a ramp.

### 3a. Drawing it, and giving it to the physics

Now the part that needs Babylon.js. Add these to `js/course.js`, directly above the comment that begins `// Plain <script> include`:

```js
// A checkered steel texture, in the blue-greys of the logo's gunmetal, drawn in code on a canvas, for the floors. A texture is only
// one square, and a floor is many squares wide, so it has to be told to repeat: a
// DynamicTexture, unlike a texture loaded from a file, stretches its edge pixels past the
// end of the square by default, which would leave a floor dark except for one corner.
function makeDeckTexture(scene, size = 128) {
  const texture = new BABYLON.DynamicTexture("deck", size, scene, true);
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  const context = texture.getContext();
  const half = size / 2;
  context.fillStyle = "#8a93a6";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#657089";
  context.fillRect(0, 0, half, half);
  context.fillRect(half, half, half, half);
  context.strokeStyle = "#171b26";
  context.lineWidth = 4;
  context.strokeRect(1, 1, size - 2, size - 2);
  texture.update();
  return texture;
}

// Makes every slab of the course as a box, with a texture that repeats every TILE units
// instead of stretching over a big floor, and gives it to the physics as something that
// never moves (`mass: 0`). Returns the meshes.
function buildCourse(scene, course = COURSE) {
  const material = new BABYLON.StandardMaterial("deck", scene);
  material.diffuseTexture = makeDeckTexture(scene);
  material.specularColor = new BABYLON.Color3(0.2, 0.22, 0.28);

  return course.map((slab) => {
    const shape = slabShape(slab);
    const across = shape.length / TILE;
    const deep = shape.depth / TILE;
    const side = shape.thickness / TILE;
    const box = BABYLON.MeshBuilder.CreateBox(
      slab.name,
      {
        width: shape.length,
        height: shape.thickness,
        depth: shape.depth,
        // The faces are: back, front, right, left, top, bottom. Each gets as much texture as it is big.
        faceUV: [
          new BABYLON.Vector4(0, 0, across, side),
          new BABYLON.Vector4(0, 0, across, side),
          new BABYLON.Vector4(0, 0, deep, side),
          new BABYLON.Vector4(0, 0, deep, side),
          new BABYLON.Vector4(0, 0, deep, across),
          new BABYLON.Vector4(0, 0, deep, across),
        ],
      },
      scene
    );
    box.position.set(shape.x, shape.y, shape.z);
    box.rotation.z = shape.angle;
    box.material = material;
    box.receiveShadows = true;
    new BABYLON.PhysicsAggregate(box, BABYLON.PhysicsShapeType.BOX, { mass: 0, ...SURFACES.deck }, scene);
    return box;
  });
}
```

and replace the export block at the bottom with one that adds the two new names:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { THICKNESS, TILE, COURSE, slabShape, steepness, makeDeckTexture, buildCourse };
} else {
  Object.assign(window, { THICKNESS, TILE, COURSE, slabShape, steepness, makeDeckTexture, buildCourse });
}
```

Things to notice:

- **A `DynamicTexture` is drawn in code.** You get a canvas (`getContext()`), draw on it, and call `update()`. No picture file. This one is a two-by-two checkerboard with a dark outline, so a floor reads as made of tiles, which is also how you can tell how big things are.
- **`wrapU` and `wrapV` are set to repeat.** A texture is one square, and a floor is many squares wide. A texture loaded from a file repeats by default; a `DynamicTexture` does *not*: it stretches its edge pixels out past the end of the square, and a floor comes out dark except for one corner. This is a surprisingly easy thing to lose an afternoon to.
- **`faceUV` says how much of the texture each face gets.** A box has six faces, and each is given a rectangle of the texture, from 0 up to *how many tiles fit*: a floor ten units long with a tile every two units gets five repeats. The top and bottom are given `deep` then `across`, which is the other way round from the sides: on a top face the texture's first direction runs along the depth.
- **`mass: 0` makes a body that never moves.** A body with no mass is *fixed* (Havok calls it static). The marble will roll on it, and never push it.
- **`PhysicsAggregate` joins a mesh to a body.** It makes a body from the mesh's position and rotation, a shape (`BOX` here) from its size, and keeps them together. Whatever the physics does to the body, the mesh follows.
- **All the slabs share one material,** so there is one texture to draw and to keep.
- **`receiveShadows` says a slab shows shadows that fall on it.** A mesh only shows a shadow if it is told to, which saves work on things that don't need one. The marble will cast one, in Step 7.

Add the rest of the tests to the **end** of `tests/course.tests.js`:

```js
QUnit.module("makeDeckTexture", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("repeats in both directions, so a big floor is covered in squares and not stretched from one corner", (assert) => {
    const texture = makeDeckTexture(scene);

    assert.strictEqual(texture.wrapU, BABYLON.Texture.WRAP_ADDRESSMODE);
    assert.strictEqual(texture.wrapV, BABYLON.Texture.WRAP_ADDRESSMODE);
  });

  QUnit.test("is a square of the size it is given", (assert) => {
    const size = makeDeckTexture(scene, 64).getSize();

    assert.deepEqual([size.width, size.height], [64, 64]);
  });
});

// Building the course needs a scene and physics. These use a NullEngine, which draws nothing.
QUnit.module("buildCourse", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("makes a mesh for every slab, named for it", (assert) => {
    const meshes = buildCourse(scene);

    assert.deepEqual(meshes.map((m) => m.name), COURSE.map((s) => s.name));
  });

  QUnit.test("each mesh is a box the size of its slab", (assert) => {
    const meshes = buildCourse(scene);

    meshes.forEach((mesh, i) => {
      const shape = slabShape(COURSE[i]);
      const size = mesh.getBoundingInfo().boundingBox.extendSize;
      assert.true(Math.abs(size.x * 2 - shape.length) < 1e-6, `${mesh.name} length`);
      assert.true(Math.abs(size.y * 2 - shape.thickness) < 1e-6, `${mesh.name} thickness`);
      assert.true(Math.abs(size.z * 2 - shape.depth) < 1e-6, `${mesh.name} depth`);
    });
  });

  QUnit.test("the top of every box lies along the line its slab was described by, which also checks which way it is tilted", (assert) => {
    const meshes = buildCourse(scene);

    meshes.forEach((mesh, i) => {
      const slab = COURSE[i];
      const shape = slabShape(slab);
      mesh.computeWorldMatrix(true);
      const matrix = mesh.getWorldMatrix();
      const start = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(-shape.length / 2, shape.thickness / 2, 0), matrix);
      const end = BABYLON.Vector3.TransformCoordinates(new BABYLON.Vector3(shape.length / 2, shape.thickness / 2, 0), matrix);

      assert.true(Math.abs(start.x - slab.from[0]) < 1e-5 && Math.abs(start.y - slab.from[1]) < 1e-5, `${slab.name} start`);
      assert.true(Math.abs(end.x - slab.to[0]) < 1e-5 && Math.abs(end.y - slab.to[1]) < 1e-5, `${slab.name} end`);
    });
  });

  QUnit.test("every slab is a body that never moves", (assert) => {
    const meshes = buildCourse(scene);

    for (const mesh of meshes) {
      assert.true(mesh.physicsBody !== null && mesh.physicsBody !== undefined, mesh.name);
      assert.strictEqual(mesh.physicsBody.getMassProperties().mass || 0, 0, `${mesh.name} has no mass, so it is fixed`);
    }
  });

  QUnit.test("the slabs share one material, so there is only one texture to draw", (assert) => {
    const meshes = buildCourse(scene);

    assert.true(meshes.every((m) => m.material === meshes[0].material));
  });

  QUnit.test("they take shadows", (assert) => {
    assert.true(buildCourse(scene).every((m) => m.receiveShadows));
  });
});
```

Reload `tests.html`: **8 more** tests (**30** in all). *"the top of every box lies along the line its slab was described by, which also checks which way it is tilted"* is the one that matters. It takes two points on top of each real mesh, sends them through its world matrix, and checks they land on the ends of the line. If you had the tilt the wrong way round, this is where you'd find out.

---

## Step 4: The marble

The marble is a sphere that is a **dynamic** body: it has mass, so gravity pulls it, collisions push it, and it rolls. Open the placeholder `js/marble.js` and replace its contents with:

```js
// The marble: a steel ball that is a physics body. Havok moves it under gravity, rolls it
// down slopes and bounces it off floors, and we read its position back each frame. See
// ../tests/marble.tests.js.

const MARBLE_RADIUS = 0.5;
const MARBLE_MASS = 1;
const MARBLE_START = { x: -4, y: 5, z: 0 }; // above the top of the ramp, to be dropped from
// A ball on a flat floor rolls on for ever if nothing slows it: rolling grips, and gripping
// doesn't use up any speed. Real marbles slow down because of tiny dents in the floor and in the
// air, which Havok doesn't know about. So the body is given some damping: a fraction of its speed
// (and of its spin) that it loses every second.
const MARBLE_DAMPING = { linear: 0.15, angular: 0.35 };
const FALL_LIMIT = -12; // below this a marble has fallen off the course for good

// Whether a marble at height `y` has fallen off the course.
function hasFallen(y, limit = FALL_LIMIT) {
  return y < limit;
}

// A steel look: a dark grey that is mostly shine. (A real mirror would need a picture of
// the world around it to reflect, so this one just has a bright, sharp highlight.)
function makeSteel(scene) {
  const material = new BABYLON.StandardMaterial("steel", scene);
  material.diffuseColor = new BABYLON.Color3(0.55, 0.62, 0.74); // chrome, with the logo's blue in it
  material.specularColor = new BABYLON.Color3(1, 1, 1);
  material.specularPower = 96;
  return material;
}

class Marble {
  constructor(scene, { start = MARBLE_START } = {}) {
    this.start = start;
    this.mesh = BABYLON.MeshBuilder.CreateSphere("marble", { diameter: MARBLE_RADIUS * 2, segments: 24 }, scene);
    this.mesh.material = makeSteel(scene);
    this.mesh.position.set(start.x, start.y, start.z);
    this.aggregate = new BABYLON.PhysicsAggregate(
      this.mesh,
      BABYLON.PhysicsShapeType.SPHERE,
      { mass: MARBLE_MASS, ...SURFACES.steel },
      scene
    );
    this.aggregate.body.setLinearDamping(MARBLE_DAMPING.linear);
    this.aggregate.body.setAngularDamping(MARBLE_DAMPING.angular);
    // Physics normally only moves the mesh. To put the marble somewhere ourselves (a reset)
    // it has to read the mesh's position back before each step as well.
    this.aggregate.body.disablePreStep = false;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, FALL_LIMIT, hasFallen, makeSteel, Marble };
} else {
  Object.assign(window, { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, FALL_LIMIT, hasFallen, makeSteel, Marble });
}
```

Things to notice:

- **Everything about the marble is a named number** at the top: its size, its weight, where it starts, how much it slows, and how far down is "fallen off".
- **Damping is why a rolling marble slows down.** A ball rolling on a flat floor *keeps* rolling: rolling grips, and gripping uses up no speed. Real marbles slow because of tiny dents and the air, which Havok doesn't know about. Damping fakes it: each second the body loses a fraction of its speed (`linear`) and its spin (`angular`). Without it a marble would roll off the end of every floor.
- **`makeSteel` is a cheap steel.** A real mirror finish needs a picture of the world around it to reflect. This one is a grey with a bright, sharp highlight (`specularPower` high), which reads as shiny steel.
- **`disablePreStep = false`** looks odd but matters. Normally physics moves the mesh and never the other way. To *put* the marble somewhere ourselves (a reset) the physics has to read the mesh's position back before each step. Without this line, setting `mesh.position` would move the picture and not the body.
- The class is closed already, and its constructor makes the sphere, gives it the steel and puts it in the physics.

Add these members **inside the class**, directly above its closing `}`:

```js
  // Where the marble is.
  get position() {
    return this.mesh.position;
  }

  // How fast it is going, in units a second.
  get speed() {
    return this.aggregate.body.getLinearVelocity().length();
  }

  // Puts the marble back at its start, still.
  reset() {
    this.mesh.position.set(this.start.x, this.start.y, this.start.z);
    this.mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    this.aggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
    this.aggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
  }
```

Things to notice:

- **`speed` reads the body, not the mesh.** The mesh only knows where it is; the body knows how fast it's going.
- **`reset` clears everything about motion:** position, rotation (a fresh identity quaternion; a physics body is rotated with one), speed and spin. Missing the spin would drop the marble spinning.

Replace the placeholder `tests/marble.tests.js` with:

```js
QUnit.module("hasFallen", () => {
  QUnit.test("a marble on the course hasn't fallen", (assert) => {
    assert.false(hasFallen(0));
    assert.false(hasFallen(MARBLE_START.y));
  });

  QUnit.test("one below the limit has", (assert) => {
    assert.true(hasFallen(FALL_LIMIT - 1));
    assert.false(hasFallen(FALL_LIMIT));
  });

  QUnit.test("the limit is below the lowest slab, or a marble would be put back while still rolling", (assert) => {
    const lowest = Math.min(...COURSE.flatMap((slab) => [slab.from[1], slab.to[1]]));

    assert.true(FALL_LIMIT < lowest - 5);
  });

  QUnit.test("takes the limit as a second argument", (assert) => {
    assert.true(hasFallen(-3, -2));
    assert.false(hasFallen(-3, -4));
  });
});

QUnit.module("MARBLE_DAMPING", () => {
  QUnit.test("slows the marble a little, and not so much that it would crawl", (assert) => {
    assert.true(MARBLE_DAMPING.linear > 0 && MARBLE_DAMPING.linear < 1);
    assert.true(MARBLE_DAMPING.angular > 0 && MARBLE_DAMPING.angular < 1);
  });
});

QUnit.module("the start", () => {
  QUnit.test("is above the top of the course, over a slab, so the marble is dropped onto something", (assert) => {
    const over = COURSE.filter((slab) => MARBLE_START.x >= slab.from[0] && MARBLE_START.x <= slab.to[0]);

    assert.true(over.length > 0, "there is a slab under the start");
    const slab = over[0];
    const t = (MARBLE_START.x - slab.from[0]) / (slab.to[0] - slab.from[0]);
    const top = slab.from[1] + t * (slab.to[1] - slab.from[1]);
    assert.true(MARBLE_START.y > top + MARBLE_RADIUS, "and the marble starts above it");
  });
});

// These put a marble on the real course, with real physics, in a NullEngine that draws
// nothing, and let time go by with stepPhysics.
QUnit.module("a marble on the course", (hooks) => {
  let engine;
  let scene;
  let marble;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
    buildCourse(scene);
    marble = new Marble(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  // Puts the marble somewhere, still.
  const placeAt = (x, y, z) => {
    marble.start = { x, y, z };
    marble.reset();
  };

  QUnit.test("starts where it should, and doesn't move until the physics does", (assert) => {
    assert.deepEqual({ x: marble.position.x, y: marble.position.y, z: marble.position.z }, MARBLE_START);
    assert.strictEqual(marble.speed, 0);
  });

  QUnit.test("is a ball of the radius it says", (assert) => {
    const size = marble.mesh.getBoundingInfo().boundingBox.extendSize;

    assert.true(Math.abs(size.x - MARBLE_RADIUS) < 1e-6);
  });

  QUnit.test("falls when it is dropped", (assert) => {
    stepPhysics(scene, 0.2);

    assert.true(marble.position.y < MARBLE_START.y - 0.2, `${marble.position.y}`);
  });

  QUnit.test("comes to rest on a flat floor with its middle one radius above the top", (assert) => {
    placeAt(-10, 5, 0); // over the start deck, whose top is at 4

    stepPhysics(scene, 3);

    assert.true(Math.abs(marble.position.y - (4 + MARBLE_RADIUS)) < 0.03, `${marble.position.y}`);
    assert.true(marble.speed < 0.05, `still moving at ${marble.speed}`);
  });

  QUnit.test("sits still on a flat floor: it stays where it landed", (assert) => {
    placeAt(-10, 5, 0);
    stepPhysics(scene, 3);
    const landed = marble.position.x;

    stepPhysics(scene, 2);

    assert.true(Math.abs(marble.position.x - landed) < 0.05);
  });

  QUnit.test("bounces a little, but not up to where it fell from", (assert) => {
    placeAt(-10, 12, 0);
    let highestAfterLanding = -Infinity;
    let landed = false;

    for (let i = 0; i < 240; i++) {
      stepPhysics(scene, 1 / 60);
      const y = marble.position.y;
      if (!landed && y < 4 + MARBLE_RADIUS + 0.05) landed = true;
      if (landed && marble.speed > 0.5) highestAfterLanding = Math.max(highestAfterLanding, y);
    }

    assert.true(landed, "it reached the floor");
    assert.true(highestAfterLanding < 12 - 2, `bounced up to ${highestAfterLanding}`);
  });

  QUnit.test("rolls down a ramp, toward the low end, and gets faster", (assert) => {
    placeAt(-4, 4.1, 0); // on the ramp, near the top
    const x0 = marble.position.x;

    stepPhysics(scene, 0.5);
    const slow = marble.speed;
    stepPhysics(scene, 0.5);
    const fast = marble.speed;

    assert.true(marble.position.x > x0 + 1, `rolled to ${marble.position.x}`);
    assert.true(fast > slow, `${slow} then ${fast}`);
  });

  QUnit.test("keeps rolling along the course, not off sideways", (assert) => {
    placeAt(-4, 4.1, 0);

    stepPhysics(scene, 2);

    assert.true(Math.abs(marble.position.z) < 0.05, `drifted to z = ${marble.position.z}`);
  });

  QUnit.test("rolls on to the lower deck, and slows there, because of the damping", (assert) => {
    placeAt(-4, 4.1, 0);

    for (let t = 0; marble.position.x < 7 && t < 6; t += 0.1) stepPhysics(scene, 0.1);
    assert.true(marble.position.x >= 7, `reached x = ${marble.position.x}`);
    const onDeck = marble.speed;
    stepPhysics(scene, 0.5);

    assert.true(marble.position.x < 14, "and it is still on the lower deck");
    assert.true(marble.speed < onDeck, `${onDeck} then ${marble.speed}`);
  });

  QUnit.test("rolls off the edge of a slab, and falls past the limit", (assert) => {
    placeAt(-10, 4.6, 5); // the start deck is 8 deep, so this is just over its edge

    stepPhysics(scene, 2);

    assert.true(marble.position.y < 4, `${marble.position.y}`);
    assert.true(marble.position.y < MARBLE_START.y - 4);
    stepPhysics(scene, 2);
    assert.true(hasFallen(marble.position.y), `${marble.position.y}`);
  });

  QUnit.test("reset() puts it back at the start, with no speed and no spin", (assert) => {
    stepPhysics(scene, 2);
    assert.true(marble.speed > 0, "it was moving");

    marble.reset();

    assert.deepEqual({ x: marble.position.x, y: marble.position.y, z: marble.position.z }, MARBLE_START);
    assert.strictEqual(marble.speed, 0);
    assert.strictEqual(marble.aggregate.body.getAngularVelocity().length(), 0);
  });

  QUnit.test("after a reset it falls the same way as the first time", (assert) => {
    stepPhysics(scene, 1);
    const first = { x: marble.position.x, y: marble.position.y };

    marble.reset();
    stepPhysics(scene, 1);

    assert.true(Math.abs(marble.position.x - first.x) < 0.01, `${marble.position.x} against ${first.x}`);
    assert.true(Math.abs(marble.position.y - first.y) < 0.01, `${marble.position.y} against ${first.y}`);
  });

  QUnit.test("a marble that has fallen can be reset and rolls again", (assert) => {
    placeAt(-10, 4.6, 5);
    stepPhysics(scene, 4);
    assert.true(hasFallen(marble.position.y));

    marble.start = MARBLE_START;
    marble.reset();
    stepPhysics(scene, 2);

    assert.false(hasFallen(marble.position.y));
    assert.true(marble.position.x > MARBLE_START.x, "and it is rolling down the ramp");
  });
});
```

Add the script and its tests to `tests.html`, after `course.js` and `course.tests.js`:

```html
  <script src="js/marble.js"></script>
```
```html
  <script src="tests/marble.tests.js"></script>
```

Reload `tests.html`: **19 more** tests (**49** in all). The last module puts a marble on the *real* course and lets seconds pass:

- *"comes to rest on a flat floor with its middle one radius above the top"*: the marble lands at the right height, to within three hundredths of a unit.
- *"rolls down a ramp, toward the low end, and gets faster"*: gravity and the ramp together.
- *"rolls on to the lower deck, and slows there, because of the damping"*: the damping works.
- *"rolls off the edge of a slab, and falls past the limit"* and *"a marble that has fallen can be reset and rolls again"*: the whole life cycle of a marble.

These are tests of *behavior*, not of code: they say what a marble should do, and the engine has to agree.

---

## Step 5: The isometric camera

The classic look is **isometric**: seen from a corner, from above, with *no perspective*, so a ramp is the same width at the top of the screen as at the bottom. That is an **orthographic** camera: instead of a field of view it has a box of space it sees, and everything inside is drawn at its true size. The numbers for it are plain, so they go in `js/camera.js`. Open the placeholder and replace its contents with:

```js
// The isometric camera: the game is seen from a fixed corner, looking down, with no
// perspective, so things don't get smaller with distance (like the classic arcade games).
// The numbers for where it looks from, how much it shows, and how it follows the marble are
// plain values here, and so is where the sun goes to keep a shadow under the marble. See ../tests/camera.tests.js.

// "Isometric" means the three axes are seen at equal angles: turned 45 degrees about the
// vertical, and tipped down by about 35 degrees. Babylon.js measures the tip from straight
// up, so it is 90 degrees less that.
const ISO_ALPHA = -Math.PI / 4; // which corner the camera looks from
const ISO_BETA = Math.acos(1 / Math.sqrt(3)); // 54.7 degrees from straight up
const CAMERA_RADIUS = 60; // how far back from what it looks at. With no perspective this changes nothing but what is cut off
const VIEW_WIDTH = 24; // the least width the view always shows, in world units
const VIEW_HEIGHT = 16; // and the least height
const FOLLOW_RATE = 4; // how quickly the camera catches up with the marble: bigger is tighter

// How big the view is, for a screen of this shape (`aspect` is width divided by height): half
// its height and half its width, in world units. It shows at least VIEW_WIDTH across and
// VIEW_HEIGHT up, so a wide screen is limited by its height and a tall one, a phone held upright,
// by its width, and neither cuts the course off.
function viewHalfExtents(aspect, width = VIEW_WIDTH, height = VIEW_HEIGHT) {
  const halfHeight = Math.max(height / 2, width / 2 / aspect);
  return { halfWidth: halfHeight * aspect, halfHeight };
}

// Moves `current` toward `target` by a fraction of the way that depends on how much time has
// passed, so the camera eases in and takes the same time to catch up at any frame rate.
// (Moving a fixed fraction each frame would make it faster on a fast screen.)
function follow(current, target, rate, dt) {
  const k = 1 - Math.exp(-rate * dt);
  return {
    x: current.x + (target.x - current.x) * k,
    y: current.y + (target.y - current.y) * k,
    z: current.z + (target.z - current.z) * k,
  };
}

// A shadow is drawn from where the sun is, into a square picture of the world that is only so
// many units wide (SHADOW_AREA): spread over the whole course it would be a few blurry pixels. So
// the sun is kept near whatever the shadow is for, and moved with it. It only matters which way
// the sun points and how far back it is (SUN_DISTANCE), so this finds the spot that distance
// back along the direction the sun shines from `target`.
const SHADOW_AREA = 30; // how wide, in world units, the area that gets shadows is
const SUN_DISTANCE = 40; // how far from the marble the sun is kept

function sunPosition(target, direction, distance) {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  return {
    x: target.x - (direction.x / length) * distance,
    y: target.y - (direction.y / length) * distance,
    z: target.z - (direction.z / length) * distance,
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ISO_ALPHA, ISO_BETA, CAMERA_RADIUS, VIEW_WIDTH, VIEW_HEIGHT, FOLLOW_RATE, SHADOW_AREA, SUN_DISTANCE, viewHalfExtents, follow, sunPosition };
} else {
  Object.assign(window, { ISO_ALPHA, ISO_BETA, CAMERA_RADIUS, VIEW_WIDTH, VIEW_HEIGHT, FOLLOW_RATE, SHADOW_AREA, SUN_DISTANCE, viewHalfExtents, follow, sunPosition });
}
```

Things to notice:

- **Two angles make it isometric.** Turned 45 degrees about the vertical (`ISO_ALPHA`) and tipped down 35.26 degrees (`ISO_BETA` is measured from straight up, so it is 54.74). At exactly those angles all three axes slope at the same angle on screen, which is what "iso" (equal) "metric" (measure) means. One of the tests proves it.
- **`CAMERA_RADIUS` hardly matters.** With no perspective, moving the camera back doesn't make anything smaller. It only decides what is cut off at the near and far ends, so it just has to be far enough to see everything.
- **The view is described by what it must show, not by a size.** `VIEW_WIDTH` and `VIEW_HEIGHT` are the least that must always be visible. `viewHalfExtents` works out the real box from the *shape of the screen* (`aspect`, width over height). A wide screen is limited by its height, so it has room to spare sideways; a tall one, a phone held upright, is limited by its width. Either way nothing the player needs is cut off, and the picture is never stretched, because the box has the screen's own proportions.
- **`follow` eases one point toward another.** Each frame it moves a *fraction* of the way, so the camera slows as it nears: it lags, then settles. The fraction is `1 - exp(-rate * dt)` and not a fixed number, so it depends on how much time passed. A fixed fraction per frame would make the camera snappier on a 120 Hz phone than on a 60 Hz monitor. This way two half-steps equal one whole step, which is a test.
- **`sunPosition` is for the shadow in Step 7.** A shadow is drawn from where the sun is, into a square picture of the world that is only `SHADOW_AREA` units wide. Spread over the whole course, that picture would have only a few pixels for each unit, and every shadow would be a blur, so the square is kept around the marble: the sun is moved with it every frame. Only which way the sun points, and how far back it is (`SUN_DISTANCE`), matter, so this finds the spot that far back along the direction it shines, from the target. Like the camera's, it is plain maths, with tests.

Replace the placeholder `tests/camera.tests.js` with:

```js
QUnit.module("the isometric angles", () => {
  // The direction from the target to the camera, for the angles ArcRotateCamera uses.
  const direction = (alpha, beta) => ({
    x: Math.cos(alpha) * Math.sin(beta),
    y: Math.cos(beta),
    z: Math.sin(alpha) * Math.sin(beta),
  });

  QUnit.test("the camera is turned 45 degrees about the vertical, to look from a corner", (assert) => {
    assert.true(Math.abs(Math.abs(ISO_ALPHA) - Math.PI / 4) < 1e-9);
  });

  QUnit.test("it is tipped down by about 35 degrees, which is 54.7 degrees from straight up", (assert) => {
    assert.true(Math.abs((ISO_BETA * 180) / Math.PI - 54.7356) < 1e-3);
  });

  QUnit.test("that is what makes it isometric: the three axes all slope the same", (assert) => {
    const d = direction(ISO_ALPHA, ISO_BETA);

    assert.true(Math.abs(Math.abs(d.x) - Math.abs(d.y)) < 1e-9);
    assert.true(Math.abs(Math.abs(d.y) - Math.abs(d.z)) < 1e-9);
    assert.true(Math.abs(Math.abs(d.x) - 1 / Math.sqrt(3)) < 1e-9);
  });

  QUnit.test("the camera is far enough back to see over the whole course", (assert) => {
    assert.true(CAMERA_RADIUS > 30);
  });
});

QUnit.module("viewHalfExtents", () => {
  QUnit.test("a wide screen shows the least height, and more width than the least", (assert) => {
    const { halfWidth, halfHeight } = viewHalfExtents(16 / 9);

    assert.strictEqual(halfHeight, VIEW_HEIGHT / 2);
    assert.true(halfWidth > VIEW_WIDTH / 2);
  });

  QUnit.test("a tall screen, a phone held upright, shows the least width, and more height than the least", (assert) => {
    const { halfWidth, halfHeight } = viewHalfExtents(9 / 19.5);

    assert.true(Math.abs(halfWidth - VIEW_WIDTH / 2) < 1e-9);
    assert.true(halfHeight > VIEW_HEIGHT / 2);
  });

  QUnit.test("the shape of the view is the shape of the screen, so nothing is stretched", (assert) => {
    for (const aspect of [0.46, 0.75, 1, 1.6, 2.1]) {
      const { halfWidth, halfHeight } = viewHalfExtents(aspect);
      assert.true(Math.abs(halfWidth / halfHeight - aspect) < 1e-9, `aspect ${aspect}`);
    }
  });

  QUnit.test("it always shows at least the least width and the least height, whatever the shape", (assert) => {
    for (const aspect of [0.3, 0.46, 0.75, 1, 1.33, 1.6, 2.1, 3]) {
      const { halfWidth, halfHeight } = viewHalfExtents(aspect);
      assert.true(halfWidth * 2 >= VIEW_WIDTH - 1e-9, `width at ${aspect}`);
      assert.true(halfHeight * 2 >= VIEW_HEIGHT - 1e-9, `height at ${aspect}`);
    }
  });

  QUnit.test("takes the least width and height as arguments", (assert) => {
    const { halfWidth, halfHeight } = viewHalfExtents(2, 10, 20);

    assert.strictEqual(halfHeight, 10);
    assert.strictEqual(halfWidth, 20);
  });
});

QUnit.module("follow", () => {
  const at = (x, y, z) => ({ x, y, z });

  QUnit.test("moves toward the target, but not all the way", (assert) => {
    const next = follow(at(0, 0, 0), at(10, 0, 0), FOLLOW_RATE, 0.016);

    assert.true(next.x > 0 && next.x < 10);
  });

  QUnit.test("moves every coordinate toward its own", (assert) => {
    const next = follow(at(0, 10, -4), at(8, 2, 6), 3, 0.1);

    assert.true(next.x > 0 && next.y < 10 && next.z > -4);
  });

  QUnit.test("with no time passing it hasn't moved", (assert) => {
    assert.deepEqual(follow(at(1, 2, 3), at(9, 9, 9), 4, 0), at(1, 2, 3));
  });

  QUnit.test("it gets nearer and nearer, and never overshoots", (assert) => {
    let p = at(0, 0, 0);

    for (let i = 0; i < 200; i++) {
      p = follow(p, at(10, 0, 0), 4, 1 / 60);
      assert.true(p.x <= 10);
    }

    assert.true(p.x > 9.99, `${p.x}`);
  });

  QUnit.test("takes the same time at any frame rate: two half steps are one whole step", (assert) => {
    const whole = follow(at(0, 0, 0), at(10, 0, 0), 4, 0.1);
    const halves = follow(follow(at(0, 0, 0), at(10, 0, 0), 4, 0.05), at(10, 0, 0), 4, 0.05);

    assert.true(Math.abs(whole.x - halves.x) < 1e-9);
  });

  QUnit.test("a bigger rate catches up faster", (assert) => {
    assert.true(follow(at(0, 0, 0), at(10, 0, 0), 8, 0.1).x > follow(at(0, 0, 0), at(10, 0, 0), 2, 0.1).x);
  });

  QUnit.test("doesn't change what it was given", (assert) => {
    const current = at(1, 2, 3);

    follow(current, at(9, 9, 9), 4, 0.1);

    assert.deepEqual(current, at(1, 2, 3));
  });
});

QUnit.module("sunPosition", () => {
  const at = (x, y, z) => ({ x, y, z });
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  QUnit.test("is the given distance from the target", (assert) => {
    const sun = sunPosition(at(3, 1, -2), at(0.6, -1, -0.45), 40);

    assert.true(near(Math.hypot(sun.x - 3, sun.y - 1, sun.z + 2), 40));
  });

  QUnit.test("is on the side the sun shines from: above the target when the sun points down", (assert) => {
    assert.true(sunPosition(at(0, 0, 0), at(0, -1, 0), 40).y > 0);
  });

  QUnit.test("straight down is straight above", (assert) => {
    assert.deepEqual(sunPosition(at(5, 2, 7), at(0, -1, 0), 10), at(5, 12, 7));
  });

  QUnit.test("a sun that shines toward +x is placed back at -x", (assert) => {
    const sun = sunPosition(at(0, 0, 0), at(1, 0, 0), 10);

    assert.true(near(sun.x, -10) && near(sun.y, 0) && near(sun.z, 0));
  });

  QUnit.test("shining from the spot it is put at, along its direction, reaches the target", (assert) => {
    const direction = at(0.6, -1, -0.45);
    const target = at(4, 0.5, 1);
    const sun = sunPosition(target, direction, 25);
    const length = Math.hypot(direction.x, direction.y, direction.z);

    assert.true(near(sun.x + (direction.x / length) * 25, target.x));
    assert.true(near(sun.y + (direction.y / length) * 25, target.y));
    assert.true(near(sun.z + (direction.z / length) * 25, target.z));
  });

  QUnit.test("the direction doesn't have to be a unit length: only which way it points counts", (assert) => {
    const a = sunPosition(at(0, 0, 0), at(0.6, -1, -0.45), 30);
    const b = sunPosition(at(0, 0, 0), at(6, -10, -4.5), 30);

    assert.true(near(a.x, b.x) && near(a.y, b.y) && near(a.z, b.z));
  });

  QUnit.test("moves with the target", (assert) => {
    const first = sunPosition(at(0, 0, 0), at(0.6, -1, -0.45), 40);
    const second = sunPosition(at(10, 0, 0), at(0.6, -1, -0.45), 40);

    assert.true(near(second.x - first.x, 10) && near(second.y, first.y) && near(second.z, first.z));
  });

  QUnit.test("doesn't change what it was given", (assert) => {
    const target = at(1, 2, 3);
    const direction = at(0.6, -1, -0.45);

    sunPosition(target, direction, 40);

    assert.deepEqual(target, at(1, 2, 3));
    assert.deepEqual(direction, at(0.6, -1, -0.45));
  });

  QUnit.test("the area that gets shadows is wide enough for the marble and what is near it, and the sun is further back than that", (assert) => {
    assert.true(SHADOW_AREA >= 20);
    assert.true(SUN_DISTANCE > SHADOW_AREA / 2);
  });
});
```

Add the script and its tests to `tests.html`, after `marble.js` and `marble.tests.js`:

```html
  <script src="js/camera.js"></script>
```
```html
  <script src="tests/camera.tests.js"></script>
```

Reload `tests.html`: **25 more** tests (**74** in all).

---

## Step 6: The splash

The splash covers the page while Havok and the world load. If everything is quick, taking it away at once would just make it flash, so it stays for a minimum time. Working out how much longer it has to stay is plain arithmetic, in `js/splash.js`. Open the placeholder and replace its contents with:

```js
// The splash screen covers the page while the game loads. If the game loads
// quickly, taking the splash away at once would just make it flash by, so it
// stays up for a minimum time. This works out how much longer that is. Times
// are in milliseconds, and `now` and `shownAt` come from performance.now().
// See ../tests/splash.tests.js.
function remainingSplashTime(shownAt, now, minimum) {
  return Math.max(0, minimum - (now - shownAt));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { remainingSplashTime };
} else {
  window.remainingSplashTime = remainingSplashTime;
}
```

and `tests/splash.tests.js` with:

```js
QUnit.module("remainingSplashTime", () => {
  QUnit.test("a splash that has only just appeared has the whole minimum left", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 1000, 3000), 3000);
  });

  QUnit.test("counts down as time passes", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 2200, 3000), 1800);
  });

  QUnit.test("is zero once exactly the minimum has passed", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 4000, 3000), 0);
  });

  QUnit.test("never goes below zero, however long loading took", (assert) => {
    assert.strictEqual(remainingSplashTime(1000, 90000, 3000), 0);
  });

  QUnit.test("a minimum of zero never waits", (assert) => {
    assert.strictEqual(remainingSplashTime(0, 0, 0), 0);
  });
});
```

Add them to `tests.html`, after `camera.js` and `camera.tests.js`:

```html
  <script src="js/splash.js"></script>
```
```html
  <script src="tests/splash.tests.js"></script>
```

Reload `tests.html`: **5 more** tests (**79** in all).

---

## Step 7: Putting it together

Every piece works. Now `main.js` makes them one game. Open the placeholder `js/main.js`. It's built up in pieces, and it runs after every one.

### 7a. The engine, and the start of the scene

Replace its contents with:

```js
const canvas = document.getElementById("renderCanvas");
const engine = new BABYLON.Engine(canvas, true);

// A phone's screen has two or three times as many pixels across as it seems to, and drawing
// every one is slow and hot. Drawing at most twice as many as the page's units looks sharp
// and keeps the game smooth. (A hardware scaling level of 0.5 draws twice as many pixels.)
const MAX_PIXEL_RATIO = 2;
engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));

const BACKGROUND = "#161b26"; // dark blue-steel, so the chrome marble and the yellow edges stand out
const SPLASH_MIN_MS = 3000; // the splash stays at least this long, even if everything loads sooner

const createScene = async () => {
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString(`${BACKGROUND}FF`);
  return { scene };
};

const splash = document.getElementById("splash");
const splashStatus = document.getElementById("splash-status");
const shownAt = performance.now();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

createScene()
  .then(async ({ scene }) => {
    engine.runRenderLoop(() => {
      scene.render();
    });

    window.addEventListener("resize", () => {
      engine.resize();
    });

    // The world is ready, drawing behind the splash. Keep the splash up for its minimum
    // time, then fade it out and take it away.
    await delay(remainingSplashTime(shownAt, performance.now(), SPLASH_MIN_MS));
    splash.classList.add("hidden");
    scene.physicsEnabled = true; // and now the marble can drop
    setTimeout(() => splash.remove(), 700); // after the fade has finished
  })
  .catch((error) => {
    console.error(error);
    splashStatus.textContent =
      "Something went wrong starting the game. The physics engine is loaded from the internet, so check " +
      "your connection, and that the page is opened through a web server (for example `npx serve` in the " +
      "repo folder). The console has the details.";
  });
```

Things to notice:

- **`setHardwareScalingLevel`** is how many screen pixels to draw for each pixel of the canvas, inverted. A phone's screen has two or three times as many pixels across as it seems to (`devicePixelRatio`), and drawing all of them is slow and hot. The game draws at most twice as many (`MAX_PIXEL_RATIO`), which still looks sharp and keeps a phone cool. A hardware scaling level of `0.5` draws twice as many pixels, so the level is `1 / ratio`.
- **The bootstrap** (the part at the bottom) is the same shape as in the Parkour Runner series: `createScene` returns a promise (it's `async`, because loading physics is), the render loop starts when it resolves, and the splash fades after its minimum time. If anything throws, the splash stays and says what to check.

Serve the page: the splash fades after three seconds, to a dark screen.

### 7b. The physics and the camera

Directly below the `scene.clearColor` line in `createScene`, add:

```js
  // Physics first: the course and the marble are bodies in it.
  await loadPhysics(scene);

  // The physics moves with every frame that is drawn, and frames are drawn behind the splash
  // while the game loads, so the marble would be halfway down the ramp by the time anyone
  // saw it. Hold the world still until the splash has gone.
  scene.physicsEnabled = false;

  // An orthographic camera (no perspective) looking down from a corner. It is an ArcRotateCamera,
  // which sits on a sphere around a target, so "from a corner, tipped down" is just two angles.
  // It isn't attached to the mouse or touch: the player doesn't move the view.
  const camera = new BABYLON.ArcRotateCamera("camera", ISO_ALPHA, ISO_BETA, CAMERA_RADIUS, BABYLON.Vector3.Zero(), scene);
  camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 1;
  camera.maxZ = 200;
  scene.activeCamera = camera;

  // An orthographic camera is given the edges of its view, in world units, and they have to be
  // worked out again whenever the screen changes shape: a phone turned on its side, a window resized.
  const fitView = () => {
    const { halfWidth, halfHeight } = viewHalfExtents(engine.getAspectRatio(camera));
    camera.orthoLeft = -halfWidth;
    camera.orthoRight = halfWidth;
    camera.orthoBottom = -halfHeight;
    camera.orthoTop = halfHeight;
  };
  fitView();
  engine.onResizeObservable.add(fitView);
```

Things to notice:

- **`await loadPhysics(scene)` comes first** because the course and the marble are bodies in it.
- **`scene.physicsEnabled = false` holds the world still.** The physics moves with every frame that is drawn, and frames are drawn behind the splash while the game loads, so without this the marble would be halfway down the ramp, or off the end, before anyone saw it. The bootstrap you wrote in 7a turns it back on (`scene.physicsEnabled = true`) when the splash fades, and that is the moment the marble drops.
- **An `ArcRotateCamera` sits on a sphere around a target,** so "from a corner, tipped down" is just its two angles, plus how far back. In orthographic mode (`camera.mode`) the radius only matters for clipping. It isn't attached to the mouse or touch, so the player can't move the view.
- **`orthoLeft`, `orthoRight`, `orthoTop` and `orthoBottom`** are the edges of the box the camera sees, in world units. They have to be worked out again whenever the screen changes shape: a phone turned on its side, a window resized. `engine.onResizeObservable` calls `fitView` each time, so the view always fits.

### 7c. Light and shadow

Directly below the camera, add:

```js
  // A soft light from above fills in the dark sides, and a stronger one from a corner gives
  // every slab a bright side and a dark one, and lets the marble cast a shadow, which is how you
  // see how high above a floor it is.
  const sky = new BABYLON.HemisphericLight("sky", new BABYLON.Vector3(0, 1, 0), scene);
  sky.intensity = 0.75;
  sky.groundColor = new BABYLON.Color3(0.17, 0.2, 0.28);
  sky.diffuse = new BABYLON.Color3(0.82, 0.88, 1); // a cool light from above, like the logo's sky
  const sun = new BABYLON.DirectionalLight("sun", new BABYLON.Vector3(0.6, -1, -0.45), scene);
  sun.intensity = 0.9;
  sun.diffuse = new BABYLON.Color3(1, 0.94, 0.82); // and a warm one from the corner, like the factory glow

  // Shadows are drawn into a picture of the scene as the sun sees it, and that picture only covers
  // a square of the world, SHADOW_AREA wide. Covering the whole course would make every shadow a
  // blur, so the square is kept around the marble: the sun is moved with it every frame (below).
  sun.shadowFrustumSize = SHADOW_AREA;
  sun.shadowMinZ = 1;
  sun.shadowMaxZ = SUN_DISTANCE * 2;
  const shadows = new BABYLON.ShadowGenerator(1024, sun);
  shadows.usePercentageCloserFiltering = true; // soft edges, without the artifacts of the cheaper kinds
  shadows.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = 0.001; // stops a surface shadowing itself
```

Things to notice:

- **Two lights again:** a soft one from above that fills in the dark sides, and a strong one from a corner that gives every slab a bright side and a dark one.
- **The two lights are different colors.** The one from above is a cool blue-white, like the sky in the logo, and the one from the corner is warm, like the glow of a factory. A little color difference between the lit and the shaded sides makes the slabs look solid.
- **The marble casts a shadow, and that is how you judge height.** In an isometric view with no perspective, there is no other cue for whether the marble is on the floor or a unit above it. The shadow on the floor tells you. Every game of this kind has one.
- **A `ShadowGenerator` draws the scene from the sun's point of view** into a picture, and darkens whatever is behind something. The picture only covers a square of the world, so `shadowFrustumSize` says how wide (`SHADOW_AREA`), `shadowMinZ` and `shadowMaxZ` say how near and far it looks, and the sun is put near the marble every frame, in Step 7e, so that square is always around it.
- **Only the marble casts a shadow, and the slabs only receive them.** Making the slabs cast too would put shadows from the ramp onto the deck below, which would be nice, but each thing that casts needs its shadow tuned, and the marble's is the one the player needs.
- **`usePercentageCloserFiltering`** looks at several points of the shadow picture for each pixel and averages them, which softens the edge. `filteringQuality` says how many. **`bias`** is a tiny offset that stops a surface from being judged to be in the shadow of itself, which shows as stripes.

### 7d. The course and the marble

Directly below the lights, add:

```js
  buildCourse(scene);
  const marble = new Marble(scene);
  shadows.addShadowCaster(marble.mesh);
```

The marble is added to the shadow generator as a **caster**: the thing that makes a shadow. The slabs already receive them, because `buildCourse` set `receiveShadows`.

### 7e. Rolling again, and the frame loop

Directly below that, and above `return { scene };`, add:

```js
  // Rolling again: R on a keyboard, and a button for a screen with no keys.
  const dropAgain = () => marble.reset();
  window.addEventListener("keydown", (event) => {
    if (event.code === "KeyR" && !event.repeat) dropAgain();
  });
  const dropButton = document.getElementById("drop");
  dropButton.addEventListener("click", () => {
    dropButton.blur();
    dropAgain();
  });

  // Each frame: put a marble that fell off the course back, keep the sun over it, and ease the
  // camera after it.
  let focus = { ...MARBLE_START };
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    if (hasFallen(marble.position.y)) dropAgain();
    const sunAt = sunPosition(marble.position, sun.direction, SUN_DISTANCE);
    sun.position.set(sunAt.x, sunAt.y, sunAt.z);
    focus = follow(focus, marble.position, FOLLOW_RATE, dt);
    camera.target.set(focus.x, focus.y, focus.z);
  });
```

Things to notice:

- **A button as well as a key.** `R` works on a keyboard and the button works on a screen with no keys. Both call the same `dropAgain`. The button lets go of the keyboard focus (`blur`) so a later space bar doesn't press it again.
- **A marble that fell off is put back.** Each frame it checks `hasFallen`, and if so, resets.
- **The sun follows the marble.** Every frame it is put the same distance back along its direction from where the marble is, so the square of the world that gets shadows is always around the marble. (The sun's *direction* never changes, only where it stands.)
- **The camera follows with a delay.** The point it looks at (`focus`) eases toward the marble every frame. The camera isn't *glued* to the marble: it trails a little, which feels like weight, and is much easier to watch than a view that jerks with every bounce.
- **`dt` is capped at 0.05 seconds.** If the tab was in the background for a minute, the next frame's `dt` would be a minute, and the camera would jump. The cap stops that.

---

## Step 8: Try it

Serve the page and open it. The marble drops onto the top of the ramp, rolls down it, onto the lower deck, up the side ramp, and off the end. It is put back and drops again.

- [ ] The **logo** shows on the splash (with its transparent edge, no white box), and fades after three seconds
- [ ] The marble is **still at the top** when the splash fades, and drops at that moment, not before
- [ ] After the splash, the course and the marble appear, **seen from a corner with no perspective**: the ramp is the same width at both ends
- [ ] The marble **rolls down the ramp, gets faster, slows on the flat**, and falls off the far end
- [ ] **It is put back** at the top and drops again, over and over
- [ ] **A shadow** follows the marble on the floor, so you can see when it is above it
- [ ] The floors are **checkered squares**, the same size everywhere, not stretched
- [ ] **R**, or the **Drop again** button (dark steel, with a yellow-and-black hazard border), puts the marble back at once
- [ ] The camera **trails** the marble, and settles when it stops
- [ ] **Resize the window**: the view always shows the whole width of the course, and nothing is stretched
- [ ] In **device mode** (a phone, upright and on its side) the whole course is still in view, the splash fits, and the button is easy to reach
- [ ] **C** saves a screenshot

**If something's wrong**

- **`HavokPhysics is not defined`:** the Havok script tag is missing from `index.html`, or comes after your own scripts.
- **The splash never goes away, or says something went wrong:** open the console (F12). The splash blames the physics engine because that is the likely cause (a blocked or failed download of the script or of the `.wasm` file next to it), but the console has the real error.
- **The text is in a plain font, or the splash has no logo:** open the Network tab (F12) and look for a red `.ttf` or `.webp` file. Paths in `index.html` are relative to the page (`../assets/images/...`), and paths inside `css/game.css` to the CSS file (`../../assets/fonts/...`).
- **`Cannot read properties of null` and an element id:** an element the code looks for by `id` isn't in `index.html`: `renderCanvas`, `splash`, `splash-status` or `drop`.
- **The marble is already down the ramp when the splash goes:** `scene.physicsEnabled = false` is missing from `createScene`, or the line that turns it back on is before the splash fades instead of after.
- **The marble never moves:** physics isn't turned on. Check `await loadPhysics(scene)` is called before the marble is made.
- **The marble falls through the floor:** the slabs aren't bodies, or the marble was made before them, or a slab has no `PhysicsAggregate`. A test (*"every slab is a body that never moves"*) covers one of those.
- **The marble sits on the start deck and doesn't roll:** it starts over the flat deck instead of the ramp. Check `MARBLE_START`.
- **The marble rolls for ever on the flat:** damping isn't set.
- **The floors are dark except one corner:** the texture's `wrapU` and `wrapV` aren't set to repeat.
- **The floor texture is in long stripes on the ramp:** the top face's `faceUV` has `across` and `deep` the wrong way round.
- **The marble doesn't stay where `reset` puts it:** `disablePreStep` is still `true`.
- **The picture is squashed, or the course is cut off on a phone:** `fitView` isn't called again on a resize, or the box isn't made from the screen's aspect.
- **The camera jerks:** `follow` is being called with a fixed number instead of `dt`.
- **No shadow:** the marble isn't added with `addShadowCaster`, or the slabs don't have `receiveShadows`. If both are right, the sun isn't near the marble: the square that gets shadows is only `SHADOW_AREA` wide, around `sun.position`, so check that `sun.position` is set from `sunPosition` every frame, and that `shadowFrustumSize`, `shadowMinZ` and `shadowMaxZ` are set. (A shadow that is cast but outside that square is simply not drawn.)
- **The shadow is a blur, or blocky:** `SHADOW_AREA` is too big. The same shadow picture is stretched over a bigger square.
- **The whole deck is dark, or covered in stripes:** the slabs were made casters as well as receivers, or `bias` is missing or too small. Try a bigger `bias`.
- **The shadow stays behind when the marble moves:** the sun isn't being moved every frame.

**Experiments** (change one, reload, then change it back):

- `GRAVITY` of `-9.81`: the marble falls as if on Earth, and the game feels slow. Of `-60`: it feels heavy and fast
- `SURFACES.steel.restitution` of `0.9`: a bouncy ball. Of `0`: a dead drop
- `SURFACES.deck.friction` of `0` (and the marble's, too): ice. The marble slides instead of rolling, and the damping is all that slows it
- `MARBLE_DAMPING` of `{ linear: 0, angular: 0 }`: a marble that never slows
- A steeper ramp: change `[6, 0]` in the ramp to `[6, -3]`. The test about steepness complains, and the marble gets a lot faster
- `ISO_BETA` of `Math.PI / 4`: a lower, flatter view. Of `0.2`: nearly straight down
- `--yellow` and `--orange` in `css/game.css`: the button's border, and its colors when you press it, change at once. Try the blue as the accent
- `button.hazard:hover` with `var(--orange)`: a hotter button
- `SHADOW_AREA` of `120`: the shadow is a blur, because the same picture is spread over a bigger square. Of `6`: sharp, but it vanishes at the edges of the square
- The sun's direction in `main.js`, `(0.6, -1, -0.45)`: try `(0, -1, 0)` and the shadow goes straight under the marble, where the marble hides it
- `FOLLOW_RATE` of `0.5`: a lazy camera. Of `30`: glued to the marble
- `MAX_PIXEL_RATIO` of `1` in device mode: the picture gets soft; look at the edge of the marble

---

## Step 9: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **79 passing tests**: 9 for the physics, 21 for the course, 19 for the marble, 25 for the camera and the sun, and 5 for the splash.

> **What these tests don't cover.** They check what the physics does, with nothing drawn, and the maths of the camera. They can't tell you the ramp looks good, that the shadow reads well, or that a marble *feels* right: that is Step 8, with your eyes.

> **Try breaking something.** In `Marble`, delete the line `this.aggregate.body.setLinearDamping(...)`. Run the tests: *"rolls on to the lower deck, and slows there, because of the damping"* fails, because the marble never slows. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A page for a phone: viewport, no scroll or zoom, capped pixel density | `index.html`, `css/game.css`, `setHardwareScalingLevel` |
| Loading a WebAssembly engine once | `loadHavok` |
| Gravity, friction, restitution | `GRAVITY`, `SURFACES` |
| Fixed and moving bodies | `mass: 0`, `PhysicsAggregate` |
| Level geometry as plain data | `COURSE`, `slabShape` |
| Repeating a texture drawn in code | `makeDeckTexture`, `faceUV`, `wrapU` |
| Damping: why a marble slows | `MARBLE_DAMPING` |
| Isometric angles, and an orthographic box that fits any screen | `ISO_ALPHA`, `ISO_BETA`, `viewHalfExtents` |
| Frame-rate-independent easing | `follow` |
| A shadow as a depth cue, with its area kept on the action | `ShadowGenerator`, `shadowFrustumSize`, `sunPosition` |
| Testing physics with no screen, by letting time pass | `NullEngine`, `stepPhysics` |

## Challenges

1. **A longer course.** Add a slab or two to `COURSE`: a second ramp, a lower deck with a turn. (Hint: `z` and `depth` decide where a slab is across the course. The course only goes in a line so far; try a slab with a different `z`.)
2. **A rougher floor.** Make one slab slippery and another grippy. (Hint: `friction` is given to each `PhysicsAggregate`. Give a slab its own `friction` in the data, and use it in `buildCourse`.)
3. **A heavier marble.** Give it more mass and see what changes, and what doesn't. (Hint: in a vacuum everything falls at the same rate. Mass matters when things *collide*.)
4. **A wall along an edge.** Stop the marble falling off the ramp's side. (Hint: a thin tall box on the course, a body with `mass: 0`.)
5. **Shadows from the slabs.** Let the ramp shade the deck below it. (Hint: add each slab with `addShadowCaster`. Then deal with the stripes, which is what `bias` is for, and the edges.)
6. **See the body.** Draw the physics shapes as wireframes, to check they match the meshes. (Hint: `BABYLON.PhysicsViewer` shows them.)

---
