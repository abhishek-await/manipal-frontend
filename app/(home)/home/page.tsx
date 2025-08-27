"use client"

import React, { useState } from 'react'
import SupportGroupCard from '@/features/support_groups/components/Card'
import SearchBar from '@/features/support_groups/components/SearchBar';
import Image from 'next/image';
import ChipCarouselEmbla, { ChipItem } from '@/features/support_groups/components/ChipCarousel';
import { SupportGroupCardProps as Card } from '@/features/support_groups/components/Card';
import { useRouter } from 'next/navigation';

const SupportGroupsPage = () => {

  const [q,setQ] = useState("")
  const router = useRouter()

  const goToSearch = () => {
    const url = q ? `/search?q=${encodeURIComponent(q)}` : '/search'
    router.push(url)
  }

  const cards: Card[] = [
    {
      id: "1",
      title: 'Diabetes Support Group Whitefield',
      rating: 4.9,
      reviews: 345,
      updatedText: 'Updated 2 hours ago',
      description: 'A supportive community for people managing diabetes in the Whitefield area.',
      members: 1850,
      experts: 12,
      imageSrc: '/images/group-thumb.png',
      avatars: [
          { src: '/avatars/omar.png', alt: 'Omar Darboe' },
          { src: '/avatars/fran.png', alt: 'Fran Perez' },
          { src: '/avatars/jane.png', alt: 'Jane Rotanson' },
        ],
      ctaText: 'Join Group',
    },
    {
      id: "2",
      title: 'Diabetes Support Group Whitefield',
      rating: 4.9,
      reviews: 345,
      updatedText: 'Updated 2 hours ago',
      description: 'A supportive community for people managing diabetes in the Whitefield area.',
      members: 1850,
      experts: 12,
      imageSrc: '/images/group-thumb.png',
      avatars: [
          { src: '/avatars/omar.png', alt: 'Omar Darboe' },
          { src: '/avatars/fran.png', alt: 'Fran Perez' },
          { src: '/avatars/jane.png', alt: 'Jane Rotanson' },
        ],
      ctaText: 'Join Group',
    },
    {
      id: "3",
      title: 'Diabetes Support Group Whitefield',
      rating: 4.9,
      reviews: 345,
      updatedText: 'Updated 2 hours ago',
      description: 'A supportive community for people managing diabetes in the Whitefield area.',
      members: 1850,
      experts: 12,
      imageSrc: '/images/group-thumb.png',
      avatars: [
          { src: '/avatars/omar.png', alt: 'Omar Darboe' },
          { src: '/avatars/fran.png', alt: 'Fran Perez' },
          { src: '/avatars/jane.png', alt: 'Jane Rotanson' },
        ],
      ctaText: 'Join Group',
    },
    {
      id: "4",
      title: 'Diabetes Support Group Whitefield',
      rating: 4.9,
      reviews: 345,
      updatedText: 'Updated 2 hours ago',
      description: 'A supportive community for people managing diabetes in the Whitefield area.',
      members: 1850,
      experts: 12,
      imageSrc: '/images/group-thumb.png',
      avatars: [
          { src: '/avatars/omar.png', alt: 'Omar Darboe' },
          { src: '/avatars/fran.png', alt: 'Fran Perez' },
          { src: '/avatars/jane.png', alt: 'Jane Rotanson' },
        ],
      ctaText: 'Join Group',
    },
  ];

  const chipItems: ChipItem[] = [
      { id: "Diabetes", label: "Diabetes", count: 23 },
      { id: "Heart Health", label: "Heart Health", count: 34 },
      { id: "Mental Health", label: "Mental Health", count: 56 },
      { id: "Cancer", label: "Cancer", count: 12 },
      { id: "Autoimmune", label: "Autoimmune", count: 18 },
      { id: "Respiratory", label: "Respiratory", count: 9 },
    ];

    // store full chip instead of just string
    const [selectedChip, setSelectedChip] = useState<ChipItem | undefined>();

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      <main className="w-full flex justify-center">
        <div className="w-full max-w-[390px] mx-auto px-6">
          {/* Hero */}
          <section className="pt-8">
            <h1 className="text-[28px] leading-8 font-bold text-[#18448A] text-center">
              Find Patient
              <br />
              Support Groups
            </h1>
            <p className="mt-4 text-[14px] leading-5 text-center text-[#54555A]">
              Connect with others who understand your journey. Search for support
              groups by condition, location, or keywords.
            </p>

            {/* Stats tiles */}
            <div className="mt-6 grid grid-cols-2 gap-y-6 gap-x-6 justify-items-center">
              <StatTile number="342" label="Groups" iconSrc="/groups.svg" alt="Groups" />
              <StatTile number="12,456" label="Patients & Caregivers" iconSrc="/users.svg" alt="Patients & Caregivers" />
              <StatTile number="165" label="Health Experts" iconSrc="/experts.svg" alt="Health Experts" />
              <StatTile number="1234" label="Discussions" iconSrc="/discussions.svg" alt="Discussions" />
            </div>

            {/* Search bar */}
            <div className="mt-6">
              <SearchBar
                value={q}
                onChange={setQ}
                onSubmit={() => console.log("Search", q)}
                onClick={goToSearch}
                className="w-full"
              />
            </div>

            {/* Chips */}
            <div className="mt-6">
              <p className="text-sm text-[#54555A]">Find by condition</p>
              <ChipCarouselEmbla
                className="mt-3"
                items={chipItems}
                selectedId={selectedChip?.id}
                onChange={(id) => {
                  if (id === selectedChip?.id) {
                    setSelectedChip(undefined); // deselect if same chip
                  } else {
                    const chip = chipItems.find((c) => c.id === id);
                    setSelectedChip(chip);
                  }
                }}
              />
            </div>
          </section>

          {/* All Support Group */}
          <section className="mt-8">
            <h2 className="text-[20px] font-bold text-[#18448A] text-center md:text-left">
              {selectedChip ? selectedChip.id : "All"} Support Group(s)
            </h2>
            <p className="mt-1 text-[14px] text-[#54555A] text-center md:text-left">
              Showing 4 of {selectedChip ? selectedChip.count : 343} groups
            </p>

            <div className="mt-4 space-y-4">
              {cards.map((c) => (
                <SupportGroupCard key={c.id} {...c} />
              ))}
            </div>

            <div className="mt-5 flex justify-center">
              <button
                type="button"
                className="h-11 px-6 rounded-lg border border-[#16AF9F] text-[#16AF9F] text-sm font-medium"
              >
                Load More
              </button>
            </div>
          </section>

          {/* Gradient CTA + suggestion card */}
          <section className="mt-8 mb-10 rounded-none bg-gradient-to-b from-[#16AF9F] to-[#18448A] text-white -mx-6 px-6 py-8">
            <h2 className="text-[28px] leading-9 font-bold text-center">
              Can’t Find the Right
              <br />
              Support Group?
            </h2>
            <p className="mt-3 text-[14px] leading-5 text-center">
              Help us create the support group you need. Share your suggestion and we’ll
              work to make it happen.
            </p>

            <div className="mt-6 rounded-lg bg-white text-[#18448A]">
              <div className="h-10 rounded-t-lg bg-[#A4DBD6] flex items-center px-4 text-[14px] font-bold">
                What support group would you like to see?
              </div>
              <div className="p-4">
                <textarea
                  rows={5}
                  className="w-full rounded-md border border-[#E5E7EB] p-3 text-[14px] text-[#717176] placeholder-[#717176] outline-none focus:ring-2 focus:ring-[#16AF9F]"
                  placeholder="Write here… your condition, support type, and meeting preference"
                />
              </div>
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="w-full h-14 rounded-lg bg-[#16AF9F] text-white text-[16px] font-medium"
              >
                Submit Suggestion
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

function StatTile({
  number,
  label,
  iconSrc,
  alt,
}: {
  number: string;
  label: string;
  iconSrc: string;
  alt: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#06AD9B1F]">
        <Image src={iconSrc} alt={alt} width={24} height={24} className="h-6 w-6" sizes="24px" />
      </div>
      <div className="text-[20px] leading-6 font-medium text-[#333333]">{number}</div>
      <div className="text-[12px] leading-4 text-[#7F7F7F] text-center">{label}</div>
    </div>
  );
}

export default SupportGroupsPage;