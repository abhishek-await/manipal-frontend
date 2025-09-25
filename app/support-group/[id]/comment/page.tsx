// app/support-group/[id]/comment/page.forwarded.tsx
import CommentClient from "@/features/support_groups/CommentClient";
import React from "react";
import { cookies } from "next/headers";

type ReplyFromApi = {
  id: number;
  user_name: string;
  content: string;
  created_at: string;
  like_count?: number;
  is_liked_by_user?: boolean;
  moderation_status?: 'approved' | 'needs_review' | 'rejected';
  replies?: ReplyFromApi[]; // nested replies
};

type PostFromApi = {
  id: number | string;
  title?: string;
  content?: string;
  full_name?: string;
  created_at?: string;
  like_count?: number;
  reply_count?: number;
  num_reads?: number;
  is_liked_by_user?: boolean;
  avatar_url?: string;
  group_id?: string;
};

/**
 * Flatten replies:
 * - preserve order: top-level replies in order returned
 * - for each top-level, append its nested replies after it (not nested visually)
 * - attach parentId and (optional) replyingToName for UI
 */
function flattenReplies(apiReplies: ReplyFromApi[] = []) {
  const out: Array<{
    id: string;
    content: string;
    created_at: string;
    user_name: string;
    parentId?: string | null;
    replyingTo?: string | null;
    replyingToId?: string | null;
    likeCount?: number;
    isLiked?: boolean;
    moderationStatus?: 'approved' | 'needs_review' | 'rejected';
  }> = [];

  apiReplies.forEach((r) => {
    out.push({
      id: String(r.id),
      content: r.content,
      created_at: r.created_at,
      user_name: r.user_name,
      parentId: null,
      replyingTo: null,
      replyingToId: null,
      likeCount: r.like_count ?? 0,
      isLiked: r.is_liked_by_user ?? false,
      moderationStatus: r.moderation_status ?? 'approved',
    });

    if (Array.isArray(r.replies) && r.replies.length > 0) {
      r.replies.forEach((nested) =>
        out.push({
          id: String(nested.id),
          content: nested.content,
          created_at: nested.created_at,
          user_name: nested.user_name,
          parentId: r.id.toString(), // indicate it was replying to r.id
          replyingTo: r.user_name ?? null,
          replyingToId: r.id.toString(),
          likeCount: nested.like_count ?? 0,
          isLiked: nested.is_liked_by_user ?? false,
          moderationStatus: nested.moderation_status ?? 'approved',
        })
      );
    }
  });

  return out;
}

export default async function Page(props: PageProps<'/support-group/[id]/comment'>) {
  const { id } = await props.params;
  const postId = id;
  if (!postId) return <div>Post id missing</div>;

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? "";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  // Helper: call our internal forwarder so backend sees cookies + refresh logic
  const serverBase = process.env.NEXT_SERVER_URL ?? `http://localhost:3000`;

  async function forwardFetchJson(path: string, method = "GET") {
    try {
      const payload = { path, method };
      const res = await fetch(`${serverBase}/api/forward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // forward cookies from current request so the forwarder can use them server-side
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!res.ok) return null;

      // forwarder returns backend body (and sets content-type). We expect JSON here.
      return await res.json().catch(() => null);
    } catch (e) {
      console.error("forwardFetchJson error", e);
      return null;
    }
  }

  // 1) fetch the post (try multiple fallback paths) — use forwarder so backend can personalize
  const postPaths = [
    `${API_BASE}/support-groups/posts/${postId}`,
  ];

  let post: PostFromApi | null = null;
  for (const p of postPaths) {
    const r = await forwardFetchJson(p, "GET");
    if (r) {
      post = r;
      break;
    }
  }

  // 2) fetch replies
  const repliesUrl = `${API_BASE}/support-groups/posts/${postId}/replies/`;
  const apiReplies: ReplyFromApi[] | null = (await forwardFetchJson(repliesUrl, "GET")) ?? [];
  // console.log("API Replies: ", apiReplies)
  const flattened = flattenReplies(apiReplies ?? []);
  // console.log("Flattened Replies: ", flattened)

  // 3) server-side fetch current user by forwarding cookies to backend
  let initialCurrentUser: any | null = null;
  try {
    const me = await forwardFetchJson(`${API_BASE}/accounts/user`, "GET");
    initialCurrentUser = me ?? null;
  } catch (e) {
    console.warn("Could not fetch current user server-side", e);
    initialCurrentUser = null;
  }

  // console.log("Post: ", post)

  // Pass server-side data into client component to avoid flicker.
  return (
    <CommentClient
      initialPost={post}
      initialReplies={flattened}
      initialCurrentUser={initialCurrentUser}
      postId={String(postId)}
    />
  );
}