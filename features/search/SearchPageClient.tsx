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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [results, setResults] = useState<Card[]>([]);
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);

  const [trending, setTrending] = useState<Card[]>(initialTrending.slice(0, 4));
  const trendingMemo = useMemo(() => trending.slice(0, 4), [trending]);

  // focus handling: if ?focus=1 present, focus the input on mount
  useEffect(() => {
    const focusFlag = searchParams?.get("focus");
    if (focusFlag === "1") {
      // small timeout to ensure element exists and mobile keyboard shows reliably
      setTimeout(() => {
        // attempt to find the input by name 'q'
        const el = document.querySelector<HTMLInputElement>('input[name="q"]');
        if (el) {
          el.focus();
          // iOS/Android keyboard usually appears when focus is called after a short delay
        }
        // remove focus param from URL so it's clean
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("focus");
          window.history.replaceState({}, "", url.toString());
        } catch (err) {
          // ignore
        }
      }, 80);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounced search (same as before)
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
        if (err?.name === "AbortError") {
          return;
        }
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

  // membership & join/leave handlers (keep your existing implementations)
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [membershipMap, setMembershipMap] = useState<Record<string, boolean>>({});
  const pendingRef = useRef<Map<string, "join" | "leave">>(new Map());

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await authApi.getCurrentUser();
        if (mounted) setCurrentUser(u);
      } catch (e) {
        if (mounted) setCurrentUser(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // compute currently displayed groups: either search results (if searching) else trending
  const displayedGroups = useMemo(() => (isSearching ? results : trendingMemo), [isSearching, results, trendingMemo]);

  // membership checks (same logic as your current file)
  useEffect(() => {
    let mounted = true;
    if (!displayedGroups || displayedGroups.length === 0) return;

    if (!currentUser) {
      setMembershipMap((prev) => {
        const copy = { ...prev };
        displayedGroups.forEach((g) => {
          if (copy[g.id] === undefined) copy[g.id] = false;
        });
        return copy;
      });
      return;
    }

    (async () => {
      const checks = displayedGroups.map(async (g) => {
        const pending = pendingRef.current.get(String(g.id));
        if (pending === "join") return { id: g.id, isMember: true };
        if (pending === "leave") return { id: g.id, isMember: false };

        try {
          const members = await groupApi.listMembers(g.id);
          const isMember = Array.isArray(members) && members.some((m: any) => String(m.id) === String(currentUser.id));
          return { id: g.id, isMember };
        } catch (err) {
          return { id: g.id, isMember: false };
        }
      });

      const results = await Promise.all(checks);
      if (!mounted) return;
      setMembershipMap((prev) => {
        const copy = { ...prev };
        results.forEach((r) => (copy[r.id] = r.isMember));
        return copy;
      });
    })();

    return () => {
      mounted = false;
    };
  }, [displayedGroups, currentUser]);

  // handlers (join/leave similar to your implementation)
  const handleJoin = async (groupId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
      return;
    }

    pendingRef.current.set(String(groupId), "join");
    setMembershipMap((m) => ({ ...m, [groupId]: true }));
    setResults((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: (g.members ?? 0) + 1 } : g)));
    setTrending((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: (g.members ?? 0) + 1 } : g)));

    try {
      await groupApi.joinGroup(groupId);
    } catch (err: any) {
      setMembershipMap((m) => ({ ...m, [groupId]: false }));
      setResults((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: Math.max((g.members ?? 1) - 1, 0) } : g)));
      setTrending((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: Math.max((g.members ?? 1) - 1, 0) } : g)));

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
        } catch {
          // ignore
        }
      }, 600);
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
      return;
    }

    pendingRef.current.set(String(groupId), "leave");
    setMembershipMap((m) => ({ ...m, [groupId]: false }));
    setResults((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: Math.max((g.members ?? 1) - 1, 0) } : g)));
    setTrending((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: Math.max((g.members ?? 1) - 1, 0) } : g)));

    try {
      await groupApi.leaveGroup(groupId);
    } catch (err: any) {
      setMembershipMap((m) => ({ ...m, [groupId]: true }));
      setResults((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: (g.members ?? 0) + 1 } : g)));
      setTrending((prev) => prev.map((g) => (g.id === groupId ? { ...g, members: (g.members ?? 0) + 1 } : g)));

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
        } catch {
          // ignore
        }
      }, 600);
    }
  };

  return (
    <main className="min-h-screen w-full bg-white flex justify-center items-start">
      <div className="w-full max-w-[375px] px-4 pb-[max(24px,env(safe-area-inset-bottom))] mx-auto">
        <div className="flex items-center gap-3 pt-4">
          {/* Back handled by layout/header */}
          <button type="button" aria-label="Back" className="h-6 w-6 flex-shrink-0" onClick={() => router.back()}>
            <img src="/arrow-left.svg" alt="Back" className="h-6 w-6 object-contain" />
          </button>
          <div className="relative flex-1">
            <SearchBar
              value={query}
              onChange={(val: string) => setQuery(val)}
              placeholder="Find a support group"
              navigateOnInteract={false}
              autoFocus={false /* programmatic focus handled above when ?focus=1 */}
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
            <>
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
            </>
          )}

          {noResults && (
            <div className="w-full max-w-[342px] mx-auto bg-[#F7F7F7] rounded-[12px] p-6 flex flex-col items-center text-center">
              <Image src="/no-results.svg" alt="no results icon" width={48} height={48} className="mb-2 opacity-60" />
              <div className="text-[20px] font-medium text-[#333333]">No Group Found</div>
            </div>
          )}

          {!loading &&
            (isSearching ? results.map((c) => (
              <SupportGroupCard key={c.id} {...c} isMember={!!membershipMap[c.id]} onJoin={() => handleJoin(c.id)} onLeave={() => handleLeave(c.id)} />
            )) : trendingMemo.map((c) => (
              <SupportGroupCard key={c.id} {...c} isMember={!!membershipMap[c.id]} onJoin={() => handleJoin(c.id)} onLeave={() => handleLeave(c.id)} />
            )))
          }
        </div>

        <div className="h-6" />
      </div>
    </main>
  );
}
