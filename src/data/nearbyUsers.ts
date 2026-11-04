export type AvatarPreset =
  | 'rohan'
  | 'aarav'
  | 'priya'
  | 'kabir'
  | 'ananya'
  | 'vikram'
  | 'meera'
  | 'zoya'
  | 'dev'
  | 'tara';

export interface UserProfile {
  id: string;
  name: string;
  role: string;
  bio: string;
  locationSpot: string;
  statusTag?: string;
  distanceMeters: number;
  compassDir?: string;
  avatarPreset: AvatarPreset;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  lastSeenAt?: number;
  gpsUpdatedAt?: number;
  waved?: boolean;
  wavedAtMe?: boolean;
}

export interface ChatMessage {
  id: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  mapUrl?: string;
  seen?: boolean;
  reactions?: Record<string, string>;
  timestamp: string;
  createdAt: number;
}

export interface CurrentUserProfile {
  id: string;
  name: string;
  role: string;
  locationSpot: string;
  bio: string;
  statusTag?: string;
  photoUrl?: string;
  isDiscoverableUnder500m: boolean;
  avatarPreset: AvatarPreset;
  lat: number | null;
  lng: number | null;
  accuracy?: number;
  gpsUpdatedAt?: number;
}

export interface BlockedUserInfo {
  id: string;
  name: string;
  role: string;
  avatarPreset: AvatarPreset;
  photoUrl?: string;
}

const STORAGE_KEY = 'near500_live_profile_v1';
const BLOCKED_STORAGE_KEY = 'near500_blocked_users_v2';

export const STATUS_TAG_OPTIONS: string[] = [
  '🤝 Open to Chat',
  '☕ Coffee Break',
  '📚 Studying / Working',
  '🚨 Need Local Help',
];

export const REACTION_EMOJIS: string[] = ['❤️', '👍', '😂', '🔥'];

export function loadBlockedUsers(): BlockedUserInfo[] {
  try {
    const raw = localStorage.getItem(BLOCKED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function saveBlockedUsers(users: BlockedUserInfo[]) {
  try {
    localStorage.setItem(BLOCKED_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore storage errors
  }
}

export const AVATAR_PRESET_LIST: { id: AvatarPreset; label: string }[] = [
  { id: 'rohan', label: 'Style 1' },
  { id: 'aarav', label: 'Style 2' },
  { id: 'priya', label: 'Style 3' },
  { id: 'kabir', label: 'Style 4' },
  { id: 'ananya', label: 'Style 5' },
  { id: 'vikram', label: 'Style 6' },
  { id: 'meera', label: 'Style 7' },
  { id: 'zoya', label: 'Style 8' },
];

export function loadOrCreateCurrentUser(): CurrentUserProfile {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.id && parsed.name) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const presets: AvatarPreset[] = [
    'rohan',
    'aarav',
    'priya',
    'kabir',
    'ananya',
    'vikram',
    'meera',
    'zoya',
  ];
  const randomPreset = presets[Math.floor(Math.random() * presets.length)];

  const freshProfile: CurrentUserProfile = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `User ${randomSuffix}`,
    role: 'Member',
    locationSpot: 'Live GPS',
    bio: 'Available to connect within 500m.',
    statusTag: '🤝 Open to Chat',
    isDiscoverableUnder500m: true,
    avatarPreset: randomPreset,
    lat: null,
    lng: null,
  };

  saveCurrentUserToStorage(freshProfile);
  return freshProfile;
}

export function saveCurrentUserToStorage(profile: CurrentUserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // ignore storage errors
  }
}

/**
 * Compress an uploaded image file into a compact JPEG data URL
 * so profile photos and chat images sync rapidly over WebSockets and HTTP.
 */
export function compressImageFile(
  file: File,
  maxDimension = 180,
  quality = 0.76
): Promise<string> {
  return new Promise((resolve, reject) => {
    const renderToCanvas = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width || maxDimension;
        let height = img.naturalHeight || img.height || maxDimension;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.max(1, Math.round((height * maxDimension) / width));
            width = maxDimension;
          }
        } else if (height > maxDimension) {
          width = Math.max(1, Math.round((width * maxDimension) / height));
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    const fallbackWithFileReader = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const resultStr = String(e.target?.result || '');
        if (!resultStr) {
          reject(new Error('Empty file result'));
          return;
        }
        const img = new Image();
        img.onload = () => renderToCanvas(img);
        img.onerror = () => resolve(resultStr);
        img.src = resultStr;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        renderToCanvas(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        fallbackWithFileReader();
      };
      img.src = objectUrl;
    } else {
      fallbackWithFileReader();
    }
  });
}

/**
 * Subtle notification chime using Web Audio API when a new message arrives.
 */
export function playMessagePopSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.09); // A5
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch {
    // ignore audio restrictions
  }
}

/**
 * Compute live online status and human-readable activity label from lastSeenAt timestamp.
 */
export function getPresenceStatus(
  lastSeenAt?: number,
  now: number = Date.now()
): { isOnlineNow: boolean; label: string } {
  if (!lastSeenAt) {
    return { isOnlineNow: true, label: 'Active now' };
  }
  const diffMs = Math.max(0, now - lastSeenAt);
  if (diffMs <= 28000) {
    return { isOnlineNow: true, label: 'Active now' };
  }
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  return { isOnlineNow: false, label: `${mins}m ago` };
}
