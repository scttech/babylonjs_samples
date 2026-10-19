// Every rock on screen: spawning, drifting, spinning, wrapping, splitting when
// shot, and the mesh lifecycle. A rock is a plain record, not its own class --
// same reasoning as bullets (see ../js/bullets.js): it has no behavior of its
// own, so a class per rock would just be overhead.
//
// `BABYLON` is only touched when `scene` is supplied, the same split Ship and
// BulletSystem use, so the logic can be unit tested without a real engine. All
// randomness goes through an injectable `random` function for the same reason
// SparkSystem has one in the Breakout series. See ../tests/rocks.tests.js.

// Three sizes. Shooting a large rock splits it into two medium ones, a medium
// into two small ones, and a small one just disappears. Smaller rocks are
// worth more points because they're faster and harder to hit.
const ROCK_SIZES = {
  large: { radius: 1.2, points: 20, minSpeed: 0.8, maxSpeed: 1.8, splitsInto: "medium" },
  medium: { radius: 0.7, points: 50, minSpeed: 1.4, maxSpeed: 2.6, splitsInto: "small" },
  small: { radius: 0.35, points: 100, minSpeed: 2.2, maxSpeed: 3.5, splitsInto: null },
};

// Rocks are a little flatter front to back than they are across.
const ROCK_DEPTH = 0.8;

// Turns a point on a perfect sphere into a point on a lumpy rock. The rock's
// outline (its `shape`, one entry per corner) was already worked out when it
// spawned; this reuses it in 3D. Looking at the point from the front, it sits
// over one of the outline's corners (found from its angle around the z axis),
// and is pulled in toward the center by that corner's factor.
//
// Points over the same corner move together, so the surface stays in one piece,
// with a sharp crease wherever one corner meets the next.
function rockPoint(x, y, z, shape) {
  const turn = (Math.atan2(y, x) + Math.PI) / (2 * Math.PI); // 0 to 1 around the circle
  const factor = shape[Math.min(Math.floor(turn * shape.length), shape.length - 1)];
  return { x: x * factor, y: y * factor, z: z * factor * ROCK_DEPTH };
}


class RockField {
  constructor({
    scene = null,
    minVertices = 8, // fewest corners a rock's outline can have
    maxVertices = 13, // most corners
    minRoughness = 0.1, // how far a corner may be pulled in: 0 would be a perfect polygon
    maxRoughness = 0.35,
    maxSpin = 1.5, // rad/s, in either direction
    color = "#bbbbbb",
    speedScale = 1, // multiplies every random speed; main.js raises it each wave
    random = Math.random,    
  } = {}) {
    this.scene = scene;
    this.minVertices = minVertices;
    this.maxVertices = maxVertices;
    this.minRoughness = minRoughness;
    this.maxRoughness = maxRoughness;
    this.maxSpin = maxSpin;
    this.color = color;
    this.speedScale = speedScale;
    this.rocks = [];
    this._random = random;
    // Every rock shares one material, like the bullets do.
    this._material = scene ? this._createMaterial(scene, color) : null;
  }

  // Creates one rock of the given size ("large", "medium", or "small") at
  // (x, y). Pass { vx, vy } to choose its velocity; otherwise it drifts in a
  // random direction at a random speed within the size's range.
  spawn(size, x, y, velocity = null) {
    const config = ROCK_SIZES[size];
    const { vx, vy } = velocity || this._randomVelocity(config);

    // Every rock gets its own number of corners and its own roughness, so no
    // two outlines look alike. Each corner sits between (1 - roughness) and
    // 100% of the rock's radius from its center, so the outline is lumpy but
    // never pokes outside the circle used for collisions.
    const vertexCount = this.minVertices + Math.floor(this._random() * (this.maxVertices - this.minVertices + 1));
    const roughness = this.minRoughness + this._random() * (this.maxRoughness - this.minRoughness);
    const shape = [];
    for (let i = 0; i < vertexCount; i++) {
      shape.push(1 - this._random() * roughness);
    }

    const rock = {
      size,
      x,
      y,
      vx,
      vy,
      radius: config.radius,
      angle: 0,
      spin: (this._random() * 2 - 1) * this.maxSpin,
      roughness,
      shape,
      mesh: null,
    };
    if (this.scene) this._attach(rock);
    this.rocks.push(rock);
    return rock;
  }

    // Scatters `count` large rocks across the screen, keeping each at least
  // `safeDistance` away from `avoid` (normally the ship) so the player isn't
  // buried the moment the game starts.
  populate(count, bounds, avoid = { x: 0, y: 0 }, safeDistance = 3) {
    const { halfWidth, halfHeight } = bounds;
    for (let n = 0; n < count; n++) {
      let x = 0;
      let y = 0;
      // Retry a limited number of times so a tiny screen can't loop forever.
      for (let attempt = 0; attempt < 20; attempt++) {
        x = (this._random() * 2 - 1) * halfWidth;
        y = (this._random() * 2 - 1) * halfHeight;
        if (Math.hypot(x - avoid.x, y - avoid.y) >= safeDistance) break;
      }
      this.spawn("large", x, y);
    }
  }

    // Advances every rock by dt seconds: drift, wrap around the screen, spin.
  update(dt, bounds) {
    const { halfWidth, halfHeight } = bounds;
    for (const rock of this.rocks) {
      rock.x = wrapCoordinate(rock.x + rock.vx * dt, halfWidth + rock.radius);
      rock.y = wrapCoordinate(rock.y + rock.vy * dt, halfHeight + rock.radius);
      rock.angle += rock.spin * dt;
      this._syncMesh(rock);
    }
  }

    // Removes `rock` and, unless it was the smallest size, replaces it with two
  // smaller rocks flying apart. Returns { points, children }.
  destroy(rock) {
    const index = this.rocks.indexOf(rock);
    if (index === -1) return { points: 0, children: [] };

    const config = ROCK_SIZES[rock.size];
    this.rocks.splice(index, 1);
    this._disposeRock(rock);

    const children = [];
    if (config.splitsInto) {
      const childConfig = ROCK_SIZES[config.splitsInto];
      // Pick a random direction and speed for one child and send the other the
      // opposite way at the same speed, so the pieces always separate evenly.
      // Each also keeps half of the parent's velocity, so a fast rock throws
      // off fast pieces.
      const direction = this._random() * Math.PI * 2;
      const speed =
        (childConfig.minSpeed + this._random() * (childConfig.maxSpeed - childConfig.minSpeed)) * this.speedScale;
      for (const heading of [direction, direction + Math.PI]) {
        children.push(
          this.spawn(config.splitsInto, rock.x, rock.y, {
            vx: rock.vx * 0.5 + Math.cos(heading) * speed,
            vy: rock.vy * 0.5 + Math.sin(heading) * speed,
          })
        );
      }
    }
    return { points: config.points, children };
  }

  // Returns the first rock that overlaps the given circle, or null if none
  // does. Bullets use it, and so does the ship.
  findCollision(x, y, radius) {
    return this.rocks.find((r) => circlesOverlap(x, y, radius, r.x, r.y, r.radius)) || null;
  }

  // Checks every bullet against every rock. A bullet that overlaps a rock is
  // removed and the rock is destroyed (splitting if it can). Returns one
  // { size, points, x, y } entry per rock destroyed, so the caller can add up
  // the score and, later, play effects where each one blew up.
  collideBullets(bulletSystem) {
    const hits = [];
    // Backwards, because a hit removes the bullet from the array being walked.
    for (let i = bulletSystem.bullets.length - 1; i >= 0; i--) {
      const bullet = bulletSystem.bullets[i];
      const rock = this.findCollision(bullet.x, bullet.y, bulletSystem.radius);
      if (!rock) continue;

      bulletSystem.remove(bullet);
      const { size, x, y } = rock;
      hits.push({ size, x, y, points: this.destroy(rock).points });
    }
    return hits;
  }

    // Removes every rock (e.g. on reset).
  clear() {
    for (const rock of this.rocks) {
      this._disposeRock(rock);
    }
    this.rocks = [];
  }

  // Removes every rock and the shared material.
  dispose() {
    this.clear();
    if (this._material) {
      this._material.dispose();
      this._material = null;
    }
  }

  _randomVelocity(config) {
    const heading = this._random() * Math.PI * 2;
    const speed = (config.minSpeed + this._random() * (config.maxSpeed - config.minSpeed)) * this.speedScale;
    return { vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed };
  }

  // One material for every rock: a dull stone color that barely shines.
  _createMaterial(scene, color) {
    const material = new BABYLON.StandardMaterial("rockMaterial", scene);
    material.diffuseColor = BABYLON.Color3.FromHexString(color);
    material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
    return material;
  }

  // Builds the rock as a lit 3D mesh: a faceted sphere whose points are pulled
  // in to match the rock's outline (see rockPoint). Building the vertex data
  // first and applying it to a new mesh lets us reshape the sphere before
  // anything is drawn.
  _attach(rock) {
    const vertexData = BABYLON.VertexData.CreateIcoSphere({ radius: rock.radius, subdivisions: 2, flat: true });

    const positions = vertexData.positions;
    for (let i = 0; i < positions.length; i += 3) {
      const p = rockPoint(positions[i], positions[i + 1], positions[i + 2], rock.shape);
      positions[i] = p.x;
      positions[i + 1] = p.y;
      positions[i + 2] = p.z;
    }

    // Lighting works from each face's normal, which pointed away from the old
    // sphere. Work them out again for the new shape.
    BABYLON.VertexData.ComputeNormals(positions, vertexData.indices, vertexData.normals);

    rock.mesh = new BABYLON.Mesh("rock", this.scene);
    vertexData.applyToMesh(rock.mesh);
    rock.mesh.material = this._material;
    this._syncMesh(rock);
  }

  _syncMesh(rock) {
    if (!rock.mesh) return;
    rock.mesh.position.x = rock.x;
    rock.mesh.position.y = rock.y;
    rock.mesh.rotation.z = rock.angle; // spinning in the plane of the screen
    rock.mesh.rotation.x = rock.angle * 0.5; // and tumbling a little, so the light plays across it
  }

  _disposeRock(rock) {
    if (!rock.mesh) return;
    // The second argument is false so the shared material survives.
    rock.mesh.dispose(false, false);
    rock.mesh = null;
  }

}

// The size table, for callers (and tests) that need to read it without
// duplicating the numbers this class already owns.
RockField.SIZES = ROCK_SIZES;
RockField.rockPoint = rockPoint;

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = RockField;
} else {
  window.RockField = RockField;
}
