// app/api/forward/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ur } from "zod/locales";

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
  return ALLOWED_PREFIXES.some((p) => path.startsWith(BACKEND+p));
}

async function forwardToBackend(path: string, method: string, headers: Record<string, string>, body?: any) {
  const url = `${path}`;
  console.log("URL: ", url)
  return await fetch(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : body,
  });
}

export async function POST(req: Request) {
  // expected payload: { path: string, method?: string, headers?: Record<string,string>, body?: any }
  const payload = await req.json().catch(() => ({}));
  const path = typeof payload.path === "string" ? payload.path : "/";
  const method = (payload.method || "GET").toUpperCase();

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
  if (access) {
    forwardHeaders["Authorization"] = `Bearer ${access}`;
  }

  // Prepare body
  let bodyToSend: BodyInit | undefined;
  if (payload.body !== undefined) {
    // If it's an object, stringify; if it's already a string, send as-is.
    bodyToSend = typeof payload.body === "string" ? payload.body : JSON.stringify(payload.body);
    if (!forwardHeaders["Content-Type"]) forwardHeaders["Content-Type"] = "application/json";
  }

  // First attempt
  let backendRes = await forwardToBackend(path, method, forwardHeaders, bodyToSend);

  // If 401 and we have a refresh token, try to refresh and retry once
  if (backendRes.status === 401 && refresh) {
    try {
      // call backend refresh endpoint directly and forward current cookie header (so backend sees refresh cookie if it expects it)
      // Some backends expect refresh token in body; adapt if yours expects cookie only.
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
            maxAge: 60 * 15, // 15m, adjust to your token lifetime
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
            maxAge: 60 * 60 * 24 * 30,
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
        backendRes = await forwardToBackend(path, method, forwardHeaders, bodyToSend);
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

  // Read response body and forward it along with status
  const text = await backendRes.text().catch(() => "");
  const resp = new NextResponse(text, { status: backendRes.status });

  // Optionally forward selected headers from backendRes (e.g. content-type)
  const contentType = backendRes.headers.get("content-type");
  if (contentType) resp.headers.set("content-type", contentType);

  return resp;
}
