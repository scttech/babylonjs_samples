QUnit.module("musicMix and approach", () => {
  QUnit.test("in the quiet it is the calm bed, and nothing of the tense track", (assert) => {
    const mix = musicMix(0, 1);
    assert.strictEqual(mix.calm, 1);
    assert.strictEqual(mix.tense, 0);
  });

  QUnit.test("as the dread rises the tense track comes in and the calm one goes", (assert) => {
    let last = musicMix(0, 1);
    for (let d = 0.05; d <= 0.6; d += 0.05) {
      const mix = musicMix(d, 1);
      assert.true(mix.calm <= last.calm + 1e-9, "the calm goes down");
      assert.true(mix.tense >= last.tense - 1e-9, "the tense comes up");
      last = mix;
    }
    assert.true(last.tense > 0.9 && last.calm < 0.05);
  });

  QUnit.test("at the edge of the strike both are out: the silence", (assert) => {
    const mix = musicMix(1, 1);
    assert.true(mix.calm < 1e-6 && mix.tense < 1e-6);
    assert.true(musicMix(0.7, 1).tense > musicMix(0.95, 1).tense, "the tense track goes before the strike, not after");
  });

  QUnit.test("a level with a long silence has the music out sooner", (assert) => {
    assert.true(musicMix(0.7, 1, 1.4).tense < musicMix(0.7, 1, 0.7).tense);
  });

  QUnit.test("the room's own loudness scales both, so the strike silences the music and the aftershock brings it back", (assert) => {
    const calm = musicMix(0, 0);
    assert.deepEqual([calm.calm, calm.tense], [0, 0]);
    const half = musicMix(0, 0.5);
    assert.strictEqual(half.calm, 0.5);
  });

  QUnit.test("no number is ever outside 0 to 1", (assert) => {
    for (let d = -0.5; d <= 1.5; d += 0.05) for (const a of [0, 0.5, 1]) for (const s of [0.5, 1, 1.4]) {
      const mix = musicMix(d, a, s);
      assert.true(mix.calm >= 0 && mix.calm <= 1 && mix.tense >= 0 && mix.tense <= 1, `${d} ${a} ${s}`);
    }
  });

  QUnit.test("approach goes towards the target and never past it", (assert) => {
    let x = 0;
    for (let i = 0; i < 300; i++) {
      const next = approach(x, 1, 1 / 60, 1.4);
      assert.true(next >= x && next <= 1);
      x = next;
    }
    assert.true(x > 0.95, "and gets there in about the time it was told");
    assert.strictEqual(approach(0.3, 0.9, 0.1, 0), 0.9, "no time is at once");
    assert.true(approach(1, 0, 1 / 60, 1.4) < 1);
  });
});

QUnit.module("Music", () => {
  const fakeAudio = () => {
    const gains = [];
    const context = {
      createMediaElementSource: (element) => ({ element, connect(node) { this.to = node; } }),
      createGain: () => { const node = { gain: { value: 1 }, connect(target) { this.to = target; } }; gains.push(node); return node; },
    };
    return { context, master: { name: "master" }, gains, started: 0, start() { this.started += 1; return Promise.resolve(); } };
  };
  const fakeElement = (url) => ({ url, volume: 1, plays: 0, pauses: 0, play() { this.plays += 1; return Promise.resolve(); }, pause() { this.pauses += 1; } });
  const make = (table = MUSIC) => {
    const audio = fakeAudio();
    const elements = [];
    const music = new Music(audio, table, (url) => { const e = fakeElement(url); elements.push(e); return e; });
    return { music, audio, elements };
  };

  QUnit.test("there are two tracks, in the assets, and each has a volume", (assert) => {
    assert.deepEqual(Object.keys(MUSIC.tracks), ["calm", "tense"]);
    for (const track of Object.values(MUSIC.tracks)) {
      assert.true(track.url.startsWith("../assets/music/") && track.url.endsWith(".mp3"));
      assert.true(track.volume > 0 && track.volume <= 1);
    }
  });

  QUnit.test("starting plays both files at once, from the tap, silent, and then puts them in the sound graph", async (assert) => {
    const { music, audio, elements } = make();
    const starting = music.start();
    assert.strictEqual(elements.length, 2);
    assert.true(elements.every((e) => e.plays === 1 && e.volume === 0), "playing now, and not heard directly");
    assert.false(music.started, "not in the graph yet");
    await starting;
    assert.true(music.started);
    assert.strictEqual(audio.started, 1);
    assert.true(elements.every((e) => e.volume === 1));
    assert.true(audio.gains.every((g) => g.to === audio.master && g.gain.value === 0), "into the master, silent");
  });

  QUnit.test("it is started once, however many times it is asked", async (assert) => {
    const { music, elements } = make();
    await Promise.all([music.start(), music.start()]);
    assert.strictEqual(elements.length, 2);
  });

  QUnit.test("a file the phone will not play yet is not an error", async (assert) => {
    const audio = fakeAudio();
    const music = new Music(audio, MUSIC, (url) => ({ ...fakeElement(url), play: () => Promise.reject(new Error("wants a tap")) }));
    await music.start();
    assert.true(music.started);
  });

  QUnit.test("the mix is eased to where the dread says", async (assert) => {
    const { music } = make();
    await music.start();
    music.update(1 / 60, { dread: 0, ambient: 1, silence: 1 });
    const first = music.levels();
    assert.true(first.calm > 0 && first.calm < MUSIC.volume * MUSIC.tracks.calm.volume, "on its way, and not there at once");
    for (let i = 0; i < 400; i++) music.update(1 / 60, { dread: 0, ambient: 1, silence: 1 });
    assert.true(Math.abs(music.levels().calm - MUSIC.volume * MUSIC.tracks.calm.volume) < 0.01);
    assert.true(music.levels().tense < 0.001);
    for (let i = 0; i < 400; i++) music.update(1 / 60, { dread: 0.6, ambient: 1, silence: 1 });
    assert.true(music.levels().tense > music.levels().calm, "the tense track is the louder now");
  });

  QUnit.test("a strike silences it, and it comes back", async (assert) => {
    const { music } = make();
    await music.start();
    for (let i = 0; i < 400; i++) music.update(1 / 60, { dread: 0.5, ambient: 1, silence: 1 });
    const before = music.levels().tense;
    for (let i = 0; i < 300; i++) music.update(1 / 60, { dread: 0.5, ambient: 0, silence: 1 });
    assert.true(music.levels().tense < before * 0.05);
    for (let i = 0; i < 400; i++) music.update(1 / 60, { dread: 0.5, ambient: 1, silence: 1 });
    assert.true(Math.abs(music.levels().tense - before) < 0.01);
  });

  QUnit.test("switched off, it fades out and stays out", async (assert) => {
    const { music } = make({ ...MUSIC, enabled: false });
    await music.start();
    for (let i = 0; i < 200; i++) music.update(1 / 60, { dread: 0, ambient: 1, silence: 1 });
    assert.true(Object.values(music.levels()).every((level) => level < 1e-6));
  });

  QUnit.test("nothing happens before it has started", (assert) => {
    const { music } = make();
    music.update(1, { dread: 0, ambient: 1, silence: 1 });
    assert.deepEqual(music.levels(), {});
  });

  QUnit.test("it can be paused (a page that is hidden) and resumed", async (assert) => {
    const { music, elements } = make();
    await music.start();
    music.pause();
    assert.true(elements.every((e) => e.pauses === 1));
    for (let i = 0; i < 300; i++) music.update(1 / 60, { dread: 0, ambient: 1, silence: 1 });
    assert.true(Object.values(music.levels()).every((level) => level < 1e-6), "and silent while it is");
    music.resume();
    assert.true(elements.every((e) => e.plays === 2));
  });
});

QUnit.module("the real tracks", () => {
  QUnit.test("each file loads, is a couple of minutes long, and can be looped", async (assert) => {
    for (const [name, track] of Object.entries(MUSIC.tracks)) {
      const element = new Audio(track.url);
      element.preload = "metadata";
      await new Promise((resolve, reject) => {
        element.addEventListener("loadedmetadata", resolve, { once: true });
        element.addEventListener("error", () => reject(new Error(`${name} did not load`)), { once: true });
      });
      assert.true(element.duration > 60 && element.duration < 300, `${name}: ${element.duration.toFixed(0)} s`);
    }
  });
});
