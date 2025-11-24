import React, { useMemo } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { buildWBSHierarchy } from '../../lib/xer-parser/utils';
import type { WBSNodeTree } from '../../lib/xer-parser/utils';
import type { P6WBSNode } from '../../lib/xer-parser/types';

// Icons (simple SVG)
const ChevronDown = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const FolderOpen = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const Folder = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

// WBS Node Component
interface WBSNodeProps {
    node: WBSNodeTree;
    onSelect: (wbsId: string) => void;
    selectedWBSId: string | null;
}

const WBSNode: React.FC<WBSNodeProps> = ({ node, onSelect, selectedWBSId }) => {
    const [isOpen, setIsOpen] = React.useState(true);

    const isSelected = selectedWBSId === node.wbs_id;
    const hasChildren = node.children.length > 0;

    const paddingLeft = `${(node.level * 1.5) + 0.75}rem`;

    return (
        <div key={node.wbs_id}>
            <div
                className={`wbs-node ${isSelected ? 'selected' : ''}`}
                style={{ paddingLeft }}
                onClick={() => onSelect(node.wbs_id)}
            >
                {hasChildren ? (
                    <button
                        className="wbs-expand-btn"
                        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    >
                        <ChevronDown 
                            style={{
                                transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                                transition: 'transform 0.2s'
                            }}
                        />
                    </button>
                ) : (
                    <div className="wbs-spacer"></div>
                )}

                {hasChildren ? (
                    <FolderOpen className="wbs-icon" />
                ) : (
                    <Folder className="wbs-icon" />
                )}

                <span className="wbs-name" title={node.wbs_name}>{node.wbs_name}</span>
            </div>

            {isOpen && hasChildren && (
                <div>
                    {node.children.map(child => (
                        <WBSNode
                            key={child.wbs_id}
                            node={child}
                            onSelect={onSelect}
                            selectedWBSId={selectedWBSId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

// Main Navigation Component
const WBSNavigation: React.FC = () => {
    const projectData = useProjectStore(state => state.projectData);
    const selectedWBSId = useProjectStore(state => state.selectedWBSId);
    const setSelectedWBSId = useProjectStore(state => state.setSelectedWBSId);

    const wbsTree = useMemo(() => {
        if (!projectData?.wbs) return [];
        return buildWBSHierarchy(projectData.wbs as P6WBSNode[]);
    }, [projectData]);

    if (!projectData) {
        return (
            <div className="empty-state">
                <div className="empty-icon">
                    <FolderOpen />
                </div>
                <p className="empty-description">Upload a project to view WBS</p>
            </div>
        );
    }

    return (
        <>
            <div className="sidebar-header">
                <h3 className="sidebar-title">
                    {projectData.project.shortName}
                </h3>
                <p className="sidebar-subtitle">Work Breakdown Structure</p>
            </div>

            <div className="sidebar-content">
                {/* Show All Activities */}
                <div
                    className={`wbs-show-all ${selectedWBSId === null ? 'selected' : ''}`}
                    onClick={() => setSelectedWBSId(null)}
                >
                    <FolderOpen className="wbs-icon" />
                    <span style={{ fontWeight: 'bold' }}>Show All Activities</span>
                </div>

                {/* WBS Tree */}
                <div>
                    {wbsTree.map(node => (
                        <WBSNode
                            key={node.wbs_id}
                            node={node}
                            onSelect={setSelectedWBSId}
                            selectedWBSId={selectedWBSId}
                        />
                    ))}
                </div>

                {wbsTree.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Folder />
                        </div>
                        <p className="empty-description">No WBS nodes found</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default WBSNavigation;