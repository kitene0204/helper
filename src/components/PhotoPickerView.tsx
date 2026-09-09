import React, { useState, useRef } from 'react';
import { Upload, Trash2, RotateCcw, Sparkles, Image as ImageIcon, Check, UserCheck, ShieldCheck, RefreshCw } from 'lucide-react';
import { PhotoCardItem } from '../types';
import { soundManager } from '../utils/audio';
import { launchConfetti } from '../utils/confetti';
import { compressImage } from '../utils/photoStorage';

interface PhotoPickerViewProps {
  photos: PhotoCardItem[];
  onAddPhotos: (newPhotos: PhotoCardItem[]) => void;
  onRemovePhoto: (id: string) => void;
  onUpdatePhotoName: (id: string, name: string) => void;
  onLoadSamplePhotos: () => void;
  onClearAllPhotos: () => void;
}

export const PhotoPickerView: React.FC<PhotoPickerViewProps> = ({
  photos,
  onAddPhotos,
  onRemovePhoto,
  onUpdatePhotoName,
  onLoadSamplePhotos,
  onClearAllPhotos,
}) => {
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [isPicking, setIsPicking] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [currentDisplayedPhoto, setCurrentDisplayedPhoto] = useState<PhotoCardItem | null>(null);
  const [winnerPhoto, setWinnerPhoto] = useState<PhotoCardItem | null>(null);
  const [history, setHistory] = useState<PhotoCardItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameText, setEditNameText] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const animTimeoutRef = useRef<number | null>(null);

  // Available candidate photos
  const availablePhotos = photos.filter((p) => (allowDuplicates ? true : !excludedIds.has(p.id)));

  // Handle files upload with client-side compression for instant, indefinite persistence
  const processAndUploadFiles = async (files: FileList | null, isReplace = false) => {
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    const newItems: PhotoCardItem[] = [];
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const cleanName = file.name.replace(/\.[^/.]+$/, '').trim();
        // Compress image so it loads lightning fast and never overflows storage
        const compressedDataUrl = await compressImage(file, 640, 640, 0.85);

        newItems.push({
          id: 'photo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: cleanName || `학생 ${photos.length + newItems.length + 1}`,
          photoUrl: compressedDataUrl,
          pickedCount: 0,
        });
      }

      if (newItems.length > 0) {
        if (isReplace) {
          onClearAllPhotos();
        }
        onAddPhotos(newItems);
        soundManager.playPop();
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleStartDraw = () => {
    if (isPicking || availablePhotos.length === 0) return;

    soundManager.playClick();
    setIsPicking(true);
    setWinnerPhoto(null);

    // Pick winning photo
    const randomIndex = Math.floor(Math.random() * availablePhotos.length);
    const chosenWinner = availablePhotos[randomIndex];

    let speed = 40;
    let iterations = 0;
    const maxIterations = 35; // ~3 seconds

    const roll = () => {
      iterations++;
      const rand = availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
      setCurrentDisplayedPhoto(rand);
      soundManager.playTick(600 + iterations * 15);

      if (iterations < maxIterations) {
        if (iterations > 22) speed += 24;
        else if (iterations > 12) speed += 10;
        animTimeoutRef.current = window.setTimeout(roll, speed);
      } else {
        // Complete
        setCurrentDisplayedPhoto(chosenWinner);
        setWinnerPhoto(chosenWinner);
        setIsPicking(false);
        soundManager.playFanfare();
        launchConfetti(3500);

        setHistory((prev) => [chosenWinner, ...prev]);

        if (!allowDuplicates) {
          setExcludedIds((prev) => new Set([...prev, chosenWinner.id]));
        }
      }
    };

    roll();
  };

  const handleResetDraw = () => {
    if (isPicking) return;
    setExcludedIds(new Set());
    setWinnerPhoto(null);
    setCurrentDisplayedPhoto(null);
    setHistory([]);
    soundManager.playClick();
  };

  const handleSaveNameEdit = (id: string) => {
    if (editNameText.trim()) {
      onUpdatePhotoName(id, editNameText.trim());
    }
    setEditingId(null);
  };

  return (
    <div id="mode-photo-picker" className="flex flex-col items-center w-full max-w-6xl mx-auto space-y-6">
      {/* Top Controls & Status Banner */}
      <div className="w-full bg-white p-5 sm:p-6 rounded-3xl shadow-sm border-4 border-[#ffdfba] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white text-2xl shadow-sm">
            📸
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                아이들 사진 랜덤 뽑기
              </h2>
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>영구 보관 활성화</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 font-bold mt-0.5">
              전체 <span className="text-blue-600">{photos.length}명</span> 등록됨 · 추첨 대기{' '}
              <span className="text-[#ff6b6b]">{availablePhotos.length}명</span>
              <span className="hidden sm:inline text-xs text-gray-400 font-normal ml-2">
                (직접 삭제하거나 새로 올리기 전까지 브라우저에 영구 유지됩니다)
              </span>
            </p>
          </div>
        </div>

        {/* Options & Upload Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex items-center gap-2 cursor-pointer bg-orange-50 border-2 border-[#ffdfba] px-3 py-1.5 rounded-xl text-sm font-bold text-gray-700 select-none">
            <input
              type="checkbox"
              checked={allowDuplicates}
              onChange={(e) => setAllowDuplicates(e.target.checked)}
              className="w-4 h-4 rounded-sm text-orange-500"
            />
            <span>중복 허용</span>
          </label>

          {/* Hidden input for adding photos */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              processAndUploadFiles(e.target.files, false);
              e.target.value = '';
            }}
          />

          {/* Hidden input for replacing all photos */}
          <input
            ref={replaceFileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              processAndUploadFiles(e.target.files, true);
              e.target.value = '';
            }}
          />

          <button
            type="button"
            disabled={isProcessingFiles}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#bae1ff] hover:bg-[#9ecdf5] text-[#1c6fa6] rounded-xl text-sm sm:text-base font-bold shadow-xs transition disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            <span>사진 추가</span>
          </button>

          <button
            type="button"
            disabled={isProcessingFiles}
            onClick={() => {
              if (photos.length === 0 || window.confirm('기존 사진을 모두 지우고 새 사진들로 완전히 교체하시겠습니까?')) {
                replaceFileInputRef.current?.click();
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-xl text-sm sm:text-base font-bold shadow-xs transition disabled:opacity-50"
            title="기존 사진을 비우고 새로운 학급 사진으로 전체 교체"
          >
            <RefreshCw className="h-4 w-4" />
            <span>새 명단으로 교체</span>
          </button>

          {photos.length === 0 && (
            <button
              type="button"
              disabled={isProcessingFiles}
              onClick={onLoadSamplePhotos}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#baffc9] hover:bg-[#9eeeb3] text-[#1e7a35] rounded-xl text-sm sm:text-base font-bold shadow-xs transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>샘플 사진 불러오기</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleResetDraw}
            disabled={isPicking || isProcessingFiles}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm sm:text-base font-bold transition"
          >
            <RotateCcw className="h-4 w-4" />
            <span>추첨 리셋</span>
          </button>
        </div>
      </div>

      {/* Main Drawing Stage & Photo Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Center: Stage (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div
            id="photo-stage-frame"
            className="relative w-full min-h-[420px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 rounded-3xl border-4 border-white shadow-xl flex flex-col items-center justify-center p-6 text-white overflow-hidden"
          >
            {/* Ambient Background Light */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent pointer-events-none" />

            {/* Displayed Photo Spotlight */}
            <div className="relative z-10 flex flex-col items-center my-4">
              {isPicking && currentDisplayedPhoto ? (
                <div className="flex flex-col items-center animate-pop">
                  <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden border-4 border-amber-400 shadow-2xl bg-white p-1.5">
                    <img
                      src={currentDisplayedPhoto.photoUrl}
                      alt={currentDisplayedPhoto.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                  <span className="mt-4 text-3xl font-extrabold text-amber-300 drop-shadow-md">
                    {currentDisplayedPhoto.name}
                  </span>
                </div>
              ) : winnerPhoto ? (
                <div className="flex flex-col items-center animate-pop">
                  <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-6 border-[#baffc9] shadow-[0_0_35px_rgba(186,255,201,0.5)] bg-white p-2 winner-pulse">
                    <img
                      src={winnerPhoto.photoUrl}
                      alt={winnerPhoto.name}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                    <div className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                      당첨!
                    </div>
                  </div>
                  <div className="mt-5 text-center">
                    <span className="text-base text-amber-300 font-bold block mb-1">
                      🎉 이번 발표의 주인공 🎉
                    </span>
                    <span className="text-4xl sm:text-5xl font-black text-white tracking-wide drop-shadow-lg">
                      {winnerPhoto.name}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="w-48 h-48 rounded-3xl border-4 border-dashed border-white/30 flex items-center justify-center bg-white/5 mb-4">
                    <ImageIcon className="h-20 w-20 text-white/40" />
                  </div>
                  <p className="text-2xl font-bold text-gray-200">
                    {photos.length === 0
                      ? '사진을 추가해주세요!'
                      : '랜덤 사진 뽑기 준비 완료!'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {availablePhotos.length > 0
                      ? `${availablePhotos.length}명의 사진이 대기 중입니다.`
                      : '모든 학생이 뽑혔습니다. 리셋 버튼을 눌러주세요.'}
                  </p>
                </div>
              )}
            </div>

            {/* Big Action Button */}
            <div className="relative z-10 mt-4 flex items-center gap-3">
              <button
                id="start-photo-draw-btn"
                type="button"
                disabled={isPicking || availablePhotos.length === 0}
                onClick={handleStartDraw}
                className={`px-10 sm:px-14 py-4 text-2xl sm:text-3xl rounded-2xl font-bold transition-all shadow-lg ${
                  isPicking || availablePhotos.length === 0
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 active:scale-95'
                }`}
              >
                {isPicking ? '📸 두근두근 추첨 중...' : '📸 랜덤 사진 뽑기!'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: History Timeline (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col bg-white border-4 border-gray-100 rounded-3xl p-5 shadow-sm h-[480px]">
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <h3 className="text-xl font-bold text-gray-700">
              🏆 당첨된 사진 ({history.length}명)
            </h3>
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-xs text-gray-400 hover:text-red-500 font-bold"
              >
                기록 비우기
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-center text-gray-400">
                <p className="text-base font-bold">아직 당첨 내역이 없습니다.</p>
                <p className="text-xs mt-1">뽑기를 시작하면 여기에 사진과 이름이 기록됩니다.</p>
              </div>
            ) : (
              history.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-2 rounded-2xl border-2 border-[#ffdfba] bg-orange-50/50 animate-slide-up"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d35400] text-white text-xs font-bold shrink-0">
                    {history.length - idx}
                  </span>
                  <img
                    src={item.photoUrl}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-xs"
                  />
                  <span className="text-lg font-bold text-gray-800 flex-1">{item.name}</span>
                  <UserCheck className="h-5 w-5 text-emerald-600 mr-1" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Uploaded Photos Management Grid */}
      <div
        id="photos-management-tray"
        className="w-full bg-white border-4 border-gray-100 rounded-3xl p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              🖼️ 등록된 학생 사진 목록 ({photos.length}장)
            </h3>
            <p className="text-xs text-gray-500 font-bold">
              카드를 클릭하여 이름을 수정하거나, 이미지를 끌어다 놓아 새 사진을 추가할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLoadSamplePhotos}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
            >
              샘플 10명 사진 추가
            </button>
            {photos.length > 0 && (
              <button
                type="button"
                onClick={onClearAllPhotos}
                className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200"
              >
                전체 사진 삭제
              </button>
            )}
          </div>
        </div>

        {/* Drag and drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            processAndUploadFiles(e.dataTransfer.files, false);
          }}
          className={`relative flex flex-wrap gap-3.5 p-4 rounded-2xl border-2 border-dashed transition-colors min-h-[140px] items-center ${
            isDragOver
              ? 'border-orange-500 bg-orange-50/70'
              : 'border-gray-200 bg-gray-50/60'
          }`}
        >
          {isProcessingFiles && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center rounded-2xl">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-sm font-bold text-gray-800">
                사진을 최적화하여 브라우저에 영구 저장하는 중...
              </p>
            </div>
          )}

          {photos.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center py-6 text-gray-400">
              <Upload className="h-8 w-8 mb-2 text-gray-300" />
              <p className="text-base font-bold text-gray-600">
                컴퓨터에서 사진 파일들을 여기로 끌어다 놓으세요!
              </p>
              <p className="text-xs text-gray-400 mt-1">
                (여러 장 동시 선택 가능 · 파일명이 학생 이름이 됩니다 · 닫아도 영구 유지)
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 px-4 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100"
              >
                파일 찾아보기
              </button>
            </div>
          ) : (
            photos.map((photo) => {
              const isExcluded = excludedIds.has(photo.id);
              const isEditing = editingId === photo.id;

              return (
                <div
                  key={photo.id}
                  className={`group relative flex flex-col items-center bg-white border-2 rounded-2xl p-2 shadow-xs transition-all w-28 sm:w-32 ${
                    isExcluded
                      ? 'border-gray-200 opacity-40 grayscale'
                      : 'border-[#ffdfba] hover:border-orange-400 hover:shadow-md'
                  }`}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 mb-1.5">
                    <img
                      src={photo.photoUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {isEditing ? (
                    <div className="flex items-center w-full gap-1">
                      <input
                        type="text"
                        value={editNameText}
                        onChange={(e) => setEditNameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNameEdit(photo.id);
                        }}
                        className="w-full text-xs border rounded-sm p-1 font-bold text-center"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveNameEdit(photo.id)}
                        className="text-xs bg-blue-500 text-white rounded-sm px-1"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingId(photo.id);
                        setEditNameText(photo.name);
                      }}
                      className="text-sm font-bold text-gray-800 truncate w-full text-center cursor-pointer hover:text-blue-600"
                      title="클릭하여 이름 변경"
                    >
                      {photo.name}
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(photo.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-xs hover:bg-red-600"
                    title="사진 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
