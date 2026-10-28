# Tutorial: Rolling Rampage Polish -- Sparks, a Shake, Ten Levels, and a Panel to Tune It With

This is the ninth tutorial in the Rolling Rampage series. The game is complete: it has a title, a score and sound. What it lacks is *feel*. A bump costs you three seconds, but nothing *happens*. A goal says "Goal!", and that is all. In this step you add the finishing touches that make a game feel good: **sparks** where the marble is hit, **glitter** at a checkpoint, a **firework** at the goal, a **puff** when the slime wins, a **trail** behind a marble going fast, and a **shake** of the camera when something big happens. The game also grows from three levels to **ten**. Then you add something for *you*: a **developer panel** (add `?dev` to the address) with sliders for the look of the marble, how it feels to roll, the lights and the effects, so you can tune all of it while you play. You write the code; this document tells you what to write and why.

By the end you'll have:

- **Particle bursts** (sparks, glitter, a firework, a puff), each a Babylon.js `ParticleSystem` made once and fired by hand, with what each looks like kept as plain data
- A **trail** behind the marble, made more of the faster it goes
- A **camera shake**: a number that starts big and dies away, as plain code with no Babylon.js in it
- **Seven more levels** (ten in all), drawn as grids of heights, each adding something to the last, with tests that check what can be checked: that every goal can be reached, and that the clock is fair
- A **developer panel**, only there with `?dev` in the address, built from a **table of sliders**, that folds up and hides with a key
- Everything **held still in a pause**, particles and shake too
- Unit tests for all of it, using stand-ins for Babylon.js and the page

**What you'll learn:** designing levels as data, the rules a level must follow (and tests that enforce them), particle systems and how a burst differs from a stream, data-driven effects, an effect as a pure function of time, moving an orthographic view without moving the camera, why every effect needs a way to be switched off or turned down, a developer mode and why it belongs in the game from the start, a panel built from a table so adding a slider is adding a line, and testing code that needs Babylon.js by giving it a fake.

## Where you're starting

This folder is a copy of the finished Screens sample, plus empty placeholder files for the new code and its tests:

```
rolling_rampage_polish/
├── index.html, tests.html   (change -- Steps 1, 2, 4, 5)
├── css/
│   ├── theme.css, page.css, splash.css, buttons.css, responsive.css, stick.css, tilt.css, levels.css, hud.css,
│   │   panel.css, title.css, pause.css, result.css, leaderboard.css, controls.css   (from the Screens sample)
│   └── devpanel.css        (new -- Step 5)
├── js/
│   ├── particles.js        (placeholder -- Step 1)
│   ├── shake.js            (placeholder -- Step 2)
│   ├── devpanel.js         (placeholder -- Step 4)
│   ├── level.js            (changes -- Step 6)
│   ├── main.js             (changes -- Steps 3 and 5)
│   └── physics.js, course.js, level.js, clock.js, zones.js, movers.js, slime.js, enemies.js, steering.js, marble.js, score.js, profile.js, leaderboard.js, game.js, sounds.js, screens.js, controls.js, tilt.js, camera.js, splash.js   (from the Screens sample)
└── tests/
    ├── particles, shake and devpanel tests   (placeholders)
    ├── level tests grow   (Step 6)
    └── the rest   (from the Screens sample)
```

### Serving the page

As before, the page can usually be opened from a file, but a web server is safer: run `npx serve` in the repo's root folder and open `http://localhost:3000/samples/rolling_rampage/rolling_rampage_polish/` (the command prints the exact address), or use the *Live Server* extension in VS Code.

### Starting over

To get back to exactly this starting point at any time, run the reset script from this folder:

```
node reset-tutorial.js
```

It asks for confirmation, then replaces `index.html`, `tests.html`, `css/`, `js/` and `tests/` with a fresh copy of the Screens sample plus the placeholders. Pass `--yes` to skip the question. Your work in those files is overwritten, so copy anything you want to keep first. `TUTORIAL.md` and `README.md` are never touched. It needs [Node.js](https://nodejs.org/) 16.7 or newer and no other setup.

---

Serve the page and open it to confirm it still works. Open `tests.html` too and note how many tests pass (**520**); you'll watch that number grow. Keep the developer console open (F12) as you work.

> **A note on how this tutorial builds code.** When a step creates a *new class*, the class is shown **complete and closed** straight away. Files that other files depend on end with a short block that exports their names. That way every file is valid JavaScript after every step. Where a step adds a long function, paste it **whole**. Where it **replaces** something, **delete the old one**: a file with two functions of the same name runs the last.

> **A note on scripts.** The scripts you add in this tutorial can go in the list in any order, as long as they are **above `main.js`** in `index.html`. Nothing in them is used until the game is running. In `tests.html`, put each script in the list of game scripts and each test file in the list of tests.

> **Put new files in this sample's folder.** The three new files go in `rolling_rampage_polish/js/` and `tests/`, and the new style in `rolling_rampage_polish/css/`, **not** in the Screens sample next door.

---

## Step 1: Particles

A **particle system** makes lots of tiny, short-lived sprites, each with its own position, speed, colour and size, which is how fire, smoke, sparks and fireworks are drawn. Babylon.js has a good one, `BABYLON.ParticleSystem`. We use it for two different jobs:

- A **burst**: a lot of particles *at once*, at a point, then nothing. A spark when the marble is hit; a firework at the goal.
- A **stream**: a few particles *every second*, for as long as something is going on. A trail behind the marble.

Open the placeholder `js/particles.js` and replace its contents with:

```js
// Particles: sparks where the marble is bumped, a glitter at a checkpoint, a firework at the goal, a puff when the
// slime wins, and a trail of glow behind a marble that is going fast. Each kind is a Babylon.js ParticleSystem that is
// made once and fired by hand whenever it is needed, so nothing is made while the game runs. What each kind looks like
// is plain data in PARTICLE_PRESETS. See ../tests/particles.tests.js.

// How each kind looks. Sizes are in world units (the marble is 1 across), times in seconds, `power` is the speed
// particles are thrown out at, and `gravity` pulls them up (+) or down (-). `additive` makes overlapping particles
// add their light, which suits sparks; a puff is drawn as it is. A burst makes `count` at once. The one kind that
// isn't a burst, the trail, makes `rate` a second while the marble is at full speed (see trailRate).
const PARTICLE_PRESETS = {
  spark: {
    capacity: 120,
    count: 24,
    colors: ["#ffd23a", "#ef5e07"],
    size: [0.08, 0.22],
    life: [0.25, 0.6],
    power: [3, 8],
    gravity: -14,
    spread: [-1, 0.4, -1, 1, 1.6, 1], // the directions they go in, from (x, y, z) to (x, y, z)
    additive: true,
  },
  glitter: {
    capacity: 100,
    count: 20,
    colors: ["#fff6a8", "#f6bf0e"],
    size: [0.1, 0.28],
    life: [0.6, 1.1],
    power: [0.8, 2.5],
    gravity: 2,
    spread: [-1, 1, -1, 1, 2, 1],
    additive: true,
  },
  firework: {
    capacity: 300,
    count: 90,
    colors: ["#248de3", "#f6bf0e"],
    size: [0.12, 0.34],
    life: [0.8, 1.5],
    power: [4, 10],
    gravity: -6,
    spread: [-1, 0.6, -1, 1, 2, 1],
    additive: true,
  },
  puff: {
    capacity: 100,
    count: 30,
    colors: ["#6fd13a", "#3d8a1f"],
    size: [0.4, 0.9],
    life: [0.5, 1.1],
    power: [1, 3],
    gravity: 1.5,
    spread: [-1, 0.2, -1, 1, 1, 1],
    additive: false,
  },
  trail: {
    capacity: 200,
    rate: 40,
    colors: ["#a2adc0", "#248de3"],
    size: [0.05, 0.11],
    life: [0.3, 0.6],
    power: [0.1, 0.4],
    gravity: 0,
    spread: [-0.3, 0.2, -0.3, 0.3, 0.6, 0.3],
    additive: true,
  },
};

// A trail is made while the marble is going fast, and more of it the faster it goes: none under a quarter of its top
// speed (a marble rolling gently leaves nothing), the full `rate` at the top. `speed` and `topSpeed` are in units a second.
const TRAIL_MIN_SHARE = 0.25;

function trailRate(speed, topSpeed, rate = PARTICLE_PRESETS.trail.rate) {
  const share = Math.min(1, speed / topSpeed);
  if (share < TRAIL_MIN_SHARE) return 0;
  return Math.round(rate * ((share - TRAIL_MIN_SHARE) / (1 - TRAIL_MIN_SHARE)));
}

// A soft round dot, drawn into a texture: white in the middle, fading to nothing at the edge. The particles are
// tinted by their colors, so one picture does for every kind.
function makeSoftTexture(scene, size = 64) {
  const texture = new BABYLON.DynamicTexture("particle", size, scene, false);
  texture.hasAlpha = true;
  const context = texture.getContext();
  const middle = size / 2;
  const gradient = context.createRadialGradient(middle, middle, 0, middle, middle, middle);
  gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  texture.update();
  return texture;
}

class ParticleBursts {
  constructor(scene) {
    this.scene = scene;
    this.texture = makeSoftTexture(scene);
    this.systems = {};
    this.speeds = {}; // the normal updateSpeed of each, to go back to after a pause
    this.amount = 1; // how much of everything to make: 1 is the presets, 2 is twice as many
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) this.systems[name] = this._make(name, preset);
  }

  // Makes one kind: a particle system that makes nothing by itself (emitRate 0) and is started once, then told
  // how many to make each time there is a burst (or, for the trail, how many a second).
  _make(name, preset) {
    const system = new BABYLON.ParticleSystem(name, preset.capacity, this.scene);
    system.particleTexture = this.texture;
    system.emitter = new BABYLON.Vector3(0, 0, 0);
    system.color1 = BABYLON.Color4.FromHexString(`${preset.colors[0]}FF`);
    system.color2 = BABYLON.Color4.FromHexString(`${preset.colors[1]}FF`);
    system.colorDead = BABYLON.Color4.FromHexString(`${preset.colors[1]}00`); // fades out as it dies
    [system.minSize, system.maxSize] = preset.size;
    [system.minLifeTime, system.maxLifeTime] = preset.life;
    [system.minEmitPower, system.maxEmitPower] = preset.power;
    system.gravity = new BABYLON.Vector3(0, preset.gravity, 0);
    const [x1, y1, z1, x2, y2, z2] = preset.spread;
    system.direction1 = new BABYLON.Vector3(x1, y1, z1);
    system.direction2 = new BABYLON.Vector3(x2, y2, z2);
    system.blendMode = preset.additive ? BABYLON.ParticleSystem.BLENDMODE_ONEONE : BABYLON.ParticleSystem.BLENDMODE_STANDARD;
    system.emitRate = 0;
    // A burst is made by hand (manualEmitCount, counted back to 0 once they are made). The trail is the one kind
    // made by the second, and that is what -1 means: go by emitRate.
    system.manualEmitCount = preset.rate ? -1 : 0;
    this.speeds[name] = system.updateSpeed;
    system.start();
    return system;
  }

  // Fires one burst of the named kind at a point in the world, as many as the preset says (times `amount`, but never
  // more than the system can hold).
  burst(name, x, y, z) {
    const system = this.systems[name];
    if (!system) throw new Error(`There is no kind of burst called "${name}"`);
    system.emitter.x = x;
    system.emitter.y = y;
    system.emitter.z = z;
    const preset = PARTICLE_PRESETS[name];
    system.manualEmitCount = Math.min(preset.capacity, Math.round(preset.count * this.amount));
  }

  // The trail: where the marble is, and how many to make a second (0 is none). Call it every frame.
  trail(x, y, z, rate) {
    const system = this.systems.trail;
    system.emitter.x = x;
    system.emitter.y = y;
    system.emitter.z = z;
    system.emitRate = Math.round(rate * this.amount);
  }

  // Holds every particle where it is (a pause), or lets them go on.
  setFrozen(frozen) {
    for (const [name, system] of Object.entries(this.systems)) system.updateSpeed = frozen ? 0 : this.speeds[name];
  }

  dispose() {
    for (const system of Object.values(this.systems)) system.dispose();
    this.texture.dispose();
    this.systems = {};
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PARTICLE_PRESETS, TRAIL_MIN_SHARE, trailRate, makeSoftTexture, ParticleBursts };
} else {
  Object.assign(window, { PARTICLE_PRESETS, TRAIL_MIN_SHARE, trailRate, makeSoftTexture, ParticleBursts });
}
```

Things to notice:

- **What each kind looks like is a row of data**, `PARTICLE_PRESETS`: how many, what colours, how big, how long they live, how fast they are thrown out, which way gravity pulls, and which directions they go in. Making a new kind of effect is adding a row, not writing code.
- **A burst is made once, and fired by hand.** `_make` builds a system that makes nothing by itself (`emitRate` of 0) and starts it. `burst(name, x, y, z)` moves the emitter to a point and sets `manualEmitCount`: *make this many, now*. Nothing is created while the game runs, so there is nothing to slow it down.
- **The trail is the other way round.** `manualEmitCount` of `-1` means *go by `emitRate`*, so `trail(x, y, z, rate)` only has to say where the marble is, and how many a second. (Set it to 0 and the trail makes nothing, forever. That is a mistake that is easy to make, and a test catches it.)
- **`trailRate(speed, topSpeed)` is a plain function**: no trail under a quarter of top speed, the full rate at the top, and a straight line between. It is the decision, and it needs no Babylon.js to test.
- **`additive` blending** adds the light of overlapping particles, so sparks, glitter and the firework glow and get brighter where they pile up. The puff is drawn as it is, so it looks like a cloud and not a light.
- **One soft round dot** (`makeSoftTexture`) does for all five kinds, because each is *tinted* by its colours. It is drawn on a canvas, so there is nothing to download.
- **`colorDead` is the end colour with no opacity**, so each particle fades out as it dies, and doesn't just vanish.
- **`amount` is a dial for all of them.** 1 is as the presets say, 0 is none, 2 is twice as many. It costs nothing and it is useful twice: a player who finds the effects too much, and you, deciding how much is enough.
- **`setFrozen`** holds every system still. A particle system moves with the frame it is drawn in, so without it a pause would leave sparks hanging in the air *moving*.
- **`dispose` gets rid of everything it made**, as every class that makes Babylon.js objects should.

### Tests

Add the script to **both** pages. In `index.html`, in the list at the bottom of `<body>`, directly below `screens.js`:

```html
  <script src="js/particles.js"></script>
```

In `tests.html`, add the script below `screens.js` and the tests below `screens.tests.js`:

```html
  <script src="js/particles.js"></script>
  <script src="tests/particles.tests.js"></script>
```

Open the placeholder `tests/particles.tests.js` and replace its contents with:

```js
QUnit.module("PARTICLE_PRESETS", () => {
  const BURSTS = ["spark", "glitter", "firework", "puff"];

  QUnit.test("there are four bursts and a trail", (assert) => {
    assert.deepEqual(Object.keys(PARTICLE_PRESETS).sort(), ["firework", "glitter", "puff", "spark", "trail"]);
  });

  QUnit.test("a burst fits in the system: it never makes more than the capacity", (assert) => {
    for (const name of BURSTS) {
      const preset = PARTICLE_PRESETS[name];
      assert.true(preset.count > 0 && preset.count <= preset.capacity, name);
    }
  });

  QUnit.test("the trail is made by the second, and has no count of a burst", (assert) => {
    assert.true(PARTICLE_PRESETS.trail.rate > 0);
    assert.strictEqual(PARTICLE_PRESETS.trail.count, undefined);
  });

  QUnit.test("each range goes from small to big", (assert) => {
    const problems = [];
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) {
      for (const key of ["size", "life", "power"]) {
        const [low, high] = preset[key];
        if (!(low > 0 && high >= low)) problems.push(`${name}.${key}`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("two hex colors for each, and a spread of two directions", (assert) => {
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) {
      assert.true(preset.colors.length === 2 && preset.colors.every((c) => /^#[0-9a-f]{6}$/.test(c)), `${name} colors`);
      assert.strictEqual(preset.spread.length, 6, `${name} spread`);
    }
  });

  QUnit.test("sparks fall and glitter rises, and only a puff is not drawn as light", (assert) => {
    assert.true(PARTICLE_PRESETS.spark.gravity < 0);
    assert.true(PARTICLE_PRESETS.glitter.gravity > 0);
    assert.true(PARTICLE_PRESETS.spark.additive);
    assert.false(PARTICLE_PRESETS.puff.additive);
  });

  QUnit.test("a firework is the biggest burst, and a puff is the biggest particle", (assert) => {
    assert.true(BURSTS.every((name) => PARTICLE_PRESETS.firework.count >= PARTICLE_PRESETS[name].count));
    assert.true(BURSTS.every((name) => PARTICLE_PRESETS.puff.size[1] >= PARTICLE_PRESETS[name].size[1]));
  });
});

QUnit.module("trailRate", () => {
  QUnit.test("a marble that is nearly still leaves no trail", (assert) => {
    assert.strictEqual(trailRate(0, 10), 0);
    assert.strictEqual(trailRate(2, 10), 0);
  });

  QUnit.test("it starts at a quarter of the top speed, and gets more the faster the marble goes", (assert) => {
    assert.strictEqual(trailRate(2.5, 10, 40), 0);
    assert.true(trailRate(5, 10, 40) > 0);
    assert.true(trailRate(8, 10, 40) > trailRate(5, 10, 40));
  });

  QUnit.test("at the top speed it is the full rate, and going faster than that makes no more", (assert) => {
    assert.strictEqual(trailRate(10, 10, 40), 40);
    assert.strictEqual(trailRate(25, 10, 40), 40);
  });

  QUnit.test("the rate is the preset's unless given another", (assert) => {
    assert.strictEqual(trailRate(10, 10), PARTICLE_PRESETS.trail.rate);
  });
});

// Making particles needs a lot of Babylon.js. These tests stand in for just the parts that are used, and check what
// the code sets on them. (The real BABYLON is put back afterwards: the other tests need it.)
QUnit.module("ParticleBursts", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;
  let realBabylon;

  class FakeVector3 {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
  }

  class FakeColor4 {
    static FromHexString(hex) {
      return { hex };
    }
  }

  class FakeParticleSystem {
    static BLENDMODE_ONEONE = "one-one";
    static BLENDMODE_STANDARD = "standard";

    constructor(name, capacity, scene) {
      Object.assign(this, { name, capacity, scene, started: false, disposed: false, updateSpeed: 0.01, manualEmitCount: -1 });
    }
    start() {
      this.started = true;
    }
    dispose() {
      this.disposed = true;
    }
  }

  class FakeTexture {
    constructor(name, size, scene) {
      Object.assign(this, { name, size, scene, updated: false, disposed: false, calls: [] });
    }
    getContext() {
      return {
        createRadialGradient: () => ({ addColorStop: (at, color) => this.calls.push(["stop", at, color]) }),
        fillRect: () => this.calls.push(["fill"]),
      };
    }
    update() {
      this.updated = true;
    }
    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    realBabylon = globalScope.BABYLON;
    globalScope.BABYLON = { Vector3: FakeVector3, Color4: FakeColor4, ParticleSystem: FakeParticleSystem, DynamicTexture: FakeTexture };
  });

  hooks.afterEach(() => {
    globalScope.BABYLON = realBabylon;
  });

  const scene = { name: "scene" };

  QUnit.test("makes a soft round texture: white in the middle, fading to nothing", (assert) => {
    const texture = makeSoftTexture(scene);

    assert.true(texture.hasAlpha);
    assert.true(texture.updated);
    assert.deepEqual(texture.calls.filter((c) => c[0] === "stop").map((c) => c[2]), ["rgba(255, 255, 255, 1)", "rgba(255, 255, 255, 0)"]);
  });

  QUnit.test("makes one system for each kind, all started, with the capacity the preset says", (assert) => {
    const bursts = new ParticleBursts(scene);

    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) {
      const system = bursts.systems[name];
      assert.true(system.started, name);
      assert.strictEqual(system.capacity, preset.capacity, name);
      assert.strictEqual(system.scene, scene, name);
    }
  });

  QUnit.test("the systems make nothing until they are told to", (assert) => {
    const bursts = new ParticleBursts(scene);

    for (const system of Object.values(bursts.systems)) assert.strictEqual(system.emitRate, 0);
  });

  QUnit.test("a burst is made by hand, and the trail by the second", (assert) => {
    const { systems } = new ParticleBursts(scene);

    for (const name of ["spark", "glitter", "firework", "puff"]) assert.strictEqual(systems[name].manualEmitCount, 0, name);
    assert.strictEqual(systems.trail.manualEmitCount, -1, "-1 is: go by emitRate");
  });

  QUnit.test("they share one texture", (assert) => {
    const bursts = new ParticleBursts(scene);

    assert.true(Object.values(bursts.systems).every((s) => s.particleTexture === bursts.texture));
  });

  QUnit.test("the settings of a kind come from its preset", (assert) => {
    const { spark } = PARTICLE_PRESETS;
    const system = new ParticleBursts(scene).systems.spark;

    assert.deepEqual([system.minSize, system.maxSize], spark.size);
    assert.deepEqual([system.minLifeTime, system.maxLifeTime], spark.life);
    assert.deepEqual([system.minEmitPower, system.maxEmitPower], spark.power);
    assert.strictEqual(system.gravity.y, spark.gravity);
    assert.deepEqual([system.direction1.x, system.direction1.y, system.direction1.z], spark.spread.slice(0, 3));
    assert.deepEqual([system.direction2.x, system.direction2.y, system.direction2.z], spark.spread.slice(3));
    assert.strictEqual(system.color1.hex, `${spark.colors[0]}FF`);
  });

  QUnit.test("the particles fade out as they die: the dead color is see-through", (assert) => {
    const system = new ParticleBursts(scene).systems.puff;

    assert.strictEqual(system.colorDead.hex, `${PARTICLE_PRESETS.puff.colors[1]}00`);
  });

  QUnit.test("sparks are added light, and a puff is drawn as it is", (assert) => {
    const { systems } = new ParticleBursts(scene);

    assert.strictEqual(systems.spark.blendMode, FakeParticleSystem.BLENDMODE_ONEONE);
    assert.strictEqual(systems.puff.blendMode, FakeParticleSystem.BLENDMODE_STANDARD);
  });

  QUnit.test("burst() puts the emitter at the point and asks for the preset's count", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.burst("spark", 1.5, 2, 30);

    const system = bursts.systems.spark;
    assert.deepEqual([system.emitter.x, system.emitter.y, system.emitter.z], [1.5, 2, 30]);
    assert.strictEqual(system.manualEmitCount, PARTICLE_PRESETS.spark.count);
  });

  QUnit.test("a burst of one kind leaves the other alone", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.burst("puff", 0, 0, 5);

    assert.strictEqual(bursts.systems.spark.manualEmitCount, 0);
  });

  QUnit.test("burst() can be called again for another burst", (assert) => {
    const bursts = new ParticleBursts(scene);
    bursts.burst("spark", 0, 0, 1);
    bursts.systems.spark.manualEmitCount = 0; // the system has made them, and counted back to 0

    bursts.burst("spark", 2, 0, 9);

    assert.strictEqual(bursts.systems.spark.manualEmitCount, PARTICLE_PRESETS.spark.count);
    assert.strictEqual(bursts.systems.spark.emitter.z, 9);
  });

  QUnit.test("a kind that doesn't exist is a mistake, and says which", (assert) => {
    const bursts = new ParticleBursts(scene);

    assert.throws(() => bursts.burst("confetti", 0, 0, 0), /no kind of burst called "confetti"/);
  });

  QUnit.test("amount makes more of everything, or less, and never more than a system can hold", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.amount = 0.5;
    bursts.burst("spark", 0, 0, 0);
    assert.strictEqual(bursts.systems.spark.manualEmitCount, PARTICLE_PRESETS.spark.count / 2);

    bursts.amount = 100;
    bursts.burst("spark", 0, 0, 0);
    assert.strictEqual(bursts.systems.spark.manualEmitCount, PARTICLE_PRESETS.spark.capacity);
  });

  QUnit.test("trail() puts the trail at a point and sets how many a second", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.trail(3, 1, -2, 25);

    const system = bursts.systems.trail;
    assert.deepEqual([system.emitter.x, system.emitter.y, system.emitter.z], [3, 1, -2]);
    assert.strictEqual(system.emitRate, 25);
  });

  QUnit.test("a trail of 0 stops it, and amount changes it", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.trail(0, 0, 0, 0);
    assert.strictEqual(bursts.systems.trail.emitRate, 0);

    bursts.amount = 2;
    bursts.trail(0, 0, 0, 25);
    assert.strictEqual(bursts.systems.trail.emitRate, 50);
  });

  QUnit.test("setFrozen(true) holds every system still, and setFrozen(false) lets them go on at their own speed", (assert) => {
    const bursts = new ParticleBursts(scene);
    bursts.systems.puff.updateSpeed = 0.01;

    bursts.setFrozen(true);
    assert.true(Object.values(bursts.systems).every((s) => s.updateSpeed === 0));

    bursts.setFrozen(false);
    assert.true(Object.values(bursts.systems).every((s) => s.updateSpeed === 0.01));
  });

  QUnit.test("dispose() gets rid of everything it made", (assert) => {
    const bursts = new ParticleBursts(scene);
    const systems = Object.values(bursts.systems);

    bursts.dispose();

    assert.true(systems.every((s) => s.disposed));
    assert.true(bursts.texture.disposed);
    assert.deepEqual(bursts.systems, {});
  });
});
```

Things to notice:

- **The presets are tested as data**: every burst fits in its system, every range goes from small to big, every colour is a real one, a firework is the biggest burst. If someone edits a number and gets it backwards, a test says which.
- **`trailRate` is tested at the edges**: still, a quarter, the top, and faster than the top.
- **`ParticleBursts` is tested against a stand-in** for Babylon.js: a tiny fake `ParticleSystem`, `Vector3`, `Color4` and `DynamicTexture` that remember what was set on them. Making real particles needs a graphics card, and these tests need only to know *what the code asked for*.
- **The real `BABYLON` is put back after each test** (`realBabylon`). The tests swap in the fake by replacing a global, and every later test in the page needs the real one, so forgetting to restore it would make a lot of *other* tests fail, in a confusing way.
- **Two of the tests guard mistakes**: *"a burst is made by hand, and the trail by the second"* checks the `-1`, and *"amount ... never more than a system can hold"* checks the cap.

Open `tests.html`. You should see **548 passing tests**: 28 more.

---

## Step 2: A camera shake

A shake is a *number that dies away*. It starts at the size of the knock, and fades to nothing; the view is moved by an amount that wobbles with it. Nothing in it is about Babylon.js: it takes the time and gives an offset, in world units, and it is the game that adds the offset to the view. So the whole effect is plain code, and can be tested exactly. Open the placeholder `js/shake.js` and replace its contents with:

```js
// A camera shake: a knock that makes the view jolt, and settle. It is a number that starts at the strength of the knock
// and fades to nothing, and the view is moved by an amount that wobbles with it. Nothing here touches the camera: it
// gives an offset, in world units, for the game to add to the view. See ../tests/shake.tests.js.

const SHAKE_DURATION = 0.4; // how long a shake lasts, in seconds
const SHAKE_STRENGTH = 0.5; // how far the view is thrown at the start of one, in world units
const SHAKE_SPEED = 55; // how fast it wobbles, in radians a second

// How much of a shake is left, from 1 when it starts to 0 when it is over. It fades quickly at first, and then
// settles, which is how a knock feels (a straight fade feels like a machine).
function shakeFade(age, duration = SHAKE_DURATION) {
  if (age >= duration) return 0;
  const left = 1 - Math.max(0, age) / duration;
  return left * left;
}

// Where the shake has put the view `age` seconds in, for a knock of `strength`: a pair of numbers (across and up the
// screen) that wobble with different speeds, so it jumps about and doesn't just slide back and forth.
function shakeOffset(age, strength = SHAKE_STRENGTH, duration = SHAKE_DURATION) {
  const amount = strength * shakeFade(age, duration);
  return { x: Math.sin(age * SHAKE_SPEED) * amount, y: Math.cos(age * SHAKE_SPEED * 1.3 + 1) * amount };
}

class Shake {
  constructor({ duration = SHAKE_DURATION, strength = SHAKE_STRENGTH } = {}) {
    this.duration = duration;
    this.strength = strength; // the strength of a knock of size 1: it can be changed while the game runs
    this.age = duration; // a shake that is over
    this.size = 0;
  }

  get active() {
    return this.age < this.duration;
  }

  // A knock of `size` (1 is a full one, 0.3 a little one). One that comes in the middle of a shake starts it over,
  // unless it is a smaller knock than what is left.
  knock(size = 1) {
    if (this.active && size < this.size * shakeFade(this.age, this.duration)) return;
    this.age = 0;
    this.size = size;
  }

  // Time passes (only while the game is going: a pause stops a shake where it is).
  update(dt) {
    if (this.active) this.age += dt;
  }

  // Where the view is moved to, across and up the screen: nothing, when there is no shake.
  get offset() {
    if (!this.active) return { x: 0, y: 0 };
    return shakeOffset(this.age, this.strength * this.size, this.duration);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SHAKE_DURATION, SHAKE_STRENGTH, SHAKE_SPEED, shakeFade, shakeOffset, Shake };
} else {
  Object.assign(window, { SHAKE_DURATION, SHAKE_STRENGTH, SHAKE_SPEED, shakeFade, shakeOffset, Shake });
}
```

Things to notice:

- **`shakeFade` is squared**, so it falls quickly and then settles. That is how a knock *feels*: a straight fade feels like a machine switching off.
- **`shakeOffset` uses a different wobble for across and up** (the `1.3` and the `+ 1`), so the view jumps about, and doesn't slide along a line. It is a plain function of time, so the same moment is always the same shake, and the test can say exactly what it should be.
- **`Shake` is the state**: how old the current shake is, and how big. `knock(size)` starts one (a bump is 1, the goal is a gentle 0.4). A new knock in the middle of one starts it over, **unless it is smaller than what is left**, so a little bump doesn't cut a big shake short.
- **`update(dt)` takes the time.** The game gives it 0 while paused, so a shake stops where it is, and goes on when the game does. It isn't told how long, because it doesn't need to be: the game decides what time is.
- **`strength` can be changed while the game runs.** 0 is *no shake at all*, which matters: some people find a shaking screen unpleasant.

### Tests

Add the script to **both** pages, below `particles.js`:

```html
  <script src="js/shake.js"></script>
```

and in `tests.html` (the script below `particles.js` and the tests below `particles.tests.js`):

```html
  <script src="js/shake.js"></script>
  <script src="tests/shake.tests.js"></script>
```

Open the placeholder `tests/shake.tests.js` and replace its contents with:

```js
QUnit.module("shakeFade", () => {
  QUnit.test("starts at 1 and is 0 when the shake is over", (assert) => {
    assert.strictEqual(shakeFade(0, 0.4), 1);
    assert.strictEqual(shakeFade(0.4, 0.4), 0);
    assert.strictEqual(shakeFade(5, 0.4), 0);
  });

  QUnit.test("fades quickly at first and then settles: it is below a straight fade in the middle", (assert) => {
    assert.true(shakeFade(0.2, 0.4) < 0.5);
    assert.strictEqual(shakeFade(0.2, 0.4), 0.25);
  });

  QUnit.test("never goes up", (assert) => {
    let last = 1;
    for (let age = 0; age <= 0.4; age += 0.02) {
      const fade = shakeFade(age, 0.4);
      assert.true(fade <= last + 1e-12, `at ${age}`);
      last = fade;
    }
  });

  QUnit.test("a time before the start counts as the start", (assert) => {
    assert.strictEqual(shakeFade(-1, 0.4), 1);
  });
});

QUnit.module("shakeOffset", () => {
  QUnit.test("is never further than the strength", (assert) => {
    for (let age = 0; age < 0.5; age += 0.01) {
      const { x, y } = shakeOffset(age, 0.5, 0.4);
      assert.true(Math.hypot(x, y) <= 0.5 * Math.SQRT2 + 1e-9, `at ${age}`);
    }
  });

  QUnit.test("is nothing when the shake is over", (assert) => {
    assert.deepEqual(shakeOffset(0.4, 0.5, 0.4), { x: 0, y: 0 });
  });

  QUnit.test("a bigger strength throws the view further", (assert) => {
    const small = shakeOffset(0.05, 0.2, 0.4);
    const big = shakeOffset(0.05, 0.8, 0.4);

    assert.true(Math.hypot(big.x, big.y) > Math.hypot(small.x, small.y));
  });

  QUnit.test("across and up have a wobble of their own, so the view jumps about and doesn't slide to and fro", (assert) => {
    const ratios = new Set();
    for (const age of [0.01, 0.03, 0.05, 0.07]) {
      const { x, y } = shakeOffset(age, 1, 0.4);
      ratios.add(Math.round((x / y) * 100));
    }

    assert.true(ratios.size > 1);
  });

  QUnit.test("is the same every time for the same moment", (assert) => {
    assert.deepEqual(shakeOffset(0.123, 0.5, 0.4), shakeOffset(0.123, 0.5, 0.4));
  });
});

QUnit.module("Shake", () => {
  QUnit.test("starts still: no shake, and no offset", (assert) => {
    const shake = new Shake();

    assert.false(shake.active);
    assert.deepEqual(shake.offset, { x: 0, y: 0 });
  });

  QUnit.test("a knock starts a shake that moves the view", (assert) => {
    const shake = new Shake();

    shake.knock();
    shake.update(0.02);

    assert.true(shake.active);
    assert.notDeepEqual(shake.offset, { x: 0, y: 0 });
  });

  QUnit.test("it is over after its duration", (assert) => {
    const shake = new Shake({ duration: 0.4 });
    shake.knock();

    shake.update(0.3);
    assert.true(shake.active);

    shake.update(0.15);
    assert.false(shake.active);
    assert.deepEqual(shake.offset, { x: 0, y: 0 });
  });

  QUnit.test("a little knock is a smaller shake than a full one", (assert) => {
    const full = new Shake();
    const little = new Shake();
    full.knock(1);
    little.knock(0.25);
    full.update(0.03);
    little.update(0.03);

    assert.true(Math.hypot(full.offset.x, full.offset.y) > Math.hypot(little.offset.x, little.offset.y));
  });

  QUnit.test("strength can be changed while the game runs, and 0 means no shake at all", (assert) => {
    const shake = new Shake();
    shake.strength = 0;

    shake.knock();
    shake.update(0.03);

    assert.deepEqual(shake.offset, { x: 0, y: 0 });
  });

  QUnit.test("a knock in the middle of a shake starts it over", (assert) => {
    const shake = new Shake({ duration: 0.4 });
    shake.knock();
    shake.update(0.35);

    shake.knock();

    assert.strictEqual(shake.age, 0);
  });

  QUnit.test("but a small knock doesn't cut short a big shake that is still strong", (assert) => {
    const shake = new Shake({ duration: 0.4 });
    shake.knock(1);
    shake.update(0.05);

    shake.knock(0.2);

    assert.strictEqual(shake.age, 0.05);
    assert.strictEqual(shake.size, 1);
  });

  QUnit.test("time that doesn't pass (a pause) doesn't move a shake on", (assert) => {
    const shake = new Shake();
    shake.knock();
    shake.update(0.1);
    const before = shake.offset;

    shake.update(0);

    assert.deepEqual(shake.offset, before);
  });

  QUnit.test("update() with no shake does nothing", (assert) => {
    const shake = new Shake();

    shake.update(1);

    assert.false(shake.active);
  });
});
```

Open `tests.html`. You should see **566 passing tests**: 18 more.

---

## Step 3: Putting it in the game

Nothing so far changes how the game looks, because nothing has *used* these. This step is all in `js/main.js`.

### The view

To shake the view, the game moves the whole view across and up by a little, and puts it back the next frame. An orthographic camera has four edges (`orthoLeft`, `orthoRight`, `orthoBottom`, `orthoTop`), so moving them all by the same amount moves the view, with no change to the camera, or to where the marble is. Find `fitView`, and **replace the whole of it** (down to and including its `fitView();` line) with:

```js
  // The edges are kept, so that a shake can move the whole view across and up by a little, and the next frame put it back.
  let view = viewHalfExtents(1);
  const showView = (across = 0, up = 0) => {
    camera.orthoLeft = -view.halfWidth + across;
    camera.orthoRight = view.halfWidth + across;
    camera.orthoBottom = -view.halfHeight + up;
    camera.orthoTop = view.halfHeight + up;
  };
  const fitView = () => {
    view = viewHalfExtents(engine.getAspectRatio(camera));
    showView();
  };
  fitView();
```

Things to notice:

- **The size of the view is kept** (`view`), so that `showView` can be called every frame without working it out again. It is worked out again, in `fitView`, only when the screen changes shape.
- **`showView()` with nothing in it is the view as it was**, so `fitView` still does what it did.

### Making them, and using them

Below the line `const screens = new Screens(document);` add:

```js
  // The finishing touches: particles (sparks, glitter, a firework, a puff, a trail) and a shake of the camera.
  const effects = new ParticleBursts(scene);
  const shake = new Shake();
```

Then each thing that happens gets its effect, directly below the sound that is already there. At the **goal**, in `reachZone`, below `sounds.play("goal");`:

```js
        effects.burst("firework", marble.position.x, marble.position.y + 0.5, marble.position.z);
        shake.knock(0.4);
```

At a **checkpoint**, below `sounds.play("checkpoint");`:

```js
    effects.burst("glitter", marble.position.x, marble.position.y + 0.3, marble.position.z);
```

At a **bump**, in the function given to `watchHits`, below `sounds.play("bump");`:

```js
      effects.burst("spark", marble.position.x, marble.position.y, marble.position.z);
      shake.knock(1);
```

### A dissolve takes a moment

A marble that dissolves should *be seen to*: if it were put back at once, the puff would burst over a marble that is already gone. So a dissolve now has a short wait. The marble disappears into the puff, stays where it was for a second and a half, and then drops again.

First a constant, directly **above** `const END_PAUSE_MS`:

```js
const DISSOLVE_PAUSE = 1.5; // seconds a dissolved marble is a puff, before it drops again
```

Then `dropAgain` has to put the marble back in sight, and forget the wait. Find `dropAgain` and **delete the old one**, then add this in its place:

```js
  let dissolveWait = 0; // seconds left of the puff, while a dissolved marble is gone
  const dropAgain = () => {
    marble.reset();
    marble.mesh.isVisible = true;
    dissolveWait = 0;
    exposure.reset();
  };
```

In the frame function, find the block that starts with the comment `// Slime slows the marble`. **Delete the old one** (down to and including its closing `}`), and add this in its place:

```js
    // Slime slows the marble and turns it green, and if it stays in too long, it dissolves, and starts again.
    if (!game.frozen && run.status === "running") {
      if (dissolveWait > 0) {
        // The marble is a puff: out of sight and held where it dissolved, until the puff has been seen.
        dissolveWait -= dt;
        marble.glideTo(marble.position);
        if (dissolveWait <= 0) dropAgain();
      } else {
        exposure.tick(dt);
        marble.slow(exposure.inSlime);
        marble.tint(exposure.level);
        if (exposure.dissolved) {
          say("Dissolved!", "Keep out of the slime");
          sounds.play("dissolve");
          effects.burst("puff", marble.position.x, marble.position.y, marble.position.z);
          marble.mesh.isVisible = false;
          dissolveWait = DISSOLVE_PAUSE;
        }
      }
    }
```

Lastly, a puff can't be steered. In the frame function, find the line `if (!game.frozen && run.status === "running") {` just above `const stick = combineSticks(`, and add the new condition to it:

```js
    if (!game.frozen && run.status === "running" && dissolveWait <= 0) {
```

Things to notice:

- **The marble is hidden, not removed** (`isVisible`). Its body is still there, so it is held in place (`glideTo` its own position stops it rolling off), and nothing about the physics had to change.
- **The puff is made when the marble is hidden.** It does not need the marble: it is a burst at a point.
- **`dropAgain` ends the wait.** So **R**, a new level, and a new run all bring the marble back, whatever it was doing.
- **The clock keeps running** in the wait. A dissolve costs a second and a half as well as the way back, which is what slime should cost.
- **No steering during the wait**, because there is nothing to steer.

### Every frame

In the frame function, directly **above** the line `const sunAt = sunPosition(...)`, add:

```js
    // The finishing touches. A trail behind a marble that is going fast, but not while the game is held (a pause, a
    // result), and every particle is held with it. A shake moves the view a little, and dies away.
    effects.setFrozen(game.frozen);
    const speed = Math.hypot(marble.velocity.x, marble.velocity.z);
    const rate = game.frozen || run.status !== "running" ? 0 : trailRate(speed, TOP_SPEED);
    effects.trail(marble.position.x, marble.position.y, marble.position.z, rate);
    shake.update(dt);
    showView(shake.offset.x, shake.offset.y);
```

Things to notice:

- **Every effect is next to the sound for the same event.** An event is *something that happens*: a sound, a message, a spark and a shake are four reactions to it, and keeping them together means a new event is easy to give all four.
- **The big events get the big effects.** A bump is a full shake (1); the goal is a gentle one (0.4), because the player is about to read a message and is not being hit.
- **The trail only runs while the run is on.** Not in a pause (`game.frozen`), and not once the level is won or lost (`run.status`).
- **`effects.setFrozen(game.frozen)` runs every frame**, and so does `shake.update(dt)`, where `dt` is already 0 in a pause. Nothing about *the pause* had to be written for the new effects: they ask the same question as everything else.
- **`trailRate(speed, TOP_SPEED)`** reads the player's real top speed, from `steering.js`, so if that changes, the trail follows.
- **The marble's speed is flat** (`x` and `z` only): rolling down a ramp is going fast, but falling is not a trail.

Open the game and roll into an enemy (*The Bridge* has one; press **N** to get there). You should see **orange sparks** and a short **shake**. Reach a checkpoint for the glitter and the goal for the firework, and roll at speed for the trail. Open `tests.html` too: the count is still **566**, because this step is glue.

---

## Step 4: A panel of sliders

You will want to change numbers *while you play*: how shiny the marble is, how hard it is pushed, how big a shake feels. Changing a number in a file and reloading, over and over, is slow, and a number that is right on a desktop may be wrong on a phone. So the game gets a **developer mode**: with `?dev` on the end of the address, a panel of sliders appears over the game, and moving one changes the game *at once*. A player never sees it.

The panel is built from a **table of rows**, so a later part of the game (or you) adds a slider by adding a line. Open the placeholder `js/devpanel.js` and replace its contents with:

```js
// The developer panel: sliders for the numbers worth adjusting while you play, to see what they do at once.
// It is only made when the address ends in ?dev, so a player never sees it. Each row is plain data (a label,
// a range, and how to read and write the number), so a later part of the game adds a row, not a new panel.
// See ../tests/devpanel.tests.js.

const DEV_KEY = "Backquote"; // the key (the one under Esc) that shows and hides the panel

// Is developer mode asked for? `search` is the end of the address, the part from the question mark.
function devEnabled(search) {
  return new URLSearchParams(search || "").has("dev");
}

// A row for a number that is kept somewhere particular: how to read it, and how to write it.
function control(label, get, set, min, max, step = 0.01) {
  return { label, min, max, step, get, set };
}

// A row for a number that is a property of an object: slider("Gravity", world, "g", 0, 30).
function slider(label, object, key, min, max, step = 0.01) {
  return control(label, () => object[key], (value) => { object[key] = value; }, min, max, step);
}

// How many places after the point a step has (0.01 has two), so a number is shown to just that many.
function decimalsOf(step) {
  const text = String(step);
  const point = text.indexOf(".");
  return point < 0 ? 0 : text.length - point - 1;
}

function formatValue(value, step) {
  return Number(value).toFixed(decimalsOf(step));
}

// Every row as a line of text, under the title of its group, to read or to paste back into the code:
//   Marble
//     specular power: 160
function valuesText(groups) {
  const lines = [];
  for (const group of groups) {
    lines.push(group.title);
    for (const row of group.rows) lines.push(`  ${row.label}: ${formatValue(row.get(), row.step)}`);
  }
  return lines.join("\n");
}

class DevPanel {
  // `groups` is [{ title, rows: [{ label, min, max, step, get, set }] }]. It starts folded up, to a title bar,
  // if `collapsed`. `onChange(row, value)` is told of every change, and `clipboard` is where Copy puts the text.
  constructor(doc, groups, { collapsed = false, onChange = () => {}, clipboard = null } = {}) {
    this.groups = groups;
    this.onChange = onChange;
    this.clipboard = clipboard;
    this.inputs = []; // { row, input, output } for every row, to bring up to date

    this.root = doc.createElement("div");
    this.root.id = "dev-panel";

    this.head = doc.createElement("button");
    this.head.className = "dev-head";
    this.head.addEventListener("click", () => this.toggleCollapsed());
    this.root.appendChild(this.head);

    this.body = doc.createElement("div");
    this.body.className = "dev-body";
    this.root.appendChild(this.body);

    for (const group of groups) {
      const title = doc.createElement("h3");
      title.textContent = group.title;
      this.body.appendChild(title);
      for (const row of group.rows) this.body.appendChild(this._makeRow(doc, row));
    }

    this.copyButton = doc.createElement("button");
    this.copyButton.className = "dev-copy";
    this.copyButton.textContent = "Copy values";
    this.copyButton.addEventListener("click", () => this.copy());
    this.body.appendChild(this.copyButton);

    this.setCollapsed(collapsed);
  }

  // One row: its label, a slider and the number it is at.
  _makeRow(doc, row) {
    const line = doc.createElement("label");
    line.className = "dev-row";
    const name = doc.createElement("span");
    name.textContent = row.label;
    const input = doc.createElement("input");
    input.type = "range";
    input.min = row.min;
    input.max = row.max;
    input.step = row.step;
    const output = doc.createElement("output");
    // Once a slider is let go it lets go of the keyboard too, or the arrow keys would move it and not the marble.
    input.addEventListener("change", () => input.blur());
    input.addEventListener("input", () => {
      const value = Number(input.value);
      row.set(value);
      output.textContent = formatValue(value, row.step);
      this.onChange(row, value);
    });
    line.appendChild(name);
    line.appendChild(input);
    line.appendChild(output);
    this.inputs.push({ row, input, output });
    this.refresh();
    return line;
  }

  // Shows the numbers as they are now, for when the game has changed one itself.
  refresh() {
    for (const { row, input, output } of this.inputs) {
      input.value = row.get();
      output.textContent = formatValue(row.get(), row.step);
    }
  }

  get collapsed() {
    return this.root.classList.contains("collapsed");
  }

  setCollapsed(collapsed) {
    this.root.classList.toggle("collapsed", collapsed);
    this.head.textContent = collapsed ? "Dev ▸" : "Dev ▾";
  }

  toggleCollapsed() {
    this.setCollapsed(!this.collapsed);
  }

  get shown() {
    return !this.root.classList.contains("hidden");
  }

  toggleShown() {
    this.root.classList.toggle("hidden", this.shown);
  }

  text() {
    return valuesText(this.groups);
  }

  // Puts the numbers on the clipboard as text (and says so in the console), if there is a clipboard to put them on.
  async copy() {
    const text = this.text();
    console.log(text);
    if (!this.clipboard) return false;
    try {
      await this.clipboard.writeText(text);
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEV_KEY, devEnabled, control, slider, decimalsOf, formatValue, valuesText, DevPanel };
} else {
  Object.assign(window, { DEV_KEY, devEnabled, control, slider, decimalsOf, formatValue, valuesText, DevPanel });
}
```

Things to notice:

- **`devEnabled(search)` is a plain function**: `?dev` in the address, and nothing else. (`?developer` doesn't count.) It is given the address, so it can be tested, and the game gives it `location.search`.
- **A row is data**: a label, a range, a step, and how to read and write the number. `control(label, get, set, ...)` is the general one, for a number that is kept somewhere particular, and `slider(label, object, key, ...)` is the short way for a number that is a property of an object.
- **`formatValue` shows a number to as many places as its step has**, so a step of 1 shows `160` and a step of 0.01 shows `0.40`.
- **`valuesText` is every row as text**, in groups, which is what the **Copy values** button copies. Tune something by eye, copy, and paste the numbers into the code. That is the point of the panel.
- **`DevPanel` is given a document**, and doesn't use the real one, so it can be tested with a stand-in page, as `Screens` was.
- **Folding up and hiding are different things.** The title bar button *folds up* the panel to its bar (and the arrow says which it will do). `toggleShown()` hides the whole of it, and brings it back as it was: it remembers whether it was folded.
- **A slider lets go of the keyboard when you release it** (`blur`). A slider that keeps the focus would take the arrow keys, and the marble would stop answering them.
- **Copying can fail**, because there may be no clipboard, or the browser may refuse, so `copy()` says whether it worked and never throws.
- **`refresh()`** is for numbers the game has changed itself, so the sliders can catch up.

### Tests

Add the script to **both** pages, below `shake.js`:

```html
  <script src="js/devpanel.js"></script>
```

and in `tests.html` (the script below `shake.js` and the tests below `shake.tests.js`):

```html
  <script src="js/devpanel.js"></script>
  <script src="tests/devpanel.tests.js"></script>
```

Open the placeholder `tests/devpanel.tests.js` and replace its contents with:

```js
QUnit.module("devEnabled", () => {
  QUnit.test("is on when the address has ?dev", (assert) => {
    assert.true(devEnabled("?dev"));
    assert.true(devEnabled("?level=2&dev"));
    assert.true(devEnabled("?dev=1"));
  });

  QUnit.test("is off otherwise, and for a missing address", (assert) => {
    assert.false(devEnabled(""));
    assert.false(devEnabled("?level=2"));
    assert.false(devEnabled("?developer"));
    assert.false(devEnabled(undefined));
  });
});

QUnit.module("slider and the way numbers are shown", () => {
  QUnit.test("a slider reads and writes a property of an object", (assert) => {
    const world = { g: 9.8 };
    const row = slider("Gravity", world, "g", 0, 30);

    assert.strictEqual(row.get(), 9.8);
    row.set(20);
    assert.strictEqual(world.g, 20);
  });

  QUnit.test("a control reads and writes a number wherever it is kept", (assert) => {
    let kept = 5;
    const row = control("Push", () => kept, (value) => { kept = value; }, 1, 10, 1);

    row.set(8);

    assert.strictEqual(row.get(), 8);
    assert.deepEqual([row.label, row.min, row.max, row.step], ["Push", 1, 10, 1]);
  });

  QUnit.test("a slider has a label, a range, and a step of 0.01 unless told another", (assert) => {
    const row = slider("Gravity", {}, "g", 0, 30);

    assert.deepEqual([row.label, row.min, row.max, row.step], ["Gravity", 0, 30, 0.01]);
    assert.strictEqual(slider("x", {}, "x", 0, 1, 5).step, 5);
  });

  QUnit.test("decimalsOf counts the places after the point", (assert) => {
    assert.strictEqual(decimalsOf(1), 0);
    assert.strictEqual(decimalsOf(0.5), 1);
    assert.strictEqual(decimalsOf(0.01), 2);
  });

  QUnit.test("a number is shown to as many places as its step", (assert) => {
    assert.strictEqual(formatValue(160, 1), "160");
    assert.strictEqual(formatValue(0.4, 0.01), "0.40");
    assert.strictEqual(formatValue(0.123456, 0.01), "0.12");
  });

  QUnit.test("valuesText lists each row under the title of its group", (assert) => {
    const groups = [
      { title: "Marble", rows: [slider("power", { p: 160 }, "p", 1, 512, 1), slider("rim", { r: 0.7 }, "r", 0, 1)] },
      { title: "Lights", rows: [slider("sun", { s: 0.9 }, "s", 0, 2)] },
    ];

    assert.strictEqual(valuesText(groups), "Marble\n  power: 160\n  rim: 0.70\nLights\n  sun: 0.90");
  });
});

// The panel needs a page to build itself on. These give it a stand-in: elements that remember what is done to them.
QUnit.module("DevPanel", () => {
  class FakeElement {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.classes = new Set();
      this.listeners = {};
      this.textContent = "";
      this.value = "";
      this.classList = {
        add: (name) => this.classes.add(name),
        remove: (name) => this.classes.delete(name),
        toggle: (name, on) => (on ? this.classes.add(name) : this.classes.delete(name)),
        contains: (name) => this.classes.has(name),
      };
    }

    appendChild(child) {
      this.children.push(child);
    }
    addEventListener(type, callback) {
      this.listeners[type] = callback;
    }
    blur() {
      this.blurred = (this.blurred || 0) + 1;
    }
    find(tag) {
      const found = [];
      const walk = (element) => {
        if (element.tag === tag) found.push(element);
        element.children.forEach(walk);
      };
      walk(this);
      return found;
    }
  }

  const doc = { createElement: (tag) => new FakeElement(tag) };

  const make = (options) => {
    const values = { power: 160, rim: 0.7 };
    const groups = [{ title: "Marble", rows: [slider("power", values, "power", 1, 512, 1), slider("rim", values, "rim", 0, 1)] }];
    return { panel: new DevPanel(doc, groups, options), values };
  };

  QUnit.test("makes a row (a slider and its number) for every row, set to where the number is", (assert) => {
    const { panel } = make();

    const inputs = panel.root.find("input");
    assert.strictEqual(inputs.length, 2);
    assert.deepEqual(inputs.map((i) => i.type), ["range", "range"]);
    assert.deepEqual([inputs[0].min, inputs[0].max, inputs[0].step, inputs[0].value], [1, 512, 1, 160]);
    assert.deepEqual(panel.root.find("output").map((o) => o.textContent), ["160", "0.70"]);
  });

  QUnit.test("each group has its title", (assert) => {
    const { panel } = make();

    assert.deepEqual(panel.root.find("h3").map((h) => h.textContent), ["Marble"]);
  });

  QUnit.test("moving a slider changes the number, shows it, and tells onChange", (assert) => {
    const changes = [];
    const { panel, values } = make({ onChange: (row, value) => changes.push([row.label, value]) });
    const [power] = panel.root.find("input");

    power.value = "200";
    power.listeners.input();

    assert.strictEqual(values.power, 200);
    assert.strictEqual(panel.root.find("output")[0].textContent, "200");
    assert.deepEqual(changes, [["power", 200]]);
  });

  QUnit.test("a slider that has been let go lets go of the keyboard, so the arrow keys steer the marble", (assert) => {
    const { panel } = make();
    const [power] = panel.root.find("input");

    power.listeners.change();

    assert.strictEqual(power.blurred, 1);
  });

  QUnit.test("refresh() brings the sliders up to date with numbers the game has changed", (assert) => {
    const { panel, values } = make();

    values.power = 300;
    panel.refresh();

    assert.strictEqual(panel.root.find("input")[0].value, 300);
    assert.strictEqual(panel.root.find("output")[0].textContent, "300");
  });

  QUnit.test("it starts open, or folded up if asked", (assert) => {
    assert.false(make().panel.collapsed);
    assert.true(make({ collapsed: true }).panel.collapsed);
  });

  QUnit.test("the title bar button folds it up and opens it again, and says which it will do", (assert) => {
    const { panel } = make();

    panel.head.listeners.click();
    assert.true(panel.collapsed);
    assert.true(panel.head.textContent.includes("▸"));

    panel.head.listeners.click();
    assert.false(panel.collapsed);
    assert.true(panel.head.textContent.includes("▾"));
  });

  QUnit.test("toggleShown() hides the whole panel and shows it again", (assert) => {
    const { panel } = make();
    assert.true(panel.shown);

    panel.toggleShown();
    assert.false(panel.shown);
    assert.true(panel.root.classes.has("hidden"));

    panel.toggleShown();
    assert.true(panel.shown);
  });

  QUnit.test("hiding the panel doesn't forget whether it was folded up", (assert) => {
    const { panel } = make({ collapsed: true });

    panel.toggleShown();
    panel.toggleShown();

    assert.true(panel.collapsed);
  });

  QUnit.test("copy() puts the numbers on the clipboard as text", async (assert) => {
    const written = [];
    const { panel } = make({ clipboard: { writeText: async (text) => written.push(text) } });

    const done = await panel.copy();

    assert.true(done);
    assert.deepEqual(written, ["Marble\n  power: 160\n  rim: 0.70"]);
  });

  QUnit.test("copy() without a clipboard, or with one that refuses, doesn't fail", async (assert) => {
    assert.false(await make().panel.copy());
    assert.false(await make({ clipboard: { writeText: async () => { throw new Error("no"); } } }).panel.copy());
  });

  QUnit.test("the Copy button copies", (assert) => {
    const { panel } = make();
    let copied = 0;
    panel.copy = () => copied++;

    panel.copyButton.listeners.click();

    assert.strictEqual(copied, 1);
  });
});
```

Open `tests.html`. You should see **586 passing tests**: 20 more.

---

## Step 5: Showing the panel

The panel needs a style, and a style is a new part of the page, so it is a **new file** with a `<link>`. Create `css/devpanel.css` in **this** sample's `css/` folder:

```css
/* The developer panel (see devpanel.js): sliders on the left of the screen, above the pause and sound buttons, only there with ?dev in the address.
   It folds up to its title bar, and a short screen starts it folded up, so it never covers the marble in the middle. */
#dev-panel {
  position: fixed;
  left: 8px;
  bottom: 152px;
  z-index: 30;
  width: min(300px, 80vw);
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  padding: 6px 10px 10px;
  border: 2px solid var(--yellow);
  background: rgba(11, 9, 9, 0.88);
  color: var(--chrome-light);
  font: 600 14px/1.3 var(--small-font);
}
#dev-panel.hidden {
  display: none;
}
#dev-panel .dev-head {
  width: 100%;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--yellow);
  font: 400 18px var(--title-font);
  text-align: left;
  letter-spacing: 0.06em;
}
#dev-panel.collapsed .dev-body {
  display: none;
}
#dev-panel.collapsed {
  width: auto;
}
#dev-panel h3 {
  margin: 10px 0 2px;
  color: var(--orange);
  font: 400 14px var(--title-font);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
#dev-panel .dev-row {
  display: grid;
  grid-template-columns: 84px 1fr 44px;
  align-items: center;
  gap: 6px;
}
#dev-panel .dev-row input {
  width: 100%;
  min-width: 0;
}
#dev-panel output {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
#dev-panel .dev-copy {
  margin-top: 10px;
  padding: 4px 12px;
  font-size: 16px;
}
@media (max-height: 520px) {
  #dev-panel {
    max-height: calc(100vh - 170px);
  }
}
```

and add its link to `index.html`, below the one for `controls.css`:

```html
  <link rel="stylesheet" href="css/devpanel.css">
```

Things to notice:

- **It sits on the left, above the pause and sound buttons.** The camera keeps the marble in the middle of the screen, so nothing may sit there; the right has the next-level and drop buttons, and the top has the clock. The left is what is free.
- **It scrolls** (`overflow-y: auto`) if it is taller than the screen, and a short screen (`max-height: 520px`) gives it less.
- **`#dev-panel.collapsed .dev-body` is hidden**, which is the whole of folding up: one class.

Now `js/main.js`. Directly below the line `engine.onResizeObservable.add(fitView);`, add:

```js
  // Developer mode, with ?dev on the end of the address: a panel of sliders to change things while the game runs,
  // to see what they do. Each is a row, so a later part of the game adds a row, not a new panel. The key under Esc
  // hides the panel, and its title bar folds it up (it starts folded up on a phone, which has little room).
  if (devEnabled(location.search)) {
    const steel = marble.mesh.material;
    const rim = steel.emissiveFresnelParameters;
    const physics = scene.getPhysicsEngine();
    const panel = new DevPanel(
      document,
      [
        {
          title: "Game",
          rows: [control("level", () => levelIndex + 1, (value) => loadLevel(value - 1), 1, LEVELS.length, 1)],
        },
        {
          title: "Marble look",
          rows: [
            slider("body red", steel.diffuseColor, "r", 0, 1),
            slider("body green", steel.diffuseColor, "g", 0, 1),
            slider("body blue", steel.diffuseColor, "b", 0, 1),
            slider("shine", steel, "specularPower", 1, 512, 1),
            slider("rim red", rim.rightColor, "r", 0, 1),
            slider("rim green", rim.rightColor, "g", 0, 1),
            slider("rim blue", rim.rightColor, "b", 0, 1),
            slider("rim power", rim, "power", 0.5, 8),
            slider("rim bias", rim, "bias", 0, 1),
          ],
        },
        {
          title: "Feel",
          rows: [
            control("push", () => marble.steer.force ?? STEER_FORCE, (value) => (marble.steer.force = value), 5, 60, 1),
            control("top speed", () => marble.steer.topSpeed ?? TOP_SPEED, (value) => (marble.steer.topSpeed = value), 4, 30, 0.5),
            control("gravity", () => -physics.gravity.y, (value) => physics.setGravity(new BABYLON.Vector3(0, -value, 0)), 1, 30, 0.1),
          ],
        },
        {
          title: "Light and effects",
          rows: [
            slider("sky light", sky, "intensity", 0, 2),
            slider("sun light", sun, "intensity", 0, 2),
            slider("particles", effects, "amount", 0, 3, 0.1),
            slider("shake", shake, "strength", 0, 2),
          ],
        },
      ],
      {
        collapsed: window.matchMedia("(max-height: 520px), (max-width: 640px)").matches,
        clipboard: navigator.clipboard,
      }
    );
    document.body.appendChild(panel.root);
    window.addEventListener("keydown", (event) => {
      if (event.code === DEV_KEY && !event.repeat && !typesText(event)) panel.toggleShown();
    });
  }
```

Things to notice:

- **The whole panel is inside `if (devEnabled(location.search))`.** Without `?dev` none of it is made, so there is nothing to slow the game, or to find.
- **Four groups of rows**: the game (a **level** slider, which jumps to any of the ten, which is how you test the last one without playing nine first), the marble's look (its body colour, its shine and its glowing rim, which are the numbers you chose in Step 1 of the last tutorial), the feel (push, top speed and gravity), and the lights and the effects.
- **The marble's push and top speed work because of an option.** The player's `Marble` is given an empty `steer` object, and `steeringForce` takes `force` and `topSpeed` *from it* when they are there, and its own values when they aren't. So the row reads `marble.steer.force ?? STEER_FORCE` and writes `marble.steer.force`. This is the options pattern from the Enemies tutorial, used for something it wasn't made for.
- **Gravity is a pair**, `physics.gravity` to read and `physics.setGravity(...)` to write, so it is a `control`, not a `slider`. It is shown as a positive number (24) though it pulls *down*.
- **It starts folded up on a small screen** (`matchMedia`), so on a phone it is a small bar and not a wall.
- **The key under Esc** (`DEV_KEY`) hides and shows it, and, like every key, it ignores a key typed in a text box (`typesText`).
- **A later tutorial or experiment adds a row.** Make a number something the panel can reach (a property of an object, or a pair of functions) and add a line.

Open the game with **`?dev`** on the end of the address, for example `http://localhost:3000/samples/rolling_rampage/rolling_rampage_polish/?dev`. You should see the panel. Drag **shine** and watch the highlight on the marble change as you drag. Press the key under **Esc** to hide it and again to bring it back, and click **Dev** to fold it up.

---

## Step 6: Seven more levels

Three levels is a short game. A level is *data* (a grid of heights, a start, a goal, some checkpoints, and the hazards), so more levels need no new *code*: only more data, put together with care. Each of the seven below is built around one idea, and adds one thing to the last, so the game keeps teaching, and the last one uses all of it.

| # | Name | The idea | New |
|---|---|---|---|
| 4 | Switchback | three lanes, joined at the ends, going **down** | two checkpoints, a long way round with edges on both sides |
| 5 | Stepping Stones | four islands joined by bridges **one square wide** | nothing to hit: only your steering |
| 6 | Crusher Row | a narrow corridor with **four pistons** and two puddles | timing, in a space too narrow to go round |
| 7 | Slime Pit | a wide room with **six puddles** and two enemies | a route to choose, with enemies pushing you toward the slime |
| 8 | Ferry Crossing | **two moving platforms** with an enemy on the island between | waiting for a ferry |
| 9 | Hill Climb | switchbacks going **up**, with two enemies above you | rolling *uphill* at things that roll down |
| 10 | Rampage | a bit of everything, and the longest | a start deck, a piston, a slime floor with enemies, a platform |

Open `js/level.js`. Paste the seven levels directly **below** the closing `},` of *Hazard Alley*, and **above** the `];` that closes `LEVELS` (delete the empty line there, if there is one):

```js
  {
    name: "Switchback",
    start: { col: 2, row: 2.5 },
    time: 85,
    goal: { col: 27.5, row: 12.5 },
    checkpoints: [{ col: 28, row: 5, bonus: 12 }, { col: 1.5, row: 10, bonus: 12 }],
    enemies: [{ col: 15, row: 7.5 }],
    rows: [
      "..............................",
      "888887777777776666666665555555",
      "888887777777776666666665555555",
      "888887777777776666666665555555",
      "888887777777776666666665555555",
      "..........................5555",
      "222222223333333444444455555555",
      "222222223333333444444455555555",
      "222222223333333444444455555555",
      "222222223333333444444455555555",
      "2222..........................",
      "222222222221111111111110000000",
      "222222222221111111111110000000",
      "222222222221111111111110000000",
      "222222222221111111111110000000",
    ],
  },
  {
    name: "Stepping Stones",
    start: { col: 1.5, row: 4 },
    time: 75,
    goal: { col: 34, row: 4 },
    checkpoints: [{ col: 12.5, row: 4, bonus: 12 }, { col: 23.5, row: 4, bonus: 12 }],
    rows: [
      ".....................................",
      ".....................................",
      "33333.....333333.....444444.....44444",
      "33333.....333333.....444444.....44444",
      "3333333333333333334444444444444444444",
      "3333333333333333334444444444444444444",
      "33333.....333333.....444444.....44444",
      ".....................................",
      ".....................................",
    ],
  },
  {
    name: "Crusher Row",
    start: { col: 2, row: 4 },
    time: 85,
    goal: { col: 37, row: 4 },
    checkpoints: [{ col: 19.5, row: 4, bonus: 15 }],
    slime: [{ col: 11, row: 4, radius: 1.4 }, { col: 29, row: 4, radius: 1.2 }],
    movers: [
      { kind: "piston", at: { col: 7, row: 4 }, height: 4, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 3.6 },
      { kind: "piston", at: { col: 15, row: 4 }, height: 4, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 3.2, phase: 0.5 },
      { kind: "piston", at: { col: 25, row: 4 }, height: 4, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 3, phase: 0.25 },
      { kind: "piston", at: { col: 33, row: 4 }, height: 4, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 2.8 },
    ],
    rows: [
      "........................................",
      "........................................",
      "........................................",
      "4444444444444444444444444444444444444444",
      "4444444444444444444444444444444444444444",
      "4444444444444444444444444444444444444444",
      "........................................",
      "........................................",
      "........................................",
    ],
  },
  {
    name: "Slime Pit",
    start: { col: 2, row: 7 },
    time: 90,
    goal: { col: 24, row: 7 },
    checkpoints: [{ col: 13, row: 7, bonus: 15 }],
    enemies: [{ col: 15, row: 2.5 }, { col: 15, row: 11.5 }],
    slime: [{ col: 7, row: 4, radius: 1.8 }, { col: 7, row: 10, radius: 1.8 }, { col: 11, row: 7, radius: 1.6 }, { col: 17.5, row: 5, radius: 2 }, { col: 17.5, row: 9.5, radius: 2 }, { col: 21, row: 7, radius: 1.5 }],
    rows: [
      "...........................",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "333333333333333333333333333",
      "...........................",
    ],
  },
  {
    name: "Ferry Crossing",
    start: { col: 1.5, row: 4 },
    time: 80,
    goal: { col: 27, row: 4 },
    checkpoints: [{ col: 13, row: 4, bonus: 15 }],
    enemies: [{ col: 15.5, row: 3 }],
    movers: [
      { kind: "platform", from: { col: 5.25, row: 4 }, to: { col: 8.75, row: 4 }, height: 4, size: { x: 5, z: 6 }, period: 14 },
      { kind: "platform", from: { col: 17.25, row: 4 }, to: { col: 20.75, row: 4 }, height: 4, size: { x: 5, z: 6 }, period: 12, phase: 0.5 },
    ],
    rows: [
      "..............................",
      "..............................",
      "44444.....4444444.....44444444",
      "44444.....4444444.....44444444",
      "44444.....4444444.....44444444",
      "44444.....4444444.....44444444",
      "44444.....4444444.....44444444",
      "..............................",
      "..............................",
    ],
  },
  {
    name: "Hill Climb",
    start: { col: 2, row: 12.5 },
    time: 95,
    goal: { col: 27.5, row: 2.5 },
    checkpoints: [{ col: 28, row: 10, bonus: 15 }, { col: 1.5, row: 5, bonus: 15 }],
    enemies: [{ col: 20, row: 2.5 }, { col: 14, row: 7.5 }],
    rows: [
      "..............................",
      "666666666777777778888888999999",
      "666666666777777778888888999999",
      "666666666777777778888888999999",
      "666666666777777778888888999999",
      "6666..........................",
      "666666665555555444444433333333",
      "666666665555555444444433333333",
      "666666665555555444444433333333",
      "666666665555555444444433333333",
      "..........................3333",
      "000001111111112222222223333333",
      "000001111111112222222223333333",
      "000001111111112222222223333333",
      "000001111111112222222223333333",
    ],
  },
  {
    name: "Rampage",
    start: { col: 2, row: 5 },
    time: 120,
    goal: { col: 43, row: 5 },
    checkpoints: [{ col: 7.5, row: 6.5, bonus: 15 }, { col: 31, row: 5, bonus: 20 }],
    enemies: [{ col: 20, row: 3 }, { col: 20, row: 7 }],
    slime: [{ col: 18.5, row: 4, radius: 1.8 }, { col: 22, row: 6.5, radius: 1.8 }],
    movers: [
      { kind: "piston", at: { col: 5, row: 5 }, height: 5, size: { x: 2.4, z: 2.4 }, rise: 1.2, period: 3.4 },
      { kind: "platform", from: { col: 34.25, row: 5 }, to: { col: 37.75, row: 5 }, height: 4, size: { x: 5, z: 6 }, period: 12 },
    ],
    rows: [
      "..............................................",
      "..............................................",
      "5555555555544332222222222233444444.....4444444",
      "5555555555544332222222222233444444.....4444444",
      "5555555555544332222222222233444444.....4444444",
      "5555555555544332222222222233444444.....4444444",
      "5555555555544332222222222233444444.....4444444",
      "5555555555544332222222222233444444.....4444444",
      "5555555555544332222222222233444444.....4444444",
      "..............................................",
      "..............................................",
    ],
  },
```

Things to notice:

- **Nothing else changes.** `loadLevel`, the **N** key, the score, and the end of the game all go by `LEVELS.length`, so a game is now ten levels, and **You win!** comes after the tenth.
- **A zone needs flat floor all the way round it.** A checkpoint, the goal or a puddle reaches 1.5 units from its centre (a puddle can have a `radius` of its own), and has a border of 0.3 outside that, so the floor must be level for more than three corners across. That is why every one sits in a flat area (the turns of *Switchback* and *Hill Climb*, the islands of *Stepping Stones*, the goal's flat), and a test, written in an earlier tutorial, fails for any that doesn't.
- **A slope is at most a digit per corner.** `8888 7777` is a step of one now and then, which a marble can climb; a bigger step is a cliff, hard to climb and a fast way down. The lanes of *Switchback* and *Hill Climb* change by one digit every nine corners.
- **A moving platform has a gap, and a pattern.** The floor ends at a corner, the gap is five corners wide, and the platform goes from a quarter of a corner into the gap to a quarter before the far floor, at the same height. *Ferry Crossing* and *Rampage* use the same numbers as *Hazard Alley*, in a different place.
- **A piston stands on flat floor, not on a slope.** *Rampage* has its piston on the start deck for that reason, and the deck is wide so there is room to go round it.
- **A corridor with pistons is `3` corners across** (4 units) and a piston is 2.4 wide, so there is no way round: you wait for the gap. *Crusher Row*'s puddles are small (`1.4` and `1.2`) so that crossing one takes less time than it takes to dissolve.
- **The time is a guess, to be tuned.** The clock is the distance, a little slack, and the checkpoint bonuses. You tune it by playing (the **level** slider of the panel gets you to any level at once).

### Tests

Nothing could play these levels for you, so these tests check what *can* be checked. Open `tests/level.tests.js` and paste, **below** the last module (after its closing `});`):

```js
// The levels have to be possible, and no test can play them, so these check what can be checked: that there are ten, that
// every goal and checkpoint can be walked to from the start over floor that is not too steep a step, and that the clock
// is not shorter than the distance to the goal.
QUnit.module("the ten levels", () => {
  const grids = LEVELS.map((level) => parseLevel(level));

  // Every corner that can be reached from the start: from a corner to the next one along a row or a column, if both have
  // floor and the step between them is at most two digits (a marble can climb a step of one, and roll down more). A
  // moving platform joins the floor at one end of its way to the floor at the other.
  const reachable = (grid) => {
    const key = (col, row) => `${col},${row}`;
    const bridges = new Map();
    for (const mover of grid.movers.filter((m) => m.kind === "platform")) {
      const row = Math.round(mover.from.row);
      const left = key(Math.floor(Math.min(mover.from.col, mover.to.col) - 1), row);
      const right = key(Math.ceil(Math.max(mover.from.col, mover.to.col) + 1), row);
      bridges.set(left, right);
      bridges.set(right, left);
    }
    const seen = new Set();
    const todo = [[Math.round(grid.start.col), Math.round(grid.start.row)]];
    while (todo.length) {
      const [col, row] = todo.pop();
      if (seen.has(key(col, row))) continue;
      seen.add(key(col, row));
      const here = cornerHeight(grid, col, row);
      const next = [[col + 1, row], [col - 1, row], [col, row + 1], [col, row - 1]];
      const across = bridges.get(key(col, row));
      if (across) next.push(across.split(",").map(Number));
      for (const [c, r] of next) {
        const there = cornerHeight(grid, c, r);
        if (there === null || seen.has(key(c, r))) continue;
        if (across && key(c, r) === across || Math.abs(there - here) <= 2 * HEIGHT_STEP + 1e-9) todo.push([c, r]);
      }
    }
    return seen;
  };

  QUnit.test("there are ten levels", (assert) => {
    assert.strictEqual(LEVELS.length, 10);
  });

  QUnit.test("the goal and every checkpoint can be walked to from the start", (assert) => {
    const problems = [];
    for (const grid of grids) {
      const seen = reachable(grid);
      for (const zone of [grid.goal, ...grid.checkpoints]) {
        if (!seen.has(`${Math.round(zone.col)},${Math.round(zone.row)}`)) problems.push(`${grid.name}: nothing reaches ${zone.col}, ${zone.row}`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("the clock gives a second for every six units between the start and the goal, at least", (assert) => {
    for (const grid of grids) {
      const distance = Math.hypot((grid.goal.col - grid.start.col) * CELL, (grid.goal.row - grid.start.row) * CELL);
      assert.true(grid.time >= distance / 6, `${grid.name}: ${grid.time} seconds for ${Math.round(distance)} units`);
    }
  });

  QUnit.test("every checkpoint is worth a few seconds, and not more than a quarter of the time", (assert) => {
    for (const grid of grids) {
      for (const checkpoint of grid.checkpoints) assert.true(checkpoint.bonus >= 5 && checkpoint.bonus <= grid.time / 4, `${grid.name}: ${checkpoint.bonus}`);
    }
  });

  QUnit.test("the levels are different: no two have the same rows", (assert) => {
    assert.strictEqual(new Set(LEVELS.map((level) => level.rows.join("/"))).size, LEVELS.length);
  });

  QUnit.test("the later levels have more in them: the last has every kind of hazard", (assert) => {
    const last = grids[grids.length - 1];
    assert.true(last.enemies.length > 0, "enemies");
    assert.true(last.slime.length > 0, "slime");
    assert.true(last.movers.some((m) => m.kind === "piston"), "a piston");
    assert.true(last.movers.some((m) => m.kind === "platform"), "a platform");
  });
});
```

Things to notice:

- **`reachable` is a flood fill.** From the start, it walks from corner to corner along rows and columns, where there is floor and the step is at most two digits, and it treats a moving platform as a bridge from the floor before it to the floor after it. It is a few lines, and it proves the most important thing: *you can get there*.
- **The test fails when a level can't be finished.** Try turning a bridge of *Stepping Stones* into a row of dots: the test names the level, and the zone that nothing can reach.
- **The clock test is a minimum**: a second for every six units of straight line to the goal, which is much less than a marble needs, so it only catches a level whose time was forgotten.
- **Every checkpoint is worth a few seconds, but never more than a quarter of the level's time.** A checkpoint worth half of it would be a reason to go back and forth.
- **A test can't tell you a level is *fun*.** Play them.

Open `tests.html`. You should see **592 passing tests**: six more.

---

## Step 7: Try it

Serve the page and open it **with `?dev`**, then **without**.

- [ ] **Without `?dev`** there is no panel, and no key does anything
- [ ] **With `?dev`** the panel is on the left, with four groups of sliders and a **Copy values** button
- [ ] The **level** slider jumps to any of the **ten** levels, and the level's name changes
- [ ] **Dragging a slider changes the game at once**: the shine, the rim, the lights, the push, and gravity (set it low and the marble floats)
- [ ] The key under **Esc** hides and shows the panel, and **Dev** folds it up and opens it
- [ ] After letting go of a slider, **the arrow keys steer the marble** again
- [ ] **Copy values** puts the numbers in the console, and on the clipboard (paste them anywhere to see)
- [ ] An enemy's **bump** makes **sparks** and a **shake** of the screen
- [ ] A **checkpoint** makes **glitter**, and the **goal** a **firework** and a small shake
- [ ] **Slime** that wins makes a green **puff**, and the marble is **gone for a second and a half** (the puff can be seen) before it drops again
- [ ] Rolling **fast** leaves a **trail**, and rolling slowly does not
- [ ] **P** to pause: particles and the shake **hang where they are**, then go on when you resume
- [ ] **Particles** at 0 in the panel: no sparks, no trail. **Shake** at 0: the screen stays still
- [ ] **N** goes through **ten** levels, and after the tenth, back to the first
- [ ] Each new level **plays as described**: *Switchback* is a long way down, *Stepping Stones* is narrow, *Crusher Row* is timing, *Slime Pit* has a way through, *Ferry Crossing* needs a wait, *Hill Climb* is uphill, *Rampage* has it all
- [ ] Finishing the **tenth** level says **You win!**, with the score of ten levels
- [ ] On a **phone** (Chrome's device mode on its side), with `?dev`, the panel is a small bar, **folded up**, that doesn't cover the marble, and opens to something you can scroll

**If something's wrong**

- **`ReferenceError: ParticleBursts is not defined`, `Shake`, `DevPanel`, `trailRate`, `devEnabled`, `control` or `slider`:** a script tag is missing from `index.html`. They go in the list at the bottom of `<body>`, above `main.js`.
- **There is no trail, and no error:** the trail's `manualEmitCount` must be `-1`. At 0, a system makes only what it is told to, which for the trail is nothing.
- **A burst makes nothing:** `burst` sets `manualEmitCount`. Check the name you gave it is one of the presets (a wrong one throws, and says which).
- **The sparks are in the wrong place, or only appear at the start of the level:** the point passed to `burst` should be the marble's *current* position, `marble.position`.
- **Everything is dim, or the screen goes dark after the tests:** a test left the fake `BABYLON` in place. The test module must put back `realBabylon` in `afterEach`.
- **The shake moves the marble, or the course, and not the view:** it should only change the four `ortho` edges, by the same amount. `showView`.
- **The view is the wrong size after turning the phone:** `fitView` must set `view` and then call `showView()`, and be given to `engine.onResizeObservable`.
- **The view jumps after the shake ends:** `showView(shake.offset.x, shake.offset.y)` must run every frame, so that the last one (an offset of 0) puts the view back.
- **There is no panel with `?dev`:** the address must end `?dev` (after the folder, before any `#`). Check the console.
- **The panel is behind something, or too big:** `z-index` in `devpanel.css`, and the `@media` block.
- **The arrow keys move a slider and not the marble:** the slider must `blur()` on `change`.
- **A zone is in the air, or a level can't be finished:** the tests say which. A zone needs level floor round it, a platform needs floor at the same height at both ends, and a piston needs flat floor under all of it.
- **A level has too little time, or too much:** the `time` of the level, and its checkpoints' `bonus`.
- **A slider does nothing:** the row's `set` must change the thing the game *reads*. A copy of a number is not the number.

**Experiments** (change one, reload, then change it back):

- A new row: `slider("sun light", sun, "intensity", 0, 2)` is one line. Add one for `sky.groundColor.r`
- A new kind of particle: add a row to `PARTICLE_PRESETS`, such as `confetti`, and `burst("confetti", ...)` at the goal
- `SHAKE_DURATION` of `1`: a long, slow rumble. Of `0.1`: a jolt
- `shakeFade` without the square (`return left`): a straight fade, and see if it feels the same
- `gravity` of `3` in the panel: the moon. Of `60`: the marble is a stone
- `top speed` of `30` and watch the trail

---

## Step 8: Tests, all together

Your `tests.html` scripts should now look like this:

```html
  <script src="https://code.jquery.com/qunit/qunit-2.22.0.js"></script>
  <script src="https://cdn.babylonjs.com/babylon.js"></script>
  <script src="https://cdn.babylonjs.com/havok/HavokPhysics_umd.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/course.js"></script>
  <script src="js/level.js"></script>    
  <script src="js/clock.js"></script>
  <script src="js/zones.js"></script>
  <script src="js/slime.js"></script>
  <script src="js/movers.js"></script>
  <script src="js/steering.js"></script>
  <script src="js/marble.js"></script>
  <script src="js/enemies.js"></script>
  <script src="js/score.js"></script>
  <script src="js/profile.js"></script>
  <script src="js/leaderboard.js"></script>
  <script src="js/game.js"></script>
  <script src="js/sounds.js"></script>
  <script src="js/screens.js"></script>
  <script src="js/particles.js"></script>
  <script src="js/shake.js"></script>
  <script src="js/devpanel.js"></script>
  <script src="js/controls.js"></script>
  <script src="js/tilt.js"></script>
  <script src="js/camera.js"></script>
  <script src="js/splash.js"></script>
  <script src="tests/physics.tests.js"></script>
  <script src="tests/course.tests.js"></script>
  <script src="tests/level.tests.js"></script>  
  <script src="tests/clock.tests.js"></script>  
  <script src="tests/zones.tests.js"></script>  
  <script src="tests/slime.tests.js"></script>
  <script src="tests/movers.tests.js"></script>
  <script src="tests/steering.tests.js"></script>
  <script src="tests/marble.tests.js"></script>
  <script src="tests/enemies.tests.js"></script>
  <script src="tests/score.tests.js"></script>
  <script src="tests/profile.tests.js"></script>
  <script src="tests/leaderboard.tests.js"></script>
  <script src="tests/game.tests.js"></script>
  <script src="tests/sounds.tests.js"></script>
  <script src="tests/screens.tests.js"></script>
  <script src="tests/particles.tests.js"></script>
  <script src="tests/shake.tests.js"></script>
  <script src="tests/devpanel.tests.js"></script>
  <script src="tests/controls.tests.js"></script>
  <script src="tests/tilt.tests.js"></script>  
  <script src="tests/camera.tests.js"></script>
  <script src="tests/splash.tests.js"></script>
```

Open it. You should see **592 passing tests**: the 520 you started with, plus 28 for the particles, 18 for the shake, 20 for the panel and 6 for the levels.

> **What these tests don't cover.** They check the presets, the decisions (how much trail, how much shake) and what the code asks Babylon.js and the page to do. They can't tell you what any of it *looks* like: whether the sparks are too bright, the shake too long, or the panel too big on your phone. That is what the panel is for, and Step 7, with your eyes. And `main.js`, the glue, is checked by playing.

> **Try breaking something.** In `particles.js`, change the trail's `manualEmitCount` from `-1` to `0`. The test *"a burst is made by hand, and the trail by the second"* fails, and on the page the trail stops, with no error at all. Then put it back.

---

## Recap: what you built

| Concept | Where |
|---|---|
| A burst and a stream | `burst`, `trail`, `manualEmitCount`, `emitRate` |
| Effects as data | `PARTICLE_PRESETS` |
| Additive light | `BLENDMODE_ONEONE` |
| Fading out as it dies | `colorDead` |
| A decision as a pure function | `trailRate`, `shakeFade`, `shakeOffset` |
| An effect that is a number dying away | `Shake` |
| Moving a view without moving the camera | `showView`, the four `ortho` edges |
| Every effect with a dial | `amount`, `strength` |
| Held still in a pause | `setFrozen`, `dt` of 0 |
| A developer mode | `devEnabled`, `?dev` |
| A panel built from a table | `control`, `slider`, `DevPanel` |
| Folding up and hiding | `collapsed`, `toggleShown`, `DEV_KEY` |
| Testing code that needs Babylon.js | a fake `BABYLON`, put back after each test |
| A new part of the page is a new file | `devpanel.css` |

## Challenges

1. **A landing puff.** A small puff of dust when the marble lands after a fall. (Hint: you need to know when it *stops* being in the air: `marble.grounded` has changed from false to true.)
2. **More rows.** Make `SIGHT_RANGE` of the enemies something the panel can reach, and add a slider for it. (Hint: it is a constant, so it needs to be a property of an object, such as one that `Brain` reads.)
3. **Remember the panel.** Keep whether it was folded up in `localStorage`, guarded as the profile is. (Hint: `readJson` and `writeJson` are already there.)
4. **A shake for a fall.** A tiny shake when the marble falls off the level. (Hint: the same place as the `fall` sound, and a size of 0.3.)
5. **Speed lines.** A second stream that makes thin streaks along the marble's way when it is going very fast. (Hint: a sixth preset, and a rate that is 0 until 80% of top speed.)
6. **Show the numbers on the page.** A line in the panel with the marble's speed, updated every frame. (Hint: a row that never changes the number, and `refresh()`.)

---

*That's the end of the game itself. You have a complete game: a physics world, a marble, three ways to steer it, ten levels, a clock, hazards, enemies, a title, a score, a leaderboard, sound, effects, and a panel to tune all of it. The same panel, and the habit of putting numbers somewhere you can reach them, is worth taking to every game you make. The next tutorial gives it a level editor.*
