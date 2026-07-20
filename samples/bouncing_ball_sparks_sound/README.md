# Bouncing Ball with Sparks and Sound

![Bouncing Ball with Sparks and Sound](../../img/bouncing_ball_sparks_sound/bouncing_ball_sparks_sound.png)

Builds on [Bouncing Ball with Sparks](../bouncing_ball_sparks/README.md): every wall hit now also plays a procedurally synthesized "thump" sound.

## Babylon.js features demonstrated

- Everything from Bouncing Ball with Sparks
- Babylon's Audio Engine V2 (`BABYLON.CreateAudioEngineAsync`, `audioEngine.createSoundAsync`)
- A sound generated entirely in-browser from a synthesized `AudioBuffer` — no external audio file needed
- Volume and pitch variation driven by impact speed

## Controls

- **Space** — save a PNG screenshot of the current frame

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
