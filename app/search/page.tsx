// app/search/page.tsx
import SearchPageClient from '@/features/search/SearchPageClient'
import { groupApi } from '@/features/support_groups/api/group.api'
import { SupportGroupCardProps as Card } from '@/features/support_groups/components/Card'

export default async function Page() {
  try {
    // Use your existing helper (runs server-side here)
    const allGroups = (await groupApi.getGroups()) as any[] // keep as any to read growthPercentage

    // sort by growthPercentage desc and take top 4 (or all if < 4)
    const sorted = (allGroups ?? []).slice().sort((a, b) => {
      const ga = Number(a?.growthPercentage ?? 0)
      const gb = Number(b?.growthPercentage ?? 0)
      return gb - ga
    })

    const trending = sorted.slice(0, 4) as Card[]

    // pass only trending groups for SSR — search remains client-side
    return <SearchPageClient initialTrending={trending} />
  } catch (err) {
    // on error, render client with empty trending (client will still work for searches)
    return <SearchPageClient initialTrending={[]} />
  }
}
