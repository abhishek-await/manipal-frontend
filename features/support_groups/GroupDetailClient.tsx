"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import SupportGroupCard, { SupportGroupCardProps } from "@/features/support_groups/components/Card";
import PostCard from "@/features/support_groups/components/PostCard";
import JoinPromptCard from "@/features/support_groups/components/JoinPromptCard";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { authApi } from "@/features/auth/api/auth.api";
import { groupApi } from "@/features/support_groups/api/group.api";
import { PostCardProps as Post } from "@/features/support_groups/components/PostCard";


export default function GroupDetailClient({
  initialGroup,
  initialPosts,
  initialCurrentUser,
  initialIsMember,
  groupId,
}: {
  initialGroup: SupportGroupCardProps | null;
  initialPosts: Post[]; // provided by server (may be empty array)
  initialCurrentUser: any | null;
  initialIsMember: boolean;
  groupId: string;
}) {
  const router = useRouter();
  const [group, setGroup] = useState<SupportGroupCardProps | null>(initialGroup);
  const [posts, setPosts] = useState<Post[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams()

  // auth / membership
  const [currentUser, setCurrentUser] = useState<any | null>(initialCurrentUser ?? null);
  const [isMember, setIsMember] = useState<boolean | null>(initialIsMember ?? null);

  const feedRef = useRef<HTMLDivElement | null>(null);

  // filtering UI state
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<"latest" | "oldest" | "trending">("latest");

  useEffect(() => {
    // If the URL contains newPostId, refresh posts from server
    const newId = searchParams?.get("newPostId");
    if (!newId) return;

    // fetch latest posts and remove the param from url
    let mounted = true;
    (async () => {
      try {
        const json = await groupApi.getPosts(groupId);
        if (!mounted) return;
        const fresh = json.map((p: any) => ({
          id: String(p.id),
          avatar: p.avatar_url ?? "/avatars/omar.png",
          name: p.full_name ?? "Unknown",
          time: p.created_at ?? "2 hours ago",
          title: p.title ?? "Post",
          excerpt: p.content ?? "",
          tag: p.tag ?? "General",
          isLiked: p.is_liked_by_user,
          likeCount: p.like_count
          // we intentionally do not include per-post stats fields anymore,
          // front-end will not render them (you requested removal).
        }));
        setPosts(fresh);
        // remove query param to keep URL clean
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("newPostId");
          window.history.replaceState({}, "", url.toString());
        } catch (e) {
          // ignore
        }
      } catch (err) {
        console.warn("Could not refresh posts after creating one", err);
      }
    })();

    return () => { mounted = false; };
  }, [searchParams, groupId]);

  useEffect(() => {
    let mounted = true;
    async function detectAuth() {
      try {
        const u = await authApi.getCurrentUser();
        if (!mounted) return;
        setCurrentUser(u ?? null);

        if (u) {
          try {
            const members = await groupApi.listMembers(groupId);
            if (!mounted) return;
            const userId = u.id ?? u.pk ?? u.user_id;
            const found = Array.isArray(members) && members.some((m: any) => {
              const mid = m.id ?? m.user_id ?? (m.user && (m.user.id ?? m.user.pk));
              return String(mid) === String(userId);
            });
            setIsMember(Boolean(found));
          } catch {
            setIsMember(false);
          }
        } else {
          setIsMember(false);
        }
      } catch (err) {
        console.warn("auth detection failed", err);
        if (!mounted) return;
        setCurrentUser(null);
        setIsMember(false);
      }
    }

    detectAuth();
    return () => { mounted = false; };
  }, [groupId]);

  // Helper: get epoch from post (createdAt preferred)
  const getPostTime = (p: Post) => {
    const t = p.time;
    const d = Date.parse(t || "");
    return Number.isNaN(d) ? 0 : d;
  };

  // sortedPosts derived from original posts + selectedFilter
  const sortedPosts = useMemo(() => {
    if (!posts || posts.length === 0) return [];
    const copy = posts.slice();
    if (selectedFilter === "latest") {
      copy.sort((a, b) => getPostTime(b) - getPostTime(a));
    } else if (selectedFilter === "oldest") {
      copy.sort((a, b) => getPostTime(a) - getPostTime(b));
    } else if (selectedFilter === "trending") {
      copy.sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
    }
    return copy;
  }, [posts, selectedFilter]);

  // handlers for join/leave/follow (unchanged)
  const handleJoinAction = async () => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
      return;
    }
    setIsMember(true);
    setGroup((prev) => (prev ? { ...prev, members: (prev.members ?? 0) + 1 } : prev));
    try {
      await groupApi.joinGroup(groupId);
    } catch (err: any) {
      setIsMember(false);
      setGroup((prev) => (prev ? { ...prev, members: Math.max((prev.members ?? 1) - 1, 0) } : prev));
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
        return;
      }
      console.error("join failed", err);
    }
  };

  const handleLeave = async () => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
      return;
    }
    setIsMember(false);
    setGroup((prev) => (prev ? { ...prev, members: Math.max((prev.members ?? 1) - 1, 0) } : prev));
    try {
      await groupApi.leaveGroup(groupId);
    } catch (err: any) {
      setIsMember(true);
      setGroup((prev) => (prev ? { ...prev, members: (prev.members ?? 0) + 1 } : prev));
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`);
        return;
      }
      console.error("leave failed", err);
    }
  };

  const handleFollow = () => {
    if (!currentUser) router.push("/login");
    else { /* implement follow logic */ }
  };

  const goToCreatePost = () => {
    router.push(`/support-group/${groupId}/create-post`);
  };

  // Filter modal helpers
  const openFilter = () => setFilterOpen(true);
  const closeFilter = () => setFilterOpen(false);
  const applyFilterAndClose = () => {
    // sortedPosts updates automatically (controlled by selectedFilter)
    closeFilter();
  };

  // when like action happens inside PostCard, we only need to update local posts array
  // but PostCard handles API call itself (optimistic). Optionally we can provide a handler
  // to update likeCount/isLiked in the Group state if you also want to reflect it globally.
  const updatePostLikeState = (postId: string, isLiked: boolean, likeCount: number) => {
    setPosts((prev) => prev.map(p => p.id === postId ? { ...p, isLiked, likeCount } : p));
  };

  return (
    <div className="min-h-screen bg-white flex justify-center py-4">
      <div className="w-full max-w-2xl relative">
        <div className="mt-3 px-4">
          {group ? (
            <SupportGroupCard
              {...group}
              onJoin={handleJoinAction}
              onFollow={handleFollow}
              isMember={Boolean(isMember)}
              variant="detail"
              backIconSrc="/back.svg"
              shareIconSrc="/share-1.svg"
            />
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-500">Loading group…</div>
          )}
        </div>

        {/* Moderators & Experts + Stats (kept) */}
        <div className="mt-4 px-4">
          <h2 className="text-[20px] font-bold text-[#18448A]">Moderators & Experts</h2>
          <div className="mt-4 space-y-3">
            <div className="w-full mx-auto p-3 border border-[#E5E7EB] rounded-lg bg-white flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-[#06AD9B1f] flex items-center justify-center">
                <Image src="/avatars/dr1.png" alt="Dr Sarah" width={44} height={44} className="rounded-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-[#333333] text-sm">Dr. Sarah Johnson</div>
                  <div className="text-xs text-[#16AF9F] bg-[#ECFDF6] px-2 py-0.5 rounded-full">Verified</div>
                </div>
                <div className="text-xs text-[#333333]">Endocrinologies</div>
                <div className="text-xs text-[#54555A] mt-1">15+ years experience</div>
              </div>
            </div>

            <div className="w-full mx-auto p-3 border border-[#E5E7EB] rounded-lg bg-white flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-[#06AD9B1f] flex items-center justify-center">
                <Image src="/avatars/dr2.png" alt="Dr Sandeep" width={44} height={44} className="rounded-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[#333333] text-sm">Dr. Sandeep Sharma</div>
                <div className="text-xs text-[#333333]">Cardiologist</div>
                <div className="text-xs text-[#54555A] mt-1">8+ years experience</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 px-4">
          <GroupStatsCard
            postsThisWeek={group?.totalPosts ?? 45}
            activeMembers={group?.members ?? 340}
            monthlyGrowth={group?.growthPercentage ?? "12%"}
            expertSessions={group?.experts ?? 8}
          />
        </div>

        {/* Feed header with Filter button */}
        <div className="my-5 px-4 flex items-center justify-between w-full">
          <h3 className="text-xl font-bold text-[#18448A]">Group Feed</h3>

          <div className="flex items-center gap-3">
            <div className="text-sm text-[#54555A]">
              {/* small active filter chip */}
              {selectedFilter === "latest" && <span className="rounded-full px-3 py-1 border border-[#E5E7EB]">Latest Posts</span>}
              {selectedFilter === "oldest" && <span className="rounded-full px-3 py-1 border border-[#E5E7EB]">Oldest Posts</span>}
              {selectedFilter === "trending" && <span className="rounded-full px-3 py-1 border border-[#E5E7EB]">Trending</span>}
            </div>

            <button
              aria-label="Filter"
              onClick={openFilter}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-[#E5E7EB] text-[#18448A] bg-white h-10 focus:outline-none focus:ring-2 focus:ring-[#034EA1]"
              type="button"
            >
              <Image src="/filter_alt.svg" alt="" width={18} height={18} className="inline-block" />
              <span>Filter</span>
            </button>
          </div>
        </div>

        {/* Posts area */}
        <div ref={feedRef} className="relative mt-2 px-4 space-y-4 pb-28">
          {sortedPosts.length === 0 && !loading && (
            <div className="text-center text-sm text-[#666] py-8">No posts yet.</div>
          )}

          {sortedPosts.map((p) => (
            <div key={p.id} className="w-full max-w-2xl mx-auto">
              <PostCard
                id={p.id}
                avatar={p.avatar}
                name={p.name}
                time={p.time}
                title={p.title}
                excerpt={p.excerpt}
                tag={p.tag}
                isLiked={Boolean(p.isLiked)}
                likeCount={p.likeCount ?? 0}
                className="w-full"
              />
            </div>
          ))}

          {/* Not-logged-in overlay + join prompt */}
          {!currentUser && (
            <>
              <div className="absolute inset-0 z-20 bg-white/70" />
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-6 z-30">
                <JoinPromptCard onJoin={() => router.push(`/login?next=${encodeURIComponent(`/group/${groupId}`)}`)} />
              </div>
            </>
          )}
        </div>

        {/* Create post CTA for members */}
        {currentUser && (
          <div className="fixed left-0 right-0 bottom-4 pointer-events-none z-40">
            <div className="max-w-[390px] mx-auto px-4 pointer-events-auto">
              <button
                onClick={goToCreatePost}
                className="mx-auto w-[219px] h-[54px] rounded-lg border border-[#00B7AC] bg-white flex items-center gap-3 px-3 text-[#18448A] font-medium shadow"
                aria-label="Start a discussion"
                type="button"
              >
                <div className="h-8 w-8 rounded-full bg-[#ECFDF6] flex items-center justify-center">
                  <Image src="/post-icon.svg" alt="Post" width={18} height={18} />
                </div>
                <span>Start a discussion</span>
              </button>
            </div>
          </div>
        )}

        {/* About section for logged-in users (unchanged) */}
        {currentUser && (
          <div className="mt-6 px-4">
            <div className="mx-auto w-full rounded-[12px] border border-[#E5E7EB] bg-white p-4">
              <h3 className="text-[20px] leading-6 font-bold text-[#18448A]">About this group</h3>
              <p className="mt-3 text-[14px] leading-5 text-[#54555A]">{group?.description}</p>
              <div className="mt-4 space-y-1 text-[14px] leading-[22px] text-[#333333]">
                <p>
                  <span className="font-bold">Created:</span>
                  <span className="ml-1 font-normal">{formatCreated((group as any)?.createdText)}</span>
                </p>
                <p>
                  <span className="font-bold">Meeting Type:</span>
                  <span className="ml-1 font-normal">{(group as any)?.meeting_type ?? "Hybrid"}</span>
                </p>
                <p>
                  <span className="font-bold">Category:</span>
                  <span className="ml-1 font-normal">{(group as any)?.category?.name ?? "Chronic Conditions"}</span>
                </p>
              </div>

              <button
                onClick={() => router.push(`/support-groups/groups/${groupId}/about`)}
                className="mt-4 h-11 w-full rounded-[8px] border border-[#034EA1] text-[14px] font-medium text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#034EA1]"
              >
                View more details
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bottom Sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-50">
          {/* dim backdrop */}
          <div className="absolute inset-0 bg-black/30" onClick={closeFilter} />

          <div className="absolute left-0 right-0 bottom-0 bg-white rounded-t-xl p-4 shadow-lg" style={{ boxShadow: "0 -20px 30px rgba(0,0,0,0.12)" }}>
            <div className="w-full max-w-[390px] mx-auto">
              <h4 className="text-[16px] font-semibold text-[#333333] mb-3">Filter by</h4>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setSelectedFilter("latest")}
                  className={`w-full text-left rounded-lg px-4 py-3 border ${selectedFilter === "latest" ? "border-[#18448A] bg-white text-[#18448A]" : "border-[#E5E7EB] bg-white text-[#333333]"}`}
                >
                  Latest Post
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFilter("oldest")}
                  className={`w-full text-left rounded-lg px-4 py-3 border ${selectedFilter === "oldest" ? "border-[#18448A] bg-white text-[#18448A]" : "border-[#E5E7EB] bg-white text-[#333333]"}`}
                >
                  Oldest Post
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFilter("trending")}
                  className={`w-full text-left rounded-lg px-4 py-3 border ${selectedFilter === "trending" ? "border-[#18448A] bg-white text-[#18448A]" : "border-[#E5E7EB] bg-white text-[#333333]"}`}
                >
                  Top Trending
                </button>
              </div>

              <div className="mt-4">
                <button
                  onClick={applyFilterAndClose}
                  className="w-full h-12 rounded-lg text-white font-medium"
                  style={{ background: "linear-gradient(90deg, #18448A 0%, #16AF9F 85%)" }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
/* helper components (same as earlier version) */
function GroupStatsCard({
  postsThisWeek = 45,
  activeMembers = 340,
  monthlyGrowth = "12%",
  expertSessions = 8,
  postsIcon = "/groups.svg",
  membersIcon = "/users.svg",
  growthIcon = "/experts.svg",
  expertIcon = "/discussions.svg",
}: {
  postsThisWeek?: number | string;
  activeMembers?: number | string;
  monthlyGrowth?: string | number;
  expertSessions?: number | string;
  postsIcon?: string;
  membersIcon?: string;
  growthIcon?: string;
  expertIcon?: string;
}) {
  return (
    <div className="mx-auto w-full rounded-2xl bg-white p-4 shadow-sm border border-[#EEF2F6]">
      <div className="grid grid-cols-2 gap-4">
        <StatTile iconSrc={postsIcon} iconAlt="Posts" number={postsThisWeek} label="Posts this week" />
        <StatTile iconSrc={membersIcon} iconAlt="Members" number={activeMembers} label="Active members" />
        <StatTile iconSrc={growthIcon} iconAlt="Growth" number={monthlyGrowth} label="Monthly growth" />
        <StatTile iconSrc={expertIcon} iconAlt="Experts" number={expertSessions} label="Expert sessions" />
      </div>
    </div>
  );
}

function StatTile({
  iconSrc,
  iconAlt,
  number,
  label,
}: {
  iconSrc: string;
  iconAlt: string;
  number: string | number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ECFDF6]">
        <div className="h-6 w-6">
          <Image src={iconSrc} alt={iconAlt} width={24} height={24} className="object-contain" />
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-[20px] font-semibold text-[#111827]">{number}</div>
        <div className="text-xs text-[#6B7280]">{label}</div>
      </div>
    </div>
  );
}

function formatCreated(val?: string) {
  if (!val) return "January 2022";
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return val;
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}
