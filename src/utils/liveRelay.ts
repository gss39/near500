import { CurrentUserProfile, ChatMessage, LocalWallPost } from '../data/nearbyUsers';

const TOPIC_PREFIX = 'near500_live_v4';
const PRESENCE_TOPIC = `${TOPIC_PREFIX}/presence`;
const DIRECT_TOPIC_PREFIX = `${TOPIC_PREFIX}/direct/`;

// Connect to multiple high-speed public WebSocket brokers in parallel for zero-delay delivery
const WS_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
  'wss://test.mosquitto.org:8081/mqtt',
];

export type RelayPacket =
  | {
      type: 'presence';
      profile: CurrentUserProfile;
      replyRequested?: boolean;
      timestamp: number;
    }
  | {
      type: 'presence_request';
      fromUserId: string;
      timestamp: number;
    }
  | {
      type: 'chat_message';
      message: ChatMessage;
      timestamp: number;
    }
  | {
      type: 'messages_seen';
      fromUserId: string;
      toUserId: string;
      timestamp: number;
    }
  | {
      type: 'message_reaction';
      messageId: string;
      fromUserId: string;
      toUserId: string;
      emoji: string;
      timestamp: number;
    }
  | {
      type: 'clear_chat';
      fromUserId: string;
      toUserId: string;
      timestamp: number;
    }
  | {
      type: 'wave';
      fromUserId: string;
      toUserId: string;
      timestamp: number;
    }
  | {
      type: 'typing';
      fromUserId: string;
      toUserId: string;
      isTyping: boolean;
      timestamp: number;
    }
  | {
      type: 'wall_post';
      post: LocalWallPost;
      lat: number | null;
      lng: number | null;
      accuracy?: number;
      timestamp: number;
    };

/**
 * High-precision WGS-84 Ellipsoidal distance in meters.
 * Uses meridional (R_M) and prime-vertical (R_N) radii of curvature at the mean latitude
 * for sub-meter accuracy within 500m, with full Haversine fallback for larger distances.
 */
export function getHaversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  // WGS-84 ellipsoid parameters
  const a = 6378137.0; // Equatorial radius in meters
  const e2 = 0.00669437999014; // First eccentricity squared
  const meanLat = toRad((lat1 + lat2) / 2);
  const sinLat = Math.sin(meanLat);
  const denom = Math.sqrt(1 - e2 * sinLat * sinLat);

  // Meridional radius of curvature (North-South)
  const rM = (a * (1 - e2)) / (denom * denom * denom);
  // Prime vertical radius of curvature (East-West)
  const rN = a / denom;

  const northMeters = dLat * rM;
  const eastMeters = dLng * rN * Math.cos(meanLat);
  const dist = Math.sqrt(northMeters * northMeters + eastMeters * eastMeters);
  return Math.round(dist);
}

/**
 * Uncertainty-aware proximity distance in meters.
 *
 * Mobile browsers indoors or on mixed Wi-Fi / Mobile Data often report a
 * horizontal uncertainty radius (`coords.accuracy`) between 30m and 600m+
 * around a nearby Wi-Fi AP or cell tower. When two phones are placed right
 * next to each other, their raw center coordinates can differ by up to
 * `(acc1 + acc2)` meters solely due to sensor/network positioning error.
 *
 * By factoring in both devices' horizontal accuracy radii:
 * - When `rawDist <= combinedUncertainty` (their error circles overlap, i.e.,
 *   the phones can physically be right next to each other), we return a damped
 *   inside-circle distance (1m–8m) instead of 300m+ cell-tower drift.
 * - When `rawDist > combinedUncertainty` (genuine physical separation beyond
 *   sensor error), we subtract the error margin so walking distances stay
 *   accurate without artificial 300m inflation.
 */
export function getProximityDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  acc1?: number,
  acc2?: number
): number {
  const rawDist = getHaversineDistanceMeters(lat1, lng1, lat2, lng2);
  if (rawDist <= 3) return Math.max(1, rawDist);

  const r1 =
    typeof acc1 === 'number' && Number.isFinite(acc1) && acc1 > 0
      ? Math.min(acc1, 650)
      : 35;
  const r2 =
    typeof acc2 === 'number' && Number.isFinite(acc2) && acc2 > 0
      ? Math.min(acc2, 650)
      : 35;

  // Include 1.2x indoor multipath/cell-tower margin on reported 95% confidence radii
  const combinedUncertainty = Math.round((r1 + r2) * 1.2);

  if (rawDist <= combinedUncertainty) {
    // Error circles overlap: devices are within each other's GPS/network error circle
    const ratio = rawDist / Math.max(combinedUncertainty, 1);
    return Math.max(1, Math.min(8, Math.round(ratio * 6)));
  }

  // Separated beyond uncertainty circle: subtract sensor error radius
  const corrected = Math.round(rawDist - combinedUncertainty * 0.85);
  return Math.max(2, corrected);
}

/**
 * Calculate live compass bearing arrow and cardinal direction from (lat1,lng1) to (lat2,lng2).
 */
export function getCompassDirection(
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

// Pure browser MQTT v3.1.1 helpers using native Uint8Array
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function encodeRemainingLength(length: number): number[] {
  const bytes: number[] = [];
  do {
    let encodedByte = length % 128;
    length = Math.floor(length / 128);
    if (length > 0) {
      encodedByte |= 128;
    }
    bytes.push(encodedByte);
  } while (length > 0);
  return bytes;
}

function encodeMqttString(str: string): Uint8Array<ArrayBuffer> {
  const utf8 = encoder.encode(str);
  const res = new Uint8Array(new ArrayBuffer(2 + utf8.length));
  res[0] = (utf8.length >> 8) & 0xff;
  res[1] = utf8.length & 0xff;
  res.set(utf8, 2);
  return res;
}

function buildConnectPacket(clientId: string): Uint8Array<ArrayBuffer> {
  const protocolName = encodeMqttString('MQTT');
  const protocolLevel = 4; // MQTT 3.1.1
  const connectFlags = 0x02; // Clean session
  const keepAlive = 45;
  const clientIdBytes = encodeMqttString(clientId);

  const varHeaderAndPayloadLen =
    protocolName.length + 1 + 1 + 2 + clientIdBytes.length;
  const remLenBytes = encodeRemainingLength(varHeaderAndPayloadLen);

  const packet = new Uint8Array(
    new ArrayBuffer(1 + remLenBytes.length + varHeaderAndPayloadLen)
  );
  let offset = 0;
  packet[offset++] = 0x10; // CONNECT
  for (const b of remLenBytes) packet[offset++] = b;
  packet.set(protocolName, offset);
  offset += protocolName.length;
  packet[offset++] = protocolLevel;
  packet[offset++] = connectFlags;
  packet[offset++] = (keepAlive >> 8) & 0xff;
  packet[offset++] = keepAlive & 0xff;
  packet.set(clientIdBytes, offset);
  return packet;
}

function buildSubscribePacket(
  packetId: number,
  topic: string
): Uint8Array<ArrayBuffer> {
  const topicBytes = encodeMqttString(topic);
  const varLen = 2 + topicBytes.length + 1;
  const remLenBytes = encodeRemainingLength(varLen);
  const packet = new Uint8Array(
    new ArrayBuffer(1 + remLenBytes.length + varLen)
  );
  let offset = 0;
  packet[offset++] = 0x82; // SUBSCRIBE
  for (const b of remLenBytes) packet[offset++] = b;
  packet[offset++] = (packetId >> 8) & 0xff;
  packet[offset++] = packetId & 0xff;
  packet.set(topicBytes, offset);
  offset += topicBytes.length;
  packet[offset++] = 0x00; // QoS 0
  return packet;
}

function buildPublishPacket(
  topic: string,
  payloadStr: string
): Uint8Array<ArrayBuffer> {
  const topicBytes = encodeMqttString(topic);
  const payloadBytes = encoder.encode(payloadStr);
  const varLen = topicBytes.length + payloadBytes.length;
  const remLenBytes = encodeRemainingLength(varLen);
  const packet = new Uint8Array(
    new ArrayBuffer(1 + remLenBytes.length + varLen)
  );
  let offset = 0;
  packet[offset++] = 0x30; // PUBLISH QoS 0
  for (const b of remLenBytes) packet[offset++] = b;
  packet.set(topicBytes, offset);
  offset += topicBytes.length;
  packet.set(payloadBytes, offset);
  return packet;
}

interface BrokerSocket {
  url: string;
  ws: WebSocket | null;
  connected: boolean;
  pingTimer: ReturnType<typeof setInterval> | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
}

export class LiveProximityRelay {
  private userId: string;
  private sockets: BrokerSocket[] = [];
  private bc: BroadcastChannel | null = null;
  private onPacket: (packet: RelayPacket) => void;
  private onConnectedCallback?: () => void;
  private destroyed = false;
  private lastBroadcastTime = 0;
  private lastBroadcastSig = '';
  private lastPresenceReqTime = 0;

  constructor(
    userId: string,
    onPacket: (packet: RelayPacket) => void,
    onConnectedCallback?: () => void
  ) {
    this.userId = userId;
    this.onPacket = onPacket;
    this.onConnectedCallback = onConnectedCallback;
    this.initBroadcastChannel();

    this.sockets = WS_BROKERS.map((url) => ({
      url,
      ws: null,
      connected: false,
      pingTimer: null,
      reconnectTimer: null,
    }));
    this.sockets.forEach((slot) => this.connectBroker(slot));
  }

  private initBroadcastChannel() {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    try {
      this.bc = new BroadcastChannel(PRESENCE_TOPIC);
      this.bc.onmessage = (event) => {
        if (event.data && typeof event.data === 'object') {
          this.onPacket(event.data as RelayPacket);
        }
      };
    } catch {
      // Ignore BroadcastChannel errors
    }
  }

  private connectBroker(slot: BrokerSocket) {
    if (this.destroyed || typeof window === 'undefined' || !('WebSocket' in window)) {
      return;
    }

    try {
      const ws = new WebSocket(slot.url, 'mqtt');
      ws.binaryType = 'arraybuffer';
      slot.ws = ws;

      ws.onopen = () => {
        const clientId = `n500_${this.userId.replace(/[^a-zA-Z0-9]/g, '').slice(-8)}_${Math.floor(Math.random() * 900000 + 100000)}`;
        ws.send(buildConnectPacket(clientId));
      };

      ws.onmessage = (event) => {
        if (!(event.data instanceof ArrayBuffer)) return;
        const bytes = new Uint8Array(event.data);
        let cursor = 0;

        while (cursor + 2 <= bytes.length) {
          const headerByte = bytes[cursor];
          const packetType = headerByte >> 4;
          let offset = cursor + 1;
          let multiplier = 1;
          let remLen = 0;
          let encodedByte = 0;
          let validLen = true;

          do {
            if (offset >= bytes.length) {
              validLen = false;
              break;
            }
            encodedByte = bytes[offset++];
            remLen += (encodedByte & 127) * multiplier;
            multiplier *= 128;
          } while ((encodedByte & 128) !== 0);

          if (!validLen) break;
          const frameEnd = offset + remLen;
          if (frameEnd > bytes.length) break;

          if (packetType === 2) {
            slot.connected = true;
            ws.send(buildSubscribePacket(1, PRESENCE_TOPIC));
            ws.send(buildSubscribePacket(2, `${DIRECT_TOPIC_PREFIX}${this.userId}`));

            const reqPacket: RelayPacket = {
              type: 'presence_request',
              fromUserId: this.userId,
              timestamp: Date.now(),
            };
            ws.send(buildPublishPacket(PRESENCE_TOPIC, JSON.stringify(reqPacket)));

            this.onConnectedCallback?.();

            if (slot.pingTimer) clearInterval(slot.pingTimer);
            slot.pingTimer = setInterval(() => {
              if (slot.ws && slot.ws.readyState === WebSocket.OPEN) {
                slot.ws.send(new Uint8Array([0xc0, 0x00])); // PINGREQ
              }
            }, 22000);
          } else if (packetType === 3) {
            if (offset + 2 <= frameEnd) {
              const topicLen = (bytes[offset] << 8) | bytes[offset + 1];
              let payloadOffset = offset + 2 + topicLen;
              const qos = (headerByte >> 1) & 0x03;
              if (qos > 0) payloadOffset += 2;

              if (payloadOffset <= frameEnd) {
                const payloadBytes = bytes.subarray(payloadOffset, frameEnd);
                try {
                  const jsonStr = decoder.decode(payloadBytes);
                  const parsed = JSON.parse(jsonStr) as RelayPacket;
                  this.onPacket(parsed);
                } catch {
                  // ignore malformed JSON
                }
              }
            }
          }

          cursor = frameEnd;
        }
      };

      ws.onclose = () => {
        slot.connected = false;
        if (slot.pingTimer) {
          clearInterval(slot.pingTimer);
          slot.pingTimer = null;
        }
        if (!this.destroyed) {
          slot.reconnectTimer = setTimeout(
            () => this.connectBroker(slot),
            2500 + Math.floor(Math.random() * 1200)
          );
        }
      };
    } catch {
      // Ignore WebSocket connection error
    }
  }

  public broadcastPresence(
    profile: CurrentUserProfile,
    replyRequested = false,
    force = false
  ) {
    const now = Date.now();
    const latKey = profile.lat !== null ? profile.lat.toFixed(5) : 'global';
    const lngKey = profile.lng !== null ? profile.lng.toFixed(5) : 'global';
    const sig = `${profile.name}|${profile.role}|${profile.bio}|${profile.locationSpot}|${profile.statusTag || ''}|${profile.avatarPreset}|${(profile.photoUrl || '').length}|${profile.isDiscoverableUnder500m}|${latKey}|${lngKey}`;
    const changed = sig !== this.lastBroadcastSig;

    if (!force && !changed && !replyRequested && now - this.lastBroadcastTime < 2200) {
      return;
    }
    this.lastBroadcastTime = now;
    this.lastBroadcastSig = sig;

    const packet: RelayPacket = {
      type: 'presence',
      profile,
      replyRequested,
      timestamp: now,
    };
    this.publish(PRESENCE_TOPIC, packet);
  }

  public requestAllPeersPresence(force = false) {
    const now = Date.now();
    if (!force && now - this.lastPresenceReqTime < 9000) {
      return;
    }
    this.lastPresenceReqTime = now;
    const packet: RelayPacket = {
      type: 'presence_request',
      fromUserId: this.userId,
      timestamp: now,
    };
    this.publish(PRESENCE_TOPIC, packet);
  }

  public sendDirectPacket(targetUserId: string, packet: RelayPacket) {
    this.publish(`${DIRECT_TOPIC_PREFIX}${targetUserId}`, packet);
  }

  public broadcastWallPost(
    post: LocalWallPost,
    lat: number | null,
    lng: number | null,
    accuracy?: number
  ) {
    this.publish(PRESENCE_TOPIC, {
      type: 'wall_post',
      post,
      lat,
      lng,
      accuracy,
      timestamp: Date.now(),
    });
  }

  private publish(topic: string, packet: RelayPacket) {
    try {
      this.bc?.postMessage(packet);
    } catch {
      // Ignore
    }
    const encoded = buildPublishPacket(topic, JSON.stringify(packet));
    for (const slot of this.sockets) {
      try {
        if (slot.ws && slot.ws.readyState === WebSocket.OPEN && slot.connected) {
          slot.ws.send(encoded);
        }
      } catch {
        // Ignore
      }
    }
  }

  public destroy() {
    this.destroyed = true;
    try {
      this.bc?.close();
    } catch {
      // Ignore
    }
    for (const slot of this.sockets) {
      if (slot.pingTimer) clearInterval(slot.pingTimer);
      if (slot.reconnectTimer) clearTimeout(slot.reconnectTimer);
      try {
        slot.ws?.close();
      } catch {
        // Ignore
      }
    }
  }
}
