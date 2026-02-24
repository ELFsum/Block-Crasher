import { Entity } from './Entity';
import { draw2DBlock } from './utils';
import { InputState } from '../types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class GameCore {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  
  player: Entity;
  entities: Entity[] = [];
  particles: Entity[] = [];
  walls: Rect[] = []; 
  
  camera: { x: number, y: number, scale: number } = { x: 1500, y: 1500, scale: 1 };
  worldSize = 3000;
  
  expansionCount = 0;
  nextExpandSize = 80;
  
  onGameOver: (score: number, reason: 'DEVOURED' | 'TIMEUP') => void;
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
  
  absorbThreshold = 1.6; 
  bumpPenalty = 0.05; 

  gameDuration: number = 180; // 3 minutes in seconds
  startTime: number = 0;
  lastTimeStr: string = "";

  constructor(
    canvas: HTMLCanvasElement, 
    onGameOver: (score: number, reason: 'DEVOURED' | 'TIMEUP') => void, 
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
    this.worldSize = 3000;
    this.expansionCount = 0;
    this.nextExpandSize = 80;
    this.camera = { x: this.worldSize / 2, y: this.worldSize / 2, scale: 1 };
    
    this.generateWalls();

    this.entities = [];
    this.particles = [];
    this.player = new Entity(this.worldSize / 2, this.worldSize / 2, 40, 'player', '#3b82f6');
    
    this.startTime = Date.now();
    this.lastTimeStr = "03:00";
    this.onTimeUpdate(this.lastTimeStr);

    for (let i = 0; i < 60; i++) {
      this.spawnEnemy();
    }
    
    for (let i = 0; i < 100; i++) {
      this.spawnFood();
    }
  }

  generateWalls() {
    this.walls = [];
    const ws = this.worldSize;
    const thickness = ws * 0.15; 
    const len = ws * 0.35; 

    this.walls.push({x: 0, y: 0, w: len, h: thickness});
    this.walls.push({x: 0, y: 0, w: thickness, h: len});
    this.walls.push({x: ws - len, y: 0, w: len, h: thickness});
    this.walls.push({x: ws - thickness, y: 0, w: thickness, h: len});
    this.walls.push({x: 0, y: ws - thickness, w: len, h: thickness});
    this.walls.push({x: 0, y: ws - len, w: thickness, h: len});
    this.walls.push({x: ws - len, y: ws - thickness, w: len, h: thickness});
    this.walls.push({x: ws - thickness, y: ws - len, w: thickness, h: len});
  }

  isRectInWall(rx: number, ry: number, rsize: number) {
    for (const w of this.walls) {
      if (rx < w.x + w.w && rx + rsize > w.x && ry < w.y + w.h && ry + rsize > w.y) {
        return true;
      }
    }
    return false;
  }

  getSafeSpawnPos(): { x: number, y: number } {
    let x = 0, y = 0, dist = 0;
    let attempts = 0;
    const screenDiag = Math.sqrt(this.width * this.width + this.height * this.height);
    const safeDistance = (screenDiag / this.camera.scale) * 0.6 + (this.player ? this.player.size : 0);
    
    do {
      x = Math.random() * (this.worldSize - 60);
      y = Math.random() * (this.worldSize - 60);
      
      if (this.isRectInWall(x, y, 60)) {
        dist = 0;
        attempts++;
        continue;
      }

      if (this.player) {
        const dx = x - (this.player.x + this.player.size / 2);
        const dy = y - (this.player.y + this.player.size / 2);
        dist = Math.sqrt(dx * dx + dy * dy);
      } else {
        dist = safeDistance + 1;
      }
      
      attempts++;
    } while (dist < safeDistance && attempts < 50); 
    
    return { x, y };
  }

  spawnEnemy() {
    const { x, y } = this.getSafeSpawnPos();
    const difficulty = Math.min(1.0, this.expansionCount / 10); 
    const power = Math.max(0.5, 2.0 - (difficulty * 1.5)); 
    const r = Math.pow(Math.random(), power);

    const minScale = 0.4 + (difficulty * 0.4); 
    const maxScale = 1.3 + (difficulty * 1.5); 

    const scaleFactor = minScale + (r * (maxScale - minScale));
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

  expandWorld() {
    const factor = 1.5;
    const prevCenterX = this.player.x + this.player.size / 2;
    const prevCenterY = this.player.y + this.player.size / 2;
    const offsetX = this.camera.x - prevCenterX;
    const offsetY = this.camera.y - prevCenterY;

    this.worldSize *= factor;
    this.nextExpandSize *= factor;
    this.expansionCount++;

    const scaleObj = (obj: any) => {
      obj.x *= factor;
      obj.y *= factor;
      if (obj.vx !== undefined) obj.vx *= factor;
      if (obj.vy !== undefined) obj.vy *= factor;
      if (obj.targetVx !== undefined) obj.targetVx *= factor;
      if (obj.targetVy !== undefined) obj.targetVy *= factor;
      if (obj.w !== undefined) obj.w *= factor;
      if (obj.h !== undefined) obj.h *= factor;
    };

    this.entities.forEach(scaleObj);
    this.particles.forEach(scaleObj);
    this.walls.forEach(scaleObj);
    scaleObj(this.player);

    const newCenterX = this.player.x + this.player.size / 2;
    const newCenterY = this.player.y + this.player.size / 2;
    this.camera.x = newCenterX + offsetX;
    this.camera.y = newCenterY + offsetY;

    const spawnCount = Math.floor(15 * factor);
    for(let i=0; i<spawnCount; i++) this.spawnEnemy();
    for(let i=0; i<spawnCount * 2; i++) this.spawnFood();
  }

  constrainToBoundsAndWalls(e: Entity, isParticle: boolean) {
    if (e.x < 0) { e.x = 0; if (isParticle) { e.vx *= -0.8; } else { e.vx *= -0.5; if (e.type === 'enemy') e.targetVx *= -1; } }
    if (e.y < 0) { e.y = 0; if (isParticle) { e.vy *= -0.8; } else { e.vy *= -0.5; if (e.type === 'enemy') e.targetVy *= -1; } }
    if (e.x > this.worldSize - e.size) { e.x = this.worldSize - e.size; if (isParticle) { e.vx *= -0.8; } else { e.vx *= -0.5; if (e.type === 'enemy') e.targetVx *= -1; } }
    if (e.y > this.worldSize - e.size) { e.y = this.worldSize - e.size; if (isParticle) { e.vy *= -0.8; } else { e.vy *= -0.5; if (e.type === 'enemy') e.targetVy *= -1; } }

    for (const w of this.walls) {
      if (e.x < w.x + w.w && e.x + e.size > w.x && e.y < w.y + w.h && e.y + e.size > w.y) {
        const cxE = e.x + e.size / 2;
        const cyE = e.y + e.size / 2;
        const cxW = w.x + w.w / 2;
        const cyW = w.y + w.h / 2;
        const dx = cxE - cxW;
        const dy = cyE - cyW;
        const overlapX = (e.size + w.w) / 2 - Math.abs(dx);
        const overlapY = (e.size + w.h) / 2 - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            const dir = Math.sign(dx) || 1;
            e.x += overlapX * dir;
            if (isParticle) { e.vx *= -0.8; } else { e.vx *= 0.5; if (e.type === 'enemy') e.targetVx *= -1; }
          } else {
            const dir = Math.sign(dy) || 1;
            e.y += overlapY * dir;
            if (isParticle) { e.vy *= -0.8; } else { e.vy *= 0.5; if (e.type === 'enemy') e.targetVy *= -1; }
          }
        }
      }
    }
  }

  update() {
    if (this.player.isDead) return;

    // Countdown Logic
    const now = Date.now();
    const elapsedSeconds = (now - this.startTime) / 1000;
    const remainingSeconds = Math.max(0, this.gameDuration - elapsedSeconds);
    
    const min = Math.floor(remainingSeconds / 60).toString().padStart(2, '0');
    const sec = Math.floor(remainingSeconds % 60).toString().padStart(2, '0');
    const currentTimerStr = `${min}:${sec}`;
    
    if (currentTimerStr !== this.lastTimeStr) {
      this.lastTimeStr = currentTimerStr;
      this.onTimeUpdate(currentTimerStr);
    }

    if (remainingSeconds <= 0) {
      this.onGameOver(Math.floor(this.player.area), 'TIMEUP');
      return;
    }

    if (this.player.targetSize >= this.nextExpandSize) {
       this.expandWorld();
    }

    const speedMult = Math.pow(1.25, this.expansionCount);
    const sizeScale = Math.pow(this.player.size / 40, 0.5); 
    const clampedMax = 7 * sizeScale * speedMult;
    const accel = 0.9 * sizeScale * speedMult;
    
    let inputX = 0, inputY = 0;
    if (this.input.left) inputX -= 1;
    if (this.input.right) inputX += 1;
    if (this.input.up) inputY -= 1;
    if (this.input.down) inputY += 1;

    const inputMag = Math.sqrt(inputX * inputX + inputY * inputY);
    if (inputMag > 0) { inputX /= inputMag; inputY /= inputMag; }
    if (this.joystick.active) { inputX = this.joystick.dirX; inputY = this.joystick.dirY; }

    this.player.vx += inputX * accel;
    this.player.vy += inputY * accel;
    const velMag = Math.sqrt(this.player.vx ** 2 + this.player.vy ** 2);
    if (velMag > clampedMax) { this.player.vx = (this.player.vx / velMag) * clampedMax; this.player.vy = (this.player.vy / velMag) * clampedMax; }

    this.player.update();
    this.entities.forEach(e => this.updateAI(e));
    this.particles.forEach(p => p.update());
    this.constrainToBoundsAndWalls(this.player, false);
    this.entities.forEach(e => this.constrainToBoundsAndWalls(e, false));
    this.particles.forEach(p => this.constrainToBoundsAndWalls(p, true));

    const allCollidables = [this.player, ...this.entities];
    for (let i = 0; i < allCollidables.length; i++) {
      const a = allCollidables[i];
      if (a.isDead) continue;
      for (let j = i + 1; j < allCollidables.length; j++) {
        const b = allCollidables[j];
        if (b.isDead) continue;
        this.checkBlockCollision(a, b);
      }
      for (let p of this.particles) {
        if (p.isDead || p.age < 15) continue; 
        if (this.isOverlapping(a, p)) {
          a.addArea(p.area);
          p.isDead = true;
          if (a === this.player) this.onScoreUpdate(Math.floor(this.player.area));
        }
      }
    }

    this.entities = this.entities.filter(e => !e.isDead);
    this.particles = this.particles.filter(p => !p.isDead);

    const targetEnemies = 50 + this.expansionCount * 5;
    if (this.entities.length < targetEnemies) this.spawnEnemy();
    const targetFood = 100 + this.expansionCount * 10;
    if (this.particles.length < targetFood) this.spawnFood();

    const targetX = this.player.x + this.player.size / 2;
    const targetY = this.player.y + this.player.size / 2;
    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;
    const targetScale = Math.max(0.01, 45 / this.player.size);
    this.camera.scale += (targetScale - this.camera.scale) * 0.05;

    if (this.player.isDead) {
      this.onGameOver(Math.floor(this.player.area), 'DEVOURED');
    }
  }

  updateAI(enemy: Entity) {
    const speedMult = Math.pow(1.25, this.expansionCount);
    const sizeScale = Math.pow(enemy.size / 40, 0.5);
    const maxMultiplier = 1.6 + (this.expansionCount * 0.15); 
    const maxSize = Math.max(60, this.player.targetSize * maxMultiplier);
    if (enemy.targetSize > maxSize) enemy.targetSize -= 0.1; 

    enemy.update();
    if (enemy.aiTimer > 0) {
        enemy.aiTimer--;
    } else {
        enemy.aiTimer = 30 + Math.random() * 60;
        const baseSpeed = 5 * sizeScale * speedMult;
        const angle = Math.random() * Math.PI * 2;
        enemy.targetVx = Math.cos(angle) * baseSpeed;
        enemy.targetVy = Math.sin(angle) * baseSpeed;

        if (Math.random() < 0.3) {
            let closest: Entity | null = null;
            let minDist = 500 * speedMult; 
            const distToPlayer = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
            if (distToPlayer < minDist) { closest = this.player; minDist = distToPlayer; }
            if (closest) {
                const ratio = closest.size / enemy.size;
                const dx = closest.x - enemy.x;
                const dy = closest.y - enemy.y;
                const len = Math.hypot(dx, dy);
                if (len > 0) {
                    if (ratio < 1 / this.absorbThreshold) {
                        enemy.targetVx = (dx / len) * baseSpeed * 1.3;
                        enemy.targetVy = (dy / len) * baseSpeed * 1.3;
                    } else if (ratio > this.absorbThreshold) {
                        enemy.targetVx = -(dx / len) * baseSpeed * 1.3;
                        enemy.targetVy = -(dy / len) * baseSpeed * 1.3;
                    }
                }
            }
        }
    }
    enemy.vx += (enemy.targetVx - enemy.vx) * 0.1;
    enemy.vy += (enemy.targetVy - enemy.vy) * 0.1;
  }

  isOverlapping(a: Entity, b: Entity) {
    return a.x < b.x + b.size && a.x + a.size > b.x && a.y < b.y + b.size && a.y + a.size > b.y;
  }

  checkBlockCollision(a: Entity, b: Entity) {
    if (!this.isOverlapping(a, b)) return;
    const cxA = a.x + a.size / 2, cyA = a.y + a.size / 2;
    const cxB = b.x + b.size / 2, cyB = b.y + b.size / 2;
    const dx = cxB - cxA, dy = cyB - cyA;
    const overlapX = (a.size + b.size) / 2 - Math.abs(dx);
    const overlapY = (a.size + b.size) / 2 - Math.abs(dy);

    if (overlapX > 0 && overlapY > 0) {
      const big = a.size > b.size ? a : b;
      const small = a.size > b.size ? b : a;
      const ratio = big.size / small.size;

      if (ratio >= this.absorbThreshold) {
        big.addArea(small.area);
        small.isDead = true;
        if (big === this.player) this.onScoreUpdate(Math.floor(this.player.area));
      } else {
        const speedMult = Math.pow(1.25, this.expansionCount);
        const avgSize = (a.size + b.size) / 2;
        const avgSizeScale = Math.pow(avgSize / 40, 0.5); 
        const totalArea = big.area + small.area;
        const bigRatio = small.area / totalArea; 
        const smallRatio = big.area / totalArea; 
        const baseBounceSpeed = 24 * avgSizeScale * speedMult;
        const collisionAxis: 'x' | 'y' = overlapX < overlapY ? 'x' : 'y';

        if (collisionAxis === 'x') {
          const dir = Math.sign(dx) || 1;
          const moveA = a === big ? overlapX * bigRatio : overlapX * smallRatio;
          const moveB = b === big ? overlapX * bigRatio : overlapX * smallRatio;
          a.x -= moveA * dir; b.x += moveB * dir;
          const speedA = a === big ? baseBounceSpeed * bigRatio : baseBounceSpeed * smallRatio;
          const speedB = b === big ? baseBounceSpeed * bigRatio : baseBounceSpeed * smallRatio;
          a.vx -= dir * speedA; b.vx += dir * speedB;
        } else {
          const dir = Math.sign(dy) || 1;
          const moveA = a === big ? overlapY * bigRatio : overlapY * smallRatio;
          const moveB = b === big ? overlapY * bigRatio : overlapY * smallRatio;
          a.y -= moveA * dir; b.y += moveB * dir;
          const speedA = a === big ? baseBounceSpeed * bigRatio : baseBounceSpeed * smallRatio;
          const speedB = b === big ? baseBounceSpeed * bigRatio : baseBounceSpeed * smallRatio;
          a.vy -= dir * speedA; b.vy += dir * speedB;
        }

        const massLossSmall = small.area * this.bumpPenalty;
        const massLossBig = big.area * (this.bumpPenalty * 0.4); 
        if (small.area - massLossSmall > 225) {
          small.removeArea(massLossSmall);
          this.spawnDropParticles(small, big, massLossSmall, collisionAxis);
          if (small === this.player) this.onScoreUpdate(Math.floor(this.player.area));
          if (big.area - massLossBig > 225) {
            big.removeArea(massLossBig);
            this.spawnDropParticles(big, small, massLossBig, collisionAxis);
            if (big === this.player) this.onScoreUpdate(Math.floor(this.player.area));
          }
        } else {
           big.addArea(small.area);
           small.isDead = true;
           if (big === this.player) this.onScoreUpdate(Math.floor(this.player.area));
        }
      }
    }
  }

  spawnDropParticles(source: Entity, hitter: Entity, area: number, axis: 'x' | 'y') {
    const cxS = source.x + source.size / 2, cyS = source.y + source.size / 2;
    const cxH = hitter.x + hitter.size / 2, cyH = hitter.y + hitter.size / 2;
    let pushDir = 0, contactX = cxS, contactY = cyS;
    if (axis === 'x') { pushDir = Math.sign(cxH - cxS) || 1; contactX = cxS + pushDir * (source.size / 2); } 
    else { pushDir = Math.sign(cyH - cyS) || 1; contactY = cyS + pushDir * (source.size / 2); }

    const count = Math.max(2, Math.min(6, Math.floor(area / 40))); 
    const areaPerParticle = area / count;
    const particleSize = Math.max(4, Math.sqrt(areaPerParticle)); 
    const speedMult = Math.pow(1.25, this.expansionCount);
    const sizeScale = Math.pow(source.size / 40, 0.5);
    
    for (let i = 0; i < count; i++) {
      const p = new Entity(contactX - particleSize / 2, contactY - particleSize / 2, particleSize, 'particle', '#86efac');
      const baseSpeed = (6 + Math.random() * 6) * sizeScale * speedMult;
      const sideDir = (i % 2 === 0 ? 1 : -1) * (0.8 + Math.random() * 0.4);
      const bounceBack = -pushDir * (0.3 + Math.random() * 0.5);
      if (axis === 'x') { p.vx = bounceBack * baseSpeed; p.vy = sideDir * baseSpeed; } 
      else { p.vx = sideDir * baseSpeed; p.vy = bounceBack * baseSpeed; }
      this.particles.push(p);
    }
  }

  draw() {
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.save();
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this.camera.scale, this.camera.scale);
    this.ctx.translate(-this.camera.x, -this.camera.y);
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = Math.max(2, 2 / this.camera.scale);
    
    let baseGrid = 100;
    while (baseGrid * this.camera.scale < 50) baseGrid *= 2; 
    const gridSize = baseGrid;
    const visibleLeft = this.camera.x - (this.width / 2) / this.camera.scale;
    const visibleRight = this.camera.x + (this.width / 2) / this.camera.scale;
    const visibleTop = this.camera.y - (this.height / 2) / this.camera.scale;
    const visibleBottom = this.camera.y + (this.height / 2) / this.camera.scale;
    const startX = Math.floor(visibleLeft / gridSize) * gridSize;
    const startY = Math.floor(visibleTop / gridSize) * gridSize;
    
    this.ctx.beginPath();
    for (let x = startX; x <= visibleRight + gridSize; x += gridSize) { this.ctx.moveTo(x, visibleTop); this.ctx.lineTo(x, visibleBottom); }
    for (let y = startY; y <= visibleBottom + gridSize; y += gridSize) { this.ctx.moveTo(visibleLeft, y); this.ctx.lineTo(visibleRight, y); }
    this.ctx.stroke();

    this.ctx.fillStyle = '#0f172a';
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = Math.max(10, 5 / this.camera.scale);
    this.ctx.strokeRect(0, 0, this.worldSize, this.worldSize);
    for (const w of this.walls) { this.ctx.fillRect(w.x, w.y, w.w, w.h); this.ctx.strokeRect(w.x, w.y, w.w, w.h); }

    const allObjects = [...this.particles, ...this.entities, this.player];
    allObjects.sort((a, b) => (a.y + a.size) - (b.y + b.size));
    for (const obj of allObjects) {
      if (obj.isDead) continue;
      let color = obj.color;
      if (obj.type === 'enemy') {
        const ratio = obj.size / this.player.size;
        if (ratio < 1 / this.absorbThreshold) color = '#22c55e';
        else if (ratio > this.absorbThreshold) color = '#ef4444';
        else color = '#eab308';
      }
      draw2DBlock(this.ctx, obj.x, obj.y, obj.size, color, obj.bounceZ);
    }
    this.ctx.restore();

    if (this.joystick.active) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(this.joystick.baseX, this.joystick.baseY, this.joystick.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.fill(); this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(this.joystick.knobX, this.joystick.knobY, this.joystick.radius * 0.5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.fill();
      this.ctx.restore();
    }
  }
}
