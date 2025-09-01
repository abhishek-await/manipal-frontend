// features/support_groups/components/SearchBar.tsx
"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  name?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * If true (default) clicking / focusing the input will navigate to /search.
   * If false, the input is editable and will NOT navigate away.
   */
  navigateOnInteract?: boolean;
};

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(" ");
}

export default function SearchBar({
  value,
  onChange,
  placeholder = "Find a support group",
  onSubmit,
  name = "q",
  autoFocus,
  disabled,
  className,
  onClick,
  onFocus,
  navigateOnInteract = true,
}: SearchBarProps) {
  const router = useRouter();

  const navigateToSearch = () => {
    // push with current value optionally (change if you don't want to forward value)
    const q = value?.trim() ? `?q=${encodeURIComponent(value.trim())}` : "";
    router.push(`/search${q}`);
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    onClick?.(e);
    if (navigateOnInteract) navigateToSearch();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(e);
    if (navigateOnInteract) navigateToSearch();
  };

  // If navigateOnInteract is true, we want readOnly so users cannot type on the home page.
  // If false, input must be editable so no readOnly and no navigation handlers.
  const readOnly = navigateOnInteract;

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={cx("relative w-full h-[52px]", className)}
    >
      <div className="absolute inset-0 rounded-[8px] border border-[#16AF9F] pointer-events-none" />

      <Image
        src="./MagnifyingGlass.svg"
        alt="Search bar MagnifyingGlass"
        width={24}
        height={24}
        className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6"
      />

      <input
        name={name}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={navigateOnInteract ? handleClick : onClick}
        onFocus={navigateOnInteract ? handleFocus : onFocus}
        readOnly={readOnly}
        className="h-full w-full bg-transparent outline-none pl-11 pr-3 text-[14px] leading-[17px] font-medium placeholder:text-[#54555A] font-['Helvetica_Neue']"
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </form>
  );
}
