import { GRID, SNAKES, LADDERS } from './engine.js';

const COLORS = {
  cellLight: '#F0DEB4',
  cellDark: '#E3CDA0',
  cellStroke: '#C4A96A',
  number: '#8B7355',
  snakeBody: '#8B2500',
  snakeAccent: '#A0522D',
  ladderRail: '#6B4226',
  ladderRung: '#8B5E3C',
};

export class BoardRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.size = 0;
    this.cs = 0; // cell size
    this.dpr = 1;
  }

  resize(containerWidth) {
    const size = Math.floor(containerWidth);
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.size = size;
    this.cs = size / GRID;
  }

  cellCenter(pos) {
    if (pos <= 0) return { x: -50, y: this.size + 30 };
    const p = pos - 1;
    const row = Math.floor(p / GRID);
    const col = row % 2 === 0 ? p % GRID : (GRID - 1) - (p % GRID);
    return {
      x: col * this.cs + this.cs / 2,
      y: (GRID - 1 - row) * this.cs + this.cs / 2
    };
  }

  drawBoard() {
    const { ctx, cs, size } = this;
    ctx.clearRect(0, 0, size, size);

    for (let i = 0; i < GRID * GRID; i++) {
      const pos = i + 1;
      const row = Math.floor(i / GRID);
      const col = row % 2 === 0 ? i % GRID : (GRID - 1) - (i % GRID);
      const x = col * cs;
      const y = (GRID - 1 - row) * cs;

      const isLight = (row + col) % 2 === 0;
      ctx.fillStyle = isLight ? COLORS.cellLight : COLORS.cellDark;
      ctx.fillRect(x, y, cs, cs);

      ctx.strokeStyle = COLORS.cellStroke;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cs, cs);

      // Highlight snake/ladder cells
      if (SNAKES[pos]) {
        ctx.fillStyle = 'rgba(139,37,0,0.07)';
        ctx.fillRect(x, y, cs, cs);
      } else if (LADDERS[pos]) {
        ctx.fillStyle = 'rgba(200,169,81,0.10)';
        ctx.fillRect(x, y, cs, cs);
      }

      // Cell number with backing for readability
      const numText = String(pos);
      ctx.font = `600 ${cs * 0.19}px 'Spectral', serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const tm = ctx.measureText(numText);
      const nx = x + cs / 2;
      const ny = y + cs * 0.06;
      // Subtle backing
      ctx.fillStyle = isLight ? 'rgba(240,222,180,0.75)' : 'rgba(227,205,160,0.75)';
      ctx.fillRect(nx - tm.width / 2 - 2, ny - 1, tm.width + 4, cs * 0.22);
      ctx.fillStyle = COLORS.number;
      ctx.fillText(numText, nx, ny);
    }
  }

  drawLadders() {
    const { ctx, cs } = this;
    Object.entriesoL (LADDERS).forEach(([bot, top]) => {
      const a = this.cellCenter(parseInt(bot));
      const b = this.cellCenter(parseInt(top));
      this._drawLadder(ctx, a, b, cs);
    });
  }

  _drawLadder(ctx, from, to, cs) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const perpX = (-dy / len) * cs * 0.13;
    const perpY = (dx / len) * cs * 0.13;

    const railA1 = { x: from.x + perpX, y: from.y + perpY };
    const railA2 = { x: to.x + perpX, y: to.y + perpY };
    const railB1 = { x: from.x - perpX, y: from.y - perpY };
    const railB2 = { x: to.x - perpX, y: to.y - perpY };

    ctx.strokeStyle = COLORS.ladderRail;
    ctx.lineWidth = cs * 0.045;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(railA1.x, railA1.y);
    ctx.lineTo(railA2.x, railA2.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(railB1.x, railB1.y);
    ctx.lineTo(railB2.x, railB2.y);
    ctx.stroke();

    const rungCount = Math.max(3, Math.floor(len / (cs * 0.5)));
    ctx.strokeStyle = COLORS.ladderRung;
    ctx.lineWidth = cs * 0.03;
    for (let i = 1; i < rungCount; i++) {
      const t = i / rungCount;
      const rx1 = railA1.x + (railA2.x - railA1.x) * t;
      const ry1 = railA1.y + (railA2.y - railA1.y) * t;
      const rx2 = railB1.x + (railB2.x - railB1.x) * t;
    const ry2 = railB1.y + (railB2.y - railB1.y) * t;
      ctx.beginPath();
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx2, ry2);
      ctx.stroke();
    }
  }
}