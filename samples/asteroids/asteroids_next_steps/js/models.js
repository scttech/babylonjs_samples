// Loading 3D models (.glb files) and making them fit the game.
//
// A model comes in at whatever size and position its artist happened to use: a
// rocket 0.26 units tall with its origin at the bottom, a saucer 12 units wide.
// The game wants every model centered on the origin and a known size, so it can
// treat them like the meshes it used to build in code. fitToSize() works out how
// to get there (plain numbers, so it is easy to test), and loadModel() loads a
// file and applies it. See ../tests/models.tests.js.

// Given the corners of a model's bounding box, returns how to scale it so its
// largest dimension is `size`, and where to move it so its center lands on the
// origin. `offset` is already in scaled units, ready to use as a position.
function fitToSize(min, max, size) {
  const largest = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
  const scale = largest > 0 ? size / largest : 1;
  return {
    scale,
    offset: {
      x: -((min.x + max.x) / 2) * scale,
      y: -((min.y + max.y) / 2) * scale,
      z: -((min.z + max.z) / 2) * scale,
    },
  };
}

// Loads the .glb at `url` into `scene` and returns a TransformNode wrapping it,
// centered on the origin with its largest dimension equal to `size`. Move,
// rotate, and scale the returned node freely: scaling it by 2 makes the model
// twice `size`. `rotation` ({ x, y, z } in radians) turns the model once, up front,
// to correct for whichever way its artist built it facing.
//
// glTF materials are written for scenes lit by an environment map. With only
// ordinary lights, a fully metallic surface has nothing to reflect and comes out
// nearly black, so metallic values are capped at `maxMetallic`.
async function loadModel(scene, url, { size = 1, name = "model", maxMetallic = 0.3, rotation = null } = {}) {
  const slash = url.lastIndexOf("/") + 1;
  const result = await BABYLON.SceneLoader.ImportMeshAsync("", url.slice(0, slash), url.slice(slash), scene);

  // The first mesh is the loader's root node; everything else hangs off it.
  const loaded = result.meshes[0];

  for (const material of new Set(result.meshes.map((mesh) => mesh.material))) {
    if (material && typeof material.metallic === "number") {
      material.metallic = Math.min(material.metallic, maxMetallic);
    }
  }

  const bounds = loaded.getHierarchyBoundingVectors(true);
  const fit = fitToSize(bounds.min, bounds.max, size);

  loaded.scaling.scaleInPlace(fit.scale);
  loaded.position.x = fit.offset.x;
  loaded.position.y = fit.offset.y;
  loaded.position.z = fit.offset.z;

  const wrapper = new BABYLON.TransformNode(name, scene);
  loaded.parent = wrapper;
  if (rotation) {
    wrapper.rotation.x = rotation.x;
    wrapper.rotation.y = rotation.y;
    wrapper.rotation.z = rotation.z;
  }
  return wrapper;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { fitToSize, loadModel };
} else {
  window.fitToSize = fitToSize;
  window.loadModel = loadModel;
}
