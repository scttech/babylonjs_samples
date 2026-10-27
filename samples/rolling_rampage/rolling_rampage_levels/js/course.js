// The test course: a few slabs to roll on. Each is described by the line of its top
// surface, as seen from the side (x along the course, y up): where the top starts and where it
// ends. A flat floor is a line that doesn't go up or down, and a ramp is a line that does.
// `slabShape` turns that into the box Babylon.js and Havok want. The course is plain data, so
// it is easy to test and to change. See ../tests/course.tests.js.

const THICKNESS = 0.6; // how thick every slab is
const TILE = 2; // how many units the floor texture repeats over

const COURSE = [
  { name: "start deck", from: [-14, 4], to: [-6, 4], z: 0, depth: 8 },
  { name: "ramp", from: [-6, 4], to: [6, 0], z: 0, depth: 6 },
  { name: "lower deck", from: [6, 0], to: [14, 0], z: 0, depth: 8 },
  { name: "side ramp", from: [14, 0], to: [20, 2], z: 0, depth: 4 },
];

// The box for a slab: where its middle is, how long, thick and deep it is, and how far it is
// tilted (an angle in radians about the z axis, 0 for flat). The top of the box lies along the
// line the slab was described by, so the box is put half its thickness below that line, on the
// side away from the sky.
function slabShape(slab, thickness = THICKNESS) {
  const [x1, y1] = slab.from;
  const [x2, y2] = slab.to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const length = Math.hypot(dx, dy);
  const up = { x: -Math.sin(angle), y: Math.cos(angle) }; // the way the top faces: the line turned a quarter turn
  return {
    x: (x1 + x2) / 2 - (up.x * thickness) / 2,
    y: (y1 + y2) / 2 - (up.y * thickness) / 2,
    z: slab.z,
    length,
    thickness,
    depth: slab.depth,
    angle,
  };
}

// How steep a slab is, as a fraction: 0 for flat, 1 for a slope that rises as fast as it runs.
function steepness(slab) {
  const [x1, y1] = slab.from;
  const [x2, y2] = slab.to;
  return Math.abs((y2 - y1) / (x2 - x1));
}

// A checkered steel texture, in the blue-greys of the logo's gunmetal, drawn in code on a canvas, for the floors. A texture is only
// one square, and a floor is many squares wide, so it has to be told to repeat: a
// DynamicTexture, unlike a texture loaded from a file, stretches its edge pixels past the
// end of the square by default, which would leave a floor dark except for one corner.
function makeDeckTexture(scene, size = 128) {
  const texture = new BABYLON.DynamicTexture("deck", size, scene, true);
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  const context = texture.getContext();
  const half = size / 2;
  context.fillStyle = "#8a93a6";
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#657089";
  context.fillRect(0, 0, half, half);
  context.fillRect(half, half, half, half);
  context.strokeStyle = "#171b26";
  context.lineWidth = 4;
  context.strokeRect(1, 1, size - 2, size - 2);
  texture.update();
  return texture;
}

// Makes every slab of the course as a box, with a texture that repeats every TILE units
// instead of stretching over a big floor, and gives it to the physics as something that
// never moves (`mass: 0`). Returns the meshes.
function buildCourse(scene, course = COURSE) {
  const material = new BABYLON.StandardMaterial("deck", scene);
  material.diffuseTexture = makeDeckTexture(scene);
  material.specularColor = new BABYLON.Color3(0.2, 0.22, 0.28);

  return course.map((slab) => {
    const shape = slabShape(slab);
    const across = shape.length / TILE;
    const deep = shape.depth / TILE;
    const side = shape.thickness / TILE;
    const box = BABYLON.MeshBuilder.CreateBox(
      slab.name,
      {
        width: shape.length,
        height: shape.thickness,
        depth: shape.depth,
        // The faces are: back, front, right, left, top, bottom. Each gets as much texture as it is big.
        faceUV: [
          new BABYLON.Vector4(0, 0, across, side),
          new BABYLON.Vector4(0, 0, across, side),
          new BABYLON.Vector4(0, 0, deep, side),
          new BABYLON.Vector4(0, 0, deep, side),
          new BABYLON.Vector4(0, 0, deep, across),
          new BABYLON.Vector4(0, 0, deep, across),
        ],
      },
      scene
    );
    box.position.set(shape.x, shape.y, shape.z);
    box.rotation.z = shape.angle;
    box.material = material;
    box.receiveShadows = true;
    new BABYLON.PhysicsAggregate(box, BABYLON.PhysicsShapeType.BOX, { mass: 0, ...SURFACES.deck }, scene);
    return box;
  });
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { THICKNESS, TILE, COURSE, slabShape, steepness, makeDeckTexture, buildCourse };
} else {
  Object.assign(window, { THICKNESS, TILE, COURSE, slabShape, steepness, makeDeckTexture, buildCourse });
}
