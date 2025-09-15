"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { SupportGroupCardProps as Card } from "@/features/support_groups/components/Card";
import Image from "next/image";
import SearchBar from "@/features/support_groups/components/SearchBar";
import SupportGroupCard from "@/features/support_groups/components/Card";
import { useRouter, useSearchParams } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "../auth/api/auth.api";

type Props = {
  initialTrending: Card[];
};

export default function SearchPageClient({ initialTrending = [] }: Props) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [results, setResults] = useState<Card[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const [trending, setTrending] = useState<Card[]>(initialTrending.slice(0, 4));
  const trendingMemo = useMemo(() => trending.slice(0, 4), [trending]);

  // focus handling: if ?focus=1 present, focus the input on mount
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
        } catch (err) {}
      }, 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // prevent duplicate join/leave clicks
  const pendingRef = useRef<Set<string>>(new Set());

  // Utility to read the server-provided flag (supports isMember or is_member)
  const getIsMemberFlag = (c: Card) => {
    return Boolean((c as any).isMember ?? (c as any).is_member ?? false);
  };

  // Helpers to update the is_member flag in arrays (optimistic update)
  function setGroupIsMemberInArrays(groupId: string, isMember: boolean) {
    setResults((prev) => prev.map((g) => (String(g.id) === String(groupId) ? { ...(g as any), is_member: isMember, isMember } : g)));
    setTrending((prev) => prev.map((g) => (String(g.id) === String(groupId) ? { ...(g as any), is_member: isMember, isMember } : g)));
  }

  // Join / Leave handlers (optimistic) — no listMembers checks
  const handleJoin = async (groupId: string) => {
    if (pendingRef.current.has(String(groupId))) return;
    pendingRef.current.add(String(groupId));

    // optimistic UI
    setGroupIsMemberInArrays(groupId, true);

    try {
      await groupApi.joinGroup(groupId);
      // success: keep optimistic state
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
    if (pendingRef.current.has(String(groupId))) return;
    pendingRef.current.add(String(groupId));

    // optimistic UI
    setGroupIsMemberInArrays(groupId, false);

    try {
      await groupApi.leaveGroup(groupId);
      // success: keep optimistic state
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

  // displayed groups
  const displayedGroups = useMemo(() => (isSearching ? results : trendingMemo), [isSearching, results, trendingMemo]);

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
          {!isSearching ? "Top trending support groups" : loading ? "Searching…" : `Showing “${query.trim()}” support groups${typeof total === "number" ? ` (${total})` : ""}`}
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
            <div className="w-full max-w-[342px] mx-auto bg-[#F7F7F7] rounded-[12px] p-6 flex flex-col items-center text-center">
              <Image src="/no-results.svg" alt="no results icon" width={48} height={48} className="mb-2 opacity-60" />
              <div className="text-[20px] font-medium text-[#333333]">No Group Found</div>
            </div>
          )}

          {!loading &&
            (isSearching ? results.map((c) => (
              <SupportGroupCard
                key={c.id}
                {...c}
                isMember={Boolean((c as any).isMember ?? (c as any).is_member ?? false)}
                onJoin={() => handleJoin(String(c.id))}
                onLeave={() => handleLeave(String(c.id))}
              />
            )) : trendingMemo.map((c) => (
              <SupportGroupCard
                key={c.id}
                {...c}
                isMember={Boolean((c as any).isMember ?? (c as any).is_member ?? false)}
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

