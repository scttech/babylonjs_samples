# Ghost Hunter assets

| Folder | What | Where it is from | Licence |
|--------|------|------------------|---------|
| `images/` | The Ghost Hunter logo, in two sizes (the full size is in `source_assets/`) | Made for this project | The same as the rest of the repo |
| `fonts/` | **Rubik Wet Paint** (the dripping title and headings) and **Share Tech Mono** (the read-outs) | [Google Fonts](https://fonts.google.com/specimen/Rubik+Wet+Paint) | SIL Open Font Licence 1.1 (the licence of each is beside it) |
| `creatures/` | Eight models: a rigged skeleton with animations, a zombie, a doll, a floating head (two of them: a bust and a head), a heap of screaming faces, and two ghosts | Made with [Meshy](https://www.meshy.ai) and given to this project by its owner | Creative Commons: use, sharing and modification allowed (credit to Meshy, below) |
| `music/` | Two tracks of ambient horror music: `horror-ambience.mp3` (92 seconds, by AtlasAudio) and `scary-ambience.mp3` (125 seconds, by Tunetank) | [Pixabay](https://pixabay.com/music/) | The [Pixabay Content Licence](https://pixabay.com/service/license-summary/) (free to use, credit is appreciated and is given below; the tracks may not be sold or passed on on their own) |

## The music

- `scary-ambience.mp3`: Music by [Tunetank](https://pixabay.com/users/tunetank-50201703/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437)
- `horror-ambience.mp3`: Music by [AtlasAudio](https://pixabay.com/users/atlasaudio-54514918/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255)

## The models

The models in `creatures/` are **phone-sized copies** of the originals in `source_assets/ghost_hunter/` (which are up to 70 MB each, with over a million triangles). `optimize-models.js` makes them: it welds, simplifies to a budget of triangles, and shrinks the pictures. The whole folder is about 7 MB.

| File | Used for | Triangles |
|------|----------|-----------|
| `skeleton.glb` | the skeleton (a skeleton of 24 bones, and the clips Walking, Running and Zombie_Scream) | about 10,000 |
| `zombie.glb` | the ghoul | about 10,000 |
| `doll.glb` | the doll | about 42,000 |
| `abomination.glb`, `terror.glb` | the floaters | about 28,000 and 16,000 |
| `horde.glb` | the horde | about 26,000 |
| `ghost_enraged.glb`, `silhouette.glb` | ghosts (half of all ghosts, the rest being made in code) | about 14,000 and 18,000 |

Only the skeleton has bones and animations (it is the one thing in the folder with a rig), and it plays its own clips. None of the others has a skeleton, so the game moves them from outside (see `staticbody.js` in the Models sample). The spider has no model yet and is drawn as shapes.

**Licence.** The 3D models (the creatures and the ghosts) were made with [Meshy](https://www.meshy.ai), and are shared under a Creative Commons licence that allows them to be used, shared and modified. Credit to Meshy. (If the exact licence asks for more than this, such as a link to it, this is the place for it.)

To add a model: put the original in `source_assets/ghost_hunter/`, add a line to `optimize-models.js`, run it, and add an entry to `STATIC_MODELS` in `staticbody.js` (or, for one with a skeleton and animations, to `CREATURE_MODELS` in `creaturemesh.js`).
