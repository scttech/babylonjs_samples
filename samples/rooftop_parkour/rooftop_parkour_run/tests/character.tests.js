QUnit.module("clipForSpeed", () => {
  QUnit.test("standing still is the idle clip, at the speed it was recorded", (assert) => {
    assert.deepEqual(clipForSpeed(0), { name: CLIPS.idle, rate: 1 });
    assert.strictEqual(clipForSpeed(GAITS.walk - 0.01).name, CLIPS.idle);
  });

  QUnit.test("each gait has its own clip, from slow to fast", (assert) => {
    assert.strictEqual(clipForSpeed(GAITS.walk).name, CLIPS.walk);
    assert.strictEqual(clipForSpeed(GAITS.jog - 0.01).name, CLIPS.walk);
    assert.strictEqual(clipForSpeed(GAITS.jog).name, CLIPS.jog);
    assert.strictEqual(clipForSpeed(GAITS.sprint - 0.01).name, CLIPS.jog);
    assert.strictEqual(clipForSpeed(GAITS.sprint).name, CLIPS.sprint);
    assert.strictEqual(clipForSpeed(50).name, CLIPS.sprint);
  });

  QUnit.test("a clip plays faster as the runner does, so the feet keep up with the ground", (assert) => {
    assert.true(clipForSpeed(5).rate > clipForSpeed(3).rate);
    assert.true(Math.abs(clipForSpeed(PACE.jog).rate - 1) < 1e-9);
  });

  QUnit.test("the rate is held between the least and the most", (assert) => {
    assert.strictEqual(clipForSpeed(GAITS.walk).rate, MIN_RATE);
    assert.strictEqual(clipForSpeed(100).rate, MAX_RATE);
    for (let speed = 0; speed < 20; speed += 0.25) {
      const { rate } = clipForSpeed(speed);
      assert.true(rate >= MIN_RATE && rate <= MAX_RATE || rate === 1, `at ${speed}`);
    }
  });

  QUnit.test("the gaits are in order", (assert) => {
    assert.true(GAITS.walk < GAITS.jog && GAITS.jog < GAITS.sprint);
  });

  QUnit.test("the clips are all clips the character file has, and the runners are both there", (assert) => {
    assert.deepEqual(Object.keys(RUNNERS).sort(), ["female", "male"]);
    assert.true(Object.values(RUNNERS).every((runner) => runner.file.endsWith(".glb") && runner.label.length > 0));
    assert.deepEqual(Object.values(CLIPS), ["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop", "Sprint_Loop", "Jump_Loop", "Jump_Land"]);
  });
});

QUnit.module("clipForBody", () => {
  const body = (changes) => ({ grounded: true, landing: 0, speed: 0, ...changes });

  QUnit.test("on the ground, it is the clip for the speed, looping", (assert) => {
    assert.deepEqual(clipForBody(body({ speed: 0 })), { name: CLIPS.idle, rate: 1, loop: true });
    assert.strictEqual(clipForBody(body({ speed: 4.5 })).name, CLIPS.jog);
    assert.strictEqual(clipForBody(body({ speed: 7.5 })).name, CLIPS.sprint);
    assert.true(clipForBody(body({ speed: 4.5 })).loop);
  });

  QUnit.test("in the air, it is the falling clip, whatever the speed", (assert) => {
    for (const speed of [0, 4.5, 7.5]) assert.deepEqual(clipForBody(body({ grounded: false, speed })), { name: CLIPS.fall, rate: 1, loop: true });
  });

  QUnit.test("just after a hard landing, it is the landing clip, played once", (assert) => {
    const clip = clipForBody(body({ landing: 0.2, speed: 4.5 }));
    assert.strictEqual(clip.name, CLIPS.land);
    assert.strictEqual(clip.rate, LAND_RATE);
    assert.false(clip.loop);
  });

  QUnit.test("in the air wins over a landing, since it is falling again", (assert) => {
    assert.strictEqual(clipForBody(body({ grounded: false, landing: 0.2 })).name, CLIPS.fall);
  });
});

QUnit.module("ClipPlayer", () => {
  class FakeClip {
    constructor(name) {
      this.name = name;
      this.playing = false;
      this.starts = 0;
      this.loop = null;
      this.speedRatio = 1;
      this.weight = 1;
    }
    start(loop, rate) {
      this.playing = true;
      this.starts++;
      this.loop = loop;
      this.speedRatio = rate;
    }
    stop() {
      this.playing = false;
    }
    setWeightForAllAnimatables(weight) {
      this.weight = weight;
    }
  }

  const make = () => {
    const clips = new Map(["Idle_Loop", "Walk_Loop", "Jog_Fwd_Loop"].map((name) => [name, new FakeClip(name)]));
    return { clips, player: new ClipPlayer(clips) };
  };

  QUnit.test("plays a clip looping, at the rate asked", (assert) => {
    const { clips, player } = make();
    player.play("Walk_Loop", 1.2);
    assert.true(clips.get("Walk_Loop").playing);
    assert.true(clips.get("Walk_Loop").loop);
    assert.strictEqual(clips.get("Walk_Loop").speedRatio, 1.2);
    assert.strictEqual(player.current, "Walk_Loop");
  });

  QUnit.test("a clip can be played once, and not looping", (assert) => {
    const { clips, player } = make();
    player.play("Walk_Loop", 1, false);
    assert.false(clips.get("Walk_Loop").loop);
  });

  QUnit.test("asking for the clip that is playing doesn't start it again, and only follows the rate", (assert) => {
    const { clips, player } = make();
    player.play("Walk_Loop", 1);
    player.play("Walk_Loop", 1.4);
    assert.strictEqual(clips.get("Walk_Loop").starts, 1);
    assert.strictEqual(clips.get("Walk_Loop").speedRatio, 1.4);
  });

  QUnit.test("a new clip starts at nothing and fades in, while the old one fades out and then stops", (assert) => {
    const { clips, player } = make();
    player.play("Idle_Loop");
    player.update(1);
    player.play("Walk_Loop");
    assert.strictEqual(clips.get("Walk_Loop").weight, 0);

    player.update(FADE_TIME / 2);
    assert.true(Math.abs(clips.get("Walk_Loop").weight - 0.5) < 1e-9);
    assert.true(Math.abs(clips.get("Idle_Loop").weight - 0.5) < 1e-9);
    assert.true(clips.get("Idle_Loop").playing);

    player.update(FADE_TIME);
    assert.strictEqual(clips.get("Walk_Loop").weight, 1);
    assert.false(clips.get("Idle_Loop").playing);
    assert.deepEqual(player.fading, []);
  });

  QUnit.test("the weights of the two clips always add up to 1 during a fade", (assert) => {
    const { clips, player } = make();
    player.play("Idle_Loop");
    player.update(1);
    player.play("Jog_Fwd_Loop");
    for (let i = 0; i < 3; i++) {
      player.update(FADE_TIME / 4);
      assert.true(Math.abs(clips.get("Idle_Loop").weight + clips.get("Jog_Fwd_Loop").weight - 1) < 1e-9);
    }
  });

  QUnit.test("a clip that comes back while it is fading out is no longer on its way out", (assert) => {
    const { player } = make();
    player.play("Idle_Loop");
    player.update(1);
    player.play("Walk_Loop");
    player.play("Idle_Loop");
    assert.false(player.fading.includes("Idle_Loop"));
    assert.true(player.fading.includes("Walk_Loop"));
  });

  QUnit.test("a clip that isn't there is an error that says so", (assert) => {
    const { player } = make();
    assert.throws(() => player.play("Backflip"), /no clip called "Backflip"/);
  });

  QUnit.test("update with nothing playing does nothing", (assert) => {
    const { player } = make();
    player.update(1);
    assert.strictEqual(player.current, null);
  });
});
