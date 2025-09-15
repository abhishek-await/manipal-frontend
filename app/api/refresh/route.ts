// app/api/refresh/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL;
const isProd = process.env.NODE_ENV === "production";

export async function POST() {
  const cookieStore = await cookies();
  // Build cookie header to forward to backend
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");
  const refreshToken = cookieStore.get('refreshToken')

  const backendRes = await fetch(`${BACKEND}/auth/token/refresh/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader,
    },
    body: JSON.stringify({refresh: refreshToken}),
  });

  if (!backendRes.ok) {
    cookieStore.delete("accessToken");
    cookieStore.delete("refreshToken");
    return NextResponse.json({ message: "refresh failed" }, { status: 401 });
  }

  const data = await backendRes.json();
  if (data.access) {
    cookieStore.set({
      name: "accessToken",
      value: data.access,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 15,
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

  return NextResponse.json({ ok: true });
}