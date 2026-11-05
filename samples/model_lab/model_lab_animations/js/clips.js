// What an animation clip is made of. A clip (Babylon.js calls it an *animation group*) is a bundle of **tracks**: one track for each thing that
// moves and each way that it moves ("the left forearm's rotation", "the hips' position"). A track is a list of **keyframes**: a time, and what the
// value is at that time. Between two keyframes the value is worked out (blended) for you. This file reads clips into plain data, with
// no playing in it, so that the length, the tracks and the bones that a clip needs can all be looked at and tested. See ../tests/clips.tests.js.

// The frame rate that is assumed for a clip that has no tracks to say it.
const DEFAULT_FRAME_RATE = 60;

// A clip's timing: where it starts and ends (in frames), how fast the frames go (frames per second), and so how long it is in seconds.
// A clip counts *frames*, not seconds, and the same number of frames is a different time at a different rate.
function clipInfo(group) {
  const first = group.targetedAnimations[0];
  const fps = first ? first.animation.framePerSecond : DEFAULT_FRAME_RATE;
  const frames = group.to - group.from;
  return { name: group.name, from: group.from, to: group.to, fps, frames, seconds: frames / fps };
}

// The frame that a number of seconds into a clip is at. A time outside the clip is the nearest end of it.
function frameAt(info, seconds) {
  const inside = Math.min(Math.max(seconds, 0), info.seconds);
  return info.from + inside * info.fps;
}

// The seconds into a clip that a frame is at (the other way round from frameAt).
function secondsAt(info, frame) {
  const inside = Math.min(Math.max(frame, info.from), info.to);
  return (inside - info.from) / info.fps;
}

// The tracks of a clip, as plain data: what moves (a bone's name), how (position, rotation or scale), and how many keyframes the track has.
function describeTracks(group) {
  return group.targetedAnimations.map((targeted) => ({
    target: targeted.target.name,
    short: shortName(targeted.target.name),
    property: targeted.animation.targetProperty,
    keys: targeted.animation.getKeys().length,
  }));
}

// The tracks of a clip in a few numbers: how many tracks, how many different things they move, how many keyframes in all, and how many tracks for
// each property.
function summarizeTracks(tracks) {
  const byProperty = {};
  for (const track of tracks) byProperty[track.property] = (byProperty[track.property] || 0) + 1;
  return {
    tracks: tracks.length,
    targets: new Set(tracks.map((track) => track.target)).size,
    keys: tracks.reduce((sum, track) => sum + track.keys, 0),
    byProperty,
  };
}

// The names of the things that a clip moves, sorted, with no repeats. This is the clip's **list of needs**: it can only be played on a model that has
// something of each name. A later tutorial will use it to say whether a clip fits a skeleton.
function clipTargets(group) {
  return [...new Set(group.targetedAnimations.map((targeted) => targeted.target.name))].sort();
}

// A property as a person says it: Babylon.js names it for the code.
const PROPERTY_NAMES = {
  position: "position",
  rotationQuaternion: "rotation",
  rotation: "rotation",
  scaling: "scale",
};

function propertyName(property) {
  return Object.hasOwn(PROPERTY_NAMES, property) ? PROPERTY_NAMES[property] : property;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { DEFAULT_FRAME_RATE, clipInfo, frameAt, secondsAt, describeTracks, summarizeTracks, clipTargets, PROPERTY_NAMES, propertyName };
} else {
  Object.assign(window, { DEFAULT_FRAME_RATE, clipInfo, frameAt, secondsAt, describeTracks, summarizeTracks, clipTargets, PROPERTY_NAMES, propertyName });
}
