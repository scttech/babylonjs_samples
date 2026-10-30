// Drawing what the game knows but doesn't show: the boxes it uses for walls, the names of the buildings, and the ledges. In developer mode they can
// be drawn over the buildings, to see that they are where the buildings are, and which building is which. The size and place of the mesh
// for a box is plain arithmetic (boxMeshSpec), so it is tested; DebugBoxes and DebugLabels make them in a scene. See ../tests/debug.tests.js.

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

// What a label for a box says, and where it hangs: above the middle of the box, so that it can be seen from the street.
function labelSpec(box, lift = 4) {
  const spec = boxMeshSpec(box);
  return { text: box.name || "", x: spec.x, y: box.maxY + lift, z: spec.z };
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

// The lines of a list of ledges (see ledges.js), as pairs of points a little above each: where a runner's hands go, to see where they are.
function ledgeLines(ledges, lift = 0.05) {
  return ledges.map((ledge) => [
    { x: ledge.ax, y: ledge.y + lift, z: ledge.az },
    { x: ledge.bx, y: ledge.y + lift, z: ledge.bz },
  ]);
}

// A name over each box, that always faces the camera: for knowing which building is which.
class DebugLabels {
  constructor(scene, boxes) {
    this.root = new BABYLON.TransformNode("debug-labels", scene);
    for (const box of boxes) {
      const spec = labelSpec(box);
      const texture = new BABYLON.DynamicTexture(`debug-label-${spec.text}`, { width: 512, height: 96 }, scene, false);
      texture.hasAlpha = true;
      texture.drawText(spec.text, null, 66, "bold 56px monospace", "#ffffff", "rgba(0, 0, 0, 0.75)", true);
      const material = new BABYLON.StandardMaterial(`debug-label-${spec.text}`, scene);
      material.diffuseTexture = texture;
      material.opacityTexture = texture;
      material.emissiveColor = BABYLON.Color3.White();
      material.disableLighting = true;
      material.fogEnabled = false;
      material.disableDepthWrite = true;
      const mesh = BABYLON.MeshBuilder.CreatePlane(`debug-label-${spec.text}`, { width: 9, height: 1.7 }, scene);
      mesh.position.set(spec.x, spec.y, spec.z);
      mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
      mesh.material = material;
      mesh.isPickable = false;
      mesh.renderingGroupId = 1;
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
    for (const mesh of this.root.getChildMeshes()) {
      mesh.material.diffuseTexture.dispose();
      mesh.material.dispose();
    }
    this.root.dispose(false, true);
  }
}

// A line along each ledge, in one colour, drawn over what is in front of it, to see where the ledges are.
class DebugLedges {
  constructor(scene, ledges, color = "#7dff6b") {
    const lines = ledgeLines(ledges).map(([a, b]) => [new BABYLON.Vector3(a.x, a.y, a.z), new BABYLON.Vector3(b.x, b.y, b.z)]);
    this.mesh = BABYLON.MeshBuilder.CreateLineSystem("debug-ledges", { lines }, scene);
    this.mesh.color = BABYLON.Color3.FromHexString(color);
    this.mesh.isPickable = false;
    this.mesh.renderingGroupId = 1;
    this.mesh.setEnabled(false);
  }

  get visible() {
    return this.mesh.isEnabled();
  }

  setVisible(visible) {
    this.mesh.setEnabled(visible);
  }

  dispose() {
    this.mesh.dispose();
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { boxMeshSpec, labelSpec, ledgeLines, DebugBoxes, DebugLabels, DebugLedges };
} else {
  Object.assign(window, { boxMeshSpec, labelSpec, ledgeLines, DebugBoxes, DebugLabels, DebugLedges });
}
