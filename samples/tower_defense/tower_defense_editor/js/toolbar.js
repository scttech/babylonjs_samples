// The tools of the editor: a palette of brushes, the actions (undo, redo, clear, save, share, play), a name for the map, and the list of what is
// wrong with it. Like the tray and the panel, it is made from empty elements of the page, has no editor in it, and is told what to show: it says
// when a brush is chosen, an action is pressed or the name is changed. An action that can't be done yet (a map that can't be played can't be
// saved, shared or played) is not a button that is there to press. See ../tests/toolbar.tests.js.

// The actions, in order, with what is on their buttons and whether they need a map that can be played.
const ACTIONS = [
  { id: "undo", text: "Undo", needsMap: false },
  { id: "redo", text: "Redo", needsMap: false },
  { id: "clear", text: "Clear", needsMap: false },
  { id: "save", text: "Save", needsMap: true },
  { id: "share", text: "Share link", needsMap: true },
  { id: "play", text: "Play", needsMap: true },
];

class Toolbar {
  // `parts` is { palette, actions, name, problems, status }: the elements of the page that this fills in.
  constructor(parts, document, brushes = BRUSHES, actions = ACTIONS) {
    this.parts = parts;
    this.brushes = brushes;
    this.actions = actions;
    this.brushListeners = [];
    this.actionListeners = [];
    this.nameListeners = [];
    this.buttons = {};
    this.swatches = {};
    // A press on the tools is for the tools, and is not for the board behind it (which would paint).
    for (const part of [parts.palette, parts.actions, parts.name, parts.problems]) {
      for (const type of ["pointerdown", "pointerup"]) part.addEventListener(type, (event) => event.stopPropagation());
    }

    brushes.forEach((brush, i) => {
      const button = element(document, "button", "brush");
      button.type = "button";
      button.dataset.brush = brush.id;
      button.title = `${brush.name} (${i + 1})`;
      button.setAttribute("aria-label", brush.name);
      const swatch = element(document, "span", "swatch");
      swatch.style.background = brush.color;
      button.append(swatch, element(document, "span", "label", brush.name));
      button.addEventListener("click", () => {
        this.select(brush.id);
        this.brushListeners.forEach((listener) => listener(brush.id));
      });
      parts.palette.append(button);
      this.buttons[brush.id] = button;
    });

    actions.forEach((action) => {
      const button = element(document, "button", "action", action.text);
      button.type = "button";
      button.dataset.action = action.id;
      button.addEventListener("click", () => {
        if (!button.disabled) this.actionListeners.forEach((listener) => listener(action.id));
      });
      parts.actions.append(button);
      this.buttons[action.id] = button;
    });

    parts.name.addEventListener("input", () => this.nameListeners.forEach((listener) => listener(parts.name.value)));
    this.select(brushes[0].id);
    this.showProblems(["nothing is drawn yet"]);
    this.setHistory(false, false);
  }

  onBrush(listener) {
    this.brushListeners.push(listener);
  }

  onAction(listener) {
    this.actionListeners.push(listener);
  }

  onName(listener) {
    this.nameListeners.push(listener);
  }

  // Marks the brush that is chosen.
  select(id) {
    this.selected = id;
    for (const brush of this.brushes) this.buttons[brush.id].classList.toggle("selected", brush.id === id);
  }

  // Shows what is wrong with the map, as a list, or says that it is ready. The buttons that need a map that can be played are there only when it is.
  showProblems(problems) {
    const ready = problems.length === 0;
    this.ready = ready;
    this.parts.problems.classList.toggle("ready", ready);
    this.parts.problems.replaceChildren(...(ready ? [element(this.parts.problems.ownerDocument, "li", "", "Ready to play!")] : problems.slice(0, 4).map((text) => element(this.parts.problems.ownerDocument, "li", "", text))));
    for (const action of this.actions) if (action.needsMap) this.buttons[action.id].disabled = !ready;
  }

  // Undo and redo are there only if there is something to undo or redo.
  setHistory(canUndo, canRedo) {
    this.buttons.undo.disabled = !canUndo;
    this.buttons.redo.disabled = !canRedo;
  }

  setName(name) {
    if (this.parts.name.value !== name) this.parts.name.value = name;
  }

  // Says something on the line under the tools ("Saved"), and nothing if it is told nothing.
  say(sentence) {
    this.parts.status.textContent = sentence;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ACTIONS, Toolbar };
} else {
  Object.assign(window, { ACTIONS, Toolbar });
}
