// app.js — Single Player Snakes & Ladders with Bots
import { GameEngine, Player } from './engine.js';
import { BoardRenderer } from './renderer.js';
import { GameEngine, Player, generateBoardData } from './engine.js';

const BOT_NAMES = ['Arjun', 'Meera', 'Kavi'];
const PLAYER_COLORS = {
  human: '#9B1B30',
  bots: ['#1B4B9B', '#1B7A3E', '#B8860B']
};

let engine, renderer;
let isAnimating = false;
let animationFrameId = null;

// DOM elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const boardCanvas = document.getElementById('board-canvas');
const playerNameInput = document.getElementById('player-name');
const botCountSelect = document.getElementById('bot-count');
const startBtn = document.getElementById('start-btn');
const rollBtn = document.getElementById('roll-btn');
const diceDisplay = document.getElementById('dice-display');
const playerList = document.getElementById('player-list');
const turnIndicator = document.getElementById('turn-indicator');
const restartBtn = document.getElementById('restart-btn');
const winOverlay = document.getElementById('win-overlay');
const winnerName = document.getElementById('winner-name');
const playAgainBtn = document.getElementById('play-again-btn');
const gameLog = document.getElementById('game-log');

const DICE_DOTS = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]]
};

function drawDice(value) {
  diceDisplay.innerHTML = '';
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
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (value && DICE_DOTS[value]) {
    ctx.fillStyle = '#2C1810';
    DICE_DOTS[value].forEach(([dx, dy]) => {
    ctx.beginPath();
      ctx.arc(dx * size, dy * size, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  diceDisplay.appendChild(c);
}

function animateDiceRoll(finalValue) {
  return new Promise(resolve => {
    let frame = 0;
    const totalFrames = 12;
    const interval = setInterval(() => {
      const fake = Math.floor(Math.random() * 6) + 1;
      drawDice(fake);
      diceDisplay.style.transform = `rotate(${(Math.random() - 0.5) * 20}deg) scale(${1 + Math.random() * 0.1})`;
      frame++;
      if (frame >= totalFrames) {
        clearInterval(interval);
        diceDisplay.style.transform = 'rotate(0) scale(1)';
        drawDice(finalValue);
        diceDisplay.style.transition = 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)';
        diceDisplay.style.transform = 'scale(1.15)';
        setTimeout(() => {
          diceDisplay.style.transform = 'scale(1)';
          setTimeout(() => { diceDisplay.style.transition = ''; resolve(); }, 180);
        }, 150);
      }
    }, 55);
  });
}

function animateToken(player, from, to) {
  return new Promise(resolve => {
    if (from === to || from <= 0) {
      player.position = to;
      renderer.render(engine.players);
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
      renderer.render(engine.players);
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

function updatePlayerList() {
  playerList.innerHTML = '';
  engine.players.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'player-card' + (i === engine.currentPlayerIndex ? ' active' : '');
    el.innerHTML = `
      <span class="player-dot" style="background:${p.color}"></span>
      <span class="player-info">
        <strong>${p.name}</strong>${p.isBot ? ' <small>(bot)</small>' : ''}
        <span class="player-pos">${p.position > 0 ? `Square ${p.position}` : 'Start'}</span>
      </span>
    `;
    playerList.appendChild(el);
  });
}
function addLog(message, type = 'normal') {
  const row = document.createElement('div');
  row.className = 'log-entry log-' + type;
  row.textContent = message;
  gameLog.appendChild(row);
  gameLog.scrollTop = gameLog.scrollHeight;
}

function updateTurnIndicator() {
  const p = engine.currentPlayer;
  turnIndicator.innerHTML = `<span class="player-dot" style="background:${p.color}"></span> ${p.name}'s turn`;
}
async function executeTurn(isHuman) {
  isAnimating = true;
  rollBtn.disabled = true;

  const player = engine.currentPlayer;
  const dice = engine.rollDice();

  await animateDiceRoll(dice);

  const result = engine.executeMove(engine.currentPlayerIndex, dice);

  if (result.type === 'bounce') {
    addLog(player.name + ' rolled ' + dice + " - cannot move, exact roll needed.", 'bounce');
  } else {
    await animateToken(player, result.from, result.landOn);

    if (result.type === 'snake') {
      addLog(player.name + ' rolled ' + dice + ' and landed on ' + result.landOn + '. Snake to ' + result.finalPos + '.', 'snake');
      await new Promise(r => setTimeout(r, 350));
      await animateToken(player, result.landOn, result.finalPos);
    } else if (result.type === 'ladder') {
      addLog(player.name + ' rolled ' + dice + ' and landed on ' + result.landOn + '. Ladder to ' + result.finalPos + '.', 'ladder');
      await new Promise(r => setTimeout(r, 350));
      await animateToken(player, result.landOn, result.finalPos);
    } else {
      addLog(player.name + ' rolled ' + dice + ' and moved to ' + result.finalPos + '.', 'normal');
    }

    if (result.won) {
      addLog(player.name + ' wins the game!', 'win');
      showWinScreen(player);
      isAnimating = false;
      return;
    
    }
  
  }

  renderer.render(engine.players);
  engine.advanceTurn();
  updatePlayerList();
  updateTurnIndicator();

  isAnimating = false;

  if (engine.currentPlayer.isBot && !engine.gameOver) {
    setTimeout(() => executeTurn(false), 900);
  } else {
    rollBtn.disabled = false;
  }
}
function showWinScreen(player) {
  winnerName.textContent = player.name;
  winnerName.style.color = player.color;
  winOverlay.classList.add('visible');
}

function hideWinScreen() {
  winOverlay.classList.remove('visible');
}
function sizeBoard() {
  const controlsHeight = 140;
  const padding = 28;
  const availH = window.innerHeight - controlsHeight - padding;
  const availW = window.innerWidth - padding * 2;
  const sz = Math.floor(Math.min(availW, availH));
  renderer.resize(sz);
  renderer.render(engine ? engine.players : []);
}

function startGame() {
  const name = playerNameInput.value.trim() || 'You';
  const botCount = parseInt(botCountSelect.value);

  const players = [new Player(name, PLAYER_COLORS.human, false)];
  for (let i = 0; i < botCount; i++) {
    players.push(new Player(BOT_NAMES[i], PLAYER_COLORS.bots[i], true));
  }

  engine = new GameEngine(players); 
  renderer = new BoardRenderer(boardCanvas);

  menuScreen.classList.remove('visible');
  gameScreen.classList.add('visible');

  sizeBoard();
  updatePlayerList();
  updateTurnIndicator();
  drawDice(null);
  gameLog.innerHTML = '';
  addLog('Game started! Roll the dice to begin.', 'normal');
  rollBtn.disabled = false;
}

function restartGame() {
  hideWinScreen();
  engine.reset();
  renderer.render(engine.players);
  updatePlayerList();
  updateTurnIndicator();
  drawDice(null);
  gameLog.innerHTML = '';
  addLog('New game! Roll the dice to begin.', 'normal');
  rollBtn.disabled = false;
  isAnimating = false;
}

startBtn.addEventListener('click', startGame);
rollBtn.addEventListener('click', () => {
  if (!isAnimating && !engine.gameOver) executeTurn(true);
});
restartBtn.addEventListener('click', restartGame);
playAgainBtn.addEventListener('click', restartGame);
window.addEventListener('resize', () => { if (engine) sizeBoard(); });

playerNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') startGame();
});

menuScreen.classList.add('visible');