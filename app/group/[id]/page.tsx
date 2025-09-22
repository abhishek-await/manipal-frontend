import React from "react";
import GroupDetailClient from "@/features/support_groups/GroupDetailClient";
import { groupApi } from "@/features/support_groups/api/group.api";
import { SupportGroupCardProps } from "@/features/support_groups/components/Card";
import { cookies } from "next/headers";

export default async function Page(props: PageProps<'/group/[id]'>) {
  const { id } = await props.params;
  const groupId = id;
  if (!groupId) return <div>Group id missing</div>;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

  // read cookies once
  const cookieStore = await cookies();
  const access = cookieStore.get('accessToken')?.value ?? "";

  // Fetch group details (server-side) using groupApi.getGroup (which expects an access token param)
  let rawGroup: any = null;
  try {
    rawGroup = await groupApi.getGroup(groupId, access).catch(() => null);
  } catch (err) {
    console.error("group fetch error", err);
    rawGroup = null;
  }

  const mappedGroup: SupportGroupCardProps = {
    id: rawGroup?.id ?? groupId,
    title: rawGroup?.title ?? "Diabetes Support Group, Whitefield",
    imageSrc: rawGroup?.image_url ?? "/images/group-thumb.png",
    description:
      rawGroup?.description ??
      "A supportive community for people managing diabetes in the Whitefield area.",
    rating: Number(rawGroup?.rating ?? 4.9),
    reviews: rawGroup?.reviews ?? rawGroup?.total_reviews ?? 0,
    updatedText: rawGroup?.updated_at,
    members: rawGroup?.total_members ?? 0,
    experts: rawGroup?.total_experts ?? rawGroup?.experts ?? 0,
    avatars:
      rawGroup?.avatars?.length > 0
        ? rawGroup.avatars.map((a: any) => ({ src: a.url || a.src, alt: a.name || "" }))
        : [
            { src: "/avatars/omar.png", alt: "Omar" },
            { src: "/avatars/fran.png", alt: "Fran" },
            { src: "/avatars/jane.png", alt: "Jane" },
          ],
    ctaText: "Join Group",
    variant: "detail",
    isMember: rawGroup?.is_member ?? false,
    isFollowing: false,
    growthPercentage: rawGroup?.growth_percentage,
    createdText: rawGroup?.created_at,
    category: rawGroup?.category,
  };

  // Server-side fetch posts for this group (authenticated if access token exists)
  const postsUrl = `${API_BASE}/support-groups/groups/${groupId}/posts`;
  let initialPosts: any[] = [];
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (access) headers['Authorization'] = `Bearer ${access}`;

    const res = await fetch(postsUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json)) {
        initialPosts = json.map((p: any) => ({
          id: String(p.id),
          avatar: p.avatar_url ?? "/avatars/omar.png",
          name: p.full_name ?? "Unknown",
          time: p.created_at ?? "2 hours ago",
          title: p.title ?? "Post",
          excerpt: p.content ?? "",
          tag: p.category ?? (rawGroup?.category?.name ?? "General"),
          isLiked: p.is_liked_by_user,
          likeCount: p.like_count ?? 0,
          replyCount: p.reply_count ?? 0,
          attachments: p.attachments ?? [],
        }));
      }
    } else {
      // optionally handle non-ok response
      console.warn("[posts fetch] non-ok status", res.status);
    }
  } catch (err) {
    console.warn("Error fetching posts server-side", err);
  }

  // Server-side: fetch current user (if we have an access token)
  let initialCurrentUser: any | null = null;
  if (access) {
    try {
      const USER_URL = `${API_BASE}/accounts/user`; // adjust if your endpoint differs
      const userRes = await fetch(USER_URL, {
        method: "GET",
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access}`,
        },
        cache: "no-store",
      });
      if (userRes.ok) {
        initialCurrentUser = await userRes.json();
      } else {
        // if token invalid/expired you might want to ignore (client will handle)
        console.warn("user fetch non-ok", userRes.status);
      }
    } catch (err) {
      console.warn("Failed to fetch current user server-side", err);
    }
  }

  const initialIsMember = mappedGroup.isMember ?? false;

  // Pass server-provided posts and user down to client
  return (
    <GroupDetailClient
      initialGroup={mappedGroup}
      initialPosts={initialPosts}
      initialCurrentUser={initialCurrentUser}
      initialIsMember={initialIsMember}
      groupId={groupId}
    />
  );
}
