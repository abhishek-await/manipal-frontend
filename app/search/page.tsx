// app/search/page.tsx
import React, { Suspense } from "react";
import SearchPageClient from "@/features/search/SearchPageClient";
import { groupApi } from "@/features/support_groups/api/group.api";
import { SupportGroupCardProps as Card } from "@/features/support_groups/components/Card";

// Tell Next this route is dynamic (allows server fetches with no-store)
export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    // run server-side fetch (groupApi.getGroups uses cache: "no-store")
    const allGroups = (await groupApi.getGroups()) as any[];

    const sorted = (allGroups ?? []).slice().sort((a, b) => {
      const ga = Number(a?.growthPercentage ?? 0);
      const gb = Number(b?.growthPercentage ?? 0);
      return gb - ga;
    });

    const trending = sorted.slice(0, 4) as Card[];

    // Wrap client component in Suspense so client-only hooks (useSearchParams/useRouter) are ok
    return (
      <Suspense fallback={<div className="w-full max-w-[375px] mx-auto p-6">Loading…</div>}>
        <SearchPageClient initialTrending={trending} />
      </Suspense>
    );
  } catch (err) {
    console.error("[Search Page] Error fetching trending groups ", err);
    return (
      <Suspense fallback={<div className="w-full max-w-[375px] mx-auto p-6">Loading…</div>}>
        <SearchPageClient initialTrending={[]} />
      </Suspense>
    );
  }
}
