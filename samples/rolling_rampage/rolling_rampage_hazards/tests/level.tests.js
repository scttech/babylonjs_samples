// A small grid to test with, so the numbers are easy to check by hand.
const gridOf = (rows, start = { col: 0, row: 0 }) => parseLevel({ name: "test", rows, start });

QUnit.module("LEVELS", () => {
  QUnit.test("every level has a name, a start and some rows, and the names are different", (assert) => {
    for (const level of LEVELS) {
      assert.true(level.name.length > 0);
      assert.true(level.rows.length > 1, `${level.name} has rows`);
      assert.strictEqual(typeof level.start.col, "number");
      assert.strictEqual(typeof level.start.row, "number");
    }
    assert.strictEqual(new Set(LEVELS.map((level) => level.name)).size, LEVELS.length);
  });

  QUnit.test("every row of a level is as long as the first", (assert) => {
    for (const level of LEVELS) {
      for (const row of level.rows) assert.strictEqual(row.length, level.rows[0].length, level.name);
    }
  });

  QUnit.test("a level is made only of digits and dots", (assert) => {
    for (const level of LEVELS) {
      for (const row of level.rows) assert.true(/^[0-9.]+$/.test(row), `${level.name}: ${row}`);
    }
  });
});

QUnit.module("parseLevel", () => {
  QUnit.test("keeps the name and the start, and says how big the grid is", (assert) => {
    const grid = parseLevel({ name: "Tiny", start: { col: 1, row: 1 }, rows: ["000", "000"] });

    assert.strictEqual(grid.name, "Tiny");
    assert.deepEqual(grid.start, { col: 1, row: 1 });
    assert.strictEqual(grid.cols, 3);
    assert.strictEqual(grid.rows, 2);
  });

  QUnit.test("a digit is that many steps high", (assert) => {
    const grid = gridOf(["03", "80"]);

    assert.deepEqual(grid.heights, [[0, 3 * HEIGHT_STEP], [8 * HEIGHT_STEP, 0]]);
  });

  QUnit.test("a dot is nothing at all", (assert) => {
    const grid = gridOf(["0.", ".0"]);

    assert.deepEqual(grid.heights, [[0, null], [null, 0]]);
  });
});

QUnit.module("cornerHeight", () => {
  const grid = gridOf(["02", "4."]);

  QUnit.test("is the height of the corner at a column and row", (assert) => {
    assert.strictEqual(cornerHeight(grid, 0, 0), 0);
    assert.strictEqual(cornerHeight(grid, 1, 0), 2 * HEIGHT_STEP);
    assert.strictEqual(cornerHeight(grid, 0, 1), 4 * HEIGHT_STEP);
  });

  QUnit.test("is null for a dot", (assert) => {
    assert.strictEqual(cornerHeight(grid, 1, 1), null);
  });

  QUnit.test("is null past the edge of the grid, whichever edge", (assert) => {
    assert.strictEqual(cornerHeight(grid, -1, 0), null);
    assert.strictEqual(cornerHeight(grid, 2, 0), null);
    assert.strictEqual(cornerHeight(grid, 0, -1), null);
    assert.strictEqual(cornerHeight(grid, 0, 2), null);
  });
});

QUnit.module("cellExists", () => {
  QUnit.test("a square has floor if all four of its corners are there", (assert) => {
    assert.true(cellExists(gridOf(["00", "00"]), 0, 0));
  });

  QUnit.test("a dot at any corner takes the square away", (assert) => {
    for (const rows of [[".0", "00"], ["0.", "00"], ["00", ".0"], ["00", "0."]]) {
      assert.false(cellExists(gridOf(rows), 0, 0), rows.join("/"));
    }
  });

  QUnit.test("there is no square at the last column or row, or off the grid", (assert) => {
    const grid = gridOf(["000", "000", "000"]);

    assert.true(cellExists(grid, 1, 1));
    assert.false(cellExists(grid, 2, 0), "the last column has no square to the right");
    assert.false(cellExists(grid, 0, 2), "the last row has no square below");
    assert.false(cellExists(grid, -1, 0));
    assert.false(cellExists(grid, 0, -1));
  });
});

QUnit.module("heightAt", () => {
  QUnit.test("a flat floor is the same height everywhere on it", (assert) => {
    const grid = gridOf(["444", "444", "444"]);

    for (const [x, z] of [[0.1, 0.1], [CELL, CELL], [3.3, 0.5], [0.5, 3.9]]) {
      assert.strictEqual(heightAt(grid, x, z), 4 * HEIGHT_STEP, `${x}, ${z}`);
    }
  });

  QUnit.test("at a corner it is the corner's height", (assert) => {
    const grid = gridOf(["024", "246", "468"]);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (!cellExists(grid, col, row)) continue; // the last row and column have no square of their own
        assert.strictEqual(heightAt(grid, col * CELL, row * CELL), cornerHeight(grid, col, row), `${col}, ${row}`);
      }
    }
  });

  QUnit.test("a ramp rises in a straight line", (assert) => {
    const grid = gridOf(["0246", "0246", "0246"]);

    // Heights go up by 2 steps a corner, so a step of 1 in x is a rise of 2 * HEIGHT_STEP / CELL.
    for (const x of [0.5, 1.5, 2.5, 3.9]) {
      assert.true(Math.abs(heightAt(grid, x, 1) - (x / CELL) * 2 * HEIGHT_STEP) < 1e-9, `x ${x}`);
    }
  });

  QUnit.test("in the middle of a square it is the average of the two corners across the diagonal", (assert) => {
    const grid = gridOf(["28", "46"]); // the corners across one diagonal are 2 and 6 steps, and across the other 8 and 4

    // The square is split from its first corner to its last, so that diagonal is the one the middle is on.
    assert.strictEqual(heightAt(grid, CELL / 2, CELL / 2), 4 * HEIGHT_STEP);
  });

  QUnit.test("is null where there is no floor: a hole, the edge of the grid, off the grid", (assert) => {
    const grid = gridOf(["00.", "000", "000"]);

    assert.strictEqual(heightAt(grid, 3, 1), null, "next to the dot");
    assert.strictEqual(heightAt(grid, -1, 1), null);
    assert.strictEqual(heightAt(grid, 1, 99), null);
  });
});

QUnit.module("levelStart", () => {
  QUnit.test("is above the floor at the start, by the marble's radius and the drop", (assert) => {
    const grid = gridOf(["444", "444", "444"], { col: 0.5, row: 0.5 });

    const start = levelStart(grid);

    assert.strictEqual(start.x, 0.5 * CELL);
    assert.strictEqual(start.z, 0.5 * CELL);
    assert.strictEqual(start.y, 4 * HEIGHT_STEP + MARBLE_RADIUS + DROP_HEIGHT);
  });

  QUnit.test("every real level starts over some floor, and well above the fall limit", (assert) => {
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      const x = grid.start.col * CELL;
      const z = grid.start.row * CELL;

      assert.notStrictEqual(heightAt(grid, x, z), null, `${level.name} has floor at its start`);
      assert.true(levelStart(grid).y > fallLimit(grid), level.name);
    }
  });
});

QUnit.module("lowestHeight and fallLimit", () => {
  QUnit.test("the lowest height is the lowest corner, and a dot doesn't count", (assert) => {
    assert.strictEqual(lowestHeight(gridOf(["50", "9."])), 0);
    assert.strictEqual(lowestHeight(gridOf(["53", "9."])), 3 * HEIGHT_STEP);
  });

  QUnit.test("the fall limit is a margin below the lowest floor", (assert) => {
    const grid = gridOf(["53", "94"]);

    assert.strictEqual(fallLimit(grid), 3 * HEIGHT_STEP - FALL_MARGIN);
  });

  QUnit.test("a marble below the limit has fallen, and one on the lowest floor has not", (assert) => {
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      assert.true(hasFallen(lowestHeight(grid) - FALL_MARGIN - 1, fallLimit(grid)), level.name);
      assert.false(hasFallen(lowestHeight(grid) + MARBLE_RADIUS, fallLimit(grid)), level.name);
    }
  });
});

QUnit.module("levelGeometry", () => {
  const one = gridOf(["00", "00"]); // a single square
  const two = gridOf(["000", "000"]); // two squares side by side

  // The three points of every triangle, and the way it faces.
  const triangles = (grid) => {
    const { positions, indices } = levelGeometry(grid);
    const point = (i) => new BABYLON.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    const result = [];
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [point(indices[i]), point(indices[i + 1]), point(indices[i + 2])];
      // This is the sum Babylon.js uses to work out which way a triangle faces (and so which side is its front).
      const normal = BABYLON.Vector3.Cross(c.subtract(a), b.subtract(a));
      result.push({ a, b, c, area: normal.length() / 2, normal: normal.normalize() });
    }
    return result;
  };

  QUnit.test("the lists are the right lengths for what they describe", (assert) => {
    const { positions, uvs, indices } = levelGeometry(one);

    assert.strictEqual(positions.length % 3, 0);
    assert.strictEqual(uvs.length / 2, positions.length / 3, "a texture position for every point");
    assert.strictEqual(indices.length % 3, 0);
    assert.true(indices.every((i) => Number.isInteger(i) && i >= 0 && i < positions.length / 3), "every index is a point");
  });

  QUnit.test("a single square is two triangles of floor and four walls of two triangles each", (assert) => {
    assert.strictEqual(levelGeometry(one).indices.length / 3, 2 + 4 * 2);
  });

  QUnit.test("squares side by side share their corners, and have no wall between them", (assert) => {
    const { positions, indices } = levelGeometry(two);

    // 6 corners, and a wall on each of the 6 outside edges, each with 4 points of its own.
    assert.strictEqual(positions.length / 3, 6 + 6 * 4);
    assert.strictEqual(indices.length / 3, 2 * 2 + 6 * 2);
  });

  QUnit.test("a dot takes away every square that touches it", (assert) => {
    assert.strictEqual(levelGeometry(gridOf(["000", "0.0", "000"])).indices.length, 0, "all four squares are gone");
    assert.true(levelGeometry(gridOf(["000", "000", "00."])).indices.length > 0, "but three are left here");
  });

  QUnit.test("no triangle is flat on its edge, in any real level", (assert) => {
    for (const level of LEVELS) {
      for (const t of triangles(parseLevel(level))) assert.true(t.area > 1e-6, `${level.name}: a triangle with no area`);
    }
  });

  QUnit.test("the floor faces up and the walls face out", (assert) => {
    const middle = { x: CELL / 2, z: CELL / 2 };

    let floor = 0;
    let walls = 0;
    for (const t of triangles(one)) {
      if (t.normal.y > 0.99) {
        floor++;
      } else {
        walls++;
        assert.true(Math.abs(t.normal.y) < 1e-9, "a wall is upright");
        const centre = t.a.add(t.b).add(t.c).scale(1 / 3);
        const outward = (centre.x - middle.x) * t.normal.x + (centre.z - middle.z) * t.normal.z;
        assert.true(outward > 0, `a wall at ${centre.x}, ${centre.z} faces out`);
      }
    }
    assert.strictEqual(floor, 2);
    assert.strictEqual(walls, 8);
  });

  QUnit.test("the walls go down to the bottom", (assert) => {
    const { positions } = levelGeometry(one);
    const ys = positions.filter((_, i) => i % 3 === 1);

    assert.strictEqual(Math.min(...ys), SKIRT_BOTTOM);
  });

  QUnit.test("the floor is the same triangles heightAt works with, in every real level", (assert) => {
    const problems = [];
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      for (const t of triangles(grid)) {
        if (t.normal.y < 0.5) continue; // a wall
        const centre = t.a.add(t.b).add(t.c).scale(1 / 3);
        const height = heightAt(grid, centre.x, centre.z);
        if (height === null || Math.abs(height - centre.y) > 1e-9) problems.push(`${level.name} at ${centre.x}, ${centre.z}: ${height} not ${centre.y}`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("no slope in a real level is steeper than half", (assert) => {
    const problems = [];
    for (const level of LEVELS) {
      const grid = parseLevel(level);
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const here = cornerHeight(grid, col, row);
          for (const [dc, dr] of [[1, 0], [0, 1]]) {
            const there = cornerHeight(grid, col + dc, row + dr);
            if (here === null || there === null) continue;
            if (Math.abs(there - here) / CELL > 0.5) problems.push(`${level.name} at ${col}, ${row}`);
          }
        }
      }
    }
    assert.deepEqual(problems, []);
  });
});

// Building a level needs a scene and physics. These use a NullEngine, which draws nothing, and
// let time go by with stepPhysics.
QUnit.module("buildLevel", (hooks) => {
  let engine;
  let scene;

  hooks.beforeEach(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    await loadPhysics(scene);
  });

  hooks.afterEach(() => {
    scene.dispose();
    engine.dispose();
  });

  QUnit.test("makes a mesh named for the level, with the points the geometry says, that can take a shadow", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);

    assert.strictEqual(built.mesh.name, LEVELS[0].name);
    assert.strictEqual(built.mesh.getTotalVertices(), levelGeometry(parseLevel(LEVELS[0])).positions.length / 3);
    assert.true(built.mesh.receiveShadows);
  });

  QUnit.test("gives the mesh a body that never moves", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);

    assert.true(Boolean(built.mesh.physicsBody));
    assert.strictEqual(built.mesh.physicsBody.getMassProperties().mass, 0);
  });

  QUnit.test("gives back the grid it made the level from", (assert) => {
    const built = buildLevel(scene, LEVELS[1]);

    assert.strictEqual(built.grid.name, LEVELS[1].name);
    assert.strictEqual(built.grid.cols, LEVELS[1].rows[0].length);
  });

  QUnit.test("a marble dropped at the start of each level comes to rest on the floor", (assert) => {
    for (const level of LEVELS) {
      const built = buildLevel(scene, level);
      const start = levelStart(built.grid);
      const marble = new Marble(scene, { start });

      stepPhysics(scene, 1.5);

      const floor = heightAt(built.grid, start.x, start.z);
      assert.true(Math.abs(marble.position.y - (floor + MARBLE_RADIUS)) < 0.05, `${level.name}: ${marble.position.y} on ${floor}`);
      assert.true(marble.grounded, `${level.name} is grounded`);

      marble.mesh.dispose();
      built.dispose();
    }
  });

  QUnit.test("a marble rolls down a ramp, along it and not across it", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);
    // The ramp is where the digits fall, from column 4 to column 9, so it goes down along +x.
    const x = 6.5 * CELL;
    const z = 2 * CELL;
    const startY = heightAt(built.grid, x, z) + MARBLE_RADIUS + 0.1;
    const marble = new Marble(scene, { start: { x, y: startY, z } });

    stepPhysics(scene, 1);

    assert.true(marble.position.x > x + 1.5, `rolled on to ${marble.position.x}`);
    assert.true(Math.abs(marble.position.z - z) < 0.3, `and stayed in line: ${marble.position.z}`);
    assert.true(marble.position.y < startY - 0.5, `and went down: ${marble.position.y}`);
  });

  QUnit.test("it keeps to the floor on the slope: it doesn't sink into it or bounce away", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);
    const x = 5.5 * CELL;
    const z = 2 * CELL;
    const marble = new Marble(scene, { start: { x, y: heightAt(built.grid, x, z) + MARBLE_RADIUS + 0.05, z } });

    const problems = [];
    for (let i = 0; i < 40; i++) {
      stepPhysics(scene, 1 / 20);
      const floor = heightAt(built.grid, marble.position.x, marble.position.z);
      if (floor === null) break; // it has rolled off the end of the floor
      const above = marble.position.y - floor;
      if (above < MARBLE_RADIUS - 0.1 || above > MARBLE_RADIUS + 0.6) problems.push(`${marble.position.x.toFixed(1)}: ${above.toFixed(2)} above`);
    }

    assert.deepEqual(problems, []);
  });

  QUnit.test("a marble over a hole falls out of the level", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);
    const marble = new Marble(scene, { start: { x: 2, y: 5, z: 10 * CELL } }); // the first columns are dots down here

    stepPhysics(scene, 1.5);

    assert.true(hasFallen(marble.position.y, fallLimit(built.grid)), `${marble.position.y}`);
  });

  QUnit.test("a wall stops a marble that rolls into it from underneath", (assert) => {
    buildLevel(scene, LEVELS[0]);
    // The start deck's wall is the plane x = 0. The marble comes at it from outside, with nothing
    // under it to roll on, so only the wall can stop it.
    const marble = new Marble(scene, { start: { x: -2, y: 1, z: 2 * CELL } });
    marble.aggregate.body.setLinearVelocity(new BABYLON.Vector3(4, 0, 0));
    marble.aggregate.body.setGravityFactor(0);

    stepPhysics(scene, 1);

    assert.true(marble.position.x < 0, `it is at ${marble.position.x}, still outside the wall at 0`);
  });

  QUnit.test("disposing a level takes the mesh and the floor away", (assert) => {
    const built = buildLevel(scene, LEVELS[0]);
    const start = levelStart(built.grid);
    built.dispose();
    const marble = new Marble(scene, { start });

    stepPhysics(scene, 1.5);

    assert.strictEqual(scene.getMeshByName(LEVELS[0].name), null);
    assert.true(marble.position.y < start.y - 5, `fell to ${marble.position.y}`);
  });

  QUnit.test("another level can be built in its place", (assert) => {
    buildLevel(scene, LEVELS[0]).dispose();
    const built = buildLevel(scene, LEVELS[1]);
    const start = levelStart(built.grid);
    const marble = new Marble(scene, { start });

    stepPhysics(scene, 1.5);

    assert.true(Math.abs(marble.position.y - (heightAt(built.grid, start.x, start.z) + MARBLE_RADIUS)) < 0.05);
  });
});
