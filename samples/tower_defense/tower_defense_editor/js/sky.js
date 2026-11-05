// The sky: clouds that drift past below the island. A cloud is a flat picture that always faces the
// camera, drawn once in code and used for every cloud. Where they are and how they move is plain
// numbers, worked out apart from the drawing, so that it can be tested. See ../tests/sky.tests.js.

const CLOUDS = {
  count: 12,
  seed: 11, // which sky
  width: [8, 18], // the least and the most a cloud is wide, in world units
  speed: [0.3, 0.9], // how fast it drifts to the right, in world units a second
  opacity: [0.55, 0.95],
  below: [4, 12], // how far under the board it is
  reachX: 34, // how far left and right of the middle they are found
  reachZ: 16, // and how far toward and away from the camera
  shape: 0.45, // how tall a cloud is, as a share of its width
};

const between = (range, t) => range[0] + (range[1] - range[0]) * t;

// Where every cloud starts, and what each is like: a list of { x, y, z, width, speed, opacity }.
// `random` is given, so that a test can ask for the same sky every time.
function cloudPlan(random, clouds = CLOUDS) {
  const plan = [];
  for (let n = 0; n < clouds.count; n++) {
    plan.push({
      x: (random() * 2 - 1) * clouds.reachX,
      y: -between(clouds.below, random()),
      z: (random() * 2 - 1) * clouds.reachZ,
      width: between(clouds.width, random()),
      speed: between(clouds.speed, random()),
      opacity: between(clouds.opacity, random()),
    });
  }
  return plan;
}

// Moves a cloud on for `dt` seconds. When it has drifted right out of the sky on the right it comes
// in again on the left, put just far enough out that none of it is showing.
function driftCloud(cloud, dt, clouds = CLOUDS) {
  const edge = clouds.reachX + cloud.width / 2;
  const x = cloud.x + cloud.speed * dt;
  return { ...cloud, x: x > edge ? -edge : x };
}

// A picture of a cloud: a few soft white puffs side by side, drawn with gradients that fade to nothing.
function makeCloudTexture(scene, random) {
  const width = 256;
  const height = 128;
  const texture = new BABYLON.DynamicTexture("cloud", { width, height }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.clearRect(0, 0, width, height);
  const puffs = 7;
  for (let n = 0; n < puffs; n++) {
    const x = 36 + (n / (puffs - 1)) * (width - 72) + (random() - 0.5) * 12;
    const y = height * (0.62 - 0.22 * Math.sin((n / (puffs - 1)) * Math.PI)) + (random() - 0.5) * 8;
    const radius = 24 + random() * 16;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.6, "rgba(255,255,255,0.7)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  texture.update();
  return texture;
}

// Makes the clouds in a scene. `update(dt)` drifts them all, and `setVisible(false)` puts them away.
function buildClouds(scene, random, clouds = CLOUDS) {
  const texture = makeCloudTexture(scene, random);
  const state = cloudPlan(random, clouds);
  const planes = state.map((cloud, n) => {
    const plane = BABYLON.MeshBuilder.CreatePlane(`cloud ${n}`, { width: cloud.width, height: cloud.width * clouds.shape }, scene);
    plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL; // always faces the camera
    plane.isPickable = false;
    const material = new BABYLON.StandardMaterial(`cloud ${n}`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.emissiveColor = BABYLON.Color3.White();
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alpha = cloud.opacity;
    plane.material = material;
    plane.position.set(cloud.x, cloud.y, cloud.z);
    return plane;
  });
  const update = (dt) => {
    state.forEach((cloud, n) => {
      state[n] = driftCloud(cloud, dt, clouds);
      planes[n].position.x = state[n].x;
    });
  };
  // Shows the clouds, or puts them away (for a game on a slow device).
  const setVisible = (visible) => planes.forEach((plane) => plane.setEnabled(visible));
  return { planes, update, setVisible };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLOUDS, cloudPlan, driftCloud, makeCloudTexture, buildClouds };
} else {
  Object.assign(window, { CLOUDS, cloudPlan, driftCloud, makeCloudTexture, buildClouds });
}
