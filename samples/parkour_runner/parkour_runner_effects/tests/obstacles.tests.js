// A runner, as far as hitting things goes: where he is and how tall he is.
const runnerAt = (x, y, z, bodyHeight = STANDING_HEIGHT, move = MOVES.run) => ({ x, y, z, bodyHeight, move });

QUnit.module("OBSTACLE_TYPES", () => {
  QUnit.test("every kind has a piece to draw, a size, and a range of heights that makes sense", (assert) => {
    for (const [kind, type] of Object.entries(OBSTACLE_TYPES)) {
      assert.true(type.pieces.length > 0, `${kind}: has a piece`);
      assert.true(type.halfWidth > 0 && type.depth > 0, `${kind}: has a size`);
      assert.true(type.top > type.bottom, `${kind}: its top is above its bottom`);
      assert.true(type.bottom >= 0, `${kind}: doesn't start underground`);
    }
  });

  QUnit.test("a barrier is low and sits on the ground, so a jump or vault gets over it", (assert) => {
    const { bottom, top } = OBSTACLE_TYPES.barrier;

    assert.strictEqual(bottom, 0);
    assert.true(top < STANDING_HEIGHT);
    assert.true(top < (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY), "lower than the top of a jump");
    assert.true(top < (VAULT_SPEED * VAULT_SPEED) / (2 * GRAVITY), "and lower than the top of a vault");
  });

  QUnit.test("an overhead bar is above the low runner and below the standing one, so only a slide goes under it", (assert) => {
    const { bottom } = OBSTACLE_TYPES.overhead;

    assert.true(bottom >= LOW_HEIGHT, "a slide or roll fits under it");
    assert.true(bottom < STANDING_HEIGHT, "standing doesn't");
    assert.true(bottom < VAULT_HEIGHT, "and neither does a vault");
  });

  QUnit.test("a container is taller than any jump gets, so only a lane change avoids it", (assert) => {
    const { top } = OBSTACLE_TYPES.container;

    assert.true(top > (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY));
  });

  QUnit.test("each obstacle fits in a lane, with room to change lanes beside it", (assert) => {
    for (const [kind, type] of Object.entries(OBSTACLE_TYPES)) assert.true(type.halfWidth * 2 <= LANE_WIDTH, kind);
  });

  QUnit.test("obstacles in neighboring lanes don't overlap, whatever the two kinds are", (assert) => {
    // Lanes are LANE_WIDTH apart, so two neighbors' half widths must add up to no more than that.
    for (const [a, typeA] of Object.entries(OBSTACLE_TYPES)) {
      for (const [b, typeB] of Object.entries(OBSTACLE_TYPES)) {
        assert.true(typeA.halfWidth + typeB.halfWidth <= LANE_WIDTH, `${a} next to ${b}`);
      }
    }
  });

  QUnit.test("OBSTACLE_PIECES lists every piece an obstacle can use, once each", (assert) => {
    for (const type of Object.values(OBSTACLE_TYPES)) {
      for (const piece of type.pieces) assert.true(OBSTACLE_PIECES.includes(piece), piece);
    }
    assert.strictEqual(new Set(OBSTACLE_PIECES).size, OBSTACLE_PIECES.length);
  });
});

QUnit.module("PATTERNS", () => {
  QUnit.test("every pattern has an obstacle for each of the three lanes, or an empty lane", (assert) => {
    for (const pattern of PATTERNS) {
      assert.strictEqual(pattern.length, 3);
      for (const kind of pattern) assert.true(kind === null || kind in OBSTACLE_TYPES, String(kind));
    }
  });

  QUnit.test("every pattern can be beaten: there is a lane that isn't a wall", (assert) => {
    for (const pattern of PATTERNS) assert.true(pattern.some((kind) => kind !== "container"), pattern.join(", "));
  });

  QUnit.test("no pattern is all empty", (assert) => {
    for (const pattern of PATTERNS) assert.true(pattern.some((kind) => kind !== null), pattern.join(", "));
  });

  QUnit.test("patterns use every kind of obstacle", (assert) => {
    const used = new Set(PATTERNS.flat());

    for (const kind of Object.keys(OBSTACLE_TYPES)) assert.true(used.has(kind), kind);
  });
});

QUnit.module("obstacleAt", () => {
  QUnit.test("puts the obstacle in the middle of its lane, at the distance it is given", (assert) => {
    const obstacle = obstacleAt("barrier", 1, 80, () => 0);

    assert.strictEqual(obstacle.x, laneX(1));
    assert.strictEqual(obstacle.z, 80);
  });

  QUnit.test("takes the size, heights, turn and scale from its kind", (assert) => {
    for (const [kind, type] of Object.entries(OBSTACLE_TYPES)) {
      const obstacle = obstacleAt(kind, 0, 0, () => 0);

      assert.strictEqual(obstacle.type, kind);
      assert.strictEqual(obstacle.halfWidth, type.halfWidth);
      assert.strictEqual(obstacle.depth, type.depth);
      assert.strictEqual(obstacle.bottom, type.bottom);
      assert.strictEqual(obstacle.top, type.top);
      assert.strictEqual(obstacle.rotationY, type.rotationY);
      assert.deepEqual(obstacle.scale, type.scale);
    }
  });

  QUnit.test("says where it ends along the street", (assert) => {
    const obstacle = obstacleAt("container", 0, 100, () => 0);

    assert.strictEqual(obstacle.endZ, 100 + OBSTACLE_TYPES.container.depth / 2);
  });

  QUnit.test("the random number picks which piece, for a kind with several", (assert) => {
    const pieces = OBSTACLE_TYPES.container.pieces;

    assert.strictEqual(obstacleAt("container", 0, 0, () => 0).piece, pieces[0]);
    assert.strictEqual(obstacleAt("container", 0, 0, () => 0.9999).piece, pieces[pieces.length - 1]);
  });

  QUnit.test("the lanes are on the left, in the middle and on the right", (assert) => {
    assert.true(obstacleAt("barrier", -1, 0, () => 0).x < 0);
    assert.strictEqual(obstacleAt("barrier", 0, 0, () => 0).x, 0);
    assert.true(obstacleAt("barrier", 1, 0, () => 0).x > 0);
  });
});

QUnit.module("hits", () => {
  const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 50 };
  const overhead = { ...OBSTACLE_TYPES.overhead, x: 0, z: 50 };
  const container = { ...OBSTACLE_TYPES.container, x: 0, z: 50 };

  QUnit.test("a standing runner running into a barrier hits it", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50), barrier));
  });

  QUnit.test("but not before he gets there, or after he is past it", (assert) => {
    assert.false(hits(runnerAt(0, 0, 40), barrier));
    assert.false(hits(runnerAt(0, 0, 60), barrier));
  });

  QUnit.test("a runner in another lane doesn't hit it", (assert) => {
    assert.false(hits(runnerAt(laneX(1), 0, 50), barrier));
    assert.false(hits(runnerAt(laneX(-1), 0, 50), barrier));
  });

  QUnit.test("half way between lanes, he still hits what is in the lane he is part way into", (assert) => {
    assert.true(hits(runnerAt(laneX(1) / 2, 0, 50), barrier));
  });

  QUnit.test("a jump high enough goes over a barrier, and one too low doesn't", (assert) => {
    assert.false(hits(runnerAt(0, barrier.top + 0.01, 50), barrier), "above the top");
    assert.true(hits(runnerAt(0, barrier.top - 0.1, 50), barrier), "just below the top");
  });

  QUnit.test("a runner is touching an overhead bar if his head would be in it", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50, STANDING_HEIGHT), overhead), "standing");
    assert.true(hits(runnerAt(0, 0, 50, VAULT_HEIGHT), overhead), "vaulting");
  });

  QUnit.test("a slide or a roll goes under an overhead bar", (assert) => {
    assert.false(hits(runnerAt(0, 0, 50, LOW_HEIGHT), overhead));
  });

  QUnit.test("a jump doesn't go over an overhead bar, because his head is in it on the way up", (assert) => {
    assert.true(hits(runnerAt(0, 0.8, 50, STANDING_HEIGHT), overhead));
  });

  QUnit.test("a container is hit by anything on the ground, and by a jump at its best", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50), container));
    assert.true(hits(runnerAt(0, 0, 50, LOW_HEIGHT), container));
    const bestJump = (JUMP_SPEED * JUMP_SPEED) / (2 * GRAVITY);
    assert.true(hits(runnerAt(0, bestJump, 50), container));
  });

  QUnit.test("a container is long: he is hit all the way along it", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50 - container.depth / 2), container));
    assert.true(hits(runnerAt(0, 0, 50 + container.depth / 2), container));
    assert.false(hits(runnerAt(0, 0, 50 + container.depth / 2 + 1), container));
  });

  QUnit.test("a vault can't be caught by a barrier, even low down", (assert) => {
    assert.false(hits(runnerAt(0, 0, 50, VAULT_HEIGHT, MOVES.vault), barrier));
  });

  QUnit.test("but a vault is no help against an overhead bar or a container", (assert) => {
    assert.true(hits(runnerAt(0, 0, 50, VAULT_HEIGHT, MOVES.vault), overhead));
    assert.true(hits(runnerAt(0, 0, 50, VAULT_HEIGHT, MOVES.vault), container));
  });

  QUnit.test("only the barrier can be vaulted", (assert) => {
    assert.true(OBSTACLE_TYPES.barrier.vaultable);
    assert.false(Boolean(OBSTACLE_TYPES.overhead.vaultable));
    assert.false(Boolean(OBSTACLE_TYPES.container.vaultable));
  });

  QUnit.test("a real Runner works as well as the stand-in", (assert) => {
    const runner = new Runner({ z: 50 });

    assert.true(hits(runner, barrier));
    runner.slide();
    assert.true(hits(runner, barrier), "sliding doesn't help against a barrier");
    assert.false(hits(runner, overhead), "but it does against an overhead bar");
  });
});

QUnit.module("vaulting over barriers", () => {
  QUnit.test("a vault gets over a barrier from anywhere in the vault range", (assert) => {
    for (const gap of [0.1, 1, 2, VAULT_RANGE - 0.1]) {
      const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 0 };
      // The gap is from the front of the runner to the front of the barrier.
      const runner = new Runner({ z: -(barrier.depth / 2) - gap - RUNNER_HALF_DEPTH });
      runner.vault();
      let hit = false;

      for (let i = 0; i < 120; i++) {
        runner.update(1 / 60);
        if (hits(runner, barrier)) hit = true;
      }

      assert.false(hit, `from ${gap} away`);
    }
  });

  QUnit.test("a vault is already over by the time the barrier is behind him", (assert) => {
    const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 0 };
    const gap = VAULT_RANGE;
    const runner = new Runner({ z: -(barrier.depth / 2) - gap - RUNNER_HALF_DEPTH });
    runner.vault();
    while (runner.move === MOVES.vault) runner.update(1 / 60);

    assert.true(runner.z > barrier.z + barrier.depth / 2 + RUNNER_HALF_DEPTH, "he has landed beyond it");
  });

  QUnit.test("a jump clears a barrier too", (assert) => {
    const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 0 };
    const runner = new Runner({ z: -2.15 }); // about 1.5 units from the barrier, a good time to jump
    runner.jump();
    let hit = false;

    for (let i = 0; i < 120; i++) {
      runner.update(1 / 60);
      if (hits(runner, barrier)) hit = true;
    }

    assert.false(hit);
  });

  QUnit.test("a jump that is too late, or too early, doesn't", (assert) => {
    const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 0 };
    for (const z of [-0.8, -5]) {
      const runner = new Runner({ z });
      runner.jump();
      let hit = false;

      for (let i = 0; i < 120; i++) {
        runner.update(1 / 60);
        if (hits(runner, barrier)) hit = true;
      }

      assert.true(hit, `jumping from z = ${z}`);
    }
  });

  QUnit.test("running straight into a barrier crashes", (assert) => {
    const barrier = { ...OBSTACLE_TYPES.barrier, x: 0, z: 10 };
    const runner = new Runner();
    let hit = false;

    for (let i = 0; i < 300 && !hit; i++) {
      runner.update(1 / 60);
      hit = hits(runner, barrier);
    }

    assert.true(hit);
  });

  QUnit.test("a slide goes under an overhead bar and out the other side", (assert) => {
    const overhead = { ...OBSTACLE_TYPES.overhead, x: 0, z: 6 };
    const runner = new Runner();
    runner.slide();
    let hit = false;

    for (let i = 0; i < 60; i++) {
      runner.update(1 / 60);
      if (hits(runner, overhead)) hit = true;
    }

    assert.false(hit);
    assert.true(runner.z > overhead.z + 1, "he went right through");
  });
});

QUnit.module("barrierGap", () => {
  const barrier = { ...OBSTACLE_TYPES.barrier, type: "barrier", x: 0, z: 20 };

  QUnit.test("is the distance from the front of the runner to the front of the barrier", (assert) => {
    // The barrier's near face is at 20 - 0.35 = 19.65 and the runner's front at 10 + 0.3.
    const gap = barrierGap(runnerAt(0, 0, 10), [barrier]);

    assert.true(Math.abs(gap - (20 - barrier.depth / 2 - (10 + RUNNER_HALF_DEPTH))) < 1e-9);
  });

  QUnit.test("gets smaller as the runner gets closer", (assert) => {
    assert.true(barrierGap(runnerAt(0, 0, 15), [barrier]) < barrierGap(runnerAt(0, 0, 5), [barrier]));
  });

  QUnit.test("is zero when the runner's front is just at the barrier", (assert) => {
    const z = barrier.z - barrier.depth / 2 - RUNNER_HALF_DEPTH;

    assert.true(Math.abs(barrierGap(runnerAt(0, 0, z), [barrier])) < 1e-9);
  });

  QUnit.test("is Infinity once the barrier has been passed", (assert) => {
    assert.strictEqual(barrierGap(runnerAt(0, 0, 30), [barrier]), Infinity);
  });

  QUnit.test("is Infinity when the barrier is in another lane", (assert) => {
    assert.strictEqual(barrierGap(runnerAt(laneX(1), 0, 10), [barrier]), Infinity);
  });

  QUnit.test("only barriers count: an overhead bar or a container isn't something to vault", (assert) => {
    for (const kind of ["overhead", "container"]) {
      const other = { ...OBSTACLE_TYPES[kind], type: kind, x: 0, z: 20 };

      assert.strictEqual(barrierGap(runnerAt(0, 0, 10), [other]), Infinity, kind);
    }
  });

  QUnit.test("with several barriers, it is the nearest one ahead", (assert) => {
    const near = { ...barrier, z: 20 };
    const far = { ...barrier, z: 50 };

    const gap = barrierGap(runnerAt(0, 0, 10), [far, near]);

    assert.true(gap < 10);
  });

  QUnit.test("no obstacles, no gap", (assert) => {
    assert.strictEqual(barrierGap(runnerAt(0, 0, 0), []), Infinity);
  });

  QUnit.test("the vault range is inside the queue range, so there is a wait", (assert) => {
    assert.true(VAULT_RANGE < VAULT_QUEUE_RANGE);
  });

  QUnit.test("a vault started at the end of the queue range's wait still gets over a barrier", (assert) => {
    // The queued vault starts when the gap has shrunk to VAULT_RANGE.
    const barrier2 = { ...OBSTACLE_TYPES.barrier, type: "barrier", x: 0, z: 0 };
    const runner = new Runner({ z: -(barrier2.depth / 2) - VAULT_RANGE - RUNNER_HALF_DEPTH });
    assert.true(Math.abs(barrierGap(runner, [barrier2]) - VAULT_RANGE) < 1e-9);
    runner.vault();
    let hit = false;

    for (let i = 0; i < 120; i++) {
      runner.update(1 / 60);
      if (hits(runner, barrier2)) hit = true;
    }

    assert.false(hit);
  });
});

QUnit.module("ObstacleField", () => {
  const withoutId = ({ id, ...rest }) => rest;
  const byPosition = (a, b) => a.z - b.z || a.x - b.x;
  // The obstacles in a list of things the field made: everything but the coins.
  const solid = (list) => list.filter((o) => o.type !== "coin");

  // Runs a runner from z = 0 to `to`, `step` at a time, and returns every obstacle ever made.
  const runTo = (field, to, step) => {
    const everything = [];
    for (let z = 0; z <= to; z += step) everything.push(...field.update(z).added);
    return everything;
  };

  QUnit.test("nothing exists before the first update", (assert) => {
    assert.strictEqual(new ObstacleField().active.size, 0);
  });

  QUnit.test("the first obstacles are a good way from the start, so the runner has time to get going", (assert) => {
    const { added } = new ObstacleField().update(0);

    assert.true(solid(added).length > 0);
    assert.true(Math.min(...solid(added).map((o) => o.z)) >= FIRST_GROUP_Z);
  });

  QUnit.test("makes obstacles as far ahead as it is asked to", (assert) => {
    const { added } = new ObstacleField({ ahead: 200 }).update(0);

    assert.true(Math.max(...added.map((o) => o.z)) > 150);
    assert.true(Math.max(...added.map((o) => o.z)) < 200 + MAX_GAP);
  });

  QUnit.test("gives every obstacle its own id", (assert) => {
    const { added } = new ObstacleField().update(0);

    assert.strictEqual(new Set(added.map((o) => o.id)).size, added.length);
  });

  QUnit.test("a group is one pattern: everything in it is at the same distance", (assert) => {
    const added = solid(new ObstacleField().update(0).added);
    const first = added.filter((o) => o.z === added[0].z);

    const kinds = [-1, 0, 1].map((lane) => {
      const found = first.find((o) => o.x === laneX(lane));
      return found ? found.type : null;
    });
    assert.true(PATTERNS.some((p) => p.join() === kinds.join()), kinds.join(", "));
  });

  QUnit.test("groups are spaced between MIN_GAP and MAX_GAP apart", (assert) => {
    const everything = solid(runTo(new ObstacleField(), 600, 5));
    const starts = [...new Set(everything.map((o) => o.z))].sort((a, b) => a - b);

    assert.true(starts.length > 10);
    for (let i = 1; i < starts.length; i++) {
      const gap = starts[i] - starts[i - 1];
      assert.true(gap >= MIN_GAP - 1e-9 && gap <= MAX_GAP + 1e-9, `${gap}`);
    }
  });

  QUnit.test("updating again at the same place changes nothing", (assert) => {
    const field = new ObstacleField();
    field.update(50);

    const { added, removed } = field.update(50);

    assert.strictEqual(added.length, 0);
    assert.strictEqual(removed.length, 0);
  });

  QUnit.test("obstacles that are behind the runner are dropped, and only those", (assert) => {
    const field = new ObstacleField({ behind: 20 });
    field.update(0);

    const { removed } = field.update(400);

    assert.true(removed.length > 0);
    for (const o of removed) assert.true(o.endZ < 380, `${o.endZ}`);
    for (const o of field.active.values()) assert.true(o.endZ >= 380);
  });

  QUnit.test("the same seed gives the same obstacles, however the updates are spaced out", (assert) => {
    const fine = runTo(new ObstacleField({ seed: 5 }), 400, 1).map(withoutId).sort(byPosition);
    const coarse = runTo(new ObstacleField({ seed: 5 }), 400, 40).map(withoutId).sort(byPosition);

    assert.deepEqual(fine, coarse);
  });

  QUnit.test("a different seed gives different obstacles", (assert) => {
    const a = runTo(new ObstacleField({ seed: 1 }), 300, 10).map((o) => o.type + o.x);
    const b = runTo(new ObstacleField({ seed: 2 }), 300, 10).map((o) => o.type + o.x);

    assert.notDeepEqual(a, b);
  });

  QUnit.test("only a bounded number exist at once, however far the runner goes", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    let most = 0;

    for (let z = 0; z <= 20000; z += 5) {
      field.update(z);
      most = Math.max(most, field.active.size);
    }

    assert.true(most < 90, `${most} at most`);
  });

  QUnit.test("hit() finds the obstacle the runner is touching, or null", (assert) => {
    const field = new ObstacleField();
    const { added } = field.update(0);
    const target = solid(added)[0];

    assert.strictEqual(field.hit(runnerAt(target.x, 0, target.z)), field.active.get(target.id), "on it");
    assert.strictEqual(field.hit(runnerAt(target.x, 0, 0)), null, "back at the start, nothing near");
  });

  QUnit.test("barrierGap() sees a barrier made by the field", (assert) => {
    const field = new ObstacleField({ ahead: 1000 });
    field.update(0);
    const barrier = [...field.active.values()].find((o) => o.type === "barrier");

    assert.true(field.barrierGap(runnerAt(barrier.x, 0, barrier.z - 2.5)) < VAULT_RANGE + 0.5);
    assert.true(field.barrierGap(runnerAt(barrier.x, 0, 0)) > VAULT_QUEUE_RANGE);
  });

  QUnit.test("reset() takes every obstacle away and returns them", (assert) => {
    const field = new ObstacleField();
    const { added } = field.update(0);

    const removed = field.reset();

    assert.strictEqual(removed.length, added.length);
    assert.strictEqual(field.active.size, 0);
  });

  QUnit.test("after reset() the next update makes the very same obstacles again", (assert) => {
    const field = new ObstacleField({ seed: 9 });
    const first = field.update(0).added;
    field.update(300);

    field.reset();

    assert.deepEqual(field.update(0).added, first, "same obstacles, same ids");
  });

  QUnit.test("every obstacle in a long run can be beaten: no group is a solid wall", (assert) => {
    const everything = runTo(new ObstacleField({ seed: 3 }), 3000, 10);
    const groups = new Map();
    for (const o of everything) groups.set(o.z, [...(groups.get(o.z) || []), o]);

    for (const [z, group] of groups) {
      const walls = group.filter((o) => o.type === "container").length;
      assert.true(walls < 3, `the group at ${z.toFixed(0)}`);
    }
  });
});

QUnit.module("coinAt", () => {
  QUnit.test("puts a coin in the middle of its lane, at the distance it is given, at chest height", (assert) => {
    const coin = coinAt(-1, 70);

    assert.strictEqual(coin.type, "coin");
    assert.strictEqual(coin.x, laneX(-1));
    assert.strictEqual(coin.z, 70);
    assert.strictEqual(coin.y, COIN_HEIGHT);
  });

  QUnit.test("is made from the coin model, shrunk to fit", (assert) => {
    const coin = coinAt(0, 0);

    assert.strictEqual(coin.piece, COIN_PIECE);
    assert.true(coin.scale.x < 0.1, "the model is huge at the world's scale");
    assert.strictEqual(coin.scale.x, coin.scale.y);
    assert.strictEqual(coin.scale.x, coin.scale.z);
  });

  QUnit.test("has a box the runner can touch, with a bottom below its top", (assert) => {
    const coin = coinAt(0, 0);

    assert.true(coin.halfWidth > 0 && coin.depth > 0);
    assert.true(coin.top > coin.bottom);
    assert.strictEqual(coin.bottom, COIN_HEIGHT);
  });

  QUnit.test("says where it ends along the street", (assert) => {
    const coin = coinAt(0, 40);

    assert.true(coin.endZ > 40 && coin.endZ < 41);
  });

  QUnit.test("a standing or jumping runner touches it, a sliding or rolling one goes under it", (assert) => {
    const coin = coinAt(0, 30);

    assert.true(hits(runnerAt(0, 0, 30, STANDING_HEIGHT), coin), "standing");
    assert.true(hits(runnerAt(0, 0.5, 30, STANDING_HEIGHT), coin), "jumping");
    assert.false(hits(runnerAt(0, 0, 30, LOW_HEIGHT), coin), "sliding goes under");
  });

  QUnit.test("a runner in another lane doesn't touch it", (assert) => {
    assert.false(hits(runnerAt(laneX(1), 0, 30), coinAt(-1, 30)));
  });

  QUnit.test("OBSTACLE_PIECES includes the coin, so it is loaded with the rest", (assert) => {
    assert.true(OBSTACLE_PIECES.includes(COIN_PIECE));
    assert.strictEqual(new Set(OBSTACLE_PIECES).size, OBSTACLE_PIECES.length);
  });
});

QUnit.module("coins in the field", () => {
  const coinsOf = (field, to = 600, step = 5) => {
    const everything = [];
    for (let z = 0; z <= to; z += step) everything.push(...field.update(z).added);
    return everything.filter((o) => o.type === "coin");
  };

  QUnit.test("the field makes coins as well as obstacles", (assert) => {
    assert.true(coinsOf(new ObstacleField()).length > 20);
  });

  QUnit.test("coins come in trails: a line of them in one lane, COIN_SPACING apart", (assert) => {
    const coins = coinsOf(new ObstacleField(), 100, 5);
    const first = coins.filter((c) => c.x === coins[0].x && c.z < 50);

    assert.true(first.length >= 3);
    for (let i = 1; i < first.length; i++) assert.true(Math.abs(first[i].z - first[i - 1].z - COIN_SPACING) < 1e-9);
  });

  QUnit.test("a trail is never longer than MAX_TRAIL", (assert) => {
    const field = new ObstacleField({ firstZ: 400 }); // a long, empty gap at the start
    const coins = coinsOf(field, 450, 5).filter((c) => c.z < 400);

    assert.strictEqual(coins.length, MAX_TRAIL);
  });

  QUnit.test("coins are well clear of the obstacles: nothing on the street is both", (assert) => {
    const everything = [];
    const field = new ObstacleField({ seed: 4 });
    for (let z = 0; z <= 1500; z += 10) everything.push(...field.update(z).added);
    const coins = everything.filter((o) => o.type === "coin");
    const solids = everything.filter((o) => o.type !== "coin");

    // One assertion for the whole street: checking every pair with its own would be
    // thousands of assertions, and a page of them is slow to draw.
    const tooClose = [];
    for (const coin of coins) {
      for (const solid of solids) {
        const apart = Math.abs(coin.z - solid.z) - solid.depth / 2;
        if (apart <= COIN_MARGIN - 4) tooClose.push(`a coin at ${coin.z} and a ${solid.type} at ${solid.z}`);
      }
    }

    assert.true(coins.length > 50);
    assert.deepEqual(tooClose, []);
  });

  QUnit.test("coins have ids of their own, like everything the field makes", (assert) => {
    const field = new ObstacleField();
    const added = field.update(0).added;

    assert.strictEqual(new Set(added.map((o) => o.id)).size, added.length);
  });

  QUnit.test("the same seed gives the same coins", (assert) => {
    const a = coinsOf(new ObstacleField({ seed: 6 })).map(({ id, ...rest }) => rest);
    const b = coinsOf(new ObstacleField({ seed: 6 })).map(({ id, ...rest }) => rest);

    assert.deepEqual(a, b);
  });

  QUnit.test("coins aren't obstacles: hit() ignores them", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const coin = [...field.active.values()].find((o) => o.type === "coin");

    assert.strictEqual(field.hit(runnerAt(coin.x, 0, coin.z)), null);
  });

  QUnit.test("collect() picks up the coins the runner is touching, and takes them out of the field", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const coin = [...field.active.values()].find((o) => o.type === "coin");

    const collected = field.collect(runnerAt(coin.x, 0, coin.z));

    assert.true(collected.some((c) => c.id === coin.id));
    assert.false(field.active.has(coin.id), "gone from the field");
  });

  QUnit.test("collect() with the runner nowhere near picks up nothing", (assert) => {
    const field = new ObstacleField();
    field.update(0);

    assert.deepEqual(field.collect(runnerAt(laneX(1), 0, -20)), []);
  });

  QUnit.test("a coin can only be picked up once", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const coin = [...field.active.values()].find((o) => o.type === "coin");
    const runner = runnerAt(coin.x, 0, coin.z);

    field.collect(runner);

    assert.deepEqual(field.collect(runner).filter((c) => c.id === coin.id), []);
  });

  QUnit.test("collect() doesn't pick up obstacles", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const barrier = [...field.active.values()].find((o) => o.type !== "coin");

    assert.deepEqual(field.collect(runnerAt(barrier.x, 0, barrier.z)).filter((c) => c.type !== "coin"), []);
  });

  QUnit.test("a coin the runner didn't pick up is dropped once it is far behind", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    const ids = [...field.active.values()].filter((o) => o.type === "coin").map((o) => o.id);

    const { removed } = field.update(400);

    for (const id of ids) assert.true(removed.some((o) => o.id === id), "coin " + id);
  });
});

QUnit.module("track and passed", () => {
  // A field with one group of obstacles at a known place: a barrier, an overhead bar and a container.
  const makeField = () => {
    const field = new ObstacleField();
    const barrier = field._add({ ...obstacleAt("barrier", -1, 40, () => 0) });
    const overhead = field._add({ ...obstacleAt("overhead", 0, 40, () => 0) });
    const container = field._add({ ...obstacleAt("container", 1, 40, () => 0) });
    return { field, barrier, overhead, container };
  };

  // Runs a runner along the street past z = 40 doing `move` while he is over the obstacles.
  const pass = (field, x, move) => {
    const cleaned = [];
    for (let z = 30; z <= 55; z += 0.25) {
      const over = z > 36 && z < 44;
      field.track(runnerAt(x, 0, z, STANDING_HEIGHT, over ? move : MOVES.run));
      cleaned.push(...field.passed(runnerAt(x, 0, z)));
    }
    return cleaned;
  };

  QUnit.test("a jump over a barrier is a clean move", (assert) => {
    const { field, barrier } = makeField();

    assert.deepEqual(pass(field, laneX(-1), MOVES.jump).map((o) => o.id), [barrier.id]);
  });

  QUnit.test("so is a vault", (assert) => {
    const { field, barrier } = makeField();

    assert.deepEqual(pass(field, laneX(-1), MOVES.vault).map((o) => o.id), [barrier.id]);
  });

  QUnit.test("a slide under an overhead bar is a clean move, and so is a roll", (assert) => {
    for (const move of [MOVES.slide, MOVES.roll]) {
      const { field, overhead } = makeField();

      assert.deepEqual(pass(field, laneX(0), move).map((o) => o.id), [overhead.id], move);
    }
  });

  QUnit.test("a slide under a barrier isn't the right move for it, so it isn't clean", (assert) => {
    const { field } = makeField();

    assert.deepEqual(pass(field, laneX(-1), MOVES.slide), []);
  });

  QUnit.test("just running through the place isn't clean either", (assert) => {
    const { field } = makeField();

    assert.deepEqual(pass(field, laneX(-1), MOVES.run), []);
  });

  QUnit.test("nothing is clean for a runner who was never in its lane", (assert) => {
    const { field } = makeField();

    // Running down a lane with nothing in it, while pressing every move, earns nothing.
    assert.deepEqual(pass(field, laneX(-1) - 3.5, MOVES.jump), []);
  });

  QUnit.test("a container is never a clean move: the only way past it is another lane", (assert) => {
    const { field } = makeField();

    assert.deepEqual(pass(field, laneX(1), MOVES.jump), []);
  });

  QUnit.test("an obstacle is counted once, even if passed() is asked again", (assert) => {
    const { field } = makeField();
    pass(field, laneX(-1), MOVES.jump);

    assert.deepEqual(field.passed(runnerAt(laneX(-1), 0, 200)), []);
  });

  QUnit.test("passed() says nothing until the obstacle is behind the runner", (assert) => {
    const { field } = makeField();
    for (let z = 36; z <= 40; z += 0.25) field.track(runnerAt(laneX(-1), 0, z, STANDING_HEIGHT, MOVES.jump));

    assert.deepEqual(field.passed(runnerAt(laneX(-1), 0, 40)), [], "still over it");
  });

  QUnit.test("reset() forgets what was tracked and counted", (assert) => {
    const field = new ObstacleField();
    field.touched.set(1, new Set(["jump"]));
    field.counted.add(1);

    field.reset();

    assert.strictEqual(field.touched.size, 0);
    assert.strictEqual(field.counted.size, 0);
  });

  QUnit.test("the tracking of an obstacle that is dropped is dropped too, so the maps stay small", (assert) => {
    const field = new ObstacleField();
    field.update(0);
    for (const o of field.active.values()) field.touched.set(o.id, new Set(["jump"]));
    for (const o of field.active.values()) field.counted.add(o.id);

    field.update(1000);

    assert.true(field.touched.size <= field.active.size);
    assert.true(field.counted.size <= field.active.size);
  });
});

QUnit.module("gapScale", () => {
  // The distance at which the runner first reaches a given speed.
  const distanceAt = (speed) => (speed - RUN_SPEED) / SPEED_RAMP;

  QUnit.test("the gaps are as they were until the runner reaches DENSE_SPEED", (assert) => {
    assert.strictEqual(gapScale(0), 1);
    assert.strictEqual(gapScale(distanceAt(DENSE_SPEED) - 1), 1);
  });

  QUnit.test("then they shrink as he speeds up", (assert) => {
    assert.true(gapScale(distanceAt(DENSE_SPEED) + 100) < 1);
    assert.true(gapScale(distanceAt(DENSE_SPEED) + 200) < gapScale(distanceAt(DENSE_SPEED) + 100));
  });

  QUnit.test("and at top speed they are DENSE_GAP_SCALE of what they were, and no less", (assert) => {
    assert.true(Math.abs(gapScale(distanceAt(MAX_SPEED)) - DENSE_GAP_SCALE) < 1e-9);
    assert.strictEqual(gapScale(1e6), DENSE_GAP_SCALE);
  });

  QUnit.test("a field makes its groups closer together far down the street", (assert) => {
    const firstZ = distanceAt(MAX_SPEED) + 50;
    const field = new ObstacleField({ firstZ });
    const starts = new Set();
    for (let z = firstZ; z <= firstZ + 600; z += 5) {
      for (const o of field.update(z).added) if (o.type !== "coin") starts.add(o.z);
    }
    const sorted = [...starts].sort((a, b) => a - b);

    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      assert.true(gap >= MIN_GAP * DENSE_GAP_SCALE - 1e-9 && gap <= MAX_GAP * DENSE_GAP_SCALE + 1e-9, `${gap}`);
    }
  });
});
