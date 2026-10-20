// The runner's animation clips: which one plays now, and the choice of clip for
// what the runner is doing. The character file holds one named clip per
// movement ("Idle_Loop", "Sprint_Loop", ...), and this plays one at a time. It
// only needs objects that can start() and stop(), so it is easy to test; main.js
// gives it the real animation groups. See ../tests/clips.tests.js.

// The clips this sample uses, by what the runner is doing.
const CLIPS = {
  idle: "Idle_Loop",
  run: "Sprint_Loop",
};

// The clip for a runner: sprinting while it is running, standing otherwise.
function clipFor(runner) {
  return runner.running ? CLIPS.run : CLIPS.idle;
}

class ClipPlayer {
  // `clips` is a Map from a clip's name to its animation group.
  constructor(clips) {
    this.clips = clips;
    this.current = null; // the name of the clip playing now, if any
  }

  // Plays the named clip, looping, and stops whichever was playing. Asking for
  // the clip that is already playing does nothing, so it is safe to call every
  // frame.
  play(name) {
    if (name === this.current) return;
    const next = this.clips.get(name);
    if (!next) throw new Error(`The character has no clip called "${name}"`);

    if (this.current) this.clips.get(this.current).stop();
    next.start(true);
    this.current = name;
  }

  // Stops whichever clip is playing.
  stop() {
    if (this.current) this.clips.get(this.current).stop();
    this.current = null;
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLIPS, clipFor, ClipPlayer };
} else {
  Object.assign(window, { CLIPS, clipFor, ClipPlayer });
}

