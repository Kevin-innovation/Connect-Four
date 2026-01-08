'use client';

import { Board, CellValue, Position } from '@/lib/types';
import { useState, useEffect } from 'react';

interface GameBoardProps {
  board: Board;
  onColumnClick: (column: number) => void;
  isMyTurn: boolean;
  myColor: 'red' | 'yellow' | null;
  isDisabled?: boolean;
  lastMove?: Position | null;
  winningPositions?: Position[];
}

export default function GameBoard({ board, onColumnClick, isMyTurn, myColor, isDisabled = false, lastMove, winningPositions = [] }: GameBoardProps) {
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);
  const [animatingCell, setAnimatingCell] = useState<{ row: number; col: number } | null>(null);
  const [isClicking, setIsClicking] = useState<boolean>(false);
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  // 터치 디바이스 감지
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window);
  }, []);

  // 각 열의 다음 빈 행 찾기
  const getNextEmptyRow = (column: number): number => {
    for (let row = 5; row >= 0; row--) {
      if (board[row][column] === null) {
        return row;
      }
    }
    return -1;
  };

  const handleColumnClick = (column: number) => {
    if (!isMyTurn || isDisabled || isClicking) return;
    const row = getNextEmptyRow(column);
    if (row === -1) return;

    // 첫 번째 클릭: 위치 선택
    if (selectedColumn !== column) {
      setSelectedColumn(column);
      return;
    }

    // 두 번째 클릭: 착수 확정
    setIsClicking(true);
    setAnimatingCell({ row, col: column });
    setSelectedColumn(null); // 선택 초기화
    setTimeout(() => {
      setAnimatingCell(null);
      onColumnClick(column);
      // 서버 응답을 기다리기 위해 클릭 상태는 유지
      setTimeout(() => setIsClicking(false), 500);
    }, 300);
  };

  // 승리 위치인지 확인
  const isWinningPosition = (row: number, col: number): boolean => {
    return winningPositions.some(pos => pos.row === row && pos.col === col);
  };

  // 마지막 착수 위치인지 확인
  const isLastMove = (row: number, col: number): boolean => {
    return lastMove !== null && lastMove !== undefined && lastMove.row === row && lastMove.col === col;
  };

  const getCellColor = (value: CellValue): string => {
    if (value === 'red') return 'bg-red-500';
    if (value === 'yellow') return 'bg-yellow-400';
    return 'bg-white';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 턴 인디케이터 화살표 */}
      {isMyTurn && !isDisabled && (
        <div className="text-center">
          <div className="text-green-500 text-4xl sm:text-5xl md:text-6xl font-bold animate-bounce">
            ▼
          </div>
          <div className="text-base sm:text-lg md:text-xl font-bold text-white mt-1">당신의 차례</div>
        </div>
      )}

      <div className="relative bg-blue-600 p-2 sm:p-3 md:p-4 rounded-lg shadow-2xl select-none">
        {/* 호버 인디케이터 레이어 */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 mb-1 sm:mb-1.5 md:mb-2">
          {Array.from({ length: 7 }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-200 touch-manipulation ${
                isMyTurn && !isDisabled && !isClicking
                  ? 'cursor-pointer active:scale-95'
                  : 'cursor-not-allowed'
              } ${
                selectedColumn === colIndex && isMyTurn && !isDisabled && !isClicking
                  ? myColor === 'red'
                    ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110 ring-4 ring-white'
                    : 'bg-yellow-400 shadow-lg shadow-yellow-400/50 scale-110 ring-4 ring-white'
                  : hoverColumn === colIndex && isMyTurn && !isDisabled && !isClicking && !isTouchDevice
                  ? myColor === 'red'
                    ? 'bg-red-500/70 shadow-lg shadow-red-500/30 scale-105'
                    : 'bg-yellow-400/70 shadow-lg shadow-yellow-400/30 scale-105'
                  : isMyTurn && !isDisabled && !isClicking
                  ? 'bg-gray-300/30 hover:bg-gray-300/50'
                  : 'bg-transparent'
              }`}
              onMouseEnter={() => !isTouchDevice && isMyTurn && !isDisabled && !isClicking && setHoverColumn(colIndex)}
              onMouseLeave={() => !isTouchDevice && setHoverColumn(null)}
              onClick={(e) => {
                if (!isTouchDevice) {
                  handleColumnClick(colIndex);
                }
              }}
              onTouchStart={(e) => {
                if (isMyTurn && !isDisabled && !isClicking) {
                  e.preventDefault();
                  handleColumnClick(colIndex);
                }
              }}
            >
              {/* 선택 표시 */}
              {selectedColumn === colIndex && isMyTurn && !isDisabled && !isClicking && (
                <div className="text-white text-xs sm:text-sm font-bold pointer-events-none">확정?</div>
              )}
            </div>
          ))}
        </div>

        {/* 게임 보드 */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 pointer-events-none">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const isWinning = isWinningPosition(rowIndex, colIndex);
              const isLast = isLastMove(rowIndex, colIndex);

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-blue-800 rounded-full flex items-center justify-center shadow-inner ${
                    isWinning ? 'ring-4 ring-green-400 animate-pulse' : isLast ? 'ring-3 ring-white' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full transition-all duration-300 ${getCellColor(
                      cell
                    )} ${
                      animatingCell?.row === rowIndex && animatingCell?.col === colIndex
                        ? 'scale-0'
                        : 'scale-100'
                    } ${isWinning ? 'shadow-lg shadow-green-500/50' : ''}`}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 턴 인디케이터 - 하단 */}
      {!isMyTurn && (
        <div className="mt-2 sm:mt-3 md:mt-4 text-center px-4">
          <div className="text-base sm:text-lg md:text-xl font-bold text-gray-200">상대방의 차례입니다</div>
        </div>
      )}
    </div>
  );
}
