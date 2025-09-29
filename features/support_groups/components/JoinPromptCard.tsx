// features/support_groups/components/JoinPromptCard.tsx
"use client";

import Image from "next/image";
import React from "react";
import { GroupStatsCard } from "../GroupDetailClient";

type Props = {
  onJoin: () => void;
  ariaLabel?: string;
  className?: string; // parent controls positioning
  stats?: {totalPosts?: number, members?: number, growthPercentage?: number, experts?: number}
};

export default function JoinPromptCard({ onJoin, ariaLabel = "Join group", className, stats }: Props) {
  return (
    <div
      aria-hidden={false}
      role="dialog"
      aria-label="Join this group"
      className={`pointer-events-none flex justify-center ${className ?? ""}`}
    >
      <div
        className="w-full max-w-[342px] h-[700px] bg-[#E5E7EB] border border-[#E5E7EB] rounded-xl shadow-lg pointer-events-auto"
        style={{ boxSizing: "border-box" }}
      >
        <div className="relative w-full h-full flex flex-col items-center px-6 pt-4">
          {/* <div className="w-[48px] h-[48px] rounded-full bg-[#D9D9D9] flex items-center justify-center">
            <div className="w-[36px] h-[36px] rounded-full bg-[#16AF9F] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div> */}

          <h3 className="mt-4 text-[20px] leading-[30px] font-bold text-[#034EA1] text-center">
            Join this group for full access
          </h3>

          <p className="mt-3 text-[14px] leading-[22px] text-[#333333] text-center max-w-[278px]">
            Get access to all discussions, events, and resources shared by this supportive community
          </p>

          <div className="px-4">
            <div className="mt-4 space-y-3 border border-[#E5E7EB] rounded-lg bg-white">
              <h2 className="text-[14px] text-[#18448A] px-3 mt-3">Moderators & Experts</h2>
              <div className="w-full mx-auto p-3 flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-[#06AD9B1f] flex items-center justify-center">
                  <Image src="/avatars/dr1.png" alt="Dr Sarah" width={44} height={44} className="rounded-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-[#333333] text-sm">Dr. Sarah Johnson</div>
                    <div className="text-xs text-[#16AF9F] bg-[#ECFDF6] px-2 py-0.5 rounded-full">Verified</div>
                  </div>
                  <div className="text-xs text-[#333333]">Endocrinologies</div>
                  <div className="text-xs text-[#54555A] mt-1">15+ years experience</div>
                </div>
              </div>

              <div className="w-full mx-auto p-3 flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-[#06AD9B1f] flex items-center justify-center">
                  <Image src="/avatars/dr2.png" alt="Dr Sandeep" width={44} height={44} className="rounded-full object-cover" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-[#333333] text-sm">Dr. Sandeep Sharma</div>
                  <div className="text-xs text-[#333333]">Cardiologist</div>
                  <div className="text-xs text-[#54555A] mt-1">8+ years experience</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 px-4 mb-4">
            <GroupStatsCard
              postsThisWeek={stats?.totalPosts ?? 45}
              activeMembers={stats?.members ?? 340}
              monthlyGrowth={stats?.growthPercentage ?? "12%"}
              expertSessions={stats?.experts ?? 8}
            />
          </div>

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
