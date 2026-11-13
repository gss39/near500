import React, { useState } from 'react';
import {
  ArrowRight,
  LogIn,
  MessageSquare,
  Phone,
  Users,
} from 'lucide-react';
import { COMMUNITY_STARTER_PEERS } from '../data/nearbyUsers';
import { UserAvatar } from './UserAvatar';
import guyChattingImg from '../assets/images/nearchat_guy_chatting_1794546655259.jpg';
import girlChattingImg from '../assets/images/nearchat_girl_chatting_1794546655268.jpg';

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
        {/* PRIVACY & CLOSING CONVERSION BANNER */}
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
