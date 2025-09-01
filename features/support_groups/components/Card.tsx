// features/support_groups/components/SupportGroupCard.tsx
"use client";

import Image from "next/image";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MemberBadge from "./MemberBadge";
import Link from "next/link";

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
  createdText?: string

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
};

function timeAgo(dateString: string | undefined): string | undefined {
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
}: SupportGroupCardProps) {
  const router = useRouter();
  const [formattedUpdatedText, setFormattedUpdatedText] = useState<string | undefined>(
    timeAgo(updatedText)
  );

  useEffect(() => {
    if (!updatedText) return;
    setFormattedUpdatedText(timeAgo(updatedText));
    const idt = setInterval(() => setFormattedUpdatedText(timeAgo(updatedText)), 60_000);
    return () => clearInterval(idt);
  }, [updatedText]);

  const fmt = (n?: number) => (typeof n === "number" ? new Intl.NumberFormat("en-IN").format(n) : undefined);
  const shownAvatars = avatars.slice(0, 3);

  // Behavior: compact card clickable -> navigates to group page
  const navigateToGroup = () => {
    if (variant === "compact") router.push(`/group/${id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (variant === "compact" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      navigateToGroup();
    }
  };

  // click handlers for primary action (join/leave) and follow
  const handlePrimaryClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMember) onLeave?.();
    else onJoin?.();
  };
  const handleFollowClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFollow?.();
  };

  // styles by variant
  const isDetail = variant === "detail";

  
  const CardContent =( <article
      role={variant === "compact" ? "button" : undefined}
      tabIndex={variant === "compact" ? 0 : undefined}
      onClick={navigateToGroup}
      onKeyDown={onKeyDown}
      className={clsx(
        !isDetail
          ? "w-[342px] h-[275px] rounded-[12px] border border-[#E5E7EB] bg-white p-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#16AF9F]"
          : "w-full max-w-[390px] rounded-[12px] overflow-hidden bg-white",
        className
      )}
    >
      {/* top area */}
      {isDetail ? (
        // detail top with gradient
        <div style={{ background: "linear-gradient(180deg, rgba(0,183,172,0.12) 0%, rgba(0,183,172,0) 100%)" }} className="px-6 pt-6 pb-6">
          <div className="flex flex-col items-center text-center">
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

              <div className="flex items-center text-[#54555A]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                <span className="ml-2 text-sm">{formattedUpdatedText}</span>
              </div>

              <div className="flex -space-x-2 ml-2">
                {shownAvatars.map((a, i) => (
                  <div key={i} className="h-[32px] w-[32px] rounded-full ring-2 ring-white overflow-hidden">
                    <Image src={a.src} alt={a.alt ?? `Member ${i + 1}`} width={32} height={32} className="object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {/* stats */}
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

            {/* actions: member/join + follow */}
            <div className="mt-5 flex items-center gap-3 w-full">
              {isMember ? (
                <div className="flex-1">
                  <MemberBadge onClick={() => { /* optional management */ }} />
                </div>
              ) : (
                <button
                  type="button"
                  disabled={ctaDisabled}
                  onClick={handlePrimaryClick}
                  onMouseDown={(e) => e.stopPropagation()}
                  className={clsx(
                    "flex-1 h-11 rounded-[8px] text-white text-[14px] font-medium",
                    ctaDisabled ? "bg-[#9AA6B2] cursor-not-allowed" : "bg-[#18448A]"
                  )}
                >
                  {ctaText}
                </button>
              )}

              <button
                type="button"
                onClick={handleFollowClick}
                onMouseDown={(e) => e.stopPropagation()}
                className={clsx(
                  "h-11 px-4 rounded-[8px] border text-[14px] font-medium",
                  isFollowing ? "bg-white text-[#18448A] border-[#E5E7EB]" : "bg-white text-[#18448A] border-[#E5E7EB]"
                )}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // compact layout (home)
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

                {shownAvatars.length > 0 && (
                  <div className="ml-auto flex -space-x-2">
                    {shownAvatars.map((a, i) => (
                      <div key={i} className="h-[23.22px] w-[23.22px] rounded-full ring-2 ring-white overflow-hidden">
                        <Image src={a.src} alt={a.alt ?? `Member ${i + 1}`} width={24} height={24} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {formattedUpdatedText && (
                <div className="mt-1 flex items-center text-[#54555A]">
                  <svg width="18" height="18" viewBox="0 0 24 24" className="text-[#54555A]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  <span className="ml-2 text-[12px] leading-[15px] font-medium">{formattedUpdatedText}</span>
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
              <MemberBadge onClick={() => { /* optional management UI */ }} />
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
  )

  if(!isDetail){
    return (
       <Link href={`/group/${id}`} className="block focus:outline-none focus:ring-2 focus:ring-[#16AF9F] rounded-[12px]">
        {CardContent}
      </Link>
    )
  }
  return CardContent
}
