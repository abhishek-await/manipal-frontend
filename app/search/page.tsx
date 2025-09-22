import React, { Suspense } from 'react'
import SearchPageClient from '@/features/search/SearchPageClient'
import { SupportGroupCardProps as Card } from '@/features/support_groups/components/Card'
import { cookies as nextCookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function PageSearch() {
  const cookieStore = await nextCookies();
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

  try {
    const allGroupsRaw = (await forwardFetchJson(`${API_BASE}/support-groups/groups/`, 'GET')) ?? []

    const sorted = (Array.isArray(allGroupsRaw) ? allGroupsRaw : []).slice().sort((a: any, b: any) => {
      const ga = Number(a?.growth_percentage ?? a?.growthPercentage ?? 0)
      const gb = Number(b?.growth_percentage ?? b?.growthPercentage ?? 0)
      return gb - ga
    })

    const trending = sorted.slice(0, 4).map((g: any) => ({
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
      growthPercentage: g.growth_percentage ?? g.growthPercentage,
    })) as Card[]

    // fetch current user server-side (via forwarder)
    let initialCurrentUser: any | null = null
    const me = await forwardFetchJson(`${API_BASE}/accounts/user`, 'GET')
    if (me) initialCurrentUser = me

    return (
      <Suspense fallback={<div className="w-full max-w-[375px] mx-auto p-6">Loading…</div>}>
        <SearchPageClient initialTrending={trending} initialCurrentUser={initialCurrentUser} />
      </Suspense>
    )
  } catch (err) {
    console.error('[Search Page] Error fetching trending groups ', err)
    return (
      <Suspense fallback={<div className="w-full max-w-[375px] mx-auto p-6">Loading…</div>}>
        <SearchPageClient initialTrending={[]} initialCurrentUser={null} />
      </Suspense>
    )
  }
}
