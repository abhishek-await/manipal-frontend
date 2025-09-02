// app/support-groups/[id]/page.tsx
import React from "react";
import GroupDetailClient from "@/features/support_groups/GroupDetailClient";
import { groupApi } from "@/features/support_groups/api/group.api";
import { SupportGroupCardProps } from "@/features/support_groups/components/Card";

export default async function Page(props: PageProps<'/group/[id]'>) {
  const {id} = await props.params;
  const groupId = id
  if (!groupId) return <div>Group id missing</div>;

  // Fetch group details (server-side)
  let rawGroup: any = null;
  try {
    rawGroup = await groupApi.getGroup(groupId).catch(() => null);
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
    members: rawGroup?.total_members ?? rawGroup?.members ?? 0,
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
    isMember: false,
    isFollowing: false,
    growthPercentage: rawGroup?.growth_percentage,
    createdText: rawGroup?.created_at,
    category: rawGroup?.category,
  };

  // Server-side fetch posts for this group (public posts endpoint)
  // Use NEXT_PUBLIC_API_URL when configured, otherwise attempt relative path.
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
  const postsUrl = `${API_BASE}/support-groups/posts/${groupId}`

  let initialPosts: any[] = [];
  try {
    // cache: 'no-store' ensures fresh data on each request (avoid stale on Vercel)
    const res = await fetch(postsUrl, { cache: "no-store" });
    const json = await res.json()
    console.log("[Post fetch]: ", json)
    if (res.ok) {
      if (Array.isArray(json)) {
        initialPosts = json.map((p: any) => ({
          id: String(p.id ?? Math.random()),
          avatar: p.avatar_url ?? "/avatars/omar.png",
          name: p.full_name ?? p.email ?? "Unknown",
          time: p.created_at ?? "2 hours ago",
          title: p.title ?? (p.content ? String(p.content).slice(0, 60) : "Post"),
          excerpt: p.content ?? "",
          tag: p.tag ?? (rawGroup?.category?.name ?? "General"),
          isLiked: p.is_like_by_user,
          likeCount: p.like_count
          // we intentionally do not include per-post stats fields anymore,
          // front-end will not render them (you requested removal).
        }));
      }
    } else {
      console.warn("Posts fetch returned non-ok status", res.status);
    }
  } catch (err) {
    console.warn("Error fetching posts server-side", err);
  }

  // Pass server-provided posts down to client
  return (
    <GroupDetailClient
      initialGroup={mappedGroup}
      initialPosts={initialPosts}
      initialCurrentUser={null}
      initialIsMember={null}
      groupId={groupId}
    />
  );
}
