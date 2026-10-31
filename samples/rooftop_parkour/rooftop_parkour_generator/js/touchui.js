// What is drawn for touch (see touchpad.js for what is touched): the ring of the stick, the jump button, the pause button, and the words that ask for the phone to be
// turned. See ../tests/touchui.tests.js and ../css/touch.css.

// The ring and the knob of the stick (only where a thumb is), the jump button, the pause button, and the words that ask for the phone
// to be turned. The buttons tell the controls which finger is on them. `doc` is the page; `controls` is a TouchControls; `onPause` is called when the pause button
// is pressed. Everything is hidden unless the page is in touch mode (the body has the class `touch`; see touch.css).
class TouchUi {
  constructor(doc, controls, { onPause = () => {} } = {}) {
    this.doc = doc;
    this.controls = controls;
    const make = (tag, className, parent, text = "") => {
      const element = doc.createElement(tag);
      element.className = className;
      element.textContent = text;
      parent.appendChild(element);
      return element;
    };
    this.root = make("div", "touch-ui", doc.body);
    this.ring = make("div", "touch-ring hidden", this.root);
    this.knob = make("div", "touch-knob", this.ring);
    this.jump = make("button", "touch-button touch-jump", this.root, "JUMP");
    this.pause = make("button", "touch-button touch-pause", this.root, "II");
    this.jump.type = "button";
    this.pause.type = "button";
    this.pause.setAttribute("aria-label", "Pause");
    this.turn = make("div", "touch-turn hidden", doc.body, "Turn your phone sideways to play");
    this.jump.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      controls.jumpDown(event.pointerId);
      this.jump.classList.add("pressed");
    });
    for (const name of ["pointerup", "pointercancel", "pointerleave"]) {
      this.jump.addEventListener(name, (event) => {
        controls.jumpUp(event.pointerId);
        if (!controls.jumpHeld) this.jump.classList.remove("pressed");
      });
    }
    this.pause.addEventListener("click", () => onPause());
  }

  // Puts the ring where the thumb went down and the knob where it is, or hides them.
  update() {
    const stick = this.controls.stick;
    this.ring.classList.toggle("hidden", !stick.active);
    if (!stick.active) return;
    this.ring.style.left = `${stick.origin.x}px`;
    this.ring.style.top = `${stick.origin.y}px`;
    const knob = stick.knob;
    this.knob.style.transform = `translate(${knob.x}px, ${knob.y}px)`;
  }

  // Says whether the phone is the wrong way up, and shows or hides the words.
  setPortrait(upright) {
    this.turn.classList.toggle("hidden", !upright);
  }

  setEnabled(on) {
    this.doc.body.classList.toggle("touch", on);
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TouchUi };
} else {
  Object.assign(window, { TouchUi });
}
