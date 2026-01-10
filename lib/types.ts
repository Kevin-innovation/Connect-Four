export type CellValue = 'red' | 'yellow' | null;
export type Board = CellValue[][];
export type GameStatus = 'waiting' | 'spinning' | 'playing' | 'finished';
export type TurnTime = 10 | 20 | 30;

export interface Player {
  socketId: string;
  nickname: string;
  color: 'red' | 'yellow';
  isAI?: boolean;
}

export interface Position {
  row: number;
  col: number;
}

export interface GameState {
  roomId: string;
  players: Player[];
  board: Board;
  currentPlayer: number;
  gameStatus: GameStatus;
  winner: Player | null;
  turnTime: TurnTime;
  remainingTime?: number;
  isSpinning?: boolean;
  lastMove?: Position | null;
  winningPositions?: Position[];
  rematchRequests?: string[];
}

export interface RoomInfo {
  roomId: string;
  hostNickname: string;
  playerCount: number;
  maxPlayers: number;
  turnTime: TurnTime;
  gameStatus: GameStatus;
}
