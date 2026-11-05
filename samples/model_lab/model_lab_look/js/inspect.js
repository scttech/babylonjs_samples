// Looking inside a model. A loaded model is a tangle of Babylon.js objects; this file asks them questions and writes down the answers as plain
// data (a list of meshes with their sizes, a list of materials with their pictures, the skeletons, the clips, the box that holds it all), so that
// what the screen shows, and what the tests check, is a description and not a pile of live objects. See ../tests/inspect.tests.js.

// How many triangles a mesh has. A triangle is three points, and a mesh stores a list of the points that make triangles ("indices"), so
// the number of triangles is a third of the length of the list.
function triangleCount(mesh) {
  return Math.floor(mesh.getTotalIndices() / 3);
}

// What a mesh is, as data: its name, how many points (vertices) and triangles, whether it is *skinned* (bound to a skeleton, so that it
// bends when the bones move) and what it is covered with. A mesh that is a copy of another has no points of its own.
function describeMesh(mesh) {
  return {
    name: mesh.name,
    vertices: mesh.getTotalVertices(),
    triangles: triangleCount(mesh),
    skinned: !!mesh.skeleton,
    material: mesh.material ? mesh.material.name : null,
    visible: mesh.isVisible,
  };
}

// The pictures that a material uses, as data: [{ name, width, height }]. (The material says which it has; the texture says its own size.)
function describeTextures(material) {
  return material.getActiveTextures().map((texture) => {
    const size = texture.getSize();
    return { name: texture.name, width: size.width, height: size.height };
  });
}

// What a material is: its name, what kind of material it is (a PBR material is the realistic, physically based kind that glTF files use), and
// its pictures.
function describeMaterial(material) {
  return { name: material.name, kind: material.getClassName(), textures: describeTextures(material) };
}

// A skeleton as data: its name and how many bones it has.
function describeSkeleton(skeleton) {
  return { name: skeleton.name, bones: skeleton.bones.length };
}

// A clip (an animation group) as data: its name and how long it is, in seconds. A clip counts its frames, and the frames have a
// rate, so seconds are frames divided by the rate.
function describeClip(group) {
  const rate = group.targetedAnimations.length > 0 ? group.targetedAnimations[0].animation.framePerSecond : 60;
  return { name: group.name, seconds: (group.to - group.from) / rate, tracks: group.targetedAnimations.length };
}

// The box that holds a model, in world units: { min, max, size }. A model has a hierarchy (a root, and things inside it, some scaled), so the
// box is worked out over the whole of it with every transform up to date.
function measureModel(rootNodes) {
  const min = new BABYLON.Vector3(Infinity, Infinity, Infinity);
  const max = new BABYLON.Vector3(-Infinity, -Infinity, -Infinity);
  for (const root of rootNodes) {
    root.computeWorldMatrix(true);
    root.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
    const box = root.getHierarchyBoundingVectors(true);
    min.minimizeInPlace(box.min);
    max.maximizeInPlace(box.max);
  }
  return { min, max, size: max.subtract(min) };
}

// Everything about a loaded model, as data. `container` is what the loader made (see loader.js), and `info` says where it came from: { name, bytes }.
function describeModel(container, info = {}) {
  const meshes = container.meshes.filter((mesh) => mesh.getTotalVertices() > 0).map(describeMesh);
  const materials = container.materials.map(describeMaterial);
  const bounds = measureModel(container.rootNodes);
  const textures = new Map();
  for (const material of materials) for (const texture of material.textures) textures.set(texture.name, texture);
  return {
    name: info.name || "a model",
    bytes: info.bytes ?? null,
    meshes,
    materials,
    textures: [...textures.values()],
    skeletons: container.skeletons.map(describeSkeleton),
    clips: container.animationGroups.map(describeClip),
    totals: {
      vertices: meshes.reduce((sum, mesh) => sum + mesh.vertices, 0),
      triangles: meshes.reduce((sum, mesh) => sum + mesh.triangles, 0),
    },
    size: { x: bounds.size.x, y: bounds.size.y, z: bounds.size.z },
    bounds,
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { triangleCount, describeMesh, describeTextures, describeMaterial, describeSkeleton, describeClip, measureModel, describeModel };
} else {
  Object.assign(window, { triangleCount, describeMesh, describeTextures, describeMaterial, describeSkeleton, describeClip, measureModel, describeModel });
}
