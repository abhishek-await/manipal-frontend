// src/features/support_groups/components/JoinPromptCard.tsx
"use client";

import React from "react";

type Props = {
  onJoin: () => void;
  ariaLabel?: string;
  className?: string; // parent controls positioning
};

export default function JoinPromptCard({ onJoin, ariaLabel = "Join group", className }: Props) {
  return (
    <div
      aria-hidden={false}
      role="dialog"
      aria-label="Join this group"
      className={`pointer-events-none flex justify-center ${className ?? ""}`}
    >
      <div
        className="w-[342px] max-w-full h-[297px] bg-white border border-[#E5E7EB] rounded-xl shadow-lg pointer-events-auto"
        style={{ boxSizing: "border-box" }}
      >
        <div className="relative w-full h-full flex flex-col items-center px-6 pt-8">
          <div className="w-[48px] h-[48px] rounded-full bg-[#D9D9D9] flex items-center justify-center">
            <div className="w-[36px] h-[36px] rounded-full bg-[#16AF9F] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <h3 className="mt-4 text-[20px] leading-[30px] font-bold text-[#034EA1] text-center">
            Join this group for full access
          </h3>

          <p className="mt-3 text-[14px] leading-[22px] text-[#333333] text-center max-w-[278px]">
            Get access to all discussions, events, and resources shared by this supportive community
          </p>

          <div className="flex-1" />

          <div className="w-full flex justify-center pb-6">
            <button
              onClick={onJoin}
              aria-label={ariaLabel}
              className="w-[294px] h-[54px] rounded-[8px] font-medium text-white flex items-center justify-center"
              style={{ background: "linear-gradient(90deg, #18448A 0%, #16AF9F 85%)" }}
            >
              <span className="text-[16px]">Join Group</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}