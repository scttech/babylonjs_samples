# Ghost Hunter Music

Step 8 of the Ghost Hunter series. Builds on [Ghost Hunter Models](../ghost_hunter_models/README.md). Two tracks of recorded ambient horror go under everything, and they are **mixed, not played**, the way a film's music is. While nothing is happening a quiet bed plays; as a creature comes near the tenser track swells and the bed goes; and as the dread reaches its peak **both go out** for the silence before a strike, and come back in the aftershock. The mix is plain arithmetic of the numbers the scare already worked out (the dread, the room's ambient loudness and the scare level's silence), eased so that it never jumps.

The tracks (`../assets/music/`) are about 7 MB between them, so they are **streamed** as `<audio>` elements and put through the same Web Audio graph as the rest of the sound: the scare level's volume and the master volume reach the music too. They are told to play inside the tap (a phone will not play before the screen has been touched), and are paused when the page is hidden.

This sample is also a [step-by-step tutorial](TUTORIAL.md) that explains how it was made, starting from the Models sample. Run `node reset-tutorial.js` to return this folder to the Models sample, to work through the changes yourself.

Run a web server (`npx serve` in the repo root) and open the sample through `http://localhost`. A phone needs HTTPS: see the [series README](../README.md#what-you-need). Add **`?dev`** to the address for the developer panel. Headphones, and the volume low to begin with.

**The mix is a function.** `musicMix(dread, ambient, silence)` gives how loud the calm and the tense tracks should be: the calm one while it is quiet, the tense one from a dread of about 0.15 to 0.55, both multiplied by a "quiet" that reaches nothing at the silence and by the ambient (so the strike itself is silent), and every number between 0 and 1 whatever it is given.

**Easing.** `approach` takes a number a fixed fraction of the way to its target every frame, so it arrives in about the time it was given and never goes past.

**Streaming through the graph.** An `<audio>` element is a source (`createMediaElementSource`), a gain node is its volume, and the element's own volume is 0 until it is in the graph (or it would be heard directly).

## Key code

**Both tracks go before the strike.**

```js
const quiet = 1 - smoothStep(table.quietAt * 0.75, table.quietAt, Math.min(1, dread * silence));
```

**An eased number.**

```js
return current + (target - current) * (1 - Math.exp((-3 * seconds) / time));
```

**Played in the touch.**

```js
const playing = element.play(); // now, before anything is waited for
if (playing && playing.catch) playing.catch(() => {});
```

## Babylon.js features demonstrated

- Everything from Ghost Hunter Models
- Web Audio (not Babylon.js): `createMediaElementSource` to stream a file through the graph, gains, and the page visibility event
- (The mix needs no Web Audio: it is plain arithmetic, tested without it.)

## Controls

- Everything from the Models sample
- The music begins when you press the button
- With **`?dev`**: a read-out of both tracks' loudness, a switch for the music, its volume, and how fast the mix moves

## Running the tests

Open [tests.html](tests.html) in a browser (or click "Run tests" from the running sample) to run the QUnit suite. The new tests check the mix (the calm track going and the tense one coming as the dread rises, both out before the strike, the level's silence, the ambient, every number between 0 and 1), the easing, the score with stand-ins for the files and the sound (both told to play from the tap, silent, then in the graph; the mix eased; a strike silencing it and it coming back to exactly where it was; a switch; pausing), and the real tracks (each loads and is a few minutes long).

## Credits

See the [series README](../README.md#credits) and the [assets README](../assets/README.md): the two tracks are Pixabay music, used under the Pixabay Content Licence:

- Music by [Tunetank](https://pixabay.com/users/tunetank-50201703/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437) from [Pixabay](https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=347437)
- Music by [AtlasAudio](https://pixabay.com/users/atlasaudio-54514918/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255) from [Pixabay](https://pixabay.com/music//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=512255)

## Next up

The ninth sample is **Tools**: a flashlight that reveals what the dark hides, a capture beam that drains and traps, and a weakness for each creature.
