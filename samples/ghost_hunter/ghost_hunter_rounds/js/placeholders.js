// Placeholders: things made out of simple shapes that stand in for what will be a model, or a finished effect, later. The game keeps a
// list of them and can hide them, all together or by kind, from one table, so that it can be seen with and without them as it is
// built: with the address ending ?placeholders=off, with the P key, or from the developer panel. See ../tests/placeholders.tests.js.

const PLACEHOLDERS = {
  show: true, // the switch for all of them
  kinds: { marker: true, creature: true }, // and one for each kind (a kind not in the table is shown)
};

const PLACEHOLDER_KEY = "ghost-hunter.placeholders"; // where the choice is kept in the browser

// Are placeholders wanted? The address wins (?placeholders=off or ?placeholders=on), then what was kept in the browser ("off" or "on"),
// and with neither they are.
function placeholdersWanted(search, stored) {
  const asked = new URLSearchParams(search || "").get("placeholders");
  if (asked === "off" || asked === "hide") return false;
  if (asked === "on" || asked === "show") return true;
  return stored !== "off";
}

class PlaceholderSet {
  constructor(table = PLACEHOLDERS) {
    this.table = table;
    this.items = []; // { node, kind }
  }

  // Is a kind of placeholder shown now?
  visible(kind) {
    return this.table.show && this.table.kinds[kind] !== false;
  }

  // Takes a mesh (or any node) as a placeholder of a kind, shows or hides it as the table says, and gives it back.
  add(node, kind = "marker") {
    node.metadata = { ...(node.metadata || {}), placeholder: kind };
    this.items.push({ node, kind });
    node.setEnabled(this.visible(kind));
    return node;
  }

  // A placeholder that is not wanted any more (it is not disposed: that is for whoever made it).
  remove(node) {
    this.items = this.items.filter((item) => item.node !== node);
  }

  // Shows or hides every one, as the table says now.
  refresh() {
    for (const { node, kind } of this.items) node.setEnabled(this.visible(kind));
  }

  setShow(show) {
    this.table.show = show;
    this.refresh();
  }

  setKind(kind, show) {
    this.table.kinds[kind] = show;
    this.refresh();
  }

  // How many there are, of a kind or in all.
  count(kind) {
    return this.items.filter((item) => kind === undefined || item.kind === kind).length;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PLACEHOLDERS, PLACEHOLDER_KEY, placeholdersWanted, PlaceholderSet };
} else {
  Object.assign(window, { PLACEHOLDERS, PLACEHOLDER_KEY, placeholdersWanted, PlaceholderSet });
}
