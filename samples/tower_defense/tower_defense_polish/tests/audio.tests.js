QUnit.module("the SOUNDS table", () => {
  QUnit.test("every effect has notes, and a gap, and every note is a tone or noise with a time, a volume and pitches", (assert) => {
    for (const [name, sound] of Object.entries(SOUNDS)) {
      assert.true(sound.notes.length >= 1 && sound.gap >= 0, name);
      for (const note of sound.notes) {
        assert.true(["sine", "triangle", "square", "sawtooth", "noise"].includes(note.wave), `${name} ${note.wave}`);
        assert.true(note.seconds > 0 && note.at >= 0 && note.volume > 0 && note.volume <= 1, name);
        assert.true(note.from > 20 && note.to > 20 && note.from < 20000 && note.to < 20000, `${name}: ${note.from} to ${note.to}`);
      }
    }
  });

  QUnit.test("none is long: an effect is a moment, and the longest is a second or so", (assert) => {
    for (const name of Object.keys(SOUNDS)) assert.true(soundLength(name) <= 1.5, `${name}: ${soundLength(name).toFixed(2)}`);
  });

  QUnit.test("there is an effect for what the player does, for what the game does, and for each nation's shot", (assert) => {
    for (const name of ["build", "upgrade", "sell", "refuse", "wave", "defeated", "leaked", "cleared", "won", "lost"]) assert.true(name in SOUNDS, name);
    for (const spec of Object.values(BENDERS)) assert.true(`shot_${spec.effect}` in SOUNDS, spec.effect);
  });

  QUnit.test("a shot that comes four times in a combo is not four bangs: the fire nation's has a gap that is at least a tenth of a second", (assert) => {
    assert.true(SOUNDS.shot_burn.gap >= 0.1);
  });
});

QUnit.module("soundFor", () => {
  QUnit.test("is the name of the sound of an event, and the shot is the sound of the effect that it carries", (assert) => {
    assert.strictEqual(soundFor("build"), "build");
    assert.strictEqual(soundFor("shot", "slow"), "shot_slow");
  });

  QUnit.test("is nothing for an event that has no sound, or a shot with no effect", (assert) => {
    assert.strictEqual(soundFor("flood"), null);
    assert.strictEqual(soundFor("shot", null), null);
    assert.strictEqual(soundFor("shot"), null);
    assert.strictEqual(soundFor("toString"), null, "and a name that every object has is not a sound");
  });

  QUnit.test("every event that the game says is one that has a sound", (assert) => {
    for (const name of ["build", "upgrade", "sell", "refuse", "wave", "defeated", "leaked", "cleared", "won", "lost"]) assert.strictEqual(soundFor(name), name);
  });
});

QUnit.module("soundPlan", () => {
  QUnit.test("is the notes of the effect, with every pitch multiplied by the factor, and a quick attack for a note that says none", (assert) => {
    const plan = soundPlan("build", 2);

    assert.strictEqual(plan.length, SOUNDS.build.notes.length);
    assert.strictEqual(plan[0].from, SOUNDS.build.notes[0].from * 2);
    assert.strictEqual(plan[0].attack, 0.005);
    assert.strictEqual(soundPlan("wave")[0].attack, 0.15, "a horn takes its time");
  });

  QUnit.test("does not change the table", (assert) => {
    const before = JSON.stringify(SOUNDS);
    soundPlan("upgrade", 1.5);

    assert.strictEqual(JSON.stringify(SOUNDS), before);
  });
});

QUnit.module("rendering the effects", () => {
  const RATE = 22050;
  // Plays an effect into an offline context, and gives back what it sounds like as numbers.
  const render = async (name, factor = 1) => {
    const seconds = soundLength(name) + 0.3;
    const context = new OfflineAudioContext(1, Math.ceil(RATE * seconds), RATE);
    const noise = makeNoise(context);
    for (const note of soundPlan(name, factor)) scheduleNote(context, context.destination, note, 0, noise);
    const buffer = await context.startRendering();
    return buffer.getChannelData(0);
  };
  const peak = (data, from = 0, to = data.length) => {
    let most = 0;
    for (let i = from; i < to; i++) most = Math.max(most, Math.abs(data[i]));
    return most;
  };

  QUnit.test("every effect is heard: it has a peak that is well above nothing", async (assert) => {
    for (const name of Object.keys(SOUNDS)) assert.true(peak(await render(name)) > 0.05, name);
  });

  QUnit.test("and none is too loud: no effect on its own goes over the top", async (assert) => {
    for (const name of Object.keys(SOUNDS)) assert.true(peak(await render(name)) <= 1, `${name}: ${peak(await render(name)).toFixed(2)}`);
  });

  QUnit.test("and each is over when it should be: it is quiet after its last note", async (assert) => {
    for (const name of Object.keys(SOUNDS)) {
      const data = await render(name);

      assert.true(peak(data, Math.floor((soundLength(name) + 0.08) * RATE)) < 0.01, name);
    }
  });

  QUnit.test("a note that starts later is quiet until it starts", async (assert) => {
    const data = await render("upgrade");

    assert.true(peak(data, 0, Math.floor(0.05 * RATE)) > 0.05, "the first note is at once");
    assert.true(peak(data, Math.floor(0.45 * RATE), Math.floor(0.6 * RATE)) < 0.05, "and by the time that the last has gone, nothing");
  });

  QUnit.test("a higher factor is a higher pitch: it crosses zero more often", async (assert) => {
    const crossings = (data) => {
      let n = 0;
      for (let i = 1; i < data.length; i++) if (data[i - 1] < 0 !== data[i] < 0) n++;
      return n;
    };

    assert.true(crossings(await render("upgrade", 1.5)) > crossings(await render("upgrade", 1)));
  });

  QUnit.test("a horn rises slowly, and a click does not: the first hundredth of a second of each", async (assert) => {
    const horn = await render("wave");
    const click = await render("click");

    assert.true(peak(horn, 0, Math.floor(0.01 * RATE)) < 0.05);
    assert.true(peak(click, 0, Math.floor(0.02 * RATE)) > 0.05);
  });

  QUnit.test("the noise is the same every time, and has no hum in it: it is centered on nothing", (assert) => {
    const context = new OfflineAudioContext(1, 100, RATE);
    const a = makeNoise(context).getChannelData(0);
    const b = makeNoise(context).getChannelData(0);
    let sum = 0;
    for (const value of a) sum += value;

    assert.deepEqual(Array.from(a.slice(0, 20)), Array.from(b.slice(0, 20)));
    assert.true(Math.abs(sum / a.length) < 0.05, `mean ${(sum / a.length).toFixed(3)}`);
  });
});

QUnit.module("Sound", (hooks) => {
  let sound;
  const make = () => {
    const context = new OfflineAudioContext(1, 22050 * 4, 22050);
    context.resume = () => Promise.resolve(); // an offline context can't be resumed; a page's can
    return context;
  };
  hooks.beforeEach(() => {
    sound = new Sound(make);
  });

  QUnit.test("makes no sound, and says so, before the page has been touched", (assert) => {
    assert.false(sound.started);
    assert.false(sound.play("build"));
  });

  QUnit.test("start makes the context and the three volumes, and says when it is running", async (assert) => {
    await sound.start();

    assert.true(sound.started);
    assert.true(!!sound.master && !!sound.sfx && !!sound.musicBus);
    await sound.start();
    assert.true(sound.started, "and starting it again does no harm");
  });

  QUnit.test("plays an effect once it has started, and says it did", async (assert) => {
    await sound.start();

    assert.true(sound.play("build"));
    assert.strictEqual(sound.active, 1);
  });

  QUnit.test("does not play what isn't an effect", async (assert) => {
    await sound.start();

    assert.false(sound.play("flood"));
    assert.false(sound.play(null));
    assert.false(sound.play("toString"));
  });

  QUnit.test("does not play the same effect again too soon, and does when the gap has gone by", async (assert) => {
    await sound.start();

    assert.true(sound.play("defeated"));
    assert.false(sound.play("defeated"), "at once");
    sound.last.defeated = -10;
    assert.true(sound.play("defeated"), "later");
  });

  QUnit.test("does not play more at once than the table allows", async (assert) => {
    const table = { ...AUDIO, voices: 2 };
    const small = new Sound(make, table);
    await small.start();

    assert.true(small.play("build"));
    assert.true(small.play("upgrade"));
    assert.false(small.play("sell"), "a third");
  });

  QUnit.test("muted, it plays nothing, and goes quiet; and on again, it plays", async (assert) => {
    await sound.start();
    sound.setMuted(true);
    assert.true(sound.muted);
    assert.false(sound.play("build"));
    sound.setMuted(false);

    assert.true(sound.play("build"));
  });

  QUnit.test("update puts the volumes of the table into the graph, so that a slider is heard", async (assert) => {
    await sound.start();
    AUDIO.sfx = 0.2;
    AUDIO.music = 0.3;
    sound.update();
    const sfx = sound.sfx.gain.value;
    const music = sound.musicBus.gain.value;
    AUDIO.sfx = 0.7;
    AUDIO.music = 0.5;

    assert.true(Math.abs(sfx - 0.2) < 1e-6 && Math.abs(music - 0.3) < 1e-6);
  });

  QUnit.test("update before it is started does nothing and does not throw", (assert) => {
    sound.update();

    assert.false(sound.started);
  });

  QUnit.test("the volumes are in the table, and are not too loud to begin with", (assert) => {
    for (const key of ["master", "sfx", "music"]) assert.true(AUDIO[key] > 0 && AUDIO[key] <= 1, key);
    assert.true(AUDIO.music <= AUDIO.sfx, "the music is under the effects");
  });
});
