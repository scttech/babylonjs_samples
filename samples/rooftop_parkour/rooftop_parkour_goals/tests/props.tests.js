QUnit.module("frameToWorld", () => {
  const origin = { x: 10, z: 20 };

  QUnit.test("for something that faces north, along is east and out is north", (assert) => {
    assert.deepEqual(frameToWorld(origin, 0, 2, 3), { x: 12, z: 23 });
  });

  QUnit.test("facing east, out is east and along is south", (assert) => {
    assert.deepEqual(frameToWorld(origin, 1, 2, 3), { x: 13, z: 18 });
  });

  QUnit.test("facing south, out is south and along is west", (assert) => {
    assert.deepEqual(frameToWorld(origin, 2, 2, 3), { x: 8, z: 17 });
  });

  QUnit.test("facing west, out is west and along is north", (assert) => {
    assert.deepEqual(frameToWorld(origin, 3, 2, 3), { x: 7, z: 22 });
  });

  QUnit.test("it is a turn: the distance from the origin is the same whichever way it faces", (assert) => {
    for (let turn = 0; turn < 4; turn++) {
      const at = frameToWorld(origin, turn, 2, 3);
      assert.true(Math.abs(Math.hypot(at.x - origin.x, at.z - origin.z) - Math.hypot(2, 3)) < 1e-9, turn);
    }
  });

  QUnit.test("it agrees with how the models are turned: out is the way a piece faces after rotationY", (assert) => {
    for (const facing of ["north", "east", "south", "west"]) {
      const turn = quarterTurns(facing);
      const out = frameToWorld({ x: 0, z: 0 }, turn, 0, 1);
      assert.true(Math.abs(out.x - Math.sin(FACINGS[facing])) < 1e-9 && Math.abs(out.z - Math.cos(FACINGS[facing])) < 1e-9, facing);
    }
  });
});

QUnit.module("turnedBox", () => {
  QUnit.test("a box is centred where it is put, with the size it is given", (assert) => {
    const box = turnedBox("b", 5, -2, 4, 2, 0, 1, 0);
    assert.deepEqual([box.minX, box.maxX, box.minZ, box.maxZ, box.minY, box.maxY], [3, 7, -3, -1, 0, 1]);
    assert.strictEqual(box.name, "b");
  });

  QUnit.test("turned a quarter, the width and the depth change places", (assert) => {
    const box = turnedBox("b", 5, -2, 4, 2, 0, 1, 1);
    assert.deepEqual([box.minX, box.maxX, box.minZ, box.maxZ], [4, 6, -4, 0]);
  });

  QUnit.test("turned half way, it is the same box", (assert) => {
    assert.deepEqual(turnedBox("b", 5, -2, 4, 2, 0, 1, 2), turnedBox("b", 5, -2, 4, 2, 0, 1, 0));
  });
});

QUnit.module("frameBox", () => {
  const box = { minX: -1, maxX: 3, minZ: 0, maxZ: 2, minY: -0.1, maxY: 0 };

  QUnit.test("a box in the frame of a piece is a box in the world, standing at the height of the piece", (assert) => {
    const world = frameBox("b", { x: 10, z: 20 }, 0, 5, box);
    assert.deepEqual([world.minX, world.maxX, world.minZ, world.maxZ], [9, 13, 20, 22]);
    assert.true(Math.abs(world.minY - 4.9) < 1e-9 && world.maxY === 5);
  });

  QUnit.test("turned, the sides are still the right way round (min is less than max)", (assert) => {
    for (let turn = 0; turn < 4; turn++) {
      const world = frameBox("b", { x: 10, z: 20 }, turn, 5, box);
      assert.true(world.minX < world.maxX && world.minZ < world.maxZ, turn);
      assert.true(Math.abs(world.maxX - world.minX - (turn % 2 ? 2 : 4)) < 1e-9, turn);
    }
  });
});

QUnit.module("platformBoxes", () => {
  const o = { ...SCOUT, ...BODY };

  QUnit.test("a platform is three slabs round the gap for the stair, all the way to the wall and out to the edge", (assert) => {
    const slabs = platformBoxes(false);
    assert.strictEqual(slabs.length, 3);
    for (const slab of slabs) {
      assert.true(slab.maxY === 0 && slab.minY < 0 && slab.maxY - slab.minY < 0.2, "thin, and its top at the platform");
      assert.true(slab.minX >= -FIRE_ESCAPE.width / 2 && slab.maxX <= FIRE_ESCAPE.width / 2 && slab.minZ >= 0 && slab.maxZ <= FIRE_ESCAPE.depth);
    }
  });

  QUnit.test("with a stair, there is a tread for each step, each higher than the last", (assert) => {
    const boxes = platformBoxes(true);
    assert.strictEqual(boxes.length, 3 + FIRE_ESCAPE.stair.count);
    const treads = boxes.slice(3);
    for (let i = 1; i < treads.length; i++) {
      assert.true(treads[i].maxY > treads[i - 1].maxY && treads[i].minX >= treads[i - 1].maxX - 1e-9, i);
    }
  });

  QUnit.test("each step of the stair is a step a runner can take, from the platform to the last, and from the last to the platform above", (assert) => {
    const treads = platformBoxes(true).slice(3);
    assert.true(treads[0].maxY < o.stepHeight, "the first, from the platform");
    for (let i = 1; i < treads.length; i++) assert.true(treads[i].maxY - treads[i - 1].maxY < o.stepHeight, i);
    assert.true(FIRE_ESCAPE.floor - treads[treads.length - 1].maxY < o.stepHeight, "the last, to the platform above");
  });

  QUnit.test("the stair is in the gap in the platform, and the gap in the platform above has a body's room: the stair is a wide as the gap allows", (assert) => {
    const s = FIRE_ESCAPE.stair;
    const g = FIRE_ESCAPE.opening;
    assert.true(s.minX >= g.minX && s.minX + s.tread * s.count <= g.maxX + 1e-9 && s.minZ >= g.minZ && s.maxZ <= g.maxZ);
    assert.true(g.maxZ - g.minZ >= o.radius * 2, "the gap is as wide as a runner");
  });

  QUnit.test("a runner standing on the platform at the front of the stair can climb it: the stair is no nearer the front than a body is wide", (assert) => {
    const back = platformBoxes(false).find((slab) => slab.minX === FIRE_ESCAPE.opening.minX);
    const s = FIRE_ESCAPE.stair;
    assert.true(back.maxZ - back.minZ >= o.radius * 2 - 0.1, "the strip at the front is about a body wide");
    assert.true(back.maxZ - o.radius - o.topOffset >= s.maxZ + o.radius - 1e-9, "a body that has climbed onto it is clear of the stair");
  });
});

QUnit.module("escapeFloors", () => {
  QUnit.test("there is a platform at the base, and one more for each floor that is not above the roof", (assert) => {
    assert.strictEqual(escapeFloors(FIRE_ESCAPE.base), 1);
    assert.strictEqual(escapeFloors(FIRE_ESCAPE.base + FIRE_ESCAPE.floor - 0.01), 1);
    assert.strictEqual(escapeFloors(FIRE_ESCAPE.base + FIRE_ESCAPE.floor), 2);
    assert.strictEqual(escapeFloors(FIRE_ESCAPE.base + FIRE_ESCAPE.floor * 5 + 1), 6);
  });

  QUnit.test("there is always at least the one", (assert) => {
    assert.strictEqual(escapeFloors(0), 1);
  });

  QUnit.test("the top platform is the base and a floor for each of the others", (assert) => {
    assert.strictEqual(escapeTop(1), FIRE_ESCAPE.base);
    assert.true(Math.abs(escapeTop(4) - (FIRE_ESCAPE.base + FIRE_ESCAPE.floor * 3)) < 1e-9);
    assert.strictEqual(escapeTop(3, 4), 4 + FIRE_ESCAPE.floor * 2);
  });
});

QUnit.module("escapeReach", () => {
  QUnit.test("a roof no higher than a step from the platform is walked onto, and a roof a body's hands can reach is climbed", (assert) => {
    assert.strictEqual(escapeReach(0), "walk");
    assert.strictEqual(escapeReach(ESCAPE_RISE.walk), "walk");
    assert.strictEqual(escapeReach(ESCAPE_RISE.least), "climb");
    assert.strictEqual(escapeReach(ESCAPE_RISE.climb), "climb");
  });

  QUnit.test("between, or above, it is neither", (assert) => {
    assert.strictEqual(escapeReach(ESCAPE_RISE.walk + 0.05), null);
    assert.strictEqual(escapeReach(ESCAPE_RISE.least - 0.05), null);
    assert.strictEqual(escapeReach(ESCAPE_RISE.climb + 0.05), null);
  });

  QUnit.test("the numbers agree with the runner's: a step is what it can step, and a climb is what it can mantle", (assert) => {
    assert.true(ESCAPE_RISE.walk <= BODY.stepHeight);
    assert.true(ESCAPE_RISE.least > BODY.stepHeight);
    assert.true(ESCAPE_RISE.climb <= BODY.mantleHeight);
  });
});

QUnit.module("fireEscapes", () => {
  const o = { ...SCOUT, ...BODY };
  const escapes = fireEscapes();
  const placed = buildingPlacements();

  QUnit.test("there is one for each building that has one in the plan, named for it", (assert) => {
    const wanted = Object.values(LAYOUTS).flat().filter((entry) => entry.escape);
    assert.strictEqual(escapes.length, wanted.length);
    assert.true(escapes.length >= 1);
    for (const escape of escapes) assert.strictEqual(escape.name, `${placed[escape.building].name} fire escape`);
  });

  QUnit.test("every building of the district has one, so that every roof can be reached from the street", (assert) => {
    assert.deepEqual(escapes.map((escape) => escape.building), placed.map((_, i) => i));
  });

  QUnit.test("it is on the wall at the front of its building, inside the width of it, with the whole of its width on the wall", (assert) => {
    for (const escape of escapes) {
      const walls = wallFootprint(placed[escape.building]);
      const half = FIRE_ESCAPE.width / 2;
      const turn = escape.turn;
      const along = turn % 2 === 0 ? [escape.x - half, escape.x + half, walls.minX, walls.maxX] : [escape.z - half, escape.z + half, walls.minZ, walls.maxZ];
      assert.true(along[0] >= along[2] - 1e-9 && along[1] <= along[3] + 1e-9, escape.name);
      const plane = [walls.maxZ, walls.maxX, walls.minZ, walls.minX][turn];
      assert.true(Math.abs((turn % 2 === 0 ? escape.z : escape.x) - plane) < 1e-9, `\${escape.name} is on the wall`);
    }
  });

  QUnit.test("it sticks out into the street, in front of the building: it is not in the wall of its building, and not in another", (assert) => {
    const inside = (a, b) => Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > 0.01 && Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > 0.01;
    for (const escape of escapes) {
      for (const box of escape.boxes) {
        for (const [i, roof] of buildingBoxes().entries()) assert.false(inside(box, roof), `${escape.name} is not in the ${roof.name} (${i})`);
      }
    }
  });

  QUnit.test("the first platform is where the planter, and a jump, reach it, and a body is not hit on the head on the way", (assert) => {
    for (const escape of escapes) {
      const reach = escape.base - escape.planter.box.maxY;
      assert.true(reach < jumpHeight(o) + o.handReach - 0.2, `\${escape.name}: \${reach.toFixed(2)} m from the planter`);
      assert.true(reach > o.handLow, escape.name);
    }
  });

  QUnit.test("the top platform is under the roof, and the roof is walked onto or climbed onto from it", (assert) => {
    for (const escape of escapes) {
      assert.true(escape.top <= placed[escape.building].roof - placed[escape.building].ledge + 1e-9, escape.name);
      assert.notStrictEqual(escapeReach(escape.rise), null, `\${escape.name}: \${escape.rise.toFixed(2)} m up to the roof`);
    }
  });

  QUnit.test("there is a platform for each floor, a piece of the kit for each, with a bottom, a top and the middle ones between", (assert) => {
    for (const escape of escapes) {
      assert.strictEqual(escape.pieces.length, escape.floors, escape.name);
      assert.strictEqual(escape.pieces[0].piece, FIRE_ESCAPE.bottom);
      if (escape.floors > 1) assert.strictEqual(escape.pieces[escape.floors - 1].piece, FIRE_ESCAPE.top);
      for (const piece of escape.pieces.slice(1, -1)) assert.strictEqual(piece.piece, FIRE_ESCAPE.center);
      escape.pieces.forEach((piece, i) => assert.true(Math.abs(piece.y - (escape.base + FIRE_ESCAPE.floor * i)) < 1e-9));
    }
  });

  QUnit.test("each platform has its slabs, and all but the top have the stair too", (assert) => {
    for (const escape of escapes) {
      assert.strictEqual(escape.boxes.length, 3 * escape.floors + FIRE_ESCAPE.stair.count * (escape.floors - 1), escape.name);
    }
  });

  QUnit.test("the planter is on the sidewalk, not in the road, as far out as it must be", (assert) => {
    for (const escape of escapes) {
      const box = escape.planter.box;
      assert.strictEqual(box.maxY - box.minY, PLANTER.height);
      assert.true(PLANTER.height > o.stepHeight && PLANTER.height <= o.mantleHeight, "a mantle");
      const middle = { x: (box.minX + box.maxX) / 2, z: (box.minZ + box.maxZ) / 2 };
      assert.strictEqual(groundHeight(middle.x, middle.z), 0, `\${escape.name}: the middle of the planter is on the sidewalk`);
      assert.false(buildingBoxes().some((roof) => boxGap(box, roof).overlap), escape.name);
    }
  });

  QUnit.test("the planter is next to the edge of the platform: near enough that a hand reaches it from the planter", (assert) => {
    for (const escape of escapes) {
      const edge = frameToWorld({ x: escape.x, z: escape.z }, escape.turn, 0, FIRE_ESCAPE.depth);
      const box = escape.planter.box;
      const near = Math.hypot(Math.max(box.minX - edge.x, 0, edge.x - box.maxX), Math.max(box.minZ - edge.z, 0, edge.z - box.maxZ));
      assert.true(near < o.grabDistance, `${escape.name}: the planter is ${near.toFixed(2)} m from the edge`);
    }
  });

  QUnit.test("pieces are placed with the middle of their footprint where the library puts it, and turned to face the way the building does", (assert) => {
    for (const escape of escapes) {
      for (const piece of escape.pieces) assert.true(Math.abs(piece.rotationY - escape.turn * (Math.PI / 2)) < 1e-9);
    }
  });
});

QUnit.module("sills", () => {
  const all = sills();

  QUnit.test("there is a piece for each in the rows of the plan", (assert) => {
    const wanted = Object.values(LAYOUTS).flat().reduce((sum, entry) => sum + (entry.sills ? entry.sills.count : 0), 0);
    assert.strictEqual(all.length, wanted);
    assert.true(all.length > 0);
  });

  QUnit.test("each is the size of the piece, and its top is where the plan says", (assert) => {
    for (const sill of all) {
      assert.true(Math.abs(sill.maxY - sill.minY - SILL.height) < 1e-9);
      const wide = sill.maxX - sill.minX;
      const deep = sill.maxZ - sill.minZ;
      assert.true((Math.abs(wide - SILL.width) < 1e-9 && Math.abs(deep - SILL.depth) < 1e-9) || (Math.abs(deep - SILL.width) < 1e-9 && Math.abs(wide - SILL.depth) < 1e-9));
    }
  });

  QUnit.test("each is under the roof of its building, and above where a runner can reach from the street", (assert) => {
    const placed = buildingPlacements();
    for (const sill of all) {
      const placement = placed.find((p) => sill.name === `${p.name} sill`);
      assert.notStrictEqual(placement, undefined, sill.name);
      assert.true(sill.maxY < placement.roof, "under the roof");
      assert.true(sill.minY > ESCAPE_RISE.climb, "above a runner's reach from the ground");
    }
  });

  QUnit.test("they are a row of ledges: from the end of one a runner can shimmy on to the next, because they touch", (assert) => {
    let next = 0;
    for (const entry of Object.values(LAYOUTS).flat()) {
      if (!entry.sills) continue;
      const row = all.slice(next, next + entry.sills.count);
      next += entry.sills.count;
      for (let i = 1; i < row.length; i++) assert.true(boxGap(row[i - 1], row[i]).gap < 0.01, `${row[i].name} ${i}`);
    }
  });
});

QUnit.module("roofThings", () => {
  const o = { ...SCOUT, ...BODY };
  const things = roofThings();

  QUnit.test("there is one for each in the plan, and every kind is a kind", (assert) => {
    const wanted = Object.values(LAYOUTS).flat().reduce((sum, entry) => sum + (entry.roof ? entry.roof.length : 0), 0);
    assert.strictEqual(things.length, wanted);
    for (const thing of things) assert.true(thing.kind in ROOF_FEATURES);
  });

  QUnit.test("each stands on the roof of its building, inside the edge of it, with its size", (assert) => {
    const roofs = buildingBoxes();
    const placed = buildingPlacements();
    for (const thing of things) {
      const index = placed.findIndex((placement) => thing.name.startsWith(placement.name) && thing.minY === placement.roof && boxGap(thing, roofs[placed.indexOf(placement)]).overlap);
      assert.true(index >= 0, thing.name);
      const roof = roofs[index];
      assert.true(thing.minX >= roof.minX + RIM_WIDTH && thing.maxX <= roof.maxX - RIM_WIDTH && thing.minZ >= roof.minZ + RIM_WIDTH && thing.maxZ <= roof.maxZ - RIM_WIDTH, `\${thing.name} is not on the raised edge`);
      assert.true(Math.abs(thing.maxY - thing.minY - ROOF_FEATURES[thing.kind].height) < 1e-9);
    }
  });

  QUnit.test("a vent is a wall to vault, and a hut is a ledge to climb to, with a jump", (assert) => {
    const vent = ROOF_FEATURES.vent;
    assert.true(vent.height > o.stepHeight && vent.height <= o.vaultHeight && vent.depth <= o.vaultDepth && vent.width <= o.vaultDepth);
    const hut = ROOF_FEATURES.hut;
    assert.true(hut.height > o.mantleHeight, "too high to mantle from the ground");
    assert.true(hut.height < jumpHeight(o) + o.handReach, "and a jump gets the hands to it");
  });

  QUnit.test("none touch each other, and each has a colour", (assert) => {
    things.forEach((thing, i) => {
      assert.true(/^#[0-9a-f]{6}$/i.test(thing.color), thing.name);
      for (let j = i + 1; j < things.length; j++) assert.false(boxGap(thing, things[j]).overlap && thing.minY === things[j].minY, `\${thing.name} and \${things[j].name}`);
    });
  });
});

QUnit.module("propBoxes and propPieces", () => {
  QUnit.test("propBoxes are the boxes of the fire escapes, the planters, the sills and what is on the roofs", (assert) => {
    const expected = fireEscapes().reduce((sum, escape) => sum + escape.boxes.length + 1, 0) + sills().length + roofThings().length;
    assert.strictEqual(propBoxes().length, expected);
  });

  QUnit.test("every box is a box: its sides are the right way round, and it has a name", (assert) => {
    for (const box of propBoxes()) {
      assert.true(box.minX < box.maxX && box.minZ < box.maxZ && box.minY < box.maxY && typeof box.name === "string", box.name);
    }
  });

  QUnit.test("no box is under the ground", (assert) => {
    for (const box of propBoxes()) assert.true(box.minY >= 0, box.name);
  });

  QUnit.test("propPieces lists the three pieces of a fire escape, the planter and the sill, once each", (assert) => {
    const wanted = propPieces();
    assert.strictEqual(new Set(wanted).size, wanted.length);
    for (const file of [FIRE_ESCAPE.bottom, FIRE_ESCAPE.center, FIRE_ESCAPE.top, PLANTER.file, SILL.file]) assert.true(wanted.includes(file), file);
  });

  QUnit.test("every piece has a middle that is known", (assert) => {
    for (const file of propPieces()) assert.notStrictEqual(PIECE_CENTERS[file], undefined, file);
  });
});
