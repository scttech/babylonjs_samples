# Parkour Runner assets

The 3D models used by the Parkour Runner samples. All of them are CC0 (public domain). Crediting the authors isn't required, but they deserve it.

| Folder | What's in it | Used for |
|---|---|---|
| `character/runner.glb` | An animated mannequin with 17 clips | The player |
| `roads/` | Road tiles, street lights, cones and barriers | The street |
| `commercial/` | Buildings, skyscrapers, awnings and overhangs | Buildings beside the street, and things to slide under |
| `industrial/` | Shipping containers, a water tower, factory buildings | Obstacles to jump or vault, and scenery |
| `suburban/` | Fences, a planter and trees | Low obstacles and scenery |
| `pickups/` | A coin, gems, a heart, a star and a bolt | Things to collect |
| `images/` | The Parkour Runner logo, and the High Score and Sick Combo banners, each full size and with a small copy for the game. The small copies of the banners (High Score, used on the game over screen, and Sick Combo, used for big combos) have a transparent background, and so does `parkour_runner_logo_small.png`, the logo for the title screen (the splash keeps the white one) | The READMEs, the splash and the game's screens |
| `fonts/` | Sedgwick Ave Display (graffiti handwriting) and Bangers, with their licenses | The text in the game |

## The runner's clips

All the clips use the same skeleton, so the character can play any of them: `Idle_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Jump_Start`, `Jump_Loop`, `Jump_Land`, `Roll`, `Slide_Start`, `Slide_Loop`, `Slide_Exit`, `ClimbUp_1m`, `NinjaJump_Start`, `NinjaJump_Idle_Loop`, `NinjaJump_Land`, `Hit_Chest`, `Hit_Knockback` and `Death01`.

## Sizes

The kits don't share a scale with the character. The runner is about 1.83 units tall, but the Kenney pieces were drawn so that a road tile is 1 unit wide, a shipping container is 0.35 units tall, and a coin is about 2 units across. The game scales each group of models to suit (`fitToSize` in the tutorial does the work).

## Credits

- City kits by [Kenney](https://www.kenney.nl) (CC0): [City Kit (Roads)](https://kenney.nl/assets/city-kit-roads), [City Kit (Commercial)](https://kenney.nl/assets/city-kit-commercial), [City Kit (Industrial)](https://kenney.nl/assets/city-kit-industrial) and [City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban)
- The mannequin and its animations are from the Universal Animation Library and the Universal Animation Library 2 (Standard), by [Quaternius](https://quaternius.com) (CC0)
- The pickups are from the Ultimate Platformer Pack by [Quaternius](https://quaternius.com) (CC0)
- The fonts are [Sedgwick Ave Display](https://fonts.google.com/specimen/Sedgwick+Ave+Display) and [Bangers](https://fonts.google.com/specimen/Bangers), from Google Fonts, under the SIL Open Font License (the license texts are in `fonts/`)

## Changes made to the files

The downloads were trimmed to what the samples use: only the `.glb` models were kept (the packs also came as FBX, OBJ, DAE, STL and Blend files, with preview images), and each model was re-saved as a single self-contained `.glb`.

The runner was assembled from the two animation libraries, which use the same skeleton. The 17 clips above were copied into one file, and the rest were left out. Two kinds of data that never change were removed to shrink the file: bone position and scale tracks that don't move. That took the runner from about 15.7 MB (the two libraries) to about 1 MB. The meshes and textures are otherwise untouched.
