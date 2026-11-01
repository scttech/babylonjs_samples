QUnit.module("xrAvailable, chooseExperience and xrStatus", () => {
  QUnit.test("a browser with no xr says no", async (assert) => {
    assert.false(await xrAvailable({}));
    assert.false(await xrAvailable(null));
    assert.false(await xrAvailable({ xr: {} }));
  });

  QUnit.test("it asks for augmented reality, and believes the answer", async (assert) => {
    let asked = null;
    const nav = { xr: { isSessionSupported: async (mode) => { asked = mode; return true; } } };
    assert.true(await xrAvailable(nav));
    assert.strictEqual(asked, "immersive-ar");
    assert.false(await xrAvailable({ xr: { isSessionSupported: async () => false } }));
  });

  QUnit.test("a question that fails is a no", async (assert) => {
    assert.false(await xrAvailable({ xr: { isSessionSupported: async () => { throw new Error("blocked"); } } }));
  });

  QUnit.test("it is used when it can be, and not when the address says not", (assert) => {
    assert.strictEqual(chooseExperience(true, ""), "xr");
    assert.strictEqual(chooseExperience(true, "?dev"), "xr");
    assert.strictEqual(chooseExperience(true, "?xr=off"), "camera");
    assert.strictEqual(chooseExperience(false, ""), "camera");
  });

  QUnit.test("says something only when there is something to say", (assert) => {
    assert.strictEqual(xrStatus(false, ""), "");
    assert.true(xrStatus(true, "").includes("floor"));
    assert.true(xrStatus(true, "?xr=off").includes("switched off"));
  });
});

QUnit.module("sessionInit", () => {
  QUnit.test("asks for the table's features", (assert) => {
    const init = sessionInit(null);
    assert.deepEqual(init.requiredFeatures, XR.required);
    assert.deepEqual(init.optionalFeatures, XR.optional);
    assert.false("domOverlay" in init);
  });

  QUnit.test("gives the page as the overlay when there is one", (assert) => {
    const root = {};
    assert.strictEqual(sessionInit(root).domOverlay.root, root);
  });

  QUnit.test("the finding of surfaces is required, and anchors are not", (assert) => {
    assert.true(XR.required.includes("hit-test"));
    assert.false(XR.required.includes("anchors"));
    assert.true(XR.optional.includes("anchors"));
  });

  QUnit.test("it does not change the table", (assert) => {
    sessionInit({}).requiredFeatures.push("x");
    assert.false(XR.required.includes("x"));
  });
});

QUnit.module("surfaceFromHit and ArSession", () => {
  const hitAt = (x, y, z, rotation = new BABYLON.Quaternion()) => ({
    transformationMatrix: BABYLON.Matrix.Compose(new BABYLON.Vector3(1, 1, 1), rotation, new BABYLON.Vector3(x, y, z)),
  });

  const fakeObservable = () => {
    const callbacks = [];
    return { add: (callback) => callbacks.push(callback), notify: (value) => callbacks.forEach((callback) => callback(value)) };
  };

  // What Babylon.js gives (the parts of it that are used), made of plain objects.
  const fakeScene = ({ anchorsWork = true } = {}) => {
    const log = { entered: null, sessionEvents: {} };
    const hitTest = { onHitTestResultObservable: fakeObservable() };
    const anchors = {
      added: [],
      addAnchorPointUsingHitTestResultAsync: async (hit) => {
        if (!anchorsWork) throw new Error("no anchors");
        log.anchoredHit = hit;
        return { attachedNode: { name: "anchor-node" } };
      },
    };
    const state = fakeObservable();
    const experience = {
      renderTarget: { name: "target" },
      baseExperience: {
        featuresManager: {
          enableFeature: (name) => {
            log.features = (log.features || []).concat(name);
            if (name === "xr-hit-test") return hitTest;
            if (!anchorsWork) throw new Error("not supported");
            return anchors;
          },
        },
        onStateChangedObservable: state,
        sessionManager: { session: { addEventListener: (type, callback) => { log.sessionEvents[type] = callback; } } },
        enterXRAsync: async (...args) => { log.entered = args; },
        exitXRAsync: async () => { log.exited = true; },
      },
    };
    return { scene: { createDefaultXRExperienceAsync: async (options) => { log.options = options; return experience; } }, log, hitTest, state };
  };
  const api = { WebXRFeatureName: { HIT_TEST: "xr-hit-test", ANCHOR_SYSTEM: "xr-anchor-system" }, WebXRState: { IN_XR: 2, NOT_IN_XR: 3 } };

  QUnit.test("a hit becomes a surface", (assert) => {
    const surface = surfaceFromHit(hitAt(1, 0.5, -2));
    assert.deepEqual(surface.point.map((n) => Math.round(n * 1000) / 1000), [1, 0.5, -2]);
    assert.deepEqual(surface.normal.map((n) => Math.round(n)), [0, 1, 0]);
    assert.false(surface.guessed);
  });

  QUnit.test("a hit that is turned has a normal that is turned", (assert) => {
    const surface = surfaceFromHit(hitAt(0, 1, 0, BABYLON.Quaternion.RotationAxis(BABYLON.Vector3.Right(), Math.PI / 2)));
    assert.false(isFloor(surface));
  });

  QUnit.test("create turns on the finding of surfaces, and has no default button", async (assert) => {
    const { scene, log } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    assert.true(log.options.disableDefaultUI);
    assert.deepEqual(log.features, ["xr-hit-test", "xr-anchor-system"]);
    assert.strictEqual(ar.surface(), null, "nothing found yet");
  });

  QUnit.test("the newest hit is the surface, and no hit is no surface", async (assert) => {
    const { scene, hitTest } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    hitTest.onHitTestResultObservable.notify([hitAt(0, 0, 2), hitAt(0, 0, 5)]);
    assert.strictEqual(Math.round(ar.surface().point[2]), 2, "the first of the hits is the nearest");
    hitTest.onHitTestResultObservable.notify([]);
    assert.strictEqual(ar.surface(), null);
  });

  QUnit.test("enter starts the session of the table, over the page", async (assert) => {
    const { scene, log } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    const root = {};
    await ar.enter(root);
    assert.strictEqual(log.entered[0], "immersive-ar");
    assert.strictEqual(log.entered[1], "local-floor");
    assert.strictEqual(log.entered[2].name, "target");
    assert.strictEqual(log.entered[3].domOverlay.root, root);
    assert.deepEqual(log.entered[3].requiredFeatures, ["hit-test"]);
  });

  QUnit.test("it tells when the session starts and ends, and passes on a select", async (assert) => {
    const { scene, log, state } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    const told = [];
    ar.onEnter(() => told.push("enter"));
    ar.onExit(() => told.push("exit"));
    ar.onSelect(() => told.push("select"));
    state.notify(2);
    assert.true(ar.inside);
    log.sessionEvents.select();
    state.notify(3);
    assert.false(ar.inside);
    assert.deepEqual(told, ["enter", "select", "exit"]);
  });

  QUnit.test("anchoring gives the node of the anchor, or nothing", async (assert) => {
    const working = fakeScene();
    const ar = new ArSession(working.scene, api);
    await ar.create();
    assert.strictEqual(await ar.anchorHere(), null, "nothing to anchor yet");
    working.hitTest.onHitTestResultObservable.notify([hitAt(0, 0, 2)]);
    assert.strictEqual((await ar.anchorHere()).name, "anchor-node");

    const broken = fakeScene({ anchorsWork: false });
    const plain = new ArSession(broken.scene, api);
    await plain.create();
    broken.hitTest.onHitTestResultObservable.notify([hitAt(0, 0, 2)]);
    assert.strictEqual(await plain.anchorHere(), null, "a phone without anchors still plays");
  });

  QUnit.test("leaving does nothing if it never started", async (assert) => {
    const { scene, log } = fakeScene();
    const ar = new ArSession(scene, api);
    await ar.create();
    await ar.exit();
    assert.true(log.exited === undefined);
  });
});
