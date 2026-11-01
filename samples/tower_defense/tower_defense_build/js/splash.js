// The splash screen covers the page while the game loads. If the game loads
// quickly, taking the splash away at once would just make it flash by, so it
// stays up for a minimum time. This works out how much longer that is. Times
// are in milliseconds, and `now` and `shownAt` come from performance.now().
// See ../tests/splash.tests.js.
function remainingSplashTime(shownAt, now, minimum) {
  return Math.max(0, minimum - (now - shownAt));
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { remainingSplashTime };
} else {
  window.remainingSplashTime = remainingSplashTime;
}
