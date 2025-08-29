// features/support_groups/GroupDetailClient.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import SupportGroupCard, { SupportGroupCardProps } from "@/features/support_groups/components/Card";
import PostCard from "@/features/support_groups/components/PostCard";
import JoinPromptCard from "@/features/support_groups/components/JoinPromptCard";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { authApi } from "@/features/auth/api/auth.api";
import { groupApi } from "@/features/support_groups/api/group.api";

type Post = {
  id: string;
  avatar: string;
  name: string;
  time: string;
  title: string;
  excerpt: string;
  tag: string;
  stats: { users: number; experts: number };
};

export default function GroupDetailClient({
  initialGroup,
  initialPosts,
  initialCurrentUser,
  initialIsMember,
  groupId,
}: {
  initialGroup: SupportGroupCardProps | null;
  initialPosts: Post[];
  initialCurrentUser: any | null;
  initialIsMember: boolean | null;
  groupId: string;
}) {
  const router = useRouter();

  const [group, setGroup] = useState<SupportGroupCardProps | null>(initialGroup);
  const [posts, setPosts] = useState<Post[]>(initialPosts ?? []);
  const [loading, setLoading] = useState(false);

  // currentUser is initially whatever the server passed (null in our localStorage-only approach)
  const [currentUser, setCurrentUser] = useState<any | null>(initialCurrentUser ?? null);

  // isMember: boolean | null — if null, client must compute (server couldn't)
  const [isMember, setIsMember] = useState<boolean | null>(initialIsMember ?? null);

  const feedRef = useRef<HTMLDivElement | null>(null);
  const [feedTopPx, setFeedTopPx] = useState<number | null>(null);

  const pendingRef = React.useRef(new Set<string>());

  // On mount: if server didn't supply isMember, compute it from localStorage tokens via authApi.getCurrentUser()
  useEffect(() => {
    let mounted = true;

    // if server already told us (true/false), nothing to do
    if (isMember !== null) return;

    async function detectAuthAndMembership() {
      try {
        const user = await authApi.getCurrentUser();
        if (!mounted) return;
        setCurrentUser(user);

        if (!user) {
          setIsMember(false);
          return;
        }

        // check membership using groupApi.listMembers
        try {
          const members = await groupApi.listMembers(groupId);
          if (!mounted) return;
          if (!Array.isArray(members)) {
            setIsMember(false);
            return;
          }
          const userId = user.id ?? user.pk ?? user.user_id;
          const found = members.some((m: any) => {
            const mid = m.id ?? m.user_id ?? (m.user && (m.user.id ?? m.user.pk));
            return String(mid) === String(userId);
          });
          setIsMember(Boolean(found));
        } catch (err) {
          console.warn("membership check failed (client)", err);
          setIsMember(false);
        }
      } catch (err) {
        console.warn("auth detection failed", err);
        if (!mounted) return;
        setCurrentUser(null);
        setIsMember(false);
      }
    }

    detectAuthAndMembership();

    return () => {
      mounted = false;
    };
    // groupId not expected to change for this route, but include for safety
  }, [groupId, isMember]);

  // measure feed top so overlay begins at feed area
  useEffect(() => {
    function measure() {
      const el = feedRef.current;
      if (!el) return setFeedTopPx(null);
      const rect = el.getBoundingClientRect();
      setFeedTopPx(rect.top + window.scrollY);
    }

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const t = setTimeout(measure, 300);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      clearTimeout(t);
    };
  }, [loading, posts.length]);

  // join action uses your groupApi.joinGroup (which uses authApi.fetchWithAuth and localStorage tokens)
  const handleJoinAction = async () => {
    // if we don't know currentUser, try to detect quickly
    if (!currentUser) {
      // attempt to fetch user (authApi uses localStorage tokens)
      const u = await authApi.getCurrentUser();
      if (!u) {
        router.push("/login");
        return;
      }
      setCurrentUser(u);
    }

    // optimistic UI & pending
    pendingRef.current.add(String(groupId));
    setIsMember(true);
    setGroup((prev) => (prev ? { ...prev, members: (prev.members ?? 0) + 1 } : prev));

    try {
      await groupApi.joinGroup(groupId);
    } catch (err: any) {
      // rollback
      setIsMember(false);
      setGroup((prev) => (prev ? { ...prev, members: Math.max((prev.members ?? 1) - 1, 0) } : prev));

      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push("/login");
        return;
      }
      console.error("join failed", err);
    } finally {
      pendingRef.current.delete(String(groupId));
      // revalidate membership after a short delay
      setTimeout(async () => {
        try {
          const members = await groupApi.listMembers(groupId);
          const userId = currentUser?.id ?? currentUser?.pk ?? currentUser?.user_id;
          const found = Array.isArray(members) && members.some((m: any) => {
            const mid = m.id ?? m.user_id ?? (m.user && (m.user.id ?? m.user.pk));
            return String(mid) === String(userId);
          });
          setIsMember(Boolean(found));
        } catch {
          // keep optimistic state
        }
      }, 600);
    }
  };

  const handleLeave = async () => {
    if (!currentUser) {
      const u = await authApi.getCurrentUser();
      if (!u) {
        router.push("/login");
        return;
      }
      setCurrentUser(u);
    }

    pendingRef.current.add(String(groupId));
    setIsMember(false);
    setGroup((prev) => (prev ? { ...prev, members: Math.max((prev.members ?? 1) - 1, 0) } : prev));

    try {
      await groupApi.leaveGroup(groupId);
    } catch (err: any) {
      // rollback
      setIsMember(true);
      setGroup((prev) => (prev ? { ...prev, members: (prev.members ?? 0) + 1 } : prev));

      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push("/login");
        return;
      }
      console.error("leave failed", err);
    } finally {
      pendingRef.current.delete(String(groupId));
      setTimeout(async () => {
        try {
          const members = await groupApi.listMembers(groupId);
          const userId = currentUser?.id ?? currentUser?.pk ?? currentUser?.user_id;
          const found = Array.isArray(members) && members.some((m: any) => {
            const mid = m.id ?? m.user_id ?? (m.user && (m.user.id ?? m.user.pk));
            return String(mid) === String(userId);
          });
          setIsMember(Boolean(found));
        } catch {
          // ignore
        }
      }, 600);
    }
  };

  const handleFollow = () => {
    if (!currentUser) router.push("/login");
    else {
      // implement follow logic if you have endpoint
      console.debug("follow clicked");
    }
  };

  const formatCreated = (val?: string) => {
    if (!val) return "January 2022";
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-white flex justify-center py-4">
      <div className="w-[390px] relative">
        <div className="mt-3 px-4">
          <div style={{ width: 342 }} className="mx-auto">
            {group ? (
              <SupportGroupCard
                {...group}
                onJoin={handleJoinAction}
                onFollow={handleFollow}
                // convert null -> false for rendering until resolved
                isMember={Boolean(isMember)}
                variant="detail"
              />
            ) : (
              <div className="h-[200px] flex items-center justify-center text-sm text-gray-500">Loading group…</div>
            )}
          </div>
        </div>

        {/* Moderators & Experts */}
        <div className="mt-4 px-4">
          <h2 className="text-[20px] font-bold text-[#18448A]">Moderators & Experts</h2>
          <div className="mt-4 space-y-3">
            <div className="w-[342px] mx-auto p-3 border border-[#E5E7EB] rounded-lg bg-white flex items-start gap-3">
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

            <div className="w-[342px] mx-auto p-3 border border-[#E5E7EB] rounded-lg bg-white flex items-start gap-3">
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

        {/* Stats row */}
        <div className="mt-4 px-4">
          <GroupStatsCard
                postsThisWeek={group?.totalPosts ?? 45}
                activeMembers={group?.members ?? 340}
                monthlyGrowth={group?.growthPercentage ?? "12%"}
                expertSessions={group?.experts ?? 8}
            />
        </div>

        {/* Feed header */}
        <div className="mt-4 px-4 flex items-center justify-between w-full">
          <h3 className="text-base font-bold text-[#18448A]">Group Feed</h3>
          <button className="text-sm border px-3 py-2 rounded-lg text-[#18448A]">Filter</button>
        </div>

        {/* Posts */}
        <div ref={feedRef} className=" relative mt-2 px-4 space-y-4 pb-3">
          {loading && <div className="text-center text-sm text-[#666] py-8">Loading posts…</div>}

          {!loading &&
            posts.map((p) => (
              <div key={p.id} className="mx-auto" style={{ width: 343 }}>
                <PostCard
                  avatar={p.avatar}
                  name={p.name}
                  time={p.time}
                  title={p.title}
                  excerpt={p.excerpt}
                  tag={p.tag}
                  stats={p.stats}
                />
              </div>
            ))}

          {/* Not-logged-in overlay + join prompt */}
          {!currentUser && (
            <>
              <div className="mx-auto opacity-40 pointer-events-none" style={{ width: 343 }}>
                <PostCard
                  avatar="/avatars/omar.png"
                  name="Priya M."
                  time="2 hours ago"
                  title="Best glucose meters for accurate readings?"
                  excerpt="I've been using the same glucose meter for years..."
                  tag="Equipment"
                  stats={{ users: 1850, experts: 12 }}
                />
              </div>

              <div className="absolute inset-x-0 bottom-0 h-[340px] bg-white/70 z-0 pointer-events-auto" />

              <JoinPromptCard onJoin={() => router.push("/login")} className="absolute inset-x-0 bottom-4 z-10" />
            </>
          )}
        </div>

        {/* Sticky CTA only for logged-in users */}
        {currentUser && (
          <div className="mt-6 px-4">
            <div className="mx-auto w-[342px] rounded-[12px] border border-[#E5E7EB] bg-white p-4">
              <h3 className="text-[20px] leading-6 font-bold text-[#18448A]">About this group</h3>

              <p className="mt-3 text-[14px] leading-5 text-[#54555A]">
                {group?.description ??
                  "Our diabetes support group has been serving the Whitefield community for over 3 years. We focus on practical diabetes management, emotional support, and building lasting connections. Whether you're newly ..."}
              </p>

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
    </div>
  );
}

type Props = {
  postsThisWeek?: number | string;
  activeMembers?: number | string;
  monthlyGrowth?: number | string; // e.g. "12%"
  expertSessions?: number | string;
  // optional icon paths (strings accepted by next/image)
  postsIcon?: string;
  membersIcon?: string;
  growthIcon?: string;
  expertIcon?: string;
};

function GroupStatsCard({
  postsThisWeek = 45,
  activeMembers = 340,
  monthlyGrowth = "12%",
  expertSessions = 8,
  postsIcon = "/groups.svg",
  membersIcon = "/users.svg",
  growthIcon = "/experts.svg",
  expertIcon = "/discussions.svg",
}: Props) {
  return (
    <div className="mx-auto w-[342px] rounded-2xl bg-white p-4 shadow-sm border border-[#EEF2F6]">
      <div className="grid grid-cols-2 gap-4">
        <StatTile
          iconSrc={postsIcon}
          iconAlt="Posts"
          number={postsThisWeek}
          label="Posts this week"
        />
        <StatTile
          iconSrc={membersIcon}
          iconAlt="Members"
          number={activeMembers}
          label="Active members"
        />
        <StatTile
          iconSrc={growthIcon}
          iconAlt="Growth"
          number={monthlyGrowth}
          label="Monthly growth"
        />
        <StatTile
          iconSrc={expertIcon}
          iconAlt="Experts"
          number={expertSessions}
          label="Expert sessions"
        />
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
        <div className="text-[20px] font-semibold text-[#111827]">
          {number}
        </div>
        <div className="text-xs text-[#6B7280]">
          {label}
        </div>
      </div>
    </div>
  );
}

