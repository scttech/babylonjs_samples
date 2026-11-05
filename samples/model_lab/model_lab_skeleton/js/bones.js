// The bones of a model, as a tree. A skeleton in Babylon.js is a flat list of bones, each of which knows its parent; this file turns that list
// into data that is easy to ask questions of: who is whose parent, who are a bone's children, how far down the tree a bone is, and which part of the
// body it belongs to. Nothing here touches the scene, so it can be tested down to its corners. See ../tests/bones.tests.js.

// A bone's name without the program's prefix. Mixamo writes every bone as "mixamorig:Hips", "mixamorig:Spine"... and people read "Hips".
function shortName(name) {
  const colon = name.indexOf(":");
  return colon < 0 ? name : name.slice(colon + 1);
}

// The tree of a skeleton: { nodes, roots }. `nodes` has one entry for each bone, in the skeleton's own order, and each says its index,
// its name (whole and short), the index of its parent (null for a root), the indices of its children, and its depth (a root is 0, its children 1...).
function boneTree(skeleton) {
  const indexOf = new Map(skeleton.bones.map((bone, index) => [bone, index]));
  const nodes = skeleton.bones.map((bone, index) => ({
    index,
    name: bone.name,
    short: shortName(bone.name),
    parent: bone.getParent() ? indexOf.get(bone.getParent()) ?? null : null,
    children: [],
    depth: 0,
  }));
  for (const node of nodes) {
    if (node.parent !== null) nodes[node.parent].children.push(node.index);
  }
  for (const node of nodes) {
    let up = node.parent;
    while (up !== null) {
      node.depth++;
      up = nodes[up].parent;
    }
  }
  return { nodes, roots: nodes.filter((node) => node.parent === null).map((node) => node.index) };
}

// The bones in the order of a walk down the tree: a bone, then everything below its first child, then its second child, and so on.
// This is the order to list them in, so that each bone is under its parent.
function walkOrder(tree) {
  const order = [];
  const visit = (index) => {
    order.push(index);
    tree.nodes[index].children.forEach(visit);
  };
  tree.roots.forEach(visit);
  return order;
}

// The short names from the root down to a bone: ["Hips", "Spine", ...].
function bonePath(tree, index) {
  const path = [];
  for (let at = index; at !== null; at = tree.nodes[at].parent) path.unshift(tree.nodes[at].short);
  return path;
}

// Every bone below a bone (its children, theirs...), as indices. These are the bones that move when the bone moves.
function descendants(tree, index) {
  return walkOrder({ nodes: tree.nodes, roots: [index] }).slice(1);
}

// The index of the bone with a name, whole ("mixamorig:Head") or short ("Head"), or -1.
function findBone(tree, name) {
  return tree.nodes.findIndex((node) => node.name === name || node.short === name);
}

// The parts of the body, as a table: the panel colours and groups by it, and later tutorials will say "the head slot" by it. Each region has a
// pattern that a bone's short name is matched against. A bone that fits none (a bone that someone added) is in "other".
const BODY_REGIONS = [
  { id: "head", label: "Head", match: /^(Neck|Head|HeadTop_End)$/ },
  { id: "torso", label: "Torso", match: /^(Hips|Spine\d*)$/ },
  { id: "leftArm", label: "Left arm", match: /^Left(Shoulder|Arm|ForeArm|Hand)/ },
  { id: "rightArm", label: "Right arm", match: /^Right(Shoulder|Arm|ForeArm|Hand)/ },
  { id: "leftLeg", label: "Left leg", match: /^Left(UpLeg|Leg|Foot|ToeBase)/ },
  { id: "rightLeg", label: "Right leg", match: /^Right(UpLeg|Leg|Foot|ToeBase)/ },
];

// The id of the region that a bone is in, from its name (whole or short).
function regionOf(name) {
  const short = shortName(name);
  const region = BODY_REGIONS.find((candidate) => candidate.match.test(short));
  return region ? region.id : "other";
}

// The label for a region id.
function regionLabel(id) {
  const region = BODY_REGIONS.find((candidate) => candidate.id === id);
  return region ? region.label : "Other";
}

// Which naming style a skeleton uses. Mixamo skeletons put "mixamorig:" in front of every bone. Two models can only share animations if
// their bones have the same names, so knowing the style is the first thing to look at.
function namingStyle(tree) {
  if (tree.nodes.length === 0) return "unknown";
  const prefixed = tree.nodes.filter((node) => node.name.startsWith("mixamorig:")).length;
  return prefixed / tree.nodes.length >= 0.8 ? "mixamo" : "unknown";
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { shortName, boneTree, walkOrder, bonePath, descendants, findBone, BODY_REGIONS, regionOf, regionLabel, namingStyle };
} else {
  Object.assign(window, { shortName, boneTree, walkOrder, bonePath, descendants, findBone, BODY_REGIONS, regionOf, regionLabel, namingStyle });
}
