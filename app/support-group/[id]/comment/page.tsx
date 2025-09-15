// app/support-group/[id]/comment/page.tsx
import CommentClient from "@/features/support_groups/CommentClient";
import React from "react";
import { cookies } from "next/headers";

type ReplyFromApi = {
  id: number;
  user_name: string;
  content: string;
  created_at: string;
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
  is_liked_by_user?: boolean;
  avatar_url?: string;
};

async function safeFetchJson(url: string, opts?: RequestInit) {
  try {
    const res = await fetch(url, { cache: "no-store", ...opts });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

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
  }> = [];

  apiReplies.forEach((r) => {
    out.push({
      id: String(r.id),
      content: r.content,
      created_at: r.created_at,
      user_name: r.user_name,
      parentId: null,
      replyingTo: null,
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
  const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ");

  // 1) fetch the post (public endpoints fallback)
  const postPaths = [
    `${API_BASE}/support-groups/posts/${postId}/`,
    `${API_BASE}/support-group/posts/${postId}/`,
    `${API_BASE}/support-groups/posts/${postId}`
  ];

  let post: PostFromApi | null = null;
  for (const p of postPaths) {
    const r = await safeFetchJson(p);
    if (r) {
      post = r;
      break;
    }
  }

  // 2) fetch replies (public)
  const repliesUrl = `${API_BASE}/support-groups/posts/${postId}/replies/`;
  const apiReplies: ReplyFromApi[] | null = (await safeFetchJson(repliesUrl)) ?? [];
  const flattened = flattenReplies(apiReplies ?? []);

  // 3) server-side fetch current user by forwarding cookies to backend
  let initialCurrentUser: any | null = null;
  try {
    const meRes = await fetch(`${API_BASE}/accounts/user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (meRes.ok) {
      initialCurrentUser = await meRes.json();
    } else {
      initialCurrentUser = null;
    }
  } catch (e) {
    console.warn("Could not fetch current user server-side", e);
    initialCurrentUser = null;
  }

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
