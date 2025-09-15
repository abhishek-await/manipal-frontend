import useEmblaCarousel from "embla-carousel-react";

export type ChipItem = { id: string; label: string, count: number };

export default function ChipCarouselEmbla({
  items,
  selectedId,
  onChange,
  className = "",
}: {
  items: ChipItem[];
  selectedId?: string;
  onChange?: (id: string) => void;
  className?: string;
}) {
  const [viewportRef] = useEmblaCarousel({
    dragFree: true,
    align: "start",
    containScroll: "trimSnaps",
  });

  return (
    <div className={`relative -mx-6 ${className}`}>
      {/* viewport — px-6 gives left offset of 24px */}
      <div ref={viewportRef} className="overflow-hidden px-6">
        {/* track */}
        <div className="flex gap-3">
          {items.map((chip) => {
            const active = chip.id === selectedId;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                onClick={() => onChange?.(active ? "" : chip.id)}
                className={[
                  "shrink-0 inline-flex items-center justify-between gap-3 transition-colors",
                  // allow chip to expand with text, keep min width to content
                  "min-w-[min-content] h-10 rounded-md text-sm font-medium px-3",
                  active
                    ? "bg-[#18448A] text-white shadow-md"
                    : "bg-white text-[#54555A] border border-[#E6E6E6] hover:border-[#C6C6C8]",
                ].join(" ")}
              >
                <span className="truncate">{chip.label} ({chip.count})</span>
                {active && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden role="img">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 6L6 18M6 6l12 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* edge fades (keeps UI tidy when scrolling) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white to-transparent" />
    </div>
  );
}
