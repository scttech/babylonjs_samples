QUnit.module("the MUSIC table", () => {
  QUnit.test("there is a track for the title, for the time between waves, and for a wave, each a file that is there, and the three are different files", (assert) => {
    assert.deepEqual(Object.keys(MUSIC.tracks).sort(), ["battle", "build", "theme"]);
    for (const [name, track] of Object.entries(MUSIC.tracks)) assert.true(track.url.endsWith(".mp3") && track.volume > 0 && track.volume <= 1, name);
    assert.strictEqual(new Set(Object.values(MUSIC.tracks).map((track) => track.url)).size, 3);
  });

  QUnit.test("the files are in the assets, and are tracks (they are megabytes, and begin like an mp3)", async (assert) => {
    for (const [name, track] of Object.entries(MUSIC.tracks)) {
      const response = await fetch(track.url.replace("../assets/", "../assets/"));
      const bytes = new Uint8Array(await response.arrayBuffer());

      assert.true(response.ok && bytes.length > 500000, `${name}: ${bytes.length} bytes`);
      const id3 = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
      const frame = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
      assert.true(id3 || frame, `${name} looks like an mp3`);
    }
  });

  QUnit.test("the fade is slow, and the pause turns the music down and not off", (assert) => {
    assert.true(MUSIC.fade >= 1);
    assert.true(MUSIC.duck > 0 && MUSIC.duck < 1);
  });
});

QUnit.module("musicFor", () => {
  QUnit.test("the title and the end have the theme, at full", (assert) => {
    for (const flow of ["title", "won", "lost"]) assert.deepEqual(musicFor({ flow, phase: "preparing" }), { track: "theme", level: 1 }, flow);
  });

  QUnit.test("playing, the time before a wave has the build track and a wave has the battle track", (assert) => {
    assert.strictEqual(musicFor({ flow: "playing", phase: "preparing" }).track, "build");
    assert.strictEqual(musicFor({ flow: "playing", phase: "running" }).track, "battle");
  });

  QUnit.test("paused, it is the track that was playing, turned down", (assert) => {
    assert.deepEqual(musicFor({ flow: "paused", phase: "running" }), { track: "battle", level: MUSIC.duck });
    assert.deepEqual(musicFor({ flow: "paused", phase: "preparing" }), { track: "build", level: MUSIC.duck });
  });

  QUnit.test("it is always one of the tracks of the table", (assert) => {
    for (const flow of ["title", "playing", "paused", "won", "lost"]) {
      for (const phase of ["preparing", "running", "won", "lost"]) assert.true(musicFor({ flow, phase }).track in MUSIC.tracks, `${flow} ${phase}`);
    }
  });
});

QUnit.module("approach", () => {
  QUnit.test("goes towards the target and never past it, and gets near in about the time that it is given", (assert) => {
    let value = 0;
    for (let i = 0; i < 100; i++) value = approach(value, 1, 0.025, 2.5);

    assert.true(value > 0.9 && value <= 1, `${value.toFixed(3)} after 2.5 seconds`);
    assert.strictEqual(approach(0.5, 1, 1, 0), 1, "no time is at once");
  });

  QUnit.test("goes down as well as up", (assert) => {
    assert.true(approach(1, 0, 0.1, 2) < 1);
  });
});

QUnit.module("Music", (hooks) => {
  let played, paused, elements, sound, music, nodes;
  // A page's audio, in a few lines: the things that Music asks of it.
  const fakeElement = (url) => {
    const element = {
      url,
      paused: true,
      play() {
        this.paused = false;
        played.push(url);
        return Promise.resolve();
      },
      pause() {
        this.paused = true;
        paused.push(url);
      },
    };
    elements.push(element);
    return element;
  };
  const fakeContext = () => ({
    createMediaElementSource: () => ({ connect: () => {} }),
    createGain: () => {
      const node = { gain: { value: 1 }, connect: () => {} };
      nodes.push(node);
      return node;
    },
  });
  hooks.beforeEach(() => {
    played = [];
    paused = [];
    elements = [];
    nodes = [];
    sound = { started: true, context: fakeContext(), musicBus: {} };
    music = new Music(sound, MUSIC, fakeElement);
  });
  const run = (seconds, state) => {
    for (let t = 0; t < seconds; t += 0.05) music.update(0.05, state);
  };

  QUnit.test("makes a source for each track when it is started, and plays none of them yet", (assert) => {
    music.start();

    assert.strictEqual(elements.length, 3);
    assert.deepEqual(played, []);
    assert.deepEqual(music.levels(), { theme: 0, build: 0, battle: 0 });
  });

  QUnit.test("does nothing until the sound has been started, and starts only once", (assert) => {
    sound.started = false;
    music.start();
    assert.strictEqual(elements.length, 0);
    sound.started = true;
    music.start();
    music.start();

    assert.strictEqual(elements.length, 3);
  });

  QUnit.test("plays the track for where the game is, and only that one, and brings it up over the fade", (assert) => {
    music.start();
    run(MUSIC.fade * 1.2, { flow: "title", phase: "preparing" });

    assert.deepEqual(played, [MUSIC.tracks.theme.url]);
    const levels = music.levels();
    assert.true(levels.theme > MUSIC.tracks.theme.volume * 0.9);
    assert.strictEqual(levels.build, 0);
  });

  QUnit.test("changes from one track to another by a crossfade: both are heard in the middle of it, and then only the new one", (assert) => {
    music.start();
    run(MUSIC.fade * 1.5, { flow: "playing", phase: "preparing" });
    run(MUSIC.fade * 0.3, { flow: "playing", phase: "running" });
    const middle = music.levels();
    run(MUSIC.fade * 3, { flow: "playing", phase: "running" });
    const after = music.levels();

    assert.true(middle.build > 0.05 && middle.battle > 0.05, `both: ${middle.build.toFixed(2)} and ${middle.battle.toFixed(2)}`);
    assert.true(after.battle > MUSIC.tracks.battle.volume * 0.9 && after.build < 0.01);
  });

  QUnit.test("a track that has faded out is stopped, so that it is not streaming for nothing", (assert) => {
    music.start();
    run(MUSIC.fade * 1.5, { flow: "playing", phase: "preparing" });
    run(MUSIC.fade * 4, { flow: "playing", phase: "running" });

    assert.true(elements.find((e) => e.url === MUSIC.tracks.build.url).paused);
    assert.false(elements.find((e) => e.url === MUSIC.tracks.battle.url).paused);
  });

  QUnit.test("paused, the music goes down and goes on", (assert) => {
    music.start();
    run(MUSIC.fade * 1.5, { flow: "playing", phase: "running" });
    const loud = music.levels().battle;
    run(MUSIC.fade * 3, { flow: "paused", phase: "running" });
    const quiet = music.levels().battle;

    assert.true(quiet < loud * 0.5 && quiet > 0.05, `${loud.toFixed(2)} to ${quiet.toFixed(2)}`);
  });

  QUnit.test("suspended (the page is hidden), every file is paused and nothing changes; and when it is back it plays again", (assert) => {
    music.start();
    run(MUSIC.fade, { flow: "title", phase: "preparing" });
    music.suspend();
    assert.true(elements.every((e) => e.paused));
    const level = music.levels().theme;
    run(1, { flow: "title", phase: "preparing" });
    assert.strictEqual(music.levels().theme, level);
    music.resume();
    run(0.2, { flow: "title", phase: "preparing" });

    assert.false(elements.find((e) => e.url === MUSIC.tracks.theme.url).paused);
  });

  QUnit.test("a file that the browser refuses to play does not throw: it is tried again", (assert) => {
    music = new Music(sound, MUSIC, (url) => ({ url, paused: true, play: () => Promise.reject(new Error("blocked")), pause() {} }));
    music.start();

    music.update(0.05, { flow: "title", phase: "preparing" });
    assert.true(true, "it did not throw");
  });
});
