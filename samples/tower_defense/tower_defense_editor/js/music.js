// The music: three tracks, one for each part of the game, and one at a time. The title and the end have a theme; the time to build
// between waves has a calm track; and a wave has the one with the most in it. Which is playing is a function of where the game is (`musicFor`),
// the change from one to the next is a long crossfade (a change that jumps is heard as a mistake), and a game that is paused turns the music
// down and does not stop it. The tracks are streamed from files, and are only played while they are wanted. They go through the
// same graph as the effects (audio.js), so the master volume and the mute reach them. See ../tests/music.tests.js.

const MUSIC = {
  fade: 2.5, // seconds for the music to follow where it is told to go
  duck: 0.35, // the share of the volume while the game is paused
  silent: 0.002, // below this a track is as good as out, and is stopped
  tracks: {
    theme: { url: "../assets/music/china.mp3", volume: 0.9 }, // the title, and the end
    build: { url: "../assets/music/japan-calm.mp3", volume: 0.8 }, // the time between waves
    battle: { url: "../assets/music/japan.mp3", volume: 0.9 }, // a wave
  },
};

// Which track should be playing, and how loud, for where the game is: `flow` is the screen (title, playing, paused, won, lost) and `phase`
// is the director's (preparing, running, won or lost). The title and the end have the theme. While it is going, a wave has the battle track and
// the time before one has the build track. While it is paused it is the one that was playing, turned down.
function musicFor({ flow, phase }, table = MUSIC) {
  if (flow === "title" || flow === "won" || flow === "lost") return { track: "theme", level: 1 };
  return { track: phase === "running" ? "battle" : "build", level: flow === "paused" ? table.duck : 1 };
}

// A number that goes towards where it is told to go, a little each frame, and gets there in about `time` seconds: it eases, and never
// overshoots.
function approach(current, target, seconds, time) {
  if (time <= 0) return target;
  return current + (target - current) * (1 - Math.exp((-3 * seconds) / time));
}

class Music {
  // `sound` is the sound of the game (audio.js). `makeElement` makes the thing that plays a file: a streaming <audio> element, which is
  // not all decoded into memory at once (three tracks of a couple of minutes would be a hundred and fifty megabytes decoded).
  constructor(sound, table = MUSIC, makeElement = (url) => { const element = new Audio(url); element.loop = true; element.preload = "none"; return element; }) {
    this.sound = sound;
    this.table = table;
    this.makeElement = makeElement;
    this.tracks = {}; // name -> { element, gain, level }
    this.started = false;
    this.suspended = false;
  }

  // Puts the tracks into the sound graph, silent and not yet playing. The sound has to have been started (by a tap).
  start() {
    if (this.started || !this.sound.started) return;
    const context = this.sound.context;
    for (const [name, track] of Object.entries(this.table.tracks)) {
      const element = this.makeElement(track.url);
      const source = context.createMediaElementSource(element);
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(gain);
      gain.connect(this.sound.musicBus);
      this.tracks[name] = { element, gain, level: 0 };
    }
    this.started = true;
  }

  // Every frame: the mix, as the state of the game says, eased. A track that is wanted starts playing, and one that has gone quiet stops.
  update(seconds, state) {
    if (!this.started || this.suspended) return;
    const want = musicFor(state, this.table);
    for (const [name, track] of Object.entries(this.tracks)) {
      const target = name === want.track ? want.level * this.table.tracks[name].volume : 0;
      track.level = approach(track.level, target, seconds, this.table.fade);
      track.gain.gain.value = track.level;
      if (target > 0 && track.element.paused) this.play(track);
      if (target === 0 && track.level < this.table.silent && !track.element.paused) track.element.pause();
    }
  }

  // Starts a track. A phone can refuse (the page has not been touched): then the next frame tries again.
  play(track) {
    const playing = track.element.play();
    if (playing && playing.catch) playing.catch(() => {});
  }

  // The page is hidden: the files are paused, so that a phone in a pocket is not playing; and it goes on when the page is back.
  suspend() {
    this.suspended = true;
    for (const track of Object.values(this.tracks)) track.element.pause();
  }

  resume() {
    this.suspended = false;
  }

  // The loudness of each track now.
  levels() {
    return Object.fromEntries(Object.entries(this.tracks).map(([name, track]) => [name, track.level]));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MUSIC, musicFor, approach, Music };
} else {
  Object.assign(window, { MUSIC, musicFor, approach, Music });
}
