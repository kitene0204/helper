import React, { useState } from 'react';
import { X, UserCheck, ShieldAlert, Plus, Trash2, Sparkles } from 'lucide-react';
import { StudentGender } from '../types';
import { SeparatePair } from '../utils/groupAndSeating';

interface StudentRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: string[];
  genderMap: Record<string, StudentGender>;
  onUpdateGender: (student: string, gender: StudentGender) => void;
  frontPreferred: string[];
  onToggleFrontPreferred: (student: string) => void;
  separatePairs: SeparatePair[];
  onAddSeparatePair: (s1: string, s2: string) => void;
  onRemoveSeparatePair: (index: number) => void;
  onQuickAutoGender: () => void;
}

export const StudentRulesModal: React.FC<StudentRulesModalProps> = ({
  isOpen,
  onClose,
  students,
  genderMap,
  onUpdateGender,
  frontPreferred,
  onToggleFrontPreferred,
  separatePairs,
  onAddSeparatePair,
  onRemoveSeparatePair,
  onQuickAutoGender,
}) => {
  const [pairS1, setPairS1] = useState(students[0] || '');
  const [pairS2, setPairS2] = useState(students[1] || '');

  if (!isOpen) return null;

  const handleAddPair = () => {
    if (!pairS1 || !pairS2) return;
    if (pairS1 === pairS2) {
      alert('서로 다른 두 학생을 선택해 주세요.');
      return;
    }
    const exists = separatePairs.some(
      (p) => (p.student1 === pairS1 && p.student2 === pairS2) || (p.student1 === pairS2 && p.student2 === pairS1)
    );
    if (exists) {
      alert('이미 등록된 분리 규칙입니다.');
      return;
    }
    onAddSeparatePair(pairS1, pairS2);
  };

  const frontSet = new Set(frontPreferred);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border-4 border-amber-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 px-6 py-4 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <div>
              <h3 className="text-xl font-bold text-gray-800">학생 맞춤 설정 (성별 & 짝 분리 & 앞자리)</h3>
              <p className="text-xs text-amber-800">
                모둠 균등 분배와 좌석 배치 시 자동으로 적용되는 규칙입니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 p-1 rounded-xl transition"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Separate Pairs (금지 짝) */}
          <div className="bg-rose-50/70 border-2 border-rose-200 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-500" />
                <h4 className="font-bold text-gray-800">
                  특정 학생 짝 분리 (같은 모둠 / 짝꿍 금지)
                </h4>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2.5 py-0.5 rounded-full">
                {separatePairs.length}개 규칙 등록됨
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              수업 분위기나 관계를 고려하여 같은 모둠이나 짝꿍으로 배정되지 않아야 할 두 학생을 지정하세요.
            </p>

            <div className="flex flex-wrap items-center gap-2 mb-3 bg-white p-2.5 rounded-xl border border-rose-200">
              <select
                value={pairS1}
                onChange={(e) => setPairS1(e.target.value)}
                className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg border border-gray-300 font-bold text-sm bg-gray-50"
              >
                {students.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="text-rose-500 font-bold text-sm">❌ 짝 분리</span>
              <select
                value={pairS2}
                onChange={(e) => setPairS2(e.target.value)}
                className="flex-1 min-w-[120px] px-3 py-1.5 rounded-lg border border-gray-300 font-bold text-sm bg-gray-50"
              >
                {students.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddPair}
                className="flex items-center gap-1 bg-rose-500 hover:bg-rose-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-bold shadow-xs transition"
              >
                <Plus className="h-4 w-4" />
                <span>추가</span>
              </button>
            </div>

            {/* Existing Pairs List */}
            {separatePairs.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {separatePairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-white border border-rose-300 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-800 shadow-2xs"
                  >
                    <span>{pair.student1}</span>
                    <span className="text-rose-500">≠</span>
                    <span>{pair.student2}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveSeparatePair(idx)}
                      className="text-gray-400 hover:text-rose-600 ml-1 p-0.5"
                      title="규칙 삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">등록된 분리 규칙이 없습니다.</p>
            )}
          </div>

          {/* Section 2: Student Gender & Front Preference */}
          <div className="bg-amber-50/50 border-2 border-amber-200 rounded-2xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-600" />
                <h4 className="font-bold text-gray-800">
                  학생별 성별 (남/여) 및 앞자리 배려 지정
                </h4>
              </div>
              <button
                type="button"
                onClick={onQuickAutoGender}
                className="flex items-center gap-1 text-xs font-bold bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-lg transition"
                title="홀수/짝수 번호 기준 남/여 임시 자동 배정"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>남/여 번호순 균등 자동 채우기</span>
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              버튼을 클릭하여 각 학생의 성별(👦남/👧여)과 시력·키 등을 배려한 [🌟앞자리]를 설정하세요.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {students.map((student) => {
                const currentGender = genderMap[student] || 'none';
                const isFront = frontSet.has(student);

                return (
                  <div
                    key={student}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-amber-200 text-sm"
                  >
                    <span className="font-bold text-gray-800 truncate max-w-[110px]">
                      {student}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Gender Selector buttons */}
                      <button
                        type="button"
                        onClick={() => onUpdateGender(student, currentGender === 'M' ? 'none' : 'M')}
                        className={`px-2 py-0.5 rounded-md text-xs font-bold transition ${
                          currentGender === 'M'
                            ? 'bg-blue-500 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-500 hover:bg-blue-100 hover:text-blue-600'
                        }`}
                        title="남학생으로 설정"
                      >
                        👦 남
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateGender(student, currentGender === 'F' ? 'none' : 'F')}
                        className={`px-2 py-0.5 rounded-md text-xs font-bold transition ${
                          currentGender === 'F'
                            ? 'bg-pink-500 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-500 hover:bg-pink-100 hover:text-pink-600'
                        }`}
                        title="여학생으로 설정"
                      >
                        👧 여
                      </button>

                      {/* Front seat button */}
                      <button
                        type="button"
                        onClick={() => onToggleFrontPreferred(student)}
                        className={`px-2 py-0.5 rounded-md text-xs font-bold transition ml-1 ${
                          isFront
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-400 hover:bg-amber-100 hover:text-amber-700'
                        }`}
                        title="좌석 배치 시 앞자리 우선 배정"
                      >
                        🌟 앞자리
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-3.5 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-xs transition"
          >
            설정 완료 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
