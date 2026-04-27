import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { WebSocketServer } from 'ws';
import { GameEngine, Player, generateBoardData } from './engine.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const PLAYER_COLORS = ['#9B1B30', '#1B4B9B', '#1B7A3E', '#B8860B'];
const rooms = new Map();

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

const httpServer = createServer(async (req, res) => {
  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';
  const ext = extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const data = await readFile(join(__dirname, filePath));
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not Found');
  }
});

const wss = new WebSocketServer({ server: httpServer });

function genCode() {
  let code;
  do { code = String(Math.floor(1000 + Math.random() * 9000)); } while (rooms.has(code));
  return code;
}

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}

function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  room.clients.forEach(c => { if (c.ws.readyState === 1) c.ws.send(data); });
}

function playerList(room) {
  return room.clients.map(c => ({ name: c.name, color: PLAYER_COLORS[c.index] }));
}

wss.on('connection', ws => {
  let myRoom = null;
  let myIndex = -1;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.type === 'create_room') {
      const code = genCode();
      const room = {
        code, host: ws, started: false, engine: null,
        clients: [{ ws, name: msg.name, index: 0 }],
      };
      rooms.set(code, room);
      myRoom = room;
      myIndex = 0;
      send(ws, { type: 'room_created', code, players: playerList(room), yourIndex: 0 });
    }

    else if (msg.type === 'join_room') {
      const room = rooms.get(msg.code);
      if (!room) { send(ws, { type: 'error', message: 'Room not found' }); return; }
      if (room.started) { send(ws, { type: 'error', message: 'Game already in progress' }); return; }
      if (room.clients.length >= 4) { send(ws, { type: 'error', message: 'Room is full (max 4)' }); return; }

      const idx = room.clients.length;
      room.clients.push({ ws, name: msg.name, index: idx });
      myRoom = room;
      myIndex = idx;

      send(ws, { type: 'room_joined', code: room.code, players: playerList(room), yourIndex: idx });
      room.clients.forEach(c => {
        if (c.ws !== ws) send(c.ws, { type: 'lobby_update', players: playerList(room) });
      });
    }

    else if (msg.type === 'start_game') {
      if (!myRoom || myRoom.host !== ws) { send(ws, { type: 'error', message: 'Only host can start' }); return; }
      if (myRoom.clients.length < 2) { send(ws, { type: 'error', message: 'Need at least 2 players' }); return; }

      const boardData = generateBoardData();
      const players = myRoom.clients.map(c => new Player(c.name, PLAYER_COLORS[c.index], false));
      myRoom.engine = new GameEngine(players, boardData);
      myRoom.started = true;
      broadcast(myRoom, {
        type: 'game_started',
        players: playerList(myRoom),
        currentPlayerIndex: 0,
        boardData
      });
    }

    else if (msg.type === 'roll_dice') {
      if (!myRoom || !myRoom.engine) return;
      const engine = myRoom.engine;
      if (engine.gameOver) return;
    if (engine.currentPlayerIndex !== myIndex) { send(ws, { type: 'error', message: 'Not your turn' }); return; }

      const dice = engine.rollDice();
      const result = engine.executeMove(myIndex, dice);

      broadcast(myRoom, {
        type: 'dice_result', playerIndex: myIndex, dice,
        move: { from: result.from, landOn: result.landOn, finalPos: result.finalPos, type: result.type, won: result.won },
      });

      if (result.won) {
        broadcast(myRoom, { type: 'game_over', winnerIndex: myIndex, winnerName: engine.players[myIndex].name });
        setTimeout(() => rooms.delete(myRoom.code), 60000);
      } else {
        engine.advanceTurn();
        broadcast(myRoom, { type: 'turn_update', currentPlayerIndex: engine.currentPlayerIndex });
      }
    }
  });

  ws.on('close', () => {
    if (!myRoom) return;
    myRoom.clients = myRoom.clients.filter(c => c.ws !== ws);
    if (myRoom.clients.length === 0) {
      rooms.delete(myRoom.code);
    } else {
      broadcast(myRoom, { type: 'player_left', players: playerList(myRoom) });
      if (myRoom.host === ws) {
        myRoom.host = myRoom.clients[0].ws;
        send(myRoom.host, { type: 'you_are_host' });
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`\nSnakes & Ladders server running at http://localhost:${PORT}\n`);
});