// Makes the web-sized models of this series from the big ones in source_assets/tower_defense.
//
//   npm install --no-save @gltf-transform/cli@4.5.1 sharp meshoptimizer     (in a scratch folder, not in the repo)
//   node optimize-models.js <path to that folder's node_modules/.bin/gltf-transform> [name.glb]
//
// The tiles and the podiums were made with about a million triangles each (up to 78 MB), and a page wants a few thousand.
// A model like that is welded (points that are the same point become one), simplified to a budget of triangles, its pictures
// made 1024 pixels across, and written as webp. A model with a skeleton (the benders and the enemies, about ten thousand
// triangles already) is not simplified, because that would have to move the weights of the bones too: only its pictures shrink.
// It reads ../../../source_assets/tower_defense and writes tiles/, podiums/, benders/ and enemies/. Models are listed by
// name below: to add one, add a line.

const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tool = process.argv[2];
if (!tool) {
  console.log("Say where gltf-transform is: node optimize-models.js <path to gltf-transform>");
  process.exit(1);
}

const SOURCE = path.join(__dirname, "..", "..", "..", "source_assets", "tower_defense");

// [the folder (or the start of its name) in source_assets/tower_defense, where it goes, how many triangles at most (about), how many pixels across its pictures]
const MODELS = [
  ["Meshy_AI_modular_grass_filler_tile", "tiles/grass.glb", 3000, 1024],
  ["Meshy_AI_modular_straight_tile", "tiles/straight.glb", 3000, 1024],
  ["Meshy_AI_modular_corner_tile", "tiles/corner.glb", 3000, 1024],
  ["Meshy_AI_modular_t_junction_tile", "tiles/junction.glb", 3000, 1024],
  ["Meshy_AI_modular_crossroads_tile", "tiles/crossroads.glb", 3000, 1024],
  ["Meshy_AI_podium_air_nomad", "podiums/air.glb", 6000, 1024],
  ["Meshy_AI_podium_earth_kingdom", "podiums/earth.glb", 6000, 1024],
  ["Meshy_AI_podium_fire_nation", "podiums/fire.glb", 6000, 1024],
  ["Meshy_AI_podium_water_tribe", "podiums/water.glb", 6000, 1024],
  ["benders/Meshy_AI_air_nomad_monk", "benders/air.glb", null, 1024],
  ["benders/Meshy_AI_earth_kingdom_warrior", "benders/earth.glb", null, 1024],
  ["benders/Meshy_AI_fire_nation_warrior", "benders/fire.glb", null, 1024],
  ["benders/Meshy_AI_water_tribe_bender", "benders/water.glb", null, 1024],
  ["Meshy_AI_fn_scout_raider", "enemies/scout.glb", null, 1024],
  ["Meshy_AI_fn_masked_grunt", "enemies/grunt.glb", null, 1024],
  ["Meshy_AI_fn_heavy_trooper", "enemies/heavy.glb", null, 1024],
  ["Meshy_AI_dai_li_agent", "enemies/dai_li.glb", null, 1024],
  ["Meshy_AI_corrupted_spirit", "enemies/spirit.glb", null, 1024],
];
const ONLY = process.argv[3]; // optionally, the name of one model to make (and not all of them)

const run = (args) => {
  const result = cp.spawnSync(tool, args, { encoding: "utf8", shell: true });
  if (result.status !== 0) throw new Error(`${args.join(" ")}\n${result.stdout}${result.stderr}`);
};

// Where a model is: a folder of its own (a name that starts with `start`) holding one .glb, or, in benders/, the .glb itself.
const find = (start) => {
  const dir = path.join(SOURCE, path.dirname(start));
  if (!fs.existsSync(dir)) return null;
  const name = path.basename(start);
  const found = fs.readdirSync(dir).find((entry) => entry.startsWith(name));
  if (!found) return null;
  const full = path.join(dir, found);
  if (fs.statSync(full).isFile()) return full;
  const glb = fs.readdirSync(full).find((entry) => entry.endsWith(".glb"));
  return glb ? path.join(full, glb) : null;
};

// How many triangles a .glb has: read from its JSON chunk, with no library.
const triangles = (file) => {
  const bytes = fs.readFileSync(file);
  const json = JSON.parse(bytes.slice(20, 20 + bytes.readUInt32LE(12)).toString("utf8"));
  let total = 0;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) total += json.accessors[primitive.indices].count / 3;
  return total;
};

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "tower-models-"));
for (const [from, to, budget, size] of MODELS) {
  if (ONLY && to !== ONLY) continue;
  const source = find(from);
  if (!source) {
    console.log(`${from} is not in source_assets/tower_defense: skipped`);
    continue;
  }
  const out = path.join(__dirname, to);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const before = triangles(source);
  const [a, b, c] = ["a", "b", "c"].map((name) => path.join(scratch, `${name}.glb`));
  if (budget) {
    run(["weld", source, a]);
    run(["simplify", a, b, "--ratio", String(Math.min(1, budget / before)), "--error", "1"]);
  } else {
    fs.copyFileSync(source, b);
  }
  run(["resize", b, c, "--width", String(size), "--height", String(size)]);
  run(["webp", c, out, "--quality", "82"]);
  console.log(`${to.padEnd(20)} ${before} -> ${triangles(out)} triangles, ${(fs.statSync(out).size / 1048576).toFixed(2)} MB`);
}
fs.rmSync(scratch, { recursive: true, force: true });
