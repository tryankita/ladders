
export const BOARD_SIZE = 100;
export const GRID = 10;

export const SNAKES = {
  99: 54, 95: 75, 92: 73, 87: 24, 64: 60,
  62: 19, 56: 53, 49: 11, 47: 26, 16: 6
};

export const LADDERS = {
  2: 38, 7: 14, 8: 31, 15: 26, 21: 42,
  28: 84, 36: 44, 51: 67, 71: 91, 78: 98
};

export class Player {
  constructor(name, color, isBot = false) {
    this.name = name;
    this.color = color;
    this.isBot = isBot;
    this.position = 0;
    this.hasWon = false;
  }
}
export function generateBoardData() {
  const snakes = {};
  const ladders = {};
  const used = new Set([1, 100]); 

  for (let i = 0; i < 6; i++) {
    let head, tail;
    do {
      head = Math.floor(Math.random() * 88) + 11; 
      tail = Math.floor(Math.random() * (head - 2)) + 2; 
    } while (used.has(head) || used.has(tail));
    snakes[head] = tail;
    used.add(head); used.add(tail);
  }

  for (let i = 0; i < 10; i++) {
    let bottom, top;
    do {
      bottom = Math.floor(Math.random() * 88) + 2; 
      top = Math.floor(Math.random() * (99 - bottom)) + bottom + 1; 
    } while (used.has(bottom) || used.has(top));
    ladders[bottom] = top;
    used.add(bottom); used.add(top);
  }
  
  return { snakes, ladders };
}
export class GameEngine {
  constructor(players, boardData = null) {
      this.players = players;
      this.snakes = boardData ? boardData.snakes : SNAKES;
      this.ladders = boardData ? boardData.ladders : LADDERS;
      this.currentPlayerIndex = 0;
      this.gameOver = false;
      this.winner = null;
      this.moveLog = [];
  }

  rollDice() {
    return Math.floor(Math.random() * 6) + 1;
  }

  executeMove(playerIndex, diceValue) {
    const player = this.players[playerIndex];
    if (player.hasWon || this.gameOver) return null;

    const from = player.position;
    let landOn = from + diceValue;

    if (landOn > BOARD_SIZE) {
      return { player, dice: diceValue, from, landOn: from, finalPos: from, type: 'bounce', won: false };
    
    }

    let type = 'normal';
    let finalPos = landOn;

    if (this.snakes[landOn]) {
      type = 'snake';
      finalPos = this.snakes[landOn];
    } else if (this.ladders[landOn]) {
      type = 'ladder';
      finalPos = this.ladders[landOn];
    }

    player.position = finalPos;
    const won = finalPos === BOARD_SIZE;
    if (won) {
      player.hasWon = true;
      this.gameOver = true;
      this.winner = player;
    }

    const result = { player, dice: diceValue, from, landOn, finalPos, type, won };
    this.moveLog.push(result);
    return result;
  }

  advanceTurn() {
    if (this.gameOver) return;
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  reset() {
    this.players.forEach(p => { p.position = 0; p.hasWon = false; });
    this.currentPlayerIndex = 0;
    this.gameOver = false;
    this.winner = null;
    this.moveLog = [];
  }

  posToCell(pos) {
    if (pos <= 0) return null;
    const p = pos - 1;
    const row = Math.floor(p / GRID);
    const col = row % 2 === 0 ? p % GRID : (GRID - 1) - (p % GRID);
    return { row, col };
  }
}