import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Grid,
  Settings,
  Sparkles,
  Shuffle,
  Copy,
  Printer,
  Crown,
  ChevronDown,
  Check,
  RotateCcw,
  ArrowUpDown,
  BookOpen,
  HelpCircle,
  Move,
  Plus,
  Trash2,
  Magnet,
  Sliders,
  GripHorizontal,
  Pencil,
} from 'lucide-react';
import { GroupTeam, SeatingPreset, DeskPosition, StudentGender } from '../types';
import {
  formGroups,
  generateDeskLayout,
  generateDefaultCustomDesks,
  convertPresetToCustomDesks,
  assignStudentsToDesks,
  SeparatePair,
  THEME_NAMES,
} from '../utils/groupAndSeating';
import { soundManager } from '../utils/audio';
import { launchConfetti } from '../utils/confetti';
import { StudentRulesModal } from './StudentRulesModal';

interface GroupAndSeatingViewProps {
  students: string[];
}

export const GroupAndSeatingView: React.FC<GroupAndSeatingViewProps> = ({ students }) => {
  // Main Sub-Tab: 'group' | 'seating'
  const [activeSubTab, setActiveSubTab] = useState<'group' | 'seating'>('group');

  // Rules Modal
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Student constraints persistent in localStorage
  const [genderMap, setGenderMap] = useState<Record<string, StudentGender>>(() => {
    try {
      const saved = localStorage.getItem('class_helper_gender_map_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [frontPreferred, setFrontPreferred] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('class_helper_front_preferred_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [separatePairs, setSeparatePairs] = useState<SeparatePair[]>(() => {
    try {
      const saved = localStorage.getItem('class_helper_separate_pairs_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save rules to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('class_helper_gender_map_v1', JSON.stringify(genderMap));
    } catch {}
  }, [genderMap]);

  useEffect(() => {
    try {
      localStorage.setItem('class_helper_front_preferred_v1', JSON.stringify(frontPreferred));
    } catch {}
  }, [frontPreferred]);

  useEffect(() => {
    try {
      localStorage.setItem('class_helper_separate_pairs_v1', JSON.stringify(separatePairs));
    } catch {}
  }, [separatePairs]);

  // ==========================================
  // GROUP FORMATION STATE
  // ==========================================
  const [groupMode, setGroupMode] = useState<'byGroupSize' | 'byGroupCount'>('byGroupSize');
  const [groupTargetSize, setGroupTargetSize] = useState<number>(4); // default: 4명씩
  const [groupTargetCount, setGroupTargetCount] = useState<number>(6); // default: 6개 모둠
  const [balanceGender, setBalanceGender] = useState<boolean>(true);
  const [applySeparatePairs, setApplySeparatePairs] = useState<boolean>(true);
  const [pickLeader, setPickLeader] = useState<boolean>(true);
  const [groupTheme, setGroupTheme] = useState<string>('numbers');

  const [groups, setGroups] = useState<GroupTeam[]>([]);
  const [selectedStudentForSwap, setSelectedStudentForSwap] = useState<{
    groupId: string;
    studentName: string;
  } | null>(null);

  // Auto-generate initial groups if students exist and none generated
  useEffect(() => {
    if (students.length > 0 && groups.length === 0) {
      handleFormGroups(false);
    }
  }, [students]);

  const handleFormGroups = (playEffect = true) => {
    if (students.length === 0) return;
    if (playEffect) {
      soundManager.playPop();
      launchConfetti();
    }

    const result = formGroups({
      students,
      mode: groupMode,
      targetCount: groupMode === 'byGroupSize' ? groupTargetSize : groupTargetCount,
      balanceGender,
      genderMap,
      separatePairs: applySeparatePairs ? separatePairs : [],
      pickLeader,
      theme: groupTheme,
    });
    setGroups(result);
    setSelectedStudentForSwap(null);
  };

  // Swap students between groups
  const handleStudentGroupClick = (groupId: string, studentName: string) => {
    soundManager.playClick();
    if (!selectedStudentForSwap) {
      setSelectedStudentForSwap({ groupId, studentName });
    } else {
      if (
        selectedStudentForSwap.groupId === groupId &&
        selectedStudentForSwap.studentName === studentName
      ) {
        // Deselect
        setSelectedStudentForSwap(null);
        return;
      }

      // Perform swap
      setGroups((prevGroups) => {
        const next = prevGroups.map((g) => ({ ...g, members: [...g.members] }));
        const srcGroup = next.find((g) => g.id === selectedStudentForSwap.groupId);
        const targetGroup = next.find((g) => g.id === groupId);

        if (srcGroup && targetGroup) {
          const srcIdx = srcGroup.members.indexOf(selectedStudentForSwap.studentName);
          const targetIdx = targetGroup.members.indexOf(studentName);

          if (srcIdx !== -1 && targetIdx !== -1) {
            srcGroup.members[srcIdx] = studentName;
            targetGroup.members[targetIdx] = selectedStudentForSwap.studentName;
            soundManager.playPop();
          }
        }
        return next;
      });

      setSelectedStudentForSwap(null);
    }
  };

  // Copy Group Text to Clipboard
  const handleCopyGroups = () => {
    if (groups.length === 0) return;
    const textLines = groups.map((g, idx) => {
      const leaderStr = g.leader ? ` (👑조장: ${g.leader})` : '';
      const membersStr = g.members.join(', ');
      return `[${g.name}]${leaderStr}\n구성원: ${membersStr}`;
    });
    const fullText = `📋 우리 반 모둠 편성표\n\n${textLines.join('\n\n')}`;
    navigator.clipboard.writeText(fullText).then(() => {
      alert('모둠 편성표가 클립보드에 복사되었습니다! 알림장이나 메신저에 붙여넣어 공유하세요.');
    });
  };

  // ==========================================
  // SEATING ARRANGEMENT STATE
  // ==========================================
  const [seatingPreset, setSeatingPreset] = useState<SeatingPreset>('pairs');
  const [deskCols, setDeskCols] = useState<number>(6);
  const [deskRows, setDeskRows] = useState<number>(5);

  const [desks, setDesks] = useState<DeskPosition[]>([]);
  const [deskAssignments, setDeskAssignments] = useState<Record<string, string>>({});
  const [isSeatingDrawing, setIsSeatingDrawing] = useState(false);
  const [revealedDeskIds, setRevealedDeskIds] = useState<Set<string>>(new Set());
  const [selectedDeskForSwap, setSelectedDeskForSwap] = useState<string | null>(null);

  // Custom Drag-and-Drop Mode State
  const [customModeStatus, setCustomModeStatus] = useState<'editing' | 'drawing'>('editing');
  const [isSnapToGrid, setIsSnapToGrid] = useState<boolean>(true);
  const [draggingDeskId, setDraggingDeskId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const floorRef = useRef<HTMLDivElement | null>(null);

  const [customDesks, setCustomDesks] = useState<DeskPosition[]>(() => {
    try {
      const saved = localStorage.getItem('class_helper_custom_desks_v2');
      if (saved) return JSON.parse(saved);
    } catch {}
    return generateDefaultCustomDesks(students.length || 24);
  });

  // Save custom desks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('class_helper_custom_desks_v2', JSON.stringify(customDesks));
    } catch {}
  }, [customDesks]);

  // Active desks depending on preset
  const activeDesks = seatingPreset === 'custom' ? customDesks : desks;

  // Initialize standard grid desk layout when preset or dimensions change
  useEffect(() => {
    if (seatingPreset !== 'custom') {
      const newDesks = generateDeskLayout({
        preset: seatingPreset,
        cols: deskCols,
        rows: deskRows,
        totalStudents: students.length,
      });
      setDesks(newDesks);

      // Initial silent assignment
      const initialAssignment = assignStudentsToDesks({
        students,
        desks: newDesks,
        frontPreferred,
        separatePairs,
      });
      setDeskAssignments(initialAssignment);
      setRevealedDeskIds(new Set(newDesks.map((d) => d.id)));
    } else {
      // In custom mode, initial silent assignment if empty
      setDeskAssignments((prev) => {
        if (Object.keys(prev).length === 0 && customDesks.length > 0) {
          return assignStudentsToDesks({
            students,
            desks: customDesks,
            frontPreferred,
            separatePairs,
          });
        }
        return prev;
      });
      setRevealedDeskIds(new Set(customDesks.map((d) => d.id)));
    }
  }, [seatingPreset, deskCols, deskRows, students.length]);

  // Drag handlers for Custom Floor
  const handleDeskPointerDown = (e: React.PointerEvent, deskId: string) => {
    if (customModeStatus !== 'editing') return;
    if ((e.target as HTMLElement).closest('.delete-desk-btn')) return;

    const floorEl = floorRef.current;
    if (!floorEl) return;
    const floorRect = floorEl.getBoundingClientRect();
    const desk = customDesks.find((d) => d.id === deskId);
    if (!desk) return;

    const deskX = desk.x ?? 30;
    const deskY = desk.y ?? 30;
    const offsetX = e.clientX - floorRect.left - deskX;
    const offsetY = e.clientY - floorRect.top - deskY;

    setDraggingDeskId(deskId);
    setDragOffset({ x: offsetX, y: offsetY });

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleDeskPointerMove = (e: React.PointerEvent, deskId: string) => {
    if (draggingDeskId !== deskId || customModeStatus !== 'editing') return;
    const floorEl = floorRef.current;
    if (!floorEl) return;
    const floorRect = floorEl.getBoundingClientRect();

    let newX = e.clientX - floorRect.left - dragOffset.x;
    let newY = e.clientY - floorRect.top - dragOffset.y;

    if (isSnapToGrid) {
      newX = Math.round(newX / 20) * 20;
      newY = Math.round(newY / 20) * 20;
    }

    const maxX = Math.max(100, floorRect.width - 130);
    const maxY = Math.max(200, floorRect.height - 85);
    newX = Math.max(10, Math.min(newX, maxX));
    newY = Math.max(10, Math.min(newY, maxY));

    setCustomDesks((prev) =>
      prev.map((d) => (d.id === deskId ? { ...d, x: newX, y: newY } : d))
    );
  };

  const handleDeskPointerUp = (e: React.PointerEvent, deskId: string) => {
    if (draggingDeskId === deskId) {
      setDraggingDeskId(null);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      soundManager.playClick();
    }
  };

  // Custom Desks Actions
  const handleAddCustomDesk = () => {
    soundManager.playClick();
    const newIdx = customDesks.length + 1;
    const newDesk: DeskPosition = {
      id: `desk_custom_${Date.now()}`,
      label: `책상 ${newIdx}`,
      row: Math.floor(newIdx / 6),
      col: newIdx % 6,
      x: 30 + ((newIdx - 1) % 5) * 140,
      y: 30 + Math.floor((newIdx - 1) / 5) * 90,
    };
    setCustomDesks((prev) => [...prev, newDesk]);
    soundManager.playPop();
  };

  const handleRemoveCustomDesk = (deskId: string) => {
    soundManager.playClick();
    setCustomDesks((prev) => prev.filter((d) => d.id !== deskId));
    setDeskAssignments((prev) => {
      const next = { ...prev };
      delete next[deskId];
      return next;
    });
  };

  const handleMatchStudentCount = () => {
    soundManager.playClick();
    const target = students.length;
    if (customDesks.length < target) {
      const needed = target - customDesks.length;
      const added: DeskPosition[] = [];
      for (let i = 0; i < needed; i++) {
        const idx = customDesks.length + i;
        added.push({
          id: `desk_custom_${Date.now()}_${i}`,
          label: `책상 ${idx + 1}`,
          row: Math.floor(idx / 6),
          col: idx % 6,
          x: 30 + (idx % 6) * 140,
          y: 20 + Math.floor(idx / 6) * 95,
        });
      }
      setCustomDesks((prev) => [...prev, ...added]);
      soundManager.playPop();
    } else if (customDesks.length > target) {
      setCustomDesks((prev) => prev.slice(0, target));
      soundManager.playPop();
    }
  };

  const handleImportPresetToCustom = (presetToImport: SeatingPreset) => {
    soundManager.playClick();
    const base = generateDeskLayout({
      preset: presetToImport,
      cols: deskCols,
      rows: deskRows,
      totalStudents: students.length,
    });
    const converted = convertPresetToCustomDesks(base);
    setCustomDesks(converted);
    soundManager.playPop();
  };

  const handleResetCustomDesks = () => {
    soundManager.playClick();
    setCustomDesks(generateDefaultCustomDesks(students.length || 24));
    soundManager.playPop();
  };

  // Animated Seating Draw
  const handleStartSeatingDraw = () => {
    if (students.length === 0 || activeDesks.length === 0) return;

    soundManager.playPop();
    setIsSeatingDrawing(true);
    setRevealedDeskIds(new Set());
    setSelectedDeskForSwap(null);

    // If in custom mode and was in edit status, switch to drawing mode
    if (seatingPreset === 'custom') {
      setCustomModeStatus('drawing');
    }

    // Compute fresh assignment
    const freshAssignment = assignStudentsToDesks({
      students,
      desks: activeDesks,
      frontPreferred,
      separatePairs,
    });
    setDeskAssignments(freshAssignment);

    // Animate revealing desks one by one
    const deskList = [...activeDesks].filter((d) => Boolean(freshAssignment[d.id]));
    let index = 0;

    const interval = setInterval(() => {
      if (index < deskList.length) {
        soundManager.playTick(600 + (index % 5) * 60);
        setRevealedDeskIds((prev) => {
          const next = new Set(prev);
          next.add(deskList[index].id);
          return next;
        });
        index++;
      } else {
        clearInterval(interval);
        setIsSeatingDrawing(false);
        soundManager.playFanfare();
        launchConfetti();
      }
    }, 120);
  };

  // Instant Seating Draw
  const handleInstantSeatingDraw = () => {
    soundManager.playPop();
    if (seatingPreset === 'custom') {
      setCustomModeStatus('drawing');
    }

    const freshAssignment = assignStudentsToDesks({
      students,
      desks: activeDesks,
      frontPreferred,
      separatePairs,
    });
    setDeskAssignments(freshAssignment);
    setRevealedDeskIds(new Set(activeDesks.map((d) => d.id)));
    setSelectedDeskForSwap(null);
    launchConfetti();
  };

  // Desk Swap Click
  const handleDeskClick = (deskId: string) => {
    if (isSeatingDrawing) return;
    soundManager.playClick();

    if (!selectedDeskForSwap) {
      setSelectedDeskForSwap(deskId);
    } else {
      if (selectedDeskForSwap === deskId) {
        setSelectedDeskForSwap(null);
        return;
      }

      // Swap students in these desks
      setDeskAssignments((prev) => {
        const next = { ...prev };
        const studentA = next[selectedDeskForSwap];
        const studentB = next[deskId];

        if (studentA) next[deskId] = studentA;
        else delete next[deskId];

        if (studentB) next[selectedDeskForSwap] = studentB;
        else delete next[selectedDeskForSwap];

        return next;
      });

      soundManager.playPop();
      setSelectedDeskForSwap(null);
    }
  };

  // Copy Seating text
  const handleCopySeating = () => {
    if (activeDesks.length === 0) return;
    const lines: string[] = ['[칠판 / 선생님 교탁 앞]'];

    if (seatingPreset === 'custom') {
      // Sort by vertical position (Y), then horizontal (X)
      const sorted = [...customDesks].sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
      sorted.forEach((d, idx) => {
        const name = deskAssignments[d.id] || '(빈자리)';
        lines.push(`${idx + 1}. [${d.label || `책상 ${idx + 1}`}]: ${name}`);
      });
    } else {
      const maxRow = Math.max(...desks.map((d) => d.row));
      for (let r = 0; r <= maxRow; r++) {
        const rowDesks = desks.filter((d) => d.row === r).sort((a, b) => a.col - b.col);
        const rowNames = rowDesks.map((d) => deskAssignments[d.id] || '(빈자리)').join(' | ');
        lines.push(`${r + 1}줄: [ ${rowNames} ]`);
      }
    }

    navigator.clipboard.writeText(`🪑 우리 반 좌석 배치표\n\n${lines.join('\n')}`).then(() => {
      alert('좌석 배치표가 클립보드에 복사되었습니다!');
    });
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Top Banner & Mode Switcher */}
      <div className="w-full max-w-5xl bg-white rounded-3xl p-4 sm:p-6 shadow-md border-2 border-[#ffdfba] mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl shadow-xs">
              👥
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                모둠(조) 편성 & 좌석 랜덤 배치기
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 font-bold">
                전체 학생 <span className="text-blue-600">{students.length}명</span> 대상 공정 자동 배정
                {separatePairs.length > 0 && (
                  <span className="ml-2 text-rose-500">
                    · 분리 규칙 {separatePairs.length}건 적용 중
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Sub Tab Switcher & Rules Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-orange-50 p-1 rounded-2xl border border-orange-200 flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setActiveSubTab('group');
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm sm:text-base transition ${
                  activeSubTab === 'group'
                    ? 'bg-[#ff6b6b] text-white shadow-xs'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>모둠(조) 자동 편성</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  setActiveSubTab('seating');
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm sm:text-base transition ${
                  activeSubTab === 'seating'
                    ? 'bg-[#ff6b6b] text-white shadow-xs'
                    : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                <Grid className="h-4 w-4" />
                <span>좌석 랜덤 배치표</span>
              </button>
            </div>

            {/* Custom Rules Modal trigger */}
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                setIsRulesModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border-2 border-amber-300 rounded-xl font-bold text-sm shadow-xs transition"
              title="성별 지정, 앞자리 배려, 특정 학생 짝 분리 규칙 설정"
            >
              <Settings className="h-4 w-4 text-amber-600" />
              <span>규칙 및 성별 설정</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SUB-VIEW 1: GROUP FORMATION SECTION                      */}
        {/* ======================================================== */}
        {activeSubTab === 'group' && (
          <div className="pt-4 space-y-6">
            {/* Group Generation Controls */}
            <div className="bg-orange-50/70 border-2 border-orange-200 rounded-2xl p-4 sm:p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                {/* 1. Mode & Numbers */}
                <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    편성 방식 기준
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setGroupMode('byGroupSize')}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        groupMode === 'byGroupSize'
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      한 모둠당 인원수
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupMode('byGroupCount')}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold transition ${
                        groupMode === 'byGroupCount'
                          ? 'bg-amber-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      총 모둠 개수
                    </button>
                  </div>

                  {groupMode === 'byGroupSize' ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">모둠당 인원:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGroupTargetSize((prev) => Math.max(2, prev - 1))}
                          className="w-7 h-7 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-base text-gray-700"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-extrabold text-amber-600 text-lg">
                          {groupTargetSize}명
                        </span>
                        <button
                          type="button"
                          onClick={() => setGroupTargetSize((prev) => Math.min(10, prev + 1))}
                          className="w-7 h-7 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-base text-gray-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-800">만들 모둠 수:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setGroupTargetCount((prev) => Math.max(2, prev - 1))}
                          className="w-7 h-7 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-base text-gray-700"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-extrabold text-amber-600 text-lg">
                          {groupTargetCount}개
                        </span>
                        <button
                          type="button"
                          onClick={() => setGroupTargetCount((prev) => Math.min(15, prev + 1))}
                          className="w-7 h-7 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-base text-gray-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Theme Selection */}
                <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    모둠 이름 테마
                  </label>
                  <select
                    value={groupTheme}
                    onChange={(e) => setGroupTheme(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold text-sm bg-gray-50 focus:outline-hidden"
                  >
                    <option value="numbers">1모둠, 2모둠, 3모둠 (기본)</option>
                    <option value="fruits">사과🍎, 딸기🍓, 바나나🍌 (과일)</option>
                    <option value="animals">호랑이🐯, 사자🦁, 판다🐼 (동물)</option>
                    <option value="planets">수성☿, 금성♀, 지구♁ (행성)</option>
                    <option value="colors">빨강❤️, 주황🧡, 노랑💛 (색상)</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    모둠 카드의 제목이 테마에 맞게 지어집니다
                  </p>
                </div>

                {/* 3. Smart Options */}
                <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-2xs space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 select-none">
                    <input
                      type="checkbox"
                      checked={balanceGender}
                      onChange={(e) => setBalanceGender(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>남/여 균등 분배</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 select-none">
                    <input
                      type="checkbox"
                      checked={applySeparatePairs}
                      onChange={(e) => setApplySeparatePairs(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>특정 학생 짝 분리 적용</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 select-none">
                    <input
                      type="checkbox"
                      checked={pickLeader}
                      onChange={(e) => setPickLeader(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>모둠장(조장) 1명 랜덤 선출 👑</span>
                  </label>
                </div>

                {/* 4. Action Button */}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleFormGroups(true)}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-md transition transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Shuffle className="h-5 w-5 animate-pulse" />
                    <span>모둠 자동 편성하기!</span>
                  </button>
                  <p className="text-[11px] text-center text-gray-500">
                    클릭하면 공정하게 무작위 셔플됩니다
                  </p>
                </div>
              </div>
            </div>

            {/* Instruction Tip for Swapping */}
            <div className="flex items-center justify-between text-xs text-gray-600 bg-amber-50/70 px-4 py-2 rounded-xl border border-amber-200">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-4 w-4 text-amber-600" />
                <span>
                  <strong>자리 맞바꾸기 팁:</strong> 학생 이름을 누른 후, 다른 모둠의 학생을 누르면 두 학생의 모둠이 즉시 교환됩니다!
                </span>
              </div>
              {selectedStudentForSwap && (
                <span className="font-bold text-rose-600 animate-pulse">
                  선택됨: {selectedStudentForSwap.studentName} (바꿀 상대를 클릭하세요)
                </span>
              )}
            </div>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group, idx) => (
                <div
                  key={group.id}
                  className={`rounded-2xl border-2 p-4 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${group.color}`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-center justify-between border-b border-black/10 pb-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-black text-gray-800">{group.name}</span>
                      </div>
                      <span className="text-xs font-extrabold bg-white/80 px-2.5 py-0.5 rounded-full shadow-2xs text-gray-700">
                        {group.members.length}명
                      </span>
                    </div>

                    {/* Members List */}
                    <div className="space-y-1.5 min-h-[100px]">
                      {group.members.map((member) => {
                        const isLeader = group.leader === member;
                        const gender = genderMap[member];
                        const isSelected =
                          selectedStudentForSwap?.studentName === member &&
                          selectedStudentForSwap?.groupId === group.id;

                        return (
                          <button
                            key={member}
                            type="button"
                            onClick={() => handleStudentGroupClick(group.id, member)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                              isSelected
                                ? 'bg-amber-400 text-white ring-4 ring-amber-300 scale-102 shadow-sm'
                                : 'bg-white/90 hover:bg-white text-gray-800 shadow-2xs hover:scale-101'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {gender === 'M' && <span className="text-blue-500 text-xs">👦</span>}
                              {gender === 'F' && <span className="text-pink-500 text-xs">👧</span>}
                              <span>{member}</span>
                            </div>

                            {isLeader && (
                              <span className="flex items-center gap-1 text-[11px] bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full font-extrabold shadow-2xs">
                                <Crown className="h-3 w-3 text-amber-600 fill-amber-500" />
                                <span>조장</span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Footer: Quick stats */}
                  <div className="mt-3 pt-2 border-t border-black/5 flex items-center justify-between text-[11px] opacity-75">
                    <span>모둠 #{idx + 1}</span>
                    <span>
                      남 {group.members.filter((m) => genderMap[m] === 'M').length} · 여{' '}
                      {group.members.filter((m) => genderMap[m] === 'F').length}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions for Groups */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyGroups}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition"
              >
                <Copy className="h-4 w-4" />
                <span>모둠 편성표 텍스트 복사</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition"
              >
                <Printer className="h-4 w-4" />
                <span>인쇄하기</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* SUB-VIEW 2: SEATING ARRANGEMENT SECTION                  */}
        {/* ======================================================== */}
        {activeSubTab === 'seating' && (
          <div className="pt-4 space-y-6">
            {/* Seating Controls Bar */}
            <div className="bg-orange-50/70 border-2 border-orange-200 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Preset Switcher */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 mr-1">배치 형태:</span>
                  {[
                    { id: 'pairs', label: '짝꿍형 (2인 1조)', icon: '👫' },
                    { id: 'rows', label: '분단형 (행×열)', icon: '🏛️' },
                    { id: 'horseshoe', label: 'ㄷ자(U자) 대형', icon: '🧲' },
                    { id: 'groups', label: '모둠 마주보기형', icon: '📦' },
                    { id: 'custom', label: '자유 배치형 (드래그)', icon: '🎨' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSeatingPreset(preset.id as SeatingPreset);
                        if (preset.id === 'custom') {
                          setCustomModeStatus('editing');
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                        seatingPreset === preset.id
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-orange-200 hover:bg-orange-100'
                      }`}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.label}</span>
                    </button>
                  ))}
                </div>

                {/* Rows & Cols Adjusters for rows/pairs */}
                {(seatingPreset === 'rows' || seatingPreset === 'pairs') && (
                  <div className="flex items-center gap-4 text-xs font-bold text-gray-700">
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-orange-200">
                      <span>가로(열):</span>
                      <button
                        type="button"
                        onClick={() => setDeskCols((prev) => Math.max(4, prev - 1))}
                        className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-md font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold text-amber-700">{deskCols}</span>
                      <button
                        type="button"
                        onClick={() => setDeskCols((prev) => Math.min(8, prev + 1))}
                        className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-md font-bold"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-orange-200">
                      <span>세로(줄):</span>
                      <button
                        type="button"
                        onClick={() => setDeskRows((prev) => Math.max(3, prev - 1))}
                        className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-md font-bold"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold text-amber-700">{deskRows}</span>
                      <button
                        type="button"
                        onClick={() => setDeskRows((prev) => Math.min(7, prev + 1))}
                        className="w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded-md font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                {/* Draw Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSeatingDrawing}
                    onClick={handleStartSeatingDraw}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#ff6b6b] to-[#ee5253] hover:from-[#ee5253] hover:to-[#d63031] text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>✨ 두근두근 자리 추첨!</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSeatingDrawing}
                    onClick={handleInstantSeatingDraw}
                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs sm:text-sm rounded-xl transition disabled:opacity-50"
                    title="애니메이션 없이 즉시 전체 배치"
                  >
                    ⚡ 즉시 배치
                  </button>
                </div>
              </div>

              {/* Custom Mode Dedicated Sub-Toolbar */}
              {seatingPreset === 'custom' && (
                <div className="mt-4 pt-4 border-t border-orange-200/80 flex flex-wrap items-center justify-between gap-3">
                  {customModeStatus === 'editing' ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                      <span className="bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-300">
                        🛠️ 드래그 편집 모드 ({customDesks.length}개 책상)
                      </span>

                      <button
                        type="button"
                        onClick={handleAddCustomDesk}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl shadow-2xs transition"
                      >
                        <Plus className="h-3.5 w-3.5 text-amber-600" />
                        <span>+ 책상 추가</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleMatchStudentCount}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 rounded-xl shadow-2xs transition"
                        title={`현재 학생 수(${students.length}명)에 맞게 책상 수를 맞춥니다`}
                      >
                        <Users className="h-3.5 w-3.5 text-amber-600" />
                        <span>학생 수({students.length}명) 맞추기</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsSnapToGrid((prev) => !prev)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border transition shadow-2xs ${
                          isSnapToGrid
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                        title="20px 자석 스냅으로 책상을 깔끔하게 정렬합니다"
                      >
                        <Magnet className="h-3.5 w-3.5" />
                        <span>격자 자석 스냅: {isSnapToGrid ? 'ON' : 'OFF'}</span>
                      </button>

                      {/* Import layout presets */}
                      <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-xl border border-amber-300">
                        <span className="text-gray-500 text-[11px]">모양 가져오기:</span>
                        <button
                          type="button"
                          onClick={() => handleImportPresetToCustom('pairs')}
                          className="px-2 py-0.5 hover:bg-amber-100 rounded text-amber-900 text-xs"
                        >
                          👫 짝꿍형
                        </button>
                        <button
                          type="button"
                          onClick={() => handleImportPresetToCustom('horseshoe')}
                          className="px-2 py-0.5 hover:bg-amber-100 rounded text-amber-900 text-xs"
                        >
                          🧲 ㄷ자형
                        </button>
                        <button
                          type="button"
                          onClick={() => handleImportPresetToCustom('groups')}
                          className="px-2 py-0.5 hover:bg-amber-100 rounded text-amber-900 text-xs"
                        >
                          📦 모둠형
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleResetCustomDesks}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-gray-500 hover:text-rose-600 transition"
                        title="책상 위치를 기본 배열로 초기화합니다"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>초기화</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-300 text-xs font-bold">
                        🎲 자리 추첨 및 확인 모드
                      </span>
                      <span className="text-xs text-gray-500">
                        책상을 클릭하면 다른 자리와 학생을 맞바꿀 수 있습니다.
                      </span>
                    </div>
                  )}

                  {/* Toggle Edit/Draw mode button */}
                  {customModeStatus === 'editing' ? (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playPop();
                        setCustomModeStatus('drawing');
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition ml-auto"
                    >
                      <Check className="h-4 w-4" />
                      <span>대형 세팅 완료 & 추첨 모드 전환</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setCustomModeStatus('editing');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs sm:text-sm rounded-xl shadow-2xs transition ml-auto"
                    >
                      <Pencil className="h-3.5 w-3.5 text-amber-600" />
                      <span>🛠️ 대형 다시 드래그 편집하기</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Blackboard & Teacher Podium Graphic (Front of Classroom) */}
            <div className="w-full flex flex-col items-center">
              <div className="w-full max-w-2xl bg-emerald-800 text-emerald-100 rounded-2xl py-3 px-6 shadow-inner border-4 border-amber-900/30 flex items-center justify-between relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧑‍🏫</span>
                  <span className="font-black text-sm sm:text-base tracking-widest text-emerald-200">
                    [ 칠 판 & 선 생 님 교 탁 ]
                  </span>
                </div>
                <div className="text-xs text-emerald-300 font-bold">교실 앞쪽 (FRONT)</div>
              </div>
              <div className="w-16 h-2 bg-amber-900/40 rounded-b-md" />
            </div>

            {/* Instruction Tip */}
            <div className="flex items-center justify-between text-xs text-gray-600 bg-amber-50/70 px-4 py-2 rounded-xl border border-amber-200">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-4 w-4 text-amber-600" />
                <span>
                  {seatingPreset === 'custom' && customModeStatus === 'editing' ? (
                    <strong>대형 드래그 세팅:</strong>
                  ) : (
                    <strong>자리 맞교환:</strong>
                  )}{' '}
                  {seatingPreset === 'custom' && customModeStatus === 'editing'
                    ? '책상을 마우스나 터치로 끌어 교실 원하는 위치에 자유롭게 놓으세요. 세팅 후 [추첨]을 누르면 됩니다.'
                    : '책상을 클릭하고 다른 책상을 클릭하면 두 학생의 자리가 즉시 바뀝니다.'}
                </span>
              </div>
              {selectedDeskForSwap && (
                <span className="font-bold text-rose-600 animate-pulse">
                  선택된 책상: {deskAssignments[selectedDeskForSwap] || '(빈 책상)'} (바꿀 자리를 클릭하세요)
                </span>
              )}
            </div>

            {/* Classroom Desks Matrix (Preset Grids vs Custom Drag Floor) */}
            {seatingPreset === 'custom' ? (
              /* ======================================================== */
              /* CUSTOM FREE-FORM DRAG-AND-DROP CANVAS FLOOR              */
              /* ======================================================== */
              <div className="w-full flex flex-col items-center">
                <div
                  ref={floorRef}
                  className="relative w-full max-w-5xl h-[640px] bg-[#fffdf9] rounded-3xl border-2 border-amber-300 shadow-inner overflow-hidden select-none"
                  style={{
                    backgroundImage: isSnapToGrid
                      ? 'radial-gradient(#d6c7b2 1.5px, transparent 1.5px)'
                      : undefined,
                    backgroundSize: '20px 20px',
                  }}
                >
                  {/* Watermark/guide in edit mode */}
                  {customModeStatus === 'editing' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 text-gray-400 font-extrabold text-xl tracking-wider">
                      교실 바닥 (자유 드래그 영역)
                    </div>
                  )}

                  {/* Render Custom Desks */}
                  {customDesks.map((desk, idx) => {
                    const studentName = deskAssignments[desk.id];
                    const isRevealed = revealedDeskIds.has(desk.id);
                    const isSelected = selectedDeskForSwap === desk.id;
                    const isBeingDragged = draggingDeskId === desk.id;
                    const isFrontPref = studentName && frontPreferred.includes(studentName);
                    const gender = studentName ? genderMap[studentName] : undefined;

                    return (
                      <div
                        key={desk.id}
                        onPointerDown={(e) => handleDeskPointerDown(e, desk.id)}
                        onPointerMove={(e) => handleDeskPointerMove(e, desk.id)}
                        onPointerUp={(e) => handleDeskPointerUp(e, desk.id)}
                        onClick={() => {
                          if (customModeStatus === 'drawing') {
                            handleDeskClick(desk.id);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: `${desk.x ?? 30}px`,
                          top: `${desk.y ?? 30}px`,
                          width: '124px',
                          height: '78px',
                          touchAction: 'none',
                        }}
                        className={`rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 transition-shadow select-none ${
                          customModeStatus === 'editing'
                            ? isBeingDragged
                              ? 'bg-amber-100 border-amber-500 shadow-2xl scale-105 z-30 ring-4 ring-amber-300 cursor-grabbing'
                              : 'bg-white hover:bg-amber-50 border-amber-300 shadow-xs hover:shadow-md cursor-grab z-10'
                            : isSelected
                            ? 'bg-amber-300 border-amber-500 scale-105 ring-4 ring-amber-200 shadow-md z-20 cursor-pointer'
                            : studentName
                            ? 'bg-white hover:bg-orange-50 border-orange-200 shadow-xs hover:border-orange-300 cursor-pointer z-10'
                            : 'bg-gray-100/70 border-gray-200 text-gray-300 cursor-pointer z-10'
                        }`}
                      >
                        {customModeStatus === 'editing' ? (
                          /* EDIT MODE DESK UI */
                          <div className="w-full h-full flex flex-col items-center justify-between p-1">
                            <div className="w-full flex items-center justify-between text-[11px] font-bold text-gray-400">
                              <span className="flex items-center gap-1 text-amber-700">
                                <GripHorizontal className="h-3.5 w-3.5" />
                                <span>{desk.label || `책상 ${idx + 1}`}</span>
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCustomDesk(desk.id);
                                }}
                                className="delete-desk-btn w-4 h-4 rounded-full bg-gray-100 hover:bg-rose-500 hover:text-white text-gray-400 flex items-center justify-center text-[10px] font-bold transition"
                                title="책상 삭제"
                              >
                                ✕
                              </button>
                            </div>

                            <span className="text-[11px] font-bold text-amber-800/80 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              ✥ 드래그 이동
                            </span>

                            <span className="text-[9px] text-gray-400">
                              X:{desk.x ?? 0} Y:{desk.y ?? 0}
                            </span>
                          </div>
                        ) : (
                          /* DRAWING/SEATED DESK UI */
                          <>
                            {/* Desk number tag */}
                            <span className="absolute top-1 left-2 text-[10px] font-bold text-gray-400">
                              {desk.label || `책상 ${idx + 1}`}
                            </span>

                            {/* Front preferred star badge */}
                            {isFrontPref && (
                              <span
                                className="absolute top-1 right-2 text-[10px] text-amber-500"
                                title="앞자리 배려 학생"
                              >
                                🌟
                              </span>
                            )}

                            {/* Student Name */}
                            {isRevealed && studentName ? (
                              <div className="flex flex-col items-center justify-center animate-pop">
                                <div className="flex items-center gap-1">
                                  {gender === 'M' && (
                                    <span className="text-blue-500 text-xs">👦</span>
                                  )}
                                  {gender === 'F' && (
                                    <span className="text-pink-500 text-xs">👧</span>
                                  )}
                                  <span className="font-extrabold text-sm sm:text-base text-gray-800 truncate max-w-[88px]">
                                    {studentName}
                                  </span>
                                </div>
                              </div>
                            ) : isRevealed ? (
                              <span className="text-xs text-gray-300 font-bold">(빈자리)</span>
                            ) : (
                              <span className="text-xs text-orange-400 font-bold animate-pulse">
                                추첨 중...
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* STANDARD GRID DESK MATRIX (PAIRS, ROWS, HORSESHOE, GROUPS)*/
              /* ======================================================== */
              <div className="w-full overflow-x-auto p-2 flex justify-center">
                <div className="inline-grid gap-3 sm:gap-4 p-4 bg-amber-50/40 rounded-3xl border-2 border-dashed border-amber-300">
                  {/* Render rows */}
                  {Array.from({ length: Math.max(...desks.map((d) => d.row)) + 1 }).map((_, r) => {
                    const rowDesks = desks.filter((d) => d.row === r).sort((a, b) => a.col - b.col);

                    return (
                      <div key={r} className="flex items-center justify-center gap-2.5 sm:gap-3">
                        {/* Row Label */}
                        <span className="text-xs font-bold text-amber-800/60 w-8 text-right select-none">
                          {r + 1}줄
                        </span>

                        {rowDesks.map((desk, idx) => {
                          const studentName = deskAssignments[desk.id];
                          const isRevealed = revealedDeskIds.has(desk.id);
                          const isSelected = selectedDeskForSwap === desk.id;
                          const isFrontPref = studentName && frontPreferred.includes(studentName);
                          const gender = studentName ? genderMap[studentName] : undefined;

                          // Insert visual aisle spacer for pairs or rows
                          const isPairGap =
                            seatingPreset === 'pairs' && desk.col % 2 === 1 && idx < rowDesks.length - 1;

                          return (
                            <React.Fragment key={desk.id}>
                              <button
                                type="button"
                                onClick={() => handleDeskClick(desk.id)}
                                className={`relative w-24 sm:w-28 h-18 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center p-1 transition-all ${
                                  isSelected
                                    ? 'bg-amber-300 border-amber-500 scale-105 ring-4 ring-amber-200 shadow-md z-10'
                                    : studentName
                                    ? 'bg-white hover:bg-orange-50 border-orange-200 shadow-xs hover:border-orange-300 hover:scale-102'
                                    : 'bg-gray-100/70 border-gray-200 text-gray-300'
                                }`}
                              >
                                {/* Desk number tag */}
                                <span className="absolute top-1 left-2 text-[10px] font-bold text-gray-400">
                                  {desk.label || `${desk.row + 1}-${desk.col + 1}`}
                                </span>

                                {/* Front preferred star badge */}
                                {isFrontPref && (
                                  <span
                                    className="absolute top-1 right-2 text-[10px] text-amber-500"
                                    title="앞자리 배려 학생"
                                  >
                                    🌟
                                  </span>
                                )}

                                {/* Student Name */}
                                {isRevealed && studentName ? (
                                  <div className="flex flex-col items-center justify-center animate-pop">
                                    <div className="flex items-center gap-1">
                                      {gender === 'M' && (
                                        <span className="text-blue-500 text-xs">👦</span>
                                      )}
                                      {gender === 'F' && (
                                        <span className="text-pink-500 text-xs">👧</span>
                                      )}
                                      <span className="font-extrabold text-sm sm:text-base text-gray-800 truncate max-w-[84px]">
                                        {studentName}
                                      </span>
                                    </div>
                                  </div>
                                ) : isRevealed ? (
                                  <span className="text-xs text-gray-300 font-bold">(빈자리)</span>
                                ) : (
                                  <span className="text-xs text-orange-400 font-bold animate-pulse">
                                    추첨 중...
                                  </span>
                                )}
                              </button>

                              {/* Visual Aisle/Corridor separator */}
                              {isPairGap && (
                                <div
                                  key={`gap_${desk.id}`}
                                  className="w-3 sm:w-6 flex items-center justify-center"
                                >
                                  <div className="w-0.5 h-8 bg-amber-200/60 rounded-full" />
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Actions for Seating */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopySeating}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition"
              >
                <Copy className="h-4 w-4" />
                <span>좌석표 텍스트 복사</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition"
              >
                <Printer className="h-4 w-4" />
                <span>좌석표 인쇄하기</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rules & Gender Settings Modal */}
      <StudentRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        students={students}
        genderMap={genderMap}
        onUpdateGender={(s, g) => setGenderMap((prev) => ({ ...prev, [s]: g }))}
        frontPreferred={frontPreferred}
        onToggleFrontPreferred={(s) =>
          setFrontPreferred((prev) =>
            prev.includes(s) ? prev.filter((name) => name !== s) : [...prev, s]
          )
        }
        separatePairs={separatePairs}
        onAddSeparatePair={(s1, s2) => setSeparatePairs((prev) => [...prev, { student1: s1, student2: s2 }])}
        onRemoveSeparatePair={(idx) =>
          setSeparatePairs((prev) => prev.filter((_, i) => i !== idx))
        }
        onQuickAutoGender={() => {
          // Odd numbers Male, Even numbers Female (standard classroom mock)
          const newMap: Record<string, StudentGender> = {};
          students.forEach((s, idx) => {
            newMap[s] = idx % 2 === 0 ? 'M' : 'F';
          });
          setGenderMap(newMap);
          soundManager.playPop();
        }}
      />
    </div>
  );
};
