// Manages every bullet in flight: firing (with a cooldown and a cap on how
// many can exist at once), moving, wrapping around the screen, aging, and
// the mesh lifecycle. A bullet is a plain record ({x, y, vx, vy, life, mesh}),
// not its own class -- same reasoning as BrickGrid's bricks in the Breakout
// series: simple enough that a class per bullet would just be overhead.
//
// `BABYLON` is only touched when `scene` is supplied, the same split Ship
// uses, so the logic can be unit tested without a real engine. See
// ../tests/bullets.tests.js.
class BulletSystem {
    constructor({
        scene = null,
        speed = 14, // world units/s, relative to the ship
        lifetime = 1, // seconds before a bullet expires
        cooldown = 0.2, // seconds between shots
        maxBullets = 4, // the classic arcade limit
        radius = 0.08,
        color = "#ffffff",
    } = {}) {
        this.scene = scene;
        this.speed = speed;
        this.lifetime = lifetime;
        this.cooldown = cooldown;
        this.maxBullets = maxBullets;
        this.radius = radius;
        this.bullets = [];
        this.cooldownRemaining = 0;

        this._material = null;
        if (scene) {
            this._material = this._createMaterial(scene, color);
        }
    }

    // Fires one bullet from the ship's nose, unless the gun is still cooling
    // down or the cap has been reached. Returns the new bullet, or null.
    fire(ship) {
        if (this.cooldownRemaining > 0 || this.bullets.length >= this.maxBullets) return null;

        const { x, y, dirX, dirY } = ship.muzzle();
        const bullet = {
            x,
            y,
            // The bullet inherits the ship's velocity, so firing while drifting
            // sideways sends it off at an angle, like in the arcade original.
            vx: ship.vx + dirX * this.speed,
            vy: ship.vy + dirY * this.speed,
            life: this.lifetime,
            mesh: null,
        };
        if (this.scene) this._attach(bullet);
        this.bullets.push(bullet);
        this.cooldownRemaining = this.cooldown;
        return bullet;
    }

    // Advances the cooldown and every bullet by dt seconds. Bullets wrap around
    // the screen like the ship does, and are disposed once their life runs out.
    update(dt, bounds) {
        const { halfWidth, halfHeight } = bounds;
        this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);

        // Iterate backwards so splice() doesn't skip the next bullet.
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.life -= dt;
            if (bullet.life <= 0) {
                this._disposeBullet(bullet);
                this.bullets.splice(i, 1);
                continue;
            }

            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;

            const limitX = halfWidth + this.radius;
            const limitY = halfHeight + this.radius;
            if (bullet.x > limitX) bullet.x = -limitX;
            else if (bullet.x < -limitX) bullet.x = limitX;
            if (bullet.y > limitY) bullet.y = -limitY;
            else if (bullet.y < -limitY) bullet.y = limitY;

            if (bullet.mesh) {
                bullet.mesh.position.x = bullet.x;
                bullet.mesh.position.y = bullet.y;
            }
        }
    }

    // Removes every bullet in flight (e.g. on reset) and clears the cooldown.
    clear() {
        for (const bullet of this.bullets) {
            this._disposeBullet(bullet);
        }
        this.bullets = [];
        this.cooldownRemaining = 0;
    }

    // Removes every bullet and the shared material.
    dispose() {
        this.clear();
        if (this._material) {
            this._material.dispose();
            this._material = null;
        }
    }

      // One material is shared by every bullet. It's emissive with lighting
  // disabled, so bullets glow at full brightness without needing a light.
  _createMaterial(scene, color) {
    const material = new BABYLON.StandardMaterial("bulletMaterial", scene);
    material.emissiveColor = BABYLON.Color3.FromHexString(color);
    material.disableLighting = true;
    return material;
  }

  _attach(bullet) {
    bullet.mesh = BABYLON.MeshBuilder.CreateSphere("bullet", { diameter: this.radius * 2, segments: 8 }, this.scene);
    bullet.mesh.material = this._material;
    bullet.mesh.position.x = bullet.x;
    bullet.mesh.position.y = bullet.y;
  }

  _disposeBullet(bullet) {
    if (!bullet.mesh) return;
    // The second argument is false so the shared material survives.
    bullet.mesh.dispose(false, false);
    bullet.mesh = null;
  }

}

// Plain <script> include (no bundler in this project), so export via both
// CommonJS (for the QUnit/Node test runner) and the global scope (for
// index.html) depending on which environment loads this file.
if (typeof module !== "undefined" && module.exports) {
  module.exports = BulletSystem;
} else {
  window.BulletSystem = BulletSystem;
}

