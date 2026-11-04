// A board of three across and two deep, no rim, so the numbers are small.
const ROCK_BOARD = { cols: 3, rows: 2, cell: 2, rim: 1, depth: 6, peek: 2, headroom: 1 };

QUnit.module("outline", () => {
  QUnit.test("has the same number of points on each of four sides", (assert) => {
    assert.strictEqual(outline(4, 3, 5).length, 20);
    assert.strictEqual(outline(4, 3, 2).length, 8);
  });

  QUnit.test("starts at the back left corner", (assert) => {
    assert.deepEqual(outline(4, 3, 5)[0], [-4, 3]);
  });

  QUnit.test("every point is on the edge of the rectangle", (assert) => {
    for (const [x, z] of outline(4, 3, 5)) {
      assert.true(Math.abs(x) === 4 || Math.abs(z) === 3, `${x}, ${z}`);
      assert.true(Math.abs(x) <= 4 && Math.abs(z) <= 3);
    }
  });

  QUnit.test("goes round the way a clock's hand goes, seen from above", (assert) => {
    const points = outline(4, 3, 5);
    let area = 0;
    points.forEach(([x, z], i) => {
      const [nx, nz] = points[(i + 1) % points.length];
      area += x * nz - nx * z;
    });

    assert.true(area < 0, "a negative sum of cross products is clockwise, with z going up the screen");
  });
});

QUnit.module("rockRings", () => {
  const rings = (seed = ISLAND.seed, board = ROCK_BOARD) => rockRings(seededRandom(seed), board);

  QUnit.test("there is a ring for every row of the ISLAND table, and a point for each of the outline's", (assert) => {
    const made = rings();

    assert.strictEqual(made.length, ISLAND.rings.length);
    made.forEach((ring) => assert.strictEqual(ring.length, ISLAND.segments * 4));
  });

  QUnit.test("the top ring is the board's outline, exactly, just under the tiles", (assert) => {
    const top = rings()[0];
    const halfWidth = (ROCK_BOARD.cols * ROCK_BOARD.cell) / 2 + ROCK_BOARD.rim;
    const halfDepth = (ROCK_BOARD.rows * ROCK_BOARD.cell) / 2 + ROCK_BOARD.rim;

    top.forEach((p) => {
      assert.strictEqual(p.y, ISLAND.top);
      assert.true(Math.abs(p.x) === halfWidth || Math.abs(p.z) === halfDepth);
    });
  });

  QUnit.test("each ring is lower than the one above, and the last is as deep as the board says", (assert) => {
    const made = rings();

    for (let r = 1; r < made.length; r++) assert.true(made[r][0].y < made[r - 1][0].y);
    assert.true(Math.abs(made[made.length - 1][0].y - (ISLAND.top - ROCK_BOARD.depth)) < 1e-9);
  });

  QUnit.test("nothing sticks out past the board's edge, however the numbers fall", (assert) => {
    const halfWidth = (ROCK_BOARD.cols * ROCK_BOARD.cell) / 2 + ROCK_BOARD.rim;
    const halfDepth = (ROCK_BOARD.rows * ROCK_BOARD.cell) / 2 + ROCK_BOARD.rim;
    for (let seed = 1; seed <= 20; seed++) {
      for (const ring of rings(seed)) {
        assert.true(ring.every((p) => Math.abs(p.x) <= halfWidth + 1e-9 && Math.abs(p.z) <= halfDepth + 1e-9), `seed ${seed}`);
      }
    }
  });

  QUnit.test("the rock narrows as it goes down", (assert) => {
    const reach = (ring) => Math.max(...ring.map((p) => Math.hypot(p.x, p.z)));
    const made = rings();

    assert.true(reach(made[made.length - 1]) < reach(made[0]) / 2);
  });

  QUnit.test("the same seed is the same rock, and another seed is another", (assert) => {
    assert.deepEqual(rings(3), rings(3));
    assert.notDeepEqual(rings(3), rings(4));
  });
});

QUnit.module("rockGeometry", () => {
  const made = () => rockRings(seededRandom(ISLAND.seed), ROCK_BOARD);
  const count = ISLAND.segments * 4;

  QUnit.test("has two triangles for every gap between rings round the outline, and a fan to close the bottom", (assert) => {
    const { positions } = rockGeometry(made());
    const triangles = (ISLAND.rings.length - 1) * count * 2 + count;

    assert.strictEqual(positions.length, triangles * 9);
  });

  QUnit.test("has a pair of texture numbers for every point, and an index for every point, in order", (assert) => {
    const { positions, uvs, indices } = rockGeometry(made());

    assert.strictEqual(uvs.length / 2, positions.length / 3);
    assert.deepEqual(indices.slice(0, 4), [0, 1, 2, 3]);
    assert.strictEqual(indices.length, positions.length / 3);
  });

  QUnit.test("every triangle faces away from the middle: the side is drawn from outside, where it is seen", (assert) => {
    const { positions, indices } = rockGeometry(made());
    const normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    const sides = (ISLAND.rings.length - 1) * count * 2;
    for (let t = 0; t < sides; t++) {
      const at = (k) => positions.slice((t * 3 + k) * 3, (t * 3 + k) * 3 + 3);
      const [a, b, c] = [at(0), at(1), at(2)];
      const middle = [(a[0] + b[0] + c[0]) / 3, (a[2] + b[2] + c[2]) / 3];
      const n = normals.slice(t * 9, t * 9 + 3);

      assert.true(n[0] * middle[0] + n[2] * middle[1] > 0, `triangle ${t}`);
    }
  });

  QUnit.test("and the fan at the bottom faces down", (assert) => {
    const { positions, indices } = rockGeometry(made());
    const normals = [];
    BABYLON.VertexData.ComputeNormals(positions, indices, normals);
    const first = (ISLAND.rings.length - 1) * count * 2;
    for (let t = first; t < first + count; t++) assert.true(normals[t * 9 + 1] < 0, `triangle ${t}`);
  });
});

QUnit.module("makeRockTexture and buildIsland", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the rock texture repeats when it is stretched over a big face", (assert) => {
    const texture = makeRockTexture(scene, seededRandom(1));

    assert.strictEqual(texture.wrapU, BABYLON.Texture.WRAP_ADDRESSMODE);
    assert.strictEqual(texture.wrapV, BABYLON.Texture.WRAP_ADDRESSMODE);
  });

  QUnit.test("buildIsland makes a rock and a flat top", (assert) => {
    const { rock, top } = buildIsland(scene, ROCK_BOARD);

    assert.strictEqual(rock.getTotalVertices(), rockGeometry(rockRings(seededRandom(ISLAND.seed), ROCK_BOARD)).positions.length / 3);
    assert.strictEqual(top.position.y, ISLAND.top);
  });

  QUnit.test("the top is as big as the board with its rim", (assert) => {
    const { top } = buildIsland(scene, ROCK_BOARD);
    const { extendSize } = top.getBoundingInfo().boundingBox;

    assert.true(Math.abs(extendSize.x * 2 - (ROCK_BOARD.cols * ROCK_BOARD.cell + ROCK_BOARD.rim * 2)) < 1e-6);
    assert.true(Math.abs(extendSize.z * 2 - (ROCK_BOARD.rows * ROCK_BOARD.cell + ROCK_BOARD.rim * 2)) < 1e-6);
  });

  QUnit.test("the rock has a material with a picture, and no shine", (assert) => {
    const { rock } = buildIsland(scene, ROCK_BOARD);

    assert.true(rock.material.diffuseTexture !== null);
    assert.true(rock.material.specularColor.equals(BABYLON.Color3.Black()));
  });
});

QUnit.module("the island and the tiles", (hooks) => {
  let engine, scene;
  hooks.beforeEach(() => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
  });
  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("the top of the island is under the bottom of every kind of tile, so that no road is buried", async (assert) => {
    const tiles = await loadTiles(scene, ROCK_BOARD);
    for (const kind of Object.keys(TILES)) {
      const node = placeTile(scene, tiles[kind], `test ${kind}`, 0, 0, 0, ROCK_BOARD);
      node.computeWorldMatrix(true);
      node.getChildMeshes().forEach((mesh) => mesh.computeWorldMatrix(true));
      const { min } = node.getHierarchyBoundingVectors(true);

      assert.true(min.y > ISLAND.top, `${kind} goes down to ${min.y.toFixed(3)}, and the island's top is at ${ISLAND.top}`);
    }
  });
});
