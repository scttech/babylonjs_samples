# Tutorial: Ghost Hunter Polish -- A Game That Can Be Given to Someone

This is the fifteenth and last tutorial of the Ghost Hunter series. The game works, and it is made to frighten, which is not a thing every person wants, all of the time. This sample is what makes it a game that can be **given to someone**: a **calm** way to play for people who do not want to be startled, settings to take out the shaking, the flashing and the buzzing, the game as an **app** on the home screen that starts with no network, and a **photograph** of the moment you jumped.

By the end you'll have:

- **Calm**: a fourth scare level in which nothing can hurt you and nothing jumps out (the dark and the hunt remain), and **comfort settings** that go with any level: reduce shaking and flashing (chosen at once if the phone is set to reduce motion) and vibration, kept in the browser
- **Install**: a **manifest** (the name, the colours, the icon), a **service worker** that keeps the game's files so that it starts offline, and a button that asks the browser to put it on the home screen (and the steps, on an iPhone, which has no button)
- **A photograph**: the camera's picture and the scene put together on a canvas with a frame and the name of the game, taken a moment after every strike, and **shared** (the phone's own share sheet) or **downloaded**; and the moment you jumped on the screen at the end of a round
- The **game** with all of it, and a **Polish** section in the developer panel
- Unit tests for all of it: **539 passing tests**

**What you'll learn:** why a frightening game must be possible to play gently and how to build that as a feature, how a service worker decides what to keep (and is tested without being run), what makes a page installable, how to draw a photograph out of a video and a WebGL canvas (and why it must be done right after the scene is drawn), and how to share a file from a page.

**Before you start:** do the [Rounds tutorial](../ghost_hunter_rounds/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Rounds sample, plus placeholders for the new files and their tests:

```
ghost_hunter_polish/
├── index.html, tests.html   (already list the new scripts and stylesheet, and link the manifest)
├── manifest.webmanifest     (placeholder -- Step 2)
├── sw.js                    (placeholder -- Step 2)
├── css/
│   ├── polish.css          (placeholder -- Step 2)
│   └── everything else, from the Rounds sample
├── js/
│   ├── comfort.js          (placeholder -- Step 1)
│   ├── install.js          (placeholder -- Step 2)
│   ├── photo.js            (placeholder -- Step 3)
│   ├── polishui.js         (placeholder -- Step 4)
│   ├── main.js             (changes -- Step 5)
│   └── everything else, from the Rounds sample
└── tests/
    ├── comfort.tests.js, install.tests.js, photo.tests.js, polishui.tests.js   (placeholders)
    └── everything else, from the Rounds sample
```

Open `tests.html` before you change anything. You should see **499 passing tests**.

### Serving the page

A service worker, a camera, and the install button all need a **secure context**: HTTPS, or `localhost` on the same computer. See the [series README](../README.md) for ways to try it on a phone. Add **`?dev`** to the address for the developer panel.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the step

1. **Comfort**: calm as a level, and the settings that go with any.
2. **Install**: the manifest, the worker, and the button.
3. **The photograph.**
4. **What is drawn.**
5. **The game.**

## Step 1: Comfort

A game made to frighten has to be possible to play by somebody who does not want to be startled, flashed at, shaken or buzzed. That is a feature to build, not an apology, and it is not hard if the game's rules are in tables, as these are.

There are two things:

- **Calm** is a **scare level of its own**: a fourth button next to Gentle, Creepy and Terrifying. In it nothing can hurt you (no damage from a touch), nothing jumps out at the edge of the screen (a pop is only a peek), a strike does not make the lights stutter out, and the hunt is half as hard. The dark and the hunt remain; the fright does not. Its row has every number that the other levels have (a test says so), so that the scare code reads it without knowing that it is special, and `comfortFor` says what each level means for the game's *rules*.
- **Comfort settings** are two switches that go with any level: **reduce shaking and flashing** (a level that is chosen has its shake and flash taken to nothing, and the picture does not sway or change colour as sanity falls), and **vibration**. If the phone is set to *reduce motion* (the operating system's own setting, `prefers-reduced-motion`), the first visit begins with it reduced.

The settings are kept in the browser, which may refuse them, and read back only when they make sense (a word is not a yes). The storage is given to `ComfortSettings`, so a test can give one that throws, as in every part of the series that keeps something.

Open `js/comfort.js` (the placeholder) and **replace the TODO line** with:

```js
// Comfort: the ways a person can have the game gentler than it comes. A game made to frighten has to be one that can be played by somebody who does not want to be
// startled, flashed at, shaken or buzzed, and that is a feature to build, not an apology. There are two things. **Calm** is a scare level of its own (a fourth button
// next to Gentle, Creepy and Terrifying) in which nothing can hurt you and nothing jumps out: the dark and the hunt remain, and the fright does not. **Comfort
// settings** are three switches that go with any level: reduce shaking and flashing (which is chosen at once if the phone is set to reduce motion), vibration, and the
// sound. They are kept in the browser, which may refuse them, and read back only when they make sense. Everything here is plain numbers and arithmetic, with the storage
// given, so a test can say what Calm changes. See ../tests/comfort.tests.js.

// What the calm level changes in the game, by the name of the level: how much of the damage of a touch is taken (none), whether a pop jumps out at the edge of the screen
// (it does not), how much of the director's intensity is used (half), and whether a strike makes the lights stutter out (it does not).
const COMFORT = {
  levels: {
    calm: { damage: 0, pops: false, intensity: 0.5, strikes: false },
  },
  normal: { damage: 1, pops: true, intensity: 1, strikes: true },
  key: "ghost-hunter.comfort",
  defaults: { reduceMotion: false, vibration: true },
  // What reducing motion takes out of the level that is chosen: the shaking, the flashing (a blackout is a flash), and the sway of the picture when sanity is low.
  reduce: { shake: 0, flash: 0, sway: false },
};

// The Calm row of the scare levels, to add to SCARE.levels.
const CALM_LEVEL = {
  label: "Calm",
  note: "No scares. Nothing can hurt you and nothing jumps out: only the dark, and the hunt.",
  volume: 0.4,
  flash: 0,
  shake: 0,
  vibrate: 0,
  silence: 0.3,
  vignette: 0.15,
  calm: true,
};

// What a level means for the game's rules, as { damage, pops, intensity, strikes } (the normal ones for a level that is not in the table).
function comfortFor(levelName, table = COMFORT) {
  return { ...table.normal, ...(table.levels[levelName] || {}) };
}

// The row of the scare level that is really used: the chosen one, with the settings applied: no shaking and no flashing if motion is reduced, and no vibration if it is off.
function effectiveLevel(level, settings, table = COMFORT) {
  const out = { ...level };
  if (settings.reduceMotion) {
    out.shake = table.reduce.shake;
    out.flash = table.reduce.flash;
  }
  if (!settings.vibration) out.vibrate = 0;
  return out;
}

// Whether the screen should sway and change colour as sanity falls: not if motion is reduced.
function swayAllowed(settings, table = COMFORT) {
  return !settings.reduceMotion || table.reduce.sway;
}

// The settings that a first visit begins with: the defaults, with motion reduced if the phone says so (`prefersReduced` is the answer to matchMedia("(prefers-reduced-motion: reduce)")).
function firstSettings(prefersReduced, table = COMFORT) {
  return { ...table.defaults, reduceMotion: Boolean(prefersReduced) || table.defaults.reduceMotion };
}

class ComfortSettings {
  // `storage` is anything with getItem, setItem and removeItem (the page's localStorage, or a stand-in).
  constructor(storage, prefersReduced = false, table = COMFORT) {
    this.storage = storage;
    this.table = table;
    let raw = null;
    try {
      raw = JSON.parse(storage.getItem(table.key));
    } catch (error) {
      raw = null; // nothing kept, unreadable, or storage that throws
    }
    const first = firstSettings(prefersReduced, table);
    const kept = raw && typeof raw === "object" ? raw : {};
    this.reduceMotion = typeof kept.reduceMotion === "boolean" ? kept.reduceMotion : first.reduceMotion;
    this.vibration = typeof kept.vibration === "boolean" ? kept.vibration : first.vibration;
  }

  toJSON() {
    return { reduceMotion: this.reduceMotion, vibration: this.vibration };
  }

  // Changes a setting (a name that is one of the two) to a yes or a no, and keeps it. Gives whether it was kept.
  set(name, value) {
    if (name !== "reduceMotion" && name !== "vibration") return false;
    this[name] = Boolean(value);
    try {
      this.storage.setItem(this.table.key, JSON.stringify(this));
      return true;
    } catch (error) {
      return false; // good for this visit only
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { COMFORT, CALM_LEVEL, comfortFor, effectiveLevel, swayAllowed, firstSettings, ComfortSettings };
} else {
  Object.assign(window, { COMFORT, CALM_LEVEL, comfortFor, effectiveLevel, swayAllowed, firstSettings, ComfortSettings });
}
```

Things to notice:

- **`effectiveLevel` does not change the level;** it makes a copy with the settings put over it, so that the level as it comes is still there when a setting is switched off again.
- **A chosen setting wins over what the phone says,** and the phone's wish is only what a *first* visit begins with.

### Tests

Open `tests/comfort.tests.js` (the placeholder) and **replace the TODO line** with:

```js
const comfortStore = (start = {}, { refuse = false } = {}) => {
  const kept = { ...start };
  return {
    kept,
    getItem(key) {
      if (refuse) throw new Error("no storage");
      return key in kept ? kept[key] : null;
    },
    setItem(key, value) {
      if (refuse) throw new Error("no storage");
      kept[key] = String(value);
    },
  };
};

QUnit.module("calm, as a level", () => {
  QUnit.test("calm takes the damage, the pops and the strikes out, and the intensity down; any other level is as it was", (assert) => {
    const calm = comfortFor("calm");
    assert.strictEqual(calm.damage, 0);
    assert.false(calm.pops);
    assert.false(calm.strikes);
    assert.true(calm.intensity < 1);
    for (const name of ["gentle", "creepy", "terrifying", "nonsense"]) assert.deepEqual(comfortFor(name), COMFORT.normal, name);
  });

  QUnit.test("the calm row has nothing that flashes, shakes or buzzes, and says what it is", (assert) => {
    assert.strictEqual(CALM_LEVEL.flash, 0);
    assert.strictEqual(CALM_LEVEL.shake, 0);
    assert.strictEqual(CALM_LEVEL.vibrate, 0);
    assert.true(CALM_LEVEL.calm);
    assert.true(CALM_LEVEL.note.includes("No scares"));
  });

  QUnit.test("it has every number that the other levels have, so the scare code can read it", (assert) => {
    for (const key of Object.keys(SCARE.levels.creepy)) assert.true(key in CALM_LEVEL, key);
  });
});

QUnit.module("effectiveLevel and the settings", () => {
  const creepy = SCARE.levels.creepy;

  QUnit.test("with nothing reduced, the level is as it was", (assert) => {
    assert.deepEqual(effectiveLevel(creepy, { reduceMotion: false, vibration: true }), creepy);
  });

  QUnit.test("reducing motion takes out the shake and the flash, and leaves the rest", (assert) => {
    const level = effectiveLevel(creepy, { reduceMotion: true, vibration: true });
    assert.strictEqual(level.shake, 0);
    assert.strictEqual(level.flash, 0);
    assert.strictEqual(level.volume, creepy.volume);
    assert.strictEqual(level.vibrate, creepy.vibrate);
    assert.true(creepy.shake > 0, "and the level itself is not changed");
  });

  QUnit.test("no vibration takes out the buzz", (assert) => {
    assert.strictEqual(effectiveLevel(creepy, { reduceMotion: false, vibration: false }).vibrate, 0);
  });

  QUnit.test("the picture does not sway when motion is reduced", (assert) => {
    assert.true(swayAllowed({ reduceMotion: false }));
    assert.false(swayAllowed({ reduceMotion: true }));
  });

  QUnit.test("a first visit begins with motion reduced if the phone says so", (assert) => {
    assert.deepEqual(firstSettings(true), { reduceMotion: true, vibration: true });
    assert.deepEqual(firstSettings(false), { reduceMotion: false, vibration: true });
  });
});

QUnit.module("ComfortSettings", () => {
  QUnit.test("a new player has the defaults, and the phone's wish to reduce motion", (assert) => {
    const settings = new ComfortSettings(comfortStore(), true);
    assert.true(settings.reduceMotion);
    assert.true(settings.vibration);
  });

  QUnit.test("what was chosen is kept and read back, and it wins over what the phone says", (assert) => {
    const store = comfortStore();
    const first = new ComfortSettings(store, true);
    assert.true(first.set("reduceMotion", false));
    first.set("vibration", false);
    const second = new ComfortSettings(store, true);
    assert.false(second.reduceMotion);
    assert.false(second.vibration);
  });

  QUnit.test("only the two settings can be set, to a yes or a no", (assert) => {
    const settings = new ComfortSettings(comfortStore(), false);
    assert.false(settings.set("volume", true));
    assert.strictEqual(settings.volume, undefined);
    settings.set("vibration", 0);
    assert.strictEqual(settings.vibration, false);
  });

  QUnit.test("nonsense in the storage is not believed, and storage that refuses is allowed to", (assert) => {
    assert.true(new ComfortSettings(comfortStore({ [COMFORT.key]: "{not json" })).vibration);
    assert.true(new ComfortSettings(comfortStore({ [COMFORT.key]: JSON.stringify({ reduceMotion: "yes", vibration: 3 }) })).vibration, "a word is not a yes");
    const refused = new ComfortSettings(comfortStore({}, { refuse: true }), false);
    assert.false(refused.set("vibration", false), "not kept");
    assert.false(refused.vibration, "but it is so for this visit");
  });
});
```

Open `tests.html`. You should see **511 passing tests**: 12 more.

## Step 2: Install

A page can be put on a phone's home screen and opened without the browser's bars, and it can start with **no network at all**. It takes three small things.

**A manifest** says what the app is: its name, the page it starts at (`./index.html`), how much of the folder it covers (`./`), whether it takes the whole screen, the colours it draws in before it has loaded (the night colour of the game, so there is no white flash), and an icon.

**A service worker** is a script that the browser runs in its own thread, which sits between the page and the network: every request the page makes goes past it first, and it can answer from what it has kept. The game's worker does three things:

- when it is **installed**, it fetches and keeps the **shell**: the page, the stylesheets, the logo and the fonts. All or none: if any is missing, it is not installed;
- when it is **activated**, it throws away the caches of old versions of the game (`ghost-hunter-v0`, when this is `ghost-hunter-v1`);
- for **every request**, it asks `cacheDecision`: a plain GET of one of the game's own files of a kind that is kept (scripts, stylesheets, models, music, pictures, the page) is answered from what is kept, or fetched and kept the first time; everything else (the libraries that come from other places, anything that is not a GET) is left alone.

The rules are the plain functions of `install.js`, and `sw.js` loads that file (`importScripts`), so **the worker and the tests use the same code**. That is the reason this is testable: the worker itself cannot be run in a test, but what it decides can.

**The button.** When the game can be installed, Android's Chrome sends the page an event, `beforeinstallprompt`. The page holds on to it (and stops the browser's own bar from coming), shows its own button, and calls the event's `prompt()` when it is pressed. An iPhone has no such event, and has to be told how to do it by hand (Share, then Add to Home Screen): `installAdvice` says what to tell whom.

Open `js/install.js` (the placeholder) and **replace the TODO line** with:

```js
// Install: the game as an app. A web page can be put on the home screen of a phone, open without the browser's bars, and — with a **service worker** that keeps the files
// the game is made of — start with no network at all. That takes three small things: a **manifest** (the name, the colours, the icon), a **service worker** (`sw.js`, which
// uses the numbers and the plain functions of this file: it is loaded by it with `importScripts`), and the **button** that asks the browser to install (Android's Chrome
// offers it; an iPhone has no such button, and has to be told how to do it by hand). The rules (which files to keep, which requests are the worker's to answer, what to say
// to whom) are plain functions, so a test can say them without a worker. See ../tests/install.tests.js and ../sw.js.

const INSTALL = {
  cache: "ghost-hunter-v1", // change the number when the files change, and the old ones go
  // The files of the game that must be there with no network: the page, the stylesheets, the logo and the fonts (a list of paths from the folder of the page). The scripts, the models and the
  // music are kept as they are fetched (see `kept`): the first visit is what fills the cache, and the page itself is enough to begin with.
  shell: [
    "index.html",
    "manifest.webmanifest",
    "css/theme.css",
    "css/page.css",
    "css/start.css",
    "css/scare.css",
    "css/tools.css",
    "css/detectors.css",
    "css/rounds.css",
    "css/polish.css",
    "css/devpanel.css",
    "../assets/images/ghost_hunter_logo.webp",
    "../assets/images/ghost_hunter_logo_small.webp",
    "../assets/fonts/RubikWetPaint-Regular.ttf",
    "../assets/fonts/ShareTechMono-Regular.ttf",
  ],
  // What is kept as it is fetched, and not before (the models and the music are large, and a phone does not want them all at once): a file with one of these endings.
  kept: [".js", ".css", ".glb", ".mp3", ".webp", ".ttf", ".html", ".webmanifest", ".onnx"],
  // What is never kept: the libraries that come from other places (the page's own files are the worker's), and anything that is not a plain fetch.
  never: ["cdn.babylonjs.com", "cdn.jsdelivr.net", "huggingface.co", "code.jquery.com"],
};

// What the worker does with a request: "cache" (answer from what is kept, fetch and keep it if it is not), or "network" (leave it alone). `url` is the address of the request,
// `method` its method, and `origin` the origin of the page: only plain GETs of the page's own files, of the kinds that are kept, are the worker's.
function cacheDecision(url, method = "GET", origin = "", table = INSTALL) {
  if (method !== "GET") return "network";
  let address;
  try {
    address = new URL(url, origin || "http://localhost/");
  } catch (error) {
    return "network";
  }
  if (table.never.some((host) => address.host.includes(host))) return "network";
  if (origin && address.origin !== origin) return "network";
  const path = address.pathname;
  if (path.endsWith("/")) return "cache";
  return table.kept.some((ending) => path.endsWith(ending)) ? "cache" : "network";
}

// The names of the caches that are old, from the names there are now: every one that begins with the game's name and is not the current one.
function staleCaches(names, table = INSTALL) {
  const family = new RegExp("^" + table.cache.replace(/-v\d+$/, "-v") + "\\d+$"); // "ghost-hunter-v" and a number
  return names.filter((name) => family.test(name) && name !== table.cache);
}

// What to tell a person who wants the game on their home screen: nothing if it already is, the button's own words where the browser can do it, and the steps by hand on an
// iPhone (which has no button). `env` is { standalone, canPrompt, userAgent }.
function installAdvice({ standalone = false, canPrompt = false, userAgent = "" } = {}) {
  if (standalone) return { kind: "installed", text: "" };
  if (canPrompt) return { kind: "prompt", text: "Install the game" };
  if (/iPhone|iPad|iPod/.test(userAgent)) return { kind: "steps", text: "To install: tap the Share button, then Add to Home Screen." };
  return { kind: "none", text: "" };
}

// Whether the page is running as an installed app: the display mode says so, or an iPhone's own flag.
function isStandalone(win = typeof window !== "undefined" ? window : null) {
  if (!win) return false;
  try {
    return Boolean((win.matchMedia && win.matchMedia("(display-mode: standalone)").matches) || (win.navigator && win.navigator.standalone));
  } catch (error) {
    return false;
  }
}

// The button's logic: it holds on to the browser's offer of installing (the `beforeinstallprompt` event, which comes once the game can be installed), and asks for it when
// the player presses. The window is given, so a test can send it the event.
class InstallOffer {
  constructor(win, onChange = () => {}) {
    this.win = win;
    this.onChange = onChange;
    this.event = null;
    win.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault(); // the browser's own bar does not come: the game's button does
      this.event = event;
      this.onChange(this);
    });
    win.addEventListener("appinstalled", () => {
      this.event = null;
      this.onChange(this);
    });
  }

  get canPrompt() {
    return this.event !== null;
  }

  advice() {
    return installAdvice({ standalone: isStandalone(this.win), canPrompt: this.canPrompt, userAgent: (this.win.navigator && this.win.navigator.userAgent) || "" });
  }

  // Asks the browser to show its install question. Gives "accepted", "dismissed", or "unavailable".
  async prompt() {
    if (!this.event) return "unavailable";
    const event = this.event;
    this.event = null;
    await event.prompt();
    const choice = await event.userChoice;
    this.onChange(this);
    return choice && choice.outcome ? choice.outcome : "dismissed";
  }
}

// Registers the worker, if the browser has workers and the page is secure. Gives whether it was asked for; a worker that will not register is not a reason to stop.
async function registerWorker(win = typeof window !== "undefined" ? window : null, path = "sw.js") {
  if (!win || !win.navigator || !win.navigator.serviceWorker) return false;
  try {
    await win.navigator.serviceWorker.register(path);
    return true;
  } catch (error) {
    return false;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html, and for the worker, where `window` is not there) depending on which
// environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { INSTALL, cacheDecision, staleCaches, installAdvice, isStandalone, InstallOffer, registerWorker };
} else {
  Object.assign(globalThis, { INSTALL, cacheDecision, staleCaches, installAdvice, isStandalone, InstallOffer, registerWorker });
}
```

Open `sw.js` (the placeholder) and **replace the TODO line** with:

```js
// The service worker: it keeps the files of the game, so that the game starts with no network, and answers from them (see js/install.js, which says which files and which
// requests, and is loaded here). It is its own page, in its own thread: it has no window and no document, only the events of the browser asking it what to do.
importScripts("js/install.js");

// Installing: the files of the shell are fetched and kept, all or none. Then it does not wait for the old worker to be done with.
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(INSTALL.cache).then((cache) => cache.addAll(INSTALL.shell)).then(() => self.skipWaiting()));
});

// Activating: the caches of old versions of the game are thrown away, and the worker takes the pages that are open.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(staleCaches(names).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

// A request: if it is one of the game's own files, answer from what is kept, or fetch it and keep it. (Only a whole answer is kept: music is asked for in pieces.)
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (cacheDecision(request.url, request.method, self.location.origin) !== "cache") return;
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(INSTALL.cache).then((cache) => cache.put(request, copy));
          }
          return response;
        })
    )
  );
});
```

Open `manifest.webmanifest` (the placeholder) and **replace the TODO line** with:

```json
{
  "name": "Ghost Hunter",
  "short_name": "Ghost Hunter",
  "description": "An augmented reality ghost hunt for your phone.",
  "start_url": "./index.html",
  "scope": "./",
  "display": "fullscreen",
  "orientation": "any",
  "background_color": "#05080d",
  "theme_color": "#05080d",
  "icons": [
    { "src": "../assets/images/ghost_hunter_logo_small.webp", "sizes": "any", "type": "image/webp", "purpose": "any" }
  ]
}
```

And the stylesheet of the polish (the switches, the button, the photograph, and what reduced motion takes out). Open `css/polish.css` (the placeholder) and **replace the TODO line** with:

```css
/* The polish (see comfort.js, install.js and photo.js): the comfort switches and the install button on the start screen, the photograph on the screen at the end of a round,
   and what motion that is reduced takes out. */
.comfort {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0;
  font-family: var(--small-font);
  font-size: 14px;
  color: var(--bone);
}
.comfort label {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.comfort input {
  accent-color: var(--ghost);
  width: 18px;
  height: 18px;
}
.install-line {
  min-height: 20px;
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ecto);
}
.install-button {
  margin-top: 6px;
  padding: 8px 18px;
  border: 2px solid var(--ecto);
  background: rgba(5, 8, 13, 0.7);
  color: var(--ecto);
  font: 15px var(--small-font);
  letter-spacing: 0.08em;
}
.install-button.hidden,
.photo-area.hidden {
  display: none;
}
.photo-area {
  margin-top: 10px;
  text-align: center;
}
.photo-picture {
  display: block;
  max-width: min(260px, 70vw);
  max-height: 34vh;
  margin: 0 auto 6px;
  border: 2px solid var(--bone);
}
.photo-caption {
  margin: 0 0 6px;
  font-size: 13px;
  letter-spacing: 0.1em;
  color: var(--ecto);
}
.photo-button {
  padding: 7px 16px;
  border: 2px solid var(--bone);
  background: rgba(5, 8, 13, 0.7);
  color: var(--bone);
  font: 15px var(--small-font);
}
/* With motion reduced, the picture does not sway or change colour as sanity falls, and nothing pulses. */
body.calm-motion.unwell #stage,
body.calm-motion.unwell #renderCanvas {
  filter: none !important;
  transform: none !important;
}
body.calm-motion .round-bar.low {
  animation: none;
}
body.calm-motion .insane {
  transition: none;
}
```

Things to notice:

- **Change the number of the cache when a file changes** (`ghost-hunter-v1` to `v2`): the worker keeps what it has, and a game that is fixed but is served from the old cache is not fixed. The old cache is thrown away when the new worker is activated.
- **The models and the music are not in the shell.** They are large, and a phone does not want them all at once: they are kept as they are fetched, so the first visit fills the cache and the second needs no network.
- **Only whole answers are kept** (`status === 200`): music is asked for in pieces, and a piece is not a file.
- **Install criteria:** a real release needs PNG icons at 192 and 512 pixels; the logo of this series is a 300-pixel WebP, which is enough to show the idea.

### Tests

Open `tests/install.tests.js` (the placeholder) and **replace the TODO line** with:

```js
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
```

Look at "every file of the shell is really there": the test **fetches** each, so a file that is renamed and forgotten in the list is a failing test, and not a game that will not install on somebody's phone.

Open `tests.html`. You should see **526 passing tests**: 15 more.

## Step 3: The photograph

What the player sees is two layers: the camera's picture (a `<video>`) and the 3D scene drawn over it (a WebGL canvas that is see-through where nothing is drawn). A photograph is those two **put together** on a canvas of their own: the video first, cut to the shape of the screen the way `object-fit: cover` does (`coverRect`), then the scene over it, a dark frame round the edge, and the name of the game. It is no bigger than `maxSide` on its longer side (a message does not want a phone's screen of pixels).

- **When to take it.** A game that waits for the player to find the button misses the moment. The game asks for one at **every strike** (`ask`), and takes it a moment later (`delay`): the strike is at its worst a little after it begins. `tick` counts that moment down, once.
- **Where to take it.** A WebGL canvas can only be copied from **right after it has been drawn**: after that the browser has taken the picture, and the canvas is empty. So the game does not take the photograph when the time is up; it says *a photograph is wanted*, and takes it in the next frame, just after the scene is drawn.
- **How to keep it.** `save` shares the file through the phone's own share sheet (which can put it in a message or the photos) where the browser can share files, and downloads it where it cannot. If the player closes the share sheet, that is not an error (`"cancelled"`).

Open `js/photo.js` (the placeholder) and **replace the TODO line** with:

```js
// The photograph: the moment of a fright, kept. The picture is what the player saw, which is two layers (the camera's picture, and the 3D scene drawn over it), put together
// on a canvas of their own, with a frame and the name of the game, and then saved: shared (the phone's own share sheet, which can put it in a message or the photos) where the
// browser can, and downloaded where it cannot. The game takes one itself a moment after every strike, and keeps the last, so that the screen at the end of a round can show the
// moment you jumped. The drawing is given its sources (anything a canvas can draw: a video, a canvas), so a test can give it two plain canvases. See ../tests/photo.tests.js.

const PHOTO = {
  maxSide: 960, // pixels on the longer side of the photograph (a phone's screen has more, and a message does not want them)
  frame: 14, // pixels of dark frame all round, at the size of the photograph
  caption: "GHOST HUNTER",
  quality: 0.88, // of the JPEG
  delay: 0.28, // seconds after a strike that the game takes it: the moment that is the worst
  file: "ghost-hunter",
};

// The part of a picture that fills a space of a shape, the way `object-fit: cover` would (cut at the edges, and not squeezed): { sx, sy, sw, sh }.
function coverRect(sourceWidth, sourceHeight, width, height) {
  const sourceAspect = sourceWidth / sourceHeight;
  const aspect = width / height;
  if (sourceAspect > aspect) {
    const sw = sourceHeight * aspect;
    return { sx: (sourceWidth - sw) / 2, sy: 0, sw, sh: sourceHeight };
  }
  const sh = sourceWidth / aspect;
  return { sx: 0, sy: (sourceHeight - sh) / 2, sw: sourceWidth, sh };
}

// How big the photograph is for a screen of a size: the longer side is no more than `maxSide`, and the shape is the screen's. { width, height }, whole pixels.
function photoSize(screenWidth, screenHeight, table = PHOTO) {
  const scale = Math.min(1, table.maxSide / Math.max(screenWidth, screenHeight));
  return { width: Math.max(1, Math.round(screenWidth * scale)), height: Math.max(1, Math.round(screenHeight * scale)) };
}

// A name for the file: the game's, and the time to the second, so that two are not the same.
function photoName(date = new Date(), table = PHOTO) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${table.file}-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.jpg`;
}

class PhotoBooth {
  constructor(doc = document, table = PHOTO) {
    this.doc = doc;
    this.table = table;
    this.last = null; // the last photograph, as a canvas
    this.takenAt = null;
    this.pending = 0; // seconds until a photograph that was asked for is taken (0: none)
  }

  // Puts the layers together: the camera's picture (if there is one, `video`), the scene (`scene`, anything a canvas can draw), a dark frame and the name. Gives the canvas.
  compose(video, scene, screenWidth = scene.width, screenHeight = scene.height) {
    const { width, height } = photoSize(screenWidth, screenHeight, this.table);
    const canvas = this.doc.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#05080d";
    context.fillRect(0, 0, width, height);
    const draw = (source) => {
      const w = source.videoWidth || source.width;
      const h = source.videoHeight || source.height;
      if (!w || !h) return;
      const { sx, sy, sw, sh } = coverRect(w, h, width, height);
      context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    };
    if (video) draw(video);
    if (scene) draw(scene);
    const frame = this.table.frame;
    context.strokeStyle = "#05080d";
    context.lineWidth = frame * 2;
    context.strokeRect(0, 0, width, height);
    context.font = `${Math.round(width / 22)}px monospace`;
    context.fillStyle = "rgba(242, 243, 238, 0.85)";
    context.textAlign = "center";
    context.fillText(this.table.caption, width / 2, height - frame - 4);
    return canvas;
  }

  // Takes a photograph now of the layers, and keeps it as the last.
  snap(video, scene, screenWidth, screenHeight, now = new Date()) {
    this.last = this.compose(video, scene, screenWidth, screenHeight);
    this.takenAt = now;
    this.pending = 0;
    return this.last;
  }

  // Asks for one to be taken in a moment (after a strike): `tick` counts down and says when it is time.
  ask(delay = this.table.delay) {
    this.pending = delay;
  }

  tick(seconds) {
    if (this.pending <= 0) return false;
    this.pending -= seconds;
    if (this.pending > 0) return false;
    this.pending = 0;
    return true;
  }

  // The last photograph as a picture the page can show (a data address), or nothing.
  thumbnail() {
    return this.last ? this.last.toDataURL("image/jpeg", this.table.quality) : null;
  }

  toBlob() {
    return new Promise((resolve) => (this.last ? this.last.toBlob((blob) => resolve(blob), "image/jpeg", this.table.quality) : resolve(null)));
  }

  // Saves the last: through the phone's share sheet if the browser can share files, and as a download if it cannot. Gives "shared", "downloaded", "cancelled" or "none".
  async save(nav = typeof navigator !== "undefined" ? navigator : null) {
    const blob = await this.toBlob();
    if (!blob) return "none";
    const name = photoName(this.takenAt || new Date(), this.table);
    const file = typeof File !== "undefined" ? new File([blob], name, { type: "image/jpeg" }) : null;
    if (file && nav && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: this.table.caption });
        return "shared";
      } catch (error) {
        return "cancelled"; // the player closed the share sheet
      }
    }
    const link = this.doc.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    this.doc.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    return "downloaded";
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PHOTO, coverRect, photoSize, photoName, PhotoBooth };
} else {
  Object.assign(window, { PHOTO, coverRect, photoSize, photoName, PhotoBooth });
}
```

### Tests

The sources of a photograph are anything a canvas can draw, so the tests give it two plain canvases: one red (the camera) and one green on its right half (the scene), and look at the pixels.

Open `tests/photo.tests.js` (the placeholder) and **replace the TODO line** with:

```js
const photoCanvas = (width, height, color) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return canvas;
};

QUnit.module("the shape of a photograph", () => {
  QUnit.test("a wide picture on a tall space is cut at the sides, in the middle, and a tall one on a wide space at the top and bottom", (assert) => {
    assert.deepEqual(coverRect(1280, 720, 360, 720), { sx: 460, sy: 0, sw: 360, sh: 720 });
    assert.deepEqual(coverRect(720, 1280, 720, 360), { sx: 0, sy: 460, sw: 720, sh: 360 });
    assert.deepEqual(coverRect(800, 400, 400, 200), { sx: 0, sy: 0, sw: 800, sh: 400 });
  });

  QUnit.test("a photograph is the shape of the screen, and no bigger than the table says on its longer side", (assert) => {
    assert.deepEqual(photoSize(1170, 2532), { width: Math.round(1170 * (PHOTO.maxSide / 2532)), height: PHOTO.maxSide });
    assert.deepEqual(photoSize(400, 300), { width: 400, height: 300 }, "a small screen is not made bigger");
  });

  QUnit.test("the file is named for the game and the second, so that two are not alike", (assert) => {
    assert.strictEqual(photoName(new Date(2026, 9, 31, 7, 5, 9)), "ghost-hunter-20261031-070509.jpg");
    assert.notStrictEqual(photoName(new Date(2026, 9, 31, 7, 5, 9)), photoName(new Date(2026, 9, 31, 7, 5, 10)));
  });
});

QUnit.module("PhotoBooth", () => {
  const pixelAt = (canvas, x, y) => [...canvas.getContext("2d").getImageData(x, y, 1, 1).data];

  QUnit.test("the camera's picture is behind and the scene is over it, and the frame is round the edge", (assert) => {
    const booth = new PhotoBooth(document);
    const video = photoCanvas(200, 100, "#ff0000");
    const scene = document.createElement("canvas");
    scene.width = 200;
    scene.height = 100;
    scene.getContext("2d").fillStyle = "#00ff00";
    scene.getContext("2d").fillRect(100, 0, 100, 100); // the scene is only drawn on the right half
    const canvas = booth.compose(video, scene, 200, 100);
    assert.strictEqual(canvas.width, 200);
    const left = pixelAt(canvas, 50, 50);
    const right = pixelAt(canvas, 150, 50);
    assert.true(left[0] > 200 && left[1] < 40, `left is the camera's red: ${left}`);
    assert.true(right[1] > 200 && right[0] < 40, `right is the scene's green over it: ${right}`);
    const edge = pixelAt(canvas, 2, 50);
    assert.true(edge[0] < 20 && edge[2] < 40, `the frame is dark: ${edge}`);
  });

  QUnit.test("with no camera the scene is on the dark, and the size is held to the table", (assert) => {
    const booth = new PhotoBooth(document);
    const scene = photoCanvas(2000, 1000, "#00ff00");
    const canvas = booth.compose(null, scene, 2000, 1000);
    assert.strictEqual(canvas.width, PHOTO.maxSide);
    assert.strictEqual(canvas.height, PHOTO.maxSide / 2);
    assert.true(pixelAt(canvas, canvas.width / 2, canvas.height / 2)[1] > 200);
  });

  QUnit.test("a source with nothing in it is left out, and nothing goes wrong", (assert) => {
    const booth = new PhotoBooth(document);
    const empty = document.createElement("canvas");
    empty.width = 0;
    empty.height = 0;
    const canvas = booth.compose(empty, empty, 100, 100);
    assert.strictEqual(canvas.width, 100);
  });

  QUnit.test("a photograph is asked for, comes after the delay, once, and is kept as the last", (assert) => {
    const booth = new PhotoBooth(document);
    assert.false(booth.tick(1), "none was asked for");
    booth.ask();
    assert.false(booth.tick(PHOTO.delay / 2));
    assert.true(booth.tick(PHOTO.delay));
    assert.false(booth.tick(1), "once");
    const taken = booth.snap(photoCanvas(10, 10, "#fff"), null, 10, 10, new Date(2026, 0, 1));
    assert.strictEqual(booth.last, taken);
    assert.strictEqual(booth.pending, 0);
    assert.true(booth.thumbnail().startsWith("data:image/jpeg"));
  });

  QUnit.test("there is no thumbnail, and nothing to save, before the first photograph", async (assert) => {
    const booth = new PhotoBooth(document);
    assert.strictEqual(booth.thumbnail(), null);
    assert.strictEqual(await booth.save({}), "none");
  });

  QUnit.test("it is shared where the browser can share files, cancelled if the player closes the sheet, and downloaded where it cannot", async (assert) => {
    const booth = new PhotoBooth(document);
    booth.snap(photoCanvas(20, 20, "#123"), null, 20, 20, new Date(2026, 0, 1, 1, 2, 3));
    const shared = [];
    assert.strictEqual(await booth.save({ canShare: () => true, share: async (data) => shared.push(data.files[0].name) }), "shared");
    assert.deepEqual(shared, ["ghost-hunter-20260101-010203.jpg"]);
    assert.strictEqual(await booth.save({ canShare: () => true, share: async () => { throw new Error("closed"); } }), "cancelled");
    assert.strictEqual(await booth.save({ canShare: () => false }), "downloaded");
  });
});
```

Open `tests.html`. You should see **535 passing tests**: 9 more.

## Step 4: What is drawn

Three small pieces of the page, each built from the page's own elements, given the `document`, and each only telling whoever is listening what the player did:

- `ComfortUi`: the two switches on the start screen;
- `InstallUi`: the button where the browser can install, the steps where it cannot, and nothing if the game is installed already;
- `PhotoUi`: the photograph on the screen at the end of a round, with a button to save it (which says "Saved" or "Shared", or that there was nothing to save).

Open `js/polishui.js` (the placeholder) and **replace the TODO line** with:

```js
// What the player sees of the polish: the two comfort switches on the start screen (reduce shaking and flashing, and vibration), the line and the button that put the game on
// the home screen, and the photograph on the screen at the end of a round with a button to save it. Each is built from the page's own elements, given the `document` (so a test
// can look at them), and does nothing but tell whoever is listening what the player did. See ../tests/polishui.tests.js and ../css/polish.css.

const makeEl = (doc, tag, className, parent, text = "") => {
  const element = doc.createElement(tag);
  element.className = className;
  element.textContent = text;
  if (parent) parent.appendChild(element);
  return element;
};

class ComfortUi {
  // `settings` is a ComfortSettings. They go in the element with the id `start-comfort` (made if the page has none). `onChange(name, value)` is told of a change.
  constructor(doc, settings, onChange = () => {}) {
    this.settings = settings;
    this.root = doc.getElementById("start-comfort") || makeEl(doc, "div", "", doc.body);
    this.root.classList.add("comfort");
    this.boxes = {};
    const rows = [
      ["reduceMotion", "Reduce shaking and flashing"],
      ["vibration", "Let the phone buzz"],
    ];
    for (const [name, words] of rows) {
      const label = makeEl(doc, "label", "", this.root);
      const box = doc.createElement("input");
      box.type = "checkbox";
      box.checked = Boolean(settings[name]);
      box.addEventListener("change", () => {
        settings.set(name, box.checked);
        onChange(name, box.checked);
      });
      label.appendChild(box);
      label.appendChild(doc.createTextNode(words));
      this.boxes[name] = box;
    }
  }

  // Shows the settings as they are now (they may have changed from outside).
  refresh() {
    for (const [name, box] of Object.entries(this.boxes)) box.checked = Boolean(this.settings[name]);
  }
}

class InstallUi {
  // `offer` is an InstallOffer. The words go in `install-line` and the button is `install-button`, both on the start screen (made if the page has none).
  constructor(doc, offer) {
    this.offer = offer;
    this.line = doc.getElementById("install-line") || makeEl(doc, "p", "install-line", doc.body);
    this.button = doc.getElementById("install-button") || makeEl(doc, "button", "install-button hidden", doc.body, "Install the game");
    this.button.type = "button";
    this.button.addEventListener("click", async () => {
      await offer.prompt();
      this.update();
    });
    offer.onChange = () => this.update();
    this.update();
  }

  // Shows what the offer says: the button where the browser can install, the steps where it cannot, and nothing if it is installed already.
  update() {
    const advice = this.offer.advice();
    this.button.classList.toggle("hidden", advice.kind !== "prompt");
    this.line.textContent = advice.kind === "steps" ? advice.text : "";
  }
}

class PhotoUi {
  // `booth` is a PhotoBooth, and `parent` is where the photograph goes (the screen at the end of a round).
  constructor(doc, booth, parent) {
    this.booth = booth;
    this.root = makeEl(doc, "div", "photo-area hidden", parent);
    this.picture = makeEl(doc, "img", "photo-picture", this.root);
    this.picture.alt = "The moment you jumped";
    this.caption = makeEl(doc, "p", "photo-caption", this.root, "The moment you jumped");
    this.button = makeEl(doc, "button", "photo-button", this.root, "Save the photograph");
    this.button.type = "button";
    this.button.addEventListener("click", async () => {
      const result = await booth.save();
      this.caption.textContent = result === "downloaded" ? "Saved" : result === "shared" ? "Shared" : result === "none" ? "Nothing to save" : "The moment you jumped";
    });
  }

  // Shows the last photograph, or hides the area if there is none.
  show() {
    const url = this.booth.thumbnail();
    this.root.classList.toggle("hidden", url === null);
    if (url) {
      this.picture.src = url;
      this.caption.textContent = "The moment you jumped";
    }
    return url !== null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ComfortUi, InstallUi, PhotoUi };
} else {
  Object.assign(window, { ComfortUi, InstallUi, PhotoUi });
}
```

### Tests

Open `tests/polishui.tests.js` (the placeholder) and **replace the TODO line** with:

```js
QUnit.module("ComfortUi", () => {
  QUnit.test("a switch for each setting, showing what it is, and changing it keeps it and says so", (assert) => {
    const settings = new ComfortSettings(comfortStore(), true);
    const told = [];
    const ui = new ComfortUi(document, settings, (name, value) => told.push([name, value]));
    assert.deepEqual(Object.keys(ui.boxes), ["reduceMotion", "vibration"]);
    assert.true(ui.boxes.reduceMotion.checked);
    assert.true(ui.boxes.vibration.checked);
    ui.boxes.vibration.checked = false;
    ui.boxes.vibration.dispatchEvent(new Event("change"));
    assert.false(settings.vibration);
    assert.deepEqual(told, [["vibration", false]]);
    settings.set("vibration", true);
    ui.refresh();
    assert.true(ui.boxes.vibration.checked);
    ui.root.remove();
  });
});

QUnit.module("InstallUi", () => {
  const stand = (userAgent = "Android") => {
    const target = new EventTarget();
    target.navigator = { userAgent };
    target.matchMedia = () => ({ matches: false });
    return target;
  };

  QUnit.test("no button and no words where there is nothing to do", (assert) => {
    const ui = new InstallUi(document, new InstallOffer(stand("Linux")));
    assert.true(ui.button.classList.contains("hidden"));
    assert.strictEqual(ui.line.textContent, "");
    ui.button.remove();
    ui.line.remove();
  });

  QUnit.test("the steps are said on an iPhone, and the button comes when the browser makes its offer", async (assert) => {
    const phone = new InstallUi(document, new InstallOffer(stand("iPhone")));
    assert.true(phone.line.textContent.includes("Add to Home Screen"));
    phone.button.remove();
    phone.line.remove();

    const win = stand();
    const ui = new InstallUi(document, new InstallOffer(win));
    const event = new Event("beforeinstallprompt", { cancelable: true });
    event.prompt = async () => {};
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    win.dispatchEvent(event);
    assert.false(ui.button.classList.contains("hidden"));
    ui.button.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.true(ui.button.classList.contains("hidden"), "the offer is used up");
    ui.button.remove();
    ui.line.remove();
  });
});

QUnit.module("PhotoUi", () => {
  QUnit.test("it is hidden until there is a photograph, and then shows it with a button to save", (assert) => {
    const booth = new PhotoBooth(document);
    const parent = document.createElement("div");
    const ui = new PhotoUi(document, booth, parent);
    assert.false(ui.show());
    assert.true(ui.root.classList.contains("hidden"));
    booth.snap(photoCanvas(30, 20, "#345"), null, 30, 20);
    assert.true(ui.show());
    assert.false(ui.root.classList.contains("hidden"));
    assert.true(ui.picture.src.startsWith("data:image/jpeg"));
  });
});
```

Open `tests.html`. You should see **539 passing tests**: 4 more.

## Step 5: The game

`main.js` ties it together. In the order of the file:

**Calm is a level, and the comfort settings are made:**

In `js/main.js`, **replace** line 26:

```js
SCARE.level = levelWanted(location.search, remembered(LEVEL_KEY));
```

with:

```js
SCARE.levels.calm = CALM_LEVEL; // a fourth level, in which nothing can hurt you and nothing jumps out (see comfort.js)
const BASE_LEVELS = Object.fromEntries(Object.entries(SCARE.levels).map(([name, row]) => [name, { ...row }])); // the levels as they come, before the comfort settings
SCARE.level = levelWanted(location.search, remembered(LEVEL_KEY));
const comfort = new ComfortSettings(journalStorage(), window.matchMedia("(prefers-reduced-motion: reduce)").matches); // what the player has asked to have gentler
```

**What a touch costs, and whether it is a strike, depends on the level** (so does a pop):

In `js/main.js`, **replace** lines 117 to 122:

```js
    if (type === "touch") round.hurt(item.kind); // what gets to the player takes its share of the round's health and sanity
    if (type === "pop") round.hurt("pop");
    if (type === "died" || type === "captured") journal.noteDealt(item.kind);
    if (type === "touch" || type === "pop") director.noteScare(); // it got to the player (or popped up at the edge): the dread drops, and there is a rest
    if (type === "lunge" || type === "touch") scare.trigger(type); // and it is a scare
    if (type === "pop") scare.trigger("lunge"); // a pop is a strike with no warning
```

with:

```js
    const rules = comfortFor(SCARE.level); // calm changes what a touch costs, and whether it is a strike
    if (type === "touch" && rules.damage > 0) round.hurt(item.kind); // what gets to the player takes its share of the round's health and sanity
    if (type === "pop" && rules.damage > 0) round.hurt("pop");
    if (type === "died" || type === "captured") journal.noteDealt(item.kind);
    if (type === "touch" || type === "pop") director.noteScare(); // it got to the player (or popped up at the edge): the dread drops, and there is a rest
    if ((type === "lunge" || type === "touch") && rules.strikes) scare.trigger(type); // and it is a scare
    if (type === "pop" && rules.strikes) scare.trigger("lunge"); // a pop is a strike with no warning
```

In `js/main.js`, after line 163, add:

```js
  if (order.peek.pop && !comfortFor(SCARE.level).pops) order.peek.pop = false; // where nothing may jump out, a pop is a peek
```

**The comfort settings are put over the levels,** the switches and the install button are made, the worker is registered, and the photograph booth is made:

In `js/main.js`, after line 278, add:

```js
// The comfort settings are put over the levels as they come: with motion reduced, no level shakes or flashes; with vibration off, none buzzes. They are put on again
// whenever a setting is changed, and the page is told (a class of the body) so that the stylesheet leaves the picture alone.
function applyComfort() {
  for (const name of Object.keys(BASE_LEVELS)) SCARE.levels[name] = effectiveLevel(BASE_LEVELS[name], comfort);
  document.body.classList.toggle("calm-motion", !swayAllowed(comfort));
  scare.setLevel(SCARE.level);
  audio.setVolume(SCARE.levels[SCARE.level].volume);
}
```

In `js/main.js`, **replace** lines 292 to 293:

```js
scare.setLevel(SCARE.level);
audio.setVolume(SCARE.levels[SCARE.level].volume);
```

with:

```js
const comfortUi = new ComfortUi(document, comfort, () => applyComfort());
applyComfort();

// The game as an app (see install.js): a button where the browser offers one, the steps where it does not, and a worker that keeps the files so that it starts with no network.
const installOffer = new InstallOffer(window);
const installUi = new InstallUi(document, installOffer);
registerWorker(window);

// The photograph of a fright (see photo.js): one is asked for at every strike, taken a moment later, just after the scene is drawn, and the last is shown at the end of a round.
const booth = new PhotoBooth(document);
let photoWanted = false;
```

**A strike asks for a photograph, and the rounds are as hard as the level says** (calm is half as hard):

In `js/main.js`, **replace** lines 313 to 314:

```js
    if (frame.fired.vibrate.length && navigator.vibrate) navigator.vibrate(frame.fired.vibrate);
  }
```

with:

```js
    booth.ask(); // and the moment is kept
    if (frame.fired.vibrate.length && navigator.vibrate) navigator.vibrate(frame.fired.vibrate);
  }
  if (booth.tick(seconds)) photoWanted = true;
```

In `js/main.js`, after line 430, add:

```js
const photoUi = new PhotoUi(document, booth, roundsUi.screen);
roundsUi.screen.insertBefore(photoUi.root, roundsUi.next.parentNode); // the photograph goes above the buttons
```

In `js/main.js`, **replace** line 441:

```js
  HUNT.intensity = round.level.intensity; // each round is harder
```

with:

```js
  HUNT.intensity = round.level.intensity * comfortFor(SCARE.level).intensity; // each round is harder (and calm is half as hard)
```

In `js/main.js`, after line 462, add:

```js
  photoUi.show(); // the moment you jumped, if there was one
```

**The photograph is taken just after the scene is drawn:**

In `js/main.js`, after line 663, add:

```js
scene.onAfterRenderObservable.add(() => {
  if (!photoWanted) return;
  photoWanted = false;
  booth.snap(feed.live ? feedVideo : null, canvas, canvas.width, canvas.height);
});

```

**Q is a photograph now, and the developer panel has the polish:**

In `js/main.js`, after line 726, add:

```js
  if (event.code === "KeyQ") booth.ask(0.01); // a photograph, now
```

In `js/main.js`, after line 895, add:

```js
        title: "Polish",
        rows: [
          readout("scare level", () => SCARE.level),
          readout("comfort", () => `motion ${comfort.reduceMotion ? "reduced" : "full"}, buzz ${comfort.vibration ? "on" : "off"}`),
          readout("installed", () => (isStandalone(window) ? "yes" : installOffer.canPrompt ? "can be" : "no")),
          readout("photograph", () => (booth.last ? `${booth.last.width} by ${booth.last.height}` : "none")),
          action("Take a photograph (Q)", () => booth.ask(0.01)),
          action("Toggle reduced motion", () => { comfort.set("reduceMotion", !comfort.reduceMotion); comfortUi.refresh(); applyComfort(); }),
          action("Save the photograph", () => booth.save()),
        ],
      },
      {
```

In `js/main.js`, **replace** line 1059:

```js
  window.dev = { journal, get round() { return round; }, beginRound, detectors, scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music, tools }; // for poking at from the console
```

with:

```js
  window.dev = { comfort, booth, installOffer, journal, get round() { return round; }, beginRound, detectors, scene, eye, gyro, drag, feed, panel, enter, recentre, placeholders, placements, player, xr, haunting, creatures, director, scare, audio, music, tools }; // for poking at from the console
```

### Try it

Open `index.html?dev` (over HTTPS, or `localhost`, for the worker). You should see:

- on the start screen, four scare levels: **Calm** is the new one. Choose it, and press the button: creatures come, and keep coming, and nothing hurts you and nothing jumps out
- two switches under the level: **reduce shaking and flashing**, **let the phone buzz**: they are kept
- press **Q** (a photograph now), or let a strike happen: at the end of a round the screen shows **the moment you jumped**, with a button to save it
- in the developer tools of the browser (Application, Service Workers): the worker is there, and the cache `ghost-hunter-v1` has files in it. Switch the network off, and reload: the game starts
- on Android's Chrome the **Install the game** button comes on the start screen; on an iPhone, the steps are written under the level

### Tests

Open `tests.html`. You should see **539 passing tests**: 0 more (none: the game is not what the tests are about).

## Testing on real phones

Everything in this series was made with tests that run in a browser at a desk, and a game for a phone is only finished when it has been **played on one**. A checklist for that:

- **Camera and sensors:** HTTPS (or a tunnel); the permission question comes from the button; look around (does the picture turn the right way? on an iPhone there is a permission for the sensors).
- **Real AR** on Android's Chrome: the floor is found, and marks stay where they were put.
- **Light and dark:** play in a dim room (the picture is better and the fright is too); in sunlight (can the screen be read?).
- **Heat and battery:** ten minutes of play (the camera, the sensors and the scene all run at once); does it throttle? Turn the quality of the scene down if it does.
- **Sound and buzz:** with and without headphones; the silence of the phone's side switch; Calm and the comfort switches.
- **Install:** from the browser's menu and from the button; open it from the home screen; switch the network off.
- **A person who has not seen it before:** the best test of all. Watch, and say nothing.

## Stretch goals

- **PNG icons** at 192 and 512 pixels, a maskable one, and a splash screen: what a store would ask for.
- **A cache of the models that is filled on the first visit** (a "download for offline" button), instead of as they are met.
- **An update that is told:** when a new worker is waiting, a line that says "A new version is ready" and a button to reload.
- **More comfort:** a size for the writing, a way to play with a controller, a switch for the whispers.

## What you've learned

- Why a frightening game must be possible to play gently, and how to build it as a level and some switches that the game's rules read from tables
- How a service worker decides what to keep, why the decision is a plain function, and how to test what you cannot run
- What a manifest is, and what makes a page installable (and what an iPhone does differently)
- How to put a video and a WebGL canvas together into a photograph, and why it has to be done right after the scene is drawn
- How to share a file from a page, and download it where sharing is not possible

**That is the series.** From a room with a floor and a camera's picture, through apparitions, creatures, a director, scares, models, music, tools, unease, a cast with skeletons, a door scan, gadgets and rounds, to a game that can be played gently, installed, and photographed. Every rule of it is plain numbers and arithmetic with a test, and the parts that cannot be tested are said to be the parts to test on a phone.
