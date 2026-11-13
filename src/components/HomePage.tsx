import React, { useState } from 'react';
import {
  ArrowRight,
  Lock,
  LogIn,
  MessageSquare,
  Mic,
  Phone,
  QrCode,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { COMMUNITY_STARTER_PEERS } from '../data/nearbyUsers';
import { UserAvatar } from './UserAvatar';
import guyChattingImg from '../assets/images/nearchat_guy_chatting_1794546655259.jpg';
import girlChattingImg from '../assets/images/nearchat_girl_chatting_1794546655268.jpg';
import mobileDeskImg from '../assets/images/nearchat_mobile_desk_1794545983386.jpg';

interface HomePageProps {
  onOpenLogin: () => void;
}

const AmberDotGrid: React.FC<{ cols: number; rows: number; className?: string }> = ({
  cols,
  rows,
  className = '',
}) => {
  const dots = Array.from({ length: cols * rows });
  return (
    <div
      aria-hidden="true"
      className={`grid gap-2.5 pointer-events-none ${className}`}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {dots.map((_, idx) => (
        <span key={idx} className="w-1.5 h-1.5 rounded-full bg-[#FBBF24]" />
      ))}
    </div>
  );
};

export const HomePage: React.FC<HomePageProps> = ({ onOpenLogin }) => {
  const previewPeers = COMMUNITY_STARTER_PEERS.slice(0, 2);

  const [guyImgFailed, setGuyImgFailed] = useState(false);
  const [girlImgFailed, setGirlImgFailed] = useState(false);
  const [deskImgFailed, setDeskImgFailed] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-white text-slate-900 flex flex-col">
      {/* HERO + INTEGRATED HEADER IN VIBRANT ELECTRIC BLUE (#1161FF) */}
      <div id="top" className="bg-[#1161FF] text-white overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="max-w-6xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-6">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#top"
            className="text-xl sm:text-2xl font-display tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <span className="font-extrabold">near</span>
            <span className="font-normal text-white/90">chat</span>
          </a>

          {/* Zone 2 & 3: Nav Links + Right-Side Login CTA */}
          <div className="flex items-center gap-6 sm:gap-8">
            <nav
              aria-label="Primary navigation"
              className="hidden md:flex items-center gap-7 text-sm font-medium text-white/90"
            >
              <a
                href="#features"
                className="hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                How it Works
              </a>
              <a
                href="#privacy"
                className="hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Privacy
              </a>
            </nav>

            <button
              type="button"
              onClick={onOpenLogin}
              className="min-h-[42px] px-5 sm:px-6 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Login</span>
            </button>
          </div>
        </header>

        {/* Hero Split */}
        <section className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-16 sm:pt-12 sm:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Left Side: Unique Headline + Single Primary Login CTA */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-4">
                <h1
                  className="font-display font-bold tracking-tight text-white leading-[1.04]"
                  style={{
                    fontSize: 'clamp(2.75rem, 5.2vw, 4.4rem)',
                    textWrap: 'balance',
                  }}
                >
                  Real Talk,
                  <br />
                  Zero Limits.
                </h1>
                <p className="text-base sm:text-lg text-blue-100 leading-relaxed max-w-md">
                  Message anyone online in seconds — fast, private &amp; unlimited global chat right from your browser.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3.5 pt-2">
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="min-h-[48px] px-7 py-3 rounded-full bg-white hover:bg-blue-50 text-[#1161FF] text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>Login with Mobile</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>

              <p className="text-xs text-blue-100/85 pt-1">
                6-digit mobile OTP verification · Private phone numbers · No app install
              </p>
            </div>

            {/* Right Side: Guy on One Side & Girl on the Other Side Chatting */}
            <div className="lg:col-span-7">
              <div className="relative max-w-[560px] mx-auto lg:ml-auto lg:mr-0 pt-4 pb-6 sm:pt-6 sm:pb-8">
                <div className="grid grid-cols-12 gap-4 sm:gap-6 items-start">
                  {/* Left Portrait Column: Guy Chatting */}
                  <div className="col-span-6 relative">
                    <AmberDotGrid
                      cols={7}
                      rows={7}
                      className="absolute -top-5 -left-4 sm:-top-6 sm:-left-6 opacity-95"
                    />

                    <div className="relative z-10 aspect-[3/4] w-full rounded-md overflow-hidden bg-blue-800 shadow-xl">
                      {!guyImgFailed ? (
                        <img
                          src={guyChattingImg}
                          alt="Young man smiling while texting on his phone"
                          referrerPolicy="no-referrer"
                          onError={() => setGuyImgFailed(true)}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full bg-blue-700 flex items-center justify-center">
                          <MessageSquare className="w-12 h-12 text-white/60" />
                        </div>
                      )}
                    </div>

                    {/* Guy's Outgoing Bubble */}
                    <div className="relative z-20 mt-4 flex items-center gap-2.5 justify-end pr-1">
                      <div className="px-4 py-2 rounded-full bg-[#EA960A] text-white text-xs sm:text-sm font-semibold shadow-md whitespace-nowrap">
                        Hey! Free to chat?
                      </div>
                      <div className="ring-2 ring-white/80 rounded-full shrink-0">
                        <UserAvatar
                          preset={previewPeers[0].avatarPreset}
                          name={previewPeers[0].name}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Portrait Column: Girl Chatting */}
                  <div className="col-span-6 space-y-4 sm:space-y-5 pt-6 sm:pt-12 relative">
                    {/* Girl's Incoming Reply Bubble */}
                    <div className="relative z-20 space-y-2.5 -ml-2 sm:-ml-4">
                      <div className="flex items-center gap-2">
                        <div className="ring-2 ring-white/80 rounded-full shrink-0">
                          <UserAvatar
                            preset={previewPeers[1].avatarPreset}
                            name={previewPeers[1].name}
                            size="sm"
                          />
                        </div>
                        <div className="px-3.5 py-2 rounded-full bg-[#EA960A] text-white text-[11px] sm:text-xs font-semibold shadow-md whitespace-nowrap">
                          Yes! I&apos;m live now
                        </div>
                      </div>

                      {/* Subtle Typing Bubble */}
                      <div className="ml-10 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/18 backdrop-blur-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                      </div>
                    </div>

                    <div className="relative">
                      <AmberDotGrid
                        cols={6}
                        rows={7}
                        className="absolute -top-6 -left-6 sm:-left-8 opacity-95"
                      />
                      <div className="relative z-10 aspect-[3/4] w-full rounded-md overflow-hidden bg-blue-800 shadow-xl">
                        {!girlImgFailed ? (
                          <img
                            src={girlChattingImg}
                            alt="Smiling young woman reading and replying to messages on her phone"
                            referrerPolicy="no-referrer"
                            onError={() => setGirlImgFailed(true)}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <div className="w-full h-full bg-blue-700 flex items-center justify-center">
                            <Users className="w-10 h-10 text-white/60" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <main className="flex-1">
        {/* 2. FEATURES BENTO SECTION */}
        <section id="features" className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-20">
          <div className="max-w-2xl mb-10 space-y-2">
            <p className="text-xs font-bold text-[#1161FF] tracking-wide">
              Core Capabilities
            </p>
            <h2 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-slate-950">
              Everything you need for fast web conversations
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Built cleanly for mobile and desktop browsers with WhatsApp-style verification and zero clutter.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Feature 01 */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl overflow-hidden flex flex-col">
              <div className="h-56 sm:h-64 bg-slate-100 overflow-hidden">
                {!deskImgFailed ? (
                  <img
                    src={mobileDeskImg}
                    alt="Smartphone and headphones on a minimalist desk"
                    referrerPolicy="no-referrer"
                    onError={() => setDeskImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-50 flex items-center justify-center">
                    <Mic className="w-10 h-10 text-[#1161FF]" />
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-7 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    01. Real-Time Messaging, Photos &amp; Voice Notes
                  </h3>
                  <div className="flex items-center gap-2 text-[#1161FF] shrink-0">
                    <MessageSquare className="w-4 h-4" />
                    <Mic className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Share instant replies, compressed photos, emoji reactions, and browser voice notes with live typing status and read receipts.
                </p>
              </div>
            </div>

            {/* Feature 02 */}
            <div className="md:col-span-5 bg-[#F5F8FF] border border-blue-200 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    02. 6-Digit Mobile OTP Login
                  </h3>
                  <ShieldCheck className="w-5 h-5 text-[#1161FF] shrink-0" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Select your country code, verify the 6-digit code just like WhatsApp, and open the chat room automatically.
                </p>
              </div>

              <div className="bg-white border border-blue-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">Verification Code</span>
                  <span className="font-mono-tabular text-[#1161FF] font-semibold">Verified</span>
                </div>
                <div className="grid grid-cols-6 gap-1.5" aria-hidden="true">
                  {['4', '8', '2', '9', '1', '6'].map((num, i) => (
                    <div
                      key={i}
                      className="h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-mono-tabular font-bold text-sm text-[#1161FF]"
                    >
                      {num}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 03 */}
            <div className="md:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    03. Private Mobile Numbers
                  </h3>
                  <Lock className="w-5 h-5 text-[#1161FF] shrink-0" />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Your phone number verifies your identity and keeps your account linked—it is never exposed on public member cards.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Shown on profile</span>
                  <span className="font-semibold text-slate-950">Name, Role &amp; City</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-slate-700">
                  <span>Mobile number</span>
                  <span className="font-semibold text-[#1161FF]">Strictly Private</span>
                </div>
              </div>
            </div>

            {/* Feature 04 */}
            <div className="md:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    04. Global Live Directory &amp; One-Click QR Invites
                  </h3>
                  <div className="flex items-center gap-2 text-[#1161FF] shrink-0">
                    <Users className="w-4 h-4" />
                    <QrCode className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                  Every online member is visible worldwide with zero distance limits. Share a WhatsApp link or scannable QR code so friends and teammates can verify and join in seconds.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="min-h-[42px] px-5 py-2 rounded-full bg-blue-50 hover:bg-blue-100 text-[#1161FF] text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Join Directory Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 3. HOW IT WORKS */}
        <section
          id="how-it-works"
          className="bg-[#F5F8FF] border-y border-slate-200 py-14 sm:py-16"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2 max-w-xl">
                <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950">
                  Start chatting in three simple steps
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  No passwords to remember—verify your mobile number once and jump right in.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenLogin}
                className="min-h-[44px] px-6 py-2.5 rounded-full bg-[#1161FF] hover:bg-blue-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Verify &amp; Open Chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white border border-blue-100 space-y-2">
                <p className="text-xs font-mono-tabular font-bold text-[#1161FF]">01</p>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Tap Login at Top Right
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Select your country dial code, enter your mobile number, and add your chat name.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-blue-100 space-y-2">
                <p className="text-xs font-mono-tabular font-bold text-[#1161FF]">02</p>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Verify 6-Digit Code
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Type or auto-fill the 6-digit verification code inside the OTP boxes.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-blue-100 space-y-2">
                <p className="text-xs font-mono-tabular font-bold text-[#1161FF]">03</p>
                <h3 className="font-display text-base font-bold text-slate-950">
                  Open Live Chat Instantly
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Browse active users across cities, upload your photo, and start messaging right away.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. PRIVACY & CLOSING CONVERSION BANNER */}
        <section id="privacy" className="max-w-6xl mx-auto px-4 sm:px-8 py-14 sm:py-16">
          <div className="rounded-3xl bg-[#1161FF] text-white p-7 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                Ready to start talking live?
              </h2>
              <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                Verify your mobile number in seconds. Your phone number stays completely private, and you remain in full control to block users, clear chats, or log out anytime.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenLogin}
              className="min-h-[48px] px-7 py-3 rounded-full bg-white hover:bg-blue-50 text-[#1161FF] text-sm font-bold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Phone className="w-4 h-4 shrink-0" />
              <span>Login with Mobile</span>
            </button>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="font-display font-bold text-slate-900">nearchat</span>
            <span aria-hidden="true">·</span>
            <span className="font-normal text-slate-500">
              Private Mobile-Verified Web Chat
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
              How it Works
            </a>
            <a href="#privacy" className="hover:text-slate-900 transition-colors">
              Privacy
            </a>
            <button
              type="button"
              onClick={onOpenLogin}
              className="text-[#1161FF] font-semibold hover:underline cursor-pointer"
            >
              Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
