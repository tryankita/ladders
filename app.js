// app.js
import { BoardRenderer } from './renderer.js';
import { GameEngine, Player, generateBoardData } from './engine.js';
import {
PLAYER_COLORS, drawDice, animateDiceRoll, animateToken,
sizeBoard, updatePlayerList, updateTurnIndicator
} from './shared.js';

const BOT_NAMES = ['Arjun', 'Meera', 'Kavi'];

let engine, renderer;
let isAnimating = false;

// DOM elements
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const boardCanvas = document.getElementById('board-canvas');
const playerNameInput = document.getElementById('player-name');
const playerListEl = document.getElementById('player-list');
const botCountSelect = document.getElementById('bot-count');
const startBtn = document.getElementById('start-btn');
const rollBtn = document.getElementById('roll-btn');
const diceDisplay = document.getElementById('dice-display');
const turnIndicator = document.getElementById('turn-indicator');
const restartBtn = document.getElementById('restart-btn');
const winOverlay = document.getElementById('win-overlay');
const winnerName = document.getElementById('winner-name');
const playAgainBtn = document.getElementById('play-again-btn');

const modeTabs = document.querySelectorAll('.mode-tab');
const soloForm = document.getElementById('solo-form');
const onlineForm = document.getElementById('online-form');

if (modeTabs.length > 0 && soloForm && onlineForm) {
  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      modeTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      soloForm.style.display = tab.dataset.mode === 'solo' ? '' : 'none';
      onlineForm.style.display = tab.dataset.mode === 'online' ? '' : 'none';
    });
  });
}

const hostBtn = document.getElementById('host-btn');
if (hostBtn) {
  hostBtn.addEventListener('click', async () => {
    const onlineNameInput = document.getElementById('online-name');
    const name = onlineNameInput ? (onlineNameInput.value.trim() || 'Host') : 'Host';
    const { hostGame } = await import('./online.js');
    hostGame(name);
  });
}

const joinBtn = document.getElementById('join-btn');
if (joinBtn) {
  joinBtn.addEventListener('click', async () => {
    const onlineNameInput = document.getElementById('online-name');
    const roomCodeInput = document.getElementById('room-code-input');
    const onlineError = document.getElementById('online-error');
    const name = onlineNameInput ? (onlineNameInput.value.trim() || 'Guest') : 'Guest';
    const code = roomCodeInput ? roomCodeInput.value.trim() : '';
    if (code.length !== 4) {
      if (onlineError) onlineError.textContent = 'Enter a 4-digit code';
      return;
    }
    const { joinGame } = await import('./online.js');
    joinGame(name, code);
  });
}

function doSize() { if (renderer) sizeBoard(renderer, engine ? engine.players : []); }

async function executeTurn() {
  isAnimating = true;
  rollBtn.disabled = true;

  const player = engine.currentPlayer;
  const dice = engine.rollDice();
  await animateDiceRoll(diceDisplay, dice);

  const result = engine.executeMove(engine.currentPlayerIndex, dice);

  if (result.type !== 'bounce') {
    await animateToken(renderer, engine.players, player, result.from, result.landOn);

    if (result.type === 'snake' || result.type === 'ladder') {
      await new Promise(r => setTimeout(r, 350));
      await animateToken(renderer, engine.players, player, result.landOn, result.finalPos);
    }

    if (result.won) {
      showWin(player);
      isAnimating = false;
      return;
    }
  }

  renderer.render(engine.players);
  engine.advanceTurn();
  updatePlayerList(playerListEl, engine.players, engine.currentPlayerIndex);
  updateTurnIndicator(turnIndicator, engine.currentPlayer);
  isAnimating = false;

  if (engine.currentPlayer.isBot && !engine.gameOver) {
    setTimeout(() => executeTurn(), 900);
  } else {
    rollBtn.disabled = false;
  }
}

function showWin(player) {
  winnerName.textContent = player.name;
  winnerName.style.color = player.color;
  winOverlay.classList.add('visible');
}

function startSoloGame() {
  const name = playerNameInput.value.trim() || 'You';
  const botCount = parseInt(botCountSelect.value);
  const players = [new Player(name, PLAYER_COLORS[0], false)];
  for (let i = 0; i < botCount; i++) {
    players.push(new Player(BOT_NAMES[i], PLAYER_COLORS[i + 1], true));
  }

  const boardData = generateBoardData();
  engine = new GameEngine(players, boardData);
  renderer = new BoardRenderer(boardCanvas);
  renderer.setBoard(boardData.snakes, boardData.ladders);

  menuScreen.classList.remove('visible');
  gameScreen.classList.add('visible');
  doSize();
  updatePlayerList(playerListEl, engine.players, engine.currentPlayerIndex);
  updateTurnIndicator(turnIndicator, engine.currentPlayer);
  drawDice(diceDisplay, null);
  rollBtn.disabled = false;
  rollBtn.onclick = () => { if (!isAnimating && !engine.gameOver) executeTurn(); };
}

function restartSolo() {
  winOverlay.classList.remove('visible');
  engine.reset();
  renderer.render(engine.players);
  updatePlayerList(playerListEl, engine.players, engine.currentPlayerIndex);
  updateTurnIndicator(turnIndicator, engine.currentPlayer);
  drawDice(diceDisplay, null);
  rollBtn.disabled = false;
  isAnimating = false;
}

startBtn.addEventListener('click', startSoloGame);
playerNameInput.addEventListener('keydown', e => { if (e.key === 'Enter') startSoloGame(); });
restartBtn.addEventListener('click', () => {
  winOverlay.classList.remove('visible');
  gameScreen.classList.remove('visible');
  menuScreen.classList.add('visible');
});
playAgainBtn.addEventListener('click', restartSolo);
window.addEventListener('resize', doSize);

menuScreen.classList.add('visible');