# Bouncing Ball with Sparks and Sound

![Bouncing Ball with Sparks and Sound](../../../img/bouncing_ball_sparks_sound/bouncing_ball_sparks_sound.png)

Builds on [Bouncing Ball with Sparks](../bouncing_ball_sparks/README.md): every wall hit now also plays a procedurally synthesized "thump" sound.

## Key code

**Creating the audio engine.** Babylon's Audio Engine V2 wraps a standard Web Audio `AudioContext`. `unlockAsync()` waits for the browser's autoplay policy to allow sound (see Notes below).

```js
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
audioEngine = await BABYLON.CreateAudioEngineAsync({ audioContext });
await audioEngine.unlockAsync();
```

**Synthesizing the sound.** Instead of loading an audio file, the sample fills an `AudioBuffer` with samples it computes itself: a 180 Hz sine "thump" that decays quickly, plus a short burst of noise for the impact "click". Both are multiplied by `exp(-t * rate)`, an exponential decay envelope that fades them out.

```js
const buffer = audioContext.createBuffer(1, length, sampleRate);
const data = buffer.getChannelData(0);

for (let i = 0; i < length; i++) {
  const t = i / sampleRate;
  const thump = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 35);
  const click = (Math.random() * 2 - 1) * Math.exp(-t * 90);
  data[i] = thump * 0.6 + click * 0.5;
}
```

**Playing it on every bounce.** `createSoundAsync` turns the buffer into a playable `Sound`. Harder impacts play louder, and a random `playbackRate` varies the pitch so repeated hits don't sound identical. Each sound disposes itself when it finishes so they don't pile up.

```js
const playBounceSound = async (impactSpeed) => {
  if (!audioEngine || !bounceBuffer) return;

  const speedFactor = Math.min(impactSpeed / 400, 1.5);
  const sound = await audioEngine.createSoundAsync("bounce", bounceBuffer, {
    volume: 0.25 + speedFactor * 0.35,
    playbackRate: 0.9 + Math.random() * 0.3,
  });
  sound.onEndedObservable.add(() => sound.dispose());
  sound.play();
};
```

## Babylon.js features demonstrated

- Everything from Bouncing Ball with Sparks
- Babylon's Audio Engine V2 (`BABYLON.CreateAudioEngineAsync`, `audioEngine.createSoundAsync`)
- A sound generated entirely in-browser from a synthesized `AudioBuffer` — no external audio file needed
- Volume and pitch variation driven by impact speed

## Controls

- **Space** — save a PNG screenshot of the current frame

## Notes

Browsers block audio until a user gesture. Babylon shows its own small unmute prompt automatically the first time — click it once to hear the bounce sound.
