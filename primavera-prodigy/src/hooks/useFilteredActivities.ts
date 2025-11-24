import { useMemo } from 'react';
import { useProjectStore } from '../store/useProjectStore';
import { getAllDescendantWBSIds } from '../lib/xer-parser/utils';
import type { P6Activity } from '../lib/xer-parser/types';

/**
 * Returns project activities filtered by selected WBS.
 */
export const useFilteredActivities = (): P6Activity[] => {
    // Select only stable references to avoid rerender loops
    const projectData = useProjectStore(state => state.projectData);
    const selectedWBSId = useProjectStore(state => state.selectedWBSId);

    const filteredActivities = useMemo(() => {
        if (!projectData || !projectData.activities?.length) return [];

        const activities = projectData.activities;
        const wbsNodes = projectData.wbs ?? [];

        // No selected WBS: return all
        if (!selectedWBSId) return activities;

        // Get WBS hierarchy
        const relevantWBSIds = getAllDescendantWBSIds(selectedWBSId, wbsNodes);
        const wbsSet = new Set(relevantWBSIds);

        return activities.filter(act => wbsSet.has(act.wbs_id));

    // IMPORTANT: Use projectData directly (it's stable from Zustand) instead of destructured arrays
    // to avoid dependency issues when arrays might be recreated
    }, [projectData, selectedWBSId]);

    return filteredActivities;
};
