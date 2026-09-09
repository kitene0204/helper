import React, { useRef, useEffect, useState } from 'react';
import { soundManager } from '../utils/audio';
import { launchConfetti } from '../utils/confetti';

interface RouletteViewProps {
  students: string[];
  onRemoveStudent: (name: string) => void;
  allowDuplicates: boolean;
  onReset: () => void;
}

const PASTEL_COLORS = [
  '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E8B2FF',
  '#FFB2D9', '#B2FFF7', '#E2F0CB', '#FFD1DC', '#D4F0F0', '#F3E5AB',
];

export const RouletteView: React.FC<RouletteViewProps> = ({
  students,
  onRemoveStudent,
  allowDuplicates,
  onReset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<HTMLDivElement | null>(null);

  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerText, setWinnerText] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const currentRotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  const flickPointer = () => {
    const pointer = pointerRef.current;
    if (!pointer) return;
    pointer.style.transition = 'none';
    pointer.style.transform = 'translateX(-50%) rotate(-15deg)';
    setTimeout(() => {
      if (pointer) {
        pointer.style.transition = 'transform 0.1s ease-out';
        pointer.style.transform = 'translateX(-50%) rotate(0deg)';
      }
    }, 15);
  };

  const drawRoulette = (rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const cx = cw / 2;
    const cy = ch / 2;
    const radius = cw / 2 - 12;

    ctx.clearRect(0, 0, cw, ch);

    if (students.length === 0) {
      ctx.fillStyle = '#f8f9fa';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#adb5bd';
      ctx.font = '32px Jua, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('모두 뽑았습니다!', cx, cy - 10);
      ctx.font = '20px Jua, sans-serif';
      ctx.fillText('초기화 하려면 리셋 버튼 클릭', cx, cy + 30);
      return;
    }

    const arc = (Math.PI * 2) / students.length;

    for (let i = 0; i < students.length; i++) {
      const angle = rotation + i * arc;

      ctx.beginPath();
      ctx.fillStyle = PASTEL_COLORS[i % PASTEL_COLORS.length];
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, angle, angle + arc);
      ctx.lineTo(cx, cy);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.save();
      ctx.translate(
        cx + Math.cos(angle + arc / 2) * (radius - 55),
        cy + Math.sin(angle + arc / 2) * (radius - 55)
      );
      ctx.rotate(angle + arc / 2 + Math.PI / 2);
      ctx.fillStyle = '#333333';

      const fontSize = students.length > 20 ? 14 : students.length > 10 ? 18 : 24;
      ctx.font = `bold ${fontSize}px Jua, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(students[i], 0, 0);
      ctx.restore();
    }
  };

  useEffect(() => {
    drawRoulette(currentRotationRef.current);
  }, [students]);

  const easeOut = (t: number, b: number, c: number, d: number) => {
    const ts = (t /= d) * t;
    const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
  };

  const spinRoulette = () => {
    if (isSpinning || students.length === 0) return;

    soundManager.playClick();
    setIsSpinning(true);
    setWinnerText(null);

    const spinAngleStart = Math.random() * 10 + 20;
    let spinTime = 0;
    const spinTimeTotal = Math.random() * 2500 + 3800; // ~4-5 seconds
    const arc = (Math.PI * 2) / students.length;
    let lastTickAngle = currentRotationRef.current;

    const rotateWheel = () => {
      spinTime += 30;
      if (spinTime >= spinTimeTotal) {
        stopRotateWheel();
        return;
      }

      const spinAngle = easeOut(spinTime, 0, spinAngleStart, spinTimeTotal);
      currentRotationRef.current += (spinAngle * Math.PI) / 180;

      if (currentRotationRef.current - lastTickAngle >= arc) {
        soundManager.playTick(750);
        flickPointer();
        lastTickAngle += arc;
      }

      drawRoulette(currentRotationRef.current);
      animFrameRef.current = requestAnimationFrame(rotateWheel);
    };

    rotateWheel();
  };

  const stopRotateWheel = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const arc = (Math.PI * 2) / students.length;
    const degrees = (currentRotationRef.current * 180) / Math.PI + 90;
    const arcd = (arc * 180) / Math.PI;
    const index = Math.floor((360 - (degrees % 360)) / arcd) % students.length;
    const winner = students[index];

    setWinnerText(`${winner} 당첨! 🎉`);
    setResults((prev) => [...prev, winner]);

    soundManager.playFanfare();
    launchConfetti(3500);

    setTimeout(() => {
      setIsSpinning(false);
      if (!allowDuplicates) {
        onRemoveStudent(winner);
      }
    }, 2800);
  };

  const handleReset = () => {
    if (isSpinning) return;
    setResults([]);
    setWinnerText(null);
    onReset();
  };

  return (
    <div id="mode-roulette" className="flex flex-col items-center w-full max-w-5xl mx-auto">
      {/* Roulette Stage */}
      <div className="flex flex-col items-center">
        {/* Roulette Wheel & Pointer */}
        <div className="relative w-[360px] h-[360px] sm:w-[440px] sm:h-[440px] my-4 flex items-center justify-center">
          {/* Triangular Pointer */}
          <div
            ref={pointerRef}
            id="roulette-pointer"
            className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[45px] border-t-[#ff4757] drop-shadow-md origin-top"
          />
          {/* Wheel Canvas */}
          <canvas
            ref={canvasRef}
            id="roulette-canvas"
            width={440}
            height={440}
            className="w-full h-full rounded-full bg-white shadow-[0_15px_35px_rgba(0,0,0,0.15)] border-[10px] border-white"
          />
        </div>

        {/* Winner Announcement Banner */}
        <div className="h-16 flex items-center justify-center">
          {winnerText && (
            <h2
              id="roulette-winner-text"
              className="text-3xl sm:text-4xl text-[#ff6b6b] font-bold drop-shadow-md animate-bounce"
            >
              {winnerText}
            </h2>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
          <button
            id="spin-btn"
            type="button"
            disabled={isSpinning || students.length === 0}
            onClick={spinRoulette}
            className={`px-10 sm:px-14 py-3.5 sm:py-4 text-2xl sm:text-3xl rounded-2xl font-bold transition-all ${
              isSpinning || students.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-[#baffc9] to-[#7bed9f] text-[#1e7a35] shadow-[0_6px_0_#6ebf81] active:shadow-none active:translate-y-2 hover:scale-105'
            }`}
          >
            {isSpinning ? '🎡 돌아가는 중...' : '추첨 시작!'}
          </button>

          <button
            id="roulette-reset-btn"
            type="button"
            disabled={isSpinning}
            onClick={handleReset}
            className="px-7 sm:px-8 py-3.5 sm:py-4 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xl sm:text-2xl rounded-2xl shadow-[0_6px_0_#d1d5db] active:shadow-none active:translate-y-2 transition-all font-bold flex items-center gap-1.5"
          >
            🔄 리셋
          </button>
        </div>

        <div className="mt-3 text-sm text-gray-500 font-bold">
          현재 대기 중인 학생: <span className="text-[#ff6b6b]">{students.length}명</span>
          {!allowDuplicates && ' (중복 금지: 당첨 시 명단 제외)'}
        </div>
      </div>

      {/* Roulette Results Box */}
      <div className="mt-8 w-full max-w-4xl bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-700 mb-4 text-center border-b pb-3">
          🏆 돌림판 당첨 결과 ({results.length}명)
        </h3>
        <div
          id="roulette-results-container"
          className="flex flex-wrap justify-center gap-3 min-h-[60px] content-start"
        >
          {results.length === 0 ? (
            <div className="text-gray-400 text-center w-full mt-2 text-lg sm:text-xl">
              추첨을 시작하면 결과가 여기에 기록됩니다.
            </div>
          ) : (
            results.map((winner, idx) => (
              <div
                key={idx}
                className="inline-flex items-center gap-2 bg-white border-2 border-[#bae1ff] text-[#1c6fa6] px-4 py-2 rounded-full font-bold shadow-xs text-lg animate-slide-up"
              >
                <span className="bg-[#1c6fa6] text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </span>
                <span>{winner}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
