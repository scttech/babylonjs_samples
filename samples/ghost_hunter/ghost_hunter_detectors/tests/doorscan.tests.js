// Made-up label maps: 0 is wall, 3 is floor, 14 is a door.
const labelMap = (width, height, paint) => {
  const labels = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) labels[y * width + x] = paint(x, y);
  return labels;
};
const NO_GROW = { ...SCAN, grow: 0 };

QUnit.module("finding doors in labels", () => {
  // a 40 by 40 picture: a door 6 wide and 16 tall at x 10-15, y 8-23, with the floor from row 24 down
  const picture = labelMap(40, 40, (x, y) => (y >= 24 ? 3 : x >= 10 && x <= 15 && y >= 8 ? 14 : 0));

  QUnit.test("a door is a blob, and its foot is where the floor begins below it", (assert) => {
    const blobs = blobsOf(picture, 40, 40, NO_GROW);
    assert.strictEqual(blobs.length, 1);
    assert.strictEqual(blobs[0].kind, "door");
    assert.true(blobs[0].onFloor);
    assert.true(Math.abs(blobs[0].bottom[0] - 13 / 40) < 0.02, "the middle of it");
    assert.strictEqual(blobs[0].bottom[1], 24 / 40, "where the floor begins");
  });

  QUnit.test("a door whose lower part is not labelled still has its foot on the floor", (assert) => {
    const cut = labelMap(40, 40, (x, y) => (y >= 24 ? 3 : x >= 10 && x <= 15 && y >= 8 && y <= 16 ? 14 : 0)); // only the top half is labelled
    const blobs = blobsOf(cut, 40, 40, NO_GROW);
    assert.strictEqual(blobs[0].bottom[1], 24 / 40);
  });

  QUnit.test("with no floor under it, the foot is the bottom of the blob", (assert) => {
    const nofloor = labelMap(40, 40, (x, y) => (x >= 10 && x <= 15 && y >= 8 && y <= 23 ? 14 : 0));
    const blobs = blobsOf(nofloor, 40, 40, NO_GROW);
    assert.false(blobs[0].onFloor);
    assert.strictEqual(blobs[0].bottom[1], 24 / 40);
  });

  QUnit.test("specks, and things that are too short, are left out", (assert) => {
    const speck = labelMap(40, 40, (x, y) => (x === 5 && y === 5 ? 14 : 0));
    assert.strictEqual(blobsOf(speck, 40, 40, NO_GROW).length, 0);
    const wide = labelMap(40, 40, (x, y) => (x >= 2 && x <= 30 && y >= 10 && y <= 11 ? 14 : 0)); // big enough, but flat
    assert.strictEqual(blobsOf(wide, 40, 40, NO_GROW).length, 0);
  });

  QUnit.test("growing closes the holes in a door, so it is one blob and not two", (assert) => {
    const holed = labelMap(40, 40, (x, y) => (y >= 24 ? 3 : x >= 10 && x <= 15 && y >= 8 && y !== 15 && y !== 16 ? 14 : 0)); // a gap two rows high
    assert.strictEqual(blobsOf(holed, 40, 40, NO_GROW).length, 2, "without growing, a door with a gap is two");
    const grown = blobsOf(holed, 40, 40, SCAN);
    assert.strictEqual(grown.length, 1);
    assert.true(grown[0].box[3] - grown[0].box[1] > 0.4, "and with the growing it is the whole door");
  });

  QUnit.test("two doors are two blobs, the larger first; stairs are found too", (assert) => {
    const two = labelMap(60, 40, (x, y) => (y >= 30 ? 3 : x >= 5 && x <= 12 && y >= 6 ? 14 : x >= 30 && x <= 36 && y >= 14 ? 14 : x >= 45 && x <= 55 && y >= 22 ? 53 : 0));
    const blobs = blobsOf(two, 60, 40, NO_GROW);
    assert.deepEqual(blobs.map((b) => b.kind), ["door", "door", "stairs"]);
    assert.true(blobs[0].area > blobs[1].area);
  });
});

QUnit.module("from a pixel to the floor", () => {
  const view = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };

  QUnit.test("the middle of the picture, looking level, is the horizon: no floor", (assert) => {
    assert.strictEqual(floorPointOf(0.5, 0.5, view, 60, 0.5), null);
  });

  QUnit.test("a pixel below the middle is on the floor ahead, further for a pixel nearer the horizon", (assert) => {
    const near = floorPointOf(0.5, 0.95, view, 60, 0.5);
    const far = floorPointOf(0.5, 0.7, view, 60, 0.5);
    assert.ok(near && far);
    assert.true(Math.abs(near[0]) < 1e-9, "straight ahead");
    assert.true(far[2] > near[2] && near[2] > 0, `${near[2].toFixed(2)} and ${far[2].toFixed(2)} metres`);
    // 1.4 m up, 30 degrees below the horizon at the bottom edge of a 60 degree view: 1.4 / tan 30 = 2.42 m
    assert.true(Math.abs(floorPointOf(0.5, 1, view, 60, 0.5)[2] - 1.4 / Math.tan(Math.PI / 6)) < 1e-6);
  });

  QUnit.test("right of the picture is right of the player", (assert) => {
    const right = floorPointOf(0.9, 0.9, view, 60, 0.5);
    const left = floorPointOf(0.1, 0.9, view, 60, 0.5);
    assert.true(right[0] > 0 && left[0] < 0);
    assert.true(Math.abs(right[0] + left[0]) < 1e-9);
  });

  QUnit.test("the way the player faces is taken into account", (assert) => {
    const turned = { position: [0, 1.4, 0], forward: [1, 0, 0], up: [0, 1, 0] };
    const point = floorPointOf(0.5, 0.95, turned, 60, 0.5);
    assert.true(point[0] > 0 && Math.abs(point[2]) < 1e-9);
  });
});

QUnit.module("choosing the places", () => {
  const view = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const blob = (x, y, area = 0.02) => ({ kind: "door", area, box: [x - 0.05, y - 0.3, x + 0.05, y], bottom: [x, y], onFloor: true });

  QUnit.test("each blob becomes a floor point, in range, and the nearer ones that are too near or too far are dropped", (assert) => {
    const candidates = candidatesFrom([blob(0.5, 0.75), blob(0.3, 0.52), blob(0.7, 0.99)], view, 60, 0.5);
    assert.strictEqual(candidates.length, 1, "one is beyond the range and one is too near");
    assert.true(candidates[0].distance >= SCAN.range[0] && candidates[0].distance <= SCAN.range[1]);
  });

  QUnit.test("two blobs at one place are one place", (assert) => {
    const candidates = candidatesFrom([blob(0.5, 0.75, 0.03), blob(0.505, 0.75, 0.02)], view, 60, 0.5);
    assert.strictEqual(candidates.length, 1);
    assert.strictEqual(candidates[0].area, 0.03, "the larger is kept");
  });

  QUnit.test("no more than the table allows", (assert) => {
    const many = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95].map((x) => blob(x, 0.75));
    assert.true(candidatesFrom(many, view, 60, 0.5, { ...SCAN, maxCandidates: 3 }).length <= 3);
  });

  QUnit.test("a spot that is already known is not new", (assert) => {
    const candidates = candidatesFrom([blob(0.5, 0.75)], view, 60, 0.5);
    assert.strictEqual(newSpots(candidates, []).length, 1);
    assert.strictEqual(newSpots(candidates, [[candidates[0].point[0] + 0.3, 0, candidates[0].point[2]]]).length, 0);
  });
});

QUnit.module("what the model is given and what it says", () => {
  QUnit.test("the input is three planes of the picture, taken to the model's mean and spread, at the model's size", (assert) => {
    const small = { ...SCAN, size: 4 };
    const rgba = new Uint8ClampedArray(2 * 2 * 4);
    for (let i = 0; i < 4; i++) rgba.set([255, 0, 128, 255], i * 4);
    const input = modelInput(rgba, 2, 2, small);
    assert.strictEqual(input.length, 3 * 16);
    assert.true(Math.abs(input[0] - (1 - SCAN.mean[0]) / SCAN.std[0]) < 1e-5, "red plane");
    assert.true(Math.abs(input[16] - (0 - SCAN.mean[1]) / SCAN.std[1]) < 1e-5, "green plane");
    assert.true(Math.abs(input[32] - (128 / 255 - SCAN.mean[2]) / SCAN.std[2]) < 1e-5, "blue plane");
  });

  QUnit.test("every pixel is the kind with the best score", (assert) => {
    const logits = new Float32Array([0, 5, 1, 2, /* kind 0 */ 3, 0, 0, 2, /* kind 1 */ 1, 1, 9, 0 /* kind 2 */]);
    assert.deepEqual([...labelsOf(logits, 3, 2, 2)], [1, 0, 2, 0]);
  });
});

QUnit.module("what of the camera's picture is on the screen", () => {
  QUnit.test("a wide picture on a tall screen is cut at the sides, in the middle", (assert) => {
    const crop = coverCrop(1280, 720, 0.5);
    assert.strictEqual(crop.sh, 720);
    assert.strictEqual(crop.sw, 360);
    assert.strictEqual(crop.sx, 460);
    assert.strictEqual(crop.sy, 0);
  });

  QUnit.test("a tall picture on a wide screen is cut at the top and bottom", (assert) => {
    const crop = coverCrop(720, 1280, 2);
    assert.strictEqual(crop.sw, 720);
    assert.strictEqual(crop.sh, 360);
    assert.strictEqual(crop.sy, 460);
  });

  QUnit.test("a picture of the same shape as the screen is all of it", (assert) => {
    assert.deepEqual(coverCrop(800, 400, 2), { sx: 0, sy: 0, sw: 800, sh: 400 });
  });
});
