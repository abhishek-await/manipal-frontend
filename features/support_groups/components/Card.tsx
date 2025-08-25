// src/components/SupportGroupCard.tsx
'use client'

import Image from 'next/image'
import clsx from 'clsx'

type Avatar = { src: string; alt?: string }

export type SupportGroupCardProps = {
  // main
  title: string
  imageSrc: string
  imageAlt?: string
  description: string

  // meta
  rating?: number        // e.g., 4.9
  reviews?: number       // e.g., 345
  updatedText?: string   // e.g., "Updated 2 hours ago"

  // counts
  members?: number       // e.g., 1850
  experts?: number       // e.g., 12

  // avatars shown to the right of rating row
  avatars?: Avatar[]     // pass up to 3–4

  // CTA
  ctaText?: string       // default: "Join Group"
  onJoin?: () => void
  ctaDisabled?: boolean

  // layout
  className?: string     // to override wrapper width/margins if needed
}

export default function SupportGroupCard({
  title,
  imageSrc,
  imageAlt = 'Group image',
  description,
  rating = 0,
  reviews = 0,
  updatedText,
  members,
  experts,
  avatars = [],
  ctaText = 'Join Group',
  onJoin,
  ctaDisabled = false,
  className,
}: SupportGroupCardProps) {
  // format numbers like 1,850
  const fmt = (n?: number) =>
    typeof n === 'number' ? new Intl.NumberFormat('en-IN').format(n) : undefined

  const shownAvatars = avatars.slice(0, 3)

  return (
    <div
      className={clsx(
        'w-[342px] h-[275px] rounded-[12px] border border-[#E5E7EB] bg-white p-4',
        className
      )}
    >
      {/* Top: Image + Title */}
      <div className="flex gap-4">
        <div className="shrink-0">
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={64}
            height={64}
            className="rounded-[8px] object-cover"
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-[16px] leading-[22px] font-bold text-[#18448A] line-clamp-2">
            {title}
          </h3>

          {/* Rating + Reviews + Avatars */}
          <div className="mt-2 flex items-center">
            {/* Star */}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              className="text-[#F4AA08] shrink-0"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .587l3.668 7.57L24 9.748l-6 5.857 1.416 8.262L12 19.771l-7.416 4.096L6 15.605 0 9.748l8.332-1.591L12 .587z" />
            </svg>
            <span className="ml-2 text-[14px] leading-[22px] font-bold text-[#333333]">
              {rating.toFixed(1)}
            </span>
            <span className="ml-2 text-[12px] leading-[18px] tracking-[-0.02em] text-[#54555A]">
              ({fmt(reviews)})
            </span>

            {/* Avatars stacked to right */}
            {shownAvatars.length > 0 && (
              <div className="ml-auto flex -space-x-2">
                {shownAvatars.map((a, i) => (
                  <div key={i} className="h-[23.22px] w-[23.22px] rounded-full ring-2 ring-white overflow-hidden">
                    <Image
                      src={a.src}
                      alt={a.alt ?? `Member ${i + 1}`}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Updated text */}
          {updatedText && (
            <div className="mt-1 flex items-center text-[#54555A]">
              {/* Clock */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                className="text-[#54555A]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
              <span className="ml-2 text-[12px] leading-[15px] font-medium">
                {updatedText}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mt-4 text-[14px] leading-[22px] text-[#54555A] line-clamp-3">
        {description}
      </p>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-6 text-[#54555A]">
        {/* Members */}
        {typeof members === 'number' && (
          <div className="flex items-center">
            {/* Users icon */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#54555A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span className="ml-2 text-[12px] leading-5 font-bold">{fmt(members)}</span>
          </div>
        )}

        {/* Experts */}
        {typeof experts === 'number' && (
          <div className="flex items-center">
            {/* Another users icon (can swap to badge/verified icon if desired) */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#54555A"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span className="ml-2 text-[12px] leading-5 font-bold">{fmt(experts)} experts</span>
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        disabled={ctaDisabled}
        onClick={onJoin}
        className={clsx(
          'mt-4 h-11 w-full rounded-[8px] text-white text-[14px] font-medium',
          ctaDisabled ? 'bg-[#9AA6B2] cursor-not-allowed' : 'bg-[#18448A]'
        )}
      >
        {ctaText}
      </button>
    </div>
  )
}