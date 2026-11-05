// The player's controls on the page: a list of the model's clips (click one to play it), the buttons of a media player, a scrubber, sliders for the
// speed and the fade, and a look inside the chosen clip at the tracks it is made of. Like the rest of the panel it puts text on the page with
// textContent only, because a clip's name comes from someone else's file. See ../tests/playerpanel.tests.js.

// The words on the controls, as small functions so that they can be tested without a page.
function timeReadout(info, seconds) {
  if (!info) return "No clip chosen";
  const frame = Math.round(seconds * info.fps);
  return `${seconds.toFixed(2)} / ${info.seconds.toFixed(2)} s, frame ${frame} of ${Math.round(info.frames)}`;
}

function speedLabel(value) {
  return `Speed x${value.toFixed(1)}`;
}

function fadeLabel(value) {
  return value === 0 ? "Fade: none (a cut)" : `Fade ${value.toFixed(2)} s`;
}

// What the play button says: it pauses a clip that is playing, replays one that has ended, and plays anything else.
function playLabel(state) {
  if (state === "playing") return "Pause";
  return state === "ended" ? "Replay" : "Play";
}

// The scrubber works in thousandths of the clip, so that it is the same at any length.
const SCRUBBER_STEPS = 1000;

// A slider made from a limit of PLAYER_LIMITS, and the line of words above it.
function makeSlider(limit, value, label, onInput) {
  const row = el("div", null, "slider");
  const words = el("span", label(value));
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(limit.min);
  input.max = String(limit.max);
  input.step = String(limit.step);
  input.value = String(value);
  input.addEventListener("input", () => {
    const number = Number(input.value);
    words.textContent = label(number);
    onInput(number);
  });
  row.append(words, input);
  return { row, input, words };
}

// A button.
function makeButton(text, className, onClick) {
  const button = el("button", text, className);
  button.type = "button";
  button.addEventListener("click", onClick);
  return button;
}

class PlayerPanel {
  constructor(container) {
    this.container = container;
    this.player = null;
    this.clipButtons = [];
    this.shown = null; // the clip whose tracks are shown
    this.scrubbing = false;
  }

  // Builds the controls for a player (a model's clips).
  show(player) {
    this.player = player;
    this.shown = null;
    this.clipButtons = [];
    if (player.groups.length === 0) {
      this.container.replaceChildren(el("p", "This model has no animation clips.", "message"));
      return;
    }

    const list = el("div", null, "clip-list");
    for (const group of player.groups) {
      const info = clipInfo(group);
      const button = makeButton(`${info.name}  ${formatSeconds(info.seconds)}`, "clip", () => {
        player.play(info.name);
        this.refresh();
      });
      button.dataset.name = info.name;
      this.clipButtons.push(button);
      list.append(button);
    }

    this.stopButton = makeButton("Stop", "transport", () => {
      player.stop();
      this.refresh();
    });
    this.backButton = makeButton("-1 frame", "transport", () => {
      player.step(-1);
      this.refresh();
    });
    this.playButton = makeButton("Play", "transport primary", () => {
      player.toggle();
      this.refresh();
    });
    this.forwardButton = makeButton("+1 frame", "transport", () => {
      player.step(1);
      this.refresh();
    });
    const transport = el("div", null, "transport-row");
    transport.append(this.stopButton, this.backButton, this.playButton, this.forwardButton);

    this.scrubber = document.createElement("input");
    this.scrubber.type = "range";
    this.scrubber.min = "0";
    this.scrubber.max = String(SCRUBBER_STEPS);
    this.scrubber.value = "0";
    this.scrubber.addEventListener("input", () => {
      this.scrubbing = true;
      if (player.info) player.seek((Number(this.scrubber.value) / SCRUBBER_STEPS) * player.info.seconds);
    });
    this.scrubber.addEventListener("change", () => {
      this.scrubbing = false;
    });
    this.readout = el("div", null, "readout");

    const speed = makeSlider(PLAYER_LIMITS.speed, player.speed, speedLabel, (value) => player.setSpeed(value));
    const fade = makeSlider(PLAYER_LIMITS.fade, player.fadeTime, fadeLabel, (value) => player.setFadeTime(value));
    const loop = el("label", null, "option");
    const loopBox = document.createElement("input");
    loopBox.type = "checkbox";
    loopBox.checked = player.loop;
    loopBox.addEventListener("change", () => player.setLoop(loopBox.checked));
    loop.append(loopBox, el("span", "Loop"));

    const controls = el("div", null, "player-controls");
    controls.append(transport, this.scrubber, this.readout, speed.row, fade.row, loop);
    this.inside = el("div", null, "inside");
    this.container.replaceChildren(makeSection("Clips", player.groups.length, list, true), makeSection("Player", null, controls, true), makeSection("Inside the clip", null, this.inside, false));
    this.refresh();
  }

  // Brings the controls up to date with the player: called every frame, so that the scrubber moves as the clip plays.
  refresh() {
    const player = this.player;
    if (!player || player.groups.length === 0) return;
    const info = player.info;
    const current = player.current ? player.current.name : null;
    for (const button of this.clipButtons) button.classList.toggle("selected", button.dataset.name === current);
    this.playButton.textContent = playLabel(player.state);
    for (const button of [this.stopButton, this.backButton, this.playButton, this.forwardButton, this.scrubber]) button.disabled = !info;
    const seconds = player.time;
    if (!this.scrubbing && info) this.scrubber.value = String(Math.round((seconds / info.seconds) * SCRUBBER_STEPS));
    this.readout.textContent = timeReadout(info, seconds);
    if (player.current !== this.shown) this.showTracks(player.current);
  }

  // Shows what the chosen clip is made of: a summary, and a table with a row for each track.
  showTracks(group) {
    this.shown = group;
    if (!group) {
      this.inside.replaceChildren(el("p", "Choose a clip.", "message"));
      return;
    }
    const tracks = describeTracks(group);
    const summary = summarizeTracks(tracks);
    const kinds = Object.entries(summary.byProperty)
      .map(([property, count]) => `${count} ${propertyName(property)}`)
      .join(", ");
    const table = makeTable(["Moves", "How", "Keyframes"], tracks.map((track) => [track.short, propertyName(track.property), track.keys]));
    const scroller = el("div", null, "track-table");
    scroller.append(table);
    this.inside.replaceChildren(
      makeFact("Tracks", `${summary.tracks} (${kinds})`),
      makeFact("Things that move", String(summary.targets)),
      makeFact("Keyframes in all", formatCount(summary.keys)),
      scroller
    );
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { timeReadout, speedLabel, fadeLabel, playLabel, SCRUBBER_STEPS, makeSlider, makeButton, PlayerPanel };
} else {
  Object.assign(window, { timeReadout, speedLabel, fadeLabel, playLabel, SCRUBBER_STEPS, makeSlider, makeButton, PlayerPanel });
}
