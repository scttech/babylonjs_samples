// Sharing and keeping maps. A map is a few rows of text, so it can be squeezed into a short code that goes in a link (`?data=...`) and be sent to
// someone, and a list of the maps that a player has made is kept in the browser's storage. Both are things that come from *outside* the game: a link
// can say anything, and so can storage that someone else's page wrote, so everything that comes in is checked before it is believed, and a map
// that the game can't play is never let in. See ../tests/share.tests.js.

const SHARE = {
  maxCode: 1200, // the longest code that is looked at at all (a real map is a few hundred)
  maxMaps: 12, // how many maps a player can keep
  storageKey: "tower_defense_maps",
};

// A row of a map with its runs squeezed: "....##" is ".4#2". A run of one is the character alone.
function squeezeRow(text) {
  let out = "";
  for (let i = 0; i < text.length; ) {
    let j = i;
    while (j < text.length && text[j] === text[i]) j++;
    out += text[i] + (j - i > 1 ? String(j - i) : "");
    i = j;
  }
  return out;
}

// A row, as it was. It says nothing (null) for something that is not a squeezed row that fits the board: a character that is not in the legend, a
// run that is too long, or a row that is not the width of the board.
function stretchRow(text, width) {
  let out = "";
  const pattern = /([^0-9])(\d*)/g;
  let match;
  let consumed = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match[0].length === 0) break;
    consumed += match[0].length;
    if (!Object.hasOwn(LEGEND, match[1])) return null;
    const run = match[2] === "" ? 1 : Number(match[2]);
    if (run < 1 || run > width) return null;
    out += match[1].repeat(run);
    if (out.length > width) return null;
  }
  return consumed === text.length && out.length === width ? out : null;
}

// Text as a string that is safe in an address: the bytes of its UTF-8, in base64, with the characters that mean something in an address
// changed (`-` and `_`) and no padding.
function toCode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The text that a code stands for, or null if it isn't one.
function fromCode(code) {
  try {
    const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, (letter) => letter.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    return null;
  }
}

// A map as a code: its name and its squeezed rows.
function encodeMap(map) {
  return toCode(JSON.stringify({ n: map.name, r: map.rows.map(squeezeRow).join("/") }));
}

// Whether a map can be played: it fits the board, and everything that the editor checks passes.
function playable(map, board = BOARD) {
  return new MapEditor(map, board).problems().length === 0;
}

// A map from a code, or why not: { ok: true, map } or { ok: false, problems }. Nothing in a code is believed: its size is limited, it is
// parsed without throwing, its name is made safe, each of its rows is checked against the legend and the board, and the map must be one that
// the game can play.
function decodeMap(code, board = BOARD) {
  if (typeof code !== "string" || code.length === 0) return { ok: false, problems: ["there is no map in the link"] };
  if (code.length > SHARE.maxCode) return { ok: false, problems: ["the link is too long to be a map"] };
  const text = fromCode(code);
  if (text === null) return { ok: false, problems: ["the link is not a map"] };
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    return { ok: false, problems: ["the link is not a map"] };
  }
  if (!data || typeof data.n !== "string" || typeof data.r !== "string") return { ok: false, problems: ["the link is not a map"] };
  const squeezed = data.r.split("/");
  if (squeezed.length !== board.rows) return { ok: false, problems: [`the map has ${squeezed.length} rows, and the board has ${board.rows}`] };
  const rows = squeezed.map((row) => stretchRow(row, board.cols));
  if (rows.includes(null)) return { ok: false, problems: ["a row of the map is not a row of a map"] };
  const editor = new MapEditor({ name: "x", rows }, board);
  editor.setName(data.n);
  const map = editor.toMap();
  const problems = editor.problems();
  return problems.length === 0 ? { ok: true, map } : { ok: false, problems };
}

// The address of the game for a map that comes in a link: the address now, with the code in it (and the map, and the go, of an address that
// was there, taken out so that the code is what says which map).
function shareUrl(href, map, page = "index.html") {
  const url = new URL(href);
  url.pathname = url.pathname.replace(/[^/]*$/, page);
  url.search = "";
  url.hash = "";
  url.searchParams.set("data", encodeMap(map));
  return url.toString();
}

// The maps that a player has made, kept in the browser's storage (which is allowed to fail: then there are none, and none are kept).
class MapStore {
  constructor(storage, key = SHARE.storageKey) {
    this.storage = storage;
    this.key = key;
    this.maps = this.load();
  }

  // What is in storage, and fit to be believed: a list of { id, name, rows } of maps that can be played, and no more than the most that are kept.
  load() {
    try {
      const data = JSON.parse(this.storage.getItem(this.key));
      if (!Array.isArray(data)) return [];
      return data
        .filter((entry) => entry && typeof entry.id === "string" && typeof entry.name === "string" && Array.isArray(entry.rows) && entry.rows.every((row) => typeof row === "string"))
        .filter((entry) => playable(entry))
        .slice(0, SHARE.maxMaps)
        .map(({ id, name, rows }) => ({ id, name, rows }));
    } catch (error) {
      return [];
    }
  }

  save() {
    try {
      this.storage.setItem(this.key, JSON.stringify(this.maps));
    } catch (error) {
      // Not saved; the maps are kept until the page is closed.
    }
  }

  list() {
    return this.maps.map((entry) => ({ ...entry }));
  }

  get(id) {
    const entry = this.maps.find((candidate) => candidate.id === id);
    return entry ? { ...entry } : null;
  }

  // Keeps a map ({ name, rows }). With the id of one that is kept, it is made that map; without, it is a new one. It says the id, or null if the
  // map can't be played or if there is no room for another.
  put(map, id = null) {
    if (!playable(map)) return null;
    const entry = { id: id || `m${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, name: map.name, rows: [...map.rows] };
    const at = this.maps.findIndex((candidate) => candidate.id === entry.id);
    if (at >= 0) this.maps[at] = entry;
    else if (this.maps.length >= SHARE.maxMaps) return null;
    else this.maps.push(entry);
    this.save();
    return entry.id;
  }

  remove(id) {
    const before = this.maps.length;
    this.maps = this.maps.filter((entry) => entry.id !== id);
    if (this.maps.length !== before) this.save();
    return this.maps.length !== before;
  }
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SHARE, squeezeRow, stretchRow, toCode, fromCode, encodeMap, decodeMap, playable, shareUrl, MapStore };
} else {
  Object.assign(window, { SHARE, squeezeRow, stretchRow, toCode, fromCode, encodeMap, decodeMap, playable, shareUrl, MapStore });
}
