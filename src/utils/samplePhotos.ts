// Default sample illustrated student avatars (SVGs as Data URLs) for instant demonstration

function createAvatarSvg(bg: string, faceEmoji: string, hairColor: string, accessoryEmoji: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <defs>
      <radialGradient id="grad" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${bg}" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="${bg}"/>
      </radialGradient>
    </defs>
    <rect width="200" height="200" rx="40" fill="url(#grad)" />
    <!-- Character Face -->
    <circle cx="100" cy="105" r="55" fill="#FFE0BD" stroke="#E0AC69" stroke-width="3" />
    <!-- Hair Base -->
    <path d="M 45 95 Q 100 35 155 95 Q 100 65 45 95 Z" fill="${hairColor}" />
    <!-- Eyes -->
    <circle cx="80" cy="100" r="6" fill="#333" />
    <circle cx="120" cy="100" r="6" fill="#333" />
    <!-- Cheeks -->
    <circle cx="68" cy="112" r="8" fill="#FF8A80" opacity="0.6" />
    <circle cx="132" cy="112" r="8" fill="#FF8A80" opacity="0.6" />
    <!-- Smile -->
    <path d="M 85 118 Q 100 132 115 118" fill="none" stroke="#333" stroke-width="3" stroke-linecap="round" />
    <!-- Badge / Accessory -->
    <text x="100" y="175" font-size="28" text-anchor="middle">${accessoryEmoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_PHOTO_STUDENTS = [
  { id: 'p-1', name: '강윤찬', photoUrl: createAvatarSvg('#BAE1FF', '👦', '#4A3B32', '⭐') },
  { id: 'p-2', name: '강주연', photoUrl: createAvatarSvg('#FFB3BA', '👧', '#2D2D2D', '🎀') },
  { id: 'p-3', name: '김민지', photoUrl: createAvatarSvg('#FFFFBA', '👧', '#8D5524', '🌸') },
  { id: 'p-4', name: '김진후', photoUrl: createAvatarSvg('#BAFFC9', '👦', '#3A2E2B', '⚽') },
  { id: 'p-5', name: '김현지', photoUrl: createAvatarSvg('#FFDFBA', '👧', '#5D4037', '🎨') },
  { id: 'p-6', name: '박채현', photoUrl: createAvatarSvg('#E8B2FF', '👧', '#3E2723', '🎵') },
  { id: 'p-7', name: '윤시우', photoUrl: createAvatarSvg('#B2FFF7', '👦', '#212121', '🚀') },
  { id: 'p-8', name: '이솔빛나', photoUrl: createAvatarSvg('#FFD1DC', '👧', '#4E342E', '✨') },
  { id: 'p-9', name: '전성후', photoUrl: createAvatarSvg('#E2F0CB', '👦', '#2C3E50', '🦁') },
  { id: 'p-10', name: '최예은', photoUrl: createAvatarSvg('#F3E5AB', '👧', '#6D4C41', '🧸') },
];
