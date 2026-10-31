QUnit.module("soundPlan", () => {
  QUnit.test("every sound of the game has layers with a length, a gain and a kind", (assert) => {
    for (const name of Object.keys(SOUNDS)) {
      const plan = soundPlan(name);
      assert.true(plan.length > 0, name);
      for (const layer of plan) {
        assert.true(layer.length > 0 && layer.length < 1, `${name} length`);
        assert.true(layer.gain > 0 && layer.gain <= 1, `${name} gain`);
        assert.true(layer.kind === "tone" || layer.kind === "noise", `${name} kind`);
        if (layer.kind === "tone") assert.true(layer.from > 20 && layer.to > 20, `${name} pitch`);
      }
    }
  });

  QUnit.test("strength changes the loudness, and nothing is louder than one", (assert) => {
    const soft = soundPlan("land", 0.2)[0];
    const hard = soundPlan("land", 1.4)[0];
    assert.true(hard.gain > soft.gain);
    assert.true(hard.length > soft.length, "a harder landing rings a little longer");
    assert.true(soundPlan("land", 100).every((layer) => layer.gain <= 1));
    assert.strictEqual(soundPlan("land", -3)[0].gain, 0, "no strength is no sound");
  });

  QUnit.test("an unknown sound is nothing", (assert) => {
    assert.deepEqual(soundPlan("a quack"), []);
  });

  QUnit.test("every move that flow knows has a sound of its own, and the sounds are in the table", (assert) => {
    for (const kind of Object.keys(FLOW.points).filter((k) => k !== "token")) assert.true(kind in MOVE_SOUNDS, kind);
    for (const name of Object.values(MOVE_SOUNDS)) assert.true(name in SOUNDS, name);
  });
});

QUnit.module("landings and footsteps", () => {
  QUnit.test("a small fall is not heard, a bigger one is, and a hard one is stronger", (assert) => {
    assert.strictEqual(landingSound(1), null);
    const medium = landingSound(8);
    const hard = landingSound(20);
    assert.strictEqual(medium.name, "land");
    assert.true(hard.strength > medium.strength);
    assert.true(hard.strength <= 1.5);
  });

  QUnit.test("a foot comes down every stride when running, and none while standing or in the air", (assert) => {
    const clock = new FootstepClock();
    let steps = 0;
    for (let t = 0; t < 10; t += 1 / 60) if (clock.update(1 / 60, 5, true)) steps++;
    assert.true(Math.abs(steps - (5 * 10) / BODY_SOUND.stride) <= 2, `${steps} steps in ten seconds at 5 m/s`);
    const still = new FootstepClock();
    for (let t = 0; t < 5; t += 1 / 60) assert.false(still.update(1 / 60, 0, true));
    const flying = new FootstepClock();
    for (let t = 0; t < 5; t += 1 / 60) assert.false(flying.update(1 / 60, 6, false));
  });

  QUnit.test("a faster runner has steps closer together", (assert) => {
    const count = (speed) => {
      const clock = new FootstepClock();
      let steps = 0;
      for (let t = 0; t < 10; t += 1 / 60) if (clock.update(1 / 60, speed, true)) steps++;
      return steps;
    };
    assert.true(count(8) > count(3));
  });

  QUnit.test("the first foot comes soon after starting to move", (assert) => {
    const clock = new FootstepClock();
    clock.update(1 / 60, 0, true);
    let frames = 0;
    while (!clock.update(1 / 60, 5, true) && frames < 120) frames++;
    assert.true(frames / 60 < (BODY_SOUND.stride / 5) * 0.7, `${frames} frames`);
  });
});

QUnit.module("Sound", () => {
  // A stand-in for a Web Audio context that remembers what was made.
  const stand = () => {
    const made = { oscillators: 0, buffers: 0, gains: 0, filters: 0, started: [] };
    const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
    const node = (extra = {}) => ({ connect() {}, ...extra });
    return {
      made,
      currentTime: 2,
      sampleRate: 8000,
      state: "suspended",
      resume() { this.state = "running"; },
      destination: node(),
      createGain: () => { made.gains++; return node({ gain: param() }); },
      createOscillator: () => { made.oscillators++; return node({ frequency: param(), start: (t) => made.started.push(t), stop() {} }); },
      createBufferSource: () => { made.buffers++; return node({ start: (t) => made.started.push(t), stop() {} }); },
      createBiquadFilter: () => { made.filters++; return node({ frequency: param() }); },
      createBuffer: (channels, length) => ({ getChannelData: () => new Float32Array(length) }),
    };
  };

  QUnit.test("with no context there is no sound, and nothing goes wrong", (assert) => {
    const sound = new Sound(null);
    assert.false(sound.ready);
    assert.strictEqual(sound.play("jump"), 0);
  });

  QUnit.test("a sound makes a source for each layer, at the time it was asked for, and a delayed layer later", (assert) => {
    const context = stand();
    const sound = new Sound(context);
    assert.strictEqual(sound.play("token"), 2);
    assert.strictEqual(context.made.oscillators, 2);
    assert.strictEqual(context.made.started[0], 2);
    assert.true(Math.abs(context.made.started[1] - 2.07) < 1e-9, "the second note is the delayed one");
    sound.play("step", 1, 5);
    assert.strictEqual(context.made.buffers, 1);
    assert.strictEqual(context.made.filters, 1);
    assert.strictEqual(context.made.started[2], 5);
  });

  QUnit.test("the volume is held between nothing and full", (assert) => {
    const sound = new Sound(stand());
    sound.setVolume(4);
    assert.strictEqual(sound.volume, 1);
    assert.strictEqual(sound.master.gain.value, 1);
    sound.setVolume(-1);
    assert.strictEqual(sound.volume, 0);
  });

  QUnit.test("unlock wakes a context that is asleep", (assert) => {
    const context = stand();
    const sound = new Sound(context);
    assert.true(sound.unlock());
    assert.strictEqual(context.state, "running");
  });

  QUnit.test("every sound can be rendered, is not silent, and ends in quiet", async (assert) => {
    for (const name of Object.keys(SOUNDS)) {
      const context = new OfflineAudioContext(1, 44100, 44100);
      const sound = new Sound(context);
      sound.setVolume(1);
      sound.play(name, 1, 0);
      const data = (await context.startRendering()).getChannelData(0);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v));
      let tail = 0;
      for (let i = 44100 - 2000; i < 44100; i++) tail = Math.max(tail, Math.abs(data[i]));
      assert.true(peak > 0.004 && peak <= 1, `${name} peaks at ${peak.toFixed(3)}`);
      assert.true(tail < 0.002, `${name} is quiet by the end`);
    }
  });
});
