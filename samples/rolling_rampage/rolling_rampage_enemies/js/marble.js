// The marble: a steel ball that is a physics body. Havok moves it under gravity, rolls it
// down slopes and bounces it off floors, and we read its position back each frame. See
// ../tests/marble.tests.js.

const MARBLE_RADIUS = 0.5;
const MARBLE_MASS = 1;
const MARBLE_START = { x: -11, y: 5, z: 0 }; // above the start deck, to be dropped from
const GROUND_REACH = 0.15; // how far below its underside a floor can be for the marble to count as on it
const MARBLE_DAMPING = { linear: 0.15, angular: 0.35 };
const STOP_DAMPING = 8; // how hard a marble that has been stopped is held still
const SLIME_DAMPING = 3; // how thick slime is: the speed a marble loses in it, a share of it each second
const SLIME_GREEN = "#6fd13a"; // what a marble goes as the slime eats it
const CARRY_GRIP = 8; // how firmly a moving platform takes a marble along: a share of the difference in speed, every second
const GLIDE_RATE = 4; // how quickly a gliding marble closes on its target: a share of the distance, every second
const GLIDE_MAX_SPEED = 4; // and the fastest it glides, in units a second
const FALL_LIMIT = -12; // below this a marble has fallen off the course for good

// Whether a marble at height `y` has fallen off the course.
function hasFallen(y, limit = FALL_LIMIT) {
  return y < limit;
}

// How fast, and which way, a marble should be going to glide to a point: toward it, at a speed that
// is a share of how far away it is (so it eases in and arrives gently), but never above `maxSpeed`.
// Flat: x and z only. At the point, or very near it, it is still.
function glideVelocity(from, to, rate = GLIDE_RATE, maxSpeed = GLIDE_MAX_SPEED) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const distance = Math.hypot(dx, dz);
  if (distance < 0.02) return { x: 0, z: 0 };
  const speed = Math.min(maxSpeed, distance * rate);
  return { x: (dx / distance) * speed, z: (dz / distance) * speed };
}

// A steel look: a dark grey that is mostly shine. (A real mirror would need a picture of
// the world around it to reflect, so this one just has a bright, sharp highlight.)
function makeSteel(scene) {
  const material = new BABYLON.StandardMaterial("steel", scene);
  material.diffuseColor = new BABYLON.Color3(0.55, 0.62, 0.74); // chrome, with the logo's blue in it
  material.specularColor = new BABYLON.Color3(1, 1, 1);
  material.specularPower = 96;
  return material;
}

// A marble. Everything but `start` is optional, and is what makes an enemy a different marble: its `name`,
// its `material` (the look), its `mass`, and its `steer`, how hard it can push itself ({ force, topSpeed }, as
// steeringForce takes them).
class Marble {
  constructor(scene, { start = MARBLE_START, name = "marble", material = null, mass = MARBLE_MASS, steer = {} } = {}) {
    this.start = start;
    this.steer = steer;
    this.mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter: MARBLE_RADIUS * 2, segments: 24 }, scene);
    this.mesh.material = material || makeSteel(scene);
    this.mesh.position.set(start.x, start.y, start.z);
    this.aggregate = new BABYLON.PhysicsAggregate(
      this.mesh,
      BABYLON.PhysicsShapeType.SPHERE,
      { mass, ...SURFACES.steel },
      scene
    );
    this.aggregate.body.setLinearDamping(MARBLE_DAMPING.linear);
    this.aggregate.body.setAngularDamping(MARBLE_DAMPING.angular);
    // Physics normally only moves the mesh. To put the marble somewhere ourselves (a reset)
    // it has to read the mesh's position back before each step as well.
    this.aggregate.body.disablePreStep = false;
  }
  
  // Where the marble is.
  get position() {
    return this.mesh.position;
  }

  // How fast it is going, in units a second.
  get speed() {
    return this.aggregate.body.getLinearVelocity().length();
  }

  // Which way, and how fast, it is going: { x, y, z }.
  get velocity() {
    const v = this.aggregate.body.getLinearVelocity();
    return { x: v.x, y: v.y, z: v.z };
  }

  // What it is on: a ray from the middle of the marble, straight down, finds a floor no further away
  // than the marble's radius and a little more, and this is the mesh of that floor (or null, in the air).
  // (The physics does know what is touching what, but a ray is the simple way to ask, and it lets a marble
  // that is only just off the floor count.) Only things with a physics body count, which here is the
  // level, and its movers.
  get ground() {
    const ray = new BABYLON.Ray(this.mesh.position, BABYLON.Vector3.Down(), MARBLE_RADIUS + GROUND_REACH);
    const hit = this.mesh.getScene().pickWithRay(ray, (mesh) => mesh !== this.mesh && mesh.physicsBody);
    return hit && hit.hit ? hit.pickedMesh : null;
  }

  // Whether it is on the ground.
  get grounded() {
    return this.ground !== null;
  }

  // Pushes the marble: `direction` is the way, in the world, with a length from 0 to 1 for how
  // hard. Call it every frame the player is pushing. The force comes from steeringForce, which
  // fades near top speed and is weaker in the air, and is given to the physics at the marble's
  // middle, so it pushes it along without making it spin by itself.
  push(direction) {
    const force = steeringForce(direction, this.velocity, this.grounded, this.steer);
    if (force.x === 0 && force.z === 0) return;
    this.aggregate.body.applyForce(new BABYLON.Vector3(force.x, force.y, force.z), this.mesh.position);
  }

  // Brings the marble to a halt, and keeps it there: its speed and spin are taken away at once, and
  // it is damped so hard that a slope under it couldn't get it going again. `reset` lets it roll.
  stop() {
    this.aggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
    this.aggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
    this.aggregate.body.setLinearDamping(STOP_DAMPING);
    this.aggregate.body.setAngularDamping(STOP_DAMPING);
  }

  // Rolls the marble toward a point on the floor, { x, z }, easing in, whatever else it was doing. Call it every
  // frame. It only sets the speed along the floor, and leaves the speed up and down alone, so the
  // marble still falls and still stays on the floor.
  glideTo(point) {
    const speed = this.aggregate.body.getLinearVelocity();
    const glide = glideVelocity(this.mesh.position, point);
    this.aggregate.body.setLinearVelocity(new BABYLON.Vector3(glide.x, speed.y, glide.z));
  }

  // Makes the marble roll through something thick (slime), or back to normal. Damping is the share of
  // its speed a marble loses every second, so thick is a high one.
  slow(thick) {
    this.aggregate.body.setLinearDamping(thick ? SLIME_DAMPING : MARBLE_DAMPING.linear);
  }

  // Moves the marble toward the speed of a floor that is moving, { x, z }: each second it closes CARRY_GRIP of
  // the difference, so a marble put on a moving platform is soon going with it, and one that is steered
  // across it still can be. Call it every frame the marble is on the platform.
  carry(platform, dt) {
    const speed = this.aggregate.body.getLinearVelocity();
    const give = 1 - Math.exp(-CARRY_GRIP * dt);
    this.aggregate.body.setLinearVelocity(
      new BABYLON.Vector3(speed.x + (platform.x - speed.x) * give, speed.y, speed.z + (platform.z - speed.z) * give)
    );
  }

  // Colours the marble green by `amount`, from 0 (as it is) to 1 (all the way), as slime eats it.
  tint(amount) {
    this.mesh.material.emissiveColor = BABYLON.Color3.Lerp(BABYLON.Color3.Black(), BABYLON.Color3.FromHexString(SLIME_GREEN), amount);
  }

  // Puts the marble back at its start, still, clean, and free to roll.
  reset() {
    this.tint(0);
    this.aggregate.body.setLinearDamping(MARBLE_DAMPING.linear);
    this.aggregate.body.setAngularDamping(MARBLE_DAMPING.angular);
    this.mesh.position.set(this.start.x, this.start.y, this.start.z);
    this.mesh.rotationQuaternion = BABYLON.Quaternion.Identity();
    this.aggregate.body.setLinearVelocity(BABYLON.Vector3.Zero());
    this.aggregate.body.setAngularVelocity(BABYLON.Vector3.Zero());
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, STOP_DAMPING, SLIME_DAMPING, SLIME_GREEN, CARRY_GRIP, GLIDE_RATE, GLIDE_MAX_SPEED, GROUND_REACH, FALL_LIMIT, hasFallen, glideVelocity, makeSteel, Marble };
} else {
  Object.assign(window, { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, STOP_DAMPING, SLIME_DAMPING, SLIME_GREEN, CARRY_GRIP, GLIDE_RATE, GLIDE_MAX_SPEED, GROUND_REACH, FALL_LIMIT, hasFallen, glideVelocity, makeSteel, Marble });
}
