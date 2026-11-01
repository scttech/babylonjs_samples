# Tutorial: Tower Defense Waves -- Something to Defend Against

This is the fifth tutorial in the Tower Defense series. The towers could shoot, and nothing they shot was hurt. Now the game is a **game**. Enemies have **health**, and when it runs out they **fall** with one of their two death animations, lie there, and sink into the island. They come in **waves**, from a table, each tougher than the last, and between the waves there is time to build. An enemy that gets to the end costs **lives**; an enemy that is defeated pays **gold**; beat the tenth wave and you win, and lose your lives and you lose. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Health and falling**: every enemy has health, a reward and a price in lives; when its health is gone it plays a death clip (at a speed that makes the fall last two seconds), lies there, and sinks into the ground
- **Waves** as a table, a **schedule** worked out from each wave (who comes at what second), and a **spawner** that is walked through it by time
- A **director**: the rules of the game as a state machine (getting ready, running, won, lost) that says what happened as events, and knows nothing of models or gold
- **Damage**: a bolt does harm when it gets there; each nation hits for a different amount; a fourth way for a tower to choose (the strongest)
- **A frame of the game** in one function, given a *world*, so that a test can play a whole game of real enemies, towers and bolts with no screen
- **Readouts**: lives, the wave and a countdown, a button to start the next wave early, and a banner for a win or a loss
- **A fairness test**: a simulation that plays the real waves against towers bought by a sensible rule, and says whether the game can be won, and whether it can be lost
- Unit tests for all of it: **563 passing tests**, 89 of them new

**What you'll learn:** a state machine that speaks in events (again, with a bigger one), how to turn a table of groups into a timeline, how to play an animation at a speed that makes it last a chosen time, how to tell the difference between *finished* and *dead* and *leaked*, why a frame of a game is best a function of an object that is given to it, how to test a whole game, how to *balance* with a simulation instead of by guessing, and what a good test message looks like when the thing that fails is a number.

**Before you start:** do the [Build tutorial](../tower_defense_build/TUTORIAL.md) first (or have its finished sample): this one builds on it.

## Where you're starting

This folder is a copy of the finished Build sample, plus placeholders for the new files and their tests:

```
tower_defense_waves/
├── index.html, tests.html   (already list the new scripts, the readouts and the stylesheet)
├── css/
│   ├── hud.css               (placeholder -- Step 6)
│   └── everything else, from the Build sample
├── js/
│   ├── waves.js              (placeholder -- Step 2)
│   ├── director.js           (placeholder -- Step 3)
│   ├── battle.js             (placeholder -- Step 5)
│   ├── hud.js                (placeholder -- Step 6)
│   ├── enemies.js            (changes -- Step 1)
│   ├── benders.js, bolts.js, tower.js, targeting.js, economy.js   (changes -- Step 4)
│   ├── main.js               (changes -- Step 8)
│   └── everything else, from the Build sample
└── tests/
    ├── waves.tests.js, director.tests.js, battle.tests.js, hud.tests.js, balance.tests.js   (placeholders)
    ├── enemies.tests.js, benders.tests.js, bolts.tests.js, tower.tests.js, targeting.tests.js, economy.tests.js   (additions)
    └── everything else, from the Build sample
```

Open `tests.html` before you change anything, through the web server. You should see **474 passing tests**, the Build sample's.

### What the page has been given

`index.html` has new things in it: the stylesheet `css/hud.css`, and four elements for the readouts, which you fill in with `hud.js` in Step 6:

```html
<div id="status"><span class="heart"></span><span id="lives">0</span><span id="wave"></span></div>
<button id="next-wave" type="button" hidden>Start wave</button>
<div id="banner" hidden>
  <h2 id="banner-title"></h2>
  <p id="banner-text"></p>
  <button id="again" type="button">Play again</button>
</div>
```

(`hidden` is the HTML attribute that hides an element, which the stylesheet makes certain of.) Both pages list every new script.

### Serving the page

Like the earlier samples, this one loads models from files, so it needs a web server. In the repo's root folder run `npx serve` and open `http://localhost:3000/samples/tower_defense/tower_defense_waves/` (the command prints the exact address), or use the *Live Server* extension in VS Code. `?map=1` is the second map.

### Starting over

`node reset-tutorial.js` in this folder puts it back to this starting point (it asks first), if you want to work through the steps again.

## The shape of the tutorial

1. **Health and falling**: an enemy that can be defeated.
2. **Waves**: a table, a schedule and a spawner.
3. **The director**: the rules.
4. **Hits**: damage, and a fourth way to choose.
5. **A frame of the game**: one function, and a game that is played in a test.
6. **The readouts.**
7. **Is it fair?**: a simulation.
8. **The game.**

---

## Step 1: Health and falling

An enemy so far is a model that walks. It needs to be able to be *hurt*, to *fall* when it can't take any more, to say when it is *over* (so it can be taken away), and to say what it is *worth* and what it *costs* if it gets through.

First, the table. Every enemy gets a **health**, a **reward** (gold, for defeating it) and a **leak** (lives, if it gets to the end), and there is a new table, `DEATH`, for how an enemy falls:

In `js/enemies.js`, **replace** lines 8 to 13:

```js
const ENEMIES = {
  grunt: { name: "Masked Grunt", file: "enemies/grunt.glb", height: 1.5, speed: 1.6, clip: "Walking" },
  scout: { name: "Scout Raider", file: "enemies/scout.glb", height: 1.35, speed: 3.0, clip: "Running" },
  heavy: { name: "Heavy Trooper", file: "enemies/heavy.glb", height: 1.9, speed: 1.1, clip: "Walking" },
  dai_li: { name: "Dai Li Agent", file: "enemies/dai_li.glb", height: 1.55, speed: 1.9, clip: "Walking" },
  spirit: { name: "Corrupted Spirit", file: "enemies/spirit.glb", height: 1.8, speed: 1.3, clip: "Unsteady_Walk" },
```

with:

```js
// `health` is how much damage it takes to defeat it, `reward` how much gold that pays, and `leak` how many
// lives are lost if it gets to the end of the road.
const ENEMIES = {
  grunt: { name: "Masked Grunt", file: "enemies/grunt.glb", height: 1.5, speed: 1.6, clip: "Walking", health: 40, reward: 6, leak: 1 },
  scout: { name: "Scout Raider", file: "enemies/scout.glb", height: 1.35, speed: 3.0, clip: "Running", health: 26, reward: 6, leak: 1 },
  heavy: { name: "Heavy Trooper", file: "enemies/heavy.glb", height: 1.9, speed: 1.1, clip: "Walking", health: 140, reward: 14, leak: 2 },
  dai_li: { name: "Dai Li Agent", file: "enemies/dai_li.glb", height: 1.55, speed: 1.9, clip: "Walking", health: 70, reward: 9, leak: 1 },
  spirit: { name: "Corrupted Spirit", file: "enemies/spirit.glb", height: 1.8, speed: 1.3, clip: "Unsteady_Walk", health: 120, reward: 20, leak: 3 },
};

// How an enemy falls. Every model has two death clips, and an enemy plays one of them, once. A clip is
// three seconds or so, which is a long time to wait for something that has already been beaten, so it is
// played quicker: `seconds` is how long the fall takes. Then the body lies there for `linger` seconds, and
// sinks into the ground over `sink` more, and is gone.
const DEATH = {
  clips: ["Dead", "Fall_Dead_from_Abdominal_Injury"],
  seconds: 2.2,
  linger: 0.6,
  sink: 1.6,
```

- **The numbers say who each enemy is.** The scout is quick and fragile (26 health, and fast: the towers have to hit it fast), the heavy trooper is slow and tough (140, and costs two lives), the spirit is the boss (120 health, three lives).
- **Every model has two death clips,** and an enemy plays one of them once. They are three seconds or so, which is a long time to watch something that has already been beaten, so `seconds` says how long the *fall* takes and the clip is played faster or slower to fit. `linger` is how long it lies there, and `sink` how long it takes to go down into the ground.

An enemy takes a `healthScale`, because later waves are tougher than the table says. It goes before `enemies`, the last argument, which nobody passes:

In `js/enemies.js`, **replace** line 59:

```js
  constructor(scene, loaded, kind, route, name = `enemy ${kind}`, enemies = ENEMIES) {
```

with:

```js
  // `healthScale` is how much tougher than the table this one is: later waves are tougher.
  constructor(scene, loaded, kind, route, name = `enemy ${kind}`, healthScale = 1, enemies = ENEMIES) {
```

And it starts with everything it needs to know about its health:

In `js/enemies.js`, **replace** line 64:

```js
    this.height = spec.height;
```

with:

```js
    this.name = name;
    this.height = spec.height;
    this.reward = spec.reward;
    this.leak = spec.leak;
    this.maxHealth = spec.health * healthScale;
    this.health = this.maxHealth;
    this.state = "walking"; // "walking", and then "dying" once its health has run out
    this.sinceDeath = 0;
```

- **`state` is "walking" or "dying".** Two states, and everything else (`alive`, `dead`, `finished`) is read from it.

While an enemy falls, it doesn't walk. It lies where it fell, and then, after a moment, sinks:

In `js/enemies.js`, **replace** lines 92 to 93:

```js
  // Walks for `dt` seconds, and puts the enemy where it has got to.
  update(dt) {
```

with:

```js
  // Walks for `dt` seconds, and puts the enemy where it has got to. An enemy that is falling doesn't walk: it lies where
  // it fell, and then sinks into the ground.
  update(dt) {
    if (this.state === "dying") {
      this.sinceDeath += dt;
      const sunk = (this.sinceDeath - DEATH.seconds - DEATH.linger) / DEATH.sink;
      if (sunk > 0) this.node.position.y = -this.height * Math.min(1, sunk);
      return;
    }
```

- **Sinking is the enemy's own height times how far through `sink` it is,** below the ground, and `Math.min(1, ...)` stops it at one height down. A model that fades out would need a see-through material for every enemy; a model that goes into the ground needs one number.

And the new things an enemy can say and do:

In `js/enemies.js`, after line 111, add:

```js
  // Whether it is still on its feet, whether it is falling, and whether it is over (it got to the end, or it has
  // fallen and gone): when it is over, it is time to take it away.
  get alive() {
    return this.state === "walking";
  }

  get dead() {
    return this.state === "dying";
  }

  get finished() {
    return this.alive ? this.walker.done : this.sinceDeath >= DEATH.seconds + DEATH.linger + DEATH.sink;
  }

  // Takes damage. Says whether this was what defeated it. Something that has fallen takes no more.
  hurt(amount) {
    if (!this.alive) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health > 0) return false;
    this.die();
    return true;
  }

  // Falls: the walking clip stops, and one of the two death clips plays, once, at the speed that makes it last
  // DEATH.seconds. Which one is decided by the name of the enemy, so that it is the same every time.
  die() {
    this.state = "dying";
    this.clip.stop();
    const pick = [...this.name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % DEATH.clips.length;
    this.fall = this.copy.animationGroups.find((group) => group.name === `${this.name} ${DEATH.clips[pick]}`);
    const length = (this.fall.to - this.fall.from) / this.fall.targetedAnimations[0].animation.framePerSecond;
    this.fall.start(false, length / DEATH.seconds);
  }

```

- **`alive`, `dead` and `finished` are three questions.** *Alive* is "on its feet". *Dead* is "falling or fallen". *Finished* is "over, and can be taken away", which is true of an alive enemy that has walked to the end and of a dead one that has sunk. A plain `done` would have to mean both, and would be wrong for one of them.
- **`hurt(amount)` says whether it was *this* hit that defeated it.** That is what the caller needs: it is how a game knows to pay once. Something that has already fallen takes no more, and says no. Health is never below nothing.
- **`die()` stops the walking clip and plays one death clip, once.** Which one is decided by the *name* of the enemy (the letters added up, modulo the number of clips), so that it is different from enemy to enemy and the same every time you play (and a test can say so). The speed is the length of the clip over the seconds it should last, which is how *any* clip is made to take as long as you like.

The new names are exported:

In `js/enemies.js`, **replace** lines 177 to 179:

```js
  module.exports = { ENEMIES, CLIPS, clipRatio, loadEnemies, Enemy };
} else {
  Object.assign(window, { ENEMIES, CLIPS, clipRatio, loadEnemies, Enemy });
```

with:

```js
  module.exports = { ENEMIES, DEATH, CLIPS, clipRatio, loadEnemies, Enemy };
} else {
  Object.assign(window, { ENEMIES, DEATH, CLIPS, clipRatio, loadEnemies, Enemy });
```

And the tests, at the end of `tests/enemies.tests.js`, above the closing `});`:

In `tests/enemies.tests.js`, after line 183, add:

```js

  QUnit.test("every enemy has health, a reward and a number of lives it costs", (assert) => {
    for (const [kind, spec] of Object.entries(ENEMIES)) {
      assert.true(spec.health > 0 && spec.reward > 0 && Number.isInteger(spec.leak) && spec.leak > 0, kind);
    }
  });

  QUnit.test("the heavier an enemy, the more it is worth: the toughest pay the most", (assert) => {
    assert.true(ENEMIES.heavy.reward > ENEMIES.grunt.reward);
    assert.true(ENEMIES.spirit.reward > ENEMIES.heavy.reward);
    assert.true(ENEMIES.spirit.leak > ENEMIES.grunt.leak);
  });

  QUnit.test("an enemy begins with all its health, as much more as the wave says, and is on its feet", (assert) => {
    const plain = new Enemy(scene, loaded, "grunt", route, "health a");
    const tough = new Enemy(scene, loaded, "grunt", route, "health b", 1.5);

    assert.strictEqual(plain.health, ENEMIES.grunt.health);
    assert.strictEqual(tough.health, ENEMIES.grunt.health * 1.5);
    assert.true(plain.alive && !plain.dead && !plain.finished);
    plain.dispose();
    tough.dispose();
  });

  QUnit.test("hurt takes health, and says no while there is some left", (assert) => {
    const enemy = new Enemy(scene, loaded, "heavy", route, "hurt");

    assert.false(enemy.hurt(30));
    assert.strictEqual(enemy.health, ENEMIES.heavy.health - 30);
    assert.true(enemy.alive);
    enemy.dispose();
  });

  QUnit.test("hurt that takes the last of it says yes, once: the enemy falls, and health is not below nothing", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "defeat");

    assert.true(enemy.hurt(1000));
    assert.strictEqual(enemy.health, 0);
    assert.true(enemy.dead && !enemy.alive);
    assert.false(enemy.hurt(10), "something that has fallen takes no more, and is not defeated again");
    enemy.dispose();
  });

  QUnit.test("a fallen enemy stops walking, plays one of the death clips and no other, and the clip is not looped", (assert) => {
    for (const kind of Object.keys(ENEMIES)) {
      const enemy = new Enemy(scene, loaded, kind, route, `fall ${kind}`);
      enemy.update(2);
      enemy.hurt(10000);
      const playing = enemy.copy.animationGroups.filter((group) => group.isPlaying);

      assert.strictEqual(playing.length, 1, kind);
      assert.strictEqual(playing[0], enemy.fall, kind);
      assert.true(DEATH.clips.some((clip) => enemy.fall.name === `fall ${kind} ${clip}`), kind);
      assert.false(enemy.fall.loopAnimation, kind);
      enemy.dispose();
    }
  });

  QUnit.test("the death clip is played at the speed that makes the fall last DEATH.seconds", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "fall time");
    enemy.hurt(10000);
    const seconds = (enemy.fall.to - enemy.fall.from) / 60 / enemy.fall.speedRatio;

    assert.true(Math.abs(seconds - DEATH.seconds) < 0.01);
    enemy.dispose();
  });

  QUnit.test("which death an enemy has depends on its name, the same each time, and both are used", (assert) => {
    const clipOf = (name) => {
      const enemy = new Enemy(scene, loaded, "grunt", route, name);
      enemy.hurt(1000);
      const clip = enemy.fall.name.slice(name.length + 1);
      enemy.dispose();
      return clip;
    };
    const names = Array.from({ length: 12 }, (_, i) => `death ${i}`);
    const clips = names.map(clipOf);

    assert.deepEqual(names.map(clipOf), clips);
    assert.deepEqual([...new Set(clips)].sort(), [...DEATH.clips].sort());
  });

  QUnit.test("a fallen enemy lies where it fell, and its position does not change as time goes on", (assert) => {
    const enemy = new Enemy(scene, loaded, "grunt", route, "lie");
    enemy.update(3);
    enemy.hurt(1000);
    const { x, z } = enemy.node.position;
    enemy.update(1);

    assert.strictEqual(enemy.node.position.x, x);
    assert.strictEqual(enemy.node.position.z, z);
    assert.strictEqual(enemy.walker.distance, 3 * ENEMIES.grunt.speed);
    enemy.dispose();
  });

  QUnit.test("after it has lain a while it sinks into the ground, and then it is over", (assert) => {
    const enemy = new Enemy(scene, loaded, "heavy", route, "sink");
    enemy.hurt(1000);
    enemy.update(DEATH.seconds + DEATH.linger - 0.01);
    assert.strictEqual(enemy.node.position.y, 0, "not yet");
    assert.false(enemy.finished);
    enemy.update(DEATH.sink / 2 + 0.01);
    assert.true(enemy.node.position.y < 0 && enemy.node.position.y > -enemy.height, "on its way down");
    assert.false(enemy.finished);
    enemy.update(DEATH.sink);

    assert.true(enemy.finished);
    assert.true(Math.abs(enemy.node.position.y + enemy.height) < 1e-9, "all the way down, and no further");
    enemy.dispose();
  });

  QUnit.test("an enemy that walks to the end is over, without falling", (assert) => {
    const enemy = new Enemy(scene, loaded, "scout", route, "through");
    enemy.update(route.total / ENEMIES.scout.speed + 1);

    assert.true(enemy.alive && enemy.done && enemy.finished);
    enemy.dispose();
  });

  QUnit.test("an enemy that has fallen is taken away without leaving anything behind", (assert) => {
    const meshes = scene.meshes.length;
    const groups = scene.animationGroups.length;
    const enemy = new Enemy(scene, loaded, "dai_li", route, "tidy");
    enemy.hurt(1000);
    enemy.update(10);
    enemy.dispose();

    assert.strictEqual(scene.meshes.length, meshes);
    assert.strictEqual(scene.animationGroups.length, groups);
  });
```

- **"A fallen enemy stops walking, plays one of the death clips and no other"** is run for every kind of enemy, since each has a model of its own and a clip can be missing from one.
- **"Which death an enemy has depends on its name"** makes twelve enemies with twelve names, sees which clip each plays, does it again and checks the answers are the same, and checks that *both* clips are used.
- **"After it has lain a while it sinks"** steps time to just before the sinking, to the middle of it, and to the end, and checks the position and `finished` at each.

**Check:** open `tests.html` through the web server. 486 tests pass.

---

## Step 2: Waves

A wave is a few **groups** of one kind of enemy, one after another. It is a table, and this file turns the table into a timeline, and a spawner walks it.

Open the placeholder `js/waves.js` and replace its contents with:

```js
// The waves: who comes, in what order, and when. A wave is a few groups of one kind of enemy, one group after
// another, and it is data: a table. A *spawner* is walked through a wave by time, and says which enemies have
// come on in that time. Nothing here knows about models or the scene. See ../tests/waves.tests.js.

// The waves, in order. A group is `count` enemies of one `kind`, `gap` seconds apart; the next group begins
// `wait` seconds after the last of this one comes on (2.5 seconds if it doesn't say).
const WAVES = [
  { groups: [{ kind: "grunt", count: 6, gap: 1.8 }] },
  { groups: [{ kind: "grunt", count: 8, gap: 1.5 }] },
  { groups: [{ kind: "grunt", count: 8, gap: 1.2 }, { kind: "scout", count: 5, gap: 0.9 }] },
  { groups: [{ kind: "dai_li", count: 6, gap: 1.4 }, { kind: "grunt", count: 8, gap: 1.0 }] },
  { groups: [{ kind: "heavy", count: 3, gap: 2.5 }, { kind: "scout", count: 10, gap: 0.7 }] },
  { groups: [{ kind: "dai_li", count: 7, gap: 1.3 }, { kind: "scout", count: 5, gap: 0.9 }] },
  { groups: [{ kind: "heavy", count: 4, gap: 2.2 }, { kind: "grunt", count: 8, gap: 1.0 }] },
  { groups: [{ kind: "scout", count: 12, gap: 0.6 }, { kind: "dai_li", count: 8, gap: 1.0 }, { kind: "heavy", count: 3, gap: 2.2 }] },
  { groups: [{ kind: "heavy", count: 8, gap: 1.6 }, { kind: "spirit", count: 1, gap: 1 }] },
  { groups: [{ kind: "grunt", count: 12, gap: 0.7 }, { kind: "heavy", count: 6, gap: 1.6 }, { kind: "spirit", count: 3, gap: 3.0 }] },
];

const WAVE_TOUGHER = 0.12; // each wave is this much tougher (as a share of what the table says) than the one before it
const GROUP_WAIT = 2.5; // the pause between two groups of a wave, if the group doesn't say

// How much tougher than the table the enemies of a wave are: the first (number 0) is not.
function healthScaleFor(index) {
  return 1 + WAVE_TOUGHER * index;
}

// Every enemy of a wave, with the time at which it comes on: [{ time, kind }], in order of time.
function scheduleOf(wave) {
  const schedule = [];
  let time = 0;
  for (const group of wave.groups) {
    for (let n = 0; n < group.count; n++) {
      schedule.push({ time, kind: group.kind });
      if (n < group.count - 1) time += group.gap;
    }
    time += group.wait === undefined ? GROUP_WAIT : group.wait;
  }
  return schedule;
}

// How many enemies there are in a wave, and what they are worth if all are defeated.
function countIn(wave) {
  return wave.groups.reduce((sum, group) => sum + group.count, 0);
}

function rewardOf(wave, enemies = ENEMIES) {
  return wave.groups.reduce((sum, group) => sum + group.count * enemies[group.kind].reward, 0);
}

// Walks through a wave by time. `update(dt)` says which enemies came on in that time, as a list of kinds, in order.
class Spawner {
  constructor(wave) {
    this.schedule = scheduleOf(wave);
    this.next = 0; // how many have come on
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
    const kinds = [];
    while (this.next < this.schedule.length && this.schedule[this.next].time <= this.time) kinds.push(this.schedule[this.next++].kind);
    return kinds;
  }

  // Whether every enemy of the wave has come on.
  get finished() {
    return this.next >= this.schedule.length;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WAVES, WAVE_TOUGHER, GROUP_WAIT, healthScaleFor, scheduleOf, countIn, rewardOf, Spawner };
} else {
  Object.assign(window, { WAVES, WAVE_TOUGHER, GROUP_WAIT, healthScaleFor, scheduleOf, countIn, rewardOf, Spawner });
}
```

Things to notice:

- **`WAVES` is the whole game's pacing in one place.** The first is six grunts, the second eight; then the scouts, the Dai Li agents, the heavy troopers, and a spirit at the end. Every kind of enemy is met, and a test says so. To change the game, change the table.
- **A group is `{ kind, count, gap }`,** and may say how long to `wait` after it. It begins when the last of the one before has come on and `GROUP_WAIT` has gone by.
- **`healthScaleFor(index)` makes each wave tougher:** the first is as the table says, and each after has 12 percent more health. (`WAVE_TOUGHER`, in the table of numbers.) That is how the same five kinds of enemy are still a challenge in the tenth wave.
- **`scheduleOf` is the heart:** a wave becomes a list of `{ time, kind }`, in order of time. Everything else (the spawner, the tests, and the fairness test) is made from it.
- **`Spawner` is walked through a wave by time.** `update(dt)` adds `dt` to its clock and says every enemy whose time has come, in order. It *finishes* when every one has come on. A test says that many short steps and one long one say the same, which is what makes it safe when a frame is long.
- **`countIn` and `rewardOf`** say what a wave is, and what it is worth: the fairness test uses the second.

Open the placeholder `tests/waves.tests.js` and replace its contents with:

```js
QUnit.module("the WAVES table", () => {
  QUnit.test("there are ten waves, and each has at least one group", (assert) => {
    assert.strictEqual(WAVES.length, 10);
    for (const [i, wave] of WAVES.entries()) assert.true(wave.groups.length >= 1, `wave ${i + 1}`);
  });

  QUnit.test("every group is of a kind of enemy that there is, and has a count and a gap", (assert) => {
    for (const wave of WAVES) {
      for (const group of wave.groups) {
        assert.true(group.kind in ENEMIES, group.kind);
        assert.true(Number.isInteger(group.count) && group.count > 0, group.kind);
        assert.true(group.gap > 0, group.kind);
      }
    }
  });

  QUnit.test("the waves get bigger: later waves have more to defeat, in all, than the first", (assert) => {
    const worth = (wave) => wave.groups.reduce((sum, group) => sum + group.count * ENEMIES[group.kind].health, 0);

    assert.true(worth(WAVES[WAVES.length - 1]) > worth(WAVES[0]) * 4);
    assert.true(worth(WAVES[5]) > worth(WAVES[1]));
  });

  QUnit.test("the first wave is the easy ones, and the spirit is saved for the end", (assert) => {
    assert.true(WAVES[0].groups.every((group) => group.kind === "grunt"));
    const spiritWaves = WAVES.map((wave, i) => (wave.groups.some((group) => group.kind === "spirit") ? i : -1)).filter((i) => i >= 0);

    assert.true(spiritWaves.every((i) => i >= WAVES.length - 2));
  });

  QUnit.test("every kind of enemy is met at least once", (assert) => {
    const met = new Set(WAVES.flatMap((wave) => wave.groups.map((group) => group.kind)));

    assert.deepEqual([...met].sort(), Object.keys(ENEMIES).sort());
  });
});

QUnit.module("healthScaleFor", () => {
  QUnit.test("the first wave is as the table says, and each after is a little tougher", (assert) => {
    assert.strictEqual(healthScaleFor(0), 1);
    assert.true(Math.abs(healthScaleFor(1) - (1 + WAVE_TOUGHER)) < 1e-12);
    assert.true(healthScaleFor(9) > healthScaleFor(8));
  });
});

QUnit.module("scheduleOf", () => {
  QUnit.test("an enemy for each one in the wave, in order of time", (assert) => {
    for (const wave of WAVES) {
      const schedule = scheduleOf(wave);

      assert.strictEqual(schedule.length, countIn(wave));
      assert.true(schedule.every((entry, i) => i === 0 || entry.time >= schedule[i - 1].time));
    }
  });

  QUnit.test("the first comes on at once", (assert) => {
    assert.strictEqual(scheduleOf(WAVES[0])[0].time, 0);
  });

  QUnit.test("those of a group are a gap apart", (assert) => {
    const schedule = scheduleOf({ groups: [{ kind: "grunt", count: 4, gap: 1.5 }] });

    assert.deepEqual(schedule.map((entry) => entry.time), [0, 1.5, 3, 4.5]);
  });

  QUnit.test("the next group comes a wait after the last of the one before, which is the table's if it isn't given", (assert) => {
    const schedule = scheduleOf({ groups: [{ kind: "grunt", count: 2, gap: 1 }, { kind: "scout", count: 2, gap: 1 }] });

    assert.deepEqual(schedule.map((entry) => entry.time), [0, 1, 1 + GROUP_WAIT, 2 + GROUP_WAIT]);
    assert.deepEqual(schedule.map((entry) => entry.kind), ["grunt", "grunt", "scout", "scout"]);
  });

  QUnit.test("a group can say how long to wait after it", (assert) => {
    const schedule = scheduleOf({ groups: [{ kind: "grunt", count: 1, gap: 1, wait: 10 }, { kind: "scout", count: 1, gap: 1 }] });

    assert.deepEqual(schedule.map((entry) => entry.time), [0, 10]);
  });

  QUnit.test("a wave comes on in less than a minute, so that no wave is long to wait for", (assert) => {
    for (const wave of WAVES) {
      const schedule = scheduleOf(wave);

      assert.true(schedule[schedule.length - 1].time < 60);
    }
  });
});

QUnit.module("countIn and rewardOf", () => {
  QUnit.test("countIn adds up the groups", (assert) => {
    assert.strictEqual(countIn({ groups: [{ kind: "grunt", count: 3, gap: 1 }, { kind: "scout", count: 4, gap: 1 }] }), 7);
  });

  QUnit.test("rewardOf is what they are all worth", (assert) => {
    assert.strictEqual(rewardOf({ groups: [{ kind: "grunt", count: 3, gap: 1 }, { kind: "heavy", count: 1, gap: 1 }] }), 3 * ENEMIES.grunt.reward + ENEMIES.heavy.reward);
  });
});

QUnit.module("Spawner", () => {
  const wave = { groups: [{ kind: "grunt", count: 3, gap: 2 }, { kind: "scout", count: 1, gap: 1, wait: 1 }] };

  QUnit.test("says nothing of the future: the first on at once, and the others as the time comes", (assert) => {
    const spawner = new Spawner(wave);

    assert.deepEqual(spawner.update(0), ["grunt"]);
    assert.deepEqual(spawner.update(1.9), []);
    assert.deepEqual(spawner.update(0.2), ["grunt"]);
  });

  QUnit.test("in the end it has said every one, in order, once", (assert) => {
    const spawner = new Spawner(wave);
    const all = [];
    for (let i = 0; i < 400; i++) all.push(...spawner.update(0.05));

    assert.deepEqual(all, ["grunt", "grunt", "grunt", "scout"]);
  });

  QUnit.test("a long step says all that came due in it", (assert) => {
    const spawner = new Spawner(wave);

    assert.deepEqual(spawner.update(100), ["grunt", "grunt", "grunt", "scout"]);
    assert.true(spawner.finished);
  });

  QUnit.test("it is finished when the last has come on, and not before", (assert) => {
    const spawner = new Spawner(wave);
    spawner.update(0);
    assert.false(spawner.finished);
    spawner.update(4);
    assert.false(spawner.finished);
    spawner.update(3);

    assert.true(spawner.finished);
  });

  QUnit.test("many short steps and one long one say the same", (assert) => {
    const a = new Spawner(WAVES[4]);
    const b = new Spawner(WAVES[4]);
    const stepped = [];
    for (let i = 0; i < 1200; i++) stepped.push(...a.update(1 / 60));

    assert.deepEqual(stepped, b.update(20));
  });
});
```

- **The table is tested as a design:** the waves get bigger, the first is the easy ones, the spirit is kept for the end, and every kind of enemy is met. These are the things you'd want to be true if you changed the table, and now they say so if they aren't.
- **"A wave comes on in less than a minute"** is a promise to the player: they never wait long for enemies to come.

**Check:** open `tests.html`. 505 tests pass.

---

## Step 3: The director

The game has **rules**: how many lives, how long to build before the first wave and between waves, when a wave is over, and when the game is. The **director** is those rules and nothing else. Each frame it is told how long it was and how many enemies are still on the board, and it says what happened. It has no models, no gold, and no screen.

Open the placeholder `js/director.js` and replace its contents with:

```js
// The director: the rules of a game of waves. It keeps the lives, and which wave it is, and whether the player is
// getting ready, or the enemies are coming, or it is over. Each frame it is told how long it was and how many
// enemies are still on the board, and it says what happened as events: a wave begins, an enemy comes on, a wave is
// beaten, and the game is won or lost. It knows nothing of models, or of gold, or of the screen. See ../tests/director.tests.js.

const RULES = {
  lives: 20, // how many lives there are at the start
  firstWait: 25, // seconds to build before the first wave
  pause: 14, // seconds to build between waves
  bonus: 25, // gold for beating a wave, and this much more for each wave after the first
};

class Director {
  constructor(waves = WAVES, rules = RULES) {
    this.waves = waves;
    this.rules = rules;
    this.lives = rules.lives;
    this.index = 0; // the wave that is being fought, or that is next
    this.phase = "preparing"; // "preparing", "running", "won" or "lost"
    this.countdown = rules.firstWait;
    this.spawner = null;
  }

  // The number of the wave that is being fought or is next, counted from 1.
  get number() {
    return this.index + 1;
  }

  get over() {
    return this.phase === "won" || this.phase === "lost";
  }

  // The player is ready: the wave begins as soon as the next frame.
  callNext() {
    if (this.phase === "preparing") this.countdown = 0;
  }

  // An enemy got to the end. It says whether that was the end of the game.
  leak(lives) {
    if (this.over) return [];
    this.lives = Math.max(0, this.lives - lives);
    if (this.lives > 0) return [];
    this.phase = "lost";
    return [{ type: "lost" }];
  }

  // Lets `dt` seconds go by, with `alive` enemies still on the board. It says what happened.
  update(dt, alive) {
    if (this.over) return [];
    const events = [];
    if (this.phase === "preparing") {
      this.countdown -= dt;
      if (this.countdown > 0) return events;
      this.phase = "running";
      this.spawner = new Spawner(this.waves[this.index]);
      events.push({ type: "wave", number: this.number, total: this.waves.length });
      dt = 0; // the time that went on the countdown is not time that the wave has been going
    }

    const kinds = this.spawner.update(dt);
    for (const kind of kinds) events.push({ type: "spawn", kind, healthScale: healthScaleFor(this.index) });
    if (this.spawner.finished && kinds.length === 0 && alive === 0 && !events.some((event) => event.type === "wave")) {
      const bonus = this.rules.bonus + 5 * this.index;
      events.push({ type: "cleared", number: this.number, bonus });
      if (this.index === this.waves.length - 1) {
        this.phase = "won";
        events.push({ type: "won" });
      } else {
        this.index++;
        this.phase = "preparing";
        this.countdown = this.rules.pause;
        this.spawner = null;
      }
    }
    return events;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { RULES, Director };
} else {
  Object.assign(window, { RULES, Director });
}
```

Things to notice:

- **Four phases:** *preparing* (a countdown, and the player builds), *running* (the wave comes on and is fought), *won* and *lost*. A state machine again, and a test goes along every arrow.
- **It speaks in events:** `wave` (a wave begins), `spawn` (an enemy comes on, and how much tougher than the table it is), `cleared` (a wave is beaten, and the bonus it earns), `won` and `lost`. Whatever listens does what it likes with them: the game makes an enemy for a `spawn`, pays the wallet for a `cleared`, and shows a banner for the last two. The director doesn't know what any of that is.
- **A wave is beaten when every enemy has come on *and* none is left.** `alive` is given to it, because the director does not keep the enemies. (And not on the frame that one came on, or one that came on and was already defeated would end the wave before anyone saw it.)
- **The bonus grows with the wave:** `RULES.bonus` plus five for each wave before it.
- **The countdown that ran over doesn't count as wave time.** When the countdown ends in the middle of a frame, `dt = 0` for the spawner, so a frame that was a second long doesn't bring on a second's enemies at once. A test says so.
- **`callNext` sets the countdown to nothing,** so the wave begins in the next frame: it is what the *Start wave* button will do. It does nothing in any phase but *preparing*.
- **`leak(lives)` takes lives, never below nothing, and says if that was the end.** It says `lost` once: after that it says nothing. A game that is over ignores everything.

Open the placeholder `tests/director.tests.js` and replace its contents with:

```js
QUnit.module("Director", () => {
  // Two small waves, and quick rules, so that a game is a few seconds of play.
  const waves = [
    { groups: [{ kind: "grunt", count: 2, gap: 1 }] },
    { groups: [{ kind: "scout", count: 1, gap: 1 }] },
  ];
  const rules = { lives: 5, firstWait: 10, pause: 4, bonus: 20 };
  const fresh = () => new Director(waves, rules);

  // Runs for `seconds` in steps of a tenth, with `alive` enemies on the board all that time, and says every event.
  const run = (director, seconds, alive = 0) => {
    const events = [];
    for (let t = 0; t < seconds - 1e-9; t += 0.1) events.push(...director.update(0.1, alive));
    return events;
  };

  QUnit.test("begins getting ready, with all its lives, and the countdown to the first wave", (assert) => {
    const director = fresh();

    assert.strictEqual(director.phase, "preparing");
    assert.strictEqual(director.lives, 5);
    assert.strictEqual(director.countdown, 10);
    assert.strictEqual(director.number, 1);
    assert.false(director.over);
  });

  QUnit.test("the real rules are in the RULES table", (assert) => {
    const director = new Director();

    assert.strictEqual(director.lives, RULES.lives);
    assert.strictEqual(director.countdown, RULES.firstWait);
    assert.strictEqual(director.waves, WAVES);
  });

  QUnit.test("while it is getting ready, nothing happens, and the countdown goes down", (assert) => {
    const director = fresh();

    assert.deepEqual(run(director, 5), []);
    assert.true(Math.abs(director.countdown - 5) < 1e-9);
    assert.strictEqual(director.phase, "preparing");
  });

  QUnit.test("when the countdown is over, the wave begins, and the first enemy comes on in the same moment", (assert) => {
    const events = run(fresh(), 10.2);

    assert.deepEqual(events.map((event) => event.type), ["wave", "spawn"]);
    assert.deepEqual(events[0], { type: "wave", number: 1, total: 2 });
    assert.strictEqual(events[1].kind, "grunt");
  });

  QUnit.test("the time that the countdown ran over is not time that the wave has been going", (assert) => {
    const director = fresh();
    run(director, 9.9);
    const events = director.update(5, 0);

    assert.deepEqual(events.map((event) => event.type), ["wave", "spawn"], "one enemy, and not those of five seconds of wave");
  });

  QUnit.test("the enemies come on as the wave says, and each says how much tougher than the table it is", (assert) => {
    const director = fresh();
    const spawns = run(director, 14, 1).filter((event) => event.type === "spawn");

    assert.deepEqual(spawns.map((event) => event.kind), ["grunt", "grunt"]);
    assert.strictEqual(spawns[0].healthScale, healthScaleFor(0));
  });

  QUnit.test("a wave is not beaten while any enemy is on the board, even when every one has come on", (assert) => {
    const director = fresh();
    run(director, 20, 1);

    assert.strictEqual(director.phase, "running");
    assert.strictEqual(director.number, 1);
  });

  QUnit.test("when they are all on and none is left, the wave is beaten, with a bonus, and the next countdown begins", (assert) => {
    const director = fresh();
    run(director, 12, 1);
    const events = director.update(0.1, 0);

    assert.deepEqual(events.map((event) => event.type), ["cleared"]);
    assert.deepEqual(events[0], { type: "cleared", number: 1, bonus: 20 });
    assert.strictEqual(director.phase, "preparing");
    assert.strictEqual(director.number, 2);
    assert.strictEqual(director.countdown, rules.pause, "the countdown for the next wave begins");
  });

  QUnit.test("the bonus is bigger for a later wave", (assert) => {
    const director = fresh();
    run(director, 12, 1);
    director.update(0.1, 0);
    run(director, 4.2, 1);
    run(director, 2, 1);
    const cleared = director.update(0.1, 0).find((event) => event.type === "cleared");

    assert.true(cleared.bonus > 20);
  });

  QUnit.test("beating the last wave wins the game, once, and then nothing more happens", (assert) => {
    const director = fresh();
    const events = [];
    events.push(...run(director, 12, 1), ...director.update(0.1, 0), ...run(director, 4.2, 1), ...run(director, 2, 1), ...director.update(0.1, 0));

    assert.deepEqual(events.filter((event) => event.type === "won").length, 1);
    assert.strictEqual(director.phase, "won");
    assert.true(director.over);
    assert.deepEqual(run(director, 30, 0), []);
  });

  QUnit.test("callNext starts the next wave at once, in the next frame, and only while getting ready", (assert) => {
    const director = fresh();
    director.callNext();
    const events = director.update(0.016, 0);

    assert.deepEqual(events.map((event) => event.type), ["wave", "spawn"]);
    director.callNext();
    assert.strictEqual(director.phase, "running");
    assert.strictEqual(director.countdown <= 0, true);
  });

  QUnit.test("an enemy that gets to the end costs the lives it says", (assert) => {
    const director = fresh();

    assert.deepEqual(director.leak(2), []);
    assert.strictEqual(director.lives, 3);
  });

  QUnit.test("with no lives left the game is lost, once, and nothing more happens", (assert) => {
    const director = fresh();
    director.leak(4);
    const events = director.leak(3);

    assert.deepEqual(events, [{ type: "lost" }]);
    assert.strictEqual(director.lives, 0, "lives never go below nothing");
    assert.strictEqual(director.phase, "lost");
    assert.deepEqual(director.leak(1), []);
    assert.deepEqual(run(director, 30, 0), []);
  });

  QUnit.test("a game that is lost cannot be started with callNext", (assert) => {
    const director = fresh();
    director.leak(99);
    director.callNext();

    assert.deepEqual(director.update(1, 0), []);
  });

  QUnit.test("leaking in the middle of a wave does not change which wave it is", (assert) => {
    const director = fresh();
    run(director, 11, 1);
    director.leak(1);

    assert.strictEqual(director.phase, "running");
    assert.strictEqual(director.number, 1);
  });

  QUnit.test("a whole game of the real waves, with the enemies beaten as they come, is won, with every wave in order", (assert) => {
    const director = new Director();
    const numbers = [];
    let alive = 0;
    for (let t = 0; t < 3000 && !director.over; t += 0.1) {
      for (const event of director.update(0.1, alive)) {
        if (event.type === "wave") numbers.push(event.number);
        if (event.type === "spawn") alive++;
      }
      alive = Math.max(0, alive - 1); // one is beaten every tenth of a second
    }

    assert.strictEqual(director.phase, "won");
    assert.deepEqual(numbers, WAVES.map((_, i) => i + 1));
  });
});
```

- **The tests use two tiny waves and quick rules,** so that a whole game is a few seconds, and `run` steps the director a tenth of a second at a time and collects the events.
- **"A whole game of the real waves, with the enemies beaten as they come, is won, with every wave in order"** plays the real table, with an imaginary player that beats an enemy every tenth of a second, and checks that the waves began 1 to 10, in order, and the game was won.

**Check:** open `tests.html`. 521 tests pass.

---

## Step 4: Hits

A bolt has to hurt. That is a small change to five files, each of which gets a tiny edit, and each edit has its test.

**The harm of each nation** goes in the table of benders, next to the price:

In `js/benders.js`, **replace** line 13:

```js
// throw. `cost` is what a podium for them costs, in gold. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
```

with:

```js
// throw. `cost` is what a podium for them costs, in gold, and `damage` is how much harm one of their attacks does. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
```

In `js/benders.js`, after line 28, add:

```js
    damage: 9,
```

In `js/benders.js`, after line 39, add:

```js
    damage: 13,
```

In `js/benders.js`, after line 51, add:

```js
    damage: 32,
```

In `js/benders.js`, after line 63, add:

```js
    damage: 17,
```

- **Earth hits hardest and slowest** (32 every two seconds and a bit), **air** least and fastest (9 every one and a half), **fire** and **water** in between. With the price and the range, that is what makes the four different to build, and not just different to look at.

and its test, inside the first module of `tests/benders.tests.js`:

In `tests/benders.tests.js`, after line 11, add:

```js
      assert.true(spec.damage > 0, kind);
```

**A tower says how hard a shot hits.** Two changes in `tower.js`:

In `js/tower.js`, **replace** line 99:

```js
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color }.
```

with:

```js
  // rest of the game wants to hear of: the shots it fired, each { enemy, muzzle, color, damage }.
```

In `js/tower.js`, **replace** line 106:

```js
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(), color: this.spec.color });
```

with:

```js
      if (event.type === "fire") shots.push({ enemy: event.enemy, muzzle: this.muzzle(), color: this.spec.color, damage: this.spec.damage });
```

and its test, in `tests/tower.tests.js`:

In `tests/tower.tests.js`, after line 194, add:

```js
      assert.strictEqual(shots[0].damage, spec.damage, kind);
```

**A bolt does its harm when it gets there.** Not before: a bolt that has not arrived has done nothing. Three changes in `bolts.js`:

In `js/bolts.js`, **replace** lines 2 to 4:

```js
// following it as it walks, and is gone when it gets there. (The effect of each nation, and what the
// hit does to the enemy, come in later tutorials: this is only so that you can see that the tower
// shot at the right enemy at the right moment.) See ../tests/bolts.tests.js.
```

with:

```js
// following it as it walks, and is gone when it gets there, and when it gets there it does its damage. (The
// effect of each nation comes in a later tutorial.) See ../tests/bolts.tests.js.
```

In `js/bolts.js`, **replace** lines 24 to 26:

```js
  // `from` is where it is thrown from, `enemy` who it is thrown at, `color` its color.
  constructor(scene, from, enemy, color) {
    this.enemy = enemy;
```

with:

```js
  // `from` is where it is thrown from, `enemy` who it is thrown at, `color` its color, and `damage` the harm it does.
  constructor(scene, from, enemy, color, damage = 0) {
    this.enemy = enemy;
    this.damage = damage;
    this.killed = false; // whether it was this bolt that defeated the enemy
```

In `js/bolts.js`, **replace** lines 50 to 51:

```js
    this.arrived = step.arrived || Math.hypot(goal.x - step.x, goal.y - step.y, goal.z - step.z) <= BOLT.hit;
    this.mesh.position.set(step.x, step.y, step.z);
```

with:

```js
    const arrivedNow = step.arrived || Math.hypot(goal.x - step.x, goal.y - step.y, goal.z - step.z) <= BOLT.hit;
    this.mesh.position.set(step.x, step.y, step.z);
    // It does its damage once, when it gets there, to an enemy that is still on its feet.
    if (arrivedNow && !this.arrived) this.killed = this.enemy.hurt ? this.enemy.hurt(this.damage) : false;
    this.arrived = arrivedNow;
```

- **It hurts once.** `arrivedNow && !this.arrived` is true on the one frame that it gets there, and never again.
- **`killed` says whether it was this bolt that did it,** from `hurt`, which says the same. (The `this.enemy.hurt ?` is for the tests of the flight, which give a bolt a stand-in with no `hurt`.)
- **A bolt thrown at an enemy that has fallen** flies there and does nothing, since `hurt` says no to the fallen.

and the tests, in the `Bolt` module of `tests/bolts.tests.js`:

In `tests/bolts.tests.js`, after line 127, add:

```js
  QUnit.test("it does its damage when it gets there, once, and says if that defeated the enemy", (assert) => {
    const enemy = {
      x: 3,
      z: 0,
      aimHeight: 1,
      health: 20,
      hits: [],
      hurt(amount) {
        this.hits.push(amount);
        this.health -= amount;
        return this.health <= 0;
      },
    };
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff", 20);
    for (let i = 0; i < 200; i++) bolt.update(0.02);

    assert.deepEqual(enemy.hits, [20], "once");
    assert.true(bolt.killed);
    assert.true(bolt.done);
  });

  QUnit.test("it does no damage on the way, only on arrival", (assert) => {
    const enemy = {
      x: 20,
      z: 0,
      aimHeight: 1,
      hits: [],
      hurt(amount) {
        this.hits.push(amount);
        return false;
      },
    };
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff", 5);
    bolt.update(0.1);

    assert.deepEqual(enemy.hits, []);
    assert.false(bolt.killed);
  });

  QUnit.test("an enemy that was not defeated by it is not said to be", (assert) => {
    const enemy = { x: 2, z: 0, aimHeight: 1, hurt: () => false };
    const bolt = new Bolt(scene, { x: 0, y: 1, z: 0 }, enemy, "#ffffff", 5);
    for (let i = 0; i < 100; i++) bolt.update(0.02);

    assert.true(bolt.done);
    assert.false(bolt.killed);
  });

```

**A fourth way to choose, and no shooting at the fallen.** In `targeting.js`:

In `js/targeting.js`, **replace** lines 3 to 4:

```js
// anything with an `x`, a `z`, a `progress` (how far along the road it is, from 0 to 1) and a `done`
// (whether it has got to the end), so that a test can make them with a line each. See ../tests/targeting.tests.js.
```

with:

```js
// anything with an `x`, a `z`, a `progress` (how far along the road it is, from 0 to 1), a `done`
// (whether it has got to the end) and a `health`, and perhaps a `dead` (whether it has fallen), so that a test
// can make them with a line each. See ../tests/targeting.tests.js.
```

In `js/targeting.js`, **replace** line 19:

```js
// far along, and `closest` the one nearest to the tower.
```

with:

```js
// far along, `closest` the one nearest to the tower, and `strongest` the one with the most health left.
```

In `js/targeting.js`, after line 23, add:

```js
  strongest: (enemy) => enemy.health,
```

In `js/targeting.js`, **replace** line 28:

```js
// end is not a target. If two have the same score, the one that comes first in the list is.
```

with:

```js
// end, or has fallen, is not a target. If two have the same score, the one that comes first in the list is.
```

In `js/targeting.js`, **replace** line 34:

```js
    if (enemy.done || !inRange(from, enemy, range)) continue;
```

with:

```js
    if (enemy.done || enemy.dead || !inRange(from, enemy, range)) continue;
```

- **`strongest` is one more row of the table of scores:** an enemy's health. Adding a way to choose is, as promised, adding a row.
- **`enemy.dead` is now a reason to skip it.** An enemy that is falling is still in the list (it is there on the ground), and shooting at it would be wasting bolts.

and the tests of it:

In `tests/targeting.tests.js`, **replace** line 2:

```js
const foe = (x, z, progress = 0, done = false) => ({ x, z, progress, done });
```

with:

```js
const foe = (x, z, progress = 0, done = false, health = 10, dead = false) => ({ x, z, progress, done, health, dead });
```

In `tests/targeting.tests.js`, after line 64, add:

```js
  QUnit.test("`strongest` is the one with the most health left", (assert) => {
    const tough = foe(3, 0, 0.1, false, 90);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.9, false, 10), tough, foe(2, 0, 0.5, false, 40)], "strongest"), tough);
  });

  QUnit.test("an enemy that has fallen is not picked, though it is still there on the ground", (assert) => {
    const standing = foe(4, 0, 0.1);

    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.9, false, 0, true), standing]), standing);
    assert.strictEqual(pickTarget(tower, 5, [foe(1, 0, 0.9, false, 0, true)]), null);
  });

```

In `tests/targeting.tests.js`, **replace** lines 115 to 116:

```js
  QUnit.test("there are three ways to choose, and each is a function of an enemy", (assert) => {
    assert.deepEqual(Object.keys(TARGET_MODES), ["first", "last", "closest"]);
```

with:

```js
  QUnit.test("there are four ways to choose, and each is a function of an enemy", (assert) => {
    assert.deepEqual(Object.keys(TARGET_MODES), ["first", "last", "closest", "strongest"]);
```

**Gold comes from defeats now.** The trickle of the last tutorial goes, and the game starts with a little more:

In `js/economy.js`, **replace** lines 6 to 7:

```js
  startGold: 400, // what there is at the start
  trickle: 12, // gold a second that comes in for now, with no one to defeat: the next tutorial pays for defeats instead
```

with:

```js
  startGold: 450, // what there is at the start
```

and the one test that used the trickle uses a number of its own:

In `tests/economy.tests.js`, **replace** lines 52 to 54:

```js
    for (let i = 0; i < 100; i++) wallet.earn(ECONOMY.trickle / 100);

    assert.true(Math.abs(wallet.gold - ECONOMY.trickle) < 1e-9);
```

with:

```js
    for (let i = 0; i < 100; i++) wallet.earn(12 / 100);

    assert.true(Math.abs(wallet.gold - 12) < 1e-9);
```

**Check:** open `tests.html`. 526 tests pass.

---

## Step 5: A frame of the game

There are now many things that happen in a frame, and in a certain order: the director says what comes, the enemies walk, the fallen are paid for, the ones that got through cost lives, the ones that are over are taken away, the towers look and shoot, and the bolts fly. In the last tutorial that was in `main.js`, which can't be tested. This file takes it out, so that the page and a test play the same frame.

Open the placeholder `js/battle.js` and replace its contents with:

```js
// A frame of the game of waves: the director says what comes and what ends, the enemies walk, the fallen are paid for
// and the ones that got to the end cost lives, the towers look and shoot, and the bolts fly. Everything it needs is in one
// object that it is given (a `world`), and the models are made by functions in it, so that a test can play a whole wave
// with real enemies, towers and bolts and no screen, and the page plays the same frame. See ../tests/battle.tests.js.

// Settles the enemies: the gold for every one that has fallen, a life lost for every one that got to the end, and a list
// of the ones that are over and can be taken away. An enemy is paid for once (when it has fallen) and costs lives once (when it has got to the end),
// and the ones that are over are returned in `gone`. `events` is whatever the director said about the lives (the game
// being lost, for one).
function settle(enemies, wallet, director) {
  const events = [];
  const gone = [];
  for (const enemy of enemies) {
    if (enemy.dead && !enemy.paid) {
      enemy.paid = true;
      wallet.earn(enemy.reward);
    }
    if (enemy.alive && enemy.done && !enemy.leaked) {
      enemy.leaked = true;
      events.push(...director.leak(enemy.leak));
    }
    if (enemy.finished) gone.push(enemy);
  }
  return { events, gone };
}

// Lets `dt` seconds of the game go by. The world is { director, wallet, towers, enemies, bolts, spawn, shoot, ended }:
// `spawn(kind, healthScale)` makes an enemy, `shoot(shot)` makes a bolt from what a tower fired, and `ended("won" or "lost")`
// is told when the game is over. `enemies` and `bolts` are lists that are kept up to date here, and nothing at all
// happens once the game is over.
function advance(world, dt) {
  const { director, wallet } = world;
  if (director.over) return;

  // The director says what happens: a wave begins, an enemy comes on, a wave is beaten (and paid for), the game is won.
  const alive = world.enemies.filter((enemy) => !enemy.finished).length;
  for (const event of director.update(dt, alive)) {
    if (event.type === "spawn") world.enemies.push(world.spawn(event.kind, event.healthScale));
    if (event.type === "cleared") wallet.earn(event.bonus);
    if (event.type === "won") world.ended("won");
  }

  // The enemies walk; the fallen are paid for, the ones that got to the end cost lives, and the ones that are over go.
  world.enemies.forEach((enemy) => enemy.update(dt));
  const { events, gone } = settle(world.enemies, wallet, director);
  if (events.some((event) => event.type === "lost")) world.ended("lost");
  gone.forEach((enemy) => enemy.dispose());
  world.enemies = world.enemies.filter((enemy) => !gone.includes(enemy));

  // Every tower looks at the enemies, and each shot it fires is a bolt. The bolts fly until they arrive.
  for (const tower of world.towers) {
    for (const shot of tower.update(dt, world.enemies)) world.bolts.push(world.shoot(shot));
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
  module.exports = { settle, advance };
} else {
  Object.assign(window, { settle, advance });
}
```

Things to notice:

- **`settle` is the accounts.** For each enemy: if it has fallen and has not been paid for, pay for it (and mark it, so that it is paid for once, however long it lies there); if it is alive and has got to the end, and has not cost its lives, take them (and mark it); if it is over, put it on the list to take away. It gives back the events the director said (the game being lost, for one) and the list.
- **The marks are on the enemy** (`paid`, `leaked`), which is a little crude, but means `settle` needs no list of its own to forget things.
- **`advance(world, dt)` is the frame.** Everything it needs is in one object, the **world**: the director, the wallet, the towers, the enemies and the bolts so far, and three *functions* (`spawn`, `shoot` and `ended`) for the things that have to be made or shown. `spawn` makes an enemy, `shoot` makes a bolt, and `ended` is told about the end. That is the whole of the boundary between the rules and the screen.
- **A game that is over does nothing.** The first line says so.
- **The order is the point.** The director first (new enemies appear), then the enemies walk, then the accounts, *then* the towers look at what is left, then the bolts fly. A bolt thrown this frame flies in the next.

Open the placeholder `tests/battle.tests.js` and replace its contents with:

```js
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
      shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage),
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
});
```

- **The first module gives `settle` stand-in enemies,** objects with only what `settle` asks for, so each rule is a line: paid once, charged once, nothing for one that walked through, nothing lost for one that fell on the very step it would have got through.
- **The second module plays whole games with real models.** Two small waves of grunts, a handful of earth towers, and `advance` stepped a twentieth of a second at a time. With towers, the game is **won**, every life is kept, and the gold is more than the rewards and bonuses. With none, the game is **lost**, and `ended` is told once. Once it is over, a frame changes nothing. When the game is over, **nothing is left in the scene**: no enemy, no bolt, no animation of an enemy's.
- **"An enemy is paid for when it falls, and not when the bolt is thrown"** starts with exactly enough gold for the tower and none over, and checks that a bolt was in the air *while the gold was still nothing*. A game that paid on the throw would pass most tests and fail this one.
- **This is a test of the whole game with no browser,** and no screen, and it takes a second. (It's the one that would have said at once that `places is not defined`, had the page been in it.)

**Check:** open `tests.html` through the web server. 541 tests pass.

---

## Step 6: The readouts

The player needs to see the lives, which wave it is and how long there is to build, to start the next wave early, and to be told when the game is won or lost. It is the same kind of thing as the tray: a class that is made from a page, with no game in it.

Open the placeholder `css/hud.css` and replace its contents with:

```css
/* The readouts of a game of waves: lives and the wave, at the top on the left, a button to start the next wave early,
   and a banner for the end. Nothing here is over the middle of the board except the banner, and that is only there
   when the game is over. */
[hidden] {
  display: none !important;
}

#status {
  position: fixed;
  top: 52px;
  left: 12px;
  z-index: 12;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  background: var(--parchment);
  color: var(--ink);
  border: 3px solid var(--ink);
  border-radius: 999px;
  font: 700 16px / 1 var(--small-font);
  pointer-events: none;
}
#status .heart {
  width: 1em;
  height: 1em;
  background: var(--banner);
  border: 2px solid var(--ink);
  box-sizing: border-box;
  transform: rotate(45deg) scale(0.8);
  border-radius: 2px 50% 2px 2px;
}
#status #lives {
  font: 700 20px / 1 var(--title-font);
}

#next-wave,
#again {
  padding: 10px 18px;
  background: var(--banner);
  color: #fff;
  border: 3px solid var(--ink);
  border-radius: 10px;
  font: 700 18px / 1 var(--title-font);
  letter-spacing: 0.04em;
  cursor: pointer;
  touch-action: manipulation;
}
#next-wave:hover,
#again:hover {
  background: var(--banner-dark);
}
#next-wave {
  position: fixed;
  right: 12px;
  bottom: calc(var(--tray-height) + 12px);
  z-index: 12;
}

#banner {
  position: fixed;
  left: 50%;
  top: 40%;
  transform: translate(-50%, -50%);
  z-index: 25;
  width: min(420px, calc(100vw - 32px));
  box-sizing: border-box;
  padding: 24px 28px;
  text-align: center;
  background: var(--parchment);
  color: var(--ink);
  border: 4px solid var(--ink);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(20, 40, 70, 0.5);
}
#banner[data-result="won"] {
  border-color: var(--gold);
}
#banner[data-result="lost"] {
  border-color: var(--banner);
}
#banner h2 {
  margin: 0 0 8px;
  font: 700 28px / 1.1 var(--title-font);
}
#banner p {
  margin: 0 0 18px;
  font: 700 16px / 1.3 var(--small-font);
}

@media (max-width: 640px), (max-height: 520px) {
  #status {
    top: 48px;
    padding: 4px 10px;
    font-size: 14px;
  }
  #next-wave {
    bottom: calc(var(--tray-height) + 8px);
    padding: 8px 12px;
    font-size: 15px;
  }
}
```

- **`[hidden] { display: none !important; }`** makes the `hidden` attribute win over any rule that says how an element is displayed. Without it, a button with `display: flex` would ignore `hidden`.
- **The lives and the wave are a pill, top left, under the back button,** where nothing is. The *Start wave* button is bottom right, just above the tray. The banner is the only thing over the middle of the board, and it is only there when the game is over.
- **The heart is a rotated square with one rounded corner,** and no picture.

Open the placeholder `js/hud.js` and replace its contents with:

```js
// The readouts of a game of waves: the lives, which wave it is and how long until the next, a button to
// start the next one early, and a banner for when the game is won or lost. Like the tray, it is made from a page,
// has no game in it, and is told what to show. See ../tests/hud.tests.js.

// What the wave readout says, for the state of the game.
function waveText(phase, number, total, countdown) {
  if (phase === "won") return `All ${total} waves beaten`;
  if (phase === "lost") return `Lost in wave ${number} of ${total}`;
  if (phase === "preparing") return `Wave ${number} of ${total} in ${Math.max(0, Math.ceil(countdown))}`;
  return `Wave ${number} of ${total}`;
}

// What the banner says when the game is over.
const BANNERS = {
  won: { title: "The island is safe!", text: "Every wave has been beaten." },
  lost: { title: "The island has fallen", text: "Too many got through." },
};

class Hud {
  // `parts` is { lives, wave, next, banner, title, text, again }: the elements of the page that this fills in.
  constructor(parts) {
    this.parts = parts;
    this.started = [];
    this.restarted = [];
    // A press on one of these buttons is for the button, and is not for the board behind it: the game listens for
    // a pointer let go anywhere, and would take it for a tap on a cell.
    for (const button of [parts.next, parts.again]) button.addEventListener("pointerup", (event) => event.stopPropagation());
    parts.next.addEventListener("click", () => this.started.forEach((listener) => listener()));
    parts.again.addEventListener("click", () => this.restarted.forEach((listener) => listener()));
  }

  // Asks to be told when the button for the next wave is pressed, and when the game is to be played again.
  onStartWave(listener) {
    this.started.push(listener);
  }

  onAgain(listener) {
    this.restarted.push(listener);
  }

  // Shows the state of the game: { lives, phase, number, total, countdown }.
  show({ lives, phase, number, total, countdown }) {
    this.write(this.parts.lives, String(lives));
    this.write(this.parts.wave, waveText(phase, number, total, countdown));
    this.parts.next.hidden = phase !== "preparing";
  }

  // Writes some text, if it is not what is there: the readouts are asked for every frame, and almost always say the same.
  write(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }

  // Shows the banner for a game that is won or lost, or hides it.
  banner(kind) {
    const shown = kind in BANNERS;
    this.parts.banner.hidden = !shown;
    if (!shown) return;
    this.parts.title.textContent = BANNERS[kind].title;
    this.parts.text.textContent = BANNERS[kind].text;
    this.parts.banner.dataset.result = kind;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { waveText, BANNERS, Hud };
} else {
  Object.assign(window, { waveText, BANNERS, Hud });
}
```

- **`waveText` is a function of the state of the game,** and says: how many seconds there are (rounded *up*, so that it says 1 until it is 0, and never below nothing), or which wave, or how it ended.
- **`show` writes only what has changed.** It is asked every frame, and almost always says the same. (A test watches the element with a `MutationObserver` and says that nothing is written.)
- **The two buttons stop a pointer let go from going on to the page.** The game listens for a pointer let go *anywhere*, to finish a drag, and a click on *Start wave* that is over the board would otherwise be taken for a tap on a cell, if a podium were armed. `stopPropagation` is the fix, and a test says so.

Open the placeholder `tests/hud.tests.js` and replace its contents with:

```js
QUnit.module("waveText", () => {
  QUnit.test("while getting ready it says how many seconds there are, rounded up, and never below nothing", (assert) => {
    assert.strictEqual(waveText("preparing", 3, 10, 12.2), "Wave 3 of 10 in 13");
    assert.strictEqual(waveText("preparing", 3, 10, 0.01), "Wave 3 of 10 in 1");
    assert.strictEqual(waveText("preparing", 3, 10, -4), "Wave 3 of 10 in 0");
  });

  QUnit.test("while the wave is on it says which wave", (assert) => {
    assert.strictEqual(waveText("running", 4, 10, 0), "Wave 4 of 10");
  });

  QUnit.test("at the end it says how it went", (assert) => {
    assert.strictEqual(waveText("won", 10, 10, 0), "All 10 waves beaten");
    assert.strictEqual(waveText("lost", 6, 10, 0), "Lost in wave 6 of 10");
  });
});

QUnit.module("a Hud", (hooks) => {
  let parts, hud;
  hooks.beforeEach(() => {
    const fixture = document.getElementById("qunit-fixture");
    const make = (tag) => fixture.appendChild(document.createElement(tag));
    parts = { lives: make("span"), wave: make("span"), next: make("button"), banner: make("div"), title: make("h2"), text: make("p"), again: make("button") };
    hud = new Hud(parts);
  });

  const state = (extra = {}) => ({ lives: 17, phase: "preparing", number: 2, total: 10, countdown: 8.5, ...extra });

  QUnit.test("show writes the lives and the wave", (assert) => {
    hud.show(state());

    assert.strictEqual(parts.lives.textContent, "17");
    assert.strictEqual(parts.wave.textContent, "Wave 2 of 10 in 9");
  });

  QUnit.test("the button for the next wave is there while getting ready, and nowhere else", (assert) => {
    hud.show(state());
    assert.false(parts.next.hidden);
    for (const phase of ["running", "won", "lost"]) {
      hud.show(state({ phase }));

      assert.true(parts.next.hidden, phase);
    }
  });

  QUnit.test("it only writes text that has changed, so asking every frame costs nothing", (assert) => {
    hud.show(state());
    let writes = 0;
    new MutationObserver(() => writes++).observe(parts.wave, { childList: true, characterData: true, subtree: true });
    hud.show(state());
    hud.show(state());

    return new Promise((resolve) =>
      setTimeout(() => {
        assert.strictEqual(writes, 0);
        resolve();
      }, 20)
    );
  });

  QUnit.test("pressing the wave button says so", (assert) => {
    let count = 0;
    hud.onStartWave(() => count++);
    parts.next.click();

    assert.strictEqual(count, 1);
  });

  QUnit.test("pressing play again says so", (assert) => {
    let count = 0;
    hud.onAgain(() => count++);
    parts.again.click();

    assert.strictEqual(count, 1);
  });

  QUnit.test("a pointer let go on either button does not go on to the page, where the game would take it for a tap on a cell", (assert) => {
    let heard = 0;
    window.addEventListener("pointerup", () => heard++, { once: true });
    parts.next.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    const stopped = heard === 0;
    parts.again.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    window.dispatchEvent(new PointerEvent("pointerup"));

    assert.true(stopped, "the button's pointerup stopped");
    assert.strictEqual(heard, 1, "and only the one that was sent to the window arrived");
  });

  QUnit.test("the banner is hidden until it is asked for, and then says the title and the text of the result", (assert) => {
    hud.banner(null);
    assert.true(parts.banner.hidden);
    hud.banner("won");

    assert.false(parts.banner.hidden);
    assert.strictEqual(parts.title.textContent, BANNERS.won.title);
    assert.strictEqual(parts.text.textContent, BANNERS.won.text);
    assert.strictEqual(parts.banner.dataset.result, "won");
  });

  QUnit.test("a loss says something different, and the banner can be hidden again", (assert) => {
    hud.banner("lost");
    assert.strictEqual(parts.title.textContent, BANNERS.lost.title);
    assert.notStrictEqual(BANNERS.lost.title, BANNERS.won.title);
    hud.banner(null);

    assert.true(parts.banner.hidden);
  });
});
```

**Check:** open `tests.html`. 552 tests pass.

---

## Step 7: Is it fair?

Every number so far is a guess: how much health, how much gold, how many in a wave, how hard a tower hits. A game can be set so that it is impossible, or so that it can't be lost, and neither is a game. So **play it**, in a test, and see.

Open the placeholder `tests/balance.tests.js` and replace its contents with:

```js
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

  // Fights one wave: `defense` is a list of { kind, col, row }. It gives back the lives lost and the gold earned.
  const fight = (route, defense, waveIndex) => {
    const dt = 0.05;
    const brains = defense.map(({ kind, col, row }) => new TowerBrain(BENDERS[kind], cellCenter(col, row)));
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

  // What a sensible player buys with `budget` gold, of the kinds of podium in `kinds`: again and again the podium and the
  // cell that give the most harm for the gold.
  const buy = (grid, route, budget, kinds = Object.keys(BENDERS)) => {
    const defense = [];
    let gold = budget;
    for (;;) {
      let best = null;
      for (const cell of buildableCells(grid, defense)) {
        const at = cellCenter(cell.col, cell.row);
        for (const kind of kinds) {
          const spec = BENDERS[kind];
          if (spec.cost > gold) continue;
          const score = (coverage(route, at, spec.range) * spec.damage) / spec.cooldown / spec.cost;
          if (!best || score > best.score) best = { kind, col: cell.col, row: cell.row, score };
        }
      }
      if (!best) return defense;
      defense.push({ kind: best.kind, col: best.col, row: best.row });
      gold -= BENDERS[best.kind].cost;
    }
  };

  // The best that a simple plan does against a wave, with `budget` gold: the plans are to buy any kind, or only one kind of
  // podium, and the one that loses fewest lives is the one that counts, since a player will find one that works.
  const bestPlan = (grid, route, budget, index) => {
    const plans = [Object.keys(BENDERS), ...Object.keys(BENDERS).map((kind) => [kind])];
    let best = null;
    for (const kinds of plans) {
      const defense = buy(grid, route, budget, kinds);
      const lost = fight(route, defense, index).lost;
      if (!best || lost < best.lost) best = { lost, defense, kinds };
    }
    return best;
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

  QUnit.test("the simulation is the same every time", (assert) => {
    const grid = parseMap(MAPS[0]);
    const route = routeFor(grid);
    const defense = buy(grid, route, 500);

    assert.deepEqual(fight(route, defense, 3), fight(route, defense, 3));
  });
});
```

Things to notice:

- **A `Foe` is an enemy with no model.** It has everything a tower and the rules ask of one (a walker, health, a position, `hurt`), and nothing else. So a whole wave, with every walker and every tower's brain from the real tables, is a loop of a few thousand steps that takes a few milliseconds.
- **`fight` plays a wave** against a list of towers: the spawner brings enemies on, the foes walk, every tower's real `TowerBrain` looks and fires, a bolt takes the time it would take to fly, and the damage is done when it gets there. It says how many lives were lost and how much gold was earned.
- **`buy` is a player.** It buys, again and again, the podium and the cell that give the most harm for the gold: how much of the road is within its range, times how hard it hits, over how long, over what it costs. Nothing clever.
- **`bestPlan` is the same player with a few ideas:** buy anything, or only air, or only water, or only earth, or only fire, and the one that loses fewest lives is the one that counts, since a player *will* find the one that works.
- **`goldBefore` is what a player has at each wave:** the start, plus what the waves before paid (most of it: a player loses a few) and the bonuses.
- **The tests say what a fair game is.** With no towers, the first wave goes straight through, and costs a good part of the lives. The gold at the start buys a defense that holds it. A defense bought for each wave with the gold a player would have holds *every* wave, losing only a few lives in all. And it is a fight: the defense that holds the first wave is *not* enough for the last.
- **The numbers in the tables were set with this test.** The first try was too easy: all earth towers lost nothing at all. Then the enemies' rewards were cut, the waves made bigger and tougher, and earth's harm cut a little, and the test said when it was about right: a few lives lost in the whole of the game, on either map. If you change a number, run it.
- **A message with the numbers in it.** Look at what the assertions say when they fail: *"lives lost in each wave: 0 (mixed), 0 (mixed), 0 (fire), ..."*. A test that says only *false* is a test you have to debug before you can fix.

**Check:** open `tests.html`. 563 tests pass.

---

## Step 8: The game

`main.js` gets smaller. It makes the director and the readouts, and gives the world to `advance`.

The demonstration of the last tutorial goes; in its place, a note:

In `js/main.js`, **replace** lines 18 to 20:

```js
// For now there is no wave: an enemy of each kind in turn comes on every few seconds and walks the
// road, so that you can see them. (The towers are built by the player now, with gold that trickles in.)
const DEMO = { gap: 2.5, order: ["grunt", "scout", "heavy", "dai_li", "spirit"] };
```

with:

```js
// The game is waves of enemies. What comes when, and how many lives there are, is the director's: this file does
// what it says, and shows it.
```

A blank line, for tidiness:

In `js/main.js`, after line 58, add:

```js

```

Now the rules and the readouts, and the world that the frame is played in. This replaces the list of bolts and the old variables of the frame (the enemies so far, and the time since the last one came on):

In `js/main.js`, **replace** lines 90 to 98:

```js
  let bolts = [];

  // Everything moves every frame, by the time the frame took, capped at 0.05 seconds, so that a tab
  // that has been in the background doesn't make everything jump when it comes back.
  const clouds = buildClouds(scene, seededRandom(CLOUDS.seed));
  let enemies = [];
  let clock = 0;
  let sinceLast = DEMO.gap; // so that the first one comes on at once
  let comeOn = 0;
```

with:

```js

  // The rules, and what shows them. The wave button starts the next wave early, and Play again starts the whole game again.
  const director = new Director();
  const hud = new Hud({
    lives: document.getElementById("lives"),
    wave: document.getElementById("wave"),
    next: document.getElementById("next-wave"),
    banner: document.getElementById("banner"),
    title: document.getElementById("banner-title"),
    text: document.getElementById("banner-text"),
    again: document.getElementById("again"),
  });
  hud.onStartWave(() => director.callNext());
  hud.onAgain(() => window.location.reload());

  // Everything moves every frame, by the time the frame took, capped at 0.05 seconds, so that a tab
  // that has been in the background doesn't make everything jump when it comes back. The frame of the game itself is
  // `advance`, which is given the world: the enemies and bolts so far, and how to make a new one.
  const clouds = buildClouds(scene, seededRandom(CLOUDS.seed));
  let comeOn = 0;
  const world = {
    director,
    wallet: state.wallet,
    towers: state.towers,
    enemies: [],
    bolts: [],
    spawn: (kind, healthScale) => new Enemy(scene, loaded, kind, route, `enemy ${++comeOn}`, healthScale),
    shoot: (shot) => new Bolt(scene, shot.muzzle, shot.enemy, shot.color, shot.damage),
    ended: (result) => hud.banner(result),
  };
  let clock = 0;
```

- **`world` is the object that `advance` is given.** `towers` is the list that the builder adds to (the same list, so a tower built this moment is in the next frame). `enemies` and `bolts` begin empty and are kept up to date by `advance`. `spawn`, `shoot` and `ended` are the three things that need a scene or a page.
- **The wave button calls the next wave, and *Play again* reloads the page.** Starting again is the simplest of all: begin again from nothing.
- **Enemies are named `enemy 1`, `enemy 2`...** (a counter), and the name chooses the death, so the first enemies of a game always fall in the same way.

The gold no longer trickles in:

In `js/main.js`, **delete** line 124:

```js
    state.wallet.earn(ECONOMY.trickle * dt);
```

And the frame of the game is one call, with the readouts after it. This is the longest change in the tutorial, and the one that is easy to get half done: **everything in the frame function that came after the three lines that move the clouds and the markers goes** (the old code that brought an enemy on every few seconds, moved the enemies, looked after the towers and the bolts: about twenty-four lines, down to the line before the closing `});` of the function), and **two lines take its place**. The tutorial's listing of the old lines is below; what you want at the end is the whole function as it is shown after it.

In `js/main.js`, **replace** lines 127 to 150 (from `sinceLast += dt;` to `});`) with:

```js
    advance(world, dt);
    hud.show({ lives: director.lives, phase: director.phase, number: Math.min(director.number, director.waves.length), total: director.waves.length, countdown: director.countdown });
```

When you have done it, the frame function is *all* of this (and the `sinceLast`, `enemies.forEach` and `bolts` of the old code are nowhere in it):

```js
  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    clock += dt;
    hand.update(dt);
    clouds.update(dt);
    markers.forEach((marker) => marker.update(clock));
    advance(world, dt);
    hud.show({ lives: director.lives, phase: director.phase, number: Math.min(director.number, director.waves.length), total: director.waves.length, countdown: director.countdown });
  });
```

**Check:** open `tests.html`. 563 tests pass. Then open `index.html` through the web server. At the top left are your lives and *Wave 1 of 10 in 25*, and a *Start wave* button. **Build some towers** (you begin with 450 gold), and then wait, or press the button. Enemies come on and walk; the towers shoot; an enemy that is hit enough **falls**, lies a moment and sinks into the island, and **gold** is paid. One that gets to the red ring costs lives. Between waves, build more. Beat all ten and the banner says *The island is safe!*; lose your lives and it says *The island has fallen*, and *Play again* starts again.

---

## Step 9: Try it

Things to look for, and things to change. Change one, save, and refresh.

- **Win.** Build two or three earth towers beside the long road, and add a water tower or two by the corners.
- **Lose.** Build nothing and press *Start wave*: the grunts walk through and your lives go.
- **Start early.** Press *Start wave* with a few seconds to go.
- **Deaths.** Watch two enemies fall: they don't always fall in the same way.
- **Tougher.** In `waves.js` change `WAVE_TOUGHER` to `0.3`, and run the tests: the fairness test says that a sensible player now loses too many lives. Make it `0.05` and it says the last wave is no harder than the first.
- **A different wave.** Add a group to the last wave. Run the tests: do they still say the game is fair?
- **Prices.** Change a `reward` in `enemies.js` to `50`. Gold floods in, and the test of fairness (which uses the same table) says the game has become too easy, with the numbers.
- **The towers.** Change `damage` for the air nomad to `30`. Is he now the best tower to build? The test that tries each kind alone will tell you.
- **A different way to choose.** In `brain.js` change the default `mode` to `"strongest"`, and watch the towers go for the heavy troopers first.
- **How they fall.** Change `DEATH.seconds` to `1` for a quick fall, or `4` for a slow one. The tests check that the clip's speed makes it last that long.

---

## Troubleshooting

- **The splash never goes, and the console says something is not defined:** a script is missing from `index.html`, has no export block, or is in the wrong order (`waves.js` before `director.js`, and all of them before `battle.js`).
- **`sinceLast is not defined` (or `enemies`, or `bolts`) in the console, and the splash never goes:** the old code of the frame function is still in `main.js`, after the new call to `advance`. Step 8's last change takes it *all* away: nothing after the line that moves the markers is left but the call to `advance` and the readouts.
- **The towers never choose the strongest, and the test of `TARGET_MODES` fails:** the row `strongest: (enemy) => enemy.health,` is missing from the table in `targeting.js` (Step 4).
- **`places is not defined` or `towers is not defined`:** `main.js` still has a line from the last tutorial: the old list of bolts (`let bolts = []`), or the loop over `towers`. Step 8's changes replace all of them.
- **Enemies never fall:** `hurt` isn't being called. Is the bolt given the damage (`new Bolt(..., shot.damage)`), and does the tower's shot carry it?
- **An enemy falls but is never paid for:** `settle` isn't being called, or the enemy has no `reward`.
- **An enemy falls and is paid for over and over:** the `paid` mark.
- **Lives go down by more than one for an enemy:** `leaked`.
- **The wave never ends:** `alive` is counted from enemies that are not `finished`, and a fallen enemy is only finished after it has sunk. A bug in `finished` shows here.
- **The countdown starts a wave with all its enemies at once:** the countdown's leftover time is being given to the spawner. It should be `dt = 0` for the frame the wave starts.
- **The *Start wave* button builds a tower under it:** its `pointerup` is not being stopped.
- **The game is hopelessly easy or hard:** run the tests. The fairness test says which, with the numbers.

---

## What you have

A game: enemies that can be defeated and that fall, ten waves, lives, gold from defeats, a countdown, a banner, and a pure frame function that a test can play from the first wave to the last with real models and no screen, behind a test suite of 563 tests, and a simulation that says whether the numbers make a game.

**Next up:** scenery. The next tutorial puts **props** on the maps (a cabbage cart, a spirit shrine, a koi pond, a winged-lemur perch) that make the board a place: the map's text says where each goes, a prop takes up its cell, and a tower can't be built on it (and says so).
