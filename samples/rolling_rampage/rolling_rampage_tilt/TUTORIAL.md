# Tutorial: Rolling Rampage Tilt -- Steering by Tipping the Phone

This is the third tutorial in the Rolling Rampage series. The marble can be steered with the keys and with a thumb, and in this step it can be steered the way the old tilting-maze toys were: **tip the phone like a tray, and the marble rolls toward the edge that goes down.** The phone's motion sensor says how it is tipped; you turn that into the same kind of stick the keys and the thumb make, so everything after it (the direction in the world, the push) is already written. Most of the work is the awkward parts of a sensor: asking permission, a page that isn't allowed to use it, a phone that is held differently by everyone, a screen that turns on its side, and a reading that jitters. You write the code; this document tells you what to write and why.

By the end you'll have:

- The **rules of tilt** in plain numbers: a tilt turned to the screen's frame, a **dead zone** and a maximum, and an easing that doesn't depend on the frame rate
- A **`TiltInput`** class that talks to the sensor: it asks permission (the way an iPhone needs), copes with a computer that has no sensor and a page that isn't secure, and keeps a stick up to date
- **Calibration**: the way the phone is held when tilt starts is level, and a **Set level** button (and turning the phone on its side) says it again
- A **button, a line of words and a gauge** on the page, so every way tilt can fail is a sentence on the screen and the player can *see* the tilt
- Tilt joined to the keys and the thumb as a **third stick**
- Unit tests for all of it, **using a fake sensor** so no phone is needed

**What you'll learn:** the `deviceorientation` event and its `beta` and `gamma` angles, which way each tilts, why a sensor's reading has to be turned by the screen's orientation, permission that has to be asked for from a tap (`DeviceOrientationEvent.requestPermission`), why a page needs to be served over HTTPS to get a sensor, dead zones and clamping in degrees, easing a noisy value, calibration, and testing code that depends on hardware by giving it a stand-in.

## Where you're starting

This folder is a copy of the finished Marble sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_tilt/
├── index.html, tests.html   (change -- Steps 1 and 3)
├── css/
│   └── game.css            (grows -- Step 3)
├── js/
│   ├── tilt.js             (placeholder -- Steps 1 and 2)
│   ├── main.js             (changes -- Step 4)
│   └── physics.js, course.js, marble.js, steering.js, controls.js, camera.js, splash.js   (from the Marble sample)
└── tests/
    ├── tilt.tests.js       (placeholder)
    └── the rest            (from the Marble sample)
```

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_tilt/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

Tilt needs one more thing from the server: the browser only gives a page the motion sensors if the page is **secure**. `http://localhost` counts as secure, so the page you open on your computer is fine, but a phone on your network opening `http://192.168.1.20:3000` is **not**. Step 5 shows how to try tilt on a real phone.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Marble sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works (arrow keys roll the marble). Open `tests.html` too and note how many tests pass (**181**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: Tilt, in numbers

The sensor reports how the phone is tipped as angles, in degrees. Two matter here, and both are measured from the phone lying flat on a table:

- **`beta`**: forward and back. It grows as the *top* edge is raised, so it is about 90 with the phone held upright in front of you.
- **`gamma`**: left and right. It grows as the *right* edge goes down.

The game is a tray, so what we want is *which edge went down*: the marble rolls toward it. The right edge going down is `+gamma`, so the marble rolls right. The top edge being raised is `+beta`, which means the *bottom* edge went down, so the marble rolls toward you, down the screen. That sign flip is the first thing to get right, and the tests will check it.

There is a second problem. Both angles belong to the *phone*, and turn with it. Hold the phone on its side and the phone's right edge is the top of the *screen*. The stick we want is in the screen's frame, like the keyboard's and the thumb's, so the tilt has to be turned by the angle the screen is turned (`screen.orientation.angle`: 0 upright, 90 or 270 on its side, 180 upside down).

Then the same two touches as the thumb stick: a **dead zone** (nobody holds a phone perfectly still, and a marble that creeps while you think you are level is maddening), and a **maximum** (the wrist should never have to bend past about 20 degrees). And one new one: the sensor jitters, so the stick is **eased** toward the tilt instead of jumping to it.

All of that is plain numbers, so it goes in a file with no Babylon.js and no page in it. Open the placeholder `js/tilt.js` and replace its contents with:

```js
// Tilt: steering by tipping the phone like a tray, so the marble rolls toward the edge that
// goes down. The first half is the rules, all plain numbers (how a tilt turns into a stick,
// and how a stick is eased), with no page and no sensor. The second half, TiltInput, is the part
// that talks to the sensor and keeps a stick up to date for the game to read.
// See ../tests/tilt.tests.js.
//
// The sensor says how the phone is tipped in two angles, in degrees:
//   beta   forward and back: 0 lying flat, and growing as the top edge is raised
//   gamma  left and right: 0 lying flat, and growing as the right edge goes down
// Both are in the phone's own frame, which turns with the phone. The stick, like the others,
// is in the screen's frame. When the phone is on its side the two don't match, so the tilt has
// to be turned by the angle the screen is turned.

// The tilt, in degrees from level, that is a full stick. Beyond it a stick doesn't get stronger,
// so the wrist never has to bend further than this.
const TILT_MAX_ANGLE = 20;
// A tilt smaller than this (in degrees) is ignored: nobody holds a phone perfectly still, and a
// marble that creeps while the player thinks they are level is maddening.
const TILT_DEAD_ZONE = 2.5;
// How quickly the stick catches up with the tilt, in "parts of the way there a second". The sensor
// is a little jittery, and easing the stick takes the jitter out. Bigger is quicker and twitchier.
const TILT_SMOOTHING = 12;

// An angle between two readings, kept between -180 and 180: from 179 to -179 is a 2 degree turn,
// not a 358 degree one.
function wrapDegrees(degrees) {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

// A tilt in the phone's frame, { x, y } in degrees (x: right edge down, y: top edge down), turned into
// the screen's frame. `angle` is how far the screen is turned from the phone's usual way up, in
// degrees (screen.orientation.angle: 0 upright, 90 or 270 on its side, 180 upside down).
function screenTilt(tilt, angle) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: tilt.x * cos - tilt.y * sin, y: tilt.x * sin + tilt.y * cos };
}

// A tilt on the screen, in degrees, as a stick. A tilt inside the dead zone is nothing at all; past it the
// stick grows until `max`, and from there is as long as it gets. Like the touch stick, it is rescaled
// to start from the edge of the dead zone, so there is no jump.
function tiltToStick(tilt, { max = TILT_MAX_ANGLE, deadZone = TILT_DEAD_ZONE } = {}) {
  const length = Math.hypot(tilt.x, tilt.y);
  if (length <= deadZone) return { x: 0, y: 0 };
  const strength = Math.min(1, (length - deadZone) / (max - deadZone));
  return { x: (tilt.x / length) * strength, y: (tilt.y / length) * strength };
}

// Moves a stick part of the way to where it is headed. The part depends on how long the frame
// was, not on the frame, so it eases the same on a phone at 30 frames a second as on a
// monitor at 144. (The same easing as the camera's.)
function smoothStick(current, target, rate, dt) {
  const k = 1 - Math.exp(-rate * dt);
  return { x: current.x + (target.x - current.x) * k, y: current.y + (target.y - current.y) * k };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TILT_MAX_ANGLE, TILT_DEAD_ZONE, TILT_SMOOTHING, wrapDegrees, screenTilt, tiltToStick, smoothStick };
} else {
  Object.assign(window, { TILT_MAX_ANGLE, TILT_DEAD_ZONE, TILT_SMOOTHING, wrapDegrees, screenTilt, tiltToStick, smoothStick });
}
```

Things to notice:

- **`screenTilt` is a rotation.** A tilt is an `{ x, y }` in degrees, and turning it by the screen's angle is the same sum as turning a point round the middle. It never changes *how far* the phone is tipped, only which way that is on the screen. Check one case by hand: on its side (90), the phone's right edge is at the top of the screen, so the right edge going down (`x: 10`) must roll the marble *up* the screen, `y: 10`. The formula gives `x: 10 * cos 90 - 0 * sin 90 = 0` and `y: 10 * sin 90 + 0 * cos 90 = 10`.
- **`wrapDegrees`** is for the end of `beta`'s range. It runs from -180 to 180, so a phone going from 179 to -179 has turned 2 degrees, not 358. The subtraction is done in `TiltInput`, and this is the tool.
- **`tiltToStick` rescales from the edge of the dead zone**, so the stick starts at nothing and rises smoothly, and there is no jump when the tilt leaves it. It works on the length of the tilt, so a tilt to a corner is no stronger than a straight one.
- **`smoothStick` uses `1 - Math.exp(-rate * dt)`**, the same easing the camera uses. The share of the distance it covers depends on how much *time* passed, not on how many frames, so it eases the same on a phone at 30 frames a second as on a monitor at 144.

### Tests

Add the new script and its tests to `tests.html`, after `controls.js` and `controls.tests.js`:

```html
  <script src="js/tilt.js"></script>
  <script src="tests/tilt.tests.js"></script>
```

(The first goes in the list of game scripts, the second in the list of tests.) Now open the placeholder `tests/tilt.tests.js` and replace its contents with:

```js
QUnit.module("wrapDegrees", () => {
  QUnit.test("an angle already between -180 and 180 is left alone", (assert) => {
    assert.equal(wrapDegrees(0), 0);
    assert.equal(wrapDegrees(45), 45);
    assert.equal(wrapDegrees(-120), -120);
  });

  QUnit.test("a turn past the end comes round the other side", (assert) => {
    assert.equal(wrapDegrees(358), -2);
    assert.equal(wrapDegrees(-358), 2);
    assert.equal(wrapDegrees(180 + 2), -178);
  });
});

QUnit.module("screenTilt", () => {
  const near = (assert, actual, expected, message) => {
    assert.true(Math.abs(actual.x - expected.x) < 1e-9 && Math.abs(actual.y - expected.y) < 1e-9, `${message}: got ${actual.x}, ${actual.y}`);
  };

  QUnit.test("an upright screen leaves the tilt as it is", (assert) => {
    near(assert, screenTilt({ x: 10, y: -4 }, 0), { x: 10, y: -4 }, "unchanged");
  });

  QUnit.test("on its side, the phone's right edge is at the top of the screen", (assert) => {
    // The phone's right edge down is now the top of the screen down, so the marble rolls up the screen.
    near(assert, screenTilt({ x: 10, y: 0 }, 90), { x: 0, y: 10 }, "right edge down is up the screen");
    // And the phone's top edge down is now the left of the screen down, so the marble rolls left.
    near(assert, screenTilt({ x: 0, y: 10 }, 90), { x: -10, y: 0 }, "top edge down is left");
  });

  QUnit.test("turned the other way on its side, it is the other way round", (assert) => {
    near(assert, screenTilt({ x: 10, y: 0 }, 270), { x: 0, y: -10 }, "right edge down is down the screen");
    near(assert, screenTilt({ x: 10, y: 0 }, -90), { x: 0, y: -10 }, "-90 is 270");
  });

  QUnit.test("upside down, everything is backwards", (assert) => {
    near(assert, screenTilt({ x: 10, y: -4 }, 180), { x: -10, y: 4 }, "negated");
  });

  QUnit.test("turning never changes how far the phone is tipped", (assert) => {
    for (let angle = 0; angle < 360; angle += 15) {
      const turned = screenTilt({ x: 3, y: 4 }, angle);
      assert.true(Math.abs(Math.hypot(turned.x, turned.y) - 5) < 1e-9, `${angle} degrees`);
    }
  });
});

QUnit.module("tiltToStick", () => {
  QUnit.test("a tilt inside the dead zone is nothing", (assert) => {
    assert.deepEqual(tiltToStick({ x: 0, y: 0 }), { x: 0, y: 0 });
    assert.deepEqual(tiltToStick({ x: TILT_DEAD_ZONE, y: 0 }), { x: 0, y: 0 });
    assert.deepEqual(tiltToStick({ x: 1.5, y: 1.5 }), { x: 0, y: 0 });
  });

  QUnit.test("the stick starts from nothing at the edge of the dead zone", (assert) => {
    const stick = tiltToStick({ x: TILT_DEAD_ZONE + 0.01, y: 0 });
    assert.true(stick.x > 0 && stick.x < 0.01);
  });

  QUnit.test("the maximum tilt is a full stick, and more is no more", (assert) => {
    assert.true(Math.abs(tiltToStick({ x: TILT_MAX_ANGLE, y: 0 }).x - 1) < 1e-9);
    assert.deepEqual(tiltToStick({ x: 80, y: 0 }), { x: 1, y: 0 });
    const diagonal = tiltToStick({ x: 60, y: 60 });
    assert.true(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-9, "a corner is no stronger than a straight line");
  });

  QUnit.test("in between, the stick grows in proportion", (assert) => {
    const halfway = (TILT_DEAD_ZONE + TILT_MAX_ANGLE) / 2;
    assert.true(Math.abs(tiltToStick({ x: halfway, y: 0 }).x - 0.5) < 1e-9);
  });

  QUnit.test("the stick points the way the tilt does, on both axes", (assert) => {
    const stick = tiltToStick({ x: -12, y: 5 });
    assert.true(stick.x < 0 && stick.y > 0);
    assert.true(Math.abs(stick.y / stick.x - 5 / -12) < 1e-9, "the same direction");
  });

  QUnit.test("the dead zone and the maximum can be changed", (assert) => {
    assert.deepEqual(tiltToStick({ x: 8, y: 0 }, { max: 20, deadZone: 10 }), { x: 0, y: 0 });
    assert.true(Math.abs(tiltToStick({ x: 10, y: 0 }, { max: 10, deadZone: 0 }).x - 1) < 1e-9);
  });
});

QUnit.module("smoothStick", () => {
  QUnit.test("no time passing changes nothing", (assert) => {
    assert.deepEqual(smoothStick({ x: 0.2, y: -0.4 }, { x: 1, y: 1 }, TILT_SMOOTHING, 0), { x: 0.2, y: -0.4 });
  });

  QUnit.test("it moves part of the way there, in the right direction", (assert) => {
    const next = smoothStick({ x: 0, y: 0 }, { x: 1, y: -1 }, TILT_SMOOTHING, 1 / 60);
    assert.true(next.x > 0 && next.x < 1);
    assert.true(next.y < 0 && next.y > -1);
  });

  QUnit.test("it gets there in the end, and never overshoots", (assert) => {
    let stick = { x: 0, y: 0 };
    for (let i = 0; i < 120; i++) {
      stick = smoothStick(stick, { x: 1, y: 0 }, TILT_SMOOTHING, 1 / 60);
      assert.true(stick.x <= 1);
    }
    assert.true(stick.x > 0.999);
    assert.equal(smoothStick({ x: 0, y: 0 }, { x: 1, y: 0 }, 1000, 1).x <= 1, true, "even in one huge step");
  });

  QUnit.test("it eases the same however the time is cut up", (assert) => {
    const once = smoothStick({ x: 0, y: 0 }, { x: 1, y: 0 }, TILT_SMOOTHING, 0.1);
    let stick = { x: 0, y: 0 };
    for (let i = 0; i < 10; i++) stick = smoothStick(stick, { x: 1, y: 0 }, TILT_SMOOTHING, 0.01);
    assert.true(Math.abs(once.x - stick.x) < 1e-9);
  });
});
```

Things to notice:

- **The tests for `screenTilt` check the awkward cases by name:** on its side one way, on its side the other, upside down, and that turning never changes the length.
- **A turn "through the end"** (`wrapDegrees(358)` is -2) is the case that would make a marble fly across the screen once in a blue moon, and is exactly what a test is for.
- **`tiltToStick` is tested at its edges**: just inside the dead zone, just past it, at the maximum, and past the maximum.
- **The easing is tested for the frame rate:** one 0.1 second step must land where ten 0.01 second steps do.

Open `tests.html`. You should see **198 passing tests**: the 181 you started with and 17 new ones.

---

## Step 2: Listening to the sensor

Now the part that touches the browser. A sensor is a bag of awkward facts:

- On an **iPhone** the page must *ask* (`DeviceOrientationEvent.requestPermission()`), it may only do so from a **tap**, and the player can say no.
- On **Android**, and in most browsers, there's no question: the event just starts arriving.
- On a **computer**, the event exists but there's no sensor, so the browser sends **one reading with nothing in it** (`beta` and `gamma` are `null`). That is how a page finds out.
- On a page that isn't **secure**, the browser doesn't send the events at all, and says nothing. The page has to notice for itself (`window.isSecureContext`), or the player is left looking at a marble that won't move.

A phone has no console to read, so every one of those has to end up as a sentence on the screen. The class is a small state machine, and each state has a message.

Everything the class needs from the browser is **given to it** (the thing that hears the events, the screen's angle, the `DeviceOrientationEvent` itself, whether the page is secure), with the real ones as the defaults. In the game none are passed; in the tests, each is a stand-in, which is how all of this is tested without a phone.

### 2a. The state, and switching on and off

First the messages, one for each state. Add them to `js/tilt.js` directly below `TILT_SMOOTHING`, above `wrapDegrees`:

```js
// What to tell the player in each state. A phone has no console to look in, so every way tilt
// can fail is a sentence on the screen.
const TILT_MESSAGES = {
  off: "Tilt is off",
  asking: "Allow motion access when asked",
  waiting: "Waiting for the tilt sensor",
  ready: "Tilt is on. Hold the phone how you like, then Set level",
  denied: "Motion access was refused. Reload the page to be asked again",
  unsupported: "This device has no tilt sensor",
  insecure: "Tilt needs the page to be served over https",
};
```

Then the class, complete and closed, directly below `smoothStick` and above the export block:

```js
// Listens to the phone's tilt and keeps `stick` up to date. Everything it needs from the outside is
// given to it, so a test can give it a fake sensor:
//   target            what hears "deviceorientation" events (the window)
//   orientationAngle  a function: how far the screen is turned right now
//   OrientationEvent  the browser's DeviceOrientationEvent: on an iPhone it has requestPermission
//   secure            whether the page is served securely (https, or localhost)
//
// It is always in one of these states, each with a message in TILT_MESSAGES:
//   off          not asked for
//   asking       waiting for the player to answer the browser's permission question
//   waiting      listening, but nothing has been heard yet
//   ready        listening, and tilting steers
//   denied       the player said no
//   unsupported  the device has no sensor (a laptop's browser sends one empty reading)
//   insecure     the browser won't give the page the sensor
class TiltInput {
  constructor({
    target = window,
    orientationAngle = () => (screen.orientation ? screen.orientation.angle : 0),
    OrientationEvent = window.DeviceOrientationEvent,
    secure = window.isSecureContext,
  } = {}) {
    this.target = target;
    this.orientationAngle = orientationAngle;
    this.OrientationEvent = OrientationEvent;
    this.secure = secure;

    this.state = "off";
    this.reading = null; // the latest { beta, gamma }
    this.neutral = null; // the reading that counts as level, in the phone's frame
    this.stick = { x: 0, y: 0 }; // what the game reads: the tilt, as a stick, eased

    this.listener = (event) => this.hear(event);
  }
}
```

Now give it a way to be switched on and off. Add these **inside** the class, above its closing `}`:

```js
  // True while tilt is switched on, whether or not it has heard anything yet.
  get active() {
    return this.state === "asking" || this.state === "waiting" || this.state === "ready";
  }

  // Switch tilt on. This must be called from a tap: an iPhone only shows its permission question
  // to a page that asks because of one. Resolves to the state it ended up in.
  async enable() {
    if (this.active) return this.state;
    if (!this.secure) return (this.state = "insecure");
    if (!this.OrientationEvent) return (this.state = "unsupported");

    // Only an iPhone (and iPad) has requestPermission. Everything else just starts sending events.
    if (typeof this.OrientationEvent.requestPermission === "function") {
      this.state = "asking";
      let answer;
      try {
        answer = await this.OrientationEvent.requestPermission();
      } catch (error) {
        answer = "denied"; // it throws if it wasn't asked from a tap
      }
      if (this.state !== "asking") return this.state; // switched off while the question was up
      if (answer !== "granted") return (this.state = "denied");
    }

    this.state = "waiting";
    this.target.addEventListener("deviceorientation", this.listener);
    return this.state;
  }

  // Switch tilt off, and forget everything it knew.
  disable() {
    this.target.removeEventListener("deviceorientation", this.listener);
    this.state = "off";
    this.reading = null;
    this.neutral = null;
    this.stick = { x: 0, y: 0 };
  }
```

And the export block now has two more names, `TILT_MESSAGES` and `TiltInput`:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TILT_MAX_ANGLE, TILT_DEAD_ZONE, TILT_SMOOTHING, TILT_MESSAGES, wrapDegrees, screenTilt, tiltToStick, smoothStick, TiltInput };
} else {
  Object.assign(window, { TILT_MAX_ANGLE, TILT_DEAD_ZONE, TILT_SMOOTHING, TILT_MESSAGES, wrapDegrees, screenTilt, tiltToStick, smoothStick, TiltInput });
}
```

Things to notice:

- **`enable` is `async`**, because on an iPhone the answer comes when the player taps *Allow*. It returns the state it ended up in, and `state` is `"asking"` while the question is up.
- **A refusal is a normal answer, and so is an error.** `requestPermission` *throws* if it isn't called from a tap, and the page treats that as a refusal rather than breaking.
- **Switching off while the question is up stays off.** After the `await`, the state is checked: if the player switched tilt off in the meantime, a late "granted" mustn't turn it back on. (A small thing that is easy to miss, and has a test.)
- **Listening starts only when allowed.** Before then there is no listener at all, which a test checks.
- **Nothing here uses `window` directly** except the defaults in the constructor, so a test can pass anything in.

### Tests

Add these tests to the bottom of `tests/tilt.tests.js`. They start a new module for the class, with a stand-in for the thing that hears events and a `make` that builds a `TiltInput` from stand-ins:

```js
// The sensor needs a page and a phone. These tests give TiltInput stand-ins that remember their
// listeners, and send them readings by hand.
QUnit.module("TiltInput", () => {
  class FakeTarget {
    constructor() {
      this.listeners = {};
    }
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
    removeEventListener(type) {
      delete this.listeners[type];
    }
    send(beta, gamma) {
      if (this.listeners.deviceorientation) this.listeners.deviceorientation({ beta, gamma });
    }
  }

  const make = ({ OrientationEvent = {}, secure = true, angle = 0 } = {}) => {
    const target = new FakeTarget();
    const state = { angle };
    const input = new TiltInput({ target, orientationAngle: () => state.angle, OrientationEvent, secure });
    return { target, input, state };
  };

  // A phone held a little back, as it is when it is looked at: tipped upright.
  const HELD = { beta: 60, gamma: 0 };
  const ready = async (options) => {
    const made = make(options);
    await made.input.enable();
    made.target.send(HELD.beta, HELD.gamma);
    return made;
  };

  QUnit.test("it starts off, with no stick", (assert) => {
    const { input } = make();

    assert.equal(input.state, "off");
    assert.false(input.active);
    assert.deepEqual(input.stick, { x: 0, y: 0 });
  });

  QUnit.test("every state has a message", (assert) => {
    for (const state of ["off", "asking", "waiting", "ready", "denied", "unsupported", "insecure"]) {
      assert.equal(typeof TILT_MESSAGES[state], "string", state);
    }
  });

  QUnit.test("a page that isn't served securely is told so, and doesn't listen", async (assert) => {
    const { target, input } = make({ secure: false });

    assert.equal(await input.enable(), "insecure");
    assert.equal(input.state, "insecure");
    assert.false(input.active);
    assert.equal(target.listeners.deviceorientation, undefined);
  });

  QUnit.test("a browser without the sensor events is unsupported", async (assert) => {
    const { input } = make({ OrientationEvent: null });

    assert.equal(await input.enable(), "unsupported");
  });

  QUnit.test("most phones need no permission: it listens straight away", async (assert) => {
    const { target, input } = make();

    assert.equal(await input.enable(), "waiting");
    assert.true(input.active);
    assert.equal(typeof target.listeners.deviceorientation, "function");
  });

  QUnit.test("an iPhone asks first, and listens once allowed", async (assert) => {
    let asked = 0;
    const { target, input } = make({ OrientationEvent: { requestPermission: async () => (++asked, "granted") } });

    const result = input.enable();
    assert.equal(input.state, "asking", "while the question is up");
    assert.true(input.active);
    assert.equal(target.listeners.deviceorientation, undefined, "not listening yet");

    assert.equal(await result, "waiting");
    assert.equal(asked, 1);
    assert.equal(typeof target.listeners.deviceorientation, "function");
  });

  QUnit.test("an iPhone that is refused does not listen", async (assert) => {
    const { target, input } = make({ OrientationEvent: { requestPermission: async () => "denied" } });

    assert.equal(await input.enable(), "denied");
    assert.false(input.active);
    assert.equal(target.listeners.deviceorientation, undefined);
  });

  QUnit.test("a permission request that throws counts as refused", async (assert) => {
    const { input } = make({ OrientationEvent: { requestPermission: async () => { throw new Error("not from a tap"); } } });

    assert.equal(await input.enable(), "denied");
  });

  QUnit.test("switching off while the question is up stays off", async (assert) => {
    let answer;
    const { target, input } = make({ OrientationEvent: { requestPermission: () => new Promise((resolve) => (answer = resolve)) } });

    const result = input.enable();
    input.disable();
    answer("granted");

    assert.equal(await result, "off");
    assert.equal(input.state, "off");
    assert.equal(target.listeners.deviceorientation, undefined);
  });

  QUnit.test("asking again while it is on does nothing", async (assert) => {
    let asked = 0;
    const { input } = make({ OrientationEvent: { requestPermission: async () => (++asked, "granted") } });

    await input.enable();
    await input.enable();

    assert.equal(asked, 1);
  });
});
```

Open `tests.html`. You should see **208 passing tests**: ten more.

### 2b. Hearing the sensor, and what it says

Now the readings. Add these four members **inside** the `TiltInput` class in [tilt.js](./js/tilt.js), above its closing `}` (below `disable`):

```js
  // A reading from the sensor.
  hear(event) {
    // A computer's browser has the event but no sensor, and sends one reading with nothing in it.
    if (event.beta == null || event.gamma == null) {
      if (this.state === "waiting") {
        this.target.removeEventListener("deviceorientation", this.listener);
        this.state = "unsupported";
      }
      return;
    }
    this.reading = { beta: event.beta, gamma: event.gamma };
    if (!this.neutral) this.neutral = { ...this.reading }; // the way it was first held is level, until told otherwise
    this.state = "ready";
  }

  // Say that the phone is level the way it is held now. If nothing has been heard yet, the first reading will be.
  calibrate() {
    this.neutral = this.reading ? { ...this.reading } : null;
  }

  // How far the phone is tipped from level, in degrees, as seen on the screen.
  get tilt() {
    if (!this.reading || !this.neutral) return { x: 0, y: 0 };
    const inPhone = {
      x: wrapDegrees(this.reading.gamma - this.neutral.gamma), // right edge down
      y: -wrapDegrees(this.reading.beta - this.neutral.beta), // beta grows as the top goes up, so the top going down is minus
    };
    return screenTilt(inPhone, this.orientationAngle());
  }

  // The stick the tilt is asking for now, before easing.
  get aim() {
    return this.state === "ready" ? tiltToStick(this.tilt) : { x: 0, y: 0 };
  }
```

Things to notice:

- **The empty reading** is only the answer "no sensor" while the page is *waiting* for its first reading. An empty one after real ones is ignored, so a hiccup doesn't turn tilt off.
- **The first real reading is level.** Nobody holds a phone flat on a table to play; they hold it at an angle that suits them, and that angle is the middle until they say otherwise. `calibrate` says it again at any moment (the **Set level** button calls it), and if nothing has been heard yet the first reading will be the one.
- **The neutral is kept in the phone's frame, not the screen's.** Readings and neutral are both subtracted in the phone's frame, and *then* the result is turned to the screen's. (Subtracting after turning would give nonsense the moment the screen turned.) That is the order in `tilt`.
- **`beta`'s sign is flipped there**: `y: -wrapDegrees(...)`, the one line that makes "bottom edge down" roll toward you.
- **`aim` is a getter with no memory**: just the stick the tilt asks for *now*. The eased value comes next.

### Tests

The `TiltInput` module was closed with `});` at the bottom of the last block. **Don't add these after that line:** they use `make` and `ready`, which only exist inside the module. Put them **above** the module's final `});`, directly below the last test you have (a blank line between):

```js
  QUnit.test("a computer's one empty reading means there is no sensor", async (assert) => {
    const { target, input } = make();
    await input.enable();

    target.send(null, null);

    assert.equal(input.state, "unsupported");
    assert.false(input.active);
    assert.equal(target.listeners.deviceorientation, undefined);
  });

  QUnit.test("the first real reading makes it ready, and is the level", async (assert) => {
    const { target, input } = make();
    await input.enable();
    assert.equal(input.state, "waiting");

    target.send(HELD.beta, HELD.gamma);

    assert.equal(input.state, "ready");
    assert.deepEqual(input.tilt, { x: 0, y: 0 });
    assert.deepEqual(input.aim, { x: 0, y: 0 });
  });

  QUnit.test("an empty reading after real ones is ignored", async (assert) => {
    const { target, input } = await ready();

    target.send(null, null);

    assert.equal(input.state, "ready");
  });

  QUnit.test("the right edge going down is a tilt to the right", async (assert) => {
    const { target, input } = await ready();

    target.send(HELD.beta, HELD.gamma + 10);

    assert.deepEqual(input.tilt, { x: 10, y: 0 });
  });

  QUnit.test("the bottom edge going down is a tilt down the screen, and the top edge going down is up it", async (assert) => {
    const { target, input } = await ready();

    // beta grows as the top edge rises, which lowers the bottom edge: the marble rolls down the screen.
    target.send(HELD.beta + 10, HELD.gamma);
    assert.deepEqual(input.tilt, { x: 0, y: -10 });

    // And the top edge going down, which lowers the far side, rolls it up the screen.
    target.send(HELD.beta - 10, HELD.gamma);
    assert.deepEqual(input.tilt, { x: 0, y: 10 });
  });

  QUnit.test("a screen on its side turns the tilt with it", async (assert) => {
    const { target, input, state } = await ready();
    target.send(HELD.beta, HELD.gamma + 10); // the phone's right edge down

    state.angle = 90;

    assert.true(Math.abs(input.tilt.x) < 1e-9 && Math.abs(input.tilt.y - 10) < 1e-9, "up the screen");
  });

  QUnit.test("a turn through the end of beta's range is a small tilt, not a huge one", async (assert) => {
    const { target, input } = make();
    await input.enable();
    target.send(179, 0);

    target.send(-179, 0);

    assert.true(Math.abs(input.tilt.y - -2) < 1e-9, `got ${input.tilt.y}`); // beta went up by 2, so the bottom edge went down
  });

  QUnit.test("the aim is nothing while level, and a stick when tipped", async (assert) => {
    const { target, input } = await ready();
    target.send(HELD.beta, HELD.gamma + 1);
    assert.deepEqual(input.aim, { x: 0, y: 0 }, "inside the dead zone");

    target.send(HELD.beta, HELD.gamma + TILT_MAX_ANGLE);
    assert.true(Math.abs(input.aim.x - 1) < 1e-9);
    assert.true(Math.abs(input.aim.y) < 1e-9);
  });

  QUnit.test("calibrating makes the way it is held now level", async (assert) => {
    const { target, input } = await ready();
    target.send(HELD.beta + 15, HELD.gamma + 10);
    assert.true(input.aim.x > 0);

    input.calibrate();

    assert.deepEqual(input.tilt, { x: 0, y: 0 });
    assert.deepEqual(input.aim, { x: 0, y: 0 });
    target.send(HELD.beta + 15, HELD.gamma + 20);
    assert.deepEqual(input.tilt, { x: 10, y: 0 }, "and tilts are measured from there");
  });

  QUnit.test("calibrating before anything is heard makes the first reading level", async (assert) => {
    const { target, input } = make();
    await input.enable();

    input.calibrate();
    target.send(30, 5);

    assert.deepEqual(input.tilt, { x: 0, y: 0 });
  });
```

Open `tests.html`. You should see **218 passing tests**: ten more.

### 2c. Easing, every frame

The last method. Add it **inside** the class, above its closing `}`, below `aim`:

```js
  // Ease `stick` toward `aim`. Called once a frame.
  update(dt) {
    this.stick = smoothStick(this.stick, this.aim, TILT_SMOOTHING, dt);
  }
```

It is called once a frame by the game. `aim` is where the stick wants to be, and `stick` is where it is, a share of the way there. Until the first reading arrives `aim` is nothing, so `stick` stays nothing, and the game can add it to the keyboard and the thumb all the time without asking whether tilt is on.

### Tests

Again, **above** the module's final `});`, directly below the last test:

```js
  QUnit.test("the stick eases toward the aim, and doesn't jump", async (assert) => {
    const { target, input } = await ready();
    target.send(HELD.beta, HELD.gamma + TILT_MAX_ANGLE);

    input.update(1 / 60);
    const first = input.stick.x;
    assert.true(first > 0 && first < 1, "part of the way");

    input.update(1 / 60);
    assert.true(input.stick.x > first, "and further the next frame");

    for (let i = 0; i < 120; i++) input.update(1 / 60);
    assert.true(input.stick.x > 0.999, "and all the way in the end");
  });

  QUnit.test("the stick eases back to nothing when the phone is levelled", async (assert) => {
    const { target, input } = await ready();
    target.send(HELD.beta, HELD.gamma + TILT_MAX_ANGLE);
    for (let i = 0; i < 120; i++) input.update(1 / 60);

    target.send(HELD.beta, HELD.gamma);
    for (let i = 0; i < 120; i++) input.update(1 / 60);

    assert.true(Math.abs(input.stick.x) < 0.001);
  });

  QUnit.test("before it is ready there is no stick, however long it is updated", async (assert) => {
    const { input } = make();
    await input.enable();

    for (let i = 0; i < 10; i++) input.update(1 / 60);

    assert.deepEqual(input.stick, { x: 0, y: 0 });
  });

  QUnit.test("switching off forgets everything and stops listening", async (assert) => {
    const { target, input } = await ready();
    target.send(HELD.beta, HELD.gamma + TILT_MAX_ANGLE);
    input.update(0.5);
    assert.true(input.stick.x > 0);

    input.disable();

    assert.equal(input.state, "off");
    assert.false(input.active);
    assert.deepEqual(input.stick, { x: 0, y: 0 });
    assert.equal(target.listeners.deviceorientation, undefined);
  });

  QUnit.test("switching on again starts fresh: the way it is held then is level", async (assert) => {
    const { target, input } = await ready();
    input.disable();

    await input.enable();
    target.send(10, 40);

    assert.equal(input.state, "ready");
    assert.deepEqual(input.tilt, { x: 0, y: 0 });
  });
```

Open `tests.html`. You should see **223 passing tests**: five more.

---

## Step 3: The page

Tilt has to be asked for, and has to say what it is doing, and it helps to *see* the tilt. The panel and the gauge go in `index.html`, directly below the `<p class="touch-hint">` line:

```html
  <div id="tilt-panel">
    <button id="tilt-toggle" class="hazard" type="button">Tilt: off</button>
    <button id="tilt-level" class="hazard hidden" type="button">Set level</button>
    <p id="tilt-status"></p>
  </div>
  <div id="tilt-gauge" class="hidden"><div id="tilt-dot"></div></div>
```

**Don't skip this one:** the new script tag goes in the list at the **bottom of `<body>`**, below `controls.js`. Without it, `main.js` stops at `ReferenceError: TiltInput is not defined` when the page loads (Step 4 uses the class):

```html
  <script src="js/tilt.js"></script>
```

Things to notice:

- **A button to switch it on.** Tilt isn't on by itself, because on an iPhone it can't be: the permission question only appears for a page that asks because of a tap.
- **A "Set level" button**, hidden until tilt is working (the `hidden` class is for the game to toggle, and the stylesheet decides what it means).
- **A line of words** for the state. It is empty in the page and filled from `TILT_MESSAGES` by the game.
- **A gauge**: a ring with a dot, shown while tilt is working, like the thumb's ring and knob. It is how a player sees whether the dead zone is hiding their tilt, and how a developer sees the sensor is working without the marble.

Now the style. Add this to the bottom of `css/game.css`:

```css
/* Tilt. The buttons and a line saying what tilt is doing, below the back button, and a gauge
   that shows the tilt as a dot. Only on a screen that is touched with a finger: a phone is
   the one that has a tilt sensor. */
#tilt-panel {
  display: none;
  position: fixed;
  left: 12px;
  top: 58px;
  z-index: 20;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  max-width: min(60vw, 360px);
}
#tilt-panel .hidden,
#tilt-gauge.hidden {
  display: none;
}
#tilt-status {
  margin: 0;
  color: var(--chrome);
  font: 600 18px/1.2 var(--small-font);
  letter-spacing: 0.04em;
  text-shadow: 0 1px 3px var(--ink);
  pointer-events: none;
}
#tilt-gauge {
  position: fixed;
  left: 50%;
  bottom: 14px;
  z-index: 15;
  width: 72px;
  height: 72px;
  margin-left: -36px;
  border: 4px solid rgba(246, 191, 14, 0.75);
  border-radius: 50%;
  background: rgba(11, 9, 9, 0.25);
  pointer-events: none;
}
#tilt-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border: 3px solid var(--ink);
  border-radius: 50%;
  background: var(--yellow);
}
@media (pointer: coarse) {
  #tilt-panel {
    display: flex;
  }
}
```

Things to notice:

- **The panel is only there on a screen touched with a finger** (`@media (pointer: coarse)`), because a phone is what has a sensor. Chrome's device mode counts as one, so you can still see it on a computer.
- **The panel sits under the back button**, top left, away from where the thumb steers and from the *Drop again* button, and the gauge sits at the bottom in the middle.
- **`pointer-events: none` on the words and the gauge**, so a touch on them still reaches the canvas.

---

## Step 4: Wiring it up

Now `js/main.js`, three small changes.

### 4a. The tilt, and its words

Directly above the comment `// Rolling again`, add:

```js
  // And a third kind of stick: the tilt of the phone. It starts off, because it has to be asked
  // for (see below), and has a button, a line of words about how it is going, and a gauge.
  const tilt = new TiltInput();
  const tiltToggle = document.getElementById("tilt-toggle");
  const tiltLevel = document.getElementById("tilt-level");
  const tiltStatus = document.getElementById("tilt-status");
  const tiltGauge = document.getElementById("tilt-gauge");
  const tiltDot = document.getElementById("tilt-dot");

  // Make the words and buttons say what tilt is doing. The state changes when the player answers a
  // question, when the first reading arrives, and when there is no sensor, so this is run every frame.
  let shownState = null;
  const showTiltState = () => {
    if (tilt.state === shownState) return;
    shownState = tilt.state;
    tiltToggle.textContent = tilt.active ? "Tilt: on" : "Tilt: off";
    tiltLevel.classList.toggle("hidden", tilt.state !== "ready");
    tiltGauge.classList.toggle("hidden", tilt.state !== "ready");
    tiltStatus.textContent = TILT_MESSAGES[tilt.state];
  };
  showTiltState();
```

Things to notice:

- **`new TiltInput()` takes no arguments:** the real window, the real screen and the real `DeviceOrientationEvent` are its defaults.
- **`showTiltState` only does anything when the state has changed.** It writes to the page, which is slower than looking at a string, and it is called every frame. (The state can change at any time: when the player answers a question, when the first reading arrives, when a computer's empty reading says there's no sensor.)
- **The buttons and the gauge follow the state**, not the other way round: nothing else decides whether *Set level* shows.

### 4b. The buttons

Directly below it, above `// Rolling again`, add:

```js
  // It must be switched on from a tap: an iPhone only asks the player for permission to use the
  // sensors when a page asks because of one.
  tiltToggle.addEventListener("click", async () => {
    tiltToggle.blur();
    if (tilt.active) tilt.disable();
    else await tilt.enable();
  });
  tiltLevel.addEventListener("click", () => {
    tiltLevel.blur();
    tilt.calibrate();
  });
  // Turning the phone on its side changes how it is held, so what was level isn't any more.
  if (screen.orientation) screen.orientation.addEventListener("change", () => tilt.calibrate());
```

Things to notice:

- **The click handler is `async` and goes straight to `enable`.** It must be *in* the tap. If the handler waited for something else first (a timer, a loaded file), an iPhone would no longer count it as being from the tap and would refuse.
- **`blur()`** takes focus off the button, as the *Drop again* button does, so the space bar and the arrow keys don't press it again.
- **Turning the phone on its side calls `calibrate`.** Someone who turns the phone is holding it differently, so what was level isn't any more, and without this the marble would roll away the moment the phone turned.

### 4c. Every frame

Replace the comment above the frame loop:

```js
  // Each frame: read the tilt, steer the marble, put it back if it fell off the course, keep the
  // sun over it, and ease the camera after it.
```

Directly below the `dt` line, **above** the comment about the stick, add:

```js
    // The tilt: ease its stick toward where the phone is tipped, keep the words and the gauge
    // up to date, and move the gauge's dot (18 pixels is as far as it can go from the middle).
    tilt.update(dt);
    showTiltState();
    tiltDot.style.transform = `translate(${tilt.stick.x * 18}px, ${-tilt.stick.y * 18}px)`;
```

and change the line that makes the stick, so it joins the third in:

```js
      const stick = combineSticks(combineSticks(keyboard.stick, thumb.value), tilt.stick);
```

Things to notice:

- **The tilt is eased every frame, and the stick it makes is added like the others.** `combineSticks` takes two sticks, so a third is one more call. A player who is tilting and also pressing a key, or touching, gets the sum, clamped to a full stick.
- **The tilt keeps being read before the splash has gone**, so the gauge is live, but the *push* still waits for `scene.physicsEnabled`, as before.
- **The dot's position is the stick**, in pixels. `y` is turned over again (a page's `y` grows downward), as in the thumb's knob.

---

## Step 5: Try it

Serve the page and open it. The keys still roll the marble. For tilt, use Chrome's **device mode** (**F12**, then **Ctrl+Shift+M**, choose a phone) so the page counts as a touch screen and the *Tilt* panel appears at the top left.

### On a computer, with Chrome's Sensors panel

Chrome can pretend to be a phone's sensor.

1. With device mode on, open the **Sensors** panel: in DevTools press **Ctrl+Shift+P**, type *Sensors*, and choose **Show Sensors**.
2. Under **Orientation**, choose **Custom orientation**. A set of `alpha`, `beta` and `gamma` boxes appears (and a cube you can drag).
3. **Set it before you click *Tilt: off*.** With the orientation *Off*, Chrome on a computer sends the one empty reading, and the page says *This device has no tilt sensor*, which is correct, and a good test of that path.
4. Set `beta` to `60` and `gamma` to `0`, as if the phone were held upright, then click **Tilt: off**. It becomes **Tilt: on**, the words say *Tilt is on...*, and the gauge appears.
5. Change `gamma` to `25`: the dot moves right and the marble rolls right. Change `beta` to `35` (the top edge going down): the dot moves up and the marble rolls away from you, up the screen. Back to `60` and `0` is level.
6. Rotate the device in device mode (the rotate icon). The screen turns on its side, the panel settles on the new level, and a `gamma` change now rolls the marble the way the phone's right edge points *on the screen*.

### On a real phone

The page has to be **secure**. The live demo is, and so is any of these ways to reach your own copy:

- **Android and Chrome, with a USB cable.** Turn on *USB debugging* on the phone, open `chrome://inspect#devices` on the computer, and under *Port forwarding* forward the phone's port `3000` to `localhost:3000`. Then open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_tilt/` *on the phone*. To the phone that is `localhost`, which counts as secure.
- **A tunnel**, which gives your computer an `https://` address on the internet for as long as it runs: for example `npx localtunnel --port 3000`, or `cloudflared tunnel --url http://localhost:3000`, or `ngrok http 3000`. This works for an iPhone too. Remember that `npx serve` is serving the *whole repo folder*, so while the tunnel is up, anyone with the address can read it. Stop it when you have finished.
- **Your own certificate**, from a tool such as `mkcert`, and a server that uses it. The phone has to trust the certificate.

Then:

- [ ] On an iPhone, tapping **Tilt: off** shows the browser's *motion and orientation access* question. On Android it just turns on
- [ ] The words change to *Tilt is on. Hold the phone how you like, then Set level*, and the gauge appears
- [ ] The way you hold the phone when you turn it on is **level**: the marble doesn't creep
- [ ] **Tip the right edge down** and the marble rolls right. **Tip the bottom edge down** (the top edge up), and it rolls toward you, down the screen
- [ ] Tipping the phone **a little** does nothing (the dead zone), about **20 degrees** is full strength, and the dot in the gauge shows both
- [ ] The marble **eases** into a roll and doesn't judder with the sensor's jitter
- [ ] **Set level** makes the way you are holding the phone the new middle
- [ ] **Turn the phone on its side**: the tilt still rolls the marble toward the edge that goes down, on the screen, and the middle is where you are holding it
- [ ] **Tilt: on** switches it off again, and the marble stops responding and the gauge goes
- [ ] Keys and the thumb still work, together with tilt or without

**If something's wrong**

- **`ReferenceError: TiltInput is not defined` (from `main.js`), or `TILT_MESSAGES is not defined`:** `index.html` has no `<script src="js/tilt.js"></script>` (Step 3), or it is after `main.js`. It goes in the list at the bottom of `<body>`, between `controls.js` and `camera.js`. (The tests can still pass, since `tests.html` has its own list.)
- **The words say *Tilt needs the page to be served over https*:** the page isn't secure. A phone on your network can't use `http://192.168...`. See the ways above.
- **The words say *This device has no tilt sensor*:** on a computer, it is right. In device mode, set an orientation in the Sensors panel *before* clicking the button. On a real phone, check the browser's site settings for *Motion sensors*, and try another browser.
- **The words say *Motion access was refused*:** the player said no. Reload the page to be asked again. If an iPhone keeps refusing, close the browser completely and open the page again.
- **The words stay *Waiting for the tilt sensor*:** the browser hasn't sent a reading. On Android check *Site settings, Motion sensors* isn't blocked. In the Sensors panel, change a value.
- **On an iPhone, nothing is asked:** `enable` has to be called straight from the click. Check the handler doesn't `await` anything before it.
- **The marble rolls the opposite way from the tilt:** the sign of `beta` (`y: -wrapDegrees(...)`), or `screenTilt`'s sums. The tests on the right edge and the bottom edge should be failing.
- **It's right upright, but wrong on its side:** the order in `tilt` (subtract in the phone's frame, *then* turn), or `orientationAngle`. Log `screen.orientation.angle`.
- **The marble creeps when the phone is held still:** press **Set level**, or raise `TILT_DEAD_ZONE`.
- **`make is not defined` or `ready is not defined` in the tests, and the `TiltInput` tests fail while the others pass:** tests were added *after* the module's closing `});`. The file should end with one `});`, and every `TiltInput` test is above it.
- **The marble is jittery:** lower `TILT_SMOOTHING` (try `6`) to ease it more.
- **The marble rolls away when the screen turns:** `calibrate` isn't called when the orientation changes.

**Experiments** (change one, reload, then change it back):

- `TILT_MAX_ANGLE` of `10`: twitchy, a small tip is full speed. Of `40`: you have to tip the phone a long way
- `TILT_DEAD_ZONE` of `8`: a lot of the middle does nothing. Of `0`: the slightest wobble moves the marble
- `TILT_SMOOTHING` of `3`: the marble answers slowly, like a heavy tray. Of `60`: no easing at all
- In `tilt`, remove the minus in `y: -wrapDegrees(...)`: the marble rolls toward the edge that goes *up*
- In `main.js`, comment out the `screen.orientation` line: turn the phone and see what the old middle does

---

## Step 6: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/tilt.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/tilt.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **223 passing tests**: the 181 you started with, plus 17 for the rules of tilt and 25 for `TiltInput`.

> **What these tests don't cover.** They check the maths, the permission flow, the empty reading, the calibration and the easing, with a fake sensor. They can't tell you that tilt *feels* right: that 20 degrees is a comfortable reach, that the dead zone is the right size, or what a particular phone's sensor does. That check is Step 5, on a real phone.

> **Try breaking something.** In `screenTilt`, change the signs of the `sin` terms, so it returns `{ x: tilt.x * cos + tilt.y * sin, y: -tilt.x * sin + tilt.y * cos }`. The tests for a screen on its side fail, and the upright ones still pass, which is just what would happen on a real phone: right until it is turned. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| The phone's tilt as angles | `deviceorientation`, `beta` and `gamma` |
| Which edge went down | the sign of `beta` in `tilt` |
| Turning a reading by the screen's angle | `screenTilt`, `screen.orientation.angle` |
| An angle that wraps round | `wrapDegrees` |
| A dead zone and a maximum, in degrees | `tiltToStick` |
| Easing that doesn't depend on the frame rate | `smoothStick` |
| Asking permission from a tap | `requestPermission` in `enable` |
| A page that isn't allowed the sensor | `secure`, `window.isSecureContext` |
| Finding out there is no sensor | the empty first reading |
| Calibrating: what "level" is | `neutral`, `calibrate`, *Set level* |
| Every failure as a sentence on the screen | `TILT_MESSAGES` |
| Testing hardware without the hardware | injected stand-ins, a fake target |

## Challenges

1. **Remember the choice.** If the player had tilt on last time, switch it on at the start. (Hint: `localStorage`, but an iPhone still needs a tap for the permission, so what can the page do at the start?)
2. **A sensitivity setting.** Let the player choose how far they have to tip: a slider for `TILT_MAX_ANGLE`. (Hint: `tiltToStick` already takes `max` and `deadZone` as arguments. Where would a number from a slider live?)
3. **Shake to level.** Calling `calibrate` when the phone is shaken. (Hint: `DeviceMotionEvent`, and how hard the acceleration is.)
4. **A buzz on landing.** `navigator.vibrate(30)` when the marble lands after a fall, where the browser has it. (Hint: `grounded` turning from false to true.)
5. **Show the angle.** Add the tilt, in degrees, to the gauge. (Hint: `tilt.tilt` is already in degrees on the screen.)

---
