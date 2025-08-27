"use client"

import { SupportGroupCardProps as Card } from '@/features/support_groups/components/Card';
import { useState } from 'react';
import Image from 'next/image';
import SearchBar from '@/features/support_groups/components/SearchBar';
import SupportGroupCard from '@/features/support_groups/components/Card'
import { routerServerGlobal } from 'next/dist/server/lib/router-utils/router-server-context';
import { useRouter } from 'next/navigation';


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

function useSearch(query:string, {debounceMs, limit} : {debounceMs: number, limit: number}){
    console.log(`Got search query with payload: query: ${query}, limit: ${limit}, debounceMs: ${debounceMs}`)
    return {
        results: cards.slice(0,2),
        total: 2,
        loading: false
    }
}

export default function SearchPage() {
  const trending: Card[] = cards.slice(0, 3);
  const [query, setQuery] = useState('');
  const q = query.trim();
  const isSearching = q.length > 0;
  const router = useRouter()

  const { results, total, loading } = useSearch(q, { debounceMs: 350, limit: 2 });
  const list = isSearching ? results : trending;

  return (
    <main className="min-h-screen w-full bg-white flex justify-center">
      {/* match 375px width design */}
      <div className="w-full max-w-[375px] px-4 pb-[max(24px,env(safe-area-inset-bottom))]">
        {/* Back + Search */}
        <div className="flex items-center gap-3 pt-4">
          <button type="button" aria-label="Back" className="h-4 w-4 flex-shrink-0" onClick={() => router.push('/home')}>
            <img src="/arrow-left.svg" alt="Back" className="h-4 w-4 object-contain" />
          </button>

          <div className="relative flex-1">
            {/* If your SearchBar is controlled: pass value/onChange.
               If it's uncontrolled, remove these props and wire inside the component. */}
            <SearchBar
              value={query}
              onChange={(val: string) => setQuery(val)}
              placeholder="Find a support group"
            />
            {isSearching && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5"
              >
                <Image src="/close.svg" alt="Clear" width={11.09} height={11.09} />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        {!isSearching ? (
          <h2 className="mt-6 text-[16px] leading-6 font-medium text-[#333333]">
            Top trending support groups
          </h2>
        ) : (
          <h2 className="mt-6 text-[16px] leading-6 font-medium text-[#333333]">
            {loading ? 'Searching…' : `Showing “${q}” support groups${total ? ` (${total})` : ''}`}
          </h2>
        )}

        {/* Results */}
        <div className="mt-4 space-y-4">
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {!loading && list.length === 0 && isSearching && (
            <div className="rounded-lg border border-[#E5E7EB] p-4 text-sm text-[#54555A]">
              No groups found for “{q}”.
            </div>
          )}

          {!loading &&
            list.map((c) => <SupportGroupCard key={c.id} {...c} />)}
        </div>

        <div className="h-6" />
      </div>
    </main>
  );
}

// ---------- Tiny skeleton to show while "loading" ----------
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[#E5E7EB] p-4">
      <div className="flex gap-3">
        <div className="h-16 w-16 rounded-lg bg-gray-200 animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
          <div className="mt-2 h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 h-3 w-4/5 rounded bg-gray-200 animate-pulse" />
          <div className="mt-1 h-3 w-3/5 rounded bg-gray-200 animate-pulse" />
          <div className="mt-3 h-9 w-full rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    </div>
  );
}