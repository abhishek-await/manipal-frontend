'use client'

import React from 'react'
import Image from 'next/image'

type SearchBarProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: () => void
  name?: string
  autoFocus?: boolean
  disabled?: boolean
  className?: string
}

function cx(...cls: Array<string | false | null | undefined>) {
  return cls.filter(Boolean).join(' ')
}

export default function SearchBar({
  value,
  onChange,
  placeholder = 'Find a support group',
  onSubmit,
  name = 'q',
  autoFocus,
  disabled,
  className,
}: SearchBarProps) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.()
      }}
      className={cx('relative w-[342px] h-[52px]', className)}
    >
      {/* Border + radius per spec */}
      <div className="absolute inset-0 rounded-[8px] border border-[#16AF9F] pointer-events-none" />

      {/* Magnifying glass 24x24 at 12px from left, vertically centered */}
      
      <Image
        src='./MagnifyingGlass.svg'
        alt='Search bar MagnifyingGlass'
        width={24}
        height={24}
        className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 stroke-[#54555A]"
       />

      {/* Input */}
      <input
        name={name}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full bg-transparent outline-none
                   pl-11 pr-3
                   text-[14px] leading-[17px] font-medium
                   placeholder:text-[#54555A]
                   font-['Helvetica_Neue']"
        placeholder={placeholder}
      />
    </form>
  )
}