QUnit.module("clipFor", () => {
  QUnit.test("a runner that is running sprints", (assert) => {
    assert.strictEqual(clipFor({ running: true }), CLIPS.run);
  });

  QUnit.test("a runner that has stopped stands", (assert) => {
    assert.strictEqual(clipFor({ running: false }), CLIPS.idle);
  });

  QUnit.test("the clips are the names the character file uses", (assert) => {
    assert.strictEqual(CLIPS.idle, "Idle_Loop");
    assert.strictEqual(CLIPS.run, "Sprint_Loop");
  });
});

QUnit.module("ClipPlayer", () => {
  // A stand-in for an animation group: it only remembers what it was told.
  class FakeClip {
    constructor() {
      this.playing = false;
      this.looping = null;
      this.starts = 0;
      this.stops = 0;
    }
    start(loop) {
      this.playing = true;
      this.looping = loop;
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
    ]);
    return { clips, player: new ClipPlayer(clips) };
  };

  QUnit.test("nothing is playing to begin with", (assert) => {
    const { clips, player } = makePlayer();

    assert.strictEqual(player.current, null);
    assert.false(clips.get("Idle_Loop").playing);
  });

  QUnit.test("play() starts the named clip, looping", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Idle_Loop");

    assert.true(clips.get("Idle_Loop").playing);
    assert.true(clips.get("Idle_Loop").looping);
    assert.strictEqual(player.current, "Idle_Loop");
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

  QUnit.test("can switch back and forth", (assert) => {
    const { clips, player } = makePlayer();

    player.play("Idle_Loop");
    player.play("Sprint_Loop");
    player.play("Idle_Loop");

    assert.true(clips.get("Idle_Loop").playing);
    assert.false(clips.get("Sprint_Loop").playing);
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
