import React, { useState } from 'react';
import { X, Check, Sparkles, Shuffle, RefreshCw } from 'lucide-react';
import { LADDER_PRESET_THEMES, LadderTheme } from '../utils/ladderGame';
import { soundManager } from '../utils/audio';

interface LadderThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantCount: number;
  currentResults: string[];
  onSaveResults: (results: string[]) => void;
}

export const LadderThemeModal: React.FC<LadderThemeModalProps> = ({
  isOpen,
  onClose,
  participantCount,
  currentResults,
  onSaveResults,
}) => {
  const [items, setItems] = useState<string[]>(() => {
    const list = [...currentResults];
    while (list.length < participantCount) {
      list.push(`결과 ${list.length + 1}`);
    }
    return list.slice(0, participantCount);
  });

  if (!isOpen) return null;

  const handleApplyPreset = (theme: LadderTheme) => {
    soundManager.playPop();
    const newItems: string[] = [];
    for (let i = 0; i < participantCount; i++) {
      newItems.push(theme.items[i % theme.items.length]);
    }
    setItems(newItems);
  };

  const handleItemChange = (index: number, val: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleShuffleItems = () => {
    soundManager.playPop();
    setItems((prev) => [...prev].sort(() => Math.random() - 0.5));
  };

  const handleSave = () => {
    soundManager.playClick();
    onSaveResults(items);
    onClose();
  };

  return (
    <div
      id="ladder-theme-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-4 border-[#ffdfba] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#ffdfba] to-[#ffe8cc] border-b-2 border-orange-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-amber-950">
                사다리타기 결과 항목 설정
              </h2>
              <p className="text-xs text-amber-800/80">
                하단 도착지의 결과 항목을 추천 테마로 채우거나 직접 편집할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-gray-500 hover:text-gray-800 flex items-center justify-center transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Preset Theme Buttons */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                인기 추천 테마로 자동 채우기
              </h3>
              <button
                type="button"
                onClick={handleShuffleItems}
                className="flex items-center gap-1 text-xs text-amber-700 font-bold hover:underline"
              >
                <Shuffle className="h-3 w-3" />
                <span>항목 위치 무작위 섞기</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LADDER_PRESET_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleApplyPreset(theme)}
                  className="flex items-center gap-2 p-2.5 bg-amber-50/70 hover:bg-amber-100/90 border border-amber-200 rounded-2xl text-left transition shadow-2xs group"
                >
                  <span className="text-xl group-hover:scale-110 transition">{theme.icon}</span>
                  <div className="truncate">
                    <div className="text-xs font-bold text-amber-950 truncate">{theme.name}</div>
                    <div className="text-[10px] text-amber-700/70 truncate">{theme.items[0]} 등</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Individual Slot Edit */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">
                도착지 칸별 내용 직접 수정 (총 {participantCount}칸)
              </h3>
              <span className="text-xs text-amber-600 font-bold">
                각 참가자 수와 1:1로 매칭됩니다.
              </span>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-7 text-right text-xs font-extrabold text-amber-800">
                    {idx + 1}번
                  </span>
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => handleItemChange(idx, e.target.value)}
                    placeholder={`도착 항목 ${idx + 1}`}
                    maxLength={30}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm rounded-xl shadow-md transition"
          >
            <Check className="h-4 w-4" />
            <span>결과 항목 적용하기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
