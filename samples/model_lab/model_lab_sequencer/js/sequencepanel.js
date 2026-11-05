// The sequencer's controls on the page: the list of steps (each with its clip, how many times it repeats, and its speed, and buttons to move it or take
// it away), a place to add one, the fade and loop, the buttons of a media player and a scrubber over the whole sequence, and a **timeline** that draws each step
// as a bar so that you can see where they overlap. Like the rest of the panel it puts text on the page with textContent only.
// See ../tests/sequencepanel.tests.js.

// The words of the readout: where the sequence is, and which step.
function sequenceReadout(sequencer) {
  const plan = sequencer.plan;
  if (plan.steps.length === 0) return "No steps";
  const pose = sequencer.pose;
  const main = pose.items.reduce((best, item) => (!best || item.weight > best.weight ? item : best), null);
  const where = `${sequencer.time.toFixed(2)} / ${sequencer.length.toFixed(2)} s`;
  return main ? `${where}, step ${main.step + 1} of ${sequencer.steps.length}: ${main.clip}` : where;
}

// What the play button says.
function sequencePlayLabel(state) {
  if (state === "playing") return "Pause";
  return state === "ended" ? "Replay" : "Play sequence";
}

// A number box with limits (from a table of limits), which calls back with its number.
function makeNumber(limit, value, label, onChange) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(limit.min);
  input.max = String(limit.max);
  input.step = String(limit.step);
  input.value = String(value);
  input.setAttribute("aria-label", label);
  input.addEventListener("change", () => onChange(Number(input.value)));
  return input;
}

class SequencePanel {
  constructor(container) {
    this.container = container;
    this.sequencer = null;
    this.rows = [];
    this.bars = [];
    this.scrubbing = false;
  }

  // Builds the controls for a sequencer.
  show(sequencer) {
    this.sequencer = sequencer;
    if (sequencer.clipNames.length === 0) {
      this.container.replaceChildren(el("p", "This model has no animation clips, so there is nothing to sequence.", "message"));
      return;
    }
    this.list = el("div", null, "steps");
    this.timeline = el("div", null, "timeline");
    this.problems = el("p", null, "message error");

    // Adding a step.
    this.adder = document.createElement("select");
    this.adder.setAttribute("aria-label", "Clip to add");
    sequencer.clipNames.forEach((name) => this.adder.append(new Option(name, name)));
    const add = makeButton("Add step", "transport", () => {
      sequencer.addStep(this.adder.value);
      this.build();
    });
    const suggest = makeButton("Suggest one", "transport", () => {
      sequencer.setSteps(suggestSequence(sequencer.clipNames));
      this.build();
    });
    const adding = el("div", null, "adding");
    adding.append(this.adder, add, suggest);

    // How the steps join, and whether it goes round.
    const fade = makeSlider(PLAYER_LIMITS.fade, sequencer.fade, fadeLabel, (value) => {
      sequencer.setFade(value);
      this.drawTimeline();
    });
    const loop = el("label", null, "option");
    const loopBox = document.createElement("input");
    loopBox.type = "checkbox";
    loopBox.checked = sequencer.loop;
    loopBox.addEventListener("change", () => {
      sequencer.setLoop(loopBox.checked);
      this.drawTimeline();
    });
    loop.append(loopBox, el("span", "Loop the sequence"));

    // Playing it.
    this.playButton = makeButton("Play sequence", "transport primary", () => {
      sequencer.toggle();
      this.refresh();
    });
    this.stopButton = makeButton("Stop", "transport", () => {
      sequencer.stop();
      this.refresh();
    });
    const transport = el("div", null, "transport-row two");
    transport.append(this.playButton, this.stopButton);
    this.scrubber = document.createElement("input");
    this.scrubber.type = "range";
    this.scrubber.min = "0";
    this.scrubber.max = String(SCRUBBER_STEPS);
    this.scrubber.value = "0";
    this.scrubber.addEventListener("input", () => {
      this.scrubbing = true;
      sequencer.seek((Number(this.scrubber.value) / SCRUBBER_STEPS) * sequencer.length);
    });
    this.scrubber.addEventListener("change", () => {
      this.scrubbing = false;
    });
    this.readout = el("div", null, "readout");

    const controls = el("div", null, "player-controls");
    controls.append(this.list, adding, fade.row, loop, this.timeline, transport, this.scrubber, this.readout, this.problems);
    this.container.replaceChildren(makeSection("Sequence", null, controls, true));
    this.build();
  }

  // Draws the list of steps and the timeline again (after an edit).
  build() {
    const sequencer = this.sequencer;
    this.rows = [];
    const rows = sequencer.steps.map((step, index) => {
      const row = el("div", null, "step");
      row.append(el("span", String(index + 1), "number"));
      const clip = document.createElement("select");
      clip.setAttribute("aria-label", `Clip of step ${index + 1}`);
      sequencer.clipNames.forEach((name) => clip.append(new Option(name, name)));
      if (!sequencer.clipNames.includes(step.clip)) clip.append(new Option(`${step.clip} (not here)`, step.clip));
      clip.value = step.clip;
      clip.addEventListener("change", () => {
        sequencer.setStep(index, { clip: clip.value });
        this.build();
      });
      const repeat = makeNumber(SEQUENCE_LIMITS.repeat, step.repeat, `Times to play step ${index + 1}`, (value) => {
        sequencer.setStep(index, { repeat: value });
        this.build();
      });
      const speed = makeNumber(PLAYER_LIMITS.speed, step.speed, `Speed of step ${index + 1}`, (value) => {
        sequencer.setStep(index, { speed: value });
        this.build();
      });
      const up = makeButton("^", "small", () => {
        sequencer.moveStep(index, -1);
        this.build();
      });
      const down = makeButton("v", "small", () => {
        sequencer.moveStep(index, 1);
        this.build();
      });
      const remove = makeButton("x", "small", () => {
        sequencer.removeStep(index);
        this.build();
      });
      up.title = "Move up";
      down.title = "Move down";
      remove.title = "Take away";
      const rest = el("div", null, "rest");
      rest.append(el("span", "times", "unit"), repeat, el("span", "speed", "unit"), speed, up, down, remove);
      row.append(clip, rest);
      this.rows.push(row);
      return row;
    });
    this.list.replaceChildren(...rows);
    this.drawTimeline();
    this.refresh();
  }

  // Draws each step as a bar. The bars are as wide as the steps are long, and where two overlap (the fade) they are on different rows.
  drawTimeline() {
    const sequencer = this.sequencer;
    const bars = timelineBars(sequencer.plan);
    this.bars = bars.map((bar) => {
      const element = el("div", bar.clip, `bar row-${bar.row}`);
      element.style.left = `${bar.left}%`;
      element.style.width = `${bar.width}%`;
      element.title = `Step ${bar.index + 1}: ${bar.clip}`;
      element.dataset.index = String(bar.index);
      return element;
    });
    this.playhead = el("div", null, "playhead");
    this.timeline.replaceChildren(...this.bars, this.playhead);
    this.problems.textContent = sequenceProblems(sequencer.steps, sequencer.clipNames).join(" ");
  }

  // Brings the controls up to date: called every frame, so that the playhead and the scrubber move as the sequence plays.
  refresh() {
    const sequencer = this.sequencer;
    if (!sequencer || !this.playButton) return;
    this.playButton.textContent = sequencePlayLabel(sequencer.state);
    const empty = sequencer.plan.steps.length === 0;
    this.playButton.disabled = empty;
    this.stopButton.disabled = empty;
    this.scrubber.disabled = empty;
    const length = sequencer.length;
    const fraction = length > 0 ? sequencer.time / length : 0;
    if (!this.scrubbing) this.scrubber.value = String(Math.round(fraction * SCRUBBER_STEPS));
    this.playhead.style.left = `${Math.min(fraction, 1) * 100}%`;
    this.readout.textContent = sequenceReadout(sequencer);
    const playing = new Set(sequencer.state === "stopped" ? [] : sequencer.pose.items.map((item) => String(item.step)));
    this.bars.forEach((bar) => bar.classList.toggle("playing", playing.has(bar.dataset.index)));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { sequenceReadout, sequencePlayLabel, makeNumber, SequencePanel };
} else {
  Object.assign(window, { sequenceReadout, sequencePlayLabel, makeNumber, SequencePanel });
}
