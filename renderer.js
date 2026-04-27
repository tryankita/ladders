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
    this.cs = 0;
    this.dpr = 1;
    this.snakes = SNAKES;
    this.ladders = LADDERS;
  }

  setBoard(snakes, ladders) {
      this.snakes = snakes;
      this.ladders = ladders;
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
    const snakes = this.snakes || {};
    const ladders = this.ladders || {};
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
      if (snakes[pos]) {
        ctx.fillStyle = 'rgba(139,37,0,0.07)';
        ctx.fillRect(x, y, cs, cs);
      } else if (ladders[pos]) {
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
    Object.entries(this.ladders || {}).forEach(([bot, top]) => {
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
  drawSnakes() {
    const { ctx, cs } = this;
    Object.entries(this.snakes || {}).forEach(([head, tail]) => {
      const from = this.cellCenter(parseInt(head));
      const to = this.cellCenter(parseInt(tail));
      this._drawSnake(ctx, from, to, cs);
    });
  }

  _drawSnake(ctx, from, to, cs) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const segs = Math.max(4, Math.floor(dist / (cs * 0.6)));

    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const bx = from.x + dx * t;
      const by = from.y + dy * t;
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const amp = cs * 0.25 * Math.sin(t * Math.PI);
      const wave = Math.sin(t * Math.PI * 2.5) * amp;
      pts.push({ x: bx + perpX * wave, y: by + perpY * wave });
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) / 2, (prev.y + cur.y) / 2);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.strokeStyle = 'rgba(80,20,0,0.2)';
    ctx.lineWidth = cs * 0.16;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) / 2, (prev.y + cur.y) / 2);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.strokeStyle = COLORS.snakeBody;
    ctx.lineWidth = cs * 0.10;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      ctx.quadraticCurveTo(prev.x, prev.y, (prev.x + cur.x) / 2, (prev.y + cur.y) / 2);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.strokeStyle = COLORS.snakeAccent;
    ctx.lineWidth = cs * 0.04;
    ctx.setLineDash([cs * 0.08, cs * 0.06]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(from.x, from.y, cs * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.snakeBody;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(from.x - cs * 0.03, from.y - cs * 0.02, cs * 0.02, 0, Math.PI * 2);
    ctx.arc(from.x + cs * 0.03, from.y - cs * 0.02, cs * 0.02, 0, Math.PI * 2);
    ctx.fillStyle = '#FFE4B5';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(to.x, to.y, cs * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.snakeAccent;
    ctx.fill();
  }

  drawPlayers(players) {
    const { ctx, cs } = this;
    const onBoard = players.filter(p => p.position > 0);

    const groups = {};
    onBoard.forEach(p => {
      if (!groups[p.position]) groups[p.position] = [];
      groups[p.position].push(p);
    });

    Object.entries(groups).forEach(([pos, group]) => {
      const center = this.cellCenter(parseInt(pos));
      const r = cs * 0.12;
      const offsets = this._tokenOffsets(group.length, cs * 0.14);
      group.forEach((p, i) => {
        const ox = center.x + offsets[i].x;
        const oy = center.y + offsets[i].y;
        
        ctx.beginPath();
        ctx.arc(ox + 1.5, oy + 2, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fill();
        
        const grad = ctx.createRadialGradient(ox - r * 0.3, oy - r * 0.3, r * 0.1, ox, oy, r);
        grad.addColorStop(0, this._lighten(p.color, 40));
        grad.addColorStop(1, p.color);
        ctx.beginPath();
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${r * 1.1}px 'Spectral', serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.name[0], ox, oy + 1);
      });
    });
  }

  _tokenOffsets(count, spread) {
    if (count === 1) return [{ x: 0, y: 4 }];
    const offsets = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      offsets.push({ x: Math.cos(angle) * spread, y: Math.sin(angle) * spread + 4 });
    }
    return offsets;
  }

  _lighten(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return `rgb(${r},${g},${b})`;
  }

  render(players) {
    this.drawBoard();
    this.drawLadders();
    this.drawSnakes();
    this.drawPlayers(players);
  }
}