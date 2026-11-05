// Where the bones are. A bone is not a thing that can be seen: it is a position and a direction, and to draw it (or to say which one a click meant)
// we need to know where each bone is *in the world*, with the model's own scale and turns counted. This file finds those places, joins them into
// the lines of a stick figure, and works out which joint is nearest to a point on the screen. See ../tests/joints.tests.js.

// The world position of every bone's joint, in the skeleton's order. A model loaded from a glTF file gives each bone a *transform node* (an
// invisible object in the scene that the bone follows), and the node knows its place in the world.
function jointPositions(skeleton) {
  return skeleton.bones.map((bone) => {
    const node = bone.getTransformNode();
    if (node) {
      node.computeWorldMatrix(true);
      return node.getAbsolutePosition().clone();
    }
    return bone.getAbsolutePosition().clone();
  });
}

// The lines of the stick figure: one from each bone to its parent, as [from, to] pairs of positions. A root has no parent, so it has no line.
function boneSegments(tree, positions) {
  return tree.nodes.filter((node) => node.parent !== null).map((node) => [positions[node.parent], positions[node.index]]);
}

// How big to draw a joint: a small part of the model's size, so that a mouse and a castle both get joints that can be seen but do not hide the model.
function jointRadius(modelSize) {
  return Math.max(modelSize * 0.012, 0.001);
}

// The place on the screen (in pixels) of each position, for a camera. This is the camera's own job turned into a function: it takes a point
// in the world through the view and the projection (the camera's two transforms) to the picture.
function screenPoints(positions, scene, camera) {
  const engine = scene.getEngine();
  const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
  return positions.map((position) => {
    const point = BABYLON.Vector3.Project(position, BABYLON.Matrix.Identity(), scene.getTransformMatrix(), viewport);
    return { x: point.x, y: point.y };
  });
}

// The joint nearest to a point on the screen, as an index, or -1 when none is within `maxDistance` pixels. `points` are screen points.
function nearestJoint(points, x, y, maxDistance) {
  let best = -1;
  let bestDistance = maxDistance;
  points.forEach((point, index) => {
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance <= bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { jointPositions, boneSegments, jointRadius, screenPoints, nearestJoint };
} else {
  Object.assign(window, { jointPositions, boneSegments, jointRadius, screenPoints, nearestJoint });
}
