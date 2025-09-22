"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { timeAgo } from "./Card";
import { useEffect, useRef, useState } from "react";
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
  tag?: string[];
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
  onShare?: (payload: { id: string; title?: string; excerpt?: string; tag?: string[] }) => void;
  attachments?: string[],
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
  onShare,
  attachments,
}: PostCardProps) {
  const router = useRouter();

  // ======= REPLACE these state declarations (near top of component) =======
  const [likedLocal, setLikedLocal] = useState<boolean>(!!isLikedProp && isLikedProp);
  const [pending, setPending] = useState(false);
  const [likeCountLocal, setLikeCountLocal] = useState<number>(likeCountProp ?? 0);

  // Add optimistic state for controlled-mode so we can show immediate feedback
  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState<number | null>(null);

  // ======= REPLACE computation of displayed values =======
  // (instead of the old isLikedDisplay / likeCountDisplay lines)
  const isControlledLike = typeof onToggleLike === "function";
  const isLikedDisplay = isControlledLike ? (optimisticLiked ?? !!isLikedProp) : likedLocal;
  const likeCountDisplay = isControlledLike ? (optimisticLikeCount ?? (likeCountProp ?? 0)) : likeCountLocal;
  // replyCountDisplay remains the same
  const [replyCountLocal, setReplyCountLocal] = useState<number>(replyCountProp ?? 0);

  const replyCountDisplay = typeof replyCountProp === "number" ? replyCountProp : replyCountLocal;


  // Reply count local state (self-managed like likes)
  // keep local states in sync if props change
  useEffect(() => {
    setLikeCountLocal(likeCountProp ?? 0);
  }, [likeCountProp]);

  useEffect(() => {
    setReplyCountLocal(replyCountProp ?? 0);
  }, [replyCountProp]);

  // // If parent passes controlled handler for like, treat like as controlled
  // const isControlledLike = typeof onToggleLike === "function";
  // const isLikedDisplay = isControlledLike ? !!isLikedProp : likedLocal;
  // const likeCountDisplay = isControlledLike ? (likeCountProp ?? 0) : likeCountLocal;

  // // For reply count display: parent controls if replyCountProp is provided (not undefined).
  // // Otherwise we display and manage replyCountLocal.
  // const replyCountDisplay = typeof replyCountProp === "number" ? replyCountProp : replyCountLocal;

  // legacy internal like handler (only used when parent doesn't provide onToggleLike)
  
  // ======= REPLACE handleLikeInternal + handleLike with these implementations =======

  /** Internal (self-managed) optimistic like */
  const handleLikeInternal = async () => {
    if (pending) return;

    const current = await authApi.getCurrentUser().catch(() => null);
    if (!current) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // snapshot previous values so we can rollback if needed
    const prevLiked = likedLocal;
    const prevCount = likeCountLocal;

    // optimistic update: flip liked and adjust count immediately
    const newLiked = !prevLiked;
    setLikedLocal(newLiked);
    setLikeCountLocal(newLiked ? prevCount + 1 : Math.max(prevCount - 1, 0));
    setPending(true);

    try {
      await groupApi.likePost(String(id));
      // success -> nothing else required; state already reflects server intent
    } catch (err) {
      console.error("like failed", err);
      // rollback
      setLikedLocal(prevLiked);
      setLikeCountLocal(prevCount);
    } finally {
      setPending(false);
    }
  };

  /** Public handler (supports controlled parent handler too) */
  const handleLike = async () => {
    if (pending) return;

    // quick auth check
    const current = await authApi.getCurrentUser().catch(() => null);
    if (!current) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (isControlledLike) {
      // Controlled by parent: create a local optimistic overlay while we wait for parent to update
      const prevLiked = !!isLikedProp;
      const prevCount = likeCountProp ?? 0;
      const newLiked = !(optimisticLiked ?? prevLiked);
      const newCount = newLiked ? prevCount + 1 : Math.max(prevCount - 1, 0);

      setOptimisticLiked(newLiked);
      setOptimisticLikeCount(newCount);
      setPending(true);

      try {
        // ask parent to toggle; parent is expected to eventually update props
        await onToggleLike!();

        // after parent handler resolves, clear optimistic overlay and let props drive UI.
        // If parent updated props as expected, UI will show the correct final state.
        setOptimisticLiked(null);
        setOptimisticLikeCount(null);
      } catch (err) {
        console.error("parent like handler failed", err);
        // rollback optimistic overlay
        setOptimisticLiked(null);
        setOptimisticLikeCount(null);
      } finally {
        setPending(false);
      }

      return;
    }

    // fallback to internal optimistic handler
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
      // if prefetch hasn't happened yet, prefetch here as a last-second attempt
      router.prefetch?.(href);
    } catch {}
    router.push(href);
  };

  // --- PREFETCH on hover/focus (new) ---
  const prefetchedRef = useRef(false);
  const prefetchComments = async () => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;

    const href = `/support-group/${id}/comment`;

    try {
      // Prefetch the route bundle / data (Next.js client router)
      router.prefetch?.(href);
    } catch (e) {
      // ignore prefetch failures
    }

    try {
      // if your groupApi exposes a comments-getter, warm it up (non-blocking)
      // we guard via runtime check so it won't throw if the function doesn't exist.
      const maybeFn = (groupApi as any).getComments ?? (groupApi as any).getPostComments ?? (groupApi as any).getReplies;
      if (typeof maybeFn === "function") {
        // don't await for too long; this is a best-effort warm up
        const p = maybeFn(String(id));
        // attempt a short wait but don't block
        await Promise.race([p, new Promise((res) => setTimeout(res, 350))]);
      }
    } catch (e) {
      // ignore API warmup errors
    }

    try {
      // also warm current user (cheap) so comment page auth checks are ready
      const u = authApi.getCurrentUser?.();
      if (u && typeof (u as any).then === "function") {
        // don't block too long
        await Promise.race([u, new Promise((res) => setTimeout(res, 250))]);
      }
    } catch {
      // ignore
    }
  };

  // show reply count changes pushed by events
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

  const commentHref = `/support-group/${id}/comment`;

  // console.log(attachments)

  const backend = process.env.BACKEND_URL?.replace(/\/$/, ''); // set in .env.local

  function buildAttachmentSrc(path?: string) {
    if (!path) return undefined;
    // if already an absolute URL, return as-is
    if (/^https?:\/\//i.test(path)) return path;
    // if begins with slash, join with backend
    if (path.startsWith('/')) return backend ? `${backend}${path}` : path;
    // otherwise ensure a leading slash
    return backend ? `${backend}/${path}` : `/${path}`;
  }

  const attSrc = buildAttachmentSrc(attachments?.[0]);

  return (
    // make the whole card focusable so keyboard users can trigger prefetch via focus
    <Card
      className={`w-full border border-gray-200 shadow-sm ${className}`}
      onPointerEnter={prefetchComments}
      onFocus={prefetchComments}
      tabIndex={0}
    >
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
  
            {attSrc ? (
              <div className="mt-3">
                <Image src={`https://mcc-dev.vectorxdb.ai${attachments?.[0]}`} alt="post-image" height={200} width={400} objectFit="cover" />
              </div>
            ) : null}


            {/* Tag + small stats row */}
            <div className="mt-3 flex items-center gap-3">
              {tag?.map((t) => (
                <span key={t} className="inline-block bg-[#7750A3] text-white text-[11px] px-3 py-1 rounded-full">
                  {t}
                </span>
              ))}
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
            <div className="h-5 w-5">
              {isLikedDisplay ? (
                <FavoriteFilledIcon className="h-full w-full" />
              ) : (
                <FavoriteOutlineIcon className="h-full w-full" />
              )}
            </div>


            {/* <span className={`text-sm ${isLikedDisplay ? "text-[#00A79C]" : ""}`}>Like</span> */}
            <span className="ml-2 text-[#6B7280]">{likeCountDisplay}</span>
          </button>

          <button className="flex items-center gap-2 text-gray-600 px-2 py-1" onClick={handleReply} aria-label="Open comments">
            <Image src="/chat_bubble.svg" alt="Reply" width={20} height={20} />
            <span className="ml-2 text-[#6B7280]">{replyCountDisplay}</span>
          </button>

          <button
            className="flex items-center gap-2 text-gray-600 px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              // if parent wants to handle share, delegate
              if (typeof onShare === "function") {
                onShare({ id, title, excerpt, tag });
                return;
              }

              // fallback (very small fallback): try native share, else copy current location
              (async () => {
                try {
                  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
                  if (navigator.share) {
                    await navigator.share({
                      title: title || "Post",
                      text: excerpt || title || "",
                      url: shareUrl,
                    });
                  } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(shareUrl);
                    // optionally show a toast (not implemented here)
                  } else {
                    // last-resort fallback
                    const tmp = document.createElement("input");
                    tmp.value = shareUrl;
                    document.body.appendChild(tmp);
                    tmp.select();
                    document.execCommand("copy");
                    document.body.removeChild(tmp);
                  }
                } catch (err) {
                  console.warn("share fallback failed", err);
                }
              })();
            }}
            aria-label="Share post"
            type="button"
          >
            <Image src="/share.svg" alt="Share" width={20} height={20} />
            <span>Share</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// place these above your PostCard component in the same file

function FavoriteOutlineIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <path
        d="M9.99967 16.939L9.07988 16.1121C7.69849 14.8589 6.55613 13.782 5.6528 12.8815C4.74947 11.9808 4.03363 11.1792 3.5053 10.4767C2.97697 9.77431 2.60787 9.13354 2.39801 8.55437C2.18801 7.97535 2.08301 7.38778 2.08301 6.79167C2.08301 5.60903 2.48176 4.61889 3.27926 3.82125C4.0769 3.02375 5.06704 2.625 6.24967 2.625C6.97717 2.625 7.66467 2.79514 8.31217 3.13542C8.95967 3.47569 9.52217 3.96368 9.99967 4.59938C10.4772 3.96368 11.0397 3.47569 11.6872 3.13542C12.3347 2.79514 13.0222 2.625 13.7497 2.625C14.9323 2.625 15.9225 3.02375 16.7201 3.82125C17.5176 4.61889 17.9163 5.60903 17.9163 6.79167C17.9163 7.38778 17.8113 7.97535 17.6013 8.55437C17.3915 9.13354 17.0224 9.77431 16.494 10.4767C15.9657 11.1792 15.2512 11.9808 14.3505 12.8815C13.45 13.782 12.3063 14.8589 10.9195 16.1121L9.99967 16.939ZM9.99967 15.25C11.333 14.0503 12.4302 13.0219 13.2913 12.165C14.1525 11.3082 14.833 10.5638 15.333 9.93188C15.833 9.29993 16.1802 8.73875 16.3747 8.24833C16.5691 7.75806 16.6663 7.2725 16.6663 6.79167C16.6663 5.95833 16.3886 5.26389 15.833 4.70833C15.2775 4.15278 14.583 3.875 13.7497 3.875C13.0916 3.875 12.4834 4.06167 11.9251 4.435C11.3669 4.80847 10.9249 5.32799 10.599 5.99354H9.4003C9.06905 5.32257 8.62565 4.80174 8.07009 4.43104C7.51454 4.06035 6.90773 3.875 6.24967 3.875C5.42162 3.875 4.72849 4.15278 4.1703 4.70833C3.61211 5.26389 3.33301 5.95833 3.33301 6.79167C3.33301 7.2725 3.43023 7.75806 3.62467 8.24833C3.81912 8.73875 4.16634 9.29993 4.66634 9.93188C5.16634 10.5638 5.8469 11.3069 6.70801 12.161C7.56912 13.0152 8.66634 14.0449 9.99967 15.25Z"
        fill="#1C1B1F"
      />
    </svg>
  );
}

function FavoriteFilledIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 15"
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden="true"
    >
      <path
        d="M8.00016 14.939L7.08037 14.1121C5.69898 12.8589 4.55662 11.782 3.65329 10.8815C2.74995 9.98076 2.03412 9.17917 1.50579 8.47667C0.977455 7.77431 0.608357 7.13354 0.398496 6.55437C0.188496 5.97535 0.0834961 5.38778 0.0834961 4.79167C0.0834961 3.60903 0.482246 2.61889 1.27975 1.82125C2.07738 1.02375 3.06752 0.625 4.25016 0.625C4.97766 0.625 5.66516 0.795139 6.31266 1.13542C6.96016 1.47569 7.52266 1.96368 8.00016 2.59938C8.47766 1.96368 9.04016 1.47569 9.68766 1.13542C10.3352 0.795139 11.0227 0.625 11.7502 0.625C12.9328 0.625 13.9229 1.02375 14.7206 1.82125C15.5181 2.61889 15.9168 3.60903 15.9168 4.79167C15.9168 5.38778 15.8118 5.97535 15.6018 6.55437C15.392 7.13354 15.0229 7.77431 14.4945 8.47667C13.9662 9.17917 13.2517 9.98076 12.351 10.8815C11.4504 11.782 10.3068 12.8589 8.91996 14.1121L8.00016 14.939Z"
        fill="#00B7AC"
      />
    </svg>
  );
}

