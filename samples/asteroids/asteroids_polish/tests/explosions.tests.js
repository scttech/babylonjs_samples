// Explosions only touches `BABYLON.ParticleSystem`, `Vector3`, `Color3` and
// `DynamicTexture`, so these tests stub them out instead of loading the real
// engine (the same approach as the other rendering tests).
QUnit.module("Explosions", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeVector3 {
    constructor(x, y, z) {
      Object.assign(this, { x, y, z });
    }
    static Zero() {
      return new FakeVector3(0, 0, 0);
    }
  }

  class FakeParticleSystem {
    static BLENDMODE_ADD = 1;

    started = false;
    disposedWith = undefined;

    constructor(name, capacity, scene) {
      Object.assign(this, { name, capacity, scene });
    }
    start() {
      this.started = true;
    }
    dispose(disposeTexture) {
      this.disposedWith = disposeTexture;
    }
  }

  class FakeTexture {
    hasAlpha = false;
    disposed = false;

    getContext() {
      return {
        createRadialGradient: () => ({ addColorStop() {} }),
        fillRect() {},
      };
    }
    update() {}
    dispose() {
      this.disposed = true;
    }
  }

  hooks.beforeEach(() => {
    globalScope.BABYLON = {
      ParticleSystem: FakeParticleSystem,
      Vector3: FakeVector3,
      DynamicTexture: FakeTexture,
      Color3: {
        FromHexString: (hex) => ({ toColor4: (alpha) => ({ hex, alpha }) }),
      },
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("spawn() does nothing without a scene", (assert) => {
    const explosions = new Explosions();

    explosions.spawn(1, 2);

    assert.deepEqual(explosions.systems, []);
  });

  QUnit.test("spawn() starts one burst at the given spot", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(3, -4);

    assert.strictEqual(explosions.systems.length, 1);
    const { system } = explosions.systems[0];
    assert.true(system.started);
    assert.strictEqual(system.emitter.x, 3);
    assert.strictEqual(system.emitter.y, -4);
  });

  QUnit.test("a normal burst has 16 particles, and a bigger one has more", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0, 1);
    explosions.spawn(0, 0, 2);

    assert.strictEqual(explosions.systems[0].system.manualEmitCount, 16);
    assert.strictEqual(explosions.systems[1].system.manualEmitCount, 32);
  });

  QUnit.test("a burst never uses more particles than the maximum", (assert) => {
    const explosions = new Explosions({ scene: {}, maxParticles: 50 });

    explosions.spawn(0, 0, 100);

    assert.strictEqual(explosions.systems[0].system.manualEmitCount, 50);
    assert.strictEqual(explosions.systems[0].system.capacity, 50);
  });

  QUnit.test("the emit rate is high enough to empty the burst almost at once", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0, 1);

    const { system } = explosions.systems[0];
    assert.strictEqual(system.emitRate, system.manualEmitCount * 20);
  });

  QUnit.test("bigger explosions fly faster", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0, 1);
    explosions.spawn(0, 0, 4);

    assert.true(explosions.systems[1].system.maxEmitPower > explosions.systems[0].system.maxEmitPower);
  });

  QUnit.test("particles go in every direction, not just one", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0);

    const { direction1, direction2 } = explosions.systems[0].system;
    assert.true(direction1.x < 0 && direction1.y < 0);
    assert.true(direction2.x > 0 && direction2.y > 0);
  });

  QUnit.test("particles are tinted by the default colors and fade to transparent", (assert) => {
    const explosions = new Explosions({ scene: {}, colors: ["#111111", "#222222"] });

    explosions.spawn(0, 0);

    const { system } = explosions.systems[0];
    assert.deepEqual(system.color1, { hex: "#111111", alpha: 1 });
    assert.deepEqual(system.color2, { hex: "#222222", alpha: 1 });
    assert.deepEqual(system.colorDead, { hex: "#222222", alpha: 0 });
  });

  QUnit.test("one burst can use its own colors without changing the default", (assert) => {
    const explosions = new Explosions({ scene: {}, colors: ["#111111", "#222222"] });

    explosions.spawn(0, 0, 1, ["#aaaaaa", "#bbbbbb"]);
    explosions.spawn(0, 0, 1);

    assert.strictEqual(explosions.systems[0].system.color1.hex, "#aaaaaa");
    assert.strictEqual(explosions.systems[1].system.color1.hex, "#111111");
  });

  QUnit.test("every burst shares one glow texture", (assert) => {
    const explosions = new Explosions({ scene: {} });

    explosions.spawn(0, 0);
    explosions.spawn(1, 1);

    const first = explosions.systems[0].system.particleTexture;
    assert.ok(first instanceof FakeTexture);
    assert.strictEqual(explosions.systems[1].system.particleTexture, first);
    assert.true(first.hasAlpha);
  });

  QUnit.test("a finished burst is disposed, but not before then", (assert) => {
    const explosions = new Explosions({ scene: {}, maxLifeTime: 1 });
    explosions.spawn(0, 0, 1);
    const { system, ttl } = explosions.systems[0];

    explosions.update(ttl - 0.01);
    assert.strictEqual(explosions.systems.length, 1, "still in flight");
    assert.strictEqual(system.disposedWith, undefined);

    explosions.update(0.02);
    assert.strictEqual(explosions.systems.length, 0, "gone");
    assert.strictEqual(system.disposedWith, false, "disposed without taking the shared texture with it");
  });

  QUnit.test("its lifetime covers the ramp-up plus the longest-lived particle", (assert) => {
    const explosions = new Explosions({ scene: {}, maxLifeTime: 0.9 });

    explosions.spawn(0, 0, 1);

    const { system, ttl } = explosions.systems[0];
    assert.true(Math.abs(ttl - (system.manualEmitCount / system.emitRate + 0.9 + 0.15)) < 1e-9);
  });

  QUnit.test("dispose() removes every burst and the texture", (assert) => {
    const explosions = new Explosions({ scene: {} });
    explosions.spawn(0, 0);
    const texture = explosions._texture;

    explosions.dispose();

    assert.deepEqual(explosions.systems, []);
    assert.true(texture.disposed);
    assert.strictEqual(explosions._texture, null);
  });
});
