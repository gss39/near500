import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LiveUserRecord {
  id: string;
  name: string;
  role: string;
  bio: string;
  locationSpot: string;
  statusTag?: string;
  photoUrl?: string;
  avatarPreset:
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
  isDiscoverableUnder500m: boolean;
  lat: number | null;
  lng: number | null;
  accuracy?: number;
  gpsUpdatedAt: number;
  lastSeenAt: number;
  wavedBy: string[];
}

export interface LiveChatMessage {
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

const DATA_FILE = path.join(__dirname, '.live-users-store.json');
const ACTIVE_TTL_MS = 180 * 1000; // 180 seconds active presence window

interface StoreData {
  users: Record<string, LiveUserRecord>;
  messages: LiveChatMessage[];
}

function loadStore(): StoreData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        users: parsed.users || {},
        messages: parsed.messages || [],
      };
    }
  } catch {
    // ignore corrupt file
  }
  return { users: {}, messages: [] };
}

function saveStore(store: StoreData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store), 'utf-8');
  } catch {
    // ignore write error
  }
}

const store: StoreData = loadStore();
const typingPairs = new Map<string, number>();

function getDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  acc1?: number,
  acc2?: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a = 6378137.0;
  const e2 = 0.00669437999014;
  const meanLat = toRad((lat1 + lat2) / 2);
  const sinLat = Math.sin(meanLat);
  const denom = Math.sqrt(1 - e2 * sinLat * sinLat);

  const rM = (a * (1 - e2)) / (denom * denom * denom);
  const rN = a / denom;

  const northMeters = dLat * rM;
  const eastMeters = dLng * rN * Math.cos(meanLat);
  const rawDist = Math.round(
    Math.sqrt(northMeters * northMeters + eastMeters * eastMeters)
  );
  if (rawDist <= 3) return Math.max(1, rawDist);

  const r1 =
    typeof acc1 === 'number' && Number.isFinite(acc1) && acc1 > 0
      ? Math.min(acc1, 650)
      : 35;
  const r2 =
    typeof acc2 === 'number' && Number.isFinite(acc2) && acc2 > 0
      ? Math.min(acc2, 650)
      : 35;

  const combinedUncertainty = Math.round((r1 + r2) * 1.2);
  if (rawDist <= combinedUncertainty) {
    const ratio = rawDist / Math.max(combinedUncertainty, 1);
    return Math.max(1, Math.min(8, Math.round(ratio * 6)));
  }

  const corrected = Math.round(rawDist - combinedUncertainty * 0.85);
  return Math.max(2, corrected);
}

function getCompassDir(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const meanLat = toRad((lat1 + lat2) / 2);
  const dNorth = toRad(lat2 - lat1);
  const dEast = toRad(lng2 - lng1) * Math.cos(meanLat);
  if (Math.abs(dNorth) < 1e-9 && Math.abs(dEast) < 1e-9) {
    return '• Here';
  }
  const brng = (toDeg(Math.atan2(dEast, dNorth)) + 360) % 360;
  const directions = [
    '↑ N',
    '↗ NE',
    '→ E',
    '↘ SE',
    '↓ S',
    '↙ SW',
    '← W',
    '↖ NW',
  ];
  return directions[Math.round(brng / 45) % 8];
}

function pruneStaleUsers() {
  const now = Date.now();
  let changed = false;
  for (const id of Object.keys(store.users)) {
    if (now - store.users[id].lastSeenAt > ACTIVE_TTL_MS) {
      delete store.users[id];
      changed = true;
    }
  }
  if (changed) {
    saveStore(store);
  }
}

const sseClients = new Set<express.Response>();

function broadcastUpdate(extra?: Record<string, unknown>) {
  const payload = `data: ${JSON.stringify({ type: 'sync', ts: Date.now(), ...extra })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  app.get('/api/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    res.write(`data: ${JSON.stringify({ type: 'connected', ts: Date.now() })}\n\n`);
    sseClients.add(res);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.post('/api/users/sync', (req, res) => {
    pruneStaleUsers();
    const {
      id,
      name,
      role,
      bio,
      locationSpot,
      statusTag,
      photoUrl,
      avatarPreset,
      isDiscoverableUnder500m,
      lat,
      lng,
      accuracy,
      gpsUpdatedAt,
    } = req.body;

    if (!id) {
      res.status(400).json({ error: 'Valid user id is required.' });
      return;
    }

    const existing = store.users[id];
    const hasIncomingCoords = typeof lat === 'number' && typeof lng === 'number';
    const finalLat = hasIncomingCoords ? Number(lat) : existing?.lat ?? null;
    const finalLng = hasIncomingCoords ? Number(lng) : existing?.lng ?? null;
    const finalAcc =
      typeof accuracy === 'number' && accuracy > 0
        ? Math.round(accuracy)
        : existing?.accuracy;
    const finalGpsTs =
      typeof gpsUpdatedAt === 'number'
        ? gpsUpdatedAt
        : existing?.gpsUpdatedAt ?? Date.now();

    const updatedUser: LiveUserRecord = {
      id: String(id),
      name: String(name || 'Anonymous User').slice(0, 60),
      role: String(role || 'Member').slice(0, 80),
      bio: String(bio || '').slice(0, 240),
      locationSpot: String(locationSpot || 'Online').slice(0, 80),
      statusTag: statusTag ? String(statusTag).slice(0, 50) : undefined,
      photoUrl: photoUrl ? String(photoUrl) : undefined,
      avatarPreset: avatarPreset || 'rohan',
      isDiscoverableUnder500m: Boolean(isDiscoverableUnder500m),
      lat: finalLat,
      lng: finalLng,
      accuracy: finalAcc,
      gpsUpdatedAt: finalGpsTs,
      lastSeenAt: Date.now(),
      wavedBy: existing?.wavedBy || [],
    };

    const isNewOrMoved =
      !existing ||
      existing.name !== updatedUser.name ||
      existing.role !== updatedUser.role ||
      existing.bio !== updatedUser.bio ||
      existing.statusTag !== updatedUser.statusTag ||
      existing.photoUrl !== updatedUser.photoUrl ||
      existing.locationSpot !== updatedUser.locationSpot ||
      existing.isDiscoverableUnder500m !== updatedUser.isDiscoverableUnder500m;

    store.users[id] = updatedUser;
    saveStore(store);

    if (isNewOrMoved) {
      broadcastUpdate();
    }

    const activeGlobalUsers = Object.values(store.users)
      .filter((u) => u.id !== id && u.isDiscoverableUnder500m)
      .map((u) => {
        const hasBothCoords =
          typeof finalLat === 'number' &&
          typeof finalLng === 'number' &&
          typeof u.lat === 'number' &&
          typeof u.lng === 'number';
        const distanceMeters = hasBothCoords
          ? getDistanceMeters(
              finalLat as number,
              finalLng as number,
              u.lat as number,
              u.lng as number,
              finalAcc,
              u.accuracy
            )
          : 0;
        const compassDir = hasBothCoords
          ? getCompassDir(
              finalLat as number,
              finalLng as number,
              u.lat as number,
              u.lng as number
            )
          : undefined;
        return {
          id: u.id,
          name: u.name,
          role: u.role,
          bio: u.bio,
          locationSpot: u.locationSpot,
          statusTag: u.statusTag,
          photoUrl: u.photoUrl,
          avatarPreset: u.avatarPreset,
          lat: u.lat ?? undefined,
          lng: u.lng ?? undefined,
          accuracy: u.accuracy,
          gpsUpdatedAt: u.gpsUpdatedAt,
          distanceMeters,
          compassDir,
          lastSeenAt: u.lastSeenAt,
          waved: u.wavedBy.includes(id),
          wavedAtMe: updatedUser.wavedBy.includes(u.id),
        };
      })
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt);

    const userMessages = store.messages.filter(
      (m) => m.fromUserId === id || m.toUserId === id
    );

    const now = Date.now();
    const typingFromIds: string[] = [];
    for (const [pairKey, ts] of typingPairs.entries()) {
      if (now - ts > 3500) {
        typingPairs.delete(pairKey);
      } else if (pairKey.endsWith(`->${id}`)) {
        typingFromIds.push(pairKey.split('->')[0]);
      }
    }

    res.json({
      me: updatedUser,
      nearbyUsers: activeGlobalUsers,
      messages: userMessages,
      typingFromIds,
    });
  });

  app.post('/api/users/typing', (req, res) => {
    const { fromUserId, toUserId, isTyping } = req.body;
    if (fromUserId && toUserId) {
      const key = `${fromUserId}->${toUserId}`;
      if (isTyping) {
        typingPairs.set(key, Date.now());
      } else {
        typingPairs.delete(key);
      }
      broadcastUpdate({ event: 'typing', fromUserId, toUserId, isTyping: Boolean(isTyping) });
    }
    res.json({ ok: true });
  });

  app.post('/api/users/leave', (req, res) => {
    const { id } = req.body;
    if (id && store.users[id]) {
      delete store.users[id];
      saveStore(store);
      broadcastUpdate();
    }
    res.json({ ok: true });
  });

  app.post('/api/users/wave', (req, res) => {
    const { fromUserId, toUserId } = req.body;
    const target = store.users[toUserId];
    if (!fromUserId || !target) {
      res.status(404).json({ error: 'Target user not found' });
      return;
    }

    const idx = target.wavedBy.indexOf(fromUserId);
    if (idx === -1) {
      target.wavedBy.push(fromUserId);
    } else {
      target.wavedBy.splice(idx, 1);
    }
    saveStore(store);
    broadcastUpdate();
    res.json({ ok: true, waved: target.wavedBy.includes(fromUserId) });
  });

  app.post('/api/messages', (req, res) => {
    const { id, fromUserId, toUserId, text, imageUrl, audioUrl, mapUrl } = req.body;
    if (
      !fromUserId ||
      !toUserId ||
      (!String(text || '').trim() && !imageUrl && !audioUrl && !mapUrl)
    ) {
      res.status(400).json({ error: 'Invalid message payload' });
      return;
    }

    typingPairs.delete(`${fromUserId}->${toUserId}`);

    const msg: LiveChatMessage = {
      id: id ? String(id) : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromUserId: String(fromUserId),
      toUserId: String(toUserId),
      text: String(text || '').trim().slice(0, 500),
      imageUrl: imageUrl ? String(imageUrl) : undefined,
      audioUrl: audioUrl ? String(audioUrl) : undefined,
      mapUrl: mapUrl ? String(mapUrl) : undefined,
      seen: false,
      reactions: {},
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: Date.now(),
    };

    if (!store.messages.some((m) => m.id === msg.id)) {
      store.messages.push(msg);
      if (store.messages.length > 500) {
        store.messages = store.messages.slice(-500);
      }
      saveStore(store);
      broadcastUpdate();
    }

    res.json({ message: msg });
  });

  app.post('/api/messages/seen', (req, res) => {
    const { fromUserId, toUserId } = req.body;
    if (!fromUserId || !toUserId) {
      res.status(400).json({ error: 'Missing user IDs' });
      return;
    }
    let changed = false;
    store.messages.forEach((m) => {
      if (m.fromUserId === toUserId && m.toUserId === fromUserId && !m.seen) {
        m.seen = true;
        changed = true;
      }
    });
    if (changed) {
      saveStore(store);
      broadcastUpdate();
    }
    res.json({ ok: true });
  });

  app.post('/api/messages/react', (req, res) => {
    const { messageId, fromUserId, emoji } = req.body;
    if (!messageId || !fromUserId || !emoji) {
      res.status(400).json({ error: 'Missing reaction params' });
      return;
    }
    const targetMsg = store.messages.find((m) => m.id === messageId);
    if (targetMsg) {
      targetMsg.reactions = targetMsg.reactions || {};
      if (targetMsg.reactions[fromUserId] === emoji) {
        delete targetMsg.reactions[fromUserId];
      } else {
        targetMsg.reactions[fromUserId] = String(emoji);
      }
      saveStore(store);
      broadcastUpdate();
    }
    res.json({ ok: true });
  });

  app.post('/api/messages/clear', (req, res) => {
    const { fromUserId, toUserId } = req.body;
    if (!fromUserId || !toUserId) {
      res.status(400).json({ error: 'Missing user IDs' });
      return;
    }
    const beforeLen = store.messages.length;
    store.messages = store.messages.filter(
      (m) =>
        !(
          (m.fromUserId === fromUserId && m.toUserId === toUserId) ||
          (m.fromUserId === toUserId && m.toUserId === fromUserId)
        )
    );
    if (store.messages.length !== beforeLen) {
      saveStore(store);
      broadcastUpdate();
    }
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Near500 live server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
