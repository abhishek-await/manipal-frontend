// app/search/page.tsx
import React, { Suspense } from "react";
import SearchPageClient from "@/features/search/SearchPageClient";
import { groupApi } from "@/features/support_groups/api/group.api";
import { SupportGroupCardProps as Card } from "@/features/support_groups/components/Card";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const cookieStore = await cookies();
    const access = cookieStore.get("accessToken")?.value ?? "";

    // fetch groups (server-side)
    const allGroups = (await groupApi.getGroups(access)) as any[];

    const sorted = (allGroups ?? []).slice().sort((a, b) => {
      const ga = Number(a?.growthPercentage ?? 0);
      const gb = Number(b?.growthPercentage ?? 0);
      return gb - ga;
    });

    const trending = sorted.slice(0, 4) as Card[];

    // fetch current user server-side (if we have an access token)
    let initialCurrentUser: any | null = null;
    if (access) {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
        const USER_URL = `${API_BASE}/accounts/user`; // adjust if your endpoint differs
        const userRes = await fetch(USER_URL, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${access}`,
          },
          cache: "no-store",
        });
        if (userRes.ok) {
          initialCurrentUser = await userRes.json();
        } else {
          // token invalid or other; ignore — client can retry if necessary
          console.warn("[search] user fetch non-ok", userRes.status);
        }
      } catch (err) {
        console.warn("[search] failed to fetch user server-side", err);
      }
    }

    return (
      <Suspense fallback={<div className="w-full max-w-[375px] mx-auto p-6">Loading…</div>}>
        <SearchPageClient initialTrending={trending} initialCurrentUser={initialCurrentUser} />
      </Suspense>
    );
  } catch (err) {
    console.error("[Search Page] Error fetching trending groups ", err);
    return (
      <Suspense fallback={<div className="w-full max-w-[375px] mx-auto p-6">Loading…</div>}>
        <SearchPageClient initialTrending={[]} initialCurrentUser={null} />
      </Suspense>
    );
  }
}
