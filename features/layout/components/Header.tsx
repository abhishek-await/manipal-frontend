'use client'
import React from "react"
import HeaderMenu from "./HeaderMenu"
import Link from "next/link"
import { useSearchStore } from "@/features/search/searchStore"

export default function Header({ showMenu = true }: { showMenu?: boolean }) {
  const isSearchOpen = useSearchStore((s) => s.isSearchOpen)

  if (isSearchOpen) return null // hide header when search is open

  return (
    <header className="h-[69px] w-full flex items-center justify-between px-6 bg-white">
      {/* left: logo */}
      <div className="flex items-center gap-3">
        <Link href="/home">
          <div className="w-24 h-12">
            <img
              src="/logo_1.svg"
              alt="Manipal Community Connect logo"
              className="w-full h-full object-contain"
            />
          </div>
        </Link>
      </div>

      {/* right: header menu */}
      <div className="flex items-center">
        {showMenu && <HeaderMenu />}
      </div>
    </header>
  )
}
