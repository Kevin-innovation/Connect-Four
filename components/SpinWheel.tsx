'use client';

import { Player } from '@/lib/types';
import { useEffect, useState, useRef } from 'react';

interface SpinWheelProps {
  players: Player[];
  onSpinComplete: (firstPlayer: number) => void;
  isSpinning: boolean;
  firstPlayer?: number;
}

export default function SpinWheel({ players, onSpinComplete, isSpinning, firstPlayer }: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevSpinRef = useRef<{ isSpinning: boolean; firstPlayer?: number }>({
    isSpinning: false,
    firstPlayer: undefined
  });

  useEffect(() => {
    // 새로운 스핀 시작 감지
    const isNewSpin =
      isSpinning &&
      firstPlayer !== undefined &&
      (!prevSpinRef.current.isSpinning || prevSpinRef.current.firstPlayer !== firstPlayer);

    if (isNewSpin) {
      console.log('SpinWheel starting NEW animation, firstPlayer:', firstPlayer);

      // 1단계: transition 끄고 초기 위치로 리셋
      setIsAnimating(false);
      setRotation(0);

      // 2단계: 다음 프레임에서 transition 켜고 회전 시작
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
          const targetRotation = 360 * 5 + (firstPlayer === 0 ? 0 : 180);
          console.log('Setting rotation to:', targetRotation);
          setRotation(targetRotation);
        });
      });

      const timer = setTimeout(() => {
        console.log('SpinWheel animation complete');
        setIsAnimating(false);
        onSpinComplete(firstPlayer);
      }, 3000);

      // 현재 값 저장
      prevSpinRef.current = { isSpinning, firstPlayer };

      return () => clearTimeout(timer);
    }

    // 스핀 종료 감지
    if (!isSpinning && prevSpinRef.current.isSpinning) {
      console.log('SpinWheel ended, resetting prevSpinRef');
      prevSpinRef.current = { isSpinning: false, firstPlayer: undefined };
    }
  }, [isSpinning, firstPlayer, onSpinComplete]);

  const player1 = players[0];
  const player2 = players[1];

  return (
    <div className="flex flex-col items-center gap-4 sm:gap-6 px-4">
      <h3 className="text-xl sm:text-2xl font-bold text-gray-800">선공 결정 중...</h3>

      <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64">
        {/* 화살표 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-3 sm:-translate-y-4 z-10">
          <div className="w-0 h-0 border-l-[15px] sm:border-l-[20px] border-l-transparent border-r-[15px] sm:border-r-[20px] border-r-transparent border-t-[22px] sm:border-t-[30px] border-t-red-500"></div>
        </div>

        {/* 돌림판 */}
        <div
          className={`w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden shadow-2xl transition-transform ${
            isAnimating ? 'duration-[3000ms]' : 'duration-500'
          } ease-out`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* 플레이어 1 (빨강) */}
          <div className="absolute top-0 left-0 w-full h-1/2 bg-red-500 flex items-end justify-center pb-3 sm:pb-4">
            <div className="text-white font-bold text-base sm:text-lg md:text-xl">{player1?.nickname || '플레이어 1'}</div>
          </div>

          {/* 플레이어 2 (노랑) */}
          <div className="absolute bottom-0 left-0 w-full h-1/2 bg-yellow-400 flex items-start justify-center pt-3 sm:pt-4">
            <div className="text-gray-800 font-bold text-base sm:text-lg md:text-xl">{player2?.nickname || '플레이어 2'}</div>
          </div>
        </div>
      </div>

      <div className="text-sm sm:text-base text-gray-600 animate-pulse">돌림판이 회전하고 있습니다...</div>
    </div>
  );
}
