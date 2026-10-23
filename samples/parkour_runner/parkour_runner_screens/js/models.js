// Loading 3D pieces (.glb files) and placing copies of them in the world.
//
// A street is made of the same few pieces over and over: a road tile, a
// sidewalk tile, a dozen buildings. Loading a file for every copy would be slow
// and wasteful, so each piece is loaded ONCE, kept hidden as a template, and
// every copy placed in the world is an instance of that template: a new node
// that shares the template's geometry and materials.
//
// Pieces come out of their files centered wherever the artist felt like.
// centerOnGround() works out how to move a piece so it is centered on the
// ground at its own origin: then the numbers in world.js can say "this piece is
// here" and mean it. See ../tests/models.tests.js.

// Given the corners of a piece's bounding box and the scale it will be drawn at,
// returns the position that centers the piece on the origin (x and z) and rests
// it on the ground (y), already in scaled units.
function centerOnGround(min, max, scale) {
  return {
    x: -((min.x + max.x) / 2) * scale,
    y: -min.y * scale,
    z: -((min.z + max.z) / 2) * scale,
  };
}

class PieceLibrary {
  // `baseUrl` is the folder the .glb files are in, and `scale` how much bigger
  // every piece is drawn than it was modeled.
  constructor(scene, { baseUrl = "", scale = 1 } = {}) {
    this.scene = scene;
    this.baseUrl = baseUrl;
    this.scale = scale;
    this.templates = new Map(); // piece name -> the hidden original
  }

  // Loads every piece in `names` that isn't loaded yet, all at once. A piece is
  // named "kit/file", for example "commercial/building-a" is the file
  // commercial/building-a.glb in the base folder.
  async load(names) {
    const wanted = [...new Set(names)].filter((name) => !this.templates.has(name));
    await Promise.all(wanted.map((name) => this._loadOne(name)));
  }

  async _loadOne(name) {
    const slash = name.lastIndexOf("/") + 1;
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", `${this.baseUrl}${name.slice(0, slash)}`, `${name.slice(slash)}.glb`, this.scene);

    // The first mesh is the loader's root node; everything else hangs off it.
    const loaded = result.meshes[0];
    const bounds = loaded.getHierarchyBoundingVectors(true);
    const offset = centerOnGround(bounds.min, bounds.max, this.scale);

    loaded.scaling.scaleInPlace(this.scale); // scaleInPlace keeps the loader's mirroring of glTF
    loaded.position.x = offset.x;
    loaded.position.y = offset.y;
    loaded.position.z = offset.z;

    // The template is the node copies are made from. Disabled, it is never drawn.
    const template = new BABYLON.TransformNode(name, this.scene);
    loaded.parent = template;
    template.setEnabled(false);
    this.templates.set(name, template);
  }

  // Puts a copy of a loaded piece in the world, and returns it: at (x, y, z),
  // turned by rotationY radians about the vertical axis, and sized by scale (see
  // moveTo). A placement from the street or the obstacles can be passed straight in.
  place(name, placement = {}) {
    const template = this.templates.get(name);
    if (!template) throw new Error(`The piece "${name}" hasn't been loaded`);

    const copy = template.instantiateHierarchy(null);
    this.moveTo(copy, placement);
    return copy;
  }

  // Moves a piece that is already in the world to (x, y, z), turns it by rotationY,
  // and sizes it by `scale` ({ x, y, z }, each 1 for the size it was loaded at),
  // the same way place() does for a new one. Setting the size every time matters
  // for a pool, where a piece that was stretched for one job may be used for another.
  moveTo(piece, { x = 0, y = 0, z = 0, rotationY = 0, scale = { x: 1, y: 1, z: 1 } } = {}) {
    piece.position.x = x;
    piece.position.y = y;
    piece.position.z = z;
    piece.rotation.y = rotationY;
    piece.scaling.x = scale.x;
    piece.scaling.y = scale.y;
    piece.scaling.z = scale.z;
  }

}

// How quickly one animation clip fades into the next when the character
// changes what it is doing. Bigger is quicker; 1 would be an instant cut.
const CLIP_BLEND_SPEED = 0.15;

// Loads an animated character from a .glb file. Returns the character wrapped
// in a node you can move and turn, and its animation clips by name.
//
// A character file holds the model, its skeleton, and a clip for each movement
// (the loader calls each clip an animation group). The loader starts the first
// clip by itself, so every clip is stopped here: the game decides what plays.
// Blending is switched on for each, so changing clips fades smoothly from the
// pose the character is in instead of snapping.
async function loadCharacter(scene, url, { name = "character" } = {}) {
  const slash = url.lastIndexOf("/") + 1;
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", url.slice(0, slash), url.slice(slash), scene);

  const clips = new Map();
  for (const group of result.animationGroups) {
    group.stop();
    group.enableBlending = true;
    group.blendingSpeed = CLIP_BLEND_SPEED;
    clips.set(group.name, group);
  }

  // The first mesh is the loader's root node; everything else hangs off it.
  const root = new BABYLON.TransformNode(name, scene);
  result.meshes[0].parent = root;
  return { root, clips };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { centerOnGround, PieceLibrary, CLIP_BLEND_SPEED, loadCharacter };
} else {
  window.centerOnGround = centerOnGround;
  window.PieceLibrary = PieceLibrary;
  window.CLIP_BLEND_SPEED = CLIP_BLEND_SPEED;
  window.loadCharacter = loadCharacter;
}
