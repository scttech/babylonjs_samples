// Zones: the goal and the checkpoints of a level. Each is a round patch of floor that does
// something when the marble rolls into it. The marble isn't stopped by one: a zone is a physics
// body that is a "trigger", which Havok only reports an overlap with. Whether there is a zone, and
// where, is level data, and is plain numbers; the rest builds them in a scene. See ../tests/zones.tests.js.

const ZONE_RADIUS = 1.5; // how far a zone reaches from its centre, in world units
const ZONE_BORDER = 0.3; // the width of the hazard-striped border round the disc, outside the trigger
const ZONE_HEIGHT = 3; // how tall the invisible trigger is, so a marble on a slope, or falling in, still touches it
const ZONE_COLORS = { goal: "#f6bf0e", checkpoint: "#248de3", taken: "#757d8e", slime: "#6fd13a" }; // the logo's yellow and blue, steel, and a slime green

// The zones of a level, goal first, then the checkpoints, then the slime, as { kind, index, col, row }. A
// checkpoint also has its `bonus`, and a puddle of slime its `radius`. The index of a zone is its place
// in the level's list of that kind.
function levelZones(grid) {
  return [
    { kind: "goal", index: 0, col: grid.goal.col, row: grid.goal.row },
    ...grid.checkpoints.map((checkpoint, index) => ({ kind: "checkpoint", index, ...checkpoint })),
    ...grid.slime.map((puddle, index) => ({ kind: "slime", index, ...puddle })),
  ];
}

// How far a zone reaches from its centre: its own `radius` if it has one (slime does), and ZONE_RADIUS if not.
function zoneRadius(zone) {
  return zone.radius || ZONE_RADIUS;
}

// Where a zone is in the world: the middle of it, on the floor.
function zonePosition(grid, zone) {
  const x = zone.col * CELL;
  const z = zone.row * CELL;
  return { x, y: heightAt(grid, x, z), z };
}

// Diagonal black and yellow stripes, drawn in code on a canvas: the hazard stripes of the buttons and of the
// logo. The stripes are at 45 degrees and as wide as a quarter of the picture, so the picture can repeat
// across a border without a seam.
function makeStripeTexture(scene, size = 128) {
  const texture = new BABYLON.DynamicTexture("zone-stripes", size, scene, true);
  texture.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE;
  texture.wrapV = BABYLON.Texture.WRAP_ADDRESSMODE;
  const context = texture.getContext();
  const stripe = size / 4;
  context.fillStyle = "#0b0909"; // the logo's black outline
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#f6bf0e"; // and its hazard yellow
  for (let x = -size; x < size * 2; x += stripe * 2) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + stripe, 0);
    context.lineTo(x + stripe + size, size);
    context.lineTo(x + size, size);
    context.closePath();
    context.fill();
  }
  texture.update();
  return texture;
}

// Builds every zone of a level in a scene: a glowing disc laid on the floor, inside a hazard-striped
// border, to see, and an invisible
// trigger standing on it, to feel. `onEnter(zone, node)` is called when something rolls into a
// zone's trigger, with the zone and what it was (the marble's mesh, for example), and `onExit(zone, node)`
// when it rolls out again. Returns `markTaken(zone)`,
// which greys out a zone that has been used (a checkpoint reached, or the goal won), and `dispose()`, which takes it all away again.
function buildZones(scene, grid, onEnter, onExit = () => {}) {
  const plugin = scene.getPhysicsEngine().getPhysicsPlugin();
  const materials = {};
  const colorFor = (name) => {
    if (!materials[name]) {
      const material = new BABYLON.StandardMaterial(`zone-${name}`, scene);
      material.emissiveColor = BABYLON.Color3.FromHexString(ZONE_COLORS[name]);
      material.disableLighting = true; // it glows, so it is the same in the dark corner as in the light
      materials[name] = material;
    }
    return materials[name];
  };

  // The border is the same for every zone: stripes that glow, like the discs.
  const stripes = makeStripeTexture(scene);
  stripes.uScale = 2;
  stripes.vScale = 2;
  const borderMaterial = new BABYLON.StandardMaterial("zone-border", scene);
  borderMaterial.emissiveTexture = stripes;
  borderMaterial.disableLighting = true;

  const built = levelZones(grid).map((zone) => {
    const at = zonePosition(grid, zone);
    const name = `${zone.kind}-${zone.index}`;
    const radius = zoneRadius(zone);

    const border = BABYLON.MeshBuilder.CreateCylinder(`${name}-border`, { diameter: (radius + ZONE_BORDER) * 2, height: 0.06 }, scene);
    border.position.set(at.x, at.y + 0.03, at.z);
    border.material = borderMaterial;

    const disc = BABYLON.MeshBuilder.CreateCylinder(`${name}-disc`, { diameter: radius * 2, height: 0.08 }, scene);
    disc.position.set(at.x, at.y + 0.04, at.z);
    disc.material = colorFor(zone.kind);

    const trigger = BABYLON.MeshBuilder.CreateCylinder(name, { diameter: radius * 2, height: ZONE_HEIGHT }, scene);
    trigger.position.set(at.x, at.y + ZONE_HEIGHT / 2 - 1, at.z); // from a unit under the floor to above it
    trigger.isVisible = false;
    const aggregate = new BABYLON.PhysicsAggregate(trigger, BABYLON.PhysicsShapeType.CYLINDER, { mass: 0, isTriggerShape: true }, scene);

    return { zone, border, disc, trigger, aggregate };
  });

  // Havok says when anything enters or leaves any trigger in the world. Find out which zone it was.
  const byNode = new Map(built.map((entry) => [entry.trigger, entry.zone]));
  const observer = plugin.onTriggerCollisionObservable.add((event) => {
    const handler = event.type === "TRIGGER_ENTERED" ? onEnter : event.type === "TRIGGER_EXITED" ? onExit : null;
    if (!handler) return;
    const triggerNode = [event.collider.transformNode, event.collidedAgainst.transformNode].find((node) => byNode.has(node));
    if (!triggerNode) return;
    const other = triggerNode === event.collider.transformNode ? event.collidedAgainst.transformNode : event.collider.transformNode;
    handler(byNode.get(triggerNode), other);
  });

  return {
    zones: built.map((entry) => entry.zone),
    markTaken(zone) {
      const entry = built.find((e) => e.zone.kind === zone.kind && e.zone.index === zone.index);
      if (entry) entry.disc.material = colorFor("taken");
    },
    dispose() {
      plugin.onTriggerCollisionObservable.remove(observer);
      for (const { border, disc, trigger, aggregate } of built) {
        aggregate.dispose();
        trigger.dispose();
        disc.dispose();
        border.dispose();
      }
      stripes.dispose();
      borderMaterial.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
  };
}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { ZONE_RADIUS, ZONE_BORDER, ZONE_HEIGHT, ZONE_COLORS, levelZones, zoneRadius, zonePosition, makeStripeTexture, buildZones };
} else {
  Object.assign(window, { ZONE_RADIUS, ZONE_BORDER, ZONE_HEIGHT, ZONE_COLORS, levelZones, zoneRadius, zonePosition, makeStripeTexture, buildZones });
}
