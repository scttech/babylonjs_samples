// A frame of the game of waves: the director says what comes and what ends, the enemies walk, the fallen are paid for
// and the ones that got to the end cost lives, the towers look and shoot, and the bolts fly. Everything it needs is in one
// object that it is given (a `world`), and the models are made by functions in it, so that a test can play a whole wave
// with real enemies, towers and bolts and no screen, and the page plays the same frame. See ../tests/battle.tests.js.

// Settles the enemies: the gold for every one that has fallen, a life lost for every one that got to the end, and a list
// of the ones that are over and can be taken away. An enemy is paid for once (when it has fallen) and costs lives once (when it has got to the end),
// and the ones that are over are returned in `gone`. `events` is whatever the director said about the lives (the game
// being lost, for one).
function settle(enemies, wallet, director, stats = null, heard = null) {
  const events = [];
  const gone = [];
  for (const enemy of enemies) {
    if (enemy.dead && !enemy.paid) {
      enemy.paid = true;
      wallet.earn(enemy.reward);
      if (stats) stats.count("defeated");
      if (heard) heard("defeated");

    }
    if (enemy.alive && enemy.done && !enemy.leaked) {
      enemy.leaked = true;
      if (heard) heard("leaked");
      if (stats) stats.count("leaked");
      events.push(...director.leak(enemy.leak));
    }
    if (enemy.finished) gone.push(enemy);
  }
  return { events, gone };
}

// The most that there may be of anything at once, so that a game that is made (a wave of a hundred, by an editor) can't be a game that
// is too much for a phone. An enemy that comes on when the board is full waits, and comes on when there is room.
const LIMITS = {
  enemies: 40, // enemies on the board, which includes the ones that have fallen and are sinking away
};

// Lets `dt` seconds of the game go by. The world is { director, wallet, towers, enemies, bolts, spawn, shoot, ended }:
// `spawn(kind, healthScale)` makes an enemy, `shoot(shot)` makes a bolt from what a tower fired, and `ended("won" or "lost")`
// is told when the game is over. `enemies` and `bolts` are lists that are kept up to date here, and nothing at all
// happens once the game is over.
function advance(world, dt) {
  const heard = world.sound || (() => {}); // what the game hears, as it happens: `sound(name, detail)` of the world, if it has one
  const { director, wallet } = world;
  if (director.over) return;
  if (world.stats) world.stats.time += dt;

  // The director says what happens: a wave begins, an enemy comes on, a wave is beaten (and paid for), the game is won. An enemy
  // that has come on but has no room waits, and is not yet on the board, but it is not gone either: the wave is not beaten while one waits.
  if (!world.waiting) world.waiting = [];
  const alive = world.enemies.filter((enemy) => !enemy.finished).length + world.waiting.length;
  for (const event of director.update(dt, alive)) {
    if (event.type === "spawn") world.waiting.push(event);
    if (event.type === "cleared") wallet.earn(event.bonus);
    if (event.type === "won") world.ended("won");
  }

  while (world.waiting.length > 0 && world.enemies.length < LIMITS.enemies) {
    const next = world.waiting.shift();
    world.enemies.push(world.spawn(next.kind, next.healthScale));
  }

  // The enemies walk; the fallen are paid for, the ones that got to the end cost lives, and the ones that are over go.
  world.enemies.forEach((enemy) => {
    enemy.update(dt);
    enemy.showMarks();
  });
  const { events, gone } = settle(world.enemies, wallet, director, world.stats, heard);
  if (events.some((event) => event.type === "lost")) world.ended("lost");
  gone.forEach((enemy) => enemy.dispose());
  world.enemies = world.enemies.filter((enemy) => !gone.includes(enemy));

  // Every tower looks at the enemies, and each shot it fires is a bolt. The bolts fly until they arrive.
  for (const tower of world.towers) {
    for (const shot of tower.update(dt, world.enemies)) {
      world.bolts.push(world.shoot(shot));
      heard("shot", shot.effect);
    }
  }
  world.bolts.forEach((bolt) => bolt.update(dt));
  world.bolts = world.bolts.filter((bolt) => {
    if (!bolt.done) return true;
    bolt.dispose();
    return false;
  });
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { LIMITS, settle, advance };
} else {
  Object.assign(window, { LIMITS, settle, advance });
}
