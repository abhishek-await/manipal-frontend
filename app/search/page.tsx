"use client"

import { SupportGroupCardProps as Card } from '@/features/support_groups/components/Card';
import { useState } from 'react';
import Image from 'next/image';
import SearchBar from '@/features/support_groups/components/SearchBar';
import SupportGroupCard from '@/features/support_groups/components/Card';
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

function useSearch(query: string, { debounceMs, limit }: { debounceMs: number, limit: number }) {
  console.log(`Got search query with payload: query: ${query}, limit: ${limit}, debounceMs: ${debounceMs}`)
  // replace with real search call
  if(query==="asdf"){
    return {
      results: [],
      total: 2,
      loading: false
    }
  } else {
    return {
      results: cards.slice(0,2),
      total: 2,
      loading: false
    }
  }
}

/* ---------- No results card (matches your rectangle CSS) ---------- */
function NoResultsCard({ query }: { query: string }) {
  return (
    <div className="w-full max-w-[342px] mx-auto bg-[#F7F7F7] rounded-[12px] p-6 flex flex-col items-center text-center">
      {/* inline SVG icon (simple people/group icon) */}
      <Image src='/no-results.svg' alt="no results icon" width={48} height={48} fill={false} aria-hidden className="mb-2 opacity-60" />

      <div className="text-[20px] font-medium text-[#333333]">No Group Found</div>
    </div>
  )
}

export default function SearchPage() {
  const trending: Card[] = cards.slice(0, 3);
  const [query, setQuery] = useState('');
  const q = query.trim();
  const isSearching = q.length > 0;
  const router = useRouter();

  const { results, total, loading } = useSearch(q, { debounceMs: 350, limit: 2 });
  const list = isSearching ? results : trending;

  // show trending groups also when there are no results for the search
  const noResults = !loading && isSearching && results.length === 0;

  return (
    <main className="min-h-screen w-full bg-white flex justify-center items-start">
      <div className="w-full max-w-[375px] px-4 pb-[max(24px,env(safe-area-inset-bottom))] mx-auto">
        {/* Back + Search */}
        <div className="flex items-center gap-3 pt-4">
          <button type="button" aria-label="Back" className="h-6 w-6 flex-shrink-0" onClick={() => router.back()}>
            <img src="/arrow-left.svg" alt="Back" className="h-6 w-6 object-contain" />
          </button>

          <div className="relative flex-1">
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

        {/* Top heading: shows "Showing..." while searching */}
        <h2 className="mt-6 text-[16px] leading-6 font-medium text-[#333333]">
          {!isSearching ? 'Top trending support groups' : (loading ? 'Searching…' : `Showing “${q}” support groups${typeof total === 'number' ? ` (${total})` : ''}`)}
        </h2>

        {/* Results area */}
        <div className="mt-4 space-y-4">
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* No results card (centered) */}
          {noResults && <NoResultsCard query={q} />}

          {/* If no results, still show "Top trending support groups" subheading (like the screenshot) */}
          {noResults && (
            <h3 className="mt-6 text-[16px] leading-6 font-medium text-[#333333]">Top trending support groups</h3>
          )}

          {/* Render either search results (if present) or trending list */}
          {!loading && (
            <>
              {isSearching
                ? (results.length > 0 ? results.map((c) => <SupportGroupCard key={c.id} {...c} />) : trending.map((c) => <SupportGroupCard key={`trending-${c.id}`} {...c} />))
                : trending.map((c) => <SupportGroupCard key={c.id} {...c} />)
              }
            </>
          )}
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
