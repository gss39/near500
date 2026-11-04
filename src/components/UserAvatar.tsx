import React from 'react';
import { UserProfile } from '../data/nearbyUsers';

interface UserAvatarProps {
  preset: UserProfile['avatarPreset'];
  name: string;
  photoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnlineDot?: boolean;
  isOnlineNow?: boolean;
  className?: string;
}

const AVATAR_THEMES: Record<
  UserProfile['avatarPreset'],
  {
    bgStart: string;
    bgEnd: string;
    skin: string;
    hair: string;
    shirt: string;
    accent: string;
    glasses?: boolean;
    hairStyle: 'short-part' | 'wavy-long' | 'curly-crop' | 'bun' | 'fade' | 'bob';
  }
> = {
  rohan: {
    bgStart: '#e2e8f0',
    bgEnd: '#cbd5e1',
    skin: '#d99b72',
    hair: '#1e293b',
    shirt: '#0f172a',
    accent: '#38bdf8',
    hairStyle: 'short-part',
  },
  aarav: {
    bgStart: '#f1f5f9',
    bgEnd: '#e2e8f0',
    skin: '#e0a680',
    hair: '#1e293b',
    shirt: '#334155',
    accent: '#94a3b8',
    glasses: true,
    hairStyle: 'short-part',
  },
  priya: {
    bgStart: '#fef3c7',
    bgEnd: '#fde68a',
    skin: '#d4946a',
    hair: '#0f172a',
    shirt: '#1e293b',
    accent: '#f59e0b',
    hairStyle: 'wavy-long',
  },
  kabir: {
    bgStart: '#e0f2fe',
    bgEnd: '#bae6fd',
    skin: '#c68359',
    hair: '#172554',
    shirt: '#0f172a',
    accent: '#0284c7',
    hairStyle: 'curly-crop',
  },
  ananya: {
    bgStart: '#f3e8ff',
    bgEnd: '#e9d5ff',
    skin: '#dc9e76',
    hair: '#1e1b4b',
    shirt: '#312e81',
    accent: '#7c3aed',
    glasses: true,
    hairStyle: 'bun',
  },
  vikram: {
    bgStart: '#dcfce7',
    bgEnd: '#bbf7d0',
    skin: '#bd7b52',
    hair: '#090d16',
    shirt: '#14532d',
    accent: '#16a34a',
    hairStyle: 'fade',
  },
  meera: {
    bgStart: '#ffedd5',
    bgEnd: '#fed7aa',
    skin: '#d59369',
    hair: '#1c1917',
    shirt: '#431407',
    accent: '#ea580c',
    hairStyle: 'bob',
  },
  zoya: {
    bgStart: '#fae8ff',
    bgEnd: '#f5d0fe',
    skin: '#e2a882',
    hair: '#2e1065',
    shirt: '#3b0764',
    accent: '#c026d3',
    hairStyle: 'wavy-long',
  },
  dev: {
    bgStart: '#ecfccb',
    bgEnd: '#d9f99d',
    skin: '#cf8c62',
    hair: '#1e293b',
    shirt: '#1a2e05',
    accent: '#65a30d',
    glasses: true,
    hairStyle: 'short-part',
  },
  tara: {
    bgStart: '#ffe4e6',
    bgEnd: '#fecdd3',
    skin: '#dca078',
    hair: '#1f2937',
    shirt: '#4c0519',
    accent: '#e11d48',
    hairStyle: 'bob',
  },
};

const SIZE_CLASSES = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const DOT_SIZE_CLASSES = {
  sm: 'w-2.5 h-2.5 -bottom-0.5 -right-0.5',
  md: 'w-3 h-3 -bottom-0.5 -right-0.5',
  lg: 'w-3.5 h-3.5 -bottom-0.5 -right-0.5',
  xl: 'w-4 h-4 bottom-0 right-0',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  preset,
  name,
  photoUrl,
  size = 'md',
  showOnlineDot = false,
  isOnlineNow = true,
  className = '',
}) => {
  const theme = AVATAR_THEMES[preset] || AVATAR_THEMES.rohan;
  const gradientId = `avatar-bg-${preset}-${name.replace(/\s+/g, '')}`;

  const pulseDot = showOnlineDot ? (
    <span
      title={isOnlineNow ? 'Active now' : 'Recently active'}
      className={`absolute z-10 flex items-center justify-center rounded-full ${DOT_SIZE_CLASSES[size]}`}
    >
      {isOnlineNow && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span
        className={`relative inline-flex rounded-full w-full h-full border-2 border-white shadow-xs ${
          isOnlineNow ? 'bg-emerald-500' : 'bg-amber-400'
        }`}
      />
    </span>
  ) : null;

  if (photoUrl) {
    return (
      <div className={`relative shrink-0 select-none ${SIZE_CLASSES[size]} ${className}`}>
        <div className="w-full h-full overflow-hidden rounded-2xl border border-blue-200/80 bg-blue-50">
          <img
            src={photoUrl}
            alt={name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        {pulseDot}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 select-none ${SIZE_CLASSES[size]} ${className}`}
      role="img"
      aria-label={`Portrait of ${name}`}
    >
      <div className="w-full h-full overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100">
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={theme.bgStart} />
              <stop offset="100%" stopColor={theme.bgEnd} />
            </linearGradient>
          </defs>

          {/* Background Canvas */}
          <rect width="120" height="120" fill={`url(#${gradientId})`} />
          <circle cx="98" cy="22" r="28" fill={theme.accent} fillOpacity="0.12" />

          {/* Back Hair for Long/Bob styles */}
          {theme.hairStyle === 'wavy-long' && (
            <path
              d="M32 54C30 74 28 96 34 110H86C92 96 90 74 88 54H32Z"
              fill={theme.hair}
            />
          )}
          {theme.hairStyle === 'bob' && (
            <path
              d="M33 52C31 68 32 82 38 88H82C88 82 89 68 87 52H33Z"
              fill={theme.hair}
            />
          )}
          {theme.hairStyle === 'bun' && (
            <circle cx="60" cy="20" r="13" fill={theme.hair} />
          )}

          {/* Shoulders / Torso */}
          <path
            d="M20 122C22 96 37 86 60 86C83 86 98 96 100 122H20Z"
            fill={theme.shirt}
          />
          {/* Collar Detail */}
          <path
            d="M47 87L60 101L73 87"
            stroke={theme.accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.7"
          />

          {/* Neck */}
          <rect x="51" y="70" width="18" height="22" rx="8" fill={theme.skin} />
          {/* Neck Shadow */}
          <path d="M51 74C55 78 65 78 69 74V80H51V74Z" fill="#000000" fillOpacity="0.1" />

          {/* Ears */}
          <circle cx="37" cy="56" r="5" fill={theme.skin} />
          <circle cx="83" cy="56" r="5" fill={theme.skin} />

          {/* Head */}
          <rect x="38" y="30" width="44" height="50" rx="22" fill={theme.skin} />

          {/* Facial Features */}
          {/* Eyebrows */}
          <path d="M46 49C48 47.5 52 47.5 54 48.5" stroke={theme.hair} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M66 48.5C68 47.5 72 47.5 74 49" stroke={theme.hair} strokeWidth="2.2" strokeLinecap="round" />

          {/* Eyes */}
          <circle cx="50" cy="54" r="2.3" fill="#0f172a" />
          <circle cx="70" cy="54" r="2.3" fill="#0f172a" />
          <circle cx="50.8" cy="53.3" r="0.7" fill="#ffffff" />
          <circle cx="70.8" cy="53.3" r="0.7" fill="#ffffff" />

          {/* Optional Minimalist Glasses */}
          {theme.glasses && (
            <g stroke="#1e293b" strokeWidth="1.8" fill="none">
              <rect x="43" y="49.5" width="14" height="9.5" rx="3" fill="#ffffff" fillOpacity="0.15" />
              <rect x="63" y="49.5" width="14" height="9.5" rx="3" fill="#ffffff" fillOpacity="0.15" />
              <line x1="57" y1="54" x2="63" y2="54" />
            </g>
          )}

          {/* Nose */}
          <path d="M60 54V62.5L57.5 63.5" stroke="#000000" strokeOpacity="0.22" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Warm Smile */}
          <path
            d="M53.5 68.5C56 71.5 64 71.5 66.5 68.5"
            stroke="#7c2d12"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Top Hair Layer */}
          {theme.hairStyle === 'short-part' && (
            <path
              d="M36 50C35 34 45 24 60 24C75 24 85 34 84 50C81 40 74 36 64 36C53 36 43 41 36 50Z"
              fill={theme.hair}
            />
          )}
          {theme.hairStyle === 'curly-crop' && (
            <path
              d="M35 48C34 32 45 22 60 22C75 22 86 32 85 48C82 42 77 38 70 39C65 35 55 35 50 39C43 38 38 42 35 48Z"
              fill={theme.hair}
            />
          )}
          {theme.hairStyle === 'fade' && (
            <path
              d="M38 46C38 32 47 25 60 25C73 25 82 32 82 46C77 38 69 36 60 36C51 36 43 38 38 46Z"
              fill={theme.hair}
            />
          )}
          {(theme.hairStyle === 'wavy-long' || theme.hairStyle === 'bun' || theme.hairStyle === 'bob') && (
            <path
              d="M35 52C35 33 46 24 60 24C74 24 85 33 85 52C79 41 69 36 58 35C48 36 40 42 35 52Z"
              fill={theme.hair}
            />
          )}
        </svg>
      </div>
      {pulseDot}
    </div>
  );
};
