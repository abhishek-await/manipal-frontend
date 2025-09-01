// app/support-groups/[id]/page.tsx
import React from "react";
import GroupDetailClient from "@/features/support_groups/GroupDetailClient";
import { groupApi } from "@/features/support_groups/api/group.api";
import { PostCardProps } from "@/features/support_groups/components/PostCard";
import { SupportGroupCardProps } from "@/features/support_groups/components/Card";

function mapBackendPost(p: PostCardProps) {
  const avatar =
    p.avatar || "/avatars/omar.png";
  const name = p.name || "Unknown";
  const time = p.time || "some time ago";
  const title = p.title || "Post";
  const excerpt = p.excerpt || "";
  const tag = p.tag || "General";
  const stats = { users: p.stats.users ?? 0, experts: p.stats.experts ?? 0 };
  return {
    id: String(p.id ?? `${Math.random()}`),
    avatar,
    name,
    time,
    title,
    excerpt,
    tag,
    stats,
  };
}

export default async function Page(props: PageProps<'/group/[id]'>) {
  const {id} = await props.params;
  const groupId = id
  if (!groupId) return <div>Group id missing</div>;

  // Use your groupApi.getGroup (unchanged)
  let rawGroup: any = null;
  try {
    rawGroup = await groupApi.getGroup(groupId).catch(() => null);
  } catch (err) {
    console.error("group fetch error", err);
    rawGroup = null;
  }

  const mappedGroup : SupportGroupCardProps = {
        id: rawGroup.id ?? groupId,
        title: rawGroup.title ?? "Diabetes Support Group, Whitefield",
        imageSrc: rawGroup.image_url ?? "/images/group-thumb.png",
        description:
          rawGroup.description ??
          "A supportive community for people managing diabetes in the Whitefield area.",
        rating: Number(rawGroup.rating ?? 4.9),
        reviews: rawGroup.reviews ?? rawGroup.total_reviews ?? 0,
        updatedText: rawGroup.updated_at ?? rawGroup.updated_at,
        members: rawGroup.total_members ?? rawGroup.members ?? 0,
        experts: rawGroup?.total_experts ?? rawGroup?.experts ?? 0,
        avatars:
          rawGroup.avatars && rawGroup.avatars.length > 0
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
        growthPercentage: rawGroup.growth_percentage,
        createdText: rawGroup.created_at,
        category: rawGroup.category,
      }

  // posts: prefer embedded posts else demo fallback
  let mappedPosts: any[] = [];
    mappedPosts = [0, 1, 2, 3].map((i) => ({
      id: String(i),
      avatar: "/avatars/omar.png",
      name: "Priya M.",
      time: `${2 + i} hours ago`,
      title: "Best glucose meters for accurate readings?",
      excerpt:
        "I've been using the same glucose meter for years, but I'm wondering if there are better options now that are more accurate and easy to calibrate.",
      tag: "Equipment",
      stats: { users: 1850, experts: 12 },
    }));

  // IMPORTANT: tokens are in localStorage, so server cannot determine current user.
  // Set initialCurrentUser = null and initialIsMember = null to signal client-side detection.
  return (
    <GroupDetailClient
      initialGroup={mappedGroup}
      initialPosts={mappedPosts}
      initialCurrentUser={null}
      initialIsMember={null}
      groupId={groupId}
    />
  );
}
