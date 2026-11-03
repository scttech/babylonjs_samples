// The benders: who they are (a table), and loading their podiums and models. A bender is an animated
// character that stands on a podium and plays one of its idles, or its attack. Many of the animations
// move the character a long way (a spin jump travels two metres), and a tower stays where it is built,
// so the first job of loading a bender is to hold its hips still. See ../tests/benders.tests.js.

// How big a tower is built: the podium is made this wide (a cell is two), and the bender this tall.
const TOWER = {
  podiumWidth: 1.5,
  benderHeight: 1.3,
};

// The benders, one row each. `podium` and `file` are the models. `color` is the color of what they
// throw. `effect` is what a hit does besides harm (see effects.js). `cost` is what a podium for them costs, in gold, and `damage` is how much harm one hit does. `range` is how far they can shoot, in world units, and `cooldown` how many seconds from the
// start of one attack to the start of the next. `idles` are the clips played while there is nothing to do.
//
// `attack` describes the clip played to shoot, and all but the first two numbers were *measured* on the
// real clip (see the tests, which measure them again): `seconds` is how long it is, `speed` how much faster
// than that it is played, `aim` which way the attack points (in radians, 0 is straight ahead), and `hits`
// the moments in it that something is thrown. An attack has one hit, or, for a combo of punches, one for
// each punch. A hit is `at`, how far through the clip (from 0 to 1) the hand is out furthest, and `muzzle`,
// where the hand is at that moment, in meters from the bender's feet, for a bender that is not scaled.
const BENDERS = {
  air: {
    name: "Air Nomad",
    podium: "podiums/air.glb",
    file: "benders/air.glb",
    color: "#e8f4ff",
    effect: "push",
    range: 6,
    cost: 100,
    damage: 9,
    cooldown: 1.6,
    idles: ["Idle_9", "Idle_02"],
    attack: { clip: "mage_soell_cast_3", seconds: 3.333, speed: 2.2, aim: -0.06, hits: [{ at: 0.3, muzzle: { x: -0.04, y: 1.03, z: 0.61 } }] },
  },
  water: {
    name: "Water Tribe",
    podium: "podiums/water.glb",
    file: "benders/water.glb",
    color: "#38b6ff",
    effect: "slow",
    cost: 125,
    damage: 13,
    range: 5,
    cooldown: 1.8,
    idles: ["Idle_3"],
    attack: { clip: "mage_soell_cast_4", seconds: 2.2, speed: 1.6, aim: -0.07, hits: [{ at: 0.108, muzzle: { x: -0.04, y: 1.16, z: 0.55 } }] },
  },
  earth: {
    name: "Earth Kingdom",
    podium: "podiums/earth.glb",
    file: "benders/earth.glb",
    color: "#b08a4a",
    effect: "stun",
    cost: 150,
    damage: 32,
    range: 4,
    cooldown: 2.2,
    idles: ["Idle_10"],
    attack: { clip: "Left_Jab_from_Guard", seconds: 1.733, speed: 1.3, aim: 0.27, hits: [{ at: 0.308, muzzle: { x: 0.17, y: 1.31, z: 0.85 } }] },
  },
  fire: {
    name: "Fire Nation",
    podium: "podiums/fire.glb",
    file: "benders/fire.glb",
    color: "#f0701a",
    effect: "burn",
    cost: 175,
    damage: 3.2,
    range: 4.5,
    cooldown: 1.5,
    idles: ["Idle_11"],
    // A combo of six punches, and a flame thrown with each one.
    attack: {
      clip: "Punch_Combo_5",
      seconds: 3.833,
      speed: 2.6,
      aim: 0.25,
      hits: [
        { at: 0.208, muzzle: { x: -0.08, y: 1.27, z: 0.67 } },
        { at: 0.367, muzzle: { x: 0.16, y: 1.43, z: 0.65 } },
        { at: 0.458, muzzle: { x: 0.2, y: 1.41, z: 0.6 } },
        { at: 0.525, muzzle: { x: 0.18, y: 1.25, z: 0.68 } },
        { at: 0.6, muzzle: { x: 0.19, y: 1.29, z: 0.63 } },
        { at: 0.663, muzzle: { x: 0.18, y: 0.93, z: 0.66 } },
      ],
    },
  },
};

// The name of the hips in every one of these skeletons, and the clips that are for walking and
// running, which a tower never plays and are left as they are.
const HIPS = "mixamorig:Hips";
const LOCOMOTION = ["Walking", "Running"];

// The place the hips are held at: where they are, along and across the ground, in the first frame of a
// clip. (The numbers in an animation of a skeleton are in centimeters, and "home" is in those.)
function hipsTrack(group) {
  return group.targetedAnimations.find((t) => t.target.name === HIPS && t.animation.targetProperty === "position");
}
function hipsHome(group) {
  const { x, z } = hipsTrack(group).animation.getKeys()[0].value;
  return { x, z };
}

// Holds the hips of a clip at `home`: every key of their position keeps its height (the character still
// crouches, and jumps) but is moved to the same place along and across the ground. The arms, the legs and the
// spine still do everything the clip says; only the walking away is taken out. Returns whether there was a track to hold.
function holdHips(group, home) {
  const track = hipsTrack(group);
  if (!track) return false;
  const keys = track.animation.getKeys();
  keys.forEach((key) => {
    key.value = new BABYLON.Vector3(home.x, key.value.y, home.z);
  });
  track.animation.setKeys(keys);
  return true;
}

// Loads the podium and the bender of every kind, holds the hips of all their clips, and works out how
// each is scaled, lifted and shifted: the podium stands on the ground and is centered on the cell, and
// the bender's feet are on the podium's top.
async function loadBenders(scene, benders = BENDERS) {
  const kinds = Object.keys(benders);
  const podiums = await Promise.all(kinds.map((kind) => loadModel(scene, benders[kind].podium)));
  const characters = await Promise.all(kinds.map((kind) => loadModel(scene, benders[kind].file)));
  const loaded = {};
  kinds.forEach((kind, i) => {
    const podiumBounds = measure(podiums[i].rootNodes[0]);
    const podiumScale = fitScale(sizeOf(podiumBounds), TOWER.podiumWidth);
    const benderBounds = measure(characters[i].rootNodes[0]);
    const benderScale = heightScale(sizeOf(benderBounds), TOWER.benderHeight);

    const home = hipsHome(characters[i].animationGroups.find((group) => group.name === benders[kind].idles[0]));
    for (const group of characters[i].animationGroups) {
      if (!LOCOMOTION.includes(group.name)) holdHips(group, home);
    }

    loaded[kind] = {
      podium: {
        container: podiums[i],
        scale: podiumScale,
        lift: bottomOffset(podiumBounds, podiumScale),
        shift: centerOffset(podiumBounds, podiumScale),
        top: sizeOf(podiumBounds).y * podiumScale, // how high the podium is, which is how high the bender stands
      },
      bender: { container: characters[i], scale: benderScale, lift: bottomOffset(benderBounds, benderScale) },
    };
  });
  return loaded;
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { TOWER, BENDERS, HIPS, LOCOMOTION, hipsTrack, hipsHome, holdHips, loadBenders };
} else {
  Object.assign(window, { TOWER, BENDERS, HIPS, LOCOMOTION, hipsTrack, hipsHome, holdHips, loadBenders });
}
