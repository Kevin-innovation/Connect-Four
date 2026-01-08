'use client';

import { useEffect, useState } from 'react';
import { initSocket, getSocket } from '@/lib/socket';
import GameBoard from '@/components/GameBoard';
import SpinWheel from '@/components/SpinWheel';
import { GameState, Player, TurnTime, RoomInfo } from '@/lib/types';
import { Socket } from 'socket.io-client';

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [inputRoomId, setInputRoomId] = useState<string>('');
  const [inputNickname, setInputNickname] = useState<string>('');
  const [isEditingNickname, setIsEditingNickname] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showWinModal, setShowWinModal] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [selectedTurnTime, setSelectedTurnTime] = useState<TurnTime>(30);
  const [remainingTime, setRemainingTime] = useState<number>(30);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [firstPlayer, setFirstPlayer] = useState<number | undefined>();
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);
  const [showRoomList, setShowRoomList] = useState<boolean>(false);

  // 에러 자동 해제
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const newSocket = initSocket();
    setSocket(newSocket);

    // 연결 상태 추적
    newSocket.on('connect', () => {
      setIsConnected(true);
      setError('');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setError('서버와의 연결이 끊어졌습니다');
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
      setError('서버에 연결할 수 없습니다');
    });

    newSocket.on('roomCreated', ({ roomId, state }) => {
      setRoomId(roomId);
      setGameState(state);
      setError('');
      setIsLoading(false);
    });

    newSocket.on('gameState', (state: GameState) => {
      setGameState(state);
      setRoomId(state.roomId);
      setError('');
      setIsLoading(false);
    });

    newSocket.on('moveMade', ({ gameState: state }) => {
      setGameState(state);
      setIsMoving(false);
    });

    newSocket.on('gameOver', ({ winner, gameState: state }) => {
      setGameState(state);
      setShowWinModal(true);
      setIsMoving(false);
    });

    newSocket.on('playerDisconnected', ({ message }) => {
      setError(message);
      setIsMoving(false);
    });

    newSocket.on('error', ({ message }) => {
      setError(message);
      setIsLoading(false);
      setIsMoving(false);
    });

    // 돌림판 이벤트
    newSocket.on('wheelSpinning', ({ firstPlayer, firstPlayerInfo }) => {
      setIsSpinning(true);
      setFirstPlayer(firstPlayer);
    });

    // 타이머 업데이트
    newSocket.on('timeUpdate', ({ remainingTime }) => {
      setRemainingTime(remainingTime);
    });

    // 시간 초과
    newSocket.on('timeOver', ({ loser, winner, gameState: state }) => {
      setGameState(state);
      setError(`${loser.nickname}님의 시간이 초과되었습니다!`);
      setShowWinModal(true);
    });

    // 방 목록
    newSocket.on('roomList', (rooms: RoomInfo[]) => {
      setRoomList(rooms);
    });

    // 방 목록 업데이트
    newSocket.on('roomListUpdated', (rooms: RoomInfo[]) => {
      setRoomList(rooms);
    });

    // 게임 리셋
    newSocket.on('gameReset', ({ message }) => {
      setError(message);
    });

    // 초기 연결 상태 설정
    setIsConnected(newSocket.connected);

    // 초기 방 목록 요청
    newSocket.emit('getRoomList');

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.off('roomCreated');
      newSocket.off('gameState');
      newSocket.off('moveMade');
      newSocket.off('gameOver');
      newSocket.off('playerDisconnected');
      newSocket.off('error');
      newSocket.off('wheelSpinning');
      newSocket.off('timeUpdate');
      newSocket.off('timeOver');
      newSocket.off('roomList');
      newSocket.off('roomListUpdated');
      newSocket.off('gameReset');
    };
  }, []);

  const createRoom = () => {
    if (!socket || !isConnected || isLoading) return;
    setIsLoading(true);
    setError('');
    const name = inputNickname.trim() || '게스트1';
    setNickname(name);
    socket.emit('createRoom', { nickname: name, turnTime: selectedTurnTime });
  };

  const joinRoom = () => {
    if (!socket || !isConnected || isLoading) return;
    if (!inputRoomId.trim()) {
      setError('방 ID를 입력해주세요');
      return;
    }
    setIsLoading(true);
    setError('');
    const name = inputNickname.trim() || '게스트2';
    setNickname(name);
    socket.emit('joinRoom', { roomId: inputRoomId.toUpperCase(), nickname: name });
  };

  const joinRoomFromList = (selectedRoomId: string) => {
    if (!socket || !isConnected || isLoading) return;
    setIsLoading(true);
    setError('');
    const name = inputNickname.trim() || '게스트2';
    setNickname(name);
    socket.emit('joinRoom', { roomId: selectedRoomId, nickname: name });
    setShowRoomList(false);
  };

  const spinWheel = () => {
    if (!socket || !roomId) return;
    socket.emit('spinWheel', roomId);
  };

  const onSpinComplete = (firstPlayer: number) => {
    setIsSpinning(false);
    setFirstPlayer(undefined);
  };

  const handleColumnClick = (column: number) => {
    if (!socket || !roomId || !isConnected || isMoving) return;
    if (!isMyTurn()) return;
    setIsMoving(true);
    socket.emit('makeMove', { roomId, column });
  };

  const resetGame = () => {
    if (!socket || !roomId) return;
    socket.emit('resetGame', roomId);
    setShowWinModal(false);
  };

  const updateNickname = () => {
    if (!socket || !roomId || !inputNickname.trim()) return;
    const newNickname = inputNickname.trim();
    setNickname(newNickname);
    socket.emit('updateNickname', { roomId, nickname: newNickname });
    setIsEditingNickname(false);
  };

  const getCurrentPlayer = (): Player | null => {
    if (!socket || !gameState) return null;
    return gameState.players.find((p) => p.socketId === socket.id) || null;
  };

  const getOpponentPlayer = (): Player | null => {
    if (!socket || !gameState) return null;
    return gameState.players.find((p) => p.socketId !== socket.id) || null;
  };

  const isMyTurn = (): boolean => {
    if (!socket || !gameState || gameState.gameStatus !== 'playing') return false;
    const currentPlayer = gameState.players[gameState.currentPlayer];
    return currentPlayer?.socketId === socket.id;
  };

  const currentPlayer = getCurrentPlayer();
  const opponent = getOpponentPlayer();

  // 게임 대기 화면
  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 px-4">
        <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 sm:mb-8 text-gray-800">
            Connect Four
          </h1>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              닉네임 (선택사항)
            </label>
            <input
              type="text"
              value={inputNickname}
              onChange={(e) => setInputNickname(e.target.value)}
              placeholder="닉네임을 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              maxLength={20}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              턴 제한 시간
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([10, 20, 30] as TurnTime[]).map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTurnTime(time)}
                  className={`py-2 px-2 sm:px-4 rounded-lg font-medium text-sm sm:text-base transition-colors ${
                    selectedTurnTime === time
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {time}초
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={createRoom}
            disabled={!isConnected || isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base transition-colors mb-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? '생성 중...' : !isConnected ? '연결 중...' : '새 게임 만들기'}
          </button>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-300"></div>
            <span className="px-4 text-gray-500 text-sm">또는</span>
            <div className="flex-1 border-t border-gray-300"></div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              방 ID
            </label>
            <input
              type="text"
              value={inputRoomId}
              onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
              placeholder="방 ID를 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 uppercase"
              maxLength={6}
            />
          </div>

          <button
            onClick={joinRoom}
            disabled={!isConnected || isLoading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mb-4"
          >
            {isLoading ? '참가 중...' : !isConnected ? '연결 중...' : '방 참가하기'}
          </button>

          <button
            onClick={() => setShowRoomList(!showRoomList)}
            disabled={!isConnected}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg text-sm sm:text-base transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {showRoomList ? '방 목록 닫기' : '방 목록 보기'}
          </button>

          {/* 방 목록 */}
          {showRoomList && (
            <div className="mt-4 border-t border-gray-300 pt-4">
              <h3 className="font-bold text-gray-800 mb-3">현재 활성 방 ({roomList.length}개)</h3>
              {roomList.length === 0 ? (
                <p className="text-gray-500 text-center py-4">생성된 방이 없습니다</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {roomList.map((room) => (
                    <div
                      key={room.roomId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800">{room.hostNickname}님의 방</div>
                        <div className="text-sm text-gray-600">
                          {room.playerCount}/{room.maxPlayers}명 · {room.turnTime}초
                        </div>
                      </div>
                      <button
                        onClick={() => joinRoomFromList(room.roomId)}
                        disabled={room.playerCount >= room.maxPlayers || room.gameStatus !== 'waiting'}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                      >
                        {room.playerCount >= room.maxPlayers ? '가득참' : room.gameStatus === 'playing' ? '게임중' : '참가'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 게임 화면
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 py-4 sm:py-6 md:py-8">
      <div className="container mx-auto px-2 sm:px-4">
        {/* 상단 정보 */}
        <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          {/* 연결 상태 표시 */}
          {!isConnected && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              서버 연결이 끊어졌습니다. 재연결 시도 중...
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-yellow-600 hover:text-yellow-800">
                ✕
              </button>
            </div>
          )}

          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <div>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
                Connect Four
                {isConnected && <span className="w-2 h-2 bg-green-500 rounded-full" />}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                방 ID: <span className="font-mono font-bold text-blue-600">{roomId}</span>
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                alert('방 ID가 복사되었습니다!');
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm md:text-base transition-colors"
            >
              ID 복사
            </button>
          </div>

          {/* 플레이어 정보 */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
            {/* 나 */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 bg-gray-50 rounded-lg">
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full ${
                  currentPlayer?.color === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                {isEditingNickname ? (
                  <div className="flex gap-1 sm:gap-2">
                    <input
                      type="text"
                      value={inputNickname}
                      onChange={(e) => setInputNickname(e.target.value)}
                      className="flex-1 min-w-0 px-1 sm:px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm text-gray-800"
                      maxLength={20}
                    />
                    <button
                      onClick={updateNickname}
                      className="bg-green-500 text-white px-1.5 sm:px-2 py-1 rounded text-xs sm:text-sm"
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="font-bold text-xs sm:text-sm md:text-base text-gray-800 truncate">{currentPlayer?.nickname || '나'}</span>
                    <button
                      onClick={() => {
                        setInputNickname(nickname);
                        setIsEditingNickname(true);
                      }}
                      className="text-blue-500 text-xs sm:text-sm hover:underline flex-shrink-0"
                    >
                      수정
                    </button>
                  </div>
                )}
              </div>
              {isMyTurn() && <span className="text-green-500 font-bold text-sm sm:text-base">●</span>}
            </div>

            {/* 상대방 */}
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 md:p-4 bg-gray-50 rounded-lg">
              <div
                className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full ${
                  opponent?.color === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                }`}
              />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-xs sm:text-sm md:text-base text-gray-800 truncate block">
                  {opponent?.nickname || '대기 중...'}
                </span>
              </div>
              {!isMyTurn() && gameState?.gameStatus === 'playing' && (
                <span className="text-green-500 font-bold text-sm sm:text-base">●</span>
              )}
            </div>
          </div>

          {/* 게임 상태 */}
          {gameState?.gameStatus === 'waiting' && gameState.players.length === 2 && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded-lg text-center">
              <p className="mb-3">플레이어가 모두 모였습니다! 돌림판을 돌려 선공을 결정하세요.</p>
              <button
                onClick={spinWheel}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                돌림판 돌리기
              </button>
            </div>
          )}

          {gameState?.gameStatus === 'waiting' && gameState.players.length < 2 && (
            <div className="mt-4 p-4 bg-blue-100 border border-blue-400 text-blue-800 rounded-lg text-center">
              상대방을 기다리는 중입니다...
            </div>
          )}

          {gameState?.gameStatus === 'playing' && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-100 border border-green-400 text-green-800 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 sm:gap-4">
                <span className="text-sm sm:text-base md:text-lg font-bold">남은 시간:</span>
                <span className={`text-xl sm:text-2xl md:text-3xl font-bold ${remainingTime <= 5 ? 'text-red-600 animate-pulse' : 'text-green-600'}`}>
                  {remainingTime}초
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 돌림판 모달 */}
        {isSpinning && gameState && firstPlayer !== undefined && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-2xl">
              <SpinWheel
                players={gameState.players}
                onSpinComplete={onSpinComplete}
                isSpinning={isSpinning}
                firstPlayer={firstPlayer}
              />
            </div>
          </div>
        )}

        {/* 게임 보드 */}
        {gameState && gameState.gameStatus !== 'spinning' && (
          <div className="flex justify-center">
            <GameBoard
              board={gameState.board}
              onColumnClick={handleColumnClick}
              isMyTurn={isMyTurn()}
              myColor={currentPlayer?.color || null}
              isDisabled={!isConnected || isMoving || gameState.gameStatus !== 'playing'}
            />
            {isMoving && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 text-white px-6 py-3 rounded-lg">
                착수 중...
              </div>
            )}
          </div>
        )}

        {/* 승리 모달 */}
        {showWinModal && gameState?.gameStatus === 'finished' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
              {gameState.winner ? (
                <>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-800">
                    {gameState.winner.socketId === socket?.id ? '🎉 승리!' : '😢 패배'}
                  </h2>
                  <p className="text-lg sm:text-xl text-gray-600 mb-4 sm:mb-6">
                    {gameState.winner.nickname}님이 승리했습니다!
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-800">무승부!</h2>
                  <p className="text-lg sm:text-xl text-gray-600 mb-4 sm:mb-6">보드가 가득 찼습니다.</p>
                </>
              )}
              <button
                onClick={resetGame}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base transition-colors"
              >
                다시 하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
