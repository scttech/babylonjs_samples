// Returns a random()-compatible function that replays `sequence`, cycling
// once exhausted, so spawn behavior can be pinned down exactly.
function fakeRandom(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

QUnit.module("SparkSystem", () => {
  QUnit.test("defaults to Babylon's gravity/power/size/color tuning with no bursts", (assert) => {
    const system = new SparkSystem();

    assert.strictEqual(system.gravity, 18);
    assert.strictEqual(system.minEmitPower, 3);
    assert.strictEqual(system.maxEmitPower, 9);
    assert.strictEqual(system.minLifeTime, 0.25);
    assert.strictEqual(system.maxLifeTime, 0.6);
    assert.strictEqual(system.minSize, 0.05);
    assert.strictEqual(system.maxSize, 0.15);
    assert.deepEqual(system.colors, ["#fff59d", "#ffca28", "#ff7043", "#ffffff"]);
    assert.deepEqual(system.systems, []);
  });

  QUnit.test("accepts tuning overrides via constructor options", (assert) => {
    const system = new SparkSystem({ gravity: 5, minEmitPower: 1, maxEmitPower: 2, colors: ["#000000"] });

    assert.strictEqual(system.gravity, 5);
    assert.strictEqual(system.minEmitPower, 1);
    assert.strictEqual(system.maxEmitPower, 2);
    assert.deepEqual(system.colors, ["#000000"]);
  });

  QUnit.test("spawn() without a scene is a no-op and never touches BABYLON", (assert) => {
    const system = new SparkSystem({ random: fakeRandom([0]) });

    system.spawn(0, 0, 0, -1);

    assert.deepEqual(system.systems, [], "no burst is tracked without a scene");
  });

  QUnit.test("update()/dispose() are no-ops without a scene", (assert) => {
    const system = new SparkSystem();

    system.update(0.1);
    system.dispose();

    assert.deepEqual(system.systems, []);
  });
});

// Rendering (burst configuration/lifecycle) only needs `BABYLON.ParticleSystem`,
// `BABYLON.Vector3`, `BABYLON.Color3`, and `BABYLON.DynamicTexture` to exist,
// so these tests stub them out instead of loading the real engine.
QUnit.module("SparkSystem rendering", (hooks) => {
  const globalScope = typeof window !== "undefined" ? window : global;

  class FakeVector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }
  FakeVector3.Zero = () => new FakeVector3(0, 0, 0);

  class FakeColor3 {
    constructor(hex) {
      this.hex = hex;
    }
    toColor4(alpha = 1) {
      return { hex: this.hex, alpha };
    }
  }
  FakeColor3.FromHexString = (hex) => new FakeColor3(hex);

  class FakeParticleSystem {
    constructor(name, capacity, scene) {
      this.name = name;
      this.capacity = capacity;
      this.scene = scene;
      this.started = false;
      this.disposed = false;
      this.disposedWithTexture = null;
    }

    start() {
      this.started = true;
    }

    dispose(disposeTexture = true) {
      this.disposed = true;
      this.disposedWithTexture = disposeTexture;
    }
  }
  FakeParticleSystem.BLENDMODE_ADD = "BLENDMODE_ADD";

  class FakeCanvasContext {
    createRadialGradient() {
      return { addColorStop() {} };
    }
    fillRect() {}
  }

  class FakeDynamicTexture {
    constructor(name, size) {
      this.name = name;
      this.size = size;
      this.disposed = false;
    }
    getContext() {
      return new FakeCanvasContext();
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
      Color3: FakeColor3,
      DynamicTexture: FakeDynamicTexture,
    };
  });

  hooks.afterEach(() => {
    delete globalScope.BABYLON;
  });

  QUnit.test("constructing with a scene creates a shared spark texture", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene });

    assert.ok(system._texture instanceof FakeDynamicTexture, "a texture is created up front");
  });

  QUnit.test("spawn() derives burst count from the first random() call", (assert) => {
    const scene = {};
    const low = new SparkSystem({ scene, random: fakeRandom([0]) });
    low.spawn(0, 0, 0, -1);
    assert.strictEqual(low.systems[0].system.manualEmitCount, 14, "14 + floor(0 * 8)");

    const high = new SparkSystem({ scene, random: fakeRandom([0.999999]) });
    high.spawn(0, 0, 0, -1);
    assert.strictEqual(high.systems[0].system.manualEmitCount, 21, "14 + floor(0.999999 * 8)");
  });

  QUnit.test("spawn() positions the burst's emitter at the impact point", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene, random: fakeRandom([0.3]) });

    system.spawn(12, -34, 0, -1);

    const emitter = system.systems[0].system.emitter;
    assert.strictEqual(emitter.x, 12);
    assert.strictEqual(emitter.y, -34);
    assert.strictEqual(emitter.z, 0);
  });

  QUnit.test("spawn() aims direction1/direction2 as a +-72deg fan around the surface normal", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene, random: fakeRandom([0]) });

    system.spawn(0, 0, 0, -1);
    const burst = system.systems[0].system;

    const baseAngle = Math.atan2(-1, 0);
    const spread = Math.PI * 0.4;
    const a1 = baseAngle - spread;
    const a2 = baseAngle + spread;
    assert.strictEqual(burst.direction1.x, Math.cos(a1));
    assert.strictEqual(burst.direction1.y, Math.sin(a1));
    assert.strictEqual(burst.direction2.x, Math.cos(a2));
    assert.strictEqual(burst.direction2.y, Math.sin(a2));
  });

  QUnit.test("spawn() configures gravity, emit power, size, and blend mode from its own tuning", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene, gravity: 40, minEmitPower: 1, maxEmitPower: 2, minSize: 0.1, maxSize: 0.2, random: fakeRandom([0]) });

    system.spawn(0, 0, 0, -1);
    const burst = system.systems[0].system;

    assert.strictEqual(burst.gravity.x, 0);
    assert.strictEqual(burst.gravity.y, -40, "gravity pulls downward in world space");
    assert.strictEqual(burst.minEmitPower, 1);
    assert.strictEqual(burst.maxEmitPower, 2);
    assert.strictEqual(burst.minSize, 0.1);
    assert.strictEqual(burst.maxSize, 0.2);
    assert.strictEqual(burst.blendMode, BABYLON.ParticleSystem.BLENDMODE_ADD);
    assert.strictEqual(burst.particleTexture, system._texture, "burst uses the shared spark texture");
  });

  QUnit.test("spawn() picks color1/color2/colorDead from the color list via random()", (assert) => {
    const scene = {};
    const colors = ["#111111", "#222222"];
    // random() calls in order: count, startColor index, endColor index.
    const system = new SparkSystem({ scene, colors, random: fakeRandom([0, 0, 0.999999]) });

    system.spawn(0, 0, 0, -1);
    const burst = system.systems[0].system;

    assert.deepEqual(burst.color1, { hex: "#111111", alpha: 1 });
    assert.deepEqual(burst.color2, { hex: "#222222", alpha: 1 });
    assert.deepEqual(burst.colorDead, { hex: "#222222", alpha: 0 }, "fades out to the end color, fully transparent");
  });

  QUnit.test("spawn() sets manualEmitCount and a high emitRate, then starts the burst", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene, random: fakeRandom([0]) });

    system.spawn(0, 0, 0, -1);
    const burst = system.systems[0].system;

    assert.strictEqual(burst.manualEmitCount, 14);
    assert.strictEqual(burst.emitRate, 14 * 20, "high enough to empty manualEmitCount in ~1 frame");
    assert.true(burst.started, "start() was called");
  });

  QUnit.test("spawn() gives the burst a ttl covering emission ramp-up plus its longest particle life", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene, maxLifeTime: 0.6, random: fakeRandom([0]) });

    system.spawn(0, 0, 0, -1);

    // count=14, emitRate=14*20=280, so ramp-up is 14/280=0.05s.
    assert.strictEqual(system.systems[0].ttl, 14 / 280 + 0.6 + 0.15);
  });

  QUnit.test("update() ages a burst's ttl by dt but leaves it tracked while time remains", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene, maxLifeTime: 0.6, random: fakeRandom([0]) });
    system.spawn(0, 0, 0, -1);
    const startingTtl = system.systems[0].ttl;
    const burst = system.systems[0].system;

    system.update(0.1);

    assert.strictEqual(system.systems.length, 1, "still in flight");
    assert.strictEqual(system.systems[0].ttl, startingTtl - 0.1);
    assert.false(burst.disposed);
  });

  QUnit.test("update() disposes and untracks a burst once its ttl has elapsed", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene, maxLifeTime: 0.6, random: fakeRandom([0]) });
    system.spawn(0, 0, 0, -1);
    const burst = system.systems[0].system;

    system.update(0.4);
    system.update(0.4); // 0.8 total >= the 0.8s ttl (0.05 ramp-up + 0.6 life + 0.15 buffer)

    assert.deepEqual(system.systems, [], "finished burst is untracked");
    assert.true(burst.disposed, "burst.dispose() was called");
    assert.strictEqual(burst.disposedWithTexture, false, "the shared texture is not disposed with it");
  });

  QUnit.test("dispose() disposes every in-flight burst and the shared texture", (assert) => {
    const scene = {};
    const system = new SparkSystem({ scene, random: fakeRandom([0]) });
    system.spawn(0, 0, 0, -1);
    system.spawn(1, 1, 0, -1);
    const bursts = system.systems.map((entry) => entry.system);
    const texture = system._texture;

    system.dispose();

    assert.deepEqual(system.systems, [], "no bursts remain");
    assert.true(
      bursts.every((b) => b.disposed && b.disposedWithTexture === false),
      "every burst was disposed without touching the shared texture"
    );
    assert.true(texture.disposed, "the shared texture was disposed");
    assert.strictEqual(system._texture, null);
  });
});
