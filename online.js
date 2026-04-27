// online.js
import { BoardRenderer } from './renderer.js';
import {
  PLAYER_COLORS, drawDice, animateDiceRoll, animateToken,
  sizeBoard, updatePlayerList, updateTurnIndicator
} from './shared.js';

let ws = null;
let myIndex = -1;
let isHost = false;
let renderer = null;
let players = [];
let currentPI = 0;
let isAnimating = false;

const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const lobbyScreen = document.getElementById('lobby-screen');
const boardCanvas = document.getElementById('board-canvas');
const rollBtn = document.getElementById('roll-btn');
const diceDisplay = document.getElementById('dice-display');
const playerListEl = document.getElementById('player-list');
const turnIndicator = document.getElementById('turn-indicator');
const restartBtn = document.getElementById('restart-btn');
const winOverlay = document.getElementById('win-overlay');
const winnerName = document.getElementById('winner-name');
const playAgainBtn = document.getElementById('play-again-btn');

const roomCodeEl = document.getElementById('room-code-value');
const lobbyPlayersEl = document.getElementById('lobby-player-list');
const startGameBtn = document.getElementById('start-game-btn');
const lobbyStatusEl = document.getElementById('lobby-status');
const leaveLobbyBtn = document.getElementById('leave-lobby-btn');
const onlineError = document.getElementById('online-error');

function connect() {
  return new Promise((resolve, reject) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}`);
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error('Connection failed'));
    ws.onmessage = e => handleMessage(JSON.parse(e.data));
    ws.onclose = () => {
      if (gameScreen.classList.contains('visible') || lobbyScreen.classList.contains('visible')) {
        alert('Disconnected from server');
        backToMenu();
      }
    };
  });
}

function sendMsg(msg) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg));
}

export async function hostGame(name) {
  try {
    await connect();
    isHost = true;
    sendMsg({ type: 'create_room', name });
  } catch {
    showOnlineError('Could not connect to server');
  }
}

export async function joinGame(name, code) {
  try {
    await connect();
    isHost = false;
    sendMsg({ type: 'join_room', code, name });
  } catch {
    showOnlineError('Could not connect to server');
  }
}

function showOnlineError(msg) {
  if (onlineError) { onlineError.textContent = msg; setTimeout(() => onlineError.textContent = '', 4000); }
}

function handleMessage(msg) {
  switch (msg.type) {
    case 'room_created':
      myIndex = msg.yourIndex;
      showLobby(msg.code, msg.players, true);
      break;

    case 'room_joined':
      myIndex = msg.yourIndex;
      showLobby(msg.code, msg.players, false);
      break;

    case 'lobby_update':
      renderLobbyPlayers(msg.players);
      break;

    case 'player_left':
      renderLobbyPlayers(msg.players);
      if (gameScreen.classList.contains('visible')) {
        players = msg.players.map(p => ({ name: p.name, color: p.color, position: 0, isBot: false }));
      }
      break;

    case 'you_are_host':
      isHost = true;
      if (lobbyScreen.classList.contains('visible')) {
        startGameBtn.style.display = '';
        lobbyStatusEl.textContent = 'You are now the host';
      }
      break;

    case 'game_started':
      startOnlineGame(msg.players, msg.currentPlayerIndex, msg.boardData);
      break;

    case 'dice_result':
      handleDiceResult(msg);
      break;

    case 'turn_update':
      currentPI = msg.currentPlayerIndex;
      updatePlayerList(playerListEl, players, currentPI);
      updateTurnIndicator(turnIndicator, players[currentPI]);
      if (currentPI === myIndex) rollBtn.disabled = false;
      break;

    case 'game_over':
      const winner = players[msg.winnerIndex] || { name: msg.winnerName, color: PLAYER_COLORS[msg.winnerIndex] };
      winnerName.textContent = winner.name;
      winnerName.style.color = winner.color;
      winOverlay.classList.add('visible');
      break;

    case 'error':
      showOnlineError(msg.message);
      break;
  }
}

function showLobby(code, playerData, hosting) {
  menuScreen.classList.remove('visible');
  gameScreen.classList.remove('visible');
  lobbyScreen.classList.add('visible');

  roomCodeEl.textContent = code;
  startGameBtn.style.display = hosting ? '' : 'none';
  lobbyStatusEl.textContent = hosting ? 'Waiting for players to join...' : 'Waiting for host to start...';
  renderLobbyPlayers(playerData);

  startGameBtn.onclick = () => sendMsg({ type: 'start_game' });
  leaveLobbyBtn.onclick = () => { if (ws) ws.close(); backToMenu(); };
}

function renderLobbyPlayers(playerData) {
  lobbyPlayersEl.innerHTML = '';
  playerData.forEach(p => {
    const el = document.createElement('div');
    el.className = 'lobby-player';
    el.innerHTML = `<span class="player-dot" style="background:${p.color}"></span> <strong>${p.name}</strong>`;
    lobbyPlayersEl.appendChild(el);
  });
}

function startOnlineGame(playerData, startingPI, boardData) {
  players = playerData.map(p => ({ name: p.name, color: p.color, position: 0, isBot: false }));
  currentPI = startingPI;
  renderer = new BoardRenderer(boardCanvas);

  if (boardData) {
    renderer.setBoard(boardData.snakes, boardData.ladders);
  }

  lobbyScreen.classList.remove('visible');
  gameScreen.classList.add('visible');

  sizeBoard(renderer, players);
  updatePlayerList(playerListEl, players, currentPI);
  updateTurnIndicator(turnIndicator, players[currentPI]);
  drawDice(diceDisplay, null);

  rollBtn.disabled = currentPI !== myIndex;
  rollBtn.onclick = () => {
    if (isAnimating || currentPI !== myIndex) return;
    rollBtn.disabled = true;
    sendMsg({ type: 'roll_dice' });
  };

  restartBtn.onclick = () => { if (ws) ws.close(); backToMenu(); };
  playAgainBtn.onclick = () => { winOverlay.classList.remove('visible'); if (ws) ws.close(); backToMenu(); };

  window.removeEventListener('resize', onResize);
  window.addEventListener('resize', onResize);
}

function onResize() { if (renderer) sizeBoard(renderer, players); }

async function handleDiceResult(msg) {
  isAnimating = true;
  rollBtn.disabled = true;

  const player = players[msg.playerIndex];
  const { from, landOn, finalPos, type: moveType, won } = msg.move;

  await animateDiceRoll(diceDisplay, msg.dice);

  if (moveType !== 'bounce') {
    await animateToken(renderer, players, player, from, landOn);

    if (moveType === 'snake' || moveType === 'ladder') {
      await new Promise(r => setTimeout(r, 350));
      await animateToken(renderer, players, player, landOn, finalPos);
    }
  }

  player.position = finalPos;
  renderer.render(players);
  isAnimating = false;
}

function backToMenu() {
  lobbyScreen.classList.remove('visible');
  gameScreen.classList.remove('visible');
  winOverlay.classList.remove('visible');
  menuScreen.classList.add('visible');
  ws = null; myIndex = -1; isHost = false; players = []; isAnimating = false;
}