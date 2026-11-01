// The score. Two tracks of ambient music go under the game and are mixed by how near the dread is, the way a film's music is: a quiet bed
// while nothing is happening, the tense track swelling as something comes near, and **both going out** for the silence before a strike, and
// coming back in the aftershock. The mixing is plain arithmetic (`musicMix`), and `Music` plays the two files through the same sound
// graph as everything else (audio.js), so that the scare level's volume and the master volume reach the music too.
// See ../tests/music.tests.js.

const MUSIC = {
  enabled: true,
  volume: 0.55, // how loud the music is, before the scare level's volume
  tracks: {
    calm: { url: "../assets/music/horror-ambience.mp3", volume: 0.9 }, // a bed that builds slowly (92 seconds)
    tense: { url: "../assets/music/scary-ambience.mp3", volume: 0.8 }, // louder and thicker (125 seconds)
  },
  fade: 1.4, // seconds the mix takes to follow where it is told to go (a mix that jumps is heard as a mistake)
  quietAt: 0.85, // the dread at which the music is out: the silence
};

const smoothStep = (from, to, x) => {
  const c = Math.max(0, Math.min(1, (x - from) / (to - from)));
  return c * c * (3 - 2 * c);
};

// How loud each track should be: the calm one while it is quiet, the tense one coming in as the dread rises, and both out as the dread
// reaches the silence. `dread` is 0 to 1, `ambient` is the room's own loudness from the strike (0 at the strike, back to 1 after it),
// and `silence` is the scare level's number for how complete the silence is.
function musicMix(dread, ambient, silence = 1, table = MUSIC) {
  const quiet = 1 - smoothStep(table.quietAt * 0.75, table.quietAt, Math.min(1, dread * silence));
  const calm = (1 - smoothStep(0.1, 0.65, dread)) * quiet;
  const tense = smoothStep(0.15, 0.55, dread) * quiet;
  return { calm: calm * ambient, tense: tense * ambient };
}

// A number that goes towards where it is told to go, a little each frame, and gets there in about `time` seconds: it eases, and never
// overshoots.
function approach(current, target, seconds, time) {
  if (time <= 0) return target;
  return current + (target - current) * (1 - Math.exp((-3 * seconds) / time));
}

class Music {
  // `audio` is the sound of the game (audio.js). `makeElement` makes the thing that plays a file: a streaming <audio> element, which
  // is not all decoded into memory at once (two tracks of a couple of minutes would be a hundred megabytes decoded).
  constructor(audio, table = MUSIC, makeElement = (url) => { const element = new Audio(url); element.loop = true; element.preload = "auto"; return element; }) {
    this.audio = audio;
    this.table = table;
    this.makeElement = makeElement;
    this.tracks = {}; // name -> { element, gain, level }
    this.started = false;
    this.starting = null;
    this.paused = false;
  }

  // Starts both tracks, silent. Call it from the tap: a phone only lets a page play after the person has touched the screen, and the
  // files must be told to play *now*, in the tap, before anything is waited for.
  start() {
    if (this.starting) return this.starting;
    const names = Object.keys(this.table.tracks);
    const elements = names.map((name) => {
      const element = this.makeElement(this.table.tracks[name].url);
      element.volume = 0; // until it is in the sound graph it would be heard directly
      const playing = element.play();
      if (playing && playing.catch) playing.catch(() => {}); // refused: the next tap will do
      return element;
    });
    this.starting = this.audio.start().then(() => {
      const context = this.audio.context;
      names.forEach((name, i) => {
        const source = context.createMediaElementSource(elements[i]);
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(gain);
        gain.connect(this.audio.master);
        elements[i].volume = 1;
        this.tracks[name] = { element: elements[i], gain, level: 0 };
      });
      this.started = true;
    });
    return this.starting;
  }

  // Every frame: the mix, as the dread says, eased. `state` is { dread, ambient, silence }.
  update(seconds, state) {
    if (!this.started) return;
    const table = this.table;
    const mix = table.enabled && !this.paused ? musicMix(state.dread, state.ambient, state.silence, table) : { calm: 0, tense: 0 };
    for (const [name, track] of Object.entries(this.tracks)) {
      const target = mix[name] * table.volume * table.tracks[name].volume;
      track.level = approach(track.level, target, seconds, table.fade);
      track.gain.gain.value = track.level;
    }
  }

  // The page is hidden, or the game is stopped: the files are paused, so that a phone in a pocket is not playing.
  pause() {
    this.paused = true;
    for (const track of Object.values(this.tracks)) track.element.pause();
  }

  resume() {
    this.paused = false;
    for (const track of Object.values(this.tracks)) {
      const playing = track.element.play();
      if (playing && playing.catch) playing.catch(() => {});
    }
  }

  // The loudness of each track now, for the developer panel.
  levels() {
    return Object.fromEntries(Object.entries(this.tracks).map(([name, track]) => [name, track.level]));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MUSIC, smoothStep, musicMix, approach, Music };
} else {
  Object.assign(window, { MUSIC, smoothStep, musicMix, approach, Music });
}
