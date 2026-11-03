QUnit.module("settle", () => {
  // An enemy, as the settling sees one: only what it asks.
  const enemy = (state = "walking", extra = {}) => ({
    state,
    reward: 8,
    leak: 1,
    done: false,
    finished: false,
    get alive() {
      return this.state === "walking";
    },
    get dead() {
      return this.state === "dying";
    },
    ...extra,
  });
  const world = (lives = 5) => ({ wallet: new Wallet(0), director: new Director([{ groups: [{ kind: "grunt", count: 1, gap: 1 }] }], { lives, firstWait: 1, pause: 1, bonus: 1 }) });

  QUnit.test("an enemy that is walking costs nothing and pays nothing", (assert) => {
    const { wallet, director } = world();
    const result = settle([enemy()], wallet, director);

    assert.deepEqual(result, { events: [], gone: [] });
    assert.strictEqual(wallet.gold, 0);
    assert.strictEqual(director.lives, 5);
  });

  QUnit.test("an enemy that has fallen is paid for", (assert) => {
    const { wallet, director } = world();
    settle([enemy("dying", { reward: 12 })], wallet, director);

    assert.strictEqual(wallet.gold, 12);
  });

  QUnit.test("and is paid for once, however many frames it lies there", (assert) => {
    const { wallet, director } = world();
    const fallen = enemy("dying", { reward: 12 });
    for (let i = 0; i < 50; i++) settle([fallen], wallet, director);

    assert.strictEqual(wallet.gold, 12);
    assert.true(fallen.paid);
  });

  QUnit.test("an enemy that has got to the end costs the lives it says, once", (assert) => {
    const { wallet, director } = world();
    const through = enemy("walking", { done: true, leak: 2, finished: true });
    for (let i = 0; i < 5; i++) settle([through], wallet, director);

    assert.strictEqual(director.lives, 3);
    assert.true(through.leaked);
  });

  QUnit.test("an enemy that has got to the end pays nothing", (assert) => {
    const { wallet, director } = world();
    settle([enemy("walking", { done: true, finished: true })], wallet, director);

    assert.strictEqual(wallet.gold, 0);
  });

  QUnit.test("losing the last life says that the game is lost", (assert) => {
    const { wallet, director } = world(1);
    const { events } = settle([enemy("walking", { done: true, finished: true })], wallet, director);

    assert.deepEqual(events, [{ type: "lost" }]);
  });

  QUnit.test("the enemies that are over are given back, to be taken away, and the others are not", (assert) => {
    const { wallet, director } = world();
    const over = enemy("dying", { finished: true });
    const walking = enemy();
    const falling = enemy("dying");
    const { gone } = settle([over, walking, falling], wallet, director);

    assert.deepEqual(gone, [over]);
  });

  QUnit.test("an enemy that fell on the very step it would have got to the end is paid for, and costs no lives", (assert) => {
    const { wallet, director } = world();
    settle([enemy("dying", { done: true, reward: 9 })], wallet, director);

    assert.strictEqual(wallet.gold, 9);
    assert.strictEqual(director.lives, 5);
  });

  QUnit.test("with several enemies, each is settled", (assert) => {
    const { wallet, director } = world(10);
    settle([enemy("dying", { reward: 5 }), enemy("dying", { reward: 7 }), enemy("walking", { done: true, leak: 3, finished: true })], wallet, director);

    assert.strictEqual(wallet.gold, 12);
    assert.strictEqual(director.lives, 7);
  });
});

QUnit.module("a whole game, with the real enemies, towers and bolts", (hooks) => {
  let engine, scene, loaded, benders, route, grid;
  hooks.before(async () => {
    engine = new BABYLON.NullEngine();
    scene = new BABYLON.Scene(engine);
    grid = parseMap(MAPS[0]);
    route = routeFor(grid);
    loaded = await loadEnemies(scene);
    benders = await loadBenders(scene);
  });
  hooks.after(() => {
    scene.dispose();
    engine.dispose();
  });

  // Two small waves of grunts, and short waits, so that a game is a minute of play.
  const waves = [{ groups: [{ kind: "grunt", count: 3, gap: 1 }] }, { groups: [{ kind: "grunt", count: 3, gap: 1 }] }];
  const rules = { lives: 4, firstWait: 1, pause: 1, bonus: 10 };

  // A world, like the page's, with `defense` ({ kind, col, row } for each) already built.
  const makeWorld = (defense, gold = 2000) => {
    const state = { grid, towers: [], wallet: new Wallet(gold) };
    for (const { kind, col, row } of defense) tryBuild(state, kind, col, row, (k, c, r) => new Tower(scene, benders, k, c, r, `game tower ${c},${r}`));
    const ended = [];
    let number = 0;
    const world = {
      director: new Director(waves, rules),
      wallet: state.wallet,
      towers: state.towers,
      enemies: [],
      bolts: [],
      spawn: (kind, healthScale) => new Enemy(scene, loaded, kind, route, `game enemy ${++number}`, healthScale),
      shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage, shot.effect, shot.potency, () => world.enemies),
      ended: (result) => ended.push(result),
    };
    return { world, ended, state };
  };
  const play = (world, seconds) => {
    for (let t = 0; t < seconds && !world.director.over; t += 0.05) advance(world, 0.05);
  };
  const defense = [
    { kind: "earth", col: 6, row: 2 },
    { kind: "earth", col: 8, row: 2 },
    { kind: "earth", col: 4, row: 4 },
  ];

  QUnit.test("with towers beside the road, the enemies are defeated, and paid for, and the game is won", (assert) => {
    const { world, ended } = makeWorld(defense, 1000);
    const gold = world.wallet.gold;
    play(world, 200);

    assert.deepEqual(ended, ["won"]);
    assert.strictEqual(world.director.phase, "won");
    assert.strictEqual(world.director.lives, rules.lives, "none got through");
    const reward = 6 * ENEMIES.grunt.reward;
    assert.true(world.wallet.gold >= gold + reward + 2 * rules.bonus, `${world.wallet.gold} from ${gold}`);
  });

  QUnit.test("when it is over, everything has been taken out of the scene: no enemy, no bolt, no animation left over", (assert) => {
    const { world } = makeWorld(defense, 1000);
    const groups = scene.animationGroups.length; // the towers' own
    play(world, 200);

    assert.strictEqual(world.enemies.length, 0);
    assert.strictEqual(world.bolts.length, 0);
    assert.strictEqual(scene.meshes.filter((mesh) => mesh.name === "bolt").length, 0);
    assert.strictEqual(scene.animationGroups.length, groups, "only the towers' own animations are left");
    world.towers.forEach((tower) => tower.dispose());
  });

  QUnit.test("with no towers, they all get through: the lives go, and the game is lost, once", (assert) => {
    const { world, ended } = makeWorld([]);
    play(world, 200);

    assert.deepEqual(ended, ["lost"]);
    assert.strictEqual(world.director.lives, 0);
    assert.strictEqual(world.director.phase, "lost");
    assert.strictEqual(world.wallet.gold, 2000 + rules.bonus, "no enemy was defeated, so the only gold is the bonus for living through the first wave");
  });

  QUnit.test("once the game is over, a frame does nothing at all", (assert) => {
    const { world } = makeWorld([]);
    play(world, 200);
    const enemies = world.enemies.slice();
    const positions = enemies.map((enemy) => enemy.walker.distance);
    advance(world, 0.05);
    advance(world, 5);

    assert.deepEqual(world.enemies, enemies);
    assert.deepEqual(world.enemies.map((enemy) => enemy.walker.distance), positions);
    world.enemies.forEach((enemy) => enemy.dispose());
  });

  QUnit.test("no tower, no bolt, no enemy is left holding the scene after a lost game either", (assert) => {
    const { world } = makeWorld([]);
    play(world, 200);
    world.enemies.forEach((enemy) => enemy.dispose());

    assert.strictEqual(world.bolts.length, 0);
  });

  QUnit.test("an enemy is paid for when it falls, and not when the bolt is thrown", (assert) => {
    const { world } = makeWorld([{ kind: "earth", col: 6, row: 2 }], BENDERS.earth.cost); // exactly enough for the tower, and none over
    let sawShotBeforePay = false;
    for (let t = 0; t < 200 && world.wallet.gold === 0; t += 0.05) {
      advance(world, 0.05);
      if (world.bolts.length > 0 && world.wallet.gold === 0) sawShotBeforePay = true;
    }

    assert.true(sawShotBeforePay, "a bolt was in the air before there was any gold");
    assert.true(world.wallet.gold >= ENEMIES.grunt.reward, `gold ${world.wallet.gold}`);
    world.towers.forEach((tower) => tower.dispose());
    world.enemies.forEach((enemy) => enemy.dispose());
    world.bolts.forEach((bolt) => bolt.dispose());
  });


  QUnit.test("every nation's effect gets to the enemies, through the whole of a game: the tower, the bolt, and the enemy", (assert) => {
    for (const [kind, spec] of Object.entries(BENDERS)) {
      const { world } = makeWorld([{ kind, col: 6, row: 2 }, { kind, col: 8, row: 2 }], 1000);
      const seen = new Set();
      for (let t = 0; t < 120 && !world.director.over; t += 0.05) {
        advance(world, 0.05);
        world.enemies.forEach((enemy) => enemy.status.kinds.forEach((effect) => seen.add(effect)));
      }

      assert.true(seen.has(spec.effect), `${kind}: ${[...seen].join(", ") || "no effect"}`);
      world.towers.forEach((tower) => tower.dispose());
      world.enemies.forEach((enemy) => enemy.dispose());
      world.bolts.forEach((bolt) => bolt.dispose());
    }
  });

  QUnit.test("a slow gets to a crowd: more than the enemy that was hit is slowed", (assert) => {
    const { world } = makeWorld([{ kind: "water", col: 6, row: 2 }], 1000);
    let most = 0;
    for (let t = 0; t < 120 && !world.director.over; t += 0.05) {
      advance(world, 0.05);
      most = Math.max(most, world.enemies.filter((enemy) => enemy.status.has("slow")).length);
    }

    assert.true(most >= 2, `at most ${most} slowed at once`);
    world.towers.forEach((tower) => tower.dispose());
    world.enemies.forEach((enemy) => enemy.dispose());
    world.bolts.forEach((bolt) => bolt.dispose());
  });

});
