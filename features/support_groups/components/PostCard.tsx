"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { timeAgo } from "./Card";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";

export type PostCardProps = {
  id: string;
  avatar?: string;
  name: string;
  time?: string;
  title?: string;
  excerpt?: string;
  tag?: string;
  className?: string;

  // controlled props
  isLiked?: boolean;
  likeCount?: number;
  replyCount?: number;

  // optional callback (when provided parent controls the like action)
  onToggleLike?: () => Promise<void> | void;

  // optional callback to notify parent when user navigates to comment page
  // parent can use this to update reply counts / analytics etc.
  onReplyNavigate?: () => void;
};

export default function PostCard({
  id,
  avatar = "/avatars/omar.png",
  name,
  time,
  title,
  excerpt,
  tag,
  className = "",
  // controlled props (may be undefined => PostCard will manage itself)
  isLiked: isLikedProp,
  likeCount: likeCountProp,
  replyCount: replyCountProp,
  onToggleLike,
  onReplyNavigate,
}: PostCardProps) {
  const router = useRouter();

  // If parent is not controlling likes, PostCard will manage them itself (legacy behavior)
  const [likedLocal, setLikedLocal] = useState<boolean>(!!isLikedProp && isLikedProp);
  const [pending, setPending] = useState(false);
  const [likeCountLocal, setLikeCountLocal] = useState<number>(likeCountProp ?? 0);

  // Reply count local state (self-managed like likes)
  const [replyCountLocal, setReplyCountLocal] = useState<number>(replyCountProp ?? 0);

  // keep local states in sync if props change
  useEffect(() => {
    setLikeCountLocal(likeCountProp ?? 0);
  }, [likeCountProp]);

  useEffect(() => {
    setReplyCountLocal(replyCountProp ?? 0);
  }, [replyCountProp]);

  // If parent passes controlled handler for like, treat like as controlled
  const isControlledLike = typeof onToggleLike === "function";
  const isLikedDisplay = isControlledLike ? !!isLikedProp : likedLocal;
  const likeCountDisplay = isControlledLike ? (likeCountProp ?? 0) : likeCountLocal;

  // For reply count display: parent controls if replyCountProp is provided (not undefined).
  // Otherwise we display and manage replyCountLocal.
  const replyCountDisplay = typeof replyCountProp === "number" ? replyCountProp : replyCountLocal;

  // legacy internal like handler (only used when parent doesn't provide onToggleLike)
  const handleLikeInternal = async () => {
    if (pending) return;

    const current = await authApi.getCurrentUser().catch(() => null);
    if (!current) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setLikedLocal((l) => !l);
    setPending(true);

    // optimistic like count change
    setLikeCountLocal((c) => (likedLocal ? Math.max(c - 1, 0) : c + 1));

    try {
      await groupApi.likePost(String(id));
    } catch (err) {
      // rollback
      console.error("like failed", err);
      setLikedLocal(false);
      setLikeCountLocal((c) => (c > 0 ? c - 1 : 0));
    } finally {
      setPending(false);
    }
  };

  // when parent wants to control the like action, call onToggleLike and let parent update props
  const handleLike = async () => {
    if (pending) return;

    if (isControlledLike) {
      // quick auth check
      const current = await authApi.getCurrentUser().catch(() => null);
      if (!current) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      setPending(true);
      try {
        await onToggleLike!();
      } catch (err) {
        console.error("parent like handler failed", err);
      } finally {
        setPending(false);
      }
      return;
    }

    // fallback to internal handler
    return handleLikeInternal();
  };

  // When user clicks reply we notify parent (optional) and navigate to comment page.
  // Parent can use onReplyNavigate to increment replyCountLocal or trigger refresh.
  const handleReply = (e: React.MouseEvent) => {
    e.stopPropagation();

    // notify parent (optional) so it can bump its own counters or run analytics
    try {
      onReplyNavigate?.();
    } catch (err) {
      // ignore errors from parent callback
      console.warn("onReplyNavigate failed", err);
    }

    // navigate to comments page
    const href = `/support-group/${id}/comment`;
    try {
      router.prefetch?.(href);
    } catch {}
    router.push(href);
  };

  useEffect(() => {
  setReplyCountLocal(replyCountProp ?? 0);
}, [replyCountProp]);

// add this effect to listen for reply-created events
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (ev: Event) => {
      try {
        const custom = ev as CustomEvent<{ postId: string; replyId?: string }>;
        if (!custom?.detail) return;
        const { postId: evtPostId } = custom.detail ?? {};
        if (!evtPostId) return;
        // Only bump if this PostCard is self-managing reply count (i.e., parent didn't pass prop)
        if (typeof replyCountProp === "number") return;
        if (String(evtPostId) === String(id)) {
          setReplyCountLocal((c) => (typeof c === "number" ? c + 1 : 1));
        }
      } catch (e) {
        // ignore
      }
    };

    window.addEventListener("mcc:reply-created", handler as EventListener);
    return () => {
      window.removeEventListener("mcc:reply-created", handler as EventListener);
    };
  }, [id, replyCountProp]);

  return (
    <Card className={`w-full border border-gray-200 rounded-xl shadow-sm ${className}`}>
      <CardContent className="p-2">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Image src={avatar} alt={name} width={44} height={44} className="rounded-full border" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-[#18448A] truncate">{name}</div>
                <div className="text-sm text-gray-500">{timeAgo(time)}</div>
              </div>
            </div>

            {/* Title + Excerpt */}
            <div className="mt-3">
              <h3 className="font-bold text-gray-800 leading-5 line-clamp-2">{title}</h3>
              <p className="text-gray-600 mt-1 line-clamp-2">{excerpt}</p>
            </div>

            {/* Tag + small stats row */}
            <div className="mt-3 flex items-center gap-3">
              {tag && (
                <span className="inline-block bg-[#7750A3] text-white text-[11px] px-3 py-1 rounded-full">
                  {tag}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mt-4" />

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between text-gray-700">
          {/* Like button */}
          <button
            type="button"
            onClick={handleLike}
            disabled={pending}
            aria-pressed={isLikedDisplay}
            aria-label={isLikedDisplay ? "Liked" : "Like"}
            className="flex items-center text-gray-600 px-2 py-1 disabled:opacity-60"
          >
            <div className="relative h-5 w-5">
              <Image
                src={isLikedDisplay ? "/favorite-fill.svg" : "/favorite.svg"}
                alt={isLikedDisplay ? "Liked" : "Like"}
                fill
                sizes="20px"
                style={{ objectFit: "contain" }}
                priority={false}
              />
            </div>

            {/* <span className={`text-sm ${isLikedDisplay ? "text-[#00A79C]" : ""}`}>Like</span> */}
            <span className="ml-2 text-[#6B7280]">{likeCountDisplay}</span>
          </button>

          <button className="flex items-center gap-2 text-gray-600 px-2 py-1" onClick={handleReply}>
            <Image src="/chat_bubble.svg" alt="Reply" width={20} height={20} />
            <span className="ml-2 text-[#6B7280]">{replyCountDisplay}</span>
          </button>

          <button className="flex items-center gap-2 text-gray-600 px-2 py-1" onClick={() => { /* outer parent can handle share if wrapped in Link */ }}>
            <Image src="/share.svg" alt="Share" width={20} height={20} />
            <span>Share</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
