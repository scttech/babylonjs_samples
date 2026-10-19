// Aiming math for anything that shoots at something else. Plain functions on
// plain numbers, so they can be tested without a ship, a UFO, or a screen.
//
// Directions are unit vectors: { x, y } with a length of 1. A bullet's velocity
// is then just direction * speed.

// The unit vector pointing from (fx, fy) toward (tx, ty). If the two points are
// the same, there is no direction to speak of, so it returns "straight up".
function directionTo(fx, fy, tx, ty) {
  const dx = tx - fx;
  const dy = ty - fy;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: 0, y: 1 };
  return { x: dx / length, y: dy / length };
}

// The unit vector to fire along so that a bullet of the given `speed`, fired
// from (fx, fy), meets a target now at (tx, ty) moving at (tvx, tvy). Aiming
// where the target IS misses a moving target; this aims where it WILL BE.
//
// If the bullet fired at time 0 meets the target at time t, then the target's
// distance from the shooter at t equals how far the bullet has flown:
//
//   |(tx - fx, ty - fy) + (tvx, tvy) * t| = speed * t
//
// Squaring both sides gives a quadratic in t. Take the earliest positive
// answer. If there isn't one (the target is outrunning the bullet), give up on
// leading it and aim straight at it.
function interceptDirection(fx, fy, tx, ty, tvx, tvy, speed) {
  const rx = tx - fx;
  const ry = ty - fy;

  const a = tvx * tvx + tvy * tvy - speed * speed;
  const b = 2 * (rx * tvx + ry * tvy);
  const c = rx * rx + ry * ry;

  let t = null;
  if (Math.abs(a) < 1e-9) {
    // The target moves at exactly the bullet's speed: the quadratic collapses
    // to a straight line, b * t + c = 0.
    if (b < 0) t = -c / b;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter((x) => x > 0);
      if (candidates.length) t = Math.min(...candidates);
    }
  }

  if (t === null) return directionTo(fx, fy, tx, ty);
  return directionTo(fx, fy, tx + tvx * t, ty + tvy * t);
}

// Turns a direction by `angle` radians (positive = counter-clockwise). Used to
// make a shooter inaccurate on purpose.
function rotateDirection(direction, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: direction.x * cos - direction.y * sin, y: direction.x * sin + direction.y * cos };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { directionTo, interceptDirection, rotateDirection };
} else {
  window.directionTo = directionTo;
  window.interceptDirection = interceptDirection;
  window.rotateDirection = rotateDirection;
}
