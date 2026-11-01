# Tower Defense assets

| Folder | What | Where it is from | Licence |
|--------|------|------------------|---------|
| `images/` | The game's logo, in two sizes (the full size is in `source_assets/`) | Made for this project | The same as the rest of the repo; a non-commercial fan project (see below) |
| `fonts/` | **Cinzel** (titles and big words) and **Lato Bold** (everything small) | [Google Fonts](https://fonts.google.com/) | SIL Open Font Licence 1.1 (the licence of each is beside it) |
| `tiles/` | Five tiles of the board: grass, a straight road, a corner, a junction and a crossroads | Made with [Meshy](https://www.meshy.ai) and given to this project by its owner | Creative Commons: use, sharing and modification allowed (credit to Meshy, below) |
| `podiums/` | A podium for each nation: air, water, earth and fire | The same | The same |
| `benders/` | The four benders (rigged, with walking, running, attacks and idles) | The same | The same |
| `enemies/` | Five enemies (rigged, with walking, running and falling) | The same | The same |
| `flair/` | Four props for the maps: a cabbage cart, a spirit shrine, a spirit koi pond and a winged lemur perch | The same | The same |

## The models

The models in this folder are **web-sized copies** of the originals in `source_assets/tower_defense/` (which are not part of the repo: the tiles and podiums are up to 78 MB each, with a million triangles). `optimize-models.js` makes them:

- A model with no skeleton (a tile, a podium) is **welded** and **simplified** towards a budget of triangles, and its pictures are made 1024 pixels across and saved as WebP.
- A model with a skeleton (a bender, an enemy) is **not simplified**, because that would have to move the weights of its bones as well. It is about ten thousand triangles already, and only its pictures shrink.

| File | Triangles | Size |
|------|-----------|------|
| `tiles/grass.glb` | 21,218 | 1.2 MB |
| `tiles/straight.glb` | 5,170 | 0.5 MB |
| `tiles/corner.glb` | 17,768 | 1.0 MB |
| `tiles/junction.glb` | 28,102 | 1.5 MB |
| `tiles/crossroads.glb` | 8,522 | 0.6 MB |
| `podiums/*.glb` | about 6,000 each | about 0.5 MB each |
| `benders/*.glb` | about 10,000 each | 2.5 to 3.7 MB each |
| `enemies/*.glb` | about 10,000 each | 2 to 2.6 MB each |
| `flair/cabbage_cart.glb` | 8,332 | 0.7 MB |
| `flair/koi_pond.glb` | 15,362 | 1.2 MB |
| `flair/shrine.glb` | 5,996 | 0.6 MB |
| `flair/lemur_perch.glb` | 6,000 | 0.4 MB |

**The pieces of road.** Each is drawn as the road runs when the piece is *not* turned: the straight piece runs from the front to the back, the corner joins the back to the right, the junction is a road across with a branch to the back, and the crossroads joins all four. There is no dead-end piece: the start and the end of a road are made in code.

**The animations.** Every bender and every enemy has `Walking` and `Running`. The enemies also have `Dead` and `Fall_Dead_from_Abdominal_Injury` (the spirit also has `Unsteady_Walk`). The benders have idles and attacks:

| Bender | Idle | Attacks |
|--------|------|---------|
| Air | `Idle_02`, `Idle_9` | `mage_soell_cast_3`, `Charged_Spell_Cast_1`, `_360_Power_Spin_Jump`, `Breakdance_1990` |
| Water | `Idle_3` | `Charged_Ground_Slam`, `mage_soell_cast_3`, `_4`, `_6`, `_7` |
| Earth | `Idle_10` | `mage_soell_cast_1`, `Left_Jab_from_Guard`, `Punch_Combo`, `Punch_Combo_2`, `Spartan_Kick` |
| Fire | `Idle_11` | `Elbow_Strike`, `Flying_Fist_Kick`, `High_Kick`, `Kung_Fu_Punch`, `Leg_Sweep`, `Punch_Combo`, `Punch_Combo_5`, `Spartan_Kick`, `Sweeping_Kick` |

**Many attacks move the character a long way** (the hips travel up to two metres: the spin jump and the flying kick most), so the game holds the hips of every attack where they begin, to keep each bender on its podium.

**Licence.** The 3D models were made with [Meshy](https://www.meshy.ai), and are shared under a Creative Commons licence that allows them to be used, shared and modified. Credit to Meshy. (If the exact licence asks for more than this, such as a link to it, this is the place for it.)

**A fan project.** *Avatar: The Last Airbender* and everything in it belongs to its owners. This is a non-commercial fan project, made to teach, and it is not endorsed by them. The characters are in the style of the show; nothing of the show's own artwork, music or voices is used.

To add a model: put the original in `source_assets/tower_defense/`, add a line to `optimize-models.js`, and run it:

```
npm install --no-save @gltf-transform/cli@4.5.1 sharp meshoptimizer     (in a scratch folder, not in the repo)
node optimize-models.js <path to that folder's node_modules/.bin/gltf-transform>
```
