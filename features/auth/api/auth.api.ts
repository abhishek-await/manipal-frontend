import { MobileNumberFormData } from '@/features/auth/validation/login.schema';
import { SignupFormData } from '@/features/auth/validation/signup.schema';
import { Days_One } from 'next/font/google';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export type methodType = 'SMS' | 'Whatsapp'

export const authApi = {
  // Send OTP
  sendOTP: async (mobileNumber: string, method: methodType) => {
    const response = await fetch(`${API_BASE_URL}/accounts/request-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({"identifier": mobileNumber, "channel": method.toLowerCase()}),
    });

    if (!response.ok) {
      throw new Error('Failed to send OTP');
    }

    return response.json();
  },

  // Verify OTP
  verifyOTP: async (mobileNumber: string, otp: string[]) => {
    const code = otp.join('')
    const response = await fetch(`${API_BASE_URL}/accounts/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({"identifier": mobileNumber,code}),
    });

    if (!response.ok) {
      throw new Error('Invalid OTP');
    }

    return response.json();
  },

  // Sign up
  signup: async (data: SignupFormData, token: {token: string}) => {
    // console.log("token: ", token.token)
    const dob = data.dateOfBirth.replaceAll('/','-')
    const [date,month,year] = dob.split('-')
    const formattedDOB = `${year}-${month}-${date}`
    const response = await fetch(`${API_BASE_URL}/accounts/complete-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "verification_id": token.token,
        "first_name": data.firstName,
        "last_name": data.lastName,
        "email": data.email,
        "gender": data.gender,
        "is_referred": data.hasReferralCode,
        "date_of_birth": formattedDOB
      }),
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