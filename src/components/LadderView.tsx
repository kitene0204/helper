import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users,
  Sparkles,
  Shuffle,
  Play,
  RotateCcw,
  CheckCircle2,
  Copy,
  Printer,
  ChevronRight,
  HelpCircle,
  Volume2,
  VolumeX,
  FastForward,
  Layers,
  Pencil,
  Plus,
  Trash2,
  ArrowDownRight,
  ArrowDownLeft,
  Minus,
} from 'lucide-react';
import {
  LadderBridge,
  BridgeType,
  LADDER_PRESET_THEMES,
  generateLadderBridges,
  traceLadderPath,
  solveAllLadderMatches,
  toggleBridgeAt,
  canPlaceBridge,
} from '../utils/ladderGame';
import { LadderParticipantModal } from './LadderParticipantModal';
import { LadderThemeModal } from './LadderThemeModal';
import { soundManager } from '../utils/audio';

// Cheerful color palette for ladder tracks
const PARTICIPANT_COLORS = [
  { border: '#ef4444', fill: '#fee2e2', text: '#b91c1c', line: '#ef4444' }, // red
  { border: '#f97316', fill: '#ffedd5', text: '#c2410c', line: '#f97316' }, // orange
  { border: '#eab308', fill: '#fef9c3', text: '#a16207', line: '#eab308' }, // yellow
  { border: '#10b981', fill: '#d1fae5', text: '#047857', line: '#10b981' }, // green
  { border: '#06b6d4', fill: '#cffafe', text: '#0e7490', line: '#06b6d4' }, // cyan
  { border: '#3b82f6', fill: '#dbeafe', text: '#1d4ed8', line: '#3b82f6' }, // blue
  { border: '#8b5cf6', fill: '#ede9fe', text: '#6d28d9', line: '#8b5cf6' }, // violet
  { border: '#ec4899', fill: '#fce7f3', text: '#be185d', line: '#ec4899' }, // pink
  { border: '#14b8a6', fill: '#ccfbf1', text: '#0f766e', line: '#14b8a6' }, // teal
  { border: '#f43f5e', fill: '#ffe4e6', text: '#be123c', line: '#f43f5e' }, // rose
  { border: '#84cc16', fill: '#ecfccb', text: '#4d7c0f', line: '#84cc16' }, // lime
  { border: '#6366f1', fill: '#e0e7ff', text: '#4338ca', line: '#6366f1' }, // indigo
];

interface LadderViewProps {
  students: string[];
}

export const LadderView: React.FC<LadderViewProps> = ({ students }) => {
  // Current active participants (default to all students, or initial 6 if empty)
  const [participants, setParticipants] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('class_helper_ladder_participants_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      }
    } catch {}
    return students.length >= 2 ? [...students] : ['학생1', '학생2', '학생3', '학생4'];
  });

  // Results for each bottom slot (1:1 with participant count)
  const [results, setResults] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('class_helper_ladder_results_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed;
      }
    } catch {}
    const defaultTheme = LADDER_PRESET_THEMES[0];
    const initialCount = students.length >= 2 ? students.length : 4;
    return Array.from(
      { length: initialCount },
      (_, i) => defaultTheme.items[i % defaultTheme.items.length]
    );
  });

  // Number of horizontal levels for bridges
  const levelsCount = 11;

  // Bridges state
  const [bridges, setBridges] = useState<LadderBridge[]>(() =>
    generateLadderBridges(participants.length, levelsCount)
  );

  // Custom Draw Mode state (allowing kids to click to add/remove bridges)
  const [isCustomDrawMode, setIsCustomDrawMode] = useState(false);
  const [drawTool, setDrawTool] = useState<BridgeType>('horizontal');
  const [hoveredSlot, setHoveredSlot] = useState<{ col: number; level: number } | null>(null);
  const [drawFeedback, setDrawFeedback] = useState<{
    text: string;
    type: 'info' | 'success' | 'warn';
  } | null>(null);

  // Auto-dismiss drawFeedback notice
  useEffect(() => {
    if (!drawFeedback) return;
    const timer = setTimeout(() => {
      setDrawFeedback(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [drawFeedback]);

  // Modals
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  // Game state: completed participants -> endCol
  const [completedMatches, setCompletedMatches] = useState<
    Record<number, { endCol: number; result: string }>
  >({});
  const [revealedResultSlots, setRevealedResultSlots] = useState<Set<number>>(new Set());

  // Animation state for single runner
  const [activeRunner, setActiveRunner] = useState<{
    colIndex: number;
    points: { x: number; y: number }[];
    currentPointIndex: number;
    pos: { x: number; y: number };
  } | null>(null);

  // Auto-play all in sequence
  const [isAutoPlayingAll, setIsAutoPlayingAll] = useState(false);

  // Ladder dimensions
  const colGap = 120;
  const topPadding = 45;
  const bottomPadding = 45;
  const svgHeight = 440;
  const svgWidth = Math.max(720, participants.length * colGap);

  const getColX = (col: number) => {
    if (participants.length <= 1) return svgWidth / 2;
    const padding = 50;
    const available = svgWidth - padding * 2;
    return padding + (col * available) / (participants.length - 1);
  };

  const getLevelY = (level: number) => {
    const playable = svgHeight - topPadding - bottomPadding;
    return topPadding + ((level + 1) * playable) / (levelsCount + 1);
  };

  // Keep results array matching participant count
  useEffect(() => {
    if (results.length !== participants.length) {
      const defaultTheme = LADDER_PRESET_THEMES[0];
      setResults((prev) => {
        const next = [...prev];
        while (next.length < participants.length) {
          next.push(defaultTheme.items[next.length % defaultTheme.items.length]);
        }
        return next.slice(0, participants.length);
      });
    }
  }, [participants.length]);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        'class_helper_ladder_participants_v2',
        JSON.stringify(participants)
      );
    } catch {}
  }, [participants]);

  useEffect(() => {
    try {
      localStorage.setItem('class_helper_ladder_results_v2', JSON.stringify(results));
    } catch {}
  }, [results]);

  // Interactive bridge toggling (add/remove on click)
  const handleToggleBridge = (col: number, level: number, forcedType?: BridgeType) => {
    if (activeRunner) return; // Prevent editing during active run

    const targetType = forcedType || drawTool;
    const result = toggleBridgeAt(bridges, col, level, targetType, levelsCount);

    if (result.action === 'added' || result.action === 'replaced') {
      soundManager.playPop();
      setBridges(result.bridges);
      // Reset prior finished paths to keep consistency
      if (Object.keys(completedMatches).length > 0) {
        setCompletedMatches({});
        setRevealedResultSlots(new Set());
      }
      const typeLabel =
        targetType === 'diagonal_down_right'
          ? '우하향 대각선 (미끄럼틀 ↘)'
          : targetType === 'diagonal_down_left'
          ? '좌하향 대각선 (미끄럼틀 ↙)'
          : '가로 다리 (➖)';
      setDrawFeedback({
        text:
          result.action === 'replaced'
            ? `🔄 ${typeLabel}로 모양을 바꿨어요!`
            : `✨ ${typeLabel}를 새로 연결했어요!`,
        type: 'success',
      });
    } else if (result.action === 'removed') {
      soundManager.playClick();
      setBridges(result.bridges);
      if (Object.keys(completedMatches).length > 0) {
        setCompletedMatches({});
        setRevealedResultSlots(new Set());
      }
      setDrawFeedback({ text: '✂️ 다리를 지웠어요!', type: 'info' });
    } else if (result.action === 'blocked') {
      soundManager.playClick();
      setDrawFeedback({
        text:
          result.reason ||
          '⚠️ 다른 다리와 겹치는 위치에는 다리를 놓을 수 없어요.',
        type: 'warn',
      });
    }
  };

  // Clear all bridges (empty ladder for kids to draw from scratch)
  const handleClearAllBridges = () => {
    soundManager.playClick();
    setBridges([]);
    if (Object.keys(completedMatches).length > 0) {
      setCompletedMatches({});
      setRevealedResultSlots(new Set());
    }
    setDrawFeedback({
      text: '🧹 모든 다리를 지웠어요. 이제 원하는 칸을 눌러 아이들이 직접 다리를 그려보세요!',
      type: 'info',
    });
  };

  // Add random bridges to empty valid spots (including diagonal slides)
  const handleAddRandomBridges = (countToAdd: number = 3) => {
    soundManager.playPop();
    let current = [...bridges];
    let added = 0;

    const bridgeTypes: BridgeType[] = [
      'horizontal',
      'horizontal',
      'diagonal_down_right',
      'diagonal_down_left',
    ];

    const validOptions: { col: number; level: number; type: BridgeType }[] = [];
    for (let c = 0; c < participants.length - 1; c++) {
      for (let l = 0; l < levelsCount; l++) {
        for (const type of bridgeTypes) {
          if (canPlaceBridge(current, c, l, type, levelsCount).allowed) {
            validOptions.push({ col: c, level: l, type });
          }
        }
      }
    }

    const shuffled = [...validOptions].sort(() => Math.random() - 0.5);
    for (const opt of shuffled) {
      if (added >= countToAdd) break;
      const res = toggleBridgeAt(
        current,
        opt.col,
        opt.level,
        opt.type,
        levelsCount
      );
      if (res.action === 'added') {
        current = res.bridges;
        added++;
      }
    }

    setBridges(current);
    if (Object.keys(completedMatches).length > 0) {
      setCompletedMatches({});
      setRevealedResultSlots(new Set());
    }
    setDrawFeedback({
      text: `🎲 랜덤 다리 ${added}개를 추가했어요! (가로선 & 대각선)`,
      type: 'success',
    });
  };

  // Regenerate bridges when participant count changes
  const handleRegenerateBridges = () => {
    soundManager.playPop();
    const newBridges = generateLadderBridges(participants.length, levelsCount);
    setBridges(newBridges);
    setCompletedMatches({});
    setRevealedResultSlots(new Set());
    setActiveRunner(null);
    setIsAutoPlayingAll(false);
    setDrawFeedback({
      text: '🎲 사다리를 새로운 무작위 모양으로 다시 그렸어요!',
      type: 'info',
    });
  };

  // Confetti trigger
  const launchConfetti = () => {
    if (typeof window !== 'undefined' && (window as any).confetti) {
      try {
        (window as any).confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {}
    }
  };

  // Run a specific participant down the ladder
  const runParticipant = (colIndex: number) => {
    if (activeRunner) return; // already running
    soundManager.playPop();

    const { points, endCol } = traceLadderPath(
      colIndex,
      participants.length,
      levelsCount,
      bridges,
      svgWidth,
      svgHeight,
      topPadding,
      bottomPadding
    );

    setActiveRunner({
      colIndex,
      points,
      currentPointIndex: 0,
      pos: points[0],
    });
  };

  // Step the runner along waypoints
  useEffect(() => {
    if (!activeRunner) return;

    const { points, currentPointIndex, colIndex } = activeRunner;

    if (currentPointIndex >= points.length - 1) {
      // Reached destination!
      const finalPoint = points[points.length - 1];
      const endCol = Math.round(
        (finalPoint.x - 50) / ((svgWidth - 100) / (participants.length - 1))
      );
      const safeEndCol = Math.max(0, Math.min(endCol, results.length - 1));
      const finalResult = results[safeEndCol] || `결과 ${safeEndCol + 1}`;

      setCompletedMatches((prev) => ({
        ...prev,
        [colIndex]: { endCol: safeEndCol, result: finalResult },
      }));
      setRevealedResultSlots((prev) => new Set([...prev, safeEndCol]));

      soundManager.playFanfare();
      launchConfetti();
      setActiveRunner(null);

      // If auto-playing, continue to next uncompleted participant
      if (isAutoPlayingAll) {
        setTimeout(() => {
          setCompletedMatches((latest) => {
            const nextIdx = participants.findIndex((_, idx) => !latest[idx]);
            if (nextIdx !== -1) {
              runParticipant(nextIdx);
            } else {
              setIsAutoPlayingAll(false);
            }
            return latest;
          });
        }, 800);
      }
      return;
    }

    // Step to next point
    const timer = setTimeout(() => {
      soundManager.playLadderStep(550 + (currentPointIndex % 4) * 80);
      setActiveRunner((prev) => {
        if (!prev) return null;
        const nextIndex = prev.currentPointIndex + 1;
        return {
          ...prev,
          currentPointIndex: nextIndex,
          pos: prev.points[nextIndex],
        };
      });
    }, 90);

    return () => clearTimeout(timer);
  }, [activeRunner, isAutoPlayingAll]);

  // Start auto-play for all remaining students
  const handleStartAutoPlayAll = () => {
    if (activeRunner) return;
    setIsAutoPlayingAll(true);
    const nextIdx = participants.findIndex((_, idx) => !completedMatches[idx]);
    if (nextIdx !== -1) {
      runParticipant(nextIdx);
    } else {
      setIsAutoPlayingAll(false);
    }
  };

  // Instant solve all
  const handleRevealAllInstant = () => {
    soundManager.playPop();
    const allMatches = solveAllLadderMatches(
      participants,
      levelsCount,
      bridges,
      results
    );

    const matchesMap: Record<number, { endCol: number; result: string }> = {};
    const slotsSet = new Set<number>();

    allMatches.forEach((m) => {
      matchesMap[m.startCol] = { endCol: m.endCol, result: m.result };
      slotsSet.add(m.endCol);
    });

    setCompletedMatches(matchesMap);
    setRevealedResultSlots(slotsSet);
    setActiveRunner(null);
    setIsAutoPlayingAll(false);
    soundManager.playFanfare();
    launchConfetti();
  };

  // Reset progress
  const handleResetRun = () => {
    soundManager.playClick();
    setCompletedMatches({});
    setRevealedResultSlots(new Set());
    setActiveRunner(null);
    setIsAutoPlayingAll(false);
  };

  // Copy results summary
  const handleCopyResults = () => {
    if (Object.keys(completedMatches).length === 0) {
      alert('먼저 사다리를 타거나 전체 결과를 확인해주세요.');
      return;
    }

    const lines: string[] = ['🪜 [우리 반 사다리타기 결과]'];
    participants.forEach((name, idx) => {
      const match = completedMatches[idx];
      lines.push(`${name} ➡️ ${match ? match.result : '(미완료)'}`);
    });

    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      alert('사다리타기 결과가 클립보드에 복사되었습니다! 알림장 등에 붙여넣기 하세요.');
    });
  };

  // Print results
  const handlePrintResults = () => {
    window.print();
  };

  // Calculate traced completed paths for drawing finished tracks
  const completedPaths = useMemo(() => {
    const paths: { colIndex: number; points: { x: number; y: number }[] }[] = [];
    Object.keys(completedMatches).forEach((idxStr) => {
      const colIndex = parseInt(idxStr, 10);
      const { points } = traceLadderPath(
        colIndex,
        participants.length,
        levelsCount,
        bridges,
        svgWidth,
        svgHeight,
        topPadding,
        bottomPadding
      );
      paths.push({ colIndex, points });
    });
    return paths;
  }, [completedMatches, participants.length, levelsCount, bridges, svgWidth, svgHeight]);

  const allCompleted = participants.length > 0 && Object.keys(completedMatches).length === participants.length;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Title & Quick Action Toolbar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border-2 border-orange-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-3xl">🪜</span>
            <h1 className="text-xl sm:text-2xl font-extrabold text-amber-950">
              신나는 사다리타기
            </h1>
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
              참가자 {participants.length}명
            </span>
            <span className="bg-amber-800 text-amber-50 border border-amber-700 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs">
              🪵 원목 사다리 테마
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            원하는 학생을 자유롭게 선택하고, 학생을 직접 클릭해 사다리를 타고 내려가세요!
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              soundManager.playPop();
              setIsCustomDrawMode((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs sm:text-sm rounded-xl border shadow-xs transition ${
              isCustomDrawMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 ring-2 ring-amber-300'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
            }`}
          >
            <Pencil className="h-4 w-4" />
            <span>✏️ 사다리 직접 그리기 {isCustomDrawMode ? '(ON)' : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsParticipantModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs sm:text-sm rounded-xl border border-amber-300 shadow-2xs transition"
          >
            <Users className="h-4 w-4 text-amber-600" />
            <span>👥 참가자 선택 ({participants.length}명)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsThemeModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-950 font-bold text-xs sm:text-sm rounded-xl border border-orange-300 shadow-2xs transition"
          >
            <Sparkles className="h-4 w-4 text-orange-600" />
            <span>🎯 결과 항목 설정</span>
          </button>

          <button
            type="button"
            onClick={handleRegenerateBridges}
            className="flex items-center gap-1 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm rounded-xl border border-gray-300 shadow-2xs transition"
            title="새로운 사다리 다리를 무작위로 생성합니다"
          >
            <Shuffle className="h-4 w-4 text-gray-500" />
            <span>랜덤 섞기</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Play / Fast Forward / Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#fff7ed] rounded-2xl border border-orange-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-orange-900">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>
            진행 상황:{' '}
            <strong className="text-rose-600">
              {Object.keys(completedMatches).length}
            </strong>{' '}
            / {participants.length}명 완료
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!allCompleted && (
            <>
              <button
                type="button"
                onClick={handleStartAutoPlayAll}
                disabled={Boolean(activeRunner)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition"
              >
                <Play className="h-3.5 w-3.5" />
                <span>차례대로 전체 출발 ▶</span>
              </button>

              <button
                type="button"
                onClick={handleRevealAllInstant}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs transition"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span>⚡ 전체 결과 즉시 공개</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleResetRun}
            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-600 font-bold text-xs sm:text-sm rounded-xl border border-gray-300 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* MAIN LADDER BOARD */}
      <div className="bg-gradient-to-b from-[#fdfbf7] via-[#faf5ec] to-[#f6eee2] rounded-3xl p-4 sm:p-6 shadow-md border-4 border-[#cfa376] overflow-hidden flex flex-col items-center">
        {/* Draw Mode Active Banner & Controls */}
        {isCustomDrawMode && (
          <div className="w-full bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-dashed border-amber-400 rounded-2xl p-3 sm:p-4 mb-4 flex flex-col gap-3 animate-fade-in shadow-2xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-1.5 bg-amber-100 rounded-xl shadow-2xs">✏️</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-amber-950 flex items-center gap-2">
                    <span>사다리 직접 그리기 모드</span>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                      현재 다리: {bridges.length}개
                    </span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-amber-800 mt-0.5">
                    원하는 모양을 고른 후 <strong>사다리 사이를 클릭해 다리를 놓아보세요!</strong> (이미 있는 다리를 누르면 지워집니다)
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleClearAllBridges}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-300 text-xs font-bold rounded-xl shadow-2xs transition"
                  title="모든 다리를 지우고 빈 기둥에서 아이들이 완전히 새로 그릴 수 있습니다"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>🧹 모두 지우기</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddRandomBridges(3)}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl shadow-2xs transition"
                  title="랜덤으로 다리 3개를 추가합니다"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-600" />
                  <span>🎲 3개 더 추가</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegenerateBridges}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 text-xs font-bold rounded-xl shadow-2xs transition"
                  title="랜덤으로 다시 섞습니다"
                >
                  <Shuffle className="h-3.5 w-3.5 text-gray-500" />
                  <span>랜덤 섞기</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    setIsCustomDrawMode(false);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>그리기 완료</span>
                </button>
              </div>
            </div>

            {/* Shape Selector Bar */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-amber-300/60">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-extrabold text-amber-950 mr-1 flex items-center gap-1">
                  <span>📐 다리 종류:</span>
                </span>

                {/* Horizontal Bridge Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    setDrawTool('horizontal');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition shadow-2xs ${
                    drawTool === 'horizontal'
                      ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300'
                      : 'bg-white text-amber-950 border-amber-300 hover:bg-amber-50'
                  }`}
                >
                  <Minus className="h-4 w-4 stroke-[3]" />
                  <span>가로선 (기본)</span>
                </button>

                {/* Diagonal Down-Right Bridge Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    setDrawTool('diagonal_down_right');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition shadow-2xs ${
                    drawTool === 'diagonal_down_right'
                      ? 'bg-purple-600 text-white border-purple-700 ring-2 ring-purple-300'
                      : 'bg-white text-purple-900 border-purple-300 hover:bg-purple-50'
                  }`}
                >
                  <ArrowDownRight className="h-4 w-4 stroke-[3]" />
                  <span>우하향 대각선 ↘</span>
                </button>

                {/* Diagonal Down-Left Bridge Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playPop();
                    setDrawTool('diagonal_down_left');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition shadow-2xs ${
                    drawTool === 'diagonal_down_left'
                      ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-300'
                      : 'bg-white text-indigo-900 border-indigo-300 hover:bg-indigo-50'
                  }`}
                >
                  <ArrowDownLeft className="h-4 w-4 stroke-[3]" />
                  <span>좌하향 대각선 ↙</span>
                </button>
              </div>

              <span className="text-[11px] text-amber-900/80 font-medium">
                🎢 <strong>대각선 다리</strong>는 아래 칸으로 쓩 미끄러져 내려가는 신나는 미끄럼틀 다리예요!
              </span>
            </div>
          </div>
        )}

        {/* Floating Notification Toast for Bridge Drawing */}
        {drawFeedback && (
          <div
            className={`w-full py-2 px-4 rounded-xl text-xs sm:text-sm font-bold text-center mb-3 animate-fade-in border shadow-xs ${
              drawFeedback.type === 'success'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : drawFeedback.type === 'warn'
                ? 'bg-rose-100 text-rose-900 border-rose-300'
                : 'bg-sky-100 text-sky-900 border-sky-300'
            }`}
          >
            {drawFeedback.text}
          </div>
        )}

        {/* Normal Helper Hint */}
        {!isCustomDrawMode && (
          <div className="w-full text-center text-xs sm:text-sm font-bold text-amber-800 bg-amber-50/80 py-2.5 px-4 rounded-xl border border-amber-200 mb-4 flex items-center justify-between flex-wrap gap-2">
            <span>
              👉 <strong>학생 이름 카드</strong>를 누르면 사다리를 탑니다! <strong>사다리 사이를 클릭해 다리를 추가/삭제</strong>하거나 상단 <strong>[✏️ 사다리 직접 그리기]</strong>를 켜보세요.
            </span>
            <button
              type="button"
              onClick={() => {
                soundManager.playPop();
                setIsCustomDrawMode(true);
              }}
              className="text-xs text-amber-900 bg-amber-100/90 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300 font-extrabold cursor-pointer transition"
            >
              ✏️ 직접 그리기 모드 켜기
            </button>
          </div>
        )}

        {/* Horizontal Scroll Wrapper for Responsive Board */}
        <div className="w-full overflow-x-auto pb-4 flex justify-center">
          <div
            className="flex flex-col items-center"
            style={{ minWidth: `${svgWidth}px` }}
          >
            {/* TOP ROW: PARTICIPANT BUTTONS */}
            <div className="w-full flex items-center justify-between px-6 mb-2">
              {participants.map((name, idx) => {
                const color = PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length];
                const isCompleted = Boolean(completedMatches[idx]);
                const isRunningThis = activeRunner?.colIndex === idx;

                return (
                  <button
                    key={`${name}-${idx}`}
                    type="button"
                    onClick={() => runParticipant(idx)}
                    disabled={isCompleted || Boolean(activeRunner)}
                    style={{
                      width: '108px',
                      borderColor: color.border,
                      backgroundColor: isCompleted
                        ? color.fill
                        : isRunningThis
                        ? '#fef08a'
                        : '#ffffff',
                    }}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border-2 shadow-xs transition-all ${
                      isRunningThis
                        ? 'ring-4 ring-amber-400 scale-105 animate-bounce z-20'
                        : isCompleted
                        ? 'opacity-90 scale-98 shadow-inner'
                        : 'hover:scale-105 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <span
                      style={{ color: color.text }}
                      className="text-[10px] font-extrabold uppercase tracking-wider"
                    >
                      {idx + 1}번
                    </span>
                    <span className="font-extrabold text-sm sm:text-base text-gray-800 truncate max-w-[96px]">
                      {name}
                    </span>

                    <span
                      className={`mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isRunningThis
                          ? 'bg-amber-400 text-amber-950 animate-pulse'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {isCompleted ? '✓ 완료' : isRunningThis ? '🏃 이동 중' : '출발 ▶'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* SVG LADDER CANVAS */}
            <div className="relative w-full flex justify-center">
              <svg
                width={svgWidth}
                height={svgHeight}
                className="overflow-visible select-none"
              >
                <defs>
                  {/* Glowing Filter for Active Runner */}
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>

                  {/* 1. Vertical Wooden Pole Gradient (3D Round Timber) */}
                  <linearGradient id="woodPoleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#542b10" />
                    <stop offset="18%" stopColor="#87471d" />
                    <stop offset="42%" stopColor="#b8723c" />
                    <stop offset="60%" stopColor="#9c5424" />
                    <stop offset="85%" stopColor="#763914" />
                    <stop offset="100%" stopColor="#45200c" />
                  </linearGradient>

                  {/* Highlight sheen for 3D wood cylinder reflection */}
                  <linearGradient id="woodPoleHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                    <stop offset="35%" stopColor="#fef08a" stopOpacity="0.3" />
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0.45" />
                    <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>

                  {/* 2. Horizontal Wooden Rung Gradient (Dowel Round Step) */}
                  <linearGradient id="woodRungGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e08a46" />
                    <stop offset="25%" stopColor="#c36d2b" />
                    <stop offset="65%" stopColor="#964816" />
                    <stop offset="100%" stopColor="#552408" />
                  </linearGradient>

                  {/* Horizontal Wooden Rung Hover Gradient */}
                  <linearGradient id="woodRungHoverGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="25%" stopColor="#f59e0b" />
                    <stop offset="65%" stopColor="#d97706" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>

                  {/* 3. Wood Pole End-Cap (Tree Ring / Dowel Cross-Section) */}
                  <radialGradient id="woodCapRadial" cx="45%" cy="45%" r="50%">
                    <stop offset="0%" stopColor="#e89f61" />
                    <stop offset="35%" stopColor="#b76326" />
                    <stop offset="65%" stopColor="#803e13" />
                    <stop offset="90%" stopColor="#5c290a" />
                    <stop offset="100%" stopColor="#3d1704" />
                  </radialGradient>

                  {/* 4. Diagonal Polished Wooden Slide (Right ↘) */}
                  <linearGradient id="woodSlideGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#b8571e" />
                    <stop offset="30%" stopColor="#d97734" />
                    <stop offset="60%" stopColor="#e88c48" />
                    <stop offset="85%" stopColor="#a34714" />
                    <stop offset="100%" stopColor="#692909" />
                  </linearGradient>

                  {/* Diagonal Polished Wooden Slide (Left ↙) */}
                  <linearGradient id="woodSlideGradLeft" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#b8571e" />
                    <stop offset="30%" stopColor="#d97734" />
                    <stop offset="60%" stopColor="#e88c48" />
                    <stop offset="85%" stopColor="#a34714" />
                    <stop offset="100%" stopColor="#692909" />
                  </linearGradient>
                </defs>

                {/* 1. Base Vertical Wooden Ladder Poles (원목 기둥) */}
                {participants.map((_, col) => {
                  const x = getColX(col);
                  return (
                    <g key={`col_${col}`}>
                      {/* Cast shadow behind wooden pole */}
                      <line
                        x1={x + 3}
                        y1={topPadding + 2}
                        x2={x + 3}
                        y2={svgHeight - bottomPadding + 2}
                        stroke="#451a03"
                        strokeOpacity="0.14"
                        strokeWidth="13"
                        strokeLinecap="round"
                      />
                      {/* Main solid wooden pole beam */}
                      <line
                        x1={x}
                        y1={topPadding}
                        x2={x}
                        y2={svgHeight - bottomPadding}
                        stroke="url(#woodPoleGrad)"
                        strokeWidth="11"
                        strokeLinecap="round"
                      />
                      {/* Longitudinal glossy wood reflection highlight */}
                      <line
                        x1={x - 1.5}
                        y1={topPadding + 6}
                        x2={x - 1.5}
                        y2={svgHeight - bottomPadding - 6}
                        stroke="url(#woodPoleHighlight)"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      {/* Natural wood grain notches (나무 결 디테일) */}
                      {[0.25, 0.5, 0.75].map((pct, notchIdx) => {
                        const notchY =
                          topPadding + (svgHeight - topPadding - bottomPadding) * pct;
                        return (
                          <line
                            key={`notch_${col}_${notchIdx}`}
                            x1={x - 4}
                            y1={notchY}
                            x2={x + 4}
                            y2={notchY}
                            stroke="#3d1704"
                            strokeWidth="1.2"
                            strokeOpacity="0.45"
                            strokeLinecap="round"
                          />
                        );
                      })}

                      {/* Top wooden dowel cap with tree ring radial */}
                      <circle
                        cx={x}
                        cy={topPadding}
                        r="8"
                        fill="url(#woodCapRadial)"
                        stroke="#3d1704"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={x}
                        cy={topPadding}
                        r="4.2"
                        fill="none"
                        stroke="#78350f"
                        strokeWidth="0.8"
                        opacity="0.6"
                      />
                      <circle
                        cx={x}
                        cy={topPadding}
                        r="1.5"
                        fill="#fde047"
                        opacity="0.85"
                      />

                      {/* Bottom wooden dowel cap */}
                      <circle
                        cx={x}
                        cy={svgHeight - bottomPadding}
                        r="8"
                        fill="url(#woodCapRadial)"
                        stroke="#3d1704"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={x}
                        cy={svgHeight - bottomPadding}
                        r="4.2"
                        fill="none"
                        stroke="#78350f"
                        strokeWidth="0.8"
                        opacity="0.6"
                      />
                      <circle
                        cx={x}
                        cy={svgHeight - bottomPadding}
                        r="1.5"
                        fill="#fde047"
                        opacity="0.85"
                      />
                    </g>
                  );
                })}

                {/* 2. Interactive Bridge Slots & Bridges (Horizontal & Diagonals in Wood Theme) */}
                {Array.from({ length: participants.length - 1 }).map((_, col) => {
                  const x1 = getColX(col);
                  const x2 = getColX(col + 1);

                  return Array.from({ length: levelsCount }).map((_, level) => {
                    const yTop = getLevelY(level);
                    const yBottom =
                      level < levelsCount - 1 ? getLevelY(level + 1) : yTop;

                    const bridge = bridges.find(
                      (b) => b.col === col && b.level === level
                    );
                    const hasBridge = Boolean(bridge);
                    const bridgeType = bridge?.type || 'horizontal';

                    const isHovered =
                      hoveredSlot?.col === col && hoveredSlot?.level === level;
                    const check = canPlaceBridge(
                      bridges,
                      col,
                      level,
                      drawTool,
                      levelsCount
                    );
                    const isAllowed = check.allowed;
                    const key = `slot_${col}_${level}`;

                    // Bridge coordinates
                    let bx1 = x1;
                    let by1 = yTop;
                    let bx2 = x2;
                    let by2 = yTop;
                    let bMidX = (x1 + x2) / 2;
                    let bMidY = yTop;

                    if (bridgeType === 'diagonal_down_right') {
                      bx1 = x1;
                      by1 = yTop;
                      bx2 = x2;
                      by2 = yBottom;
                      bMidX = (x1 + x2) / 2;
                      bMidY = (yTop + yBottom) / 2;
                    } else if (bridgeType === 'diagonal_down_left') {
                      bx1 = x2;
                      by1 = yTop;
                      bx2 = x1;
                      by2 = yBottom;
                      bMidX = (x1 + x2) / 2;
                      bMidY = (yTop + yBottom) / 2;
                    }

                    // Preview coordinates if empty
                    let px1 = x1 + 6;
                    let py1 = yTop;
                    let px2 = x2 - 6;
                    let py2 = yTop;
                    let pmidX = (x1 + x2) / 2;
                    let pmidY = yTop;
                    let pSymbol = '+';
                    let toolColor = '#d97706';

                    if (drawTool === 'diagonal_down_right' && level < levelsCount - 1) {
                      px1 = x1 + 6;
                      py1 = yTop + 4;
                      px2 = x2 - 6;
                      py2 = yBottom - 4;
                      pmidX = (x1 + x2) / 2;
                      pmidY = (yTop + yBottom) / 2;
                      pSymbol = '↘';
                      toolColor = '#b45309';
                    } else if (drawTool === 'diagonal_down_left' && level < levelsCount - 1) {
                      px1 = x2 - 6;
                      py1 = yTop + 4;
                      px2 = x1 + 6;
                      py2 = yBottom - 4;
                      pmidX = (x1 + x2) / 2;
                      pmidY = (yTop + yBottom) / 2;
                      pSymbol = '↙';
                      toolColor = '#b45309';
                    }

                    // Hit overlay bounds
                    const isDiagonalSpan =
                      (hasBridge && bridgeType !== 'horizontal') ||
                      (!hasBridge && drawTool !== 'horizontal' && level < levelsCount - 1);
                    const rectY = isDiagonalSpan ? yTop - 8 : yTop - 14;
                    const rectHeight = isDiagonalSpan
                      ? Math.max(28, yBottom - yTop + 16)
                      : 28;

                    return (
                      <g key={key} className="select-none">
                        {/* A. If bridge exists: Render Wooden Bridge with craftsmanship styling */}
                        {hasBridge && (
                          <g>
                            {/* 1. Horizontal Wooden Rung (원목 가로 발판) */}
                            {bridgeType === 'horizontal' && (
                              <g>
                                {/* Cast shadow */}
                                <line
                                  x1={x1 + 3}
                                  y1={yTop + 3}
                                  x2={x2 - 3}
                                  y2={yTop + 3}
                                  stroke="#451a03"
                                  strokeOpacity={isHovered ? 0.35 : 0.22}
                                  strokeWidth="9"
                                  strokeLinecap="round"
                                />
                                {/* Main cylindrical wooden rung */}
                                <line
                                  x1={x1 + 1}
                                  y1={yTop}
                                  x2={x2 - 1}
                                  y2={yTop}
                                  stroke={
                                    isHovered
                                      ? 'url(#woodRungHoverGrad)'
                                      : 'url(#woodRungGrad)'
                                  }
                                  strokeWidth={isHovered ? 9 : 7.5}
                                  strokeLinecap="round"
                                />
                                {/* Top edge sunlight highlight */}
                                <line
                                  x1={x1 + 5}
                                  y1={yTop - 1.8}
                                  x2={x2 - 5}
                                  y2={yTop - 1.8}
                                  stroke="#ffedd5"
                                  strokeOpacity={isHovered ? 0.9 : 0.65}
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                                {/* Mortise & Tenon Joint Pegs at Pole Attachments (장부맞춤 나무 못) */}
                                <circle
                                  cx={x1}
                                  cy={yTop}
                                  r={isHovered ? 6.5 : 5.5}
                                  fill="#5c290a"
                                  stroke={isHovered ? '#f59e0b' : '#8c4316'}
                                  strokeWidth="1.2"
                                />
                                <circle
                                  cx={x1}
                                  cy={yTop}
                                  r={isHovered ? 3.5 : 2.5}
                                  fill="#d97706"
                                />

                                <circle
                                  cx={x2}
                                  cy={yTop}
                                  r={isHovered ? 6.5 : 5.5}
                                  fill="#5c290a"
                                  stroke={isHovered ? '#f59e0b' : '#8c4316'}
                                  strokeWidth="1.2"
                                />
                                <circle
                                  cx={x2}
                                  cy={yTop}
                                  r={isHovered ? 3.5 : 2.5}
                                  fill="#d97706"
                                />
                              </g>
                            )}

                            {/* 2. Diagonal Wooden Slide (대각선 나무 미끄럼틀) */}
                            {bridgeType !== 'horizontal' && (
                              <g>
                                {/* Slide drop shadow */}
                                <line
                                  x1={bx1 + 3}
                                  y1={by1 + 3}
                                  x2={bx2 + 3}
                                  y2={by2 + 3}
                                  stroke="#451a03"
                                  strokeOpacity={isHovered ? 0.35 : 0.22}
                                  strokeWidth="10"
                                  strokeLinecap="round"
                                />
                                {/* Main wooden slide chute */}
                                <line
                                  x1={bx1}
                                  y1={by1}
                                  x2={bx2}
                                  y2={by2}
                                  stroke={
                                    bridgeType === 'diagonal_down_right'
                                      ? 'url(#woodSlideGradRight)'
                                      : 'url(#woodSlideGradLeft)'
                                  }
                                  strokeWidth={isHovered ? 9.5 : 8}
                                  strokeLinecap="round"
                                />
                                {/* Polished wooden slide surface sheen */}
                                <line
                                  x1={bx1 + (bx2 > bx1 ? 3 : -3)}
                                  y1={by1 + 1.2}
                                  x2={bx2 + (bx2 > bx1 ? -3 : 3)}
                                  y2={by2 - 1.2}
                                  stroke="#fef3c7"
                                  strokeOpacity={isHovered ? 0.85 : 0.6}
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                />
                                {/* Slide entrance and exit joint pegs */}
                                <circle
                                  cx={bx1}
                                  cy={by1}
                                  r={isHovered ? 6.5 : 5.5}
                                  fill="#5c290a"
                                  stroke={isHovered ? '#f59e0b' : '#d97706'}
                                  strokeWidth="1.2"
                                />
                                <circle cx={bx1} cy={by1} r="2.5" fill="#fef3c7" />

                                <circle
                                  cx={bx2}
                                  cy={by2}
                                  r={isHovered ? 6.5 : 5.5}
                                  fill="#5c290a"
                                  stroke={isHovered ? '#f59e0b' : '#d97706'}
                                  strokeWidth="1.2"
                                />
                                <circle cx={bx2} cy={by2} r="2.5" fill="#fef3c7" />
                              </g>
                            )}

                            {/* Center indicator badge */}
                            {(isHovered || isCustomDrawMode) && !activeRunner ? (
                              <g className="transition-transform">
                                <circle
                                  cx={bMidX}
                                  cy={bMidY}
                                  r={isHovered ? 12 : 10}
                                  fill={isHovered ? '#ef4444' : '#fee2e2'}
                                  stroke={isHovered ? '#ffffff' : '#f87171'}
                                  strokeWidth="1.5"
                                />
                                <text
                                  x={bMidX}
                                  y={bMidY + 3.5}
                                  textAnchor="middle"
                                  fill={isHovered ? '#ffffff' : '#dc2626'}
                                  fontSize={isHovered ? '12' : '10'}
                                  fontWeight="900"
                                >
                                  ✕
                                </text>
                              </g>
                            ) : bridgeType !== 'horizontal' ? (
                              <g>
                                <circle
                                  cx={bMidX}
                                  cy={bMidY}
                                  r={8.5}
                                  fill="#78350f"
                                  stroke="#fde047"
                                  strokeWidth="1.5"
                                />
                                <text
                                  x={bMidX}
                                  y={bMidY + 3.5}
                                  textAnchor="middle"
                                  fill="#fef3c7"
                                  fontSize="10"
                                  fontWeight="bold"
                                >
                                  {bridgeType === 'diagonal_down_right'
                                    ? '↘'
                                    : '↙'}
                                </text>
                              </g>
                            ) : null}
                          </g>
                        )}

                        {/* B. If bridge does NOT exist: Show guide lines when in Draw Mode or Hovered */}
                        {!hasBridge &&
                          isAllowed &&
                          !activeRunner &&
                          (isCustomDrawMode || isHovered) && (
                            <g>
                              <line
                                x1={px1}
                                y1={py1}
                                x2={px2}
                                y2={py2}
                                stroke={isHovered ? toolColor : '#c8ad8d'}
                                strokeWidth={isHovered ? 4 : 2.5}
                                strokeDasharray={isHovered ? 'none' : '4 4'}
                                strokeLinecap="round"
                                strokeOpacity={isHovered ? 1 : 0.75}
                              />
                              {/* Center + Badge */}
                              <circle
                                cx={pmidX}
                                cy={pmidY}
                                r={isHovered ? 10 : 8}
                                fill={isHovered ? toolColor : '#fcf8f2'}
                                stroke={isHovered ? '#ffffff' : '#b38e69'}
                                strokeWidth="1.5"
                              />
                              <text
                                x={pmidX}
                                y={pmidY + 3.5}
                                textAnchor="middle"
                                fill={isHovered ? '#ffffff' : '#8c5e32'}
                                fontSize={
                                  isHovered && drawTool !== 'horizontal'
                                    ? '11'
                                    : '12'
                                }
                                fontWeight="bold"
                              >
                                {isHovered && drawTool !== 'horizontal'
                                  ? pSymbol
                                  : '+'}
                              </text>
                            </g>
                          )}

                        {/* C. Hit area overlay for touch & click */}
                        <rect
                          x={x1 + 4}
                          y={rectY}
                          width={Math.max(10, x2 - x1 - 8)}
                          height={rectHeight}
                          rx={8}
                          fill="transparent"
                          className={
                            activeRunner
                              ? 'cursor-default'
                              : hasBridge
                              ? 'cursor-pointer'
                              : isAllowed
                              ? 'cursor-pointer'
                              : 'cursor-not-allowed'
                          }
                          onClick={() => handleToggleBridge(col, level)}
                          onMouseEnter={() => setHoveredSlot({ col, level })}
                          onMouseLeave={() => setHoveredSlot(null)}
                        >
                          <title>
                            {hasBridge
                              ? '클릭하면 이 나무 다리를 지웁니다'
                              : isAllowed
                              ? drawTool === 'diagonal_down_right'
                                ? '클릭하면 우하향(↘) 대각선 나무 미끄럼틀을 놓습니다'
                                : drawTool === 'diagonal_down_left'
                                ? '클릭하면 좌하향(↙) 대각선 나무 미끄럼틀을 놓습니다'
                                : '클릭하면 가로 나무 발판을 놓습니다'
                              : check.reason ||
                                '다른 다리와 겹치는 위치에는 다리를 놓을 수 없습니다'}
                          </title>
                        </rect>
                      </g>
                    );
                  });
                })}

                {/* 3. Completed Participant Trajectories (Rainbow Paths) */}
                {completedPaths.map(({ colIndex, points }) => {
                  const color = PARTICIPANT_COLORS[colIndex % PARTICIPANT_COLORS.length];
                  const d = points
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ');

                  return (
                    <g key={`completed_path_${colIndex}`} className="animate-fade-in">
                      <path
                        d={d}
                        fill="none"
                        stroke={color.line}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity="0.85"
                      />
                    </g>
                  );
                })}

                {/* 4. Active Animated Runner Trail & Glowing Ball */}
                {activeRunner && (
                  <g>
                    {/* Partial Trail for active runner */}
                    {activeRunner.currentPointIndex > 0 && (
                      <path
                        d={activeRunner.points
                          .slice(0, activeRunner.currentPointIndex + 1)
                          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                          .join(' ')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Outer Glow Orb */}
                    <circle
                      cx={activeRunner.pos.x}
                      cy={activeRunner.pos.y}
                      r="16"
                      fill="#fbbf24"
                      opacity="0.4"
                      filter="url(#glow)"
                      className="animate-ping"
                    />

                    {/* Animated Runner Ball with Student Name Initial */}
                    <circle
                      cx={activeRunner.pos.x}
                      cy={activeRunner.pos.y}
                      r="13"
                      fill="#d97706"
                      stroke="#ffffff"
                      strokeWidth="3"
                    />
                    <text
                      x={activeRunner.pos.x}
                      y={activeRunner.pos.y + 4}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {participants[activeRunner.colIndex]?.charAt(0) || '★'}
                    </text>
                  </g>
                )}
              </svg>
            </div>

            {/* BOTTOM ROW: RESULT CARDS */}
            <div className="w-full flex items-center justify-between px-6 mt-2">
              {results.map((item, idx) => {
                const isRevealed = revealedResultSlots.has(idx);

                // Find who landed on this slot
                const matchedStudentIdx = Object.keys(completedMatches).find(
                  (k) => completedMatches[parseInt(k, 10)].endCol === idx
                );
                const matchedStudentName =
                  matchedStudentIdx !== undefined
                    ? participants[parseInt(matchedStudentIdx, 10)]
                    : null;
                const studentColor =
                  matchedStudentIdx !== undefined
                    ? PARTICIPANT_COLORS[
                        parseInt(matchedStudentIdx, 10) % PARTICIPANT_COLORS.length
                      ]
                    : null;

                return (
                  <div
                    key={`result_card_${idx}`}
                    style={{ width: '108px' }}
                    onClick={() => {
                      soundManager.playPop();
                      setRevealedResultSlots((prev) => new Set([...prev, idx]));
                    }}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all cursor-pointer ${
                      isRevealed
                        ? 'bg-amber-50/90 border-amber-400 shadow-md scale-100'
                        : 'bg-gradient-to-b from-orange-400 to-amber-500 hover:from-orange-500 hover:to-amber-600 border-orange-600 text-white shadow-xs hover:scale-105'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wider ${
                        isRevealed ? 'text-amber-700' : 'text-orange-100'
                      }`}
                    >
                      도착 {idx + 1}
                    </span>

                    {isRevealed ? (
                      <div className="flex flex-col items-center text-center animate-pop">
                        <span className="font-extrabold text-xs sm:text-sm text-gray-900 leading-tight py-1 break-keep">
                          {item}
                        </span>

                        {matchedStudentName && studentColor && (
                          <span
                            style={{
                              backgroundColor: studentColor.fill,
                              color: studentColor.text,
                              borderColor: studentColor.border,
                            }}
                            className="mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border"
                          >
                            <span>👤 {matchedStudentName}</span>
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="py-2 flex flex-col items-center">
                        <span className="text-2xl animate-pulse">🎁</span>
                        <span className="text-[11px] font-extrabold text-white">
                          열어보기
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY RESULT LIST & SHARING */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-orange-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base sm:text-lg font-extrabold text-amber-950">
              사다리타기 매칭 결과표 ({Object.keys(completedMatches).length} / {participants.length}명)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyResults}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <Copy className="h-3.5 w-3.5 text-amber-600" />
              <span>📋 결과 복사</span>
            </button>
            <button
              type="button"
              onClick={handlePrintResults}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5 text-gray-500" />
              <span>🖨️ 인쇄하기</span>
            </button>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {participants.map((name, idx) => {
            const match = completedMatches[idx];
            const color = PARTICIPANT_COLORS[idx % PARTICIPANT_COLORS.length];

            return (
              <div
                key={`summary_${name}_${idx}`}
                style={{ borderColor: match ? color.border : '#e2e8f0' }}
                className={`flex items-center justify-between p-3 rounded-2xl border-2 transition ${
                  match ? 'bg-amber-50/40 shadow-2xs' : 'bg-gray-50/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      backgroundColor: color.fill,
                      color: color.text,
                      borderColor: color.border,
                    }}
                    className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-extrabold"
                  >
                    {idx + 1}
                  </span>
                  <span className="font-extrabold text-sm text-gray-900">
                    {name}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-xs">➡️</span>
                  <span
                    className={`text-xs font-extrabold px-2 py-1 rounded-lg ${
                      match
                        ? 'bg-white border border-amber-300 text-amber-900 shadow-2xs'
                        : 'text-gray-400'
                    }`}
                  >
                    {match ? match.result : '대기 중'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Participant Selection Modal */}
      <LadderParticipantModal
        isOpen={isParticipantModalOpen}
        onClose={() => setIsParticipantModalOpen(false)}
        allMasterStudents={students}
        currentParticipants={participants}
        onSaveParticipants={(newParticipants) => {
          setParticipants(newParticipants);
          const newBridges = generateLadderBridges(newParticipants.length, levelsCount);
          setBridges(newBridges);
          setCompletedMatches({});
          setRevealedResultSlots(new Set());
          setActiveRunner(null);
          setIsAutoPlayingAll(false);
        }}
      />

      {/* Theme / Outcome Modal */}
      <LadderThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
        participantCount={participants.length}
        currentResults={results}
        onSaveResults={(newResults) => {
          setResults(newResults);
          setCompletedMatches({});
          setRevealedResultSlots(new Set());
        }}
      />
    </div>
  );
};
