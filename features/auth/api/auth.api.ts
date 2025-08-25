import { MobileNumberFormData } from '@/features/auth/validation/login.schema';
import { SignupFormData } from '@/features/auth/validation/signup.schema';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const authApi = {
  // Send OTP
  sendOTP: async (data: Pick<MobileNumberFormData, 'mobileNumber' | 'otpMethod'>) => {
    const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to send OTP');
    }

    return response.json();
  },

  // Verify OTP
  verifyOTP: async (mobileNumber: string, otp: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mobileNumber, otp }),
    });

    if (!response.ok) {
      throw new Error('Invalid OTP');
    }

    return response.json();
  },

  // Sign up
  signup: async (data: SignupFormData & { mobileNumber: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create account');
    }

    return response.json();
  },

  // Check if user exists
  checkUserExists: async (mobileNumber: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/check-user?mobileNumber=${mobileNumber}`);
    
    if (!response.ok) {
      throw new Error('Failed to check user');
    }

    return response.json();
  },
};