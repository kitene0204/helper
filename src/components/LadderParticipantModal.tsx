import React, { useState } from 'react';
import { X, Check, Users, Shuffle, Plus, Trash2 } from 'lucide-react';
import { soundManager } from '../utils/audio';

interface LadderParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  allMasterStudents: string[];
  currentParticipants: string[];
  onSaveParticipants: (selected: string[]) => void;
}

export const LadderParticipantModal: React.FC<LadderParticipantModalProps> = ({
  isOpen,
  onClose,
  allMasterStudents,
  currentParticipants,
  onSaveParticipants,
}) => {
  const [selectedList, setSelectedList] = useState<string[]>(currentParticipants);
  const [customNameInput, setCustomNameInput] = useState('');

  if (!isOpen) return null;

  const toggleStudent = (name: string) => {
    soundManager.playClick();
    setSelectedList((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSelectAll = () => {
    soundManager.playClick();
    setSelectedList([...allMasterStudents]);
  };

  const handleClearAll = () => {
    soundManager.playClick();
    setSelectedList([]);
  };

  const handleRandomSelect = (count: number) => {
    soundManager.playPop();
    const shuffled = [...allMasterStudents].sort(() => Math.random() - 0.5);
    setSelectedList(shuffled.slice(0, Math.min(count, shuffled.length)));
  };

  const handleAddCustomName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customNameInput.trim();
    if (!trimmed) return;
    if (selectedList.includes(trimmed)) {
      alert('이미 참가자 목록에 있는 이름입니다.');
      return;
    }
    soundManager.playPop();
    setSelectedList((prev) => [...prev, trimmed]);
    setCustomNameInput('');
  };

  const handleRemoveParticipant = (name: string) => {
    soundManager.playClick();
    setSelectedList((prev) => prev.filter((n) => n !== name));
  };

  const handleSave = () => {
    if (selectedList.length < 2) {
      alert('사다리타기를 하려면 최소 2명 이상의 참가자가 필요합니다.');
      return;
    }
    soundManager.playPop();
    onSaveParticipants(selectedList);
    onClose();
  };

  return (
    <div
      id="ladder-participant-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-[#ffdfba] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#ffdfba] to-[#ffe8cc] border-b-2 border-orange-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-amber-950">
                사다리타기 참가자 선택
              </h2>
              <p className="text-xs text-amber-800/80">
                원하는 학생만 콕 집거나 랜덤 인원을 빠르게 골라 사다리를 탈 수 있습니다.
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
          {/* Quick Select Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50/70 rounded-2xl border border-amber-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Users className="h-4 w-4 text-amber-600" />
              <span>
                선택됨:{' '}
                <strong className="text-rose-600 text-sm">{selectedList.length}</strong>명
                (최소 2명 필요)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleSelectAll}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition shadow-2xs"
              >
                전체 선택
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-gray-300 text-gray-600 hover:bg-gray-100 transition shadow-2xs"
              >
                전체 해제
              </button>
              <div className="h-4 w-px bg-amber-200 mx-0.5" />
              {[4, 6, 8, 10, 12].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handleRandomSelect(cnt)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 border border-orange-200 transition"
                  title={`반 학생 중 무작위 ${cnt}명을 선택합니다`}
                >
                  <Shuffle className="h-3 w-3" />
                  <span>{cnt}명</span>
                </button>
              ))}
            </div>
          </div>

          {/* Master Students Checklist */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
              우리 반 학생 목록 ({allMasterStudents.length}명)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allMasterStudents.map((name, idx) => {
                const isChecked = selectedList.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleStudent(name)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      isChecked
                        ? 'bg-amber-400/20 border-amber-500 text-amber-950 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-[10px] text-gray-400 w-4 text-left">{idx + 1}</span>
                      <span className="truncate">{name}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] transition ${
                        isChecked
                          ? 'bg-amber-500 text-white font-bold'
                          : 'border border-gray-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direct Custom Name Input */}
          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
              외부 참가자 / 선생님 직접 추가
            </h3>
            <form onSubmit={handleAddCustomName} className="flex gap-2">
              <input
                type="text"
                placeholder="예: 담임선생님, 교생선생님 등"
                value={customNameInput}
                onChange={(e) => setCustomNameInput(e.target.value)}
                maxLength={10}
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                disabled={!customNameInput.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-2xs transition"
              >
                <Plus className="h-4 w-4" />
                <span>추가</span>
              </button>
            </form>
          </div>

          {/* Currently Selected Chips */}
          <div>
            <h3 className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">
              현재 참여 확정 순서 ({selectedList.length}명)
            </h3>
            {selectedList.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">참가할 학생을 위에서 선택해주세요.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50 rounded-2xl border border-gray-200 max-h-32 overflow-y-auto">
                {selectedList.map((name, i) => (
                  <span
                    key={`${name}-${i}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-amber-300 text-amber-950 rounded-lg text-xs font-bold shadow-2xs"
                  >
                    <span className="text-[10px] text-amber-600 font-extrabold">{i + 1}</span>
                    <span>{name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(name)}
                      className="text-gray-400 hover:text-rose-500 transition"
                      title="제외"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
            disabled={selectedList.length < 2}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-md transition"
          >
            <Check className="h-4 w-4" />
            <span>선택 완료 ({selectedList.length}명으로 사다리 시작)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
