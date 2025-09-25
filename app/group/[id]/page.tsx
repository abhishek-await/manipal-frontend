import React from "react";
import GroupDetailClient from "@/features/support_groups/GroupDetailClient";
import { SupportGroupCardProps } from "@/features/support_groups/components/Card";
import { cookies } from "next/headers";

export default async function Page(props: PageProps<'/group/[id]'>) {
  const { id } = await props.params;
  const groupId = id;
  if (!groupId) return <div>Group id missing</div>;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

  // read cookies once
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  const access = cookieStore.get('accessToken')?.value ?? "";

  const serverBase = process.env.NEXT_SERVER_URL ?? `http://localhost:3000`;

  async function forwardFetchJson(path: string, method = 'GET') {
    try {
      const payload = { path, method }
      const res = await fetch(`${serverBase}/api/forward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
      })
      if (!res.ok) return null
      return await res.json().catch(() => null)
    } catch (e) {
      console.error('forwardFetchJson error', e)
      return null
    }
  }

  // Fetch group details (server-side) using groupApi.getGroup (which expects an access token param)
  let rawGroup: any = null
  try {
    rawGroup = await forwardFetchJson(`${API_BASE}/support-groups/groups/${groupId}`, 'GET')
  } catch (e) {
    console.warn('Could not fetch group server-side', e)
    rawGroup = null
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
    totalPosts: rawGroup?.total_posts
  };

  // Server-side fetch posts for this group (authenticated if access token exists)
  let initialPosts: any[] = [];
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (access) headers['Authorization'] = `Bearer ${access}`;

    // const res = await forwardFetchJson(`${serverBase}/support-groups/groups/${groupId}/posts/`,"GET");
    const res: any = (await forwardFetchJson(`${API_BASE}/support-groups/groups/${groupId}/posts/`, "GET")) ?? [];

    // console.log("Response SS: ", res)

      if (Array.isArray(res)) {
        initialPosts = res.map((p: any) => ({
          id: String(p.id),
          avatar: p.avatar_url ?? "",
          name: p.full_name ?? "Unknown",
          time: p.created_at ?? "2 hours ago",
          title: p.title ?? "Post",
          excerpt: p.content ?? "",
          tag: p.category ?? (rawGroup?.category?.name ?? "General"),
          isLiked: p.is_liked_by_user,
          likeCount: p.like_count ?? 0,
          replyCount: p.reply_count ?? 0,
          viewCount: p.num_reads ?? 0,
          attachments: p.attachments ?? [],
        }));
      } 
  } catch (err) {
    console.warn("Error fetching posts server-side", err);
  }

  // Server-side: fetch current user (if we have an access token)
  let initialCurrentUser: any | null = null;
  try {
    const me = await forwardFetchJson(`${API_BASE}/accounts/user`, "GET");
    initialCurrentUser = me ?? null;
  } catch (e) {
    console.warn("Could not fetch current user server-side", e);
    initialCurrentUser = null;
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
