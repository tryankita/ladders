// shared.js
import { BoardRenderer } from './renderer.js';

export const PLAYER_COLORS = ['#9B1B30', '#1B4B9B', '#1B7A3E', '#B8860B'];

export const DICE_DOTS = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]]
};

export function drawDice(container, value) {
  container.innerHTML = '';
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size * 2;
  c.height = size * 2;
  c.style.width = size + 'px';
  c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);

  ctx.fillStyle = '#F5E6C8';
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 1.5;
  const r = 7;
  ctx.beginPath();
  ctx.moveTo(r, 0); ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r); ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size); ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r); ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  if (value && DICE_DOTS[value]) {
    ctx.fillStyle = '#2C1810';
    DICE_DOTS[value].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(dx * size, dy * size, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  container.appendChild(c);
}

export function animateDiceRoll(container, finalValue) {
  return new Promise(resolve => {
    let frame = 0;
    const totalFrames = 12;
    const interval = setInterval(() => {
      drawDice(container, Math.floor(Math.random() * 6) + 1);
      container.style.transform = `rotate(${(Math.random() - 0.5) * 20}deg) scale(${1 + Math.random() * 0.1})`;
      frame++;
      if (frame >= totalFrames) {
        clearInterval(interval);
        container.style.transform = 'rotate(0) scale(1)';
        drawDice(container, finalValue);
        container.style.transition = 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)';
        container.style.transform = 'scale(1.15)';
        setTimeout(() => {
          container.style.transform = 'scale(1)';
          setTimeout(() => { container.style.transition = ''; resolve(); }, 180);
        }, 150);
      }
    }, 55);
  });
}

export function animateToken(renderer, players, player, from, to) {
  return new Promise(resolve => {
    if (from === to || from <= 0) {
      player.position = to;
      renderer.render(players);
      resolve();
      return;
    }
    const step = from < to ? 1 : -1;
    const totalSteps = Math.abs(to - from);
    let current = from;
    let stepIndex = 0;
    const tick = () => {
      current += step;
      stepIndex++;
      player.position = current;
      renderer.render(players);
      if (current === to) {
        resolve();
      } else {
        const t = stepIndex / totalSteps;
        const ease = 60 + 60 * (1 - Math.sin(t * Math.PI));
        setTimeout(tick, Math.min(ease, 140));
      }
    };
    setTimeout(tick, 80);
  });
}

export function sizeBoard(renderer, players) {
  const controlsHeight = 140;
  const padding = 28;
  const availH = window.innerHeight - controlsHeight - padding;
  const availW = window.innerWidth - padding * 2;
  const sz = Math.floor(Math.min(availW, availH));
  renderer.resize(sz);
  renderer.render(players);
}

export function updatePlayerList(listEl, players, currentIndex) {
  listEl.innerHTML = '';
  players.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'player-card' + (i === currentIndex ? ' active' : '');
    const label = p.isBot ? ' <small>(bot)</small>' : '';
    el.innerHTML = `
      <span class="player-dot" style="background:${p.color}"></span>
      <span class="player-info">
        <strong>${p.name}</strong>${label}
        <span class="player-pos">Square ${p.position || 'Start'}</span>
      </span>`;
    listEl.appendChild(el);
  });
}

export function updateTurnIndicator(el, player) {
  el.innerHTML = `<span class="player-dot" style="background:${player.color}"></span> ${player.name}'s turn`;
}