// What a press, a drag and a release of the mouse (or a finger) do in the editor, as plain functions. The screen only turns
// pixels into corners and calls these, so the editing itself can be tested without a page. See ../tests/gestures.tests.js.

// The tools, in the order of the toolbar. `group` is the row of the toolbar a tool is on. A tool that *places* a thing makes
// one at the place clicked, and then the editor switches to the select tool so the new thing can be adjusted.
const EDITOR_TOOLS = [
  { id: "paint", group: "Floor", label: "Paint", hint: "Drag to paint the height chosen on the left." },
  { id: "fill", group: "Floor", label: "Fill", hint: "Drag a box. With a Ramp to height, it slopes from the corner you start at." },
  { id: "erase", group: "Floor", label: "Erase", hint: "Drag to make holes. A marble falls through them." },
  { id: "select", group: "Things", label: "Select", hint: "Click a thing to pick it, and drag it to move it. Delete takes it away." },
  { id: "start", group: "Things", label: "Start", hint: "Click to put the start here." },
  { id: "goal", group: "Things", label: "Goal", hint: "Click to put the goal here." },
  { id: "checkpoint", group: "Things", label: "Checkpoint", hint: "Click to put a checkpoint here." },
  { id: "enemy", group: "Things", label: "Enemy", hint: "Click to put an enemy here." },
  { id: "slime", group: "Things", label: "Slime", hint: "Click to put a puddle of slime here." },
  { id: "piston", group: "Things", label: "Piston", hint: "Click to put a piston here. It needs flat floor." },
  { id: "platform", group: "Things", label: "Platform", hint: "Click to put a moving platform here. It needs a gap, with floor at both ends." },
];

const PLACING_TOOLS = ["start", "goal", "checkpoint", "enemy", "slime", "piston", "platform"];

// How big a corner is on the screen, in pixels: as big as the space allows, within a range, so a small level is easy to
// hit and a big one still fits.
const CELL_PIXELS = { min: 8, max: 32 };

function cellSizeFor(cols, rows, width, height) {
  const fit = Math.floor(Math.min(width / cols, height / rows));
  return Math.max(CELL_PIXELS.min, Math.min(CELL_PIXELS.max, fit));
}

// The corner under a pixel, as whole numbers. A corner is drawn as a square, so this is the square the pixel is in.
function cornerAt(x, y, cell) {
  return { col: Math.floor(x / cell), row: Math.floor(y / cell) };
}

// The place under a pixel in the units of the level, where the middle of a corner's square is the corner itself (so a thing
// at col 1.5 is half way between the second and third squares).
function placeAt(x, y, cell) {
  return { col: x / cell - 0.5, row: y / cell - 0.5 };
}

// The corners on the straight line from one to another, both included. A mouse that moves fast skips squares, and this
// fills them in.
function lineCorners(from, to) {
  const steps = Math.max(Math.abs(to.col - from.col), Math.abs(to.row - from.row));
  const corners = [];
  for (let i = 0; i <= steps; i++) {
    const share = steps === 0 ? 0 : i / steps;
    corners.push({ col: Math.round(from.col + (to.col - from.col) * share), row: Math.round(from.row + (to.row - from.row) * share) });
  }
  return corners;
}

// A colour for a height: darker is lower. A hole has its own.
function heightColor(digit, maxHeight) {
  if (digit === null) return "#0b0e14";
  const share = maxHeight > 0 ? digit / maxHeight : 0;
  return `hsl(215, ${Math.round(24 + share * 10)}%, ${Math.round(20 + share * 52)}%)`;
}

// Does what a tool does for one step of a gesture, to a draft. `settings` is { tool, height, rampTo }, `phase` is "down",
// "move" or "up", `at` is { corner, place } under the pointer, and `held` is what is known about the gesture so far:
// { origin, last, picked, began }. Returns what changed about the gesture: { picked } for a click that found a thing, { began }
// once an undo step has been started, { switchTo } for the tool to go to next, { full } for a thing there was no room for.
function applyGesture(draft, settings, phase, at, held = {}) {
  const { tool, height, rampTo } = settings;
  const digit = tool === "erase" ? null : height;
  if (phase === "down") {
    if (tool === "paint" || tool === "erase") {
      draft.begin();
      draft.setDigit(at.corner.col, at.corner.row, digit);
    } else if (tool === "fill") {
      draft.begin();
    } else if (tool === "select") {
      const ref = draft.thingAt(at.place);
      draft.select(ref);
      return { picked: Boolean(ref) };
    } else if (PLACING_TOOLS.includes(tool)) {
      if (!draft.canPlace(tool)) return { full: true };
      draft.begin();
      draft.place(tool, at.place);
      return { switchTo: "select" };
    }
    return {};
  }
  if (phase === "move") {
    if (tool === "paint" || tool === "erase") {
      for (const corner of lineCorners(held.last.corner, at.corner)) draft.setDigit(corner.col, corner.row, digit);
    } else if (tool === "select" && held.picked) {
      if (!held.began) draft.begin();
      draft.moveSelected(at.place);
      return { began: true };
    }
    return {};
  }
  if (phase === "up" && tool === "fill") {
    const to = rampTo === null || rampTo === undefined ? height : rampTo;
    draft.fill(held.origin.corner.col, held.origin.corner.row, at.corner.col, at.corner.row, height, to);
  }
  return {};
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { EDITOR_TOOLS, PLACING_TOOLS, CELL_PIXELS, cellSizeFor, cornerAt, placeAt, lineCorners, heightColor, applyGesture };
} else {
  Object.assign(window, { EDITOR_TOOLS, PLACING_TOOLS, CELL_PIXELS, cellSizeFor, cornerAt, placeAt, lineCorners, heightColor, applyGesture });
}
