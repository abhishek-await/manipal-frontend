// pages.forwarded.bulk.tsx
// This single file contains three updated server page implementations that use the internal
// /api/forward route so backend sees cookies and refresh logic. Copy each section into the
// corresponding file in your app (or import a shared forwarder helper).

/* -------------------------------------------------------------------------- */
/* app/support-groups/page.tsx (forwarded)                                      */
/* -------------------------------------------------------------------------- */

export const dynamic = "force-dynamic";

import SupportGroupsClient from '@/features/support_groups/SupportGroupsClient'
import { SupportGroupCardProps as Card } from '@/features/support_groups/components/Card'
import { cookies } from 'next/headers';

type ChipItem = { id: string; label: string; count: number }
type Stats = {
  totalGroups: number
  totalPatients: number
  totalExperts: number
  totalDiscussions: number
}

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

// map raw backend group object -> Card shape used by UI
function mapToCard(g: any): Card {
  return {
    id: g.id,
    title: g.title,
    description: g.description,
    imageSrc: g.image_url ?? '/images/group-thumb.png',
    rating: Number(g.rating),
    updatedText: g.updated_at,
    members: g.total_members,
    experts: g.total_experts,
    avatars: [
      { src: '/avatars/omar.png', alt: 'Omar Darboe' },
      { src: '/avatars/fran.png', alt: 'Fran Perez' },
      { src: '/avatars/jane.png', alt: 'Jane Rotanson' },
    ],
    category: { id: g.category?.id ?? null, name: g.category?.name ?? 'Uncategorized' } as any,
    totalPosts: g.total_posts,
    growthPercentage: g.growth_percentage,
    isMember: g.is_member,
  }
}

export default async function Page() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? ''
  const serverBase = process.env.NEXT_SERVER_URL ?? `http://localhost:3000`;

  async function forwardFetchJson(path: string, method = 'GET') {
    try {
      const payload = { path, method }
      const res = await fetch(`${serverBase}/api/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })
      if (!res.ok) return null
      return await res.json().catch(() => null)
    } catch (e) {
      console.error('forwardFetchJson error', e)
      return null
    }
  }

  // try fetching groups via forwarder so backend can personalize (is_member, etc.)
  let rawGroups: any[] | null = null
  try {
    rawGroups = await forwardFetchJson(`${API_BASE}/support-groups/groups/`, 'GET')
  } catch (e) {
    console.warn('Could not fetch groups via forwarder', e)
    rawGroups = null
  }

  // fallback: empty array
  const groupsRaw = Array.isArray(rawGroups) ? rawGroups : []
  const apiGroups = groupsRaw.map(mapToCard)

  const chipItems = apiGroups.length ? buildChipItemsFromGroups(apiGroups) : []
  const stats = apiGroups.length ? buildStatsFromGroups(apiGroups) : { totalGroups: apiGroups.length, totalPatients: 0, totalExperts: 0, totalDiscussions: 0 }

  return (
    <SupportGroupsClient
      initialGroups={apiGroups as Card[]}
      initialChipItems={chipItems}
      initialStats={stats}
    />
  )
}