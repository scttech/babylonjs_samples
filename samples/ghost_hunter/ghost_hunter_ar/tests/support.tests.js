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
