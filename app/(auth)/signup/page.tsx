"use client"

import SignUpForm from '@/features/auth/components/SignupForm'
import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'


const Signup = () => {

  const SearchParams = useSearchParams()

  const token = SearchParams.get("token") ?? ""

  return (
    <div className='flex w-full h-dvh justify-center'>
      <SignUpForm token={token} />
    </div>
  )
}

const page = () => {
  return (
    <Suspense>
      <Signup />
    </Suspense>
  )
}

export default page
