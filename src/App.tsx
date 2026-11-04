import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  X,
  MapPin,
  Navigation,
  RefreshCw,
  Share2,
  QrCode,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  loadOrCreateCurrentUser,
  saveCurrentUserToStorage,
  loadBlockedUsers,
  saveBlockedUsers,
  loadSavedMessages,
  saveMessagesToStorage,
  playMessagePopSound,
  getPresenceStatus,
  COMMUNITY_STARTER_PEERS,
  isCommunityStarterPeer,
  getStarterAutoReply,
  UserProfile,
  CurrentUserProfile,
  ChatMessage,
  BlockedUserInfo,
} from './data/nearbyUsers';
import { UserAvatar } from './components/UserAvatar';
import {
  UserDetailModal,
  CurrentUserModal,
  SendMessagePayload,
} from './components/ProfileModals';
import {
  LiveProximityRelay,
  RelayPacket,
  getHaversineDistanceMeters,
  getProximityDistanceMeters,
  getCompassDirection,
} from './utils/liveRelay';

type RangeFilter = 'all' | '100' | '250';

interface RelayPeerState {
  profile: CurrentUserProfile;
  lastSeenAt: number;
}

const PEER_CACHE_KEY = 'near500_relay_peers_cache_v2';
const PEER_ACTIVE_TTL_MS = 180 * 1000; // 3 minutes active retention to prevent show/hide flicker

function loadCachedRelayPeers(): Record<string, RelayPeerState> {
  try {
    const raw = sessionStorage.getItem(PEER_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, RelayPeerState>;
    const now = Date.now();
    const valid: Record<string, RelayPeerState> = {};
    for (const [id, entry] of Object.entries(parsed)) {
      if (entry && entry.profile && now - entry.lastSeenAt <= PEER_ACTIVE_TTL_MS) {
        valid[id] = entry;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile>(() =>
    loadOrCreateCurrentUser()
  );
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserInfo[]>(() =>
    loadBlockedUsers()
  );
  const [serverUsers, setServerUsers] = useState<UserProfile[]>([]);
  const [relayPeers, setRelayPeers] = useState<Record<string, RelayPeerState>>(() =>
    loadCachedRelayPeers()
  );
  const [wavedByMe, setWavedByMe] = useState<Record<string, boolean>>({});
  const [wavedAtMe, setWavedAtMe] = useState<Record<string, boolean>>({
    'community-peer-aarav': true,
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadSavedMessages(loadOrCreateCurrentUser().id)
  );
  const [readCountsByPeer, setReadCountsByPeer] = useState<Record<string, number>>({});
  const [typingPeers, setTypingPeers] = useState<Record<string, number>>({});

  // Share / Invite QR modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>('all');

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState(false);

  const [gpsState, setGpsState] = useState<'locating' | 'live' | 'error'>(() =>
    currentUser.lat !== null && currentUser.lng !== null ? 'live' : 'locating'
  );
  const [gpsErrorMsg, setGpsErrorMsg] = useState<string | null>(null);

  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const relayRef = useRef<LiveProximityRelay | null>(null);
  const lastReplyTimeRef = useRef<Record<string, number>>({});
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const watchIdRef = useRef<number | null>(null);
  const visiblePeerIdsRef = useRef<Set<string>>(new Set());
  const hasBroadcastedInitialFixRef = useRef<boolean>(false);
  const lastGpsFixRef = useRef<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  } | null>(
    currentUser.lat !== null && currentUser.lng !== null
      ? {
          lat: currentUser.lat,
          lng: currentUser.lng,
          accuracy: currentUser.accuracy || 35,
          timestamp: currentUser.gpsUpdatedAt || Date.now(),
        }
      : null
  );

  // Persist active relayPeers in sessionStorage so brief refreshes never blank out the radar
  useEffect(() => {
    try {
      sessionStorage.setItem(PEER_CACHE_KEY, JSON.stringify(relayPeers));
    } catch {
      // ignore storage quota errors
    }
  }, [relayPeers]);

  // Persist chat messages in localStorage
  useEffect(() => {
    saveMessagesToStorage(messages);
  }, [messages]);

  // Trigger realistic interactive reply when user waves or messages a starter community peer
  const scheduleStarterPeerReply = useCallback(
    (peerId: string, incomingText: string) => {
      if (!isCommunityStarterPeer(peerId)) return;

      setTimeout(() => {
        setTypingPeers((prev) => ({ ...prev, [peerId]: Date.now() }));
      }, 450);

      setTimeout(() => {
        setTypingPeers((prev) => {
          const next = { ...prev };
          delete next[peerId];
          return next;
        });

        const me = currentUserRef.current;
        const replyText = getStarterAutoReply(peerId, incomingText, me.name);
        const replyMsg: ChatMessage = {
          id: `msg-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fromUserId: peerId,
          toUserId: me.id,
          text: replyText,
          seen: false,
          reactions: {},
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          createdAt: Date.now(),
        };
        knownMessageIdsRef.current.add(replyMsg.id);
        setMessages((prev) => [...prev, replyMsg]);
        playMessagePopSound();
      }, 1700);
    },
    []
  );

  // Sync current user's live location & profile with server AND global live relay
  const syncWithServer = useCallback(
    async (profileToSync?: CurrentUserProfile, requestPeersReply = false) => {
      const user = profileToSync || currentUserRef.current;
      if (user.lat === null || user.lng === null) return;

      relayRef.current?.broadcastPresence(user, requestPeersReply, requestPeersReply);
      if (requestPeersReply) {
        relayRef.current?.requestAllPeersPresence(true);
      }

      try {
        const res = await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.nearbyUsers)) {
          setServerUsers(data.nearbyUsers);
        }
        if (Array.isArray(data.typingFromIds)) {
          const now = Date.now();
          setTypingPeers((prev) => {
            const next = { ...prev };
            data.typingFromIds.forEach((id: string) => {
              next[id] = now;
            });
            return next;
          });
        }
        if (Array.isArray(data.messages)) {
          setMessages((prev) => {
            const map = new Map<string, ChatMessage>();
            prev.forEach((m) => map.set(m.id, m));
            let hasNewIncoming = false;
            data.messages.forEach((m: ChatMessage) => {
              if (!knownMessageIdsRef.current.has(m.id)) {
                knownMessageIdsRef.current.add(m.id);
                if (m.toUserId === user.id && m.fromUserId !== user.id) {
                  hasNewIncoming = true;
                }
              }
              const existingMsg = map.get(m.id);
              map.set(m.id, {
                ...existingMsg,
                ...m,
                seen: Boolean(existingMsg?.seen || m.seen),
                reactions: {
                  ...(existingMsg?.reactions || {}),
                  ...(m.reactions || {}),
                },
              });
            });
            if (hasNewIncoming) {
              playMessagePopSound();
            }
            return Array.from(map.values()).sort((a, b) => a.createdAt - b.createdAt);
          });
        }
      } catch {
        // Running on static host (GitHub Pages / Vercel), relay handles live sync
      }
    },
    []
  );

  // Initialize LiveProximityRelay with throttled handshake replies and chat messages
  useEffect(() => {
    const relay = new LiveProximityRelay(
      currentUser.id,
      (packet: RelayPacket) => {
        const me = currentUserRef.current;
        if (packet.type === 'presence') {
          const peer = packet.profile;
          if (!peer || !peer.id || peer.id === me.id) return;

          setRelayPeers((prev) => {
            const existing = prev[peer.id];
            const isNewPeer = !existing;
            const now = Date.now();

            if (
              (isNewPeer || packet.replyRequested) &&
              me.lat !== null &&
              me.lng !== null
            ) {
              if (
                !lastReplyTimeRef.current[peer.id] ||
                now - lastReplyTimeRef.current[peer.id] > 3000
              ) {
                lastReplyTimeRef.current[peer.id] = now;
                relayRef.current?.sendDirectPacket(peer.id, {
                  type: 'presence',
                  profile: me,
                  replyRequested: false,
                  timestamp: now,
                });
              }
            }

            // Protect against out-of-order packets AND coarse cell-tower jumps from peer
            const incomingGpsTs = peer.gpsUpdatedAt || packet.timestamp || now;
            const existingGpsTs = existing?.profile.gpsUpdatedAt || 0;
            const incomingAcc =
              typeof peer.accuracy === 'number' && peer.accuracy > 0
                ? peer.accuracy
                : 35;
            const existingAcc =
              typeof existing?.profile.accuracy === 'number' &&
              existing.profile.accuracy > 0
                ? existing.profile.accuracy
                : 999;

            const isCoarsePeerDowngrade =
              existing &&
              existing.profile.lat !== null &&
              existing.profile.lng !== null &&
              now - existingGpsTs < 180000 &&
              existingAcc <= 70 &&
              incomingAcc > 85 &&
              incomingAcc > existingAcc * 1.5;

            const useIncomingCoords =
              !existing ||
              existing.profile.lat === null ||
              existing.profile.lng === null ||
              (incomingGpsTs >= existingGpsTs - 1500 && !isCoarsePeerDowngrade);

            const mergedProfile: CurrentUserProfile = useIncomingCoords
              ? { ...peer, gpsUpdatedAt: incomingGpsTs }
              : {
                  ...peer,
                  lat: existing.profile.lat,
                  lng: existing.profile.lng,
                  accuracy: existing.profile.accuracy,
                  gpsUpdatedAt: existingGpsTs,
                };

            return {
              ...prev,
              [peer.id]: { profile: mergedProfile, lastSeenAt: now },
            };
          });
        } else if (packet.type === 'presence_request') {
          if (
            packet.fromUserId &&
            packet.fromUserId !== me.id &&
            me.lat !== null &&
            me.lng !== null
          ) {
            const now = Date.now();
            if (
              !lastReplyTimeRef.current[packet.fromUserId] ||
              now - lastReplyTimeRef.current[packet.fromUserId] > 3000
            ) {
              lastReplyTimeRef.current[packet.fromUserId] = now;
              relayRef.current?.sendDirectPacket(packet.fromUserId, {
                type: 'presence',
                profile: me,
                replyRequested: false,
                timestamp: now,
              });
            }
          }
        } else if (packet.type === 'chat_message') {
          const msg = packet.message;
          if (!msg || !msg.id) return;
          setTypingPeers((prev) => {
            const next = { ...prev };
            delete next[msg.fromUserId];
            return next;
          });
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            knownMessageIdsRef.current.add(msg.id);
            if (msg.toUserId === me.id && msg.fromUserId !== me.id) {
              playMessagePopSound();
            }
            return [...prev, msg].sort((a, b) => a.createdAt - b.createdAt);
          });
        } else if (packet.type === 'messages_seen') {
          if (packet.toUserId === me.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.fromUserId === me.id && m.toUserId === packet.fromUserId
                  ? { ...m, seen: true }
                  : m
              )
            );
          }
        } else if (packet.type === 'message_reaction') {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== packet.messageId) return m;
              const nextReactions = { ...(m.reactions || {}) };
              if (nextReactions[packet.fromUserId] === packet.emoji) {
                delete nextReactions[packet.fromUserId];
              } else {
                nextReactions[packet.fromUserId] = packet.emoji;
              }
              return { ...m, reactions: nextReactions };
            })
          );
        } else if (packet.type === 'clear_chat') {
          setMessages((prev) =>
            prev.filter(
              (m) =>
                !(
                  (m.fromUserId === packet.fromUserId &&
                    m.toUserId === packet.toUserId) ||
                  (m.fromUserId === packet.toUserId &&
                    m.toUserId === packet.fromUserId)
                )
            )
          );
        } else if (packet.type === 'typing') {
          if (packet.toUserId === me.id && packet.fromUserId !== me.id) {
            setTypingPeers((prev) => {
              const next = { ...prev };
              if (packet.isTyping) {
                next[packet.fromUserId] = Date.now();
              } else {
                delete next[packet.fromUserId];
              }
              return next;
            });
          }
        } else if (packet.type === 'wave') {
          if (packet.toUserId === me.id) {
            setWavedAtMe((prev) => ({ ...prev, [packet.fromUserId]: true }));
          }
        }
      },
      () => {
        if (
          currentUserRef.current.lat !== null &&
          currentUserRef.current.lng !== null
        ) {
          relayRef.current?.broadcastPresence(currentUserRef.current, true, true);
        }
      }
    );

    relayRef.current = relay;
    return () => {
      relay.destroy();
    };
  }, [currentUser.id]);

  // Prune stale relay peers (> 180s inactive) and clear expired typing states
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRelayPeers((prev) => {
        let changed = false;
        const next: Record<string, RelayPeerState> = {};
        for (const [id, entry] of Object.entries(prev)) {
          if (now - entry.lastSeenAt <= PEER_ACTIVE_TTL_MS) {
            next[id] = entry;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      setTypingPeers((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (now - next[id] > 3200) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Merge live server users + WebSocket relay peers + starter community peers so the radar is NEVER empty
  const liveUsers = useMemo(() => {
    const blockedSet = new Set(blockedUsers.map((b) => b.id));
    const combined = new Map<string, UserProfile>();
    const myLat = currentUser.lat;
    const myLng = currentUser.lng;
    const myAcc = currentUser.accuracy;

    for (const u of serverUsers) {
      if (blockedSet.has(u.id)) continue;
      const wasVisible = visiblePeerIdsRef.current.has(u.id);
      const maxAllowedDist = wasVisible ? 560 : 500;

      const rawCalculatedDist =
        myLat !== null &&
        myLng !== null &&
        typeof u.lat === 'number' &&
        typeof u.lng === 'number'
          ? getProximityDistanceMeters(
              myLat,
              myLng,
              u.lat,
              u.lng,
              myAcc,
              u.accuracy
            )
          : u.distanceMeters;

      const compassDir =
        myLat !== null &&
        myLng !== null &&
        typeof u.lat === 'number' &&
        typeof u.lng === 'number'
          ? getCompassDirection(myLat, myLng, u.lat, u.lng)
          : u.compassDir;

      if (rawCalculatedDist <= maxAllowedDist) {
        combined.set(u.id, {
          ...u,
          distanceMeters: Math.min(500, rawCalculatedDist),
          compassDir,
          waved: Boolean(u.waved || wavedByMe[u.id]),
          wavedAtMe: Boolean(u.wavedAtMe || wavedAtMe[u.id]),
        });
      }
    }

    if (myLat !== null && myLng !== null) {
      for (const [peerId, entry] of Object.entries(relayPeers)) {
        if (peerId === currentUser.id) continue;
        if (blockedSet.has(peerId)) continue;
        const p = entry.profile;
        if (!p.isDiscoverableUnder500m || p.lat === null || p.lng === null) {
          combined.delete(peerId);
          continue;
        }

        const existing = combined.get(peerId);
        const relayGpsTs = p.gpsUpdatedAt || entry.lastSeenAt || 0;
        const serverGpsTs = existing?.gpsUpdatedAt || 0;
        const relayAcc =
          typeof p.accuracy === 'number' && p.accuracy > 0 ? p.accuracy : 35;
        const serverAcc =
          typeof existing?.accuracy === 'number' && existing.accuracy > 0
            ? existing.accuracy
            : 999;

        const bothRecent = Math.abs(relayGpsTs - serverGpsTs) < 60000;
        const useRelayCoords =
          !existing ||
          typeof existing.lat !== 'number' ||
          typeof existing.lng !== 'number' ||
          (bothRecent ? relayAcc <= serverAcc * 1.2 : relayGpsTs >= serverGpsTs);

        const peerLat = useRelayCoords ? p.lat : (existing!.lat as number);
        const peerLng = useRelayCoords ? p.lng : (existing!.lng as number);
        const peerAcc = useRelayCoords ? p.accuracy : existing?.accuracy;

        const wasVisible = visiblePeerIdsRef.current.has(peerId);
        const maxAllowedDist = wasVisible ? 560 : 500;

        const dist = getProximityDistanceMeters(
          myLat,
          myLng,
          peerLat,
          peerLng,
          myAcc,
          peerAcc
        );

        if (dist > maxAllowedDist) {
          combined.delete(peerId);
          continue;
        }

        const compassDir = getCompassDirection(myLat, myLng, peerLat, peerLng);
        const mergedLastSeen = Math.max(
          entry.lastSeenAt || 0,
          existing?.lastSeenAt || 0
        );

        combined.set(peerId, {
          id: p.id,
          name: p.name,
          role: p.role,
          bio: p.bio,
          locationSpot: p.locationSpot,
          statusTag: p.statusTag,
          photoUrl: p.photoUrl || existing?.photoUrl,
          avatarPreset: p.avatarPreset,
          lat: peerLat,
          lng: peerLng,
          accuracy: peerAcc,
          gpsUpdatedAt: Math.max(relayGpsTs, serverGpsTs),
          distanceMeters: Math.min(500, dist),
          compassDir,
          lastSeenAt: mergedLastSeen,
          waved: Boolean(existing?.waved || wavedByMe[peerId]),
          wavedAtMe: Boolean(existing?.wavedAtMe || wavedAtMe[peerId]),
        });
      }
    }

    // Always include active Starter Community Peers unless blocked, so first-time users never see an empty screen
    for (const starter of COMMUNITY_STARTER_PEERS) {
      if (blockedSet.has(starter.id)) continue;
      if (!combined.has(starter.id)) {
        combined.set(starter.id, {
          ...starter,
          lastSeenAt: Date.now(),
          waved: Boolean(wavedByMe[starter.id]),
          wavedAtMe: Boolean(wavedAtMe[starter.id]),
        });
      }
    }

    // Sort real live devices first (or by distanceMeters ascending)
    const sorted = Array.from(combined.values()).sort((a, b) => {
      const aStarter = isCommunityStarterPeer(a.id) ? 1 : 0;
      const bStarter = isCommunityStarterPeer(b.id) ? 1 : 0;
      if (aStarter !== bStarter) return aStarter - bStarter;
      return a.distanceMeters - b.distanceMeters;
    });
    visiblePeerIdsRef.current = new Set(sorted.map((u) => u.id));
    return sorted;
  }, [
    serverUsers,
    relayPeers,
    currentUser.id,
    currentUser.lat,
    currentUser.lng,
    currentUser.accuracy,
    wavedByMe,
    wavedAtMe,
    blockedUsers,
  ]);

  // Apply new GPS coordinates with accuracy-lock filtering & smoothing
  const applyCoords = useCallback(
    (latitude: number, longitude: number, accuracy?: number, fixTimestamp?: number) => {
      const now = Date.now();
      const acc = typeof accuracy === 'number' && accuracy > 0 ? accuracy : 35;
      const fixTs = fixTimestamp || now;
      const prevFix = lastGpsFixRef.current;

      let nextLat = latitude;
      let nextLng = longitude;
      let nextAcc = acc;

      if (prevFix) {
        if (fixTs < prevFix.timestamp - 1000) {
          return;
        }
        if (
          now - prevFix.timestamp < 180000 &&
          prevFix.accuracy <= 70 &&
          acc > 80 &&
          acc > prevFix.accuracy * 1.5
        ) {
          return;
        }

        const stepDist = getHaversineDistanceMeters(
          prevFix.lat,
          prevFix.lng,
          latitude,
          longitude
        );
        if (
          stepDist > 0 &&
          stepDist <= prevFix.accuracy + acc &&
          acc >= prevFix.accuracy * 0.8
        ) {
          const weightNew = prevFix.accuracy / (prevFix.accuracy + acc);
          nextLat = prevFix.lat + (latitude - prevFix.lat) * weightNew;
          nextLng = prevFix.lng + (longitude - prevFix.lng) * weightNew;
          nextAcc = Math.min(acc, Math.round((prevFix.accuracy + acc) / 2));
        }
      }

      lastGpsFixRef.current = {
        lat: nextLat,
        lng: nextLng,
        accuracy: nextAcc,
        timestamp: fixTs,
      };

      const isInitialFix = !hasBroadcastedInitialFixRef.current;
      hasBroadcastedInitialFixRef.current = true;

      setCurrentUser((prev) => {
        const updated: CurrentUserProfile = {
          ...prev,
          lat: nextLat,
          lng: nextLng,
          accuracy: Math.round(nextAcc),
          gpsUpdatedAt: now,
        };
        saveCurrentUserToStorage(updated);
        syncWithServer(updated, isInitialFix);
        return updated;
      });
      setGpsState('live');
      setGpsErrorMsg(null);
    },
    [syncWithServer]
  );

  const requestLiveLocation = useCallback(() => {
    if (currentUserRef.current.lat !== null && currentUserRef.current.lng !== null) {
      syncWithServer(currentUserRef.current, true);
      setGpsState('live');
    } else {
      setGpsState('locating');
    }
    setGpsErrorMsg(null);

    if (!('geolocation' in navigator)) {
      setGpsState('error');
      setGpsErrorMsg('GPS is not supported on this browser.');
      return;
    }

    const handleSuccess = (pos: GeolocationPosition) => {
      applyCoords(
        pos.coords.latitude,
        pos.coords.longitude,
        pos.coords.accuracy,
        pos.timestamp
      );
    };

    const handleError = (err: GeolocationPositionError) => {
      if (err.code === 1 || currentUserRef.current.lat === null) {
        setGpsState('error');
        setGpsErrorMsg(
          'Location permission is off. Turn on GPS to connect with real phones around you within 500m.'
        );
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });

    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }
      );
    }
  }, [applyCoords, syncWithServer]);

  useEffect(() => {
    requestLiveLocation();

    let permStatus: PermissionStatus | null = null;
    if ('permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          permStatus = status;
          status.onchange = () => {
            if (status.state === 'granted') {
              requestLiveLocation();
            }
          };
        })
        .catch(() => {});
    }

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        requestLiveLocation();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (permStatus) permStatus.onchange = null;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [requestLiveLocation]);

  useEffect(() => {
    let evtSource: EventSource | null = null;
    try {
      evtSource = new EventSource('/api/stream');
      evtSource.onmessage = () => {
        syncWithServer();
      };
    } catch {
      // Static host fallback
    }

    const interval = setInterval(() => {
      syncWithServer();
    }, 3000);

    return () => {
      evtSource?.close();
      clearInterval(interval);
    };
  }, [syncWithServer]);

  const handleSaveMyProfile = (updated: CurrentUserProfile) => {
    setCurrentUser(updated);
    saveCurrentUserToStorage(updated);
    syncWithServer(updated, true);
  };

  const handleBlockUser = (targetUser: UserProfile) => {
    setBlockedUsers((prev) => {
      if (prev.some((b) => b.id === targetUser.id)) return prev;
      const next: BlockedUserInfo[] = [
        ...prev,
        {
          id: targetUser.id,
          name: targetUser.name,
          role: targetUser.role,
          avatarPreset: targetUser.avatarPreset,
          photoUrl: targetUser.photoUrl,
        },
      ];
      saveBlockedUsers(next);
      return next;
    });
    setSelectedUserId(null);
  };

  const handleUnblockUser = (userId: string) => {
    setBlockedUsers((prev) => {
      const next = prev.filter((b) => b.id !== userId);
      saveBlockedUsers(next);
      return next;
    });
  };

  const handleUnblockAll = () => {
    setBlockedUsers([]);
    saveBlockedUsers([]);
  };

  const handleToggleWave = async (toUserId: string) => {
    const willWave = !wavedByMe[toUserId];
    setWavedByMe((prev) => ({ ...prev, [toUserId]: willWave }));

    if (willWave && isCommunityStarterPeer(toUserId)) {
      setWavedAtMe((prev) => ({ ...prev, [toUserId]: true }));
      scheduleStarterPeerReply(toUserId, 'Hi 👋');
      return;
    }

    relayRef.current?.sendDirectPacket(toUserId, {
      type: 'wave',
      fromUserId: currentUser.id,
      toUserId,
      timestamp: Date.now(),
    });

    try {
      await fetch('/api/users/wave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId,
        }),
      });
      syncWithServer();
    } catch {
      // Static host handled by relay
    }
  };

  const handleTypingChange = useCallback(
    async (toUserId: string, isTyping: boolean) => {
      if (isCommunityStarterPeer(toUserId)) return;

      relayRef.current?.sendDirectPacket(toUserId, {
        type: 'typing',
        fromUserId: currentUser.id,
        toUserId,
        isTyping,
        timestamp: Date.now(),
      });

      try {
        await fetch('/api/users/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromUserId: currentUser.id,
            toUserId,
            isTyping,
          }),
        });
      } catch {
        // Static host handled by relay
      }
    },
    [currentUser.id]
  );

  const handleSendMessage = async (
    toUserId: string,
    payload: SendMessagePayload
  ) => {
    const isStarter = isCommunityStarterPeer(toUserId);
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromUserId: currentUser.id,
      toUserId,
      text: payload.text,
      imageUrl: payload.imageUrl,
      audioUrl: payload.audioUrl,
      mapUrl: payload.mapUrl,
      seen: isStarter,
      reactions: {},
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: Date.now(),
    };

    knownMessageIdsRef.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);

    if (isStarter) {
      scheduleStarterPeerReply(
        toUserId,
        payload.text || (payload.imageUrl ? 'Photo' : 'Voice note')
      );
      return;
    }

    relayRef.current?.sendDirectPacket(toUserId, {
      type: 'chat_message',
      message: msg,
      timestamp: Date.now(),
    });

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
      syncWithServer();
    } catch {
      // Static host handled by relay
    }
  };

  const handleReactMessage = async (
    peerId: string,
    messageId: string,
    emoji: string
  ) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m;
        const nextReactions = { ...(m.reactions || {}) };
        if (nextReactions[currentUser.id] === emoji) {
          delete nextReactions[currentUser.id];
        } else {
          nextReactions[currentUser.id] = emoji;
        }
        return { ...m, reactions: nextReactions };
      })
    );

    if (isCommunityStarterPeer(peerId)) return;

    relayRef.current?.sendDirectPacket(peerId, {
      type: 'message_reaction',
      messageId,
      fromUserId: currentUser.id,
      toUserId: peerId,
      emoji,
      timestamp: Date.now(),
    });

    try {
      await fetch('/api/messages/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          fromUserId: currentUser.id,
          emoji,
        }),
      });
    } catch {
      // Static host handled by relay
    }
  };

  const handleClearChat = async (peerId: string) => {
    setMessages((prev) =>
      prev.filter(
        (m) =>
          !(
            (m.fromUserId === currentUser.id && m.toUserId === peerId) ||
            (m.fromUserId === peerId && m.toUserId === currentUser.id)
          )
      )
    );

    if (isCommunityStarterPeer(peerId)) return;

    relayRef.current?.sendDirectPacket(peerId, {
      type: 'clear_chat',
      fromUserId: currentUser.id,
      toUserId: peerId,
      timestamp: Date.now(),
    });

    try {
      await fetch('/api/messages/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId: peerId,
        }),
      });
    } catch {
      // Static host handled by relay
    }
  };

  const appShareUrl =
    typeof window !== 'undefined'
      ? window.location.origin + window.location.pathname
      : 'https://gss39.github.io/near500/';

  const handleCopyShareLink = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(appShareUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const whatsAppInviteHref = `https://wa.me/?text=${encodeURIComponent(
    `🔥 Mere 500 meter radar pe join karo! Bina phone number ke aas-paas ke logo se live chat karo: ${appShareUrl}`
  )}`;

  // Mark messages as read & broadcast Seen (`✓✓`) whenever a chat modal is open
  useEffect(() => {
    if (!selectedUserId) return;
    const incomingFromSelected = messages.filter(
      (m) => m.fromUserId === selectedUserId && m.toUserId === currentUser.id
    );
    const totalFromSelected = incomingFromSelected.length;

    setReadCountsByPeer((prev) => {
      if (prev[selectedUserId] === totalFromSelected) return prev;
      return { ...prev, [selectedUserId]: totalFromSelected };
    });

    const hasUnseen = incomingFromSelected.some((m) => !m.seen);
    if (hasUnseen) {
      setMessages((prev) =>
        prev.map((m) =>
          m.fromUserId === selectedUserId && m.toUserId === currentUser.id
            ? { ...m, seen: true }
            : m
        )
      );
      if (!isCommunityStarterPeer(selectedUserId)) {
        relayRef.current?.sendDirectPacket(selectedUserId, {
          type: 'messages_seen',
          fromUserId: currentUser.id,
          toUserId: selectedUserId,
          timestamp: Date.now(),
        });
        fetch('/api/messages/seen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromUserId: currentUser.id,
            toUserId: selectedUserId,
          }),
        }).catch(() => {});
      }
    }
  }, [selectedUserId, messages, currentUser.id]);

  // Calculate unread message count per user for card notification dot
  const unreadByPeer = useMemo(() => {
    const totalByPeer: Record<string, number> = {};
    messages.forEach((m) => {
      if (m.toUserId === currentUser.id && m.fromUserId !== currentUser.id) {
        totalByPeer[m.fromUserId] = (totalByPeer[m.fromUserId] || 0) + 1;
      }
    });
    const unread: Record<string, number> = {};
    Object.keys(totalByPeer).forEach((peerId) => {
      if (peerId === selectedUserId) return;
      const readCount = readCountsByPeer[peerId] || 0;
      if (totalByPeer[peerId] > readCount) {
        unread[peerId] = totalByPeer[peerId] - readCount;
      }
    });
    return unread;
  }, [messages, currentUser.id, readCountsByPeer, selectedUserId]);

  // Filter live users strictly <= 500m
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return liveUsers.filter((u) => {
      if (u.distanceMeters > 500) return false;
      if (rangeFilter === '100' && u.distanceMeters > 100) return false;
      if (rangeFilter === '250' && u.distanceMeters > 250) return false;

      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        u.locationSpot.toLowerCase().includes(q) ||
        (u.statusTag && u.statusTag.toLowerCase().includes(q)) ||
        u.bio.toLowerCase().includes(q)
      );
    });
  }, [liveUsers, searchQuery, rangeFilter]);

  const selectedUser = useMemo(
    () => liveUsers.find((u) => u.id === selectedUserId) || null,
    [liveUsers, selectedUserId]
  );

  const selectedUserMessages = useMemo(() => {
    if (!selectedUserId) return [];
    return messages.filter(
      (m) =>
        (m.fromUserId === currentUser.id && m.toUserId === selectedUserId) ||
        (m.fromUserId === selectedUserId && m.toUserId === currentUser.id)
    );
  }, [messages, currentUser.id, selectedUserId]);

  return (
    <div className="min-h-[100dvh] bg-blue-50 text-slate-900 flex flex-col">
      {/* 1. HEADER: Mobile-Responsive Top-Left Logo & Top-Right Invite + User Profile */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-blue-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Top-Left: Webapp Logo */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setSearchQuery('');
              setRangeFilter('all');
            }}
            className="flex items-center gap-2 text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-sm shrink-0">
              N
            </span>
            <div className="flex flex-col">
              <span className="leading-none">Near500</span>
              <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>{liveUsers.length} active in 500m</span>
              </span>
            </div>
          </a>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Invite Nearby Button */}
            <button
              type="button"
              onClick={() => setIsInviteOpen(true)}
              className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Invite Nearby</span>
              <span className="sm:hidden">Invite</span>
            </button>

            {/* Top-Right: Current User Profile (Only Icon on Mobile, Icon + Name on Desktop) */}
            <button
              type="button"
              onClick={() => setIsMyProfileOpen(true)}
              aria-label="Open my profile"
              title={currentUser.name}
              className="p-1 sm:min-h-[40px] sm:pl-1.5 sm:pr-3 sm:py-1 rounded-full bg-blue-50/70 border border-blue-200 hover:bg-blue-100/70 transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
            >
              <UserAvatar
                preset={currentUser.avatarPreset}
                name={currentUser.name}
                photoUrl={currentUser.photoUrl}
                size="sm"
                className="w-8 h-8 sm:w-7 sm:h-7 rounded-full shrink-0"
                showOnlineDot={gpsState === 'live' && currentUser.isDiscoverableUnder500m}
                isOnlineNow={true}
              />
              <span className="hidden sm:inline text-sm font-semibold text-slate-800 max-w-[140px] truncate">
                {currentUser.name}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-6 py-3.5 sm:py-5 space-y-4">
        {/* 2. AFTER HEADER: Search Bar + Range & GPS Controls */}
        <section aria-label="Search live users under 500m" className="space-y-2.5">
          <div className="relative">
            <Search
              className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live people, status, or spot under 500m..."
              aria-label="Search live user under 500m"
              className="w-full min-h-[46px] sm:min-h-[48px] pl-10 sm:pl-12 pr-10 py-2 bg-white border border-blue-200 rounded-2xl text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="min-w-[42px] min-h-[42px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Range Filters + GPS Status & Refresh Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Distance Range Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setRangeFilter('all')}
                className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  rangeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-blue-100 hover:text-slate-900'
                }`}
              >
                All under 500m
              </button>
              <button
                type="button"
                onClick={() => setRangeFilter('250')}
                className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  rangeFilter === '250'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-blue-100 hover:text-slate-900'
                }`}
              >
                Under 250m
              </button>
              <button
                type="button"
                onClick={() => setRangeFilter('100')}
                className={`min-h-[34px] px-2.5 sm:px-3 py-1 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  rangeFilter === '100'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-blue-100 hover:text-slate-900'
                }`}
              >
                Under 100m
              </button>
            </div>

            {/* GPS Status + Refresh */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <button
                type="button"
                onClick={requestLiveLocation}
                className="min-h-[34px] px-2.5 sm:px-3 py-1 rounded-xl bg-white border border-blue-200 text-[11px] sm:text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono-tabular">
                  {gpsState === 'locating'
                    ? 'Locking GPS...'
                    : gpsState === 'live' && currentUser.lat !== null
                    ? `GPS Live${currentUser.accuracy ? ` (±${currentUser.accuracy}m)` : ''}`
                    : 'Turn On GPS'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => syncWithServer(currentUser, true)}
                aria-label="Refresh radar"
                title="Refresh radar"
                className="min-h-[34px] px-2.5 sm:px-3 py-1 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </section>

        {/* GPS Error Alert if Location Blocked */}
        {gpsErrorMsg && (
          <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2.5">
            <p className="text-xs text-amber-900 leading-relaxed">{gpsErrorMsg}</p>
            <button
              type="button"
              onClick={requestLiveLocation}
              className="w-full xs:w-auto min-h-[36px] px-3.5 py-1.5 rounded-xl bg-amber-900 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Enable GPS
            </button>
          </div>
        )}

        {/* 3. PEOPLE RADAR CARDS */}
        <section aria-label="Live user profiles within 500 meters" className="space-y-3.5">
          {filteredUsers.length === 0 ? (
            <div className="py-10 px-4 text-center bg-white border border-blue-200 rounded-3xl shadow-sm">
              <p className="text-sm font-bold text-slate-800">
                No match found for "{searchQuery}"
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Clear your search filter or reset range to see all active people within 500m.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setRangeFilter('all');
                }}
                className="mt-3.5 min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Show All Nearby Users
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredUsers.map((person) => {
                const unreadCount = unreadByPeer[person.id] || 0;
                const isTypingNow = Boolean(typingPeers[person.id]);
                const presence = getPresenceStatus(person.lastSeenAt);

                return (
                  <div
                    key={person.id}
                    onClick={() => setSelectedUserId(person.id)}
                    className="relative group p-3.5 sm:p-4 rounded-2xl border border-blue-200 bg-white hover:border-blue-400 active:scale-[0.99] transition-all flex items-center justify-between gap-2.5 sm:gap-3.5 cursor-pointer shadow-sm"
                  >
                    {unreadCount > 0 && (
                      <span
                        aria-label={`${unreadCount} unread messages`}
                        className="absolute -top-2 right-3 px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] sm:text-[11px] font-bold shadow-sm flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        <span>{unreadCount} new</span>
                      </span>
                    )}

                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UserAvatar
                        preset={person.avatarPreset}
                        name={person.name}
                        photoUrl={person.photoUrl}
                        size="lg"
                        className="shrink-0"
                        showOnlineDot={true}
                        isOnlineNow={presence.isOnlineNow}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:underline">
                            {person.name}
                          </h2>
                          <span
                            className={`text-[10px] sm:text-[11px] font-semibold shrink-0 flex items-center gap-1 ${
                              presence.isOnlineNow
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                presence.isOnlineNow
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-400'
                              }`}
                            />
                            <span>{presence.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {isTypingNow ? (
                            <span className="font-semibold text-blue-700">
                              Typing a message...
                            </span>
                          ) : person.statusTag ? (
                            <span className="font-medium text-blue-700">
                              {person.statusTag} · {person.role}
                            </span>
                          ) : (
                            person.role
                          )}
                        </p>
                        <p className="text-[11px] sm:text-xs text-slate-500 mt-1 flex items-center gap-1 truncate font-mono-tabular">
                          <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="font-bold text-blue-700 shrink-0">
                            {person.distanceMeters}m
                          </span>
                          {person.compassDir && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-slate-700 shrink-0">
                                {person.compassDir}
                              </span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="truncate font-sans">
                            {person.wavedAtMe ? 'Said Hi 👋' : person.locationSpot}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserId(person.id);
                      }}
                      className={`min-h-[38px] sm:min-h-[40px] px-3.5 sm:px-4 py-2 rounded-xl text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm ${
                        unreadCount > 0
                          ? 'bg-rose-600 hover:bg-rose-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {unreadCount > 0 ? `Reply (${unreadCount})` : 'Chat'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Invite Banner at Bottom of Radar */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="space-y-0.5">
              <p className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Want your real friends around you on this radar?</span>
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Share the QR code or WhatsApp link with anyone sitting within 500m to see their live distance in meters.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <a
                href={whatsAppInviteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp Invite</span>
              </a>
              <button
                type="button"
                onClick={() => setIsInviteOpen(true)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>Show QR</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Invite Nearby QR & Share Modal */}
      {isInviteOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsInviteOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-blue-200 p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center space-y-4 shadow-xl max-h-[92dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                500m Radar Invite
              </span>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Scan or Share Within 500m
              </h2>
              <p className="text-xs text-slate-500">
                Ask friends around you to scan this QR code or open the link to appear live on your radar!
              </p>
            </div>

            <div className="p-3.5 sm:p-4 bg-blue-50 border border-blue-200 rounded-2xl inline-block mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  appShareUrl
                )}`}
                alt="Near500 QR Code"
                className="w-40 h-40 sm:w-44 sm:h-44 rounded-xl bg-white p-2 mx-auto"
              />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2">
              <input
                type="text"
                readOnly
                value={appShareUrl}
                className="flex-1 bg-transparent text-xs text-slate-700 font-mono-tabular truncate focus:outline-none px-1 min-w-0"
              />
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <a
              href={whatsAppInviteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Invite on WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Modals */}
      <UserDetailModal
        currentUser={currentUser}
        user={selectedUser}
        isPeerTyping={selectedUser ? Boolean(typingPeers[selectedUser.id]) : false}
        onClose={() => setSelectedUserId(null)}
        onToggleWave={handleToggleWave}
        messages={selectedUserMessages}
        onSendMessage={handleSendMessage}
        onReactMessage={handleReactMessage}
        onClearChat={handleClearChat}
        onBlockUser={handleBlockUser}
        onTypingChange={handleTypingChange}
      />

      <CurrentUserModal
        isOpen={isMyProfileOpen}
        profile={currentUser}
        blockedUsers={blockedUsers}
        onUnblockUser={handleUnblockUser}
        onUnblockAll={handleUnblockAll}
        onClose={() => setIsMyProfileOpen(false)}
        onSaveProfile={handleSaveMyProfile}
      />
    </div>
  );
}
