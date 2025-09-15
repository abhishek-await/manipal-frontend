// features/support_groups/CommentClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";
import PostCard from "@/features/support_groups/components/PostCard";

export type FlatReply = {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  parentId?: number | null;
  replyingTo?: string | null;
};

export default function CommentClient({
  initialPost,
  initialReplies,
  postId,
}: {
  initialPost: {
    id?: string | number;
    title?: string;
    content?: string;
    full_name?: string;
    created_at?: string;
    like_count?: number;
    is_liked_by_user?: boolean;
    avatar_url?: string;
    reply_count?: number;
  } | null;
  initialReplies: FlatReply[];
  postId: string;
}) {
  const router = useRouter();

  const [replies, setReplies] = useState<FlatReply[]>(initialReplies ?? []);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // Controlled like state for the PostCard
  const [isLiked, setIsLiked] = useState<boolean>(!!(initialPost?.is_liked_by_user ?? false));
  const [likeCount, setLikeCount] = useState<number>(initialPost?.like_count ?? 0);
  const [likePending, setLikePending] = useState(false);

  // reply input state
  const [text, setText] = useState("");
  // immediateParentId = the actual comment id we will send to API as parent_id
  const [replyToIdImmediate, setReplyToIdImmediate] = useState<string | null>(null);
  // replyingToName is only for display (UI: "Replying to X")
  const [replyingToName, setReplyingToName] = useState<string | null>(null);
  // displayParentId = top-level parent id used for placing the optimistic reply in the flattened list
  const [replyDisplayParentId, setReplyDisplayParentId] = useState<number | null>(null);

  const [posting, setPosting] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await authApi.getCurrentUser();
        if (!mounted) return;
        setCurrentUser(u ?? null);
      } catch (e) {
        if (!mounted) return;
        setCurrentUser(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // flatten helper (same as before)
  function flattenRepliesClient(apiReplies: any[] = []): FlatReply[] {
    const out: FlatReply[] = [];
    (apiReplies || []).forEach((r: any) => {
      out.push({
        id: String(r.id),
        content: r.content,
        created_at: r.created_at,
        user_name: r.user_name ?? r.user?.name ?? "Unknown",
        parentId: null,
        replyingTo: null,
      });
      if (Array.isArray(r.replies) && r.replies.length > 0) {
        r.replies.forEach((nested: any) =>
          out.push({
            id: String(nested.id),
            content: nested.content,
            created_at: nested.created_at,
            user_name: nested.user_name ?? nested.user?.name ?? "Unknown",
            parentId: r.id,
            replyingTo: r.user_name ?? r.user?.name ?? null,
          })
        );
      }
    });
    return out;
  }

  // grouped view helper
  const grouped = useMemo(() => {
    const map: Record<string, FlatReply[]> = {};
    const top: FlatReply[] = [];
    for (const r of replies) {
      if (r.parentId == null) top.push(r);
      else {
        const key = String(r.parentId);
        map[key] = map[key] ?? [];
        map[key].push(r);
      }
    }
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });
    top.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return { top, map };
  }, [replies]);

  function timeAgo(dateString?: string) {
    if (!dateString) return "";
    const d = new Date(dateString);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString();
  }

  // STARTREPLY: set immediate parent (API) and display parent (UI)
  const startReply = (clickedId: string, toName?: string | null) => {
    // clickedId = the id of the comment the user tapped "Reply" on (could be top-level or nested)
    setReplyToIdImmediate(clickedId); // <-- API payload should use this
    setReplyingToName(toName ?? null);

    // compute display parent: if clicked has parentId => the display parent is that parentId,
    // otherwise clicked is itself a top-level parent and displayParent is clickedId
    const clicked = replies.find((it) => it.id === clickedId);
    let displayParent: number | null = null;
    if (clicked) {
      displayParent = clicked.parentId != null ? Number(clicked.parentId) : Number(clicked.id);
    } else {
      displayParent = clickedId ? Number(clickedId) : null;
    }
    setReplyDisplayParentId(displayParent);

    // focus the input
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelReply = () => {
    setReplyToIdImmediate(null);
    setReplyingToName(null);
    setReplyDisplayParentId(null);
  };

  // Toggle replies open/close
  const toggleReplies = (parentId: string) => {
    setExpandedParents((s) => ({ ...s, [parentId]: !s[parentId] }));
  };

  // Insert optimistic reply into flattened list so it appears under the correct top-level parent
  function insertOptimisticReplyAtCorrectPosition(existing: FlatReply[], optimistic: FlatReply, clickedReplyId: string | null) {
    if (!clickedReplyId) {
      // top-level reply to the post -> prepend
      return [optimistic, ...existing];
    }

    const clicked = existing.find((it) => it.id === clickedReplyId);
    if (!clicked) return [optimistic, ...existing];

    const displayParentId = clicked.parentId ?? Number(clicked.id);

    // find top-level parent index
    const parentIndex = existing.findIndex(
      (it) => it.id === String(displayParentId) && (it.parentId === null || it.parentId === undefined)
    );
    const fallbackIndex = existing.findIndex((it) => it.id === String(displayParentId));
    const pIndex = parentIndex !== -1 ? parentIndex : fallbackIndex;
    if (pIndex === -1) return [optimistic, ...existing];

    // collect children indices that belong to this parent
    let i = pIndex + 1;
    const children: { idx: number; item: FlatReply }[] = [];
    while (i < existing.length && existing[i].parentId === displayParentId) {
      children.push({ idx: i, item: existing[i] });
      i++;
    }

    if (children.length === 0) {
      const copy = existing.slice();
      copy.splice(pIndex + 1, 0, optimistic);
      return copy;
    }

    // newest-first order among children
    const optTs = new Date(optimistic.created_at).getTime();
    let insertIndex = pIndex + 1 + children.length; // append by default
    for (let j = 0; j < children.length; j++) {
      const cTs = new Date(children[j].item.created_at).getTime();
      if (!isNaN(optTs) && !isNaN(cTs) && optTs > cTs) {
        insertIndex = children[j].idx;
        break;
      }
    }

    const copy = existing.slice();
    copy.splice(insertIndex, 0, optimistic);
    return copy;
  }

  // SUBMITREPLY: use replyToIdImmediate in the API payload (the immediate parent), but keep replyDisplayParentId for UI
  const submitReply = async () => {
    const content = text.trim();
    if (!content) return;
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/support-group/${postId}/comment`)}`);
      return;
    }

    setPosting(true);
    const tempId = `temp-${Date.now()}`;

    // optimistic for UI uses display parent (so it shows under the right top-level thread)
    const optimistic: FlatReply = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      user_name: currentUser?.full_name ?? currentUser?.user_name ?? "You",
      parentId: replyDisplayParentId, // UI grouping only
      replyingTo: replyingToName ?? null,
    };

    // insert in flattened list optimistically using the immediate clicked id to determine placement
    setReplies((prev) => insertOptimisticReplyAtCorrectPosition(prev, optimistic, replyToIdImmediate));

    // IMPORTANT: payload must carry the immediate parent id (the exact comment id being replied to),
    // not replyDisplayParentId. That's what the backend expects.
    const payload = { content, parent_id: replyToIdImmediate ? Number(replyToIdImmediate) : undefined };

    try {
      const created = await groupApi.postReply(postId, payload);

      const createdId = String(created.id ?? created.pk ?? created._id ?? Date.now());

      // Replace temp optimistic entry with server created object. Keep UI grouping consistent:
      setReplies((prev) =>
        prev.map((it) =>
          it.id === tempId
            ? {
                id: createdId,
                content: created.content ?? content,
                created_at: created.created_at ?? new Date().toISOString(),
                user_name: created.user_name ?? created.user?.name ?? optimistic.user_name,
                // For display: if backend returns parent_id (the actual parent), map it to the display grouping.
                // We prefer to keep the optimistic display parent (replyDisplayParentId) so position doesn't jump.
                parentId: created.parent_id != null ? (replyDisplayParentId ?? Number(created.parent_id)) : replyDisplayParentId,
                replyingTo: optimistic.replyingTo ?? null,
              }
            : it
        )
      );

      // cleanup UI state
      setText("");
      setReplyToIdImmediate(null);
      setReplyDisplayParentId(null);
      setReplyingToName(null);

      // scroll to new item
      setTimeout(() => {
        const node = listRef.current?.querySelector<HTMLElement>(`[data-reply-id="${createdId}"]`);
        if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    } catch (err: any) {
      // rollback optimistic
      setReplies((r) => r.filter((it) => it.id !== tempId));
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/support-group/${postId}/comment`)}`);
        return;
      }
      console.error("post reply failed", err);
      alert("Could not post reply. Try again.");
    } finally {
      setPosting(false);
    }
  };

  // like handler for the post (optimistic)
  const handleToggleLike = async () => {
    const current = await authApi.getCurrentUser().catch(() => null);
    if (!current) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prevLiked);
    setLikeCount(prevCount + (prevLiked ? -1 : 1));
    setLikePending(true);
    try {
      await groupApi.likePost(postId);
    } catch (err: any) {
      console.error("like failed", err);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
    } finally {
      setLikePending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) || (e.key === "Enter" && !e.shiftKey && text.trim())) {
      e.preventDefault();
      submitReply();
    }
  };

  const handleShare = async (url?: string, title?: string) => {
    try {
      const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : `/support-group/${postId}`);
      if ((navigator as any)?.share) {
        await (navigator as any).share({ title: title ?? initialPost?.title ?? "Post", url: shareUrl });
      } else if ((navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(shareUrl);
        alert("Link copied to clipboard");
      } else {
        window.prompt("Copy this link", shareUrl);
      }
    } catch (err) {
      console.warn("share failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
        <button aria-label="Back" onClick={() => router.back()} className="h-8 w-8 flex items-center justify-center rounded-md">
          <Image src="/back.svg" alt="back" width={18} height={18} />
        </button>
        <h1 className="text-lg font-bold text-[#18448A]">Post</h1>
      </div>

      {/* PostCard - controlled like */}
      <div className="px-4 py-4 border-b">
        <PostCard
          id={String(initialPost?.id ?? postId)}
          avatar={initialPost?.avatar_url ?? "/avatars/omar.png"}
          name={initialPost?.full_name ?? "Unknown"}
          time={initialPost?.created_at}
          title={initialPost?.title}
          excerpt={initialPost?.content}
          isLiked={isLiked}
          likeCount={likeCount}
          onToggleLike={handleToggleLike}
        />
      </div>

      {/* Comments header */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-xs text-gray-500">{(initialPost?.reply_count ?? replies.length) > 0 ? `${initialPost?.reply_count ?? replies.length} comment${(initialPost?.reply_count ?? replies.length) === 1 ? "" : "s"}` : "No comments"}</div>
        <div className="mt-1 text-[18px] font-bold">Most Recent</div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-auto px-4 py-2 pb-32" ref={listRef}>
        {loadingReplies && <div className="text-center text-sm text-gray-500 py-4">Loading comments…</div>}
        {!loadingReplies && grouped.top.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8 flex flex-col items-center">
            <div className="font-medium text-[#18448A]">Your words can heal 💙</div>
            <div className="mt-2">Be the first to share your thoughts and support healthy living together</div>
            <Image src="/HandPointing.svg" alt="No replie" width={60} height={60} className="object-cover" />
          </div>
        )}

        <div className="space-y-4">
          {grouped.top.map((parent) => {
            const children = grouped.map[String(parent.id)] ?? [];
            const showChildren = !!expandedParents[String(parent.id)]; // <-- ensured variable name casing
            return (
              <div key={parent.id} className="bg-white border rounded-xl">
                <div className="p-4">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden">
                      <Image src="/avatars/omar.png" alt={parent.user_name} width={40} height={40} className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[16px] font-semibold text-[#18448A]">{parent.user_name}</div>
                          <div className="text-xs text-gray-400">{timeAgo(parent.created_at)}</div>
                        </div>
                      </div>

                      <div className="mt-3 text-[#54555A] leading-6">{parent.content}</div>

                      <div className="mt-3 flex items-center justify-between gap-6 text-sm">
                        <button className="flex items-center gap-2 text-[#16AF9F]">
                          <Image src="/favorite.svg" alt="like" width={16} height={16} />
                          <span>547</span>
                        </button>
                        <button className="flex items-center gap-2 text-[#6B7280]" onClick={() => startReply(String(parent.id), parent.user_name)}>
                          <Image src="/chat_bubble.svg" alt="reply" width={16} height={16} />
                          <span>{children.length || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 text-[#6B7280]" onClick={() => handleShare()}>
                          <Image src="/share.svg" alt="share" width={16} height={16} />
                          <span>Share</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {children.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2 items-center">
                        {children.slice(0, 3).map((c, i) => (
                          <div key={i} className="h-7 w-7 rounded-full ring-2 ring-white overflow-hidden">
                            <Image src="/avatars/omar.png" alt={c.user_name} width={28} height={28} className="object-cover" />
                          </div>
                        ))}
                      </div>

                      <button onClick={() => toggleReplies(String(parent.id))} className="text-sm text-[#18448A]">
                        {showChildren ? `Hide replies (${children.length})` : `Show replies (${children.length})`}
                      </button>
                    </div>
                  </div>
                )}

                {children.length > 0 && showChildren && (
                  <div className="px-4 pb-4 space-y-3">
                    {children.map((child) => (
                      <div key={child.id} data-reply-id={child.id} className="flex gap-3 items-start">
                        <div className="h-8 w-8 rounded-full overflow-hidden mt-1">
                          <Image src="/avatars/omar.png" alt={child.user_name} width={32} height={32} className="object-cover" />
                        </div>

                        <div className="flex-1 bg-[#F7FAF9] rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-semibold text-[#18448A]">{child.user_name}</div>
                              <div className="text-xs text-gray-400">{timeAgo(child.created_at)}</div>
                            </div>
                          </div>

                          <div className="mt-2 text-[#54555A]">{child.content}</div>

                          <div className="mt-2 flex items-center gap-4 text-sm justify-between">
                            <button className="flex items-center gap-2 text-[#16AF9F]">
                              <Image src="/favorite.svg" alt="like" width={14} height={14} />
                              <span>547</span>
                            </button>
                            <button onClick={() => startReply(child.id, child.user_name)} className="text-[#18448A] flex items-center gap-2">
                              <Image src="/chat_bubble.svg" alt="reply" width={14} height={14} />
                              <span>Reply</span>
                            </button>
                            <button onClick={() => handleShare()} className="text-[#6B7280] flex items-center gap-2">
                              <Image src="/share.svg" alt="share" width={14} height={14} />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed input area */}
      <div className="fixed left-0 right-0 bottom-0 border-t px-4 py-3 bg-white">
        {replyToIdImmediate && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm text-gray-700">Replying to <span className="font-semibold">{replyingToName}</span></div>
            <button onClick={cancelReply} className="text-sm text-gray-500">Cancel</button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <textarea
            ref={inputRef}
            placeholder={replyToIdImmediate ? `Reply to ${replyingToName ?? "user"}` : "Reply to post"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            className="flex-1 h-12 resize-none rounded-full px-4 py-3 text-[15px] outline-none border border-[#EDEDED] focus:ring-2 focus:ring-[#16AF9F]"
          />

          <button
            onClick={submitReply}
            disabled={posting || text.trim().length === 0}
            aria-disabled={posting || text.trim().length === 0}
            aria-busy={posting}
            type="button"
            className="h-12 w-12 rounded-full flex items-center justify-center"
            title={posting ? "Posting…" : "Send reply"}
          >
            {posting ? (
              <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" style={{ borderColor: "#16AF9F", borderTopColor: "transparent" }} />
            ) : (
              <div className="h-12 w-12 rounded-full bg-[#16AF9F] flex items-center justify-center">
                <Image src="/send.svg" alt="Send" width={20} height={20} />
              </div>
            )}
          </button>
        </div>

        {!currentUser && (
          <div className="mt-2 text-xs text-gray-500">You’ll be asked to sign in before posting.</div>
        )}
      </div>
    </div>
  );
}
