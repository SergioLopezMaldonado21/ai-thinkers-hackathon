import Phaser from 'phaser';
import './style.css';

class Arena extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private speed = 180;

  constructor() { super('arena'); }

  create() {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#111827');
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x24324d, 0.8);
    for (let x = 0; x <= width; x += 32) graphics.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += 32) graphics.lineBetween(0, y, width, y);
    graphics.fillStyle(0x1c2740, 1);
    [[90, 100], [width - 110, 115], [width - 160, height - 80], [120, height - 90]].forEach(([x, y]) => graphics.fillRoundedRect(x, y, 74, 34, 8));

    const texture = this.textures.createCanvas('pilot', 48, 56)!;
    const ctx = texture.context;
    ctx.fillStyle = '#0a1020'; ctx.fillRect(7, 17, 34, 32);
    ctx.fillStyle = '#63f5d1'; ctx.fillRect(11, 13, 26, 27);
    ctx.fillStyle = '#a8fff0'; ctx.fillRect(16, 17, 16, 10);
    ctx.fillStyle = '#ff6b9d'; ctx.fillRect(17, 30, 14, 5);
    ctx.fillStyle = '#63f5d1'; ctx.fillRect(3, 25, 8, 5); ctx.fillRect(37, 25, 8, 5);
    ctx.fillStyle = '#f8c45c'; ctx.fillRect(13, 44, 8, 8); ctx.fillRect(27, 44, 8, 8);
    texture.refresh();
    this.player = this.physics.add.sprite(width / 2, height / 2, 'pilot').setScale(0.9);
    this.player.setCollideWorldBounds(true);
    this.add.text(width / 2, 24, 'ZONA DE EXPLORACIÓN', { fontFamily: 'monospace', fontSize: '12px', color: '#60749b' }).setOrigin(0.5);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
  }

  update() {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;
    this.player.setVelocity(0);
    if (left) this.player.setVelocityX(-this.speed);
    if (right) this.player.setVelocityX(this.speed);
    if (up) this.player.setVelocityY(-this.speed);
    if (down) this.player.setVelocityY(this.speed);
    if ((left || right) && (up || down)) this.player.body!.velocity.normalize().scale(this.speed);
    const readout = document.querySelector('#speed-readout');
    if (readout) readout.textContent = String(Math.round(this.player.body!.velocity.length()));
  }
}

new Phaser.Game({ type: Phaser.AUTO, width: 640, height: 400, parent: 'game-container', physics: { default: 'arcade', arcade: { debug: false } }, scene: Arena, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH } });
