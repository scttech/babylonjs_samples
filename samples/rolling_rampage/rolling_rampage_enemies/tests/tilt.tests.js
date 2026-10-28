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
});
