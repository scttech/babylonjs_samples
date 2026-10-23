// The marble: a steel ball that is a physics body. Havok moves it under gravity, rolls it
// down slopes and bounces it off floors, and we read its position back each frame. See
// ../tests/marble.tests.js.

const MARBLE_RADIUS = 0.5;
const MARBLE_MASS = 1;
const MARBLE_START = { x: -4, y: 5, z: 0 }; // above the top of the ramp, to be dropped from
// A ball on a flat floor rolls on for ever if nothing slows it: rolling grips, and gripping
// doesn't use up any speed. Real marbles slow down because of tiny dents in the floor and in the
// air, which Havok doesn't know about. So the body is given some damping: a fraction of its speed
// (and of its spin) that it loses every second.
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
  module.exports = { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, FALL_LIMIT, hasFallen, makeSteel, Marble };
} else {
  Object.assign(window, { MARBLE_RADIUS, MARBLE_MASS, MARBLE_START, MARBLE_DAMPING, FALL_LIMIT, hasFallen, makeSteel, Marble });
}
