QUnit.module("the pure parts of the sound", () => {
  QUnit.test("the game's space is flipped in z for Web Audio", (assert) => {
    assert.deepEqual(toAudioSpace([1, 2, 3]), [1, 2, -3]);
  });

  QUnit.test("something to the right of the player is to the right of the listener", (assert) => {
    // the listener faces (0,0,-1) with up (0,1,0): right = forward x up
    const [fx, fy, fz] = toAudioSpace([0, 0, 1]);
    const [ux, uy, uz] = toAudioSpace([0, 1, 0]);
    const right = [fy * uz - fz * uy, fz * ux - fx * uz, fx * uy - fy * ux];
    const source = toAudioSpace([5, 0, 0]);
    assert.true(right[0] * source[0] + right[1] * source[1] + right[2] * source[2] > 4);
  });

  QUnit.test("a voice fades with distance, and is nothing out of range", (assert) => {
    const near = voiceParams("ghoul", "stalk", 2);
    const far = voiceParams("ghoul", "stalk", 10);
    assert.true(near.gain > far.gain && far.gain > 0);
    assert.strictEqual(voiceParams("ghoul", "stalk", AUDIO.voiceDistance + 1).gain, 0);
  });

  QUnit.test("a voice is louder and quicker when the creature is doing more, and silent when it is dying", (assert) => {
    const stalk = voiceParams("spider", "stalk", 3), lunge = voiceParams("spider", "lunge", 3), lurk = voiceParams("spider", "lurk", 3);
    assert.true(lunge.gain >= stalk.gain && stalk.gain > lurk.gain);
    assert.true(lunge.every < stalk.every && stalk.every < lurk.every);
    assert.strictEqual(voiceParams("spider", "dying", 3).gain, 0);
  });

  QUnit.test("each kind has its own sound: a spider ticks, a ghoul groans, a skeleton rattles", (assert) => {
    const spider = voiceParams("spider", "stalk", 2), ghoul = voiceParams("ghoul", "stalk", 2), skeleton = voiceParams("skeleton", "stalk", 2);
    assert.strictEqual(spider.wave, "noise");
    assert.strictEqual(ghoul.wave, "sawtooth");
    assert.true(ghoul.length > spider.length * 10);
    assert.true(skeleton.pitch > spider.pitch);
    assert.strictEqual(voiceParams("dragon", "stalk", 2).wave, "sine", "a kind that is not known still has a voice");
  });

  QUnit.test("the heart: two thumps a beat, at the rate, from where the last left off", (assert) => {
    const { beats, next } = heartbeats(0, 3, 60);
    assert.strictEqual(beats.length, 6, "three beats in three seconds at 60 a minute");
    assert.strictEqual(beats[0].time, 0);
    assert.true(beats[1].time > 0 && beats[1].time < 0.5 && beats[1].strength < beats[0].strength, "the second thump is close and softer");
    assert.strictEqual(next, 3);
    const more = heartbeats(next, 4, 60);
    assert.strictEqual(more.beats[0].time, 3);
  });

  QUnit.test("a faster heart has more beats in the same time", (assert) => {
    assert.true(heartbeats(0, 10, 140).beats.length > heartbeats(0, 10, 60).beats.length * 2 - 2);
  });
});

QUnit.module("the sound, heard", () => {
  const SECONDS = 2, RATE = 22050;
  const offline = () => new OfflineAudioContext(2, RATE * SECONDS, RATE);
  const player = { position: [0, 1.4, 0], forward: [0, 0, 1], up: [0, 1, 0] };
  const rms = (data) => Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length);
  // The tests place sounds with plain left and right (a headless browser may not have the filters of a real ear); the game uses HRTF.
  const heard = async (play, volume = 1) => {
    const context = offline();
    const audio = new GhostAudio(() => context, { ...AUDIO, panning: "equalpower" });
    await audio.start();
    audio.setVolume(volume);
    audio.setHum(0);
    audio.setListener(player);
    play(audio);
    const buffer = await context.startRendering();
    return { left: rms(buffer.getChannelData(0)), right: rms(buffer.getChannelData(1)) };
  };

  QUnit.test("nothing is made before the player has touched the screen", (assert) => {
    const audio = new GhostAudio(() => { throw new Error("made too early"); });
    assert.false(audio.ready);
    assert.false(audio.cue("stinger"));
    audio.update(0.1, player);
    assert.false(audio.ready);
  });

  QUnit.test("with nothing playing and the hum off, there is silence", async (assert) => {
    const { left, right } = await heard(() => {});
    assert.true(left < 1e-6 && right < 1e-6);
  });

  QUnit.test("a stinger is loud", async (assert) => {
    const { left, right } = await heard((audio) => audio.cue("stinger", null, 1));
    assert.true(left > 0.02 && right > 0.02, `${left.toFixed(3)} ${right.toFixed(3)}`);
  });

  QUnit.test("a sound to the right is louder in the right ear, and one to the left in the left", async (assert) => {
    const onRight = await heard((audio) => audio.cue("thud", [4, 1.4, 0], 1));
    const onLeft = await heard((audio) => audio.cue("thud", [-4, 1.4, 0], 1));
    assert.true(onRight.right > onRight.left * 1.2, `right: ${onRight.left.toFixed(4)} ${onRight.right.toFixed(4)}`);
    assert.true(onLeft.left > onLeft.right * 1.2, `left: ${onLeft.left.toFixed(4)} ${onLeft.right.toFixed(4)}`);
  });

  QUnit.test("a sound that is far away is quieter than one that is near", async (assert) => {
    const near = await heard((audio) => audio.cue("thud", [0, 1.4, 2], 1));
    const far = await heard((audio) => audio.cue("thud", [0, 1.4, 12], 1));
    assert.true(near.left + near.right > (far.left + far.right) * 2);
  });

  QUnit.test("the scare level's volume is the volume of everything", async (assert) => {
    const loud = await heard((audio) => audio.cue("stinger", null, 1), 1);
    const soft = await heard((audio) => audio.cue("stinger", null, 1), 0.3);
    assert.true(soft.left < loud.left * 0.5);
    assert.true(soft.left > 0);
  });

  QUnit.test("a creak and a whisper make sound, and a name that is not a sound makes none", async (assert) => {
    const creak = await heard((audio) => audio.cue("creak", [0, 1.4, -3], 1));
    const whisper = await heard((audio) => audio.cue("whisper", [3, 1.4, 0], 1));
    assert.true(Math.max(creak.left, creak.right) > 0.001 && Math.max(whisper.left, whisper.right) > 0.001);
    const audio = new GhostAudio(() => offline());
    await audio.start();
    assert.false(audio.cue("not a sound"));
  });

  QUnit.test("the hum is there when it is on, and goes when the room goes quiet", async (assert) => {
    const context = offline();
    const audio = new GhostAudio(() => context);
    await audio.start();
    audio.setHum(1);
    const on = rms((await context.startRendering()).getChannelData(0));
    const quiet = offline();
    const second = new GhostAudio(() => quiet);
    await second.start();
    second.setHum(0);
    const off = rms((await quiet.startRendering()).getChannelData(0));
    assert.true(on > 0.01 && off < 1e-6, `${on.toFixed(4)} ${off.toFixed(6)}`);
  });

  QUnit.test("the heart beats when it is on and makes the beats of the rate", async (assert) => {
    const context = offline();
    const audio = new GhostAudio(() => context);
    await audio.start();
    audio.setHum(0);
    audio.setHeart(120, true);
    const count = audio.scheduleHeart(SECONDS);
    assert.true(count >= 4, `${count} thumps`);
    assert.true(rms((await context.startRendering()).getChannelData(0)) > 0.005);
    const silent = new GhostAudio(() => offline());
    await silent.start();
    silent.setHeart(120, false);
    assert.strictEqual(silent.scheduleHeart(SECONDS), 0);
  });

  QUnit.test("a creature's voice sounds now and then, and not while it is silent", async (assert) => {
    const context = offline();
    const audio = new GhostAudio(() => context);
    await audio.start();
    audio.setHum(0);
    audio.voice(1, "ghoul", "stalk", [0, 0, 3], 3, 0);
    const first = audio.voices.get(1).wait;
    assert.true(first > 0, "it has set when it sounds next");
    audio.voice(1, "ghoul", "stalk", [0, 0, 3], 3, 0.01);
    assert.true(audio.voices.get(1).wait <= first, "and the wait runs down");
    audio.voice(2, "ghoul", "dying", [0, 0, 3], 3, 0);
    assert.strictEqual(audio.voices.get(2).wait, 0, "a dying creature makes none");
    audio.forget(1);
    assert.false(audio.voices.has(1));
    assert.true(rms((await context.startRendering()).getChannelData(0)) > 0.0005);
  });
});
