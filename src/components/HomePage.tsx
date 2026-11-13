import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCheck,
  Lock,
  LogIn,
  MessageSquare,
  Mic,
  Phone,
  QrCode,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { COMMUNITY_STARTER_PEERS } from '../data/nearbyUsers';
import { UserAvatar } from './UserAvatar';

interface HomePageProps {
  onOpenLogin: () => void;
}

const PREVIEW_THREADS: Record<
  string,
  { incoming: string; outgoing: string; incomingTime: string; outgoingTime: string }
> = {
  'community-peer-aarav': {
    incoming: 'Hey! Just pushed the new build. Want to review the chat UI together?',
    outgoing: 'Looks super clean — let us invite the rest of the team with the link.',
    incomingTime: '10:24 AM',
    outgoingTime: '10:25 AM',
  },
  'community-peer-priya': {
    incoming: 'Shared the updated layout mockup. Let me know how it looks on mobile!',
    outgoing: 'Tested on both phone and desktop, spacing feels crisp.',
    incomingTime: '09:42 AM',
    outgoingTime: '09:44 AM',
  },
  'community-peer-kabir': {
    incoming: 'Are we connecting with the remote founders group here today?',
    outgoing: 'Yes! Anyone who verifies their mobile number joins live right away.',
    incomingTime: '08:15 AM',
    outgoingTime: '08:16 AM',
  },
};

export const HomePage: React.FC<HomePageProps> = ({ onOpenLogin }) => {
  const previewPeers = COMMUNITY_STARTER_PEERS.slice(0, 3);
  const [activePeerId, setActivePeerId] = useState<string>(previewPeers[0].id);

  const activePeer =
    previewPeers.find((p) => p.id === activePeerId) || previewPeers[0];
  const activeThread =
    PREVIEW_THREADS[activePeer.id] || PREVIEW_THREADS['community-peer-aarav'];

  return (
    <div className="min-h-[100dvh] bg-blue-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: Brand wordmark — Nav links — Primary Login CTA */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-blue-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#top"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
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
              href="#features"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How it Works
            </a>
            <a
              href="#privacy"
              className="hover:text-blue-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Privacy
            </a>
          </nav>

          {/* Zone 3: Top-Right Login Button */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenLogin}
              className="min-h-[40px] px-4 sm:px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Split Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-16 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left: Proposition & Primary Action */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-semibold text-blue-700 tracking-wide">
                  Verified Global Live Chat
                </p>
                <h1
                  className="font-bold tracking-tight text-slate-900 leading-[1.1] max-w-xl"
                  style={{
                    fontSize: 'clamp(2.2rem, 4vw, 3.35rem)',
                    textWrap: 'balance',
                  }}
                >
                  Connect and chat live with people anywhere.
                </h1>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  Verify your mobile number in seconds and enter a clean live directory. Message instantly, send voice notes, and share photos without exposing your phone number.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="min-h-[48px] px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>Login with Mobile</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
                <a
                  href="#how-it-works"
                  className="min-h-[48px] px-5 py-3 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-slate-700 text-sm font-semibold transition-colors flex items-center justify-center whitespace-nowrap shrink-0"
                >
                  How it works
                </a>
              </div>

              {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500 pt-1">
                <span>6-digit OTP verification</span>
                <span aria-hidden="true">·</span>
                <span>Private mobile numbers</span>
                <span aria-hidden="true">·</span>
                <span>Voice notes &amp; media</span>
              </div>
            </div>

            {/* Right: Interactive Live Chat Preview */}
            <div className="lg:col-span-6">
              <div className="bg-white border border-blue-200 rounded-3xl shadow-sm overflow-hidden">
                {/* Preview Switcher Header */}
                <div className="px-4 sm:px-5 py-3.5 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Active Directory Preview
                  </span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue-100">
                    {previewPeers.map((peer) => {
                      const isActive = peer.id === activePeer.id;
                      return (
                        <button
                          key={peer.id}
                          type="button"
                          onClick={() => setActivePeerId(peer.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {peer.name.split(' ')[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Peer Header */}
                <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      preset={activePeer.avatarPreset}
                      name={activePeer.name}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {activePeer.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {activePeer.role} · {activePeer.locationSpot}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="min-h-[34px] px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                  >
                    Open Chat
                  </button>
                </div>

                {/* Preview Chat Messages */}
                <div className="p-4 sm:p-5 space-y-3.5 bg-white">
                  <div className="flex flex-col items-start">
                    <div className="px-4 py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs sm:text-sm text-slate-800 max-w-[85%] leading-relaxed">
                      {activeThread.incoming}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono-tabular mt-1 px-1">
                      {activeThread.incomingTime}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="px-4 py-2.5 rounded-2xl bg-blue-600 text-white text-xs sm:text-sm max-w-[85%] leading-relaxed">
                      {activeThread.outgoing}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono-tabular mt-1 px-1">
                      <span>{activeThread.outgoingTime}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                  </div>

                  {/* Preview Composer Prompting Login */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 text-left text-xs sm:text-sm text-slate-500 transition-colors cursor-pointer truncate"
                    >
                      Verify mobile to message {activePeer.name.split(' ')[0]}...
                    </button>
                    <button
                      type="button"
                      onClick={onOpenLogin}
                      aria-label="Login to send message"
                      className="min-h-[42px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Login</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Core Capabilities Asymmetric Bento Grid */}
        <section
          id="features"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-blue-200/70"
        >
          <div className="max-w-2xl mb-8 sm:mb-10 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Built for clear, fast web conversations
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Everything you need to discover active members and start messaging right from your browser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <div className="md:col-span-2 bg-white border border-blue-200 rounded-2xl p-6 sm:p-7 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  01. Instant Messaging, Photos &amp; Voice Notes
                </h3>
                <div className="flex items-center gap-2 text-blue-600 shrink-0">
                  <MessageSquare className="w-4 h-4" />
                  <Mic className="w-4 h-4" />
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Send real-time text messages, emoji reactions, compressed photo attachments, and quick browser voice notes with live typing indicators and read receipts.
              </p>
            </div>

            <div className="bg-white border border-blue-200 rounded-2xl p-6 sm:p-7 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  02. OTP Verification
                </h3>
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sign in with your country code and 6-digit verification code. The live chat workspace opens automatically as soon as your code is verified.
              </p>
            </div>

            <div className="bg-white border border-blue-200 rounded-2xl p-6 sm:p-7 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  03. Global Directory
                </h3>
                <Users className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Every verified member currently active on the platform is visible across cities without artificial distance limits.
              </p>
            </div>

            <div className="md:col-span-2 bg-white border border-blue-200 rounded-2xl p-6 sm:p-7 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  04. One-Click QR Codes &amp; Shareable Invite Links
                </h3>
                <QrCode className="w-4 h-4 text-blue-600 shrink-0" />
              </div>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                Invite colleagues or friends via WhatsApp or scannable QR code so they can verify their number and join your live conversation in seconds.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-blue-200/70"
        >
          <div className="bg-white border border-blue-200 rounded-3xl p-6 sm:p-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Start chatting in three quick steps
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  No lengthy registration forms or passwords to remember.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
              >
                <span>Verify &amp; Open Chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
              <div className="space-y-1.5 pt-2">
                <p className="text-xs font-mono-tabular font-bold text-blue-700">
                  01
                </p>
                <h3 className="text-base font-bold text-slate-900">
                  Tap Login at Top Right
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Select your country code and enter your mobile number along with your display name.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="text-xs font-mono-tabular font-bold text-blue-700">
                  02
                </p>
                <h3 className="text-base font-bold text-slate-900">
                  Enter 6-Digit Verification Code
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Type or auto-fill the 6-digit code in the WhatsApp-style verification boxes.
                </p>
              </div>

              <div className="space-y-1.5 pt-2">
                <p className="text-xs font-mono-tabular font-bold text-blue-700">
                  03
                </p>
                <h3 className="text-base font-bold text-slate-900">
                  Live Chat Opens Instantly
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Customize your profile avatar or photo, search online users, and start messaging right away.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section
          id="privacy"
          className="max-w-6xl mx-auto px-4 sm:px-6 pb-14"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-2xl bg-white border border-blue-200">
            <div className="flex items-start gap-3.5 max-w-2xl">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-slate-900">
                  Your mobile number stays private
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Phone numbers are used only for login verification and account continuity. Public profile cards only display your chosen name, role, status, and city. You can block users, clear chats, or switch numbers anytime.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-blue-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span>NearChat</span>
            <span aria-hidden="true">·</span>
            <span className="font-normal text-slate-500">
              Verified Web Messaging
            </span>
          </div>
          <div className="flex items-center gap-6">
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
