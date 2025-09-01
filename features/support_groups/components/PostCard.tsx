"use client";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

export type PostCardProps = {
  id: string,
  avatar: string;
  name: string;
  time: string;
  title: string;
  excerpt: string;
  tag: string;
  stats: {
    users: number;
    experts: number;
  };
};

export default function PostCard({
  avatar,
  name,
  time,
  title,
  excerpt,
  tag,
  stats,
}: PostCardProps) {
  return (
    <Card className="w-[343px] border border-gray-200 rounded-xl shadow-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Image
            src={avatar}
            alt={name}
            width={40}
            height={40}
            className="rounded-full border"
          />
          <div>
            <h2 className="text-[16px] font-bold text-[#18448A]">{name}</h2>
            <p className="text-xs text-gray-500">{time}</p>
          </div>
        </div>

        {/* Title + Content */}
        <div className="mt-3">
          <h3 className="font-bold text-sm text-gray-800">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{excerpt}</p>
        </div>

        {/* Tags + Stats */}
        <div className="flex items-center justify-between mt-3">
          <span className="bg-[#7750A3] text-white text-[10px] px-3 py-1 rounded-full">
            {tag}
          </span>
          <div className="flex items-center gap-4 text-gray-600 text-xs font-bold">
            <div className="flex items-center gap-1">
              <Image src='/Users.svg' alt="Users" width={16} height={16} />
              <span>{stats.users}</span>
            </div>
            <div className="flex items-center gap-1">
              <Image src='/Users.svg' alt="Experts" width={16} height={16} />
              <span>{stats.experts} experts</span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t mt-3" />

        {/* Actions */}
        <div className="flex items-center justify-between mt-2 text-sm text-gray-800">
          <button className="flex items-center gap-1">
            <Image src='/favorite.svg' alt="Like" width={16} height={16} />
            Like
          </button>
          <button className="flex items-center gap-1">
            <Image src='/chat_bubble.svg' alt="Reply" width={16} height={16} />
            Reply
          </button>
          <button className="flex items-center gap-1">
            <Image src='/share.svg' alt="Share" width={16} height={16} />
            Share
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
