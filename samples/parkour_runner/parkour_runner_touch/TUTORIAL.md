# Tutorial: Parkour Runner Touch -- Swipes and a Phone-Sized Game

This is the ninth and last tutorial in the Parkour Runner series. The game looks good, sounds good and has its screens, but it can only be played with a keyboard. In this step it learns to be played with a thumb. **Swipe** left or right to change lane, up to jump or vault, down to slide, and **tap** to jump. It gets an on-screen **pause button**, hints about swipes in place of hints about keys, a camera that keeps all three lanes in view on a phone held **upright**, and a layout that fits a small screen. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Swipe and tap controls** that make the same moves the keys make, from one shared set of moves
- A **swipe detector** whose rules are plain numbers, so they can be tested without a screen
- An **on-screen pause button** and hints that fit a touch screen
- A **camera** that adapts to the shape of the screen, so a phone held upright still shows the side lanes
- A **HUD** and **screens** that scale down to a small screen and stay readable
- Unit tests for all of it

**What you'll learn:** pointer events (and why they beat touch events), recognising a swipe and a tap from raw finger movement, ignoring a second finger and the mouse, sharing one set of actions between two kinds of input, detecting a touch screen, the viewport meta tag, preventing the page from scrolling and zooming under your finger, vertical and horizontal fields of view, responsive CSS, and testing on a phone-sized screen from a desktop browser.

## Where you're starting

This folder is a copy of the finished Effects sample, plus an empty placeholder file for the new code and its tests:

```
parkour_runner_touch/
├── index.html, tests.html
├── css/
│   └── game.css            (changes -- Step 4)
├── js/
│   ├── touch.js            (placeholder -- Steps 1 and 2)
│   ├── camera.js           (grows -- Step 3)
│   ├── screens.js          (changes -- Step 4)
│   ├── hud.js              (changes -- Step 4)
│   ├── main.js             (changes -- Step 5)
│   └── sounds.js, effects.js, particles.js, and the rest    (from the Effects sample)
└── tests/
    ├── touch.tests.js      (placeholder)
    └── camera / screens / hud .tests.js grow, and the rest    (from the Effects sample)
```

### You need a web server for this one

As before, the models can't be loaded from a page opened from a file. Run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/parkour_runner/parkour_runner_touch/` (the command prints the exact address), or use the *Live Server* extension in VS Code. (`tests.html` loads no models and works from a file.)

### You don't need a phone to test it

Chrome (and Edge) can pretend to be one. Open the page, press **F12**, then **Ctrl+Shift+M** (the *device toolbar*), and choose a phone from the list at the top. The page reloads as that phone, with the right size, a touch pointer and a mobile browser's behavior. Your mouse then acts as a finger: drag to swipe, click to tap. You can turn the phone on its side with the rotate button. This tutorial calls that **device mode**.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Effects sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**476**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away, and later steps tell you to add methods *inside* it, above its closing `}`. Files that other files depend on end with a short block that exports their names; the tutorial shows that block when a file is created, and shows the new version whenever a step adds or removes a name. That way every file is valid JavaScript after every step.

---

## Step 1: Recognising a swipe

A finger gives you three kinds of event: it **goes down**, it **moves**, it **comes up**. A swipe is not an event. It is what *you* decide a down, some moves and an up add up to. So the rules of what a swipe is go in a class of their own, which is told where a finger is and when, and says what it decided. It never looks at a screen, so it can be tested without one.

Open the placeholder `js/touch.js` and replace its contents with:

```js
// Touch controls: swipes and taps on the picture. The rules (how far a finger must move to
// be a swipe, which way it went, what counts as a tap) are plain numbers and functions in
// `SwipeDetector`, so they can be tested without a screen. `TouchControls` is the thin
// part that listens to the page and feeds the detector. See ../tests/touch.tests.js.

const SWIPE_MIN = 24; // the shortest swipe, in pixels, however small the screen
const SWIPE_FRACTION = 0.06; // and a swipe is at least this much of the screen's smaller side
const TAP_MAX_MOVE = 12; // a finger that moves more than this isn't a tap
const TAP_MAX_TIME = 250; // and neither is one that stays down longer than this, in milliseconds

// How far a finger must travel to count as a swipe on a screen this size. It scales with the
// screen, so it takes the same small flick on a tablet as on a phone, and has a floor so a
// tiny window doesn't turn every touch into a swipe.
function swipeDistanceFor(width, height) {
  return Math.max(SWIPE_MIN, Math.min(width, height) * SWIPE_FRACTION);
}

// Which way a finger moved, as "left", "right", "up" or "down", or null if it didn't.
// The longer of the two directions wins; on screen, y grows downward.
function directionOf(dx, dy) {
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "up" : "down";
}

// What each swipe makes the runner do: the same moves the keys make.
const SWIPE_MOVES = { left: "left", right: "right", up: "jump", down: "slide" };

// The move for a swipe, or null if it isn't one.
function swipeMove(direction) {
  return SWIPE_MOVES[direction] || null;
}

// Whether the screen is one you touch. Most of its answer comes from "coarse" pointers: a
// finger is a coarse pointer and a mouse is a fine one, so a laptop with a touch screen
// (and a mouse) says no. Without `matchMedia` it falls back on whether there are touch points.
function isTouchDevice({ maxTouchPoints = 0, matchMedia = null } = {}) {
  if (matchMedia) return matchMedia("(pointer: coarse)").matches;
  return maxTouchPoints > 0;
}

// The browser's answer, for the game to use.
function browserTouchEnvironment() {
  return {
    maxTouchPoints: typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
    matchMedia: typeof window !== "undefined" && window.matchMedia ? (query) => window.matchMedia(query) : null,
  };
}

// Follows one finger and says when it has swiped or tapped. It never looks at the screen:
// it is told where the finger is and when.
class SwipeDetector {
  constructor({ distance = SWIPE_MIN } = {}) {
    this.distance = distance; // how far counts as a swipe
    this.id = null; // the finger being followed (a second finger is ignored)
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.swipes = 0; // how many swipes this touch has made so far: 0 or 1
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SWIPE_MIN, SWIPE_FRACTION, TAP_MAX_MOVE, TAP_MAX_TIME, SWIPE_MOVES, swipeDistanceFor, directionOf, swipeMove, isTouchDevice, browserTouchEnvironment, SwipeDetector };
} else {
  Object.assign(window, { SWIPE_MIN, SWIPE_FRACTION, TAP_MAX_MOVE, TAP_MAX_TIME, SWIPE_MOVES, swipeDistanceFor, directionOf, swipeMove, isTouchDevice, browserTouchEnvironment, SwipeDetector });
}
```

Things to notice:

- **A swipe's length scales with the screen.** `swipeDistanceFor` is 6% of the screen's smaller side, so a flick feels the same on a phone and a tablet, but never less than 24 pixels (`SWIPE_MIN`), or a small window would turn every touch into a swipe.
- **`directionOf` picks the longer way.** A finger that went 40 pixels left and 10 down swiped *left*. On a screen `y` grows *downward*, so a negative `dy` is up. A tie goes to the sideways way.
- **`SWIPE_MOVES` is the same move table as the keys,** as data: a swipe left is the move `left`, up is `jump`, down is `slide`. `swipeMove` looks one up, and gives `null` for anything that isn't a swipe.
- **`isTouchDevice` asks about the pointer, not the screen.** A finger is a *coarse* pointer and a mouse is a *fine* one. A laptop with a touch screen and a mouse says no, which is right: its player has a keyboard. The check is passed in (`matchMedia`) so tests can pass in their own.
- **`browserTouchEnvironment` is the real answer,** with every use of `navigator` and `window` guarded, so the file loads in the Node test runner too.
- The class is closed already. It is told about a finger and says what happened.

Add these methods **inside the class**, directly above its closing `}`:

```js
  // Whether a finger is being followed.
  get active() {
    return this.id !== null;
  }

  // A finger has touched down. Only one is followed at a time, so a second finger is
  // ignored. Says whether this one is the one.
  start(id, x, y, time) {
    if (this.active) return false;
    this.id = id;
    this.startX = x;
    this.startY = y;
    this.startTime = time;
    this.swipes = 0;
    return true;
  }

  // The finger has moved. Returns a direction the moment it has gone far enough, and null
  // until then. A touch makes one swipe: the rest of a long drag does nothing, or one
  // flick across the screen would change lane three times. Lift the finger and swipe again.
  move(id, x, y) {
    if (id !== this.id || this.swipes > 0) return null;
    const dx = x - this.startX;
    const dy = y - this.startY;
    if (Math.hypot(dx, dy) < this.distance) return null;
    this.swipes++;
    return directionOf(dx, dy);
  }

  // The finger has lifted. Returns "tap" if it was a quick touch that hardly moved, and
  // never made a swipe, and null otherwise. Either way it is no longer followed.
  end(id, x, y, time) {
    if (id !== this.id) return null;
    const moved = Math.hypot(x - this.startX, y - this.startY);
    const quick = time - this.startTime <= TAP_MAX_TIME;
    const tap = this.swipes === 0 && moved <= TAP_MAX_MOVE && quick;
    this.cancel();
    return tap ? "tap" : null;
  }

  // Lets go of the finger without saying anything (the browser took the touch away).
  cancel() {
    this.id = null;
    this.swipes = 0;
  }
```

Things to notice:

- **Only one finger is followed.** `start` says whether this finger is *the* finger. A second finger, from a thumb resting on the screen while another swipes, is ignored for the whole touch: `move` and `end` check that they are about the finger that is being followed.
- **A swipe is recognised while the finger is still moving,** not when it lifts. `move` returns a direction the moment the finger has gone far enough, so the runner changes lane while the thumb is still going. Waiting for the finger to lift would make every move feel late.
- **A touch makes one swipe.** After a swipe, `move` returns `null` for the rest of the touch. Without that, one long flick across the screen would swipe again every 24 pixels and change lane three times. To do it again, lift the thumb.
- **A tap is the opposite of a swipe:** it has to be quick (`TAP_MAX_TIME`, a quarter of a second), hardly moved (`TAP_MAX_MOVE`), and never swiped. A finger that wandered a bit but not far enough to swipe is neither.
- **`cancel` lets go without saying anything.** The browser can take a touch away (an incoming call, a gesture it wants to handle), and then no swipe or tap should happen.

### 1a. Tests

Replace the placeholder `tests/touch.tests.js` with the first part of its tests:

```js
QUnit.module("swipeDistanceFor", () => {
  QUnit.test("is a fraction of the screen's smaller side", (assert) => {
    assert.true(Math.abs(swipeDistanceFor(1000, 600) - 600 * SWIPE_FRACTION) < 1e-9);
    assert.true(Math.abs(swipeDistanceFor(600, 1000) - 600 * SWIPE_FRACTION) < 1e-9);
  });

  QUnit.test("is the same small flick on a bigger screen, in proportion", (assert) => {
    assert.true(swipeDistanceFor(2000, 1200) > swipeDistanceFor(1000, 600));
  });

  QUnit.test("never goes below SWIPE_MIN, however small the screen", (assert) => {
    assert.strictEqual(swipeDistanceFor(100, 100), SWIPE_MIN);
    assert.strictEqual(swipeDistanceFor(0, 0), SWIPE_MIN);
  });
});

QUnit.module("directionOf", () => {
  QUnit.test("names the four directions, with y growing downward on the screen", (assert) => {
    assert.strictEqual(directionOf(-40, 0), "left");
    assert.strictEqual(directionOf(40, 0), "right");
    assert.strictEqual(directionOf(0, -40), "up");
    assert.strictEqual(directionOf(0, 40), "down");
  });

  QUnit.test("the longer way wins", (assert) => {
    assert.strictEqual(directionOf(-40, 10), "left");
    assert.strictEqual(directionOf(10, -40), "up");
    assert.strictEqual(directionOf(30, 31), "down");
  });

  QUnit.test("a tie goes to the sideways way", (assert) => {
    assert.strictEqual(directionOf(20, 20), "right");
    assert.strictEqual(directionOf(-20, -20), "left");
  });

  QUnit.test("no movement is no direction", (assert) => {
    assert.strictEqual(directionOf(0, 0), null);
  });
});

QUnit.module("swipeMove", () => {
  QUnit.test("each swipe makes the move its key makes: sideways changes lane, up jumps, down slides", (assert) => {
    assert.strictEqual(swipeMove("left"), "left");
    assert.strictEqual(swipeMove("right"), "right");
    assert.strictEqual(swipeMove("up"), "jump");
    assert.strictEqual(swipeMove("down"), "slide");
  });

  QUnit.test("something that isn't a swipe is no move", (assert) => {
    assert.strictEqual(swipeMove("tap"), null);
    assert.strictEqual(swipeMove(null), null);
  });
});

QUnit.module("isTouchDevice", () => {
  const media = (coarse) => (query) => ({ matches: query === "(pointer: coarse)" && coarse });

  QUnit.test("a screen whose main pointer is coarse (a finger) is a touch screen", (assert) => {
    assert.true(isTouchDevice({ matchMedia: media(true), maxTouchPoints: 0 }));
  });

  QUnit.test("a fine pointer (a mouse) isn't, even if there is a touch screen as well", (assert) => {
    assert.false(isTouchDevice({ matchMedia: media(false), maxTouchPoints: 10 }));
  });

  QUnit.test("with no matchMedia, it counts the touch points", (assert) => {
    assert.true(isTouchDevice({ maxTouchPoints: 5 }));
    assert.false(isTouchDevice({ maxTouchPoints: 0 }));
  });

  QUnit.test("with nothing to go on, it isn't", (assert) => {
    assert.false(isTouchDevice({}));
    assert.false(isTouchDevice());
  });

  QUnit.test("it asks about a coarse pointer", (assert) => {
    const asked = [];

    isTouchDevice({ matchMedia: (query) => (asked.push(query), { matches: false }) });

    assert.deepEqual(asked, ["(pointer: coarse)"]);
  });
});

QUnit.module("SwipeDetector", () => {
  const detector = (distance = 30) => new SwipeDetector({ distance });

  QUnit.test("isn't following a finger to begin with", (assert) => {
    assert.false(detector().active);
  });

  QUnit.test("start() follows a finger", (assert) => {
    const d = detector();

    assert.true(d.start(1, 100, 100, 0));

    assert.true(d.active);
  });

  QUnit.test("a second finger is ignored while the first is down", (assert) => {
    const d = detector();
    d.start(1, 100, 100, 0);

    assert.false(d.start(2, 200, 200, 10));
    assert.strictEqual(d.move(2, 300, 100), null);
    assert.strictEqual(d.end(2, 300, 100, 20), null);
    assert.true(d.active, "the first finger is still the one");
  });

  QUnit.test("a move shorter than the distance is no swipe yet", (assert) => {
    const d = detector(30);
    d.start(1, 100, 100, 0);

    assert.strictEqual(d.move(1, 120, 105), null);
  });

  QUnit.test("a move that reaches the distance is a swipe, the moment it does, without waiting for the finger to lift", (assert) => {
    const d = detector(30);
    d.start(1, 100, 100, 0);

    assert.strictEqual(d.move(1, 130, 100), "right");
  });

  QUnit.test("swipes go every way", (assert) => {
    const way = (x, y) => {
      const d = detector(30);
      d.start(1, 100, 100, 0);
      return d.move(1, x, y);
    };

    assert.strictEqual(way(60, 100), "left");
    assert.strictEqual(way(140, 100), "right");
    assert.strictEqual(way(100, 60), "up");
    assert.strictEqual(way(100, 140), "down");
  });

  QUnit.test("a touch makes one swipe: the rest of a long drag does nothing", (assert) => {
    const d = detector(30);
    d.start(1, 100, 100, 0);

    assert.strictEqual(d.move(1, 140, 100), "right");
    assert.strictEqual(d.move(1, 200, 100), null, "still going the same way");
    assert.strictEqual(d.move(1, 200, 200), null, "or turning");
  });

  QUnit.test("after the finger lifts, the next touch can swipe again", (assert) => {
    const d = detector(30);
    d.start(1, 100, 100, 0);
    d.move(1, 140, 100);
    d.end(1, 140, 100, 50);

    d.start(2, 100, 100, 100);

    assert.strictEqual(d.move(2, 60, 100), "left");
  });

  QUnit.test("a swipe isn't also a tap when the finger lifts", (assert) => {
    const d = detector(30);
    d.start(1, 100, 100, 0);
    d.move(1, 140, 100);

    assert.strictEqual(d.end(1, 140, 100, 100), null);
  });

  QUnit.test("a quick touch that hardly moves is a tap", (assert) => {
    const d = detector(30);
    d.start(1, 100, 100, 1000);

    assert.strictEqual(d.end(1, 104, 98, 1100), "tap");
  });

  QUnit.test("a touch held too long isn't a tap", (assert) => {
    const d = detector(30);
    d.start(1, 100, 100, 1000);

    assert.strictEqual(d.end(1, 100, 100, 1000 + TAP_MAX_TIME + 1), null);
  });

  QUnit.test("a touch that wandered too far isn't a tap, even though it wasn't a swipe", (assert) => {
    const d = detector(60);
    d.start(1, 100, 100, 0);
    d.move(1, 100 + TAP_MAX_MOVE + 5, 100); // not far enough for a swipe

    assert.strictEqual(d.end(1, 100 + TAP_MAX_MOVE + 5, 100, 50), null);
  });

  QUnit.test("end() lets go of the finger, and the next touch is followed", (assert) => {
    const d = detector();
    d.start(1, 0, 0, 0);

    d.end(1, 0, 0, 10);

    assert.false(d.active);
    assert.true(d.start(2, 5, 5, 20));
  });

  QUnit.test("cancel() lets go without saying anything", (assert) => {
    const d = detector();
    d.start(1, 0, 0, 0);

    d.cancel();

    assert.false(d.active);
    assert.strictEqual(d.move(1, 100, 0), null);
  });

  QUnit.test("a move or lift from a finger that isn't being followed does nothing", (assert) => {
    const d = detector();

    assert.strictEqual(d.move(9, 100, 0), null);
    assert.strictEqual(d.end(9, 0, 0, 0), null);
  });

  QUnit.test("each touch starts with no swipes", (assert) => {
    const d = detector(30);
    d.start(1, 0, 0, 0);
    d.move(1, 40, 0);
    d.end(1, 40, 0, 50);

    d.start(2, 0, 0, 100);

    assert.strictEqual(d.end(2, 0, 0, 150), "tap");
  });
});
```

Add the script and its tests to `tests.html`: `touch.js` after `particles.js`, and `touch.tests.js` after `particles.tests.js`:

```html
  <script src="js/touch.js"></script>
```
```html
  <script src="tests/touch.tests.js"></script>
```

Reload `tests.html`. You should see **506 passing tests** (the 476, plus 30). Notice that a swipe is tested with plain numbers: *"a move that reaches the distance is a swipe, the moment it does, without waiting for the finger to lift"* is one `start` and one `move`.

---

## Step 2: Listening to fingers

`SwipeDetector` has to be fed. `TouchControls` listens to the page and feeds it. It is deliberately small: there is nothing in it to get wrong that the detector doesn't already decide.

### Pointer events, not touch events

There are two families of events for fingers. The older **touch events** (`touchstart` and so on) are for fingers only. **Pointer events** (`pointerdown`, `pointermove`, `pointerup`) cover mice, pens and fingers with one set of names, and tell you which with `event.pointerType`. This game uses pointer events. They are also what the browser's device mode produces from your mouse.

Add the controls to `js/touch.js`, directly above the comment that begins `// Plain <script> include`. The class is shown closed, with its constructor:

```js
// Listens for fingers on an element and calls `onSwipe(direction)` and `onTap()`. A mouse
// is ignored (its drags are not swipes), and so is anything but the first finger.
class TouchControls {
  constructor(element, { onSwipe = () => {}, onTap = () => {} } = {}) {
    this.element = element;
    this.onSwipe = onSwipe;
    this.onTap = onTap;
    this.detector = new SwipeDetector();

    this.listeners = {
      pointerdown: (event) => this._down(event),
      pointermove: (event) => this._move(event),
      pointerup: (event) => this._up(event),
      pointercancel: () => this.detector.cancel(),
    };
    for (const [type, listener] of Object.entries(this.listeners)) element.addEventListener(type, listener);
  }
}
```

Add these methods **inside the class**, directly above its closing `}`:

```js
  _down(event) {
    if (event.pointerType === "mouse") return;
    this.detector.distance = swipeDistanceFor(this.element.clientWidth, this.element.clientHeight);
    if (this.detector.start(event.pointerId, event.clientX, event.clientY, event.timeStamp)) {
      // Keep getting the finger's moves even if it slides off the element.
      if (this.element.setPointerCapture) this.element.setPointerCapture(event.pointerId);
    }
  }

  _move(event) {
    const direction = this.detector.move(event.pointerId, event.clientX, event.clientY);
    if (direction) this.onSwipe(direction);
  }

  _up(event) {
    if (this.detector.end(event.pointerId, event.clientX, event.clientY, event.timeStamp) === "tap") this.onTap();
  }

  // Stops listening.
  dispose() {
    for (const [type, listener] of Object.entries(this.listeners)) this.element.removeEventListener(type, listener);
    this.detector.cancel();
  }
```

and replace the export block at the bottom with one that adds `TouchControls`:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SWIPE_MIN, SWIPE_FRACTION, TAP_MAX_MOVE, TAP_MAX_TIME, SWIPE_MOVES, swipeDistanceFor, directionOf, swipeMove, isTouchDevice, browserTouchEnvironment, SwipeDetector, TouchControls };
} else {
  Object.assign(window, { SWIPE_MIN, SWIPE_FRACTION, TAP_MAX_MOVE, TAP_MAX_TIME, SWIPE_MOVES, swipeDistanceFor, directionOf, swipeMove, isTouchDevice, browserTouchEnvironment, SwipeDetector, TouchControls });
}
```

Things to notice:

- **The mouse is ignored.** `pointerType === "mouse"` returns at once. A mouse drag on a desktop is not a swipe, and a click is not a tap (the buttons on the screens are for clicking).
- **The distance is worked out from the size of the element when a finger goes down,** so a window that has been resized is allowed for.
- **`setPointerCapture`** tells the browser to keep sending this finger's events to the canvas even if the finger slides off it. Without it, a swipe that ends outside the canvas would never be heard. It's checked for first, because not everything has it.
- **The handlers are kept in `this.listeners`,** so `dispose` can remove the same functions it added. `removeEventListener` needs the very same function that was added.
- **`pointercancel` just calls `cancel`:** the browser took the touch away, so nothing happened.
- **`onSwipe` and `onTap` are passed in,** so `TouchControls` knows nothing about the runner. The game decides what a swipe does.

### 2a. Tests

The controls need an element to listen to. The tests give them one that remembers its listeners, and send it events by hand. Add the rest of the tests to the **end** of `tests/touch.tests.js`:

```js
// The controls need an element to listen to. These tests give them one that remembers its
// listeners, and send it events by hand.
QUnit.module("TouchControls", () => {
  class FakeElement {
    constructor() {
      this.listeners = {};
      this.clientWidth = 1000;
      this.clientHeight = 500;
      this.captured = [];
    }
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    }
    removeEventListener(type) {
      delete this.listeners[type];
    }
    setPointerCapture(id) {
      this.captured.push(id);
    }
    send(type, event) {
      if (this.listeners[type]) this.listeners[type]({ pointerType: "touch", pointerId: 1, clientX: 0, clientY: 0, timeStamp: 0, ...event });
    }
  }

  const make = () => {
    const element = new FakeElement();
    const swipes = [];
    const taps = [];
    const controls = new TouchControls(element, { onSwipe: (direction) => swipes.push(direction), onTap: () => taps.push("tap") });
    return { element, controls, swipes, taps };
  };

  QUnit.test("listens for the four kinds of pointer event", (assert) => {
    const { element } = make();

    assert.deepEqual(Object.keys(element.listeners).sort(), ["pointercancel", "pointerdown", "pointermove", "pointerup"]);
  });

  QUnit.test("a swipe calls onSwipe with its direction, as the finger moves", (assert) => {
    const { element, swipes } = make();

    element.send("pointerdown", { clientX: 500, clientY: 250 });
    element.send("pointermove", { clientX: 500, clientY: 100 });

    assert.deepEqual(swipes, ["up"]);
  });

  QUnit.test("the distance for a swipe comes from the size of the element", (assert) => {
    const { element, swipes } = make(); // 1000 x 500: a swipe is 6% of 500 = 30 pixels

    element.send("pointerdown", { clientX: 500, clientY: 250 });
    element.send("pointermove", { clientX: 520, clientY: 250 });
    assert.deepEqual(swipes, [], "20 is too short");

    element.send("pointermove", { clientX: 535, clientY: 250 });
    assert.deepEqual(swipes, ["right"], "35 is enough");
  });

  QUnit.test("a quick touch calls onTap when the finger lifts", (assert) => {
    const { element, taps } = make();

    element.send("pointerdown", { clientX: 500, clientY: 250, timeStamp: 1000 });
    element.send("pointerup", { clientX: 501, clientY: 250, timeStamp: 1080 });

    assert.deepEqual(taps, ["tap"]);
  });

  QUnit.test("a swipe doesn't also tap when the finger lifts", (assert) => {
    const { element, taps } = make();

    element.send("pointerdown", { clientX: 500, clientY: 250, timeStamp: 0 });
    element.send("pointermove", { clientX: 600, clientY: 250, timeStamp: 30 });
    element.send("pointerup", { clientX: 600, clientY: 250, timeStamp: 60 });

    assert.deepEqual(taps, []);
  });

  QUnit.test("the mouse is ignored: a drag is not a swipe, and a click is not a tap", (assert) => {
    const { element, swipes, taps } = make();

    element.send("pointerdown", { pointerType: "mouse", clientX: 500, clientY: 250 });
    element.send("pointermove", { pointerType: "mouse", clientX: 700, clientY: 250 });
    element.send("pointerup", { pointerType: "mouse", clientX: 700, clientY: 250 });

    assert.deepEqual(swipes, []);
    assert.deepEqual(taps, []);
  });

  QUnit.test("a pen counts as a finger", (assert) => {
    const { element, swipes } = make();

    element.send("pointerdown", { pointerType: "pen", clientX: 500, clientY: 250 });
    element.send("pointermove", { pointerType: "pen", clientX: 500, clientY: 400 });

    assert.deepEqual(swipes, ["down"]);
  });

  QUnit.test("it captures the finger, so the moves keep coming if it slides off the element", (assert) => {
    const { element } = make();

    element.send("pointerdown", { pointerId: 7 });

    assert.deepEqual(element.captured, [7]);
  });

  QUnit.test("a second finger is ignored", (assert) => {
    const { element, swipes } = make();

    element.send("pointerdown", { pointerId: 1, clientX: 500, clientY: 250 });
    element.send("pointerdown", { pointerId: 2, clientX: 100, clientY: 100 });
    element.send("pointermove", { pointerId: 2, clientX: 400, clientY: 100 });

    assert.deepEqual(swipes, []);
  });

  QUnit.test("when the browser takes the touch away (pointercancel), nothing is called and the next touch works", (assert) => {
    const { element, swipes, taps } = make();
    element.send("pointerdown", { clientX: 500, clientY: 250, timeStamp: 0 });

    element.send("pointercancel", {});
    element.send("pointerdown", { pointerId: 2, clientX: 500, clientY: 250, timeStamp: 100 });
    element.send("pointerup", { pointerId: 2, clientX: 500, clientY: 250, timeStamp: 150 });

    assert.deepEqual(swipes, []);
    assert.deepEqual(taps, ["tap"]);
  });

  QUnit.test("works on an element that can't capture pointers", (assert) => {
    const { element, swipes } = make();
    element.setPointerCapture = undefined;

    element.send("pointerdown", { clientX: 500, clientY: 250 });
    element.send("pointermove", { clientX: 500, clientY: 150 });

    assert.deepEqual(swipes, ["up"]);
  });

  QUnit.test("dispose() stops listening", (assert) => {
    const { element, controls, swipes } = make();

    controls.dispose();
    element.send("pointerdown", { clientX: 500, clientY: 250 });
    element.send("pointermove", { clientX: 500, clientY: 100 });

    assert.deepEqual(Object.keys(element.listeners), []);
    assert.deepEqual(swipes, []);
  });

  QUnit.test("with no handlers it doesn't mind", (assert) => {
    const element = new FakeElement();
    new TouchControls(element);

    element.send("pointerdown", { clientX: 500, clientY: 250, timeStamp: 0 });
    element.send("pointermove", { clientX: 500, clientY: 100, timeStamp: 10 });
    element.send("pointerup", { clientX: 500, clientY: 100, timeStamp: 20 });

    assert.true(true, "no error");
  });
});
```

Reload `tests.html`: **13 more** tests (**519** in all). Look at *"the mouse is ignored"*, *"a second finger is ignored"* and *"when the browser takes the touch away (pointercancel)..."*: the three situations a real phone throws at you that a quick desktop test never would.

---

## Step 3: A camera for a tall screen

The camera is set by its **vertical** field of view: how many radians it sees from the bottom of the picture to the top. On a landscape screen that happens to show plenty of width. But hold a phone upright and the screen is *taller than wide*: the same vertical angle then shows a thin slice of the street, and the left and right lanes fall off the edges.

The fix is to set the camera by its **horizontal** angle when the screen is tall. Babylon.js has both: `camera.fovMode` is either `FOVMODE_VERTICAL_FIXED` (the default) or `FOVMODE_HORIZONTAL_FIXED`. The *decision* of which to use is plain maths, so it goes in `js/camera.js`. Open it.

Add this below the other constants and above `followPosition`:

```js
const MIN_HORIZONTAL_FOV = 1.25; // radians (about 72 degrees): the street is never seen narrower than this

// How wide the camera should look, for a screen of this shape (`aspect` is width divided by
// height). A camera is set by its vertical angle, which on a wide screen shows plenty of
// width. On a tall screen, a phone held upright, the same vertical angle would show a
// sliver of the street and the side lanes would be off the edge. So if the angle across
// the screen would come out narrower than MIN_HORIZONTAL_FOV, the camera is set by that
// angle across instead, and the vertical one follows. Returns { horizontal, fov }:
// whether `fov` is the horizontal angle, and the angle.
function fovFor(aspect, vertical) {
  const across = 2 * Math.atan(Math.tan(vertical / 2) * aspect);
  return across >= MIN_HORIZONTAL_FOV ? { horizontal: false, fov: vertical } : { horizontal: true, fov: MIN_HORIZONTAL_FOV };
}
```

and update the export block at the bottom:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_FOLLOW_X, CAMERA_FOLLOW_Y, MIN_HORIZONTAL_FOV, fovFor, followPosition };
} else {
  Object.assign(window, { CAMERA_DISTANCE, CAMERA_HEIGHT, CAMERA_FOLLOW_X, CAMERA_FOLLOW_Y, MIN_HORIZONTAL_FOV, fovFor, followPosition });
}
```

Things to notice:

- **The angle across is worked out from the angle up.** For a camera `vertical` radians tall on a screen `aspect` times as wide as it is tall, the horizontal angle is `2 * atan(tan(vertical / 2) * aspect)`. (It's `tan`, not a straight multiply, because a camera sees along rays that spread out from the eye.)
- **It only switches when it has to.** A wide screen keeps the vertical angle it was given, so nothing changes on a desktop. When the angle across would come out under `MIN_HORIZONTAL_FOV` (about 72 degrees), the camera is set by that angle instead, and the vertical angle becomes whatever fits.
- **The function returns what to do, and doesn't do it.** `{ horizontal, fov }` says which mode and what angle. Setting them on the camera is the game's job.

Add the tests to the **end** of `tests/camera.tests.js`:

```js
QUnit.module("fovFor", () => {
  const VERTICAL = 0.9; // the game's vertical angle

  QUnit.test("a wide screen keeps the vertical angle it was given", (assert) => {
    assert.deepEqual(fovFor(16 / 9, VERTICAL), { horizontal: false, fov: VERTICAL });
    assert.deepEqual(fovFor(1.6, VERTICAL), { horizontal: false, fov: VERTICAL });
  });

  QUnit.test("a tall screen, like a phone held upright, is set by the angle across it instead", (assert) => {
    assert.deepEqual(fovFor(0.46, VERTICAL), { horizontal: true, fov: MIN_HORIZONTAL_FOV });
  });

  QUnit.test("a square screen is tall enough to need it too", (assert) => {
    assert.true(fovFor(1, VERTICAL).horizontal);
  });

  QUnit.test("it changes over at the shape where the angle across would come out too narrow", (assert) => {
    // The aspect at which the horizontal angle is exactly the minimum.
    const edge = Math.tan(MIN_HORIZONTAL_FOV / 2) / Math.tan(VERTICAL / 2);

    assert.false(fovFor(edge + 0.01, VERTICAL).horizontal);
    assert.true(fovFor(edge - 0.01, VERTICAL).horizontal);
  });

  QUnit.test("the street is never seen narrower than the minimum, whatever the shape", (assert) => {
    for (const aspect of [0.3, 0.46, 0.75, 1, 1.33, 1.6, 2.1, 3]) {
      const { horizontal, fov } = fovFor(aspect, VERTICAL);
      const across = horizontal ? fov : 2 * Math.atan(Math.tan(fov / 2) * aspect);
      assert.true(across >= MIN_HORIZONTAL_FOV - 1e-9, `aspect ${aspect}`);
    }
  });

  QUnit.test("a wider vertical angle can keep a taller screen on the vertical setting", (assert) => {
    assert.false(fovFor(0.9, 1.6).horizontal);
    assert.true(fovFor(0.9, 0.9).horizontal);
  });

  QUnit.test("the minimum is wider than the side lanes need: both lanes, and some street beside them, fit", (assert) => {
    // At the camera's distance of 6.5, the street is seen across 2 * 6.5 * tan(fov / 2).
    const width = 2 * CAMERA_DISTANCE * Math.tan(MIN_HORIZONTAL_FOV / 2);

    assert.true(width > 2 * 2.2 + 2, `${width} wide`);
  });
});
```

Reload `tests.html`: **7 more** tests (**526** in all). The last one checks the point of all this: at the camera's distance, the narrowest view that the minimum allows is wider than the three lanes.

---

## Step 4: The screens, the HUD and the page

### 4a. A pause button

A keyboard has P. A phone doesn't, so the game needs a button to press, shown only during a run (the other screens have their own buttons). Open `js/screens.js`.

In the constructor, directly below the `this.board = get("board");` line, find the pause button:

```js
    this.pauseButton = get("pause-button");
```

and in the `this.buttons` list, directly below `sound: get("sound"),`, add it so it is wired like the others:

```js
      pause: this.pauseButton,
```

Replace `bind` so it connects the pause button too:

```js
  // Makes the buttons do something. Each lets go of the keyboard focus when it is clicked:
  // a button that keeps focus is pressed again by the space bar, which is the jump key.
  bind({ play, resume, again, toTitle, sound, pause }) {
    const wire = (button, callback) =>
      button.addEventListener("click", () => {
        button.blur();
        callback();
      });
    wire(this.buttons.play, play);
    wire(this.buttons.resume, resume);
    wire(this.buttons.again, again);
    wire(this.buttons.pauseTitle, toTitle);
    wire(this.buttons.overTitle, toTitle);
    wire(this.buttons.sound, sound);
    wire(this.buttons.pause, pause);
  }
```

and add this method **inside the class**, directly above the comment that begins `// Says on the sound button`:

```js
  // Shows the pause button, for a touch screen with no P key, while a run is going, and
  // hides it the rest of the time (the screens have their own buttons).
  setPlaying(playing) {
    this.pauseButton.classList.toggle("hidden", !playing);
  }
```

In `tests/screens.tests.js`, add the new id to the end of the `IDS` list (change the line that ends `"sound",` so the list reads):

```js
    "combo-banner", "combo-text", "sound", "pause-button",
```

and replace the test *"bind() makes each button do its job"* with these three tests:

```js
  QUnit.test("bind() makes each button do its job", (assert) => {
    const { screens, els } = makeScreens();
    const calls = [];
    screens.bind({
      play: () => calls.push("play"),
      resume: () => calls.push("resume"),
      again: () => calls.push("again"),
      toTitle: () => calls.push("title"),
      sound: () => calls.push("sound"),
      pause: () => calls.push("pause"),
    });

    for (const id of ["play", "resume", "again", "pause-title", "over-title", "sound", "pause-button"]) els[id].click();

    assert.deepEqual(calls, ["play", "resume", "again", "title", "title", "sound", "pause"]);
  });

  QUnit.test("setPlaying() shows the pause button in a run, and hides it otherwise", (assert) => {
    const { screens, els } = makeScreens();

    screens.setPlaying(true);
    assert.false(els["pause-button"].hidden);

    screens.setPlaying(false);
    assert.true(els["pause-button"].hidden);
  });

  QUnit.test("the pause button lets go of the keyboard when clicked, like the others", (assert) => {
    const { screens, els } = makeScreens();
    screens.bind({ play() {}, resume() {}, again() {}, toTitle() {}, sound() {}, pause() {} });

    els["pause-button"].click();

    assert.strictEqual(els["pause-button"].blurred, 1);
  });
```

Reload `tests.html`: **2 more** tests (**528** in all).

### 4b. A HUD that scales

The HUD's text is in pixels, written for a screen about 720 high. On a phone 320 pixels high in landscape it is far too big; on a 1440 monitor it's a bit small. A Babylon.js GUI can scale all its sizes to the screen: set `idealHeight` to the height the sizes were written for, and it draws everything at the screen's height divided by that. A short screen then draws at half size.

But scaled too far down the text can't be read, and scaled too far up it is huge, so the height it is told is held between two limits. Open `js/hud.js`. Add this above `HUD_COLOR`:

```js
// The text's sizes are written for a screen about 720 pixels high. The GUI can scale them to
// the screen it is on, by being told what height they were written for: on a screen half
// that high it draws everything at half size. But scaled right down, a short phone screen
// would make the text too small to read, and scaled right up a big monitor would make it
// huge, so the height it is told is held between these two.
const HUD_IDEAL_MIN = 480;
const HUD_IDEAL_MAX = 720;

// The height to tell the GUI its sizes were written for, on a screen `height` pixels high.
function idealHeightFor(height) {
  return Math.min(HUD_IDEAL_MAX, Math.max(HUD_IDEAL_MIN, height));
}
```

The text is scaled down on a small screen, which would tuck the score under the *Samples* button, so the lines start lower. In `attachTo`, replace the labels with:

```js
    // The top-left corner holds three lines. The page's back button sits on top of the
    // canvas from y = 12 to about y = 46, and the text is scaled down on a small screen, so
    // they start well below it.
    this.scoreLabel = this._label({ top: "72px", fontSize: 38, font: FONT_TITLE });
    this.distanceLabel = this._label({ top: "124px", fontSize: 24, font: FONT_SMALL });
    this.coinsLabel = this._label({ top: "154px", fontSize: 24, font: FONT_SMALL });

    // The combo is in the middle, near the top, so it is hard to miss.
    this.comboLabel = this._label({ top: "72px", fontSize: 46, font: FONT_TITLE, centered: true });
    this.comboLabel.isVisible = false;

    this.update(this.shown);
```

and update the export block at the bottom:

```js
// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { FONT_TITLE, FONT_SMALL, HUD_IDEAL_MIN, HUD_IDEAL_MAX, idealHeightFor, Hud };
} else {
  Object.assign(window, { FONT_TITLE, FONT_SMALL, HUD_IDEAL_MIN, HUD_IDEAL_MAX, idealHeightFor, Hud });
}
```

Add the tests, above the `Hud` module, in `tests/hud.tests.js`:

```js
QUnit.module("idealHeightFor", () => {
  QUnit.test("a screen between the limits is told its own height, so the text is its written size", (assert) => {
    assert.strictEqual(idealHeightFor(600), 600);
    assert.strictEqual(idealHeightFor(HUD_IDEAL_MIN), HUD_IDEAL_MIN);
    assert.strictEqual(idealHeightFor(HUD_IDEAL_MAX), HUD_IDEAL_MAX);
  });

  QUnit.test("a short screen is told no less than the minimum, so the text can't shrink to nothing", (assert) => {
    assert.strictEqual(idealHeightFor(320), HUD_IDEAL_MIN);
    assert.strictEqual(idealHeightFor(0), HUD_IDEAL_MIN);
  });

  QUnit.test("a tall screen is told no more than the maximum, so the text is only a little bigger", (assert) => {
    assert.strictEqual(idealHeightFor(1440), HUD_IDEAL_MAX);
  });

  QUnit.test("on a phone 320 pixels high the text is drawn at two thirds of its size, and not smaller", (assert) => {
    const scale = 320 / idealHeightFor(320); // the GUI draws at the screen's height over the height it is told

    assert.true(Math.abs(scale - 2 / 3) < 1e-9);
  });
});
```

Reload `tests.html`: **4 more** tests (**532** in all).

### 4c. The look of a touch screen

In `css/game.css`, add these rules at the **end** of the file:

```css
/* Touch. The page must not scroll, zoom or select text when a finger moves over it, and
   the text field has to stay usable. */
html,
body {
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
}
input {
  -webkit-user-select: text;
  user-select: text;
}
button {
  touch-action: manipulation;
}

/* The game puts the class "touch" on the page when the screen is a touch screen. Then the
   hints about keys give way to the hints about swipes, and the pause button shows. */
.touch-only,
.touch .desktop-only,
.touch .hint {
  display: none;
}
.touch .touch-only {
  display: block;
}
.screen .keys {
  padding: 0 16px;
  text-align: center;
}
#pause-button {
  display: none;
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 26;
  width: 48px;
  height: 48px;
  padding: 0;
  font-size: 22px;
}
.touch #pause-button {
  display: block;
}
.touch #pause-button.hidden {
  display: none;
}

/* A small screen: a phone, or a window made small. Everything over the picture gets smaller,
   so the screens fit and the street stays in view. */
@media (max-width: 640px), (max-height: 520px) {
  .screen {
    gap: 8px;
    padding-top: 58px;
    font-size: 18px;
  }
  .screen h2 {
    font-size: 44px;
    -webkit-text-stroke: 4px var(--ink);
  }
  .screen .keys {
    font-size: 15px;
  }
  #title .logo {
    max-height: 20vh;
  }
  .panel {
    padding: 8px 10px;
  }
  #name {
    font-size: 20px;
  }
  .swatch {
    width: 28px;
    height: 28px;
  }
  button.big,
  button.quiet {
    padding: 6px 16px;
    font-size: 22px;
  }
  #over-score {
    font-size: 34px;
    -webkit-text-stroke: 4px var(--ink);
  }
  #over-best {
    font-size: 22px;
  }
  #board {
    font-size: 16px;
  }
  #high-score {
    max-height: 16vh;
  }
  #combo-banner {
    top: 12%;
    width: min(50vw, 260px);
  }
  #combo-text {
    font-size: 30px;
  }
  .hint {
    display: none;
  }
}
```

Things to notice:

- **`overscroll-behavior: none`, `user-select: none` and `-webkit-tap-highlight-color`** stop the browser doing what it does with a finger: pull the page down to refresh, select text when you press and hold, and flash a highlight when you tap. The text field opts back in to selecting, or you couldn't type in it. (The canvas already has `touch-action: none` from the shared stylesheet, which stops the browser from scrolling or zooming with a swipe.)
- **`touch-action: manipulation` on buttons** turns off double-tap-to-zoom, which also made taps wait a moment in case a second tap was coming.
- **A class on the page picks between keys and fingers.** The game will put the class `touch` on `<body>` for a touch screen. The hints about keys (`desktop-only`) and the hint bar are then hidden, and the hint about swipes (`touch-only`) and the pause button are shown. Nothing is checked in code each time: the page's CSS does it.
- **A media query is a condition on the screen.** `(max-width: 640px), (max-height: 520px)` means a narrow screen *or* a short one: a phone upright, or on its side. Inside, everything over the picture gets smaller so the screens fit and the street stays in view.

### 4d. The page

In `index.html`, add a `viewport` meta tag directly below the `charset` one:

```html
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

Without it, a phone pretends the page is about 980 pixels wide and shrinks it all to fit, so nothing you've done for a small screen would apply. `width=device-width` says to use the real width, and `maximum-scale=1, user-scalable=no` stops pinch-zoom, which would otherwise fight the game.

Replace the three screens (the title, the pause and the game over) with these, which mark the key hints as `desktop-only`, and add a hint for touch:

```html
  <div id="title" class="screen">
    <img class="logo" src="../assets/images/parkour_runner_logo_small.png" alt="Parkour Runner">
    <div class="row panel">
      <input id="name" type="text" maxlength="12" placeholder="Your name" autocomplete="off" spellcheck="false">
      <div id="swatches"></div>
      <button id="play" class="big" type="button">Play</button>
    </div>
    <p id="title-best"></p>
    <p class="keys desktop-only">Enter to play &middot; &larr;/&rarr; lanes &middot; &uarr; jump &middot; &darr; slide &middot; P pause</p>
    <p class="keys touch-only">Swipe left or right to change lane, up to jump, down to slide. Tap to jump.</p>
  </div>
  <div id="pause" class="screen hidden">
    <h2>Paused</h2>
    <div class="row">
      <button id="resume" class="big" type="button">Resume</button>
      <button id="pause-title" class="quiet" type="button">Title</button>
    </div>
    <p class="keys desktop-only">P or Esc to carry on &middot; T for the title</p>
  </div>
  <div id="over" class="screen hidden">
    <img id="high-score" class="hidden" src="../assets/images/high_score_small.png" alt="High score">
    <h2>Game Over</h2>
    <p id="over-score"></p>
    <p id="over-best"></p>
    <ol id="board"></ol>
    <div class="row">
      <button id="again" class="big" type="button">Run again</button>
      <button id="over-title" class="quiet" type="button">Title</button>
    </div>
    <p class="keys desktop-only">Enter or R to run again &middot; T for the title</p>
  </div>
```

and add the pause button directly below the sound button:

```html
  <button id="pause-button" class="quiet hidden" type="button" aria-label="Pause">II</button>
```

Also change the `<title>` to `Parkour Runner Touch - Babylon.js`.

---

## Step 5: Wiring it up

Add the new script to the list at the **bottom of `<body>`**, after `particles.js` and before `splash.js`:

```html
  <script src="js/touch.js"></script>
```

Now `js/main.js`.

### 5a. The camera and the HUD fit the screen

In `createScene`, directly below the line `scene.activeCamera = camera;`, add:

```js
  // How wide the camera looks depends on the shape of the screen: a phone held upright is
  // tall and narrow, and would lose the side lanes off its edges. See fovFor.
  const applyFov = () => {
    const { horizontal, fov } = fovFor(engine.getAspectRatio(camera), CAMERA_FOV);
    camera.fovMode = horizontal ? BABYLON.Camera.FOVMODE_HORIZONTAL_FIXED : BABYLON.Camera.FOVMODE_VERTICAL_FIXED;
    camera.fov = fov;
  };
  applyFov();
  engine.onResizeObservable.add(applyFov);
```

Things to notice:

- **`engine.getAspectRatio(camera)`** is the screen's width over its height, as the camera sees it.
- **`onResizeObservable`** calls the function again whenever the window changes size, and when a phone is turned from upright to sideways. The camera adapts to the turn.

Replace the line that makes the GUI and the HUD with:

```js
  const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("hud", true, scene);
  const fitHud = () => {
    ui.idealHeight = idealHeightFor(engine.getRenderHeight()); // the text scales with the screen
  };
  fitHud();
  engine.onResizeObservable.add(fitHud);
  const hud = new Hud({ ui });
```

### 5b. One set of moves

Until now the keys decided what a move did, inside the `keydown` handler. A swipe needs to do exactly the same things, and if the logic is copied it will drift apart: the vault, for example, is a clever bit of code. So move the actions out, into a table that both use. Directly above the `keydown` handler, add:

```js
  // What each move does. The keys and the swipes both come here, so they can't drift apart.
  const moves = {
    left: () => runner.moveLane(-1),
    right: () => runner.moveLane(1),
    jump: () => {
      // Next to a barrier, a jump is a vault: a quick, low hop over it. A little
      // further back, the vault waits until the barrier is close enough.
      const gap = field.barrierGap(runner);
      if (gap <= VAULT_RANGE) runner.vault();
      else if (gap <= VAULT_QUEUE_RANGE) vaultQueued = true;
      else runner.jump();
    },
    slide: () => runner.slide(),
  };
```

and in the handler, replace the lines that did the moves (from `if (LEFT_KEYS.has(event.code)) runner.moveLane(-1);` to `} else runner.slide();`) with calls to it:

```js
      if (LEFT_KEYS.has(event.code)) moves.left();
      else if (RIGHT_KEYS.has(event.code)) moves.right();
      else if (JUMP_KEYS.has(event.code)) moves.jump();
      else moves.slide();
```

Things to notice:

- **A refactor, with no change in behavior.** Play the game after this step on the keyboard, before adding any touch: everything should work as before.
- **The names match `SWIPE_MOVES`.** A swipe's move is one of `left`, `right`, `jump` or `slide`, which are the keys of `moves`, so `moves[swipeMove(direction)]()` does it.

### 5c. The fingers

Directly above `scene.onBeforeRenderObservable.add(() => {`, add:

```js
  // Fingers on the picture: a swipe makes the move its key would, and a tap jumps. They only
  // count in a run, like the keys.
  document.body.classList.toggle("touch", isTouchDevice(browserTouchEnvironment()));
  new TouchControls(canvas, {
    onSwipe: (direction) => {
      if (game.playing) moves[swipeMove(direction)]();
    },
    onTap: () => {
      if (game.playing) moves.jump();
    },
  });
```

Things to notice:

- **`touch` on the page is set once, here.** It's the class the CSS in Step 4 is waiting for.
- **Swipes and taps only count in a run (`game.playing`),** like the keys. On the title or when paused they do nothing, and the buttons on those screens are for pressing.
- **The controls listen to the canvas.** The screens are other elements on top of it, so a finger on a screen's button never reaches the canvas.
- **`moves.jump` has the vault logic in it,** so a swipe up next to a barrier vaults, as the key does.

### 5d. The pause button, and a buzz

In `showScreen`, add a line that shows the pause button in a run:

```js
    screens.setPlaying(game.playing);
```

(directly below `screens.show(game.state);`). Change the `screens.bind` call so the pause button toggles the pause:

```js
  screens.bind({ play: playFromTitle, resume: togglePause, again: startRun, toTitle: goToTitle, sound: toggleSound, pause: togglePause });
```

And in `endRun`, directly below `game.end();`, add two lines. A crash hides the pause button, and buzzes a phone:

```js
    screens.setPlaying(false);
    if (navigator.vibrate) navigator.vibrate(150); // a phone buzzes; most other things have no such thing
```

Things to notice:

- **`navigator.vibrate` is checked for before it is used.** Many browsers (all of Safari on iPhone) don't have it, and a desktop does nothing with it. The `if` makes the buzz a bonus that costs nothing where it can't work.
- **Closing the game over screen and the pause button:** `setPlaying(false)` on a crash hides the pause button, because the runner is no longer running; `showScreen` shows it again when a new run begins.

---

## Step 6: Try it

First on the desktop: play with the keyboard and make sure nothing has changed. There should be no pause button, and the keys' hints should be there as before. Then press **F12** and **Ctrl+Shift+M** for device mode, choose a phone (an *iPhone* or *Pixel*), and reload.

- [ ] The page is **phone sized**, with no scrollbars, and nothing scrolls or zooms when you drag
- [ ] The **title** fits: the logo, the name field, five colors and **Play**, and below them a hint about **swipes**, not keys
- [ ] **Tap Play** (click, in device mode). The run starts, and a round **pause button** shows at the top right
- [ ] **Drag left** with the mouse: the runner changes lane to the left. **Drag right**, and he goes back
- [ ] **Drag up** jumps (or vaults, near a barrier), **drag down** slides, and a **quick click** on the picture jumps
- [ ] A **long drag** changes **one** lane, not three
- [ ] The **pause button** pauses, and **Resume** carries on
- [ ] **Turn the phone** on its side with the rotate button: the picture adapts, the **score** is still readable and clear of the *Samples* button, and the screens still fit
- [ ] **Upright**, all **three lanes** are in view, and the street isn't cut off at the sides
- [ ] After a **crash**, the pause button goes and the game over screen fits. **Run again** works with a tap
- [ ] Turn device mode off again: the keys work, and the pause button is gone

If you have a phone and your computer is on the same network, `npx serve` prints a second address (the *Network* one). Open it on the phone, and try it with your thumb. A real finger will tell you things the mouse can't: whether the swipe distance feels right, and whether a thumb covers the runner.

**If something's wrong**

- **The splash says "Something went wrong starting the game. If the 3D models didn't load...", but the models are fine:** that message is the game's catch-all for *any* error while it starts up, and it blames the models because that is the usual cause. The real error is in the console (F12). If it says `Cannot read properties of null (reading 'addEventListener')` or `(reading 'classList')`, an element the code looks for by `id` isn't in `index.html`. After this step the likely one is the pause button: check that `<button id="pause-button" ...>` is there, directly below the sound button, and that every `id` in `Screens` has an element with exactly that name.
- **`TouchControls is not defined` and so on:** the `touch.js` script tag is missing, or comes after `main.js`.
- **Swipes do nothing:** in device mode, check the console for errors first. Then check that the game is *playing* (swipes don't count on the title), and that the drag is long enough: 24 pixels, or 6% of the screen's smaller side.
- **A swipe does the wrong move:** `SWIPE_MOVES` maps each direction to a key of `moves`. On a screen `y` grows downward, so a negative `dy` is up.
- **A swipe changes lane twice or three times:** `SwipeDetector.move` must return `null` once `swipes` is above 0.
- **A swipe works with the mouse on a desktop:** the `pointerType === "mouse"` check is missing. (In device mode the mouse reports as a finger, which is the point of it.)
- **The page scrolls or zooms when you drag:** the `viewport` tag is missing, or `touch-action: none` isn't on the canvas (it comes from the shared stylesheet).
- **The side lanes are off the screen upright:** `applyFov` isn't called, or `fovFor` isn't returning `horizontal`. Log `engine.getAspectRatio(camera)`.
- **The picture is squashed when the phone turns:** `applyFov` must be called again on a resize: check `engine.onResizeObservable`.
- **No pause button:** the page needs the class `touch`. Check that `document.body.classList` has it. On a desktop with a mouse, it won't, by design.
- **The pause button stays on the game over screen:** `screens.setPlaying(false)` is missing from `endRun`.
- **The score is under the *Samples* button:** the HUD's `top` values are too small for a small screen.
- **The HUD text is tiny or huge:** `idealHeightFor` isn't being used, or isn't called again on a resize.
- **A tap on a button also jumps:** the buttons are on top of the canvas, and shouldn't reach it. If one does, check that the screen's `z-index` is above the canvas.

**Experiments** (change one, reload, then change it back):

- `SWIPE_FRACTION` of `0.02`: a twitch is a swipe. Of `0.2`: you have to swipe across half the screen
- `TAP_MAX_TIME` of `1000`: a long press is a tap, and so jumps
- `MIN_HORIZONTAL_FOV` of `2`: a very wide view upright, with the street small in the middle
- `HUD_IDEAL_MIN` of `200`: on a short screen the text shrinks until it is unreadable
- In `moves`, swap `left` and `right`: the swipes and the keys swap together, because they share one table
- In device mode, set the throttling to *Slow 4G* and reload, to see the splash screen do its job

---

## Step 7: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js" integrity="sha384-DV6SS+E/t7VjqLYyoFfHRcjHiDgluMrKnNvW5ZwZMqDsQWUQs58s8aj5pXXkY2Gx" crossorigin="anonymous"></script>
  <script src="js/world.js"></script>
  <script src="js/models.js"></script>
  <script src="js/pool.js"></script>
  <script src="js/stream.js"></script>
  <script src="js/runner.js"></script>
  <script src="js/score.js"></script>
  <script src="js/obstacles.js"></script>
  <script src="js/clips.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/hud.js"></script>
  <script src="js/colors.js"></script>
  <script src="js/profile.js"></script>
  <script src="js/leaderboard.js"></script>
  <script src="js/game.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/sounds.js"></script>
  <script src="js/effects.js"></script>
  <script src="js/particles.js"></script>
  <script src="js/touch.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/world.tests.js"></script>
  <script src="tests/models.tests.js"></script>
  <script src="tests/pool.tests.js"></script>
  <script src="tests/stream.tests.js"></script>
  <script src="tests/runner.tests.js"></script>
  <script src="tests/score.tests.js"></script>
  <script src="tests/obstacles.tests.js"></script>
  <script src="tests/clips.tests.js"></script>
  <script src="tests/camera.tests.js"></script>
  <script src="tests/hud.tests.js"></script>
  <script src="tests/colors.tests.js"></script>
  <script src="tests/profile.tests.js"></script>
  <script src="tests/leaderboard.tests.js"></script>
  <script src="tests/game.tests.js"></script>
  <script src="tests/screens.tests.js"></script>
  <script src="tests/sounds.tests.js"></script>
  <script src="tests/effects.tests.js"></script>
  <script src="tests/particles.tests.js"></script>
  <script src="tests/touch.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **532 passing tests**: the 476 you started with, plus 30 for the swipe detector and its helpers, 13 for the controls, 7 for the camera, 2 for the pause button and 4 for the HUD's scaling.

> **What these tests don't cover.** They check the rules and the calls, with a stand-in for the page. They can't tell you a swipe *feels* right, that a thumb doesn't cover the runner, or that the text is readable on a real phone. That check is Step 6, and nothing replaces a real phone in a real hand.

> **Try breaking something.** In `SwipeDetector.move`, delete `|| this.swipes > 0` from the first line. A test notices that a long drag now swipes more than once. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| Deciding what a swipe and a tap are from raw finger movement | `SwipeDetector` |
| Rules as plain numbers, a thin class for the browser | `SwipeDetector`, `TouchControls` |
| Pointer events: one set of names for fingers, pens and mice | `TouchControls` |
| Ignoring the mouse, a second finger, and a cancelled touch | `_down`, `start`, `cancel` |
| Sharing one set of actions between two kinds of input | `moves`, `SWIPE_MOVES` |
| Asking whether the screen is a touch screen | `isTouchDevice`, `(pointer: coarse)` |
| Vertical and horizontal fields of view | `fovFor`, `fovMode` |
| Scaling a GUI to the screen | `idealHeight`, `idealHeightFor` |
| Stopping the browser doing its own things with a finger | the viewport tag, `touch-action`, `overscroll-behavior` |
| Responsive CSS | the media query, the `touch` class |
| Testing a phone from a desktop | device mode |

## Challenges

1. **A fullscreen button.** On a phone the browser's address bar takes a lot of the screen. (Hint: `document.documentElement.requestFullscreen()` from a button's click handler. It has to be started by something the player did, like the sound, and not every browser has it.)
2. **Tilt to steer.** Lean the phone left or right to change lanes. (Hint: the `deviceorientation` event gives `gamma`, the left/right tilt in degrees. A threshold and a "centered again" check turns it into the same `moves.left()` and `moves.right()`.)
3. **Show the swipe.** A faint arrow where the finger swiped, so a new player sees it was understood. (Hint: a particle burst, or an HTML element that fades, from `onSwipe`.)
4. **Two-thumb controls.** Make the left half of the screen change lanes and the right half jump and slide. (Hint: `TouchControls` could report which half the finger started in, and the game could pick what a swipe means by it.)
5. **Lock the orientation.** Ask the phone to stay sideways. (Hint: `screen.orientation.lock("landscape")` works in fullscreen on some browsers, and fails quietly on others, so handle the rejected promise.)

---
