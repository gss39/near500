import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search,
  X,
  MapPin,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import {
  loadOrCreateCurrentUser,
  saveCurrentUserToStorage,
  loadBlockedUsers,
  saveBlockedUsers,
  playMessagePopSound,
  getPresenceStatus,
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
  getCompassDirection,
} from './utils/liveRelay';

type RangeFilter = 'all' | '100' | '250';

interface RelayPeerState {
  profile: CurrentUserProfile;
  lastSeenAt: number;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile>(() =>
    loadOrCreateCurrentUser()
  );
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserInfo[]>(() =>
    loadBlockedUsers()
  );
  const [serverUsers, setServerUsers] = useState<UserProfile[]>([]);
  const [relayPeers, setRelayPeers] = useState<Record<string, RelayPeerState>>({});
  const [wavedByMe, setWavedByMe] = useState<Record<string, boolean>>({});
  const [wavedAtMe, setWavedAtMe] = useState<Record<string, boolean>>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [readCountsByPeer, setReadCountsByPeer] = useState<Record<string, number>>({});
  const [typingPeers, setTypingPeers] = useState<Record<string, number>>({});

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
  const lastGpsFixRef = useRef<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  } | null>(null);

  // Sync current user's live location & profile with server AND global live relay immediately
  const syncWithServer = useCallback(
    async (profileToSync?: CurrentUserProfile, requestPeersReply = false) => {
      const user = profileToSync || currentUserRef.current;
      if (user.lat === null || user.lng === null) return;

      relayRef.current?.broadcastPresence(user, requestPeersReply);
      if (requestPeersReply) {
        relayRef.current?.requestAllPeersPresence();
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

  // Initialize LiveProximityRelay with instant handshake reply and chat messages
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
            if (
              (isNewPeer || packet.replyRequested) &&
              me.lat !== null &&
              me.lng !== null
            ) {
              const now = Date.now();
              if (
                !lastReplyTimeRef.current[peer.id] ||
                now - lastReplyTimeRef.current[peer.id] > 800
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

            // Never let a delayed packet from a slower broker overwrite newer GPS coordinates
            const incomingGpsTs = peer.gpsUpdatedAt || packet.timestamp || Date.now();
            const existingGpsTs = existing?.profile.gpsUpdatedAt || 0;
            const useIncomingCoords = incomingGpsTs >= existingGpsTs;

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
              [peer.id]: { profile: mergedProfile, lastSeenAt: Date.now() },
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
              now - lastReplyTimeRef.current[packet.fromUserId] > 500
            ) {
              lastReplyTimeRef.current[packet.fromUserId] = now;
              relayRef.current?.sendDirectPacket(packet.fromUserId, {
                type: 'presence',
                profile: me,
                replyRequested: false,
                timestamp: now,
              });
              relayRef.current?.broadcastPresence(me, false);
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
          relayRef.current?.broadcastPresence(currentUserRef.current, true);
          relayRef.current?.requestAllPeersPresence();
        }
      }
    );

    relayRef.current = relay;
    return () => {
      relay.destroy();
    };
  }, [currentUser.id]);

  // Prune stale relay peers (> 90s inactive) and clear expired typing states
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRelayPeers((prev) => {
        let changed = false;
        const next: Record<string, RelayPeerState> = {};
        for (const [id, entry] of Object.entries(prev)) {
          if (now - entry.lastSeenAt <= 90000) {
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
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Merge server users + WebSocket relay peers and compute exact live distance & compass direction <= 500m
  const liveUsers = useMemo(() => {
    const blockedSet = new Set(blockedUsers.map((b) => b.id));
    const combined = new Map<string, UserProfile>();
    const myLat = currentUser.lat;
    const myLng = currentUser.lng;

    for (const u of serverUsers) {
      if (blockedSet.has(u.id)) continue;
      const dist =
        myLat !== null &&
        myLng !== null &&
        typeof u.lat === 'number' &&
        typeof u.lng === 'number'
          ? getHaversineDistanceMeters(myLat, myLng, u.lat, u.lng)
          : u.distanceMeters;
      const compassDir =
        myLat !== null &&
        myLng !== null &&
        typeof u.lat === 'number' &&
        typeof u.lng === 'number'
          ? getCompassDirection(myLat, myLng, u.lat, u.lng)
          : u.compassDir;

      if (dist <= 500) {
        combined.set(u.id, {
          ...u,
          distanceMeters: dist,
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
        if (!p.isDiscoverableUnder500m || p.lat === null || p.lng === null) continue;

        const existing = combined.get(peerId);
        const relayGpsTs = p.gpsUpdatedAt || entry.lastSeenAt || 0;
        const serverGpsTs = existing?.gpsUpdatedAt || 0;
        const useRelayCoords =
          !existing ||
          typeof existing.lat !== 'number' ||
          typeof existing.lng !== 'number' ||
          relayGpsTs >= serverGpsTs;

        const peerLat = useRelayCoords ? p.lat : (existing!.lat as number);
        const peerLng = useRelayCoords ? p.lng : (existing!.lng as number);

        const dist = getHaversineDistanceMeters(myLat, myLng, peerLat, peerLng);
        if (dist > 500) {
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
          gpsUpdatedAt: Math.max(relayGpsTs, serverGpsTs),
          distanceMeters: dist,
          compassDir,
          lastSeenAt: mergedLastSeen,
          waved: Boolean(existing?.waved || wavedByMe[peerId]),
          wavedAtMe: Boolean(existing?.wavedAtMe || wavedAtMe[peerId]),
        });
      }
    }

    return Array.from(combined.values()).sort(
      (a, b) => a.distanceMeters - b.distanceMeters
    );
  }, [
    serverUsers,
    relayPeers,
    currentUser.id,
    currentUser.lat,
    currentUser.lng,
    wavedByMe,
    wavedAtMe,
    blockedUsers,
  ]);

  // Apply new GPS coordinates immediately and trigger instant peer sync
  const applyCoords = useCallback(
    (latitude: number, longitude: number, accuracy?: number, fixTimestamp?: number) => {
      const now = Date.now();
      const acc = typeof accuracy === 'number' && accuracy > 0 ? accuracy : 30;
      const fixTs = fixTimestamp || now;
      const prevFix = lastGpsFixRef.current;

      if (prevFix) {
        if (fixTs < prevFix.timestamp - 500) {
          return;
        }
        if (
          now - prevFix.timestamp < 30000 &&
          prevFix.accuracy <= 35 &&
          acc > 85 &&
          acc > prevFix.accuracy * 2.5
        ) {
          return;
        }
      }

      lastGpsFixRef.current = {
        lat: latitude,
        lng: longitude,
        accuracy: acc,
        timestamp: fixTs,
      };

      setCurrentUser((prev) => {
        const updated: CurrentUserProfile = {
          ...prev,
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(acc),
          gpsUpdatedAt: now,
        };
        saveCurrentUserToStorage(updated);
        syncWithServer(updated, true);
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
          'Location permission is off. Please allow GPS Location to see live users within 500m.'
        );
      }
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 15000,
      }
    );
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
    }, 2000);

    const handleBeforeUnload = () => {
      const u = currentUserRef.current;
      if (u?.id) {
        navigator.sendBeacon?.(
          '/api/users/leave',
          new Blob([JSON.stringify({ id: u.id })], { type: 'application/json' })
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      evtSource?.close();
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
    setWavedByMe((prev) => ({ ...prev, [toUserId]: !prev[toUserId] }));
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
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fromUserId: currentUser.id,
      toUserId,
      text: payload.text,
      imageUrl: payload.imageUrl,
      audioUrl: payload.audioUrl,
      mapUrl: payload.mapUrl,
      seen: false,
      reactions: {},
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      createdAt: Date.now(),
    };

    knownMessageIdsRef.current.add(msg.id);
    setMessages((prev) => [...prev, msg]);
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

    return liveUsers
      .filter((u) => {
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
      })
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
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
    <div className="min-h-screen bg-blue-50 text-slate-900 flex flex-col">
      {/* 1. HEADER: Top-Left Logo & Top-Right User Profile */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-blue-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Top-Left: Webapp Logo */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setSearchQuery('');
              setRangeFilter('all');
            }}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
              N
            </span>
            <span>Near500</span>
          </a>

          {/* Top-Right: Current User Profile */}
          <button
            type="button"
            onClick={() => setIsMyProfileOpen(true)}
            aria-label="Open my profile"
            className="min-h-[44px] pl-1.5 pr-3.5 py-1 rounded-full bg-blue-50/70 border border-blue-200 hover:bg-blue-100/70 transition-all flex items-center gap-2 shrink-0 cursor-pointer shadow-sm"
          >
            <UserAvatar
              preset={currentUser.avatarPreset}
              name={currentUser.name}
              photoUrl={currentUser.photoUrl}
              size="sm"
              className="w-8 h-8 rounded-full"
              showOnlineDot={gpsState === 'live' && currentUser.isDiscoverableUnder500m}
              isOnlineNow={true}
            />
            <span className="text-xs sm:text-sm font-semibold text-slate-800 max-w-[110px] sm:max-w-[140px] truncate">
              {currentUser.name}
            </span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 2. AFTER HEADER: Search Bar to Find Live User */}
        <section aria-label="Search live users under 500m">
          <div className="relative">
            <Search
              className="w-5 h-5 text-blue-600 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live user under 500m..."
              aria-label="Search live user under 500m"
              className="w-full min-h-[50px] pl-12 pr-10 py-3 bg-white border border-blue-200 rounded-2xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="min-w-[44px] min-h-[44px] absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Range Filters & Live Location Status */}
          <div className="mt-3.5 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-white border border-blue-200 rounded-xl shadow-sm">
              <button
                type="button"
                onClick={() => setRangeFilter('all')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  rangeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All under 500m
              </button>
              <button
                type="button"
                onClick={() => setRangeFilter('250')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  rangeFilter === '250'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Under 250m
              </button>
              <button
                type="button"
                onClick={() => setRangeFilter('100')}
                className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  rangeFilter === '100'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Under 100m
              </button>
            </div>

            <button
              type="button"
              onClick={requestLiveLocation}
              className="min-h-[34px] px-3.5 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="font-mono-tabular">
                {gpsState === 'locating'
                  ? 'Locking GPS...'
                  : gpsState === 'live' && currentUser.lat !== null
                  ? `GPS Active${currentUser.accuracy ? ` (±${currentUser.accuracy}m)` : ''}`
                  : 'Turn On Location'}
              </span>
            </button>
          </div>
        </section>

        {/* GPS Error Alert if Location Blocked */}
        {gpsErrorMsg && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-amber-900">{gpsErrorMsg}</p>
            <button
              type="button"
              onClick={requestLiveLocation}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-900 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Turn On GPS
            </button>
          </div>
        )}

        {/* 3. AFTER SEARCH BAR: Live User Profiles Under 500m */}
        <section aria-label="Live user profiles within 500 meters">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-sm font-bold text-slate-800">
              Live Users Within 500m
            </h1>
            <button
              type="button"
              onClick={() => syncWithServer(currentUser, true)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 font-mono-tabular cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{filteredUsers.length} online</span>
            </button>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="py-16 px-4 text-center bg-white border border-blue-200 rounded-3xl shadow-sm">
              <p className="text-sm font-bold text-slate-800">
                No other live users within 500m right now
              </p>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
                Your profile ({currentUser.name}) is live. Open this app on another phone or browser tab within 500m to see each other appear in real time.
              </p>
              <button
                type="button"
                onClick={() => setIsMyProfileOpen(true)}
                className="mt-4 min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
              >
                Edit My Profile ({currentUser.name})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredUsers.map((person) => {
                const unreadCount = unreadByPeer[person.id] || 0;
                const isTypingNow = Boolean(typingPeers[person.id]);
                const presence = getPresenceStatus(person.lastSeenAt);

                return (
                  <div
                    key={person.id}
                    onClick={() => setSelectedUserId(person.id)}
                    className="relative group p-4 rounded-2xl border border-blue-200 bg-white hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between gap-3.5 cursor-pointer shadow-sm"
                  >
                    {unreadCount > 0 && (
                      <span
                        aria-label={`${unreadCount} unread messages`}
                        className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-bold shadow-sm flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        <span>{unreadCount} new</span>
                      </span>
                    )}

                    <div className="flex items-center gap-3.5 min-w-0">
                      <UserAvatar
                        preset={person.avatarPreset}
                        name={person.name}
                        photoUrl={person.photoUrl}
                        size="lg"
                        showOnlineDot={true}
                        isOnlineNow={presence.isOnlineNow}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:underline">
                            {person.name}
                          </h2>
                          <span
                            className={`text-[11px] font-semibold shrink-0 flex items-center gap-1 ${
                              presence.isOnlineNow
                                ? 'text-emerald-600'
                                : 'text-amber-600'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                presence.isOnlineNow
                                  ? 'bg-emerald-500'
                                  : 'bg-amber-400'
                              }`}
                            />
                            {presence.label}
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
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 truncate font-mono-tabular">
                          <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="font-bold text-blue-700">
                            {person.distanceMeters}m
                          </span>
                          {person.compassDir && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-slate-700">
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
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                    >
                      {unreadCount > 0 ? `Chat (${unreadCount})` : 'View'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

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
