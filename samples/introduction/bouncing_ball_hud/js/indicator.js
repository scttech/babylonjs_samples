// Visual feedback for a slingshot pull: a trail of dots walking outward from
// the ball toward its launch direction (opposite the drag), growing in count
// and shifting green -> yellow -> red as pull strength approaches 1. Mirrors
// Ball/SparkSystem's split: `BABYLON` is only touched when `ui` is supplied,
// so show()'s math can be exercised without a real engine.
//
// Dots are pooled up to maxDots and toggled visible/invisible instead of
// created/disposed on every pointer move, since show() can fire dozens of
// times per drag.
class SlingshotIndicator {
  constructor({ ui = null, maxDots = 10, dotSpacing = 26, minDotSize = 6, maxDotSize = 14 } = {}) {
    this.ui = ui;
    this.maxDots = maxDots;
    this.dotSpacing = dotSpacing;
    this.minDotSize = minDotSize;
    this.maxDotSize = maxDotSize;
    this.dots = ui ? this._createDots() : [];
  }

  // Shows the indicator: `strength` (0..1) sets how many dots are visible,
  // their size, and their color. Dots walk outward from (originX, originY)
  // along the unit vector (dirX, dirY), spaced dotSpacing apart.
  show(originX, originY, dirX, dirY, strength) {
    if (!this.dots.length) return;

    const clampedStrength = Math.min(Math.max(strength, 0), 1);
    const visibleCount = Math.max(1, Math.round(clampedStrength * this.maxDots));
    const size = this.minDotSize + (this.maxDotSize - this.minDotSize) * clampedStrength;
    const color = this._colorFor(clampedStrength);

    for (let i = 0; i < this.dots.length; i++) {
      const dot = this.dots[i];
      if (i >= visibleCount) {
        dot.isVisible = false;
        continue;
      }
      const distance = (i + 1) * this.dotSpacing;
      dot.isVisible = true;
      dot.left = originX + dirX * distance;
      dot.top = originY + dirY * distance;
      dot.width = size + "px";
      dot.height = size + "px";
      dot.background = color;
    }
  }

  // Hides every dot. Called on release, or whenever the pull is too small
  // to count as an in-progress launch.
  hide() {
    for (const dot of this.dots) {
      dot.isVisible = false;
    }
  }

  // Removes and disposes every pooled dot.
  dispose() {
    for (const dot of this.dots) {
      this.ui.removeControl(dot);
      dot.dispose();
    }
    this.dots = [];
  }

  _createDots() {
    const dots = [];
    for (let i = 0; i < this.maxDots; i++) {
      const dot = new BABYLON.GUI.Ellipse();
      dot.thickness = 0;
      dot.isVisible = false;
      this.ui.addControl(dot);
      dots.push(dot);
    }
    return dots;
  }

  // Interpolates green -> yellow -> red as strength goes 0 -> 1.
  _colorFor(strength) {
    const stops = [
      [76, 175, 80], // green
      [255, 235, 59], // yellow
      [244, 67, 54], // red
    ];
    const t = strength * (stops.length - 1);
    const i = Math.min(Math.floor(t), stops.length - 2);
    const localT = t - i;
    const [r1, g1, b1] = stops[i];
    const [r2, g2, b2] = stops[i + 1];
    const r = Math.round(r1 + (r2 - r1) * localT);
    const g = Math.round(g1 + (g2 - g1) * localT);
    const b = Math.round(b1 + (b2 - b1) * localT);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = SlingshotIndicator;
} else {
  window.SlingshotIndicator = SlingshotIndicator;
}
