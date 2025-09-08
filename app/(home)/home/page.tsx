// app/support-groups/page.tsx
export const dynamic = "force-dynamic";

import SupportGroupsClient from '@/features/support_groups/SupportGroupsClient'
import { groupApi } from '@/features/support_groups/api/group.api'
import { SupportGroupCardProps as Card } from '@/features/support_groups/components/Card'
import { cookies } from 'next/headers';

type ChipItem = { id: string; label: string; count: number }
type Stats = {
  totalGroups: number
  totalPatients: number
  totalExperts: number
  totalDiscussions: number
}

// async function fetchRawGroupsIfNeeded(sample: any[] | undefined) {
//   // if sample appears to contain category info, return undefined (no extra fetch)
//   if (Array.isArray(sample) && sample.length > 0 && sample[0].category) return undefined

//   const API_BASE = process.env.NEXT_PUBLIC_API_URL
//   if (!API_BASE) return undefined

//   try {
//     const res = await fetch(`${API_BASE}/support-groups/groups`, { cache: 'no-store' })
//     if (!res.ok) return undefined
//     return await res.json()
//   } catch (e) {
//     // swallow — we'll render without categories if fetch fails
//     return undefined
//   }
// }

function buildChipItemsFromGroups(groups: Card[]): ChipItem[] {
  const map = new Map<string, ChipItem>()
  groups.forEach((g) => {
    const cat = g.category
    const label = cat?.name ?? 'Uncategorized'
    const id = String(cat?.id ?? label)
    const existing = map.get(id)
    if (existing) existing.count += 1
    else map.set(id, { id, label, count: 1 })
  })
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

function buildStatsFromGroups(groups: Card[]): Stats {
  const totalGroups = groups.length
  let totalPatients = 0
  let totalExperts = 0
  let totalDiscussions = 0

  groups.forEach((g) => {
    totalPatients += Number(g.members ?? 0)
    totalExperts += Number(g.experts ?? 0)
    totalDiscussions += Number(g.totalPosts ?? 0)
  })

  return { totalGroups, totalPatients, totalExperts, totalDiscussions }
}

export default async function Page() {
  // Use your API helper (no modifications to it)
  const cookieStore = await cookies()
  const access = cookieStore.get('accessToken')?.value ?? ""
  const apiGroups = await groupApi.getGroups(access) // <-- your function used here

  // If apiGroups already include category, use them directly for chips/stats.
  // Otherwise fetch raw objects from backend only for building chips/stats.
  // const rawFallback = await fetchRawGroupsIfNeeded(apiGroups)
  const sourceForAgg = apiGroups

  const chipItems = Array.isArray(sourceForAgg) ? buildChipItemsFromGroups(sourceForAgg) : []
  const stats = Array.isArray(sourceForAgg) ? buildStatsFromGroups(sourceForAgg) : {
    totalGroups: Array.isArray(apiGroups) ? apiGroups.length : 0,
    totalPatients: 0,
    totalExperts: 0,
    totalDiscussions: 0,
  }

  console.log("Groups: ", apiGroups)
  // Pass server-computed values down to the client component
  return (
    // SupportGroupsClient should accept these props (initialGroups, initialChipItems, initialStats)
    <SupportGroupsClient
      initialGroups={apiGroups as Card[]}
      initialChipItems={chipItems}
      initialStats={stats}
    />
  )
}
