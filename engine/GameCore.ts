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
  
  camera: { x: number, y: number, scale: number } = { x: 1500, y: 1500, scale: 1 };
  worldSize = 3000;
  
  // 膨胀机制参数
  expansionCount = 0;
  nextExpandSize = 80;
  
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
    this.worldSize = 3000;
    this.expansionCount = 0;
    this.nextExpandSize = 80;
    this.camera = { x: this.worldSize / 2, y: this.worldSize / 2, scale: 1 };
    
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
    
    for (let i = 0; i < 100; i++) {
      this.spawnFood();
    }
  }

  getSafeSpawnPos(): { x: number, y: number } {
    let x = 0, y = 0, dist = 0;
    let attempts = 0;
    // 镜头变大时，可视范围更广，因此安全距离必须跟缩放比例挂钩，防止刷脸
    const screenDiag = Math.sqrt(this.width * this.width + this.height * this.height);
    const safeDistance = (screenDiag / this.camera.scale) * 0.6 + (this.player ? this.player.size : 0);
    
    do {
      x = Math.random() * this.worldSize;
      y = Math.random() * this.worldSize;
      
      if (this.player) {
        const dx = x - (this.player.x + this.player.size / 2);
        const dy = y - (this.player.y + this.player.size / 2);
        dist = Math.sqrt(dx * dx + dy * dy);
      } else {
        dist = safeDistance + 1;
      }
      
      attempts++;
    } while (dist < safeDistance && attempts < 20); 
    
    return { x, y };
  }

  spawnEnemy() {
    const { x, y } = this.getSafeSpawnPos();
    
    // 难度：随着膨胀次数增加，逐渐提升大体积方块生成的概率
    const difficulty = Math.min(1.0, this.expansionCount / 10); 
    
    // 控制随机分布曲线。早期重度偏向生成小方块(power=2)，后期趋于平均甚至更偏向大方块(power=0.5)
    const power = Math.max(0.5, 2.0 - (difficulty * 1.5)); 
    const r = Math.pow(Math.random(), power);

    const minScale = 0.4 + (difficulty * 0.4); // 下限：0.4x -> 0.8x
    const maxScale = 1.3 + (difficulty * 1.5); // 上限：1.3x -> 2.8x

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
    this.worldSize *= factor;
    this.nextExpandSize *= factor;
    this.expansionCount++;

    // 缩放函数：按比例拉开所有实体的距离，同时同步放大速度表现
    const scaleObj = (obj: Entity) => {
      obj.x *= factor;
      obj.y *= factor;
      obj.vx *= factor;
      obj.vy *= factor;
      obj.targetVx *= factor;
      obj.targetVy *= factor;
    };

    this.entities.forEach(scaleObj);
    this.particles.forEach(scaleObj);
    scaleObj(this.player);

    this.camera.x *= factor;
    this.camera.y *= factor;

    // 因为场地变大了，立刻额外刷新一些方块填补空缺
    const spawnCount = Math.floor(15 * factor);
    for(let i=0; i<spawnCount; i++) this.spawnEnemy();
    for(let i=0; i<spawnCount * 2; i++) this.spawnFood();
  }

  update() {
    if (this.player.isDead) return;

    // 检查世界是否需要按比例膨胀拉开距离
    if (this.player.targetSize >= this.nextExpandSize) {
       this.expandWorld();
    }

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - this.startTime) / 1000);
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
    const s = (elapsedSeconds % 60).toString().padStart(2, '0');
    const currentTimerStr = `${m}:${s}`;
    
    if (currentTimerStr !== this.lastTimeStr) {
      this.lastTimeStr = currentTimerStr;
      this.onTimeUpdate(currentTimerStr);
    }

    // 世界拉大后基础速度基数也要变大，保证移动手感
    const speedMult = Math.pow(1.5, this.expansionCount);
    const speed = (400 / this.player.size) * speedMult; 
    const maxSpeed = Math.max(2 * speedMult, speed);
    const clampedMax = Math.min(6 * speedMult, maxSpeed);
    
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

    this.player.vx += inputX * 1 * speedMult;
    this.player.vy += inputY * 1 * speedMult;

    const velMag = Math.sqrt(this.player.vx ** 2 + this.player.vy ** 2);
    if (velMag > clampedMax) {
      this.player.vx = (this.player.vx / velMag) * clampedMax;
      this.player.vy = (this.player.vy / velMag) * clampedMax;
    }

    this.player.update();
    this.entities.forEach(e => this.updateAI(e));
    this.particles.forEach(p => p.update());

    this.player.x = Math.max(0, Math.min(this.worldSize - this.player.size, this.player.x));
    this.player.y = Math.max(0, Math.min(this.worldSize - this.player.size, this.player.y));

    // Resolve Collisions
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
        if (p.isDead) continue;
        if (p.age < 15) continue; 
        
        if (this.isOverlapping(a, p)) {
          a.addArea(p.area);
          p.isDead = true;
          if (a === this.player) this.onScoreUpdate(Math.floor(this.player.area));
        }
      }
    }

    this.entities = this.entities.filter(e => !e.isDead);
    this.particles = this.particles.filter(p => !p.isDead);

    // 根据世界膨胀次数提高最大同屏容纳量
    const targetEnemies = 50 + this.expansionCount * 5;
    if (this.entities.length < targetEnemies) {
      this.spawnEnemy();
    }
    const targetFood = 100 + this.expansionCount * 10;
    if (this.particles.length < targetFood) {
      this.spawnFood();
    }

    // 平滑镜头追随
    const targetX = this.player.x + this.player.size / 2;
    const targetY = this.player.y + this.player.size / 2;
    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;
    
    // 动态缩放视野，保证玩家在屏幕上看起来大小总是45左右像素，彻底解决后期拥挤感
    const targetScale = Math.max(0.01, 45 / this.player.size);
    this.camera.scale += (targetScale - this.camera.scale) * 0.05;

    if (this.player.isDead) {
      this.onGameOver(Math.floor(this.player.area));
    }
  }

  updateAI(enemy: Entity) {
    const speedMult = Math.pow(1.5, this.expansionCount);
    
    // 平衡：防止AI无限滚雪球霸屏
    const maxMultiplier = 1.6 + (this.expansionCount * 0.15); // 后期允许出现比玩家大得多的庞然大物
    const maxSize = Math.max(60, this.player.targetSize * maxMultiplier);
    
    // 如果巨大化超过当前限制，则慢慢自我衰减缩水，防止一个无敌方块吞噬全局
    if (enemy.targetSize > maxSize) {
       enemy.targetSize -= 0.1; 
    }

    enemy.update();

    if (enemy.aiTimer > 0) {
        enemy.aiTimer--;
    } else {
        enemy.aiTimer = 30 + Math.random() * 60;
        
        const speed = Math.min(5 * speedMult, Math.max(1.5 * speedMult, 300 * speedMult / enemy.size));
        const angle = Math.random() * Math.PI * 2;
        enemy.targetVx = Math.cos(angle) * speed;
        enemy.targetVy = Math.sin(angle) * speed;

        if (Math.random() < 0.3) {
            let closest: Entity | null = null;
            let minDist = 500 * speedMult; 

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
                        enemy.targetVx = (dx / len) * speed * 1.2;
                        enemy.targetVy = (dy / len) * speed * 1.2;
                    } else if (ratio > this.absorbThreshold) {
                        enemy.targetVx = -(dx / len) * speed * 1.2;
                        enemy.targetVy = -(dy / len) * speed * 1.2;
                    }
                }
            }
        }
    }

    enemy.vx += (enemy.targetVx - enemy.vx) * 0.1;
    enemy.vy += (enemy.targetVy - enemy.vy) * 0.1;

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
        big.addArea(small.area);
        small.isDead = true;
        if (big === this.player) this.onScoreUpdate(Math.floor(this.player.area));
      } else {
        const speedMult = Math.pow(1.5, this.expansionCount);
        if (overlapX < overlapY) {
          const dir = Math.sign(dx) || 1;
          a.x -= (overlapX / 2) * dir;
          b.x += (overlapX / 2) * dir;
          a.vx -= dir * 8 * speedMult;
          b.vx += dir * 8 * speedMult;
        } else {
          const dir = Math.sign(dy) || 1;
          a.y -= (overlapY / 2) * dir;
          b.y += (overlapY / 2) * dir;
          a.vy -= dir * 8 * speedMult;
          b.vy += dir * 8 * speedMult;
        }

        const massLoss = small.area * this.bumpPenalty;
        if (small.targetSize > 15) {
          small.removeArea(massLoss);
          this.spawnDropParticles(small, big, massLoss);
          if (small === this.player) this.onScoreUpdate(Math.floor(this.player.area));
        } else {
           big.addArea(small.area);
           small.isDead = true;
           if (big === this.player) this.onScoreUpdate(Math.floor(this.player.area));
        }
      }
    }
  }

  spawnDropParticles(source: Entity, hitter: Entity, area: number) {
    const particleArea = 12 * 12;
    const count = Math.max(1, Math.min(10, Math.floor(area / particleArea)));
    const speedMult = Math.pow(1.5, this.expansionCount);
    
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(source.y - hitter.y, source.x - hitter.x) + (Math.random() - 0.5) * 1.5;
      const speed = (8 + Math.random() * 6) * speedMult;
      
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
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    
    // 基于屏幕中心进行缩放渲染
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(this.camera.scale, this.camera.scale);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // 绘制网格，为了防止无限拉远导致网格密集卡顿，动态调整网格基准尺寸
    this.ctx.strokeStyle = '#1e293b';
    this.ctx.lineWidth = Math.max(2, 2 / this.camera.scale);
    
    let baseGrid = 100;
    // 使得屏幕上显示的格子间距至少保持在 50 像素左右
    while (baseGrid * this.camera.scale < 50) {
        baseGrid *= 2; 
    }
    const gridSize = baseGrid;
    
    const visibleLeft = this.camera.x - (this.width / 2) / this.camera.scale;
    const visibleRight = this.camera.x + (this.width / 2) / this.camera.scale;
    const visibleTop = this.camera.y - (this.height / 2) / this.camera.scale;
    const visibleBottom = this.camera.y + (this.height / 2) / this.camera.scale;

    const startX = Math.floor(visibleLeft / gridSize) * gridSize;
    const startY = Math.floor(visibleTop / gridSize) * gridSize;
    
    this.ctx.beginPath();
    for (let x = startX; x <= visibleRight + gridSize; x += gridSize) {
      this.ctx.moveTo(x, visibleTop);
      this.ctx.lineTo(x, visibleBottom);
    }
    for (let y = startY; y <= visibleBottom + gridSize; y += gridSize) {
      this.ctx.moveTo(visibleLeft, y);
      this.ctx.lineTo(visibleRight, y);
    }
    this.ctx.stroke();

    // 绘制边界墙壁
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = Math.max(10, 5 / this.camera.scale);
    this.ctx.strokeRect(0, 0, this.worldSize, this.worldSize);

    const allObjects = [...this.particles, ...this.entities, this.player];
    allObjects.sort((a, b) => (a.y + a.size) - (b.y + b.size));

    for (const obj of allObjects) {
      if (obj.isDead) continue;
      
      let color = obj.color;
      
      if (obj.type === 'enemy') {
        const ratio = obj.size / this.player.size;
        if (ratio < 1 / this.absorbThreshold) {
          color = '#22c55e'; // 绿色 可食用
        } else if (ratio > this.absorbThreshold) {
          color = '#ef4444'; // 红色 危险
        } else {
          color = '#eab308'; // 黄色 同量级碰撞
        }
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
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(this.joystick.knobX, this.joystick.knobY, this.joystick.radius * 0.5, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.fill();

      this.ctx.restore();
    }
  }
}
