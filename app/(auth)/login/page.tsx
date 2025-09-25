import LoginForm from '@/features/auth/components/LoginForm'
import React, { Suspense } from 'react'
function Login() {
  return (
    <div className="flex w-full min-h-[100svh] justify-center items-start">
      <LoginForm />
    </div>
  );
}

const page = () => {
  return (
    <Suspense>
      <Login />
    </Suspense>
  )
}

export default page
