// features/support_groups/CommentClient.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";
import PostCard from "@/features/support_groups/components/PostCard";
import Avatar from "@/components/Avatar";
import { useCallback } from "react";

export type FlatReply = {
  id: string;
  content: string;
  created_at: string;
  user_name: string;
  parentId?: string | null;
  replyingTo?: string | null;
  replyingToId?: string | null; // Add this for API requirement
  likeCount?: number;
  isLiked?: boolean;
  moderationStatus?: 'approved' | 'needs_review' | 'rejected';
  avatar_url?: string
};

export default function CommentClient({
  initialPost,
  initialReplies,
  initialCurrentUser = null,
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
    num_reads?: number;
    attachments?: string[];
    group_id?: string;
  } | null;
  initialReplies: FlatReply[];
  initialCurrentUser?: any | null;
  postId: string;
}) {

  // console.log("Initial Replies: ", initialReplies)
  const router = useRouter();

  // normalize server-provided replies: ensure ids and parentIds are strings (or null)
  const normalizedInitialReplies = (initialReplies ?? []).map((r: any) => ({
    id: r.id != null ? String(r.id) : String(Math.random()).slice(2),
    content: r.content,
    created_at: r.created_at,
    user_name: r.user_name ?? r.user?.name ?? "Unknown",
    parentId: r.parentId != null ? String(r.parentId) : r.parent_id != null ? String(r.parent_id) : null,
    replyingTo: r.replyingTo ?? null,
    replyingToId: r.replyingToId ?? r.replying_to_id ?? null,
    likeCount: r.likeCount ?? 0,
    isLiked: r.isLiked ?? false,
    moderationStatus: r.moderationStatus ?? 'approved',
    avatar_url: r.avatar_url ?? ""
  }));

  const [replies, setReplies] = useState<FlatReply[]>(normalizedInitialReplies);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // seed currentUser from server-provided prop if available
  const [currentUser, setCurrentUser] = useState<any | null>(initialCurrentUser ?? null);

  // Controlled like state for the PostCard
  const [isLiked, setIsLiked] = useState<boolean>(!!(initialPost?.is_liked_by_user ?? false));
  const [likeCount, setLikeCount] = useState<number>(initialPost?.like_count ?? 0);
  const [replyCount, setReplyCount] = useState<number>(initialPost?.reply_count ?? 0);
  const [likePending, setLikePending] = useState(false);
  const [replyLikePending, setReplyLikePending] = useState<Record<string, boolean>>({});

  // reply input state
  const [text, setText] = useState("");
  const [replyToIdImmediate, setReplyToIdImmediate] = useState<string | null>(null); // actual id sent to API (string)
  const [replyingToName, setReplyingToName] = useState<string | null>(null); // display name
  const [replyingToUserId, setReplyingToUserId] = useState<string | null>(null); // Add this for replying_to_id
  const [replyDisplayParentId, setReplyDisplayParentId] = useState<string | null>(null); // top-level parent used for grouping (string)
  const [posting, setPosting] = useState(false);
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  const [notifications, setNotifications] = useState<Map<string, {
    message: string;
    type: 'warning' | 'error' | 'success';
    timestamp: number;
  }>>(new Map());


  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const enterKeyHandledRef = useRef(false);

  const isPostingRef = useRef(false);
  const lastNotificationRef = useRef<{ message: string; timestamp: number } | null>(null);

  const recentNotificationsRef = useRef<Map<string, number>>(new Map());

  // only fetch current user client-side if server didn't hydrate it
  useEffect(() => {
    if (initialCurrentUser) return;
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
  }, [initialCurrentUser]);

  useEffect(() => {
    // Wait for initial user check to complete
    if (currentUser === null && !initialCurrentUser) {
      // Small delay to ensure the check is complete
      const timer = setTimeout(() => {
        router.push(`/login?next=${encodeURIComponent(`/support-group/${postId}/comment`)}`);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [currentUser, initialCurrentUser, router, postId]);

  // grouped view (top-level + map of children). comparisons use String(...)
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

  // when user clicks Reply on a comment (could be top-level or nested)
  const startReply = (clickedIdRaw: string, toName?: string | null) => {
    const clickedId = String(clickedIdRaw);
    // clickedId must always be the exact comment id the user clicked on.
    setReplyToIdImmediate(clickedId);
    setReplyingToName(toName ?? null);
    
    // Store the clicked user's id for replying_to_id
    setReplyingToUserId(clickedId);

    // Compute displayParentId separately: top-level parent id used to insert optimistic replies
    const clicked = replies.find((it) => String(it.id) === clickedId);
    let displayParent: string | null = null;
    if (clicked) {
      displayParent = clicked.parentId != null ? String(clicked.parentId) : String(clicked.id);
    } else {
      displayParent = clickedId ?? null;
    }
    setReplyDisplayParentId(displayParent);

    // debug
    // eslint-disable-next-line no-console
    // console.log("[startReply] clickedImmediate:", clickedId, "displayParent:", displayParent);

    // focus the input
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const cancelReply = () => {
    setReplyToIdImmediate(null);
    setReplyingToName(null);
    setReplyDisplayParentId(null);
    setReplyingToUserId(null);
  };

  const toggleReplies = (parentId: string) => {
    setExpandedParents((s) => ({ ...s, [parentId]: !s[parentId] }));
  }
    // Handle reply likes
  const handleReplyLike = async (replyId: string) => {
    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Optimistic update
    const prevReplies = [...replies];
    const replyIndex = replies.findIndex(r => r.id === replyId);
    
    if (replyIndex !== -1) {
      const reply = replies[replyIndex];
      const wasLiked = reply.isLiked;
      
      // Update state optimistically
      setReplies(prev => prev.map(r => 
        r.id === replyId 
          ? { ...r, isLiked: !wasLiked, likeCount: (r.likeCount || 0) + (wasLiked ? -1 : 1) }
          : r
      ));
      
      setReplyLikePending(prev => ({ ...prev, [replyId]: true }));

      try {
        await groupApi.likeReply(replyId);
      } catch (err: any) {
        console.error("Reply like failed", err);
        // Rollback on error
        setReplies(prevReplies);
        if (err?.message?.toLowerCase().includes("unauthorized")) {
          authApi.clearTokens?.();
          router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        }
      } finally {
        setReplyLikePending(prev => ({ ...prev, [replyId]: false }));
      }
    }
  };

  // Insert optimistic reply into flattened list so it appears under the correct top-level parent
  function insertOptimisticReplyAtCorrectPosition(existing: FlatReply[], optimistic: FlatReply, clickedReplyId: string | null) {
    if (!clickedReplyId) {
      // top-level reply to the post -> prepend
      return [optimistic, ...existing];
    }

    // find clicked by normalized string
    const clicked = existing.find((it) => String(it.id) === String(clickedReplyId));
    if (!clicked) return [optimistic, ...existing];

    // displayParentId is either the clicked.parentId or clicked.id (string)
    const displayParentId = (clicked.parentId != null ? String(clicked.parentId) : String(clicked.id));

    // find top-level parent index: item with same id and parentId == null
    const parentIndex = existing.findIndex(
      (it) => String(it.id) === String(displayParentId) && (it.parentId == null)
    );
    const fallbackIndex = existing.findIndex((it) => String(it.id) === String(displayParentId));
    const pIndex = parentIndex !== -1 ? parentIndex : fallbackIndex;
    if (pIndex === -1) return [optimistic, ...existing];

    // collect children indices that belong to this parent (compare strings; skip nulls)
    let i = pIndex + 1;
    const children: { idx: number; item: FlatReply }[] = [];
    while (i < existing.length && existing[i].parentId != null && String(existing[i].parentId) === String(displayParentId)) {
      children.push({ idx: i, item: existing[i] });
      i++;
    }

    if (children.length === 0) {
      const copy = existing.slice();
      copy.splice(pIndex + 1, 0, optimistic);
      return copy;
    }

    // newest-first among children
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

  // Add this function to fetch replies inside CommentClient component
  const fetchReplies = async () => {
    setLoadingReplies(true);
    try {
      const repliesData = await groupApi.getReplies(postId);
      
      // Use the same flattening logic as in the server component
      const flattened = flattenRepliesClient(repliesData);
      setReplies(flattened);
      
      // Update reply count if needed
      if (initialPost?.reply_count !== undefined) {
        setReplyCount(flattened.filter(r => r.moderationStatus === 'approved').length);
      }
    } catch (err) {
      console.error("Failed to fetch replies", err);
    } finally {
      setLoadingReplies(false);
    }
  };

  // Update the submitReply function to refresh after successful post
  const submitReply = async () => {
    console.trace('submitReply called');
    console.log('submit start', { isPosting: isPostingRef.current })
    const content = text.trim();
    if (!content) return;
    
    // Prevent double submission
    if (isPostingRef.current) {
      console.log('Already posting, skipping duplicate submission');
      return;
    }

    if (!currentUser) {
      router.push(`/login?next=${encodeURIComponent(`/support-group/${postId}/comment`)}`);
      return;
    }

    isPostingRef.current = true;
    setPosting(true);
    
    const tempId = `temp-${Date.now()}`;

    const optimistic: FlatReply = {
      id: tempId,
      content,
      created_at: new Date().toISOString(),
      user_name: currentUser?.full_name ?? currentUser?.user_name ?? "You",
      parentId: replyDisplayParentId,
      replyingTo: replyingToName ?? null,
      replyingToId: replyingToUserId ?? null,
      likeCount: 0,
      isLiked: false,
      moderationStatus: 'needs_review',
      avatar_url: ""
    };

    setReplies((prev) => insertOptimisticReplyAtCorrectPosition(prev, optimistic, replyToIdImmediate));
      const payload: { content: string; parent_id?: number; replying_to_id?: number } = { content };
    
    if (replyToIdImmediate) {
      payload.parent_id = Number(replyToIdImmediate);
    }
    
    if (replyingToUserId && replyDisplayParentId && replyingToUserId !== replyDisplayParentId) {
      payload.replying_to_id = Number(replyingToUserId);
    }

    try {
      const created = await groupApi.postReply(postId, payload);
      const createdId = String(created.id ?? created.pk ?? created._id ?? Date.now());
      
      // Check moderation status from response
      const moderationStatus = created.moderation_status || created.moderationStatus;
      
      // Show notification only once
      if (moderationStatus === 'rejected') {
        showNotification(
          "Your comment was rejected. Please ensure it follows community guidelines.",
          'error'
        );
      } else if (moderationStatus === 'needs_review') {
        showNotification(
          "Your comment has been posted and is pending review by moderators.",
          'warning'
        );
      } else if (moderationStatus === 'approved') {
        showNotification(
          "Your comment has been posted successfully!",
          'success'
        );
      }

      // Refresh replies to get the actual data from server
      await fetchReplies();

      // Dispatch event
      try {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("mcc:reply-created", {
              detail: { postId: String(postId), replyId: createdId },
            })
          );
        }
      } catch (e) {
        console.warn("reply-created dispatch failed", e);
      }

      // Clear form
      setText("");
      setReplyToIdImmediate(null);
      setReplyDisplayParentId(null);
      setReplyingToName(null);
      setReplyingToUserId(null);

      // Scroll to created reply
      setTimeout(() => {
        const node = listRef.current?.querySelector<HTMLElement>(`[data-reply-id="${createdId}"]`);
        if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } catch (err: any) {
      // Remove optimistic reply
      setReplies((r) => r.filter((it) => it.id !== tempId));
      
      if (err?.message?.toLowerCase().includes("unauthorized")) {
        authApi.clearTokens?.();
        router.push(`/login?next=${encodeURIComponent(`/support-group/${postId}/comment`)}`);
        return;
      }
      
      console.error("post reply failed", err);
      showNotification("Failed to post comment. Please try again.", 'error');
    } finally {
      setPosting(false);
      // Reset the ref after a short delay
      setTimeout(() => {
        isPostingRef.current = false;
      }, 500);
    }
  };

  // Also update the flattenRepliesClient function to handle all the properties
  function flattenRepliesClient(apiReplies: any[] = []): FlatReply[] {
    const out: FlatReply[] = [];
    (apiReplies || []).forEach((r: any) => {
      // Top-level reply
      out.push({
        id: String(r.id),
        content: r.content,
        created_at: r.created_at,
        user_name: r.user_name ?? r.user?.name ?? "Unknown",
        parentId: null,
        replyingTo: null,
        replyingToId: null,
        likeCount: r.like_count ?? 0,
        isLiked: r.is_liked ?? false,
        moderationStatus: r.moderation_status ?? 'approved',
        avatar_url: r.avatar_url ?? ""
      });
      
      // Nested replies
      if (Array.isArray(r.replies) && r.replies.length > 0) {
        r.replies.forEach((nested: any) =>
          out.push({
            id: String(nested.id),
            content: nested.content,
            created_at: nested.created_at,
            user_name: nested.user_name ?? nested.user?.name ?? "Unknown",
            parentId: String(r.id),
            replyingTo: r.user_name ?? r.user?.name ?? null,
            replyingToId: String(r.id),
            likeCount: nested.like_count ?? 0,
            isLiked: nested.is_liked ?? false,
            moderationStatus: nested.moderation_status ?? 'approved',
          })
        );
      }
    });
    return out;
  }


  // like handler for the post (optimistic)
  const handleToggleLike = async () => {
    if (!currentUser) {
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

    console.trace('enter-key?', enterKeyHandledRef.current)
    // Only handle Enter key
    if (e.key !== "Enter") return;
    
    // Handle Shift+Enter for new line
    if (e.shiftKey) return;
    
    // Check if there's content
    if (!text.trim()) {
      e.preventDefault();
      return;
    }
    
    // Prevent default and stop propagation immediately
    e.preventDefault();
    e.stopPropagation();
    
    // Check if already posting using the ref
    if (isPostingRef.current || posting) {
      console.log('Already posting, ignoring Enter key');
      return;
    }
    
    // Submit only once
    submitReply();
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

  // Filter replies based on moderation status
  const visibleReplies = replies.filter(reply => {
    // Show all approved replies
    if (reply.moderationStatus === 'approved') return true;
    
    // Show user's own replies regardless of status
    if (currentUser && reply.user_name === (currentUser.full_name || currentUser.user_name)) return true
        
    // Don't show rejected replies from others
    return false;
  });

  // Update grouped to use visible replies
  const visibleGrouped = useMemo(() => {
    const map: Record<string, FlatReply[]> = {};
    const top: FlatReply[] = [];
    for (const r of visibleReplies) {
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
  }, [visibleReplies]);

  const showNotification = useCallback((message: string, type: 'warning' | 'error' | 'success' = 'warning') => {
    const now = Date.now();
    
    // Check against the ref for immediate deduplication
    const lastShown = recentNotificationsRef.current.get(message);
    if (lastShown && now - lastShown < 2000) {
      console.log('Duplicate notification blocked (ref check):', message);
      return;
    }
    
    // Update the ref immediately
    recentNotificationsRef.current.set(message, now);
    
    // Clean up old entries from ref
    setTimeout(() => {
      recentNotificationsRef.current.delete(message);
    }, 2000);
    
    setNotifications(prev => {
      // Additional check against state
      const existingNotification = Array.from(prev.values()).find(
        n => n.message === message && now - n.timestamp < 2000
      );
      
      if (existingNotification) {
        console.log('Duplicate notification blocked (state check):', message);
        return prev;
      }
      
      const newMap = new Map(prev);
      const key = `${type}-${Date.now()}-${Math.random()}`;
      
      newMap.set(key, { message, type, timestamp: now });
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => {
          const updated = new Map(prev);
          updated.delete(key);
          return updated;
        });
      }, 5000);
      
      return newMap;
    });
  }, []);

  // Notification Component
  // Add this component before your main return statement
  const NotificationBanner = () => {
  const notificationArray = Array.from(notifications.values());
  if (notificationArray.length === 0) return null;
  
  // Keep track of seen messages to avoid duplicates
  const seenMessages = new Set<string>();
  const uniqueNotifications: typeof notificationArray = [];
  
  // Filter duplicates (keep the most recent)
  for (let i = notificationArray.length - 1; i >= 0; i--) {
    const notification = notificationArray[i];
    if (!seenMessages.has(notification.message)) {
      seenMessages.add(notification.message);
      uniqueNotifications.unshift(notification);
    }
  }
  
  // Show only the most recent notification
  const notification = uniqueNotifications[uniqueNotifications.length - 1];
  if (!notification) return null;
  
  return (
    <div className="fixed bottom-18 left-4 right-4 z-50 animate-slide-up">
      <div
        className={`
          p-4 rounded-lg shadow-lg flex items-start justify-between gap-3
          ${notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : ''}
          ${notification.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' : ''}
          ${notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : ''}
        `}
      >
        <div className="flex items-start gap-2">
          {notification.type === 'error' && <span>❌</span>}
          {notification.type === 'warning' && <span>⚠️</span>}
          {notification.type === 'success' && <span>✅</span>}
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
        <button
          onClick={() => setNotifications(new Map())}
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header */}
      <div className="px-4 py-3 border-b bg-white flex items-center gap-3">
        <button aria-label="Back" onClick={() => router.push(`/group/${initialPost?.group_id}`)} className="h-8 w-8 flex items-center justify-center rounded-md">
          <Image src="/back.svg" alt="back" width={18} height={18} />
        </button>
        <h1 className="text-lg font-bold text-[#18448A]">Post</h1>
      </div>

      {/* PostCard - controlled like */}
      <div className="border-b">
        <PostCard
          id={String(initialPost?.id ?? postId)}
          avatar={initialPost?.avatar_url ?? ""}
          name={initialPost?.full_name ?? "Unknown"}
          time={initialPost?.created_at}
          title={initialPost?.title}
          excerpt={initialPost?.content}
          isLiked={isLiked}
          likeCount={likeCount}
          replyCount={replyCount}
          viewCount={initialPost?.num_reads}
          onToggleLike={handleToggleLike}
          className="rounded-none"
          attachments={initialPost?.attachments}
          showFullContent={true}
        />
      </div>

      {/* Comments header */}
      <div className="px-4 pt-4 pb-2">
        <div className="text-xs text-gray-500">
          {visibleReplies.length > 0 ? `${visibleReplies.length} comment${visibleReplies.length === 1 ? "" : "s"}` : "No comments"}
        </div>
        <div className="mt-1 text-[18px] font-bold">Most Recent</div>
      </div>

      <NotificationBanner />

      {/* Comments list */}
      <div className="flex-1 overflow-auto px-4 py-2 pb-32" ref={listRef}>
        {loadingReplies && <div className="text-center text-sm text-gray-500 py-4">Loading comments…</div>}
        {!loadingReplies && visibleGrouped.top.length === 0 && (
          <div className="text-center text-sm text-gray-500 py-8 flex flex-col items-center">
            <div className="font-medium text-[#18448A]">Your words can heal 💙</div>
            <div className="mt-2">Be the first to share your thoughts and support healthy living together</div>
            <Image src="/HandPointing.svg" alt="No replies" width={60} height={60} className="object-cover" />
          </div>
        )}

        <div className="space-y-4">
          {visibleGrouped.top.map((parent) => {
            const children = visibleGrouped.map[String(parent.id)] ?? [];
            const showChildren = !!expandedParents[String(parent.id)];
            const isOwn = currentUser && parent.user_name === (currentUser.full_name || currentUser.user_name);
            
            return (
              <div key={parent.id} className="bg-white border rounded-xl">
                <div className="p-4">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden">
                      <Avatar src={parent.avatar_url?.length ? parent.avatar_url : null} name={parent.user_name} size={40} className="object-cover" />
                      {/* <Image src="/avatars/omar.png" alt={parent.user_name} width={40} height={40} className="object-cover" /> */}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[16px] font-semibold text-[#18448A]">{parent.user_name}</div>
                          <div className="text-xs text-gray-400">{timeAgo(parent.created_at)}</div>
                        </div>
                        {/* Show moderation status for user's own comments */}
                        {isOwn && parent.moderationStatus !== 'approved' && (
                          <div className={`text-xs px-2 py-1 rounded ${
                            parent.moderationStatus === 'needs_review' 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {parent.moderationStatus === 'needs_review' ? 'Pending Review' : 'Rejected'}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 text-[#54555A] leading-6">{parent.content}</div>

                      <div className="mt-3 flex items-center justify-between gap-6 text-sm">
                        <button 
                          className={`flex items-center gap-2 ${parent.isLiked ? 'text-[#16AF9F]' : 'text-[#6B7280]'}`}
                          onClick={() => handleReplyLike(parent.id)}
                          disabled={replyLikePending[parent.id]}
                        >
                          <Image 
                            src={parent.isLiked ? "/favorite-fill.svg" : "/favorite.svg"} 
                            alt="like" 
                            width={16} 
                            height={16}   
                          />
                          <span>{parent.likeCount || 0}</span>
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
                            <Avatar src={children[i].avatar_url?.length ? children[i].avatar_url : null} name={children[i].user_name} size={28} className="flex-shrink-0" />
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
                    {children.map((child) => {
                      const isOwnChild = currentUser && child.user_name === (currentUser.full_name || currentUser.user_name);
                      
                      return (
                        <div key={child.id} data-reply-id={child.id} className="flex gap-3 items-start">
                          <div className="h-8 w-8 rounded-full overflow-hidden mt-1">
                            <Avatar src={child.avatar_url?.length ? child.avatar_url : null} name={child.user_name} size={32} className="flex-shrink-0" />
                          </div>

                          <div className="flex-1 bg-[#F7FAF9] rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold text-[#18448A]">
                                  {child.user_name}
                                  {child.replyingTo && (
                                    <span className="font-normal text-gray-500"> • replying to <span className="text-[#18448A]">@{child.replyingTo}</span></span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400">{timeAgo(child.created_at)}</div>
                              </div>
                              {isOwnChild && child.moderationStatus !== 'approved' && (
                                <div className={`text-xs px-2 py-1 rounded ${
                                  child.moderationStatus === 'needs_review' 
                                    ? 'bg-yellow-100 text-yellow-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {child.moderationStatus === 'needs_review' ? 'Pending' : 'Rejected'}
                                </div>
                              )}
                            </div>

                            <div className="mt-2 text-[#54555A]">{child.content}</div>

                            <div className="mt-2 flex items-center gap-4 text-sm justify-between">
                              <button 
                                className={`flex items-center gap-2 ${child.isLiked ? 'text-[#16AF9F]' : 'text-[#6B7280]'}`}
                                onClick={() => handleReplyLike(child.id)}
                                disabled={replyLikePending[child.id]}
                              >
                                <Image 
                                  src={child.isLiked ? "/favorite-fill.svg" : "/favorite.svg"} 
                                  alt="like" 
                                  width={14} 
                                  height={14} 
                                />
                                <span>{child.likeCount || 0}</span>
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
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed input area */}
      <div className="fixed left-0 right-0 bottom-0 px-4 py-3 bg-white">
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
            onKeyPress={(e) => {
              // Prevent any keypress handling for Enter
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
              }
            }}
            rows={1}
            className="flex-1 h-12 resize-none rounded-full px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-[#16AF9F]"
          />

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                submitReply();
              }}
              onMouseDown={(e) => {
                // Prevent focus issues
                e.preventDefault();
              }}
              disabled={posting || text.trim().length === 0}
              aria-disabled={posting || text.trim().length === 0}
              aria-busy={posting}
              type="button"
              className="h-12 w-12 rounded-full flex items-center justify-center"
              title={posting ? "Posting…" : "Send reply"}
            >
            {posting ? (
              <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-[#16AF9F] flex items-center justify-center">
                <Image src="/send.svg" alt="Send" width={20} height={20} />
              </div>
            )}
          </button>
        </div>

        {!currentUser && (
          <div className="mt-2 text-xs text-gray-500">You'll be asked to sign in before posting.</div>
        )}
      </div>
    </div>
  );
}