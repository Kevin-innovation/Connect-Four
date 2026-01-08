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

// 고유한 방 ID 생성
function generateRoomId() {
  let roomId;
  do {
    roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (rooms.has(roomId));
  return roomId;
}

// 닉네임 검증
function validateNickname(nickname) {
  if (typeof nickname !== 'string') return false;
  const trimmed = nickname.trim();
  return trimmed.length > 0 && trimmed.length <= 20;
}

// 게임 방 클래스
class GameRoom {
  constructor(roomId, turnTime = 30) {
    this.roomId = roomId;
    this.players = [];
    this.board = Array(6).fill(null).map(() => Array(7).fill(null));
    this.currentPlayer = 0;
    this.gameStatus = 'waiting'; // waiting, spinning, playing, finished
    this.winner = null;
    this.turnTime = turnTime; // 10, 20, 30 seconds
    this.currentTurnTimer = null;
    this.currentTurnStartTime = null;
    this.remainingTime = turnTime;
    this.isSpinning = false;
    this.lastMove = null; // 마지막 착수 위치
    this.winningPositions = []; // 승리한 위치들
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

    // 2명이 모이면 돌림판 상태로 변경 (자동으로 돌림판 시작하지 않음)
    if (this.players.length === 2) {
      this.gameStatus = 'waiting'; // 돌림판은 명시적으로 시작
    }
    return true;
  }

  // 돌림판 돌리기
  spinWheel() {
    if (this.players.length !== 2) {
      return { success: false, error: '2명의 플레이어가 필요합니다' };
    }

    this.isSpinning = true;
    this.gameStatus = 'spinning';

    // 랜덤으로 선공 결정 (0 or 1)
    const firstPlayer = Math.floor(Math.random() * 2);
    this.currentPlayer = firstPlayer;

    return {
      success: true,
      firstPlayer,
      firstPlayerInfo: this.players[firstPlayer]
    };
  }

  // 돌림판 완료 후 게임 시작
  startGameAfterSpin() {
    this.isSpinning = false;
    this.gameStatus = 'playing';
    this.startTurnTimer();
  }

  // 턴 타이머 시작
  startTurnTimer() {
    this.clearTurnTimer();
    this.currentTurnStartTime = Date.now();
    this.remainingTime = this.turnTime;
  }

  // 타이머 정리
  clearTurnTimer() {
    if (this.currentTurnTimer) {
      clearTimeout(this.currentTurnTimer);
      this.currentTurnTimer = null;
    }
  }

  // 남은 시간 계산
  getRemainingTime() {
    if (!this.currentTurnStartTime) return this.turnTime;
    const elapsed = Math.floor((Date.now() - this.currentTurnStartTime) / 1000);
    return Math.max(0, this.turnTime - elapsed);
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
    // 입력 검증
    if (typeof column !== 'number' || column < 0 || column > 6) {
      return { success: false, error: '잘못된 열 번호입니다' };
    }

    if (this.gameStatus !== 'playing') {
      return { success: false, error: '게임이 진행 중이 아닙니다' };
    }

    // 플레이어 확인
    const playerIndex = this.players.findIndex(p => p.socketId === socketId);
    if (playerIndex === -1) {
      return { success: false, error: '플레이어를 찾을 수 없습니다' };
    }

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

    // 마지막 착수 위치 저장
    this.lastMove = { row, column };

    // 승리 체크
    const winningPositions = this.checkWin(row, column, color);

    if (winningPositions) {
      this.gameStatus = 'finished';
      this.winner = this.players[playerIndex];
      this.winningPositions = winningPositions;
      this.clearTurnTimer();
    } else {
      // 무승부 체크 (보드가 가득 참)
      const isFull = this.board[0].every(cell => cell !== null);
      if (isFull) {
        this.gameStatus = 'finished';
        this.winner = null; // 무승부
        this.clearTurnTimer();
      } else {
        // 다음 플레이어로 턴 변경
        this.currentPlayer = (this.currentPlayer + 1) % 2;
        this.startTurnTimer(); // 다음 턴 타이머 시작
      }
    }

    return {
      success: true,
      row,
      column,
      color,
      isWin: !!winningPositions,
      winningPositions: winningPositions || [],
      winner: this.winner,
      currentPlayer: this.currentPlayer,
      gameStatus: this.gameStatus
    };
  }

  checkWin(row, col, color) {
    // 4개 연결 체크 (가로, 세로, 대각선) - 승리 위치들 반환

    // 가로 체크
    let count = 1;
    let positions = [{ row, col }];
    // 왼쪽
    for (let c = col - 1; c >= 0 && this.board[row][c] === color; c--) {
      count++;
      positions.push({ row, col: c });
    }
    // 오른쪽
    for (let c = col + 1; c < 7 && this.board[row][c] === color; c++) {
      count++;
      positions.push({ row, col: c });
    }
    if (count >= 4) return positions;

    // 세로 체크
    count = 1;
    positions = [{ row, col }];
    // 아래
    for (let r = row + 1; r < 6 && this.board[r][col] === color; r++) {
      count++;
      positions.push({ row: r, col });
    }
    if (count >= 4) return positions;

    // 대각선 체크 (왼쪽 위 -> 오른쪽 아래)
    count = 1;
    positions = [{ row, col }];
    // 왼쪽 위
    for (let r = row - 1, c = col - 1; r >= 0 && c >= 0 && this.board[r][c] === color; r--, c--) {
      count++;
      positions.push({ row: r, col: c });
    }
    // 오른쪽 아래
    for (let r = row + 1, c = col + 1; r < 6 && c < 7 && this.board[r][c] === color; r++, c++) {
      count++;
      positions.push({ row: r, col: c });
    }
    if (count >= 4) return positions;

    // 대각선 체크 (오른쪽 위 -> 왼쪽 아래)
    count = 1;
    positions = [{ row, col }];
    // 오른쪽 위
    for (let r = row - 1, c = col + 1; r >= 0 && c < 7 && this.board[r][c] === color; r--, c++) {
      count++;
      positions.push({ row: r, col: c });
    }
    // 왼쪽 아래
    for (let r = row + 1, c = col - 1; r < 6 && c >= 0 && this.board[r][c] === color; r++, c--) {
      count++;
      positions.push({ row: r, col: c });
    }
    if (count >= 4) return positions;

    return null;
  }

  resetGame() {
    this.board = Array(6).fill(null).map(() => Array(7).fill(null));
    this.currentPlayer = 0;
    this.gameStatus = this.players.length === 2 ? 'waiting' : 'waiting'; // 돌림판을 다시 돌려야 함
    this.winner = null;
    this.clearTurnTimer();
    this.isSpinning = false;
    this.remainingTime = this.turnTime;
    this.lastMove = null;
    this.winningPositions = [];
  }

  getState() {
    return {
      roomId: this.roomId,
      players: this.players,
      board: this.board,
      currentPlayer: this.currentPlayer,
      gameStatus: this.gameStatus,
      winner: this.winner,
      turnTime: this.turnTime,
      remainingTime: this.getRemainingTime(),
      isSpinning: this.isSpinning,
      lastMove: this.lastMove,
      winningPositions: this.winningPositions
    };
  }

  // 방 정보 (목록용)
  getRoomInfo() {
    return {
      roomId: this.roomId,
      hostNickname: this.players[0]?.nickname || 'Unknown',
      playerCount: this.players.length,
      maxPlayers: 2,
      turnTime: this.turnTime,
      gameStatus: this.gameStatus
    };
  }
}

app.prepare().then(() => {
  console.log('Next.js app prepared successfully');

  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Health check endpoint for Railway
      if (parsedUrl.pathname === '/health' || parsedUrl.pathname === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
        return;
      }

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

  // 타이머 인터벌 저장소
  const roomTimers = new Map();

  // 방별 타이머 시작
  function startRoomTimer(roomId, room) {
    // 기존 타이머 정리
    if (roomTimers.has(roomId)) {
      clearInterval(roomTimers.get(roomId));
    }

    // 1초마다 남은 시간 업데이트
    const timer = setInterval(() => {
      if (!rooms.has(roomId) || room.gameStatus !== 'playing') {
        clearInterval(timer);
        roomTimers.delete(roomId);
        return;
      }

      const remainingTime = room.getRemainingTime();

      // 시간 업데이트 전송
      io.to(roomId).emit('timeUpdate', { remainingTime });

      // 시간 초과
      if (remainingTime <= 0) {
        clearInterval(timer);
        roomTimers.delete(roomId);

        // 현재 플레이어 패배 처리
        const loserIndex = room.currentPlayer;
        const winnerIndex = (room.currentPlayer + 1) % 2;
        room.gameStatus = 'finished';
        room.winner = room.players[winnerIndex];
        room.clearTurnTimer();

        io.to(roomId).emit('timeOver', {
          loser: room.players[loserIndex],
          winner: room.players[winnerIndex],
          gameState: room.getState()
        });

        io.to(roomId).emit('gameOver', {
          winner: room.winner,
          gameState: room.getState()
        });
      }
    }, 1000);

    roomTimers.set(roomId, timer);
  }

  // 타이머 정리
  function clearRoomTimer(roomId) {
    if (roomTimers.has(roomId)) {
      clearInterval(roomTimers.get(roomId));
      roomTimers.delete(roomId);
    }
  }

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // 방 생성
    socket.on('createRoom', ({ nickname, turnTime = 30 }) => {
      try {
        const roomId = generateRoomId();
        const room = new GameRoom(roomId, turnTime);
        room.addPlayer(socket.id, nickname);
        rooms.set(roomId, room);

        socket.join(roomId);
        socket.emit('roomCreated', { roomId, state: room.getState() });
        io.emit('roomListUpdated', Array.from(rooms.values()).map(r => r.getRoomInfo()));
        console.log(`Room created: ${roomId} by ${socket.id} with ${turnTime}s turn time`);
      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('error', { message: '방 생성에 실패했습니다' });
      }
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
      io.emit('roomListUpdated', Array.from(rooms.values()).map(r => r.getRoomInfo()));
      console.log(`Player ${socket.id} joined room ${roomId}`);
    });

    // 방 목록 요청
    socket.on('getRoomList', () => {
      const roomList = Array.from(rooms.values()).map(r => r.getRoomInfo());
      socket.emit('roomList', roomList);
    });

    // 돌림판 시작
    socket.on('spinWheel', (roomId) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', { message: '방을 찾을 수 없습니다' });
        return;
      }

      const result = room.spinWheel();
      if (result.success) {
        // 돌림판 시작 알림
        io.to(roomId).emit('wheelSpinning', {
          firstPlayer: result.firstPlayer,
          firstPlayerInfo: result.firstPlayerInfo
        });

        // 3초 후 게임 시작
        setTimeout(() => {
          room.startGameAfterSpin();
          io.to(roomId).emit('gameState', room.getState());

          // 타이머 시작 및 주기적 업데이트
          startRoomTimer(roomId, room);
        }, 3000);
      } else {
        socket.emit('error', { message: result.error });
      }
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
            winningPositions: result.winningPositions || [],
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
        clearRoomTimer(roomId);
        room.resetGame();
        io.to(roomId).emit('gameState', room.getState());
        io.to(roomId).emit('gameReset', { message: '게임이 초기화되었습니다. 돌림판을 돌려주세요!' });
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
          clearRoomTimer(roomId);

          if (room.players.length === 0) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} deleted`);
            io.emit('roomListUpdated', Array.from(rooms.values()).map(r => r.getRoomInfo()));
          } else {
            io.to(roomId).emit('gameState', room.getState());
            io.to(roomId).emit('playerDisconnected', {
              message: '상대방이 나갔습니다'
            });
            io.emit('roomListUpdated', Array.from(rooms.values()).map(r => r.getRoomInfo()));
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
