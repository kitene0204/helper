import React, { useState, useEffect } from 'react';
import { soundManager } from '../utils/audio';
import { launchConfetti } from '../utils/confetti';

interface RelayViewProps {
  students: string[];
  onRemoveStudents: (names: string[]) => void;
  allowDuplicates: boolean;
  onReset: () => void;
}

export const RelayView: React.FC<RelayViewProps> = ({
  students,
  onRemoveStudents,
  allowDuplicates,
  onReset,
}) => {
  const [relayCount, setRelayCount] = useState<number>(students.length || 1);
  const [isSpinning, setIsSpinning] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [winningIndices, setWinningIndices] = useState<Set<number>>(new Set());
  const [dimmedIndices, setDimmedIndices] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (students.length > 0) {
      setRelayCount(students.length);
    }
  }, [students.length]);

  const startRelay = async () => {
    if (isSpinning || students.length === 0) return;

    soundManager.playClick();
    setIsSpinning(true);
    setResults([]);
    setWinningIndices(new Set());
    setDimmedIndices(new Set());

    let count = Math.max(1, Math.min(relayCount, students.length));

    // Shuffle indices
    const shuffled = Array.from({ length: students.length }, (_, i) => i);
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const winnersIndices = shuffled.slice(0, count);
    const chosenWinnerNames: string[] = [];

    const highlights = count >= 10 ? 3 : count >= 5 ? 6 : 9;
    const highlightDelay = count >= 10 ? 25 : 55;
    const personDelay = count >= 10 ? 200 : 550;

    for (let i = 0; i < winnersIndices.length; i++) {
      const targetIndex = winnersIndices[i];

      // Highlight roulette effect over cards
      for (let j = 0; j < highlights; j++) {
        const randomIdx = Math.floor(Math.random() * students.length);
        setHighlightedIndex(randomIdx);
        soundManager.playTick(700 + j * 20);
        await new Promise((r) => setTimeout(r, highlightDelay));
      }
      setHighlightedIndex(null);

      // Pick winner
      setWinningIndices((prev) => new Set([...prev, targetIndex]));
      soundManager.playPop();

      const winnerName = students[targetIndex];
      chosenWinnerNames.push(winnerName);
      setResults((prev) => [...prev, winnerName]);

      await new Promise((r) => setTimeout(r, personDelay));

      // Dim card
      setDimmedIndices((prev) => new Set([...prev, targetIndex]));
    }

    soundManager.playFanfare();
    launchConfetti(3000);

    setTimeout(() => {
      setIsSpinning(false);
      if (!allowDuplicates) {
        onRemoveStudents(chosenWinnerNames);
      }
    }, 2000);
  };

  const handleReset = () => {
    if (isSpinning) return;
    setResults([]);
    setWinningIndices(new Set());
    setDimmedIndices(new Set());
    setHighlightedIndex(null);
    onReset();
  };

  return (
    <div id="mode-relay" className="flex flex-col items-center w-full max-w-6xl mx-auto">
      {/* Relay Config Bar */}
      <div className="w-full bg-white p-5 sm:p-6 rounded-3xl shadow-sm mb-6 flex flex-wrap justify-between items-center gap-4 border-4 border-[#bae1ff]">
        <div className="text-xl sm:text-2xl text-gray-700 font-bold flex items-center flex-wrap gap-2">
          <span>
            🎯 총 <span id="relay-total-students" className="text-blue-500">{students.length}</span>명 중 몇 명을 뽑을까요?
          </span>
          <div className="flex items-center gap-1">
            <input
              id="relay-count"
              type="number"
              value={relayCount}
              min={1}
              max={students.length || 1}
              disabled={isSpinning || students.length === 0}
              onChange={(e) => setRelayCount(parseInt(e.target.value) || 1)}
              className="w-20 sm:w-24 text-center border-4 border-gray-200 rounded-xl p-2 text-2xl sm:text-3xl font-bold focus:outline-none focus:border-[#bae1ff] bg-gray-50"
            />
            <span className="text-2xl">명</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="relay-btn"
            type="button"
            disabled={isSpinning || students.length === 0}
            onClick={startRelay}
            className={`px-8 sm:px-10 py-3.5 sm:py-4 text-xl sm:text-2xl rounded-2xl font-bold transition-all ${
              isSpinning || students.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#bae1ff] hover:bg-[#9ecdf5] text-[#1c6fa6] shadow-[0_6px_0_#86bbdf] active:shadow-none active:translate-y-2'
            }`}
          >
            {isSpinning ? '🏃 릴레이 뽑는 중...' : '릴레이 시작!'}
          </button>

          <button
            id="relay-reset-btn"
            type="button"
            disabled={isSpinning}
            onClick={handleReset}
            className="px-6 py-3.5 sm:py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xl rounded-2xl shadow-[0_6px_0_#d1d5db] active:shadow-none active:translate-y-2 transition-all font-bold flex items-center gap-1"
          >
            🔄 리셋
          </button>
        </div>
      </div>

      {/* Main Relay Split View */}
      <div className="flex flex-col lg:flex-row w-full gap-6 items-start">
        {/* Left: Students Card Grid */}
        <div
          id="relay-grid"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 flex-1 w-full content-start"
        >
          {students.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-400 text-2xl sm:text-3xl font-bold">
              모두 뽑았습니다!<br />
              <span className="text-lg sm:text-xl text-blue-500 mt-2 block">
                리셋 버튼을 눌러 명단을 초기화하세요.
              </span>
            </div>
          ) : (
            students.map((student, index) => {
              const isHighlighted = highlightedIndex === index;
              const isWinner = winningIndices.has(index);
              const isDimmed = dimmedIndices.has(index);

              return (
                <div
                  key={index}
                  id={`relay-card-${index}`}
                  className={`flex items-center justify-center min-h-[75px] rounded-2xl p-2.5 text-center font-bold transition-all select-none border-3 text-xl ${
                    isWinner
                      ? 'bg-[#baffc9] border-[#2ed573] text-[#2ed573] scale-105 shadow-md animate-pop z-10'
                      : isHighlighted
                      ? 'bg-[#ffe0b2] border-[#ffb3ba] text-[#d35400] scale-105 shadow-sm'
                      : isDimmed
                      ? 'bg-gray-100 border-gray-200 text-gray-400 opacity-40 scale-95'
                      : 'bg-white border-[#f1f2f6] text-gray-700 hover:border-blue-200 shadow-2xs'
                  }`}
                  style={{
                    fontSize: student.length >= 4 ? '1.15rem' : '1.35rem',
                    letterSpacing: student.length >= 4 ? '-1px' : 'normal',
                  }}
                >
                  {student}
                </div>
              );
            })
          )}
        </div>

        {/* Right: Results Timeline Box */}
        <div
          id="relay-results-box"
          className="w-full lg:w-80 bg-white border-4 border-gray-100 rounded-3xl p-5 flex flex-col h-[460px] shadow-sm shrink-0"
        >
          <h3 className="text-xl font-bold text-gray-700 mb-3 text-center border-b pb-2.5">
            🏆 릴레이 순서 ({results.length}명)
          </h3>
          <div
            id="relay-results-container"
            className="flex-1 overflow-y-auto pr-1 space-y-2.5"
          >
            {results.length === 0 ? (
              <div className="text-gray-400 text-center mt-24 text-base sm:text-lg">
                추첨을 시작하면<br />결과가 나타납니다.
              </div>
            ) : (
              results.map((winner, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 bg-white border-2 border-[#bae1ff] text-[#1c6fa6] p-2.5 rounded-2xl font-bold shadow-xs animate-slide-up"
                >
                  <span className="bg-[#1c6fa6] text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-lg">{winner}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
