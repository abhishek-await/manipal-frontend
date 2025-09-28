// app/api/forward/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import FormDataNode from "form-data"; // npm i form-data
import { Buffer } from "buffer";
import { jwtDecode } from "jwt-decode";


const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL;
const isProd = process.env.NODE_ENV === "production";


/**
 * Minimal whitelist - expand to match only the endpoints you need.
 * This prevents arbitrary proxying.
 */
const ALLOWED_PREFIXES = [
  `/support-groups/`,
  "/support-group/",
  "/auth/",
  "/accounts/",
  "/api/", // if your backend exposes /api/...
];

function isAllowedPath(path: string) {
  // Keep your original style: check that the forwarded path starts with BACKEND + allowed prefix
  return ALLOWED_PREFIXES.some((p) => path.startsWith((BACKEND ?? "") + p));
}

type JWTPayload = {
  exp?: number;
  [key: string]: any;
};

function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);

    if (!decoded.exp) return true; // no expiration claim
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (e) {
    return true; // invalid token
  }
}

async function forwardToBackend(path: string, method: string, headers: Record<string, string>, body?: any) {
  const url = `${path}`;
  // console.log("URL: ", url);
  // console.log("headers: ", headers)
  return await fetch(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : body,
  });

  // const json = await res.json()

  // console.log("Json Response: ", json);

  // return res
}

export async function POST(req: Request) {
  // expected payload: { path: string, method?: string, headers?: Record<string,string>, body?: any }
  const payload = await req.json().catch(() => ({}));
  const path = typeof payload.path === "string" ? payload.path : "/";
  const method = (payload.method || "GET").toUpperCase();

  // console.log("forward payload.body:", JSON.stringify(payload.body, null, 2));

  if (!isAllowedPath(path)) {
    return NextResponse.json({ message: "disallowed path" }, { status: 400 });
  }

  // Build cookie header from Next.js cookies()
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const access = cookieStore.get("accessToken")?.value;
  const refresh = cookieStore.get("refreshToken")?.value;

  // Build headers to forward
  const forwardHeaders: Record<string, string> = {
    ...(payload.headers && typeof payload.headers === "object" ? payload.headers : {}),
    // ensure backend sees cookie header (if needed)
    ...(allCookies ? { cookie: allCookies } : {}),
  };

  // Add Authorization header using accessToken cookie (backend expects this)
  if (access && isTokenExpired(access)) {
    forwardHeaders["Authorization"] = `Bearer ${access}`;
  } else if(refresh) {
    try {
      const refreshRes = await fetch(`${BACKEND}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: allCookies },
        body: JSON.stringify({ refresh }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json().catch(() => ({}));

        // set cookies on Next response (httpOnly)
        if (data.access) {
          cookieStore.set({
            name: "accessToken",
            value: data.access,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24, // 15m, adjust to your token lifetime
            secure: isProd,
          });
        }
        if (data.refresh) {
          cookieStore.set({
            name: "refreshToken",
            value: data.refresh,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 10,
            secure: isProd,
          });
        }

        // use new access from refresh response (prefer data.access; fallback to cookie)
        const newAccess = data.access ?? cookieStore.get("accessToken")?.value;
        if (newAccess) {
          forwardHeaders["Authorization"] = `Bearer ${newAccess}`;
        } else {
          // If we still don't have access, fall through and return original 401
        }

        // retry original request with new Authorization header
        // backendRes = await forwardToBackend(path, method, forwardHeaders, bodyToSend);
      } else {
        // refresh failed -> clear server cookies (session ended)
        cookieStore.delete("accessToken");
        cookieStore.delete("refreshToken");
      }
    } catch (err) {
      console.error("refresh attempt failed", err);
      // fall back to returning the original 401
    }
  }

  // ---------- NEW: If payload.body contains files/post_in shape, build multipart ----------
  // Expecting payload.body.files = [{ field, name, type, data }] where data is dataURL (data:<mime>;base64,AAAA...)
  // and/or payload.body.post_in (object) OR payload.body.form (plain fields)
  let bodyToSend: BodyInit | undefined;
  // ---------- NEW multipart-from-json branch (replace your existing version) ----------
let isMultipartFromJson = false;
if (payload.body && typeof payload.body === "object") {
  const b = payload.body;
  if (Array.isArray(b.files) && b.files.length > 0) isMultipartFromJson = true;
  if (b.post_in && (typeof b.post_in === "object" || typeof b.post_in === "string")) isMultipartFromJson = true;
}

if (isMultipartFromJson) {
  // Build server-side multipart using form-data
  const fd = new FormDataNode();

  // 1) post_in as a plain form field (string)
  if (payload.body.post_in !== undefined) {
    const postInString =
      typeof payload.body.post_in === "string"
        ? payload.body.post_in
        : JSON.stringify(payload.body.post_in);
    // append as plain field (no filename / no weird contentType). This mirrors `-F 'post_in=...'` from curl.
    fd.append("post_in", postInString);
  }

  // 2) any other simple form fields
  if (payload.body.form && typeof payload.body.form === "object") {
    for (const [k, v] of Object.entries(payload.body.form)) {
      if (Array.isArray(v)) {
        v.forEach((item) => fd.append(k, String(item)));
      } else {
        fd.append(k, String(v));
      }
    }
  }

  // 3) append files from data-URLs or raw base64
  for (const f of (payload.body.files || [])) {
    if (!f || !f.data) continue;
    // dataURL match: data:<mime>;base64,<b64>
    const m = String(f.data).match(/^data:(.+);base64,(.+)$/);
    let buffer: Buffer;
    let mimeType = f.type || "application/octet-stream";
    if (m && m.length >= 3) {
      mimeType = m[1];
      buffer = Buffer.from(m[2], "base64");
    } else {
      // fallback: assume raw base64 string (maybe without data: prefix)
      const raw = String(f.data).replace(/^data:.*;base64,/, "");
      buffer = Buffer.from(raw, "base64");
    }
    const fieldName = f.field || "files";
    const filename = f.name || `upload-${Date.now()}`;
    // Append as file-like part with filename + contentType -> backend receives an actual file part
    fd.append(fieldName, buffer, { filename, contentType: mimeType } as any);
  }

  // Let form-data set Content-Type (with boundary)
  // after building fd and fdHeaders
const fdHeaders = fd.getHeaders(); // { 'content-type': 'multipart/form-data; boundary=----' }

// remove any existing content-type so we can set the correct one
delete forwardHeaders["Content-Type"];
delete forwardHeaders["content-type"];
const mergedHeaders = { ...forwardHeaders, ...fdHeaders };

// Convert form-data to a Buffer that Node fetch can send reliably
// Note: form-data exposes getBuffer() synchronously for small-medium bodies.
// For very large files you should stream instead (see note below).
let bodyBuffer: Buffer;
try {
  bodyBuffer = fd.getBuffer();
  // Optionally set content-length (helps some servers)
  if (typeof fd.getLengthSync === "function") {
    try {
      mergedHeaders["content-length"] = String(fd.getLengthSync());
    } catch (e) {
      console.error(e)
    }
  }
} catch (err) {
  // Fallback: if getBuffer() fails for very large streams, use async getLength + stream logic
  console.error("fd.getBuffer() failed, falling back to stream (might need streaming support)", err);
  // send the fd directly (may or may not work with your fetch runtime)
  // mergedHeaders left as-is
  bodyBuffer = fd as any;
}

// debug log (keep while testing)
console.log("Forwarder: sending multipart with headers:", mergedHeaders);

// send Buffer as body (fetch accepts Buffer)
const backendRes = await forwardToBackend(path, method, mergedHeaders, bodyBuffer);

// (then run your existing refresh/retry logic if 401 and refresh token exists)


  // refresh logic (unchanged)...
  // if (backendRes.status === 401 && refresh) {
  //   try {
  //     const refreshRes = await fetch(`${BACKEND}/auth/token/refresh/`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json", cookie: allCookies },
  //       body: JSON.stringify({ refresh }),
  //     });

  //     if (refreshRes.ok) {
  //       const data = await refreshRes.json().catch(() => ({}));

  //       // set cookies on Next response (httpOnly)
  //       if (data.access) {
  //         cookieStore.set({
  //           name: "accessToken",
  //           value: data.access,
  //           httpOnly: true,
  //           sameSite: "lax",
  //           path: "/",
  //           maxAge: 60 * 60 * 24, // 15m, adjust to your token lifetime
  //           secure: isProd,
  //         });
  //       }
  //       if (data.refresh) {
  //         cookieStore.set({
  //           name: "refreshToken",
  //           value: data.refresh,
  //           httpOnly: true,
  //           sameSite: "lax",
  //           path: "/",
  //           maxAge: 60 * 60 * 24 * 10,
  //           secure: isProd,
  //         });
  //       }

  //       // use new access from refresh response (prefer data.access; fallback to cookie)
  //       const newAccess = data.access ?? cookieStore.get("accessToken")?.value;
  //       if (newAccess) {
  //         forwardHeaders["Authorization"] = `Bearer ${newAccess}`;
  //       } else {
  //         // If we still don't have access, fall through and return original 401
  //       }

  //       // retry original request with new Authorization header
  //       backendRes = await forwardToBackend(path, method, forwardHeaders, bodyToSend);
  //     } else {
  //       // refresh failed -> clear server cookies (session ended)
  //       cookieStore.delete("accessToken");
  //       cookieStore.delete("refreshToken");
  //     }
  //   } catch (err) {
  //     console.error("refresh attempt failed", err);
  //     // fall back to returning the original 401
  //   }
  // }

  const text = await backendRes.text().catch(() => "");
  const resp = new NextResponse(text, { status: backendRes.status });
  const contentType = backendRes.headers.get("content-type");
  if (contentType) resp.headers.set("content-type", contentType);

  // console.log("Response from BE: ", resp)
  return resp;
}

  // ---------- End multipart-from-json branch; fall back to original behavior ----------

  // Prepare body (original JSON behavior)
  if (payload.body !== undefined) {
    // If it's an object, stringify; if it's already a string, send as-is.
    bodyToSend = typeof payload.body === "string" ? payload.body : JSON.stringify(payload.body);
    if (!forwardHeaders["Content-Type"]) forwardHeaders["Content-Type"] = "application/json";
  }

  // First attempt
  const backendRes = await forwardToBackend(path, method, forwardHeaders, bodyToSend);

  // // If 401 and we have a refresh token, try to refresh and retry once
  // if (backendRes.status === 401 && refresh) {
  //   try {
  //     const refreshRes = await fetch(`${BACKEND}/auth/token/refresh/`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json", cookie: allCookies },
  //       body: JSON.stringify({ refresh }),
  //     });

  //     if (refreshRes.ok) {
  //       const data = await refreshRes.json().catch(() => ({}));

  //       // set cookies on Next response (httpOnly)
  //       if (data.access) {
  //         cookieStore.set({
  //           name: "accessToken",
  //           value: data.access,
  //           httpOnly: true,
  //           sameSite: "lax",
  //           path: "/",
  //           maxAge: 60 * 60 * 24, // 15m, adjust to your token lifetime
  //           secure: isProd,
  //         });
  //       }
  //       if (data.refresh) {
  //         cookieStore.set({
  //           name: "refreshToken",
  //           value: data.refresh,
  //           httpOnly: true,
  //           sameSite: "lax",
  //           path: "/",
  //           maxAge: 60 * 60 * 24 * 10,
  //           secure: isProd,
  //         });
  //       }

  //       // use new access from refresh response (prefer data.access; fallback to cookie)
  //       const newAccess = data.access ?? cookieStore.get("accessToken")?.value;
  //       if (newAccess) {
  //         forwardHeaders["Authorization"] = `Bearer ${newAccess}`;
  //       } else {
  //         // If we still don't have access, fall through and return original 401
  //       }

  //       // retry original request with new Authorization header
  //       backendRes = await forwardToBackend(path, method, forwardHeaders, bodyToSend);
  //     } else {
  //       // refresh failed -> clear server cookies (session ended)
  //       cookieStore.delete("accessToken");
  //       cookieStore.delete("refreshToken");
  //     }
  //   } catch (err) {
  //     console.error("refresh attempt failed", err);
  //     // fall back to returning the original 401
  //   }
  // }

  // Read response body and forward it along with status
  const text = await backendRes.text().catch(() => "");
  const resp = new NextResponse(text, { status: backendRes.status });

  // Optionally forward selected headers from backendRes (e.g. content-type)
  const contentType = backendRes.headers.get("content-type");
  if (contentType) resp.headers.set("content-type", contentType);

  // console.log("Response from BE: ", resp)

  return resp;
}
