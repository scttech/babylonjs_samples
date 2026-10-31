// The loading screen. It covers the page while the district loads, with a bar and a percentage that follow the real progress, so
// that a person waiting for thirty megabytes can see that something is happening. If everything loads quickly, taking the splash
// away at once would just make it flash by, so it stays up for a minimum time: remainingSplashTime works out how much longer.
// Times are in milliseconds, and `now` and `shownAt` come from performance.now(). The Splash is built from the page's own
// elements, and given the `document` to look in, so the tests can give it a stand-in. See ../tests/splash.tests.js.
function remainingSplashTime(shownAt, now, minimum) {
  return Math.max(0, minimum - (now - shownAt));
}

class Splash {
  constructor(doc = document) {
    const get = (id) => doc.getElementById(id);
    this.root = get("splash");
    this.bar = get("splash-bar");
    this.fill = get("splash-fill");
    this.status = get("splash-status");
    this.shown = 0; // the fraction the bar is showing now
    this.finished = false; // set when the splash has gone, so whatever keeps it up to date can stop
    this.setProgress(0);
  }

  // Shows how much has loaded, from 0 to 1: the bar fills, and the percentage is written under it.
  setProgress(fraction) {
    this.shown = Math.min(1, Math.max(0, fraction));
    this.fill.style.width = `${(this.shown * 100).toFixed(1)}%`;
    this.bar.setAttribute("aria-valuenow", String(Math.floor(this.shown * 100)));
  }

  // The words under the bar: what is loading, and how far it has got.
  setStatus(text) {
    this.status.textContent = text;
  }

  // Something went wrong: say so, in the place where the loading was.
  fail(message) {
    this.root.classList.add("failed");
    this.status.textContent = message;
  }

  // Fades the splash out. It is taken away from the page a moment later, when the fade has finished.
  hide() {
    this.root.classList.add("hidden");
  }

  remove() {
    this.root.remove();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { remainingSplashTime, Splash };
} else {
  Object.assign(window, { remainingSplashTime, Splash });
}
