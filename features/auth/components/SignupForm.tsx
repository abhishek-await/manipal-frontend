'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signupSchema, type SignupFormData } from '@/features/auth/validation/signup.schema'

// Utility: live-format DD/MM/YYYY while typing
function formatDOB(input: string) {
  const d = input.replace(/\D/g, '').slice(0, 8); // keep max 8 digits
  if (d.length <= 2) return d; // D or DD
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`; // DD/M or DD/MM
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`; // DD/MM/YYYY
}

export default function SignUpForm() {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      dateOfBirth: '',
      gender: 'Male',
      hasReferralCode: false,
      referralCode: ''
    }
  })

  const hasReferralCode = watch('hasReferralCode')

  const onSubmit = async (data: SignupFormData) => {
    // TODO: call your API
    console.log('Signup payload:', data)
  }

  return (
    <div className="min-h-screen max-w-[390px] mx-auto bg-white relative flex flex-col px-6 pt-0 pb-6">

      {/* Title (16px below header) */}
      <h1 className="mt-4 text-[20px] leading-[26px] font-bold text-[#18448A]">
        Tell us about yourself
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-[342px] mt-6 flex flex-col gap-5"
        noValidate
      >
        {/* First Name */}
        <div className="w-full">
          <label className="block text-[14px] leading-6 font-medium text-[#333333] mb-1">
            First Name*
          </label>
          <input
            {...register('firstName')}
            placeholder="Rahul"
            className={`w-full h-12 px-4 rounded-[6px] border ${
              errors.firstName ? 'border-red-500' : 'border-[#8D8E91]'
            } focus:outline-none`}
          />
          {errors.firstName && (
            <p className="mt-1 text-xs text-red-500">{errors.firstName.message}</p>
          )}
        </div>

        {/* Last Name */}
        <div className="w-full">
          <label className="block text-[14px] leading-6 font-medium text-[#333333] mb-1">
            Last Name*
          </label>
          <input
            {...register('lastName')}
            placeholder="Sharma"
            className={`w-full h-12 px-4 rounded-[6px] border ${
              errors.lastName ? 'border-red-500' : 'border-[#8D8E91]'
            } focus:outline-none`}
          />
          {errors.lastName && (
            <p className="mt-1 text-xs text-red-500">{errors.lastName.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="w-full">
          <label className="block text-[14px] leading-6 font-medium text-[#333333] mb-1">
            Email*
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="rahulsharma@gmail.com"
            className={`w-full h-12 px-4 rounded-[6px] border ${
              errors.email ? 'border-red-500' : 'border-[#8D8E91]'
            } focus:outline-none`}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        {/* Date of Birth */}
       <div>
        <label className="block text-[14px] leading-6 font-medium text-[#333333] mb-1">
          Date of Birth*
        </label>

        <Controller
          name="dateOfBirth"
          control={control}
          render={({ field: { value, onChange, onBlur, ref } }) => (
            <input
              ref={ref}
              value={value ?? ''}               // ensure it's a string
              onChange={(e) => onChange(formatDOB(e.target.value))}
              onBlur={onBlur}
              inputMode="numeric"
              placeholder="29/01/1987"
              className={`w-full h-12 px-4 rounded-[6px] border ${
                errors.dateOfBirth ? 'border-red-500' : 'border-[#8D8E91]'
              } focus:outline-none`}
            />
          )}
        />

        {errors.dateOfBirth && (
          <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth.message}</p>
        )}
      </div>

        {/* Gender */}
        <div className="w-full">
          <label className="block text-[14px] leading-6 font-medium text-[#333333] mb-2">
            Gender*
          </label>
          <Controller
            name="gender"
            control={control}
            render={({ field }) => (
              <div className="flex gap-3">
                {(['Male', 'Female', 'Others'] as const).map((g) => {
                  const active = field.value === g
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => field.onChange(g)}
                      className={`w-[81px] h-10 rounded-[6px] border text-[14px] font-medium
                        ${active
                          ? 'border-[#034EA1] bg-[#99B9E2] text-[#333333]'
                          : 'border-[#8D8E91] bg-white text-[#333333]'
                        }`}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
            )}
          />
          {errors.gender && (
            <p className="mt-1 text-xs text-red-500">{errors.gender.message}</p>
          )}
        </div>

        {/* Referral checkbox */}
        <div className="flex items-center">
          <input
            id="hasReferralCode"
            type="checkbox"
            {...register('hasReferralCode')}
            className="h-6 w-6 rounded-[6px] border border-[#8D8E91]
                       appearance-none checked:bg-[#18448A] checked:border-[#18448A]
                       grid place-content-center"
          />
          {/* custom check glyph */}
          <span className="pointer-events-none -ml-6 translate-x-3 text-white text-sm hidden peer-checked:block" />
          <label htmlFor="hasReferralCode" className="ml-3 text-[16px] leading-6 font-medium text-[#333333]">
            I have referral code
          </label>
        </div>

        {/* Referral Code (conditional) */}
        {hasReferralCode && (
          <div className="w-full">
            <label className="block text-[14px] leading-6 font-medium text-[#333333] mb-1">
              Referral Code
            </label>
            <input
              {...register('referralCode')}
              className="w-full h-12 px-4 rounded-[6px] border border-[#8D8E91] focus:outline-none"
            />
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full h-[54px] rounded-[8px]
                     bg-gradient-to-r from-[#18448A] to-[#16AF9F]
                     text-white text-[16px] leading-[26px] font-medium
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Signing Up...' : 'Sign Up'}
        </button>
      </form>

      {/* Footer link pinned near bottom */}
      <p className="mt-8 text-[16px] leading-6 font-medium text-[#333333] text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-[#18448A] hover:underline">
          Log In
        </Link>
      </p>
    </div>
  )
}