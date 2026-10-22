QUnit.module("clipFor", () => {
  // The part of a runner that choosing a clip looks at.
  const doing = (move, extra = {}) => ({ running: true, move, timeLeft: 0, speed: RUN_SPEED, ...extra });

  QUnit.test("a runner that is running sprints, looping", (assert) => {
    const clip = clipFor(doing(MOVES.run));

    assert.strictEqual(clip.name, CLIPS.run);
    assert.true(clip.loop);
    assert.strictEqual(clip.speed, 1);
  });

  QUnit.test("a runner who is running faster plays the run faster, in step with the street", (assert) => {
    assert.strictEqual(clipFor(doing(MOVES.run, { speed: RUN_SPEED * 1.5 })).speed, 1.5);
    assert.strictEqual(clipFor(doing(MOVES.run, { speed: RUN_SPEED * 2 })).speed, 2);
  });

  QUnit.test("a runner who has stopped stands at normal speed, however fast he was running", (assert) => {
    assert.strictEqual(clipFor(doing(MOVES.run, { running: false, speed: RUN_SPEED * 2 })).speed, 1);
  });

  QUnit.test("a runner that has stopped stands, looping", (assert) => {
    const clip = clipFor(doing(MOVES.run, { running: false }));

    assert.strictEqual(clip.name, CLIPS.idle);
    assert.true(clip.loop);
  });

  QUnit.test("a jump plays the jump clip once, sped up to fit the jump", (assert) => {
    const clip = clipFor(doing(MOVES.jump));

    assert.strictEqual(clip.name, CLIPS.jump);
    assert.false(clip.loop);
    assert.true(clip.speed > 1);
  });

  QUnit.test("a slide starts by going down into it", (assert) => {
    const clip = clipFor(doing(MOVES.slide, { timeLeft: 0.8 }));

    assert.strictEqual(clip.name, CLIPS.slideStart);
    assert.false(clip.loop);
  });

  QUnit.test("a slide ends by coming back up, for the last SLIDE_EXIT_TIME", (assert) => {
    assert.strictEqual(clipFor(doing(MOVES.slide, { timeLeft: SLIDE_EXIT_TIME + 0.01 })).name, CLIPS.slideStart);
    assert.strictEqual(clipFor(doing(MOVES.slide, { timeLeft: SLIDE_EXIT_TIME })).name, CLIPS.slideExit);
    assert.strictEqual(clipFor(doing(MOVES.slide, { timeLeft: 0.05 })).name, CLIPS.slideExit);
  });

  QUnit.test("a roll plays the roll clip once, sped up", (assert) => {
    const clip = clipFor(doing(MOVES.roll));

    assert.strictEqual(clip.name, CLIPS.roll);
    assert.false(clip.loop);
    assert.true(clip.speed > 1);
  });

    QUnit.test("a vault plays the vault clip once, sped up to fit", (assert) => {
    const clip = clipFor(doing(MOVES.vault));

    assert.strictEqual(clip.name, CLIPS.vault);
    assert.false(clip.loop);
    assert.true(clip.speed > 1);
  });

  QUnit.test("a crash plays the falling clip once, and holds the last pose", (assert) => {
    const clip = clipFor(doing(MOVES.crash, { running: false }));

    assert.strictEqual(clip.name, CLIPS.crash);
    assert.false(clip.loop);
  });

  QUnit.test("every clip it can choose is one the character file has", (assert) => {
    const inFile = ["Idle_Loop", "Sprint_Loop", "Jump_Start", "Slide_Start", "Slide_Exit", "Roll", "NinjaJump_Start", "Death01"];

    for (const name of Object.values(CLIPS)) assert.true(inFile.includes(name), name);
  });

  QUnit.test("works with a real Runner too", (assert) => {
    const runner = new Runner();

    assert.strictEqual(clipFor(runner).name, CLIPS.run);
    runner.jump();
    assert.strictEqual(clipFor(runner).name, CLIPS.jump);
  });
});

QUnit.module("ClipPlayer", () => {
  // A stand-in for an animation group: it only remembers what it was told.
  class FakeClip {
    constructor() {
      this.playing = false;
      this.looping = null;
      this.speed = null;
      this.starts = 0;
      this.stops = 0;
    }
    start(loop, speed) {
      this.playing = true;
      this.looping = loop;
      this.speed = speed;
      this.starts++;
    }
    stop() {
      this.playing = false;
      this.stops++;
    }
  }

  const makePlayer = () => {
    const clips = new Map([
      ["Idle_Loop", new FakeClip()],
      ["Sprint_Loop", new FakeClip()],
      ["Roll", new FakeClip()],
    ]);
    return { clips, player: new ClipPlayer(clips) };
  };

  QUnit.test("nothing is playing to begin with", (assert) => {
    const { clips, player } = makePlayer();

    assert.strictEqual(player.current, null);
    assert.false(clips.get("Idle_Loop").playing);
  });

  QUnit.test("play() starts the named clip, looping at normal speed by default", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Idle_Loop");

    assert.true(clips.get("Idle_Loop").playing);
    assert.true(clips.get("Idle_Loop").looping);
    assert.strictEqual(clips.get("Idle_Loop").speed, 1);
    assert.strictEqual(player.current, "Idle_Loop");
  });

  QUnit.test("play() can play a clip once, at another speed", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Roll", { loop: false, speed: 2 });

    assert.false(clips.get("Roll").looping);
    assert.strictEqual(clips.get("Roll").speed, 2);
  });

  QUnit.test("play() takes the whole object clipFor() returns", (assert) => {
    const { clips, player } = makePlayer();
    const clip = { name: "Roll", loop: false, speed: 2 };

    player.play(clip.name, clip);

    assert.false(clips.get("Roll").looping);
    assert.strictEqual(clips.get("Roll").speed, 2);
  });

  QUnit.test("play() stops the clip that was playing", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Idle_Loop");

    player.play("Sprint_Loop");

    assert.false(clips.get("Idle_Loop").playing);
    assert.true(clips.get("Sprint_Loop").playing);
    assert.strictEqual(player.current, "Sprint_Loop");
  });

  QUnit.test("asking for the clip that is already playing does nothing", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop");

    player.play("Sprint_Loop");
    player.play("Sprint_Loop");

    assert.strictEqual(clips.get("Sprint_Loop").starts, 1, "started once, not restarted every frame");
    assert.strictEqual(clips.get("Sprint_Loop").stops, 0);
  });

  QUnit.test("asking for the clip that is playing, but faster, speeds it up without starting it again", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop", { speed: 1 });

    player.play("Sprint_Loop", { speed: 1.4 });

    assert.strictEqual(clips.get("Sprint_Loop").starts, 1, "not restarted");
    assert.strictEqual(clips.get("Sprint_Loop").speedRatio, 1.4);
  });

  QUnit.test("it keeps following the speed as it changes", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop", { speed: 1 });

    player.play("Sprint_Loop", { speed: 1.2 });
    player.play("Sprint_Loop", { speed: 1.3 });

    assert.strictEqual(clips.get("Sprint_Loop").speedRatio, 1.3);
    assert.strictEqual(player.speed, 1.3);
  });

  QUnit.test("asking again at the same speed does nothing", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop", { speed: 1.2 });
    clips.get("Sprint_Loop").speedRatio = 99; // would be overwritten if it were set again

    player.play("Sprint_Loop", { speed: 1.2 });

    assert.strictEqual(clips.get("Sprint_Loop").speedRatio, 99);
  });

  QUnit.test("can switch back and forth, and a clip starts from the beginning each time", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Idle_Loop");
    player.play("Roll", { loop: false });
    player.play("Idle_Loop");

    assert.true(clips.get("Idle_Loop").playing);
    assert.false(clips.get("Roll").playing);
    assert.strictEqual(clips.get("Idle_Loop").starts, 2);
  });

  QUnit.test("play() refuses a clip the character doesn't have, and leaves the current one alone", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Idle_Loop");

    assert.throws(() => player.play("Backflip"), /no clip called "Backflip"/);

    assert.true(clips.get("Idle_Loop").playing);
    assert.strictEqual(player.current, "Idle_Loop");
  });

  QUnit.test("stop() stops whatever is playing, and the next play() starts it again", (assert) => {
    const { clips, player } = makePlayer();
    player.play("Sprint_Loop");

    player.stop();

    assert.false(clips.get("Sprint_Loop").playing);
    assert.strictEqual(player.current, null);

    player.play("Sprint_Loop");
    assert.true(clips.get("Sprint_Loop").playing);
  });

  QUnit.test("stop() with nothing playing is harmless", (assert) => {
    const { player } = makePlayer();

    player.stop();

    assert.strictEqual(player.current, null);
  });
});

QUnit.module("pitchFor", () => {
  QUnit.test("a vault leans forward over the barrier", (assert) => {
    assert.strictEqual(pitchFor({ move: MOVES.vault }), VAULT_PITCH);
    assert.true(VAULT_PITCH > 0, "forward is a positive turn about x");
  });

  QUnit.test("but not too far: he doesn't go over on his head", (assert) => {
    assert.true(VAULT_PITCH < Math.PI / 3);
  });

  QUnit.test("every other move stays upright", (assert) => {
    for (const move of [MOVES.run, MOVES.jump, MOVES.slide, MOVES.roll, MOVES.crash]) assert.strictEqual(pitchFor({ move }), 0, move);
  });
});

QUnit.module("liftFor", () => {
  QUnit.test("a runner that is sliding is lifted a little, so his hand stays out of the ground", (assert) => {
    assert.strictEqual(liftFor({ move: MOVES.slide }), SLIDE_LIFT);
    assert.true(SLIDE_LIFT > 0);
  });

  QUnit.test("the lift is small: the model doesn't float", (assert) => {
    assert.true(SLIDE_LIFT < 0.2);
  });

  QUnit.test("a crashed runner is lifted a little too, so his arm and head stay out of the street", (assert) => {
    assert.strictEqual(liftFor({ move: MOVES.crash }), CRASH_LIFT);
    assert.true(CRASH_LIFT > 0 && CRASH_LIFT < 0.2);
  });

  QUnit.test("every other move has no lift", (assert) => {
    for (const move of [MOVES.run, MOVES.jump, MOVES.vault, MOVES.roll]) assert.strictEqual(liftFor({ move }), 0, move);
  });
});
