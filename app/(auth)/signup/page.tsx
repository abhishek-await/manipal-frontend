"use client"

import SignUpForm from '@/features/auth/components/SignupForm'
import React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'


const Signup= () => {

  const router = useRouter()

  const SearchParams = useSearchParams()

  const token = SearchParams.get("token") ?? undefined

  return (
    <div className='flex w-full h-dvh justify-center'>
      <SignUpForm token={token} />
    </div>
  )
}

export default Signup