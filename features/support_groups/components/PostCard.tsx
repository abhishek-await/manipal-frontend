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

  // Report flow state (NEW)
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

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

  // --- Report flow functions (NEW) ---
  const openReport = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setMenuOpen(false);
    setReportOpen(true);
    setSelectedReason(null);
  };

  const closeReport = () => {
    setReportOpen(false);
    setSelectedReason(null);
    setReportSubmitting(false);
  };

  const closeSuccess = () => {
    setReportSuccess(false);
    // close everything
    setReportOpen(false);
    setSelectedReason(null);
  };

  const submitReport = async () => {
    if (!selectedReason) return;
    setReportSubmitting(true);
    try {
      // Using the API method you provided
      // it expects (postId, reason) as arguments in your snippet
      await groupApi.reportPost(String(id), selectedReason);
      setReportSuccess(true);
    } catch (err) {
      console.error("report failed", err);
      const msg = (err as any)?.message ?? "Failed to submit report.";
      // simple fallback for error UI — you can replace with toasts
      alert(msg);
    } finally {
      setReportSubmitting(false);
    }
  };

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
                        // open the report bottom sheet
                        openReport(e);
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

      {/* ---------------------------
          Report Bottom Sheet (choices)
          --------------------------- */}
      {reportOpen && !reportSuccess && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center"
          aria-modal="true"
          role="dialog"
          onClick={() => closeReport()}
        >
          {/* overlay */}
          <div className="absolute inset-0 bg-black/30" />

          <div
            className="relative w-full max-w-md rounded-t-xl bg-white p-4 border border-gray-100 z-50"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "0 -8px 40px rgba(2,6,23,0.08)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-medium">Report</div>
              <button
                type="button"
                className="p-1 rounded-full hover:bg-gray-100"
                onClick={(e) => {
                  e.stopPropagation();
                  closeReport();
                }}
                aria-label="Close report"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6L18 18M6 18L18 6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {[
                "The content is inappropriate",
                "The content is misleading or false",
                "The content is spam",
                "Other",
              ].map((label) => {
                const selected = selectedReason === label;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`w-full text-left px-4 py-3 rounded-lg border ${selected ? "border-blue-600 bg-white shadow-sm" : "border-gray-200 bg-white"} transition`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReason(label);
                    }}
                  >
                    <div className={`flex items-center justify-between`}>
                      <div className={`${selected ? "font-semibold text-gray-900" : "text-gray-700"}`}>{label}</div>
                      {selected ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M20 6L9 17l-5-5" stroke="#0B5FFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  submitReport();
                }}
                disabled={!selectedReason || reportSubmitting}
                className={`w-full rounded-lg px-4 py-3 text-white ${selectedReason ? "bg-blue-700 hover:bg-blue-800" : "bg-gray-200 cursor-not-allowed"}`}
              >
                {reportSubmitting ? (
                  <div className="flex items-center justify-center">
                    <Spinner />
                  </div>
                ) : (
                  "Submit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------
          Success Modal for Report
          --------------------------- */}
      {reportSuccess && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/30" onClick={() => closeSuccess()} />

          <div
            className="relative z-50 w-full max-w-md min-h-60 pt-10 rounded-t-2xl bg-white p-6 text-center"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "0 -8px 40px rgba(2,6,23,0.08)" }}
          >
            <button
              type="button"
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100"
              onClick={() => closeSuccess()}
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6L18 18M6 18L18 6" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-[#4ECDC4] flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className="text-base font-semibold text-gray-900">Thank you for your feedback.</div>
              <div className="text-sm text-gray-600 mt-1">The content has been reported and will be reviewed.</div>
            </div>
          </div>
        </div>
      )}
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
