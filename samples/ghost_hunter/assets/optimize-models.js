// Makes the phone-sized models of this series from the big ones in source_assets/ghost_hunter.
//
//   npm install --no-save @gltf-transform/cli@4.5.1 sharp meshoptimizer     (in a scratch folder, not in the repo)
//   node optimize-models.js <path to that folder's node_modules/.bin/gltf-transform> [name.glb]
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
  ["Meshy_AI_Rigged_Bloody_Mummy_All_Animations.glb", "mummy.glb", null, 1024],
  ["Meshy_AI_ghoul_girl_rigged_All_Animations.glb", "ghoul_girl.glb", null, 1024],
  // a model with a skeleton is not simplified (that would have to move the weights of the bones too): it is small enough, and only its pictures shrink
  ["Meshy_AI_Rigged_Creepy_Skeleto_All_Animations.glb", "skeleton.glb", null, 1024],
  ["Meshy_AI_Creepy_Doll_Model_All_Animations.glb", "doll.glb", null, 1024],
];
const ONLY = process.argv[3]; // optionally, the name of one model to make (and not all of them)

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
  if (ONLY && to !== ONLY) continue;
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
