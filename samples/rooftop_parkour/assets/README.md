# Rooftop Parkour assets

The 3D models used by the Rooftop Parkour samples. All of them are CC0 (public domain). Crediting the authors isn't required, but they deserve it.

| Folder | What's in it | Used for |
|---|---|---|
| `character/runner.glb`, `runner_f.glb` | The male and the female mannequin, each with the same 46 animation clips | The player (chosen on the title screen) |
| `city/` | Seven whole buildings (small, medium and large), streets, sidewalks, fire escapes, awnings, AC units, planters and a few other props | The district: streets to run in, buildings to climb, rooftops to cross |
| `city/textures/` | The textures of those models, shared between them | The look of the city |

## The runner's clips

All the clips use the same skeleton, so either character can play any of them.

- **Standing and walking:** `Idle_Loop`, `Idle_LookAround_Loop`, `Idle_Tired_Loop`, `Walk_Loop`
- **Running:** `Jog_Fwd_Loop`, `Jog_Bwd_Loop`, `Jog_Left_Loop`, `Jog_Right_Loop`, `Jog_Fwd_LeanL_Loop`, `Jog_Fwd_LeanR_Loop`, `Sprint_Enter`, `Sprint_Loop`, `Sprint_Exit`, `Turn90_L`, `Turn90_R`
- **In the air:** `Jump_Start`, `Jump_Loop`, `Jump_Land`, `NinjaJump_Start`, `NinjaJump_Idle_Loop`, `NinjaJump_Land`, `Roll`, `BackFlip`
- **Low:** `Slide_Start`, `Slide_Loop`, `Slide_Exit`, `Crouch_Enter`, `Crouch_Idle_Loop`, `Crouch_Fwd_Loop`, `Crouch_Exit`
- **Climbing:** `Climb_Enter`, `Climb_Idle_Loop`, `Climb_Left_Loop`, `Climb_Right_Loop`, `Climb_Up_Loop`, `Climb_Down_Loop`, `Climb_Exit`, `ClimbLedge`, `ClimbUp_1m`
- **Other:** `Hit_Chest`, `Hit_Knockback`, `Death01`, `Dodge_Left`, `Dodge_Right`, `Celebration`, `Interact`

The climbing clips hold the body against a wall with both hands overhead, so they suit grabbing a ledge, shimmying along it and pulling up. None of the clips has root motion: the game moves the character itself.

## Sizes

The city kit is drawn at real scale, in metres, and so is the runner (about 1.83 units tall). A door is about 2 units, a floor of a building is about 3, and a street is about 12 wide, which is far too wide to jump. The buildings are 17 to 41 units tall, and about 12 to 25 wide.

Each building has a front (windows, awnings, a shop front) and plain sides and back, so they are meant to stand in a row along a street, like the buildings of a block.

## Credits

Please have a look at the work of the people who made these, and support them if you can.

- The city is the **Downtown City MegaKit**, by [Quaternius](https://quaternius.com) (CC0)
- The mannequins and their animations are from the **Universal Animation Library** (Pro) and the **Universal Animation Library 2** (Standard), by [Quaternius](https://quaternius.com) (CC0). There is an [animation viewer](https://quaternius.com/animviewer.html) for them, and Quaternius is on [Patreon](https://www.patreon.com/quaternius)
- The fonts are [Sedgwick Ave Display](https://fonts.google.com/specimen/Sedgwick+Ave+Display) and [Bangers](https://fonts.google.com/specimen/Bangers), from Google Fonts, under the SIL Open Font License (the license texts are in `fonts/`)

## Changes made to the files

The downloads came as several hundred models in many formats (glTF, FBX, Blend, and projects for Unity, Godot and Unreal), and are not kept in the repo. These are trimmed copies.

- **Characters.** The clips above were copied from the two animation libraries into one file for each mannequin, and every other clip was left out. Constant keyframes were removed (`resample`), which took each file to about 3 MB.
- **Buildings and props.** Each chosen model was packed into a single `.glb`. The second set of texture coordinates (made for lightmaps in the original engines) and the vertex colours (almost all white) were removed, vertices were welded, and positions and normals were stored in 16 bits (`KHR_mesh_quantization`).
- **Textures.** The 35 textures the chosen models use were shrunk from 2048 pixels to 1024 (512 for the roughness and the small interior pictures) and saved as WebP, which took them from 112 MB to 2 MB. Base colour and normal maps are 1024, and ORM (occlusion, roughness, metal) maps are 512.
