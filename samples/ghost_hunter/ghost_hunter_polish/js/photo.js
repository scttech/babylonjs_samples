// The photograph: the moment of a fright, kept. The picture is what the player saw, which is two layers (the camera's picture, and the 3D scene drawn over it), put together
// on a canvas of their own, with a frame and the name of the game, and then saved: shared (the phone's own share sheet, which can put it in a message or the photos) where the
// browser can, and downloaded where it cannot. The game takes one itself a moment after every strike, and keeps the last, so that the screen at the end of a round can show the
// moment you jumped. The drawing is given its sources (anything a canvas can draw: a video, a canvas), so a test can give it two plain canvases. See ../tests/photo.tests.js.

const PHOTO = {
  maxSide: 960, // pixels on the longer side of the photograph (a phone's screen has more, and a message does not want them)
  frame: 14, // pixels of dark frame all round, at the size of the photograph
  caption: "GHOST HUNTER",
  quality: 0.88, // of the JPEG
  delay: 0.28, // seconds after a strike that the game takes it: the moment that is the worst
  file: "ghost-hunter",
};

// The part of a picture that fills a space of a shape, the way `object-fit: cover` would (cut at the edges, and not squeezed): { sx, sy, sw, sh }.
function coverRect(sourceWidth, sourceHeight, width, height) {
  const sourceAspect = sourceWidth / sourceHeight;
  const aspect = width / height;
  if (sourceAspect > aspect) {
    const sw = sourceHeight * aspect;
    return { sx: (sourceWidth - sw) / 2, sy: 0, sw, sh: sourceHeight };
  }
  const sh = sourceWidth / aspect;
  return { sx: 0, sy: (sourceHeight - sh) / 2, sw: sourceWidth, sh };
}

// How big the photograph is for a screen of a size: the longer side is no more than `maxSide`, and the shape is the screen's. { width, height }, whole pixels.
function photoSize(screenWidth, screenHeight, table = PHOTO) {
  const scale = Math.min(1, table.maxSide / Math.max(screenWidth, screenHeight));
  return { width: Math.max(1, Math.round(screenWidth * scale)), height: Math.max(1, Math.round(screenHeight * scale)) };
}

// A name for the file: the game's, and the time to the second, so that two are not the same.
function photoName(date = new Date(), table = PHOTO) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${table.file}-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.jpg`;
}

class PhotoBooth {
  constructor(doc = document, table = PHOTO) {
    this.doc = doc;
    this.table = table;
    this.last = null; // the last photograph, as a canvas
    this.takenAt = null;
    this.pending = 0; // seconds until a photograph that was asked for is taken (0: none)
  }

  // Puts the layers together: the camera's picture (if there is one, `video`), the scene (`scene`, anything a canvas can draw), a dark frame and the name. Gives the canvas.
  compose(video, scene, screenWidth = scene.width, screenHeight = scene.height) {
    const { width, height } = photoSize(screenWidth, screenHeight, this.table);
    const canvas = this.doc.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#05080d";
    context.fillRect(0, 0, width, height);
    const draw = (source) => {
      const w = source.videoWidth || source.width;
      const h = source.videoHeight || source.height;
      if (!w || !h) return;
      const { sx, sy, sw, sh } = coverRect(w, h, width, height);
      context.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
    };
    if (video) draw(video);
    if (scene) draw(scene);
    const frame = this.table.frame;
    context.strokeStyle = "#05080d";
    context.lineWidth = frame * 2;
    context.strokeRect(0, 0, width, height);
    context.font = `${Math.round(width / 22)}px monospace`;
    context.fillStyle = "rgba(242, 243, 238, 0.85)";
    context.textAlign = "center";
    context.fillText(this.table.caption, width / 2, height - frame - 4);
    return canvas;
  }

  // Takes a photograph now of the layers, and keeps it as the last.
  snap(video, scene, screenWidth, screenHeight, now = new Date()) {
    this.last = this.compose(video, scene, screenWidth, screenHeight);
    this.takenAt = now;
    this.pending = 0;
    return this.last;
  }

  // Asks for one to be taken in a moment (after a strike): `tick` counts down and says when it is time.
  ask(delay = this.table.delay) {
    this.pending = delay;
  }

  tick(seconds) {
    if (this.pending <= 0) return false;
    this.pending -= seconds;
    if (this.pending > 0) return false;
    this.pending = 0;
    return true;
  }

  // The last photograph as a picture the page can show (a data address), or nothing.
  thumbnail() {
    return this.last ? this.last.toDataURL("image/jpeg", this.table.quality) : null;
  }

  toBlob() {
    return new Promise((resolve) => (this.last ? this.last.toBlob((blob) => resolve(blob), "image/jpeg", this.table.quality) : resolve(null)));
  }

  // Saves the last: through the phone's share sheet if the browser can share files, and as a download if it cannot. Gives "shared", "downloaded", "cancelled" or "none".
  async save(nav = typeof navigator !== "undefined" ? navigator : null) {
    const blob = await this.toBlob();
    if (!blob) return "none";
    const name = photoName(this.takenAt || new Date(), this.table);
    const file = typeof File !== "undefined" ? new File([blob], name, { type: "image/jpeg" }) : null;
    if (file && nav && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: this.table.caption });
        return "shared";
      } catch (error) {
        return "cancelled"; // the player closed the share sheet
      }
    }
    const link = this.doc.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    this.doc.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
    return "downloaded";
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { PHOTO, coverRect, photoSize, photoName, PhotoBooth };
} else {
  Object.assign(window, { PHOTO, coverRect, photoSize, photoName, PhotoBooth });
}
