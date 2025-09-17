// app/api/token/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  const { access, refresh } = await req.json();
  if (!access || !refresh) return NextResponse.json({ message: "missing tokens" }, { status: 400 });

  console.log(`[Token API] access: ${access}, refresh: ${refresh}`)

  try {
    const c = await cookies();
  c.set({
    name: "accessToken",
    value: access,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
    secure: isProd,
  });
  c.set({
    name: "refreshToken",
    value: refresh,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: isProd,
  });

  return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({
      message: "Couldn't save tokens in cookies",
      error: error
    },{status: 500})
  }
}

export async function DELETE() {
  const c = await cookies();
  c.delete("accessToken");
  c.delete("refreshToken");
  return NextResponse.json({ ok: true });
}
