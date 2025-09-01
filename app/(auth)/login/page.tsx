import LoginForm from '@/features/auth/components/LoginForm'
import React from 'react'

export default function Login() {
  return (
    <div className="flex w-full min-h-[100svh] justify-center items-start">
      <LoginForm />
    </div>
  );
}