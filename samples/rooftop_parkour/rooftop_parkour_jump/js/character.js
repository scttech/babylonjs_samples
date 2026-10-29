// The runner: which character file there is, which animation clip suits the speed they are going, and a player that plays the clips
// and blends from one to the next so that the runner doesn't jump from pose to pose. The choice of clip (clipForSpeed) is a plain
// function, and ClipPlayer only needs objects that can start() and stop() and have a weight, so it is tested with stand-ins. The
// real clips come from the character's file, as Babylon.js animation groups. See ../tests/character.tests.js.

// The two characters. They share one skeleton and one set of clips, so either can play any of them.
const RUNNERS = {
  male: { file: "runner.glb", label: "Runner" },
  female: { file: "runner_f.glb", label: "Runner (she)" },
};

// The clips this part of the game uses. (The files have more, for the parts to come: see assets/README.md.)
const CLIPS = { idle: "Idle_Loop", walk: "Walk_Loop", jog: "Jog_Fwd_Loop", sprint: "Sprint_Loop", jump: "Jump_Start", fall: "Jump_Loop", land: "Jump_Land", roll: "Roll" };

// How fast the runner is going, in metres a second, for each gait. Below `walk` they are standing still; from there to `jog` they
// walk; to `sprint` they jog; and from there on they sprint. `pace` is how fast each clip's feet go when it is played as it was
// recorded, so playing it faster or slower makes the feet keep up with the ground.
const GAITS = { walk: 0.2, jog: 2.4, sprint: 5.2 };
const PACE = { walk: 1.5, jog: 3.6, sprint: 6.6 };
const MIN_RATE = 0.6;
const MAX_RATE = 1.5;

// The clip for the speed the runner is going: { name, rate }. `rate` is how fast to play it (1 is as recorded).
function clipForSpeed(speed) {
  const rate = (pace) => Math.min(MAX_RATE, Math.max(MIN_RATE, speed / pace));
  if (speed < GAITS.walk) return { name: CLIPS.idle, rate: 1 };
  if (speed < GAITS.jog) return { name: CLIPS.walk, rate: rate(PACE.walk) };
  if (speed < GAITS.sprint) return { name: CLIPS.jog, rate: rate(PACE.jog) };
  return { name: CLIPS.sprint, rate: rate(PACE.sprint) };
}

// How fast the landing clip plays: it is a little over a second as it was recorded, and a hard landing is over in less than half of one.
const LAND_RATE = 2.5;
const JUMP_RATE = 3; // the jump clip is a second and a third long, and a jump is over the top in a third of a second
const ROLL_RATE = 2; // the roll clip is a second and a half long, and its tumble is over by 0.6 of the way through: a roll lasts 0.45 of a second, and the runner goes straight on from the crouch

// The clip for a body (a Controller): { name, rate, loop }. On the way up from a jump, the jump clip, once, and then it stays at its last pose;
// on the way down, the falling clip, which goes on for as long as the fall; in a roll, the roll clip, once, fast enough to be done when the roll
// is; just after a hard landing, the landing clip, once; and otherwise the one for the speed.
function clipForBody(body) {
  if (!body.grounded) return body.jumping ? { name: CLIPS.jump, rate: JUMP_RATE, loop: false } : { name: CLIPS.fall, rate: 1, loop: true };
  if (body.rolling > 0) return { name: CLIPS.roll, rate: ROLL_RATE, loop: false };
  if (body.landing > 0) return { name: CLIPS.land, rate: LAND_RATE, loop: false };
  return { ...clipForSpeed(body.speed), loop: true };
}

const FADE_TIME = 0.2; // how long, in seconds, one clip takes to give way to the next

class ClipPlayer {
  // `clips` is a Map from a clip's name to its animation group.
  constructor(clips) {
    this.clips = clips;
    this.current = null; // the name of the clip playing now, if any
    this.fading = []; // the names of clips on their way out
    this.weight = 1; // how much the current clip is showing, from 0 (just started) to 1
  }

  // Plays the named clip at a rate (1 is as recorded), looping, or once if `loop` is false (it then stays at its last pose). The clip that was playing fades out while this one fades in. Asking
  // for the clip that is already playing only follows a change of rate, so it is safe to call every frame.
  play(name, rate = 1, loop = true) {
    const next = this.clips.get(name);
    if (!next) throw new Error(`The character has no clip called "${name}"`);
    if (name === this.current) {
      next.speedRatio = rate;
      return;
    }
    if (this.current) this.fading.push(this.current);
    this.fading = this.fading.filter((fading) => fading !== name); // one that is coming back is no longer on its way out
    next.start(loop, rate);
    next.setWeightForAllAnimatables(0);
    this.current = name;
    this.weight = 0;
  }

  // Moves the blend on by `dt` seconds: the current clip shows more, and the ones on their way out show less, and stop when they
  // are gone. Called every frame.
  update(dt) {
    if (!this.current) return;
    this.weight = Math.min(1, this.weight + dt / FADE_TIME);
    this.clips.get(this.current).setWeightForAllAnimatables(this.weight);
    for (const name of [...this.fading]) {
      const clip = this.clips.get(name);
      const left = 1 - this.weight;
      clip.setWeightForAllAnimatables(left);
      if (left <= 0) {
        clip.stop();
        this.fading = this.fading.filter((fading) => fading !== name);
      }
    }
  }
}

// Loads one of the characters, and returns { root, meshes, clips }: `root` is a node to put in the world and turn, `meshes` are
// what is drawn (so the shadows can be told), and `clips` is the Map of animation groups, all stopped.
async function loadRunner(scene, baseUrl, kind, onProgress) {
  const info = RUNNERS[kind];
  if (!info) throw new Error(`There is no runner called "${kind}"`);
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", baseUrl, info.file, scene, onProgress);
  const root = new BABYLON.TransformNode(`runner-${kind}`, scene);
  result.meshes[0].parent = root;
  const clips = new Map();
  for (const group of result.animationGroups) {
    group.stop();
    clips.set(group.name, group);
  }
  return { root, meshes: result.meshes, clips };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RUNNERS, CLIPS, GAITS, PACE, MIN_RATE, MAX_RATE, LAND_RATE, JUMP_RATE, ROLL_RATE, FADE_TIME, clipForSpeed, clipForBody, ClipPlayer, loadRunner };
} else {
  Object.assign(window, { RUNNERS, CLIPS, GAITS, PACE, MIN_RATE, MAX_RATE, LAND_RATE, JUMP_RATE, ROLL_RATE, FADE_TIME, clipForSpeed, clipForBody, ClipPlayer, loadRunner });
}
