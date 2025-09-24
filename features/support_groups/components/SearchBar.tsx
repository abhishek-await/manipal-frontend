"use client";

import React, { startTransition, useId, useRef } from "react";
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
  const id = useId();
  const inputId = `search-${id}`;
  const inputRef = useRef<HTMLInputElement | null>(null);

  const navigateToSearch = () => {
    const params = new URLSearchParams();
    const qTrim = value?.trim();
    if (qTrim) params.set("q", qTrim);
    // signal search page to focus input
    params.set("focus", "1");

    const qs = params.toString();
    const path = `/search${qs ? `?${qs}` : ""}`;

    // prefetch optionally
    // router.prefetch?.("/search");

    startTransition(() => {
      router.push(path);
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    onClick?.(e);
    if (navigateOnInteract) navigateToSearch();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    onFocus?.(e);
    if (navigateOnInteract) navigateToSearch();
  };

  // const prefetchSearch = () => {
  //   router.prefetch?.("/search");
  // };

  const readOnly = navigateOnInteract;

  const handleClear = (e?: React.MouseEvent) => {
    e?.preventDefault();
    onChange("");
    // focus input after clearing (if editable)
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={cx("relative w-full h-[52px]", className)}
      // onPointerEnter={prefetchSearch}
      // onTouchStart={prefetchSearch}
    >
      {/* border/background layer */}
      <div className="absolute inset-0 rounded-[8px] border border-[#16AF9F] pointer-events-none" />

      {/* magnifier */}
      <Image
        src="./MagnifyingGlass.svg"
        alt="Search bar MagnifyingGlass"
        width={24}
        height={24}
        className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6"
      />

      <input
        ref={inputRef}
        id={inputId}
        name={name}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={navigateOnInteract ? handleClick : onClick}
        onFocus={navigateOnInteract ? handleFocus : onFocus}
        readOnly={readOnly}
        className="h-full w-full bg-transparent outline-none pl-11 pr-10 text-[14px] leading-[17px] font-medium placeholder:text-[#54555A] font-['Helvetica_Neue']"
        placeholder={placeholder}
        aria-label={placeholder}
      />

      {/* Clear button - only when editable & has content */}
      {!readOnly && value && value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <svg className="h-3 w-3 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      )}
    </form>
  );
}
