// Numbers for people. A model file is full of numbers (how many points, how many bytes, how big it is), and the first job of a tool that looks
// inside one is to say them in words a person can use: "3.9 MB", "10,014 triangles", "about 1.8 metres tall". The last of those is a
// guess, and an important one: models are made in different *units* (a person may be 1.8 units tall, or 180, or 1800) and the same code
// has to know which, or it puts a character the size of a house on the screen. See ../tests/units.tests.js.

// A number of bytes as text: 512 B, 3.9 KB, 3.74 MB. (Binary: a kilobyte is 1024 bytes.)
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return "unknown";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(1)} ${units[unit]}`;
}

// A whole number with thousands separators: 10014 is "10,014".
function formatCount(count) {
  return Number.isFinite(count) ? Math.round(count).toLocaleString("en-US") : "unknown";
}

// The units that a character's height is probably in, from how tall the model is *in the file's own numbers*. A person is between about a
// metre and two and a half tall, so a model that is about two tall is in metres, one that is about two hundred tall is in centimetres,
// and one that is about two thousand tall is in millimetres. Anything else is a guess that is said to be one. It says what to multiply by to get
// metres, which is what Babylon.js and this lab work in.
const UNIT_GUESSES = [
  { name: "metres", toMetres: 1, from: 0.5, to: 5 },
  { name: "centimetres", toMetres: 0.01, from: 50, to: 500 },
  { name: "millimetres", toMetres: 0.001, from: 500.0001, to: 5000 },
];

function guessUnits(height) {
  if (!(height > 0)) return { name: "unknown", toMetres: 1, sure: false };
  const match = UNIT_GUESSES.find((guess) => height >= guess.from && height <= guess.to);
  return match ? { name: match.name, toMetres: match.toMetres, sure: true } : { name: "unknown", toMetres: 1, sure: false };
}

// How tall a model is in metres, if it is a person: its height in the file's numbers times what the guess says.
function heightInMetres(height) {
  return height * guessUnits(height).toMetres;
}

// A size as text: "0.9 x 1.8 x 0.4 m".
function formatSize(size, unit = "m") {
  const part = (value) => (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, ""));
  return `${part(size.x)} x ${part(size.y)} x ${part(size.z)} ${unit}`;
}

// A length of time in seconds as text: 0.633 is "0.63 s", and 125 is "2:05".
function formatSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "unknown";
  if (seconds < 100) return `${seconds.toFixed(2)} s`;
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { formatBytes, formatCount, UNIT_GUESSES, guessUnits, heightInMetres, formatSize, formatSeconds };
} else {
  Object.assign(window, { formatBytes, formatCount, UNIT_GUESSES, guessUnits, heightInMetres, formatSize, formatSeconds });
}
