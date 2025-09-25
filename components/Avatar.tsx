"use client";

import React from "react";
import Image from "next/image";

type AvatarProps = {
  src?: string | null;        // image URL (remote or local). If falsy, show initials
  name?: string | null;       // full name used to create initials
  size?: number;              // pixel diameter (default 44)
  className?: string;
  alt?: string | null;
};

const COLOR_PALETTE = [
  "#FDE68A", // amber-200
  "#BFDBFE", // blue-200
  "#C7F9CC", // green-ish
  "#FECACA", // red-200
  "#FDE68A", // repeat allowed
  "#E9D5FF", // purple-200
  "#D1FAE5",
  "#FEF3C7",
  "#E0F2FE",
];

function hashStringToNumber(s: string) {
  // simple, stable hash (djb2)
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 33) ^ s.charCodeAt(i);
  }
  return Math.abs(hash >>> 0);
}

function getInitials(name?: string | null) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export default function Avatar({ src, name, size = 44, className = "", alt }: AvatarProps) {
  const initials = getInitials(name);
  const bg = name ? COLOR_PALETTE[hashStringToNumber(name) % COLOR_PALETTE.length] : COLOR_PALETTE[0];
  const textSize = Math.max(12, Math.round(size / 3.5)); // responsive font-size

  if (src) {
    // Use next/image for proper optimization. If src might be empty string, guard earlier.
    return (
      <div
        className={`rounded-full overflow-hidden bg-gray-100 ${className}`}
        style={{ width: size, height: size, lineHeight: 0 }}
        aria-hidden={false}
      >
        {/* next/image requires width/height and will crop to container if className contains object-cover */}
        <Image
          src={src}
          alt={alt ?? name ?? "User avatar"}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  // fallback: initials
  return (
    <div
      role="img"
      aria-label={name ? `Avatar of ${name}` : "User avatar"}
      className={`flex items-center justify-center rounded-full select-none ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: "#0F172A", // dark text
        fontWeight: 600,
        fontSize: textSize,
      }}
    >
      {initials || "?"}
    </div>
  );
}
