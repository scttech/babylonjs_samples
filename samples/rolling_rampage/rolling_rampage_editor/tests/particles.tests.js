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
