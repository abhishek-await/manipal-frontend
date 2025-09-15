import { MobileNumberFormData } from '@/features/auth/validation/login.schema';
import { SignupFormData } from '@/features/auth/validation/signup.schema';

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

  saveTokens: async (access: string, refresh: string) => {
    try {
      // await fetch('/api/token', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ access, refresh }),
      // })
      localStorage.setItem(ACCESS_KEY, access)
      localStorage.setItem(REFRESH_KEY, refresh)
    } catch (e) {
      console.warn('Could not save tokens to localStorage', e)
    }
  },

  getTokens: () : Tokens  => {
    try {
      // const res = await fetch('/api/token', {
      //   method: 'GET',
      //   headers: { 'Content-Type': 'application/json' },
      // })
      // const {accessCookie, refreshCookie} = await res.json()
      // console.log(accessCookie,refreshCookie)
      return {
        access: localStorage.getItem(ACCESS_KEY),
        refresh: localStorage.getItem(REFRESH_KEY),
      }
    } catch (e) {
      // console.error("Error getting cookies", e)
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

  clearTokens: async () => {
    try {
      await fetch("/api/token", { method: "DELETE" }); // clears next cookies
    } catch (e) {}
  },

  // Wrapper: send a forward request to our server-side forwarder
  fetchWithAuth: async (path: string, opts: RequestInit = {}) => {
    const payload: any = {
      path,
      method: opts.method || "GET",
      headers: {},
    };

    // copy headers except Authorization (server will add it)
    if (opts.headers) {
      // shallow copy of headers object/map to plain object
      const headersObj: Record<string, string> = {};
      if (opts.headers instanceof Headers) {
        opts.headers.forEach((v, k) => (headersObj[k] = v));
      } else if (typeof opts.headers === "object") {
        Object.assign(headersObj, opts.headers);
      }
      delete headersObj["Authorization"]; // server reads cookie
      payload.headers = headersObj;
    }

    if (opts.body) {
      // if body is string, try parse to object; otherwise keep object
      try {
        payload.body = typeof opts.body === "string" ? JSON.parse(opts.body) : opts.body;
      } catch {
        payload.body = opts.body;
      }
    }

    // call forwarder
    let res = await fetch("/api/forward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // If forwarder returned 401, it already attempted refresh/retry internally.
    // Caller can still get 401 and should treat as unauthenticated.
    return res;
  },

  // helper to let server set httpOnly cookies after login
  postTokensToServer: async (access: string, refresh: string) => {
    await fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access, refresh }),
    });
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