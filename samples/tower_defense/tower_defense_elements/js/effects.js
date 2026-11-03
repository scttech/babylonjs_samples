// Effects: what a bolt does to an enemy besides harm it. Water slows it, fire burns it, earth stuns it and air pushes it
// back along the road. An effect is a row of a table, and an enemy has a `Status`: which effects it is under now, and for
// how long. A status knows nothing of models or of the scene, only of effects and time, and it says what the enemy is
// to do about it this moment (how fast to walk, how much to burn). See ../tests/effects.tests.js.

// One row for each effect. `name` and `color` are what the player sees. What the rest means depends on the effect:
//   slow  walks at `speed` (a share of its usual) for `seconds`.
//   burn  takes `damage` a second for `seconds`.
//   stun  stands still for `seconds`, and then can't be stunned again for `immune` more (or it would never move).
//   push  is thrown back `distance` along the road, sliding back over `glide` seconds. `seconds` is only how long the mark stays on the enemy.
// `radius` is how far from the enemy that is hit that the effect reaches: the others within it get it too. (A tower that
// slows one enemy at a time slows nothing, since the tower goes on to the one that gets past it. A wave of water slows the crowd.)
const EFFECTS = {
  slow: { name: "Slows", color: "#38b6ff", seconds: 2.5, speed: 0.5, radius: 1.6 },
  burn: { name: "Burns", color: "#f0701a", seconds: 3, damage: 3, radius: 0 },
  stun: { name: "Stuns", color: "#e8c33a", seconds: 1, immune: 1.6, radius: 0 },
  push: { name: "Pushes back", color: "#d8e6f2", seconds: 0.5, distance: 3, glide: 0.3, radius: 0 },
};

// The enemies that an effect reaches when it hits `enemy`: the enemy itself, and (for an effect with a radius) every other
// that is on its feet and within the radius of it.
function reached(kind, enemy, enemies) {
  const radius = EFFECTS[kind].radius;
  if (!radius) return [enemy];
  return [enemy, ...enemies.filter((other) => other !== enemy && other.alive && Math.hypot(other.x - enemy.x, other.z - enemy.z) <= radius)];
}

// The effect of a bender is as strong as its *potency* (a tower that has been upgraded is more potent), and an enemy
// takes as much of it as it is *affected* (a heavy trooper is hard to push, and burns hardly at all). Potency is
// multiplied into how long an effect lasts, and how far a push goes. A potency of nothing is no effect at all.
function strength(potency, affected = 1) {
  return Math.max(0, potency * affected);
}

// What an effect says it does, in words, for the panel: "Slows for 2.5 seconds", and so on, for a potency.
function describe(kind, potency = 1) {
  const effect = EFFECTS[kind];
  const seconds = Math.round(effect.seconds * potency * 10) / 10;
  const time = `${seconds} second${seconds === 1 ? "" : "s"}`;
  if (kind === "slow") return `Slows the crowd by half for ${time}`;
  if (kind === "burn") return `Burns for ${Math.round(effect.damage * effect.seconds * potency)} over ${time}`;
  if (kind === "stun") return `Stuns for ${time}`;
  return `Pushes back ${Math.round(effect.distance * potency * 10) / 10} along the road`;
}

class Status {
  constructor() {
    this.active = {}; // effect name -> { left: seconds to go }
    this.shield = 0; // seconds that it can't be stunned for
  }

  // Puts an effect on it, as strong as `amount` (the potency, with how much it is affected). It says what to do at once about
  // it: { applied, push }. `applied` is whether it took (a stun that is too soon after another, and an effect of no strength,
  // do not), and `push` is how far to throw it back, if it is a push.
  apply(kind, amount = 1) {
    const effect = EFFECTS[kind];
    if (amount <= 0 || !effect) return { applied: false, push: 0 };
    if (kind === "stun" && this.shield > 0) return { applied: false, push: 0 };
    const left = effect.seconds * amount;
    const now = this.active[kind];
    // A second of the same effect while it is on does not add to it: it makes it last as long as the longer.
    this.active[kind] = { left: now ? Math.max(now.left, left) : left };
    if (kind === "stun") this.shield = left + effect.immune;
    return { applied: true, push: kind === "push" ? effect.distance * amount : 0 };
  }

  // Which effects it is under now.
  get kinds() {
    return Object.keys(this.active);
  }

  has(kind) {
    return kind in this.active;
  }

  // Lets `dt` seconds go by. It says how to walk and how much it burned: { speed, burn }. `speed` is a share of its usual: nothing
  // while stunned, and a stun beats a slow. An effect is on for the whole of the step that it ends in (a step is a frame, and short). `burn` is the harm done in this time, and only for the time that was left to burn.
  update(dt) {
    this.shield = Math.max(0, this.shield - dt);
    let speed = 1;
    let burn = 0;
    for (const kind of this.kinds) {
      const { left } = this.active[kind];
      const used = Math.min(dt, left);
      if (kind === "slow") speed = Math.min(speed, EFFECTS.slow.speed);
      if (kind === "stun") speed = 0;
      if (kind === "burn") burn += EFFECTS.burn.damage * used;
      if (left - dt <= 0) delete this.active[kind];
      else this.active[kind].left = left - dt;
    }
    return { speed, burn };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EFFECTS, reached, strength, describe, Status };
} else {
  Object.assign(window, { EFFECTS, reached, strength, describe, Status });
}
