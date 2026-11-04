// The marks of an enemy: a small picture over its head for every effect that is on it (the sign of the nation that does it: waves for a slow, a flame for a
// burn, a diamond for a stun, a swirl of wind for a push), in the color of the effect, so that a player can see what a tower did.
// Each is a flat square that always faces the camera. The pictures are made once for the whole scene, and shared by every
// enemy; an enemy only has a square for each, shown or hidden. See ../tests/marks.tests.js.

const MARKS = {
  size: 0.5, // how big a mark is, in world units
  gap: 0.06, // the space between two
  above: 0.3, // how far over the top of the head the middle of a mark is
  texture: 128, // how many pixels across a picture is
};

// Draws the shape of an effect on a canvas, in white, in a square of `size` pixels: it is the see-through-ness of a mark, and its
// color is the material's.
function drawMark(context, kind, size) {
  const c = size / 2;
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = size * 0.09;
  context.beginPath();
  if (kind === "slow") {
    // Water: three wavy lines, one under another.
    for (let row = 0; row < 3; row++) {
      const y = size * (0.26 + row * 0.24);
      for (let i = 0; i <= 30; i++) {
        const x = size * (0.1 + 0.8 * (i / 30));
        const wave = y + Math.sin((i / 30) * Math.PI * 4 + row) * size * 0.07;
        if (i === 0) context.moveTo(x, wave);
        else context.lineTo(x, wave);
      }
    }
    context.stroke();
  } else if (kind === "burn") {
    // Fire: a flame with a tail that curls over at the top, and a smaller flame cut out of the middle.
    const flame = (scale, lift) => {
      const x = (v) => c + (v - 0.5) * size * scale;
      const y = (v) => size * (0.5 + (v - 0.5) * scale + lift);
      context.beginPath();
      context.moveTo(x(0.5), y(0.95));
      context.bezierCurveTo(x(0.18), y(0.95), x(0.12), y(0.62), x(0.3), y(0.42));
      context.bezierCurveTo(x(0.3), y(0.56), x(0.4), y(0.6), x(0.44), y(0.56));
      context.bezierCurveTo(x(0.4), y(0.34), x(0.5), y(0.18), x(0.72), y(0.06));
      context.bezierCurveTo(x(0.66), y(0.2), x(0.78), y(0.26), x(0.8), y(0.4));
      context.bezierCurveTo(x(0.92), y(0.62), x(0.82), y(0.95), x(0.5), y(0.95));
      context.closePath();
    };
    flame(1, 0);
    context.fill();
    context.globalCompositeOperation = "destination-out";
    flame(0.45, 0.2);
    context.fill();
    context.globalCompositeOperation = "source-over";
  } else if (kind === "stun") {
    // Earth: a diamond (a square stood on its corner), with a smaller diamond cut out of it and a solid one in the middle.
    const diamond = (radius) => {
      context.beginPath();
      context.moveTo(c, c - radius);
      context.lineTo(c + radius, c);
      context.lineTo(c, c + radius);
      context.lineTo(c - radius, c);
      context.closePath();
    };
    diamond(size * 0.46);
    context.fill();
    context.globalCompositeOperation = "destination-out";
    diamond(size * 0.3);
    context.fill();
    context.globalCompositeOperation = "source-over";
    diamond(size * 0.14);
    context.fill();
  } else {
    // A swirl of wind: a spiral that winds in from the outside, and flicks out at the end like a gust.
    const turns = 2.5;
    for (let i = 0; i <= 60; i++) {
      const angle = (i / 60) * turns * 2 * Math.PI;
      const radius = size * (0.06 + 0.3 * (1 - i / 60));
      const x = c + Math.cos(angle) * radius * 1.1 - size * 0.04;
      const y = c + Math.sin(angle) * radius * 1.1;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    // The tail: from where the spiral starts on the outside, out to the side.
    context.beginPath();
    const startX = c + Math.cos(0) * size * 0.36 * 1.1 - size * 0.04;
    context.moveTo(startX, c);
    context.bezierCurveTo(startX + size * 0.08, c + size * 0.12, startX + size * 0.12, c + size * 0.26, startX - size * 0.04, c + size * 0.34);
    context.stroke();
  }
}

// Where each of `count` marks goes along a row, as a distance to the right of the middle of the row: the row is centered.
function marksLayout(count, size = MARKS.size, gap = MARKS.gap) {
  const step = size + gap;
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * step);
}

// The materials of the marks, one for each effect, made the first time a scene needs them and kept for every enemy in it.
const kits = new WeakMap();
function marksKit(scene) {
  if (kits.has(scene)) return kits.get(scene);
  const kit = {};
  for (const [kind, effect] of Object.entries(EFFECTS)) {
    const texture = new BABYLON.DynamicTexture(`mark ${kind}`, { width: MARKS.texture, height: MARKS.texture }, scene, true);
    texture.hasAlpha = true;
    drawMark(texture.getContext(), kind, MARKS.texture);
    texture.update();
    const material = new BABYLON.StandardMaterial(`mark ${kind}`, scene);
    material.disableLighting = true;
    material.diffuseColor = BABYLON.Color3.Black();
    material.emissiveColor = BABYLON.Color3.FromHexString(effect.color);
    material.opacityTexture = texture;
    material.backFaceCulling = false;
    kit[kind] = material;
  }
  kits.set(scene, kit);
  return kit;
}

class StatusMarks {
  // `parent` is the node of the enemy, and `height` how tall the enemy is.
  constructor(scene, parent, height, name = "marks") {
    const kit = marksKit(scene);
    this.node = new BABYLON.TransformNode(`${name} marks`, scene);
    this.node.parent = parent;
    this.node.position.y = height + MARKS.above;
    this.squares = {};
    for (const kind of Object.keys(EFFECTS)) {
      const square = BABYLON.MeshBuilder.CreatePlane(`${name} mark ${kind}`, { size: MARKS.size }, scene);
      square.parent = this.node;
      square.material = kit[kind];
      square.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      square.isPickable = false;
      square.setEnabled(false);
      this.squares[kind] = square;
    }
  }

  // Shows a square for each of the effects in the list, in a row, and hides the rest.
  show(kinds) {
    const places = marksLayout(kinds.length);
    for (const [kind, square] of Object.entries(this.squares)) {
      const at = kinds.indexOf(kind);
      square.setEnabled(at >= 0);
      if (at >= 0) square.position.x = places[at];
    }
  }

  get shown() {
    return Object.keys(this.squares).filter((kind) => this.squares[kind].isEnabled());
  }

  // The squares go with the enemy's node; the materials are shared, and stay.
  dispose() {
    this.node.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MARKS, drawMark, marksLayout, marksKit, StatusMarks };
} else {
  Object.assign(window, { MARKS, drawMark, marksLayout, marksKit, StatusMarks });
}
