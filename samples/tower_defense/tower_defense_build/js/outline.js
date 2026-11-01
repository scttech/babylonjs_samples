// What is drawn on the board while a podium is held: an outline round the cell it is over, which is
// green where a tower can be built and red where it can't and fades from one to the other, and a ring on the
// ground that shows how far the tower can shoot. The colors and how they fade are plain numbers, apart from
// the drawing, so that they can be tested. See ../tests/outline.tests.js.

const OUTLINE = {
  ok: "#3fd16b", // green: a tower can be built here
  bad: "#e5483a", // red: it can't
  fade: 9, // how quickly it changes color: bigger is quicker (it is the rate of an exponential approach, a second at a time)
  size: 0.94, // how big the outline is, as a share of a cell
  height: 0.06, // how far above the ground it is, so that it isn't lost in the grass
};

// A color as a list of three numbers from 0 to 1: red, green and blue.
function parseColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// One step from a color towards another: each of the three goes `step` of the way (a number from 0 to 1) there.
// Always a share of what is left, so it slows down as it arrives and does not overshoot.
function fadeColor(current, target, step) {
  const s = Math.min(1, Math.max(0, step));
  return current.map((value, i) => value + (target[i] - value) * s);
}

// The color the outline is on its way to.
function outlineTarget(ok) {
  return parseColor(ok ? OUTLINE.ok : OUTLINE.bad);
}

// A picture of a rounded square, to lay on the ground: a thick white edge, and a faint white inside it. It
// is white, so that the material can make it any color.
function makeOutlineTexture(scene) {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("outline", { width: size, height: size }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.clearRect(0, 0, size, size);
  const edge = 14;
  const radius = 34;
  const path = (inset) => {
    const a = inset;
    const b = size - inset;
    context.beginPath();
    context.moveTo(a + radius, a);
    context.arcTo(b, a, b, b, radius);
    context.arcTo(b, b, a, b, radius);
    context.arcTo(a, b, a, a, radius);
    context.arcTo(a, a, b, a, radius);
    context.closePath();
  };
  path(edge / 2);
  context.fillStyle = "rgba(255,255,255,0.22)";
  context.fill();
  context.lineWidth = edge;
  context.strokeStyle = "rgba(255,255,255,0.95)";
  context.stroke();
  texture.update();
  return texture;
}

// A picture of a ring with a faint inside, for the range.
function makeRingTexture(scene) {
  const size = 256;
  const texture = new BABYLON.DynamicTexture("range", { width: size, height: size }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.clearRect(0, 0, size, size);
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  context.fillStyle = "rgba(255,255,255,0.14)";
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = "rgba(255,255,255,0.8)";
  context.stroke();
  texture.update();
  return texture;
}

// A flat square on the ground that shows a shape, in any color. The picture is only the shape (its see-through-ness: the
// opacity texture); the color is the material's emissive color, which is lit by nothing, so it can be changed in a moment.
function makeFlat(scene, name, texture, width, height) {
  const mesh = BABYLON.MeshBuilder.CreateGround(name, { width, height }, scene);
  const material = new BABYLON.StandardMaterial(name, scene);
  material.disableLighting = true;
  material.diffuseColor = BABYLON.Color3.Black();
  material.opacityTexture = texture;
  material.backFaceCulling = false;
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return mesh;
}

class Outline {
  constructor(scene, board = BOARD) {
    this.board = board;
    this.mesh = makeFlat(scene, "outline", makeOutlineTexture(scene), board.cell * OUTLINE.size, board.cell * OUTLINE.size);
    this.color = outlineTarget(false);
    this.target = this.color;
    this.apply();
  }

  get visible() {
    return this.mesh.isEnabled();
  }

  // Puts the outline round a cell, and says whether a tower can be built there: it fades to the color for that.
  show(col, row, ok) {
    const { x, z } = cellCenter(col, row, this.board);
    this.mesh.position.set(x, OUTLINE.height, z);
    this.target = outlineTarget(ok);
    this.mesh.setEnabled(true);
  }

  hide() {
    this.mesh.setEnabled(false);
  }

  // Fades towards the color it should be, for `dt` seconds.
  update(dt) {
    this.color = fadeColor(this.color, this.target, 1 - Math.exp(-OUTLINE.fade * dt));
    this.apply();
  }

  apply() {
    this.mesh.material.emissiveColor = new BABYLON.Color3(...this.color);
  }
}

// The ring of how far a tower can shoot: a flat disc that is twice the range across.
class RangeRing {
  constructor(scene) {
    this.mesh = makeFlat(scene, "range", makeRingTexture(scene), 2, 2);
  }

  get visible() {
    return this.mesh.isEnabled();
  }

  show(x, z, range, color) {
    this.mesh.position.set(x, OUTLINE.height / 2, z);
    this.mesh.scaling.set(range, 1, range);
    this.mesh.material.emissiveColor = BABYLON.Color3.FromHexString(color);
    this.mesh.setEnabled(true);
  }

  hide() {
    this.mesh.setEnabled(false);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { OUTLINE, parseColor, fadeColor, outlineTarget, Outline, RangeRing };
} else {
  Object.assign(window, { OUTLINE, parseColor, fadeColor, outlineTarget, Outline, RangeRing });
}
