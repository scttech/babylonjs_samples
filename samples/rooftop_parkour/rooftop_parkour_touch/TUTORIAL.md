# Tutorial: Rooftop Parkour Touch -- Playing With Thumbs

This is the ninth tutorial of the Rooftop Parkour series. The game has a title, a pause and sound, and it needs a keyboard and a mouse. This sample makes it playable on a **phone held sideways**: a thumb stick under the left thumb, a drag to look with the right, a jump button, and a pause button.

By the end you'll have:

- **The arithmetic of a thumb**: how far a thumb is pushed, a dead zone, a push that is all the way meaning sprint, whether a device is a phone, and whether it is the wrong way up
- **A stick, a look pad and the controls**: a finger on the left of the screen is the stick, one on the right looks, each finger keeps its job until it comes up, and the controls speak the same language as the keyboard (`{ forward, right, sprint, jump }`)
- **What is drawn**: the ring of the stick comes up where the thumb went down, the **jump** button, a **pause** button, and a message that asks for the phone to be turned
- The game, with **keyboard and thumbs together**: touch is switched on for a phone (and with `?touch`, to try it with a mouse), the mouse look is no longer taken by a phone, and a phone held upright is a pause
- A **Touch** section in the developer panel: the reach of the stick, the dead zone, where the sprint begins, how far a drag looks, and read-outs of the fingers
- Unit tests for all of it: **721 passing tests**

**What you'll learn:** how to read a thumb with pointer events (and why each finger has an id), how a dead zone makes a stick feel right, how to make touch and keyboard the same to the game so that nothing else has to know, how to stop the browser from scrolling and zooming under a game, and how to test touch without a phone (by making up the events).

**Before you start:** do the [Screens tutorial](../rooftop_parkour_screens/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Screens sample, plus placeholders for the new files and their tests:

```
rooftop_parkour_touch/
├── index.html, tests.html   (already list the new scripts and the new stylesheet)
├── css/
│   ├── touch.css           (placeholder -- Step 3)
│   └── everything else, from the Screens sample
├── js/
│   ├── touch.js            (placeholder -- Step 1)
│   ├── touchpad.js         (placeholder -- Step 2)
│   ├── touchui.js          (placeholder -- Step 3)
│   ├── main.js             (changes -- Step 4)
│   └── everything else, from the Screens sample (the controller, the plan, the goals and the screens are not touched at all)
└── tests/
    ├── touch.tests.js, touchpad.tests.js, touchui.tests.js   (placeholders)
    └── everything else, from the Screens sample
```

**Nothing that already exists is changed, except the game itself** (`main.js`). The controller does not know whether it is told to run by a key or a thumb: both give it a direction.

Open `tests.html` before you change anything. You should see **698 passing tests**.

### Serving the page

The models can't be loaded from a page opened straight from a file, so run a web server: `npx serve` in the repo root, and open the sample through `http://localhost`. Add **`?dev`** to the address for the developer panel, and **`?touch`** to switch the touch controls on with a mouse (a mouse down and drag is a thumb).

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **The arithmetic of a thumb**: a push, a dead zone, a phone.
2. **The stick, the look pad and the controls**: which finger is which.
3. **What is drawn**: the ring, the buttons, a request to turn the phone.
4. **The game**: all of it together.

## Step 1: The arithmetic of a thumb

A thumb stick is a number: how far the thumb has gone from where it was put down. Three things make it feel right, and each is a number in a table (`TOUCH`):

- **A reach.** The thumb can go `stickRadius` pixels; further than that is the same as the edge.
- **A dead zone.** A thumb is never quite still, so the first `deadZone` of the reach is no push at all, and the rest is **stretched** to fill the range: the push grows from nothing to one, with no jump when it leaves the dead zone.
- **A sprint.** A push of `sprintAt` or more is a sprint: push all the way and the runner goes fast, ease off and it jogs. (The direction is the thumb's; the speeds are the runner's own.)

Then two questions about the device: is it a phone (`isTouchDevice`: a finger is the main pointer, and the device can feel touches; with `?touch` to force it on and `?touch=off` to force it off), and is it held the wrong way up (`needsLandscape`). And `mergeInput`, which puts what the keyboard asks for together with what the thumbs ask for, so a hybrid works.

Open `js/touch.js` (the placeholder) and **replace the TODO line** with:

```js
// Touch: playing with thumbs. A thumb stick under the left thumb to run (push it all the way to sprint), the rest of the screen to drag to look, a jump button
// under the right thumb, and a pause button. It speaks the same language as the keyboard: `input()` gives { forward, right, sprint, jump } like `moveInput`, and
// what the drag turned gives the same { dx, dy } as the mouse, so the game's own code does not know which it is being told. The arithmetic (how far a thumb is
// pushed, what is a dead zone, what a phone is) is plain functions in a table of numbers, tested without a screen; the controls and the buttons are built from
// the page's document. See ../tests/touch.tests.js.

const TOUCH = {
  stickRadius: 64, // pixels the thumb can be moved from where it was put down: the stick's reach
  deadZone: 0.15, // how much of the reach is no push at all (a thumb is never quite still)
  sprintAt: 0.85, // pushed this much of the way, the runner sprints
  lookScale: 1.6, // a drag looks this many times as far as a mouse that moved the same number of pixels (a thumb is slower than a wrist)
  stickZone: 0.45, // the left share of the screen where a touch is a stick; the rest is for looking
  landscapeRatio: 1.1, // a phone taller than this many times its width is held upright, and the game asks for it to be turned
};

// How far a thumb is pushed: `dx` and `dy` are pixels from where it went down (down the screen is positive). Gives { x, y, amount }: x and y are the push as a
// unit direction (right and up the screen are positive), and `amount` is 0 to 1, with the dead zone taken off and the rest stretched to fill the range.
function stickValue(dx, dy, table = TOUCH) {
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 0, amount: 0 };
  const reach = Math.min(1, length / table.stickRadius);
  const amount = reach <= table.deadZone ? 0 : (reach - table.deadZone) / (1 - table.deadZone);
  if (amount === 0) return { x: 0, y: 0, amount: 0 };
  return { x: dx / length, y: -dy / length, amount };
}

// What a stick says to the game: { forward, right, sprint }, the same as the keys. The push is not scaled (the runner runs at its own speeds): a push in
// a direction is that direction, and a push all the way is a sprint.
function stickInput(value, table = TOUCH) {
  if (value.amount === 0) return { forward: 0, right: 0, sprint: false };
  return { forward: value.y, right: value.x, sprint: value.amount >= table.sprintAt };
}

// Whether to use touch controls. `env` is { coarse: whether the main pointer is a finger (matchMedia "(pointer: coarse)"), touchPoints: how many fingers
// the device can feel at once, search: the page's query string }. Touch is on for a device that has a finger and a screen, and can be forced on (`?touch`)
// to try it with a mouse, or off (`?touch=off`) on a device that has both.
function isTouchDevice({ coarse = false, touchPoints = 0, search = "" } = {}) {
  const params = new URLSearchParams(search);
  const forced = params.get("touch");
  if (forced === "off" || forced === "0") return false;
  if (params.has("touch")) return true;
  return coarse && touchPoints > 0;
}

// Whether the phone is held upright, which is the wrong way for this game.
function needsLandscape(width, height, table = TOUCH) {
  return height > width * table.landscapeRatio;
}

// What the keyboard and the thumbs ask for together: the larger of each, and a sprint or a jump from either.
function mergeInput(a, b) {
  const pick = (x, y) => (Math.abs(x) >= Math.abs(y) ? x : y);
  return { forward: pick(a.forward, b.forward), right: pick(a.right, b.right), sprint: a.sprint || b.sprint, jump: a.jump || b.jump };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOUCH, stickValue, stickInput, isTouchDevice, needsLandscape, mergeInput };
} else {
  Object.assign(window, { TOUCH, stickValue, stickInput, isTouchDevice, needsLandscape, mergeInput });
}
```

Things to notice:

- **Up the screen is forward.** A pointer's y grows downward, so `y` of the stick is the *negative* of `dy`.
- **The input is the same shape as the keyboard's.** `stickInput` gives `{ forward, right, sprint }`, as `moveInput` does for the keys; the game never asks which.
- **A laptop with a touch screen is not a phone.** Its main pointer is a mouse (`coarse` is false), and the test says so.

### Tests

Open `tests/touch.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("stickValue and stickInput", () => {
  const close = (assert, a, b, message) => assert.true(Math.abs(a - b) < 1e-9, `${message}: ${a} vs ${b}`);

  QUnit.test("a thumb that has not moved, or has moved a very little, pushes nothing", (assert) => {
    assert.deepEqual(stickValue(0, 0), { x: 0, y: 0, amount: 0 });
    assert.strictEqual(stickValue(3, 2).amount, 0, "inside the dead zone");
    assert.strictEqual(stickInput(stickValue(3, 2)).forward, 0);
  });

  QUnit.test("up the screen is forward, and right is right", (assert) => {
    const up = stickValue(0, -TOUCH.stickRadius);
    close(assert, up.y, 1, "up is forward");
    close(assert, up.x, 0, "and not sideways");
    const right = stickValue(TOUCH.stickRadius, 0);
    close(assert, right.x, 1, "right is right");
    const down = stickInput(stickValue(0, 40));
    assert.true(down.forward < 0, "down the screen is back");
  });

  QUnit.test("the dead zone is taken off and the rest stretched, so the push grows from nothing to one", (assert) => {
    const edge = TOUCH.stickRadius * TOUCH.deadZone;
    assert.strictEqual(stickValue(edge, 0).amount, 0);
    close(assert, stickValue(TOUCH.stickRadius, 0).amount, 1, "all the way");
    const half = stickValue(TOUCH.stickRadius * (TOUCH.deadZone + (1 - TOUCH.deadZone) / 2), 0).amount;
    close(assert, half, 0.5, "half way between the dead zone and the end");
  });

  QUnit.test("a thumb moved further than the reach is a push of one, no more", (assert) => {
    assert.strictEqual(stickValue(TOUCH.stickRadius * 5, 0).amount, 1);
  });

  QUnit.test("it sprints when it is pushed nearly all the way, and jogs before that", (assert) => {
    const jog = stickInput(stickValue(0, -TOUCH.stickRadius * 0.5));
    const sprint = stickInput(stickValue(0, -TOUCH.stickRadius));
    assert.false(jog.sprint);
    assert.true(sprint.sprint);
  });
});

QUnit.module("isTouchDevice and needsLandscape", () => {
  QUnit.test("a phone has a finger and touch points; a laptop has a mouse", (assert) => {
    assert.true(isTouchDevice({ coarse: true, touchPoints: 5 }));
    assert.false(isTouchDevice({ coarse: false, touchPoints: 0 }));
    assert.false(isTouchDevice({ coarse: true, touchPoints: 0 }), "no touch points: it has no screen to touch");
    assert.false(isTouchDevice({ coarse: false, touchPoints: 10 }), "a laptop with a touch screen still has a mouse as its main pointer");
  });

  QUnit.test("it can be forced on to try it with a mouse, and off on a device that has both", (assert) => {
    assert.true(isTouchDevice({ search: "?dev&touch" }));
    assert.false(isTouchDevice({ coarse: true, touchPoints: 5, search: "?touch=off" }));
    assert.false(isTouchDevice({ coarse: true, touchPoints: 5, search: "?touch=0" }));
  });

  QUnit.test("a phone that is much taller than it is wide is held upright, and a square one is not", (assert) => {
    assert.true(needsLandscape(390, 800));
    assert.false(needsLandscape(800, 390));
    assert.false(needsLandscape(500, 520), "nearly square is near enough");
  });
});

QUnit.module("mergeInput", () => {
  QUnit.test("the keys and the thumbs together: the larger push of each, and a sprint or a jump from either", (assert) => {
    const keys = { forward: 1, right: 0, sprint: false, jump: false };
    const thumbs = { forward: 0.5, right: -0.7, sprint: true, jump: false };
    assert.deepEqual(mergeInput(keys, thumbs), { forward: 1, right: -0.7, sprint: true, jump: false });
    assert.true(mergeInput(keys, { ...thumbs, jump: true }).jump);
  });
});
```

Open `tests.html`. You should see **707 passing tests**: 9 more.

## Step 2: The stick, the look pad and the controls

A touch screen can have several fingers on it at once, and each is told apart by a **pointer id** that stays the same from the moment it goes down until it comes up. That is the whole trick: the stick *remembers its finger's id*, and listens to no other.

- `Stick` measures a push from **where its thumb went down** (not from a fixed place on the screen): the player puts the stick wherever their thumb is.
- `LookPad` turns the view by how far its finger moved each time, scaled (`lookScale`) because a thumb is slower than a wrist.
- `TouchControls` listens to the surface (the canvas): a finger that goes down in the left share of the screen (`stickZone`) is the stick, any other is the look pad, and the jump button's fingers are told to it by the buttons.

Open `js/touchpad.js` (the placeholder) and **replace the TODO line** with:

```js
// The thumbs: the stick, the look pad, and the controls that decide which finger is which. They are given the surface that is touched, and speak the language
// of touch.js (TOUCH, stickValue and stickInput are from there, which comes first). See ../tests/touchpad.tests.js.

// The stick: a thumb goes down somewhere, and the push is measured from there until it comes up. Only one finger is the stick's; another is ignored.
class Stick {
  constructor(table = TOUCH) {
    this.table = table;
    this.id = null;
    this.origin = null;
    this.dx = 0;
    this.dy = 0;
  }

  get active() {
    return this.id !== null;
  }

  start(id, x, y) {
    if (this.active) return false;
    this.id = id;
    this.origin = { x, y };
    this.dx = 0;
    this.dy = 0;
    return true;
  }

  move(id, x, y) {
    if (id !== this.id) return;
    this.dx = x - this.origin.x;
    this.dy = y - this.origin.y;
  }

  end(id) {
    if (id !== this.id) return false;
    this.id = null;
    this.origin = null;
    this.dx = 0;
    this.dy = 0;
    return true;
  }

  // How the thumb is pushed now, as stickValue says, and where the knob should be drawn (held to the reach).
  get value() {
    return stickValue(this.dx, this.dy, this.table);
  }

  get knob() {
    const length = Math.hypot(this.dx, this.dy);
    const scale = length > this.table.stickRadius ? this.table.stickRadius / length : 1;
    return { x: this.dx * scale, y: this.dy * scale };
  }

  get input() {
    return stickInput(this.value, this.table);
  }
}

// The look pad: a finger dragged over the picture turns the view, by how far it moved each time. Only one finger looks.
class LookPad {
  constructor(table = TOUCH) {
    this.table = table;
    this.id = null;
    this.last = null;
    this.dx = 0;
    this.dy = 0;
  }

  get active() {
    return this.id !== null;
  }

  start(id, x, y) {
    if (this.active) return false;
    this.id = id;
    this.last = { x, y };
    return true;
  }

  move(id, x, y) {
    if (id !== this.id) return;
    this.dx += (x - this.last.x) * this.table.lookScale;
    this.dy += (y - this.last.y) * this.table.lookScale;
    this.last = { x, y };
  }

  end(id) {
    if (id !== this.id) return false;
    this.id = null;
    this.last = null;
    return true;
  }

  // How far the drag has turned the view since the last time this was asked, and forgets it: { dx, dy }.
  take() {
    const turned = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return turned;
  }
}

// The controls on a page: the surface that is touched (the canvas), the buttons, and what they add up to. A finger that goes down on the left of the surface is the
// stick, one that goes down on the right is the look pad, and the buttons are their own. `enabled` can be changed at any time (and a finger that is down is let go of).
class TouchControls {
  constructor(surface, { enabled = false, table = TOUCH, width = () => surface.clientWidth } = {}) {
    this.surface = surface;
    this.table = table;
    this.width = width;
    this.enabled = enabled;
    this.stick = new Stick(table);
    this.pad = new LookPad(table);
    this.jumpIds = new Set(); // the fingers that are down on the jump button
    surface.addEventListener("pointerdown", (event) => this._down(event));
    surface.addEventListener("pointermove", (event) => this._move(event));
    for (const name of ["pointerup", "pointercancel"]) surface.addEventListener(name, (event) => this._up(event));
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.release();
  }

  // Lets go of everything: no stick, no look, no jump (the page was hidden, or touch was turned off).
  release() {
    this.stick.end(this.stick.id);
    this.pad.end(this.pad.id);
    this.jumpIds.clear();
  }

  _down(event) {
    if (!this.enabled) return;
    const x = event.clientX;
    const inStickZone = x < this.width() * this.table.stickZone;
    if (inStickZone) this.stick.start(event.pointerId, x, event.clientY);
    else this.pad.start(event.pointerId, x, event.clientY);
    try {
      this.surface.setPointerCapture(event.pointerId);
    } catch (error) {
      // a finger that is not there any more, or a pointer that was made by a test
    }
  }

  _move(event) {
    if (!this.enabled) return;
    this.stick.move(event.pointerId, event.clientX, event.clientY);
    this.pad.move(event.pointerId, event.clientX, event.clientY);
  }

  _up(event) {
    this.stick.end(event.pointerId);
    this.pad.end(event.pointerId);
  }

  // The jump button's fingers (the buttons are elements of their own: the page tells the controls which finger went down and up on them).
  jumpDown(id) {
    if (this.enabled) this.jumpIds.add(id);
  }

  jumpUp(id) {
    this.jumpIds.delete(id);
  }

  get jumpHeld() {
    return this.jumpIds.size > 0;
  }

  // What the thumbs ask for, as moveInput says.
  input() {
    return { ...this.stick.input, jump: this.jumpHeld };
  }

  // How far the drag has turned the view since last asked: { dx, dy }.
  take() {
    return this.pad.take();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { Stick, LookPad, TouchControls };
} else {
  Object.assign(window, { Stick, LookPad, TouchControls });
}
```

Things to notice:

- **The stick keeps its finger when it wanders.** A thumb that slides across to the right half is still the stick's, and the look pad does not get it. The test says so.
- **A cancelled touch is an ended one.** A phone cancels a touch when something (a notification, a palm) takes it; if only `pointerup` were heard, the runner would run forever.
- **The jump is held, not tapped.** The controller finds the key-down edge itself, and a short tap is a hop and a long one a jump, so the button reports *held*; two fingers on it need both to come up.
- **`setPointerCapture`** keeps a finger's events coming to the surface even when it slides off; it is allowed to fail (a pointer made by a test is not a real one).

### Tests

Open `tests/touchpad.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("Stick and LookPad", () => {
  QUnit.test("the stick measures from where the thumb went down, and lets go when it comes up", (assert) => {
    const stick = new Stick();
    assert.true(stick.start(1, 100, 300));
    stick.move(1, 100, 300 - TOUCH.stickRadius);
    assert.true(stick.value.amount > 0.99);
    assert.deepEqual(stick.input.forward, 1);
    assert.true(stick.end(1));
    assert.strictEqual(stick.value.amount, 0);
    assert.false(stick.active);
  });

  QUnit.test("another finger can not take the stick, nor move it, nor let it go", (assert) => {
    const stick = new Stick();
    stick.start(1, 100, 300);
    assert.false(stick.start(2, 50, 50));
    stick.move(2, 400, 400);
    assert.strictEqual(stick.dx, 0);
    assert.false(stick.end(2));
    assert.true(stick.active);
  });

  QUnit.test("the knob is drawn where the thumb is, but not past the reach of the stick", (assert) => {
    const stick = new Stick();
    stick.start(1, 0, 0);
    stick.move(1, 3 * TOUCH.stickRadius, 0);
    assert.strictEqual(stick.knob.x, TOUCH.stickRadius);
    assert.strictEqual(stick.knob.y, 0);
    stick.move(1, 20, 0);
    assert.strictEqual(stick.knob.x, 20);
  });

  QUnit.test("a drag turns the view by how far it moved, scaled, and what was taken is forgotten", (assert) => {
    const pad = new LookPad();
    pad.start(7, 500, 200);
    pad.move(7, 520, 190);
    pad.move(7, 530, 190);
    const turned = pad.take();
    assert.strictEqual(turned.dx, 30 * TOUCH.lookScale);
    assert.strictEqual(turned.dy, -10 * TOUCH.lookScale);
    assert.deepEqual(pad.take(), { dx: 0, dy: 0 });
  });

  QUnit.test("a finger that is not the look pad's does not turn the view", (assert) => {
    const pad = new LookPad();
    pad.start(7, 500, 200);
    pad.move(8, 900, 900);
    assert.deepEqual(pad.take(), { dx: 0, dy: 0 });
  });
});

QUnit.module("TouchControls", () => {
  // A surface that is a plain element, 800 pixels wide, touched by events that a test makes up.
  const setup = (enabled = true) => {
    const surface = document.createElement("div");
    const controls = new TouchControls(surface, { enabled, width: () => 800 });
    const touch = (type, id, x, y) => surface.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true }));
    return { surface, controls, touch };
  };

  QUnit.test("a finger on the left is the stick, and one on the right looks", (assert) => {
    const { controls, touch } = setup();
    touch("pointerdown", 1, 100, 400);
    touch("pointerdown", 2, 600, 400);
    assert.true(controls.stick.active);
    assert.true(controls.pad.active);
    touch("pointermove", 1, 100, 400 - TOUCH.stickRadius);
    touch("pointermove", 2, 640, 380);
    assert.strictEqual(controls.input().forward, 1);
    assert.strictEqual(controls.take().dx, 40 * TOUCH.lookScale);
  });

  QUnit.test("the stick keeps its finger when the finger wanders across the screen", (assert) => {
    const { controls, touch } = setup();
    touch("pointerdown", 1, 100, 400);
    touch("pointermove", 1, 700, 400);
    assert.true(controls.stick.active);
    assert.false(controls.pad.active);
    touch("pointerup", 1, 700, 400);
    assert.false(controls.stick.active);
  });

  QUnit.test("a cancelled touch is let go of like an ended one", (assert) => {
    const { controls, touch } = setup();
    touch("pointerdown", 1, 100, 400);
    touch("pointercancel", 1, 100, 400);
    assert.false(controls.stick.active);
  });

  QUnit.test("nothing is heard when the controls are off, and turning them off lets go of everything", (assert) => {
    const off = setup(false);
    off.touch("pointerdown", 1, 100, 400);
    assert.false(off.controls.stick.active);
    const { controls, touch } = setup(true);
    touch("pointerdown", 1, 100, 400);
    controls.jumpDown(5);
    controls.setEnabled(false);
    assert.false(controls.stick.active);
    assert.false(controls.jumpHeld);
  });

  QUnit.test("the jump is held while a finger is on the button, and two fingers need both to come up", (assert) => {
    const { controls } = setup();
    controls.jumpDown(1);
    controls.jumpDown(2);
    assert.true(controls.input().jump);
    controls.jumpUp(1);
    assert.true(controls.jumpHeld);
    controls.jumpUp(2);
    assert.false(controls.input().jump);
  });
});
```

The tests make up events (`new PointerEvent("pointerdown", { pointerId: 1, clientX: 100, ... })`) and send them to a plain element: that is how touch is tested without a phone.

Open `tests.html`. You should see **717 passing tests**: 10 more.

## Step 3: What is drawn

A player needs to see where the stick is, and where to press to jump. `TouchUi` makes them from the page's `document`: the **ring** (hidden until a thumb is down, and then drawn *where the thumb went down*, with a knob that follows it), the **jump** button, a **pause** button, and the words that ask for the phone to be turned. The stylesheet draws it all only when the body has the class `touch`, and takes away what is for a mouse (the hint, the "click to look" prompt, the crosshair).

Open `js/touchui.js` (the placeholder) and **replace the TODO line** with:

```js
// What is drawn for touch (see touchpad.js for what is touched): the ring of the stick, the jump button, the pause button, and the words that ask for the phone to be
// turned. See ../tests/touchui.tests.js and ../css/touch.css.

// The ring and the knob of the stick (only where a thumb is), the jump button, the pause button, and the words that ask for the phone
// to be turned. The buttons tell the controls which finger is on them. `doc` is the page; `controls` is a TouchControls; `onPause` is called when the pause button
// is pressed. Everything is hidden unless the page is in touch mode (the body has the class `touch`; see touch.css).
class TouchUi {
  constructor(doc, controls, { onPause = () => {} } = {}) {
    this.doc = doc;
    this.controls = controls;
    const make = (tag, className, parent, text = "") => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };
    this.root = make("div", "touch-ui", doc.body);
    this.ring = make("div", "touch-ring hidden", this.root);
    this.knob = make("div", "touch-knob", this.ring);
    this.jump = make("button", "touch-button touch-jump", this.root, "JUMP");
    this.pause = make("button", "touch-button touch-pause", this.root, "II");
    this.jump.type = "button";
    this.pause.type = "button";
    this.pause.setAttribute("aria-label", "Pause");
    this.turn = make("div", "touch-turn hidden", doc.body, "Turn your phone sideways to play");
    this.jump.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      controls.jumpDown(event.pointerId);
      this.jump.classList.add("pressed");
    });
    for (const name of ["pointerup", "pointercancel", "pointerleave"]) {
      this.jump.addEventListener(name, (event) => {
        controls.jumpUp(event.pointerId);
        if (!controls.jumpHeld) this.jump.classList.remove("pressed");
      });
    }
    this.pause.addEventListener("click", () => onPause());
  }

  // Puts the ring where the thumb went down and the knob where it is, or hides them.
  update() {
    const stick = this.controls.stick;
    this.ring.classList.toggle("hidden", !stick.active);
    if (!stick.active) return;
    this.ring.style.left = `${stick.origin.x}px`;
    this.ring.style.top = `${stick.origin.y}px`;
    const knob = stick.knob;
    this.knob.style.transform = `translate(${knob.x}px, ${knob.y}px)`;
  }

  // Says whether the phone is the wrong way up, and shows or hides the words.
  setPortrait(upright) {
    this.turn.classList.toggle("hidden", !upright);
  }

  setEnabled(on) {
    this.doc.body.classList.toggle("touch", on);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TouchUi };
} else {
  Object.assign(window, { TouchUi });
}
```

And the stylesheet. Open `css/touch.css` (the placeholder) and **replace the TODO line** with:

```css
/* Touch controls (see touch.js). Nothing of them is there unless the page is in touch mode (the body has the class `touch`): then the jump and pause buttons are drawn,
   the ring of the stick comes up where a thumb goes down, and the words that are for a mouse go away. Everything lets touches through to the picture except the buttons. */
.touch-ui,
.touch-turn {
  display: none;
}
body.touch .touch-ui {
  display: block;
}
body.touch #renderCanvas,
body.touch .touch-ui {
  touch-action: none; /* a drag is the game's, not the page's: no scrolling, no zooming */
}
body.touch .hint,
body.touch #look-prompt,
body.touch #crosshair {
  display: none;
}
.touch-ui {
  position: fixed;
  inset: 0;
  z-index: 21;
  pointer-events: none;
}
.touch-ring {
  position: fixed;
  width: 128px;
  height: 128px;
  margin: -64px 0 0 -64px;
  border: 4px solid rgba(244, 239, 230, 0.55);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.25);
  pointer-events: none;
}
.touch-ring.hidden,
.touch-turn.hidden {
  display: none;
}
.touch-knob {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 56px;
  height: 56px;
  margin: -28px 0 0 -28px;
  border-radius: 50%;
  background: rgba(255, 122, 26, 0.75);
  border: 3px solid var(--paper);
}
.touch-button {
  position: absolute;
  pointer-events: auto;
  touch-action: none;
  border: 4px solid var(--paper);
  background: rgba(0, 0, 0, 0.45);
  color: var(--paper);
  font: 22px var(--small-font);
  letter-spacing: 0.08em;
  -webkit-user-select: none;
  user-select: none;
}
.touch-jump {
  right: max(18px, env(safe-area-inset-right));
  bottom: max(26px, env(safe-area-inset-bottom));
  width: 104px;
  height: 104px;
  border-radius: 50%;
}
.touch-jump.pressed {
  background: var(--orange);
  border-color: var(--orange);
  color: var(--asphalt);
}
.touch-pause {
  left: 50%;
  margin-left: -23px;
  top: 14px;
  width: 46px;
  height: 46px;
  border-radius: 10px;
  font-size: 18px;
}
body.touch .touch-turn {
  display: flex;
  position: fixed;
  inset: 0;
  z-index: 60;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(14, 16, 20, 0.94);
  color: var(--paper);
  font: 30px / 1.3 var(--small-font);
  letter-spacing: 0.06em;
  text-align: center;
}
body.touch .touch-turn.hidden {
  display: none;
}
/* The hud is smaller and the corner is taken by the pause button's neighbour, on a phone held sideways. */
body.touch .hud {
  top: 14px;
  right: max(10px, env(safe-area-inset-right));
  width: 190px;
  transform: scale(0.85);
  transform-origin: top right;
}
```

Things to notice:

- **`touch-action: none`** tells the browser that a drag on the canvas and the buttons is the game's: no scrolling, no pinch-zoom, no pull-to-refresh under the player's thumb.
- **Only the buttons take touches.** The layer that holds them has `pointer-events: none`, so a touch anywhere else goes through to the picture below, where the stick and the look pad are listening.
- **Buttons stay out of the corners that a notch takes:** `env(safe-area-inset-*)`.

### Tests

Open `tests/touchui.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("TouchUi", () => {
  const make = () => {
    const surface = document.createElement("div");
    const controls = new TouchControls(surface, { enabled: true, width: () => 800 });
    const paused = [];
    const ui = new TouchUi(document, controls, { onPause: () => paused.push("pause") });
    return { surface, controls, ui, paused, gone: () => { ui.root.remove(); ui.turn.remove(); } };
  };

  QUnit.test("the ring is hidden until a thumb is down, and then it is where the thumb went down", (assert) => {
    const { controls, ui, gone } = make();
    ui.update();
    assert.true(ui.ring.classList.contains("hidden"));
    controls.stick.start(1, 120, 340);
    controls.stick.move(1, 150, 340);
    ui.update();
    assert.false(ui.ring.classList.contains("hidden"));
    assert.strictEqual(ui.ring.style.left, "120px");
    assert.strictEqual(ui.ring.style.top, "340px");
    assert.true(ui.knob.style.transform.includes("30px"));
    gone();
  });

  QUnit.test("the jump button tells the controls which finger is on it, and lets go", (assert) => {
    const { controls, ui, gone } = make();
    ui.jump.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 4, bubbles: true }));
    assert.true(controls.jumpHeld);
    assert.true(ui.jump.classList.contains("pressed"));
    ui.jump.dispatchEvent(new PointerEvent("pointerup", { pointerId: 4, bubbles: true }));
    assert.false(controls.jumpHeld);
    assert.false(ui.jump.classList.contains("pressed"));
    gone();
  });

  QUnit.test("the pause button calls the pause", (assert) => {
    const { ui, paused, gone } = make();
    ui.pause.click();
    assert.deepEqual(paused, ["pause"]);
    gone();
  });

  QUnit.test("the words that ask for the phone to be turned show only when it is upright, and touch mode is a class of the body", (assert) => {
    const { ui, gone } = make();
    ui.setPortrait(true);
    assert.false(ui.turn.classList.contains("hidden"));
    ui.setPortrait(false);
    assert.true(ui.turn.classList.contains("hidden"));
    ui.setEnabled(true);
    assert.true(document.body.classList.contains("touch"));
    ui.setEnabled(false);
    assert.false(document.body.classList.contains("touch"));
    gone();
  });
});
```

Open `tests.html`. You should see **721 passing tests**: 4 more.

## Step 4: The game

The game only has to ask where the input comes from. The changes, in the order they come in the file:

**Is this a phone?** It is worked out once, from the device and the address:

In `js/main.js`, after line 22, add:

```js
// Touch controls are on for a phone (a finger as the main pointer), and can be forced on or off with ?touch and ?touch=off. They are made and wired where the canvas is.
const touchOn = isTouchDevice({ coarse: window.matchMedia("(pointer: coarse)").matches, touchPoints: navigator.maxTouchPoints, search: location.search });
```

**The controls and what is drawn** are made where the keys are. A phone held upright is a pause, and the page letting go of the screen lets go of the fingers:

In `js/main.js`, after line 258, add:

```js
  const touch = new TouchControls(canvas, { enabled: touchOn });
  const touchUi = new TouchUi(document, touch, { onPause: () => pauseNow() });
  touchUi.setEnabled(touchOn);
  const checkOrientation = () => {
    const upright = touch.enabled && needsLandscape(window.innerWidth, window.innerHeight);
    touchUi.setPortrait(upright);
    if (upright) pauseNow(); // the phone was turned the wrong way up: the world stops
  };
  window.addEventListener("resize", checkOrientation);
  window.addEventListener("orientationchange", checkOrientation);
  window.addEventListener("blur", () => touch.release());
```

**A phone has no mouse to take.** After Play or Resume the game asks for the mouse; on a phone it does nothing:

In `js/main.js`, after line 274, add:

```js
  game.takeMouse = () => touch.enabled || look.lock(); // a phone has no mouse to take
```

**Each frame** the drag turns the view with the mouse's turn, and the thumbs and the keys are put together before the body is told where to go:

In `js/main.js`, **replace** lines 297 to 299:

```js
    if (running) orbit.look(turned.dx, turned.dy);

    const input = moveInput(heldKeys);
```

with:

```js
    const dragged = touch.take();
    if (running) orbit.look(turned.dx + dragged.dx, turned.dy + dragged.dy);

    const input = touch.enabled ? mergeInput(moveInput(heldKeys), touch.input()) : moveInput(heldKeys);
```

In `js/main.js`, after line 312, add:

```js
    touchUi.update();
```

**The developer panel** has a new section:

In `js/main.js`, after line 445, add:

```js
          title: "Touch",
          rows: [
            toggle("touch controls", () => touch.enabled, (value) => { touch.setEnabled(value); touchUi.setEnabled(value); }),
            slider("stick reach", touch.table, "stickRadius", 30, 120, 1),
            slider("dead zone", touch.table, "deadZone", 0, 0.5, 0.01),
            slider("sprint at", touch.table, "sprintAt", 0.5, 1, 0.01),
            slider("look scale", touch.table, "lookScale", 0.5, 4, 0.1),
            slider("stick zone", touch.table, "stickZone", 0.2, 0.7, 0.01),
            readout("stick", () => (touch.stick.active ? `${touch.stick.value.amount.toFixed(2)}${touch.stick.input.sprint ? " sprint" : ""}` : "none")),
            readout("jump button", () => (touch.jumpHeld ? "held" : "up")),
            readout("fingers", () => `${touch.stick.active ? "stick" : "-"} ${touch.pad.active ? "look" : "-"}`),
          ],
        },
        {
```

In `js/main.js`, **replace** line 488:

```js
    window.dev = { scene, body, world, sky, orbit, panel, look, shadows, flow, collection, trial, hud, records, sound, screenFlow, game }; // for poking at from the console
```

with:

```js
    window.dev = { scene, body, world, sky, orbit, panel, look, shadows, flow, collection, trial, hud, records, sound, screenFlow, game, touch, touchUi }; // for poking at from the console
```

**And the screens use the new way** to take the mouse:

In `js/main.js`, **replace** line 553:

```js
        game.look.lock();
```

with:

```js
        game.takeMouse();
```

In `js/main.js`, **replace** line 558:

```js
        game.look.lock();
```

with:

```js
        game.takeMouse();
```

In `js/main.js`, **replace** line 563:

```js
        game.look.lock();
```

with:

```js
        game.takeMouse();
```

### Try it

Open `index.html?dev&touch` on a computer, or the page on a phone (it needs to be served over the network; see the series README). You should see:

- the title (tap **Play**): the game begins, with a **JUMP** button at the right and a pause button at the top
- put a thumb (or the mouse) down on the **left** and push up: a ring comes up where you touched, and the runner runs; push all the way and it **sprints**
- drag on the **right**: the view turns
- hold **JUMP** for a long jump, tap it for a hop; vault, climb and kick off walls work as they did, because the controller does not know it is a thumb
- the pause button: the pause screen comes up (its buttons are taps)
- turn the phone upright: the game asks for it to be turned back, and has paused
- in the developer panel, **Touch** has the numbers to tune the feel

### Tests

Open `tests.html`. You should see **721 passing tests**: 0 more (none: the game is not what the tests are about, and everything they say about it is in the files above).

## Stretch goals

- **A second thumb on the screen for sprint,** instead of the push, if players find the push hard to judge.
- **A floating jump button** that is where the right thumb went down, like the stick.
- **Haptics:** `navigator.vibrate` on a hard landing.
- **Full screen:** a button that asks the browser for full screen, so the address bar goes.

## What you've learned

- How to read fingers with pointer events, and why a finger's id is what keeps the stick and the look pad apart
- How a dead zone and a stretched range make a stick feel right
- How to give touch and the keyboard one language, so the game does not know which it is hearing
- How to keep the browser's scrolling and zooming from the game
- How to test touch with made-up events

The last step is a different kind of game: a **city made from a seed**.
