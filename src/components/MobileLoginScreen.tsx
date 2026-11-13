import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  User,
  Lock,
  Sparkles,
  X,
} from 'lucide-react';

interface CountryOption {
  code: string;
  flag: string;
  label: string;
  minDigits: number;
  maxDigits: number;
}

const COUNTRY_OPTIONS: CountryOption[] = [
  { code: '+91', flag: '🇮🇳', label: 'India (+91)', minDigits: 10, maxDigits: 10 },
  { code: '+1', flag: '🇺🇸', label: 'US / Canada (+1)', minDigits: 10, maxDigits: 10 },
  { code: '+44', flag: '🇬🇧', label: 'UK (+44)', minDigits: 10, maxDigits: 11 },
  { code: '+971', flag: '🇦🇪', label: 'UAE (+971)', minDigits: 9, maxDigits: 9 },
  { code: '+92', flag: '🇵🇰', label: 'Pakistan (+92)', minDigits: 10, maxDigits: 10 },
  { code: '+880', flag: '🇧🇩', label: 'Bangladesh (+880)', minDigits: 10, maxDigits: 10 },
  { code: '+65', flag: '🇸🇬', label: 'Singapore (+65)', minDigits: 8, maxDigits: 8 },
  { code: '+61', flag: '🇦🇺', label: 'Australia (+61)', minDigits: 9, maxDigits: 9 },
  { code: '+49', flag: '🇩🇪', label: 'Germany (+49)', minDigits: 10, maxDigits: 12 },
];

export interface PhoneVerificationResult {
  phoneNumber: string;
  displayName?: string;
  existingProfile?: {
    name?: string;
    role?: string;
    bio?: string;
    locationSpot?: string;
    statusTag?: string;
    photoUrl?: string;
    avatarPreset?: string;
  } | null;
}

interface MobileLoginScreenProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  accountIdForPhone: (fullPhone: string) => string;
  onVerified: (result: PhoneVerificationResult) => void;
}

export const MobileLoginScreen: React.FC<MobileLoginScreenProps> = ({
  isOpen,
  onClose,
  defaultName = '',
  accountIdForPhone,
  onVerified,
}) => {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneInput, setPhoneInput] = useState('');
  const [displayName, setDisplayName] = useState(() =>
    defaultName && !defaultName.startsWith('User ') ? defaultName : ''
  );

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [expectedOtp, setExpectedOtp] = useState<string>('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  const selectedCountry =
    COUNTRY_OPTIONS.find((c) => c.code === countryCode) || COUNTRY_OPTIONS[0];
  const cleanDigits = phoneInput.replace(/\D/g, '');
  const fullPhoneNumber = `${countryCode} ${cleanDigits}`;
  const normalizedPhoneKey = `${countryCode}${cleanDigits}`;

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      if (verifiedSuccess) {
        setVerifiedSuccess(false);
        setStep('phone');
        setOtpDigits(['', '', '', '', '', '']);
        setExpectedOtp('');
      }
    }
  }, [isOpen, verifiedSuccess]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const generateAndSendOtp = async () => {
    setErrorMsg(null);
    if (
      cleanDigits.length < selectedCountry.minDigits ||
      cleanDigits.length > selectedCountry.maxDigits
    ) {
      setErrorMsg(
        selectedCountry.minDigits === selectedCountry.maxDigits
          ? `Please enter a valid ${selectedCountry.minDigits}-digit mobile number.`
          : `Please enter a valid ${selectedCountry.minDigits}–${selectedCountry.maxDigits} digit mobile number.`
      );
      return;
    }

    setIsSubmitting(true);
    let generatedCode = String(Math.floor(100000 + Math.random() * 900000));

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhoneKey }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data?.verificationCode) {
          generatedCode = String(data.verificationCode);
        }
      }
    } catch {
      // Static hosting fallback (GitHub Pages / offline) uses locally generated 6-digit OTP
    } finally {
      setIsSubmitting(false);
    }

    setExpectedOtp(generatedCode);
    setOtpDigits(['', '', '', '', '', '']);
    setResendSeconds(30);
    setStep('otp');

    setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 80);
  };

  const handlePhoneFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateAndSendOtp();
  };

  const verifyOtpCode = async (codeToCheck: string) => {
    if (isVerifying || verifiedSuccess) return;
    if (codeToCheck.length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    const accountId = accountIdForPhone(normalizedPhoneKey);
    let serverVerified = false;
    let existingProfile: PhoneVerificationResult['existingProfile'] = null;

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizedPhoneKey,
          code: codeToCheck,
          accountId,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (res.ok && data?.verified) {
          serverVerified = true;
          existingProfile = data.existingProfile || null;
        } else if (res.status === 400 && data?.error) {
          setErrorMsg(data.error);
          setIsVerifying(false);
          return;
        }
      }
    } catch {
      // Static hosting fallback
    }

    if (!serverVerified) {
      if (codeToCheck !== expectedOtp) {
        setErrorMsg('Incorrect verification code. Please check and try again.');
        setIsVerifying(false);
        return;
      }
    }

    setVerifiedSuccess(true);
    setIsVerifying(false);

    setTimeout(() => {
      onVerified({
        phoneNumber: fullPhoneNumber,
        displayName: displayName.trim() || undefined,
        existingProfile,
      });
    }, 350);
  };

  const handleOtpDigitChange = (index: number, rawVal: string) => {
    const cleaned = rawVal.replace(/\D/g, '');
    setErrorMsg(null);

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split('');
      const next = ['', '', '', '', '', ''];
      pasted.forEach((d, idx) => {
        next[idx] = d;
      });
      setOtpDigits(next);
      const focusIdx = Math.min(5, pasted.length);
      otpRefs.current[focusIdx]?.focus();
      if (pasted.length === 6) {
        verifyOtpCode(next.join(''));
      }
      return;
    }

    const next = [...otpDigits];
    next[index] = cleaned;
    setOtpDigits(next);

    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    const joined = next.join('');
    if (joined.length === 6) {
      verifyOtpCode(joined);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const next = [...otpDigits];
      next[index - 1] = '';
      setOtpDigits(next);
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleAutoFillOtp = () => {
    if (!expectedOtp || expectedOtp.length !== 6) return;
    const digits = expectedOtp.split('');
    setOtpDigits(digits);
    setErrorMsg(null);
    verifyOtpCode(expectedOtp);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-login-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white border border-blue-200 rounded-t-3xl sm:rounded-3xl shadow-xl overflow-hidden max-h-[94dvh] overflow-y-auto"
      >
        {/* Top Brand Bar */}
        <div className="relative px-5 sm:px-6 pt-6 pb-5 bg-blue-50/80 border-b border-blue-100 text-center space-y-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login modal"
            className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-800 hover:bg-white/80 flex items-center justify-center absolute top-3.5 right-3.5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-bold shadow-sm mx-auto">
            N
          </div>
          <div>
            <h2
              id="mobile-login-title"
              className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight"
            >
              {step === 'phone'
                ? 'Verify your mobile number'
                : 'Enter verification code'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {step === 'phone'
                ? 'Quick WhatsApp-style verification to enter live chat.'
                : `We generated a 6-digit code for ${fullPhoneNumber}`}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4">
          {step === 'phone' ? (
            <form onSubmit={handlePhoneFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => {
                    setCountryCode(e.target.value);
                    setErrorMsg(null);
                  }}
                  aria-label="Country code"
                  className="w-full min-h-[46px] px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Number
                </label>
                <div className="flex items-center gap-2">
                  <div className="min-h-[46px] px-3.5 rounded-xl bg-blue-50 border border-blue-200 text-sm font-bold text-blue-800 flex items-center justify-center shrink-0 font-mono-tabular">
                    {countryCode}
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      required
                      autoFocus
                      value={phoneInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d\s-]/g, '');
                        setPhoneInput(val);
                        setErrorMsg(null);
                      }}
                      placeholder="98765 43210"
                      className="w-full min-h-[46px] pl-10 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-base sm:text-sm font-mono-tabular text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Your Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter name shown in chat"
                    maxLength={40}
                    className="w-full min-h-[44px] pl-10 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span>{isSubmitting ? 'Sending Code...' : 'Send Verification Code'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 pt-1 text-center">
                <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Your mobile number stays private and is never shared publicly.</span>
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Instant Verification Code Banner */}
              <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-blue-900">
                      Instant Verification Code
                    </p>
                    <p className="text-sm font-bold text-blue-700 font-mono-tabular tracking-widest">
                      {expectedOtp}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillOtp}
                  className="min-h-[34px] px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
                >
                  Auto-Fill
                </button>
              </div>

              {/* 6-Digit WhatsApp-style OTP Boxes */}
              <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                    maxLength={6}
                    value={digit}
                    aria-label={`OTP digit ${idx + 1}`}
                    onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono-tabular rounded-xl border transition-all focus:outline-none ${
                      verifiedSuccess
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : digit
                        ? 'bg-blue-50/60 border-blue-600 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                ))}
              </div>

              {errorMsg && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center">
                  {errorMsg}
                </p>
              )}

              {verifiedSuccess ? (
                <div className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified! Opening Chat...</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isVerifying || otpDigits.join('').length < 6}
                  onClick={() => verifyOtpCode(otpDigits.join(''))}
                  className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isVerifying ? 'Verifying...' : 'Verify & Open Chat'}</span>
                </button>
              )}

              <div className="flex items-center justify-between pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setErrorMsg(null);
                    setVerifiedSuccess(false);
                  }}
                  className="text-slate-600 hover:text-blue-700 font-semibold cursor-pointer"
                >
                  Wrong number?
                </button>

                <button
                  type="button"
                  disabled={resendSeconds > 0 || isSubmitting}
                  onClick={generateAndSendOtp}
                  className={`font-semibold flex items-center gap-1 ${
                    resendSeconds > 0
                      ? 'text-slate-400 cursor-not-allowed'
                      : 'text-blue-700 hover:underline cursor-pointer'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {resendSeconds > 0
                      ? `Resend in ${resendSeconds}s`
                      : 'Resend Code'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
