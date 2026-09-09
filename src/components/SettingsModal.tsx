import React, { useState, useEffect } from 'react';
import { X, Sparkles, Users } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterStudents: string[];
  allowDuplicates: boolean;
  onSaveSettings: (newStudents: string[], allowDuplicates: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  masterStudents,
  allowDuplicates,
  onSaveSettings,
}) => {
  const [inputText, setInputText] = useState('');
  const [isDuplicateAllowed, setIsDuplicateAllowed] = useState(allowDuplicates);

  useEffect(() => {
    if (isOpen) {
      setInputText(masterStudents.join('\n'));
      setIsDuplicateAllowed(allowDuplicates);
    }
  }, [isOpen, masterStudents, allowDuplicates]);

  if (!isOpen) return null;

  const currentLines = inputText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const handleSave = () => {
    if (currentLines.length === 0) {
      alert('최소 한 명 이상의 학생 이름을 입력해주세요.');
      return;
    }
    onSaveSettings(currentLines, isDuplicateAllowed);
    onClose();
  };

  const handleLoadDefault18 = () => {
    const defaults = [
      '강윤찬', '강주연', '김민지', '김진후', '김현지', '박채현',
      '성서아', '송다정', '엄호준', '윤시우', '이솔빛나', '이정',
      '전성후', '정혜원', '최예은', '한태은', '허은서', '황혜리',
    ];
    setInputText(defaults.join('\n'));
  };

  const handleLoadNumbers = (count: number) => {
    const nums = Array.from({ length: count }, (_, i) => `${i + 1}번`);
    setInputText(nums.join('\n'));
  };

  return (
    <div
      id="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div
        id="settings-content"
        className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border-4 border-[#ffdfba] animate-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚙️</span>
            <h2 className="text-2xl font-bold text-gray-800">추첨 및 학생 명단 설정</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 font-bold text-3xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Textarea */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="student-list-input" className="block text-gray-700 font-bold text-base">
              학생 명단 (줄바꿈/엔터로 구분)
            </label>
            <div className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
              총 <span id="student-count" className="font-extrabold">{currentLines.length}</span>명
            </div>
          </div>
          <textarea
            id="student-list-input"
            rows={7}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-2xl p-4 focus:outline-none focus:border-[#ffb3ba] font-sans text-gray-800 resize-none text-base bg-gray-50 focus:bg-white"
            placeholder="학생 이름을 한 줄에 한 명씩 입력하세요."
          />
        </div>

        {/* Quick Presets */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="text-gray-500 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            프리셋:
          </span>
          <button
            type="button"
            onClick={handleLoadDefault18}
            className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-lg hover:bg-orange-100"
          >
            기본 18명 명단
          </button>
          <button
            type="button"
            onClick={() => handleLoadNumbers(15)}
            className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100"
          >
            번호 1~15번
          </button>
          <button
            type="button"
            onClick={() => handleLoadNumbers(25)}
            className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-100"
          >
            번호 1~25번
          </button>
        </div>

        {/* Duplicate Option Radio */}
        <div className="mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
          <p className="text-gray-700 font-bold text-base">추첨 방식 옵션</p>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="duplicate-option"
              checked={isDuplicateAllowed}
              onChange={() => setIsDuplicateAllowed(true)}
              className="w-4 h-4 text-[#ffb3ba]"
            />
            <span className="ml-3 text-gray-700 font-bold text-sm sm:text-base">
              중복 허용 (한 번 뽑힌 사람도 다시 뽑힘)
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="duplicate-option"
              checked={!isDuplicateAllowed}
              onChange={() => setIsDuplicateAllowed(false)}
              className="w-4 h-4 text-[#ffb3ba]"
            />
            <span className="ml-3 text-gray-700 font-bold text-sm sm:text-base">
              중복 금지 (한 번 뽑히면 추첨 명단에서 제외)
            </span>
          </label>
        </div>

        {/* Save Button */}
        <button
          id="save-settings-btn"
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 sm:py-4 bg-[#ffb3ba] hover:bg-[#ff9eaa] text-white text-xl sm:text-2xl rounded-2xl shadow-md transition font-bold"
        >
          명단 저장하고 초기화
        </button>
      </div>
    </div>
  );
};
