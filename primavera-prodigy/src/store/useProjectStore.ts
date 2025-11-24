import { create } from 'zustand';
import type { P6Project } from '../lib/xer-parser/types'; // Using type import to satisfy strict TS rules

interface ProjectState {
    projectData: P6Project | null;
    fileName: string | null;
    isLoading: boolean;

    // --- NEW STATE VARIABLE FOR WBS FILTERING ---
    selectedWBSId: string | null;

    // Actions
    loadProject: (data: P6Project, fileName: string) => void;
    clearProject: () => void;

    // --- NEW ACTION DEFINITION (Fixes the TS Error) ---
    setSelectedWBSId: (wbsId: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
    // --- INITIAL STATE ---
    projectData: null,
    fileName: null,
    isLoading: false,
    selectedWBSId: null, // Initial state: No WBS selected (show all)

    // --- ACTIONS ---
    loadProject: (data, fileName) => set({
        projectData: data,
        fileName,
        isLoading: false,
        selectedWBSId: null // Reset selection on new load
    }),

    clearProject: () => set({
        projectData: null,
        fileName: null,
        selectedWBSId: null
    }),

    // --- NEW ACTION IMPLEMENTATION ---
    setSelectedWBSId: (wbsId) => set({
        selectedWBSId: wbsId
    }),
}));