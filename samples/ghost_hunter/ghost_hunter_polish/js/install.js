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
