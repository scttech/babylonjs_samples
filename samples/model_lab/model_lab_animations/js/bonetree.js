// The list of bones in the panel: the tree, with each bone under its parent, and a click on one chooses it. Under the tree is what is known of the
// chosen bone. Like the rest of the panel, it puts text on the page with textContent only, because bone names come from someone else's file.
// See ../tests/bonetree.tests.js.

// What is known of a bone, as data: its names, its region, its parent and children, its way down from the root, and where it is in the world.
function describeBone(tree, positions, index) {
  const node = tree.nodes[index];
  const position = positions[index] || { x: 0, y: 0, z: 0 };
  return {
    name: node.name,
    short: node.short,
    region: regionLabel(regionOf(node.name)),
    parent: node.parent === null ? null : tree.nodes[node.parent].short,
    children: node.children.map((child) => tree.nodes[child].short),
    path: bonePath(tree, index),
    depth: node.depth,
    position: { x: position.x, y: position.y, z: position.z },
  };
}

// The tree and the details of the chosen bone, in a container. `onSelect(index)` is told when someone clicks a bone.
class BoneTree {
  constructor(container, onSelect) {
    this.container = container;
    this.onSelect = onSelect;
    this.tree = null;
    this.buttons = [];
    this.details = el("div", null, "bone-info");
  }

  // Shows the tree of a skeleton.
  show(tree) {
    this.tree = tree;
    this.buttons = [];
    this.details.replaceChildren(el("p", "Click a bone in the list, or a joint on the model.", "message"));
    const make = (index) => {
      const node = tree.nodes[index];
      const item = el("li");
      const button = el("button", node.short, `bone region-${regionOf(node.name)}`);
      button.type = "button";
      button.addEventListener("click", () => this.onSelect(index));
      this.buttons[index] = button;
      item.append(button);
      if (node.children.length > 0) {
        const list = el("ul");
        node.children.forEach((child) => list.append(make(child)));
        item.append(list);
      }
      return item;
    };
    const root = el("ul", null, "bone-tree");
    tree.roots.forEach((index) => root.append(make(index)));
    const body = el("div");
    body.append(root);
    this.container.replaceChildren(makeSection("Bones", tree.nodes.length, body, true), makeSection("Chosen bone", null, this.details, true));
  }

  // Marks a bone as the chosen one and says what is known of it. `positions` are the joints' places now.
  select(index, positions) {
    this.buttons.forEach((button, at) => button.classList.toggle("selected", at === index));
    if (index < 0 || !this.tree) return;
    const bone = describeBone(this.tree, positions, index);
    const where = `${bone.position.x.toFixed(2)}, ${bone.position.y.toFixed(2)}, ${bone.position.z.toFixed(2)}`;
    this.details.replaceChildren(
      makeFact("Name", bone.name),
      makeFact("Part of the body", bone.region),
      makeFact("Parent", bone.parent || "none (the root)"),
      makeFact("Children", bone.children.length === 0 ? "none (an end)" : bone.children.join(", ")),
      makeFact("Steps from the root", String(bone.depth)),
      makeFact("World position", where),
      el("p", bone.path.join(" > "), "message")
    );
    this.buttons[index].scrollIntoView({ block: "nearest" });
  }

  // Empties the panel (no model, or a model with no skeleton).
  clear(text) {
    this.tree = null;
    this.buttons = [];
    this.container.replaceChildren(el("p", text, "message"));
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { describeBone, BoneTree };
} else {
  Object.assign(window, { describeBone, BoneTree });
}
