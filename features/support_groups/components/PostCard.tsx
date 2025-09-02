"use client";

import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { timeAgo } from "./Card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { groupApi } from "@/features/support_groups/api/group.api";
import { authApi } from "@/features/auth/api/auth.api";

export type PostCardProps = {
  id: string;
  avatar: string;
  name: string;
  time: string;
  title: string;
  excerpt: string;
  tag: string;
  className?: string;

  // optional: initial liked state if the backend supplies it later
  initiallyLiked?: boolean;
  likeCount?: number
};

export default function PostCard({
  id,
  avatar,
  name,
  time,
  title,
  excerpt,
  tag,
  className = "",
  initiallyLiked = false,
  likeCount,
}: PostCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState<boolean>(initiallyLiked);
  const [pending, setPending] = useState(false);

  const handleLike = async () => {
    // if already pending, ignore clicks
    if (pending) return;

    // quick auth check (authApi.getCurrentUser uses localStorage tokens)
    const current = await authApi.getCurrentUser().catch(() => null);
    if (!current) {
      // redirect to login
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // optimistic UI
    setLiked((l) => !l);
    setPending(true);

    try {
      await groupApi.likePost(String(id));
      // success - we keep optimistic liked state
    } catch (err) {
      // rollback on error
      console.error("like failed", err);
      setLiked(false);
      // optional: show toast / notification
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className={`w-full border border-gray-200 rounded-xl shadow-sm ${className}`}>
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

            {/* Tag + small stats row */}
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-block bg-[#7750A3] text-white text-[11px] px-3 py-1 rounded-full">
                {tag}
              </span>
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
            aria-pressed={liked}
            aria-label={liked ? "Liked" : "Like"}
            className="flex items-center gap-2 text-gray-600 px-2 py-1 disabled:opacity-60"
          >
            {/* Inline SVG heart so we can control fill & stroke directly */}
            <div className="relative h-5 w-5">
              <Image
                src={liked ? '/favorite-fill.svg' : '/favorite.svg'}
                alt={liked ? "Liked" : "Like"}
                fill
                sizes="20px"
                style={{ objectFit: "contain" }}
                priority={false}
              />
            </div>

            <span className={`text-sm ${liked ? "text-[#00A79C]" : ""}`}>Like</span>
            {/* {typeof likeCount === "number" && likeCount > 0 && (
              <span className="ml-2 text-xs text-[#6B7280]">· {likeCount}</span>
            )} */}
          </button>

          <button className="flex items-center gap-2 text-gray-600 px-2 py-1">
            <Image src="/chat_bubble.svg" alt="Reply" width={20} height={20} />
            <span>Reply</span>
          </button>

          <button className="flex items-center gap-2 text-gray-600 px-2 py-1">
            <Image src="/share.svg" alt="Share" width={20} height={20} />
            <span>Share</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
