// Makes the phone-sized models of this series from the big ones in source_assets/ghost_hunter.
//
//   npm install --no-save @gltf-transform/cli@4.5.1 sharp meshoptimizer     (in a scratch folder, not in the repo)
//   node optimize-models.js <path to that folder's node_modules/.bin/gltf-transform>
//
// Each model is welded (points that are the same point become one), simplified to a budget of triangles (a model with no budget, one with a skeleton, is left as it is) (the big ones were made with
// a million, and a phone wants ten to thirty thousand), its pictures made 1024 pixels across, and written as webp. It reads
// ../../../source_assets/ghost_hunter/*.glb and writes creatures/*.glb. Models are listed by name below: to add one, add a line.

const cp = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const tool = process.argv[2];
if (!tool) {
  console.log("Say where gltf-transform is: node optimize-models.js <path to gltf-transform>");
  process.exit(1);
}

const SOURCE = path.join(__dirname, "..", "..", "..", "source_assets", "ghost_hunter");
const OUT = path.join(__dirname, "creatures");

// [the file in source_assets, the name it is given, how many triangles at most (about), how many pixels across its pictures]
const MODELS = [
  ["Meshy_AI_Zombie_Nightmare_1030235818_texture.glb", "zombie.glb", 10000, 1024],
  ["Meshy_AI_fantasy_ghost_enraged_1030125609_texture.glb", "ghost_enraged.glb", 14000, 1024],
  ["Meshy_AI_fantasy_female_silhou_1030235749_texture.glb", "silhouette.glb", 14000, 1024],
  ["Meshy_AI_Grinning_Abomination_1030235847_texture.glb", "abomination.glb", 16000, 1024],
  ["Meshy_AI_Hellbound_Doll_Hall_1030235908_texture.glb", "doll.glb", 16000, 1024],
  ["Meshy_AI_Horde_of_Screams_1030235803_texture.glb", "horde.glb", 20000, 1024],
  ["Meshy_AI__Halloween2025_Terr_1030235754_texture.glb", "terror.glb", 16000, 1024],
  // a model with a skeleton is not simplified (that would have to move the weights of the bones too): it is small enough, and only its pictures shrink
  ["Meshy_AI_Rigged_Creepy_Skeleto_All_Animations.glb", "skeleton.glb", null, 1024],
];

const run = (args) => {
  const result = cp.spawnSync(tool, args, { encoding: "utf8", shell: true });
  if (result.status !== 0) throw new Error(`${args.join(" ")}\n${result.stdout}${result.stderr}`);
};

// How many triangles a .glb has: read from its JSON chunk, with no library.
const triangles = (file) => {
  const bytes = fs.readFileSync(file);
  const json = JSON.parse(bytes.slice(20, 20 + bytes.readUInt32LE(12)).toString("utf8"));
  let total = 0;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) total += json.accessors[primitive.indices].count / 3;
  return total;
};

fs.mkdirSync(OUT, { recursive: true });
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ghost-models-"));
for (const [from, to, budget, size] of MODELS) {
  const source = path.join(SOURCE, from);
  if (!fs.existsSync(source)) {
    console.log(`${from} is not in source_assets/ghost_hunter: skipped`);
    continue;
  }
  const before = triangles(source);
  const [a, b, c] = ["a", "b", "c"].map((name) => path.join(scratch, `${name}.glb`));
  if (budget) {
    run(["weld", source, a]);
    run(["simplify", a, b, "--ratio", String(Math.min(1, budget / before)), "--error", "0.1"]);
  } else {
    fs.copyFileSync(source, b);
  }
  run(["resize", b, c, "--width", String(size), "--height", String(size)]);
  run(["webp", c, path.join(OUT, to), "--quality", "82"]);
  console.log(`${to.padEnd(18)} ${before} -> ${triangles(path.join(OUT, to))} triangles, ${(fs.statSync(path.join(OUT, to)).size / 1048576).toFixed(2)} MB`);
}
fs.rmSync(scratch, { recursive: true, force: true });
