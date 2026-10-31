# Ghost Hunter assets

| Folder | What | Where it is from | Licence |
|--------|------|------------------|---------|
| `images/` | The Ghost Hunter logo, in two sizes (the full size is in `source_assets/`) | Made for this project | The same as the rest of the repo |
| `fonts/` | **Rubik Wet Paint** (the dripping title and headings) and **Share Tech Mono** (the read-outs) | [Google Fonts](https://fonts.google.com/specimen/Rubik+Wet+Paint) | SIL Open Font Licence 1.1 (the licence of each is beside it) |
| `creatures/` | A rigged skeleton with animations (Walking, Running, Zombie_Scream) | Made with [Meshy](https://www.meshy.ai) and given to this project by its owner | Creative Commons: use, sharing and modification allowed (credit to Meshy, below) |
| `music/` | Two tracks of ambient horror music: `horror-ambience.mp3` (92 seconds, by AtlasAudio) and `scary-ambience.mp3` (125 seconds, by Tunetank) | [Pixabay](https://pixabay.com/music/) | The [Pixabay Content Licence](https://pixabay.com/service/license-summary/) (free to use, credit is appreciated and is given below; the tracks may not be sold or passed on on their own) |

## The music

- `scary-ambience.mp3`: Music by [Tunetank](https://pixabay.com/users/tunetank-50201703/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437)
- `horror-ambience.mp3`: Music by [AtlasAudio](https://pixabay.com/users/atlasaudio-54514918/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255)

## The models

Only **rigged** models (a skeleton of bones and animations of their own) are used: models that are one static mesh were tried and taken out. The models in `creatures/` are **phone-sized copies** of the originals in `source_assets/ghost_hunter/`. `optimize-models.js` makes them: it shrinks the pictures (and, for a model with no skeleton, simplifies it to a budget of triangles).

| File | Used for | Triangles |
|------|----------|-----------|
| `skeleton.glb` | the skeleton (24 bones, and the clips Walking, Running and Zombie_Scream) | about 10,000 |

The spider and the ghoul have no model and are drawn as shapes (placeholders that can be hidden). The ghosts are made in code.

**Licence.** The 3D models (the creatures and the ghosts) were made with [Meshy](https://www.meshy.ai), and are shared under a Creative Commons licence that allows them to be used, shared and modified. Credit to Meshy. (If the exact licence asks for more than this, such as a link to it, this is the place for it.)

To add a rigged model: put the original in `source_assets/ghost_hunter/`, add a line to `optimize-models.js`, run it, and add an entry (with its `clips`) to `CREATURE_MODELS` in `creaturemesh.js`.
