"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { timeAgo } from "./Card";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";
import { fa } from "zod/locales";

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
  showFullContent?: boolean,
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
  showFullContent=false,
}: PostCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false); // for like
  const [navPending, setNavPending] = useState(false); // for navigation feedback (click -> push)

  // Only use local state if NOT controlled
  const isControlledLike = typeof onToggleLike === "function";
  const [likedLocal, setLikedLocal] = useState<boolean>(!isControlledLike && !!isLikedProp);
  const [likeCountLocal, setLikeCountLocal] = useState<number>(!isControlledLike ? (likeCountProp ?? 0) : 0);

  // Reply count local state
  const [replyCountLocal, setReplyCountLocal] = useState<number>(replyCountProp ?? 0);

  // For display, use props if controlled, local state if not
  const isLikedDisplay = isControlledLike ? !!isLikedProp : likedLocal;
  const likeCountDisplay = isControlledLike ? (likeCountProp ?? 0) : likeCountLocal;

  useEffect(() => {
    if (!isControlledLike) {
      setLikedLocal(!!isLikedProp);
      setLikeCountLocal(likeCountProp ?? 0);
    }
  }, [isLikedProp, likeCountProp, isControlledLike]);
  useEffect(() => {
    setLikeCountLocal(likeCountProp ?? 0);
  }, [likeCountProp]);

  useEffect(() => {
    setReplyCountLocal(replyCountProp ?? 0);
  }, [replyCountProp]);

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
 // inside your PostCard component (replace the old handleReply)
  const handleReply = async (e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      onReplyNavigate?.();
    } catch (err) {
      console.warn("onReplyNavigate failed", err);
    }

    const href = `/support-group/${id}/comment`;

    // try {
    //   // best-effort prefetch
    //   router.prefetch?.(href);
    // } catch {}

    // show spinner/feedback before navigating
    setNavPending(true);

    // let the browser paint the spinner (one frame) before navigation
    await new Promise((resolve) => {
      // use requestAnimationFrame to ensure a paint occurs
      if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
        window.requestAnimationFrame(() => resolve(null));
      } else {
        // fallback microtask
        setTimeout(() => resolve(null), 0);
      }
    });

    try {
      router.push(href);
    } finally {
      // safety fallback: if navigation doesn't unmount quickly, clear after short timeout
      setTimeout(() => setNavPending(false), 1500);
    }
  };

  // --- PREFETCH on hover/focus (new) ---
  // const prefetchedRef = useRef(false);
  // const prefetchComments = async () => {
  //   if (prefetchedRef.current) return;
  //   prefetchedRef.current = true;

  //   const href = `/support-group/${id}/comment`;

  //   // try {
  //   //   router.prefetch?.(href);
  //   // } catch (e) {}

  //   try {
  //     const maybeFn = (groupApi as any).getComments ?? (groupApi as any).getPostComments ?? (groupApi as any).getReplies;
  //     if (typeof maybeFn === "function") {
  //       const p = maybeFn(String(id));
  //       await Promise.race([p, new Promise((res) => setTimeout(res, 350))]);
  //     }
  //   } catch (e) {}

  //   try {
  //     const u = authApi.getCurrentUser?.();
  //     if (u && typeof (u as any).then === "function") {
  //       await Promise.race([u, new Promise((res) => setTimeout(res, 250))]);
  //     }
  //   } catch {}
  // };

  // show reply count changes pushed by events
  useEffect(() => {
    setReplyCountLocal(replyCountProp ?? 0);
  }, [replyCountProp]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (ev: Event) => {
      try {
        const custom = ev as CustomEvent<{ postId: string; replyId?: string }>;
        if (!custom?.detail) return;
        const { postId: evtPostId } = custom.detail ?? {};
        if (!evtPostId) return;
        if (typeof replyCountProp === "number") return;
        if (String(evtPostId) === String(id)) {
          setReplyCountLocal((c) => (typeof c === "number" ? c + 1 : 1));
        }
      } catch (e) {}
    };

    window.addEventListener("mcc:reply-created", handler as EventListener);
    return () => {
      window.removeEventListener("mcc:reply-created", handler as EventListener);
    };
  }, [id, replyCountProp]);

  const commentHref = `/support-group/${id}/comment`;

  const backend = process.env.BACKEND_URL?.replace(/\/$/, ""); // set in .env.local

  function buildAttachmentSrc(path?: string) {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith("/")) return backend ? `${backend}${path}` : path;
    return backend ? `${backend}/${path}` : `/${path}`;
  }

  const attSrc = buildAttachmentSrc(attachments?.[0]);

  // --- New: handle clicking the card (navigate to comments) with feedback ---
  const onCardActivate = async () => {
    if (navPending || showFullContent) return;
    // quick auth check to match reply behavior
    const current = await authApi.getCurrentUser().catch(() => null);
    if (!current) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    try {
      onReplyNavigate?.();
    } catch (err) {
      console.warn("onReplyNavigate failed", err);
    }

    const href = commentHref;
    // try {
    //   router.prefetch?.(href);
    // } catch {}

    // Show navigation feedback
    setNavPending(true);
    try {
      router.push(href);
    } finally {
      // keep navPending true briefly; Next router will unmount this component on navigation,
      // but as a safe fallback clear it after a short timeout (no blocking).
      setTimeout(() => setNavPending(false), 1500);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // If user clicked a control (button/input) we should not navigate;
    // buttons already call stopPropagation, but this is an extra guard.
    const tgt = e.target as HTMLElement | null;
    if (!tgt) {
      onCardActivate();
      return;
    }

    // If an element in the control area (button, svg inside button, anchor) was clicked,
    // don't trigger card activation.
    if (tgt.closest("button") || tgt.closest("a") || tgt.getAttribute("role") === "button") {
      return;
    }

    onCardActivate();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // support Enter and Space to activate the card
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardActivate();
    }
  };

  // For reply count display: parent controls if replyCountProp is provided (not undefined).
  const replyCountDisplay = typeof replyCountProp === "number" ? replyCountProp : replyCountLocal;

  return (
    <Card
      className={`w-full border border-gray-200 shadow-sm ${className} relative transition-transform ${navPending ? "opacity-70 pointer-events-none" : "hover:shadow-md"}`}
      // onPointerEnter={prefetchComments}
      // onFocus={prefetchComments}
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      // small tap/press feedback via tailwind active class (works on mobile)
      // You can adjust scale-95 to something else if you prefer.
      style={{ transformOrigin: "center" }}
    >
      <CardContent className={`p-2 ${navPending ? "scale-95" : ""}`}>
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
              <h3 className={`font-bold text-gray-800 leading-5 ${showFullContent ? '' : 'line-clamp-2'}`}>
                {title}
              </h3>
              <p className={`text-gray-600 mt-1 ${showFullContent ? '' : 'line-clamp-2'}`}>
                {excerpt}
              </p>
            </div>

            {attSrc ? (
              <div className="mt-3">
                <Image src={`https://mcc-dev.vectorxdb.ai${attachments?.[0]}`} alt="post-image" height={200} width={400} style={{ objectFit: "cover" }} />
              </div>
            ) : null}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mt-4" />

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between text-gray-700">
          {/* Like button (stopPropagation so clicking like doesn't activate card) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            disabled={pending || navPending}
            aria-pressed={isLikedDisplay}
            aria-label={isLikedDisplay ? "Liked" : "Like"}
            className="flex items-center text-gray-600 px-2 py-1 disabled:opacity-60"
          >
            <div className="h-5 w-5">
              {isLikedDisplay ? <FavoriteFilledIcon className="h-full w-full" /> : <FavoriteOutlineIcon className="h-full w-full" />}
            </div>
            <span className="ml-2 text-[#6B7280]">{likeCountDisplay}</span>
          </button>

          {/* Reply (keeps its stopPropagation inside handler) */}
          <button className="flex items-center gap-2 text-gray-600 px-2 py-1" onClick={handleReply} aria-label="Open comments">
            <Image src="/chat_bubble.svg" alt="Reply" width={20} height={20} />
            <span className="ml-2 text-[#6B7280]">{replyCountDisplay}</span>
          </button>

          {/* Share button (already had stopPropagation) */}
          <button
            className="flex items-center gap-2 text-gray-600 px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              if (typeof onShare === "function") {
                onShare({ id, title, excerpt, tag });
                return;
              }

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
                  } else {
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

        {/* nav feedback overlay (spinner) */}
        {navPending ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="rounded-full bg-white/80 p-2 shadow">
              <Spinner />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// --- small spinner + icons ---

function Spinner() {
  return (
    <svg
      className="animate-spin h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FavoriteOutlineIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <path
        d="M9.99967 16.939L9.07988 16.1121C7.69849 14.8589 6.55613 13.782 5.6528 12.8815C4.74947 11.9808 4.03363 11.1792 3.5053 10.4767C2.97697 9.77431 2.60787 9.13354 2.39801 8.55437C2.18801 7.97535 2.08301 7.38778 2.08301 6.79167C2.08301 5.60903 2.48176 4.61889 3.27926 3.82125C4.0769 3.02375 5.06704 2.625 6.24967 2.625C6.97717 2.625 7.66467 2.79514 8.31217 3.13542C8.95967 3.47569 9.52217 3.96368 9.99967 4.59938C10.4772 3.96368 11.0397 3.47569 11.6872 3.13542C12.3347 2.79514 13.0222 2.625 13.7497 2.625C14.9323 2.625 15.9225 3.02375 16.7201 3.82125C17.5176 4.61889 17.9163 5.60903 17.9163 6.79167C17.9163 7.38778 17.8113 7.97535 17.6013 8.55437C17.3915 9.13354 17.0224 9.77431 16.494 10.4767C15.9657 11.1792 15.2512 11.9808 14.3505 12.8815C13.45 13.782 12.3063 14.8589 10.9195 16.1121L9.99967 16.939ZM9.99967 15.25C11.333 14.0503 12.4302 13.0219 13.2913 12.165C14.1525 11.3082 14.833 10.5638 15.333 9.93188C15.833 9.29993 16.1802 8.73875 16.3747 8.24833C16.5691 7.75806 16.6663 7.2725 16.6663 6.79167C16.6663 5.95833 16.3886 5.26389 15.833 4.70833C15.2775 4.15278 14.583 3.875 13.7497 3.875C13.0916 3.875 12.4834 4.06167 11.9251 4.435C11.3669 4.80847 10.9249 5.32799 10.599 5.99354H9.4003C9.06905 5.32257 8.62565 4.80174 8.07009 4.43104C7.51454 4.06035 6.90773 3.875 6.24967 3.875C5.42162 3.875 4.72849 4.15278 4.1703 4.70833C3.61211 5.26389 3.33301 5.95833 3.33301 6.79167C3.33301 7.2725 3.43023 7.75806 3.62467 8.24833C3.81912 8.73875 4.16634 9.29993 4.66634 9.93188C5.16634 10.5638 5.8469 11.3069 6.70801 12.161C7.56912 13.0152 8.66634 14.0449 9.99967 15.25Z"
        fill="#1C1B1F"
      />
    </svg>
  );
}

function FavoriteFilledIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 15" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
      <path d="M8.00016 14.939L7.08037 14.1121C5.69898 12.8589 4.55662 11.782 3.65329 10.8815C2.74995 9.98076 2.03412 9.17917 1.50579 8.47667C0.977455 7.77431 0.608357 7.13354 0.398496 6.55437C0.188496 5.97535 0.0834961 5.38778 0.0834961 4.79167C0.0834961 3.60903 0.482246 2.61889 1.27975 1.82125C2.07738 1.02375 3.06752 0.625 4.25016 0.625C4.97766 0.625 5.66516 0.795139 6.31266 1.13542C6.96016 1.47569 7.52266 1.96368 8.00016 2.59938C8.47766 1.96368 9.04016 1.47569 9.68766 1.13542C10.3352 0.795139 11.0227 0.625 11.7502 0.625C12.9328 0.625 13.9229 1.02375 14.7206 1.82125C15.5181 2.61889 15.9168 3.60903 15.9168 4.79167C15.9168 5.38778 15.8118 5.97535 15.6018 6.55437C15.392 7.13354 15.0229 7.77431 14.4945 8.47667C13.9662 9.17917 13.2517 9.98076 12.351 10.8815C11.4504 11.782 10.3068 12.8589 8.91996 14.1121L8.00016 14.939Z" fill="#00B7AC" />
    </svg>
  );
}
