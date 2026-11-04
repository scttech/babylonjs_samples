QUnit.module("minimapCell", () => {
  const grid = parseMap({ name: "t", rows: ["S#c.", "..#G"] });

  QUnit.test("says what each cell is", (assert) => {
    assert.strictEqual(minimapCell(grid, 0, 0), "start");
    assert.strictEqual(minimapCell(grid, 1, 0), "road");
    assert.strictEqual(minimapCell(grid, 2, 0), "prop");
    assert.strictEqual(minimapCell(grid, 3, 0), "grass");
    assert.strictEqual(minimapCell(grid, 3, 1), "goal");
    assert.strictEqual(minimapCell(grid, 2, 1), "road");
  });

  QUnit.test("the two ends are not roads, though a road is under them", (assert) => {
    assert.notStrictEqual(minimapCell(grid, 0, 0), "road");
    assert.notStrictEqual(minimapCell(grid, 3, 1), "road");
  });

  QUnit.test("every cell of both maps is one of the kinds that have a color", (assert) => {
    for (const map of MAPS) {
      const real = parseMap(map);
      for (let row = 0; row < real.rows; row++) for (let col = 0; col < real.cols; col++) assert.true(minimapCell(real, col, row) in MINIMAP, `${map.name} ${col},${row}`);
    }
  });
});

QUnit.module("drawMinimap", () => {
  const draw = (map, width = 140, height = 90) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const placed = drawMinimap(context, parseMap(map), width, height);
    const colorAt = (x, y) => {
      const [r, g, b] = context.getImageData(x, y, 1, 1).data;
      return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    };
    return { placed, colorAt };
  };
  const map = { name: "t", rows: ["S#.G", "..c."] };

  QUnit.test("the cells are as big as will fit, and square, in the middle", (assert) => {
    const { placed } = draw(map, 140, 90);

    assert.strictEqual(placed.cell, Math.floor(Math.min(140 / 4, 90 / 2)));
    assert.strictEqual(placed.left, Math.floor((140 - placed.cell * 4) / 2));
    assert.true(placed.top >= 0);
  });

  QUnit.test("each cell is its color: the road, the grass, the two ends and the scenery", (assert) => {
    const { placed, colorAt } = draw(map);
    const at = (col, row) => colorAt(placed.left + col * placed.cell + 4, placed.top + row * placed.cell + 4);

    assert.strictEqual(at(0, 0), MINIMAP.start);
    assert.strictEqual(at(1, 0), MINIMAP.road);
    assert.strictEqual(at(2, 0), MINIMAP.grass);
    assert.strictEqual(at(3, 0), MINIMAP.goal);
    assert.strictEqual(at(2, 1), MINIMAP.prop);
  });

  QUnit.test("a real map fits in the card that it is drawn on, and nothing is drawn outside it", (assert) => {
    for (const real of MAPS) {
      const { placed } = draw(real, 140, 90);
      const grid = parseMap(real);

      assert.true(placed.left >= 0 && placed.top >= 0, real.name);
      assert.true(placed.left + placed.cell * grid.cols <= 140 && placed.top + placed.cell * grid.rows <= 90, real.name);
      assert.true(placed.cell >= 4, `${real.name}: a cell is ${placed.cell} pixels`);
    }
  });

  QUnit.test("the two maps look different", (assert) => {
    const picture = (real) => {
      const canvas = document.createElement("canvas");
      canvas.width = 140;
      canvas.height = 90;
      const context = canvas.getContext("2d");
      drawMinimap(context, parseMap(real), 140, 90);
      return canvas.toDataURL();
    };

    assert.notStrictEqual(picture(MAPS[0]), picture(MAPS[1]));
  });
});
