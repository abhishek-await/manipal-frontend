import {create} from 'zustand'

interface headerState {
    menuVisible: boolean
    menuOpen: boolean
    menuVisibleToggle: () => void
    menuOpenToggle: () => void
}

export const useHeaderStore = create<headerState>()((set) => ({
    menuVisible: true,
    menuOpen: true,
    menuVisibleToggle: () => set((state) => ({
        menuVisible: !state.menuVisible
    })),
    menuOpenToggle: () => set((state) => ({
        menuOpen: !state.menuOpen,
        menuVisible: state.menuOpen
    }))
}))

