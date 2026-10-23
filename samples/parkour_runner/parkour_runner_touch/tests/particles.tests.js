QUnit.module("PARTICLE_PRESETS", () => {
  QUnit.test("there is a sparkle and a dust", (assert) => {
    assert.deepEqual(Object.keys(PARTICLE_PRESETS).sort(), ["dust", "sparkle"]);
  });

  QUnit.test("a burst fits in the system: it never makes more than the capacity", (assert) => {
    for (const [name, preset] of Object.entries(PARTICLE_PRESETS)) {
      assert.true(preset.count > 0 && preset.count <= preset.capacity, name);
    }
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

  QUnit.test("sparkles fall and dust rises, and only the sparkles are drawn as light", (assert) => {
    assert.true(PARTICLE_PRESETS.sparkle.gravity < 0);
    assert.true(PARTICLE_PRESETS.dust.gravity > 0);
    assert.true(PARTICLE_PRESETS.sparkle.additive);
    assert.false(PARTICLE_PRESETS.dust.additive);
  });

  QUnit.test("dust is bigger and lasts longer than a sparkle", (assert) => {
    assert.true(PARTICLE_PRESETS.dust.size[1] > PARTICLE_PRESETS.sparkle.size[1]);
    assert.true(PARTICLE_PRESETS.dust.life[1] > PARTICLE_PRESETS.sparkle.life[1]);
  });
});

// Making particles needs a lot of Babylon.js. These tests stand in for just the parts
// that are used, and check what the code sets on them.
QUnit.module("ParticleBursts", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

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
    globalScope.BABYLON = { Vector3: FakeVector3, Color4: FakeColor4, ParticleSystem: FakeParticleSystem, DynamicTexture: FakeTexture };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
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

    for (const system of Object.values(bursts.systems)) {
      assert.strictEqual(system.emitRate, 0);
      assert.strictEqual(system.manualEmitCount, 0);
    }
  });

  QUnit.test("they share one texture", (assert) => {
    const bursts = new ParticleBursts(scene);

    assert.true(Object.values(bursts.systems).every((s) => s.particleTexture === bursts.texture));
  });

  QUnit.test("the settings of a kind come from its preset", (assert) => {
    const { sparkle } = PARTICLE_PRESETS;
    const system = new ParticleBursts(scene).systems.sparkle;

    assert.deepEqual([system.minSize, system.maxSize], sparkle.size);
    assert.deepEqual([system.minLifeTime, system.maxLifeTime], sparkle.life);
    assert.deepEqual([system.minEmitPower, system.maxEmitPower], sparkle.power);
    assert.strictEqual(system.gravity.y, sparkle.gravity);
    assert.deepEqual([system.direction1.x, system.direction1.y, system.direction1.z], sparkle.spread.slice(0, 3));
    assert.deepEqual([system.direction2.x, system.direction2.y, system.direction2.z], sparkle.spread.slice(3));
    assert.strictEqual(system.color1.hex, `${sparkle.colors[0]}FF`);
  });

  QUnit.test("the particles fade out as they die: the dead color is see-through", (assert) => {
    const system = new ParticleBursts(scene).systems.dust;

    assert.strictEqual(system.colorDead.hex, `${PARTICLE_PRESETS.dust.colors[1]}00`);
  });

  QUnit.test("sparkles are added light, and dust is drawn as it is", (assert) => {
    const { systems } = new ParticleBursts(scene);

    assert.strictEqual(systems.sparkle.blendMode, FakeParticleSystem.BLENDMODE_ONEONE);
    assert.strictEqual(systems.dust.blendMode, FakeParticleSystem.BLENDMODE_STANDARD);
  });

  QUnit.test("burst() puts the emitter at the point and asks for the preset's count", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.burst("sparkle", 1.5, 2, 30);

    const system = bursts.systems.sparkle;
    assert.deepEqual([system.emitter.x, system.emitter.y, system.emitter.z], [1.5, 2, 30]);
    assert.strictEqual(system.manualEmitCount, PARTICLE_PRESETS.sparkle.count);
  });

  QUnit.test("a burst of one kind leaves the other alone", (assert) => {
    const bursts = new ParticleBursts(scene);

    bursts.burst("dust", 0, 0, 5);

    assert.strictEqual(bursts.systems.sparkle.manualEmitCount, 0);
  });

  QUnit.test("burst() can be called again for another burst", (assert) => {
    const bursts = new ParticleBursts(scene);
    bursts.burst("sparkle", 0, 0, 1);
    bursts.systems.sparkle.manualEmitCount = 0; // the system has made them, and counted back to 0

    bursts.burst("sparkle", 2, 0, 9);

    assert.strictEqual(bursts.systems.sparkle.manualEmitCount, PARTICLE_PRESETS.sparkle.count);
    assert.strictEqual(bursts.systems.sparkle.emitter.z, 9);
  });

  QUnit.test("a kind that doesn't exist is a mistake, and says which", (assert) => {
    const bursts = new ParticleBursts(scene);

    assert.throws(() => bursts.burst("confetti", 0, 0, 0), /no kind of burst called "confetti"/);
  });

  QUnit.test("setFrozen(true) holds every system still, and setFrozen(false) lets them go on at their own speed", (assert) => {
    const bursts = new ParticleBursts(scene);
    bursts.systems.dust.updateSpeed = 0.01;

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
