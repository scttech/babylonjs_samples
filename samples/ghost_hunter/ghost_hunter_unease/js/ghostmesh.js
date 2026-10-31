// How a ghost looks, made in code: a body turned on a lathe from a profile, and a shader that makes it a glow and not a solid thing. It
// is see-through in the middle and bright at its edges (the edge is where you look along the surface), it fades towards its hem, its
// hem is ragged and sways, and a faint band of light runs up it. Two eyes burn in the head, and a trail of wisps follows it. All of it is
// driven by what ghost.js works out, and nothing here decides anything. See ../tests/ghostmesh.tests.js.

const GHOST_LOOK = {
  profile: [[0.02, 0], [0.26, 0.05], [0.34, 0.3], [0.3, 0.75], [0.22, 1.2], [0.17, 1.55], [0.13, 1.72], [0.16, 1.84], [0.19, 1.95], [0.18, 2.03], [0.1, 2.08], [0.01, 2.1]], // [radius, height] from the hem up: tall, thin, and a long head
  tessellation: 28,
  smoothing: 5, // points between each pair of corners of the profile
  eyeHeight: 1.9,
  eyeApart: 0.075,
  eyeForward: 0.15,
  eyeSize: 0.03, // a pinpoint: the eyes are small lights at the bottom of two black pits
  socketSize: 0.12,
  mouthHeight: 1.72, // and under them a mouth that gapes as it comes near
  shoulderHeight: 1.5,
  armLength: 1.05,
  color: [0.55, 0.72, 0.78], // a cold, pale grey-blue: not a cheerful cyan
  eyeColor: [1, 0.8, 0.75],
};

const GHOST_VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec3 normal;
uniform mat4 world;
uniform mat4 worldViewProjection;
uniform float time;
uniform float phase;
uniform float height;
varying vec3 vNormalW;
varying vec3 vPositionW;
varying float vHeight;
void main() {
  vec3 p = position;
  float h = clamp(p.y / height, 0.0, 1.0);
  float sway = 1.0 - h;
  float around = atan(p.z, p.x);
  p.x += sin(time * 1.6 + p.y * 3.0 + phase) * 0.07 * sway;
  p.z += cos(time * 1.3 + p.y * 2.5 + phase) * 0.07 * sway;
  float hem = smoothstep(0.3, 0.0, h);
  p.xz *= 1.0 + sin(around * 7.0 + time * 2.0 + phase) * 0.2 * hem;
  p.y -= hem * (0.5 + 0.5 * sin(around * 5.0 + time * 1.2 + phase)) * 0.28;
  vec4 worldPosition = world * vec4(p, 1.0);
  vPositionW = worldPosition.xyz;
  vNormalW = normalize(mat3(world[0].xyz, world[1].xyz, world[2].xyz) * normal);
  vHeight = h;
  gl_Position = worldViewProjection * vec4(p, 1.0);
}
`;

const GHOST_FRAGMENT = `
precision highp float;
varying vec3 vNormalW;
varying vec3 vPositionW;
varying float vHeight;
uniform vec3 cameraPosition;
uniform vec3 color;
uniform float opacity;
uniform float time;
void main() {
  vec3 toEye = normalize(cameraPosition - vPositionW);
  float edge = 1.0 - abs(dot(normalize(vNormalW), toEye));
  float rim = pow(edge, 1.7);
  float fade = smoothstep(0.0, 0.4, vHeight);
  float band = 0.85 + 0.15 * sin(vHeight * 55.0 - time * 3.0);
  float strength = (0.16 + 0.84 * rim) * fade * band * opacity;
  vec3 glow = mix(color * 0.35, vec3(0.75, 0.85, 0.88), rim);
  gl_FragColor = vec4(glow, strength);
}
`;

// The shader is put where Babylon.js looks for them, once.
function registerGhostShader() {
  BABYLON.Effect.ShadersStore.ghostVertexShader = GHOST_VERTEX;
  BABYLON.Effect.ShadersStore.ghostFragmentShader = GHOST_FRAGMENT;
}

function ghostMaterial(scene, phase, look = GHOST_LOOK, height = GHOST.height) {
  const material = new BABYLON.ShaderMaterial("ghost", scene, "ghost", {
    attributes: ["position", "normal"],
    uniforms: ["world", "worldViewProjection", "time", "phase", "height", "cameraPosition", "color", "opacity"],
    needAlphaBlending: true,
  });
  material.backFaceCulling = false; // see the inside of the back of it through the front
  material.alphaMode = BABYLON.Engine.ALPHA_ADD;
  material.setFloat("phase", phase);
  material.setFloat("height", height);
  material.setFloat("time", 0);
  material.setFloat("opacity", 0);
  material.setColor3("color", new BABYLON.Color3(...look.color));
  material.setVector3("cameraPosition", BABYLON.Vector3.Zero());
  return material;
}

// A ghost to look at: a root that is moved and turned, with a body, two pinpoint eyes in black pits, a mouth, two long arms and a trail of wisps. `apparition` is the numbers of it
// (ghost.js), and `texture` the soft puff the trail is made of.
class GhostBody {
  constructor(scene, apparition, texture, look = GHOST_LOOK) {
    this.scene = scene;
    this.apparition = apparition;
    this.look = look;
    this.root = new BABYLON.TransformNode(`ghost-${apparition.id}`, scene);
    this.root.rotationQuaternion = null;

    const corners = look.profile.map(([radius, y]) => new BABYLON.Vector3(radius, y, 0));
    const shape = BABYLON.Curve3.CreateCatmullRomSpline(corners, look.smoothing, false).getPoints(); // the corners made into a smooth curve
    this.body = BABYLON.MeshBuilder.CreateLathe(`ghost-body-${apparition.id}`, { shape, tessellation: look.tessellation, sideOrientation: BABYLON.Mesh.DOUBLESIDE }, scene);
    this.body.parent = this.root;
    this.body.isPickable = false;
    this.material = ghostMaterial(scene, apparition.seed * 1.7, look, apparition.table.height);
    this.body.material = this.material;

    this.eyeMaterial = new BABYLON.StandardMaterial(`ghost-eyes-${apparition.id}`, scene);
    this.eyeMaterial.disableLighting = true;
    this.eyeMaterial.emissiveColor = new BABYLON.Color3(...look.eyeColor);
    this.eyes = [-1, 1].map((side) => {
      const eye = BABYLON.MeshBuilder.CreateSphere(`ghost-eye-${apparition.id}-${side}`, { diameter: look.eyeSize, segments: 8 }, scene);
      eye.parent = this.root;
      eye.position.set(side * look.eyeApart, look.eyeHeight, look.eyeForward);
      eye.material = this.eyeMaterial;
      eye.isPickable = false;
      return eye;
    });

    // the black pits the eyes are in, and a mouth, and two long arms that hang and then reach
    this.darkMaterial = new BABYLON.StandardMaterial(`ghost-dark-${apparition.id}`, scene);
    this.darkMaterial.disableLighting = true;
    this.darkMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0);
    this.darkMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    this.sockets = [-1, 1].map((side) => {
      const socket = BABYLON.MeshBuilder.CreateSphere(`ghost-socket-${apparition.id}-${side}`, { diameter: look.socketSize, segments: 8 }, scene);
      socket.parent = this.root;
      socket.position.set(side * look.eyeApart, look.eyeHeight, look.eyeForward - 0.03);
      socket.scaling.set(0.8, 1.25, 0.6);
      socket.material = this.darkMaterial;
      socket.isPickable = false;
      return socket;
    });
    this.mouth = BABYLON.MeshBuilder.CreateSphere(`ghost-mouth-${apparition.id}`, { diameter: 0.1, segments: 8 }, scene);
    this.mouth.parent = this.root;
    this.mouth.position.set(0, look.mouthHeight, look.eyeForward - 0.05);
    this.mouth.material = this.darkMaterial;
    this.mouth.isPickable = false;
    this.armMaterial = new BABYLON.StandardMaterial(`ghost-arm-${apparition.id}`, scene);
    this.armMaterial.disableLighting = true;
    this.armMaterial.emissiveColor = new BABYLON.Color3(...look.color.map((n) => n * 0.5));
    this.shoulders = [-1, 1].map((side) => {
      const shoulder = new BABYLON.TransformNode(`ghost-shoulder-${apparition.id}-${side}`, scene);
      shoulder.parent = this.root;
      shoulder.position.set(side * 0.2, look.shoulderHeight, 0.03);
      const arm = BABYLON.MeshBuilder.CreateCylinder(`ghost-arm-${apparition.id}-${side}`, { height: look.armLength, diameterTop: 0.012, diameterBottom: 0.07, tessellation: 8 }, scene);
      arm.parent = shoulder;
      arm.position.y = -look.armLength / 2;
      arm.rotation.x = Math.PI; // thin end down: it tapers to long fingers
      arm.material = this.armMaterial;
      arm.isPickable = false;
      return shoulder;
    });

    this.trail = createTrail(scene, this.body, texture);
    this.trailRate = this.trail.emitRate;
  }

  // Brings the look up to date with the numbers: where it is, which way it faces, and how much of it shows.
  update(time) {
    const ghost = this.apparition;
    const shown = ghost.stage !== "waiting" && ghost.stage !== "gone";
    this.root.setEnabled(shown);
    const opacity = ghost.opacity();
    const position = ghost.position();
    this.root.position.set(position[0], position[1], position[2]);
    this.root.rotation.y = ghost.yaw;
    this.material.setFloat("time", time);
    this.material.setFloat("opacity", opacity);
    const camera = this.scene.activeCamera;
    if (camera) this.material.setVector3("cameraPosition", camera.globalPosition);
    this.eyeMaterial.alpha = Math.min(1, opacity * 1.5);
    this.darkMaterial.alpha = Math.min(1, opacity * 1.6);
    this.armMaterial.alpha = Math.min(1, opacity * 0.9);
    // as it comes near its mouth opens and its arms rise towards you; and its head is a little on one side, as if listening
    this.mouth.scaling.set(1, 0.25 + ghost.near * 2.4, 0.6);
    this.shoulders.forEach((shoulder, i) => {
      shoulder.rotation.x = -(0.12 + ghost.near * 1.25 + Math.sin(time * 0.9 + i * 2 + ghost.seed) * 0.05);
      shoulder.rotation.z = (i === 0 ? 1 : -1) * 0.1;
    });
    this.root.rotation.z = Math.sin(time * 0.5 + ghost.seed) * 0.06 + 0.07;
    this.trail.emitRate = shown ? this.trailRate * Math.min(1, opacity / ghost.table.opacity) : 0;
  }

  dispose() {
    releaseEffect(this.trail);
    this.eyes.forEach((eye) => eye.dispose());
    this.sockets.forEach((socket) => socket.dispose());
    this.mouth.dispose();
    this.shoulders.forEach((shoulder) => shoulder.dispose(false, false));
    this.body.dispose();
    this.material.dispose();
    this.eyeMaterial.dispose();
    this.darkMaterial.dispose();
    this.armMaterial.dispose();
    this.root.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GHOST_LOOK, GHOST_VERTEX, GHOST_FRAGMENT, registerGhostShader, ghostMaterial, GhostBody };
} else {
  Object.assign(window, { GHOST_LOOK, GHOST_VERTEX, GHOST_FRAGMENT, registerGhostShader, ghostMaterial, GhostBody });
}
