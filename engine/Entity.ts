import { lerp } from './utils';

export class Entity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  targetSize: number;
  color: string;
  isDead: boolean;
  type: 'player' | 'enemy' | 'particle';
  bounceZ: number;
  targetVx: number = 0;
  targetVy: number = 0;
  aiTimer: number = 0;
  age: number = 0;

  constructor(x: number, y: number, size: number, type: 'player' | 'enemy' | 'particle', color: string) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.size = size;
    this.targetSize = size;
    this.type = type;
    this.color = color;
    this.isDead = false;
    this.bounceZ = 0;
    this.age = 0;
  }

  get area() {
    return this.targetSize * this.targetSize;
  }

  addArea(amount: number) {
    const newArea = this.area + amount;
    this.targetSize = Math.sqrt(newArea);
  }

  removeArea(amount: number) {
    const newArea = Math.max(25, this.area - amount); // Min area
    this.targetSize = Math.sqrt(newArea);
    this.bounceZ = 10; // Visual pop when losing mass
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Friction
    this.vx *= 0.88;
    this.vy *= 0.88;

    // Smooth size interpolation
    this.size = lerp(this.size, this.targetSize, 0.1);

    // Bounce pop effect
    if (this.bounceZ > 0) {
      this.bounceZ -= 1;
    }

    this.age++;
  }
}
