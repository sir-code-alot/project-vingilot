/**
 * Enkel stjärnbild – stjärnor med position och ljusstyrka.
 * Genereras om vid resize så att skärmen alltid är täckt.
 */
export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinklePhase: number;
}

const STAR_COUNT = 180;
const TWINKLE_SPEED = 1.5;

export function createStarfield(width: number, height: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() < 0.15 ? 1.5 : 0.8,
      brightness: 0.4 + Math.random() * 0.6,
      twinklePhase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function drawStarfield(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  _width: number,
  _height: number,
  time: number
): void {
  for (const star of stars) {
    const twinkle = 0.7 + 0.3 * Math.sin(time * TWINKLE_SPEED + star.twinklePhase);
    const alpha = star.brightness * twinkle;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Uppdatera stjärnpositioner vid resize (wrap så de fortfarande täcker skärmen). */
export function resizeStarfield(stars: Star[], width: number, height: number): void {
  for (const star of stars) {
    star.x = star.x % width;
    star.y = star.y % height;
    if (star.x < 0) star.x += width;
    if (star.y < 0) star.y += height;
  }
}
