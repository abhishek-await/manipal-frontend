export async function getCurrentUserServer(cookieHeader: string | undefined) {
  const BACKEND = process.env.NEXT_PUBLIC_API_URL || process.env.BACKEND_URL;
  const headers: Record<string,string> = { "Content-Type": "application/json" };
  if (cookieHeader) headers.cookie = cookieHeader;

  const res = await fetch(`${BACKEND}/accounts/user`, { headers, cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
