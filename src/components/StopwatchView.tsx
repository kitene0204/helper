import React, { useState, useRef, useEffect } from 'react';
import { LapRecord } from '../types';
import { soundManager } from '../utils/audio';

export const StopwatchView: React.FC = () => {
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [laps, setLaps] = useState<LapRecord[]>([]);

  const timerIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const formatStopwatchTime = (msTotal: number) => {
    const m = Math.floor(msTotal / 60000).toString().padStart(2, '0');
    const s = Math.floor((msTotal % 60000) / 1000).toString().padStart(2, '0');
    const ms = Math.floor((msTotal % 1000) / 10).toString().padStart(2, '0');
    return { m, s, ms };
  };

  const handleStart = () => {
    if (isRunning) return;
    soundManager.playClick();
    startTimeRef.current = Date.now() - elapsedMs;
    timerIdRef.current = window.setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 16);
    setIsRunning(true);
  };

  const handlePause = () => {
    if (!isRunning || !timerIdRef.current) return;
    soundManager.playClick();
    clearInterval(timerIdRef.current);
    timerIdRef.current = null;
    setIsRunning(false);
  };

  const handleRecordLap = () => {
    if (!isRunning) return;
    soundManager.playPop();
    const formatted = formatStopwatchTime(elapsedMs);
    const lapString = `${formatted.m}:${formatted.s}.${formatted.ms}`;
    const newLap: LapRecord = {
      id: laps.length + 1,
      lapTime: lapString,
      timestamp: Date.now(),
    };
    setLaps((prev) => [newLap, ...prev]);
  };

  const handleReset = () => {
    soundManager.playClick();
    if (timerIdRef.current) {
      clearInterval(timerIdRef.current);
      timerIdRef.current = null;
    }
    setIsRunning(false);
    setElapsedMs(0);
    setLaps([]);
  };

  const time = formatStopwatchTime(elapsedMs);

  return (
    <div
      id="mode-stopwatch"
      className="flex flex-col lg:flex-row items-start w-full max-w-6xl mx-auto gap-8 py-2"
    >
      {/* Left: Stopwatch Main Display */}
      <div className="flex-1 w-full flex flex-col items-center bg-white p-6 sm:p-10 rounded-3xl shadow-sm border-4 border-[#bae1ff]">
        <h2 className="text-2xl sm:text-3xl text-gray-600 font-bold mb-6">
          스피드 스톱워치
        </h2>

        {/* Digital Clock Display */}
        <div className="bg-gray-50 border-4 border-[#bae1ff] rounded-3xl w-full py-10 sm:py-12 flex justify-center items-end mb-8 sm:mb-10 shadow-inner">
          <span
            id="sw-display-min"
            className="text-6xl sm:text-8xl font-bold text-gray-700 tracking-tight"
          >
            {time.m}
          </span>
          <span className="text-5xl sm:text-7xl font-bold text-gray-700 mb-1 sm:mb-2 mx-1">
            :
          </span>
          <span
            id="sw-display-sec"
            className="text-6xl sm:text-8xl font-bold text-gray-700 tracking-tight"
          >
            {time.s}
          </span>
          <span className="text-4xl sm:text-5xl font-bold text-gray-400 mb-1 sm:mb-2 mx-1">
            .
          </span>
          <span
            id="sw-display-ms"
            className="text-4xl sm:text-5xl font-bold text-gray-400 mb-1 sm:mb-2 w-[60px] sm:w-[70px] text-left"
          >
            {time.ms}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-3 sm:gap-4 w-full justify-center">
          {!isRunning ? (
            <button
              id="btn-sw-start"
              type="button"
              onClick={handleStart}
              className="flex-1 min-w-[130px] py-3.5 sm:py-4 bg-gradient-to-r from-[#baffc9] to-[#7bed9f] text-[#1e7a35] text-2xl sm:text-3xl rounded-2xl font-bold shadow-[0_6px_0_#6ebf81] active:shadow-none active:translate-y-2 transition-all hover:scale-105"
            >
              ▶ {elapsedMs > 0 ? '계속' : '시작'}
            </button>
          ) : (
            <button
              id="btn-sw-pause"
              type="button"
              onClick={handlePause}
              className="flex-1 min-w-[130px] py-3.5 sm:py-4 bg-gradient-to-r from-[#ffeaa7] to-[#ffd32a] text-[#b33939] text-2xl sm:text-3xl rounded-2xl font-bold shadow-[0_6px_0_#f3c832] active:shadow-none active:translate-y-2 transition-all"
            >
              ⏸ 일시정지
            </button>
          )}

          <button
            id="btn-sw-lap"
            type="button"
            disabled={!isRunning}
            onClick={handleRecordLap}
            className={`flex-1 min-w-[130px] py-3.5 sm:py-4 text-2xl sm:text-3xl rounded-2xl font-bold transition-all ${
              isRunning
                ? 'bg-gradient-to-r from-[#bae1ff] to-[#74b9ff] text-[#0984e3] shadow-[0_6px_0_#62a5e8] active:shadow-none active:translate-y-2 hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            ⏱️ 기록
          </button>

          <button
            id="btn-sw-reset"
            type="button"
            onClick={handleReset}
            className="flex-1 min-w-[130px] py-3.5 sm:py-4 bg-gray-200 hover:bg-gray-300 text-gray-600 text-2xl sm:text-3xl rounded-2xl font-bold shadow-[0_6px_0_#d1d5db] active:shadow-none active:translate-y-2 transition-all flex items-center justify-center gap-1.5"
          >
            🔄 리셋
          </button>
        </div>
      </div>

      {/* Right: Lap Times Container */}
      <div className="w-full lg:w-[380px] bg-white border-4 border-gray-100 rounded-3xl p-5 sm:p-6 flex flex-col h-[520px] shadow-sm shrink-0">
        <div className="flex items-center justify-between border-b pb-3 mb-3">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-700">
            📝 측정 기록 ({laps.length}회)
          </h3>
          {laps.length > 0 && (
            <button
              type="button"
              onClick={() => setLaps([])}
              className="text-xs text-gray-400 hover:text-red-500 font-bold"
            >
              기록 지우기
            </button>
          )}
        </div>

        <div id="lap-results-container" className="flex-1 overflow-y-auto pr-1 space-y-2.5">
          {laps.length === 0 ? (
            <div
              id="lap-empty-msg"
              className="text-gray-400 text-center mt-28 text-lg sm:text-xl font-bold"
            >
              측정을 시작하고<br />
              기록 버튼을 눌러보세요.
            </div>
          ) : (
            laps.map((lap) => (
              <div
                key={lap.id}
                className="flex items-center justify-between bg-white border-3 border-[#f1f2f6] rounded-2xl p-3 shadow-xs animate-slide-up"
              >
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#bae1ff] text-[#1c6fa6] rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                    {lap.id}
                  </span>
                  <span className="text-lg font-bold text-gray-700">구간 기록</span>
                </div>
                <span className="text-2xl font-bold tracking-wider text-blue-600">
                  {lap.lapTime}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
