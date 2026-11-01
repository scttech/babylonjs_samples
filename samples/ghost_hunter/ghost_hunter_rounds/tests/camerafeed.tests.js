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
