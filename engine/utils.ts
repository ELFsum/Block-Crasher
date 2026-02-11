export function shadeColor(color: string, percent: number): string {
  let R = parseInt(color.substring(1, 3), 16);
  let G = parseInt(color.substring(3, 5), 16);
  let B = parseInt(color.substring(5, 7), 16);

  R = Math.round(R * (100 + percent) / 100);
  G = Math.round(G * (100 + percent) / 100);
  B = Math.round(B * (100 + percent) / 100);

  R = Math.min(255, Math.max(0, R));
  G = Math.min(255, Math.max(0, G));
  B = Math.min(255, Math.max(0, B));

  const RR = R.toString(16).length === 1 ? "0" + R.toString(16) : R.toString(16);
  const GG = G.toString(16).length === 1 ? "0" + G.toString(16) : G.toString(16);
  const BB = B.toString(16).length === 1 ? "0" + B.toString(16) : B.toString(16);

  return "#" + RR + GG + BB;
}

export function lerp(start: number, end: number, amt: number): number {
  return (1 - amt) * start + amt * end;
}

export function draw2DBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  popEffect: number = 0
) {
  const drawSize = size + popEffect;
  const drawX = x - popEffect / 2;
  const drawY = y - popEffect / 2;

  // Top Face (Flat 2D)
  ctx.fillStyle = color;
  ctx.fillRect(drawX, drawY, drawSize, drawSize);
  
  // Outer Border for crispness
  ctx.strokeStyle = shadeColor(color, -40);
  ctx.lineWidth = Math.max(2, size * 0.05); // Scale border slightly with size
  ctx.strokeRect(drawX, drawY, drawSize, drawSize);
}
