// Is the game fair? A game of waves can be set so that it cannot be won, or so that it can't be lost, and neither is a
// game. These tests play it, with no models and no screen: the real waves, walkers, brains, and numbers of the
// tables, against towers bought by a rule that is a sensible player's. If a number in a table is changed, they say
// whether the game is still a game.
QUnit.module("is the game fair?", () => {
  // An enemy with everything that a tower and the rules ask of one, and no model.
  class Foe {
    constructor(kind, route, scale) {
      const spec = ENEMIES[kind];
      this.kind = kind;
      this.health = spec.health * scale;
      this.reward = spec.reward;
      this.leak = spec.leak;
      this.state = "walking";
      this.walker = new Walker(route, spec.speed);
      this.sync();
    }

    sync() {
      const { x, z } = this.walker.position();
      this.x = x;
      this.z = z;
    }

    update(dt) {
      if (this.state !== "walking") return;
      this.walker.update(dt);
      this.sync();
    }

    get progress() {
      return this.walker.progress;
    }

    get done() {
      return this.walker.done;
    }

    get alive() {
      return this.state === "walking";
    }

    get dead() {
      return this.state === "dying";
    }

    hurt(amount) {
      if (!this.alive) return false;
      this.health -= amount;
      if (this.health > 0) return false;
      this.state = "dying";
      return true;
    }
  }

  // Fights one wave: `defense` is a list of { kind, col, row, level }, and a tower with no level is at the first. It gives back
  // the lives lost and the gold earned.
  const fight = (route, defense, waveIndex) => {
    const dt = 0.05;
    const brains = defense.map(({ kind, col, row, level = 1 }) => new TowerBrain(statsFor(BENDERS[kind], level), cellCenter(col, row)));
    const spawner = new Spawner(WAVES[waveIndex]);
    const scale = healthScaleFor(waveIndex);
    let foes = [];
    let shots = []; // bolts in the air: when they arrive, at whom, and how hard
    let time = 0;
    let lost = 0;
    let gold = 0;
    while (time < 600) {
      for (const kind of spawner.update(dt)) foes.push(new Foe(kind, route, scale));
      foes.forEach((foe) => foe.update(dt));
      for (const brain of brains) {
        for (const event of brain.update(dt, foes)) {
          if (event.type === "fire") shots.push({ at: time + distanceBetween(brain, event) / BOLT.speed, foe: event.enemy, damage: brain.spec.damage });
        }
      }
      shots = shots.filter((shot) => {
        if (shot.at > time) return true;
        if (shot.foe.hurt(shot.damage)) gold += shot.foe.reward;
        return false;
      });
      for (const foe of foes) {
        if (foe.alive && foe.done) {
          lost += foe.leak;
          foe.state = "gone";
        }
      }
      foes = foes.filter((foe) => foe.state === "walking");
      time += dt;
      if (spawner.finished && foes.length === 0) break;
    }
    return { lost, gold, time };
  };

  // How much of the road is within `range` of a place: a measure of how good a place for a tower is.
  const coverage = (route, at, range) => {
    let length = 0;
    for (let d = 0; d < route.total; d += 0.5) if (distanceBetween(at, pointAlong(route, d)) <= range) length += 0.5;
    return length;
  };

  // How much harm a tower does in a second to what walks along the road, if every bit of the road in its reach is walked
  // past: a measure of how good it is where it is, at a level.
  const power = (route, kind, at, level = 1) => {
    const stats = statsFor(BENDERS[kind], level);
    return (coverage(route, at, stats.range) * stats.damage * stats.attack.hits.length) / stats.cooldown;
  };

  // What a sensible player buys with `budget` gold, of the kinds of podium in `kinds`: again and again the podium and the
  // cell that give the most harm for the gold, or, if `upgrades` is true, the upgrade of a tower they have that does.
  const buy = (grid, route, budget, kinds = Object.keys(BENDERS), upgrades = false) => {
    const defense = [];
    let gold = budget;
    for (;;) {
      let best = null;
      for (const cell of buildableCells(grid, defense)) {
        const at = cellCenter(cell.col, cell.row);
        for (const kind of kinds) {
          const spec = BENDERS[kind];
          if (spec.cost > gold) continue;
          const score = power(route, kind, at) / spec.cost;
          if (!best || score > best.score) best = { kind, col: cell.col, row: cell.row, score };
        }
      }
      for (const tower of upgrades ? defense : []) {
        const cost = upgradeCost(BENDERS[tower.kind], tower.level);
        if (cost === null || cost > gold) continue;
        const at = cellCenter(tower.col, tower.row);
        const score = (power(route, tower.kind, at, tower.level + 1) - power(route, tower.kind, at, tower.level)) / cost;
        if (!best || score > best.score) best = { upgrade: tower, cost, score };
      }
      if (!best) return defense;
      if (best.upgrade) {
        best.upgrade.level++;
        gold -= best.cost;
      } else {
        defense.push({ kind: best.kind, col: best.col, row: best.row, level: 1 });
        gold -= BENDERS[best.kind].cost;
      }
    }
  };

  // The best that a simple plan does against a wave, with `budget` gold: the plans are to buy any kind, or only one kind of
  // podium, with upgrades or without, and the one that loses fewest lives is the one that counts, since a player will find one
  // that works.
  const bestPlan = (grid, route, budget, index) => {
    const plans = [Object.keys(BENDERS), ...Object.keys(BENDERS).map((kind) => [kind])];
    let best = null;
    for (const kinds of plans) {
      for (const upgrades of [false, true]) {
        const defense = buy(grid, route, budget, kinds, upgrades);
        const lost = fight(route, defense, index).lost;
        if (!best || lost < best.lost) best = { lost, defense, kinds };
      }
    }
    return best;
  };

  // The lives lost over a whole game by a player who spends the gold of each wave as one plan says, with every kind of podium.
  const livesLostWith = (grid, route, upgrades) => {
    let total = 0;
    for (let index = 0; index < WAVES.length; index++) total += fight(route, buy(grid, route, goldBefore(index), Object.keys(BENDERS), upgrades), index).lost;
    return total;
  };

  // The gold that a player who loses a few has by the time of a wave: the start, and what the waves before paid.
  const goldBefore = (index) => {
    let gold = ECONOMY.startGold;
    for (let j = 0; j < index; j++) gold += 0.85 * rewardOf(WAVES[j]) + RULES.bonus + 5 * j;
    return gold;
  };

  for (const map of MAPS) {
    const grid = parseMap(map);
    const route = routeFor(grid);

    QUnit.test(`${map.name}: with no towers the first wave goes right through, and every enemy costs its lives`, (assert) => {
      const result = fight(route, [], 0);
      const lives = WAVES[0].groups.reduce((sum, group) => sum + group.count * ENEMIES[group.kind].leak, 0);

      assert.strictEqual(result.lost, lives);
      assert.true(result.lost >= RULES.lives * 0.25, "which is a good part of the lives there are");
    });

    QUnit.test(`${map.name}: the gold at the start buys a defense that holds the first wave`, (assert) => {
      const defense = buy(grid, route, goldBefore(0));

      const lost = fight(route, defense, 0).lost;

      assert.true(defense.length >= 2, `${defense.length} towers`);
      assert.true(lost <= 1, `lost ${lost}`);
    });

    QUnit.test(`${map.name}: a defense bought with the gold a player has at each wave holds it, losing few lives in all`, (assert) => {
      let total = 0;
      const lines = [];
      for (let index = 0; index < WAVES.length; index++) {
        const { lost, kinds } = bestPlan(grid, route, goldBefore(index), index);
        total += lost;
        lines.push(`${lost} (${kinds.length === 1 ? kinds[0] : "mixed"})`);
      }

      assert.true(total <= RULES.lives * 0.4, `lives lost in each wave: ${lines.join(", ")}`);
    });

    QUnit.test(`${map.name}: but it is a fight: the defense that holds the first wave cannot hold the last`, (assert) => {
      const small = buy(grid, route, goldBefore(0));

      const lost = fight(route, small, WAVES.length - 1).lost;

      assert.true(lost >= RULES.lives, `lost ${lost} of ${RULES.lives}: the whole of the lives, and more`);
    });

    QUnit.test(`${map.name}: every tower has a use: one tower, anywhere that covers the road, harms what passes it`, (assert) => {
      for (const kind of Object.keys(BENDERS)) {
        const best = buy(grid, route, BENDERS[kind].cost).find((tower) => tower.kind === kind);
        if (!best) continue;
        const result = fight(route, [best], 0);

        assert.true(result.gold > 0, `${kind} defeated something in the first wave`);
      }
    });
  }

  QUnit.test("an upgrade is worth its gold: over all the waves, on both maps, a player who upgrades loses fewer lives than one who only buys podiums", (assert) => {
    let plain = 0;
    let upgraded = 0;
    for (const map of MAPS) {
      const grid = parseMap(map);
      const route = routeFor(grid);
      plain += livesLostWith(grid, route, false);
      upgraded += livesLostWith(grid, route, true);
    }

    assert.true(upgraded < plain, `${upgraded} lives lost with upgrades, and ${plain} without`);
  });

  QUnit.test("the simulation is the same every time", (assert) => {
    const grid = parseMap(MAPS[0]);
    const route = routeFor(grid);
    const defense = buy(grid, route, 500);

    assert.deepEqual(fight(route, defense, 3), fight(route, defense, 3));
  });
});
