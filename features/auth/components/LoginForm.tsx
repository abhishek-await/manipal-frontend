'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { authApi, methodType } from '../api/auth.api'

export type Step = 'mobile' | 'otp'

export default function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('mobile')
  const [phone, setPhone] = useState('')
  const [method, setMethod] = useState<methodType>('SMS')
  const [otp, setOtp] = useState(['', '', '', ''])
  const [timeLeft, setTimeLeft] = useState(29)
  const [googleLoading, setGoogleLoading] = useState(false)

  // store interval id so we can clear it reliably
  const timerRef = useRef<number | null>(null)

  const stopTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startTimer = (initial = 29) => {
    // ensure there's no existing interval
    stopTimer()
    setTimeLeft(initial)
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // stop when it reaches 0
          stopTimer()
          return 0
        }
        return t - 1
      })
    }, 1000)
  }

  // start countdown when entering OTP step (first time)
  useEffect(() => {
    if (step !== 'otp') return

    // start timer when we land on otp step
    startTimer(29)

    // cleanup when leaving/unmounting
    return () => stopTimer()
    // keep dependency just on step — we use startTimer directly for resend
  }, [step])

  // If you want to cleanup on unmount explicitly as well
  useEffect(() => {
    return () => stopTimer()
  }, [])

  const handleSendOTP = async (phoneArg?: string, methodArg?: methodType) => {
    const targetPhone = phoneArg ?? phone
    const targetMethod = methodArg ?? method
    if (targetPhone.length === 10) {
      try {
        const response = await authApi.sendOTP(targetPhone, targetMethod)
        console.log('Response from handleSendOTP: ', response )
        console.log(response.message)
        setStep('otp')
        // start timer immediately on send (defensive, in case step is already 'otp')
        startTimer(29)
      } catch (error) {
        console.error('Error while sending otp', error)
      }
    }
  }

  const handleResendOTP = async () => {
    // only allow resend after timer finished
    if (timeLeft === 0) {
      setOtp(['', '', '', '']) // clear inputs
      try {
        const response = await authApi.sendOTP(phone, method)
        console.log(response.message)
        setStep('otp') // keep UI in otp step
        // restart timer explicitly (useful when step already 'otp')
        startTimer(29)
      } catch (error) {
        console.error('Error while sending otp', error)
      }
    }
  }

  const handleOtpChange = (value: string, idx: number) => {
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[idx] = value
    setOtp(next)

    // auto-focus
    if (value && idx < 3) {
      const el = document.getElementById(`otp-${idx + 1}`)
      el?.focus()
    }
  }

  const handleOtpKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    idx: number
  ) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      const el = document.getElementById(`otp-${idx - 1}`)
      el?.focus()
    }
  }

  const handleOtpSubmit = async (otpArray?: string[]) => {
    const currentOtp = otpArray ?? otp
    try {
      const response = await authApi.verifyOTP(phone, currentOtp)
      console.log('Response from handleOtpSubmit: ', response )
      if (!response.user_exists) {
        setStep('mobile')
      } else {
        if (response.profile_complete) {
          localStorage.setItem('access_token', response.tokens.access)
          localStorage.setItem('refresh_token', response.tokens.refresh)
          router.push('/home')
        } else {
          router.push(`/signup?token=${encodeURIComponent(response.verification_id)}`)
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      console.log('Google Sign-In clicked')
    } finally {
      setGoogleLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex flex-col items-center bg-white px-6 pt-8 pb-6">

        {/* 3-dots icon in teal circle */}
        <div className="w-12 h-12 rounded-full bg-teal-400 flex items-center justify-center mb-4">
          <Image src="./dots-icon.svg" alt="dots-icon" width={44} height={44} />
        </div>

        {/* Title */}
        <h1 className="text-xl font-semibold text-[#0F141A] mb-2">
          Enter OTP
        </h1>

        {/* “Otp sent to +91 9988776655” + edit */}
        <div className="flex items-center gap-1 mb-6 text-center">
          <span className="text-sm text-[#4F5F6D]">Otp sent to</span>
          <span className="text-sm font-semibold">+91 {phone}</span>
          <button onClick={() => setStep('mobile')}>
            <Image
              src="/Union.svg"
              alt="Edit"
              width={16}
              height={16}
              className="ml-1"
            />
          </button>
        </div>

        {/* OTP inputs */}
        <div className="flex gap-3 mb-6">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              id={`otp-${idx}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(e.target.value, idx)}
              onKeyDown={(e) => handleOtpKeyDown(e, idx)}
              className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-gray-300 rounded-lg
                         text-center text-2xl font-semibold focus:border-teal-400
                         focus:outline-none transition-colors"
            />
          ))}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 mb-6">
          <Image src="./clock-icon.svg" alt='clock-icon' width={24} height={24} />
          <span className="text-black font-bold">
            00:{timeLeft.toString().padStart(2, '0')}
          </span>
        </div>

        {/* Resend */}
        <div className="flex items-center gap-1 mb-8">
          <span className="text-sm text-[#4F5F6D]">
            Didn't receive OTP?
          </span>
          <button
            onClick={handleResendOTP}
            disabled={timeLeft > 0}
            className="text-sm font-medium text-blue-700 disabled:text-gray-400
                       disabled:cursor-not-allowed hover:underline"
          >
            Resend OTP
          </button>
        </div>

        {/* Continue */}
        <button
          onClick={() => handleOtpSubmit(otp)}
          disabled = {otp[3]===''}
          className={`w-full max-w-md h-14 rounded-lg ${
                   otp[3] !== '' ?
                   'bg-gradient-to-r from-blue-900 to-teal-400  text-white' : 'bg-[#D2D5DB] text-[#686969]'}-medium
                     disabled:opacity-50
                     transition`}
        >
          Continue
        </button>
      </div>
    )
  }

  // ─── MOBILE STEP ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center bg-white px-6 pt-8 pb-6">
      {/* logo */}

      {/* Title */}
      <div className="text-left mb-8 w-full max-w-md">
        <p className="text-lg text-blue-900">Welcome to,</p>
        <p className="mt-1 text-2xl font-semibold text-blue-900">
          Manipal Community Connect
        </p>
      </div>

      {/* Mobile Number Field */}
      <div className="w-full max-w-md mb-6">
        <label
          htmlFor="phone"
          className="block text-base font-medium text-gray-800 mb-2"
        >
          Mobile Number
        </label>
        <div className="flex h-14 border-2 border-teal-400 rounded-lg overflow-hidden">
          <div className="flex items-center justify-center px-4 bg-white border-r-2 border-teal-400 text-base font-medium">
            <span className="mr-1">🇮🇳</span>+91
          </div>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9988667755"
            className="flex-1 px-4 text-lg font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* Send OTP via */}
      <div className="w-full max-w-md mb-8">
        <p className="text-base font-medium text-[#333333] mb-2">
          Send OTP via
        </p>
        <div className="flex gap-4 ">
          {(['SMS', 'Whatsapp'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 h-10 rounded-lg text-sm font-medium text-[#333333]
                ${
                  method === m
                    ? 'border-2 border-blue-900 text-blue-900'
                    : 'border border-gray-300 text-gray-700'
                }
                bg-white transition`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Sign Up Button */}
      <button
        onClick={() => handleSendOTP()}
        className={`w-full max-w-md h-14 rounded-lg ${
                   phone.length === 10 ?
                   'bg-gradient-to-r from-blue-900 to-teal-400  text-white' : 'bg-[#D2D5DB] text-[#686969]'}
                   text-lg font-medium mb-6`}
        disabled= {!(phone.length===10)}
      >
        Sign Up with OTP
      </button>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="w-full max-w-md h-14 rounded-lg border border-[#034EA1]
                   text-[#333333] bg-white flex items-center justify-center gap-3 mb-6
                   disabled:opacity-60 disabled:cursor-not-allowed"
        aria-label="Continue with Google"
      >
        <Image
          src="/google-icon.svg"            // replace with your Google 'G' icon (32x32)
          alt="Google"
          width={32}
          height={32}
          priority
        />
        <span className="text-[16px] font-medium leading-[26px]">
          {googleLoading ? 'Connecting…' : 'Continue with Google'}
        </span>
      </button>

      {/* Footer */}
      <p className="text-base font-medium text-gray-800">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-900 hover:underline">
          Log In
        </Link>
      </p>
    </div>
  )
}