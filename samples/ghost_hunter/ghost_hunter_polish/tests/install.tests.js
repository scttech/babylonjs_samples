QUnit.module("which requests the worker answers", () => {
  const origin = "https://example.test";

  QUnit.test("the game's own scripts, styles, models, sounds and pictures are kept, and so is the page", (assert) => {
    for (const path of ["/g/js/main.js", "/g/css/page.css", "/assets/creatures/mummy.glb", "/assets/music/a.mp3", "/assets/images/x.webp", "/assets/fonts/y.ttf", "/g/index.html", "/g/manifest.webmanifest", "/g/"]) {
      assert.strictEqual(cacheDecision(origin + path, "GET", origin), "cache", path);
    }
  });

  QUnit.test("anything that is not a plain GET is left alone", (assert) => {
    assert.strictEqual(cacheDecision(origin + "/g/js/main.js", "POST", origin), "network");
    assert.strictEqual(cacheDecision(origin + "/g/js/main.js", "PUT", origin), "network");
  });

  QUnit.test("the libraries that come from other places are never kept, nor are other origins", (assert) => {
    for (const url of ["https://cdn.babylonjs.com/babylon.js", "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js", "https://huggingface.co/x/model.onnx", "https://code.jquery.com/qunit.js", "https://other.test/g/js/main.js"]) {
      assert.strictEqual(cacheDecision(url, "GET", origin), "network", url);
    }
  });

  QUnit.test("what is not a kind of file the game is made of is left alone, and a bad address does not stop it", (assert) => {
    assert.strictEqual(cacheDecision(origin + "/g/api/scores", "GET", origin), "network");
    assert.strictEqual(cacheDecision("http://[bad", "GET", origin), "network");
  });
});

QUnit.module("the caches", () => {
  QUnit.test("old versions of the game's cache are stale; the present one and other sites' are not", (assert) => {
    assert.deepEqual(staleCaches(["ghost-hunter-v0", "ghost-hunter-v1", "ghost-hunter-v2", "something-else", "ghost-hunter-v0-x"], { ...INSTALL, cache: "ghost-hunter-v2" }), ["ghost-hunter-v0", "ghost-hunter-v1"]);
    assert.deepEqual(staleCaches([INSTALL.cache]), []);
  });

  QUnit.test("every file of the shell is a path that is not empty, and none is listed twice", (assert) => {
    assert.strictEqual(new Set(INSTALL.shell).size, INSTALL.shell.length);
    assert.true(INSTALL.shell.every((path) => path.length > 0));
    assert.true(INSTALL.shell.includes("index.html") && INSTALL.shell.includes("manifest.webmanifest"));
  });

  QUnit.test("every file of the shell is really there, and is something the worker would keep", async (assert) => {
    for (const path of INSTALL.shell) {
      const response = await fetch(path);
      assert.true(response.ok, `${path}: ${response.status}`);
      assert.strictEqual(cacheDecision(new URL(path, location.href).href, "GET", location.origin), "cache", `${path} is kept`);
    }
  });
});

QUnit.module("the manifest", () => {
  QUnit.test("it is a manifest with a name, a start page inside its scope, colours that are the game's, and an icon that is there", async (assert) => {
    const manifest = await (await fetch("manifest.webmanifest")).json();
    assert.strictEqual(manifest.name, "Ghost Hunter");
    assert.true(manifest.short_name.length <= 12);
    assert.strictEqual(manifest.start_url, "./index.html");
    assert.strictEqual(manifest.scope, "./");
    assert.true(["fullscreen", "standalone"].includes(manifest.display));
    assert.strictEqual(manifest.theme_color, "#05080d");
    assert.true(manifest.icons.length >= 1);
    const icon = await fetch(manifest.icons[0].src);
    assert.true(icon.ok, "the icon");
  });
});

QUnit.module("what to tell a person who wants it on the home screen", () => {
  QUnit.test("nothing if it is installed already", (assert) => {
    assert.deepEqual(installAdvice({ standalone: true, canPrompt: true }), { kind: "installed", text: "" });
  });

  QUnit.test("the button where the browser can do it, and the steps by hand on an iPhone, which has no button", (assert) => {
    assert.strictEqual(installAdvice({ canPrompt: true, userAgent: "Mozilla/5.0 (Linux; Android 14)" }).kind, "prompt");
    const phone = installAdvice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)" });
    assert.strictEqual(phone.kind, "steps");
    assert.true(phone.text.includes("Add to Home Screen"));
    assert.strictEqual(installAdvice({ userAgent: "Mozilla/5.0 (X11; Linux x86_64)" }).kind, "none");
  });
});

QUnit.module("InstallOffer", () => {
  // A window that can be sent events, and a browser's offer that can be accepted.
  const stand = () => {
    const target = new EventTarget();
    target.navigator = { userAgent: "Android" };
    target.matchMedia = () => ({ matches: false });
    return target;
  };
  const offerEvent = (outcome = "accepted") => {
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({ outcome });
    return event;
  };

  QUnit.test("there is no offer until the browser makes one, and then the button is possible", (assert) => {
    const win = stand();
    const told = [];
    const offer = new InstallOffer(win, () => told.push("changed"));
    assert.false(offer.canPrompt);
    assert.strictEqual(offer.advice().kind, "none");
    const event = offerEvent();
    win.dispatchEvent(event);
    assert.true(offer.canPrompt);
    assert.true(event.defaultPrevented, "the browser's own bar does not come");
    assert.strictEqual(offer.advice().kind, "prompt");
    assert.deepEqual(told, ["changed"]);
  });

  QUnit.test("pressing it asks the browser, says what the player chose, and the offer is used up", async (assert) => {
    const win = stand();
    const offer = new InstallOffer(win);
    win.dispatchEvent(offerEvent("accepted"));
    assert.strictEqual(await offer.prompt(), "accepted");
    assert.false(offer.canPrompt);
    assert.strictEqual(await offer.prompt(), "unavailable");
  });

  QUnit.test("an installed game forgets the offer", (assert) => {
    const win = stand();
    const offer = new InstallOffer(win);
    win.dispatchEvent(offerEvent());
    win.dispatchEvent(new Event("appinstalled"));
    assert.false(offer.canPrompt);
  });

  QUnit.test("a browser with no workers is told so, and a worker that will not register is not a reason to stop", async (assert) => {
    assert.false(await registerWorker({ navigator: {} }));
    assert.false(await registerWorker(null));
    assert.false(await registerWorker({ navigator: { serviceWorker: { register: async () => { throw new Error("no"); } } } }));
    assert.true(await registerWorker({ navigator: { serviceWorker: { register: async () => ({}) } } }));
  });

  QUnit.test("standalone is told from the display mode, or an iPhone's own flag", (assert) => {
    assert.true(isStandalone({ matchMedia: () => ({ matches: true }) }));
    assert.true(isStandalone({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }));
    assert.false(isStandalone({ matchMedia: () => ({ matches: false }), navigator: {} }));
    assert.false(isStandalone(null));
  });
});
