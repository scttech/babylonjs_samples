// The sequencer: it plays a sequence (see sequence.js) on a model, with the controls of a media player (play, pause, stop, jump to a time) and
// the list of steps to edit. It has no buttons in it: a page, or a test, tells it what to do. See ../tests/sequencer.tests.js.
//
// Unlike the clip player, it does **not** let Babylon.js play the clips. Every frame it works out what the pose should be at this moment of the sequence
// (poseAt), and puts each clip at that point with that weight itself. A clip that is told to play at almost no speed, and is moved to a frame by hand
// each time, is the way to be sure of blending clips (a clip that is *paused* ignores its weight). The cost is nothing: the work was already a
// function of time, and the gain is that scrubbing a whole sequence and playing it are the same thing.

// The speed that clips are held at while the sequencer moves them by hand: not zero (a clip at zero is paused, and ignores its weight), but too slow to
// move by itself in any time that anyone would watch.
const HOLD_SPEED = 0.00001;

class Sequencer {
  // `player` is the model's ClipPlayer (player.js): it has the clips and the rest pose, and it yields to it when someone uses it.
  constructor(player) {
    this.player = player;
    this.steps = [];
    this.fade = PLAYER_LIMITS.fade.start;
    this.loop = false;
    this.time = 0;
    this.state = "stopped"; // "stopped" (at the rest pose), "playing", "paused" or "ended"
    this.active = new Set(); // the clips that it is holding now
    this.cached = null;
  }

  // The names of the clips the model has.
  get clipNames() {
    return this.player.groups.map((group) => group.name);
  }

  // The plan of the sequence as it is now (see planSequence). It is made again whenever the steps, the fade or the loop change.
  get plan() {
    if (!this.cached) {
      const infoOf = (name) => {
        const group = this.player.find(name);
        return group ? clipInfo(group) : null;
      };
      this.cached = planSequence(this.steps, infoOf, this.fade, this.loop);
    }
    return this.cached;
  }

  // Editing the sequence changes the plan under the time that it is at. The simplest rule that is never wrong is to keep the time as it is, held
  // inside the new length (and, for a sequence that loops, round again), and to put the pose where the plan now says it is.
  changed() {
    this.cached = null;
    const end = this.plan.loop ? this.plan.cycle : this.plan.total;
    if (this.plan.loop && end > 0) this.time = this.time % end;
    else this.time = Math.min(this.time, end);
    if (this.state !== "stopped") this.apply();
  }

  setSteps(steps) {
    this.steps = steps.slice(0, SEQUENCE_LIMITS.steps.max).map((step) => makeStep(step.clip, step.repeat, step.speed));
    this.changed();
  }

  // Adds a step at the end. Answers whether there was room.
  addStep(clip) {
    if (this.steps.length >= SEQUENCE_LIMITS.steps.max) return false;
    this.steps.push(makeStep(clip));
    this.changed();
    return true;
  }

  removeStep(index) {
    if (index < 0 || index >= this.steps.length) return;
    this.steps.splice(index, 1);
    this.changed();
  }

  // Moves a step up (-1) or down (+1) the list.
  moveStep(index, delta) {
    const to = index + delta;
    if (index < 0 || index >= this.steps.length || to < 0 || to >= this.steps.length) return;
    [this.steps[index], this.steps[to]] = [this.steps[to], this.steps[index]];
    this.changed();
  }

  // Changes a step's clip, repeat or speed. Anything else in the patch is ignored, and the numbers are held between their limits.
  setStep(index, patch) {
    const step = this.steps[index];
    if (!step) return;
    this.steps[index] = makeStep(patch.clip ?? step.clip, patch.repeat ?? step.repeat, patch.speed ?? step.speed);
    this.changed();
  }

  setFade(value) {
    this.fade = clampTo(PLAYER_LIMITS.fade, value);
    this.changed();
  }

  setLoop(value) {
    this.loop = !!value;
    this.changed();
  }

  // Where the pose is now (see poseAt).
  get pose() {
    return poseAt(this.plan, this.time);
  }

  // How long the sequence is (one time round, if it loops).
  get length() {
    return this.plan.loop ? this.plan.cycle : this.plan.total;
  }

  // Plays from where it is, or from the start if it had ended. The clip player is stopped first, so that it is not holding the clips too.
  play() {
    if (this.plan.steps.length === 0) return false;
    this.player.stop();
    if (this.state === "ended" || (!this.plan.loop && this.time >= this.plan.total)) this.time = 0;
    this.state = "playing";
    this.apply();
    return true;
  }

  pause() {
    if (this.state === "playing") this.state = "paused";
  }

  toggle() {
    if (this.state === "playing") this.pause();
    else this.play();
  }

  // Stops, goes back to the start, and puts the model in its rest pose.
  stop() {
    this.release();
    applyRestPose(this.player.rest);
    this.time = 0;
    this.state = "stopped";
  }

  // Jumps to a time in the sequence and pauses there: scrubbing.
  seek(seconds) {
    if (this.plan.steps.length === 0) return;
    this.player.stop();
    this.time = Math.min(Math.max(seconds, 0), this.plan.loop ? this.plan.cycle : this.plan.total);
    this.state = "paused";
    this.apply();
  }

  // Called every frame with the seconds since the last one.
  update(dt) {
    if (this.state === "stopped") return;
    // If someone has used the clip player, it has the clips now: the sequence lets go and stops.
    if (this.player.state !== "stopped") {
      this.active.clear();
      this.state = "stopped";
      this.time = 0;
      return;
    }
    if (this.state !== "playing") return;
    this.time += dt;
    if (!this.plan.loop && this.time >= this.plan.total) {
      this.time = this.plan.total;
      this.state = "ended";
    }
    this.apply();
  }

  // Puts the clips where the sequence says they are at this moment, with the weights it says.
  apply() {
    const pose = this.pose;
    const wanted = new Set();
    for (const item of pose.items) {
      const group = this.player.find(item.clip);
      if (!group) continue;
      wanted.add(group);
      // A clip that is moved to its very last frame ends, and Babylon.js stops it: so it is started again if it is not running.
      if (!this.active.has(group) || !group.isStarted) {
        group.start(false, HOLD_SPEED, group.from, group.to, false);
        this.active.add(group);
      }
      group.goToFrame(frameAt(clipInfo(group), item.seconds));
      group.setWeightForAllAnimatables(item.weight);
    }
    for (const group of [...this.active]) {
      if (wanted.has(group)) continue;
      group.stop();
      this.active.delete(group);
    }
  }

  // Lets go of the clips that it is holding.
  release() {
    this.active.forEach((group) => group.stop());
    this.active.clear();
  }

  dispose() {
    this.release();
    this.state = "stopped";
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HOLD_SPEED, Sequencer };
} else {
  Object.assign(window, { HOLD_SPEED, Sequencer });
}
