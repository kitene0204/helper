import React, { useState, useEffect, useRef } from 'react';
import { soundManager } from '../utils/audio';

export const TimerView: React.FC = () => {
  const [inputHr, setInputHr] = useState<number>(0);
  const [inputMin, setInputMin] = useState<number>(25);
  const [inputSec, setInputSec] = useState<number>(0);

  const [totalMs, setTotalMs] = useState<number>(25 * 60 * 1000);
  const [remainingMs, setRemainingMs] = useState<number>(25 * 60 * 1000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isWarning, setIsWarning] = useState<boolean>(false);

  const timerIdRef = useRef<number | null>(null);
  const endTimeRef = useRef<number>(0);
  const lastBeepSecRef = useRef<number>(-1);

  const formatTime = (ms: number) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.ceil(ms / 1000);
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');

    if (Math.floor(totalSeconds / 3600) > 0) {
      return `${h}:${m}:${s}`;
    }
    return `${m}:${s}`;
  };

  const timerLoop = () => {
    const now = Date.now();
    const diff = endTimeRef.current - now;

    if (diff <= 0) {
      setRemainingMs(0);
      setIsRunning(false);
      setIsFinished(true);
      setIsWarning(false);
      if (timerIdRef.current) clearInterval(timerIdRef.current);
      timerIdRef.current = null;
      soundManager.playAlarm();
    } else {
      setRemainingMs(diff);
      const secRemaining = Math.ceil(diff / 1000);
      if (secRemaining <= 10 && secRemaining > 0) {
        setIsWarning(true);
        if (lastBeepSecRef.current !== secRemaining) {
          soundManager.playCountdownTick();
          lastBeepSecRef.current = secRemaining;
        }
      } else {
        setIsWarning(false);
      }
    }
  };

  const handleStart = () => {
    if (isRunning || remainingMs <= 0) return;
    soundManager.playClick();
    endTimeRef.current = Date.now() + remainingMs;
    timerIdRef.current = window.setInterval(timerLoop, 20);
    setIsRunning(true);
    setIsFinished(false);
  };

  const handlePause = () => {
    if (!isRunning || !timerIdRef.current) return;
    soundManager.playClick();
    clearInterval(timerIdRef.current);
    timerIdRef.current = null;
    setIsRunning(false);
  };

  const handleReset = () => {
    soundManager.playClick();
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsRunning(false);
    setIsFinished(false);
    setIsWarning(false);
    lastBeepSecRef.current = -1;

    const ms = (inputHr * 3600 + inputMin * 60 + inputSec) * 1000 || 25 * 60 * 1000;
    setTotalMs(ms);
    setRemainingMs(ms);
  };

  const handleApplySetting = () => {
    if (isRunning) return;
    soundManager.playClick();
    let hr = Math.max(0, Math.min(99, inputHr || 0));
    let min = Math.max(0, Math.min(59, inputMin || 0));
    let sec = Math.max(0, Math.min(59, inputSec || 0));

    if (hr === 0 && min === 0 && sec === 0) {
      min = 1;
      setInputMin(1);
    }

    const ms = (hr * 3600 + min * 60 + sec) * 1000;
    setTotalMs(ms);
    setRemainingMs(ms);
    setIsFinished(false);
    setIsWarning(false);
  };

  // Visual pie background calculation
  const progress = totalMs > 0 ? Math.max(0, remainingMs / totalMs) : 0;
  const degrees = progress * 360;
  const pieBackground = `conic-gradient(#ff3b30 0deg, #ff3b30 ${degrees}deg, transparent ${degrees}deg, transparent 360deg)`;

  const isLongTime = remainingMs >= 3600000;

  return (
    <div id="mode-timer" className="flex flex-col items-center w-full max-w-4xl mx-auto py-2">
      {/* Visual Pie Timer Container */}
      <div className="relative w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] flex justify-center items-center">
        {/* Background circle and pie */}
        <div className="absolute w-full h-full rounded-full bg-white shadow-[0_15px_35px_rgba(0,0,0,0.1)] border-[10px] border-white overflow-hidden flex justify-center items-center">
          {/* Red Progress Pie */}
          <div
            id="timer-pie"
            className="absolute w-full h-full"
            style={{ background: pieBackground }}
          />

          {/* 4 Clock tick dots */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-600 rounded-full z-20" />
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-gray-600 rounded-full z-20" />
          <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-600 rounded-full z-20" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-gray-600 rounded-full z-20" />

          {/* Center Dark Circle */}
          <div className="absolute w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] bg-[#2d3436] rounded-full z-10 flex justify-center items-center shadow-[0_10px_25px_rgba(0,0,0,0.4)] border-4 border-[#1e272e]">
            <div
              id="timer-display"
              className={`font-bold tracking-widest transition-colors ${
                isLongTime ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl'
              } ${
                isFinished
                  ? 'text-[#ff4757] alarm-shake'
                  : isWarning
                  ? 'text-[#ff4757]'
                  : 'text-white'
              }`}
            >
              {formatTime(remainingMs)}
            </div>
          </div>
        </div>
      </div>

      {/* Warning Text */}
      <div
        id="timer-warning"
        className={`text-xl font-bold mt-6 transition-opacity ${
          isFinished
            ? 'text-red-600 opacity-100'
            : isWarning
            ? 'text-red-500 opacity-100'
            : 'opacity-0'
        }`}
      >
        {isFinished ? '시간 종료!! 🎉' : '10초 남았습니다! 집중! 🔥'}
      </div>

      {/* Time Setting Inputs Bar */}
      <div className="mt-6 flex flex-wrap items-center justify-center bg-white p-3 sm:p-4 rounded-2xl shadow-sm border-4 border-[#ffe0b2] gap-1.5 sm:gap-2">
        <span className="text-lg sm:text-xl text-gray-700 font-bold mr-1">시간 설정:</span>

        <div className="flex items-center">
          <input
            type="number"
            id="timer-input-hr"
            min={0}
            max={99}
            disabled={isRunning}
            value={inputHr}
            onChange={(e) => setInputHr(parseInt(e.target.value) || 0)}
            className="w-14 sm:w-16 text-center border-3 border-gray-200 rounded-xl p-1.5 text-xl sm:text-2xl font-bold focus:outline-none focus:border-[#ffb3ba] bg-gray-50 text-gray-700"
          />
          <span className="text-lg sm:text-xl text-gray-600 mx-1 font-bold">시간</span>
        </div>

        <div className="flex items-center">
          <input
            type="number"
            id="timer-input-min"
            min={0}
            max={59}
            disabled={isRunning}
            value={inputMin}
            onChange={(e) => setInputMin(parseInt(e.target.value) || 0)}
            className="w-14 sm:w-16 text-center border-3 border-gray-200 rounded-xl p-1.5 text-xl sm:text-2xl font-bold focus:outline-none focus:border-[#ffb3ba] bg-gray-50 text-gray-700"
          />
          <span className="text-lg sm:text-xl text-gray-600 mx-1 font-bold">분</span>
        </div>

        <div className="flex items-center">
          <input
            type="number"
            id="timer-input-sec"
            min={0}
            max={59}
            disabled={isRunning}
            value={inputSec}
            onChange={(e) => setInputSec(parseInt(e.target.value) || 0)}
            className="w-14 sm:w-16 text-center border-3 border-gray-200 rounded-xl p-1.5 text-xl sm:text-2xl font-bold focus:outline-none focus:border-[#ffb3ba] bg-gray-50 text-gray-700"
          />
          <span className="text-lg sm:text-xl text-gray-600 mx-1 font-bold">초</span>
        </div>

        <button
          type="button"
          disabled={isRunning}
          onClick={handleApplySetting}
          className="px-4 py-2 bg-[#ffdfba] hover:bg-[#ffcc99] text-[#d35400] text-lg font-bold rounded-xl transition transform hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          설정 적용
        </button>
      </div>

      {/* Preset Buttons for Quick Class Timers */}
      <div className="mt-3 flex flex-wrap gap-2 text-sm font-bold">
        <span className="text-gray-500 py-1">빠른 설정:</span>
        {[1, 3, 5, 10, 20, 25, 30].map((mins) => (
          <button
            key={mins}
            type="button"
            disabled={isRunning}
            onClick={() => {
              setInputHr(0);
              setInputMin(mins);
              setInputSec(0);
              const ms = mins * 60 * 1000;
              setTotalMs(ms);
              setRemainingMs(ms);
            }}
            className="px-2.5 py-1 bg-white hover:bg-orange-50 border border-orange-200 rounded-lg text-gray-700 text-xs sm:text-sm font-bold"
          >
            {mins}분
          </button>
        ))}
      </div>

      {/* Action Controls */}
      <div className="mt-7 flex gap-5">
        {!isRunning ? (
          <button
            id="btn-timer-start"
            type="button"
            onClick={handleStart}
            className="px-10 sm:px-14 py-3.5 sm:py-4 bg-gradient-to-r from-[#baffc9] to-[#7bed9f] text-[#1e7a35] text-2xl sm:text-3xl rounded-2xl font-bold shadow-[0_6px_0_#6ebf81] active:shadow-none active:translate-y-2 min-w-[160px] sm:min-w-[180px] transition-all hover:scale-105"
          >
            ▶ {remainingMs < totalMs && remainingMs > 0 ? '계속' : '시작'}
          </button>
        ) : (
          <button
            id="btn-timer-pause"
            type="button"
            onClick={handlePause}
            className="px-10 sm:px-14 py-3.5 sm:py-4 bg-gradient-to-r from-[#ffeaa7] to-[#ffd32a] text-[#b33939] text-2xl sm:text-3xl rounded-2xl font-bold shadow-[0_6px_0_#f3c832] active:shadow-none active:translate-y-2 min-w-[160px] sm:min-w-[180px] transition-all"
          >
            ⏸ 정지
          </button>
        )}

        <button
          id="btn-timer-reset"
          type="button"
          onClick={handleReset}
          className="px-8 sm:px-10 py-3.5 sm:py-4 bg-gray-200 hover:bg-gray-300 text-gray-600 text-2xl sm:text-3xl rounded-2xl font-bold shadow-[0_6px_0_#d1d5db] active:shadow-none active:translate-y-2 transition-all flex items-center gap-2"
        >
          🔄 리셋
        </button>
      </div>
    </div>
  );
};
