# Ghost Hunter Polish

Step 15, the last, of the Ghost Hunter series. Builds on [Ghost Hunter Rounds](../ghost_hunter_rounds/README.md). The game works, and it is made to frighten, which is not a thing every person wants, all of the time. This sample is what makes it a game that can be **given to someone**: a **calm** way to play, settings to take out the shaking, the flashing and the buzzing, the game as an **app** on the home screen that starts with no network, and a **photograph** of the moment you jumped.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Rounds sample. Run `node reset-tutorial.js` to return this folder to the Rounds sample, to work through the changes yourself.

A service worker, a camera and the install button all need a **secure context** (HTTPS, or `localhost` on the same computer): see the [series README](../README.md). Add **`?dev`** to the address for the developer panel.

**Calm is a level.** A fourth button next to Gentle, Creepy and Terrifying. In it nothing can hurt you, nothing jumps out (a pop is only a peek), a strike does not make the lights stutter out, and the hunt is half as hard. The dark and the hunt remain; the fright does not. Its row has every number the other levels have, so the scare code reads it without knowing it is special.

**Comfort settings** go with any level: **reduce shaking and flashing** (chosen at once if the phone says `prefers-reduced-motion`), and **vibration**. `effectiveLevel` makes a copy of the level with the settings put over it, so the level as it comes is still there when a switch is turned off. They are kept in the browser, read back only when they make sense.

**Install.** A **manifest** (name, start page, colours, icon), a **service worker** (`sw.js`), and a button. The worker keeps a *shell* of files when it is installed, throws away the caches of old versions when it is activated, and answers the game's own files from what it has kept (the models and music are kept as they are fetched, so the first visit fills the cache and the second needs no network). What it decides (`cacheDecision`) is a plain function in `install.js`, which the worker loads with `importScripts`, so **the worker and the tests run the same code**. A test even fetches every file of the shell, so a renamed file is a failing test and not a game that will not install. An iPhone has no install button, so the game says how to do it by hand.

**The photograph.** The camera's picture and the scene put together on a canvas with a frame and the name of the game, taken a moment after every strike (the worst moment), just after the scene is drawn (a WebGL canvas can only be copied then), and saved through the phone's share sheet where the browser can share files, or downloaded where it cannot. The screen at the end of a round shows **the moment you jumped**.

## Key code

**The settings are put over the level, and the level is not changed.**

```js
const out = { ...level };
if (settings.reduceMotion) { out.shake = table.reduce.shake; out.flash = table.reduce.flash; }
```

**The worker answers only the game's own plain GETs.**

```js
if (method !== "GET") return "network";
if (table.never.some((host) => address.host.includes(host))) return "network";
```

## Controls

- Everything from the Rounds sample
- **Calm** is the fourth scare level on the start screen; two switches under it (reduce shaking and flashing, vibration); **Install the game** where the browser offers it
- **Q** takes a photograph now; one is taken at every strike
- With **`?dev`**: a **Polish** section with the level, the comfort settings, whether it is installed, the size of the photograph, and buttons to take one, save it, and toggle reduced motion

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The tests fetch the manifest and every file of the shell, so run it from a web server.

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md).

## The end of the series

That is the series: from a room with a floor and the camera's picture, through apparitions, creatures, a director, scares, models, music, tools, unease, a cast with skeletons, a door scan, gadgets and rounds, to a game that can be played gently, installed, and photographed. Every rule of it is plain numbers and arithmetic with a test; what cannot be tested at a desk is what to try on a phone, and the tutorial has a checklist for that.
