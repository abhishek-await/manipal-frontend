"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { timeAgo } from "./Card";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";
import Avatar from "@/components/Avatar";

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
  viewCount?: number;

  // optional callback (when provided parent controls the like action)
  onToggleLike?: () => Promise<void> | void;

  // optional callback to notify parent when user navigates to comment page
  // parent can use this to update reply counts / analytics etc.
  onReplyNavigate?: () => boolean | Promise<boolean> | void;
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
  viewCount,
  onToggleLike,
  onReplyNavigate,
  onShare,
  attachments,
  showFullContent=false,
}: PostCardProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false); // for like
  const [navPending, setNavPending] = useState(false); // for navigation feedback (click -> push)

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Only use local state if NOT controlled
  const isControlledLike = typeof onToggleLike === "function";
  const [likedLocal, setLikedLocal] = useState<boolean>(!isControlledLike && !!isLikedProp);
  const [likeCountLocal, setLikeCountLocal] = useState<number>(!isControlledLike ? (likeCountProp ?? 0) : 0);

  // Reply count local state
  const [replyCountLocal, setReplyCountLocal] = useState<number>(replyCountProp ?? 0);

  // For display, use props if controlled, local state if not
  const isLikedDisplay = isControlledLike ? !!isLikedProp : likedLocal;
  const likeCountDisplay = isControlledLike ? (likeCountProp ?? 0) : likeCountLocal;

  // helper: call parent handler and interpret its return value.
  // returns true if parent handled navigation (so PostCard shouldn't navigate)
  const callOnReplyNavigate = async (): Promise<boolean> => {
    if (typeof onReplyNavigate !== "function") return false;

    try {
      const res = onReplyNavigate();

      // If parent returned a Promise, await it
      if (res && typeof (res as any).then === "function") {
        // show loader while awaiting parent navigation
        setNavPending(true);
        try {
          const awaited = await (res as Promise<any>);
          // if awaited is truthy (e.g., true), treat as handled
          return Boolean(awaited);
        } finally {
          // if parent triggered navigation via router.push, component may unmount.
          // clear navPending guard after a short safety delay in case parent did not navigate.
          setTimeout(() => setNavPending(false), 1500);
        }
      }

      // If parent returned a truthy value synchronously, treat it as handled.
      if (res) {
        setNavPending(true);
        // clear after a safety delay if it doesn't unmount
        setTimeout(() => setNavPending(false), 1500);
        return true;
      }

      // undefined / false -> not handled
      return false;
    } catch (err) {
      console.warn("onReplyNavigate threw", err);
      setNavPending(false);
      return false;
    }
  };

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

    // Immediate optimistic update
    const wasLiked = likedLocal;
    const previousCount = likeCountLocal;

    setLikedLocal(!wasLiked);
    setLikeCountLocal(wasLiked ? Math.max(previousCount - 1, 0) : previousCount + 1);
    setPending(true);

    try {
      await groupApi.likePost(String(id));
    } catch (err) {
      // Rollback on error
      console.error("like failed", err);
      setLikedLocal(wasLiked);
      setLikeCountLocal(previousCount);
    } finally {
      setPending(false);
    }
  };

  // when parent wants to control the like action, call onToggleLike and let parent update props
  const handleLike = async () => {
    if (pending) return;

    if (isControlledLike) {
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

    return handleLikeInternal();
  };

  // inside your PostCard component (replace the old handleReply)
  const handleReply = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Ask parent to handle navigation; if it returns true, stop here.
    const handledByParent = await callOnReplyNavigate();
    if (handledByParent) return;

    // Fallback: internal navigation behavior
    try {
      onReplyNavigate?.(); // keep notification if parent wants to be informed
    } catch (err) { console.warn("onReplyNavigate failed", err); }

    const href = `/support-group/${id}/comment`;
    setNavPending(true);

    await new Promise((resolve) => {
      if (typeof window !== "undefined" && "requestAnimationFrame" in window) {
        window.requestAnimationFrame(() => resolve(null));
      } else {
        setTimeout(() => resolve(null), 0);
      }
    });

    try {
      router.push(href);
    } finally {
      setTimeout(() => setNavPending(false), 1500);
    }
  };

  const onCardActivate = async () => {
    if (navPending || showFullContent) return;

    const handledByParent = await callOnReplyNavigate();
    if (handledByParent) return;

    // fallback internal navigation
    try {
      onReplyNavigate?.();
    } catch (err) { console.warn("onReplyNavigate failed", err); }

    const href = commentHref;
    setNavPending(true);

    try {
      router.push(href);
    } finally {
      setTimeout(() => setNavPending(false), 1500);
    }
  };

  // --- PREFETCH on hover/focus (new) ---
  // omitted for brevity (kept from your original file)

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

  // Share implementation reused by menu item
  const sharePost = async () => {
    if (typeof onShare === "function") {
      onShare({ id, title, excerpt, tag });
      return;
    }

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
  };

  // Menu: close on outside click or ESC
  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!menuOpen) return;
      if (!menuRef.current) return;
      if (ev.target instanceof Node && menuRef.current.contains(ev.target)) return;
      setMenuOpen(false);
    };
    const onEsc = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && menuOpen) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const handleCardClick = (e: React.MouseEvent) => {
    // If user clicked a control (button/input) we should not navigate;
    const tgt = e.target as HTMLElement | null;
    if (!tgt) {
      onCardActivate();
      return;
    }

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
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      style={{ transformOrigin: "center" }}
    >
      <CardContent className={`p-2 ${navPending ? "scale-95" : ""}`}>

        {/* Header */}
        <div className="flex items-start gap-3">
          <Avatar src={avatar.length ? avatar : null} name={name} size={44} className="flex-shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-[#18448A] truncate">{name}</div>
                <div className="text-sm text-gray-500">{timeAgo(time)}</div>
              </div>

              <div ref={menuRef} className="relative ml-2">
                <button
                  type="button"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((s) => !s);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  // show a gray circle when open, otherwise show subtle hover
                  className={`p-2 rounded-full focus:outline-none active:scale-95 ${
                    menuOpen ? "bg-[#D9D9D9]" : "hover:bg-gray-100"
                  }`}
                  title="More"
                >
                  {/* vertical dots svg */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <circle cx="12" cy="5" r="1.5" fill="#6B7280" />
                    <circle cx="12" cy="12" r="1.5" fill="#6B7280" />
                    <circle cx="12" cy="19" r="1.5" fill="#6B7280" />
                  </svg>
                </button>

                {menuOpen ? (
                  <div
                    role="menu"
                    aria-label="Post menu"
                    className="absolute right-0 mt-2 w-44 rounded-xl bg-white shadow-lg border border-gray-100 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      role="menuitem"
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        await sharePost();
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition"
                    >
                      Share
                    </button>

                    <button
                      role="menuitem"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        // TODO: implement report flow later
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 transition"
                    >
                      Report
                    </button>
                  </div>
                ) : null}
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
        <div className="mt-3 mx-3 flex items-center justify-between text-gray-700">
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
            className="flex items-center text-gray-600 disabled:opacity-60 transition-all duration-200 active:scale-95"
          >
            <div className={`h-5 w-5 transition-all duration-200 ${isLikedDisplay ? 'like-animation' : ''}`}>
              {isLikedDisplay ? <Image src="/favorite-fill.svg" width={20} height={20} alt="favorite-fill-icon"/> : <Image src="/favorite.svg" width={20} height={20} alt="favorite-icon"/>}
            </div>
            <span className="ml-2 text-[#6B7280] transition-all duration-200">{likeCountDisplay ? likeCountDisplay : null}</span>
          </button>

          {/* Reply (keeps its stopPropagation inside handler) */}
          <button className="flex items-center text-gray-600" onClick={handleReply} disabled={navPending || showFullContent} aria-label="Open comments">
            <Image src="/chat_bubble.svg" alt="Reply" width={16} height={16} />
            <span className="ml-2 text-[#6B7280]">{replyCountDisplay ? replyCountDisplay : null}</span>
          </button>

          <div className="flex items-center text-gray-600 ">
            <Image src="/visibility.svg" alt="view-count" width={20} height={20}/>
            <span className="ml-2 text-[#6B7280]">{viewCount ? viewCount : null}</span>
          </div>

          {/* NOTE: The visible Share button removed — share is only available via menu now */}
        </div>

        {/* nav feedback overlay (spinner) */}
        {navPending ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none ">
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
