import React, { useState, useEffect } from 'react';
import { AppTab, PhotoCardItem } from './types';
import { Header } from './components/Header';
import { RouletteView } from './components/RouletteView';
import { RelayView } from './components/RelayView';
import { PhotoPickerView } from './components/PhotoPickerView';
import { LadderView } from './components/LadderView';
import { GroupAndSeatingView } from './components/GroupAndSeatingView';
import { TimerView } from './components/TimerView';
import { StopwatchView } from './components/StopwatchView';
import { SettingsModal } from './components/SettingsModal';
import { DEFAULT_PHOTO_STUDENTS } from './utils/samplePhotos';
import { soundManager } from './utils/audio';
import { loadStoredPhotos, saveAllPhotosToDB } from './utils/photoStorage';

const STORAGE_KEY_STUDENTS = 'class_helper_master_students_v2';
const STORAGE_KEY_DUPLICATE = 'class_helper_allow_duplicate_v2';
const STORAGE_KEY_PHOTOS = 'class_helper_photos_v2';

const DEFAULT_18_STUDENTS = [
  '강윤찬', '강주연', '김민지', '김진후', '김현지', '박채현',
  '성서아', '송다정', '엄호준', '윤시우', '이솔빛나', '이정',
  '전성후', '정혜원', '최예은', '한태은', '허은서', '황혜리',
];

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('roulette');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Master students
  const [masterStudents, setMasterStudents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_18_STUDENTS;
  });

  // Active pool of students for drawing
  const [activeStudents, setActiveStudents] = useState<string[]>(masterStudents);

  // Allow duplicate option
  const [allowDuplicates, setAllowDuplicates] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DUPLICATE);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return false;
  });

  // Photo cards for the photo random picker
  const [photos, setPhotos] = useState<PhotoCardItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PHOTOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_PHOTO_STUDENTS;
  });
  const [isIndexedDBReady, setIsIndexedDBReady] = useState(false);

  // Load persistent photos from IndexedDB on startup
  useEffect(() => {
    loadStoredPhotos()
      .then((stored) => {
        if (stored && stored.length > 0) {
          setPhotos(stored);
        } else {
          // If empty, seed with initial photos
          saveAllPhotosToDB(
            DEFAULT_PHOTO_STUDENTS.map((p) => ({
              ...p,
              updatedAt: Date.now(),
            }))
          );
        }
        setIsIndexedDBReady(true);
      })
      .catch((err) => {
        console.warn('IndexedDB initial load fallback:', err);
        setIsIndexedDBReady(true);
      });
  }, []);

  // Sync settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(masterStudents));
    } catch {
      // ignore
    }
  }, [masterStudents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DUPLICATE, JSON.stringify(allowDuplicates));
    } catch {
      // ignore
    }
  }, [allowDuplicates]);

  // Sync photos to IndexedDB reliably
  useEffect(() => {
    if (!isIndexedDBReady) return;
    saveAllPhotosToDB(
      photos.map((p) => ({
        id: p.id,
        name: p.name,
        photoUrl: p.photoUrl,
        updatedAt: Date.now(),
      }))
    );
  }, [photos, isIndexedDBReady]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    soundManager.playClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundManager.enabled = next;
    if (next) soundManager.playClick();
  };

  // Student list handlers
  const handleRemoveSingleStudent = (name: string) => {
    setActiveStudents((prev) => prev.filter((s) => s !== name));
  };

  const handleRemoveMultipleStudents = (names: string[]) => {
    const removeSet = new Set(names);
    setActiveStudents((prev) => prev.filter((s) => !removeSet.has(s)));
  };

  const handleResetActiveStudents = () => {
    setActiveStudents([...masterStudents]);
  };

  const handleSaveSettings = (newStudents: string[], duplicateAllowed: boolean) => {
    setMasterStudents(newStudents);
    setActiveStudents([...newStudents]);
    setAllowDuplicates(duplicateAllowed);
  };

  // Photo handlers
  const handleAddPhotos = (newItems: PhotoCardItem[]) => {
    setPhotos((prev) => [...prev, ...newItems]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdatePhotoName = (id: string, name: string) => {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  };

  const handleLoadSamplePhotos = () => {
    setPhotos(DEFAULT_PHOTO_STUDENTS);
  };

  const handleClearAllPhotos = () => {
    if (window.confirm('등록된 모든 학생 사진을 삭제하시겠습니까?')) {
      setPhotos([]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-2 sm:p-4">
      {/* Main Classroom Box App Container */}
      <div
        id="app-container"
        className="w-full max-w-[1240px] bg-white/95 rounded-[28px] sm:rounded-[36px] shadow-2xl min-h-[85vh] flex flex-col border-4 sm:border-[6px] border-white relative overflow-hidden my-3 sm:my-6"
      >
        {/* Header with real-time clock, title, 5 tabs, settings, sound, fullscreen */}
        <Header
          currentTab={currentTab}
          onSelectTab={(tab) => {
            soundManager.playClick();
            setCurrentTab(tab);
          }}
          onOpenSettings={() => {
            soundManager.playClick();
            setIsSettingsOpen(true);
          }}
          soundEnabled={soundEnabled}
          onToggleSound={toggleSound}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />

        {/* Tab View Content Area */}
        <main className="flex-1 w-full p-4 sm:p-8 flex flex-col items-center justify-start pb-12 overflow-y-auto">
          {currentTab === 'roulette' && (
            <RouletteView
              students={activeStudents}
              onRemoveStudent={handleRemoveSingleStudent}
              allowDuplicates={allowDuplicates}
              onReset={handleResetActiveStudents}
            />
          )}

          {currentTab === 'relay' && (
            <RelayView
              students={activeStudents}
              onRemoveStudents={handleRemoveMultipleStudents}
              allowDuplicates={allowDuplicates}
              onReset={handleResetActiveStudents}
            />
          )}

          {currentTab === 'photo' && (
            <PhotoPickerView
              photos={photos}
              onAddPhotos={handleAddPhotos}
              onRemovePhoto={handleRemovePhoto}
              onUpdatePhotoName={handleUpdatePhotoName}
              onLoadSamplePhotos={handleLoadSamplePhotos}
              onClearAllPhotos={handleClearAllPhotos}
            />
          )}

          {currentTab === 'ladder' && <LadderView students={masterStudents} />}

          {currentTab === 'group' && <GroupAndSeatingView students={masterStudents} />}

          {currentTab === 'timer' && <TimerView />}

          {currentTab === 'stopwatch' && <StopwatchView />}
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        masterStudents={masterStudents}
        allowDuplicates={allowDuplicates}
        onSaveSettings={handleSaveSettings}
      />
    </div>
  );
}
