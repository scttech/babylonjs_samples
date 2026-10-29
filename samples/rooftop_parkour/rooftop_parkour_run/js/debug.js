// Drawing what the game knows but doesn't show: the boxes it uses for walls. In developer mode they can be drawn over the buildings, to
// see that they are where the buildings are. The size and place of the mesh for a box is plain arithmetic (boxMeshSpec), so it is tested;
// DebugBoxes makes them in a scene. See ../tests/debug.tests.js.

// The size and the middle of a box ({ minX, maxX, minY, maxY, minZ, maxZ }), as a Babylon.js box wants them.
function boxMeshSpec(box) {
  return {
    width: box.maxX - box.minX,
    height: box.maxY - box.minY,
    depth: box.maxZ - box.minZ,
    x: (box.minX + box.maxX) / 2,
    y: (box.minY + box.maxY) / 2,
    z: (box.minZ + box.maxZ) / 2,
  };
}

class DebugBoxes {
  constructor(scene, boxes, color = "#ff3b8d") {
    this.root = new BABYLON.TransformNode("debug-boxes", scene);
    const material = new BABYLON.StandardMaterial("debug-box", scene);
    material.wireframe = true;
    material.disableLighting = true;
    material.emissiveColor = BABYLON.Color3.FromHexString(color);
    material.fogEnabled = false;
    this.material = material;
    for (const box of boxes) {
      const spec = boxMeshSpec(box);
      const mesh = BABYLON.MeshBuilder.CreateBox(`debug-${box.name || "box"}`, { width: spec.width, height: spec.height, depth: spec.depth }, scene);
      mesh.position.set(spec.x, spec.y, spec.z);
      mesh.material = material;
      mesh.isPickable = false;
      mesh.parent = this.root;
    }
    this.root.setEnabled(false);
  }

  get visible() {
    return this.root.isEnabled();
  }

  setVisible(visible) {
    this.root.setEnabled(visible);
  }

  dispose() {
    this.root.dispose(false, true);
    this.material.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { boxMeshSpec, DebugBoxes };
} else {
  Object.assign(window, { boxMeshSpec, DebugBoxes });
}
