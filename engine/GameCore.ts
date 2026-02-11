import { Entity } from './Entity';
import { draw2DBlock } from './utils';
import { InputState } from '../types';

export class GameCore {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  
  player: Entity;
  entities: Entity[] = [];
  particles: Entity[] = [];
  
  camera: { x: number, y: number } = { x: 0, y: 0 };
  worldSize = 3000;
  
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  onTimeUpdate: (timeStr: string) => void;
  
  input: InputState = { up: false, down: false, left: false, right: false };

  joystick = {
    active: false,
    id: -1,
    baseX: 0,
    baseY: 0,
    knobX: 0,
    knobY: 0,
    dirX: 0,
    dirY: 0,
    radius: 50
  };
  
  absorbThreshold = 1.35; // Size ratio needed to instantly absorb
  bumpPenalty = 0.15; // Percentage of area lost when bumped

  startTime: number = 0;
  lastTimeStr: string = "";

  constructor(
    canvas: HTMLCanvasElement, 
    onGameOver: (score: number) => void, 
    onScoreUpdate: (score: number) => void,
    onTimeUpdate: (timeStr: string) => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.onGameOver = onGameOver;
    this.onScoreUpdate = onScoreUpdate;
    this.onTimeUpdate = onTimeUpdate;

    this.player = new Entity(0, 0, 40, 'player', '#3b82f6');
    this.initWorld();
  }

  initWorld() {
    this.entities = [];
    this.particles = [];
    this.player = new Entity(this.worldSize / 2, this.worldSize / 2, 40, 'player', '#3b82f6');
    
    this.startTime = Date.now();
    this.lastTimeStr = "00:00";
    this.onTimeUpdate(this.lastTimeStr);

    // Spawn initial enemies
    for (let i = 0; i < 60; i++) {
      this.spawnEnemy();
    }
    
    // Spawn some initial food
    for (let i = 0; i < 100; i++) {
      this.spawnFood();
    }
  }

  getSafeSpawnPos(): { x: number, y: number } {
    let x = 0, y = 0, dist = 0;
    let attempts = 0;
    const safeDistance = 600 + (this.player ? this.player.size * 2 : 0); // Scale safety radius
    
    do {
      x = Math.random() * this.worldSize;
      y = Math.random() * this.worldSize;
      
      if (this.player) {
        const dx = x - (this.player.x + this.player.size / 2);
        const dy = y - (this.player.y + this.player.size / 2);
        dist = Math.sqrt(dx * dx + dy * dy);
      } else {
        dist = safeDistance + 1; // Force pass if player isn't fully ready
      }
      
      attempts++;
    } while (dist < safeDistance && attempts < 20); // Stop after 20 tries to prevent hanging
    
    return { x, y };
  }

  spawnEnemy() {
    const { x, y } = this.getSafeSpawnPos();
    
    // Vary size based on player's current size to keep it interesting
    const scaleFactor = (Math.random() * 1.5) + 0.5; 
    const size = Math.max(20, this.player.targetSize * scaleFactor);
    
    this.entities.push(new Entity(x, y, size, 'enemy', '#eab308'));
  }

  spawnFood(x?: number, y?: number) {
    let px = x;
    let py = y;
    
    if (px === undefined || py === undefined) {
      const safePos = this.getSafeSpawnPos();
      px = safePos.x;
      py = safePos.y;
    }
    
    this.particles.push(new Entity(px, py, 12, 'particle', '#86efac'));
  }

  handleInput(input: InputState) {
    this.input = input;
  }

  startJoystick(x: number, y: number, id: number) {
    if (!this.joystick.active) {
      this.joystick.active = true;
      this.joystick.id = id;
      this.joystick.baseX = x;
      this.joystick.baseY = y;
      this.joystick.knobX = x;
      this.joystick.knobY = y;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
    }
  }

  moveJoystick(x: number, y: number, id: number) {
    if (this.joystick.active && this.joystick.id === id) {
      const dx = x - this.joystick.baseX;
      const dy = y - this.joystick.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > this.joystick.radius) {
         this.joystick.knobX = this.joystick.baseX + (dx / dist) * this.joystick.radius;
         this.joystick.knobY = this.joystick.baseY + (dy / dist) * this.joystick.radius;
      } else {
         this.joystick.knobX = x;
         this.joystick.knobY = y;
      }

      const normDist = Math.min(dist, this.joystick.radius) / this.joystick.radius;
      if (dist > 0) {
         this.joystick.dirX = (dx / dist) * normDist;
         this.joystick.dirY = (dy / dist) * normDist;
      }
    }
  }

  endJoystick(id: number) {
    if (this.joystick.active && this.joystick.id === id) {
      this.joystick.active = false;
      this.joystick.id = -1;
      this.joystick.dirX = 0;
      this.joystick.dirY = 0;
    }
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  update() {
    if (this.player.isDead) return;

    // Update Survival Time
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.startTime) / 1000);
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const s = (elapsedSeconds % 60).toString().padStart(2, '0');
    const currentTimerStr = `${m}:${s}`;
    
    if (currentTimerStr !== this.lastTimeStr) {
      this.lastTimeStr = currentTimerStr;
      this.onTimeUpdate(currentTimerStr);
    }

    // Player Movement
    const speed = 400 / this.player.size; // Slower when bigger
    const maxSpeed = Math.min(6, Math.max(2, speed));
    
    let inputX = 0;
    let inputY = 0;

    if (this.input.left) inputX -= 1;
    if (this.input.right) inputX += 1;
    if (this.input.up) inputY -= 1;
    if (this.input.down) inputY += 1;

    const inputMag = Math.sqrt(inputX * inputX + inputY * inputY);
    if (inputMag > 0) {
      inputX /= inputMag;
      inputY /= inputMag;
    }

    if (this.joystick.active) {
      inputX = this.joystick.dirX;
      inputY = this.joystick.dirY;
    }

    this.player.vx += inputX * 1;
    this.player.vy += inputY * 1;

    // Clamp speed
    const velMag = Math.sqrt(this.player.vx ** 2 + this.player.vy ** 2);
    if (velMag > maxSpeed) {
      this.player.vx = (this.player.vx / velMag) * maxSpeed;
      this.player.vy = (this.player.vy / velMag) * maxSpeed;
    }

    // Update all entities
    this.player.update();
    this.entities.forEach(e => this.updateAI(e));
    this.particles.forEach(p => p.update());

    // Keep player in bounds
    this.player.x = Math.max(0, Math.min(this.worldSize - this.player.size, this.player.x));
    this.player.y = Math.max(0, Math.min(this.worldSize - this.player.size, this.player.y));

    // Resolve Collisions
    const allCollidables = [this.player, ...this.entities];
    
    for (let i = 0; i < allCollidables.length; i++) {
      const a = allCollidables[i];
      if (a.isDead) continue;

      // Collide with other blocks
      for (let j = i + 1; j < allCollidables.length; j++) {
        const b = allCollidables[j];
        if (b.isDead) continue;
        this.checkBlockCollision(a, b);
      }

      // Collide with particles (food)
      for (let p of this.particles) {
        if (p.isDead) continue;
        // Don't let particles be eaten in their first 15 frames so they have time to fly out
        if (p.age < 15) continue; 
        
        if (this.isOverlapping(a, p)) {
          a.addArea(p.area);
          p.isDead = true;
          if (a === this.player) this.onScoreUpdate(Math.floor(this.player.area));
        }
      }
    }

    // Cleanup dead entities
    this.entities = this.entities.filter(e => !e.isDead);
    this.particles = this.particles.filter(p => !p.isDead);

    // Respawn enemies to keep map populated
    if (this.entities.length < 50) {
      this.spawnEnemy();
    }
    if (this.particles.length < 50) {
      this.spawnFood();
    }

    // Camera follow
    this.camera.x += (this.player.x + this.player.size / 2 - this.width / 2 - this.camera.x) * 0.1;
    this.camera.y += (this.player.y + this.player.size / 2 - this.height / 2 - this.camera.y) * 0.1;

    // Check Game Over
    if (this.player.isDead) {
      this.onGameOver(Math.floor(this.player.area));
    }
  }

  updateAI(enemy: Entity) {
    enemy.update();

    if (enemy.aiTimer > 0) {
        enemy.aiTimer--;
    } else {
        enemy.aiTimer = 30 + Math.random() * 60; // Change direction every 0.5s to 1.5s
        
        // Default: Random move
        const speed = Math.min(5, Math.max(1.5, 300 / enemy.size));
        const angle = Math.random() * Math.PI * 2;
        enemy.targetVx = Math.cos(angle) * speed;
        enemy.targetVy = Math.sin(angle) * speed;

        // 30% chance to chase or flee
        if (Math.random() < 0.3) {
            let closest: Entity | null = null;
            let minDist = 500; // Awareness range

            // Simple: only interact with player for AI decisions to keep performance up
            const distToPlayer = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
            if (distToPlayer < minDist) {
                closest = this.player;
                minDist = distToPlayer;
            }

            if (closest) {
                const ratio = closest.size / enemy.size;
                const dx = closest.x - enemy.x;
                const dy = closest.y - enemy.y;
                const len = Math.hypot(dx, dy);

                if (len > 0) {
                    if (ratio < 1 / this.absorbThreshold) {
                        // Chase smaller
                        enemy.targetVx = (dx / len) * speed * 1.2;
                        enemy.targetVy = (dy / len) * speed * 1.2;
                    } else if (ratio > this.absorbThreshold) {
                        // Flee larger
                        enemy.targetVx = -(dx / len) * speed * 1.2;
                        enemy.targetVy = -(dy / len) * speed * 1.2;
                    }
                }
            }
        }
    }

    // Apply target velocity smoothly
    enemy.vx += (enemy.targetVx - enemy.vx) * 0.1;
    enemy.vy += (enemy.targetVy - enemy.vy) * 0.1;

    // Keep in bounds
    if (enemy.x < 0) { enemy.x = 0; enemy.vx *= -1; enemy.targetVx *= -1; }
    if (enemy.x > this.worldSize - enemy.size) { enemy.x = this.worldSize - enemy.size; enemy.vx *= -1; enemy.targetVx *= -1; }
    if (enemy.y < 0) { enemy.y = 0; enemy.vy *= -1; enemy.targetVy *= -1; }
    if (enemy.y > this.worldSize - enemy.size) { enemy.y = this.worldSize - enemy.size; enemy.vy *= -1; enemy.targetVy *= -1; }
  }

  isOverlapping(a: Entity, b: Entity) {
    return a.x < b.x + b.size &&
           a.x + a.size > b.x &&
           a.y < b.y + b.size &&
           a.y + a.size > b.y;
  }

  checkBlockCollision(a: Entity, b: Entity) {
    if (!this.isOverlapping(a, b)) return;

    // Centers
    const cxA = a.x + a.size / 2;
    const cyA = a.y + a.size / 2;
    const cxB = b.x + b.size / 2;
    const cyB = b.y + b.size / 2;

    const dx = cxB - cxA;
    const dy = cyB - cyA;

    const overlapX = (a.size + b.size) / 2 - Math.abs(dx);
    const overlapY = (a.size + b.size) / 2 - Math.abs(dy);

    if (overlapX > 0 && overlapY > 0) {
      const big = a.size > b.size ? a : b;
      const small = a.size > b.size ? b : a;
      const ratio = big.size / small.size;

      if (ratio >= this.absorbThreshold) {
        // Instant Absorb
        big.addArea(small.area);
        small.isDead = true;
        if (big === this.player) this.onScoreUpdate(Math.floor(this.player.area));
      } else {
        // Bump!
        // Resolve position to prevent sticking and push away vigorously
        if (overlapX < overlapY) {
          const dir = Math.sign(dx) || 1;
          a.x -= (overlapX / 2) * dir;
          b.x += (overlapX / 2) * dir;
          a.vx -= dir * 8;
          b.vx += dir * 8;
        } else {
          const dir = Math.sign(dy) || 1;
          a.y -= (overlapY / 2) * dir;
          b.y += (overlapY / 2) * dir;
          a.vy -= dir * 8;
          b.vy += dir * 8;
        }

        // Drop particles on bump unconditionally
        const massLoss = small.area * this.bumpPenalty;
        if (small.targetSize > 15) {
          small.removeArea(massLoss);
          this.spawnDropParticles(small, big, massLoss);
          if (small === this.player) this.onScoreUpdate(Math.floor(this.player.area));
        } else {
           // Too small after bump, dies
           big.addArea(small.area);
           small.isDead = true;
           if (big === this.player) this.onScoreUpdate(Math.floor(this.player.area));
        }
      }
    }
  }

  spawnDropParticles(source: Entity, hitter: Entity, area: number) {
    const particleArea = 12 * 12; // area of size 12 particle
    // Always spawn at least 1 particle on bump so it's visually clear
    const count = Math.max(1, Math.min(10, Math.floor(area / particleArea)));
    
    for (let i = 0; i < count; i++) {
      // Scatter away from the hitter aggressively
      const angle = Math.atan2(source.y - hitter.y, source.x - hitter.x) + (Math.random() - 0.5) * 1.5;
      const speed = 8 + Math.random() * 6;
      
      const p = new Entity(
        source.x + source.size / 2 - 6, 
        source.y + source.size / 2 - 6, 
        12, 
        'particle', 
        '#86efac'
      );
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      this.particles.push(p);
    }
  }

  draw() {
    // Clear background
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Draw Grid (Floor)
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = 2;
    const gridSize = 100;
    const startX = Math.floor(this.camera.x / gridSize) * gridSize;
    const startY = Math.floor(this.camera.y / gridSize) * gridSize;
    
    this.ctx.beginPath();
    for (let x = startX; x < startX + this.width + gridSize; x += gridSize) {
      this.ctx.moveTo(x, this.camera.y);
      this.ctx.lineTo(x, this.camera.y + this.height);
    }
    for (let y = startY; y < startY + this.height + gridSize; y += gridSize) {
      this.ctx.moveTo(this.camera.x, y);
      this.ctx.lineTo(this.camera.x + this.width, y);
    }
    this.ctx.stroke();

    // World bounds
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 10;
    this.ctx.strokeRect(0, 0, this.worldSize, this.worldSize);

    // Sort entities by Y coordinate
    const allObjects = [...this.particles, ...this.entities, this.player];
    allObjects.sort((a, b) => (a.y + a.size) - (b.y + b.size));

    // Draw Flat 2D Blocks
    for (const obj of allObjects) {
      if (obj.isDead) continue;
      
      let color = obj.color;
      
      // Dynamic coloring for AI relative to player size
      if (obj.type === 'enemy') {
        const ratio = obj.size / this.player.size;
        if (ratio < 1 / this.absorbThreshold) {
          color = '#22c55e'; // Green - can be easily eaten
        } else if (ratio > this.absorbThreshold) {
          color = '#ef4444'; // Red - danger, will eat you
        } else {
          color = '#eab308'; // Yellow - similar size, bump
        }
      }

      draw2DBlock(this.ctx, obj.x, obj.y, obj.size, color, obj.bounceZ);
    }

    this.ctx.restore();

    // Draw Joystick Overlay
    if (this.joystick.active) {
      this.ctx.save();
      
      // Base
      this.ctx.beginPath();
      this.ctx.arc(this.joystick.baseX, this.joystick.baseY, this.joystick.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.fill();
      this.ctx.stroke();

      // Knob
      this.ctx.beginPath();
      this.ctx.arc(this.joystick.knobX, this.joystick.knobY, this.joystick.radius * 0.5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.fill();

      this.ctx.restore();
    }
  }
}
