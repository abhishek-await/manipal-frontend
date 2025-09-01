import { MobileNumberFormData } from '@/features/auth/validation/login.schema';
import { SignupFormData } from '@/features/auth/validation/signup.schema';
import { Days_One } from 'next/font/google';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export type methodType = 'SMS' | 'Whatsapp'

const ACCESS_KEY = 'accessToken'
const REFRESH_KEY = 'refreshToken'

type Tokens = { access: string | null; refresh: string | null }

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

  googleLogin: async () => {
    const response = await fetch(`${API_BASE_URL}/accounts/google/login`)
    
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

  saveTokens: (access: string, refresh: string) => {
    try {
      localStorage.setItem(ACCESS_KEY, access)
      localStorage.setItem(REFRESH_KEY, refresh)
    } catch (e) {
      console.warn('Could not save tokens to localStorage', e)
    }
  },

  clearTokens: () => {
    try {
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
    } catch (e) {
      console.warn('Could not clear tokens', e)
    }
  },

  getTokens: () : Tokens  => {
    try {
      return {
        access: localStorage.getItem(ACCESS_KEY),
        refresh: localStorage.getItem(REFRESH_KEY),
      }
    } catch (e) {
      return { access: null, refresh: null }
    }
  },

  refreshAccessToken: async (): Promise<{ access: string; refresh?: string } | null> => {
    const { refresh } = authApi.getTokens()
    if (!refresh) return null

    console.log(JSON.stringify({refresh}))

    try {
      const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      })

      if (!res.ok) {
        // refresh failed (expired/invalid refresh)
        authApi.clearTokens()
        return null
      }

      const data = await res.json()
      // typical response { access: "...", refresh?: "..." }
      if (data.access) {
        // save new tokens if refresh returned them
        const newAccess = data.access
        const newRefresh = data.refresh ?? refresh
        authApi.saveTokens(newAccess, newRefresh)
        return { access: newAccess, refresh: data.refresh }
      }

      return null
    } catch (err) {
      console.error('refreshAccessToken error', err)
      authApi.clearTokens()
      return null
    }
  },

  fetchWithAuth: async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const { access } = authApi.getTokens()

    const baseInit: RequestInit = {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        'Content-Type': (init?.headers as any)?.['Content-Type'] ?? 'application/json',
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
      },
    }

    let response = await fetch(input, baseInit)

    // if auth failed, attempt a refresh and retry once
    if (response.status === 401) {
      const refreshed = await authApi.refreshAccessToken()
      if (refreshed?.access) {
        const retryInit = {
          ...init,
          headers: {
            ...(init?.headers ?? {}),
            'Content-Type': (init?.headers as any)?.['Content-Type'] ?? 'application/json',
            Authorization: `Bearer ${refreshed.access}`,
          },
        }
        response = await fetch(input, retryInit)
      } else {
        // refresh failed -> no tokens
        throw new Error('Unauthorized')
      }
    }

    return response
  },

  getCurrentUser: async (): Promise<any | null> => {
    try {
      const meEndpoint = `${API_BASE_URL}/accounts/user`
      const res = await authApi.fetchWithAuth(meEndpoint, { method: 'GET' })
      if (!res.ok) {
        return null
      }
      return await res.json()
    } catch (e) {
      return null
    }
  }
};