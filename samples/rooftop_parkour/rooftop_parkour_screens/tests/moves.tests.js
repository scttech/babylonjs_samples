QUnit.module("crossing", () => {
  const box = { minX: 0, maxX: 4, minZ: 2, maxZ: 3 };

  QUnit.test("a line that goes through a box goes in and comes out, at distances along it", (assert) => {
    assert.deepEqual(crossing(box, 2, 0, 0, 1), { enter: 2, exit: 3 });
    assert.deepEqual(crossing(box, -1, 2.5, 1, 0), { enter: 1, exit: 5 });
  });

  QUnit.test("a line that starts inside goes in at 0", (assert) => {
    assert.deepEqual(crossing(box, 2, 2.5, 0, 1), { enter: 0, exit: 0.5 });
  });

  QUnit.test("a line that misses it, or is going away from it, crosses nothing", (assert) => {
    assert.strictEqual(crossing(box, 5, 0, 0, 1), null);
    assert.strictEqual(crossing(box, 2, 0, 0, -1), null);
    assert.strictEqual(crossing(box, 2, 5, 0, 1), null);
  });

  QUnit.test("a line along a side of the box, inside its slab, goes through it, and outside the slab misses it", (assert) => {
    assert.deepEqual(crossing(box, -2, 2.5, 1, 0), { enter: 2, exit: 6 });
    assert.strictEqual(crossing(box, -2, 3.5, 1, 0), null);
  });

  QUnit.test("a line at a slant is found by the same arithmetic", (assert) => {
    const s = Math.SQRT1_2;
    const hit = crossing(box, 1, 1, s, s);
    assert.true(Math.abs(hit.enter - Math.SQRT2) < 1e-9);
    assert.true(Math.abs(hit.exit - 2 * Math.SQRT2) < 1e-9);
  });
});

QUnit.module("findVault", () => {
  const OPTIONS = { ...SCOUT, ...BODY };
  // A low wall: 0.9 high and 0.4 thick, its south side on the plane z = 0.
  const LOW = { name: "low wall", minX: -5, maxX: 5, minY: 0, maxY: 0.9, minZ: 0, maxZ: 0.4 };
  const worldOf = (...boxes) => new World({ boxes });
  // A runner going north at 5 metres a second, 0.3 from the wall.
  const runnerAt = (changes = {}) => ({ x: 0, y: 0, z: -OPTIONS.radius - 0.3, heading: 0, speed: 5, ...changes });
  const wallOf = (changes) => ({ ...LOW, ...changes });

  QUnit.test("a runner at a low wall vaults it, to a place beyond it on the ground", (assert) => {
    const vault = findVault(worldOf(LOW), runnerAt(), OPTIONS);
    assert.deepEqual(vault.from, { x: 0, y: 0, z: -OPTIONS.radius - 0.3 });
    assert.true(Math.abs(vault.to.z - (LOW.maxZ + OPTIONS.radius + OPTIONS.vaultLanding)) < 1e-9);
    assert.strictEqual(vault.to.y, 0);
    assert.strictEqual(vault.top, 0.9);
    assert.true(Math.abs(vault.distance - (vault.to.z - vault.from.z)) < 1e-9);
  });

  QUnit.test("it takes a body that is going fast enough, and not one that is walking", (assert) => {
    assert.notStrictEqual(findVault(worldOf(LOW), runnerAt({ speed: OPTIONS.vaultSpeed }), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ speed: OPTIONS.vaultSpeed - 0.1 }), OPTIONS), null);
  });

  QUnit.test("the wall is low enough to get over, and more than a step", (assert) => {
    assert.notStrictEqual(findVault(worldOf(wallOf({ maxY: OPTIONS.vaultHeight })), runnerAt(), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(wallOf({ maxY: OPTIONS.vaultHeight + 0.1 })), runnerAt(), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(wallOf({ maxY: OPTIONS.stepHeight })), runnerAt(), OPTIONS), null);
  });

  QUnit.test("the height is from the feet: a runner on a step vaults a wall that is the same height above the step", (assert) => {
    const world = worldOf({ minX: -5, maxX: 5, minY: 0, maxY: 3, minZ: -9, maxZ: 5 }, wallOf({ minY: 3, maxY: 3.9 }));
    assert.notStrictEqual(findVault(world, runnerAt({ y: 3 }), OPTIONS), null);
  });

  QUnit.test("the wall is thin enough to get across", (assert) => {
    assert.notStrictEqual(findVault(worldOf(wallOf({ maxZ: OPTIONS.vaultDepth })), runnerAt(), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(wallOf({ maxZ: OPTIONS.vaultDepth + 0.1 })), runnerAt(), OPTIONS), null);
  });

  QUnit.test("the wall is near: within the reach of the vault, edge to wall, and not further", (assert) => {
    assert.notStrictEqual(findVault(worldOf(LOW), runnerAt({ z: -OPTIONS.radius - OPTIONS.vaultReach + 0.01 }), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ z: -OPTIONS.radius - OPTIONS.vaultReach - 0.1 }), OPTIONS), null);
  });

  QUnit.test("the wall is ahead: a runner going away from it, or along it, does not vault it", (assert) => {
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ heading: Math.PI }), OPTIONS), null);
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ heading: Math.PI / 2 }), OPTIONS), null);
  });

  QUnit.test("a runner is not taken over a wall that is beside them: the line it is going along has to cross it", (assert) => {
    assert.strictEqual(findVault(worldOf(LOW), runnerAt({ x: 6 }), OPTIONS), null);
  });

  QUnit.test("something that is above the head, or starts above the feet, is not a wall to vault", (assert) => {
    assert.strictEqual(findVault(worldOf(wallOf({ minY: OPTIONS.stepHeight, maxY: 1 })), runnerAt(), OPTIONS), null);
  });

  QUnit.test("there is a place to land: not a drop, not a wall right behind it", (assert) => {
    const drop = new World({ boxes: [LOW], ground: (x, z) => (z > 1 ? -3 : 0) });
    assert.strictEqual(findVault(drop, runnerAt(), OPTIONS), null);
    const behind = worldOf(LOW, { minX: -5, maxX: 5, minY: 0, maxY: 5, minZ: 0.8, maxZ: 3 });
    assert.strictEqual(findVault(behind, runnerAt(), OPTIONS), null);
  });

  QUnit.test("the place to land can be a step up or down, and not more", (assert) => {
    const up = worldOf(LOW, { minX: -5, maxX: 5, minY: 0, maxY: OPTIONS.stepHeight, minZ: 1, maxZ: 5 });
    assert.strictEqual(findVault(up, runnerAt(), OPTIONS).to.y, OPTIONS.stepHeight);
    const high = worldOf(LOW, { minX: -5, maxX: 5, minY: 0, maxY: OPTIONS.stepHeight + 0.2, minZ: 1, maxZ: 5 });
    assert.strictEqual(findVault(high, runnerAt(), OPTIONS), null);
  });

  QUnit.test("a runner vaults the wall it is at, of two", (assert) => {
    const world = worldOf(LOW, wallOf({ minZ: 3, maxZ: 3.4, maxY: 1.1 }));
    assert.strictEqual(findVault(world, runnerAt(), OPTIONS).top, 0.9);
    assert.strictEqual(findVault(world, runnerAt({ z: 3 - OPTIONS.radius - 0.3 }), OPTIONS).top, 1.1);
  });
});

QUnit.module("findMantle", () => {
  const OPTIONS = { ...SCOUT, ...BODY };
  // A crate to mantle: 1.5 high, its south side on the plane z = 0.
  const CRATE = { name: "crate", minX: 0, maxX: 4, minY: 0, maxY: 1.5, minZ: 0, maxZ: 1.5 };
  const worldOf = (...boxes) => new World({ boxes });
  const bodyAt = (changes = {}) => ({ x: 2, y: 0, z: -OPTIONS.radius - 0.05, heading: 0, ...changes });
  const mantle = (box, body = bodyAt(), world = worldOf(box)) => findMantle(ledgesOf([box]), body, world, OPTIONS);

  QUnit.test("a body at a crate that is too high to step onto, and in reach of the hands, mantles it", (assert) => {
    const found = mantle(CRATE);
    assert.strictEqual(found.ledge.y, 1.5);
    assert.strictEqual(found.ledge.nz, -1);
  });

  QUnit.test("it is not too low (a step) and not too high (past the reach of the hands from the ground)", (assert) => {
    assert.notStrictEqual(mantle({ ...CRATE, maxY: OPTIONS.mantleHeight }), null);
    assert.strictEqual(mantle({ ...CRATE, maxY: OPTIONS.mantleHeight + 0.1 }), null);
    assert.strictEqual(mantle({ ...CRATE, maxY: OPTIONS.stepHeight - 0.05 }), null);
    assert.notStrictEqual(mantle({ ...CRATE, maxY: OPTIONS.stepHeight + 0.1 }), null);
  });

  QUnit.test("the body is near the wall, facing it, and beside it, as for any ledge", (assert) => {
    assert.strictEqual(mantle(CRATE, bodyAt({ z: -OPTIONS.radius - OPTIONS.grabDistance - 0.1 })), null);
    assert.strictEqual(mantle(CRATE, bodyAt({ heading: Math.PI })), null);
    assert.strictEqual(mantle(CRATE, bodyAt({ x: 5 })), null);
  });

  QUnit.test("there is room to stand on top, or it is not mantled", (assert) => {
    const world = worldOf(CRATE, { minX: 0, maxX: 4, minY: 2, maxY: 3, minZ: 0, maxZ: 1.5 });
    assert.strictEqual(mantle(CRATE, bodyAt(), world), null);
  });

  QUnit.test("it does not need room to hang: a crate that is too low to hang from, with the feet in the ground, can be mantled", (assert) => {
    const ledge = ledgesOf([CRATE])[1];
    assert.false(canHang(worldOf(CRATE), ledge, 2, OPTIONS));
    assert.notStrictEqual(mantle(CRATE), null);
  });

  QUnit.test("a ledge too low to hang from is not caught in the air either", (assert) => {
    const body = bodyAt({ y: 0.6 });
    assert.strictEqual(findLedge(ledgesOf([CRATE]), body, worldOf(CRATE), OPTIONS), null);
  });
});

QUnit.module("findWall", () => {
  const OPTIONS = { ...SCOUT, ...BODY };
  // A wall to kick off: 4 high, its south side on the plane z = 0.
  const WALL = { name: "wall", minX: 0, maxX: 10, minY: 0, maxY: 4, minZ: 0, maxZ: 1 };
  const worldOf = (...boxes) => new World({ boxes });
  // A body in the air, a metre and a half up, facing the wall, a little from it.
  const bodyAt = (changes = {}) => ({ x: 5, y: 1.5, z: -OPTIONS.radius - 0.1, heading: 0, ...changes });
  // The way out of what is found, without the wall itself.
  const way = (found) => found && { nx: found.nx, nz: found.nz };

  QUnit.test("a body beside a wall it faces has the way out from it", (assert) => {
    assert.deepEqual(way(findWall(worldOf(WALL), bodyAt(), OPTIONS)), { nx: 0, nz: -1 });
  });

  QUnit.test("the way out is from the face the body is at: the side of a wall is a wall too", (assert) => {
    const found = findWall(worldOf(WALL), bodyAt({ x: 10 + OPTIONS.radius + 0.1, z: 0.5, heading: -Math.PI / 2 }), OPTIONS);
    assert.deepEqual(way(found), { nx: 1, nz: 0 });
  });

  QUnit.test("it is near: within reach, edge to wall, and not further", (assert) => {
    assert.notStrictEqual(findWall(worldOf(WALL), bodyAt({ z: -OPTIONS.radius - OPTIONS.wallReach + 0.01 }), OPTIONS), null);
    assert.strictEqual(findWall(worldOf(WALL), bodyAt({ z: -OPTIONS.radius - OPTIONS.wallReach - 0.05 }), OPTIONS), null);
  });

  QUnit.test("it is faced, to within the angle of a grab", (assert) => {
    assert.notStrictEqual(findWall(worldOf(WALL), bodyAt({ heading: OPTIONS.grabAngle - 0.1 }), OPTIONS), null);
    assert.strictEqual(findWall(worldOf(WALL), bodyAt({ heading: OPTIONS.grabAngle + 0.1 }), OPTIONS), null);
    assert.strictEqual(findWall(worldOf(WALL), bodyAt({ heading: Math.PI }), OPTIONS), null);
  });

  QUnit.test("it reaches high enough above the feet to push off", (assert) => {
    assert.notStrictEqual(findWall(worldOf({ ...WALL, maxY: 1.5 + OPTIONS.wallMinHeight }), bodyAt(), OPTIONS), null);
    assert.strictEqual(findWall(worldOf({ ...WALL, maxY: 1.5 + OPTIONS.wallMinHeight - 0.1 }), bodyAt(), OPTIONS), null);
  });

  QUnit.test("a wall that is only a step is not a wall, and a wall that is all over the head is not one to push off", (assert) => {
    assert.strictEqual(findWall(worldOf({ ...WALL, maxY: 1.5 + OPTIONS.stepHeight }), bodyAt(), OPTIONS), null);
    assert.strictEqual(findWall(worldOf({ ...WALL, minY: 5, maxY: 9 }), bodyAt(), OPTIONS), null);
  });

  QUnit.test("of two walls, the nearer", (assert) => {
    const other = { ...WALL, minZ: -3, maxZ: -2.5 };
    const found = findWall(worldOf(WALL, other), bodyAt({ z: -OPTIONS.radius - 0.05, heading: 0 }), OPTIONS);
    assert.deepEqual(way(found), { nx: 0, nz: -1 });
    assert.strictEqual(found.box, WALL);
  });

  QUnit.test("the wall to leave out is not looked at, and the next is", (assert) => {
    const other = { ...WALL, minZ: -3, maxZ: -2.5 };
    const body = bodyAt({ z: -OPTIONS.radius - 0.05 });
    assert.strictEqual(findWall(worldOf(WALL), body, OPTIONS, WALL), null);
    assert.strictEqual(findWall(worldOf(WALL, other), body, OPTIONS, WALL), null);
    assert.strictEqual(findWall(worldOf(WALL), body, OPTIONS, other).box, WALL);
  });

  QUnit.test("a body that is inside a box has no way out of it to give", (assert) => {
    assert.strictEqual(findWall(worldOf(WALL), bodyAt({ z: 0.5 }), OPTIONS), null);
  });
});

QUnit.module("assisted", () => {
  const OPTIONS = { ...SCOUT, ...BODY };
  const WALL = { name: "wall", minX: 0, maxX: 10, minY: 0, maxY: 3, minZ: 0, maxZ: 10 };
  const world = new World({ boxes: [WALL] });
  const ledges = ledgesOf([WALL]);
  const bodyAt = (changes = {}) => ({ x: 5, y: 1, z: -OPTIONS.radius - 0.05, heading: 0, ...changes });
  const caught = (body, options) => findLedge(ledges, body, world, options) !== null;

  QUnit.test("it allows a little more of each of the three things: reach, distance and angle", (assert) => {
    const more = assisted(OPTIONS);
    assert.strictEqual(more.handReach, OPTIONS.handReach + OPTIONS.assistReach);
    assert.strictEqual(more.grabDistance, OPTIONS.grabDistance + OPTIONS.assistDistance);
    assert.strictEqual(more.grabAngle, OPTIONS.grabAngle + OPTIONS.assistAngle);
  });

  QUnit.test("it does not change the numbers it is given, and keeps all the others", (assert) => {
    const before = { ...OPTIONS };
    const more = assisted(OPTIONS);
    assert.deepEqual(OPTIONS, before);
    assert.strictEqual(more.handLow, OPTIONS.handLow);
    assert.strictEqual(more.jumpSpeed, OPTIONS.jumpSpeed);
  });

  QUnit.test("a ledge a little too high is caught with help, and not without", (assert) => {
    const body = bodyAt({ y: 3 - OPTIONS.handReach - OPTIONS.assistReach / 2 });
    assert.false(caught(body, OPTIONS));
    assert.true(caught(body, assisted(OPTIONS)));
  });

  QUnit.test("so is one a little too far, or a little turned away", (assert) => {
    const far = bodyAt({ z: -OPTIONS.radius - OPTIONS.grabDistance - OPTIONS.assistDistance / 2 });
    assert.false(caught(far, OPTIONS));
    assert.true(caught(far, assisted(OPTIONS)));
    const turned = bodyAt({ heading: OPTIONS.grabAngle + OPTIONS.assistAngle / 2 });
    assert.false(caught(turned, OPTIONS));
    assert.true(caught(turned, assisted(OPTIONS)));
  });

  QUnit.test("help is a little: a ledge that is much too high, far or turned away is still out of reach", (assert) => {
    const high = bodyAt({ y: 3 - OPTIONS.handReach - OPTIONS.assistReach - 0.2 });
    assert.false(caught(high, assisted(OPTIONS)));
    assert.false(caught(bodyAt({ z: -OPTIONS.radius - OPTIONS.grabDistance - OPTIONS.assistDistance - 0.2 }), assisted(OPTIONS)));
    assert.false(caught(bodyAt({ heading: Math.PI }), assisted(OPTIONS)));
  });

  QUnit.test("with no help allowed, it is the same as none", (assert) => {
    const none = assisted({ ...OPTIONS, assistReach: 0, assistDistance: 0, assistAngle: 0 });
    assert.strictEqual(caught(bodyAt({ y: 3 - OPTIONS.handReach - 0.1 }), none), false);
  });
});
