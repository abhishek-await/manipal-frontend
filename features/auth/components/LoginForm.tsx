// features/auth/components/LoginForm.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authApi, methodType } from "../api/auth.api";
import { API_BASE_URL } from "../api/auth.api";

export type Step = "mobile" | "otp";

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("mobile");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<methodType>("SMS");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(29);
  const [googleLoading, setGoogleLoading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    return () => stopTimer();
  }, []);

  useEffect(() => {
    if (step !== "otp") return;
    startTimer(29);
    return () => stopTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  const startTimer = (initial = 29) => {
    stopTimer();
    setTimeLeft(initial);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const cleanDigits = (s: string) => (s ?? "").replace(/\D/g, "");
  const normalizedPhone = (() => {
    const digits = cleanDigits(phone);
    return digits.length > 10 ? digits.slice(-10) : digits;
  })();
  const isPhoneValid = normalizedPhone.length === 10;
  const isOtpComplete = otp.join("").length === 4;

  const handleSendOTP = async (phoneArg?: string, methodArg?: methodType) => {
    const raw = phoneArg ?? phone;
    const digits = cleanDigits(raw);
    const normalized = digits.length > 10 ? digits.slice(-10) : digits;

    if (normalized.length === 10) {
      try {
        // if your backend expects +91 prefix, add it here: `+91${normalized}`
        const response = await authApi.sendOTP(normalized, methodArg ?? method);
        console.log("Response from handleSendOTP: ", response);
        setPhone(normalized); // keep normalized number in input
        setStep("otp");
        startTimer(29);
      } catch (error) {
        console.error("Error while sending otp", error);
      }
    } else {
      console.warn("Phone not valid for sending OTP:", raw, "=>", digits);
    }
  };

  const handleResendOTP = async () => {
    if (timeLeft === 0) {
      setOtp(["", "", "", ""]);
      otpRefs.current[0]?.focus();
      try {
        const response = await authApi.sendOTP(normalizedPhone, method);
        console.log(response?.message ?? "resent");
        setStep("otp");
        startTimer(29);
      } catch (error) {
        console.error("Error while resending otp", error);
      }
    }
  };

  const handleOtpChange = (value: string, idx: number) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[idx] = value;
    setOtp(next);
    if (value && idx < 3) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (otpArray?: string[]) => {
    const currentOtp = otpArray ?? otp;
    if (currentOtp.join("").length !== 4) return;
    try {
      const response = await authApi.verifyOTP(normalizedPhone, currentOtp);
      console.log("Response from handleOtpSubmit: ", response);
      if (!response.user_exists) {
        setStep("mobile");
      } else {
        if (response.profile_complete) {
          await authApi.clearTokens();
          const access = response.tokens.access
          const refresh = response.tokens.refresh
          await fetch('/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access, refresh }),
          })
          // authApi.saveTokens(response.tokens.access, response.tokens.refresh);
          router.push("/home");
        } else {
          router.push(`/signup?token=${encodeURIComponent(response.verification_id)}`);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      router.push(`${API_BASE_URL}/accounts/google/login`);
    } finally {
      setGoogleLoading(false);
    }
  };

  // layout note: using svh helps mobile browsers handle the virtual keyboard.
  // style uses inline fallback for safe-area-inset bottom.
  const containerStyle: React.CSSProperties = {
    paddingBottom: "env(safe-area-inset-bottom, 16px)",
  };

  if (step === "otp") {
    return (
      <div
        className="min-h-[100svh] flex flex-col items-center bg-white px-4 pt-8 pb-6"
        style={containerStyle}
      >
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-teal-400 flex items-center justify-center mb-4">
              <Image src="/dots-icon.svg" alt="dots-icon" width={44} height={44} />
            </div>

            <h1 className="text-xl font-semibold text-[#0F141A] mb-2">Enter OTP</h1>

            <div className="flex items-center gap-1 mb-6 text-center text-sm text-[#4F5F6D]">
              <span>Otp sent to</span>
              <span className="font-semibold">+91 {normalizedPhone}</span>
              <button
                type="button"
                onClick={() => setStep("mobile")}
                className="ml-2 inline-flex items-center"
                aria-label="Edit phone"
              >
                <Image src="/Union.svg" alt="Edit" width={16} height={16} />
              </button>
            </div>

            <div className="flex gap-3 mb-6 justify-center">
              {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => { otpRefs.current[idx] = el; }} // <- fixed: block body, returns void
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(e.target.value, idx)}
                onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                className="w-12 sm:w-14 h-12 sm:h-14 border-2 border-gray-300 rounded-lg
                          text-center text-2xl font-semibold focus:border-teal-400 focus:outline-none transition-colors"
              />
            ))}
            </div>

            <div className="flex items-center gap-2 mb-6 text-black font-bold">
              <Image src="/clock-icon.svg" alt="clock" width={20} height={20} />
              <span className="text-base">00:{timeLeft.toString().padStart(2, "0")}</span>
            </div>

            <div className="flex items-center gap-2 mb-8 text-sm text-[#4F5F6D]">
              <span>Didn't receive OTP?</span>
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={timeLeft > 0}
                className="text-sm font-medium text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed hover:underline"
              >
                Resend OTP
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOtpSubmit(otp)}
              disabled={!isOtpComplete}
              className={`w-full h-14 rounded-lg text-lg font-medium mb-2 transition ${
                isOtpComplete
                  ? "bg-gradient-to-r from-blue-900 to-teal-400 text-white"
                  : "bg-[#D2D5DB] text-[#686969]"
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MOBILE STEP
  return (
    <div
      className="min-h-[100svh] flex flex-col items-center bg-white px-4 pt-8 pb-6"
      style={containerStyle}
    >
      <div className="w-full max-w-md">
        <div className="mb-8">
          <p className="text-lg text-blue-900">Welcome to,</p>
          <p className="mt-1 text-2xl font-semibold text-blue-900">Manipal Community Connect</p>
        </div>

        <div className="mb-6">
          <label htmlFor="phone" className="block text-base font-medium text-gray-800 mb-2">
            Mobile Number
          </label>
          <div className="flex h-14 border-2 border-teal-400 rounded-lg overflow-hidden">
            <div className="flex items-center justify-center px-4 bg-white border-r-2 border-teal-400 text-base font-medium">
              <span className="mr-1">🇮🇳</span>+91
            </div>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9988667755"
              maxLength={14}
              autoComplete="tel"
              className="flex-1 px-4 text-lg font-medium focus:outline-none"
              aria-label="Mobile number"
            />
          </div>
        </div>

        <div className="mb-8">
          <p className="text-base font-medium text-[#333333] mb-2">Send OTP via</p>
          <div className="flex gap-4">
            {(["SMS", "Whatsapp"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 h-10 rounded-lg text-sm font-medium ${
                  method === m ? "border-2 border-blue-900 text-blue-900" : "border border-gray-300 text-gray-700"
                } bg-white transition`}
                aria-pressed={method === m}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSendOTP()}
          disabled={!isPhoneValid}
          className={`w-full h-14 rounded-lg text-lg font-medium mb-4 transition ${
            isPhoneValid ? "bg-gradient-to-r from-blue-900 to-teal-400 text-white" : "bg-[#D2D5DB] text-[#686969]"
          }`}
        >
          Sign Up with OTP
        </button>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="w-full h-14 rounded-lg border border-[#034EA1] text-[#333333] bg-white flex items-center justify-center gap-3 mb-6 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="Continue with Google"
        >
          <Image src="/google-icon.svg" alt="Google" width={32} height={32} priority />
          <span className="text-[16px] font-medium leading-[26px]">{googleLoading ? "Connecting…" : "Continue with Google"}</span>
        </button>

        <p className="text-base font-medium text-gray-800 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-900 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
