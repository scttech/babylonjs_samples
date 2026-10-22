// The runner's animation clips: which one plays now, and the choice of clip for
// what the runner is doing. The character file holds one named clip per
// movement ("Idle_Loop", "Sprint_Loop", ...), and this plays one at a time. It
// only needs objects that can start() and stop(), so it is easy to test; main.js
// gives it the real animation groups. See ../tests/clips.tests.js.

// The clips this sample uses, by what the runner is doing.
const CLIPS = {
  idle: "Idle_Loop",
  run: "Sprint_Loop",
  jump: "Jump_Start",
  slideStart: "Slide_Start",
  slideExit: "Slide_Exit",
  roll: "Roll",
};

// The clips were recorded slower than a game wants a jump or a roll to last. A
// speed of 2 plays a clip in half the time, so it ends about when the move does.
const JUMP_CLIP_SPEED = 2.2; // the jump clip is 1.33 seconds; the jump in the air is about 0.6
const SLIDE_START_CLIP_SPEED = 2.2; // down into the slide in about 0.4 seconds
const SLIDE_EXIT_CLIP_SPEED = 1.7; // and back up in about 0.3
const SLIDE_EXIT_TIME = 0.3; // so the exit clip starts when this many seconds of the slide are left
const ROLL_CLIP_SPEED = 2.2; // the roll clip is 1.47 seconds, but its last third is a slow stand-up, so the roll is cut short (0.55) and the sprint takes over

// The slide clip lowers the character until his hand and arm dip a few
// centimeters into the street (about 4 in the held pose, and up to 8 on the way
// down). Raising the whole model while he slides keeps them out. (The street's top
// is at y = 0, so this only has to cover what the pose dips below it.)
const SLIDE_LIFT = 0.05;

// How far to raise the character above where the runner is, for the move he is
// doing. main.js eases toward it, so the model glides up and down instead of hopping.
function liftFor(runner) {
  return runner.move === MOVES.slide ? SLIDE_LIFT : 0;
}

// The clip for a runner: { name, loop, speed }. Moves play once, at the speed that
// fits them; running and standing loop. A slide is two clips: down into the
// slide, which then holds its last pose, and up out of it at the end.
function clipFor(runner) {
  switch (runner.move) {
    case MOVES.jump:
      return { name: CLIPS.jump, loop: false, speed: JUMP_CLIP_SPEED };
    case MOVES.slide:
      return runner.timeLeft > SLIDE_EXIT_TIME
        ? { name: CLIPS.slideStart, loop: false, speed: SLIDE_START_CLIP_SPEED }
        : { name: CLIPS.slideExit, loop: false, speed: SLIDE_EXIT_CLIP_SPEED };
    case MOVES.roll:
      return { name: CLIPS.roll, loop: false, speed: ROLL_CLIP_SPEED };
    default:
      return { name: runner.running ? CLIPS.run : CLIPS.idle, loop: true, speed: 1 };
  }
}


class ClipPlayer {
  // `clips` is a Map from a clip's name to its animation group.
  constructor(clips) {
    this.clips = clips;
    this.current = null; // the name of the clip playing now, if any
  }

  // Plays the named clip and stops whichever was playing. `loop` says whether it
  // repeats or plays once and holds its last pose, and `speed` how fast (1 is as
  // recorded). Asking for the clip that is already playing does nothing, so it is
  // safe to call every frame.
  play(name, { loop = true, speed = 1 } = {}) {
    if (name === this.current) return;
    const next = this.clips.get(name);
    if (!next) throw new Error(`The character has no clip called "${name}"`);

    if (this.current) this.clips.get(this.current).stop();
    next.start(loop, speed);
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
  module.exports = { CLIPS, SLIDE_EXIT_TIME, SLIDE_LIFT, clipFor, liftFor, ClipPlayer };
} else {
  Object.assign(window, { CLIPS, SLIDE_EXIT_TIME, SLIDE_LIFT, clipFor, liftFor, ClipPlayer });
}


