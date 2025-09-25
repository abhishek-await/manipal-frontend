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
  // features/auth/api/auth.api.ts (or where your authApi lives)
// Replace the existing signup function with this:

  signup: async (data: SignupFormData, token: { token: string }) => {
    // format DOB -> YYYY-MM-DD
    const dob = data.dateOfBirth.replaceAll("/", "-");
    const [date, month, year] = dob.split("-");
    const formattedDOB = `${year}-${month}-${date}`;

    const res = await fetch(`${API_BASE_URL}/accounts/complete-profile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        verification_id: token.token,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        gender: data.gender,
        is_referred: data.hasReferralCode,
        date_of_birth: formattedDOB,
      }),
    });

    // try to parse body (if any)
    let body: any = null;
    try {
      body = await res.clone().json();
    } catch (e) {
      // ignore parsing errors
    }

    if (!res.ok) {
      // Normalize message
      const message = body?.detail ?? body?.message ?? body?.error ?? "Failed to create account";

      // Throw an error-like object that includes status
      const err: any = new Error(message);
      err.status = res.status;
      err.body = body;
      throw err;
    }

    // ok -> return parsed body (or {} if parse failed)
    return body ?? {};
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

    // console.log(JSON.stringify({refresh}))

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
    // console.log("Fetch with auth and path: ", path)
    const payload: any = {
      path,
      method: opts.method || "GET",
      headers: {},
    };

    // copy headers except Authorization (server will add it)
    if (opts.headers) {
      const headersObj: Record<string, string> = {};
      if (opts.headers instanceof Headers) {
        opts.headers.forEach((v, k) => (headersObj[k] = v));
      } else if (typeof opts.headers === "object") {
        Object.assign(headersObj, opts.headers as Record<string, string>);
      }
      delete headersObj["Authorization"];
      payload.headers = headersObj;
    }

    // Helper: convert File -> data URL (data:<mime>;base64,...)
    const fileToDataURL = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = (e) => reject(e);
        fr.readAsDataURL(file);
      });

    // If body is FormData, convert to JSON-friendly shape your forward route accepts
    if (opts.body instanceof FormData) {
      const fd = opts.body as FormData;

      // containers
      let post_in: any = undefined;
      const form: Record<string, any> = {};
      const files: Array<{ field: string; name: string; type: string; data: string }> = [];

      // Iterate entries and collect synchronous fields and file promises
      const filePromises: Array<Promise<void>> = [];

      for (const [k, v] of fd.entries()) {
        if (k === "post_in") {
          // post_in may be a string or a Blob (application/json)
          if (typeof v === "string") {
            try {
              post_in = JSON.parse(v);
            } catch {
              // if it's not JSON, keep as string
              post_in = v;
            }
          } else if (v instanceof Blob) {
            // read the blob as text to parse JSON
            const p = (async () => {
              const txt = await v.text();
              try {
                post_in = JSON.parse(txt);
              } catch {
                post_in = txt;
              }
            })();
            filePromises.push(p as unknown as Promise<void>);
          } else {
            // fallback
            post_in = String(v);
          }
          continue;
        }

        // files (File objects)
        if (v instanceof File) {
          const p = (async () => {
            const dataUrl = await fileToDataURL(v);
            files.push({ field: k, name: v.name, type: v.type || "application/octet-stream", data: dataUrl });
          })();
          filePromises.push(p as Promise<void>);
          continue;
        }

        // other non-file fields (strings). Preserve multiple values as arrays.
        const sval = String(v);
        if (form[k] === undefined) form[k] = sval;
        else if (Array.isArray(form[k])) form[k].push(sval);
        else form[k] = [form[k], sval];
      }

      // wait for all async readers to finish
      if (filePromises.length) await Promise.all(filePromises);

      // Build payload.body in the expected shape
      const bodyShape: any = {};
      if (post_in !== undefined) bodyShape.post_in = post_in;
      if (Object.keys(form).length) bodyShape.form = form;
      if (files.length) bodyShape.files = files;

      payload.body = bodyShape;

      // Send JSON payload to forwarder (UNCHANGED auth behavior)
      const res = await fetch(`/api/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return res;
    }

    // Non-FormData behavior: preserve original parsing logic (unchanged)
    if (opts.body) {
      try {
        payload.body = typeof opts.body === "string" ? JSON.parse(opts.body) : opts.body;
      } catch {
        payload.body = opts.body;
      }
    }

    // call forwarder (unchanged)
    const res = await fetch("/api/forward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

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