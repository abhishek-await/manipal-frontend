'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSearchStore } from "@/features/search/searchStore"

export default function Footer() {
  const isSearchOpen = useSearchStore((s) => s.isSearchOpen)
  if (isSearchOpen) return null // hide footer when search is open

  const platform = [
    { label: 'Support Groups', href: '#' },
    { label: 'Health Journeys', href: '#' },
    { label: 'Health Articles', href: '#' },
    { label: 'Events Care', href: '#' },
    { label: 'Counsellor', href: '#' },
  ]

  const company = [
    { label: 'About Us', href: '#' },
    { label: 'Our Mission', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
  ]

  const resources = [
    { label: 'Health Library', href: '#' },
    { label: 'Community', href: '#' },
    { label: 'Guidelines', href: '#' },
    { label: 'Safety Center', href: '#' },
    { label: 'FAQs', href: '#' },
  ]

  const legal = [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Cookie Policy', href: '#' },
    { label: 'HIPAA Compliance', href: '#' },
  ]

  const hJakarta =
    "text-[16px] leading-5 font-bold tracking-[-0.02em] text-[#18448A] font-['Plus_Jakarta_Sans']"
  const hHelvetica =
    "text-[16px] leading-5 font-bold tracking-[-0.02em] text-[#18448A] font-['Helvetica_Neue']"
  const item =
    "block text-[14px] leading-6 text-[#333333] font-['Helvetica_Neue']"

  return (
    <footer className="mx-auto w-full max-w-[390px] px-6 py-10">
      <div className="mx-auto max-w-[313px]">
        {/* 2x2 grid */}
        <div className="grid grid-cols-2 gap-y-10 gap-x-6">
          <div className="w-[106px] flex flex-col gap-4">
            <h3 className={hHelvetica}>Platform</h3>
            <nav className="space-y-2">
              {platform.map((i) => (
                <Link key={i.label} href={i.href} className={item}>
                  {i.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="w-[108px] flex flex-col gap-4">
            <h3 className={hHelvetica}>Resources</h3>
            <nav className="space-y-2">
              {resources.map((i) => (
                <Link key={i.label} href={i.href} className={item}>
                  {i.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="w-[80px] flex flex-col gap-4">
            <h3 className={hJakarta}>Company</h3>
            <nav className="space-y-2">
              {company.map((i) => (
                <Link key={i.label} href={i.href} className={item}>
                  {i.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="w-[108px] flex flex-col gap-4">
            <h3 className={hJakarta}>Legal</h3>
            <nav className="space-y-2">
              {legal.map((i) => (
                <Link key={i.label} href={i.href} className={item}>
                  {i.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Logo + copyright */}
        <div className="mt-10 flex flex-col items-center gap-[23px]">
          <Image
            src="/logo_1.svg"
            alt="Manipal Community Connect"
            width={91}
            height={48}
            priority
          />
          <p className="text-center text-[14px] leading-6 text-[#333333] font-['Plus_Jakarta_Sans']">
            © 2025 HealthConnect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
