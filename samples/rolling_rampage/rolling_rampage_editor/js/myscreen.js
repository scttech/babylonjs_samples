// The My levels screen: a list of the levels a person has made, each with buttons to play it, edit it, share it as text, or delete it,
// and buttons to make a new one or add one from text. It shows what it is told to (a list of { name, detail, playable }) and
// calls back when a button is pressed, so it knows nothing about saving or playing. Built from a `document`, like the developer
// panel and the editor (it uses their `element` helper), so the tests can give it a stand-in. See ../tests/myscreen.tests.js.
class MyLevelsScreen {
  constructor(doc, { onPlay = () => {}, onEdit = () => {}, onExport = () => {}, onDelete = () => {}, onNew = () => {}, onImport = () => {}, onBack = () => {}, clipboard = null } = {}) {
    this.doc = doc;
    this.callbacks = { onPlay, onEdit, onExport, onDelete, onNew, onImport, onBack };
    this.clipboard = clipboard;
    this.deleteButtons = [];
    this.action = null; // what the button of the text box does with the text, when it is for adding a level

    this.root = element(doc, "div", { id: "mylevels", className: "screen mylevels hidden" });
    this.count = element(doc, "p", { className: "mine-count" });
    this.list = element(doc, "ul", { className: "mine-list" });
    this.message = element(doc, "p", { className: "mine-message" });
    this.newButton = this._button("New level", () => onNew(), "");
    this.importButton = this._button("Add from text", () => this.callbacks.onImport(), "");
    this.backButton = this._button("Back", () => onBack(), "");

    // The box for the text of a level: to copy one, or to paste one.
    this.textLabel = element(doc, "p", { className: "mine-text-label" });
    this.textBox = element(doc, "textarea", { className: "mine-text", rows: 8, spellcheck: false });
    this.actionButton = this._button("Add this level", () => this._run(), "");
    this.copyButton = this._button("Copy", () => this._copy(), "");
    this.closeTextButton = this._button("Close", () => this.hideText(), "");
    this.textPanel = element(doc, "div", { className: "mine-text-panel hidden" }, [
      this.textLabel,
      this.textBox,
      element(doc, "div", { className: "row" }, [this.actionButton, this.copyButton, this.closeTextButton]),
    ]);

    this.root.appendChild(element(doc, "h2", { textContent: "My levels" }));
    this.root.appendChild(this.count);
    this.root.appendChild(this.list);
    this.root.appendChild(this.message);
    this.root.appendChild(element(doc, "div", { className: "row" }, [this.newButton, this.importButton, this.backButton]));
    this.root.appendChild(this.textPanel);
  }

  _button(text, onClick, className) {
    const button = element(this.doc, "button", { type: "button", textContent: text, className: `hazard ${className}`.trim() });
    button.addEventListener("click", () => {
      button.blur();
      onClick();
    });
    return button;
  }

  show() {
    this.root.classList.remove("hidden");
  }

  hide() {
    this.root.classList.add("hidden");
    this.hideText();
  }

  setMessage(text) {
    this.message.textContent = text;
  }

  // Shows the list. Each item is { name, detail, playable }. Names are set as text, never as HTML, so a name can't add anything
  // to the page. A level that can't be played has its Play button switched off. `max` is the most levels there can be.
  render(items, max) {
    this.list.replaceChildren();
    this.deleteButtons = [];
    this.count.textContent = items.length === 0 ? "You haven't made a level yet." : `${items.length} of ${max}`;
    this.newButton.disabled = items.length >= max;
    this.importButton.disabled = items.length >= max;
    items.forEach((item, index) => {
      const play = this._button("Play", () => this.callbacks.onPlay(index), "");
      play.disabled = !item.playable;
      const remove = this._button("Delete", () => this._delete(index), "quiet");
      this.deleteButtons.push(remove);
      const buttons = [play, this._button("Edit", () => this.callbacks.onEdit(index), ""), this._button("Share", () => this.callbacks.onExport(index), ""), remove];
      const label = element(this.doc, "span", { className: "mine-name" }, [element(this.doc, "strong", { textContent: item.name }), element(this.doc, "small", { textContent: item.detail })]);
      this.list.appendChild(element(this.doc, "li", {}, [label, element(this.doc, "span", { className: "mine-buttons" }, buttons)]));
    });
  }

  // Deleting asks first, so a slip doesn't lose a level: the button says "Sure?", and the next click on it deletes. Pressing
  // any other button, or showing the list again, lets it off.
  _delete(index) {
    const button = this.deleteButtons[index];
    if (button.textContent === "Sure?") {
      this.callbacks.onDelete(index);
      return;
    }
    this.deleteButtons.forEach((other) => (other.textContent = "Delete"));
    button.textContent = "Sure?";
  }

  // The text box, for copying a level (readOnly) or for pasting one, which is added by `action` with the text.
  showText({ label, text = "", readOnly = false, action = null }) {
    this.textLabel.textContent = label;
    this.textBox.value = text;
    this.textBox.readOnly = readOnly;
    this.actionButton.classList.toggle("hidden", !action);
    this.copyButton.classList.toggle("hidden", !readOnly);
    this.action = action;
    this.textPanel.classList.remove("hidden");
    if (readOnly && this.textBox.select) this.textBox.select();
  }

  hideText() {
    this.textPanel.classList.add("hidden");
    this.action = null;
  }

  _run() {
    if (this.action) this.action(this.textBox.value);
  }

  // Puts the text on the clipboard if there is one. Says whether it did.
  async _copy() {
    if (!this.clipboard) return false;
    try {
      await this.clipboard.writeText(this.textBox.value);
      this.setMessage("Copied.");
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { MyLevelsScreen };
} else {
  window.MyLevelsScreen = MyLevelsScreen;
}
