// features/support_groups/CommentClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";

/** types for flattened replies passed from server */
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
  initialPost: { id?: string | number; title?: string; content?: string; full_name?: string; created_at?: string } | null;
  initialReplies: FlatReply[];
  postId: string;
}) {
  const router = useRouter();

  const [replies, setReplies] = useState<FlatReply[]>(initialReplies ?? []);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  // input state
  const [text, setText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyingToName, setReplyingToName] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

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

  // If you want to offer "refresh" replies client-side (optional)
  const refreshReplies = async () => {
    setLoadingReplies(true);
    try {
      const fresh = (await groupApi.getReplies(postId)) as any[]; // API returns nested replies
      // flatten on client the same way we did server-side
      const flattened = flattenRepliesClient(fresh);
      setReplies(flattened);
    } catch (e) {
      console.warn("refresh replies failed", e);
    } finally {
      setLoadingReplies(false);
    }
  };

  // flatten helper for client (same logic as server)
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

  // compose a small timeAgo util
  function timeAgo(dateString?: string) {
    if (!dateString) return "";
    const d = new Date(dateString);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString();
  }

  // when user clicks Reply under a comment:
  const startReply = (id: string, toName?: string | null) => {
    setReplyToId(id);
    setReplyingToName(toName ?? null);
    // focus input
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelReply = () => {
    setReplyToId(null);
    setReplyingToName(null);
  };

  const submitReply = async () => {
    const content = text.trim();
    if (!content) return;
    // require auth
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/support-group/${postId}/comment`)}`);
      return;
    }

    setPosting(true);
    // optimistic UI: create a temp reply object and append
    const tempId = `temp-${Date.now()}`;
    const optimistic: FlatReply = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      user_name: currentUser?.first_name ?? currentUser?.name ?? "You",
      parentId: replyToId ? Number(replyToId) : null,
      replyingTo: replyingToName ?? null,
    };
    setReplies((r) => [optimistic, ...r]); // newest first

    try {
      // call API
      const payload = { content, parentId: replyToId ? Number(replyToId) : undefined };
      const created = await groupApi.postReply(postId, payload);
      // API should return created comment object (id, content, created_at, user_name)
      // Replace temp with created
      setReplies((r) =>
        r.map((it) => (it.id === tempId ? {
          id: String(created.id ?? created.pk ?? created._id ?? created.temp_id),
          content: created.content ?? content,
          created_at: created.created_at ?? new Date().toISOString(),
          user_name: created.user_name ?? created.user?.name ?? optimistic.user_name,
          parentId: created.parent_id ?? optimistic.parentId ?? null,
          replyingTo: optimistic.replyingTo ?? null,
        } : it))
      );
      setText("");
      cancelReply();
      // scroll to top of list or newly created comment if desired
      setTimeout(() => {
        if (listRef.current) {
          listRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 50);
    } catch (err: any) {
      // rollback optimistic update
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

  // allow keyboard submit (Cmd/Enter or Enter)
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key === "Enter" && (e.ctrlKey || e.metaKey)) || (e.key === "Enter" && !e.shiftKey && text.trim())) {
      e.preventDefault();
      submitReply();
    }
  };

  // layout: mobile-first container
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
        <button
          aria-label="Back"
          onClick={() => router.push("/home")}
          className="h-8 w-8 flex items-center justify-center rounded-md"
        >
          <Image src="/back.svg" alt="back" width={18} height={18} />
        </button>
        <h1 className="text-lg font-bold text-[#18448A]">Comment</h1>
      </div>

      {/* Post summary */}
      <div className="px-4 py-4 border-b">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
            <Image src="/avatars/omar.png" alt="poster" width={40} height={40} className="object-cover" />
          </div>
          <div className="flex-1">
            <div className="text-[16px] font-semibold text-[#18448A]">{initialPost?.full_name ?? "Unknown"}</div>
            <div className="text-xs text-gray-400 mt-1">{timeAgo(initialPost?.created_at)}</div>
            <div className="text-[14px] font-bold mt-1">{initialPost?.title}</div>
            <div className="text-[14px] text-[#54555A] mt-2">{initialPost?.content}</div>
          </div>
        </div>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-auto px-4 py-4" ref={listRef}>
        {loadingReplies && <div className="text-center text-sm text-gray-500 py-4">Loading comments…</div>}
        {!loadingReplies && replies.length === 0 && <div className="text-center text-sm text-gray-500 py-4">No comments yet. Be the first to reply.</div>}
        <div className="space-y-4">
          {replies.map((r) => (
            <div key={r.id} className="bg-white border rounded-xl p-3">
              <div className="flex gap-3 items-start">
                <div className="h-9 w-9 rounded-full overflow-hidden bg-gray-100">
                  {/* avatar placeholder */}
                  <Image src="/avatars/omar.png" alt={r.user_name} width={36} height={36} className="object-cover" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[16px] font-semibold text-[#18448A]">{r.user_name}</div>
                      <div className="text-xs text-gray-400">{timeAgo(r.created_at)}</div>
                    </div>
                    {/* if this was a reply to someone show small tag */}
                    {r.replyingTo && (
                      <div className="text-xs text-gray-500">Replying to {r.replyingTo}</div>
                    )}
                  </div>

                  <div className="mt-2 text-[#54555A]">{r.content}</div>

                  <div className="mt-3 flex items-center gap-4">
                    <button
                      onClick={() => startReply(r.id, r.user_name ?? r.replyingTo ?? null)}
                      className="text-sm text-[#18448A] flex items-center gap-2"
                    >
                      Reply
                    </button>

                    {/* optional like button, share etc can go here */}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed input area */}
      <div className="fixed left-0 right-0 bottom-0 border-t px-4 py-3 bg-white">
        {replyToId && (
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm text-gray-700">Replying to <span className="font-semibold">{replyingToName}</span></div>
            <button onClick={cancelReply} className="text-sm text-gray-500">Cancel</button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            placeholder="Add a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#16AF9F]"
          />
          <button
            onClick={submitReply}
            disabled={posting || text.trim().length === 0}
            className={`h-10 px-4 rounded-lg font-medium ${posting || text.trim().length===0 ? "bg-gray-300 text-gray-600" : "bg-[#16AF9F] text-white"}`}
          >
            {posting ? "Posting…" : "Send"}
          </button>
        </div>

        {/* small note for unauthenticated users */}
        {!currentUser && (
          <div className="mt-2 text-xs text-gray-500">You’ll be asked to sign in before posting.</div>
        )}
      </div>
    </div>
  );
}
