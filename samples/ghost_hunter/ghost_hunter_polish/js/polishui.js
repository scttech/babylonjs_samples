// What the player sees of the polish: the two comfort switches on the start screen (reduce shaking and flashing, and vibration), the line and the button that put the game on
// the home screen, and the photograph on the screen at the end of a round with a button to save it. Each is built from the page's own elements, given the `document` (so a test
// can look at them), and does nothing but tell whoever is listening what the player did. See ../tests/polishui.tests.js and ../css/polish.css.

const makeEl = (doc, tag, className, parent, text = "") => {
  const element = doc.createElement(tag);
  element.className = className;
  element.textContent = text;
  if (parent) parent.appendChild(element);
  return element;
};

class ComfortUi {
  // `settings` is a ComfortSettings. They go in the element with the id `start-comfort` (made if the page has none). `onChange(name, value)` is told of a change.
  constructor(doc, settings, onChange = () => {}) {
    this.settings = settings;
    this.root = doc.getElementById("start-comfort") || makeEl(doc, "div", "", doc.body);
    this.root.classList.add("comfort");
    this.boxes = {};
    const rows = [
      ["reduceMotion", "Reduce shaking and flashing"],
      ["vibration", "Let the phone buzz"],
    ];
    for (const [name, words] of rows) {
      const label = makeEl(doc, "label", "", this.root);
      const box = doc.createElement("input");
      box.type = "checkbox";
      box.checked = Boolean(settings[name]);
      box.addEventListener("change", () => {
        settings.set(name, box.checked);
        onChange(name, box.checked);
      });
      label.appendChild(box);
      label.appendChild(doc.createTextNode(words));
      this.boxes[name] = box;
    }
  }

  // Shows the settings as they are now (they may have changed from outside).
  refresh() {
    for (const [name, box] of Object.entries(this.boxes)) box.checked = Boolean(this.settings[name]);
  }
}

class InstallUi {
  // `offer` is an InstallOffer. The words go in `install-line` and the button is `install-button`, both on the start screen (made if the page has none).
  constructor(doc, offer) {
    this.offer = offer;
    this.line = doc.getElementById("install-line") || makeEl(doc, "p", "install-line", doc.body);
    this.button = doc.getElementById("install-button") || makeEl(doc, "button", "install-button hidden", doc.body, "Install the game");
    this.button.type = "button";
    this.button.addEventListener("click", async () => {
      await offer.prompt();
      this.update();
    });
    offer.onChange = () => this.update();
    this.update();
  }

  // Shows what the offer says: the button where the browser can install, the steps where it cannot, and nothing if it is installed already.
  update() {
    const advice = this.offer.advice();
    this.button.classList.toggle("hidden", advice.kind !== "prompt");
    this.line.textContent = advice.kind === "steps" ? advice.text : "";
  }
}

class PhotoUi {
  // `booth` is a PhotoBooth, and `parent` is where the photograph goes (the screen at the end of a round).
  constructor(doc, booth, parent) {
    this.booth = booth;
    this.root = makeEl(doc, "div", "photo-area hidden", parent);
    this.picture = makeEl(doc, "img", "photo-picture", this.root);
    this.picture.alt = "The moment you jumped";
    this.caption = makeEl(doc, "p", "photo-caption", this.root, "The moment you jumped");
    this.button = makeEl(doc, "button", "photo-button", this.root, "Save the photograph");
    this.button.type = "button";
    this.button.addEventListener("click", async () => {
      const result = await booth.save();
      this.caption.textContent = result === "downloaded" ? "Saved" : result === "shared" ? "Shared" : result === "none" ? "Nothing to save" : "The moment you jumped";
    });
  }

  // Shows the last photograph, or hides the area if there is none.
  show() {
    const url = this.booth.thumbnail();
    this.root.classList.toggle("hidden", url === null);
    if (url) {
      this.picture.src = url;
      this.caption.textContent = "The moment you jumped";
    }
    return url !== null;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ComfortUi, InstallUi, PhotoUi };
} else {
  Object.assign(window, { ComfortUi, InstallUi, PhotoUi });
}
