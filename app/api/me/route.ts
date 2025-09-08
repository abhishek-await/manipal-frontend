// app/api/me/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL;

export async function GET() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");

  const backendRes = await fetch(`${BACKEND}/accounts/user`, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      "Content-Type": "application/json",
    },
  });

  const text = await backendRes.text();
  return new NextResponse(text, { status: backendRes.status });
}
