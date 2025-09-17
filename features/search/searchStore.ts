"use client";

import { create } from "zustand";

type SearchState = {
  isSearchOpen: boolean;
  q: string;
  openSearch: () => void;
  closeSearch: () => void;
  setQ: (q: string) => void;
  clearQ: () => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  isSearchOpen: false,
  q: "",
  openSearch: () => set({ isSearchOpen: true }),
  closeSearch: () => set({ isSearchOpen: false, q: "" }),
  setQ: (q) => set({ q }),
  clearQ: () => set({ q: "" }),
}));
