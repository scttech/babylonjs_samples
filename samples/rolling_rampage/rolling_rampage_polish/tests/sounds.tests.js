QUnit.module("SOUNDS", () => {
  const parts = (name) => SOUNDS[name];

  QUnit.test("every sound the game plays is there", (assert) => {
    for (const name of ["click", "start", "checkpoint", "goal", "bump", "fall", "dissolve", "tick", "over", "best"]) {
      assert.true(Array.isArray(SOUNDS[name]) && SOUNDS[name].length > 0, name);
    }
  });

  QUnit.test("every part starts at or after 0, lasts a little while, and is not too loud", (assert) => {
    const problems = [];
    for (const [name, list] of Object.entries(SOUNDS)) {
      for (const part of list) {
        if (!(part.start >= 0)) problems.push(`${name}: start`);
        if (!(part.length > 0 && part.length < 1)) problems.push(`${name}: length`);
        if (!(part.volume > 0 && part.volume <= 0.5)) problems.push(`${name}: volume`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a tone has a wave and two pitches above 0 (a fade can't pass through 0)", (assert) => {
    const problems = [];
    for (const [name, list] of Object.entries(SOUNDS)) {
      for (const part of list.filter((p) => !p.noise)) {
        if (!["sine", "square", "triangle", "sawtooth"].includes(part.wave)) problems.push(`${name}: wave`);
        if (!(part.from > 0 && part.to > 0)) problems.push(`${name}: pitch`);
      }
    }
    assert.deepEqual(problems, []);
  });

  QUnit.test("a noise has a filter, and a noise is never a tone", (assert) => {
    for (const list of Object.values(SOUNDS)) {
      for (const part of list.filter((p) => p.noise)) {
        assert.true(part.filter > 0);
        assert.strictEqual(part.wave, undefined);
      }
    }
  });

  QUnit.test("a bump is louder than a click, and a dissolve is only noise", (assert) => {
    const loudest = (name) => Math.max(...parts(name).map((p) => p.volume));

    assert.true(loudest("bump") > loudest("click"));
    assert.true(parts("dissolve").every((p) => p.noise));
  });

  QUnit.test("the goal is a rising run of notes, one after another, and the game over a falling one", (assert) => {
    const notes = parts("goal");
    for (let i = 1; i < notes.length; i++) {
      assert.true(notes[i].from > notes[i - 1].from, "each note is higher");
      assert.true(notes[i].start > notes[i - 1].start, "and starts later");
    }
    const down = parts("over");
    for (let i = 1; i < down.length; i++) assert.true(down[i].from < down[i - 1].from, "each note of the game over is lower");
  });
});

// The sounds need an audio context. These tests give them a stand-in that remembers
// everything made on it, so they can check what was played without making a sound.
QUnit.module("Sounds", () => {
  class FakeParam {
    constructor() {
      this.calls = [];
    }
    setValueAtTime(value, time) {
      this.calls.push(["set", value, time]);
    }
    exponentialRampToValueAtTime(value, time) {
      this.calls.push(["ramp", value, time]);
    }
  }

  class FakeNode {
    constructor(kind) {
      this.kind = kind;
      this.connected = [];
      this.started = null;
      this.stopped = null;
      this.frequency = new FakeParam();
      this.gain = new FakeParam();
    }
    connect(to) {
      this.connected.push(to);
    }
    start(time) {
      this.started = time;
    }
    stop(time) {
      this.stopped = time;
    }
  }

  class FakeContext {
    constructor() {
      this.currentTime = 10;
      this.state = "running";
      this.sampleRate = 100;
      this.destination = { kind: "speakers" };
      this.nodes = [];
      this.buffers = 0;
      this.resumed = 0;
    }
    _node(kind) {
      const node = new FakeNode(kind);
      this.nodes.push(node);
      return node;
    }
    createOscillator() {
      return this._node("oscillator");
    }
    createGain() {
      return this._node("gain");
    }
    createBufferSource() {
      return this._node("source");
    }
    createBiquadFilter() {
      return this._node("filter");
    }
    createBuffer(channels, length) {
      this.buffers++;
      const data = new Float32Array(length);
      return { getChannelData: () => data, length };
    }
    resume() {
      this.resumed++;
      this.state = "running";
    }
    ofKind(kind) {
      return this.nodes.filter((n) => n.kind === kind);
    }
  }

  // Sounds that are already unlocked, with the context they made.
  const unlocked = (options = {}) => {
    const context = new FakeContext();
    const sounds = new Sounds({ createContext: () => context, ...options });
    sounds.unlock();
    return { sounds, context };
  };

  QUnit.test("makes no audio context until unlock(), because the browser wouldn't let it make a sound anyway", (assert) => {
    let made = 0;
    const sounds = new Sounds({ createContext: () => (made++, new FakeContext()) });

    assert.strictEqual(made, 0);
    assert.strictEqual(sounds.context, null);

    assert.true(sounds.unlock());
    assert.strictEqual(made, 1);
  });

  QUnit.test("unlock() again doesn't make another context", (assert) => {
    let made = 0;
    const sounds = new Sounds({ createContext: () => (made++, new FakeContext()) });

    sounds.unlock();
    sounds.unlock();

    assert.strictEqual(made, 1);
  });

  QUnit.test("unlock() wakes a context the browser started asleep", (assert) => {
    const context = new FakeContext();
    context.state = "suspended";
    const sounds = new Sounds({ createContext: () => context });

    sounds.unlock();

    assert.strictEqual(context.resumed, 1);
  });

  QUnit.test("with no Web Audio, unlock() says so and the game carries on without sound", (assert) => {
    const sounds = new Sounds({
      createContext: () => {
        throw new Error("no audio");
      },
    });

    assert.false(sounds.unlock());
    assert.false(sounds.play("checkpoint"));
  });

  QUnit.test("play() does nothing before unlock()", (assert) => {
    const sounds = new Sounds({ createContext: () => new FakeContext() });

    assert.false(sounds.play("checkpoint"));
  });

  QUnit.test("an unknown sound is a mistake, and says which", (assert) => {
    const { sounds } = unlocked();

    assert.throws(() => sounds.play("moo"), /no sound called "moo"/);
  });

  QUnit.test("a tone makes an oscillator and a gain, wired to the speakers", (assert) => {
    const { sounds, context } = unlocked();

    assert.true(sounds.play("click"));

    const [oscillator] = context.ofKind("oscillator");
    const [gain] = context.ofKind("gain");
    assert.strictEqual(oscillator.type, "square");
    assert.deepEqual(oscillator.connected, [gain]);
    assert.deepEqual(gain.connected, [context.destination]);
  });

  QUnit.test("it starts now and stops after its length", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("click");

    const [oscillator] = context.ofKind("oscillator");
    assert.strictEqual(oscillator.started, 10);
    assert.true(Math.abs(oscillator.stopped - (10 + SOUNDS.click[0].length)) < 1e-9);
  });

  QUnit.test("the pitch glides from one note to the other", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("click");

    const [oscillator] = context.ofKind("oscillator");
    const [set, ramp] = oscillator.frequency.calls;
    assert.deepEqual(set.slice(0, 2), ["set", SOUNDS.click[0].from]);
    assert.deepEqual(ramp.slice(0, 2), ["ramp", SOUNDS.click[0].to]);
  });

  QUnit.test("the volume starts at the part's volume, times the master volume, and fades away", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("click");

    const [gain] = context.ofKind("gain");
    const [set, ramp] = gain.gain.calls;
    assert.true(Math.abs(set[1] - SOUNDS.click[0].volume * MASTER_VOLUME) < 1e-9);
    assert.strictEqual(ramp[1], SILENCE);
  });

  QUnit.test("rate multiplies every pitch: 2 is an octave higher", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("click", { rate: 2 });

    const [oscillator] = context.ofKind("oscillator");
    const [set, ramp] = oscillator.frequency.calls;
    assert.strictEqual(set[1], SOUNDS.click[0].from * 2);
    assert.strictEqual(ramp[1], SOUNDS.click[0].to * 2);
  });

  QUnit.test("a sound with several parts makes one of each, and starts them when they say", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("goal");

    const oscillators = context.ofKind("oscillator");
    assert.strictEqual(oscillators.length, SOUNDS.goal.length);
    oscillators.forEach((oscillator, i) => assert.true(Math.abs(oscillator.started - (10 + SOUNDS.goal[i].start)) < 1e-9));
  });

  QUnit.test("a noise part plays the noise through a lowpass filter, then the gain", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("dissolve");

    const [source] = context.ofKind("source");
    const [filter] = context.ofKind("filter");
    const [gain] = context.ofKind("gain");
    assert.strictEqual(filter.type, "lowpass");
    assert.strictEqual(filter.frequency.calls[0][1], SOUNDS.dissolve[0].filter);
    assert.deepEqual(source.connected, [filter]);
    assert.deepEqual(filter.connected, [gain]);
    assert.strictEqual(source.started, 10);
  });

  QUnit.test("the noise is made once, and shared, because it is the same for every sound", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("dissolve");
    sounds.play("fall");
    sounds.play("bump");

    assert.strictEqual(context.buffers, 1);
    const sources = context.ofKind("source");
    assert.true(sources.every((s) => s.buffer === sources[0].buffer));
  });

  QUnit.test("the noise is random samples between -1 and 1", (assert) => {
    const { sounds, context } = unlocked();
    sounds.play("dissolve");

    const samples = context.ofKind("source")[0].buffer.getChannelData(0);

    assert.true(samples.every((v) => v >= -1 && v <= 1));
    assert.true(new Set(samples).size > samples.length / 2, "not all the same");
  });

  QUnit.test("a muted game makes no sound, and doesn't even touch the audio", (assert) => {
    const { sounds, context } = unlocked({ muted: true });

    assert.false(sounds.play("checkpoint"));

    assert.strictEqual(context.nodes.length, 0);
  });

  QUnit.test("setMuted() turns the sound off and on again", (assert) => {
    const { sounds, context } = unlocked();

    sounds.setMuted(true);
    assert.false(sounds.play("checkpoint"));

    sounds.setMuted(false);
    assert.true(sounds.play("checkpoint"));
    assert.true(context.nodes.length > 0);
  });

  QUnit.test("sounds can be played over each other", (assert) => {
    const { sounds, context } = unlocked();

    sounds.play("checkpoint");
    sounds.play("checkpoint");

    assert.strictEqual(context.ofKind("oscillator").length, SOUNDS.checkpoint.length * 2);
  });
});
