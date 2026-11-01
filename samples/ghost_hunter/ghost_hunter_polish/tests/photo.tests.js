const photoCanvas = (width, height, color) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = color;
  context.fillRect(0, 0, width, height);
  return canvas;
};

QUnit.module("the shape of a photograph", () => {
  QUnit.test("a wide picture on a tall space is cut at the sides, in the middle, and a tall one on a wide space at the top and bottom", (assert) => {
    assert.deepEqual(coverRect(1280, 720, 360, 720), { sx: 460, sy: 0, sw: 360, sh: 720 });
    assert.deepEqual(coverRect(720, 1280, 720, 360), { sx: 0, sy: 460, sw: 720, sh: 360 });
    assert.deepEqual(coverRect(800, 400, 400, 200), { sx: 0, sy: 0, sw: 800, sh: 400 });
  });

  QUnit.test("a photograph is the shape of the screen, and no bigger than the table says on its longer side", (assert) => {
    assert.deepEqual(photoSize(1170, 2532), { width: Math.round(1170 * (PHOTO.maxSide / 2532)), height: PHOTO.maxSide });
    assert.deepEqual(photoSize(400, 300), { width: 400, height: 300 }, "a small screen is not made bigger");
  });

  QUnit.test("the file is named for the game and the second, so that two are not alike", (assert) => {
    assert.strictEqual(photoName(new Date(2026, 9, 31, 7, 5, 9)), "ghost-hunter-20261031-070509.jpg");
    assert.notStrictEqual(photoName(new Date(2026, 9, 31, 7, 5, 9)), photoName(new Date(2026, 9, 31, 7, 5, 10)));
  });
});

QUnit.module("PhotoBooth", () => {
  const pixelAt = (canvas, x, y) => [...canvas.getContext("2d").getImageData(x, y, 1, 1).data];

  QUnit.test("the camera's picture is behind and the scene is over it, and the frame is round the edge", (assert) => {
    const booth = new PhotoBooth(document);
    const video = photoCanvas(200, 100, "#ff0000");
    const scene = document.createElement("canvas");
    scene.width = 200;
    scene.height = 100;
    scene.getContext("2d").fillStyle = "#00ff00";
    scene.getContext("2d").fillRect(100, 0, 100, 100); // the scene is only drawn on the right half
    const canvas = booth.compose(video, scene, 200, 100);
    assert.strictEqual(canvas.width, 200);
    const left = pixelAt(canvas, 50, 50);
    const right = pixelAt(canvas, 150, 50);
    assert.true(left[0] > 200 && left[1] < 40, `left is the camera's red: ${left}`);
    assert.true(right[1] > 200 && right[0] < 40, `right is the scene's green over it: ${right}`);
    const edge = pixelAt(canvas, 2, 50);
    assert.true(edge[0] < 20 && edge[2] < 40, `the frame is dark: ${edge}`);
  });

  QUnit.test("with no camera the scene is on the dark, and the size is held to the table", (assert) => {
    const booth = new PhotoBooth(document);
    const scene = photoCanvas(2000, 1000, "#00ff00");
    const canvas = booth.compose(null, scene, 2000, 1000);
    assert.strictEqual(canvas.width, PHOTO.maxSide);
    assert.strictEqual(canvas.height, PHOTO.maxSide / 2);
    assert.true(pixelAt(canvas, canvas.width / 2, canvas.height / 2)[1] > 200);
  });

  QUnit.test("a source with nothing in it is left out, and nothing goes wrong", (assert) => {
    const booth = new PhotoBooth(document);
    const empty = document.createElement("canvas");
    empty.width = 0;
    empty.height = 0;
    const canvas = booth.compose(empty, empty, 100, 100);
    assert.strictEqual(canvas.width, 100);
  });

  QUnit.test("a photograph is asked for, comes after the delay, once, and is kept as the last", (assert) => {
    const booth = new PhotoBooth(document);
    assert.false(booth.tick(1), "none was asked for");
    booth.ask();
    assert.false(booth.tick(PHOTO.delay / 2));
    assert.true(booth.tick(PHOTO.delay));
    assert.false(booth.tick(1), "once");
    const taken = booth.snap(photoCanvas(10, 10, "#fff"), null, 10, 10, new Date(2026, 0, 1));
    assert.strictEqual(booth.last, taken);
    assert.strictEqual(booth.pending, 0);
    assert.true(booth.thumbnail().startsWith("data:image/jpeg"));
  });

  QUnit.test("there is no thumbnail, and nothing to save, before the first photograph", async (assert) => {
    const booth = new PhotoBooth(document);
    assert.strictEqual(booth.thumbnail(), null);
    assert.strictEqual(await booth.save({}), "none");
  });

  QUnit.test("it is shared where the browser can share files, cancelled if the player closes the sheet, and downloaded where it cannot", async (assert) => {
    const booth = new PhotoBooth(document);
    booth.snap(photoCanvas(20, 20, "#123"), null, 20, 20, new Date(2026, 0, 1, 1, 2, 3));
    const shared = [];
    assert.strictEqual(await booth.save({ canShare: () => true, share: async (data) => shared.push(data.files[0].name) }), "shared");
    assert.deepEqual(shared, ["ghost-hunter-20260101-010203.jpg"]);
    assert.strictEqual(await booth.save({ canShare: () => true, share: async () => { throw new Error("closed"); } }), "cancelled");
    assert.strictEqual(await booth.save({ canShare: () => false }), "downloaded");
  });
});
