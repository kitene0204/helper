import React, { useState, useEffect } from 'react';
import { Settings, Volume2, VolumeX, Maximize2, Minimize2, Sparkles, Clock } from 'lucide-react';
import { AppTab } from '../types';

interface HeaderProps {
  currentTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onOpenSettings: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  onOpenSettings,
  soundEnabled,
  onToggleSound,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [dateTimeStr, setDateTimeStr] = useState('');

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const date = now.getDate();
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      const day = days[now.getDay()];
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      setDateTimeStr(`${year}년 ${month}월 ${date}일 (${day}) ${hours}:${minutes}:${seconds}`);
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const tabs: { id: AppTab; label: string; icon: string }[] = [
    { id: 'roulette', label: '두근두근 룰렛', icon: '🎡' },
    { id: 'relay', label: '스피드 릴레이', icon: '🏃' },
    { id: 'photo', label: '사진 랜덤 뽑기', icon: '📸' },
    { id: 'timer', label: '뽀모도로 타이머', icon: '🍅' },
    { id: 'stopwatch', label: '스피드 스톱워치', icon: '⏱️' },
  ];

  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 w-full border-b-4 border-[#ffb3ba] bg-[#ffdfba] px-4 py-3 sm:px-8 shadow-xs"
    >
      <div className="flex flex-col gap-2 max-w-7xl mx-auto">
        {/* Top: Live Date & Clock Bar */}
        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-[#d35400]">
          <div className="flex items-center gap-1.5 opacity-90">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>신나고 공정한 우리 반 수업 도우미</span>
          </div>
          <div id="current-datetime" className="tracking-wide flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-[#d35400]" />
            <span>{dateTimeStr || '시간을 불러오는 중...'}</span>
          </div>
        </div>

        {/* Main Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm text-2xl border-2 border-[#ffb3ba]">
              🎒
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-wide text-gray-800">
                ✨ 우리 반 만능 도우미
              </h1>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            id="main-tab-bar"
            className="flex flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto py-1"
          >
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-base sm:text-lg font-bold transition-all border-2 ${
                    isActive
                      ? 'bg-[#ff6b6b] text-white border-[#ff4757] shadow-sm transform -translate-y-0.5'
                      : 'bg-white text-gray-700 border-[#ffb3ba] hover:bg-orange-50 hover:text-gray-900 shadow-xs active:translate-y-1'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Utility Actions (Settings, Sound, Fullscreen) */}
          <div className="flex items-center gap-2">
            <button
              id="open-settings-btn"
              type="button"
              onClick={onOpenSettings}
              title="학생 명단 & 사진 설정"
              className="flex items-center gap-1.5 rounded-full bg-white p-2.5 sm:px-4 sm:py-2 text-gray-600 shadow-sm border-2 border-[#ffb3ba] hover:text-gray-900 hover:rotate-45 transition-transform duration-200"
            >
              <Settings className="h-5 w-5 text-gray-700" />
              <span className="hidden sm:inline text-sm font-bold">학생 명단 설정</span>
            </button>

            <button
              id="toggle-sound-btn"
              type="button"
              onClick={onToggleSound}
              title={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
              className="rounded-full bg-white p-2.5 text-gray-600 shadow-sm border-2 border-[#ffb3ba] hover:text-gray-900 transition-colors"
            >
              {soundEnabled ? (
                <Volume2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
            </button>

            <button
              id="toggle-fullscreen-btn"
              type="button"
              onClick={onToggleFullscreen}
              title={isFullscreen ? '전체화면 종료' : '빔프로젝터 전체화면'}
              className="rounded-full bg-white p-2.5 text-gray-600 shadow-sm border-2 border-[#ffb3ba] hover:text-gray-900 transition-colors"
            >
              {isFullscreen ? (
                <Minimize2 className="h-5 w-5 text-blue-600" />
              ) : (
                <Maximize2 className="h-5 w-5 text-gray-700" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
