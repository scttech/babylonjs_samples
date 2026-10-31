// Loading 3D pieces (.glb files) and placing copies of them in the world.
//
// A district is made of the same few pieces over and over: a tile of road, a junction, a handful of buildings. Loading a file for
// every copy would be slow and wasteful, so each piece is loaded ONCE, kept hidden as a template, and every copy placed in the
// world is an instance of that template: a new node that shares the template's geometry and materials.
//
// Pieces come out of their files with their origin wherever the artist put it (a building's is at the middle of its front). So the
// templates are moved to have the middle of their footprint over the origin (centerOnFootprint), and then a number in plan.js
// that says "this building is here" means the middle of the building. A piece keeps the height it was drawn at: the street's top
// is at y = 0 in its file, and stays there. As each file arrives, a LoadProgress is told, so the loading screen can show it. See
// ../tests/models.tests.js.

// How much of the waiting each file is: its size in kilobytes, as it is in assets/city. (A file that is not in the list counts as 100.)
const PIECE_KB = {
  Building_Large_1: 4329,
  Building_Large_2: 2271,
  Building_Large_3: 2601,
  Building_Medium_1: 1740,
  Building_Medium_2: 1606,
  Building_Small_1: 1371,
  Building_Small_2: 1544,
  Street_4Lane: 351,
  Street_4WayIntersection: 370,
};

// How sharp textures stay when they are seen at a slant (a wall seen along a street), which is also what stops them shimmering as the camera moves.
const ANISOTROPY = 8;

// How see-through the glass of the windows and doors is: 0 is not drawn at all. The kit puts a pane of tinted glass a hair in front of a picture of
// a lit room, and two surfaces that close together are drawn in an order that changes as the camera moves, so they flicker, however the
// glass is drawn. So the glass is left out, and the picture of the room (which is the window) is all there is. 1 draws it, to see the difference.
const GLASS_ALPHA = 0;

// Gets a material ready for the district. Every texture is filtered for slanting views, and glass is made as see-through as GLASS_ALPHA says.
function tidyMaterial(material) {
  if (!material) return;
  if (material.getActiveTextures) for (const texture of material.getActiveTextures()) texture.anisotropicFilteringLevel = ANISOTROPY;
  if (/glass/i.test(material.name || "")) {
    material.alpha = GLASS_ALPHA;
    material.forceDepthWrite = false;
  }
}

function pieceWeight(file) {
  return PIECE_KB[file] || 100;
}

// Given the corners of a piece's bounding box, returns how far to move it (along x and z) to put the middle of its footprint over
// the origin.
function centerOnFootprint(min, max) {
  return { x: -(min.x + max.x) / 2, z: -(min.z + max.z) / 2 };
}

class PieceLibrary {
  // `baseUrl` is the folder the .glb files are in, and `progress` is a LoadProgress to tell (it may be left out).
  constructor(scene, { baseUrl = "", progress = null } = {}) {
    this.scene = scene;
    this.baseUrl = baseUrl;
    this.progress = progress;
    this.templates = new Map(); // piece name -> the hidden original
  }

  // Loads every piece in `names` that isn't loaded yet, all at once. A piece is named by its file, without the .glb:
  // "Building_Small_1" is the file Building_Small_1.glb in the base folder.
  async load(names) {
    const wanted = [...new Set(names)].filter((name) => !this.templates.has(name));
    if (this.progress) for (const name of wanted) this.progress.add(name, pieceWeight(name));
    await Promise.all(wanted.map((name) => this._loadOne(name)));
  }

  async _loadOne(name) {
    const onProgress = (event) => {
      if (this.progress && event.lengthComputable && event.total > 0) this.progress.update(name, (event.loaded / event.total) * 0.95);
    };
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", this.baseUrl, `${name}.glb`, this.scene, onProgress);

    // The first mesh is the loader's root node; everything else hangs off it.
    const loaded = result.meshes[0];
    const bounds = loaded.getHierarchyBoundingVectors(true);
    const offset = centerOnFootprint(bounds.min, bounds.max);
    loaded.position.x += offset.x;
    loaded.position.z += offset.z;

    for (const mesh of loaded.getChildMeshes()) tidyMaterial(mesh.material);

    // The template is the node copies are made from. Disabled, it is never drawn.
    const template = new BABYLON.TransformNode(name, this.scene);
    loaded.parent = template;
    template.setEnabled(false);
    this.templates.set(name, template);
    if (this.progress) this.progress.complete(name);
  }

  // Puts a copy of a loaded piece in the world at (x, y, z), turned by rotationY radians about the vertical axis, and returns it.
  place(name, { x = 0, y = 0, z = 0, rotationY = 0 } = {}) {
    const template = this.templates.get(name);
    if (!template) throw new Error(`The piece "${name}" hasn't been loaded`);

    const copy = template.instantiateHierarchy(null);
    copy.position.x = x;
    copy.position.y = y;
    copy.position.z = z;
    copy.rotation.y = rotationY;
    return copy;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PIECE_KB, ANISOTROPY, GLASS_ALPHA, tidyMaterial, pieceWeight, centerOnFootprint, PieceLibrary };
} else {
  Object.assign(window, { PIECE_KB, ANISOTROPY, GLASS_ALPHA, tidyMaterial, pieceWeight, centerOnFootprint, PieceLibrary });
}
