
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

export class GameEngine {
  constructor(players) {
    this.players = players;
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

    if (SNAKES[landOn]) {
      type = 'snake';
      finalPos = SNAKES[landOn];
    } else if (LADDERS[landOn]) {
      type = 'ladder';
      finalPos = LADDERS[landOn];
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