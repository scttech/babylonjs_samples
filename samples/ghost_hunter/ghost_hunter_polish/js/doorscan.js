// Door scan (a prototype): finding doorways in the camera's picture, to use as places to peek from. A small segmentation model (SegFormer-B0,
// trained on the ADE20K scenes) labels every pixel of a picture as one of 150 things, among them a door; the doors are found in the labels as
// blobs, the bottom middle of each blob is where it meets the floor, and a ray from the eye through that pixel to the floor gives a point in
// the room to mark. The model is run by onnxruntime-web, from a page that has loaded `ort`. The parts that are arithmetic (blobs, the ray to
// the floor, the choice of which to keep) have no model in them, so they are tested with made-up labels. (It uses hitPlane from surface.js
// and lookAxes from look.js.) See ../tests/doorscan.tests.js and ../scan.html.

const SCAN = {
  modelUrl: "https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512/resolve/main/onnx/model_quantized.onnx",
  runtimeUrl: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/ort.min.js", // the library that runs the model
  size: 512, // the model is given a square picture this many pixels across
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
  // The labels (ADE20K numbers) that mean a way through: a door, a screen door, and the stairs, which are a way through too. A kind has the least part of
  // the picture it must fill to count (a speck of door is noise), and the least height it must be, as a part of the picture's height.
  kinds: {
    14: { name: "door", minArea: 0.004, minHeight: 0.1 },
    58: { name: "door", minArea: 0.004, minHeight: 0.1 },
    53: { name: "stairs", minArea: 0.006, minHeight: 0.08 },
    59: { name: "stairs", minArea: 0.006, minHeight: 0.08 },
  },
  grow: 1, // cells: the model's doors have holes (a glass panel is not a door to it), so a blob is the labels grown by this much
  floors: [3, 28, 52], // floor, rug and path: what a door stands on
  reach: 0.3, // how far below a door, as a part of the picture's height, to look for the floor it stands on
  maxCandidates: 4,
  minSeparation: 1.2, // metres: two candidates nearer than this are the same one
  range: [2.5, 9], // metres from the player that a spot may be (the table of the peeks says the same)
};

// The blobs of the wanted labels in a map of labels (`labels` is one number per pixel, `width` across), found by flood fill, as
// [{ kind, area, box: [left, top, right, bottom], bottom: [x, y], onFloor }], the numbers as parts of the picture, 0 to 1. `bottom` is the foot of the
// blob: where the floor begins below its middle (`onFloor` is true), or, when none is found there, the bottom middle of the blob. The blobs that
// are too small are not kept.
function blobsOf(labels, width, height, table = SCAN) {
  const wanted = new Uint8Array(labels.length); // 1 where a label is a way through, grown a little to close its holes
  for (let i = 0; i < labels.length; i++) {
    if (!table.kinds[labels[i]]) continue;
    const x = i % width, y = (i - x) / width;
    for (let dy = -table.grow; dy <= table.grow; dy++) {
      for (let dx = -table.grow; dx <= table.grow; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) wanted[ny * width + nx] = labels[i];
      }
    }
  }
  const seen = new Uint8Array(labels.length);
  const found = [];
  const stack = [];
  for (let start = 0; start < labels.length; start++) {
    if (!wanted[start] || seen[start]) continue;
    const kind = table.kinds[wanted[start]];
    let count = 0, left = width, right = 0, top = height, bottom = 0;
    seen[start] = 1;
    stack.push(start);
    while (stack.length) {
      const at = stack.pop();
      const x = at % width, y = (at - x) / width;
      count += 1;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      for (const next of [x > 0 ? at - 1 : -1, x < width - 1 ? at + 1 : -1, y > 0 ? at - width : -1, y < height - 1 ? at + width : -1]) {
        if (next >= 0 && !seen[next] && table.kinds[wanted[next]] && table.kinds[wanted[next]].name === kind.name) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    if (count / labels.length < kind.minArea || (bottom - top + 1) / height < kind.minHeight) continue;
    // the foot: from the bottom of the blob, down the middle third of it, to the first floor in each column; the middle of those
    const feet = [];
    const reach = Math.round(table.reach * height);
    const from = Math.floor(left + (right - left) / 3), to = Math.ceil(right - (right - left) / 3);
    for (let x = from; x <= to; x++) {
      for (let y = bottom; y < Math.min(height, bottom + reach); y++) {
        if (table.floors.includes(labels[y * width + x])) {
          feet.push(y);
          break;
        }
      }
    }
    const middle = (left + right + 1) / 2 / width;
    let foot = bottom + 1, onFloor = false;
    if (feet.length >= Math.max(1, (to - from + 1) / 3)) {
      feet.sort((p, q) => p - q);
      foot = feet[Math.floor(feet.length / 2)];
      onFloor = true;
    }
    found.push({ kind: kind.name, area: count / labels.length, box: [left / width, top / height, (right + 1) / width, (bottom + 1) / height], bottom: [middle, foot / height], onFloor });
  }
  return found.sort((p, q) => q.area - p.area);
}

// The part of a video picture that is on a screen when the picture fills the screen the way CSS `object-fit: cover` does (the picture is cut at
// the edges and not squeezed): { sx, sy, sw, sh } in the picture's pixels, for the screen's width over height.
function coverCrop(videoWidth, videoHeight, screenAspect) {
  const videoAspect = videoWidth / videoHeight;
  if (videoAspect > screenAspect) {
    const sw = videoHeight * screenAspect;
    return { sx: (videoWidth - sw) / 2, sy: 0, sw, sh: videoHeight };
  }
  const sh = videoWidth / screenAspect;
  return { sx: 0, sy: (videoHeight - sh) / 2, sw: videoWidth, sh };
}

// The floor point a pixel of the camera's picture shows: `u` and `v` are the place in the picture, 0 to 1 from the left and from the top, `view` is where the
// camera looks ({ position, forward, up }), `fovDegrees` is the field of view top to bottom, and `aspect` the width over the height. Nothing if it is
// not on the floor (at or above the horizon). Gives [x, y, z].
function floorPointOf(u, v, view, fovDegrees, aspect, floorY = 0) {
  const { right, up, forward } = lookAxes(view.forward, view.up);
  const tanV = Math.tan((fovDegrees * Math.PI) / 360);
  const x = (u * 2 - 1) * tanV * aspect;
  const y = (1 - v * 2) * tanV;
  const direction = [0, 1, 2].map((i) => forward[i] + right[i] * x + up[i] * y);
  const hit = hitPlane(view.position, direction, floorY);
  return hit ? hit.point : null;
}

// The places to peek from that a picture gives: the blobs, each as the floor point of its foot, with those out of range dropped, those that are
// the same place as a larger one dropped, and no more than the table allows. `view` and `aspect` are as for floorPointOf.
function candidatesFrom(blobs, view, fovDegrees, aspect, table = SCAN) {
  const kept = [];
  for (const blob of blobs) {
    const point = floorPointOf(blob.bottom[0], blob.bottom[1], view, fovDegrees, aspect);
    if (!point) continue;
    const distance = Math.hypot(point[0] - view.position[0], point[2] - view.position[2]);
    if (distance < table.range[0] || distance > table.range[1]) continue;
    if (kept.some((other) => Math.hypot(other.point[0] - point[0], other.point[2] - point[2]) < table.minSeparation)) continue;
    kept.push({ ...blob, point, distance });
    if (kept.length >= table.maxCandidates) break;
  }
  return kept;
}

// Whichever candidates are new: ones that are further than `separation` from every spot already known (so scanning twice does not mark the
// same door twice).
function newSpots(candidates, known, separation = SCAN.minSeparation) {
  return candidates.filter((c) => !known.some((k) => Math.hypot(k[0] - c.point[0], k[2] - c.point[2]) < separation));
}

// A picture as the model wants it: `rgba` is the pixels (`width` by `height`, as a canvas gives them), and the answer is the numbers of the
// model's input, in three planes (red, green, blue), each pixel a part of 1 with the mean taken off and divided by the spread. The picture is
// stretched to the model's square.
function modelInput(rgba, width, height, table = SCAN) {
  const size = table.size;
  const out = new Float32Array(3 * size * size);
  for (let y = 0; y < size; y++) {
    const sy = Math.min(height - 1, Math.floor(((y + 0.5) / size) * height));
    for (let x = 0; x < size; x++) {
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) / size) * width));
      const at = (sy * width + sx) * 4;
      for (let c = 0; c < 3; c++) out[c * size * size + y * size + x] = (rgba[at + c] / 255 - table.mean[c]) / table.std[c];
    }
  }
  return out;
}

// The label of every pixel from the model's answer: `logits` is a score for each of `classes` kinds over a `width` by `height` grid
// (plane after plane), and a pixel is the kind with the best score.
function labelsOf(logits, classes, width, height) {
  const labels = new Uint8Array(width * height);
  const plane = width * height;
  for (let i = 0; i < plane; i++) {
    let best = 0, score = -Infinity;
    for (let c = 0; c < classes; c++) {
      const value = logits[c * plane + i];
      if (value > score) {
        score = value;
        best = c;
      }
    }
    labels[i] = best;
  }
  return labels;
}

// The model and what it is run with. `ort` is onnxruntime-web (a page that loads it has it as a global), and `table` is SCAN. `load` fetches and
// prepares the model (about 4 MB, kept by the browser after the first time); `scan` takes a picture (the pixels of a canvas) and gives the blobs.
class DoorScanner {
  constructor(ort, table = SCAN) {
    this.ort = ort;
    this.table = table;
    this.session = null;
    this.lastMilliseconds = 0;
  }

  async load() {
    this.session = await this.ort.InferenceSession.create(this.table.modelUrl, { executionProviders: ["wasm"] });
    return this;
  }

  // `rgba`, `width` and `height` are a picture. Gives { blobs, labels, width, height } where the labels are a grid of the model's size over four.
  async scan(rgba, width, height) {
    const started = performance.now();
    const size = this.table.size;
    const input = new this.ort.Tensor("float32", modelInput(rgba, width, height, this.table), [1, 3, size, size]);
    const output = await this.session.run({ [this.session.inputNames[0]]: input });
    const result = output[this.session.outputNames[0]];
    const [, classes, h, w] = result.dims;
    const labels = labelsOf(result.data, classes, w, h);
    this.lastMilliseconds = performance.now() - started;
    return { blobs: blobsOf(labels, w, h, this.table), labels, width: w, height: h };
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SCAN, coverCrop, blobsOf, floorPointOf, candidatesFrom, newSpots, modelInput, labelsOf, DoorScanner };
} else {
  Object.assign(window, { SCAN, coverCrop, blobsOf, floorPointOf, candidatesFrom, newSpots, modelInput, labelsOf, DoorScanner });
}
