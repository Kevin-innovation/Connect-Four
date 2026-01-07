const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '4077', 10);

const app = next({ dev });
const handle = app.getRequestHandler();

// 게임 방들을 저장하는 메모리 저장소
const rooms = new Map();

// 게임 방 클래스
class GameRoom {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = [];
    this.board = Array(6).fill(null).map(() => Array(7).fill(null));
    this.currentPlayer = 0;
    this.gameStatus = 'waiting'; // waiting, playing, finished
    this.winner = null;
  }

  addPlayer(socketId, nickname) {
    if (this.players.length >= 2) {
      return false;
    }
    this.players.push({
      socketId,
      nickname: nickname || `게스트${this.players.length + 1}`,
      color: this.players.length === 0 ? 'red' : 'yellow'
    });

    if (this.players.length === 2) {
      this.gameStatus = 'playing';
    }
    return true;
  }

  removePlayer(socketId) {
    const index = this.players.findIndex(p => p.socketId === socketId);
    if (index !== -1) {
      this.players.splice(index, 1);
      if (this.players.length < 2) {
        this.gameStatus = 'waiting';
      }
    }
  }

  updateNickname(socketId, newNickname) {
    const player = this.players.find(p => p.socketId === socketId);
    if (player) {
      player.nickname = newNickname;
      return true;
    }
    return false;
  }

  makeMove(socketId, column) {
    if (this.gameStatus !== 'playing') {
      return { success: false, error: '게임이 진행 중이 아닙니다' };
    }

    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex !== this.currentPlayer) {
      return { success: false, error: '당신의 차례가 아닙니다' };
    }

    // 해당 열에서 가장 아래 빈 칸 찾기
    let row = -1;
    for (let r = 5; r >= 0; r--) {
      if (this.board[r][column] === null) {
        row = r;
        break;
      }
    }

    if (row === -1) {
      return { success: false, error: '해당 열이 가득 찼습니다' };
    }

    // 돌 놓기
    const color = this.players[playerIndex].color;
    this.board[row][column] = color;

    // 승리 체크
    const isWin = this.checkWin(row, column, color);

    if (isWin) {
      this.gameStatus = 'finished';
      this.winner = this.players[playerIndex];
    } else {
      // 무승부 체크 (보드가 가득 참)
      const isFull = this.board[0].every(cell => cell !== null);
      if (isFull) {
        this.gameStatus = 'finished';
        this.winner = null; // 무승부
      } else {
        // 다음 플레이어로 턴 변경
        this.currentPlayer = (this.currentPlayer + 1) % 2;
      }
    }

    return {
      success: true,
      row,
      column,
      color,
      isWin,
      winner: this.winner,
      currentPlayer: this.currentPlayer,
      gameStatus: this.gameStatus
    };
  }

  checkWin(row, col, color) {
    // 4개 연결 체크 (가로, 세로, 대각선)

    // 가로 체크
    let count = 1;
    // 왼쪽
    for (let c = col - 1; c >= 0 && this.board[row][c] === color; c--) count++;
    // 오른쪽
    for (let c = col + 1; c < 7 && this.board[row][c] === color; c++) count++;
    if (count >= 4) return true;

    // 세로 체크
    count = 1;
    // 아래
    for (let r = row + 1; r < 6 && this.board[r][col] === color; r++) count++;
    if (count >= 4) return true;

    // 대각선 체크 (왼쪽 위 -> 오른쪽 아래)
    count = 1;
    // 왼쪽 위
    for (let r = row - 1, c = col - 1; r >= 0 && c >= 0 && this.board[r][c] === color; r--, c--) count++;
    // 오른쪽 아래
    for (let r = row + 1, c = col + 1; r < 6 && c < 7 && this.board[r][c] === color; r++, c++) count++;
    if (count >= 4) return true;

    // 대각선 체크 (오른쪽 위 -> 왼쪽 아래)
    count = 1;
    // 오른쪽 위
    for (let r = row - 1, c = col + 1; r >= 0 && c < 7 && this.board[r][c] === color; r--, c++) count++;
    // 왼쪽 아래
    for (let r = row + 1, c = col - 1; r < 6 && c >= 0 && this.board[r][c] === color; r++, c--) count++;
    if (count >= 4) return true;

    return false;
  }

  resetGame() {
    this.board = Array(6).fill(null).map(() => Array(7).fill(null));
    this.currentPlayer = 0;
    this.gameStatus = this.players.length === 2 ? 'playing' : 'waiting';
    this.winner = null;
  }

  getState() {
    return {
      roomId: this.roomId,
      players: this.players,
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameStatus: this.gameStatus,
      winner: this.winner
    };
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 방 생성
    socket.on('createRoom', (nickname) => {
      const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const room = new GameRoom(roomId);
      room.addPlayer(socket.id, nickname);
      rooms.set(roomId, room);

      socket.join(roomId);
      socket.emit('roomCreated', { roomId, state: room.getState() });
      console.log(`Room created: ${roomId}`);
    });

    // 방 입장
    socket.on('joinRoom', ({ roomId, nickname }) => {
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit('error', { message: '방을 찾을 수 없습니다' });
        return;
      }

      const success = room.addPlayer(socket.id, nickname);
      if (!success) {
        socket.emit('error', { message: '방이 가득 찼습니다' });
        return;
      }

      socket.join(roomId);
      io.to(roomId).emit('gameState', room.getState());
      console.log(`Player ${socket.id} joined room ${roomId}`);
    });

    // 닉네임 변경
    socket.on('updateNickname', ({ roomId, nickname }) => {
      const room = rooms.get(roomId);
      if (room && room.updateNickname(socket.id, nickname)) {
        io.to(roomId).emit('gameState', room.getState());
      }
    });

    // 돌 놓기
    socket.on('makeMove', ({ roomId, column }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: '방을 찾을 수 없습니다' });
        return;
      }

      const result = room.makeMove(socket.id, column);
      if (result.success) {
        io.to(roomId).emit('moveMade', {
          row: result.row,
          column: result.column,
          color: result.color,
          gameState: room.getState()
        });

        if (result.isWin || result.gameStatus === 'finished') {
          io.to(roomId).emit('gameOver', {
            winner: result.winner,
            gameState: room.getState()
          });
        }
      } else {
        socket.emit('error', { message: result.error });
      }
    });

    // 게임 재시작
    socket.on('resetGame', (roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        room.resetGame();
        io.to(roomId).emit('gameState', room.getState());
      }
    });

    // 연결 해제
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);

      // 플레이어가 속한 방 찾아서 제거
      for (const [roomId, room] of rooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          room.removePlayer(socket.id);

          if (room.players.length === 0) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} deleted`);
          } else {
            io.to(roomId).emit('gameState', room.getState());
            io.to(roomId).emit('playerDisconnected', {
              message: '상대방이 나갔습니다'
            });
          }
          break;
        }
      }
    });
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, '0.0.0.0', () => {
      console.log(`> Ready on http://0.0.0.0:${port}`);
      console.log(`> Environment: ${dev ? 'development' : 'production'}`);
    });
});
