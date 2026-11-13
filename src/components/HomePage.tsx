import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCheck,
  Lock,
  LogIn,
  MessageSquare,
  Mic,
  Pause,
  Phone,
  Play,
  QrCode,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { COMMUNITY_STARTER_PEERS } from '../data/nearbyUsers';
import { UserAvatar } from './UserAvatar';
import heroConnectImg from '../assets/images/nearchat_hero_connect_1794545984070.jpg';
import mobileDeskImg from '../assets/images/nearchat_mobile_desk_1794545983386.jpg';
import globalCollabImg from '../assets/images/nearchat_global_collab_1794545984045.jpg';

interface HomePageProps {
  onOpenLogin: () => void;
}

interface PreviewConversation {
  incoming: string;
  outgoing: string;
  followUp: string;
  voiceDuration: string;
  incomingTime: string;
  outgoingTime: string;
  followUpTime: string;
}

const PREVIEW_THREADS: Record<string, PreviewConversation> = {
  'community-peer-aarav': {
    incoming:
      'Hey! Just pushed the updated checkout flow. Want to jump into live chat and test it together?',
    outgoing:
      'Looks clean on both desktop and phone. Sending a quick voice note with feedback.',
    followUp: 'Perfect — open the chat room whenever you are ready.',
    voiceDuration: '0:18',
    incomingTime: '10:24 AM',
    outgoingTime: '10:25 AM',
    followUpTime: '10:26 AM',
  },
  'community-peer-priya': {
    incoming:
      'Shared the redesigned mobile cards from Mumbai. How is the spacing looking on your screen?',
    outgoing:
      'Super crisp and easy to read on smaller phones. Let us invite the design team with the QR link.',
    followUp: 'Great! Anyone who verifies their mobile number joins right away.',
    voiceDuration: '0:14',
    incomingTime: '09:42 AM',
    outgoingTime: '09:44 AM',
    followUpTime: '09:45 AM',
  },
  'community-peer-kabir': {
    incoming:
      'Are founders from different cities online in the global directory right now?',
    outgoing:
      'Yes, there is zero distance limit now. Verify your number once and see everyone live.',
    followUp: 'Nice, logging in with my mobile number now.',
    voiceDuration: '0:22',
    incomingTime: '08:15 AM',
    outgoingTime: '08:16 AM',
    followUpTime: '08:17 AM',
  },
};

const PREVIEW_REACTIONS = ['👍', '❤️', '🔥'];
const VOICE_BAR_HEIGHTS = [10, 18, 12, 24, 16, 22, 14, 20, 11, 17, 23, 13, 19, 12];

export const HomePage: React.FC<HomePageProps> = ({ onOpenLogin }) => {
  const previewPeers = COMMUNITY_STARTER_PEERS.slice(0, 3);
  const [activePeerId, setActivePeerId] = useState<string>(previewPeers[0].id);
  const [selectedReaction, setSelectedReaction] = useState<Record<string, string>>({
    'community-peer-aarav': '👍',
  });
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);

  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [deskImgFailed, setDeskImgFailed] = useState(false);
  const [collabImgFailed, setCollabImgFailed] = useState(false);

  const activePeer =
    previewPeers.find((p) => p.id === activePeerId) || previewPeers[0];
  const activeThread =
    PREVIEW_THREADS[activePeer.id] || PREVIEW_THREADS['community-peer-aarav'];

  const handleToggleReaction = (emoji: string) => {
    setSelectedReaction((prev) => ({
      ...prev,
      [activePeer.id]: prev[activePeer.id] === emoji ? '' : emoji,
    }));
  };

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Bar Contract: Brand wordmark — Nav links — Top-right Login CTA */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center gap-2.5 text-lg font-display font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              N
            </span>
            <span>NearChat</span>
          </a>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600"
          >
            <a
              href="#live-preview"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Live Preview
            </a>
            <a
              href="#features"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How it Works
            </a>
            <a
              href="#privacy"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Privacy
            </a>
          </nav>

          {/* Zone 3: Top-Right Login Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenLogin}
              className="min-h-[40px] px-4 sm:px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* 1. HERO SECTION */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column: Proposition & Primary Action */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-blue-700 tracking-wide">
                  Verified Global Web Messaging
                </p>
                <h1
                  className="font-display font-bold tracking-tight text-slate-950 leading-[1.06] max-w-xl"
                  style={{
                    fontSize: 'clamp(2.35rem, 4.4vw, 3.85rem)',
                    textWrap: 'balance',
                  }}
                >
                  Real conversations, live from any browser.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  Sign in with a 6-digit mobile verification code and connect immediately with active members across cities. Send messages, photos, and voice notes while your phone number stays private.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>Login with Mobile</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <a
                  href="#live-preview"
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  Try Live Preview
                </a>
              </div>

              {/* Clean Unboxed Metadata Strip */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 pt-2 border-t border-slate-200/80">
                <span>6-digit OTP access</span>
                <span aria-hidden="true">·</span>
                <span>Private phone numbers</span>
                <span aria-hidden="true">·</span>
                <span>Voice notes &amp; media</span>
                <span aria-hidden="true">·</span>
                <span>No app install required</span>
              </div>
            </div>

            {/* Right Column: Editorial Hero Visual + Docked Conversation Bar */}
            <div className="lg:col-span-6">
              <div className="relative h-full min-h-[360px] sm:min-h-[440px] rounded-3xl overflow-hidden bg-slate-900 border border-slate-200">
                {!heroImgFailed ? (
                  <img
                    src={heroConnectImg}
                    alt="Creative professional smiling while messaging on NearChat in a sunlit studio"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-8">
                    <MessageSquare className="w-16 h-16 text-blue-400/50" />
                  </div>
                )}

                {/* Measured Scrim for 4.5:1 Contrast */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                {/* Docked Live Conversation Card */}
                <div className="absolute inset-x-4 bottom-4 sm:inset-x-5 sm:bottom-5 bg-white/95 backdrop-blur-md rounded-2xl p-4 border border-white/60 shadow-lg">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        preset={previewPeers[0].avatarPreset}
                        name={previewPeers[0].name}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {previewPeers[0].name}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="truncate">{previewPeers[0].locationSpot}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 truncate mt-0.5">
                          "Want to jump into live chat and review the design?"
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    >
                      Reply now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. INTERACTIVE LIVE CHAT PREVIEW (Deep Obsidian Section Contrast) */}
        <section id="live-preview" className="bg-[#0B1220] text-white py-14 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <p className="text-xs font-semibold text-blue-400 tracking-wide">
                  Interactive Workspace Preview
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  See how conversations flow inside NearChat
                </h2>
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  Switch between active members below, play a sample voice note, or react to a message before verifying your number.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Open Live Directory</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Clean Two-Pane Web App Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-800 bg-[#111A2E]">
              {/* Left Contacts List */}
              <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 sm:p-5 space-y-2">
                <p className="text-xs font-semibold text-slate-400 px-2 pb-1">
                  Active Members
                </p>
                {previewPeers.map((peer) => {
                  const isActive = peer.id === activePeer.id;
                  const snippet = PREVIEW_THREADS[peer.id]?.incoming || peer.bio;
                  return (
                    <button
                      key={peer.id}
                      type="button"
                      onClick={() => {
                        setActivePeerId(peer.id);
                        setIsVoicePlaying(false);
                      }}
                      className={`w-full text-left p-3 rounded-2xl transition-colors flex items-center gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-blue-600/20 border border-blue-500/40'
                          : 'hover:bg-slate-800/70 border border-transparent'
                      }`}
                    >
                      <UserAvatar
                        preset={peer.avatarPreset}
                        name={peer.name}
                        size="md"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-white truncate">
                            {peer.name}
                          </span>
                          <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">
                            {PREVIEW_THREADS[peer.id]?.incomingTime}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {snippet}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Right Active Conversation Thread */}
              <div className="lg:col-span-8 flex flex-col justify-between bg-[#0E1628]">
                {/* Thread Header */}
                <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      preset={activePeer.avatarPreset}
                      name={activePeer.name}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">
                        {activePeer.name}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {activePeer.role} · {activePeer.locationSpot}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    Message {activePeer.name.split(' ')[0]}
                  </button>
                </div>

                {/* Messages Canvas */}
                <div className="p-5 space-y-4">
                  {/* Incoming */}
                  <div className="flex flex-col items-start">
                    <div className="px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/70 text-xs sm:text-sm text-slate-100 max-w-[85%] leading-relaxed">
                      {activeThread.incoming}
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono-tabular mt-1 px-1">
                      {activeThread.incomingTime}
                    </span>
                  </div>

                  {/* Outgoing + Interactive Voice Note */}
                  <div className="flex flex-col items-end space-y-2">
                    <div className="px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-xs sm:text-sm max-w-[85%] leading-relaxed">
                      {activeThread.outgoing}
                    </div>

                    {/* Interactive Voice Note Strip */}
                    <div className="px-3.5 py-2.5 rounded-2xl bg-blue-600/90 text-white flex items-center gap-3 max-w-[85%]">
                      <button
                        type="button"
                        onClick={() => setIsVoicePlaying((prev) => !prev)}
                        aria-label={isVoicePlaying ? 'Pause voice preview' : 'Play voice preview'}
                        className="w-8 h-8 rounded-full bg-white text-blue-700 flex items-center justify-center shrink-0 cursor-pointer hover:bg-blue-50 transition-colors"
                      >
                        {isVoicePlaying ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 ml-0.5" />
                        )}
                      </button>
                      <div className="flex items-center gap-1" aria-hidden="true">
                        {VOICE_BAR_HEIGHTS.map((height, idx) => (
                          <span
                            key={idx}
                            className={`w-1 rounded-full transition-opacity ${
                              isVoicePlaying ? 'bg-white' : 'bg-white/75'
                            }`}
                            style={{ height: `${height}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-mono-tabular text-blue-100 shrink-0">
                        {activeThread.voiceDuration}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono-tabular px-1">
                      <span>{activeThread.outgoingTime}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                  </div>

                  {/* Follow-up Incoming with Interactive Reactions */}
                  <div className="flex flex-col items-start space-y-1.5">
                    <div className="px-4 py-2.5 rounded-2xl bg-slate-800/90 border border-slate-700/70 text-xs sm:text-sm text-slate-100 max-w-[85%] leading-relaxed">
                      {activeThread.followUp}
                    </div>
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[11px] text-slate-500 font-mono-tabular">
                        {activeThread.followUpTime}
                      </span>
                      <div className="flex items-center gap-1">
                        {PREVIEW_REACTIONS.map((emoji) => {
                          const isChosen = selectedReaction[activePeer.id] === emoji;
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(emoji)}
                              className={`px-2 py-0.5 rounded-lg text-xs transition-colors cursor-pointer ${
                                isChosen
                                  ? 'bg-blue-600/30 border border-blue-400/60 text-white'
                                  : 'bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Preview Composer */}
                <div className="p-4 border-t border-slate-800 bg-[#111A2E] flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-left text-xs sm:text-sm text-slate-400 transition-colors cursor-pointer truncate"
                  >
                    Verify your mobile number to reply to {activePeer.name.split(' ')[0]}...
                  </button>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Login</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ASYMMETRIC VISUAL BENTO FEATURES */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <div className="max-w-2xl mb-10 space-y-2">
            <p className="text-xs font-semibold text-blue-700 tracking-wide">
              Why NearChat
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
              Built for clear, fast web conversations
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Every tool you expect in a modern messenger, designed to open immediately inside mobile and desktop browsers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Feature 01 (Wide Visual Card) */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
              <div className="h-56 sm:h-64 bg-slate-100 overflow-hidden relative">
                {!deskImgFailed ? (
                  <img
                    src={mobileDeskImg}
                    alt="Smartphone and wireless headphones resting on an architectural desk"
                    referrerPolicy="no-referrer"
                    onError={() => setDeskImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                    <Mic className="w-10 h-10 text-blue-500" />
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-7 space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                      01. Instant Text, Photos &amp; Voice Notes
                    </h3>
                    <div className="flex items-center gap-2 text-blue-600 shrink-0">
                      <MessageSquare className="w-4 h-4" />
                      <Mic className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Send real-time text messages, emoji reactions, compressed photo attachments, and browser voice recordings with live typing status and read receipts.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 02 (Structured OTP Showcase Card) */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    02. 6-Digit OTP Verification
                  </h3>
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Enter your country code and mobile number, confirm the 6-digit verification code, and land inside your live chat workspace right away.
                </p>
              </div>

              {/* Clean Visual OTP Representation */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Mobile Login Code</span>
                  <span className="font-mono-tabular">+91 · Verified</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
                  {['4', '8', '2', '9', '1', '6'].map((num, i) => (
                    <div
                      key={i}
                      className="h-10 rounded-lg bg-white border border-blue-200 flex items-center justify-center font-mono-tabular font-bold text-sm text-blue-700"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 03 (Privacy Card) */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    03. Private Number Protection
                  </h3>
                  <Lock className="w-5 h-5 text-blue-600 shrink-0" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your phone number is strictly for login identity and account persistence—never broadcast to other members on public chat cards.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Public profile card</span>
                  <span className="font-semibold text-slate-900">Name, Role &amp; City</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-slate-700">
                  <span>Mobile number</span>
                  <span className="font-semibold text-blue-700">Hidden from peers</span>
                </div>
              </div>
            </div>

            {/* Feature 04 (Wide Visual Card) */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
              <div className="h-56 sm:h-64 bg-slate-100 overflow-hidden relative">
                {!collabImgFailed ? (
                  <img
                    src={globalCollabImg}
                    alt="Two professionals collaborating over laptops and mobile devices in a bright workspace"
                    referrerPolicy="no-referrer"
                    onError={() => setCollabImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
                    <Users className="w-10 h-10 text-blue-500" />
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-7 space-y-2.5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                      04. Global Live Directory &amp; Instant QR Invites
                    </h3>
                    <div className="flex items-center gap-2 text-blue-600 shrink-0">
                      <Users className="w-4 h-4" />
                      <QrCode className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Every online user appears in one shared directory regardless of distance. Share a WhatsApp link or scannable QR code to invite friends directly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. HOW IT WORKS */}
        <section
          id="how-it-works"
          className="bg-white border-y border-slate-200 py-14 sm:py-16"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Start chatting in three quick steps
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  No passwords or long signup forms—just verify your mobile number and go live.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Verify &amp; Open Chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                <p className="text-xs font-mono-tabular font-bold text-blue-700">01</p>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Click Login at Top Right
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Choose your country dial code, type your mobile number, and set the name others will see.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                <p className="text-xs font-mono-tabular font-bold text-blue-700">02</p>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Confirm 6-Digit Code
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Enter or auto-fill the 6-digit OTP code in the WhatsApp-style verification boxes.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#F8FAFC] border border-slate-200 space-y-2">
                <p className="text-xs font-mono-tabular font-bold text-blue-700">03</p>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Chat Live Worldwide
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Search live members, customize your avatar or profile photo, and message immediately.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. PRIVACY & FINAL CONVERSION CTA */}
        <section id="privacy" className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="rounded-3xl bg-blue-600 text-white p-7 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Ready to join the live chat room?
              </h2>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                Your mobile number stays private, your profile stays under your control, and you can block contacts, clear threads, or log out anytime.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="min-h-[48px] px-6 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>Login with Mobile</span>
            </button>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <span>NearChat</span>
            <span aria-hidden="true">·</span>
            <span className="font-normal text-slate-500">
              Private Mobile-Verified Web Chat
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#live-preview" className="hover:text-slate-900 transition-colors">
              Live Preview
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How it Works
            </a>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-blue-700 font-semibold hover:underline cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
