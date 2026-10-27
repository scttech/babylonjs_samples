// The marble: a steel ball that is a physics body. Havok moves it under gravity, rolls it
// down slopes and bounces it off floors, and we read its position back each frame. See
// ../tests/marble.tests.js.

const MARBLE_RADIUS = 0.5;
const MARBLE_MASS = 1;
const MARBLE_START = { x: -11, y: 5, z: 0 }; // above the start deck, to be dropped from
const GROUND_REACH = 0.15; // how far below its underside a floor can be for the marble to count as on it
const MARBLE_DAMPING = { linear: 0.15, angular: 0.35 };
const FALL_LIMIT = -12; // below this a marble has fallen off the course for good

// Whether a marble at height `y` has fallen off the course.
function hasFallen(y, limit = FALL_LIMIT) {
  return y < limit;
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

class Marble {
  constructor(scene, { start = MARBLE_START } = {}) {
    this.start = start;
    this.mesh = BABYLON.MeshBuilder.CreateSphere("marble", { diameter: MARBLE_RADIUS * 2, segments: 24 }, scene);
    this.mesh.material = makeSteel(scene);
    this.mesh.position.set(start.x, start.y, start.z);
    this.aggregate = new BABYLON.PhysicsAggregate(
      this.mesh,
      BABYLON.PhysicsShapeType.SPHERE,
      { mass: MARBLE_MASS, ...SURFACES.steel },
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

  // Whether it is on the ground: a ray from the middle of the marble, straight down, finds a floor
  // no further away than the marble's radius and a little more. (The physics does know what is
  // touching what, but a ray is the simple way to ask, and it lets a marble that is only just off
  // the floor count.) Only things with a physics body count, which here is the course.
  get grounded() {
    const ray = new BABYLON.Ray(this.mesh.position, BABYLON.Vector3.Down(), MARBLE_RADIUS + GROUND_REACH);
    const hit = this.mesh.getScene().pickWithRay(ray, (mesh) => mesh !== this.mesh && mesh.physicsBody);
    return Boolean(hit && hit.hit);
  }

  // Pushes the marble: `direction` is the way, in the world, with a length from 0 to 1 for how
  // hard. Call it every frame the player is pushing. The force comes from steeringForce, which
  // fades near top speed and is weaker in the air, and is given to the physics at the marble's
  // middle, so it pushes it along without making it spin by itself.
  push(direction) {
    const force = steeringForce(direction, this.velocity, this.grounded);
    if (force.x === 0 && force.z === 0) return;
    this.aggregate.body.applyForce(new BABYLON.Vector3(force.x, force.y, force.z), this.mesh.position);
  }

  // Puts the marble back at its start, still.
  reset() {
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
  module.exports = { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, GROUND_REACH, FALL_LIMIT, hasFallen, makeSteel, Marble };
} else {
  Object.assign(window, { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, GROUND_REACH, FALL_LIMIT, hasFallen, makeSteel, Marble });
}
