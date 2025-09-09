// features/support_groups/SupportGroupsClient.tsx
"use client"

import React, { useEffect, useMemo, useState } from 'react'
import SupportGroupCard from '@/features/support_groups/components/Card'
import SearchBar from '@/features/support_groups/components/SearchBar'
import Image from 'next/image'
import ChipCarouselEmbla, { ChipItem } from '@/features/support_groups/components/ChipCarousel'
import { SupportGroupCardProps as Card } from '@/features/support_groups/components/Card'
import { useRouter } from 'next/navigation'
import { groupApi } from './api/group.api'
import { authApi } from '../auth/api/auth.api'
import { startTransition } from "react";
import Link from "next/link";

const PAGE_SIZE = 4

type Stats = {
  totalGroups: number
  totalPatients: number
  totalExperts: number
  totalDiscussions: number
}

type Props = {
  initialGroups: Card[]
  initialChipItems: ChipItem[]
  initialStats: Stats
}

export default function SupportGroupsClient({ initialGroups, initialChipItems, initialStats }: Props) {
  const [q, setQ] = useState('')
  const router = useRouter()
  const goToSearch = () => {
    const params = new URLSearchParams();
    const qTrim = q?.trim();
    if (qTrim) params.set("q", qTrim);
    params.set("focus", "1"); // request focus on search page

    const qs = params.toString();
    const path = `/search${qs ? `?${qs}` : ""}`;

    // prefetch to help the navigation be faster (esp. on production)
    router.prefetch?.("/search");

    // low-priority navigation so UI remains snappy
    startTransition(() => {
      router.push(path);
    });
  };
  // use the server-rendered initial data (no client refetch by default)
  const [groups, setGroups] = useState<Card[]>(initialGroups ?? [])
  const [chipItems, setChipItems] = useState<ChipItem[]>(initialChipItems ?? [])
  const [stats, setStats] = useState<Stats | undefined>(initialStats)

  const [selectedChip, setSelectedChip] = useState<ChipItem | undefined>()
  const visibleGroups = useMemo(() => {
    if (!selectedChip) return groups
    return groups.filter((g: any) => {
      const catIdOrName = g?.category?.id ?? g?.category?.name ?? ''
      return String(catIdOrName) === selectedChip.id
    })
  }, [groups, selectedChip])

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [selectedChip, groups])

  const displayedGroups = useMemo(() => visibleGroups.slice(0, visibleCount), [visibleGroups, visibleCount])
  const handleLoadMore = () => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, visibleGroups.length))
  const allLoaded = visibleCount >= visibleGroups.length

  const [currentUser, setCurrentUser] = useState<any | null>(null)
  // map of groupId -> boolean (truthy = member)
  const [membershipMap, setMembershipMap] = useState<Record<string, boolean>>({})

  const pendingRef = React.useRef(new Set<string>())

  // load current user once
  useEffect(() => {
    let mounted = true
    async function fetchUser() {
      try {
        const u = await authApi.getCurrentUser()
        if (mounted) setCurrentUser(u)
      } catch (e) {
        if (mounted) setCurrentUser(null)
      }
    }
    fetchUser()
    return () => { mounted = false }
  }, [])

  // Initialize membershipMap entries for displayed groups so card reads have a value immediately.
  // This just seeds missing entries with server-provided c.isMember (if present) or false.
  useEffect(() => {
    if (!displayedGroups || displayedGroups.length === 0) return
    setMembershipMap((prev) => {
      const copy = { ...prev }
      displayedGroups.forEach((g) => {
        if (copy[g.id] === undefined) {
          // if the server-supplied card object included isMember, use it; otherwise default false
          copy[g.id] = Boolean((g as any).isMember) ?? false
        }
      })
      return copy
    })
  }, [displayedGroups])

  // ----- join / leave handlers -----
  const handleJoin = async (groupId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`)
      return
    }

    // mark pending to stop background checks from clobbering optimistic update
    pendingRef.current.add(String(groupId))

    // optimistic UI: set membershipMap and bump member count in groups state
    setMembershipMap((m) => ({ ...m, [groupId]: true }))
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, members: (g.members ?? 0) + 1 } : g))

    try {
      await groupApi.joinGroup(groupId)
      // success: keep optimistic state
    } catch (err: any) {
      // rollback on error
      setMembershipMap((m) => ({ ...m, [groupId]: false }))
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, members: Math.max((g.members ?? 1) - 1, 0) } : g))

      if (err?.message?.toLowerCase().includes('unauthorized')) {
        authApi.clearTokens?.()
        router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`)
        return
      }
      console.error('Join failed', err)
    } finally {
      // remove pending then revalidate membership (after slight delay)
      pendingRef.current.delete(String(groupId))

      setTimeout(async () => {
        try {
          const members = await groupApi.listMembers(groupId)
          const isMember = Array.isArray(members) && members.some((m: any) => String(m.id) === String(currentUser?.id))
          setMembershipMap((m) => ({ ...m, [groupId]: isMember }))
        } catch (e) {
          // keep optimistic state if validation fails
        }
      }, 600)
    }
  }

  const handleLeave = async (groupId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`)
      return
    }

    pendingRef.current.add(String(groupId))

    // optimistic UI
    setMembershipMap((m) => ({ ...m, [groupId]: false }))
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, members: Math.max((g.members ?? 1) - 1, 0) } : g))

    try {
      await groupApi.leaveGroup(groupId)
    } catch (err: any) {
      // rollback
      setMembershipMap((m) => ({ ...m, [groupId]: true }))
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, members: (g.members ?? 0) + 1 } : g))

      if (err?.message?.toLowerCase().includes('unauthorized')) {
        authApi.clearTokens?.()
        router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`)
        return
      }
      console.error('Leave failed', err)
    } finally {
      pendingRef.current.delete(String(groupId))

      setTimeout(async () => {
        try {
          const members = await groupApi.listMembers(groupId)
          const isMember = Array.isArray(members) && members.some((m: any) => String(m.id) === String(currentUser?.id))
          setMembershipMap((m) => ({ ...m, [groupId]: isMember }))
        } catch (e) {
          // ignore
        }
      }, 600)
    }
  }

  // UI
  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      <main className="w-full flex justify-center">
        <div className="w-full max-w-[420px] mx-auto px-4 sm:px-6">
          <section className="pt-8">
            <h1 className="text-[28px] leading-8 font-bold text-[#18448A] text-center">
              Find Patient
              <br />
              Support Groups
            </h1>
            <p className="mt-4 text-[14px] leading-5 text-center text-[#54555A]">
              Connect with others who understand your journey. Search for support groups by condition, location, or keywords.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
              <StatTile number={stats?.totalGroups?.toLocaleString() ?? '...'} label="Groups" iconSrc="/groups.svg" alt="Groups" />
              <StatTile number={stats?.totalPatients?.toLocaleString() ?? '...'} label="Patients & Caregivers" iconSrc="/users.svg" alt="Patients & Caregivers" />
              <StatTile number={stats?.totalExperts?.toLocaleString() ?? '...'} label="Health Experts" iconSrc="/experts.svg" alt="Health Experts" />
              <StatTile number={stats?.totalDiscussions?.toLocaleString() ?? '...'} label="Discussions" iconSrc="/discussions.svg" alt="Discussions" />
            </div>

            <div className="mt-12">
              <SearchBar value={q} onChange={setQ} onSubmit={() => {}} onClick={goToSearch} className="w-full" navigateOnInteract={true} />
            </div>

            <div className="mt-6">
              <p className="text-sm text-[#54555A]">Find by condition</p>
              <ChipCarouselEmbla
                className="mt-3"
                items={chipItems}
                selectedId={selectedChip?.id}
                onChange={(id) => {
                  if (id === selectedChip?.id) {
                    setSelectedChip(undefined)
                  } else {
                    const chip = chipItems.find((c) => c.id === id)
                    setSelectedChip(chip)
                  }
                }}
              />
            </div>
          </section>

          <section className="mt-8 w-full">
            <h2 className="text-[20px] font-bold text-[#18448A] text-center md:text-left">
              {selectedChip ? selectedChip.label : 'All'} Support Group(s)
            </h2>
            <p className="mt-1 text-[14px] text-[#54555A] text-center md:text-left">
              Showing {Math.min(displayedGroups.length, visibleGroups.length)} of {visibleGroups.length} groups
            </p>

            <div className="mt-4 flex flex-col items-center gap-4">
              {displayedGroups.length === 0 && (
                <div className="text-sm text-[#54555A]">No groups found.</div>
              )}

              {displayedGroups.map((c) => {
                const href = `/group/${c.id}`

                return (
                  <div key={c.id} className="w-full max-w-[360px] mx-auto">
                    {/* Wrap card in Link so Next can prefetch */}
                    <Link href={href} prefetch={true} className="block w-full" onPointerEnter={() => { router.prefetch?.(href) }}>
                      {/* Pass membershipMap value down to the card so it reflects optimistic changes immediately */}
                      <SupportGroupCard
                        {...c}
                        href={href}
                        className="w-full"
                        // <-- IMPORTANT: source membership from membershipMap (fallback to c.isMember)
                        isMember={Boolean(membershipMap[c.id] ?? (c as any).isMember)}
                        onJoin={() => handleJoin(c.id)}
                        onLeave={() => handleLeave(c.id)}
                      />
                    </Link>
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex justify-center">
              {!allLoaded ? (
                <button type="button" onClick={handleLoadMore} className="h-11 px-6 rounded-lg border border-[#16AF9F] text-[#16AF9F] text-sm font-medium">
                  Load More
                </button>
              ) : (
                <button type="button" disabled className="h-11 px-6 rounded-lg border border-[#E5E7EB] text-[#9AA6B2] text-sm font-medium cursor-not-allowed">
                  No more groups
                </button>
              )}
            </div>
          </section>

          <section className="mt-8 mb-10 rounded-none bg-gradient-to-b from-[#16AF9F] to-[#18448A] text-white -mx-6 px-6 py-8">
            <h2 className="text-[28px] leading-9 font-bold text-center">
              Can’t Find the Right
              <br />
              Support Group?
            </h2>
            <p className="mt-3 text-[14px] leading-5 text-center">Help us create the support group you need. Share your suggestion and we’ll work to make it happen.</p>

            <div className="mt-6 rounded-lg bg-white text-[#18448A]">
              <div className="h-10 rounded-t-lg bg-[#A4DBD6] flex items-center px-4 text-[14px] font-bold">What support group would you like to see?</div>
              <div className="p-4">
                <textarea rows={5} className="w-full rounded-md border border-[#E5E7EB] p-3 text-[14px] text-[#717176] placeholder-[#717176] outline-none focus:ring-2 focus:ring-[#16AF9F]" placeholder="Write here… your condition, support type, and meeting preference" />
              </div>
            </div>

            <div className="mt-4">
              <button type="button" className="w-full h-14 rounded-lg bg-[#16AF9F] text-white text-[16px] font-medium">Submit Suggestion</button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

// replace existing StatTile export
export function StatTile({
  number,
  label,
  iconSrc,
  alt,
}: {
  number: string | number;
  label: string;
  iconSrc: string;
  alt: string;
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center justify-center rounded-full bg-[#06AD9B1F] h-10 w-10 shrink-0">
        <Image src={iconSrc} alt={alt} width={40} height={40} />
      </div>

      <div className="flex flex-col">
        <div className="text-[18px] sm:text-[20px] leading-6 font-medium text-[#333333]">
          {number}
        </div>
        <div className="text-[12px] leading-4 text-[#7F7F7F]">
          {label}
        </div>
      </div>
    </div>
  );
}
