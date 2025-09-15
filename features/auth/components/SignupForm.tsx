"use client";

import Image from "next/image";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormData } from "@/features/auth/validation/signup.schema";
import { useState, useEffect } from "react";
import { authApi } from "../api/auth.api";
import { useRouter } from "next/navigation";

interface SignUpFormProps {
  token: string;
}

// Utility: live-format DD/MM/YYYY while typing
function formatDOB(input: string) {
  const d = input.replace(/\D/g, "").slice(0, 8); // keep max 8 digits
  if (d.length <= 2) return d; // D or DD
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`; // DD/M or DD/MM
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`; // DD/MM/YYYY
}

export default function SignUpForm(token: SignUpFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting, isValid, touchedFields, isSubmitted },
    trigger,
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      gender: null,
      hasReferralCode: false,
      referralCode: "",
    },
  });

  const [showSuccess, setShowSuccess] = useState(false);
  const hasReferralCode = watch("hasReferralCode");
  const router = useRouter();

  // Pre-trigger validation when referral toggles (so referralCode error disappears when hidden)
  useEffect(() => {
    void trigger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasReferralCode]);

  useEffect(() => {
    if (!showSuccess) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showSuccess]);

  const onSubmit = async (data: SignupFormData) => {
    try {
      const response = await authApi.signup(data, token);
      authApi.clearTokens();
      const access = response.access
      const refresh = response.refresh
      await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access, refresh }),
      })
      // authApi.saveTokens(response.access, response.refresh);
      setShowSuccess(true);
    } catch (error) {
      console.error("Error SigningUp User: ", error);
    }
  };

  const canSubmit = isValid && !isSubmitting;

  // helpers for conditional UI display:
  const touched = (field: keyof SignupFormData) => Boolean(touchedFields[field]);
  const value = (field: keyof SignupFormData) => watch(field) ?? "";

  return (
    <div className="min-h-[100svh] max-w-2xl w-full mx-auto bg-white relative flex flex-col px-5 pt-6 pb-8">
      {/* Title */}
      <h1 className="mt-2 text-[20px] leading-[26px] font-bold text-[#18448A]">Tell us about yourself</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full mt-5 space-y-4" noValidate>
        {/* First Name */}
        <div className="w-full">
          <label htmlFor="firstName" className="block text-[14px] leading-6 font-medium text-[#333333] mb-2">
            First Name*
          </label>
          <input
            id="firstName"
            {...register("firstName")}
            placeholder=""
            inputMode="text"
            autoComplete="given-name"
            className={`w-full h-12 px-4 rounded-[6px] border border-[#8D8E91] focus:outline-none`}
          />
          {/* Show helper only after user typed and blurred */}
          {/* {touched("firstName") && value("firstName") && !errors.firstName && (
            <p className="mt-1 text-xs text-[#6B7280]">Looks good — we'll call you {value("firstName")}.</p>
          )} */}
          {/* Error shows only after touched or submit */}
          {((touched("firstName") && errors.firstName) || (isSubmitted && errors.firstName)) && (
            <p className="mt-1 text-xs text-red-500">{errors.firstName?.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="w-full">
          <label htmlFor="lastName" className="block text-[14px] leading-6 font-medium text-[#333333] mb-2">
            Last Name*
          </label>
          <input
            id="lastName"
            {...register("lastName")}
            placeholder=""
            inputMode="text"
            autoComplete="family-name"
            className={`w-full h-12 px-4 rounded-[6px] border border-[#8D8E91] focus:outline-none`}
          />
          {/* {touched("lastName") && value("lastName") && !errors.lastName && (
            <p className="mt-1 text-xs text-[#6B7280]">Thanks — {value("lastName")} is noted.</p>
          )} */}
          {((touched("lastName") && errors.lastName) || (isSubmitted && errors.lastName)) && (
            <p className="mt-1 text-xs text-red-500">{errors.lastName?.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="w-full">
          <label htmlFor="email" className="block text-[14px] leading-6 font-medium text-[#333333] mb-2">
            Email*
          </label>
          <input
            id="email"
            {...register("email")}
            type="email"
            placeholder=""
            inputMode="email"
            autoComplete="email"
            className={`w-full h-12 px-4 rounded-[6px] border border-[#8D8E91] focus:outline-none`}
          />
          {/* {touched("email") && value("email") && !errors.email && (
            <p className="mt-1 text-xs text-[#6B7280]">We’ll send important messages to {value("email")}.</p>
          )} */}
          {((touched("email") && errors.email) || (isSubmitted && errors.email)) && (
            <p className="mt-1 text-xs text-red-500">{errors.email?.message}</p>
          )}
        </div>

        {/* Date of Birth */}
        <div className="w-full">
          <label htmlFor="dateOfBirth" className="block text-[14px] leading-6 font-medium text-[#333333] mb-2">
            Date of Birth*
          </label>
          <Controller
            name="dateOfBirth"
            control={control}
            render={({ field: { value: dobValue, onChange, onBlur, ref } }) => (
              <input
                id="dateOfBirth"
                ref={ref}
                value={dobValue ?? ""}
                onChange={(e) => onChange(formatDOB(e.target.value))}
                onBlur={onBlur}
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                className={`w-full h-12 px-4 rounded-[6px] border border-[#8D8E91] focus:outline-none`}
                aria-describedby="dob-help"
              />
            )}
          />
          {/* {touched("dateOfBirth") && value("dateOfBirth") && !errors.dateOfBirth && (
            <p id="dob-help" className="mt-1 text-xs text-[#6B7280]">
              Entered: {value("dateOfBirth")}
            </p>
          )} */}
          {((touched("dateOfBirth") && errors.dateOfBirth) || (isSubmitted && errors.dateOfBirth)) && (
            <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth?.message}</p>
          )}
        </div>

        {/* Gender (responsive buttons) */}
        <div className="w-full">
          <label className="block text-[14px] leading-6 font-medium text-[#333333] mb-2">Gender*</label>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <div className="flex gap-3 flex-wrap">
                {(["Male", "Female", "Others"] as const).map((g) => {
                  const active = field.value === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => field.onChange(g)}
                      className={`min-w-[80px] h-10 rounded-[6px] border text-[14px] font-medium
                        ${
                          active
                            ? "border-[#034EA1] bg-[#99B9E2] text-[#0F141A]"
                            : "border-[#8D8E91] bg-white text-[#0F141A]"
                        }`}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
            )}
          />
          {((touched("gender") && errors.gender) || (isSubmitted && errors.gender)) && (
            <p className="mt-1 text-xs text-red-500">{errors.gender?.message}</p>
          )}
        </div>

        {/* Referral checkbox */}
        <div className="flex items-center gap-3">
          <input
            id="hasReferralCode"
            type="checkbox"
            {...register("hasReferralCode")}
            className="h-5 w-5 rounded-[6px] border border-[#8D8E91]"
          />
          <label htmlFor="hasReferralCode" className="text-[16px] leading-6 font-medium text-[#333333]">
            I have referral code
          </label>
        </div>

        {/* Referral Code (conditional) */}
        {hasReferralCode && (
          <div className="w-full">
            <label htmlFor="referralCode" className="block text-[14px] leading-6 font-medium text-[#333333] mb-2">
              Referral Code
            </label>
            <input
              id="referralCode"
              {...register("referralCode")}
              className={`w-full h-12 px-4 rounded-[6px] border border-[#8D8E91] focus:outline-none`}
              placeholder=""
              autoComplete="off"
            />
            {touched("referralCode") && value("referralCode") && !errors.referralCode && (
              <p className="mt-1 text-xs text-[#6B7280]">Referral code looks good.</p>
            )}
            {((touched("referralCode") && errors.referralCode) || (isSubmitted && errors.referralCode)) && (
              <p className="mt-1 text-xs text-red-500">{errors.referralCode?.message}</p>
            )}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={!canSubmit}
          aria-disabled={!canSubmit}
          className={`mt-2 w-full h-[54px] rounded-[8px] text-[16px] leading-[26px] font-medium transition-colors
            ${canSubmit ? "bg-gradient-to-r from-[#18448A] to-[#16AF9F] text-white" : "bg-[#D2D5DB] text-[#686969]"}
          `}
        >
          {isSubmitting ? "Signing Up..." : "Sign Up"}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-6 text-[16px] leading-6 font-medium text-[#333333] text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-[#18448A] hover:underline">
          Log In
        </Link>
      </p>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[1000] bg-[rgba(51,51,51,0.6)] flex items-center justify-center px-6" role="dialog" aria-modal="true" aria-labelledby="signup-success-title">
          <div className="w-[342px] rounded-[12px] border border-[#E5E7EB] bg-white p-6 text-center shadow-lg">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-[#16AF9F] grid place-items-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <h2 id="signup-success-title" className="text-[20px] leading-[30px] font-bold text-[#034EA1] mb-3">
              Sign Up Successful!
            </h2>

            <p className="mx-auto max-w-[278px] text-[14px] leading-[22px] tracking-[-0.01em] text-[#333333] mb-6">
              Your Manipal Community Connect account is now active. You can now register for events, share your thoughts, and create posts!
            </p>

            <button type="button" onClick={() => router.push("/home")} className="w-full h-[54px] rounded-[8px] bg-gradient-to-r from-[#18448A] to-[#16AF9F] text-white text-[16px] leading-[26px] font-medium">
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
