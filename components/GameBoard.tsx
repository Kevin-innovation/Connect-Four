'use client';

import { Board, CellValue } from '@/lib/types';
import { useState, useEffect } from 'react';

interface GameBoardProps {
  board: Board;
  onColumnClick: (column: number) => void;
  isMyTurn: boolean;
  myColor: 'red' | 'yellow' | null;
  isDisabled?: boolean;
}

export default function GameBoard({ board, onColumnClick, isMyTurn, myColor, isDisabled = false }: GameBoardProps) {
  const [hoverColumn, setHoverColumn] = useState<number | null>(null);
  const [animatingCell, setAnimatingCell] = useState<{ row: number; col: number } | null>(null);
  const [isClicking, setIsClicking] = useState<boolean>(false);

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

    setIsClicking(true);
    setAnimatingCell({ row, col: column });
    setTimeout(() => {
      setAnimatingCell(null);
      onColumnClick(column);
      // 서버 응답을 기다리기 위해 클릭 상태는 유지
      setTimeout(() => setIsClicking(false), 500);
    }, 300);
  };

  const getCellColor = (value: CellValue): string => {
    if (value === 'red') return 'bg-red-500';
    if (value === 'yellow') return 'bg-yellow-400';
    return 'bg-white';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative bg-blue-600 p-2 sm:p-3 md:p-4 rounded-lg shadow-2xl">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2">
          {Array.from({ length: 7 }).map((_, colIndex) => (
            <div key={colIndex} className="flex flex-col gap-1 sm:gap-1.5 md:gap-2">
              {/* 호버 인디케이터 - 향상된 시각적 피드백 */}
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isMyTurn && !isDisabled && !isClicking
                    ? 'cursor-pointer'
                    : 'cursor-not-allowed'
                } ${
                  hoverColumn === colIndex && isMyTurn && !isDisabled && !isClicking
                    ? myColor === 'red'
                      ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110'
                      : 'bg-yellow-400 shadow-lg shadow-yellow-400/50 scale-110'
                    : isMyTurn && !isDisabled && !isClicking
                    ? 'bg-gray-300/30 hover:bg-gray-300/50'
                    : 'bg-transparent'
                }`}
                onMouseEnter={() => isMyTurn && !isDisabled && !isClicking && setHoverColumn(colIndex)}
                onMouseLeave={() => setHoverColumn(null)}
                onClick={() => handleColumnClick(colIndex)}
                onTouchStart={() => isMyTurn && !isDisabled && !isClicking && setHoverColumn(colIndex)}
                onTouchEnd={() => setHoverColumn(null)}
              >
                {/* 화살표 아이콘 */}
                {hoverColumn === colIndex && isMyTurn && !isDisabled && !isClicking && (
                  <div className="text-white text-lg sm:text-xl md:text-2xl font-bold animate-bounce">
                    ▼
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 게임 보드 */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 md:gap-2 mt-1 sm:mt-1.5 md:mt-2">
          {board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 bg-blue-800 rounded-full flex items-center justify-center shadow-inner"
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full transition-all duration-300 ${getCellColor(
                    cell
                  )} ${
                    animatingCell?.row === rowIndex && animatingCell?.col === colIndex
                      ? 'scale-0'
                      : 'scale-100'
                  }`}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* 턴 인디케이터 */}
      <div className="mt-2 sm:mt-3 md:mt-4 text-center px-4">
        {isMyTurn ? (
          <div className="text-base sm:text-lg md:text-xl font-bold text-green-500 animate-pulse">당신의 차례입니다!</div>
        ) : (
          <div className="text-base sm:text-lg md:text-xl font-bold text-gray-400">상대방의 차례입니다</div>
        )}
      </div>
    </div>
  );
}
