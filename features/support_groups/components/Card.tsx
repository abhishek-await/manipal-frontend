// features/support_groups/SupportGroupCard.tsx
"use client";

import Image from "next/image";
import clsx from "clsx";
import { useEffect, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
// import MemberBadge from "./MemberBadge";

type Avatar = { src: string; alt?: string };

export type SupportGroupCardProps = {
  id: string;
  title: string;
  imageSrc: string;
  imageAlt?: string;
  description: string;

  rating?: number;
  reviews?: number;
  updatedText?: string;
  createdText?: string;

  members?: number;
  experts?: number;

  avatars?: Avatar[];

  // actions
  ctaText?: string;
  onJoin?: () => void;
  onLeave?: () => void;
  onFollow?: () => void;
  ctaDisabled?: boolean;

  category?: { id: string; name: string; description?: string };

  isMember?: boolean;
  isFollowing?: boolean;

  totalPosts?: number;
  growthPercentage?: number;

  // layout
  className?: string;

  // new: variant controls visual layout
  variant?: "compact" | "detail";

  // back/share controls (optional)
  backIconSrc?: string;
  shareIconSrc?: string;
  onBack?: () => void;
  onShare?: () => void;

  // NEW: optional href — if present parent likely wraps with <Link href={href}>
  href?: string;

  joinAnimation?: boolean;
};

export function timeAgo(dateString: string | undefined): string | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;

  return date.toLocaleDateString();
}

export default function SupportGroupCard({
  id,
  title,
  imageSrc,
  imageAlt = "Group image",
  description,
  rating = 0,
  reviews = 0,
  updatedText,
  members,
  experts,
  avatars = [],
  ctaText = "Join Group",
  onJoin,
  onLeave,
  onFollow,
  ctaDisabled = false,
  className,
  isMember = false,
  isFollowing = false,
  variant = "compact",
  backIconSrc = "/back.svg",
  shareIconSrc = "/share-1.svg",
  onBack,
  onShare,
  href,
  joinAnimation,
}: SupportGroupCardProps) {
  const router = useRouter();
  const [formattedUpdatedText, setFormattedUpdatedText] = useState<string | undefined>(
    timeAgo(updatedText)
  );

  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!updatedText) return;
    setFormattedUpdatedText(timeAgo(updatedText));
    const idt = setInterval(() => setFormattedUpdatedText(timeAgo(updatedText)), 60_000);
    return () => clearInterval(idt);
  }, [updatedText]);

  const fmt = (n?: number) => (typeof n === "number" ? new Intl.NumberFormat("en-IN").format(n) : undefined);
  const shownAvatars = avatars.slice(0, 3);

  // Behavior: compact card clickable -> navigates to group page
  // BUT if href is provided parent is expected to wrap in Link and handle navigation.
  const navigateToGroup = () => {
    if (variant !== "compact") return;
    if (href) return; // Link from parent will handle navigation
    
    // Set navigating state
    setIsNavigating(true);
    
    // Optional: Add haptic feedback for mobile devices
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(10); // Very short vibration
    }
    
    // Use startTransition to keep UI responsive
    startTransition(() => {
      router.push(`/group/${id}`);
    });
  };

   const handleCardClick = (e: React.MouseEvent) => {
    if (variant !== "compact") return;
    
    // If wrapped in Link, just add visual feedback
    if (href) {
      setIsNavigating(true);
      
      // Optional haptic feedback
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else {
      // If not wrapped in Link, handle navigation
      navigateToGroup();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (variant === "compact" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      navigateToGroup();
    }
  };

  // IMPORTANT FIX: when this card is wrapped by a Link (anchor), clicks inside the anchor
  // will still navigate unless we call e.preventDefault() on the inner button.
  // So the primary and follow handlers MUST call both preventDefault and stopPropagation.
  const handlePrimaryClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();   // Prevent anchor navigation when card is wrapped in <Link>
    e.stopPropagation();  // Stop event reaching card-level handlers
    if (isMember) onLeave?.();
    else onJoin?.();
  };
  const handleFollowClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onFollow?.();
  };

  const handleBack = () => {
    if (onBack) return onBack();
    router.push("/home");
  };

  const handleShare = async () => {
    if (onShare) return onShare();
    try {
      const url = (typeof window !== "undefined" && window.location.href) || `/group/${id}`;
      if ((navigator as any)?.share) {
        await (navigator as any).share({ title, url });
      } else if ((navigator as any)?.clipboard) {
        await (navigator as any).clipboard.writeText(url);
        alert("Link copied to clipboard");
      } else {
        window.prompt("Copy this link", url);
      }
    } catch (err) {
      console.warn("share failed", err);
    }
  };

  const isDetail = variant === "detail";

  return (
    <article
      role={!href && variant === "compact" ? "button" : undefined}
      tabIndex={!href && variant === "compact" ? 0 : undefined}
      onClick={handleCardClick}
      onKeyDown={onKeyDown}
      className={clsx(
        variant === "compact"
          ? `w-full rounded-[12px] border border-[#E5E7EB] bg-white p-4 cursor-pointer 
             focus:outline-none focus:ring-2 focus:ring-[#16AF9F] 
             transition-all duration-150 ease-out
             ${isNavigating ? 'scale-[0.98] opacity-70' : 'hover:scale-[1.01] active:scale-[0.99]'}`
          : "w-full rounded-[12px] overflow-hidden bg-white shadow-sm",
        className
      )}
      style={{
        // Add subtle shadow when pressed
        boxShadow: isNavigating && variant === "compact" 
          ? '0 2px 8px rgba(0, 0, 0, 0.15)' 
          : undefined,
      }}
    >
      {/* Add loading overlay for compact variant */}
      {isNavigating && variant === "compact" && (
        <div className="absolute inset-0 bg-white/50 rounded-[12px] z-20 flex items-center justify-center">
          <div className="flex items-center gap-2">
            {/* Simple loading spinner */}
            {/* <div className="w-5 h-5 border-2 border-[#16AF9F] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#16AF9F] font-medium">Loading...</span> */}
          </div>
        </div>
      )}
      {isDetail ? (
        <div className="relative bg-gradient-to-b from-[#E8FBF8] to-transparent px-6 pt-6 pb-6">
          <div className="absolute inset-x-0 top-3 px-4 flex items-center justify-between z-20">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleBack();
              }}
              aria-label="Back"
              className="h-9 w-9 flex items-center justify-center"
            >
              <Image src={backIconSrc} alt="Back" width={18} height={18} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              aria-label="Share"
              className="h-9 w-9 flex items-center justify-center"
            >
              <Image src={shareIconSrc} alt="Share" width={24} height={24} />
            </button>
          </div>

          <div className="flex flex-col items-center text-center relative z-10">
            <div className="mb-4">
              <div className="rounded-xl overflow-hidden w-[96px] h-[96px] mx-auto">
                <Image src={imageSrc} alt={imageAlt} width={96} height={96} className="object-cover" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-[#18448A] leading-tight mb-2">{title}</h1>

            <p className="text-sm text-[#54555A] max-w-[320px]">{description}</p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-[#333333]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-[#F4AA08]">
                  <path d="M12 .587l3.668 7.57L24 9.748l-6 5.857 1.416 8.262L12 19.771l-7.416 4.096L6 15.605 0 9.748l8.332-1.591L12 .587z" />
                </svg>
                <span className="text-sm font-bold">{rating.toFixed(1)}</span>
                <span className="text-sm text-[#54555A]">({fmt(reviews) ?? 0})</span>
              </div>

              {/* <div className="flex items-center text-[#54555A]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                <span className="ml-2 text-sm">{formattedUpdatedText}</span>
              </div> */}

              <div className="flex -space-x-2 ml-2">
                {shownAvatars.map((a, i) => (
                  <div key={i} className="h-[32px] w-[32px] rounded-full ring-2 ring-white overflow-hidden">
                    <Image src={a.src} alt={a.alt ?? `Member ${i + 1}`} width={32} height={32} className="object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-6 text-[#54555A]">
              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#54555A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span className="text-sm font-bold">{fmt(members) ?? 0}</span>
              </div>

              <div className="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#54555A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                </svg>
                <span className="text-sm font-bold">{fmt(experts) ?? 0} experts</span>
              </div>
            </div>

            {/* // inside the isDetail block, replace the existing "mt-5 flex items-center" block with: */}
            <div className="mt-5 flex items-center gap-3 w-full max-w-[360px]">
              {/* Left: Member pill or Join button */}
              {isMember ? (
                <>
                  {/* MEMBER PILL (fixed width 148 × 44 to match design) */}
                  <div className="w-[148px] h-11 flex items-center gap-3 px-3 rounded-[8px] bg-[#ECFDF6]" style={{ border: "1px solid rgba(72,193,181,0.18)" }}>
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                      {/** show animated GIF briefly if joinAnimation === true, otherwise show SVG check */}
                      { (joinAnimation) ? (
                        <Image src="/checkmark.gif" alt="joined" width={28} height={28} />
                      ) : (
                        <Image src="/checkmark.svg" alt="joined" width={28} height={28} />
                      )}
                    </div>

                    <div className="text-sm font-medium text-[#16AF9F]">Member</div>
                  </div>

                  {/* Right: Follow button (fills remaining space) */}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onFollow?.(); }}
                      className={clsx(
                        "h-11 w-full rounded-[8px] border text-[14px] font-medium",
                        isFollowing ? "bg-white text-[#18448A] border-[#E5E7EB]" : "bg-white text-[#18448A] border-[#E5E7EB]"
                      )}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Join button (fill left side) */}
                  <button
                    type="button"
                    disabled={ctaDisabled}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onJoin?.(); }}
                    className={clsx(
                      "w-[148px] h-11 rounded-[8px] text-white text-[14px] font-medium",
                      ctaDisabled ? "bg-[#9AA6B2] cursor-not-allowed" : "bg-[#18448A]"
                    )}
                  >
                    {ctaText}
                  </button>

                  {/* Follow button */}
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFollow?.(); }}
                      className={clsx(
                        "h-11 w-full rounded-[8px] border text-[14px] font-medium",
                        isFollowing ? "bg-white text-[#18448A] border-[#E5E7EB]" : "bg-white text-[#18448A] border-[#E5E7EB]"
                      )}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </button>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      ) : (
        <div>
          <div className="flex gap-4">
            <div className="shrink-0">
              <Image src={imageSrc} alt={imageAlt} width={64} height={64} className="rounded-[8px] object-cover" />
            </div>

            <div className="min-w-0">
              <h3 className="text-[16px] leading-[22px] font-bold text-[#18448A] line-clamp-2">{title}</h3>

              <div className="mt-2 flex items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" className="text-[#F4AA08] shrink-0" fill="currentColor" aria-hidden="true">
                  <path d="M12 .587l3.668 7.57L24 9.748l-6 5.857 1.416 8.262L12 19.771l-7.416 4.096L6 15.605 0 9.748l8.332-1.591L12 .587z" />
                </svg>
                <span className="ml-2 text-[14px] leading-[22px] font-bold text-[#333333]">{rating.toFixed(1)}</span>
                <span className="ml-2 text-[12px] leading-[18px] tracking-[-0.02em] text-[#54555A]">({fmt(reviews)})</span>
              </div>

              {formattedUpdatedText && (
                <div className="mt-1 flex items-center text-[#54555A]  space-x-8">
                  <div className="flex items-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" className="text-[#54555A]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 6v6l4 2"></path>
                    </svg>
                    <span className="ml-2 text-[12px] leading-[15px] font-medium">Updated {formattedUpdatedText}</span>
                  </div>
                  {shownAvatars.length > 0 && (
                    <div className="flex -space-x-2 ml-auto">
                      {shownAvatars.map((a, i) => (
                        <div key={i} className="h-[23.22px] w-[23.22px] rounded-full ring-2 ring-white overflow-hidden">
                          <Image src={a.src} alt={a.alt ?? `Member ${i + 1}`} width={24} height={24} className="h-full w-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <p className="mt-4 text-[14px] leading-[22px] text-[#54555A] line-clamp-3">{description}</p>

          <div className="mt-3 flex items-center gap-6 text-[#54555A]">
            {typeof members === "number" && (
              <div className="flex items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#54555A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span className="ml-2 text-[12px] leading-5 font-bold">{fmt(members)}</span>
              </div>
            )}

            {typeof experts === "number" && (
              <div className="flex items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#54555A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span className="ml-2 text-[12px] leading-5 font-bold">{fmt(experts)} experts</span>
              </div>
            )}
          </div>

          <div className="mt-4">
            {isMember ? (
              // <MemberBadge onClick={() => { /* optional management UI */ }} />
              <div></div>
            ) : (
              <button
                type="button"
                disabled={ctaDisabled}
                onClick={handlePrimaryClick}
                onMouseDown={(e) => e.stopPropagation()}
                className={clsx(
                  "mt-4 h-11 w-full rounded-[8px] text-white text-[14px] font-medium",
                  ctaDisabled ? "bg-[#9AA6B2] cursor-not-allowed" : "bg-[#18448A]"
                )}
                aria-label={ctaText}
              >
                {ctaText}
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
