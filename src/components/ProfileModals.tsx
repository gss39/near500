import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Check,
  CheckCheck,
  Camera,
  Trash2,
  Image as ImageIcon,
  Mic,
  Square,
  MessageCircle,
  Ban,
  ExternalLink,
} from 'lucide-react';
import {
  UserProfile,
  CurrentUserProfile,
  ChatMessage,
  BlockedUserInfo,
  AVATAR_PRESET_LIST,
  STATUS_TAG_OPTIONS,
  REACTION_EMOJIS,
  compressImageFile,
  getPresenceStatus,
} from '../data/nearbyUsers';
import { UserAvatar } from './UserAvatar';

export interface SendMessagePayload {
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  mapUrl?: string;
}

interface UserDetailModalProps {
  currentUser: CurrentUserProfile;
  user: UserProfile | null;
  isPeerTyping: boolean;
  onClose: () => void;
  onToggleWave: (userId: string) => void;
  messages: ChatMessage[];
  onSendMessage: (userId: string, payload: SendMessagePayload) => void;
  onReactMessage: (userId: string, messageId: string, emoji: string) => void;
  onClearChat: (userId: string) => void;
  onBlockUser: (user: UserProfile) => void;
  onTypingChange: (userId: string, isTyping: boolean) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  currentUser,
  user,
  isPeerTyping,
  onClose,
  onToggleWave,
  messages,
  onSendMessage,
  onReactMessage,
  onClearChat,
  onBlockUser,
  onTypingChange,
}) => {
  const [draft, setDraft] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | undefined>(undefined);
  const [isUploadingChatImg, setIsUploadingChatImg] = useState(false);

  // Voice Note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isPeerTyping]);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!user) return null;

  const presence = getPresenceStatus(user.lastSeenAt);

  const handleDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDraft(val);

    onTypingChange(user.id, val.trim().length > 0);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(user.id, false);
    }, 2200);
  };

  const handleSelectChatImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingChatImg(true);
    try {
      const compressed = await compressImageFile(file, 360, 0.74);
      setAttachedImage(compressed);
    } catch {
      // ignore invalid file
    } finally {
      setIsUploadingChatImg(false);
      e.target.value = '';
    }
  };

  const stopRecordingVoice = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleVoiceRecording = async () => {
    setMicError(null);
    if (isRecording) {
      stopRecordingVoice();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMicError('Microphone not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          audioChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        if (blob.size < 100) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = String(reader.result || '');
          if (base64Audio && user) {
            onSendMessage(user.id, {
              text: '🎙️ Voice Note',
              audioUrl: base64Audio,
            });
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 12) {
            stopRecordingVoice();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setMicError('Allow microphone permission to send voice notes.');
    }
  };

  const handleSendQuickHello = () => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTypingChange(user.id, false);
    onSendMessage(user.id, {
      text: `Hi ${user.name.split(' ')[0]}! 👋 Great to connect with you here.`,
    });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() && !attachedImage) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onTypingChange(user.id, false);
    onSendMessage(user.id, {
      text: draft.trim(),
      imageUrl: attachedImage,
    });
    setDraft('');
    setAttachedImage(undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-user-name"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-blue-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] shadow-xl"
      >
        {/* Top bar: Online Status + Location + Clear Chat + Block User + Close */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-3.5 pb-2 bg-blue-50 gap-2 shrink-0">
          <span className="text-xs font-semibold text-blue-700 font-mono-tabular truncate flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                presence.isOnlineNow ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="truncate">
              {isPeerTyping ? 'Typing...' : `${presence.label} · ${user.locationSpot}`}
            </span>
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => onClearChat(user.id)}
                title="Clear chat history"
                className="min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-white/80 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Clear</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onBlockUser(user)}
              title="Block or hide this user"
              className="min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:text-rose-700 hover:bg-white/80 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Block</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile"
              className="min-w-[38px] min-h-[38px] -mr-1 rounded-full text-slate-400 hover:text-slate-800 hover:bg-white/80 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Info (Compact on Mobile so Chat Room has plenty of height) */}
        <div className="px-4 sm:px-6 pb-3.5 pt-1 border-b border-blue-100 bg-blue-50 shrink-0">
          <div className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-0">
            <UserAvatar
              preset={user.avatarPreset}
              name={user.name}
              photoUrl={user.photoUrl}
              size="lg"
              className="sm:w-16 sm:h-16 shrink-0"
              showOnlineDot={true}
              isOnlineNow={presence.isOnlineNow}
            />
            <div className="min-w-0 flex-1 sm:mt-2">
              <div className="flex items-center sm:justify-center gap-1.5 flex-wrap">
                <h2 id="modal-user-name" className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  {user.name}
                </h2>
                {user.statusTag && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-blue-700 text-[11px] font-semibold shadow-2xs">
                    {user.statusTag}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5 truncate">
                {user.role} · {user.locationSpot}
              </p>
              {user.bio && (
                <p className="text-xs text-slate-600 mt-1 sm:mt-2 line-clamp-2 sm:max-w-xs sm:mx-auto leading-relaxed">
                  {user.bio}
                </p>
              )}
              {user.wavedAtMe && (
                <p className="mt-1 text-xs font-semibold text-blue-700">
                  {user.name.split(' ')[0]} said Hi to you 👋
                </p>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onToggleWave(user.id)}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                user.waved
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100/50 shadow-sm'
              }`}
            >
              {user.waved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Said Hi</span>
                </>
              ) : (
                <span>Say Hi 👋</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleSendQuickHello}
              className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-700 hover:bg-blue-100/50 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <MessageCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Quick Hello</span>
            </button>
          </div>
        </div>

        {/* Live Chat Box */}
        <div className="p-3.5 sm:p-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] flex-1 min-h-0 flex flex-col justify-between bg-white">
          <div className="space-y-3 flex-1 min-h-[160px] max-h-[38dvh] sm:max-h-60 overflow-y-auto mb-3 pr-1">
            {messages.length === 0 && !isPeerTyping ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Send a message, photo, or voice note to {user.name.split(' ')[0]}
              </p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.fromUserId === currentUser.id;
                const reactionEntries = Object.entries(msg.reactions || {});

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`px-3.5 py-2 rounded-2xl text-xs sm:text-sm max-w-[85%] space-y-1.5 break-words ${
                        isMe
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 border border-blue-200 text-slate-800'
                      }`}
                    >
                      {msg.imageUrl && (
                        <img
                          src={msg.imageUrl}
                          alt="Shared in chat"
                          className="max-h-44 rounded-xl object-cover w-full"
                        />
                      )}

                      {msg.audioUrl && (
                        <audio
                          controls
                          src={msg.audioUrl}
                          className="h-8 max-w-[210px] w-full"
                        />
                      )}

                      {msg.text && <p className="leading-relaxed">{msg.text}</p>}

                      {msg.mapUrl && (
                        <a
                          href={msg.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-[11px] font-bold underline pt-0.5 ${
                            isMe ? 'text-blue-100' : 'text-blue-700'
                          }`}
                        >
                          <span>Open Exact Spot in Maps</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {/* Emoji Reactions Bar + Seen Receipt */}
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200/80 rounded-full px-1.5 py-0.5">
                        {REACTION_EMOJIS.map((emoji) => {
                          const myReaction = msg.reactions?.[currentUser.id] === emoji;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => onReactMessage(user.id, msg.id, emoji)}
                              className={`text-xs px-1 rounded-full transition-transform active:scale-125 cursor-pointer ${
                                myReaction ? 'bg-blue-100 font-bold' : 'opacity-70 hover:opacity-100'
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>

                      {reactionEntries.length > 0 && (
                        <span className="text-xs bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">
                          {Array.from(new Set(reactionEntries.map(([, em]) => em))).join(' ')}
                        </span>
                      )}

                      <span className="text-[10px] text-slate-400 font-mono-tabular flex items-center gap-1">
                        <span>{msg.timestamp}</span>
                        {isMe && (
                          <span
                            title={msg.seen ? 'Seen' : 'Sent'}
                            className={`inline-flex items-center ${
                              msg.seen ? 'text-blue-600 font-bold' : 'text-slate-400'
                            }`}
                          >
                            {msg.seen ? (
                              <>
                                <CheckCheck className="w-3.5 h-3.5" />
                                <span className="ml-0.5 text-[10px]">Seen</span>
                              </>
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })
            )}

            {/* Live Typing Indicator */}
            {isPeerTyping && (
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700 py-1">
                <span className="px-3 py-1.5 rounded-2xl bg-blue-50 border border-blue-200">
                  {user.name.split(' ')[0]} is typing...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {micError && (
            <p className="text-[11px] text-rose-600 mb-2 font-medium">{micError}</p>
          )}

          {/* Attached Image Preview before Send */}
          {attachedImage && (
            <div className="mb-2.5 p-2 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <img
                  src={attachedImage}
                  alt="Attachment preview"
                  className="h-12 w-12 rounded-lg border border-blue-200 object-cover"
                />
                <span className="text-xs font-semibold text-blue-800">
                  Photo ready to send
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedImage(undefined)}
                aria-label="Remove attached photo"
                className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center cursor-pointer shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-1.5 shrink-0">
            {/* Photo Share Button */}
            <label
              title="Share photo in chat"
              aria-label="Share photo in chat"
              className="min-h-[44px] min-w-[42px] rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 cursor-pointer transition-colors relative overflow-hidden"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleSelectChatImage}
                className="sr-only"
              />
              <ImageIcon className="w-4 h-4" />
            </label>

            {/* Voice Note Mic Button */}
            <button
              type="button"
              onClick={toggleVoiceRecording}
              title={isRecording ? 'Stop & send voice note' : 'Record voice note'}
              aria-label={isRecording ? 'Stop recording voice note' : 'Record voice note'}
              className={`min-h-[44px] px-2.5 rounded-xl border flex items-center justify-center gap-1 shrink-0 cursor-pointer transition-colors ${
                isRecording
                  ? 'bg-rose-600 border-rose-600 text-white font-semibold text-xs'
                  : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 min-w-[42px]'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span className="font-mono-tabular">{recordingSeconds}s</span>
                </>
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </button>

            <input
              type="text"
              value={draft}
              onChange={handleDraftChange}
              placeholder={
                isRecording
                  ? 'Recording voice note...'
                  : isUploadingChatImg
                  ? 'Loading photo...'
                  : `Message ${user.name.split(' ')[0]}...`
              }
              className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 min-w-0"
            />
            <button
              type="submit"
              aria-label="Send message"
              className="min-h-[44px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

interface CurrentUserModalProps {
  isOpen: boolean;
  profile: CurrentUserProfile;
  blockedUsers: BlockedUserInfo[];
  onUnblockUser: (userId: string) => void;
  onUnblockAll: () => void;
  onClose: () => void;
  onSaveProfile: (updated: CurrentUserProfile) => void;
}

export const CurrentUserModal: React.FC<CurrentUserModalProps> = ({
  isOpen,
  profile,
  blockedUsers,
  onUnblockUser,
  onUnblockAll,
  onClose,
  onSaveProfile,
}) => {
  const [formState, setFormState] = useState<CurrentUserProfile>(profile);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const wasOpenRef = useRef(false);

  // Only initialize formState when modal opens (so live GPS ticks don't overwrite unsaved edits or uploaded photo)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setFormState(profile);
      setPhotoStatus(null);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoStatus('Uploading photo...');
    try {
      const compressed = await compressImageFile(file, 180, 0.78);
      const updatedProfile: CurrentUserProfile = {
        ...formState,
        lat: profile.lat,
        lng: profile.lng,
        accuracy: profile.accuracy,
        photoUrl: compressed,
      };
      setFormState(updatedProfile);
      onSaveProfile(updatedProfile);
      setPhotoStatus('✓ Real photo uploaded & saved');
    } catch {
      setPhotoStatus('Could not read image. Try another photo.');
    } finally {
      e.target.value = '';
    }
  };

  const handleRemovePhoto = () => {
    const updatedProfile: CurrentUserProfile = {
      ...formState,
      lat: profile.lat,
      lng: profile.lng,
      accuracy: profile.accuracy,
      photoUrl: undefined,
    };
    setFormState(updatedProfile);
    onSaveProfile(updatedProfile);
    setPhotoStatus('Photo removed');
  };

  const handleSelectStatusTag = (tag?: string) => {
    const updatedProfile: CurrentUserProfile = {
      ...formState,
      lat: profile.lat,
      lng: profile.lng,
      accuracy: profile.accuracy,
      statusTag: tag,
    };
    setFormState(updatedProfile);
    onSaveProfile(updatedProfile);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...formState,
      lat: profile.lat,
      lng: profile.lng,
      accuracy: profile.accuracy,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-profile-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-blue-200 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[90vh] shadow-xl"
      >
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-blue-100 bg-blue-50 shrink-0">
          <h2 id="my-profile-title" className="text-base font-bold text-slate-900">
            My Live Profile
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close my profile"
            className="min-w-[40px] min-h-[40px] -mr-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-white/80 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-4 overflow-y-auto">
          {/* Feature 1: Real Photo Upload (Inside Profile Only) + Avatar Styles */}
          <div className="flex items-center gap-3.5 sm:gap-4 pb-3 border-b border-slate-100">
            <label
              title="Tap to upload real photo"
              className="relative cursor-pointer group shrink-0"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="sr-only"
              />
              <UserAvatar
                preset={formState.avatarPreset}
                name={formState.name}
                photoUrl={formState.photoUrl}
                size="xl"
              />
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm border-2 border-white">
                <Camera className="w-3.5 h-3.5" />
              </span>
            </label>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm relative overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="sr-only"
                  />
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  <span>Upload Real Photo</span>
                </label>
                {formState.photoUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {photoStatus && (
                <p className="text-[11px] font-semibold text-emerald-700">
                  {photoStatus}
                </p>
              )}

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
                {AVATAR_PRESET_LIST.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      const updatedProfile: CurrentUserProfile = {
                        ...formState,
                        lat: profile.lat,
                        lng: profile.lng,
                        accuracy: profile.accuracy,
                        avatarPreset: item.id,
                        photoUrl: undefined,
                      };
                      setFormState(updatedProfile);
                      onSaveProfile(updatedProfile);
                      setPhotoStatus(null);
                    }}
                    className={`p-0.5 rounded-xl border-2 transition-all cursor-pointer shrink-0 ${
                      !formState.photoUrl && formState.avatarPreset === item.id
                        ? 'border-blue-600 scale-105 bg-blue-50'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <UserAvatar preset={item.id} name={formState.name} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Status Tag Selector (Inside Profile Only) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Live Status Tag
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_TAG_OPTIONS.map((tag) => {
                const isSelected = formState.statusTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSelectStatusTag(isSelected ? undefined : tag)}
                    className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-blue-50/70 text-slate-700 border-blue-200 hover:bg-blue-100/70'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibility Switch */}
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Show my profile online
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Live users on this site can see your profile and chat with you
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formState.isDiscoverableUnder500m}
              onClick={() =>
                setFormState((prev) => ({
                  ...prev,
                  isDiscoverableUnder500m: !prev.isDiscoverableUnder500m,
                }))
              }
              className={`min-w-[48px] min-h-[28px] p-0.5 rounded-full transition-colors flex items-center shrink-0 cursor-pointer ${
                formState.isDiscoverableUnder500m
                  ? 'bg-blue-600 justify-end'
                  : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="w-6 h-6 rounded-full bg-white shadow-sm block" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Your Name
            </label>
            <input
              type="text"
              required
              value={formState.name}
              onChange={(e) => setFormState({ ...formState, name: e.target.value })}
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Role / Profession
              </label>
              <input
                type="text"
                required
                value={formState.role}
                onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                City / Location
              </label>
              <input
                type="text"
                required
                value={formState.locationSpot}
                onChange={(e) =>
                  setFormState({ ...formState, locationSpot: e.target.value })
                }
                className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Short Bio
            </label>
            <textarea
              rows={2}
              value={formState.bio}
              onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Blocked Users Section Inside Profile */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700">
                Blocked Users ({blockedUsers.length})
              </span>
              {blockedUsers.length > 1 && (
                <button
                  type="button"
                  onClick={onUnblockAll}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 text-[11px] font-semibold text-blue-700 hover:bg-blue-50 cursor-pointer"
                >
                  Unblock All
                </button>
              )}
            </div>

            {blockedUsers.length === 0 ? (
              <p className="text-[11px] text-slate-400">
                No blocked users right now. If you block someone from their card, they will appear here so you can unblock them anytime.
              </p>
            ) : (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {blockedUsers.map((bu) => (
                  <div
                    key={bu.id}
                    className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-white border border-slate-200"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        preset={bu.avatarPreset}
                        name={bu.name}
                        photoUrl={bu.photoUrl}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {bu.name}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {bu.role}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onUnblockUser(bu.id)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 grid grid-cols-2 sm:flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
