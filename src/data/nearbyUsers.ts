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
  accuracy?: number;
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
  phoneNumber?: string;
  isPhoneVerified?: boolean;
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

export interface LocalWallPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: AvatarPreset;
  authorPhotoUrl?: string;
  distanceMeters: number;
  text: string;
  tag: string;
  likes: number;
  likedByMe?: boolean;
  createdAt: number;
}

const STORAGE_KEY = 'near500_live_profile_v1';
const BLOCKED_STORAGE_KEY = 'near500_blocked_users_v2';
const MESSAGES_STORAGE_KEY = 'near500_chat_messages_v2';
const WALL_STORAGE_KEY = 'near500_local_wall_v2';

export const STATUS_TAG_OPTIONS: string[] = [
  '🤝 Open to Chat',
  '☕ Coffee Break',
  '💻 Working / Tech',
  '💼 Networking',
];

export const REACTION_EMOJIS: string[] = ['❤️', '👍', '😂', '🔥'];

/**
 * Starter Community Peers so a first-time visitor never sees an empty chat directory.
 * They respond naturally to "Say Hi 👋" and chat messages so users can test & enjoy
 * every feature immediately.
 */
export const COMMUNITY_STARTER_PEERS: UserProfile[] = [
  {
    id: 'community-peer-aarav',
    name: 'Aarav Sharma',
    role: 'Software Engineer',
    bio: 'Building web products & open for quick tech discussions or casual chats.',
    locationSpot: 'Bengaluru · Online',
    statusTag: '💻 Working / Tech',
    distanceMeters: 0,
    avatarPreset: 'aarav',
  },
  {
    id: 'community-peer-priya',
    name: 'Priya Verma',
    role: 'Product Designer',
    bio: 'Designing interfaces & user flows. Say hi anytime if you want to connect!',
    locationSpot: 'Mumbai · Online',
    statusTag: '🤝 Open to Chat',
    distanceMeters: 0,
    avatarPreset: 'priya',
  },
  {
    id: 'community-peer-kabir',
    name: 'Kabir Patel',
    role: 'Startup Founder',
    bio: 'Connecting with builders, creators, and professionals across the web.',
    locationSpot: 'Delhi NCR · Online',
    statusTag: '💼 Networking',
    distanceMeters: 0,
    avatarPreset: 'kabir',
  },
  {
    id: 'community-peer-zoya',
    name: 'Zoya Khan',
    role: 'Content & Media Lead',
    bio: 'Always happy to exchange ideas, collaborate, or have a good conversation.',
    locationSpot: 'Hyderabad · Online',
    statusTag: '☕ Coffee Break',
    distanceMeters: 0,
    avatarPreset: 'zoya',
  },
];

const STARTER_PEER_IDS = new Set(COMMUNITY_STARTER_PEERS.map((p) => p.id));

export function isCommunityStarterPeer(userId: string): boolean {
  return STARTER_PEER_IDS.has(userId);
}

export function getStarterAutoReply(
  peerId: string,
  incomingText: string,
  senderName: string
): string {
  const firstName = senderName.split(' ')[0] || 'friend';
  const clean = incomingText.toLowerCase();

  if (clean.includes('hi') || clean.includes('hello') || clean.includes('hey') || clean.includes('👋')) {
    if (peerId === 'community-peer-aarav') {
      return `Hey ${firstName}! 👋 Great to connect with you on live chat. What are you working on today?`;
    }
    if (peerId === 'community-peer-priya') {
      return `Hi ${firstName}! ✨ Lovely to see you online here. How is your day going?`;
    }
    if (peerId === 'community-peer-kabir') {
      return `Hello ${firstName}! 🙌 Welcome to live chat. Where are you joining from?`;
    }
    return `Hey ${firstName}! 👋 Good to connect with you! How have you been?`;
  }

  if (clean.includes('📍') || clean.includes('spot') || clean.includes('kaha') || clean.includes('where')) {
    return `Nice ${firstName}! You can also share the invite link with your friends or teammates so they appear live here from anywhere.`;
  }

  if (peerId === 'community-peer-aarav') {
    return `Sounds great ${firstName}! Anyone who opens this chat link from anywhere will appear right here live so you can message instantly 🔥`;
  }
  if (peerId === 'community-peer-priya') {
    return `Awesome ${firstName}! You can share photos, voice notes, and react to messages right inside this chat 💬`;
  }
  if (peerId === 'community-peer-kabir') {
    return `Bilkul ${firstName}! Jab bhi koi naya user site par live hoga, wo sabhi ko turant yahan upar dikhega chahe kitni bhi door ho!`;
  }
  return `Haha nice ${firstName}! 😊 Anyone online on this site right now can connect and chat with you in real time.`;
}

export function loadSavedMessages(currentUserId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  const now = Date.now();
  const welcomeMsg: ChatMessage = {
    id: 'welcome-msg-aarav-1',
    fromUserId: 'community-peer-aarav',
    toUserId: currentUserId,
    text: 'Hey! 👋 Welcome to live chat! Reply anytime or share the invite link with anyone to connect and chat live from anywhere.',
    seen: false,
    reactions: {},
    timestamp: new Date(now - 60000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
    createdAt: now - 60000,
  };
  return [welcomeMsg];
}

export function saveMessagesToStorage(messages: ChatMessage[]) {
  try {
    const trimmed = messages.slice(-120);
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore storage quota errors
  }
}

export function loadLocalWallPosts(): LocalWallPost[] {
  try {
    const raw = localStorage.getItem(WALL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  const now = Date.now();
  return [
    {
      id: 'wall-starter-1',
      authorId: 'community-peer-aarav',
      authorName: 'Aarav Sharma',
      authorRole: 'B.Tech CS · 3rd Year',
      authorAvatar: 'aarav',
      distanceMeters: 42,
      text: 'Koi abhi paas me chai/coffee break ke liye free hai kya? 10 min me milte hain! ☕',
      tag: '☕ Coffee Break',
      likes: 6,
      likedByMe: false,
      createdAt: now - 14 * 60 * 1000,
    },
    {
      id: 'wall-starter-2',
      authorId: 'community-peer-priya',
      authorName: 'Priya Verma',
      authorRole: 'UI/UX Designer',
      authorAvatar: 'priya',
      distanceMeters: 118,
      text: 'Reading hall ka Wi-Fi aaj kaafi fast chal raha hai. Anyone working on design or coding nearby? 💻✨',
      tag: '📚 Studying / Working',
      likes: 4,
      likedByMe: false,
      createdAt: now - 32 * 60 * 1000,
    },
    {
      id: 'wall-starter-3',
      authorId: 'community-peer-kabir',
      authorName: 'Kabir Patel',
      authorRole: 'Startup Founder',
      authorAvatar: 'kabir',
      distanceMeters: 215,
      text: 'Is 500m radar ko apne aas-paas ke dosto ke phone me kholo—bina number share kiye instant live chat hoti hai! 🔥',
      tag: '🤝 Open to Chat',
      likes: 11,
      likedByMe: false,
      createdAt: now - 55 * 60 * 1000,
    },
  ];
}

export function saveLocalWallPosts(posts: LocalWallPost[]) {
  try {
    localStorage.setItem(WALL_STORAGE_KEY, JSON.stringify(posts.slice(0, 50)));
  } catch {
    // ignore storage errors
  }
}

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
        return {
          ...parsed,
          locationSpot:
            parsed.locationSpot === 'Live GPS' || !parsed.locationSpot
              ? 'Online'
              : parsed.locationSpot,
          bio:
            parsed.bio === 'Available to connect within 500m.'
              ? 'Available for live chat and networking.'
              : parsed.bio || '',
          isDiscoverableUnder500m:
            typeof parsed.isDiscoverableUnder500m === 'boolean'
              ? parsed.isDiscoverableUnder500m
              : true,
          lat: typeof parsed.lat === 'number' ? parsed.lat : null,
          lng: typeof parsed.lng === 'number' ? parsed.lng : null,
        };
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
    locationSpot: 'Online',
    bio: 'Available for live chat and networking.',
    statusTag: '🤝 Open to Chat',
    isDiscoverableUnder500m: true,
    avatarPreset: randomPreset,
    lat: null,
    lng: null,
  };

  saveCurrentUserToStorage(freshProfile);
  return freshProfile;
}

export function getPhoneAccountId(fullPhone: string): string {
  const normalized = fullPhone.replace(/[^\d+]/g, '');
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= ch + i;
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  const part1 = (h1 >>> 0).toString(36);
  const part2 = (h2 >>> 0).toString(36);
  return `user-m-${part1}${part2}`;
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
