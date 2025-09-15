"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SupportGroupCardProps as Card } from "@/features/support_groups/components/Card";
import Image from "next/image";
import SearchBar from "@/features/support_groups/components/SearchBar";
import SupportGroupCard from "@/features/support_groups/components/Card";
import { useRouter, useSearchParams } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";

type Props = {
  initialTrending: Card[];
  initialCurrentUser?: any | null;
};

export default function SearchPageClient({ initialTrending = [], initialCurrentUser = null }: Props) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [results, setResults] = useState<Card[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const [trending, setTrending] = useState<Card[]>(initialTrending.slice(0, 4));
  const trendingMemo = useMemo(() => trending.slice(0, 4), [trending]);

  // optional server-hydrated user or fetch on client
  const [currentUser, setCurrentUser] = useState<any | null>(initialCurrentUser ?? null);

  // membershipMap seeded from server flags (is_member / isMember)
  const [membershipMap, setMembershipMap] = useState<Record<string, boolean>>({});

  const pendingRef = useRef<Set<string>>(new Set());

  // focus handling for ?focus=1
  useEffect(() => {
    const focusFlag = searchParams?.get("focus");
    if (focusFlag === "1") {
      setTimeout(() => {
        const el = document.querySelector<HTMLInputElement>('input[name="q"]');
        if (el) el.focus();
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("focus");
          window.history.replaceState({}, "", url.toString());
        } catch {}
      }, 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hydrate currentUser client-side if server didn't provide
  useEffect(() => {
    if (initialCurrentUser) return;
    let mounted = true;
    (async () => {
      try {
        const u = await authApi.getCurrentUser().catch(() => null);
        if (!mounted) return;
        setCurrentUser(u ?? null);
      } catch {
        if (!mounted) return;
        setCurrentUser(null);
      }
    })();
    return () => { mounted = false; };
  }, [initialCurrentUser]);

  // debounced search
  useEffect(() => {
    const q = query.trim();
    if (q === "") {
      setResults([]);
      setTotal(undefined);
      setLoading(false);
      return;
    }

    setLoading(true);
    let aborted = false;
    const controller = new AbortController();

    const id = setTimeout(async () => {
      try {
        const res = await groupApi.searchGroup(q, { signal: controller.signal });
        if (aborted) return;
        setResults(res as Card[]);
        setTotal(Array.isArray(res) ? (res as Card[]).length : 0);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("Search failed", err);
        setResults([]);
        setTotal(0);
      } finally {
        if (!aborted) setLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(id);
      controller.abort();
      aborted = true;
    };
  }, [query]);

  const isSearching = query.trim().length > 0;
  const noResults = !loading && isSearching && results.length === 0;

  // Helper to read server flag (supports both fields)
  const readServerMembershipFlag = (g: Card) => {
    const anyG = g as any;
    if (anyG.is_member !== undefined) return Boolean(anyG.is_member);
    if (anyG.isMember !== undefined) return Boolean(anyG.isMember);
    return undefined;
  };

  // Seed membershipMap from server flags whenever results or trending update
  useEffect(() => {
    const seed: Record<string, boolean> = {};
    const src = isSearching ? results : trendingMemo;
    src.forEach((g) => {
      const flag = readServerMembershipFlag(g);
      if (flag !== undefined) seed[String(g.id)] = flag;
    });
    if (Object.keys(seed).length > 0) {
      setMembershipMap((m) => ({ ...m, ...seed }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, trendingMemo, isSearching]);

  // optimistic updates helper
  function setGroupIsMemberInArrays(groupId: string, isMember: boolean) {
    setResults((prev) => prev.map((g) => (String(g.id) === String(groupId) ? { ...(g as any), is_member: isMember, isMember } : g)));
    setTrending((prev) => prev.map((g) => (String(g.id) === String(groupId) ? { ...(g as any), is_member: isMember, isMember } : g)));
    setMembershipMap((m) => ({ ...m, [groupId]: isMember }));
  }

  // Join / Leave (optimistic). Require auth redirect on missing user.
  const handleJoin = async (groupId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
      return;
    }
    if (pendingRef.current.has(String(groupId))) return;
    pendingRef.current.add(String(groupId));

    setGroupIsMemberInArrays(groupId, true);

    try {
      await groupApi.joinGroup(groupId);
    } catch (err: any) {
      // rollback
      setGroupIsMemberInArrays(groupId, false);
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
        return;
      }
      console.error("Join failed", err);
    } finally {
      pendingRef.current.delete(String(groupId));
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
      return;
    }
    if (pendingRef.current.has(String(groupId))) return;
    pendingRef.current.add(String(groupId));

    setGroupIsMemberInArrays(groupId, false);

    try {
      await groupApi.leaveGroup(groupId);
    } catch (err: any) {
      // rollback
      setGroupIsMemberInArrays(groupId, true);
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
        return;
      }
      console.error("Leave failed", err);
    } finally {
      pendingRef.current.delete(String(groupId));
    }
  };

  // Determine isMember to send to card: membershipMap -> server flag -> false
  const getIsMemberForRender = (g: Card) => {
    const id = String(g.id);
    if (membershipMap[id] !== undefined) return Boolean(membershipMap[id]);
    const serverFlag = readServerMembershipFlag(g);
    if (serverFlag !== undefined) return Boolean(serverFlag);
    return false;
  };

  const displayedGroups = useMemo(() => {
    if (isSearching) return results;
    return trendingMemo;
  }, [isSearching, results, trendingMemo]);

  return (
    <main className="min-h-screen w-full bg-white flex justify-center items-start">
      <div className="w-full max-w-[375px] px-4 pb-[max(24px,env(safe-area-inset-bottom))] mx-auto">
        <div className="flex items-center gap-3 pt-4">
          <button type="button" aria-label="Back" className="h-6 w-6 flex-shrink-0" onClick={() => router.back()}>
            <img src="/arrow-left.svg" alt="Back" className="h-6 w-6 object-contain" />
          </button>

          <div className="relative flex-1">
            <SearchBar
              value={query}
              onChange={(val: string) => setQuery(val)}
              placeholder="Find a support group"
              navigateOnInteract={false}
              autoFocus={false}
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5"
              >
                <Image src="/close.svg" alt="Clear" width={11.09} height={11.09} />
              </button>
            )}
          </div>
        </div>

        <h2 className="mt-6 text-[16px] leading-6 font-medium text-[#333333]">
          {!isSearching
            ? "Top trending support groups"
            : loading
            ? "Searching…"
            : `Showing “${query.trim()}” support groups${typeof total === "number" ? ` (${total})` : ""}`}
        </h2>

        <div className="mt-4 space-y-4">
          {loading && (
            <div className="rounded-xl border border-[#E5E7EB] p-4">
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-lg bg-gray-200 animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
                  <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
                  <div className="mt-3 h-3 w-4/5 rounded bg-gray-200 animate-pulse" />
                  <div className="mt-1 h-3 w-3/5 rounded bg-gray-200 animate-pulse" />
                  <div className="mt-3 h-9 w-full rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {noResults && (
            <>
              <div className="w-full max-w-[342px] mx-auto bg-[#F7F7F7] rounded-[12px] p-6 flex flex-col items-center text-center">
                <Image src="/no-results.svg" alt="no results icon" width={48} height={48} className="mb-2 opacity-60" />
                <div className="text-[20px] font-medium text-[#333333]">No Group Found</div>
                <div className="mt-2 text-sm text-[#6B7280]">Here are trending groups you might be interested in</div>
              </div>

              {/* trending fallback */}
              <div className="mt-4 space-y-4">
                {trendingMemo.map((c) => (
                  <SupportGroupCard
                    key={c.id}
                    {...c}
                    isMember={getIsMemberForRender(c)}
                    onJoin={() => handleJoin(String(c.id))}
                    onLeave={() => handleLeave(String(c.id))}
                  />
                ))}
              </div>
            </>
          )}

          {!loading && !noResults &&
            (displayedGroups.map((c) => (
              <SupportGroupCard
                key={c.id}
                {...c}
                isMember={getIsMemberForRender(c)}
                onJoin={() => handleJoin(String(c.id))}
                onLeave={() => handleLeave(String(c.id))}
              />
            )))
          }
        </div>

        <div className="h-6" />
      </div>
    </main>
  );
}
