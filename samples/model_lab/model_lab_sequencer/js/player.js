// The clip player: it plays one clip of a model at a time, with the controls of a media player (play, pause, stop, step by a frame, jump to a time,
// change the speed, loop) and a cross-fade when it changes from one clip to another. It has no buttons in it: a page, or a test, tells it what to do.
// See ../tests/player.tests.js.

// The **rest pose** of a model: where everything that its clips move is, before any clip has moved it. Babylon.js does not put a model back when a
// clip is stopped (it stays where the clip left it), so the player writes the rest pose down first, and puts it back on Stop.
// It writes down each *thing and property that a track moves*, and not "every bone's position, turn and size", because a clip can move things that
// are not bones: a **morph target** (a shape, such as a face that smiles, with an `influence` that says how much of it there is) is one, and a model of
// a cat has one. Asking such a thing for its `position` would fail.
function captureRestPose(groups) {
  const moved = new Map(); // thing -> the properties of it that a track moves
  groups.forEach((group) =>
    group.targetedAnimations.forEach(({ target, animation }) => {
      if (!moved.has(target)) moved.set(target, new Set());
      moved.get(target).add(animation.targetProperty);
    })
  );
  const pose = [];
  for (const [target, properties] of moved) {
    for (const property of properties) {
      const value = target[property];
      if (value === undefined || value === null) continue;
      pose.push({ target, property, value: typeof value === "object" && value.clone ? value.clone() : value });
    }
  }
  return pose;
}

// Puts everything back as the rest pose has it: a position, a turn or a size is copied back into the one the thing has, and a plain number (such as
// an influence) is just set.
function applyRestPose(pose) {
  for (const saved of pose) {
    const now = saved.target[saved.property];
    if (now && typeof now === "object" && typeof now.copyFrom === "function") now.copyFrom(saved.value);
    else saved.target[saved.property] = saved.value;
  }
}

class ClipPlayer {
  // `groups` are the clips of a model (a container's animationGroups). Make the player before anything has been played, so that the rest pose is right.
  constructor(groups) {
    this.groups = groups;
    this.rest = captureRestPose(groups);
    this.current = null; // the clip that is chosen
    this.outgoing = null; // the clip that is fading out, if there is a cross-fade
    this.fade = null; // { elapsed, duration } while there is one
    this.state = "stopped"; // "stopped" (at the rest pose), "playing", "paused" or "ended" (a clip that does not loop, at its last frame)
    this.speed = PLAYER_LIMITS.speed.start;
    this.fadeTime = PLAYER_LIMITS.fade.start;
    this.loop = true;
    this.watchers = groups.map((group) => ({ group, observer: group.onAnimationGroupEndObservable.add(() => this.ended(group)) }));
  }

  // The clip with a name, or null.
  find(name) {
    return this.groups.find((group) => group.name === name) || null;
  }

  // The chosen clip's timing, or null when none is chosen.
  get info() {
    return this.current ? clipInfo(this.current) : null;
  }

  // Seconds into the chosen clip. A clip that is stopped is at 0, and one that has ended is at its end.
  get time() {
    if (!this.current) return 0;
    if (this.state === "stopped") return 0;
    const info = clipInfo(this.current);
    if (this.state === "ended") return info.seconds;
    const animatable = this.current.animatables[0];
    return animatable ? secondsAt(info, animatable.masterFrame) : 0;
  }

  // Starts a clip, with the player's speed and loop, at a weight (1 is the whole pose, 0 is none of it).
  begin(group, weight) {
    group.start(this.loop, this.speed, group.from, group.to, false);
    group.setWeightForAllAnimatables(weight);
  }

  // Plays a clip from its start. If another clip is playing (or paused), the new one fades in over `fadeTime` seconds while the old one fades
  // out. Answers whether there was such a clip.
  play(name) {
    const next = this.find(name);
    if (!next) return false;
    this.finishFade();
    const previous = this.current;
    const crossing = previous && previous !== next && (this.state === "playing" || this.state === "paused") && this.fadeTime > 0;
    if (crossing) {
      this.outgoing = previous;
      this.begin(next, 0);
      this.fade = { elapsed: 0, duration: this.fadeTime };
    } else {
      this.stopAll();
      this.begin(next, 1);
    }
    this.current = next;
    this.state = "playing";
    return true;
  }

  // Pauses the clip where it is.
  pause() {
    if (this.state !== "playing") return;
    this.current.pause();
    if (this.outgoing) this.outgoing.pause();
    this.state = "paused";
  }

  // Carries on from where it was paused, or plays again from the start if the clip had ended.
  resume() {
    if (!this.current) return;
    if (this.state === "ended") return void this.play(this.current.name);
    if (this.state !== "paused") return;
    this.current.play(this.loop);
    if (this.outgoing) this.outgoing.play(this.loop);
    this.state = "playing";
  }

  // The play button: pauses a clip that is playing, and plays one that is not.
  toggle() {
    if (this.state === "playing") this.pause();
    else this.resume();
  }

  // Stops, and puts the model back in its rest pose. The chosen clip stays chosen.
  stop() {
    this.finishFade();
    this.stopAll();
    applyRestPose(this.rest);
    this.state = "stopped";
  }

  // Jumps to a number of seconds into the chosen clip, and pauses there: this is scrubbing.
  seek(seconds) {
    if (!this.current) return;
    this.finishFade();
    const info = clipInfo(this.current);
    if (this.state === "stopped" || this.state === "ended") {
      this.begin(this.current, 1);
      this.current.pause();
    } else if (this.state === "playing") {
      this.current.pause();
    }
    this.current.goToFrame(frameAt(info, seconds));
    this.state = "paused";
  }

  // Moves by a number of frames (a negative number goes back) and pauses there.
  step(frames) {
    if (!this.current) return;
    const info = clipInfo(this.current);
    this.seek(this.time + frames / info.fps);
  }

  setSpeed(value) {
    this.speed = clampTo(PLAYER_LIMITS.speed, value);
    [this.current, this.outgoing].forEach((group) => {
      if (group) group.speedRatio = this.speed;
    });
  }

  setLoop(value) {
    this.loop = !!value;
    if (this.current) this.current.loopAnimation = this.loop;
  }

  setFadeTime(value) {
    this.fadeTime = clampTo(PLAYER_LIMITS.fade, value);
  }

  // Called every frame with the seconds since the last one. It runs the cross-fade, if there is one.
  update(dt) {
    if (!this.fade) return;
    this.fade.elapsed += dt;
    const weights = fadeWeights(this.fade.elapsed, this.fade.duration);
    this.current.setWeightForAllAnimatables(weights.incoming);
    this.outgoing.setWeightForAllAnimatables(weights.outgoing);
    if (this.fade.elapsed >= this.fade.duration) this.finishFade();
  }

  // Ends a cross-fade at once: the old clip stops and the new one has all the weight.
  finishFade() {
    if (!this.fade) return;
    this.outgoing.stop();
    this.current.setWeightForAllAnimatables(1);
    this.outgoing = null;
    this.fade = null;
  }

  stopAll() {
    this.groups.forEach((group) => group.stop());
  }

  // A clip that does not loop has reached its end. Only the chosen one counts.
  ended(group) {
    if (group === this.current && this.state === "playing" && !this.fade) this.state = "ended";
  }

  // Stops listening, and stops everything (the model is going).
  dispose() {
    this.watchers.forEach(({ group, observer }) => group.onAnimationGroupEndObservable.remove(observer));
    this.watchers = [];
    this.stopAll();
    this.current = null;
    this.outgoing = null;
    this.fade = null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { captureRestPose, applyRestPose, ClipPlayer };
} else {
  Object.assign(window, { captureRestPose, applyRestPose, ClipPlayer });
}
