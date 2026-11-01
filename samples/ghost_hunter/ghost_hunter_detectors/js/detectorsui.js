// What the player sees of the gadgets: a row of four buttons (EMF, RADAR, BOX, HEAT) of which one is in the hand, and a small screen under them that shows that gadget: five
// lights for the meter, a round screen with a sweeping arm and blips for the radar, a dial and the static and the words it hears for the box, and a temperature for the
// thermal vision, which also tints the whole picture cold. It is built from the page's own elements, given the `document` (so a test can look at it), and `apply` is told what
// the gadgets read (the `frame` of Detectors.update). See ../tests/detectorsui.tests.js and ../css/detectors.css.

const GADGET_LABELS = { emf: "EMF", radar: "RADAR", box: "BOX", thermal: "HEAT" };

class DetectorsUi {
  // `doc` is the page. `handlers` is { onSelect(name), onTune(value) }.
  constructor(doc, { onSelect = () => {}, onTune = () => {} } = {}) {
    this.doc = doc;
    const make = (tag, className, parent, text = "") => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };
    this.root = make("div", "gadgets", doc.body);
    this.root.id = "gadgets";
    const row = make("div", "gadget-row", this.root);
    this.buttons = {};
    for (const name of DETECT.names) {
      const button = make("button", "gadget-button", row, GADGET_LABELS[name]);
      button.type = "button";
      button.addEventListener("click", () => onSelect(name));
      this.buttons[name] = button;
    }
    this.screen = make("div", "gadget-screen hidden", this.root);

    this.emf = make("div", "gadget-emf hidden", this.screen);
    this.lights = Array.from({ length: DETECT.emf.lights }, () => make("i", "gadget-light", this.emf));

    this.radar = make("div", "gadget-radar hidden", this.screen);
    this.canvas = make("canvas", "gadget-canvas", this.radar);
    this.canvas.width = 120;
    this.canvas.height = 120;

    this.box = make("div", "gadget-box hidden", this.screen);
    this.hiss = make("div", "gadget-hiss", this.box);
    this.hissFill = make("i", "gadget-hiss-fill", this.hiss);
    this.word = make("div", "gadget-word", this.box, "...");
    this.dial = doc.createElement("input");
    this.dial.type = "range";
    this.dial.min = "0";
    this.dial.max = "1";
    this.dial.step = "0.005";
    this.dial.value = "0.5";
    this.dial.className = "gadget-dial";
    this.dial.setAttribute("aria-label", "Tune the spirit box");
    this.dial.addEventListener("input", () => onTune(Number(this.dial.value)));
    this.box.appendChild(this.dial);

    this.thermal = make("div", "gadget-thermal hidden", this.screen);
    this.temperature = make("div", "gadget-temperature", this.thermal, "21.0°C");

    this.chill = make("div", "chill", doc.body);
    this.chill.id = "chill";
  }

  // Shows what the gadget in the hand reads. `frame` is what Detectors.update gave, and `detectors` is the Detectors itself (for the word it last heard, and how long ago).
  apply(frame, detectors = null) {
    for (const [name, button] of Object.entries(this.buttons)) button.classList.toggle("on", frame.selected === name);
    this.screen.classList.toggle("hidden", frame.selected === null);
    this.emf.classList.toggle("hidden", frame.selected !== "emf");
    this.radar.classList.toggle("hidden", frame.selected !== "radar");
    this.box.classList.toggle("hidden", frame.selected !== "box");
    this.thermal.classList.toggle("hidden", frame.selected !== "thermal");
    this.doc.body.classList.toggle("thermal", frame.selected === "thermal"); // thermal vision turns the colours of the picture
    this.chill.style.opacity = frame.thermal ? (frame.thermal.chill * 0.55).toFixed(3) : "0";
    if (frame.emf) this.lights.forEach((light, i) => light.classList.toggle("on", i < frame.emf.level));
    if (frame.radar) this._drawRadar(frame.radar);
    if (frame.box) {
      this.hissFill.style.width = `${Math.round(frame.box.hiss * 100)}%`;
      if (detectors && detectors.lastWord) {
        this.word.textContent = detectors.lastWord;
        this.word.style.opacity = String(Math.max(0.15, 1 - detectors.wordAge / 3).toFixed(2));
      }
    }
    if (frame.thermal) this.temperature.textContent = `${frame.thermal.temperature.toFixed(1)}°C`;
  }

  _drawRadar({ sweep, blips }) {
    const context = this.canvas.getContext("2d");
    const size = this.canvas.width;
    const middle = size / 2;
    context.clearRect(0, 0, size, size);
    context.strokeStyle = "rgba(57, 255, 20, 0.5)";
    context.lineWidth = 1;
    for (const r of [0.33, 0.66, 1]) {
      context.beginPath();
      context.arc(middle, middle, (middle - 2) * r, 0, Math.PI * 2);
      context.stroke();
    }
    const point = (angle, radius) => [middle + Math.sin((angle * Math.PI) / 180) * (middle - 2) * radius, middle - Math.cos((angle * Math.PI) / 180) * (middle - 2) * radius];
    context.strokeStyle = "rgba(57, 255, 20, 0.9)";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(middle, middle);
    context.lineTo(...point(sweep, 1));
    context.stroke();
    for (const blip of blips) {
      const [x, y] = point(blip.angle, blip.radius);
      context.fillStyle = blip.kind === "ghost" ? `rgba(60, 230, 255, ${blip.light.toFixed(2)})` : `rgba(255, 90, 90, ${blip.light.toFixed(2)})`;
      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { GADGET_LABELS, DetectorsUi };
} else {
  Object.assign(window, { GADGET_LABELS, DetectorsUi });
}
