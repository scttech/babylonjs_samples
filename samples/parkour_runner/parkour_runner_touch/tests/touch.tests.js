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
