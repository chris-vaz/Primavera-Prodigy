import type { P6WBSNode } from "./types";

// Define the shape of a node in our hierarchical tree structure
export interface WBSNodeTree extends P6WBSNode {
    children: WBSNodeTree[];
    level: number;
}

/**
 * Recursively finds all WBS IDs under a given parent ID.
 * This is used to filter activities when a parent WBS is selected.
 * * @param wbsId - The starting WBS ID.
 * @param flatWbs - The complete flat array of WBS nodes.
 * @returns An array of all descendant WBS IDs (including the starting ID).
 */
export function getAllDescendantWBSIds(wbsId: string, flatWbs: P6WBSNode[]): string[] {
  const descendantIds: string[] = [wbsId]; // Start with the current ID
  
  // Create a map keyed by parent_wbs_id for quick lookups
  const wbsMap = new Map<string, P6WBSNode[]>();
  flatWbs.forEach(node => {
    const parentId = node.parent_wbs_id;
    if (!wbsMap.has(parentId)) {
      wbsMap.set(parentId, []);
    }
    wbsMap.get(parentId)!.push(node);
  });
  
  const findChildren = (currentId: string) => {
    const children = wbsMap.get(currentId) || [];
    for (const child of children) {
      descendantIds.push(child.wbs_id);
      findChildren(child.wbs_id); // Recurse
    }
  };
  
  findChildren(wbsId);
  return descendantIds;
}

/**
 * Converts a flat array of WBS nodes into a nested tree structure for navigation rendering.
 * @param flatWbs - The flat array of P6WBSNode objects.
 * @returns An array containing the root WBS nodes and their descendants.
 */
export function buildWBSHierarchy(flatWbs: P6WBSNode[]): WBSNodeTree[] {
    // 1. Create a map for quick access by ID and initialize nodes
    const map = new Map<string, WBSNodeTree>();
    const tree: WBSNodeTree[] = [];

    flatWbs.forEach(wbs => {
        map.set(wbs.wbs_id, {
            ...wbs,
            children: [],
            level: 0
        });
    });

    // 2. Build the tree structure by assigning children to parents
    map.forEach(node => {
        const parentId = node.parent_wbs_id;
        const parent = map.get(parentId);

        if (parent) {
            // Set the level (for indentation)
            node.level = parent.level + 1;
            parent.children.push(node);
        } else {
            // No parent found in the map (must be a root node)
            tree.push(node);
        }
    });

    // Sort the root nodes to ensure consistent order
    return tree.sort((a, b) => a.wbs_name.localeCompare(b.wbs_name));
}