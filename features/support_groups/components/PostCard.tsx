"use client";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { timeAgo } from "./Card";

export type PostCardProps = {
  id: string;
  avatar: string;
  name: string;
  time: string;
  title: string;
  excerpt: string;
  tag: string;
  className?: string;
};

export default function PostCard({
  avatar,
  name,
  time,
  title,
  excerpt,
  tag,
  className = "",
}: PostCardProps) {
  return (
    <Card className={`w-full border border-gray-200 rounded-xl shadow-sm ${className}`}>
      <CardContent className="p-2">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Image
              src={avatar}
              alt={name}
              width={44}
              height={44}
              className="rounded-full border"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold text-[#18448A] truncate">
                  {name}
                </div>
                <div className="text-sm text-gray-500">{timeAgo(time)}</div>
              </div>
            </div>

            {/* Title + Excerpt */}
            <div className="mt-3">
              <h3 className="font-bold text-gray-800 leading-5 line-clamp-2">
                {title}
              </h3>
              <p className=" text-gray-600 mt-1 line-clamp-2">
                {excerpt}
              </p>
            </div>

            {/* Tag + small stats row */}
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-block bg-[#7750A3] text-white text-[11px] px-3 py-1 rounded-full">
                {tag}
              </span>

              {/* example small stats — replace src and numbers with real data */}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mt-4" />

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between text-gray-700">
          <button className="flex items-center gap-2 text-gray-600 px-2 py-1">
            <Image src="/favorite.svg" alt="Like" width={20} height={20} />
            <span>Like</span>
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
