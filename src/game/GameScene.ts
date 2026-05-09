// Phaser is imported dynamically in the Game component to avoid SSR issues.
// This file itself does not import Phaser at the top level.

export class GameScene {
  private scene: any;
  private player!: any;
  private cursors!: any;
  private map: number[][] = [];
  private zoneRegions: any = {
    Forest: [2, 2, 20, 20],
    City:   [25, 2, 47, 20],
    Desert: [2, 25, 20, 47],
    Ocean:  [25, 25, 47, 47],
    Shadow: [18, 18, 32, 32],
  };
  private currentZone: string = '';
  private lastEncounterTime: number = 0;
  private joyX: number = 0;
  private joyY: number = 0;
  private minimapGraphics!: any;
  private minimapPlayerDot!: any;
  private zoneLabel!: any;

  constructor() {}

  // This will be called by the Phaser Scene's init
  init(scene: any) {
    this.scene = scene;
    (window as any).__setJoy = (x: number, y: number) => {
      this.joyX = x;
      this.joyY = y;
    };
  }

  preload() {
    // Procedural textures are generated in create()
  }

  create() {
    const { scene } = this;
    const Phaser = (window as any).Phaser || (this.scene.game as any).constructor.Phaser || (window as any).Phaser;

    // Generate procedural textures
    this.createTextures();

    // Create Map
    const tileSize = 32;
    const worldSize = 50; // tiles

    // Fill with borders/walls
    for (let y = 0; y < worldSize; y++) {
      this.map[y] = [];
      for (let x = 0; x < worldSize; x++) {
        let type = 'wall';
        if (x >= 1 && x < worldSize - 1 && y >= 1 && y < worldSize - 1) {
          type = 'base';
          // Check paths
          if (x === 24 || x === 25 || y === 24 || y === 25) {
            type = 'path';
          } else {
            // Check zones
            for (const [zone, reg] of Object.entries(this.zoneRegions) as any) {
              const [x1, y1, x2, y2] = reg;
              if (x >= x1 && x <= x2 && y >= y1 && y <= y2) {
                type = zone;
                // Randomized tall grass
                if (Math.random() < 0.38) {
                  type = zone + 'Grass';
                }
                break;
              }
            }
          }
        }

        const texture = this.getTextureForType(type);
        const tile = scene.add.image(x * tileSize, y * tileSize, texture).setOrigin(0);
        if (type === 'wall') {
          // walls could be added to a physics group if we want collision
        }
      }
    }

    // Player
    this.player = scene.physics.add.sprite(24.5 * tileSize, 24.5 * tileSize, 'player');
    scene.cameras.main.startFollow(this.player);
    scene.cameras.main.setBounds(0, 0, worldSize * tileSize, worldSize * tileSize);

    // Controls
    this.cursors = scene.input.keyboard.createCursorKeys();

    // Minimap
    const mmScale = 2.2;
    this.minimapGraphics = scene.add.graphics().setScrollFactor(0).setDepth(100);
    this.minimapGraphics.setPosition(scene.cameras.main.width - 120, 10);
    this.drawMinimap();

    this.minimapPlayerDot = scene.add.circle(0, 0, 3, 0xffff00).setScrollFactor(0).setDepth(101);
    this.minimapPlayerDot.setPosition(scene.cameras.main.width - 120 + 24.5 * mmScale, 10 + 24.5 * mmScale);

    // Zone Label
    this.zoneLabel = scene.add.text(scene.cameras.main.centerX, 50, '', {
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontFamily: 'sans-serif'
    }).setOrigin(0.5).setScrollFactor(0).setAlpha(0);
  }

  update(time: number) {
    const SPEED = 160;
    let vx = 0;
    let vy = 0;

    // Keyboard
    if (this.cursors.left.isDown) vx = -SPEED;
    else if (this.cursors.right.isDown) vx = SPEED;
    if (this.cursors.up.isDown) vy = -SPEED;
    else if (this.cursors.down.isDown) vy = SPEED;

    // Joystick
    if (Math.abs(this.joyX) > 0.25) vx = this.joyX * SPEED;
    if (Math.abs(this.joyY) > 0.25) vy = this.joyY * SPEED;

    this.player.body.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      this.checkEncounter(time);
      this.updateMinimap();
      this.updateZone();
    }
  }

  private createTextures() {
    const { scene } = this;
    const makeTexture = (key: string, color: number, grass: boolean = false) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color);
      g.fillRect(0, 0, 32, 32);
      if (grass) {
        g.fillStyle(Phaser.Display.Color.GetColor(0, 0, 0), 0.2);
        // Triangle pattern
        g.beginPath();
        g.moveTo(8, 24); g.lineTo(16, 8); g.lineTo(24, 24);
        g.closePath();
        g.fillPath();
      }
      g.generateTexture(key, 32, 32);
    };

    const Phaser = (window as any).Phaser || (this.scene.game as any).constructor.Phaser;
    const colors: any = {
      Forest: 0x2d6a2d, City: 0x374151, Desert: 0xc4973a, Ocean: 0x1e6fa0, Shadow: 0x2d0a4e,
      ForestGrass: 0x166534, CityGrass: 0x1e3a5f, DesertGrass: 0x92400e, OceanGrass: 0x164e63, ShadowGrass: 0x1a0a2e,
      path: 0x4a4a4a, wall: 0x111111, base: 0x222222
    };

    for (const [key, color] of Object.entries(colors) as any) {
      makeTexture(key, color, key.includes('Grass'));
    }

    // Player texture
    const pg = scene.make.graphics({ x: 0, y: 0, add: false });
    pg.fillStyle(0xfbbf24);
    pg.fillCircle(16, 16, 14);
    pg.fillStyle(0xffffff);
    pg.fillCircle(16, 16, 4);
    pg.generateTexture('player', 32, 32);
  }

  private getTextureForType(type: string) {
    return type;
  }

  private checkEncounter(time: number) {
    if (time < this.lastEncounterTime + 400) return;

    const tx = Math.floor(this.player.x / 32);
    const ty = Math.floor(this.player.y / 32);

    // Check if on grass
    let onGrass = false;
    let zone = '';
    for (const [z, reg] of Object.entries(this.zoneRegions) as any) {
      const [x1, y1, x2, y2] = reg;
      if (tx >= x1 && tx <= x2 && ty >= y1 && ty <= y2) {
        zone = z;
        // This is a simplified check, we'd ideally store the map data properly
        // For now, let's just use a random chance if in a zone region
        if (Math.random() < 0.006) onGrass = true;
        break;
      }
    }

    if (onGrass) {
      this.lastEncounterTime = time;
      this.scene.cameras.main.flash(180, 255, 255, 255);
      this.scene.game.events.emit('encounter', zone);
      this.player.body.setVelocity(0, 0);
    }
  }

  private updateZone() {
    const tx = Math.floor(this.player.x / 32);
    const ty = Math.floor(this.player.y / 32);
    let zone = 'Wilderness';
    let emoji = '🌍';

    for (const [z, reg] of Object.entries(this.zoneRegions) as any) {
      const [x1, y1, x2, y2] = reg;
      if (tx >= x1 && tx <= x2 && ty >= y1 && ty <= y2) {
        zone = z;
        emoji = ({ Forest: '🌲', City: '🏙️', Desert: '🏜️', Ocean: '🌊', Shadow: '🌑' } as any)[z] || '🌍';
        break;
      }
    }

    if (zone !== this.currentZone && zone !== 'Wilderness') {
      this.currentZone = zone;
      this.zoneLabel.setText(`${emoji} ${zone}`);
      this.zoneLabel.setAlpha(1);
      if (this.zoneLabel.tween) this.zoneLabel.tween.stop();
      this.zoneLabel.tween = this.scene.tweens.add({
        targets: this.zoneLabel,
        alpha: 0,
        duration: 1000,
        delay: 2500
      });
    }
  }

  private drawMinimap() {
    const g = this.minimapGraphics;
    const mmScale = 2.2;
    const colors: any = { Forest: 0x2d6a2d, City: 0x374151, Desert: 0xc4973a, Ocean: 0x1e6fa0, Shadow: 0x2d0a4e };

    g.clear();
    g.fillStyle(0x111111, 0.8);
    g.fillRect(0, 0, 50 * mmScale, 50 * mmScale);

    for (const [zone, reg] of Object.entries(this.zoneRegions) as any) {
      const [x1, y1, x2, y2] = reg;
      g.fillStyle(colors[zone]);
      g.fillRect(x1 * mmScale, y1 * mmScale, (x2 - x1 + 1) * mmScale, (y2 - y1 + 1) * mmScale);
    }

    // Draw paths
    g.fillStyle(0x4a4a4a);
    g.fillRect(24 * mmScale, 0, 2 * mmScale, 50 * mmScale);
    g.fillRect(0, 24 * mmScale, 50 * mmScale, 2 * mmScale);
  }

  private updateMinimap() {
    const mmScale = 2.2;
    const ox = this.scene.cameras.main.width - 120;
    const oy = 10;
    this.minimapPlayerDot.setPosition(ox + (this.player.x / 32) * mmScale, oy + (this.player.y / 32) * mmScale);
  }
}
