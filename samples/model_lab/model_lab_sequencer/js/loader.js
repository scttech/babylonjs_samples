// Getting a model into the scene. A model arrives as a file's worth of bytes, from the server (the samples) or from the person's own computer
// (a file they pick or drop on the page). Babylon.js loads it into an *asset container*: a box that holds everything the file had (meshes,
// materials, skeletons, clips) *without* putting any of it in the scene yet. That is the right first step for a lab, because the lab
// can look at what is in the box, and decide what to do with it. See ../tests/loader.tests.js.

// Whether some bytes are a GLB file. A GLB begins with the four letters "glTF"; checking that gives a clear message for the commonest
// mistake (a picture, or an FBX, picked by accident) instead of an error from deep inside the loader.
function looksLikeGlb(buffer) {
  if (!buffer || buffer.byteLength < 12) return false;
  return new TextDecoder().decode(new Uint8Array(buffer, 0, 4)) === "glTF";
}

// The bytes of a model: from an address (a string) or from a File the person chose.
async function readBytes(source) {
  if (typeof source === "string") {
    const response = await fetch(source);
    if (!response.ok) throw new Error(`The model could not be fetched (${response.status}).`);
    return response.arrayBuffer();
  }
  return source.arrayBuffer();
}

// The name to show for a model: the file's name without the folders or the ending.
function modelName(source) {
  const full = typeof source === "string" ? source : source.name;
  return full.split(/[\\/]/).pop().split("?")[0].replace(/\.[^.]*$/, "");
}

// Loads a model into a container. It gives back { container, info } where info is { name, bytes }. Nothing is in the scene until
// showModel is called. A file that is not a GLB is refused with a sentence that says what to do.
async function loadModelFile(scene, source) {
  const buffer = await readBytes(source);
  if (!looksLikeGlb(buffer)) throw new Error("That does not look like a GLB file. GLB (and glTF) models work here: FBX and OBJ files do not.");
  const url = URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" }));
  try {
    const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(url, undefined, scene, null, ".glb");
    return { container, info: { name: modelName(source), bytes: buffer.byteLength } };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Puts a loaded model in the scene, still. (A model that has clips starts playing the first one when it is added, which is not what a
// person who has only just opened a file wants to see.)
function showModel(container) {
  container.addAllToScene();
  container.animationGroups.forEach((group) => group.stop());
  return container;
}

// Takes a model out of the scene and throws it away, so that the next one has the stage to itself.
function removeModel(container) {
  container.removeAllFromScene();
  container.dispose();
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { looksLikeGlb, readBytes, modelName, loadModelFile, showModel, removeModel };
} else {
  Object.assign(window, { looksLikeGlb, readBytes, modelName, loadModelFile, showModel, removeModel });
}
