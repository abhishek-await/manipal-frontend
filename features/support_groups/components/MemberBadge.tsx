// features/support_groups/components/MemberBadge.tsx
import React from "react";

type Props = {
  className?: string;
  onClick?: (e: React.MouseEvent) => void; // optional action (e.g. open menu)
};

export default function MemberBadge({ className = "", onClick }: Props) {
  // Replace the <svg> below with your actual SVG markup.
  // Keep width/height or viewBox as in your SVG.
  const handleClick: React.MouseEventHandler = (e) => {
    e.stopPropagation(); // prevent card navigation if badge clicked
    onClick?.(e);
  };

  return (
    <div
      role="status"
      aria-label="Member"
      onClick={handleClick}
      onMouseDown={(e) => e.stopPropagation()}
      className={` w-full h-11 flex items-center justify-center gap-3 px-4 rounded-lg bg-[#00B7AC] text-white ${className}`}
    >
      {/* --- Replace this SVG with your icon --- */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* example check icon (white) — replace children with your SVG paths */}
        <circle cx="12" cy="12" r="11.5" fill="#00B7AC" stroke="#D9D9D9" />
        <path d="M7 12.5l2.5 2.5L17 8.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="font-medium text-sm leading-6 text-white">Member</span>
    </div>
  );
}
