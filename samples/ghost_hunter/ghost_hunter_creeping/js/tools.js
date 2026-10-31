// The tools of the hunter: a **flashlight** and a **capture beam**. The flashlight shows what the dark hides (a ghost is only half there until
// the light is on it) and hurts what hates the light. The beam holds on to something and, if it is held for long enough, captures it. Each
// has a limit (the light's battery, the beam's heat), and each kind of creature has a **weakness**: how it takes the light, how it takes
// the beam, and how long the light stuns it. Everything here is plain arithmetic of rays, cones and time, with no Babylon.js, so that the
// tests can aim a tool at anything. See ../tests/tools.tests.js.

const TOOLS = {
  light: {
    range: 7, // metres
    halfAngle: 16, // degrees: the half-width of the cone
    drain: 1 / 80, // charge (0 to 1) a second while it is on: it lasts 80 seconds
    recharge: 1 / 30, // a second while it is off
    dimBelow: 0.2, // below this charge the light dims, and goes out at 0
    restartAt: 0.15, // a flat battery has to get this far before the light will come on again
    damage: 1, // health a second at a weakness of 1
    stunMax: 2.5, // seconds: a creature cannot be stunned for longer than this at once
  },
  beam: {
    range: 8,
    aimAssist: 0.3, // metres: the beam is held on what is nearly under it
    heat: 0.35, // a second while it is fired
    cool: 0.3, // a second while it is not
    overheatAt: 1,
    resumeAt: 0.4, // an overheated beam has to cool this far before it can be fired
    grip: 0.5, // how much of a hold it gets a second at a weakness of 1 (so two seconds to capture)
    letGo: 0.8, // how much of a hold is lost a second when the beam is not on it
  },
};

// How each kind of thing takes the tools. `light` is how much the light hurts it (a multiple of the table's damage), `stun` how long it is
// stopped by it (seconds for each second of light), and `beam` how fast the beam gets a hold of it. A ghost is not hurt by light, and is
// only shown by it.
const WEAKNESS = {
  spider: { light: 3, stun: 1.5, beam: 0.6 },
  ghoul: { light: 0.4, stun: 0, beam: 1.4 },
  skeleton: { light: 1, stun: 0.6, beam: 1 },
  doll: { light: 2, stun: 1, beam: 0.8 },
  floater: { light: 0.8, stun: 0, beam: 2 },
  horde: { light: 0.3, stun: 0, beam: 0.5 },
  ghost: { light: 0, stun: 0, beam: 1.2 },
};

const dotOf = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

// How far along a ray (a point and a direction of length one) a thing is, and how far it is off the ray, where a thing is a vertical
// stick (a person is one, with a radius): the closest points of a ray and a segment. Nothing if it is behind the ray.
function rayToSegment(origin, direction, a, b) {
  const e = minus(b, a), w = minus(origin, a);
  const along = dotOf(direction, e), length2 = dotOf(e, e), d0 = dotOf(direction, w), e0 = dotOf(e, w);
  const denominator = length2 - along * along; // the direction is of length one
  let s = Math.abs(denominator) > 1e-9 ? (e0 - along * d0) / denominator : 0; // how far along the segment is nearest the ray
  s = length2 === 0 ? 0 : Math.max(0, Math.min(1, s));
  const t = Math.max(0, s * along - d0); // and how far along the ray is nearest that point
  const onSegment = [a[0] + e[0] * s, a[1] + e[1] * s, a[2] + e[2] * s];
  const onRay = [origin[0] + direction[0] * t, origin[1] + direction[1] * t, origin[2] + direction[2] * t];
  return { t, distance: Math.hypot(...minus(onRay, onSegment)) };
}

// A thing is { base, radius, height }: its feet, and how thick and how tall it is. Gives how far along the ray it is hit (a ray `assist`
// metres wide, for the sake of a thumb), or null if it is missed or too far.
function hitTarget(origin, direction, target, range, assist = 0) {
  const lower = [target.base[0], target.base[1] + target.radius, target.base[2]];
  const upper = [target.base[0], target.base[1] + Math.max(target.radius, target.height - target.radius), target.base[2]];
  const { t, distance } = rayToSegment(origin, direction, lower, upper);
  if (t <= 0 || t > range || distance > target.radius + assist) return null;
  return t;
}

// Is a point inside a cone from a point, along a direction of length one, of a half angle (degrees) and a range?
function inCone(origin, direction, point, halfAngle, range) {
  const to = minus(point, origin);
  const distance = Math.hypot(...to);
  if (distance > range) return false;
  if (distance < 1e-6) return true;
  return dotOf(to, direction) / distance >= Math.cos((halfAngle * Math.PI) / 180);
}

// How strong a light is for a charge: full above the dimming point, and dying away below it.
function lightPower(charge, table = TOOLS.light) {
  if (charge >= table.dimBelow) return 1;
  return Math.max(0, charge / table.dimBelow);
}

class Tools {
  constructor(table = TOOLS, weakness = WEAKNESS) {
    this.table = table;
    this.weakness = weakness;
    this.lightOn = false;
    this.charge = 1;
    this.flat = false; // the battery has run out, and has not got back to the restart point
    this.heat = 0;
    this.overheated = false;
    this.grips = new Map(); // key -> how much of a hold the beam has (0 to 1)
    this.captures = {}; // kind -> how many
  }

  // The light is switched on or off. (A flat battery will not come on.)
  toggleLight() {
    if (this.lightOn) this.lightOn = false;
    else if (!this.flat && this.charge > 0) this.lightOn = true;
    return this.lightOn;
  }

  // How much of a hold the beam has on a thing now.
  gripOn(key) {
    return this.grips.get(key) || 0;
  }

  // Time going by, and the tools in use. `input` is { beam }: is the beam held. `world` is { player: { position, forward }, targets }
  // where a target is { key, kind, base, radius, height }. Gives what happened this frame.
  update(seconds, input, world) {
    const light = this.table.light, beam = this.table.beam;
    const origin = world.player.position, direction = world.player.forward;

    // the light: its battery, and what it shows and hurts
    if (this.lightOn) {
      this.charge = Math.max(0, this.charge - light.drain * seconds);
      if (this.charge === 0) {
        this.lightOn = false;
        this.flat = true;
      }
    } else {
      this.charge = Math.min(1, this.charge + light.recharge * seconds);
      if (this.flat && this.charge >= light.restartAt) this.flat = false;
    }
    const power = this.lightOn ? lightPower(this.charge, light) : 0;
    const lit = [];
    const hits = [];
    if (power > 0) {
      for (const target of world.targets) {
        const middle = [target.base[0], target.base[1] + target.height / 2, target.base[2]];
        if (!inCone(origin, direction, middle, light.halfAngle, light.range)) continue;
        lit.push(target.key);
        const weak = this.weakness[target.kind] || { light: 0, stun: 0, beam: 1 };
        hits.push({ key: target.key, damage: light.damage * weak.light * power * seconds, stun: weak.stun * power * seconds });
      }
    }

    // the beam: its heat, what it is on, and how much of a hold it has
    let aimed = null;
    let aimDistance = 0;
    const firing = Boolean(input.beam) && !this.overheated;
    if (firing) {
      this.heat = Math.min(beam.overheatAt, this.heat + beam.heat * seconds);
      if (this.heat >= beam.overheatAt) this.overheated = true;
      for (const target of world.targets) {
        const t = hitTarget(origin, direction, target, beam.range, beam.aimAssist);
        if (t !== null && (aimed === null || t < aimDistance)) {
          aimed = target;
          aimDistance = t;
        }
      }
    } else {
      this.heat = Math.max(0, this.heat - beam.cool * seconds);
      if (this.overheated && this.heat <= beam.resumeAt) this.overheated = false;
    }
    const captured = [];
    for (const key of [...this.grips.keys()]) {
      if (aimed && aimed.key === key) continue;
      const left = this.gripOn(key) - beam.letGo * seconds;
      if (left <= 0) this.grips.delete(key);
      else this.grips.set(key, left);
    }
    if (aimed) {
      const weak = this.weakness[aimed.kind] || { beam: 1 };
      const grip = this.gripOn(aimed.key) + beam.grip * weak.beam * seconds;
      if (grip >= 1) {
        this.grips.delete(aimed.key);
        this.captures[aimed.kind] = (this.captures[aimed.kind] || 0) + 1;
        captured.push(aimed);
      } else {
        this.grips.set(aimed.key, grip);
      }
    }
    return {
      lit, hits, captured,
      aimed: aimed ? aimed.key : null,
      aimDistance,
      firing,
      grip: aimed ? this.gripOn(aimed.key) : 0,
      lightOn: this.lightOn, power, charge: this.charge, heat: this.heat, overheated: this.overheated,
    };
  }

  // How many things have been captured, of a kind or in all.
  total(kind) {
    return kind === undefined ? Object.values(this.captures).reduce((a, b) => a + b, 0) : this.captures[kind] || 0;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOOLS, WEAKNESS, rayToSegment, hitTarget, inCone, lightPower, Tools };
} else {
  Object.assign(window, { TOOLS, WEAKNESS, rayToSegment, hitTarget, inCone, lightPower, Tools });
}
