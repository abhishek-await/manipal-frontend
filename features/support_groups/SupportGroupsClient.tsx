"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import SupportGroupCard from "@/features/support_groups/components/Card";
import SearchBar from "@/features/support_groups/components/SearchBar";
import Image from "next/image";
import ChipCarouselEmbla, { ChipItem } from "@/features/support_groups/components/ChipCarousel";
import { SupportGroupCardProps as Card } from "@/features/support_groups/components/Card";
import { useRouter } from "next/navigation";
import { groupApi } from "./api/group.api";
import { authApi } from "../auth/api/auth.api";
import Link from "next/link";

import { LayoutGroup, motion, AnimatePresence } from "framer-motion";
import SearchPageClient from "@/features/search/SearchPageClient";
import { useSearchStore } from "../search/searchStore";

const PAGE_SIZE = 4;

type Stats = {
  totalGroups: number;
  totalPatients: number;
  totalExperts: number;
  totalDiscussions: number;
};

type Props = {
  initialGroups: Card[];
  initialChipItems: ChipItem[];
  initialStats: Stats;
};

export default function SupportGroupsClient({ initialGroups, initialChipItems, initialStats }: Props) {
  const router = useRouter();

  // --- search / morph state ---
  const { isSearchOpen, openSearch, closeSearch, q, setQ } = useSearchStore();

  const initialTrending = useMemo(() => {
    if (!Array.isArray(initialGroups)) return [];
    return (initialGroups.slice().sort((a, b) => {
      const ga = Number((a as any).growthPercentage ?? 0);
      const gb = Number((b as any).growthPercentage ?? 0);
      return gb - ga;
    })).slice(0, 4) as Card[];
  }, [initialGroups]);

  const [groups, setGroups] = useState<Card[]>(initialGroups ?? []);
  const [chipItems, setChipItems] = useState<ChipItem[]>(initialChipItems ?? []);
  const [stats, setStats] = useState<Stats | undefined>(initialStats);

  const [selectedChip, setSelectedChip] = useState<ChipItem | undefined>();
  const visibleGroups = useMemo(() => {
    if (!selectedChip) return groups;
    return groups.filter((g: any) => {
      const catIdOrName = g?.category?.id ?? g?.category?.name ?? "";
      return String(catIdOrName) === selectedChip.id;
    });
  }, [groups, selectedChip]);

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedChip]);

  // If visibleGroups becomes smaller than the current visibleCount, clamp it down
  useEffect(() => {
    setVisibleCount((prev) => Math.min(prev, visibleGroups.length || 0));
  }, [visibleGroups.length]);

  const displayedGroups = useMemo(() => visibleGroups.slice(0, visibleCount), [visibleGroups, visibleCount]);
  const handleLoadMore = () => setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, visibleGroups.length));
  const allLoaded = visibleCount >= visibleGroups.length;

  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [membershipMap, setMembershipMap] = useState<Record<string, boolean>>({});
  const pendingRef = React.useRef(new Set<string>());

  // New: keep track of which group (by id) we're currently showing a loader for
  const [navigatingGroupId, setNavigatingGroupId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchUser() {
      try {
        const u = await authApi.getCurrentUser();
        if (mounted) setCurrentUser(u);
      } catch (e) {
        console.error(e);
        if (mounted) setCurrentUser(null);
      }
    }
    fetchUser();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!displayedGroups || displayedGroups.length === 0) return;
    setMembershipMap((prev) => {
      const copy = { ...prev };
      displayedGroups.forEach((g) => {
        if (copy[g.id] === undefined) {
          copy[g.id] = Boolean((g as any).isMember) ?? false;
        }
      });
      return copy;
    });
  }, [displayedGroups]);

  const handleJoin = async (groupId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
      return;
    }
    pendingRef.current.add(String(groupId));
    setMembershipMap((m) => ({ ...m, [groupId]: true }));
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: (g.members ?? 0) + 1 } : g)));
    try {
      await groupApi.joinGroup(groupId);
    } catch (err: any) {
      setMembershipMap((m) => ({ ...m, [groupId]: false }));
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: Math.max((g.members ?? 1) - 1, 0) } : g)));
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
        return;
      }
      console.error("Join failed", err);
    } finally {
      pendingRef.current.delete(String(groupId));
      setTimeout(async () => {
        try {
          const members = await groupApi.listMembers(groupId);
          const isMember = Array.isArray(members) && members.some((m: any) => String(m.id) === String(currentUser?.id));
          setMembershipMap((m) => ({ ...m, [groupId]: isMember }));
        } catch (e) {
          console.error(e);
        }
      }, 600);
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
      return;
    }
    pendingRef.current.add(String(groupId));
    setMembershipMap((m) => ({ ...m, [groupId]: false }));
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: Math.max((g.members ?? 1) - 1, 0) } : g)));
    try {
      await groupApi.leaveGroup(groupId);
    } catch (err: any) {
      setMembershipMap((m) => ({ ...m, [groupId]: true }));
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: (g.members ?? 0) + 1 } : g)));
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
        return;
      }
      console.error("Leave failed", err);
    } finally {
      pendingRef.current.delete(String(groupId));
      setTimeout(async () => {
        try {
          const members = await groupApi.listMembers(groupId);
          const isMember = Array.isArray(members) && members.some((m: any) => String(m.id) === String(currentUser?.id));
          setMembershipMap((m) => ({ ...m, [groupId]: isMember }));
        } catch (e) {
          console.error(e);
        }
      }, 600);
    }
  };

  // add inside SupportGroupsClient (client component)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timer: number | null = null;

    const shouldRefreshForPath = (path: string) => {
      // adjust if your home route is different
      return path === "/home" || path === "/";
    };

    const scheduleRefreshIfHome = (source?: string) => {
      try {
        // Only refresh if we're now on the home route
        const path = window.location.pathname;
        if (!shouldRefreshForPath(path)) return;

        // tiny debounce to let navigation settle (avoid racing with SPA nav)
        if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
        timer = window.setTimeout(() => {
          try {
            router.refresh();
            // optional: console.log to help debug in dev
            // console.log("router.refresh triggered by", source ?? "unknown");
          } catch (e) {
            console.warn("router.refresh failed", e);
          }
        }, 60); // 60ms usually enough; increase to 150ms if you see race issues
      } catch (e) {
        console.warn("scheduleRefreshIfHome error", e);
      }
    };

    // When the page is restored from the bfcache (mobile browsers, back/forward)
    const onPageShow = (e: PageTransitionEvent) => {
      // If persisted flag true -> restored from bfcache. We still call refresh anyway.
      scheduleRefreshIfHome("pageshow");
    };

    // popstate fires on history navigation (back/forward)
    const onPopState = () => {
      scheduleRefreshIfHome("popstate");
    };

    // visibilitychange can catch some cases where page becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleRefreshIfHome("visibilitychange");
    };

    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router]);


  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      <main className="w-full flex justify-center">
        <div className="w-full max-w-[420px] mx-auto px-4 sm:px-6">
          <LayoutGroup>
            <div className="pt-4">
              <AnimatePresence mode="wait">
                {!isSearchOpen ? (
                  <motion.div
                    key="home-header"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
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
                      <motion.div layoutId="search-bar" className="w-full h-12 relative">
                        <SearchBar
                          value={q}
                          onChange={setQ}
                          onSubmit={() => {}}
                          onClick={openSearch}
                          className="w-full h-full"
                          navigateOnInteract={false}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="search-header"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        aria-label="Back"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={closeSearch}
                      >
                        <img src="/arrow-left.svg" alt="Back" className="h-6 w-6 object-contain" />
                      </button>
                      <div className="flex-1">
                        <motion.div layoutId="search-bar" className="w-full h-12 relative">
                          <SearchBar
                            value={q}
                            onChange={setQ}
                            placeholder="Find a support group"
                            navigateOnInteract={false}
                            autoFocus={true}
                            className="w-full h-full"
                            onClick={() => {}}
                          />
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </LayoutGroup>

          <div className="">
            <AnimatePresence mode="wait" onExitComplete={() => setQ("")}>
              {!isSearchOpen ? (
                <motion.div
                  key="home-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  <div>
                    <div className="mt-6">
                      <p className="text-sm text-[#54555A]">Find by condition</p>
                      <ChipCarouselEmbla
                        className="mt-3"
                        items={chipItems}
                        selectedId={selectedChip?.id}
                        onChange={(id) => {
                          if (id === selectedChip?.id) {
                            setSelectedChip(undefined);
                          } else {
                            const chip = chipItems.find((c) => c.id === id);
                            setSelectedChip(chip);
                          }
                        }}
                      />
                    </div>

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
                          const href = `/group/${c.id}`;

                          const isNavigating = navigatingGroupId === c.id;

                          return (
                            <div key={c.id} className="w-full max-w-[360px] mx-auto">
                              <Link
                                href={href}
                                prefetch={false}
                                className="block w-full"
                                // onPointerEnter={() => { router.prefetch?.(href); }}
                                onClick={(e) => {
                                  // intercept navigation to show spinner first
                                  e.preventDefault();

                                  // set which group is navigating
                                  setNavigatingGroupId(c.id);

                                  // optional haptic feedback
                                  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                                    try { navigator.vibrate(10); } catch {}

                                  }

                                  // allow one paint/frame for the spinner to appear, then navigate
                                  if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
                                    window.requestAnimationFrame(() => {
                                      router.push(href);
                                    });
                                  } else {
                                    // fallback microtask
                                    setTimeout(() => router.push(href), 0);
                                  }

                                  // safety: clear spinner after a short timeout if navigation fails
                                  setTimeout(() => {
                                    setNavigatingGroupId((cur) => (cur === c.id ? null : cur));
                                  }, 1500);
                                }}
                              >
                                <div className={`relative transition-all duration-150 ${isNavigating ? 'scale-[0.98] opacity-70' : ''}`}>
                                  <SupportGroupCard
                                    {...c}
                                    href={href}
                                    className="w-full"
                                    isMember={Boolean(membershipMap[c.id] ?? (c as any).isMember)}
                                    onJoin={() => handleJoin(c.id)}
                                    onLeave={() => handleLeave(c.id)}
                                  />

                                  {/* Loading overlay: made to match PostCard spinner */}
                                  {isNavigating && (
                                    <div className="absolute inset-0 bg-white/60 rounded-[12px] z-20 flex items-center justify-center pointer-events-none">
                                      <div className="rounded-full bg-white/80 p-2 shadow flex items-center justify-center">
                                        <Spinner />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </Link>
                            </div>
                          );
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
                </motion.div>
              ) : (
                <motion.div
                  key="search-body"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16 }}
                >
                  <SearchPageClient
                    initialTrending={initialTrending}
                    initialCurrentUser={null}
                    hideSearchBar={true}
                    onClose={closeSearch}
                    query={q}
                    onQueryChange={setQ}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}

// Spinner used in overlays (matches PostCard spinner style)
function Spinner() {
  return (
    <svg
      className="animate-spin h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// StatTile unchanged
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
