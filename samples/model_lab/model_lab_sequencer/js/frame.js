// Pointing the camera at a model. Models come in every size (a mouse, a person, a castle) and the camera has to be put at the right distance
// for each, or the model is a dot or a wall of colour. The rule: find the sphere that holds the model's box, and stand back far enough
// that the sphere fits in the picture, whichever way (tall or wide) the picture is the narrower. See ../tests/frame.tests.js.

// Where to put an orbit camera so that a box fits in view. `bounds` is { min, max } (Vector3s), `fov` is the camera's field of view
// from top to bottom, in radians, and `aspect` is the picture's width divided by its height.
// It gives back what the camera needs: the point to look at, how far to stand, and how near and far it can see.
function framingFor(bounds, fov, aspect) {
  const center = bounds.min.add(bounds.max).scale(0.5);
  const radius = Math.max(bounds.max.subtract(bounds.min).length() / 2, 0.001);
  // The field of view across the picture is narrower than the one down it when the picture is taller than wide.
  const sideways = 2 * Math.atan(Math.tan(fov / 2) * Math.min(aspect, 1));
  const narrow = Math.min(fov, sideways);
  const distance = (radius / Math.sin(narrow / 2)) * 1.1;
  return { target: center, radius: distance, near: distance / 100, far: distance * 100, size: radius * 2 };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { framingFor };
} else {
  Object.assign(window, { framingFor });
}
